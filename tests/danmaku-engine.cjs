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
        g.state.shots.length < 100 &&
        g.state.sparks.length <= 64
    );
    assert.equal(g.state.lives, 3);
    assert(!("health" in g.state.boss), "Boss is a permanent score target");
    assert(g.state.level >= 6);
    const late = ready(player, enemy),
      early = ready(player, enemy);
    late.state.time = 180;
    tick(early, 0.6);
    tick(late, 0.6);
    assert(
      late.state.bullets.length > early.state.bullets.length,
      "Later waves must be denser"
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
assert(patchouli.state.shots.every((s) => s.homing));
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
    ramp.step(1 / 60);
    speeds.push(ramp.state.scrollSpeed);
  }
  assert(
    speeds[0] < speeds[1] && speeds[1] < speeds[2] && speeds[2] < speeds[3]
  );
  assert.equal(speeds[3], 88);
  assert.equal(speeds[4], 88, "Scrolling speed has a comfortable upper bound");
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
console.log(
  "PASS: nine matchups, stronger density ramp, accelerating bounded scroll, shot types, scoring, collisions, timed spells, pause/countdown freeze and movement"
);
