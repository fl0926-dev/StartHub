/* main.js — boot + router + per-page init.
 * Each page sets <body data-page="..."> and provides the markup hooks
 * the matching init function looks for. */
(function () {
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const t = (k) => window.I18N.t(k);

  const PAGES = {
    index: initIndex,
    auth: initAuth,
    startups: initStartups,
    profile: initProfile,
    apply: initApply,
    account: initAccount,
    chat: initChat,
    admin: initAdmin,
    contact: initContact,
    news: initNews
  };

  document.addEventListener('DOMContentLoaded', async () => {
    await window.I18N.load();
    await window.SCHEMA.load();
    // load news categories (source of truth for news UI)
    window.NEWS_CATS = await fetch('data/news-categories.json').then(r => r.json()).then(d => d.categories).catch(() => []);
    await window.UI.renderHeader();
    window.UI.renderFooter();
    window.I18N.apply();
    const page = document.body.dataset.page;
    await window.API.trackEvent('page_view', page); // activity analytics (awaited so seed completes first)
    if (PAGES[page]) await PAGES[page]();
    // NOTE: language toggle is handled entirely by I18N.toggle() -> I18N.apply(),
    // which re-translates every [data-i18n], [data-i18n-schema], [data-i18n-cat] in
    // the live DOM. We deliberately do NOT re-run page init here (doing so stacked
    // duplicate listeners, re-incremented view counts, and re-created charts on an
    // in-use canvas).
  });

  // ---------------- INDEX ----------------
  function initIndex() { /* static content via data-i18n */ }

  // ---------------- NEWS DASHBOARD (public) ----------------
  async function initNews() {
    const tabs = $('#newsCats');
    const feed = $('#newsFeed');
    const empty = $('#newsEmpty');
    const state = { category: '' };

    // resolve startup names once for linking
    const startups = await window.API.listStartups({});
    const nameById = Object.fromEntries(startups.map(s => [s.id, s.answers.name]));

    // category filter tabs from window.NEWS_CATS (+ All)
    tabs.innerHTML = `<button class="news-tab active" data-cat="" data-i18n="news.all"></button>` +
      (window.NEWS_CATS || []).map(c =>
        `<button class="news-tab" data-cat="${c.key}" data-i18n-cat="${c.key}" style="--cat:${c.color}"></button>`).join('');
    window.I18N.apply(tabs);
    tabs.addEventListener('click', (e) => {
      const btn = e.target.closest('.news-tab'); if (!btn) return;
      $$('.news-tab', tabs).forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.category = btn.dataset.cat;
      render();
    });

    async function render() {
      const items = await window.API.listNews({ category: state.category });
      feed.innerHTML = '';
      empty.style.display = items.length ? 'none' : 'block';
      items.forEach(n => feed.appendChild(window.UI.newsCard(n, nameById[n.startup_id])));
    }
    render();
  }

  // ---------------- AUTH (login + signup) ----------------
  async function initAuth() {
    const u = await window.API.currentUser();
    if (u) { location.href = 'account.html'; return; }
    const mode = { v: 'login' };
    const form = $('#authForm');
    const toggle = $('#authToggle');
    const title = $('#authTitle');
    const msg = $('#authMsg');

    function setI18n(el, key) { el.dataset.i18n = key; el.textContent = t(key); }
    function render() {
      const signup = mode.v === 'signup';
      setI18n(title, signup ? 'auth.signup.title' : 'auth.login.title');
      $('#signupOnly').style.display = signup ? '' : 'none';
      setI18n($('#authSubmit'), signup ? 'auth.submit.signup' : 'auth.submit.login');
      setI18n(toggle, signup ? 'auth.switch.toLogin' : 'auth.switch.toSignup');
    }
    toggle.addEventListener('click', (e) => { e.preventDefault(); mode.v = mode.v === 'login' ? 'signup' : 'login'; render(); });
    render();

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      msg.textContent = '';
      try {
        if (mode.v === 'signup') {
          await window.API.signup({
            name: $('#f_name').value, phone: $('#f_phone').value,
            email: $('#f_email').value, password: $('#f_password').value,
            role: $('input[name="role"]:checked').value
          });
        } else {
          await window.API.login($('#f_email').value, $('#f_password').value);
        }
        const next = new URLSearchParams(location.search).get('next') || 'account.html';
        location.href = next;
      } catch (err) {
        const key = 'auth.err.' + err.message;
        const friendly = t(key);
        msg.textContent = friendly === key ? err.message : friendly;
      }
    });
  }

  // ---------------- STARTUPS LIST ----------------
  async function initStartups() {
    const sidebar = $('#filterSidebar');
    const grid = $('#startupsGrid');
    const empty = $('#noResults');
    const state = { filters: {}, search: '', sort: 'recent' };

    // build filter sidebar from schema (10 filterable categories, incl. Q4-1)
    sidebar.innerHTML = `<h2 data-i18n="list.filter"></h2>` +
      window.SCHEMA.filterable().map(q => `
        <div class="filter-section" data-key="${q.key}">
          <h3 data-i18n-schema-short="${q.key}"></h3>
          <div class="filter-options">
            ${q.options.map(o => `<label class="filter-option"><input type="checkbox" value="${o}"><span>${o}</span></label>`).join('')}
          </div>
        </div>`).join('') +
      `<button class="btn btn-secondary" id="resetFilters" data-i18n="list.filter.reset"></button>`;
    window.I18N.apply(sidebar);

    function collectFilters() {
      state.filters = {};
      $$('.filter-section', sidebar).forEach(sec => {
        const vals = $$('input:checked', sec).map(i => i.value);
        if (vals.length) state.filters[sec.dataset.key] = vals;
      });
    }
    sidebar.addEventListener('change', () => { collectFilters(); refresh(); });
    $('#resetFilters').addEventListener('click', () => {
      $$('input:checked', sidebar).forEach(i => i.checked = false);
      state.filters = {}; refresh();
    });

    $('#searchInput').addEventListener('input', (e) => { state.search = e.target.value; refresh(); });
    $$('.sort-tab').forEach(tab => tab.addEventListener('click', () => {
      $$('.sort-tab').forEach(x => x.classList.remove('active'));
      tab.classList.add('active');
      state.sort = tab.dataset.sort; refresh();
    }));

    async function refresh() {
      const items = await window.API.listStartups(state);
      grid.innerHTML = '';
      empty.style.display = items.length ? 'none' : 'block';
      items.forEach(s => grid.appendChild(window.UI.startupCard(s)));
    }
    refresh();
  }

  // ---------------- STARTUP PROFILE ----------------
  async function initProfile() {
    const id = new URLSearchParams(location.search).get('id');
    if (!id) { location.href = 'startups.html'; return; }
    let s = await window.API.getStartup(id);
    if (!s) { location.href = 'startups.html'; return; }
    await window.API.incrementView(id);
    s = await window.API.getStartup(id); // re-read so the displayed count is accurate

    $('#companyName').textContent = s.answers.name || '';
    $('#profileTags').innerHTML = window.UI.tagChips(s);
    $('#profileMission').textContent = s.answers.mission || '';
    $('#profileViews').textContent = s.views || 0;

    const pic = s.answers.profile_pic && s.answers.profile_pic.url;
    const img = $('#profileImage');
    if (pic) { img.src = pic; img.style.display = ''; }
    else { img.removeAttribute('src'); img.style.display = 'none'; } // avoid broken-image icon; grey wrapper shows

    const ir = s.answers.ir_deck && s.answers.ir_deck.url;
    const irBtn = $('#irDeckLink');
    if (ir) { irBtn.href = ir; irBtn.style.display = ''; }
    else irBtn.style.display = 'none';

    // structured info grid (matches sketch p3)
    const fields = ['industry', 'business_model', 'stage', 'product_status',
      'primary_customer', 'solution_type', 'core_tech', 'funding_status',
      'founding_team', 'team_size', 'open_to'];
    $('#infoGrid').innerHTML = fields.map(k => {
      const v = s.answers[k];
      const text = Array.isArray(v) && v.length ? v.join(', ') : 'N/A';
      return `<div class="info-card"><h4 data-i18n-schema-short="${k}"></h4><p>${text}</p></div>`;
    }).join('');
    window.I18N.apply($('#infoGrid'));

    // this startup's news
    const news = await window.API.newsForStartup(id);
    const newsHost = $('#profileNews');
    if (newsHost) {
      if (news.length) {
        $('#profileNewsList').innerHTML = '';
        news.forEach(n => $('#profileNewsList').appendChild(window.UI.newsCard(n, s.answers.name)));
        newsHost.style.display = '';
      } else newsHost.style.display = 'none';
    }

    // auth-gated actions
    const user = await window.API.currentUser();
    const actions = $('#profileActions');
    if (user && user.id !== s.owner_id) {
      const booked = await window.API.isBookmarked(id);
      const bm = document.createElement('button');
      bm.className = 'btn btn-secondary';
      const setBmLabel = (on) => { bm.dataset.i18n = on ? 'profile.bookmarked' : 'profile.bookmark'; bm.textContent = t(bm.dataset.i18n); };
      setBmLabel(booked);
      bm.addEventListener('click', async () => {
        const now = await window.API.toggleBookmark(id);
        setBmLabel(now);
      });
      const ct = document.createElement('button');
      ct.className = 'btn btn-primary';
      ct.dataset.i18n = 'profile.contact';
      ct.textContent = t('profile.contact');
      ct.addEventListener('click', async () => {
        const cid = await window.API.startConversation(id);
        location.href = 'chat.html?c=' + cid;
      });
      actions.append(bm, ct);
    }
  }

  // ---------------- APPLY (create / edit) ----------------
  async function initApply() {
    const user = await window.AUTH.requireAuth();
    if (!user) return;
    const editId = new URLSearchParams(location.search).get('edit');
    const existing = editId ? await window.API.getStartup(editId) : null;
    const at = $('#applyTitle');
    at.dataset.i18n = existing ? 'apply.title.edit' : 'apply.title.create';
    at.textContent = t(at.dataset.i18n);

    const formHost = $('#applyForm');
    window.SCHEMA.buildForm(formHost, existing ? existing.answers : {});
    // prevent implicit submit (Enter in a field) from reloading the page
    formHost.addEventListener('submit', (e) => e.preventDefault());

    $('#applySubmit').addEventListener('click', async (e) => {
      e.preventDefault();
      const msg = $('#applyMsg');
      const answers = window.SCHEMA.readForm(formHost);
      const errs = window.SCHEMA.validate(answers);
      if (errs.length) { msg.textContent = t('apply.required'); return; }

      // files -> records (base64 now; Flask disk-path later)
      for (const key of ['ir_deck', 'profile_pic']) {
        const input = formHost.querySelector(`input[name="${key}"]`);
        const file = input && input.files[0];
        if (file) answers[key] = await window.API.fileToRecord(file);
        else if (existing) answers[key] = existing.answers[key];
        else answers[key] = { name: '', url: '' };
      }

      const payload = { owner_id: user.id, email: user.email, answers };
      if (existing) await window.API.updateStartup(editId, payload);
      else await window.API.createStartup(payload);
      msg.textContent = t('apply.saved');
      setTimeout(() => location.href = 'account.html', 600);
    });
  }

  // ---------------- ACCOUNT (role-aware dashboard) ----------------
  async function initAccount() {
    const user = await window.AUTH.requireAuth();
    if (!user) return;
    $('#accountName').textContent = user.name + ' · ' + user.role;

    const sectionList = (items) => items.length
      ? items.map(s => `<a class="mini-card" href="profile.html?id=${s.id}">${s.answers.name}</a>`).join('')
      : '<p class="muted">—</p>';

    if (user.role === 'startup') {
      $('#mineSection').style.display = '';
      const mine = await window.API.myStartups();
      $('#mineList').innerHTML = mine.map(s =>
        `<div class="mini-card">
           <a href="profile.html?id=${s.id}">${s.answers.name}</a>
           <span class="muted"><span data-i18n="profile.views"></span>: ${s.views || 0}</span>
           <a class="btn btn-small" href="apply.html?edit=${s.id}" data-i18n="account.edit"></a>
         </div>`).join('') || '<p class="muted">—</p>';
      window.I18N.apply($('#mineList'));
      // view-count trend chart (first owned startup)
      if (mine[0] && window.Chart) {
        const h = mine[0].view_history || [];
        new window.Chart($('#trendChart'), {
          type: 'line',
          data: { labels: h.map(p => p.date), datasets: [{ label: mine[0].answers.name, data: h.map(p => p.count) }] },
          options: { responsive: true }
        });
      }
    }

    $('#bookmarksList').innerHTML = sectionList(await window.API.bookmarks());
    $('#contactingList').innerHTML = sectionList(await window.API.contacting());
    $('#viewedList').innerHTML = sectionList(await window.API.viewedHistory());
  }

  // ---------------- CHAT ----------------
  async function initChat() {
    const user = await window.AUTH.requireAuth();
    if (!user) return;
    let cid = new URLSearchParams(location.search).get('c');

    async function renderConvList() {
      const convs = await window.API.conversations();
      $('#convList').innerHTML = convs.length
        ? convs.map(c => `<a class="conv-item ${c.id === cid ? 'active' : ''}" href="chat.html?c=${c.id}">${c.title || 'Chat'}<br><span class="muted">${c.last ? c.last.text : ''}</span></a>`).join('')
        : `<p class="muted" data-i18n="chat.empty"></p>`;
      window.I18N.apply($('#convList'));
    }
    async function renderThread() {
      if (!cid) { $('#thread').innerHTML = `<p class="muted" data-i18n="chat.empty"></p>`; window.I18N.apply($('#thread')); return; }
      const msgs = await window.API.messages(cid);
      $('#thread').innerHTML = msgs.map(m =>
        `<div class="msg ${m.from === user.id ? 'mine' : 'theirs'}">${m.text}</div>`).join('');
      $('#thread').scrollTop = $('#thread').scrollHeight;
    }
    $('#chatForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = $('#chatInput');
      if (!cid || !input.value.trim()) return;
      await window.API.sendMessage(cid, input.value.trim());
      input.value = '';
      await renderThread(); await renderConvList();
    });
    await renderConvList();
    await renderThread();
  }

  // ---------------- ADMIN ----------------
  async function initAdmin() {
    const user = await window.AUTH.requireRole('admin');
    if (!user) return;

    // representative email (editable per spec)
    const cfg = await window.API.getConfig();
    $('#repEmail').value = cfg.repEmail || '';
    $('#repEmailSave').addEventListener('click', async () => {
      await window.API.setRepEmail($('#repEmail').value);
    });

    // table
    const items = await window.API.listStartups({ sort: 'recent' });
    $('#adminTable').innerHTML =
      `<tr><th>Name</th><th>Industry</th><th>Stage</th><th>Views</th><th>Created</th><th>Email</th></tr>` +
      items.map(s => `<tr>
        <td>${s.answers.name}</td>
        <td>${(s.answers.industry || []).join(', ')}</td>
        <td>${(s.answers.stage || []).join(', ')}</td>
        <td>${s.views || 0}</td>
        <td>${(s.created_at || '').slice(0, 10)}</td>
        <td>${s.email}</td></tr>`).join('');

    $('#exportCsv').addEventListener('click', async () => {
      window.UI.downloadCSV('nanuhm_startups.csv', await window.API.allStartupsCSV());
    });

    // charts
    const stats = await window.API.adminStats();
    if (window.Chart) {
      new window.Chart($('#chartIndustry'), {
        type: 'bar',
        data: { labels: Object.keys(stats.byIndustry), datasets: [{ label: t('admin.chart.industry'), data: Object.values(stats.byIndustry) }] }
      });
      const dates = Object.keys(stats.byDate).sort();
      new window.Chart($('#chartTimeline'), {
        type: 'line',
        data: { labels: dates, datasets: [{ label: t('admin.chart.timeline'), data: dates.map(d => stats.byDate[d]) }] }
      });
      new window.Chart($('#chartViews'), {
        type: 'bar',
        data: { labels: stats.ranking.map(r => r.name), datasets: [{ label: t('admin.chart.views'), data: stats.ranking.map(r => r.views) }] },
        options: { indexAxis: 'y' }
      });
    }

    await initAdminNews();
    await initAdminActivity();
    await initAdminBugs();
    await initAdminTeam();
  }

  // ---- admin: news manager (create/edit/delete) ----
  async function initAdminNews() {
    const startups = await window.API.listStartups({});
    const nameById = Object.fromEntries(startups.map(s => [s.id, s.answers.name]));
    const editing = { id: null };

    // category + startup selects
    $('#newsCategory').innerHTML = (window.NEWS_CATS || [])
      .map(c => `<option value="${c.key}" data-i18n-cat="${c.key}"></option>`).join('');
    $('#newsStartup').innerHTML = `<option value="" data-i18n="admin.news.ecosystem"></option>` +
      startups.map(s => `<option value="${s.id}">${s.answers.name}</option>`).join('');
    window.I18N.apply($('#newsForm'));

    async function renderList() {
      const items = await window.API.listNews({});
      $('#newsAdminList').innerHTML = items.map(n => `
        <tr>
          <td>${n.date}</td>
          <td><span class="news-cat" style="background:${window.UI.catMeta(n.category).color}" data-i18n-cat="${n.category}"></span></td>
          <td>${n.title}</td>
          <td>${n.startup_id ? (nameById[n.startup_id] || '—') : '<span data-i18n="news.ecosystem"></span>'}</td>
          <td>
            <button class="btn btn-small" data-edit="${n.id}" data-i18n="admin.news.edit"></button>
            <button class="btn btn-small" data-del="${n.id}" data-i18n="admin.news.delete"></button>
          </td>
        </tr>`).join('');
      window.I18N.apply($('#newsAdminList'));
    }

    $('#newsForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        title: $('#newsTitle').value.trim(),
        body: $('#newsBody').value.trim(),
        category: $('#newsCategory').value,
        startup_id: $('#newsStartup').value || null,
        date: $('#newsDate').value || undefined
      };
      if (!payload.title) return;
      if (editing.id) { await window.API.updateNews(editing.id, payload); editing.id = null; }
      else await window.API.createNews(payload);
      e.target.reset();
      await renderList();
    });

    $('#newsAdminList').addEventListener('click', async (e) => {
      const ed = e.target.dataset.edit, del = e.target.dataset.del;
      if (del) { await window.API.deleteNews(del); await renderList(); }
      if (ed) {
        const n = (await window.API.listNews({})).find(x => x.id === ed);
        if (!n) return;
        editing.id = ed;
        $('#newsTitle').value = n.title; $('#newsBody').value = n.body;
        $('#newsCategory').value = n.category; $('#newsStartup').value = n.startup_id || '';
        $('#newsDate').value = n.date;
        $('#newsTitle').scrollIntoView({ behavior: 'smooth' });
      }
    });

    await renderList();
  }

  // ---- admin: user activity analytics ----
  async function initAdminActivity() {
    const sum = await window.API.activitySummary();
    $('#activitySummary').innerHTML =
      `<span data-i18n="admin.activity.active"></span>: ${sum.activeUsers} · ` +
      Object.entries(sum.byType).map(([k, v]) => `${k}: ${v}`).join(' · ');
    window.I18N.apply($('#activitySummary'));
    const acts = await window.API.listActivity({ limit: 200 });
    $('#activityTable').innerHTML =
      `<tr><th data-i18n="admin.activity.when"></th><th data-i18n="admin.activity.who"></th><th data-i18n="admin.activity.type"></th><th data-i18n="admin.activity.detail"></th></tr>` +
      acts.map(a => `<tr>
        <td>${a.at.replace('T', ' ').slice(0, 19)}</td>
        <td>${a.who}</td>
        <td>${a.type}</td>
        <td>${a.detail || ''}</td></tr>`).join('');
    window.I18N.apply($('#activityTable'));
  }

  // ---- admin: inquiries + bug reports ----
  async function initAdminBugs() {
    async function render() {
      const items = await window.API.listInquiries();
      $('#bugsTable').innerHTML =
        `<tr><th data-i18n="admin.bugs.kind"></th><th data-i18n="contact.subject"></th><th data-i18n="contact.body"></th><th data-i18n="admin.bugs.status"></th><th></th></tr>` +
        items.map(q => `<tr>
          <td>${q.kind || 'inquiry'}</td>
          <td>${q.subject || ''}</td>
          <td>${q.body || ''}</td>
          <td>${q.status || '-'}</td>
          <td>${q.kind === 'bug' ? `<button class="btn btn-small" data-toggle="${q.id}" data-status="${q.status}">${q.status === 'resolved' ? t('admin.bugs.reopen') : t('admin.bugs.resolve')}</button>` : ''}</td>
        </tr>`).join('');
      window.I18N.apply($('#bugsTable'));
    }
    $('#bugsTable').addEventListener('click', async (e) => {
      const id = e.target.dataset.toggle; if (!id) return;
      const next = e.target.dataset.status === 'resolved' ? 'open' : 'resolved';
      await window.API.setInquiryStatus(id, next);
      await render();
    });
    await render();
  }

  // ---- admin: team access (admin emails) ----
  async function initAdminTeam() {
    const emails = await window.API.getTeamEmails();
    $('#teamEmails').value = emails.join(', ');
    $('#teamSave').addEventListener('click', async () => {
      const list = $('#teamEmails').value.split(',').map(s => s.trim()).filter(Boolean);
      await window.API.setTeamEmails(list);
      $('#teamSave').textContent = '✓';
      setTimeout(() => window.I18N.apply($('#teamSave').parentElement), 1000);
    });
  }

  // ---------------- CONTACT ----------------
  async function initContact() {
    $('#contactForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const kind = ($('input[name="c_kind"]:checked') || {}).value || 'inquiry';
      const payload = { subject: $('#c_subject').value, body: $('#c_body').value };
      if (kind === 'bug') await window.API.reportBug(payload);
      else await window.API.submitInquiry(payload);
      $('#contactForm').reset();
      $('#contactMsg').style.display = 'block';
    });
  }
})();
