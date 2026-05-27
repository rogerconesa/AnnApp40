// ============================================
// ANNAPP40 — APP
// Punt d'entrada principal
// ============================================

// ── Esperar que Google GIS estigui carregat ───
window.addEventListener('load', () => {
  // Petit delay per assegurar que els scripts de Google estan llests
  setTimeout(initApp, 300);
});

function initApp() {

  // ── Inicialitzar Auth ────────────────────────
  Auth.init(
    // onLogin
    (profile) => {
      UI.setUser(profile);
      UI.showScreen('screen-app');
    },
    // onLogout
    () => {
      UI.showScreen('screen-login');
      UI.clearFiles();
      UI.resetForm();
    }
  );

  // ── Inicialitzar UI ──────────────────────────
  UI.initChipsCategoria();
  UI.initChipsPersones();

  // ── Botó login ───────────────────────────────
  document.getElementById('btn-google-login').addEventListener('click', () => {
    Auth.login();
  });

  // ── Botó logout ──────────────────────────────
  document.getElementById('btn-logout').addEventListener('click', () => {
    Auth.logout();
  });

  // ── Drop zone — click ────────────────────────
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', (e) => {
    if (e.target.tagName !== 'LABEL') fileInput.click();
  });

  // ── Drop zone — drag & drop ──────────────────
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('dragover');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    const files = Array.from(e.dataTransfer.files);
    UI.addFiles(files);
  });

  // ── File input change ────────────────────────
  fileInput.addEventListener('change', () => {
    const files = Array.from(fileInput.files);
    UI.addFiles(files);
    fileInput.value = ''; // reset per poder tornar a seleccionar els mateixos
  });

  // ── Botó pujar ───────────────────────────────
  document.getElementById('btn-upload').addEventListener('click', handleUpload);

  // ── Botó "pujar més" ─────────────────────────
  document.getElementById('btn-more').addEventListener('click', () => {
    UI.clearFiles();
    UI.resetForm();
    UI.hideSuccess();
    UI.hideProgress();
  });

}

// ── Lògica de pujada ─────────────────────────
async function handleUpload() {
  const files = UI.getFiles();
  if (files.length === 0) {
    UI.showToast('Selecciona almenys una foto', 'error');
    return;
  }

  const tags = UI.getTagValues();

  UI.setUploadLoading(true);

  let uploaded = 0;
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const progressText = `Pujant ${i + 1} de ${files.length}: ${file.name}`;

    try {
      // 1. Pujar a Drive
      const driveFile = await Drive.uploadFile(file, (pct) => {
        const total = Math.round((i / files.length) * 100 + pct / files.length);
        UI.showProgress(total, progressText);
      });

      // 2. Fer pública la miniatura
      await Drive.makePublic(driveFile.id);

      // 3. Guardar metadades a Sheets
      const profile = Auth.getProfile();
      await Sheets.appendRow({
        id:        driveFile.id + '_' + Date.now(),
        fileId:    driveFile.id,
        url:       Drive.getThumbnailUrl(driveFile.id),
        any:       tags.any,
        lloc:      tags.lloc,
        persones:  tags.persones,
        categoria: tags.categoria,
        notes:     tags.notes,
        pujatPer:  profile ? (profile.name || profile.email) : 'Desconegut',
      });

      uploaded++;

    } catch (err) {
      console.error('Error pujant ' + file.name + ':', err);
      errors.push(file.name);
    }
  }

  UI.setUploadLoading(false);
  UI.showProgress(100, 'Completat!');

  if (errors.length === 0) {
    UI.showSuccess();
    UI.showToast(`✅ ${uploaded} foto${uploaded !== 1 ? 's' : ''} pujada${uploaded !== 1 ? 's' : ''} correctament!`, 'success');
  } else if (uploaded > 0) {
    UI.showToast(`⚠️ ${uploaded} fotos pujades, ${errors.length} amb error`, '');
  } else {
    UI.showToast('Error pujant les fotos. Torna-ho a intentar.', 'error');
  }
}
