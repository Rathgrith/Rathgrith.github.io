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
  function create(player, enemy, seed, onSound) {
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
      power: 1,
      auto: false,
      assisted: false,
      pickups: { power: 0, life: 0, clear: 0 },
      pickupNotice: null,
      clearPulse: null,
      level: 1,
      phase: "playing",
      countdown: 1.5,
      player: { x: W / 2, y: H - 48, radius: 2.2, invulnerable: 2 },
      boss: { x: W / 2, y: 54, radius: 14 },
      bullets: [],
      shots: [],
      sparks: [],
      items: [],
      spell: null,
      wave: 0,
      focus: false,
    };
    var shotTimer = 0,
      waveTimer = 0.3,
      seedState = (seed >>> 0) || 1977,
      dropTimer,
      autoTimer = 0,
      autoInput = { x: 0, y: 0, focus: false };
    function sound(name) {
      // Optional presentation hook: a failed audio device cannot stop the game.
      if (onSound) { try { onSound(name, player); } catch (_) {} }
    }
    function random() {
      seedState ^= seedState << 13;
      seedState ^= seedState >>> 17;
      seedState ^= seedState << 5;
      return (seedState >>> 0) / 4294967296;
    }
    dropTimer = 3 + random() * 2;
    function dropItem() {
      if (state.items.length >= 12) return;
      var roll = random();
      state.items.push({
        type: roll < 0.6 ? "power" : roll < 0.88 ? "clear" : "life",
        x: clamp(state.boss.x + (random() - 0.5) * 112, 16, W - 16),
        y: state.boss.y + 16,
        vx: (random() - 0.5) * 20,
        vy: -18,
        age: 0,
      });
    }
    function collect(item) {
      var type = item.type;
      state.pickups[type]++;
      sound(type);
      state.score += 300;
      if (type === "power") {
        if (state.power < 4) state.power++;
        else state.score += 1000;
      } else if (type === "life") {
        if (state.lives < 5) state.lives++;
        else state.score += 2000;
      } else {
        if (state.bombs < 5) state.bombs++;
        else state.score += 1000;
        state.score += state.bullets.length * 2;
        state.bullets.length = 0;
        state.player.invulnerable = Math.max(state.player.invulnerable, 1.2);
        state.clearPulse = { age: 0, x: state.player.x, y: state.player.y };
      }
      state.pickupNotice = { type: type, age: 0 };
      spark(item.x, item.y, cast[player].color, 10);
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
      sound("shot");
      var p = state.player,
        focused = state.focus;
      function shot(dx, vx, damage, homing) {
        state.shots.push({
          x: p.x + dx,
          y: p.y - 12,
          vx: vx,
          vy: -300,
          damage: damage * (1 + (state.power - 1) * 0.2),
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
      // Extra options add real firepower while preserving each pilot's shot type.
      for (var level = 1; level < state.power; level++) {
        var offset = 6 + level * (focused ? 3 : 6);
        var spread = player === "marisa" ? 0 : (focused ? 8 : 32) * level;
        shot(-offset, -spread, 0.7, player === "patchouli");
        shot(offset, spread, 0.7, player === "patchouli");
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
      sound("bomb");
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
    function steerAuto() {
      var p = state.player,
        goal = { x: state.boss.x, y: H - 64 },
        nearest = Infinity;
      // Prefer nearby, reachable pickups; never chase items into the boss.
      state.items.forEach(function (item) {
        var d = distance(item, p);
        if (item.y > 155 && d < 115 && d < nearest) {
          nearest = d;
          goal = item;
        }
      });
      var threats = state.bullets.filter(function (b) {
        return distance(b, p) < 135;
      });
      var best = null;
      for (var i = 0; i < 17; i++) {
        var focus = i > 8,
          speed = focus ? 56 : cast[player].speed,
          angle = ((i - 1) % 8) * TAU / 8,
          x = i ? Math.cos(angle) : 0,
          y = i ? Math.sin(angle) : 0;
        var vx = x * speed,
          vy = y * speed,
          horizon = 0.42,
          end = { x: p.x + vx * horizon, y: p.y + vy * horizon };
        if (end.x < 12 || end.x > W - 12 || end.y < Math.min(135, p.y) || end.y > H - 16)
          continue;
        var cost = distance(end, goal) * 0.045 + (i ? 0.2 : 0),
          clearance = Infinity;
        // Predict the closest approach along each candidate movement segment.
        threats.forEach(function (b) {
          var rx = b.x - p.x, ry = b.y - p.y,
            rvx = b.vx - vx, rvy = b.vy - vy,
            speed2 = rvx * rvx + rvy * rvy;
          var t = speed2 ? clamp(-(rx * rvx + ry * rvy) / speed2, 0, horizon) : 0;
          var gap = Math.hypot(rx + rvx * t, ry + rvy * t) - b.radius - p.radius;
          clearance = Math.min(clearance, gap);
          if (gap < 24) cost += 220 / Math.pow(Math.max(0, gap) + 2, 2);
          if (gap < 2) cost += 600 * (1 - t);
        });
        cost += Math.abs(x - autoInput.x) * 0.12 + Math.abs(y - autoInput.y) * 0.12;
        if (!best || cost < best.cost)
          best = { x: x, y: y, focus: focus, cost: cost, clearance: clearance };
      }
      autoInput = best || { x: 0, y: 0, focus: true };
      if (best && best.clearance < 3 && p.invulnerable < 0.2) bomb();
      return autoInput;
    }
    function setAuto(value) {
      if (state.phase === "over") return;
      state.auto = Boolean(value);
      if (state.auto) state.assisted = true;
      autoTimer = 0;
      autoInput = { x: 0, y: 0, focus: false };
    }
    function step(dt, input) {
      if (state.phase !== "playing") return;
      dt = clamp(dt, 0, 1 / 30);
      input = input || {};
      var p = state.player;
      if (state.auto && state.countdown <= 0) {
        autoTimer -= dt;
        if (autoTimer <= 0) {
          steerAuto();
          autoTimer = 0.08;
        }
        input = autoInput;
      }
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
        if (!state.countdown) sound("ready");
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
      if (state.clearPulse) {
        state.clearPulse.age += dt;
        if (state.clearPulse.age >= 0.7) state.clearPulse = null;
      }
      if (state.pickupNotice) {
        state.pickupNotice.age += dt;
        if (state.pickupNotice.age >= 1.1) state.pickupNotice = null;
      }
      shotTimer -= dt;
      if (shotTimer <= 0) fire();
      waveTimer -= dt;
      if (waveTimer <= 0) {
        emitWave();
        waveTimer += Math.max(0.16, 0.7 / (1 + state.time / 65));
      }
      dropTimer -= dt;
      if (dropTimer <= 0) {
        dropItem();
        dropTimer += 4.2 + random() * 2.8;
      }
      // The visible opening pulse also clears fresh bullets, rather than
      // letting them immediately reappear inside the spell effect.
      if ((state.spell && state.spell.age < 0.65) ||
          (state.clearPulse && state.clearPulse.age < 0.35)) {
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
          sound("hit");
          state.score += s.damage * 12;
          spark(s.x, s.y, s.color, 1);
          return false;
        }
        return s.y > -20 && s.y < H + 20 && s.x > -20 && s.x < W + 20;
      });
      state.items = state.items.filter(function (item) {
        item.age += dt;
        var dx = p.x - item.x, dy = p.y - item.y, d = Math.hypot(dx, dy);
        if (d < 36) {
          var travel = Math.min(d, 180 * dt);
          if (d) { item.x += dx / d * travel; item.y += dy / d * travel; }
        } else {
          item.vy = Math.min(44, item.vy + 65 * dt);
          item.x = clamp(item.x + item.vx * dt, 8, W - 8);
          item.y += item.vy * dt;
        }
        if (distance(item, p) < 10) { collect(item); return false; }
        return item.y < H + 12 && item.age < 15;
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
          sound("graze");
          state.score += 80;
          spark(p.x, p.y, "#c4fff2", 2);
        }
        return true;
      });
      if (hit) {
        state.lives--;
        sound("death");
        state.power = Math.max(1, state.power - 1);
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
      setAuto: setAuto,
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
