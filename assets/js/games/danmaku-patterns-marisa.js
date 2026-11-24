/* Marisa's backyard observatory: bait an exposure, bank a shot, split a spectrum. */
(function (scope) {
  "use strict";
  var gold = "#ffd57c",
    mint = "#98ecd5",
    violet = "#c4a3fa",
    white = "#fff2c7",
    down = Math.PI / 2;
  var cards = [
    {
      id: "exposure",
      name: "露光「盗み撮りの彗星」",
      interlude: "絞りの試し打ち",
    },
    {
      id: "bankshot",
      cue: "手球をよけ三角の切れ目へ",
      name: "反射「夜空のビリヤード」",
      interlude: "月面の試走",
    },
    {
      id: "spectrograph",
      name: "分光「三色の指名手配」",
      interlude: "割れた分光板",
    },
    {
      id: "slingshot",
      cue: "先頭の彗星の後ろを渡る",
      name: "航路「箒に借りた重力」",
      interlude: "向かい風の測量",
    },
    {
      id: "shutter",
      cue: "白枠が止まったら横へ",
      name: "閃写「星を逃がす暗室」",
      interlude: "感光紙の切れ端",
    },
    {
      id: "parallax",
      name: "視差「真夜中の二重像」",
      interlude: "消え残る星座",
    },
  ];
  function bossPosition(s) {
    var t = s.enemySpell.age;
    return { x: 120 + 48 * Math.sin(t * 0.58), y: 53 + 9 * Math.sin(t * 0.41) };
  }
  function emitters(s) {
    var id = s.enemySpell.id,
      t = s.enemySpell.age;
    var d = 55 + 16 * Math.sin(t * 0.46);
    function lens(x, y, color) {
      return { x: x, y: y, color: color, kind: "familiar" };
    }
    if (id === "slingshot") return [lens(83, 103, gold), lens(157, 103, mint)];
    if (id === "parallax") return [lens(42, 65, gold), lens(198, 65, mint)];
    if (id === "bankshot") return [lens(17, 56, mint), lens(223, 70, violet)];
    if (id === "spectrograph") return [lens(s.boss.x, s.boss.y + 12, white)];
    return [
      lens(120 - d, 52 + 10 * Math.sin(t), gold),
      lens(120 + d, 64 - 10 * Math.sin(t), mint),
    ];
  }
  // The leading exposure, billiard ball, and gate spokes have different jobs.
  // Keep the film grain small so a player can read the outline of the photograph.
  function exposureGrain(i, count) { return i === (count >> 1) ? "flare" : "smallorb"; }
  function exposedComet(i, count) { return i === (count >> 1) ? "comet" : "stardust"; }
  function bankBall(i, count) { return i === (count >> 1) ? "largeorb" : "prism"; }
  function gateBlade(i, count) {
    return i % Math.max(1, Math.round(count / 6)) === 0 ? "saber" : "stardust";
  }
  function interlude(s, tick, api, d, tools) {
    if (tick % 4) return;
    var pass = Math.floor(tick / 4),
      lenses = emitters(s),
      lens = lenses[pass % lenses.length];
    tools.fan(
      api,
      lens,
      tools.bearing(lens, s.player),
      6 + d.density,
      0.72,
      d.speed * 0.75,
      gold,
      "star", null, null, exposureGrain
    );
    if ((pass + d.stage) % 3 === 0)
      tools.fan(
        api,
        s.boss,
        down + Math.sin(pass * 0.65) * 0.28,
        9 + d.density,
        1.8,
        d.speed * 0.9,
        violet,
        "smallstar", null, null, "stardust"
      );
  }
  function constellation(s, tick, api, d, tools, lenses) {
    if (s.time - s.rhythm.sectionStart < 3.2) return false;
    var id = s.enemySpell.id, turn = Math.floor(tick / 16);
    var source, curve, lobes, angle, phase, lane, spread, count = 30, color = gold;
    if (id === "exposure" && tick % 16 === 7) {
      // The shutter leaves a star-shaped flare beside the memorised exposure.
      source = lenses[turn % 2]; curve = "rose"; lobes = 5; spread = 30;
      angle = tools.bearing(source, s.enemySpell.exposure || s.player) - down; phase = d.part * 0.35;
    } else if (id === "bankshot" && tick % 18 === 6) {
      source = s.boss; curve = "hypo"; lobes = 3; spread = 34;
      angle = turn % 2 ? -0.38 : 0.38; phase = d.part * 0.48; color = mint;
    } else if (id === "spectrograph" && tick % 16 === 8) {
      source = lenses[0]; curve = "epi"; lobes = 3 + d.part; spread = 34;
      angle = turn * 0.32; phase = turn * 0.17; color = [mint, gold, violet][turn % 3];
    } else if (id === "shutter" && tick % 24 === 9) {
      source = s.boss; curve = "lissajous"; lobes = 3; spread = 36; count = 34;
      angle = 0.34 * d.part; phase = turn * 0.24;
      var index = Math.floor(tick / 12) % 4;
      lane = { x: (d.part ? [62, 120, 177, 120] : [52, 114, 173, 114])[index], y: 308, halfWidth: 28 };
    } else return false;
    tools.figure(api, source, { curve: curve, lobes: lobes, count: count, angle: angle,
      phase: phase, spread: spread, fall: 55 + d.stage * 1.4, depth: 0.75,
      gap: (turn % 4) / 4, gapWidth: 0.14, color: color, shape: "smallstar", lane: lane,
      visualStyle: {exposure: "stardust", bankshot: "smallorb", spectrograph: "prism", shutter: "smallorb"}[id] });
    return true;
  }
  // All the grains leave an actual lens. Their velocities bring an optical
  // outline into focus at the given plane, then carry it through the playfield.
  function project(api, source, x, y, flight, color, shape, material) {
    var dx = x - source.x, dy = y - source.y;
    api.bullet(source.x, source.y, Math.atan2(dy, dx), Math.hypot(dx, dy) / flight,
      color, shape, null, material);
  }
  function aperture(s, tick, api, d, lenses) {
    var plate = s.enemySpell.exposure;
    if (!plate || tick % 8 !== 1) return;
    var bar = Math.floor(tick / 8);
    // A print near the edge opens back towards the middle. The corners of
    // both blades mark the same clear slit before the two photographed comets.
    var offset = plate.x < 58 ? 1 : plate.x > 182 ? -1 : bar % 2 ? -1 : 1;
    var gate = Math.min(200, Math.max(40, plate.x + 48 * offset));
    var half = 21, flight = 2.16;
    lenses.forEach(function (lens, side) {
      var edge = side ? 245 : -5;
      var lip = gate + (side ? half : -half);
      var grains = Math.max(4, Math.ceil(Math.abs(edge - lip) / (9 - .5 * d.density)));
      for (var i = 0; i <= grains; i++) {
        var u = i / grains, x = lip + (edge - lip) * u;
        var y = 251 - 33 * Math.min(1, 3 * u) + 17 * u;
        var material = i === 0 ? "prism" : i === grains ? "flare" : "stardust";
        project(api, lens, x, y, flight, lens.color, "smallstar", material);
        // A short ruled bevel catches the light on the inner edge of each blade.
        if (i > 0 && u <= .40) project(api, lens, x, y - 10 + 18 * u, flight,
          white, "smallstar", "smallorb");
      }
    });
  }
  function chromaticCaustic(tick, api, d, prism) {
    if (tick % 16 !== 2) return;
    var bar = Math.floor(tick / 16), gate = [51, 95, 151, 189, 144, 94][bar % 6];
    var hand = bar % 2 ? -1 : 1, samples = 17 + d.density;
    [mint, gold, violet].forEach(function (ink, band) {
      var separation = band - 1;
      for (var i = 0; i <= samples; i++) {
        var u = 2 * i / samples - 1;
        // The colours separate in the wings and cross at the cusp. The
        // exposed line folds in the opposite direction in the second movement.
        var x = 120 + 128 * u + separation * (6 + 5 * u) * hand;
        if (Math.abs(x - gate) < 18) continue;
        var arch = (d.part === 1 ? -1 : 1) * 40 * Math.pow(Math.abs(u), 2/3);
        var y = 228 + arch + hand * 19 * u + separation * (5 + 12 * u);
        var material = Math.abs(x - gate) < 34 ? "prism" : ["stardust", "smallorb", "stardust"][band];
        project(api, prism, x, y, [2.24, 2.08, 1.96][d.part], ink, "smallstar", material);
      }
    });
  }
  function occultation(tick, api, d, lenses) {
    var bar = Math.floor(tick / 8);
    if (tick % 8 !== 6 || bar % 2) return;
    var side = (bar + d.part) % 2, lens = lenses[side], hand = side ? -1 : 1;
    var centre = [60, 99, 179, 149, 88, 179][bar % 6], count = 18 + 2 * d.density;
    var flight = [2.16, 1.98, 2.08][d.part];
    for (var i = 0; i <= count; i++) {
      var u = 2 * i / count - 1, a = u * 2.15;
      var x = centre + hand * (47 * Math.cos(a) + 9 * u);
      var y = 247 + 42 * Math.sin(a) + hand * 8 * u;
      project(api, lens, x, y, flight, lens.color, "smallstar",
        i === 0 || i === count ? "prism" : "stardust");
      // The unlit limb has an opening along its belly. As the illuminated
      // edge passes, the player can turn through this break and trail the limb.
      if (Math.abs(u) < .34 || i === 0 || i === count) continue;
      project(api, lens, x - hand * 29 * (1 - u * u), y, flight,
        violet, "smallstar", "smallorb");
    }
  }
  function cushionRack(tick, api, d, lenses) {
    var beat = tick % 18, bar = Math.floor(tick / 18);
    if (beat !== 7 && beat !== 9) return false;
    var side = bar % 2, rail = side ? 235 : 5, lens = lenses[side];
    var hand = side ? -1 : 1, centre = [81, 156, 112, 174][bar % 4];
    // Unfold the table across the near cushion. Every ball actually hits that
    // cushion; the apparent positions after reflection describe the rack.
    function bank(x, y, flight, material, tint) {
      var dx = 2 * rail - x - lens.x, dy = y - lens.y;
      api.bullet(lens.x, lens.y, Math.atan2(dy, dx), Math.hypot(dx, dy) / flight,
        tint, "star", {banks:1}, material);
    }
    if (beat === 7) {
      bank(centre, 287, 1.82, "largeorb", white);
    } else {
      var steps = 7 + d.density, flight = 2.04;
      for (var i = 0; i <= steps; i++) {
        var u = i / steps;
        // The point faces down the table. The rising shoulder is gold and
        // the opposite facet is cold. The rail-side corner marks the break.
        var y = 298 - 52 * u, lean = hand * 13 * u;
        bank(centre + lean - 48 * u, y, flight, i === 0 ? "flare" : "prism", lens.color);
        if (i) bank(centre + lean + 48 * u, y, flight, "smallorb", gold);
      }
      for (var j = 0; j <= steps; j++) {
        var offset = -48 + 96 * j / steps;
        if (Math.abs(offset + hand * 13) < 18 || !j || j === steps) continue;
        bank(centre + hand * 13 + offset, 246, flight, "stardust", white);
      }
    }
    return true;
  }

  // The two foreign comets arrive at the saddle between the instruments.
  // After a short stop the leading head crosses; its companion takes the
  // opposite diagonal on a later count. Their curls travel bodily thereafter.
  function saddleExchange(tick, api, d, lenses) {
    var bar = Math.floor(tick / 8);
    if (bar % 2 !== 1 || tick % 8 !== 0) return false;
    var first = Math.floor(bar / 2) % 2, count = 13 + d.density;
    lenses.forEach(function (lens, side) {
      var hand = side ? -1 : 1, cx = 120 - hand * 35;
      var cy = 126 + (side === first ? 0 : 12);
      var wait = side === first ? 1.12 : [1.89, 1.68, 1.78][d.part];
      var heading = down - hand * (.32 + .035 * d.part);
      for (var i = 0; i < count; i++) {
        var u = i / (count - 1), turn = u * 1.63 * Math.PI;
        var r = 4 + 18 * u;
        var dx = cx + hand * r * Math.sin(turn) - lens.x;
        var dy = cy + .70 * r * Math.cos(turn) - lens.y;
        api.bullet(lens.x, lens.y, Math.atan2(dy, dx), Math.hypot(dx, dy) / .79,
          side ? mint : gold, i ? "smallstar" : "bigstar", {
            decelerate:{from:.66, to:.92, speed:0},
            release:{at:wait + .12 * u, angle:heading + (u - .5) * .075,
              speed:i ? 102 - 11*u : 117},
          }, i === 0 ? "comet" : i === count - 1 ? "prism" : "stardust");
      }
    });
    return true;
  }

  function rewindPrint(tick, api, d, lens) {
    if (tick % 24 !== 3) return;
    var sheet = Math.floor(tick / 24), hand = sheet % 2 ? -1 : 1;
    var x = [58, 165, 101, 159][sheet % 4], y = 298 + 7 * d.part;
    var flight = 2.04, pitch = 10 - .4 * d.density;
    // Three marked corners expose a contact print. Its open side alternates.
    // All grains rewind along the ray that brought them into focus.
    function grain(dx, dy, material) {
      var vx = (x + hand * dx - lens.x) / flight, vy = (y + dy - lens.y) / flight;
      var angle = Math.atan2(vy, vx), speed = Math.hypot(vx, vy);
      api.bullet(lens.x, lens.y, angle, speed, material === "prism" ? white : violet, "smallstar",
        {decelerate:{from:1.94, to:2.14, speed:0},
          release:{at:2.54, angle:angle + Math.PI, speed:speed * .94}}, material);
    }
    for (var j=-2; j<=2; j++) grain(-28, j * pitch, j === -2 || j === 2 ? "prism" : "stardust");
    for (var i=0; i<5; i++) {
      grain(-19 + i * pitch, -2 * pitch, i === 4 ? "saber" : "smallorb");
      if (i < 3) grain(-19 + i * pitch, 2 * pitch, "stardust");
    }
    grain(21, -pitch, "prism");
  }

  function gravityAssist(tick, api, d, lenses) {
    var beat = tick % 8, bar = Math.floor(tick / 8);
    var answer = [4, 2, 3][d.part];
    if (beat !== 0 && beat !== answer && !(d.part === 2 && beat === 6)) return;
    var side = (bar + (beat === answer ? 1 : 0)) % 2;
    var origin = lenses[side], well = lenses[1 - side], hand = side ? -1 : 1;
    var radius = Math.abs(well.x - origin.x), count = 14 + 2 * d.density;
    var middleArc = d.part === 0 ? 3.66 : d.part === 1 ? 3.90 : beat === 6 ? 3.34 : 3.78;
    var sweep = d.part === 1 ? -0.87 : 0.94;
    for (var i = 0; i < count; i++) {
      var u = i / (count - 1);
      // v = rω: every grain runs along the same circle about the OTHER
      // instrument. Different angular velocities stretch the comet into a tail.
      var spin = 1.16 + 1.12 * u;
      var exitArc = middleArc + (u - 0.5) * sweep;
      api.bullet(origin.x, origin.y, -down, radius * spin, origin.color,
        i === count - 1 ? "bigstar" : i % 3 ? "smallstar" : "star", {
          turn: hand * spin,
          redirect: { at: exitArc / spin, angle: -down + hand * exitArc,
            speed: d.speed * (0.87 + u * 0.22) },
        }, i === count - 1 ? "comet" : i % 3 ? "stardust" : "flare");
    }
  }

  // A bent handle and a closed bowl share one junction, as on a star chart.
  var dipper = [[-1, -0.26], [-0.69, -0.57], [-0.36, -0.44], [-0.07, -0.06],
    [0.13, 0.55], [0.76, 0.50], [0.95, -0.24], [-0.07, -0.06]];
  function doubleExposure(s, tick, api, d, lenses) {
    var bar = Math.floor(tick / 8), beat = tick % 8;
    var plate = s.enemySpell.plate;
    if (!plate || plate.bar !== bar) {
      // Freeze the plate for the pair even when the music changes phrase.
      plate = s.enemySpell.plate = { bar: bar, part: d.part, x: [95, 145, 122, 156, 87, 128][bar % 6],
        y: [184, 155, bar % 2 ? 157 : 201][d.part] };
    }
    var delay = [3, 5, 2][plate.part];
    if (beat !== 0 && beat !== delay) return;
    var echo = beat === delay, side = ((plate.part ? bar + 1 : bar) + Number(echo)) % 2;
    var from = lenses[side], mirror = bar % 2 ? -1 : 1;
    var travel = (plate.y - from.y) / d.speed + (echo && plate.part === 2 ? 0.38 : 0.12);
    var divisions = 2 + d.density;
    // Both viewpoints meet at each exact star, then keep going. The first
    // photograph shows where the second train will cross; no fixed safe lane.
    for (var edge = 0; edge < dipper.length - 1; edge++) {
      // The eclipse obscures the bowl in the second photograph. In the
      // reprise the afterimage keeps only the handle on the intervening bars.
      if (echo && bar > 0 && edge >= 3 && (bar % 2 === 0 || plate.part === 2)) continue;
      var a = dipper[edge], b = dipper[edge + 1];
      for (var i = 0; i < divisions; i++) {
        var u = i / divisions, nx = a[0] + (b[0] - a[0]) * u;
        var ny = a[1] + (b[1] - a[1]) * u;
        var x = plate.x + mirror * nx * 42;
        var y = plate.y + ny * 35 + nx * (plate.part === 1 ? -14 : 9);
        var vx = (x - from.x) / travel, vy = (y - from.y) / travel;
        api.bullet(from.x, from.y, Math.atan2(vy, vx), Math.hypot(vx, vy),
          from.color, i ? "smallstar" : "star", null,
          i ? (echo ? "smallorb" : "stardust") : (echo ? "prism" : "flare"));
      }
    }
  }
  function flashBurst(s, tick, api, d, tools) {
    var beat = tick % 8, pair = Math.floor(tick / 8);
    if (d.part === 1 && pair % 2) return;
    if (beat === 0) {
      tools.lockAim(s, gold, 0.48);
      s.enemySpell.flashTick = null;
      return;
    }
    var heading = tools.aimBearing(s, s.boss);
    if (heading === null) return;
    if (s.enemySpell.flashTick == null) {
      if (beat < 2 || beat > 5) return;
      s.enemySpell.flashTick = tick;
      // Three close rails expose the same held plate. Different speeds stretch
      // the exposure lengthwise; the centre of each rail never tracks again.
      var layers = (d.part === 2 ? 4 : 3) + Math.floor(d.density / 2);
      for (var lane = -1; lane <= 1; lane++) {
        for (var grain = 0; grain < layers; grain++) {
          api.bullet(s.boss.x, s.boss.y, heading + lane * 0.047,
            154 + 49 * grain / (layers - 1), gold, "star", null,
            grain === layers - 1 && lane === 0 ? "comet" : "stardust");
        }
      }
    } else {
      var after = tick - s.enemySpell.flashTick;
      if (after !== 1 && !(d.part === 2 && after === 2)) return;
      // An unequal spray trails the photograph, wider on the returning side.
      // Stratify the grains so one bad seed cannot stack them all in one lane.
      var count = 5 + d.density, hand = pair % 2 ? -1 : 1;
      for (var i = 0; i < count; i++) {
        var u = (i + tools.scatter(s, tick, i * 2)) / count;
        var speed = 87 + 40 * tools.scatter(s, tick, i * 2 + 1);
        api.bullet(s.boss.x, s.boss.y, heading + hand * (1.02 * u - 0.32),
          speed, violet, "smallstar", null, i === 0 ? "prism" : "smallorb");
      }
    }
  }

  function shutterBlades(s, tick, api, d, tools, lenses) {
    var bar = Math.floor(tick / 16), beat = tick % 16, last = d.part === 2;
    var answer = last ? 7 : 8;
    if (beat !== 0 && beat !== answer) return;
    var echo = beat === answer, side = (bar + Number(echo)) % 2, source = lenses[side];
    var hand = side ? -1 : 1, rays = last ? 4 : 3;
    var count = 25 + 2 * d.density, skip = 7, cut = Math.floor((count - skip) / 2);
    // Each real shutter lamella is a radial file of travelling stars. At
    // 2.05s the missing interval falls on a sloping line across the field.
    // The opposite lens reverses that slope on its answer.
    for (var arm = 0; arm < rays; arm++) {
      var u = arm / (rays - 1);
      var x = 26 + 188 * u + 14 * Math.sin((bar % 4) * Math.PI / 2) * hand;
      var y = 247 + (u - 0.5) * 50 * hand + (echo ? 16 : 0);
      var theta = tools.bearing(source, {x:x, y:y});
      var gateSpeed = Math.hypot(x - source.x, y - source.y) / 2.05;
      var pitch = 3.75;
      tools.spoke(api, source, theta, {
        count:count, speed:gateSpeed - (cut + (skip - 1) / 2) * pitch,
        step:pitch, cut:cut, skip:skip, color:source.color, shape:"smallstar",
        visualStyle:function(i) {
          if (i === cut - 1 || i === cut + skip) return "saber";
          return i === count - 1 ? "flare" : "stardust";
        },
      });
    }
  }
  function variation(s, tick, api, d, tools, lenses) {
    var id = s.enemySpell.id, last = d.part === 2, speed = d.speed, fine = d.density;
    var pass = Math.floor(tick / 3);
    if (id === "exposure") {
      var pair = Math.floor(tick / 8), main = lenses[pair % 2], side = lenses[1 - pair % 2];
      flashBurst(s, tick, api, d, tools);
      if (tick % 8 === 0) {
        s.enemySpell.negative = s.enemySpell.exposure;
        s.enemySpell.exposure = { x: s.player.x, y: s.player.y };
        tools.fan(api, main, tools.bearing(main, s.player), 5 + fine, 1.0, speed * 0.72, mint, "smallstar", null, null, exposureGrain);
      }
      if (tick % 8 === 3 || tick % 8 === 5) {
        var echo = tick % 8 === 5;
        var lens = echo ? side : main;
        var snap = (echo && last && s.enemySpell.negative) || s.enemySpell.exposure || s.player;
        var heading = tools.bearing(lens, snap);
        tools.fan(api, lens, heading, 9 + 2 * Math.floor(fine / 2),
          echo ? 0.62 : 0.29, speed, gold, "star", null, null, exposedComet);
      }
      if (tick % 8 === 7) {
        // A film dragged sideways before development curls back from the margin.
        var hand = pair % 2 ? -1 : 1;
        tools.fan(api, side, down - 0.41 * hand, 7 + fine, 0.8,
          speed * 0.72, violet, "smallstar",
          { redirect: { at: last ? 1.2 : 0.72, duration: 0.53,
            angle: down + 0.48 * hand, speed: speed } }, null, "prism");
      }
    } else if (id === "bankshot" && tick % 3 === 0) {
      var from = lenses[pass % 2], toRail = pass % 2 ? -1 : 1;
      // The mother stars first hit the near cushion, then open a chevron.
      // In the reprise the unsplit companion bank returns from the other wall.
      for (var i = 0; i < 5 + fine; i++) {
        var cone = (i / (4 + fine) - 0.5) * 0.7;
        api.bullet(from.x, from.y, down + toRail * (0.79 + cone), speed * 1.12,
          from.color, "bigstar", { banks: 1, split: { at: last ? 1.34 : 0.78,
            count: 2, spread: last ? 0.51 : 0.32, speed: speed, color: gold, shape: "smallstar",
            visualStyle: "prism" } }, bankBall(i, 5 + fine));
      }
      if (last && pass % 2 === 0) tools.fan(api, lenses[1], down - 0.93,
        5 + fine, 0.45, speed * 1.12, violet, "star", { banks: 2 }, null, "saber");
    } else if (id === "spectrograph" && tick % 4 === 0) {
      var prism = lenses[0];
      [mint, gold, violet].forEach(function (color, i) {
        var ray = (i - 1) * 0.35;
        // Two outer bands bend in; the short central spectrum opens sideways.
        var parent = down + ray + 0.22 * Math.sin(tick * 0.13);
        api.bullet(prism.x, prism.y, parent, speed * 0.78, white, "bigstar", {
          split: { at: last ? 1.58 - i * 0.32 : 0.67 + Math.abs(i - 1) * 0.68,
            count: 7 + fine, spread: 0.72 / (6 + fine),
            angleOffset: last ? ray * 1.9 : -ray * 1.8, speed: speed, color: color, shape: "smallstar",
            visualStyle: ["prism", "smallorb", "stardust"][i] },
        }, i === 1 ? "largeorb" : "prism");
      });
    } else if (id === "shutter") {
      shutterBlades(s, tick, api, d, tools, lenses);
      if (tick % 12 === 0 || tick % 12 === 4) {
        // The two frame edges expose the outer margins while leaving the
        // middle of the darkroom free for a return through the blade holes.
        var right = tick % 12 === 4, lens = lenses[Number(right)];
        api.laser(lens.x, lens.y, tools.bearing(lens, { x:right ? 230 : 10, y:308 }),
          3.7, 1.25, 0.8, lens.color);
      }
    }
  }
  function emit(s, tick, api, d, tools) {
    var id = s.enemySpell.id,
      lenses = emitters(s),
      pass = Math.floor(tick / 3);
    var lens = lenses[pass % lenses.length],
      speed = d.speed,
      fine = d.density;
    if (id === "slingshot") {
      if (!saddleExchange(tick, api, d, lenses)) gravityAssist(tick, api, d, lenses);
      return;
    }
    if (id === "bankshot") {
      // Lift the first cushion fan before the cue. An uninterrupted alternating
      // fan here can reach the rack's open base just as the pilot steps through.
      if (!d.part && tick % 18 === 3) return;
      if (cushionRack(tick, api, d, lenses)) return;
    }
    if (id === "shutter") rewindPrint(tick, api, d, lenses[Math.floor(tick / 24) % 2]);
    if (id === "parallax") {
      occultation(tick, api, d, lenses);
      return doubleExposure(s, tick, api, d, lenses);
    }
    if (id === "exposure" && !d.part) aperture(s, tick, api, d, lenses);
    if (id === "spectrograph") chromaticCaustic(tick, api, d, lenses[0]);
    if (constellation(s, tick, api, d, tools, lenses)) return;
    if (d.part) return variation(s, tick, api, d, tools, lenses);
    if (id === "exposure") {
      if (tick % 8 === 0) {
        s.enemySpell.exposure = { x: s.player.x, y: s.player.y };
        var mark = lenses[(tick / 8) % 2];
        tools.fan(
          api,
          mark,
          tools.bearing(mark, s.enemySpell.exposure),
          5 + fine,
          1.45,
          speed * 0.72,
          mint,
          "smallstar", null, null, exposureGrain
        );
      }
      if (tick % 8 === 7) {
        // A fixed violet sweep closes one side after the two aimed flashes.
        // Its source alternates, allowing the next exposure to be baited across it.
        var cycle = Math.floor(tick / 8);
        var negative = lenses[(cycle + 1) % 2];
        tools.fan(api, negative, down + (cycle % 2 ? -0.32 : 0.32),
          6 + fine, 1.1, speed * 0.72, violet, "smallstar", null, null, "prism");
      }
      if (tick % 8 === 3 || tick % 8 === 5) {
        var snap = s.enemySpell.exposure || s.player;
        lenses.forEach(function (f) {
          tools.fan(
            api,
            f,
            tools.bearing(f, snap),
            7 + 2 * Math.floor(fine / 2),
            0.36,
            speed,
            gold,
            "star", null, null, exposedComet
          );
        });
      }
    } else if (id === "bankshot" && tick % 3 === 0) {
      // These table-edge stars ricochet exactly once, keeping their approach speed.
      var hand = pass % 2 ? 1 : -1;
      tools.fan(
        api,
        lens,
        down + hand * (0.87 + 0.08 * Math.sin(pass * 0.7)),
        13 + 2 * fine,
        0.88,
        speed * 1.12,
        lens.color,
        "star",
        { banks: 1 }, null, bankBall
      );
    } else if (id === "spectrograph" && tick % 4 === 0) {
      // Three slow white parent comets separate into coloured spectra at different heights.
      [mint, gold, violet].forEach(function (color, i) {
        var heading = down + (i - 1) * 0.36 + Math.sin(tick * 0.13) * 0.28;
        api.bullet(lens.x, lens.y, heading, speed * 0.78, white, "bigstar", {
          split: {
            at: 0.8 + i * 0.27,
            count: 8 + fine,
            spread: 0.88 / (7 + fine),
            speed: speed,
            color: color,
            shape: "smallstar", visualStyle: ["prism", "smallorb", "stardust"][i],
          },
        }, i === 1 ? "largeorb" : "prism");
      });
    } else if (id === "shutter") {
      var sheet = Math.floor(tick / 12),
        safe = [52, 114, 173, 114][sheet % 4];
      if (tick % 12 === 0) {
        // Measured on the bottom edge; two narrow exposures mark a wide safe aisle.
        lenses.forEach(function (f, i) {
          var aim = tools.bearing(f, { x: safe + (i ? 34 : -34), y: 308 });
          api.laser(f.x, f.y, aim, 4, 1.25, 0.8, f.color);
        });
      }
      if (tick % 3 === 0) {
        var gap = tools.bearing(s.boss, { x: safe, y: 308 });
        tools.ring(
          api,
          s.boss,
          40 + fine * 3,
          pass * 0.18,
          speed,
          gold,
          "smallstar",
          gap,
          0.17, null, gateBlade
        );
      }
    }
  }
  var api = {
    cards: cards,
    emitters: emitters,
    emit: emit,
    interlude: interlude,
    bossPosition: bossPosition,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.DanmakuMarisaPatterns = api;
})(typeof window !== "undefined" ? window : globalThis);
