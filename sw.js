const SW_VERSION = 'v3';
const CACHE_NAME = `paris-map-app-${SW_VERSION}`;
const ASSETS_TO_CACHE = [
  '/', '/index.html', '/style.css', '/app.js', '/db.js', '/libs/leaflet.min.js', '/libs/leaflet.min.css'
];
const OFFLINE_URL = '/index.html';

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(ASSETS_TO_CACHE);
  })());
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter(key => key !== CACHE_NAME && key !== 'osm-tiles').map(key => caches.delete(key))
    );
    await self.clients.claim();
    const clientsList = await self.clients.matchAll({ includeUncontrolled: false });
    for (const client of clientsList) {
      client.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
    }
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  const isAppShell = ASSETS_TO_CACHE.includes(url.pathname);
  const isOsmTile = url.hostname.includes('tile.openstreetmap.org');

  if (isAppShell) {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  if (isOsmTile) {
    event.respondWith((async () => {
      const cache = await caches.open('osm-tiles');
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      cache.put(request, response.clone());
      return response;
    })());
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request, { cache: 'no-store' });
        const cache = await caches.open(CACHE_NAME);
        cache.put(request, response.clone());
        return response;
      } catch (err) {
        const cache = await caches.open(CACHE_NAME);
        return await cache.match(request) || await cache.match(OFFLINE_URL);
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    const cache = await caches.open(CACHE_NAME);
    cache.put(request, response.clone());
    return response;
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data?.type === 'GET_VERSION') {
    event.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
  }
});
