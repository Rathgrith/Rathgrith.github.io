/* Real emissions at the same card/music position, varying only the HUD rank. */
const assert = require("node:assert/strict");
const engine = require("../assets/js/games/danmaku-engine.js");
const patterns = require("../assets/js/games/danmaku-patterns.js");
const flower = require("../assets/js/games/danmaku-flower.js");
const dt = 1 / 60;
const mean = (values) => values.reduce((sum, n) => sum + n, 0) / values.length;
const interval = (times) => mean(times.slice(1).map((t, i) => t - times[i]));
function attack(enemy, card, rank) {
  const game = engine.create("alice", enemy, 1977),
    s = game.state;
  const index = patterns.cards[enemy].findIndex((entry) => entry.id === card);
  const phrase = engine.score.getTrack(enemy).phrases[index];
  s.countdown = 0;
  s.intro = null;
  s.time = phrase.start;
  // The production engine still computes its usual time-based HUD level. This
  // read-only test override isolates rank without changing card or recording.
  Object.defineProperty(s, "level", { get: () => rank, set() {} });
  const times = [],
    lower = [];
  let shots = 0,
    clipped = 0,
    peak = 0;
  const originals = { emit: patterns.emit, update: patterns.update };
  for (const method of ["emit", "update"]) {
    patterns[method] = function (state, time, api) {
      let emitted = 0;
      const result = originals[method](state, time, {
        ...api,
        bullet(...args) {
          const before = state.bullets.length;
          api.bullet(...args);
          if (state.bullets.length === before) clipped++;
          emitted++;
        },
      });
      if (emitted) {
        shots += emitted;
        times.push(state.time);
      }
      return result;
    };
  }
  try {
    while (s.time + dt < phrase.spellEnd) {
      s.player.x = 120;
      s.player.y = 312;
      s.player.invulnerable = Infinity;
      s.enemySpell.hp = Infinity;
      s.shots = [];
      s.items = [];
      game.step(dt);
      peak = Math.max(peak, s.bullets.length);
      if (s.enemySpell.age > 8 && s.enemySpell.remaining > 2)
        lower.push(
          s.bullets.filter(
            (b) => b.x > 0 && b.x < 240 && b.y > 155 && b.y < 350
          ).length
        );
    }
  } finally {
    Object.assign(patterns, originals);
  }
  assert(
    times.length > 5 && lower.length > 200,
    `${card}: sustained observations`
  );
  assert.equal(
    clipped,
    0,
    `${card}, rank ${rank}: no suppressed shots at the pool cap`
  );
  return {
    shots,
    events: times.length,
    interval: interval(times),
    lower: mean(lower),
    peak,
  };
}
const rows = [];
for (const enemy of Object.keys(engine.cast)) {
  for (const { id } of patterns.cards[enemy]) {
    const low = attack(enemy, id, 1),
      high = attack(enemy, id, 25);
    assert(
      high.shots > low.shots * 1.08,
      `${id}: rank increases real emitted density`
    );
    assert(
      high.interval < low.interval * 0.98,
      `${id}: real volleys/beads arrive more often`
    );
    assert(
      high.lower > low.lower,
      `${id}: lower-field density must rise despite higher velocity`
    );
    assert(high.peak < 720, `${id}: rank respects the shared bullet budget`);
    rows.push({
      card: id,
      low: low.shots,
      high: high.shots,
      intervalRatio: +(high.interval / low.interval).toFixed(3),
      lowerRatio: +(high.lower / low.lower).toFixed(3),
      peak: high.peak,
    });
  }
}

function duel(rank, bossId) {
  const game = flower.create("alice", "marisa", 1977),
    s = game.state;
  s.countdown = 0;
  s.round = rank;
  s.fields.forEach((f) => {
    f.gauge = 0;
    f.waveClock = bossId ? 999 : 0.4;
    if (bossId)
      f.boss = {
        id: bossId,
        x: 120,
        y: 53,
        age: 2,
        fire: 0,
        hp: Infinity,
        level: 3,
      };
  });
  const seen = new Set(),
    enemies = new Set(),
    times = [];
  let peak = 0;
  for (let frame = 0; frame < 9 * 60; frame++) {
    s.fields.forEach((f) => {
      f.player.invulnerable = Infinity;
      f.aiClock = 999;
      f.aiInput = {};
      f.shotClock = 999;
      f.shots = [];
    });
    game.step(dt);
    const f = s.fields[0];
    let born = 0;
    f.enemies.forEach((e) => enemies.add(e));
    f.bullets.forEach((b) => {
      if (!seen.has(b)) {
        seen.add(b);
        born++;
      }
    });
    if (born) times.push(s.time);
    peak = Math.max(peak, f.bullets.length);
  }
  return {
    shots: seen.size,
    enemies: enemies.size,
    interval: interval(times),
    peak,
  };
}
for (const id of [null, "alice", "marisa", "patchouli"]) {
  const low = duel(1, id),
    high = duel(13, id);
  assert(
    high.shots > low.shots,
    `${id || "minions"}: flower rank grows actual attack density`
  );
  assert(
    high.interval < low.interval,
    `${id || "minions"}: flower firing cadence tightens`
  );
  assert(high.peak < 420, `${id || "minions"}: no flower pool clipping`);
  if (!id)
    assert(
      high.enemies > low.enemies,
      "flower rank grows the fairy formations"
    );
}
console.table(rows);
console.log(
  "PASS: all 18 card timelines and all flower attack families increase actual emission count and frequency with rank, without emptying the lower field or clipping the pool."
);
