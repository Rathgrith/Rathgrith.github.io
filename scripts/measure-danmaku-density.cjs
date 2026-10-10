/* Actual lower-arena hazards without damage clears, at three fixed aim positions.
 * Coverage includes an 8px manoeuvring margin and a 0.25s movement forecast.
 * A tuning aid: density alone cannot measure human difficulty.
 */
const engine = require("../assets/js/games/danmaku-engine.js");
const patterns = require("../assets/js/games/danmaku-patterns.js");
const fs = require("node:fs");
const quantile = (a, q) =>
  [...a].sort((a, b) => a - b)[Math.floor((a.length - 1) * q)] || 0;
const mean = (a) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
function measure(cycle = 0) {
  const rows = [];
  for (const enemy of Object.keys(engine.cast)) {
    const track = engine.score.getTrack(enemy);
    const samples = patterns.cards[enemy].map(() => ({
      count: [],
      coverage: [],
      gap: [],
      speed: [],
      peak: 0,
    }));
    for (const x of [60, 120, 180]) {
      const game = engine.create("alice", enemy, 1977),
        s = game.state;
      s.countdown = 0;
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
        const stats = samples[s.rhythm.section];
        stats.peak = Math.max(stats.peak, s.bullets.length);
        if (
          frame % 12 ||
          s.enemySpell.nonspell ||
          s.enemySpell.age < 6 ||
          s.enemySpell.remaining < 2
        )
          continue;
        const bullets = s.bullets.filter(
          (b) => b.x > 0 && b.x < 240 && b.y > 155 && b.y < 350
        );
        const beams = s.lasers.filter(
          (l) => l.age + 0.25 >= l.warning && l.age < l.warning + l.duration
        );
        let blocked = 0,
          total = 0,
          widest = 0;
        for (let gy = 168; gy <= 336; gy += 12) {
          let gap = 0;
          for (let gx = 12; gx <= 228; gx += 8) {
            const hit =
              bullets.some((b) =>
                [0, 0.25].some(
                  (t) =>
                    Math.hypot(gx - b.x - b.vx * t, gy - b.y - b.vy * t) <
                    b.radius + 10.2
                )
              ) ||
              beams.some((l) => {
                return engine.laserGap({ x: gx, y: gy }, l) < 10.2;
              });
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
        stats.count.push(bullets.length);
        stats.coverage.push(blocked / total);
        stats.gap.push(widest);
        stats.speed.push(mean(bullets.map((b) => Math.hypot(b.vx, b.vy))));
      }
    }
    samples.forEach((s, stage) =>
      rows.push({
        enemy,
        stage: stage + 1,
        card: patterns.cards[enemy][stage].id,
        bullets: +mean(s.count).toFixed(1),
        coverage: +mean(s.coverage).toFixed(3),
        p90: +quantile(s.coverage, 0.9).toFixed(3),
        gap: +mean(s.gap).toFixed(1),
        speed: +mean(s.speed).toFixed(1),
        peak: s.peak,
        samples: s.count.length,
      })
    );
  }
  return { cycle, rows };
}
module.exports = measure;
if (require.main === module) {
  const report = measure(Number(process.env.DENSITY_CYCLE || 0));
  console.table(report.rows);
  if (process.argv[2])
    fs.writeFileSync(process.argv[2], JSON.stringify(report, null, 2) + "\n");
}
