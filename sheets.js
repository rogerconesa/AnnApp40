// ============================================
// ANNAPP40 — SHEETS
// ============================================

const Sheets = (() => {
  const BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

  function _headers() {
    return {
      'Authorization': 'Bearer ' + Auth.getToken(),
      'Content-Type':  'application/json',
    };
  }

  async function appendRow(data) {
    const { id, fileId, url, any, lloc, persones, categoria, notes, pujatNom, pujatEmail, lat, lng } = data;
    const row = [
      id, fileId, url,
      any || '', lloc || '',
      Array.isArray(persones)  ? persones.join(', ')  : '',
      Array.isArray(categoria) ? categoria.join(', ') : '',
      notes || '', pujatNom || '', pujatEmail || '',
      new Date().toISOString(),
      lat !== undefined && lat !== null ? lat : '',
      lng !== undefined && lng !== null ? lng : '',
    ];
    const range    = `'${CONFIG.SHEET_NAME}'!A:M`;
    const endpoint = `${BASE}/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(range)}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;
    const res = await fetch(endpoint, {
      method: 'POST', headers: _headers(),
      body: JSON.stringify({ values: [row] }),
    });
    if (!res.ok) throw new Error('Error Sheets: ' + res.status);
    return res.json();
  }

  async function readAll() {
    const range    = `'${CONFIG.SHEET_NAME}'!A2:M`;
    const endpoint = `${BASE}/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
    const res = await fetch(endpoint, { headers: _headers() });
    if (!res.ok) throw new Error('Error llegint Sheets');
    const data = await res.json();
    const rows = data.values || [];
    return rows.map(r => ({
      id:         r[0]  || '',
      fileId:     r[1]  || '',
      url:        r[2]  || '',
      any:        r[3]  || '',
      lloc:       r[4]  || '',
      persones:   r[5]  ? r[5].split(', ') : [],
      categoria:  r[6]  ? r[6].split(', ') : [],
      notes:      r[7]  || '',
      pujatNom:   r[8]  || '',
      pujatEmail: r[9]  || '',
      data:       r[10] || '',
      lat:        r[11] ? parseFloat(r[11]) : null,
      lng:        r[12] ? parseFloat(r[12]) : null,
    }));
  }

  async function updateRowByFileId(fileId, data) {
    const range    = `'${CONFIG.SHEET_NAME}'!A:M`;
    const endpoint = `${BASE}/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
    const res  = await fetch(endpoint, { headers: _headers() });
    if (!res.ok) throw new Error('Error llegint Sheets');
    const json = await res.json();
    const rows = json.values || [];
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][1] === fileId) { rowIndex = i + 1; break; }
    }
    if (rowIndex === -1) throw new Error('Fila no trobada');

    // Actualitzar D:H (any, lloc, persones, categoria, notes) i L:M (lat, lng)
    const updateRange    = `'${CONFIG.SHEET_NAME}'!D${rowIndex}:H${rowIndex}`;
    const updateEndpoint = `${BASE}/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(updateRange)}?valueInputOption=RAW`;
    await fetch(updateEndpoint, {
      method: 'PUT', headers: _headers(),
      body: JSON.stringify({ values: [[
        data.any, data.lloc,
        Array.isArray(data.persones)  ? data.persones.join(', ')  : '',
        Array.isArray(data.categoria) ? data.categoria.join(', ') : '',
        data.notes || '',
      ]]})
    });

    // Actualitzar lat/lng si venen
    if (data.lat !== undefined) {
      const latlngRange    = `'${CONFIG.SHEET_NAME}'!L${rowIndex}:M${rowIndex}`;
      const latlngEndpoint = `${BASE}/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(latlngRange)}?valueInputOption=RAW`;
      await fetch(latlngEndpoint, {
        method: 'PUT', headers: _headers(),
        body: JSON.stringify({ values: [[data.lat || '', data.lng || '']] })
      });
    }
  }

  async function deleteRowByFileId(fileId) {
    const range    = `'${CONFIG.SHEET_NAME}'!A:M`;
    const endpoint = `${BASE}/${CONFIG.SPREADSHEET_ID}/values/${encodeURIComponent(range)}`;
    const res  = await fetch(endpoint, { headers: _headers() });
    if (!res.ok) throw new Error('Error llegint Sheets');
    const data = await res.json();
    const rows = data.values || [];
    let rowIndex = -1;
    for (let i = 0; i < rows.length; i++) {
      if (rows[i][1] === fileId) { rowIndex = i; break; }
    }
    if (rowIndex === -1) throw new Error('Fila no trobada');
    const metaRes = await fetch(`${BASE}/${CONFIG.SPREADSHEET_ID}`, { headers: _headers() });
    const meta    = await metaRes.json();
    const sheet   = meta.sheets.find(s => s.properties.title === CONFIG.SHEET_NAME);
    const sheetId = sheet.properties.sheetId;
    await fetch(`${BASE}/${CONFIG.SPREADSHEET_ID}:batchUpdate`, {
      method: 'POST', headers: _headers(),
      body: JSON.stringify({ requests: [{ deleteDimension: {
        range: { sheetId, dimension: 'ROWS', startIndex: rowIndex, endIndex: rowIndex + 1 }
      }}]})
    });
  }

  return { appendRow, readAll, updateRowByFileId, deleteRowByFileId };
})();
