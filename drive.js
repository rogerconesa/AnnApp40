// ============================================
// ANNAPP40 — DRIVE v2
// Pujada de fotos/vídeos + Drive Picker
// ============================================

const Drive = (() => {
  const BASE_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const META_URL = 'https://www.googleapis.com/drive/v3/files';

  // ── Pujar fitxer local ────────────────────────
  async function uploadFile(file, onProgress) {
    const token    = Auth.getToken();
    const metadata = { name: file.name, parents: [CONFIG.DRIVE_FOLDER_ID] };
    const form     = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
      });
      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve(JSON.parse(xhr.responseText));
        else reject(new Error('Error pujant: ' + xhr.status));
      });
      xhr.addEventListener('error', () => reject(new Error('Error de xarxa')));
      xhr.open('POST', BASE_URL);
      xhr.setRequestHeader('Authorization', 'Bearer ' + token);
      xhr.send(form);
    });
  }

  // ── Copiar fitxer del Drive de l'usuari a la carpeta del projecte ──
  async function copyFromUserDrive(fileId, fileName) {
    const token = Auth.getToken();
    const res   = await fetch(`${META_URL}/${fileId}/copy`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: fileName, parents: [CONFIG.DRIVE_FOLDER_ID] }),
    });
    if (!res.ok) throw new Error('Error copiant fitxer: ' + res.status);
    return res.json();
  }

  // ── Fer públic ────────────────────────────────
  async function makePublic(fileId) {
    const token = Auth.getToken();
    await fetch(`${META_URL}/${fileId}/permissions`, {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'reader', type: 'anyone' }),
    });
  }

  // ── Eliminar ──────────────────────────────────
  async function deleteFile(fileId) {
    const res = await fetch(`${META_URL}/${fileId}`, {
      method: 'DELETE',
      headers: { 'Authorization': 'Bearer ' + Auth.getToken() },
    });
    if (!res.ok && res.status !== 204) throw new Error('Error eliminant: ' + res.status);
  }

  // ── Drive Picker ──────────────────────────────
  let _pickerLoaded = false;

  function loadPicker() {
    return new Promise((resolve) => {
      if (_pickerLoaded) { resolve(); return; }
      gapi.load('picker', () => { _pickerLoaded = true; resolve(); });
    });
  }

  async function openPicker(onFilesSelected) {
    await loadPicker();
    const token = Auth.getToken();

    const docsView = new google.picker.DocsView()
      .setIncludeFolders(false)
      .setMimeTypes('image/jpeg,image/png,image/heic,image/webp,video/mp4,video/quicktime,video/mpeg')
      .setMode(google.picker.DocsViewMode.GRID);

    const picker = new google.picker.PickerBuilder()
      .addView(docsView)
      .setOAuthToken(token)
      .setDeveloperKey(CONFIG.MAPS_API_KEY)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setCallback(async (data) => {
        if (data.action !== google.picker.Action.PICKED) return;
        const files = data.docs.map(d => ({
          id:       d.id,
          name:     d.name,
          mimeType: d.mimeType,
          isVideo:  d.mimeType.startsWith('video/'),
          fromDrive: true,
        }));
        onFilesSelected(files);
      })
      .build();

    picker.setVisible(true);
  }

  // ── URLs ──────────────────────────────────────
  function getThumbnailUrl(fileId) { return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`; }
  function getViewUrl(fileId)      { return `https://drive.google.com/file/d/${fileId}/view`; }
  function getVideoThumb(fileId)   { return `https://drive.google.com/thumbnail?id=${fileId}&sz=w400`; }

  return { uploadFile, copyFromUserDrive, makePublic, deleteFile, openPicker, getThumbnailUrl, getViewUrl, getVideoThumb };
})();
