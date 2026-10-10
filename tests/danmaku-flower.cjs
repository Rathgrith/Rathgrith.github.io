const assert = require("node:assert/strict");
const E = require("../assets/js/games/danmaku-flower.js");
const tick = (g, seconds, input) => {
  for (let i = 0; i < Math.ceil(seconds * 60); i++) g.step(1 / 60, input);
};
function ready(p = "alice", e = "marisa") {
  const g = E.create(p, e, 1977);
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
