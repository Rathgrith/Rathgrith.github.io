/* IN Marisa: source choreography, laid stars and timed Spark sequences. */
(function (scope) {
  "use strict";
  var TAU = Math.PI * 2;
  var rainbow = [
    "#ffe47b",
    "#9bea9c",
    "#88e4f1",
    "#929bff",
    "#cc98f4",
    "#efa2d8",
    "#ffaaa5",
  ];
  function age(s) {
    return Math.max(0, (s.enemySpell.age || 0) - 2.15);
  }
  function beat(s) {
    return (s.rhythm && s.rhythm.beatDuration) || 0.46;
  }
  function source(x, y, color, angle) {
    return { x: x, y: y, color: color, angle: angle, kind: "familiar" };
  }
  function bossPosition(s) {
    var id = s.enemySpell.id;
    if (id === "stardust") return { x: 120, y: 142 };
    if (id === "milky" || id === "asteroid") return { x: 120, y: 94 };
    if (id === "nondirectional") return { x: 120, y: 104 };
    // The final spell changes firing position in the breath between beams.
    return {
      x: id === "finalspark" ? s.enemySpell.sparkTargetX || 120 : 120,
      y: id === "finalspark" ? 62 : 54,
    };
  }
  function stardustSource(s, i, time) {
    // Seven broad, interlocking curls fill the playfield. Their trails are
    // laid in space; the stars themselves never orbit Marisa indefinitely.
    var base = (i * TAU) / 7;
    var phase = time * 0.18;
    var radius = 62;
    var curl = base - time * 1.72;
    return source(
      120 + Math.cos(base + phase) * radius + Math.cos(curl) * 39,
      154 + Math.sin(base + phase) * radius * 1.32 + Math.sin(curl) * 53,
      rainbow[i],
      base + phase
    );
  }
  function emitters(s) {
    var id = s.enemySpell.id;
    var t = age(s);
    var b = s.boss;
    var result = [];
    var i, a;
    if (id === "stardust") {
      for (i = 0; i < 7; i++) result.push(stardustSource(s, i, t));
    } else if (id === "milky" || id === "asteroid") {
      for (i = 0; i < 5; i++) {
        a = (i * TAU) / 5 - t * 0.34 - Math.PI / 2;
        result.push(
          source(b.x + Math.cos(a) * 65, b.y + Math.sin(a) * 57, rainbow[i], a)
        );
      }
    } else if (id === "nondirectional") {
      // Normal has ten familiars, in two crossing five-source groups. The
      // white source glows overlap in pairs; treating each pair as one origin
      // loses the counter-rotating half of the star/laser lattice.
      for (i = 0; i < 10; i++) {
        var group = Math.floor(i / 5);
        var rate = group ? 0.37 : -0.43;
        a =
          ((i % 5) * TAU) / 5 + (group * Math.PI) / 5 + t * rate - Math.PI / 2;
        var familiar = source(
          b.x + Math.cos(a) * 54,
          b.y + Math.sin(a) * 54,
          rainbow[i % 5],
          a
        );
        familiar.group = group;
        familiar.rate = rate;
        result.push(familiar);
      }
    } else {
      result.push(source(b.x, b.y + 8, "#fff0a8", Math.PI / 2));
    }
    return result;
  }
  function emit(s, tick, api, level) {
    var id = s.enemySpell.id;
    var t = age(s);
    var quarter = beat(s);
    var step = quarter / 2;
    var b = s.boss;
    var p = s.player;
    var cycle = Math.min(6, level.cycle || 0);
    // Preserve the original arm counts. Later rounds tighten speed and cadence,
    // rather than silently changing a named spell into a generic dense fan.
    var rank = 1 + cycle * 0.04;
    var sources = emitters(s);
    var aim = Math.atan2(p.y - b.y, p.x - b.x);
    var i, j, a, d;
    function ring(n, rotation, velocity, color, shape, offset) {
      for (var arm = 0; arm < n; arm++) {
        var direction = rotation + (arm * TAU) / n;
        var distance = offset || 0;
        api.bullet(
          b.x + Math.cos(direction) * distance,
          b.y + Math.sin(direction) * distance,
          direction,
          velocity,
          color,
          shape || "bigstar"
        );
      }
    }
    if (id === "stardust") {
      var samples = cycle >= 3 ? 3 : 2;
      for (i = 0; i < 7; i++) {
        for (j = 0; j < samples; j++) {
          var sampleTime = Math.max(0, t - step + (step * (j + 1)) / samples);
          d = stardustSource(s, i, sampleTime);
          a = Math.atan2(d.y - 154, d.x - 120);
          // Short placement delay, then a straight outward escape. A finite
          // release is essential: looping bullet velocity caused the old bug.
          api.bullet(d.x, d.y, a, 5, d.color, "star", {
            release: { at: 1.35, angle: a, speed: 33 * rank },
          });
        }
      }
      return;
    }
    if (id === "milky" || id === "asteroid") {
      var hard = id === "asteroid";
      // Alternating red/blue radial middle stars are the defining foreground;
      // the slower fixed 3-way streams arrive later from the orbiting options.
      var phase = Math.sin((tick + 1) * 12.9898) * 43758.5453;
      phase = (phase - Math.floor(phase)) * TAU;
      ring(
        hard ? 17 : 9,
        phase,
        (hard ? 61 : 51) * rank,
        tick % 2 ? "#939aff" : "#f0a0b1",
        "bigstar"
      );
      if (tick % 2 === 0 || (hard && cycle >= 2 && tick % 4 === 1)) {
        sources.forEach(function (familiar) {
          for (var ray = -1; ray <= 1; ray++) {
            api.bullet(
              familiar.x,
              familiar.y,
              familiar.angle + ray * 0.24,
              (hard ? 48 : 41) * rank,
              familiar.color,
              "star"
            );
          }
        });
      }
      return;
    }
    if (id === "nondirectional") {
      // The two groups charge in turn, briefly overlapping during the handoff.
      // A group's old five beams expire before its next charge, keeping the
      // complete ten-source sequence inside the engine's twelve-laser pool.
      var laserSchedule = s.enemySpell.nonDirectionalLasers;
      if (!laserSchedule) {
        laserSchedule = s.enemySpell.nonDirectionalLasers = {
          available: [0, 0],
          pending: [false, false],
        };
      }
      if (tick % 6 === 0) {
        laserSchedule.pending[Math.floor(tick / 6) % 2] = true;
      }
      for (var laserGroup = 0; laserGroup < 2; laserGroup++) {
        if (
          !laserSchedule.pending[laserGroup] ||
          s.enemySpell.age < laserSchedule.available[laserGroup]
        )
          continue;
        var laserWarning = Math.max(0.8, quarter * 2.1);
        // Include the engine's 0.25-second fade in the slot budget.
        var laserDuration = Math.max(0.05, quarter * 6 - laserWarning - 0.3);
        laserSchedule.pending[laserGroup] = false;
        // The next six beats may be shorter than these six beats. Reuse a
        // group only after its *actual* lifetime, with a small update margin;
        // otherwise a tempo change can leave fifteen beams competing for slots.
        laserSchedule.available[laserGroup] =
          s.enemySpell.age + laserWarning + laserDuration + 0.25 + 0.04;
        sources.forEach(function (familiar) {
          if (familiar.group !== laserGroup) return;
          api.laser(
            familiar.x,
            familiar.y,
            familiar.angle,
            4.5,
            laserWarning,
            laserDuration,
            familiar.color,
            0,
            {
              kind: "orbit",
              cx: b.x,
              cy: b.y,
              rx: 54,
              ry: 54,
              phase: familiar.angle,
              rate: familiar.rate,
            },
            0
          );
        });
      }
      for (i = 0; i < sources.length; i++) {
        for (j = 0; j < 2; j++) {
          var lag = (step * j) / 2;
          a = sources[i].angle - lag * sources[i].rate;
          var inward = a + Math.PI;
          var velocity = 65 * rank;
          api.bullet(
            b.x + Math.cos(a) * 54 + Math.cos(inward) * velocity * lag,
            b.y + Math.sin(a) * 54 + Math.sin(inward) * velocity * lag,
            inward,
            velocity,
            rainbow[(tick + i + j) % 7],
            "bigstar"
          );
        }
      }
      if (tick % 4 === 0) {
        for (i = -1; i <= 1; i++) {
          api.bullet(
            b.x,
            b.y,
            aim + i * 0.2,
            50 * rank,
            rainbow[(Math.floor(tick / 4) + i + 1) % rainbow.length],
            "star"
          );
        }
      }
      return;
    }
    if (id === "master") {
      // N's 11-way *full circle*, never an aimed fan. Each wave changes colour;
      // the slow stars remain relevant while the next Spark is being charged.
      ring(11, tick * 0.137, 44 * rank, rainbow[tick % 7], "bigstar");
      if (tick % 24 === 0) {
        api.laser(
          b.x,
          b.y,
          tick === 0 ? Math.PI / 2 : aim,
          15,
          Math.max(1, quarter * 3),
          quarter * 6,
          "#fff1c2",
          0,
          "boss",
          0.2
        );
      }
      return;
    }
    if (id === "finalspark") {
      var part = tick % 24;
      var pass = Math.floor(tick / 24);
      var hand = pass % 2 ? -1 : 1;
      if (part === 18) s.enemySpell.sparkTargetX = pass % 2 ? 76 : 164;
      // Exactly 36 successive 8-way rings form a red/blue spiral. Three
      // sub-beat samples retain smooth ribbons on the music-quantized scheduler.
      if (part < 12) {
        for (j = 0; j < 3; j++) {
          var row = part * 3 + j;
          var speed = 48 * rank;
          var elapsed = (step * (2 - j)) / 3;
          ring(
            8,
            hand * (row * 0.066 + 0.1) + Math.PI / 8,
            speed,
            row % 2 ? "#a3a4ff" : "#f1a4b5",
            "bigstar",
            speed * elapsed
          );
        }
      }
      if (part === 0) {
        api.laser(
          b.x,
          b.y,
          // A charge locks in any direction, including above Marisa. Clamping
          // to the lower half-plane invalidates the original over-boss lure.
          aim - hand * 0.16,
          23,
          Math.max(1.05, quarter * 3),
          quarter * 6,
          "#ece4ff",
          hand * 0.065,
          "boss",
          0.29
        );
      }
    }
  }
  var exported = { emitters: emitters, emit: emit, bossPosition: bossPosition };
  if (typeof module !== "undefined" && module.exports)
    module.exports = exported;
  else scope.DanmakuMarisaPatterns = exported;
})(typeof window !== "undefined" ? window : globalThis);
