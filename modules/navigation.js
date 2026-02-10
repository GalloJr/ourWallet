// Navigation module - handles menu navigation between sections

let currentSection = 'dashboard';
let accountFilters = {
    search: '',
    month: '',
    account: '',
    status: ''
};
let cardFilters = {
    search: '',
    month: '',
    card: ''
};

export function setupNavigation() {
    const navButtons = document.querySelectorAll('.nav-tab');
    
    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const sectionId = button.id.replace('nav-', '');
            navigateToSection(sectionId);
        });
    });

    // Initialize with dashboard active
    navigateToSection('dashboard');
    
    // Setup account filters
    setupAccountFilters();
    
    // Setup card filters
    setupCardFilters();
}

function setupAccountFilters() {
    const searchInput = document.getElementById('accounts-search-input');
    const monthFilter = document.getElementById('accounts-month-filter');
    const accountFilter = document.getElementById('accounts-account-filter');
    const statusFilter = document.getElementById('accounts-status-filter');
    
    // Populate month filter
    if (monthFilter) {
        populateMonthFilter(monthFilter);
    }
    
    // Add event listeners
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            accountFilters.search = e.target.value.toLowerCase();
            applyAccountFilters();
        });
    }
    
    if (monthFilter) {
        monthFilter.addEventListener('change', (e) => {
            accountFilters.month = e.target.value;
            applyAccountFilters();
        });
    }
    
    if (accountFilter) {
        accountFilter.addEventListener('change', (e) => {
            accountFilters.account = e.target.value;
            applyAccountFilters();
        });
    }
    
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            accountFilters.status = e.target.value;
            applyAccountFilters();
        });
    }
}

function populateMonthFilter(monthFilter) {
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
    
    // Set initial month filter value
    accountFilters.month = monthFilter.value;
}

function applyAccountFilters() {
    // Trigger re-render with current section
    const event = new CustomEvent('section-changed', { detail: { section: currentSection } });
    window.dispatchEvent(event);
}

function setupCardFilters() {
    const searchInput = document.getElementById('cards-search-input');
    const monthFilter = document.getElementById('cards-month-filter');
    const cardFilter = document.getElementById('cards-card-filter');
    
    // Populate month filter
    if (monthFilter) {
        populateMonthFilter(monthFilter);
        cardFilters.month = monthFilter.value;
    }
    
    // Add event listeners
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            cardFilters.search = e.target.value.toLowerCase();
            applyCardFilters();
        });
    }
    
    if (monthFilter) {
        monthFilter.addEventListener('change', (e) => {
            cardFilters.month = e.target.value;
            applyCardFilters();
        });
    }
    
    if (cardFilter) {
        cardFilter.addEventListener('change', (e) => {
            cardFilters.card = e.target.value;
            applyCardFilters();
        });
    }
}

function applyCardFilters() {
    // Trigger re-render with current section
    const event = new CustomEvent('section-changed', { detail: { section: currentSection } });
    window.dispatchEvent(event);
}

export function navigateToSection(sectionId) {
    // Update current section
    currentSection = sectionId;
    
    // Update nav buttons
    const navButtons = document.querySelectorAll('.nav-tab');
    navButtons.forEach(btn => {
        btn.classList.remove('active');
    });
    
    const activeNavButton = document.getElementById(`nav-${sectionId}`);
    if (activeNavButton) {
        activeNavButton.classList.add('active');
    }

    // Update sections
    const sections = document.querySelectorAll('.section-content');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const activeSection = document.getElementById(`section-${sectionId}`);
    if (activeSection) {
        activeSection.classList.add('active');
    }

    currentSection = sectionId;
    
    // Re-render content for the section
    updateSectionContent(sectionId);
}

function updateSectionContent(sectionId) {
    // This will be called when switching sections to refresh content
    // Will be integrated with app.js to render appropriate content
    
    // Use 'current' to keep the current section, otherwise pass the section id
    const event = new CustomEvent('section-changed', { 
        detail: { section: sectionId === 'current' ? currentSection : sectionId } 
    });
    window.dispatchEvent(event);
}

export function getCurrentSection() {
    return currentSection;
}

// Render specific section content
export function renderSectionContent(section, data) {
    switch(section) {
        case 'goals':
            renderGoalsSection(data);
            break;
        case 'accounts':
            renderAccountsSection(data);
            break;
        case 'cards':
            renderCardsSection(data);
            break;
        case 'debts':
            renderDebtsSection(data);
            break;
        case 'investments':
            renderInvestmentsSection(data);
            break;
        case 'dashboard':
            // Dashboard content is always visible
            break;
    }
}

function renderGoalsSection(data) {
    const container = document.getElementById('goals-container-section');
    if (!container) return;
    
    // This will be populated by the goals module
    // Just copy the content from the main goals container
    const mainContainer = document.getElementById('goals-container');
    if (mainContainer) {
        container.innerHTML = mainContainer.innerHTML;
    }
}

function renderAccountsSection(data) {
    const container = document.getElementById('accounts-container-section');
    if (!container) return;
    
    // This will be populated by the accounts module
    const mainContainer = document.getElementById('accounts-container');
    if (mainContainer) {
        container.innerHTML = mainContainer.innerHTML;
    }
    
    // Render account transactions
    renderAccountTransactions(data);
}

function renderCardsSection(data) {
    const container = document.getElementById('cards-container-section');
    if (!container) return;
    
    // This will be populated by the cards module
    const mainContainer = document.getElementById('cards-container');
    if (mainContainer) {
        container.innerHTML = mainContainer.innerHTML;
    }
    
    // Render card transactions
    renderCardTransactions(data);
}

function renderDebtsSection(data) {
    const container = document.getElementById('debts-container-section');
    if (!container) return;
    
    // This will be populated by the debts module
    const mainContainer = document.getElementById('debts-container');
    if (mainContainer) {
        container.innerHTML = mainContainer.innerHTML;
    }
    
    // Render debt transactions
    renderDebtTransactions(data);
}

function renderInvestmentsSection(data) {
    const container = document.getElementById('investments-container-section');
    if (!container) return;
    
    // This will be populated by the investments module
    const mainContainer = document.getElementById('investments-container');
    if (mainContainer) {
        container.innerHTML = mainContainer.innerHTML;
    }
}

function renderAccountTransactions(data) {
    const list = document.getElementById('account-transactions-list');
    if (!list) return;
    
    const { transactions = [], accounts = [] } = data || {};
    
    // Populate account filter dropdown
    const accountFilter = document.getElementById('accounts-account-filter');
    if (accountFilter && accounts.length > 0) {
        const currentValue = accountFilter.value;
        accountFilter.innerHTML = '<option value="">Todas as Contas</option>';
        accounts.forEach(acc => {
            const option = document.createElement('option');
            option.value = acc.id;
            option.textContent = acc.name;
            if (acc.id === currentValue) option.selected = true;
            accountFilter.appendChild(option);
        });
    }
    
    // Filter transactions related to accounts
    let accountTransactions = transactions.filter(t => {
        const source = t.source || t.card;
        return accounts.some(acc => acc.id === source);
    });
    
    // Apply filters
    accountTransactions = accountTransactions.filter(t => {
        // Month filter
        if (accountFilters.month && (!t.date || !t.date.startsWith(accountFilters.month))) {
            return false;
        }
        
        // Search filter
        if (accountFilters.search) {
            const searchLower = accountFilters.search;
            const desc = (t.desc || t.description || '').toLowerCase();
            const account = accounts.find(acc => acc.id === (t.source || t.card));
            const accountName = (account?.name || '').toLowerCase();
            if (!desc.includes(searchLower) && !accountName.includes(searchLower)) {
                return false;
            }
        }
        
        // Account filter
        if (accountFilters.account && (t.source || t.card) !== accountFilters.account) {
            return false;
        }
        
        // Status filter
        if (accountFilters.status) {
            const valor = parseFloat(t.amount || 0);
            const isIncome = valor >= 0;
            const isPaid = t.paid === true || isIncome;
            const isPending = !isPaid;
            
            if (accountFilters.status === 'pending' && !isPending) {
                return false;
            }
            if (accountFilters.status === 'paid' && !isPaid) {
                return false;
            }
        }
        
        return true;
    });
    
    if (accountTransactions.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-400">
                    <p class="text-sm">Nenhuma movimentação encontrada</p>
                </td>
            </tr>
        `;
        return;
    }
    
    list.innerHTML = accountTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(t => {
            const account = accounts.find(acc => acc.id === (t.source || t.card));
            const accountName = account ? account.name : 'Desconhecida';
            const valor = parseFloat(t.amount || 0);
            const isIncome = valor >= 0;
            const isPaid = t.paid === true || isIncome;
            
            return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td class="py-3 text-sm text-gray-600 dark:text-gray-400">
                        ${new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td class="py-3 text-sm text-gray-900 dark:text-white">
                        ${t.desc || t.description || 'Sem descrição'}
                    </td>
                    <td class="py-3 text-sm text-gray-600 dark:text-gray-400">
                        ${accountName}
                    </td>
                    <td class="py-3 text-sm text-right font-semibold ${isIncome ? 'text-emerald-600' : 'text-red-600'}">
                        ${isIncome ? '+' : '-'} R$ ${Math.abs(valor).toFixed(2)}
                    </td>
                    <td class="py-3 text-center">
                        <span class="text-xs px-2 py-1 rounded-full ${isPaid ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}">
                            ${isPaid ? '🟢 Pago' : '🟡 Pendente'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
}

function renderCardTransactions(data) {
    const list = document.getElementById('card-transactions-list');
    if (!list) return;
    
    const { transactions = [], cards = [] } = data || {};
    
    // Populate card filter dropdown
    const cardFilter = document.getElementById('cards-card-filter');
    if (cardFilter && cards.length > 0) {
        const currentValue = cardFilter.value;
        cardFilter.innerHTML = '<option value="">Todos os Cartões</option>';
        cards.forEach(card => {
            const option = document.createElement('option');
            option.value = card.id;
            option.textContent = card.name;
            if (card.id === currentValue) option.selected = true;
            cardFilter.appendChild(option);
        });
    }
    
    // Filter transactions related to cards (checking source/card and description)
    let cardTransactions = transactions.filter(t => {
        const source = t.source || t.card;
        const desc = t.desc || t.description || '';
        // Incluir: transações com source sendo um cartão, ou targetId sendo um cartão, ou descrição começando com "Pagamento Fatura:"
        return cards.some(card => card.id === source || t.targetId === card.id) || desc.startsWith('Pagamento Fatura:');
    });
    
    // Apply filters
    cardTransactions = cardTransactions.filter(t => {
        // Month filter
        if (cardFilters.month && (!t.date || !t.date.startsWith(cardFilters.month))) {
            return false;
        }
        
        // Search filter
        if (cardFilters.search) {
            const searchLower = cardFilters.search;
            const desc = (t.desc || t.description || '').toLowerCase();
            const card = cards.find(c => c.id === (t.source || t.card));
            const cardName = (card?.name || '').toLowerCase();
            if (!desc.includes(searchLower) && !cardName.includes(searchLower)) {
                return false;
            }
        }
        
        // Card filter
        if (cardFilters.card && (t.source || t.card) !== cardFilters.card) {
            return false;
        }
        
        return true;
    });
    
    if (cardTransactions.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-400">
                    <p class="text-sm">Nenhuma movimentação encontrada</p>
                </td>
            </tr>
        `;
        return;
    }
    
    list.innerHTML = cardTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(t => {
            const desc = t.desc || t.description || '';
            // Procurar cartão pelo source, card ou targetId (para pagamentos)
            let card = cards.find(c => c.id === (t.source || t.card) || c.id === t.targetId);
            let cardName = card ? card.name : 'Desconhecido';
            
            // Se não encontrou cartão e a descrição começa com "Pagamento Fatura:", extrair nome da descrição
            if (!card && desc.startsWith('Pagamento Fatura:')) {
                cardName = desc.replace('Pagamento Fatura:', '').trim();
            }
            
            const valor = parseFloat(t.amount || 0);
            
            // Tentar extrair parcela da descrição se não houver nos campos
            let installmentInfo = '-';
            if (t.installmentCurrent && t.installmentTotal) {
                installmentInfo = `${t.installmentCurrent}/${t.installmentTotal}`;
            } else {
                // Procurar por padrão (X/Y) na descrição
                const installmentMatch = desc.match(/\((\d+)\/(\d+)\)/);
                if (installmentMatch) {
                    installmentInfo = `${installmentMatch[1]}/${installmentMatch[2]}`;
                }
            }
            
            return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td class="py-3 text-sm text-gray-600 dark:text-gray-400">
                        ${new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td class="py-3 text-sm text-gray-900 dark:text-white">
                        ${t.desc || t.description || 'Sem descrição'}
                    </td>
                    <td class="py-3 text-sm text-gray-600 dark:text-gray-400">
                        ${cardName}
                    </td>
                    <td class="py-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                        ${installmentInfo}
                    </td>
                    <td class="py-3 text-sm text-right font-semibold text-red-600">
                        R$ ${Math.abs(valor).toFixed(2)}
                    </td>
                </tr>
            `;
        }).join('');
}

function renderDebtTransactions(data) {
    const list = document.getElementById('debt-transactions-list');
    if (!list) return;
    
    const { transactions = [], debts = [] } = data || {};
    
    // Filter transactions related to debts (checking source, debtId, targetId, and description)
    const debtTransactions = transactions.filter(t => {
        const source = t.source || t.card;
        const desc = t.desc || t.description || '';
        // Incluir: transações com source sendo uma dívida, ou com debtId, ou pagamentos direcionados a dívidas (targetId), ou descrição começando com "Pagamento Dívida:"
        return debts.some(debt => debt.id === source || t.debtId === debt.id || t.targetId === debt.id) || desc.startsWith('Pagamento Dívida:');
    });
    
    if (debtTransactions.length === 0) {
        list.innerHTML = `
            <tr>
                <td colspan="5" class="py-8 text-center text-gray-400">
                    <p class="text-sm">Nenhum pagamento encontrado</p>
                </td>
            </tr>
        `;
        return;
    }
    
    list.innerHTML = debtTransactions
        .sort((a, b) => new Date(b.date) - new Date(a.date))
        .map(t => {
            const source = t.source || t.card;
            const desc = t.desc || t.description || '';
            // Procurar dívida pelo source, debtId ou targetId (para pagamentos)
            let debt = debts.find(d => d.id === source || d.id === t.debtId || d.id === t.targetId);
            let debtName = debt ? debt.name : 'Desconhecida';
            
            // Se não encontrou dívida e a descrição começa com "Pagamento Dívida:", extrair nome da descrição
            if (!debt && desc.startsWith('Pagamento Dívida:')) {
                debtName = desc.replace('Pagamento Dívida:', '').trim();
            }
            
            const valor = parseFloat(t.amount || 0);
            const isPaid = t.paid === true;
            const installmentInfo = t.installmentCurrent && t.installmentTotal 
                ? `${t.installmentCurrent}/${t.installmentTotal}` 
                : '-';
            
            return `
                <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td class="py-3 text-sm text-gray-600 dark:text-gray-400">
                        ${new Date(t.date).toLocaleDateString('pt-BR')}
                    </td>
                    <td class="py-3 text-sm text-gray-900 dark:text-white">
                        ${debtName}
                    </td>
                    <td class="py-3 text-sm text-gray-600 dark:text-gray-400 text-center">
                        ${installmentInfo}
                    </td>
                    <td class="py-3 text-sm text-right font-semibold text-red-600">
                        R$ ${Math.abs(valor).toFixed(2)}
                    </td>
                    <td class="py-3 text-center">
                        <span class="text-xs px-2 py-1 rounded-full ${isPaid ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'}">
                            ${isPaid ? '🟢 Pago' : '🟡 Pendente'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
}
