import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase.js';
import { renderCards } from './ui.js';
import { colorStyles, flagLogos } from './constants.js';
import { limparValorMoeda } from './utils.js';
import { showToast } from './dialogs.js';

export function setupCards(uid, cardsContainer, sourceSelect, onCardsLoaded) {
    const q = query(collection(db, "cards"), where("uid", "==", uid));
    return onSnapshot(q, (snapshot) => {
        const allCards = [];
        snapshot.forEach(doc => allCards.push({ id: doc.id, ...doc.data() }));

        renderCards(allCards, cardsContainer, colorStyles, flagLogos,
            window.prepararEdicaoCartao, window.deletarCartao);

        popularSelectCartoes(allCards, sourceSelect);

        if (onCardsLoaded) onCardsLoaded(allCards);
    }, (error) => {
        console.warn("Erro ao carregar cartões:", error.message);
        if (onCardsLoaded) onCardsLoaded([]);
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
    const color = document.getElementById('card-color').value;
    const flag = document.getElementById('card-flag').value;
    const name = document.getElementById('card-name').value;
    const last4 = document.getElementById('card-last4').value;
    const bill = limparValorMoeda(document.getElementById('card-bill').value);
    const closingDay = parseInt(document.getElementById('card-closing').value);
    const dueDay = parseInt(document.getElementById('card-due').value);
    const maxInstallments = parseInt(document.getElementById('card-max-installments').value) || 12;

    try {
        await addDoc(collection(db, "cards"), {
            uid: activeWalletId,
            bank,
            color,
            flag,
            name,
            last4,
            bill,
            closingDay,
            dueDay,
            maxInstallments,
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
    const bank = document.getElementById('edit-card-bank').value;
    const color = document.getElementById('edit-card-color').value;
    const name = document.getElementById('edit-card-name').value;
    const bill = limparValorMoeda(document.getElementById('edit-card-bill').value);
    const closingDay = parseInt(document.getElementById('edit-card-closing').value);
    const dueDay = parseInt(document.getElementById('edit-card-due').value);
    const maxInstallments = parseInt(document.getElementById('edit-card-max-installments').value) || 12;

    try {
        await updateDoc(doc(db, "cards", id), { bank, color, name, bill, closingDay, dueDay, maxInstallments });
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
