// Service worker: caches the app shell so it opens with no signal.
// Forecast data is NOT cached here — app.js keeps that in localStorage so it can
// reason about how old it is. The network is always tried first for data.

const VERSION = 'whw-v3';
const SHELL = [
  './',
  './index.html',
  './app.js',
  './itinerary.js',
  './midge.js',
  './snapshot.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-180.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      // addAll fails the whole install if any single file 404s, so add
      // individually and tolerate misses.
      .then((c) => Promise.all(SHELL.map((u) => c.add(u).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Never intercept the weather API — app.js handles its own timeout and
  // fallback, and a cached forecast masquerading as fresh would be dangerous.
  if (url.hostname.endsWith('open-meteo.com')) return;
  if (e.request.method !== 'GET') return;

  // Shell: serve from cache immediately, refresh in the background.
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const net = fetch(e.request)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(VERSION).then((c) => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => hit);
      return hit || net;
    })
  );
});
