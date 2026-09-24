import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import CompanyList from './components/CompanyList';
import CompanyDetail from './components/CompanyDetail';
import Stats from './components/Stats';
import getApiBaseUrl from './utils/api';

const PAGE_SIZE = 24;
const FYLKESNAVN = ['Telemark', 'Vestfold', 'Buskerud'];

function App() {
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [search, setSearch] = useState('');
  const [fylke, setFylke] = useState('');
  const [kommune, setKommune] = useState('');
  const [fylker, setFylker] = useState({});
  const [query, setQuery] = useState({ search: '', fylke: '', kommune: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data } = await axios.get(`${getApiBaseUrl()}/api/companies`, {
        params: { ...query, page, size: PAGE_SIZE }
      });
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 0);
      setNotice(data.notice || null);
    } catch (err) {
      console.error('Feil ved henting av bedrifter:', err);
      setError('Kunne ikke hente data fra Brønnøysundregistrene. Prøv igjen.');
      setCompanies([]);
      setTotal(0);
      setNotice(null);
    }
    setLoading(false);
  }, [query, page]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  useEffect(() => {
    axios
      .get(`${getApiBaseUrl()}/api/kommuner`)
      .then(({ data }) => setFylker(data.fylker || {}))
      .catch((err) => console.error('Kunne ikke hente kommuneliste:', err));
  }, []);

  const fylkesvalg = Object.keys(fylker).length ? Object.keys(fylker) : FYLKESNAVN;

  // Uten valgt fylke kan man velge blant alle kommunene
  const valgbareKommuner = fylke
    ? fylker[fylke] || []
    : Object.values(fylker).flat().sort((a, b) => a.navn.localeCompare(b.navn, 'nb'));

  const handleFylke = (nyttFylke) => {
    setFylke(nyttFylke);
    // Behold byen bare hvis den ligger i det nye fylket
    const fortsattGyldig = nyttFylke
      ? (fylker[nyttFylke] || []).some((k) => k.nummer === kommune)
      : true;
    if (!fortsattGyldig) setKommune('');
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setQuery({ search, fylke, kommune });
  };

  // Brreg tillater ikke paginering forbi 10 000 treff
  const maksSider = Math.min(totalPages, Math.floor(10000 / PAGE_SIZE));

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1>Eiendomssøk</h1>
          <p>Eiendomsselskaper i Telemark, Vestfold og Buskerud — direkte fra Enhetsregisteret</p>
        </div>
      </header>

      <main className="container">
        <Stats companies={companies} total={total} />

        {!selectedCompany ? (
          <>
            <form onSubmit={handleSearch} className="search-form">
              <input
                type="text"
                placeholder="Søk bedriftsnavn eller org.nr..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
              <select
                value={fylke}
                onChange={(e) => handleFylke(e.target.value)}
                className="search-input"
                aria-label="Fylke"
              >
                <option value="">Alle fylker</option>
                {fylkesvalg.map((navn) => (
                  <option key={navn} value={navn}>{navn}</option>
                ))}
              </select>
              <select
                value={kommune}
                onChange={(e) => setKommune(e.target.value)}
                className="search-input"
                aria-label="By"
                disabled={valgbareKommuner.length === 0}
              >
                <option value="">Alle byer</option>
                {valgbareKommuner.map((k) => (
                  <option key={k.nummer} value={k.nummer}>{k.navn}</option>
                ))}
              </select>
              <button type="submit" className="btn-primary">Søk</button>
            </form>

            {error && <div className="loading">{error}</div>}
            {notice && !loading && <div className="notice">{notice}</div>}

            {(!notice || loading) && (
              <CompanyList
                companies={companies}
                loading={loading}
                onSelectCompany={setSelectedCompany}
              />
            )}

            {maksSider > 1 && (
              <div className="pagination">
                <button
                  className="btn-secondary"
                  disabled={page === 0 || loading}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ← Forrige
                </button>
                <span>Side {page + 1} av {maksSider.toLocaleString('nb-NO')}</span>
                <button
                  className="btn-secondary"
                  disabled={page + 1 >= maksSider || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Neste →
                </button>
              </div>
            )}
          </>
        ) : (
          <CompanyDetail
            company={selectedCompany}
            onBack={() => setSelectedCompany(null)}
          />
        )}
      </main>

      <footer className="container" style={{ padding: '32px 0', color: '#86868b', fontSize: '13px' }}>
        Data: Enhetsregisteret (Brønnøysundregistrene) · Adresser geokodet med Kartverket (Geonorge).
        Begge åpne API-er under NLOD-lisens.
      </footer>
    </div>
  );
}

export default App;
