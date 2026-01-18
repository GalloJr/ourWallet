import { categoryConfig, colorStyles } from './constants.js';

export function updateThemeIcon(isDark) {
    const themeIcon = document.getElementById('theme-icon');
    if (!themeIcon) return;
    themeIcon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    if (window.lucide) lucide.createIcons();
}

export function toggleLoading(show) {
    const loadingScreen = document.getElementById('loading-screen');
    if (!loadingScreen) return;
    if (show) {
        loadingScreen.style.display = 'flex';
        loadingScreen.classList.remove('opacity-0', 'pointer-events-none');
    } else {
        loadingScreen.classList.add('opacity-0', 'pointer-events-none');
        setTimeout(() => loadingScreen.style.display = 'none', 500);
    }
}

export function popularSeletorMeses(monthFilter, callback) {
    if (!monthFilter) return;
    monthFilter.innerHTML = '';
    const hoje = new Date();
    const dataInicio = new Date(hoje.getFullYear() - 1, hoje.getMonth(), 1);
    const nomesMeses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

    for (let i = 0; i < 25; i++) {
        const d = new Date(dataInicio.getFullYear(), dataInicio.getMonth() + i, 1);
        const valor = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const texto = `${nomesMeses[d.getMonth()]} ${d.getFullYear()}`;
        const option = document.createElement('option');
        option.value = valor;
        option.text = texto;
        const mesAtualStr = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
        if (valor === mesAtualStr) option.selected = true;
        monthFilter.appendChild(option);
    }
    monthFilter.addEventListener('change', callback);
}

let donutChartInstance = null;
let lineChartInstance = null;

export function renderCharts(transactions, monthFilterValue) {
    // Verificar se Chart.js está carregado
    if (typeof Chart === 'undefined') {
        console.warn('Chart.js não foi carregado. Gráficos não serão exibidos.');
        const noDataMsg = document.getElementById('no-data-msg');
        if (noDataMsg) {
            noDataMsg.textContent = 'Gráficos temporariamente indisponíveis';
            noDataMsg.classList.remove('hidden');
        }
        return;
    }
    
    const isDark = document.documentElement.classList.contains('dark');
    const textColor = isDark ? '#e5e7eb' : '#374151';
    const gridColor = isDark ? '#374151' : '#e5e7eb';

    const ctxDonut = document.getElementById('expenseChart');
    if (!ctxDonut) return;

    const income = transactions.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0);
    const expense = Math.abs(transactions.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0));

    if (donutChartInstance) donutChartInstance.destroy();

    const noDataMsg = document.getElementById('no-data-msg');
    if (income === 0 && expense === 0) {
        if (noDataMsg) noDataMsg.classList.remove('hidden');
        ctxDonut.style.display = 'none';
    } else {
        if (noDataMsg) noDataMsg.classList.add('hidden');
        ctxDonut.style.display = 'block';
        donutChartInstance = new Chart(ctxDonut, {
            type: 'doughnut',
            data: { labels: ['Entradas', 'Saídas'], datasets: [{ data: [income, expense], backgroundColor: ['#10b981', '#ef4444'], borderWidth: 0, hoverOffset: 4 }] },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { position: 'bottom', labels: { color: textColor } },
                    datalabels: {
                        color: '#fff',
                        font: { weight: 'bold' },
                        formatter: (value, ctx) => {
                            if (value === 0) return '';
                            let sum = 0;
                            let dataArr = ctx.chart.data.datasets[0].data;
                            dataArr.map(data => { sum += data; });
                            let percentage = (value * 100 / sum).toFixed(0) + "%";
                            return percentage;
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    const ctxLine = document.getElementById('lineChart');
    if (lineChartInstance) lineChartInstance.destroy();
    if (ctxLine && monthFilterValue) {
        const expensesByDay = {};
        const [ano, mes] = monthFilterValue.split('-');
        const diasNoMes = new Date(ano, mes, 0).getDate();
        for (let i = 1; i <= diasNoMes; i++) { expensesByDay[i] = 0; }
        transactions.filter(t => t.amount < 0).forEach(t => {
            const dia = parseInt(t.date.split('-')[2]);
            expensesByDay[dia] += Math.abs(t.amount);
        });
        lineChartInstance = new Chart(ctxLine, {
            type: 'line',
            data: {
                labels: Object.keys(expensesByDay),
                datasets: [{ label: 'Gastos Diários', data: Object.values(expensesByDay), borderColor: '#6366f1', backgroundColor: 'rgba(99, 102, 241, 0.1)', tension: 0.4, fill: true, pointRadius: 2 }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: { grid: { color: gridColor }, ticks: { color: textColor, callback: (v) => 'R$' + v } },
                    x: { grid: { display: false }, ticks: { color: textColor } }
                },
                plugins: {
                    legend: { display: false },
                    datalabels: { display: false }
                }
            }
        });
    }
}

export function renderList(transactions, listElement, allCards, allAccounts, allDebts, formatarData, editCallback, deleteCallback) {
    if (!listElement) return;
    listElement.innerHTML = '';
    if (transactions.length === 0) {
        listElement.innerHTML = '<tr><td colspan="6" class="p-8 text-center text-gray-400">Vazio.</td></tr>';
        return;
    }

    transactions.forEach(t => {
        const conf = categoryConfig[t.category] || categoryConfig['other'];
        const isExpense = t.amount < 0;
        let fonteIcone = '';
        let sourceName = 'Carteira';

        if (t.source && t.source !== 'wallet') {
            const card = allCards?.find(c => c.id === t.source);
            if (card) {
                fonteIcone = '<i data-lucide="credit-card" class="w-3 h-3 text-indigo-500 ml-1"></i>';
                sourceName = `Cartão ${card.name}`;
            } else {
                const acc = allAccounts?.find(a => a.id === t.source);
                if (acc) {
                    fonteIcone = '<i data-lucide="building-2" class="w-3 h-3 text-indigo-500 ml-1"></i>';
                    sourceName = `Conta ${acc.name}`;
                } else {
                    const debt = allDebts?.find(d => d.id === t.source);
                    if (debt) {
                        fonteIcone = '<i data-lucide="trending-down" class="w-3 h-3 text-red-500 ml-1"></i>';
                        sourceName = `Dívida ${debt.name}`;
                    }
                }
            }
        }

        let receiptIcon = '';
        if (t.receiptUrl) receiptIcon = `<a href="${t.receiptUrl}" target="_blank" class="text-indigo-500 hover:text-indigo-700 ml-1" title="Ver Comprovante"><i data-lucide="paperclip" class="w-3 h-3"></i></a>`;

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-100 dark:border-gray-700";

        const ownerInitial = t.ownerName ? t.ownerName.charAt(0).toUpperCase() : '?';
        const ownerFirstName = t.ownerName ? t.ownerName.split(' ')[0] : '---';

        // Verifica se é uma despesa não paga e não é via cartão
        const card = allCards?.find(c => c.id === t.source);
        const isUnpaidExpense = t.amount < 0 && !t.paid && !card;
        const isPaid = t.paid || (t.amount < 0 && card); // Cartões são considerados "pagos" automaticamente
        
        const paidBadge = isPaid 
            ? '<span class="text-[9px] bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-1.5 py-0.5 rounded font-bold">PAGO</span>'
            : '<span class="text-[9px] bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded font-bold">PENDENTE</span>';

        const rowClass = isUnpaidExpense 
            ? "hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-100 dark:border-gray-700 bg-yellow-50/30 dark:bg-yellow-900/10"
            : "hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-100 dark:border-gray-700";

        row.className = rowClass;

        row.innerHTML = `
            <td class="p-3"><div class="flex items-center gap-2"><div class="p-2 rounded ${conf.bg} dark:bg-opacity-20 ${conf.color}"><i data-lucide="${conf.icon}" class="w-4 h-4"></i></div><span class="text-xs sm:text-sm dark:text-gray-200 hidden xs:inline">${conf.label}</span></div></td>
            <td class="p-3 text-sm dark:text-gray-300" title="${sourceName}">
                <div class="flex flex-col gap-1">
                    <span class="font-medium line-clamp-1">${t.desc}</span>
                    <div class="flex items-center gap-1 flex-wrap">
                        <span class="text-[10px] text-gray-400 flex items-center gap-1">${sourceName} ${fonteIcone} ${receiptIcon}</span>
                        ${isExpense ? paidBadge : ''}
                    </div>
                </div>
            </td>
            <td class="p-3 text-[10px] sm:text-xs text-gray-500">${formatarData(t.date)}</td>
            <td class="p-3">
                <div class="flex items-center gap-2" title="${t.ownerName || 'Responsável desconhecido'}">
                    <div class="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 shrink-0">
                        ${ownerInitial}
                    </div>
                </div>
            </td>
            <td class="p-3 text-right font-bold text-sm ${isExpense ? 'text-red-500' : 'text-green-500'}">${Math.abs(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td class="p-3 text-center">
                <div class="flex justify-center gap-2">
                    ${isUnpaidExpense ? `<button onclick="consolidarPagamento('${t.id}')" aria-label="Marcar como Pago" title="Marcar como Pago" class="text-gray-400 hover:text-green-500 transition cursor-pointer"><i data-lucide="check-circle" class="w-4 h-4"></i></button>` : ''}
                    <button onclick="prepararEdicao('${t.id}')" aria-label="Editar" class="text-gray-400 hover:text-indigo-500 transition cursor-pointer"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                    <button onclick="deletarItem('${t.id}')" aria-label="Excluir" class="text-gray-400 hover:text-red-500 transition cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
                </div>
            </td>`;
        listElement.appendChild(row);
    });
    if (window.lucide) lucide.createIcons();

    window.prepararEdicao = editCallback;
    window.deletarItem = deleteCallback;
}

export function renderValues(transactions, allTransactions, selectedMonth) {
    const amounts = transactions.map(t => t.amount);
    const total = amounts.reduce((acc, item) => acc + item, 0);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => acc + item, 0);
    const expense = amounts.filter(item => item < 0).reduce((acc, item) => acc + item, 0);
    const format = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const displayTotal = document.getElementById('display-total');
    const displayIncome = document.getElementById('display-income');
    const displayExpense = document.getElementById('display-expense');
    const expenseInsight = document.getElementById('expense-insight');

    if (displayTotal) displayTotal.innerText = format(total);
    if (displayIncome) displayIncome.innerText = format(income);
    if (displayExpense) displayExpense.innerText = format(Math.abs(expense));

    // Lógica de Comparação (Insights)
    if (expenseInsight) {
        if (selectedMonth && allTransactions) {
            const [ano, mes] = selectedMonth.split('-').map(Number);
            const dataAnterior = new Date(ano, mes - 2, 1);
            const mesAnteriorStr = `${dataAnterior.getFullYear()}-${String(dataAnterior.getMonth() + 1).padStart(2, '0')}`;

            const gastosMesAnterior = Math.abs(allTransactions
                .filter(t => t.date && t.date.startsWith(mesAnteriorStr) && t.amount < 0)
                .reduce((acc, t) => acc + t.amount, 0));

            const gastosAtuais = Math.abs(expense);

            if (gastosMesAnterior > 0) {
                const diff = gastosAtuais - gastosMesAnterior;
                const percent = ((diff / gastosMesAnterior) * 100).toFixed(0);
                const color = diff > 0 ? 'text-red-200' : 'text-emerald-200';
                const sign = diff > 0 ? '+' : '';
                expenseInsight.innerText = `${sign}${percent}% em relação ao mês anterior`;
                expenseInsight.className = `text-[10px] ${color} mt-1 font-medium`;
            } else {
                expenseInsight.innerText = "Sem dados do mês anterior";
            }
        } else {
            expenseInsight.innerText = "---";
        }
    }
}

export function renderCards(cards, cardsContainer, colorStyles, flagLogos, editCardCallback, deleteCardCallback) {
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';
    cards.forEach(card => {
        const style = colorStyles[card.color || card.bank] || colorStyles['blue'];
        const flagUrl = flagLogos[card.flag] || flagLogos['visa'];

        const cardHtml = `
            <div class="min-w-[280px] h-44 ${style.bg} rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition duration-300">
                <div class="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white opacity-10"></div>
                <div class="flex justify-between items-start z-10">
                    <div class="flex flex-col">
                        <span class="text-[10px] text-white/70 uppercase font-bold">${card.bank || 'Banco'}</span>
                        <span class="font-bold tracking-wider">${card.name}</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="abrirModalPagamento('${card.id}')" aria-label="Pagar Fatura" class="opacity-50 hover:opacity-100 transition cursor-pointer"><i data-lucide="check-circle" class="w-4 h-4 text-white"></i></button>
                        <button onclick="prepararEdicaoCartao('${card.id}')" aria-label="Editar" class="opacity-50 hover:opacity-100 transition cursor-pointer"><i data-lucide="pencil" class="w-4 h-4 text-white"></i></button>
                        <i data-lucide="nfc" class="w-6 h-6 opacity-70"></i>
                    </div>
                </div>
                <div class="z-10">
                    <p class="text-xs text-white/80 mb-1">Limite Utilizado</p>
                    <p class="text-2xl font-bold">${(card.bill || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div class="flex justify-between items-end z-10">
                    <div>
                        <p class="text-[10px] text-white/70">Fech: ${card.closingDay || '?'}</p>
                        <p class="text-[10px] text-white/70">Venc: ${card.dueDay || '?'}</p>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="deletarCartao('${card.id}')" aria-label="Excluir" class="opacity-50 hover:opacity-100 transition cursor-pointer"><i data-lucide="trash" class="w-4 h-4 text-white"></i></button>
                        <img src="${flagUrl}" class="h-8 bg-white/20 rounded px-1" alt="Bandeira Cartão">
                    </div>
                </div>
            </div>
        `;
        cardsContainer.innerHTML += cardHtml;
    });

    const addBtnHtml = `
        <button onclick="abrirModalCartao()" class="min-w-[100px] h-44 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition" aria-label="Adicionar Cartão">
            <i data-lucide="plus" class="w-8 h-8 mb-2"></i>
            <span class="text-xs font-medium">Novo</span>
        </button>
    `;
    cardsContainer.innerHTML += addBtnHtml;
    if (window.lucide) lucide.createIcons();

    window.prepararEdicaoCartao = editCardCallback;
    window.deletarCartao = deleteCardCallback;
    
    // Sync with section container
    const sectionContainer = document.getElementById('cards-container-section');
    if (sectionContainer) {
        sectionContainer.innerHTML = cardsContainer.innerHTML;
    }
}

export function renderAccounts(accounts, accountsContainer, colorStyles, editAccountCallback, deleteAccountCallback) {
    if (!accountsContainer) return;
    accountsContainer.innerHTML = '';
    accounts.forEach(acc => {
        const style = colorStyles[acc.color || acc.bank] || colorStyles['blue'];

        const accHtml = `
            <div class="min-w-[280px] h-32 ${style.bg} rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition duration-300">
                <div class="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-white opacity-10"></div>
                <div class="flex justify-between items-start z-10">
                    <div class="flex flex-col">
                        <span class="text-[10px] text-white/70 uppercase font-bold">${acc.bank || 'Banco'}</span>
                        <span class="font-bold tracking-wider flex items-center gap-2"><i data-lucide="building-2" class="w-4 h-4"></i> ${acc.name}</span>
                    </div>
                    <div class="flex gap-2">
                        <button onclick="prepararEdicaoConta('${acc.id}')" aria-label="Editar" class="opacity-50 hover:opacity-100 transition cursor-pointer"><i data-lucide="pencil" class="w-4 h-4 text-white"></i></button>
                        <button onclick="deletarConta('${acc.id}')" aria-label="Excluir" class="opacity-50 hover:opacity-100 transition cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4 text-white"></i></button>
                    </div>
                </div>
                <div class="z-10">
                    <p class="text-xs text-white/80 mb-0">Saldo em Conta</p>
                    <p class="text-2xl font-bold">${(acc.balance || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            </div>
        `;
        accountsContainer.innerHTML += accHtml;
    });

    const addBtnHtml = `
        <button onclick="abrirModalConta()" class="min-w-[100px] h-32 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition" aria-label="Adicionar Conta">
            <i data-lucide="plus" class="w-8 h-8 mb-2"></i>
            <span class="text-xs font-medium">Nova</span>
        </button>
    `;
    accountsContainer.innerHTML += addBtnHtml;
    if (window.lucide) lucide.createIcons();

    window.prepararEdicaoConta = editAccountCallback;
    window.deletarConta = deleteAccountCallback;
    
    // Sync with section container
    const sectionContainer = document.getElementById('accounts-container-section');
    if (sectionContainer) {
        sectionContainer.innerHTML = accountsContainer.innerHTML;
    }
}

export function renderDebts(debts, debtsContainer, colorStyles, editDebtCallback, deleteDebtCallback) {
    if (!debtsContainer) return;
    debtsContainer.innerHTML = '';
    debts.forEach(debt => {
        const style = colorStyles[debt.color || debt.bank] || colorStyles['blue'];

        const debtHtml = `
            <div class="min-w-[280px] h-32 ${style.bg} rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition duration-300">
                <div class="absolute -right-4 -top-4 w-16 h-16 rounded-full bg-black opacity-10"></div>
                <div class="flex justify-between items-start z-10">
                    <span class="font-bold tracking-wider flex items-center gap-2"><i data-lucide="trending-down" class="w-4 h-4"></i> ${debt.name}</span>
                    <div class="flex gap-2">
                        <button onclick="abrirModalPagamento('${debt.id}')" aria-label="Pagar Dívida" class="opacity-50 hover:opacity-100 transition cursor-pointer"><i data-lucide="check-circle" class="w-4 h-4 text-white"></i></button>
                        <button onclick="prepararEdicaoDivida('${debt.id}')" aria-label="Editar" class="opacity-50 hover:opacity-100 transition cursor-pointer"><i data-lucide="pencil" class="w-4 h-4 text-white"></i></button>
                        <button onclick="deletarDivida('${debt.id}')" aria-label="Excluir" class="opacity-50 hover:opacity-100 transition cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4 text-white"></i></button>
                    </div>
                </div>
                <div class="z-10">
                    <p class="text-xs text-white/80 mb-0">Saldo Devedor</p>
                    <p class="text-2xl font-bold">${(debt.totalBalance || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
            </div>
        `;
        debtsContainer.innerHTML += debtHtml;
    });

    const addBtnHtml = `
        <button onclick="abrirModalDivida()" class="min-w-[100px] h-32 bg-gray-100 dark:bg-gray-800 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center text-gray-400 cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition" aria-label="Registrar Dívida">
            <i data-lucide="plus" class="w-8 h-8 mb-2"></i>
            <span class="text-xs font-medium">Nova</span>
        </button>
    `;
    debtsContainer.innerHTML += addBtnHtml;
    if (window.lucide) lucide.createIcons();

    window.prepararEdicaoDivida = editDebtCallback;
    window.deletarDivida = deleteDebtCallback;
    
    // Sync with section container
    const sectionContainer = document.getElementById('debts-container-section');
    if (sectionContainer) {
        sectionContainer.innerHTML = debtsContainer.innerHTML;
    }
}

export function renderGoals(goals, goalsContainer, deleteGoalCallback) {
    if (!goalsContainer) return;
    goalsContainer.innerHTML = '';

    if (goals.length === 0) {
        goalsContainer.innerHTML = `
            <div class="col-span-full p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center">
                <p class="text-gray-400 text-sm">Nenhuma meta definida ainda.</p>
            </div>
        `;
        return;
    }

    goals.forEach(goal => {
        const percent = Math.min(100, (goal.current / goal.target) * 100).toFixed(0);
        const format = (val) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

        const goalHtml = `
            <div class="bg-white dark:bg-darkcard p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition">
                <div class="flex justify-between items-start mb-3">
                    <h4 class="font-bold text-gray-900 dark:text-white text-sm">${goal.title}</h4>
                    <button onclick="deletarMeta('${goal.id}')" class="text-gray-300 hover:text-red-500 transition cursor-pointer">
                        <i data-lucide="x" class="w-4 h-4"></i>
                    </button>
                </div>
                <div class="space-y-2">
                    <div class="flex justify-between text-[11px]">
                        <span class="text-gray-500 text-[9px]">${format(goal.current)}</span>
                        <span class="font-bold text-indigo-600">${percent}%</span>
                        <span class="text-gray-500 text-[9px]">${format(goal.target)}</span>
                    </div>
                    <div class="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div class="h-full bg-indigo-500 rounded-full transition-all duration-1000" style="width: ${percent}%"></div>
                    </div>
                </div>
            </div>
        `;
        goalsContainer.innerHTML += goalHtml;
    });

    if (window.lucide) lucide.createIcons();
    window.deletarMeta = deleteGoalCallback;
    
    // Sync with section container
    const sectionContainer = document.getElementById('goals-container-section');
    if (sectionContainer) {
        sectionContainer.innerHTML = goalsContainer.innerHTML;
    }
}

export function renderInvestments(investments, container, editCallback, deleteCallback) {
    if (!container) return;
    container.innerHTML = '';

    if (investments.length === 0) {
        container.innerHTML = `
            <div class="col-span-full p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center bg-gray-50/50 dark:bg-gray-900/20">
                <i data-lucide="trending-up" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2"></i>
                <p class="text-gray-400 text-sm">Nenhum investimento cadastrado</p>
            </div>
        `;
        if (window.lucide) lucide.createIcons();
        return;
    }

    const colorMap = {
        blue: { from: 'blue-500', to: 'blue-700', text: 'blue-100' },
        green: { from: 'emerald-500', to: 'emerald-700', text: 'emerald-100' },
        purple: { from: 'purple-500', to: 'purple-700', text: 'purple-100' },
        yellow: { from: 'yellow-500', to: 'yellow-700', text: 'yellow-100' },
        red: { from: 'red-500', to: 'red-700', text: 'red-100' },
        indigo: { from: 'indigo-500', to: 'indigo-700', text: 'indigo-100' }
    };

    const typeLabels = {
        'renda-fixa': 'Renda Fixa',
        'acoes': 'Ações',
        'fiis': 'FIIs',
        'cripto': 'Cripto',
        'etf': 'ETFs',
        'outros': 'Outros'
    };

    investments.forEach(inv => {
        const colors = colorMap[inv.color] || colorMap.blue;
        const cons = inv.consolidated || {};
        const rendimento = (cons.lucroTotal || 0);
        const rentabilidade = cons.rentabilidade || 0;
        const isPositive = rendimento >= 0;
        const typeLabel = typeLabels[inv.type] || inv.type;
        const hasTransactions = inv.transactions && inv.transactions.length > 0;

        const investmentHtml = `
            <div class="bg-white dark:bg-darkcard rounded-2xl shadow-lg hover:shadow-xl transition duration-300 overflow-hidden border border-gray-200 dark:border-gray-700">
                <!-- Header com gradiente -->
                <div class="bg-gradient-to-br from-${colors.from} to-${colors.to} p-4 text-white">
                    <div class="flex justify-between items-start mb-2">
                        <div class="flex-1">
                            <h3 class="font-bold text-lg truncate">${inv.name}</h3>
                            ${inv.ticker ? `<p class="text-xs opacity-90 font-mono">${inv.ticker}</p>` : ''}
                            <p class="text-xs opacity-80 mt-1">${typeLabel}</p>
                        </div>
                        <div class="flex gap-1">
                            <button onclick="window.atualizarCotacaoAuto('${inv.id}', '${inv.ticker || ''}', '${inv.type}')" 
                                class="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition" 
                                title="Atualizar Cotação">
                                <i data-lucide="refresh-cw" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.abrirModalTransacao('${inv.id}')" 
                                class="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition" 
                                title="Adicionar Operação">
                                <i data-lucide="plus" class="w-4 h-4"></i>
                            </button>
                            <button onclick="window.deletarInvestimento('${inv.id}', '${inv.name.replace(/'/g, "\\'")}')" 
                                class="p-2 bg-white/20 hover:bg-white/30 rounded-lg transition" 
                                title="Deletar">
                                <i data-lucide="trash-2" class="w-4 h-4"></i>
                            </button>
                        </div>
                    </div>
                </div>

                <!-- Stats -->
                <div class="p-4">
                    ${hasTransactions ? `
                        <div class="grid grid-cols-2 gap-3 mb-4">
                            <div>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Quantidade</p>
                                <p class="font-bold text-gray-900 dark:text-white">${cons.quantidade?.toFixed(4) || '0'}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Preço Médio</p>
                                <p class="font-bold text-gray-900 dark:text-white">R$ ${(cons.precoMedio || 0).toFixed(2).replace('.', ',')}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Investido</p>
                                <p class="font-bold text-gray-900 dark:text-white">R$ ${(cons.totalInvestido || 0).toFixed(2).replace('.', ',')}</p>
                            </div>
                            <div>
                                <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Valor Atual</p>
                                <p class="font-bold text-gray-900 dark:text-white">R$ ${(cons.totalAtual || 0).toFixed(2).replace('.', ',')}</p>
                            </div>
                        </div>

                        ${cons.totalDividendos > 0 ? `
                        <div class="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg mb-4">
                            <p class="text-xs text-green-700 dark:text-green-400 mb-1">Dividendos Recebidos</p>
                            <p class="font-bold text-green-700 dark:text-green-400">R$ ${cons.totalDividendos.toFixed(2).replace('.', ',')}</p>
                        </div>
                        ` : ''}

                        <div class="pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div class="flex justify-between items-center mb-3">
                                <div>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Rendimento Total</p>
                                    <p class="font-bold text-xl ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                        ${isPositive ? '+' : ''}R$ ${rendimento.toFixed(2).replace('.', ',')}
                                    </p>
                                </div>
                                <div class="text-right">
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mb-1">Rentabilidade</p>
                                    <p class="font-bold text-xl ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}">
                                        ${isPositive ? '+' : ''}${rentabilidade.toFixed(2)}%
                                    </p>
                                </div>
                            </div>
                            
                            <button onclick="window.mostrarTransacoes('${inv.id}')" 
                                class="w-full py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition flex items-center justify-center gap-2">
                                <i data-lucide="list" class="w-4 h-4"></i>
                                Ver ${inv.transactions.length} transação${inv.transactions.length !== 1 ? 'ões' : ''}
                            </button>
                        </div>
                    ` : `
                        <div class="text-center py-6">
                            <i data-lucide="inbox" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2"></i>
                            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">Nenhuma transação registrada</p>
                            <button onclick="window.abrirModalTransacao('${inv.id}')" 
                                class="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-bold hover:bg-indigo-700 transition">
                                Adicionar Primeira Operação
                            </button>
                        </div>
                    `}
                </div>
            </div>
        `;

        container.insertAdjacentHTML('beforeend', investmentHtml);
    });

    if (window.lucide) lucide.createIcons();
}
