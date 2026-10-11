/*!
 * N-Calc · sw.js — offline cache (network-first for data, cache-first for shell)
 */
const CACHE = 'ncalc-v3';
const SHELL = [
  './',
  './index.html',
  './converters.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/calculator.css',
  './css/converters.css',
  './js/version.js',
  './js/engine.js',
  './js/units.js',
  './js/units-data.js',
  './js/ui.js',
  './js/app.js',
  './js/converters.js',
  './math.js',
  './font.otf',
  './icons/favicon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const sameOrigin = url.origin === self.location.origin;

  // live FX rates: network first, fall back to the last good response
  if (!sameOrigin && /currency-api|frankfurter/.test(url.href)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request)),
    );
    return;
  }

  if (!sameOrigin) return;

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        fetch(request)
          .then((response) => {
            if (response && response.ok) caches.open(CACHE).then((cache) => cache.put(request, response));
          })
          .catch(() => {});
        return cached;
      }
      return fetch(request)
        .then((response) => {
          if (response && response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match('./index.html'));
    }),
  );
});
