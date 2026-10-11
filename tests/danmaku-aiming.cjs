/* Moving-target regressions: preserve fixed fields and lock aimed volleys. */
const assert = require("node:assert/strict");
const patterns = require("../assets/js/games/danmaku-patterns.js");
const engine = require("../assets/js/games/danmaku-engine.js");

function emission(enemy, id, position, ticks = 64) {
  const s = engine.create("alice", enemy, 1977).state;
  s.enemySpell = { id, age: 2.2, nonspell: false };
  s.rhythm = { trackTime: 0, beatDuration: 0.4, energy: 0.6, cycle: 0 };
  const frames = [];
  for (let tick = 0; tick < ticks; tick++) {
    Object.assign(s.player, position(tick));
    s.enemySpell.age = 2.2 + tick * 0.2;
    s.boss = patterns.bossPosition(s) || s.boss;
    const frame = { bullets: [], lasers: [], boss: { ...s.boss } };
    const api = {
      bullet: (...args) => frame.bullets.push(args),
      laser: (...args) => frame.lasers.push(args),
    };
    patterns.emit(s, tick, api);
    for (let step = 0; step < 12; step++) {
      s.enemySpell.age = 2.2 + tick * 0.2 + step / 60;
      patterns.update(s, 1 / 60, api);
    }
    frames.push(frame);
  }
  return { frames, s };
}
const left = () => ({ x: 40, y: 312 });
const right = () => ({ x: 200, y: 312 });
const crosses = (tick) => (tick < 2 ? left() : right());
const near = (a, b, message) =>
  assert(Math.abs(a - b) < 1e-8, `${message}: ${a} ≠ ${b}`);
const aim = (b, p) => Math.atan2(p.y - b.y, p.x - b.x);

// These main patterns have fixed/random directions, not player tracking.
for (const [enemy, ids] of Object.entries({
  alice: ["france", "holland", "russia"],
  marisa: ["stardust", "milky", "asteroid"],
  patchouli: ["agni", "sylphy", "flare"],
})) {
  for (const id of ids)
    assert.deepEqual(
      emission(enemy, id, left).frames,
      emission(enemy, id, right).frames,
      `${id}: moving the player must not rotate a fixed pattern`
    );
}

// Master Spark opens downward; only subsequent beams acquire the new position.
const master = emission("marisa", "master", crosses);
near(master.frames[0].lasers[0][2], Math.PI / 2, "fixed opening Spark");
near(
  master.frames[24].lasers[0][2],
  aim(master.frames[24].boss, right()),
  "next Spark aims at the current player"
);
assert.deepEqual(
  emission("marisa", "master", left).frames.map((f) => f.bullets),
  emission("marisa", "master", right).frames.map((f) => f.bullets),
  "the Spark's radial star layer stays fixed"
);

const ndLeft = emission("marisa", "nondirectional", left),
  ndRight = emission("marisa", "nondirectional", right);
for (let tick = 0; tick < ndLeft.frames.length; tick++) {
  const l = ndLeft.frames[tick],
    r = ndRight.frames[tick];
  assert.deepEqual(l.lasers, r.lasers, "orbit lasers do not track the player");
  assert.deepEqual(
    l.bullets.filter((b) => b[5] === "bigstar"),
    r.bullets.filter((b) => b[5] === "bigstar"),
    "the inward lattice keeps its fixed geometry"
  );
  if (tick % 4 === 0) {
    const stars = r.bullets.filter((b) => b[5] === "star");
    assert(
      stars.every((b) => b[0] === r.boss.x && b[1] === r.boss.y),
      "aimed stars originate independently at the boss"
    );
    near(stars[1][2], aim(r.boss, right()), "boss star acquires current aim");
  }
}
const upward = emission("marisa", "finalspark", () => ({ x: 30, y: 28 }), 1);
assert(
  Math.sin(upward.frames[0].lasers[0][2]) < 0,
  "Final Spark can be lured above the boss, not clamped downward"
);
assert.deepEqual(
  emission("marisa", "finalspark", left).frames.map((f) => f.bullets),
  emission("marisa", "finalspark", right).frames.map((f) => f.bullets),
  "the Final Spark spiral does not become an aimed fan"
);

const water = emission("patchouli", "undine", crosses);
for (const tick of [0, 2, 4]) {
  const f = water.frames[tick];
  assert.equal(f.lasers.length, 3, "all three water laser pulses are present");
  near(
    f.lasers[1][2],
    aim(f.boss, crosses(tick)),
    "each pulse takes a fresh aim"
  );
}
const waterFan = water.frames[6].bullets;
assert.equal(waterFan.filter((b) => b[5] === "orb").length, 10);
assert.equal(waterFan.filter((b) => b[5] === "pellet").length, 2);
assert(
  waterFan.every(
    (b) => Math.abs(b[2] - aim(water.frames[6].boss, right())) > 0.09
  ),
  "even water fans leave their central aiming lane open"
);
assert(
  Math.abs(water.frames[12].boss.x - water.frames[6].boss.x) > 8,
  "the boss moves during the water stream, not only afterwards"
);

const earthBelow = emission("patchouli", "trilithon", right),
  earthAbove = emission("patchouli", "trilithon", () => ({ x: 200, y: 28 }));
for (let tick = 0; tick < earthBelow.frames.length; tick++) {
  const lower = earthBelow.frames[tick],
    upper = earthAbove.frames[tick];
  assert.deepEqual(
    lower.bullets,
    upper.bullets.filter((b) => b[4] === "#e8e58d"),
    "upper penalty must not replace or aim the random earth layer"
  );
  const penalty = upper.bullets.filter((b) => b[4] === "#8fa8ff");
  assert.equal(penalty.length, 7);
  near(
    penalty[3][2],
    aim(upper.boss, { x: 200, y: 28 }),
    "conditional blue penalty aims at the player above the boss"
  );
}

const forest = emission("patchouli", "sylphy", right, 1).frames[0];
const bloom = forest.bullets.filter((b) => b[0] < 240),
  sideWind = forest.bullets.filter((b) => b[0] > 240);
assert(
  bloom.some((b) => Math.cos(b[2]) > 0.5) &&
    bloom.some((b) => Math.sin(b[2]) < -0.5),
  "the boss opens a broad bloom before drifting with the wind"
);
assert(
  bloom.every((b) => b[6].redirect.duration >= 0.7),
  "the boss needles bend visibly instead of snapping into the corner"
);
assert(
  sideWind.every(
    (b) =>
      Math.cos(b[2]) < 0 &&
      Math.sin(b[2]) > 0 &&
      (!b[6] || b[6].redirect.angle === b[2])
  ),
  "the separate right-edge wind remains a straight down-left sheet"
);

const metals = emission("patchouli", "philosopher", left)
  .frames.flatMap((f) => f.bullets)
  .filter((b) => b[4] === "#e0dcec");
assert(metals.length > 22);
assert.equal(
  metals[0][6].redirect.aim,
  metals[21][6].redirect.aim,
  "one metal ring shares one aim latch"
);
assert.notEqual(
  metals[0][6].redirect.aim,
  metals[22][6].redirect.aim,
  "separate metal rings have independent aim latches"
);

// The metal ring shares one late snapshot. Every member keeps its separation
// after turning, even if the player moves again before another member updates.
const latch = { x: 120, y: 60 };
const redirect = {
  at: 1,
  angle: Math.PI / 2,
  speed: 60,
  aim: latch,
};
const ring = [0, Math.PI / 2, Math.PI, (Math.PI * 3) / 2].map((angle) => ({
  x: 120 + Math.cos(angle) * 16,
  y: 60 + Math.sin(angle) * 16,
  vx: 0,
  vy: 0,
  age: 0,
  motion: { redirect },
}));
for (let frame = 0; frame < 59; frame++)
  ring.forEach((b) => patterns.advanceBullet(b, 1 / 60, () => {}, left()));
assert.equal(latch.angle, undefined, "do not aim during the expansion/pause");
patterns.advanceBullet(ring[0], 1 / 60, () => {}, right());
const expected = aim(latch, right());
near(latch.angle, expected, "acquire at the turn, not at spawn");
for (const b of ring.slice(1))
  patterns.advanceBullet(b, 1 / 60, () => {}, left());
for (let frame = 0; frame < 60; frame++)
  ring.forEach((b) => patterns.advanceBullet(b, 1 / 60, () => {}, left()));
for (const b of ring) {
  near(Math.atan2(b.vy, b.vx), expected, "parallel formation, no homing");
  near(Math.hypot(b.vx, b.vy), 60, "turn does not alter formation speed");
}
near(
  Math.hypot(ring[0].x - ring[2].x, ring[0].y - ring[2].y),
  32,
  "opposite members retain the ring diameter"
);

// Per-volley latch state must never leak into a later white ring.
const next = {
  x: 120,
  y: 60,
  vx: 0,
  vy: 0,
  age: 0.99,
  motion: { redirect: { ...redirect, aim: { x: 120, y: 60 } } },
};
patterns.advanceBullet(next, 1 / 60, () => {}, left());
near(
  Math.atan2(next.vy, next.vx),
  aim(next.motion.redirect.aim, left()),
  "the next formation retargets independently"
);

const wind = {
  x: 120,
  y: 60,
  vx: 0,
  vy: -30,
  age: 0,
  motion: { redirect: { at: 0.4, duration: 0.8, angle: 2.1, speed: 50 } },
};
let lastHeading = -Math.PI / 2;
for (let frame = 0; frame < 120; frame++) {
  patterns.advanceBullet(wind, 1 / 60, () => {});
  const heading = Math.atan2(wind.vy, wind.vx);
  const difference = Math.atan2(
    Math.sin(heading - lastHeading),
    Math.cos(heading - lastHeading)
  );
  assert(
    Math.abs(difference) < 0.09,
    "wind bends continuously, without a corner"
  );
  if (frame < 24) assert(wind.vy < 0, "initial spread precedes the wind");
  lastHeading = heading;
}
near(lastHeading, 2.1, "wind settles into the specified direction");
near(Math.hypot(wind.vx, wind.vy), 50, "wind settles at its travel speed");

// Secondary layers must survive the actual scheduler and engine pool limits.
const originalEmit = patterns.emit;
let attempted = 0,
  admitted = 0;
const dropped = [];
patterns.emit = function (s, tick, api) {
  return originalEmit(s, tick, {
    ...api,
    laser(...args) {
      const before = s.lasers.length;
      attempted++;
      api.laser(...args);
      admitted += s.lasers.length - before;
      if (s.lasers.length === before)
        dropped.push(`${s.enemyId}/${s.enemySpell.id}@${s.time.toFixed(2)}`);
    },
  });
};
try {
  for (const enemy of Object.keys(engine.cast)) {
    const g = engine.create("alice", enemy, 1977),
      s = g.state;
    s.countdown = 0;
    s.intro = null;
    s.player.invulnerable = Infinity;
    const duration = engine.score.getTrack(enemy).duration;
    for (let frame = 0; frame < duration * 60; frame++) {
      s.shots = [];
      s.items = [];
      s.enemySpell.hp = Infinity;
      g.step(1 / 60);
    }
  }
} finally {
  patterns.emit = originalEmit;
}
assert(attempted > 100, "exercise repeated laser cycles across all recordings");
assert.equal(
  admitted,
  attempted,
  "no secondary laser sources lost to the pool cap: " + dropped.join(", ")
);
// Average occupancy concealed a large untouched lower-right wedge. Probe
// real collision cores over the whole wind card, at both opening and high rank.
for (const cycle of [0, 6]) {
  const g = engine.create("alice", "patchouli", 1977),
    s = g.state;
  const track = engine.score.getTrack("patchouli"),
    phrase =
      track.phrases[
        patterns.cards.patchouli.findIndex((c) => c.id === "sylphy")
      ],
    offset = cycle * track.duration;
  s.countdown = 0;
  s.intro = null;
  s.time = offset + phrase.start;
  s.player.invulnerable = Infinity;
  const points = [192, 216, 228].flatMap((x) =>
    [304, 324, 344].map((y) => ({ x, y, hits: 0, windows: new Set() }))
  );
  while (s.time < offset + phrase.spellEnd) {
    s.shots = [];
    s.items = [];
    s.enemySpell.hp = Infinity;
    g.step(1 / 60);
    if (s.enemySpell.age < 3 || s.enemySpell.nonspell) continue;
    for (const p of points) {
      if (
        s.bullets.some(
          (b) => Math.hypot(b.x - p.x, b.y - p.y) < b.radius + s.player.radius
        )
      ) {
        p.hits++;
        p.windows.add(Math.floor((s.enemySpell.age - 3) / 6));
      }
    }
  }
  for (const p of points)
    assert(
      p.hits >= 3 && p.windows.size >= 2,
      `Sylphy round ${cycle + 1}: (${p.x},${p.y}) must not remain a camping pocket`
    );
}
console.log(
  "PASS: fixed fields, moving targets, late shared aim, gradual wind, nine lower-right camping probes, complete full-track laser emissions."
);
