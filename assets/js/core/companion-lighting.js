/* Key/fill lighting and face-tracked depth of field share the model render pass. */
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
    "uniform vec4 uViewToScene, uFocusEllipse, inputClamp;",
    "uniform float uLensRadius;",
    "vec4 lensTap(vec2 delta) {",
    "  return texture2D(uSampler, clamp(vTextureCoord + delta, inputClamp.xy, inputClamp.zw));",
    "}",
    "void main(void) {",
    "  vec4 source = texture2D(uSampler, vTextureCoord);",
    "  float alpha = source.a;",
    "  vec2 pixel = outputFrame.xy + vTextureCoord * inputSize.xy;",
    // Keep both eyes, the mouth and the cheeks on a completely sharp focal plane.
    "  if (uLensRadius > 0.0 && alpha > 0.0) {",
    "    float distanceFromFace = length((pixel - uFocusEllipse.xy) / uFocusEllipse.zw);",
    "    float radius = uLensRadius * smoothstep(1.15, 2.15, distanceFromFace);",
    "    if (radius > 0.08) {",
    "      vec2 r = radius * inputSize.zw;",
    // An aperture disk with its samples on two rings. Average premultiplied
    // color before dividing by coverage to prevent dark fringes on pale hair.
    "      vec4 sum = source * 2.0;",
    "      sum += lensTap(r * vec2(1.0, 0.0)) + lensTap(r * vec2(-1.0, 0.0));",
    "      sum += lensTap(r * vec2(0.0, 1.0)) + lensTap(r * vec2(0.0, -1.0));",
    "      sum += lensTap(r * vec2(0.71, 0.71)) + lensTap(r * vec2(-0.71, -0.71));",
    "      sum += lensTap(r * vec2(-0.71, 0.71)) + lensTap(r * vec2(0.71, -0.71));",
    "      sum += lensTap(r * vec2(0.44, 0.18)) + lensTap(r * vec2(-0.44, -0.18));",
    "      sum += lensTap(r * vec2(-0.18, 0.44)) + lensTap(r * vec2(0.18, -0.44));",
    "      source = sum / 14.0;",
    "    }",
    "  }",
    "  vec2 uv = vTextureCoord * inputSize.xy / max(outputFrame.zw, vec2(1.0));",
    "  uv = uv * uViewToScene.xy + uViewToScene.zw;",
    "  vec2 keyDistance = (uv - uKeyPosition) * vec2(1.0, 0.65);",
    "  vec2 fillDistance = (uv - vec2(1.1, 0.45)) * vec2(1.2, 0.8);",
    "  float key = exp(-dot(keyDistance, keyDistance) * 1.4);",
    "  float fill = exp(-dot(fillDistance, fillDistance) * 2.0);",
    "  vec3 illumination = uAmbient + uKey * key + uFill * fill;",
    "  illumination *= 1.0 - 0.12 * smoothstep(0.45, 1.0, uv.y);",
    // Pixi render textures use premultiplied alpha; recolor the artwork only.
    "  vec3 base = source.rgb / max(source.a, 0.0001);",
    "  vec3 lit = min(base * illumination, vec3(1.0));",
    "  gl_FragColor = vec4(mix(base, lit, uStrength) * alpha, alpha);",
    "}",
  ].join("\n");

  window.CompanionLighting = {
    create: function (app, widget) {
      var sceneLight = widget.querySelector(".vn-scene-light");
      var filter = new window.PIXI.Filter(null, fragment, {
        uAmbient: scenes.alice.ambient.slice(),
        uKey: scenes.alice.key.slice(),
        uFill: scenes.alice.fill.slice(),
        uKeyPosition: scenes.alice.position.slice(),
        uStrength: 0.75,
        uViewToScene: [1, 1, 0, 0],
        uFocusEllipse: [0, 0, 1, 1],
        uLensRadius: 0,
      });
      filter.padding = 0;
      // Bound the extra render pass to the visible close-up, not the full rig.
      app.stage.filterArea = app.renderer.screen;
      app.stage.filters = [filter];
      var subject = null, eyesAndMouth = [], bounds = {};
      var points = [new window.PIXI.Point(), new window.PIXI.Point(), new window.PIXI.Point()];
      function trackSubject(model, character) {
        subject = null;
        filter.uniforms.uLensRadius = 0;
        if (!model) return;
        var meshes = window.CompanionReactions.faceMeshes[character];
        if (!meshes) return;
        eyesAndMouth = meshes.map(function (name) { return model.internalModel.getDrawableIndex(name); });
        if (eyesAndMouth.every(function (index) { return index >= 0; })) subject = model;
      }
      // The filter runs after Cubism has drawn the current pose. These three
      // mesh centers use the same world matrix and units as its render target.
      filter.apply = function (manager, input, output, clearMode) {
        if (subject && filter.uniforms.uLensRadius > 0) {
          var internal = subject.internalModel;
          for (var i = 0; i < points.length; i++) {
            internal.getDrawableBounds(eyesAndMouth[i], bounds);
            var point = points[i];
            point.set(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
            internal.localTransform.apply(point, point);
            subject.worldTransform.apply(point, point);
          }
          var left = points[0], right = points[1], mouth = points[2];
          var eyeX = (left.x + right.x) / 2, eyeY = (left.y + right.y) / 2;
          var separation = Math.max(4, Math.hypot(right.x - left.x, right.y - left.y));
          var focus = filter.uniforms.uFocusEllipse;
          focus[0] = eyeX + (mouth.x - eyeX) * .28;
          focus[1] = eyeY + (mouth.y - eyeY) * .36;
          focus[2] = separation * 1.13;
          focus[3] = Math.max(separation * 1.12, Math.abs(mouth.y - eyeY) * 1.25);
        }
        manager.applyFilter(this, input, output, clearMode);
      };
      function setAperture(opening) {
        // Radius in screen CSS pixels, independent of the backing store's DPR.
        var maxRadius = Math.min(1.55, Math.max(.8, app.screen.height / 325));
        filter.uniforms.uLensRadius = subject ? opening * maxRadius : 0;
      }
      function updateView() {
        filter.resolution = app.renderer.resolution;
        if (sceneLight.offsetWidth && sceneLight.offsetHeight) {
          var mapping = filter.uniforms.uViewToScene;
          mapping[0] = app.screen.width / sceneLight.offsetWidth;
          mapping[1] = app.screen.height / sceneLight.offsetHeight;
          mapping[2] = -sceneLight.offsetLeft / sceneLight.offsetWidth;
          mapping[3] = -sceneLight.offsetTop / sceneLight.offsetHeight;
        }
      }
      function sync() {
        updateView();
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
      }
      sync.updateView = updateView;
      sync.trackSubject = trackSubject;
      sync.setAperture = setAperture;
      return sync;
    },
  };
})();
