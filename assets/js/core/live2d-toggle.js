(function () {
  var storageKey = "site-live2d-enabled";
  var enterAnimationTimer = 0;

  function toArray(nodes) {
    return Array.prototype.slice.call(nodes || []);
  }

  function readStoredPreference() {
    try {
      var value = localStorage.getItem(storageKey);
      if (value === "true") return true;
      if (value === "false") return false;
    } catch (e) {
      // ignore storage failures
    }
    return true;
  }

  function persistPreference(enabled) {
    try {
      localStorage.setItem(storageKey, enabled ? "true" : "false");
    } catch (e) {
      // ignore storage failures
    }
  }

  function isPageDisabled() {
    return document.body && document.body.getAttribute("data-disable-live2d") === "true";
  }

  function labelFor(enabled) {
    return enabled ? "Hide Live2D" : "Show Live2D";
  }

  function iconClassFor(enabled) {
    return enabled ? "fa-user-astronaut" : "fa-user-slash";
  }

  function dispatchToggle(enabled) {
    var event;
    var detail = { enabled: enabled };
    if (typeof window.CustomEvent === "function") {
      event = new CustomEvent("site:live2d-toggle", { detail: detail });
    } else {
      event = document.createEvent("CustomEvent");
      event.initCustomEvent("site:live2d-toggle", false, false, detail);
    }
    document.dispatchEvent(event);
  }

  function applyBodyVisibility(enabled, withEnterAnimation) {
    if (!document.body) return;
    document.body.classList.toggle("live2d-is-hidden", !enabled);

    if (enterAnimationTimer) {
      window.clearTimeout(enterAnimationTimer);
      enterAnimationTimer = 0;
    }

    if (enabled && withEnterAnimation) {
      document.body.classList.add("live2d-is-entering");
      enterAnimationTimer = window.setTimeout(function () {
        if (!document.body) return;
        document.body.classList.remove("live2d-is-entering");
      }, 360);
    } else {
      document.body.classList.remove("live2d-is-entering");
    }
  }

  function ensureFallbackButton() {
    if (!document.body) return null;

    var fallback = document.querySelector('[data-live2d-toggle-generated="true"]');
    if (fallback) return fallback;

    fallback = document.createElement("button");
    fallback.type = "button";
    fallback.className = "live2d-toggle live2d-toggle--floating";
    fallback.setAttribute("data-live2d-toggle", "true");
    fallback.setAttribute("data-live2d-toggle-generated", "true");
    fallback.setAttribute("aria-pressed", "true");
    document.body.appendChild(fallback);
    return fallback;
  }

  function removeFallbackButton() {
    var fallback = document.querySelector('[data-live2d-toggle-generated="true"]');
    if (fallback && fallback.parentNode) {
      fallback.parentNode.removeChild(fallback);
    }
  }

  function resolveButtons() {
    var explicitButtons = toArray(
      document.querySelectorAll('[data-live2d-toggle]:not([data-live2d-toggle-generated="true"])')
    );

    if (explicitButtons.length > 0) {
      removeFallbackButton();
      return explicitButtons;
    }

    var fallback = ensureFallbackButton();
    return fallback ? [fallback] : [];
  }

  function renderButton(button, enabled) {
    var label = labelFor(enabled);
    var isMenuStyle = button.getAttribute("data-live2d-toggle-style") === "menu";

    button.setAttribute("aria-label", label);
    button.setAttribute("title", label);
    button.setAttribute("aria-pressed", enabled ? "true" : "false");

    if (isMenuStyle) {
      button.innerHTML = [
        '<span class="site-options-fab__action-icon" aria-hidden="true"><i class="fas ',
        iconClassFor(enabled),
        '"></i></span>',
        '<span class="site-options-fab__action-label">',
        label,
        "</span>"
      ].join("");
      return;
    }

    button.innerHTML = [
      '<i class="fas ',
      iconClassFor(enabled),
      '" aria-hidden="true"></i>',
      '<span class="visually-hidden">',
      label,
      "</span>"
    ].join("");
  }

  function applyPreference(enabled, options) {
    var config = options || {};
    document.documentElement.setAttribute("data-live2d-enabled", enabled ? "true" : "false");
    if (config.persist !== false) {
      persistPreference(enabled);
    }

    applyBodyVisibility(enabled, Boolean(config.animate));

    var buttons = resolveButtons();
    for (var i = 0; i < buttons.length; i += 1) {
      renderButton(buttons[i], enabled);
      buttons[i].hidden = isPageDisabled();
    }

    if (config.dispatch !== false) {
      dispatchToggle(enabled);
    }
  }

  function currentPreference() {
    var attr = document.documentElement.getAttribute("data-live2d-enabled");
    if (attr === "true") return true;
    if (attr === "false") return false;
    return readStoredPreference();
  }

  function syncButtonVisibility() {
    var buttons = resolveButtons();
    var shouldHide = isPageDisabled();
    for (var i = 0; i < buttons.length; i += 1) {
      buttons[i].hidden = shouldHide;
    }
  }

  function bindButtons() {
    var buttons = resolveButtons();

    for (var i = 0; i < buttons.length; i += 1) {
      var button = buttons[i];
      if (button.getAttribute("data-live2d-toggle-bound") === "true") continue;

      button.setAttribute("data-live2d-toggle-bound", "true");
      button.addEventListener("click", function (event) {
        event.preventDefault();

        var nextEnabled = !currentPreference();
        this.classList.remove("is-toggling");
        // Restart keyframe animation on repeated clicks.
        void this.offsetWidth;
        this.classList.add("is-toggling");
        window.setTimeout(
          function (targetButton) {
            targetButton.classList.remove("is-toggling");
          },
          220,
          this
        );

        applyPreference(nextEnabled, {
          persist: true,
          dispatch: true,
          animate: true
        });
      });
    }
  }

  function init() {
    if (!document.body) return;

    var enabled = currentPreference();
    bindButtons();
    applyPreference(enabled, {
      persist: false,
      dispatch: false,
      animate: false
    });
    syncButtonVisibility();
  }

  function handleContentUpdated() {
    if (!document.body) return;
    init();
    syncButtonVisibility();
    applyBodyVisibility(currentPreference(), false);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  document.addEventListener("site:content-updated", handleContentUpdated);
})();
