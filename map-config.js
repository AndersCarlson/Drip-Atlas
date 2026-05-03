/**
 * Drip Atlas — Map Layer Configuration
 *
 * HOW TO ENABLE PROPERTY LINES:
 *  1. Sign up free at https://developers.arcgis.com/sign-up/
 *  2. Create an API key — scope it to:
 *       • Location services → Basemaps
 *       • ArcGIS Living Atlas
 *  3. Paste the key into ARCGIS_API_KEY below.
 *
 * Parcel/lot outlines are drawn using OpenStreetMap data (Overpass API).
 * No additional key required — works worldwide where OSM building data exists.
 */
const ARCGIS_API_KEY = 'AAPTaXKx-In7HywZ1vmx1SdSUkw..crvSHUFx5FizmbC41fXWBls5Q_NXinvHoUcPkfn1vlxUS_zXmx-im1_XOJzDxVm1W2Aqjd8495XJfB4JQr9xKwYNxVU8sYsKCcplmqA1ikQTYC4p6jz88f8X4zhwRugzqwJ1KT80_kNmP_EptwLIv29o4i98VV_Z-Vi0KjdRYqpjjC5kMzC1JXURF1xgZ6DiU9eQ9Yp2QcVnEQffnOqignV0r04qrDy5aq6OjGmhMzDFyRzYGLj6UCTF8sJJauY.AT1_nxU6CQqd';

// ── Layer URLs ─────────────────────────────────────────────────────────────

const _ESRI_IMAGERY_ANON = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const _ESRI_IMAGERY_AUTH = `https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}?token=${ARCGIS_API_KEY}`;
const _ESRI_REFERENCE    = 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';
const _REGRID_PARCELS    = `https://tiles.arcgis.com/tiles/KzeiCaQsMoeCfoCq/arcgis/rest/services/Regrid_Nationwide_Parcel_Boundaries_v1/MapServer/tile/{z}/{y}/{x}?token=${ARCGIS_API_KEY}`;

// ── initMapLayers(map) ─────────────────────────────────────────────────────

function initMapLayers(map) {
  // Cap the map itself at zoom 23 — the Regrid parcel service's highest LOD.
  // Without this, zoomSnap:0.5 can push the map past a layer's maxZoom and blank it.
  map.setMaxZoom(23);

  const imageryUrl = ARCGIS_API_KEY ? _ESRI_IMAGERY_AUTH : _ESRI_IMAGERY_ANON;
  const imageryLayer = L.tileLayer(imageryUrl, {
    maxZoom: 23,
    maxNativeZoom: 19, // Esri imagery tiles only go to LOD 19; Leaflet upscales above that
    attribution: 'Esri, Maxar, Earthstar Geographics',
  }).addTo(map);

  const referenceLayer = L.tileLayer(_ESRI_REFERENCE, {
    maxZoom: 23,
    maxNativeZoom: 19,
    opacity: 0.85,
    attribution: 'Esri',
  }).addTo(map);

  // Parcel boundaries — Regrid has native tiles through LOD 23
  let parcelLayer = null;
  if (ARCGIS_API_KEY) {
    parcelLayer = L.tileLayer(_REGRID_PARCELS, {
      maxZoom: 23,
      maxNativeZoom: 23,
      opacity: 0.9,
      attribution: 'Regrid, Esri',
    }).addTo(map);
  }

  return { imageryLayer, referenceLayer, parcelLayer };
}

// ── selectParcel(map, lat, lng) ────────────────────────────────────────────
// Queries OpenStreetMap (Overpass API) for the building or lot polygon at
// (lat, lng) and draws a yellow outline for that single property.
// Works for most US residential addresses — building footprints come from
// the Microsoft US Building Footprints import in OSM.
// Safe to call multiple times — replaces previous selection.

let _parcelLayer = null;

async function selectParcel(map, lat, lng) {
  if (_parcelLayer) { map.removeLayer(_parcelLayer); _parcelLayer = null; }

  // Search within 30m for a building, then fall back to residential landuse
  const query = `[out:json][timeout:10];
(
  way(around:30,${lat},${lng})[building];
  way(around:30,${lat},${lng})[landuse~"^(residential|farmyard|grass|meadow)$"];
);
out geom;`;

  try {
    const res  = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      body:   'data=' + encodeURIComponent(query),
    });
    const data = await res.json();
    const elements = (data.elements || []).filter(e => e.geometry && e.geometry.length > 2);
    if (!elements.length) return;

    // Prefer building tags; within that, pick closest centroid to the query point
    const buildings = elements.filter(e => e.tags?.building);
    const pool      = buildings.length ? buildings : elements;

    const centroid  = geom => {
      const sum = geom.reduce((s, n) => [s[0] + n.lat, s[1] + n.lon], [0, 0]);
      return [sum[0] / geom.length, sum[1] / geom.length];
    };
    const dist2 = (a, b) => (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2;

    const best = pool.reduce((a, b) =>
      dist2(centroid(a.geometry), [lat, lng]) <= dist2(centroid(b.geometry), [lat, lng]) ? a : b
    );

    const latlngs = best.geometry.map(n => [n.lat, n.lon]);
    _parcelLayer = L.polygon(latlngs, {
      color:       '#f5c842',
      weight:      2.5,
      opacity:     1,
      fillOpacity: 0.08,
      fillColor:   '#f5c842',
      interactive: false,
    }).addTo(map);

  } catch (_) { /* silently fail if offline or no data */ }
}

// ── satelliteExportUrl(lat, lng) ───────────────────────────────────────────
// Static satellite screenshot URL for the design.html confirm screen
// and zone thumbnail cards in materials.html.

function satelliteExportUrl(lat, lng, widthPx = 640, heightPx = 340, padDeg = 0.0014) {
  const padLat = padDeg * 0.75;
  const bbox   = `${lng - padDeg},${lat - padLat},${lng + padDeg},${lat + padLat}`;
  const base   = ARCGIS_API_KEY
    ? 'https://ibasemaps-api.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/export'
    : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/export';
  const token  = ARCGIS_API_KEY ? `&token=${ARCGIS_API_KEY}` : '';
  return `${base}?bbox=${bbox}&bboxSR=4326&imageSR=4326&size=${widthPx},${heightPx}&format=png&f=image${token}`;
}
