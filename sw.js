const CACHE_NAME = 'ourwallet-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/app.js',
    '/firebase.js',
    '/modules/auth.js',
    '/modules/cards.js',
    '/modules/constants.js',
    '/modules/goals.js',
    '/modules/transactions.js',
    '/modules/ui.js',
    '/modules/utils.js'
];

self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
    );
});

self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((res) => res || fetch(e.request))
    );
});
