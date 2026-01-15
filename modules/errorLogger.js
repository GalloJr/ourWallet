/**
 * Error Logger - Substitui Crashlytics para Web
 * Captura erros JavaScript e envia para Firestore
 */

import { db, collection, addDoc } from '../firebase.js';

/**
 * Inicializa o logger de erros
 */
export function initErrorLogger() {
  // Capturar erros não tratados
  window.addEventListener('error', (event) => {
    logError({
      type: 'uncaught_error',
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  });

  // Capturar promises rejeitadas não tratadas
  window.addEventListener('unhandledrejection', (event) => {
    logError({
      type: 'unhandled_rejection',
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  });

  console.log('✅ Error Logger initialized');
}

/**
 * Log manual de erro
 * @param {Object} errorData - Dados do erro
 */
async function logError(errorData) {
  try {
    // Em desenvolvimento, apenas console.error
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      console.error('💥 Error logged:', errorData);
      return;
    }

    // Em produção, salva no Firestore
    await addDoc(collection(db, 'error_logs'), {
      ...errorData,
      environment: 'production',
      createdAt: new Date()
    });

    console.warn('Error logged to Firestore');
  } catch (error) {
    // Se falhar ao logar, apenas console
    console.error('Failed to log error:', error);
  }
}

/**
 * Log erro customizado (para uso manual no código)
 * @param {Error} error - Objeto de erro
 * @param {Object} context - Contexto adicional
 */
export function logCustomError(error, context = {}) {
  logError({
    type: 'custom_error',
    message: error.message,
    stack: error.stack,
    context: context,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    url: window.location.href
  });
}
