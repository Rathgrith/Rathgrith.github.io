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
  const guarded = new Set(), vulnerable = new Set();
  let beams = 0;
  for (let i = 0; i < track.duration * 60; i++) {
    g.state.enemySpell.hp = Infinity;
    g.step(1 / 60);
    seen.add(g.state.enemySpell.id);
    const card = g.state.enemySpell;
    if (!card.nonspell && !g.state.intermission) {
      const age = g.state.time - g.state.rhythm.sectionStart;
      (age < 10 ? guarded : vulnerable).add(card.id);
      assert(Math.abs(card.guardRemaining - Math.max(0, 10 - age)) < 1e-8);
    }
    beams = Math.max(beams, g.state.lasers.length);
    assert(
      g.state.bullets.length <= 720 &&
        g.state.lasers.length <= 12 &&
        g.state.scoreItems.length <= 720
    );
  }
  assert.equal(seen.size, 6, id + " must reach six distinct cards");
  assert.deepEqual(guarded, seen, "each declaration starts a fresh guard");
  assert.deepEqual(vulnerable, seen, "each spell leaves a playable vulnerable interval");
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
const originalBar = capture.state.enemySpell.maxHp;
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
capture.state.time = 9.96;
emptyBar(capture);
assert.equal(capture.state.enemySpell.hp, 1);
assert.equal(capture.state.enemySpell.clears, 0);
assert(capture.state.hits > 0 && capture.state.impacts.length > 0,
  "a guarded boss still registers weapon contacts");
const guardedAt = capture.state.enemySpell.guardRemaining;
capture.pause();
tick(capture, 1);
capture.resume();
tick(capture, 0.5);
assert.equal(capture.state.enemySpell.guardRemaining, guardedAt,
  "pause and its resume countdown preserve the remaining protection");
capture.state.countdown = 0;
capture.state.time = 9.99;
emptyBar(capture);
assert(!capture.state.enemySpell.nonspell && !capture.state.breakNotice);
assert.equal(capture.state.enemySpell.clears, 1);
assert.equal(capture.state.enemySpell.maxHp, originalBar * 2);
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
assert.equal(capture.state.enemySpell.maxHp, originalBar * 4);
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
bombed.state.enemySpell.hp = 1;
bombed.state.foes.push({kind: "scout", x: 30, lane: 30, y: 100, hp: 1, maxHp: 1,
  radius: 7, offset: 0, salvos: 0, age: 0});
bombed.bomb();
tick(bombed, 0.3);
assert.equal(bombed.state.enemySpell.hp, 1, "bomb pulses cannot break the opening guard");
assert.equal(bombed.state.run.kills, 1, "the guard only protects the boss");
bombed.state.time = 10;
tick(bombed, 0.3);
assert.equal(bombed.state.enemySpell.clears, 1, "later pulses can break the unlocked bar");
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
  assert.equal(entry.state.weapon.dolls.length, 2, "Her two knights enter formation with combat");
}
console.log(
  "PASS: enemy entry, paused entry resumes in place, countdown and combat clock separation."
);

// The same weapons service real stage targets and both duel fields. Exercise
// their hit callbacks with controlled formations so movement cannot mask a miss.
function firingRange(id, targets, power = 1) {
  const field = { player: { x: 120, y: 300 }, shots: [], focus: false, weapon: engine.newWeapon() };
  const hits = new Map();
  function frame(fire = true) {
    engine.stepWeapons(field, id, power, 1 / 60, fire, targets, (t, damage) => {
      hits.set(t, (hits.get(t) || 0) + damage);
    }, () => {});
  }
  return { field, hits, frame };
}
const formation = [{ x: 120, y: 230 }, { x: 120, y: 120 }, { x: 140, y: 120 }]
  .map((p) => ({ ...p, radius: 4, hp: 999 }));
const rail = firingRange("marisa", formation);
rail.frame();
assert.equal(rail.hits.size, 2, "The same rail penetrates two aligned targets");
const normalRail = rail.hits.get(formation[0]);
// Only the outer mounts can hit these targets. They keep shooting while the main rail charges.
const leftWing = {x: 86, y: 174, radius: 4, hp: 999}, rightWing = {...leftWing, x: 154};
const flanks = firingRange("marisa", [leftWing, rightWing]);
for (let i = 0; i < 83; i++) flanks.frame();
assert(flanks.hits.has(leftWing) && flanks.hits.has(rightWing));
assert.equal(flanks.field.weapon.starPods.length, 2);
const chargingPods = firingRange("marisa", []);
chargingPods.field.focus = true;
for (let i = 0; i < 25; i++) chargingPods.frame();
assert(chargingPods.field.shots.some(s => s.kind === "comet" && s.vx < 0) &&
  chargingPods.field.shots.some(s => s.kind === "comet" && s.vx > 0));
const sixPods = firingRange("marisa", [], 32);
for (let i = 0; i < 60; i++) sixPods.frame();
assert.equal(sixPods.field.weapon.starPods.length, 6);
const chargedRail = firingRange("marisa", formation);
chargedRail.field.focus = true;
for (let i = 0; i < 30; i++) chargedRail.frame();
assert(!chargedRail.field.weapon.traces.some(fx => fx.kind === "rail"), "Focus stores light before the main rail fires");
chargedRail.field.focus = false;
chargedRail.frame();
assert(chargedRail.hits.get(formation[0]) > normalRail * 2, "Focus release discharges partial energy");

const knightTargets = [{ x: 99, y: 173 }, { x: 143, y: 161 }]
  .map(p => ({...p, radius: 5, hp: 999}));
const party = firingRange("alice", knightTargets);
const phases = new Set(), effects = new Set();
for (let i = 0; i < 56; i++) {
  party.frame();
  party.field.weapon.dolls.forEach(d => phases.add(d.phase));
  party.field.weapon.traces.forEach(fx => effects.add(fx.kind));
}
assert.deepEqual([...effects].sort(), ["cleave", "thrust"]);
assert(phases.has("windup") && phases.has("strike") && phases.has("return"));
assert.equal(party.hits.size, 2, "The two wings can engage separate targets");
assert.equal(party.field.shots.length, 0, "Dolls carry their own weapons to the target");
const distant = firingRange("alice", [{x:120,y:30,radius:12,hp:99}]);
for (let i = 0; i < 48; i++) distant.frame();
assert.equal(distant.hits.size, 0, "A rider cannot hit the far wall before travelling there");
for (let i = 0; i < 90; i++) distant.frame();
assert.equal(distant.hits.size, 1, "A distant enemy can be struck after the lancer closes in");
const evading = {x:100,y:170,radius:4,hp:99};
const feint = firingRange("alice", [evading]);
for (let i = 0; i < 8; i++) feint.frame();
assert(feint.field.weapon.dolls.every(d => d.aimX === evading.x));
evading.x = 224;
for (let i = 0; i < 48; i++) feint.frame();
assert.equal(feint.hits.size, 0, "An enemy that escapes the locked strike can evade");
const screen = firingRange("alice", []);
screen.field.focus = true;
screen.frame();
// Measure contact damage through the same finite-radius target, not against
// a stationary doll origin. Simulate the approach, lunge, return, then rearm.
function puppetTrial(power, distance, moving = false, focus = false) {
  const mark = {x: 120, y: 60, radius: 6, hp: 1e7};
  const range = firingRange("alice", [mark], power);
  range.field.player.y = 60 + distance;
  range.field.focus = focus;
  const riders = new Set(), old = new Map();
  let returned = 0, largest = 0;
  for (let i = 0; i < 900; i++) {
    if (moving) mark.x = 120 + 22 * Math.sin(i / 60);
    range.frame();
    for (const doll of range.field.weapon.dolls) {
      const previous = old.get(doll.index);
      if (doll.scouting) riders.add(doll.index);
      if (previous?.phase === "sortie" && doll.phase === "sortie") {
        assert(Math.hypot(doll.x - previous.x, doll.y - previous.y) <= 150 / 60 + 1e-6);
      }
      if (previous?.scouting && !doll.scouting) returned++;
      if (previous) largest = Math.max(largest, Math.hypot(doll.x - previous.x, doll.y - previous.y));
      old.set(doll.index, {x:doll.x, y:doll.y, phase:doll.phase, scouting:doll.scouting});
    }
  }
  return {total:range.hits.get(mark) || 0, riders:riders.size, returned, largest};
}
for (const power of [1, 10, 32]) {
  for (const focus of [false, true]) {
    const trial = (distance, moving = false) => puppetTrial(power, distance, moving, focus);
    const near = trial(48), mid = trial(125), far = trial(254);
    assert(near.total > mid.total && mid.total > far.total && far.total > 0);
    assert.equal(far.riders, power >= 10 ? 2 : 1);
    assert(far.returned >= far.riders && far.largest < 8);
    assert(trial(254, true).total > 0, "A long sortie can reach a moving opponent");
    if (process.env.REPORT_GROWTH)
      console.log("Alice P" + power, focus ? "focused" : "spread", "DPS at 48/125/254px",
        [near, mid, far].map(m => (m.total / 15).toFixed(1)));
  }
}
const patrolTarget = {x:120, y:40, hp:1e4}, patrol = firingRange("alice", [patrolTarget], 10);
for (let i = 0; i < 48; i++) patrol.frame();
const rider = patrol.field.weapon.dolls.find(d => d.phase === "sortie");
assert(rider && rider.y < 210);
const sortieY = rider.y;
patrol.field.focus = true;
patrol.frame();
assert(rider.phase === "sortie" && rider.y < sortieY, "Switching to focus keeps a deployed rider on target");
for (let i = 0; i < 240; i++) {
  patrol.field.focus = i % 2 === 0;
  patrol.frame();
}
assert(patrol.hits.get(patrolTarget) > 0, "Feathering focus cannot starve an attack");
for (const startedFocused of [false, true]) {
  const spar = firingRange("alice", [{x:130, y:250, radius:6, hp:999}]);
  spar.field.focus = startedFocused;
  spar.frame();
  const sword = spar.field.weapon.dolls.find(d => d.arm === "blade");
  for (let i = 0; i < 30 && sword.phase === "home"; i++) spar.frame();
  assert.equal(sword.phase, "windup");
  const stance = sword.role;
  spar.field.focus = !startedFocused;
  for (let i = 0; i < 90 && sword.phase !== "return"; i++) {
    spar.frame();
    assert.equal(sword.role, stance, "The drawn sword keeps its committed arc across a focus switch");
  }
  assert(sword.hits.size && sword.phase === "return");
  for (let i = 0; i < 90 && sword.phase === "return"; i++) spar.frame();
  assert.notEqual(sword.role, stance, "The sword adopts the new formation on arriving home");
}
const sentry = screen.field.weapon.dolls.find(d => d.arm === "blade");
const bullet = {x:sentry.x, y:sentry.y - 5, radius:2};
screen.field.bullets = [{...bullet, hard:true}, {...bullet, radius:4}, {...bullet}, {...bullet}];
screen.frame();
assert.equal(screen.field.bullets.length, 3, "A braced shield stops one actual light bullet");
assert(screen.field.weapon.traces.some(fx => fx.kind === "parry"));
for (let i = 0; i < 30; i++) screen.frame();
assert.equal(screen.field.bullets.length, 3, "The entire formation shares the guard cooldown");
const shelf = [{ x: 168, y: 192 }, { x: 201, y: 192 }, { x: 207, y: 149 }]
  .map((p) => ({ ...p, radius: 5, hp: 999 }));
const reader = firingRange("patchouli", shelf);
reader.frame();
for (let i = 0; i < 100 && !reader.hits.size; i++) reader.frame(false);
assert.equal(reader.hits.size, 3, "One homing bookmark reaches an off-axis group and chains");
assert(reader.hits.get(shelf[0]) > reader.hits.get(shelf[1]));
// Each visible volume owns a casting beat and the shot starts on its page.
const catalogue = [42, 81, 120, 159, 198].map(x => ({x, y:155, radius:4, hp:999}));
const readerAtPower = firingRange("patchouli", catalogue, 16);
function readingCycle(range, slots = 6) {
  const emissions = [];
  const seen = new Set();
  for (let t = 0; t < 200 && emissions.length < slots; t++) {
    range.frame();
    for (const shot of range.field.shots) {
      if (shot.age > 1/60 || seen.has(shot)) continue;
      seen.add(shot);
      const source = range.field.weapon.grimoires.find(b => b.element === shot.element);
      if (source) {
        assert(Math.abs(shot.x - shot.vx/60 - source.x) < 0.001);
        assert(Math.abs(shot.y - shot.vy/60 - source.y) < 0.001);
        assert(source.flash > 0);
      }
      emissions.push({element:shot.element, mark:shot.mark, relay:shot.relay, t});
    }
  }
  return emissions;
}
const scattered = readingCycle(readerAtPower);
assert.deepEqual(scattered.map(s => s.element), [null,"fire","water","wood","metal","earth"]);
assert.equal(new Set(scattered.map(s => s.t)).size, 6, "The body and books cast on distinct beats");
assert.equal(new Set(scattered.slice(1).map(s => s.mark)).size, 5, "Spread books index different nearby enemies");
readerAtPower.field.focus = true;
const gathered = readingCycle(readerAtPower);
assert(gathered.every(s => s.mark === catalogue[2] && s.relay), "The focused circle starts its relay from a common target");
// Each new edition must actually fire, including on the shorter duel level scale.
const elements = ["fire","water","wood","metal","earth","sun","moon"];
for (const [mode, tiers] of [["score", [19,20,24,25]], ["duel", [7,8,9,10]]]) {
  for (const [i, power] of tiers.entries()) {
    const range = firingRange("patchouli", [], power);
    if (mode === "duel") range.field.side = 0;
    const library = elements.slice(0, [5,6,6,7][i]);
    const volley = readingCycle(range, library.length + 1);
    assert.deepEqual(volley.map(shot => shot.element), [null, ...library], mode + " at " + power);
  }
}
const volumes = readerAtPower.field.weapon.grimoires;
assert(Math.max(...volumes.map(b => b.x)) - Math.min(...volumes.map(b => b.x)) < 45);
for (const id of Object.keys(engine.cast)) {
  const atCap = firingRange(id, formation, 32);
  for (let i = 0; i < 600; i++) {
    atCap.frame();
    assert(atCap.field.shots.length <= 140 && atCap.field.weapon.traces.length <= 48);
  }
  assert(atCap.hits.size > 0, id + " can damage a live target at maximum power");
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
  "PASS: two melee wings, locked strike geometry and shield parry, piercing rails and charge release, homing chain, P32 projectile budgets, bomb cadence and tapered laser collision."
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

// Stars in a sampled exposure keep their heading after the shutter closes.
const exposure = ready("marisa");
exposure.state.player.invulnerable = Infinity;
exposure.state.run.nextWave = Infinity;
let lowerStars = 0,
  peak = 0,
  trackedStars = 0;
const starTracks = new WeakMap();
const isExposureEcho = b => b.color === "#ffd57c" && b.shape === "star";
for (let frame = 0; frame < 18 * 60; frame++) {
  exposure.state.enemySpell.hp = 1e9;
  exposure.state.items = [];
  exposure.step(1 / 60);
  peak = Math.max(peak, exposure.state.bullets.length);
  lowerStars = Math.max(
    lowerStars,
    exposure.state.bullets.filter(
      (b) => b.y > 230 && isExposureEcho(b)
    ).length
  );
  for (const b of exposure.state.bullets) {
    if (!isExposureEcho(b)) continue;
    const previous = starTracks.get(b);
    if (previous) {
      assert(
        Math.abs(b.vx * previous.vy - b.vy * previous.vx) < 1e-7 &&
          b.vx * previous.vx + b.vy * previous.vy > 0,
        "Exposure echo keeps its original direction"
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
  "Exposure echoes must travel downfield even at the introductory firing rate"
);
assert(
  trackedStars >= 7 * 2 * 2 * 3,
  "track multiple complete volleys, not just a handful of escaping stars"
);
assert(peak < 650, "opening stars must not orbit forever and exhaust the pool");
console.log(
  "PASS: sampled exposure volleys keep their heading, reach the player area and retire naturally."
);
