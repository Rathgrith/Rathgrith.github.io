/* Canvas-only presentation; the collision/scoring simulation lives in the engine. */
(function () {
  "use strict";
  var assetBase = (window.SiteAssets && window.SiteAssets.base) || "";
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
      motionPref = matchMedia("(prefers-reduced-motion: reduce)"),
      reduced = motionPref.matches;
    canvas.width = W * 2;
    canvas.height = H * 2;
    var ready = Promise.all(
      Object.keys(DanmakuEngine.cast)
        .reduce(function (ids, id) {
          return ids.concat(
            id,
            id + "-player",
            id + "-flight",
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
            image.src = id.endsWith("-portraits")
              ? assetBase +
                "/assets/images/classic/danmaku/portraits/" +
                id.split("-")[0] +
                "-expressions.png"
              : assetBase + "/assets/images/classic/danmaku/" + id + ".svg";
          });
        })
    );
    ready = Promise.all([
      ready,
      DanmakuScenery.load(),
      DanmakuBossSprites.load(),
      window.DanmakuPlayerSprites && DanmakuPlayerSprites.load(),
    ]);
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
    function witch(id, x, y, width, rear, pose, time, flight) {
      if (
        rear &&
        window.DanmakuPlayerSprites &&
        DanmakuPlayerSprites.draw(
          ctx,
          id,
          x,
          y,
          time,
          pose,
          reduced,
          (width * 4) / 3, flight
        )
      )
        return;
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
    function drawBackground(s) {
      DanmakuScenery.draw(ctx, s.enemyId, DanmakuRun.sceneIndex(s),
        s.rhythm.sectionKey % 2 === 0 ? s.time - s.rhythm.sectionStart : 2,
        s.time, s.scroll, reduced, s.bullets.length > 120);
    }
    function casterCues(s) {
      var sources = Object.create(null), body = {since:Infinity, until:Infinity};
      function cue(source, elapsed) {
        if (elapsed < -0.30 || elapsed >= 0.32) return;
        var timing = sources[source] || (sources[source] = {since:Infinity, until:Infinity});
        if (elapsed < 0) {
          timing.until = Math.min(timing.until, -elapsed);
          body.until = Math.min(body.until, -elapsed);
        } else {
          timing.since = Math.min(timing.since, elapsed);
          body.since = Math.min(body.since, elapsed);
        }
      }
      s.casting.forEach(function (event) { cue(event.source, s.time - event.time); });
      s.lasers.forEach(function (beam) { cue(beam.castSource, beam.age - beam.warning); });
      s.bullets.forEach(function (shot) {
        var writing = shot.motion && shot.motion.inscription;
        if (writing) cue(shot.castSource, shot.age - writing.launch);
      });
      return {sources:sources, body:DanmakuBossSprites.castPose(body.since, body.until)};
    }
    function drawCasting(s, t, sources, color) {
      if (!sources.length || s.enemySpell.nonspell) return;
      var x = s.boss.x, y = s.boss.y;
      var pulse = reduced ? 0.5 : (1 - Math.cos(s.rhythm.progress * Math.PI * 2)) * 0.5;
      ctx.save();
      ctx.strokeStyle = color; ctx.lineWidth = 0.7;
      ctx.globalAlpha = (s.bullets.length > 160 ? 0.23 : 0.32) + 0.07 * pulse;
      ctx.beginPath();
      if (s.enemyId === "alice") {
        // Sagging marionette cords and the crossed threads of a suspended loom.
        sources.forEach(function (needle, i) {
          var hand = i % 2 ? 12 : -12;
          ctx.moveTo(x + hand, y - 2);
          ctx.quadraticCurveTo((x + needle.x) / 2 + hand, y + 19 + pulse * 2, needle.x, needle.y);
          ctx.moveTo(needle.x - 3, needle.y - 7); ctx.lineTo(needle.x, needle.y - 10); ctx.lineTo(needle.x + 3, needle.y - 7);
        });
        ctx.moveTo(x - 22, y - 9); ctx.lineTo(x + 19, y + 9);
        ctx.moveTo(x + 22, y - 9); ctx.lineTo(x - 19, y + 9);
      } else if (s.enemyId === "marisa") {
        // The lenses sit in a brass orrery. Its slanted meridians meet at the caster.
        for (var k = 0; k < 3; k++) {
          var tilt = (k - 1) * 0.74 + 0.12 * Math.sin(t * 0.36);
          ctx.moveTo(x + Math.cos(tilt) * 30, y + Math.sin(tilt) * 30);
          ctx.ellipse(x, y, 30, 9 + pulse * 2, tilt, 0, 2 * Math.PI);
        }
        sources.forEach(function (lens) {
          ctx.moveTo(x, y); ctx.lineTo(lens.x, lens.y);
          ctx.moveTo(lens.x + 8, lens.y); ctx.arc(lens.x, lens.y, 8, 0, 2 * Math.PI);
        });
      } else {
        // Two curved leaves and a spine unfold behind the three elemental books.
        [-1, 1].forEach(function (side) {
          for (var leaf = 0; leaf < 3; leaf++) {
            var edge = x + side * (22 + leaf * 8 + 3 * pulse);
            ctx.moveTo(x, y + 15);
            ctx.quadraticCurveTo(x + side * 14, y + 9 - leaf * 2, edge, y + 13 - leaf * 2);
            ctx.lineTo(edge, y - 12 - leaf * 2);
            ctx.quadraticCurveTo(x + side * 13, y - 14 - leaf * 2, x, y - 5);
          }
        });
        ctx.moveTo(x, y - 5); ctx.lineTo(x, y + 15);
      }
      ctx.stroke();
      if (!reduced) s.casting.forEach(function (mark) {
        var age = s.time - mark.time;
        if (age < 0 || age > 0.30) return;
        // Short source flashes follow actual releases, behind the hostile shots.
        ctx.globalAlpha = (1 - age / 0.30) * 0.6;
        ctx.strokeStyle = mark.color;
        var r = 4 + age * 26;
        ctx.beginPath();
        if (s.enemyId === "alice") {
          ctx.moveTo(mark.x - r, mark.y - r * 0.45); ctx.lineTo(mark.x + r * 0.6, mark.y + r * 0.5);
          ctx.moveTo(mark.x + r, mark.y - r * 0.45); ctx.lineTo(mark.x - r * 0.6, mark.y + r * 0.5);
        } else if (s.enemyId === "marisa") {
          ctx.arc(mark.x, mark.y, r, -0.8, 0.7);
          ctx.moveTo(mark.x + Math.cos(2.3) * r, mark.y + Math.sin(2.3) * r);
          ctx.arc(mark.x, mark.y, r, 2.3, 3.8);
        } else {
          ctx.moveTo(mark.x - r, mark.y - 2); ctx.lineTo(mark.x, mark.y + r * 0.5);
          ctx.lineTo(mark.x + r, mark.y - 2);
        }
        ctx.stroke();
      });
      ctx.restore();
    }
    function drawFoes(s) {
      s.foes.forEach(function (f) {
        if (f.hp <= 0) return;
        var x = Math.round(f.x), y = Math.round(f.y);
        ctx.save();
        ctx.translate(x, y);
        DanmakuBossSprites.escort(ctx, f, reduced);
        DanmakuBossSprites.muzzle(ctx, f.warning > 0 ? f.aim : f.fireAngle,
          f.warning, s.time - f.firedAt, reduced);
        if (f.kind === "keeper") {
          rect(-5, 8, 10, 2, "#292031");
          rect(-5, 8, Math.ceil(10 * f.hp / f.maxHp), 1, "#f0c784");
        }
        ctx.restore();
      });
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
    function cutIn(id, title, age, duration, bomb, cue) {
      var envelope = Math.min(1, age / 0.12, (duration - age) / 0.3);
      if (envelope <= 0) return;
      ctx.save();
      ctx.globalAlpha = envelope;
      var slide = reduced ? 0 : Math.max(0, 1 - age / 0.26) * W;
      ctx.translate(slide, 0);
      if (bomb) {
        rect(4, 32, 177, 28, "#121728bf");
        rect(4, 59, 177, 1, DanmakuEngine.cast[id].color);
        portrait(id, 1, 6, 32, 27);
        ctx.textAlign = "left"; ctx.fillStyle = DanmakuEngine.cast[id].color;
        fittedText("霊撃", 36, 42, 138, 8);
        ctx.fillStyle = "#fff1d7"; fittedText(title, 36, 54, 140, 9);
        ctx.restore();
        return;
      }
      rect(0, 103, W, 70, "#101528ee");
      rect(0, 103, W, 1, DanmakuEngine.cast[id].color);
      rect(0, 172, W, 1, DanmakuEngine.cast[id].color);
      portrait(id, 1, -4, 63, 110);
      ctx.textAlign = "left";
      ctx.fillStyle = DanmakuEngine.cast[id].color;
      fittedText("SPELL CARD", 105, 121, 129, 10);
      ctx.fillStyle = "#fff1d7";
      wrappedText(title, 105, 140, 129, 10, 13);
      if (cue) {
        ctx.fillStyle = "#d9d6c9";
        fittedText(cue, 105, 166, 129, 9);
      }
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
        var guarded = card.guardRemaining > 0;
        rect(16, 4, W - 32, 26, "#080d1970");
        rect(18, 7, W - 36, 3, "#080d19d9");
        var health =
          card.reload > 0 ? 1 - card.reload / 1.1 : card.hp / card.maxHp;
        if (!card.reload && card.echoHp > card.hp)
          rect(18, 7, (W - 36) * Math.min(1, card.echoHp / card.maxHp), 3, "#e9bd9b");
        rect(
          18,
          7,
          (W - 36) * Math.max(0, Math.min(1, health)),
          3,
          guarded ? "#b9e4f3" : palettes[s.enemyId][2]
        );
        rect(
          18,
          13,
          (W - 36) * Math.max(0, Math.min(1, card.remaining / card.duration)),
          1,
          "#d6be95"
        );
        arcadeText(
          guarded ? "結界 " + Math.ceil(card.guardRemaining) + "秒" :
            card.reload > 0 ? "再充填" : card.clears ? "耐久×" + Math.round(card.maxHp / card.baseHp) : "耐久",
          36,
          25,
          8,
          "#c8d1e3",
          42
        );
        var movement = DanmakuPatterns.difficulty(s).part;
        for (var segment = 0; segment < 3; segment++)
          rect(73 + segment * 10, 20, 7, segment === movement ? 3 : 1,
            segment === movement ? palettes[s.enemyId][2] : "#9292a5");
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
        cutIn(s.enemyId, card.name, card.age, declaration, false, card.cue);
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
      if (s.spell && window.DanmakuPlayerSprites)
        DanmakuPlayerSprites.drawSpiritStrike(ctx, s.spell, s.boss, reduced);
    }
    function drawEquipment(s) {
      if (!s.run || !s.lives) return;
      var r = s.run, p = s.player, x = Math.round(p.x), y = Math.round(p.y);
      ctx.save();
      if (r.overdriveUntil > s.time) {
        // Two exhausts behind the character mark the whole firing-rate boost.
        for (var side = -1; side <= 1; side += 2) {
          var length = reduced ? 8 : 9 + 4 * Math.sin(s.time * 24 + side);
          ctx.fillStyle = "#bb593e"; ctx.beginPath();
          ctx.moveTo(x + 4 * side, y + 8); ctx.lineTo(x + 8 * side, y + 8);
          ctx.lineTo(x + 7 * side, y + 8 + length); ctx.fill();
          rect(x + 6 * side, y + 8, 1, length * .55, "#ffdc8c");
        }
      }
      var broken = s.time - r.guardBreakAt;
      if (r.guardReady || (broken >= 0 && broken < .40)) {
        var split = r.guardReady || reduced ? 0 : broken * 24;
        ctx.strokeStyle = "#c5c3ff"; ctx.lineWidth = 1.3;
        ctx.globalAlpha = r.guardReady ? .77 : Math.max(0, 1 - broken / .40);
        for (var i = -1; i <= 1; i += 2) {
          ctx.beginPath(); ctx.moveTo(x + i * (8 + split), y - 9);
          ctx.lineTo(x + i * (13 + split), y - 7); ctx.lineTo(x + i * (12 + split), y + 4);
          ctx.lineTo(x + i * (8 + split), y + 8); ctx.stroke();
        }
      }
      var equip = r.lastUpgrade, age = equip && s.time - equip.time;
      if (equip && age >= 0 && age < .62) {
        var radius = reduced ? 15 : 13 + age * 24;
        ctx.strokeStyle = DanmakuRun.upgrades[equip.id].color; ctx.lineWidth = 1.5;
        ctx.globalAlpha = Math.min(.8, (.62 - age) * 3);
        for (var k = 0; k < 4; k++) {
          var angle = Math.PI / 2 * k + (reduced ? 0 : age);
          ctx.beginPath(); ctx.arc(x, y, radius, angle, angle + .65); ctx.stroke();
        }
      }
      ctx.restore();
    }
    function draw(s) {
      reduced = motionPref.matches;
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
      drawBackground(s);
      if (s.spell && s.spell.age < 0.85) {
        var bombNames = {
          alice: "魔符「アーティフルサクリファイス」",
          marisa: "恋符「マスタースパーク」",
          patchouli: "七曜符「天球暦の綴じ目」",
        };
        cutIn(s.spell.id, bombNames[s.spell.id], s.spell.age, 0.85, true);
      }
      drawSpell(s);
      var sources = s.countdown <= 0 && !s.intermission ? DanmakuPatterns.emitters(s) : [];
      var cues = casterCues(s);
      drawCasting(s, t, sources, palette[1]);
      if (sources.length && !s.enemySpell.nonspell)
        DanmakuBossSprites.drawSight(ctx, s.boss, s.enemySpell.sight, s.time, reduced);
      drawFoes(s);
      sources.forEach(function (e, index) {
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
          var timing = cues.sources[e.id || index];
          DanmakuBossSprites.satellite(
            ctx,
            s.enemyId,
            point.x,
            point.y,
            index,
            reduced ? 0 : t,
            point.scale,
            e.color,
            e.kind,
            timing ? DanmakuBossSprites.castPose(timing.since, timing.until) : "idle"
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
          s.countdown <= 0 && !s.intermission
            ? (!s.enemySpell.nonspell && s.enemySpell.age < 1.05 ? s.enemySpell.age : DanmakuBossSprites.castingFrame(cues.body))
            : -1,
          reduced
        )
      )
        witch(s.enemyId, s.boss.x, s.boss.y, 26);
      if (window.DanmakuPlayerSprites) DanmakuPlayerSprites.drawWeapons(ctx, s, s.playerId, reduced, t);
      else s.shots.forEach(function (shot) { rect(shot.x - 1, shot.y - 4, 2, 7, shot.color); });
      if (!reduced)
        s.sparks.forEach(function (s) {
          ctx.globalAlpha = Math.min(1, s.life * 3);
          rect(s.x, s.y, 2, 2, s.color);
        });
      ctx.globalAlpha = 1;
      if (window.DanmakuPlayerSprites) DanmakuPlayerSprites.drawImpacts(ctx, s, reduced);
      drawEquipment(s);
      var p = s.player;
      ctx.globalAlpha = !s.lives ? 0 : p.invulnerable > 0 ? 0.65 : 1;
      if (s.lives && s.missBurst && !reduced)
        ctx.globalAlpha = Math.min(0.65, s.missBurst.age * 1.5);
      witch(s.playerId, p.x, p.y, 24, true, p.facing, s.time, p);
      if (s.playerId === "alice" && window.DanmakuPlayerSprites)
        DanmakuPlayerSprites.drawPuppeteerHands(ctx, s, reduced, s.time);
      ctx.globalAlpha = 1;
      // Boxed pickups cannot be mistaken for round/diamond/star enemy bullets.
      var itemColors = { power: "#ef8b92", life: "#e6abea", clear: "#92d6e5", shard: "#91e7b6" };
      var itemGlyphs = {
        shard: ["00100","01110","11011","01110","00100"],
        power: ["11110", "10001", "11110", "10000", "10000"],
        life: ["01010", "11111", "11111", "01110", "00100"],
        clear: ["11110", "10001", "11110", "10001", "11110"],
      };
      s.items.forEach(function (item) {
        var ix = Math.round(item.x),
          iy = Math.round(item.y);
        if (item.attracted && s.run.mods.magnet && !reduced) {
          var angle = Math.atan2(iy - p.y, ix - p.x), vx = Math.cos(angle), vy = Math.sin(angle);
          var tail = s.run.vacuumUntil > s.time ? 25 : 15;
          ctx.save(); ctx.strokeStyle = "#89cace"; ctx.globalAlpha = .62;
          for (var side = -2; side <= 2; side += 4) {
            ctx.beginPath(); ctx.moveTo(ix + 6 * vx - side * vy, iy + 6 * vy + side * vx);
            ctx.lineTo(ix + tail * vx - side * vy, iy + tail * vy + side * vx); ctx.stroke();
          }
          ctx.restore();
        }
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
        var script = b.motion && b.motion.inscription;
        if (script && b.inscribing) {
          if (b.age < script.delay) return;
          var armed = b.age >= script.launch - 0.23;
          // Outline-only ink is harmless. A bright directional nib precedes the beat.
          ctx.save();
          ctx.globalAlpha = armed ? 0.94 : 0.60;
          ctx.strokeStyle = armed ? "#fff0c8" : b.color;
          ctx.lineWidth = armed ? 1.2 : 0.9;
          ctx.beginPath();
          ctx.moveTo(x, y - 2.5); ctx.lineTo(x + 2.1, y);
          ctx.lineTo(x, y + 2.5); ctx.lineTo(x - 2.1, y); ctx.closePath(); ctx.stroke();
          if (armed) {
            ctx.beginPath(); ctx.moveTo(x, y);
            ctx.lineTo(x + Math.cos(script.angle) * 5, y + Math.sin(script.angle) * 5);
            ctx.stroke();
          }
          ctx.restore();
          return;
        }
        if (script && !reduced && b.age < script.launch + 0.13) {
          ctx.save();
          ctx.globalAlpha = 0.50 * (1 - (b.age - script.launch) / 0.13);
          ctx.strokeStyle = b.color; ctx.lineWidth = 1.3;
          ctx.beginPath(); ctx.moveTo(script.lockX, script.lockY); ctx.lineTo(x, y); ctx.stroke();
          ctx.restore();
        }
        DanmakuBossSprites.projectile(ctx, x, y, b, reduced);
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
      if (s.lives > 0) {
        circle(p.x, p.y, s.focus ? 9 : 4.3, "#142432");
        circle(p.x, p.y, 2.5, "#fff9e7");
        rect(p.x - 1, p.y - 1, 2, 2, "#d74a68");
      }
      if (s.lives && p.invulnerable > 0) {
        ctx.globalAlpha = 0.55;
        circle(p.x, p.y, 15, "#a9e8ed");
        ctx.globalAlpha = 1;
      }
      if (window.DanmakuPlayerSprites)
        DanmakuPlayerSprites.drawMiss(ctx, s.missBurst, DanmakuEngine.cast[s.playerId].color, reduced);
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
      if (s.pickupNotice) {
        var notices = {
          shard: "経験 +" + s.pickupNotice.xp + (s.pickupNotice.bonusPower ? "　P +" + s.pickupNotice.bonusPower : "") +
            (s.pickupNotice.bonusScore ? "　+" + s.pickupNotice.bonusScore + "点" : ""),
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
      var installed = s.run && s.run.lastUpgrade;
      if (installed && !s.intermission && !s.countdown && s.time - installed.time < 1.65) {
        var mod = DanmakuRun.upgrades[installed.id], label = mod.name + " Lv." + installed.tier;
        ctx.save(); ctx.font = '10px "Fusion Pixel", monospace'; ctx.textAlign = "right";
        var tagW = Math.min(W - 58, Math.ceil(ctx.measureText(label).width) + 13);
        rect(W - tagW - 4, H - 18, tagW, 14, "#121827ef");
        rect(W - tagW - 4, H - 18, 2, 14, mod.color);
        ctx.fillStyle = mod.color; ctx.fillText(label, W - 9, H - 8); ctx.restore();
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
