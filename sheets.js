// ============================================
// ANNAPP40 — SHEETS
// Guardar i llegir metadades a Google Sheets
// ============================================

const Sheets = (() => {

  const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

  function _headers() {
    return {
      'Authorization': 'Bearer ' + Auth.getToken(),
      'Content-Type':  'application/json',
    };
  }

  // ── Afegir una fila de metadades ─────────────
  // Columnes: id | fileId | url | any | lloc | persones | categoria | notes | pujatPer | data
  async function appendRow(data) {
    const { id, fileId, url, any, lloc, persones, categoria, notes, pujatPer } = data;

    const row = [
      id,
      fileId,
      url,
      any        || '',
      lloc       || '',
      Array.isArray(persones) ? persones.join(', ') : (persones || ''),
      Array.isArray(categoria) ? categoria.join(', ') : (categoria || ''),
      notes      || '',
      pujatPer   || '',
      new Date().toISOString(),
    ];

    const range = `'${CONFIG.SHEET_NAME}'!A:J`;
    const endpoint = `${BASE}/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

    const res = await fetch(endpoint, {
      method:  'POST',
      headers: _headers(),
      body: JSON.stringify({ values: [row] }),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error('Error Sheets: ' + (err.error?.message || res.status));
    }

    return await res.json();
  }

  // ── Llegir totes les files ───────────────────
  async function readAll() {
    const range = `'${CONFIG.SHEET_NAME}'!A2:J`;
    const endpoint = `${BASE}/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;

    const res = await fetch(endpoint, { headers: _headers() });
    if (!res.ok) throw new Error('Error llegint Sheets');

    const data = await res.json();
    const rows = data.values || [];

    return rows.map(r => ({
      id:        r[0] || '',
      fileId:    r[1] || '',
      url:       r[2] || '',
      any:       r[3] || '',
      lloc:      r[4] || '',
      persones:  r[5] ? r[5].split(', ') : [],
      categoria: r[6] ? r[6].split(', ') : [],
      notes:     r[7] || '',
      pujatPer:  r[8] || '',
      data:      r[9] || '',
    }));
  }

  return { appendRow, readAll };

})();
