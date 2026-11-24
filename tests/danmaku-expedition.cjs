const assert = require("node:assert/strict");
const run = require("../assets/js/games/danmaku-run.js");
const engine = require("../assets/js/games/danmaku-engine.js");

const game = engine.create("alice", "alice", 773);
const state = game.state;
state.countdown = 0;
state.player.invulnerable = Infinity;
for (let i = 0; i < 60 * 45; i++) {
  game.step(1 / 60);
  assert(state.foes.length <= 4);
  assert(state.items.length <= 12);
}
assert(state.run.wave >= 2);
assert(state.run.kills > 0, "Live player fire can destroy a passing escort");
assert(state.pickups.shard > 0, "Shards from actual kills home and grant XP");
const flank = engine.create("marisa", "alice", 27).state;
flank.time = 3; flank.enemySpell.age = 3;
for (let wave = 1; wave <= 3; wave++) {
  flank.run.nextWave = 0;
  flank.foes.length = 0;
  run.updateFoes(flank, 1/60, () => {});
  if (wave === 1) assert(flank.foes.every(f => f.x < 0 && f.y > 20));
  if (wave === 2) assert(flank.foes.some(f => f.x < 0) && flank.foes.some(f => f.x > 240));
  if (wave === 3) assert(flank.foes.every(f => f.y < 0));
  for (let i = 0; i < 120; i++) run.updateFoes(flank, 1/60, () => {});
  assert(flank.foes.every(f => f.x > 0 && f.x < 240));
}
// A flank locks its heading visibly and gives the player time to move aside.
const escortField = engine.create("marisa", "alice", 27).state;
escortField.run.nextWave = Infinity;
escortField.attackReadyAt = 0;
escortField.foes = [{
  hp: 8, kind: "keeper", lane: 35, x: 35, y: 65, age: 0, offset: 0,
  aim: null, salvos: 2, fireLine: 43, warning: 0
}];
const volley = [];
const record = (...shot) => volley.push(shot);
run.updateFoes(escortField, 1/60, record);
const locked = escortField.foes[0].aim;
assert(escortField.foes[0].warning >= 0.45);
escortField.player.x = 210;
for (let i = 0; i < 24; i++) run.updateFoes(escortField, 1/60, record);
assert.equal(volley.length, 0);
for (let i = 0; i < 9; i++) run.updateFoes(escortField, 1/60, record);
assert.equal(volley.length, 5);
assert.equal(volley[2][2], locked, "The fan retains its telegraphed heading");
escortField.foes[0].y = 130;
escortField.player.x = escortField.foes[0].x;
escortField.player.y = 136;
for (let i = 0; i < 50; i++) run.updateFoes(escortField, 1/60, record);
assert.equal(volley.length, 5, "Escorts never fire at point-blank range");
// The escort types can be read by both trajectory and material. The plum
// feathers start outwards and fold onto parallel headings around a real seam.
function escortVolley(kind, level) {
  const s = engine.create("marisa", "alice", 27).state;
  s.run.nextWave = Infinity; s.attackReadyAt = 0; s.level = level;
  s.foes = [{hp:30, kind, x:70, lane:70, y:65, age:0, offset:0, aim:null,
    salvos:1, fireLine:45, warning:0}];
  const rows = [];
  for (let i=0; i<40; i++) run.updateFoes(s, 1/60, (...args) => rows.push(args));
  return rows;
}
const dart = escortVolley("scout", 1);
assert.deepEqual(dart.map(b => b[7]), ["needle","smallorb"]);
assert(dart[0][3] > dart[1][3] && dart[0][2] === dart[1][2]);
for (const [rank, expected] of [[1,4], [6,6]]) {
  const feathers = escortVolley("wing", rank);
  assert.equal(feathers.length, expected);
  const axis = feathers[0][6].redirect.angle;
  assert(feathers.every(f => f[6].redirect.angle === axis && Math.abs(f[2]-axis) > .3));
  assert(feathers.some(f => f[2] > axis) && feathers.some(f => f[2] < axis));
}
// A keeper still drops both rewards when every visible slot is occupied.
const crowded = engine.create("marisa", "alice", 9);
const crowd = crowded.state;
crowd.countdown = 0;
crowd.intro = null;
for (let i = 0; i < 12; i++)
  crowd.items.push({type: "life", x: 20, y: 140, vx: 0, vy: 0, age: 0});
crowd.foes.push({kind:"keeper", hp:1, maxHp:1, radius:9, x:120, lane:120, y:160, age:0, offset:0, fired:true});
for (let i = 0; i < 24 && !crowd.run.kills; i++) crowded.step(1/60);
assert.equal(crowd.run.kills, 1);
assert.equal(crowd.items.length, 12);
assert.equal(crowd.items.find(item => item.type === "shard").amount, 3);
assert.equal(crowd.items.find(item => item.type === "power").amount, 1);
assert.equal(crowd.items.filter(item => item.type === "life")
  .reduce((sum, item) => sum + (item.amount || 1), 0), 12);
for (const item of crowd.items) { item.x = crowd.player.x; item.y = crowd.player.y; }
crowded.step(1/60);
assert.deepEqual(crowd.pickups, {power:1, life:12, clear:0, shard:1});
assert.equal(crowd.power, 2);
assert.equal(crowd.run.xp, 3);
const modsBefore = {...state.run.mods};
state.items.push({type: "shard", amount: 20, x: state.player.x, y: state.player.y, age: 0, vx: 0, vy: 0});
game.step(1 / 60);
assert.equal(new Set(state.run.offer).size, 3);
game.pause();
const paused = JSON.stringify(state);
game.step(1 / 60);
assert.equal(JSON.stringify(state), paused);
assert.equal(game.chooseUpgrade("nonexistent"), false);
const first = state.run.offer[0], xp = state.run.xp;
assert(game.chooseUpgrade(first));
assert.equal(state.run.mods[first], modsBefore[first] + 1);
assert.equal(state.run.xp, xp - 3);
assert.equal(state.run.level, 2);
game.resume();
game.setAuto(true);
state.countdown = 0;
game.step(1 / 60);
assert(state.run.level >= 3, "AUTO builds from the same earned XP");
const beforeRound = state.run;
state.intermission = {age: 2};
assert(game.nextRound());
assert.equal(state.run, beforeRound);
assert.equal(engine.create("alice", "alice", 773).state.run.level, 1);
const almostFull = {lives:5, bombs:1, power:30};
assert.match(run.description(almostFull, "guard", engine.maxPower), /霊撃 \+1/);
assert.match(run.description(almostFull, "reactor", engine.maxPower), /火力 \+2/);
assert.doesNotMatch(run.description({...almostFull, bombs:5}, "guard", engine.maxPower), /残機|霊撃/);
const seeded = [run.create(833), run.create(833)];
for (const r of seeded) run.addXP(r, 10000);
assert.deepEqual(seeded[0].offer, seeded[1].offer);
const maxed = engine.create("alice", "alice", 833).state;
maxed.run = seeded[0];
while (maxed.run.offer) assert(run.choose(maxed, maxed.run.offer[0], engine.maxPower));
assert.deepEqual(Object.values(maxed.run.mods), [5,5,5,5,5,5]);
assert.equal(maxed.run.next, 0);
run.addXP(maxed.run, 12);
assert.equal(maxed.run.xp, 0);
assert.equal(maxed.run.offer, null);
console.log("Expedition waves, loot, pause, draft, auto, round carry and mastery passed.");

// Projectile silhouettes follow the actual weapon mount and focus state.
for (const [id, focus, expected] of [
  ["marisa", false, ["bolt", "crescent", "sun"]], ["marisa", true, ["bolt"]],
  ["patchouli", false, ["bookmark", "earth", "fire", "metal", "moon", "sun", "water", "wood"]],
]) {
  const f = {player:{x:120,y:300}, weapon:engine.newWeapon(), shots:[], bullets:[], focus};
  const bodies = new Set();
  for (let frame = 0; frame < 200; frame++) {
    engine.stepWeapons(f, id, 32, 1/60, true, [], () => {}, () => {});
    for (const shot of f.shots) bodies.add(shot.silhouette || shot.element || shot.kind);
  }
  assert.deepEqual([...bodies].sort(), expected);
}
// Compare the same fixed target and encounter time across tiers, with all three
// real weapon controllers. No hits from returning echoes may reschedule echoes.
function firingTrial(id, power, damage, tempo, overdrive = false) {
  const field = {player: {x: 120, y: 225}, weapon: engine.newWeapon(), run: run.create(19),
    focus: false, shots: [], bullets: [], time: 0};
  Object.assign(field.run.mods, {damage, tempo, reactor: overdrive ? 1 : 0});
  const target = {x: 120, y: 125, hp: 1e6, radius: 10};
  let total = 0, contacts = 0, heavy = 0, echoes = 0;
  if (overdrive) field.run.overdriveUntil = 13;
  for (let frame = 0; frame < 720; frame++) {
    field.time += 1 / 60;
    engine.stepWeapons(field, id, power, 1 / 60, true, [target], (t, amount, color, contact) => {
      total += amount; contacts++;
      assert(Number.isFinite(contact.x + contact.y));
    }, () => {});
    for (const t of field.weapon.traces.filter(effect => effect.age === 0)) {
      if (t.kind === "heavy") heavy++;
      if (t.kind === "echo") echoes++;
    }
    assert(field.weapon.traces.length <= 48 && field.shots.length <= 140);
  }
  return {total, contacts, heavy, echoes};
}
for (const id of ["alice", "marisa", "patchouli"]) {
  for (const power of [1, 32]) {
    const base = firingTrial(id, power, 0, 0);
    const lens = firingTrial(id, power, 1, 0);
    const spring = firingTrial(id, power, 0, 1);
    const third = firingTrial(id, power, 3, 3);
    const max = firingTrial(id, power, 5, 5, true);
    assert(lens.total > base.total * 1.32 && lens.heavy >= 5 && lens.heavy <= 8);
    assert(spring.contacts > base.contacts);
    assert(third.echoes >= 6 && third.echoes <= 11 && !spring.echoes);
    assert(third.total > lens.total && max.total > third.total);
    assert(firingTrial(id, power, 0, 0, true).contacts > base.contacts);
    if (process.env.REPORT_GROWTH) console.log(id, power, [base, lens, spring, third, max].map(t => (t.total / 12).toFixed(1)));
  }
}

// An off-axis foe lies in the engraving's III blast, outside both rail and pods.
function blastAtTier(tier) {
  const field = {player: {x: 120, y: 225}, weapon: engine.newWeapon(), run: run.create(20),
    focus: false, shots: [], bullets: [], time: 1};
  field.run.mods.damage = tier;
  const targets = [120, 146, 181].map(x => ({x, y: 120, hp: 200, radius: 5}));
  engine.stepWeapons(field, "marisa", 1, 1 / 60, true, targets, (t, n) => { t.hp -= n; }, () => {});
  return targets.map(t => t.hp < 200);
}
assert.deepEqual(blastAtTier(2), [true, false, false]);
assert.deepEqual(blastAtTier(3), [true, true, false]);

// Delay is anchored to space, and a clear cannot bank a strike for the next bar.
for (const change of ["move", "clear", "bomb"]) {
  const field = {player: {x: 120, y: 240}, weapon: engine.newWeapon(), run: run.create(31),
    focus: false, shots: [], bullets: [], time: 1, enemySpell: {clears: 0, reload: 0, nonspell: false}};
  const target = field.boss = {x: 120, y: 120, hp: 200, radius: 5};
  field.run.mods.tempo = 3;
  engine.stepWeapons(field, "marisa", 1, 1 / 60, true, [target], () => {}, () => {});
  assert(field.weapon.echo);
  if (change === "move") target.x += 52;
  if (change === "clear") field.enemySpell.clears++;
  if (change === "bomb") field.spell = {id: "marisa"};
  let newHits = 0;
  field.weapon.clock = 1;
  for (let i = 0; i < 11; i++)
    engine.stepWeapons(field, "marisa", 1, 1 / 60, true, [target], () => { newHits++; }, () => {});
  assert.equal(field.weapon.echo, null);
  assert.equal(newHits, 0);
}

function setupUpgrade(id, tier) {
  const game = engine.create("alice", "marisa", 71);
  const s = game.state;
  s.intro = null; s.countdown = 0;
  game.step(1 / 60);
  s.run.mods[id] = tier - 1;
  s.run.xp = s.run.next; s.run.offer = [id];
  assert(game.chooseUpgrade(id));
  assert.deepEqual(s.run.lastUpgrade, {id, tier, time: s.time});
  assert.equal(game.chooseUpgrade(id), false);
  assert.deepEqual(s.run.lastUpgrade, {id, tier, time: s.time});
  return game;
}
function drop(game, type, amount, x = game.state.player.x, y = game.state.player.y) {
  const i = {x, y, type, amount, age: 0, vx: 0, vy: 0};
  game.state.items.push(i);
  game.step(1 / 60);
  return i;
}

const press = setupUpgrade("salvage", 3);
press.state.power = 31;
drop(press, "shard", 3);
assert.equal(press.state.run.xp, 12);
drop(press, "shard", 6);
assert.equal(press.state.run.salvageMeter, 1);
assert.equal(press.state.power, 32);
assert.equal(press.state.pickupNotice.bonusPower, 1);
assert.equal(press.state.pickupNotice.bonusScore, 500);

const drive = setupUpgrade("reactor", 1), initialDriveEnd = drive.state.run.overdriveUntil;
assert.equal(drive.state.power, 5);
drop(drive, "shard", 1);
assert.equal(drive.state.run.overdriveUntil, initialDriveEnd);
drop(drive, "power", 1);
assert.equal(drive.state.power, 7);
assert(drive.state.run.overdriveUntil > initialDriveEnd);
const ignition = setupUpgrade("reactor", 3);
ignition.state.power = 32; ignition.state.run.overdriveUntil = 0;
drop(ignition, "shard", 1);
assert(ignition.state.run.overdriveUntil - ignition.state.time > 3.7);

const magnet = setupUpgrade("magnet", 1);
const farther = drop(magnet, "power", 1, magnet.state.player.x - 60);
assert(farther.x > magnet.state.player.x - 60);
const vacuum = setupUpgrade("magnet", 3);
const swept = drop(vacuum, "power", 1, 12, 20);
assert(swept.x > 12 && swept.y > 20);
for (let i = 0; i < 85; i++) vacuum.step(1 / 60);
const outside = drop(vacuum, "power", 1, 12, 20);
assert.equal(outside.x, 12);
for (let i = 0; i < 162; i++) vacuum.step(1 / 60);
assert(outside.x > 12, "The next pulse gathers the same outlying item");

const ward = setupUpgrade("guard", 3), ws = ward.state;
ws.player.invulnerable = 0;
const bullet = (x, y) => ({x, y, vx: 0, vy: 0, radius: 2, age: 0, shape: "orb", color: "#fff"});
ws.bullets.push(bullet(ws.player.x, ws.player.y), bullet(ws.player.x + 13, ws.player.y), bullet(26, 105));
const stock = ws.lives;
ward.step(1 / 60);
assert.equal(ws.lives, stock);
assert.equal(ws.run.guardBreakAt, ws.time);
assert.equal(ws.run.guardReady, false);
assert.equal(ws.enemySpell.eligible, false);
assert.equal(ws.bullets.length, 1);
assert.equal(ws.bullets[0].x, 26);
ws.player.invulnerable = 0;
ws.bullets.push(bullet(ws.player.x, ws.player.y));
ward.step(1 / 60);
assert.equal(ws.lives, stock - 1);
assert.equal(ws.bullets.length, 0);
ws.time = ws.rhythm.spellEnd;
ward.step(1 / 60);
assert(!ws.run.guardReady, "A broken shield cannot earn its own recharge");
const cleanGame = setupUpgrade("guard", 3);
cleanGame.state.run.guardReady = false;
cleanGame.state.time = cleanGame.state.rhythm.spellEnd;
cleanGame.step(1 / 60);
assert.equal(cleanGame.state.run.guardReady, true);
console.log("Six equipment types, actual weapon damage/rate, timed procs, capped salvage and spell-based shields passed.");
