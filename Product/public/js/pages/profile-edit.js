/* Profile create/edit form: one page serves both modes — GET /api/profiles/me
   decides which. Select options come from /api/meta and re-fill on langchange
   (the mode-dependent h1 carries a data-i18n attribute so I18N.apply handles it). */

(async function () {
  await I18N.ready;
  const { el, label } = UI;

  try {
    await Auth.requireAuth();
  } catch (err) {
    return; // redirecting to login
  }

  const form = document.getElementById("profile-form");
  const fields = form.elements;
  const errorBox = document.getElementById("form-error");
  const titleEl = document.getElementById("page-title");
  const saveBtn = document.getElementById("save-btn");

  let meta;
  let profile = null;
  try {
    [meta, profile] = await Promise.all([
      API.getMeta(),
      API.getMyProfile()
        .then((data) => data.profile)
        .catch((err) => {
          if (err instanceof ApiError && err.status === 404) return null; // create mode
          throw err;
        }),
    ]);
  } catch (err) {
    UI.toastApiError(err);
    return;
  }

  const isEdit = profile !== null;
  titleEl.dataset.i18n = isEdit ? "profile.edit_title" : "profile.create_title";
  titleEl.textContent = I18N.t(titleEl.dataset.i18n);

  /* --- selects from /api/meta (value survives langchange rebuilds) -------- */
  function fillSelect(select, kind, slugs) {
    const current = select.value;
    select.replaceChildren(
      ...slugs.map((slug) => el("option", { value: slug, text: label(kind, slug) }))
    );
    if (current) select.value = current;
  }

  function buildOptions() {
    fillSelect(fields.region, "region", meta.regions);
    fillSelect(fields.industry, "industry", meta.industries);
    fillSelect(fields.funding_stage, "stage", meta.funding_stages);
  }

  function prefill() {
    const m = profile.metrics || {};
    fields.name.value = profile.name || "";
    fields.one_liner.value = profile.one_liner || "";
    fields.description.value = profile.description || "";
    fields.region.value = profile.region || "";
    fields.industry.value = profile.industry || "";
    fields.funding_stage.value = profile.funding_stage || "";
    fields.founded_year.value = profile.founded_year ?? "";
    fields.team_size.value = profile.team_size ?? "";
    fields.hashtags.value = (profile.hashtags || []).join(", ");
    fields.mau.value = m.mau ?? "";
    fields.revenue_band.value = m.revenue_band || "";
    fields.growth_rate_pct.value = m.growth_rate_pct ?? "";
    fields.total_funding_krw.value = m.total_funding_krw ?? "";
  }

  buildOptions();
  if (isEdit) prefill();

  window.addEventListener("langchange", buildOptions);

  /* --- submit -------------------------------------------------------------- */
  const num = (value) => (String(value).trim() === "" ? null : Number(value));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";
    const body = {
      name: fields.name.value.trim(),
      one_liner: fields.one_liner.value.trim(),
      description: fields.description.value.trim(),
      region: fields.region.value,
      industry: fields.industry.value,
      funding_stage: fields.funding_stage.value,
      founded_year: num(fields.founded_year.value),
      team_size: num(fields.team_size.value),
      hashtags: fields.hashtags.value, // raw string — the server parses it
      metrics: {
        mau: num(fields.mau.value),
        revenue_band: fields.revenue_band.value.trim(),
        growth_rate_pct: num(fields.growth_rate_pct.value),
        total_funding_krw: num(fields.total_funding_krw.value),
      },
    };

    saveBtn.disabled = true;
    try {
      const data = isEdit
        ? await API.updateProfile(profile.id, body)
        : await API.createProfile(body);
      if (data && data.token_balance !== undefined) Auth.setBalance(data.token_balance);
      const saved = data && data.profile ? data.profile : data;
      const id = (saved && saved.id) || (isEdit ? profile.id : "");
      UI.toast(I18N.t("profile.saved"));
      setTimeout(() => {
        location.href = `profile.html?id=${encodeURIComponent(id)}`;
      }, 700);
    } catch (err) {
      saveBtn.disabled = false;
      if (err instanceof ApiError && err.code === "VALIDATION") {
        errorBox.textContent = err.message;
      } else {
        UI.toastApiError(err);
      }
    }
  });
})();
