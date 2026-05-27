// ============================================
// ANNAPP40 — SERVICE WORKER
// ============================================

const CACHE_NAME = 'annapp40-v1';

const CACHE_URLS = [
  '/',
  '/index.html',
  '/css/main.css',
  '/js/config.js',
  '/js/auth.js',
  '/js/drive.js',
  '/js/sheets.js',
  '/js/ui.js',
  '/js/app.js',
];

// ── Install ───────────────────────────────────
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(CACHE_URLS))
  );
  self.skipWaiting();
});

// ── Activate ──────────────────────────────────
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ── Fetch — network first, cache fallback ─────
self.addEventListener('fetch', (e) => {
  // No interceptar crides a APIs de Google
  if (e.request.url.includes('googleapis.com') ||
      e.request.url.includes('accounts.google.com')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
