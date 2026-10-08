const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const out =
  process.env.QA_OUTPUT || require("node:os").tmpdir() + "/homepage-qa";
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const b = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-gpu"],
  });
  try {
    const p = await b.newPage({
        viewport: { width: 375, height: 812 },
        reducedMotion: "reduce",
      }),
      errors = [];
    let modelRequests = 0;
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("request", (r) => {
      if (r.url().includes("model3.json")) modelRequests++;
    });
    await p.goto(base);
    await p.locator("#live2d-widget").waitFor({ state: "attached" });
    assert(await p.locator("#live2d-widget").isVisible());
    assert.equal(await p.locator(".classic-page-index").count(), 1);
    await p.screenshot({ path: out + "/mobile-default.png" });
    await p.waitForFunction(
      () =>
        document.querySelector("#live2d-widget").dataset.dialogueState ===
        "ready",
      null,
      { timeout: 45000 }
    );
    assert(modelRequests > 0, "Mobile loads its default companion without opt-in");
    assert.equal(await p.evaluate(() => scrollY), 0, "Default opening must not jump to the page bottom");
    assert.equal(await p.evaluate(() => localStorage.getItem("site-live2d-mobile-enabled")), null);
    const bounds = await p.evaluate(() => {
      const rect = (s) => document.querySelector(s).getBoundingClientRect();
      return {
        articleBottom: rect(".page").bottom,
        navTop: rect(".classic-page-index").top,
        navBottom: rect(".classic-page-index").bottom,
        companionTop: rect("#live2d-widget").top,
        docOverflow: document.documentElement.scrollWidth > innerWidth,
      };
    });
    assert(
      bounds.navTop >= bounds.articleBottom &&
        bounds.companionTop >= bounds.navBottom &&
        !bounds.docOverflow,
      JSON.stringify(bounds)
    );
    await p.locator(".classic-page-index").scrollIntoViewIfNeeded();
    await p.screenshot({ path: out + "/mobile-bottom.png" });
    // Layout changes keep desktop and mobile visibility choices independent.
    await p.locator("[data-companion-close]").click();
    assert.equal(await p.locator("#live2d-widget").isVisible(), false);
    await p.setViewportSize({ width: 1440, height: 1000 });
    await p.waitForTimeout(150);
    assert(await p.locator("#live2d-widget").isVisible());
    assert(
      await p
        .locator("#live2d-widget")
        .evaluate((e) => e.parentElement.hasAttribute("data-companion-dock"))
    );
    await p.setViewportSize({ width: 375, height: 812 });
    await p.waitForTimeout(150);
    assert.equal(await p.locator("#live2d-widget").isVisible(), false);
    modelRequests = 0;
    await p.reload();
    await p.locator("#live2d-widget").waitFor({ state: "attached" });
    assert.equal(await p.locator("#live2d-widget").isVisible(), false);
    assert.equal(modelRequests, 0, "An explicit mobile opt-out must still prevent model loading");
    await p.locator("[data-site-options-trigger]").click();
    await p.locator("[data-live2d-toggle]").click();
    await p.keyboard.press("Escape");
    await p.evaluate(
      () => (window.mobileCanvas = document.querySelector("#live2dcanvas"))
    );
    await p.locator('[data-classic-page="gallery"]').click();
    await p.waitForURL("**/gallery/");
    assert(
      await p
        .locator("#live2d-widget")
        .evaluate((e) =>
          e.parentElement.hasAttribute("data-companion-mobile-dock")
        )
    );
    assert(
      await p.evaluate(
        () => document.querySelector("#live2dcanvas") === window.mobileCanvas
      )
    );
    assert(
      await p.evaluate(
        () =>
          document.querySelector("#live2d-widget").getBoundingClientRect()
            .top >=
          document.querySelector(".page").getBoundingClientRect().bottom
      )
    );
    await p.locator('[data-classic-page="home"]').click();
    await p.waitForURL(base);
    assert.equal(await p.locator(".classic-page-index").count(), 1);
    assert(
      await p
        .locator(".classic-page-index")
        .evaluate((e) => e.parentElement.hasAttribute("data-mobile-page-index"))
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: mobile default-on without scroll jumps, persisted opt-out with no model load, footer/index ordering, independent visibility and persistent canvas on navigation"
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
