export default function handler(req, res) {
  const mockCompanies = [
    {
      organisasjonsnummer: '123456789',
      navn: 'Telemark Eiendom AS',
      forretningsadresse: { kommune: 'Skien' }
    },
    {
      organisasjonsnummer: '987654321',
      navn: 'Vestfold Eiendomsselskap',
      forretningsadresse: { kommune: 'Tønsberg' }
    },
    {
      organisasjonsnummer: '555666777',
      navn: 'Buskerud Eiendommer',
      forretningsadresse: { kommune: 'Drammen' }
    },
    {
      organisasjonsnummer: '111222333',
      navn: 'Nordic Property Management',
      forretningsadresse: { kommune: 'Larvik' }
    },
    {
      organisasjonsnummer: '444555666',
      navn: 'Eiendomsselskapet Østlandet',
      forretningsadresse: { kommune: 'Fredrikstad' }
    }
  ];

  const companiesWithData = mockCompanies.map((company, idx) => ({
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

  res.status(200).json({
    companies: companiesWithData,
    total: companiesWithData.length,
    page: 1,
    hasMore: false
  });
}
