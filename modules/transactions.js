import { db, storage, ref, uploadBytes, getDownloadURL, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase.js';
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
    }, (error) => {
        console.warn("Erro ao carregar transações:", error.message);
        if (onTransactionsLoaded) onTransactionsLoaded([]); // Permite que o app continue carregando
    });
}

export async function salvarTransacao(activeWalletId, currentUser, allCards, allAccounts, allDebts, form, installmentsSelect, fecharModal) {
    const desc = document.getElementById('desc').value;
    const amountVal = limparValorMoeda(document.getElementById('amount').value);
    if (amountVal <= 0) return alert("Valor inválido");

    const dateVal = document.getElementById('date').value;
    const category = document.getElementById('category').value;
    const paymentSource = document.getElementById('transaction-source').value;
    const repeatMonthly = document.getElementById('repeat-monthly').checked;

    let numIterations = parseInt(installmentsSelect.value) || 1;
    let isInstallment = numIterations > 1;

    // Se marcar repetir mensalmente, ignoramos parcelas e criamos 12 lançamentos
    if (repeatMonthly) {
        numIterations = 12;
        isInstallment = false; // Para não aparecer "(1/12)" se for apenas um gasto fixo, ou podemos customizar
    }

    const type = categoryConfig[category].type;
    const finalAmountTotal = type === 'expense' ? -Math.abs(amountVal) : Math.abs(amountVal);
    const amountPerIteration = isInstallment ? finalAmountTotal / numIterations : finalAmountTotal;

    const receiptInput = document.getElementById('receipt');
    let receiptUrl = null;

    try {
        for (let i = 0; i < numIterations; i++) {
            const currentParcelDate = new Date(dateVal + 'T12:00:00');
            currentParcelDate.setMonth(currentParcelDate.getMonth() + i);

            const dateStr = currentParcelDate.toISOString().split('T')[0];
            let parcelDesc = desc;

            if (isInstallment) {
                parcelDesc = `${desc} (${i + 1}/${numIterations})`;
            } else if (repeatMonthly) {
                parcelDesc = `${desc} [Fixo]`;
            }

            await addDoc(collection(db, "transactions"), {
                uid: activeWalletId,
                owner: currentUser.uid,
                ownerName: currentUser.displayName || "Usuário",
                desc: parcelDesc,
                amount: amountPerIteration,
                date: dateStr,
                category: category,
                source: paymentSource,
                receiptUrl: receiptUrl,
                createdAt: new Date(),
                isRecurring: repeatMonthly
            });
        }

        if (type === 'income') {
            const acc = allAccounts?.find(a => a.id === paymentSource);
            if (acc) {
                const novoSaldo = (acc.balance || 0) + Math.abs(amountVal);
                await updateDoc(doc(db, "accounts", paymentSource), { balance: novoSaldo });
                showToast(`Saldo da conta ${acc.name} atualizado!`);
            }
        } else if (type === 'expense') {
            const card = allCards.find(c => c.id === paymentSource);
            if (card) {
                const novaFatura = (card.bill || 0) + Math.abs(amountVal);
                await updateDoc(doc(db, "cards", paymentSource), { bill: novaFatura });
                showToast(`Fatura do ${card.name} atualizada!`);
            } else {
                const acc = allAccounts?.find(a => a.id === paymentSource);
                if (acc) {
                    const novoSaldo = (acc.balance || 0) - Math.abs(amountVal);
                    await updateDoc(doc(db, "accounts", paymentSource), { balance: novoSaldo });
                    showToast(`Saldo da conta ${acc.name} atualizado!`);
                } else {
                    const debt = allDebts?.find(d => d.id === paymentSource);
                    if (debt) {
                        const novoSaldoDev = (debt.totalBalance || 0) - Math.abs(amountVal);
                        await updateDoc(doc(db, "debts", paymentSource), { totalBalance: Math.max(0, novoSaldoDev) });
                        showToast(`Dívida ${debt.name} abatida!`);
                    }
                }
            }
        }

        if (repeatMonthly) {
            showToast("Lançamentos recorrentes criados!");
        } else {
            showToast(numIterations > 1 ? `${numIterations} parcelas adicionadas!` : "Salvo!");
        }
        return true;
    } catch (e) {
        console.error(e);
        alert("Erro ao salvar");
        return false;
    }
}

export async function editarTransacao(id, allTransactions, allCards, allAccounts, allDebts, fecharModal) {
    const desc = document.getElementById('edit-desc').value;
    const amountVal = limparValorMoeda(document.getElementById('edit-amount').value);
    const dateVal = document.getElementById('edit-date').value;
    const newSource = document.getElementById('edit-source').value;

    const original = allTransactions.find(t => t.id === id);
    if (!original) return false;

    const isExpense = original.amount < 0;
    const finalAmount = isExpense ? -Math.abs(amountVal) : Math.abs(amountVal);

    try {
        if (original.source !== newSource || original.amount !== finalAmount) {

            if (original.amount < 0) { // Era Despesa
                const card = allCards.find(c => c.id === original.source);
                if (card) {
                    const currentBill = card.bill || 0;
                    await updateDoc(doc(db, "cards", original.source), { bill: Math.max(0, currentBill - Math.abs(original.amount)) });
                } else {
                    const acc = allAccounts.find(a => a.id === original.source);
                    if (acc) {
                        await updateDoc(doc(db, "accounts", original.source), { balance: (acc.balance || 0) + Math.abs(original.amount) });
                    }
                }
            } else { // Era Receita
                const acc = allAccounts.find(a => a.id === original.source);
                if (acc) {
                    const currentBalance = acc.balance || 0;
                    await updateDoc(doc(db, "accounts", original.source), { balance: currentBalance - Math.abs(original.amount) });
                } else {
                    const debt = allDebts.find(d => d.id === original.source);
                    if (debt) {
                        await updateDoc(doc(db, "debts", original.source), { totalBalance: (debt.totalBalance || 0) + Math.abs(original.amount) });
                    }
                }
            }

            if (finalAmount < 0) { // Agora é Despesa
                const card = allCards.find(c => c.id === newSource);
                if (card) {
                    let billBase = card.bill || 0;
                    if (original.source === newSource) billBase = Math.max(0, billBase - Math.abs(original.amount));
                    await updateDoc(doc(db, "cards", newSource), { bill: billBase + Math.abs(finalAmount) });
                } else {
                    const acc = allAccounts.find(a => a.id === newSource);
                    if (acc) {
                        let balanceBase = acc.balance || 0;
                        if (original.source === newSource) balanceBase += Math.abs(original.amount);
                        await updateDoc(doc(db, "accounts", newSource), { balance: balanceBase - Math.abs(finalAmount) });
                    }
                }
            } else { // Agora é Receita
                const acc = allAccounts.find(a => a.id === newSource);
                if (acc) {
                    let balanceBase = acc.balance || 0;
                    if (original.source === newSource) balanceBase -= Math.abs(original.amount);
                    await updateDoc(doc(db, "accounts", newSource), { balance: balanceBase + Math.abs(finalAmount) });
                } else {
                    const debt = allDebts.find(d => d.id === newSource);
                    if (debt) {
                        let totalBase = debt.totalBalance || 0;
                        if (original.source === newSource) totalBase += Math.abs(original.amount);
                        await updateDoc(doc(db, "debts", newSource), { totalBalance: Math.max(0, totalBase - Math.abs(finalAmount)) });
                    }
                }
            }
        }

        await updateDoc(doc(db, "transactions", id), {
            desc: desc,
            amount: finalAmount,
            date: dateVal,
            source: newSource
        });

        showToast("Editado e saldos atualizados!");
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

export async function deletarTransacao(id, allTransactions, allCards, allAccounts, allDebts) {
    if (!confirm("Apagar esta movimentação?")) return;

    const trans = allTransactions.find(t => t.id === id);
    if (!trans) return;

    try {
        if (trans.amount < 0) { // Despesa
            if (trans.source && trans.source !== 'wallet') {
                const card = allCards.find(c => c.id === trans.source);
                if (card) {
                    const amountToSubtract = Math.abs(trans.amount);
                    const novaFatura = Math.max(0, (card.bill || 0) - amountToSubtract);
                    await updateDoc(doc(db, "cards", trans.source), { bill: novaFatura });
                    showToast("Fatura do cartão atualizada!");
                } else {
                    const acc = allAccounts.find(a => a.id === trans.source);
                    if (acc) {
                        const novoSaldo = (acc.balance || 0) + Math.abs(trans.amount);
                        await updateDoc(doc(db, "accounts", trans.source), { balance: novoSaldo });
                        showToast(`Saldo da conta ${acc.name} atualizado!`);
                    }
                }
            }
        } else { // Receita
            const acc = allAccounts.find(a => a.id === trans.source);
            if (acc) {
                const novoSaldo = (acc.balance || 0) - Math.abs(trans.amount);
                await updateDoc(doc(db, "accounts", trans.source), { balance: novoSaldo });
                showToast(`Saldo da conta ${acc.name} atualizado!`);
            } else {
                const debt = allDebts.find(d => d.id === trans.source);
                if (debt) {
                    const novoSaldoDev = (debt.totalBalance || 0) + Math.abs(trans.amount);
                    await updateDoc(doc(db, "debts", trans.source), { totalBalance: novoSaldoDev });
                    showToast(`Valor retornado à dívida ${debt.name}!`);
                }
            }
        }

        await deleteDoc(doc(db, "transactions", id));
        showToast("Apagado!");
        return true;
    } catch (e) {
        console.error(e);
        alert("Erro ao excluir");
        return false;
    }
}

export async function processarPagamento(activeWalletId, currentUser, allCards, allAccounts, allDebts, fecharModal) {
    const accountId = document.getElementById('pay-account').value;
    const targetId = document.getElementById('pay-target').value;
    const amountVal = limparValorMoeda(document.getElementById('pay-amount').value);
    const dateVal = document.getElementById('pay-date').value;
    const discountVal = limparValorMoeda(document.getElementById('pay-discount').value || "0");

    if (amountVal <= 0) return alert("Valor inválido");

    try {
        const acc = allAccounts.find(a => a.id === accountId);
        if (!acc) return alert("Conta de origem não encontrada");

        const card = allCards.find(c => c.id === targetId);
        const debt = allDebts.find(d => d.id === targetId);

        let desc = "";
        if (card) desc = `Pagamento Fatura: ${card.name}`;
        else if (debt) desc = `Pagamento Dívida: ${debt.name}`;
        else return alert("Alvo do pagamento não encontrado");

        await addDoc(collection(db, "transactions"), {
            uid: activeWalletId,
            owner: currentUser.uid,
            ownerName: currentUser.displayName || "Usuário",
            desc: desc,
            amount: -Math.abs(amountVal),
            date: dateVal,
            category: 'other',
            source: accountId,
            createdAt: new Date(),
            isPayment: true
        });

        const novoSaldoConta = (acc.balance || 0) - Math.abs(amountVal);
        await updateDoc(doc(db, "accounts", accountId), { balance: novoSaldoConta });

        if (card) {
            const novaFatura = Math.max(0, (card.bill || 0) - Math.abs(amountVal));
            await updateDoc(doc(db, "cards", targetId), { bill: novaFatura });
            showToast(`Fatura do ${card.name} paga!`);
        } else if (debt) {
            const abatimentoTotal = Math.abs(amountVal) + Math.abs(discountVal);
            const novoSaldoDev = Math.max(0, (debt.totalBalance || 0) - abatimentoTotal);
            await updateDoc(doc(db, "debts", targetId), { totalBalance: novoSaldoDev });
            showToast(`Dívida ${debt.name} abatida!`);
        }

        fecharModal();
        return true;
    } catch (e) {
        console.error(e);
        alert("Erro ao processar pagamento");
        return false;
    }
}
