import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase.js';
import { renderDebts } from './ui.js';
import { colorStyles } from './constants.js';
import { limparValorMoeda, showToast } from './utils.js';

export function setupDebts(uid, debtsContainer, onDebtsLoaded) {
    const q = query(collection(db, "debts"), where("uid", "==", uid));
    return onSnapshot(q, (snapshot) => {
        const allDebts = [];
        snapshot.forEach(doc => allDebts.push({ id: doc.id, ...doc.data() }));

        renderDebts(allDebts, debtsContainer, colorStyles,
            window.prepararEdicaoDivida, window.deletarDivida);

        if (onDebtsLoaded) onDebtsLoaded(allDebts);
    }, (error) => {
        console.warn("Erro ao carregar dívidas (funcionalidade premium):", error.message);
        if (onDebtsLoaded) onDebtsLoaded([]);
    });
}

export async function salvarDivida(activeWalletId, debtForm, fecharModal) {
    const color = document.getElementById('debt-color').value;
    const name = document.getElementById('debt-name').value;
    const totalBalance = limparValorMoeda(document.getElementById('debt-balance').value);

    try {
        await addDoc(collection(db, "debts"), {
            uid: activeWalletId,
            color,
            name,
            totalBalance,
            createdAt: new Date()
        });
        showToast("Dívida Registrada!");
        fecharModal();
        debtForm.reset();
    } catch (e) {
        console.error(e);
        alert("Erro ao registrar dívida");
    }
}

export async function editarDivida(editDebtForm, fecharModal) {
    const id = document.getElementById('edit-debt-id').value;
    const color = document.getElementById('edit-debt-color').value;
    const name = document.getElementById('edit-debt-name').value;
    const totalBalance = limparValorMoeda(document.getElementById('edit-debt-balance').value);

    try {
        await updateDoc(doc(db, "debts", id), { color, name, totalBalance });
        showToast("Dívida Atualizada!");
        fecharModal();
    } catch (e) {
        console.error(e);
        alert("Erro ao editar dívida");
    }
}

export async function deletarDivida(id) {
    if (confirm("Remover esta dívida?")) {
        try {
            await deleteDoc(doc(db, "debts", id));
            showToast("Dívida removida!");
        } catch (e) {
            console.error(e);
        }
    }
}
