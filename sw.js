/**
 * Service Worker for Todo List PWA
 * Enables offline functionality and caching
 */

const CACHE_NAME = 'todo-list-v1';
const ASSETS_TO_CACHE = [
  '/todo-list/index.html',
  '/todo-list/css/style.css',
  '/todo-list/js/app.js',
  '/todo-list/js/i18n.js',
  '/todo-list/manifest.json',
  '/todo-list/icon-192.svg',
  '/todo-list/icon-512.svg'
];

// Locale files to cache
const LOCALE_FILES = [
  '/todo-list/js/locales/ko.json',
  '/todo-list/js/locales/en.json',
  '/todo-list/js/locales/ja.json',
  '/todo-list/js/locales/zh.json',
  '/todo-list/js/locales/es.json',
  '/todo-list/js/locales/pt.json',
  '/todo-list/js/locales/id.json',
  '/todo-list/js/locales/tr.json',
  '/todo-list/js/locales/de.json',
  '/todo-list/js/locales/fr.json',
  '/todo-list/js/locales/hi.json',
  '/todo-list/js/locales/ru.json'
];

// Install event: cache assets
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll([...ASSETS_TO_CACHE, ...LOCALE_FILES]).catch(err => {
        console.error('Cache addAll error:', err);
        // Continue even if some assets fail to cache
        return cache.addAll(ASSETS_TO_CACHE);
      });
    })
  );
  self.skipWaiting();
});

// Activate event: clean old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', event => {
  // Only handle GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests
  if (!event.request.url.includes('/todo-list/')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached response if available
        if (response) {
          return response;
        }

        // Fetch from network
        return fetch(event.request)
          .then(response => {
            // Don't cache non-successful responses
            if (!response || response.status !== 200 || response.type === 'error') {
              return response;
            }

            // Clone response for caching
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, responseClone);
            });

            return response;
          })
          .catch(() => {
            // Offline fallback
            return new Response('Offline - Using cached data', {
              status: 200,
              statusText: 'OK'
            });
          });
      })
  );
});

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
