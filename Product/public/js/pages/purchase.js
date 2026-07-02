/* Token packs & membership plans. Payment is intentionally inert: a mock
   purchase call opens a "coming soon" modal instead of a checkout flow. */

(async function () {
  await I18N.ready;
  const { el } = UI;

  const notes = document.getElementById("purchase-notes");
  const balanceNote = document.getElementById("balance-note");
  const costsNote = document.getElementById("costs-note");
  const tabPacks = document.getElementById("tab-packs");
  const tabMembership = document.getElementById("tab-membership");
  const packsSection = document.getElementById("packs-section");
  const membershipSection = document.getElementById("membership-section");
  const packsGrid = document.getElementById("packs-grid");
  const membershipGrid = document.getElementById("membership-grid");
  const modal = document.getElementById("purchase-modal");

  let balance = null;
  let meta = null;
  let products = { packs: [], memberships: [] };

  const user = await Auth.getSession();
  if (user) balance = user.token_balance;

  try {
    meta = await API.getMeta();
  } catch (err) {
    /* costs note is optional; skip it */
  }

  try {
    products = await API.getProducts();
  } catch (err) {
    UI.toastApiError(err);
  }

  /* --- notes (logged-in only) --------------------------------------------- */
  function renderNotes() {
    if (balance === null || balance === undefined) {
      notes.hidden = true;
      return;
    }
    notes.hidden = false;
    balanceNote.textContent = I18N.t("purchase.balance_note", { balance });
    if (meta && meta.token_costs) {
      costsNote.textContent = I18N.t("purchase.costs_note", {
        thread: meta.token_costs.thread,
        reply: meta.token_costs.reply,
        reward: meta.token_costs.upvote_reward,
      });
    }
  }

  /* --- product cards -------------------------------------------------------- */
  function perksOf(product) {
    const perks = I18N.pickLang(product, "perks");
    return Array.isArray(perks) ? perks : [];
  }

  function renderProductCard(product) {
    const isPack = product.kind === "pack";
    return el("article", { class: "card stack-sm", style: "position:relative" }, [
      product.highlight
        ? el("span", {
            class: "badge badge-copper",
            style: "position:absolute; top:var(--sp-3); right:var(--sp-3)",
            text: I18N.t("purchase.popular"),
          })
        : null,
      el("h3", { text: I18N.pickLang(product, "name") }),
      product.tokens
        ? el("div", { class: "mono", style: "font-size:var(--text-xl); font-weight:500" }, [
            el("span", { text: product.tokens.toLocaleString() }),
            " ",
            el("span", { class: "small muted", text: I18N.t("purchase.tokens_unit") }),
          ])
        : null,
      el("div", { class: "price" }, [
        `₩${(product.price_krw ?? 0).toLocaleString()}`,
        isPack ? null : el("span", { class: "period", text: I18N.t("purchase.per_month") }),
      ]),
      el("ul", { class: "perks" }, perksOf(product).map((perk) => el("li", { text: perk }))),
      el("button", {
        class: "btn btn-primary btn-block",
        type: "button",
        text: I18N.t(isPack ? "purchase.buy" : "purchase.join"),
        onclick: () => purchase(product),
      }),
    ]);
  }

  function bySortOrder(a, b) {
    return (a.sort_order ?? 0) - (b.sort_order ?? 0);
  }

  function renderProducts() {
    const packs = (products.packs || []).slice().sort(bySortOrder);
    const memberships = (products.memberships || []).slice().sort(bySortOrder);
    packsGrid.replaceChildren(
      ...(packs.length ? packs.map(renderProductCard) : [UI.emptyState("common.not_found")])
    );
    membershipGrid.replaceChildren(
      ...(memberships.length
        ? memberships.map(renderProductCard)
        : [UI.emptyState("common.not_found")])
    );
  }

  /* --- purchase (intentionally inert) --------------------------------------- */
  async function purchase(product) {
    try {
      const data = await API.mockPurchase(product.id);
      if (data && data.token_balance !== undefined) {
        Auth.setBalance(data.token_balance);
      }
      modal.showModal();
    } catch (err) {
      if (err instanceof ApiError && err.code === "AUTH_REQUIRED") {
        location.href = "login.html?next=purchase.html";
        return;
      }
      UI.toastApiError(err);
    }
  }

  /* --- tabs -------------------------------------------------------------------- */
  function selectTab(which) {
    const showPacks = which === "packs";
    tabPacks.setAttribute("aria-selected", String(showPacks));
    tabMembership.setAttribute("aria-selected", String(!showPacks));
    packsSection.hidden = !showPacks;
    membershipSection.hidden = showPacks;
  }

  tabPacks.addEventListener("click", () => selectTab("packs"));
  tabMembership.addEventListener("click", () => selectTab("membership"));

  /* --- events -------------------------------------------------------------------- */
  window.addEventListener("balancechange", (e) => {
    balance = e.detail.balance;
    renderNotes();
  });

  window.addEventListener("langchange", () => {
    renderNotes();
    renderProducts();
  });

  renderNotes();
  renderProducts();
  selectTab("packs");
})();
