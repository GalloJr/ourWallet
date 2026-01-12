import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase.js';
import { renderAccounts } from './ui.js';
import { colorStyles } from './constants.js';
import { limparValorMoeda, showToast } from './utils.js';

export function setupAccounts(uid, accountsContainer, sourceSelect, onAccountsLoaded) {
    const q = query(collection(db, "accounts"), where("uid", "==", uid));
    return onSnapshot(q, (snapshot) => {
        const allAccounts = [];
        snapshot.forEach(doc => allAccounts.push({ id: doc.id, ...doc.data() }));

        renderAccounts(allAccounts, accountsContainer, colorStyles,
            window.prepararEdicaoConta, window.deletarConta);

        popularSelectContas(allAccounts, sourceSelect);

        if (onAccountsLoaded) onAccountsLoaded(allAccounts);
    }, (error) => {
        console.warn("Erro ao carregar contas:", error.message);
        if (onAccountsLoaded) onAccountsLoaded([]);
    });
}

function popularSelectContas(accounts, sourceSelect) {
    if (!sourceSelect) return;
    let options = '';
    if (accounts.length === 0) {
        options = '<option value="wallet">💵 Carteira / Conta Corrente (Padrão)</option>';
    } else {
        accounts.forEach(acc => {
            options += `<option value="${acc.id}">🏦 ${acc.name} (Saldo: ${acc.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</option>`;
        });
    }
    // Nota: cards.js também popula este select. Idealmente um coordenador uniria ambos.
}

export async function salvarConta(activeWalletId, accountForm, fecharModal) {
    const bank = document.getElementById('account-bank').value;
    const color = document.getElementById('account-color').value;
    const name = document.getElementById('account-name').value;
    const balance = limparValorMoeda(document.getElementById('account-balance').value);

    try {
        await addDoc(collection(db, "accounts"), {
            uid: activeWalletId,
            bank,
            color,
            name,
            balance,
            createdAt: new Date()
        });
        showToast("Conta Criada!");
        fecharModal();
        accountForm.reset();
    } catch (e) {
        console.error(e);
        alert("Erro ao criar conta");
    }
}

export async function editarConta(editAccountForm, fecharModal) {
    const id = document.getElementById('edit-account-id').value;
    const bank = document.getElementById('edit-account-bank').value;
    const color = document.getElementById('edit-account-color').value;
    const name = document.getElementById('edit-account-name').value;
    const balance = limparValorMoeda(document.getElementById('edit-account-balance').value);

    try {
        await updateDoc(doc(db, "accounts", id), { bank, color, name, balance });
        showToast("Conta Atualizada!");
        fecharModal();
    } catch (e) {
        console.error(e);
        alert("Erro ao editar conta");
    }
}

export async function deletarConta(id) {
    if (confirm("Remover esta conta?")) {
        try {
            await deleteDoc(doc(db, "accounts", id));
            showToast("Conta removida!");
        } catch (e) {
            console.error(e);
        }
    }
}
