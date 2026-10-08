/* Scene-colored key/fill light on the rendered model, preserving its alpha. */
(function () {
  "use strict";
  var scenes = {
    alice: {
      ambient: [0.73, 0.81, 0.96],
      key: [0.16, 0.24, 0.34],
      fill: [0.19, 0.11, 0.04],
      position: [-0.15, 0.12],
    },
    marisa: {
      ambient: [0.96, 0.77, 0.59],
      key: [0.34, 0.24, 0.12],
      fill: [0.04, 0.09, 0.17],
      position: [-0.12, 0.28],
    },
    patchouli: {
      ambient: [0.78, 0.76, 0.9],
      key: [0.18, 0.17, 0.2],
      fill: [0.18, 0.13, 0.05],
      position: [-0.1, 0.08],
    },
  };
  var fragment = [
    "precision highp float;",
    "varying vec2 vTextureCoord;",
    "uniform sampler2D uSampler;",
    "uniform vec4 inputSize;",
    "uniform vec4 outputFrame;",
    "uniform vec3 uAmbient, uKey, uFill;",
    "uniform vec2 uKeyPosition;",
    "uniform float uStrength;",
    "void main(void) {",
    "  vec4 source = texture2D(uSampler, vTextureCoord);",
    "  vec2 uv = vTextureCoord * inputSize.xy / max(outputFrame.zw, vec2(1.0));",
    "  vec2 keyDistance = (uv - uKeyPosition) * vec2(1.0, 0.65);",
    "  vec2 fillDistance = (uv - vec2(1.1, 0.45)) * vec2(1.2, 0.8);",
    "  float key = exp(-dot(keyDistance, keyDistance) * 1.4);",
    "  float fill = exp(-dot(fillDistance, fillDistance) * 2.0);",
    "  vec3 illumination = uAmbient + uKey * key + uFill * fill;",
    "  illumination *= 1.0 - 0.12 * smoothstep(0.45, 1.0, uv.y);",
    // Pixi render textures use premultiplied alpha; recolor the artwork only.
    "  vec3 base = source.rgb / max(source.a, 0.0001);",
    "  vec3 lit = min(base * illumination, vec3(1.0));",
    "  gl_FragColor = vec4(mix(base, lit, uStrength) * source.a, source.a);",
    "}",
  ].join("\n");

  window.CompanionLighting = {
    create: function (app, widget) {
      var filter = new window.PIXI.Filter(null, fragment, {
        uAmbient: scenes.alice.ambient.slice(),
        uKey: scenes.alice.key.slice(),
        uFill: scenes.alice.fill.slice(),
        uKeyPosition: scenes.alice.position.slice(),
        uStrength: 0.75,
      });
      filter.resolution = app.renderer.resolution;
      filter.padding = 0;
      // Bound the extra render pass to the visible close-up, not the full rig.
      app.stage.filterArea = app.renderer.screen;
      app.stage.filters = [filter];
      return function sync() {
        var scene = scenes[widget.dataset.vnCharacter] || scenes.alice;
        var night = widget.dataset.sceneTime === "night";
        var wet = /^(rain|storm|snow)$/.test(widget.dataset.sceneWeather);
        var amount = Number(widget.dataset.sceneLightStrength);
        // Keep the same render target when disabled so edge antialiasing stays
        // identical; zero strength is an exact color pass-through.
        filter.uniforms.uStrength =
          widget.dataset.sceneLighting === "false"
            ? 0
            : Number.isFinite(amount)
              ? Math.max(0, Math.min(100, amount)) / 100
              : 0.75;
        filter.uniforms.uAmbient = scene.ambient.map(function (value, i) {
          var weather = wet ? [0.92, 0.96, 1.02][i] : 1;
          return value * (night ? 0.9 : 1) * weather;
        });
        filter.uniforms.uKey = scene.key.map(function (value) {
          return value * (wet ? 0.78 : 1);
        });
        filter.uniforms.uFill = scene.fill.slice();
        filter.uniforms.uKeyPosition = scene.position.slice();
      };
    },
  };
})();
