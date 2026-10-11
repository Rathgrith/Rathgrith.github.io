/* Alice's PCB formations: circular doll casts, split scales and packet waves. */
(function (scope) {
  "use strict";
  var TAU = Math.PI * 2;
  var BLUE = "#939bff",
    RED = "#f18fa7",
    GREEN = "#87e2ac";
  var YELLOW = "#f4ec92",
    CYAN = "#91e5e9",
    LILAC = "#d998e7",
    WHITE = "#f0eefb";

  function age(s) {
    return Math.max(0, (s.enemySpell.age || 0) - 2);
  }
  function bossPosition(s) {
    var id = s.enemySpell.id,
      t = age(s);
    if (id === "tibet" || id === "shanghai") return { x: 120, y: 77 };
    return {
      x: 120 + Math.sin(t * (id === "london" ? 0.42 : 0.28)) * 18,
      y: 77 + Math.sin(t * 0.24) * 6,
    };
  }
  function beatClock(s) {
    var spell = s.enemySpell,
      beat = spell.aliceClockBeat || (s.rhythm && s.rhythm.beatDuration) || 0.5;
    return spell.aliceClockTick === undefined
      ? Math.max(-0.8, Math.min(0, ((spell.age || 0) - 2.15) / beat))
      : spell.aliceClockTick / 2 +
          Math.max(
            0,
            Math.min(0.5, ((spell.age || 0) - spell.aliceClockAge) / beat)
          );
  }
  function packetDolls(s) {
    var id = s.enemySpell.id,
      sourceCount = id === "russia" ? 9 : 6,
      clock = beatClock(s),
      out = [];
    // These are successive summons, not one rank teleported and recoloured.
    // A doll arrives before its own shot and overlaps the next generation while
    // retiring. Interpolate only the current half-beat, since the score changes
    // tempo; dividing total spell age by the current beat would skip sources.
    // Deriving the small live set from this clock bounds its lifetime even
    // after bombs/HP clears; no hidden growing array is retained on the spell.
    for (
      var cast = Math.max(0, Math.floor(clock - sourceCount - 0.7));
      cast <= Math.floor(clock + 0.8);
      cast++
    ) {
      var elapsed = clock - cast,
        enter = Math.max(0, Math.min(1, (elapsed + 0.8) / 0.8)),
        leave = Math.max(0, Math.min(1, (elapsed - sourceCount + 0.3) / 0.7));
      if (enter <= 0 || leave >= 1) continue;
      var wave = Math.floor(cast / sourceCount),
        index = cast % sourceCount,
        flank = index >= 6,
        x = flank ? (wave % 2 ? 27 : 213) : 25 + index * 38,
        y = flank
          ? 108 + (index - 6) * 43
          : 42 + Math.sin(index * 1.7 + wave * 1.1) * 17,
        color =
          id === "russia" ? (wave % 2 ? RED : BLUE) : wave % 2 ? LILAC : CYAN;
      out.push({
        id: id + ":" + cast,
        generation: wave,
        cast: cast,
        x: x,
        y: y - (1 - enter) * (1 - enter) * 10 - leave * leave * 8,
        color: color,
        kind: "doll",
        deployed: true,
        opacity: enter * (1 - leave),
        scale: 0.8 + enter * 0.2,
      });
    }
    return out;
  }
  function emitters(s) {
    var id = s.enemySpell.id,
      t = age(s),
      b = s.boss,
      out = [];
    function doll(x, y, color) {
      out.push({
        id: id + ":orbit:" + out.length,
        x: x,
        y: y,
        color: color,
        kind: "doll",
      });
    }
    if (id === "holland" || id === "russia") {
      return packetDolls(s);
    }
    var count = id === "london" ? 7 : id === "shanghai" ? 4 : 6;
    var radius = id === "tibet" ? 39 : 34;
    // London/Tibet open out and gather again between colour pairs. This is
    // motion of the same ring, not an extra set of invisible firing centres.
    if (id === "london" || id === "tibet") {
      var opening = (1 - Math.cos((Math.max(0, beatClock(s)) * TAU) / 10)) / 2;
      radius = (id === "tibet" ? 29 : 26) + opening * 20;
    }
    for (var d = 0; d < count; d++) {
      var angle =
        (d * TAU) / count -
        Math.PI / 2 +
        t * (id === "shanghai" ? 0.46 : id === "london" ? 0.15 : 0.09);
      doll(
        b.x + Math.cos(angle) * radius,
        b.y + Math.sin(angle) * radius,
        id === "shanghai" ? YELLOW : BLUE
      );
    }
    return out;
  }

  function emit(s, tick, api, level) {
    s.enemySpell.aliceClockTick = tick;
    s.enemySpell.aliceClockAge = s.enemySpell.age || 0;
    s.enemySpell.aliceClockBeat = (s.rhythm && s.rhythm.beatDuration) || 0.5;
    var id = s.enemySpell.id,
      b = s.boss,
      sources = emitters(s);
    var cycle = Math.min(6, level.cycle || 0),
      speed = level.speed;
    // Later rounds tighten spacing slightly; they never change a card's grammar.
    var extra = Math.floor(cycle / 3);
    function circle(x, y, count, angle, velocity, color, shape, motion) {
      for (var i = 0; i < count; i++)
        api.bullet(
          x,
          y,
          angle + (i * TAU) / count,
          velocity,
          color,
          shape,
          motion
        );
    }
    function direction(x, y) {
      return Math.atan2(s.player.y - y, s.player.x - x);
    }

    if (id === "france") {
      // The blue seed divides twice. Keeping the 7 × 7 genealogy creates the
      // separate red rosettes and broad channels of France, not an aimed fan.
      var interval = 14 - Math.min(3, Math.floor(cycle / 2));
      if (tick % interval !== 0) return;
      var wave = Math.floor(tick / interval),
        phase = [0.12, 0.38, -0.18][wave % 3];
      sources.forEach(function (d, i) {
        var a = Math.atan2(d.y - b.y, d.x - b.x) + phase;
        api.bullet(d.x, d.y, a, speed * 0.72, BLUE, "scale", {
          split: {
            at: 0.56,
            count: 7,
            spread: 0.14,
            angleOffset: Math.PI,
            speed: speed * 0.56,
            color: WHITE,
            shape: "scale",
            motion: {
              split: {
                at: 0.6,
                count: 7,
                spread: TAU / 7,
                speed: speed * 0.96,
                color: RED,
                shape: "scale",
              },
            },
          },
        });
      });
      return;
    }

    if (id === "holland" || id === "russia") {
      if (tick % 2 !== 0) return;
      var cast = Math.floor(tick / 2),
        d = sources.find(function (source) {
          return source.cast === cast;
        });
      if (!d || d.opacity <= 0) return;
      // Successive dolls cast a fixed right-facing wheel. A wheel consists of
      // compact six-grain packets, with open sectors between the spokes.
      var rays = id === "holland" ? 7 : 6;
      var color = d.color;
      for (var ray = 0; ray < rays; ray++) {
        var a = (ray * TAU) / rays;
        for (var row = 0; row < 3; row++) {
          for (var column = 0; column < 2; column++) {
            api.bullet(
              d.x,
              d.y,
              a + (column - 0.5) * (0.062 - cycle * 0.002) + row * 0.018,
              speed * (0.61 + row * 0.085),
              color,
              "rice"
            );
          }
        }
      }
      return;
    }

    if (id === "london") {
      var local = tick % 40;
      var green = local === 0 || local === 4;
      var blue = local === 8 || local === 12;
      var yellow = local === 20 || local === 24,
        cyan = local === 28 || local === 32;
      if (!green && !blue && !yellow && !cyan) return;
      var color = green ? GREEN : blue ? BLUE : yellow ? YELLOW : CYAN;
      var early = green || blue;
      var count = (early ? 12 : 16) + extra * 2;
      var phase = Math.floor(tick / 40) * 0.17 + local * 0.035;
      sources.forEach(function (d, i) {
        // Late yellow/cyan rings share a phase: crossings remain readable.
        var a = early ? phase + i * 0.12 : Math.PI / 2 + i * 0.12;
        circle(
          d.x,
          d.y,
          count,
          a,
          speed * (early ? 0.88 : 0.72),
          color,
          "rice"
        );
      });
      return;
    }

    if (id === "tibet") {
      var local = tick % 40;
      if ([0, 4, 8, 12, 20, 24, 28, 32].indexOf(local) < 0) return;
      var colourIndex = local < 8 ? 0 : local < 20 ? 1 : local < 28 ? 2 : 3;
      var color = [GREEN, BLUE, YELLOW, CYAN][colourIndex];
      var turn = colourIndex % 2 ? -0.25 : 0.25;
      sources.forEach(function (d, i) {
        circle(
          d.x,
          d.y,
          14 + extra * 2,
          i * 0.13 + local * 0.045,
          speed * 0.61,
          color,
          "scale",
          { turn: turn, decay: 1.2 }
        );
      });
      return;
    }

    if (id === "shanghai") {
      var local = tick % 16,
        wave = Math.floor(tick / 16);
      if (local === 0) s.enemySpell.shanghaiAim = direction(b.x, b.y);
      var aim =
        s.enemySpell.shanghaiAim === undefined
          ? Math.PI / 2
          : s.enemySpell.shanghaiAim;
      if (local === 0 || local === 8) {
        var gold = local === 0,
          count = gold ? 6 : 5;
        sources.forEach(function (d, i) {
          var radial = Math.atan2(d.y - b.y, d.x - b.x);
          // Four actual doll sources, distinct from Alice's nine large bubbles.
          // Three short scale ribbons per doll, preserving a single wave aim.
          for (var k = 0; k < count + extra; k++) {
            var tangent = (k - (count + extra - 1) / 2) * 0.026;
            var vx =
              Math.cos(aim) * speed * 0.48 +
              Math.cos(radial) * speed * 0.22 -
              Math.sin(radial) * tangent * speed;
            var vy =
              Math.sin(aim) * speed * 0.48 +
              Math.sin(radial) * speed * 0.22 +
              Math.cos(radial) * tangent * speed;
            for (var layer = 0; layer < 3; layer++) {
              api.bullet(
                d.x,
                d.y,
                radial + ((gold ? 1 : -1) * Math.PI) / 2 + tangent,
                speed * (0.32 + layer * 0.025),
                gold ? YELLOW : "#efbd83",
                "scale",
                {
                  turn: gold ? 1.7 : -1.7,
                  redirect: {
                    at: 0.55 + layer * 0.11,
                    angle: Math.atan2(vy, vx) + (layer - 1) * 0.045,
                    speed: Math.hypot(vx, vy),
                  },
                }
              );
            }
          }
        });
        for (var ring = 0; ring < (gold ? 2 : 4); ring++) {
          circle(
            b.x,
            b.y,
            12 + extra * 2,
            Math.PI / 2 + wave * 0.045 + ((ring % 2) * Math.PI) / 12,
            speed * (0.56 + ring * 0.055),
            BLUE,
            "scale"
          );
        }
      }
      if (local === 4 || local === 12) {
        // These are intentionally large to the eye but have small core hitboxes.
        circle(
          b.x,
          b.y,
          9,
          Math.PI / 2 + (local === 12 ? Math.PI / 8 : 0),
          speed * 0.47,
          "#9f92fb",
          "darkorb",
          { turn: local === 4 ? 0.45 : -0.45, decay: 1.1 }
        );
      }
    }
  }
  var api = { emitters: emitters, emit: emit, bossPosition: bossPosition };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  scope.DanmakuAlicePatterns = api;
})(typeof window !== "undefined" ? window : globalThis);
