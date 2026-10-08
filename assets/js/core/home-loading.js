/* A short entrance tied to local critical assets, never remote model/weather loading. */
(function () {
  "use strict";
  var overlay = document.getElementById("home-loading-screen");
  if (!overlay) return;
  var hidden = false,
    started = performance.now(),
    finishTimer = 0;
  var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var main = document.getElementById("main");
  if (main) main.setAttribute("aria-busy", "true");
  var deadline = setTimeout(hide, 1800);
  function hide() {
    if (hidden) return;
    hidden = true;
    clearTimeout(deadline);
    clearTimeout(finishTimer);
    overlay.classList.add("is-hidden");
    document.body.classList.remove("home-loading");
    if (main) main.setAttribute("aria-busy", "false");
    document.removeEventListener("pointerdown", hide, true);
    document.removeEventListener("keydown", hide, true);
    setTimeout(
      function () {
        overlay.remove();
      },
      reduced ? 0 : 200
    );
  }
  function ready() {
    if (hidden) return;
    var portrait = document.querySelector(
      '.author__avatar-image[data-avatar-character="' +
        document.documentElement.dataset.live2dCharacter +
        '"]'
    );
    var assets = [];
    if (portrait && portrait.decode) assets.push(portrait.decode());
    if (document.fonts) {
      assets.push(document.fonts.load('16px "W95FA"'));
      assets.push(document.fonts.load('12px "Fusion Pixel"'));
    }
    Promise.allSettled(assets).then(function () {
      if (!hidden)
        finishTimer = setTimeout(
          hide,
          Math.max(0, (reduced ? 0 : 600) - (performance.now() - started))
        );
    });
  }
  document.addEventListener("pointerdown", hide, true);
  document.addEventListener("keydown", hide, true);
  document.addEventListener("site:before-content-replace", hide, {
    once: true,
  });
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) hide();
  });
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();
})();
