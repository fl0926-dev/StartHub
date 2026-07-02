/* All backend access goes through this module — it is the seam that becomes
   a supabase-js adapter after migration. Nothing else may call fetch("/api/..."). */

window.ApiError = class ApiError extends Error {
  constructor(status, code, message, payload) {
    super(message || code);
    this.status = status;
    this.code = code;
    this.payload = payload || {};
  }
};

window.API = (function () {
  async function request(method, path, body) {
    const options = {
      method,
      credentials: "same-origin",
      headers: {},
    };
    if (body !== undefined) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }
    let res;
    try {
      res = await fetch(path, options);
    } catch (err) {
      throw new ApiError(0, "NETWORK", "Network error", {});
    }
    let json = null;
    try {
      json = await res.json();
    } catch (err) {
      /* non-JSON response */
    }
    if (!res.ok || !json || json.ok === false) {
      const e = (json && json.error) || {};
      throw new ApiError(res.status, e.code || "UNKNOWN", e.message, e);
    }
    return json.data;
  }

  const qs = (params) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params || {})) {
      if (value === undefined || value === null || value === "") continue;
      if (Array.isArray(value)) value.forEach((v) => search.append(key, v));
      else search.append(key, value);
    }
    const s = search.toString();
    return s ? `?${s}` : "";
  };

  return {
    request,
    // auth
    signup: (data) => request("POST", "/api/auth/signup", data),
    login: (data) => request("POST", "/api/auth/login", data),
    logout: () => request("POST", "/api/auth/logout", {}),
    me: () => request("GET", "/api/auth/me"),
    // meta
    getMeta: () => request("GET", "/api/meta"),
    // profiles
    getProfiles: (params) => request("GET", `/api/profiles${qs(params)}`),
    getProfile: (id) => request("GET", `/api/profiles/${encodeURIComponent(id)}`),
    getMyProfile: () => request("GET", "/api/profiles/me"),
    createProfile: (data) => request("POST", "/api/profiles", data),
    updateProfile: (id, data) => request("PUT", `/api/profiles/${encodeURIComponent(id)}`, data),
    // community
    getThreads: (params) => request("GET", `/api/threads${qs(params)}`),
    getThread: (id) => request("GET", `/api/threads/${encodeURIComponent(id)}`),
    createThread: (data) => request("POST", "/api/threads", data),
    createReply: (threadId, data) =>
      request("POST", `/api/threads/${encodeURIComponent(threadId)}/replies`, data),
    voteThread: (id) => request("POST", `/api/threads/${encodeURIComponent(id)}/vote`, {}),
    voteReply: (id) => request("POST", `/api/replies/${encodeURIComponent(id)}/vote`, {}),
    // tokens & products
    getBalance: () => request("GET", "/api/tokens/balance"),
    getLedger: () => request("GET", "/api/tokens/ledger"),
    getProducts: () => request("GET", "/api/products"),
    mockPurchase: (productId) =>
      request("POST", "/api/purchase/mock", { product_id: productId }),
    // articles
    getArticles: (params) => request("GET", `/api/articles${qs(params)}`),
    getArticle: (id) => request("GET", `/api/articles/${encodeURIComponent(id)}`),
    // mentoring
    getMentorships: () => request("GET", "/api/mentorships"),
    advanceMentorship: (id) =>
      request("POST", `/api/mentorships/${encodeURIComponent(id)}/advance`, {}),
  };
})();
