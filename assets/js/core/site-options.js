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
      window.SiteAssets.icon("options"),
      "</button>",
      '<div id="site-options-menu" class="site-options-fab__menu" data-site-options-menu role="group" aria-label="Options" hidden>',
      '<button type="button" class="site-options-fab__action" data-live2d-toggle data-live2d-toggle-style="menu" lang="ja"></button>',
      document.getElementById("visitor-map-dialog")
        ? '<button type="button" class="site-options-fab__action" data-visitor-map-open aria-haspopup="dialog" aria-controls="visitor-map-dialog"><span class="site-options-fab__action-icon"><img width="16" height="16" alt="" src="' + window.SiteAssets.url("/assets/images/classic/icons/16/mailbox_world-1.png") + '"></span>Visitor map</button>'
        : "",
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
      trigger.title = isOpen ? "Close options" : "Open options";
      trigger.setAttribute("aria-label", trigger.title);
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
      // An action can replace its icon or label before this event bubbles.
      if (!event.composedPath().some(function (node) {
        return node instanceof HTMLButtonElement;
      })) return;
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
      var step = event.key === "ArrowDown" ? 1 : -1;
      if (index < 0 && step < 0) index = 0;
      actions[(index + step + actions.length) % actions.length].focus();
    });
    setOpen(false);
  }

  var mapDialog = document.getElementById("visitor-map-dialog");
  if (mapDialog) {
    var mapOpener;
    var tabList = mapDialog.querySelector('[role="tablist"]');
    var mapTabs = Array.from(tabList.querySelectorAll('[role="tab"]'));
    tabList.hidden = false;

    function selectMapTab(tab) {
      mapTabs.forEach(function (other) {
        var selected = other === tab;
        other.setAttribute("aria-selected", String(selected));
        other.tabIndex = selected ? 0 : -1;
        document.getElementById(other.getAttribute("aria-controls")).hidden = !selected;
      });
    }

    tabList.addEventListener("click", function (event) {
      var tab = event.target.closest('[role="tab"]');
      if (tab) selectMapTab(tab);
    });
    tabList.addEventListener("keydown", function (event) {
      var index = mapTabs.indexOf(event.target);
      if (index === -1) return;
      switch (event.key) {
        case "ArrowRight": index = (index + 1) % mapTabs.length; break;
        case "ArrowLeft": index = (index + mapTabs.length - 1) % mapTabs.length; break;
        case "Home": index = 0; break;
        case "End": index = mapTabs.length - 1; break;
        default: return;
      }
      event.preventDefault();
      selectMapTab(mapTabs[index]);
      mapTabs[index].focus();
    });
    document.querySelectorAll("[data-atlas-weather-open]").forEach(function (button) {
      button.hidden = false;
    });
    document.addEventListener("click", function (event) {
      var opener = event.target.closest("[data-visitor-map-open], [data-atlas-weather-open]");
      if (!opener || mapDialog.open) return;
      event.preventDefault();
      mapOpener = opener.closest("[data-site-options-menu]")
        ? document.querySelector("[data-site-options-trigger]") : opener;
      selectMapTab(document.getElementById(
        opener.hasAttribute("data-atlas-weather-open") ? "atlas-weather-tab" : "atlas-visitors-tab"
      ));
      mapDialog.showModal();
    });
    mapDialog.addEventListener("close", function () {
      if (mapOpener && mapOpener.isConnected) mapOpener.focus({ preventScroll: true });
    });
    mapDialog.addEventListener("click", function (event) {
      if (event.target !== mapDialog) return;
      var box = mapDialog.getBoundingClientRect();
      if (event.clientX < box.left || event.clientX > box.right ||
          event.clientY < box.top || event.clientY > box.bottom) mapDialog.close();
    });
    document.addEventListener("site:before-content-replace", function () {
      if (mapDialog.open) mapDialog.close();
    });
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
