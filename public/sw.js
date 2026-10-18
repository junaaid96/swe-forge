/* Forgeline service worker (hand-rolled, no workbox).
 *
 * Strategy:
 * - Navigations (prerendered HTML): network-first with a timeout, so a new
 *   deploy is NEVER shadowed by a stale cached page. Cache holds last-known
 *   copies for offline use, with /offline.html as the final fallback.
 * - Hashed /assets/*, /vendor/*, *.wasm: cache-first (immutable URLs).
 * - /data/*, /og/*, /logos/*, /icons/*: stale-while-revalidate.
 * - Caches are versioned; VERSION is stamped at build time (prerender.mjs)
 *   and old caches are deleted on activate.
 */
const VERSION = '__BUILD_ID__';
const STATIC = `forgeline-static-${VERSION}`;
const PAGES = `forgeline-pages-${VERSION}`;
const DATA = `forgeline-data-${VERSION}`;
const VENDOR = `forgeline-vendor-${VERSION}`;

const PRECACHE = ['/offline.html', '/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png', '/'];
const NAV_TIMEOUT_MS = 4000;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(STATIC)
      .then((cache) => Promise.allSettled(PRECACHE.map((u) => cache.add(u))))
      // Do not skipWaiting: the app shows an "update available" toast and
      // the user chooses when to reload.
      .then(() => undefined),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('forgeline-') && ![STATIC, PAGES, DATA, VENDOR].includes(k)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') void self.skipWaiting();
});

function fetchWithTimeout(request, ms) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(new Error('timeout')), ms);
  return fetch(request, { signal: ctrl.signal }).finally(() => clearTimeout(t));
}

async function networkFirst(request, cacheName, fallback) {
  try {
    const res = await fetchWithTimeout(request, NAV_TIMEOUT_MS);
    if (res.ok) {
      const cache = await caches.open(cacheName);
      void cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallback) {
      const page = await caches.match(fallback);
      if (page) return page;
    }
    throw new Error('offline');
  }
}

async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) {
    const cache = await caches.open(cacheName);
    void cache.put(request, res.clone());
  }
  return res;
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const refresh = fetch(request)
    .then((res) => {
      if (res.ok) void cache.put(request, res.clone());
      return res;
    })
    .catch(() => null);
  if (cached) {
    void refresh;
    return cached;
  }
  const res = await refresh;
  if (res) return res;
  throw new Error('offline');
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, PAGES, '/offline.html'));
    return;
  }
  const p = url.pathname;
  if (p.startsWith('/assets/')) {
    event.respondWith(cacheFirst(request, STATIC));
    return;
  }
  if (p.startsWith('/vendor/') || p.endsWith('.wasm')) {
    event.respondWith(cacheFirst(request, VENDOR));
    return;
  }
  if (p.startsWith('/data/') || p.startsWith('/og/') || p.startsWith('/logos/') || p.startsWith('/icons/')) {
    event.respondWith(staleWhileRevalidate(request, DATA));
    return;
  }
  event.respondWith(networkFirst(request, PAGES, null));
});
