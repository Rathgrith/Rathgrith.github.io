/* Dedicated layout: real dialogue transitions, keyboard navigation and both games. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out = "/private/tmp/playground-design";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const [width, height, touch] of [
      [1440, 1000, false],
      [1920, 1080, false],
      [768, 1000, true],
      [375, 812, true],
      [320, 740, true],
      [844, 390, true],
    ]) {
      const context = await browser.newContext({
          viewport: { width, height },
          hasTouch: touch,
        }),
        p = await context.newPage(),
        errors = [],
        requests = [];
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("request", (r) => requests.push(r.url()));
      await p.addInitScript(() =>
        localStorage.setItem(
          "site-companion-v1",
          JSON.stringify({
            speed: 0,
            affinity: { alice: 35, marisa: 35, patchouli: 35 },
          })
        )
      );
      await p.goto(base + "playground/", { waitUntil: "domcontentloaded" });
      const w = p.locator("#live2d-widget");
      await p.waitForFunction(
        () =>
          window.SiteCompanion &&
          document.querySelector("#live2d-widget")?.dataset.live2dCharacter ===
            "alice" &&
          !document
            .querySelector("#live2d-widget")
            .classList.contains("is-loading"),
        null,
        { timeout: 60000 }
      );
      await p.evaluate(() => document.fonts.ready);
      const settle = () =>
        p.evaluate(
          () =>
            new Promise((r) =>
              requestAnimationFrame(() => requestAnimationFrame(r))
            )
        );
      const geometry = () =>
        w.evaluate((w) => {
          const rect = (s) => {
            const r = w.querySelector(s).getBoundingClientRect();
            return {
              x: r.x,
              y: r.y,
              w: r.width,
              h: r.height,
              right: r.right,
              bottom: r.bottom,
            };
          };
          return {
            scene: rect(".companion-stage"),
            dialogue: rect(".companion-conversation"),
            radio: rect(".vn-bgm"),
            main: rect(".vn-main-view"),
            camera: [
              w.querySelector("canvas").width,
              w.querySelector("canvas").height,
            ],
            overflow: document.documentElement.scrollWidth > innerWidth,
          };
        });
      const before = await geometry();
      assert(!before.overflow);
      assert(
        before.scene.w > 200 && before.scene.h >= 100,
        JSON.stringify(before)
      );
      if (width < 640)
        assert(
          before.scene.h >= 220,
          "portrait keeps a readable character close-up"
        );
      if (width >= 640 && height < 540) {
        assert.equal(
          await w.getAttribute("data-playground-layout"),
          "landscape"
        );
        assert(
          before.scene.right < before.dialogue.x,
          "short landscape separates the scene and desk"
        );
      }
      assert(
        await p
          .locator(".vn-bgm")
          .evaluate(
            (e) =>
              e.scrollWidth <= e.clientWidth + 1 &&
              e.scrollHeight <= e.clientHeight + 1
          ),
        "the physical receiver contains every control"
      );
      assert(
        await p
          .locator(".vn-cast button")
          .evaluateAll((list) =>
            list.every((e) => e.scrollWidth <= e.clientWidth + 1)
          ),
        "all character tabs fit their labels"
      );
      await p.screenshot({ path: `${out}/main-${width}.png` });
      if (width >= 760 && height >= 540) {
        assert(
          before.scene.bottom <= before.dialogue.y + 1,
          "dialogue sits below the scene"
        );
        assert(
          before.dialogue.right < before.radio.x,
          "radio is beside the dialogue desk"
        );
      }
      await p.locator('[data-vn-open="topics"]').click();
      await p.locator('[data-vn-topic-start^="branch:"]').first().click();
      await p.waitForFunction(
        () =>
          document.querySelector("#live2d-widget").dataset.dialogueState ===
          "choice"
      );
      await settle();
      const choices = await geometry();
      assert.equal(
        choices.dialogue.h,
        before.dialogue.h,
        "options never grow the dialogue"
      );
      assert.equal(
        choices.radio.h,
        before.radio.h,
        "options never shrink the player"
      );
      assert.equal(choices.scene.h, before.scene.h);
      assert.deepEqual(choices.camera, before.camera);
      for (const option of await p.locator(".vn-choices button").all())
        await option.click({ trial: true });
      const choiceButtons = p.locator(".vn-choices button");
      await choiceButtons.first().focus();
      await p.keyboard.press("ArrowUp");
      assert(
        await choiceButtons
          .last()
          .evaluate((e) => e === document.activeElement),
        "choice arrows wrap and reveal the last option"
      );
      await p.keyboard.press("Home");
      assert(
        await choiceButtons
          .first()
          .evaluate((e) => e === document.activeElement)
      );
      const overflow = await p
        .locator(".vn-dialogue-body")
        .evaluate((e) => e.scrollHeight > e.clientHeight + 3);
      if (overflow) {
        await p.locator(".vn-dialogue-body").evaluate((e) => (e.scrollTop = 0));
        await settle();
        assert(
          await p
            .locator(".companion-conversation")
            .evaluate((e) => e.classList.contains("has-more-dialogue")),
          "overflow hint appears"
        );
        await p
          .locator(".vn-dialogue-body")
          .evaluate((e) => (e.scrollTop = e.scrollHeight));
        await settle();
        assert(
          !(await p
            .locator(".companion-conversation")
            .evaluate((e) => e.classList.contains("has-more-dialogue"))),
          "hint clears at the last choice"
        );
      }
      await p.locator('[data-vn-open="settings"]').click();
      const panel = p.locator('[data-vn-panel="settings"]');
      const bounds = await panel.boundingBox();
      assert(
        bounds.x >= 0 &&
          bounds.y >= 0 &&
          bounds.x + bounds.width <= width + 1 &&
          bounds.y + bounds.height <= height + 1,
        JSON.stringify(bounds)
      );
      const duringPanel = await geometry();
      assert.equal(
        duringPanel.scene.h,
        before.scene.h,
        "menus retain the scene behind them"
      );
      assert.equal(
        duringPanel.radio.h,
        before.radio.h,
        "menus retain the radio dimensions"
      );
      await p.screenshot({ path: `${out}/settings-${width}.png` });
      const stops = panel.locator(
        "button:visible:not(:disabled),input:visible:not(:disabled),select:visible:not(:disabled),summary:visible,a[href]:visible"
      );
      await stops.last().focus();
      await p.keyboard.press("Tab");
      assert(
        await stops.first().evaluate((e) => e === document.activeElement),
        "Tab wraps within the panel"
      );
      await p.keyboard.press("Shift+Tab");
      assert(
        await stops.last().evaluate((e) => e === document.activeElement),
        "reverse Tab wraps"
      );
      await p.keyboard.press("Escape");
      assert(!(await panel.isVisible()));
      assert(
        await p
          .locator('[data-vn-open="settings"]')
          .evaluate((e) => e === document.activeElement),
        "Escape restores focus"
      );
      assert(!(await p.locator(".vn-main-view").evaluate((e) => e.inert)));
      await p.locator(".vn-dialogue-body").evaluate((e) => (e.scrollTop = 0));
      await p.screenshot({ path: `${out}/dialogue-${width}.png` });
      if (width === 1440) {
        for (const id of ["marisa", "patchouli", "alice"]) {
          await p.locator(`[data-vn-character="${id}"]`).click();
          await p.waitForFunction(
            (id) =>
              document.querySelector("#live2d-widget").dataset
                .live2dCharacter === id &&
              !document
                .querySelector("#live2d-widget")
                .classList.contains("is-loading"),
            id,
            { timeout: 60000 }
          );
          await p.screenshot({ path: `${out}/${id}.png` });
        }
      }
      for (const mode of ["score", "flower"]) {
        await p.locator("[data-danmaku-open]").click();
        await p.locator(`[data-danmaku-game-mode="${mode}"]`).click();
        await p.locator('[data-danmaku-challenge="patchouli"]').click();
        await p.locator("[data-danmaku-pause]").click();
        const arena = await p.locator("[data-danmaku-canvas]").boundingBox();
        assert(
          arena.width > 100 &&
            arena.height > 150 &&
            arena.y + arena.height <= height + 1,
          JSON.stringify(arena)
        );
        if (width >= 1024 && height > 500)
          assert(
            arena.height > height * 0.68,
            "desktop battle uses the available height"
          );
        assert.equal(
          await p.locator("[data-danmaku-music]").getAttribute("aria-pressed"),
          "true"
        );
        assert.equal(
          await p.locator("[data-danmaku-sfx]").getAttribute("aria-pressed"),
          "true"
        );
        await p.screenshot({ path: `${out}/${mode}-${width}.png` });
        await p.locator("[data-danmaku-menu]").click();
        await p.locator("[data-danmaku-exit]").click();
        assert(
          await p
            .locator("[data-danmaku-open]")
            .evaluate((e) => e === document.activeElement),
          "leaving battle restores its launcher"
        );
      }
      assert(
        !requests.some((url) =>
          /MathJax|fa-(?:solid|brands)|classic-gallery-viewer|publication-filter|classic-navigation/.test(
            url
          )
        ),
        "standalone does not request unrelated homepage assets"
      );
      assert.deepEqual(errors, []);
      console.log("PASS design", width, height, {
        touch,
        scene: before.scene.h,
        dialogue: before.dialogue.h,
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
