/**
 * Sistema de Diálogos Customizados
 * Substitui alert() e confirm() por modais customizados e seguros
 */

/**
 * Mostra um diálogo de alerta
 * @param {string} message - Mensagem a exibir
 * @param {string} type - Tipo: 'info', 'success', 'warning', 'error'
 * @returns {Promise<void>}
 */
export function showDialog(message, type = 'info') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        
        const modal = document.createElement('div');
        modal.className = 'bg-white dark:bg-darkcard rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in';
        
        const iconColors = {
            info: 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400',
            success: 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400',
            warning: 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400',
            error: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
        };
        
        const icons = {
            info: 'info',
            success: 'check-circle',
            warning: 'alert-triangle',
            error: 'x-circle'
        };
        
        const iconDiv = document.createElement('div');
        iconDiv.className = `w-12 h-12 rounded-full ${iconColors[type]} flex items-center justify-center mx-auto mb-4`;
        iconDiv.innerHTML = `<i data-lucide="${icons[type]}" class="w-6 h-6"></i>`;
        
        const messageP = document.createElement('p');
        messageP.className = 'text-gray-700 dark:text-gray-300 text-center mb-6 text-sm';
        messageP.textContent = message;
        
        const button = document.createElement('button');
        button.className = 'w-full py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition';
        button.textContent = 'OK';
        button.onclick = () => {
            overlay.remove();
            resolve();
        };
        
        modal.appendChild(iconDiv);
        modal.appendChild(messageP);
        modal.appendChild(button);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        if (window.lucide) lucide.createIcons();
        
        // Fechar com ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleEsc);
                resolve();
            }
        };
        document.addEventListener('keydown', handleEsc);
    });
}

/**
 * Mostra um diálogo de confirmação
 * @param {string} message - Mensagem a exibir
 * @param {string} confirmText - Texto do botão de confirmação
 * @param {string} cancelText - Texto do botão de cancelamento
 * @returns {Promise<boolean>} true se confirmado, false se cancelado
 */
export function showConfirm(message, confirmText = 'Confirmar', cancelText = 'Cancelar') {
    return new Promise((resolve) => {
        const overlay = document.createElement('div');
        overlay.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        
        const modal = document.createElement('div');
        modal.className = 'bg-white dark:bg-darkcard rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in';
        
        const iconDiv = document.createElement('div');
        iconDiv.className = 'w-12 h-12 rounded-full bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400 flex items-center justify-center mx-auto mb-4';
        iconDiv.innerHTML = '<i data-lucide="help-circle" class="w-6 h-6"></i>';
        
        const messageP = document.createElement('p');
        messageP.className = 'text-gray-700 dark:text-gray-300 text-center mb-6 text-sm whitespace-pre-line';
        messageP.textContent = message;
        
        const buttonContainer = document.createElement('div');
        buttonContainer.className = 'flex gap-3';
        
        const cancelButton = document.createElement('button');
        cancelButton.className = 'flex-1 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition';
        cancelButton.textContent = cancelText;
        cancelButton.onclick = () => {
            overlay.remove();
            resolve(false);
        };
        
        const confirmButton = document.createElement('button');
        confirmButton.className = 'flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition';
        confirmButton.textContent = confirmText;
        confirmButton.onclick = () => {
            overlay.remove();
            resolve(true);
        };
        
        buttonContainer.appendChild(cancelButton);
        buttonContainer.appendChild(confirmButton);
        
        modal.appendChild(iconDiv);
        modal.appendChild(messageP);
        modal.appendChild(buttonContainer);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);
        
        if (window.lucide) lucide.createIcons();
        
        // Fechar com ESC
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', handleEsc);
                resolve(false);
            }
        };
        document.addEventListener('keydown', handleEsc);
        
        // Focar no botão de confirmação
        confirmButton.focus();
    });
}

/**
 * Mostra um toast de notificação (substitui showToast do utils.js)
 * @param {string} message - Mensagem a exibir
 * @param {string} type - Tipo: 'success', 'error', 'warning', 'info'
 * @param {number} duration - Duração em ms
 */
export function showToast(message, type = 'success', duration = 3000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const colors = {
        success: 'bg-emerald-500',
        error: 'bg-red-500',
        warning: 'bg-yellow-500',
        info: 'bg-blue-500'
    };
    
    const icons = {
        success: 'check-circle',
        error: 'x-circle',
        warning: 'alert-triangle',
        info: 'info'
    };
    
    const toast = document.createElement('div');
    toast.className = `${colors[type]} text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-2 toast-enter mb-2`;
    
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', icons[type]);
    icon.className = 'w-4 h-4';
    
    const text = document.createElement('span');
    text.textContent = message;
    text.className = 'text-sm font-medium';
    
    toast.appendChild(icon);
    toast.appendChild(text);
    container.appendChild(toast);
    
    if (window.lucide) lucide.createIcons();
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Adiciona animação CSS necessária
const style = document.createElement('style');
style.textContent = `
    @keyframes scale-in {
        from {
            opacity: 0;
            transform: scale(0.9);
        }
        to {
            opacity: 1;
            transform: scale(1);
        }
    }
    .animate-scale-in {
        animation: scale-in 0.2s ease-out;
    }
    .toast-enter {
        animation: slideIn 0.3s ease-out forwards;
        transition: opacity 0.3s, transform 0.3s;
    }
`;
document.head.appendChild(style);
