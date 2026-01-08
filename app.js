import { db, doc, setDoc } from "./firebase.js";
import { setupAuth, configurarWallet } from "./modules/auth.js";
import { setupCards, salvarCartao, editarCartao, deletarCartao } from "./modules/cards.js";
import { setupTransactions, salvarTransacao, editarTransacao, exportarCSV } from "./modules/transactions.js";
import { setupGoals, salvarMeta } from "./modules/goals.js";
import { updateThemeIcon, toggleLoading, popularSeletorMeses, renderCharts, renderList, renderValues, renderGoals } from "./modules/ui.js";
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
const goalsContainer = document.getElementById('goals-container');
const monthFilter = document.getElementById('month-filter');
const themeToggle = document.getElementById('theme-toggle');
const sourceSelect = document.getElementById('transaction-source');
const installmentsContainer = document.getElementById('installments-container');
const installmentsSelect = document.getElementById('installments');
const searchInput = document.getElementById('search-input'); // We'll add this to index.html

// State
let currentUser = null;
let activeWalletId = null;
let allTransactions = [];
let filteredTransactions = [];
let allCards = [];
let allGoals = [];
let unsubscribeTrans = null;
let unsubscribeCards = null;
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

// Source Select logic
if (sourceSelect) {
    sourceSelect.addEventListener('change', (e) => {
        if (e.target.value !== 'wallet') {
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
        if (unsubscribeGoals) unsubscribeGoals();

        // Setup Trans and Cards
        unsubscribeTrans = setupTransactions(activeWalletId, (transactions) => {
            allTransactions = transactions;
            aplicarFiltro();
            toggleLoading(false);
        });

        unsubscribeCards = setupCards(activeWalletId, cardsContainer, sourceSelect, (cards) => {
            allCards = cards;
        });

        unsubscribeGoals = setupGoals(activeWalletId, goalsContainer);
    } else {
        currentUser = null;
        activeWalletId = null;
        if (unsubscribeTrans) unsubscribeTrans();
        if (unsubscribeCards) unsubscribeCards();
        if (unsubscribeGoals) unsubscribeGoals();
        listElement.innerHTML = '';
        cardsContainer.innerHTML = '';
        goalsContainer.innerHTML = '';
        renderValues([]);
        toggleLoading(false);
    }
});

// Transaction Form
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!currentUser) return;

    const success = await salvarTransacao(activeWalletId, currentUser, allCards, form, installmentsSelect);
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

// Edit Transaction Form
document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    await editarTransacao(id, allTransactions, window.fecharModal);
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

window.deletarCartao = deletarCartao;

window.prepararEdicao = (id) => {
    const t = allTransactions.find(item => item.id === id);
    if (!t) return;
    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-desc').value = t.desc;
    document.getElementById('edit-amount').value = Math.abs(t.amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
    document.getElementById('edit-date').value = t.date;
}

window.deletarItem = async (id) => {
    if (confirm("Apagar?")) {
        try {
            await deleteDoc(doc(db, "transactions", id));
            showToast("Apagado!");
        } catch (e) { console.error(e); }
    }
};

// Filter and Summary logic
function aplicarFiltro() {
    const mesSelecionado = monthFilter.value;
    const busca = searchInput ? searchInput.value.toLowerCase() : "";

    filteredTransactions = allTransactions.filter(t => {
        const matchesMonth = !mesSelecionado || (t.date && t.date.startsWith(mesSelecionado));
        const matchesSearch = !busca || (t.desc && t.desc.toLowerCase().includes(busca));
        return matchesMonth && matchesSearch;
    });

    renderSummary();
}

if (searchInput) {
    searchInput.addEventListener('input', aplicarFiltro);
}

function renderSummary() {
    renderList(filteredTransactions, listElement, allCards, formatarData, window.prepararEdicao, window.deletarItem);
    renderValues(filteredTransactions, allTransactions, monthFilter.value);
    renderCharts(filteredTransactions, monthFilter.value);
}