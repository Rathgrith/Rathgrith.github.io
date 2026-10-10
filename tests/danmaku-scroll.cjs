const assert = require("node:assert/strict");
const Scroll = require("../assets/js/games/danmaku-scroll.js");
const Score = require("../assets/js/games/danmaku-engine.js");
const Flower = require("../assets/js/games/danmaku-flower.js");
function speed(character, extra) {
  const state = { scroll: 0, scrollSpeed: Scroll.initial(character) };
  for (let i = 0; i < 5 * 60; i++)
    Scroll.advance(state, 1 / 60, {
      character,
      time: 0,
      rhythm: { energy: 0.2, progress: 1 },
      ...extra,
    });
  return state.scrollSpeed;
}
for (const character of ["alice", "marisa", "patchouli"]) {
  const quiet = speed(character, {}),
    loud = speed(character, { rhythm: { energy: 1, progress: 0.5 } });
  assert(quiet >= 100, "even quiet combat has forward-flight speed");
  assert(loud > quiet + 45, "music energy visibly affects pace");
  assert(
    speed(character, { time: 180 }) > quiet + 45,
    "later waves gain speed"
  );
  assert(
    speed(character, { pressure: 1 }) > quiet + 30,
    "busy combat adds momentum"
  );
  assert(
    speed(character, { declaration: true }) < quiet - 5,
    "declarations ease the scrolling"
  );
  const state = { scroll: 0, scrollSpeed: Scroll.initial(character) };
  for (let i = 0; i < 600; i++) {
    const old = state.scrollSpeed,
      distance = state.scroll;
    Scroll.advance(state, 1 / 60, {
      character,
      time: 1000,
      pressure: 1,
      rhythm: { energy: i % 120 < 60 ? 1 : 0.1, progress: 0 },
    });
    assert(
      Math.abs(state.scrollSpeed - old) <= 85 / 60 + 0.001,
      "no abrupt speed steps"
    );
    assert(
      state.scroll >= distance &&
        state.scroll - distance <= Scroll.maxSpeed / 60,
      "distance stays continuous and bounded"
    );
  }
  for (let i = 0; i < 240; i++)
    Scroll.advance(state, 1 / 60, { character, rest: true });
  assert.equal(state.scrollSpeed, 0, "intermissions coast to a stop");
}
for (const Engine of [Score, Flower])
  for (const character of ["alice", "marisa", "patchouli"]) {
    const g = Engine.create(character, character, 1977);
    g.state.countdown = 0;
    if (g.state.fields)
      g.state.fields.forEach((f) => (f.player.invulnerable = Infinity));
    else g.state.player.invulnerable = Infinity;
    const view = () =>
      g.state.fields
        ? g.state.fields
        : g.state.scroll === undefined
          ? []
          : [g.state];
    for (let i = 0; i < 20 * 60; i++) g.step(1 / 60);
    assert(
      view().every((f) => f.scroll > 1800 && f.scrollSpeed > 85),
      "forward-flight speed in both modes"
    );
    g.pause();
    const stopped = view().map((f) => f.scroll);
    for (let i = 0; i < 60; i++) g.step(1 / 60);
    assert.deepEqual(
      view().map((f) => f.scroll),
      stopped,
      "pause freezes the scrolling"
    );
    g.resume();
    for (let i = 0; i < 10; i++) g.step(1 / 60);
    assert.deepEqual(
      view().map((f) => f.scroll),
      stopped,
      "resume countdown does not jump"
    );
    g.state.countdown = 0;
    g.state.intermission = { age: 0, remaining: 8 };
    for (let i = 0; i < 240; i++) g.step(1 / 60);
    assert(
      view().every((f) => f.scrollSpeed === 0),
      "round rest stops each field smoothly"
    );
    const before = view().map((f) => f.scroll);
    assert(g.nextRound());
    assert.deepEqual(
      view().map((f) => f.scroll),
      before,
      "new round preserves the background offset"
    );
  }
console.log(
  "PASS: music/progression/pressure response, bounded acceleration, declarations/rest, pause/resume, continuous rounds and both game modes."
);
