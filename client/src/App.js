import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import CompanyList from './components/CompanyList';
import CompanyDetail from './components/CompanyDetail';
import GroupedList from './components/GroupedList';
import ResultsMap from './components/ResultsMap';
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
  const [visning, setVisning] = useState('liste');
  const [kart, setKart] = useState({ points: [], total: 0, vist: 0, utenPosisjon: 0, begrenset: null });
  const [kartLaster, setKartLaster] = useState(false);
  const [grupper, setGrupper] = useState({
    rader: [], totalPages: 0, antallGrupper: 0, antallSelskaper: 0, total: 0, begrenset: null
  });
  const [grupperLaster, setGrupperLaster] = useState(false);

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
    if (visning !== 'grupper') return;
    let avbrutt = false;

    setGrupperLaster(true);
    axios
      .get(`${getApiBaseUrl()}/api/grupper`, { params: { ...query, page, size: PAGE_SIZE } })
      .then(({ data }) => {
        if (avbrutt) return;
        setGrupper({
          rader: data.rader || [],
          totalPages: data.totalPages || 0,
          antallGrupper: data.antallGrupper || 0,
          antallSelskaper: data.antallSelskaper || 0,
          total: data.total || 0,
          begrenset: data.begrenset || null
        });
      })
      .catch((err) => {
        if (avbrutt) return;
        console.error('Feil ved gruppering:', err);
        setGrupper({ rader: [], totalPages: 0, antallGrupper: 0, antallSelskaper: 0, total: 0, begrenset: null });
      })
      .finally(() => !avbrutt && setGrupperLaster(false));

    return () => {
      avbrutt = true;
    };
  }, [visning, query, page]);

  // Kartet henter hele utvalget, ikke listesiden, så det trenger sitt eget kall
  useEffect(() => {
    if (visning !== 'kart') return;
    let avbrutt = false;

    setKartLaster(true);
    axios
      .get(`${getApiBaseUrl()}/api/kart`, { params: query })
      .then(({ data }) => {
        if (avbrutt) return;
        setKart({
          points: data.points || [],
          total: data.total || 0,
          vist: data.vist || 0,
          utenPosisjon: data.utenPosisjon || 0,
          begrenset: data.begrenset || null
        });
      })
      .catch((err) => {
        if (avbrutt) return;
        console.error('Feil ved henting av kartdata:', err);
        setKart({ points: [], total: 0, vist: 0, utenPosisjon: 0, begrenset: null });
      })
      .finally(() => !avbrutt && setKartLaster(false));

    return () => {
      avbrutt = true;
    };
  }, [visning, query]);

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
  const antallSider = visning === 'grupper' ? grupper.totalPages : maksSider;
  const sideLaster = visning === 'grupper' ? grupperLaster : loading;

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

            <div className="view-toggle" role="group" aria-label="Visning">
              {[
                ['liste', 'Liste'],
                ['grupper', 'Grupper'],
                ['kart', 'Kart']
              ].map(([verdi, etikett]) => (
                <button
                  key={verdi}
                  type="button"
                  className={visning === verdi ? 'active' : ''}
                  onClick={() => {
                    // Liste og grupper har ulikt antall rader, så en sidenummer
                    // fra den ene gir ikke mening i den andre.
                    if (verdi !== visning) setPage(0);
                    setVisning(verdi);
                  }}
                >
                  {etikett}
                </button>
              ))}
            </div>

            {error && <div className="loading">{error}</div>}
            {notice && !loading && <div className="notice">{notice}</div>}

            {visning === 'grupper' ? (
              <GroupedList
                rader={grupper.rader}
                loading={grupperLaster}
                antallGrupper={grupper.antallGrupper}
                antallSelskaper={grupper.antallSelskaper}
                total={grupper.total}
                begrenset={grupper.begrenset}
                onSelectCompany={setSelectedCompany}
              />
            ) : visning === 'kart' ? (
              <ResultsMap
                points={kart.points}
                loading={kartLaster}
                total={kart.total}
                vist={kart.vist}
                utenPosisjon={kart.utenPosisjon}
                begrenset={kart.begrenset}
                onSelectCompany={setSelectedCompany}
              />
            ) : (
              (!notice || loading) && (
                <CompanyList
                  companies={companies}
                  loading={loading}
                  onSelectCompany={setSelectedCompany}
                />
              )
            )}

            {visning !== 'kart' && antallSider > 1 && (
              <div className="pagination">
                <button
                  className="btn-secondary"
                  disabled={page === 0 || sideLaster}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  ← Forrige
                </button>
                <span>Side {page + 1} av {antallSider.toLocaleString('nb-NO')}</span>
                <button
                  className="btn-secondary"
                  disabled={page + 1 >= antallSider || sideLaster}
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
