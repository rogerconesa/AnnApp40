// ============================================
// ANNAPP40 — DRIVE
// Pujada de fotos a Google Drive
// ============================================

const Drive = (() => {

  const BASE_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const META_URL = 'https://www.googleapis.com/drive/v3/files';

  // ── Pujar un fitxer ──────────────────────────
  async function uploadFile(file, onProgress) {
    const token = Auth.getToken();
    if (!token) throw new Error('No autenticat');

    // Construir multipart body
    const metadata = {
      name:    file.name,
      parents: [CONFIG.DRIVE_FOLDER_ID],
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    // Usar XMLHttpRequest per tenir progressos
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const data = JSON.parse(xhr.responseText);
          resolve(data);
        } else {
          reject(new Error('Error pujant fitxer: ' + xhr.status));
        }
      });

      xhr.addEventListener('error', () => reject(new Error('Error de xarxa')));

      xhr.open('POST', BASE_URL);
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.send(form);
    });
  }

  // ── Fer el fitxer públic (lectura) ───────────
  async function makePublic(fileId) {
    const token = Auth.getToken();
    await fetch(`${META_URL}/${fileId}/permissions`, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
  }

  // ── URL pública de la miniatura ──────────────
  function getThumbnailUrl(fileId) {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`;
  }

  // ── URL de visualització ─────────────────────
  function getViewUrl(fileId) {
    return `https://drive.google.com/file/d/${fileId}/view`;
  }

  return { uploadFile, makePublic, getThumbnailUrl, getViewUrl };

})();
