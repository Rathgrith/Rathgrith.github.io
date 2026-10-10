const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out = "/private/tmp/playground-page";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const [width, height] of [
      [1440, 1000],
      [1920, 1080],
      [768, 1000],
      [375, 812],
      [320, 740],
      [600, 360],
    ].filter(
      (s) => !process.env.QA_WIDTH || s[0] === Number(process.env.QA_WIDTH)
    )) {
      const p = await browser.newPage({ viewport: { width, height } }),
        errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.addInitScript(() => {
        localStorage.setItem("site-live2d-enabled", "false");
        localStorage.setItem("site-live2d-mobile-enabled", "false");
      });
      await p.goto(base + "playground/");
      await p.locator("[data-danmaku-open]").waitFor({ state: "visible" });
      await p.evaluate(() => document.fonts.ready);
      const fit = await p.evaluate(() => {
        const w = document.getElementById("live2d-widget"),
          b = w.getBoundingClientRect(),
          v = w.querySelector(".vn-main-view");
        return {
          x: b.x,
          y: b.y,
          w: b.width,
          h: b.height,
          documentOverflow:
            document.documentElement.scrollWidth > innerWidth ||
            document.documentElement.scrollHeight > innerHeight,
          viewXOverflow: v.scrollWidth > v.clientWidth + 1,
          scale: w.dataset.playgroundScale,
        };
      });
      assert.equal(fit.x, 0);
      assert.equal(fit.y, 0);
      assert.equal(fit.w, width);
      assert.equal(fit.h, height);
      assert(!fit.documentOverflow && !fit.viewXOverflow, JSON.stringify(fit));
      assert(!(await p.locator(".classic-masthead").count()));
      assert(!(await p.locator("[data-site-options-floating]").count()));
      assert(!(await p.locator("[data-companion-minimize]").isVisible()));
      assert(!(await p.locator("[data-companion-resize]").isVisible()));
      assert.equal(
        await p.evaluate(() => localStorage.getItem("site-live2d-enabled")),
        "false"
      );
      assert.equal(
        await p.locator("[data-radio-audio]").count(),
        0,
        "standalone radio is stopped on entry"
      );
      assert.equal(
        await p.locator("[data-bgm-play]").getAttribute("aria-label"),
        "ラジオを再生"
      );
      await p.screenshot({ path: out + `/dialogue-${width}.png` });
      for (const mode of ["score", "flower"]) {
        await p.locator("[data-danmaku-open]").click();
        await p.locator(`[data-danmaku-game-mode="${mode}"]`).click();
        await p.locator('[data-danmaku-challenge="marisa"]').click();
        const field = await p.locator("[data-danmaku-canvas]").boundingBox();
        assert(field.width > 100 && field.height > 150, JSON.stringify(field));
        assert(field.y + field.height <= height + 1);
        assert.equal(
          await p.locator("[data-danmaku-music]").getAttribute("aria-pressed"),
          "true"
        );
        assert.equal(
          await p.locator("[data-danmaku-sfx]").getAttribute("aria-pressed"),
          "true"
        );
        await p.locator("[data-danmaku-pause]").click();
        await p.screenshot({ path: out + `/${mode}-${width}.png` });
        await p.locator("[data-danmaku-menu]").click();
        await p.locator("[data-danmaku-exit]").click();
        assert.equal(
          await p.locator("[data-radio-audio]").count(),
          0,
          "battle controls never implicitly start the radio"
        );
      }
      if (width === 1440) {
        if (await p.locator("[data-companion-maximize]").isVisible()) {
          await p.locator("[data-companion-maximize]").click();
          await p.waitForFunction(() => document.fullscreenElement);
          await p.locator("[data-companion-maximize]").click();
          await p.waitForFunction(() => !document.fullscreenElement);
        }
        await p.locator("[data-playground-home]").click();
        await p.waitForURL(base);
        assert(await p.locator(".classic-masthead").isVisible());
        assert(
          !(await p.locator("#live2d-widget").isVisible()),
          "homepage hidden preference survives opening standalone"
        );
        await p.locator('.classic-navigation a[href$="/playground/"]').click();
        await p.waitForURL(base + "playground/");
        assert(await p.locator("[data-danmaku-open]").isVisible());
        await p.goBack();
        await p.waitForURL(base);
        assert(await p.locator(".classic-masthead").isVisible());
        await p.locator("[data-site-options-trigger]").click();
        await p.locator("[data-live2d-toggle]").click();
        await p.locator("[data-playground-open]").click();
        await p.waitForURL(base + "playground/");
        assert(await p.locator("[data-danmaku-open]").isVisible());
      }
      if (width === 320) {
        await p.locator("[data-playground-home]").click();
        await p.waitForURL(base);
        const nav = await p
          .locator(".classic-navigation")
          .evaluate((el) => ({ w: el.clientWidth, s: el.scrollWidth }));
        assert(nav.s <= nav.w + 1, JSON.stringify(nav));
      }
      assert.deepEqual(errors, []);
      console.log("PASS", width, height, fit);
      await p.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
