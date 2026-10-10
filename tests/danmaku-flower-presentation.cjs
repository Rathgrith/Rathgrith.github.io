/* Exercise card rendering, not just the headless rules: a render exception stops RAF. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const out = "/private/tmp/flower-presentation";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const p = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.route("**/danmaku-flower.js*", async (r) => {
      const res = await r.fetch();
      await r.fulfill({
        response: res,
        body:
          (await res.text()) +
          "\nconst originalCreate=DanmakuFlower.create;DanmakuFlower.create=(...args)=>window.flowerGame=originalCreate(...args);",
      });
    });
    await p.goto(
      (process.env.PREVIEW_URL || "http://127.0.0.1:4100/") + "playground/"
    );
    await p.locator("[data-danmaku-open]").click();
    await p.locator('[data-danmaku-game-mode="flower"]').click();
    await p.locator('[data-danmaku-player="patchouli"]').click();
    await p.locator('[data-danmaku-challenge="alice"]').click();
    await p.waitForFunction(
      () => window.flowerGame && flowerGame.state.countdown === 0
    );
    await p.keyboard.press("x");
    await p.waitForTimeout(300);
    assert.deepEqual(
      errors,
      [],
      "Patchouli quick card must render without breaking the frame loop"
    );
    const start = await p.evaluate(() => flowerGame.state.time);
    await p.waitForTimeout(500);
    assert(
      await p.evaluate((t) => flowerGame.state.time > t + 0.2, start),
      "game must keep stepping after the effect"
    );
    await p.screenshot({ path: out + "/patchouli-duel.png" });
    await p.keyboard.press("p");
    await p.locator("[data-danmaku-menu]").click();
    // Render actual C1–C4 effects for every pilot and CPU combination, including
    // portraits, boss attacks and the two presentation layouts.
    const count = await p.evaluate(async () => {
      const c = document.createElement("canvas"),
        r = DanmakuFlowerRenderer.create(c);
      await r.ready;
      let frames = 0;
      for (const compact of [false, true]) {
        r.dimensions(compact ? 350 : 900, 650);
        for (const a of ["alice", "marisa", "patchouli"])
          for (const b of ["alice", "marisa", "patchouli"])
            for (let level = 1; level <= 4; level++) {
              const g = DanmakuFlower.create(a, b, 1977);
              g.state.countdown = 0;
              g.state.fields[0].gauge = level * 100;
              if (level === 1) {
                for (let i = 0; i < 45; i++) g.step(1 / 60, { charge: true });
                g.step(1 / 60, {});
              } else g.bomb();
              // CPU shares the same casting renderer; mirror the cast while retaining its own identity.
              g.state.fields[1].cast = { ...g.state.fields[0].cast, id: b };
              for (const age of [0, 0.15, 0.5, 0.79, 1.1]) {
                g.state.fields.forEach((f) => (f.cast.age = age));
                r.draw(g.state);
                frames++;
              }
            }
      }
      return frames;
    });
    assert.equal(count, 360);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: Patchouli quick card keeps RAF running; 360 real canvas frames cover C1–C4, all nine matchups and both layouts."
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
