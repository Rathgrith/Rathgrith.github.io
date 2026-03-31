(function () {
  function init() {
    var nav = document.getElementById("site-nav");
    if (!nav) return;

    var button = nav.querySelector("button");
    var hiddenLinks = nav.querySelector(".hidden-links");
    if (!button || !hiddenLinks) return;

    if (button.getAttribute("data-nav-a11y-bound") === "true") return;
    button.setAttribute("data-nav-a11y-bound", "true");

    function rebalanceCollapsedLinks() {
      if (typeof window.updateNav !== "function") return;
      var guard = 0;
      var previousHiddenCount = -1;

      while (guard < 40) {
        guard += 1;
        var hiddenCount = hiddenLinks.children.length;
        if (hiddenCount === previousHiddenCount) break;
        previousHiddenCount = hiddenCount;
        window.updateNav();
      }
    }

    function sync() {
      var isOpen = !hiddenLinks.classList.contains("hidden");
      button.setAttribute("aria-expanded", isOpen ? "true" : "false");
      button.setAttribute("aria-label", isOpen ? "Close navigation menu" : "Open navigation menu");
      hiddenLinks.setAttribute("aria-hidden", isOpen ? "false" : "true");
    }

    rebalanceCollapsedLinks();
    sync();
    button.addEventListener("click", function () {
      window.setTimeout(sync, 0);
    });
    window.addEventListener("resize", function () {
      window.setTimeout(function () {
        rebalanceCollapsedLinks();
        sync();
      }, 0);
    });

    if (window.MutationObserver) {
      var observer = new MutationObserver(sync);
      observer.observe(hiddenLinks, {
        attributes: true,
        attributeFilter: ["class"]
      });
    }

    document.addEventListener("site:content-updated", function () {
      window.setTimeout(function () {
        rebalanceCollapsedLinks();
        sync();
      }, 0);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
