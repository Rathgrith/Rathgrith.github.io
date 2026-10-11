/* London and Tibet share a colour family, but not source choreography.
 * Check observed motion/shape and the explicit music adaptation, not fingerprints
 * or an unsupported claim about the original game's exact angular rate.
 */
const assert = require("node:assert/strict");
const engine = require("../assets/js/games/danmaku-engine.js");
const alice = require("../assets/js/games/danmaku-patterns-alice.js");
const patterns = require("../assets/js/games/danmaku-patterns.js");
const frame = 1 / 60;
const colourOrder = ["#87e2ac", "#939bff", "#f4ec92", "#91e5e9"];
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const span = (values) => Math.max(...values) - Math.min(...values);
const near = (a, b, label) => assert(Math.abs(a - b) < 1e-7, label);
const traces = new Map();
const originalEmit = alice.emit;

alice.emit = function (s, tick, api, level) {
  const trace = traces.get(s.enemySpell.id);
  if (!trace) return originalEmit(s, tick, api, level);
  const bullets = [];
  originalEmit(
    s,
    tick,
    {
      ...api,
      bullet(...shot) {
        bullets.push(shot);
        api.bullet(...shot);
      },
    },
    level
  );
  if (!bullets.length) return;
  const sources = alice.emitters(s);
  for (const shot of bullets) {
    const source = sources.find(
      (e) => distance(e, { x: shot[0], y: shot[1] }) < 1e-8
    );
    assert(source, `${trace.id}: every projectile has a visible source`);
    assert.equal(
      source.opacity ?? 1,
      1,
      `${trace.id}: firing sources are opaque`
    );
  }
  trace.volleys.push({ tick, colour: bullets[0][4], bullets });
};

try {
  for (const id of ["london", "tibet"]) {
    const index = patterns.cards.alice.findIndex((card) => card.id === id);
    const phrase = engine.score.getTrack("alice").phrases[index];
    const game = engine.create("alice", "alice", 1977),
      s = game.state;
    const trace = { id, volleys: [], centers: [], radii: [], maxStep: 0 };
    traces.set(id, trace);
    s.countdown = 0;
    s.intro = null;
    s.time = phrase.start;
    let previous;
    while (s.time + frame < phrase.spellEnd) {
      s.player.invulnerable = Infinity;
      s.enemySpell.hp = Infinity;
      s.shots = [];
      s.items = [];
      game.step(frame);
      // Keep this an emitter test; existing live projectile tests cover flight.
      s.bullets = [];
      s.lasers = [];
      if (s.enemySpell.age < 5) continue;
      const sources = alice.emitters(s);
      assert.equal(sources.length, id === "london" ? 7 : 6);
      const center = {
        x: sources.reduce((sum, e) => sum + e.x, 0) / sources.length,
        y: sources.reduce((sum, e) => sum + e.y, 0) / sources.length,
      };
      near(center.x, s.boss.x, `${id}: the source group follows its boss`);
      near(center.y, s.boss.y, `${id}: no separate invisible source center`);
      trace.centers.push(center);
      trace.radii.push(distance(sources[0], center));
      if (previous)
        trace.maxStep = Math.max(trace.maxStep, distance(center, previous));
      previous = center;
    }
    assert(trace.centers.length > 900, `${id}: observe several colour phases`);
  }
} finally {
  alice.emit = originalEmit;
}

const london = traces.get("london"),
  tibet = traces.get("tibet");
assert(
  span(london.centers.map((p) => p.x)) > 70,
  "London relocates the boss and seven-source center across the upper field, not a small idle sway"
);
assert(london.maxStep < 4, "London relocations stay continuous at 60 Hz");
assert(
  span(london.radii) > 8,
  "London gathers its dolls between relocated waves"
);
assert(
  span(tibet.centers.map((p) => p.x)) < 1e-5,
  "Tibet holds its horizontal center"
);
assert(
  span(tibet.centers.map((p) => p.y)) < 1e-5,
  "Tibet holds its vertical center"
);
assert(
  span(tibet.radii) < 1e-5,
  "Tibet's orbit does not inherit London's gathering animation"
);

for (const trace of [london, tibet]) {
  const phases = trace.volleys.filter(
    (v, i, all) => !i || v.colour !== all[i - 1].colour
  );
  assert.deepEqual(
    phases.slice(0, 4).map((v) => v.colour),
    colourOrder
  );
  assert(
    phases.length >= 8,
    `${trace.id}: observe a repeated four-colour cycle`
  );
  // The quantized arrangement tightens the yellow/cyan handoff. This is not
  // an assertion of frame-exact native timings or a different colour family.
  assert(
    phases[3].tick - phases[2].tick < phases[1].tick - phases[0].tick,
    `${trace.id}: the final colour pair is closer than the opening pair`
  );
  const shape = trace.id === "london" ? "rice" : "scale";
  for (const volley of trace.volleys) {
    assert(volley.bullets.every((b) => b[5] === shape));
    assert(volley.bullets.every((b) => b[4] === volley.colour));
  }
  for (const colour of colourOrder) {
    const shot = trace.volleys.find((v) => v.colour === colour).bullets[0];
    const bullet = {
      x: shot[0],
      y: shot[1],
      vx: Math.cos(shot[2]) * shot[3],
      vy: Math.sin(shot[2]) * shot[3],
      heading: shot[2],
      age: 0,
      motion: shot[6] || null,
      curve: shot[6]?.turn || 0,
      curveDecay: shot[6]?.decay || 0,
    };
    const heading = shot[2];
    for (let f = 0; f < 360; f++) {
      assert(
        patterns.advanceBullet(bullet, frame, () => {}),
        "these rings do not split"
      );
      assert(Number.isFinite(bullet.x) && Number.isFinite(bullet.y));
    }
    const turn = Math.abs(
      Math.atan2(
        Math.sin(bullet.heading - heading),
        Math.cos(bullet.heading - heading)
      )
    );
    if (trace.id === "london") {
      near(turn, 0, "London rice keeps its launch direction");
      near(
        distance(bullet, { x: shot[0], y: shot[1] }),
        shot[3] * 6,
        "London rice travels straight"
      );
    } else {
      assert(
        turn > 0.04 && turn < 0.4,
        "Tibet scales bend gently, not a straight copy or an orbit"
      );
      assert(
        Math.abs(bullet.curve) < 0.01,
        "Tibet turning decays instead of trapping scales in circles"
      );
    }
  }
}

// Emptying the HP bar briefly gates firing, not the music or doll choreography.
// Clear while the London ring is gathering so a stale emission-clock anchor
// cannot conceal a jump until the next attack resumes.
{
  const index = patterns.cards.alice.findIndex((card) => card.id === "london");
  const game = engine.create("alice", "alice", 1977),
    s = game.state;
  s.time = engine.score.getTrack("alice").phrases[index].start;
  s.countdown = 0;
  s.intro = null;
  let cleared = false,
    previous,
    maxMovement = 0;
  while (s.enemySpell.age < 8) {
    s.player.invulnerable = Infinity;
    s.enemySpell.hp = Infinity;
    s.shots = [];
    s.bullets = [];
    s.items = [];
    if (!cleared && s.enemySpell.age >= 6.25) {
      s.enemySpell.hp = 1;
      s.shots = [{ x: s.boss.x, y: s.boss.y, vx: 0, vy: 0, damage: 2 }];
      cleared = true;
    }
    game.step(frame);
    const sources = alice.emitters(s);
    if (cleared && previous)
      sources.forEach((source, i) => {
        maxMovement = Math.max(maxMovement, distance(source, previous[i]));
      });
    previous = sources;
  }
  assert.equal(s.enemySpell.clears, 1, "Exercise a real HP-clear ceasefire");
  assert(
    maxMovement < 4,
    `London dolls remain continuous through ceasefire/resume (${maxMovement.toFixed(2)}px maximum frame step)`
  );
}
console.log(
  "PASS: London's moving/gathering rice formations and Tibet's fixed-center curved scales, source alignment and colour-phase timing."
);
