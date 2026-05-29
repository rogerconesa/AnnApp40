// ============================================
// ANNAPP40 — APP v5
// ============================================

window.addEventListener('load', () => setTimeout(initApp, 300));

function initApp() {
  Auth.init(
    (profile) => {
      UI.setUser(profile);
      UI.showScreen('screen-app');
      const welcomeShown = localStorage.getItem('annapp40_welcome_shown');
      if (!welcomeShown) {
        setTimeout(() => document.getElementById('welcome-overlay')?.classList.remove('hidden'), 400);
      }
    },
    () => { UI.showScreen('screen-login'); UI.clearFiles(); UI.resetForm(); }
  );

  UI.initAnys();
  UI.initCategories();
  UI.initChipsPersones();

  document.getElementById('btn-google-login').addEventListener('click', () => Auth.login());
  document.getElementById('btn-logout').addEventListener('click', () => Auth.logout());

  // ── Drop zone ────────────────────────────────
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', (e) => {
    if (e.target.tagName === 'LABEL') return;
    if (e.target.closest('#btn-drive-picker')) return;
    fileInput.click();
  });
  dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    UI.addLocalFiles(Array.from(e.dataTransfer.files));
  });
  fileInput.addEventListener('change', () => {
    UI.addLocalFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });

  // Drive Picker
  document.getElementById('btn-drive-picker')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await Drive.openPicker((files) => UI.addDriveFiles(files));
    } catch(err) {
      UI.showToast('Error obrint Drive: ' + err.message, 'error');
    }
  });

  // Botó aplicar a totes
  document.getElementById('btn-apply-all').addEventListener('click', () => {
    UI.applyCommonTagsToAll();
    UI.showToast('Tags aplicats a tots els elements', 'success');
  });

  document.getElementById('btn-upload').addEventListener('click', handleUpload);
  document.getElementById('btn-more').addEventListener('click', () => {
    UI.clearFiles(); UI.resetForm(); UI.hideSuccess(); UI.hideProgress();
  });

  // ── Editor tags individual ─────────────────────
  document.getElementById('edit-photo-close').addEventListener('click', () => UI.closePhotoTagEditor());
  document.getElementById('edit-photo-save').addEventListener('click', () => UI.savePhotoTagEditor());
  document.getElementById('edit-photo-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('edit-photo-overlay')) UI.closePhotoTagEditor();
  });
  document.getElementById('edit-photo-btn-add-persona')?.addEventListener('click', () => {
    const input = document.getElementById('edit-photo-input-persona');
    const nom   = input.value.trim();
    if (!nom) return;
    UI.addChipToContainer(document.getElementById('edit-photo-chips-persones'), nom, true);
    input.value = '';
  });
  document.getElementById('edit-photo-input-persona')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('edit-photo-btn-add-persona').click(); }
  });

  // Botó preferida (editor individual)
  document.getElementById('edit-photo-preferida')?.addEventListener('click', function() {
    this.classList.toggle('active');
    this.textContent = this.classList.contains('active') ? '⭐ Foto preferida' : '☆ Marcar com a preferida';
  });

  // ── Navegació pestanyes ──────────────────────
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const which = tab.dataset.tab;
      // Amaguem tots els mains
      document.querySelectorAll('#screen-app > main').forEach(p => p.classList.add('hidden'));
      if (which === 'pujar') {
        document.querySelector('#screen-app > main:not(#tab-mevefotos)').classList.remove('hidden');
      } else {
        document.getElementById('tab-mevefotos').classList.remove('hidden');
        renderMyPhotos();
      }
    });
  });

  document.getElementById('btn-reload')?.addEventListener('click', renderMyPhotos);

  // ── Modal edició (fotos pujades) ─────────────
  document.getElementById('modal-close').addEventListener('click', closeModal);
  document.getElementById('modal-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('modal-overlay')) closeModal();
  });
  document.getElementById('modal-btn-add-persona')?.addEventListener('click', () => {
    const input = document.getElementById('modal-input-persona');
    const nom   = input.value.trim();
    if (!nom) return;
    addModalPersonaChip(nom, true);
    input.value = '';
  });
  document.getElementById('modal-input-persona')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('modal-btn-add-persona').click(); }
  });

  // Botó preferida al modal d'editar foto pujada
  document.getElementById('modal-btn-preferida')?.addEventListener('click', function() {
    this.classList.toggle('active');
    this.textContent = this.classList.contains('active') ? '⭐ Foto preferida' : '☆ Marcar com a preferida';
  });

  document.getElementById('welcome-close')?.addEventListener('click', () => {
    const dontShow = document.getElementById('welcome-dont-show').checked;
    if (dontShow) localStorage.setItem('annapp40_welcome_shown', '1');
    document.getElementById('welcome-overlay').classList.add('hidden');
  });

  // ── Botó info ────────────────────────────────
  document.getElementById('btn-info')?.addEventListener('click', () => {
    document.getElementById('info-overlay').classList.remove('hidden');
  });
  document.getElementById('info-close')?.addEventListener('click', () => {
    document.getElementById('info-overlay').classList.add('hidden');
  });
  document.getElementById('info-close-btn')?.addEventListener('click', () => {
    document.getElementById('info-overlay').classList.add('hidden');
  });
  document.getElementById('info-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('info-overlay')) {
      document.getElementById('info-overlay').classList.add('hidden');
    }
  });
}

// ── Pujada ────────────────────────────────────
async function handleUpload() {
  const files = UI.getFiles();
  if (files.length === 0) { UI.showToast('Selecciona almenys una foto o vídeo', 'error'); return; }

  // Aplicar tags comuns als que no en tinguin
  UI.applyCommonTagsToAll();
  const currentTags = UI.getPhotoTags();

  // Validar
  const invalids = currentTags.filter((t, i) => {
    if (files[i].isVideo) return t.persones.length === 0;
    return !t.any || !t.lloc || t.categoria.length === 0 || t.persones.length === 0;
  });

  if (invalids.length > 0) {
    UI.showToast(`${invalids.length} element(s) sense tags complets`, 'error');
    return;
  }

  UI.setUploadLoading(true);
  let uploaded = 0;
  const errors = [];

  for (let i = 0; i < files.length; i++) {
    const item = files[i];
    const tags = currentTags[i];
    UI.showProgress(Math.round((i / files.length) * 100), `Pujant ${i+1}/${files.length}: ${item.name}`);

    try {
      let driveFile;
      if (item.fromDrive) {
        driveFile = await Drive.copyFromUserDrive(item.driveId, item.name);
      } else {
        driveFile = await Drive.uploadFile(item.file, (pct) => {
          UI.showProgress(Math.round((i / files.length) * 100 + pct / files.length), `Pujant ${i+1}/${files.length}: ${item.name}`);
        });
      }
      await Drive.makePublic(driveFile.id);
      const profile = Auth.getProfile();

      // Geocodificar si cal
      let lat = tags.lat, lng = tags.lng;
      if (tags.lloc && !lat) {
        const c = await Geocoder.geocode(tags.lloc);
        if (c) { lat = c.lat; lng = c.lng; }
      }

      await Sheets.appendRow({
        id:         driveFile.id + '_' + Date.now(),
        fileId:     driveFile.id,
        url:        item.isVideo ? '' : Drive.getThumbnailUrl(driveFile.id),
        any:        tags.any,
        lloc:       tags.lloc,
        persones:   tags.persones,
        categoria:  tags.categoria,
        notes:      tags.notes,
        pujatNom:   profile?.name  || '',
        pujatEmail: profile?.email || '',
        lat, lng,
        tipus:      item.isVideo ? 'video' : 'foto',
        preferida:  tags.preferida || false,
      });
      uploaded++;
    } catch(err) {
      console.error('Error pujant', item.name, err);
      errors.push(item.name);
    }
  }

  UI.setUploadLoading(false);
  UI.showProgress(100, 'Completat!');

  if (errors.length === 0) UI.showSuccess(uploaded);
  else if (uploaded > 0) UI.showToast(`${uploaded} pujats, ${errors.length} amb error`, '');
  else UI.showToast('Error pujant. Torna-ho a intentar.', 'error');
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
    if (counter) counter.textContent = `${mine.length} element${mine.length !== 1 ? 's' : ''}`;

    mine.forEach(photo => {
      const isVideo = photo.tipus === 'video';
      const div = document.createElement('div');
      div.className = 'meves-item' + (isVideo ? ' meves-video' : '');
      div.innerHTML = `
        <div class="meves-img-wrap">
          ${isVideo
            ? `<div class="meves-video-thumb">🎬<div class="meves-video-name">Vídeo</div></div>`
            : `<img src="${photo.url}" alt="${photo.lloc}" loading="lazy" />`
          }
          ${photo.preferida ? '<div class="preferida-badge">⭐</div>' : ''}
          <div class="meves-overlay">✏️ Editar</div>
        </div>
        <div class="meves-item-info">
          <div class="meves-item-any">${photo.any || ''}${isVideo ? ' 🎬' : ''}</div>
          <div class="meves-item-lloc">${photo.lloc || (isVideo ? 'Vídeo de felicitació' : '')}</div>
          <div class="meves-item-cats">${(photo.categoria || []).join(', ')}</div>
          <div class="meves-item-persones">${(photo.persones || []).join(' · ')}</div>
        </div>
      `;
      div.addEventListener('click', () => openModal(photo));
      grid.appendChild(div);
    });
  } catch(err) {
    loading.classList.add('hidden');
    UI.showToast('Error: ' + err.message, 'error');
  }
}

// ── Modal edició foto pujada ──────────────────
function openModal(photo) {
  _currentPhoto = photo;
  const isVideo = photo.tipus === 'video';

  // Imatge o vídeo
  const imgEl   = document.getElementById('modal-img');
  const vidEl   = document.getElementById('modal-video-thumb');
  const vidMsg  = document.getElementById('modal-video-msg');

  if (isVideo) {
    if (imgEl)  imgEl.style.display = 'none';
    if (vidEl)  vidEl.style.display = 'flex';
    if (vidMsg) vidMsg.classList.remove('hidden');
  } else {
    if (imgEl)  { imgEl.src = photo.url; imgEl.style.display = 'block'; }
    if (vidEl)  vidEl.style.display = 'none';
    if (vidMsg) vidMsg.classList.add('hidden');
  }

  // Select any
  const anyEl = document.getElementById('modal-any-sel');
  if (anyEl) {
    anyEl.innerHTML = '<option value="">Any...</option>';
    CONFIG.ANYS.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      opt.selected = String(y) === String(photo.any);
      anyEl.appendChild(opt);
    });
  }

  // Camps text
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  setVal('modal-lloc',  photo.lloc);
  setVal('modal-lat',   photo.lat);
  setVal('modal-lng',   photo.lng);
  setVal('modal-notes', photo.notes);

  // Ocultar lloc/categoria per vídeos
  const llocGroup = document.getElementById('modal-lloc-group');
  const catGroup  = document.getElementById('modal-cat-group');
  if (llocGroup) llocGroup.style.display = isVideo ? 'none' : '';
  if (catGroup)  catGroup.style.display  = isVideo ? 'none' : '';

  if (!isVideo) UI.setSelectedCategories('modal-chips-categoria', photo.categoria || []);

  // Persones
  const container = document.getElementById('modal-chips-persones');
  container.innerHTML = '';
  const tots = [...new Set([...CONFIG.PERSONES_INICIALS, ...(photo.persones || [])])];
  tots.forEach(nom => addModalPersonaChip(nom, (photo.persones || []).includes(nom)));

  // Botó preferida
  const prefBtn = document.getElementById('modal-btn-preferida');
  if (prefBtn) {
    prefBtn.style.display = isVideo ? 'none' : 'flex';
    prefBtn.classList.toggle('active', !!photo.preferida);
    prefBtn.textContent = photo.preferida ? '⭐ Foto preferida' : '☆ Marcar com a preferida';
  }

  // Bind save/delete
  document.getElementById('modal-btn-save').onclick   = saveModalChanges;
  document.getElementById('modal-btn-delete').onclick = () => deletePhoto(photo.fileId);

  // Inicialitzar lloc autocompletes pel modal
  UI.initLlocInput('modal-lloc', 'modal-lat', 'modal-lng', null);

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
  const isVideo   = _currentPhoto.tipus === 'video';
  const any       = document.getElementById('modal-any-sel').value;
  const lloc      = document.getElementById('modal-lloc').value.trim();
  const lat       = document.getElementById('modal-lat').value;
  const lng       = document.getElementById('modal-lng').value;
  const notes     = document.getElementById('modal-notes').value.trim();
  const categoria = isVideo ? [] : UI.getSelectedCategories('modal-chips-categoria');
  const persones  = [...document.querySelectorAll('#modal-chips-persones .chip.selected')].map(c => c.dataset.value);
  const prefBtn   = document.getElementById('modal-btn-preferida');
  const preferida = prefBtn ? prefBtn.classList.contains('active') : false;

  if (!isVideo && (!any || !lloc || categoria.length === 0 || persones.length === 0)) {
    UI.showToast('Any, lloc, categoria i persones són obligatoris', 'error');
    return;
  }
  if (isVideo && persones.length === 0) {
    UI.showToast('Indica qui apareix al vídeo', 'error');
    return;
  }

  const btn = document.getElementById('modal-btn-save');
  btn.disabled = true; btn.textContent = 'Guardant...';

  try {
    let finalLat = lat ? parseFloat(lat) : null;
    let finalLng = lng ? parseFloat(lng) : null;
    if (lloc && !finalLat) {
      const c = await Geocoder.geocode(lloc);
      if (c) { finalLat = c.lat; finalLng = c.lng; }
    }
    await Sheets.updateRowByFileId(_currentPhoto.fileId, {
      any, lloc, notes, categoria, persones, preferida,
      lat: finalLat, lng: finalLng,
    });
    UI.showToast('Canvis guardats', 'success');
    closeModal();
    renderMyPhotos();
  } catch(err) {
    UI.showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar canvis';
  }
}

async function deletePhoto(fileId) {
  if (!confirm("Segur que vols eliminar?")) return;
  try {
    await Drive.deleteFile(fileId);
    await Sheets.deleteRowByFileId(fileId);
    UI.showToast('Eliminat', 'success');
    closeModal();
    renderMyPhotos();
  } catch(err) {
    UI.showToast('Error eliminant: ' + err.message, 'error');
  }
}
