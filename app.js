import { db, doc, setDoc } from "./firebase.js";
import { setupAuth, configurarWallet } from "./modules/auth.js";
import { setupCards, salvarCartao, editarCartao, deletarCartao } from "./modules/cards.js";
import { setupTransactions, salvarTransacao, editarTransacao, deletarTransacao, exportarCSV, consolidarPagamento, consolidarPagamentosEmLote } from "./modules/transactions.js";
import { setupGoals, salvarMeta, deletarMeta } from "./modules/goals.js";
import { setupAccounts, salvarConta, editarConta } from "./modules/accounts.js";
import { setupDebts, salvarDivida, editarDivida } from "./modules/debts.js";
import { setupInvestments, salvarInvestimento, editarInvestimento, deletarInvestimento, popularFormularioEdicao, calcularEstatisticasInvestimentos, adicionarTransacao, deletarTransacaoInvestimento, atualizarCotacaoAutomatica } from "./modules/investments.js";
import { updateThemeIcon, toggleLoading, popularSeletorMeses, renderCharts, renderList, renderValues, renderCards, renderAccounts, renderDebts, renderGoals, renderInvestments } from "./modules/ui.js";
import { formatarMoedaInput, formatarData, limparValorMoeda } from "./modules/utils.js";
import { processarPagamento } from "./modules/transactions.js";
import { gerarRelatorioMensalIA } from "./modules/reports.js";
import { collection, addDoc, onSnapshot, query, where, updateDoc } from "./firebase.js";
import { showToast, showDialog } from "./modules/dialogs.js";
import { initErrorLogger } from "./modules/errorLogger.js";
import { setupNavigation, navigateToSection, renderSectionContent } from "./modules/navigation.js";

// Global variables to maintain compatibility with DOM event listeners
window.formatarMoedaInput = formatarMoedaInput;
window.exportarCSV = () => exportarCSV(appState.filteredTrans, appState.cards, appState.accounts);
window.gerarRelatorio = () => gerarRelatorio();
window.consolidarPagamento = (id) => consolidarPagamento(id, appState.transactions, appState.cards, appState.accounts);
window.consolidarPagamentosEmLote = () => consolidarPagamentosEmLote(appState.transactions, appState.cards, appState.accounts);
window.abrirModalCartao = () => document.getElementById('card-modal').classList.remove('hidden');
window.fecharModalCartao = () => document.getElementById('card-modal').classList.add('hidden');
window.fecharModalEdicaoCartao = () => document.getElementById('edit-card-modal').classList.add('hidden');
window.abrirModalFamilia = () => document.getElementById('family-modal').classList.remove('hidden');
window.fecharModalFamilia = () => document.getElementById('family-modal').classList.add('hidden');
window.fecharModal = () => document.getElementById('edit-modal').classList.add('hidden');
window.abrirModalMeta = () => document.getElementById('goal-modal').classList.remove('hidden');
window.fecharModalMeta = () => document.getElementById('goal-modal').classList.add('hidden');
window.abrirModalInvestimento = () => document.getElementById('investimento-modal').classList.remove('hidden');
window.fecharModalInvestimento = () => document.getElementById('investimento-modal').classList.add('hidden');
window.abrirEditModalInvestimento = () => document.getElementById('edit-investimento-modal').classList.remove('hidden');
window.fecharEditModalInvestimento = () => document.getElementById('edit-investimento-modal').classList.add('hidden');
window.navigateToSection = (section) => navigateToSection(section);
window.abrirModalConta = () => document.getElementById('account-modal').classList.remove('hidden');
window.fecharModalConta = () => document.getElementById('account-modal').classList.add('hidden');
window.fecharModalEdicaoConta = () => document.getElementById('edit-account-modal').classList.add('hidden');
window.abrirModalDivida = () => document.getElementById('debt-modal').classList.remove('hidden');
window.fecharModalDivida = () => document.getElementById('debt-modal').classList.add('hidden');
window.fecharModalEdicaoDivida = () => document.getElementById('edit-debt-modal').classList.add('hidden');
window.abrirModalDespesaFixa = () => {
    popularSelectDespesaFixa();
    document.getElementById('fixed-expense-modal').classList.remove('hidden');
    // Define mês atual como padrão
    const hoje = new Date();
    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('fixed-expense-start-month').value = mesAtual;
};
window.fecharModalDespesaFixa = () => {
    document.getElementById('fixed-expense-modal').classList.add('hidden');
    document.getElementById('fixed-expense-form').reset();
};

window.abrirModalPagamento = (targetId = null) => {
    const modal = document.getElementById('payment-modal');
    modal.classList.remove('hidden');
    popularSelectPagamento();
    if (targetId) document.getElementById('pay-target').value = targetId;
    document.getElementById('pay-date').valueAsDate = new Date();
    atualizarVisibilidadeDesconto();
};
window.fecharModalPagamento = () => {
    document.getElementById('payment-modal').classList.add('hidden');
    document.getElementById('payment-form').reset();
};

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
const paymentStatusFilter = document.getElementById('payment-status-filter');
const paymentForm = document.getElementById('payment-form');

// Encapsulated State
const appState = {
    user: null,
    walletId: null,
    transactions: [],
    filteredTrans: [],
    cards: [],
    investments: [],
    accounts: [],
    debts: [],
    goals: [],
    access: 0, // 0: Free, 1: Premium
    isAdmin: false,
    _u: { t: null, c: null, a: null, d: null, g: null, i: null } // Unsubscribers (i = investments)
};

// Register Service Worker and Handle PWA Install
let deferredPrompt;
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then(reg => {
            // Check for updates periodically or on reload
            reg.addEventListener('updatefound', () => {
                const newWorker = reg.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        // New version available! 
                        showUpdateNotification();
                    }
                });
            });
        }).catch(err => console.log("SW reg error:", err));
    });

    // Helper to show update toast
    function showUpdateNotification() {
        const toast = document.createElement('div');
        toast.className = 'fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-indigo-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between z-50 animate-bounce cursor-pointer hover:bg-indigo-700 transition';
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <i data-lucide="refresh-cw" class="w-5 h-5"></i>
                <div class="text-sm">
                    <p class="font-bold">Nova versão disponível!</p>
                    <p class="text-[10px] opacity-80">Clique aqui para atualizar agora.</p>
                </div>
            </div>
            <i data-lucide="chevron-right" class="w-4 h-4"></i>
        `;
        toast.onclick = () => window.location.reload();
        document.body.appendChild(toast);
        if (window.lucide) lucide.createIcons();
    }

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevenir o mini-infobar padrão do navegador
        e.preventDefault();
        deferredPrompt = e;
        // Mostrar o botão de instalação customizado
        const installBtn = document.getElementById('install-pwa');
        if (installBtn) installBtn.classList.remove('hidden');
    });

    document.getElementById('install-pwa')?.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            console.log('User accepted the PWA install');
        }
        deferredPrompt = null;
        document.getElementById('install-pwa').classList.add('hidden');
    });
}

// initialization
if (window.lucide) lucide.createIcons();

function initDragToScroll(containerId) {
    const el = document.getElementById(containerId);
    if (!el) return;

    let isDown = false;
    let startX;
    let scrollLeft;

    el.addEventListener('mousedown', (e) => {
        isDown = true;
        startX = e.pageX - el.offsetLeft;
        scrollLeft = el.scrollLeft;
        el.style.cursor = 'grabbing';
    });

    el.addEventListener('mouseleave', () => {
        isDown = false;
        el.style.cursor = 'grab';
    });

    el.addEventListener('mouseup', () => {
        isDown = false;
        el.style.cursor = 'grab';
    });

    el.addEventListener('mousemove', (e) => {
        if (!isDown) return;
        e.preventDefault();
        const x = e.pageX - el.offsetLeft;
        const walk = (x - startX) * 2;
        el.scrollLeft = scrollLeft - walk;
    });
}

const dateInput = document.getElementById('date');
if (dateInput) dateInput.valueAsDate = new Date();

// Ativando o arraste nos containers
initDragToScroll('accounts-container');
initDragToScroll('cards-container');
initDragToScroll('debts-container');

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

// Payment Status Filter
if (paymentStatusFilter) {
    paymentStatusFilter.addEventListener('change', aplicarFiltro);
}

// Source Select logic
if (sourceSelect) {
    sourceSelect.addEventListener('change', (e) => {
        // Agora verificamos se o ID selecionado pertence a um cartão
        const isCard = appState.cards.some(c => c.id === e.target.value);
        if (isCard) {
            installmentsContainer.classList.remove('hidden');
        } else {
            installmentsContainer.classList.add('hidden');
            installmentsSelect.value = "1";
        }
    });
}

// Inicializar Error Logger
initErrorLogger();

// Auth Setup
setupAuth(loginBtn, logoutBtn, appScreen, loginScreen, userNameDisplay, async (user) => {
    if (user) {
        appState.user = user;
        toggleLoading(true);
        const config = await configurarWallet(user.uid);
        appState.walletId = config.activeWalletId;
        appState.isAdmin = config.isAdmin;
        appState.access = config.isPremium ? 1 : 0;

        // Atualizar badge de trial inicial se necessário
        const trialBadge = document.getElementById('trial-badge');
        if (config.trialDays > 0) {
            document.getElementById('trial-days').textContent = config.trialDays;
            trialBadge?.classList.remove('hidden');
        } else {
            trialBadge?.classList.add('hidden');
        }

        atualizarUIPremium();

        // Listener para o status Premium/Admin do usuário logado
        onSnapshot(doc(db, "users", user.uid), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                appState.isAdmin = !!data.isAdmin;
                // O access (Premium) continua vindo do DONO da carteira ativa
                // mas se o usuário for Admin, ele tem acesso total
                atualizarUIPremium();

                const adminBtn = document.getElementById('admin-btn');
                if (appState.isAdmin && adminBtn && adminBtn.classList.contains('hidden')) {
                    carregarPedidosAdmin();
                }
            }
        }, (error) => {
            console.warn("Erro no snapshot do usuário:", error.message);
        });

        // Listener para o status Premium do DONO da carteira ativa
        onSnapshot(doc(db, "users", appState.walletId), (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                const now = new Date();
                const trialUntil = data.trialUntil ? data.trialUntil.toDate() : null;
                const isPremiumByTrial = trialUntil && trialUntil > now;

                appState.access = (!!data.isPremium || isPremiumByTrial) ? 1 : 0;

                // Atualizar badge de trial
                const trialBadge = document.getElementById('trial-badge');
                if (isPremiumByTrial && !data.isPremium) {
                    const diffTime = Math.abs(trialUntil - now);
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                    const daysSpan = document.getElementById('trial-days');
                    if (daysSpan) daysSpan.textContent = diffDays;
                    trialBadge?.classList.remove('hidden');
                } else {
                    trialBadge?.classList.add('hidden');
                }

                atualizarUIPremium();
            }
        }, (error) => {
            console.warn("Snapshot listener error (common during login):", error.message);
        });

        // Sempre tenta carregar admin silenciosamente. 
        // Se o Firebase permitir a leitura, o botão aparecerá dentro da função.
        carregarPedidosAdmin();

        // Unsubscribe from previous listeners
        Object.values(appState._u).forEach(unsub => unsub && unsub());

        // Setup Trans and Cards
        appState._u.t = setupTransactions(appState.walletId, (transactions) => {
            appState.transactions = transactions;
            aplicarFiltro();
            toggleLoading(false);
        });

        appState._u.c = setupCards(appState.walletId, cardsContainer, null, (cards) => {
            appState.cards = cards;
            popularSelectSources();
            popularHistorySourceFilter();
        });

        appState._u.a = setupAccounts(appState.walletId, accountsContainer, null, (accounts) => {
            appState.accounts = accounts;
            popularSelectSources();
            popularHistorySourceFilter();
        });

        appState._u.d = setupDebts(appState.walletId, document.getElementById('debts-container'), (debts) => {
            appState.debts = debts;
            window.allDebts = debts; // Para ui.js acessar
            popularSelectSources();
            popularHistorySourceFilter();
        });

        appState._u.i = setupInvestments(appState.walletId, document.getElementById('investments-container-section'), (investments) => {
            appState.investments = investments;
            atualizarEstatisticasInvestimentos(investments);
            
            // Atualizar também o widget do dashboard
            const investCont = document.getElementById('investments-container');
            if (investCont) {
                renderInvestments(investments, investCont, editarInvestimento, deletarInvestimento);
            }
        });

        appState._u.g = setupGoals(appState.walletId, goalsContainer);

        // Setup navigation
        setupNavigation();
        
        // Listen for section changes and update content
        window.addEventListener('section-changed', (e) => {
            const section = e.detail.section;
            renderSectionContent(section, {
                transactions: appState.transactions,
                cards: appState.cards,
                accounts: appState.accounts,
                debts: appState.debts,
                goals: appState.goals
            });
        });

        // Gerar link de indicação
        const refLinkInput = document.getElementById('referral-link');
        if (refLinkInput) {
            refLinkInput.value = `${window.location.origin}?ref=${user.uid}`;
        }
    } else {
        appState.user = null;
        appState.walletId = null;
        Object.values(appState._u).forEach(unsub => unsub && unsub());
        listElement.innerHTML = '';
        cardsContainer.innerHTML = '';
        accountsContainer.innerHTML = '';
        document.getElementById('debts-container').innerHTML = '';
        goalsContainer.innerHTML = '';
        renderValues([]);
        toggleLoading(false);
    }
});

// Transaction Form
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!appState.user) return;

    const success = await salvarTransacao(appState.walletId, appState.user, appState.cards, appState.accounts, appState.debts, form, installmentsSelect);
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
    if (appState.access === 0 && appState.cards.length >= 1) {
        return window.abrirModalPremium();
    }
    await salvarCartao(appState.walletId, cardForm, window.fecharModalCartao);
});

// Goal Form
goalForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarMeta(appState.walletId, goalForm, window.fecharModalMeta);
});

// Investment Form
const investimentoForm = document.getElementById('investimento-form');
if (investimentoForm) {
    investimentoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (appState.access === 0) {
            return window.abrirModalPremium();
        }
        await salvarInvestimento(appState.walletId, investimentoForm, window.fecharModalInvestimento);
    });
}

// Transaction Form
const transacaoForm = document.getElementById('transacao-form');
let tipoTransacaoSelecionado = null;

window.selecionarTipoTransacao = (tipo) => {
    tipoTransacaoSelecionado = tipo;
    
    // Atualiza visual dos botões
    ['saldo-inicial', 'compra', 'venda', 'dividendo'].forEach(t => {
        const btn = document.getElementById(`tipo-${t}`);
        if (btn) {
            if (t === tipo) {
                btn.classList.add('border-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/20');
            } else {
                btn.classList.remove('border-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/20');
            }
        }
    });
    
    // Mostra/esconde campos apropriados
    const compraVendaFields = document.getElementById('trans-compra-venda-fields');
    const dividendoFields = document.getElementById('trans-dividendo-fields');
    
    if (tipo === 'dividendo') {
        compraVendaFields.classList.add('hidden');
        dividendoFields.classList.remove('hidden');
    } else {
        compraVendaFields.classList.remove('hidden');
        dividendoFields.classList.add('hidden');
    }
};

// Atualizar total da transação
if (transacaoForm) {
    const quantityInput = document.getElementById('trans-quantity');
    const priceInput = document.getElementById('trans-price');
    const totalDisplay = document.getElementById('trans-total');
    
    const atualizarTotal = () => {
        const quantity = parseFloat(quantityInput.value) || 0;
        const price = limparValorMoeda(priceInput.value);
        const total = quantity * price;
        totalDisplay.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    };
    
    quantityInput?.addEventListener('input', atualizarTotal);
    priceInput?.addEventListener('input', atualizarTotal);
    
    transacaoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        if (!tipoTransacaoSelecionado) {
            showToast("⚠️ Selecione o tipo de operação", "error");
            return;
        }
        
        const investmentId = document.getElementById('trans-investment-id').value;
        const date = document.getElementById('trans-date').value;
        const notes = document.getElementById('trans-notes').value;
        
        let transactionData = {
            type: tipoTransacaoSelecionado,
            date: new Date(date + 'T12:00:00'),
            notes: notes || ''
        };
        
        if (tipoTransacaoSelecionado === 'dividendo') {
            const amount = limparValorMoeda(document.getElementById('trans-dividendo-amount').value);
            if (amount <= 0) {
                showToast("⚠️ Digite o valor do dividendo", "error");
                return;
            }
            transactionData.amount = amount;
        } else {
            const quantity = parseFloat(document.getElementById('trans-quantity').value);
            const price = limparValorMoeda(document.getElementById('trans-price').value);
            
            if (!quantity || quantity <= 0) {
                showToast("⚠️ Digite a quantidade", "error");
                return;
            }
            if (!price || price <= 0) {
                showToast("⚠️ Digite o preço unitário", "error");
                return;
            }
            
            transactionData.quantity = quantity;
            transactionData.price = price;
            transactionData.currentPrice = price; // Preço atual é o da transação por padrão
        }
        
        const success = await adicionarTransacao(investmentId, transactionData);
        if (success) {
            window.fecharModalTransacao();
        }
    });
}

window.abrirModalTransacao = (investmentId) => {
    document.getElementById('trans-investment-id').value = investmentId;
    document.getElementById('trans-date').valueAsDate = new Date();
    tipoTransacaoSelecionado = null;
    
    // Reset visual
    ['compra', 'venda', 'dividendo'].forEach(t => {
        const btn = document.getElementById(`tipo-${t}`);
        btn?.classList.remove('border-indigo-500', 'bg-indigo-50', 'dark:bg-indigo-900/20');
    });
    
    // Mostra campos de compra/venda por padrão
    document.getElementById('trans-compra-venda-fields').classList.remove('hidden');
    document.getElementById('trans-dividendo-fields').classList.add('hidden');
    
    document.getElementById('transacao-modal').classList.remove('hidden');
    if (window.lucide) lucide.createIcons();
};

window.fecharModalTransacao = () => {
    document.getElementById('transacao-modal').classList.add('hidden');
    document.getElementById('transacao-form').reset();
    tipoTransacaoSelecionado = null;
};

window.mostrarTransacoes = (investmentId) => {
    const investment = appState.investments.find(inv => inv.id === investmentId);
    if (!investment || !investment.transactions) return;
    
    const transactionsHtml = investment.transactions.map(t => {
        const typeIcons = {
            'compra': { icon: 'arrow-down-circle', color: 'text-green-600' },
            'venda': { icon: 'arrow-up-circle', color: 'text-red-600' },
            'dividendo': { icon: 'dollar-sign', color: 'text-blue-600' }
        };
        
        const typeInfo = typeIcons[t.type] || typeIcons.compra;
        const dateObj = t.date.toDate ? t.date.toDate() : new Date(t.date);
        const dateStr = dateObj.toLocaleDateString('pt-BR');
        
        let detailsHtml = '';
        if (t.type === 'dividendo') {
            detailsHtml = `<p class="text-sm">Valor: <strong>R$ ${t.amount.toFixed(2).replace('.', ',')}</strong></p>`;
        } else {
            const total = t.quantity * t.price;
            detailsHtml = `
                <p class="text-sm">Qtd: <strong>${t.quantity.toFixed(4)}</strong></p>
                <p class="text-sm">Preço: <strong>R$ ${t.price.toFixed(2).replace('.', ',')}</strong></p>
                <p class="text-sm">Total: <strong>R$ ${total.toFixed(2).replace('.', ',')}</strong></p>
            `;
        }
        
        return `
            <div class="border-b border-gray-200 dark:border-gray-700 pb-3 mb-3">
                <div class="flex items-center gap-2 mb-2">
                    <i data-lucide="${typeInfo.icon}" class="w-4 h-4 ${typeInfo.color}"></i>
                    <strong class="capitalize">${t.type}</strong>
                    <span class="text-xs text-gray-500 ml-auto">${dateStr}</span>
                </div>
                ${detailsHtml}
                ${t.notes ? `<p class="text-xs text-gray-500 mt-1">${t.notes}</p>` : ''}
            </div>
        `;
    }).join('');
    
    showDialog(`
        <h3 class="font-bold text-lg mb-4">${investment.name} - Histórico</h3>
        <div class="max-h-96 overflow-y-auto">
            ${transactionsHtml}
        </div>
    `, 'info');
    
    if (window.lucide) lucide.createIcons();
};

// Expor função deletarInvestimento
window.deletarInvestimento = deletarInvestimento;
window.atualizarCotacaoAuto = atualizarCotacaoAutomatica;

// Edit Investment Form
const editInvestimentoForm = document.getElementById('edit-investimento-form');
if (editInvestimentoForm) {
    editInvestimentoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await editarInvestimento(editInvestimentoForm, window.fecharEditModalInvestimento);
    });
}

// Investment edit handler
window.editarInvHandler = (id) => {
    const investment = appState.investments.find(inv => inv.id === id);
    if (investment) {
        popularFormularioEdicao(investment);
        window.abrirEditModalInvestimento();
    }
};

// Edit Card Form
editCardForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await editarCartao(editCardForm, window.fecharModalEdicaoCartao);
});

// Account Form
accountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (appState.access === 0 && appState.accounts.length >= 2) {
        return window.abrirModalPremium();
    }
    await salvarConta(appState.walletId, accountForm, window.fecharModalConta);
});

// Edit Account Form
editAccountForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    await editarConta(editAccountForm, window.fecharModalEdicaoConta);
});

// Debt Form
document.getElementById('debt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await salvarDivida(appState.walletId, e.target, window.fecharModalDivida);
});

// Edit Debt Form
document.getElementById('edit-debt-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await editarDivida(e.target, window.fecharModalEdicaoDivida);
});

// Fixed Expense Form
document.getElementById('fixed-expense-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    await criarDespesaFixa();
});

// Edit Transaction Form
document.getElementById('edit-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-id').value;
    await editarTransacao(id, appState.transactions, appState.cards, appState.accounts, appState.debts, window.fecharModal);
});

// Payment Form
if (paymentForm) {
    paymentForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await processarPagamento(appState.walletId, appState.user, appState.cards, appState.accounts, appState.debts, window.fecharModalPagamento);
    });
}

function atualizarVisibilidadeDesconto() {
    const targetSelect = document.getElementById('pay-target');
    const discountContainer = document.getElementById('pay-discount-container');
    if (!targetSelect || !discountContainer) return;

    const selectedId = targetSelect.value;
    const isDebt = appState.debts.some(d => d.id === selectedId);

    if (isDebt) {
        discountContainer.classList.remove('hidden');
    } else {
        discountContainer.classList.add('hidden');
        document.getElementById('pay-discount').value = "";
    }
}

document.getElementById('pay-target')?.addEventListener('change', atualizarVisibilidadeDesconto);

function popularSelectPagamento() {
    const payAccount = document.getElementById('pay-account');
    const payTarget = document.getElementById('pay-target');
    if (!payAccount || !payTarget) return;

    let accOptions = '';
    appState.accounts.forEach(acc => {
        accOptions += `<option value="${acc.id}">🏦 ${acc.name} (${acc.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</option>`;
    });
    payAccount.innerHTML = accOptions;

    let targetOptions = '';
    if (appState.cards.length > 0) {
        targetOptions += '<optgroup label="Cartões de Crédito">';
        appState.cards.forEach(card => {
            targetOptions += `<option value="${card.id}">💳 ${card.name} (Fatura: ${(card.bill || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</option>`;
        });
        targetOptions += '</optgroup>';
    }
    if (appState.debts.length > 0) {
        targetOptions += '<optgroup label="Dívidas">';
        appState.debts.forEach(debt => {
            targetOptions += `<option value="${debt.id}">📉 ${debt.name} (Saldo: ${(debt.totalBalance || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</option>`;
        });
        targetOptions += '</optgroup>';
    }
    payTarget.innerHTML = targetOptions;
}

function popularSelectDespesaFixa() {
    const accountSelect = document.getElementById('fixed-expense-account');
    if (!accountSelect) return;
    
    let options = '';
    appState.accounts.forEach(acc => {
        options += `<option value="${acc.id}">🏦 ${acc.name}</option>`;
    });
    accountSelect.innerHTML = options;
}

async function criarDespesaFixa() {
    // Prevenir execução múltipla
    const submitBtn = document.getElementById('fixed-expense-submit-btn');
    if (submitBtn.disabled) return;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Criando...';
    
    const desc = document.getElementById('fixed-expense-desc').value;
    const accountId = document.getElementById('fixed-expense-account').value;
    const amountInput = document.getElementById('fixed-expense-amount').value;
    const dueDay = parseInt(document.getElementById('fixed-expense-due-day').value);
    const numMonths = parseInt(document.getElementById('fixed-expense-months').value);
    const startMonth = document.getElementById('fixed-expense-start-month').value; // formato: YYYY-MM
    
    // Converter valor usando a função limparValorMoeda
    const amountPerMonth = limparValorMoeda(amountInput);
    if (isNaN(amountPerMonth) || amountPerMonth <= 0) {
        alert('Valor inválido');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar Despesa Fixa';
        return;
    }
    
    try {
        const [year, month] = startMonth.split('-').map(Number);
        
        for (let i = 0; i < numMonths; i++) {
            const currentDate = new Date(year, month - 1 + i, dueDay);
            const dateStr = currentDate.toISOString().split('T')[0];
            
            const description = numMonths > 1 
                ? `${desc} (${i + 1}/${numMonths})`
                : desc;
            
            await addDoc(collection(db, "transactions"), {
                uid: appState.walletId,
                owner: appState.user.uid,
                ownerName: appState.user.displayName || "Usuário",
                desc: description,
                description: description,
                amount: -Math.abs(amountPerMonth),
                date: dateStr,
                category: 'other',
                source: accountId,
                paid: false,
                createdAt: new Date(),
                isFixedExpense: true
            });
        }
        
        showToast(`${numMonths} despesa(s) fixa(s) criada(s)!`);
        window.fecharModalDespesaFixa();
    } catch (e) {
        console.error(e);
        alert('Erro ao criar despesas fixas');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Criar Despesa Fixa';
    }
}

// Upgrade Premium Logic
document.getElementById('upgrade-btn').addEventListener('click', window.abrirModalPremium);

document.getElementById('premium-request-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const whatsapp = document.getElementById('premium-whatsapp').value;
    try {
        await addDoc(collection(db, "premium_requests"), {
            uid: appState.user.uid,
            email: appState.user.email,
            displayName: appState.user.displayName,
            whatsapp: whatsapp,
            status: 'pending',
            createdAt: new Date()
        });
        showToast("Pedido enviado! Entraremos em contato.");
        window.fecharModalPremium();
        e.target.reset();
    } catch (e) {
        alert("Erro ao enviar pedido.");
    }
});

function atualizarUIPremium() {
    const upgradeBtn = document.getElementById('upgrade-btn');
    const goalsLock = document.getElementById('goals-premium-lock');
    const debtsLock = document.getElementById('debts-premium-lock');
    const csvLock = document.getElementById('csv-premium-lock');
    const exportBtn = document.getElementById('export-btn');
    const reportBtn = document.getElementById('report-btn');
    const addGoalBtn = document.getElementById('add-goal-btn');
    const addInvestmentBtn = document.getElementById('add-investment-btn-section');

    if (appState.access === 1 || appState.isAdmin) {
        if (upgradeBtn) upgradeBtn.classList.add('hidden');
        if (goalsLock) goalsLock.classList.add('hidden');
        if (debtsLock) debtsLock.classList.add('hidden');
        if (csvLock) csvLock.classList.add('hidden');
        if (exportBtn) {
            exportBtn.classList.remove('opacity-50', 'pointer-events-none');
            exportBtn.title = "Exportar CSV";
        }
        if (reportBtn) {
            reportBtn.disabled = false;
            reportBtn.title = "Gerar Relatório Financeiro com IA";
        }
        if (addGoalBtn) addGoalBtn.classList.remove('hidden');
        if (addInvestmentBtn) addInvestmentBtn.classList.remove('hidden');
    } else {
        if (upgradeBtn) upgradeBtn.classList.remove('hidden');
        if (goalsLock) goalsLock.classList.remove('hidden');
        if (debtsLock) debtsLock.classList.remove('hidden');
        if (csvLock) csvLock.classList.remove('hidden'); // Reinicia visibilidade
        if (exportBtn) {
            exportBtn.classList.add('opacity-50', 'pointer-events-none');
            exportBtn.title = "Disponível no Premium";
            if (csvLock) csvLock.classList.remove('hidden');
        }
        if (reportBtn) {
            reportBtn.disabled = true;
            reportBtn.title = "Relatório com IA - Exclusivo Premium";
        }
        if (addGoalBtn) addGoalBtn.classList.add('hidden');
        if (addInvestmentBtn) addInvestmentBtn.classList.add('hidden');

        // Esconde conteúdo se não for premium
        const goalsCont = document.getElementById('goals-container');
        const debtsCont = document.getElementById('debts-container');
        const investCont = document.getElementById('investments-container');
        
        if (goalsCont) goalsCont.innerHTML = `
            <div class="col-span-full p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center bg-gray-50/50 dark:bg-gray-900/20">
                <p class="text-gray-400 text-sm">Funcionalidade Premium</p>
                <button onclick="abrirModalPremium()" class="mt-2 text-indigo-500 font-bold text-xs hover:underline">Saiba mais</button>
            </div>
        `;
        if (debtsCont) debtsCont.innerHTML = `
            <div class="min-w-full p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center bg-gray-50/50 dark:bg-gray-900/20">
                <p class="text-gray-400 text-sm">Funcionalidade Premium</p>
                <button onclick="abrirModalPremium()" class="mt-2 text-indigo-500 font-bold text-xs hover:underline">Saiba mais</button>
            </div>
        `;
        if (investCont) investCont.innerHTML = `
            <div class="col-span-full p-8 border-2 border-dashed border-gray-200 dark:border-gray-800 rounded-2xl text-center bg-gray-50/50 dark:bg-gray-900/20">
                <i data-lucide="trending-up" class="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-2"></i>
                <p class="text-gray-400 text-sm">Funcionalidade Premium</p>
                <button onclick="abrirModalPremium()" class="mt-2 text-indigo-500 font-bold text-xs hover:underline">Saiba mais</button>
            </div>
        `;
    }
    if (window.lucide) lucide.createIcons();
}

function carregarPedidosAdmin() {
    const q = query(collection(db, "premium_requests"), where("status", "==", "pending"));
    onSnapshot(q, (snapshot) => {
        // Se entrou aqui, é porque o Firebase permitiu a leitura (é Admin de fato)
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) {
            adminBtn.classList.remove('hidden');
            // Remove listeners antigos antes de adicionar para evitar duplicidade
            adminBtn.replaceWith(adminBtn.cloneNode(true));
            const newAdminBtn = document.getElementById('admin-btn');
            newAdminBtn.addEventListener('click', window.abrirModalAdmin);
        }

        const list = document.getElementById('admin-requests-list');
        list.innerHTML = '';
        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const row = document.createElement('tr');
            row.className = "border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition";
            row.innerHTML = `
                <td class="p-4">
                    <div class="text-sm font-bold dark:text-white">${data.displayName || 'Sem nome'}</div>
                    <div class="text-[10px] text-gray-400">${data.email}</div>
                </td>
                <td class="p-4 text-sm dark:text-gray-300">
                    <a href="https://wa.me/55${data.whatsapp.replace(/\D/g, '')}" target="_blank" class="text-indigo-500 hover:underline flex items-center gap-1">
                        <i data-lucide="message-circle" class="w-3 h-3"></i> ${data.whatsapp}
                    </a>
                </td>
                <td class="p-4 text-xs text-gray-500">${data.createdAt?.toDate().toLocaleDateString('pt-BR')}</td>
                <td class="p-4 text-center">
                    <button onclick="aprovarUsuario('${data.uid}', '${docSnap.id}')" class="px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg hover:bg-emerald-600 transition">Aprovar</button>
                </td>
            `;
            list.appendChild(row);
        });
        if (window.lucide) lucide.createIcons();
    }, (error) => {
        // Se der erro de permissão, garante que o botão suma
        console.warn("Acesso administrativo negado pelo Firebase.");
        const adminBtn = document.getElementById('admin-btn');
        if (adminBtn) adminBtn.classList.add('hidden');
    });
}

window.aprovarUsuario = async (userId, requestId) => {
    if (!confirm("Confirmar ativação Premium para este usuário?")) return;
    try {
        await updateDoc(doc(db, "users", userId), { isPremium: true });
        await updateDoc(doc(db, "premium_requests", requestId), { status: 'approved' });
        showToast("Usuário agora é Premium!");
    } catch (e) {
        alert("Erro ao aprovar.");
    }
}

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
    if (!spouseId || spouseId === appState.user.uid) return alert("ID inválido");
    try {
        await setDoc(doc(db, "users", appState.user.uid), { linkedWalletId: spouseId }, { merge: true });
        showToast("Carteira vinculada!");
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) { alert("Erro ao vincular"); }
});

document.getElementById('unlink-family-btn').addEventListener('click', async () => {
    if (!confirm("Deseja desconectar e voltar para sua carteira individual?")) return;
    try {
        await setDoc(doc(db, "users", appState.user.uid), { linkedWalletId: null }, { merge: true });
        showToast("Desconectado!");
        setTimeout(() => window.location.reload(), 1500);
    } catch (e) { alert("Erro ao desconectar"); }
});

// Helper functions for UI interaction
window.prepararEdicaoCartao = (id) => {
    const card = appState.cards.find(c => c.id === id);
    if (!card) return;
    document.getElementById('edit-card-modal').classList.remove('hidden');
    document.getElementById('edit-card-id').value = id;
    document.getElementById('edit-card-bank').value = card.bank || '';
    document.getElementById('edit-card-color').value = card.color || card.bank || 'blue';
    document.getElementById('edit-card-name').value = card.name;
    document.getElementById('edit-card-bill').value = (card.bill || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById('edit-card-closing').value = card.closingDay || '';
    document.getElementById('edit-card-due').value = card.dueDay || '';
}

window.prepararEdicaoConta = (id) => {
    const acc = appState.accounts.find(a => a.id === id);
    if (!acc) return;
    document.getElementById('edit-account-modal').classList.remove('hidden');
    document.getElementById('edit-account-id').value = id;
    document.getElementById('edit-account-bank').value = acc.bank || '';
    document.getElementById('edit-account-color').value = acc.color || acc.bank || 'blue';
    document.getElementById('edit-account-name').value = acc.name;
    document.getElementById('edit-account-balance').value = (acc.balance || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

window.prepararEdicaoDivida = (id) => {
    const debt = appState.debts.find(d => d.id === id);
    if (!debt) return;
    document.getElementById('edit-debt-modal').classList.remove('hidden');
    document.getElementById('edit-debt-id').value = id;
    document.getElementById('edit-debt-color').value = debt.color || debt.bank || 'red';
    document.getElementById('edit-debt-name').value = debt.name;
    document.getElementById('edit-debt-balance').value = (debt.totalBalance || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

window.deletarCartao = deletarCartao;
window.deletarMeta = deletarMeta;

window.prepararEdicao = (id) => {
    const t = appState.transactions.find(item => item.id === id);
    if (!t) return;
    document.getElementById('edit-modal').classList.remove('hidden');
    document.getElementById('edit-id').value = id;
    document.getElementById('edit-desc').value = t.desc;
    document.getElementById('edit-amount').value = Math.abs(t.amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    document.getElementById('edit-date').value = t.date;
    document.getElementById('edit-category').value = t.category || 'other';

    const editSource = document.getElementById('edit-source');
    popularSelectSources(editSource);
    editSource.value = t.source || 'wallet';
}

window.deletarItem = (id) => deletarTransacao(id, appState.transactions, appState.cards, appState.accounts, appState.debts);

function popularSelectSources(target = sourceSelect) {
    if (!target) return;
    const currentVal = target.value;
    let options = '';

    // Agrupar Contas
    if (appState.accounts.length > 0) {
        options += '<optgroup label="Contas / Carteira">';
        appState.accounts.forEach(acc => {
            options += `<option value="${acc.id}">🏦 ${acc.name} (${acc.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</option>`;
        });
        options += '</optgroup>';
    } else {
        options += '<option value="wallet">💵 Carteira (Padrão)</option>';
    }

    // Agrupar Cartões
    if (appState.cards.length > 0) {
        options += '<optgroup label="Cartões de Crédito">';
        appState.cards.forEach(card => {
            options += `<option value="${card.id}">💳 ${card.name} (Final ${card.last4})</option>`;
        });
        options += '</optgroup>';
    }

    // Agrupar Dívidas
    if (appState.debts.length > 0) {
        options += '<optgroup label="Dívidas">';
        appState.debts.forEach(debt => {
            options += `<option value="${debt.id}">📉 ${debt.name} (A pagar: ${debt.totalBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })})</option>`;
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
    if (appState.accounts.length > 0) {
        options += '<optgroup label="Contas">';
        appState.accounts.forEach(acc => {
            options += `<option value="${acc.id}">🏦 ${acc.name}</option>`;
        });
        options += '</optgroup>';
    }

    // Cartões
    if (appState.cards.length > 0) {
        options += '<optgroup label="Cartões">';
        appState.cards.forEach(card => {
            options += `<option value="${card.id}">💳 ${card.name}</option>`;
        });
        options += '</optgroup>';
    }

    // Dívidas
    if (appState.debts.length > 0) {
        options += '<optgroup label="Dívidas">';
        appState.debts.forEach(debt => {
            options += `<option value="${debt.id}">📉 ${debt.name}</option>`;
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
    const statusSelecionado = paymentStatusFilter ? paymentStatusFilter.value : "";

    appState.filteredTrans = appState.transactions.filter(t => {
        const matchesMonth = !mesSelecionado || (t.date && t.date.startsWith(mesSelecionado));
        const matchesSearch = !busca || (t.desc && t.desc.toLowerCase().includes(busca));
        const matchesSource = !fonteSelecionada || t.source === fonteSelecionada;
        
        // Filtro de status de pagamento
        let matchesStatus = true;
        if (statusSelecionado) {
            const card = appState.cards.find(c => c.id === t.source);
            const isPaid = t.paid || (t.amount < 0 && card); // Cartões são considerados pagos
            const isPending = t.amount < 0 && !t.paid && !card;
            
            if (statusSelecionado === 'pending') {
                matchesStatus = isPending;
            } else if (statusSelecionado === 'paid') {
                matchesStatus = isPaid && t.amount < 0; // Só despesas podem ser "pagas"
            }
        }
        
        return matchesMonth && matchesSearch && matchesSource && matchesStatus;
    });

    renderSummary();
}

if (searchInput) {
    searchInput.addEventListener('input', aplicarFiltro);
}

function renderSummary() {
    renderList(appState.filteredTrans, listElement, appState.cards, appState.accounts, appState.debts, formatarData, window.prepararEdicao, window.deletarItem);
    renderValues(appState.filteredTrans, appState.transactions, monthFilter.value);
    renderCharts(appState.filteredTrans, monthFilter.value);
    
    // Update section content when data changes
    const event = new CustomEvent('section-changed', { detail: { section: 'current' } });
    window.dispatchEvent(event);
}

// Função para atualizar estatísticas de investimentos
function atualizarEstatisticasInvestimentos(investments) {
    const stats = calcularEstatisticasInvestimentos(investments);
    
    // Atualiza painel de estatísticas na seção de investimentos
    const invStatInvested = document.getElementById('inv-stat-invested');
    const invStatCurrent = document.getElementById('inv-stat-current');
    const invStatProfit = document.getElementById('inv-stat-profit');
    const invStatPercentage = document.getElementById('inv-stat-percentage');
    
    if (invStatInvested) invStatInvested.textContent = `R$ ${stats.totalInvestido.toFixed(2).replace('.', ',')}`;
    if (invStatCurrent) invStatCurrent.textContent = `R$ ${stats.totalAtual.toFixed(2).replace('.', ',')}`;
    
    if (invStatProfit) {
        const isPositive = stats.lucro >= 0;
        invStatProfit.textContent = `${isPositive ? '+' : ''}R$ ${stats.lucro.toFixed(2).replace('.', ',')}`;
        invStatProfit.className = `text-2xl font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`;
    }
    
    if (invStatPercentage) {
        const isPositive = stats.rentabilidade >= 0;
        invStatPercentage.textContent = `${isPositive ? '+' : ''}${stats.rentabilidade.toFixed(2)}%`;
        invStatPercentage.className = `text-2xl font-bold ${isPositive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`;
    }
    
    // Atualiza widget no dashboard
    const invTotal = document.getElementById('investments-total');
    const invProfit = document.getElementById('investments-profit');
    const invPercentage = document.getElementById('investments-percentage');
    
    if (invTotal) invTotal.textContent = `R$ ${stats.totalAtual.toFixed(2).replace('.', ',')}`;
    
    if (invProfit) {
        const isPositive = stats.lucro >= 0;
        invProfit.textContent = `${isPositive ? '+' : ''}R$ ${stats.lucro.toFixed(2).replace('.', ',')}`;
    }
    
    if (invPercentage) {
        const isPositive = stats.rentabilidade >= 0;
        invPercentage.textContent = `${isPositive ? '+' : ''}${stats.rentabilidade.toFixed(2)}%`;
        invPercentage.className = `text-xs font-bold ${isPositive ? 'text-white' : 'text-red-200'}`;
    }
    
    // Oculta widget se não houver investimentos
    const widget = document.getElementById('investments-widget');
    if (widget) {
        if (stats.quantidade === 0) {
            widget.style.display = 'none';
        } else {
            widget.style.display = 'block';
        }
    }
}

// Função para gerar relatório com IA
async function gerarRelatorio() {
    // Verifica se é premium
    if (!appState.access || appState.access === 0) {
        window.abrirModalPremium();
        showToast("⭐ Relatórios com IA são exclusivos para Premium");
        return;
    }
    
    // Pega mês/ano atual do filtro
    const mesAnoFiltro = monthFilter.value; // formato: "2026-01"
    const [ano, mes] = mesAnoFiltro.split('-').map(Number);
    
    // Gera relatório
    await gerarRelatorioMensalIA(
        appState.transactions,
        appState.cards,
        appState.accounts,
        appState.goals,
        mes,
        ano,
        appState.user?.displayName || 'Usuário'
    );
}

// Auxiliares de Cópia
window.copiarReferral = () => {
    const input = document.getElementById('referral-link');
    input.select();
    document.execCommand('copy');
    alert("Link de indicação copiado! Compartilhe com seus amigos.");
};

window.copiarID = () => {
    const input = document.getElementById('my-share-id');
    input.select();
    document.execCommand('copy');
    alert("Seu ID de sincronização foi copiado!");
};