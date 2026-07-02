(async function () {
  await I18N.ready;
  const form = document.getElementById("signup-form");
  const errorBox = document.getElementById("form-error");
  const lede = document.getElementById("signup-lede");

  /* Only same-origin relative targets: block //host, scheme: and \ tricks. */
  function safeNext(raw) {
    if (!raw) return "index.html";
    let next;
    try {
      next = decodeURIComponent(raw);
    } catch (err) {
      return "index.html";
    }
    if (/^[a-z][a-z0-9+.-]*:/i.test(next) || next.startsWith("//") || next.includes("\\")) {
      return "index.html";
    }
    next = next.replace(/^\/+/, "");
    return next || "index.html";
  }

  let bonus = 20;
  try {
    const meta = await API.getMeta();
    bonus = meta.token_costs.signup_bonus;
  } catch (err) {
    /* keep default */
  }

  function renderLede() {
    lede.textContent = I18N.t("auth.signup_lede", { bonus });
  }
  renderLede();
  window.addEventListener("langchange", renderLede);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";
    try {
      await API.signup({
        display_name: form.display_name.value,
        email: form.email.value,
        password: form.password.value,
      });
      UI.toast(I18N.t("auth.signup_success", { bonus }));
      const target = safeNext(new URLSearchParams(location.search).get("next"));
      setTimeout(() => {
        location.href = target;
      }, 900);
    } catch (err) {
      if (err instanceof ApiError && err.code === "CONFLICT") {
        errorBox.textContent = I18N.t("auth.email_exists");
      } else if (err instanceof ApiError && err.code === "VALIDATION") {
        errorBox.textContent = err.message;
      } else {
        errorBox.textContent = I18N.t("common.error");
      }
    }
  });
})();
