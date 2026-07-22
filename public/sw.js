const CACHE_NAME = 'ikizame-v4';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/ifashanyigisho.html',
    '/exam.html',
    '/exam-result.html',
    '/assets/js/exam-image-utils.js?v=20260718',
    '/assets/css/style.css',
    'https://cloudflare.com'
];

// Install Event: Save baseline layouts to mobile cache storage
self.addEventListener('install', (e) => {
    e.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    e.waitUntil(
        caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))))
    );
    self.clients.claim();
});

// Fetch Event: prefer fresh network for exam flows and app shell assets
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    const isNavigation = e.request.mode === 'navigate';
    const isExamFlow = url.pathname === '/exam-result' || url.pathname === '/exam-result.html' || url.pathname === '/exam' || url.pathname === '/amanota';
    const isAsset = /\.(css|js|png|jpg|jpeg|gif|webp|svg|ico|woff2?|ttf)$/.test(url.pathname);

    if (isNavigation || isExamFlow || isAsset) {
        e.respondWith(
            fetch(e.request)
                .then((response) => {
                    const copy = response.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(e.request, copy));
                    return response;
                })
                .catch(() => caches.match(e.request).then((cached) => cached || fetch(e.request)))
        );
        return;
    }

    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || fetch(e.request);
        })
    );
});
