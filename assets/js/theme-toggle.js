(function () {
  var storageKey = "site-theme";

  function toArray(nodes) {
    return Array.prototype.slice.call(nodes || []);
  }

  function currentTheme() {
    var theme = document.documentElement.getAttribute("data-theme");
    return theme === "dark" ? "dark" : "light";
  }

  function applyTheme(theme) {
    var resolved = theme === "dark" ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", resolved);
    document.documentElement.style.colorScheme = resolved === "dark" ? "dark" : "light";
  }

  function nextTheme() {
    return currentTheme() === "dark" ? "light" : "dark";
  }

  function labelFor(theme) {
    return theme === "dark" ? "Light mode" : "Dark mode";
  }

  function iconClassFor(theme) {
    return theme === "dark" ? "fa-sun" : "fa-moon";
  }

  function persist(theme) {
    try {
      localStorage.setItem(storageKey, theme);
    } catch (e) {
      // ignore storage failures
    }
  }

  function ensureFloatingOptions() {
    if (!document.body) return null;

    var existing = document.querySelector("[data-site-options-floating]");
    if (existing) return existing;

    var root = document.createElement("div");
    root.className = "site-options-fab";
    root.setAttribute("data-site-options-floating", "true");
    root.innerHTML = [
      '<button type="button" class="site-options-fab__trigger" data-site-options-trigger aria-label="Open options" aria-haspopup="true" aria-expanded="false">',
      '<i class="fas fa-sliders-h" aria-hidden="true"></i>',
      '<span class="visually-hidden">Options</span>',
      "</button>",
      '<div class="site-options-fab__menu" data-site-options-menu role="menu" hidden>',
      '<button type="button" class="site-options-fab__action" data-theme-toggle data-theme-toggle-style="menu" aria-pressed="false" role="menuitem"></button>',
      '<button type="button" class="site-options-fab__action" data-live2d-toggle data-live2d-toggle-style="menu" aria-pressed="true" role="menuitem"></button>',
      "</div>"
    ].join("");

    document.body.appendChild(root);
    return root;
  }

  function bindFloatingOptions(root) {
    if (!root) return;
    if (root.getAttribute("data-site-options-bound") === "true") return;
    root.setAttribute("data-site-options-bound", "true");

    var trigger = root.querySelector("[data-site-options-trigger]");
    var menu = root.querySelector("[data-site-options-menu]");
    if (!trigger || !menu) return;

    function setOpen(isOpen) {
      root.classList.toggle("is-open", isOpen);
      trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      menu.hidden = !isOpen;
    }

    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!root.classList.contains("is-open"));
    });

    document.addEventListener("click", function (event) {
      if (!root.contains(event.target)) {
        setOpen(false);
      }
    });

    root.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.focus();
      }
    });

    setOpen(false);
  }

  function themeButtons() {
    return toArray(document.querySelectorAll("[data-theme-toggle]"));
  }

  function renderButton(button) {
    var theme = currentTheme();
    var label = labelFor(theme);
    var isMenuStyle = button.getAttribute("data-theme-toggle-style") === "menu";

    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("aria-pressed", theme === "dark" ? "true" : "false");

    if (isMenuStyle) {
      button.innerHTML = [
        '<span class="site-options-fab__action-icon" aria-hidden="true"><i class="fas ',
        iconClassFor(theme),
        '"></i></span>',
        '<span class="site-options-fab__action-label">',
        label,
        "</span>"
      ].join("");
      return;
    }

    button.innerHTML = [
      '<i class="fas ',
      iconClassFor(theme),
      '" aria-hidden="true"></i>',
      '<span class="visually-hidden">',
      label,
      "</span>"
    ].join("");
  }

  function syncButtons() {
    var buttons = themeButtons();
    for (var i = 0; i < buttons.length; i += 1) {
      renderButton(buttons[i]);
    }
  }

  function bindButtons() {
    var buttons = themeButtons();
    for (var i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      if (button.getAttribute("data-theme-toggle-bound") === "true") continue;

      button.setAttribute("data-theme-toggle-bound", "true");
      button.addEventListener("click", function (event) {
        event.preventDefault();
        applyTheme(nextTheme());
        persist(currentTheme());
        syncButtons();
      });
    }
  }

  function init() {
    bindFloatingOptions(ensureFloatingOptions());
    bindButtons();
    syncButtons();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("site:content-updated", init);
})();
