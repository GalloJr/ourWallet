import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where, orderBy, getDocs } from '../firebase.js';
import { renderInvestments } from './ui.js';
import { limparValorMoeda } from './utils.js';
import { showToast } from './dialogs.js';

/**
 * Configura listener em tempo real para investimentos e transações
 */
export function setupInvestments(uid, container, callback) {
    const q = query(collection(db, "investments"), where("uid", "==", uid));
    return onSnapshot(q, async (snapshot) => {
        const investments = [];
        
        for (const docSnap of snapshot.docs) {
            const invData = { id: docSnap.id, ...docSnap.data() };
            
            // Buscar transações deste investimento (sem orderBy para evitar necessidade de índice)
            const transactionsQuery = query(
                collection(db, "investment-transactions"),
                where("investmentId", "==", docSnap.id)
            );
            
            try {
                const transSnap = await getDocs(transactionsQuery);
                invData.transactions = [];
                transSnap.forEach(t => {
                    invData.transactions.push({ id: t.id, ...t.data() });
                });
                
                // Ordenar manualmente por data (mais recente primeiro)
                invData.transactions.sort((a, b) => {
                    const dateA = a.date?.toDate ? a.date.toDate() : new Date(a.date);
                    const dateB = b.date?.toDate ? b.date.toDate() : new Date(b.date);
                    return dateB - dateA;
                });
            } catch (error) {
                console.warn(`Erro ao buscar transações para ${invData.name}:`, error.message);
                invData.transactions = [];
            }
            
            // Calcular valores consolidados
            invData.consolidated = calcularConsolidado(invData.transactions);
            
            investments.push(invData);
        }
        
        // Ordena por valor atual (maior primeiro)
        investments.sort((a, b) => (b.consolidated.totalAtual || 0) - (a.consolidated.totalAtual || 0));
        
        // Renderiza na UI
        if (container) {
            renderInvestments(investments, container, editarInvestimento, deletarInvestimento);
        }
        
        // Callback para atualizar appState
        if (callback) callback(investments);
    }, (error) => {
        console.warn("Erro ao carregar investimentos:", error.message);
        if (callback) callback([]);
    });
}

/**
 * Calcula valores consolidados a partir das transações
 */
function calcularConsolidado(transactions) {
    let quantidadeTotal = 0;
    let totalInvestido = 0;
    let totalDividendos = 0;
    let totalVendido = 0;
    let custoTotalCompras = 0;
    
    transactions.forEach(t => {
        if (t.type === 'compra') {
            quantidadeTotal += t.quantity;
            const valorTotal = t.quantity * t.price;
            totalInvestido += valorTotal;
            custoTotalCompras += valorTotal;
        } else if (t.type === 'venda') {
            quantidadeTotal -= t.quantity;
            totalVendido += t.quantity * t.price;
        } else if (t.type === 'dividendo') {
            totalDividendos += t.amount;
        }
    });
    
    const precoMedio = quantidadeTotal > 0 ? (custoTotalCompras - totalVendido) / quantidadeTotal : 0;
    const valorAtual = quantidadeTotal > 0 && transactions.length > 0 
        ? quantidadeTotal * (transactions[0].currentPrice || precoMedio) 
        : 0;
    
    const lucroNaoRealizado = valorAtual - (precoMedio * quantidadeTotal);
    const lucroRealizado = totalVendido - (totalVendido > 0 ? totalInvestido * (totalVendido / valorAtual) : 0);
    const lucroTotal = lucroNaoRealizado + lucroRealizado + totalDividendos;
    const rentabilidade = totalInvestido > 0 ? (lucroTotal / totalInvestido) * 100 : 0;
    
    return {
        quantidade: quantidadeTotal,
        precoMedio,
        totalInvestido,
        totalAtual: valorAtual,
        totalDividendos,
        lucroNaoRealizado,
        lucroRealizado,
        lucroTotal,
        rentabilidade
    };
}

/**
 * Salva novo investimento (ativo)
 */
export async function salvarInvestimento(activeWalletId, form, fecharModal) {
    const nome = document.getElementById('inv-name').value.trim();
    const tipo = document.getElementById('inv-type').value;
    const ticker = document.getElementById('inv-ticker')?.value.trim() || '';
    const cor = document.getElementById('inv-color').value;

    if (!nome) {
        showToast("⚠️ Digite o nome do ativo", "error");
        return;
    }

    try {
        await addDoc(collection(db, "investments"), {
            uid: activeWalletId,
            name: nome,
            ticker: ticker.toUpperCase(),
            type: tipo,
            color: cor,
            createdAt: new Date()
        });
        
        showToast("✅ Ativo criado! Agora adicione as transações.", "success");
        fecharModal();
        form.reset();
    } catch (e) {
        console.error("Erro ao criar investimento:", e);
        showToast("❌ Erro ao criar investimento", "error");
    }
}

/**
 * Adiciona transação a um investimento
 */
export async function adicionarTransacao(investmentId, transactionData) {
    try {
        await addDoc(collection(db, "investment-transactions"), {
            investmentId,
            ...transactionData,
            createdAt: new Date()
        });
        
        const typeLabels = {
            'compra': 'Compra',
            'venda': 'Venda',
            'dividendo': 'Dividendo'
        };
        
        showToast(`✅ ${typeLabels[transactionData.type]} registrada!`, "success");
        return true;
    } catch (e) {
        console.error("Erro ao adicionar transação:", e);
        showToast("❌ Erro ao registrar transação", "error");
        return false;
    }
}

/**
 * Deleta transação
 */
export async function deletarTransacaoInvestimento(transactionId) {
    if (confirm("Remover esta transação?")) {
        try {
            await deleteDoc(doc(db, "investment-transactions", transactionId));
            showToast("🗑️ Transação removida", "success");
        } catch (e) {
            console.error("Erro ao deletar transação:", e);
            showToast("❌ Erro ao remover transação", "error");
        }
    }
}

/**
 * Salva novo investimento
 */
export async function salvarInvestimento_OLD(activeWalletId, form, fecharModal) {
    const nome = document.getElementById('inv-name').value.trim();
    const tipo = document.getElementById('inv-type').value;
    const valorInvestido = limparValorMoeda(document.getElementById('inv-amount').value);
    const valorAtual = limparValorMoeda(document.getElementById('inv-current').value);
    const cor = document.getElementById('inv-color').value;

    if (!nome || valorInvestido <= 0 || valorAtual <= 0) {
        showToast("⚠️ Preencha todos os campos corretamente");
        return;
    }

    try {
        await addDoc(collection(db, "investments"), {
            uid: activeWalletId,
            name: nome,
            type: tipo,
            amount: valorInvestido,
            currentValue: valorAtual,
            color: cor,
            createdAt: new Date()
        });
        
        showToast("✅ Investimento criado!");
        fecharModal();
        form.reset();
    } catch (e) {
        console.error("Erro ao criar investimento:", e);
        alert("Erro ao criar investimento. Verifique suas permissões.");
    }
}

/**
 * Edita investimento existente
 */
export async function editarInvestimento(editForm, fecharModal) {
    const id = document.getElementById('edit-inv-id').value;
    const nome = document.getElementById('edit-inv-name').value.trim();
    const tipo = document.getElementById('edit-inv-type').value;
    const valorInvestido = limparValorMoeda(document.getElementById('edit-inv-amount').value);
    const valorAtual = limparValorMoeda(document.getElementById('edit-inv-current').value);
    const cor = document.getElementById('edit-inv-color').value;

    if (!nome || valorInvestido <= 0 || valorAtual <= 0) {
        showToast("⚠️ Preencha todos os campos corretamente");
        return;
    }

    try {
        await updateDoc(doc(db, "investments", id), {
            name: nome,
            type: tipo,
            amount: valorInvestido,
            currentValue: valorAtual,
            color: cor
        });
        
        showToast("✅ Investimento atualizado!");
        fecharModal();
    } catch (e) {
        console.error("Erro ao editar investimento:", e);
        alert("Erro ao editar investimento.");
    }
}

/**
 * Deleta investimento
 */
export async function deletarInvestimento(id, nome) {
    if (confirm(`Remover investimento "${nome}"?`)) {
        try {
            await deleteDoc(doc(db, "investments", id));
            showToast("🗑️ Investimento removido");
        } catch (e) {
            console.error("Erro ao deletar investimento:", e);
            alert("Erro ao remover investimento.");
        }
    }
}

/**
 * Popula formulário de edição
 */
export function popularFormularioEdicao(investment) {
    document.getElementById('edit-inv-id').value = investment.id;
    document.getElementById('edit-inv-name').value = investment.name;
    document.getElementById('edit-inv-type').value = investment.type;
    document.getElementById('edit-inv-amount').value = `R$ ${investment.amount.toFixed(2).replace('.', ',')}`;
    document.getElementById('edit-inv-current').value = `R$ ${investment.currentValue.toFixed(2).replace('.', ',')}`;
    document.getElementById('edit-inv-color').value = investment.color || 'blue';
}

/**
 * Calcula estatísticas dos investimentos
 */
export function calcularEstatisticasInvestimentos(investments) {
    const totalInvestido = investments.reduce((sum, inv) => sum + (inv.consolidated?.totalInvestido || 0), 0);
    const totalAtual = investments.reduce((sum, inv) => sum + (inv.consolidated?.totalAtual || 0), 0);
    const totalDividendos = investments.reduce((sum, inv) => sum + (inv.consolidated?.totalDividendos || 0), 0);
    const lucro = totalAtual - totalInvestido + totalDividendos;
    const rentabilidade = totalInvestido > 0 ? ((lucro / totalInvestido) * 100) : 0;
    
    return {
        totalInvestido,
        totalAtual,
        totalDividendos,
        lucro,
        rentabilidade,
        quantidade: investments.length
    };
}
