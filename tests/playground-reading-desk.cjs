/* Exercise the standalone reading desk with real choices, typing and model readiness. */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.addInitScript(() => {
      localStorage.setItem("site-companion-v1", JSON.stringify({ speed: 65 }));
      window.deskEffects = [];
      const animate = Element.prototype.animate;
      Element.prototype.animate = function (frames, options) {
        const result = animate.call(this, frames, options);
        if (result.id === "playground-dialogue")
          window.deskEffects.push({ element: this, delay: options.delay });
        return result;
      };
    });
    let releaseModel;
    const loading = new Promise((resolve) => { releaseModel = resolve; });
    await page.route("**/live2dcubismcore.min.js*", async (route) => {
      await loading;
      await route.continue();
    });
    await page.goto(base + "playground/", { waitUntil: "domcontentloaded" });
    const topics = page.locator('[data-vn-open="topics"]');
    const menu = page.locator('[data-vn-panel="topics"]');
    await topics.click();
    await menu.waitFor();
    releaseModel();
    await page.waitForFunction(() => {
      const w = document.querySelector("#live2d-widget");
      return w.dataset.live2dCharacter === "alice" && !w.classList.contains("is-loading");
    });
    assert(await menu.isVisible(), "A model becoming ready preserves an open dialogue menu");
    await page.locator('[data-vn-topic-start="branch:daily"]').click();
    const centered = await page.locator("[data-vn-reading]").evaluate((e) => {
      const body = e.getBoundingClientRect(), text = e.querySelector("p").getBoundingClientRect();
      return Math.abs(text.y + text.height / 2 - body.y - body.height / 2) < 6;
    });
    assert(centered, "The desktop opening line is vertically centered in the reading area");
    await page.evaluate(() => {
      // Long authored text must remain reachable in the same reading viewport.
      const node = CompanionBranches.alice.nodes.daily;
      node.lines[0].text = node.lines[0].text.repeat(3);
      node.choices[2].label += "　その話、初めて聞いたからもう少し詳しく聞かせてくれる？";
    });
    const reading = page.locator("[data-vn-reading]");
    const options = page.locator("[data-vn-choices] button");
    async function openBranch() {
      await topics.click();
      await page.locator('[data-vn-topic-start="branch:daily"]').click();
    }
    for (const [width, height] of [[1366, 768], [320, 740], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.evaluate(() => { window.deskEffects = []; });
      await openBranch();
      await page.waitForFunction(() => document.querySelector("[data-live2d-dialogue-text]").textContent.length >= 4);
      assert.equal(await page.evaluate(() => deskEffects.filter((e) => e.element.matches(".vn-dialogue-ornament")).length), 1,
        "Rendering multiple glyphs or replaying identical dialogue triggers one frame pulse per line");
      const bounds = await page.locator(".companion-conversation").boundingBox();
      const baseline = await reading.locator("p").boundingBox();
      await page.waitForFunction(() => document.querySelector("[data-live2d-dialogue-text]").textContent.length >= 28);
      assert.equal((await reading.locator("p").boundingBox()).y, baseline.y,
        "Typing across a new line preserves the first line's position");
      await reading.click();
      await options.first().waitFor();
      assert.equal(await reading.getAttribute("aria-disabled"), "true");
      assert.equal(await reading.getAttribute("tabindex"), "-1");
      const after = await page.locator(".companion-conversation").boundingBox();
      assert.equal(after.height, bounds.height, "Options keep the reading desk height stable");
      assert.deepEqual(await page.evaluate(() =>
        deskEffects.filter((e) => e.element.closest(".vn-choices")).map((e) => e.delay)
      ), [0, 32, 64]);
      await options.first().focus();
      await page.keyboard.press("ArrowRight");
      assert(await options.nth(1).evaluate((e) => e === document.activeElement),
        "Horizontal arrows follow the desktop reply row");
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("ArrowUp");
      assert(await options.last().evaluate((e) => {
        const body = e.closest(".vn-dialogue-body");
        const b = body.getBoundingClientRect(), r = e.getBoundingClientRect();
        return document.activeElement === e && e.scrollWidth <= e.clientWidth + 1 &&
          r.top >= b.top - 1 && r.bottom <= b.bottom + 1;
      }), "Keyboard navigation reveals a wrapped final option completely");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.querySelector("#live2d-widget").dataset.vnBranchNode !== "daily");
    }
    await page.evaluate(() => { window.deskEffects = []; });
    await page.locator('[data-vn-character="marisa"]').click();
    assert.equal(await page.evaluate(() => deskEffects.filter((e) => e.element.matches("[data-live2d-dialogue-name]")).length), 1);
    await page.locator('[data-vn-character="alice"]').click();
    await openBranch();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await options.first().waitFor();
    assert(await page.evaluate(() => !document.getAnimations().some((a) => a.id === "playground-dialogue")));
    await page.evaluate(() => { window.deskEffects = []; });
    await openBranch();
    assert.equal(await options.count(), 3);
    assert.equal(await page.evaluate(() => deskEffects.length), 0, "Reduced motion shows the complete line and choices immediately");
    const reply = (await options.first().textContent()).replace(/^▸ /, "");
    await options.first().click();
    await page.locator('[data-vn-open="history"]').click();
    const history = page.locator("[data-vn-history-list]");
    const recordedReply = history.locator(".vn-history-reply").last();
    assert.equal(await recordedReply.locator("strong").textContent(), "あなた");
    assert.equal(await recordedReply.locator("p").textContent(), reply);
    assert.equal(await history.locator("li").last().locator("strong").textContent(), "アリス");
    assert(await history.evaluate(e => e.scrollTop + e.clientHeight >= e.scrollHeight - 1),
      "History opens at the latest exchange");
    console.log("PASS: model readiness preserves menus, long Japanese text and choices remain accessible, stable desk geometry, single line and character cues, staggered replies, instant reduced motion");
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
