(function () {
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
      '<button type="button" class="site-options-fab__action" data-live2d-toggle data-live2d-toggle-style="menu" aria-pressed="true" role="menuitem"></button>',
      '<button type="button" class="site-options-fab__action" data-weather-toggle aria-pressed="false" role="menuitem" hidden></button>',
      "</div>",
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

  function init() {
    bindFloatingOptions(ensureFloatingOptions());
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("site:content-updated", init);
})();
