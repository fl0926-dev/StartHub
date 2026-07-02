/* Community thread list: category tabs + sort mirrored in the URL,
   new-post modal that spends tokens. */

(async function () {
  await I18N.ready;
  const { el, label } = UI;

  const tabsBox = document.getElementById("category-tabs");
  const sortSelect = document.getElementById("sort-select");
  const listBox = document.getElementById("thread-list");
  const newBtn = document.getElementById("new-thread-btn");
  const newBtnCost = document.getElementById("new-thread-cost");
  const modal = document.getElementById("new-thread-modal");
  const form = document.getElementById("new-thread-form");
  const categorySelect = document.getElementById("thread-category");
  const modalCost = document.getElementById("modal-cost");

  const meta = await API.getMeta();
  const postCost = meta.token_costs.thread;
  const voteReward = meta.token_costs.upvote_reward;

  const state = { category: "", sort: "new" };

  /* --- URL <-> state ----------------------------------------------------- */
  function readStateFromURL() {
    const params = new URLSearchParams(location.search);
    const category = params.get("category") || "";
    state.category = meta.thread_categories.includes(category) ? category : "";
    const sort = params.get("sort") || "new";
    state.sort = sort === "top" ? "top" : "new";
    sortSelect.value = state.sort;
  }

  function writeURL() {
    const params = new URLSearchParams();
    if (state.category) params.set("category", state.category);
    params.set("sort", state.sort);
    history.replaceState(null, "", `?${params.toString()}`);
  }

  /* --- static-ish chrome (rebuilt on langchange) -------------------------- */
  function renderTabs() {
    const cats = ["", ...meta.thread_categories];
    tabsBox.replaceChildren(
      ...cats.map((slug) =>
        el("button", {
          type: "button",
          class: "tab",
          role: "tab",
          "aria-selected": String(slug === state.category),
          text: slug ? label("category", slug) : I18N.t("common.all"),
          onclick: () => {
            if (state.category === slug) return;
            state.category = slug;
            renderTabs();
            refresh();
          },
        })
      )
    );
  }

  function renderCostLabels() {
    const costText = I18N.t("community.post_cost", { cost: postCost });
    newBtnCost.textContent = costText;
    modalCost.textContent = costText;
  }

  function buildCategoryOptions() {
    const current = categorySelect.value;
    categorySelect.replaceChildren(
      ...meta.thread_categories.map((slug) =>
        el("option", { value: slug, text: label("category", slug) })
      )
    );
    if (current) categorySelect.value = current;
  }

  /* --- thread list --------------------------------------------------------- */
  function makeRow(thread) {
    const row = UI.renderThreadRow(thread, async (t) => {
      try {
        const res = await API.voteThread(t.id);
        t.upvotes = res && res.upvotes != null ? res.upvotes : t.upvotes + 1;
        const count = row.querySelector(".vote-count");
        if (count) count.textContent = UI.formatCount(t.upvotes);
        if (res && res.token_balance != null) Auth.setBalance(res.token_balance);
        UI.toast(I18N.t("thread.vote_reward", { reward: voteReward }));
      } catch (err) {
        UI.toastApiError(err);
      }
    });
    return row;
  }

  let inFlight = 0;

  async function refresh() {
    writeURL();
    const ticket = ++inFlight;
    listBox.setAttribute("aria-busy", "true");
    try {
      const data = await API.getThreads({ category: state.category, sort: state.sort });
      if (ticket !== inFlight) return; // a newer request superseded this one
      const items = Array.isArray(data) ? data : data.items || [];
      if (items.length === 0) {
        listBox.replaceChildren(UI.emptyState("community.empty"));
      } else {
        listBox.replaceChildren(...items.map(makeRow));
      }
    } catch (err) {
      UI.toastApiError(err);
    } finally {
      listBox.removeAttribute("aria-busy");
    }
  }

  /* --- new-post modal ------------------------------------------------------ */
  newBtn.addEventListener("click", async () => {
    const user = await Auth.getSession();
    if (!user) {
      location.href = "login.html?next=community.html";
      return;
    }
    if (state.category) categorySelect.value = state.category;
    modal.showModal();
  });

  document.getElementById("modal-cancel").addEventListener("click", () => modal.close());

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = form.elements.title.value.trim();
    const body = form.elements.body.value.trim();
    if (!title || !body) return;
    try {
      const res = await API.createThread({
        category: categorySelect.value,
        title,
        body,
      });
      modal.close();
      form.reset();
      UI.toast(I18N.t("community.posted", { cost: postCost }));
      if (res && res.token_balance != null) Auth.setBalance(res.token_balance);
      refresh();
    } catch (err) {
      UI.toastApiError(err); // keep the dialog open so nothing typed is lost
    }
  });

  /* --- events ---------------------------------------------------------------- */
  sortSelect.addEventListener("change", () => {
    state.sort = sortSelect.value;
    refresh();
  });

  window.addEventListener("langchange", () => {
    renderTabs();
    renderCostLabels();
    buildCategoryOptions();
    refresh(); // re-render rows with translated labels
  });

  readStateFromURL();
  renderTabs();
  renderCostLabels();
  buildCategoryOptions();
  refresh();
})();
