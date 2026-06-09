const CACHE_NAME = 'ikizame-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/exam.html',
    '/exam-result.html',
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
});

// Fetch Event: Serve directly from local cache fallback to internet if updated
self.addEventListener('fetch', (e) => {
    e.respondWith(
        caches.match(e.request).then((cachedResponse) => {
            return cachedResponse || fetch(e.request);
        })
    );
});
