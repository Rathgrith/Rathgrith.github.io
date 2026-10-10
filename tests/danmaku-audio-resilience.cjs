const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
(async () => {
  const b = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-gpu"],
  });
  try {
    const page = await b.newPage({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const Real = window.AudioContext;
      window.AudioContext = class extends Real {
        constructor() {
          super();
          window.seContext = this;
        }
      };
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    await page.route("**/*.wav", (r) =>
      r.fulfill({ status: 404, body: "missing" })
    );
    await page.goto(base);
    await page.locator("[data-danmaku-open]").click();
    await page.locator('[data-danmaku-challenge="alice"]').click();
    await page.locator("[data-danmaku-sfx]").click();
    await page.waitForFunction(() =>
      document
        .querySelector("[data-danmaku-sfx]")
        .textContent.includes("再試行")
    );
    assert.equal(
      await page.locator("#live2d-widget").getAttribute("data-danmaku-state"),
      "playing"
    );
    assert.equal(
      await page.locator("[data-danmaku-sfx]").getAttribute("aria-pressed"),
      "false"
    );
    await page.unroute("**/*.wav");
    await page.locator("[data-danmaku-sfx]").click();
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-danmaku-sfx]")
          .getAttribute("aria-busy") === "false" &&
        seContext.state === "running"
    );
    await page.route("**/alice-dbu.mp3", (r) =>
      r.fulfill({ status: 404, body: "missing" })
    );
    await page.locator("[data-danmaku-music]").click();
    await page.waitForFunction(() =>
      document
        .querySelector("[data-danmaku-music]")
        .textContent.includes("再試行")
    );
    assert.equal(
      await page.locator("[data-danmaku-music]").getAttribute("aria-pressed"),
      "true",
      "transport failure preserves the chosen battle music setting"
    );
    assert.equal(
      await page.locator("[data-danmaku-sfx]").getAttribute("aria-pressed"),
      "true"
    );
    assert(
      await page.locator("[data-danmaku-audio]").evaluate((a) => a.paused)
    );
    await page.unroute("**/alice-dbu.mp3");
    await page.locator("[data-danmaku-music]").click();
    await page.waitForFunction(
      () => !document.querySelector("[data-danmaku-audio]").paused
    );
    await page.locator("[data-danmaku-exit]").click();
    assert(
      await page.locator("[data-danmaku-audio]").evaluate((a) => a.paused)
    );
    await page.waitForFunction(() => seContext.state === "suspended");
    // Muting before decoding finishes must not replay a backlog or re-enable SE.
    await page.reload();
    await page.locator("[data-danmaku-open]").click();
    await page.route("**/*.wav", async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await r.continue();
    });
    await page.locator("[data-danmaku-sfx]").click();
    await page.locator("[data-danmaku-sfx]").click();
    await page.waitForTimeout(1300);
    assert.equal(
      await page.locator("[data-danmaku-sfx]").getAttribute("aria-pressed"),
      "false"
    );
    assert.equal(await page.evaluate(() => seContext.state), "suspended");
    await page.locator('[data-danmaku-challenge="marisa"]').click();
    assert.equal(await page.evaluate(() => seContext.state), "suspended");
    assert.equal(await page.locator("[data-danmaku-audio]").count(), 0);
    const unsupported = await b.newPage();
    unsupported.on("pageerror", (e) => errors.push(e.message));
    await unsupported.addInitScript(() => {
      window.AudioContext = undefined;
      window.webkitAudioContext = undefined;
    });
    await unsupported.goto(base);
    await unsupported.locator("[data-danmaku-open]").click();
    await unsupported.locator("[data-danmaku-sfx]").click();
    assert.equal(
      await unsupported
        .locator("[data-danmaku-sfx]")
        .getAttribute("aria-pressed"),
      "false"
    );
    await unsupported.locator('[data-danmaku-challenge="patchouli"]').click();
    assert.equal(
      await unsupported
        .locator("#live2d-widget")
        .getAttribute("data-danmaku-state"),
      "playing"
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: mobile real decode/play, independent recoverable media failures, blocked storage, mute-before-decode, no Web Audio fallback."
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
