/* One persisted visibility preference shared by the titlebar and header menu. */
(function () {
  var key = "site-live2d-enabled";
  var enabled = true;
  try {
    enabled = localStorage.getItem(key) !== "false";
  } catch (_) {}

  function render() {
    var disabled = document.body.dataset.disableLive2d === "true";
    document.documentElement.dataset.live2dEnabled = String(enabled);
    document.body.classList.toggle("live2d-is-hidden", disabled || !enabled);
    document
      .querySelectorAll("[data-live2d-toggle]")
      .forEach(function (button) {
        var label = enabled ? "Hide Live2D" : "Show Live2D";
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

  function set(value) {
    enabled = Boolean(value);
    try {
      localStorage.setItem(key, String(enabled));
    } catch (_) {}
    render();
    document.dispatchEvent(
      new CustomEvent("site:live2d-toggle", { detail: { enabled: enabled } })
    );
  }

  function init() {
    render();
    document
      .querySelectorAll("[data-live2d-toggle]")
      .forEach(function (button) {
        if (button.dataset.visibilityBound) return;
        button.dataset.visibilityBound = "true";
        button.addEventListener("click", function () {
          set(!enabled);
        });
      });
  }
  window.SiteCompanionVisibility = { set: set };
  document.addEventListener("site:content-updated", init);
  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
