/* Two deterministic fields: both pilots obey the same shooting, charge and hit rules. */
(function (scope) {
  "use strict";
  var base =
    typeof module !== "undefined" && module.exports
      ? require("./danmaku-engine.js")
      : scope.DanmakuEngine;
  var scoreMap =
    typeof module !== "undefined" && module.exports
      ? require("./danmaku-score.js")
      : scope.DanmakuScore;
  var scrolling =
    typeof module !== "undefined" && module.exports
      ? require("./danmaku-scroll.js")
      : scope.DanmakuScroll;
  var W = 240,
    H = 360,
    TAU = Math.PI * 2,
    MAX_BULLETS = 420;
  var colors = ["#f3a3ae", "#a0dff5", "#bae29e", "#f3d58f", "#c8adf0"];
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }
  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  function create(playerId, enemyId, seed, onSound) {
    playerId = base.cast[playerId] ? playerId : "alice";
    enemyId = base.cast[enemyId] ? enemyId : "marisa";
    var randomState = seed >>> 0 || 1977;
    function random() {
      randomState ^= randomState << 13;
      randomState ^= randomState >>> 17;
      randomState ^= randomState << 5;
      return (randomState >>> 0) / 4294967296;
    }
    function sound(name, id) {
      if (onSound) onSound(name, id || playerId);
    }
    function field(id, side) {
      return {
        id: id,
        side: side,
        player: {
          x: 120,
          y: 304,
          radius: 2.2,
          invulnerable: 1,
          facing: "idle",
        },
        scroll: 0,
        scrollSpeed: scrolling.initial(id),
        health: 5,
        gauge: 200,
        charge: 0,
        charging: false,
        cooldown: 0,
        score: 0,
        grazes: 0,
        combo: 0,
        maxCombo: 0,
        comboTime: 0,
        spellLevel: 1,
        sent: 0,
        cards: 0,
        kills: 0,
        bullets: [],
        shots: [],
        enemies: [],
        effects: [],
        points: [],
        lasers: [],
        incoming: [],
        boss: null,
        cast: null,
        notice: null,
        wave: 0,
        waveClock: 0.4,
        shotClock: 0,
        aiClock: 0,
        aiInput: {},
        attackSerial: 0,
      };
    }
    var state = {
      mode: "flower",
      playerId: playerId,
      enemyId: enemyId,
      phase: "playing",
      time: 0,
      round: 1,
      roundTime: 0,
      countdown: 3,
      wins: [0, 0],
      winner: null,
      intermission: null,
      score: 0,
      roundStartScore: 0,
      assisted: false,
      auto: false,
      fields: [field(playerId, 0), field(enemyId, 1)],
    };
    state.player = state.fields[0].player;
    function notice(f, text, kind) {
      f.notice = { text: text, kind: kind || "normal", age: 0 };
    }
    function bullet(f, x, y, angle, speed, shape, color, hard, bounce) {
      if (f.bullets.length >= MAX_BULLETS) return;
      f.bullets.push({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        shape: shape || "white",
        color: color || "#ecedf4",
        radius: shape === "bigstar" ? 4.3 : shape === "orb" ? 3.5 : 2.3,
        hard: Boolean(hard),
        bounce: bounce || 0,
        age: 0,
        grazed: false,
      });
    }
    function ring(f, x, y, n, angle, speed, shape, color, hard) {
      for (var i = 0; i < n; i++)
        bullet(f, x, y, angle + (i * TAU) / n, speed, shape, color, hard);
    }
    function fan(f, x, y, n, angle, spread, speed, shape, color, hard) {
      for (var i = 0; i < n; i++)
        bullet(
          f,
          x,
          y,
          angle + (i - (n - 1) / 2) * spread,
          speed,
          shape,
          color,
          hard
        );
    }
    function point(f, x, y, value) {
      f.score += value;
      if (f.points.length < 100) f.points.push({ x: x, y: y, age: 0 });
    }
    function gain(f, n) {
      f.gauge = clamp(f.gauge + n * (f.id === "marisa" ? 1.08 : 1), 0, 400);
    }
    function queue(from, kind, amount, bounce, level) {
      var to = state.fields[1 - from.side];
      if (to.incoming.length >= 48) return;
      var previous = to.incoming[to.incoming.length - 1];
      if (
        kind === "white" &&
        previous &&
        previous.kind === kind &&
        previous.bounce === bounce &&
        previous.amount < 36
      )
        previous.amount = Math.min(36, previous.amount + amount);
      else
        to.incoming.push({
          kind: kind,
          amount: Math.min(36, amount),
          bounce: bounce || 0,
          level: level || 1,
          from: from.id,
          delay: kind === "white" ? 0.7 : 1.1,
          age: 0,
          phase: random() * TAU,
        });
      from.sent += amount;
    }
    function cancel(f, x, y, radius, hard, reflect) {
      var removed = 0,
        returns = [0, 0, 0, 0];
      f.bullets = f.bullets.filter(function (b) {
        if (distance(b, { x: x, y: y }) > radius || (b.hard && !hard))
          return true;
        removed++;
        point(f, b.x, b.y, 20);
        if (f.effects.length < 100)
          f.effects.push({
            kind: "cancel",
            x: b.x,
            y: b.y,
            age: 0,
            color: b.color,
          });
        if (reflect) returns[Math.min(3, b.bounce + 1)]++;
        return false;
      });
      if (reflect)
        returns.forEach(function (n, depth) {
          if (n) queue(f, "white", Math.min(24, n), depth);
        });
      return removed;
    }
    // Chain explosions only cancel white bullets. Hard EX/card bullets need a card.
    function destroy(f, first, chain) {
      var pending = [first],
        hits = 0,
        cancelled = 0;
      while (pending.length) {
        var e = pending.pop();
        if (e.dead) continue;
        e.dead = true;
        hits++;
        f.kills++;
        point(f, e.x, e.y, 100 + f.combo * 15);
        gain(f, e.kind === "spirit" ? 22 : 14);
        var canChain = e.kind !== "spirit" || e.active;
        if (f.effects.length < 100)
          f.effects.push({
            kind: "burst",
            x: e.x,
            y: e.y,
            age: 0,
            color: e.kind === "spirit" ? "#c1d7ff" : "#ffcdd9",
          });
        if (canChain) {
          cancelled += cancel(f, e.x, e.y, 34, false, true);
          f.enemies.forEach(function (other) {
            if (
              !other.dead &&
              other !== e &&
              distance(e, other) < 32 &&
              (other.kind !== "spirit" || other.active)
            )
              pending.push(other);
          });
        }
        if (e.kind === "spirit") queue(f, "extra", 1, 0, f.spellLevel);
      }
      f.enemies = f.enemies.filter(function (e) {
        return !e.dead;
      });
      f.combo = (chain || f.comboTime > 0 ? f.combo : 0) + hits + cancelled;
      f.comboTime = 2;
      f.maxCombo = Math.max(f.maxCombo, f.combo);
      gain(f, cancelled * 1.1);
      queue(f, "white", Math.min(18, hits * 2 + Math.floor(cancelled / 3)), 0);
      if (hits >= 3) queue(f, "spirit", 1);
      if (
        f.combo >= 12 &&
        Math.floor(f.combo / 12) > Math.floor((f.combo - hits - cancelled) / 12)
      )
        queue(f, "extra", 1, 0, f.spellLevel);
      sound("score", f.id);
    }
    function card(f, level, quick) {
      if (
        state.phase !== "playing" ||
        state.countdown > 0 ||
        state.intermission ||
        f.cooldown > 0
      )
        return false;
      level = clamp(level, 1, 4);
      if (level > 1 && f.gauge < level * 100 - 0.01) return false;
      if (quick && level < 2) return false;
      f.charge = 0;
      f.charging = false;
      f.cooldown = level === 1 ? 0.45 : 1.35;
      if (level === 1) {
        f.enemies.slice().forEach(function (e) {
          if (Math.abs(e.x - f.player.x) < 35) {
            e.hp -= 5;
            if (e.hp <= 0) destroy(f, e, true);
          }
        });
        if (f.boss && Math.abs(f.boss.x - f.player.x) < 42) f.boss.hp -= 12;
        f.cast = { age: 0, duration: 0.55, level: 1, id: f.id };
        sound("shot", f.id);
        return true;
      }
      f.gauge = quick ? 0 : Math.max(0, f.gauge - (level - 1) * 100);
      var radius = level === 4 ? 500 : level === 3 ? 112 : 76;
      cancel(f, f.player.x, f.player.y, radius, true, false);
      f.lasers = f.lasers.filter(function (l) {
        return level < 4 && Math.abs(l.x - f.player.x) > radius;
      });
      f.enemies.slice().forEach(function (e) {
        if (distance(e, f.player) < radius) destroy(f, e, true);
      });
      f.player.invulnerable = Math.max(f.player.invulnerable, 0.9);
      f.cast = { age: 0, duration: 1.3, level: level, id: f.id };
      f.cards++;
      f.spellLevel = Math.min(12, f.spellLevel + 1);
      if (level === 4) {
        var reversed = Boolean(f.boss);
        state.fields.forEach(function (side) {
          side.boss = null;
          side.incoming = side.incoming.filter(function (a) {
            return a.kind !== "boss";
          });
        });
        queue(f, "boss", 1, 0, f.spellLevel);
        notice(f, reversed ? "BOSS REVERSAL" : "BOSS ATTACK", "card");
      } else {
        queue(f, "card", 1, 0, level);
        notice(
          f,
          quick ? "QUICK CARD · " + level : "CHARGE · " + level,
          "card"
        );
      }
      sound("bomb", f.id);
      sound("spell", f.id);
      return true;
    }
    function minion(f, x, y, kind, phase, rank) {
      if (f.enemies.length >= 48) return;
      f.enemies.push({
        x: x,
        y: y,
        origin: x,
        kind: kind || "fairy",
        phase: phase || 0,
        age: 0,
        hp: kind === "spirit" ? 14 : 2.8,
        radius: 7,
        active: false,
        vy: kind === "spirit" ? 22 : 27 + rank * 2,
        fire: 1.4 + (phase || 0) * 0.03,
      });
    }
    function incoming(f, a, rank) {
      var n,
        i,
        x,
        color = base.cast[a.from].color,
        v = 44 + rank * 4;
      if (a.kind === "white") {
        n = Math.min(32, a.amount);
        var center = 40 + random() * 160;
        for (i = 0; i < n; i++) {
          x = clamp(center + (i - (n - 1) / 2) * 10, 12, W - 12);
          bullet(
            f,
            x,
            -10 - (i % 3) * 9,
            Math.PI / 2 + Math.sin(a.phase + i * 0.3) * 0.32,
            v + (i % 3) * 5,
            a.bounce >= 3 ? "orb" : "white",
            a.bounce >= 3 ? color : "#e8effc",
            a.bounce >= 3,
            a.bounce
          );
        }
      } else if (a.kind === "spirit")
        minion(f, 30 + random() * 180, -12, "spirit", a.phase, rank);
      else if (a.kind === "boss") {
        f.boss = {
          id: a.from,
          x: 120,
          y: -25,
          age: 0,
          fire: 1.5,
          hp: 100 + rank * 8,
          level: a.level,
        };
        notice(f, "BOSS INCOMING", "danger");
        sound("spell", a.from);
      } else if (a.kind === "extra") attack(f, a.from, 1, a.phase, rank, false);
      else attack(f, a.from, a.level, a.phase, rank, false);
    }
    function attack(f, id, level, phase, rank, boss) {
      var color = base.cast[id].color,
        speed = 42 + rank * 3 + level * 3,
        p = f.player;
      if (id === "alice") {
        for (var side = -1; side <= 1; side += 2) {
          var x = 120 + side * (boss ? 66 : 85),
            y = 40;
          fan(
            f,
            x,
            y,
            3 + level,
            Math.atan2(p.y - y, p.x - x),
            0.16,
            speed,
            "diamond",
            color,
            true
          );
          if (f.effects.length < 100)
            f.effects.push({ kind: "doll", x: x, y: y, age: 0, color: color });
        }
      } else if (id === "marisa") {
        ring(f, 120, 36, 10 + level * 3, phase, speed, "star", color, true);
        if (level >= 3 && f.lasers.length < 4) {
          f.lasers.push({
            x: clamp(p.x + (Math.sin(phase) > 0.0 ? 28 : -28), 20, 220),
            age: 0,
            warning: 1.25,
            duration: 0.7,
            width: 5,
            color: "#ffe4a2",
          });
          sound("laser_charge", id);
        }
      } else {
        for (var e = 0; e < 5; e++) {
          var x = 28 + e * 46;
          fan(
            f,
            x,
            20 + (e % 2) * 16,
            level + 1,
            Math.PI / 2 + Math.sin(phase + e) * 0.32,
            0.15,
            speed * (0.8 + e * 0.08),
            e % 2 ? "rice" : "orb",
            colors[e],
            true
          );
        }
      }
    }
    function risk(f, x, y, horizon) {
      var value = 0;
      f.bullets.forEach(function (b) {
        var d =
          Math.hypot(x - b.x - b.vx * horizon, y - b.y - b.vy * horizon) -
          b.radius;
        if (d < 30) value += ((30 - d) * (30 - d)) / (d < 6 ? 0.13 : 36);
      });
      f.enemies.forEach(function (e) {
        var d = Math.hypot(x - e.x, y - e.y - e.vy * horizon);
        if (d < 20) value += (20 - d) * 8;
      });
      return value;
    }
    function pilotAI(f, dt) {
      f.aiClock -= dt;
      if (f.aiClock > 0) return f.aiInput;
      f.aiClock = f.lasers.length ? 0.06 : 0.16 + random() * 0.06;
      var p = f.player,
        current = risk(f, p.x, p.y, 0.32),
        best = Infinity,
        chosen = { x: 0, y: 0, focus: false },
        nearest = null;
      f.enemies.forEach(function (e) {
        if (e.y < p.y && (!nearest || distance(e, p) < distance(nearest, p)))
          nearest = e;
      });
      var beams = f.lasers.map(function (l) {
        return {
          x: l.x,
          y: 0,
          angle: Math.PI / 2,
          width: l.width * 2,
          age: l.age,
          warning: l.warning,
          duration: l.duration,
        };
      });
      for (var y = -1; y <= 1; y++)
        for (var x = -1; x <= 1; x++) {
          var focus = Boolean(
            nearest &&
              nearest.kind === "spirit" &&
              distance(nearest, p) < 120 &&
              Math.abs(nearest.x - p.x) < 60
          );
          // Prediction uses the actual normalized speed, including focused flight.
          var speed = focus ? 58 : base.cast[f.id].speed,
            norm = Math.max(1, Math.hypot(x, y)),
            vx = (x * speed) / norm,
            vy = (y * speed) / norm;
          var tx = clamp(p.x + vx * 0.32, 12, 228),
            ty = clamp(p.y + vy * 0.32, 130, 338);
          var cost =
            risk(f, tx, ty, 0.32) +
            risk(f, tx, ty, 0.1) * 0.35 +
            Math.abs(ty - 290) * 0.035;
          var laserRisk = base.laserRoute(
            p,
            vx,
            vy,
            beams,
            0.95,
            [9, 231, 45, 348]
          );
          cost += laserRisk.cost;
          if (nearest) cost += Math.abs(tx - nearest.x) * 0.05;
          cost += x === 0 && y === 0 ? 0 : 0.35;
          if (cost < best) {
            best = cost;
            chosen = { x: x, y: y, focus: focus, impact: laserRisk.impact };
          }
        }
      if (
        (current > 90 || chosen.impact < 0.18) &&
        f.gauge >= 200 &&
        !f.cooldown
      )
        card(f, Math.min(4, Math.floor(f.gauge / 100)), true);
      var target = f.boss ? 4 : [2, 3, 4][f.cards % 3];
      chosen.charge =
        !f.cooldown &&
        f.gauge >= target * 100 &&
        current < 65 &&
        f.charge < target * 100;
      // A completed charge is released on the next decision, rather than held indefinitely.
      f.aiInput = chosen;
      return chosen;
    }
    function shoot(f, dt, input) {
      f.shotClock -= dt;
      if (input.charge || f.shotClock > 0) return;
      f.shotClock = 0.12;
      var p = f.player,
        focused = Boolean(input.focus),
        spread =
          f.id === "alice"
            ? focused
              ? 0.08
              : 0.19
            : f.id === "patchouli"
              ? 0.1
              : 0.045;
      for (var lane = -1; lane <= 1; lane++) {
        if (f.shots.length >= 96) break;
        f.shots.push({
          x: p.x + lane * 5,
          y: p.y - 10,
          vx: lane * spread * 270,
          vy: -270,
          damage: f.id === "alice" ? 0.65 : 0.85,
          shape:
            f.id === "marisa"
              ? "beam"
              : f.id === "patchouli"
                ? "orb"
                : "needle",
        });
      }
      sound("shot", f.id);
    }
    function stepField(f, dt, input, rank) {
      var p = f.player,
        ox = p.x,
        oy = p.y;
      f.cooldown = Math.max(0, f.cooldown - dt);
      p.invulnerable = Math.max(0, p.invulnerable - dt);
      f.comboTime = Math.max(0, f.comboTime - dt);
      if (!f.comboTime) f.combo = 0;
      if (f.notice && (f.notice.age += dt) > 2) f.notice = null;
      if (f.cast && (f.cast.age += dt) > f.cast.duration) f.cast = null;
      // No free emergency cards: meter comes principally from actual kills/cancels.
      gain(f, dt * 1.2);
      var velocity = input.focus ? 58 : base.cast[f.id].speed;
      if (input.target) {
        var dx = input.target.x - p.x,
          dy = input.target.y - p.y,
          length = Math.hypot(dx, dy),
          travel = Math.min(length, velocity * dt * 2.2);
        if (length) {
          p.x += (dx / length) * travel;
          p.y += (dy / length) * travel;
        }
      } else {
        var norm = Math.max(1, Math.hypot(input.x || 0, input.y || 0));
        p.x += ((input.x || 0) * velocity * dt) / norm;
        p.y += ((input.y || 0) * velocity * dt) / norm;
      }
      p.x = clamp(p.x, 9, 231);
      p.y = clamp(p.y, 45, 348);
      p.facing =
        Math.hypot(p.x - ox, p.y - oy) < 0.02
          ? "idle"
          : ["e", "se", "s", "sw", "w", "nw", "n", "ne"][
              (Math.round(Math.atan2(p.y - oy, p.x - ox) / (Math.PI / 4)) + 8) %
                8
            ];
      f.focus = Boolean(input.focus);
      if (input.charge && !f.cooldown) {
        f.charging = true;
        f.charge = Math.min(Math.max(100, f.gauge), f.charge + dt * 145);
      } else if (f.charging) {
        var level = Math.min(4, Math.floor((f.charge + 0.01) / 100));
        f.charging = false;
        f.charge = 0;
        if (level) card(f, level, false);
      }
      shoot(f, dt, input);
      f.waveClock -= dt;
      if (f.waveClock <= 0) {
        f.waveClock = Math.max(1.5, 3.4 - rank * 0.12);
        f.wave++;
        var start = 35 + (f.wave % 3) * 65;
        for (var i = 0; i < 5; i++)
          minion(
            f,
            clamp(start + (i - 2) * 15, 15, 225),
            -14 - i * 17,
            "fairy",
            f.wave * 0.75,
            rank
          );
        if (f.wave % 3 === 0)
          minion(f, 40 + (f.wave % 4) * 53, -25, "spirit", f.wave, rank);
      }
      f.incoming = f.incoming.filter(function (a) {
        a.age += dt;
        if (a.age < a.delay) return true;
        incoming(f, a, rank);
        return false;
      });
      f.enemies.forEach(function (e) {
        e.age += dt;
        if (
          e.kind === "spirit" &&
          input.focus &&
          e.y < p.y &&
          distance(e, p) < 125 &&
          Math.abs(e.x - p.x) < 66
        ) {
          e.active = true;
          e.hp = Math.min(1, e.hp);
        }
        if (!e.active) {
          e.y += e.vy * dt;
          e.x = clamp(
            e.origin +
              Math.sin(e.age * 1.4 + e.phase) * (e.kind === "spirit" ? 24 : 18),
            10,
            230
          );
        }
        e.fire -= dt;
        if (e.fire <= 0 && e.y > 18 && e.y < 215) {
          e.fire = e.active ? 1.4 : 2.7;
          bullet(
            f,
            e.x,
            e.y,
            Math.atan2(p.y - e.y, p.x - e.x),
            36 + rank * 3,
            "white",
            "#d7e6fa",
            false
          );
        }
      });
      f.enemies = f.enemies.filter(function (e) {
        return e.y < 380;
      });
      if (f.boss) {
        var boss = f.boss;
        boss.age += dt;
        boss.y = Math.min(53, -25 + boss.age * 55);
        boss.x = 120 + Math.sin(boss.age * 0.7) * 48;
        boss.fire -= dt;
        if (boss.age > 1.2 && boss.fire <= 0) {
          boss.fire = Math.max(0.9, 1.9 - rank * 0.06);
          attack(f, boss.id, 3, boss.age, rank, true);
        }
        if (boss.age > 12 || boss.hp <= 0) {
          cancel(f, boss.x, boss.y, 80, true, false);
          gain(f, 60);
          point(f, boss.x, boss.y, 3000);
          f.boss = null;
          sound("capture", f.id);
        }
      }
      f.shots = f.shots.filter(function (s) {
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        var hit = f.enemies.find(function (e) {
          return !e.dead && distance(s, e) < e.radius + 3;
        });
        if (hit) {
          hit.hp -= s.damage;
          if (hit.hp <= 0) destroy(f, hit, false);
          return false;
        }
        if (f.boss && distance(s, f.boss) < 14) {
          f.boss.hp -= s.damage;
          point(f, s.x, s.y, 6);
          sound("hit", f.id);
          return false;
        }
        return s.x > -12 && s.x < 252 && s.y > -16;
      });
      var hit = false;
      f.bullets = f.bullets.filter(function (b) {
        b.age += dt;
        b.x += b.vx * dt;
        b.y += b.vy * dt;
        if (b.age > 13 || b.x < -20 || b.x > 260 || b.y < -80 || b.y > 380)
          return false;
        var d = distance(b, p);
        if (!p.invulnerable && d < b.radius + p.radius) {
          hit = true;
          return false;
        }
        if (!b.grazed && !p.invulnerable && d < b.radius + 16) {
          b.grazed = true;
          f.grazes++;
          point(f, b.x, b.y, 40);
          gain(f, 1.5);
          sound("graze", f.id);
        }
        return true;
      });
      f.lasers = f.lasers.filter(function (l) {
        var old = l.age;
        l.age += dt;
        if (old < l.warning && l.age >= l.warning)
          sound("laser_fire", "marisa");
        if (
          !p.invulnerable &&
          l.age >= l.warning &&
          l.age < l.warning + l.duration &&
          Math.abs(p.x - l.x) < l.width / 2 + p.radius
        )
          hit = true;
        return l.age < l.warning + l.duration;
      });
      if (
        !p.invulnerable &&
        f.enemies.some(function (e) {
          return e.y > 0 && distance(e, p) < e.radius + p.radius;
        })
      )
        hit = true;
      if (hit) {
        f.health = Math.max(0, f.health - 1);
        p.invulnerable = 2.5;
        f.combo = 0;
        f.comboTime = 0;
        f.charge = 0;
        f.charging = false;
        gain(f, 70);
        cancel(f, p.x, p.y, 65, true, false);
        f.lasers = [];
        f.enemies = f.enemies.filter(function (e) {
          return distance(e, p) > 42;
        });
        notice(f, f.health === 1 ? "LAST LIFE" : "MISS", "danger");
        sound("death", f.id);
      }
      f.effects = f.effects.filter(function (e) {
        e.age += dt;
        return e.age < (e.kind === "doll" ? 0.8 : 0.4);
      });
      f.points = f.points.filter(function (pnt) {
        pnt.age += dt;
        var blend = Math.min(1, dt * (4 + pnt.age * 6));
        pnt.x += (p.x - pnt.x) * blend;
        pnt.y += (p.y - pnt.y) * blend;
        return pnt.age < 1 && distance(pnt, p) > 4;
      });
    }
    function resolveRound() {
      var a = state.fields[0],
        b = state.fields[1],
        winner = a.health === b.health ? -1 : a.health > b.health ? 0 : 1;
      if (winner >= 0) state.wins[winner]++;
      state.winner = winner;
      state.fields.forEach(function (f) {
        f.charge = 0;
        f.charging = false;
        f.shots = [];
      });
      if (
        state.wins.some(function (n) {
          return n >= 2;
        })
      )
        state.phase = "over";
      else state.intermission = { age: 0, remaining: 8, winner: winner };
      sound("capture", winner === 1 ? enemyId : playerId);
    }
    function scrollFields(dt, rest) {
      var rhythm = scoreMap.at(enemyId, state.time);
      state.fields.forEach(function (f) {
        scrolling.advance(f, dt, {
          character: f.id,
          time: state.time,
          rhythm: rhythm,
          pressure:
            Math.min(1, f.bullets.length / 250) +
            (f.cast ? 0.35 : 0) +
            (f.boss ? 0.2 : 0),
          rest: rest,
        });
      });
    }
    function step(dt, input) {
      if (state.phase !== "playing") return;
      dt = clamp(Number(dt) || 0, 0, 0.05);
      input = input || {};
      if (state.intermission) {
        state.intermission.age += dt;
        scrollFields(dt, true);
        if (state.intermission.age >= 1.8) {
          state.intermission.remaining -= dt;
          if (state.intermission.remaining <= 0) nextRound();
        }
        return;
      }
      if (state.countdown > 0) {
        state.countdown = Math.max(0, state.countdown - dt);
        if (!state.countdown) sound("ready");
        return;
      }
      state.time += dt;
      state.roundTime += dt;
      scrollFields(dt, false);
      var rank = Math.min(
        16,
        Math.floor(state.roundTime / 18) + state.round - 1
      );
      var inputs = [
        state.auto ? pilotAI(state.fields[0], dt) : input,
        pilotAI(state.fields[1], dt),
      ];
      // Resolve defeat only after both fields step, so a simultaneous hit is a draw.
      state.fields.forEach(function (f, i) {
        stepField(f, dt, inputs[i], rank);
      });
      state.score = state.fields[0].score;
      if (
        state.fields.some(function (f) {
          return f.health <= 0;
        }) ||
        state.roundTime >= 240
      )
        resolveRound();
    }
    function nextRound() {
      if (
        !state.intermission ||
        state.phase !== "playing" ||
        state.intermission.age < 1.8
      )
        return false;
      var previous = state.fields;
      state.fields = [field(playerId, 0), field(enemyId, 1)];
      state.fields.forEach(function (f, i) {
        f.score = previous[i].score;
        f.scroll = previous[i].scroll;
        f.scrollSpeed = previous[i].scrollSpeed;
      });
      state.player = state.fields[0].player;
      state.round++;
      state.roundTime = 0;
      state.roundStartScore = state.score;
      state.countdown = 2.5;
      state.intermission = null;
      return true;
    }
    function cancelCharge() {
      state.fields[0].charge = 0;
      state.fields[0].charging = false;
    }
    return {
      state: state,
      step: step,
      bomb: function () {
        var f = state.fields[0];
        return card(f, Math.min(4, Math.floor(f.gauge / 100)), true);
      },
      setAuto: function (v) {
        state.auto = Boolean(v);
        if (v) state.assisted = true;
        cancelCharge();
      },
      cancelCharge: cancelCharge,
      pause: function () {
        if (state.phase === "playing") {
          state.phase = "paused";
          cancelCharge();
        }
      },
      resume: function () {
        if (state.phase === "paused") {
          state.phase = "playing";
          state.countdown = Math.max(1, state.countdown);
        }
      },
      nextRound: nextRound,
      waitForRound: function () {
        if (state.intermission) state.intermission.remaining = 8;
      },
      finish: function () {
        if (!state.intermission || state.phase !== "playing") return false;
        state.intermission = null;
        state.phase = "over";
        return true;
      },
    };
  }
  var api = {
    create: create,
    width: W,
    height: H,
    displayWidth: 496,
    displayHeight: 412,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.DanmakuFlower = api;
})(typeof window !== "undefined" ? window : globalThis);
