/* Alice's PCB formations: circular doll casts, split scales and packet waves. */
(function (scope) {
  "use strict";
  var TAU = Math.PI * 2;
  var BLUE = "#939bff",
    RED = "#f18fa7",
    GREEN = "#87e2ac";
  var YELLOW = "#f4ec92",
    CYAN = "#91e5e9",
    LILAC = "#d998e7";

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
  function emitters(s) {
    var id = s.enemySpell.id,
      t = age(s),
      b = s.boss,
      out = [];
    function doll(x, y, color) {
      out.push({ x: x, y: y, color: color, kind: "doll" });
    }
    if (id === "russia") {
      // The Hard variant keeps its red and blue doll trains on opposite sides.
      for (var i = 0; i < 6; i++) {
        var side = i < 3 ? -1 : 1,
          row = i % 3;
        var travel = (t * 14 + row * 43) % 142;
        doll(
          120 + side * (84 - 12 * Math.sin((travel * Math.PI) / 142)),
          30 + travel,
          side < 0 ? RED : BLUE
        );
      }
      return out;
    }
    var count = id === "london" ? 7 : id === "shanghai" ? 8 : 6;
    var radius = id === "holland" ? 63 : id === "tibet" ? 39 : 34;
    for (var d = 0; d < count; d++) {
      var angle =
        (d * TAU) / count -
        Math.PI / 2 +
        t * (id === "holland" ? 0.2 : id === "london" ? 0.15 : 0.09);
      doll(
        b.x + Math.cos(angle) * radius,
        b.y + Math.sin(angle) * radius,
        id === "shanghai"
          ? YELLOW
          : id === "holland"
            ? d % 2
              ? CYAN
              : LILAC
            : BLUE
      );
    }
    return out;
  }

  function emit(s, tick, api, level) {
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
        var a = (i * TAU) / sources.length + phase;
        api.bullet(d.x, d.y, a, speed * 0.72, BLUE, "scale", {
          split: {
            at: 0.56,
            count: 7,
            spread: TAU / 7,
            speed: speed * 0.56,
            color: BLUE,
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
        index = cast % sources.length;
      // Successive dolls cast a fixed right-facing wheel. A wheel consists of
      // compact six-grain packets, with open sectors between the spokes.
      var d = sources[index],
        rays = id === "holland" ? 7 : 6;
      var color =
        id === "russia" ? d.color : Math.floor(cast / 6) % 2 ? CYAN : LILAC;
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
      var blue = local === 0 || local === 4 || local === 8 || local === 12;
      var yellow = local === 20 || local === 24,
        cyan = local === 28 || local === 32;
      if (!blue && !yellow && !cyan) return;
      var color = blue ? BLUE : yellow ? YELLOW : CYAN;
      var count = (blue ? 12 : 16) + extra * 2;
      var phase = Math.floor(tick / 40) * 0.17 + local * 0.035;
      sources.forEach(function (d, i) {
        // Late yellow/cyan rings share a phase: crossings remain readable.
        var a = blue ? phase + i * 0.12 : Math.PI / 2 + i * 0.12;
        circle(d.x, d.y, count, a, speed * (blue ? 0.88 : 0.72), color, "rice");
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
          count = gold ? 11 : 9;
        sources.forEach(function (d, i) {
          var radial = Math.atan2(d.y - b.y, d.x - b.x);
          // Adjacent dolls draw a linked polygon of scales. The whole necklace
          // drifts along one locked aim rather than retargeting every grain.
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
            api.bullet(
              d.x,
              d.y,
              Math.atan2(vy, vx),
              Math.hypot(vx, vy),
              gold ? YELLOW : "#efbd83",
              "scale"
            );
          }
        });
        circle(
          b.x,
          b.y,
          24 + extra * 4,
          Math.PI / 2 + wave * 0.045,
          speed * 0.66,
          BLUE,
          "scale"
        );
      }
      if (local === 4 || local === 12) {
        // These are intentionally large to the eye but have small core hitboxes.
        circle(
          b.x,
          b.y,
          8,
          Math.PI / 2 + (local === 12 ? Math.PI / 8 : 0),
          speed * 0.47,
          "#9f92fb",
          "darkorb"
        );
      }
    }
  }
  var api = { emitters: emitters, emit: emit, bossPosition: bossPosition };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  scope.DanmakuAlicePatterns = api;
})(typeof window !== "undefined" ? window : globalThis);
