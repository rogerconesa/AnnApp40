// ============================================
// ANNAPP40 — APP v4
// ============================================

window.addEventListener('load', () => setTimeout(initApp, 300));

function initApp() {
  Auth.init(
    (profile) => { UI.setUser(profile); UI.showScreen('screen-app'); },
    () => { UI.showScreen('screen-login'); UI.clearFiles(); UI.resetForm(); }
  );

  UI.initAnys();
  UI.initCategories();
  UI.initChipsCategoria();
  UI.initChipsPersones();

  // Inicialitzar lloc (funciona amb o sense Maps JS)
  UI.initLlocInput('tag-lloc', 'tag-lat', 'tag-lng', 'places-dropdown');
  UI.initLlocInput('edit-photo-lloc', 'edit-photo-lat', 'edit-photo-lng', 'edit-places-dropdown');

  document.getElementById('btn-google-login').addEventListener('click', () => Auth.login());
  document.getElementById('btn-logout').addEventListener('click', () => Auth.logout());

  // ── Drop zone (fitxers locals) ───────────────
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', (e) => { if (e.target.tagName !== 'LABEL' && !e.target.closest('#btn-drive-picker')) fileInput.click(); });
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

  // ── Drive Picker ─────────────────────────────
  document.getElementById('btn-drive-picker')?.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await Drive.openPicker((driveFiles) => {
        UI.addDriveFiles(driveFiles);
      });
    } catch(err) {
      UI.showToast('Error obrint el Drive Picker: ' + err.message, 'error');
    }
  });

  // ── Botó aplicar a totes ─────────────────────
  document.getElementById('btn-apply-all').addEventListener('click', () => {
    UI.applyCommonTagsToAll();
    UI.showToast('Tags aplicats a tots els elements ✓', 'success');
  });

  document.getElementById('btn-upload').addEventListener('click', handleUpload);
  document.getElementById('btn-more').addEventListener('click', () => {
    UI.clearFiles(); UI.resetForm(); UI.hideSuccess(); UI.hideProgress();
  });

  // ── Editor tags individual ────────────────────
  document.getElementById('edit-photo-close').addEventListener('click', () => UI.closePhotoTagEditor());
  document.getElementById('edit-photo-save').addEventListener('click', () => UI.savePhotoTagEditor());
  document.getElementById('edit-photo-overlay').addEventListener('click', (e) => {
    if (e.target === document.getElementById('edit-photo-overlay')) UI.closePhotoTagEditor();
  });
  document.querySelectorAll('#edit-photo-chips-categoria .chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });
  document.getElementById('edit-photo-btn-add-persona')?.addEventListener('click', () => {
    const input = document.getElementById('edit-photo-input-persona');
    const nom   = input.value.trim();
    if (!nom) return;
    const container = document.getElementById('edit-photo-chips-persones');
    UI.addChipToContainer(container, nom, true);
    input.value = '';
  });
  document.getElementById('edit-photo-input-persona')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') document.getElementById('edit-photo-btn-add-persona').click();
  });

  // Botó preferida
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

  // ── Modal edició fotos pujades ────────────────
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
    if (e.key === 'Enter') document.getElementById('modal-btn-add-persona').click();
  });
}

// ── Pujada ────────────────────────────────────
async function handleUpload() {
  const files     = UI.getFiles();
  const photoTags = UI.getPhotoTags();

  if (files.length === 0) { UI.showToast('Selecciona almenys una foto o vídeo', 'error'); return; }

  // Aplicar tags comuns
  UI.applyCommonTagsToAll();
  const currentTags = UI.getPhotoTags();

  // Validar (vídeos: només persones obligatori)
  const invalids = currentTags.filter((t, i) => {
    if (files[i].isVideo) return t.persones.length === 0;
    return !t.any || !t.lloc || t.categoria.length === 0 || t.persones.length === 0;
  });

  if (invalids.length > 0) {
    UI.showToast(`${invalids.length} element${invalids.length !== 1 ? 's' : ''} sense tags complets`, 'error');
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
        // Copiar des del Drive de l'usuari
        driveFile = await Drive.copyFromUserDrive(item.driveId, item.name);
      } else {
        driveFile = await Drive.uploadFile(item.file, (pct) => {
          UI.showProgress(Math.round((i / files.length) * 100 + pct / files.length), `Pujant ${i+1}/${files.length}: ${item.name}`);
        });
      }

      await Drive.makePublic(driveFile.id);
      const profile = Auth.getProfile();

      // Geocodificar lloc si no té coordenades
      let lat = tags.lat, lng = tags.lng;
      if (tags.lloc && !lat) {
        const coords = await Geocoder.geocode(tags.lloc);
        if (coords) { lat = coords.lat; lng = coords.lng; }
      }

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
  else if (uploaded > 0) UI.showToast(`⚠️ ${uploaded} pujats, ${errors.length} amb error`, '');
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
            ? `<div class="meves-video-thumb">🎬</div><div class="meves-video-name">${photo.pujatNom}</div>`
            : `<img src="${photo.url}" alt="${photo.lloc}" loading="lazy" />`
          }
          ${photo.preferida ? '<div class="preferida-badge">⭐</div>' : ''}
          <div class="meves-overlay">✏️ Editar</div>
        </div>
        <div class="meves-item-info">
          <div class="meves-item-any">${photo.any}${isVideo ? ' 🎬' : ''}</div>
          <div class="meves-item-lloc">${photo.lloc || (isVideo ? 'Vídeo de felicitació' : '')}</div>
          <div class="meves-item-cats">${photo.categoria.join(', ')}</div>
          <div class="meves-item-persones">${photo.persones.join(' · ')}</div>
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

// ── Modal edició ──────────────────────────────
function openModal(photo) {
  _currentPhoto = photo;
  const isVideo = photo.tipus === 'video';

  document.getElementById('modal-img').src    = isVideo ? '' : photo.url;
  document.getElementById('modal-img').style.display = isVideo ? 'none' : 'block';
  const videoThumb = document.getElementById('modal-video-thumb');
  if (videoThumb) videoThumb.style.display = isVideo ? 'flex' : 'none';

  // Select any
  const anyEl = document.getElementById('modal-any-sel');
  if (anyEl) {
    anyEl.innerHTML = '<option value="">Selecciona any...</option>';
    CONFIG.ANYS.forEach(y => {
      const opt = document.createElement('option');
      opt.value = y; opt.textContent = y;
      opt.selected = y == photo.any;
      anyEl.appendChild(opt);
    });
  }

  document.getElementById('modal-lloc').value  = photo.lloc || '';
  document.getElementById('modal-lat').value   = photo.lat || '';
  document.getElementById('modal-lng').value   = photo.lng || '';
  document.getElementById('modal-notes').value = photo.notes || '';

  // Ocultar lloc/categoria per vídeos
  const llocGroup = document.getElementById('modal-lloc-group');
  const catGroup  = document.getElementById('modal-cat-group');
  if (llocGroup) llocGroup.style.display = isVideo ? 'none' : '';
  if (catGroup)  catGroup.style.display  = isVideo ? 'none' : '';

  if (!isVideo) {
    UI.setSelectedCategories('modal-chips-categoria', photo.categoria);
  }

  const container = document.getElementById('modal-chips-persones');
  container.innerHTML = '';
  const tots = [...new Set([...CONFIG.PERSONES_INICIALS, ...photo.persones])];
  tots.forEach(nom => addModalPersonaChip(nom, photo.persones.includes(nom)));

  // Botó preferida
  const prefBtn = document.getElementById('modal-btn-preferida');
  if (prefBtn) {
    prefBtn.style.display = isVideo ? 'none' : 'flex';
    prefBtn.classList.toggle('active', !!photo.preferida);
    prefBtn.textContent = photo.preferida ? '⭐ Foto preferida' : '☆ Marcar com a preferida';
    prefBtn.onclick = function() {
      this.classList.toggle('active');
      this.textContent = this.classList.contains('active') ? '⭐ Foto preferida' : '☆ Marcar com a preferida';
    };
  }

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
  const isVideo   = _currentPhoto.tipus === 'video';
  const anyEl     = document.getElementById('modal-any-sel');
  const any       = anyEl ? anyEl.value : '';
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
      const coords = await Geocoder.geocode(lloc);
      if (coords) { finalLat = coords.lat; finalLng = coords.lng; }
    }

    await Sheets.updateRowByFileId(_currentPhoto.fileId, {
      any, lloc, notes, categoria, persones, preferida,
      lat: finalLat, lng: finalLng,
    });
    UI.showToast('Canvis guardats!', 'success');
    closeModal();
    renderMyPhotos();
  } catch(err) {
    UI.showToast('Error: ' + err.message, 'error');
  } finally {
    btn.disabled = false; btn.textContent = 'Guardar canvis';
  }
}

async function deletePhoto(fileId) {
  if (!confirm("Segur que vols eliminar? S'eliminarà del Drive i dels registres.")) return;
  try {
    await Drive.deleteFile(fileId);
    await Sheets.deleteRowByFileId(fileId);
    UI.showToast('Eliminat correctament', 'success');
    closeModal();
    renderMyPhotos();
  } catch(err) {
    UI.showToast('Error eliminant: ' + err.message, 'error');
  }
}
