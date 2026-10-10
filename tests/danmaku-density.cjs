const assert = require("node:assert/strict");
const measure = require("../scripts/measure-danmaku-density.cjs");
const engine = require("../assets/js/games/danmaku-engine.js");

// The report includes an 8px comfort margin and a movement forecast. Also inspect
// real hitboxes: high comfort coverage must not conceal a solid collision wall.
function measureWithClearance(cycle) {
  const probes = new Map(),
    create = engine.create;
  engine.create = function (...args) {
    const game = create(...args),
      step = game.step;
    let frame = 0;
    game.step = function (dt) {
      const result = step(dt),
        s = game.state;
      if (
        ++frame % 60 ||
        s.intermission ||
        s.enemySpell.nonspell ||
        s.enemySpell.age < 6 ||
        s.enemySpell.remaining < 2
      )
        return result;
      const key = `${s.enemyId}/${s.enemySpell.id}`;
      const probe = probes.get(key) || {
        samples: 0,
        minimumGap: Infinity,
        minimumClear: 1,
      };
      const beams = s.lasers.filter(
        (l) => l.age >= l.warning && l.age < l.warning + l.duration
      );
      let clear = 0,
        total = 0,
        widest = 0;
      for (const y of [216, 264, 312]) {
        let gap = 0;
        for (let x = 8; x <= 232; x += 4) {
          const hit =
            s.bullets.some((b) => {
              const dx = x - b.x,
                dy = y - b.y,
                radius = b.radius + s.player.radius;
              return dx * dx + dy * dy < radius * radius;
            }) ||
            beams.some((l) => engine.laserGap({ x, y }, l) < s.player.radius);
          total++;
          if (hit) gap = 0;
          else {
            clear++;
            gap += 4;
            widest = Math.max(widest, gap);
          }
        }
      }
      probe.samples++;
      probe.minimumGap = Math.min(probe.minimumGap, widest);
      probe.minimumClear = Math.min(probe.minimumClear, clear / total);
      probes.set(key, probe);
      return result;
    };
    return game;
  };
  try {
    return { report: measure(cycle), probes };
  } finally {
    engine.create = create;
  }
}

const baseline = new Map();
for (const cycle of [0, 1, 3, 6]) {
  const { report, probes } = measureWithClearance(cycle);
  assert.equal(report.rows.length, 18, "every named card is measured");
  for (const enemy of Object.keys(engine.cast)) {
    const rows = report.rows.filter((r) => r.enemy === enemy);
    assert.equal(rows.length, 6);
    for (const row of rows) {
      const key = `${enemy}/${row.card}`,
        label = `${key}, round ${cycle + 1}`;
      const probe = probes.get(key);
      assert(row.samples >= 200, `${label}: sustained full-track samples`);
      assert(
        row.peak > 0 && row.peak < 720,
        `${label}: bullet pool must not clip emissions (${row.peak})`
      );
      assert(
        row.bullets >= 16 && row.coverage >= 0.2,
        `${label}: the attack reaches and pressures the lower field`
      );
      assert(
        row.p90 < 0.985 && row.gap >= 20,
        `${label}: preserve manoeuvring gaps through dense phases`
      );
      assert(
        probe && probe.samples >= 40,
        `${label}: real hitboxes sampled throughout the card`
      );
      assert(
        probe.minimumGap >= 8 && probe.minimumClear >= 0.08,
        `${label}: collision wall detected (gap ${probe.minimumGap}px, clear ${(probe.minimumClear * 100).toFixed(1)}%)`
      );
      assert(
        Number.isFinite(row.speed) && row.speed >= 8 && row.speed <= 120,
        `${label}: sustained bullet travel stays within controllable arena speeds (${row.speed})`
      );
      if (!cycle) baseline.set(key, row);
      else {
        const ratio = row.speed / baseline.get(key).speed;
        assert(
          ratio >= 0.85 && ratio <= 1.35,
          `${label}: later-round speed must remain bounded (${ratio.toFixed(2)}× opening)`
        );
      }
    }
    console.log(
      `round ${cycle + 1} ${enemy}: ${rows.map((r) => `${r.card} ${Math.round(r.coverage * 100)}% / ${r.gap}px`).join(", ")}`
    );
  }
}
console.log(
  "PASS: all 18 spells retain lower-field pressure, sampled collision gaps, pool headroom and bounded later-round speed. Coverage is not forced into a monotonic sequence."
);
