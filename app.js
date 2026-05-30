// ============================================
// ANNAPP40 — APP v6
// ============================================

window.addEventListener('load', () => setTimeout(initApp, 300));

function initApp() {
  UI.initTheme();

  Auth.init(
    (profile) => {
      UI.setUser(profile);
      UI.showScreen('screen-app');
      _showWelcomeIfNeeded();
    },
    () => { UI.showScreen('screen-login'); UI.clearFiles(); UI.resetForm(); }
  );

  UI.initAnys();
  UI.initCategories();
  UI.initChipsPersones();
  UI.initLlocInput('tag-lloc', 'tag-lat', 'tag-lng', 'places-dropdown');
  UI.initLlocInput('edit-photo-lloc', 'edit-photo-lat', 'edit-photo-lng', 'edit-places-dropdown');

  document.getElementById('btn-google-login').addEventListener('click', () => Auth.login());
  document.getElementById('btn-logout').addEventListener('click', () => Auth.logout());

  // ── PWA install prompt ────────────────────────
  let _deferredPrompt = null;

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    _deferredPrompt = e;
    // Mostrar botó instal·lar al header
    const installBtn = document.getElementById('btn-install');
    if (installBtn) installBtn.classList.remove('hidden');
    console.log('PWA: beforeinstallprompt capturat');
  });

  window.addEventListener('appinstalled', () => {
    _deferredPrompt = null;
    const installBtn = document.getElementById('btn-install');
    if (installBtn) installBtn.classList.add('hidden');
    UI.showToast('App instal·lada correctament! 🎉', 'success');
  });

  document.getElementById('btn-install')?.addEventListener('click', async () => {
    if (!_deferredPrompt) {
      UI.showToast('Usa el menu del navegador per instal·lar', '');
      return;
    }
    _deferredPrompt.prompt();
    const { outcome } = await _deferredPrompt.userChoice;
    console.log('PWA install outcome:', outcome);
    _deferredPrompt = null;
    document.getElementById('btn-install')?.classList.add('hidden');
  });

  // ── Drop zone ─────────────────────────────────
  const dropZone  = document.getElementById('drop-zone');
  const fileInput = document.getElementById('file-input');

  dropZone.addEventListener('click', (e) => {
    if (e.target.tagName === 'LABEL') return;
    fileInput.click();
  });
  dropZone.addEventListener('dragover',  (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault(); dropZone.classList.remove('dragover');
    UI.addLocalFiles(Array.from(e.dataTransfer.files));
  });
  fileInput.addEventListener('change', () => {
    UI.addLocalFiles(Array.from(fileInput.files));
    fileInput.value = '';
  });

  // ── Tags ─────────────────────────────────────
  const applyAll = () => { UI.applyCommonTagsToAll(); UI.showToast('Tags aplicats a tots els elements', 'success'); };
  document.getElementById('btn-apply-all')?.addEventListener('click',   applyAll);
  document.getElementById('btn-apply-all-2')?.addEventListener('click', applyAll);

  // Botó preferida global (aplica a totes)
  document.getElementById('btn-preferida-global')?.addEventListener('click', function() {
    const tags = UI.getPhotoTags();
    const allPref = tags.every(t => t.preferida);
    tags.forEach((t, i) => {
      t.preferida = !allPref;
      UI.updatePhotoBadge(i);
    });
    this.textContent = !allPref ? '⭐ Totes marcades com a preferides' : '☆ Marcar totes com a preferides';
    this.classList.toggle('active', !allPref);
  });

  document.getElementById('btn-upload').addEventListener('click', handleUpload);
  document.getElementById('btn-more').addEventListener('click', () => {
    UI.clearFiles(); UI.resetForm(); UI.hideSuccess(); UI.hideProgress();
  });

  // ── Editor individual ─────────────────────────
  document.getElementById('edit-photo-close').addEventListener('click', () => UI.closePhotoTagEditor());
  document.getElementById('edit-photo-save').addEventListener('click',  () => UI.savePhotoTagEditor());
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
  // Botó descartar tot
  document.getElementById('btn-discard-all')?.addEventListener('click', () => {
    UI.clearFiles();
    UI.resetForm();
  });

  // Common video category chips
  document.querySelectorAll('#common-video-chips-categoria .chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });

  // Botó Altres (comú)
  document.getElementById('common-video-altres-btn')?.addEventListener('click', function() {
    const row = document.getElementById('common-video-altres-row');
    row.style.display = row.style.display === 'none' ? 'flex' : 'none';
    if (row.style.display === 'flex') document.getElementById('common-video-altres-input').focus();
  });
  document.getElementById('common-video-altres-add')?.addEventListener('click', () => {
    const input = document.getElementById('common-video-altres-input');
    const nom   = input.value.trim();
    if (!nom) return;
    const container = document.getElementById('common-video-chips-categoria');
    if (![...container.querySelectorAll('.chip')].some(c => c.dataset.value === nom)) {
      const btn = document.createElement('button');
      btn.className = 'chip selected';
      btn.dataset.value = nom;
      btn.textContent = nom;
      btn.addEventListener('click', () => btn.classList.toggle('selected'));
      container.appendChild(btn);
    }
    input.value = '';
    document.getElementById('common-video-altres-row').style.display = 'none';
  });
  document.getElementById('common-video-altres-input')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('common-video-altres-add').click(); }
  });

  // Botó Altres (editor individual)
  document.getElementById('edit-video-altres-btn')?.addEventListener('click', function() {
    const row = document.getElementById('edit-video-altres-row');
    row.style.display = row.style.display === 'none' ? 'flex' : 'none';
    if (row.style.display === 'flex') document.getElementById('edit-video-cat-custom').focus();
  });

  // Video category chips (editor individual)
  document.querySelectorAll('#edit-video-chips-categoria .chip').forEach(chip => {
    chip.addEventListener('click', () => chip.classList.toggle('selected'));
  });
  document.getElementById('edit-video-cat-add')?.addEventListener('click', () => {
    const input = document.getElementById('edit-video-cat-custom');
    const nom   = input.value.trim();
    if (!nom) return;
    const container = document.getElementById('edit-video-chips-categoria');
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
  document.getElementById('edit-video-cat-custom')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('edit-video-cat-add').click(); }
  });

  document.getElementById('edit-photo-preferida')?.addEventListener('click', function() {
    this.classList.toggle('active');
    this.textContent = this.classList.contains('active') ? '⭐ Foto preferida' : '☆ Marcar com a preferida';
  });

  // ── Navegació pestanyes ───────────────────────
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      document.querySelectorAll('#screen-app > main').forEach(p => p.classList.add('hidden'));
      const which = tab.dataset.tab;
      if (which === 'pujar') document.getElementById('tab-pujar').classList.remove('hidden');
      else { document.getElementById('tab-mevefotos').classList.remove('hidden'); renderMyPhotos(); }
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
    if (e.key === 'Enter') { e.preventDefault(); document.getElementById('modal-btn-add-persona').click(); }
  });
  document.getElementById('modal-btn-preferida')?.addEventListener('click', function() {
    this.classList.toggle('active');
    this.textContent = this.classList.contains('active') ? '⭐ Foto preferida' : '☆ Marcar com a preferida';
  });

  // ── Info ──────────────────────────────────────
  document.getElementById('btn-info')?.addEventListener('click', () => document.getElementById('info-overlay').classList.remove('hidden'));
  document.getElementById('info-close')?.addEventListener('click', () => document.getElementById('info-overlay').classList.add('hidden'));
  document.getElementById('info-close-btn')?.addEventListener('click', () => document.getElementById('info-overlay').classList.add('hidden'));
  document.getElementById('info-overlay')?.addEventListener('click', (e) => {
    if (e.target === document.getElementById('info-overlay')) document.getElementById('info-overlay').classList.add('hidden');
  });

  // ── Welcome popup ─────────────────────────────
  document.getElementById('welcome-close')?.addEventListener('click', () => {
    if (document.getElementById('welcome-dont-show').checked) localStorage.setItem('annapp40_welcome_shown', '1');
    document.getElementById('welcome-overlay').classList.add('hidden');
  });
}

function _showWelcomeIfNeeded() {
  if (!localStorage.getItem('annapp40_welcome_shown')) {
    setTimeout(() => document.getElementById('welcome-overlay')?.classList.remove('hidden'), 500);
  }
}

function _showInstallBanner() {
  UI.showToast('📱 Instal·la l\'app per accés ràpid → Afegir a pantalla d\'inici');
}

// ── Upload ────────────────────────────────────
async function handleUpload() {
  const files = UI.getFiles();
  if (files.length === 0) { UI.showToast('Selecciona almenys un arxiu', 'error'); return; }

  UI.applyCommonTagsToAll();
  const currentTags = UI.getPhotoTags();

  const invalids = currentTags.filter((t, i) => {
    if (files[i].isVideo) return t.persones.length === 0;
    return !t.any || !t.lloc || t.categoria.length === 0 || t.persones.length === 0;
  });

  if (invalids.length > 0) {
    UI.showToast(`${invalids.length} element${invalids.length !== 1 ? 's' : ''} sense tags complets`, 'error');
    return;
  }

  UI.setUploadLoading(true);
  let uploaded = 0, errors = [];

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
      let lat = tags.lat, lng = tags.lng;
      if (tags.lloc && !lat) {
        const c = await Geocoder.geocode(tags.lloc);
        if (c) { lat = c.lat; lng = c.lng; }
      }
      await Sheets.appendRow({
        id: driveFile.id + '_' + Date.now(), fileId: driveFile.id,
        url: item.isVideo ? '' : Drive.getThumbnailUrl(driveFile.id),
        any: tags.any, lloc: tags.lloc, persones: tags.persones,
        categoria: tags.categoria, notes: tags.notes,
        pujatNom: profile?.name || '', pujatEmail: profile?.email || '',
        lat, lng, tipus: item.isVideo ? 'video' : 'foto', preferida: tags.preferida || false,
      });
      uploaded++;
    } catch(err) { console.error(err); errors.push(item.name); }
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
  const grid = document.getElementById('meves-grid');
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
            ? `<div class="meves-video-thumb">🎬</div>`
            : `<img src="${photo.url}" alt="${photo.lloc}" loading="lazy" />`}
          ${photo.preferida ? '<div class="meves-star">⭐</div>' : ''}
          <div class="meves-overlay">✏️ Editar</div>
        </div>
        <div class="meves-info">
          <div class="meves-any">${photo.any || ''}${isVideo ? ' · 🎬' : ''}</div>
          <div class="meves-lloc">${photo.lloc || (isVideo ? 'Vídeo de felicitació' : '—')}</div>
          <div class="meves-cats">${(photo.categoria || []).join(' · ') || (photo.persones || []).join(', ')}</div>
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

// Modal edit
function openModal(photo) {
  _currentPhoto = photo;
  const isVideo = photo.tipus === 'video';

  const imgEl   = document.getElementById('modal-img');
  const vidEl   = document.getElementById('modal-video-thumb');
  const vidMsg  = document.getElementById('modal-video-msg');
  if (isVideo) {
    imgEl.style.display = 'none'; vidEl.style.display = 'flex';
    if (vidMsg) vidMsg.classList.remove('hidden');
  } else {
    imgEl.src = photo.url; imgEl.style.display = 'block'; vidEl.style.display = 'none';
    if (vidMsg) vidMsg.classList.add('hidden');
  }

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
  const setVal = (id, v) => { const el = document.getElementById(id); if (el) el.value = v || ''; };
  setVal('modal-lloc', photo.lloc); setVal('modal-lat', photo.lat); setVal('modal-lng', photo.lng); setVal('modal-notes', photo.notes);

  const llocGroup = document.getElementById('modal-lloc-group');
  const catGroup  = document.getElementById('modal-cat-group');
  const prefWrap  = document.getElementById('modal-preferida-wrap');
  if (llocGroup) llocGroup.style.display = isVideo ? 'none' : '';
  if (catGroup)  catGroup.style.display  = isVideo ? 'none' : '';
  if (prefWrap)  prefWrap.style.display  = isVideo ? 'none' : '';
  if (!isVideo) UI.setSelectedCategories('modal-chips-categoria', photo.categoria || []);

  const container = document.getElementById('modal-chips-persones');
  container.innerHTML = '';
  [...new Set([...CONFIG.PERSONES_INICIALS, ...(photo.persones || [])])].forEach(nom => addModalPersonaChip(nom, (photo.persones || []).includes(nom)));

  const prefBtn = document.getElementById('modal-btn-preferida');
  if (prefBtn) {
    prefBtn.classList.toggle('active', !!photo.preferida);
    prefBtn.textContent = photo.preferida ? '⭐ Foto preferida' : '☆ Marcar com a preferida';
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
    UI.showToast('Any, lloc, categoria i persones són obligatoris', 'error'); return;
  }
  if (isVideo && persones.length === 0) { UI.showToast('Indica qui apareix al vídeo', 'error'); return; }

  const btn = document.getElementById('modal-btn-save');
  btn.disabled = true; btn.textContent = 'Guardant...';
  try {
    let finalLat = lat ? parseFloat(lat) : null;
    let finalLng = lng ? parseFloat(lng) : null;
    if (lloc && !finalLat) { const c = await Geocoder.geocode(lloc); if (c) { finalLat = c.lat; finalLng = c.lng; } }
    await Sheets.updateRowByFileId(_currentPhoto.fileId, { any, lloc, notes, categoria, persones, preferida, lat: finalLat, lng: finalLng });
    UI.showToast('Canvis guardats!', 'success');
    closeModal(); renderMyPhotos();
  } catch(err) { UI.showToast('Error: ' + err.message, 'error'); }
  finally { btn.disabled = false; btn.textContent = 'Guardar canvis'; }
}

async function deletePhoto(fileId) {
  if (!confirm("Segur que vols eliminar?")) return;
  try {
    await Drive.deleteFile(fileId);
    await Sheets.deleteRowByFileId(fileId);
    UI.showToast('Eliminat', 'success');
    closeModal(); renderMyPhotos();
  } catch(err) { UI.showToast('Error: ' + err.message, 'error'); }
}
