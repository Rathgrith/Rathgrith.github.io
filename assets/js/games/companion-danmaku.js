/* A contained arcade view; no game input or animation survives leaving the view. */
(function () {
  "use strict";
  var root,
    view,
    hooks,
    game,
    renderer,
    audio,
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
    slow = false,
    autoMode = false,
    chargeHeld = false,
    battleMode = "score",
    renderers = {},
    canvasSize = { width: 240, height: 360 };
  var records = {},
    storageKey = "site-danmaku-records-v3",
    hudAt = 0,
    roundShown = false;
  var cast = DanmakuEngine.cast;
  try {
    var stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
    Object.keys(cast).forEach(function (p) {
      Object.keys(cast).forEach(function (e) {
        ["", ":auto", "flower", "flower:auto"].forEach(function (mode) {
          var key =
              (mode.indexOf("flower") === 0 ? "flower:" : "") +
              p +
              ":" +
              e +
              (mode.endsWith(":auto") ? ":auto" : ""),
            value = stored && stored[key];
          if (Number.isSafeInteger(value) && value >= 0) records[key] = value;
        });
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
    return (
      (game.state.mode === "flower" ? "flower:" : "") +
      game.state.playerId +
      ":" +
      game.state.enemyId +
      (game.state.assisted ? ":auto" : "")
    );
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
    chargeHeld = false;
    if (game && game.cancelCharge) game.cancelCharge();
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
    var s = game.state,
      flower = s.mode === "flower";
    if (flower) {
      var a = s.fields[0],
        b = s.fields[1];
      q("[data-flower-player-health]").textContent =
        "♥".repeat(a.health) + "♡".repeat(5 - a.health);
      q("[data-flower-cpu-health]").textContent =
        "♥".repeat(b.health) + "♡".repeat(5 - b.health);
      q("[data-flower-score]").textContent = score(s.score);
      q("[data-flower-wins]").textContent = s.wins[0] + " : " + s.wins[1];
      q("[data-flower-combo]").textContent = a.combo + " HIT";
      q("[data-flower-gauge]").textContent = Math.floor(a.gauge / 100) + "/4";
      q("[data-danmaku-bomb]").disabled =
        a.gauge < 200 ||
        a.cooldown > 0 ||
        s.phase !== "playing" ||
        s.countdown > 0 ||
        Boolean(s.intermission);
      q("[data-flower-charge]").disabled =
        s.phase !== "playing" || Boolean(s.intermission) || s.countdown > 0;
      q("[data-flower-charge]").setAttribute(
        "aria-pressed",
        String(a.charging)
      );
      q("[data-danmaku-pattern]").textContent = s.intermission
        ? "ROUND " +
          s.round +
          " · " +
          (s.winner < 0 ? "DRAW" : s.winner === 0 ? "WIN" : "LOSE")
        : "ROUND " +
          s.round +
          " · " +
          (s.auto ? "AUTO vs CPU" : "PLAYER vs CPU");
    } else {
      q("[data-danmaku-score]").textContent = score(s.score);
      q("[data-danmaku-best]").textContent = score(
        Math.max(s.score, records[recordKey()] || 0)
      );
      q("[data-danmaku-lives]").textContent = s.lives;
      q("[data-danmaku-power]").textContent =
        s.power + "/" + DanmakuEngine.maxPower;
      q("[data-danmaku-record-mode]").textContent = s.assisted
        ? "自動記録"
        : "手動記録";
      q("[data-danmaku-bombs]").textContent = s.bombs;
      q("[data-danmaku-bomb]").disabled =
        !s.bombs ||
        s.phase !== "playing" ||
        Boolean(s.spell) ||
        s.countdown > 0 ||
        Boolean(s.intermission);
      q("[data-danmaku-level]").textContent = s.level;
      q("[data-danmaku-graze]").textContent = s.grazes;
      q("[data-danmaku-pattern]").textContent = s.intermission
        ? "一曲終了 · 第" + s.round + "巡"
        : s.intro
          ? "挑戦者を待つ魔女"
          : s.enemySpell.nonspell
            ? "通常 · " + s.enemySpell.nonspellName
            : s.enemySpell.name;
    }
    root.dataset.danmakuState = s.phase;
    var rest = s.intermission,
      show = Boolean(rest && rest.age >= 1.8),
      panel = q("[data-danmaku-round]");
    view.dataset.intermission = rest ? "true" : "false";
    if (show) {
      q("[data-danmaku-round-title]").textContent = cast[s.enemyId].name;
      q("[data-danmaku-round-portrait]").style.backgroundImage =
        'url("/assets/images/classic/danmaku/portraits/' +
        s.enemyId +
        '-expressions.png")';
      q("[data-danmaku-round-line]").textContent = flower
        ? {
            alice: "次のラウンドね。人形たちも準備できているわ。",
            marisa: "次もいくぜ。まだ勝負はついてないからな。",
            patchouli: "次は別の組み合わせを試すわ。",
          }[s.enemyId]
        : {
            alice: "まだ続ける？　次は少し手を変えるわ。",
            marisa: "もう一戦いくか？　まだまだ飛ばせるぜ。",
            patchouli: "もう少し続ける？　次の魔法を用意するわ。",
          }[s.enemyId];
      q("[data-danmaku-round-score]").textContent =
        "今回 +" +
        score(s.score - s.roundStartScore) +
        " / 累計 " +
        score(s.score);
      q("[data-danmaku-round-next]").textContent =
        (flower ? "次のラウンド" : "もう一戦") +
        " · " +
        Math.ceil(rest.remaining);
    }
    if (show !== roundShown) {
      roundShown = show;
      if (!show && panel.contains(document.activeElement))
        canvas.focus({ preventScroll: true });
      panel.hidden = !show;
      clearInput();
      if (show && s.phase === "playing") {
        save();
        q("[data-danmaku-round-next]").focus({ preventScroll: true });
        q("[data-danmaku-announcement]").textContent =
          (flower ? "ラウンド終了。" : "一曲終了。") +
          "得点 " +
          Math.floor(s.score) +
          "。もう一戦進みます。";
      }
    }
  }
  function overlay() {
    var s = game.state,
      over = s.phase === "over";
    q("[data-danmaku-overlay]").hidden = s.phase === "playing";
    q("[data-danmaku-overlay-title]").textContent = over
      ? s.mode === "flower"
        ? s.wins[0] >= 2
          ? "勝利！"
          : s.wins[1] >= 2
            ? "敗北"
            : "対戦終了"
        : "挑戦終了"
      : "一時停止";
    q("[data-danmaku-result]").textContent =
      "得点 " +
      score(s.score) +
      " · " +
      Math.floor(s.time) +
      "秒 · 擦弾 " +
      (s.mode === "flower" ? s.fields[0].grazes : s.grazes) +
      (s.mode === "flower" ? " · " + s.wins[0] + " : " + s.wins[1] : "");
    q("[data-danmaku-resume]").hidden = over;
    q("[data-danmaku-pause]").disabled = s.phase !== "playing";
    q("[data-danmaku-canvas-wrap]").inert = s.phase !== "playing";
    q("[data-danmaku-controls]").inert = s.phase !== "playing";
    q("[data-danmaku-round]").inert = s.phase !== "playing";
    syncHUD();
  }
  function pause() {
    if (!active || !game || game.state.phase !== "playing") return;
    game.pause();
    audio.setScene("paused");
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
        charge: keys.z || chargeHeld,
      });
      accumulator -= 1 / 60;
    }
    audio.syncTimeline(game.state);
    renderer.draw(game.state);
    if (now - hudAt > 100) {
      syncHUD();
      hudAt = now;
    }
    if (game.state.phase === "over") {
      audio.setScene("over");
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
    audio.syncTimeline(game.state);
    audio.setScene("playing", game.state.enemyId);
    overlay();
    previous = accumulator = 0;
    canvas.focus({ preventScroll: true });
    raf = requestAnimationFrame(frame);
  }
  function lobby() {
    audio.setScene("lobby", hooks.character());
    save();
    stop();
    game = null;
    roundShown = false;
    view.dataset.intermission = "false";
    q("[data-danmaku-round]").hidden = true;
    root.dataset.danmakuState = "lobby";
    q("[data-danmaku-lobby]").hidden = false;
    q("[data-danmaku-battle]").hidden = true;
    q("[data-danmaku-heading]").textContent = "弾幕遊戯";
    renderSelection();
  }
  function renderSelection() {
    view.dataset.mode = battleMode;
    view.querySelectorAll("[data-danmaku-game-mode]").forEach(function (b) {
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.danmakuGameMode === battleMode)
      );
    });
    view.querySelectorAll("[data-danmaku-help-mode]").forEach(function (el) {
      el.hidden = el.dataset.danmakuHelpMode !== battleMode;
    });
    q("[data-danmaku-kicker]").textContent =
      battleMode === "flower" ? "花映塚式 · 2本先取" : "無限スコアアタック";
    view.querySelectorAll("[data-danmaku-challenge]").forEach(function (b) {
      b.querySelector("small").textContent =
        battleMode === "flower"
          ? {
              alice: "人形の交差弾 · 幻影攻撃",
              marisa: "星弾 · アースライトレイ",
              patchouli: "五色の弾幕 · 精霊魔法",
            }[b.dataset.danmakuChallenge]
          : cast[b.dataset.danmakuChallenge].pattern;
    });
    view.querySelectorAll("[data-danmaku-player]").forEach(function (b) {
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.danmakuPlayer === playerId)
      );
      b.querySelector("small").textContent =
        battleMode === "flower"
          ? {
              alice: "人形散射",
              marisa: "集中レーザー",
              patchouli: "魔弾三連射",
            }[b.dataset.danmakuPlayer]
          : cast[b.dataset.danmakuPlayer].shot;
    });
    view.querySelectorAll("[data-danmaku-record]").forEach(function (e) {
      e.textContent =
        "最高 " +
        score(
          records[
            (battleMode === "flower" ? "flower:" : "") +
              playerId +
              ":" +
              e.dataset.danmakuRecord +
              (autoMode ? ":auto" : "")
          ] || 0
        );
    });
    view.querySelectorAll("[data-danmaku-auto]").forEach(function (button) {
      button.setAttribute("aria-pressed", String(autoMode));
    });
    q("[data-danmaku-mode-label]").textContent = autoMode
      ? "自動記録"
      : "手動記録";
  }
  function setAuto(value) {
    if (game && game.state.phase === "over") return;
    if (value && game && !game.state.assisted) save();
    autoMode = Boolean(value);
    clearInput();
    if (game) {
      game.setAuto(autoMode);
      syncHUD();
      canvas.focus({ preventScroll: true });
    }
    renderSelection();
    q("[data-danmaku-announcement]").textContent = autoMode
      ? "自動操作"
      : "手動操作";
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
    audio.setScene("closed");
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
    var seed =
      window.crypto && window.crypto.getRandomValues
        ? window.crypto.getRandomValues(new Uint32Array(1))[0]
        : (Date.now() ^ Math.floor(Math.random() * 4294967296)) >>> 0;
    audio.setScene("playing", enemyId, true);
    game = (battleMode === "flower" ? DanmakuFlower : DanmakuEngine).create(
      playerId,
      enemyId,
      seed,
      audio.play
    );
    roundShown = false;
    view.dataset.intermission = "false";
    q("[data-danmaku-round]").hidden = true;
    game.setAuto(autoMode);
    view.dataset.enemy = enemyId;
    q("[data-danmaku-heading]").textContent =
      cast[enemyId].name +
      (battleMode === "flower" ? "戦 · 花映塚式" : "戦 · タイムアタック");
    q("[data-danmaku-pattern]").textContent = cast[enemyId].pattern;
    q("[data-danmaku-lobby]").hidden = true;
    q("[data-danmaku-battle]").hidden = false;
    if (!renderers[battleMode])
      renderers[battleMode] = (
        battleMode === "flower" ? DanmakuFlowerRenderer : DanmakuRenderer
      ).create(canvas);
    renderer = renderers[battleMode];
    q("[data-danmaku-bomb]").textContent =
      battleMode === "flower" ? "ボム X" : "霊撃 X";
    q("[data-flower-charge]").hidden = battleMode !== "flower";
    canvas.setAttribute(
      "aria-label",
      battleMode === "flower"
        ? "花映塚式対戦。矢印かWASDで移動、Shiftで吸霊、Zを長押しして放すとチャージ攻撃、XかBでボム、Tで自動操作、Pで一時停止。左の場地をドラッグ。"
        : "弾幕戦。矢印かWASDで移動、Shiftで低速、Xで霊撃、Tで自動操作、Pで一時停止。タッチはドラッグ。"
    );
    resizeCanvas();
    if (!renderer.supported) {
      lobby();
      q("[data-danmaku-help]").textContent =
        "このブラウザーでは描画できません。";
      return;
    }
    overlay();
    renderer.draw(game.state);
    // A resize/pause can stop RAF before the new local artwork finishes loading.
    renderer.ready.then(function () {
      if (active && game) renderer.draw(game.state);
    });
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
        game.state.mode === "flower"
          ? "クイックカードアタック"
          : "霊撃。残り " + game.state.bombs;
    }
  }
  function point(event) {
    var r = canvas.getBoundingClientRect();
    var p = {
      x: ((event.clientX - r.left) * canvasSize.width) / r.width,
      y: ((event.clientY - r.top) * canvasSize.height) / r.height,
    };
    return game && game.state.mode === "flower" ? renderer.point(p.x, p.y) : p;
  }
  function resizeCanvas() {
    if (!canvas || !view) return;
    var wrap = q("[data-danmaku-canvas-wrap]");
    canvasSize =
      game && game.state.mode === "flower"
        ? renderer.dimensions(wrap.clientWidth, wrap.clientHeight)
        : { width: 240, height: 360 };
    if (!game || game.state.mode !== "flower") {
      canvas.width = 480;
      canvas.height = 720;
    }
    var scale = Math.min(
      wrap.clientWidth / canvasSize.width,
      wrap.clientHeight / canvasSize.height
    );
    if (scale > 0) {
      canvas.style.width = Math.floor(canvasSize.width * scale) + "px";
      canvas.style.height = Math.floor(canvasSize.height * scale) + "px";
    }
    if (game && renderer) renderer.draw(game.state);
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
      '<div class="danmaku-lobby" data-danmaku-lobby><div class="danmaku-game-modes" aria-label="遊戯の種類"><button type="button" data-danmaku-game-mode="score" aria-pressed="true">スコアアタック</button><button type="button" data-danmaku-game-mode="flower" aria-pressed="false">花映塚式対戦</button></div><div class="danmaku-kicker" data-danmaku-kicker>無限スコアアタック</div><h3>自機を選ぶ</h3><div class="danmaku-pilots">' +
      ids
        .map(function (id) {
          return (
            '<button type="button" data-danmaku-player="' +
            id +
            '" aria-pressed="false"><img src="/assets/images/classic/danmaku/' +
            id +
            '-player.svg" alt=""><strong>' +
            cast[id].name +
            "</strong><small>" +
            cast[id].shot +
            "</small></button>"
          );
        })
        .join("") +
      '</div><div class="danmaku-mode"><button type="button" data-danmaku-auto aria-pressed="false">自動操作</button><span data-danmaku-mode-label>手動記録</span></div><h3>挑戦する相手</h3><div class="danmaku-opponents">' +
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
      '</div><details class="danmaku-help"><summary>遊び方</summary><div data-danmaku-help-mode="score"><p data-danmaku-help>射撃は自動。矢印 / WASD で移動、Shift で低速、X で霊撃。タッチは画面をドラッグ。中央の小さな点が当たり判定。周りの輪で擦弾。</p><p>P は火力強化、♥ は残機追加、B は霊撃を1回補給。火力は最大8、残機と霊撃は最大5。被弾すると火力が1段階下がる。</p><p>自動操作 / T で回避・回収・霊撃をおまかせ。移動キーかドラッグで手動に戻る。自動を一度でも使った挑戦は別記録。P / Esc で一時停止。</p><p>命中・生存・擦弾で得点。敵は無敵。符札は時間内に撃破できない。命中で得点と耐久を削り、耐久が空になると消弾して再充填。時間満了か静かな旋律で通常弾幕へ。一曲ごとに休憩し、得点を引き継ぐ。8秒操作しなければもう一戦。消えた弾は得点に変わり、自機へ集まる。20秒ごとに段位が上がる。残機3、霊撃2で開始。</p></div><div data-danmaku-help-mode="flower" hidden><p>左が自機、右がCPU。体力を先に削り切れば一本。2本先取。妖精を撃つと連爆し、近くの白弾を消して相手へ送る。色付きの大弾は連爆では消せない。</p><p>矢印 / WASD で移動。射撃は自動。Shift / 低速で吸霊し、幽霊を活性化すると撃ち落としやすくなる。タッチは左の場地をドラッグ。</p><p>Z / チャージを押して溜め、放すと発動。C1 は強化射撃、C2・C3 は消弾と送り込み、C4 はボス攻撃。必要ゲージは2・3・4、消費は1・2・3。X / B / ボムは溜めずに即発動し、ゲージを全消費。</p><p>ボス攻撃で自分の場地のボスを返せる。撃破・連爆・擦弾でゲージ回復。T / 自動で移動と攻撃をおまかせ。移動キーやドラッグで手動に戻る。P / Esc で一時停止。4分経過時は残体力で判定。同点は引き分け。</p></div></details></div>' +
      '<div class="danmaku-battle" data-danmaku-battle hidden><div class="danmaku-hud"><div>得点 <strong data-danmaku-score>0000000</strong></div><div>最高 <span data-danmaku-best>0000000</span></div><div>残機 <span data-danmaku-lives>3</span> · 符 <span data-danmaku-bombs>2</span></div><div>火力 <span data-danmaku-power>1/8</span></div><div>段位 <span data-danmaku-level>1</span> · 擦弾 <span data-danmaku-graze>0</span></div><div data-danmaku-record-mode>手動記録</div></div>' +
      '<div class="flower-hud"><div>自機 <strong data-flower-player-health>♥♥♥♥♥</strong></div><div>CPU <strong data-flower-cpu-health>♥♥♥♥♥</strong></div><div>得点 <span data-flower-score>0000000</span></div><div>勝数 <span data-flower-wins>0 : 0</span></div><div>霊力 <strong data-flower-gauge>2/4</strong></div><div data-flower-combo>0 HIT</div></div>' +
      '<div class="danmaku-pattern" data-danmaku-pattern></div><div class="danmaku-arena"><div class="danmaku-canvas-wrap" data-danmaku-canvas-wrap><canvas data-danmaku-canvas tabindex="0" role="img" aria-label="弾幕戦。矢印かWASDで移動、Shiftで低速、Xで霊撃、Tで自動操作、Pで一時停止。タッチはドラッグ。"></canvas></div>' +
      '<section class="danmaku-round-panel" data-danmaku-round hidden aria-label="一曲終了"><div class="danmaku-round-dialogue"><span class="danmaku-round-portrait" data-danmaku-round-portrait aria-hidden="true"></span><div><h3 data-danmaku-round-title></h3><p data-danmaku-round-line></p></div></div><p data-danmaku-round-score></p><button type="button" data-danmaku-round-next>もう一戦</button><button type="button" data-danmaku-round-finish>ここで終わる</button></section>' +
      '<div class="danmaku-overlay" data-danmaku-overlay hidden><h3 data-danmaku-overlay-title></h3><p data-danmaku-result></p><button type="button" data-danmaku-resume>続ける</button><button type="button" data-danmaku-retry>もう一度</button><button type="button" data-danmaku-menu>相手を選ぶ</button></div></div>' +
      '<div class="danmaku-controls" data-danmaku-controls><button type="button" data-danmaku-slow aria-pressed="false">低速</button><button type="button" data-flower-charge aria-pressed="false" hidden>溜め Z</button><button type="button" data-danmaku-bomb>霊撃 X</button><button type="button" data-danmaku-auto aria-pressed="false">自動</button><button type="button" data-danmaku-pause>一時停止</button></div></div><span class="visually-hidden" data-danmaku-announcement aria-live="polite" aria-atomic="true"></span>';
    root.querySelector("[data-companion-content]").appendChild(view);
    audio = DanmakuAudio.create(view, {
      enabled: document.body.dataset.playgroundStandalone === "true",
    });
    canvas = q("[data-danmaku-canvas]");
    new ResizeObserver(resizeCanvas).observe(q("[data-danmaku-canvas-wrap]"));
    view.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      if (b.hasAttribute("data-danmaku-exit")) close();
      if (b.dataset.danmakuGameMode && !game) {
        battleMode = b.dataset.danmakuGameMode;
        renderSelection();
      }
      if (b.dataset.danmakuPlayer) {
        playerId = b.dataset.danmakuPlayer;
        renderSelection();
      }
      if (b.dataset.danmakuChallenge) start(b.dataset.danmakuChallenge);
      if (
        b.hasAttribute("data-danmaku-round-next") &&
        game &&
        game.nextRound()
      ) {
        canvas.focus({ preventScroll: true });
        syncHUD();
      }
      if (
        b.hasAttribute("data-danmaku-round-finish") &&
        game &&
        game.finish()
      ) {
        canvas.focus({ preventScroll: true });
        audio.setScene("over");
        save();
        stop();
        overlay();
        q("[data-danmaku-retry]").focus({ preventScroll: true });
      }
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
      if (b.hasAttribute("data-danmaku-auto")) setAuto(!autoMode);
      if (b.hasAttribute("data-danmaku-slow")) {
        if (autoMode) setAuto(false);
        slow = !slow;
        b.setAttribute("aria-pressed", String(slow));
      }
    });
    q("[data-danmaku-round]").addEventListener("pointerdown", function () {
      if (game) game.waitForRound();
    });
    q("[data-danmaku-round]").addEventListener("keydown", function () {
      if (game) game.waitForRound();
    });
    view.addEventListener("keydown", function (e) {
      if (
        e.metaKey ||
        e.ctrlKey ||
        e.altKey ||
        e.target.closest(".danmaku-audio")
      )
        return;
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
          "b",
          "z",
          "t",
          "p",
          "Escape",
        ].indexOf(key) < 0
      )
        return;
      if ((key === "b" || key === "z") && game.state.mode !== "flower") return;
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
      if (key === "t") {
        if (!e.repeat) setAuto(!autoMode);
        return;
      }
      if ((/^(Arrow|[wasd]$)/.test(key) || key === "z") && autoMode)
        setAuto(false);
      keys[key] = true;
      if ((key === "x" || key === "b") && !e.repeat) bomb();
      if (/^(Arrow|[wasd]$)/.test(key)) target = null;
    });
    window.addEventListener("keyup", function (e) {
      delete keys[e.key.length === 1 ? e.key.toLowerCase() : e.key];
    });
    var chargeButton = q("[data-flower-charge]");
    chargeButton.addEventListener("pointerdown", function (e) {
      if (
        !game ||
        game.state.mode !== "flower" ||
        game.state.phase !== "playing" ||
        e.button !== 0
      )
        return;
      e.preventDefault();
      if (autoMode) setAuto(false);
      chargeHeld = true;
      chargeButton.setPointerCapture(e.pointerId);
      canvas.focus({ preventScroll: true });
    });
    chargeButton.addEventListener("pointerup", function () {
      chargeHeld = false;
    });
    chargeButton.addEventListener("pointercancel", function () {
      chargeHeld = false;
      if (game && game.cancelCharge) game.cancelCharge();
    });
    chargeButton.addEventListener("keydown", function (e) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (autoMode) setAuto(false);
        chargeHeld = true;
      }
    });
    chargeButton.addEventListener("keyup", function (e) {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        chargeHeld = false;
      }
    });
    canvas.addEventListener("pointerdown", function (e) {
      if (!game || game.state.phase !== "playing" || drag || e.button !== 0)
        return;
      e.preventDefault();
      var position = point(e);
      if (
        game.state.mode === "flower" &&
        (position.x > 240 || position.y < 0 || position.y > 360)
      )
        return;
      if (autoMode) setAuto(false);
      canvas.focus({ preventScroll: true });
      canvas.setPointerCapture(e.pointerId);
      drag = {
        id: e.pointerId,
        origin: position,
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
      if (audio) audio.setVisible(value);
      if (!value) pause();
    },
  };
})();
