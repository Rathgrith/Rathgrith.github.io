(function () {
  var globalState = window.__siteVisitsWidgetState || {
    observer: null,
    counterObserver: null,
    theme: "",
    widget: null,
    output: null
  };
  window.__siteVisitsWidgetState = globalState;

  function currentTheme() {
    return document.documentElement.getAttribute("data-theme") || "light";
  }

  function toHexNoHash(colorValue, fallback) {
    var value = String(colorValue || "").trim();
    if (!value) value = String(fallback || "").trim();
    if (!value) return "000000";

    if (value.charAt(0) === "#") {
      var hex = value.slice(1);
      if (hex.length === 3) {
        return hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
      }
      return hex;
    }

    var rgbMatch = value.match(/^rgba?\(([^)]+)\)$/i);
    if (!rgbMatch) return String(fallback || "000000").replace(/^#/, "");

    var channels = rgbMatch[1].split(",");
    var r = Math.max(0, Math.min(255, Math.round(parseFloat(channels[0]) || 0)));
    var g = Math.max(0, Math.min(255, Math.round(parseFloat(channels[1]) || 0)));
    var b = Math.max(0, Math.min(255, Math.round(parseFloat(channels[2]) || 0)));
    return [r, g, b]
      .map(function (n) {
        var h = n.toString(16);
        return h.length === 1 ? "0" + h : h;
      })
      .join("");
  }

  function readVarHex(varName, fallback) {
    var raw = getComputedStyle(document.documentElement).getPropertyValue(varName);
    return toHexNoHash(raw, fallback);
  }

  function sourceFor(theme, token) {
    var common = "w=180&t=tt&d=" + token + "&cmo=3acc3a&cmn=ff5353";
    var background = readVarHex("--bg", theme === "dark" ? "#111214" : "#f5f7fb");
    var foreground = readVarHex("--text", theme === "dark" ? "#e6e8eb" : "#1e2433");
    var accent = readVarHex("--text-muted", theme === "dark" ? "#adb3bc" : "#5b6378");
    return "//cdn.clustrmaps.com/map_v2.js?cl=" + foreground + "&co=" + background + "&ct=" + accent + "&" + common;
  }

  function render(widget, theme) {
    var token = (widget.getAttribute("data-clustrmaps-token") || "").trim();
    if (!token) return;

    widget.innerHTML = "";
    var script = document.createElement("script");
    script.type = "text/javascript";
    script.id = "clustrmaps";
    script.async = true;
    script.src = sourceFor(theme, token);
    widget.appendChild(script);
  }

  function extractCounterText(widget) {
    var visitorsNode = widget.querySelector(".clustrmaps-visitors");
    if (!visitorsNode) return "";

    var raw = String(visitorsNode.textContent || "").trim();
    if (!raw) return "";

    var numberMatch = raw.match(/[\d][\d,]*/);
    return numberMatch ? numberMatch[0] : raw;
  }

  function syncCounter(widget, output) {
    if (!output) return;
    var value = extractCounterText(widget);
    if (value) {
      output.textContent = value;
    }
  }

  function observeCounter(widget, output) {
    if (globalState.counterObserver) {
      globalState.counterObserver.disconnect();
      globalState.counterObserver = null;
    }

    syncCounter(widget, output);

    if (!window.MutationObserver) return;

    globalState.counterObserver = new MutationObserver(function () {
      syncCounter(widget, output);
    });

    globalState.counterObserver.observe(widget, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function mount() {
    var widget = document.getElementById("site-visit-widget");
    var output = document.getElementById("site-visit-counter");
    if (!widget || !output) return;

    globalState.widget = widget;
    globalState.output = output;

    function sync() {
      var theme = currentTheme();
      if (theme === globalState.theme && globalState.widget === widget && globalState.output === output) return;
      globalState.theme = theme;
      output.textContent = "--";
      render(widget, theme);
      observeCounter(widget, output);
    }

    sync();

    if (globalState.observer) {
      globalState.observer.disconnect();
      globalState.observer = null;
    }

    if (window.MutationObserver) {
      globalState.observer = new MutationObserver(sync);
      globalState.observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["data-theme"]
      });
    }
  }

  if (!window.__siteInitSiteVisitsWidget) {
    window.__siteInitSiteVisitsWidget = mount;
    document.addEventListener("site:content-updated", mount);
  }

  mount();
})();
