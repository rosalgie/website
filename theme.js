(() => {
  const STORAGE_KEY = "theme";
  const root = document.documentElement;
  const allowedThemes = new Set(["dark", "light"]);
  const modes = ["system", "dark", "light"];

  const HLJS_DARK_HREF =
    "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/base16/default-dark.css";
  const HLJS_LIGHT_HREF =
    "https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/base16/default-light.css";
  const HLJS_LINK_SELECTOR = "link[data-hljs-theme]";

  const prefersDarkMql =
    window.matchMedia?.("(prefers-color-scheme: dark)") ?? null;

  const getSystemTheme = () => (prefersDarkMql?.matches ? "dark" : "light");

  const getSavedTheme = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return allowedThemes.has(saved) ? saved : null;
    } catch {
      return null;
    }
  };

  const getMode = () => getSavedTheme() ?? "system";
  const getEffectiveTheme = () => getSavedTheme() ?? getSystemTheme();

  const syncHighlightTheme = () => {
    const link = document.querySelector(HLJS_LINK_SELECTOR);
    if (!link) return;

    const effectiveTheme = getEffectiveTheme();
    link.href = effectiveTheme === "dark" ? HLJS_DARK_HREF : HLJS_LIGHT_HREF;
  };

  const syncButtons = () => {
    const mode = getMode();
    const effectiveTheme = getEffectiveTheme();
    const ariaPressed =
      mode === "system" ? "mixed" : mode === "dark" ? "true" : "false";

    for (const button of document.querySelectorAll("[data-theme-toggle]")) {
      button.textContent = `theme: ${mode}`;
      button.setAttribute("aria-pressed", ariaPressed);
      button.setAttribute(
        "aria-label",
        `Toggle theme (mode: ${mode}, currently ${effectiveTheme})`
      );
    }
  };

  const setMode = (mode) => {
    if (mode === "system") {
      delete root.dataset.theme;
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // localStorage can fail in some privacy modes. we can ignore this (probably)
      }
    } else {
      root.dataset.theme = mode;
      try {
        localStorage.setItem(STORAGE_KEY, mode);
      } catch {
        // localStorage can fail in some privacy modes. we can ignore this (probably)
      }
    }

    syncButtons();
    syncHighlightTheme();
  };

  // apply saved theme immediate to avoid flash when user has a preference).
  {
    const saved = getSavedTheme();
    if (saved) root.dataset.theme = saved;
    syncHighlightTheme();
  }

  const init = () => {
    syncButtons();
    syncHighlightTheme();

    for (const button of document.querySelectorAll("[data-theme-toggle]")) {
      button.addEventListener("click", () => {
        const currentMode = getMode();
        const currentIndex = Math.max(0, modes.indexOf(currentMode));
        const nextMode = modes[(currentIndex + 1) % modes.length];
        setMode(nextMode);
      });
    }

    // if no saved theme, keep the label/aria in sync with system theme changes.
    if (prefersDarkMql && !getSavedTheme()) {
      const handler = () => {
        if (!getSavedTheme()) {
          syncButtons();
          syncHighlightTheme();
        }
      };

      prefersDarkMql.addEventListener?.("change", handler);
      prefersDarkMql.addListener?.(handler);
    }
  };

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init);
  else init();
})();
