// ============================================
// ANNAPP40 — UI
// Interaccions amb el DOM
// ============================================

const UI = (() => {

  // ── Screens ───────────────────────────────────
  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
  }

  // ── User info ─────────────────────────────────
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

  // ── Preview de fotos ──────────────────────────
  let _files = [];

  function getFiles() { return _files; }

  function clearFiles() {
    _files = [];
    document.getElementById('preview-grid').innerHTML = '';
    document.getElementById('preview-container').classList.add('hidden');
    document.getElementById('tags-section').classList.add('hidden');
    document.getElementById('drop-zone').style.display = '';
  }

  function addFiles(newFiles) {
    for (const file of newFiles) {
      if (!file.type.startsWith('image/')) continue;
      _files.push(file);
      _renderPreviewItem(file, _files.length - 1);
    }

    if (_files.length > 0) {
      document.getElementById('preview-container').classList.remove('hidden');
      document.getElementById('tags-section').classList.remove('hidden');
    }
  }

  function _renderPreviewItem(file, idx) {
    const grid = document.getElementById('preview-grid');
    const url  = URL.createObjectURL(file);

    const div = document.createElement('div');
    div.className = 'preview-item';
    div.dataset.idx = idx;
    div.innerHTML = `
      <img src="${url}" alt="${file.name}" />
      <button class="remove-btn" data-idx="${idx}" title="Eliminar">✕</button>
    `;
    grid.appendChild(div);

    div.querySelector('.remove-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      const i = parseInt(e.target.dataset.idx);
      _files.splice(i, 1);
      div.remove();
      if (_files.length === 0) clearFiles();
    });
  }

  // ── Chips de categoria (selecció múltiple) ────
  function initChipsCategoria() {
    document.querySelectorAll('#chips-categoria .chip').forEach(chip => {
      chip.addEventListener('click', () => chip.classList.toggle('selected'));
    });
  }

  function getSelectedCategories() {
    return [...document.querySelectorAll('#chips-categoria .chip.selected')]
      .map(c => c.dataset.value);
  }

  function resetCategories() {
    document.querySelectorAll('#chips-categoria .chip').forEach(c => c.classList.remove('selected'));
  }

  // ── Chips de persones (dinàmiques) ────────────
  let _persones = [...CONFIG.PERSONES_INICIALS];

  function initChipsPersones() {
    _renderPersones();

    document.getElementById('btn-add-persona').addEventListener('click', () => {
      const input = document.getElementById('input-nova-persona');
      const nom = input.value.trim();
      if (!nom) return;
      if (!_persones.includes(nom)) {
        _persones.push(nom);
        _renderPersones();
      }
      input.value = '';
    });

    document.getElementById('input-nova-persona').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('btn-add-persona').click();
    });
  }

  function _renderPersones() {
    const container = document.getElementById('chips-persones');
    container.innerHTML = '';
    _persones.forEach(nom => {
      const btn = document.createElement('button');
      btn.className = 'chip';
      btn.dataset.value = nom;
      btn.textContent = nom;
      btn.addEventListener('click', () => btn.classList.toggle('selected'));
      container.appendChild(btn);
    });
  }

  function getSelectedPersones() {
    return [...document.querySelectorAll('#chips-persones .chip.selected')]
      .map(c => c.dataset.value);
  }

  function resetPersones() {
    document.querySelectorAll('#chips-persones .chip').forEach(c => c.classList.remove('selected'));
  }

  // ── Tags form values ──────────────────────────
  function getTagValues() {
    return {
      any:       document.getElementById('tag-any').value.trim(),
      lloc:      document.getElementById('tag-lloc').value.trim(),
      notes:     document.getElementById('tag-notes').value.trim(),
      categoria: getSelectedCategories(),
      persones:  getSelectedPersones(),
    };
  }

  function resetForm() {
    document.getElementById('tag-any').value   = '';
    document.getElementById('tag-lloc').value  = '';
    document.getElementById('tag-notes').value = '';
    resetCategories();
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

  // ── Upload button ─────────────────────────────
  function setUploadLoading(loading) {
    const btn  = document.getElementById('btn-upload');
    const text = document.getElementById('btn-upload-text');
    const spin = document.getElementById('btn-upload-spinner');
    btn.disabled = loading;
    text.classList.toggle('hidden', loading);
    spin.classList.toggle('hidden', !loading);
  }

  // ── Success ───────────────────────────────────
  function showSuccess() {
    document.getElementById('success-msg').classList.remove('hidden');
    document.getElementById('tags-section').classList.add('hidden');
    document.getElementById('preview-container').classList.add('hidden');
    document.getElementById('drop-zone').style.display = 'none';
  }

  function hideSuccess() {
    document.getElementById('success-msg').classList.add('hidden');
    document.getElementById('drop-zone').style.display = '';
  }

  return {
    showScreen, setUser, showToast,
    getFiles, clearFiles, addFiles,
    initChipsCategoria, getSelectedCategories, resetCategories,
    initChipsPersones, getSelectedPersones, resetPersones,
    getTagValues, resetForm,
    showProgress, hideProgress,
    setUploadLoading, showSuccess, hideSuccess,
  };

})();
