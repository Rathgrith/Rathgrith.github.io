/* The entrance waits for local assets and gives the wind chimes time to read. */
(function () {
  "use strict";
  var overlay = document.getElementById("home-loading-screen");
  if (!overlay) return;
  var main = document.getElementById("main");
  var loader = overlay.querySelector("[data-loading-min-ms]");
  var minimumMs = Number(loader.dataset.loadingMinMs);
  var hidden = false;
  var minimumElapsed = false;
  var assetsReady = false;
  var minimumTimer;
  var deadline;
  if (main) main.setAttribute("aria-busy", "true");
  overlay.classList.add("is-visible");
  // Time spent parsing before the first paint does not count as visible time.
  var firstFrame = requestAnimationFrame(function () {
    minimumTimer = setTimeout(function () {
      minimumElapsed = true;
      if (assetsReady) hide();
    }, minimumMs);
    deadline = setTimeout(hide, 1800);
  });

  function hide() {
    if (hidden) return;
    hidden = true;
    cancelAnimationFrame(firstFrame);
    clearTimeout(minimumTimer);
    clearTimeout(deadline);
    overlay.classList.add("is-hidden");
    document.body.classList.remove("home-loading");
    if (main) main.setAttribute("aria-busy", "false");
    document.removeEventListener("pointerdown", hide, true);
    document.removeEventListener("keydown", hide, true);
    setTimeout(function () {
      overlay.remove();
    }, matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 160);
  }
  function ready() {
    if (hidden) return;
    var portrait = document.querySelector(
      '.author__avatar-link[data-avatar-character="' +
        document.documentElement.dataset.live2dCharacter +
        '"] img'
    );
    var assets = [];
    if (portrait && portrait.decode) assets.push(portrait.decode());
    if (document.fonts) {
      assets.push(document.fonts.load('16px "W95FA"'));
      assets.push(document.fonts.load('12px "Fusion Pixel"'));
    }
    Promise.allSettled(assets).then(function () {
      assetsReady = true;
      if (minimumElapsed) hide();
    });
  }
  document.addEventListener("pointerdown", hide, true);
  document.addEventListener("keydown", hide, true);
  document.addEventListener("site:before-content-replace", hide, { once: true });
  window.addEventListener("pageshow", function (event) {
    if (event.persisted) hide();
  });
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", ready, { once: true });
  else ready();
})();
