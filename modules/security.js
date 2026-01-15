/**
 * Módulo de Segurança - Funções para prevenir XSS e validar dados
 */

/**
 * Sanitiza texto para prevenir XSS
 * @param {string} text - Texto a ser sanitizado
 * @returns {string} Texto seguro
 */
export function sanitizeText(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Cria elemento HTML de forma segura
 * @param {string} tag - Tag do elemento
 * @param {object} props - Propriedades do elemento
 * @param {string|HTMLElement|Array} children - Filhos do elemento
 * @returns {HTMLElement}
 */
export function createElement(tag, props = {}, children = null) {
    const element = document.createElement(tag);
    
    // Aplicar propriedades
    Object.keys(props).forEach(key => {
        if (key === 'className') {
            element.className = props[key];
        } else if (key === 'textContent') {
            element.textContent = props[key];
        } else if (key.startsWith('on') && typeof props[key] === 'function') {
            element.addEventListener(key.substring(2).toLowerCase(), props[key]);
        } else if (key === 'dataset') {
            Object.keys(props[key]).forEach(dataKey => {
                element.dataset[dataKey] = props[key][dataKey];
            });
        } else {
            element.setAttribute(key, props[key]);
        }
    });
    
    // Adicionar filhos
    if (children) {
        if (Array.isArray(children)) {
            children.forEach(child => {
                if (typeof child === 'string') {
                    element.appendChild(document.createTextNode(child));
                } else if (child instanceof HTMLElement) {
                    element.appendChild(child);
                }
            });
        } else if (typeof children === 'string') {
            element.textContent = children;
        } else if (children instanceof HTMLElement) {
            element.appendChild(children);
        }
    }
    
    return element;
}

/**
 * Valida valor monetário
 * @param {number} value - Valor a validar
 * @param {number} min - Valor mínimo permitido
 * @param {number} max - Valor máximo permitido
 * @returns {object} {valid: boolean, error: string}
 */
export function validateMonetaryValue(value, min = 0.01, max = 1000000) {
    if (typeof value !== 'number' || isNaN(value)) {
        return { valid: false, error: 'Valor deve ser um número válido' };
    }
    if (value < min) {
        return { valid: false, error: `Valor mínimo é ${min.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` };
    }
    if (value > max) {
        return { valid: false, error: `Valor máximo é ${max.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}` };
    }
    return { valid: true };
}

/**
 * Valida string
 * @param {string} text - Texto a validar
 * @param {number} minLength - Tamanho mínimo
 * @param {number} maxLength - Tamanho máximo
 * @returns {object} {valid: boolean, error: string}
 */
export function validateString(text, minLength = 1, maxLength = 255) {
    if (typeof text !== 'string') {
        return { valid: false, error: 'Deve ser um texto válido' };
    }
    const trimmed = text.trim();
    if (trimmed.length < minLength) {
        return { valid: false, error: `Mínimo ${minLength} caracteres` };
    }
    if (trimmed.length > maxLength) {
        return { valid: false, error: `Máximo ${maxLength} caracteres` };
    }
    return { valid: true };
}

/**
 * Valida data
 * @param {string} dateString - Data no formato YYYY-MM-DD
 * @returns {object} {valid: boolean, error: string}
 */
export function validateDate(dateString) {
    if (!dateString || typeof dateString !== 'string') {
        return { valid: false, error: 'Data inválida' };
    }
    const date = new Date(dateString + 'T00:00:00');
    if (isNaN(date.getTime())) {
        return { valid: false, error: 'Data inválida' };
    }
    // Verificar se está em um range razoável (últimos 10 anos até próximos 10 anos)
    const now = new Date();
    const minDate = new Date(now.getFullYear() - 10, 0, 1);
    const maxDate = new Date(now.getFullYear() + 10, 11, 31);
    if (date < minDate || date > maxDate) {
        return { valid: false, error: 'Data fora do intervalo permitido' };
    }
    return { valid: true };
}

/**
 * Valida número inteiro
 * @param {number} value - Valor a validar
 * @param {number} min - Valor mínimo
 * @param {number} max - Valor máximo
 * @returns {object} {valid: boolean, error: string}
 */
export function validateInteger(value, min = 1, max = 31) {
    if (!Number.isInteger(value)) {
        return { valid: false, error: 'Deve ser um número inteiro' };
    }
    if (value < min || value > max) {
        return { valid: false, error: `Deve estar entre ${min} e ${max}` };
    }
    return { valid: true };
}

/**
 * Log de erro com contexto (apenas em desenvolvimento)
 * @param {string} context - Contexto do erro
 * @param {Error} error - Erro
 */
export function logError(context, error) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        console.error(`[${context}]`, error);
    } else {
        // Em produção, log sanitizado
        console.warn(`Erro em ${context}`);
        // Aqui você pode enviar para um serviço de logging como Sentry
    }
}

/**
 * Escapa HTML para prevenir XSS ao inserir em innerHTML
 * @param {string} html - HTML a escapar
 * @returns {string} HTML escapado
 */
export function escapeHtml(html) {
    const text = document.createTextNode(html);
    const div = document.createElement('div');
    div.appendChild(text);
    return div.innerHTML;
}
