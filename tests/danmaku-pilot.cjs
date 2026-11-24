const assert = require("node:assert/strict");
const engine = require("../assets/js/games/danmaku-engine.js");

// Start near the rear left wall. A moving opening in the descending rows
// overlaps fans of aimed shots that curve back across the opening.
function runCrossfire(seed) {
  const game = engine.create("alice", "alice", seed);
  const s = game.state;
  s.countdown = 0;
  s.intro = null;
  s.attackReadyAt = Infinity;
  s.run.nextWave = Infinity;
  s.bombs = 1;
  Object.assign(s.player, { x: 31, y: 326, invulnerable: 0 });
  game.setAuto(true);

  let value = seed;
  function random() {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  }
  function spawn(x, y, angle, speed, curve) {
    s.bullets.push({
      fixture: true,
      x,
      y,
      vx: speed * Math.cos(angle),
      vy: speed * Math.sin(angle),
      radius: 3,
      shape: "orb",
      curve,
      age: 0,
      grazed: false,
    });
  }
  for (let frame = 0; frame < 320; frame++) {
    s.bullets = s.bullets.filter((b) => b.fixture);
    s.items = [];
    if (frame % 22 === 0) {
      const offset = random() * 8;
      const opening = 55 + 42 * Math.sin(frame / 65) + random() * 12;
      for (let x = -7 + offset; x < 250; x += 12) {
        if (Math.abs(x - opening) > 24)
          spawn(x, 192, Math.PI / 2 + (random() - 0.5) * 0.32, 78, 0);
      }
    }
    if (frame % 17 === 0) {
      const x = frame % 34 === 0 ? 3 : 237;
      const y = 158 + random() * 84;
      const angle = Math.atan2(s.player.y - y, s.player.x - x);
      for (let j = -2; j <= 2; j++) {
        spawn(x, y, angle + j * 0.16, 90, j % 2 === 0 ? 0.67 : -0.67);
      }
    }
    game.step(1 / 60);
  }
  assert.equal(s.lives, 3, `seed ${seed}: escape crossfire without a hit`);
  assert.equal(s.bombs, 1, `seed ${seed}: preserve the emergency bomb`);
  assert.equal(s.player.invulnerable, 0);
}

for (let seed = 1; seed <= 12; seed++) runCrossfire(seed);
console.log(
  "PASS: 12 moving openings with curved crossfire and a wall-side start"
);

// A planner that camps near the bottom, or always focuses while stationary,
// cannot use the front-line dolls against a distant opponent.
const flower = require("../assets/js/games/danmaku-flower.js");
for (const [mode, sim] of [["score", engine], ["flower", flower]]) {
  const g = sim.create("alice", "patchouli", 0x53013);
  g.setAuto(true);
  let launched = 0, returned = 0, contacts = 0;
  const phases = new WeakMap(), seen = new WeakSet();
  for (let i = 0; i < 22 * 60; i++) {
    g.step(1 / 60);
    const field = mode === "score" ? g.state : g.state.fields[0];
    for (const doll of field.weapon.dolls) {
      const last = phases.get(doll);
      if (doll.phase === "strike" && last !== "strike") launched++;
      if (last === "return" && doll.phase !== last) returned++;
      phases.set(doll, doll.phase);
    }
    for (const trace of field.weapon.traces) {
      if (!seen.has(trace) && ["cleave","thrust"].includes(trace.kind)) contacts++;
      seen.add(trace);
    }
  }
  assert(launched >= 4 && returned >= 3 && contacts >= 2,
    mode + ": Alice dispatches dolls, connects and returns for the next order");
}
console.log("PASS: Alice AUTO brings both fields into melee support range");
