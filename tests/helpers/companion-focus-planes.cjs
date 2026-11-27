// Pixel comparisons on the same Cubism pose. A nearby hand can reach in front
// of the face, so measure the hand's interior outside the protected eye region.
const assert = require("node:assert/strict");

module.exports = async function checkFocusPlanes(page, character) {
  const metrics = await page.evaluate(() => {
    const app = cameraTestApp, model = app.stage.children[0], uniforms = app.stage.filters[0].uniforms;
    const canvas = document.createElement("canvas");
    const w = canvas.width = app.view.width, h = canvas.height = app.view.height;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    function capture(plane, aperture) {
      uniforms.uFocusPlane = plane;
      uniforms.uLensRadius = aperture;
      app.render();
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(app.view, 0, 0);
      return ctx.getImageData(0, 0, w, h).data;
    }
    const previousPlane = uniforms.uFocusPlane, previousAperture = uniforms.uLensRadius;
    const auto = model.autoUpdate, delta = model.deltaTime;
    app.stop();
    model.autoUpdate = false;
    model.deltaTime = 0;
    try {
      const aperture = Math.max(.8, Math.min(1.55, app.screen.height / 325));
      const sharp = capture(0, 0);
      const images = [capture(0, aperture), capture(-1, aperture), capture(1, aperture)];
      const face = uniforms.uFocusEllipse, hands = [uniforms.uHandA, uniforms.uHandB];
      const eye = [0, 0, 0], hand = [0, 0, 0], lowerSleeve = [0, 0, 0];
      let alphaDifference = 0;
      const ellipseDistance = (x, y, e) => Math.hypot((x - e[0]) / e[2], (y - e[1]) / e[3]);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4, alpha = sharp[i + 3];
        for (const image of images) alphaDifference = Math.max(alphaDifference, Math.abs(image[i + 3] - alpha));
        if (alpha < 250) continue;
        const sx = (x + .5) * app.screen.width / w, sy = (y + .5) * app.screen.height / h;
        const distance = ellipseDistance(sx, sy, face);
        let area;
        if (distance < .80) area = eye;
        else if (distance > 1.20 && hands.some(e => ellipseDistance(sx, sy, e) < .60)) area = hand;
        else if ((sy - face[1]) / face[3] > 2.85) area = lowerSleeve;
        if (!area) continue;
        for (let plane = 0; plane < images.length; plane++) {
          const image = images[plane];
          for (let channel = 0; channel < 3; channel++) area[plane] += Math.abs(sharp[i + channel] - image[i + channel]);
        }
      }
      return { eye, hand, lowerSleeve, alphaDifference };
    } finally {
      uniforms.uFocusPlane = previousPlane;
      uniforms.uLensRadius = previousAperture;
      model.autoUpdate = auto;
      model.deltaTime = delta;
      app.start();
    }
  });
  const info = character + " " + JSON.stringify(metrics);
  const { eye, hand, lowerSleeve } = metrics;
  assert.equal(metrics.alphaDifference, 0, "All focus planes preserve the coverage mask: " + info);
  assert(eye[0] === 0 && eye[1] > 100 && eye[2] > eye[1], "Subject focus resolves the face: " + info);
  if (hand[0]) {
    assert(hand[1] < hand[0] && hand[2] > hand[0], "A visible hand resolves at near focus: " + info);
  } else {
    assert(lowerSleeve[0] > 0 && lowerSleeve[1] < lowerSleeve[0] && lowerSleeve[2] > lowerSleeve[0],
      "A close crop without hands still resolves the foreground clothes at near focus: " + info);
  }
  if (lowerSleeve[0]) assert(lowerSleeve[2] > lowerSleeve[1], "Foreground clothes defocus at far focus: " + info);
  return metrics;
};
