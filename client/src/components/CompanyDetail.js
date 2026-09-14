import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropertyMap from './PropertyMap';
import getApiBaseUrl from '../utils/api';

function CompanyDetail({ company, onBack }) {
  const [detail, setDetail] = useState(company);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const baseURL = getApiBaseUrl();
      try {
        const response = await axios.get(`${baseURL}/api/companies/${company.id}`);
        setDetail(response.data);
      } catch (error) {
        console.error('Feil ved henting av detaljer:', error);
        setDetail(company);
      }

      try {
        const propsResponse = await axios.get(`${baseURL}/api/properties`, {
          params: { orgnr: company.id }
        });
        setProperties(propsResponse.data || []);
      } catch (error) {
        console.error('Feil ved henting av eiendommer:', error);
        setProperties([]);
      }
      setLoading(false);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);


  return (
    <div className="detail-container">
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '24px' }}>
        ← Tilbake
      </button>

      <div className="detail-header">
        <h1>{detail.name}</h1>
        <p>Organisasjonsnummer: {detail.orgnr}</p>
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#86868b' }}>Laster detaljer...</p>
      ) : (
        <div className="detail-grid">
          <div className="detail-section">
            <h2>Bedriftsinformasjon</h2>
            <ul>
              <li>
                <strong>Fylke</strong>
                <span>{detail.fylke}</span>
              </li>
              <li>
                <strong>Adresse</strong>
                <span>{detail.address || 'Ikke tilgjengelig'}</span>
              </li>
              <li>
                <strong>Postnummer</strong>
                <span>{detail.postalCode || 'Ikke tilgjengelig'}</span>
              </li>
              <li>
                <strong>By</strong>
                <span>{detail.city || 'Ikke tilgjengelig'}</span>
              </li>
              <li>
                <strong>Etablert</strong>
                <span>{detail.established || 'Ukjent'}</span>
              </li>
              <li>
                <strong>Eiendommer</strong>
                <span>{detail.properties}</span>
              </li>
            </ul>
          </div>

          <div className="detail-section">
            <h2>Daglig Leder</h2>
            {detail.leaders && detail.leaders.length > 0 ? (
              <ul>
                {detail.leaders.map((leader, idx) => (
                  <li key={idx}>
                    <strong>{leader.name}</strong>
                    <span>{leader.email}</span>
                    <span style={{ display: 'block', marginTop: '4px' }}>{leader.phone}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <ul>
                <li>
                  <strong>{company.leader}</strong>
                  <span>{company.email}</span>
                  <span style={{ display: 'block', marginTop: '4px' }}>{company.phone}</span>
                </li>
              </ul>
            )}
          </div>
        </div>
      )}

      <PropertyMap properties={properties} companyName={detail.name} />

      <div style={{ marginTop: '48px', paddingTop: '48px', borderTop: '1px solid #f5f5f7' }}>
        <button className="btn-primary" onClick={onBack}>
          Tilbake til Oversikt
        </button>
      </div>
    </div>
  );
}

export default CompanyDetail;
