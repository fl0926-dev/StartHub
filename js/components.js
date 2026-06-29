/* components.js — shared DOM pieces. Pure structure + semantic
 * classes + data-component hooks so the UI team can reskin freely. */
(function () {
  const t = (k) => window.I18N.t(k);

  /* Header injected into <header data-component="site-header">.
   * Nav links adapt to auth state + role. */
  async function renderHeader() {
    const host = document.querySelector('[data-component="site-header"]');
    if (!host) return;
    const user = await window.API.currentUser();
    const links = [
      `<a class="nav-link" href="startups.html" data-i18n="nav.startups"></a>`,
      `<a class="nav-link" href="news.html" data-i18n="nav.news"></a>`,
      `<a class="nav-link" href="apply.html" data-i18n="nav.apply"></a>`,
      `<a class="nav-link" href="contact.html" data-i18n="nav.contact"></a>`
    ];
    if (user) {
      links.push(`<a class="nav-link" href="account.html" data-i18n="nav.account"></a>`);
      if (user.role === 'admin') links.push(`<a class="nav-link" href="admin.html" data-i18n="nav.admin"></a>`);
      links.push(`<a class="nav-link" href="#" id="logoutLink" data-i18n="nav.logout"></a>`);
    } else {
      links.push(`<a class="nav-link" href="auth.html" data-i18n="nav.login"></a>`);
    }
    host.innerHTML = `
      <div class="container nav-wrapper">
        <a class="brand" href="index.html" data-i18n="brand"></a>
        <nav class="nav">
          ${links.join('')}
          <button class="lang-btn" id="langToggle" data-i18n="lang.toggle"></button>
        </nav>
      </div>`;
    host.querySelector('#langToggle').addEventListener('click', () => window.I18N.toggle());
    const lo = host.querySelector('#logoutLink');
    if (lo) lo.addEventListener('click', async (e) => {
      e.preventDefault(); await window.API.logout(); location.href = 'index.html';
    });
    window.I18N.apply(host);
  }

  function renderFooter() {
    const host = document.querySelector('[data-component="site-footer"]');
    if (!host) return;
    host.innerHTML = `<div class="container"><p data-i18n="footer.copyright"></p></div>`;
    window.I18N.apply(host);
  }

  /* Tag chips from a startup's filterable answers. */
  function tagChips(startup) {
    const tags = [];
    window.SCHEMA.filterable().forEach(q => {
      (startup.answers[q.key] || []).forEach(v => tags.push(v));
    });
    return tags.map(v => `<span class="tag" data-component="tag">${v}</span>`).join('');
  }

  /* Startup card for the list grid. */
  function startupCard(s) {
    const pic = s.answers.profile_pic && s.answers.profile_pic.url;
    const top3 = [
      ...(s.answers.industry || []),
      ...(s.answers.business_model || []),
      ...(s.answers.stage || [])
    ].slice(0, 3);
    const card = document.createElement('div');
    card.className = 'startup-card';
    card.dataset.component = 'startup-card';
    card.innerHTML = `
      <div class="startup-thumb">${pic ? `<img src="${pic}" alt="">` : ''}</div>
      <h3 class="startup-name">${s.answers.name || ''}</h3>
      <div class="startup-tags">${top3.map(v => `<span class="tag">${v}</span>`).join('')}</div>
      <a class="btn btn-primary" href="profile.html?id=${s.id}" data-i18n="card.view"></a>`;
    window.I18N.apply(card);
    return card;
  }

  /* News category helpers — fed by data/news-categories.json (window.NEWS_CATS). */
  function catMeta(key) {
    const c = (window.NEWS_CATS || []).find(x => x.key === key);
    return c || { key, label_ko: key, label_en: key, color: 'var(--color-muted)' };
  }
  function catLabel(key) { const c = catMeta(key); return c['label_' + window.I18N.getLang()] || c.label_en; }

  /* News card. startupName optional (resolved by caller). */
  function newsCard(n, startupName) {
    const c = catMeta(n.category);
    const el = document.createElement('article');
    el.className = 'news-card';
    el.dataset.component = 'news-card';
    const link = n.startup_id
      ? `<a class="news-startup" href="profile.html?id=${n.startup_id}">${startupName || ''}</a>`
      : `<span class="news-startup muted" data-i18n="news.ecosystem"></span>`;
    el.innerHTML = `
      <div class="news-top">
        <span class="news-cat" style="background:${c.color}" data-i18n-cat="${n.category}"></span>
        <span class="muted">${n.date || ''}</span>
      </div>
      <h3 class="news-headline">${n.title || ''}</h3>
      <p class="news-body">${n.body || ''}</p>
      <div class="news-foot">${link}</div>`;
    window.I18N.apply(el);
    return el;
  }

  /* Tiny CSV download helper used by admin. */
  function downloadCSV(filename, csv) {
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  window.UI = { renderHeader, renderFooter, tagChips, startupCard, catMeta, catLabel, newsCard, downloadCSV };
})();
