const CACHE_NAME = 'soundscape-v1';
const AUDIO_CACHE = 'soundscape-audio-v1';
const IMAGE_CACHE = 'soundscape-images-v1';

// Files to cache on install
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('Caching static assets');
      return cache.addAll(STATIC_ASSETS).catch(err => {
        console.warn('Some assets failed to cache:', err);
        return Promise.resolve();
      });
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (
            cacheName !== CACHE_NAME &&
            cacheName !== AUDIO_CACHE &&
            cacheName !== IMAGE_CACHE
          ) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - cache-first for assets, network-first for API
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // API routes - network first, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.status === 200) {
            const cache = caches.open(CACHE_NAME);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((response) => {
            return response || new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // Audio files - cache first, network fallback
  if (request.destination === 'audio' || url.pathname.includes('/audio')) {
    event.respondWith(
      caches.open(AUDIO_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          return (
            response ||
            fetch(request)
              .then((fetchResponse) => {
                if (fetchResponse.status === 200) {
                  cache.put(request, fetchResponse.clone());
                }
                return fetchResponse;
              })
              .catch(() => {
                return new Response('Audio file not available offline', {
                  status: 503,
                });
              })
          );
        });
      })
    );
    return;
  }

  // Images - cache first, network fallback
  if (request.destination === 'image' || url.pathname.includes('/images')) {
    event.respondWith(
      caches.open(IMAGE_CACHE).then((cache) => {
        return cache.match(request).then((response) => {
          return (
            response ||
            fetch(request)
              .then((fetchResponse) => {
                if (fetchResponse.status === 200) {
                  cache.put(request, fetchResponse.clone());
                }
                return fetchResponse;
              })
              .catch(() => {
                return new Response(
                  '<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect fill="#ddd" width="100" height="100"/></svg>',
                  { headers: { 'Content-Type': 'image/svg+xml' } }
                );
              })
          );
        });
      })
    );
    return;
  }

  // Documents - stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(request).then((response) => {
        const fetchPromise = fetch(request).then((fetchResponse) => {
          if (fetchResponse.status === 200) {
            cache.put(request, fetchResponse.clone());
          }
          return fetchResponse;
        });

        return response || fetchPromise;
      });
    })
  );
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
