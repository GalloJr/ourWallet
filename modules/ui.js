import { categoryConfig } from './constants.js';

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

export function renderList(transactions, listElement, allCards, formatarData, editCallback, deleteCallback) {
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
        if (t.source && t.source !== 'wallet') fonteIcone = '<i data-lucide="credit-card" class="w-3 h-3 text-indigo-500 ml-1"></i>';

        const row = document.createElement('tr');
        row.className = "hover:bg-gray-50 dark:hover:bg-gray-800 transition border-b border-gray-100 dark:border-gray-700";

        const ownerInitial = t.ownerName ? t.ownerName.charAt(0).toUpperCase() : '?';
        const ownerFirstName = t.ownerName ? t.ownerName.split(' ')[0] : '---';

        row.innerHTML = `
            <td class="p-4"><div class="flex items-center gap-2"><div class="p-2 rounded ${conf.bg} dark:bg-opacity-20 ${conf.color}"><i data-lucide="${conf.icon}" class="w-4 h-4"></i></div><span class="text-sm dark:text-gray-200">${conf.label}</span></div></td>
            <td class="p-4 text-sm dark:text-gray-300 flex items-center">${t.desc} ${fonteIcone}</td>
            <td class="p-4 text-sm text-gray-500">${formatarData(t.date)}</td>
            <td class="p-4">
                <div class="flex items-center gap-2" title="${t.ownerName || 'Responsável desconhecido'}">
                    <div class="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/40 flex items-center justify-center text-[10px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                        ${ownerInitial}
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">${ownerFirstName}</span>
                </div>
            </td>
            <td class="p-4 text-right font-bold text-sm ${isExpense ? 'text-red-500' : 'text-green-500'}">${Math.abs(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
            <td class="p-4 text-center flex justify-center gap-2">
                <button onclick="prepararEdicao('${t.id}')" aria-label="Editar" class="text-gray-400 hover:text-indigo-500 transition cursor-pointer"><i data-lucide="pencil" class="w-4 h-4"></i></button>
                <button onclick="deletarItem('${t.id}')" aria-label="Excluir" class="text-gray-400 hover:text-red-500 transition cursor-pointer"><i data-lucide="trash-2" class="w-4 h-4"></i></button>
            </td>`;
        listElement.appendChild(row);
    });
    if (window.lucide) lucide.createIcons();

    window.prepararEdicao = editCallback;
    window.deletarItem = deleteCallback;
}

export function renderValues(transactions) {
    const amounts = transactions.map(t => t.amount);
    const total = amounts.reduce((acc, item) => acc + item, 0);
    const income = amounts.filter(item => item > 0).reduce((acc, item) => acc + item, 0);
    const expense = amounts.filter(item => item < 0).reduce((acc, item) => acc + item, 0);
    const format = (val) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);

    const displayTotal = document.getElementById('display-total');
    const displayIncome = document.getElementById('display-income');
    const displayExpense = document.getElementById('display-expense');

    if (displayTotal) displayTotal.innerText = format(total);
    if (displayIncome) displayIncome.innerText = format(income);
    if (displayExpense) displayExpense.innerText = format(Math.abs(expense));
}

export function renderCards(cards, cardsContainer, bankStyles, flagLogos, editCardCallback, deleteCardCallback) {
    if (!cardsContainer) return;
    cardsContainer.innerHTML = '';
    cards.forEach(card => {
        const style = bankStyles[card.bank] || bankStyles['blue'];
        const flagUrl = flagLogos[card.flag] || flagLogos['visa'];

        const cardHtml = `
            <div class="min-w-[280px] h-44 ${style.bg} rounded-2xl p-5 text-white shadow-lg flex flex-col justify-between relative overflow-hidden group hover:scale-105 transition duration-300">
                <div class="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white opacity-10"></div>
                <div class="flex justify-between items-start z-10">
                    <span class="font-bold tracking-wider">${card.name}</span>
                    <div class="flex gap-2">
                        <button onclick="prepararEdicaoCartao('${card.id}')" aria-label="Editar" class="opacity-50 hover:opacity-100 transition cursor-pointer"><i data-lucide="pencil" class="w-4 h-4 text-white"></i></button>
                        <i data-lucide="nfc" class="w-6 h-6 opacity-70"></i>
                    </div>
                </div>
                <div class="z-10">
                    <p class="text-xs text-white/80 mb-1">Fatura Atual</p>
                    <p class="text-2xl font-bold">${(card.bill || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
                </div>
                <div class="flex justify-between items-end z-10">
                    <p class="text-sm tracking-widest">**** ${card.last4}</p>
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
}
