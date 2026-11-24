/* Shared artwork, independent split-field composition for the flower duel. */
(function (scope) {
  "use strict";
  var assetBase = (scope.SiteAssets && scope.SiteAssets.base) || "";
  var W = 240,
    H = 360,
    cast = scope.DanmakuEngine.cast;
  var colors = scope.DanmakuFlower.elementColors;
  function create(canvas) {
    var ctx = canvas.getContext("2d"),
      images = {},
      compact = false;
    var motionPref = matchMedia("(prefers-reduced-motion: reduce)"),
      reduced = motionPref.matches;
    var ready = Promise.all(
      Object.keys(cast).flatMap(function (id) {
        return ["flight", "portraits"].map(function (kind) {
          return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () {
              images[id + "-" + kind] = img;
              resolve();
            };
            img.onerror = resolve;
            img.src =
              assetBase +
              "/assets/images/classic/danmaku/" +
              (kind === "portraits"
                  ? "portraits/" + id + "-expressions.png"
                  : id + "-" + kind + ".svg");
          });
        });
      })
    );
    ready = Promise.all([
      ready,
      scope.DanmakuScenery.load(),
      DanmakuBossSprites.load(),
      scope.DanmakuPlayerSprites && scope.DanmakuPlayerSprites.load(),
    ]);
    function dimensions(width, height) {
      compact = width < 480 && width / Math.max(1, height) < 1.25;
      var d = { width: compact ? 348 : 496, height: 412 };
      if (canvas.width !== d.width * 2 || canvas.height !== d.height * 2) {
        canvas.width = d.width * 2;
        canvas.height = d.height * 2;
      }
      return d;
    }
    dimensions(496, 412);
    function rect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(x, y, w, h);
    }
    function text(value, x, y, size, color, align) {
      ctx.font = size + 'px "Fusion Pixel", monospace';
      ctx.textAlign = align || "left";
      ctx.fillStyle = color || "#edf1f5";
      ctx.fillText(value, x, y);
    }
    function line(x, y, r, color) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    function star(x, y, r, color) {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + (i * Math.PI) / 5,
          rad = i % 2 ? r * 0.48 : r;
        var px = x + Math.cos(a) * rad,
          py = y + Math.sin(a) * rad;
        if (i) ctx.lineTo(px, py);
        else ctx.moveTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#192037";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    function pilot(f, time) {
      var p = f.player,
        img = images[f.id + "-flight"];
      ctx.save();
      if (!f.health) ctx.globalAlpha = 0;
      else if (f.missBurst && !reduced) ctx.globalAlpha = Math.min(0.72, f.missBurst.age * 1.5);
      else if (p.invulnerable > 0) ctx.globalAlpha = 0.72;
      var drawn =
        scope.DanmakuPlayerSprites &&
        scope.DanmakuPlayerSprites.draw(
          ctx,
          f.id,
          p.x,
          p.y,
          time,
          p.facing,
          reduced,
          32, p
        );
      if (!drawn && img) {
        var col = Math.max(
          0,
          ["idle", "n", "ne", "e", "se", "s", "sw", "w", "nw"].indexOf(p.facing)
        );
        ctx.drawImage(
          img,
          col * 40,
          (reduced ? 0 : Math.floor(time * 6) % 2) * 48,
          40,
          48,
          Math.round(p.x - 15),
          Math.round(p.y - 19),
          30,
          36
        );
      } else if (!drawn) star(p.x, p.y, 10, cast[f.id].color);
      if (f.id === "alice" && scope.DanmakuPlayerSprites)
        scope.DanmakuPlayerSprites.drawPuppeteerHands(ctx, f, reduced, time);
      ctx.restore();
      if (!f.health) return;
      if (f.focus || f.charging) {
        line(p.x, p.y, 5, "#eef6ff");
        rect(p.x - 1, p.y - 1, 2, 2, "#fff");
      }
      if (f.focus) {
        ctx.save();
        ctx.globalAlpha = 0.22;
        line(p.x, p.y - 48, 68, cast[f.id].color);
        ctx.restore();
      }
      if (f.charging) {
        line(p.x, p.y, 12 + Math.floor(f.charge / 100) * 3, cast[f.id].color);
        text(
          "C" + Math.floor(f.charge / 100),
          p.x,
          p.y + 27,
          9,
          "#fff4d3",
          "center"
        );
      }
    }
    var fairy = [
      "....hh....",
      "...hhhh...",
      "...hffh...",
      ".ww.d.dww.",
      "wwwwddwwww",
      ".wwwddwww.",
      "..w.dd.w..",
      "...dddd...",
      "..dddddd..",
      "....ss....",
      "...s..s...",
    ];
    function minion(e, time, field, combat) {
      ctx.save();
      ctx.translate(Math.round(e.x), Math.round(e.y));
      if (e.kind === "spirit") {
        var c = e.active ? "#ffdda9" : "#b9caf6";
        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.moveTo(0, -8);
        ctx.quadraticCurveTo(10, -1, 2, 8);
        ctx.lineTo(0, 5);
        ctx.lineTo(-3, 8);
        ctx.quadraticCurveTo(-10, -1, 0, -8);
        ctx.fill();
        rect(-3, -2, 2, 3, "#3a3e69");
        rect(2, -2, 2, 3, "#3a3e69");
        if (e.active) line(0, 0, 11, "#f7deab");
      } else {
        var flutter = !reduced && Math.floor(time * 8 + e.phase) % 2;
        var palette = {
          h: "#e9d792",
          f: "#ffe4d8",
          w: "#bedaf1",
          d: "#8ca8e6",
          s: "#f5dfe7",
        };
        if (e.leader) {
          palette.d = "#c2a2c8"; palette.w = "#edd9eb";
          rect(-4, -8, 1, 2, "#ddb26e"); rect(3, -8, 1, 2, "#ddb26e");
          rect(-2, -8, 4, 1, "#fff2bb"); rect(-1, -10, 2, 2, "#efc783");
        }
        fairy.forEach(function (row, y) {
          for (var x = 0; x < row.length; x++) {
            var c = palette[row[x]];
            if (c)
              rect(
                (x - 5) * 1.25,
                (y - 5) * 1.25 + (row[x] === "w" ? flutter : 0),
                1.4,
                1.4,
                c
              );
          }
        });
      }
      var arming = (!e.leader || Math.hypot(field.player.x - e.x, field.player.y - e.y) >= 76) &&
        time >= field.recoveryUntil && e.y > 18 && e.y < 215 && e.fire > 0 && e.fire <= 0.35;
      var bearing = arming ? Math.atan2(field.player.y - e.y, field.player.x - e.x) : e.fireAngle;
      if (combat) DanmakuBossSprites.muzzle(ctx, bearing, arming ? e.fire : 0, time - e.lastShotAt, reduced);
      ctx.restore();
    }
    function board(f, s) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();
      var cycle = Math.floor(s.time / 36);
      scope.DanmakuScenery.draw(ctx, f.id, cycle % 2, s.time % 36,
        s.time, f.scroll, reduced, f.bullets.length > 80);
      if (f.cast && !reduced && f.cast.level > 1) {
        var shake = Math.max(0, 1 - f.cast.age / 0.32) * 2;
        ctx.translate(
          Math.sin(s.time * 91) * shake,
          Math.cos(s.time * 71) * shake
        );
      }
      f.incoming.forEach(function (a, i) {
        if (i > 5) return;
        var progress = Math.min(1, a.age / a.delay);
        rect(
          8 + i * 38,
          2,
          30 * progress,
          2,
          a.kind === "white" ? "#d3e5ff" : "#f3b5cb"
        );
      });
      if (f.cast && scope.DanmakuPlayerSprites) {
        var c = f.cast;
        // C1 attacks the release column. Higher charges cancel around their origin.
        var target = c.level === 1 ? {x: c.x, y: Math.max(12, c.y - 125)} :
          {x: c.x, y: Math.max(14, c.y - (c.level === 2 ? 58 : 90))};
        scope.DanmakuPlayerSprites.drawSpiritStrike(ctx, c, target, reduced);
        if (c.level >= 3 && c.age < 0.75) {
          ctx.save(); ctx.globalAlpha = Math.min(1, (0.75 - c.age) * 5);
          rect(4, 47, 121, 26, "#151b30bb");
          var img = images[f.id + "-portraits"];
          if (img) ctx.drawImage(img, img.width / 2, 0, img.width / 2, img.height / 2, 4, 47, 26, 26);
          text(c.level === 4 ? "BOSS ATTACK" : "SPELL ATTACK", 33, 58, 9, cast[f.id].color);
          text(cast[f.id].name, 33, 70, 9, "#fff1d7"); ctx.restore();
        }
      }
      var combat = !s.intermission && s.phase !== "over";
      f.enemies.forEach(function (e) {
        minion(e, s.time, f, combat);
      });
      if (f.boss) {
        var b = f.boss;
        if (combat) DanmakuBossSprites.drawSight(ctx, b, b.sight, s.time, reduced);
        line(b.x, b.y, 21, cast[b.id].color);
        var next = scope.DanmakuFlower.volleySources(b);
        var until = combat && s.time >= f.recoveryUntil ? b.fire : Infinity;
        var latest = combat && Number.isFinite(b.bodyCast) ? b.bodyCast : -Infinity;
        for (var satellite = 0; satellite < scope.DanmakuFlower.satelliteCount(b); satellite++) {
          var target = scope.DanmakuFlower.satellitePosition(b, satellite);
          var joined = b.recruited && b.recruited[satellite];
          var point = DanmakuBossSprites.deploy(b, target,
            joined ? (b.age - joined) * 1.8 : b.age, joined ? 0 : satellite, reduced);
          var last = combat && b.lastCast ? b.lastCast[satellite] : -Infinity;
          if (Number.isFinite(last)) latest = Math.max(latest, last);
          var pose = DanmakuBossSprites.castPose(s.time - last, next.indexOf(satellite) >= 0 ? until : Infinity);
          ctx.save();
          ctx.globalAlpha = point.opacity;
          DanmakuBossSprites.satellite(
            ctx,
            b.id,
            point.x,
            point.y,
            satellite,
            reduced ? 0 : s.time,
            point.scale * 0.8,
            b.id === "patchouli" ? colors[satellite] : cast[b.id].color,
            null, pose
          );
          ctx.restore();
        }
        if (
          !DanmakuBossSprites.draw(
            ctx,
            b.id,
            b.x,
            b.y,
            s.time,
            DanmakuBossSprites.castingFrame(DanmakuBossSprites.castPose(s.time - latest, until)),
            reduced
          )
        )
          star(b.x, b.y, 10, cast[b.id].color);
        rect(b.x - 22, b.y - 25, 44, 2, "#182137");
        var maxHp = b.maxHp || 100 + Math.min(16, Math.floor(s.roundTime / 18) + s.round - 1) * 8;
        if (b.echoHp > b.hp)
          rect(b.x - 22, b.y - 25, 44 * Math.min(1, b.echoHp / maxHp), 2, "#e9bd9b");
        rect(
          b.x - 22,
          b.y - 25,
          (44 * Math.max(0, b.hp)) / maxHp,
          2,
          cast[b.id].color
        );
      }
      if (scope.DanmakuPlayerSprites) scope.DanmakuPlayerSprites.drawWeapons(ctx, f, f.id, reduced, s.time);
      else f.shots.forEach(function (shot) { rect(shot.x - 1, shot.y - 4, 2, 7, cast[f.id].color); });
      if (scope.DanmakuPlayerSprites) scope.DanmakuPlayerSprites.drawImpacts(ctx, f, reduced);
      f.effects.forEach(function (e) {
        ctx.save();
        var t = e.age / (e.kind === "doll" ? 0.8 : 0.4);
        ctx.globalAlpha = 1 - t;
        if (e.kind === "doll")
          DanmakuBossSprites.satellite(
            ctx,
            "alice",
            e.x,
            e.y,
            0,
            reduced ? 0 : s.time,
            1
          );
        else if (e.kind === "cancel") {
          star(e.x, e.y, 2 + 3 * t, "#eff2ff");
        }
        ctx.restore();
      });
      f.points.forEach(function (p) {
        rect(p.x - 1, p.y - 1, 2, 2, "#f4ecc4");
      });
      f.lasers.forEach(function (l) {
        if (l.age < l.warning) {
          ctx.save();
          ctx.setLineDash([3, 4]);
          ctx.strokeStyle = "#f5dfa5";
          ctx.beginPath();
          ctx.moveTo(l.x, 0);
          ctx.lineTo(l.x, H);
          ctx.stroke();
          ctx.restore();
        } else {
          rect(l.x - l.width, 0, l.width * 2, H, "#ffc56588");
          rect(l.x - l.width / 2, 0, l.width, H, "#fff4ce");
        }
      });
      f.bullets.forEach(function (b) {
        DanmakuBossSprites.projectile(ctx, b.x, b.y, b, reduced);
      });
      pilot(f, s.time);
      if (scope.DanmakuPlayerSprites) scope.DanmakuPlayerSprites.drawMiss(ctx, f.missBurst, cast[f.id].color, reduced);
      if (f.notice) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, 2 - f.notice.age);
        rect(34, 28, 172, 21, "#101728dc");
        text(
          f.notice.text,
          120,
          42,
          10,
          f.notice.kind === "danger" ? "#ffc3c9" : "#fff1c7",
          "center"
        );
        ctx.restore();
      }
      if (f.combo > 1) text(f.combo + " HIT", 10, 21, 13, "#fce8b6");
      if (s.countdown > 0) {
        rect(0, 128, 240, 75, "#111a2bd9");
        text("ROUND " + s.round, 120, 151, 12, cast[f.id].color, "center");
        text(
          s.countdown > 2 ? "READY" : Math.ceil(s.countdown),
          120,
          183,
          24,
          "#fff3e2",
          "center"
        );
      }
      if (s.intermission) {
        rect(0, 132, 240, 60, "#111a2be8");
        text(
          s.winner < 0
            ? "DRAW"
            : s.winner === f.side
              ? "ROUND WIN"
              : "ROUND LOSE",
          120,
          157,
          17,
          "#f5dfbd",
          "center"
        );
        text(s.wins[f.side] + " / 2", 120, 181, 13, cast[f.id].color, "center");
      }
      ctx.restore();
    }
    function life(f, x, y, w) {
      for (var i = 0; i < 5; i++)
        rect(
          x + i * (w / 5),
          y,
          w / 5 - 3,
          4,
          i < f.health
            ? f.health === 1
              ? "#ed8e99"
              : cast[f.id].color
            : "#354057"
        );
    }
    function gauge(f, x, y, w) {
      rect(x, y, w, 11, "#151e30");
      for (var i = 0; i < 4; i++) {
        var amount = Math.max(0, Math.min(1, (f.gauge - i * 100) / 100));
        rect(
          x + (i * w) / 4 + 1,
          y + 1,
          (w / 4 - 2) * amount,
          9,
          cast[f.id].color
        );
        var loaded = Math.max(0, Math.min(1, (f.charge - i * 100) / 100));
        if (loaded)
          rect(x + (i * w) / 4 + 1, y + 7, (w / 4 - 2) * loaded, 3, "#fff9ec");
      }
    }
    function draw(s) {
      reduced = motionPref.matches;
      if (!ctx) return;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.imageSmoothingEnabled = false;
      var width = compact ? 348 : 496;
      rect(0, 0, width, 412, "#0d1524");
      var a = s.fields[0],
        b = s.fields[1];
      text(cast[a.id].name, 5, 12, 11, cast[a.id].color);
      text(s.auto ? "AUTO" : "PLAYER", 235, 12, 9, "#bdc9df", "right");
      life(a, 4, 18, 232);
      ctx.save();
      ctx.translate(0, 26);
      board(a, s);
      ctx.restore();
      gauge(a, 4, 392, 232);
      if (compact) {
        text("CPU", 302, 12, 11, cast[b.id].color, "center");
        life(b, 256, 18, 88);
        ctx.save();
        ctx.translate(256, 26);
        ctx.scale(92 / 240, 92 / 240);
        board(b, s);
        ctx.restore();
        gauge(b, 256, 172, 88);
        text(cast[b.id].name, 302, 202, 10, cast[b.id].color, "center");
        text("ROUND", 302, 236, 10, "#c3cde0", "center");
        text(s.wins[0] + " : " + s.wins[1], 302, 260, 19, "#f2dfc0", "center");
        text("送信", 302, 294, 10, "#c3cde0", "center");
        text(a.sent + " →", 302, 313, 11, cast[a.id].color, "center");
        text("← " + b.sent, 302, 335, 11, cast[b.id].color, "center");
        text("2本先取", 302, 380, 10, "#dce5f2", "center");
      } else {
        text(cast[b.id].name, 261, 12, 11, cast[b.id].color);
        text("CPU", 491, 12, 9, "#bdc9df", "right");
        life(b, 260, 18, 232);
        ctx.save();
        ctx.translate(256, 26);
        board(b, s);
        ctx.restore();
        gauge(b, 260, 392, 232);
        rect(244, 0, 8, 412, "#23314a");
        for (var i = 0; i < 5; i++)
          rect(
            246,
            82 + i * 54,
            4,
            3,
            (s.time * 2 + i) % 3 < 1 ? "#f7d7a6" : "#627699"
          );
      }
    }
    return {
      supported: Boolean(ctx),
      ready: ready,
      draw: draw,
      dimensions: dimensions,
      point: function (x, y) {
        return { x: x, y: y - 26 };
      },
    };
  }
  scope.DanmakuFlowerRenderer = { create: create };
})(window);
