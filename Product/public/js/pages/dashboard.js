/* Discovery dashboard: filter state lives in the URL (shareable), the grid
   re-fetches on every change, debounced for text inputs. */

(async function () {
  await I18N.ready;
  const { el, label } = UI;

  const form = document.getElementById("filter-form");
  const results = document.getElementById("results");
  const resultCount = document.getElementById("result-count");
  const sortSelect = document.getElementById("sort-select");
  const pagination = document.getElementById("pagination");

  const meta = await API.getMeta();
  let page = 1;

  /* --- build dynamic filter options from /api/meta ---------------------- */
  function buildOptions() {
    const regionBox = document.getElementById("region-options");
    const checked = new Set(
      [...form.querySelectorAll('input[name="region"]:checked')].map((b) => b.value)
    );
    regionBox.replaceChildren(
      ...meta.regions.map((slug) => {
        const box = el("input", { type: "checkbox", name: "region", value: slug });
        box.checked = checked.has(slug);
        return el("label", { class: "checkbox-row" }, [
          box,
          el("span", { text: label("region", slug) }),
        ]);
      })
    );
    const fill = (select, kind, slugs) => {
      const current = select.value;
      select.replaceChildren(
        el("option", { value: "", text: I18N.t("common.all") }),
        ...slugs.map((slug) => el("option", { value: slug, text: label(kind, slug) }))
      );
      select.value = current;
    };
    fill(document.getElementById("industry-select"), "industry", meta.industries);
    fill(document.getElementById("stage-select"), "stage", meta.funding_stages);
    fill(document.getElementById("bucket-select"), "bucket", meta.team_buckets);
  }

  /* --- URL <-> form state ------------------------------------------------ */
  function readStateFromURL() {
    const params = new URLSearchParams(location.search);
    form.q.value = params.get("q") || "";
    form.industry.value = params.get("industry") || "";
    form.stage.value = params.get("stage") || "";
    form.team_bucket.value = params.get("team_bucket") || "";
    form.founded_from.value = params.get("founded_from") || "";
    form.founded_to.value = params.get("founded_to") || "";
    form.hashtag.value = params.get("hashtag") || "";
    sortSelect.value = params.get("sort") || "newest";
    page = parseInt(params.get("page") || "1", 10) || 1;
    const regions = params.getAll("region");
    form.querySelectorAll('input[name="region"]').forEach((box) => {
      box.checked = regions.includes(box.value);
    });
  }

  function currentQuery() {
    const query = {
      q: form.q.value.trim(),
      industry: form.industry.value,
      stage: form.stage.value,
      team_bucket: form.team_bucket.value,
      founded_from: form.founded_from.value,
      founded_to: form.founded_to.value,
      hashtag: form.hashtag.value.trim(),
      sort: sortSelect.value,
      page,
      region: [...form.querySelectorAll('input[name="region"]:checked')].map((b) => b.value),
    };
    return query;
  }

  function writeURL(query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === "" || value == null || (key === "page" && value === 1)) continue;
      if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
      else params.set(key, value);
    }
    const qs = params.toString();
    history.replaceState(null, "", qs ? `?${qs}` : location.pathname);
  }

  /* --- fetch + render ----------------------------------------------------- */
  let inFlight = 0;

  async function refresh() {
    const query = currentQuery();
    writeURL(query);
    const ticket = ++inFlight;
    results.setAttribute("aria-busy", "true");
    try {
      const data = await API.getProfiles(query);
      if (ticket !== inFlight) return; // a newer request superseded this one
      resultCount.textContent = I18N.t("dashboard.results", { count: data.total });
      if (data.items.length === 0) {
        results.replaceChildren(UI.emptyState("dashboard.empty"));
      } else {
        results.replaceChildren(...data.items.map(UI.renderProfileCard));
      }
      renderPagination(data);
    } catch (err) {
      UI.toastApiError(err);
    } finally {
      results.removeAttribute("aria-busy");
    }
  }

  function renderPagination(data) {
    const pages = Math.max(1, Math.ceil(data.total / data.limit));
    if (pages <= 1) {
      pagination.replaceChildren();
      return;
    }
    pagination.replaceChildren(
      ...Array.from({ length: pages }, (_, i) =>
        el("button", {
          type: "button",
          text: String(i + 1),
          "aria-current": i + 1 === data.page ? "page" : null,
          onclick: () => {
            page = i + 1;
            refresh();
          },
        })
      )
    );
  }

  /* --- events -------------------------------------------------------------- */
  let debounceTimer = null;

  form.addEventListener("input", (e) => {
    page = 1;
    const isText = e.target.matches('input[type="search"], input[type="text"], input[type="number"]');
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(refresh, isText ? 300 : 0);
  });

  form.addEventListener("submit", (e) => e.preventDefault());

  sortSelect.addEventListener("change", () => {
    page = 1;
    refresh();
  });

  document.getElementById("reset-filters").addEventListener("click", () => {
    form.reset();
    sortSelect.value = "newest";
    page = 1;
    refresh();
  });

  window.addEventListener("langchange", () => {
    buildOptions();
    refresh(); // re-render cards with translated labels
  });

  buildOptions();
  readStateFromURL();
  refresh();
})();
