import { db, storage, ref, uploadBytes, getDownloadURL, collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, query, where } from '../firebase.js';
import { categoryConfig } from './constants.js';
import { limparValorMoeda, formatarData } from './utils.js';
import { showToast } from './dialogs.js';

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
                isRecurring: repeatMonthly,
                paid: false
            });
        }

        // Verifica se a transação é de data futura ou passada
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const dataTransacao = new Date(dateVal + 'T00:00:00');
        const isDataPassadaOuHoje = dataTransacao <= hoje;

        if (type === 'income') {
            // Receitas sempre atualizam o saldo imediatamente
            const acc = allAccounts?.find(a => a.id === paymentSource);
            if (acc) {
                const novoSaldo = (acc.balance || 0) + Math.abs(amountVal);
                await updateDoc(doc(db, "accounts", paymentSource), { balance: novoSaldo });
                showToast(`Saldo da conta ${acc.name} atualizado!`);
            }
        } else if (type === 'expense') {
            const card = allCards.find(c => c.id === paymentSource);
            if (card) {
                // Cartões sempre atualizam a fatura imediatamente (independente da data)
                const novaFatura = (card.bill || 0) + Math.abs(amountVal);
                await updateDoc(doc(db, "cards", paymentSource), { bill: novaFatura });
                showToast(`Fatura do ${card.name} atualizada!`);
            } else {
                // Para contas bancárias, só desconta se for data passada ou hoje
                // Se for data futura, será descontado na consolidação
                const acc = allAccounts?.find(a => a.id === paymentSource);
                if (acc && isDataPassadaOuHoje) {
                    const novoSaldo = (acc.balance || 0) - Math.abs(amountVal);
                    await updateDoc(doc(db, "accounts", paymentSource), { balance: novoSaldo });
                    showToast(`Saldo da conta ${acc.name} atualizado!`);
                } else {
                    const debt = allDebts?.find(d => d.id === paymentSource);
                    if (debt && isDataPassadaOuHoje) {
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
    const newCategory = document.getElementById('edit-category').value;
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
            category: newCategory,
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

export function exportarCSV(filteredTransactions, allCards, allAccounts) {
    if (!filteredTransactions.length) return showToast("Nada para exportar!");
    
    // Função auxiliar para escapar valores CSV
    const escaparCSV = (valor) => {
        if (valor === null || valor === undefined) return '';
        const str = String(valor);
        // Se contém vírgula, ponto-e-vírgula, aspas ou quebra de linha, envolve em aspas
        if (str.includes(';') || str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // Cabeçalho com BOM para Excel reconhecer UTF-8
    let csv = "\uFEFFData;Descrição;Valor (R$);Tipo;Categoria;Forma de Pagamento;Responsável;Status;Recorrente\n";
    
    filteredTransactions.forEach(t => {
        // Identifica a fonte de pagamento
        let fonte = "Carteira";
        let tipoFonte = "Carteira";
        
        if (t.source && t.source !== 'wallet') {
            // Primeiro verifica se é um cartão
            const card = allCards?.find(c => c.id === t.source);
            if (card) {
                fonte = card.name;
                tipoFonte = "Cartão de Crédito";
            } else {
                // Se não for cartão, verifica se é uma conta
                const account = allAccounts?.find(a => a.id === t.source);
                if (account) {
                    fonte = account.name;
                    tipoFonte = account.bank || "Conta Bancária";
                } else {
                    fonte = "Fonte Removida";
                    tipoFonte = "Desconhecido";
                }
            }
        }
        
        const quem = t.ownerName || "Não identificado";
        const tipo = t.amount >= 0 ? "Receita" : "Despesa";
        
        // Formata o valor como número com vírgula decimal (sem R$)
        const valorNumerico = Math.abs(t.amount).toFixed(2).replace('.', ',');
        
        const categoria = categoryConfig[t.category]?.label || t.category;
        const status = t.paid ? "Pago" : "Pendente";
        const recorrente = t.isRecurring ? "Sim" : "Não";
        
        // Monta a linha do CSV
        csv += `${escaparCSV(formatarData(t.date))};${escaparCSV(t.desc)};${valorNumerico};${escaparCSV(tipo)};${escaparCSV(categoria)};${escaparCSV(tipoFonte + ' - ' + fonte)};${escaparCSV(quem)};${escaparCSV(status)};${escaparCSV(recorrente)}\n`;
    });
    
    // Adiciona linha de resumo
    csv += "\n";
    csv += "RESUMO\n";
    
    const totalReceitas = filteredTransactions
        .filter(t => t.amount >= 0)
        .reduce((sum, t) => sum + t.amount, 0);
    
    const totalDespesas = filteredTransactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
    
    const saldo = totalReceitas - totalDespesas;
    
    csv += `Total de Receitas;${totalReceitas.toFixed(2).replace('.', ',')}\n`;
    csv += `Total de Despesas;${totalDespesas.toFixed(2).replace('.', ',')}\n`;
    csv += `Saldo Período;${saldo.toFixed(2).replace('.', ',')}\n`;
    csv += `Total de Transações;${filteredTransactions.length}\n`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    
    // Nome do arquivo com data e hora
    const agora = new Date();
    const dataHora = agora.toISOString().replace(/[:.]/g, '-').slice(0, -5);
    link.download = `extrato_ourwallet_${dataHora}.csv`;
    
    link.click();
    
    // Libera o objeto URL após um delay
    setTimeout(() => URL.revokeObjectURL(link.href), 100);
    
    showToast(`✅ CSV exportado! ${filteredTransactions.length} transações`);
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
            targetId: targetId,
            createdAt: new Date(),
            isPayment: true,
            paid: true
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

export async function consolidarPagamento(transactionId, allTransactions, allCards, allAccounts) {
    const trans = allTransactions.find(t => t.id === transactionId);
    if (!trans) return alert("Transação não encontrada");

    if (trans.paid) return alert("Transação já foi paga!");

    // Verifica se é uma despesa
    if (trans.amount >= 0) return alert("Apenas despesas podem ser marcadas como pagas!");

    // Verifica se foi paga via cartão de crédito - essas já estão no limite e não devem ser consolidadas
    const card = allCards.find(c => c.id === trans.source);
    if (card) {
        return alert("Transações pagas via cartão de crédito já estão consideradas no limite!");
    }

    try {
        // Marca a transação como paga
        await updateDoc(doc(db, "transactions", transactionId), { paid: true });

        // Abate o valor da conta correspondente
        const acc = allAccounts.find(a => a.id === trans.source);
        if (acc) {
            const novoSaldo = (acc.balance || 0) - Math.abs(trans.amount);
            await updateDoc(doc(db, "accounts", trans.source), { balance: novoSaldo });
            showToast(`Pagamento consolidado! Saldo da conta ${acc.name} atualizado.`);
        } else {
            // Se não tem conta específica, apenas marca como paga
            showToast("Pagamento consolidado!");
        }

        return true;
    } catch (e) {
        console.error(e);
        alert("Erro ao consolidar pagamento");
        return false;
    }
}

export async function consolidarPagamentosEmLote(allTransactions, allCards, allAccounts) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    // Filtra transações futuras não pagas que não são via cartão
    const transacoesParaConsolidar = allTransactions.filter(t => {
        if (t.paid) return false; // Já paga
        if (t.amount >= 0) return false; // Não é despesa
        
        const dataTransacao = new Date(t.date + 'T00:00:00');
        if (dataTransacao > hoje) return false; // Ainda é futura

        // Verifica se não é cartão de crédito
        const card = allCards.find(c => c.id === t.source);
        if (card) return false; // É cartão, não consolida

        return true;
    });

    if (transacoesParaConsolidar.length === 0) {
        return alert("Não há transações pendentes para consolidar!");
    }

    const confirmacao = confirm(`Consolidar ${transacoesParaConsolidar.length} transação(ões) pendente(s)?\n\nIsso irá marcar como pagas e abater os valores das contas correspondentes.`);
    if (!confirmacao) return false;

    try {
        let consolidadas = 0;
        
        for (const trans of transacoesParaConsolidar) {
            // Marca como paga
            await updateDoc(doc(db, "transactions", trans.id), { paid: true });

            // Abate o valor da conta
            const acc = allAccounts.find(a => a.id === trans.source);
            if (acc) {
                const novoSaldo = (acc.balance || 0) - Math.abs(trans.amount);
                await updateDoc(doc(db, "accounts", trans.source), { balance: novoSaldo });
            }
            
            consolidadas++;
        }

        showToast(`${consolidadas} pagamento(s) consolidado(s) com sucesso!`);
        return true;
    } catch (e) {
        console.error(e);
        alert("Erro ao consolidar pagamentos");
        return false;
    }
}
