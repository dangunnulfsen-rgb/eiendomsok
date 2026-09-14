import React from 'react';

function Stats({ companies = [] }) {
  const totalProperties = companies.reduce((sum, c) => sum + c.properties, 0);
  const avgEmployees = companies.length > 0 ? Math.round(
    companies.reduce((sum, c) => sum + c.employees, 0) / companies.length
  ) : 0;

  return (
    <div className="stats">
      <div className="stat-card">
        <p className="stat-label">Bedrifter</p>
        <p className="stat-value">{companies.length}</p>
      </div>
      <div className="stat-card">
        <p className="stat-label">Eiendommer</p>
        <p className="stat-value">{totalProperties.toLocaleString()}</p>
      </div>
      <div className="stat-card">
        <p className="stat-label">Fylker</p>
        <p className="stat-value">3</p>
      </div>
      <div className="stat-card">
        <p className="stat-label">Gjennomsnitt Ansatte</p>
        <p className="stat-value">{avgEmployees}</p>
      </div>
    </div>
  );
}

export default Stats;
