/* Registered 48 px animation cells shared by both battle renderers. */
(function (scope) {
  "use strict";
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
          image.src = "/assets/images/classic/danmaku/bosses/" + id + ".png";
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
  function satellite(ctx, id, x, y, index, time, scale, color) {
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y));
    ctx.scale(scale, scale);
    if (id === "alice") {
      // A small Shanghai silhouette: bow, hair, blue skirt and flapping sleeves.
      var flap = Math.floor(time * 7 + index) % 2;
      ctx.fillStyle = "#292337";
      ctx.fillRect(-4, -6, 8, 13);
      ctx.fillStyle = "#e6c073";
      ctx.fillRect(-3, -5, 6, 5);
      ctx.fillRect(-4, -3, 1, 6);
      ctx.fillRect(3, -3, 1, 6);
      ctx.fillStyle = "#cf626d";
      ctx.fillRect(-4, -7, 3, 2);
      ctx.fillRect(1, -7, 3, 2);
      ctx.fillStyle = "#f5dcb8";
      ctx.fillRect(-2, -2, 4, 3);
      ctx.fillStyle = "#73a6cf";
      ctx.fillRect(-2, 1, 4, 3);
      ctx.fillRect(-3, 4, 6, 3);
      ctx.fillStyle = "#ecedf0";
      ctx.fillRect(-5, flap, 3, 2);
      ctx.fillRect(2, flap, 3, 2);
      ctx.fillRect(-3, 6, 6, 1);
    } else if (id === "marisa") {
      // Octagonal magical catalyst, with a rotating internal aperture.
      ctx.fillStyle = "#302940";
      ctx.fillRect(-5, -3, 10, 6);
      ctx.fillRect(-3, -5, 6, 10);
      ctx.strokeStyle = color || "#efcf83";
      ctx.lineWidth = 1;
      ctx.strokeRect(-3.5, -3.5, 7, 7);
      ctx.rotate(time * 0.9 + index);
      ctx.fillStyle = "#fff0bd";
      ctx.fillRect(-1, -3, 2, 6);
      ctx.fillRect(-3, -1, 6, 2);
    } else {
      ctx.rotate(Math.sin(time + index) * 0.18);
      ctx.fillStyle = "#24233d";
      ctx.fillRect(-4, -6, 8, 12);
      ctx.fillStyle = color || "#c7a1e7";
      ctx.fillRect(-3, -4, 6, 8);
      ctx.fillRect(-1, -6, 2, 12);
      ctx.fillStyle = "#f4eaf8";
      ctx.fillRect(-2, -3, 1, 5);
      ctx.fillRect(-1, -4, 2, 1);
    }
    ctx.restore();
  }
  scope.DanmakuBossSprites = {
    load: load,
    draw: draw,
    deploy: deploy,
    satellite: satellite,
  };
})(window);
