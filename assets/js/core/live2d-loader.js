(function () {
  var LIB_URL = "https://cdn.jsdelivr.net/npm/live2d-widget@3.1.4/lib/L2Dwidget.min.js";
  var WIDGET_RATIO = 1.52;
  var resizeTimer = 0;
  var preferenceStorageKey = "site-live2d-enabled";

  function isPreferenceEnabled() {
    var attr = document.documentElement.getAttribute("data-live2d-enabled");
    if (attr === "true") return true;
    if (attr === "false") return false;

    try {
      var stored = localStorage.getItem(preferenceStorageKey);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch (e) {
      // ignore storage failures
    }

    return true;
  }

  function shouldDisableLive2D() {
    return (
      (document.body && document.body.getAttribute("data-disable-live2d") === "true") ||
      !isPreferenceEnabled()
    );
  }

  function syncVisibilityClass() {
    if (!document.body) return;
    document.body.classList.toggle("live2d-is-hidden", shouldDisableLive2D());
  }

  function getModelPath() {
    if (window.__siteLive2DConfig && window.__siteLive2DConfig.modelPath) {
      return window.__siteLive2DConfig.modelPath;
    }
    return "https://cdn.jsdelivr.net/gh/evrstr/live2d-widget-models/live2d_evrstr/kp31_310/model.json";
  }

  function getDisplayConfig() {
    var viewportWidth = window.innerWidth || document.documentElement.clientWidth || 1280;
    var isSmallScreen = viewportWidth < 980;
    var width = Math.round(Math.max(180, Math.min(360, viewportWidth * 0.24)));
    var height = Math.round(width * WIDGET_RATIO);
    var hOffsetRatio = isSmallScreen ? 0.14 : 0.19;
    var vOffsetRatio = isSmallScreen ? 0.55 : 0.6;

    return {
      position: "right",
      width: width,
      height: height,
      hOffset: -Math.round(width * hOffsetRatio),
      vOffset: -Math.round(height * vOffsetRatio)
    };
  }

  function applyResponsiveSize() {
    var display = getDisplayConfig();
    var widget = document.getElementById("live2d-widget");
    var canvas = document.getElementById("live2dcanvas");

    if (!widget || !canvas) return false;

    widget.style.width = display.width + "px";
    widget.style.height = display.height + "px";
    widget.style.right = display.hOffset + "px";
    widget.style.bottom = display.vOffset + "px";

    canvas.style.width = display.width + "px";
    canvas.style.height = display.height + "px";
    canvas.width = display.width;
    canvas.height = display.height;
    return true;
  }

  function syncAfterInit() {
    var attempts = 0;
    function tick() {
      attempts += 1;
      if (applyResponsiveSize() || attempts > 90) return;
      window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  function scheduleResponsiveSync() {
    if (resizeTimer) {
      window.clearTimeout(resizeTimer);
    }
    resizeTimer = window.setTimeout(function () {
      applyResponsiveSize();
    }, 80);
  }

  function bindResponsiveEvents() {
    if (window.__siteLive2DResponsiveBound) return;
    window.__siteLive2DResponsiveBound = true;
    window.addEventListener("resize", scheduleResponsiveSync);
    window.addEventListener("orientationchange", scheduleResponsiveSync);
    document.addEventListener("site:content-updated", scheduleResponsiveSync);
  }

  function loadLibrary() {
    if (window.L2Dwidget) return Promise.resolve();
    if (window.__siteLive2DLibraryPromise) return window.__siteLive2DLibraryPromise;

    window.__siteLive2DLibraryPromise = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + LIB_URL + '"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      var script = document.createElement("script");
      script.src = LIB_URL;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return window.__siteLive2DLibraryPromise;
  }

  function initLive2D() {
    syncVisibilityClass();
    if (shouldDisableLive2D()) return;
    bindResponsiveEvents();

    loadLibrary()
      .then(function () {
        if (!window.L2Dwidget || typeof window.L2Dwidget.init !== "function") return;

        if (!window.__siteLive2DInitialized) {
          window.__siteLive2DInitialized = true;
          window.L2Dwidget.init({
            model: {
              jsonPath: getModelPath()
            },
            display: getDisplayConfig(),
            mobile: {
              show: false,
              scale: 0.25,
              motion: false
            }
          });
          syncAfterInit();
          return;
        }

        scheduleResponsiveSync();
      })
      .catch(function () {
        // Live2D is decorative; do not block the page if it fails.
      });
  }

  document.addEventListener("site:content-updated", initLive2D);
  document.addEventListener("site:live2d-toggle", initLive2D);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLive2D);
  } else {
    initLive2D();
  }
})();
