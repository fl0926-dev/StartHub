/* ============================================================
 * api.js — THE DATA SEAM
 * ------------------------------------------------------------
 * This is the ONLY file that knows where data lives.
 * Today: browser localStorage, seeded once from /data/*.json.
 * Later: replace each function body with `fetch('/api/...')`
 *        calls to the Flask backend (then Supabase/Vercel).
 *        Nothing else in the app needs to change.
 *
 * Every function is async so the Flask swap is drop-in.
 *
 * >>> FILE UPLOADS (the one behavior that changes server-side):
 * Browsers cannot read a real local filesystem path. For the MVP
 * we store { name, url } where url is a data: URL (base64) kept in
 * localStorage. The spec's "local path" is fulfilled server-side:
 * Flask will save the uploaded file to disk and store its path in
 * the `Path` CSV column instead. See fileToRecord() below.
 * ============================================================ */

(function () {
  const KEYS = {
    users: 'nanuhm_users',
    startups: 'nanuhm_startups',
    session: 'nanuhm_session',
    relations: 'nanuhm_relations', // { [userId]: { bookmarks:[], viewed:[], contacting:[] } }
    messages: 'nanuhm_messages',   // { [convId]: [ {from, text, at} ] }
    inquiries: 'nanuhm_inquiries',
    news: 'nanuhm_news',           // [ {id,title,body,category,startup_id,date,created_at} ]
    activity: 'nanuhm_activity',   // [ {id,user_id,type,detail,at} ] — analytics log
    config: 'nanuhm_config',       // { repEmail, teamEmails:[] }
    seeded: 'nanuhm_seeded'
  };

  // ---- low-level storage helpers (swap these for fetch later) ----
  const read = (k, fallback) => {
    try { return JSON.parse(localStorage.getItem(k)) ?? fallback; }
    catch { return fallback; }
  };
  const write = (k, v) => localStorage.setItem(k, JSON.stringify(v));
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);

  // ---- one-time seed from /data/*.json ----
  // Singleton guard: concurrent first-load callers share one seed (no double-seed race).
  let seedingPromise = null;
  async function ensureSeeded() {
    if (read(KEYS.seeded, false)) return;
    if (seedingPromise) return seedingPromise;
    seedingPromise = (async () => {
      const [users, startups, news] = await Promise.all([
        fetch('data/seed-users.json').then(r => r.json()).catch(() => []),
        fetch('data/seed-startups.json').then(r => r.json()).catch(() => []),
        fetch('data/seed-news.json').then(r => r.json()).catch(() => [])
      ]);
      if (read(KEYS.seeded, false)) return; // another caller won the race
      write(KEYS.users, users);
      write(KEYS.startups, startups);
      write(KEYS.news, news);
      write(KEYS.relations, {});
      write(KEYS.messages, {});
      write(KEYS.inquiries, []);
      write(KEYS.activity, []);
      // teamEmails: anyone signing up/in with these emails is auto-granted admin
      write(KEYS.config, { repEmail: 'qwer@gmail.com', teamEmails: ['qwer@gmail.com'] });
      write(KEYS.seeded, true);
    })();
    return seedingPromise;
  }

  // Activity analytics log (NOT screen capture) — key user events, timestamped.
  function logActivity(user_id, type, detail) {
    const list = read(KEYS.activity, []);
    list.push({ id: uid('a'), user_id: user_id || null, type, detail: detail || '', at: new Date().toISOString() });
    write(KEYS.activity, list);
  }
  // Grant admin role if a user's email is on the team list.
  function applyTeamRole(user) {
    const cfg = read(KEYS.config, {});
    const team = (cfg.teamEmails || []).map(e => e.toLowerCase());
    if (user.role !== 'admin' && team.includes((user.email || '').toLowerCase())) {
      user.role = 'admin';
      const users = read(KEYS.users, []);
      const i = users.findIndex(u => u.id === user.id);
      if (i >= 0) { users[i].role = 'admin'; write(KEYS.users, users); }
    }
    return user;
  }

  function relFor(userId) {
    const all = read(KEYS.relations, {});
    if (!all[userId]) all[userId] = { bookmarks: [], viewed: [], contacting: [] };
    return { all, rel: all[userId] };
  }

  // ---------- AUTH ----------
  async function signup(user) {
    await ensureSeeded();
    const users = read(KEYS.users, []);
    if (users.some(u => u.email === user.email)) throw new Error('EMAIL_TAKEN');
    const rec = { id: uid('u'), role: 'investor', ...user };
    users.push(rec);
    write(KEYS.users, users);
    applyTeamRole(rec);          // team email => admin
    write(KEYS.session, rec.id);
    logActivity(rec.id, 'signup', rec.role);
    return rec;
  }
  async function login(email, password) {
    await ensureSeeded();
    const u = read(KEYS.users, []).find(x => x.email === email && x.password === password);
    if (!u) throw new Error('BAD_CREDENTIALS');
    applyTeamRole(u);            // team email => admin
    write(KEYS.session, u.id);
    logActivity(u.id, 'login', '');
    return u;
  }
  async function logout() { localStorage.removeItem(KEYS.session); }
  async function currentUser() {
    await ensureSeeded();
    const id = read(KEYS.session, null);
    return id ? read(KEYS.users, []).find(u => u.id === id) || null : null;
  }

  // ---------- STARTUPS ----------
  async function listStartups({ filters = {}, search = '', sort = 'recent' } = {}) {
    await ensureSeeded();
    let items = read(KEYS.startups, []);

    // search by name (contains, case-insensitive)
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter(s => (s.answers.name || '').toLowerCase().includes(q));
    }

    // filters: { key: [selectedOptions] } — AND across categories, OR within a category
    items = items.filter(s =>
      Object.entries(filters).every(([key, vals]) => {
        if (!vals || !vals.length) return true;
        const ans = s.answers[key] || [];
        return vals.some(v => ans.includes(v));
      })
    );

    if (sort === 'views') items.sort((a, b) => (b.views || 0) - (a.views || 0));
    else items.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return items;
  }
  async function getStartup(id) {
    await ensureSeeded();
    return read(KEYS.startups, []).find(s => s.id === id) || null;
  }
  async function createStartup(record) {
    await ensureSeeded();
    const items = read(KEYS.startups, []);
    const now = new Date().toISOString();
    const rec = {
      id: uid('s'),
      owner_id: record.owner_id,
      email: record.email,
      created_at: now,
      views: 0,
      view_history: [],
      answers: record.answers
    };
    items.push(rec);
    write(KEYS.startups, items);
    logActivity(record.owner_id, 'startup_create', rec.answers.name || rec.id);
    return rec;
  }
  async function updateStartup(id, record) {
    await ensureSeeded();
    const items = read(KEYS.startups, []);
    const i = items.findIndex(s => s.id === id);
    if (i < 0) throw new Error('NOT_FOUND');
    items[i] = { ...items[i], answers: record.answers, email: record.email ?? items[i].email };
    write(KEYS.startups, items);
    return items[i];
  }
  async function incrementView(id) {
    const items = read(KEYS.startups, []);
    const s = items.find(x => x.id === id);
    if (!s) return;
    s.views = (s.views || 0) + 1;
    const today = new Date().toISOString().slice(0, 10);
    const h = (s.view_history = s.view_history || []);
    const last = h[h.length - 1];
    if (last && last.date === today) last.count = s.views;
    else h.push({ date: today, count: s.views });
    write(KEYS.startups, items);
    // also record into viewer's history
    const user = await currentUser();
    if (user) {
      const { all, rel } = relFor(user.id);
      if (!rel.viewed.includes(id)) rel.viewed.unshift(id);
      write(KEYS.relations, all);
    }
    logActivity(user ? user.id : null, 'profile_view', (s.answers && s.answers.name) || id);
  }

  // ---------- USER RELATIONS ----------
  async function bookmarks() {
    const u = await currentUser(); if (!u) return [];
    const ids = relFor(u.id).rel.bookmarks;
    return read(KEYS.startups, []).filter(s => ids.includes(s.id));
  }
  async function toggleBookmark(id) {
    const u = await currentUser(); if (!u) throw new Error('NOT_LOGGED_IN');
    const { all, rel } = relFor(u.id);
    const i = rel.bookmarks.indexOf(id);
    if (i >= 0) rel.bookmarks.splice(i, 1); else rel.bookmarks.push(id);
    write(KEYS.relations, all);
    return i < 0; // true => now bookmarked
  }
  async function isBookmarked(id) {
    const u = await currentUser(); if (!u) return false;
    return relFor(u.id).rel.bookmarks.includes(id);
  }
  async function myStartups() {
    const u = await currentUser(); if (!u) return [];
    return read(KEYS.startups, []).filter(s => s.owner_id === u.id);
  }
  async function contacting() {
    const u = await currentUser(); if (!u) return [];
    const ids = relFor(u.id).rel.contacting;
    return read(KEYS.startups, []).filter(s => ids.includes(s.id));
  }
  async function viewedHistory() {
    const u = await currentUser(); if (!u) return [];
    const ids = relFor(u.id).rel.viewed;
    return read(KEYS.startups, []).filter(s => ids.includes(s.id));
  }
  async function viewTrends(id) {
    const s = await getStartup(id);
    return s ? s.view_history || [] : [];
  }

  // ---------- CHAT ----------
  // convId is deterministic for an (investor, startup-owner) pair.
  // '~' separator keeps user ids (which contain '_') parseable.
  function convId(a, b) { return 'c_' + [a, b].sort().join('~'); }
  async function startConversation(startupId) {
    const u = await currentUser(); if (!u) throw new Error('NOT_LOGGED_IN');
    const s = await getStartup(startupId);
    if (!s) throw new Error('NOT_FOUND');
    const { all, rel } = relFor(u.id);
    if (!rel.contacting.includes(startupId)) rel.contacting.push(startupId);
    write(KEYS.relations, all);
    return convId(u.id, s.owner_id);
  }
  async function conversations() {
    const u = await currentUser(); if (!u) return [];
    const msgs = read(KEYS.messages, {});
    const users = read(KEYS.users, []);
    const nameOf = id => { const x = users.find(z => z.id === id); return x ? x.name : 'Chat'; };
    return Object.keys(msgs)
      .filter(cid => cid.includes(u.id))
      .map(cid => {
        const parts = cid.slice(2).split('~');
        const other = parts.find(p => p !== u.id) || parts[0];
        return { id: cid, last: msgs[cid][msgs[cid].length - 1], title: nameOf(other) };
      });
  }
  async function messages(cid) { return read(KEYS.messages, {})[cid] || []; }
  async function sendMessage(cid, text) {
    const u = await currentUser(); if (!u) throw new Error('NOT_LOGGED_IN');
    const msgs = read(KEYS.messages, {});
    (msgs[cid] = msgs[cid] || []).push({ from: u.id, text, at: new Date().toISOString() });
    write(KEYS.messages, msgs);
    return msgs[cid];
  }

  // ---------- CONTACT ----------
  async function submitInquiry({ subject, body }) {
    await ensureSeeded();
    const u = await currentUser();
    const list = read(KEYS.inquiries, []);
    list.push({ id: uid('q'), subject, body, by: u ? u.id : null, at: new Date().toISOString(), kind: 'inquiry' });
    write(KEYS.inquiries, list);
    return true;
  }
  // Bug report — same inbox, flagged kind:'bug'. Shown/triaged in admin.
  async function reportBug({ subject, body }) {
    await ensureSeeded();
    const u = await currentUser();
    const list = read(KEYS.inquiries, []);
    list.push({ id: uid('q'), subject, body, by: u ? u.id : null, at: new Date().toISOString(), kind: 'bug', status: 'open' });
    write(KEYS.inquiries, list);
    return true;
  }
  async function listInquiries() { await ensureSeeded(); return read(KEYS.inquiries, []).slice().reverse(); }
  async function setInquiryStatus(id, status) {
    const list = read(KEYS.inquiries, []);
    const q = list.find(x => x.id === id); if (q) { q.status = status; write(KEYS.inquiries, list); }
    return q;
  }

  // ---------- NEWS ----------
  async function listNews({ category = '', startupId = '' } = {}) {
    await ensureSeeded();
    let items = read(KEYS.news, []);
    if (category) items = items.filter(n => n.category === category);
    if (startupId) items = items.filter(n => n.startup_id === startupId);
    return items.sort((a, b) => new Date(b.date) - new Date(a.date));
  }
  async function newsForStartup(startupId) { return listNews({ startupId }); }
  async function createNews(item) {
    await ensureSeeded();
    const list = read(KEYS.news, []);
    const rec = {
      id: uid('n'),
      title: item.title, body: item.body, category: item.category,
      startup_id: item.startup_id || null,
      date: item.date || new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString()
    };
    list.push(rec);
    write(KEYS.news, list);
    const u = await currentUser();
    logActivity(u ? u.id : null, 'news_create', rec.title);
    return rec;
  }
  async function updateNews(id, item) {
    const list = read(KEYS.news, []);
    const i = list.findIndex(n => n.id === id);
    if (i < 0) throw new Error('NOT_FOUND');
    list[i] = { ...list[i], ...item, startup_id: item.startup_id || null };
    write(KEYS.news, list);
    return list[i];
  }
  async function deleteNews(id) {
    write(KEYS.news, read(KEYS.news, []).filter(n => n.id !== id));
    return true;
  }

  // ---------- ACTIVITY (admin analytics) ----------
  // Public hook for page views / searches called from main.js.
  async function trackEvent(type, detail) {
    await ensureSeeded();
    const u = await currentUser();
    logActivity(u ? u.id : null, type, detail);
  }
  async function listActivity({ limit = 200 } = {}) {
    await ensureSeeded();
    const users = read(KEYS.users, []);
    const byId = Object.fromEntries(users.map(u => [u.id, u]));
    return read(KEYS.activity, []).slice(-limit).reverse().map(a => ({
      ...a,
      who: a.user_id && byId[a.user_id] ? (byId[a.user_id].name + ' (' + byId[a.user_id].role + ')') : 'anonymous'
    }));
  }
  async function activitySummary() {
    await ensureSeeded();
    const acts = read(KEYS.activity, []);
    const byType = {};
    acts.forEach(a => { byType[a.type] = (byType[a.type] || 0) + 1; });
    const activeUsers = new Set(acts.filter(a => a.user_id).map(a => a.user_id)).size;
    return { byType, total: acts.length, activeUsers };
  }

  // ---------- TEAM ACCESS ----------
  async function getTeamEmails() { await ensureSeeded(); return read(KEYS.config, {}).teamEmails || []; }
  async function setTeamEmails(emails) {
    const cfg = read(KEYS.config, {});
    cfg.teamEmails = emails;
    write(KEYS.config, cfg);
    // re-apply to existing users so already-registered teammates get admin
    read(KEYS.users, []).forEach(u => applyTeamRole(u));
    return cfg.teamEmails;
  }

  // ---------- ADMIN ----------
  async function adminStats() {
    await ensureSeeded();
    const items = read(KEYS.startups, []);
    const byIndustry = {};
    const byDate = {};
    items.forEach(s => {
      (s.answers.industry || []).forEach(i => { byIndustry[i] = (byIndustry[i] || 0) + 1; });
      const d = (s.created_at || '').slice(0, 10);
      if (d) byDate[d] = (byDate[d] || 0) + 1;
    });
    const ranking = [...items].sort((a, b) => (b.views || 0) - (a.views || 0))
      .map(s => ({ name: s.answers.name, views: s.views || 0 }));
    return { byIndustry, byDate, ranking, total: items.length };
  }
  async function getConfig() { await ensureSeeded(); return read(KEYS.config, {}); }
  async function setRepEmail(email) {
    const c = read(KEYS.config, {}); c.repEmail = email; write(KEYS.config, c); return c;
  }

  // ---- CSV export (spec columns: 시간, all form answers, user id, Email, Path) ----
  async function allStartupsCSV() {
    await ensureSeeded();
    const schema = await fetch('data/form-schema.json').then(r => r.json());
    const qs = schema.questions.filter(q => q.type !== 'file');
    const fileQs = schema.questions.filter(q => q.type === 'file');
    const header = ['Timestamp', ...qs.map(q => q.csv), 'User ID', 'Email', 'Path'];
    const rows = read(KEYS.startups, []).map(s => {
      const ans = qs.map(q => {
        const v = s.answers[q.key];
        return Array.isArray(v) ? v.join('; ') : (v || '');
      });
      const path = fileQs.map(q => (s.answers[q.key] && s.answers[q.key].name) || '').filter(Boolean).join(' | ');
      return [s.created_at, ...ans, s.owner_id, s.email, path];
    });
    const esc = c => `"${String(c).replace(/"/g, '""')}"`;
    return [header, ...rows].map(r => r.map(esc).join(',')).join('\n');
  }

  // ---- file -> storable record (MVP: base64 data URL; Flask: disk path) ----
  function fileToRecord(file) {
    return new Promise((resolve) => {
      if (!file) return resolve({ name: '', url: '' });
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, url: reader.result });
      reader.readAsDataURL(file);
    });
  }

  window.API = {
    signup, login, logout, currentUser,
    listStartups, getStartup, createStartup, updateStartup, incrementView,
    bookmarks, toggleBookmark, isBookmarked, myStartups, contacting, viewedHistory, viewTrends,
    startConversation, conversations, messages, sendMessage, convId,
    submitInquiry, reportBug, listInquiries, setInquiryStatus,
    listNews, newsForStartup, createNews, updateNews, deleteNews,
    trackEvent, listActivity, activitySummary,
    getTeamEmails, setTeamEmails,
    adminStats, getConfig, setRepEmail, allStartupsCSV,
    fileToRecord
  };
})();
