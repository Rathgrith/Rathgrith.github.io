(function () {
  var LIB_URL = "https://www.unpkg.com/mouse-firework@latest/dist/index.umd.js";

  function shouldEnable() {
    if (!document.body) return false;
    if (!document.body.classList.contains("home-page")) return false;
    if (window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches) return false;
    if ((window.innerWidth || 0) < 1024) return false;
    return true;
  }

  function loadScriptOnce() {
    if (window.__siteMouseFireworkLoaded) return;
    if (window.__siteMouseFireworkLoading) return;

    window.__siteMouseFireworkLoading = true;

    var existing = document.querySelector('script[src="' + LIB_URL + '"]');
    if (existing) {
      window.__siteMouseFireworkLoaded = true;
      return;
    }

    var script = document.createElement("script");
    script.src = LIB_URL;
    script.async = true;
    script.onload = function () {
      window.__siteMouseFireworkLoaded = true;
    };
    script.onerror = function () {
      window.__siteMouseFireworkLoading = false;
    };
    document.head.appendChild(script);
  }

  function boot() {
    if (!shouldEnable()) return;
    loadScriptOnce();
  }

  document.addEventListener("site:content-updated", boot);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
