/* eslint-disable */
// ─── NEXUS — service worker ─────────────────────────────────
//
// Stale-while-revalidate cache for the installed PWA. First load:
// nothing changes, files come from the network. Every subsequent
// load: serve from cache instantly + fetch fresh in the background
// to update the cache for next time. If the network is unreachable,
// the cached copy is what the user sees — that's the offline mode.
//
// We deliberately avoid pre-caching by asset-hash list because Vite
// rotates hashes on every build and a build-time SW generator would
// add a non-trivial plugin (vite-plugin-pwa requires Vite 7-, we ship
// Vite 8). The trade-off: no offline use until the user has visited
// once with that build, but no plugin pinning.
//
// Bumping CACHE_NAME forces all clients to discard the old cache —
// do this when shipping a major change you know is incompatible.

const CACHE_NAME = 'nexus-v1'

self.addEventListener('install', (event) => {
  // Fast install — no pre-cache list.
  event.waitUntil(self.skipWaiting())
})

self.addEventListener('activate', (event) => {
  // Drop any old-named caches so disk doesn't grow unbounded across
  // version bumps. Then take control of all open clients immediately.
  event.waitUntil(
    Promise.all([
      caches.keys().then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))),
      ),
      self.clients.claim(),
    ]),
  )
})

// Stale-while-revalidate for same-origin GET requests.
self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return

  const url = new URL(req.url)
  // Only cache same-origin assets. Cross-origin (Binance/Coinbase API,
  // Google Fonts, Anthropic API) are passed through untouched — caching
  // those would either break freshness or leak auth headers.
  if (url.origin !== self.location.origin) return

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(req)
      const networkPromise = fetch(req)
        .then((res) => {
          // Only cache successful basic responses. 4xx/5xx and opaque
          // (no-cors) responses go straight through.
          if (res && res.status === 200 && res.type === 'basic') {
            cache.put(req, res.clone())
          }
          return res
        })
        .catch(() => cached)
      // Serve cached if available; otherwise wait for the network.
      // The background fetch above still runs so the cache stays fresh.
      return cached || networkPromise
    }),
  )
})
