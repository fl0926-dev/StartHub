/* News & insights list: category tabs refetch from the API; the last payload
   is cached so a language switch re-renders titles/summaries/dates without
   another request. Selected category is mirrored in the URL (shareable). */

(async function () {
  await I18N.ready;
  const { el, label } = UI;

  const tabsBox = document.getElementById("category-tabs");
  const grid = document.getElementById("articles");

  let categories = [];
  try {
    const meta = await API.getMeta();
    categories = meta.article_categories || [];
  } catch (err) {
    UI.toastApiError(err);
  }

  let category = new URLSearchParams(location.search).get("category") || "";
  if (category && !categories.includes(category)) category = "";

  let articles = [];
  let inFlight = 0;

  /* --- tabs ---------------------------------------------------------------- */
  function renderTabs() {
    const makeTab = (slug, text) =>
      el("button", {
        type: "button",
        class: "tab",
        role: "tab",
        "aria-selected": String(slug === category),
        text,
        onclick: () => {
          if (slug === category) return;
          category = slug;
          writeURL();
          renderTabs();
          refresh();
        },
      });
    tabsBox.replaceChildren(
      makeTab("", I18N.t("common.all")),
      ...categories.map((slug) => makeTab(slug, label("acategory", slug)))
    );
  }

  function writeURL() {
    history.replaceState(
      null,
      "",
      category ? `?category=${encodeURIComponent(category)}` : location.pathname
    );
  }

  /* --- article cards -------------------------------------------------------- */
  function renderCard(article) {
    const href = `article.html?id=${encodeURIComponent(article.id)}`;
    return el("article", { class: "card profile-card" }, [
      el("div", { class: "row" }, [
        el("span", { class: "badge badge-copper", text: label("acategory", article.category) }),
      ]),
      el("h3", {}, [
        el("a", { href, text: I18N.pickLang(article, "title") }),
      ]),
      el("p", { class: "one-liner", text: I18N.pickLang(article, "summary") }),
      el("div", { class: "thread-meta" }, [
        el("span", { text: article.source_name }),
        el("span", { text: UI.formatDate(article.published_at) }),
        el("span", { text: `${I18N.t("common.views")} ${UI.formatCount(article.views)}` }),
      ]),
      el("a", {
        class: "btn btn-secondary btn-block",
        href,
        text: I18N.t("news.read"),
      }),
    ]);
  }

  function renderList() {
    if (articles.length === 0) {
      grid.replaceChildren(UI.emptyState("news.empty"));
    } else {
      grid.replaceChildren(...articles.map(renderCard));
    }
  }

  /* --- fetch ----------------------------------------------------------------- */
  async function refresh() {
    const ticket = ++inFlight;
    grid.setAttribute("aria-busy", "true");
    try {
      const data = await API.getArticles(category ? { category } : {});
      if (ticket !== inFlight) return; // a newer request superseded this one
      articles = Array.isArray(data) ? data : data.items || [];
      renderList();
    } catch (err) {
      UI.toastApiError(err);
    } finally {
      if (ticket === inFlight) grid.removeAttribute("aria-busy");
    }
  }

  window.addEventListener("langchange", () => {
    renderTabs();
    renderList(); // titles/summaries/dates switch language from cache
  });

  renderTabs();
  refresh();
})();
