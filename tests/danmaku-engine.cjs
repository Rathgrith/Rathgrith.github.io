const assert = require("node:assert/strict");
const engine = require("../assets/js/games/danmaku-engine.js");
function tick(game, seconds, input) {
  for (let i = 0; i < seconds * 60; i++) game.step(1 / 60, input);
}
function ready(player = "alice", enemy = "alice") {
  const g = engine.create(player, enemy, 1977);
  g.state.countdown = 0;
  g.state.player.invulnerable = 0;
  return g;
}
for (const player of Object.keys(engine.cast))
  for (const enemy of Object.keys(engine.cast)) {
    const g = ready(player, enemy);
    g.state.player.invulnerable = Infinity;
    tick(g, 120);
    assert.equal(g.state.phase, "playing");
    assert(g.state.hits > 30 && g.state.score > 3000);
    assert(
      g.state.bullets.length <= 720 &&
        g.state.shots.length <= 140 &&
        g.state.sparks.length <= 64
    );
    assert.equal(g.state.lives, Math.min(5, 3 + g.state.pickups.life));
    assert(
      g.state.items.length <= 12 && g.state.power >= 1 && g.state.power <= 8
    );
    assert(!("health" in g.state.boss), "Boss is a permanent score target");
    assert(g.state.level >= 6);
    const late = ready(player, enemy),
      early = ready(player, enemy);
    const track = engine.score.getTrack(enemy);
    early.state.time = track.beats[16];
    late.state.time = track.duration * 6 + track.beats[16]; // Same card and beat, later difficulty.
    early.state.player.invulnerable = late.state.player.invulnerable = Infinity;
    tick(early, 4.5);
    tick(late, 4.5);
    // Compare sixteen beats, covering alternating/syncopated firing intervals.
    function volley(g) {
      const bullets = [];
      for (let tick = 0; tick < 32; tick++)
        require("../assets/js/games/danmaku-patterns.js").emit(g.state, tick, {
          bullet: (...b) => bullets.push(b),
          laser: () => {},
        });
      return bullets;
    }
    const earlyVolley = volley(early),
      lateVolley = volley(late);
    assert(
      lateVolley.length > earlyVolley.length,
      "Later volleys must be denser"
    );
    assert(
      lateVolley[0][3] > earlyVolley[0][3],
      "Later volleys must move faster"
    );
  }
const alice = ready("alice"),
  marisa = ready("marisa"),
  patchouli = ready("patchouli");
[alice, marisa, patchouli].forEach((g) => g.step(1 / 60));
assert.equal(alice.state.shots.length, 4);
assert(alice.state.shots.some((s) => Math.abs(s.vx) > 50));
assert.equal(marisa.state.shots.length, 2);
assert(marisa.state.shots.every((s) => s.vx === 0 && !s.homing));
assert(patchouli.state.shots.some((s) => s.homing));
assert(patchouli.state.shots.some((s) => !s.homing));
assert(
  patchouli.state.shots.filter((s) => s.homing).every((s) => s.damage < 0.4)
);
const shot = {
  x: 120,
  y: 312,
  vx: 0,
  vy: 0,
  radius: 2.4,
  shape: "orb",
  color: "#fff",
};
const g = ready();
g.state.bullets.push({ ...shot, x: 131 });
g.step(1 / 60);
assert.equal(g.state.grazes, 1);
tick(g, 0.1);
assert.equal(g.state.grazes, 1, "One graze per bullet");
g.state.bullets.push({ ...shot });
g.step(1 / 60);
assert.equal(g.state.lives, 2);
g.state.bullets.push({ ...shot });
g.step(1 / 60);
assert.equal(g.state.lives, 2, "Recovery shield prevents stacked hits");
for (let i = 0; i < 2; i++) {
  g.state.player.invulnerable = 0;
  g.state.bullets.push({ ...shot });
  g.step(1 / 60);
}
assert.equal(g.state.phase, "over");
const finalScore = g.state.score;
tick(g, 2);
assert.equal(g.state.score, finalScore);
const bomb = ready();
bomb.state.bullets.push({ ...shot });
assert(bomb.bomb());
assert.equal(bomb.state.bullets.length, 0);
assert.equal(bomb.state.bombs, 1);
assert(bomb.state.player.invulnerable > 2);
assert.equal(bomb.state.spell.id, "alice");
assert(!bomb.bomb(), "Holding X cannot consume both charges together");
tick(bomb, 0.5);
assert.equal(bomb.state.bullets.length, 0, "Opening pulse clears fresh waves");
assert(bomb.state.spell.age > 0.49);
tick(bomb, 1.2);
assert.equal(bomb.state.spell, null, "The visible spell expires after 1.6s");
assert(bomb.bomb());
assert(!bomb.bomb());
bomb.pause();
const snapshot = JSON.stringify(bomb.state);
tick(bomb, 1);
assert.equal(JSON.stringify(bomb.state), snapshot);
assert(!bomb.bomb());
bomb.resume();
assert(bomb.state.countdown > 0);
const spellAge = bomb.state.spell.age,
  scrollAtPause = bomb.state.scroll;
tick(bomb, 0.5);
assert.equal(bomb.state.spell.age, spellAge);
assert.equal(
  bomb.state.scroll,
  scrollAtPause,
  "Resume countdown freezes the scenery too"
);
for (const enemy of Object.keys(engine.cast)) {
  const ramp = ready("marisa", enemy);
  ramp.state.player.invulnerable = Infinity;
  tick(ramp, 5);
  assert(ramp.state.wave >= 7, "Opening waves should already apply pressure");
  const speeds = [];
  for (const t of [0, 30, 60, 120, 300]) {
    ramp.state.time = t;
    tick(ramp, 3);
    speeds.push(ramp.state.scrollSpeed);
  }
  assert(
    speeds.every((speed) => speed > 85 && speed <= 270),
    "Forward-flight scenery remains bounded"
  );
  assert(
    speeds.at(-1) > speeds[0] + 5,
    "Later combat gains pace while music can modulate it"
  );
  assert(
    Math.max(...speeds) - Math.min(...speeds) > 5,
    "Scrolling adapts during combat"
  );
  ramp.pause();
  const distance = ramp.state.scroll;
  tick(ramp, 10);
  assert.equal(ramp.state.scroll, distance);
}
const diagonal = ready(),
  horizontal = ready(),
  slow = ready();
[diagonal, horizontal, slow].forEach((g) => {
  g.state.player.x = 100;
  g.state.player.y = 200;
});
tick(diagonal, 0.2, { x: 1, y: 1 });
tick(horizontal, 0.2, { x: 1 });
tick(slow, 0.2, { x: 1, focus: true });
assert(
  Math.abs(
    Math.hypot(diagonal.state.player.x - 100, diagonal.state.player.y - 200) -
      (horizontal.state.player.x - 100)
  ) < 0.001
);
assert(slow.state.player.x < horizontal.state.player.x);
tick(diagonal, 4, { target: { x: 9999, y: -999 } });
assert.equal(diagonal.state.player.x, 231);
assert.equal(diagonal.state.player.y, 28);

function item(type, x, y) {
  return { type, x, y, vx: 0, vy: 0, age: 0 };
}
// Pickups affect live combat, obey caps and cannot skip pause/countdown rules.
const loot = ready();
loot.state.items.push(item("power", 120, 312));
loot.step(1 / 60);
assert.equal(loot.state.power, 2);
assert.equal(loot.state.pickups.power, 1);
assert.equal(loot.state.items.length, 0);
for (let i = 0; i < 8; i++) {
  loot.state.items.push(
    item("power", 120, 312),
    item("life", 120, 312),
    item("clear", 120, 312)
  );
  loot.step(1 / 60);
}
assert.deepEqual(
  [loot.state.power, loot.state.lives, loot.state.bombs],
  [8, 5, 5]
);
loot.state.bullets.push({ ...shot, x: 18, y: 150 });
loot.state.player.invulnerable = 0;
loot.state.items.push(item("clear", 120, 312));
loot.step(1 / 60);
assert.equal(
  loot.state.bullets.length,
  1,
  "B replenishes stock without cancelling bullets"
);
assert.equal(loot.state.player.invulnerable, 0, "B grants no invulnerability");
assert.equal(loot.state.scoreItems.length, 0);
loot.pause();
const lootSnapshot = JSON.stringify(loot.state);
tick(loot, 1);
assert.equal(JSON.stringify(loot.state), lootSnapshot);
loot.resume();
const noticeAge = loot.state.pickupNotice.age;
tick(loot, 0.5);
assert.equal(loot.state.pickupNotice.age, noticeAge);
loot.state.countdown = 0;
tick(loot, 1.2);
assert.equal(loot.state.pickupNotice, null);
loot.state.player.invulnerable = 0;
loot.state.bullets.push({ ...shot });
loot.step(1 / 60);
assert.equal(loot.state.power, 7, "A hit costs one firepower level");
const missed = ready();
missed.state.items.push(item("life", 16, 374));
missed.step(1 / 60);
assert.equal(missed.state.items.length, 0, "Uncollected items leave the arena");
for (const id of Object.keys(engine.cast)) {
  const normal = ready(id),
    powered = ready(id);
  powered.state.power = 8;
  normal.state.player.invulnerable = powered.state.player.invulnerable =
    Infinity;
  tick(normal, 4);
  tick(powered, 4);
  assert(
    powered.state.hits > normal.state.hits &&
      powered.state.score > normal.state.score,
    `${id}: power must produce more real hits and score`
  );
}
const dropTypes = new Set(),
  dropPositions = new Set();
for (let seed = 1; seed <= 40; seed++) {
  const sampleSeed = Math.imul(seed, 0x9e3779b9) >>> 0;
  const a = engine.create("alice", "alice", sampleSeed),
    b = engine.create("alice", "alice", sampleSeed);
  a.state.countdown = b.state.countdown = 0;
  a.state.player.invulnerable = b.state.player.invulnerable = Infinity;
  tick(a, 5.1);
  tick(b, 5.1);
  assert.deepEqual(
    a.state.items,
    b.state.items,
    "Explicit seeds reproduce drops"
  );
  assert(a.state.items.length > 0);
  a.state.items.forEach((i) => {
    dropTypes.add(i.type);
    dropPositions.add(i.x);
  });
}
assert.deepEqual([...dropTypes].sort(), ["clear", "life", "power"]);
assert(dropPositions.size > 20, "New run seeds vary the drop position");

// The pilot uses normal movement/collision rules and hands control back immediately.
const pilot = ready();
pilot.state.bombs = 0;
pilot.state.bullets.push({ ...shot, y: 265, vy: 110 });
pilot.setAuto(true);
tick(pilot, 1);
assert.equal(pilot.state.lives, 3);
assert(Math.hypot(pilot.state.player.x - 120, pilot.state.player.y - 312) > 10);
assert.equal(
  pilot.state.player.invulnerable,
  0,
  "Auto grants no hidden protection"
);
pilot.setAuto(false);
assert.equal(
  pilot.state.assisted,
  true,
  "Disabling auto cannot relabel the run as manual"
);
const manualX = pilot.state.player.x;
tick(pilot, 0.1, { x: -1 });
assert(pilot.state.player.x < manualX);
const collector = ready();
collector.state.items.push(item("power", 175, 295));
collector.setAuto(true);
tick(collector, 1.5);
assert(collector.state.pickups.power > 0, "Auto collects a safe nearby drop");
const escape = ready();
escape.state.bullets.push({ ...shot });
escape.setAuto(true);
escape.step(1 / 60);
assert.equal(
  escape.state.bombs,
  1,
  "An unavoidable close threat triggers a spirit strike"
);
assert.equal(escape.state.lives, 3);
console.log(
  "PASS: nine matchups, bounded density/scroll, power shots, seeded random drops, pickup effects/caps, auto dodge/collection/strike/takeover, collisions and pause/countdown freeze"
);
// Sound hooks report actual simulation events and cannot affect deterministic play.
const sounds = [];
const audible = engine.create("marisa", "alice", 1977, (name, player) =>
  sounds.push([name, player])
);
const silent = engine.create("marisa", "alice", 1977);
for (const game of [audible, silent]) {
  game.state.player.invulnerable = 999;
  tick(game, 6);
}
assert.deepEqual(audible.state, silent.state);
assert(sounds.some(([name]) => name === "ready"));
assert(sounds.some(([name]) => name === "shot"));
assert(
  sounds
    .filter(([name]) => name !== "spell")
    .every(([, player]) => player === "marisa")
);
function soundScenario(setup, expected) {
  const events = [];
  const game = engine.create("alice", "patchouli", 4, (name) =>
    events.push(name)
  );
  game.state.countdown = 0;
  game.state.player.invulnerable = 0;
  setup(game);
  game.step(1 / 60);
  assert(events.includes(expected), `${expected}: ${events}`);
}
soundScenario(
  (game) =>
    game.state.shots.push({
      x: 120,
      y: 54,
      vx: 0,
      vy: 0,
      damage: 1,
      color: "#fff",
    }),
  "hit"
);
soundScenario((game) => game.state.bullets.push({ ...shot, x: 131 }), "graze");
soundScenario((game) => game.state.bullets.push({ ...shot }), "death");
for (const type of ["power", "life", "clear"])
  soundScenario(
    (game) =>
      game.state.items.push({ type, x: 120, y: 312, vx: 0, vy: 0, age: 0 }),
    type
  );
soundScenario((game) => game.bomb(), "bomb");
const brokenSound = engine.create("alice", "marisa", 5, () => {
  throw new Error("audio unavailable");
});
tick(brokenSound, 6);
assert(brokenSound.state.score > 0);
console.log(
  "PASS: deterministic event sound hooks, pickups/graze/hit/spell/countdown and device-failure isolation"
);
