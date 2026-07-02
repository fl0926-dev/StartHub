/* Thread detail: thread card + one-level nested replies. Voting rewards the
   author; replying costs tokens. Everything dynamic re-renders on langchange. */

(async function () {
  await I18N.ready;
  const { el, label, formatDate, formatCount } = UI;
  const t = I18N.t;

  const main = document.querySelector("main");
  const threadCard = document.getElementById("thread-card");
  const repliesSection = document.getElementById("replies-section");
  const repliesHeading = document.getElementById("replies-heading");
  const repliesBox = document.getElementById("replies");
  const form = document.getElementById("reply-form");
  const bodyInput = document.getElementById("reply-body");
  const costNote = document.getElementById("reply-cost");
  const parentChipBox = document.getElementById("parent-chip");
  const submitBtn = form.querySelector('button[type="submit"]');

  const threadId = new URLSearchParams(location.search).get("id");

  let thread = null;
  let replies = [];
  let parentTarget = null; // {id, name} of the reply being answered
  let notFound = false;

  function showNotFound() {
    notFound = true;
    main.replaceChildren(UI.emptyState("common.not_found"));
  }

  window.addEventListener("langchange", () => {
    if (notFound) {
      showNotFound(); // re-render translated empty state
    } else if (thread) {
      renderAll();
    }
  });

  if (!threadId) {
    showNotFound();
    return;
  }

  /* Token costs from meta (fallbacks only if /api/meta fails). */
  let costs = { reply: 2, upvote_reward: 1 };
  try {
    const meta = await API.getMeta();
    costs = meta.token_costs;
  } catch (err) {
    /* keep defaults */
  }

  /* --- fetch ------------------------------------------------------------- */
  async function load() {
    try {
      const data = await API.getThread(threadId);
      thread = data.thread;
      replies = data.replies;
      renderAll();
    } catch (err) {
      if (err instanceof ApiError && err.code === "NOT_FOUND") {
        showNotFound();
      } else {
        UI.toastApiError(err);
      }
    }
  }

  /* --- thread card -------------------------------------------------------- */
  function renderThread() {
    threadCard.replaceChildren(
      el("div", { class: "row" }, [
        el("span", { class: "badge badge-copper", text: label("category", thread.category) }),
      ]),
      el("h1", { text: thread.title }),
      el("div", { class: "thread-meta" }, [
        el("span", { text: thread.author_name }),
        el("span", { text: formatDate(thread.created_at) }),
        el("span", { text: `${t("common.views")} ${formatCount(thread.views)}` }),
      ]),
      el("div", { style: "white-space:pre-line", text: thread.body }),
      el("div", {
        class: "row",
        style: "border-top:1px dashed var(--line);padding-top:var(--sp-3)",
      }, [
        el("button", {
          type: "button",
          class: "vote-btn",
          title: t("thread.vote"),
          "data-i18n-title": "thread.vote",
          text: "▲",
          onclick: onVoteThread,
        }),
        el("span", { class: "mono small", text: formatCount(thread.upvotes) }),
      ])
    );
    threadCard.hidden = false;
  }

  async function onVoteThread() {
    try {
      const data = await API.voteThread(thread.id);
      thread.upvotes = data.upvotes;
      if (data.token_balance != null) Auth.setBalance(data.token_balance);
      renderThread();
      UI.toast(t("thread.vote_reward", { reward: costs.upvote_reward }));
    } catch (err) {
      UI.toastApiError(err);
    }
  }

  /* --- replies ------------------------------------------------------------ */
  function renderReply(reply) {
    const node = el("article", { class: "reply stack-sm" }, [
      el("div", { class: "row" }, [
        el("strong", { class: "small", text: reply.author_name }),
        el("span", { class: "small muted mono", text: formatDate(reply.created_at) }),
      ]),
      el("p", { class: "small", style: "white-space:pre-line;margin:0", text: reply.body }),
      el("div", { class: "row" }, [
        el("button", {
          type: "button",
          class: "vote-btn",
          title: t("thread.vote"),
          "data-i18n-title": "thread.vote",
          text: `▲ ${formatCount(reply.upvotes)}`,
          onclick: () => onVoteReply(reply),
        }),
        el("button", {
          type: "button",
          class: "btn btn-secondary",
          style: "padding:2px var(--sp-3);font-size:var(--text-xs)",
          text: t("thread.reply_to"),
          onclick: () => setParentTarget(reply),
        }),
      ]),
    ]);
    if (reply.children && reply.children.length) {
      node.append(el("div", { class: "children" }, reply.children.map(renderReply)));
    }
    return node;
  }

  function renderReplies() {
    repliesHeading.textContent = `${t("common.replies")} ${formatCount(thread.reply_count)}`;
    repliesBox.replaceChildren(...replies.map(renderReply));
    repliesSection.hidden = false;
  }

  async function onVoteReply(reply) {
    try {
      const data = await API.voteReply(reply.id);
      reply.upvotes = data.upvotes;
      if (data.token_balance != null) Auth.setBalance(data.token_balance);
      renderReplies();
      UI.toast(t("thread.vote_reward", { reward: costs.upvote_reward }));
    } catch (err) {
      UI.toastApiError(err);
    }
  }

  /* --- reply form --------------------------------------------------------- */
  function setParentTarget(reply) {
    parentTarget = { id: reply.id, name: reply.author_name };
    renderParentChip();
    bodyInput.focus();
  }

  function clearParentTarget() {
    parentTarget = null;
    renderParentChip();
  }

  function renderParentChip() {
    if (!parentTarget) {
      parentChipBox.hidden = true;
      parentChipBox.replaceChildren();
      return;
    }
    parentChipBox.hidden = false;
    parentChipBox.replaceChildren(
      el("span", { class: "badge badge-copper" }, [
        `↳ ${parentTarget.name}`,
        el("button", {
          type: "button",
          title: t("common.cancel"),
          "aria-label": t("common.cancel"),
          style: "background:none;border:0;padding:0 0 0 6px;color:inherit;cursor:pointer",
          text: "×",
          onclick: clearParentTarget,
        }),
      ])
    );
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const text = bodyInput.value.trim();
    if (!text) {
      bodyInput.focus();
      return;
    }
    const payload = { body: text };
    if (parentTarget) payload.parent_reply_id = parentTarget.id;
    submitBtn.disabled = true;
    try {
      const data = await API.createReply(threadId, payload);
      UI.toast(t("thread.replied", { cost: costs.reply }));
      if (data.token_balance != null) Auth.setBalance(data.token_balance);
      bodyInput.value = "";
      clearParentTarget();
      await load();
    } catch (err) {
      UI.toastApiError(err);
    } finally {
      submitBtn.disabled = false;
    }
  });

  /* --- full render --------------------------------------------------------- */
  function renderAll() {
    if (notFound) return;
    renderThread();
    renderReplies();
    renderParentChip();
    costNote.textContent = t("thread.reply_cost", { cost: costs.reply });
    form.hidden = false;
  }

  await load();
})();
