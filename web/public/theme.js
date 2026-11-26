// Puts a saved light or dark choice on the page before the first paint, so a visitor who picked dark
// never sees a light flash. A file, not an inline script: the site's CSP allows scripts from itself only.
// Kept in step with applyTheme in src/hooks/useTheme.ts; src/hooks/useTheme.test.ts runs both.
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem("isaac-toys:theme:v1"));
    if (saved !== "light" && saved !== "dark") return;
    document.documentElement.setAttribute("data-theme", saved);
    var metas = document.querySelectorAll('meta[name="theme-color"][data-theme-color]');
    for (var i = 0; i < metas.length; i++) {
      metas[i].setAttribute("media", metas[i].getAttribute("data-theme-color") === saved ? "all" : "not all");
    }
  } catch (e) {
    // Storage blocked or unreadable: the system setting decides, as it does for a first visit.
  }
})();
