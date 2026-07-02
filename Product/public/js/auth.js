/* Session state shared across pages. Header listens for the events below. */

window.Auth = (function () {
  let sessionPromise = null;

  function getSession(force) {
    if (!sessionPromise || force) {
      sessionPromise = API.me().then((data) => data.user).catch(() => null);
    }
    return sessionPromise;
  }

  async function requireAuth() {
    const user = await getSession();
    if (!user) {
      const next = encodeURIComponent(
        location.pathname.replace(/^\//, "") + location.search
      );
      location.href = `login.html?next=${next}`;
      throw new Error("redirecting to login");
    }
    return user;
  }

  async function requireRole(role) {
    const user = await requireAuth();
    if (user.role !== role) {
      location.href = "index.html";
      throw new Error("wrong role");
    }
    return user;
  }

  function setBalance(balance) {
    window.dispatchEvent(
      new CustomEvent("balancechange", { detail: { balance } })
    );
  }

  async function refreshBalance() {
    try {
      const { balance } = await API.getBalance();
      setBalance(balance);
    } catch (err) {
      /* logged out: ignore */
    }
  }

  async function logout() {
    await API.logout();
    location.href = "index.html";
  }

  return { getSession, requireAuth, requireRole, setBalance, refreshBalance, logout };
})();
