(function () {
  var globalState = window.__siteVisitsWidgetState || {
    observer: null,
    widget: null,
    output: null,
    src: ""
  };
  window.__siteVisitsWidgetState = globalState;

  function parseCount(value) {
    var match = String(value || "").match(/[\d][\d,]*/);
    if (!match) return null;

    var parsed = parseInt(match[0].replace(/,/g, ""), 10);
    return isFinite(parsed) ? parsed : null;
  }

  function formatCount(value) {
    return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  function readBaseline(widget, output) {
    var raw =
      (widget && widget.getAttribute("data-site-visit-baseline")) ||
      (output && output.getAttribute("data-site-visit-baseline")) ||
      "0";
    var parsed = parseInt(String(raw).replace(/,/g, ""), 10);
    return isFinite(parsed) && parsed > 0 ? parsed : 0;
  }

  function renderFallback(output, baseline) {
    if (!output) return;
    output.textContent = baseline > 0 ? formatCount(baseline) + "+" : "--";
    output.setAttribute("data-site-visit-status", "fallback");
  }

  function extractMapmyvisitorsCount(widget) {
    var visitorsNode = widget.querySelector(".mapmyvisitors-visitors");
    if (!visitorsNode) return null;
    return parseCount(visitorsNode.textContent);
  }

  function syncCounter(widget, output) {
    if (!widget || !output) return;

    var baseline = readBaseline(widget, output);
    var remoteCount = extractMapmyvisitorsCount(widget);

    if (remoteCount === null) {
      renderFallback(output, baseline);
      return;
    }

    output.textContent = formatCount(baseline + remoteCount);
    output.setAttribute("data-site-visit-status", "live");
  }

  function observeCounter(widget, output) {
    if (globalState.observer) {
      globalState.observer.disconnect();
      globalState.observer = null;
    }

    syncCounter(widget, output);

    if (!window.MutationObserver) return;

    globalState.observer = new MutationObserver(function () {
      syncCounter(widget, output);
    });

    globalState.observer.observe(widget, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function ensureMapmyvisitorsScript(widget, src) {
    var existing = widget.querySelector("#mapmyvisitors");
    if (existing && existing.getAttribute("src") === src) return;

    widget.innerHTML = "";

    if (!src) return;

    var script = document.createElement("script");
    script.type = "text/javascript";
    script.id = "mapmyvisitors";
    script.async = true;
    script.src = src;
    widget.appendChild(script);
  }

  function mount() {
    var widget = document.getElementById("site-visit-widget");
    var output = document.getElementById("site-visit-counter");
    if (!widget || !output) return;

    var src = (widget.getAttribute("data-mapmyvisitors-src") || "").trim();
    var baseline = readBaseline(widget, output);

    globalState.widget = widget;
    globalState.output = output;

    renderFallback(output, baseline);
    observeCounter(widget, output);

    if (src && src !== globalState.src) {
      globalState.src = src;
      ensureMapmyvisitorsScript(widget, src);
    } else if (src) {
      ensureMapmyvisitorsScript(widget, src);
    }
  }

  if (!window.__siteInitSiteVisitsWidget) {
    window.__siteInitSiteVisitsWidget = mount;
    document.addEventListener("site:content-updated", mount);
  }

  mount();
})();
