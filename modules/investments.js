import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase.js';
import { renderInvestments } from './ui.js';
import { limparValorMoeda } from './utils.js';
import { showToast } from './dialogs.js';

/**
 * Configura listener em tempo real para investimentos
 */
export function setupInvestments(uid, container, callback) {
    const q = query(collection(db, "investments"), where("uid", "==", uid));
    return onSnapshot(q, (snapshot) => {
        const investments = [];
        snapshot.forEach(doc => {
            investments.push({ id: doc.id, ...doc.data() });
        });
        
        // Ordena por valor atual (maior primeiro)
        investments.sort((a, b) => b.currentValue - a.currentValue);
        
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
 * Salva novo investimento
 */
export async function salvarInvestimento(activeWalletId, form, fecharModal) {
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
    const totalInvestido = investments.reduce((sum, inv) => sum + inv.amount, 0);
    const totalAtual = investments.reduce((sum, inv) => sum + inv.currentValue, 0);
    const lucro = totalAtual - totalInvestido;
    const rentabilidade = totalInvestido > 0 ? ((lucro / totalInvestido) * 100) : 0;
    
    return {
        totalInvestido,
        totalAtual,
        lucro,
        rentabilidade,
        quantidade: investments.length
    };
}
