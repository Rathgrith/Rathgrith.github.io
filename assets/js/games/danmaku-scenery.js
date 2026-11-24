/* Shared distant scenery; every effect is painted before targets and hazards. */
(function (scope) {
  "use strict";
  var files = {
    alice: ["alice-workshop.png", "alice-theatre.webp"],
    marisa: ["marisa-forest.png", "marisa-observatory.webp"],
    patchouli: ["patchouli-library.png", "patchouli-vault.webp"],
  };
  var hues = { alice: "#91c3d8", marisa: "#cebb83", patchouli: "#bc96cd" };
  var tiles = {}, mists = {}, loading;
  function load() {
    if (loading) return loading;
    var base = (scope.SiteAssets && scope.SiteAssets.base) || "";
    loading = Promise.all(Object.keys(files).flatMap(function (id) {
      return files[id].map(function (file) {
        return new Promise(function (resolve) {
          var image = new Image();
          image.onload = function () {
            var tile = document.createElement("canvas");
            tile.width = 480; tile.height = 720;
            var paint = tile.getContext("2d");
            paint.drawImage(image, 0, 0, 480, 720);
            paint.globalCompositeOperation = "destination-in";
            var ends = paint.createLinearGradient(0, 0, 0, 720);
            ends.addColorStop(0, "transparent"); ends.addColorStop(24 / 360, "#000");
            ends.addColorStop(1, "#000");
            paint.fillStyle = ends; paint.fillRect(0, 0, 480, 720);
            tiles[file] = tile;
            resolve();
          };
          image.onerror = resolve;
          image.src = base + "/assets/images/classic/danmaku/backgrounds/" + file;
        });
      });
    }));
    return loading;
  }
  function tile(ctx, file, scroll) {
    var art = tiles[file];
    if (!art) return;
    var offset = scroll % 336;
    // At the end of a scroll cycle, row -2 still underlies the top 24px
    // feather. Paint it before the next tile to keep the seam opaque.
    for (var row = -2; row <= 1; row++)
      ctx.drawImage(art, 0, row * 336 + offset, 240, 360);
  }
  function fog(id) {
    if (mists[id]) return mists[id];
    var puff = document.createElement("canvas");
    puff.width = 180; puff.height = 64;
    var p = puff.getContext("2d");
    p.scale(1, 0.33);
    var glow = p.createRadialGradient(90, 96, 0, 90, 96, 90);
    glow.addColorStop(0, hues[id]); glow.addColorStop(1, "transparent");
    p.fillStyle = glow; p.fillRect(0, 0, 180, 194);
    return (mists[id] = puff);
  }
  function draw(ctx, id, index, age, time, scroll, reduced, busy) {
    var t = reduced ? 0 : time, dist = reduced ? 0 : scroll;
    var current = files[id][index], old = files[id][1 - index];
    if (!tiles[current]) current = old;
    ctx.save();
    ctx.fillStyle = "#131726"; ctx.fillRect(0, 0, 240, 360);
    ctx.imageSmoothingEnabled = true;
    if (!reduced && age < 2 && time > 2 && current !== old && tiles[old]) {
      tile(ctx, old, dist);
      ctx.globalAlpha = Math.max(0, age / 2);
    }
    tile(ctx, current, dist);
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#0a10234d"; ctx.fillRect(0, 0, 240, 360);
    ctx.globalAlpha = busy ? 0.09 : 0.19;
    // Broad asymmetric banks hug the walls. Their interiors have no hard hitbox-like edges.
    for (var i = 0; i < 5; i++) {
      var x = i % 2 ? 142 : -97;
      ctx.drawImage(fog(id), x + Math.sin(t * 0.17 + i) * 17,
        ((i * 83 + t * 8) % 444) - 64, 178, id === "patchouli" ? 70 : 48);
    }
    ctx.strokeStyle = ctx.fillStyle = hues[id];
    ctx.globalAlpha = busy ? 0.24 : 0.43;
    ctx.lineWidth = 0.7;
    for (var n = 0; n < 16; n++) {
      var edge = n % 2 ? 1 : -1;
      var px = 120 + edge * (106 - (n * 17) % 27) + Math.sin(t * 0.45 + n) * 5;
      var py = ((n * 73 + t * (8 + n % 5)) % 403) - 22;
      ctx.beginPath();
      if (id === "alice") {
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + edge * 5, py + 4, px + edge, py + 10);
        ctx.stroke();
      } else if (id === "marisa") {
        ctx.moveTo(px, py); ctx.lineTo(px + 6, py - 10); ctx.stroke();
        ctx.fillRect(px, py, 1, 2);
      } else {
        ctx.moveTo(px, py); ctx.lineTo(px + 4, py - 2);
        ctx.lineTo(px + 3, py + 4); ctx.lineTo(px, py + 5); ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.restore();
  }
  scope.DanmakuScenery = { load: load, draw: draw };
})(window);
