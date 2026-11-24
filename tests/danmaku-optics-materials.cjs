const assert = require("node:assert/strict");
const E = require("../assets/js/games/danmaku-engine.js");
const F = require("../assets/js/games/danmaku-flower.js");
const {scene, pulse, stepShot} = require("./helpers/danmaku-pattern-trace.cjs");

const expected = {
  exposure: ["smallorb","flare","comet","stardust"],
  bankshot: ["largeorb","prism","smallorb"],
  spectrograph: ["largeorb","prism","smallorb","stardust"],
  slingshot: ["comet","stardust","flare"],
  shutter: ["saber","stardust","smallorb"],
  parallax: ["flare","stardust","prism","smallorb"],
};
for (const [card, required] of Object.entries(expected)) {
  const materials = new Set();
  for (let part = 0; part < 3; part++) {
    const state = scene("marisa", card);
    state.rhythm.sectionStart = 0; state.rhythm.spellEnd = 30; state.time = 5 + part * 10;
    for (let tick = 0; tick < 24; tick++) {
      const {shots} = pulse(state,tick);
      for (const shot of shots) {
        const style = shot[7];
        if (style) materials.add(style);
        // These optical accents preserve the original parent/child hazard shapes.
        assert(["star","smallstar","bigstar"].includes(shot[5]));
        if (shot[6]?.split) {
          const flight = stepShot(shot, shot[6].split.at + 0.03);
          for (const child of flight.children) {
            assert.equal(child[5],"smallstar");
            if (child[7]) materials.add(child[7]);
          }
        }
      }
      if (card === "slingshot" && tick === 0) {
        assert.equal(shots.filter(a=>a[7]==="comet").length, 1, "One head leads the curved tail");
        assert(shots.at(-1)[6].redirect.at < shots[0][6].redirect.at);
      }
      if (card === "bankshot" && tick === 0)
        assert.equal(shots.filter(a=>a[7]==="largeorb").length, 1, "Only the centre is a large ball");
      if (card === "parallax" && tick === 0) {
        const anchors = shots.filter(a=>a[7]==="flare");
        assert.equal(anchors.length, 7, "Seven chart vertices stand out from their dotted edges");
      }
    }
  }
  for (const style of required) assert(materials.has(style), card + " emits " + style);
}

for (const id of Object.keys(E.cast)) {
  const g = F.create("alice", id, 73), s = g.state, f = s.fields[0];
  s.countdown = 0;
  f.waveClock = 99; f.player.invulnerable = 99;
  f.boss = {id, x:120, y:53, hp:999, maxHp:999, age:2, fire:0};
  const styles = new Set();
  for (let turn = 0; turn < (id === "patchouli" ? 6 : 3); turn++) {
    f.bullets = []; f.boss.fire = 0;
    g.step(1/60,{charge:true});
    for (const b of f.bullets) {
      assert(b.hard && b.bounce === 0, "Decorating a card does not change cancellation rules");
      assert.equal(b.radius, E.projectileRadius(b.visualStyle, b.shape === "orb" ? 3.5 : 2.3));
      styles.add(b.visualStyle);
    }
  }
  const keys = {alice:["needle","spool","ribbon","saber"],marisa:["comet","prism","largeorb","stardust"],
    patchouli:["quill","folio","seal","crystal","smallorb","solar","lunar"]};
  for (const style of keys[id]) assert(styles.has(style), id + " duel company emits " + style);
}
console.log("PASS all six optical cards, split colours, curved comet heads, seven chart anchors, and three Flower companies");
