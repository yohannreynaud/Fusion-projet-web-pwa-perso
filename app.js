// ═══════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════
const CATEGORIES = {
  culture:      { label: "Culture",       icon: "📚", color: "#E63946" },
  food:         { label: "Restauration",  icon: "🍽️", color: "#F4A261" },
  nature:       { label: "Nature",        icon: "🌿", color: "#2A9D8F" },
  architecture: { label: "Architecture",  icon: "🏛️", color: "#457B9D" },
  secret:       { label: "Secret",        icon: "⭐", color: "#9B5DE5" },
  other:        { label: "Autre",         icon: "📍", color: "#6B7280" },
};


/* ------------------------------
    ENREGISTREMENT DU SERVICE WORKER
------------------------------ */

if ('serviceWorker' in navigator) { // Teste si le navigateur supporte les service workers
    window.addEventListener('load', async () => { // vraie une fois que la page est complètement chargée
        
        // Si un SW contrôle déjà la page, on lui demande sa version pour l'afficher dans la console (utile aussi pour vérifier que le skipWaiting a bien fonctionné après une mise à jour).
        if (navigator.serviceWorker.controller) {
            console.log('[SW] Un SW contrôle déjà cette page. Récupération de sa version…');
            navigator.serviceWorker.controller.postMessage({ type: 'GET_VERSION' });
        }

        console.log('[SW] Récupération de la dernière version du SW (sw.js) mise à disposition par le serveur…');
        // représente l’inscription du SW pour le scope courant (ici : /pwa/). C’est un objet qui contient des infos sur le SW installé, et qui émet des événements liés à son cycle de vie (install, updatefound, etc.).
        const registration = await navigator.serviceWorker.register('sw.js');
        console.log('[SW] La version du SW du serveur est récupérée. Comparaison avec le SW actif…');
        /*
        Précisions sur la gestion des SW par le navigateur : un SW peut avoir trois états : active (contrôle la page), waiting (en attente de prendre le contrôle) et installing (en cours d'installation).
        Au moment du register(), on pourrait se retrouver avec 3 SW : 1 SW active, 1 SW caiting et 1 SW installing. 
        En réalité le navigateur éjecte automatiquement le SW waiting dès qu'il détecte un SW installing (le SW installing deviendra le nouveau SW waiting).
        */
        if (registration.active && !registration.waiting && !registration.installing) {
            console.log('[SW] Le SW chargé depuis le serveur est identique au SW actif : aucune mise à jour requise.');
        }

        /*
        Au moment où on recharge la page, on vérifie si un SW est en attente de prise de contrôle (waiting)
        Cela arrive quand un SW a été précédement installé mais n'a jamais
        pu prendre le contrôle (pas de skipWaiting, onglet non fermé).
        On a alors 2 SW :
        - N°1 : active  (contrôle la page)
        - N°2 : waiting (prêt à prendre le contrôle dès skipWaiting)
        */
        if (registration.waiting) { // vrai si un SW (N°2) est  installé et en attente de prendre le contrôle (waiting) → on affiche la bannière qui permet de déclencher skipWaiting et ainsi activer le nouveau SW.
            console.log('[SW] Un SW a été installé, il est en attente de prise de contrôle. Veuillez rafraîchir la page pour l\'activer.');
            showUpdateBanner(registration);
        }

        // EventListener qui détecte l'arrivée d'un nouveau SW (updatefound) → on affiche la bannière qui permet de déclencher skipWaiting et ainsi activer le nouveau SW.
        registration.addEventListener('updatefound', () => {
            console.log('[SW] Nouvelle version du SW trouvée → tentative d\'installation…');
            const newWorker = registration.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed') {
                    console.log('[SW] Nouveau SW installé et prêt à remplacer le SW actif → Veuillez valider le changement de SW en cliquant sur le bouton de la bannière de mise à jour.');
                    showUpdateBanner(registration);
                }
            });
        });

        // EventListener qui détecte le changement de SW controlant la page (controllerchange) → on recharge la page pour actualiser l\'affichage des ressources.
        navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[SW] Changement de SW controlant la page → reload de la page pour actualiser l\'affichage des ressources');
            window.location.reload();
        });

        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data?.type === 'SW_VERSION') {
                console.log('[SW] Version du SW actif :', event.data.version);
            }
        });

        /* ------------------------------
        POLLING PÉRIODIQUE
        Vérifie toutes les 60s si sw.js a changé sur le serveur.
        ------------------------------ */
        setInterval(async () => {
            try {
                await registration.update();
                console.log('[SW] Vérification mise à jour…');
            } catch (err) {
                console.warn('[SW] Échec vérification mise à jour', err);
            }
        }, 60 * 1000); // toutes les 60 secondes
    });
}


function showUpdateBanner(registration) {
    /* ------------------------------
        BANNIÈRE DE MISE À JOUR DU SW
    ------------------------------ */
    if (document.getElementById('pwa-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.style.position = 'fixed';
    banner.style.bottom = '0';
    banner.style.left = '0';
    banner.style.right = '0';
    banner.style.padding = '12px 16px';
    banner.style.background = '#222';
    banner.style.color = '#fff';
    banner.style.display = 'flex';
    banner.style.justifyContent = 'space-between';
    banner.style.alignItems = 'center';
    banner.style.zIndex = '9999';

    const text = document.createElement('span');
    text.textContent = 'Une nouvelle version du SW est disponible.';

    const updateBtn = document.createElement('button');
    updateBtn.textContent = 'Mettre à jour';
    updateBtn.style.marginLeft = '8px';

    updateBtn.addEventListener('click', () => {
    if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    });

    banner.appendChild(text);
    banner.appendChild(updateBtn);
    document.body.appendChild(banner);
}

async function hardResetPWA() {
    /* ------------------------------
        RESET COMPLET DE LA PWA
    ------------------------------ */
    console.log('[RESET] Réinitialisation complète…');

    // FIX : on désactive le listener controllerchange AVANT de déclencher
    // skipWaiting, pour éviter que le reload automatique interrompe les
    // étapes suivantes (vidage des caches, unregister) qui n'auraient
    // jamais le temps de s'exécuter.
    navigator.serviceWorker.oncontrollerchange = null;

    const reg = await navigator.serviceWorker.getRegistration();

    try {
    // 1) Forcer une mise à jour
    if (reg) {
        console.log('[RESET] registration.update()');
        await reg.update();
    }

    // 2) Forcer skipWaiting si un SW est en attente
    if (reg?.waiting) {
        console.log('[RESET] skipWaiting()');
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        // On attend que le nouveau SW prenne le contrôle avant de continuer
        await new Promise(resolve => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
        });
    }

    // 3) Vider tous les caches
    const keys = await caches.keys();
    for (const key of keys) {
        console.log('[RESET] Suppression du cache', key);
        await caches.delete(key);
    }

    // 4) Désenregistrer le SW
    if (reg) {
        console.log('[RESET] unregister()');
        await reg.unregister();
    }

    } catch (err) {
    console.error('[RESET] Erreur', err);
    }

    // 5) Reload final
    console.log('[RESET] Reload');
    window.location.reload();
}



// ═══════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════
let map;
const layers = {};
const markers = {};
let panelMode = null;
let editPoiId = null;
let pendingLatLng = null;
let formPhotos = [];
let formTags = [];
let activeCategories = new Set(Object.keys(CATEGORIES));
let allPois = [];

// ═══════════════════════════════════════════════
// MAP INIT
// ═══════════════════════════════════════════════
function initMap() {
  map = L.map('map', {
    center: [48.8566, 2.3522],
    zoom: 13,
    preferCanvas: true,
    zoomControl: false,
    tap: false
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap',
    maxZoom: 19,
    minZoom: 10,
    crossOrigin: true,
  }).addTo(map);

  for (const key of Object.keys(CATEGORIES)) {
    layers[key] = L.layerGroup().addTo(map);
  }

  // ───────────────────────────────────────────────
  // APPUI LONG (ne bloque PAS les clics Leaflet)
  // ───────────────────────────────────────────────
  let longPressTimer = null;
  const LONG_PRESS_DURATION = 600;
  let moved = false;

  map.on('pointerdown', e => {
    moved = false;

    const latlng = e.latlng;
    if (!latlng) return;

    longPressTimer = setTimeout(() => {
      longPressTimer = null;

      // IMPORTANT : on NE bloque PAS le click Leaflet
      pendingLatLng = { lat: latlng.lat, lng: latlng.lng };
      openAddForm();
    }, LONG_PRESS_DURATION);
  });

  map.on('pointermove', () => {
    moved = true;
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  });

  map.on('pointerup pointercancel', () => {
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      longPressTimer = null;
    }
  });

  // ───────────────────────────────────────────────
  // Masquer le hint
  // ───────────────────────────────────────────────
  map.on('movestart', hideHint);
}



let hintHidden = false;
function hideHint() {
  if (hintHidden) return;
  hintHidden = true;
  document.getElementById('map-hint').classList.add('hidden');
}

// ═══════════════════════════════════════════════
// MARKERS
// ═══════════════════════════════════════════════
function makeMarkerIcon(category) {
  const cat = CATEGORIES[category] || CATEGORIES.other;
  const svg = `<svg viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 28 12 28s12-19 12-28C28 5.37 22.63 0 16 0z"
      fill="${cat.color}" stroke="rgba(0,0,0,.2)" stroke-width="1"/>
    <circle cx="16" cy="12" r="6" fill="white" fill-opacity=".9"/>
    <text x="16" y="16" text-anchor="middle" font-size="8" font-family="sans-serif">${cat.icon}</text>
  </svg>`;
  return L.divIcon({
    html: `<div class="custom-marker">${svg}</div>`,
    iconSize: [32, 40],
    iconAnchor: [16, 40],
    popupAnchor: [0, -42],
    className: '',
  });
}

function addMarkerToMap(poi) {
  const cat = poi.content.category || 'other';
  const marker = L.marker([poi.location.lat, poi.location.lng], {
    icon: makeMarkerIcon(cat),
  });
  marker.bindPopup(() => {
  const div = document.createElement('div');
  const catInfo = CATEGORIES[cat] || CATEGORIES.other;

  div.innerHTML = `
    <div class="popup-title">${escHtml(poi.content.title || 'Sans titre')}</div>
    <div class="popup-cat">${catInfo.icon} ${catInfo.label}</div>
    <div class="popup-photos" id="popup-photos-${poi.id}">
      <div class="popup-photo-loading">Chargement…</div>
    </div>
    <div class="popup-actions">
      <button class="popup-btn" onclick="openDetail('${poi.id}')">Voir détails</button>
    </div>
  `;

  // Charger les photos après ouverture
  loadPopupPhotos(poi.id);

  return div;
}, { maxWidth: 260 });


  marker.addTo(layers[cat]);
  markers[poi.id] = marker;
}

async function loadPopupPhotos(poiId) {
    
    
    const container = document.getElementById(`popup-photos-${poiId}`);
    if (!container) return;
    
    const photos = await dbGetByIndex('photos', 'poiId', poiId);
    console.log("Photos brutes =", photos);
  

  if (!photos.length) {
    container.innerHTML = `<div class="popup-no-photo">Aucune photo</div>`;
    return;
  }

  // Limiter à 3 miniatures
  const thumbs = photos.slice(0, 3);

  const html = await Promise.all(thumbs.map(async p => {
    // Normalisation iOS (au cas où)
    if (!(p.blob instanceof Blob)) {
      p.blob = new Blob([p.blob], { type: p.mimeType });
    }

    const url = URL.createObjectURL(p.blob);

    return `
      <img class="popup-thumb" src="${url}" onclick="openLightbox('${url}')" />
    `;
  }));

  container.innerHTML = `
    <div class="popup-thumb-row">
      ${html.join('')}
    </div>
  `;
}


function removeMarkerFromMap(poiId) {
  if (markers[poiId]) {
    map.removeLayer(markers[poiId]);
    delete markers[poiId];
  }
}

function openPanel(title) {
    document.getElementById('panel-title').textContent = title;
    document.getElementById('panel').classList.add('open');
    document.getElementById('panel-overlay').classList.add('open'); // ← ajouter
}

function closePanel() {
    document.getElementById('panel').classList.remove('open');
    document.getElementById('panel-overlay').classList.remove('open'); // ← ajouter
    panelMode = null;
    editPoiId = null;
    pendingLatLng = null;
    formPhotos = [];
    formTags = [];
}

// ═══════════════════════════════════════════════
// FILTER BAR
// ═══════════════════════════════════════════════
function renderFilterBar() {
  const bar = document.getElementById('filter-bar');
  bar.innerHTML = '';
  for (const [key, cat] of Object.entries(CATEGORIES)) {
    const chip = document.createElement('button');
    chip.className = 'filter-chip' + (activeCategories.has(key) ? ' active' : '');
    chip.innerHTML = `<span class="dot" style="background:${cat.color}"></span>${cat.icon} ${cat.label}`;
    chip.onclick = () => toggleCategory(key);
    bar.appendChild(chip);
  }
}

function toggleCategory(key) {
  if (activeCategories.has(key)) {
    activeCategories.delete(key);
    map.removeLayer(layers[key]);
  } else {
    activeCategories.add(key);
    layers[key].addTo(map);
  }
  renderFilterBar();
}

// ═══════════════════════════════════════════════
// PANEL
// ═══════════════════════════════════════════════
function openPanel(title) {
  document.getElementById('panel-title').textContent = title;
  document.getElementById('panel').classList.add('open');
}

function closePanel() {
  document.getElementById('panel').classList.remove('open');
  panelMode = null;
  editPoiId = null;
  pendingLatLng = null;
  formPhotos = [];
  formTags = [];
}

// ═══════════════════════════════════════════════
// ADD / EDIT FORM
// ═══════════════════════════════════════════════
function openAddForm() {
  panelMode = 'add';
  editPoiId = null;
  formPhotos = [];
  formTags = [];
  renderForm(null);
  openPanel('Nouveau lieu');
}

async function openEditForm(poiId) {
  panelMode = 'edit';
  editPoiId = poiId;
  const poi = await dbGet('poi', poiId);
  const photos = await dbGetByIndex('photos', 'poiId', poiId);
  formPhotos = photos.map(p => ({ blob: p.blob, url: URL.createObjectURL(p.blob), existingId: p.photoId }));
  formTags = [...(poi.content.tags || [])];
  renderForm(poi);
  openPanel('Modifier le lieu');
}

function renderForm(poi) {
  const body = document.getElementById('panel-body');
  const footer = document.getElementById('panel-footer');
  const selectedCategory = poi?.content?.category || 'other';

  const catGridHtml = Object.entries(CATEGORIES).map(([key, cat]) =>
    `<button type="button" class="cat-btn${selectedCategory === key ? ' selected' : ''}"
      data-cat="${key}"
      style="${selectedCategory === key ? `border-color:${cat.color};background:${cat.color}20;` : ''}"
      onclick="selectCat(this, '${key}', '${cat.color}')">
      <span class="cat-icon">${cat.icon}</span>
      ${cat.label}
    </button>`
  ).join('');

  body.innerHTML = `
    <div class="form-group">
      <label class="form-label" for="f-title">Titre</label>
      <input id="f-title" class="form-input" value="${escHtml(poi?.content?.title || '')}" placeholder="Ex: Musée invisible" />
    </div>
    <div class="form-group">
      <label class="form-label" for="f-desc">Description</label>
      <textarea id="f-desc" class="form-textarea" placeholder="Décrivez le lieu...">${escHtml(poi?.content?.description || '')}</textarea>
    </div>
    <div class="form-group">
      <label class="form-label" for="f-category">Catégorie</label>
      <input id="f-category" class="form-input" type="hidden" value="${selectedCategory}" />
      <div class="cat-grid">${catGridHtml}</div>
    </div>
    <div class="form-group">
      <label class="form-label">Tags</label>
      <div class="tag-input-wrap" onclick="document.getElementById('tag-input').focus()">
        <div id="tags-display">${formTags.map(t => `<span class="tag-chip">${escHtml(t)}<button onclick="removeTag('${escHtml(t)}');event.stopPropagation();" type="button">✕</button></span>`).join('')}</div>
        <input id="tag-input" class="form-input" type="text" placeholder="Ajouter un tag" onkeydown="handleTagKey(event)" />
      </div>
    </div>
    <div class="form-group">
      <label class="form-label">Photos</label>
      <label class="photo-drop" for="file-input">
        <span class="icon">📷</span>
        Glissez des images ici ou cliquez pour ajouter
      </label>
      <input id="file-input" type="file" accept="image/*" multiple onchange="handleFileInput(event)" />
      <div class="photo-grid" id="photo-preview"></div>
    </div>
    ${poi ? `<div class="detail-coords">📍 ${poi.location.lat.toFixed(5)}, ${poi.location.lng.toFixed(5)}</div>` : ''}
  `;

  renderPhotoPreview();

  footer.innerHTML = `
    <button class="btn-secondary" onclick="closePanel()">Annuler</button>
    <button class="btn-primary" onclick="savePoi()">Enregistrer</button>
  `;
}

function selectCat(el, key, color) {
  document.querySelectorAll('.cat-btn').forEach(b => {
    b.classList.remove('selected');
    b.style.borderColor = '';
    b.style.background = '';
  });
  el.classList.add('selected');
  el.style.borderColor = color;
  el.style.background = color + '20';
  document.getElementById('f-category').value = key;
}

function handleTagKey(e) {
  if (e.key === 'Enter' || e.key === ',') {
    e.preventDefault();
    const val = e.target.value.trim().toLowerCase().replace(/[^a-z0-9À-ÿ\s\-]/g, '');
    if (val && !formTags.includes(val)) {
      formTags.push(val);
      renderTagsDisplay();
    }
    e.target.value = '';
  }
}

function removeTag(tag) {
  formTags = formTags.filter(t => t !== tag);
  renderTagsDisplay();
}

function renderTagsDisplay() {
  const el = document.getElementById('tags-display');
  if (!el) return;
  el.innerHTML = formTags.map(t =>
    `<span class="tag-chip">${escHtml(t)}<button onclick="removeTag('${escHtml(t)}')" type="button">✕</button></span>`
  ).join('');
}

async function handleFileInput(e) {
  const files = Array.from(e.target.files);
  for (const file of files) {
    if (!file.type.startsWith('image/')) continue;
    const url = URL.createObjectURL(file);
    formPhotos.push({ blob: file, url });
  }
  renderPhotoPreview();
  e.target.value = '';
}

function renderPhotoPreview() {
  const grid = document.getElementById('photo-preview');
  if (!grid) return;
  grid.innerHTML = formPhotos.map((p, i) => `
    <div class="photo-thumb">
      <img src="${p.url}" alt="Photo ${i + 1}" />
      <button class="del-photo" onclick="removeFormPhoto(${i})" type="button">✕</button>
    </div>
  `).join('');
}

function removeFormPhoto(i) {
  URL.revokeObjectURL(formPhotos[i].url);
  formPhotos.splice(i, 1);
  renderPhotoPreview();
}

// ═══════════════════════════════════════════════
// SAVE POI
// ═══════════════════════════════════════════════
async function savePoi() {
  const title = document.getElementById('f-title').value.trim();
  const category = document.getElementById('f-category').value;
  const description = document.getElementById('f-desc').value.trim();

  if (!title) { showToast('⚠️ Titre requis'); return; }
  if (!category) { showToast('⚠️ Catégorie requise'); return; }

  const now = new Date().toISOString();
  const id = editPoiId || `poi_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  const photoRefs = [];

  for (const p of formPhotos) {
    if (p.existingId) photoRefs.push({ photoId: p.existingId });
  }

  for (const p of formPhotos) {
    if (!p.existingId) {
      const photoId = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      await dbPut('photos', {
        photoId,
        poiId: id,
        blob: p.blob,
        mimeType: p.blob.type,
        sizeBytes: p.blob.size,
        createdAt: now,
      });
      photoRefs.push({ photoId });
    }
  }

  if (editPoiId) {
    const existingPhotos = await dbGetByIndex('photos', 'poiId', editPoiId);
    const keptIds = new Set(formPhotos.filter(p => p.existingId).map(p => p.existingId));
    for (const ep of existingPhotos) {
      if (!keptIds.has(ep.photoId)) await dbDelete('photos', ep.photoId);
    }
  }

  const poi = {
    id,
    version: 1,
    createdAt: editPoiId ? (await dbGet('poi', editPoiId))?.createdAt || now : now,
    updatedAt: now,
    location: pendingLatLng || (editPoiId ? (await dbGet('poi', editPoiId))?.location : null),
    content: { title, description, tags: formTags, category },
    photos: photoRefs,
  };

  await dbPut('poi', poi);

  if (editPoiId) removeMarkerFromMap(editPoiId);
  addMarkerToMap(poi);

  allPois = await dbGetAll('poi');
  updatePoiCount();

  closePanel();
  showToast(editPoiId ? '✅ Lieu mis à jour' : '✅ Lieu ajouté !');
}

// ═══════════════════════════════════════════════
// DETAIL VIEW
// ═══════════════════════════════════════════════
async function openDetail(poiId) {
  panelMode = 'detail';
  const poi = await dbGet('poi', poiId);
  const photos = await dbGetByIndex('photos', 'poiId', poiId);
  const cat = CATEGORIES[poi.content.category] || CATEGORIES.other;

  const body = document.getElementById('panel-body');
  const footer = document.getElementById('panel-footer');

  const tagsHtml = (poi.content.tags || []).map(t => `<span class="detail-tag">${escHtml(t)}</span>`).join('');
  const photosHtml = photos.map(p => {
    const url = URL.createObjectURL(p.blob);
    return `<div class="detail-photo"><img src="${url}" onclick="openLightbox('${url}')" loading="lazy"></div>`;
  }).join('');

  body.innerHTML = `
    <div>
      <div class="detail-category-badge" style="background:${cat.color};">${cat.icon} ${cat.label}</div>
      <div class="detail-description">${escHtml(poi.content.description || 'Aucune description')}</div>
    </div>
    ${tagsHtml ? `<div class="detail-tags">${tagsHtml}</div>` : ''}
    ${photosHtml ? `<div class="detail-photo-grid">${photosHtml}</div>` : ''}
    <div class="detail-coords">📍 ${poi.location.lat.toFixed(5)}, ${poi.location.lng.toFixed(5)}</div>
    <div style="font-size:.72rem;color:var(--text-muted)">Ajouté le ${new Date(poi.createdAt).toLocaleDateString('fr-FR', {day:'numeric',month:'long',year:'numeric'})}</div>
  `;

  footer.innerHTML = `
    <button class="btn-danger" onclick="deletePoi('${poi.id}')">Supprimer</button>
    <div style="flex:1"></div>
    <button class="btn-secondary" onclick="closePanel()">Fermer</button>
    <button class="btn-primary" onclick="openEditForm('${poi.id}')">Modifier</button>
  `;

  openPanel(poi.content.title || 'Détail');
}

async function deletePoi(poiId) {
  if (!confirm('Supprimer ce lieu définitivement ?')) return;
  const photos = await dbGetByIndex('photos', 'poiId', poiId);
  for (const p of photos) await dbDelete('photos', p.photoId);
  await dbDelete('poi', poiId);
  removeMarkerFromMap(poiId);
  allPois = await dbGetAll('poi');
  updatePoiCount();
  closePanel();
  showToast('🗑️ Lieu supprimé');
}

// ═══════════════════════════════════════════════
// LIGHTBOX
// ═══════════════════════════════════════════════
function openLightbox(url) {
  document.getElementById('lightbox-img').src = url;
  document.getElementById('lightbox').classList.add('open');
}
function closeLightbox() {
  document.getElementById('lightbox').classList.remove('open');
}

// ═══════════════════════════════════════════════
// EXPORT
// ═══════════════════════════════════════════════
async function exportData() {
  showToast('⏳ Export en cours…');
  const pois = await dbGetAll('poi');
  const full = await Promise.all(pois.map(async poi => {
    const photos = await dbGetByIndex('photos', 'poiId', poi.id);
    const photosData = await Promise.all(photos.map(async p => {
      const data = await blobToBase64(p.blob);
      return { photoId: p.photoId, mimeType: p.mimeType, sizeBytes: p.sizeBytes, data };
    }));
    return { ...poi, photosData };
  }));

  const json = JSON.stringify({ version: 1, exportDate: new Date().toISOString(), pois: full }, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `paris-map-${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('✅ Export terminé !');
}

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const reader = new FileReader();
    reader.onload = () => res(reader.result.split(',')[1]);
    reader.onerror = rej;
    reader.readAsDataURL(blob);
  });
}

// ═══════════════════════════════════════════════
// UTILS
// ═══════════════════════════════════════════════
function escHtml(str) {
  if (!str) return '';
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function showToast(msg, duration = 2800) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function updatePoiCount() {
  document.getElementById('poi-count').textContent =
    `${allPois.length} lieu${allPois.length !== 1 ? 'x' : ''}`;
}

// ═══════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════
(async function init() {
  await initDB();
  initMap();
  renderFilterBar();
  allPois = await dbGetAll('poi');
  for (const poi of allPois) addMarkerToMap(poi);
  updatePoiCount();
  setTimeout(() => document.getElementById('map-hint').classList.add('hidden'), 6000);
  console.log(`✅ Paris Map initialisé — ${allPois.length} POI chargés depuis IndexedDB`);
})();
