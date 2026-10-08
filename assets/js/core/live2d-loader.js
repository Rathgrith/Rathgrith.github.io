(function () {
  var PIXI_URL =
    "https://cdn.jsdelivr.net/npm/pixi.js@6.5.10/dist/browser/pixi.min.js";
  var CUBISM_CORE_URL =
    "https://cubism.live2d.com/sdk-web/cubismcore/live2dcubismcore.min.js";
  var LIVE2D_DISPLAY_URL =
    "https://cdn.jsdelivr.net/npm/pixi-live2d-display@0.4.0/dist/cubism4.min.js";
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
  var CHARACTER_INTERACTIONS = {
    alice: [
      {
        text: "数は多いに越した事は無い。大は小を兼ねるのよ！",
        source: "東方緋想天",
        poseId: "5",
        expressionMotionId: "02",
        moods: ["confident", "cheerful"],
      },
      {
        text: "そろそろ、究極の人形が完成しそうよ。",
        source: "東方非想天則",
        poseId: "4",
        expressionMotionId: "07",
        moods: ["reflective", "confident", "mysterious"],
      },
      {
        text: "人形が気になるの？ ふふっ、触ってみる？",
        source: "東方LostWord",
        poseId: "5",
        expressionMotionId: "02",
        moods: ["cheerful", "curious"],
      },
      {
        text: "少し部屋の片付けでもしたらどう？ 地震が来たら埋もれても知らないわよ？",
        source: "東方緋想天",
        poseId: "3",
        expressionMotionId: "03",
        moods: ["cautious", "irritable"],
      },
      {
        text: "何体まで同時に操っても大丈夫かしら？",
        source: "東方緋想天",
        poseId: "4",
        expressionMotionId: "01",
        moods: ["curious", "reflective"],
      },
      {
        text: "人形の巨大化！ インパクトはありそうだから検討してみるかなぁ。",
        source: "東方緋想天",
        poseId: "5",
        expressionMotionId: "07",
        moods: ["cheerful", "curious"],
      },
    ],
    marisa: [
      {
        text: "イメージトレーニングは百戦百一勝！",
        source: "東方緋想天",
        poseId: "4",
        expressionMotionId: "07",
        moods: ["confident", "cheerful"],
      },
      {
        text: "今年は森にも陽の光が差して暑いな。",
        source: "東方非想天則",
        poseId: "5",
        expressionMotionId: "04",
        moods: ["irritable", "quiet"],
        weatherPhases: ["clear", "heat"],
      },
      {
        text: "帰ったぜー。疲れたー。寝るー。おやすみー。",
        source: "東方LostWord",
        poseId: "3",
        expressionMotionId: "08",
        moods: ["sleepy", "quiet"],
      },
      {
        text: "じゃあな。神社が壊れて元気がないんじゃないか？",
        source: "東方緋想天",
        poseId: "2",
        expressionMotionId: "02",
        moods: ["mischievous", "confident"],
      },
      {
        text: "人形の首を沢山吊そうぜ。そうしたら晴れるに違いない。",
        source: "東方緋想天",
        poseId: "4",
        expressionMotionId: "07",
        moods: ["mischievous", "cheerful", "mysterious"],
        weatherPhases: ["cloud", "rain", "storm"],
      },
      {
        text: "耐水性に優れた本もあるんだな。それなら風呂の中でも読めそうだぜ。",
        source: "東方緋想天",
        poseId: "5",
        expressionMotionId: "06",
        moods: ["curious", "mischievous"],
        weatherPhases: ["rain", "storm"],
      },
    ],
    patchouli: [
      {
        text: "どんな天気でも家の中に居れば関係ないけどね。",
        source: "東方緋想天",
        poseId: "4",
        expressionMotionId: "01",
        moods: ["quiet", "detached"],
      },
      {
        text: "魔法の本質は万物の根源を調べること。",
        source: "東方非想天則",
        poseId: "3",
        expressionMotionId: "01",
        moods: ["curious", "reflective", "mysterious"],
      },
      {
        text: "また一つ、新たな知識を吸収することができたわ。",
        source: "東方LostWord",
        poseId: "2",
        expressionMotionId: "02",
        moods: ["cheerful", "quiet"],
      },
      {
        text: "最近、また鼠の被害が増えているわ。",
        source: "東方非想天則",
        poseId: "2",
        expressionMotionId: "05",
        moods: ["irritable", "cautious"],
      },
      {
        text: "人形を操っているのは魔法の糸だろうけど、沢山操るのは普通に器用よね。",
        source: "東方非想天則",
        poseId: "3",
        expressionMotionId: "01",
        moods: ["curious", "reflective"],
      },
      {
        text: "雲一つ無い快晴は、時として生物に害を為す。日光は避けられない有害な物の一つね。",
        source: "東方緋想天",
        poseId: "2",
        expressionMotionId: "03",
        moods: ["cautious", "reflective"],
        weatherPhases: ["clear", "heat"],
      },
    ],
  };
  var preferenceStorageKey = "site-live2d-enabled";
  var characterStorageKey = "site-live2d-character";
  var companionWidget = null;
  var companionMinimized = false;
  var companionVisibilityChosen = false;
  var companionPosition = null;
  var resizeTimer = 0;
  var focusFrame = 0;
  var lastPointerPosition = null;
  var application = null;
  var syncModelLighting = null;
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
  var partOpacityModel = null;
  var partOpacityHandler = null;
  var partOpacityActiveState = null;
  var partOpacityStateCache = {};
  var partOpacityRequestGeneration = 0;
  var lipSyncModel = null;
  var lipSyncHandler = null;
  var lipSyncStartedAt = 0;
  var lipSyncEndsAt = 0;
  var interactionMotionTimer = 0;
  var interactionMotionGeneration = 0;
  var interactionMotionPending = false;
  var requestedPoseId = "1";
  var companionGameActive = false;
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
    return !shouldDisableLive2D() && !companionMinimized;
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
      window.__siteLive2DConfig && window.__siteLive2DConfig.defaultCharacter;
    if (configured && getCharacter(configured)) return configured;
    if (getCharacter("alice")) return "alice";
    return getCharacters()[0].id;
  }

  var selectedCharacterPreference = "";

  function getSelectedCharacterId() {
    if (getCharacter(selectedCharacterPreference))
      return selectedCharacterPreference;
    var stored = "";
    try {
      stored = localStorage.getItem(characterStorageKey) || "";
    } catch (e) {
      // Ignore storage failures.
    }

    return getCharacter(stored) ? stored : getDefaultCharacterId();
  }

  function persistSelectedCharacter(characterId) {
    selectedCharacterPreference = characterId;
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
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-classic-character]"),
      function (button) {
        button.setAttribute(
          "aria-pressed",
          button.getAttribute("data-classic-character") === character.id
            ? "true"
            : "false"
        );
      }
    );
  }

  function getCompanionDock() {
    if (companionPosition) return null;
    return document.querySelector(
      window.innerWidth >= 1000
        ? "[data-companion-dock]"
        : "[data-companion-mobile-dock]"
    );
  }

  function placeCompanion(widget) {
    var dock = getCompanionDock();
    var parent = dock || document.body;
    if (widget.parentNode !== parent) parent.appendChild(widget);
    widget.classList.toggle("is-docked", Boolean(dock));
  }

  function getDisplayConfig() {
    var dock = getCompanionDock();
    var width = dock
      ? Math.max(220, Math.floor(dock.getBoundingClientRect().width) - 12)
      : Math.min(342, Math.max(260, window.innerWidth - 26));
    return {
      width: width,
      height: dock
        ? Math.round(Math.min(300, width * 0.78))
        : Math.max(170, Math.min(260, Math.round(window.innerHeight * 0.31))),
    };
  }

  function constrainCompanionPosition(widget) {
    placeCompanion(widget);
    if (widget.classList.contains("is-docked")) {
      widget.style.left =
        widget.style.top =
        widget.style.right =
        widget.style.bottom =
          "auto";
      var dockHeight = Math.max(540, getDisplayConfig().height + 340);
      widget.style.maxHeight = dockHeight + "px";
      widget.style.setProperty("--vn-available-height", dockHeight + "px");
      return;
    }
    if (!companionPosition) {
      var top = Math.max(12, Math.min(160, window.innerHeight - 710));
      widget.style.left = "auto";
      widget.style.top = companionMinimized ? "auto" : top + "px";
      widget.style.right = "12px";
      widget.style.bottom = companionMinimized ? "16px" : "auto";
      var available = companionMinimized
        ? window.innerHeight - 24
        : window.innerHeight - top - 16;
      widget.style.maxHeight = available + "px";
      widget.style.setProperty("--vn-available-height", available + "px");
      return;
    }
    var bounds = widget.getBoundingClientRect();
    companionPosition.x = Math.max(
      8,
      Math.min(companionPosition.x, window.innerWidth - bounds.width - 8)
    );
    companionPosition.y = Math.max(
      8,
      Math.min(companionPosition.y, window.innerHeight - bounds.height - 8)
    );
    widget.style.left = companionPosition.x + "px";
    widget.style.top = companionPosition.y + "px";
    widget.style.right = "auto";
    widget.style.bottom = "auto";
    var available = window.innerHeight - companionPosition.y - 8;
    widget.style.maxHeight = available + "px";
    widget.style.setProperty("--vn-available-height", available + "px");
  }

  function renderCompanionVisibility(widget) {
    var state = companionMinimized ? "true" : "false";
    if (widget.getAttribute("data-companion-minimized") === state) return;
    widget.setAttribute("data-companion-minimized", state);
    widget.classList.toggle("is-minimized", companionMinimized);
    widget.querySelector("[data-companion-content]").hidden =
      companionMinimized;
    var button = widget.querySelector("[data-companion-minimize]");
    button.setAttribute("aria-expanded", companionMinimized ? "false" : "true");
    button.setAttribute(
      "aria-label",
      companionMinimized ? "ウィンドウを開く" : "最小化"
    );
    button.setAttribute("title", companionMinimized ? "開く" : "最小化");
    button.textContent = companionMinimized ? "□" : "_";
  }

  function setCompanionMinimized(minimized) {
    companionVisibilityChosen = true;
    companionMinimized = minimized;
    var elements = ensureWidget();
    if (!elements) return;
    renderCompanionVisibility(elements.widget);
    window.SiteCompanion.setVisible(!minimized && isPreferenceEnabled());
    applyResponsiveSize();
    if (
      !minimized &&
      (!currentModel || currentCharacterId !== getSelectedCharacterId())
    )
      initLive2D();
  }

  function ensureCompanionShell(widget) {
    var content = widget.querySelector("[data-companion-content]");
    if (content) return content;
    widget.classList.add("classic-companion");
    widget.setAttribute("role", "region");
    widget.setAttribute("aria-labelledby", "companion-title");
    widget.innerHTML = [
      '<div class="companion-titlebar" data-companion-titlebar tabindex="0" title="ドラッグで移動・ダブルクリックで元の位置へ">',
      '<span id="companion-title" class="companion-title"><span data-companion-name>幻想通信</span></span>',
      '<div class="companion-controls">',
      '<button type="button" data-companion-minimize aria-label="最小化" aria-expanded="true" aria-controls="companion-content" title="最小化">_</button>',
      '<button type="button" data-companion-close aria-label="閉じる" title="閉じる">×</button>',
      "</div></div>",
      '<div id="companion-content" data-companion-content>',
      '<div class="companion-stage" data-companion-stage><span class="companion-load-status" role="status">読み込み中…</span></div>',
      '<div class="companion-conversation" data-companion-conversation><p class="companion-prompt">……</p></div>',
      '<div class="companion-footer" data-companion-footer></div>',
      "</div>",
    ].join("");
    widget
      .querySelector("[data-companion-minimize]")
      .addEventListener("click", function () {
        setCompanionMinimized(!companionMinimized);
      });
    widget
      .querySelector("[data-companion-close]")
      .addEventListener("click", function () {
        window.SiteCompanionVisibility.set(false);
        var options = document.querySelector("[data-site-options-trigger]");
        if (options) options.focus({ preventScroll: true });
      });
    var titlebar = widget.querySelector("[data-companion-titlebar]");
    var drag = null;
    titlebar.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || event.target.closest("button")) return;
      var bounds = widget.getBoundingClientRect();
      drag = { x: event.clientX - bounds.left, y: event.clientY - bounds.top };
      titlebar.setPointerCapture(event.pointerId);
      widget.classList.add("is-dragging");
      event.preventDefault();
    });
    titlebar.addEventListener("pointermove", function (event) {
      if (!drag) return;
      var wasDocked = widget.classList.contains("is-docked");
      companionPosition = {
        x: event.clientX - drag.x,
        y: event.clientY - drag.y,
      };
      if (wasDocked) {
        applyResponsiveSize();
        titlebar.setPointerCapture(event.pointerId);
      } else constrainCompanionPosition(widget);
    });
    function endDrag() {
      drag = null;
      widget.classList.remove("is-dragging");
    }
    titlebar.addEventListener("pointerup", endDrag);
    titlebar.addEventListener("pointercancel", endDrag);
    titlebar.addEventListener("lostpointercapture", endDrag);
    titlebar.addEventListener("dblclick", function (event) {
      if (event.target.closest("button")) return;
      companionPosition = null;
      applyResponsiveSize();
    });
    titlebar.addEventListener("keydown", function (event) {
      if (event.target !== titlebar) return;
      if (event.key === "Home") {
        companionPosition = null;
      } else {
        var directions = {
          ArrowLeft: [-1, 0],
          ArrowRight: [1, 0],
          ArrowUp: [0, -1],
          ArrowDown: [0, 1],
        };
        var direction = directions[event.key];
        if (!direction) return;
        var bounds = widget.getBoundingClientRect();
        var step = event.shiftKey ? 1 : 10;
        companionPosition = {
          x: bounds.left + direction[0] * step,
          y: bounds.top + direction[1] * step,
        };
      }
      event.preventDefault();
      applyResponsiveSize();
    });
    return widget.querySelector("[data-companion-content]");
  }

  function ensureInteractionUI(widget) {
    return window.SiteCompanion.mount(widget, {
      originals: CHARACTER_INTERACTIONS,
      perform: animateInteraction,
      stopSpeaking: stopLipSync,
      speak: function () {
        if (!currentModel || currentCharacterId !== getSelectedCharacterId())
          return;
        if (!lipSyncEndsAt) lipSyncStartedAt = window.performance.now();
        lipSyncEndsAt = window.performance.now() + 180;
        widget.setAttribute("data-live2d-speaking", "true");
      },
      select: selectCharacter,
      lighting: function () {
        if (syncModelLighting) syncModelLighting();
      },
      retry: function () {
        window.__sitePixiLibraryPromise = null;
        window.__siteCubismCoreLibraryPromise = null;
        window.__siteLive2DDisplayLibraryPromise = null;
        initLive2D();
      },
      resetPosition: function () {
        companionPosition = null;
        applyResponsiveSize();
      },
    });
  }

  function ensureWidget() {
    if (!document.body) return null;

    var widget = document.getElementById("live2d-widget") || companionWidget;
    if (!widget) {
      widget = document.createElement("div");
      widget.id = "live2d-widget";
      widget.className = "live2d-widget-container";
      document.body.appendChild(widget);
    }
    companionWidget = widget;
    placeCompanion(widget);
    widget.removeAttribute("aria-hidden");
    ensureCompanionShell(widget);
    if (!companionVisibilityChosen) companionMinimized = false;
    renderCompanionVisibility(widget);
    var stage = widget.querySelector("[data-companion-stage]");

    var canvas = document.getElementById("live2dcanvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "live2dcanvas";
      stage.appendChild(canvas);
    } else if (canvas.parentNode !== stage) {
      stage.appendChild(canvas);
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
    var modelHeight = Math.max(currentModel.height || 1, 1);
    // Frame the upper half of the original model canvas; preserve its own motion rig.
    var cameras = {
      alice: { crop: 0.46, top: 0.13 },
      marisa: { crop: 0.48, top: 0.1 },
      patchouli: { crop: 0.46, top: 0.13 },
    };
    var camera = cameras[currentCharacterId] || cameras.alice;
    var scale = display.height / (modelHeight * camera.crop);
    currentModel.anchor.set(0.5, 0);
    currentModel.scale.set(scale);
    currentModel.x = display.width * 0.5;
    currentModel.y = -modelHeight * scale * camera.top;
  }

  function applyPointerFocus() {
    focusFrame = 0;
    if (
      !application ||
      !currentModel ||
      companionGameActive ||
      prefersReducedMotion()
    )
      return;

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

    var display = getDisplayConfig();
    elements.widget.style.setProperty("--vn-width", display.width + 10 + "px");
    elements.widget.style.height = "auto";
    elements.trigger.hidden = false;
    window.SiteCompanion.setVisible(
      !companionMinimized && !shouldDisableLive2D()
    );
    if (application) {
      if (
        companionMinimized ||
        companionGameActive ||
        shouldDisableLive2D() ||
        document.hidden
      )
        application.stop();
      else application.start();
    }
    elements.canvas.style.width = display.width + "px";
    elements.canvas.style.height = display.height + "px";

    if (application && application.renderer) {
      application.renderer.resize(display.width, display.height);
      fitCurrentModel();
    }
    // Clamp after the stage has its new height, including after a rotation.
    constrainCompanionPosition(elements.widget);

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
    document.addEventListener("site:before-content-replace", function () {
      if (companionWidget) document.body.appendChild(companionWidget);
    });
  }

  function loadScriptOnce(cacheKey, source, isReady) {
    if (isReady()) return Promise.resolve();
    if (window[cacheKey]) return window[cacheKey];

    window[cacheKey] = new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[src="' + source + '"]');
      if (existing) existing.remove();

      var script = document.createElement("script");
      script.src = source;
      script.async = true;
      script.crossOrigin = "anonymous";
      var deadline = window.setTimeout(function () {
        script.remove();
        window[cacheKey] = null;
        reject(new Error("Library timeout"));
      }, 20000);
      script.onload = function () {
        clearTimeout(deadline);
        resolve();
      };
      script.onerror = function () {
        clearTimeout(deadline);
        script.remove();
        window[cacheKey] = null;
        reject(new Error("Library unavailable"));
      };
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

    syncModelLighting = window.CompanionLighting.create(
      application,
      elements.widget
    );
    syncModelLighting();

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
        var blend = prefersReducedMotion() ? 1 : 1 - Math.exp(-elapsed / 260);
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
      if (!prefersReducedMotion()) scheduleNextExpression();
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
    var elements = ensureWidget();
    if (elements) {
      elements.widget.removeAttribute("data-live2d-breathing");
    }
  }

  function startBreathingLoop(model) {
    stopBreathingLoop();
    if (prefersReducedMotion() || !model || model !== currentModel) {
      return;
    }

    breathModel = model;
    breathStartedAt = window.performance.now();

    breathHandler = function () {
      if (!breathModel || breathModel !== currentModel) return;
      var elapsed = (window.performance.now() - breathStartedAt) / 1000;
      var phase = Math.sin((elapsed * Math.PI * 2) / 5.8);
      var breathCoreModel = breathModel.internalModel.coreModel;
      breathCoreModel.addParameterValueById("ParamBodyWeight", phase * 0.32);
      breathCoreModel.addParameterValueById(
        "ParamLeftShoulderUpDown",
        phase * 0.12
      );
      breathCoreModel.addParameterValueById(
        "ParamRightShoulderUpDown",
        phase * 0.12
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

  function stopLipSync() {
    lipSyncStartedAt = 0;
    lipSyncEndsAt = 0;
    if (lipSyncModel)
      lipSyncModel.internalModel.coreModel.setParameterValueById(
        "ParamMouthOpenY",
        0
      );
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
      // Hold the selected pose after its transition. Cubism's idle/breathing
      // update must not gradually restore the old arms, book or head angle.
      var core = partOpacityModel.internalModel.coreModel;
      var focus = partOpacityModel.internalModel.focusController;
      var reducedMotion = prefersReducedMotion();
      Object.keys(partOpacityActiveState.staticParameters).forEach(
        function (id) {
          var value = partOpacityActiveState.staticParameters[id];
          if (!reducedMotion) {
            if (id === "ParamAngleX") value += focus.x * 8;
            if (id === "ParamAngleY") value += focus.y * 5;
            if (id === "ParamBodyAngleX") value += focus.x * 2;
          }
          core.setParameterValueById(id, value);
        }
      );
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
      staticParameters:
        typeof frozenTime === "number" ? state.staticParameters || {} : {},
    };
  }

  function applyStaticPose(model, poseId) {
    if (!model || model !== currentModel) {
      return Promise.resolve(false);
    }

    var requestGeneration = ++partOpacityRequestGeneration;
    return loadPartOpacityState(model, poseId + poseId).then(function (state) {
      if (
        requestGeneration !== partOpacityRequestGeneration ||
        model !== currentModel
      ) {
        return false;
      }

      model.internalModel.motionManager.stopAllMotions();
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
      currentPoseId = poseId;
      companionWidget.setAttribute("data-live2d-pose-id", poseId);
      companionWidget.setAttribute("data-live2d-motion-id", "static");
      companionWidget.setAttribute("data-live2d-resting", "true");
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
        return model.motion("", motionIndex, 3).then(function (started) {
          return started ? loadedResources[0].duration * 1000 + 30 : 0;
        });
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
    // Keep this line's face throughout typing, choices and reading. The next
    // line, rather than a wall-clock timeout, supplies its replacement.
    expressionTimer = 0;
  }

  function clearInteractionTimers() {
    interactionMotionGeneration += 1;
    interactionMotionPending = false;
    requestedPoseId = "1";
    if (interactionMotionTimer) {
      window.clearTimeout(interactionMotionTimer);
      interactionMotionTimer = 0;
    }
  }

  function updateInteractionUI(character) {
    if (character) window.SiteCompanion.setCharacter(character.id);
  }

  function animateInteraction(interaction) {
    if (
      !currentModel ||
      currentCharacterId !== getSelectedCharacterId() ||
      !shouldRenderLive2D()
    )
      return;
    setInteractionExpression(interaction.expressionMotionId || "01");
    requestedPoseId = /^[1-5]$/.test(interaction.poseId)
      ? interaction.poseId
      : "1";
    companionWidget.setAttribute("data-live2d-requested-pose", requestedPoseId);
    moveToRequestedPose();
  }

  function moveToRequestedPose() {
    // Finish the current transition, then take the latest queued pose. Rapid
    // next/topic clicks never drop the newest line or stack obsolete motions.
    if (
      interactionMotionPending ||
      !currentModel ||
      currentPoseId === requestedPoseId
    )
      return;
    var model = currentModel,
      targetPose = requestedPoseId;
    var motionGeneration = ++interactionMotionGeneration;
    interactionMotionPending = true;
    function isCurrent() {
      return (
        motionGeneration === interactionMotionGeneration &&
        model === currentModel
      );
    }
    function settle() {
      if (!isCurrent()) return;
      applyStaticPose(model, targetPose).then(function () {
        if (!isCurrent()) return;
        interactionMotionPending = false;
        preloadPoseMotions(model, targetPose);
        moveToRequestedPose();
      });
    }
    if (prefersReducedMotion()) {
      settle();
      return;
    }
    playMotionById(model, currentPoseId + targetPose, false).then(
      function (duration) {
        if (!isCurrent()) return;
        if (!duration) settle();
        else interactionMotionTimer = window.setTimeout(settle, duration);
      }
    );
  }

  function destroyCurrentModel() {
    if (!currentModel) return;
    clearInteractionTimers();
    stopLipSync();
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
    var generation = ++modelLoadGeneration;
    var elements = ensureWidget();
    if (currentModel && currentCharacterId === character.id) {
      elements.widget.classList.remove("is-loading", "has-live2d-error");
      currentModel.visible = true;
      fitCurrentModel();
      updateInteractionUI(character);
      window.SiteCompanion.setReady("ready");
      return Promise.resolve(currentModel);
    }

    window.SiteCompanion.setReady("loading");
    if (currentModel) currentModel.visible = false;

    var deadline = setTimeout(function () {
      if (generation === modelLoadGeneration)
        window.SiteCompanion.setReady("error");
    }, 25000);
    return window.PIXI.live2d.Live2DModel.from(character.modelPath, {
      autoInteract: false,
      motionPreload: window.PIXI.live2d.MotionPreloadStrategy.NONE,
    })
      .then(function (model) {
        clearTimeout(deadline);
        if (generation !== modelLoadGeneration) {
          // Texture.fromURL caches by URL. A newer load of the same character
          // may already be using these textures; discard only the stale rig.
          model.destroy({ children: true, texture: false, baseTexture: false });
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
        var restPoseReady = applyStaticPose(model, "1");
        preloadPoseMotions(model, "1");
        var expressionReady = startExpressionLoop(model, character).catch(
          function () {
            // Keep the model usable if optional expression data fails to load.
          }
        );
        elements.widget.setAttribute("data-live2d-character", character.id);
        updateInteractionUI(character);
        return Promise.all([restPoseReady, expressionReady]).then(function () {
          if (model !== currentModel || generation !== modelLoadGeneration)
            return null;
          startEyeBlinkLoop(model);
          startLipSyncLoop(model);
          startBreathingLoop(model);
          window.SiteCompanion.setReady("ready");
          return model;
        });
      })
      .catch(function (error) {
        clearTimeout(deadline);
        if (generation === modelLoadGeneration) {
          window.SiteCompanion.setReady("error");
        }
        // A stale request must never mark the currently selected model as failed.
        // Current failures have already been rendered above; do not rethrow them
        // into an earlier initLive2D promise chain.
        return null;
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
    var name = window.CompanionStories.characters[selected.id].name;
    var label = "テーマ：" + name;
    var accessibleLabel = "テーマを切り替える：" + name;

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
    selectCharacter(next.id);
  }

  function selectCharacter(characterId) {
    var character = getCharacter(characterId);
    if (!character) return;
    if (
      currentModel &&
      currentCharacterId === character.id &&
      getSelectedCharacterId() === character.id &&
      !companionWidget.classList.contains("is-loading")
    )
      return;
    var selectionGeneration = ++modelLoadGeneration;
    persistSelectedCharacter(character.id);
    syncCharacterTheme(character.id);
    window.SiteCompanion.setCharacter(character.id);
    renderCharacterButton(ensureCharacterButton());
    clearInteractionTimers();
    stopLipSync();

    if (shouldRenderLive2D()) {
      window.SiteCompanion.setReady("loading");
      if (currentModel) currentModel.visible = false;
      loadLibraries()
        .then(function () {
          if (selectionGeneration !== modelLoadGeneration) return null;
          ensureApplication();
          return loadCharacter(character.id);
        })
        .catch(function () {
          if (selectionGeneration === modelLoadGeneration)
            window.SiteCompanion.setReady("error");
        });
    }
  }

  function bindCharacterButton() {
    Array.prototype.forEach.call(
      document.querySelectorAll("[data-classic-character]"),
      function (button) {
        if (button.getAttribute("data-classic-character-bound") === "true")
          return;
        button.setAttribute("data-classic-character-bound", "true");
        button.addEventListener("click", function () {
          selectCharacter(button.getAttribute("data-classic-character"));
        });
      }
    );
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
      stopLipSync();
      return;
    }

    window.SiteCompanion.setCharacter(getSelectedCharacterId());
    if (!currentModel) window.SiteCompanion.setReady("loading");
    var libraryGeneration = modelLoadGeneration;
    loadLibraries()
      .then(function () {
        if (libraryGeneration !== modelLoadGeneration) return null;
        ensureApplication();
        applyResponsiveSize();
        return loadCharacter(getSelectedCharacterId());
      })
      .catch(function () {
        if (libraryGeneration !== modelLoadGeneration) return;
        var elements = ensureWidget();
        if (elements) {
          window.SiteCompanion.setReady("error");
        }
        // Live2D is decorative; do not block the page if it fails.
      });
  }

  document.addEventListener("visibilitychange", applyResponsiveSize);
  document.addEventListener("site:companion-game", function (event) {
    companionGameActive = event.detail.active;
    applyResponsiveSize();
  });
  document.addEventListener("site:content-updated", initLive2D);
  document.addEventListener("site:live2d-toggle", function (event) {
    var detail = event.detail || {};
    if (detail.layoutChanged) companionPosition = null;
    if (detail.enabled) setCompanionMinimized(false);
    initLive2D();
    if (detail.enabled && detail.userInitiated && window.innerWidth < 1000) {
      requestAnimationFrame(function () {
        companionWidget.scrollIntoView({
          block: "center",
          behavior: "instant",
        });
        companionWidget
          .querySelector("[data-companion-titlebar]")
          .focus({ preventScroll: true });
      });
    }
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initLive2D);
  } else {
    initLive2D();
  }
})();
