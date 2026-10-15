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
  function draw(ctx, id, x, y, time, pose, reduced, size) {
    var sheet = sheets[id];
    if (!sheet) return false;
    var frame = frameIndex(time, pose, reduced);
    size = size || 32;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      sheet,
      (frame % 6) * 48,
      Math.floor(frame / 6) * 48,
      48,
      48,
      Math.round(x - size / 2),
      Math.round(y - size * 0.58),
      size,
      size
    );
    ctx.restore();
    return true;
  }
  scope.DanmakuPlayerSprites = {
    load: load,
    draw: draw,
    frameIndex: frameIndex,
  };
})(window);
