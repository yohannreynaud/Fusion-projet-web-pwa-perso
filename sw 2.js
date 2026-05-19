const SW_VERSION = 'v19';
const CACHE_NAME = 'v19';

const CORE_ASSETS = [
  '/pwa/',
  '/pwa/index.html',
  '/pwa/manifest.json'
];


self.addEventListener('install', event => { // Ce qui s'exécute lorsque index.html demande au navigateur d'installer un nouveau SW (lors du premier chargement ou après un hard reset). 
    
    event.waitUntil(
        // Le bloc suivant est une promesse qui tente de mettre en cache les ressources essentielles. 
        // Si la mise en cache réussit, le SW s'installera et prendra le contrôle. 
        // Si la mise en cache échoue, le SW ne s'installera pas, 
        // ce qui est préférable à un SW qui ne possède pas les ressources 
        // nécessaires pour fonctionner correctement.
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            try {
                console.log('[Cache] Tentative de mise en cache des ressources essentielles', CORE_ASSETS);
                await cache.addAll(CORE_ASSETS); // Ici on essaie de charger toutes les ressources essentielles
                console.log('[Cache] Mise en cache réussie pour', CORE_ASSETS);
            } catch (err) {
                console.error('[Cache] Échec de mise en cache des ressources essentielles', CORE_ASSETS, err);
                throw err;
            }
        })()
    );
});

// Activation
self.addEventListener('activate', event => {
    event.waitUntil(
        (async () => {
            // Nettoyage des anciens caches
            const keys = await caches.keys();
            await Promise.all(
                keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key))
            );

            await self.clients.claim();

            console.log('[SW] Activé — version', SW_VERSION);

            // Envoie la version à toutes les pages ouvertes après claim()
            // (les clients sont maintenant contrôlés)
            const clientsList = await self.clients.matchAll({ includeUncontrolled: false });
            for (const client of clientsList) {
                client.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
            }
        })()
    );
});

// Fetch
self.addEventListener('fetch', event => {
    const req = event.request;

    // HTML → network-first (important pour iOS)
    if (req.mode === 'navigate') {
        event.respondWith(
            (async () => {
                try {
                    const fresh = await fetch(req, { cache: 'no-store' });
                    const cache = await caches.open(CACHE_NAME);
                    cache.put(req, fresh.clone());
                    return fresh;
                } 
                catch {
                    return caches.match(req) || caches.match('/pwa/index.html');
                }
            })()
        );
        return;
    }

    // Autres fichiers → cache-first
    event.respondWith(
        caches.match(req).then(cached => {
            return cached || fetch(req).then(res => {
                caches.open(CACHE_NAME).then(cache => cache.put(req, res.clone()));
                return res;
            });
        })
    );
});

// Messages
self.addEventListener('message', event => {
    if (event.data?.type === 'SKIP_WAITING') {
        console.log('[SW] skipWaiting demandé');
        self.skipWaiting();
    }

    if (event.data?.type === 'GET_VERSION') {
        console.log('[SW] Version demandée →', SW_VERSION);
        event.source.postMessage({ type: 'SW_VERSION', version: SW_VERSION });
    }
});
