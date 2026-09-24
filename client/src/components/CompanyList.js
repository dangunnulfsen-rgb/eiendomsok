import React from 'react';

const COLORS = ['blue', 'green', 'orange', 'purple'];

const aarstall = (dato) => (dato ? dato.slice(0, 4) : '–');

function CompanyList({ companies, loading, onSelectCompany }) {
  if (loading) {
    return <div className="loading">Laster bedrifter fra Enhetsregisteret...</div>;
  }

  if (companies.length === 0) {
    return <div className="loading">Ingen bedrifter funnet. Prøv et nytt søk.</div>;
  }

  return (
    <div className="company-grid">
      {companies.map((company, idx) => {
        const color = COLORS[idx % COLORS.length];
        return (
          <div
            key={company.id}
            className={`company-card company-card-${color}`}
            onClick={() => onSelectCompany(company)}
          >
            <h3 className="company-name">{company.name}</h3>
            <p className="company-meta">
              {[company.kommune, company.fylke].filter(Boolean).join(' · ')}
            </p>
            <p className="company-meta">{company.naering}</p>
            {company.postKommune && (
              <p className="company-meta">Postadresse: {company.postKommune}</p>
            )}

            {(company.konkurs || company.underAvvikling) && (
              <p className="company-flag">
                {company.konkurs ? 'Konkurs' : 'Under avvikling'}
              </p>
            )}

            <div className="company-info">
              <div className="company-info-item">
                <p>Org.nr</p>
                <p className="orgnr" style={{ color: `var(--color-${color})` }}>
                  {company.orgnr}
                </p>
              </div>
              <div className="company-info-item" style={{ textAlign: 'right' }}>
                <p>Etablert</p>
                <p style={{ color: `var(--color-${color})` }}>
                  {aarstall(company.established)}
                </p>
              </div>
            </div>

            <div className="company-leader">
              <strong>{company.address || 'Adresse ikke registrert'}</strong>
              <p className="email">
                {[company.postalCode, company.city].filter(Boolean).join(' ')}
              </p>
              {company.phone && <p className="phone">{company.phone}</p>}
              {company.email && <p className="email">{company.email}</p>}
            </div>

            <button
              className="btn-primary"
              onClick={(e) => {
                e.stopPropagation();
                onSelectCompany(company);
              }}
            >
              Se Detaljer
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default CompanyList;
