(function () {
  var PIXI_URL =
    "https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js";
  var CUBISM_CORE_URL =
    "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";
  var LIVE2D_DISPLAY_URL =
    "https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js";
  var WIDGET_RATIO = 1.52;
  var EXPRESSION_SEQUENCE = [
    { stateIndex: 0, hold: 6500 },
    { stateIndex: 1, hold: 2800 },
    { stateIndex: 0, hold: 6000 },
    { stateIndex: 2, hold: 2200 },
  ];
  var preferenceStorageKey = "site-live2d-enabled";
  var characterStorageKey = "site-live2d-character";
  var resizeTimer = 0;
  var focusFrame = 0;
  var lastPointerPosition = null;
  var application = null;
  var currentModel = null;
  var currentCharacterId = "";
  var modelLoadGeneration = 0;
  var expressionTimer = 0;
  var expressionModel = null;
  var expressionHandler = null;
  var expressionCurrentValues = {};
  var expressionTargetValues = {};
  var expressionSequenceIndex = 0;
  var expressionLastUpdate = 0;

  var fallbackCharacters = [
    {
      id: "marisa",
      name: "Marisa",
      expressionMotionIds: ["01", "02", "07"],
      modelPath:
        "https://raw.githubusercontent.com/n0099/TouhouCannonBall-Live2d-Models/main/Marisa/object_live2d_002_101.asset.model3.json",
    },
    {
      id: "alice",
      name: "Alice",
      expressionMotionIds: ["01", "02", "07"],
      modelPath:
        "https://raw.githubusercontent.com/n0099/TouhouCannonBall-Live2d-Models/main/Alice/object_live2d_014_101.asset.model3.json",
    },
    {
      id: "patchouli",
      name: "Patchouli",
      expressionMotionIds: ["01", "02", "07"],
      modelPath:
        "https://raw.githubusercontent.com/n0099/TouhouCannonBall-Live2d-Models/main/Patchouli/object_live2d_008_101.asset.model3.json",
    },
  ];

  function isPreferenceEnabled() {
    var attr = document.documentElement.getAttribute("data-live2d-enabled");
    if (attr === "true") return true;
    if (attr === "false") return false;

    try {
      var stored = localStorage.getItem(preferenceStorageKey);
      if (stored === "true") return true;
      if (stored === "false") return false;
    } catch (e) {
      // Ignore storage failures.
    }

    return true;
  }

  function isPageDisabled() {
    return Boolean(
      document.body &&
        document.body.getAttribute("data-disable-live2d") === "true"
    );
  }

  function isPhoneViewport() {
    var viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 1280;
    return viewportWidth < 600;
  }

  function prefersReducedMotion() {
    return Boolean(
      window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function shouldDisableLive2D() {
    return isPageDisabled() || !isPreferenceEnabled();
  }

  function shouldRenderLive2D() {
    return !shouldDisableLive2D() && !isPhoneViewport();
  }

  function syncVisibilityClass() {
    if (!document.body) return;
    document.body.classList.toggle("live2d-is-hidden", shouldDisableLive2D());
  }

  function getCharacters() {
    var configured =
      window.__siteLive2DConfig && window.__siteLive2DConfig.characters;
    if (configured && configured.length) return configured;
    return fallbackCharacters;
  }

  function getCharacter(characterId) {
    var characters = getCharacters();
    for (var i = 0; i < characters.length; i += 1) {
      if (characters[i].id === characterId) return characters[i];
    }
    return null;
  }

  function getDefaultCharacterId() {
    var configured =
      window.__siteLive2DConfig &&
      window.__siteLive2DConfig.defaultCharacter;
    if (configured && getCharacter(configured)) return configured;
    return getCharacters()[0].id;
  }

  function getSelectedCharacterId() {
    var stored = "";
    try {
      stored = localStorage.getItem(characterStorageKey) || "";
    } catch (e) {
      // Ignore storage failures.
    }

    return getCharacter(stored) ? stored : getDefaultCharacterId();
  }

  function persistSelectedCharacter(characterId) {
    try {
      localStorage.setItem(characterStorageKey, characterId);
    } catch (e) {
      // Ignore storage failures.
    }
  }

  function syncCharacterTheme(characterId) {
    var character = getCharacter(characterId) ||
      getCharacter(getDefaultCharacterId());
    if (!character) return;
    document.documentElement.setAttribute(
      "data-live2d-character",
      character.id
    );
  }

  function getDisplayConfig() {
    var viewportWidth =
      window.innerWidth || document.documentElement.clientWidth || 1280;
    var width;
    var hOffsetRatio;
    var vOffsetRatio;

    if (viewportWidth < 980) {
      width = Math.round(
        Math.max(170, Math.min(205, viewportWidth * 0.22))
      );
      hOffsetRatio = 0.35;
      vOffsetRatio = 0.45;
    } else if (viewportWidth < 1450) {
      width = Math.round(
        Math.max(210, Math.min(300, viewportWidth * 0.205))
      );
      hOffsetRatio = 0.24;
      vOffsetRatio = 0.45;
    } else {
      width = Math.round(
        Math.max(300, Math.min(360, viewportWidth * 0.24))
      );
      hOffsetRatio = 0.06;
      vOffsetRatio = 0.45;
    }

    var height = Math.round(width * WIDGET_RATIO);

    return {
      width: width,
      height: height,
      right: -Math.round(width * hOffsetRatio),
      bottom: -Math.round(height * vOffsetRatio),
    };
  }

  function ensureWidget() {
    if (!document.body) return null;

    var widget = document.getElementById("live2d-widget");
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "live2d-widget";
      widget.className = "live2d-widget-container";
      widget.setAttribute("aria-hidden", "true");
      document.body.appendChild(widget);
    }

    var canvas = document.getElementById("live2dcanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "live2dcanvas";
      widget.appendChild(canvas);
    }

    return { widget: widget, canvas: canvas };
  }

  function fitCurrentModel() {
    if (!application || !currentModel) return;

    var display = getDisplayConfig();
    currentModel.scale.set(1);

    var modelWidth = Math.max(currentModel.width || 1, 1);
    var modelHeight = Math.max(currentModel.height || 1, 1);
    var scale = Math.min(
      (display.width * 1.08) / modelWidth,
      (display.height * 1.04) / modelHeight
    );

    currentModel.anchor.set(0.5, 1);
    currentModel.scale.set(scale);
    currentModel.x = display.width * 0.51;
    currentModel.y = display.height;
  }

  function applyPointerFocus() {
    focusFrame = 0;
    if (!application || !currentModel || prefersReducedMotion()) return;

    var elements = ensureWidget();
    if (!elements || !lastPointerPosition) return;

    var rect = elements.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;

    var rendererWidth = application.renderer.screen.width;
    var rendererHeight = application.renderer.screen.height;
    var x =
      ((lastPointerPosition.x - rect.left) / rect.width) * rendererWidth;
    var y =
      ((lastPointerPosition.y - rect.top) / rect.height) * rendererHeight;
    currentModel.focus(x, y);
  }

  function schedulePointerFocus() {
    if (focusFrame || prefersReducedMotion()) return;
    focusFrame = window.requestAnimationFrame(applyPointerFocus);
  }

  function focusModelAtRest(instant) {
    if (!currentModel || !application) return;
    currentModel.focus(
      application.renderer.screen.width * 0.5,
      application.renderer.screen.height * 0.48,
      Boolean(instant)
    );
  }

  function bindFocusEvents() {
    if (window.__siteLive2DFocusBound || prefersReducedMotion()) return;
    window.__siteLive2DFocusBound = true;

    window.addEventListener(
      "pointermove",
      function (event) {
        if (event.pointerType === "touch") return;
        lastPointerPosition = { x: event.clientX, y: event.clientY };
        schedulePointerFocus();
      },
      { passive: true }
    );

    document.documentElement.addEventListener("mouseleave", function () {
      lastPointerPosition = null;
      focusModelAtRest(false);
    });
    window.addEventListener("blur", function () {
      lastPointerPosition = null;
      focusModelAtRest(false);
    });
  }

  function applyResponsiveSize() {
    var elements = ensureWidget();
    if (!elements) return false;

    if (isPhoneViewport()) {
      elements.widget.style.display = "none";
      return true;
    }

    var display = getDisplayConfig();
    elements.widget.style.display = "block";
    elements.widget.style.width = display.width + "px";
    elements.widget.style.height = display.height + "px";
    elements.widget.style.right = display.right + "px";
    elements.widget.style.bottom = display.bottom + "px";

    elements.canvas.style.width = display.width + "px";
    elements.canvas.style.height = display.height + "px";

    if (application && application.renderer) {
      application.renderer.resize(display.width, display.height);
      fitCurrentModel();
    }

    return true;
  }

  function scheduleResponsiveSync() {
    if (resizeTimer) window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(function () {
      applyResponsiveSize();
      if (shouldRenderLive2D() && !application) initLive2D();
    }, 80);
  }

  function bindResponsiveEvents() {
    if (window.__siteLive2DResponsiveBound) return;
    window.__siteLive2DResponsiveBound = true;
    window.addEventListener("resize", scheduleResponsiveSync);
    window.addEventListener("orientationchange", scheduleResponsiveSync);
  }

  function loadScriptOnce(cacheKey, source, isReady) {
    if (isReady()) return Promise.resolve();
    if (window[cacheKey]) return window[cacheKey];

    window[cacheKey] = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + source + '"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }

      var script = document.createElement("script");
      script.src = source;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });

    return window[cacheKey];
  }

  function loadLibraries() {
    return loadScriptOnce("__sitePixiLibraryPromise", PIXI_URL, function () {
      return Boolean(window.PIXI && window.PIXI.Application);
    })
      .then(function () {
        return loadScriptOnce(
          "__siteCubismCoreLibraryPromise",
          CUBISM_CORE_URL,
          function () {
            return Boolean(window.Live2DCubismCore);
          }
        );
      })
      .then(function () {
        return loadScriptOnce(
          "__siteLive2DDisplayLibraryPromise",
          LIVE2D_DISPLAY_URL,
          function () {
            return Boolean(
              window.PIXI &&
                window.PIXI.live2d &&
                window.PIXI.live2d.Live2DModel
            );
          }
        );
      });
  }

  function ensureApplication() {
    if (application) return application;

    var elements = ensureWidget();
    var display = getDisplayConfig();
    application = new window.PIXI.Application({
      view: elements.canvas,
      width: display.width,
      height: display.height,
      antialias: true,
      autoDensity: true,
      backgroundAlpha: 0,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
    });

    return application;
  }

  function stopExpressionLoop() {
    if (expressionTimer) {
      window.clearTimeout(expressionTimer);
      expressionTimer = 0;
    }

    if (
      expressionModel &&
      expressionHandler &&
      expressionModel.internalModel &&
      typeof expressionModel.internalModel.off === "function"
    ) {
      expressionModel.internalModel.off(
        "beforeModelUpdate",
        expressionHandler
      );
    }

    expressionModel = null;
    expressionHandler = null;
    expressionCurrentValues = {};
    expressionTargetValues = {};
    expressionSequenceIndex = 0;
    expressionLastUpdate = 0;
  }

  function isExpressionParameter(parameterId) {
    if (parameterId.indexOf("ParamEyeBall") === 0) return false;
    return (
      parameterId.indexOf("ParamEye") === 0 ||
      parameterId.indexOf("ParamBrow") === 0 ||
      parameterId.indexOf("ParamMouth") === 0 ||
      parameterId === "ParamCheek"
    );
  }

  function motionDefinitionForId(model, motionId) {
    var settings = model.internalModel.settings;
    var motions = (settings.motions && settings.motions[""]) || [];
    var pattern = new RegExp("_" + motionId + "\\.motion3\\.json$");

    for (var i = 0; i < motions.length; i += 1) {
      if (pattern.test(motions[i].File)) return motions[i];
    }
    return null;
  }

  function resolvedMotionUrl(model, motionDefinition) {
    var file = motionDefinition.File;
    if (/^https?:\/\//i.test(file)) return file;
    return model.internalModel.settings.resolveURL(file);
  }

  function loadExpressionState(model, motionId) {
    var definition = motionDefinitionForId(model, motionId);
    if (!definition) return Promise.reject(new Error("Expression not found"));

    return fetch(resolvedMotionUrl(model, definition), {
      credentials: "omit",
      mode: "cors",
    })
      .then(function (response) {
        if (!response.ok) throw new Error("Expression request failed");
        return response.json();
      })
      .then(function (motion) {
        var values = {};
        var curves = motion.Curves || [];
        for (var i = 0; i < curves.length; i += 1) {
          var curve = curves[i];
          if (
            curve.Target === "Parameter" &&
            isExpressionParameter(curve.Id) &&
            curve.Segments &&
            curve.Segments.length > 1
          ) {
            values[curve.Id] = Number(curve.Segments[1]);
          }
        }
        return values;
      });
  }

  function scheduleNextExpression(expressionStates) {
    var currentStep = EXPRESSION_SEQUENCE[expressionSequenceIndex];
    expressionTimer = window.setTimeout(function () {
      if (!expressionModel || expressionModel !== currentModel) return;

      expressionSequenceIndex =
        (expressionSequenceIndex + 1) % EXPRESSION_SEQUENCE.length;
      var nextStep = EXPRESSION_SEQUENCE[expressionSequenceIndex];
      expressionTargetValues = expressionStates[nextStep.stateIndex];
      scheduleNextExpression(expressionStates);
    }, currentStep.hold);
  }

  function startExpressionLoop(model, character) {
    stopExpressionLoop();
    if (prefersReducedMotion()) return Promise.resolve();

    var motionIds = character.expressionMotionIds || ["01", "02", "07"];
    return Promise.all(
      motionIds.map(function (motionId) {
        return loadExpressionState(model, motionId);
      })
    ).then(function (expressionStates) {
      if (model !== currentModel || expressionStates.length < 3) return;

      expressionModel = model;
      expressionCurrentValues = Object.assign({}, expressionStates[0]);
      expressionTargetValues = expressionStates[0];
      expressionSequenceIndex = 0;
      expressionLastUpdate = window.performance.now();

      expressionHandler = function () {
        if (!expressionModel || expressionModel !== currentModel) return;

        var now = window.performance.now();
        var elapsed = Math.min(now - expressionLastUpdate, 80);
        var blend = 1 - Math.exp(-elapsed / 520);
        expressionLastUpdate = now;

        Object.keys(expressionTargetValues).forEach(function (parameterId) {
          var currentValue = expressionCurrentValues[parameterId];
          var targetValue = expressionTargetValues[parameterId];
          if (typeof currentValue !== "number") currentValue = targetValue;
          currentValue += (targetValue - currentValue) * blend;
          expressionCurrentValues[parameterId] = currentValue;
          expressionModel.internalModel.coreModel.setParameterValueById(
            parameterId,
            currentValue
          );
        });
      };

      model.internalModel.on("beforeModelUpdate", expressionHandler);
      scheduleNextExpression(expressionStates);
    });
  }

  function destroyCurrentModel() {
    if (!currentModel) return;
    stopExpressionLoop();
    if (application && currentModel.parent) {
      application.stage.removeChild(currentModel);
    }
    currentModel.destroy({ children: true, texture: true, baseTexture: true });
    currentModel = null;
    currentCharacterId = "";
  }

  function loadCharacter(characterId) {
    var character = getCharacter(characterId) ||
      getCharacter(getDefaultCharacterId());
    if (!character || !shouldRenderLive2D()) return Promise.resolve();
    if (currentModel && currentCharacterId === character.id) {
      fitCurrentModel();
      return Promise.resolve(currentModel);
    }

    var generation = ++modelLoadGeneration;
    var elements = ensureWidget();
    elements.widget.classList.add("is-loading");
    elements.widget.classList.remove("has-live2d-error");

    return window.PIXI.live2d.Live2DModel.from(character.modelPath, {
      autoInteract: false,
      motionPreload: window.PIXI.live2d.MotionPreloadStrategy.NONE,
    })
      .then(function (model) {
        if (generation !== modelLoadGeneration) {
          model.destroy({ children: true, texture: true, baseTexture: true });
          return null;
        }

        destroyCurrentModel();
        currentModel = model;
        currentCharacterId = character.id;
        application.stage.addChild(model);
        fitCurrentModel();
        if (lastPointerPosition) {
          schedulePointerFocus();
        } else {
          focusModelAtRest(true);
        }
        startExpressionLoop(model, character).catch(function () {
          // Keep the model usable if optional expression data fails to load.
        });
        elements.widget.setAttribute("data-live2d-character", character.id);
        elements.widget.classList.remove("is-loading");
        return model;
      })
      .catch(function (error) {
        if (generation === modelLoadGeneration) {
          elements.widget.classList.remove("is-loading");
          elements.widget.classList.add("has-live2d-error");
        }
        throw error;
      });
  }

  function ensureCharacterButton() {
    var menu = document.querySelector("[data-site-options-menu]");
    if (!menu) return null;

    var button = menu.querySelector("[data-live2d-character]");
    if (button) return button;

    button = document.createElement("button");
    button.type = "button";
    button.className = "site-options-fab__action";
    button.setAttribute("data-live2d-character", "true");
    button.setAttribute("role", "menuitem");

    var live2dToggle = menu.querySelector("[data-live2d-toggle]");
    if (live2dToggle && live2dToggle.nextSibling) {
      menu.insertBefore(button, live2dToggle.nextSibling);
    } else {
      menu.appendChild(button);
    }

    return button;
  }

  function renderCharacterButton(button) {
    if (!button) return;

    var selected = getCharacter(getSelectedCharacterId()) || getCharacters()[0];
    var label = "Character: " + selected.name;
    var accessibleLabel = "Switch Live2D character. Current: " + selected.name;

    button.hidden = isPageDisabled();
    button.setAttribute("aria-label", accessibleLabel);
    button.setAttribute("title", accessibleLabel);
    button.innerHTML = [
      '<span class="site-options-fab__action-icon" aria-hidden="true"><i class="fas fa-exchange-alt"></i></span>',
      '<span class="site-options-fab__action-label">',
      label,
      "</span>",
    ].join("");
  }

  function selectNextCharacter() {
    var characters = getCharacters();
    var selectedId = getSelectedCharacterId();
    var selectedIndex = 0;

    for (var i = 0; i < characters.length; i += 1) {
      if (characters[i].id === selectedId) selectedIndex = i;
    }

    var next = characters[(selectedIndex + 1) % characters.length];
    persistSelectedCharacter(next.id);
    syncCharacterTheme(next.id);
    renderCharacterButton(ensureCharacterButton());

    if (shouldRenderLive2D()) {
      loadLibraries()
        .then(function () {
          ensureApplication();
          return loadCharacter(next.id);
        })
        .catch(function () {
          // Live2D is decorative; do not block the page if it fails.
        });
    }
  }

  function bindCharacterButton() {
    var button = ensureCharacterButton();
    if (!button) return;
    renderCharacterButton(button);

    if (button.getAttribute("data-live2d-character-bound") === "true") return;
    button.setAttribute("data-live2d-character-bound", "true");
    button.addEventListener("click", function (event) {
      event.preventDefault();
      selectNextCharacter();
    });
  }

  function initLive2D() {
    syncCharacterTheme(getSelectedCharacterId());
    syncVisibilityClass();
    bindCharacterButton();
    bindResponsiveEvents();
    bindFocusEvents();
    applyResponsiveSize();
    if (!shouldRenderLive2D()) return;

    loadLibraries()
      .then(function () {
        ensureApplication();
        applyResponsiveSize();
        return loadCharacter(getSelectedCharacterId());
      })
      .catch(function () {
        var elements = ensureWidget();
        if (elements) elements.widget.classList.add("has-live2d-error");
        // Live2D is decorative; do not block the page if it fails.
      });
  }

  document.addEventListener("site:content-updated", initLive2D);
  document.addEventListener("site:live2d-toggle", initLive2D);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLive2D);
  } else {
    initLive2D();
  }
})();
