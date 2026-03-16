// service-worker.js — Cache offline PWA H2M
// Stratégie : cache-first pour assets statiques, network-first pour /api/

const CACHE_NAME = 'pointage-h2m-v1';
const STATIC_ASSETS = [
  '/',
  '/style.css',
  '/app.js',
  '/utils.js',
  '/admin.js',
  '/admin.html',
  '/manifest.json',
];

// Installation : mettre en cache les assets statiques
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('Service worker: certains assets non mis en cache', err);
      });
    })
  );
  self.skipWaiting();
});

// Activation : supprimer les anciens caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch : network-first pour /api/, cache-first pour le reste
self.addEventListener('fetch', (event) => {
  const url = event.request.url;

  // Toujours réseau pour les appels API
  if (url.includes('/api/')) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response(
          JSON.stringify({ success: false, error: 'Pas de connexion réseau' }),
          { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
      })
    );
    return;
  }

  // Cache-first pour les assets statiques
  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      }).catch(() => {
        // Page offline pour les navigations
        if (event.request.mode === 'navigate') {
          return caches.match('/');
        }
      });
    })
  );
});
