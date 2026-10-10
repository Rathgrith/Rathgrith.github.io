const assert = require("node:assert/strict");
const engine = require("../assets/js/games/danmaku-engine.js");
const patterns = require("../assets/js/games/danmaku-patterns.js");
const fingerprints = new Set();
for (const enemy of Object.keys(engine.cast)) {
  const track = engine.score.getTrack(enemy),
    game = engine.create("alice", enemy, 1977),
    s = game.state;
  s.countdown = 0;
  s.player.invulnerable = Infinity;
  const seen = new Map();
  for (let frame = 0; frame < track.duration * 60; frame++) {
    s.enemySpell.hp = Infinity;
    s.shots = [];
    s.items = [];
    game.step(1 / 60);
    if (!s.enemySpell.nonspell || s.intermission) continue;
    assert.equal(
      s.enemySpell.nonspellName,
      patterns.nonspells[s.enemySpell.id]
    );
    if (!seen.has(s.enemySpell.id))
      seen.set(s.enemySpell.id, { frames: 0, peak: 0 });
    const phase = seen.get(s.enemySpell.id);
    phase.frames++;
    phase.peak = Math.max(phase.peak, s.bullets.length + s.lasers.length);
    assert(
      s.lasers.every((l) => l.warning >= 0.8),
      "nonspell lasers retain charge warnings"
    );
    assert(
      s.bullets.every((b) => Number.isFinite(b.x + b.y + b.vx + b.vy)),
      "finite nonspell trajectories"
    );
  }
  assert.deepEqual(
    [...seen.keys()],
    patterns.cards[enemy].map((c) => c.id),
    "each spell has its own playable interlude"
  );
  for (const phase of seen.values()) {
    assert(
      phase.frames >= 7 * 60,
      "interlude lasts long enough to see its pattern"
    );
    assert(
      phase.peak > 0 && phase.peak < 360,
      "nonspell actually emits, with room to breathe"
    );
  }
  for (const [stage, card] of patterns.cards[enemy].entries()) {
    const fixture = engine.create("alice", enemy, 1977).state;
    fixture.enemySpell = { ...card, nonspell: true };
    fixture.boss = { x: 120, y: 54 };
    const emissions = [];
    for (let tick = 0; tick < 64; tick++) {
      fixture.time = track.phrases[stage].start + tick * 0.2;
      fixture.rhythm = engine.score.at(enemy, fixture.time);
      patterns.emit(fixture, tick, {
        bullet: (...args) => emissions.push(["bullet", tick, ...args]),
        laser: (...args) => emissions.push(["laser", tick, ...args]),
      });
    }
    assert(emissions.length > 0);
    fingerprints.add(JSON.stringify(emissions));
  }
}
assert.equal(
  fingerprints.size,
  18,
  "all eighteen interludes have distinct formation/rhythm signatures"
);
console.log(
  "PASS: eighteen distinct playable nonspells, character-specific names, real phase duration, actual emissions, finite trajectories, bounded density and safe laser warnings."
);
