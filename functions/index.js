const {onCall, HttpsError} = require('firebase-functions/v2/https');
const {onDocumentCreated} = require('firebase-functions/v2/firestore');
const {onSchedule} = require('firebase-functions/v2/scheduler');
const {defineSecret} = require('firebase-functions/params');
const admin = require('firebase-admin');
const https = require('https');
const nodemailer = require('nodemailer');
admin.initializeApp();

const db = admin.firestore();
const TIME_ZONE = 'America/Sao_Paulo';

const SMTP_HOST = defineSecret('SMTP_HOST');
const SMTP_PORT = defineSecret('SMTP_PORT');
const SMTP_USER = defineSecret('SMTP_USER');
const SMTP_PASS = defineSecret('SMTP_PASS');
const SMTP_SECURE = defineSecret('SMTP_SECURE');
const EMAIL_FROM = defineSecret('EMAIL_FROM');
const GEMINI_API_KEY = defineSecret('GEMINI_API_KEY');

/**
 * Valida operação financeira
 * Chamada antes de qualquer atualização de saldo crítica
 */
exports.validateFinancialOperation = onCall(async (request) => {
  // Verificar autenticação
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { type, amount, accountId, walletId } = request.data;

  // Validações básicas
  if (!type || !['credit', 'debit'].includes(type)) {
    throw new HttpsError('invalid-argument', 'Tipo de operação inválido');
  }

  if (typeof amount !== 'number' || amount <= 0 || amount > 1000000) {
    throw new HttpsError('invalid-argument', 'Valor inválido');
  }

  if (!accountId || typeof accountId !== 'string') {
    throw new HttpsError('invalid-argument', 'ID da conta inválido');
  }

  // Verificar se usuário tem permissão na carteira
  const userDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!userDoc.exists) {
    throw new HttpsError('not-found', 'Usuário não encontrado');
  }

  const userData = userDoc.data();
  const activeWalletId = userData.linkedWalletId || request.auth.uid;

  if (walletId && activeWalletId !== walletId) {
    throw new HttpsError('permission-denied', 'Sem permissão para esta carteira');
  }

  return { valid: true, message: 'Operação validada' };
});

/**
 * Atualiza saldo de forma atômica usando transação
 */
exports.updateAccountBalance = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { accountId, amount, operation } = request.data;

  if (!accountId || typeof amount !== 'number') {
    throw new HttpsError('invalid-argument', 'Parâmetros inválidos');
  }

  if (!['add', 'subtract'].includes(operation)) {
    throw new HttpsError('invalid-argument', 'Operação inválida');
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
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Trigger: Log de auditoria para operações financeiras
 */
exports.auditFinancialChanges = onDocumentCreated('transactions/{transactionId}', async (event) => {
  const transaction = event.data.data();
  const transactionId = event.params.transactionId;
  
  // Criar log de auditoria
  await db.collection('audit_logs').add({
    action: 'transaction_created',
    transactionId: transactionId,
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
exports.validateTransaction = onDocumentCreated('transactions/{transactionId}', async (event) => {
  const transaction = event.data.data();
  const transactionId = event.params.transactionId;
  
  // Validações adicionais
  if (Math.abs(transaction.amount) > 1000000) {
    // Valor suspeito - marcar para revisão
    await event.data.ref.update({
      flaggedForReview: true,
      flagReason: 'Valor excepcionalmente alto'
    });
    
    // Notificar admin (aqui você pode adicionar envio de email)
    console.warn(`Transação ${transactionId} marcada para revisão`);
  }
});

/**
 * Função para processar pagamentos em lote com segurança
 */
exports.batchConsolidatePayments = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { transactionIds, walletId } = request.data;

  if (!Array.isArray(transactionIds) || transactionIds.length === 0) {
    throw new HttpsError('invalid-argument', 'Lista de transações inválida');
  }

  if (transactionIds.length > 100) {
    throw new HttpsError('invalid-argument', 'Máximo 100 transações por lote');
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
          paidBy: request.auth.uid
        });
        results.push({ id: transId, success: true });
      } else {
        results.push({ id: transId, success: false, reason: 'Não encontrada ou sem permissão' });
      }
    }

    await batch.commit();
    return { results, totalProcessed: results.filter(r => r.success).length };
  } catch (error) {
    throw new HttpsError('internal', error.message);
  }
});

/**
 * Limpeza automática de dados antigos (executar mensalmente)
 */
exports.cleanupOldData = onSchedule('0 0 1 * *', async (event) => {
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

function getZonedDateParts(date, timeZone) {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  const parts = formatter.formatToParts(date);
  const map = Object.fromEntries(parts.map(p => [p.type, p.value]));
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day)
  };
}

function getZonedWeekday(year, month, day, timeZone) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short'
  });
  const weekday = formatter.format(date);
  const map = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[weekday];
}

function isLastBusinessDay(year, month, day, timeZone) {
  const lastDayDate = new Date(Date.UTC(year, month, 0));
  let lastDay = lastDayDate.getUTCDate();

  while (true) {
    const weekday = getZonedWeekday(year, month, lastDay, timeZone);
    if (weekday !== 0 && weekday !== 6) break;
    lastDay -= 1;
  }

  return day === lastDay;
}

function montarResumoMensal(transacoes) {
  const totalReceitas = transacoes
    .filter(t => t.amount >= 0)
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDespesas = transacoes
    .filter(t => t.amount < 0)
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);
  const saldo = totalReceitas - totalDespesas;

  const porCategoria = {};
  transacoes
    .filter(t => t.amount < 0)
    .forEach(t => {
      const cat = t.category || 'outros';
      porCategoria[cat] = (porCategoria[cat] || 0) + Math.abs(t.amount);
    });

  const topCategorias = Object.entries(porCategoria)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cat, total]) => ({ categoria: cat, total }));

  return {
    totalReceitas,
    totalDespesas,
    saldo,
    totalTransacoes: transacoes.length,
    topCategorias
  };
}

async function gerarAnaliseIA(resumo, mesLabel, ano) {
  const geminiKey = GEMINI_API_KEY.value() || process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    return 'Relatório automático gerado sem análise de IA (chave não configurada).';
  }

  const prompt = `Você é um consultor financeiro. Gere um resumo curto e objetivo para o mês ${mesLabel}/${ano}.

Dados:
- Receitas: R$ ${resumo.totalReceitas.toFixed(2)}
- Despesas: R$ ${resumo.totalDespesas.toFixed(2)}
- Saldo: R$ ${resumo.saldo.toFixed(2)}
- Total de transações: ${resumo.totalTransacoes}
- Top categorias: ${resumo.topCategorias.map(c => `${c.categoria}: R$ ${c.total.toFixed(2)}`).join(', ')}

Gere 1 parágrafo com insights e 3 bullets com recomendações práticas. Use tom amigável e direto.`;

  try {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.6, maxOutputTokens: 800 }
      })
    });

    if (!response.ok) {
      throw new Error(`Gemini error: ${response.status}`);
    }

    const result = await response.json();
    return result.candidates?.[0]?.content?.parts?.[0]?.text || 'Relatório gerado, mas não foi possível obter a análise da IA.';
  } catch (error) {
    console.error('Erro ao gerar análise IA:', error);
    return 'Relatório gerado com fallback (erro ao obter análise de IA).';
  }
}

function criarTransporterEmail() {
  const host = SMTP_HOST.value() || process.env.SMTP_HOST;
  const user = SMTP_USER.value() || process.env.SMTP_USER;
  const pass = SMTP_PASS.value() || process.env.SMTP_PASS;
  const port = Number(SMTP_PORT.value() || process.env.SMTP_PORT || 587);
  const secure = (SMTP_SECURE.value() || process.env.SMTP_SECURE) === 'true';

  if (!host || !user || !pass) {
    throw new Error('Configuração SMTP incompleta. Defina SMTP_HOST, SMTP_USER e SMTP_PASS.');
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass }
  });
}

exports.gerarRelatorioMensalIAAgendado = onSchedule({
  schedule: '59 23 * * *',
  timeZone: TIME_ZONE,
  secrets: [
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
    SMTP_SECURE,
    EMAIL_FROM,
    GEMINI_API_KEY
  ]
}, async () => {
  const now = new Date();
  const { year, month, day } = getZonedDateParts(now, TIME_ZONE);

  if (!isLastBusinessDay(year, month, day, TIME_ZONE)) {
    console.log('Hoje não é o último dia útil. Nenhum relatório enviado.');
    return null;
  }

  const primeiroDia = `${year}-${String(month).padStart(2, '0')}-01`;
  const ultimoDia = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const mesLabel = String(month).padStart(2, '0');

  const transporter = criarTransporterEmail();
  const fromEmail = EMAIL_FROM.value() || process.env.EMAIL_FROM || SMTP_USER.value() || process.env.SMTP_USER;

  const usuariosSnap = await db.collection('users').get();

  for (const userDoc of usuariosSnap.docs) {
    const userData = userDoc.data();
    const email = userData.email;
    if (!email) continue;

    const walletId = userData.linkedWalletId || userDoc.id;
    const transSnap = await db.collection('transactions')
      .where('uid', '==', walletId)
      .where('date', '>=', primeiroDia)
      .where('date', '<=', ultimoDia)
      .get();

    const transacoes = transSnap.docs.map(doc => doc.data());
    const resumo = montarResumoMensal(transacoes);
    const analise = await gerarAnaliseIA(resumo, mesLabel, year);

    const html = `
      <h2>Relatório OurWallet - ${mesLabel}/${year}</h2>
      <p>Olá, ${userData.displayName || 'usuário'}!</p>
      <p>Segue o resumo financeiro do período:</p>
      <ul>
        <li><strong>Receitas:</strong> R$ ${resumo.totalReceitas.toFixed(2)}</li>
        <li><strong>Despesas:</strong> R$ ${resumo.totalDespesas.toFixed(2)}</li>
        <li><strong>Saldo:</strong> R$ ${resumo.saldo.toFixed(2)}</li>
        <li><strong>Total de transações:</strong> ${resumo.totalTransacoes}</li>
      </ul>
      <p><strong>Top categorias:</strong> ${resumo.topCategorias.map(c => `${c.categoria} (R$ ${c.total.toFixed(2)})`).join(', ') || 'Sem despesas no período'}</p>
      <hr/>
      <pre style="white-space: pre-wrap; font-family: inherit;">${analise}</pre>
    `;

    await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: `Relatório OurWallet - ${mesLabel}/${year}`,
      html
    });
  }

  console.log('Relatórios mensais enviados.');
  return null;
});

/**
 * Busca cotação de ações via Yahoo Finance (sem CORS)
 */
exports.getStockQuote = onCall(async (request) => {
  // Verificar autenticação
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Usuário não autenticado');
  }

  const { ticker } = request.data;

  if (!ticker || typeof ticker !== 'string') {
    throw new HttpsError('invalid-argument', 'Ticker inválido');
  }

  // Normalizar ticker
  let normalizedTicker = ticker.toUpperCase().trim();
  if (!normalizedTicker.includes('.') && !normalizedTicker.includes(':')) {
    normalizedTicker = `${normalizedTicker}.SA`;
  }

  try {
    // Buscar via Yahoo Finance
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${normalizedTicker}?interval=1d&range=1d`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new HttpsError('not-found', `Erro ao buscar cotação: ${response.status}`);
    }

    const data = await response.json();
    const quote = data.chart?.result?.[0]?.meta?.regularMarketPrice;

    if (!quote) {
      throw new HttpsError('not-found', 'Ação não encontrada');
    }

    return { 
      ticker: normalizedTicker, 
      price: quote,
      timestamp: new Date().toISOString()
    };

  } catch (error) {
    console.error('Erro ao buscar cotação:', error);
    throw new HttpsError('internal', error.message || 'Erro ao buscar cotação');
  }
});
