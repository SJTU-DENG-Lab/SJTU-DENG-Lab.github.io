(() => {
  "use strict";

  const header = document.querySelector(".lab-header");
  if (!header) return;

  const themeToggle = header.querySelector(".theme-toggle");
  const defaultTheme = header.dataset.defaultTheme;
  let preferredTheme = null;

  if (themeToggle) {
    try {
      preferredTheme = localStorage.getItem("pref-theme");
    } catch (_) {
      // Theme controls still work when the browser blocks local storage.
    }
  }

  const systemIsDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
  const initialDark = preferredTheme === "dark" ||
    (preferredTheme !== "light" && (defaultTheme === "dark" ||
      (defaultTheme !== "light" && systemIsDark)));

  const applyTheme = (isDark) => {
    document.body.classList.toggle("dark", isDark);
    if (themeToggle) {
      const label = isDark ? "Switch to light theme" : "Switch to dark theme";
      themeToggle.setAttribute("aria-label", label);
      themeToggle.title = label;
    }
  };

  applyTheme(Boolean(initialDark));

  if (themeToggle) {
    themeToggle.addEventListener("click", () => {
      const isDark = !document.body.classList.contains("dark");
      applyTheme(isDark);
      try {
        localStorage.setItem("pref-theme", isDark ? "dark" : "light");
      } catch (_) {
        // Keep the selected theme for this page if persistence is unavailable.
      }
    });
  }

  const menuToggle = header.querySelector(".menu-toggle");
  const menu = header.querySelector("#menu");
  if (!menuToggle || !menu) return;

  const setMenuOpen = (isOpen) => {
    header.classList.toggle("nav-menu-open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    menuToggle.setAttribute("aria-label", isOpen ? "Close navigation" : "Open navigation");
  };

  menuToggle.addEventListener("click", () => {
    setMenuOpen(menuToggle.getAttribute("aria-expanded") !== "true");
  });

  menu.addEventListener("click", (event) => {
    if (event.target.closest("a")) setMenuOpen(false);
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && menuToggle.getAttribute("aria-expanded") === "true") {
      setMenuOpen(false);
      menuToggle.focus();
    }
  });

  document.addEventListener("click", (event) => {
    if (!header.contains(event.target)) setMenuOpen(false);
  });

  // Until enhancement is complete, CSS keeps the navigation links available
  // and hides controls that would otherwise do nothing without JavaScript.
  setMenuOpen(false);
  header.classList.add("navigation-ready");
})();
