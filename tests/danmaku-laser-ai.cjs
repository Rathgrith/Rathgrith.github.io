const assert = require("node:assert/strict");
const engine = require("../assets/js/games/danmaku-engine.js");
const flower = require("../assets/js/games/danmaku-flower.js");
const bounds = [12, 228, 45, 344];
const beam = (extra = {}) =>
  Object.assign(
    {
      x: 120,
      y: 0,
      angle: Math.PI / 2,
      width: 8,
      age: 2,
      warning: 1,
      duration: 4,
      sweep: 0,
      spread: 0,
    },
    extra
  );
const player = { x: 75, y: 300, radius: 2.2 };
const through = engine.laserRoute(player, 154, 0, [beam()], 0.8, bounds);
const stay = engine.laserRoute(player, 0, 0, [beam()], 0.8, bounds);
assert(
  through.cost > 100 && through.impact < 0.4,
  "crossing a laser is unsafe even with a safe endpoint"
);
assert.equal(stay.cost, 0);
assert.equal(
  engine.laserRoute(player, 154, 0, [beam({ age: 5.1 })], 0.8, bounds).cost,
  0,
  "expired beams do not block paths"
);
assert.equal(
  engine.laserRoute(player, 154, 0, [beam({ age: 0, warning: 2 })], 0.8, bounds)
    .cost,
  0,
  "crossing before ignition is legal"
);
const swept = engine.laserRoute(
  { x: 120, y: 300, radius: 2.2 },
  0,
  0,
  [beam({ angle: Math.PI / 2 - 0.5, sweep: 1, age: 1 })],
  0.95,
  bounds
);
assert(
  swept.impact > 0.4 && swept.impact < 0.6,
  "a rotating beam is sampled between its safe endpoints"
);
assert(
  engine.laserGap({ x: 160, y: 300 }, beam({ width: 14, spread: 0.16 })) < 0,
  "Master Spark spreads with distance"
);

const orbit = beam({
  age: 0,
  warning: 0.2,
  anchor: {
    kind: "orbit",
    cx: 120,
    cy: 54,
    rx: 48,
    ry: 35,
    phase: 0,
    rate: Math.PI / 2,
  },
});
const pose = engine.laserPose(orbit, 1);
assert(
  Math.abs(pose.x - 120) < 0.01 &&
    Math.abs(pose.y - 89) < 0.01 &&
    Math.abs(pose.angle - Math.PI / 2) < 0.01,
  "laser origin follows its orbiting familiar"
);
assert(
  engine.laserGap({ x: 120, y: 300 }, orbit, 1) < 0,
  "AI forecast uses the future orbit origin and angle"
);
assert(
  engine.laserRoute({ x: 120, y: 300, radius: 2.2 }, 0, 0, [orbit], 1.3, bounds)
    .impact < 1.05,
  "orbit crossing is detected before impact"
);

for (const id of Object.keys(engine.cast)) {
  for (const scenario of ["warning", "crossing", "sweep", "cone", "orbit"]) {
    const g = engine.create(id, "marisa", 1977),
      s = g.state;
    s.countdown = 0;
    s.intro = null;
    s.attackReadyAt = 999;
    s.bombs = 0;
    s.player.invulnerable = 0;
    s.player.y = 300;
    s.player.x = scenario === "crossing" ? 72 : 120;
    s.lasers = [
      beam(
        scenario === "orbit"
          ? {
              age: 0,
              warning: 1.2,
              anchor: {
                kind: "orbit",
                cx: 120,
                cy: 54,
                rx: 48,
                ry: 35,
                phase: 1.02,
                rate: 0.4,
              },
            }
          : scenario === "warning"
            ? { age: 0, warning: 1.3, width: 40 }
            : scenario === "cone"
              ? { age: 0, warning: 1.4, width: 10, spread: 0.16 }
              : scenario === "sweep"
                ? { age: 0, warning: 1.2, angle: 1.02, sweep: 0.65 }
                : {}
      ),
    ];
    if (scenario === "crossing")
      s.items = [{ x: 165, y: 300, type: "power", age: 0 }];
    g.setAuto(true);
    for (let i = 0; i < 150; i++) {
      s.bullets = [];
      g.step(1 / 60);
    }
    assert.equal(s.lives, 3, `${id} avoids ${scenario} without bombs`);
    assert.equal(s.bombs, 0);
  }
  const g = flower.create(id, "marisa", 1977),
    s = g.state,
    f = s.fields[0];
  s.countdown = 0;
  s.intro = null;
  f.player.invulnerable = 0;
  f.gauge = 0;
  f.player.x = 120;
  f.lasers = [
    { x: 120, age: 0, warning: 1.25, duration: 1, width: 12, color: "#fff" },
  ];
  g.setAuto(true);
  const health = f.health;
  for (let i = 0; i < 150; i++) {
    f.bullets = [];
    f.enemies = [];
    f.waveClock = 99;
    g.step(1 / 60);
  }
  assert.equal(
    f.health,
    health,
    `${id} leaves the flower warning lane without a card`
  );
}
console.log(
  "PASS: complete laser routes, expiry/ignition, rotating beams, expanding cones; all three pilots in both modes"
);
