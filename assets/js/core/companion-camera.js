/* One view transform on the existing PIXI ticker. The canvas stays stationary. */
(function () {
  "use strict";
  var shots = {
    neutral: { zoom: 1, x: 0, y: 0 },
    closer: { zoom: 1.046, x: 0, y: .006 },
    aside: { zoom: 1.016, x: -.017, y: .004 },
    wider: { zoom: .957, x: .007, y: -.008 },
  };
  var rooms = {
    alice: { sway: 1.25, pace: .85, aperturePeriod: 8.8 },
    marisa: { sway: 1.65, pace: 1.08, aperturePeriod: 7.2 },
    patchouli: { sway: .80, pace: .65, aperturePeriod: 11.6 },
  };

  function shotFor(line) {
    if (line.effect === "surprise" || line.expressionMotionId === "06") return "wider";
    if (line.effect === "idea" || line.effect === "question" ||
        line.expressionMotionId === "04" || line.expressionMotionId === "08") return "aside";
    if (line.effect === "blush" || line.expressionMotionId === "02" ||
        line.expressionMotionId === "03") return "closer";
    return "neutral";
  }

  window.CompanionCamera = {
    create: function (app, stage, lens) {
      var model = null, room = rooms.alice;
      var x = 0, y = 0, size = 1, width = 0, height = 0;
      var active = false, strength = 1, time = 0, blend = 0;
      var target = shots.neutral, zoom = 1, shiftX = 0, shiftY = 0;
      function paint() {
        if (!model) return;
        var amplitude = room.sway * Math.min(1, width / 430, height / 320) * blend;
        var phase = time * room.pace;
        var driftX = amplitude * (.72 * Math.sin(phase * .91) + .28 * Math.sin(phase * 1.71));
        var driftY = amplitude * (.53 * Math.sin(phase * 1.17) - .23 * Math.sin(phase * .69));
        model.scale.set(size * zoom);
        model.position.set(x + shiftX + driftX, y + (y - height * .35) * (zoom - 1) + shiftY + driftY);
        model.rotation = .00065 * amplitude * Math.sin(phase * .63);
      }
      function tick() {
        // No DOM reads, new textures or additional render passes per frame.
        var dt = Math.min(app.ticker.deltaMS / 1000, .05);
        time += dt;
        var opening = .74 - .26 * Math.cos(time * Math.PI * 2 / room.aperturePeriod);
        lens.setAperture(opening * strength);
        var ease = 1 - Math.exp(-dt / .36);
        blend += (strength - blend) * ease;
        zoom += (1 + (target.zoom - 1) * strength - zoom) * ease;
        shiftX += (Math.min(width, 780) * target.x * strength - shiftX) * ease;
        shiftY += (Math.min(height, 560) * target.y * strength - shiftY) * ease;
        paint();
      }
      function setShot(name) {
        target = shots[name];
        stage.dataset.cameraShot = name;
      }
      function stopMovement() {
        zoom = 1;
        shiftX = shiftY = blend = 0;
        paint();
      }
      setShot("neutral");
      return {
        frame: function (actor, character, centerX, top, scale, safeWidth, safeHeight) {
          if (model !== actor) {
            model = actor;
            room = rooms[character] || rooms.alice;
            lens.trackSubject(actor, character);
            zoom = 1;
            shiftX = shiftY = blend = time = 0;
          }
          x = centerX; y = top; size = scale;
          width = safeWidth; height = safeHeight;
          paint();
        },
        line: function (line) { setShot(shotFor(line)); },
        release: function () {
          model = null;
          lens.trackSubject(null);
          setShot("neutral");
        },
        setActive: function (enabled, amount) {
          strength = Math.max(0, Math.min(1, amount));
          if (enabled === active) return;
          active = enabled;
          stage.toggleAttribute("data-camera-active", enabled);
          if (enabled) app.ticker.add(tick, null, window.PIXI.UPDATE_PRIORITY.HIGH);
          else {
            app.ticker.remove(tick);
            lens.setAperture(0);
            stopMovement();
          }
        },
      };
    },
  };
})();
