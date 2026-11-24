const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out = process.env.QA_OUTPUT;
if (out) fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({channel: "chrome", headless: true});
  try {
    for (const [width, height, enemy] of [[1440, 960, "marisa"], [390, 844, "patchouli"], [844, 390, "alice"]]) {
      const page = await browser.newPage({viewport: {width, height}});
      const errors = [];
      page.on("pageerror", e => errors.push(e.message));
      await page.route("**/danmaku-engine.js*", async route => {
        const response = await route.fetch();
        await route.fulfill({response, body: await response.text() +
          "\nconst expeditionCreate = DanmakuEngine.create; DanmakuEngine.create = (p, e, seed, sound) => window.expeditionGame = expeditionCreate(p, e, 773, sound);"});
      });
      await page.goto(new URL("playground/", base).href);
      await page.locator("[data-danmaku-open]").click();
      if (out) await page.screenshot({path: path.join(out, "lobby-" + width + ".png")});
      await page.locator('[data-danmaku-challenge="' + enemy + '"]').click();
      await page.evaluate(async id => {
        const s = expeditionGame.state;
        await DanmakuScenery.load();
        s.intro = null;
        s.countdown = 0;
        s.time = DanmakuScore.getTrack(id).phrases[2].start + 0.1;
        s.player.invulnerable = 60;
        for (let i = 0; i < 480; i++) expeditionGame.step(1 / 60);
        s.items.push({type: "shard", amount: 3, x:s.player.x, y:s.player.y, vx:0, vy:0, age:0});
      }, enemy);
      const entry = page.locator("[data-run-draft-open]");
      await page.waitForFunction(() => Boolean(expeditionGame.state.run.offer));
      await entry.waitFor({state:"visible"});
      assert.equal(await page.locator("[data-run-location]").textContent(), await page.evaluate(id=>DanmakuRun.routes[id][1], enemy));
      if (out) await page.screenshot({path: path.join(out, "stage-" + enemy + "-" + width + ".png")});
      if (width === 1440) await page.keyboard.press("u"); else await entry.click();
      const draft = page.locator("[data-run-draft]");
      await draft.waitFor({state:"visible"});
      assert.equal(await draft.locator("[data-run-pick]").count(), 3);
      assert.equal(await draft.locator("[data-run-pick] svg").count(), 3);
      assert((await draft.locator("[data-run-pick] span").first().textContent()).includes("→"));
      const time = await page.evaluate(()=>expeditionGame.state.time);
      await page.waitForTimeout(200);
      assert.equal(await page.evaluate(()=>expeditionGame.state.time), time);
      assert(await draft.locator("button").first().evaluate(el=>el===document.activeElement));
      if (width > height) {
        assert(await draft.locator("[data-run-back]").evaluate(el => {
          const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight;
        }), "landscape can read all cards and leave without scrolling");
      }
      if (out) await page.screenshot({path: path.join(out, "draft-" + width + ".png")});
      if (width === 1440) {
        await page.keyboard.press("Escape");
        await draft.waitFor({state:"hidden"});
        await entry.click();
        await page.keyboard.press("2");
      } else await draft.locator("[data-run-pick]").nth(1).click();
      await draft.waitFor({state:"hidden"});
      assert.equal(await page.evaluate(()=>expeditionGame.state.run.level), 2);
      await page.waitForFunction(t=>expeditionGame.state.time>t, time);
      // Prevent new test XP while checking the equipped-only view.
      await page.evaluate(() => { const s = expeditionGame.state; s.run.offer = null; s.run.xp = 0; s.items = []; });
      await entry.click();
      await draft.waitFor({state:"visible"});
      assert.equal(await draft.locator("article.danmaku-mod-card").count(), 1);
      assert.equal(await draft.locator("article b").textContent(), "Lv.1");
      assert.equal(await draft.locator("article span").textContent(), await page.evaluate(() => {
        const s = expeditionGame.state; return DanmakuRun.stats(s, s.run.lastUpgrade.id, DanmakuEngine.maxPower, true);
      }));
      await page.keyboard.press("2");
      assert(await draft.isVisible());
      await page.keyboard.press("Escape");
      assert.deepEqual(errors, []);
      console.log(width + "×" + height + " " + enemy + " stage and upgrade passed");
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;});
