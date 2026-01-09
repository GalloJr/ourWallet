import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase.js';
import { renderDebts } from './ui.js';
import { bankStyles } from './constants.js';
import { limparValorMoeda, showToast } from './utils.js';

export function setupDebts(uid, debtsContainer, onDebtsLoaded) {
    const q = query(collection(db, "debts"), where("uid", "==", uid));
    return onSnapshot(q, (snapshot) => {
        const allDebts = [];
        snapshot.forEach(doc => allDebts.push({ id: doc.id, ...doc.data() }));

        renderDebts(allDebts, debtsContainer, bankStyles,
            window.prepararEdicaoDivida, window.deletarDivida);

        if (onDebtsLoaded) onDebtsLoaded(allDebts);
    });
}

export async function salvarDivida(activeWalletId, debtForm, fecharModal) {
    const bank = document.getElementById('debt-bank').value;
    const name = document.getElementById('debt-name').value;
    const totalBalance = limparValorMoeda(document.getElementById('debt-balance').value);

    try {
        await addDoc(collection(db, "debts"), {
            uid: activeWalletId,
            bank,
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
    const name = document.getElementById('edit-debt-name').value;
    const totalBalance = limparValorMoeda(document.getElementById('edit-debt-balance').value);

    try {
        await updateDoc(doc(db, "debts", id), { name, totalBalance });
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
