/* Deterministic, DOM-free score attack. Coordinates are always 240 × 360. */
(function (scope) {
  "use strict";
  var scoreMap =
    typeof module !== "undefined" && module.exports
      ? require("./danmaku-score.js")
      : scope.DanmakuScore;
  var patterns =
    typeof module !== "undefined" && module.exports
      ? require("./danmaku-patterns.js")
      : scope.DanmakuPatterns;
  var scrolling =
    typeof module !== "undefined" && module.exports
      ? require("./danmaku-scroll.js")
      : scope.DanmakuScroll;
  var MAX_POWER = 8,
    DECLARATION_TIME = 2;
  var W = 240,
    H = 360,
    TAU = Math.PI * 2;
  var cast = {
    alice: {
      name: "アリス",
      shot: "人形散射",
      pattern: "仏蘭西人形 · 倫敦人形 · 上海人形",
      color: "#8ed9ef",
      speed: 136,
    },
    marisa: {
      name: "魔理沙",
      shot: "光線・ミサイル",
      pattern: "星屑 · 全方位レーザー · マスタースパーク",
      color: "#ffdc83",
      speed: 154,
    },
    patchouli: {
      name: "パチュリー",
      shot: "直線弾・誘導弾",
      pattern: "ウンディネ · ロイヤルフレア · 賢者の石",
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
  // Rendering, collisions and avoidance use the same evolving beam geometry.
  function laserPose(beam, future) {
    var age = beam.age + (future || 0),
      x = beam.x,
      y = beam.y,
      angle = beam.angle;
    var orbit = beam.anchor;
    if (orbit && orbit.kind === "orbit") {
      var phase = orbit.phase + age * orbit.rate;
      x = orbit.cx + Math.cos(phase) * orbit.rx;
      y = orbit.cy + Math.sin(phase) * orbit.ry;
      angle = Math.atan2(y - orbit.cy, x - orbit.cx);
    }
    return {
      x: x,
      y: y,
      angle: angle + Math.max(0, age - beam.warning) * (beam.sweep || 0),
    };
  }
  function laserGap(point, beam, future) {
    var pose = laserPose(beam, future),
      angle = pose.angle;
    var dx = point.x - pose.x,
      dy = point.y - pose.y;
    var along = dx * Math.cos(angle) + dy * Math.sin(angle);
    if (along < 0 || along > (beam.length || 460)) return Infinity;
    return (
      Math.abs(dx * Math.sin(angle) - dy * Math.cos(angle)) -
      beam.width / 2 -
      along * (beam.spread || 0)
    );
  }
  function laserRoute(point, vx, vy, beams, horizon, bounds) {
    var cost = 0,
      clearance = Infinity,
      impact = Infinity;
    beams.forEach(function (beam) {
      var start = Math.max(0, beam.warning - beam.age),
        end = Math.min(horizon, beam.warning + beam.duration - beam.age);
      if (start > end) return;
      var firstHit = Infinity;
      // Sample the entire reachable route at <= 16 ms, including ignition and
      // expiry. End-point tests miss crossings and rotating beams between polls.
      var steps = Math.max(1, Math.ceil((end - start) / 0.016));
      for (var i = 0; i <= steps; i++) {
        var t = start + ((end - start) * i) / steps;
        var at = {
          x: clamp(point.x + vx * t, bounds[0], bounds[1]),
          y: clamp(point.y + vy * t, bounds[2], bounds[3]),
        };
        var gap = laserGap(at, beam, t) - (point.radius || 2.2);
        clearance = Math.min(clearance, gap);
        if (gap < 0) {
          impact = Math.min(impact, t);
          firstHit = Math.min(firstHit, t);
        }
        // Duration inside a beam matters: if already trapped, leave by the
        // shortest safe side instead of treating every escape as equally bad.
        cost +=
          ((gap < 0
            ? 1800 + Math.min(30, -gap) * 24
            : gap < 24
              ? 180 / Math.pow(gap + 2, 1.3)
              : 0) *
            (1 - t * 0.5)) /
          steps;
      }
      // Never trade an imminent crossing for a merely speculative later hit.
      // Without urgency, a long sweep can make the pilot reverse into the beam.
      if (firstHit < Infinity) cost += 900 / Math.pow(firstHit + 0.15, 2);
    });
    return { cost: cost, clearance: clearance, impact: impact };
  }
  function optionsFor(s) {
    var count = Math.floor(s.power / 2),
      list = [],
      p = s.player;
    for (var i = 0; i < count; i++) {
      var lane = i - (count - 1) / 2,
        spacing = s.focus ? 11 : 22;
      list.push({
        x: clamp(p.x + lane * spacing, 6, W - 6),
        y: p.y - 20 - Math.max(0, 1 - Math.abs(lane)) * 9,
        index: i,
      });
    }
    return list;
  }
  function create(player, enemy, seed, onSound) {
    player = cast[player] ? player : "alice";
    enemy = cast[enemy] ? enemy : "marisa";
    var state = {
      playerId: player,
      enemyId: enemy,
      time: 0,
      round: 1,
      roundStartScore: 0,
      intermission: null,
      scroll: 0,
      scrollSpeed: scrolling.initial(enemy),
      score: 0,
      grazes: 0,
      grazeRadius: 16,
      grazePulse: 0,
      grazeChain: 0,
      grazeTimer: 0,
      rhythm: scoreMap.at(enemy, 0),
      enemySpell: Object.assign(
        {
          age: 0,
          hp: 520,
          maxHp: 520,
          reload: 0,
          clears: 0,
          eligible: true,
          nonspell: false,
          remaining: scoreMap.at(enemy, 0).spellEnd,
          duration: scoreMap.at(enemy, 0).spellEnd,
        },
        patterns.cards[enemy][0]
      ),
      scoreItems: [],
      cancelFlashes: [],
      pointLabels: [],
      cancelPulse: null,
      breakNotice: null,
      eventNotice: null,
      pressureNotice: null,
      attackReadyAt: DECLARATION_TIME + 0.15,
      lasers: [],
      hits: 0,
      lives: 3,
      bombs: 2,
      power: 1,
      auto: false,
      assisted: false,
      pickups: { power: 0, life: 0, clear: 0 },
      pickupNotice: null,
      level: 1,
      phase: "playing",
      countdown: 4.1,
      intro: { age: 0, duration: 2.6 },
      player: {
        x: W / 2,
        y: H - 48,
        radius: 2.2,
        invulnerable: 2,
        facing: "idle",
        moving: false,
      },
      boss: { x: W + 24, y: -24, radius: 14 },
      bullets: [],
      shots: [],
      sparks: [],
      items: [],
      spell: null,
      wave: 0,
      focus: false,
    };
    var trackDuration = scoreMap.getTrack(enemy).duration;
    var shotTimer = 0,
      homingTimer = 0,
      lastTick = -1,
      lastSection = 0,
      declared = false,
      seedState = seed >>> 0 || 1977,
      dropTimer,
      autoTimer = 0,
      autoInput = { x: 0, y: 0, focus: false };
    function sound(name, character) {
      // Optional presentation hook: a failed audio device cannot stop the game.
      if (onSound) {
        try {
          onSound(name, character || player);
        } catch (_) {}
      }
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
        if (state.power < MAX_POWER) state.power++;
        else state.score += 1000;
      } else if (type === "life") {
        if (state.lives < 5) state.lives++;
        else state.score += 2000;
      } else {
        if (state.bombs < 5) state.bombs++;
        else state.score += 1000;
        // "clear" is the legacy inventory key for the blue B pickup.
        // Picking up ammunition neither cancels hazards nor grants protection.
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
        heading: angle,
        radius:
          {
            star: 3.1,
            bigstar: 4.3,
            smallstar: 1.9,
            rice: 2.1,
            kunai: 2.2,
            scale: 2.3,
            amulet: 2.7,
            bubble: 4,
            darkorb: 3.8,
            butterfly: 2.4,
            flame: 3.2,
            pellet: 1.7,
          }[shape] || 2.4,
        color: color,
        shape: shape || "orb",
        curve: typeof curve === "object" ? curve.turn : curve || 0,
        curveDecay: typeof curve === "object" ? curve.decay : 0,
        motion: typeof curve === "object" ? curve : null,
        age: 0,
        grazed: false,
      });
    }
    function laser(
      x,
      y,
      angle,
      width,
      warning,
      duration,
      color,
      sweep,
      anchor,
      spread
    ) {
      if (state.lasers.length >= 12) return;
      state.lasers.push({
        x: x,
        y: y,
        angle: angle,
        width: width,
        warning: Math.max(0.8, warning),
        duration: duration,
        color: color,
        sweep: sweep || 0,
        anchor: anchor,
        spread: spread || 0,
        age: 0,
        grazed: false,
        fired: false,
      });
      sound("laser_charge", enemy);
    }
    function graze() {
      state.grazes++;
      state.grazeChain = state.grazeTimer > 0 ? state.grazeChain + 1 : 1;
      state.grazeTimer = 0.8;
      state.grazePulse = 1;
      state.score += 80;
      sound("graze");
      spark(state.player.x, state.player.y, "#c4fff2", 4);
    }
    function cancelBullets(kind) {
      var value = kind === "spell" ? 10 : 2;
      var total = state.bullets.length * value;
      state.bullets.forEach(function (b, i) {
        if (state.cancelFlashes.length < 720)
          state.cancelFlashes.push({
            x: b.x,
            y: b.y,
            age: 0,
            color: b.color || "#dcefff",
            turn: i % 4,
          });
        if (state.scoreItems.length < 720)
          state.scoreItems.push({
            x: clamp(b.x, 4, W - 4),
            y: clamp(b.y, 4, H - 4),
            age: 0,
            value: value,
            delay: 0.16 + (i % 7) * 0.012,
          });
        else state.scoreItems[state.scoreItems.length - 1].value += value;
        if (i % 6 === 0 && state.pointLabels.length < 120)
          state.pointLabels.push({ x: b.x, y: b.y, age: 0, value: value });
      });
      state.bullets.length = 0;
      state.lasers.length = 0;
      if (kind !== "pulse")
        state.cancelPulse = {
          age: 0,
          kind: kind,
          x: kind === "spell" ? state.boss.x : state.player.x,
          y: kind === "spell" ? state.boss.y : state.player.y,
        };
      return total;
    }
    function finishSpell(reason) {
      if (state.enemySpell.nonspell) return;
      var capture = state.enemySpell.eligible;
      var cancelled = cancelBullets("spell");
      state.score += capture ? 5000 : 1000;
      state.breakNotice = {
        age: 0,
        captured: capture,
        bonus: capture ? 5000 : 1000,
        cancelled: cancelled,
        reason: reason,
        name: state.enemySpell.name,
      };
      state.enemySpell.nonspell = true;
      state.enemySpell.nonspellName = patterns.nonspells[state.enemySpell.id];
      state.enemySpell.remaining = 0;
      state.attackReadyAt = state.time + state.rhythm.beatDuration * 4;
      sound(capture ? "capture" : "spell_break", enemy);
    }
    function updateScore(dt) {
      state.rhythm = scoreMap.at(enemy, state.time);
      state.enemySpell.age += dt;
      if (!declared || state.rhythm.sectionKey !== lastSection) {
        var changed = declared;
        if (changed && !state.enemySpell.nonspell) finishSpell("timeout");
        lastSection = state.rhythm.sectionKey;
        var card =
          patterns.cards[enemy][
            state.rhythm.sectionKey % patterns.cards[enemy].length
          ];
        if (changed)
          state.enemySpell = Object.assign(
            {
              age: 0,
              hp: 520 + Math.min(520, state.level * 30),
              maxHp: 520 + Math.min(520, state.level * 30),
              reload: 0,
              clears: 0,
              eligible: true,
              nonspell: false,
            },
            card
          );
        else Object.assign(state.enemySpell, card);
        state.enemySpell.duration =
          state.rhythm.spellEnd - state.rhythm.sectionStart;
        state.attackReadyAt =
          state.time +
          Math.max(DECLARATION_TIME + 0.15, state.rhythm.beatDuration * 4);
        if (changed) cancelBullets("spell");
        declared = true;
        sound("spell", enemy);
      }
      state.enemySpell.remaining = Math.max(
        0,
        state.rhythm.spellEnd - state.time
      );
      if (!state.enemySpell.nonspell && state.time >= state.rhythm.spellEnd)
        finishSpell(state.rhythm.quietBreak ? "music" : "timeout");
      var tick = state.rhythm.tickKey;
      if (tick !== lastTick) {
        lastTick = tick;
        if (state.rhythm.halfBeat >= 0 && state.time >= state.attackReadyAt) {
          patterns.emit(state, state.rhythm.halfBeat, {
            bullet: bullet,
            laser: laser,
          });
          state.wave++;
        }
      }
    }
    function fire() {
      sound("shot");
      var p = state.player,
        focused = state.focus,
        scale = 1 + (state.power - 1) * 0.06;
      function shot(x, y, vx, vy, damage, kind, homing, color) {
        if (state.shots.length >= 140) return;
        state.shots.push({
          x: x,
          y: y,
          vx: vx,
          vy: vy,
          damage: damage * scale,
          kind: kind,
          homing: Boolean(homing),
          age: 0,
          color: color || cast[player].color,
        });
      }
      var options = optionsFor(state);
      if (player === "alice") {
        shot(p.x - 3, p.y - 12, -5, -360, 1.0, "needle");
        shot(p.x + 3, p.y - 12, 5, -360, 1.0, "needle");
        shot(p.x - 8, p.y - 8, focused ? -8 : -72, -325, 0.7, "needle");
        shot(p.x + 8, p.y - 8, focused ? 8 : 72, -325, 0.7, "needle");
        options.forEach(function (o) {
          var vx = focused ? (state.boss.x - o.x) * 0.1 : (o.x - p.x) * 2.6;
          shot(o.x - 2, o.y, vx - 9, -350, 0.72, "needle");
          shot(o.x + 2, o.y, vx + 9, -350, 0.72, "needle");
        });
        shotTimer += 0.18;
      } else if (player === "marisa") {
        shot(p.x - 3, p.y - 12, 0, -630, 1.35, "beam");
        shot(p.x + 3, p.y - 12, 0, -630, 1.35, "beam");
        options.forEach(function (o) {
          shot(o.x, o.y, 0, -360, 1.3, "missile", false, "#f8ca7e");
        });
        shotTimer += 0.13;
      } else {
        // Reliable damage requires alignment. Seeking elements are slower,
        // weaker supplements, never the entire main volley.
        shot(p.x - 5, p.y - 12, 0, -355, 1.05, "crystal", false, "#c8b9f2");
        shot(p.x + 5, p.y - 12, 0, -355, 1.05, "crystal", false, "#c8b9f2");
        options.forEach(function (o) {
          shot(
            o.x,
            o.y,
            0,
            -345,
            0.65,
            "crystal",
            false,
            ["#efa5a5", "#a3d9f0", "#bde2ad", "#f0d991"][o.index]
          );
        });
        if (homingTimer <= 0) {
          var sources = options.length
            ? options
            : [
                { x: p.x - 11, y: p.y - 8, index: 0 },
                { x: p.x + 11, y: p.y - 8, index: 1 },
              ];
          sources.forEach(function (o) {
            shot(
              o.x,
              o.y,
              (o.x - p.x) * 2,
              -185,
              0.38,
              "seeker",
              true,
              ["#eda0bd", "#a4d7ee", "#b4dfa6", "#e7cd8f"][o.index]
            );
          });
          homingTimer = 0.36;
        }
        shotTimer += 0.18;
      }
    }
    function pressureClear() {
      var card = state.enemySpell;
      if (card.nonspell || card.reload > 0) return;
      var count = cancelBullets("spell");
      card.hp = 0;
      card.reload = 1.1;
      card.clears++;
      state.pressureNotice = { age: 0, value: count };
      state.attackReadyAt = Math.max(state.attackReadyAt, state.time + 0.65);
      sound("spell_break", enemy);
      // The same spell, clock and capture eligibility survive the clear.
    }
    function bomb() {
      if (
        state.phase !== "playing" ||
        state.countdown > 0 ||
        state.intermission ||
        state.spell ||
        !state.bombs
      )
        return false;
      state.bombs--;
      sound("bomb");
      state.enemySpell.eligible = false;
      cancelBullets("bomb");
      state.player.invulnerable = 2.5;
      state.spell = {
        id: player,
        age: 0,
        duration: 1.6,
        impactTick: -1,
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
          angle = (((i - 1) % 8) * TAU) / 8,
          x = i ? Math.cos(angle) : 0,
          y = i ? Math.sin(angle) : 0;
        var vx = x * speed,
          vy = y * speed,
          horizon = 0.42,
          end = {
            x: clamp(p.x + vx * horizon, 12, W - 12),
            y: clamp(p.y + vy * horizon, Math.min(135, p.y), H - 16),
          };
        if (
          (y < 0 && p.y <= 135) ||
          (x < 0 && p.x <= 12) ||
          (x > 0 && p.x >= W - 12) ||
          (y > 0 && p.y >= H - 16)
        )
          continue;
        var cost = distance(end, goal) * 0.045 + (i ? 0.2 : 0),
          clearance = Infinity;
        // Predict the closest approach along each candidate movement segment.
        threats.forEach(function (b) {
          var rx = b.x - p.x,
            ry = b.y - p.y,
            rvx = b.vx - vx,
            rvy = b.vy - vy,
            speed2 = rvx * rvx + rvy * rvy;
          var t = speed2
            ? clamp(-(rx * rvx + ry * rvy) / speed2, 0, horizon)
            : 0;
          var gap =
            Math.hypot(rx + rvx * t, ry + rvy * t) - b.radius - p.radius;
          clearance = Math.min(clearance, gap);
          if (gap < 24) cost += 220 / Math.pow(Math.max(0, gap) + 2, 2);
          if (gap < 2) cost += 600 * (1 - t);
        });
        var laserRisk = laserRoute(p, vx, vy, state.lasers, 1.65, [
          12,
          W - 12,
          Math.min(135, p.y),
          H - 16,
        ]);
        cost += laserRisk.cost;
        cost +=
          Math.abs(x - autoInput.x) * 0.12 + Math.abs(y - autoInput.y) * 0.12;
        if (!best || cost < best.cost)
          best = {
            x: x,
            y: y,
            focus: focus,
            cost: cost,
            clearance: clearance,
            impact: laserRisk.impact,
          };
      }
      autoInput = best || { x: 0, y: 0, focus: true };
      if (
        best &&
        (best.clearance < 3 || best.impact < 0.18) &&
        p.invulnerable < 0.2
      )
        bomb();
      return autoInput;
    }
    function setAuto(value) {
      if (state.phase === "over") return;
      state.auto = Boolean(value);
      if (state.auto) state.assisted = true;
      autoTimer = 0;
      autoInput = { x: 0, y: 0, focus: false };
    }
    function advanceCancellation(dt) {
      var p = state.player;
      if (state.cancelPulse && (state.cancelPulse.age += dt) > 0.85)
        state.cancelPulse = null;
      if (state.breakNotice && (state.breakNotice.age += dt) > 2.2)
        state.breakNotice = null;
      if (state.eventNotice && (state.eventNotice.age += dt) > 1.6)
        state.eventNotice = null;
      state.cancelFlashes = state.cancelFlashes.filter(function (f) {
        f.age += dt;
        return f.age < 0.28;
      });
      state.pointLabels = state.pointLabels.filter(function (f) {
        f.age += dt;
        return f.age < 0.8;
      });
      state.scoreItems = state.scoreItems.filter(function (item) {
        item.age += dt;
        item.px = item.x;
        item.py = item.y;
        if (item.age < (item.delay || 0.2)) item.y -= 12 * dt;
        else {
          var dx = p.x - item.x,
            dy = p.y - item.y,
            d = Math.hypot(dx, dy),
            travel = Math.min(d, (180 + item.age * 380) * dt);
          if (d) {
            item.x += (dx / d) * travel;
            item.y += (dy / d) * travel;
          }
          if (d < 8) {
            state.score += item.value;
            sound("score");
            return false;
          }
        }
        return item.age < 4;
      });
    }
    function enterIntermission() {
      if (!state.enemySpell.nonspell) finishSpell("timeout");
      cancelBullets("spell");
      state.shots.length = 0;
      state.items.forEach(collect);
      state.items.length = 0;
      state.pickupNotice = state.pressureNotice = state.eventNotice = null;
      state.sparks.length = 0;
      state.grazePulse = state.grazeTimer = 0;
      state.player.facing = "idle";
      state.player.moving = false;
      state.intermission = { age: 0, remaining: 8 };
    }
    function nextRound() {
      if (
        !state.intermission ||
        state.phase !== "playing" ||
        state.intermission.age < 1.8
      )
        return false;
      state.intermission = null;
      state.round++;
      state.roundStartScore = state.score;
      state.countdown = 1.5;
      state.intro = null;
      state.player.x = W / 2;
      state.player.y = H - 48;
      state.player.facing = "idle";
      state.player.invulnerable = Math.max(2, state.player.invulnerable);
      state.breakNotice =
        state.eventNotice =
        state.pressureNotice =
        state.pickupNotice =
          null;
      state.spell = null;
      shotTimer = 0;
      homingTimer = 0;
      return true;
    }
    function step(dt, input) {
      if (state.phase !== "playing") return;
      dt = clamp(dt, 0, 1 / 30);
      input = input || {};
      if (state.intermission) {
        var rest = state.intermission;
        rest.age += dt;
        advanceCancellation(dt);
        scrolling.advance(state, dt, { character: enemy, rest: true });
        if (state.spell && (state.spell.age += dt) > state.spell.duration)
          state.spell = null;
        if (rest.age >= 1.8) {
          rest.remaining = Math.max(0, rest.remaining - dt);
          if (!rest.remaining) nextRound();
        }
        return;
      }
      var p = state.player,
        oldX = p.x,
        oldY = p.y;
      if (state.intro && state.countdown > 1.5) {
        state.intro.age = Math.min(state.intro.duration, state.intro.age + dt);
        state.countdown = Math.max(1.5, state.countdown - dt);
        var flight = Math.min(1, state.intro.age / 1.25),
          ease = 1 - Math.pow(1 - flight, 3);
        state.boss.x = W + 24 - (W / 2 + 24) * ease;
        state.boss.y = -24 + 78 * ease + Math.sin(flight * Math.PI) * 28;
        return;
      }
      if (state.intro) {
        state.intro = null;
        state.boss.x = W / 2;
        state.boss.y = 54;
      }
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
      var movedX = p.x - oldX,
        movedY = p.y - oldY;
      p.moving = Math.hypot(movedX, movedY) > 0.02;
      if (p.moving) {
        var directions = ["e", "se", "s", "sw", "w", "nw", "n", "ne"];
        p.facing =
          directions[
            (Math.round(Math.atan2(movedY, movedX) / (Math.PI / 4)) + 8) % 8
          ];
      } else p.facing = "idle";
      if (state.countdown > 0) {
        state.countdown = Math.max(0, state.countdown - dt);
        if (!state.countdown) sound("ready");
        return;
      }
      var nextRoundAt =
        (Math.floor(state.time / trackDuration) + 1) * trackDuration;
      if (state.time + dt >= nextRoundAt) {
        state.time = nextRoundAt;
        enterIntermission();
        return;
      }
      state.time += dt;
      scrolling.advance(state, dt, {
        character: enemy,
        time: state.time,
        rhythm: scoreMap.at(enemy, state.time),
        pressure:
          Math.min(1, state.bullets.length / 350) + (state.spell ? 0.25 : 0),
        declaration:
          state.enemySpell && state.enemySpell.age < DECLARATION_TIME,
      });
      var nextLevel = 1 + Math.floor(state.time / 20);
      if (nextLevel !== state.level)
        state.eventNotice = { kind: "rank", age: 0, value: nextLevel };
      state.level = nextLevel;
      state.score += dt * 20;
      if (
        !state.lasers.some(function (l) {
          return l.anchor === "boss" || (l.anchor && l.anchor.kind === "orbit");
        })
      ) {
        var movementTime = state.time % trackDuration;
        var pose = patterns.bossPosition(state) || {
          x: W / 2 + Math.sin(movementTime * 0.4) * 36,
          y: 54 + Math.sin(movementTime * 0.7) * 6,
        };
        var settle = 1 - Math.exp(-8 * dt);
        state.boss.x += (pose.x - state.boss.x) * settle;
        state.boss.y += (pose.y - state.boss.y) * settle;
      }
      state.grazePulse = Math.max(0, state.grazePulse - dt * 3);
      state.grazeTimer = Math.max(0, state.grazeTimer - dt);
      if (!state.grazeTimer) state.grazeChain = 0;
      p.invulnerable = Math.max(0, p.invulnerable - dt);
      if (state.spell) {
        state.spell.age += dt;
        if (state.spell.age >= state.spell.duration) state.spell = null;
      }
      advanceCancellation(dt);
      if (state.pickupNotice) {
        state.pickupNotice.age += dt;
        if (state.pickupNotice.age >= 1.1) state.pickupNotice = null;
      }
      if (state.pressureNotice && (state.pressureNotice.age += dt) > 1.1)
        state.pressureNotice = null;
      if (state.enemySpell.reload > 0) {
        state.enemySpell.reload = Math.max(0, state.enemySpell.reload - dt);
        if (!state.enemySpell.reload)
          state.enemySpell.hp = state.enemySpell.maxHp;
      }
      homingTimer -= dt;
      shotTimer -= dt;
      if (shotTimer <= 0) fire();
      updateScore(dt);
      if (state.spell && state.spell.age > 0.05 && state.spell.age < 1.2) {
        var impactTick = Math.floor((state.spell.age - 0.05) / 0.18);
        if (impactTick !== state.spell.impactTick) {
          state.spell.impactTick = impactTick;
          sound("bomb_impact");
          state.enemySpell.eligible = false;
          var damage = 8 + state.power * 1.5;
          state.score += damage * 12;
          if (!state.enemySpell.nonspell && !state.enemySpell.reload) {
            state.enemySpell.hp -= damage;
            if (state.enemySpell.hp <= 0) pressureClear();
          }
          spark(state.boss.x, state.boss.y, cast[player].color, 6);
        }
      }
      dropTimer -= dt;
      if (dropTimer <= 0) {
        dropItem();
        dropTimer += 4.2 + random() * 2.8;
      }
      // The visible opening pulse also clears fresh bullets, rather than
      // letting them immediately reappear inside the spell effect.
      if (state.spell && state.spell.age < 0.65) {
        cancelBullets("pulse");
      }
      state.shots = state.shots.filter(function (s) {
        s.age = (s.age || 0) + dt;
        s.px = s.x;
        s.py = s.y;
        if (s.homing) {
          var aim = Math.atan2(state.boss.y - s.y, state.boss.x - s.x);
          s.vx += (Math.cos(aim) * 210 - s.vx) * Math.min(1, dt * 2.6);
          s.vy += (Math.sin(aim) * 210 - s.vy) * Math.min(1, dt * 2.6);
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        if (distance(s, state.boss) < state.boss.radius + 3) {
          state.hits++;
          sound("hit");
          state.score += s.damage * 12;
          // Depleting this repeatable bar clears hazards, not the timed card.
          if (!state.enemySpell.nonspell && !state.enemySpell.reload) {
            state.enemySpell.hp = Math.max(0, state.enemySpell.hp - s.damage);
            if (!state.enemySpell.hp) pressureClear();
          }
          spark(s.x, s.y, s.color, 1);
          return false;
        }
        return s.y > -20 && s.y < H + 20 && s.x > -20 && s.x < W + 20;
      });
      state.items = state.items.filter(function (item) {
        item.age += dt;
        var dx = p.x - item.x,
          dy = p.y - item.y,
          d = Math.hypot(dx, dy);
        if (d < 36) {
          var travel = Math.min(d, 180 * dt);
          if (d) {
            item.x += (dx / d) * travel;
            item.y += (dy / d) * travel;
          }
        } else {
          item.vy = Math.min(44, item.vy + 65 * dt);
          item.x = clamp(item.x + item.vx * dt, 8, W - 8);
          item.y += item.vy * dt;
        }
        if (distance(item, p) < 10) {
          collect(item);
          return false;
        }
        return item.y < H + 12 && item.age < 15;
      });
      var hit = false,
        children = [];
      state.bullets = state.bullets.filter(function (b) {
        if (
          !patterns.advanceBullet(
            b,
            dt,
            function () {
              children.push(Array.prototype.slice.call(arguments));
            },
            state.player
          )
        ) {
          spark(b.x, b.y, b.color, 2);
          return false;
        }
        if (
          b.age > 12 ||
          b.x < -28 ||
          b.x > W + 28 ||
          b.y < -60 ||
          b.y > H + 20
        )
          return false;
        var d = distance(b, p);
        if (!p.invulnerable && !hit && d < p.radius + b.radius) {
          hit = true;
          return false;
        }
        if (!b.grazed && !p.invulnerable && d < b.radius + state.grazeRadius) {
          b.grazed = true;
          graze();
        }
        return true;
      });
      children.forEach(function (child) {
        bullet.apply(null, child);
      });
      state.lasers = state.lasers.filter(function (beam) {
        beam.age += dt;
        if (beam.age >= beam.warning && !beam.fired) {
          beam.fired = true;
          sound("laser_fire", enemy);
        }
        if (
          beam.age >= beam.warning &&
          beam.age < beam.warning + beam.duration &&
          !p.invulnerable
        ) {
          var gap = laserGap(p, beam);
          if (gap < p.radius) hit = true;
          else if (!beam.grazed && gap < state.grazeRadius) {
            beam.grazed = true;
            graze();
          }
        }
        return beam.age < beam.warning + beam.duration + 0.25;
      });
      if (hit) {
        state.enemySpell.eligible = false;
        state.lives--;
        state.eventNotice = { kind: "miss", age: 0, value: state.lives };
        sound("death");
        state.power = Math.max(1, state.power - 1);
        p.invulnerable = 2.5;
        state.lasers.length = 0;
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
      pause: function () {
        if (state.phase === "playing") state.phase = "paused";
      },
      resume: function () {
        if (state.phase === "paused") {
          state.phase = "playing";
          state.countdown = Math.max(state.countdown, 1);
        }
      },
    };
  }
  var api = {
    create: create,
    cast: cast,
    maxPower: MAX_POWER,
    declarationDuration: DECLARATION_TIME,
    options: optionsFor,
    width: W,
    height: H,
    cards: patterns.cards,
    score: scoreMap,
    laserGap: laserGap,
    laserRoute: laserRoute,
    laserPose: laserPose,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.DanmakuEngine = api;
})(typeof window !== "undefined" ? window : globalThis);
