const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out =
  process.env.QA_OUTPUT ||
  require("node:os").tmpdir() + "/danmaku-presentation";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const page = await browser.newPage({ reducedMotion });
      // Render the real production modules in a minimal, same-origin test fixture.
      await page.route(base + "renderer-test", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: '<!doctype html><html><head><link rel="stylesheet" href="/assets/css/classic-companion.css"></head><body><canvas id="field"></canvas><script src="/assets/js/games/danmaku-engine.js"></script><script src="/assets/js/games/danmaku-renderer.js"></script></body></html>',
        })
      );
      await page.goto(base + "renderer-test");
      const results = await page.evaluate(async () => {
        const canvas = document.querySelector("canvas");
        const renderer = DanmakuRenderer.create(canvas);
        await renderer.ready;
        await document.fonts.load('12px "Fusion Pixel"');
        const pixels = () =>
          canvas.getContext("2d").getImageData(0, 0, 240, 360).data;
        function difference(a, b) {
          let sum = 0;
          for (let i = 0; i < a.length; i++)
            if (i % 4 !== 3) sum += Math.abs(a[i] - b[i]);
          return sum / (240 * 360 * 3);
        }
        const results = [];
        for (const id of Object.keys(DanmakuEngine.cast)) {
          const game = DanmakuEngine.create(id, id, 1977),
            s = game.state;
          s.countdown = 0;
          renderer.draw(s);
          const still = pixels();
          s.scroll = 2031;
          renderer.draw(s);
          const moving = pixels();
          const background = canvas.toDataURL();
          const transitions = [];
          for (const boundary of [
            48,
            64,
            96,
            160,
            80 / 0.45,
            180 / 0.8,
            4800,
          ]) {
            s.scroll = boundary - 0.1;
            renderer.draw(s);
            const before = pixels();
            s.scroll = boundary + 0.1;
            renderer.draw(s);
            transitions.push(difference(before, pixels()));
          }
          s.scroll = 2031;
          game.bomb();
          s.spell.age = 0.5;
          renderer.draw(s);
          results.push({
            id,
            scrollDifference: difference(still, moving),
            transitions,
            spellDifference: difference(moving, pixels()),
            background,
            spell: canvas.toDataURL(),
          });
        }
        return results;
      });
      for (const r of results) {
        assert(
          reducedMotion === "reduce"
            ? r.scrollDifference === 0
            : r.scrollDifference > 0.5,
          `${r.id}: scenery motion preference`
        );
        assert(
          r.transitions.every((n) => n < 2.5),
          `${r.id}: no scenery pop at wrap boundaries ${r.transitions}`
        );
        assert(
          r.spellDifference > 3,
          `${r.id}: X must produce a substantial visible effect, also with reduced motion`
        );
        for (const type of ["background", "spell"])
          fs.writeFileSync(
            `${out}/${r.id}-${reducedMotion}-${type}.png`,
            Buffer.from(r[type].split(",")[1], "base64")
          );
        console.log(
          `${reducedMotion}/${r.id}: scroll ${r.scrollDifference.toFixed(2)}, wrap max ${Math.max(...r.transitions).toFixed(2)}, spell ${r.spellDifference.toFixed(2)}`
        );
      }
      await page.close();
    }
    console.log(
      "PASS: three distinct scrolling scenes, seamless wrap boundaries, substantial X effects and reduced-motion rendering"
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
