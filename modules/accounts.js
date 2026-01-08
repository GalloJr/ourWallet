import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase.js';
import { renderAccounts } from './ui.js';
import { bankStyles } from './constants.js';
import { limparValorMoeda, showToast } from './utils.js';

export function setupAccounts(uid, accountsContainer, sourceSelect, onAccountsLoaded) {
    const q = query(collection(db, "accounts"), where("uid", "==", uid));
    return onSnapshot(q, (snapshot) => {
        const allAccounts = [];
        snapshot.forEach(doc => allAccounts.push({ id: doc.id, ...doc.data() }));

        renderAccounts(allAccounts, accountsContainer, bankStyles,
            window.prepararEdicaoConta, window.deletarConta);

        popularSelectContas(allAccounts, sourceSelect);

        if (onAccountsLoaded) onAccountsLoaded(allAccounts);
    });
}

function popularSelectContas(accounts, sourceSelect) {
    if (!sourceSelect) return;

    // Pegamos o valor selecionado atualmente para tentar manter
    const currentValue = sourceSelect.value;

    // A opção "Carteira" agora será substituída pelas contas reais ou mantida se não houver contas
    let options = '';

    if (accounts.length === 0) {
        options = '<option value="wallet">💵 Carteira / Conta Corrente (Padrão)</option>';
    } else {
        accounts.forEach(acc => {
            options += `<option value="${acc.id}">🏦 ${acc.name} (Saldo: ${acc.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</option>`;
        });
    }

    // Preservamos as opções de cartão que já possam estar lá (o cards.js também popula esse select)
    // Mas na verdade, é melhor que ambos os módulos colaborem ou um módulo central gerencie isso.
    // Vamos fazer com que o app.js coordene ou que cada um adicione o seu.
    // Atualmente cards.js sobrescreve o innerHTML.

    // Decisão: Vou marcar as opções com classes para poder filtrar/manter. 
    // Ou simplesmente deixar o app.js fazer a renderização do select combinando ambos.
}

export async function salvarConta(activeWalletId, accountForm, fecharModal) {
    const bank = document.getElementById('account-bank').value;
    const name = document.getElementById('account-name').value;
    const balance = limparValorMoeda(document.getElementById('account-balance').value);

    try {
        await addDoc(collection(db, "accounts"), {
            uid: activeWalletId,
            bank,
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
    const name = document.getElementById('edit-account-name').value;
    const balance = limparValorMoeda(document.getElementById('edit-account-balance').value);

    try {
        await updateDoc(doc(db, "accounts", id), { name, balance });
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
