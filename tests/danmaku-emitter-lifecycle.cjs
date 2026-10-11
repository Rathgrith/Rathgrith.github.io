/* Exercise real score callbacks and frame updates: emitter animation must never
 * move the firing origin, drop a packet during tempo changes, or revive a doll.
 */
const assert = require("node:assert/strict");
const engine = require("../assets/js/games/danmaku-engine.js");
const alice = require("../assets/js/games/danmaku-patterns-alice.js");
const patchouli = require("../assets/js/games/danmaku-patterns-patchouli.js");
const spriteContext = { window: {} };
require("node:vm").runInNewContext(
  require("node:fs").readFileSync(
    require.resolve("../assets/js/games/danmaku-boss-sprites.js"),
    "utf8"
  ),
  spriteContext
);
const sprites = spriteContext.window.DanmakuBossSprites;

const tracked = new Set(["holland", "russia", "london", "tibet", "flare"]);
const traces = [];
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const frame = 1 / 60;
let active, gateProbe;

function record(s) {
  if (!active || !tracked.has(s.enemySpell.id) || s.enemySpell.nonspell)
    return null;
  let trace = active.bySpell.get(s.enemySpell);
  if (!trace) {
    trace = {
      card: s.enemySpell.id,
      cycle: active.cycle,
      previous: new Map(),
      seen: new Set(),
      retired: new Set(),
      generations: new Set(),
      firedCasts: new Set(),
      callbacks: 0,
      shots: 0,
      maxSources: 0,
      maxMovement: 0,
      minRadius: Infinity,
      maxRadius: 0,
      expands: 0,
      contracts: 0,
      minBeat: Infinity,
      maxBeat: 0,
    };
    active.bySpell.set(s.enemySpell, trace);
    active.traces.push(trace);
    traces.push(trace);
  }
  return trace;
}

function sameOrigin(shot, source, label, s) {
  assert(source, `${label}: firing source must exist`);
  assert.equal(source.opacity ?? 1, 1, `${label}: source must be opaque`);
  assert(
    distance({ x: shot[0], y: shot[1] }, source) < 1e-8,
    `${label}: projectile must start at the rendered source coordinate`
  );
  const rendered = sprites.deploy(s.boss, source, s.enemySpell.age, 0, false);
  assert.equal(
    rendered.opacity,
    1,
    `${label}: deployment must not hide a firing source`
  );
  assert(
    distance(source, rendered) < 1e-8,
    `${label}: renderer must not apply a second positional tween`
  );
}

const originalAliceEmit = alice.emit;
const originalPatchUpdate = patchouli.update;
alice.emit = function (s, tick, api, level) {
  const trace = record(s);
  const packet = s.enemySpell.id === "holland" || s.enemySpell.id === "russia";
  let shots = 0;
  originalAliceEmit(
    s,
    tick,
    {
      ...api,
      bullet(...shot) {
        if (trace && packet) {
          const cast = Math.floor(tick / 2);
          const source = alice.emitters(s).find((d) => d.cast === cast);
          sameOrigin(
            shot,
            source,
            `${trace.card} cycle ${trace.cycle} cast ${cast}`,
            s
          );
          trace.firedCasts.add(cast);
          shots++;
        } else if (trace) {
          const source = alice
            .emitters(s)
            .find((d) => distance(d, { x: shot[0], y: shot[1] }) < 1e-8);
          sameOrigin(shot, source, `${trace.card} cycle ${trace.cycle}`, s);
          trace.shots++;
        }
        api.bullet(...shot);
      },
    },
    level
  );
  if (trace && packet) {
    // The original seven/six packet spokes contain six grains each. This is
    // also a regression for a clock mismatch silently returning no source.
    const expected = tick % 2 ? 0 : trace.card === "holland" ? 42 : 36;
    assert.equal(
      shots,
      expected,
      `${trace.card}: packet at local half-beat ${tick}`
    );
    trace.callbacks++;
    trace.shots += shots;
  }
};
patchouli.update = function (s, dt, api, level) {
  const trace = record(s);
  if (gateProbe && gateProbe.state === s) {
    gateProbe.calls++;
    assert.equal(dt, frame, "Royal resume integrates only the current frame");
  }
  originalPatchUpdate(
    s,
    dt,
    {
      ...api,
      bullet(...shot) {
        if (gateProbe && gateProbe.state === s) gateProbe.frameShots++;
        if (trace && trace.card === "flare") {
          const source = patchouli
            .emitters(s)
            .find((d) => distance(d, { x: shot[0], y: shot[1] }) < 1e-8);
          sameOrigin(shot, source, `Royal Flare cycle ${trace.cycle}`, s);
          trace.shots++;
        }
        api.bullet(...shot);
      },
    },
    level
  );
};

function royalEngineGates() {
  active = null;
  const game = engine.create("alice", "patchouli", 1977),
    s = game.state;
  const stage = engine.cards.patchouli.findIndex((card) => card.id === "flare");
  s.time = engine.score.getTrack("patchouli").phrases[stage].start;
  s.countdown = 0;
  gateProbe = { state: s, calls: 0, frameShots: 0 };
  function step() {
    gateProbe.frameShots = 0;
    s.player.invulnerable = Infinity;
    game.step(frame);
    assert(
      gateProbe.frameShots <= patchouli.emitters(s).length,
      "Royal recovery never dumps an accumulated bead backlog in one frame"
    );
    return gateProbe.frameShots;
  }
  // Enter through the engine declaration gate and wait for overlapping cores.
  for (let f = 0; f < 1200 && patchouli.emitters(s).length < 6; f++) {
    s.enemySpell.hp = Infinity;
    s.shots = [];
    step();
  }
  assert.equal(patchouli.emitters(s).length, 6);
  const coreState = () => JSON.stringify(s.enemySpell.patchouli.flare);
  const beforePause = coreState(),
    callsBeforePause = gateProbe.calls;
  game.pause();
  const pausedState = JSON.stringify(s);
  for (let f = 0; f < 90; f++) game.step(frame);
  assert.equal(
    JSON.stringify(s),
    pausedState,
    "Royal engine pause freezes all combat state"
  );
  assert.equal(
    gateProbe.calls,
    callsBeforePause,
    "Royal update is not called while paused"
  );
  game.resume();
  while (s.countdown > 0) step();
  assert.equal(
    coreState(),
    beforePause,
    "Resume countdown does not advance Royal generations"
  );
  assert.equal(gateProbe.calls, callsBeforePause);
  s.shots = [];
  step();
  assert.equal(
    gateProbe.calls,
    callsBeforePause + 1,
    "First resumed frame runs exactly one Royal update"
  );

  // Cause a real HP clear through the engine's player-shot collision path.
  s.enemySpell.hp = 1;
  s.shots = [{ x: s.boss.x, y: s.boss.y, vx: 0, vy: 0, damage: 2 }];
  step();
  assert.equal(
    s.enemySpell.clears,
    1,
    "Player damage activates the HP-clear gate"
  );
  assert.equal(
    s.bullets.length,
    0,
    "HP clear removes the existing Royal beads"
  );
  const afterClear = coreState(),
    callsAfterClear = gateProbe.calls;
  const idsAfterClear = patchouli.emitters(s).map((source) => source.id);
  while (s.time + frame < s.attackReadyAt - 1e-8) {
    s.shots = [];
    step();
    assert.equal(
      gateProbe.calls,
      callsAfterClear,
      "HP-clear ceasefire gates continuous Royal update"
    );
    assert.equal(
      s.bullets.length,
      0,
      "No beads leak through the HP-clear pause"
    );
  }
  assert.equal(
    coreState(),
    afterClear,
    "HP clear preserves the live source generations"
  );
  s.shots = [];
  step();
  assert.equal(
    gateProbe.calls,
    callsAfterClear + 1,
    "HP-clear recovery integrates one current frame without catch-up"
  );
  assert.deepEqual(
    patchouli.emitters(s).map((source) => source.id),
    idsAfterClear,
    "Recovery continues the same live cores instead of restarting generation zero"
  );
  let resumedShots = gateProbe.frameShots;
  for (let f = 0; f < 30; f++) {
    s.shots = [];
    resumedShots += step();
  }
  assert(resumedShots > 0, "Royal beads resume after the HP-clear ceasefire");
  gateProbe = null;
}

function sample(s) {
  const trace = record(s);
  if (!trace) return;
  const sources = (s.enemyId === "alice" ? alice : patchouli).emitters(s);
  const ids = new Set(sources.map((source) => source.id));
  assert.equal(
    ids.size,
    sources.length,
    `${trace.card}: unique live source IDs`
  );
  trace.maxSources = Math.max(trace.maxSources, sources.length);
  trace.minBeat = Math.min(trace.minBeat, s.rhythm.beatDuration);
  trace.maxBeat = Math.max(trace.maxBeat, s.rhythm.beatDuration);
  const limit = { holland: 8, russia: 11, london: 7, tibet: 6, flare: 6 }[
    trace.card
  ];
  assert(sources.length <= limit, `${trace.card}: live sources stay bounded`);
  if (trace.card === "london" || trace.card === "tibet") {
    assert.equal(
      sources.length,
      limit,
      `${trace.card}: preserve the original ring count`
    );
    const radius = distance(sources[0], s.boss);
    trace.minRadius = Math.min(trace.minRadius, radius);
    trace.maxRadius = Math.max(trace.maxRadius, radius);
    if (trace.lastRadius !== undefined) {
      if (radius > trace.lastRadius + 0.01) trace.expands++;
      if (radius < trace.lastRadius - 0.01) trace.contracts++;
    }
    trace.lastRadius = radius;
  }
  const generations = new Map();
  for (const source of sources) {
    assert(Number.isFinite(source.x) && Number.isFinite(source.y));
    assert(
      !trace.retired.has(source.id),
      `${trace.card}: retired ${source.id} cannot reappear`
    );
    const prior = trace.previous.get(source.id);
    // Orbiting groups share the boss's declaration entrance. Once deployed,
    // movement is continuous; explicitly deployed packet/flare sources are
    // checked from their first appearance, including later generations.
    if (prior && (source.deployed || s.enemySpell.age > 2.15)) {
      const movement = distance(source, prior);
      trace.maxMovement = Math.max(trace.maxMovement, movement);
      assert(
        movement < (trace.card === "flare" ? 12 : 4),
        `${trace.card}: ${source.id} cannot teleport between 60Hz frames (${movement}, age=${s.enemySpell.age})`
      );
    }
    trace.seen.add(source.id);
    if (source.generation !== undefined) {
      trace.generations.add(source.generation);
      generations.set(
        source.generation,
        (generations.get(source.generation) || 0) + 1
      );
    }
  }
  if (trace.card === "flare") {
    assert(
      generations.size <= 2,
      "Royal Flare overlaps at most two generations"
    );
    for (const count of generations.values())
      assert.equal(
        count,
        3,
        "Royal Flare preserves three heads in each generation"
      );
  }
  for (const id of trace.previous.keys())
    if (!ids.has(id)) trace.retired.add(id);
  trace.previous = new Map(sources.map((source) => [source.id, { ...source }]));
}

try {
  for (const cycle of [0, 1, 3, 6]) {
    for (const enemy of ["alice", "patchouli"]) {
      const game = engine.create("alice", enemy, 1977);
      const s = game.state;
      const track = engine.score.getTrack(enemy);
      active = { cycle, bySpell: new WeakMap(), traces: [] };
      s.countdown = 0;
      s.time = cycle * track.duration;
      for (let f = 0; f < Math.ceil(track.duration / frame) + 2; f++) {
        s.player.invulnerable = Infinity;
        s.enemySpell.hp = Infinity;
        s.shots = [];
        s.items = [];
        game.step(frame);
        if (s.intermission) break;
        sample(s);
        // Flight/collision/density have their own tests. Releasing projectiles
        // here also proves cancelled bullets do not reset the emitter clock.
        s.bullets = [];
        s.lasers = [];
      }
      for (const card of enemy === "alice"
        ? ["holland", "russia", "london", "tibet"]
        : ["flare"]) {
        const trace = active.traces.find((entry) => entry.card === card);
        assert(trace, `${enemy} cycle ${cycle}: full score reaches ${card}`);
        assert(
          trace.maxBeat - trace.minBeat > 0.015,
          `${card}: exercise the recording's changing beat durations`
        );
        if (card === "london" || card === "tibet") {
          assert(
            trace.maxRadius - trace.minRadius > 18,
            `${card}: ring unfolds`
          );
          assert(
            trace.expands > 100 && trace.contracts > 100,
            `${card}: continuous expansion and contraction both occur`
          );
          assert.equal(
            trace.retired.size,
            0,
            `${card}: persistent ring is not respawned`
          );
        } else {
          assert(
            trace.generations.size >= 3,
            `${card}: multiple generations are exercised`
          );
          assert(
            trace.retired.size > 0,
            `${card}: old source IDs leave the field`
          );
          assert(
            trace.shots > 100,
            `${card}: enough real projectile emissions are checked`
          );
          if (card !== "flare") {
            assert(
              trace.firedCasts.size > 30,
              `${card}: no short opening-only test`
            );
            assert(
              trace.seen.size > trace.maxSources * 3,
              `${card}: fresh summons replace old ones`
            );
          } else {
            assert.equal(
              trace.maxSources,
              6,
              "Royal Flare visibly overlaps old and new cores"
            );
            assert(
              trace.maxMovement > 0.1,
              "Royal Flare heads continuously move"
            );
          }
        }
      }
    }
  }
  royalEngineGates();
} finally {
  alice.emit = originalAliceEmit;
  patchouli.update = originalPatchUpdate;
}

console.table(
  traces.map(
    ({ card, cycle, shots, maxSources, maxMovement, seen, retired }) => ({
      card,
      cycle,
      shots,
      maxSources,
      maxMovement: +maxMovement.toFixed(3),
      uniqueSources: seen.size,
      retired: retired.size,
    })
  )
);
console.log(
  "Emitter lifecycle: actual music rounds 0/1/3/6 retain visible origins, bounded generations and continuous motion."
);
