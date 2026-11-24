/* Registered 48 px animation cells shared by both battle renderers. */
(function (scope) {
  "use strict";
  var assetBase = (scope.SiteAssets && scope.SiteAssets.base) || "";
  var registration = {
    alice: { centers: [201, 198, 174, 195], feet: [395, 396], height: 324 },
    marisa: { centers: [210, 212, 215, 219], feet: [419, 418], height: 393 },
    patchouli: { centers: [218, 219, 226, 229], feet: [419, 407], height: 394 },
  };
  var sheets = {},
    pending;
  function load() {
    if (pending) return pending;
    pending = Promise.all(
      Object.keys(registration).map(function (id) {
        return new Promise(function (resolve) {
          var image = new Image();
          image.onerror = resolve;
          image.onload = function () {
            var atlas = document.createElement("canvas");
            atlas.width = 48 * 4;
            atlas.height = 48 * 2;
            var ctx = atlas.getContext("2d"),
              reg = registration[id],
              cw = image.width / 4,
              ch = image.height / 2,
              k = 38 / reg.height;
            // Reduce the source once with area filtering, then display these small
            // cells with nearest-neighbour sampling in the game canvas.
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            for (var frame = 0; frame < 8; frame++) {
              var col = frame % 4,
                row = Math.floor(frame / 4),
                left = Math.round(col * cw),
                top = Math.round(row * ch);
              // Crop each cell before translating, so adjacent frames never bleed.
              ctx.save();
              ctx.beginPath();
              ctx.rect(col * 48, row * 48, 48, 48);
              ctx.clip();
              ctx.drawImage(
                image,
                left,
                top,
                Math.round((col + 1) * cw) - left,
                Math.round((row + 1) * ch) - top,
                col * 48 + 24 - reg.centers[col] * k,
                row * 48 + 44 - reg.feet[row] * k,
                cw * k,
                ch * k
              );
              ctx.restore();
            }
            sheets[id] = atlas;
            resolve();
          };
          image.src =
            assetBase + "/assets/images/classic/danmaku/bosses/" + id + ".png";
        });
      })
    );
    return pending;
  }
  function draw(ctx, id, x, y, time, castAge, reduced, size) {
    var sheet = sheets[id];
    if (!sheet) return false;
    var casting = castAge >= 0,
      frame;
    if (reduced) frame = casting ? 6 : 0;
    else if (casting)
      frame =
        4 +
        (castAge < 0.7
          ? Math.min(2, Math.floor(castAge * 4))
          : 2 + (Math.floor((castAge - 0.7) * 5) % 2));
    else frame = [0, 1, 2, 3, 2, 1][Math.floor(time * 6) % 6];
    size = size || 42;
    ctx.drawImage(
      sheet,
      (frame % 4) * 48,
      Math.floor(frame / 4) * 48,
      48,
      48,
      Math.round(x - size / 2),
      Math.round(y - size * 0.58),
      size,
      size
    );
    return true;
  }
  function deploy(boss, emitter, age, index, reduced) {
    // Recurring casts own their entry/retirement positions. Reusing the spell's
    // opening animation here would detach the visible doll from its shots.
    if (emitter.deployed)
      return {
        x: emitter.x,
        y: emitter.y,
        opacity: emitter.opacity === undefined ? 1 : emitter.opacity,
        scale: emitter.scale === undefined ? 1 : emitter.scale,
        progress: 1,
      };
    var t = reduced
      ? 1
      : Math.max(0, Math.min(1, (age - index * 0.065) / 1.05));
    var progress = 1 - Math.pow(1 - t, 3),
      arc = Math.sin(t * Math.PI) * (index % 2 ? 1 : -1) * 10;
    return {
      x: boss.x + (emitter.x - boss.x) * progress + arc,
      y: boss.y + (emitter.y - boss.y) * progress,
      opacity: Math.min(1, t * 4),
      scale: 0.35 + 0.65 * progress,
      progress: progress,
    };
  }
  // Pixel stamps are centred on their casting hand, aperture or chamber.
  // They are drawn once per palette and pose at the arena's native resolution.
  var familiarCache = Object.create(null);
  function pixels(ctx, x, y, rows, palette) {
    rows.forEach(function (row, dy) {
      for (var dx = 0; dx < row.length; dx++) {
        var ink = palette[row[dx]];
        if (ink) {
          ctx.fillStyle = ink;
          ctx.fillRect(x + dx, y + dy, 1, 1);
        }
      }
    });
  }
  function marionette(ctx, palette, pose, flutter) {
    // The crossbar, china face, striped pantaloons and bobbins distinguish
    // the theatre puppets overhead from the player's rear-facing armoured dolls.
    var reach = pose === "release" ? 7 : pose === "ready" ? 4 : pose === "settle" ? 6 : 5;
    var wrist = pose === "ready" ? -3 : pose === "release" ? 2 : pose === "settle" ? 1 : 0;
    ctx.fillStyle = palette.o;
    ctx.fillRect(-7, -11, 14, 2);
    ctx.fillStyle = palette.g;
    ctx.fillRect(-6, -11, 12, 1);
    [-1, 1].forEach(function (side) {
      var hand = side * reach;
      ctx.fillStyle = "#b6a8a280";
      ctx.fillRect(side * 6, -9, 1, 6);
      ctx.fillRect(hand, -3, 1, Math.max(1, wrist + 4));
      ctx.fillStyle = palette.o;
      ctx.fillRect(Math.min(side * 3, hand) - 1, wrist - 1, Math.abs(hand - side * 3) + 2, 3);
      ctx.fillStyle = palette.v;
      ctx.fillRect(Math.min(side * 3, hand), wrist, Math.abs(hand - side * 3) + 1, 1);
      ctx.fillStyle = palette.s;
      ctx.fillRect(hand, wrist, 1, 2);
    });
    pixels(ctx, -5, -9, [
      "..o....oo..", ".orm..orgo.", ".orrgmgggo.", "..oghhhggo.",
      "..ohwswho..", "..ohssssho.", "...owhwho..", "...ormgo...",
      "....mgo....", "...omrmo...", "..omvrmro..", ".ovwrrmwro.",
      "owmrwwrmwro", ".ogwwmmwgo.", "..oogggoo.."
    ], palette);
    var step = pose === "release" ? 1 : flutter;
    pixels(ctx, -3, 6, ["ow", "or", "og", "oo"], palette);
    pixels(ctx, 1 + step, 6 - step, ["ow", "or", "og", "oo"], palette);
    if (pose === "release") {
      ctx.fillStyle = palette.w;
      ctx.fillRect(-reach - 1, wrist + 2, 2, 1);
      ctx.fillRect(reach, wrist + 2, 2, 1);
    }
  }
  function lens(ctx, palette, pose, flutter) {
    // A tilted brass gimbal cradles a glass iris. The two trunnions stay
    // readable even in silhouette, while its shutters rotate behind them.
    pixels(ctx, -10, -8, [
      "........oggo.........", "......ogwgggoo.......", "....oggo....ogoo.....",
      "...oggo......oggo....", "..ogg.........oggo...", ".ogg...........oggo..",
      "oggo............oggoo", ".oo.............ogbgo", "...............ogbgoo",
      ".............ogbggo..", "...........ogbggo....", "........ogbbggo......",
      ".....oogbbggo........", "...ogbbggoo..........", "...oooo..............",
    ], palette);
    pixels(ctx,-6,-6,[
      "....ooooo....","..oogggbboo..",".oggvvvvbgbo.",".ogvmttvvwgo.",
      "ogvmtwwttvbgo","ogvwtmmttvbgo","ogvtmmvvvtbgo",".ogvtvvvvbgo.",
      ".obbvvvbggbo.","..obbgggbbo..","...oobbboo...",".....ogo.....",
      ".....ogo.....","....ogbgo....",".....ooo....."
    ], palette);
    var spread = pose === "release" ? 3 : pose === "ready" ? 0 : pose === "settle" ? 2 : 1;
    ctx.fillStyle = palette.o;
    ctx.fillRect(-9 - spread, -3, 3, 5); ctx.fillRect(6 + spread, -1, 3, 4);
    ctx.fillStyle = palette.g;
    ctx.fillRect(-9 - spread, -2, 2, 2); ctx.fillRect(7 + spread, 0, 1, 2);
    ctx.fillStyle = palette.b;
    ctx.fillRect(-6 - spread, -2, 5, 1);
    ctx.fillRect(1, 1, 5 + spread, 1);
    var iris = pose === "release" ? 3 : pose === "ready" ? 1 : 2;
    ctx.fillStyle = pose === "release" ? palette.w : palette.t;
    ctx.fillRect(-iris, -1, iris * 2 + 1, 2);
    ctx.fillRect(-1, -iris, 2, iris * 2);
    ctx.fillStyle = palette.w;
    ctx.fillRect(pose === "ready" ? -1 : flutter, -1, 1, 1);
  }
  var sigils = [
    [".w.", "www", "w.w"], [".w.", "w.w", ".w."], ["w.w", ".w.", ".w."],
    [".w.", "w.w", "www"], ["ww.", ".w.", ".ww"],
    ["w.w", ".w.", "w.w"], [".ww", "w..", ".ww"]
  ];
  function reliquary(ctx, palette, pose, flutter, index) {
    // Winged sides, a tiled canopy and the finial surround the stained glass.
    // Its element is engraved on the chamber instead of relying on colour alone.
    var raised = pose === "ready" ? -2 : pose === "release" ? 2 : pose === "settle" ? 1 : 0;
    for (var side = -1; side <= 1; side += 2) {
      ctx.save(); ctx.scale(side, 1);
      pixels(ctx, 2, -5 + raised, [
        ".....og", "...ogbo", ".ogwwgo", "ogmvgo.", "obmgo..", ".ogo...", ".oo...."
      ], palette);
      ctx.restore();
    }
    pixels(ctx, -5, -9, [
      ".....g.....", "....gwo....", "...ogbgo...", "..ogvvbgo..",
      ".ogvvwvbgo.", "ogggwbggbgo", "..ogttvgo..", "..ottvmbo..",
      "..otmmvbo..", "..otmmvbo..", "..ovmmvbo..", "..ovvvvbo..",
      "..oggggbo..", "...obgbo...", "....ogo....", ".....g.....",
    ], palette);
    pixels(ctx, -1, -2, sigils[index % sigils.length], palette);
    ctx.fillStyle = pose === "release" ? palette.w : palette.g;
    ctx.fillRect(0, 7 + flutter, 1, 2);
    if (pose === "release") {
      ctx.fillRect(-4, -2, 1, 4); ctx.fillRect(4, -2, 1, 4);
    }
  }
  function familiarStamp(id, index, color, pose, flutter) {
    var variant = id === "patchouli" ? index % sigils.length : id === "alice" ? index % 2 : 0;
    var key = [id, variant, color, pose, flutter].join("/");
    if (familiarCache[key]) return familiarCache[key];
    var image = document.createElement("canvas");
    image.width = image.height = 30;
    var ctx = image.getContext("2d");
    ctx.translate(15, 15);
    var palette = {
      o: "#282133", g: "#d7a868", b: "#865b4a", w: "#fff0cc",
      h: "#74503e", s: "#e9c6a1", r: variant ? "#8c415e" : "#a04d59",
      m: color || (id === "marisa" ? "#97dde2" : "#d797ba"),
      t: color || "#a6d6e1", v: id === "alice" ? "#704663" : "#634d79"
    };
    if (id === "alice") marionette(ctx, palette, pose, flutter);
    else if (id === "marisa") lens(ctx, palette, pose, flutter);
    else reliquary(ctx, palette, pose, flutter, index);
    return (familiarCache[key] = image);
  }
  function satellite(ctx, id, x, y, index, time, scale, color, kind, pose) {
    pose = pose || "idle";
    var flutter = pose === "idle" ? Math.floor(time * 4 + index) % 2 : 0;
    var art = familiarStamp(id, index, color, pose, flutter);
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    ctx.drawImage(art, -15, -15);
    ctx.restore();
  }
  // Half-wings are mirrored around a separate body so the hinge can fold
  // without moving the muzzle or the keeper's damaged lantern chamber.
  var escortArt = {
    scout: {
      ink: {o:"#293043", d:"#47676f", m:"#68ada9", l:"#a4e0ce", h:"#fff2c4"},
      wing: [".......oo", "....oollo", "..olllmmo", "ollmmmdo.", ".odddoo.."],
      body: ["..o..", ".odo.", ".olo.", "olhlo", "odmdo", ".omo.", ".odo.", "..l..", "..o.."]
    },
    wing: {
      ink: {o:"#342a49", d:"#6f527e", m:"#a67daf", l:"#e1b6da", h:"#fff0cd"},
      wing: ["......ooo", "....oollo", "...olmldo", "..olmmdo.", ".ohlmlo..", "olmdlo...", ".omdo....", "..olo....", "..od....."],
      body: [".o.o.", ".odo.", "olhlo", ".omo.", ".olo.", "odmdo", ".omo.", "..o.."]
    },
    keeper: {
      ink: {o:"#382b3d", d:"#896150", m:"#cc885a", l:"#f0c784", h:"#fff1ce"},
      wing: ["...oo..", "..olho.", ".olmoo.", "olmdoo.", ".omdo..", "..oloo.", "...oo.."],
      body: ["...ooo...", "..olhlo..", ".oomdmoo.", "olllmlllo", ".odhhldo.", ".omhhlmo.", ".omllmmo.", "..odmdo..", ".oollloo.", "...odo...", "....l...."]
    }
  };
  var escortCache = Object.create(null);
  function escort(ctx, f, reduced) {
    var pose = reduced ? 0 : Math.floor(f.age * 7 + (f.offset || 0)) % 3;
    var type = escortArt[f.kind] ? f.kind : "scout";
    var key = type + pose + (f.armorBroken ? "cracked" : "");
    var stamp = escortCache[key];
    if (!stamp) {
      var art = escortArt[type], body = art.body, wings = art.wing;
      stamp = document.createElement("canvas");
      stamp.width = stamp.height = 28;
      var c = stamp.getContext("2d"); c.translate(14, 14);
      for (var side = -1; side <= 1; side += 2) {
        c.save(); c.scale(side, 1);
        c.translate(1 - pose, -5 + pose);
        pixels(c, 0, 0, wings, art.ink);
        c.restore();
      }
      pixels(c, -Math.floor(body[0].length / 2), -Math.floor(body.length / 2), body, art.ink);
      if (f.armorBroken) {
        c.fillStyle = art.ink.o; c.fillRect(1,-2,1,3); c.fillRect(0,1,1,2);
      }
      escortCache[key] = stamp;
    }
    ctx.drawImage(stamp, -14, -14);
  }
  function castPose(since, until) {
    if (since >= 0 && since < 0.14) return "release";
    if (until >= 0 && until <= 0.30) return "ready";
    if (since >= 0 && since < 0.32) return "settle";
    return "idle";
  }
  function castingFrame(pose) {
    return pose === "ready" ? 0.26 : pose === "release" ? 0.91 : pose === "settle" ? 0.52 : -1;
  }
  // The charge sits at the nose of the sprite along its actual shot bearing.
  function muzzle(ctx, angle, until, since, reduced) {
    var ready = until > 0 && until <= 0.49, fired = since >= 0 && since < 0.16;
    if (!ready && !fired) return;
    ctx.save();
    ctx.rotate(angle);
    var reach = fired ? 1 - since / 0.16 : 1 - until / 0.49;
    if (reduced) reach = fired ? 0.65 : 0.4;
    ctx.fillStyle = "#945769";
    ctx.fillRect(5, -2, 4, 4);
    ctx.fillStyle = fired ? "#ffce95" : "#c98a92";
    ctx.fillRect(7, -1, 2 + Math.round(reach * (fired ? 8 : 4)), 2);
    ctx.fillStyle = "#fff0d5";
    ctx.fillRect(7, -1, 1 + Math.round(reach * 3), 1);
    if (fired && !reduced) {
      ctx.fillRect(9, -3, 2, 1); ctx.fillRect(9, 2, 2, 1);
    }
    ctx.restore();
  }
  // Native-pixel enemy rounds. Bright facets sit over the collision centre;
  // thread ends, foil folds and blade tips retain the colour of their material.
  var bulletArt = {
    needle: ["...h...", "...h...", "...l...", "...l...", "..lwc..", "..hwc..", "..wkc..", "..wkc..", "..ccc..", "...s...", "...s..."],
    spool: [".wllll.", "hcccccs", ".shhcs.", ".slccs.", ".ccwls.", ".wlcsc.", ".scccs.", "hllllcc", ".sccss."],
    bobbin: ["..lwl..", ".wcccls", "lcwcccs", "hcslhcs", "lcshscs", "cccclws", ".sclcs.", "..ssc.."],
    ribbon: ["ll...wc", "hwc.lcc", "lccwccs", ".cwhcs.", "..ccs..", ".lcscc.", ".cc..ls", "cs...cs", "s....s."],
    comet: ["...ww....", "..lhwl...", ".lcwwlc..", ".llccls..", "..lccssl.", "...css.l.", "...tls..s", "....tll..", "....t..t.", ".....t..."],
    prism: ["....w....", "...lhc...", "...lhc...", "..lwhcs..", "..lwhcs..", ".lcwhccs.", ".lccwccs.", "lcccwlccs", "mmaaalllc", ".sssssss."],
    flare: [".....h.....", ".....l.....", "..l..w..l..", "...clwlc...", "...lwhwl...", "hllwhhhwllh", "...lwhwl...", "...clwlc...", "..l..w..l..", ".....l.....", ".....h....."],
    stardust: ["......l.", ".h...lhl", "lwl...s.", ".c......", "....lw..", "...lhwc.", "...ccls.", ".c..ls.."],
    quill: [".....lwl", "...llwhc", "..llwhcs", ".lscwcc.", "..lwccs.", "lsswlcs.", ".lwccs..", ".wwcs...", "..gc....", ".ls.....", "g......."],
    folio: ["lllll...", "chhhwlc.", "lhhhwscs", "lhscwwls", "lhhhhwls", "lhsshwls", "lhhhhwls", "ccccccls", ".sscgccs", "....g..."],
    seal: ["..lwwl..", ".llcchl.", "lclwwccl", "lcwhhccl", "lcccwlcs", ".lcccll.", "..lccs..", ".cc..lc.", ".cs..cc.", ".s....s."],
    crystal: ["...w....", "..lw....", ".lwhl...", ".lwhc..l", "slwhc.wc", "slwhclwc", ".schcccs", "..scsss.", "...ss..."],
    saber: ["..........h", "........lwh", ".......lwhs", ".....llwhcs", "....lwwccs.", "...lwwccs..", "...whccs...", "..whccs....", "..wccs.....", ".lccs......", "wgglgsc....", "sskgg......", "..cc.......", "..gs.......", ".cs........", ".wg........"],
    solar: ["....l....", ".l..h..l.", "..lwwlc..", "..wchws..", "lhhchchhl", "..wcccs..", "..cwsls..", ".s..s..s.", "....s...."],
    lunar: ["....llww.", "..lwwlc..", ".lwhsc...", ".whls....", "lhwls....", ".lwwlc..l", ".cwwlclws", "..cwwwlcs", "....csss."],
    largeorb: ["....lllll....", "..llwwlccss..", ".llhhwwlcccs.", ".lhhwwlccccs.", "llhwwlccclccs", "lwllccclllccs", "lcccccllcccsc", "lcccccccccssc", "lccccccccsssc", ".sccccccllss.", ".ssccccllsss.", "..sscccssss..", "....sssss...."],
    smallorb: [".ll.", "lhcl", "lccs", ".ss."],
    rice: ["..w..", ".lw..", ".lwl.", ".hwl.", ".lcc.", ".ccs.", ".cc..", "..s.."],
    kunai: ["...w...", "..lhc..", "..lhc..", ".llwcs.", "lccwccs", "...c...", "..lcc..", "...s..."],
    scale: ["...w...", "..lwl..", ".lhwwc.", "lhwwwcs", "lwwlccs", "ccs.scc", "ss...ss"],
    amulet: ["lwwll", "lhhhc", "lhchs", "lcccs", "lhchs", "llccs", "lhhhs", "cssss"],
    butterfly: ["ll...wl", "lwc.wlc", "clcwccs", ".cchcc.", ".lchcl.", "lcswccs", ".s...s."],
    darkorb: ["...lllll...", "..lsssscc..", ".lsssssccc.", "lssscscsscs", "lssclwlsscs", "lsscwhcsscs", "cssscscsscs", "csssssssccs", ".ccssssccs.", "..cccccss..", "...sssss..."],
    bubble: ["..llll..", ".whcccl.", "hcc..scl", "lc..l.cc", "lc.ch.cc", "cc...lcs", ".scllcs.", "..csss.."],
    flame: ["..l...l.", "..wl..c.", "..lwlcc.", ".lcwwlcs", "lcwwhlcs", "clwhhlcs", ".lcwwcs.", "..clcs..", "...ss..."],
    pellet: [".l.", "lhc", ".s."],
    star: ["....h....", "...lwl...", "...lwl...", "wllwhwllw", ".ccwhccc.", "..lwlcs..", "..lcsls..", ".cs...cs."],
    bigstar: [".....h.....", "....lwl....", "....lwl....", "...lwwl....", "wllwwhwwllw", ".ccwhhwccc.", "..lwwlcss..", "...lcccs...", "..lcs.lcs..", "..cs...cc..", ".s.......s."],
    smallstar: ["...h...", "...l...", "lllwlll", ".cwhcs.", "..lcc..", ".cs.cc."],
    diamond: ["...w...", "..lwc..", ".lwwcs.", "lhwwccs", ".lwccs.", "..ccs..", "...s..."],
    orb: ["..ll..", ".whwlc", "lwwlcc", "lclccs", ".cccs.", "..ss.."],
    white: [".ll.", "lwwl", "lhwc", ".cc."],
  };
  var bulletCores = {
    needle: 2.1, spool: 2.7, bobbin: 2.7, ribbon: 2.3, comet: 3.1, prism: 3.1,
    flare: 3.1, stardust: 1.9, quill: 2.3, folio: 2.7, seal: 2.7, crystal: 2.4,
    solar: 2.7, lunar: 2.4, saber: 2.3, largeorb: 4.8, smallorb: 1.7, rice: 2.1, kunai: 2.2, scale: 2.3, amulet: 2.7,
    butterfly: 2.4, darkorb: 3.8, bubble: 4, flame: 3.2, pellet: 1.7, star: 3.1,
    bigstar: 4.3, smallstar: 1.9, diamond: 2.4, orb: 2.4, white: 2.3,
  };
  var directedRounds = new Set(["needle","spool","ribbon","comet","prism","quill","folio",
    "seal","crystal","saber","rice","kunai","scale","amulet","butterfly","flame","diamond"]);
  var bulletStamps = new Map();
  function bulletStamp(style, color, hard) {
    var key = style + color + (hard ? "!" : "");
    if (bulletStamps.has(key)) return bulletStamps.get(key);
    var sprite = document.createElement("canvas");
    sprite.width = sprite.height = 24;
    var c = sprite.getContext("2d"), rows = bulletArt[style];
    var width = Math.max.apply(null, rows.map(function (row) { return row.length; }));
    var left = 12 - Math.floor(width / 2), top = 12 - Math.floor(rows.length / 2);
    if (style === "comet") top = 9;
    if (style === "saber") { left = 9; top = 2; }
    if (style === "stardust") { left = 7; top = 7; }
    var rgb = /^#[0-9a-f]{6}$/i.test(color) ? parseInt(color.slice(1), 16) : 0xadb8d9;
    function glaze(r, g, b, mix) {
      return "rgb(" + [[rgb >> 16, r], [(rgb >> 8) & 255, g], [rgb & 255, b]].map(function (pair) {
        return Math.round(pair[0] + (pair[1] - pair[0]) * mix);
      }).join(",") + ")";
    }
    var paint = { c: color, l: glaze(255,241,221,0.38), w: glaze(255,246,222,0.72),
      h: "#fffbe9", s: glaze(39,30,56,0.55), t: glaze(68,75,96,0.54),
      m: "#a8d7ea", a: "#e5a7d4", g: "#d9ab68", k: "#53475b" };
    // A one-pixel ink edge remains legible over the bright sky and forest tiles.
    c.fillStyle = "#29263c";
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) if (row[x] !== ".") {
        c.fillRect(left + x - 1, top + y, 3, 1); c.fillRect(left + x, top + y - 1, 1, 3);
      }
    });
    rows.forEach(function (row, y) {
      for (var x = 0; x < row.length; x++) if (row[x] !== ".") {
        c.fillStyle = paint[row[x]]; c.fillRect(left + x, top + y, 1, 1);
      }
    });
    if (hard) {
      c.fillStyle = "#5b413d"; c.fillRect(12, 13, 3, 2);
      c.fillStyle = "#ffe1a7"; c.fillRect(12, 13, 2, 1);
    }
    bulletStamps.set(key, sprite);
    return sprite;
  }
  function projectile(ctx, x, y, bullet) {
    var style = bullet.visualStyle || (bullet.motion && bullet.motion.visualStyle) || bullet.shape;
    if (!bulletArt[style]) style = bulletArt[bullet.shape] ? bullet.shape : "orb";
    var radius = bullet.radius || bulletCores[style];
    var scale = Math.max(0.72, Math.min(1.45, radius / bulletCores[style]));
    var size = 24 * scale;
    var sprite = bulletStamp(style, bullet.color || "#b5cedb", bullet.hard);
    x = Math.round(x); y = Math.round(y);
    if (directedRounds.has(style)) {
      ctx.save(); ctx.translate(x, y);
      var heading = Number.isFinite(bullet.heading) ? bullet.heading : Math.atan2(bullet.vy || 0, bullet.vx || 0);
      ctx.rotate(heading + Math.PI / 2);
      ctx.drawImage(sprite, -size / 2, -size / 2, size, size); ctx.restore();
    } else ctx.drawImage(sprite, x - size / 2, y - size / 2, size, size);
  }
  // An unfilled reticle records the old target. It stays deliberately open
  // over the player's hitbox and disappears as the live salvo leaves.
  function drawSight(ctx, source, sight, time, reduced) {
    if (!sight || time < sight.at || time >= sight.ready + 0.12) return;
    var progress = Math.min(1, (time - sight.at) / Math.max(0.01, sight.ready - sight.at));
    var dx = sight.x - source.x, dy = sight.y - source.y, length = Math.hypot(dx, dy);
    if (length < 1) return;
    var ux = dx / length, uy = dy / length, radius = reduced ? 7 : 11 - 4 * progress;
    ctx.save(); ctx.strokeStyle = sight.color; ctx.lineWidth = 1;
    ctx.globalAlpha *= 0.55 + 0.25 * progress;
    ctx.beginPath();
    // A short pair of sight marks at the muzzle reads separately from a laser.
    for (var d = 14; d <= 22; d += 8) {
      ctx.moveTo(source.x + ux*d - uy*3, source.y + uy*d + ux*3);
      ctx.lineTo(source.x + ux*(d+4), source.y + uy*(d+4));
      ctx.lineTo(source.x + ux*d + uy*3, source.y + uy*d - ux*3);
    }
    for (var k = 0; k < 4; k++) {
      var a = k * Math.PI / 2 + Math.PI / 4;
      ctx.moveTo(sight.x + Math.cos(a-.24)*radius, sight.y + Math.sin(a-.24)*radius);
      ctx.arc(sight.x, sight.y, radius, a-.24, a+.24);
    }
    ctx.stroke(); ctx.restore();
  }
  scope.DanmakuBossSprites = {
    projectile: projectile,
    drawSight: drawSight,
    load: load,
    draw: draw,
    deploy: deploy,
    satellite: satellite,
    castPose: castPose,
    castingFrame: castingFrame,
    muzzle: muzzle,
    escort: escort,
  };
})(window);
