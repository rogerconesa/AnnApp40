// ============================================
// ANNAPP40 — APP
// ============================================

window.addEventListener('load', () => setTimeout(initApp, 300));

function initApp() {

  Auth.init(
    (profile) => { UI.setUser(profile); UI.showScreen('screen-app'); },
    () => { UI.showScreen('screen-login'); UI.clearFiles(); UI.resetForm(); }
  );

  UI.initChipsCategoria();
  UI.initChipsPersones();

  document.getElementById('btn-google-login').addEventListener('click', () => Auth.login());
  document.getElementById('btn-logout').addEventListener('click', () => Auth.logout());

  // ── Drop zone ────────────────────────────────
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', (e) => { if (e.target.tagName !== 'LABEL') fileInput.click(); });
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    UI.addFiles(Array.from(e.dataTransfer.files));
  });
  fileInput.addEventListener('change', () => {
    UI.addFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });

  // ── Botó "Aplicar a totes" ───────────────────
  document.getElementById('btn-apply-all').addEventListener('click', () => {
    UI.applyCommonTagsToAll();
    UI.showToast('Tags comuns aplicats a totes les fotos ✓', 'success');
  });

  document.getElementById('btn-upload').addEventListener('click', handleUpload);
  document.getElementById('btn-more').addEventListener('click', () => {
    UI.clearFiles(); UI.resetForm(); UI.hideSuccess(); UI.hideProgress();
  });

  // ── Editor de tags individual ─────────────────
  document.getElementById('edit-photo-close').addEventListener('click', () => UI.closePhotoTagEditor());
  document.getElementById('edit-photo-save').addEventListener('click', () => UI.savePhotoTagEditor());
  document.getElementById('edit-photo-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('edit-photo-overlay')) UI.closePhotoTagEditor();
  });
  document.querySelectorAll('#edit-photo-chips-categoria .chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });
  document.getElementById('edit-photo-btn-add-persona').addEventListener('click', () => {
    const input = document.getElementById('edit-photo-input-persona');
    const nom   = input.value.trim();
    if (!nom) return;
    // Afegir chip a l'editor
    const container = document.getElementById('edit-photo-chips-persones');
    if (![...container.querySelectorAll('.chip')].some(c => c.dataset.value === nom)) {
      const btn = document.createElement('button');
      btn.className = 'chip selected';
      btn.dataset.value = nom;
      btn.textContent = nom;
      btn.addEventListener('click', () => btn.classList.toggle('selected'));
      container.appendChild(btn);
    }
    input.value = '';
  });
  document.getElementById('edit-photo-input-persona').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('edit-photo-btn-add-persona').click();
  });

  // ── Navegació pestanyes ──────────────────────
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.dataset.tab;
      document.querySelectorAll('#screen-app > main, #tab-mevefotos').forEach(p => p.classList.add('hidden'));
      if (which === 'pujar') {
        document.querySelector('#screen-app > main:first-of-type').classList.remove('hidden');
      } else {
        document.getElementById('tab-mevefotos').classList.remove('hidden');
        renderMyPhotos();
      }
    });
  });

  document.getElementById('btn-reload')?.addEventListener('click', renderMyPhotos);

  // ── Modal edició "les meves fotos" ───────────
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.querySelectorAll('#modal-chips-categoria .chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });
  document.getElementById('modal-btn-add-persona').addEventListener('click', () => {
    const input = document.getElementById('modal-input-persona');
    const nom   = input.value.trim();
    if (!nom) return;
    addModalPersonaChip(nom, true);
    input.value = '';
  });
  document.getElementById('modal-input-persona').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('modal-btn-add-persona').click();
  });
}

// ── Pujada amb tags individuals ───────────────
async function handleUpload() {
  const files     = UI.getFiles();
  const photoTags = UI.getPhotoTags();

  if (files.length === 0) {
    UI.showToast('Selecciona almenys una foto', 'error');
    return;
  }

  // Validar que totes les fotos tenen els camps obligatoris
  const incompletes = photoTags.map((t, i) => ({i, t})).filter(({t}) =>
    !t.any || !t.lloc || t.categoria.length === 0 || t.persones.length === 0
  );

  if (incompletes.length > 0) {
    // Intentar aplicar tags comuns primer
    UI.applyCommonTagsToAll();
    const stillIncompletes = UI.getPhotoTags().filter(t =>
      !t.any || !t.lloc || t.categoria.length === 0 || t.persones.length === 0
    );
    if (stillIncompletes.length > 0) {
      UI.showToast(`${stillIncompletes.length} foto${stillIncompletes.length !== 1 ? 's' : ''} sense tags complets. Omple els camps comuns o edita cada foto.`, 'error');
      return;
    }
  }

  UI.setUploadLoading(true);
  let uploaded = 0;
  const errors = [];
  const currentPhotoTags = UI.getPhotoTags();

  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const tags = currentPhotoTags[i];
    const progressText = `Pujant ${i + 1} de ${files.length}: ${file.name}`;

    try {
      const driveFile = await Drive.uploadFile(file, (pct) => {
        const total = Math.round((i / files.length) * 100 + pct / files.length);
        UI.showProgress(total, progressText);
      });
      await Drive.makePublic(driveFile.id);
      const profile = Auth.getProfile();
      await Sheets.appendRow({
        id:         driveFile.id + '_' + Date.now(),
        fileId:     driveFile.id,
        url:        Drive.getThumbnailUrl(driveFile.id),
        any:        tags.any,
        lloc:       tags.lloc,
        persones:   tags.persones,
        categoria:  tags.categoria,
        notes:      tags.notes,
        pujatNom:   profile?.name  || '',
        pujatEmail: profile?.email || '',
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
    UI.showSuccess(uploaded);
  } else if (uploaded > 0) {
    UI.showToast(`⚠️ ${uploaded} fotos pujades, ${errors.length} amb error`, '');
  } else {
    UI.showToast('Error pujant les fotos. Torna-ho a intentar.', 'error');
  }
}

// ── Les meves fotos ───────────────────────────
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
    const mine    = all.filter(p => p.pujatEmail === profile.email || p.pujatNom === profile.name);

    loading.classList.add('hidden');

    if (mine.length === 0) { empty.classList.remove('hidden'); return; }

    const counter = document.getElementById('meves-count');
    if (counter) counter.textContent = `${mine.length} foto${mine.length !== 1 ? 's' : ''}`;

    mine.forEach(photo => {
      const div = document.createElement('div');
      div.className = 'meves-item';
      div.innerHTML = `
        <div class="meves-img-wrap">
          <img src="${photo.url}" alt="${photo.lloc}" loading="lazy" />
          <div class="meves-overlay">✏️ Editar</div>
        </div>
        <div class="meves-item-info">
          <div class="meves-item-any">${photo.any}</div>
          <div class="meves-item-lloc">${photo.lloc}</div>
          <div class="meves-item-cats">${photo.categoria.join(', ')}</div>
          <div class="meves-item-persones">${photo.persones.join(' · ')}</div>
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

// ── Modal edició fotos pujades ────────────────
function openModal(photo) {
  _currentPhoto = photo;
  document.getElementById('modal-img').src         = photo.url;
  document.getElementById('modal-any').value        = photo.any;
  document.getElementById('modal-lloc').value       = photo.lloc;
  document.getElementById('modal-notes').value      = photo.notes || '';

  document.querySelectorAll('#modal-chips-categoria .chip').forEach(chip => {
    chip.classList.toggle('selected', photo.categoria.includes(chip.dataset.value));
  });

  const container = document.getElementById('modal-chips-persones');
  container.innerHTML = '';
  const tots = [...new Set([...CONFIG.PERSONES_INICIALS, ...photo.persones])];
  tots.forEach(nom => addModalPersonaChip(nom, photo.persones.includes(nom)));

  document.getElementById('modal-btn-save').onclick   = saveModalChanges;
  document.getElementById('modal-btn-delete').onclick = () => deletePhoto(photo.fileId);
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
  _currentPhoto = null;
}

function addModalPersonaChip(nom, selected) {
  const container = document.getElementById('modal-chips-persones');
  if ([...container.querySelectorAll('.chip')].some(c => c.dataset.value === nom)) return;
  const btn = document.createElement('button');
  btn.className = 'chip' + (selected ? ' selected' : '');
  btn.dataset.value = nom;
  btn.textContent = nom;
  btn.addEventListener('click', () => btn.classList.toggle('selected'));
  container.appendChild(btn);
}

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
  btn.disabled = true; btn.textContent = 'Guardant...';

  try {
    await Sheets.updateRowByFileId(_currentPhoto.fileId, { any, lloc, notes, categoria, persones });
    UI.showToast('Canvis guardats!', 'success');
    closeModal();
    renderMyPhotos();
  } catch (err) {
    UI.showToast('Error guardant: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar canvis';
  }
}

async function deletePhoto(fileId) {
  if (!confirm("Segur que vols eliminar aquesta foto? S'eliminarà del Drive i dels registres.")) return;
  try {
    await Drive.deleteFile(fileId);
    await Sheets.deleteRowByFileId(fileId);
    UI.showToast('Foto eliminada correctament', 'success');
    closeModal();
    renderMyPhotos();
  } catch (err) {
    UI.showToast('Error eliminant la foto: ' + err.message, 'error');
  }
}
