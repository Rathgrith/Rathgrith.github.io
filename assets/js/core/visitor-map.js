/* Mount one native visitor map per production document. */
(function () {
  var mount = document.querySelector("[data-visitor-map-mount]");
  var embed = document.getElementById("visitor-map-embed");
  if (!mount || !embed || mount.dataset.visitorMapState) return;
  var status = document.querySelector("[data-visitor-map-status]");
  function setStatus(state, message) {
    if (mount.dataset.visitorMapState === state && status.textContent === message) return;
    mount.dataset.visitorMapState = state;
    status.textContent = message;
  }
  if (location.hostname !== mount.dataset.visitorMapHost) {
    setStatus("preview", "Live visitor dots are on the published site. Preview visits are not counted.");
    return;
  }

  var widget = document.importNode(embed.content, true);
  var provider = widget.querySelector("script[src]");
  // The provider plots against its configured pixel width. Scale the whole
  // native widget, including its link and overlays, without re-running it.
  var width = Number(new URL(provider.src).searchParams.get("w"));
  var surface = mount.parentElement;
  function fitMap() {
    var available = surface.clientWidth;
    if (!available || !surface.getClientRects().length) return;
    mount.style.setProperty("--visitor-map-zoom", Math.min(1, available / width));
    var host = mount.querySelector(".mapmyvisitors-map");
    if (!host || !window.vmap_jq) return;
    var map = window.vmap_jq(host).children(".jvectormap-container").data("mapObject");
    // jVectorMap measures a hidden dialog as 100×100. Only its existing
    // renderer needs resizing when the original, fixed-size map becomes visible.
    if (map && (Math.abs(map.width - host.clientWidth) > 1 || Math.abs(map.height - host.clientHeight) > 1))
      map.updateSize();
  }
  function unavailable() {
    setStatus("unavailable", "Live locations unavailable.");
  }
  function inspectMap() {
    var host = mount.querySelector(".mapmyvisitors-map");
    if (mount.querySelector(".mapmyvisitors-failed")) { unavailable(); return; }
    if (!host || !host.querySelector("svg") || host.querySelector(".mapmyvisitors-loading")) return;
    fitMap();
    var count = host.querySelectorAll("circle.jvectormap-marker").length;
    clearTimeout(loadTimeout);
    setStatus(count ? "allowed" : "empty", count
      ? count + (count === 1 ? " recent location marker." : " recent location markers.")
      : "No recent locations reported.");
  }
  setStatus("loading", "Loading recent visitor locations…");
  var loadTimeout = setTimeout(unavailable, 15000);
  mount.style.setProperty("--visitor-map-width", width + "px");
  new MutationObserver(inspectMap).observe(mount, {childList:true, subtree:true, attributes:true, attributeFilter:["class"]});
  if (window.ResizeObserver) new ResizeObserver(fitMap).observe(surface);
  else {
    window.addEventListener("resize", fitMap);
    new MutationObserver(fitMap).observe(mount.closest("dialog"), {attributes:true, subtree:true, attributeFilter:["open","hidden"]});
  }
  provider.addEventListener("error", function () {
    clearTimeout(loadTimeout);
    unavailable();
  });
  mount.appendChild(widget);
})();
