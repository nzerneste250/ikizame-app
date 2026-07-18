const CACHE_NAME = 'ikizame-v2';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
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

// Fetch Event: Serve directly from local cache fallback to internet if updated
self.addEventListener('fetch', (e) => {
    const url = new URL(e.request.url);
    if (url.pathname === '/exam-result' || url.pathname === '/exam-result.html' || url.pathname === '/exam') {
        e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
        return;
    }
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || fetch(e.request);
        })
    );
});
