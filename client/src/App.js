import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import CompanyList from './components/CompanyList';
import CompanyDetail from './components/CompanyDetail';
import Stats from './components/Stats';

function App() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [search, setSearch] = useState('');
  const [fylke, setFylke] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async (searchTerm = '', fylkeFilter = '') => {
    setLoading(true);
    try {
      const baseURL = process.env.NODE_ENV === 'production'
        ? 'https://eiendomsok.onrender.com'
        : '';
      const response = await axios.get(`${baseURL}/api/companies`, {
        params: {
          search: searchTerm,
          fylke: fylkeFilter
        }
      });
      setCompanies(response.data?.companies || []);
      setSelectedCompany(null);
    } catch (error) {
      console.error('Feil ved henting av bedrifter:', error);
      setCompanies([]);
    }
    setLoading(false);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    fetchCompanies(search, fylke);
  };

  return (
    <div className="app">
      <header className="header">
        <div className="container">
          <h1>Eiendomssøk</h1>
          <p>Administrer og oppdag eiendomsselskaper i Telemark, Vestfold og Buskerud</p>
        </div>
      </header>

      <main className="container">
        <Stats companies={companies} />

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

            <CompanyList
              companies={companies}
              loading={loading}
              onSelectCompany={setSelectedCompany}
            />
          </>
        ) : (
          <CompanyDetail
            company={selectedCompany}
            onBack={() => setSelectedCompany(null)}
          />
        )}
      </main>
    </div>
  );
}

export default App;
