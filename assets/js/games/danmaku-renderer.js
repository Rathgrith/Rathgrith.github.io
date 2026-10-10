/* Canvas-only presentation; the collision/scoring simulation lives in the engine. */
(function () {
  "use strict";
  var W = DanmakuEngine.width,
    H = DanmakuEngine.height;
  var palettes = {
    alice: ["#101b2b", "#76a9c6", "#a8d7e8"],
    marisa: ["#191625", "#b29a68", "#f5d18a"],
    patchouli: ["#1a1428", "#9f7db9", "#d2b4ed"],
  };
  function create(canvas) {
    var ctx = canvas.getContext("2d"),
      images = {},
      tiles = {},
      bulletSprites = {},
      reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    canvas.width = W * 2;
    canvas.height = H * 2;
    var ready = Promise.all(
      Object.keys(DanmakuEngine.cast)
        .reduce(function (ids, id) {
          return ids.concat(
            id,
            id + "-player",
            id + "-flight",
            id + "-background",
            id + "-portraits"
          );
        }, [])
        .map(function (id) {
          return new Promise(function (resolve) {
            var image = new Image();
            image.onload = function () {
              images[id] = image;
              resolve();
            };
            image.onerror = resolve;
            var backgrounds = {
              alice: "alice-workshop",
              marisa: "marisa-forest",
              patchouli: "patchouli-library",
            };
            image.src = id.endsWith("-portraits")
              ? "/assets/images/classic/danmaku/portraits/" +
                id.split("-")[0] +
                "-expressions.png"
              : id.endsWith("-background")
                ? "/assets/images/classic/danmaku/backgrounds/" +
                  backgrounds[id.split("-")[0]] +
                  ".png"
                : "/assets/images/classic/danmaku/" + id + ".svg";
          });
        })
    );
    ready = Promise.all([ready, DanmakuBossSprites.load()]);
    function rect(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    }
    function circle(x, y, radius, color) {
      ctx.strokeStyle = color;
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    function witch(id, x, y, width, rear, pose, time) {
      var atlas = rear && images[id + "-flight"];
      if (atlas) {
        var col = Math.max(
          0,
          ["idle", "n", "ne", "e", "se", "s", "sw", "w", "nw"].indexOf(
            pose || "idle"
          )
        );
        var row = reduced ? 0 : Math.floor((time || 0) * 6) % 2;
        ctx.drawImage(
          atlas,
          col * 40,
          row * 48,
          40,
          48,
          Math.round(x - width * 0.625),
          Math.round(y - width * 0.79),
          width * 1.25,
          width * 1.5
        );
        return;
      }
      var image = images[id + (rear ? "-player" : "")];
      if (image)
        ctx.drawImage(
          image,
          Math.round(x - width / 2),
          Math.round(y - width * 0.65),
          width,
          width * 1.25
        );
      else {
        rect(x - 5, y - 9, 10, 19, DanmakuEngine.cast[id].color);
        rect(x - 3, y - 6, 6, rear ? 9 : 5, rear ? "#b39c85" : "#f7ddba");
      }
    }
    function star(x, y, r, color) {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + (i * Math.PI) / 5,
          radius = i % 2 ? r * 0.48 : r;
        var px = x + Math.cos(a) * radius,
          py = y + Math.sin(a) * radius;
        if (!i) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = "#24192f";
      ctx.stroke();
    }
    function drawBackground(s, palette) {
      rect(0, 0, W, H, palette[0]);
      var image = images[s.enemyId + "-background"];
      var scroll = reduced ? 0 : s.scroll;
      if (image) {
        if (!tiles[s.enemyId]) {
          var tile = document.createElement("canvas");
          tile.width = W * 2;
          tile.height = H * 2;
          var paint = tile.getContext("2d");
          paint.imageSmoothingEnabled = false;
          paint.drawImage(image, 0, 0, tile.width, tile.height);
          // Overlapping feathered ends remove a hard seam without mirroring rooms.
          paint.globalCompositeOperation = "destination-in";
          var mask = paint.createLinearGradient(0, 0, 0, H * 2);
          mask.addColorStop(0, "transparent");
          mask.addColorStop(24 / H, "#000");
          mask.addColorStop(1 - 24 / H, "#000");
          mask.addColorStop(1, "transparent");
          paint.fillStyle = mask;
          paint.fillRect(0, 0, W * 2, H * 2);
          tiles[s.enemyId] = tile;
        }
        // Interpolate only the scrolling artwork so subpixel motion cannot snap
        // a detailed room by a whole pixel. Gameplay sprites remain nearest-neighbor.
        ctx.imageSmoothingEnabled = true;
        var period = H - 24,
          offset = scroll % period;
        for (var row = -1; row <= 1; row++)
          ctx.drawImage(tiles[s.enemyId], 0, row * period + offset, W, H);
        ctx.imageSmoothingEnabled = false;
      }
      ctx.save();
      // Slow light and fast foreground streaks make the forward motion legible.
      // Keep the fast layer at the edges, away from the bullet-reading corridor.
      var vignette = ctx.createLinearGradient(0, 0, W, 0);
      vignette.addColorStop(0, "#060b18aa");
      vignette.addColorStop(0.22, "#080c1820");
      vignette.addColorStop(0.5, "#080c182d");
      vignette.addColorStop(0.78, "#080c1820");
      vignette.addColorStop(1, "#060b18aa");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, W, H);
      var pulse = reduced
        ? 0
        : Math.pow(1 - s.rhythm.progress, 3) * s.rhythm.energy;
      ctx.globalAlpha = 0.06 + pulse * 0.055;
      ctx.fillStyle = palette[2];
      for (var shaft = 0; shaft < 3; shaft++) {
        var y = ((shaft * 147 + scroll * 0.45) % 440) - 40;
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(80, y + 30);
        ctx.lineTo(80, y + 37);
        ctx.lineTo(0, y + 8);
        ctx.fill();
      }
      var speed = reduced ? 0 : s.scrollSpeed;
      ctx.globalAlpha = 0.13 + Math.min(1, speed / 200) * 0.09;
      for (var i = 0; i < 22; i++) {
        var side = i % 2 ? 1 : -1,
          x = W / 2 + side * (W / 2 - 7 - ((i * 13) % 28));
        var depth = i % 3 === 0 ? 2.5 : 1.7,
          y = ((i * 59 + scroll * depth) % (H + 40)) - 20;
        var length = speed ? Math.min(22, 4 + speed * depth * 0.035) : 1;
        rect(x, y - length, 1, length, palette[2]);
        rect(x, y, 1, i % 4 === 0 ? 2 : 1, palette[2]);
      }
      ctx.restore();
    }
    function bulletSprite(shape, color) {
      var key = shape + color;
      if (bulletSprites[key]) return bulletSprites[key];
      var sprite = document.createElement("canvas");
      sprite.width = sprite.height = 24;
      var paint = sprite.getContext("2d");
      paint.translate(12, 12);
      function block(x, y, w, h, c) {
        paint.fillStyle = c;
        paint.fillRect(x, y, w, h);
      }
      function polygon(points, c) {
        paint.beginPath();
        points.forEach(function (p, i) {
          if (i) paint.lineTo(p[0], p[1]);
          else paint.moveTo(p[0], p[1]);
        });
        paint.closePath();
        paint.fillStyle = c;
        paint.fill();
        paint.strokeStyle = "#191b30";
        paint.lineWidth = 1;
        paint.stroke();
      }
      if (shape === "rice") {
        polygon(
          [
            [0, -6],
            [2, -3],
            [2, 3],
            [0, 6],
            [-2, 3],
            [-2, -3],
          ],
          color
        );
        block(0, -3, 1, 6, "#fff8e8");
      } else if (shape === "kunai") {
        polygon(
          [
            [0, -7],
            [3, -1],
            [1, 2],
            [1, 5],
            [-1, 5],
            [-1, 2],
            [-3, -1],
          ],
          color
        );
        block(0, -4, 1, 5, "#fff9ec");
        block(-1, 3, 2, 1, "#e9e3d2");
      } else if (shape === "scale") {
        // Broad, white-centred scale with a cupped trailing edge (PCB), rather
        // than a tiny triangular arrow that disappears inside dense necklaces.
        polygon(
          [
            [0, -4],
            [2, -3],
            [4, 0],
            [4, 3],
            [2, 3],
            [0, 1],
            [-2, 3],
            [-4, 3],
            [-4, 0],
            [-2, -3],
          ],
          color
        );
        paint.fillStyle = "#fff8e9";
        paint.beginPath();
        paint.moveTo(0, -2);
        paint.lineTo(2, 0);
        paint.lineTo(2, 1);
        paint.lineTo(0, 0);
        paint.lineTo(-2, 1);
        paint.lineTo(-2, 0);
        paint.closePath();
        paint.fill();
      } else if (shape === "amulet") {
        block(-4, -6, 8, 12, "#1d2034");
        block(-3, -5, 6, 10, color);
        block(-2, -4, 4, 8, "#f4edde");
        block(0, -3, 1, 6, color);
        block(-1, -1, 3, 1, color);
        block(-1, 1, 2, 1, color);
      } else if (shape === "butterfly") {
        polygon(
          [
            [-1, -2],
            [-5, -5],
            [-6, -2],
            [-4, 1],
            [-5, 4],
            [-2, 3],
            [0, 1],
          ],
          color
        );
        polygon(
          [
            [1, -2],
            [5, -5],
            [6, -2],
            [4, 1],
            [5, 4],
            [2, 3],
            [0, 1],
          ],
          color
        );
        block(-1, -3, 2, 6, "#fff3ea");
        block(-4, -2, 2, 2, "#f8e4f5");
        block(3, -2, 2, 2, "#f8e4f5");
      } else if (shape === "darkorb") {
        // PCB's large hollow orb has a small bright collision core. Keep its
        // dark translucent body distinct from the small water bullets.
        paint.beginPath();
        paint.arc(0, 0, 10, 0, Math.PI * 2);
        paint.fillStyle = "#241435dd";
        paint.fill();
        paint.strokeStyle = color;
        paint.lineWidth = 2;
        paint.stroke();
        paint.beginPath();
        paint.arc(0, 0, 8, 0, Math.PI * 2);
        paint.strokeStyle = "#f1d5ffb0";
        paint.lineWidth = 1;
        paint.stroke();
        block(-2, -2, 4, 4, "#f8e7ff");
        block(-1, -1, 2, 2, "#ffffff");
      } else if (shape === "bubble") {
        paint.beginPath();
        paint.arc(0, 0, 6, 0, Math.PI * 2);
        paint.fillStyle = "#152839aa";
        paint.fill();
        paint.lineWidth = 2;
        paint.strokeStyle = "#191b30";
        paint.stroke();
        paint.lineWidth = 1;
        paint.strokeStyle = color;
        paint.stroke();
        paint.beginPath();
        paint.arc(0, 0, 4, 0, Math.PI * 2);
        paint.stroke();
        block(-2, -4, 3, 1, "#f2fcff");
        block(-3, -3, 1, 2, "#f2fcff");
        block(2, 2, 1, 1, color);
      } else if (shape === "flame") {
        polygon(
          [
            [0, -7],
            [2, -3],
            [4, -1],
            [3, 4],
            [0, 6],
            [-3, 4],
            [-4, 0],
            [-2, -3],
            [-1, 0],
          ],
          color
        );
        polygon(
          [
            [0, -2],
            [2, 1],
            [1, 4],
            [-1, 4],
            [-2, 1],
          ],
          "#ffe8b2"
        );
        block(0, 1, 1, 2, "#fffdf0");
      } else {
        block(-2, -2, 4, 4, "#20233b");
        block(-1, -2, 2, 4, color);
        block(-2, -1, 4, 2, color);
        block(-1, -1, 2, 2, "#fff9e8");
      }
      bulletSprites[key] = sprite;
      return sprite;
    }
    function drawLasers(s) {
      s.lasers.forEach(function (l) {
        ctx.save();
        var age = l.age,
          live = age >= l.warning && age < l.warning + l.duration;
        var pose = DanmakuEngine.laserPose(l);
        ctx.translate(pose.x, pose.y);
        ctx.rotate(pose.angle);
        var fade =
          age > l.warning + l.duration
            ? Math.max(0, 1 - (age - l.warning - l.duration) / 0.25)
            : 1;
        function beamShape(extra, ratio) {
          var near = (l.width / 2 + extra) * ratio,
            far = (l.width / 2 + 460 * (l.spread || 0) + extra) * ratio;
          ctx.beginPath();
          ctx.moveTo(0, -near);
          ctx.lineTo(460, -far);
          ctx.lineTo(460, far);
          ctx.lineTo(0, near);
          ctx.closePath();
          ctx.fill();
        }
        if (!live && age < l.warning) {
          ctx.globalAlpha = 0.12;
          ctx.fillStyle = l.color;
          beamShape(0, 1);
          ctx.globalAlpha = 0.55;
          ctx.strokeStyle = l.color;
          ctx.lineWidth = 1;
          ctx.setLineDash([4, 5]);
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(460, 0);
          ctx.stroke();
          ctx.setLineDash([]);
          circle(0, 0, 7 + Math.min(1, age / l.warning) * 10, l.color);
        } else {
          ctx.globalAlpha = 0.2 * fade;
          ctx.fillStyle = l.color;
          beamShape(3, 1);
          ctx.globalAlpha = 0.85 * fade;
          beamShape(0, 1);
          ctx.globalAlpha = 0.95 * fade;
          ctx.fillStyle = "#fff4df";
          beamShape(0, 0.45);
          if (l.spread) {
            ctx.globalAlpha = 0.13 * fade;
            ctx.fillStyle = "#fffdf0";
            for (var streak = 0; streak < 5; streak++) {
              var along = (streak * 89 + age * 340) % 430;
              var width = (l.width + along * l.spread * 2) * 0.7;
              ctx.fillRect(along, -width / 2, 10, width);
            }
          }
        }
        ctx.restore();
      });
    }
    function fittedText(text, x, y, maxWidth, size) {
      ctx.font = size + 'px "Fusion Pixel", monospace';
      var measured = ctx.measureText(text).width;
      if (measured > maxWidth)
        ctx.font =
          Math.max(7, (size * maxWidth) / measured) +
          'px "Fusion Pixel", monospace';
      ctx.fillText(text, x, y);
    }
    function arcadeText(text, x, y, size, color, maxWidth) {
      ctx.save();
      ctx.textAlign = "center";
      ctx.font = size + 'px "Fusion Pixel",monospace';
      var width = ctx.measureText(text).width;
      if (width > (maxWidth || W - 16))
        ctx.font =
          (size * (maxWidth || W - 16)) / width + 'px "Fusion Pixel",monospace';
      ctx.lineWidth = 2;
      ctx.lineJoin = "round";
      ctx.strokeStyle = "#201421";
      ctx.strokeText(text, x, y + 1);
      ctx.fillStyle = color;
      ctx.fillText(text, x, y);
      ctx.restore();
    }
    function portrait(id, expression, x, y, size) {
      var image = images[id + "-portraits"];
      if (!image) return;
      var cell = image.naturalWidth / 2;
      ctx.drawImage(
        image,
        (expression % 2) * cell,
        Math.floor(expression / 2) * cell,
        cell,
        cell,
        Math.round(x),
        Math.round(y),
        size,
        size
      );
    }
    function wrappedText(text, x, y, width, size, lineHeight) {
      ctx.font = size + 'px "Fusion Pixel",monospace';
      ctx.textAlign = "left";
      var line = "",
        row = 0;
      Array.from(text).forEach(function (char) {
        if (char === "\n") {
          ctx.fillText(line, x, y + row * lineHeight);
          line = "";
          row++;
          return;
        }
        if (line && ctx.measureText(line + char).width > width) {
          ctx.fillText(line, x, y + row * lineHeight);
          line = "";
          row++;
        }
        line += char;
      });
      if (line) ctx.fillText(line, x, y + row * lineHeight);
    }
    function cutIn(id, title, age, duration, bomb) {
      var envelope = Math.min(1, age / 0.12, (duration - age) / 0.3);
      if (envelope <= 0) return;
      ctx.save();
      ctx.globalAlpha = envelope;
      var slide = reduced ? 0 : Math.max(0, 1 - age / 0.26) * W;
      ctx.translate(slide, 0);
      rect(0, 103, W, 70, "#101528ee");
      rect(0, 103, W, 1, DanmakuEngine.cast[id].color);
      rect(0, 172, W, 1, DanmakuEngine.cast[id].color);
      portrait(id, 1, -4, 63, 110);
      ctx.textAlign = "left";
      ctx.fillStyle = DanmakuEngine.cast[id].color;
      fittedText(bomb ? "BOMB / 霊撃" : "SPELL CARD", 105, 121, 129, 10);
      ctx.fillStyle = "#fff1d7";
      wrappedText(title, 105, 140, 129, 10, 13);
      ctx.restore();
    }
    function drawIntro(s) {
      var intro = s.intro,
        age = intro.age;
      ctx.save();
      // The arrival and portrait are cosmetic: the combat clock stays at zero.
      if (age < 1.25 && !reduced) {
        ctx.globalAlpha = 0.2;
        circle(s.boss.x, s.boss.y, 14, palettes[s.enemyId][2]);
      }
      var opacity = Math.max(
        0,
        Math.min(1, (age - 0.5) / 0.25, (intro.duration - age) / 0.25)
      );
      ctx.globalAlpha = opacity;
      var slide = reduced ? 0 : Math.max(0, 1 - (age - 0.5) / 0.35) * 32;
      ctx.translate(slide, 0);
      rect(0, 115, W, 82, "#0d1527ed");
      rect(0, 115, W, 1, palettes[s.enemyId][2]);
      rect(0, 196, W, 1, palettes[s.enemyId][1]);
      portrait(s.enemyId, 0, -3, 83, 114);
      ctx.textAlign = "left";
      ctx.fillStyle = palettes[s.enemyId][2];
      fittedText(DanmakuEngine.cast[s.enemyId].name, 110, 135, 123, 13);
      ctx.fillStyle = "#eee3ce";
      var lines = {
        alice: "人形の動き、\n見切れるかしら？",
        marisa: "準備はいいか？\nいくぜ！",
        patchouli: "さて、どの魔法に\nしようかしら。",
      };
      wrappedText(lines[s.enemyId], 110, 154, 121, 10, 14);
      ctx.restore();
    }
    function drawEnemySpell(s) {
      var card = s.enemySpell,
        declaration = DanmakuEngine.declarationDuration;
      if (s.countdown > 0) return;
      if (!card.nonspell) {
        rect(16, 4, W - 32, 26, "#080d1970");
        rect(18, 7, W - 36, 3, "#080d19d9");
        var health =
          card.reload > 0 ? 1 - card.reload / 1.1 : card.hp / card.maxHp;
        rect(
          18,
          7,
          (W - 36) * Math.max(0, Math.min(1, health)),
          3,
          palettes[s.enemyId][2]
        );
        rect(
          18,
          13,
          (W - 36) * Math.max(0, Math.min(1, card.remaining / card.duration)),
          1,
          "#d6be95"
        );
        arcadeText(
          card.reload > 0 ? "再充填" : "耐久",
          36,
          25,
          8,
          "#c8d1e3",
          42
        );
        arcadeText(
          "TIME  " + card.remaining.toFixed(2),
          W - 43,
          25,
          10,
          card.remaining < 5 ? "#f4a4ad" : "#fff1cf",
          72
        );
      }
      if (card.age < declaration && !card.nonspell && !s.breakNotice) {
        ctx.save();
        ctx.globalAlpha = 0.45 * Math.min(1, (declaration - card.age) / 0.4);
        var r = reduced ? 44 : 18 + Math.min(1.4, card.age) * 58;
        circle(s.boss.x, s.boss.y, r, palettes[s.enemyId][2]);
        circle(s.boss.x, s.boss.y, r + 6, palettes[s.enemyId][1]);
        ctx.restore();
        cutIn(s.enemyId, card.name, card.age, declaration, false);
      }
      if (s.breakNotice) {
        var n = s.breakNotice,
          alpha = Math.min(1, n.age / 0.07, (2.2 - n.age) / 0.45);
        var rise = reduced ? 0 : Math.min(5, n.age * 3);
        ctx.save();
        ctx.globalAlpha = Math.max(0, alpha);
        portrait(s.playerId, n.captured ? 2 : 0, 152, 33 - rise, 86);
        if (n.cancelled)
          arcadeText(
            "BONUS  " + n.cancelled,
            82,
            45 - rise,
            10,
            "#f4e69b",
            148
          );
        arcadeText(
          n.captured ? "Spell Card Bonus!" : "Spell Card Finish",
          82,
          62 - rise,
          12,
          n.captured ? "#f18e98" : "#c7dcec",
          148
        );
        arcadeText(
          "+" + n.bonus,
          82,
          83 - rise,
          21,
          n.captured ? "#f6b4b9" : "#d8dfed",
          148
        );
        arcadeText(
          n.reason === "music" ? "通常弾幕へ" : "時間満了",
          82,
          98 - rise,
          9,
          "#d8e5f1",
          148
        );
        ctx.restore();
      }
      if (s.pressureNotice && !s.breakNotice) {
        ctx.save();
        ctx.globalAlpha = Math.max(
          0,
          Math.min(
            1,
            s.pressureNotice.age / 0.06,
            (1.1 - s.pressureNotice.age) / 0.25
          )
        );
        arcadeText("BULLET CANCEL", 120, 96, 12, "#d3edf5");
        arcadeText("+" + s.pressureNotice.value, 120, 111, 10, "#e9d59d");
        ctx.restore();
      }
      if (
        s.eventNotice &&
        !s.breakNotice &&
        !(card.age < declaration && !card.nonspell)
      ) {
        var notice = s.eventNotice;
        ctx.save();
        ctx.globalAlpha = Math.max(
          0,
          Math.min(1, notice.age / 0.08, (1.6 - notice.age) / 0.3)
        );
        if (notice.kind === "miss") {
          portrait(s.playerId, 3, 11, 59, 78);
          arcadeText("MISS", 153, 94, 18, "#f2a1ac", 126);
          arcadeText("残機 " + notice.value, 153, 110, 10, "#f2dce2", 126);
        } else if (notice.kind === "rank")
          arcadeText("段位 " + notice.value, 120, 95, 13, "#ead5a4");
        ctx.restore();
      }
    }
    function drawSpell(s) {
      var spell = s.spell;
      if (!spell) return;
      var progress = spell.age / spell.duration;
      var envelope = Math.min(
        1,
        (spell.age + 0.08) / 0.18,
        (spell.duration - spell.age) / 0.3
      );
      var phase = reduced ? 0.4 : progress;
      var x = spell.x,
        y = spell.y;
      var color = DanmakuEngine.cast[spell.id].color;
      ctx.save();
      ctx.globalAlpha = envelope * 0.08;
      rect(0, 0, W, H, color);
      ctx.lineWidth = 2;
      if (spell.id === "marisa") {
        // A sustained fan-shaped magic cannon, with a bright core and star rim.
        var width = 34 + Math.sin((Math.min(1, phase * 4) * Math.PI) / 2) * 30;
        ctx.globalAlpha = envelope * 0.26;
        ctx.fillStyle = "#f7a753";
        ctx.beginPath();
        ctx.moveTo(x - 10, y);
        ctx.lineTo(x - width, 0);
        ctx.lineTo(x + width, 0);
        ctx.lineTo(x + 10, y);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = envelope * 0.58;
        ctx.fillStyle = "#ffe5a4";
        ctx.beginPath();
        ctx.moveTo(x - 5, y);
        ctx.lineTo(x - width * 0.44, 0);
        ctx.lineTo(x + width * 0.44, 0);
        ctx.lineTo(x + 5, y);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = envelope * 0.9;
        rect(x - 3, 0, 6, y, "#fff6d5");
        circle(x, y - 4, 20, "#ffda79");
        circle(x, y - 4, 28, "#f39bd5");
        for (var i = 0; i < 16; i++) {
          var yy = y - ((i * 29 + phase * 220) % Math.max(1, y));
          var edge = 14 + (1 - yy / Math.max(1, y)) * width;
          star(
            x + (i % 2 ? -edge : edge),
            yy,
            4 + (i % 3),
            i % 2 ? "#f7b5d4" : "#fff1ad"
          );
        }
      } else if (spell.id === "alice") {
        // Six dolls draw luminous threads to the opponent, joined by a seal.
        var radius = 44 + Math.min(1, phase * 3) * 24;
        var centerY = Math.min(y - 28, H - 75);
        ctx.globalAlpha = envelope * 0.65;
        circle(x, centerY, radius, "#a1e4ef");
        circle(x, centerY, radius + 6, "#eaa9cc");
        for (var doll = 0; doll < 6; doll++) {
          var angle = (doll * Math.PI) / 3 + phase * 0.75;
          var dx = x + Math.cos(angle) * radius,
            dy = centerY + Math.sin(angle) * radius;
          ctx.globalAlpha = envelope * 0.2;
          ctx.lineWidth = 5;
          ctx.strokeStyle = "#96dff7";
          ctx.beginPath();
          ctx.moveTo(dx, dy);
          ctx.lineTo(s.boss.x, s.boss.y);
          ctx.stroke();
          ctx.globalAlpha = envelope * 0.9;
          ctx.lineWidth = 1;
          ctx.strokeStyle = doll % 2 ? "#f5b7d6" : "#dcfaff";
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(dx, dy);
          ctx.lineTo(
            x + Math.cos(angle + (Math.PI * 2) / 3) * radius,
            centerY + Math.sin(angle + (Math.PI * 2) / 3) * radius
          );
          ctx.stroke();
          witch("alice", dx, dy, 14);
          star(dx, dy - 14, 3, "#fff2b9");
        }
      } else {
        // Five elemental sigils form an expanding, rotating double pentagram.
        var colors = ["#fa9b98", "#8ecef3", "#a9dda9", "#ffe09a", "#d5adf2"];
        var glyphs = ["火", "水", "木", "金", "土"];
        var cy = Math.max(135, Math.min(y - 90, 240));
        var r = 55 + Math.min(1, phase * 3) * 30;
        ctx.globalAlpha = envelope * 0.75;
        circle(W / 2, cy, r - 10, "#d5adf2");
        circle(W / 2, cy, r + 14, "#a4dcf3");
        for (var element = 0; element < 5; element++) {
          var a = (element * Math.PI * 2) / 5 - Math.PI / 2 + phase * 0.8;
          var ex = W / 2 + Math.cos(a) * r,
            ey = cy + Math.sin(a) * r;
          ctx.strokeStyle = colors[element];
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(
            W / 2 + Math.cos(a + (Math.PI * 4) / 5) * r,
            cy + Math.sin(a + (Math.PI * 4) / 5) * r
          );
          ctx.stroke();
          ctx.globalAlpha = envelope * 0.22;
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(ex, ey);
          ctx.lineTo(s.boss.x, s.boss.y);
          ctx.stroke();
          ctx.globalAlpha = envelope;
          ctx.lineWidth = 1;
          ctx.fillStyle = "#231b38";
          ctx.beginPath();
          ctx.arc(ex, ey, 13, 0, Math.PI * 2);
          ctx.fill();
          circle(ex, ey, 14, colors[element]);
          circle(ex, ey, 17, colors[element]);
          ctx.fillStyle = colors[element];
          ctx.font = '12px "Fusion Pixel", monospace';
          ctx.textAlign = "center";
          ctx.fillText(glyphs[element], ex, ey + 5);
        }
      }
      ctx.restore();
    }
    function draw(s) {
      if (!ctx) return;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
      ctx.imageSmoothingEnabled = false;
      var palette = palettes[s.enemyId],
        t = reduced ? 0 : s.time;
      rect(0, 0, W, H, palette[0]);
      ctx.save();
      var shake = 0;
      if (!reduced && s.countdown <= 0) {
        if (s.spell) {
          var age = s.spell.age;
          var impact =
            age > 0.05 && age < 1.2
              ? Math.pow(1 - ((age - 0.05) % 0.18) / 0.18, 3)
              : 0;
          shake = Math.max(shake, 3.2 * Math.exp(-age * 5) + impact * 1.7);
        }
        s.lasers.forEach(function (l) {
          if (
            l.spread &&
            l.age >= l.warning &&
            l.age < l.warning + l.duration
          ) {
            var active = l.age - l.warning,
              tail = Math.min(1, (l.warning + l.duration - l.age) / 0.3);
            shake = Math.max(
              shake,
              (0.85 + 1.45 * Math.exp(-active * 9)) * tail
            );
          }
        });
      }
      if (shake)
        ctx.translate(
          Math.round(Math.sin(s.time * 113) * shake),
          Math.round(Math.cos(s.time * 97) * shake * 0.65)
        );
      drawBackground(s, palette);
      ctx.globalAlpha = 0.4;
      ctx.lineWidth = 1;
      circle(s.boss.x, s.boss.y, 30, palette[1]);
      circle(s.boss.x, s.boss.y, 35, palette[1]);
      for (var point = 0; point < 6; point++) {
        var angle = (point * Math.PI) / 3 + t * 0.12;
        ctx.beginPath();
        ctx.moveTo(
          s.boss.x + Math.cos(angle) * 33,
          s.boss.y + Math.sin(angle) * 33
        );
        ctx.lineTo(
          s.boss.x + Math.cos(angle + (Math.PI * 2) / 3) * 33,
          s.boss.y + Math.sin(angle + (Math.PI * 2) / 3) * 33
        );
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (!s.enemySpell.nonspell && s.countdown <= 0)
        DanmakuPatterns.emitters(s).forEach(function (e, index) {
          var point = DanmakuBossSprites.deploy(
            s.boss,
            e,
            s.enemySpell.age,
            index,
            reduced
          );
          ctx.save();
          ctx.globalAlpha = point.opacity;
          if (point.progress < 1) {
            ctx.strokeStyle = e.color;
            ctx.globalAlpha *= 0.35;
            ctx.beginPath();
            ctx.moveTo(s.boss.x, s.boss.y);
            ctx.lineTo(point.x, point.y);
            ctx.stroke();
            ctx.globalAlpha = point.opacity;
          }
          DanmakuBossSprites.satellite(
            ctx,
            s.enemyId,
            point.x,
            point.y,
            index,
            reduced ? 0 : t,
            point.scale,
            e.color
          );
          ctx.restore();
        });
      if (
        !DanmakuBossSprites.draw(
          ctx,
          s.enemyId,
          s.boss.x,
          s.boss.y,
          t,
          s.countdown <= 0 && !s.enemySpell.nonspell && !s.intermission
            ? s.enemySpell.age
            : -1,
          reduced
        )
      )
        witch(s.enemyId, s.boss.x, s.boss.y, 26);
      s.shots.forEach(function (shot) {
        ctx.save();
        ctx.translate(shot.x, shot.y);
        ctx.rotate(Math.atan2(shot.vy, shot.vx) + Math.PI / 2);
        if (shot.kind === "beam") {
          ctx.globalAlpha = 0.18;
          rect(-3, -21, 6, 35, shot.color);
          ctx.globalAlpha = 0.8;
          rect(-1, -20, 2, 30, "#fff4b3");
          rect(0, -22, 1, 29, "#fffef3");
        } else if (shot.kind === "missile") {
          ctx.globalAlpha = 0.55;
          rect(-1, 4, 2, 8, "#f6b97c");
          ctx.globalAlpha = 1;
          rect(-2, -5, 4, 9, "#f8e6c9");
          rect(-1, -7, 2, 3, "#fff9d7");
          rect(-3, 1, 1, 4, "#c19376");
          rect(2, 1, 1, 4, "#c19376");
        } else if (shot.kind === "seeker") {
          ctx.globalAlpha = 0.23;
          circle(0, 0, 5, shot.color);
          ctx.globalAlpha = 0.85;
          circle(0, 0, 3, shot.color);
          rect(-1, -1, 2, 2, "#fff7f4");
        } else {
          ctx.globalAlpha = 0.22;
          rect(-2, 0, 4, 12, shot.color);
          ctx.globalAlpha = 0.9;
          ctx.fillStyle = shot.color;
          ctx.beginPath();
          ctx.moveTo(0, shot.kind === "crystal" ? -7 : -10);
          ctx.lineTo(shot.kind === "crystal" ? 3 : 1, 0);
          ctx.lineTo(0, 5);
          ctx.lineTo(shot.kind === "crystal" ? -3 : -1, 0);
          ctx.closePath();
          ctx.fill();
          rect(0, -5, 1, 7, "#fff9f1");
        }
        ctx.restore();
      });
      var p = s.player;
      DanmakuEngine.options(s).forEach(function (o) {
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = DanmakuEngine.cast[s.playerId].color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - 4);
        ctx.lineTo(o.x, o.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (s.playerId === "alice") witch("alice", o.x, o.y, 10, true);
        else if (s.playerId === "marisa") {
          rect(o.x - 3, o.y - 3, 6, 6, "#5a4939");
          rect(o.x - 2, o.y - 4, 4, 8, "#d9ba71");
          rect(o.x - 1, o.y - 2, 2, 4, "#fff4c8");
          ctx.globalAlpha = 0.3;
          circle(o.x, o.y, 6, "#f4cf8a");
        } else {
          var color = ["#efa5a5", "#a3d9f0", "#bde2ad", "#f0d991"][o.index];
          rect(o.x - 4, o.y - 3, 8, 7, "#433348");
          rect(o.x - 3, o.y - 2, 6, 5, color);
          rect(o.x, o.y - 2, 1, 5, "#f5ebd8");
          ctx.globalAlpha = 0.4;
          circle(o.x, o.y, 7, color);
        }
      });
      ctx.globalAlpha = p.invulnerable > 0 ? 0.65 : 1;
      witch(s.playerId, p.x, p.y, 24, true, p.facing, s.time);
      ctx.globalAlpha = 1;
      // Boxed pickups cannot be mistaken for round/diamond/star enemy bullets.
      var itemColors = { power: "#ef8b92", life: "#e6abea", clear: "#92d6e5" };
      var itemGlyphs = {
        power: ["11110", "10001", "11110", "10000", "10000"],
        life: ["01010", "11111", "11111", "01110", "00100"],
        clear: ["11110", "10001", "11110", "10001", "11110"],
      };
      s.items.forEach(function (item) {
        var ix = Math.round(item.x),
          iy = Math.round(item.y);
        rect(ix - 7, iy - 7, 14, 14, "#090e1c");
        rect(ix - 6, iy - 6, 12, 12, itemColors[item.type]);
        rect(ix - 4, iy - 4, 8, 8, "#252238");
        itemGlyphs[item.type].forEach(function (row, y) {
          for (var x = 0; x < row.length; x++)
            if (row[x] === "1") rect(ix - 2 + x, iy - 2 + y, 1, 1, "#fff7e7");
        });
      });
      drawLasers(s);
      s.bullets.forEach(function (b) {
        var x = Math.round(b.x),
          y = Math.round(b.y);
        if (["star", "bigstar", "smallstar"].indexOf(b.shape) >= 0) {
          // A 9px minimum silhouette stays readable at the native 240px arena
          // width. Keep the generous collision cores independent of the tips.
          ctx.save();
          ctx.lineWidth = 1;
          star(
            x,
            y,
            b.shape === "bigstar" ? 6.5 : b.shape === "smallstar" ? 4.5 : 5.4,
            b.color
          );
          rect(x - 1, y - 1, 2, 2, "#fff8e8");
          ctx.restore();
        } else if (
          [
            "rice",
            "kunai",
            "scale",
            "amulet",
            "butterfly",
            "bubble",
            "darkorb",
            "flame",
            "pellet",
          ].indexOf(b.shape) >= 0
        ) {
          ctx.save();
          ctx.translate(x, y);
          if (["bubble", "darkorb", "pellet"].indexOf(b.shape) < 0)
            ctx.rotate(
              (b.heading === undefined ? Math.atan2(b.vy, b.vx) : b.heading) +
                Math.PI / 2
            );
          ctx.drawImage(bulletSprite(b.shape, b.color), -12, -12);
          ctx.restore();
        } else if (b.shape === "diamond") {
          ctx.fillStyle = b.color;
          ctx.strokeStyle = "#20182d";
          ctx.beginPath();
          ctx.moveTo(x, y - 5);
          ctx.lineTo(x + 3, y);
          ctx.lineTo(x, y + 5);
          ctx.lineTo(x - 3, y);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          rect(x, y - 2, 1, 3, "#fff3dd");
        } else {
          ctx.fillStyle = b.color;
          ctx.beginPath();
          ctx.arc(x, y, 3.5, 0, Math.PI * 2);
          ctx.fill();
          circle(x, y, 4, "#20182d");
          rect(x - 1, y - 2, 2, 2, "#fff8e8");
        }
      });
      s.cancelFlashes.forEach(function (f) {
        var t = f.age / 0.28,
          r = 2 + t * 3;
        ctx.save();
        ctx.globalAlpha = (1 - t) * 0.85;
        ctx.translate(Math.round(f.x), Math.round(f.y));
        if (!reduced) ctx.rotate(((f.turn + t) * Math.PI) / 4);
        ctx.lineWidth = 0.8;
        ctx.strokeStyle = f.color;
        ctx.strokeRect(-r, -r, r * 2, r * 2);
        ctx.strokeStyle = "#fffadf";
        ctx.strokeRect(-r * 0.65, -r * 0.65, r * 1.3, r * 1.3);
        rect(-1, -2, 2, 4, "#fffbe8");
        rect(-2, -1, 4, 2, "#fffbe8");
        ctx.restore();
      });
      s.pointLabels.forEach(function (f) {
        ctx.save();
        ctx.globalAlpha = Math.min(0.75, (0.8 - f.age) * 2);
        ctx.font = '5px "Fusion Pixel",monospace';
        ctx.textAlign = "center";
        ctx.fillStyle = "#ebe6a2";
        ctx.fillText(
          "+" + f.value,
          Math.max(8, Math.min(W - 8, f.x)),
          f.y - (reduced ? 0 : f.age * 12)
        );
        ctx.restore();
      });
      s.scoreItems.forEach(function (item) {
        if (item.px !== undefined && !reduced) {
          ctx.globalAlpha = 0.25;
          ctx.strokeStyle = "#fff3bb";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(item.px, item.py);
          ctx.lineTo(item.x, item.y);
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
        var ix = Math.round(item.x),
          iy = Math.round(item.y);
        // PCB-style small star/square items, clearly different from blue B boxes.
        rect(ix - 2, iy - 2, 5, 5, "#727b91");
        rect(ix - 1, iy - 1, 3, 3, "#f7f5cd");
        rect(ix, iy - 2, 1, 5, "#fffdeb");
        rect(ix - 2, iy, 5, 1, "#fffdeb");
      });
      if (s.focus || s.grazePulse > 0) {
        ctx.save();
        ctx.globalAlpha = 0.24 + s.grazePulse * 0.5;
        ctx.setLineDash([2, 4]);
        circle(p.x, p.y, s.grazeRadius, "#ade8df");
        ctx.setLineDash([]);
        if (s.grazePulse > 0 && !reduced)
          circle(p.x, p.y, 16 + (1 - s.grazePulse) * 9, "#c4fff2");
        ctx.restore();
      }
      if (s.grazeTimer > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, s.grazeTimer * 3);
        ctx.font = '8px "Fusion Pixel",monospace';
        ctx.fillStyle = "#cef2df";
        ctx.textAlign = "center";
        ctx.fillText(
          "GRAZE +" + 80 * s.grazeChain,
          Math.max(42, Math.min(W - 42, p.x)),
          Math.max(18, p.y - 24)
        );
        ctx.restore();
      }
      // The real 2.2px hitbox stays visible even with a busy character sprite.
      circle(p.x, p.y, s.focus ? 9 : 4.3, "#142432");
      circle(p.x, p.y, 2.5, "#fff9e7");
      rect(p.x - 1, p.y - 1, 2, 2, "#d74a68");
      if (p.invulnerable > 0) {
        ctx.globalAlpha = 0.55;
        circle(p.x, p.y, 15, "#a9e8ed");
        ctx.globalAlpha = 1;
      }
      if (!reduced)
        s.sparks.forEach(function (s) {
          ctx.globalAlpha = Math.min(1, s.life * 3);
          rect(s.x, s.y, 2, 2, s.color);
        });
      ctx.globalAlpha = 1;
      if (s.cancelPulse) {
        // A brief local burst belongs to the defeated spell; cancellation itself
        // is drawn at every bullet above, not as a screen-wide expanding ring.
        var cancel = s.cancelPulse;
        if (cancel.kind === "spell" && cancel.age < 0.35) {
          ctx.save();
          ctx.globalAlpha = (1 - cancel.age / 0.35) * 0.7;
          for (var ray = 0; ray < 8; ray++) {
            var a = (ray * Math.PI) / 4,
              r = reduced ? 15 : 8 + cancel.age * 55;
            ctx.strokeStyle = ray % 2 ? "#fff1ed" : palette[2];
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(cancel.x + Math.cos(a) * 4, cancel.y + Math.sin(a) * 4);
            ctx.lineTo(cancel.x + Math.cos(a) * r, cancel.y + Math.sin(a) * r);
            ctx.stroke();
          }
          ctx.restore();
        }
      }
      drawSpell(s);
      ctx.restore();
      // Notices and health/time bars remain stationary while the arena shakes.
      if (s.intermission) {
        var rest = s.intermission;
        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, (rest.age - 0.35) / 0.4));
        arcadeText("第 " + s.round + " 巡 終了", 120, 103, 14, "#f1d99e");
        arcadeText("累計 " + Math.floor(s.score), 120, 121, 10, "#d8e3ee");
        ctx.restore();
      } else drawEnemySpell(s);
      if (s.spell && s.spell.age < 1.25) {
        var bombNames = {
          alice: "魔符「アーティフルサクリファイス」",
          marisa: "恋符「マスタースパーク」",
          patchouli: "火水木金土符「賢者の石」",
        };
        cutIn(s.spell.id, bombNames[s.spell.id], s.spell.age, 1.25, true);
      }
      if (s.pickupNotice) {
        var notices = {
          power: s.power === DanmakuEngine.maxPower ? "火力 MAX" : "火力 UP",
          life: s.lives === 5 ? "残機 MAX" : "残機 +1",
          clear: s.bombs === 5 ? "霊撃 MAX" : "霊撃 +1",
        };
        ctx.save();
        ctx.globalAlpha = Math.min(1, (1.1 - s.pickupNotice.age) * 3);
        var textY =
          Math.max(165, Math.min(H - 30, p.y - 38)) -
          (reduced ? 0 : s.pickupNotice.age * 7);
        arcadeText(
          notices[s.pickupNotice.type],
          Math.max(55, Math.min(W - 55, p.x)),
          textY,
          12,
          itemColors[s.pickupNotice.type],
          110
        );
        ctx.restore();
      }
      if (s.auto) {
        rect(4, H - 17, 45, 13, "#0c1125d9");
        ctx.fillStyle = "#b8dfd0";
        ctx.font = '10px "Fusion Pixel", monospace';
        ctx.textAlign = "left";
        ctx.fillText("自動", 9, H - 7);
      }
      if (s.intro && s.countdown > 1.5) drawIntro(s);
      else if (s.countdown > 0 && s.phase === "playing") {
        arcadeText(
          s.countdown > 0.6 ? "準備はいい？" : "開始！",
          W / 2,
          176,
          s.countdown > 0.6 ? 13 : 19,
          "#f6e6bb"
        );
      }
      ctx.globalAlpha = 1;
    }
    return { draw: draw, ready: ready, supported: Boolean(ctx) };
  }
  window.DanmakuRenderer = { create: create };
})();
