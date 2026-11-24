const assert = require("node:assert/strict");
const {
  scene,
  pulse,
  stepShot,
  patterns,
} = require("./helpers/danmaku-pattern-trace.cjs");
const signatures = new Set(),
  names = new Set();
for (const [enemy, deck] of Object.entries(patterns.cards)) {
  assert.equal(deck.length, 6);
  for (const { id, name } of deck) {
    names.add(name);
    const a = scene(enemy, id),
      b = scene(enemy, id);
    const trace = Array.from({ length: 48 }, (_, t) => pulse(a, t));
    assert.deepEqual(
      trace,
      Array.from({ length: 48 }, (_, t) => pulse(b, t + 37)),
      id + " begins on its own downbeat"
    );
    assert(
      trace.some((e) => e.shots.length),
      id + " has actual bullets"
    );
    assert(
      trace.flatMap((e) => e.beams).every((l) => l[4] >= 1.1 && l[3] <= 5),
      id + " narrow, telegraphed beams"
    );
    signatures.add(JSON.stringify(trace));
  }
}
assert.equal(signatures.size, 18);
assert.equal(names.size, 18);
for (const [enemy, id, count] of [
  ["marisa", "spectrograph", 8],
  ["patchouli", "footnote", 2],
]) {
  const parent = pulse(scene(enemy, id), 0).shots[0],
    before = stepShot(parent, 0.4),
    after = stepShot(parent, 2);
  assert(before.alive);
  assert(!after.alive);
  assert.equal(after.children.length, count);
  assert(
    after.children.every((child) => child[5] !== parent[5]),
    id + " split changes the visible shape"
  );
}
// The delayed annotation in the first book points to the same moving blank as the main line.
for (const rank of [1, 25]) {
  const state = scene("patchouli", "bookmark", rank);
  for (let tick = 0; tick < 54; tick++) {
    const { shots } = pulse(state, tick);
    if (tick % 3 !== 0 && tick % 6 !== 4) continue;
    const shelf = [52, 94, 140, 184, 140, 94][Math.floor(tick / 9) % 6];
    assert(shots.length >= 3);
    for (const [x, y, angle] of shots) {
      if (Math.sin(angle) <= 0) continue;
      assert(Math.abs(x + (292 - y) / Math.tan(angle) - shelf) > 24);
    }
  }
}
// Delayed layers from separate sources must project a real common passage.
for (const [enemy, id, y] of [
  ["patchouli", "concordance", 282],
]) {
  const state = scene(enemy, id, 25);
  for (let tick = 0; tick < 108; tick++) {
    const { shots } = pulse(state, tick);
    const pass = Math.floor(tick / 3);
    const x = 106 + 42 * Math.sin(pass * 0.2);
    for (const [fromX, fromY, angle] of shots) {
      const crossing = fromX + (y - fromY) / Math.tan(angle);
      assert(
        Math.abs(crossing - x) > 24,
        id + " leaves a common passage at full rank"
      );
    }
  }
}
const stopped = pulse(scene("patchouli", "erratum"), 0).shots[0];
const pause = stepShot(stopped, 1.3).b,
  resumed = stepShot(stopped, 1.7).b;
assert(Math.hypot(pause.vx, pause.vy) < 0.01);
assert(Math.hypot(resumed.vx, resumed.vy) > 55);
const bank = pulse(scene("marisa", "bankshot"), 0).shots.at(-1);
const rebound = stepShot(bank, 8).b;
assert.equal(rebound.banks, 1);
assert(Math.abs(Math.hypot(rebound.vx, rebound.vy) - bank[3]) < 0.0001);
console.log(
  "PASS: 18 independent full-phrase scores, seeded choreography, timed prism/footnote splits, ink pause/release, one-bank ricochet and readable beam warnings."
);

// Keep emitter age, boss position and rank identical. Only music time changes.
// Compare the actual trajectories, including delayed splits, curved returns
// and laser placement, across otherwise identical local half-beats.
function strophe(enemy, card, part, rank) {
  const s = scene(enemy, card, rank);
  s.rhythm.sectionStart = 30;
  s.rhythm.spellEnd = 60;
  s.time = 36 + 10 * part;
  const events = [];
  for (let tick = 0; tick < 36; tick++) {
    s.player.x = tick < 9 ? 50 : 176;
    const {shots, beams} = pulse(s, tick);
    events.push([beams, shots.map(shot => {
      const {b, children} = stepShot(shot, 1.7);
      return [Math.round(b.x), Math.round(b.y), Math.round(b.vx), Math.round(b.vy),
        children.map(child => [Math.round(child[2] * 30), Math.round(child[3])])];
    })]);
  }
  return JSON.stringify(events);
}
for (const [enemy, deck] of Object.entries(patterns.cards)) {
  for (const {id} of deck) {
    for (const rank of [1,25]) {
      const variants = new Set([0,1,2].map(part => strophe(enemy, id, part, rank)));
      assert.equal(variants.size, 3, id + ": all three musical sections change live trajectories");
    }
  }
}

// Bait the photographic plate at A, then move to B.
// On the reprise the second shooter works from A, although the new lead shot
// was aimed at B. Subsequent movement cannot steer either already-fired wave.
for (const [enemy, id, clock] of [["marisa","exposure",8]]) {
  function copy(initial) {
    const s = scene(enemy, id);
    Object.assign(s.rhythm, {sectionStart: 30, spellEnd: 60});
    s.time = 56;
    const lead = enemy === "alice" ? 0 : 3, echo = enemy === "alice" ? 3 : 5;
    let prior, next;
    const change = clock * 2;
    for (let tick = 0; tick <= change + echo; tick++) {
      s.player.x = tick < change ? initial : 137;
      const shot = pulse(s,tick).shots;
      if (tick === change + lead) next=shot;
      if (tick === change + echo) prior=shot;
    }
    return {next, prior};
  }
  const west=copy(42), east=copy(199);
  assert.deepEqual(west.next,east.next, id + ": the new leader samples the new position");
  assert.notDeepEqual(west.prior,east.prior, id + ": the other emitter replays the old position");
}
console.log("PASS: 18 cards × 3 distinct musical sections at low and high rank; two-source targeting memory.");

// Sample every bullet in the same volley at the same time, after its last
// accent releases. Include clipping by the passage and field edges.
const drawnOnBeat = new Set(["buttonhole", "basting", "spectrograph", "shutter", "erratum", "palimpsest"]);
for (const [enemy, cards] of Object.entries(patterns.cards)) {
  const source = require("../assets/js/games/danmaku-patterns-" + enemy + ".js");
  const original = source.emit;
  const seen = new Set();
  source.emit = (s, tick, api, d, brush) => original(s, tick, api, d, {
    ...brush,
    figure(emitter, origin, config) {
      const volley = [];
      brush.figure({bullet(...shot) {
        emitter.bullet(...shot);
        volley.push(shot);
      }}, origin, config);
      const scripted = drawnOnBeat.has(s.enemySpell.id);
      assert(volley.length && volley.every(shot => Boolean(shot[6]?.inscription) === scripted),
        s.enemySpell.id + ": the correct immediate or downbeat strategy is used");
      const lastLaunch = Math.max(...volley.map(shot => shot[6]?.inscription?.launch || 0));
      const points = volley.map(shot => stepShot(shot, lastLaunch + 1.65).b)
        .filter(p => p.x > 0 && p.x < 240 && p.y > 0 && p.y < 360);
      const wide = key => Math.max(...points.map(p=>p[key])) - Math.min(...points.map(p=>p[key]));
      assert(points.length >= 12 && wide("x") >= 25 && wide("y") >= 25,
        s.enemySpell.id + ": the open figure still forms a recognisable two-dimensional pattern");
      seen.add(s.enemySpell.id + "/" + d.part);
    },
  });
  try {
    for (const {id} of cards) {
      for (let part=0; part<3; part++) {
        const s=scene(enemy,id,25);
        Object.assign(s.rhythm,{sectionStart:30,spellEnd:60});
        s.time=35+10*part;
        for(let tick=0; tick<96; tick++) {
          s.enemySpell.age=5+tick/7;
          pulse(s,tick);
        }
      }
    }
  } finally { source.emit=original; }
  const ordinary = cards.filter(c => !["slingshot", "parallax"].includes(c.id));
  assert.equal(seen.size, ordinary.length * 3, enemy + ": each mathematical interlude uses the authored figure");
}
// These two optical instruments make their shapes by the actual motion of the
// bullets. Sample their trajectories as the game does, including tangent release.
for (const part of [0, 1, 2]) {
  const preparation = id => {
    const s = scene("marisa", id, 25);
    Object.assign(s.rhythm, {sectionStart: 30, spellEnd: 60});
    s.time = 35 + 10 * part;
    return s;
  };
  const orbital = preparation("slingshot");
  const trains = pulse(orbital, 0).shots;
  const [left, right] = patterns.emitters(orbital);
  const radius = right.x - left.x;
  for (const shot of trains) {
    const until = shot[6].redirect.at;
    for (const fraction of [0.23, 0.57, 0.89]) {
      const {b} = stepShot(shot, until * fraction);
      assert(Math.abs(Math.hypot(b.x - right.x, b.y - right.y) - radius) < 1,
        "Each orbit is centred on the opposite visible lens");
    }
    const {b} = stepShot(shot, until + 0.02);
    const alignment = ((b.x - right.x) * b.vx + (b.y - right.y) * b.vy) /
      (radius * Math.hypot(b.vx, b.vy));
    assert(Math.abs(alignment) < 0.06 && b.vy > 0 && !b.curve);
  }
  const photo = preparation("parallax");
  const first = pulse(photo, 0).shots;
  const second = pulse(photo, [3, 5, 2][part]).shots;
  assert.equal(first.length, second.length);
  assert(first.length > 20 && first[0][0] !== second[0][0]);
  const plate = photo.enemySpell.plate;
  const travel = (plate.y - first[0][1]) / 76 + 0.12;
  const echoTravel = travel + (part === 2 ? 0.26 : 0);
  const vertices = [];
  first.forEach((shot, n) => {
    const a = stepShot(shot, travel).b;
    const b = stepShot(second[n], echoTravel).b;
    assert(Math.hypot(a.x - b.x, a.y - b.y) < 1,
      "Each camera must image the same visible star before the trajectories separate");
    assert(Math.abs(a.vx - b.vx) > 65);
    if (shot[5] === "star") vertices.push(a);
  });
  assert.equal(vertices.length, 7);
  assert(Math.max(...vertices.map(v => v.x)) - Math.min(...vertices.map(v => v.x)) > 70);
  assert(Math.max(...vertices.map(v => v.y)) - Math.min(...vertices.map(v => v.y)) > 25);
}
console.log("PASS: mathematical interludes, physical gravity assists and delayed two-camera constellations across all 54 sections.");
