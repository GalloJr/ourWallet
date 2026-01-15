const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

const db = admin.firestore();

/**
 * Valida operação financeira
 * Chamada antes de qualquer atualização de saldo crítica
 */
exports.validateFinancialOperation = functions.https.onCall(async (data, context) => {
  // Verificar autenticação
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { type, amount, accountId, walletId } = data;

  // Validações básicas
  if (!type || !['credit', 'debit'].includes(type)) {
    throw new functions.https.HttpsError('invalid-argument', 'Tipo de operação inválido');
  }

  if (typeof amount !== 'number' || amount <= 0 || amount > 1000000) {
    throw new functions.https.HttpsError('invalid-argument', 'Valor inválido');
  }

  if (!accountId || typeof accountId !== 'string') {
    throw new functions.https.HttpsError('invalid-argument', 'ID da conta inválido');
  }

  // Verificar se usuário tem permissão na carteira
  const userDoc = await db.collection('users').doc(context.auth.uid).get();
  if (!userDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Usuário não encontrado');
  }

  const userData = userDoc.data();
  const activeWalletId = userData.linkedWalletId || context.auth.uid;

  if (walletId && activeWalletId !== walletId) {
    throw new functions.https.HttpsError('permission-denied', 'Sem permissão para esta carteira');
  }

  return { valid: true, message: 'Operação validada' };
});

/**
 * Atualiza saldo de forma atômica usando transação
 */
exports.updateAccountBalance = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { accountId, amount, operation } = data;

  if (!accountId || typeof amount !== 'number') {
    throw new functions.https.HttpsError('invalid-argument', 'Parâmetros inválidos');
  }

  if (!['add', 'subtract'].includes(operation)) {
    throw new functions.https.HttpsError('invalid-argument', 'Operação inválida');
  }

  try {
    const accountRef = db.collection('accounts').doc(accountId);
    
    const result = await db.runTransaction(async (transaction) => {
      const accountDoc = await transaction.get(accountRef);
      
      if (!accountDoc.exists) {
        throw new Error('Conta não encontrada');
      }

      const currentBalance = accountDoc.data().balance || 0;
      const newBalance = operation === 'add' 
        ? currentBalance + amount 
        : currentBalance - amount;

      // Prevenir saldo negativo excessivo (permitir até -10000 para overdraft)
      if (newBalance < -10000) {
        throw new Error('Saldo insuficiente');
      }

      transaction.update(accountRef, { 
        balance: newBalance,
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      });

      return { newBalance };
    });

    return result;
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Trigger: Log de auditoria para operações financeiras
 */
exports.auditFinancialChanges = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const transaction = snap.data();
    
    // Criar log de auditoria
    await db.collection('audit_logs').add({
      action: 'transaction_created',
      transactionId: context.params.transactionId,
      userId: transaction.owner,
      walletId: transaction.uid,
      amount: transaction.amount,
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
      metadata: {
        category: transaction.category,
        source: transaction.source
      }
    });
  });

/**
 * Trigger: Validar transação antes de criar
 */
exports.validateTransaction = functions.firestore
  .document('transactions/{transactionId}')
  .onCreate(async (snap, context) => {
    const transaction = snap.data();
    
    // Validações adicionais
    if (Math.abs(transaction.amount) > 1000000) {
      // Valor suspeito - marcar para revisão
      await snap.ref.update({
        flaggedForReview: true,
        flagReason: 'Valor excepcionalmente alto'
      });
      
      // Notificar admin (aqui você pode adicionar envio de email)
      console.warn(`Transação ${context.params.transactionId} marcada para revisão`);
    }
  });

/**
 * Função para processar pagamentos em lote com segurança
 */
exports.batchConsolidatePayments = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { transactionIds, walletId } = data;

  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Lista de transações inválida');
  }

  if (transactionIds.length > 100) {
    throw new functions.https.HttpsError('invalid-argument', 'Máximo 100 transações por lote');
  }

  try {
    const batch = db.batch();
    const results = [];

    for (const transId of transactionIds) {
      const transRef = db.collection('transactions').doc(transId);
      const transDoc = await transRef.get();

      if (transDoc.exists && transDoc.data().uid === walletId) {
        batch.update(transRef, { 
          paid: true,
          paidAt: admin.firestore.FieldValue.serverTimestamp(),
          paidBy: context.auth.uid
        });
        results.push({ id: transId, success: true });
      } else {
        results.push({ id: transId, success: false, reason: 'Não encontrada ou sem permissão' });
      }
    }

    await batch.commit();
    return { results, totalProcessed: results.filter(r => r.success).length };
  } catch (error) {
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Limpeza automática de dados antigos (executar mensalmente)
 */
exports.cleanupOldData = functions.pubsub.schedule('0 0 1 * *').onRun(async (context) => {
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  const oldLogs = await db.collection('audit_logs')
    .where('timestamp', '<', sixMonthsAgo)
    .get();

  const batch = db.batch();
  oldLogs.forEach(doc => {
    batch.delete(doc.ref);
  });

  await batch.commit();
  console.log(`Deleted ${oldLogs.size} old audit logs`);
  return null;
});
