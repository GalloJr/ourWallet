import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase.js';
import { renderGoals } from './ui.js';
import { limparValorMoeda, showToast } from './utils.js';

export function setupGoals(uid, goalsContainer) {
    const q = query(collection(db, "goals"), where("uid", "==", uid));
    return onSnapshot(q, (snapshot) => {
        const goals = [];
        snapshot.forEach(doc => goals.push({ id: doc.id, ...doc.data() }));
        renderGoals(goals, goalsContainer, deletarMeta);
    });
}

export async function salvarMeta(activeWalletId, goalForm, fecharModal) {
    const title = document.getElementById('goal-title').value;
    const target = limparValorMoeda(document.getElementById('goal-target').value);
    const current = limparValorMoeda(document.getElementById('goal-current').value);

    try {
        await addDoc(collection(db, "goals"), {
            uid: activeWalletId,
            title,
            target,
            current,
            createdAt: new Date()
        });
        showToast("Meta criada!");
        fecharModal();
        goalForm.reset();
    } catch (e) {
        console.error(e);
        alert("Erro ao criar meta");
    }
}

export async function deletarMeta(id) {
    if (confirm("Remover esta meta?")) {
        try {
            await deleteDoc(doc(db, "goals", id));
            showToast("Meta removida!");
        } catch (e) {
            console.error(e);
        }
    }
}
