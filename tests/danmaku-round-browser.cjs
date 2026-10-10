const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out =
  process.env.QA_OUTPUT || require("node:os").tmpdir() + "/danmaku-rounds";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const [id, width, height] of [
      ["alice", 1440, 1000],
      ["marisa", 600, 1000],
      ["patchouli", 375, 1000],
      ["alice", 600, 360],
    ]) {
      const page = await browser.newPage({ viewport: { width, height } }),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.route("**/danmaku-engine.js*", async (r) => {
        const response = await r.fetch();
        await r.fulfill({
          response,
          body:
            (await response.text()) +
            "\nconst realEngine=DanmakuEngine.create;DanmakuEngine.create=(...args)=>window.roundGame=realEngine(...args);",
        });
      });
      await page.goto(base);
      if (width === 1440)
        await page.locator("[data-companion-maximize]").click();
      await page.locator("[data-danmaku-open]").click();
      await page.locator('[data-danmaku-challenge="' + id + '"]').click();
      await page.waitForFunction(() => roundGame.state.intro?.age > 1.15);
      await page
        .locator("#live2d-widget")
        .screenshot({
          path: out + "/" + id + "-" + width + "x" + height + "-intro.png",
        });
      await page.evaluate(() => {
        const g = roundGame,
          s = g.state;
        s.countdown = 0;
        g.step(1 / 60);
        s.player.invulnerable = 999;
        s.power = 8;
        s.score = 12345;
        s.time = DanmakuScore.getTrack(s.enemyId).duration - 0.005;
        g.step(1 / 60);
        window.heldBoss = { ...s.boss };
      });
      try {
        await page
          .locator("[data-danmaku-round-next]")
          .waitFor({ state: "visible", timeout: 8000 });
      } catch (error) {
        console.error(
          id,
          width,
          height,
          await page.evaluate(() => ({
            phase: roundGame.state.phase,
            rest: roundGame.state.intermission,
            time: roundGame.state.time,
            focus: document.activeElement.outerHTML,
            panel: document.querySelector("[data-danmaku-round]").outerHTML,
          })),
          errors
        );
        await page.screenshot({
          path: out + "/" + id + "-" + width + "x" + height + "-failure.png",
        });
        throw error;
      }
      assert.deepEqual(
        await page.evaluate(() => roundGame.state.boss),
        await page.evaluate(() => heldBoss),
        "boss stays through the rest"
      );
      const panel = page.locator("[data-danmaku-round]");
      assert(
        (
          await panel.locator("[data-danmaku-round-line]").textContent()
        ).includes("？")
      );
      assert(
        await panel.evaluate((e) => {
          const r = e.getBoundingClientRect(),
            arena = e.closest(".danmaku-arena").getBoundingClientRect();
          return (
            r.top >= arena.top &&
            r.bottom <= arena.bottom &&
            e.scrollWidth <= e.clientWidth &&
            [...e.querySelectorAll("button")].every((b) => {
              const r = b.getBoundingClientRect(),
                p = e.getBoundingClientRect();
              return r.left >= p.left && r.right <= p.right;
            })
          );
        }),
        id + " rest panel fits"
      );
      await page
        .locator("#live2d-widget")
        .screenshot({
          path:
            out + "/" + id + "-" + width + "x" + height + "-boss-question.png",
        });
      const saved = await page.evaluate(() => roundGame.state.score);
      if (id === "marisa") {
        await page.locator("[data-danmaku-round-finish]").click();
        assert.equal(await page.evaluate(() => roundGame.state.phase), "over");
        assert.equal(await page.evaluate(() => roundGame.state.score), saved);
      } else {
        if (id === "alice")
          await page.locator("[data-danmaku-round-next]").click();
        else {
          await page.evaluate(() => {
            roundGame.state.intermission.remaining = 0.05;
          });
          await page.waitForFunction(() => roundGame.state.round === 2);
        }
        assert.equal(await page.evaluate(() => roundGame.state.score), saved);
        assert.equal(await page.evaluate(() => roundGame.state.power), 8);
        assert.equal(
          await page.evaluate(() => Boolean(roundGame.state.intro)),
          false,
          "staying boss does not replay entry"
        );
        await panel.waitFor({ state: "hidden", timeout: 1000 });
        assert.equal(
          await page.evaluate(() => roundGame.state.phase),
          "playing"
        );
      }
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(
      "PASS: boss portrait continuation at 1440/600/375px, actual entry views, boss stays, manual/idle continuation, finish, cumulative score/power, focus handoff and contained layout."
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
