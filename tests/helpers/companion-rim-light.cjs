// Matte two renders of the same frozen Cubism pose against transparency. Only
// the reflected edge radiance changes; the room's key, fill and aperture stay fixed.
const assert = require("node:assert/strict");

module.exports = async function checkRim(page, character) {
  const result = await page.evaluate(() => {
    const app = cameraTestApp, model = app.stage.children[0], u = app.stage.filters[0].uniforms;
    const canvas = document.createElement("canvas");
    const w = canvas.width = app.view.width, h = canvas.height = app.view.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    const pixels = () => {
      app.render();
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(app.view, 0, 0);
      return ctx.getImageData(0, 0, w, h).data;
    };
    const rim = u.uRim, radius = u.uLensRadius, strength = u.uStrength;
    const auto = model.autoUpdate, delta = model.deltaTime;
    app.stop();
    model.autoUpdate = false;
    model.deltaTime = 0;
    try {
      u.uStrength = 1;
      u.uLensRadius = 0;
      u.uRim = [0, 0, 0];
      const flat = pixels();
      u.uRim = rim;
      const lit = pixels(), view = app.view.getBoundingClientRect();
      const face = cameraTestFace().map(f => ({
        left: (f.left - view.left) * w / view.width, right: (f.right - view.left) * w / view.width,
        top: (f.top - view.top) * h / view.height, bottom: (f.bottom - view.top) * h / view.height,
      }));
      const map = u.uViewToScene, lightX = (u.uKeyPosition[0] - map[2]) * w / map[0];
      const lightY = (u.uKeyPosition[1] - map[3]) * h / map[1];
      let covered = 0, changed = 0, translucent = 0, alphaDifference = 0, faceDifference = 0;
      let facing = 0, facingLit = 0, away = 0, awayLit = 0;
      const gains = [0, 0, 0];
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        const i = 4 * (y * w + x), a = flat[i + 3];
        alphaDifference = Math.max(alphaDifference, Math.abs(a - lit[i + 3]));
        if (a === 0) continue;
        covered++;
        const change = Math.max(lit[i] - flat[i], lit[i + 1] - flat[i + 1], lit[i + 2] - flat[i + 2]);
        if (change > 3) {
          changed++;
          if (a > 20 && a < 235) translucent++;
          for (let c = 0; c < 3; c++) gains[c] += (lit[i + c] - flat[i + c]) * a;
        }
        if (face.some(f => x > f.left && x < f.right && y > f.top && y < f.bottom)) {
          faceDifference = Math.max(faceDifference, change);
        }
        // The alpha gradient estimates the outward silhouette normal in the
        // captured framebuffer, independently of the shader's displaced samples.
        const nx = flat[i - 4 + 3] - flat[i + 4 + 3];
        const ny = flat[i - 4 * w + 3] - flat[i + 4 * w + 3];
        const norm = Math.hypot(nx, ny);
        if (a < 40 || norm < 64) continue;
        const dx = lightX - x, dy = lightY - y;
        const cosine = (dx * nx + dy * ny) / (Math.max(1, Math.hypot(dx, dy)) * norm);
        if (cosine > .7) { facing++; if (change > 3) facingLit++; }
        if (cosine < -.7) { away++; if (change > 3) awayLit++; }
      }
      return { covered, changed, translucent, alphaDifference, faceDifference, gains,
        facingRate: facingLit / Math.max(1, facing), awayRate: awayLit / Math.max(1, away) };
    } finally {
      u.uRim = rim;
      u.uLensRadius = radius;
      u.uStrength = strength;
      model.deltaTime = delta;
      model.autoUpdate = auto;
      app.start();
    }
  });
  const info = character + " " + JSON.stringify(result);
  assert.equal(result.alphaDifference, 0, "The rim preserves the entire coverage mask: " + info);
  assert.equal(result.faceDifference, 0, "The rim leaves eyes and mouth intact: " + info);
  assert(result.translucent > 0 && result.changed > result.translucent && result.changed < .13 * result.covered,
    "Reflections affect opaque and fractional-coverage edge pixels: " + info);
  assert(result.facingRate > .3 && result.facingRate > 2 * result.awayRate, "Light has a preferred side: " + info);
  const [red, green, blue] = result.gains;
  assert(character === "marisa" ? red > blue : character === "alice" ? blue > red : blue > green,
    "The reflected color matches the painted emitter: " + info);
  return result;
};
