const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());

const BRREG = 'https://data.brreg.no/enhetsregisteret/api';
const GEONORGE = 'https://ws.geonorge.no/adresser/v1/sok';

// NACE-koder for eiendom (2025-revisjonen)
const NAERINGSKODER = ['68.200', '68.310', '68.320'].join(',');

const FYLKER = {
  Buskerud: ['3301', '3303', '3305', '3310', '3312', '3314', '3316', '3318', '3320',
    '3322', '3324', '3326', '3328', '3330', '3332', '3334', '3336', '3338'],
  Vestfold: ['3901', '3903', '3905', '3907', '3909', '3911'],
  Telemark: ['4001', '4003', '4005', '4010', '4012', '4014', '4016', '4018', '4020',
    '4022', '4024', '4026', '4028', '4030', '4032', '4034', '4036']
};

const ALLE_KOMMUNER = Object.values(FYLKER).flat();

const fylkeFor = (kommunenummer = '') =>
  Object.keys(FYLKER).find(f => FYLKER[f].includes(kommunenummer)) || null;

const SELSKAPSFORMER = new Set(['AS', 'ASA', 'ANS', 'DA', 'NUF', 'BA', 'SA', 'KS', 'BBL', 'IKS']);

const titleCase = (s) => {
  if (!s) return null;
  return s
    .toLowerCase()
    .replace(/(^|[\s\-/])(\p{L})/gu, (_, sep, c) => sep + c.toUpperCase())
    .replace(/\p{L}+/gu, (word) =>
      SELSKAPSFORMER.has(word.toUpperCase()) ? word.toUpperCase() : word
    );
};

const brreg = axios.create({
  baseURL: BRREG,
  timeout: 15000,
  headers: { Accept: 'application/json' }
});

function mapEnhet(e) {
  const adr = e.forretningsadresse || {};
  return {
    id: e.organisasjonsnummer,
    orgnr: e.organisasjonsnummer,
    name: titleCase(e.navn),
    orgform: e.organisasjonsform?.beskrivelse || null,
    naering: e.naeringskode1?.beskrivelse || null,
    naeringskode: e.naeringskode1?.kode || null,
    fylke: fylkeFor(adr.kommunenummer),
    kommune: titleCase(adr.kommune),
    address: (adr.adresse || []).filter(Boolean).join(', ') || null,
    postalCode: adr.postnummer || null,
    city: titleCase(adr.poststed),
    established: e.stiftelsesdato || null,
    registered: e.registreringsdatoEnhetsregisteret || null,
    employees: typeof e.antallAnsatte === 'number' ? e.antallAnsatte : null,
    phone: e.telefon || e.mobil || null,
    email: e.epostadresse || null,
    website: e.hjemmeside || null,
    konkurs: !!e.konkurs,
    underAvvikling: !!(e.underAvvikling || e.underTvangsavviklingEllerTvangsopplosning)
  };
}

// Søk i Enhetsregisteret
app.get('/api/companies', async (req, res) => {
  try {
    const { search = '', fylke = '', page = 0, size = 24 } = req.query;
    const kommuner = FYLKER[fylke] || ALLE_KOMMUNER;

    const params = {
      naeringskode: NAERINGSKODER,
      kommunenummer: kommuner.join(','),
      size: Math.min(Number(size) || 24, 100),
      page: Number(page) || 0
    };

    const term = search.trim();
    const orgnr = term.replace(/[\s.-]/g, '');
    const sokerPaaOrgnr = /^\d{9}$/.test(orgnr);

    if (sokerPaaOrgnr) params.organisasjonsnummer = orgnr;
    else if (term) params.navn = term;

    const { data } = await brreg.get('/enheter', { params });
    const enheter = data._embedded?.enheter || [];
    const total = data.page?.totalElements ?? 0;

    // Et gyldig orgnr uten treff er som regel et selskap utenfor utvalget,
    // ikke et tomt søk — si hvilket, i stedet for "ingen treff".
    let notice = null;
    if (sokerPaaOrgnr && total === 0) {
      try {
        const { data: enhet } = await brreg.get(`/enheter/${orgnr}`);
        notice = `${titleCase(enhet.navn)} (${orgnr}) finnes i Enhetsregisteret, men er ikke registrert som eiendomsselskap i Telemark, Vestfold eller Buskerud.`;
      } catch {
        notice = `Fant ingen enhet med organisasjonsnummer ${orgnr}.`;
      }
    }

    res.json({
      companies: enheter.map(mapEnhet),
      total,
      page: data.page?.number ?? 0,
      totalPages: data.page?.totalPages ?? 0,
      notice,
      source: 'Enhetsregisteret (Brønnøysundregistrene)'
    });
  } catch (error) {
    console.error('Brreg søk feilet:', error.message);
    res.status(502).json({ error: 'Kunne ikke hente data fra Brønnøysundregistrene' });
  }
});

// Detaljer + roller for ett selskap
app.get('/api/companies/:id', async (req, res) => {
  const { id } = req.params;
  if (!/^\d{9}$/.test(id)) {
    return res.status(400).json({ error: 'Ugyldig organisasjonsnummer' });
  }

  try {
    const { data: enhet } = await brreg.get(`/enheter/${id}`);
    const company = mapEnhet(enhet);

    company.formaal = (enhet.vedtektsfestetFormaal || []).join(' ') || null;
    company.aktivitet = (enhet.aktivitet || []).join(' ') || null;
    company.kapital = enhet.kapital?.belop ?? null;
    company.sisteAarsregnskap = enhet.sisteInnsendteAarsregnskap || null;
    company.roles = [];

    // Roller ligger på et eget endepunkt og kan mangle
    try {
      const { data: roller } = await brreg.get(`/enheter/${id}/roller`);
      company.roles = (roller.rollegrupper || []).flatMap(gruppe =>
        (gruppe.roller || [])
          .filter(r => !r.fratraadt)
          .map(r => {
            const navn = r.person?.navn;
            const personNavn = navn
              ? [navn.fornavn, navn.mellomnavn, navn.etternavn].filter(Boolean).join(' ')
              : null;
            return {
              role: r.type?.beskrivelse || r.type?.kode,
              name: personNavn || titleCase((r.enhet?.navn || []).join(' ')) || 'Ukjent',
              isCompany: !r.person
            };
          })
      );
    } catch (rolleError) {
      console.warn(`Roller utilgjengelig for ${id}:`, rolleError.message);
    }

    res.json(company);
  } catch (error) {
    if (error.response?.status === 404) {
      return res.status(404).json({ error: 'Selskapet finnes ikke i Enhetsregisteret' });
    }
    console.error('Brreg detalj feilet:', error.message);
    res.status(502).json({ error: 'Kunne ikke hente detaljer' });
  }
});

// Geokoding via Kartverket (Geonorge) av selskapets registrerte adresser
async function geocode(adresse) {
  const linje = (adresse.adresse || []).filter(Boolean).join(' ');
  if (!linje || !adresse.postnummer) return null;

  try {
    const { data } = await axios.get(GEONORGE, {
      params: { sok: linje, postnummer: adresse.postnummer, treffPerSide: 1 },
      timeout: 10000
    });
    const treff = data.adresser?.[0];
    if (!treff?.representasjonspunkt) return null;

    return {
      address: `${treff.adressetekst}, ${treff.postnummer} ${titleCase(treff.poststed)}`,
      lat: treff.representasjonspunkt.lat,
      lng: treff.representasjonspunkt.lon,
      kommune: titleCase(treff.kommunenavn),
      matrikkel: `${treff.kommunenummer}-${treff.gardsnummer}/${treff.bruksnummer}`
    };
  } catch (error) {
    console.warn('Geokoding feilet:', error.message);
    return null;
  }
}

app.get('/api/properties', async (req, res) => {
  const { orgnr } = req.query;
  if (!/^\d{9}$/.test(orgnr || '')) {
    return res.status(400).json({ error: 'Ugyldig organisasjonsnummer' });
  }

  try {
    const [enhetRes, underRes] = await Promise.all([
      brreg.get(`/enheter/${orgnr}`),
      brreg.get('/underenheter', { params: { overordnetEnhet: orgnr, size: 20 } })
        .catch(() => ({ data: {} }))
    ]);

    const kilder = [];
    const hovedadresse = enhetRes.data.forretningsadresse;
    if (hovedadresse) kilder.push({ adresse: hovedadresse, type: 'Forretningsadresse' });

    for (const under of underRes.data._embedded?.underenheter || []) {
      const adr = under.beliggenhetsadresse;
      if (adr) kilder.push({ adresse: adr, type: titleCase(under.navn) || 'Underenhet' });
    }

    const punkter = await Promise.all(
      kilder.map(async (kilde, idx) => {
        const geo = await geocode(kilde.adresse);
        return geo && { id: idx + 1, type: kilde.type, ...geo };
      })
    );

    const funnet = punkter.filter(Boolean);
    const unike = funnet.filter(
      (p, i) => funnet.findIndex(q => q.matrikkel === p.matrikkel) === i
    );

    res.json({
      properties: unike,
      source: 'Kartverket (Geonorge) · adresser fra Enhetsregisteret'
    });
  } catch (error) {
    console.error('Adressehenting feilet:', error.message);
    res.status(502).json({ error: 'Kunne ikke hente adresser' });
  }
});

app.use(express.static(path.join(__dirname, 'client', 'build')));

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'build', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`✓ Server kjører på port ${PORT}`);
});
