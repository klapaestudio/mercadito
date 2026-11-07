// Service worker básico: cachea los archivos estáticos y muestra una página
// sin conexión. Las páginas con datos del cliente nunca se guardan en caché.
const VERSION = 'mds-v3';
const STATIC = [
  '/offline.html',
  '/css/app.css',
  '/js/app.js',
  '/img/logo.svg',
  '/img/dibujo1.svg',
  '/img/dibujo2.svg',
  '/img/dibujo3.svg',
  '/img/icons/icon-192.png',
  '/img/icons/favicon-32.png',
  '/img/icons/favicon.svg',
  '/img/marca/papel.jpg',
  '/img/marca/expresiones/marta-dormida.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(STATIC)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;

  // Navegación: siempre red; si no hay conexión, página offline
  if (req.mode === 'navigate') {
    e.respondWith(fetch(req, { cache: 'no-cache' }).catch(() => caches.match('/offline.html')));
    return;
  }

  // Estáticos: red primero (para tomar cambios), caché como respaldo
  if (/\.(css|js|svg|png|jpg|webmanifest)$/.test(new URL(req.url).pathname)) {
    e.respondWith(
      fetch(req, { cache: 'no-cache' })
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
          return res;
        })
        .catch(() => caches.match(req)),
    );
  }
});
