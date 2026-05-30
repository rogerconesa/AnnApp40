// ============================================
// ANNAPP40 — CONFIG
// ============================================

const CONFIG = {
  CLIENT_ID: '377470590062-mdfmcs3unpc843cqg3f25qf8m3godgk3.apps.googleusercontent.com',
  DRIVE_FOLDER_ID: '1h0kMl3ZJqlOPfovzU-B1uIwLaRNMfIEZ',
  SPREADSHEET_ID: '1j9z53zI9LDy8lo__A1ZXq8H4MUqQ8kaSR9JYA-WHzIE',
  SHEET_NAME: 'Fotos',
  MAPS_API_KEY: 'AIzaSyDlVEyT4r5s1M4aRjKVOFXHsnhCXRiiQOI',
  PICKER_API_KEY: 'AIzaSyDlVEyT4r5s1M4aRjKVOFXHsnhCXRiiQOI',

  SCOPES: [
    'openid', 'profile', 'email',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
  ].join(' '),

  ANYS: (() => {
    const anys = [];
    for (let y = new Date().getFullYear(); y >= 1985; y--) anys.push(y);
    return anys;
  })(),

  PERSONES_INICIALS: ['Roger', 'Ramon', 'Jordi'],

  CATEGORIES: [
    { nom: 'Vallvis' },
    { nom: 'Happy Family' },
    { nom: 'ICR' },
    { nom: 'Wiki-Wiki' },
    { nom: 'Menéndez' },
    { nom: 'DMS' },
    { nom: 'Senes' },
    { nom: 'Aran' },
    { nom: 'Festa' },
    { nom: 'Aniversari' },
    { nom: 'Viatges' },
    { nom: 'Platja' },
    { nom: 'Barbacoa' },
  ]
};
