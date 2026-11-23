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
  function characterIcon(id) {
    var config = scope.__siteLive2DConfig || {};
    var character = (config.characters || []).find(function (entry) {
      return entry.id === id;
    });
    return url(
      (character && character.icon) || "/assets/images/classic/characters/" + id + ".svg"
    );
  }
  // The shared sprite contains both pixel artwork and single-color controls.
  function icon(name) {
    return (
      '<svg width="16" height="16" aria-hidden="true" focusable="false" fill="currentColor" shape-rendering="crispEdges"><use href="#classic-icon-' +
      name +
      '"></use></svg>'
    );
  }
  scope.SiteAssets = Object.freeze({
    base: base,
    url: url,
    icon: icon,
    characterIcon: characterIcon,
  });
})(window);
