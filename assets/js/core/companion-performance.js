/* Additive acting over the Cannonball rig's authored faces and body poses.
 * One model-frame listener owns blinking, articulation and small gestures. */
(function (scope) {
  "use strict";
  var profiles = {
    alice: { energy: 0.78, mouth: 0.65, blink: 4.2, tilt: 1, breath: 5.8, smile: 0.78, face: 1.14 },
    marisa: { energy: 1.15, mouth: 0.82, blink: 3.6, tilt: -1, breath: 4.9, smile: 0.92, face: 1.20 },
    patchouli: { energy: 0.48, mouth: 0.48, blink: 5.1, tilt: 0.7, breath: 6.7, smile: 0.72, face: 1.10 },
  };
  // Each directed face keeps its meaning throughout a line. These accents
  // never cycle to a different emotion while the visitor is reading.
  var accents = {
    "01": { nod: 0.7, tilt: 0.6, brow: 0.025 },
    "02": { nod: 1.1, tilt: 1.5, brow: 0.055 },
    "03": { nod: 0.6, tilt: -0.4, brow: -0.035 },
    "04": { nod: -0.5, tilt: 1.4, brow: -0.06 },
    "05": { nod: 0.8, tilt: -1.1, brow: -0.055 },
    "06": { nod: -2.4, tilt: -0.6, brow: 0.14 },
    "07": { nod: 1.7, tilt: 2.2, brow: 0.09 },
    "08": { nod: 0.4, tilt: 1.2, brow: -0.035 },
  };
  // EyeSmile changes the closed-eye drawing, not the open-eye expression.
  // Keep an emotional lid opening underneath the independent blink. The
  // original always-open lids hid the smiles at the small docked scale.
  var lids = {
    "01": [1, 1], "02": [0.82, 0.82], "03": [0.94, 0.94],
    "04": [0.88, 0.92], "05": [0.88, 0.88], "06": [1, 1],
    "07": [0.64, 0.68], "08": [0.79, 0.83],
  };
  var visemes = {
    a: { open: 0.95, form: 0.15, width: 0.85 },
    i: { open: 0.34, form: 0.9, width: 1 },
    u: { open: 0.40, form: -0.8, width: 0.35 },
    e: { open: 0.58, form: 0.6, width: 0.85 },
    o: { open: 0.78, form: -0.9, width: 0.45 },
    n: { open: 0, form: 0, width: 0.4 },
    cl: { open: 0, form: 0, width: 0.4 },
    rest: { open: 0, form: 0, width: 0.4 },
  };
  function clamp(n, low, high) { return Math.max(low, Math.min(high, n)); }
  function smooth(n) { n = clamp(n, 0, 1); return n * n * (3 - 2 * n); }
  function pulse(age, duration) {
    if (age < 0 || age >= duration) return 0;
    return Math.pow(Math.sin(Math.PI * age / duration), 2);
  }
  function create(model, character, widget, expressions, options) {
    options = options || {};
    var reduced = options.reducedMotion || function () { return false; };
    var random = options.random || Math.random;
    var profile = profiles[character] || profiles.alice;
    var internal = model.internalModel, core = internal.coreModel;
    var sdkBlink = internal.eyeBlink;
    // The SDK otherwise advances its blink once at rest, and the previous
    // overlay advanced it a second time. Blink timing must not depend on pose.
    internal.eyeBlink = undefined;
    var faceId = "01", face = {}, current = {};
    var eyeLeft = 1, eyeRight = 1;
    var time = 0, lastTime = model.elapsedTime, lineAt = -10;
    var syllableAt = -10, syllableLength = 0.1, phones = ["rest"];
    var mouthForm = 0, mouthWidth = 0.6;
    var speechUntil = -1, talk = 0, mouth = 0;
    var phraseAt = -10, phraseKind = "", nextAccent = 0;
    var blinkAt = -10, nextBlink = 1.5 + random() * 2, blinkCount = 0;
    var repeatBlink = false, speaking = false;
    var reaction = null, reactionType = "", effectAt = -10;
    var stage = widget.querySelector && widget.querySelector("[data-companion-stage]");
    if (stage && scope.CompanionReactions)
      reaction = scope.CompanionReactions.create(stage, character);
    var offsets = { x: 0, y: 0, z: 0, brow: 0 };
    function attr(name, value) {
      var key = "data-live2d-" + name;
      if (value === null) widget.removeAttribute(key);
      else if (widget.getAttribute(key) !== String(value)) widget.setAttribute(key, String(value));
    }
    function setSpeaking(value) {
      if (value === speaking) return;
      speaking = value;
      attr("speaking", value ? "true" : null);
    }
    function setLine(line) {
      faceId = accents[line.expressionMotionId] ? line.expressionMotionId : "01";
      face = Object.assign({ ParamMouthForm: 0, ParamMouthFormScale: 1 }, expressions["01"] || {}, expressions[faceId] || {});
      // Amplify the authored direction, never guess a different emotion from
      // the text. Every adjusted value stays inside these three rigs' ranges.
      Object.keys(face).forEach(function (id) {
        if (!/^ParamBrow/.test(id)) return;
        var neutral = (expressions["01"] || {})[id] || 0;
        face[id] = clamp(neutral + (face[id] - neutral) * profile.face, -1, 1);
      });
      if (faceId === "02") {
        face.ParamMouthForm = Math.max(face.ParamMouthForm || 0, 0.88);
        face.ParamMouthFormScale = Math.max(face.ParamMouthFormScale || 0, profile.smile);
      } else if (faceId === "05") {
        face.ParamMouthForm = Math.min(face.ParamMouthForm || 0, -0.86);
        face.ParamMouthFormScale = Math.max(face.ParamMouthFormScale || 0, 0.72);
      } else if (faceId === "06") {
        // Alice's source width is 0.04: a surprised mouth becomes a single
        // pixel unless the width and a small resting jaw are retained.
        face.ParamMouthFormScale = Math.max(face.ParamMouthFormScale || 0, 0.38);
      }
      lineAt = time;
      phraseAt = -10;
      effectAt = time;
      // A smile can be polite, shy, amused or proud. The dialogue author
      // chooses the accent; a face alone must never imply sparkling stars.
      reactionType = scope.CompanionReactions && scope.CompanionReactions.types.indexOf(line.effect) >= 0
        ? line.effect : "";
      if (reaction) reaction.draw(reactionType, 0, { x: 0, y: 0 }, reduced());
      nextAccent = time + 0.7;
      stopSpeaking();
      attr("expression-id", faceId);
    }
    function speak(glyph, interval, reading) {
      if (reduced()) return;
      glyph = glyph || "あ";
      if (/[\s。、，,.！？!?…「」『』（）()―—]/.test(glyph)) {
        speechUntil = time;
        setSpeaking(false);
        if (/[、，,。！？!?]/.test(glyph) && time >= nextAccent) {
          phraseAt = time;
          phraseKind = /[？?]/.test(glyph) ? "question" : /[！!]/.test(glyph) ? "emphasis" : "pause";
          nextAccent = time + 0.85;
        }
        return;
      }
      phones = reading || (scope.CompanionSpeech ? scope.CompanionSpeech.morae(glyph) : ["rest"]);
      syllableAt = time;
      syllableLength = Math.max(0.025, (interval || 65) / 1000 / Math.max(1, phones.length));
      speechUntil = time + syllableLength * phones.length;
      setSpeaking(true);
    }
    function stopSpeaking() {
      speechUntil = time;
      setSpeaking(false);
    }
    function frame() {
      var dt = clamp((model.elapsedTime - lastTime) / 1000, 0, 0.05);
      lastTime = model.elapsedTime;
      time += dt;
      var quiet = reduced();
      var blend = quiet ? 1 : 1 - Math.exp(-dt / (faceId === "08" ? 0.32 : 0.18));
      Object.keys(face).forEach(function (id) {
        if (current[id] === undefined) current[id] = face[id];
        current[id] += (face[id] - current[id]) * blend;
        core.setParameterValueById(id, current[id]);
      });
      var saying = !quiet && time < speechUntil;
      if (!saying) setSpeaking(false);
      var ease = quiet ? 1 : 1 - Math.exp(-dt / 0.10);
      talk += ((saying ? 1 : 0) - talk) * ease;
      var phoneTime = Math.max(0, time - syllableAt);
      var phoneIndex = Math.min(phones.length - 1, Math.floor(phoneTime / syllableLength));
      var shape = visemes[phones[phoneIndex]] || visemes.rest;
      var restJaw = faceId === "06" ? profile.mouth * 0.22 : 0;
      var jaw = saying ? shape.open * profile.mouth * (0.55 + 0.45 * pulse(phoneTime % syllableLength, syllableLength)) : restJaw;
      mouth += (jaw - mouth) * (quiet ? 1 : 1 - Math.exp(-dt / 0.038));
      core.setParameterValueById("ParamMouthOpenY", mouth);
      // The rigs expose shape/width rather than separate A/I/U/E/O drawings.
      // Blend the viseme over, not instead of, the line's emotional mouth.
      mouthForm += (shape.form - mouthForm) * ease;
      mouthWidth += (shape.width - mouthWidth) * ease;
      var articulation = mouth * talk * 0.55;
      var baseForm = current.ParamMouthForm || 0;
      var baseWidth = current.ParamMouthFormScale === undefined ? 1 : current.ParamMouthFormScale;
      core.setParameterValueById("ParamMouthForm", baseForm * (1 - articulation) + mouthForm * articulation);
      core.setParameterValueById("ParamMouthFormScale", baseWidth * (1 - articulation) + mouthWidth * articulation);
      attr("viseme", saying ? phones[phoneIndex] || "rest" : null);

      // Sparse full blinks; a rare second blink is scheduled only after the
      // eyes have reopened. Expression-specific eyelid shape stays intact.
      if (!quiet && time >= nextBlink) {
        blinkAt = time;
        blinkCount++;
        attr("blink-count", blinkCount);
        var second = !repeatBlink && random() < 0.14;
        nextBlink = time + (second ? 0.40 : profile.blink * (0.72 + random() * 0.6));
        repeatBlink = second;
      }
      var blinkAge = time - blinkAt, open = 1;
      if (!quiet && blinkAge < 0.30) {
        open = blinkAge < 0.085 ? 1 - smooth(blinkAge / 0.085)
          : blinkAge < 0.125 ? 0 : smooth((blinkAge - 0.125) / 0.175);
      }
      var eyelids = lids[faceId];
      eyeLeft += (eyelids[0] - eyeLeft) * blend;
      eyeRight += (eyelids[1] - eyeRight) * blend;
      // A brief closed-eye smile on arrival reads clearly, then settles back
      // into the sustained amused expression; no repeating wink loop.
      var smileEntry = !quiet && faceId === "07" ? pulse(time - lineAt, 1.05) * 0.68 : 0;
      core.setParameterValueById("ParamEyeLOpen", eyeLeft * open * (1 - smileEntry));
      core.setParameterValueById("ParamEyeROpen", eyeRight * open * (1 - smileEntry));
      attr("blinking", open < 0.72 ? "true" : null);
      if (quiet) {
        nextBlink = time + profile.blink;
        blinkAt = -10;
      }

      var accent = accents[faceId], energy = profile.energy;
      var entry = pulse(time - lineAt, faceId === "06" ? 0.85 : 1.65);
      var phrase = pulse(time - phraseAt, 1.1);
      var speechBeat = Math.sin(time * 7.2) * talk;
      var breathe = Math.sin(time * Math.PI * 2 / profile.breath);
      var target = {
        x: energy * (Math.sin(time * 0.67) * 0.5 + speechBeat * 0.35),
        y: energy * (breathe * 0.4 + accent.nod * entry * 1.45 + speechBeat * 0.65 + phrase * (phraseKind === "emphasis" ? 1.7 : 0.7)),
        z: energy * profile.tilt * (Math.sin(time * 0.44) * 0.65 + accent.tilt * entry * 1.35 + phrase * (phraseKind === "question" ? 2.6 : 0.25)),
        brow: energy * (accent.brow * entry + Math.max(0, speechBeat) * 0.045 + phrase * (phraseKind === "question" ? 0.10 : 0.025)),
      };
      Object.keys(offsets).forEach(function (id) {
        offsets[id] += ((quiet ? 0 : target[id]) - offsets[id]) * (quiet ? 1 : 1 - Math.exp(-dt / 0.12));
      });
      // Applied after the loader's held/moving pose overlay, never saved as
      // the next motion's baseline: additive gestures cannot accumulate drift.
      core.addParameterValueById("ParamAngleX", offsets.x);
      core.addParameterValueById("ParamAngleY", offsets.y);
      core.addParameterValueById("ParamAngleZ", offsets.z);
      core.setParameterValueById("ParamBrowLY", clamp((current.ParamBrowLY || 0) + offsets.brow, -1, 1));
      core.setParameterValueById("ParamBrowRY", clamp((current.ParamBrowRY || 0) + offsets.brow * 0.88, -1, 1));
      if (!quiet) {
        core.addParameterValueById("ParamBodyWeight", breathe * 0.30);
        core.addParameterValueById("ParamLeftShoulderUpDown", breathe * 0.11);
        core.addParameterValueById("ParamRightShoulderUpDown", breathe * 0.11);
      }
      var effectAge = time - effectAt;
      var effect = quiet ? 0 : smooth(effectAge / 0.16) * (1 - smooth((effectAge - 1.1) / 0.85));
      if (reactionType === "blush")
        core.addParameterValueById("ParamCheek", effect * (character === "alice" ? 0.48 : 0.28));
      if (reactionType === "sparkle" || reactionType === "idea") {
        core.setParameterValueById("ParamEyeHiLightShake", effect * (character === "marisa" ? 1.7 : 0.7));
      } else if (reactionType === "surprise") {
        core.setParameterValueById("ParamEyeHiLightShake", effect * 2.5);
      }
      if (character === "marisa" && faceId === "07")
        core.addParameterValueById("ParamMouthTooth", effect * mouth * 0.6);
      if (reaction) reaction.draw(reactionType, effectAge, offsets, quiet);
      attr("breathing", quiet ? null : "true");
    }
    setLine({ expressionMotionId: "01" });
    internal.on("beforeModelUpdate", frame);
    return {
      perform: setLine,
      speak: speak,
      stopSpeaking: stopSpeaking,
      destroy: function () {
        internal.off("beforeModelUpdate", frame);
        internal.eyeBlink = sdkBlink;
        if (reaction) reaction.destroy();
        ["speaking", "viseme", "blinking", "blink-count", "breathing"].forEach(function (key) { attr(key, null); });
      },
    };
  }
  var api = { create: create };
  if (typeof module === "object" && module.exports) module.exports = api;
  else scope.CompanionPerformance = api;
})(typeof window === "undefined" ? globalThis : window);
