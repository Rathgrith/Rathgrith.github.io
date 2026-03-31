(function () {
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
    return base + cleaned;
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

    var baseUrl = normaliseBaseUrl(player.getAttribute("data-music-baseurl") || "/");
    var cssHref = resolveAssetUrl(baseUrl, "assets/css/components/music-player.css");
    var jsSrc = resolveAssetUrl(baseUrl, "assets/js/components/music-player.js");

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

  function bootOptionalFeatures() {
    initMusicPlayerFeature();
  }

  document.addEventListener("site:content-updated", bootOptionalFeatures);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bootOptionalFeatures);
  } else {
    bootOptionalFeatures();
  }
})();
