const assert = require("node:assert/strict");
const score = require("../assets/js/games/danmaku-engine.js");
const flower = require("../assets/js/games/danmaku-flower.js");
const dt = 1 / 60;

for (const pilot of ["alice", "marisa", "patchouli"]) {
  const field = score.create(pilot, "alice", 11).state;
  field.player.x = 120;
  field.player.y = 260;
  const targets = [[120, 155], [132, 158], [87, 156], [153, 156]].map(([x, y]) => ({x, y, radius: 9, hp: 999}));
  const seen = new Set();
  for (let i = 0; i < 240; i++)
    score.stepWeapons(field, pilot, 15, dt, true, targets, (target, amount, _, contact) => {
      assert(amount > 0);
      assert(Math.abs(Math.hypot(contact.x - target.x, contact.y - target.y) - target.radius) < 0.001,
        "Contacts follow the hit target's near rim, including off-axis strikes and chain hops");
      assert(Number.isFinite(contact.angle));
      seen.add(contact.kind);
    }, () => {});
  const expected = {alice: ["lance", "blade"], marisa: ["rail", "comet"], patchouli: ["page"]};
  for (const kind of expected[pilot]) assert(seen.has(kind), pilot + " actually lands " + kind);
}

const sounds = [];
const game = score.create("marisa", "patchouli", 27, (name, id) => sounds.push([name, id]));
const s = game.state;
s.intro = null; s.countdown = 0; s.run.nextWave = 99;
s.boss.x = 29; s.player.x = 120;
const keeper = {kind: "keeper", hp: 6, maxHp: 10, radius: 9, x: 120, lane: 120,
  y: 150, age: 0, offset: 0, salvos: 0};
s.foes.push(keeper);
game.step(dt);
assert(keeper.hp > 0 && keeper.armorBroken);
assert.deepEqual(sounds.filter(([name]) => name === "armor_break"), [["armor_break", "marisa"]]);
assert.deepEqual(s.impacts.map(e => e.kind).sort(), ["armor", "rail"]);
const age = s.impacts[0].age;
game.pause(); game.step(dt);
assert.equal(s.impacts[0].age, age);
game.resume(); s.countdown = 0; s.weapon.clock = 0;
game.step(dt);
assert.equal(s.run.kills, 1);
assert(s.impacts.some(e => e.kind === "foe" && e.heavy));
for (let i = 0; i < 30; i++) game.step(dt);
assert.equal(s.run.kills, 1);
assert(!s.impacts.some(e => e.kind === "foe"));

const duelSounds = [];
const duel = flower.create("marisa", "patchouli", 3, (name, id) => duelSounds.push([name, id]));
const f = duel.state.fields[0];
duel.state.countdown = 0;
f.waveClock = 99;
f.enemies = [115, 123, 136].map(x => ({
  kind: "fairy", x, y: 115, origin: x, radius: 7, hp: 1, age: 0, phase: 0, vy: 0, fire: 99,
}));
duel.step(dt);
assert.equal(f.kills, 3);
assert.equal(f.impacts.filter(e => e.kind === "foe").length, 3);
assert.deepEqual(duelSounds.filter(([name]) => name === "foe_break"), [["foe_break", "marisa"]]);
for (const [hp, age, broken] of [[5, 12.1, false], [0, 2, true]]) {
  f.boss = {id: "alice", hp, maxHp: 100, x: 120, y: 53, age, fire: 99};
  duel.step(dt);
  assert.equal(f.impacts.some(e => e.kind === "seal"), broken, "Only a depleted bar shatters");
}
assert.deepEqual(duelSounds.filter(([name]) => name === "boss_break"), [["boss_break", "marisa"]]);

const castGame = flower.create("patchouli", "alice", 8);
castGame.state.countdown = 0;
const caster = castGame.state.fields[0];
assert(castGame.bomb());
const castOrigin = {x: caster.player.x, y: caster.player.y};
for (let i = 0; i < 9; i++) castGame.step(dt, {x: 1});
assert(caster.player.x > castOrigin.x);
assert.deepEqual({x: caster.cast.x, y: caster.cast.y}, castOrigin, "A released charge stays at the cancel origin");

for (const terminal of [false, true]) {
  const ending = flower.create("marisa", "alice", 1);
  const state = ending.state, field = state.fields[0];
  state.countdown = 0; state.roundTime = 239.999;
  state.wins[0] = terminal ? 1 : 0; state.fields[1].health = 2;
  assert(ending.bomb());
  field.effects.push({kind: "doll", x: 122, y: 80, age: 0});
  field.impacts.push({kind: "rail", age: 0, life: 0.21});
  ending.step(dt);
  assert(terminal ? state.phase === "over" : Boolean(state.intermission));
  assert(!field.cast && !field.impacts.length && !field.effects.length && !field.shots.length,
    "A round cannot leave a frozen skill, hit, cancel, or projectile behind");
}

const finale = score.create("marisa", "patchouli", 12);
const finalState = finale.state;
finalState.countdown = 0; finalState.intro = null; finalState.lives = 1;
finalState.player.invulnerable = 0;
finalState.impacts.push({kind: "rail", age: 0, life: 0.21});
finalState.bullets.push({x: finalState.player.x, y: finalState.player.y, vx: 0, vy: 0,
  age: 0, angle: 0, radius: 3, shape: "rice", color: "red"});
finale.step(dt);
assert.equal(finalState.phase, "over");
assert.equal(finalState.impacts.length, 0, "Only the final miss should linger after the clock stops");

for (const targetX of [90, 111]) {
  const field = score.create("patchouli", "alice", 27).state;
  const target = {x: targetX, y: 105, radius: 8, hp: 99};
  field.weapon.echo = {x: 90, y: 105, left: 0, amount: 10, kind: "page", angle: 1.1,
    color: "violet", section: field.rhythm.sectionKey, nonspell: field.enemySpell.nonspell,
    clears: field.enemySpell.clears, bomb: field.spell && field.spell.id};
  const hits = [];
  score.stepWeapons(field, "patchouli", 1, dt, true, [target], (_, amount, color, contact) => {
    hits.push(contact);
  }, () => {});
  assert.equal(hits.length, 1);
  assert.equal(hits[0].angle, targetX === 90 ? 1.1 : 0,
    "An echo follows its original stroke in place or its real bearing to the next target");
}

const pool = {impacts: []};
score.recordImpact(pool, {x: 10, y: 10}, {kind: "seal"}, "red");
for (let i = 0; i < 400; i++)
  score.recordImpact(pool, {x: i, y: 42}, {kind: "comet"}, "blue");
assert(pool.impacts.length <= 24 && pool.impacts.some(e => e.kind === "seal"));
for (let i = 0; i < 48; i++) score.recordImpact(pool, {x: i * 4, y: 60}, {kind: "foe"}, "teal");
assert(pool.impacts.some(e => e.kind === "seal"), "A mass cancel cannot evict a boss break");
score.advanceImpacts(pool, 1);
assert.equal(pool.impacts.length, 0);
console.log("PASS real contacts, keeper armor, chain deaths, boss defeat vs timeout, paused and bounded impact lifetimes");
