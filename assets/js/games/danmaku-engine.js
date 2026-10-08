/* Deterministic, DOM-free score attack. Coordinates are always 240 × 360. */
(function (scope) {
  "use strict";
  var W = 240,
    H = 360,
    TAU = Math.PI * 2;
  var cast = {
    alice: {
      name: "アリス",
      shot: "人形散射",
      pattern: "七色の人形陣",
      color: "#8ed9ef",
      speed: 136,
    },
    marisa: {
      name: "魔理沙",
      shot: "集中光弾",
      pattern: "星屑の軌道",
      color: "#ffdc83",
      speed: 154,
    },
    patchouli: {
      name: "パチュリー",
      shot: "追尾魔弾",
      pattern: "五曜の魔法陣",
      color: "#d6aff4",
      speed: 124,
    },
  };
  function clamp(n, a, b) {
    return Math.max(a, Math.min(b, n));
  }
  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function create(player, enemy, seed) {
    player = cast[player] ? player : "alice";
    enemy = cast[enemy] ? enemy : "marisa";
    var state = {
      playerId: player,
      enemyId: enemy,
      time: 0,
      scroll: 0,
      scrollSpeed: 16,
      score: 0,
      grazes: 0,
      hits: 0,
      lives: 3,
      bombs: 2,
      level: 1,
      phase: "playing",
      countdown: 1.5,
      player: { x: W / 2, y: H - 48, radius: 2.2, invulnerable: 2 },
      boss: { x: W / 2, y: 54, radius: 14 },
      bullets: [],
      shots: [],
      sparks: [],
      spell: null,
      wave: 0,
      focus: false,
    };
    var shotTimer = 0,
      waveTimer = 0.3,
      seedState = (seed || 1977) >>> 0;
    function random() {
      seedState ^= seedState << 13;
      seedState ^= seedState >>> 17;
      seedState ^= seedState << 5;
      return (seedState >>> 0) / 4294967296;
    }
    function spark(x, y, color, amount) {
      for (var i = 0; i < amount; i++) {
        if (state.sparks.length >= 64) break;
        var a = random() * TAU;
        state.sparks.push({
          x: x,
          y: y,
          vx: Math.cos(a) * 28,
          vy: Math.sin(a) * 28,
          life: 0.35,
          color: color,
        });
      }
    }
    function bullet(x, y, angle, speed, color, shape, curve) {
      if (state.bullets.length >= 720) return;
      state.bullets.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: shape === "star" ? 3.1 : 2.4,
        color: color,
        shape: shape || "orb",
        curve: curve || 0,
        grazed: false,
      });
    }
    function emitWave() {
      var t = state.time,
        boss = state.boss,
        n = Math.min(50, 14 + Math.floor(t / 8));
      var speed = Math.min(155, 64 + t * 0.42),
        turn = state.wave++;
      var aim = Math.atan2(state.player.y - boss.y, state.player.x - boss.x);
      if (enemy === "alice") {
        // Orbiting dolls weave offset rings; alternating aimed fans leave lanes.
        for (var side = -1; side <= 1; side += 2) {
          var x = boss.x + side * 40,
            y = boss.y + 14;
          for (var i = 0; i < n; i++)
            bullet(
              x,
              y,
              (i * TAU) / n + turn * 0.19 + side * 0.14,
              speed,
              side < 0 ? "#90d7ef" : "#ee9fbd",
              "diamond"
            );
        }
        if (turn % 2 === 0)
          for (var a = -3; a <= 3; a++)
            bullet(
              boss.x,
              boss.y + 12,
              aim + a * 0.17,
              speed * 1.16,
              "#fff0b2",
              "diamond"
            );
      } else if (enemy === "marisa") {
        // Counter-rotating star streams, then a faster aimed star fan.
        for (var j = 0; j < n + 4; j++) {
          bullet(
            boss.x,
            boss.y,
            (j * TAU) / (n + 4) + turn * 0.31,
            speed * 1.08,
            "#ffce6d",
            "star",
            0.12
          );
          if (j % 2 === 0)
            bullet(
              boss.x,
              boss.y,
              (j * TAU) / (n + 4) - turn * 0.23,
              speed * 0.75,
              "#f9a6ca",
              "star",
              -0.12
            );
        }
        if (turn % 2 === 1)
          for (var k = -3; k <= 3; k++)
            bullet(
              boss.x,
              boss.y,
              aim + k * 0.14,
              speed * 1.45,
              "#fff3b9",
              "star"
            );
      } else {
        // Five elemental emitters rotate slowly around the grimoire.
        var colors = ["#fa9b98", "#8ecef3", "#a9dda9", "#ffe09a", "#d5adf2"];
        for (var element = 0; element < 5; element++) {
          var phase = (element * TAU) / 5 + turn * 0.08;
          var px = boss.x + Math.cos(phase) * 28,
            py = boss.y + Math.sin(phase) * 20;
          var count = Math.ceil(n / 2);
          for (var m = 0; m < count; m++)
            bullet(
              px,
              py,
              (m * TAU) / count + phase + turn * 0.07,
              speed * 0.85,
              colors[element],
              "orb",
              element % 2 ? 0.1 : -0.1
            );
        }
        if (turn % 2 === 0)
          for (var fan = -3; fan <= 3; fan++)
            bullet(
              boss.x,
              boss.y + 10,
              aim + fan * 0.13,
              speed * 1.15,
              colors[turn % 5],
              "orb"
            );
      }
      // Alternating side volleys force movement across the radial patterns.
      // They enter from the top of the arena, giving time to read the crossing.
      if (t >= 12 && turn % 2 === 0) {
        var originX = turn % 4 === 0 ? 16 : W - 16;
        var sideAim = Math.atan2(state.player.y - 34, state.player.x - originX);
        var spread = t >= 45 ? 3 : 2;
        for (var lane = -spread; lane <= spread; lane++)
          bullet(
            originX,
            34,
            sideAim + lane * 0.16,
            speed * 1.1,
            cast[enemy].color,
            enemy === "marisa" ? "star" : "diamond"
          );
      }
    }
    function fire() {
      var p = state.player,
        focused = state.focus;
      function shot(dx, vx, damage, homing) {
        state.shots.push({
          x: p.x + dx,
          y: p.y - 12,
          vx: vx,
          vy: -300,
          damage: damage,
          homing: homing,
          color: cast[player].color,
        });
      }
      if (player === "alice") {
        shot(-4, -6, 1, false);
        shot(4, 6, 1, false);
        shot(focused ? -11 : -19, focused ? -7 : -68, 0.8, false);
        shot(focused ? 11 : 19, focused ? 7 : 68, 0.8, false);
        shotTimer += 0.22;
      } else if (player === "marisa") {
        shot(-3, 0, 1.5, false);
        shot(3, 0, 1.5, false);
        shotTimer += 0.14;
      } else {
        shot(-9, -36, 1.55, true);
        shot(9, 36, 1.55, true);
        shotTimer += 0.2;
      }
    }
    function bomb() {
      if (
        state.phase !== "playing" ||
        state.countdown > 0 ||
        state.spell ||
        !state.bombs
      )
        return false;
      state.bombs--;
      state.score += state.bullets.length * 2;
      state.bullets.length = 0;
      state.player.invulnerable = 2.5;
      state.spell = {
        id: player,
        age: 0,
        duration: 1.6,
        x: state.player.x,
        y: state.player.y,
      };
      spark(state.player.x, state.player.y, cast[player].color, 24);
      return true;
    }
    function step(dt, input) {
      if (state.phase !== "playing") return;
      dt = clamp(dt, 0, 1 / 30);
      input = input || {};
      var p = state.player;
      state.focus = Boolean(input.focus);
      var speed = state.focus ? 56 : cast[player].speed;
      if (input.target) {
        var dx = input.target.x - p.x,
          dy = input.target.y - p.y,
          length = Math.hypot(dx, dy);
        var travel = Math.min(length, (state.focus ? 92 : 460) * dt);
        if (length) {
          p.x += (dx / length) * travel;
          p.y += (dy / length) * travel;
        }
      } else {
        var x = input.x || 0,
          y = input.y || 0,
          norm = Math.max(1, Math.hypot(x, y));
        p.x += (x / norm) * speed * dt;
        p.y += (y / norm) * speed * dt;
      }
      p.x = clamp(p.x, 9, W - 9);
      p.y = clamp(p.y, 28, H - 12);
      if (state.countdown > 0) {
        state.countdown = Math.max(0, state.countdown - dt);
        return;
      }
      state.time += dt;
      state.scrollSpeed = Math.min(88, 16 + state.time * 0.6);
      state.scroll += state.scrollSpeed * dt;
      state.level = 1 + Math.floor(state.time / 20);
      state.score += dt * 20;
      state.boss.x = W / 2 + Math.sin(state.time * 0.65) * 52;
      state.boss.y = 54 + Math.sin(state.time * 0.9) * 9;
      p.invulnerable = Math.max(0, p.invulnerable - dt);
      if (state.spell) {
        state.spell.age += dt;
        if (state.spell.age >= state.spell.duration) state.spell = null;
      }
      shotTimer -= dt;
      if (shotTimer <= 0) fire();
      waveTimer -= dt;
      if (waveTimer <= 0) {
        emitWave();
        waveTimer += Math.max(0.16, 0.7 / (1 + state.time / 65));
      }
      // The visible opening pulse also clears fresh bullets, rather than
      // letting them immediately reappear inside the spell effect.
      if (state.spell && state.spell.age < 0.65) {
        state.score += state.bullets.length * 2;
        state.bullets.length = 0;
      }
      state.shots = state.shots.filter(function (s) {
        if (s.homing) {
          var aim = Math.atan2(state.boss.y - s.y, state.boss.x - s.x);
          s.vx += (Math.cos(aim) * 265 - s.vx) * Math.min(1, dt * 5);
          s.vy += (Math.sin(aim) * 265 - s.vy) * Math.min(1, dt * 5);
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (distance(s, state.boss) < state.boss.radius + 3) {
          state.hits++;
          state.score += s.damage * 12;
          spark(s.x, s.y, s.color, 1);
          return false;
        }
        return s.y > -20 && s.y < H + 20 && s.x > -20 && s.x < W + 20;
      });
      var hit = false;
      state.bullets = state.bullets.filter(function (b) {
        if (b.curve) {
          var angle = b.curve * dt,
            vx = b.vx;
          b.vx = vx * Math.cos(angle) - b.vy * Math.sin(angle);
          b.vy = vx * Math.sin(angle) + b.vy * Math.cos(angle);
        }
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.x < -28 || b.x > W + 28 || b.y < -60 || b.y > H + 20)
          return false;
        var d = distance(b, p);
        if (!p.invulnerable && !hit && d < p.radius + b.radius) {
          hit = true;
          return false;
        }
        if (!b.grazed && !p.invulnerable && d < b.radius + 12) {
          b.grazed = true;
          state.grazes++;
          state.score += 80;
          spark(p.x, p.y, "#c4fff2", 2);
        }
        return true;
      });
      if (hit) {
        state.lives--;
        p.invulnerable = 2.5;
        state.bullets = state.bullets.filter(function (b) {
          return distance(b, p) > 48;
        });
        spark(p.x, p.y, "#f1a6a6", 18);
        if (!state.lives) state.phase = "over";
      }
      state.sparks = state.sparks.filter(function (s) {
        s.life -= dt;
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        return s.life > 0;
      });
    }
    return {
      state: state,
      step: step,
      bomb: bomb,
      pause: function () {
        if (state.phase === "playing") state.phase = "paused";
      },
      resume: function () {
        if (state.phase === "paused") {
          state.phase = "playing";
          state.countdown = 1;
        }
      },
    };
  }
  var api = { create: create, cast: cast, width: W, height: H };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.DanmakuEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
