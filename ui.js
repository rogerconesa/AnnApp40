// ============================================
// ANNAPP40 — UI v3
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

  // ── Anys (desplegable) ────────────────────────
  function initAnys() {
    const selects = ['tag-any', 'edit-photo-any', 'modal-any-sel'];
    selects.forEach(id => {
      const sel = document.getElementById(id);
      if (!sel) return;
      sel.innerHTML = '<option value="">Selecciona any...</option>';
      CONFIG.ANYS.forEach(y => {
        const opt = document.createElement('option');
        opt.value = y;
        opt.textContent = y;
        sel.appendChild(opt);
      });
    });
  }

  // ── Categories dinàmiques ─────────────────────
  let _categories = [...CONFIG.CATEGORIES];

  function initCategories() {
    _renderAllCategoryChips();

    // Botó afegir categoria
    document.getElementById('btn-add-categoria')?.addEventListener('click', () => {
      const nomInput   = document.getElementById('input-nova-categoria');
      const emojiInput = document.getElementById('input-nova-categoria-emoji');
      const nom        = nomInput.value.trim();
      const emoji      = emojiInput.value.trim() || '🏷️';
      if (!nom) return;
      if (!_categories.some(c => c.nom === nom)) {
        _categories.push({ emoji, nom });
        _renderAllCategoryChips();
        showToast(`Categoria "${nom}" afegida ✓`, 'success');
      }
      nomInput.value   = '';
      emojiInput.value = '';
    });
    document.getElementById('input-nova-categoria')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-add-categoria').click();
    });
  }

  function _renderAllCategoryChips() {
    ['chips-categoria', 'edit-photo-chips-categoria', 'modal-chips-categoria'].forEach(id => {
      const container = document.getElementById(id);
      if (!container) return;
      // Guardar selecció actual
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

  // ── Places Autocomplete (Google Maps nova API) ──
  function initPlacesAutocomplete(inputId, latId, lngId, dropdownId) {
    const input    = document.getElementById(inputId);
    const dropdown = document.getElementById(dropdownId);
    if (!input || !dropdown) return;

    let _debounce   = null;
    let _sessionToken = null;

    function _getToken() {
      if (!_sessionToken && typeof google !== 'undefined' && google.maps?.places?.AutocompleteSessionToken) {
        _sessionToken = new google.maps.places.AutocompleteSessionToken();
      }
      return _sessionToken;
    }

    input.addEventListener('input', () => {
      clearTimeout(_debounce);
      const val = input.value.trim();
      if (val.length < 2) { dropdown.classList.add('hidden'); return; }
      _debounce = setTimeout(() => _fetchSuggestions(val, input, latId, lngId, dropdown, _getToken()), 300);
    });

    input.addEventListener('blur', () => {
      setTimeout(() => dropdown.classList.add('hidden'), 200);
    });
  }

  async function _fetchSuggestions(query, input, latId, lngId, dropdown, sessionToken) {
    if (typeof google === 'undefined' || !google.maps?.places) return;

    try {
      // Nova API: AutocompleteSuggestion (Google Maps JS API v3.55+)
      const { suggestions } = await google.maps.places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: query,
        includedPrimaryTypes: ['locality', 'administrative_area_level_2'],
        sessionToken,
      });

      _renderDropdown(suggestions, input, latId, lngId, dropdown, sessionToken);
    } catch(e) {
      // Fallback a l'API antiga si la nova no és disponible
      _fetchSuggestionsLegacy(query, input, latId, lngId, dropdown);
    }
  }

  function _fetchSuggestionsLegacy(query, input, latId, lngId, dropdown) {
    if (!google.maps?.places?.AutocompleteService) return;
    const service = new google.maps.places.AutocompleteService();
    service.getPlacePredictions({ input: query, types: ['(cities)'] }, (predictions, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
        dropdown.classList.add('hidden'); return;
      }
      const mapped = predictions.map(p => ({
        text: p.description,
        mainText: p.structured_formatting?.main_text || p.description,
        placeId: p.place_id,
        isLegacy: true,
      }));
      _renderDropdownLegacy(mapped, input, latId, lngId, dropdown);
    });
  }

  function _renderDropdown(suggestions, input, latId, lngId, dropdown, sessionToken) {
    dropdown.innerHTML = '';
    if (!suggestions || suggestions.length === 0) { dropdown.classList.add('hidden'); return; }
    dropdown.classList.remove('hidden');

    suggestions.forEach(s => {
      const prediction = s.placePrediction;
      const div = document.createElement('div');
      div.className   = 'places-option';
      div.textContent = prediction.text.toString();
      div.addEventListener('mousedown', async (e) => {
        e.preventDefault();
        input.value = prediction.mainText?.toString() || prediction.text.toString();
        dropdown.classList.add('hidden');
        // Obtenir coordenades amb nova API
        try {
          const place = prediction.toPlace();
          await place.fetchFields({ fields: ['location', 'displayName'] });
          document.getElementById(latId).value = place.location.lat();
          document.getElementById(lngId).value = place.location.lng();
        } catch(err) {
          console.warn("No shan pogut obtenir coordenades:", err);
        }
      });
      dropdown.appendChild(div);
    });
  }

  function _renderDropdownLegacy(items, input, latId, lngId, dropdown) {
    dropdown.innerHTML = '';
    if (!items || items.length === 0) { dropdown.classList.add('hidden'); return; }
    dropdown.classList.remove('hidden');
    items.forEach(item => {
      const div = document.createElement('div');
      div.className   = 'places-option';
      div.textContent = item.text;
      div.addEventListener('mousedown', async (e) => {
        e.preventDefault();
        input.value = item.mainText;
        dropdown.classList.add('hidden');
        // Geocodificar per obtenir coordenades
        try {
          const geocoder = new google.maps.Geocoder();
          geocoder.geocode({ placeId: item.placeId }, (results, status) => {
            if (status === 'OK' && results[0]) {
              document.getElementById(latId).value = results[0].geometry.location.lat();
              document.getElementById(lngId).value = results[0].geometry.location.lng();
            }
          });
        } catch(err) {
          console.warn('Geocode error:', err);
        }
      });
      dropdown.appendChild(div);
    });
  }

  // ── Fitxers i tags individuals ────────────────
  let _files     = [];
  let _photoTags = [];

  function getFiles()     { return _files; }
  function getPhotoTags() { return _photoTags; }

  function clearFiles() {
    _files     = [];
    _photoTags = [];
    document.getElementById('preview-grid').innerHTML = '';
    document.getElementById('preview-container').classList.add('hidden');
    document.getElementById('tags-section').classList.add('hidden');
    document.getElementById('drop-zone').style.display = '';
    const counter = document.getElementById('photo-count');
    if (counter) counter.textContent = '';
  }

  function addFiles(newFiles) {
    for (const file of newFiles) {
      if (!file.type.startsWith('image/')) continue;
      _files.push(file);
      _photoTags.push({ any: '', lloc: '', lat: null, lng: null, categoria: [], persones: [], notes: '' });
      _renderPreviewItem(file, _files.length - 1);
    }
    if (_files.length > 0) {
      document.getElementById('preview-container').classList.remove('hidden');
      document.getElementById('tags-section').classList.remove('hidden');
      _updatePhotoCount();
    }
  }

  function _updatePhotoCount() {
    const counter = document.getElementById('photo-count');
    if (counter) counter.textContent = `${_files.length} foto${_files.length !== 1 ? 's' : ''} — clica una per ajustar els seus tags`;
  }

  function _renderPreviewItem(file, idx) {
    const grid = document.getElementById('preview-grid');
    const url  = URL.createObjectURL(file);
    const div  = document.createElement('div');
    div.className = 'preview-item';
    div.dataset.idx = idx;
    div.id = `preview-item-${idx}`;
    div.innerHTML = `
      <img src="${url}" alt="${file.name}" />
      <div class="preview-name">${file.name.length > 16 ? file.name.substring(0,14)+'...' : file.name}</div>
      <div class="preview-tag-badge" id="preview-badge-${idx}" title="Clica per editar tags">⚙️</div>
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
      _files.splice(i, 1);
      _photoTags.splice(i, 1);
      div.remove();
      _updatePhotoCount();
      if (_files.length === 0) clearFiles();
    });
  }

  function updatePhotoBadge(idx) {
    const badge = document.getElementById(`preview-badge-${idx}`);
    const tags  = _photoTags[idx];
    if (!badge || !tags) return;
    const hasCustom = tags.any || tags.lloc || tags.categoria.length > 0 || tags.persones.length > 0;
    badge.textContent = hasCustom ? '✅' : '⚙️';
    document.getElementById(`preview-item-${idx}`)?.classList.toggle('has-custom-tags', hasCustom);
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
      any:       any       || t.any,
      lloc:      lloc      || t.lloc,
      lat:       lat       ? parseFloat(lat) : t.lat,
      lng:       lng       ? parseFloat(lng) : t.lng,
      categoria: categoria.length > 0 ? [...categoria] : [...t.categoria],
      persones:  persones.length  > 0 ? [...persones]  : [...t.persones],
      notes:     notes     || t.notes,
    }));
    _files.forEach((_, idx) => updatePhotoBadge(idx));
  }

  // ── Editor tags individual ────────────────────
  let _editingIdx = -1;

  function openPhotoTagEditor(idx) {
    _editingIdx = idx;
    const tags  = _photoTags[idx];
    const file  = _files[idx];

    document.getElementById('edit-photo-title').textContent = file.name;
    document.getElementById('edit-photo-img').src           = URL.createObjectURL(file);
    document.getElementById('edit-photo-any').value         = tags.any;
    document.getElementById('edit-photo-lloc').value        = tags.lloc;
    document.getElementById('edit-photo-lat').value         = tags.lat || '';
    document.getElementById('edit-photo-lng').value         = tags.lng || '';
    document.getElementById('edit-photo-notes').value       = tags.notes;

    setSelectedCategories('edit-photo-chips-categoria', tags.categoria);

    const container = document.getElementById('edit-photo-chips-persones');
    container.innerHTML = '';
    const all = [...new Set([...CONFIG.PERSONES_INICIALS, ...tags.persones])];
    all.forEach(nom => _addChip(container, nom, tags.persones.includes(nom)));

    document.getElementById('edit-photo-overlay').classList.remove('hidden');
  }

  function closePhotoTagEditor() {
    document.getElementById('edit-photo-overlay').classList.add('hidden');
    _editingIdx = -1;
  }

  function savePhotoTagEditor() {
    if (_editingIdx === -1) return;
    const any       = document.getElementById('edit-photo-any').value;
    const lloc      = document.getElementById('edit-photo-lloc').value.trim();
    const lat       = document.getElementById('edit-photo-lat').value;
    const lng       = document.getElementById('edit-photo-lng').value;
    const notes     = document.getElementById('edit-photo-notes').value.trim();
    const categoria = getSelectedCategories('edit-photo-chips-categoria');
    const persones  = [...document.querySelectorAll('#edit-photo-chips-persones .chip.selected')].map(c => c.dataset.value);

    _photoTags[_editingIdx] = {
      any, lloc,
      lat: lat ? parseFloat(lat) : null,
      lng: lng ? parseFloat(lng) : null,
      categoria, persones, notes
    };
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

  // ── Chips persones comuns ─────────────────────
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
    if (txt) txt.textContent = `✅ ${n} foto${n !== 1 ? 's' : ''} pujada${n !== 1 ? 's' : ''} correctament!`;
    document.getElementById('success-msg').classList.remove('hidden');
    document.getElementById('tags-section').classList.add('hidden');
    document.getElementById('preview-container').classList.add('hidden');
    document.getElementById('drop-zone').style.display = 'none';
  }

  function hideSuccess() {
    document.getElementById('success-msg').classList.add('hidden');
    document.getElementById('drop-zone').style.display = '';
  }

  // Inicialitzar chips categoria per als modals (no genera doble event)
  function initChipsCategoria() {
    // Ara tot es gestiona via _renderAllCategoryChips
  }

  return {
    showScreen, setUser, showToast,
    initAnys, initCategories, initChipsCategoria,
    initPlacesAutocomplete,
    getFiles, getPhotoTags, clearFiles, addFiles,
    applyCommonTagsToAll, updatePhotoBadge,
    openPhotoTagEditor, closePhotoTagEditor, savePhotoTagEditor,
    setSelectedCategories,
    getSelectedCategories, resetCategories,
    initChipsPersones, getSelectedPersones, resetPersones,
    getTagValues, resetForm,
    showProgress, hideProgress, setUploadLoading,
    showSuccess, hideSuccess,
    addChipToContainer: _addChip,
  };
})();

// Callback de Google Maps
function initMapsCallback() {
  console.log('Google Maps carregat correctament');
  UI.initPlacesAutocomplete('tag-lloc',        'tag-lat',        'tag-lng',        'places-dropdown');
  UI.initPlacesAutocomplete('edit-photo-lloc', 'edit-photo-lat', 'edit-photo-lng', 'edit-places-dropdown');
}
