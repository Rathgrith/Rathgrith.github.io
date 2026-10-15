/* Deployment-relative paths for dynamically created UI, sprites and audio. */
(function (scope) {
  "use strict";
  var script = document.currentScript;
  var base = (script && script.dataset.siteBase) || "/";
  // Only the local mount path belongs here; external resources retain their URL.
  base = new URL(base, location.href).pathname.replace(/\/+$/, "");
  function url(path) {
    if (
      typeof path !== "string" ||
      path.charAt(0) !== "/" ||
      path.charAt(1) === "/"
    )
      return path;
    if (base && (path === base || path.indexOf(base + "/") === 0)) return path;
    return base + path;
  }
  scope.SiteAssets = Object.freeze({ base: base, url: url });
})(window);
