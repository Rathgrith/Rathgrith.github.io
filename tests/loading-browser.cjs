const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out =
  process.env.QA_OUTPUT || require("node:os").tmpdir() + "/loading-qa";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  try {
    for (const options of [
      { width: 1440, reducedMotion: "no-preference" },
      { width: 320, reducedMotion: "reduce" },
    ]) {
      const page = await browser.newPage({
        viewport: { width: options.width, height: 1000 },
        reducedMotion: options.reducedMotion,
      });
      page.on("pageerror", (e) => errors.push(e.message));
      // Delay the local portrait indefinitely and hold the remote model loader.
      // The homepage must still dismiss independently by its bounded deadline.
      await page.route("**/images/avatars/alice-portrait.png", () => {});
      await page.route("**/live2dcubismcore.min.js", () => {});
      await page.goto(base, { waitUntil: "domcontentloaded" });
      const overlay = page.locator("#home-loading-screen");
      assert(await overlay.isVisible());
      assert.equal(
        await overlay.locator("[data-prayer-label]").textContent(),
        "少女祈祷中…"
      );
      assert.equal(await overlay.locator("img").count(), 3);
      const dimensions = await overlay.locator(".prayer-loader").boundingBox();
      assert(
        dimensions.x >= 0 && dimensions.x + dimensions.width <= options.width
      );
      const motion = await overlay
        .locator(".prayer-loader__orbit")
        .evaluate((el) => getComputedStyle(el).animationName);
      assert.equal(
        motion,
        options.reducedMotion === "reduce" ? "none" : "prayer-orbit"
      );
      await overlay.screenshot({
        path: `${out}/homepage-prayer-${options.width}.png`,
      });
      await overlay.waitFor({ state: "detached", timeout: 2500 });
      assert.equal(
        await page.locator("#main").getAttribute("aria-busy"),
        "false"
      );
      if (options.width === 1440) {
        assert(await page.locator("#live2d-widget.is-loading").isVisible());
        assert.equal(
          await page.locator("[data-vn-load-label]").textContent(),
          "少女祈祷中…"
        );
        await page
          .locator("#live2d-widget")
          .screenshot({ path: `${out}/companion-prayer.png` });
      }
      await page.close();
    }
    const input = await browser.newPage();
    await input.route("**/images/avatars/alice-portrait.png", () => {});
    await input.goto(base, { waitUntil: "domcontentloaded" });
    await input.keyboard.press("Tab");
    await input
      .locator("#home-loading-screen")
      .waitFor({ state: "detached", timeout: 500 });
    assert(
      await input
        .locator(".classic-skip-link")
        .evaluate((el) => document.activeElement === el),
      "Dismissal must preserve keyboard input"
    );
    await input.close();
    const nojs = await browser.newPage({ javaScriptEnabled: false });
    await nojs.goto(base);
    assert.equal(await nojs.locator("#home-loading-screen").isVisible(), false);
    assert(await nojs.locator("#main").isVisible());
    await nojs.close();
    const fallback = await browser.newPage();
    await fallback.route("**/home-loading.js*", (r) => r.abort());
    await fallback.goto(base, { waitUntil: "domcontentloaded" });
    await fallback
      .locator("#home-loading-screen")
      .waitFor({ state: "hidden", timeout: 6500 });
    assert.equal(
      await fallback
        .locator("#home-loading-screen")
        .evaluate((el) => getComputedStyle(el).pointerEvents),
      "none"
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: shared prayer loaders, local-asset deadline, remote independence, 320px, reduced motion, input dismissal, no JS and CSS fail-safe"
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
