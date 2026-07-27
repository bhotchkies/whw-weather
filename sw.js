// Service worker: caches the app shell so it opens with no signal.
// Forecast data is NOT cached here — app.js keeps that in localStorage so it can
// reason about how old it is. The network is always tried first for data.

const VERSION = 'whw-v6';
const SHELL = [
  './',
  './index.html',
  './app.js',
  './itinerary.js',
  './midge.js',
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

  // Shell: network first, cache as fallback.
  //
  // Deliberately NOT stale-while-revalidate. That pattern serves the previous
  // version on the first load after a deploy, so anyone who already installed
  // the app runs a version behind without any way to notice. The whole shell is
  // ~30 KB, so fetching it fresh whenever there is signal costs nothing, and the
  // cache still covers us completely once the signal is gone.
  e.respondWith(networkFirst(e.request));
});

const NET_TIMEOUT_MS = 3500;

async function networkFirst(request) {
  const cache = await caches.open(VERSION);
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), NET_TIMEOUT_MS);
    const res = await fetch(request, { signal: ctl.signal });
    clearTimeout(timer);
    if (res && res.ok) {
      cache.put(request, res.clone());
      return res;
    }
    throw new Error(`HTTP ${res && res.status}`);
  } catch {
    const hit = await cache.match(request);
    if (hit) return hit;
    // A navigation with nothing cached: fall back to the app shell so the
    // page still opens rather than showing the browser's offline error.
    if (request.mode === 'navigate') {
      const shell = await cache.match('./index.html') || await cache.match('./');
      if (shell) return shell;
    }
    throw new Error('offline and uncached');
  }
}
