import React, { useState } from 'react';

const aarstall = (dato) => (dato ? dato.slice(0, 4) : '–');

function SelskapsRad({ selskap, onSelectCompany, innrykk }) {
  return (
    <div className={`gruppe-selskap${innrykk ? ' innrykk' : ''}`}>
      <div>
        <strong>{selskap.name}</strong>
        <p>
          {[selskap.kommune, `Org.nr ${selskap.orgnr}`, `Etablert ${aarstall(selskap.established)}`]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {selskap.postKommune && <p>Postadresse: {selskap.postKommune}</p>}
      </div>
      <button className="btn-secondary" onClick={() => onSelectCompany(selskap)}>
        Se detaljer
      </button>
    </div>
  );
}

function GruppeRad({ gruppe, onSelectCompany }) {
  const [apen, setApen] = useState(false);

  return (
    <div className="gruppe-rad">
      <button className="gruppe-topp" onClick={() => setApen((v) => !v)} aria-expanded={apen}>
        <span className="gruppe-pil">{apen ? '▾' : '▸'}</span>
        <span className="gruppe-adresse">{gruppe.adresse}</span>
        <span className="gruppe-antall">{gruppe.antall} selskaper</span>
      </button>

      {apen && (
        <div className="gruppe-medlemmer">
          {gruppe.selskaper.map((s) => (
            <SelskapsRad key={s.id} selskap={s} onSelectCompany={onSelectCompany} innrykk />
          ))}
        </div>
      )}
    </div>
  );
}

function GroupedList({ rader, loading, antallGrupper, antallSelskaper, total, begrenset, onSelectCompany }) {
  if (loading) {
    return <div className="loading">Grupperer treffene...</div>;
  }

  if (!rader || rader.length === 0) {
    return <div className="loading">Ingen treff å gruppere.</div>;
  }

  return (
    <div>
      {begrenset && (
        <div className="notice">
          Grupperingen er regnet ut på de første {begrenset.toLocaleString('nb-NO')} av{' '}
          {total.toLocaleString('nb-NO')} treffene, så antallet i hver gruppe kan være for lavt.
          Velg et fylke eller en by for eksakte tall.
        </div>
      )}

      <p className="gruppe-sammendrag">
        {antallGrupper} adresser med flere selskaper · {antallSelskaper.toLocaleString('nb-NO')} selskaper totalt
      </p>

      {rader.map((rad) =>
        rad.type === 'gruppe' ? (
          <GruppeRad key={rad.id} gruppe={rad} onSelectCompany={onSelectCompany} />
        ) : (
          <SelskapsRad
            key={rad.selskap.id}
            selskap={rad.selskap}
            onSelectCompany={onSelectCompany}
          />
        )
      )}
    </div>
  );
}

export default GroupedList;
