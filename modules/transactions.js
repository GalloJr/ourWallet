import { db, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase.js';
import { categoryConfig } from './constants.js';
import { limparValorMoeda, showToast, formatarData } from './utils.js';

export function setupTransactions(uid, onTransactionsLoaded) {
    const q = query(collection(db, "transactions"), where("uid", "==", uid));
    return onSnapshot(q, (snapshot) => {
        const transactions = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            let dataCorrigida = data.date;
            try {
                if (data.date && data.date.seconds)
                    dataCorrigida = new Date(data.date.seconds * 1000).toISOString().split('T')[0];
            } catch (e) { }
            transactions.push({ id: doc.id, ...data, date: dataCorrigida });
        });
        transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        if (onTransactionsLoaded) onTransactionsLoaded(transactions);
    });
}

export async function salvarTransacao(activeWalletId, currentUser, allCards, form, installmentsSelect, fecharModal) {
    const desc = document.getElementById('desc').value;
    const amountVal = limparValorMoeda(document.getElementById('amount').value);
    if (amountVal <= 0) return alert("Valor inválido");

    const dateVal = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const paymentSource = document.getElementById('transaction-source').value;
    const numInstallments = parseInt(installmentsSelect.value) || 1;

    const type = categoryConfig[category].type;
    const finalAmountTotal = type === 'expense' ? -Math.abs(amountVal) : Math.abs(amountVal);
    const amountPerInstallment = finalAmountTotal / numInstallments;

    try {
        for (let i = 0; i < numInstallments; i++) {
            const currentParcelDate = new Date(dateVal + 'T12:00:00');
            currentParcelDate.setMonth(currentParcelDate.getMonth() + i);

            const dateStr = currentParcelDate.toISOString().split('T')[0];
            const parcelDesc = numInstallments > 1 ? `${desc} (${i + 1}/${numInstallments})` : desc;

            await addDoc(collection(db, "transactions"), {
                uid: activeWalletId,
                owner: currentUser.uid,
                ownerName: currentUser.displayName || "Usuário",
                desc: parcelDesc,
                amount: amountPerInstallment,
                date: dateStr,
                category: category,
                source: paymentSource,
                createdAt: new Date()
            });
        }

        if (type === 'expense' && paymentSource !== 'wallet') {
            const card = allCards.find(c => c.id === paymentSource);
            if (card) {
                const novaFatura = (card.bill || 0) + Math.abs(amountVal);
                await updateDoc(doc(db, "cards", paymentSource), { bill: novaFatura });
                showToast(`Fatura do ${card.name} atualizada!`);
            }
        }

        showToast(numInstallments > 1 ? `${numInstallments} parcelas adicionadas!` : "Salvo!");
        return true;
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar");
        return false;
    }
}

export async function editarTransacao(id, allTransactions, fecharModal) {
    const desc = document.getElementById('edit-desc').value;
    const amountVal = limparValorMoeda(document.getElementById('edit-amount').value);
    const dateVal = document.getElementById('edit-date').value;

    const original = allTransactions.find(t => t.id === id);
    const isExpense = original && original.amount < 0;
    const finalAmount = isExpense ? -Math.abs(amountVal) : Math.abs(amountVal);

    try {
        await updateDoc(doc(db, "transactions", id), {
            desc: desc,
            amount: finalAmount,
            date: dateVal
        });
        showToast("Editado!");
        fecharModal();
        return true;
    } catch (e) {
        console.error(e);
        alert("Erro ao editar");
        return false;
    }
}

export function exportarCSV(filteredTransactions, allCards) {
    if (!filteredTransactions.length) return showToast("Nada para exportar!");
    let csv = "\uFEFFData;Descrição;Valor;Categoria;Pagamento;Por\n";
    filteredTransactions.forEach(t => {
        let fonte = "Carteira";
        if (t.source && t.source !== 'wallet') {
            const card = allCards.find(c => c.id === t.source);
            fonte = card ? `Cartão ${card.name}` : "Cartão (Removido)";
        }
        const quem = t.ownerName || "---";
        csv += `${formatarData(t.date)};${t.desc};${t.amount.toLocaleString('pt-BR')};${categoryConfig[t.category]?.label || t.category};${fonte};${quem}\n`;
    });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = "extrato.csv";
    link.click();
}
