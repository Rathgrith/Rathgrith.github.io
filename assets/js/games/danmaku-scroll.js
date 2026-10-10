/* Presentation-only scrolling in logical pixels: integrated distance, no speed-change jumps. */
(function (scope) {
  "use strict";
  // A field passes in roughly 2–3 seconds during combat. The old 22–29px/s
  // crawl was visible as animation but never read as forward flight.
  var pace = { alice: 94, marisa: 110, patchouli: 88 },
    limit = 270;
  function initial(id) {
    return pace[id] || pace.alice;
  }
  function advance(state, dt, scene) {
    var rhythm = scene.rhythm || {},
      energy = Math.max(0, Math.min(1, Number(rhythm.energy) || 0));
    var pulse = Math.pow(
      1 - Math.max(0, Math.min(1, Number(rhythm.progress) || 0)),
      3
    );
    var pressure = Math.max(0, Math.min(1, scene.pressure || 0));
    var target = Math.min(
      limit,
      initial(scene.character) +
        Math.min(52, Math.max(0, scene.time || 0) * 0.3) +
        energy * 68 +
        pressure * 36 +
        pulse * 10
    );
    if (scene.declaration) target *= 0.65;
    if (scene.rest) target = 0;
    dt = Math.max(0, Math.min(0.05, dt));
    var delta =
      (target - state.scrollSpeed) *
      (1 - Math.exp(-dt * (scene.rest ? 5 : 2.8)));
    var acceleration = (scene.rest ? 320 : 85) * dt;
    state.scrollSpeed = Math.max(
      0,
      Math.min(
        limit,
        state.scrollSpeed +
          Math.max(-acceleration, Math.min(acceleration, delta))
      )
    );
    if (scene.rest && state.scrollSpeed < 0.05) state.scrollSpeed = 0;
    state.scroll += state.scrollSpeed * dt;
  }
  var api = { initial: initial, advance: advance, maxSpeed: limit };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else scope.DanmakuScroll = api;
})(typeof window !== "undefined" ? window : globalThis);
