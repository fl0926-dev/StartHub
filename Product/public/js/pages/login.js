(async function () {
  await I18N.ready;
  const form = document.getElementById("login-form");
  const errorBox = document.getElementById("form-error");

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

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorBox.textContent = "";
    try {
      await API.login({
        email: form.email.value,
        password: form.password.value,
      });
      location.href = safeNext(new URLSearchParams(location.search).get("next"));
    } catch (err) {
      errorBox.textContent =
        err instanceof ApiError && err.code === "INVALID_CREDENTIALS"
          ? I18N.t("auth.invalid")
          : I18N.t("common.error");
    }
  });
})();
