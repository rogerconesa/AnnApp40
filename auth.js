// ============================================
// ANNAPP40 — AUTH
// Google OAuth 2.0 amb GIS (Google Identity Services)
// ============================================

const Auth = (() => {

  let _tokenClient      = null;
  let _accessToken      = null;
  let _userProfile      = null;
  let _onLoginCallback  = null;
  let _onLogoutCallback = null;

  // ── Init ────────────────────────────────────
  function init(onLogin, onLogout) {
    _onLoginCallback  = onLogin;
    _onLogoutCallback = onLogout;

    // Esperar que GIS estigui carregat
    if (typeof google === 'undefined' || !google.accounts) {
      setTimeout(() => init(onLogin, onLogout), 200);
      return;
    }

    _tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: CONFIG.CLIENT_ID,
      scope:     CONFIG.SCOPES,
      callback:  _handleTokenResponse,
    });

    // Recuperar sessió guardada
    const saved = sessionStorage.getItem('annapp40_token');
    if (saved) {
      _accessToken = saved;
      _loadUserProfile();
    }
  }

  // ── Login ────────────────────────────────────
  function login() {
    // Sense prompt:'consent' per evitar demanar permisos cada vegada
    _tokenClient.requestAccessToken({});
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
    console.log('Token response:', resp);

    if (resp.error) {
      console.error('Auth error:', resp.error);
      alert('Error d\'autenticació: ' + resp.error);
      return;
    }

    if (!resp.access_token) {
      console.error('No access_token rebut');
      return;
    }

    _accessToken = resp.access_token;
    sessionStorage.setItem('annapp40_token', _accessToken);
    _loadUserProfile();
  }

  // ── Carregar perfil d'usuari ──────────────────
  async function _loadUserProfile() {
    console.log('Carregant perfil amb token:', _accessToken ? _accessToken.substring(0,20) + '...' : 'NULL');

    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { 'Authorization': 'Bearer ' + _accessToken }
      });

      console.log('Userinfo status:', res.status);

      if (!res.ok) {
        console.error('Token invàlid o caducat, status:', res.status);
        _accessToken = null;
        sessionStorage.removeItem('annapp40_token');
        return;
      }

      _userProfile = await res.json();
      console.log('Perfil carregat:', _userProfile.name);

      if (_onLoginCallback) _onLoginCallback(_userProfile);

    } catch (err) {
      console.error('Error carregant perfil:', err);
    }
  }

  // ── Getters ───────────────────────────────────
  function getToken()   { return _accessToken; }
  function getProfile() { return _userProfile; }
  function isLoggedIn() { return !!_accessToken; }

  return { init, login, logout, getToken, getProfile, isLoggedIn };

})();
