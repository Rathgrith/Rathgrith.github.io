// Runs in the browser on one live, fully rendered rig. Freeze the pose for a
// pixel-for-pixel comparison with only the lens radius changed.
module.exports = function measureLens() {
  const app = cameraTestApp, model = app.stage.children[0], filter = app.stage.filters[0];
  const radius = filter.uniforms.uLensRadius;
  const previousUpdate = model.autoUpdate, previousDelta = model.deltaTime;
  const surface = document.createElement("canvas");
  surface.width = app.view.width;
  surface.height = app.view.height;
  const ctx = surface.getContext("2d", { willReadFrequently: true });
  const pixels = () => {
    app.render();
    ctx.clearRect(0, 0, surface.width, surface.height);
    ctx.drawImage(app.view, 0, 0);
    return ctx.getImageData(0, 0, surface.width, surface.height).data;
  };
  const distance = (x, y) => {
    const [cx, cy, rx, ry] = filter.uniforms.uFocusEllipse;
    return Math.hypot((x - cx) / rx, (y - cy) / ry);
  };
  let instrumented;
  app.stop();
  model.autoUpdate = false;
  model.deltaTime = 0;
  try {
    const softened = pixels();
    const view = app.view.getBoundingClientRect();
    const faceDistance = radius > 0 ? Math.max(...window.cameraTestFace().flatMap(f =>
      [f.left, f.right].flatMap(x => [f.top, f.bottom].map(y =>
        distance((x - view.left) * app.screen.width / view.width, (y - view.top) * app.screen.height / view.height))))) : null;
    filter.uniforms.uLensRadius = 0;
    const clear = pixels();
    let changedBody = 0, opaqueBody = 0, largestFocusChange = 0, largestAlphaChange = 0;
    for (let y = 0; y < surface.height; y++) for (let x = 0; x < surface.width; x++) {
      const i = (y * surface.width + x) * 4;
      largestAlphaChange = Math.max(largestAlphaChange, Math.abs(clear[i + 3] - softened[i + 3]));
      if (clear[i + 3] < 250) continue;
      const d = distance((x + .5) * app.screen.width / surface.width, (y + .5) * app.screen.height / surface.height);
      const diff = Math.max(...[0, 1, 2].map(channel => Math.abs(clear[i + channel] - softened[i + channel])));
      if (d < .95) largestFocusChange = Math.max(largestFocusChange, diff);
      if (d > 1.9) { opaqueBody++; if (diff > 1) changedBody++; }
    }

    // Count the shader's own texture lookups, including early returns. This
    // catches an invisible full-price blur even when its strength is zero.
    const source = filter.program.fragmentSrc.replace(/^#define SHADER_NAME .*$/gm, "").replace(/\btexture2D\s*\(/g, "countLookup(")
      .replace(/precision\s+\w+\s+float\s*;/, `$&
        float lookupCount;
        vec4 countLookup(sampler2D image, vec2 uv) { lookupCount += 1.0; return texture2D(image, uv); }
      `).replace(/void\s+main\s*\(\s*(?:void)?\s*\)/, "void lensPass()") +
      "\nvoid main(void) { lookupCount = 0.0; lensPass(); gl_FragColor = vec4(vec3(lookupCount / 255.0), 1.0); }";
    // Isolate the aperture taps from the independent silhouette lighting.
    instrumented = new PIXI.Filter(undefined, source, { ...filter.uniforms, uStrength: 0 });
    instrumented.resolution = filter.resolution;
    app.stage.filters = [instrumented];
    function sampleRange() {
      const taps = pixels();
      let minSamples = 255, maxSamples = 0;
      for (let i = 0; i < taps.length; i += 4) {
        if (taps[i + 3] < 250) continue;
        minSamples = Math.min(minSamples, taps[i]);
        maxSamples = Math.max(maxSamples, taps[i]);
      }
      return [minSamples, maxSamples];
    }
    const disabledSamples = sampleRange();
    instrumented.uniforms.uStrength = .75;
    const lightingSamples = sampleRange();
    instrumented.uniforms.uStrength = 0;
    instrumented.uniforms.uLensRadius = radius;
    const activeSamples = sampleRange();
    return { radius, faceDistance, changedBody, opaqueBody, largestFocusChange, largestAlphaChange, disabledSamples, activeSamples, lightingSamples };
  } finally {
    app.stage.filters = [filter];
    filter.uniforms.uLensRadius = radius;
    if (instrumented) instrumented.destroy();
    model.autoUpdate = previousUpdate;
    model.deltaTime = previousDelta;
    app.start();
  }
};
