// app.js — migration initiale du prototype
console.log('app.js chargé');

// Register service worker (si supporté)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').then(reg => {
    console.log('Service Worker enregistré', reg.scope);
  }).catch(err => console.warn('SW registration failed', err));
}

// Catégories (copiées depuis le prototype)
const CATEGORIES = {
  culture:      { label: "Culture",       icon: "📚", color: "#E63946" },
  food:         { label: "Restauration",  icon: "🍽️", color: "#F4A261" },
  nature:       { label: "Nature",        icon: "🌿", color: "#2A9D8F" },
  architecture: { label: "Architecture",  icon: "🏛️", color: "#457B9D" },
  secret:       { label: "Secret",        icon: "⭐", color: "#9B5DE5" },
  other:        { label: "Autre",         icon: "📍", color: "#6B7280" },
};

// État
let map;
const layers = {};
const markers = {};
let allPois = [];

function makeMarkerIcon(category) {
  const cat = CATEGORIES[category] || CATEGORIES.other;
  const svg = `<svg viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
    <path d="M16 0C9.37 0 4 5.37 4 12c0 9 12 28 12 28s12-19 12-28C28 5.37 22.63 0 16 0z"
      fill="${cat.color}" stroke="rgba(0,0,0,.2)" stroke-width="1"/>
    <circle cx="16" cy="12" r="6" fill="white" fill-opacity=".9"/>
    <text x="16" y="16" text-anchor="middle" font-size="8" font-family="sans-serif">${cat.icon}</text>
  </svg>`;
  return L.divIcon({ html: `<div class="custom-marker">${svg}</div>`, iconSize: [32,40], iconAnchor:[16,40], popupAnchor:[0,-42], className: '' });
}

function addMarkerToMap(poi) {
  const cat = poi.content?.category || 'other';
  const marker = L.marker([poi.location.lat, poi.location.lng], { icon: makeMarkerIcon(cat) });
  marker.bindPopup(`<strong>${(poi.content && poi.content.title) || 'Sans titre'}</strong><br>${(CATEGORIES[cat]||{}).label||''}`);
  marker.addTo(layers[cat] || map);
  markers[poi.id] = marker;
}

function removeMarkerFromMap(poiId){ if(markers[poiId]) { map.removeLayer(markers[poiId]); delete markers[poiId]; } }

function renderFilterBar(){
  const bar = document.getElementById('filter-bar');
  if(!bar) return;
  bar.innerHTML = '';
  for(const [key, cat] of Object.entries(CATEGORIES)){
    const chip = document.createElement('button');
    chip.className = 'filter-chip active';
    chip.innerHTML = `<span class="dot" style="background:${cat.color}"></span>${cat.icon} ${cat.label}`;
    chip.onclick = () => toggleCategory(key);
    bar.appendChild(chip);
  }
}

function toggleCategory(key){
  if(!layers[key]) return;
  if(map.hasLayer(layers[key])) map.removeLayer(layers[key]); else layers[key].addTo(map);
}

// Initialisation carte
function initMap(){
  if(!window.L) return console.warn('Leaflet non chargé');
  map = L.map('map', { center: [48.8566, 2.3522], zoom: 13, preferCanvas:true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OpenStreetMap contributors', maxZoom:19, minZoom:10, crossOrigin:true }).addTo(map);
  for(const k of Object.keys(CATEGORIES)) layers[k] = L.layerGroup().addTo(map);

  map.on('dblclick', async e => {
    const lat = e.latlng.lat, lng = e.latlng.lng;
    // Prompt minimal pour test rapide
    const title = prompt('Titre du lieu (annuler pour abandonner)');
    if(!title) return;
    const category = prompt('Catégorie (culture,food,nature,architecture,secret,other)', 'other') || 'other';
    const id = `poi_${Date.now()}_${Math.random().toString(36).slice(2,6)}`;
    const now = new Date().toISOString();
    const poi = { id, version:1, createdAt:now, updatedAt:now, location:{lat,lng}, content:{title,description:'',tags:[],category}, photos:[] };
    try{ await dbPut('poi', poi); addMarkerToMap(poi); allPois.push(poi); updatePoiCount(); alert('Lieu enregistré'); }
    catch(err){ console.error('dbPut failed', err); alert('Erreur enregistrement'); }
  });
}

function updatePoiCount(){ const el = document.getElementById('poi-count'); if(!el) return; el.textContent = `${allPois.length} lieu${allPois.length!==1?'x':''}` }

// Charge tous les POI depuis IndexedDB et les ajoute sur la carte
async function loadAllPois(){
  try{
    allPois = await dbGetAll('poi');
    for(const p of allPois) addMarkerToMap(p);
    updatePoiCount();
  }catch(e){ console.warn('loadAllPois failed', e); }
}

(async function boot(){
  try{ if(typeof initDB === 'function') await initDB(); } catch(e){ console.warn('initDB failed', e); }
  initMap(); renderFilterBar(); await loadAllPois();
  // cache hint auto-hide from prototype if exists
  setTimeout(()=>{ const h=document.getElementById('map-hint'); if(h) h.classList.add('hidden'); },6000);
})();

