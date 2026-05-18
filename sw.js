const CACHE_NAME = 'paris-map-app-v1';
const ASSETS_TO_CACHE = [
  '/', '/index.html', '/style.css', '/app.js', '/db.js', '/libs/leaflet.min.js', '/libs/leaflet.min.css'
];
const OFFLINE_URL = '/index.html';

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET') return;

  // Cache-first for Leaflet local assets and app shell
  if (ASSETS_TO_CACHE.includes(url.pathname)) {
    event.respondWith(
      caches.match(event.request).then(cached => cached || fetch(event.request).then(resp => {
        const copy = resp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, copy));
        return resp;
      }))
    );
    return;
  }

  // Simple cache-first for OSM tiles
  if (url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open('osm-tiles').then(cache =>
        cache.match(event.request).then(resp => resp || fetch(event.request).then(fresp => { cache.put(event.request, fresp.clone()); return fresp; }))
      )
    );
    return;
  }

  // Network-first for other requests, fallback to cache or offline page
  event.respondWith(
    fetch(event.request).then(resp => {
      const cacheResp = resp.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(event.request, cacheResp));
      return resp;
    }).catch(() => caches.match(event.request).then(cached => cached || (event.request.mode === 'navigate' ? caches.match(OFFLINE_URL) : undefined)))
  );
});
