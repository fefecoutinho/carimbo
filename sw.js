// Guarda o app no iPhone para abrir rápido e funcionar sem internet.
// Troque VERSION a cada atualização para o app baixar a versão nova.
const VERSION = 'carimbo-1.0.4';
const ASSETS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/app.css',
  'js/app.js',
  'js/store.js',
  'js/dates.js',
  'js/fx.js',
  'js/nav.js',
  'js/paper.js',
  'js/scene.js',
  'js/sheets.js',
  'js/ui.js',
  'js/screens/today.js',
  'js/screens/month.js',
  'js/screens/progress.js',
  'js/screens/settings.js',
  'vendor/three.module.min.js',
  'vendor/three.core.min.js',
  'vendor/addons/RoundedBoxGeometry.js',
  'vendor/addons/RoomEnvironment.js',
  'fonts/unbounded-latin-900-normal.woff2',
  'fonts/unbounded-latin-700-normal.woff2',
  'fonts/caveat-latin-700-normal.woff2',
  'icons/apple-touch-icon.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
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
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req).then((res) => {
      if (res.ok) {
        const copy = res.clone();
        caches.open(VERSION).then((c) => c.put(req, copy));
      }
      return res;
    }).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))),
  );
});
