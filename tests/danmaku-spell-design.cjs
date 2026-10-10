/* Mechanics that distinguish the original motifs, not just their colours. */
const assert = require("node:assert/strict");
const patterns = require("../assets/js/games/danmaku-patterns.js");
const engine = require("../assets/js/games/danmaku-engine.js");
function emission(enemy, id, ticks = 64) {
  const s = engine.create("alice", enemy, 1977).state;
  s.enemySpell = { id, age: 6, nonspell: false };
  s.rhythm = { trackTime: 6, beatDuration: 0.4, energy: 0.6, cycle: 0 };
  const bullets = [],
    lasers = [];
  for (let tick = 0; tick < ticks; tick++)
    patterns.emit(s, tick, {
      bullet: (...args) => bullets.push(args),
      laser: (...args) => lasers.push(args),
    });
  return { s, bullets, lasers };
}
function motion(args) {
  return {
    x: args[0],
    y: args[1],
    vx: Math.cos(args[2]) * args[3],
    vy: Math.sin(args[2]) * args[3],
    motion: args[6],
    age: 0,
  };
}
const france = emission("alice", "france"),
  parent = motion(france.bullets[0]),
  children = [];
let alive = true;
for (let f = 0; f < 60 && alive; f++)
  alive = patterns.advanceBullet(parent, 1 / 60, (...a) => children.push(a));
assert(
  !alive && children.length === 5,
  "France scale actually divides once in flight"
);
assert(
  children.every((c) => c[1] > parent.motion.split.at * 10),
  "split happens away from the doll"
);
assert.equal(
  emission("alice", "shanghai").lasers.length,
  0,
  "PCB Shanghai uses scale necklaces, not fighting-game lasers"
);
assert(emission("alice", "shanghai").bullets.every((b) => b[5] === "scale"));
assert(
  new Set(emission("alice", "russia").bullets.map((b) => b[0])).size >= 2,
  "Russia attacks from opposite banks"
);
const stars = emission("marisa", "stardust");
assert(
  stars.bullets.every((b) => b[6]?.release && !b[6]?.turn),
  "laid stars release rather than orbit indefinitely"
);
const star = motion(stars.bullets[0]),
  origin = { x: star.x, y: star.y };
for (let f = 0; f < 180; f++) patterns.advanceBullet(star, 1 / 60, () => {});
assert(
  Math.hypot(star.x - origin.x, star.y - origin.y) > 120,
  "stardust spreads into the playfield"
);
const nd = emission("marisa", "nondirectional");
assert(
  nd.lasers.length &&
    nd.lasers.every(
      (l) => Math.hypot(l[0] - nd.s.boss.x, l[1] - nd.s.boss.y) > 30
    ),
  "ND lasers originate from deployed familiars"
);
const undine = emission("patchouli", "undine");
assert(
  undine.lasers.length && undine.bullets.some((b) => b[5] === "bubble"),
  "water pairs aimed lasers with bubbles"
);
const earth = motion(emission("patchouli", "trilithon").bullets[0]);
const before = earth.vx;
for (let f = 0; f < 240; f++) patterns.advanceBullet(earth, 1 / 60, () => {});
assert(
  earth.redirected && Math.abs(earth.vx - before) > 20,
  "earth bends in the lower arena"
);
const sage = emission("patchouli", "philosopher");
assert(
  new Set(sage.bullets.filter((b) => b[6]?.redirect).map((b) => b[5])).size ===
    3,
  "three elemental redirect laws plus fire rings and aimed water"
);
assert(
  sage.bullets.some((b) => b[5] === "flame") &&
    sage.bullets.some((b) => b[5] === "bubble")
);
// Cancellation removes a splitting parent before its timer, without any ghosts.
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
  "cancelled parents cannot split later"
);
console.log(
  "PASS: split/cancel lifecycle, necklaces, two-sided dolls, releasing stars, familiar lasers, water mix, earth turns and five elemental behaviours."
);
