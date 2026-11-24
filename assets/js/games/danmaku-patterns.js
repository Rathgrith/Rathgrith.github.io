/* Original score-attack scores; each half-beat advances one piece of choreography. */
(function (scope) {
  "use strict";
  var spellPatterns = {
    alice:
      typeof module !== "undefined" && module.exports
        ? require("./danmaku-patterns-alice.js")
        : scope.DanmakuAlicePatterns,
    marisa:
      typeof module !== "undefined" && module.exports
        ? require("./danmaku-patterns-marisa.js")
        : scope.DanmakuMarisaPatterns,
    patchouli:
      typeof module !== "undefined" && module.exports
        ? require("./danmaku-patterns-patchouli.js")
        : scope.DanmakuPatchouliPatterns,
  };
  var scoreMap = typeof module !== "undefined" && module.exports
    ? require("./danmaku-score.js") : scope.DanmakuScore;
  var TAU = Math.PI * 2;
  var cards = {},
    nonspells = {};
  Object.keys(spellPatterns).forEach(function (id) {
    cards[id] = spellPatterns[id].cards;
    cards[id].forEach(function (card) {
      nonspells[card.id] = card.interlude;
    });
  });

  function difficulty(s) {
    var stage = Math.max(
      0,
      cards[s.enemyId].findIndex(function (c) {
        return c.id === s.enemySpell.id;
      })
    );
    var rank = Math.max(0, Math.min(24, (s.level || 1) - 1));
    return {
      stage: stage,
      // Strophes follow the recording even when rank advances the firing clock.
      part: Math.min(2, Math.max(0, Math.floor(3 * (s.time - s.rhythm.sectionStart) /
        Math.max(1, s.rhythm.spellEnd - s.rhythm.sectionStart)))),
      cycle: s.rhythm.cycle || 0,
      rank: rank,
      densityTier: Math.floor(rank / 4),
      density: Math.min(4, Math.floor((rank + 3) / 6)) + (s.enemySpell.nonspell ? 1 : 0),
      cadence: 1 + (0.28 * rank) / 24,
      // Song and card determine speed. Rank adds grains and staggered rows.
      speed: [64, 67, 70, 72, 74, 76][stage],
      warning: 1.15,
      velocityScale: 1,
    };
  }

  // Each row spends eight beats of authored fire over eight recorded beats.
  // Zero leaves the previous wave travelling while the next caster takes over.
  var phrasing = {
    alice: [
      [1.4, 1.2, 0.8, 0.6, 1.4, 1.2, 1.4, 0],
      [1.5, 0.5, 1.5, 0.5, 1.4, 1.4, 1.2, 0],
      [0.4, 1.4, 1.3, 0.9, 0, 1.4, 1.4, 1.2],
    ],
    marisa: [
      [0.6, 1.6, 0.8, 0.6, 1.6, 0.8, 1.6, 0.4],
      [0, 1.7, 1.3, 1, 0.4, 1.6, 1.6, 0.4],
      [1.8, 0.4, 1.6, 0.2, 1.5, 0.5, 0.4, 1.6],
    ],
    patchouli: [
      [1, 1, 1, 0.5, 0, 1.5, 1.5, 1.5],
      [1.4, 0.6, 1.4, 0.6, 0.2, 1.6, 1.6, 0.6],
      [0, 0.6, 1.4, 1.3, 1.3, 1.3, 0.6, 1.5],
    ],
  };
  function phraseRate(s, level) {
    if (s.enemySpell.nonspell) return 1;
    var beat = (s.rhythm.beat + 2 * (level.stage % 4)) % 8;
    return phrasing[s.enemyId][level.part][beat];
  }

  function strokeStyle(style, i, n) {
    return typeof style === "function" ? style(i, n) : style;
  }
  function fan(
    api,
    source,
    angle,
    count,
    arc,
    speed,
    color,
    shape,
    motion,
    gap,
    visualStyle
  ) {
    for (var i = 0; i < count; i++) {
      var heading = angle + (count === 1 ? 0 : (i / (count - 1) - 0.5) * arc);
      if (gap && Math.abs(heading - gap.angle) < gap.halfWidth) continue;
      api.bullet(source.x, source.y, heading, speed, color, shape, motion, strokeStyle(visualStyle, i, count));
    }
  }
  function ring(
    api,
    source,
    count,
    phase,
    speed,
    color,
    shape,
    gap,
    halfWidth,
    motion,
    visualStyle
  ) {
    for (var i = 0; i < count; i++) {
      var a = phase + (TAU * i) / count;
      var delta = a - gap;
      if (Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta))) < halfWidth)
        continue;
      api.bullet(source.x, source.y, a, speed, color, shape, motion, strokeStyle(visualStyle, i, count));
    }
  }
  function bearing(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
  }
  // A stitched knot, double exposure or erasure needs time to be drawn.
  // The remaining cards keep their direct attacks and different timing.
  var inscriptions = {
    buttonhole: "sweep", basting: "paired",
    spectrograph: "paired", shutter: "reverse",
    erratum: "reverse", palimpsest: "paired",
  };
  function recordedAccent(s, level) {
    var track = scoreMap.getTrack(s.enemyId);
    var earliest = s.time + 0.90 + ((level.stage + level.part) % 3) * 0.07;
    var mark = scoreMap.at(s.enemyId, earliest);
    var n = mark.beat, loop = mark.cycle, accent, echo;
    var preferred = (level.stage + level.part + (s.enemyId === "marisa" ? 1 : 0)) % 2 * 2;
    // Prefer the downbeat or the third beat, while bounding the warning time.
    for (var i = 0; i < 12; i++, n++) {
      if (n >= track.beats.length) { n = 0; loop++; }
      var beat = loop * track.duration + track.beats[n];
      if (beat < earliest || n % 2) continue;
      var next = n + 1 < track.beats.length ? loop * track.duration + track.beats[n + 1] :
        (loop + 1) * track.duration + track.beats[0];
      if (accent === undefined || (n % 4 === preferred && beat - s.time <= 1.95)) {
        accent = beat - s.time;
        echo = next - s.time;
      }
      if (n % 4 === preferred || beat - s.time >= 1.95) break;
    }
    return { created:s.time, launch:accent, echo:echo, style:inscriptions[s.enemySpell.id], part:level.part };
  }
  // Each velocity samples one point of the figure. After t seconds the grains
  // describe the same curve at scale spread*t around a descending centre.
  function figure(api, source, cfg, cue) {
    var lobes = cfg.lobes, count = cfg.count, phase = cfg.phase || 0;
    var depth = cfg.depth === undefined ? 0.65 : cfg.depth;
    var angle = cfg.angle || 0, ca = Math.cos(angle), sa = Math.sin(angle);
    var open = cfg.curve === "cycloid", turns = Math.max(1, lobes - 2);
    for (var i = 0; i < count; i++) {
      var u = i / (open ? count - 1 : count);
      if (cfg.gapWidth && Math.abs(u - cfg.gap - Math.round(u - cfg.gap)) < cfg.gapWidth / 2) continue;
      var t = TAU * u, x, y;
      if (cfg.curve === "cycloid") {
        // A point on a translating wheel, flattened to fit a horizontal band.
        var wheel = t * turns + phase;
        x = 2 * ((t * turns - depth * (Math.sin(wheel) - Math.sin(phase))) / (TAU * turns)) - 1;
        y = -0.7 * Math.cos(wheel);
      } else if (cfg.curve === "rose") {
        if (lobes % 2) t *= 0.5;
        var radial = Math.cos(lobes * t + phase);
        x = radial * Math.cos(t); y = radial * Math.sin(t);
      } else if (cfg.curve === "lissajous") {
        var harmonic = lobes % 2 ? lobes : lobes - 1;
        x = Math.sin(2 * t + phase + Math.PI / 4); y = Math.sin(harmonic * t);
      } else {
        // A tracing point on an internal or external rolling circle.
        var inner = cfg.curve === "hypo", gear = inner ? lobes - 1 : lobes + 1;
        x = (Math.cos(t) + (inner ? 1 : -1) * depth * Math.cos(gear * t + phase)) / (1 + depth);
        y = (Math.sin(t) - depth * Math.sin(gear * t + phase)) / (1 + depth);
      }
      var axisX = x * ca - y * sa, axisY = x * sa + y * ca;
      var vx = cfg.spread * axisX, vy = cfg.fall + cfg.spread * axisY;
      var speed = Math.hypot(vx, vy), heading = Math.atan2(vy, vx);
      var lockX = source.x, lockY = source.y, motion;
      if (cue) {
        var radius = Math.min(34, Math.max(23, cfg.spread));
        var cx = Math.max(radius + 4, Math.min(236 - radius, source.x));
        var cy = Math.max(radius + 5, source.y + 5);
        // The writing order follows the curve. Paired casts write from both edges.
        var order = cue.style === "reverse" ? 1 - u : cue.style === "paired" ? Math.abs(1 - 2 * u) : u;
        var second = cue.style === "paired" && cue.part > 0 && u >= .5;
        var launch = second ? cue.echo : cue.launch;
        lockX = cx + axisX * radius; lockY = cy + axisY * radius;
        motion = { inscription: { created:cue.created, originX:source.x, originY:source.y,
          lockX:lockX, lockY:lockY, vx:vx, vy:vy, angle:heading, speed:speed,
          delay:order * cue.launch * .33, windup:(.43 + order * .33) * cue.launch,
          launch:launch } };
      }
      if (cfg.lane && vy > 0) {
        var crossing = lockX + vx * (cfg.lane.y - lockY) / vy;
        if (Math.abs(crossing - cfg.lane.x) < cfg.lane.halfWidth) continue;
      }
      api.bullet(source.x, source.y, heading, speed, cfg.color, cfg.shape, motion, strokeStyle(cfg.visualStyle, i, count));
    }
  }
  // The mark belongs to the current card. The attack samples a point once,
  // so leaving the mark after the tell is a real defensive choice.
  function lockAim(s, color, seconds) {
    var sight = { x: s.player.x, y: s.player.y, color: color, at: s.time,
      ready: s.time + (seconds === undefined ? 0.48 : seconds) };
    s.enemySpell.sight = sight;
    return sight;
  }
  function aimBearing(s, source) {
    var sight = s.enemySpell.sight;
    if (!sight || s.time < sight.ready || s.time > sight.ready + 3 ||
        Math.hypot(source.x - s.player.x, source.y - s.player.y) < 34 ||
        Math.hypot(source.x - sight.x, source.y - sight.y) < 1) return null;
    return bearing(source, sight);
  }
  // Address each tail grain directly. Collecting loot or drawing another frame
  // must not move the scatter sequence forward.
  function scatter(s, tick, index) {
    var key = (s.patternSeed ^ Math.imul((s.rhythm.sectionKey || 0) + 1, 0x9e3779b1) ^
      Math.imul(tick + 1, 0x21f0aaad) ^ Math.imul(index + 1, 0x735a2d97) ^
      s.enemyId.charCodeAt(0)) >>> 0;
    key = Math.imul(key ^ (key >>> 16), 0x7feb352d);
    key = Math.imul(key ^ (key >>> 15), 0x846ca68b);
    return ((key ^ (key >>> 16)) >>> 0) / 4294967296;
  }
  function spoke(api, source, angle, cfg) {
    for (var i = 0; i < cfg.count; i++) {
      if (i >= cfg.cut && i < cfg.cut + cfg.skip) continue;
      api.bullet(source.x, source.y, angle, cfg.speed + i * cfg.step,
        cfg.color, cfg.shape, undefined, strokeStyle(cfg.visualStyle, i, cfg.count));
    }
  }
  var brush = { fan: fan, ring: ring, bearing: bearing, figure: figure,
    lockAim: lockAim, aimBearing: aimBearing, scatter: scatter, spoke: spoke };
  function update(s, dt, api) {
    var score = spellPatterns[s.enemyId];
    if (!s.enemySpell.nonspell && score.update)
      score.update(s, dt, api, difficulty(s));
  }
  // The principals retain their authored stations. New partners take positions
  // on a separate upstage rail; an answer belongs to one desk, never all at once.
  function ensemble(s, principals, stage) {
    var id = s.enemyId, target = (id === "marisa" ? 2 : 3) + stage;
    var extra = target - principals.length;
    var colors = id === "alice" ? ["#ef9eb0", "#94d7f2"] :
      id === "marisa" ? ["#ffe3a0", "#b7a9ef"] : ["#ecc2d5", "#a2e0d4"];
    for (var i = 0; i < extra; i++) {
      var u = (i + 0.5) / extra, age = s.enemySpell.age, x, y;
      if (id === "alice") {
        x = 18 + 204 * u; y = 25 + 7 * Math.cos(age * .75 + i);
      } else if (id === "marisa") {
        x = 22 + 196 * u + 9 * Math.sin(age * .85 + i);
        y = 22 + 7 * Math.sin(age * .65 + u * Math.PI * 2);
      } else {
        x = 18 + u * 204; y = 21 + 10 * Math.abs(2 * u - 1) + 2 * Math.sin(age + i);
      }
      principals.push({ id: "relay-" + i, kind: principals[0].kind,
        x: x, y: y, color: colors[i % 2], relay: true });
    }
    return principals;
  }
  function emitters(s) {
    var sources = spellPatterns[s.enemyId].emitters(s);
    return s.enemySpell.nonspell ? sources : ensemble(s, sources, difficulty(s).stage);
  }
  function relay(s, tick, api, d) {
    // One short answer per measure from successive recruits. Their oblique
    // shots reach the wings, leaving the principal's lower-field passage intact.
    var id = s.enemyId, interval = id === "alice" ? 8 : id === "marisa" ? 10 : 12;
    if (tick < interval || tick % interval !== (id === "patchouli" ? 5 : 1)) return;
    var sources = emitters(s).filter(function (e) { return e.relay; });
    if (!sources.length) return;
    var turn = Math.floor(tick / interval) - 1, from = sources[turn % sources.length];
    var side = from.x < 120 || (from.x === 120 && turn % 2) ? -1 : 1;
    var speed = d.speed * .89, edge = side < 0 ? 9 : 231;
    var theta = bearing(from, {x:edge, y:179});
    if (id === "alice") {
      // Basting only carries the hem: the wings stop adding thread at the selvage.
      fan(api, from, theta, 3 + Number(d.density > 1), .12, speed, from.color, "rice", null, null, function(i) { return i === 1 ? "needle" : "smallorb"; });
    } else if (id === "marisa") {
      api.bullet(from.x, from.y, theta, speed, from.color, "bigstar",
        { split:{ at:.9, count:2, spread:.24, speed:speed, shape:"smallstar", visualStyle:"stardust" } }, "comet");
    } else {
      fan(api, from, theta, 3, .19, speed * .85, from.color, "amulet", null, null, function(i) { return i === 1 ? "seal" : "quill"; });
    }
  }
  function bossPosition(s) {
    return s.enemySpell.nonspell
      ? null
      : spellPatterns[s.enemyId].bossPosition(s);
  }

  // Motion changes are one-shot, deterministic and independent of frame rate.
  // A cleared parent can never produce invisible delayed children afterwards.
  function advanceBullet(b, dt, spawn, target, now) {
    var script = b.motion && b.motion.inscription;
    if (script) {
      b.age = Number.isFinite(now) ? Math.max(0, now - script.created) : (b.age || 0) + dt;
      b.inscribing = b.age < script.launch;
      b.heading = script.angle;
      if (b.inscribing) {
        var t = Math.max(0, Math.min(1, (b.age - script.delay) / (script.windup - script.delay)));
        var ease = t * t * (3 - 2 * t), curl = Math.sin(t * Math.PI) * 0.13;
        var dx = script.lockX - script.originX, dy = script.lockY - script.originY;
        b.x = script.originX + dx * ease - dy * curl;
        b.y = script.originY + dy * ease + dx * curl;
        b.vx = b.vy = 0;
      } else {
        b.released = true;
        var flight = b.age - script.launch;
        b.vx = script.vx; b.vy = script.vy;
        b.x = script.lockX + flight * b.vx;
        b.y = script.lockY + flight * b.vy;
      }
      return true;
    }
    b.age = (b.age || 0) + dt;
    if (b.motion && b.motion.hem) {
      spellPatterns.alice.advanceHem(b, b.motion.hem, dt);
      return true;
    }
    if (Math.hypot(b.vx, b.vy) > 0.001) b.heading = Math.atan2(b.vy, b.vx);
    var m = b.motion || {},
      change = m.redirect,
      ramp = m.decelerate;
    if (ramp && !b.rampComplete && b.age >= ramp.from) {
      if (b.rampStartSpeed === undefined)
        b.rampStartSpeed = Math.hypot(b.vx, b.vy);
      var progress = Math.min(
          1,
          (b.age - ramp.from) / Math.max(0.001, ramp.to - ramp.from)
        ),
        heading = Math.atan2(b.vy, b.vx),
        speed = b.rampStartSpeed + (ramp.speed - b.rampStartSpeed) * progress;
      b.vx = Math.cos(heading) * speed;
      b.vy = Math.sin(heading) * speed;
      b.rampComplete = progress >= 1;
    }
    if (
      change &&
      !b.redirected &&
      (change.y !== undefined ? b.y >= change.y : b.age >= change.at)
    ) {
      var a = change.angle,
        v = change.speed;
      // A formation can expand first, then aim as one body. Share this small
      // latch across its bullets: sample once at the turn, never home each grain.
      if (change.aim && target) {
        if (change.aim.angle === undefined)
          change.aim.angle = Math.atan2(
            target.y - change.aim.y,
            target.x - change.aim.x
          );
        a = change.aim.angle;
      }
      if (change.duration) {
        b.redirectStart = change.y !== undefined ? b.age : change.at;
        b.redirectHeading = b.heading || 0;
        b.redirectSpeed = Math.hypot(b.vx, b.vy);
        b.redirectTarget = a;
      } else {
        b.vx = Math.cos(a) * v;
        b.vy = Math.sin(a) * v;
      }
      b.curve = 0;
      b.redirected = true;
    }
    if (b.redirected && change.duration && !b.redirectComplete) {
      var progress = Math.min(1, (b.age - b.redirectStart) / change.duration),
        ease = progress * progress * (3 - 2 * progress),
        delta = b.redirectTarget - b.redirectHeading,
        arc = Math.atan2(Math.sin(delta), Math.cos(delta)),
        a = b.redirectHeading + arc * ease,
        v = b.redirectSpeed + (change.speed - b.redirectSpeed) * ease;
      b.vx = Math.cos(a) * v;
      b.vy = Math.sin(a) * v;
      b.redirectComplete = progress >= 1;
    }
    if (m.release && !b.released && b.age >= m.release.at) {
      var a =
        m.release.angle === undefined
          ? Math.atan2(b.vy, b.vx)
          : m.release.angle;
      b.vx = Math.cos(a) * m.release.speed;
      b.vy = Math.sin(a) * m.release.speed;
      b.released = true;
    }
    if (b.curve) {
      var a = b.curve * dt,
        vx = b.vx;
      b.vx = vx * Math.cos(a) - b.vy * Math.sin(a);
      b.vy = vx * Math.sin(a) + b.vy * Math.cos(a);
      if (b.curveDecay) b.curve *= Math.exp(-b.curveDecay * dt);
    }
    if (Math.hypot(b.vx, b.vy) > 0.001) b.heading = Math.atan2(b.vy, b.vx);
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    if (
      m.banks &&
      (b.banks || 0) < m.banks &&
      ((b.x < 5 && b.vx < 0) || (b.x > 235 && b.vx > 0))
    ) {
      b.x = b.x < 5 ? 10 - b.x : 470 - b.x;
      b.vx *= -1;
      b.banks = (b.banks || 0) + 1;
      b.heading = Math.atan2(b.vy, b.vx);
    }
    if (m.split && b.age >= m.split.at) {
      var split = m.split,
        base = Math.atan2(b.vy, b.vx) + (split.angleOffset || 0);
      for (var i = 0; i < split.count; i++)
        spawn(
          b.x,
          b.y,
          base + (i - (split.count - 1) / 2) * split.spread,
          split.speed,
          split.color || b.color,
          split.shape || b.shape,
          split.motion,
          Array.isArray(split.visualStyle) ? split.visualStyle[i % split.visualStyle.length] : split.visualStyle
        );
      return false;
    }
    return true;
  }
  function emit(s, tick, api) {
    if (s.enemySpell.firstPatternTick === undefined)
      s.enemySpell.firstPatternTick = tick;
    var localTick = tick - s.enemySpell.firstPatternTick;
    var score = spellPatterns[s.enemyId],
      level = difficulty(s);
    if (s.enemySpell.nonspell) score.interlude(s, localTick, api, level, brush);
    else if (inscriptions[s.enemySpell.id]) {
      score.emit(s, localTick, api, level, Object.assign({}, brush, {
        figure:function (out, source, cfg) { figure(out, source, cfg, recordedAccent(s, level)); },
      }));
    } else score.emit(s, localTick, api, level, brush);
    if (!s.enemySpell.nonspell) relay(s, localTick, api, level);
  }
  var api = {
    cards: cards,
    spoke: spoke,
    scatter: scatter,
    nonspells: nonspells,
    emitters: emitters,
    bossPosition: bossPosition,
    emit: emit,
    update: update,
    difficulty: difficulty,
    phraseRate: phraseRate,
    advanceBullet: advanceBullet,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.DanmakuPatterns = api;
})(typeof window !== "undefined" ? window : globalThis);
