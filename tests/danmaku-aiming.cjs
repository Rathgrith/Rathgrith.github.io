const assert = require("node:assert/strict");
const {
  scene,
  pulse,
  patterns,
} = require("./helpers/danmaku-pattern-trace.cjs");
function sequence(enemy, id, target, moveAfterFirst) {
  const s = scene(enemy, id),
    trace = [];
  Object.assign(s.player, { x: target, y: 305 });
  for (let tick = 0; tick <= 16; tick++) {
    if (tick === 1 && moveAfterFirst) s.player.x = moveAfterFirst;
    trace.push(pulse(s, tick));
  }
  return trace;
}
for (const [enemy, deck] of Object.entries(patterns.cards))
  for (const { id } of deck) {
    const left = sequence(enemy, id, 48),
      right = sequence(enemy, id, 192);
    if (["exposure", "basting"].includes(id))
      assert.notDeepEqual(left, right, id + " samples the pilot");
    else
      assert.deepEqual(
        left,
        right,
        id + " can be learned independently of position"
      );
  }
const held = sequence("marisa", "exposure", 48),
  baited = sequence("marisa", "exposure", 48, 192);
assert.deepEqual(
  held[3],
  baited[3],
  "first exposure keeps the position where the shutter opened"
);
assert.deepEqual(
  held[5],
  baited[5],
  "echo shares the exposure, giving the pilot time to sidestep"
);
assert.notDeepEqual(
  held[11],
  baited[11],
  "next exposure reacquires the target"
);
const a = sequence("alice", "basting", 48),
  b = sequence("alice", "basting", 192);
assert.equal(
  a[0].shots[0][2],
  b[0].shots[0][2],
  "the tracing starts as the same fan"
);
assert.notEqual(
  a[0].shots[0][6].redirect.angle,
  b[0].shots[0][6].redirect.angle,
  "each delayed fold commits to its measured target"
);
console.log(
  "PASS: all fixed and targeted scores, shutter bait/echo/reacquisition, and delayed tracing."
);
