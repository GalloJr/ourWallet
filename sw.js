const CACHE_NAME = 'ourwallet-v4'; // Incrementado para v4 para forçar atualização com fix mobile auth
const ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/firebase.js',
    '/firebase.config.js',
    '/modules/auth.js',
    '/modules/cards.js',
    '/modules/constants.js',
    '/modules/goals.js',
    '/modules/transactions.js',
    '/modules/ui.js',
    '/modules/utils.js',
    '/manifest.json'
];

// Instalação: Pré-cache dos assets essenciais
self.addEventListener('install', (e) => {
    self.skipWaiting(); // Força o SW a se tornar ativo imediatamente
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
    self.clients.claim(); // Assume o controle das abas abertas imediatamente
});

// Fetch: Estratégia Stale-While-Revalidate para assets dinâmicos
// E Network-First para o index.html (garantindo que o HTML sempre venha fresco se houver rede)
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);

    // Nunca cachear requisições de autenticação do Firebase
    // Isso previne problemas com login/logout em mobile e desktop
    if (url.hostname === 'identitytoolkit.googleapis.com' ||
        url.hostname === 'securetoken.googleapis.com' ||
        url.hostname === 'accounts.google.com' ||
        url.hostname.includes('firebaseapp.com')) {
        e.respondWith(fetch(e.request));
        return;
    }

    // Estratégia Network-First para a página principal (HTML)
    if (e.request.mode === 'navigate') {
        e.respondWith(
            fetch(e.request).catch(() => caches.match('/index.html'))
        );
        return;
    }

    // Estratégia Stale-While-Revalidate para outros assets
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            const fetchPromise = fetch(e.request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    const responseToCache = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(e.request, responseToCache);
                    });
                }
                return networkResponse;
            });
            return cachedResponse || fetchPromise;
        })
    );
});
