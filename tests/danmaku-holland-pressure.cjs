/* A standing pilot must face real hitbox crossings, including former safe edges. */
const assert = require("node:assert/strict");
const engine = require("../assets/js/games/danmaku-engine.js");
const patterns = require("../assets/js/games/danmaku-patterns.js");
const phrase =
  engine.score.getTrack("alice").phrases[
    patterns.cards.alice.findIndex((card) => card.id === "holland")
  ];
const positions = [
  [12, 344],
  [60, 344],
  [120, 344],
  [180, 344],
  [228, 344],
  [12, 264],
  [120, 264],
  [228, 264],
  [60, 168],
  [180, 168],
  [12, 48],
  [228, 48],
  [120, 84],
];
const rows = [];
for (const rank of [1, 25]) {
  for (const [x, y] of positions) {
    const game = engine.create("alice", "alice", 1977),
      s = game.state;
    s.countdown = 0;
    s.intro = null;
    s.time = phrase.start;
    Object.defineProperty(s, "level", { get: () => rank, set() {} });
    const hits = new Set();
    let peak = 0,
      first = Infinity,
      last = 0;
    while (s.time + 1 / 60 < phrase.spellEnd) {
      Object.assign(s.player, { x, y, invulnerable: Infinity });
      s.enemySpell.hp = Infinity;
      s.shots = [];
      s.items = [];
      game.step(1 / 60);
      peak = Math.max(peak, s.bullets.length);
      for (const b of s.bullets) {
        if (
          b.color !== "#f0eefb" ||
          Math.hypot(b.x - x, b.y - y) >= b.radius + s.player.radius
        )
          continue;
        hits.add(b);
        first = Math.min(first, s.enemySpell.age);
        last = s.enemySpell.age;
      }
    }
    assert(
      hits.size >= 4,
      `rank ${rank},(${x},${y}): sustained aimed crossings (${hits.size})`
    );
    assert(
      last - first > 12,
      `rank ${rank},(${x},${y}): pressure persists beyond the opening`
    );
    assert(
      peak < 720,
      `rank ${rank},(${x},${y}): every source fits the bullet budget`
    );
    rows.push({ rank, x, y, crossings: hits.size, peak });
  }
}
console.table(rows);
console.log(
  "PASS: Holland's aimed doll accents repeatedly cross stationary pilots at 13 corner/edge/centre positions, in both opening and maximum rank."
);
