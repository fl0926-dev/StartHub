/* Article detail: reads ?id=, renders one bilingual article. Title/body/meta
   re-render on langchange via I18N.pickLang. */

(async function () {
  await I18N.ready;
  const { el, label, formatDate, formatCount } = UI;

  const host = document.getElementById("article-host");
  const id = new URLSearchParams(location.search).get("id");

  function renderNotFound() {
    host.replaceChildren(UI.emptyState("common.not_found"));
  }

  if (!id) {
    renderNotFound();
    window.addEventListener("langchange", renderNotFound);
    return;
  }

  let article;
  try {
    const data = await API.getArticle(id);
    article = data.article || data;
  } catch (err) {
    if (err instanceof ApiError && (err.code === "NOT_FOUND" || err.status === 404)) {
      renderNotFound();
      window.addEventListener("langchange", renderNotFound);
    } else {
      UI.toastApiError(err);
    }
    return;
  }

  function render() {
    const paragraphs = String(I18N.pickLang(article, "body"))
      .split("\n\n")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => el("p", { text: part }));

    host.replaceChildren(
      el("article", { class: "card" }, [
        el("div", { class: "row" }, [
          el("span", { class: "badge badge-copper", text: label("acategory", article.category) }),
        ]),
        el("h1", { text: I18N.pickLang(article, "title") }),
        el("div", { class: "thread-meta" }, [
          el("span", {}, [
            `${I18N.t("news.source")}: `,
            el("a", {
              href: article.source_url,
              target: "_blank",
              rel: "noopener",
              text: article.source_name,
            }),
          ]),
          el("span", { text: formatDate(article.published_at) }),
          el("span", { text: `${I18N.t("common.views")} ${formatCount(article.views)}` }),
        ]),
        el("hr", { class: "rule-ticks", "aria-hidden": "true" }),
        el("div", {}, paragraphs),
      ])
    );
  }

  render();
  window.addEventListener("langchange", render);
})();
