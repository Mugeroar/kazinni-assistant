const CACHE_NAME = 'kazinni-assistant-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/dashboard.html',
  '/manifest.json',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
  'https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700;14..32,800&display=swap',
  'https://i.postimg.cc/rFfXDj3L/kazinni-removebg-preview(1).png',
  'https://i.postimg.cc/dDPmwnLs/Untitled-design-4.webp',
  'https://i.postimg.cc/jSxH2nRT/20260412-1202-Image-Generation-simple-compose-01kp0eve31eaev725mtswjrr16.webp',
  'https://i.postimg.cc/Hs13q0mN/Gemini-Generated-Image-1e1lzk1e1lzk1e1l.webp',
  'https://i.postimg.cc/ZKLtykxW/Untitled-design-1.webp'
  // Removed Firebase files - they should NOT be cached
];

// Install event - cache all assets
self.addEventListener('install', event => {
  console.log('📦 Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('📦 Caching app assets');
        return cache.addAll(urlsToCache);
      })
      .catch(err => {
        console.error('❌ Cache addAll failed:', err);
        // Continue installation even if some files fail
      })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('⚡ Service Worker activating...');
  event.waitUntil(
    caches.keys().then(keys => {
      const deletePromises = keys
        .filter(key => key !== CACHE_NAME)
        .map(key => {
          console.log('🗑️ Deleting old cache:', key);
          return caches.delete(key);
        });
      return Promise.all(deletePromises);
    })
  );
  return self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  // Skip caching for Firebase and Google APIs (network only)
  if (url.hostname.includes('firebaseio.com') || 
      url.hostname.includes('googleapis.com') ||
      url.hostname.includes('gstatic.com')) {
    return; // Let browser handle these
  }

  // Skip caching for non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached response if found
        if (cachedResponse) {
          return cachedResponse;
        }

        // Otherwise fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Check if valid response
            if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
              return networkResponse;
            }

            // Clone and cache the response
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                try {
                  cache.put(event.request, responseToCache);
                } catch (err) {
                  console.warn('⚠️ Failed to cache:', event.request.url);
                }
              });

            return networkResponse;
          })
          .catch(() => {
            // Offline fallback
            if (event.request.mode === 'navigate') {
              return caches.match('/index.html')
                .then(fallback => {
                  if (fallback) return fallback;
                  return new Response('Offline - Please check your connection', {
                    status: 503,
                    statusText: 'Service Unavailable'
                  });
                });
            }
            
            // For images, return a placeholder
            if (event.request.destination === 'image') {
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#1a2235"/><text x="50%" y="50%" text-anchor="middle" dy=".3em" fill="#94a3b8" font-family="Arial" font-size="14">Image unavailable</text></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            }

            return new Response('Offline', { status: 503 });
          });
      })
  );
});

// Optional: Background sync for failed requests
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
