/* Reference structures and lifecycles, independent of musical phrase offset. */
const assert = require("node:assert/strict");
const patterns = require("../assets/js/games/danmaku-patterns.js");
const engine = require("../assets/js/games/danmaku-engine.js");
function emission(enemy, id, ticks = 64, offset = 0) {
  const s = engine.create("alice", enemy, 1977).state;
  s.enemySpell = { id, age: 2.2, nonspell: false };
  s.rhythm = { trackTime: 0, beatDuration: 0.4, energy: 0.6, cycle: 0 };
  const bullets = [],
    lasers = [];
  for (let tick = 0; tick < ticks; tick++) {
    s.enemySpell.age = 2.2 + tick * 0.2;
    s.boss = patterns.bossPosition(s) || s.boss;
    patterns.emit(s, tick + offset, {
      bullet: (...args) => bullets.push(args),
      laser: (...args) => lasers.push(args),
    });
  }
  return { s, bullets, lasers };
}
function motion(a) {
  return {
    x: a[0],
    y: a[1],
    vx: Math.cos(a[2]) * a[3],
    vy: Math.sin(a[2]) * a[3],
    motion: a[6],
    age: 0,
    curve: a[6]?.turn || 0,
    curveDecay: a[6]?.decay || 0,
  };
}
function splitOnce(a) {
  const parent = motion(a),
    children = [];
  let alive = true;
  for (let i = 0; i < 120 && alive; i++)
    alive = patterns.advanceBullet(parent, 1 / 60, (...a) => children.push(a));
  assert(!alive, "split consumes the parent once");
  return children;
}
const france = emission("alice", "france", 1);
assert.equal(france.bullets.length, 6);
const children = splitOnce(france.bullets[0]);
assert.equal(children.length, 7);
assert(
  children.every((b) => b[4] === "#f0eefb"),
  "white intermediate scales"
);
assert(
  children.every((b) => Math.cos(b[2] - france.bullets[0][2]) < -0.8),
  "the short intermediate arc folds inward instead of another outward ring"
);
assert.equal(children.flatMap(splitOnce).length, 49, "France 1→7→49 genealogy");
const london = emission("alice", "london");
assert.equal(patterns.emitters(london.s).length, 7);
assert.equal(
  new Set(london.bullets.map((b) => b[4])).size,
  4,
  "green/blue then yellow/cyan"
);
assert.equal(
  new Set(emission("alice", "holland").bullets.map((b) => b[4])).size,
  2
);
assert.equal(
  new Set(emission("alice", "russia").bullets.map((b) => b[0] < 120)).size,
  2
);
const shanghai = emission("alice", "shanghai");
assert.equal(
  patterns.emitters(shanghai.s).length,
  4,
  "four actual doll origins"
);
assert.equal(shanghai.lasers.length, 0);
assert(
  shanghai.bullets.some((b) => b[5] === "darkorb") &&
    shanghai.bullets.some((b) => b[5] === "scale")
);
assert.equal(
  new Set(emission("alice", "tibet").bullets.map((b) => b[4])).size,
  4
);
const stardust = emission("marisa", "stardust");
assert.equal(patterns.emitters(stardust.s).length, 7);
assert(stardust.bullets.every((b) => b[6]?.release && !b[6]?.turn));
const star = motion(stardust.bullets[0]),
  origin = { ...star };
for (let i = 0; i < 300; i++) patterns.advanceBullet(star, 1 / 60, () => {});
assert(
  Math.hypot(star.x - origin.x, star.y - origin.y) > 100,
  "laid stars leave instead of orbiting forever"
);
assert.equal(
  emission("marisa", "milky", 1).bullets.filter((b) => b[5] === "bigstar")
    .length,
  9
);
assert.equal(
  emission("marisa", "asteroid", 1).bullets.filter((b) => b[5] === "bigstar")
    .length,
  17
);
const nd = emission("marisa", "nondirectional", 1);
assert.equal(
  patterns.emitters(nd.s).length,
  10,
  "two complete familiar groups"
);
assert.equal(nd.lasers.length, 5);
assert(nd.lasers.every((l) => l[8]?.kind === "orbit"));
const ndCycle = emission("marisa", "nondirectional", 12);
assert.equal(ndCycle.lasers.length, 10);
assert.equal(
  new Set(ndCycle.lasers.map((l) => Math.sign(l[8].rate))).size,
  2,
  "both counter-rotating groups fire in one cycle"
);
assert(
  nd.bullets.some(
    (b) =>
      Math.cos(b[2]) * (b[0] - nd.s.boss.x) +
        Math.sin(b[2]) * (b[1] - nd.s.boss.y) <
      0
  )
);
const master = emission("marisa", "master", 1);
assert.equal(master.bullets.length, 11);
assert(
  master.bullets.some((b) => Math.sin(b[2]) < -0.5),
  "Master uses a full circle"
);
assert.equal(master.lasers[0][2], Math.PI / 2);
assert.equal(emission("marisa", "finalspark", 24).bullets.length, 36 * 8);
const agni = emission("patchouli", "agni");
assert.equal(patterns.emitters(agni.s).length, 0);
assert(agni.bullets.every((b) => b[0] === 120 && b[6]?.decay > 0));
const undine = emission("patchouli", "undine");
assert.equal(
  undine.lasers.length,
  18,
  "three repeated three-way pulses per cycle"
);
assert(
  undine.bullets.some((b) => b[5] === "pellet") &&
    undine.bullets.some((b) => b[5] === "orb")
);
const earth = motion(emission("patchouli", "trilithon", 1).bullets[0]);
let last = Infinity,
  stopped = false;
for (let i = 0; i < 72; i++) {
  patterns.advanceBullet(earth, 1 / 60, () => {});
  const speed = Math.hypot(earth.vx, earth.vy);
  if (earth.age > 0.25 && earth.age < 1) assert(speed <= last + 0.001);
  if (earth.age > 1 && earth.age < 1.18) {
    assert(speed < 0.001);
    stopped = true;
  }
  last = speed;
}
assert(stopped, "earth bullets pause before changing course");
for (let i = 0; i < 60; i++) patterns.advanceBullet(earth, 1 / 60, () => {});
assert(earth.redirected && Math.hypot(earth.vx, earth.vy) > 20);
const sylphy = emission("patchouli", "sylphy");
assert(sylphy.bullets.some((b) => b[0] > 240 && Math.cos(b[2]) < 0));
assert(
  !sylphy.bullets.some((b) => b[0] < 0),
  "Normal has no mirrored left-edge stream"
);
const sage = emission("patchouli", "philosopher");
assert(sage.bullets.every((b) => b[5] === "rice"));
assert.equal(new Set(sage.bullets.map((b) => b[4])).size, 5);
assert.deepEqual(
  patterns.emitters({
    ...sage.s,
    enemySpell: { ...sage.s.enemySpell, age: 3 },
  }),
  patterns.emitters(sage.s),
  "fixed stone bank"
);
for (const [enemy, cards] of Object.entries(patterns.cards))
  for (const { id } of cards) {
    const a = emission(enemy, id),
      b = emission(enemy, id, 64, 153);
    assert.deepEqual(
      a.bullets,
      b.bullets,
      id + ": opening independent of song offset"
    );
    assert.deepEqual(a.lasers, b.lasers);
    assert(
      a.bullets.length > 0 &&
        a.bullets.every((b) => b.slice(0, 4).every(Number.isFinite)),
      id
    );
  }
const g = engine.create("alice", "alice", 1977);
g.state.countdown = 0;
g.step(1 / 60);
g.state.bullets = [
  { ...motion(france.bullets[0]), radius: 2, color: "#abc", shape: "scale" },
];
g.bomb();
for (let i = 0; i < 60; i++) g.step(1 / 60);
assert(
  !g.state.bullets.some((b) => b.color === "#abc"),
  "cancelled parent has no delayed children"
);
const transition = engine.create("alice", "marisa", 1977);
transition.state.countdown = 0;
transition.state.intro = null;
transition.state.player.invulnerable = Infinity;
for (let i = 0; i < 180; i++) transition.step(1 / 60);
const beforeTransition = transition.state.boss.y;
assert(beforeTransition > 130);
transition.state.enemySpell.nonspell = true;
transition.step(1 / 60);
assert(
  Math.abs(transition.state.boss.y - beforeTransition) < 12,
  "leaving the lower Stardust position must not teleport the boss"
);
console.log(
  "PASS: 18 original-pattern structures, nested split/cancel, star release, radial counts, moving lasers, water sequence, deceleration/redirect, elemental bank, phrase offset."
);
