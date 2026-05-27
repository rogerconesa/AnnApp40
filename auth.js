// ============================================
// ANNAPP40 — AUTH
// Google OAuth 2.0 amb GIS (Google Identity Services)
// ============================================

const Auth = (() => {

  let _tokenClient = null;
  let _accessToken  = null;
  let _userProfile  = null;
  let _onLoginCallback  = null;
  let _onLogoutCallback = null;

  // ── Init ────────────────────────────────────
  function init(onLogin, onLogout) {
    _onLoginCallback  = onLogin;
    _onLogoutCallback = onLogout;

    // Inicialitzar GIS token client
    _tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope:     CONFIG.SCOPES,
      callback:  _handleTokenResponse,
    });

    // Intentar recuperar sessió guardada
    const saved = sessionStorage.getItem('annapp40_token');
    if (saved) {
      _accessToken = saved;
      _loadUserProfile();
    }
  }

  // ── Login ────────────────────────────────────
  function login() {
    _tokenClient.requestAccessToken({ prompt: 'consent' });
  }

  // ── Logout ───────────────────────────────────
  function logout() {
    if (_accessToken) {
      google.accounts.oauth2.revoke(_accessToken, () => {});
    }
    _accessToken  = null;
    _userProfile  = null;
    sessionStorage.removeItem('annapp40_token');
    if (_onLogoutCallback) _onLogoutCallback();
  }

  // ── Token response ────────────────────────────
  function _handleTokenResponse(resp) {
    if (resp.error) {
      UI.showToast('Error d\'autenticació: ' + resp.error, 'error');
      return;
    }
    _accessToken = resp.access_token;
    sessionStorage.setItem('annapp40_token', _accessToken);
    _loadUserProfile();
  }

  // ── Carregar perfil d'usuari ──────────────────
  async function _loadUserProfile() {
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: 'Bearer ' + _accessToken }
      });

      if (!res.ok) {
        // Token caducat
        _accessToken = null;
        sessionStorage.removeItem('annapp40_token');
        return;
      }

      _userProfile = await res.json();
      if (_onLoginCallback) _onLoginCallback(_userProfile);

    } catch (err) {
      console.error('Error carregant perfil:', err);
      UI.showToast('Error de connexió', 'error');
    }
  }

  // ── Getters ───────────────────────────────────
  function getToken()   { return _accessToken; }
  function getProfile() { return _userProfile; }
  function isLoggedIn() { return !!_accessToken; }

  return { init, login, logout, getToken, getProfile, isLoggedIn };

})();
