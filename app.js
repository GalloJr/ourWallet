import { db, doc, setDoc } from "./firebase.js";
import { setupAuth, configurarWallet } from "./modules/auth.js";
import { setupCards, salvarCartao, editarCartao, deletarCartao } from "./modules/cards.js";
import { setupTransactions, salvarTransacao, editarTransacao, deletarTransacao, exportarCSV } from "./modules/transactions.js";
import { setupGoals, salvarMeta, deletarMeta } from "./modules/goals.js";
import { setupAccounts, salvarConta, editarConta, deletarConta } from "./modules/accounts.js";
import { updateThemeIcon, toggleLoading, popularSeletorMeses, renderCharts, renderList, renderValues, renderGoals, renderAccounts } from "./modules/ui.js";
import { formatarMoedaInput, limparValorMoeda, formatarData, showToast } from "./modules/utils.js";
import { bankStyles, flagLogos } from "./modules/constants.js";

// Global variables to maintain compatibility with DOM event listeners
window.formatarMoedaInput = formatarMoedaInput;
window.exportarCSV = () => exportarCSV(filteredTransactions, allCards);
window.abrirModalCartao = () => document.getElementById('card-modal').classList.remove('hidden');
window.fecharModalCartao = () => document.getElementById('card-modal').classList.add('hidden');
window.fecharModalEdicaoCartao = () => document.getElementById('edit-card-modal').classList.add('hidden');
window.abrirModalFamilia = () => document.getElementById('family-modal').classList.remove('hidden');
window.fecharModalFamilia = () => document.getElementById('family-modal').classList.add('hidden');
window.fecharModal = () => document.getElementById('edit-modal').classList.add('hidden');
window.abrirModalMeta = () => document.getElementById('goal-modal').classList.remove('hidden');
window.fecharModalMeta = () => document.getElementById('goal-modal').classList.add('hidden');
window.abrirModalConta = () => document.getElementById('account-modal').classList.remove('hidden');
window.fecharModalConta = () => document.getElementById('account-modal').classList.add('hidden');
window.fecharModalEdicaoConta = () => document.getElementById('edit-account-modal').classList.add('hidden');

// Registra o Plugin de Labels do Chart.js
if (window.Chart && window.ChartDataLabels) {
    Chart.register(ChartDataLabels);
}

// Elements
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const loginBtn = document.getElementById('login-btn');
const logoutBtn = document.getElementById('logout-btn');
const userNameDisplay = document.getElementById('user-name');
const form = document.getElementById('transaction-form');
const cardForm = document.getElementById('card-form');
const editCardForm = document.getElementById('edit-card-form');
const goalForm = document.getElementById('goal-form');
const listElement = document.getElementById('transaction-list');
const cardsContainer = document.getElementById('cards-container');
const accountsContainer = document.getElementById('accounts-container');
const goalsContainer = document.getElementById('goals-container');
const accountForm = document.getElementById('account-form');
const editAccountForm = document.getElementById('edit-account-form');
const monthFilter = document.getElementById('month-filter');
const themeToggle = document.getElementById('theme-toggle');
const sourceSelect = document.getElementById('transaction-source');
const installmentsContainer = document.getElementById('installments-container');
const installmentsSelect = document.getElementById('installments');
const searchInput = document.getElementById('search-input');
const historySourceFilter = document.getElementById('history-source-filter');

// State
let currentUser = null;
let activeWalletId = null;
let allTransactions = [];
let filteredTransactions = [];
let allCards = [];
let allAccounts = [];
let allGoals = [];
let unsubscribeTrans = null;
let unsubscribeCards = null;
let unsubscribeAccounts = null;
let unsubscribeGoals = null;

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log("SW reg error:", err));
    });
}

// Initialization
if (window.lucide) lucide.createIcons();
const dateInput = document.getElementById('date');
if (dateInput) dateInput.valueAsDate = new Date();

// Theme Toggle
const userTheme = localStorage.getItem('theme');
const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches;
if (userTheme === 'dark' || (!userTheme && systemTheme)) {
    document.documentElement.classList.add('dark');
    updateThemeIcon(true);
} else {
    updateThemeIcon(false);
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.documentElement.classList.toggle('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateThemeIcon(isDark);
        renderSummary();
    });
}

// Month Selector
popularSeletorMeses(monthFilter, aplicarFiltro);

// History Source Filter
if (historySourceFilter) {
    historySourceFilter.addEventListener('change', aplicarFiltro);
}

// Source Select logic
if (sourceSelect) {
    sourceSelect.addEventListener('change', (e) => {
        // Agora verificamos se o ID selecionado pertence a um cartão
        const isCard = allCards.some(c => c.id === e.target.value);
        if (isCard) {
            installmentsContainer.classList.remove('hidden');
        } else {
            installmentsContainer.classList.add('hidden');
            installmentsSelect.value = "1";
        }
    });
}

// Auth Setup
setupAuth(loginBtn, logoutBtn, appScreen, loginScreen, userNameDisplay, async (user) => {
    if (user) {
        currentUser = user;
        toggleLoading(true);
        activeWalletId = await configurarWallet(user.uid);

        // Unsubscribe from previous listeners
        if (unsubscribeTrans) unsubscribeTrans();
        if (unsubscribeCards) unsubscribeCards();
        if (unsubscribeAccounts) unsubscribeAccounts();
        if (unsubscribeGoals) unsubscribeGoals();

        // Setup Trans and Cards
        unsubscribeTrans = setupTransactions(activeWalletId, (transactions) => {
            allTransactions = transactions;
            aplicarFiltro();
            toggleLoading(false);
        });

        unsubscribeCards = setupCards(activeWalletId, cardsContainer, null, (cards) => {
            allCards = cards;
            popularSelectSources();
            popularHistorySourceFilter();
        });

        unsubscribeAccounts = setupAccounts(activeWalletId, accountsContainer, null, (accounts) => {
            allAccounts = accounts;
            popularSelectSources();
            popularHistorySourceFilter();
        });

        unsubscribeGoals = setupGoals(activeWalletId, goalsContainer);
    } else {
        currentUser = null;
        activeWalletId = null;
        if (unsubscribeTrans) unsubscribeTrans();
        if (unsubscribeCards) unsubscribeCards();
        if (unsubscribeAccounts) unsubscribeAccounts();
        if (unsubscribeGoals) unsubscribeGoals();
        listElement.innerHTML = '';
        cardsContainer.innerHTML = '';
        accountsContainer.innerHTML = '';
        goalsContainer.innerHTML = '';
        renderValues([]);
        toggleLoading(false);
    }
});

// Transaction Form
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const success = await salvarTransacao(activeWalletId, currentUser, allCards, allAccounts, form, installmentsSelect);
    if (success) {
        const dateVal = document.getElementById('date').value;
        if (monthFilter && dateVal && monthFilter.value !== dateVal.slice(0, 7)) {
            monthFilter.value = dateVal.slice(0, 7);
            aplicarFiltro();
        }
        form.reset();
        document.getElementById('date').valueAsDate = new Date();
        installmentsContainer.classList.add('hidden');
    }
});

// Card Form
cardForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarCartao(activeWalletId, cardForm, window.fecharModalCartao);
});

// Goal Form
goalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarMeta(activeWalletId, goalForm, window.fecharModalMeta);
});

// Edit Card Form
editCardForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await editarCartao(editCardForm, window.fecharModalEdicaoCartao);
});

// Account Form
accountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarConta(activeWalletId, accountForm, window.fecharModalConta);
});

// Edit Account Form
editAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await editarConta(editAccountForm, window.fecharModalEdicaoConta);
});

// Edit Transaction Form
document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    await editarTransacao(id, allTransactions, allCards, allAccounts, window.fecharModal);
});

// Family Logic
document.getElementById('family-btn').addEventListener('click', window.abrirModalFamilia);

window.copiarID = () => {
    const id = document.getElementById('my-share-id');
    id.select();
    document.execCommand('copy');
    showToast("ID Copiado!");
}

document.getElementById('link-family-btn').addEventListener('click', async () => {
    const spouseId = document.getElementById('spouse-id').value.trim();
    if (!spouseId || spouseId === currentUser.uid) return alert("ID inválido");
    try {
        await setDoc(doc(db, "users", currentUser.uid), { linkedWalletId: spouseId }, { merge: true });
        showToast("Carteira vinculada!");
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) { alert("Erro ao vincular"); }
});

document.getElementById('unlink-family-btn').addEventListener('click', async () => {
    if (!confirm("Deseja desconectar e voltar para sua carteira individual?")) return;
    try {
        await setDoc(doc(db, "users", currentUser.uid), { linkedWalletId: null }, { merge: true });
        showToast("Desconectado!");
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) { alert("Erro ao desconectar"); }
});

// Helper functions for UI interaction
window.prepararEdicaoCartao = (id) => {
    const card = allCards.find(c => c.id === id);
    if (!card) return;
    document.getElementById('edit-card-modal').classList.remove('hidden');
    document.getElementById('edit-card-id').value = id;
    document.getElementById('edit-card-name').value = card.name;
    document.getElementById('edit-card-bill').value = (card.bill || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById('edit-card-closing').value = card.closingDay || '';
    document.getElementById('edit-card-due').value = card.dueDay || '';
}

window.prepararEdicaoConta = (id) => {
    const acc = allAccounts.find(a => a.id === id);
    if (!acc) return;
    document.getElementById('edit-account-modal').classList.remove('hidden');
    document.getElementById('edit-account-id').value = id;
    document.getElementById('edit-account-name').value = acc.name;
    document.getElementById('edit-account-balance').value = (acc.balance || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
}

window.deletarCartao = deletarCartao;
window.deletarMeta = deletarMeta;

window.prepararEdicao = (id) => {
    const t = allTransactions.find(item => item.id === id);
    if (!t) return;
    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-desc').value = t.desc;
    document.getElementById('edit-amount').value = Math.abs(t.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    document.getElementById('edit-date').value = t.date;

    // Popular e selecionar fonte
    const editSource = document.getElementById('edit-source');
    popularSelectSources(editSource);
    editSource.value = t.source || 'wallet';
}

window.deletarItem = (id) => deletarTransacao(id, allTransactions, allCards, allAccounts);

function popularSelectSources(target = sourceSelect) {
    if (!target) return;
    const currentVal = target.value;
    let options = '';

    // Agrupar Contas
    if (allAccounts.length > 0) {
        options += '<optgroup label="Contas / Carteira">';
        allAccounts.forEach(acc => {
            options += `<option value="${acc.id}">🏦 ${acc.name} (${acc.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</option>`;
        });
        options += '</optgroup>';
    } else {
        options += '<option value="wallet">💵 Carteira (Padrão)</option>';
    }

    // Agrupar Cartões
    if (allCards.length > 0) {
        options += '<optgroup label="Cartões de Crédito">';
        allCards.forEach(card => {
            options += `<option value="${card.id}">💳 ${card.name} (Final ${card.last4})</option>`;
        });
        options += '</optgroup>';
    }

    target.innerHTML = options;
    if (currentVal) target.value = currentVal;
}

function popularHistorySourceFilter() {
    if (!historySourceFilter) return;
    const currentVal = historySourceFilter.value;
    let options = '<option value="">Todas as Fontes</option>';

    // Contas
    if (allAccounts.length > 0) {
        options += '<optgroup label="Contas">';
        allAccounts.forEach(acc => {
            options += `<option value="${acc.id}">🏦 ${acc.name}</option>`;
        });
        options += '</optgroup>';
    }

    // Cartões
    if (allCards.length > 0) {
        options += '<optgroup label="Cartões">';
        allCards.forEach(card => {
            options += `<option value="${card.id}">💳 ${card.name}</option>`;
        });
        options += '</optgroup>';
    }

    historySourceFilter.innerHTML = options;
    if (currentVal) historySourceFilter.value = currentVal;
}

// Filter and Summary logic
function aplicarFiltro() {
    const mesSelecionado = monthFilter.value;
    const busca = searchInput ? searchInput.value.toLowerCase() : "";
    const fonteSelecionada = historySourceFilter ? historySourceFilter.value : "";

    filteredTransactions = allTransactions.filter(t => {
        const matchesMonth = !mesSelecionado || (t.date && t.date.startsWith(mesSelecionado));
        const matchesSearch = !busca || (t.desc && t.desc.toLowerCase().includes(busca));
        const matchesSource = !fonteSelecionada || t.source === fonteSelecionada;
        return matchesMonth && matchesSearch && matchesSource;
    });

    renderSummary();
}

if (searchInput) {
    searchInput.addEventListener('input', aplicarFiltro);
}

function renderSummary() {
    renderList(filteredTransactions, listElement, allCards, allAccounts, formatarData, window.prepararEdicao, window.deletarItem);
    renderValues(filteredTransactions, allTransactions, monthFilter.value);
    renderCharts(filteredTransactions, monthFilter.value);
}