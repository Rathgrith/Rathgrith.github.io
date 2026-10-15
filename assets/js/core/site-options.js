(function () {
  if (document.body.dataset.playgroundStandalone === "true") return;
  function ensureFloatingOptions() {
    if (!document.body) return null;

    var existing = document.querySelector("[data-site-options-floating]");
    if (existing) return existing;

    var root = document.createElement("div");
    root.className = "site-options-fab";
    root.setAttribute("data-site-options-floating", "true");
    root.innerHTML = [
      '<button type="button" class="site-options-fab__trigger" data-site-options-trigger aria-label="Open options" aria-controls="site-options-menu" aria-expanded="false">',
      '<i class="fas fa-sliders-h" aria-hidden="true"></i>',
      '<span class="visually-hidden">Options</span>',
      "</button>",
      '<div id="site-options-menu" class="site-options-fab__menu" data-site-options-menu role="group" aria-label="Options" hidden>',
      '<button type="button" class="site-options-fab__action" data-live2d-toggle data-live2d-toggle-style="menu" aria-pressed="true"></button>',
      "</div>",
    ].join("");

    var slot = document.querySelector("[data-classic-options-slot]");
    (slot || document.body).appendChild(root);
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
      trigger.setAttribute(
        "aria-label",
        isOpen ? "Close options" : "Open options"
      );
      menu.hidden = !isOpen;
    }

    trigger.addEventListener("click", function (event) {
      event.preventDefault();
      event.stopPropagation();
      setOpen(!root.classList.contains("is-open"));
    });

    document.addEventListener("click", function (event) {
      var inside = event.composedPath
        ? event.composedPath().indexOf(root) !== -1
        : root.contains(event.target);
      if (!inside) {
        setOpen(false);
      }
    });

    root.addEventListener("keydown", function (event) {
      if (event.key === "Escape") {
        setOpen(false);
        trigger.focus();
      }
    });
    root.addEventListener("focusout", function () {
      // Let focus settle before checking keyboard movement out of the disclosure.
      setTimeout(function () {
        if (!root.contains(document.activeElement)) setOpen(false);
      }, 0);
    });
    menu.addEventListener("click", function (event) {
      if (!event.target.closest("button")) return;
      setOpen(false);
      trigger.focus({ preventScroll: true });
    });
    document.addEventListener("site:before-content-replace", function () {
      setOpen(false);
    });

    root.addEventListener("keydown", function (event) {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      event.preventDefault();
      setOpen(true);
      var actions = Array.from(menu.querySelectorAll("button:not([hidden])"));
      if (!actions.length) return;
      var index = actions.indexOf(document.activeElement);
      actions[
        (index + (event.key === "ArrowDown" ? 1 : -1) + actions.length) %
          actions.length
      ].focus();
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
