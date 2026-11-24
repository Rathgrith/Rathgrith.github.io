/* Rear-facing flight atlas shared by score attack and the flower duel. */
(function (scope) {
  "use strict";
  var assetBase = (scope.SiteAssets && scope.SiteAssets.base) || "";
  var poses = ["idle", "n", "ne", "e", "se", "s", "sw", "w", "nw"];
  // Generated sheets have irregular row spacing. Each rectangle is the visible
  // silhouette within its column/row, not a naïve equal-height source cell.
  var registration = {
    alice: {
      rows: [0, 322, 597],
      height: 247,
      bounds: [
        [81, 54, 269, 301],
        [92, 56, 278, 301],
        [93, 63, 273, 301],
        [55, 63, 237, 300],
        [53, 65, 240, 301],
        [51, 67, 247, 295],
        [66, 27, 268, 243],
        [70, 25, 273, 244],
        [76, 29, 273, 243],
        [50, 32, 244, 243],
        [40, 22, 254, 258],
        [20, 22, 234, 258],
        [66, 22, 265, 236],
        [70, 17, 270, 236],
        [61, 22, 267, 232],
        [50, 17, 260, 238],
        [53, 17, 256, 232],
        [50, 18, 241, 238],
      ],
    },
    marisa: {
      rows: [0, 304, 598],
      height: 277,
      bounds: [
        [75, 16, 275, 291],
        [74, 25, 274, 291],
        [64, 16, 260, 291],
        [49, 16, 254, 291],
        [40, 28, 259, 296],
        [36, 28, 256, 293],
        [28, 14, 276, 270],
        [29, 18, 278, 274],
        [66, 18, 281, 272],
        [66, 18, 275, 277],
        [42, 8, 239, 284],
        [36, 8, 243, 285],
        [55, 10, 290, 263],
        [53, 10, 290, 263],
        [54, 15, 296, 263],
        [55, 15, 294, 263],
        [46, 12, 283, 267],
        [42, 12, 273, 264],
      ],
    },
    patchouli: {
      rows: [0, 248, 477],
      height: 232,
      bounds: [
        [77, 12, 293, 241],
        [76, 12, 292, 241],
        [67, 12, 301, 244],
        [56, 12, 298, 244],
        [79, 12, 322, 241],
        [74, 12, 323, 241],
        [77, 4, 329, 213],
        [73, 4, 330, 213],
        [75, 14, 340, 218],
        [74, 14, 340, 218],
        [57, 4, 313, 227],
        [55, 4, 311, 227],
        [37, 3, 290, 218],
        [36, 3, 290, 218],
        [37, 3, 300, 218],
        [34, 3, 296, 218],
        [43, 10, 294, 219],
        [41, 10, 293, 220],
      ],
    },
  };
  var sheets = {},
    pending;
  function register(image, id) {
    var atlas = document.createElement("canvas"),
      reg = registration[id],
      k = 38 / reg.height;
    atlas.width = 48 * 6;
    atlas.height = 48 * 3;
    var ctx = atlas.getContext("2d");
    // Match the boss atlas: reduce once, then preserve these native pixels when
    // drawing. A single character scale keeps directional poses proportional.
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    reg.bounds.forEach(function (b, frame) {
      var col = frame % 6,
        row = Math.floor(frame / 6),
        left = Math.round((col * image.width) / 6),
        width = b[2] - b[0] + 2,
        height = b[3] - b[1] + 2;
      ctx.save();
      ctx.beginPath();
      ctx.rect(col * 48, row * 48, 48, 48);
      ctx.clip();
      ctx.translate(col * 48 + 24, row * 48 + 44);
      // The generated SE broom pair banks west; mirror that pair only. All
      // other directions have their own drawn hair, sleeve and skirt poses.
      if (id === "marisa" && (frame === 8 || frame === 9)) ctx.scale(-1, 1);
      ctx.drawImage(
        image,
        left + b[0] - 1,
        reg.rows[row] + b[1] - 1,
        width,
        height,
        (-width * k) / 2,
        -height * k,
        width * k,
        height * k
      );
      ctx.restore();
    });
    return atlas;
  }
  function load() {
    if (pending) return pending;
    pending = Promise.all(
      Object.keys(registration).map(function (id) {
        return new Promise(function (resolve) {
          var image = new Image();
          image.onerror = resolve;
          image.onload = function () {
            sheets[id] = register(image, id);
            resolve();
          };
          image.src =
            assetBase + "/assets/images/classic/danmaku/players/" + id + ".png";
        });
      })
    );
    return pending;
  }
  function frameIndex(time, pose, reduced) {
    var direction = Math.max(0, poses.indexOf(pose || "idle"));
    return (
      direction * 2 + (reduced ? 0 : Math.floor(Math.max(0, time || 0) * 6) % 2)
    );
  }
  function draw(ctx, id, x, y, time, pose, reduced, size, flight) {
    var sheet = sheets[id];
    if (!sheet) return false;
    time = time || 0;
    var frame = frameIndex(time, pose, reduced);
    size = size || 32;
    var sx = (frame % 6) * 48, sy = Math.floor(frame / 6) * 48;
    var scale = size / 48, top = -size * 0.58;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (reduced) {
      ctx.drawImage(sheet, sx, sy, 48, 48, Math.round(x - size / 2), Math.round(y + top), size, size);
    } else {
      // The torso banks around the collision core while the hem and hair trail
      // behind it. Source strips meet exactly even on fractional canvas scales.
      var phase = time * (id === "marisa" ? 5.1 : id === "alice" ? 4.5 : 3.7);
      var bank = flight ? flight.bank || 0 : 0, pitch = flight ? flight.pitch || 0 : 0;
      ctx.translate(x, y + Math.sin(phase) * scale * 1.3 + pitch * scale);
      ctx.rotate(bank * 0.11 + Math.sin(phase * 0.51) * 0.018);
      var bounds = [0, 27, 34, 41, 48];
      for (var i = 0; i < 4; i++) {
        var at = bounds[i], height = bounds[i + 1] - at;
        var sway = (Math.sin(phase - i * 0.44) * 0.72 - bank * 0.90) * i * scale;
        ctx.drawImage(sheet, sx, sy + at, 48, height,
          -size / 2 + sway, top + at * scale, size, height * scale);
      }
    }
    ctx.restore();
    return true;
  }

  // Native logical pixels keep a lance tip and the edge of a kite shield visible
  // in the small duel field. Equipment pivots around the doll, in world space.
  var knightArt = {};
  var knightPalette = {
    o: "#292638", g: "#bc8655", h: "#f6d89a", w: "#eee6d7", d: "#74647c",
    r: "#bc576d", p: "#f6adaa", b: "#5d7e9d", c: "#a7ccdb", s: "#8fadc1",
    m: "#587288", i: "#cbdbe2", f: "#f9f3d8", y: "#c4a266", t: "#754e42",
  };
  var knightPixels = {
    lanceKnight: [
      "   rro orr   ", "   prrorpr   ", "  oggghggo   ", "  oghhhhggo  ",
      "  ohghhghgo  ", "  oggghgggo  ", "   owgggoo   ", "   obwcbo    ",
      "   owbbwo    ", "  obbccbbo   ", "  obbwwbbo   ", " obbcwwbcbo  ",
      "  owfwwfwo   ", "   oo ooo    ", "   ot  ot    ",
    ],
    bladeKnight: [
      "   ooowoo    ", "  owwrrwwo   ", " owwppprwwo  ", " ogghhhhgo   ",
      " oghhhghhgo  ", "  ogghhghgo  ", "  orwgggro   ", "   orypro    ",
      "   owrrwo    ", "  orrwwrro   ", " orrrywrrro  ", " orrpwwprro  ",
      "  owwffwwo   ", "   ot  oto   ", "   oo  oo    ",
    ],
    shieldKnight: [
      "    ooo      ", "   ommioso   ", "  osiiiiiso  ", "  omyssysmo  ",
      "  oghhhhggo  ", "  ogghghggo  ", "   odggdoo   ", "   ossmso    ",
      "   omyymo    ", "  ommcsmmo   ", "  obbwwbbo   ", " obbcwwbcbo  ",
      "  owiwiwo    ", "   om  om    ", "   oo  oo    ",
    ],
    lance: [
      "    f    ", "   ofo   ", "   ifs   ", "  oifso  ", "  oismo  ",
      "   oso   ", " rryy    ", " oppty   ", "  rory   ", "    y    ",
      "    y    ", "    y    ", "    y    ", "    y    ", "    y    ",
      "    y    ", "    y    ", "    t    ", "   oro   ", "    t    ",
      "    y    ", "    y    ", "    o    ",
    ],
    blade: [
      "        f", "       if", "      isf", "     oisf", "     misf",
      "    omisf", "    misff", "    misfo", "   omisfo", "   omsif ",
      "   omsif ", "   omsif ", "   omsif ", "   omifo ", "   omifo ",
      "   oifo  ", "   oifo  ", "   ofo   ", "  yyfy   ", " oyoyyyo ",
      "    t    ", "    r    ", "    t    ", "    y    ",
    ],
    sword: [
      "   f  ", "  ofo ", "  ifs ", "  ifs ", "  ifs ", "  ifo ", "  ifo ",
      "  if  ", "  if  ", "  if  ", " oyyyo", "   t  ", "   r  ", "   y  ",
    ],
    shield: [
      "  oo oo  ", " osifiso ", "oysbbbsyo", "oybcwcbyo", "oybcwcbyo",
      "ombyyybmo", " ombwbmo ", " osbwbso ", "  omwmo  ", "   oyo   ", "    o    ",
    ],
  };
  function knightSprite(name) {
    if (knightArt[name]) return knightArt[name];
    var rows = knightPixels[name], canvas = document.createElement("canvas");
    canvas.width = rows[0].length;
    canvas.height = rows.length;
    var c = canvas.getContext("2d");
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) {
        var color = knightPalette[row[x]];
        if (color) {
          c.fillStyle = color;
          c.fillRect(x, y, 1, 1);
        }
      }
    });
    knightArt[name] = canvas;
    return canvas;
  }
  function puppetHands(field, reduced, time) {
    var p = field.player, dolls = field.weapon.dolls;
    return [-1, 1].map(function (side, hand) {
      var raised = 0, reach = 0;
      var split = Math.ceil(dolls.length / 2);
      var start = hand ? split : 0, end = hand ? dolls.length : split;
      for (var i = start; i < end; i++) {
        var d = dolls[i];
        if (d.phase === "windup") raised = Math.max(raised, reduced ? 0.75 : Math.min(1, d.age * 10));
        if (d.phase === "return") raised = Math.max(raised, reduced ? 0.5 : Math.max(0, 1 - d.age * 3));
        if (d.phase === "strike") reach = 1;
      }
      var wrist = reduced ? 0 : Math.sin((time || 0) * 4 + side) * 0.6;
      return { x: Math.round(p.x + side * (9 + 3 * reach - raised)),
        y: Math.round(p.y - 3 - 5 * raised - reach + wrist) };
    });
  }
  function drawPuppeteerHands(ctx, field, reduced, time) {
    if (!field.weapon || !field.weapon.dolls.length) return;
    var p = field.player;
    var hands = puppetHands(field, reduced, time);
    ctx.save();
    // Alice's lace-edged blue mantle and the ribbon tied at the nape mark her back.
    var cx = Math.round(p.x), cy = Math.round(p.y);
    ctx.fillStyle = "#567caa";
    ctx.fillRect(cx - 4, cy - 4, 8, 2);
    ctx.fillStyle = "#ecd9c6";
    ctx.fillRect(cx - 4, cy - 2, 3, 1); ctx.fillRect(cx + 1, cy - 2, 3, 1);
    ctx.fillStyle = "#aa4f66";
    ctx.fillRect(cx - 2, cy - 5, 2, 2); ctx.fillRect(cx + 1, cy - 5, 2, 2);
    hands.forEach(function (h, index) {
      var side = index ? 1 : -1, elbowX = cx + side * 7;
      ctx.lineJoin = "round";
      ctx.beginPath(); ctx.moveTo(cx + side * 5, cy - 3);
      ctx.lineTo(elbowX, cy); ctx.lineTo(h.x, h.y);
      ctx.strokeStyle = "#443849"; ctx.lineWidth = 3.1; ctx.stroke();
      ctx.strokeStyle = "#d5c8c3"; ctx.lineWidth = 1.7; ctx.stroke();
      ctx.fillStyle = "#eacfaf"; ctx.fillRect(h.x - 1, h.y - 1, 2, 2);
      ctx.fillStyle = "#b99762"; ctx.fillRect(h.x - 2, h.y - 2, 4, 1);
    });
    ctx.restore();
  }
  function drawKnight(ctx, d, index, reduced, time) {
    var arm = d.arm || ["lance", "blade", "shield"][index % 3];
    var guard = d.role === "guard", striking = d.phase === "strike", windup = d.phase === "windup";
    var facing = Number.isFinite(d.facing) ? d.facing : -Math.PI / 2;
    var side = index % 2 ? -1 : 1;
    var x = Math.round(d.x), y = Math.round(d.y);
    if (!reduced && !striking && !windup) y += Math.round(Math.sin((time || 0) * 4.5 + index));
    var body = knightSprite(arm + "Knight");
    // Stand-up dolls keep a legible rear silhouette; only the weapon sweeps the
    // full bearing. A lunge leans the shoulders a few pixels into its strike.
    var lean = striking ? 1 : windup ? -1 : 0;
    ctx.drawImage(body, x - 6 + Math.round(Math.cos(facing) * lean),
      y - 7 + Math.round(Math.sin(facing) * lean));
    var sword = arm === "shield", slash = guard || arm === "blade";
    var weapon = sword ? "sword" : arm;
    var angle = facing + side * 0.28;
    var swing = Math.max(0, Math.min(1, ((d.swing || 0) - 0.58) / 0.42));
    if (windup) angle = slash ? facing - 1.14 : facing;
    if (striking) angle = slash ? facing - 1.14 + swing * 2.28 : facing;
    if (d.phase === "return") angle = slash ? facing + 0.85 : facing + 0.12 * side;
    var grip = striking ? 0 : side * (arm === "blade" ? 3 : 4);
    var reach = guard ? 15 : arm === "lance" ? 19 : 25;
    var restingReach = sword ? 10 : arm === "lance" ? 16 : 18;
    var extension = striking ? reach : windup ? restingReach - 3 : restingReach;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle + Math.PI / 2);
    var blade = knightSprite(weapon);
    var tipColumn = weapon === "blade" && striking ? blade.width - 1 : Math.floor(blade.width / 2);
    ctx.drawImage(blade, grip - tipColumn, -extension, blade.width,
      extension + (weapon === "lance" ? 5 : 2));
    ctx.fillStyle = "#e9d2ac"; ctx.fillRect(grip - 1, -1, 2, 2);
    ctx.restore();
    if (sword || (guard && arm === "blade")) {
      ctx.save();
      ctx.translate(x + Math.cos(facing) * 4, y + Math.sin(facing) * 4);
      // Shoulder shield stays in front of the defender and clear of the sword.
      var shield = knightSprite("shield");
      ctx.rotate(facing + Math.PI / 2);
      ctx.drawImage(shield, -side * 4 - 4, -4);
      ctx.restore();
    } else if (windup) {
      // A small flash on the gauntlet gives the same preparation cue without motion.
      ctx.fillStyle = "#f4d698"; ctx.fillRect(x - 1, y - 2, 2, 2);
    }
  }
  function drawKnightWake(ctx, d, reduced) {
    if (d.phase !== "strike" && d.phase !== "windup" && d.phase !== "sortie") return;
    ctx.save();
    ctx.translate(Math.round(d.x), Math.round(d.y));
    ctx.rotate(d.facing);
    var thrust = d.role === "lancer", blade = d.role === "blade";
    var tight = d.tension > 0.52;
    var tint = tight ? "#ffdcc8" : thrust ? "#a6e5e8" : blade ? "#f1b9c3" : "#f0d391";
    if (d.phase === "sortie") {
      // An unfurled pennant points away from the lance as the courier travels.
      ctx.fillStyle = "#7cafb9";
      ctx.beginPath(); ctx.moveTo(-3, -3); ctx.lineTo(-14, -5); ctx.lineTo(-10, -2);
      ctx.lineTo(-14, 0); ctx.lineTo(-3, -1); ctx.fill();
      ctx.fillStyle = "#e9d1ad"; ctx.fillRect(-4, -4, 2, 4);
    } else if (d.phase === "windup") {
      // Pull a pair of silk ribbons back along the axis of the coming blow.
      ctx.strokeStyle = tint; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-8, -6); ctx.lineTo(-11, -5);
      ctx.moveTo(-4, 4); ctx.lineTo(-9, 6); ctx.stroke();
    } else if (thrust) {
      var length = reduced ? 8 : 9 + 11 * Math.sin(Math.PI * d.swing);
      ctx.fillStyle = "#80b7c787";
      ctx.beginPath(); ctx.moveTo(5, -2); ctx.lineTo(-length, -3); ctx.lineTo(-4, 0);
      ctx.lineTo(-length + 4, 2); ctx.lineTo(5, 2); ctx.fill();
      ctx.fillStyle = tint; ctx.fillRect(14, -1, 6, 1);
    } else if (d.swing >= 0.58) {
      var turn = -1.14 + Math.min(1, (d.swing - 0.58) / 0.42) * 2.28;
      var reach = blade ? 24 : 15, tail = reduced ? 0.36 : 0.92;
      ctx.fillStyle = blade ? "#dc96b15c" : "#edce7e66";
      ctx.beginPath(); ctx.arc(0, 0, reach, turn - tail, turn);
      ctx.arc(0, 0, reach - 4, turn, turn - tail, true); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = tint; ctx.lineWidth = 0.85;
      ctx.beginPath(); ctx.arc(0, 0, reach, turn - tail * 0.62, turn); ctx.stroke();
    }
    if (tight && d.phase === "strike") {
      ctx.strokeStyle = "#f3afaa"; ctx.lineWidth = 1;
      ctx.beginPath();
      if (thrust) {
        ctx.moveTo(4, -3); ctx.lineTo(13, -2); ctx.lineTo(17, 0);
        ctx.moveTo(3, 3); ctx.lineTo(8, 2);
      } else if (d.swing >= 0.58) {
        ctx.arc(0, 0, blade ? 18 : 11, turn - 0.48, turn);
      }
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawPuppets(ctx, field, reduced, time) {
    var dolls = field.weapon.dolls, hands = puppetHands(field, reduced, time);
    ctx.imageSmoothingEnabled = false;
    dolls.forEach(function (d, i) {
      var hand = hands[i < dolls.length / 2 ? 0 : 1], x = Math.round(d.x), y = Math.round(d.y);
      var taut = d.phase === "strike" || d.phase === "windup";
      var tight = taut && d.tension > 0.52;
      ctx.strokeStyle = tight ? "#ffc2baba" : d.scouting ? "#8aced263" : taut ? "#e7c5bb79" : "#bdcfdf54";
      ctx.lineWidth = 0.65;
      ctx.beginPath(); ctx.moveTo(hand.x, hand.y - 2);
      var midX = (hand.x + x) / 2, midY = (hand.y + y) / 2;
      ctx.quadraticCurveTo(midX, midY + (taut ? 0 : 6), x, y);
      if (tight) {
        ctx.moveTo(hand.x + 2, hand.y - 1);
        ctx.quadraticCurveTo(midX + 3, midY + 3, x + 1, y + 1);
      }
      ctx.stroke();
      if (d.scouting) {
        var knot = reduced ? 0.55 : (d.age * 0.6 + i * 0.3) % 1;
        if (d.phase === "return") knot = 1 - knot;
        ctx.fillStyle = "#a4d0d5";
        ctx.fillRect(Math.round(hand.x + (x - hand.x) * knot),
          Math.round(hand.y + (y - hand.y) * knot + 12 * knot * (1 - knot)), 2, 1);
      }
    });
    dolls.forEach(function (d, i) {
      drawKnightWake(ctx, d, reduced);
      drawKnight(ctx, d, i, reduced, time);
    });
  }
  function drawMeleeTrace(ctx, fx, reduced, alpha) {
    var angle = Math.atan2(fx.ty - fx.y, fx.tx - fx.x);
    var range = Math.hypot(fx.tx - fx.x, fx.ty - fx.y);
    ctx.save();
    ctx.translate(fx.x, fx.y); ctx.rotate(angle);
    ctx.globalAlpha *= alpha * (reduced ? 0.5 : 0.75);
    ctx.lineWidth = 1.15;
    ctx.beginPath();
    if (fx.kind === "cleave") {
      ctx.strokeStyle = "#eab0a8";
      ctx.arc(0, 0, range, -0.62, 0);
    } else if (fx.kind === "parry") {
      ctx.strokeStyle = "#f1d28c";
      ctx.moveTo(range - 4, -4); ctx.lineTo(range, -1);
      ctx.moveTo(range + 4, 2); ctx.lineTo(range + 1, 0);
      ctx.moveTo(range, -6); ctx.lineTo(range + 1, -3);
    } else {
      ctx.strokeStyle = "#b1e0e7";
      ctx.moveTo(range * 0.22, 0); ctx.lineTo(range, 0);
      ctx.moveTo(range - 3, -2); ctx.lineTo(range, 0);
    }
    ctx.stroke(); ctx.restore();
  }

  function drawStarPods(ctx, pods, reduced) {
    pods.forEach(function (pod) {
      ctx.save();
      ctx.translate(Math.round(pod.x), Math.round(pod.y));
      ctx.rotate(pod.tilt);
      var recoil = reduced ? 0 : Math.round(2 * Math.min(1, pod.flash / 0.10));
      ctx.translate(0, recoil);
      ctx.fillStyle = "#372f40";
      ctx.fillRect(-4, -3, 8, 6); ctx.fillRect(-2, -5, 4, 9);
      ctx.fillStyle = "#c99454";
      ctx.fillRect(-3, -2, 6, 4); ctx.fillRect(-1, -4, 2, 7);
      ctx.fillStyle = "#d5edf0";
      ctx.fillRect(-1, -4, 2, 3); ctx.fillRect(-2, 1, 4, 1);
      // Cooling fins read as a small twin-barrel projector, even between shots.
      ctx.fillStyle = "#7b9dac"; ctx.fillRect(-4, -3, 1, 5); ctx.fillRect(3, -3, 1, 5);
      ctx.fillStyle = "#ffe2a1"; ctx.fillRect(-2, -5, 1, 2); ctx.fillRect(1, -5, 1, 2);
      if (pod.flash > 0) {
        var jet = reduced ? 4 : 3 + 6 * pod.flash / 0.10;
        ctx.fillStyle = "#91d4d8";
        ctx.beginPath(); ctx.moveTo(-3, -4); ctx.lineTo(-1, -7); ctx.lineTo(0, -5 - jet);
        ctx.lineTo(1, -7); ctx.lineTo(3, -4); ctx.fill();
        ctx.fillStyle = "#fff1ae"; ctx.fillRect(-1, -8, 2, 4);
      }
      ctx.restore();
    });
  }

  var elementalInk = {
    fire:  {cover: "#9d5261", ink: "#f2ab91", lines: ["  x  "," xx  "," x x ","x  xx","xxxxx"," xxx "]},
    water: {cover: "#526e96", ink: "#a6dfeb", lines: ["  x  ","  xx "," x xx","x   x","x x x"," xxx "]},
    wood:  {cover: "#557865", ink: "#bed99d", lines: ["  x  ","x x x"," xxx ","  x x","  xx ","  x  "]},
    metal: {cover: "#72688b", ink: "#e0dfed", lines: ["  x  ","  x  "," xxx ","xx xx"," xxx ","  x  "]},
    sun:   {cover: "#9e552c", ink: "#ffda75", lines: ["  x  ","x x x"," xxx ","xx xx"," xxx ","x x x"]},
    moon:  {cover: "#60628d", ink: "#c6d7ff", lines: ["  xx "," xx  ","xx   ","xx   "," xxx ","  xxx"]},
    earth: {cover: "#84673e", ink: "#e7c584", lines: ["  x  "," xxx ","x   x"," xxx ","x   x","xxxxx"]},
  };
  var seals = {};
  function seal(element, onPaper) {
    var key = element + (onPaper ? "-ink" : "");
    if (seals[key]) return seals[key];
    var art = elementalInk[element], stamp = document.createElement("canvas");
    stamp.width = 5; stamp.height = 6;
    var c = stamp.getContext("2d");
    c.fillStyle = onPaper ? art.cover : art.ink;
    art.lines.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) if (row[x] === "x") c.fillRect(x, y, 1, 1);
    });
    seals[key] = stamp;
    return stamp;
  }
  function bookLeaves(ctx, element) {
    var art = elementalInk[element];
    // Two sloping leaves meet in a recessed binding. The leather boards extend
    // beyond the paper and a ribbon emerges from the fore-edge.
    ctx.beginPath(); ctx.moveTo(-8, -4); ctx.lineTo(-3, -5); ctx.lineTo(0, -3);
    ctx.lineTo(4, -5); ctx.lineTo(8, -4); ctx.lineTo(8, 4); ctx.lineTo(4, 3);
    ctx.lineTo(0, 5); ctx.lineTo(-3, 3); ctx.lineTo(-8, 5); ctx.closePath();
    ctx.fillStyle = art.cover; ctx.fill();
    ctx.strokeStyle = "#392c41"; ctx.lineWidth = 1; ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-7, -4); ctx.lineTo(-3, -5); ctx.lineTo(0, -3);
    ctx.lineTo(0, 3); ctx.lineTo(-3, 1); ctx.lineTo(-7, 3); ctx.closePath();
    ctx.fillStyle = "#d8c3a7"; ctx.fill();
    ctx.beginPath(); ctx.moveTo(1, -3); ctx.lineTo(4, -5); ctx.lineTo(7, -4);
    ctx.lineTo(7, 3); ctx.lineTo(4, 2); ctx.lineTo(1, 4); ctx.closePath();
    ctx.fillStyle = "#f3dfbf"; ctx.fill();
    ctx.fillStyle = "#968395"; ctx.fillRect(-6, -2, 3, 1); ctx.fillRect(-6, 0, 2, 1);
    ctx.drawImage(seal(element, true), 2, -4);
    ctx.fillStyle = art.ink; ctx.fillRect(4, 3, 2, 4); ctx.fillRect(4, 7, 1, 1);
  }
  function drawGrimoires(ctx, field, reduced) {
    var books = field.weapon.grimoires;
    if (!books.length) return;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    if (field.focus) {
      // Connect the actual volumes in reading order. The ink stays behind the
      // open pages and hostile projectiles.
      ctx.strokeStyle = "#ad9ecf6c"; ctx.lineWidth = 0.8;
      ctx.beginPath();
      books.forEach(function (b, i) {
        if (i) ctx.lineTo(b.x, b.y); else ctx.moveTo(b.x, b.y);
      });
      if (books.length === 2) ctx.lineTo(field.player.x, field.player.y - 9);
      ctx.closePath(); ctx.stroke();
    }
    books.forEach(function (b) {
      ctx.save(); ctx.translate(Math.round(b.x), Math.round(b.y)); ctx.rotate(b.tilt);
      if (b.flash > 0) {
        var liftInk = reduced ? 2 : 2 + (1 - b.flash / 0.25) * 9;
        ctx.save();
        ctx.globalAlpha *= 0.3 + 0.5 * b.flash / 0.25;
        ctx.strokeStyle = elementalInk[b.element].ink;
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(-8, -4); ctx.quadraticCurveTo(-7, -7 - liftInk, -3, -6 - liftInk);
        ctx.moveTo(8, -4); ctx.quadraticCurveTo(7, -7 - liftInk, 3, -6 - liftInk); ctx.stroke();
        ctx.drawImage(seal(b.element), -2, -11 - liftInk, 4, 5);
        ctx.restore();
      }
      bookLeaves(ctx, b.element);
      if (b.flash > 0) {
        var progress = 1 - b.flash / 0.25;
        var corner = reduced ? 0 : Math.round(4 - progress * 9);
        var lift = reduced ? 1 : Math.round(3 * Math.sin(progress * Math.PI));
        ctx.beginPath(); ctx.moveTo(0, -4); ctx.lineTo(corner, -5 - lift);
        ctx.lineTo(corner, 1 - lift); ctx.lineTo(0, 3); ctx.closePath();
        ctx.fillStyle = "#fff0d0"; ctx.fill();
        ctx.strokeStyle = "#bd9d9f"; ctx.lineWidth = 0.7; ctx.stroke();
      }
      ctx.restore();
    });
    ctx.restore();
  }
  // Friendly ammunition has a broken exhaust and a pale leading edge. Each
  // book's elemental mark changes the silhouette of the bolt from that book.
  var ammunition = {
    sun:      ["...h...", ".c.h.c.", "..chc..", "hhchchh", "..chc..", ".c.b.c.", "...b..."],
    crescent: ["....hh.", "..hhh..", ".chc...", ".cc....", ".ccc...", "..ccch.", "...cchh"],
    bolt:     ["...h...", "..hhh..", "..chc..", ".cchcc.", ".c.h.c.", "...c...", "...b..."],
    fire:     ["....h..", "..c.h..", ".ch.hc.", ".chhhc.", "cchhhcc", ".chhhc.", "..cbc.."],
    water:    ["...h...", "..hh...", "..hhc..", ".hhccc.", "hhcccch", ".hccch.", "..ccc.."],
    wood:     ["....hh.", "...hhh.", "..hchc.", ".hchcc.", ".chcc..", ".chc...", ".b....."],
    metal:    ["...h...", "...hc..", "..chc..", "..chc..", "hhchchh", "...c...", "...b..."],
    earth:    ["..hhh..", ".hhchc.", "hcccchc", "hchcchc", ".cchcc.", "..ccc..", "...b..."],
    solarSeal:["..b.b..", ".hchch.", ".chhhc.", "hhcbchh", ".chhhc.", ".hchch.", "..b.b.."],
    moon:     ["...chh.", "..chb..", ".chb...", ".ch....", ".cch..h", "..chhh.", "...cc.."],
    bookmark: [".hhhhc.", ".hccbc.", ".hhchc.", ".hccbc.", ".hhhcc.", "..c.c..", "..b...."],
  };
  var rounds = Object.create(null);
  function drawRound(ctx, type, cover, ink, reduced) {
    var key = type + ink, sprite = rounds[key];
    if (!sprite) {
      var rows = ammunition[type];
      sprite = document.createElement("canvas"); sprite.width = sprite.height = 7;
      var paint = sprite.getContext("2d"), colors = {c:ink, b:cover, h:"#fff5dc"};
      rows.forEach(function (row, y) {
        for (var x = 0; x < 7; x++) {
          var color = colors[row[x]];
          if (color) { paint.fillStyle = color; paint.fillRect(x, y, 1, 1); }
        }
      });
      rounds[key] = sprite;
    }
    ctx.fillStyle = cover;
    ctx.fillRect(-1, 2, 2, reduced ? 4 : 7);
    if (!reduced) { ctx.fillStyle = ink; ctx.fillRect(0, 10, 1, 2); }
    ctx.drawImage(sprite, -3, -4);
  }
  function drawUpgradeStrike(ctx, fx, reduced, alpha) {
    var heavy = fx.kind === "heavy", blast = fx.kind === "blast";
    var x = heavy ? fx.x : fx.tx, y = heavy ? fx.y : fx.ty;
    var radius = reduced ? (blast ? 13 : 6) : fx.width * (0.33 + 0.67 * (1 - alpha));
    ctx.save();
    ctx.globalAlpha = (reduced ? 0.57 : 0.8) * alpha;
    ctx.strokeStyle = heavy || blast ? "#ffad9b" : "#f4d393";
    ctx.lineWidth = heavy ? 1.6 : 1;
    ctx.translate(x, y);
    if (heavy) {
      ctx.rotate(Math.PI / 4);
      ctx.strokeRect(-radius, -radius, radius * 2, radius * 2);
    } else if (blast) {
      for (var i = 0; i < 4; i++) {
        ctx.beginPath(); ctx.arc(0, 0, radius, i * Math.PI / 2 + 0.1, i * Math.PI / 2 + 1.15);
        ctx.stroke();
      }
    } else {
      // Paired note heads close inward when the delayed attack resolves.
      ctx.beginPath(); ctx.moveTo(-radius - 3, -4); ctx.lineTo(-radius, 0); ctx.lineTo(-radius - 3, 4);
      ctx.moveTo(radius + 3, -4); ctx.lineTo(radius, 0); ctx.lineTo(radius + 3, 4); ctx.stroke();
    }
    ctx.restore();
  }
  function drawWeapons(ctx, field, id, reduced, time) {
    var w = field.weapon;
    if (!w) return;
    ctx.save();
    w.traces.forEach(function (fx) {
      ctx.globalAlpha = 1;
      var rail = fx.kind === "rail", chain = fx.kind === "chain";
      var alpha = Math.max(0, 1 - fx.age / 0.16);
      if (fx.kind === "heavy" || fx.kind === "blast" || fx.kind === "echo") {
        drawUpgradeStrike(ctx, fx, reduced, alpha);
        return;
      }
      if (fx.kind === "thrust" || fx.kind === "cleave" || fx.kind === "parry") {
        drawMeleeTrace(ctx, fx, reduced, alpha);
        return;
      }
      ctx.globalAlpha = alpha * (rail ? 0.21 : 0.78);
      var ink = fx.element && elementalInk[fx.element];
      ctx.strokeStyle = rail ? "#ffe09c" : chain ? (ink ? ink.ink : "#d9bbf8") : "#f4a4b5";
      ctx.lineWidth = fx.width;
      ctx.beginPath();
      ctx.moveTo(fx.x, fx.y);
      if (chain) {
        var dx = fx.tx - fx.x, dy = fx.ty - fx.y;
        var length = Math.max(1, Math.hypot(dx, dy));
        ctx.lineTo(fx.x + dx * 0.43 - dy / length * 4, fx.y + dy * 0.43 + dx / length * 4);
        ctx.lineTo(fx.x + dx * 0.58 + dy / length * 3, fx.y + dy * 0.58 - dx / length * 3);
      }
      ctx.lineTo(fx.tx, fx.ty);
      ctx.stroke();
      if (chain) {
        // Square brackets mark the neighbour that received the next reading.
        ctx.beginPath();
        ctx.moveTo(fx.tx - 4, fx.ty); ctx.lineTo(fx.tx - 4, fx.ty - 3); ctx.lineTo(fx.tx - 1, fx.ty - 3);
        ctx.moveTo(fx.tx + 4, fx.ty); ctx.lineTo(fx.tx + 4, fx.ty + 3); ctx.lineTo(fx.tx + 1, fx.ty + 3);
        ctx.stroke();
      }
      if (rail) {
        ctx.globalAlpha = alpha * 0.88;
        ctx.strokeStyle = "#fff5d2";
        ctx.lineWidth = 1.5; ctx.stroke();
        // Four facets at the emitter stay distinct from the long beam core.
        var spread = Math.min(12, 2 + fx.width * 0.32), rise = reduced ? 7 : 11 + spread;
        ctx.beginPath(); ctx.moveTo(fx.x, fx.y + 2); ctx.lineTo(fx.x - spread, fx.y - 3);
        ctx.lineTo(fx.x - 2, fx.y - 6); ctx.lineTo(fx.x, fx.y - rise);
        ctx.lineTo(fx.x + 2, fx.y - 6); ctx.lineTo(fx.x + spread, fx.y - 3); ctx.closePath();
        ctx.fillStyle = "#fff1b8"; ctx.fill();
        if (!reduced && fx.width >= 17) {
          ctx.strokeStyle = "#abe9e6"; ctx.lineWidth = 1; ctx.globalAlpha = 0.65 * alpha;
          for (var ring = 1; ring <= 3; ring++) {
            var y = fx.y - ring * (8 + 6 * (1 - alpha));
            ctx.beginPath(); ctx.ellipse(fx.x, y, spread * (1 - ring * 0.13), 2.2, 0, 0, Math.PI * 2); ctx.stroke();
          }
        }
      }
    });
    ctx.globalAlpha = 1;
    if (w.echo) {
      ctx.strokeStyle = "#efc77da8"; ctx.lineWidth = 1;
      var offset = reduced ? 7 : 4 + w.echo.left * 40;
      ctx.beginPath(); ctx.moveTo(w.echo.x - offset - 2, w.echo.y - 2); ctx.lineTo(w.echo.x - offset, w.echo.y);
      ctx.moveTo(w.echo.x + offset + 2, w.echo.y + 2); ctx.lineTo(w.echo.x + offset, w.echo.y); ctx.stroke();
    }
    field.shots.forEach(function (shot) {
      ctx.save();
      ctx.translate(shot.x, shot.y);
      ctx.rotate(Math.atan2(shot.vy, shot.vx) + Math.PI / 2);
      if (shot.kind === "comet") {
        drawRound(ctx, shot.silhouette || "sun", "#679dac", "#edc477", reduced);
      } else if (shot.kind === "bookmark") {
        var element = elementalInk[shot.element];
        drawRound(ctx, shot.element === "sun" ? "solarSeal" : element ? shot.element : "bookmark", element ? element.cover : "#745889",
          element ? element.ink : "#dcb9e8", reduced);
      } else {
        ctx.fillStyle = shot.color || "#9de0ee";
        ctx.fillRect(-0.8, -6, 1.6, 9);
        ctx.fillStyle = "#fcecf0";
        ctx.fillRect(-0.5, -7, 1, 3);
      }
      ctx.restore();
    });
    if (id === "alice") drawPuppets(ctx, field, reduced, time);
    if (id === "patchouli") drawGrimoires(ctx, field, reduced);
    if (id === "marisa") drawStarPods(ctx, w.starPods, reduced);
    if (field.run && field.run.mods.damage) {
      // Lacquered inlays cool from ivory to copper after an empowered hit.
      // At III the second notch also identifies the area-attack version.
      var carriers = id === "alice" ? w.dolls : id === "marisa" ? w.starPods : w.grimoires;
      ctx.fillStyle = w.heavyClock > 0.25 ? "#c78079" : "#fff0d2";
      carriers.forEach(function (carrier) {
        var x = Math.round(carrier.x), y = Math.round(carrier.y);
        ctx.fillRect(x - 2, y + 2, 1, 2);
        if (field.run.mods.damage >= 3) ctx.fillRect(x + 1, y + 2, 1, 2);
      });
    }
    if (id === "marisa" && w.charge > 0.02) {
      var p = field.player;
      ctx.globalAlpha = 0.42 + w.charge * 0.4;
      ctx.strokeStyle = "#ffdf8b";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(p.x, p.y - 10, reduced ? 5 : 7 - w.charge * 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * w.charge);
      ctx.stroke();
      var radius = reduced ? 9 : 13 - w.charge * 6;
      ctx.save(); ctx.translate(p.x, p.y - 10);
      ctx.rotate(reduced ? 0 : w.charge * Math.PI / 3);
      ctx.fillStyle = "#b2e4dc";
      for (var i = 0; i < 4; i++) {
        ctx.fillRect(radius, -1, 3, 2); ctx.rotate(Math.PI / 2);
      }
      ctx.restore();
    }
    ctx.restore();
  }

  // All distances are in the native 240 × 360 playfield. Impact art shares the
  // weapon layer so hostile projectiles and the pilot's hitbox stay in front.
  function drawImpacts(ctx, field, reduced) {
    if (!field.impacts || !field.impacts.length) return;
    function facet(points, fill, stroke) {
      ctx.beginPath();
      ctx.moveTo(points[0], points[1]);
      for (var i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
      ctx.closePath();
      ctx.fillStyle = fill; ctx.fill();
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 0.8; ctx.stroke(); }
    }
    field.impacts.forEach(function (fx) {
      var fade = Math.max(0, 1 - fx.age / fx.life);
      var phase = reduced ? 0.23 : 1 - fade * fade;
      var ink = elementalInk[fx.element], tint = ink ? ink.ink : fx.color;
      var paper = "#fff1cc", shadow = "#473552";
      ctx.save();
      ctx.translate(fx.x, fx.y);
      ctx.rotate(fx.angle);
      ctx.globalAlpha *= fade * (reduced ? 0.7 : 0.94);
      if (fx.kind === "blade" || fx.kind === "lance") {
        var reach = 7 + phase * 9;
        if (fx.kind === "blade") {
          ctx.rotate(-0.55);
          ctx.beginPath(); ctx.moveTo(-4, -reach);
          ctx.quadraticCurveTo(8, -3, 5, reach);
          ctx.quadraticCurveTo(4, 1, -4, -reach);
          ctx.fillStyle = tint; ctx.fill();
          ctx.beginPath(); ctx.moveTo(-3, -reach + 2);
          ctx.quadraticCurveTo(6, 1, 5, reach - 1);
          ctx.strokeStyle = paper; ctx.lineWidth = 1; ctx.stroke();
        } else {
          facet([-3, 0, 2, -2, reach, 0, 2, 1.6], paper, tint);
        }
        for (var side = -1; side <= 1; side += 2) {
          var chip = 2 + phase * 5;
          facet([chip, side * 2, chip + 5, side * (4 + phase * 3), chip + 2, side * 2], tint);
        }
      } else if (fx.kind === "rail" || fx.kind === "comet") {
        var size = fx.kind === "comet" ? 0.55 : fx.heavy ? 1.25 : 0.87;
        ctx.scale(size, size);
        var radius = 4 + 9 * phase;
        ctx.strokeStyle = "#efb46c"; ctx.lineWidth = fx.heavy ? 2.3 : 1.4;
        ctx.beginPath(); ctx.ellipse(1 + phase * 4, 0, radius * 0.5, radius, 0, -1.25, 1.25); ctx.stroke();
        facet([-3, 0, 0, -1.7, 4, -1, 14 + 6 * phase, 0, 3, 1.4, 0, 1.7], paper);
        for (var side = -1; side <= 1; side += 2) {
          facet([1, side * 2, 5, side * 2, 10 + 4 * phase, side * (7 + 3 * phase)], tint);
          ctx.fillStyle = "#e8c68b"; ctx.fillRect(2 + phase * 7, side * (7 + 3 * phase), 2, 1);
        }
      } else if (fx.kind === "page") {
        for (var leaf = 0; leaf < 3; leaf++) {
          ctx.save(); ctx.rotate((leaf - 1) * 0.97);
          ctx.translate(3 + phase * (leaf === 1 ? 10 : 7), 0);
          ctx.rotate((leaf - 1) * (0.3 + phase));
          facet([-2.5, -2, 1, -2.5, 3.6, -1, 2, 2, -2, 1.5], "#eddfc2", tint);
          ctx.strokeStyle = ink ? ink.cover : "#8f6b9e";
          ctx.beginPath(); ctx.moveTo(-1.3, -0.7); ctx.lineTo(1.5, -1); ctx.stroke();
          ctx.restore();
        }
        ctx.strokeStyle = tint; ctx.lineWidth = 1;
        ctx.strokeRect(-1.5, -1.5, 3, 3);
      } else {
        var sealBreak = fx.kind === "seal" || fx.kind === "fracture";
        var armor = fx.kind === "armor", spirit = fx.kind === "spirit";
        var count = sealBreak ? 6 : armor || spirit ? 4 : 2;
        var spread = sealBreak ? (fx.kind === "seal" ? 25 : 14) : fx.heavy ? 14 : 10;
        for (var i = 0; i < count; i++) {
          ctx.save();
          ctx.rotate(i * Math.PI * 2 / count + (sealBreak ? Math.PI / 6 : armor ? Math.PI / 4 : -0.17));
          var r = (sealBreak ? 7 : 2) + phase * spread;
          ctx.translate(r, 0);
          ctx.rotate(phase * (i % 2 ? 0.55 : -0.6));
          if (sealBreak) {
            // A chipped border remains on each detached section of the spell seal.
            facet([-3, -4, 1, -5, 4, -2, 4, 4, 1, 6, 0, 1], tint, shadow);
            ctx.fillStyle = paper; ctx.fillRect(2, -2, 1, 5);
          } else if (armor) {
            facet([-3, -3, 3, -4, 4, 2, -1, 4], tint, shadow);
            ctx.fillStyle = paper; ctx.fillRect(0, -2, 2, 1);
          } else if (spirit) {
            ctx.beginPath(); ctx.moveTo(-2, 0);
            ctx.quadraticCurveTo(-2, -4, 2, -3); ctx.quadraticCurveTo(6, -2, 5, 0);
            ctx.quadraticCurveTo(1, 1, 0, 3); ctx.closePath(); ctx.fillStyle = tint; ctx.fill();
          } else {
            facet([-4, -2, 1, -3.5, 6, -2, 3, 1, 0, 3, 0, 1], tint, shadow);
            ctx.fillStyle = paper; ctx.fillRect(1, -2, 3, 1);
          }
          ctx.fillStyle = tint; ctx.fillRect(4 + phase * 4, -4, 1.5, 1.5);
          ctx.restore();
        }
        if (sealBreak) {
          ctx.strokeStyle = tint; ctx.lineWidth = fx.kind === "seal" ? 1.6 : 1;
          for (var arc = 0; arc < 3; arc++) {
            var start = arc * Math.PI * 2 / 3 + 0.2;
            ctx.beginPath(); ctx.arc(0, 0, 8 + phase * spread, start, start + 1.35); ctx.stroke();
          }
        }
      }
      ctx.restore();
    });
  }

  function knightSortie(ctx, x, y, target, spread, swing, beat, phase, reduced) {
    var arms = ["lance", "shield", "blade"], roles = ["lancer", "guard", "blade"];
    var cy = y + (target.y - y) * 0.44, cx = x + (target.x - x) * 0.55;
    // A pair of swallowtail standards frames the sortie. The open middle
    // leaves the incoming fire and the puppeteer's control strings legible.
    for (var banner = -1; banner <= 1; banner += 2) {
      var outer = cx + banner * spread, inner = cx + banner * spread * 0.54;
      ctx.beginPath(); ctx.moveTo(x + banner * 5, y - 12);
      ctx.quadraticCurveTo(outer + banner * 8, cy + 25, outer, cy - 8);
      ctx.lineTo(inner, cy - spread * 0.38);
      ctx.lineTo(inner + banner * 3, cy - 6);
      ctx.lineTo(outer - banner * 8, cy + 3);
      ctx.quadraticCurveTo(outer - banner * 9, cy + 21, x + banner * 5, y - 12);
      ctx.fillStyle = banner < 0 ? "#b57b8d91" : "#789dba91"; ctx.fill();
      ctx.strokeStyle = banner < 0 ? "#f5c4bfba" : "#bddce4ba";
      ctx.lineWidth = 1; ctx.stroke();
    }
    // Consecutive pulses send opposing pairs. Their partners stay in formation.
    for (var i = 0; i < 6; i++) {
      var a = -Math.PI / 2 + i * Math.PI / 3 + phase * 0.30;
      var px = cx + Math.cos(a) * spread, py = cy + Math.sin(a) * spread * 0.51;
      var active = i % 3 === beat % 3;
      var travel = active ? (reduced ? 0.26 : swing * 0.68) : 0;
      var facing = Math.atan2(target.y - py, target.x - px);
      var distance = Math.max(0, Math.hypot(target.x - px, target.y - py) - 17) * travel;
      px += Math.cos(facing) * distance; py += Math.sin(facing) * distance;
      var side = i % 2 ? -1 : 1;
      ctx.strokeStyle = active ? "#f5ccaaa6" : "#c6ddec62";
      ctx.lineWidth = active ? 1 : 0.65;
      ctx.beginPath(); ctx.moveTo(x + side * 6, y - 10);
      ctx.quadraticCurveTo((x + px) / 2 + side * (active ? 3 : 9), (y + py) / 2 + 3, px, py);
      ctx.stroke();
      if (active) {
        ctx.save(); ctx.translate(px, py); ctx.rotate(facing);
        ctx.beginPath();
        if (i % 3 === 0) {
          ctx.moveTo(-9, -2); ctx.lineTo(24 + 7 * swing, 0); ctx.lineTo(-8, 2);
        } else {
          ctx.moveTo(13, -14); ctx.quadraticCurveTo(28, 0, 12, 16);
          ctx.quadraticCurveTo(23, 0, 13, -14);
        }
        ctx.closePath(); ctx.fillStyle = "#ffe4b585"; ctx.fill(); ctx.restore();
      }
      scope.DanmakuPlayerSprites.drawKnight(ctx, {x: px, y: py, arm: arms[i % 3], role: roles[i % 3],
        phase: active ? "strike" : "windup", facing: facing, swing: 0.6 + swing * 0.4}, i, reduced, phase);
    }
  }

  function prismCannon(ctx, x, y, phase, swing, release, spread, radius) {
    var muzzle = Math.max(6, y - 15), width = spread * (0.7 + swing * 0.15);
    var reach = radius ? Math.min(muzzle, radius - (y - muzzle)) : muzzle;
    ctx.save(); ctx.translate(x, muzzle);
    // Split the rail into spectral bands above the focus of the aperture.
    var prism = ["#e2a6ae", "#f2cf91", "#b1e3d8", "#a9c5eb", "#d0b3e5"];
    if (release > 0) {
      ctx.save(); ctx.globalAlpha *= release;
      for (var i = -2; i <= 2; i++) {
        ctx.beginPath(); ctx.moveTo(i * 0.8 - 2, 0);
        ctx.lineTo(i * width * 0.10 - 2, -reach * 0.43);
        ctx.lineTo((i - 0.43) * width * 0.5, -reach);
        ctx.lineTo((i + 0.43) * width * 0.5, -reach);
        ctx.lineTo(i * width * 0.10 + 1, -reach * 0.43); ctx.closePath();
        ctx.save(); ctx.globalAlpha *= i === 0 ? 0.48 : 0.28;
        ctx.fillStyle = prism[i + 2]; ctx.fill(); ctx.restore();
        ctx.beginPath(); ctx.moveTo(i * width * 0.10, -reach * 0.43);
        ctx.lineTo(i * width * 0.5, -reach);
        ctx.strokeStyle = prism[i + 2]; ctx.lineWidth = 0.85; ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -reach);
      ctx.strokeStyle = "#fff1c7"; ctx.lineWidth = 1.3 + swing; ctx.stroke();
      ctx.restore();
    }
    ctx.save(); ctx.scale(1, 0.54);
    for (var j = 0; j < 3; j++) {
      var a = j * Math.PI * 2 / 3 + phase * 1.4;
      ctx.strokeStyle = prism[j * 2]; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, 13 + (1 - release) * 4, a, a + 1.65); ctx.stroke();
      ctx.save(); ctx.rotate(a); ctx.translate(14, 0);
      ctx.fillStyle = "#efe1b4"; ctx.fillRect(-2, -2, 4, 3); ctx.restore();
    }
    ctx.restore();
    var r = 3 + (1 - release) * 3 + swing * 2.5;
    ctx.beginPath(); ctx.moveTo(0, -r * 1.6); ctx.lineTo(r * 1.4, 0);
    ctx.lineTo(0, r); ctx.lineTo(-r * 1.4, 0); ctx.closePath(); ctx.fillStyle = "#fff1cd"; ctx.fill();
    ctx.restore();
  }

  function elementalFolio(ctx, x, y, target, spread, beat, swing, phase) {
    var elements = scope.DanmakuEngine.elements, count = elements.length;
    var cx = x + (target.x - x) * 0.48, cy = y + (target.y - y) * 0.38;
    var radius = spread * 0.82, active = beat % count;
    for (var i = 0; i < count; i++) {
      var a = -Math.PI / 2 + i * Math.PI * 2 / count + phase * 0.48;
      var px = cx + Math.cos(a) * radius, py = cy + Math.sin(a) * radius * 0.67;
      var b = a + Math.PI * 6 / count, ink = elementalInk[elements[i]].ink;
      ctx.save(); ctx.globalAlpha *= i === active ? 0.84 : 0.36;
      ctx.strokeStyle = ink; ctx.lineWidth = 0.9;
      ctx.beginPath(); ctx.moveTo(px, py);
      ctx.lineTo(cx + Math.cos(b) * radius, cy + Math.sin(b) * radius * 0.67); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, radius + 5, radius * 0.67 + 5, 0, a - 0.25, a + 0.25); ctx.stroke();
      ctx.restore();
      if (i === active) {
        var bendX = (px + target.x) / 2 + 14 * Math.cos(a);
        ctx.strokeStyle = ink; ctx.lineWidth = 1.2;
        ctx.beginPath(); ctx.moveTo(px, py);
        ctx.quadraticCurveTo(bendX, (py + target.y) / 2, target.x, target.y); ctx.stroke();
        for (var j = 0; j < 3; j++) {
          var t = (0.18 + 0.21 * j + swing * 0.18), u = 1 - t;
          ctx.save();
          ctx.translate(u*u*px + 2*u*t*bendX + t*t*target.x, py + (target.y - py)*t);
          ctx.rotate(a + t); ctx.fillStyle = "#f0e2c8"; ctx.fillRect(-2, -2.4, 4.5, 4.8);
          ctx.fillStyle = ink; ctx.fillRect(-1.5, -1.4, 2.7, 1); ctx.restore();
        }
      }
      ctx.save(); ctx.translate(px, py); ctx.rotate(Math.sin(a) * 0.2);
      var scale = i === active ? 1.18 + swing * 0.12 : 0.88;
      ctx.scale(scale, scale); bookLeaves(ctx, elements[i]); ctx.restore();
    }
  }

  function drawSpiritStrike(ctx, cast, target, reduced) {
    if (!cast || cast.age >= cast.duration) return;
    var age = cast.age, progress = Math.min(1, age / cast.duration);
    var duel = Boolean(cast.level), tick = duel ? 0 : Math.max(0, cast.impactTick);
    // Score damage owns the 0.05 s windup and 0.18 s pulse clock. Flower's
    // charge releases once at the cast origin, including when the pilot moves.
    var since = duel ? age : age - (0.05 + tick * 0.18);
    var swing = reduced ? 0.45 : (duel || cast.impactTick >= 0) && since >= 0
      ? Math.max(0, 1 - since / (duel ? 0.32 : 0.18)) : 0;
    var phase = reduced ? 0.3 : progress, beat = reduced ? 0 : tick;
    var release = duel || reduced ? 1 : Math.max(0, Math.min(1, (age - 0.035) / 0.065));
    var spread = duel ? (cast.level === 1 ? 27 : cast.level === 2 ? 44 : 62) : 60;
    var x = cast.x, y = cast.y;
    ctx.save(); ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha *= Math.min(1, (age + 0.035) / 0.12, (1 - progress) * 4) * (reduced ? 0.65 : 0.92);
    if (duel) {
      var tint = scope.DanmakuEngine.cast[cast.id].color;
      // Use the exact collision extent captured at release. All weapon artwork
      // is clipped too, including the split beam and the tips of the lances.
      ctx.beginPath();
      if (cast.level === 1) ctx.rect(x - cast.halfWidth, 0, cast.halfWidth * 2, 360);
      else ctx.arc(x, y, cast.radius, 0, Math.PI * 2);
      ctx.clip();
      ctx.save(); ctx.strokeStyle = tint; ctx.lineWidth = 1.2;
      ctx.globalAlpha *= 0.51 * (1 - progress);
      ctx.beginPath();
      if (cast.level === 1) {
        for (var side = -1; side <= 1; side += 2) {
          var edge = x + side * (cast.halfWidth - 1);
          ctx.moveTo(edge, 0); ctx.lineTo(edge, 360);
        }
      } else if (cast.level === 4) {
        // The full-field reversal reaches all four corners, even from an edge.
        for (var corner = 0; corner < 4; corner++) {
          var cx = corner % 2 ? 238 : 2, cy = corner < 2 ? 2 : 358;
          ctx.moveTo(cx, cy + (corner < 2 ? 13 : -13)); ctx.lineTo(cx, cy);
          ctx.lineTo(cx + (corner % 2 ? -13 : 13), cy);
        }
      } else ctx.arc(x, y, cast.radius - 1, 0, Math.PI * 2);
      ctx.stroke(); ctx.restore();
    }
    if (cast.id === "alice") knightSortie(ctx, x, y, target, spread, swing, beat, phase, reduced);
    else if (cast.id === "marisa") prismCannon(ctx, x, y, phase, swing, release, spread, cast.radius);
    else elementalFolio(ctx, x, y, target, spread, tick, swing, phase);
    ctx.restore();
  }

  function drawMiss(ctx, burst, color, reduced) {
    if (!burst) return;
    var t = Math.min(1, burst.age / 0.78);
    var radius = Math.hypot(Math.max(burst.x, 240 - burst.x), Math.max(burst.y, 360 - burst.y));
    ctx.save();
    ctx.translate(burst.x, burst.y);
    ctx.globalAlpha = (1 - t) * (reduced ? 0.48 : 0.64);
    ctx.strokeStyle = color;
    ctx.lineWidth = reduced ? 1 : 2 - t;
    ctx.beginPath();
    ctx.arc(0, 0, reduced ? 12 : 5 + radius * (1 - Math.pow(1 - t, 2)), 0, Math.PI * 2);
    ctx.stroke();
    for (var i = 0; i < 8; i++) {
      var a = i * Math.PI / 4 + (reduced ? 0 : t * 0.35);
      var r = reduced ? 8 : 5 + 46 * t;
      ctx.save();
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, r);
      ctx.lineTo(2.2, r + 3);
      ctx.lineTo(0, r + 8);
      ctx.lineTo(-2.2, r + 3);
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
  }
  scope.DanmakuPlayerSprites = {
    load: load,
    draw: draw,
    drawKnight: drawKnight,
    drawWeapons: drawWeapons,
    drawPuppeteerHands: drawPuppeteerHands,
    drawMiss: drawMiss,
    drawSpiritStrike: drawSpiritStrike,
    drawImpacts: drawImpacts,
    frameIndex: frameIndex,
  };
})(window);
