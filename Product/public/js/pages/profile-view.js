/* Public startup profile page. Everything is read-only; the owner gets an
   edit link. All dynamic text re-renders on "langchange". */

(async function () {
  await I18N.ready;
  const { el, label, formatCount, formatKRW, formatDate } = UI;

  const root = document.getElementById("profile-root");
  const content = document.getElementById("profile-content");
  const hero = document.getElementById("hero-card");
  const metricsRow = document.getElementById("metrics-row");
  const aboutCard = document.getElementById("about-card");
  const metaLine = document.getElementById("profile-meta");

  function showNotFound() {
    root.replaceChildren(UI.emptyState("common.not_found"));
    window.addEventListener("langchange", () => {
      root.replaceChildren(UI.emptyState("common.not_found"));
    });
  }

  const id = new URLSearchParams(location.search).get("id");
  if (!id) {
    showNotFound();
    return;
  }

  let profile;
  try {
    ({ profile } = await API.getProfile(id));
  } catch (err) {
    if (err instanceof ApiError && (err.code === "NOT_FOUND" || err.status === 404)) {
      showNotFound();
    } else {
      UI.toastApiError(err);
    }
    return;
  }

  const user = await Auth.getSession();
  const isOwner = !!user && user.profile_id === profile.id;

  /* "+38.0%" — the "+" only when strictly positive; "-" when absent. */
  function formatGrowth(pct) {
    if (pct === null || pct === undefined || pct === "") return "-";
    const n = Number(pct);
    if (Number.isNaN(n)) return "-";
    return `${n > 0 ? "+" : ""}${n.toFixed(1)}%`;
  }

  function renderHero() {
    const nodes = [
      el("div", { class: "eyebrow" }, [
        el("span", { class: "node-dot", "aria-hidden": "true" }),
        `${label("region", profile.region)} · REG. ${profile.founded_year}`,
      ]),
      el("h1", { text: profile.name }),
      el("p", { class: "muted", text: profile.one_liner }),
      el("div", { class: "row" }, [
        el("span", { class: "badge badge-copper", text: label("stage", profile.funding_stage) }),
        el("span", { class: "badge", text: label("industry", profile.industry) }),
        el("span", { class: "badge", text: label("bucket", profile.team_bucket) }),
      ]),
      el("div", { class: "row" },
        (profile.hashtags || []).map((tag) => el("span", { class: "tag", text: tag }))
      ),
    ];
    if (isOwner) {
      nodes.push(
        el("div", {}, [
          el("a", {
            class: "btn btn-secondary",
            href: "profile-edit.html",
            "data-i18n": "profile.edit",
            text: I18N.t("profile.edit"),
          }),
        ])
      );
    }
    hero.replaceChildren(...nodes);
  }

  function metricBlock(value, labelKey) {
    return el("div", { class: "metric" }, [
      el("span", { class: "value", text: value }),
      el("span", { class: "label", text: I18N.t(labelKey) }),
    ]);
  }

  function renderMetrics() {
    const m = profile.metrics || {};
    metricsRow.replaceChildren(
      metricBlock(formatCount(m.mau), "profile.metric.mau"),
      metricBlock(m.revenue_band || "-", "profile.metric.revenue_band"),
      metricBlock(formatGrowth(m.growth_rate_pct), "profile.metric.growth_rate_pct"),
      metricBlock(formatKRW(m.total_funding_krw), "profile.metric.total_funding_krw")
    );
  }

  function renderAbout() {
    aboutCard.replaceChildren(
      el("p", { style: "white-space:pre-line", text: profile.description || "" })
    );
    metaLine.textContent =
      `${I18N.t("profile.registered")} ${formatDate(profile.created_at)}` +
      ` · ${I18N.t("common.views")} ${formatCount(profile.views)}`;
  }

  function renderAll() {
    renderHero();
    renderMetrics();
    renderAbout();
  }

  renderAll();
  content.hidden = false;

  window.addEventListener("langchange", renderAll);
})();
