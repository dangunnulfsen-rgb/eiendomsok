import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import CompanyList from './components/CompanyList';
import CompanyDetail from './components/CompanyDetail';
import Stats from './components/Stats';
import getApiBaseUrl from './utils/api';

const PAGE_SIZE = 24;

function App() {
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [page, setPage] = useState(0);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [search, setSearch] = useState('');
  const [fylke, setFylke] = useState('');
  const [query, setQuery] = useState({ search: '', fylke: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

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
    } catch (err) {
      console.error('Feil ved henting av bedrifter:', err);
      setError('Kunne ikke hente data fra Brønnøysundregistrene. Prøv igjen.');
      setCompanies([]);
      setTotal(0);
    }
    setLoading(false);
  }, [query, page]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(0);
    setQuery({ search, fylke });
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
                placeholder="Søk bedriftsnavn..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="search-input"
              />
              <select
                value={fylke}
                onChange={(e) => setFylke(e.target.value)}
                className="search-input"
              >
                <option value="">Alle fylker</option>
                <option value="Telemark">Telemark</option>
                <option value="Vestfold">Vestfold</option>
                <option value="Buskerud">Buskerud</option>
              </select>
              <button type="submit" className="btn-primary">Søk</button>
            </form>

            {error && <div className="loading">{error}</div>}

            <CompanyList
              companies={companies}
              loading={loading}
              onSelectCompany={setSelectedCompany}
            />

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
