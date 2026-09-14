# Eiendomssøk - Apple Blue Design Prototype

En interaktiv prototype for søk og oversikt over eiendomsselskaper i Telemark, Vestfold og Buskerud. Designet er inspirert av Apple's minimalistiske designspråk.

## Features

- ✅ Søk etter eiendomsselskaper fra Brønnøysund Register
- ✅ Filtrer etter fylke (Telemark, Vestfold, Buskerud)
- ✅ Se detaljer om hver bedrift
- ✅ Vise daglig leder og kontaktinformasjon
- ✅ Statistikk over samlet data
- ✅ Apple Blue design system (minimalistisk, luftig, elegant)

## Tech Stack

**Backend:**
- Node.js + Express
- Axios for API calls
- CORS aktivert

**Frontend:**
- React 18
- Axios for API client
- CSS3 (Apple Blue theme)

**APIs:**
- Brønnøysund Register API (bedriftssøk)
- Kartverket API (eiendommer - integrasjon)

## Installer og kjør

### 1. Installer dependencies

```bash
npm install
cd client && npm install && cd ..
```

### 2. Kjør development server

```bash
npm run dev
```

Dette starter både backend (port 5000) og frontend (port 3000) samtidig.

Eller kjør separat:

```bash
# Backend (terminal 1)
npm run server

# Frontend (terminal 2)
cd client
npm start
```

### 3. Åpne i browser

```
http://localhost:3000
```

## Struktur

```
Slackbot/
├── server.js                 # Express backend
├── package.json             # Backend dependencies
├── client/
│   ├── src/
│   │   ├── App.js          # Main React component
│   │   ├── App.css         # Apple Blue theme
│   │   ├── index.js        # React entry
│   │   └── components/
│   │       ├── Stats.js    # Statistics cards
│   │       ├── CompanyList.js
│   │       └── CompanyDetail.js
│   ├── public/
│   │   └── index.html
│   └── package.json        # Frontend dependencies
└── README.md
```

## API Endpoints

### GET `/api/companies`
Søk etter bedrifter

Query params:
- `search`: Bedriftsnavn
- `fylke`: Telemark, Vestfold, Buskerud
- `page`: Sidenummer

### GET `/api/companies/:id`
Hent detaljer om ett selskap

### GET `/api/properties`
Hent eiendommer (Kartverket integrasjon)

## Design Philosophy

- **Minimalist**: Ren, hvit bakgrunn med strategiske accenter
- **Spacious**: Generøst whitespace
- **Hierarchical**: Tydelig visuell hierarki
- **Accessible**: Gode kontraster, lesbar font
- **Apple System Font**: -apple-system, BlinkMacSystemFont

### Color Palette

- Primary Blue: #0071e3
- Green: #34c759
- Orange: #ff9500
- Purple: #af52de
- Background: #f5f5f7
- Text: #1d1d1f
- Secondary: #86868b

## Neste Steg

1. Integrer ekte Kartverket API for eiendommer
2. Legg til 1881/Gulesider søk for kontaktinfo
3. Implementer eksport (CSV, Excel, PDF)
4. Lagre favoritter og søk
5. Deploy til Vercel eller annen hosting

## License

Intern prototype - Ly Forsikring
