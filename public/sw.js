const CACHE_NAME = 'ryston-cache-v1'
const ASSETS_TO_CACHE = [
  '/', // index.html
  '/favicon.ico',
  '/index.html',
  '/src/main.jsx',
  '/src/App.jsx',
  '/src/styles.css',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  // add other static assets you want offline
]

/* ---------------- INSTALL EVENT ---------------- */
self.addEventListener('install', event => {
  console.log('[SW] Installing service worker...')
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching static assets...')
      return cache.addAll(ASSETS_TO_CACHE)
    })
  )
  self.skipWaiting()
})

/* ---------------- ACTIVATE EVENT ---------------- */
self.addEventListener('activate', event => {
  console.log('[SW] Activating service worker...')
  // Delete old caches
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Removing old cache:', key)
            return caches.delete(key)
          }
        })
      )
    )
  )
  self.clients.claim()
})

/* ---------------- FETCH EVENT ---------------- */
self.addEventListener('fetch', event => {
  const { request } = event

  // Only cache GET requests
  if (request.method !== 'GET') return

  event.respondWith(
    caches.match(request).then(cachedResponse => {
      if (cachedResponse) {
        // Serve cached first
        return cachedResponse
      }

      // Otherwise, fetch from network
      return fetch(request)
        .then(networkResponse => {
          // Only cache successful responses
          if (!networkResponse || networkResponse.status !== 200) return networkResponse

          // Clone response for caching
          const clonedResponse = networkResponse.clone()
          caches.open(CACHE_NAME).then(cache => cache.put(request, clonedResponse))
          return networkResponse
        })
        .catch(() => {
          // Optionally, serve fallback page/image when offline
          if (request.destination === 'document') {
            return caches.match('/index.html')
          }
        })
    })
  )
})
