// ============================================
// ANNAPP40 — UI v6
// ============================================

const UI = (() => {
  // ── Theme ─────────────────────────────────────
  function initTheme() {
    const saved = localStorage.getItem('annapp40_theme') || 'light';
    setTheme(saved, false);
    document.getElementById('btn-theme').addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme || 'light';
      setTheme(cur === 'light' ? 'dark' : 'light');
    });
  }

  function setTheme(theme, save = true) {
    document.documentElement.dataset.theme = theme;
    document.getElementById('btn-theme').textContent = theme === 'dark' ? '☀️' : '🌙';
    document.getElementById('meta-theme').content = theme === 'dark' ? '#000' : '#0a84ff';
    if (save) localStorage.setItem('annapp40_theme', theme);
  }

  // ── Screen ────────────────────────────────────
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
      const nomInput = document.getElementById('input-nova-categoria');
      const nom = nomInput.value.trim();
      if (!nom) return;
      if (!_categories.some(c => c.nom === nom)) {
        _categories.push({ nom });
        _renderAllCategoryChips();
        showToast(`Categoria "${nom}" afegida`, 'success');
      }
      nomInput.value = '';
    });
    document.getElementById('input-nova-categoria')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-add-categoria').click(); }
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
        btn.className = 'chip' + (selected.includes(cat.nom) ? ' selected' : '');
        btn.dataset.value = cat.nom;
        btn.textContent = cat.nom;
        btn.addEventListener('click', () => btn.classList.toggle('selected'));
        container.appendChild(btn);
      });
    });
  }

  function getSelectedCategories(containerId = 'chips-categoria') {
    return [...document.querySelectorAll(`#${containerId} .chip.selected`)].map(c => c.dataset.value);
  }

  function setSelectedCategories(containerId, values) {
    document.querySelectorAll(`#${containerId} .chip`).forEach(c => {
      c.classList.toggle('selected', values.includes(c.dataset.value));
    });
  }

  function resetCategories(containerId = 'chips-categoria') {
    document.querySelectorAll(`#${containerId} .chip`).forEach(c => c.classList.remove('selected'));
  }

  // ── Lloc input ────────────────────────────────
  function initLlocInput(inputId, latId, lngId, dropdownId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    if (input.dataset.llocBound) return;
    input.dataset.llocBound = '1';

    let dropdown = dropdownId ? document.getElementById(dropdownId) : null;
    if (!dropdown) {
      const parent = input.parentNode;
      dropdown = parent.querySelector('.places-dropdown');
      if (!dropdown) {
        dropdown = document.createElement('div');
        dropdown.className = 'places-dropdown hidden';
        parent.appendChild(dropdown);
      }
    }

    let _debounce = null;
    input.addEventListener('input', () => {
      clearTimeout(_debounce);
      const val = input.value.trim();
      if (latId) document.getElementById(latId).value = '';
      if (lngId) document.getElementById(lngId).value = '';
      if (val.length < 2) { dropdown.classList.add('hidden'); return; }
      _debounce = setTimeout(() => _fetchAndRender(val, input, latId, lngId, dropdown), 400);
    });

    input.addEventListener('blur', () => {
      setTimeout(async () => {
        dropdown.classList.add('hidden');
        const val = input.value.trim();
        const lat = latId ? document.getElementById(latId).value : '';
        if (val && !lat) {
          const c = await Geocoder.geocode(val);
          if (c) {
            if (latId) document.getElementById(latId).value = c.lat;
            if (lngId) document.getElementById(lngId).value = c.lng;
          }
        }
      }, 250);
    });
  }

  async function _fetchAndRender(query, input, latId, lngId, dropdown) {
    const suggestions = await Geocoder.autocomplete(query);
    dropdown.innerHTML = '';
    if (suggestions.length === 0) {
      const div = document.createElement('div');
      div.className = 'places-option places-option-geocode';
      div.textContent = `Usar "${query}"`;
      div.addEventListener('mousedown', async (e) => {
        e.preventDefault();
        input.value = query;
        dropdown.classList.add('hidden');
        const c = await Geocoder.geocode(query);
        if (c) {
          if (latId) document.getElementById(latId).value = c.lat;
          if (lngId) document.getElementById(lngId).value = c.lng;
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
      div.className = 'places-option';
      div.textContent = s.text;
      div.addEventListener('mousedown', async (e) => {
        e.preventDefault();
        input.value = s.mainText;
        dropdown.classList.add('hidden');
        const c = await Geocoder.geocodeByPlaceId(s.placeId) || await Geocoder.geocode(s.mainText);
        if (c) {
          if (latId) document.getElementById(latId).value = c.lat;
          if (lngId) document.getElementById(lngId).value = c.lng;
          showToast('Ubicació trobada ✓', 'success');
        }
      });
      dropdown.appendChild(div);
    });
  }

  // ── Files & tags ──────────────────────────────
  let _files = [];
  let _photoTags = [];

  function getFiles()     { return _files; }
  function getPhotoTags() { return _photoTags; }

  function clearFiles() {
    _files = []; _photoTags = [];
    document.getElementById('preview-grid').innerHTML = '';
    document.getElementById('preview-container').classList.add('hidden');
    document.getElementById('tags-section').classList.add('hidden');
    document.getElementById('btn-upload').classList.add('hidden');
    document.getElementById('drop-zone').style.display = '';
    const c = document.getElementById('photo-count');
    if (c) c.textContent = '';
  }

  function addLocalFiles(newFiles) {
    for (const file of newFiles) {
      // Detecció robusta: per tipus MIME i per extensió (mòbil pot retornar tipus buit)
      const mimeIsVideo = file.type.startsWith('video/');
      const extIsVideo  = /\.(mp4|mov|m4v|mpeg|mpg|avi|webm|3gp|3gpp|quicktime|mts|mkv)$/i.test(file.name);
      const mimeIsImage = file.type.startsWith('image/');
      const extIsImage  = /\.(jpg|jpeg|png|gif|webp|heic|heif|bmp|tiff|tif)$/i.test(file.name);
      const isVideo     = mimeIsVideo || (extIsVideo && !mimeIsImage);
      const isImage     = mimeIsImage || (extIsImage && !mimeIsVideo);

      console.log(`Arxiu: ${file.name} | Tipus: "${file.type}" | isVideo: ${isVideo} | isImage: ${isImage}`);

      if (!isImage && !isVideo) {
        console.warn("Arxiu no reconegut, somet:", file.name, file.type);
        continue;
      }

      _files.push({ file, name: file.name, mimeType: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'), isVideo, fromDrive: false });
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
    if (_files.length === 0) return;
    document.getElementById('preview-container').classList.remove('hidden');
    document.getElementById('tags-section').classList.remove('hidden');
    document.getElementById('btn-upload').classList.remove('hidden');
    _updatePhotoCount();
    _adaptCommonForm();
  }

  function _adaptCommonForm() {
    const hasPhotos = _files.some(f => !f.isVideo);
    const hasVideos = _files.some(f => f.isVideo);
    const onlyVideos = hasVideos && !hasPhotos;

    const toggle = (id, visible) => {
      const el = document.getElementById(id);
      if (el) el.classList.toggle('hidden', !visible);
    };

    // Camps foto: any, lloc, categoria-foto, preferida
    toggle('common-any-group',       !onlyVideos);
    toggle('common-lloc-group',      !onlyVideos);
    toggle('common-cat-group',       !onlyVideos);
    toggle('common-preferida-group', !onlyVideos);
    // Camp video: categoria-video
    toggle('common-video-cat-group',  onlyVideos);

    // Títol adaptat
    const title = document.querySelector('#tags-section .form-card-title');
    if (title) {
      if (onlyVideos) title.textContent = 'Etiquetes del vídeo de felicitació';
      else if (hasVideos) title.textContent = 'Etiquetes comunes (fotos i vídeos)';
      else title.textContent = 'Etiquetes comunes';
    }
  }

  function _updatePhotoCount() {
    const fotos  = _files.filter(f => !f.isVideo).length;
    const videos = _files.filter(f => f.isVideo).length;
    const parts = [];
    if (fotos)  parts.push(`${fotos} foto${fotos !== 1 ? 's' : ''}`);
    if (videos) parts.push(`${videos} vídeo${videos !== 1 ? 's' : ''}`);
    const c = document.getElementById('photo-count');
    if (c) c.textContent = (parts.join(' + ') || '') + '  ·  Toca un element per ajustar-lo';
  }

  function _renderPreviewItem(idx) {
    const item = _files[idx];
    const grid = document.getElementById('preview-grid');
    const div  = document.createElement('div');
    div.className = 'preview-item' + (item.isVideo ? ' preview-video' : '');
    div.id = `preview-item-${idx}`;
    div.dataset.idx = idx;

    let thumb = '';
    if (item.isVideo) {
      thumb = `<div class="preview-video-thumb">🎬</div>
               <div class="preview-video-pill">VÍDEO</div>`;
    } else if (item.fromDrive) {
      thumb = `<img src="https://drive.google.com/thumbnail?id=${item.driveId}&sz=w200" alt="" />`;
    } else {
      thumb = `<img src="${URL.createObjectURL(item.file)}" alt="" />`;
    }

    div.innerHTML = `
      ${thumb}
      <div class="preview-badge-tl">
        <div class="preview-badge" id="preview-badge-${idx}">⚙️</div>
      </div>
      <button class="preview-star-btn" id="preview-star-${idx}" title="Marcar com a preferida" type="button">☆</button>
      <button class="remove-btn" data-idx="${idx}" type="button">✕</button>
      <div class="preview-name">${item.name.length > 18 ? item.name.substring(0,16)+'…' : item.name}</div>
      <div class="preview-overlay"><span class="preview-hint">Toca per editar tags</span></div>
    `;
    grid.appendChild(div);

    // Editar tags
    div.addEventListener('click', (e) => {
      if (e.target.classList.contains('remove-btn') || e.target.classList.contains('preview-star-btn')) return;
      openPhotoTagEditor(idx);
    });

    // Estrella preferida (toggle directe sense obrir editor)
    div.querySelector('.preview-star-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      _photoTags[idx].preferida = !_photoTags[idx].preferida;
      _updatePreviewStar(idx);
    });

    // Eliminar
    div.querySelector('.remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const i = parseInt(e.currentTarget.dataset.idx);
      _files.splice(i, 1); _photoTags.splice(i, 1);
      div.remove();
      _updatePhotoCount();
      if (_files.length === 0) clearFiles();
    });
  }

  function _updatePreviewStar(idx) {
    const starBtn = document.getElementById(`preview-star-${idx}`);
    const item    = document.getElementById(`preview-item-${idx}`);
    const isP     = _photoTags[idx].preferida;
    if (starBtn) { starBtn.textContent = isP ? '⭐' : '☆'; starBtn.classList.toggle('active', isP); }
    if (item)    item.classList.toggle('is-preferida', isP);
  }

  function updatePhotoBadge(idx) {
    const badge = document.getElementById(`preview-badge-${idx}`);
    const tags  = _photoTags[idx];
    if (!badge || !tags) return;
    const hasCustom = tags.any || tags.lloc || tags.categoria.length > 0 || tags.persones.length > 0;
    badge.textContent = hasCustom ? '✅' : '⚙️';
    badge.classList.toggle('done', !!hasCustom);
    document.getElementById(`preview-item-${idx}`)?.classList.toggle('has-custom-tags', !!hasCustom);
  }

  function applyCommonTagsToAll() {
    const any          = document.getElementById('tag-any').value;
    const lloc         = document.getElementById('tag-lloc').value.trim();
    const lat          = document.getElementById('tag-lat').value;
    const lng          = document.getElementById('tag-lng').value;
    const categoria    = getSelectedCategories('chips-categoria');
    const videoCat     = [...document.querySelectorAll('#common-video-chips-categoria .chip.selected')].map(c => c.dataset.value);
    const persones     = getSelectedPersones();
    const notes        = document.getElementById('tag-notes').value.trim();

    _photoTags = _photoTags.map(t => {
      const catToApply = t.isVideo
        ? (videoCat.length > 0 ? [...videoCat] : [...t.categoria])
        : (categoria.length > 0 ? [...categoria] : [...t.categoria]);
      return {
        ...t,
        any:       !t.isVideo ? (any  || t.any)  : t.any,
        lloc:      !t.isVideo ? (lloc || t.lloc) : t.lloc,
        lat:       !t.isVideo && lat  ? parseFloat(lat)  : t.lat,
        lng:       !t.isVideo && lng  ? parseFloat(lng)  : t.lng,
        categoria: catToApply,
        persones:  persones.length > 0 ? [...persones] : [...t.persones],
        notes:     notes || t.notes,
      };
    });
    _files.forEach((_, idx) => { updatePhotoBadge(idx); _updatePreviewStar(idx); });
  }

  // ── Editor individual ─────────────────────────
  let _editingIdx = -1;

  function openPhotoTagEditor(idx) {
    _editingIdx = idx;
    const tags = _photoTags[idx];
    const item = _files[idx];

    // Debug: mostrar tipus detectat (visible al toast en mòbil)
    showToast((item.isVideo ? '🎬 Vídeo' : '📷 Foto') + ' detectat: ' + (item.mimeType || 'desconegut'));

    document.getElementById('edit-photo-title').textContent = item.name;

    // Preview: foto o vídeo
    const imgWrap  = document.getElementById('edit-photo-img-wrap');
    const vidThumb = document.getElementById('edit-video-thumb');
    if (item.isVideo) {
      imgWrap.style.display = 'none';
      vidThumb.classList.remove('hidden');
    } else {
      imgWrap.style.display = '';
      vidThumb.classList.add('hidden');
      const imgEl = document.getElementById('edit-photo-img');
      imgEl.src = item.fromDrive
        ? `https://drive.google.com/thumbnail?id=${item.driveId}&sz=w600`
        : URL.createObjectURL(item.file);
    }

    // Amagar/mostrar camps — reset COMPLET cada cop
    const toggle = (id, visible) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.classList.toggle('hidden', !visible);
    };

    // Camps FOTO: any, lloc, categoria-foto, preferida
    toggle('edit-photo-any-group',      !item.isVideo);
    toggle('edit-photo-lloc-group',     !item.isVideo);
    toggle('edit-photo-cat-group',      !item.isVideo);
    toggle('edit-photo-preferida-wrap', !item.isVideo);
    // Camps VIDEO: missatge, categoria-video
    toggle('edit-video-msg',             item.isVideo);
    toggle('edit-video-cat-group',       item.isVideo);
    // Notes: visible sempre
    // Persones: visible sempre

    // Omplir valors
    if (!item.isVideo) {
      document.getElementById('edit-photo-any').value   = tags.any;
      document.getElementById('edit-photo-lloc').value  = tags.lloc;
      document.getElementById('edit-photo-lat').value   = tags.lat || '';
      document.getElementById('edit-photo-lng').value   = tags.lng || '';
      setSelectedCategories('edit-photo-chips-categoria', tags.categoria);
    }
    document.getElementById('edit-photo-notes').value = tags.notes;

    const container = document.getElementById('edit-photo-chips-persones');
    container.innerHTML = '';
    const all = [...new Set([...CONFIG.PERSONES_INICIALS, ...tags.persones])];
    all.forEach(nom => _addChip(container, nom, tags.persones.includes(nom)));

    const prefBtn = document.getElementById('edit-photo-preferida');
    if (prefBtn) {
      prefBtn.classList.toggle('active', !!tags.preferida);
      prefBtn.textContent = tags.preferida ? '⭐ Foto preferida' : '☆ Marcar com a preferida';
    }

    document.getElementById('edit-photo-overlay').classList.remove('hidden');
    document.body.style.overflow = 'hidden';
  }

  function closePhotoTagEditor() {
    document.getElementById('edit-photo-overlay').classList.add('hidden');
    document.body.style.overflow = '';
    _editingIdx = -1;
    // Reset video category chips
    document.querySelectorAll('#edit-video-chips-categoria .chip').forEach(c => c.classList.remove('selected'));
  }

  function savePhotoTagEditor() {
    if (_editingIdx === -1) return;
    const item    = _files[_editingIdx];
    const isVideo = item.isVideo;
    const any     = document.getElementById('edit-photo-any').value;
    const notes   = document.getElementById('edit-photo-notes').value.trim();
    const persones = [...document.querySelectorAll('#edit-photo-chips-persones .chip.selected')].map(c => c.dataset.value);
    const prefBtn  = document.getElementById('edit-photo-preferida');
    const preferida = prefBtn ? prefBtn.classList.contains('active') : false;
    let lloc = '', lat = null, lng = null, categoria = [];
    if (!isVideo) {
      lloc      = document.getElementById('edit-photo-lloc').value.trim();
      lat       = document.getElementById('edit-photo-lat').value ? parseFloat(document.getElementById('edit-photo-lat').value) : null;
      lng       = document.getElementById('edit-photo-lng').value ? parseFloat(document.getElementById('edit-photo-lng').value) : null;
      categoria = getSelectedCategories('edit-photo-chips-categoria');
    } else {
      // Vídeo: llegir categories específiques
      categoria = [...document.querySelectorAll('#edit-video-chips-categoria .chip.selected')].map(c => c.dataset.value);
    }
    _photoTags[_editingIdx] = { any, lloc, lat, lng, categoria, persones, notes, preferida, isVideo };
    updatePhotoBadge(_editingIdx);
    _updatePreviewStar(_editingIdx);
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

  // ── Persones comunes ──────────────────────────
  let _persones = [...CONFIG.PERSONES_INICIALS];

  function initChipsPersones() {
    _renderPersones([]);
    document.getElementById('btn-add-persona').addEventListener('click', () => {
      const input = document.getElementById('input-nova-persona');
      const nom   = input.value.trim();
      if (!nom) return;
      const selected = getSelectedPersones();
      if (!_persones.includes(nom)) _persones.push(nom);
      selected.push(nom);
      _renderPersones(selected);
      input.value = '';
    });
    document.getElementById('input-nova-persona').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); document.getElementById('btn-add-persona').click(); }
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
    document.getElementById('btn-upload').classList.add('hidden');
    document.getElementById('drop-zone').style.display = 'none';
  }

  function hideSuccess() {
    document.getElementById('success-msg').classList.add('hidden');
    document.getElementById('drop-zone').style.display = '';
  }

  function initChipsCategoria() {} // gestionat per initCategories

  return {
    showScreen, setUser, showToast, initTheme,
    initAnys, initCategories, initChipsCategoria,
    initLlocInput, initChipsPersones,
    getFiles, getPhotoTags, clearFiles,
    addLocalFiles, addDriveFiles,
    applyCommonTagsToAll, updatePhotoBadge,
    openPhotoTagEditor, closePhotoTagEditor, savePhotoTagEditor,
    setSelectedCategories, getSelectedCategories, resetCategories,
    getSelectedPersones, resetPersones,
    getTagValues, resetForm,
    showProgress, hideProgress, setUploadLoading,
    showSuccess, hideSuccess,
    addChipToContainer: _addChip,
  };
})();

function initMapsCallback() {
  console.log('Maps carregat');
  UI.initLlocInput('tag-lloc',        'tag-lat',        'tag-lng',        'places-dropdown');
  UI.initLlocInput('edit-photo-lloc', 'edit-photo-lat', 'edit-photo-lng', 'edit-places-dropdown');
}
