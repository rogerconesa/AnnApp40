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

  // Validació camps obligatoris
  if (!tags.any) {
    UI.showToast('L'any és obligatori', 'error');
    return;
  }
  if (!tags.lloc) {
    UI.showToast('El lloc és obligatori', 'error');
    return;
  }
  if (tags.categoria.length === 0) {
    UI.showToast('Selecciona almenys una categoria', 'error');
    return;
  }
  if (tags.persones.length === 0) {
    UI.showToast('Selecciona almenys una persona', 'error');
    return;
  }

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

// ── Eliminar foto (Drive + Sheets) ────────────
async function deletePhoto(fileId) {
  if (!confirm('Segur que vols eliminar aquesta foto? S\'eliminarà del Drive i dels registres.')) return;

  try {
    await Drive.deleteFile(fileId);
    await Sheets.deleteRowByFileId(fileId);
    UI.showToast('Foto eliminada correctament', 'success');
    // Recarregar llista si estem a la vista de gestió
    if (typeof renderMyPhotos === 'function') renderMyPhotos();
  } catch (err) {
    console.error('Error eliminant foto:', err);
    UI.showToast('Error eliminant la foto: ' + err.message, 'error');
  }
}

// ── Renderitzar les meves fotos ───────────────
let _currentPhoto = null;

async function renderMyPhotos() {
  const grid    = document.getElementById('meves-grid');
  const loading = document.getElementById('meves-loading');
  const empty   = document.getElementById('meves-empty');

  grid.innerHTML = '';
  loading.classList.remove('hidden');
  empty.classList.add('hidden');

  try {
    const all     = await Sheets.readAll();
    const profile = Auth.getProfile();
    const myEmail = profile.email;
    const myName  = profile.name;

    // Filtrar per pujatPer (email o nom)
    const mine = all.filter(p => p.pujatPer === myName || p.pujatPer === myEmail);

    loading.classList.add('hidden');

    if (mine.length === 0) {
      empty.classList.remove('hidden');
      return;
    }

    mine.forEach(photo => {
      const div = document.createElement('div');
      div.className = 'meves-item';
      div.innerHTML = `
        <img src="${photo.url}" alt="${photo.lloc}" loading="lazy" />
        <div class="meves-item-info">
          <div class="meves-item-any">${photo.any}</div>
          <div class="meves-item-lloc">${photo.lloc}</div>
          <div class="meves-item-cats">${photo.categoria.join(', ')}</div>
        </div>
      `;
      div.addEventListener('click', () => openModal(photo));
      grid.appendChild(div);
    });

  } catch (err) {
    loading.classList.add('hidden');
    UI.showToast('Error carregant fotos: ' + err.message, 'error');
  }
}

// ── Modal: obrir ──────────────────────────────
function openModal(photo) {
  _currentPhoto = photo;

  document.getElementById('modal-img').src = photo.url;
  document.getElementById('modal-any').value  = photo.any;
  document.getElementById('modal-lloc').value = photo.lloc;
  document.getElementById('modal-notes').value = photo.notes;

  // Categories
  document.querySelectorAll('#modal-chips-categoria .chip').forEach(chip => {
    chip.classList.toggle('selected', photo.categoria.includes(chip.dataset.value));
  });

  // Persones
  const container = document.getElementById('modal-chips-persones');
  container.innerHTML = '';
  const totsPersones = [...new Set([...CONFIG.PERSONES_INICIALS, ...photo.persones])];
  totsPersones.forEach(nom => addModalPersonaChip(nom, photo.persones.includes(nom)));

  // Botons
  document.getElementById('modal-btn-save').onclick   = saveModalChanges;
  document.getElementById('modal-btn-delete').onclick = () => deletePhoto(photo.fileId);

  document.getElementById('modal-overlay').classList.remove('hidden');
}

// ── Modal: tancar ─────────────────────────────
function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  _currentPhoto = null;
}

// ── Modal: afegir chip persona ────────────────
function addModalPersonaChip(nom, selected) {
  const container = document.getElementById('modal-chips-persones');
  // Evitar duplicats
  if ([...container.querySelectorAll('.chip')].some(c => c.dataset.value === nom)) return;
  const btn = document.createElement('button');
  btn.className = 'chip' + (selected ? ' selected' : '');
  btn.dataset.value = nom;
  btn.textContent = nom;
  btn.addEventListener('click', () => btn.classList.toggle('selected'));
  container.appendChild(btn);
}

// ── Modal: guardar canvis ─────────────────────
async function saveModalChanges() {
  if (!_currentPhoto) return;

  const any       = document.getElementById('modal-any').value.trim();
  const lloc      = document.getElementById('modal-lloc').value.trim();
  const notes     = document.getElementById('modal-notes').value.trim();
  const categoria = [...document.querySelectorAll('#modal-chips-categoria .chip.selected')].map(c => c.dataset.value);
  const persones  = [...document.querySelectorAll('#modal-chips-persones .chip.selected')].map(c => c.dataset.value);

  if (!any || !lloc || categoria.length === 0 || persones.length === 0) {
    UI.showToast('Any, lloc, categoria i persones són obligatoris', 'error');
    return;
  }

  const btn = document.getElementById('modal-btn-save');
  btn.disabled = true;
  btn.textContent = 'Guardant...';

  try {
    await Sheets.updateRowByFileId(_currentPhoto.fileId, { any, lloc, notes, categoria, persones });
    UI.showToast('Canvis guardats!', 'success');
    closeModal();
    renderMyPhotos();
  } catch (err) {
    UI.showToast('Error guardant: ' + err.message, 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Guardar canvis';
  }
}

// ── Eliminar foto (Drive + Sheets) ────────────
async function deletePhoto(fileId) {
  if (!confirm('Segur que vols eliminar aquesta foto? S\'eliminarà del Drive i dels registres.')) return;

  try {
    await Drive.deleteFile(fileId);
    await Sheets.deleteRowByFileId(fileId);
    UI.showToast('Foto eliminada correctament', 'success');
    closeModal();
    renderMyPhotos();
  } catch (err) {
    console.error('Error eliminant foto:', err);
    UI.showToast('Error eliminant la foto: ' + err.message, 'error');
  }
}
