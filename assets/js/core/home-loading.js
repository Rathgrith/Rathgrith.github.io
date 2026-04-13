(function () {
  var overlay = document.getElementById("home-loading-screen");
  if (!overlay || !document.body) return;

  var hidden = false;
  var fallbackTimer = null;

  function hideOverlay() {
    if (hidden) return;
    hidden = true;

    if (fallbackTimer) {
      window.clearTimeout(fallbackTimer);
      fallbackTimer = null;
    }

    overlay.classList.add("is-hidden");
    document.body.classList.remove("home-loading");

    window.setTimeout(function () {
      if (overlay && overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 360);
  }

  if (document.readyState === "interactive" || document.readyState === "complete") {
    hideOverlay();
  } else {
    document.addEventListener("DOMContentLoaded", hideOverlay, { once: true });
    window.addEventListener("load", hideOverlay, { once: true });
    window.addEventListener("pageshow", hideOverlay, { once: true });
    fallbackTimer = window.setTimeout(hideOverlay, 100);
  }
})();
