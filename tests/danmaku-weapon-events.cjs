const assert = require("node:assert/strict");
const E = require("../assets/js/games/danmaku-engine.js");
const F = require("../assets/js/games/danmaku-flower.js");
const dt = 1 / 60;

for (const mode of [E, F]) {
  for (const id of Object.keys(E.cast)) {
    const events = [];
    const game = mode.create(id, id === "alice" ? "marisa" : "alice", 42,
      (name, who, voice) => { if (who === id) events.push([name, voice]); });
    const s = game.state;
    s.countdown = 0; s.intro = null;
    const field = mode === E ? s : s.fields[0];
    field.player.y = 209; field.player.invulnerable = 99;
    const positions = [90, 120, 150];
    if (mode === E) {
      s.power = 15; s.run.mods.damage = 1; s.run.nextWave = 99;
      s.boss.x = 120; s.boss.y = 65;
      s.foes = positions.map(x => ({x, lane: x, y: 128, age: 0, offset: 0, kind: "keeper",
        hp: 900, maxHp: 1000, salvos: 0, radius: 12}));
    } else {
      field.waveClock = 99; field.spellLevel = 12;
      field.enemies = positions.map(x => ({x, origin: x, y: 128, age: 0, phase: 0,
        hp: 900, kind: "fairy", radius: 12, vy: 0, fire: 99}));
    }
    for (let i = 0; i < 210; i++) game.step(dt, {focus: id === "marisa" && i >= 100});
    const shots = events.filter(([event]) => event === "shot").map(([, voice]) => voice);
    const hits = events.filter(([event]) => event === "hit" || event === "hit_heavy").map(([,voice]) => voice);
    const shotVoices = {alice: ["lance", "blade", "shield"], marisa: ["pod", "rail", "charged"], patchouli: ["page", "seal"]};
    const hitVoices = {alice: ["lance", "blade"], marisa: ["rail", "comet"], patchouli: ["page"]};
    for (const voice of shotVoices[id]) assert(shots.includes(voice), id + " actually launches " + voice);
    for (const voice of hitVoices[id]) assert(hits.includes(voice), id + " actually hits with " + voice);
  }
}

// Both game entry points use physical lance contact while Shift stays down.
// Flower's independent charge input interrupts a sortie until it is released.
for (const mode of [E, F]) {
  const audio = [], animation = new Set(), game = mode.create("alice", "marisa", 91,
    (name, id, voice) => { if (id === "alice") audio.push([name, voice]); });
  const s = game.state, field = mode === E ? s : s.fields[0];
  s.countdown = 0; s.intro = null;
  field.player.y = 310; field.player.invulnerable = 99;
  const target = {x:120, y:65, hp:999, maxHp:999, radius:9, age:0};
  if (mode === E) {
    s.run.nextWave = 99;
    s.foes = [Object.assign(target, {lane:120, offset:0, kind:"keeper", salvos:0})];
  } else {
    field.waveClock = 99;
    field.enemies = [Object.assign(target, {origin:120, phase:0, vy:0, kind:"fairy", fire:99})];
  }
  function frame(charge = false) {
    game.step(dt, {focus:true, charge});
    for (const doll of field.weapon.dolls) if (doll.arm === "lance") animation.add(doll.phase);
  }
  frame();
  assert(field.focus && animation.has("sortie"));
  if (mode === F) {
    for (let i = 0; i < 30; i++) frame(true);
    assert(field.charging && field.charge > 0 && field.charge < 100);
    assert.equal(target.hp, target.maxHp);
    assert(!field.weapon.dolls.some(d => ["sortie", "strike", "windup"].includes(d.phase)));
  }
  for (let i = 0; i < 240 && target.hp === target.maxHp; i++) frame();
  assert(target.hp < target.maxHp && animation.has("windup") && animation.has("strike"));
  assert(field.weapon.traces.some(t => t.kind === "thrust") && field.impacts.some(t => t.kind === "lance"));
  assert(audio.some(([key,voice]) => key === "shot" && voice === "lance") &&
    audio.some(([key,voice]) => key === "hit" && voice === "lance"));
}

for (const id of ["marisa", "patchouli"]) {
  const field = E.create(id, "alice", 3).state, events = [];
  field.shots = Array.from({length: 140}, () => ({x: -80, y: -30, vx: 0, vy: -5, kind: "comet"}));
  E.stepWeapons(field, id, 1, dt, true, [], () => {}, (...args) => events.push(args));
  assert(!events.some(([, , voice]) => ["pod", "page", "seal"].includes(voice)),
    "A full projectile pool cannot play a launch that did not happen");
}

const shield = E.create("alice", "marisa", 8).state, shieldEvents = [];
shield.focus = true;
const shieldFrame = () => E.stepWeapons(shield, "alice", 6, dt, true, [], () => {}, (...args) => shieldEvents.push(args));
shieldFrame();
const guard = shield.weapon.dolls.find(d => d.arm === "blade");
const incoming = {x: guard.x, y: guard.y - 5, radius: 2};
shield.bullets = [{...incoming, hard: true}];
shieldFrame();
assert(!shieldEvents.length);
shield.bullets.push({...incoming}, {...incoming});
shieldFrame(); shieldFrame();
assert.deepEqual(shieldEvents, [["parry", "alice"]]);
assert.equal(shield.bullets.length, 2);

for (const mode of [E, F]) {
  const events = [];
  const g = mode.create("alice", "marisa", 5, (name, id, voice) => events.push([name, id, voice]));
  const s = g.state; s.countdown = 0; s.intro = null;
  const f = mode === E ? s : s.fields[0];
  f.player.y = 214; f.player.invulnerable = 99;
  if (mode === E) {
    s.foes.push({x: 120, lane: 120, y: 158, hp: 1, maxHp: 1, radius: 9, age: 0, offset: 0, kind: "wing", salvos: 0});
  } else {
    f.enemies.push({x: 120, origin: 120, y: 158, hp: 1, radius: 9, age: 0, phase: 0, vy: 0, kind: "fairy", fire: 99});
  }
  for (let i = 0; i < 65 && !events.some(x => x[0] === "foe_break"); i++) g.step(dt);
  const at = events.findIndex(([name]) => name === "foe_break");
  assert(at >= 1 && events[at-1][0] === "hit" && ["lance","blade"].includes(events[at-1][2]),
    "A lethal contact keeps both its weapon material and the defeated target's cue");
}

for (const enemy of Object.keys(E.cast)) {
  const events = [], g = E.create("alice", enemy, 9, (name, id) => {
    if (name === "enemy_volley") events.push({time: g.state.time, id});
  });
  g.state.countdown = 0; g.state.intro = null; g.state.player.invulnerable = 99;
  for (let i = 0; i < 750; i++) g.step(dt);
  assert(events.length > 2 && events.every(e => e.id === enemy));
  assert(events.every((e,i) => i === 0 || e.time - events[i-1].time >= 0.29));
  const quiet = F.create("alice", enemy, 5, (name,id) => { if (name === "enemy_volley") events.push({id}); });
  quiet.state.countdown = 0;
  const f = quiet.state.fields[0];
  f.boss = {id: enemy, x: 120, y: 53, hp: 999, maxHp: 999, age: 2, fire: 0};
  f.recoveryUntil = 99;
  const before = events.length;
  quiet.step(dt);
  assert.equal(events.length, before, "Suppressed projectiles do not announce a volley");
  f.boss.fire = 0; f.recoveryUntil = 0;
  quiet.step(dt);
  assert.equal(events.length, before + 1);
  assert.equal(events.at(-1).id, enemy);
}
const muted = F.create("patchouli", "marisa", 42);
let failures = 0;
const unavailable = F.create("patchouli", "marisa", 42, () => {
  failures++;
  throw Error("Audio device disconnected");
});
for (const match of [muted, unavailable]) match.state.countdown = 0;
for (let i = 0; i < 90; i++) { muted.step(dt); unavailable.step(dt); }
assert(failures > 0);
assert.deepEqual(unavailable.state, muted.state, "An audio failure leaves the simulation identical");
console.log("PASS both modes: weapon launch/contact voices, real parry, lethal contact, pool caps, bounded boss volleys");
