import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const COLORS = ['#0071e3', '#34c759', '#ff9500', '#af52de'];

function popupNode({ address, type, matrikkel }) {
  const wrap = document.createElement('div');
  wrap.style.cssText =
    "font-family: -apple-system, BlinkMacSystemFont, sans-serif; min-width: 200px;";

  const tittel = document.createElement('h4');
  tittel.style.cssText = 'margin: 0 0 8px 0; color: #1d1d1f;';
  tittel.textContent = address;
  wrap.appendChild(tittel);

  for (const [etikett, verdi] of [['Type', type], ['Matrikkel', matrikkel]]) {
    if (!verdi) continue;
    const rad = document.createElement('p');
    rad.style.cssText = 'margin: 4px 0; color: #86868b; font-size: 13px;';
    const b = document.createElement('strong');
    b.textContent = `${etikett}: `;
    rad.appendChild(b);
    rad.appendChild(document.createTextNode(verdi));
    wrap.appendChild(rad);
  }

  return wrap;
}

function PropertyMap({ properties }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markerLayer = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([59.25, 9.9], 8);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstance.current);
      markerLayer.current = L.featureGroup().addTo(mapInstance.current);
    }

    markerLayer.current.clearLayers();

    if (!properties || properties.length === 0) return;

    properties.forEach((prop, idx) => {
      L.circleMarker([prop.lat, prop.lng], {
        radius: 9,
        fillColor: COLORS[idx % COLORS.length],
        color: '#fff',
        weight: 2,
        opacity: 1,
        fillOpacity: 0.85
      })
        .bindPopup(popupNode(prop))
        .addTo(markerLayer.current);
    });

    mapInstance.current.fitBounds(markerLayer.current.getBounds().pad(0.3), {
      maxZoom: 15
    });
  }, [properties]);

  return (
    <div style={{ marginTop: '24px' }}>
      <h2 style={{ marginBottom: '16px', color: '#1d1d1f' }}>Registrerte adresser</h2>
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '500px',
          borderRadius: '18px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)'
        }}
      />
      <p style={{ marginTop: '12px', color: '#86868b', fontSize: '13px' }}>
        {properties?.length
          ? `${properties.length} adresse${properties.length === 1 ? '' : 'r'} geokodet via Kartverket`
          : 'Ingen adresser kunne geokodes'}
      </p>
    </div>
  );
}

export default PropertyMap;
