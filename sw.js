/* ============================================================
   DAYBOOK MAX — Service Worker
   Upload this file alongside index.html in your GitHub repo.
   Both files must be in the SAME folder (root or subfolder).
   ============================================================ */

const CACHE_NAME = 'daybook-max-v4';

// Files to cache for offline use
// The XLSX library is fetched from CDN and cached on first load
const CORE_ASSETS = [
  './',
  './index.html'
];

// ── Install: cache core app shell ──────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: clean up old caches ──────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first for app, network-first for CDN ──────
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') return;

  const url = event.request.url;

  // CDN resources (XLSX library etc): try network, fall back to cache
  if (url.includes('cdnjs.cloudflare.com')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request)
          .then(cached => cached || new Response('', { status: 503 }))
        )
    );
    return;
  }

  // App shell: cache-first, update cache in background
  event.respondWith(
    caches.match(event.request).then(cached => {
      const fetchPromise = fetch(event.request).then(response => {
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => null);

      // Return cached immediately if available, otherwise wait for network
      return cached || fetchPromise || caches.match('./').then(fallback =>
        fallback || new Response(
          '<h1 style="font-family:system-ui;text-align:center;padding:40px">📒 Daybook MAX<br><small>You are offline. Please connect to load.</small></h1>',
          { headers: { 'Content-Type': 'text/html' } }
        )
      );
    })
  );
});
