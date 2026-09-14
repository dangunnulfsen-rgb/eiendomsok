const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Brønnøysund Register API - Søk etter eiendomsselskaper
app.get('/api/companies', async (req, res) => {
  try {
    const { search = '', fylke = '', page = 1 } = req.query;

    // Næringskoder for eiendom
    const næringsKoder = ['6810', '6820', '6829', '6831', '6832'];

    // Søk i Brønnøysund
    const responses = await Promise.all(
      næringsKoder.map(kode =>
        axios.get('https://data.brreg.no/enhetsregisteret/api/enheter', {
          params: {
            naeringskode: kode,
            navn: search || undefined,
            kommune: fylke || undefined,
            size: 100
          }
        })
      )
    );

    const allCompanies = responses
      .flatMap(r => r.data._embedded?.enheter || [])
      .filter(e => e.registreringsstatus === 'Aktiv');

    // Legg til mock data for eiendommer
    const companiesWithData = allCompanies.slice(0, 10).map((company, idx) => ({
      id: company.organisasjonsnummer,
      name: company.navn,
      orgnr: company.organisasjonsnummer,
      fylke: company.forretningsadresse?.kommune || 'Ukjent',
      properties: Math.floor(Math.random() * 40) + 5,
      employees: Math.floor(Math.random() * 30) + 1,
      established: Math.floor(Math.random() * 15) + 2008,
      leader: ['Ole Johansen', 'Anna Berg', 'Per Larsen', 'Karin Sæther'][idx % 4],
      email: `info@${company.navn.toLowerCase().replace(/\s+/g, '-')}.no`,
      phone: `+47 ${Math.floor(Math.random() * 90000000) + 10000000}`
    }));

    res.json({
      companies: companiesWithData,
      total: allCompanies.length,
      page,
      hasMore: allCompanies.length > page * 10
    });
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ error: 'Feil ved søk' });
  }
});

// Hent detaljer om ett selskap
app.get('/api/companies/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const response = await axios.get(`https://data.brreg.no/enhetsregisteret/api/enheter/${id}`);
    const company = response.data;

    // Hent roller (ledere, styremedlemmer)
    const rolesResponse = await axios.get(
      `https://data.brreg.no/enhetsregisteret/api/enheter/${id}/roller`
    );

    res.json({
      id: company.organisasjonsnummer,
      name: company.navn,
      orgnr: company.organisasjonsnummer,
      address: company.forretningsadresse?.adresse?.join(', '),
      postalCode: company.forretningsadresse?.postnummer,
      city: company.forretningsadresse?.poststed,
      phone: company.organisasjonsnummer,
      website: company.hjemmeside,
      established: company.stiftelsesdato,
      properties: Math.floor(Math.random() * 40) + 5,
      leaders: rolesResponse.data._embedded?.roller
        ?.filter(r => ['LEDER', 'DAGLIG_LEDER', 'STYRELEDER'].includes(r.rolle))
        ?.map(r => ({
          name: r.person?.navn || 'Ukjent',
          role: r.rolle,
          email: 'kontakt@selskap.no',
          phone: '+47 987 65 432'
        })) || []
    });
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ error: 'Kunne ikke hente detaljer' });
  }
});

// Kartverket API proxy - properties with coordinates
app.get('/api/properties', async (req, res) => {
  try {
    const { orgnr } = req.query;

    // Mock Kartverket data with real coordinates (Telemark/Vestfold)
    const propertiesData = {
      '123456789': [
        { id: 1, address: 'Storgata 45, 3700 Skien', type: 'Bolig', lat: 59.2087, lng: 9.6477, size: 250 },
        { id: 2, address: 'Kirkegata 12, 3915 Porsgrunn', type: 'Næring', lat: 59.1389, lng: 9.6453, size: 1200 },
        { id: 3, address: 'Torggata 8, 3700 Skien', type: 'Bolig', lat: 59.2095, lng: 9.6455, size: 180 }
      ],
      default: [
        { id: 1, address: 'Hovedgata 10, Tønsberg', type: 'Bolig', lat: 59.2667, lng: 10.4000, size: 320 },
        { id: 2, address: 'Strandveien 25, Larvik', type: 'Næringsbygg', lat: 59.0500, lng: 10.0400, size: 850 },
        { id: 3, address: 'Parkvegen 7, Fredrikstad', type: 'Kontor', lat: 59.2178, lng: 10.9470, size: 450 }
      ]
    };

    const properties = propertiesData[orgnr] || propertiesData.default;
    res.json(properties);
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ error: 'Feil ved henting av eiendommer' });
  }
});

app.listen(PORT, () => {
  console.log(`✓ Server kjører på http://localhost:${PORT}`);
  console.log(`✓ API: http://localhost:${PORT}/api/companies`);
});
