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
      reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    canvas.width = W;
    canvas.height = H;
    var ready = Promise.all(
      Object.keys(DanmakuEngine.cast).map(function (id) {
        return new Promise(function (resolve) {
          var image = new Image();
          image.onload = function () {
            images[id] = image;
            resolve();
          };
          image.onerror = resolve;
          image.src = "/assets/images/classic/danmaku/" + id + ".svg";
        });
      })
    );
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
    function witch(id, x, y, width) {
      if (images[id])
        ctx.drawImage(
          images[id],
          Math.round(x - width / 2),
          Math.round(y - width * 0.65),
          width,
          width * 1.25
        );
      else {
        rect(x - 5, y - 9, 10, 19, DanmakuEngine.cast[id].color);
        rect(x - 3, y - 6, 6, 5, "#f7ddba");
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
      var scroll = reduced ? 0 : s.scroll;
      rect(0, 0, W, H, palette[0]);
      ctx.save();
      if (s.enemyId === "alice") {
        // A patchwork workshop floor, ribbon seams and little dolls on the rails.
        var tile = 48,
          offset = scroll % tile;
        for (var row = -1; row < H / tile + 1; row++) {
          var y = row * tile + offset;
          for (var col = 0; col < 5; col++) {
            rect(
              col * tile + 1,
              y + 1,
              tile - 2,
              tile - 2,
              (row - Math.floor(scroll / tile) + col) % 2
                ? "#172638"
                : "#122033"
            );
            ctx.strokeStyle = "#283b50";
            ctx.setLineDash([2, 5]);
            ctx.strokeRect(col * tile + 6.5, y + 6.5, tile - 12, tile - 12);
          }
        }
        ctx.setLineDash([]);
        rect(0, 0, 13, H, "#131a29");
        rect(W - 13, 0, 13, H, "#131a29");
        for (var side = 0; side < 2; side++) {
          for (var doll = -1; doll < 5; doll++) {
            var dy = doll * 96 + (scroll % 96),
              dx = side ? W - 8 : 7;
            rect(dx - 2, dy, 4, 4, "#5b5260");
            rect(dx - 3, dy + 4, 6, 6, "#34465e");
            rect(dx, dy - 19, 1, 19, "#33465b");
          }
        }
      } else if (s.enemyId === "marisa") {
        // Three parallax star layers and a blocky band of galactic dust.
        for (var band = -1; band < 7; band++) {
          var by = band * 80 + ((scroll * 0.45) % 80);
          var bx =
            112 +
            Math.sin((band - Math.floor((scroll * 0.45) / 80)) * 1.9) * 30;
          rect(bx - 31, by, 62, 38, "#231d30");
          rect(bx - 44, by + 11, 88, 13, "#231d30");
          rect(bx - 14, by + 22, 28, 37, "#292238");
        }
        for (var layer = 0; layer < 3; layer++) {
          for (var starIndex = 0; starIndex < 28; starIndex++) {
            var sx = (starIndex * 73 + layer * 41 + 17) % W;
            var sy = (starIndex * 97 + scroll * (0.3 + layer * 0.35)) % H;
            rect(
              sx,
              sy,
              1,
              layer === 2 ? 3 : 1,
              ["#38304b", "#494056", "#65566b"][layer]
            );
          }
        }
      } else {
        // Library shelves frame an aisle of dark violet tiles and floor seals.
        var shelfOffset = scroll % 64;
        for (var shelf = -1; shelf < 7; shelf++) {
          var shelfY = shelf * 64 + shelfOffset;
          for (var book = 0; book < 6; book++) {
            var bookIndex = book * 11 + (shelf - Math.floor(scroll / 64)) * 3;
            var bookHeight = 19 + (((bookIndex % 14) + 14) % 14);
            var ink = ["#42324f", "#303e51", "#49403c"][book % 3];
            rect(book * 5 + 3, shelfY + 38 - bookHeight, 4, bookHeight, ink);
            rect(
              W - 7 - book * 5,
              shelfY + 38 - bookHeight,
              4,
              bookHeight,
              ink
            );
          }
          rect(0, shelfY + 39, 36, 4, "#4a384b");
          rect(W - 36, shelfY + 39, 36, 4, "#4a384b");
          ctx.strokeStyle = "#2b253d";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(41, shelfY);
          ctx.lineTo(W / 2, shelfY + 28);
          ctx.lineTo(W - 41, shelfY);
          ctx.stroke();
        }
        ctx.strokeStyle = "#352c47";
        for (var seal = -1; seal < 3; seal++) {
          var cy = seal * 180 + ((scroll * 0.8) % 180);
          circle(W / 2, cy, 28, "#352c47");
          ctx.beginPath();
          ctx.moveTo(W / 2, cy - 28);
          ctx.lineTo(W / 2 + 24, cy + 14);
          ctx.lineTo(W / 2 - 24, cy + 14);
          ctx.closePath();
          ctx.stroke();
        }
      }
      // Far floor lines provide depth while the nearer scenery accelerates.
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = palette[1];
      ctx.lineWidth = 0.5;
      for (var k = -3; k <= 3; k++) {
        ctx.beginPath();
        ctx.moveTo(120 + k * 8, 90);
        ctx.lineTo(120 + k * 65, H);
        ctx.stroke();
      }
      ctx.restore();
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
      // A readable spell cut-in remains visible long enough to register the key press.
      ctx.globalAlpha = envelope;
      rect(8, 91, W - 16, 25, "#0c1125e8");
      rect(8, 91, 2, 25, color);
      rect(W - 10, 91, 2, 25, color);
      ctx.font = '12px "Fusion Pixel", monospace';
      ctx.textAlign = "center";
      ctx.fillStyle = "#fff0d3";
      var name = {
        alice: "ドールズサークル",
        marisa: "スターバースト",
        patchouli: "エレメントリング",
      };
      ctx.fillText("霊撃 · " + name[spell.id], W / 2, 108);
      ctx.restore();
    }
    function draw(s) {
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      var palette = palettes[s.enemyId],
        t = reduced ? 0 : s.time;
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
      if (s.enemyId === "alice") {
        witch("alice", s.boss.x - 40, s.boss.y + 14, 12);
        witch("alice", s.boss.x + 40, s.boss.y + 14, 12);
      }
      witch(s.enemyId, s.boss.x, s.boss.y, 30);
      s.shots.forEach(function (shot) {
        ctx.globalAlpha = 0.25;
        rect(shot.x - 2, shot.y - 3, 4, 14, shot.color);
        ctx.globalAlpha = 1;
        rect(
          shot.x,
          shot.y - 4,
          1,
          s.playerId === "marisa" ? 12 : 6,
          "#e7fff8"
        );
      });
      var p = s.player;
      ctx.globalAlpha = p.invulnerable > 0 ? 0.65 : 1;
      witch(s.playerId, p.x, p.y, 22);
      if (s.playerId === "alice") {
        witch("alice", p.x - (s.focus ? 11 : 19), p.y - 7, 8);
        witch("alice", p.x + (s.focus ? 11 : 19), p.y - 7, 8);
      } else if (s.playerId === "patchouli") {
        circle(p.x - 11, p.y - 3, 2, "#b7e9ea");
        circle(p.x + 11, p.y - 3, 2, "#d6b6ed");
      }
      ctx.globalAlpha = 1;
      s.bullets.forEach(function (b) {
        var x = Math.round(b.x),
          y = Math.round(b.y);
        if (b.shape === "star") star(x, y, 4.5, b.color);
        else if (b.shape === "diamond") {
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
      drawSpell(s);
      if (s.countdown > 0 && s.phase === "playing") {
        ctx.fillStyle = "#0b1023d9";
        ctx.fillRect(63, 153, 114, 37);
        ctx.fillStyle = "#f6e6bb";
        ctx.font = '12px "Fusion Pixel", monospace';
        ctx.textAlign = "center";
        ctx.fillText(s.countdown > 0.6 ? "準備はいい？" : "開始！", W / 2, 176);
      }
      ctx.globalAlpha = 1;
    }
    return { draw: draw, ready: ready, supported: Boolean(ctx) };
  }
  window.DanmakuRenderer = { create: create };
})();
