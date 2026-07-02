/* Client-side i18n. No server involvement: dictionaries are static JSON.
   Usage: await I18N.ready; I18N.t("nav.dashboard");
   Markup: <span data-i18n="nav.dashboard"></span>,
           <input data-i18n-placeholder="common.search_placeholder">,
           <button data-i18n-title="thread.vote"> */

window.I18N = (function () {
  const STORAGE_KEY = "starthub.lang";
  const SUPPORTED = ["ko", "en"];
  let lang = localStorage.getItem(STORAGE_KEY);
  if (!SUPPORTED.includes(lang)) lang = "ko";
  let dict = {};

  async function load(next) {
    const res = await fetch(`/i18n/${next}.json`);
    dict = await res.json();
    lang = next;
    document.documentElement.lang = next;
    localStorage.setItem(STORAGE_KEY, next);
  }

  function t(key, vars) {
    let text = dict[key];
    if (text === undefined) return key;
    if (vars) {
      for (const [name, value] of Object.entries(vars)) {
        text = text.replaceAll(`{${name}}`, String(value));
      }
    }
    return text;
  }

  function apply(root) {
    const scope = root || document;
    scope.querySelectorAll("[data-i18n]").forEach((node) => {
      node.textContent = t(node.dataset.i18n);
    });
    scope.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
      node.placeholder = t(node.dataset.i18nPlaceholder);
    });
    scope.querySelectorAll("[data-i18n-title]").forEach((node) => {
      node.title = t(node.dataset.i18nTitle);
    });
  }

  async function setLang(next) {
    if (!SUPPORTED.includes(next) || next === lang) return;
    await load(next);
    apply();
    window.dispatchEvent(new CustomEvent("langchange", { detail: { lang: next } }));
  }

  function getLang() {
    return lang;
  }

  /* For bilingual data records: pickLang(article, "title") -> title_ko | title_en */
  function pickLang(obj, base) {
    return obj[`${base}_${lang}`] ?? obj[`${base}_ko`] ?? "";
  }

  const ready = load(lang).then(() => {
    if (document.readyState === "loading") {
      return new Promise((resolve) =>
        document.addEventListener("DOMContentLoaded", resolve, { once: true })
      );
    }
  }).then(() => apply());

  return { t, apply, setLang, getLang, pickLang, ready };
})();
