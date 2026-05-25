/* Tony Shopping — service worker
 *
 * Strategy
 *   - HTML navigations: network-first, fall back to cache, fall back to /offline.
 *   - /_next/static + /icon.svg + /manifest.webmanifest: cache-first (immutable).
 *   - Everything else: pass through.
 *
 * The cache name is versioned so a forced reload after deploy clears the
 * previous build's assets.
 */
const CACHE = 'tony-shell-v1';
const STATIC_PREFIX = ['/_next/static/', '/icon.svg', '/manifest.webmanifest'];

self.addEventListener('install', (event) => {
  // Prime the cache with the offline page so the navigation fallback works
  // even on the user's very first time offline.
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['/offline']).catch(() => {
        /* network might fail at install; don't block activation */
      }),
    ),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))),
  );
  self.clients.claim();
});

function isStatic(url) {
  return STATIC_PREFIX.some((p) => url.pathname === p || url.pathname.startsWith(p));
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests → network-first.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Stash a copy so a follow-up offline visit can serve it.
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match(req).then((hit) => hit || caches.match('/offline')),
        ),
    );
    return;
  }

  // Static assets → cache-first.
  if (isStatic(url)) {
    event.respondWith(
      caches.match(req).then((hit) => {
        if (hit) return hit;
        return fetch(req).then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        });
      }),
    );
    return;
  }

  // Everything else: pass-through.
});
