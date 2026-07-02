/* Mentoring dashboard: one card per mentorship, stage pipeline + KPIs.
   Mentor-only page — non-mentors are redirected by Auth.requireRole. */

(async function () {
  await Auth.requireRole("mentor");
  await I18N.ready;
  const { el, label } = UI;

  const list = document.getElementById("mentorship-list");

  let meta;
  let items = [];
  try {
    const [metaData, data] = await Promise.all([API.getMeta(), API.getMentorships()]);
    meta = metaData;
    items = data.items || data.mentorships || (Array.isArray(data) ? data : []);
  } catch (err) {
    UI.toastApiError(err);
    return;
  }

  const FINAL_STAGE = "review";

  function renderKpiChip(kpi) {
    const delta = Number(kpi.delta_pct) || 0;
    const children = [
      el("span", { class: "muted", text: kpi.key }),
      el("strong", { text: kpi.value }),
    ];
    if (delta > 0) {
      children.push(el("span", { class: "delta-up", text: `▲ ${delta}%` }));
    } else if (delta < 0) {
      children.push(el("span", { class: "delta-down", text: `▼ ${Math.abs(delta)}%` }));
    }
    return el("span", { class: "kpi-chip" }, children);
  }

  function renderCard(m) {
    const startup = m.startup || {};
    const pct = Math.min(100, Math.max(0, Number(m.stage_progress_pct) || 0));
    const isFinal = m.stage === FINAL_STAGE;

    const advanceBtn = el("button", {
      type: "button",
      class: "btn btn-copper",
      "data-i18n": "mentoring.advance",
      text: I18N.t("mentoring.advance"),
      disabled: isFinal ? "" : null,
      onclick: async () => {
        advanceBtn.disabled = true;
        try {
          const res = await API.advanceMentorship(m.id);
          if (res.token_balance !== undefined) Auth.setBalance(res.token_balance);
          Object.assign(m, res.mentorship);
          UI.toast(
            I18N.t("mentoring.advanced", { stage: label("mstage", res.mentorship.stage) })
          );
          card.replaceWith(renderCard(m));
        } catch (err) {
          if (err instanceof ApiError && err.code === "ALREADY_FINAL") {
            UI.toast(I18N.t("mentoring.final"), { error: true });
          } else {
            UI.toastApiError(err);
          }
          advanceBtn.disabled = m.stage === FINAL_STAGE;
        }
      },
    });

    const card = el("article", { class: "card stack-sm" }, [
      /* Header: startup identity + start date */
      el("div", { class: "row-between" }, [
        el("div", { class: "stack-sm" }, [
          el("h3", { style: "margin:0" }, [
            el("a", {
              href: `profile.html?id=${encodeURIComponent(startup.id)}`,
              text: startup.name,
            }),
          ]),
          el("div", { class: "row" }, [
            el("span", { class: "badge", text: label("region", startup.region) }),
            el("span", { class: "badge", text: label("industry", startup.industry) }),
            el("span", { class: "badge badge-copper", text: label("stage", startup.funding_stage) }),
          ]),
        ]),
        el("span", {
          class: "small mono muted",
          text: `${I18N.t("mentoring.since")} ${UI.formatDate(m.started_at)}`,
        }),
      ]),

      /* Stage pipeline */
      UI.renderStagePipeline(meta.mentorship_stages, m.stage),

      /* Progress within the current stage */
      el("div", {}, [
        el("div", { class: "row-between small muted" }, [
          el("span", { class: "mono", text: I18N.t("mentoring.progress") }),
          el("span", { class: "mono", text: `${pct}%` }),
        ]),
        el("div", { class: "progress", style: "margin-top: var(--sp-1)" }, [
          el("span", { style: `width:${pct}%` }),
        ]),
      ]),

      /* KPIs */
      (m.kpis || []).length
        ? el("div", {}, [
            el("div", { class: "small mono muted", text: I18N.t("mentoring.kpis") }),
            el(
              "div",
              { class: "row", style: "margin-top: var(--sp-1)" },
              m.kpis.map(renderKpiChip)
            ),
          ])
        : null,

      /* Notes */
      m.notes
        ? el("div", {}, [
            el("div", { class: "small mono muted", text: I18N.t("mentoring.notes") }),
            el("p", {
              class: "small muted",
              style: "white-space:pre-line; margin-top: var(--sp-1)",
              text: m.notes,
            }),
          ])
        : null,

      /* Advance action */
      el("div", { class: "row", style: "justify-content:flex-end" }, [advanceBtn]),
    ]);

    return card;
  }

  function renderAll() {
    if (items.length === 0) {
      list.replaceChildren(UI.emptyState("mentoring.empty"));
      return;
    }
    list.replaceChildren(...items.map(renderCard));
  }

  window.addEventListener("langchange", renderAll);
  renderAll();
})();
