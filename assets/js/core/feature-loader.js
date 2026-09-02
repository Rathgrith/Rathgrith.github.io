(function () {
  var homeProfilePanelScrollBound = false;
  var homeProfilePanelFrame = null;
  var homeProfilePanelMotionFrame = null;
  var featureAssetVersion = "";

  try {
    var loaderScript = document.currentScript;
    if (loaderScript && loaderScript.src) {
      featureAssetVersion =
        new URL(loaderScript.src, window.location.href).searchParams.get("v") ||
        "";
    }
  } catch (error) {
    featureAssetVersion = "";
  }

  function normaliseBaseUrl(raw) {
    var value = String(raw || "/").trim();
    if (!value) value = "/";
    if (value.charAt(0) !== "/") value = "/" + value;
    if (value.charAt(value.length - 1) !== "/") value += "/";
    return value;
  }

  function resolveAssetUrl(baseUrl, assetPath) {
    var base = normaliseBaseUrl(baseUrl);
    var cleaned = String(assetPath || "").replace(/^\/+/, "");
    var resolved = base + cleaned;
    if (!featureAssetVersion) return resolved;
    return (
      resolved +
      (resolved.indexOf("?") === -1 ? "?" : "&") +
      "v=" +
      encodeURIComponent(featureAssetVersion)
    );
  }

  function ensureStylesheet(id, href) {
    var existingById = document.getElementById(id);
    if (existingById) return existingById;

    var links = document.querySelectorAll("link[rel='stylesheet']");
    for (var i = 0; i < links.length; i++) {
      if (links[i].href === new URL(href, window.location.href).href) {
        return links[i];
      }
    }

    var link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);
    return link;
  }

  function loadScriptOnce(cacheKey, src) {
    if (window[cacheKey]) return window[cacheKey];

    var existing = document.querySelector('script[src="' + src + '"]');
    if (existing) {
      window[cacheKey] = Promise.resolve();
      return window[cacheKey];
    }

    window[cacheKey] = new Promise(function (resolve, reject) {
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return window[cacheKey];
  }

  function initMusicPlayerFeature() {
    var player = document.querySelector("[data-music-player]");
    if (!player) return;

    var baseUrl = normaliseBaseUrl(
      player.getAttribute("data-music-baseurl") || "/"
    );
    var cssHref = resolveAssetUrl(
      baseUrl,
      "assets/css/components/music-player.css"
    );
    var jsSrc = resolveAssetUrl(
      baseUrl,
      "assets/js/components/music-player.js"
    );

    ensureStylesheet("site-music-player-styles", cssHref);

    if (typeof window.__siteInitMusicPlayers === "function") {
      window.__siteInitMusicPlayers();
      return;
    }

    loadScriptOnce("__siteMusicPlayerScriptPromise", jsSrc)
      .then(function () {
        if (typeof window.__siteInitMusicPlayers === "function") {
          window.__siteInitMusicPlayers();
        }
      })
      .catch(function () {
        // Keep the page usable when optional features fail to load.
      });
  }

  function initWeatherWidgetFeature() {
    var widget = document.querySelector("[data-weather-widget]");
    if (!widget) return;

    var baseUrl = normaliseBaseUrl(
      widget.getAttribute("data-weather-baseurl") || "/"
    );
    var cssHref = resolveAssetUrl(
      baseUrl,
      "assets/css/components/weather-widget.css"
    );
    var jsSrc = resolveAssetUrl(
      baseUrl,
      "assets/js/components/weather-widget.js"
    );

    ensureStylesheet("site-weather-widget-styles", cssHref);

    if (typeof window.__siteInitWeatherWidgets === "function") {
      window.__siteInitWeatherWidgets();
      return;
    }

    loadScriptOnce("__siteWeatherWidgetScriptPromise", jsSrc)
      .then(function () {
        if (typeof window.__siteInitWeatherWidgets === "function") {
          window.__siteInitWeatherWidgets();
        }
      })
      .catch(function () {
        // The default sidebar remains usable when weather data is unavailable.
      });
  }

  function syncHomeProfilePanelState() {
    if (!document.body) return;

    var isHomePage = document.body.classList.contains("home-page");
    var shouldLift = isHomePage && window.pageYOffset > 24;

    document.body.classList.toggle("profile-panel-is-scrolled", shouldLift);

    if (!isHomePage) {
      document.body.classList.remove("profile-panel-motion-ready");
    }
  }

  function enableHomeProfilePanelMotion() {
    if (!document.body || !document.body.classList.contains("home-page"))
      return;
    if (document.body.classList.contains("profile-panel-motion-ready")) return;
    if (homeProfilePanelMotionFrame) return;

    var markReady = function () {
      homeProfilePanelMotionFrame = null;
      if (!document.body || !document.body.classList.contains("home-page"))
        return;
      document.body.classList.add("profile-panel-motion-ready");
    };

    if (typeof window.requestAnimationFrame === "function") {
      homeProfilePanelMotionFrame = window.requestAnimationFrame(function () {
        homeProfilePanelMotionFrame = window.requestAnimationFrame(markReady);
      });
    } else {
      homeProfilePanelMotionFrame = window.setTimeout(markReady, 0);
    }
  }

  function requestHomeProfilePanelState() {
    if (homeProfilePanelFrame) return;

    if (typeof window.requestAnimationFrame !== "function") {
      syncHomeProfilePanelState();
      return;
    }

    homeProfilePanelFrame = window.requestAnimationFrame(function () {
      homeProfilePanelFrame = null;
      syncHomeProfilePanelState();
    });
  }

  function initHomeProfilePanelTransition() {
    syncHomeProfilePanelState();
    enableHomeProfilePanelMotion();

    if (homeProfilePanelScrollBound) return;
    homeProfilePanelScrollBound = true;

    window.addEventListener("scroll", requestHomeProfilePanelState, {
      passive: true,
    });
    window.addEventListener("resize", requestHomeProfilePanelState);
  }

  function bootOptionalFeatures() {
    initMusicPlayerFeature();
    initWeatherWidgetFeature();
    initHomeProfilePanelTransition();
  }

  document.addEventListener("site:content-updated", bootOptionalFeatures);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootOptionalFeatures);
  } else {
    bootOptionalFeatures();
  }
})();
