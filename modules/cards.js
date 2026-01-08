import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase.js';
import { renderCards } from './ui.js';
import { bankStyles, flagLogos } from './constants.js';
import { limparValorMoeda, showToast } from './utils.js';

export function setupCards(uid, cardsContainer, sourceSelect, onCardsLoaded) {
    const q = query(collection(db, "cards"), where("uid", "==", uid));
    return onSnapshot(q, (snapshot) => {
        const allCards = [];
        snapshot.forEach(doc => allCards.push({ id: doc.id, ...doc.data() }));

        renderCards(allCards, cardsContainer, bankStyles, flagLogos,
            window.prepararEdicaoCartao, window.deletarCartao);

        popularSelectCartoes(allCards, sourceSelect);

        if (onCardsLoaded) onCardsLoaded(allCards);
    });
}

function popularSelectCartoes(cards, sourceSelect) {
    if (!sourceSelect) return;
    const defaultOption = '<option value="wallet">💵 Carteira / Conta Corrente</option>';
    let options = defaultOption;
    cards.forEach(card => {
        options += `<option value="${card.id}">💳 Cartão ${card.name} (Final ${card.last4})</option>`;
    });
    sourceSelect.innerHTML = options;
}

export async function salvarCartao(activeWalletId, cardForm, fecharModal) {
    const bank = document.getElementById('card-bank').value;
    const flag = document.getElementById('card-flag').value;
    const name = document.getElementById('card-name').value;
    const last4 = document.getElementById('card-last4').value;
    const bill = limparValorMoeda(document.getElementById('card-bill').value);

    try {
        await addDoc(collection(db, "cards"), {
            uid: activeWalletId,
            bank,
            flag,
            name,
            last4,
            bill,
            createdAt: new Date()
        });
        showToast("Cartão Criado!");
        fecharModal();
        cardForm.reset();
    } catch (e) {
        console.error(e);
        alert("Erro ao criar cartão");
    }
}

export async function editarCartao(editCardForm, fecharModal) {
    const id = document.getElementById('edit-card-id').value;
    const name = document.getElementById('edit-card-name').value;
    const bill = limparValorMoeda(document.getElementById('edit-card-bill').value);

    try {
        await updateDoc(doc(db, "cards", id), { name, bill });
        showToast("Cartão Atualizado!");
        fecharModal();
    } catch (e) {
        console.error(e);
        alert("Erro ao editar cartão");
    }
}

export async function deletarCartao(id) {
    if (confirm("Remover este cartão?")) {
        try {
            await deleteDoc(doc(db, "cards", id));
            showToast("Cartão removido!");
        } catch (e) {
            console.error(e);
        }
    }
}
