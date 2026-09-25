import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const COLORS = ['#0071e3', '#34c759', '#ff9500', '#af52de'];

function popupNode(selskap, onSelect) {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    "font-family: -apple-system, BlinkMacSystemFont, sans-serif; min-width: 210px;";

  const tittel = document.createElement('h4');
  tittel.style.cssText = 'margin: 0 0 6px 0; color: #1d1d1f; font-size: 15px;';
  tittel.textContent = selskap.name;
  wrap.appendChild(tittel);

  for (const tekst of [selskap.geokodetAdresse, selskap.naering]) {
    if (!tekst) continue;
    const rad = document.createElement('p');
    rad.style.cssText = 'margin: 3px 0; color: #86868b; font-size: 12px;';
    rad.textContent = tekst;
    wrap.appendChild(rad);
  }

  const knapp = document.createElement('button');
  knapp.textContent = 'Se detaljer';
  knapp.style.cssText =
    'margin-top: 10px; padding: 7px 14px; border: 0; border-radius: 8px;' +
    'background: #0071e3; color: #fff; font-size: 13px; font-weight: 600;' +
    'font-family: inherit; cursor: pointer;';
  knapp.addEventListener('click', () => onSelect(selskap));
  wrap.appendChild(knapp);

  return wrap;
}

// Et selskap kan treffe søket på postadressen og likevel ligge i Sandnes.
// Lar vi slike punkter styre utsnittet, zoomer kartet ut til halve landet og
// selve regionen blir uleselig. Vi rammer inn de midterste 96 % i stedet —
// uteliggerne ligger fortsatt der, bare utenfor første utsnitt.
function hovedutsnitt(points) {
  if (points.length < 10) return null;
  const kvantil = (sortert, q) => sortert[Math.min(sortert.length - 1, Math.floor(sortert.length * q))];
  const lats = points.map(p => p.lat).sort((a, b) => a - b);
  const lngs = points.map(p => p.lng).sort((a, b) => a - b);
  return L.latLngBounds(
    [kvantil(lats, 0.02), kvantil(lngs, 0.02)],
    [kvantil(lats, 0.98), kvantil(lngs, 0.98)]
  );
}

function ResultsMap({ points, loading, total, vist, utenPosisjon, begrenset, onSelectCompany }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);
  const onSelectRef = useRef(onSelectCompany);

  useEffect(() => {
    onSelectRef.current = onSelectCompany;
  }, [onSelectCompany]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([59.6, 9.5], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstance.current);
      markerLayer.current = L.featureGroup().addTo(mapInstance.current);
    }

    markerLayer.current.clearLayers();
    if (!points || points.length === 0) return;

    points.forEach((selskap, idx) => {
      L.circleMarker([selskap.lat, selskap.lng], {
        radius: 7,
        fillColor: COLORS[idx % COLORS.length],
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      })
        .bindPopup(() => popupNode(selskap, (s) => onSelectRef.current(s)))
        .addTo(markerLayer.current);
    });

    const utsnitt = hovedutsnitt(points) || markerLayer.current.getBounds();
    mapInstance.current.fitBounds(utsnitt.pad(0.15), { maxZoom: 14 });
  }, [points]);

  // Leaflet regner ut størrelsen ved oppstart; byttes fanen mens kartet er
  // skjult blir rutene grå til den får beskjed om å måle på nytt.
  useEffect(() => {
    if (mapInstance.current) setTimeout(() => mapInstance.current.invalidateSize(), 0);
  }, []);

  return (
    <div>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '560px',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
          background: '#eef0f2'
        }}
      />
      <p style={{ marginTop: '12px', color: '#86868b', fontSize: '13px' }}>
        {loading
          ? 'Geokoder adresser via Kartverket...'
          : [
              `${points.length} av ${vist} selskaper plassert`,
              begrenset && total > begrenset
                ? `kartet viser de første ${begrenset} av ${total.toLocaleString('nb-NO')} treffene`
                : null,
              utenPosisjon ? `${utenPosisjon} mangler gyldig gateadresse` : null
            ]
              .filter(Boolean)
              .join(' · ')}
      </p>
    </div>
  );
}

export default ResultsMap;
