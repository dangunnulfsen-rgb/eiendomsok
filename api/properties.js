export default function handler(req, res) {
  const { orgnr } = req.query;

  const properties = orgnr === '123456789' ? [
    { id: 1, address: 'Storgata 45, 3700 Skien', type: 'Bolig', lat: 59.2087, lng: 9.6477, size: 250 },
    { id: 2, address: 'Kirkegata 12, 3915 Porsgrunn', type: 'Næring', lat: 59.1389, lng: 9.6453, size: 1200 },
    { id: 3, address: 'Torggata 8, 3700 Skien', type: 'Bolig', lat: 59.2095, lng: 9.6455, size: 180 }
  ] : [
    { id: 1, address: 'Hovedgata 10, Tønsberg', type: 'Bolig', lat: 59.2667, lng: 10.4000, size: 320 },
    { id: 2, address: 'Strandveien 25, Larvik', type: 'Næringsbygg', lat: 59.0500, lng: 10.0400, size: 850 },
    { id: 3, address: 'Parkvegen 7, Fredrikstad', type: 'Kontor', lat: 59.2178, lng: 10.9470, size: 450 }
  ];

  res.status(200).json(properties);
}
