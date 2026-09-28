// Service worker : rend le site installable et garde une copie de secours des fichiers du site.
// Toujours le réseau d'abord (la dernière version s'affiche) ; l'API et les cartes ne sont jamais mises en cache.
const CACHE = 'rengo-v1';
const FICHIERS = ['/', '/localisation.js', '/aide.js', '/assets/logo.png', '/assets/logo-sombre.png', '/assets/icone.png', '/assets/icone-sombre.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FICHIERS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  e.respondWith(
    fetch(e.request)
      .then((reponse) => {
        if (reponse.ok) { const copie = reponse.clone(); caches.open(CACHE).then((c) => c.put(e.request, copie)); }
        return reponse;
      })
      .catch(() => caches.match(e.request)
        .then((r) => r || (e.request.mode === 'navigate' ? caches.match('/') : null))
        .then((r) => r || Response.error()))
  );
});
