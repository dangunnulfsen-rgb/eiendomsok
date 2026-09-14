import React, { useState, useEffect } from 'react';
import axios from 'axios';
import PropertyMap from './PropertyMap';
import getApiBaseUrl from '../utils/api';

const IKKE_REGISTRERT = 'Ikke registrert';

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
        setProperties(propsResponse.data?.properties || []);
      } catch (error) {
        console.error('Feil ved henting av adresser:', error);
        setProperties([]);
      }

      setLoading(false);
    };

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [company.id]);

  const felter = [
    ['Organisasjonsform', detail.orgform],
    ['Næring', detail.naering],
    ['Fylke', detail.fylke],
    ['Kommune', detail.kommune],
    ['Adresse', detail.address],
    ['Poststed', [detail.postalCode, detail.city].filter(Boolean).join(' ')],
    ['Stiftet', detail.established],
    ['Registrert i Enhetsregisteret', detail.registered],
    ['Aksjekapital', detail.kapital ? `${detail.kapital.toLocaleString('nb-NO')} kr` : null],
    ['Siste årsregnskap', detail.sisteAarsregnskap],
    ['Ansatte', detail.employees]
  ];

  return (
    <div className="detail-container">
      <button className="btn-secondary" onClick={onBack} style={{ marginBottom: '24px' }}>
        ← Tilbake
      </button>

      <div className="detail-header">
        <h1>{detail.name}</h1>
        <p>Organisasjonsnummer: {detail.orgnr}</p>
        {(detail.konkurs || detail.underAvvikling) && (
          <p className="company-flag">
            {detail.konkurs ? 'Registrert konkurs' : 'Under avvikling'}
          </p>
        )}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#86868b' }}>Laster fra Enhetsregisteret...</p>
      ) : (
        <div className="detail-grid">
          <div className="detail-section">
            <h2>Bedriftsinformasjon</h2>
            <ul>
              {felter.map(([navn, verdi]) => (
                <li key={navn}>
                  <strong>{navn}</strong>
                  <span>{verdi === null || verdi === undefined || verdi === '' ? IKKE_REGISTRERT : verdi}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="detail-section">
            <h2>Kontakt</h2>
            <ul>
              <li>
                <strong>Telefon</strong>
                <span>{detail.phone || IKKE_REGISTRERT}</span>
              </li>
              <li>
                <strong>E-post</strong>
                <span>{detail.email || IKKE_REGISTRERT}</span>
              </li>
              <li>
                <strong>Nettside</strong>
                <span>{detail.website || IKKE_REGISTRERT}</span>
              </li>
            </ul>

            <h2 style={{ marginTop: '32px' }}>Roller</h2>
            {detail.roles && detail.roles.length > 0 ? (
              <ul>
                {detail.roles.map((rolle, idx) => (
                  <li key={`${rolle.role}-${rolle.name}-${idx}`}>
                    <strong>{rolle.role}</strong>
                    <span>{rolle.name}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p style={{ color: '#86868b' }}>Ingen roller registrert</p>
            )}

            {detail.formaal && (
              <>
                <h2 style={{ marginTop: '32px' }}>Vedtektsfestet formål</h2>
                <p style={{ color: '#86868b', lineHeight: 1.6 }}>{detail.formaal}</p>
              </>
            )}
          </div>
        </div>
      )}

      <PropertyMap properties={properties} />

      <div style={{ marginTop: '48px', paddingTop: '48px', borderTop: '1px solid #f5f5f7' }}>
        <button className="btn-primary" onClick={onBack}>
          Tilbake til Oversikt
        </button>
      </div>
    </div>
  );
}

export default CompanyDetail;
