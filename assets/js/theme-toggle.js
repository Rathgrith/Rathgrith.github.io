(function () {
  var storageKey = "site-theme";

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-theme", theme);
    document.documentElement.style.colorScheme = theme === "dark" ? "dark" : "light";
  }

  function nextTheme() {
    return currentTheme() === "dark" ? "light" : "dark";
  }

  function labelFor(theme) {
    return theme === "dark" ? "Light mode" : "Dark mode";
  }

  function persist(theme) {
    try {
      localStorage.setItem(storageKey, theme);
    } catch (e) {
      // ignore storage failures
    }
  }

  function handleToggle(button) {
    var theme = nextTheme();
    applyTheme(theme);
    persist(theme);
    button.textContent = labelFor(theme);
    button.setAttribute("aria-label", labelFor(theme));
  }

  function resolveButton() {
    var button = document.querySelector("[data-theme-toggle]");
    if (button) return button;

    button = document.createElement("button");
    button.type = "button";
    button.className = "theme-toggle";
    button.setAttribute("data-theme-toggle", "true");
    document.body.appendChild(button);
    return button;
  }

  function initButton() {
    var button = resolveButton();
    button.textContent = labelFor(currentTheme());
    button.setAttribute("aria-label", labelFor(currentTheme()));
    button.addEventListener("click", function () {
      handleToggle(button);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initButton);
  } else {
    initButton();
  }
})();
