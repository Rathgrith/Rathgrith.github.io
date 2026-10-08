/* A contained arcade view; no game input or animation survives leaving the view. */
(function () {
  "use strict";
  var root,
    view,
    hooks,
    game,
    renderer,
    canvas,
    raf = 0,
    previous = 0,
    accumulator = 0;
  var active = false,
    visible = true,
    playerId = "alice",
    keys = {},
    drag = null,
    target = null,
    slow = false;
  var records = {},
    storageKey = "site-danmaku-records-v1",
    hudAt = 0;
  var cast = DanmakuEngine.cast;
  try {
    var stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
    Object.keys(cast).forEach(function (p) {
      Object.keys(cast).forEach(function (e) {
        var value = stored && stored[p + ":" + e];
        if (Number.isSafeInteger(value) && value >= 0)
          records[p + ":" + e] = value;
      });
    });
  } catch (_) {}
  function q(s) {
    return view.querySelector(s);
  }
  function score(n) {
    return String(Math.floor(n)).padStart(7, "0");
  }
  function recordKey() {
    return game.state.playerId + ":" + game.state.enemyId;
  }
  function save() {
    if (!game) return;
    records[recordKey()] = Math.max(
      records[recordKey()] || 0,
      Math.floor(game.state.score)
    );
    try {
      localStorage.setItem(storageKey, JSON.stringify(records));
    } catch (_) {}
  }
  function clearInput() {
    keys = {};
    drag = target = null;
    slow = false;
    if (view) q("[data-danmaku-slow]").setAttribute("aria-pressed", "false");
  }
  function stop() {
    cancelAnimationFrame(raf);
    raf = 0;
    previous = accumulator = 0;
    clearInput();
  }
  function syncHUD() {
    if (!game) return;
    var s = game.state;
    q("[data-danmaku-score]").textContent = score(s.score);
    q("[data-danmaku-best]").textContent = score(
      Math.max(s.score, records[recordKey()] || 0)
    );
    q("[data-danmaku-lives]").textContent =
      "◆".repeat(s.lives) + "◇".repeat(3 - s.lives);
    q("[data-danmaku-bombs]").textContent = s.bombs;
    q("[data-danmaku-bomb]").disabled =
      !s.bombs || s.phase !== "playing" || Boolean(s.spell) || s.countdown > 0;
    q("[data-danmaku-level]").textContent = s.level;
    q("[data-danmaku-graze]").textContent = s.grazes;
    root.dataset.danmakuState = s.phase;
  }
  function overlay() {
    var s = game.state,
      over = s.phase === "over";
    q("[data-danmaku-overlay]").hidden = s.phase === "playing";
    q("[data-danmaku-overlay-title]").textContent = over
      ? "挑戦終了"
      : "一時停止";
    q("[data-danmaku-result]").textContent =
      "得点 " +
      score(s.score) +
      " · " +
      Math.floor(s.time) +
      "秒 · 擦弾 " +
      s.grazes;
    q("[data-danmaku-resume]").hidden = over;
    q("[data-danmaku-pause]").disabled = s.phase !== "playing";
    q("[data-danmaku-canvas-wrap]").inert = s.phase !== "playing";
    q("[data-danmaku-controls]").inert = s.phase !== "playing";
    syncHUD();
  }
  function pause() {
    if (!active || !game || game.state.phase !== "playing") return;
    game.pause();
    stop();
    renderer.draw(game.state);
    overlay();
    q("[data-danmaku-announcement]").textContent = "一時停止";
  }
  function frame(now) {
    raf = 0;
    if (!active || !visible || !game || game.state.phase !== "playing") return;
    accumulator += previous ? Math.min(0.1, (now - previous) / 1000) : 0;
    previous = now;
    while (accumulator >= 1 / 60 && game.state.phase === "playing") {
      game.step(1 / 60, {
        x:
          (keys.ArrowRight || keys.d ? 1 : 0) -
          (keys.ArrowLeft || keys.a ? 1 : 0),
        y:
          (keys.ArrowDown || keys.s ? 1 : 0) - (keys.ArrowUp || keys.w ? 1 : 0),
        focus: keys.Shift || slow,
        target: target,
      });
      accumulator -= 1 / 60;
    }
    renderer.draw(game.state);
    if (now - hudAt > 100) {
      syncHUD();
      hudAt = now;
    }
    if (game.state.phase === "over") {
      save();
      stop();
      overlay();
      q("[data-danmaku-announcement]").textContent =
        "挑戦終了。得点 " + Math.floor(game.state.score);
      q("[data-danmaku-retry]").focus({ preventScroll: true });
    } else raf = requestAnimationFrame(frame);
  }
  function resume() {
    if (
      !active ||
      !visible ||
      document.hidden ||
      !game ||
      game.state.phase !== "paused"
    )
      return;
    clearInput();
    game.resume();
    overlay();
    previous = accumulator = 0;
    canvas.focus({ preventScroll: true });
    raf = requestAnimationFrame(frame);
  }
  function lobby() {
    save();
    stop();
    game = null;
    root.dataset.danmakuState = "lobby";
    q("[data-danmaku-lobby]").hidden = false;
    q("[data-danmaku-battle]").hidden = true;
    q("[data-danmaku-heading]").textContent = "弾幕遊戯";
    renderSelection();
  }
  function renderSelection() {
    view.querySelectorAll("[data-danmaku-player]").forEach(function (b) {
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.danmakuPlayer === playerId)
      );
    });
    view.querySelectorAll("[data-danmaku-record]").forEach(function (e) {
      e.textContent =
        "最高 " + score(records[playerId + ":" + e.dataset.danmakuRecord] || 0);
    });
  }
  function open() {
    if (active) return;
    active = true;
    playerId = hooks.character();
    view.hidden = false;
    hooks.activate(true);
    lobby();
    q('[data-danmaku-challenge="' + hooks.character() + '"]').focus({
      preventScroll: true,
    });
  }
  function close() {
    if (!active) return;
    save();
    stop();
    game = null;
    active = false;
    view.hidden = true;
    root.dataset.danmakuState = "closed";
    hooks.activate(false);
    root.querySelector("[data-danmaku-open]").focus({ preventScroll: true });
  }
  function start(enemyId) {
    if (!cast[enemyId] || !active) return;
    save();
    stop();
    game = DanmakuEngine.create(playerId, enemyId);
    view.dataset.enemy = enemyId;
    q("[data-danmaku-heading]").textContent =
      cast[enemyId].name + "戦 · 耐久 ∞";
    q("[data-danmaku-pattern]").textContent = cast[enemyId].pattern;
    q("[data-danmaku-lobby]").hidden = true;
    q("[data-danmaku-battle]").hidden = false;
    if (!renderer) renderer = DanmakuRenderer.create(canvas);
    if (!renderer.supported) {
      lobby();
      q("[data-danmaku-help]").textContent =
        "このブラウザーでは描画できません。";
      return;
    }
    overlay();
    renderer.draw(game.state);
    canvas.focus({ preventScroll: true });
    canvas.scrollIntoView({ block: "nearest" });
    q("[data-danmaku-announcement]").textContent =
      cast[enemyId].name + "に挑戦。自機は" + cast[playerId].name;
    // Local sprites may finish decoding during the countdown; gameplay never awaits a CDN.
    raf = requestAnimationFrame(frame);
  }
  function bomb() {
    if (game && game.bomb()) {
      // The cooldown disables its button; move focus first so that the browser's
      // implicit blur cannot accidentally pause a pointer-triggered spell.
      canvas.focus({ preventScroll: true });
      syncHUD();
      q("[data-danmaku-announcement]").textContent =
        "霊撃。残り " + game.state.bombs;
    }
  }
  function point(event) {
    var r = canvas.getBoundingClientRect();
    return {
      x: ((event.clientX - r.left) * DanmakuEngine.width) / r.width,
      y: ((event.clientY - r.top) * DanmakuEngine.height) / r.height,
    };
  }
  function mount(widget, callbacks) {
    if (root) return;
    root = widget;
    hooks = callbacks;
    var entry = document.createElement("button");
    entry.type = "button";
    entry.className = "vn-arcade-entry";
    entry.dataset.danmakuOpen = "";
    entry.innerHTML =
      '<span aria-hidden="true">✦</span> 弾幕に挑戦 <span aria-hidden="true">▸</span>';
    root.querySelector(".vn-weather-strip").before(entry);
    entry.addEventListener("click", open);
    view = document.createElement("section");
    view.className = "vn-danmaku-view";
    view.hidden = true;
    view.lang = "ja";
    view.setAttribute("aria-label", "弾幕遊戯");
    var ids = Object.keys(cast);
    view.innerHTML =
      '<header class="danmaku-header"><strong data-danmaku-heading>弾幕遊戯</strong><button type="button" data-danmaku-exit>会話へ</button></header>' +
      '<div class="danmaku-lobby" data-danmaku-lobby><div class="danmaku-kicker">無限スコアアタック</div><h3>自機を選ぶ</h3><div class="danmaku-pilots">' +
      ids
        .map(function (id) {
          return (
            '<button type="button" data-danmaku-player="' +
            id +
            '" aria-pressed="false"><img src="/assets/images/classic/danmaku/' +
            id +
            '.svg" alt=""><strong>' +
            cast[id].name +
            "</strong><small>" +
            cast[id].shot +
            "</small></button>"
          );
        })
        .join("") +
      '</div><h3>挑戦する相手</h3><div class="danmaku-opponents">' +
      ids
        .map(function (id) {
          return (
            '<button type="button" data-danmaku-challenge="' +
            id +
            '"><img src="/assets/images/classic/characters/' +
            id +
            '.svg" alt=""><span><strong>' +
            cast[id].name +
            "に挑む</strong><small>" +
            cast[id].pattern +
            '</small></span><span class="danmaku-record" data-danmaku-record="' +
            id +
            '"></span><span aria-hidden="true">▸</span></button>'
          );
        })
        .join("") +
      '</div><details class="danmaku-help"><summary>遊び方</summary><p data-danmaku-help>射撃は自動。矢印 / WASD で移動、Shift で低速、X で霊撃。タッチは画面をドラッグ。中央の小さな点が当たり判定。</p><p>命中・生存・擦弾で得点。敵は無敵、20秒ごとに段位が上がり、弾幕は徐々に濃くなる。残機3、霊撃2。P / Esc で一時停止。</p></details></div>' +
      '<div class="danmaku-battle" data-danmaku-battle hidden><div class="danmaku-hud"><div>得点 <strong data-danmaku-score>0000000</strong></div><div>最高 <span data-danmaku-best>0000000</span></div><div>残機 <span data-danmaku-lives>◆◆◆</span> · 符 <span data-danmaku-bombs>2</span></div><div>段位 <span data-danmaku-level>1</span> · 擦弾 <span data-danmaku-graze>0</span></div></div>' +
      '<div class="danmaku-pattern" data-danmaku-pattern></div><div class="danmaku-arena"><div class="danmaku-canvas-wrap" data-danmaku-canvas-wrap><canvas data-danmaku-canvas tabindex="0" role="img" aria-label="弾幕戦。矢印かWASDで移動、Shiftで低速、Xで霊撃、Pで一時停止。タッチはドラッグ。"></canvas></div>' +
      '<div class="danmaku-overlay" data-danmaku-overlay hidden><h3 data-danmaku-overlay-title></h3><p data-danmaku-result></p><button type="button" data-danmaku-resume>続ける</button><button type="button" data-danmaku-retry>もう一度</button><button type="button" data-danmaku-menu>相手を選ぶ</button></div></div>' +
      '<div class="danmaku-controls" data-danmaku-controls><button type="button" data-danmaku-slow aria-pressed="false">低速</button><button type="button" data-danmaku-bomb>霊撃 X</button><button type="button" data-danmaku-pause>一時停止</button></div></div><span class="visually-hidden" data-danmaku-announcement aria-live="polite" aria-atomic="true"></span>';
    root.querySelector("[data-companion-content]").appendChild(view);
    canvas = q("[data-danmaku-canvas]");
    new ResizeObserver(function () {
      var box = q("[data-danmaku-canvas-wrap]").getBoundingClientRect();
      var scale = Math.min(
        box.width / DanmakuEngine.width,
        box.height / DanmakuEngine.height
      );
      if (scale > 0) {
        canvas.style.width = Math.floor(DanmakuEngine.width * scale) + "px";
        canvas.style.height = Math.floor(DanmakuEngine.height * scale) + "px";
      }
    }).observe(q("[data-danmaku-canvas-wrap]"));
    view.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-danmaku-exit")) close();
      if (b.dataset.danmakuPlayer) {
        playerId = b.dataset.danmakuPlayer;
        renderSelection();
      }
      if (b.dataset.danmakuChallenge) start(b.dataset.danmakuChallenge);
      if (b.hasAttribute("data-danmaku-pause")) {
        pause();
        q("[data-danmaku-resume]").focus();
      }
      if (b.hasAttribute("data-danmaku-resume")) resume();
      if (b.hasAttribute("data-danmaku-retry")) start(game.state.enemyId);
      if (b.hasAttribute("data-danmaku-menu")) {
        lobby();
        q('[data-danmaku-player="' + playerId + '"]').focus();
      }
      if (b.hasAttribute("data-danmaku-bomb")) bomb();
      if (b.hasAttribute("data-danmaku-slow")) {
        slow = !slow;
        b.setAttribute("aria-pressed", String(slow));
      }
    });
    view.addEventListener("keydown", function (e) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (!game) {
        if (e.key === "Escape") {
          e.preventDefault();
          close();
        }
        return;
      }
      var key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (
        [
          "ArrowLeft",
          "ArrowRight",
          "ArrowUp",
          "ArrowDown",
          "w",
          "a",
          "s",
          "d",
          "Shift",
          "x",
          "p",
          "Escape",
        ].indexOf(key) < 0
      )
        return;
      e.preventDefault();
      e.stopPropagation();
      if (key === "p" || key === "Escape") {
        if (game.state.phase === "over") {
          if (key === "Escape") {
            lobby();
            q('[data-danmaku-player="' + playerId + '"]').focus();
          }
          return;
        }
        if (!e.repeat) {
          if (game.state.phase === "paused") resume();
          else {
            pause();
            q("[data-danmaku-resume]").focus();
          }
        }
        return;
      }
      if (game.state.phase !== "playing") return;
      keys[key] = true;
      if (key === "x" && !e.repeat) bomb();
      if (/^(Arrow|[wasd]$)/.test(key)) target = null;
    });
    window.addEventListener("keyup", function (e) {
      delete keys[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    });
    canvas.addEventListener("pointerdown", function (e) {
      if (!game || game.state.phase !== "playing" || drag || e.button !== 0)
        return;
      e.preventDefault();
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
      drag = {
        id: e.pointerId,
        origin: point(e),
        player: { x: game.state.player.x, y: game.state.player.y },
      };
    });
    canvas.addEventListener("pointermove", function (e) {
      if (!drag || drag.id !== e.pointerId) return;
      var p = point(e);
      target = {
        x: drag.player.x + p.x - drag.origin.x,
        y: drag.player.y + p.y - drag.origin.y,
      };
    });
    canvas.addEventListener("pointerup", function () {
      drag = target = null;
    });
    canvas.addEventListener("pointercancel", pause);
    window.addEventListener("blur", pause);
    window.addEventListener("resize", pause);
    window.addEventListener("pagehide", function () {
      pause();
      save();
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) pause();
    });
    document.addEventListener("site:before-content-replace", pause);
    root
      .querySelector("[data-companion-titlebar]")
      .addEventListener("pointerdown", pause);
    view.addEventListener("focusout", function (e) {
      if (!view.contains(e.relatedTarget)) pause();
    });
    new IntersectionObserver(
      function (entries) {
        if (entries[0].intersectionRatio < 0.3) pause();
      },
      { threshold: [0, 0.3] }
    ).observe(canvas);
  }
  window.CompanionDanmaku = {
    mount: mount,
    setVisible: function (value) {
      visible = value;
      if (!value) pause();
    },
  };
})();
