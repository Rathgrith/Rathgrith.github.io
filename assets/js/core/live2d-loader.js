(function () {
  var PIXI_URL =
    "https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js";
  var CUBISM_CORE_URL =
    "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";
  var LIVE2D_DISPLAY_URL =
    "https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js";
  var WIDGET_RATIO = 1.52;
  var DEFAULT_EXPRESSION_MOTION_IDS = [
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
  ];
  var EXPRESSION_SEQUENCE = [
    { motionId: "01", hold: 9500 },
    { motionId: "02", hold: 1800 },
    { motionId: "01", hold: 12500 },
  ];
  var DIALOGUE_HOLD_DURATION = 7200;
  var INTERACTION_MOTION_DURATION = 1030;
  var IDLE_INTERACTION_DELAY = 32000;
  var WELCOME_INTERACTION_DELAY = 1400;
  var CHARACTER_INTERACTIONS = {
    alice: [
      {
        text: "数は多いに越した事は無い。大は小を兼ねるのよ！",
        source: "東方緋想天",
        poseId: "5",
        expressionMotionId: "02",
      },
      {
        text: "そろそろ、究極の人形が完成しそうよ。",
        source: "東方非想天則",
        poseId: "4",
        expressionMotionId: "07",
      },
      {
        text: "人形が気になるの？ ふふっ、触ってみる？",
        source: "東方LostWord",
        poseId: "1",
        expressionMotionId: "02",
      },
      {
        text: "少し部屋の片付けでもしたらどう？ 地震が来たら埋もれても知らないわよ？",
        source: "東方緋想天",
        poseId: "3",
        expressionMotionId: "05",
      },
      {
        text: "何体まで同時に操っても大丈夫かしら？",
        source: "東方緋想天",
        poseId: "2",
        expressionMotionId: "01",
      },
      {
        text: "人形の巨大化！ インパクトはありそうだから検討してみるかなぁ。",
        source: "東方緋想天",
        poseId: "5",
        expressionMotionId: "07",
      },
    ],
    marisa: [
      {
        text: "イメージトレーニングは百戦百一勝！",
        source: "東方緋想天",
        poseId: "4",
        expressionMotionId: "02",
      },
      {
        text: "今年は森にも陽の光が差して暑いな。",
        source: "東方非想天則",
        poseId: "5",
        expressionMotionId: "05",
      },
      {
        text: "帰ったぜー。疲れたー。寝るー。おやすみー。",
        source: "東方LostWord",
        poseId: "3",
        expressionMotionId: "08",
      },
      {
        text: "じゃあな。神社が壊れて元気がないんじゃないか？",
        source: "東方緋想天",
        poseId: "2",
        expressionMotionId: "01",
      },
      {
        text: "人形の首を沢山吊そうぜ。そうしたら晴れるに違いない。",
        source: "東方緋想天",
        poseId: "4",
        expressionMotionId: "02",
      },
      {
        text: "耐水性に優れた本もあるんだな。それなら風呂の中でも読めそうだぜ。",
        source: "東方緋想天",
        poseId: "5",
        expressionMotionId: "05",
      },
    ],
    patchouli: [
      {
        text: "どんな天気でも家の中に居れば関係ないけどね。",
        source: "東方緋想天",
        poseId: "5",
        expressionMotionId: "01",
      },
      {
        text: "魔法の本質は万物の根源を調べること。",
        source: "東方非想天則",
        poseId: "1",
        expressionMotionId: "03",
      },
      {
        text: "また一つ、新たな知識を吸収することができたわ。",
        source: "東方LostWord",
        poseId: "4",
        expressionMotionId: "02",
      },
      {
        text: "最近、また鼠の被害が増えているわ。",
        source: "東方非想天則",
        poseId: "1",
        expressionMotionId: "05",
      },
      {
        text: "人形を操っているのは魔法の糸だろうけど、沢山操るのは普通に器用よね。",
        source: "東方非想天則",
        poseId: "1",
        expressionMotionId: "01",
      },
      {
        text: "雲一つ無い快晴は、時として生物に害を為す。日光は避けられない有害な物の一つね。",
        source: "東方緋想天",
        poseId: "1",
        expressionMotionId: "03",
      },
    ],
  };
  var preferenceStorageKey = "site-live2d-enabled";
  var characterStorageKey = "site-live2d-character";
  var resizeTimer = 0;
  var focusFrame = 0;
  var lastPointerPosition = null;
  var application = null;
  var currentModel = null;
  var currentCharacterId = "";
  var currentPoseId = "1";
  var modelLoadGeneration = 0;
  var expressionTimer = 0;
  var expressionModel = null;
  var expressionHandler = null;
  var expressionCurrentValues = {};
  var expressionTargetValues = {};
  var expressionStatesByMotionId = {};
  var expressionSequenceIndex = 0;
  var expressionLastUpdate = 0;
  var eyeBlinkModel = null;
  var eyeBlinkHandler = null;
  var eyeBlinkLastUpdate = 0;
  var eyeBlinkWasClosed = false;
  var eyeBlinkCount = 0;
  var breathModel = null;
  var breathHandler = null;
  var breathStartedAt = 0;
  var breathBaseValues = {};
  var partOpacityModel = null;
  var partOpacityHandler = null;
  var partOpacityActiveState = null;
  var partOpacityStateCache = {};
  var partOpacityRequestGeneration = 0;
  var lipSyncModel = null;
  var lipSyncHandler = null;
  var lipSyncStartedAt = 0;
  var lipSyncEndsAt = 0;
  var interactionDialogueTimer = 0;
  var interactionMotionTimer = 0;
  var interactionMotionGeneration = 0;
  var interactionMotionPending = false;
  var interactionIdleTimer = 0;
  var interactionWelcomeTimer = 0;
  var interactionIndices = {};

  var fallbackCharacters = [
    {
      id: "marisa",
      name: "Marisa",
      expressionMotionIds: DEFAULT_EXPRESSION_MOTION_IDS.slice(),
      modelPath:
        "https://raw.githubusercontent.com/n0099/TouhouCannonBall-Live2d-Models/main/Marisa/object_live2d_002_101.asset.model3.json",
    },
    {
      id: "alice",
      name: "Alice",
      expressionMotionIds: DEFAULT_EXPRESSION_MOTION_IDS.slice(),
      modelPath:
        "https://raw.githubusercontent.com/n0099/TouhouCannonBall-Live2d-Models/main/Alice/object_live2d_014_101.asset.model3.json",
    },
    {
      id: "patchouli",
      name: "Patchouli",
      idleOnly: true,
      expressionMotionIds: DEFAULT_EXPRESSION_MOTION_IDS.slice(),
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

  function isIdleOnlyCharacter(character) {
    return Boolean(character && character.idleOnly);
  }

  function getDefaultCharacterId() {
    var configured =
      window.__siteLive2DConfig && window.__siteLive2DConfig.defaultCharacter;
    if (configured && getCharacter(configured)) return configured;
    if (getCharacter("alice")) return "alice";
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
    var character =
      getCharacter(characterId) || getCharacter(getDefaultCharacterId());
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
      width = Math.round(Math.max(170, Math.min(205, viewportWidth * 0.22)));
      hOffsetRatio = 0.35;
      vOffsetRatio = 0.45;
    } else if (viewportWidth < 1450) {
      width = Math.round(Math.max(210, Math.min(300, viewportWidth * 0.205)));
      hOffsetRatio = 0.24;
      vOffsetRatio = 0.45;
    } else {
      width = Math.round(Math.max(300, Math.min(360, viewportWidth * 0.24)));
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

  function ensureInteractionUI(widget) {
    var trigger = document.getElementById("live2d-interact");
    if (!trigger) {
      trigger = document.createElement("button");
      trigger.id = "live2d-interact";
      trigger.className = "live2d-interact";
      trigger.type = "button";
      trigger.innerHTML = '<i class="fas fa-comment" aria-hidden="true"></i>';
      trigger.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();
        showNextInteraction(true);
      });
      widget.appendChild(trigger);
    } else if (trigger.parentNode !== widget) {
      widget.appendChild(trigger);
    }

    var dialogue = document.getElementById("live2d-dialogue");
    if (!dialogue) {
      dialogue = document.createElement("aside");
      dialogue.id = "live2d-dialogue";
      dialogue.className = "live2d-dialogue";
      dialogue.setAttribute("aria-live", "polite");
      dialogue.setAttribute("aria-atomic", "true");
      dialogue.setAttribute("aria-hidden", "true");
      dialogue.innerHTML = [
        '<div class="live2d-dialogue__meta">',
        '<strong class="live2d-dialogue__name" data-live2d-dialogue-name></strong>',
        "</div>",
        '<p class="live2d-dialogue__text" data-live2d-dialogue-text lang="ja"></p>',
        '<button type="button" class="live2d-dialogue__close" data-live2d-dialogue-close aria-label="Close character dialogue">',
        '<i class="fas fa-times" aria-hidden="true"></i>',
        "</button>",
      ].join("");
      dialogue
        .querySelector("[data-live2d-dialogue-close]")
        .addEventListener("click", function () {
          hideDialogue(true);
          scheduleIdleInteraction();
        });
      document.body.appendChild(dialogue);
    }

    return {
      trigger: trigger,
      dialogue: dialogue,
    };
  }

  function positionInteractionUI(elements, display) {
    if (!elements || !elements.dialogue) return;
    var visibleHeight = Math.max(1, display.height + display.bottom);
    var dialogueRight = window.innerWidth < 980 ? 14 : 20;
    var dialogueBottom = Math.max(128, visibleHeight * 0.88);

    elements.dialogue.style.right = Math.round(dialogueRight) + "px";
    elements.dialogue.style.bottom = Math.round(dialogueBottom) + "px";
  }

  function ensureWidget() {
    if (!document.body) return null;

    var widget = document.getElementById("live2d-widget");
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "live2d-widget";
      widget.className = "live2d-widget-container";
      document.body.appendChild(widget);
    }
    widget.removeAttribute("aria-hidden");

    var canvas = document.getElementById("live2dcanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "live2dcanvas";
      widget.appendChild(canvas);
    }
    canvas.setAttribute("aria-hidden", "true");

    var interaction = ensureInteractionUI(widget);
    return {
      widget: widget,
      canvas: canvas,
      trigger: interaction.trigger,
      dialogue: interaction.dialogue,
    };
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
    var x = ((lastPointerPosition.x - rect.left) / rect.width) * rendererWidth;
    var y = ((lastPointerPosition.y - rect.top) / rect.height) * rendererHeight;
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
      elements.trigger.hidden = true;
      hideDialogue(false);
      return true;
    }

    var display = getDisplayConfig();
    elements.widget.style.display = "block";
    elements.widget.style.width = display.width + "px";
    elements.widget.style.height = display.height + "px";
    elements.widget.style.right = display.right + "px";
    elements.widget.style.bottom = display.bottom + "px";
    elements.trigger.hidden = shouldDisableLive2D() || !currentModel;
    positionInteractionUI(elements, display);

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
      expressionModel.internalModel.off("beforeModelUpdate", expressionHandler);
    }

    expressionModel = null;
    expressionHandler = null;
    expressionCurrentValues = {};
    expressionTargetValues = {};
    expressionStatesByMotionId = {};
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

  function scheduleNextExpression() {
    var currentStep = EXPRESSION_SEQUENCE[expressionSequenceIndex];
    expressionTimer = window.setTimeout(function () {
      if (!expressionModel || expressionModel !== currentModel) return;

      expressionSequenceIndex =
        (expressionSequenceIndex + 1) % EXPRESSION_SEQUENCE.length;
      var nextStep = EXPRESSION_SEQUENCE[expressionSequenceIndex];
      expressionTargetValues =
        expressionStatesByMotionId[nextStep.motionId] ||
        expressionStatesByMotionId["01"] ||
        {};
      var elements = ensureWidget();
      if (elements) {
        elements.widget.setAttribute(
          "data-live2d-expression-id",
          nextStep.motionId
        );
      }
      scheduleNextExpression();
    }, currentStep.hold);
  }

  function startExpressionLoop(model, character) {
    stopExpressionLoop();
    if (prefersReducedMotion()) return Promise.resolve();

    var motionIds =
      character.expressionMotionIds || DEFAULT_EXPRESSION_MOTION_IDS;
    return Promise.all(
      motionIds.map(function (motionId) {
        return loadExpressionState(model, motionId);
      })
    ).then(function (expressionStates) {
      if (model !== currentModel || !expressionStates.length) return;

      expressionModel = model;
      expressionStatesByMotionId = {};
      motionIds.forEach(function (motionId, index) {
        expressionStatesByMotionId[motionId] = expressionStates[index];
      });
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
      var elements = ensureWidget();
      if (elements) {
        elements.widget.setAttribute("data-live2d-expression-id", "01");
      }
      scheduleNextExpression();
    });
  }

  function stopEyeBlinkLoop() {
    if (
      eyeBlinkModel &&
      eyeBlinkHandler &&
      eyeBlinkModel.internalModel &&
      typeof eyeBlinkModel.internalModel.off === "function"
    ) {
      eyeBlinkModel.internalModel.off("beforeModelUpdate", eyeBlinkHandler);
    }

    eyeBlinkModel = null;
    eyeBlinkHandler = null;
    eyeBlinkLastUpdate = 0;
    eyeBlinkWasClosed = false;
    eyeBlinkCount = 0;
    var elements = ensureWidget();
    if (elements) {
      elements.widget.removeAttribute("data-live2d-blinking");
      elements.widget.removeAttribute("data-live2d-blink-count");
    }
  }

  function startEyeBlinkLoop(model) {
    stopEyeBlinkLoop();
    if (
      prefersReducedMotion() ||
      !model.internalModel ||
      !model.internalModel.eyeBlink
    ) {
      return;
    }

    eyeBlinkModel = model;
    eyeBlinkLastUpdate = window.performance.now();
    eyeBlinkHandler = function () {
      if (!eyeBlinkModel || eyeBlinkModel !== currentModel) return;

      var now = window.performance.now();
      var elapsed = Math.min(now - eyeBlinkLastUpdate, 100) / 1000;
      eyeBlinkLastUpdate = now;
      var internalModel = eyeBlinkModel.internalModel;
      var coreModel = internalModel.coreModel;

      // Keep blinking independent from body motions and static rest poses.
      internalModel.eyeBlink.updateParameters(coreModel, elapsed);

      var leftEye = coreModel.getParameterValueById("ParamEyeLOpen");
      var rightEye = coreModel.getParameterValueById("ParamEyeROpen");
      var isClosed = Math.min(leftEye, rightEye) < 0.72;
      var elements = ensureWidget();
      if (elements) {
        if (isClosed) {
          elements.widget.setAttribute("data-live2d-blinking", "true");
          if (!eyeBlinkWasClosed) {
            eyeBlinkCount += 1;
            elements.widget.setAttribute(
              "data-live2d-blink-count",
              String(eyeBlinkCount)
            );
          }
        } else {
          elements.widget.removeAttribute("data-live2d-blinking");
        }
      }
      eyeBlinkWasClosed = isClosed;
    };

    model.internalModel.on("beforeModelUpdate", eyeBlinkHandler);
  }

  function stopBreathingLoop() {
    if (
      breathModel &&
      breathHandler &&
      breathModel.internalModel &&
      typeof breathModel.internalModel.off === "function"
    ) {
      breathModel.internalModel.off("beforeModelUpdate", breathHandler);
    }
    breathModel = null;
    breathHandler = null;
    breathStartedAt = 0;
    breathBaseValues = {};
    var elements = ensureWidget();
    if (elements) {
      elements.widget.removeAttribute("data-live2d-breathing");
    }
  }

  function startBreathingLoop(model, character) {
    stopBreathingLoop();
    if (
      prefersReducedMotion() ||
      !model ||
      model !== currentModel ||
      !isIdleOnlyCharacter(character)
    ) {
      return;
    }

    var coreModel = model.internalModel.coreModel;
    breathModel = model;
    breathStartedAt = window.performance.now();
    breathBaseValues = {
      ParamBodyWeight: coreModel.getParameterValueById("ParamBodyWeight"),
      ParamLeftShoulderUpDown: coreModel.getParameterValueById(
        "ParamLeftShoulderUpDown"
      ),
      ParamRightShoulderUpDown: coreModel.getParameterValueById(
        "ParamRightShoulderUpDown"
      ),
    };

    breathHandler = function () {
      if (!breathModel || breathModel !== currentModel) return;
      var elapsed = (window.performance.now() - breathStartedAt) / 1000;
      var phase = Math.sin((elapsed * Math.PI * 2) / 5.8);
      var breathCoreModel = breathModel.internalModel.coreModel;
      breathCoreModel.setParameterValueById(
        "ParamBodyWeight",
        breathBaseValues.ParamBodyWeight + phase * 0.32
      );
      breathCoreModel.setParameterValueById(
        "ParamLeftShoulderUpDown",
        breathBaseValues.ParamLeftShoulderUpDown + phase * 0.12
      );
      breathCoreModel.setParameterValueById(
        "ParamRightShoulderUpDown",
        breathBaseValues.ParamRightShoulderUpDown + phase * 0.12
      );
    };

    model.internalModel.on("beforeModelUpdate", breathHandler);
    var elements = ensureWidget();
    if (elements) {
      elements.widget.setAttribute("data-live2d-breathing", "true");
    }
  }

  function stopLipSyncLoop() {
    if (
      lipSyncModel &&
      lipSyncHandler &&
      lipSyncModel.internalModel &&
      typeof lipSyncModel.internalModel.off === "function"
    ) {
      lipSyncModel.internalModel.off("beforeModelUpdate", lipSyncHandler);
    }
    lipSyncModel = null;
    lipSyncHandler = null;
    lipSyncStartedAt = 0;
    lipSyncEndsAt = 0;
  }

  function startLipSyncLoop(model) {
    stopLipSyncLoop();
    if (prefersReducedMotion()) return;

    lipSyncModel = model;
    lipSyncHandler = function () {
      if (!lipSyncModel || lipSyncModel !== currentModel || !lipSyncEndsAt) {
        return;
      }

      var now = window.performance.now();
      if (now >= lipSyncEndsAt) {
        lipSyncStartedAt = 0;
        lipSyncEndsAt = 0;
        var finishedElements = ensureWidget();
        if (finishedElements) {
          finishedElements.widget.removeAttribute("data-live2d-speaking");
        }
        return;
      }

      var elapsed = (now - lipSyncStartedAt) / 1000;
      var remaining = (lipSyncEndsAt - now) / 1000;
      var envelope = Math.min(1, elapsed / 0.16, remaining / 0.24);
      var primaryPulse = Math.max(0, Math.sin(elapsed * Math.PI * 9.6));
      var secondaryPulse = Math.max(0, Math.sin(elapsed * Math.PI * 6.4 + 0.8));
      var mouthOpen =
        envelope * (0.08 + primaryPulse * 0.48 + secondaryPulse * 0.18);
      lipSyncModel.internalModel.coreModel.setParameterValueById(
        "ParamMouthOpenY",
        mouthOpen
      );
    };
    model.internalModel.on("beforeModelUpdate", lipSyncHandler);
  }

  function triggerLipSync(text) {
    if (!lipSyncModel || lipSyncModel !== currentModel) return;
    var duration = Math.min(4200, Math.max(1900, text.length * 95));
    lipSyncStartedAt = window.performance.now();
    lipSyncEndsAt = lipSyncStartedAt + duration;
    var elements = ensureWidget();
    if (elements) {
      elements.widget.setAttribute("data-live2d-speaking", "true");
    }
  }

  function stopLipSync() {
    lipSyncStartedAt = 0;
    lipSyncEndsAt = 0;
    var elements = ensureWidget();
    if (elements) {
      elements.widget.removeAttribute("data-live2d-speaking");
    }
  }

  function stopPartOpacityGuard() {
    if (
      partOpacityModel &&
      partOpacityHandler &&
      partOpacityModel.internalModel &&
      typeof partOpacityModel.internalModel.off === "function"
    ) {
      partOpacityModel.internalModel.off(
        "beforeModelUpdate",
        partOpacityHandler
      );
    }
    partOpacityModel = null;
    partOpacityHandler = null;
    partOpacityActiveState = null;
    partOpacityStateCache = {};
    partOpacityRequestGeneration += 1;
  }

  function evaluatePartOpacityCurve(segments, time) {
    var previousTime = Number(segments[0]) || 0;
    var previousValue = Number(segments[1]) || 0;
    var cursor = 2;

    while (cursor < segments.length) {
      var segmentType = Number(segments[cursor]);
      cursor += 1;

      if (segmentType === 0) {
        var linearTime = Number(segments[cursor]);
        var linearValue = Number(segments[cursor + 1]);
        cursor += 2;
        if (time < linearTime) {
          var linearProgress =
            (time - previousTime) / Math.max(0.0001, linearTime - previousTime);
          return previousValue + (linearValue - previousValue) * linearProgress;
        }
        previousTime = linearTime;
        previousValue = linearValue;
      } else if (segmentType === 1) {
        var controlValue1 = Number(segments[cursor + 1]);
        var controlValue2 = Number(segments[cursor + 3]);
        var bezierTime = Number(segments[cursor + 4]);
        var bezierValue = Number(segments[cursor + 5]);
        cursor += 6;
        if (time < bezierTime) {
          var bezierProgress =
            (time - previousTime) / Math.max(0.0001, bezierTime - previousTime);
          var inverseProgress = 1 - bezierProgress;
          return (
            inverseProgress *
              inverseProgress *
              inverseProgress *
              previousValue +
            3 *
              inverseProgress *
              inverseProgress *
              bezierProgress *
              controlValue1 +
            3 *
              inverseProgress *
              bezierProgress *
              bezierProgress *
              controlValue2 +
            bezierProgress * bezierProgress * bezierProgress * bezierValue
          );
        }
        previousTime = bezierTime;
        previousValue = bezierValue;
      } else if (segmentType === 2 || segmentType === 3) {
        var steppedTime = Number(segments[cursor]);
        var steppedValue = Number(segments[cursor + 1]);
        cursor += 2;
        if (time < steppedTime) {
          return segmentType === 2 ? previousValue : steppedValue;
        }
        previousTime = steppedTime;
        previousValue = steppedValue;
      } else {
        break;
      }
    }

    return previousValue;
  }

  function startPartOpacityGuard(model) {
    stopPartOpacityGuard();
    partOpacityModel = model;
    partOpacityHandler = function () {
      if (
        !partOpacityModel ||
        partOpacityModel !== currentModel ||
        !partOpacityActiveState
      ) {
        return;
      }

      var elapsed =
        (window.performance.now() - partOpacityActiveState.startedAt) / 1000;
      var duration = Math.max(0.001, partOpacityActiveState.duration);
      var motionTime = partOpacityActiveState.loop
        ? elapsed % duration
        : Math.min(elapsed, duration);
      if (typeof partOpacityActiveState.frozenTime === "number") {
        motionTime = partOpacityActiveState.frozenTime;
      }
      var visibleParts = [];

      partOpacityActiveState.curves.forEach(function (curve) {
        var opacity = evaluatePartOpacityCurve(curve.segments, motionTime);
        partOpacityModel.internalModel.coreModel.setPartOpacityById(
          curve.id,
          opacity
        );
        if (opacity > 0.5) visibleParts.push(curve.id);
      });

      var elements = ensureWidget();
      if (elements) {
        var visiblePartValue = visibleParts.join(",");
        if (
          elements.widget.getAttribute("data-live2d-visible-hand-parts") !==
          visiblePartValue
        ) {
          elements.widget.setAttribute(
            "data-live2d-visible-hand-parts",
            visiblePartValue
          );
        }
      }
    };
    model.internalModel.on("beforeModelUpdate", partOpacityHandler);
  }

  function loadPartOpacityState(model, motionId) {
    if (partOpacityStateCache[motionId]) {
      return partOpacityStateCache[motionId];
    }

    var definition = motionDefinitionForId(model, motionId);
    if (!definition) return Promise.resolve({ duration: 1, curves: [] });

    partOpacityStateCache[motionId] = fetch(
      resolvedMotionUrl(model, definition),
      { credentials: "omit", mode: "cors" }
    )
      .then(function (response) {
        if (!response.ok) throw new Error("Motion request failed");
        return response.json();
      })
      .then(function (motion) {
        var curves = [];
        var staticParameters = {};
        (motion.Curves || []).forEach(function (curve) {
          if (
            curve.Target === "PartOpacity" &&
            curve.Segments &&
            curve.Segments.length > 1
          ) {
            curves.push({ id: curve.Id, segments: curve.Segments });
          }
          if (
            curve.Target === "Parameter" &&
            !isExpressionParameter(curve.Id) &&
            curve.Id.indexOf("ParamEyeBall") !== 0 &&
            curve.Segments &&
            curve.Segments.length > 1
          ) {
            staticParameters[curve.Id] = Number(curve.Segments[1]);
          }
        });
        return {
          duration: Number(motion.Meta && motion.Meta.Duration) || 1,
          curves: curves,
          staticParameters: staticParameters,
        };
      })
      .catch(function () {
        return { duration: 1, curves: [], staticParameters: {} };
      });

    return partOpacityStateCache[motionId];
  }

  function activatePartOpacityState(model, state, shouldLoop, frozenTime) {
    if (!model || model !== currentModel) return;
    partOpacityActiveState = {
      curves: state.curves || [],
      duration: state.duration || 1,
      loop: shouldLoop !== false,
      startedAt: window.performance.now(),
      frozenTime: typeof frozenTime === "number" ? frozenTime : null,
    };
  }

  function applyStaticRestPose(model, character) {
    if (!model || model !== currentModel || !character) {
      return Promise.resolve(false);
    }

    var requestGeneration = ++partOpacityRequestGeneration;
    currentPoseId = "1";
    var elements = ensureWidget();
    if (elements) {
      elements.widget.setAttribute("data-live2d-motion-id", "static");
      elements.widget.setAttribute("data-live2d-pose-id", "1");
      elements.widget.setAttribute("data-live2d-resting", "true");
    }
    if (!isIdleOnlyCharacter(character)) {
      preloadPoseMotions(model, "1");
    }

    return loadPartOpacityState(model, "11").then(function (state) {
      if (
        requestGeneration !== partOpacityRequestGeneration ||
        model !== currentModel
      ) {
        return false;
      }

      var coreModel = model.internalModel.coreModel;
      Object.keys(state.staticParameters || {}).forEach(function (parameterId) {
        coreModel.setParameterValueById(
          parameterId,
          state.staticParameters[parameterId]
        );
      });
      (state.curves || []).forEach(function (curve) {
        coreModel.setPartOpacityById(
          curve.id,
          evaluatePartOpacityCurve(curve.segments, 0)
        );
      });
      activatePartOpacityState(model, state, false, 0);
      return true;
    });
  }

  function motionIndexForId(model, motionId) {
    if (!model || !model.internalModel) return -1;
    var settings = model.internalModel.settings;
    var motions = (settings.motions && settings.motions[""]) || [];
    var pattern = new RegExp("_" + motionId + "\\.motion3\\.json$");

    for (var i = 0; i < motions.length; i += 1) {
      if (pattern.test(motions[i].File)) return i;
    }
    return -1;
  }

  function playMotionById(model, motionId, shouldLoop) {
    if (!model || model !== currentModel) {
      return Promise.resolve(false);
    }

    var motionIndex = motionIndexForId(model, motionId);
    if (motionIndex < 0) return Promise.resolve(false);
    var requestGeneration = ++partOpacityRequestGeneration;
    var motionManager = model.internalModel.motionManager;

    var elements = ensureWidget();
    if (elements) {
      elements.widget.setAttribute("data-live2d-motion-id", motionId);
      elements.widget.removeAttribute("data-live2d-resting");
    }

    return Promise.all([
      loadPartOpacityState(model, motionId),
      motionManager.loadMotion("", motionIndex),
    ])
      .then(function (loadedResources) {
        if (
          requestGeneration !== partOpacityRequestGeneration ||
          model !== currentModel
        ) {
          return false;
        }
        var loadedMotion = loadedResources[1];
        if (loadedMotion) {
          if (typeof loadedMotion.setIsLoop === "function") {
            loadedMotion.setIsLoop(shouldLoop !== false);
          }
          if (typeof loadedMotion.setFadeInTime === "function") {
            loadedMotion.setFadeInTime(0);
          }
          if (typeof loadedMotion.setFadeOutTime === "function") {
            loadedMotion.setFadeOutTime(0);
          }
        }
        activatePartOpacityState(model, loadedResources[0], shouldLoop);
        if (prefersReducedMotion()) return false;
        return model.motion("", motionIndex, 3);
      })
      .catch(function () {
        return false;
      });
  }

  function preloadPoseMotions(model, poseId) {
    if (!model || model !== currentModel) return;
    var motionManager = model.internalModel.motionManager;
    for (var targetPose = 1; targetPose <= 5; targetPose += 1) {
      if (String(targetPose) === poseId) continue;
      var motionIndex = motionIndexForId(model, poseId + String(targetPose));
      if (motionIndex < 0) continue;
      motionManager.loadMotion("", motionIndex).catch(function () {
        // Interaction motions are optional; load on demand if preloading fails.
      });
      loadPartOpacityState(model, poseId + String(targetPose));
    }
  }

  function setInteractionExpression(motionId) {
    var expressionState = expressionStatesByMotionId[motionId];
    if (!expressionModel || !expressionState) return;

    if (expressionTimer) window.clearTimeout(expressionTimer);
    expressionTargetValues = expressionState;
    var elements = ensureWidget();
    if (elements) {
      elements.widget.setAttribute("data-live2d-expression-id", motionId);
    }
    expressionTimer = window.setTimeout(function () {
      if (!expressionModel || expressionModel !== currentModel) return;
      expressionSequenceIndex = 0;
      expressionTargetValues = expressionStatesByMotionId["01"] || {};
      var resetElements = ensureWidget();
      if (resetElements) {
        resetElements.widget.setAttribute("data-live2d-expression-id", "01");
      }
      scheduleNextExpression();
    }, DIALOGUE_HOLD_DURATION);
  }

  function clearInteractionTimers() {
    interactionMotionGeneration += 1;
    interactionMotionPending = false;
    if (interactionDialogueTimer) {
      window.clearTimeout(interactionDialogueTimer);
      interactionDialogueTimer = 0;
    }
    if (interactionMotionTimer) {
      window.clearTimeout(interactionMotionTimer);
      interactionMotionTimer = 0;
    }
    if (interactionIdleTimer) {
      window.clearTimeout(interactionIdleTimer);
      interactionIdleTimer = 0;
    }
    if (interactionWelcomeTimer) {
      window.clearTimeout(interactionWelcomeTimer);
      interactionWelcomeTimer = 0;
    }
  }

  function returnToRestPose(model, character) {
    if (!model || model !== currentModel || !character) return;

    var elements = ensureWidget();
    if (isIdleOnlyCharacter(character)) {
      interactionMotionPending = false;
      if (elements) elements.trigger.disabled = false;
      return;
    }
    if (currentPoseId === "1") {
      interactionMotionPending = false;
      applyStaticRestPose(model, character).then(function () {
        if (model === currentModel) {
          var restElements = ensureWidget();
          if (restElements) restElements.trigger.disabled = false;
        }
      });
      return;
    }

    var returnGeneration = ++interactionMotionGeneration;
    var returnMotionId = currentPoseId + "1";
    interactionMotionPending = true;
    if (elements) elements.trigger.disabled = true;

    playMotionById(model, returnMotionId, false).then(function () {
      if (
        returnGeneration !== interactionMotionGeneration ||
        model !== currentModel ||
        currentCharacterId !== character.id
      ) {
        return;
      }

      if (interactionMotionTimer) {
        window.clearTimeout(interactionMotionTimer);
      }
      interactionMotionTimer = window.setTimeout(function () {
        interactionMotionTimer = 0;
        if (
          returnGeneration !== interactionMotionGeneration ||
          model !== currentModel ||
          currentCharacterId !== character.id
        ) {
          return;
        }
        currentPoseId = "1";
        interactionMotionPending = false;
        applyStaticRestPose(model, character).then(function () {
          if (model === currentModel) {
            var restElements = ensureWidget();
            if (restElements) restElements.trigger.disabled = false;
          }
        });
      }, INTERACTION_MOTION_DURATION);
    });
  }

  function hideDialogue(resumeRestPose) {
    if (interactionDialogueTimer) {
      window.clearTimeout(interactionDialogueTimer);
      interactionDialogueTimer = 0;
    }
    stopLipSync();

    var elements = ensureWidget();
    if (!elements) return;
    elements.dialogue.classList.remove("is-visible");
    elements.dialogue.setAttribute("aria-hidden", "true");
    elements.trigger.setAttribute("aria-expanded", "false");

    if (
      resumeRestPose &&
      !interactionMotionPending &&
      currentModel &&
      currentCharacterId
    ) {
      returnToRestPose(currentModel, getCharacter(currentCharacterId));
    }
  }

  function updateInteractionUI(character) {
    var elements = ensureWidget();
    if (!elements || !character) return;

    var label = "Talk to " + character.name;
    elements.trigger.hidden = !shouldRenderLive2D() || !currentModel;
    elements.trigger.setAttribute("aria-label", label);
    elements.trigger.setAttribute("title", label);
    elements.trigger.setAttribute("aria-controls", "live2d-dialogue");
    elements.trigger.setAttribute("aria-expanded", "false");
    elements.trigger.disabled = false;
    elements.dialogue.querySelector("[data-live2d-dialogue-name]").textContent =
      character.name;
  }

  function showInteraction(character, interaction) {
    if (
      !character ||
      !interaction ||
      !currentModel ||
      currentCharacterId !== character.id ||
      !shouldRenderLive2D()
    ) {
      return;
    }

    if (interactionWelcomeTimer) {
      window.clearTimeout(interactionWelcomeTimer);
      interactionWelcomeTimer = 0;
    }
    if (interactionIdleTimer) {
      window.clearTimeout(interactionIdleTimer);
      interactionIdleTimer = 0;
    }

    var elements = ensureWidget();
    elements.dialogue.querySelector("[data-live2d-dialogue-name]").textContent =
      character.name;
    elements.dialogue.setAttribute("data-live2d-source", interaction.source);
    elements.dialogue.querySelector("[data-live2d-dialogue-text]").textContent =
      interaction.text;
    var idleOnly = isIdleOnlyCharacter(character);
    var targetPoseId = idleOnly ? currentPoseId : interaction.poseId || "1";
    var transitionMotionId = currentPoseId + targetPoseId;
    elements.dialogue.setAttribute("data-live2d-character", character.id);
    elements.dialogue.setAttribute(
      "data-live2d-motion-id",
      idleOnly ? "static" : transitionMotionId
    );
    elements.dialogue.setAttribute("aria-hidden", "false");
    elements.dialogue.classList.add("is-visible");
    elements.trigger.setAttribute("aria-expanded", "true");
    elements.trigger.disabled = true;

    if (idleOnly) {
      interactionMotionPending = false;
      elements.trigger.disabled = false;
    } else {
      var interactionModel = currentModel;
      var motionGeneration = ++interactionMotionGeneration;
      interactionMotionPending = true;
      playMotionById(interactionModel, transitionMotionId, false).then(
        function () {
          if (
            motionGeneration !== interactionMotionGeneration ||
            interactionModel !== currentModel ||
            currentCharacterId !== character.id
          ) {
            return;
          }

          if (interactionMotionTimer) {
            window.clearTimeout(interactionMotionTimer);
          }
          interactionMotionTimer = window.setTimeout(function () {
            interactionMotionTimer = 0;
            interactionMotionPending = false;
            if (currentModel && currentCharacterId === character.id) {
              currentPoseId = targetPoseId;
              var currentElements = ensureWidget();
              if (currentElements) {
                currentElements.widget.setAttribute(
                  "data-live2d-pose-id",
                  targetPoseId
                );
              }
              preloadPoseMotions(currentModel, targetPoseId);
              if (
                currentElements &&
                currentElements.dialogue.classList.contains("is-visible")
              ) {
                currentElements.trigger.disabled = false;
              } else {
                returnToRestPose(currentModel, character);
              }
            }
          }, INTERACTION_MOTION_DURATION);
        }
      );
    }
    setInteractionExpression(interaction.expressionMotionId);
    triggerLipSync(interaction.text);

    if (interactionDialogueTimer) {
      window.clearTimeout(interactionDialogueTimer);
    }
    interactionDialogueTimer = window.setTimeout(function () {
      hideDialogue(true);
    }, DIALOGUE_HOLD_DURATION);
    scheduleIdleInteraction();
  }

  function showNextInteraction() {
    if (interactionMotionPending || !shouldRenderLive2D()) return;
    var character = getCharacter(currentCharacterId);
    if (!character) return;

    var interactions = CHARACTER_INTERACTIONS[character.id] || [];
    if (!interactions.length) return;

    var index = interactionIndices[character.id] || 0;
    showInteraction(character, interactions[index % interactions.length]);
    interactionIndices[character.id] = (index + 1) % interactions.length;
  }

  function scheduleIdleInteraction() {
    if (interactionIdleTimer) window.clearTimeout(interactionIdleTimer);
    if (prefersReducedMotion() || !shouldRenderLive2D() || document.hidden) {
      interactionIdleTimer = 0;
      return;
    }

    interactionIdleTimer = window.setTimeout(function () {
      interactionIdleTimer = 0;
      showNextInteraction();
    }, IDLE_INTERACTION_DELAY);
  }

  function scheduleWelcomeInteraction(character) {
    if (interactionWelcomeTimer) {
      window.clearTimeout(interactionWelcomeTimer);
    }
    if (prefersReducedMotion() || !shouldRenderLive2D()) return;

    interactionWelcomeTimer = window.setTimeout(function () {
      interactionWelcomeTimer = 0;
      if (character && currentCharacterId === character.id) {
        showNextInteraction();
      }
    }, WELCOME_INTERACTION_DELAY);
  }

  function destroyCurrentModel() {
    if (!currentModel) return;
    clearInteractionTimers();
    hideDialogue(false);
    stopPartOpacityGuard();
    stopLipSyncLoop();
    stopEyeBlinkLoop();
    stopBreathingLoop();
    stopExpressionLoop();
    if (application && currentModel.parent) {
      application.stage.removeChild(currentModel);
    }
    currentModel.destroy({ children: true, texture: true, baseTexture: true });
    currentModel = null;
    currentCharacterId = "";
    currentPoseId = "1";
  }

  function loadCharacter(characterId) {
    var character =
      getCharacter(characterId) || getCharacter(getDefaultCharacterId());
    if (!character || !shouldRenderLive2D()) return Promise.resolve();
    if (currentModel && currentCharacterId === character.id) {
      fitCurrentModel();
      updateInteractionUI(character);
      scheduleIdleInteraction();
      return applyStaticRestPose(currentModel, character).then(function () {
        return currentModel;
      });
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
        currentPoseId = "1";
        application.stage.addChild(model);
        fitCurrentModel();
        if (lastPointerPosition) {
          schedulePointerFocus();
        } else {
          focusModelAtRest(true);
        }
        startPartOpacityGuard(model);
        var restPoseReady = applyStaticRestPose(model, character);
        var expressionReady = startExpressionLoop(model, character).catch(
          function () {
            // Keep the model usable if optional expression data fails to load.
          }
        );
        elements.widget.setAttribute("data-live2d-character", character.id);
        updateInteractionUI(character);
        return Promise.all([restPoseReady, expressionReady]).then(function () {
          if (model !== currentModel) return null;
          startEyeBlinkLoop(model);
          startLipSyncLoop(model);
          startBreathingLoop(model, character);
          scheduleWelcomeInteraction(character);
          elements.widget.classList.remove("is-loading");
          return model;
        });
      })
      .catch(function (error) {
        if (generation === modelLoadGeneration) {
          elements.widget.classList.remove("is-loading");
          elements.widget.classList.add("has-live2d-error");
          elements.trigger.hidden = true;
          hideDialogue(false);
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

    var selected =
      getCharacter(getSelectedCharacterId()) ||
      getCharacter(getDefaultCharacterId());
    var label = "Theme: " + selected.name;
    var accessibleLabel = "Switch visual theme. Current: " + selected.name;

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
    clearInteractionTimers();
    hideDialogue(false);

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
    if (!shouldRenderLive2D()) {
      clearInteractionTimers();
      hideDialogue(false);
      return;
    }

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
