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
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.route("**/live2dcubismcore.min.js", (r) => r.abort());
    await p.route("https://api.open-meteo.com/**", (r) => r.abort());
    await p.goto(base);
    await p.waitForSelector("#live2d-widget.has-live2d-error", {
      timeout: 30000,
    });
    await p.locator('[data-vn-open="settings"]').click();
    await p.locator("[data-vn-speed]").selectOption("0");
    await p.keyboard.press("Escape");
    await p.locator('[data-vn-open="topics"]').click();
    await p.locator('[data-vn-topic-start="craft"]').click();
    assert(
      (await p.locator("[data-live2d-dialogue-text]").textContent()).length > 5
    );
    await p.locator("[data-vn-auto]").click();
    await p.waitForFunction(
      () =>
        document.querySelector("#live2d-widget").dataset.dialogueState ===
        "choice",
      {},
      { timeout: 15000 }
    );
    await p.waitForTimeout(600);
    assert.equal(await p.locator("[data-vn-choices] button").count(), 2);
    await p.locator("[data-vn-auto]").click();
    await p.locator('[data-vn-open="weather"]').click();
    assert(await p.locator("[data-weather-widget]").isVisible());
    assert((await p.locator("[data-weather-status]").textContent()).length > 0);
    await p.keyboard.press("Escape");
    await p.unroute("**/live2dcubismcore.min.js");
    await p.locator("[data-vn-retry]").click();
    await p.waitForFunction(
      () => {
        const e = document.querySelector("#live2d-widget");
        return (
          !e.classList.contains("is-loading") &&
          !e.classList.contains("has-live2d-error") &&
          e.dataset.live2dCharacter === "alice"
        );
      },
      null,
      { timeout: 45000 }
    );
    await p.evaluate(() =>
      ["marisa", "patchouli", "alice", "marisa"].forEach((id) =>
        document.querySelector(`[data-classic-character="${id}"]`).click()
      )
    );
    await p.waitForFunction(
      () =>
        document.querySelector("#live2d-widget").dataset.live2dCharacter ===
          "marisa" &&
        !document
          .querySelector("#live2d-widget")
          .classList.contains("is-loading"),
      null,
      { timeout: 45000 }
    );
    assert.equal(await p.locator("canvas#live2dcanvas").count(), 1);
    assert.equal(
      await p.locator("#live2d-widget").getAttribute("data-vn-character"),
      "marisa"
    );
    await p.locator('[data-vn-open="settings"]').click();
    await p.locator("[data-vn-speed]").selectOption("65");
    await p.keyboard.press("Escape");
    await p.locator('[data-vn-open="topics"]').click();
    await p.locator('[data-vn-topic-start="craft"]').click();
    await p.locator("[data-companion-minimize]").click();
    const paused = await p.locator("[data-live2d-dialogue-text]").textContent();
    await p.waitForTimeout(450);
    assert.equal(
      await p.locator("[data-live2d-dialogue-text]").textContent(),
      paused
    );
    assert.deepEqual(errors, []);
    await p.close();
    // Blocked storage must keep character choice and settings usable in memory.
    const q = await b.newPage({
      viewport: { width: 375, height: 812 },
      reducedMotion: "reduce",
    });
    q.on("pageerror", (e) => errors.push(e.message));
    await q.addInitScript(() => {
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
      const NativeDate = Date;
      window.Date = class extends NativeDate {
        constructor(...args) {
          super(...(args.length ? args : [2026, 9, 31, 12]));
        }
      };
    });
    await q.goto(base);
    await q.locator('[data-classic-character="patchouli"]').click();
    assert.equal(await q.locator("#live2d-widget").isVisible(), false);
    await q.locator("[data-site-options-trigger]").click();
    await q.locator("[data-live2d-toggle]").click();
    await q.keyboard.press("Escape");
    await q.waitForFunction(
      () =>
        document.querySelector("#live2d-widget").dataset.live2dCharacter ===
          "patchouli" &&
        !document
          .querySelector("#live2d-widget")
          .classList.contains("is-loading"),
      null,
      { timeout: 45000 }
    );
    assert.equal(
      await q.locator("html").getAttribute("data-live2d-character"),
      "patchouli"
    );
    assert.equal(
      await q.locator("#live2d-widget").getAttribute("data-dialogue-state"),
      "ready"
    );
    const halloween = await q.evaluate(
      () => CompanionStories.characters.patchouli.holidays.halloween.text
    );
    assert.equal(
      await q.locator("[data-live2d-dialogue-text]").textContent(),
      halloween
    );
    await q.locator('[data-vn-open="settings"]').click();
    await q.locator("[data-vn-affinity-input]").evaluate((e) => {
      e.value = "100";
      e.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await q.keyboard.press("Escape");
    assert.equal(await q.locator("[data-vn-affinity]").textContent(), "内緒話");
    await q.locator("[data-companion-close]").click();
    assert.equal(await q.locator("#live2d-widget").isVisible(), false);
    await q.locator("[data-site-options-trigger]").click();
    await q.locator("[data-live2d-toggle]").click();
    assert(await q.locator("#live2d-widget").isVisible());
    assert.deepEqual(errors, []);
    console.log(
      "PASS: model failure/retry, weather failure, auto choices, rapid switching, pause, blocked storage, reduced motion and Halloween dialogue"
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
