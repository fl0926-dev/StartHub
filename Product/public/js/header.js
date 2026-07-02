/* Injects the shared chrome into <header id="site-header"> on every page. */

(function () {
  const PAGES = [
    { href: "index.html", key: "nav.dashboard" },
    { href: "community.html", key: "nav.community" },
    { href: "news.html", key: "nav.news" },
    { href: "mentoring.html", key: "nav.mentoring", role: "mentor" },
    { href: "purchase.html", key: "nav.purchase" },
  ];

  function currentPage() {
    const path = location.pathname.split("/").pop() || "index.html";
    return path;
  }

  async function render() {
    const host = document.getElementById("site-header");
    if (!host) return;
    await I18N.ready;
    const user = await Auth.getSession();
    const { el } = UI;

    const nav = el("nav", { class: "site-nav", "aria-label": "main" },
      PAGES.filter((p) => !p.role || (user && user.role === p.role)).map((p) =>
        el("a", {
          href: p.href,
          "data-i18n": p.key,
          text: I18N.t(p.key),
          "aria-current": currentPage() === p.href ? "page" : null,
        })
      )
    );

    const langToggle = el("button", {
      class: "lang-toggle",
      type: "button",
      "aria-label": "Language",
      text: I18N.getLang() === "ko" ? "KO → EN" : "EN → KO",
      onclick: async () => {
        await I18N.setLang(I18N.getLang() === "ko" ? "en" : "ko");
        langToggle.textContent = I18N.getLang() === "ko" ? "KO → EN" : "EN → KO";
      },
    });

    const actions = el("div", { class: "header-actions" }, [langToggle]);

    if (user) {
      const chip = el("a", {
        class: "token-chip",
        href: "purchase.html",
        title: I18N.t("header.tokens"),
        "data-i18n-title": "header.tokens",
        text: `⬢ ${user.token_balance}`,
      });
      window.addEventListener("balancechange", (e) => {
        chip.textContent = `⬢ ${e.detail.balance}`;
      });
      actions.append(
        chip,
        el("div", { class: "user-menu" }, [
          el("a", {
            href: user.profile_id
              ? `profile.html?id=${encodeURIComponent(user.profile_id)}`
              : "profile-edit.html",
            class: "display-name",
            text: user.display_name,
          }),
          el("button", {
            class: "btn btn-secondary",
            type: "button",
            "data-i18n": "auth.logout",
            text: I18N.t("auth.logout"),
            onclick: () => Auth.logout(),
          }),
        ])
      );
    } else {
      actions.append(
        el("a", {
          class: "btn btn-secondary",
          href: "login.html",
          "data-i18n": "auth.login",
          text: I18N.t("auth.login"),
        }),
        el("a", {
          class: "btn btn-primary",
          href: "signup.html",
          "data-i18n": "auth.signup",
          text: I18N.t("auth.signup"),
        })
      );
    }

    const bar = el("div", { class: "container" }, [
      el("a", { class: "brand", href: "index.html" }, [
        el("span", { class: "node-dot", "aria-hidden": "true" }),
        el("span", { "data-i18n": "brand.name", text: I18N.t("brand.name") }),
      ]),
      nav,
      actions,
    ]);

    host.replaceChildren(bar);

    /* Footer, if the page declares one */
    const footer = document.getElementById("site-footer");
    if (footer) {
      footer.classList.add("site-footer");
      footer.replaceChildren(
        el("div", { class: "container" }, [
          el("span", { "data-i18n": "footer.demo_note", text: I18N.t("footer.demo_note") }),
          el("span", { "data-i18n": "footer.rights", text: I18N.t("footer.rights") }),
        ])
      );
    }
  }

  render();
})();
