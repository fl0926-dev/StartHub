/* i18n.js — ko/en strings + 한/eng toggle.
 * Mark text in HTML with data-i18n="key" (textContent) or
 * data-i18n-ph="key" (placeholder). Language choice persists. */
(function () {
  let dict = {};
  let lang = localStorage.getItem('nanuhm_lang') || 'ko';

  async function load() {
    dict = await fetch('data/i18n.json').then(r => r.json());
  }
  function t(key) { return (dict[lang] && dict[lang][key]) || key; }
  function apply(root = document) {
    root.querySelectorAll('[data-i18n]').forEach(el => {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    root.querySelectorAll('[data-i18n-ph]').forEach(el => {
      el.placeholder = t(el.getAttribute('data-i18n-ph'));
    });
    // schema question labels (form-schema.json) — re-translate on toggle
    if (window.SCHEMA) root.querySelectorAll('[data-i18n-schema]').forEach(el => {
      const q = window.SCHEMA.get(el.getAttribute('data-i18n-schema'));
      if (q) el.textContent = label(q);               // full question (apply form)
    });
    if (window.SCHEMA) root.querySelectorAll('[data-i18n-schema-short]').forEach(el => {
      const q = window.SCHEMA.get(el.getAttribute('data-i18n-schema-short'));
      if (q) el.textContent = shortLabel(q);          // compact field name (sidebar / profile)
    });
    // news category labels (news-categories.json)
    if (window.UI && window.UI.catLabel) root.querySelectorAll('[data-i18n-cat]').forEach(el => {
      el.textContent = window.UI.catLabel(el.getAttribute('data-i18n-cat'));
    });
    document.documentElement.lang = lang;
  }
  function getLang() { return lang; }
  function toggle() {
    lang = lang === 'ko' ? 'en' : 'ko';
    localStorage.setItem('nanuhm_lang', lang);
    apply();
    document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
  }
  // schema labels are keyed label_ko / label_en (full question)
  function label(obj) { return obj['label_' + lang] || obj.label_en || obj.label_ko; }
  // compact field name; falls back to full label if no short_* present
  function shortLabel(obj) { return obj['short_' + lang] || obj['label_' + lang] || obj.label_en; }

  window.I18N = { load, t, apply, toggle, getLang, label, shortLabel };
})();
