const CACHE_NAME = 'annapp40-v7';
const CACHE_URLS = [
  '/', '/index.html', '/main.css',
  '/config.js', '/auth.js', '/geocoder.js',
  '/sheets.js', '/drive.js', '/ui.js', '/app.js',
  '/manifest.json', '/icon-192.png', '/icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(c => {
      // Intentar afegir cada URL individualment per evitar errors si alguna falla
      return Promise.allSettled(CACHE_URLS.map(url => c.add(url)));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // No interceptar APIs externes
  const url = e.request.url;
  if (url.includes('googleapis.com') || url.includes('accounts.google.com') ||
      url.includes('maps.google') || url.includes('emailjs.com')) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
