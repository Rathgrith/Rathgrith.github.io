/* Live2D starts enabled; phone/tablet and desktop keep separate saved preferences. */
(function () {
  var mobile = matchMedia("(max-width: 999px)");
  var preferences = { desktop: true, mobile: true };
  var keys = {
    desktop: "site-live2d-enabled",
    mobile: "site-live2d-mobile-enabled",
  };
  Object.keys(keys).forEach(function (mode) {
    try {
      var saved = localStorage.getItem(keys[mode]);
      if (saved !== null) preferences[mode] = saved === "true";
    } catch (_) {}
  });
  function mode() {
    return mobile.matches ? "mobile" : "desktop";
  }
  function render() {
    var enabled = preferences[mode()];
    var disabled = document.body.dataset.disableLive2d === "true";
    document.documentElement.dataset.live2dEnabled = String(enabled);
    document.body.classList.toggle("live2d-is-hidden", disabled || !enabled);
    document
      .querySelectorAll("[data-live2d-toggle]")
      .forEach(function (button) {
        var label = enabled ? "Playground を閉じる" : "Playground を開く";
        button.hidden = disabled;
        button.setAttribute("aria-pressed", String(enabled));
        button.setAttribute("aria-label", label);
        button.innerHTML =
          '<span class="site-options-fab__action-icon" aria-hidden="true"><i class="fas ' +
          (enabled ? "fa-user-astronaut" : "fa-user-slash") +
          '"></i></span><span class="site-options-fab__action-label">' +
          label +
          "</span>";
      });
  }
  function notify(userInitiated, layoutChanged) {
    document.dispatchEvent(
      new CustomEvent("site:live2d-toggle", {
        detail: {
          enabled: preferences[mode()],
          userInitiated: Boolean(userInitiated),
          layoutChanged: Boolean(layoutChanged),
        },
      })
    );
  }
  function set(value) {
    preferences[mode()] = Boolean(value);
    try {
      localStorage.setItem(keys[mode()], String(Boolean(value)));
    } catch (_) {}
    render();
    notify(true, false);
  }
  function init() {
    render();
    document
      .querySelectorAll("[data-live2d-toggle]")
      .forEach(function (button) {
        if (button.dataset.visibilityBound) return;
        button.dataset.visibilityBound = "true";
        button.addEventListener("click", function () {
          set(!preferences[mode()]);
        });
      });
  }
  mobile.addEventListener("change", function () {
    render();
    notify(false, true);
  });
  window.SiteCompanionVisibility = { set: set };
  document.addEventListener("site:content-updated", init);
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
