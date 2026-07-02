/* DOM builder + shared renderers. All user content flows through textContent —
   never assign user data to innerHTML. */

window.UI = (function () {
  const { t } = window.I18N;

  function el(tag, attrs, children) {
    const node = document.createElement(tag);
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (value === undefined || value === null) continue;
        if (key === "class") node.className = value;
        else if (key === "dataset") Object.assign(node.dataset, value);
        else if (key.startsWith("on") && typeof value === "function") {
          node.addEventListener(key.slice(2), value);
        } else if (key === "text") node.textContent = value;
        else node.setAttribute(key, value);
      }
    }
    for (const child of [].concat(children || [])) {
      if (child === null || child === undefined) continue;
      node.append(child.nodeType ? child : document.createTextNode(child));
    }
    return node;
  }

  function label(kind, slug) {
    return t(`${kind}.${slug}`);
  }

  function formatDate(iso) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleDateString(I18N.getLang() === "ko" ? "ko-KR" : "en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function formatKRW(amount) {
    if (!amount) return "-";
    if (amount >= 100_000_000) {
      if (I18N.getLang() === "ko") {
        const eok = amount / 100_000_000;
        return `${eok % 1 ? eok.toFixed(1) : eok}억원`;
      }
      return `₩${Math.round(amount / 1_000_000).toLocaleString()}M`;
    }
    return `₩${amount.toLocaleString()}`;
  }

  function formatCount(n) {
    return (n ?? 0).toLocaleString();
  }

  /* Toasts ----------------------------------------------------------- */
  let toastRegion = null;

  function toast(message, options) {
    const { error = false, linkText, linkHref, timeout = 4200 } = options || {};
    if (!toastRegion) {
      toastRegion = el("div", { class: "toast-region", role: "status", "aria-live": "polite" });
      document.body.append(toastRegion);
    }
    const node = el("div", { class: `toast${error ? " error" : ""}` }, [
      message,
      linkText ? el("a", { href: linkHref || "#", text: linkText }) : null,
    ]);
    toastRegion.append(node);
    setTimeout(() => node.remove(), timeout);
  }

  /* Shared error-to-toast mapping for token/vote errors */
  function toastApiError(err) {
    if (!(err instanceof ApiError)) {
      toast(t("common.error"), { error: true });
      return;
    }
    switch (err.code) {
      case "INSUFFICIENT_TOKENS":
        toast(
          t("community.insufficient", {
            balance: err.payload.balance ?? 0,
            required: err.payload.required ?? 0,
          }),
          { error: true, linkText: t("community.insufficient_link"), linkHref: "purchase.html" }
        );
        break;
      case "ALREADY_VOTED":
        toast(t("thread.already_voted"), { error: true });
        break;
      case "SELF_VOTE":
        toast(t("thread.self_vote"), { error: true });
        break;
      case "AUTH_REQUIRED":
        toast(t("auth.login_required"), {
          error: true,
          linkText: t("auth.login"),
          linkHref: "login.html",
        });
        break;
      default:
        toast(err.message || t("common.error"), { error: true });
    }
  }

  function emptyState(key) {
    return el("div", { class: "empty-state" }, [
      el("p", { class: "mono", text: "—" }),
      el("p", { text: t(key) }),
    ]);
  }

  /* Renderers --------------------------------------------------------- */
  function renderProfileCard(profile) {
    const m = profile.metrics || {};
    return el("article", { class: "card profile-card" }, [
      el("div", { class: "eyebrow" }, [
        el("span", { class: "node-dot", "aria-hidden": "true" }),
        `${label("region", profile.region)} · REG. ${profile.founded_year}`,
      ]),
      el("h3", { text: profile.name }),
      el("p", { class: "one-liner", text: profile.one_liner }),
      el("div", { class: "row" }, [
        el("span", { class: "badge badge-copper", text: label("stage", profile.funding_stage) }),
        el("span", { class: "badge", text: label("industry", profile.industry) }),
        el("span", { class: "badge", text: label("bucket", profile.team_bucket) }),
      ]),
      el("div", { class: "row" },
        (profile.hashtags || []).slice(0, 4).map((tag) => el("span", { class: "tag", text: tag }))
      ),
      el("div", { class: "metric-row" }, [
        el("div", { class: "metric" }, [
          el("span", { class: "value", text: formatCount(m.mau) }),
          el("span", { class: "label", text: t("profile.metric.mau") }),
        ]),
        el("div", { class: "metric" }, [
          el("span", { class: "value", text: formatKRW(m.total_funding_krw) }),
          el("span", { class: "label", text: t("profile.metric.total_funding_krw") }),
        ]),
      ]),
      el("a", {
        class: "btn btn-secondary btn-block",
        href: `profile.html?id=${encodeURIComponent(profile.id)}`,
        text: t("dashboard.view_profile"),
      }),
    ]);
  }

  function renderThreadRow(thread, onVote) {
    return el("article", { class: "thread-row" }, [
      el("div", { class: "vote-box" }, [
        el("button", {
          class: "vote-btn",
          "data-i18n-title": "thread.vote",
          title: t("thread.vote"),
          text: "▲",
          onclick: () => onVote && onVote(thread),
        }),
        el("span", { class: "vote-count", text: formatCount(thread.upvotes) }),
      ]),
      el("div", { class: "stack-sm", style: "flex:1" }, [
        el("div", { class: "row" }, [
          el("span", { class: "badge badge-copper", text: label("category", thread.category) }),
        ]),
        el("h3", {}, [
          el("a", {
            href: `thread.html?id=${encodeURIComponent(thread.id)}`,
            text: thread.title,
          }),
        ]),
        el("div", { class: "thread-meta" }, [
          el("span", { text: thread.author_name }),
          el("span", { text: formatDate(thread.created_at) }),
          el("span", { text: `${t("common.replies")} ${formatCount(thread.reply_count)}` }),
          el("span", { text: `${t("common.views")} ${formatCount(thread.views)}` }),
        ]),
      ]),
    ]);
  }

  function renderStagePipeline(stages, currentStage) {
    const currentIndex = stages.indexOf(currentStage);
    const nodes = [];
    stages.forEach((stage, i) => {
      const state = i < currentIndex ? "done" : i === currentIndex ? "current" : "";
      nodes.push(
        el("span", { class: `step ${state}` }, [
          el("span", { class: "dot", "aria-hidden": "true" }),
          label("mstage", stage),
        ])
      );
      if (i < stages.length - 1) {
        nodes.push(el("span", { class: `link ${i < currentIndex ? "done" : ""}` }));
      }
    });
    return el("div", { class: "pipeline", role: "img", "aria-label": label("mstage", currentStage) }, nodes);
  }

  return {
    el,
    label,
    formatDate,
    formatKRW,
    formatCount,
    toast,
    toastApiError,
    emptyState,
    renderProfileCard,
    renderThreadRow,
    renderStagePipeline,
  };
})();
