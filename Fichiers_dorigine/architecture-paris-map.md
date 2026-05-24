# Architecture — Paris Map POI · Prototype Offline-First

> Architecte: Senior Frontend · Stack: Leaflet + OpenStreetMap + IndexedDB + Service Worker

---

## 1. Vue d'ensemble

Application web **100% locale**, zéro backend, zéro API serveur. Après un premier chargement en ligne, tout fonctionne hors ligne : tuiles cartographiques, données utilisateur, photos.

```
┌────────────────────────────────────────────────┐
│                NAVIGATEUR                       │
│                                                 │
│  ┌──────────┐   ┌──────────┐   ┌────────────┐  │
│  │  Leaflet │   │  App JS  │   │  UI Layer  │  │
│  │  + OSM   │   │ (vanilla)│   │ (HTML/CSS) │  │
│  └────┬─────┘   └────┬─────┘   └─────┬──────┘  │
│       │              │               │          │
│  ┌────▼──────────────▼───────────────▼──────┐   │
│  │         Service Worker (Cache API)        │   │
│  │   • Tuiles OSM   • Assets JS/CSS/HTML    │   │
│  └──────────────────────────────────────────┘   │
│                                                 │
│  ┌──────────────────────────────────────────┐   │
│  │              IndexedDB                   │   │
│  │   store: poi  │  store: photos           │   │
│  └──────────────────────────────────────────┘   │
└────────────────────────────────────────────────┘
```

---

## 2. Stack technique

| Couche | Technologie | Justification |
|---|---|---|
| Carte | **Leaflet.js 1.9** | Léger (42 KB), mature, excellent offline |
| Tuiles | **OpenStreetMap** (raster PNG) | Gratuit, aucune clé API |
| Cache tuiles | **Service Worker + Cache API** | Offline natif, stratégie stale-while-revalidate |
| Stockage POI | **IndexedDB** (via idb 8.x) | Clé-valeur async, supporte Blobs |
| Stockage photos | **IndexedDB** (Blob natif) | Pas de base64, moins de RAM |
| UI | **Vanilla JS + CSS custom** | Zéro dépendance, bundle minimal |
| Build | **Aucun** (HTML unique) | Prototype livrable immédiatement |

> **Choix délibéré : pas de framework (Solid/React/Vue).** Pour un prototype, un seul fichier HTML + 2 JS + 1 CSS = déploiement par glisser-déposer.

---

## 3. Structure du projet

```
paris-map/
├── index.html              # Entrée unique
├── sw.js                   # Service Worker
├── app.js                  # Logique principale
├── db.js                   # Couche IndexedDB (idb wrapper)
├── style.css               # UI
├── assets/
│   ├── marker-default.svg
│   ├── marker-photo.svg
│   └── icons/              # Icônes catégories
└── libs/
    ├── leaflet.js
    ├── leaflet.css
    └── idb.js              # ~4 KB, wrapper IndexedDB
```

---

## 4. Modèle de données — Point d'intérêt (POI)

### Store IndexedDB : `poi`

```json
{
  "id": "poi_1718000000000_a3f2",
  "version": 1,
  "createdAt": "2024-06-10T14:32:00.000Z",
  "updatedAt": "2024-06-10T15:00:00.000Z",

  "location": {
    "lat": 48.8566,
    "lng": 2.3522
  },

  "content": {
    "title": "Librairie Shakespeare & Co",
    "description": "Texte libre, markdown simple supporté.",
    "tags": ["librairie", "culture", "incontournable"],
    "category": "culture"
  },

  "photos": [
    {
      "photoId": "photo_1718000001_b7c1",
      "caption": "Façade principale",
      "order": 0
    }
  ],

  "ui": {
    "color": "#E63946",
    "icon": "book"
  }
}
```

### Store IndexedDB : `photos`

```json
{
  "photoId": "photo_1718000001_b7c1",
  "poiId": "poi_1718000000000_a3f2",
  "blob": Blob,
  "mimeType": "image/jpeg",
  "width": 1200,
  "height": 800,
  "sizeBytes": 245000,
  "createdAt": "2024-06-10T14:32:05.000Z"
}
```

### Catégories disponibles

```javascript
const CATEGORIES = {
  culture:      { label: "Culture",      icon: "book",   color: "#E63946" },
  food:         { label: "Restauration", icon: "fork",   color: "#F4A261" },
  nature:       { label: "Nature",       icon: "leaf",   color: "#2A9D8F" },
  architecture: { label: "Architecture", icon: "building",color: "#457B9D" },
  secret:       { label: "Secret",       icon: "star",   color: "#9B5DE5" },
  other:        { label: "Autre",        icon: "pin",    color: "#6B7280" }
};
```

---

## 5. Stratégie Offline-First

### 5.1 Tuiles cartographiques — Service Worker

```
Requête tuile OSM
       │
       ▼
Cache API (Cache Storage)
  ├── HIT  → retourne depuis le cache  [offline ✓]
  └── MISS → fetch réseau → stocke dans cache → retourne
```

**Stratégie : Cache-First pour les tuiles**
- Clé de cache : URL complète de la tuile (`//{s}.tile.openstreetmap.org/{z}/{x}/{y}.png`)
- Expiration : pas de TTL en prototype (les tuiles OSM évoluent lentement)
- Précaching : les 200 tuiles du zoom 12-15 sur Paris au premier chargement (~8 MB)

```javascript
// sw.js — précaching Paris au premier chargement
const PARIS_BOUNDS = { north: 48.90, south: 48.81, east: 2.41, west: 2.26 };
const ZOOM_LEVELS = [12, 13, 14, 15];
// Génère ~180 URLs de tuiles → mise en cache au install
```

### 5.2 Données utilisateur — IndexedDB

- Écriture synchrone à chaque action utilisateur
- Lecture au démarrage : reconstruction des marqueurs depuis IndexedDB
- Pas de synchronisation → source unique de vérité = navigateur local

### 5.3 Assets applicatifs — Service Worker

```javascript
// Cache au premier chargement (install event)
const APP_CACHE = ['/', '/app.js', '/db.js', '/style.css',
                   '/libs/leaflet.js', '/libs/leaflet.css', '/libs/idb.js'];
```

---

## 6. Flux utilisateur complet

### 6.1 Navigation carte
```
Ouverture → SW vérifie cache → Carte centrée Paris (48.856, 2.341) zoom 13
→ Leaflet charge tuiles (cache ou réseau) → Marqueurs POI chargés depuis IndexedDB
```

### 6.2 Ajout d'un POI
```
Clic sur carte
  → [Tooltip] "Clic long ou double-clic pour ajouter"
  → Double-clic sur position
  → Panneau latéral s'ouvre (slide-in)
  → Formulaire : Titre* | Description | Catégorie* | Tags | Photos
  → Import photos : <input type="file" accept="image/*" multiple>
      → FileReader → Blob → IndexedDB store:photos
  → Clic "Enregistrer"
      → Génération ID unique (timestamp + random)
      → Écriture IndexedDB store:poi
      → Ajout marqueur Leaflet sur la carte
      → Fermeture panneau
```

### 6.3 Consultation d'un POI
```
Clic sur marqueur
  → Popup Leaflet : titre + catégorie + [Voir détails]
  → Clic "Voir détails"
  → Panneau latéral : toutes infos + galerie photos (blob URL)
  → Boutons : [Modifier] [Supprimer]
```

### 6.4 Édition d'un POI
```
Clic [Modifier] dans le panneau
  → Formulaire pré-rempli
  → Modification + [Enregistrer]
  → updateOne IndexedDB + update marqueur Leaflet
```

### 6.5 Suppression
```
Clic [Supprimer] → Confirmation → deleteOne poi + delete photos associées
→ Retrait marqueur de la carte
```

### 6.6 Filtrage par catégorie
```
Toolbar haut de carte → chips de catégories
→ Toggle catégorie → show/hide layer Leaflet correspondant
```

---

## 7. Couche IndexedDB — db.js

```javascript
import { openDB } from './libs/idb.js';

const DB_NAME = 'paris-map-db';
const DB_VERSION = 1;

export const db = await openDB(DB_NAME, DB_VERSION, {
  upgrade(db) {
    // Store POI
    const poiStore = db.createObjectStore('poi', { keyPath: 'id' });
    poiStore.createIndex('category', 'content.category');
    poiStore.createIndex('createdAt', 'createdAt');

    // Store Photos
    const photoStore = db.createObjectStore('photos', { keyPath: 'photoId' });
    photoStore.createIndex('poiId', 'poiId');
  }
});

// API publique
export const POI = {
  getAll: () => db.getAll('poi'),
  get: (id) => db.get('poi', id),
  add: (poi) => db.add('poi', poi),
  update: (poi) => db.put('poi', { ...poi, updatedAt: new Date().toISOString() }),
  delete: async (id) => {
    const photos = await db.getAllFromIndex('photos', 'poiId', id);
    const tx = db.transaction(['poi', 'photos'], 'readwrite');
    await tx.objectStore('poi').delete(id);
    for (const p of photos) await tx.objectStore('photos').delete(p.photoId);
    await tx.done;
  }
};

export const Photos = {
  getByPoi: (poiId) => db.getAllFromIndex('photos', 'poiId', poiId),
  add: (photo) => db.add('photos', photo),
  delete: (photoId) => db.delete('photos', photoId)
};
```

---

## 8. Initialisation Leaflet — app.js (extrait)

```javascript
// Initialisation carte
const map = L.map('map', {
  center: [48.8566, 2.3522],
  zoom: 13,
  zoomControl: true,
  preferCanvas: true      // Performance mobile
});

// Tuile OSM avec fallback offline
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors',
  maxZoom: 19,
  minZoom: 10,
  crossOrigin: true       // Requis pour SW cache
}).addTo(map);

// Couches par catégorie
const layers = {};
for (const [key] of Object.entries(CATEGORIES)) {
  layers[key] = L.layerGroup().addTo(map);
}

// Chargement des POI existants
const pois = await POI.getAll();
pois.forEach(poi => addMarkerToMap(poi));

// Événement ajout
map.on('dblclick', async (e) => {
  openPoiForm({ lat: e.latlng.lat, lng: e.latlng.lng });
});
```

---

## 9. Gestion des images

```javascript
// Lecture du fichier → Blob → IndexedDB
async function handlePhotoUpload(files, poiId) {
  const results = [];
  for (const file of files) {
    const blob = file;                    // Blob natif, pas de base64
    const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    await Photos.add({
      photoId,
      poiId,
      blob,                               // Stockage Blob direct dans IndexedDB
      mimeType: file.type,
      sizeBytes: file.size,
      createdAt: new Date().toISOString()
    });
    results.push(photoId);
  }
  return results;
}

// Affichage : création d'une URL objet temporaire
async function renderPhotos(poiId, container) {
  const photos = await Photos.getByPoi(poiId);
  for (const photo of photos) {
    const url = URL.createObjectURL(photo.blob);  // Blob → URL locale
    const img = document.createElement('img');
    img.src = url;
    img.onload = () => URL.revokeObjectURL(url);  // Libération mémoire
    container.appendChild(img);
  }
}
```

> **Pourquoi Blob et pas base64 ?**
> Un Blob de 1 MB reste 1 MB en mémoire. En base64, il devient ~1.37 MB ET mobilise la heap JS. Pour 50 photos : base64 = ~68 MB de strings, Blob = ~50 MB de binaire natif.

---

## 10. Recommandations UX/UI

### Layout
```
┌─────────────────────────────────────────────┐
│ [Logo]  Paris Map          [🔍] [Export]     │  ← Header fixe 48px
├─────────────────────────────────────────────┤
│ [Toutes][Culture][Food][Nature][...]         │  ← Filter bar 40px
├──────────────────────────────┬──────────────┤
│                              │              │
│         CARTE LEAFLET        │  PANNEAU     │
│         (plein écran)        │  LATÉRAL     │
│                              │  (slide-in)  │
│                              │  400px       │
└──────────────────────────────┴──────────────┘
```

### Mobile (< 768px)
- Panneau latéral → **bottom sheet** (translateY animation)
- Filter bar → scroll horizontal
- Formulaire → plein écran
- Zoom controls → coins bas droit

### Principes UI
- **Marqueurs** : SVG colorés par catégorie, taille 32px, ombre légère
- **Popup** : max-width 280px, photo thumbnail si disponible
- **Formulaire** : champs spacés, tag input avec chips, drag-drop photos
- **Palette** : fond blanc cassé #F8F7F4, noir texte #1A1A1A, accents par catégorie
- **Typographie** : `DM Sans` (UI) + `Playfair Display` (titres POI)

---

## 11. Export des données

```javascript
// Export JSON (backup local)
async function exportData() {
  const pois = await POI.getAll();
  // Photos → base64 pour portabilité JSON
  const full = await Promise.all(pois.map(async poi => {
    const photos = await Photos.getByPoi(poi.id);
    const photosB64 = await Promise.all(photos.map(async p => ({
      ...p,
      blob: undefined,
      data: await blobToBase64(p.blob)
    })));
    return { ...poi, photosData: photosB64 };
  }));
  downloadJSON(full, `paris-map-export-${Date.now()}.json`);
}
```

---

## 12. Étapes de développement — MVP priorisé

### Sprint 1 — Fondations (Jour 1-2)
- [ ] Structure HTML/CSS de base (layout carte + panneau)
- [ ] Intégration Leaflet + tuiles OSM
- [ ] Service Worker minimal (cache assets + tuiles)
- [ ] IndexedDB : création des stores

### Sprint 2 — POI Core (Jour 3-4)
- [ ] Double-clic → formulaire d'ajout
- [ ] Sauvegarde POI dans IndexedDB
- [ ] Chargement et affichage des marqueurs au démarrage
- [ ] Popup de consultation

### Sprint 3 — Photos (Jour 5)
- [ ] Import de fichiers → Blob → IndexedDB
- [ ] Affichage galerie dans le panneau détail
- [ ] Suppression de photos

### Sprint 4 — Édition & Filtres (Jour 6)
- [ ] Édition et suppression de POI
- [ ] Filter bar par catégorie
- [ ] Tags avec chips interactifs

### Sprint 5 — Polish (Jour 7)
- [ ] Responsive mobile (bottom sheet)
- [ ] Précaching tuiles Paris au premier chargement
- [ ] Export JSON
- [ ] Tests offline complets

---

## 13. Limites connues du prototype

| Limite | Impact | Mitigation V2 |
|---|---|---|
| Stockage IndexedDB ~500 MB | ~200 photos max | Compression images côté client |
| Pas de recherche full-text | Navigation par catégorie seulement | FlexSearch.js (offline) |
| Données liées au navigateur | Perte si clear data | Export/import JSON |
| Un seul utilisateur | Pas de partage | P2P via WebRTC ou export |

---

## 14. Améliorations V2

### V2.1 — Compression et optimisation des images
Intégrer `browser-image-compression` (npm) pour réduire automatiquement les photos importées à 1200px max / qualité 80% avant stockage. Ajouter un indicateur de stockage utilisé (quota API) avec alerte à 80%.

### V2.2 — Recherche et filtrage avancés
Intégrer **FlexSearch.js** (100% offline, 5 KB) pour indexer les titres, descriptions et tags des POI. Ajouter une barre de recherche avec résultats en temps réel et highlight sur la carte des POI correspondants.

### V2.3 — Export et partage P2P
Permettre l'export d'un fichier `.parismap` (JSON compressé + images encodées) importable sur un autre navigateur. En option avancée, implémenter un partage direct via **WebRTC DataChannel** (PeerJS) pour transférer sa carte à un autre utilisateur sur le même réseau local — zéro serveur.