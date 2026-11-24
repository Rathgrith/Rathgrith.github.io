/* Patchouli writes by rule: blanks, revisions and footnotes are playable instructions. */
(function (scope) {
  "use strict";
  var ink = "#c7a4f0",
    paper = "#f5dcad",
    blue = "#9cddea",
    rose = "#ecaece",
    sun = "#ffdf83",
    moon = "#b4dfff",
    down = Math.PI / 2;
  var cards = [
    { id: "bookmark", name: "索引「余白に棲む栞」", interlude: "空欄の目次" },
    {
      id: "marginalia",
      name: "傍注「行間を歩くインク」",
      interlude: "左頁の走り書き",
      cue: "墨のしぶきが開く間を抜ける",
    },
    { id: "erratum", name: "正誤「明日の誤植」", interlude: "消し残した一字" },
    {
      id: "concordance",
      name: "対訳「同じ月の異なる綴り」",
      interlude: "ふたつの脚韻",
      cue: "高い月の下、低い月の上へ",
    },
    {
      id: "footnote",
      name: "脚注「小さな字の逃げ道」",
      interlude: "参照先の小窓",
    },
    {
      id: "palimpsest",
      name: "重書「白紙へ還る夜」",
      interlude: "閉架の返却印",
      cue: "先に巻き戻る文字を追う",
    },
  ];
  function bossPosition(s) {
    var t = s.enemySpell.age;
    return { x: 120 + 16 * Math.sin(t * 0.38), y: 51 + 8 * Math.sin(t * 0.53) };
  }
  function emitters(s) {
    var t = s.enemySpell.age,
      slide = 12 * Math.sin(t * 0.58);
    return [
      { x: 46 + slide, y: 65, kind: "element", color: ink },
      { x: s.boss.x, y: s.boss.y + 9, kind: "element", color: paper },
      { x: 194 - slide, y: 65, kind: "element", color: blue },
    ];
  }
  function interlude(s, tick, api, d, tools) {
    if (tick % 4) return;
    var pass = tick / 4,
      books = emitters(s),
      book = books[(pass + d.stage) % 3];
    // Leave the aisle towards the reader blank, even in the more crowded edition.
    var blank = tools.bearing(book, s.player);
    tools.ring(
      api,
      book,
      24 + 2 * d.density,
      pass * 0.22,
      d.speed * 0.78,
      book.color,
      "amulet",
      blank,
      0.24
    );
    if (pass % 3 === 1)
      tools.fan(
        api,
        books[1],
        down,
        6 + d.density,
        1.55,
        d.speed * 0.68,
        rose,
        "rice"
      );
  }
  // Coordinates run from the gutter to the outside edge of one facing page.
  // Each stroke is typeset in the upper field and released as a moving contour.
  var editions = {
    bookmark: [
      [[[0,0],[.22,-.35],[.61,-.65],[1,-.57],[.90,.44],[.50,.51],[.15,.76],[0,.94],[0,0]]],
      [[[0,.75],[.22,.09],[.50,-.58],[.80,-.94],[1,-.82],[.87,-.45],[.68,-.41],[.80,-.94]],
       [[.10,.89],[.46,.67],[.78,.73],[1,.92]]],
    ],
    marginalia: [
      [[[.88,-1],[.39,-.96],[.23,-.68],[.26,-.31],[.10,-.08],[0,0],[.27,.21],[.34,.58],[.32,.83],[.55,.96],[.86,1]]],
      [[[.93,-.94],[.54,-1],[.17,-.80],[.02,-.47],[.19,-.16],[.64,.07],[.90,.35],[.90,.71],[.61,.95],[.22,1]],
       [[.71,-.72],[.47,-.74],[.35,-.59],[.51,-.47]]],
    ],
    erratum: [
      [[[.07,-.80],[.91,.76]],[[.91,-.80],[.07,.76]],
       [[.04,.93],[.98,.93]]],
      [[[.03,.41],[.32,-.61],[.53,.40]],[[.42,.72],[.73,-.92],[.99,.52]],
       [[.20,.88],[.82,.88]]],
    ],
    concordance: [
      [[[.06,-.99],[.23,-.73],[.43,-.42],[.73,-.08],[.92,.04],[.70,.19],[.41,.57],[.19,.88],[.06,1]],
       [[.54,-.95],[.62,-.57],[.86,-.22],[1,.04],[.82,.38],[.64,.65],[.57,.96]]],
      [[[.04,-.84],[.68,-.84],[.68,.75],[.04,.75]],
       [[.26,-.55],[.96,-.55],[.96,1],[.26,1]],
       [[.07,-.15],[.51,-.15]]],
    ],
    palimpsest: [
      [[[.02,-.26],[.27,-.73],[.63,-.90],[.95,-.39],[.91,.38],[.61,.89],[.23,.71],[.02,-.26]],
       [[.15,-.34],[.52,-.64],[.81,-.26],[.71,.41],[.33,.50],[.15,-.34]]],
      // The paired half-stars meet along a punctuated vertical seam.
      [[[0,-1],[.27,-.26],[1,-.18],[.49,.29],[.66,.99],[0,.54]],
       [[.04,-.59],[.25,-.13],[.68,-.06],[.35,.22],[.44,.61],[.04,.38]]],
    ],
  };
  // Give marks on the same stroke a shared silhouette. The larger stamp goes
  // at a fold, a terminal or a change of pen, leaving room between contours.
  function strokeStyle(id, layer, side, corner, terminal) {
    if (id === "bookmark") return terminal ? "folio" : corner ? "crystal" : layer ? "quill" : "rice";
    if (id === "marginalia") return terminal ? "seal" : layer ? "crystal" : corner ? "smallorb" : "quill";
    if (id === "erratum") return layer === 2 ? (terminal ? "seal" : "quill") : corner ? "scale" : "saber";
    if (id === "concordance") return corner ? "seal" : layer ? "quill" : side < 0 ? "folio" : "crystal";
    return layer ? (corner ? "crystal" : "seal") : terminal ? "folio" : "scale";
  }
  function ribbonCaps(i, n) {
    return i === 0 || i === n - 1 ? "folio" : "quill";
  }
  function nibEnds(i, n) {
    return i === 0 || i === n - 1 ? "seal" : i * 2 < n ? "smallorb" : "quill";
  }
  function footnotes(tick, api, d, books) {
    var sheet = Math.floor(tick / 8), slot = tick % 8;
    if (sheet % 3 === 0 || (slot !== 0 && slot !== 3)) return;
    var lead = (sheet + d.part) % 2 ? -1 : 1, side = slot ? -lead : lead;
    var book = books[side < 0 ? 0 : 2], gutter = 120 + 18 * Math.sin(sheet * .65);
    var n = 8 + d.density * 2, edge = side > 0 ? 226 : 14;
    for (var i = 0; i < n; i++) {
      var u = i / (n - 1), angle = u * Math.PI * 2;
      // Hooks then double-daggers. The conspicuous dots stay put until they
      // divide; their former centreline is available as soon as they split.
      var fraction = d.part === 1 ? .5 - .38 * Math.cos(angle) : u;
      var x = gutter + side * 44 + (edge - gutter - side * 44) * fraction;
      var y = d.part === 1 ? 109 + 29 * Math.sin(angle) + 11 * u :
        120 - 26 * Math.cos(angle * 1.5) + 9 * Math.sin(angle);
      var speed = d.speed * 1.4, arrival = Math.hypot(x - book.x, y - book.y) / speed;
      var hold = Math.max(1.45, arrival + .24) + (d.part === 1 ? u : 1 - u) * .42;
      var away = side * .06;
      var spread = Math.min(d.part === 1 ? .54 : .7,
        2 * Math.atan((Math.abs(x - gutter) - 21) / (282 - y)));
      api.bullet(book.x, book.y, Math.atan2(y - book.y, x - book.x), speed,
        slot ? blue : paper, "bubble", {
          decelerate:{from:arrival, to:arrival + .001, speed:0},
          release:{at:hold, angle:down - away, speed:1},
          split:{at:hold, count:2, spread:spread, speed:d.speed,
            color:slot ? ink : rose, shape:"rice", visualStyle:["smallorb", "quill"]},
        }, i === 0 || i === n - 1 ? "largeorb" : "seal");
    }
  }
  function typeset(s, tick, api, d, books) {
    var sheet = Math.floor(tick / 8), slot = tick % 8, id = s.enemySpell.id;
    if (id === "footnote") { footnotes(tick, api, d, books); return; }
    if (sheet % 3 === 0) return; // The central volume takes a solo for its seal.
    var answer = { bookmark: 1, marginalia: 2, erratum: 3, concordance: 2, palimpsest: 2 }[id];
    if (slot !== 0 && slot !== answer) return;
    var lead = (sheet + d.part) % 2 ? -1 : 1;
    var strokes = editions[id][d.part - 1];
    var gutter = 120 + 30 * Math.sin(sheet * .62 + d.stage * .7);
    var middle = 112 + 7 * Math.sin(sheet * .72);
    var letter = id === "palimpsest" || id === "erratum" ? "amulet" : "rice";
    [-1, 1].forEach(function (side) {
      var pageWidth = side < 0 ? gutter - 31 : 209 - gutter;
      var advance = side * (id === "bookmark" ? -.065 : 0);
      var turn = Math.sin(sheet * .48) * .065;
      var release = 1.48 + (id === "erratum" || id === "marginalia" ? (side > 0 ? .26 : 0) : 0);
      strokes.forEach(function (stroke, layer) {
        // Marks on the facing page answer the leading book. In the star chart,
        // the side volumes lay out both edges before the centre inscribes its core.
        var delayed = id === "palimpsest" ? layer > 0 : side !== lead;
        if (slot !== (delayed ? answer : 0)) return;
        // Sample by physical length so corners and unequal segments retain an even grain.
        var path = stroke.map(function (point) {
          var yy = point[1], xx = point[0];
          if (id === "concordance" && side > 0 && d.part === 1) yy = -yy;
          var wobble = id === "marginalia" ? 4 * Math.sin(yy * 2.2 + sheet * .67) : 0;
          return { x: gutter + side * (21 + xx * pageWidth) + wobble, y: middle + yy * 33 };
        });
        var from = path[0], walked = 0, next = 0;
        var pitch = (id === "palimpsest" ? 8.3 : 7.8) - d.density * .42;
        for (var j = 1; j < path.length; j++) {
          var to = path[j], dx = to.x - from.x, dy = to.y - from.y;
          var distance = Math.hypot(dx, dy);
          while (next <= walked + distance) {
            var u = (next - walked) / distance;
            var x = from.x + dx * u, y = from.y + dy * u;
            var source = books[side < 0 ? 0 : 2];
            if ((id === "palimpsest" && layer) ||
                (id === "erratum" && layer === 2)) source = books[1];
            var vx = x - source.x, vy = y - source.y, speed = d.speed * 1.4;
            var arrival = Math.hypot(vx, vy) / speed;
            var hold = Math.max(release, arrival + .10);
            var motion = { decelerate: { from: arrival, to: arrival + .001, speed: 0 },
              release: { at: hold, angle: down + advance + turn, speed: d.speed * (layer ? .90 : 1) } };
            if (id === "concordance") {
              // The translation arrives on the opposite leaf. The trailing voice
              // crosses later; below the crossover both voices leave an aisle.
              var translation = gutter - side * (25 + Math.abs(x - gutter) * .52);
              motion.release.angle = Math.atan2(282 - y, translation - x);
              motion.release.at += side === lead ? 0 : d.part * .22;
            } else if (id === "erratum") {
              // Strike through the row horizontally. At its end the nib pivots
              // straight into the correction; the lower margin stays open.
              var margin = gutter + side * 56, dxToMargin = margin - x;
              var editTime = d.part === 2 ? .70 : .52;
              var cut = Math.min(Math.abs(dxToMargin) + 3, 35);
              motion.release.angle = dxToMargin < 0 ? Math.PI : 0;
              motion.release.speed = cut / editTime;
              var hinge = x + (dxToMargin < 0 ? -cut : cut);
              var corrected = gutter + side * (30 + Math.abs(x - gutter) * .54);
              motion.redirect = {at:hold + editTime,
                angle:Math.atan2(282 - y, corrected - hinge), speed:d.speed};
            }
            var col = layer ? (d.part === 2 ? rose : paper) : side < 0 ? ink : blue;
            var nearStart = u * distance < pitch * .48, nearEnd = (1 - u) * distance < pitch * .48;
            var terminal = (j === 1 && nearStart) || (j === path.length - 1 && nearEnd);
            api.bullet(source.x, source.y, Math.atan2(vy, vx), speed, col, letter, motion,
              strokeStyle(id, layer, side, nearStart || nearEnd, terminal));
            next += pitch;
          }
          walked += distance; from = to;
        }
      });
    });
  }
  var seals = {
    bookmark: ["hypo", 3, 27, .83, "rice", "folio"],
    marginalia: ["cycloid", 4, 29, .80, "quill", "smallorb"],
    erratum: ["lissajous", 3, 31, .78, "saber", "scale"],
    concordance: ["epi", 4, 25, .72, "folio", "crystal"],
    footnote: ["rose", 3, 29, .82, "smallorb", "seal"],
    palimpsest: ["hypo", 5, 33, .90, "scale", "crystal"],
  };
  function seal(s, tick, api, d, books, tools) {
    var id = s.enemySpell.id;
    // Let the first erratum pause, and the first footnote divide, before the seal.
    var first = !d.part && (id === "erratum" || id === "footnote") ? 4 : 0;
    if (tick % 24 !== first) return false;
    var motif = seals[id], pass = Math.floor(tick / 3), sheet = Math.floor(tick / 24);
    var x = id === "bookmark" ? shelves[Math.floor(pass / 3) % shelves.length] :
      id === "concordance" ? 106 + 42 * Math.sin(pass * .2) :
      120 + 30 * Math.sin(sheet * .62 + d.stage * .7);
    tools.figure(api, books[1], {
      curve: motif[0], lobes: motif[1], count: 34,
      angle: (sheet % 4) * Math.PI / 9 + d.part * .19, spread: motif[2], fall: 51 + d.stage,
      depth: motif[3], color: id === "erratum" ? rose : id === "footnote" ? paper : ink,
      shape: id === "footnote" ? "smallstar" : id === "marginalia" ? "rice" : "amulet",
      visualStyle: function (i, count) {
        var stroke = i * motif[1] / count;
        return Math.abs(stroke - Math.round(stroke)) < .14 ? motif[5] : motif[4];
      },
      gap: .14 + (sheet % 3) * .18, gapWidth: .10, phase: d.part * .24,
      lane: {x:x, y:id === "concordance" ? 282 : 292, halfWidth:25},
    });
    return true;
  }
  // The second scribe reads the same sunlit mark twice; the final edition
  // quotes it three times. The drifting tail is the correction left behind.
  function solarMarginalia(s, tick, api, d, tools) {
    var card = s.enemySpell;
    if (tick % 14 === 1) {
      tools.lockAim(s, sun, .50);
      card.solarRow = 0;
      card.solarCount = d.part === 2 ? 3 : 2;
      return;
    }
    var row = card.solarRow;
    if (row === undefined) return;
    var bearing = tools.aimBearing(s, s.boss);
    if (bearing === null || s.time - card.sight.ready < row * .19) return;
    card.solarRow++;
    if (row === card.solarCount) {
      delete card.solarRow;
      // Bound the randomness to the marked passage. Stratification keeps the
      // tail irregular without stacking every correction on the same escape.
      var count = 5 + d.density;
      for (var i = 0; i < count; i++) {
        var u = (i + .16 + .68 * tools.scatter(s, tick, i)) / count;
        var speed = 86 + 34 * tools.scatter(s, tick, count + i);
        api.bullet(s.boss.x, s.boss.y, bearing + (u - .5) * .91, speed,
          paper, "rice", undefined, i % 2 ? "smallorb" : "quill");
      }
      return;
    }
    var nibs = 5 + 2 * Math.floor(d.density / 2), middle = (nibs - 1) / 2;
    for (var nib = 0; nib < nibs; nib++) {
      var lead = nib === middle;
      var tilt = (nib - middle) / middle * (.075 + row * .013);
      api.bullet(s.boss.x, s.boss.y, bearing + tilt,
        179 + row * 7 - Math.abs(nib - middle) * 2,
        lead ? sun : rose, lead ? "amulet" : "rice", undefined, lead ? "solar" : "quill");
    }
  }

  // Both translations leave their missing word on the same horizontal line.
  // A speed ladder in each radial ray carries that blank down the field.
  function lunarConcordance(tick, api, d, books, tools) {
    if (tick % 24 !== 4) return;
    var edition = Math.floor(tick / 24), reverse = (edition + d.part) % 2;
    var y = d.part === 2 ? 250 : 228, crossingTime = 1.68;
    var offset = reverse ? 11 : -11;
    var desks = [[28, 111], [61, 179], [129, 212]];
    books.forEach(function (book, desk) {
      desks[desk].forEach(function (targetX, line) {
        var x = targetX + offset, angle = Math.atan2(y - book.y, x - book.x);
        var count = 17 + d.density, cut = 5 + (desk + line + edition) % 3;
        var skip = 5, step = 4.6;
        var middle = cut + (skip - 1) / 2;
        var speed = Math.hypot(x - book.x, y - book.y) / crossingTime - middle * step;
        tools.spoke(api, book, angle, {
          count:count, speed:speed, step:step, cut:cut, skip:skip,
          color:line ? moon : ink, shape:"rice",
          visualStyle:function (i) {
            return i === cut - 1 || i === cut + skip ? "lunar" : line ? "quill" : "smallorb";
          },
        });
      });
    });
  }
  var weekdays = [
    ["#f3aaa2", "saber"], ["#93d7ed", "crystal"], ["#b3deb0", "quill"],
    ["#f0d29a", "saber"], ["#ccaddc", "folio"], [sun, "solar"], [moon, "lunar"],
  ];
  var shelves = [52, 94, 140, 184, 140, 94];
  // At a common flight time, the dots outline the tilted ecliptic. Project the
  // moving shelf back onto that ellipse so both rims leave the same passage.
  function eclipticIndex(tick, api, d, book) {
    var interval = d.part ? 16 : 9;
    if (tick % interval !== 2) return;
    var page = Math.floor(tick / interval), element = weekdays[page % weekdays.length];
    var gate = d.part ? 120 + 30 * Math.sin(Math.floor(tick / 8) * .62) : shelves[page % shelves.length];
    var spokes = 6 + Math.floor(d.density / 2), count = 7 * spokes;
    var hand = page % 2 ? -1 : 1;
    for (var i = 0; i < count; i++) {
      var angle = 2 * Math.PI * (i + .5) / count;
      var lane = 120 + 113 * Math.cos(angle), distance = Math.abs(lane - gate);
      if (distance < 21) continue;
      var y = 230 + 29 * Math.sin(angle) + hand * (lane - 120) * .19;
      var x = book.x + (lane - book.x) * (y - book.y) / (292 - book.y);
      var dx = x - book.x, dy = y - book.y;
      var marker = i % spokes === 0, lip = distance < 32;
      var style = lip ? "folio" : marker ? element[1] : "smallorb";
      api.bullet(book.x, book.y, Math.atan2(dy, dx), Math.hypot(dx, dy) / 1.72,
        lip ? paper : marker || Math.sin(angle) > 0 ? element[0] : ink, "amulet", undefined, style);
    }
  }
  // The pens cross out successive calendar entries. Read the red stroke,
  // then the gold counterstroke, before stepping into the erased column.
  function proofMarks(tick, api, d, books, tools) {
    if (tick % 16 !== 2) return;
    var date = Math.floor(tick / 16) + d.part, forward = date % 2 === 0;
    var column = {x:120 + 80 * Math.sin(date * 2 * Math.PI / 7), y:282};
    var sweep = (forward ? -1 : 1) * (.17 + d.part * .04);
    var redPen = books[forward ? 0 : 2], goldPen = books[forward ? 2 : 0];
    api.laser(redPen.x, redPen.y, tools.bearing(redPen, column), 3.2, 1.22, .54, rose, sweep);
    api.laser(goldPen.x, goldPen.y, tools.bearing(goldPen, column), 2.3, 1.85, .38, paper, -sweep);
  }
  // One marginal dagger at a time. First the beads travel from the actual
  // book into a cross and a hilt. After the pivot the entire glyph falls intact.
  function daggerNotes(tick, api, d, books) {
    if (tick % 8 !== 5) return;
    var note = Math.floor(tick / 8), hand = note % 2 ? -1 : 1;
    var book = books[hand < 0 ? 2 : 0], cx = 120 - hand * 44, cy = 115;
    var landing = 120 + 86 * Math.sin((note + d.part) * 2 * Math.PI / 7);
    var vy = 87 + d.part * 4, vx = (landing - cx) * vy / (290 - cy);
    var motion = { redirect:{ at:.82, angle:Math.atan2(vy, vx), speed:Math.hypot(vx, vy) } };
    var tint = hand < 0 ? blue : rose;
    function nib(x, y, style, color) {
      var dx = cx + x - book.x, dy = cy + y - book.y;
      api.bullet(book.x, book.y, Math.atan2(dy, dx), Math.hypot(dx, dy) / .82,
        color, "rice", motion, style);
    }
    var strokes = 8 + d.density;
    for (var j = 0; j <= strokes; j++) {
      var u = j / strokes;
      nib(0, -21 + 47 * u, j === strokes ? "saber" : "smallorb", tint);
    }
    nib(0, -29, hand < 0 ? "lunar" : "solar", hand < 0 ? moon : sun);
    for (var arm = -1; arm <= 1; arm += 2) {
      var width = 5 + Math.floor(d.density / 2);
      for (var k = 1; k <= width; k++) {
        var v = k / width;
        nib(arm * 28 * v, -10 + 9 * v - 9 * Math.sin(v * Math.PI),
          k === width ? "quill" : "smallorb", k === width ? paper : tint);
      }
    }
  }
  // A drop bursts against an invisible inkstone. The two shoulders of the
  // splash bend down again, leaving room to move in behind the falling drop.
  function inkFountains(tick, api, d, books) {
    var bar = Math.floor(tick / 12), beat = tick % 12;
    if (beat !== 2 && (beat !== 6 || (!d.part && bar % 2 === 0))) return;
    var right = (bar + (beat === 6 ? 1 : 0)) % 2;
    var book = books[right ? 2 : 0];
    var x = right ? 161 + 30 * Math.sin(bar) : 79 - 30 * Math.sin(bar);
    var y = 248 + (beat === 6 ? 20 : 0) + 15 * Math.cos(bar * .91);
    var angle = Math.atan2(y - book.y, x - book.x);
    var flight = 1.52, count = 8 + 2 * Math.floor(d.density / 2);
    api.bullet(book.x, book.y, angle, Math.hypot(x - book.x, y - book.y) / flight,
      right ? ink : blue, "bubble", {
        split: {at:flight, count:count, spread:2.52 / (count - 1),
          angleOffset:-down - angle, speed:93, shape:"rice", color:right ? moon : blue,
          visualStyle:["quill","crystal"],
          motion:{redirect:{at:.56, duration:.48, angle:down, speed:82}}},
      }, "largeorb");
  }
  // The facing books write at different heights. The sickle holds its shape
  // as the reader encounters the high line, then the low counter-reading.
  function facingMoons(tick, api, d, books) {
    var page = Math.floor(tick / 24), slot = tick % 24;
    if (slot !== 8 && slot !== 14) return;
    var right = (page + (slot === 14 ? 1 : 0)) % 2, hand = right ? -1 : 1;
    var book = books[right ? 2 : 0], cy = slot === 8 ? 249 : 311;
    var cx = right ? 229 : 11, flight = 1.66;
    var count = 10 + Math.floor(d.density / 2);
    var motion = {redirect:{at:flight, angle:right ? Math.PI : 0, speed:90}};
    for (var i = 0; i <= count; i++) {
      var angle = Math.PI * (i / count - .5), tip = i === 0 || i === count;
      var y = cy + 28 * Math.sin(angle);
      for (var rim = 0; rim < (tip ? 1 : 2); rim++) {
        var x = cx + hand * Math.cos(angle) * (rim ? 5 : 22);
        var dx = x - book.x, dy = y - book.y;
        api.bullet(book.x, book.y, Math.atan2(dy, dx), Math.hypot(dx, dy) / flight,
          rim ? paper : moon, "amulet", motion, tip ? "crystal" : rim ? "quill" : "smallorb");
      }
    }
  }
  // The lower line rolls up from its margin, letter by letter. The second
  // line is shorter and turns later. Only letters still on the page reverse.
  function unwrittenLines(tick, api, d, books) {
    if (tick % 20 !== 3) return;
    var page = Math.floor(tick / 20), right = page % 2;
    var book = books[right ? 2 : 0], flight = 1.54, count = 23 + d.density;
    for (var line = 0; line < 2; line++) {
      for (var i = line ? 4 : 0; i <= count - (line ? 2 : 0); i++) {
        var u = i / count, x = right ? 228 - 216 * u : 12 + 216 * u;
        // Paragraph indentation and word spaces survive the downward pass.
        if ((i + line * 2) % 7 === 3) continue;
        var y = 218 + line * 16 + 9 * Math.sin(Math.PI * u);
        var dx = x - book.x, dy = y - book.y;
        var reverse = flight + .38 + 1.06 * u + line * .09;
        var motion = {release:{at:flight, angle:down, speed:86},
          redirect:{at:reverse, duration:.21, angle:-down + (right ? -.13 : .13), speed:105}};
        var style = i % 7 === 4 ? "folio" : line ? "quill" : "smallorb";
        api.bullet(book.x, book.y, Math.atan2(dy, dx), Math.hypot(dx, dy) / flight,
          line ? paper : ink, "amulet", motion, style);
      }
    }
  }
  function emit(s, tick, api, d, tools) {
    var id = s.enemySpell.id,
      books = emitters(s),
      speed = d.speed,
      fine = d.density;
    if (id === "bookmark") eclipticIndex(tick, api, d, books[1]);
    if (id === "erratum") proofMarks(tick, api, d, books, tools);
    if (id === "footnote") daggerNotes(tick, api, d, books);
    if (id === "marginalia") inkFountains(tick, api, d, books);
    if (id === "concordance") facingMoons(tick, api, d, books);
    if (id === "palimpsest") unwrittenLines(tick, api, d, books);
    if (d.part && id === "marginalia") solarMarginalia(s, tick, api, d, tools);
    if (d.part && id === "concordance") lunarConcordance(tick, api, d, books, tools);
    if (seal(s, tick, api, d, books, tools)) return;
    if (d.part > 0) {
      typeset(s, tick, api, d, books);
      return;
    }
    var pass = Math.floor(tick / 3),
      book = books[pass % 3];
    if (id === "bookmark") {
      // Each line and its offbeat annotation point to the same travelling blank.
      var shelf = { x: shelves[Math.floor(pass / 3) % shelves.length], y: 292 };
      if (tick % 3 === 0) {
        var blank = tools.bearing(book, shelf);
        tools.ring(api, book, 43 + fine * 3, pass * 0.13, speed,
          book.color, "amulet", blank, 0.19, undefined, function (i, n) {
            var offset = pass * .13 + i * Math.PI * 2 / n - blank;
            return Math.abs(Math.atan2(Math.sin(offset), Math.cos(offset))) < .42 ? "folio" : "rice";
          });
      } else if (tick % 6 === 4) {
        var margin = books[(pass + 1) % 3];
        var opening = { angle: tools.bearing(margin, shelf), halfWidth: 0.19 };
        tools.fan(api, margin, tools.bearing(margin, { x: 120, y: shelf.y }),
          8 + fine, 1.18, speed, rose, "rice", undefined, opening, ribbonCaps);
      }
    } else if (id === "marginalia" && tick % 3 === 0) {
      var side = pass % 2 ? 1 : -1,
        edge = books[pass % 2 ? 2 : 0];
      // Ink flows towards the margin before the nib curls it into the text.
      tools.fan(
        api,
        edge,
        down - side * 0.34,
        13 + fine * 2,
        1.42,
        speed,
        edge.color,
        "rice",
        { turn: side * 0.68, decay: 0.74 }, undefined, nibEnds
      );
    } else if (id === "erratum" && tick % 4 === 0) {
      var n = 15 + fine * 2,
        turn = tick % 8 ? 1 : -1;
      for (var j = 0; j < n; j++) {
        var offset = j / (n - 1) - 0.5;
        // Pink lines pause in the upper field, then resume in the opposite slant.
        var heading = down + offset * 2.1;
        api.bullet(s.boss.x, s.boss.y, heading, speed, rose, "amulet", {
          decelerate: { from: 0.6, to: 1.05, speed: 0 },
          release: {
            at: 1.55,
            angle: down + turn * 0.32 - offset * 1.2,
            speed: speed,
          },
        }, Math.abs(offset) > .40 ? "scale" : "saber");
      }
    } else if (id === "concordance" && tick % 3 === 0) {
      var phase = pass * 0.68;
      [books[0], books[2]].forEach(function (b, i) {
        var angle = down + (i ? 1 : -1) * (0.23 + Math.sin(phase) * 0.38);
        var lane = {
          angle: tools.bearing(b, {
            x: 106 + 42 * Math.sin(pass * 0.2),
            y: 282,
          }),
          halfWidth: 0.2,
        };
        tools.fan(
          api,
          b,
          angle,
          8 + fine,
          1.3,
          speed * (i ? 0.79 : 1),
          b.color,
          i ? "bubble" : "amulet",
          undefined,
          lane,
          function (index, n) {
            return index === 0 || index === n - 1 ? "quill" : i ? "crystal" : "folio";
          }
        );
      });
    } else if (id === "footnote" && tick % 4 === 0) {
      // Follow the conspicuous parent; the fine print peels away, opening its former path.
      var n = 6 + fine;
      for (var i = 0; i < n; i++) {
        var parent =
          down + (i / (n - 1) - 0.5) * 1.8 + Math.sin(tick * 0.09) * 0.15;
        api.bullet(book.x, book.y, parent, speed * 0.68, paper, "bubble", {
          split: {
            at: 1.22,
            count: 2,
            spread: 0.92,
            speed: speed,
            color: ink,
            shape: "rice",
            visualStyle: ["smallorb", "quill"],
          },
        }, i === 0 || i === n - 1 ? "seal" : "largeorb");
      }
    } else if (id === "palimpsest" && tick % 3 === 0) {
      var page = Math.floor(pass / 3),
        currently = books[pass % 3];
      var gap = tools.bearing(currently, {
        x: 120 + 56 * Math.sin(page * 0.87),
        y: 294,
      });
      // Pale overwritten rows drift first; on the third beat the new script reads straight down.
      if (pass % 3 !== 2) {
        tools.ring(
          api,
          currently,
          34 + fine * 3,
          pass * 0.23,
          speed * 0.77,
          paper,
          "scale",
          gap,
          0.32,
          { turn: pass % 3 ? -0.14 : 0.14, decay: 1.1 }, "scale"
        );
      } else {
        [books[0], books[2]].forEach(function (b, i) {
          tools.fan(
            api,
            b,
            down + (i ? 0.22 : -0.22),
            8 + fine,
            1.1,
            speed,
            b.color,
            "rice", undefined, undefined, function (index, count) {
              return index === Math.floor(count / 2) ? "crystal" : "seal";
            }
          );
        });
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
  else scope.DanmakuPatchouliPatterns = api;
})(typeof window !== "undefined" ? window : globalThis);
