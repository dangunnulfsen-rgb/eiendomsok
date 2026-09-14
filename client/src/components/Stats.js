import React from 'react';

function Stats({ companies = [], total = 0 }) {
  const medKontakt = companies.filter((c) => c.phone || c.email).length;

  const kort = [
    { label: 'Treff i registeret', verdi: total.toLocaleString('nb-NO') },
    { label: 'Fylker', verdi: '3' },
    { label: 'Kommuner', verdi: '41' },
    { label: 'Med kontaktinfo (denne siden)', verdi: `${medKontakt}/${companies.length}` }
  ];

  return (
    <div className="stats">
      {kort.map((k) => (
        <div className="stat-card" key={k.label}>
          <p className="stat-label">{k.label}</p>
          <p className="stat-value">{k.verdi}</p>
        </div>
      ))}
    </div>
  );
}

export default Stats;
