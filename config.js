// ============================================
// ANNAPP40 — CONFIG
// ============================================

const CONFIG = {
  // Google OAuth
  CLIENT_ID: '377470590062-mdfmcs3unpc843cqg3f25qf8m3godgk3.apps.googleusercontent.com',

  // Google Drive — carpeta on es pujaran les fotos
  DRIVE_FOLDER_ID: '1h0kMl3ZJqlOPfovzU-B1uIwLaRNMfIEZ',

  // Google Sheets — base de dades de metadades
  SPREADSHEET_ID: '1j9z53zI9LDy8lo__A1ZXq8H4MUqQ8kaSR9JYA-WHzIE',
  SHEET_NAME: 'fotos40anna',

  // Scopes necessaris — inclou openid/profile/email per obtenir dades d'usuari
  SCOPES: [
    'openid',
    'profile',
    'email',
    'https://www.googleapis.com/auth/drive.file',
    'https://www.googleapis.com/auth/spreadsheets'
  ].join(' '),

  // Persones del grup (s'amplia des de l'app)
  PERSONES_INICIALS: ['Roger', 'Ramon', 'Jordi'],

  // Categories
  CATEGORIES: [
    { emoji: '🎉', nom: 'Festa' },
    { emoji: '✈️', nom: 'Viatges' },
    { emoji: '🏖️', nom: 'Platja' },
    { emoji: '🍽️', nom: 'Dinar' },
    { emoji: '🎂', nom: 'Aniversari' },
    { emoji: '🌙', nom: 'Sopar' },
    { emoji: '🎄', nom: 'Nadal' },
    { emoji: '⚽', nom: 'Esport' },
    { emoji: '🔵🔴', nom: 'Barça' },
    { emoji: '🔥', nom: 'Barbacoa' },
    { emoji: '🎤', nom: 'Karaoke' },
    { emoji: '🍻', nom: 'Bar' },
  ]
};
