/* Key/fill lighting and face-tracked depth of field share the model render pass. */
(function () {
  "use strict";
  // Gains in approximate linear light. Positions are on the 16:9 room plate
  // after its 4:3 painting is cropped at 45% vertically; the skylight is above frame.
  var scenes = {
    alice: { // Blue atelier window at upper left, small shaded lamp at right.
      ambient: [.50, .60, .75], key: [.22, .38, .64], fill: [.46, .23, .08],
      position: [.09, .10], fillPosition: [.91, .49], rim: [.12, .28, .56], daylight: .88,
    },
    marisa: { // The table lantern is the key. Cool window light returns from the right.
      ambient: [.81, .60, .44], key: [.66, .39, .16], fill: [.09, .19, .33],
      position: [.06, .54], fillPosition: [.84, .21], rim: [.63, .30, .08], daylight: .12,
    },
    patchouli: { // High clerestory above the desk, amber bounce off the left shelves.
      ambient: [.55, .48, .67], key: [.37, .33, .64], fill: [.39, .22, .10],
      position: [.52, -.06], fillPosition: [.17, .60], rim: [.34, .27, .56], daylight: .61,
    },
  };
  // Each rig swaps one drawable per hand when it changes its gesture. Patchouli's
  // exported drawable names carry no anatomy; pair them using their Cubism parts.
  var hands = {
    alice: [["hand1", "hand2", "hand3", "hand4", "hand5", "hand6", "hand7"],
      ["hand8", "hand9", "hand10", "hand11", "hand12", "hand13", "hand14"]],
    marisa: [["Hand01", "Hand02", "Hand03", "Hand04", "Hand05", "Hand06", "Hand07"],
      ["Hand15", "Hand16", "Hand17", "Hand18", "Hand19", "Hand20", "Hand21"]],
    patchouli: [["D_PSD1_81", "D_PSD1_90", "D_PSD1_96", "D_PSD1_97", "D_PSD1_98", "D_PSD1_99", "D_PSD1_100"],
      ["D_PSD1_34", "D_PSD1_35", "D_PSD1_36", "D_PSD1_37", "D_PSD1_38", "D_PSD1_39", "D_PSD1_40"]],
  };
  var fragment = [
    "precision highp float;",
    "varying vec2 vTextureCoord;",
    "uniform sampler2D uSampler;",
    "uniform vec4 inputSize;",
    "uniform vec4 outputFrame;",
    "uniform vec3 uAmbient, uKey, uFill;",
    "uniform vec2 uKeyPosition, uFillPosition;",
    "uniform vec3 uRim;",
    "uniform float uStrength;",
    "uniform vec4 uViewToScene, uFocusEllipse, inputClamp;",
    "uniform float uLensRadius, uFocusPlane;",
    "uniform vec4 uHandA, uHandB;",
    "vec4 lensTap(vec2 delta) {",
    "  return texture2D(uSampler, clamp(vTextureCoord + delta, inputClamp.xy, inputClamp.zw));",
    "}",
    "vec4 lensPair(vec2 offset) { return lensTap(offset) + lensTap(-offset); }",
    "void main(void) {",
    "  vec4 source = texture2D(uSampler, vTextureCoord);",
    "  float alpha = source.a;",
    "  if (alpha == 0.0 || (uStrength == 0.0 && uLensRadius == 0.0)) {",
    "    gl_FragColor = source;",
    "    return;",
    "  }",
    "  vec2 pixel = outputFrame.xy + vTextureCoord * inputSize.xy;",
    "  vec2 faceUV = (pixel - uFocusEllipse.xy) / uFocusEllipse.zw;",
    "  float distanceFromFace = length(faceUV);",
    // A layered depth approximation on the 2D rig. The body falls gently away
    // from subject focus; near focus follows the actual hands and the lower sleeves.
    "  if (uLensRadius > 0.0) {",
    "    float defocus = smoothstep(1.15, 2.15, distanceFromFace);",
    "    if (uFocusPlane != 0.0) {",
    "      float a = length((pixel - uHandA.xy) / uHandA.zw);",
    "      float b = length((pixel - uHandB.xy) / uHandB.zw);",
    "      float hands = 1.0 - smoothstep(0.92, 1.82, min(a, b));",
    "      float sleeves = 0.68 * smoothstep(1.45, 3.30, faceUV.y);",
    "      float front = max(hands, sleeves) * smoothstep(0.62, 1.15, distanceFromFace);",
    "      defocus = uFocusPlane < 0.0 ? 2.35 * (1.0 - front) : 3.05 + 0.95 * front;",
    "    }",
    "    float radius = min(6.0, uLensRadius * defocus);",
    "    if (radius > 0.08) {",
    "      vec2 r = radius * inputSize.zw;",
    // Symmetric pairs distributed over the aperture disk keep the blur centered.
    // Only the wider manual defocus needs the interleaved second set of samples.
    // Average premultiplied colors so pale fringes do not pull in black.
    "      vec4 sum = source;",
    "      sum += lensPair(r * vec2(0.337, 0.000));",
    "      sum += lensPair(r * vec2(0.192, 0.493));",
    "      sum += lensPair(r * vec2(-0.493, 0.451));",
    "      sum += lensPair(r * vec2(-0.702, -0.347));",
    "      sum += lensPair(r * vec2(0.077, -0.880));",
    "      sum += lensPair(r * vec2(0.934, -0.272));",
    "      float weight = 13.0;",
    "      if (uFocusPlane != 0.0 && radius > 1.8) {",
    "        vec4 wide = lensPair(r * vec2(0.209, 0.134));",
    "        wide += lensPair(r * vec2(-0.095, 0.468));",
    "        wide += lensPair(r * vec2(-0.619, 0.107));",
    "        wide += lensPair(r * vec2(-0.386, -0.642));",
    "        wide += lensPair(r * vec2(0.522, -0.675));",
    "        wide += lensPair(r * vec2(0.907, 0.268));",
    "        float blend = smoothstep(1.8, 2.3, radius);",
    "        sum += wide * blend;",
    "        weight += 12.0 * blend;",
    "      }",
    "      source = sum / weight;",
    "    }",
    "  }",
    // Alpha stays at the center texel even where the aperture softens colors.
    "  vec3 base = source.rgb / max(source.a, 0.0001);",
    "  if (uStrength == 0.0) {",
    "    gl_FragColor = vec4(base * alpha, alpha);",
    "    return;",
    "  }",
    "  vec2 uv = vTextureCoord * inputSize.xy / max(outputFrame.zw, vec2(1.0));",
    "  uv = uv * uViewToScene.xy + uViewToScene.zw;",
    "  vec2 toKey = uKeyPosition - uv;",
    "  vec2 keyDistance = toKey * vec2(1.3, 0.92);",
    "  vec2 fillDistance = (uv - uFillPosition) * vec2(1.55, 1.12);",
    "  float key = exp(-dot(keyDistance, keyDistance) * 1.65);",
    "  float fill = exp(-dot(fillDistance, fillDistance) * 1.75);",
    "  vec3 illumination = uAmbient + uKey * key + uFill * fill;",
    "  illumination *= 1.0 - 0.13 * smoothstep(0.45, 1.0, uv.y);",
    // Retain the artist's skin and eye colors under the room's strongest casts.
    "  float face = 1.0 - smoothstep(0.72, 1.55, distanceFromFace);",
    "  illumination = mix(illumination, vec3(1.0), 0.34 * face);",
    // Modulate irradiance and add reflections in approximate linear light.
    // One directional coverage probe on the actor, a second only along an exposed edge.
    "  vec3 linear = base * base;",
    "  vec3 lit = linear * illumination;",
    "  vec2 roomSize = outputFrame.zw / max(uViewToScene.xy, vec2(0.001));",
    "  vec2 direction = toKey * roomSize;",
    "  float width = clamp(min(roomSize.x, roomSize.y) * 0.008, 1.4, 4.5);",
    "  vec2 stepUV = direction / max(length(direction), 1.0) * width * inputSize.zw;",
    "  float edge = max(0.0, alpha - lensTap(stepUV).a);",
    "  if (edge > 0.01) {",
    "    float lip = max(0.0, alpha - lensTap(stepUV * 0.42).a);",
    "    float reflection = (0.30 * edge + 0.70 * lip) * key;",
    "    lit += uRim * reflection * (0.24 + 0.76 * base) * (1.0 - clamp(lit, 0.0, 1.0));",
    "  }",
    "  vec3 color = sqrt(clamp(mix(linear, lit, uStrength), 0.0, 1.0));",
    "  gl_FragColor = vec4(color * alpha, alpha);",
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
        uFillPosition: scenes.alice.fillPosition.slice(),
        uRim: scenes.alice.rim.slice(),
        uStrength: 0.75,
        uViewToScene: [1, 1, 0, 0],
        uFocusEllipse: [0, 0, 1, 1],
        uLensRadius: 0,
        uFocusPlane: 0,
        uHandA: [-10000, -10000, 1, 1],
        uHandB: [-10000, -10000, 1, 1],
      });
      filter.padding = 0;
      // Bound the extra render pass to the visible close-up, not the full rig.
      app.stage.filterArea = app.renderer.screen;
      app.stage.filters = [filter];
      var subject = null, eyesAndMouth = [], handMeshes = [], bounds = {};
      var points = [new window.PIXI.Point(), new window.PIXI.Point(), new window.PIXI.Point()];
      function trackSubject(model, character) {
        subject = null;
        filter.uniforms.uLensRadius = 0;
        if (!model) return;
        var meshes = window.CompanionReactions.faceMeshes[character];
        if (!meshes) return;
        eyesAndMouth = meshes.map(function (name) { return model.internalModel.getDrawableIndex(name); });
        if (eyesAndMouth.every(function (index) { return index >= 0; })) {
          subject = model;
          handMeshes = (hands[character] || [[], []]).map(function (names) {
            return names.map(function (name) { return model.internalModel.getDrawableIndex(name); })
              .filter(function (index) { return index >= 0; });
          });
        }
      }
      function project(point, x, y) {
        point.set(x, y);
        subject.internalModel.localTransform.apply(point, point);
        subject.worldTransform.apply(point, point);
      }
      function trackHand(indices, ellipse, faceWidth) {
        var internal = subject.internalModel, opacitySum = 0;
        var cx = 0, cy = 0, rx = 0, ry = 0;
        for (var i = 0; i < indices.length; i++) {
          var alpha = internal.coreModel.getDrawableOpacity(indices[i]);
          if (alpha < .02) continue;
          internal.getDrawableBounds(indices[i], bounds);
          project(points[0], bounds.x, bounds.y);
          project(points[1], bounds.x + bounds.width, bounds.y + bounds.height);
          cx += alpha * (points[0].x + points[1].x) / 2;
          cy += alpha * (points[0].y + points[1].y) / 2;
          rx += alpha * Math.abs(points[1].x - points[0].x) * .64;
          ry += alpha * Math.abs(points[1].y - points[0].y) * .70;
          opacitySum += alpha;
        }
        ellipse[0] = opacitySum ? cx / opacitySum : -10000;
        ellipse[1] = opacitySum ? cy / opacitySum : -10000;
        ellipse[2] = Math.max(faceWidth * .30, opacitySum ? rx / opacitySum : 1);
        ellipse[3] = Math.max(faceWidth * .34, opacitySum ? ry / opacitySum : 1);
      }
      // Track the deformed meshes after Cubism has applied its current pose.
      filter.apply = function (manager, input, output, clearMode) {
        if (subject && (filter.uniforms.uLensRadius > 0 || filter.uniforms.uStrength > 0)) {
          var internal = subject.internalModel;
          for (var i = 0; i < points.length; i++) {
            internal.getDrawableBounds(eyesAndMouth[i], bounds);
            project(points[i], bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
          }
          var left = points[0], right = points[1], mouth = points[2];
          var eyeX = (left.x + right.x) / 2, eyeY = (left.y + right.y) / 2;
          var separation = Math.max(4, Math.hypot(right.x - left.x, right.y - left.y));
          var focus = filter.uniforms.uFocusEllipse;
          focus[0] = eyeX + (mouth.x - eyeX) * .28;
          focus[1] = eyeY + (mouth.y - eyeY) * .36;
          focus[2] = separation * 1.13;
          focus[3] = Math.max(separation * 1.12, Math.abs(mouth.y - eyeY) * 1.25);
          if (filter.uniforms.uFocusPlane !== 0 && filter.uniforms.uLensRadius > 0) {
            trackHand(handMeshes[0], filter.uniforms.uHandA, focus[2]);
            trackHand(handMeshes[1], filter.uniforms.uHandB, focus[2]);
          }
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
        var plane = widget.dataset.lensFocusMode === "manual" && widget.dataset.lensFocusPlane;
        filter.uniforms.uFocusPlane = plane === "near" ? -1 : plane === "far" ? 1 : 0;
        var night = widget.dataset.sceneTime === "night";
        var weather = widget.dataset.sceneWeather;
        var overcast = { cloud: .32, rain: .65, storm: 1, snow: .5 }[weather] || 0;
        // Weather diffuses the sky much more than it changes the oil lantern.
        var keyGain = (1 - scene.daylight * overcast * .40) * (night ? 1 - .18 * scene.daylight : 1);
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
          var sky = 1 + overcast * [-.13, -.06, .06][i];
          return value * sky * (night ? [.79, .84, .92][i] : 1);
        });
        filter.uniforms.uKey = scene.key.map(function (value) {
          return value * keyGain;
        });
        filter.uniforms.uRim = scene.rim.map(function (value) { return value * keyGain; });
        filter.uniforms.uFill = scene.fill.map(function (value) {
          return value * (1 - (1 - scene.daylight) * overcast * .32);
        });
        filter.uniforms.uFillPosition = scene.fillPosition.slice();
        filter.uniforms.uKeyPosition = scene.position.slice();
      }
      sync.updateView = updateView;
      sync.trackSubject = trackSubject;
      sync.setAperture = setAperture;
      return sync;
    },
  };
})();
