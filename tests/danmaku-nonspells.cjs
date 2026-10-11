const assert = require("node:assert/strict");
const engine = require("../assets/js/games/danmaku-engine.js");
const patterns = require("../assets/js/games/danmaku-patterns.js");
const mean = (a) =>
  a.reduce((sum, value) => sum + value, 0) / Math.max(1, a.length);
const quantile = (a, q) =>
  [...a].sort((a, b) => a - b)[Math.floor((a.length - 1) * q)] || 0;
// Pre-tuning lower-field populations, sampled over the same complete recordings
// at x=60/120/180. Guard against losing the new pressure without prescribing a
// common pattern or forcing every card into monotonically denser coverage.
const prior = {
  0: [
    13.726, 6.943, 7, 27.222, 8.007, 22.342, 9.14, 8.548, 4.744, 3.429, 18.682,
    39.558, 9.064, 9.473, 14.447, 21.313, 8.264, 6.16,
  ],
  6: [
    19.867, 8.943, 8.674, 33, 9.333, 25.329, 12.372, 12.175, 6.163, 4.214,
    22.457, 49.442, 10.716, 11.194, 13.702, 26.208, 9.276, 6.694,
  ],
};

function sample(s, phase) {
  const bullets = s.bullets.filter(
    (b) => b.x > 0 && b.x < 240 && b.y > 155 && b.y < 350
  );
  const beams = s.lasers.filter(
    (l) => l.age + 0.2 >= l.warning && l.age < l.warning + l.duration
  );
  let blocked = 0,
    total = 0,
    widest = 0;
  for (let y = 168; y <= 336; y += 12) {
    let gap = 0;
    for (let x = 12; x <= 228; x += 8) {
      const hit =
        bullets.some((b) =>
          [0, 0.2].some(
            (t) =>
              Math.hypot(x - b.x - b.vx * t, y - b.y - b.vy * t) <
              b.radius + 10.2
          )
        ) || beams.some((l) => engine.laserGap({ x, y }, l) < 10.2);
      total++;
      if (hit) {
        blocked++;
        gap = 0;
      } else {
        gap += 8;
        widest = Math.max(widest, gap);
      }
    }
  }
  // Comfort coverage can approach 100% in a patterned wave without producing a
  // collision wall. Check actual player/bullet hitboxes separately.
  let actualWidest = 0,
    clear = 0,
    actualTotal = 0;
  for (const y of [216, 264, 312]) {
    let gap = 0;
    for (let x = 8; x <= 232; x += 4) {
      const hit =
        bullets.some(
          (b) => Math.hypot(x - b.x, y - b.y) < b.radius + s.player.radius
        ) ||
        beams.some(
          (l) =>
            l.age >= l.warning && engine.laserGap({ x, y }, l) < s.player.radius
        );
      actualTotal++;
      if (hit) gap = 0;
      else {
        clear++;
        gap += 4;
        actualWidest = Math.max(actualWidest, gap);
      }
    }
  }
  phase.count.push(bullets.length);
  phase.coverage.push(blocked / total);
  phase.gap.push(widest);
  phase.minGap = Math.min(phase.minGap, actualWidest);
  phase.minClear = Math.min(phase.minClear, clear / actualTotal);
}

function measure(cycle) {
  const rows = [];
  for (const enemy of Object.keys(engine.cast)) {
    const track = engine.score.getTrack(enemy);
    const samples = patterns.cards[enemy].map(() => ({
      frames: 0,
      peak: 0,
      count: [],
      coverage: [],
      gap: [],
      minGap: 240,
      minClear: 1,
    }));
    for (const x of [60, 120, 180]) {
      const game = engine.create("alice", enemy, 1977),
        s = game.state;
      s.countdown = 0;
      s.intro = null;
      s.time = cycle * track.duration;
      for (let frame = 0; frame < track.duration * 60; frame++) {
        s.player.x = x;
        s.player.y = 312;
        s.player.invulnerable = Infinity;
        s.enemySpell.hp = Infinity;
        s.shots = [];
        s.items = [];
        game.step(1 / 60);
        if (s.intermission) break;
        if (!s.enemySpell.nonspell) continue;
        assert.equal(
          s.enemySpell.nonspellName,
          patterns.nonspells[s.enemySpell.id]
        );
        const phase = samples[s.rhythm.section];
        phase.frames++;
        phase.peak = Math.max(phase.peak, s.bullets.length);
        assert(
          s.lasers.every((l) => l.warning >= 0.8),
          "Nonspell lasers retain readable warnings"
        );
        assert(
          s.bullets.every((b) => Number.isFinite(b.x + b.y + b.vx + b.vy)),
          "Finite nonspell trajectories"
        );
        if (frame % 12 === 0) sample(s, phase);
      }
    }
    samples.forEach((phase, stage) => {
      const card = patterns.cards[enemy][stage].id;
      const label = `${enemy}/${card} cycle ${cycle}`;
      assert(
        phase.frames >= 3 * 7 * 60,
        `${label}: complete playable interlude`
      );
      assert(
        phase.count.length >= 100,
        `${label}: sufficient full-phrase samples`
      );
      assert(
        phase.peak > 0 && phase.peak < 360,
        `${label}: preserve pool headroom (${phase.peak})`
      );
      assert(
        phase.minGap >= 24 && phase.minClear >= 0.25,
        `${label}: retain actual collision gaps`
      );
      assert(mean(phase.gap) >= 72, `${label}: retain room to reposition`);
      const bullets = mean(phase.count);
      assert(
        bullets >= prior[cycle][rows.length] * 1.1,
        `${label}: stronger lower-field pressure (${bullets})`
      );
      rows.push({
        enemy,
        card,
        bullets,
        coverage: mean(phase.coverage),
        p90: quantile(phase.coverage, 0.9),
        gap: mean(phase.gap),
        minGap: phase.minGap,
        minClear: phase.minClear,
        peak: phase.peak,
        samples: phase.count.length,
      });
    });
  }
  return { cycle, rows };
}

function distinctPatterns() {
  const fingerprints = new Set();
  for (const enemy of Object.keys(engine.cast)) {
    const track = engine.score.getTrack(enemy);
    for (const [stage, card] of patterns.cards[enemy].entries()) {
      const s = engine.create("alice", enemy, 1977).state;
      s.enemySpell = { ...card, nonspell: true };
      s.boss = { x: 120, y: 54 };
      const emissions = [];
      for (let tick = 0; tick < 64; tick++) {
        s.time = track.phrases[stage].start + tick * 0.2;
        s.rhythm = engine.score.at(enemy, s.time);
        patterns.emit(s, tick, {
          bullet: (...args) => emissions.push(["bullet", tick, ...args]),
          laser: (...args) => emissions.push(["laser", tick, ...args]),
        });
      }
      assert(emissions.length > 0, `${card.id}: actual emissions`);
      fingerprints.add(JSON.stringify(emissions));
    }
  }
  assert.equal(
    fingerprints.size,
    18,
    "All interludes retain distinct formation/rhythm signatures"
  );
}

module.exports = measure;
if (require.main === module) {
  distinctPatterns();
  for (const cycle of [0, 6]) {
    const report = measure(cycle);
    for (const enemy of Object.keys(engine.cast))
      console.log(
        `cycle ${cycle} ${enemy}: ` +
          report.rows
            .filter((r) => r.enemy === enemy)
            .map(
              (r) =>
                `${r.card} ${r.bullets.toFixed(1)} lower / ${Math.round(r.coverage * 100)}% / peak ${r.peak}`
            )
            .join(", ")
      );
  }
  console.log(
    "PASS: 18 distinct nonspells at opening/late rounds, stronger lower-field pressure, finite trajectories, readable warnings, real collision gaps and pool headroom."
  );
}
