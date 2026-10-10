/* Shared artwork, independent split-field composition for the flower duel. */
(function (scope) {
  "use strict";
  var W = 240,
    H = 360,
    cast = scope.DanmakuEngine.cast;
  var colors = ["#f3a3ae", "#a0dff5", "#bae29e", "#f3d58f", "#c8adf0"];
  function create(canvas) {
    var ctx = canvas.getContext("2d"),
      images = {},
      tiles = {},
      compact = false;
    var reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    var ready = Promise.all(
      Object.keys(cast).flatMap(function (id) {
        return ["flight", "background", "portraits"].map(function (kind) {
          return new Promise(function (resolve) {
            var img = new Image();
            img.onload = function () {
              images[id + "-" + kind] = img;
              resolve();
            };
            img.onerror = resolve;
            var scene = {
              alice: "alice-workshop",
              marisa: "marisa-forest",
              patchouli: "patchouli-library",
            }[id];
            img.src =
              "/assets/images/classic/danmaku/" +
              (kind === "background"
                ? "backgrounds/" + scene + ".png"
                : kind === "portraits"
                  ? "portraits/" + id + "-expressions.png"
                  : id + "-" + kind + ".svg");
          });
        });
      })
    );
    ready = Promise.all([ready, DanmakuBossSprites.load()]);
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
      if (p.invulnerable > 0)
        ctx.globalAlpha = 0.45 + (Math.floor(time * 12) % 2) * 0.5;
      if (img) {
        var col = Math.max(
          0,
          [
            "idle",
            "n",
            "ne",
            "e",
            "se",
            "s",
            "sw",
            "w",
            "nw",
            "n",
            "ne",
          ].indexOf(p.facing)
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
      } else star(p.x, p.y, 10, cast[f.id].color);
      ctx.restore();
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
    function minion(e, time) {
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
      ctx.restore();
    }
    function projectile(b) {
      var x = Math.round(b.x),
        y = Math.round(b.y);
      ctx.save();
      ctx.lineWidth = 1;
      if (b.shape === "star" || b.shape === "bigstar") {
        star(x, y, b.shape === "bigstar" ? 6.5 : 4.8, b.color);
        rect(x - 1, y - 1, 2, 2, "#fff8e7");
      } else if (b.shape === "diamond" || b.shape === "rice") {
        ctx.translate(x, y);
        ctx.rotate(Math.atan2(b.vy, b.vx) + Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(3, 0);
        ctx.lineTo(0, 6);
        ctx.lineTo(-3, 0);
        ctx.closePath();
        ctx.fillStyle = b.color;
        ctx.fill();
        ctx.strokeStyle = "#171e36";
        ctx.stroke();
        rect(-0.6, -3, 1.2, 5, "#f7f8ff");
      } else {
        var r = b.shape === "orb" ? 4.5 : 3.5;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = b.hard ? b.color : "#35466c";
        ctx.fill();
        ctx.strokeStyle = b.hard ? "#141b2e" : "#ecf3ff";
        ctx.stroke();
        rect(x - 1, y - 1, 2, 2, b.hard ? "#fff1da" : "#dcecff");
      }
      ctx.restore();
    }
    function background(f) {
      var scroll = reduced ? 0 : f.scroll;
      rect(0, 0, W, H, "#121c2b");
      var img = images[f.id + "-background"];
      if (img) {
        if (!tiles[f.id]) {
          var tile = document.createElement("canvas");
          tile.width = W * 2;
          tile.height = H * 2;
          var paint = tile.getContext("2d");
          paint.drawImage(img, 0, 0, tile.width, tile.height);
          paint.globalCompositeOperation = "destination-in";
          var mask = paint.createLinearGradient(0, 0, 0, H * 2);
          mask.addColorStop(0, "transparent");
          mask.addColorStop(24 / H, "#000");
          mask.addColorStop(1 - 24 / H, "#000");
          mask.addColorStop(1, "transparent");
          paint.fillStyle = mask;
          paint.fillRect(0, 0, tile.width, tile.height);
          tiles[f.id] = tile;
        }
        var period = H - 24,
          offset = scroll % period;
        ctx.imageSmoothingEnabled = true;
        for (var row = -1; row <= 1; row++)
          ctx.drawImage(tiles[f.id], 0, row * period + offset, W, H);
        ctx.imageSmoothingEnabled = false;
      }
      rect(0, 0, W, H, "#090f23a6");
      ctx.save();
      var speed = reduced ? 0 : f.scrollSpeed;
      ctx.globalAlpha = 0.13 + Math.min(1, speed / 200) * 0.09;
      for (var i = 0; i < 18; i++) {
        var side = i % 2 ? 1 : -1,
          x = W / 2 + side * (W / 2 - 6 - ((i * 11) % 24)),
          depth = i % 3 === 0 ? 2.5 : 1.7;
        var y = ((i * 47 + scroll * depth) % (H + 40)) - 20,
          length = speed ? Math.min(22, 4 + speed * depth * 0.035) : 1;
        rect(x, y - length, 1, length, cast[f.id].color);
        rect(x, y, 1, 2, cast[f.id].color);
      }
      ctx.restore();
    }
    function board(f, s) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, W, H);
      ctx.clip();
      background(f);
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
      f.enemies.forEach(function (e) {
        minion(e, s.time);
      });
      if (f.boss) {
        var b = f.boss;
        line(b.x, b.y, 21, cast[b.id].color);
        for (
          var satellite = 0;
          satellite < (b.id === "patchouli" ? 5 : b.id === "alice" ? 4 : 2);
          satellite++
        ) {
          var count = b.id === "patchouli" ? 5 : b.id === "alice" ? 4 : 2,
            angle = (satellite * Math.PI * 2) / count + b.age * 0.35;
          var target = {
            x: b.x + Math.cos(angle) * 31,
            y: b.y + Math.sin(angle) * 18,
          };
          var point = DanmakuBossSprites.deploy(
            b,
            target,
            b.age,
            satellite,
            reduced
          );
          ctx.save();
          ctx.globalAlpha = point.opacity * 0.8;
          DanmakuBossSprites.satellite(
            ctx,
            b.id,
            point.x,
            point.y,
            satellite,
            reduced ? 0 : s.time,
            point.scale * 0.8,
            colors[satellite]
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
            b.age > 1.2 ? b.age - 1.2 : -1,
            reduced
          )
        )
          star(b.x, b.y, 10, cast[b.id].color);
        rect(b.x - 22, b.y - 25, 44, 2, "#182137");
        rect(
          b.x - 22,
          b.y - 25,
          (44 * Math.max(0, b.hp)) /
            (100 +
              Math.min(16, Math.floor(s.roundTime / 18) + s.round - 1) * 8),
          2,
          cast[b.id].color
        );
      }
      f.shots.forEach(function (b) {
        rect(
          b.x - 1,
          b.y - 6,
          b.shape === "orb" ? 3 : 2,
          b.shape === "beam" ? 18 : 8,
          cast[f.id].color
        );
        rect(b.x, b.y - 5, 1, 5, "#fbfaff");
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
      f.bullets.forEach(projectile);
      pilot(f, s.time);
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
        } else {
          line(e.x, e.y, 8 + t * 26, e.color);
          for (var i = 0; i < 6; i++)
            rect(
              e.x + Math.cos((i * Math.PI) / 3) * (8 + t * 18),
              e.y + Math.sin((i * Math.PI) / 3) * (8 + t * 18),
              2,
              2,
              "#fff8e3"
            );
        }
        ctx.restore();
      });
      f.points.forEach(function (p) {
        rect(p.x - 1, p.y - 1, 2, 2, "#f4ecc4");
      });
      if (f.cast) {
        var c = f.cast,
          t = c.age / c.duration,
          color = cast[f.id].color;
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.8;
        if (f.id === "marisa") {
          rect(
            f.player.x - 16 * (1 - t),
            0,
            32 * (1 - t),
            f.player.y,
            "#ffe9ac88"
          );
          rect(f.player.x - 3, 0, 6, f.player.y, "#fff2cc");
        } else if (f.id === "alice") {
          for (var i = 0; i < 6; i++) {
            var a = (i * Math.PI) / 3 + t;
            line(
              f.player.x + Math.cos(a) * (30 + t * 75),
              f.player.y + Math.sin(a) * (30 + t * 75),
              7,
              color
            );
          }
          line(f.player.x, f.player.y, 30 + t * 75, color);
        } else {
          for (var i = 0; i < 5; i++) {
            var a = (i * Math.PI * 2) / 5 - t;
            line(
              f.player.x + Math.cos(a) * (25 + t * 60),
              f.player.y + Math.sin(a) * (25 + t * 60),
              15,
              colors[i]
            );
          }
        }
        ctx.restore();
        if (c.level >= 3 && c.age < 0.8) {
          var img = images[f.id + "-portraits"];
          ctx.save();
          ctx.globalAlpha = Math.min(1, (0.8 - c.age) * 5);
          rect(0, 86, 240, 58, "#101829cd");
          if (img)
            ctx.drawImage(
              img,
              img.width / 2,
              0,
              img.width / 2,
              img.height / 2,
              0,
              72,
              74,
              74
            );
          text(
            c.level === 4 ? "BOSS ATTACK" : "SPELL ATTACK",
            80,
            111,
            12,
            color
          );
          text(cast[f.id].name, 80, 132, 11, "#fff2dd");
          ctx.restore();
        }
      }
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
