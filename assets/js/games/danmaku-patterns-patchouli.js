(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.DanmakuPatchouliPatterns = factory();
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  var TAU = Math.PI * 2;
  var colours = {
    fire: "#ff717a",
    water: "#8fa8ff",
    wood: "#b4edac",
    earth: "#e8e58d",
    metal: "#e0dcec",
  };

  function unit(seed) {
    var n = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return n - Math.floor(n);
  }

  // The Extra stones form a fixed five-point bank. They do not orbit Patchouli.
  function emitters(s) {
    if (s.enemySpell.id !== "philosopher") return [];
    var b = s.boss;
    return [
      {
        x: b.x - 82,
        y: b.y + 25,
        color: colours.water,
        glyph: "水",
        kind: "element",
      },
      {
        x: b.x - 41,
        y: b.y + 14,
        color: colours.earth,
        glyph: "土",
        kind: "element",
      },
      {
        x: b.x,
        y: b.y + 44,
        color: colours.fire,
        glyph: "火",
        kind: "element",
      },
      {
        x: b.x + 41,
        y: b.y + 14,
        color: colours.wood,
        glyph: "木",
        kind: "element",
      },
      {
        x: b.x + 82,
        y: b.y + 25,
        color: colours.metal,
        glyph: "金",
        kind: "element",
      },
    ];
  }

  function bossPosition(s) {
    // EoSD's basic element spells originate at the boss, not from extra options.
    // Undine relocates between volleys; do not drag a laser after it is aimed.
    if (s.enemySpell.id === "undine") {
      var water = s.enemySpell.patchouli;
      return { x: (water && water.waterTarget) || 120, y: 59 };
    }
    return { x: 120, y: 57 };
  }

  function emit(s, tick, api, level) {
    var id = s.enemySpell.id;
    var b = s.boss;
    var p = s.player;
    var beat = s.rhythm.beatDuration;
    var speed = level.speed;
    var round = Math.min(6, level.cycle || 0);
    var n, i, j, a, v, x, y;
    var aim = Math.atan2(p.y - b.y, p.x - b.x);
    var state = s.enemySpell.patchouli || (s.enemySpell.patchouli = {});

    function ring(x, y, count, offset, v, colour, shape, motion) {
      for (var k = 0; k < count; k++) {
        var angle = offset + (k * TAU) / count;
        api.bullet(
          x,
          y,
          angle,
          v,
          colour,
          shape,
          typeof motion === "function" ? motion(angle, k) : motion
        );
      }
    }

    if (id === "agni") {
      // Two speeds in each irregular ring: the fast arc overtakes the slow arc.
      // Angular momentum eases away so fire escapes rather than orbiting forever.
      if (tick % 3) return;
      n = 20 + Math.floor(round / 3) * 2;
      var wave = tick / 3;
      var phase = wave * 0.36 + Math.sin(wave * 0.79) * 0.22;
      for (j = 0; j < 2; j++) {
        for (i = 0; i < n; i++) {
          a = phase + (i * TAU) / n + j * 0.066;
          v = speed * (j ? 0.96 : 0.66) * (1 + 0.07 * Math.sin(i * 2.4 + wave));
          api.bullet(b.x, b.y, a, v, colours.fire, "flame", {
            turn: 0.72 + 0.08 * Math.sin(i * 1.8),
            decay: 1.18,
          });
        }
      }
      return;
    }

    if (id === "undine") {
      var step = tick % 32;
      if (step === 28)
        state.waterTarget = [120, 148, 96, 132][
          (Math.floor(tick / 32) + 1) % 4
        ];
      if (step === 0) {
        state.waterAim = aim;
        // The three thin lasers precede the large water waves, rather than
        // alternating unrelated side lasers throughout the card.
        for (i = -1; i <= 1; i++) {
          api.laser(
            b.x,
            b.y,
            aim + i * 0.24,
            2.5,
            beat * 2.4 * level.warning,
            beat * 2.8,
            "#9dd9ff",
            0
          );
        }
      }
      if (step < 6) {
        if (step % 2 === 0) {
          ring(
            b.x,
            b.y - 16,
            22,
            state.waterAim + step * 0.12,
            speed * 0.78,
            colours.water,
            "pellet"
          );
        }
      } else if (step < 28) {
        // A locked odd aimed fan repeats long enough to encourage streaming.
        // Re-aiming every bead would turn the original pattern into a trap.
        if (step % 4 === 2) state.waterAim = aim;
        if (step % 2 === 0) {
          n = 11 + Math.floor(round / 3) * 2;
          for (i = 0; i < n; i++) {
            a = state.waterAim + (i - (n - 1) / 2) * 0.196;
            api.bullet(b.x, b.y, a, speed * 0.86, "#9697ff", "orb");
          }
        }
        for (i = -1; i <= 1; i++) {
          api.bullet(
            b.x,
            b.y,
            aim + i * 0.19,
            speed * 0.43,
            "#6792ff",
            "bubble"
          );
        }
      }
      return;
    }

    if (id === "sylphy") {
      // The Normal card has one wind direction: right to lower left. Its two
      // crossing sheets come from the boss and the right edge, not both edges.
      n = 5 + Math.floor(round / 3);
      for (i = 0; i < n; i++) {
        a = -Math.PI / 2 + (unit(tick * 23 + i) - 0.5) * 2.3;
        api.bullet(b.x, b.y, a, speed * 0.22, colours.wood, "rice", {
          redirect: {
            at: 0.36 + unit(tick * 41 + i) * 0.18,
            angle: 1.92 + unit(tick * 31 + i) * 0.38,
            speed: speed * 0.8,
          },
        });
        y = 18 + unit(tick * 17 + i * 7) * 222;
        api.bullet(
          246,
          y,
          2.55 + unit(tick * 19 + i) * 0.25,
          speed * (0.8 + unit(tick * 29 + i) * 0.14),
          colours.wood,
          "rice"
        );
      }
      return;
    }

    if (id === "trilithon") {
      // Normal's yellow rocks slow to a halt, then scatter with a fresh heading.
      // Their changes happen at an age, not an artificial common y-coordinate.
      if (tick % 2) return;
      n = 20 + Math.floor(round / 2) * 2;
      for (i = 0; i < n; i++) {
        a = (i * TAU) / n + tick * 0.27;
        var scatter = Math.PI / 2 + (unit(tick * 67 + i * 19) - 0.5) * 2.9;
        api.bullet(
          b.x,
          b.y,
          a,
          speed * (1.05 + unit(tick * 11 + i) * 0.45),
          colours.earth,
          "pellet",
          {
            decelerate: { from: 0.22, to: 0.96, speed: 0 },
            redirect: {
              at: 1.2 + unit(tick * 5 + i) * 0.3,
              angle: scatter,
              speed: speed * (0.7 + unit(i * 31 + tick) * 0.34),
            },
          }
        );
      }
      return;
    }

    if (id === "flare") {
      // Royal Flare's red beads describe offset expanding loops. A velocity
      // circle with a moving centre makes the broad lobes and crossing seams;
      // ordinary equal-speed concentric rings lose those distinctive pockets.
      if (tick % 4) return;
      var loop = tick / 4;
      var direction = Math.PI / 2 + Math.sin(loop * 0.62) * 0.65;
      n = 28 + Math.floor(round / 3) * 2;
      for (j = 0; j < 2; j++) {
        var centreAngle = direction + (j ? 0.47 : -0.47);
        var cx = Math.cos(centreAngle) * speed * 0.9;
        var cy = Math.sin(centreAngle) * speed * 0.9;
        for (i = 0; i < n; i++) {
          a = (i * TAU) / n + loop * 0.084 + j * 0.09;
          var vx = cx + Math.cos(a) * speed * 0.31;
          var vy = cy + Math.sin(a) * speed * 0.31;
          api.bullet(
            b.x,
            b.y,
            Math.atan2(vy, vx),
            Math.hypot(vx, vy),
            colours.fire,
            "orb",
            { turn: j ? -0.036 : 0.036, decay: 0.35 }
          );
        }
      }
      return;
    }

    if (id === "philosopher") {
      var stones = emitters(s);
      var phaseTick = tick % 16;
      var phaseWave = Math.floor(tick / 16);
      // Independent periods overlap all five rice colours. Cycling one element
      // at a time removed the defining layering of the original Extra spell.
      var water = stones[0];
      if (phaseTick % 4 === 0) {
        var waterAim = Math.atan2(p.y - water.y, p.x - water.x);
        for (j = 0; j < 2; j++) {
          for (i = -3; i <= 3; i++) {
            api.bullet(
              water.x,
              water.y,
              waterAim + i * 0.19,
              speed * (0.88 + j * 0.1),
              colours.water,
              "rice"
            );
          }
        }
      }
      var earth = stones[1];
      if (phaseTick === 2 || phaseTick === 10) {
        for (i = 0; i < 18 + Math.floor(round / 2); i++) {
          a =
            Math.atan2(p.y - earth.y, p.x - earth.x) +
            (unit(tick * 13 + i) - 0.5) * 2.1;
          api.bullet(earth.x, earth.y, a, speed * 0.76, colours.earth, "rice", {
            decelerate: { from: 0.22, to: 0.8, speed: 0 },
            redirect: {
              at: 1.05,
              angle: Math.PI / 2 + (unit(tick * 31 + i * 7) - 0.5) * 2.8,
              speed: speed * 0.61,
            },
          });
        }
      }
      var fire = stones[2];
      if (phaseTick === 0 || phaseTick === 8) {
        var offset = unit(phaseWave * 13 + phaseTick) * TAU;
        ring(
          fire.x,
          fire.y,
          24 + Math.floor(round / 3) * 2,
          offset,
          speed * 0.61,
          colours.fire,
          "rice"
        );
        ring(
          fire.x,
          fire.y,
          24 + Math.floor(round / 3) * 2,
          offset + 0.07,
          speed * 0.69,
          colours.fire,
          "rice"
        );
      }
      var wood = stones[3];
      if (phaseTick === 4 || phaseTick === 12) {
        ring(
          wood.x,
          wood.y,
          22 + Math.floor(round / 2),
          tick * 0.15,
          speed * 0.34,
          colours.wood,
          "rice",
          function () {
            return { redirect: { at: 0.7, angle: 2.16, speed: speed * 0.66 } };
          }
        );
      }
      var metal = stones[4];
      if (phaseTick === 6 || phaseTick === 14) {
        var metalAim = Math.atan2(p.y - metal.y, p.x - metal.x);
        ring(
          metal.x,
          metal.y,
          22 + Math.floor(round / 2),
          0,
          speed * 0.56,
          colours.metal,
          "rice",
          {
            decelerate: { from: 0.3, to: 0.85, speed: 0 },
            redirect: { at: 1.12, angle: metalAim, speed: speed * 0.7 },
          }
        );
      }
    }
  }

  return { emitters: emitters, emit: emit, bossPosition: bossPosition };
});
