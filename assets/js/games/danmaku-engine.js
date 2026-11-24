/* Deterministic, DOM-free score attack. Coordinates are always 240 × 360. */
(function (scope) {
  "use strict";
  var pilot = typeof module !== "undefined" && module.exports
    ? require("./danmaku-pilot.js") : scope.DanmakuPilot;
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
  var expedition = typeof module !== "undefined" && module.exports
    ? require("./danmaku-run.js") : scope.DanmakuRun;
  var MAX_POWER = 32,
    DECLARATION_TIME = 2,
    OPENING_GUARD = 10;
  var W = 240,
    H = 360,
    TAU = Math.PI * 2;
  var cast = {
    alice: {
      name: "アリス",
      shot: "騎士人形・出撃と近衛",
      pattern: "糸の隙間を渡る · 動く縫い目",
      color: "#8ed9ef",
      speed: 136,
    },
    marisa: {
      name: "魔理沙",
      shot: "貫通レール・星弾砲台",
      pattern: "星を誘導する · 壁で跳ねる光",
      color: "#ffdc83",
      speed: 154,
    },
    patchouli: {
      name: "パチュリー",
      shot: "七曜の魔導書・連鎖詠唱",
      pattern: "空欄を読む · 頁をめくる弾列",
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
  // Weapons operate on live targets from either playfield. Damage callbacks
  // keep stage drops, duel chains and boss durability in their own rule sets.
  function newWeapon() {
    return { clock: 0, charge: 0, beat: 0, guardClock: 0, scoutClock: 0, heavyClock: 0, echoClock: 0, echo: null, dolls: [], starPods: [], grimoires: [], traces: [] };
  }
  function optionsFor(s) {
    if (s.playerId === "alice" && s.weapon) return s.weapon.dolls;
    if (s.playerId === "marisa" && s.weapon) return s.weapon.starPods;
    return s.weapon && s.weapon.grimoires || [];
  }
  function shotTarget(from, targets, omitted, reach) {
    var best = null, shortest = reach;
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      if (t.dead || t.hp <= 0 || t.y < -5 || t.y > H + 4 || (omitted && omitted.has(t))) continue;
      var d = distance(from, t);
      if (d < shortest) { best = t; shortest = d; }
    }
    return best;
  }
  function segmentGap(from, to, point) {
    var dx = to.x - from.x, dy = to.y - from.y, length2 = dx * dx + dy * dy;
    var u = length2 ? clamp(((point.x - from.x) * dx + (point.y - from.y) * dy) / length2, 0, 1) : 0;
    return Math.hypot(point.x - from.x - dx * u, point.y - from.y - dy * u);
  }
  // First point on the target rim touched by a weapon travelling along this ray.
  // Wide beams and grazes use the nearest edge when their centreline misses.
  // The pearl's bright core is its hurt radius. Saber blades carry their
  // collision at the hilt; the long tapered edge indicates heading.
  function projectileRadius(style, baseRadius) {
    if (style === "largeorb") return 4.8;
    if (style === "smallorb") return 1.7;
    if (style === "saber") return 2.3;
    return baseRadius;
  }
  function contactAt(target, from, angle, kind, element, heavy) {
    var dx = Math.cos(angle), dy = Math.sin(angle), radius = target.radius || 12;
    var lateral = clamp((from.y - target.y) * dx - (from.x - target.x) * dy, -radius, radius);
    var near = Math.sqrt(Math.max(0, radius * radius - lateral * lateral));
    return { kind: kind, angle: angle, element: element, heavy: Boolean(heavy),
      x: target.x - near * dx - lateral * dy, y: target.y - near * dy + lateral * dx };
  }
  var impactLife = { lance: 0.19, blade: 0.24, rail: 0.21, comet: 0.16, page: 0.23,
    foe: 0.33, armor: 0.38, spirit: 0.39, fracture: 0.35, seal: 0.52 };
  function recordImpact(field, target, contact, color) {
    if (!contact || !impactLife[contact.kind]) return;
    var events = field.impacts, kind = contact.kind;
    var x = Number.isFinite(contact.x) ? contact.x : target.x;
    var y = Number.isFinite(contact.y) ? contact.y : target.y;
    var life = impactLife[kind];
    // Merge repeated hits in the same place and preserve larger breaks under load.
    if (life < 0.3) {
      var nearby = events.find(function (e) {
        return e.kind === kind && e.age < 0.055 && Math.hypot(e.x - x, e.y - y) < 6;
      });
      if (nearby) {
        if (contact.heavy) nearby.heavy = true;
        return;
      }
    }
    if (events.length >= 24) {
      var slot = events.findIndex(function (e) { return e.life < 0.3; });
      if (slot < 0 && life >= 0.3) slot = events.findIndex(function (e) { return e.life <= life; });
      if (slot < 0) return;
      events.splice(slot, 1);
    }
    events.push({ kind: kind, x: x, y: y, angle: contact.angle || 0,
      color: color, element: contact.element, heavy: Boolean(contact.heavy), age: 0, life: life });
  }
  function advanceImpacts(field, dt) {
    for (var i = field.impacts.length - 1; i >= 0; i--) {
      var e = field.impacts[i];
      e.age += dt;
      if (e.age >= e.life) field.impacts.splice(i, 1);
    }
  }
  function markDurability(field, target, bar, before, color) {
    bar.echoHp = Math.max(before, bar.echoHp || 0);
    if (bar.hp > 0 && [0.5, 0.25].some(function (fraction) {
      return before > bar.maxHp * fraction && bar.hp <= bar.maxHp * fraction;
    })) recordImpact(field, target, {kind: "fracture"}, color);
  }
  function dollSupportY(field, target, home) {
    if (!target) return home;
    var p = field.player;
    var support = clamp(target.y + 145, 145, H - 40);
    if (support >= p.y) return support;
    // Stay on the near side of crossing fire until a path into dispatch
    // distance opens. The route planner still checks every movement.
    var screened = field.bullets.some(function (b) {
      return b.y >= support - 18 && b.y < p.y + 8 && Math.abs(b.x - p.x) < 42;
    });
    return screened ? Math.min(p.y, home) : support;
  }
  function steerDollFormation(input, field, target, slowSpeed) {
    if (!input.focus) return;
    var reach = target && target.kind === "spirit" ? 120 : field.focus ? 100 : 78;
    if (target && distance(target, field.player) < reach) return;
    // Precision steering at a distance keeps the dolls deployed. Use an analog
    // input of the same velocity so the path that the planner checked is exact.
    var scale = slowSpeed / cast.alice.speed;
    input.x *= scale;
    input.y *= scale;
    input.focus = false;
  }
  function flightBank(p, dx, dy, dt) {
    var response = 1 - Math.exp(-dt * 9);
    p.bank = (p.bank || 0) + (clamp(dx / Math.max(0.01, dt * 90), -1, 1) - (p.bank || 0)) * response;
    p.pitch = (p.pitch || 0) + (clamp(dy / Math.max(0.01, dt * 90), -1, 1) - (p.pitch || 0)) * response;
  }
  var armory = ["lance", "blade", "shield", "lance", "blade", "shield"];
  function threadTension(player, target) {
    var t = clamp((200 - distance(player, target)) / 168, 0, 1);
    return t * t * (3 - 2 * t);
  }
  function orderTarget(d, homeX, homeY, range, targets, allies, player) {
    var best = null, cost = Infinity;
    targets.forEach(function (t) {
      if (t.dead || t.hp <= 0 || t.y < -4 || t.y >= H ||
          (t.y > homeY + 12 && distance(player, t) > 56)) return;
      var dist = Math.hypot(t.x - homeX, t.y - homeY);
      if (dist > range || Math.abs(t.x - homeX) > range * 0.84) return;
      // Prefer an unengaged opponent in this wing when several are in reach.
      var reserved = allies.some(function (ally) {
        return ally !== d && (ally.phase === "windup" || ally.phase === "strike") &&
          Math.hypot(ally.aimX - t.x, ally.aimY - t.y) < 14;
      });
      var score = dist + Math.abs(t.x - homeX) * 0.38 + (reserved ? 36 : 0);
      if (score < cost) { best = t; cost = score; }
    });
    return best;
  }
  function prepareDollStrike(d, target) {
    d.aimX = target.x; d.aimY = target.y;
    d.originX = d.x; d.originY = d.y;
    var dx = target.x - d.x, dy = target.y - d.y;
    d.facing = Math.atan2(dy, dx);
    var reach = Math.max(0, Math.hypot(dx, dy) - (d.role === "lancer" ? 11 : 9));
    d.goalX = clamp(d.x + Math.cos(d.facing) * reach, 4, W - 4);
    d.goalY = clamp(d.y + Math.sin(d.facing) * reach, 4, H - 4);
    d.duration = (d.role === "lancer" ? 0.10 : 0.20) + reach / (d.role === "lancer" ? 470 : 550);
    d.phase = "windup"; d.age = 0; d.swing = 0;
    d.hits = new Set();
  }
  function stepPuppets(field, power, dt, canFire, targets, damage, sound, trace, strength, tempo) {
    var w = field.weapon, p = field.player, close = field.focus;
    var count = Math.min(6, 2 + Math.floor(power / 5));
    var span = close ? 13 + (count - 2) * 2 : 20 + (count - 2) * 8;
    var centre = clamp(p.x, 7 + span, W - 7 - span);
    var changed = w.focus !== undefined && w.focus !== close;
    w.focus = close;
    w.guardClock = Math.max(0, w.guardClock - dt);
    w.scoutClock = Math.max(0, w.scoutClock - dt);
    w.dolls.length = Math.min(count, w.dolls.length);
    for (var i = 0; i < count; i++) {
      var lane = i * 2 / (count - 1) - 1;
      var homeX = centre + span * lane;
      var homeY = clamp(p.y - (close ? 23 + (1 - Math.abs(lane)) * 13 : 22 + 13 * Math.abs(lane)), 8, H - 8);
      var d = w.dolls[i];
      if (!d) {
        d = { index: i, arm: armory[i], phase: "home", x: homeX, y: homeY,
          age: 0, swing: 0, tension: 0, scouting: false, mark: null, facing: -Math.PI / 2, cooldown: i * 0.089 };
        w.dolls.push(d);
      }
      d.role = close || d.arm === "shield" ? "guard" : d.arm === "lance" ? "lancer" : "blade";
      var range = close ? 67 : d.arm === "lance" ? 188 : d.arm === "blade" ? 158 : 112;
      if ((changed || !canFire || (!d.scouting && distance(d, p) > range + 48)) &&
          (d.phase === "sortie" || d.phase === "windup" || d.phase === "strike")) {
        d.phase = "return"; d.age = 0; d.mark = null;
      }
      d.age += dt * (d.scouting ? Math.min(tempo, 1.32) : tempo);
      d.tension = (d.phase === "strike" || d.phase === "windup")
        ? threadTension(p, {x: d.aimX, y: d.aimY}) : 0;
      if (d.phase === "sortie") {
        // The rider can steer on the journey out. The final thrust is committed
        // only at weapon range, so a moving boss can be reached and can still dodge.
        var mark = d.mark;
        if (!mark || !targets.includes(mark) || mark.dead || mark.hp <= 0 ||
            mark.x < -4 || mark.x > W + 4 || mark.y < -4 || mark.y >= H || d.age > 5) {
          d.phase = "return"; d.age = 0; d.mark = null;
          continue;
        }
        var dx = mark.x - d.x, dy = mark.y - d.y;
        var remaining = Math.hypot(dx, dy), approach = Math.min(Math.max(0, remaining - 30), 150 * dt);
        d.facing = Math.atan2(dy, dx);
        if (remaining) { d.x += dx / remaining * approach; d.y += dy / remaining * approach; }
        if (remaining <= 30 + approach) {
          prepareDollStrike(d, mark);
          d.mark = null;
        }
        continue;
      }
      if (d.phase === "home" || d.phase === "return") {
        var rx = homeX - d.x, ry = homeY - d.y;
        var dist = Math.hypot(rx, ry);
        var returning = d.phase === "return";
        var returnSpeed = d.scouting && !close ? 200 : 460;
        var travel = Math.min(dist, (returning ? returnSpeed : 310) * dt);
        if (dist) { d.x += rx / dist * travel; d.y += ry / dist * travel; }
        if (d.phase === "return" && dist <= travel + 1) {
          d.phase = "home"; d.age = 0; d.swing = 0; d.facing = -Math.PI / 2;
          d.scouting = false;
        }
        if (!returning || !d.scouting) d.cooldown = Math.max(0, d.cooldown - dt * tempo);
        if (close && d.arm !== "lance" && d.phase === "home" && canFire && !w.guardClock) {
          var blocked = (field.bullets || []).findIndex(function (b) {
            return !b.inscribing && !b.hard && b.radius <= 2.7 && b.y <= d.y + 2 &&
              Math.hypot(b.x - d.x, b.y - (d.y - 5)) <= 7 + b.radius;
          });
          if (blocked >= 0) {
            var b = field.bullets.splice(blocked, 1)[0];
            w.guardClock = 2;
            trace("parry", d, b, 2);
            sound("parry", "alice");
          }
        }
        if (!canFire || d.phase !== "home" || d.cooldown > 0 || dist > 12) continue;
        var target = orderTarget(d, homeX, homeY, range, targets, w.dolls, p);
        if (!target && !close && d.arm === "lance" && !w.scoutClock) {
          var visible = targets.filter(function (t) {
            return t.x >= -4 && t.x <= W + 4 && t.y < p.y + 12;
          });
          var distant = shotTarget(d, visible, null, Infinity);
          if (distant) {
            d.scouting = true; d.mark = distant; d.phase = "sortie"; d.age = 0;
            d.aimX = distant.x; d.aimY = distant.y;
            w.scoutClock = 0.65;
            continue;
          }
        }
        if (!target) { d.cooldown = 0.10; continue; }
        prepareDollStrike(d, target);
        continue;
      }
      if (d.phase === "windup") {
        if (d.age >= (d.role === "blade" ? 0.14 : 0.09)) {
          d.phase = "strike"; d.age = 0;
          sound("shot", "alice", d.arm);
        }
        continue;
      }
      var oldX = d.x, oldY = d.y;
      d.swing = Math.min(1, d.age / d.duration);
      var thrust = d.role === "lancer";
      var approach = Math.min(1, d.swing / (thrust ? 1 : 0.58));
      d.x = d.originX + (d.goalX - d.originX) * approach;
      d.y = d.originY + (d.goalY - d.originY) * approach;
      if (thrust || d.swing >= 0.58) {
        var angle = thrust ? d.facing : d.facing - 1.14 + clamp((d.swing - 0.58) / 0.42, 0, 1) * 2.28;
        var length = thrust ? 19 : d.role === "blade" ? 25 : 15;
        var tip = { x: d.x + Math.cos(angle) * length, y: d.y + Math.sin(angle) * length };
        var hilt = { x: thrust ? oldX : d.x, y: thrust ? oldY : d.y };
        targets.forEach(function (t) {
          if (t.dead || t.hp <= 0 || t.y < -4 || d.hits.has(t) ||
              segmentGap(hilt, tip, t) > (t.radius || 12) + (thrust ? 2 : 3)) return;
          d.hits.add(t);
          trace(thrust ? "thrust" : "cleave", d, tip, thrust ? 1 : 2);
          var base = thrust ? 7.4 : d.role === "blade" ? 8 : 4.4;
          d.tension = threadTension(p, t);
          damage(t, base * strength * (1 + 0.8 * d.tension), cast.alice.color,
            contactAt(t, hilt, angle, thrust ? "lance" : "blade"));
        });
      }
      if (d.swing >= 1) {
        d.phase = "return"; d.age = 0; d.cooldown = d.scouting ? 0.85 : close ? 0.30 : 0.38;
      }
    }
  }
  function stepStarPods(field, power, dt, tempo, canFire, launch, sound) {
    var pods = field.weapon.starPods, p = field.player;
    var count = Math.min(6, 2 + Math.floor((power - 1) / 5));
    var focus = field.focus, spacing = focus ? 6 : 10, inner = focus ? 10 : 20;
    var extent = inner + Math.floor((count - 1) / 2) * spacing;
    var center = clamp(p.x, extent + 5, W - extent - 5);
    pods.length = Math.min(count, pods.length);
    for (var i = 0; i < count; i++) {
      var side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
      var x = center + side * (inner + row * spacing), y = p.y - 8 - row * 8;
      var pod = pods[i];
      if (!pod) {
        pod = { x: x, y: y, wait: i * 0.47 / count, flash: 0 };
        pods.push(pod);
      }
      var follow = 1 - Math.exp(-dt * 16);
      pod.x += (x - pod.x) * follow;
      pod.y += (y - pod.y) * follow;
      pod.tilt = side * (focus ? -0.035 : 0.12 + row * 0.065);
      pod.flash = Math.max(0, pod.flash - dt);
      if (!canFire) continue;
      pod.wait -= dt * tempo;
      if (pod.wait > 0) continue;
      var dx = Math.sin(pod.tilt), dy = -Math.cos(pod.tilt);
      var shot = launch("comet", {x: pod.x + dx * 5, y: pod.y + dy * 5},
        dx * 243, dy * 243, 0.72);
      pod.wait += 0.47;
      if (shot) {
        shot.silhouette = focus ? "bolt" : ["sun", "crescent", "bolt"][i % 3];
        pod.flash = 0.10;
        sound("shot", "marisa", "pod");
      }
    }
  }
  // Each marked page takes one slot in Patchouli's volley. The pilot and books
  // take turns, so a new volume changes the formation without duplicating DPS.
  var elements = ["fire", "water", "wood", "metal", "earth", "sun", "moon"];
  function stepGrimoires(field, power, dt, tempo, canFire, targets, launch, sound) {
    var w = field.weapon, p = field.player, books = w.grimoires;
    // Duel spell levels stop at 12. Score expeditions build up to 32 power.
    var tierStep = field.side === undefined ? 5 : 2;
    var count = Math.min(elements.length, 2 + Math.floor(power / tierStep));
    var span = field.focus ? 15 + count : 21 + 5 * count;
    var center = clamp(p.x, 7 + span, W - 7 - span);
    books.length = Math.min(books.length, count);
    for (var i = 0; i < count; i++) {
      var fraction = i / (count - 1), lane = fraction * 2 - 1;
      var angle = Math.PI * (1 + 2 * (i + 0.5) / count);
      var x = center + span * (field.focus ? Math.sin(angle) : lane);
      var y = clamp(p.y - (field.focus ? 27 + 11 * Math.cos(angle) : 17 + 8 * Math.abs(lane)), 9, H - 8);
      var book = books[i];
      if (!book) {
        book = {element: elements[i], x: x, y: y, index: i, flash: 0, tilt: 0, mark: null};
        books.push(book);
      }
      var follow = 1 - Math.exp(-dt * 14);
      book.x += (x - book.x) * follow;
      book.y += (y - book.y) * follow;
      book.tilt = field.focus ? Math.sin(angle) * 0.12 : lane * 0.26;
      book.flash = Math.max(0, book.flash - dt);
    }
    w.clock -= dt * tempo;
    if (!canFire) { w.clock = Math.max(0, w.clock); return; }
    if (w.clock > 0) return;
    var slot = w.beat % (count + 1);
    var book = slot ? books[slot - 1] : null;
    var source = book || { x: p.x, y: p.y - 11 };
    var lock = shotTarget(field.focus ? p : source, targets, null, Infinity);
    if (book && lock && !field.focus) {
      var occupied = new Set(books.filter(function (other) { return other !== book; })
        .map(function (other) { return other.mark; }));
      lock = shotTarget(source, targets, occupied, distance(source, lock) + 72) || lock;
    }
    var outward = book ? (book.x - p.x) * (field.focus ? -2.4 : 1.45) : 0;
    var shot = launch("bookmark", source, clamp(outward, -85, 85), -235, 2.65);
    if (shot) {
      shot.mark = lock;
      shot.element = book ? book.element : null;
      shot.relay = Boolean(field.focus);
    }
    if (shot && book) { book.flash = 0.25; book.mark = lock; }
    // All projectiles share the old power-scaled budget. Keep sub-frame cadence
    // when max-power editions are read several times per original volley.
    var leaves = Math.min(5, 1 + Math.floor(power / 5));
    w.clock += 0.29 / leaves;
    if (shot) sound("shot", "patchouli", book ? "seal" : "page");
    w.beat++;
  }
  function stepWeapons(field, id, power, dt, canFire, targets, damage, sound) {
    var w = field.weapon, p = field.player, focus = field.focus;
    var mods = field.run ? field.run.mods : null;
    var strength = (1 + (power - 1) * 0.105) * (1 + 0.32 * (mods ? mods.damage : 0));
    var tempo = 1 + 0.22 * (mods ? mods.tempo : 0) + Math.min(0.5, (power - 1) * 0.023);
    if (mods && field.run.overdriveUntil > field.time) tempo *= 1.35;
    var cap = field.side === undefined ? 140 : 96;
    function trace(kind, from, to, width, element) {
      if (w.traces.length < 48) w.traces.push({ kind: kind, x: from.x, y: from.y, tx: to.x, ty: to.y, width: width, age: 0, element: element });
    }
    function strike(target, amount, color, contact) {
      if (!mods || (target === field.boss && field.enemySpell && field.enemySpell.reload > 0)) {
        damage(target, amount, color, contact);
        return;
      }
      var heavy = mods.damage > 0 && !w.heavyClock;
      if (heavy) {
        w.heavyClock = 1.5;
        contact.heavy = true;
        trace("heavy", contact, target, 7, contact.element);
      }
      if (mods.tempo >= 3 && !w.echoClock) {
        w.echoClock = 1.1;
        w.echo = { x: target.x, y: target.y, left: 0.16, amount: amount * 0.6,
          color: color, kind: contact.kind, element: contact.element, angle: contact.angle,
          section: field.rhythm && field.rhythm.sectionKey, nonspell: field.enemySpell && field.enemySpell.nonspell,
          clears: field.enemySpell && field.enemySpell.clears, bomb: field.spell && field.spell.id };
      }
      damage(target, amount * (heavy ? 1.65 : 1), color, contact);
      if (heavy && mods.damage >= 3) {
        trace("blast", contact, target, 32, contact.element);
        targets.forEach(function (other) {
          if (other === target || other.dead || other.hp <= 0 || other.y < -5 || other.y > H + 4 ||
              distance(target, other) > 32 + (other.radius || 0)) return;
          var angle = Math.atan2(other.y - target.y, other.x - target.x);
          damage(other, amount * 0.6, color, contactAt(other, target, angle, contact.kind, contact.element));
        });
      }
    }
    function launch(kind, source, vx, vy, amount) {
      if (field.shots.length >= cap) return;
      var shot = {
        x: source.x, y: source.y, vx: vx, vy: vy, age: 0, kind: kind,
        damage: amount * strength, color: cast[id].color,
      };
      field.shots.push(shot);
      return shot;
    }
    w.traces = w.traces.filter(function (fx) { fx.age += dt; return fx.age < 0.16; });
    w.heavyClock = Math.max(0, w.heavyClock - dt);
    w.echoClock = Math.max(0, w.echoClock - dt);
    if (w.echo && (w.echo.left -= dt) <= 0) {
      var echo = w.echo;
      w.echo = null;
      if (canFire && echo.section === (field.rhythm && field.rhythm.sectionKey) &&
          echo.nonspell === (field.enemySpell && field.enemySpell.nonspell) &&
          echo.clears === (field.enemySpell && field.enemySpell.clears) && echo.bomb === (field.spell && field.spell.id)) {
        var marked = shotTarget(echo, targets, null, 24);
        trace("echo", echo, marked || echo, 9, echo.element);
        if (marked) {
          var offsetX = marked.x - echo.x, offsetY = marked.y - echo.y;
          var bearing = Math.hypot(offsetX, offsetY) > 1 ? Math.atan2(offsetY, offsetX) : echo.angle;
          damage(marked, echo.amount, echo.color, contactAt(marked, echo, bearing, echo.kind, echo.element));
        }
      }
    }
    if (id === "alice") {
      stepPuppets(field, power, dt, canFire, targets, strike, sound, trace, strength, tempo);
      if (!field.shots.length) return;
    }
    if (id === "patchouli") stepGrimoires(field, power, dt, tempo, canFire, targets, launch, sound);
    else w.clock = Math.max(0, w.clock - dt * tempo);
    if (id === "marisa") stepStarPods(field, power, dt, tempo, canFire, launch, sound);
    if (!canFire) w.charge = 0;
    else if (id === "marisa" && focus) w.charge = Math.min(1, w.charge + dt * tempo / 0.68);
    if (id === "marisa" && canFire && !w.clock && (!focus || w.charge >= 1)) {
      sound("shot", id, w.charge > 0 ? "charged" : "rail");
      var charge = w.charge, width = 5 + Math.min(12, power * 0.42) + charge * 13;
      var muzzle = { x: p.x, y: p.y - 10 };
      trace("rail", muzzle, { x: p.x, y: -4 }, width);
      targets.forEach(function (t) {
        if (!t.dead && !(t.hp <= 0) && t.y >= -5 && t.y < muzzle.y &&
            Math.abs(t.x - p.x) < width / 2 + (t.radius || 12)) {
          strike(t, (3.65 + 13.4 * charge) * strength, cast.marisa.color,
            contactAt(t, muzzle, -Math.PI / 2, "rail", null, charge >= 0.95));
        }
      });
      w.charge = 0;
      w.clock = focus ? 0 : 0.19;
      w.beat++;
    }
    field.shots = field.shots.filter(function (s) {
      s.age = (s.age || 0) + dt;
      var from = { x: s.x, y: s.y };
      if (s.kind === "bookmark") {
        if (!s.mark || s.mark.dead || s.mark.hp <= 0 || !targets.includes(s.mark))
          s.mark = shotTarget(s, targets, null, Infinity);
        var target = s.mark;
        if (target) {
          var angle = Math.atan2(target.y - s.y, target.x - s.x), turn = 1 - Math.exp(-dt * 5);
          s.vx += (Math.cos(angle) * 270 - s.vx) * turn;
          s.vy += (Math.sin(angle) * 270 - s.vy) * turn;
        }
      }
      s.x += s.vx * dt; s.y += s.vy * dt;
      var impact = null, near = Infinity;
      targets.forEach(function (t) {
        if (t.dead || t.hp <= 0 || t.y < -5 || segmentGap(from, s, t) > (t.radius || 12) + 2) return;
        var d = distance(from, t);
        if (d < near) { impact = t; near = d; }
      });
      if (!impact) return s.age < 4 && s.y > -20 && s.y < H + 20 && s.x > -20 && s.x < W + 20;
      strike(impact, s.damage, s.color || cast[id].color, contactAt(impact, from,
        Math.atan2(s.vy, s.vx), s.kind === "bookmark" ? "page" : "comet", s.element));
      if (s.kind === "bookmark") {
        var visited = new Set([impact]), last = impact, amount = s.damage;
        var relay = s.relay === undefined ? focus : s.relay;
        var hops = Math.min(6, 2 + Math.floor(power / 6));
        for (var j = 0; j < hops; j++) {
          var next = shotTarget(last, targets, visited, (relay ? 93 : 68) + Math.min(25, power));
          if (!next) break;
          visited.add(next);
          trace("chain", last, next, 1, s.element);
          amount *= 0.76;
          strike(next, amount, cast.patchouli.color, contactAt(next, last,
            Math.atan2(next.y - last.y, next.x - last.x), "page", s.element));
          last = next;
        }
      }
      return false;
    });
  }
  function create(player, enemy, seed, onSound) {
    player = cast[player] ? player : "alice";
    enemy = cast[enemy] ? enemy : "marisa";
    var state = {
      playerId: player,
      enemyId: enemy,
      patternSeed: (seed >>> 0) || 1977,
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
          guardRemaining: OPENING_GUARD,
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
      casting: [],
      hits: 0,
      lives: 3,
      bombs: 2,
      power: 1,
      run: expedition.create(seed),
      foes: [],
      impacts: [],
      auto: false,
      assisted: false,
      pickups: { power: 0, life: 0, clear: 0, shard: 0 },
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
      weapon: newWeapon(),
      recoveryUntil: 0,
      missBurst: null,
      sparks: [],
      items: [],
      spell: null,
      wave: 0,
      focus: false,
    };
    var trackDuration = scoreMap.getTrack(enemy).duration;
    var lastTick = -1,
      lastSection = 0,
      declared = false,
      seedState = seed >>> 0 || 1977,
      dropTimer,
      autoTimer = 0,
      autoInput = { x: 0, y: 0, focus: false };
    function sound(name, character, voice) {
      // Optional presentation hook: a failed audio device cannot stop the game.
      if (onSound) {
        try {
          onSound(name, character || player, voice);
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
    function mergeLoot(stack, drop) {
      stack.amount = (stack.amount || 1) + (drop.amount || 1);
      stack.bundles = (stack.bundles || 1) + (drop.bundles || 1);
    }
    function loot(foe, type, amount, dx) {
      var drop = { type: type, amount: amount, x: foe.x + dx, y: foe.y,
        vx: dx, vy: -15, age: 0 };
      if (state.items.length >= 12) {
        var stack = state.items.find(function (item) { return item.type === type; });
        if (stack) {
          mergeLoot(stack, drop);
          return;
        }
        // Twelve slots and four pickup types guarantee an existing pair.
        var first = {};
        var duplicate = state.items.findIndex(function (item) {
          if (first[item.type]) {
            mergeLoot(first[item.type], item);
            return true;
          }
          first[item.type] = item;
          return false;
        });
        state.items.splice(duplicate, 1);
      }
      state.items.push(drop);
    }
    function damageFoe(foe, amount, color, contact) {
      if (foe.hp <= 0) return false;
      var before = foe.hp, elite = foe.kind === "keeper";
      foe.hp = Math.max(0, before - amount);
      recordImpact(state, foe, contact, color);
      if (contact) sound(contact.heavy ? "hit_heavy" : "hit", player, contact.kind);
      if (foe.hp > 0) {
        if (elite && before > foe.maxHp / 2 && foe.hp <= foe.maxHp / 2) {
          foe.armorBroken = true;
          recordImpact(state, foe, {kind: "armor"}, "#e4b97a");
          sound("armor_break", player);
        }
        return false;
      }
      var debrisColor = elite ? "#e4b97a" : foe.kind === "wing" ? "#cbb1da" : "#92d1d3";
      recordImpact(state, foe, {kind: "foe", heavy: elite}, debrisColor);
      sound(elite ? "armor_break" : "foe_break", player);
      state.run.kills++;
      state.score += elite ? 350 : 120;
      spark(foe.x, foe.y, "#a8eee2", elite ? 9 : 5);
      loot(foe, "shard", elite ? 3 : 1, -4);
      if (elite || state.run.kills % 3 === 0) loot(foe, "power", 1, 5);
      return true;
    }
    function collect(item) {
      var type = item.type;
      var bundles = item.bundles || 1, amount = item.amount || 1;
      state.pickups[type] += bundles;
      sound(type === "shard" ? "score" : type);
      state.score += 300 * bundles;
      var r = state.run, bonusPower = 0, bonusScore = 0;
      if (type === "shard") {
        expedition.addXP(r, amount * (1 + r.mods.salvage));
        if (r.mods.salvage >= 3) {
          r.salvageMeter += amount;
          var recycled = Math.floor(r.salvageMeter / 4);
          r.salvageMeter %= 4;
          bonusPower = Math.min(recycled, MAX_POWER - state.power);
          bonusScore = (recycled - bonusPower) * 500;
          state.power += bonusPower;
          state.score += bonusScore;
        }
        if (r.mods.reactor >= 3) expedition.ignite(state);
      } else if (type === "power") {
        expedition.ignite(state);
        var gain = 1 + r.mods.reactor;
        var useful = Math.min(amount, Math.ceil((MAX_POWER - state.power) / gain));
        state.power = Math.min(MAX_POWER, state.power + useful * gain);
        state.score += (amount - useful) * 1000;
      } else {
        // "clear" is the legacy inventory key for the blue B pickup.
        var stock = type === "life" ? "lives" : "bombs";
        var added = Math.min(amount, 5 - state[stock]);
        state[stock] += added;
        state.score += (amount - added) * (type === "life" ? 2000 : 1000);
      }
      state.pickupNotice = { type: type, age: 0, bonusPower: bonusPower, bonusScore: bonusScore, xp: type === "shard" ? amount * (1 + state.run.mods.salvage) : 0 };
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
    function bullet(x, y, angle, speed, color, shape, curve, visualStyle) {
      if (state.time < state.recoveryUntil || state.bullets.length >= 720) return;
      var writing = curve && curve.inscription;
      state.bullets.push({
        x: x,
        y: y,
        vx: writing ? 0 : Math.cos(angle) * speed,
        vy: writing ? 0 : Math.sin(angle) * speed,
        heading: angle,
        radius: projectileRadius(visualStyle, {
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
          }[shape] || 2.4),
        visualStyle: visualStyle,
        color: color,
        shape: shape || "orb",
        curve: curve && typeof curve === "object" ? curve.turn : curve || 0,
        curveDecay: curve && typeof curve === "object" ? curve.decay : 0,
        motion: typeof curve === "object" ? curve : null,
        age: 0,
        inscribing: Boolean(writing),
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
      if (state.time < state.recoveryUntil || state.lasers.length >= 12) return;
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
      delete state.enemySpell.sight;
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
      if (capture && state.run.mods.guard >= 3) state.run.guardReady = true;
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
      delete state.enemySpell.firingClock;
      delete state.enemySpell.firstPatternTick;
      state.attackReadyAt = state.time + state.rhythm.beatDuration * 4;
      sound(capture ? "capture" : "spell_break", enemy);
    }
    var casterTime = -1, casterOrigins = [];
    function markCaster(x, y, color) {
      var marks = state.casting, now = state.time, last = marks[marks.length - 1];
      if (last && last.x === x && last.y === y && last.time === now) return last.source;
      if (casterTime !== now) {
        casterTime = now;
        casterOrigins = patterns.emitters(state);
      }
      var source = null;
      for (var i = 0; i < casterOrigins.length; i++) {
        var e = casterOrigins[i];
        if (Math.abs(e.x - x) < 0.1 && Math.abs(e.y - y) < 0.1) {
          source = e.id || i;
          break;
        }
      }
      if (marks.length === 12) marks.shift();
      marks.push({x:x, y:y, color:color, time:now, source:source});
      return source;
    }
    var lastVolleySound = -Infinity;
    var cardFire = {
      bullet: function (x, y, angle, speed, color, shape, motion, visualStyle) {
        var n = state.bullets.length;
        bullet(x, y, angle, speed, color, shape, motion, visualStyle);
        if (state.bullets.length > n) {
          // A fan, its multiple familiars, and the rest of this subdivision share one cue.
          if (state.time - lastVolleySound >= 0.29) {
            lastVolleySound = state.time;
            sound("enemy_volley", enemy);
          }
          var source = markCaster(x, y, color);
          if (motion && motion.inscription) state.bullets[n].castSource = source;
        }
      },
      laser: function (x, y, angle, width, warning, duration, color, sweep, anchor, spread) {
        var n = state.lasers.length;
        laser(x, y, angle, width, warning, duration, color, sweep, anchor, spread);
        if (state.lasers.length > n) state.lasers[n].castSource = markCaster(x, y, color);
      },
    };
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
      // The musical declaration anchors the guard across pauses and reloads.
      state.enemySpell.guardRemaining = state.enemySpell.nonspell ? 0 :
        Math.max(0, state.rhythm.sectionStart + OPENING_GUARD - state.time);
      var tick = state.rhythm.tickKey,
        newBeat = tick !== lastTick,
        ready = state.rhythm.halfBeat >= 0 && state.time >= state.attackReadyAt,
        clock = state.enemySpell.firingClock;
      lastTick = tick;
      if (ready) {
        // Begin on a musical subdivision, then integrate its changing tempo.
        // Rank shortens the interval of the original choreography; it never
        // duplicates a whole volley or skips one of a card's source stages.
        if (!clock && newBeat) {
          clock = state.enemySpell.firingClock = {
            ticks: 0,
            emitted: -1,
            origin: state.rhythm.halfBeat,
          };
        } else if (clock) {
          var level = patterns.difficulty(state);
          clock.ticks +=
            (dt * 2 * level.cadence * patterns.phraseRate(state, level)) /
            Math.max(0.12, state.rhythm.beatDuration);
        }
        if (clock && Math.floor(clock.ticks) > clock.emitted) {
          // dt is capped at 1/30 s: at most one native half-beat is crossed.
          // A pause, declaration or durability clear never accrues a backlog.
          clock.emitted++;
          patterns.emit(state, clock.origin + clock.emitted, cardFire);
          state.wave++;
        }
      }
      if (ready && state.enemySpell.firstPatternTick !== undefined)
        patterns.update(state, dt, cardFire);
    }
    function damageBoss(amount) {
      var card = state.enemySpell;
      if (card.nonspell || card.reload > 0 || card.guardRemaining > 0) return;
      var before = card.hp;
      card.hp = Math.max(0, before - amount);
      markDurability(state, state.boss, card, before, cast[enemy].color);
      if (card.hp > 0) return;
      var count = cancelBullets("spell");
      recordImpact(state, state.boss, {kind: "seal"}, cast[enemy].color);
      card.hp = card.echoHp = 0;
      card.reload = 1.1;
      card.clears++;
      if (card.clears === 1) card.baseHp = card.maxHp;
      // Successive breaks within one card buy less breathing room. A new
      // declaration starts with its own opening bar, independent of the build.
      var breaks = Math.min(card.clears, 4);
      card.maxHp = card.baseHp * (1 + breaks * (breaks + 1) / 2);
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
      var p = state.player, target = state.boss;
      var foes = state.foes || [], targetDistance = Infinity;
      foes.forEach(function (foe) {
        var d = Math.abs(foe.x - p.x) + Math.max(0, p.y - foe.y) * 0.4;
        if (foe.hp > 0 && foe.y < p.y && d < targetDistance) {
          target = foe;
          targetDistance = d;
        }
      });
      var goal = { x: target.x, y: player === "alice" ? dollSupportY(state, target, H - 68) : H - 68 };
      var nearest = Infinity;
      state.items.forEach(function (item) {
        var d = distance(item, p);
        if (item.y > 145 && d < 130 && d < nearest) {
          nearest = d;
          goal = { x: item.x, y: clamp(item.y + (item.vy || 0) * 0.20, 145, H - 19) };
        }
      });
      autoInput = pilot.steer({
        player: p, goal: goal, bullets: state.bullets, lasers: state.lasers, foes: foes,
        speed: cast[player].speed, slowSpeed: 56, top: 28,
        previous: autoInput.nextAction, laserPose: laserPose,
      });
      if (player === "alice") steerDollFormation(autoInput, state, target, 56);
      if (autoInput.impact < 0.14 && p.invulnerable < 0.1) bomb();
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
      state.weapon = newWeapon();
      state.missBurst = null;
      state.foes.length = 0;
      state.casting.length = 0;
      state.items.forEach(collect);
      state.items.length = 0;
      state.pickupNotice = state.pressureNotice = state.eventNotice = null;
      state.sparks.length = 0;
      state.impacts.length = 0;
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
      state.weapon = newWeapon();
      state.missBurst = null;
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
      flightBank(p, movedX, movedY, dt);
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
      advanceImpacts(state, dt);
      var bar = state.enemySpell;
      if (bar.echoHp > bar.hp) bar.echoHp = Math.max(bar.hp, bar.echoHp - bar.maxHp * dt * 0.24);
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
      if (state.missBurst && (state.missBurst.age += dt) >= 0.78) state.missBurst = null;
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
      updateScore(dt);
      expedition.updateFoes(state, dt, bullet);
      if (state.auto) expedition.autoChoose(state, MAX_POWER);
      if (state.spell && state.spell.age > 0.05 && state.spell.age < 1.2) {
        var impactTick = Math.floor((state.spell.age - 0.05) / 0.18);
        if (impactTick !== state.spell.impactTick) {
          state.spell.impactTick = impactTick;
          sound("bomb_impact");
          state.enemySpell.eligible = false;
          var damage = 8 + state.power * 1.5;
          (state.foes || []).forEach(function (foe) { if (foe.hp > 0) damageFoe(foe, damage); });
          state.score += damage * 12;
          damageBoss(damage);
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
      var targets = (state.foes || []).concat(state.boss);
      stepWeapons(state, player, state.power, dt, true, targets, function (target, amount, color, contact) {
        if (target !== state.boss) {
          damageFoe(target, amount, color, contact);
          return;
        }
        state.hits++;
        recordImpact(state, target, contact, color);
        sound(contact && contact.heavy ? "hit_heavy" : "hit", player, contact && contact.kind);
        state.score += amount * 12;
        damageBoss(amount);
        spark(target.x, target.y, color, 1);
      }, sound);
      if (state.run.mods.magnet >= 3 && state.time >= state.run.nextVacuum) expedition.vacuum(state);
      state.items = state.items.filter(function (item) {
        item.age += dt;
        var dx = p.x - item.x,
          dy = p.y - item.y,
          d = Math.hypot(dx, dy);
        item.attracted = state.run.vacuumUntil > state.time || d < 36 + 32 * state.run.mods.magnet || (item.type === "shard" && item.age > 1.4);
        if (item.attracted) {
          var travel = Math.min(d, (180 + 55 * state.run.mods.magnet) * dt);
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
            state.player, state.time
          )
        ) {
          spark(b.x, b.y, b.color, 2);
          return false;
        }
        // Slow, oblique ribbons can remain visible for more than twelve seconds.
        // Retire them at the field boundary or through an explicit game event,
        // not an unrelated lifetime cutoff that erases an intact wave mid-flight.
        if (b.x < -28 || b.x > W + 28 || b.y < -60 || b.y > H + 20)
          return false;
        if (b.inscribing) return true;
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
      if (hit && state.run.guardReady) {
        state.run.guardReady = false;
        state.run.guardBreakAt = state.time;
        state.enemySpell.eligible = false;
        p.invulnerable = 0.75;
        state.bullets = state.bullets.filter(function (b) {
          if (distance(b, p) > 32 + b.radius) return true;
          if (state.cancelFlashes.length < 720)
            state.cancelFlashes.push({ x: b.x, y: b.y, age: 0, color: b.color, turn: 0 });
          return false;
        });
      } else if (hit) {
        state.enemySpell.eligible = false;
        state.lives--;
        state.eventNotice = { kind: "miss", age: 0, value: state.lives };
        sound("death");
        state.power = Math.max(1, state.power - 1);
        p.invulnerable = 2.5 + (state.run ? state.run.mods.guard * 0.35 : 0);
        delete state.enemySpell.sight;
        state.missBurst = { x: p.x, y: p.y, age: 0 };
        state.recoveryUntil = state.time + 0.85;
        state.attackReadyAt = Math.max(state.attackReadyAt, state.recoveryUntil);
        var stride = Math.max(1, Math.ceil(state.bullets.length / 96));
        state.bullets.forEach(function (b, i) {
          if (i % stride === 0 && state.cancelFlashes.length < 720)
            state.cancelFlashes.push({ x: b.x, y: b.y, age: 0, color: b.color, turn: i % 4 });
        });
        state.lasers.length = state.bullets.length = state.shots.length = 0;
        state.weapon = newWeapon();
        spark(p.x, p.y, "#f1a6a6", 18);
        if (!state.lives) {
          state.impacts.length = 0;
          state.phase = "over";
        }
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
      chooseUpgrade: function (id) { return expedition.choose(state, id, MAX_POWER); },
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
    elements: elements,
    projectileRadius: projectileRadius,
    maxPower: MAX_POWER,
    declarationDuration: DECLARATION_TIME,
    options: optionsFor,
    newWeapon: newWeapon,
    stepWeapons: stepWeapons,
    recordImpact: recordImpact,
    advanceImpacts: advanceImpacts,
    markDurability: markDurability,
    flightBank: flightBank,
    steerDollFormation: steerDollFormation,
    dollSupportY: dollSupportY,
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
