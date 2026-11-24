const assert = require("node:assert/strict");
const {
  scene,
  pulse,
  patterns,
} = require("./helpers/danmaku-pattern-trace.cjs");
const vm = require("node:vm");
const fs = require("node:fs");
const browser = { window: {} };
vm.runInNewContext(
  fs.readFileSync(
    require.resolve("../assets/js/games/danmaku-boss-sprites.js"),
    "utf8"
  ),
  browser
);
const sprites = browser.window.DanmakuBossSprites;
for (const [enemy, deck] of Object.entries(patterns.cards))
  for (const card of deck)
    for (const nonspell of [false, true]) {
      const s = scene(enemy, card.id);
      s.enemySpell.nonspell = nonspell;
      const crews = new Set(), fired = new Set();
      for (let tick = 0; tick < 96; tick++) {
        s.enemySpell.age = 4 + tick * 0.2;
        const sources = patterns.emitters(s);
        const ordinal = deck.indexOf(card);
        if (!nonspell) assert.equal(sources.length, (enemy === "marisa" ? 2 : 3) + ordinal);
        else assert(!sources.some(e => e.relay), "the answering ranks withdraw at spell break");
        sources.filter(o => o.relay).forEach(o=>crews.add(o.id));
        const visible = sources
          .map((src, i) => {
            const v = sprites.deploy(s.boss, src, s.enemySpell.age, i, false);
            assert.equal(v.opacity, 1);
            return v;
          })
          .concat(s.boss);
        const { shots, beams } = pulse(s, tick);
        for (const shot of [...shots, ...beams]) {
          assert(
            visible.some(
              (o) => Math.hypot(o.x - shot[0], o.y - shot[1]) < 0.001
            ),
            card.id + " fires from a visibly deployed source"
          );
          sources.filter(o=>o.relay && Math.hypot(o.x - shot[0], o.y - shot[1]) < .001).forEach(o=>fired.add(o.id));
          assert(Number.isFinite(shot[0] + shot[1] + shot[2] + shot[3]));
        }
      }
      if (!nonspell) assert.deepEqual(fired, crews, card.id + " all reinforcements actually fire");
    }
console.log(
  "PASS: all spell and interlude bullets and lasers have a visible, deployed source throughout the musical score."
);
