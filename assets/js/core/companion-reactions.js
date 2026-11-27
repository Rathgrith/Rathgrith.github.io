/* Original 64px reaction vignettes. Integer raster art, 24 authored steps/sec,
 * a finite entrance/hold/exit, and no animation clock of their own. */
(function (root) {
  "use strict";
  var SIZE = 64, DURATION = 2.15;
  var TYPES = ["sparkle", "surprise", "sweat", "anger", "sigh", "music", "question", "blush", "idea"];
  var bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  var inks = {
    alice: ["#f8fbeb", "#d5eff5", "#82bbd2", "#52728f"],
    marisa: ["#fff9d8", "#ffe5a1", "#eabf6b", "#ae7155"],
    patchouli: ["#fff0fa", "#e8d5f2", "#bda3dc", "#78668d"],
  };
  var rim = "#182033", shade = "#384055";
  function clamp(n) { return Math.max(0, Math.min(1, n)); }
  function ease(n) { n = clamp(n); return 1 - Math.pow(1 - n, 3); }
  function pop(t) {
    if (t < 0.15) return ease(t / 0.15) * 1.14;
    if (t < 0.3) return 1.14 - (t - 0.15) / 0.15 * 0.14;
    return 1;
  }
  function draw(canvas, kind, seconds, character) {
    var ctx = canvas.getContext("2d"), colors = inks[character] || inks.alice;
    var t = Math.floor(seconds * 24) / 24;
    ctx.clearRect(0, 0, SIZE, SIZE);
    ctx.imageSmoothingEnabled = false;
    if (t < 0 || t >= DURATION || !kind) return;
    function box(x, y, w, h, color) {
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x), Math.round(y), Math.max(1, Math.round(w)), Math.max(1, Math.round(h)));
    }
    function pixelLine(x1, y1, x2, y2, color, thickness) {
      var count = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1), 1);
      for (var i = 0; i <= count; i++) box(x1 + (x2 - x1) * i / count, y1 + (y2 - y1) * i / count, thickness || 1, thickness || 1, color);
    }
    function diamond(x, y, radius, fill, border) {
      radius = Math.max(1, Math.round(radius));
      for (var row = -radius; row <= radius; row++) {
        var half = radius - Math.abs(row);
        box(x - half, y + row, half * 2 + 1, 1, border || rim);
        if (half > 0) box(x - half + 1, y + row, half * 2 - 1, 1, fill);
      }
    }
    function star(x, y, r) {
      r = Math.max(1, Math.round(r));
      for (var y0 = -r; y0 <= r; y0++) {
        var width = Math.max(1, Math.round(r * 0.43 * Math.pow(1 - Math.abs(y0) / r, 2)));
        box(x - width - 1, y + y0, width * 2 + 3, 1, rim);
        box(x - width, y + y0, width * 2 + 1, 1, y0 < 0 ? colors[1] : colors[2]);
      }
      for (var x0 = -r; x0 <= r; x0++) {
        var height = Math.max(1, Math.round(r * 0.36 * Math.pow(1 - Math.abs(x0) / r, 2)));
        box(x + x0, y - height - 1, 1, height * 2 + 3, rim);
        box(x + x0, y - height, 1, height * 2 + 1, colors[1]);
      }
      box(x - 1, y - Math.max(1, r - 2), 2, r * 2 - 3, colors[0]);
      box(x - Math.max(1, r - 2), y - 1, r * 2 - 3, 2, colors[0]);
    }
    function rays(age, strong) {
      var spread = 12 + ease(age / 0.45) * 13;
      var length = Math.max(0, 7 * (1 - age / 0.75));
      if (length < 1) return;
      [-2.55, -1.7, -0.75, 0.25].forEach(function (a) {
        var x = 32 + Math.cos(a) * spread, y = 29 + Math.sin(a) * spread;
        pixelLine(x, y, x + Math.cos(a) * length, y + Math.sin(a) * length, strong || colors[2], 2);
        box(x, y, 1, 1, colors[0]);
      });
    }
    function drop(x, y, scale) {
      var rows = ["....OO....", "...OHH O...", "...OHHL O..", "..OHHHLLO.", "..OHHHLLLO", ".OHHHLLLL O", ".OHWLLLLL O", "OHWWLLLLDO", "OHWLLLLDDO", "OHLLLLDDDO", ".OLLLDDDO.", "..ODDDDO..", "...OOOO..."];
      var palette = { O: rim, H: "#c5f2ff", W: "#ffffff", L: "#76c5e3", D: "#4788b9" };
      rows.forEach(function (row, yy) {
        row.replace(/ /g, "").split("").forEach(function (p, xx) {
          if (palette[p]) box(x + xx * scale, y + yy * scale, scale, scale, palette[p]);
        });
      });
    }
    function puff(x, y, r, bright) {
      var rows = [0.45, 0.8, 1, 1, 0.9, 0.65, 0.3];
      rows.forEach(function (width, row) {
        var span = Math.round(width * r);
        box(x - span, y + row - 3, span * 2 + 1, 1, rim);
        if (span > 1) box(x - span + 1, y + row - 3, span * 2 - 1, 1, row < 3 ? bright : "#8facc5");
      });
    }
    function sprite(rows, palette, x, y, scale) {
      rows.forEach(function (row, yy) {
        row.split("").forEach(function (p, xx) {
          if (palette[p]) box(x + xx * scale, y + yy * scale, scale, scale, palette[p]);
        });
      });
    }
    function note(x, y, scale) {
      sprite([
        "....OOO..", "....OHL O.", "....OHHLO", "....OHDDO", "....OHO O.",
        "....OHO..", "..OOOHO..", ".OHHHHO..", "OHWLLDO..", "OHLDDO...", ".OOOO....",
      ].map(function (row) { return row.replace(/ /g, ""); }),
      {O:rim,H:colors[1],W:colors[0],L:colors[2],D:colors[3]}, x,y,scale);
    }
    var grow = pop(t), drift = Math.round(Math.max(0, t - 0.9) * 3);
    if (kind === "sparkle") {
      var leave = 1 - ease((t - 1.5) / 0.65);
      star(30, 29 - drift, (9 + Math.sin(t * 8) * 1.2) * grow * leave);
      [[-18, 12, 0.17], [17, -12, 0.32], [17, 16, 0.5]].forEach(function (p) {
        var age = t - p[2];
        if (age < 0 || age > 1.5) return;
        var size = 4 * Math.min(pop(age), 1) * (1 - ease((age - 0.85) / 0.65));
        star(30 + p[0], 29 + p[1] - age * 4, size);
      });
      rays(t);
    } else if (kind === "surprise") {
      var height = Math.round(25 * grow), y = 30 - height + 4 - drift;
      // Stepped outline and warm shadow keep the pale mark crisp on highlights.
      box(27, y, 10, height, rim); box(28, y + 1, 8, height - 2, colors[3]);
      box(28, y + 1, 6, height - 3, colors[1]); box(29, y + 2, 2, height - 5, colors[0]);
      box(28, y + height, 8, 2, rim);
      diamond(32, 43 - drift, 5 * grow, colors[1]); box(30, 41 - drift, 3, 2, colors[0]);
      if (t > 0.12) { box(44, 10 - drift, 4, 14, rim); box(45, 11 - drift, 2, 10, colors[0]); box(45, 28 - drift, 2, 3, colors[1]); }
      rays(t);
    } else if (kind === "sweat") {
      var fall = ease((t - 0.5) / 1.0) * 14;
      if (t < 0.2) diamond(32, 16, 4 * ease(t / 0.2), "#c5f2ff");
      else if (t < 1.7) {
        drop(22, 10 + fall, 2);
        if (t > 0.45) { box(27, 9 + fall, 2, 3, "#7eacd1"); box(39, 7 + fall, 1, 2, "#c5f2ff"); }
        if (t > 0.8) drop(46, 7 + fall * 0.4, 1);
      } else {
        var spread = (t - 1.7) * 22;
        [-1, 1].forEach(function (dir) { diamond(32 + dir * spread, 48 - spread * 0.4, 2, "#96d4eb"); });
        box(29, 50, 6, 2, "#6cafd1");
      }
    } else if (kind === "anger") {
      var beat = 1 + Math.max(0, Math.sin((t - 0.2) * 11)) * 0.13;
      var r = Math.round(9 * grow * beat);
      [[-1,-1],[1,-1],[-1,1],[1,1]].forEach(function (dir) {
        var x=29+dir[0]*6, y=27+dir[1]*6;
        pixelLine(x,y,x+dir[0]*r,y,rim,7);
        pixelLine(x,y,x,y+dir[1]*r,rim,7);
        pixelLine(x,y,x+dir[0]*r,y,"#492f48",5);
        pixelLine(x,y,x,y+dir[1]*r,"#492f48",5);
        pixelLine(x,y,x+dir[0]*(r-1),y,"#ed8f9b",3);
        pixelLine(x,y,x,y+dir[1]*(r-1),"#ed8f9b",3);
        box(x,y,2,2,"#ffd2c7");
      });
      rays(t, "#d67a91");
      if(t>1.5) [-1,1].forEach(function(dir){diamond(32+dir*(20+(t-1.5)*7),31,2,"#ed8f9b");});
    } else if (kind === "sigh") {
      var flow = ease(t / 1.5);
      puff(19 + flow * 12, 35 - flow * 5, 5 * grow, "#d5e9f3");
      if (t > 0.14) puff(30 + flow * 13, 29 - flow * 6, 9 * Math.min(1,pop(t-0.14)), "#e8f0f5");
      if (t > 0.3) puff(35 + flow * 11, 34 - flow * 5, 7, "#c1d8e8");
      box(10 + flow * 6, 38, 3, 2, shade);
    } else if (kind === "music") {
      // Staggered notes rise along separate arcs, without a star-shaped accent.
      var lift = ease(t / 1.65) * 12;
      note(18 + Math.sin(t * 5) * 2, 22 - lift + (1 - grow) * 15, 2);
      if (t > 0.24) note(43 + Math.sin(t * 5 + 1) * 3, 43 - lift * 1.5, 1);
      box(12, 42 - lift, 2, 2, colors[2]);
      if (t > 0.5) box(49, 17 - lift * 0.4, 2, 2, colors[0]);
    } else if (kind === "question") {
      var sway = Math.sin(t * 4) * 2, bob = (1 - grow) * 14 - drift;
      sprite([
        "...OOOOOO....", "..OHHHHHDO...", ".OHWWLLLDDO..", ".OHLOOOOLDO..",
        ".OOO....OLDO.", "........OLDO.", ".......OLDO..", "......OLDO...",
        ".....OLDO....", ".....ODO.....", ".....OOO.....", ".............",
        ".....OOO.....", "....OHHDO....", "....OHLDO....", ".....OOO.....",
      ], {O:rim,H:colors[1],W:colors[0],L:colors[2],D:colors[3]}, 19+sway,12+bob,2);
      if (t > 0.25) { box(49, 22-drift, 2, 2, colors[2]); box(12, 39-drift, 2, 2, colors[0]); }
    } else if (kind === "blush") {
      // Three warm hatching strokes build in order, then gently contract.
      var width = 1 + Math.sin(t * 5) * 0.07;
      for (var b = 0; b < 3; b++) {
        var age = t - b * 0.07;
        if (age < 0) continue;
        var length = 13 * Math.min(1, pop(age));
        var bx = 19 + b * 10 * width, by = 24 - drift + (b === 1 ? -3 : 0);
        pixelLine(bx+5,by,bx,by+length,rim,5);
        pixelLine(bx+5,by+1,bx,by+length,"#b85f7d",3);
        pixelLine(bx+5,by+1,bx,by+length-2,"#f6a9b8",2);
        box(bx+5,by+2,1,3,"#ffe1d7");
      }
      if (t > 0.3) { box(12, 39-drift, 2, 2, "#d87896"); box(51, 18-drift, 2, 2, "#f6a9b8"); }
    } else if (kind === "idea") {
      var rise = (1 - grow) * 14 - drift;
      sprite([
        "....OOOOO....", "..OOHHHHHOO..", ".OHHWWLLLDDO.", ".OHWWLLLLDDO.",
        "OHWWLLLLLDDDO", "OHWLLLLLLDDDO", "OHLLLLLLLDDDO", ".OLLLWLLLDDO.",
        ".OLLLWLLLDDO.", "..OLLWLLDDO..", "...OLWLDDO...", "...OHHDDDO...",
        "....OOOOO....", "....OHHDO....", "....OOOOO....", ".....OOO.....",
      ], {O:rim,H:"#fff1b9",W:"#fffdf0",L:"#e6c66b",D:"#ae8154"},19,13+rise,2);
      rays(t, "#e6c66b");
      if (t > 0.5 && t < 1.5) {
        var length = Math.round(2 + Math.sin(t * 8) * 1.5);
        pixelLine(11,24,11-length,22,"#fff1b9",2);
        pixelLine(51,24,51+length,22,"#e6c66b",2);
      }
    }
    // Exit through individual opaque pixels, not a blurred CSS opacity fade.
    // The same ordered threshold on every frame makes dissolve monotonic.
    var dissolve = clamp((t - 1.6) / 0.55);
    if (dissolve > 0) {
      for(var yy=0;yy<SIZE;yy++) for(var xx=0;xx<SIZE;xx++)
        if(bayer[(yy%4)*4+xx%4] / 16 < dissolve) ctx.clearRect(xx,yy,1,1);
    }
  }
  // Eye-white meshes, ordered from the viewer's left to right. Patchouli's
  // source rig exports its original PSD layer numbers instead of descriptive IDs.
  var faceMeshes = {
    alice: ["EyeWhiteR", "EyeWhiteL", "MouthOral"],
    marisa: ["EyeWhite", "EyeWhite2", "MouthOral"],
    patchouli: ["D_PSD1_74", "D_PSD1_83", "D_PSD1_58"],
  };

  // Offsets and size are measured in eye separations along the moving head.
  var floating = { lateral: 1.38, vertical: -0.50, size: 1.00 };
  var attachments = {
    blush: { lateral: 0.63, vertical: 0.34, size: 0.52 },
    sweat: { lateral: 0.97, vertical: -0.15, size: 0.82 },
    anger: { lateral: 0.88, vertical: -0.62, size: 0.76 },
    sigh:  { lateral: 0.87, vertical: 0.65, size: 0.88 },
  };

  function create(stage, character, model, renderer) {
    var internal = model && model.internalModel;
    var landmarks = faceMeshes[character];
    if (!internal || !landmarks) return null;
    var actorArea = stage.parentElement.querySelector(".vn-actor-area");
    var leftEye = internal.getDrawableIndex(landmarks[0]);
    var rightEye = internal.getDrawableIndex(landmarks[1]);
    if (leftEye < 0 || rightEye < 0) return null;
    var canvas = stage.ownerDocument.createElement("canvas");
    canvas.width = canvas.height = SIZE;
    canvas.className = "vn-reaction";
    canvas.setAttribute("aria-hidden", "true");
    canvas.hidden = true;
    stage.appendChild(canvas);
    var left = {}, right = {}, bounds = {};
    var kind = "", lastFrame = -1, queued = false;

    function projectEye(index, point) {
      internal.getDrawableBounds(index, bounds);
      point.x = bounds.x + bounds.width / 2;
      point.y = bounds.y + bounds.height / 2;
      internal.localTransform.apply(point, point);
      model.toGlobal(point, point);
      // CSS can resize the canvas one frame before PIXI resizes its screen.
      // Project into the same visible canvas even through that transition.
      if (renderer && renderer.screen.width && renderer.screen.height) {
        point.x *= stage.clientWidth / renderer.screen.width;
        point.y *= stage.clientHeight / renderer.screen.height;
      }
    }

    function position() {
      queued = false;
      if (canvas.hidden || !stage.clientWidth || !stage.clientHeight) return;
      projectEye(leftEye, left);
      projectEye(rightEye, right);
      var dx = right.x - left.x, dy = right.y - left.y;
      var gap = Math.hypot(dx, dy);
      if (!gap) return;
      var side = character === "alice" ? -1 : 1;
      // Eye separation supplies both stage units and head roll. Skin accents
      // sit on the cheek/temple; breath exits beside the mouth. Floating
      // symbols clear the eyes without climbing above a witch's hat.
      var anchor = attachments[kind] || floating;
      var rect = stage.getBoundingClientRect();
      var scaleX = rect.width / stage.offsetWidth || 1, scaleY = rect.height / stage.offsetHeight || 1;
      var originX = rect.left + stage.clientLeft * scaleX, originY = rect.top + stage.clientTop * scaleY;
      var xMin = 0, yMin = 0, xMax = stage.clientWidth, yMax = stage.clientHeight;
      // The canvas stays full size behind the commands. Project the unobscured
      // actor area into its local CSS coordinates before placing the effect.
      if (actorArea && actorArea.offsetWidth && actorArea.offsetHeight) {
        var safe = actorArea.getBoundingClientRect();
        xMin = Math.max(0, (safe.left - originX) / scaleX);
        yMin = Math.max(0, (safe.top - originY) / scaleY);
        xMax = Math.min(xMax, (safe.right - originX) / scaleX);
        yMax = Math.min(yMax, (safe.bottom - originY) / scaleY);
      }
      var size = Math.min(xMax - xMin - 4, yMax - yMin - 4,
        Math.max(kind === "blush" ? 18 : 28, Math.min(144, Math.round(gap * anchor.size))));
      if (size <= 0) return;
      var midX = (left.x + right.x) / 2 - dy * anchor.vertical;
      var midY = (left.y + right.y) / 2 + dx * anchor.vertical;
      var half = size / 2, margin = half + 2;
      var x = midX + side * dx * anchor.lateral;
      // On the narrowest crop use the other side if it has more room.
      if ((x < xMin + margin || x > xMax - margin) &&
          ((xMin + xMax) / 2 - midX) * side < 0) side = -side;
      x = Math.max(xMin + margin, Math.min(xMax - margin, midX + side * dx * anchor.lateral));
      var y = Math.max(yMin + margin, Math.min(yMax - margin, midY + side * dy * anchor.lateral));
      var dpr = stage.ownerDocument.defaultView.devicePixelRatio || 1;
      function snap(value, origin, scale) {
        return (Math.round((origin + value * scale) * dpr) / dpr - origin) / scale;
      }
      canvas.style.width = canvas.style.height = size + "px";
      canvas.style.left = snap(x - half, originX, scaleX) + "px";
      canvas.style.top = snap(y - half, originY, scaleY) + "px";
    }

    // The acting hook updates parameters immediately before Cubism deforms
    // its drawables. Read the new mesh after that synchronous render finishes.
    function schedulePosition() {
      if (!queued && !canvas.hidden) {
        queued = true;
        queueMicrotask(position);
      }
    }
    var observer = new ResizeObserver(schedulePosition);
    observer.observe(stage);
    if (actorArea) observer.observe(actorArea);
    return {
      reposition: schedulePosition,
      draw: function (nextKind, age, disabled) {
        canvas.hidden = disabled || !nextKind || age < 0 || age >= DURATION;
        canvas.dataset.reaction = nextKind;
        if (canvas.hidden) { lastFrame = -1; return; }
        schedulePosition();
        var frame = Math.floor(age * 24);
        if (frame !== lastFrame || kind !== nextKind) {
          draw(canvas, nextKind, age, character);
          lastFrame = frame;
        }
        kind = nextKind;
      },
      destroy: function () {
        observer.disconnect();
        canvas.hidden = true;
        canvas.remove();
      },
    };
  }
  var api = {create:create, draw:draw, duration:DURATION, types:TYPES, faceMeshes:faceMeshes};
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.CompanionReactions = api;
})(typeof window === "undefined" ? globalThis : window);
