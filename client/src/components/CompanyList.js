import React from 'react';

function CompanyList({ companies, loading, onSelectCompany }) {
  const colors = ['blue', 'green', 'orange', 'purple'];

  if (loading) {
    return <div className="loading">Laster bedrifter...</div>;
  }

  if (companies.length === 0) {
    return <div className="loading">Ingen bedrifter funnet. Prøv et nytt søk.</div>;
  }

  return (
    <div className="company-grid">
      {companies.map((company, idx) => (
        <div
          key={company.id}
          className={`company-card company-card-${colors[idx % colors.length]}`}
          onClick={() => onSelectCompany(company)}
        >
          <h3 className="company-name">{company.name}</h3>
          <p className="company-meta">{company.fylke} · {company.properties} eiendommer</p>

          <div className="company-info">
            <div className="company-info-item">
              <p>Ansatte</p>
              <p style={{ color: `var(--color-${colors[idx % colors.length]})` }}>
                {company.employees}
              </p>
            </div>
            <div className="company-info-item" style={{ textAlign: 'right' }}>
              <p>Etablert</p>
              <p style={{ color: `var(--color-${colors[idx % colors.length]})` }}>
                {company.established}
              </p>
            </div>
          </div>

          <div className="company-leader">
            <strong>{company.leader}</strong>
            <p className="email">{company.email}</p>
            <p className="phone">{company.phone}</p>
          </div>

          <button className="btn-primary" onClick={(e) => {
            e.stopPropagation();
            onSelectCompany(company);
          }}>
            Se Detaljer
          </button>
        </div>
      ))}
    </div>
  );
}

export default CompanyList;
