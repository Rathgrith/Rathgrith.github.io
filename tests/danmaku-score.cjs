const assert = require("node:assert/strict");
const engine = require("../assets/js/games/danmaku-engine.js");
const tick = (g, n) => {
  for (let i = 0; i < n * 60; i++) g.step(1 / 60);
};
const ready = (enemy = "alice") => {
  let g = engine.create("alice", enemy, 1977);
  g.state.countdown = 0;
  return g;
};
for (const id of Object.keys(engine.cast)) {
  const track = engine.score.getTrack(id);
  assert(
    track.beats.length > 550 &&
      track.beats.every((t, i, a) => !i || t > a[i - 1])
  );
  assert(track.energy.every((v) => v >= 0.12 && v <= 1));
  assert.equal(engine.score.at(id, track.duration + 0.9).cycle, 1);
  const g = ready(id);
  g.state.player.invulnerable = Infinity;
  const seen = new Set();
  let beams = 0;
  for (let i = 0; i < track.duration * 60; i++) {
    g.state.enemySpell.hp = Infinity;
    g.step(1 / 60);
    seen.add(g.state.enemySpell.id);
    beams = Math.max(beams, g.state.lasers.length);
    assert(
      g.state.bullets.length <= 720 &&
        g.state.lasers.length <= 12 &&
        g.state.scoreItems.length <= 720
    );
  }
  assert.equal(seen.size, 6, id + " must reach six distinct cards");
  if (id !== "patchouli") assert(beams > 0, id + " has real laser hazards");
}
const g = ready();
g.state.player.invulnerable = 0;
g.step(1 / 60);
const p = g.state.player;
g.state.bullets = [
  { x: p.x + 18, y: p.y, vx: 0, vy: 0, radius: 2.4, grazed: false },
];
g.step(1 / 60);
assert.equal(g.state.grazes, 1, "expanded near-miss zone");
assert.equal(g.state.lives, 3);
assert.equal(p.radius, 2.2);
g.state.bullets.push({
  x: p.x + 20,
  y: p.y,
  vx: 0,
  vy: 0,
  radius: 2.4,
  grazed: false,
});
g.step(1 / 60);
assert.equal(g.state.grazes, 1);
const cancel = ready();
cancel.step(1 / 60);
cancel.state.bullets = [
  { x: 40, y: 40, vx: 0, vy: 0, radius: 2.4 },
  { x: 160, y: 80, vx: 0, vy: 0, radius: 2.4 },
];
const before = cancel.state.score;
cancel.bomb();
assert.equal(cancel.state.score, before, "cancel points require collection");
assert.equal(cancel.state.scoreItems.length, 2);
tick(cancel, 1.4);
assert.equal(cancel.state.scoreItems.length, 0);
assert(cancel.state.score >= before + 4);
// Emptying the repeatable pressure bar cancels hazards without ending a card.
const capture = ready();
capture.step(1 / 60);
capture.state.player.invulnerable = 0;
const originalCard = capture.state.enemySpell.id;
function emptyBar(g) {
  g.state.enemySpell.hp = 1;
  g.state.bullets = [{ x: 40, y: 40, vx: 0, vy: 0, radius: 2.4 }];
  g.state.shots.push({
    x: g.state.boss.x,
    y: g.state.boss.y,
    vx: 0,
    vy: 0,
    damage: 2,
  });
  g.step(1 / 60);
}
emptyBar(capture);
assert(!capture.state.enemySpell.nonspell && !capture.state.breakNotice);
assert.equal(capture.state.enemySpell.clears, 1);
assert.equal(capture.state.scoreItems.length, 1);
assert.equal(
  capture.state.player.invulnerable,
  0,
  "pressure clear grants no invulnerability"
);
const remaining = capture.state.enemySpell.remaining;
tick(capture, 1.2);
assert(capture.state.enemySpell.hp > 0);
assert(capture.state.enemySpell.remaining < remaining);
emptyBar(capture);
assert.equal(capture.state.enemySpell.clears, 2);
assert.equal(capture.state.enemySpell.id, originalCard);
capture.pause();
const pressureSnapshot = JSON.stringify(capture.state);
tick(capture, 1);
assert.equal(JSON.stringify(capture.state), pressureSnapshot);
capture.resume();
capture.state.countdown = 0;
capture.state.time = capture.state.rhythm.spellEnd - 0.01;
capture.step(1 / 60);
assert(capture.state.enemySpell.nonspell && capture.state.breakNotice.captured);
assert.equal(capture.state.breakNotice.bonus, 5000);
assert(!("health" in capture.state.boss));
const bombed = ready();
bombed.step(1 / 60);
bombed.bomb();
bombed.state.time = bombed.state.rhythm.spellEnd - 0.01;
bombed.step(1 / 60);
assert(bombed.state.enemySpell.nonspell && !bombed.state.breakNotice.captured);
const beam = ready("marisa");
beam.state.player.invulnerable = 0;
beam.state.lasers = [
  {
    x: 120,
    y: 20,
    angle: Math.PI / 2,
    width: 14,
    warning: 1,
    duration: 1,
    color: "#fff",
    sweep: 0,
    age: 0,
    grazed: false,
    fired: false,
  },
];
tick(beam, 0.8);
assert.equal(beam.state.lives, 3, "laser warning is harmless");
tick(beam, 0.3);
assert.equal(beam.state.lives, 2, "active laser has collision");
const dirs = [
  ["n", 0, -1],
  ["ne", 1, -1],
  ["e", 1, 0],
  ["se", 1, 1],
  ["s", 0, 1],
  ["sw", -1, 1],
  ["w", -1, 0],
  ["nw", -1, -1],
];
for (const [direction, x, y] of dirs) {
  const a = ready();
  a.step(1 / 60, { x, y });
  assert.equal(a.state.player.facing, direction);
  a.step(1 / 60);
  assert.equal(a.state.player.facing, "idle");
}
const dense = ready();
dense.step(1 / 60);
dense.state.bullets = Array.from({ length: 720 }, (_, i) => ({
  x: 10 + (i % 220),
  y: 30 + (i % 290),
}));
dense.bomb();
assert.equal(dense.state.scoreItems.length, 720);
assert.equal(
  dense.state.scoreItems.reduce((n, p) => n + p.value, 0),
  1440,
  "bounded cancels preserve the value of every bullet"
);
dense.pause();
const frozen = JSON.stringify(dense.state.scoreItems);
tick(dense, 1);
assert.equal(JSON.stringify(dense.state.scoreItems), frozen);
for (const id of Object.keys(engine.cast)) {
  const quiet = ready(id);
  quiet.state.player.invulnerable = Infinity;
  let naturalBreak = false;
  for (let i = 0; i < 1160 * 60; i++) {
    quiet.state.enemySpell.hp = Infinity;
    quiet.state.shots = [];
    quiet.step(1 / 60);
    if (quiet.state.breakNotice && quiet.state.enemySpell.nonspell) {
      naturalBreak = true;
      break;
    }
  }
  assert(
    naturalBreak,
    id + " must provide a musical nonspell transition without a damage capture"
  );
}
console.log(
  "PASS: measured timelines, eighteen spell phases, live laser warnings/collisions, bounded clear-to-score attraction, timed cards, repeatable pressure clear/refill/nonspell, expanded graze without hitbox changes, all eight movement directions."
);

// Intro is a real, pausable pre-combat phase and never consumes music time.
for (const id of Object.keys(engine.cast)) {
  const entry = engine.create("alice", id, 1977),
    start = { ...entry.state.boss };
  tick(entry, 1);
  assert(entry.state.boss.x < start.x);
  assert.equal(entry.state.time, 0);
  assert.equal(entry.state.score, 0);
  assert.equal(entry.state.shots.length, 0);
  assert.equal(entry.state.bullets.length, 0);
  assert(!entry.bomb());
  entry.pause();
  const frozen = JSON.stringify(entry.state);
  tick(entry, 1);
  assert.equal(JSON.stringify(entry.state), frozen);
  entry.resume();
  tick(entry, 1.5);
  assert(entry.state.intro);
  assert.equal(entry.state.time, 0);
  tick(entry, 0.2);
  assert(!entry.state.intro);
  assert(entry.state.countdown > 1.3);
  assert.equal(entry.state.boss.x, 120);
  tick(entry, 1.5);
  assert(entry.state.time > 0);
  assert(entry.state.shots.length > 0);
}
console.log(
  "PASS: enemy entry, paused entry resumes in place, countdown and combat clock separation."
);

// Seeking shots supplement aimed damage, including at maximum power.
for (const power of [1, 4, 8]) {
  const results = {};
  for (const id of Object.keys(engine.cast)) {
    results[id] = {};
    for (const aim of ["aligned", "offAxis"]) {
      const shotGame = engine.create(id, "alice", 1977),
        s = shotGame.state;
      s.countdown = 0;
      shotGame.step(1 / 60);
      s.power = power;
      s.player.invulnerable = Infinity;
      s.enemySpell.hp = 1e8;
      for (let f = 0; f < 600; f++) {
        s.player.x = aim === "aligned" ? s.boss.x : 16;
        s.items = [];
        shotGame.step(1 / 60, { focus: true });
      }
      results[id][aim] = (1e8 - s.enemySpell.hp) / 10;
      assert.equal(engine.options(s).length, Math.floor(power / 2));
      assert(s.shots.length <= 140);
    }
  }
  assert(
    results.patchouli.offAxis < results.patchouli.aligned * 0.25,
    "homing cannot replace aiming at P" + power
  );
  assert(
    results.patchouli.aligned < results.marisa.aligned,
    "Marisa retains the concentrated-damage advantage"
  );
}
const impactSounds = [],
  strike = engine.create("marisa", "alice", 4, (name) =>
    impactSounds.push(name)
  );
strike.state.countdown = 0;
strike.step(1 / 60);
strike.bomb();
tick(strike, 1.3);
assert.equal(
  impactSounds.filter((n) => n === "bomb_impact").length,
  7,
  "seven distinct staccato spell impacts"
);
assert(!strike.state.enemySpell.eligible);
// Wide Spark visuals and collision use the same taper, not a narrow hidden rectangle.
const cone = ready("marisa");
cone.state.player.x = 174;
cone.state.player.invulnerable = 0;
cone.state.lasers = [
  {
    x: 120,
    y: 54,
    angle: Math.PI / 2,
    width: 18,
    spread: 0.18,
    warning: 0.8,
    duration: 1,
    color: "#fff",
    sweep: 0,
    age: 0.81,
    fired: true,
  },
];
cone.step(1 / 60);
assert.equal(cone.state.lives, 2, "Spark widens along its path");
console.log(
  "PASS: P1/P4/P8 aim-dependent balance, child-unit counts, Bomb impact cadence, tapered laser collision."
);

// A completed recording stops at its exact boundary, with a safe continuation.
for (const enemy of Object.keys(engine.cast)) {
  const g = ready(enemy),
    s = g.state,
    D = engine.score.getTrack(enemy).duration;
  g.step(1 / 60);
  s.time = D - 0.005;
  s.score = 12000;
  s.power = 6;
  s.player.invulnerable = Infinity;
  s.bullets = [{ x: 40, y: 70, vx: 0, vy: 0, radius: 2.4 }];
  g.step(1 / 60);
  assert(s.intermission);
  assert.equal(s.time, D);
  assert(!g.bomb());
  assert(!g.nextRound());
  tick(g, 2);
  assert(s.intermission && s.scoreItems.length === 0);
  assert.equal(s.bullets.length, 0);
  assert.equal(s.shots.length, 0);
  const accrued = s.score;
  g.pause();
  const held = JSON.stringify(s);
  tick(g, 5);
  assert.equal(JSON.stringify(s), held);
  g.resume();
  g.waitForRound();
  assert.equal(s.intermission.remaining, 8);
  assert(g.nextRound());
  assert.equal(s.round, 2);
  assert.equal(s.score, accrued);
  assert.equal(s.power, 6);
  assert(!s.intro && s.countdown > 0);
  tick(g, 1.7);
  assert(s.time > D && !s.intermission);
  const auto = ready(enemy);
  auto.state.time = D - 0.005;
  auto.step(1 / 60);
  tick(auto, 9.9);
  assert.equal(auto.state.round, 2);
  assert(!auto.state.intro && auto.state.countdown > 0);
  assert.equal(auto.state.time, D);
  const finish = ready(enemy);
  finish.state.time = D - 0.005;
  finish.step(1 / 60);
  assert(finish.finish());
  assert.equal(finish.state.phase, "over");
}
console.log(
  "PASS: track-boundary rest, collection/boss stays, paused countdown, manual/idle continuation, cumulative score/power and end-run choice."
);

// Regression: laid stars may accelerate, but must never curl back into an orbit.
const stardust = ready("marisa");
stardust.state.player.invulnerable = Infinity;
let lowerStars = 0,
  peak = 0,
  trackedStars = 0;
const starTracks = new WeakMap();
for (let frame = 0; frame < 18 * 60; frame++) {
  stardust.state.enemySpell.hp = 1e9;
  stardust.state.items = [];
  stardust.step(1 / 60);
  peak = Math.max(peak, stardust.state.bullets.length);
  lowerStars = Math.max(
    lowerStars,
    stardust.state.bullets.filter(
      (b) => b.y > 230 && ["star", "bigstar"].includes(b.shape)
    ).length
  );
  for (const b of stardust.state.bullets) {
    const previous = starTracks.get(b);
    if (previous) {
      assert(
        Math.abs(b.vx * previous.vy - b.vy * previous.vx) < 1e-7 &&
          b.vx * previous.vx + b.vy * previous.vy > 0,
        "Stardust accelerates along its original ray"
      );
      const elapsed = b.age - previous.age;
      assert(
        Math.hypot(
          b.x - previous.x - b.vx * elapsed,
          b.y - previous.y - b.vy * elapsed
        ) < 1e-7,
        "each star must expand along its original ray"
      );
    } else trackedStars++;
    starTracks.set(b, { x: b.x, y: b.y, vx: b.vx, vy: b.vy, age: b.age });
  }
}
assert(
  lowerStars >= 6,
  "Stardust main lanes must travel downfield even at the introductory firing rate"
);
assert(
  trackedStars > 400,
  "track multiple complete volleys, not just a handful of escaping stars"
);
assert(peak < 650, "opening stars must not orbit forever and exhaust the pool");
console.log(
  "PASS: every Stardust projectile travels outward on a fixed ray; rotating volleys reach the player area without pool saturation."
);
