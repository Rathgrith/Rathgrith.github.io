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
    function draw(s) {
      if (!ctx) return;
      ctx.imageSmoothingEnabled = false;
      var palette = palettes[s.enemyId],
        t = reduced ? 0 : s.time;
      rect(0, 0, W, H, palette[0]);
      // Sparse stars and a perspective floor, kept dim behind the collision field.
      ctx.globalAlpha = 0.24;
      for (var i = 0; i < 34; i++) {
        var x = (i * 73 + 17) % W,
          y = (i * 97 + t * 5) % H;
        rect(x, y, i % 7 ? 1 : 2, 1, palette[2]);
      }
      ctx.strokeStyle = palette[1];
      ctx.lineWidth = 0.5;
      for (var k = -3; k <= 3; k++) {
        ctx.beginPath();
        ctx.moveTo(120 + k * 8, 90);
        ctx.lineTo(120 + k * 65, H);
        ctx.stroke();
      }
      for (var row = 0; row < 8; row++) {
        var offset = (row + ((t * 0.15) % 1)) / 8;
        var yy = 95 + offset * offset * (H - 95);
        ctx.beginPath();
        ctx.moveTo(0, yy);
        ctx.lineTo(W, yy);
        ctx.stroke();
      }
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
      if (s.flash > 0) {
        ctx.globalAlpha = s.flash;
        circle(p.x, p.y, 15 + (0.75 - s.flash) * 500, palette[2]);
        ctx.globalAlpha = 1;
      }
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
