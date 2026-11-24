const assert = require("node:assert/strict");
const E = require("../assets/js/games/danmaku-flower.js");
const tick = (g, seconds, input) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) g.step(1 / 60, input);
};
function ready(p = "alice", e = "marisa", seed = 1977) {
  const g = E.create(p, e, seed);
  g.state.countdown = 0;
  return g;
}
function quiet(g) {
  g.state.fields.forEach((f) => {
    f.waveClock = 999;
    f.aiClock = 999;
    f.aiInput = {};
    f.enemies = [];
    f.bullets = [];
    f.shots = [];
  });
}
// The lead fairy's first bloom has a forward pearl. The next bloom opens a
// real gap on the same bearing and the rank only increases the petal count.
for (const [round, count] of [[1,5], [12,7]]) {
  const game = ready(), field = game.state.fields[0];
  quiet(game); game.state.round = round; field.waveClock = 0;
  game.step(1/60, {charge:true});
  assert.equal(field.enemies.filter(e => e.leader).length, 1);
  const leader = field.enemies.find(e => e.leader);
  field.enemies = [leader]; leader.y = 65; leader.fire = 0;
  function fire() {
    field.bullets.length = 0; leader.fire = 0;
    game.step(1/60, {charge:true});
    return field.bullets.map(b => Math.atan2(b.vy,b.vx) - leader.fireAngle);
  }
  const first = fire();
  assert.equal(first.length,count);
  assert(field.bullets.every(b=>b.shape === "white" && !b.hard));
  assert(first.some(offset=>Math.abs(offset) < 1e-6));
  const second = fire();
  assert.equal(second.length, count - 1);
  assert(second.every(offset=>Math.abs(offset) > .3));
  Object.assign(field.player, {x: leader.x, y: leader.y});
  assert.equal(fire().length, 0);
}
const a = ready(),
  b = ready();
a.setAuto(true);
b.setAuto(true);
tick(a, 30);
tick(b, 30);
assert.deepEqual(a.state, b.state, "seeded replay is deterministic");
assert(
  a.state.fields.every((f) => f.kills > 0 && f.sent > 0 && f.cards > 0),
  "both pilots actually kill enemies and spend meter"
);
// The duel's second lens answers where the first volley saw the player.
const lensMatch = ready("alice", "marisa");
quiet(lensMatch);
const lensField = lensMatch.state.fields[0];
lensField.boss = {id:"marisa", x:120, y:53, hp:999, age:2, fire:0};
lensField.player.x = 49;
lensMatch.step(1/60);
assert.equal(lensField.boss.volley, 1);
assert.equal(lensField.lasers.length, 0);
lensField.player.x = 196;
lensField.boss.fire = 0;
lensMatch.step(1/60);
assert.equal(lensField.lasers.length, 1);
assert.equal(lensField.lasers[0].x, 49, "The warning preserves the baited position");
assert(lensField.lasers[0].warning > 1);
// Each reinforcement keeps its own socket, and its action marks are backed by
// projectiles at that socket. A cancelled volley cannot trigger any cast pose.
const dt = 1 / 60;
function bornAt(b, position) {
  return b.age === dt && Math.hypot(b.x - b.vx * dt - position.x, b.y - b.vy * dt - position.y) < 0.00001;
}
function summoned(id, round = 1, seed = 1977) {
  const match = ready("alice", id, seed);
  quiet(match);
  match.state.round = round;
  const field = match.state.fields[0];
  field.player.x = 68;
  field.player.y = 280;
  field.player.invulnerable = Infinity;
  const boss = {id, x:120, y:53, hp:9999, maxHp:9999, age:2, fire:0};
  field.boss = boss;
  return {match, field, boss};
}
for (const [id, sizes] of [
  ["alice", [2, 3, 5, 5, 5, 5]], ["marisa", [2, 3, 4, 4, 4, 4]], ["patchouli", [2, 3, 5, 7, 7, 7]],
]) {
  const {match, field, boss} = summoned(id);
  for (const [turn, expected] of sizes.entries()) {
    assert.equal(E.satelliteCount(boss), expected);
    const sources = E.volleySources(boss);
    field.bullets.length = 0;
    boss.fire = 0;
    match.step(dt);
    for (const i of sources) {
      const source = E.satellitePosition(boss, i);
      assert.equal(boss.lastCast[i], match.state.time);
      const own = field.bullets.filter(b => b.hard && bornAt(b, source));
      assert(own.length, id + " missing projectile at socket " + i + " on volley " + turn);
      if (id === "patchouli" && i >= 5) {
        assert(own.some(b => b.visualStyle === (i === 5 ? "solar" : "lunar") && b.color === E.elementColors[i]));
      }
    }
    assert.equal(boss.volley, turn + 1);
  }
  const casts = boss.lastCast.slice();
  field.recoveryUntil = match.state.time + 1;
  boss.fire = 0;
  match.step(dt);
  assert.deepEqual(boss.lastCast, casts);
}
// Watch bullets actually leave the moving body after the first sight, then
// change the replay seed. No projectile from its independent satellites counts.
function readBurst(id, round, seed) {
  const {match, field, boss} = summoned(id, round, seed);
  match.step(dt);
  const mark = {...boss.sight}, rows = [];
  assert(mark.ready - mark.at >= .50);
  field.player.x = 205;
  for (let i = 0; i < 80; i++) {
    match.step(dt);
    const shots = field.bullets.filter(b => bornAt(b, boss));
    if (!shots.length) continue;
    const time = match.state.time;
    assert(time >= mark.ready && boss.bodyCast === time);
    const aim = Math.atan2(mark.y - boss.y, mark.x - boss.x);
    rows.push(shots.map(b => ({
      speed:Math.hypot(b.vx, b.vy), offset:Math.atan2(b.vy, b.vx) - aim, style:b.visualStyle,
    })));
  }
  assert.equal(rows.length, id === "alice" ? 4 : 3);
  assert(rows[0].some(b => Math.abs(b.offset) < 1e-9 && b.speed >= 154));
  assert(rows.slice(0, -1).every(row => row.every(b => b.speed >= 146)));
  assert(rows.at(-1).every(b => b.speed < 115 && Math.abs(b.offset) > .15));
  assert.equal(boss.sight, null);
  return rows;
}
for (const id of ["alice", "marisa", "patchouli"]) {
  const base = readBurst(id, 1, 9), replay = readBurst(id, 1, 9), alternate = readBurst(id, 1, 19);
  const hard = readBurst(id, 17, 9);
  assert.deepEqual(replay, base);
  assert.deepEqual(alternate.slice(0, -1), base.slice(0, -1));
  assert.notDeepEqual(alternate.at(-1), base.at(-1));
  assert(hard.flat().length > base.flat().length);
  if (id === "patchouli") {
    assert(base[0].every(b => b.style === "solar") && base[1].every(b => b.style === "lunar"));
  }
  // All four diagonals share a real body-width return passage with a visible
  // cap at each end. Check both ranks against every bullet in the active cast.
  for (const round of [1, 17]) {
    const {match, field, boss} = summoned(id, round);
    boss.volley = 4;
    const voices = E.volleySources(boss);
    match.step(dt);
    const y = id === "patchouli" ? 282 : 267;
    const rays = [], cast = field.bullets;
    for (const index of voices) {
      const from = E.satellitePosition(boss, index), bearings = new Map();
      for (const b of cast.filter(b => bornAt(b, from))) {
        const key = Math.atan2(b.vy, b.vx).toFixed(8);
        if (!bearings.has(key)) bearings.set(key, []);
        bearings.get(key).push(b);
      }
      assert.equal(bearings.size, 2);
      for (const line of bearings.values()) {
        line.sort((a, b) => a.vy - b.vy);
        const gaps = line.slice(1).map((b, i) => (b.vy - line[i].vy) * 2.05);
        const largest = Math.max(...gaps), i = gaps.indexOf(largest);
        assert(largest > 36 && line[i].visualStyle === line[i + 1].visualStyle);
        const edgeY = from.y + (line[i].vy + line[i + 1].vy) * 2.05 / 2;
        assert(Math.abs(y - edgeY) < .001);
        rays.push(from.x + (y - from.y) * line[0].vx / line[0].vy);
      }
    }
    assert.equal(rays.length, 4);
    for (const x of rays) {
      for (let frame = 0; frame <= 24; frame++) {
        const t = 1.95 + frame / 120;
        const px = x - 5 + Math.min(frame, 24 - frame) * 10 / 12;
        assert(cast.every(b => Math.hypot(px - b.x - b.vx * (t - dt), y - b.y - b.vy * (t - dt))
          > b.radius + field.player.radius), id + " volley has no return route");
      }
    }
  }
}
for (const stop of ["card", "reversal", "close", "capture", "timeout", "miss", "round"]) {
  const {match, field, boss} = summoned("alice");
  match.step(dt);
  assert(boss.sight);
  if (stop === "card" || stop === "reversal") {
    field.gauge = stop === "card" ? 200 : 400;
    assert(match.bomb());
  } else if (stop === "close") {
    field.player.x = boss.x;
    field.player.y = boss.y;
  } else if (stop === "miss") {
    field.player.invulnerable = 0;
    field.bullets.push({x:field.player.x, y:field.player.y, vx:0, vy:0, radius:3, age:0});
  } else if (stop === "round") {
    match.state.fields[1].health = 0;
  } else if (stop === "capture") {
    boss.hp = 0;
  } else {
    boss.age = 12;
  }
  tick(match, 1.1);
  assert(!field.boss || !field.boss.sight);
  assert.equal(boss.bodyCast, undefined, stop + " allowed a pending body row");
}
const chain = ready();
quiet(chain);
const left = chain.state.fields[0],
  right = chain.state.fields[1];
left.gauge = 0;
left.enemies = [100, 120, 140].map((x) => ({
  x,
  y: 120,
  origin: x,
  phase: 0,
  age: 0,
  hp: 1,
  kind: "fairy",
  radius: 7,
  vy: 0,
  fire: 99,
}));
left.shots = [{ x: 100, y: 120, vx: 0, vy: 0, damage: 2 }];
left.bullets = [
  {
    x: 120,
    y: 125,
    vx: 0,
    vy: 0,
    shape: "white",
    radius: 2.3,
    hard: false,
    bounce: 0,
    age: 0,
  },
  {
    x: 115,
    y: 125,
    vx: 0,
    vy: 0,
    shape: "star",
    radius: 2.3,
    hard: true,
    bounce: 0,
    age: 0,
  },
];
chain.step(1 / 60);
assert.equal(left.kills, 3);
assert.equal(left.enemies.length, 0);
assert.equal(left.bullets.length, 1);
assert(left.bullets[0].hard);
assert(left.combo >= 4 && left.gauge > 40 && left.points.length >= 3);
assert(
  right.incoming.some((x) => x.kind === "white" && x.bounce === 1),
  "cancelled white bullets return to the opponent"
);
assert(
  right.incoming.some((x) => x.kind === "spirit"),
  "chain spawns a spirit attack"
);
const quick = ready();
quiet(quick);
let f = quick.state.fields[0];
f.gauge = 300;
f.bullets = [
  {
    x: f.player.x,
    y: f.player.y - 20,
    vx: 0,
    vy: 0,
    shape: "star",
    radius: 2.3,
    hard: true,
    age: 0,
  },
];
assert(quick.bomb());
assert.equal(f.gauge, 0);
assert.equal(f.bullets.length, 0);
assert(f.cast && f.player.invulnerable > 0);
assert(
  quick.state.fields[1].incoming.some((a) => a.kind === "card" && a.level === 3)
);
assert(!quick.bomb(), "no free repeat bomb");
tick(quick, 1.2);
assert(
  quick.state.fields[1].bullets.length > 0,
  "the card produces real opposing hazards after its warning"
);
const charged = ready();
quiet(charged);
f = charged.state.fields[0];
tick(charged, 1.42, { charge: true });
assert(f.charging && f.charge >= 200);
charged.step(1 / 60, {});
assert(
  f.gauge > 100 && f.gauge < 105,
  "charged C2 spends one segment, not all meter"
);
assert.equal(f.cards, 1);
const free = ready();
quiet(free);
f = free.state.fields[0];
f.gauge = 0;
tick(free, 0.8, { charge: true });
free.step(1 / 60, {});
assert(f.cast && f.cast.level === 1);
assert(f.gauge < 2);
const reverse = ready();
quiet(reverse);
f = reverse.state.fields[0];
f.gauge = 400;
f.boss = { id: "marisa", x: 120, y: 50, age: 2, fire: 99, hp: 200 };
assert(reverse.bomb());
assert.equal(f.boss, null);
assert(f.notice.text.includes("REVERSAL"));
tick(reverse, 1.2);
assert(
  reverse.state.fields[1].boss && reverse.state.fields[1].boss.id === "alice"
);
const spirit = ready();
quiet(spirit);
f = spirit.state.fields[0];
f.enemies = [
  {
    x: 120,
    y: 230,
    origin: 120,
    phase: 0,
    age: 0,
    hp: 14,
    kind: "spirit",
    radius: 7,
    vy: 22,
    fire: 99,
  },
];
spirit.step(1 / 60, { focus: true });
assert(f.enemies[0].active && f.enemies[0].hp === 1);
const revival = ready();
quiet(revival);
const hitField = revival.state.fields[0], otherField = revival.state.fields[1];
const hazard = (x, y) => ({ x, y, vx: 0, vy: 0, shape: "star", radius: 3, age: 0, hard: true });
const health = hitField.health;
hitField.player.invulnerable = 0;
hitField.bullets.push(hazard(hitField.player.x, hitField.player.y), hazard(8, 7));
hitField.lasers.push({ x: 10, age: 0, duration: 2, warning: 1, width: 4 });
hitField.incoming.push({ kind: "card", level: 4, age: 0, delay: 1, id: "marisa" });
otherField.bullets.push(hazard(12, 17));
revival.step(1 / 60);
assert.equal(hitField.health, health - 1);
assert(hitField.missBurst && otherField.bullets.length === 1);
assert.equal(hitField.bullets.length + hitField.lasers.length + hitField.incoming.length, 0);
tick(revival, 0.4);
assert.equal(hitField.bullets.length + hitField.lasers.length, 0);
const paused = ready();
tick(paused, 0.4, { charge: true });
paused.pause();
const snapshot = JSON.stringify(paused.state);
tick(paused, 5, { charge: true });
assert.equal(JSON.stringify(paused.state), snapshot);
assert(!paused.state.fields[0].charging);
paused.resume();
assert(paused.state.countdown >= 1);
function kill(g, side) {
  const f = g.state.fields[side];
  f.health = 1;
  f.player.invulnerable = 0;
  f.aiClock = 99;
  f.aiInput = {};
  f.bullets = [
    { x: f.player.x, y: f.player.y, vx: 0, vy: 0, radius: 3, age: 0 },
  ];
}
const match = ready();
quiet(match);
kill(match, 1);
match.step(1 / 60);
assert.deepEqual(match.state.wins, [1, 0]);
assert(match.state.intermission);
assert(!match.nextRound());
tick(match, 2);
const total = match.state.score;
assert(match.nextRound());
assert.equal(match.state.round, 2);
assert.equal(match.state.score, total);
match.state.countdown = 0;
kill(match, 1);
match.step(1 / 60);
assert.equal(match.state.phase, "over");
assert.deepEqual(match.state.wins, [2, 0]);
assert(!match.bomb());
const draw = ready();
quiet(draw);
kill(draw, 0);
kill(draw, 1);
draw.step(1 / 60);
assert.equal(draw.state.winner, -1);
assert.deepEqual(draw.state.wins, [0, 0]);
tick(draw, 10);
assert.equal(draw.state.round, 2, "idle confirmation advances a draw too");
const assisted = ready();
assisted.setAuto(true);
assisted.setAuto(false);
assert(assisted.state.assisted && !assisted.state.auto);
console.log(
  "PASS: deterministic fields, genuine chain/cancel/return attacks, hard-bullet distinction, ghosts, quick/charged meter costs, boss reversal, pause, draws, rounds and assistance provenance."
);
for (const p of ["alice", "marisa", "patchouli"])
  for (const e of ["alice", "marisa", "patchouli"]) {
    const g = ready(p, e);
    g.setAuto(true);
    let maxCards = [0, 0],
      peak = [0, 0];
    for (let i = 0; i < 600 * 60 && g.state.phase === "playing"; i++) {
      g.step(1 / 60);
      g.state.fields.forEach((f, j) => {
        maxCards[j] = Math.max(maxCards[j], f.cards);
        peak[j] = Math.max(peak[j], f.bullets.length);
        assert(
          f.health >= 0 && f.health <= 5 && f.gauge >= 0 && f.gauge <= 400
        );
        assert(
          f.bullets.length <= 420 &&
            f.enemies.length <= 48 &&
            f.shots.length <= 96 &&
            f.incoming.length <= 48 &&
            f.points.length <= 100
        );
        if (i % 60 === 0)
          assert(
            f.bullets.every((b) => Number.isFinite(b.x + b.y + b.vx + b.vy))
          );
      });
    }
    assert.equal(
      g.state.phase,
      "over",
      p + " vs " + e + " reaches a real match result"
    );
    assert(Math.max(...g.state.wins) === 2);
    assert(
      maxCards.every((n) => n > 2),
      "both sides cast cards using earned meter"
    );
    console.log(
      `${p} vs ${e}: ${g.state.wins.join(":")}, ${Math.round(g.state.time)}s, cards ${maxCards}, peak ${peak}`
    );
  }
console.log(
  "PASS: all nine automatic matchups finish, with bounded genuine attacks and health."
);
