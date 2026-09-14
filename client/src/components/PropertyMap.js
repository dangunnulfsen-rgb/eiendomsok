import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function PropertyMap({ properties, companyName }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map centered on Telemark/Vestfold region
    if (!mapInstance.current) {
      mapInstance.current = L.map(mapRef.current).setView([59.25, 9.9], 9);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        maxZoom: 19
      }).addTo(mapInstance.current);
    }

    // Clear existing markers
    mapInstance.current.eachLayer(layer => {
      if (layer instanceof L.Marker) {
        mapInstance.current.removeLayer(layer);
      }
    });

    // Add property markers
    if (properties && properties.length > 0) {
      const group = L.featureGroup();

      properties.forEach((prop, idx) => {
        const colors = ['#0071e3', '#34c759', '#ff9500', '#af52de'];
        const color = colors[idx % colors.length];

        const marker = L.circleMarker([prop.lat, prop.lng], {
          radius: 8,
          fillColor: color,
          color: '#fff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.8
        });

        marker.bindPopup(`
          <div style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; min-width: 200px;">
            <h4 style="margin: 0 0 8px 0; color: #1d1d1f;">${prop.address}</h4>
            <p style="margin: 4px 0; color: #86868b; font-size: 13px;">
              <strong>Type:</strong> ${prop.type}
            </p>
            <p style="margin: 4px 0; color: #86868b; font-size: 13px;">
              <strong>Størrelse:</strong> ${prop.size} m²
            </p>
          </div>
        `);

        group.addLayer(marker);
      });

      group.addTo(mapInstance.current);
      mapInstance.current.fitBounds(group.getBounds().pad(0.1));
    }
  }, [properties]);

  return (
    <div style={{ marginTop: '24px' }}>
      <h2 style={{ marginBottom: '16px', color: '#1d1d1f' }}>Eiendommer på Kart</h2>
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
        {properties?.length || 0} eiendom{properties?.length === 1 ? '' : 'er'} registrert
      </p>
    </div>
  );
}

export default PropertyMap;
