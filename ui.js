// ============================================
// ANNAPP40 — UI v4
// ============================================

const UI = (() => {

  // ── Screens ───────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  function setUser(profile) {
    document.getElementById('user-avatar').src = profile.picture || '';
    document.getElementById('user-name').textContent = profile.name || profile.email;
  }

  // ── Toast ─────────────────────────────────────
  let _toastTimer = null;
  function showToast(msg, type = '') {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.className = 'toast' + (type ? ' ' + type : '');
    t.classList.remove('hidden');
    if (_toastTimer) clearTimeout(_toastTimer);
    _toastTimer = setTimeout(() => t.classList.add('hidden'), 3500);
  }

  // ── Anys ──────────────────────────────────────
  function initAnys() {
    ['tag-any', 'edit-photo-any'].forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">Selecciona any...</option>';
      CONFIG.ANYS.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y; opt.textContent = y;
        sel.appendChild(opt);
      });
    });
  }

  // ── Categories dinàmiques ─────────────────────
  let _categories = [...CONFIG.CATEGORIES];

  function initCategories() {
    _renderAllCategoryChips();
    document.getElementById('btn-add-categoria')?.addEventListener('click', () => {
      const nomInput   = document.getElementById('input-nova-categoria');
      const emojiInput = document.getElementById('input-nova-categoria-emoji');
      const nom        = nomInput.value.trim();
      const emoji      = emojiInput.value.trim() || '🏷️';
      if (!nom) return;
      if (!_categories.some(c => c.nom === nom)) {
        _categories.push({ emoji, nom });
        _renderAllCategoryChips();
        showToast(`Categoria "${nom}" afegida`, 'success');
      }
      nomInput.value = ''; emojiInput.value = '';
    });
    document.getElementById('input-nova-categoria')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-add-categoria').click();
    });
  }

  function _renderAllCategoryChips() {
    ['chips-categoria', 'edit-photo-chips-categoria', 'modal-chips-categoria'].forEach(id => {
      const container = document.getElementById(id);
      if (!container) return;
      const selected = [...container.querySelectorAll('.chip.selected')].map(c => c.dataset.value);
      container.innerHTML = '';
      _categories.forEach(cat => {
        const btn = document.createElement('button');
        btn.className     = 'chip' + (selected.includes(cat.nom) ? ' selected' : '');
        btn.dataset.value = cat.nom;
        btn.textContent   = `${cat.emoji} ${cat.nom}`;
        btn.addEventListener('click', () => btn.classList.toggle('selected'));
        container.appendChild(btn);
      });
    });
  }

  function getSelectedCategories(containerId = 'chips-categoria') {
    return [...document.querySelectorAll(`#${containerId} .chip.selected`)].map(c => c.dataset.value);
  }

  function resetCategories(containerId = 'chips-categoria') {
    document.querySelectorAll(`#${containerId} .chip`).forEach(c => c.classList.remove('selected'));
  }

  function setSelectedCategories(containerId, values) {
    document.querySelectorAll(`#${containerId} .chip`).forEach(c => {
      c.classList.toggle('selected', values.includes(c.dataset.value));
    });
  }

  // ── Lloc amb geocoding ────────────────────────
  function initLlocInput(inputId, latId, lngId, dropdownId) {
    const input    = document.getElementById(inputId);
    if (!input) return;
    // Si no hi ha dropdown, crear-ne un dinàmic al costat de l'input
    let dropdown = dropdownId ? document.getElementById(dropdownId) : null;
    if (!dropdown) {
      // Buscar dropdown adjacent ja existent o crear-lo
      const parent = input.parentNode;
      dropdown = parent.querySelector('.places-dropdown');
      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'places-dropdown hidden';
        parent.appendChild(dropdown);
      }
    }
    // Evitar doble bind
    if (input.dataset.llocBound) return;
    input.dataset.llocBound = '1';

    let _debounce = null;

    input.addEventListener('input', () => {
      clearTimeout(_debounce);
      const val = input.value.trim();
      document.getElementById(latId).value = '';
      document.getElementById(lngId).value = '';
      if (val.length < 2) { dropdown.classList.add('hidden'); return; }
      _debounce = setTimeout(() => _fetchAndRender(val, input, latId, lngId, dropdown), 400);
    });

    input.addEventListener('blur', () => {
      setTimeout(async () => {
        dropdown.classList.add('hidden');
        // Si no hi ha coordenades però hi ha text, geocodificar automàticament
        const val = input.value.trim();
        const lat = document.getElementById(latId).value;
        if (val && !lat) {
          const coords = await Geocoder.geocode(val);
          if (coords) {
            document.getElementById(latId).value = coords.lat;
            document.getElementById(lngId).value = coords.lng;
            console.log('Geocodificat:', val, coords);
          }
        }
      }, 250);
    });
  }

  async function _fetchAndRender(query, input, latId, lngId, dropdown) {
    const suggestions = await Geocoder.autocomplete(query);
    dropdown.innerHTML = '';

    if (suggestions.length === 0) {
      // Mostrar opció de geocodificar el text directe
      const div = document.createElement('div');
      div.className   = 'places-option places-option-geocode';
      div.textContent = `Usar "${query}"`;
      div.addEventListener('mousedown', async (e) => {
        e.preventDefault();
        input.value = query;
        dropdown.classList.add('hidden');
        const coords = await Geocoder.geocode(query);
        if (coords) {
          document.getElementById(latId).value = coords.lat;
          document.getElementById(lngId).value = coords.lng;
          showToast('Ubicació trobada ✓', 'success');
        }
      });
      dropdown.appendChild(div);
      dropdown.classList.remove('hidden');
      return;
    }

    dropdown.classList.remove('hidden');
    suggestions.forEach(s => {
      const div = document.createElement('div');
      div.className   = 'places-option';
      div.textContent = s.text;
      div.addEventListener('mousedown', async (e) => {
        e.preventDefault();
        input.value = s.mainText;
        dropdown.classList.add('hidden');
        const coords = await Geocoder.geocodeByPlaceId(s.placeId);
        if (coords) {
          document.getElementById(latId).value = coords.lat;
          document.getElementById(lngId).value = coords.lng;
          showToast('Ubicació trobada ✓', 'success');
        } else {
          // Fallback: geocodificar per nom
          const c2 = await Geocoder.geocode(s.mainText);
          if (c2) {
            document.getElementById(latId).value = c2.lat;
            document.getElementById(lngId).value = c2.lng;
          }
        }
      });
      dropdown.appendChild(div);
    });
  }

  // ── Fitxers i tags ────────────────────────────
  let _files     = []; // { file?, driveId?, name, mimeType, isVideo, fromDrive }
  let _photoTags = [];

  function getFiles()     { return _files; }
  function getPhotoTags() { return _photoTags; }

  function clearFiles() {
    _files = []; _photoTags = [];
    document.getElementById('preview-grid').innerHTML = '';
    document.getElementById('preview-container').classList.add('hidden');
    document.getElementById('tags-section').classList.add('hidden');
    document.getElementById('drop-zone').style.display = '';
    const counter = document.getElementById('photo-count');
    if (counter) counter.textContent = '';
  }

  function addLocalFiles(newFiles) {
    for (const file of newFiles) {
      const isVideo = file.type.startsWith('video/');
      if (!file.type.startsWith('image/') && !isVideo) continue;
      _files.push({ file, name: file.name, mimeType: file.type, isVideo, fromDrive: false });
      _photoTags.push(_emptyTags(isVideo));
      _renderPreviewItem(_files.length - 1);
    }
    _afterAdd();
  }

  function addDriveFiles(driveFiles) {
    for (const df of driveFiles) {
      _files.push({ driveId: df.id, name: df.name, mimeType: df.mimeType, isVideo: df.isVideo, fromDrive: true });
      _photoTags.push(_emptyTags(df.isVideo));
      _renderPreviewItem(_files.length - 1);
    }
    _afterAdd();
  }

  function _emptyTags(isVideo = false) {
    return { any: '', lloc: '', lat: null, lng: null, categoria: [], persones: [], notes: '', preferida: false, isVideo };
  }

  function _afterAdd() {
    if (_files.length > 0) {
      document.getElementById('preview-container').classList.remove('hidden');
      document.getElementById('tags-section').classList.remove('hidden');
      _updatePhotoCount();
    }
  }

  function _updatePhotoCount() {
    const fotos   = _files.filter(f => !f.isVideo).length;
    const videos  = _files.filter(f => f.isVideo).length;
    const parts   = [];
    if (fotos)  parts.push(`${fotos} foto${fotos !== 1 ? 's' : ''}`);
    if (videos) parts.push(`${videos} vídeo${videos !== 1 ? 's' : ''}`);
    const counter = document.getElementById('photo-count');
    if (counter) counter.textContent = parts.join(' + ') + ' — clica un per ajustar els seus tags';
  }

  function _renderPreviewItem(idx) {
    const item = _files[idx];
    const grid = document.getElementById('preview-grid');
    const div  = document.createElement('div');
    div.className = 'preview-item' + (item.isVideo ? ' preview-video' : '');
    div.dataset.idx = idx;
    div.id = `preview-item-${idx}`;

    let thumbHtml = '';
    if (item.isVideo) {
      thumbHtml = `<div class="preview-video-thumb">🎬</div>`;
    } else if (item.fromDrive) {
      thumbHtml = `<img src="https://drive.google.com/thumbnail?id=${item.driveId}&sz=w200" alt="${item.name}" />`;
    } else {
      thumbHtml = `<img src="${URL.createObjectURL(item.file)}" alt="${item.name}" />`;
    }

    div.innerHTML = `
      ${thumbHtml}
      <div class="preview-name">${item.name.length > 16 ? item.name.substring(0,14)+'...' : item.name}</div>
      <div class="preview-tag-badge" id="preview-badge-${idx}">⚙️</div>
      ${item.isVideo ? '<div class="preview-video-label">🎬 Vídeo</div>' : ''}
      <button class="remove-btn" data-idx="${idx}" title="Eliminar">✕</button>
    `;
    grid.appendChild(div);

    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-btn')) return;
      openPhotoTagEditor(idx);
    });
    div.querySelector('.remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const i = parseInt(e.target.dataset.idx);
      _files.splice(i, 1); _photoTags.splice(i, 1);
      div.remove(); _updatePhotoCount();
      if (_files.length === 0) clearFiles();
    });
  }

  function updatePhotoBadge(idx) {
    const badge = document.getElementById(`preview-badge-${idx}`);
    const tags  = _photoTags[idx];
    if (!badge || !tags) return;
    const hasCustom = tags.any || tags.lloc || tags.categoria.length > 0 || tags.persones.length > 0;
    badge.textContent = hasCustom ? '✅' : '⚙️';
    document.getElementById(`preview-item-${idx}`)?.classList.toggle('has-custom-tags', !!hasCustom);
  }

  function applyCommonTagsToAll() {
    const any       = document.getElementById('tag-any').value;
    const lloc      = document.getElementById('tag-lloc').value.trim();
    const lat       = document.getElementById('tag-lat').value;
    const lng       = document.getElementById('tag-lng').value;
    const categoria = getSelectedCategories('chips-categoria');
    const persones  = getSelectedPersones();
    const notes     = document.getElementById('tag-notes').value.trim();

    _photoTags = _photoTags.map(t => ({
      ...t,
      any:       any       || t.any,
      lloc:      lloc      || t.lloc,
      lat:       lat       ? parseFloat(lat) : t.lat,
      lng:       lng       ? parseFloat(lng) : t.lng,
      categoria: !t.isVideo && categoria.length > 0 ? [...categoria] : [...t.categoria],
      persones:  persones.length  > 0 ? [...persones]  : [...t.persones],
      notes:     notes     || t.notes,
    }));
    _files.forEach((_, idx) => updatePhotoBadge(idx));
  }

  // ── Editor tags individual ────────────────────
  let _editingIdx = -1;

  function openPhotoTagEditor(idx) {
    _editingIdx   = idx;
    const tags    = _photoTags[idx];
    const item    = _files[idx];
    const isVideo = item.isVideo;

    document.getElementById('edit-photo-title').textContent = item.name;

    // Miniatura
    if (isVideo) {
      document.getElementById('edit-photo-img').src   = '';
      document.getElementById('edit-photo-img').style.display = 'none';
      document.getElementById('edit-video-thumb').classList.remove('hidden');
    } else {
      document.getElementById('edit-video-thumb').classList.add('hidden');
      document.getElementById('edit-photo-img').style.display = 'block';
      document.getElementById('edit-photo-img').src = item.fromDrive
        ? `https://drive.google.com/thumbnail?id=${item.driveId}&sz=w400`
        : URL.createObjectURL(item.file);
    }

    // Camps comuns
    document.getElementById('edit-photo-any').value   = tags.any;
    document.getElementById('edit-photo-notes').value = tags.notes;

    // Lloc (only fotos)
    const llocGroup = document.getElementById('edit-photo-lloc-group');
    const catGroup  = document.getElementById('edit-photo-cat-group');
    const videoMsg = document.getElementById('edit-video-msg');
    if (isVideo) {
      if (llocGroup) llocGroup.style.display = 'none';
      if (catGroup)  catGroup.style.display  = 'none';
      if (videoMsg)  videoMsg.classList.remove('hidden');
    } else {
      if (llocGroup) llocGroup.style.display = '';
      if (catGroup)  catGroup.style.display  = '';
      if (videoMsg)  videoMsg.classList.add('hidden');
      document.getElementById('edit-photo-lloc').value = tags.lloc;
      document.getElementById('edit-photo-lat').value  = tags.lat || '';
      document.getElementById('edit-photo-lng').value  = tags.lng || '';
      setSelectedCategories('edit-photo-chips-categoria', tags.categoria);
    }

    // Persones
    const container = document.getElementById('edit-photo-chips-persones');
    container.innerHTML = '';
    const all = [...new Set([...CONFIG.PERSONES_INICIALS, ...tags.persones])];
    all.forEach(nom => _addChip(container, nom, tags.persones.includes(nom)));

    // Preferida (només fotos)
    const prefBtn  = document.getElementById('edit-photo-preferida');
    const prefWrap = document.querySelector('#edit-photo-overlay .preferida-wrap');
    if (prefWrap) prefWrap.style.display = isVideo ? 'none' : 'block';
    if (prefBtn) {
      prefBtn.classList.toggle('active', !!tags.preferida);
      prefBtn.textContent = tags.preferida ? '⭐ Foto preferida' : '☆ Marcar com a preferida';
    }

    document.getElementById('edit-photo-overlay').classList.remove('hidden');
  }

  function closePhotoTagEditor() {
    document.getElementById('edit-photo-overlay').classList.add('hidden');
    _editingIdx = -1;
  }

  function savePhotoTagEditor() {
    if (_editingIdx === -1) return;
    const item    = _files[_editingIdx];
    const isVideo = item.isVideo;
    const any     = document.getElementById('edit-photo-any').value;
    const notes   = document.getElementById('edit-photo-notes').value.trim();
    const persones= [...document.querySelectorAll('#edit-photo-chips-persones .chip.selected')].map(c => c.dataset.value);
    const prefBtn = document.getElementById('edit-photo-preferida');
    const preferida = prefBtn ? prefBtn.classList.contains('active') : false;

    let lloc = '', lat = null, lng = null, categoria = [];
    if (!isVideo) {
      lloc      = document.getElementById('edit-photo-lloc').value.trim();
      lat       = document.getElementById('edit-photo-lat').value ? parseFloat(document.getElementById('edit-photo-lat').value) : null;
      lng       = document.getElementById('edit-photo-lng').value ? parseFloat(document.getElementById('edit-photo-lng').value) : null;
      categoria = getSelectedCategories('edit-photo-chips-categoria');
    }

    _photoTags[_editingIdx] = { any, lloc, lat, lng, categoria, persones, notes, preferida, isVideo };
    updatePhotoBadge(_editingIdx);
    closePhotoTagEditor();
    showToast('Tags guardats ✓', 'success');
  }

  function _addChip(container, nom, selected) {
    if ([...container.querySelectorAll('.chip')].some(c => c.dataset.value === nom)) return;
    const btn = document.createElement('button');
    btn.className = 'chip' + (selected ? ' selected' : '');
    btn.dataset.value = nom;
    btn.textContent = nom;
    btn.addEventListener('click', () => btn.classList.toggle('selected'));
    container.appendChild(btn);
  }

  // ── Chips persones ────────────────────────────
  let _persones = [...CONFIG.PERSONES_INICIALS];

  function initChipsPersones() {
    _renderPersones([]);
    document.getElementById('btn-add-persona').addEventListener('click', () => {
      const input    = document.getElementById('input-nova-persona');
      const nom      = input.value.trim();
      if (!nom) return;
      const selected = getSelectedPersones();
      if (!_persones.includes(nom)) _persones.push(nom);
      selected.push(nom);
      _renderPersones(selected);
      input.value = '';
    });
    document.getElementById('input-nova-persona').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-add-persona').click();
    });
  }

  function _renderPersones(selectedList = []) {
    const container = document.getElementById('chips-persones');
    container.innerHTML = '';
    _persones.forEach(nom => {
      const btn = document.createElement('button');
      btn.className = 'chip' + (selectedList.includes(nom) ? ' selected' : '');
      btn.dataset.value = nom;
      btn.textContent = nom;
      btn.addEventListener('click', () => btn.classList.toggle('selected'));
      container.appendChild(btn);
    });
  }

  function getSelectedPersones() {
    return [...document.querySelectorAll('#chips-persones .chip.selected')].map(c => c.dataset.value);
  }

  function resetPersones() {
    document.querySelectorAll('#chips-persones .chip').forEach(c => c.classList.remove('selected'));
  }

  function getTagValues() {
    return {
      any:       document.getElementById('tag-any').value,
      lloc:      document.getElementById('tag-lloc').value.trim(),
      lat:       document.getElementById('tag-lat').value ? parseFloat(document.getElementById('tag-lat').value) : null,
      lng:       document.getElementById('tag-lng').value ? parseFloat(document.getElementById('tag-lng').value) : null,
      notes:     document.getElementById('tag-notes').value.trim(),
      categoria: getSelectedCategories('chips-categoria'),
      persones:  getSelectedPersones(),
    };
  }

  function resetForm() {
    document.getElementById('tag-any').value   = '';
    document.getElementById('tag-lloc').value  = '';
    document.getElementById('tag-lat').value   = '';
    document.getElementById('tag-lng').value   = '';
    document.getElementById('tag-notes').value = '';
    resetCategories('chips-categoria');
    resetPersones();
  }

  // ── Progress ──────────────────────────────────
  function showProgress(pct, text) {
    document.getElementById('progress-container').classList.remove('hidden');
    document.getElementById('progress-bar').style.width = pct + '%';
    document.getElementById('progress-text').textContent = text;
  }

  function hideProgress() {
    document.getElementById('progress-container').classList.add('hidden');
    document.getElementById('progress-bar').style.width = '0%';
  }

  function setUploadLoading(loading) {
    const btn  = document.getElementById('btn-upload');
    const text = document.getElementById('btn-upload-text');
    const spin = document.getElementById('btn-upload-spinner');
    btn.disabled = loading;
    text.classList.toggle('hidden', loading);
    spin.classList.toggle('hidden', !loading);
  }

  function showSuccess(n) {
    const txt = document.getElementById('success-text');
    if (txt) txt.textContent = `✅ ${n} element${n !== 1 ? 's' : ''} pujat${n !== 1 ? 's' : ''} correctament!`;
    document.getElementById('success-msg').classList.remove('hidden');
    document.getElementById('tags-section').classList.add('hidden');
    document.getElementById('preview-container').classList.add('hidden');
    document.getElementById('drop-zone').style.display = 'none';
  }

  function hideSuccess() {
    document.getElementById('success-msg').classList.add('hidden');
    document.getElementById('drop-zone').style.display = '';
  }

  function initChipsCategoria() {} // gestionat per initCategories

  return {
    showScreen, setUser, showToast,
    initAnys, initCategories, initChipsCategoria,
    initLlocInput,
    getFiles, getPhotoTags, clearFiles,
    addLocalFiles, addDriveFiles,
    applyCommonTagsToAll, updatePhotoBadge,
    openPhotoTagEditor, closePhotoTagEditor, savePhotoTagEditor,
    setSelectedCategories, getSelectedCategories, resetCategories,
    initChipsPersones, getSelectedPersones, resetPersones,
    getTagValues, resetForm,
    showProgress, hideProgress, setUploadLoading,
    showSuccess, hideSuccess,
    addChipToContainer: _addChip,
  };
})();

// Callback Maps (si es carrega)
function initMapsCallback() {
  console.log('Google Maps carregat');
  UI.initLlocInput('tag-lloc',        'tag-lat',        'tag-lng',        'places-dropdown');
  UI.initLlocInput('edit-photo-lloc', 'edit-photo-lat', 'edit-photo-lng', 'edit-places-dropdown');
}
