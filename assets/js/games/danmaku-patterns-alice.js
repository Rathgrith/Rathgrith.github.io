/* Alice's sewing theatre. Each doll is a visible needle; gaps belong to the score. */
(function (scope) {
  "use strict";
  var blue = "#94d7f2",
    red = "#ef9eb0",
    ivory = "#ffebbf",
    down = Math.PI / 2;
  var cards = [
    {
      id: "skipstitch",
      name: "縫符「針を休める一目」",
      interlude: "仮縫いの余り糸",
    },
    { id: "shuttle", name: "織機「夜行シャトル」", cue: "折り返すシャトルの後ろへ", interlude: "横糸の往復" },
    {
      id: "buttonhole",
      name: "釦譜「ほどけた留め穴」",
      interlude: "小さな糸輪",
    },
    { id: "pleats", name: "折符「袖に隠した階段」", interlude: "まち針の行進" },
    { id: "basting", name: "刺繍「身代わりの型紙」",
      cue: "鋏を誘い、刃の外へ", interlude: "採寸の合図" },
    {
      id: "curtaincall",
      name: "幕間「仕立屋の最後の一針」",
      cue: "開いた扇の要の下へ",
      interlude: "舞台袖の片付け",
    },
  ];
  function bossPosition(s) {
    var t = s.enemySpell.age;
    return { x: 120 + 30 * Math.sin(t * 0.46), y: 44 + 6 * Math.cos(t * 0.51) };
  }
  function emitters(s) {
    var id = s.enemySpell.id,
      t = s.enemySpell.age,
      dolls = [];
    function doll(x, y) {
      var i = dolls.length;
      dolls.push({
        id: "needle-" + i,
        x: x,
        y: y,
        kind: "doll",
        color: i % 2 ? red : blue,
      });
    }
    if (id === "skipstitch") {
      [48, 120, 192].forEach(function (x, i) { doll(x, 55 + 5 * Math.sin(t * 0.65 + i)); });
    } else if (id === "pleats" || id === "curtaincall") {
      for (var i = 0; i < 6; i++) {
        doll(
          20 + 40 * i,
          52 + (id === "pleats" ? i * 6 : 5 * Math.sin(t * 0.65 + i))
        );
      }
    } else if (id === "shuttle") {
      var travel = 60 * Math.sin(t * 0.74);
      doll(105 + travel, 65);
      doll(135 - travel, 85);
    } else {
      doll(60 + 15 * Math.sin(t * 0.4), 58);
      doll(180 - 15 * Math.sin(t * 0.4), 68);
    }
    return dolls;
  }
  function advanceHem(b, hem, dt) {
    var t = b.age, oldX = b.x, oldY = b.y, draw = Math.min(1, t / 0.75);
    var ease = draw * draw * (3 - 2 * draw), descent = Math.max(0, t - 0.75);
    var y = hem.y + ease * hem.drop + descent * hem.speed;
    var travel = Math.max(0, Math.min(1, (y - 160) / 155));
    b.x = hem.x + (hem.hemX - hem.x) * ease +
      hem.shift * travel * travel * (3 - 2 * travel) * hem.nearPin;
    b.y = y;
    b.vx = (b.x - oldX) / dt; b.vy = (b.y - oldY) / dt;
    if (b.vx || b.vy) b.heading = Math.atan2(b.vy, b.vx);
  }
  function stitchRow(i, n) {
    return i === 0 || i === n - 1 ? "needle" : "smallorb";
  }
  function shuttleRow(i, n) {
    return i === Math.floor(n / 2) ? "bobbin" : i === 0 || i === n - 1 ? "saber" : "ribbon";
  }
  function eyelet(i) {
    return i % 7 === 0 ? "spool" : "smallorb";
  }
  function cutEdge(i, n) {
    return i === 0 ? "saber" : i === n - 1 ? "needle" : "smallorb";
  }
  function curtainRow(i, n) {
    return i === Math.floor(n / 2) ? "ribbon" : i === 0 || i === n - 1 ? "saber" : "smallorb";
  }
  var soloThreads = {
    skipstitch:stitchRow, shuttle:shuttleRow, buttonhole:eyelet,
    pleats:cutEdge, basting:stitchRow, curtaincall:curtainRow,
  };
  function stitch(api, doll, theta, grains, speed, tools) {
    tools.fan(api, doll, theta, grains, 0.115, speed, doll.color, "rice", undefined, undefined, curtainRow);
  }
  function interlude(s, tick, api, d, tools) {
    var needle = emitters(s),
      pass = Math.floor(tick / 4);
    if (tick % 4) return;
    var start = (pass + d.stage) % needle.length;
    var a = needle[start],
      theta = tools.bearing(a, s.player);
    tools.fan(
      api,
      a,
      theta,
      6 + d.density,
      0.8,
      d.speed * 0.8,
      a.color,
      "rice", undefined, undefined, stitchRow
    );
    if (pass % 2 === 0) {
      var b = needle[(start + 1) % needle.length];
      tools.fan(
        api,
        b,
        down + 0.25 * Math.sin(pass + d.stage),
        7 + d.density,
        1.45,
        d.speed * 0.7,
        ivory,
        "butterfly"
      );
    }
  }
  // The middle and last strophes trade passages between the same visible dolls.
  // Angles are measured towards points in the playable field, so a changing
  // source position still projects the intended weave and its spare opening.
  function wovenFigure(s, tick, api, d, tools, dolls) {
    if (s.time - s.rhythm.sectionStart < 3.2) return false;
    var id = s.enemySpell.id, row = Math.floor(tick / 4), turn = Math.floor(tick / 16);
    var source, curve, lobes, spin, spread, lane, shape = "rice", count = 28;
    if (id === "skipstitch" && tick % 16 === 8) {
      // A single needle embroiders the diamond while the resting panel is open.
      var hole = [0, 1, 2, 1][(d.part ? Math.floor(row / 2) : row) % 4];
      var slotX = dolls[hole].x + (d.part ? 0 :
        (300 - dolls[hole].y) / Math.tan(down + 0.085 * Math.sin(row * Math.PI / 3)));
      source = dolls[hole === 0 ? 2 : 0]; lane = { x: slotX, y: 300, halfWidth: 30 };
      curve = "lissajous"; lobes = 3; spin = (turn % 2 ? -1 : 1) * 0.21; spread = 25;
    } else if (id === "shuttle" && tick % 16 === 6) {
      source = dolls[turn % 2]; curve = "cycloid"; lobes = 4 + d.part;
      spin = (turn % 2 ? -1 : 1) * (0.21 + d.part * 0.13); spread = 34;
    } else if (id === "buttonhole" && tick % 16 === 8) {
      source = dolls[turn % 2]; curve = "epi"; lobes = 4; spin = turn * 0.31; spread = 27;
      shape = "butterfly";
      if (d.part) lane = { x: [65, 115, 170, 115][Math.floor(row / 2) % 4], y: 290, halfWidth: 27 };
    } else if (id === "pleats" && tick % 18 === 9) {
      var fold = Math.floor(tick / 3), skip = [1, 2, 3, 4, 3, 2][fold % 6];
      source = dolls[skip > 2 ? 1 : 4]; curve = "cycloid"; lobes = 5; spread = 32;
      spin = (d.part === 1 ? -1 : 1) * (Math.PI / 4); shape = "kunai";
      lane = { x: dolls[skip].x, y: 294, halfWidth: 23 };
    } else if (id === "basting" && tick % 18 === 9) {
      source = dolls[turn % 2]; curve = "rose"; lobes = 3; spread = 31;
      // Rotate the dressmaker's chalk stencil towards the last sampled trace.
      spin = tools.bearing(source, s.enemySpell.seam ? {x:s.enemySpell.seam.x, y:300} : s.player) - down;
      shape = "kunai";
    } else if (id === "curtaincall" && tick % 24 === 8) {
      source = s.boss; curve = "hypo"; lobes = 5; spread = 33;
      spin = turn * 0.3; shape = "butterfly"; count = 34;
      var door = Math.floor(tick / 12);
      lane = { x: d.part ? [63, 119, 177, 119][door % 4] :
        dolls[[1, 2, 3, 4, 3, 2][door % 6]].x, y: 288, halfWidth: 30 };
    } else return false;
    tools.figure(api, source, { curve: curve, lobes: lobes, count: count,
      angle: spin, spread: spread, fall: 54 + d.stage * 1.5, depth: 0.78,
      phase: d.part * 0.35, gap: turn % 2 ? 0.18 : 0.67, gapWidth: 0.13,
      color: source.color || ivory, shape: shape, lane: lane, visualStyle: soloThreads[id] });
    return true;
  }
  // The shuttle's centre needles all use the same basting mark. Its loose
  // thread flares mainly to one side; the opposite shoulder is the escape.
  function threadedShuttle(s, tick, api, d, tools) {
    var slot = tick % 16, mark = s.enemySpell.sight;
    if (!slot) {
      mark = tools.lockAim(s, ivory, 0.46);
      mark.stitches = 0;
      mark.nextStitch = mark.ready;
      return;
    }
    if (slot < 3 || !mark || mark.stitches >= 5 || s.time < mark.nextStitch) return;
    var from = s.boss, angle = tools.aimBearing(s, from);
    if (angle === null) return;
    var row = mark.stitches++;
    if (row < 3) {
      var width = 1 + Math.floor(d.density / 2);
      for (var i = -width; i <= width; i++) {
        api.bullet(from.x, from.y, angle + 0.028 * i, 173 + 8 * row,
          i ? blue : ivory, "rice", undefined, i ? "needle" : "saber");
      }
      mark.nextStitch = s.time + (row === 2 ? 0.21 : 0.075);
      return;
    }
    var side = Math.floor(tick / 16) % 2 ? 1 : -1;
    if (mark.x < 54) side = 1;
    if (mark.x > 186) side = -1;
    mark.nextStitch = s.time + 0.23;
    var count = 6 + d.density, echo = row === 4;
    for (var j = 0; j < count; j++) {
      var offset = (j + tools.scatter(s, tick, j * 2)) / count;
      // The two frayed ends stem from the same cut, leaving ~0.20 radians
      // open beside the marked line. A second, wider tassel frames the return.
      var spread = echo ? -side * (0.34 + 0.48 * offset) : side * (0.10 + 0.49 * offset);
      var speed = 100 + 31 * tools.scatter(s, tick, j * 2 + 1);
      api.bullet(from.x, from.y, angle + spread, speed, echo ? red : ivory,
        "rice", undefined, j === 0 ? "bobbin" : echo ? "ribbon" : "smallorb");
    }
  }
  // Wing needles cast contiguous radial lines: the speed ladder is scaled
  // for each heading so their missing lengths align at the same screen depth.
  function curtainThreads(s, tick, api, d, tools, dolls) {
    var cast = Math.floor(tick / 8), last = d.part === 2;
    var depths = last ? [268, 223, 248, 288] : [245, 269];
    var gateY = depths[cast % depths.length];
    var lanes = last ? [30, 117, 202] : [55, 156];
    var count = 24 + 2 * d.density, cut = Math.floor(count * 0.46);
    var skip = Math.max(4, Math.round(count * 0.20));
    var fold = cast % 2 ? 13 : -13;
    [dolls[0], dolls[5]].forEach(function (needle, wing) {
      lanes.forEach(function (lane) {
        var x = wing ? 240 - lane - fold : lane + fold;
        var heading = tools.bearing(needle, {x:x, y:gateY});
        var distance = (gateY - needle.y) / Math.sin(heading);
        // The centre of the omitted speed interval crosses gateY at 1.98 s.
        var stride = distance * 0.91 / (1.98 * (count - 1));
        var first = distance / 1.98 - stride * (cut + (skip - 1) / 2);
        tools.spoke(api, needle, heading, {
          count:count, speed:first, step:stride, cut:cut, skip:skip,
          color:needle.color, shape:"rice",
          visualStyle:function (i, n) {
            if (i === cut - 1 || i === cut + skip) return "bobbin";
            return i === n - 1 ? "saber" : i % 4 ? "smallorb" : "needle";
          },
        });
      });
    });
  }
  // A feather stitch has two tapered flanks. The tip and tail travel on
  // the same axis, while the pearls describe the hollow edges between them.
  function feather(api, doll, axis, speed, density) {
    var count = 12 + 2 * density;
    for (var i = 0; i < count; i++) {
      var t = i * 2 * Math.PI / count;
      var forward = speed * (1.15 + 0.24 * Math.cos(t));
      var side = 13.6 * Math.sin(t) * (1 - 0.55 * Math.abs(Math.cos(t)));
      var tip = i === 0, heel = i === count / 2;
      api.bullet(doll.x, doll.y, axis + Math.atan2(side, forward), Math.hypot(side, forward),
        tip ? ivory : doll.color, "rice", undefined, tip ? "saber" : heel ? "bobbin" : "smallorb");
    }
  }

  // The two dolls lace opposite sides of one row of buttonholes. Solving for
  // a shared arrival time makes their scallops cross at the same height even
  // when one source is further away. A pair of ivory spools marks the cut.
  function laceButtonholes(tick, api, d, dolls) {
    var row = Math.floor(tick / 16), gate = [65, 115, 169, 117][row % 4];
    var half = 20 - d.part, arrival = 2.28, knots = 28 + 2 * d.density;
    dolls.forEach(function (doll, wing) {
      for (var i = 0; i <= knots; i++) {
        var x = -4 + i * 248 / knots;
        if (Math.abs(x - gate) < half) continue;
        var edging = Math.abs(x - gate) < half + 248 / knots;
        var wave = Math.sin((x - gate) * Math.PI / 48);
        var y = 273 + (wing ? -1 : 1) * (row % 2 ? -1 : 1) * wave * (15 + 3 * d.part);
        var vx = (x - doll.x) / arrival, vy = (y - doll.y) / arrival;
        api.bullet(doll.x, doll.y, Math.atan2(vy, vx), Math.hypot(vx, vy),
          edging ? ivory : doll.color, "rice", undefined,
          edging ? "spool" : Math.abs(wave) > .92 ? "ribbon" : "smallorb");
      }
    });
  }

  // One pin hangs from each occupied fold. The separate grains open into
  // an oblique pleat on release; successive teeth reverse their slope.
  function pleatPins(api, doll, i, skip, fold, d) {
    var last = d.part === 2, sign = (i + fold) % 2 ? -1 : 1;
    var order = d.part === 0 ? i : last ? Math.abs(2.5 - i) : 5 - i;
    var release = d.part === 0 ? .55 + order * .12 : .48 + order * (last ? .33 : .15);
    var rise = d.speed * .34;
    var releaseY = doll.y + rise * release;
    var gate = 20 + 40 * skip, middle = doll.x + 10 * Math.sin(fold * Math.PI / 3);
    var count = 6 + d.density, height = last ? 35 : 26;
    var flight = 2.53 - .12 * d.part;
    for (var j = 0; j < count; j++) {
      var u = 2 * j / (count - 1) - 1;
      var x = middle + 22 * u, y = 282 + height * sign * u;
      // Keep the bare fold open. Its neighbours finish in visible pinheads.
      if (Math.abs(x - gate) < 17 || (last && Math.abs(x - (240 - gate)) < 17)) continue;
      var vx = (x - doll.x) / flight, vy = (y - releaseY) / flight;
      var tip = sign * u > .99;
      api.bullet(doll.x, doll.y, down, rise, tip ? ivory : doll.color, "kunai",
        {release: {at:release, angle:Math.atan2(vy, vx), speed:Math.hypot(vx, vy)}},
        tip ? "saber" : Math.abs(u) > .99 ? "bobbin" : "smallorb");
    }
  }
  // The bobbin and its wooden hull travel together. One throw crosses to the
  // far selvage; the return travels back underneath the first pass.
  function throwShuttle(api, dolls, pass, d) {
    var hand = pass % 2 ? -1 : 1, dock = hand > 0 ? 25 : 215;
    var high = 128 + (pass % 3) * 7;
    var source = Math.abs(dolls[0].x - dock) < Math.abs(dolls[1].x - dock) ? dolls[0] : dolls[1];
    var throwAngle = Math.atan2(67, 113 * hand), returnAngle = Math.atan2(51, -120 * hand);
    function pin(x, y, style, color) {
      var dx = dock + hand * x - source.x, dy = high + y - source.y;
      api.bullet(source.x, source.y, Math.atan2(dy,dx), Math.hypot(dx,dy) / 1.16,
        color, "rice", {redirect:{at:1.16, angle:throwAngle, speed:Math.hypot(113,67)},
          release:{at:2.82, angle:returnAngle, speed:Math.hypot(120,51)}}, style);
    }
    var half = 5 + Math.floor(d.density / 2);
    for (var i = -half; i <= half; i++) {
      var u = i / half, width = 8 * (1 - u*u);
      var tip = i === half, end = i === -half;
      pin(23*u, -width, tip ? "saber" : end ? "spool" : "ribbon", tip || end ? ivory : source.color);
      if (!tip && !end) pin(23*u, width, "smallorb", source.color);
    }
    pin(0, 0, "bobbin", ivory);
  }

  // The pivot follows the old chalk mark. Each blade and its finger ring move
  // as one affine shape: the blades meet, cross, and slide past one another.
  function tailorsShears(s, api, d, dolls) {
    var pivot = Math.max(46, Math.min(194, s.player.x)), take = 1.18;
    dolls.forEach(function (doll, side) {
      var hand = side ? 1 : -1;
      function pin(x, y, style, color) {
        var dx = pivot + hand*x - doll.x, dy = 165 + y - doll.y;
        var vx = -hand*x / .85, vy = 81;
        api.bullet(doll.x, doll.y, Math.atan2(dy,dx), Math.hypot(dx,dy) / take, color,
          "kunai", {redirect:{at:take, angle:Math.atan2(vy,vx), speed:Math.hypot(vx,vy)}}, style);
      }
      var length = 9 + d.density;
      for (var i = 0; i <= length; i++) {
        var u = i / length;
        if (!i && side) continue;
        pin(49*u, 53*u, i === length ? "saber" : i ? "needle" : "spool",
          i === length || !i ? ivory : doll.color);
      }
      for (var j = 0; j < 8; j++) {
        var angle = j * Math.PI / 4;
        pin(-10 + 7*Math.cos(angle), -14 + 9*Math.sin(angle), "smallorb", doll.color);
      }
    });
  }

  // Paired lantern tassels bloom into separate halves of a folding fan.
  // Their ribs point away from the spent hinge for the audience to step under.
  function footlightFans(api, dolls, tick, d) {
    var row = Math.floor(tick / 32), cue = tick % 32;
    var beat = [2, 5, 9].indexOf(cue);
    if (beat < 0) return;
    var spot = row % 2 ? 2 - beat : beat;
    var x = [52,120,188][spot], y = 170 + [5,18,0][beat];
    var source = dolls[spot * 2 + row % 2], bloom = 1.47, ribs = 6 + d.density;
    for (var side = -1; side <= 1; side += 2) {
      var dx = x + side*4 - source.x, dy = y - source.y, a = Math.atan2(dy,dx);
      var tint = side < 0 ? red : blue;
      api.bullet(source.x, source.y, a, Math.hypot(dx,dy) / bloom, tint, "kunai",
        {split:{at:bloom, count:ribs, spread:.86/(ribs-1), speed:80 + beat*4,
          angleOffset:down - side*.88 - a, shape:"rice",
          visualStyle:Array.from({length:ribs}, function (_, i) { return i === 0 || i === ribs-1 ? "saber" : i % 2 ? "ribbon" : "smallorb"; })}}, "spool");
    }
  }
  function variation(s, tick, api, d, tools, dolls) {
    var id = s.enemySpell.id, last = d.part === 2, speed = d.speed, fine = d.density;
    var row = Math.floor(tick / 4), hand = row % 2 ? -1 : 1;
    if (id === "skipstitch" && tick % 2 === 0) {
      // The first half of a diamond opens, then its partner crosses it.
      // The unworked pair moves one panel at a time on the return traversal.
      var panel = [0, 1, 2, 1][Math.floor(row / 2) % 4];
      var second = tick % 4 !== 0;
      dolls.forEach(function (doll, i) {
        if (i === panel) return;
        var side = second ? -1 : 1;
        var endX = doll.x + side * (last && row % 2 ? -26 : 35);
        var aim = tools.bearing(doll, { x: endX, y: 235 });
        if (!second && row % 2) feather(api, doll, aim, speed, fine);
        else tools.fan(api, doll, aim, 5 + fine, 0.17, speed, doll.color, "rice", undefined, undefined, stitchRow);
        if (last) {
          // A hanging selvage marks which edge will close on the next row.
          api.bullet(doll.x, doll.y, down, speed * 0.34, ivory, "kunai",
            { release: { at: 0.8, angle: aim, speed: speed } }, "spool");
        }
      });
    } else if (id === "shuttle" && tick % 2 === 0) {
      var shuttle = dolls[tick % 4 ? 1 : 0], sign = tick % 4 ? -1 : 1;
      // The shuttles send two halves of a folded ribbon towards a common selvedge.
      var meeting = last ? 120 + 53 * Math.sin(row * 0.56) : 120 + 42 * hand;
      var toward = tools.bearing(shuttle, { x: meeting, y: 166 });
      for (var j = 0; j < 8 + fine; j++) {
        var offset = (j / (7 + fine) - 0.5) * 0.59;
        api.bullet(shuttle.x, shuttle.y, toward + offset, speed, shuttle.color, "rice", {
          redirect: { at: last ? 1.35 : 0.85, angle: down + sign * (last ? -0.46 : 0.53) - offset,
            speed: speed, duration: 0.42 },
        }, shuttleRow(j, 8 + fine));
      }
    } else if (id === "buttonhole" && tick % 2 === 0) {
      var loop = dolls[tick % 4 ? 1 : 0];
      // Offset eyelets join like links. During the reprise their cut ends
      // peel apart into two smaller stitches; the uncut arc stays single.
      var button = { x: [65, 115, 170, 115][Math.floor(row / 2) % 4], y: 290 };
      var gap = tools.bearing(loop, button), total = 29 + 2 * fine;
      for (var k = 0; k < total; k++) {
        var a = k * Math.PI * 2 / total + row * 0.09;
        var off = Math.abs(Math.atan2(Math.sin(a - gap), Math.cos(a - gap)));
        if (off < 0.31) continue;
        var tip = last && off < 0.61;
        api.bullet(loop.x, loop.y, a, speed, loop.color, tip ? "bubble" : "butterfly",
          tip ? { split: { at: 1.3, count: 2, spread: 0.18,
            angleOffset: Math.sign(Math.sin(a - gap)) * 0.15,
            speed: speed, color: ivory, shape: "rice", visualStyle: ["needle", "smallorb"] } } : undefined,
          tip ? "largeorb" : eyelet(k));
      }
    } else if (id === "pleats" && tick % 3 === 0) {
      var fold = Math.floor(tick / 3), skip = [1, 2, 3, 4, 3, 2][fold % 6];
      dolls.forEach(function (doll, i) {
        if (i === skip || (last && i === 5 - skip)) return;
        pleatPins(api, doll, i, skip, fold, d);
      });
    } else if (id === "basting" && (tick % 12 === 0 || tick % 12 === 3)) {
      // Pin a gap where the player stands. Both hems bow into the field and
      // travel together. Their empty seam walks sideways as the cloth descends.
      var panel = Math.floor(tick / 12), right = tick % 12 === 3;
      if (!right || !s.enemySpell.seam) {
        var pin = Math.max(55, Math.min(185, s.player.x));
        s.enemySpell.seam = { x: pin, shift: last ? (pin < 120 ? 49 : -49) : (panel % 2 ? -22 : 22) };
      }
      var seam = s.enemySpell.seam, edge = right ? 247 : -7;
      var shuttle = dolls[right ? 1 : 0], end = seam.x + (right ? 24 : -24);
      var stitches = 10 + fine;
      for (var stitch = 0; stitch < stitches; stitch++) {
        var u = stitch / (stitches - 1), hemX = edge + (end - edge) * u;
        api.bullet(shuttle.x, shuttle.y, down, speed, right ? red : blue, "rice",
          { hem: { x: shuttle.x, y: shuttle.y, hemX: hemX, drop: 79 + 13 * Math.sin(Math.PI * u),
            shift: seam.shift, speed: speed, nearPin: u } },
          stitch === stitches - 1 ? "bobbin" : stitch === 0 ? "saber" : "ribbon");
      }
    } else if (id === "curtaincall") {
      var bar = Math.floor(tick / 12), stop = [63, 119, 177, 119][bar % 4];
      var corridor = { x: stop, y: 288 };
      if (tick % 12 === 0) {
        [dolls[0], dolls[5]].forEach(function (wing, i) {
          var edge = last ? (i ? -37 : 37) : (i ? 37 : -37);
          api.laser(wing.x, wing.y, tools.bearing(wing, { x: stop + edge, y: corridor.y }),
            3.5, 1.2, 0.88, ivory);
        });
      }
      if (tick % 4 === 0) dolls.forEach(function (doll, i) {
        // A diagonal fan of drapery has a real break where the spotlights meet.
        var targetX = last ? 224 - i * 40 : 19 + i * 40 + hand * 14;
        var cut = { angle: tools.bearing(doll, corridor), halfWidth: 0.16 };
        tools.fan(api, doll, tools.bearing(doll, { x: targetX, y: corridor.y }),
          4 + fine, 0.18, speed, doll.color, "rice", undefined, cut, curtainRow);
      });
    }
  }
  function emit(s, tick, api, d, tools) {
    var id = s.enemySpell.id,
      dolls = emitters(s),
      speed = d.speed;
    if (id === "shuttle" && tick % 16 === 1) throwShuttle(api, dolls, Math.floor(tick / 16), d);
    if (id === "basting" && (d.part ? tick % 36 === 7 : tick % 24 === 2)) tailorsShears(s, api, d, dolls);
    if (id === "curtaincall") footlightFans(api, dolls, tick, d);
    if (id === "buttonhole" && tick % 16 === 5) laceButtonholes(tick, api, d, dolls);
    if (d.part && id === "shuttle") threadedShuttle(s, tick, api, d, tools);
    if (wovenFigure(s, tick, api, d, tools, dolls)) return;
    if (d.part && id === "curtaincall" && Math.floor(tick / 16) % 2) {
      if (tick % 8 === 1) curtainThreads(s, tick, api, d, tools, dolls);
      return;
    }
    if (d.part) return variation(s, tick, api, d, tools, dolls);
    var row = Math.floor(tick / 4),
      hand = row % 2 ? -1 : 1,
      fine = d.density;
    if (id === "skipstitch" && tick % 4 === 0) {
      // The missed stitch shifts one position at a time and returns from each edge.
      var gap = [0, 1, 2, 1][row % 4];
      // Lean the entire row together to sweep the midpoints between dolls.
      var slant = 0.085 * Math.sin((row * Math.PI) / 3);
      dolls.forEach(function (doll, i) {
        if (i === gap) return;
        feather(api, doll, down + slant, speed, fine);
      });
    } else if (id === "shuttle" && tick % 2 === 0) {
      // Alternating shuttles criss-cross; follow behind the passing ribbon.
      var shuttle = dolls[(tick / 2) % 2];
      tools.fan(
        api,
        shuttle,
        down + (shuttle === dolls[0] ? 0.34 : -0.34),
        8 + fine,
        0.57,
        speed,
        shuttle.color,
        "rice", undefined, undefined, shuttleRow
      );
    } else if (id === "buttonhole" && tick % 4 === 0) {
      // Incomplete loops: each releases through a gap angled toward the centre seam.
      dolls.forEach(function (doll, i) {
        var opening = down + (i ? 0.32 : -0.32) + Math.sin(row * 0.4) * 0.24;
        tools.ring(
          api,
          doll,
          30 + fine * 3,
          row * 0.17,
          speed * (i ? 0.91 : 1),
          doll.color,
          "butterfly",
          opening,
          0.33, undefined, function (k, count) { return k === 0 || k === Math.floor(count / 2) ? "largeorb" : eyelet(k); }
        );
      });
    } else if (id === "pleats" && tick % 3 === 0) {
      var fold = Math.floor(tick / 3),
        missing = [1, 2, 3, 4, 3, 2][fold % 6];
      dolls.forEach(function (doll, i) {
        if (i === missing) return;
        pleatPins(api, doll, i, missing, fold, d);
      });
    } else if (id === "basting" && tick % 3 === 0) {
      // The pattern takes a tracing of the player's position, then commits to it.
      var turn = Math.floor(tick / 3),
        tracer = dolls[turn % 2];
      // Two chalk strokes, then lift the pen for the scissors. A continuous
      // stream of converging tracings would close the return at high rank.
      if (turn % 3 === 2) return;
      var target = tools.bearing(tracer, s.player);
      var count = 11 + fine * 2;
      for (var n = 0; n < count; n++) {
        var offset = (n / (count - 1) - 0.5) * 1.55;
        api.bullet(
          tracer.x,
          tracer.y,
          down + offset,
          speed * 0.67,
          tracer.color,
          "rice",
          {
            redirect: {
              at: 0.95,
              angle: target + offset * 0.32,
              speed: speed,
              duration: 0.38,
            },
          }, n === Math.floor(count / 2) ? "bobbin" : n % 3 === 0 ? "needle" : "ribbon"
        );
      }
    } else if (id === "curtaincall") {
      var door = [1, 2, 3, 4, 3, 2][Math.floor(tick / 12) % 6];
      if (tick % 12 === 0) {
        [door - 1, door + 1].forEach(function (i) {
          var doll = dolls[i];
          api.laser(doll.x, doll.y, down, 3.5, 1.2, 0.88, ivory);
        });
      }
      if (tick % 4 === 0)
        dolls.forEach(function (doll, i) {
          if (i !== door)
            stitch(api, doll, down + hand * 0.025, 4 + fine, speed, tools);
        });
    }
  }
  var api = {
    cards: cards,
    emitters: emitters,
    advanceHem: advanceHem,
    emit: emit,
    interlude: interlude,
    bossPosition: bossPosition,
  };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.DanmakuAlicePatterns = api;
})(typeof window !== "undefined" ? window : globalThis);
