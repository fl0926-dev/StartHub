/* auth.js — route guards. Pages call requireAuth()/requireRole()
 * from their init. Redirects to auth.html when not permitted. */
(function () {
  async function requireAuth() {
    const u = await window.API.currentUser();
    if (!u) { location.href = 'auth.html?next=' + encodeURIComponent(location.pathname.split('/').pop()); return null; }
    return u;
  }
  async function requireRole(role) {
    const u = await requireAuth();
    if (u && u.role !== role) { location.href = 'index.html'; return null; }
    return u;
  }
  window.AUTH = { requireAuth, requireRole };
})();
