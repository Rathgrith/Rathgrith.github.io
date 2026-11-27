/* Real pointer/keyboard resizing, canvas resolution and window lifecycle. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const out =
  process.env.QA_OUTPUT || require("node:os").tmpdir() + "/playground-window";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-gpu"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    // Keep the reply list available while measuring each button across window sizes.
    // The dialogue suite separately exercises the three-second idle timeout.
    await page.addInitScript(() => {
      if (!localStorage.getItem("site-companion-v1"))
        localStorage.setItem("site-companion-v1", JSON.stringify({ foldIdleReplies: false }));
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/companion-dialogue.js*", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          ";const originalMount=SiteCompanion.mount;SiteCompanion.mount=function(w,h){window.windowActing=h;return originalMount(w,h)};",
      });
    });
    await page.goto(process.env.PREVIEW_URL || "http://127.0.0.1:4100/");
    const widget = page.locator("#live2d-widget");
    await page.waitForFunction(
      () =>
        document.querySelector("#live2d-widget")?.dataset.live2dCharacter ===
        "alice",
      { timeout: 60000 }
    );
    assert.equal(
      await page.locator("[data-companion-name]").textContent(),
      "Playground"
    );
    const docked = () =>
      widget.evaluate((w) => w.classList.contains("is-docked"));
    async function checkWindowControls(maximize, minimize) {
      const controls = widget.locator(".companion-controls > :is(a, button)");
      assert.deepEqual(await controls.allTextContents(), [
        "Open page", "Dock", maximize, minimize, "Close",
      ]);
      assert(await controls.evaluateAll((buttons) => buttons.every((button) => {
        const bounds = button.getBoundingClientRect();
        const text = button.querySelector("span").getBoundingClientRect();
        const bar = button.closest(".companion-titlebar").getBoundingClientRect();
        return text.width > 0 && text.height > 0 &&
          text.left >= bounds.left && text.right <= bounds.right + 1 &&
          text.top >= bounds.top && text.bottom <= bounds.bottom + 1 &&
          bounds.left >= bar.left && bounds.right <= bar.right + 1;
      })), "every window action has a visible, unclipped label");
    }
    const checkCanvas = async () => {
      await page.waitForTimeout(250);
      assert(
        await widget.evaluate((w) => {
          const s = w.querySelector(".companion-stage"),
            c = w.querySelector("canvas");
          return (
            s.clientWidth > 0 &&
            s.clientHeight > 0 &&
            Math.abs(c.width / s.clientWidth - c.height / s.clientHeight) < 0.03
          );
        }),
        "canvas must be rerendered at the stage aspect ratio, not stretched"
      );
    };
    assert(await docked());
    assert(await page.getByRole("button", { name: "Dock", exact: true }).isDisabled());
    await widget.scrollIntoViewIfNeeded();
    await checkWindowControls("Maximize", "Minimize");
    await widget.screenshot({ path: out + "/docked.png" });
    await page.locator("[data-companion-maximize]").click();
    assert(!(await docked()));
    assert(await page.getByRole("button", { name: "Dock", exact: true }).isEnabled());
    assert.equal(await widget.getAttribute("data-playground-layout"), "wide");
    await checkCanvas();
    let r = await widget.boundingBox();
    assert.equal(Math.round(r.width), 1080);
    assert.equal(Math.round(r.height), 750);
    assert.equal(Math.round(r.x), 180);
    assert.equal(Math.round(r.y), 125);
    await page.evaluate(() =>
      windowActing.perform({
        poseId: "1",
        expressionMotionId: "06",
        effect: "surprise",
      })
    );
    await page.waitForTimeout(150);
    assert(
      await widget.evaluate((w) => {
        const scale = Number(w.dataset.playgroundScale),
          icon = w.querySelector(".vn-cast img"),
          reaction = w.querySelector(".vn-reaction");
        return (
          scale > 1 &&
          Math.abs(
            icon.getBoundingClientRect().width / icon.offsetWidth - scale
          ) < 0.02 &&
          reaction &&
          Math.abs(
            reaction.getBoundingClientRect().width / reaction.offsetWidth -
              scale
          ) < 0.02
        );
      }),
      "cast sprites and reaction canvas share the font/control scale"
    );
    await widget.screenshot({ path: out + "/maximized.png" });
    await page.evaluate(() => {
      SiteCompanion.start("craft");
      SiteCompanion.next();
      SiteCompanion.next();
      SiteCompanion.next();
    });
    await page.waitForTimeout(100);
    assert(
      await widget.evaluate((w) => {
        const reading = w
            .querySelector("#live2d-dialogue")
            .getBoundingClientRect(),
          text = w
            .querySelector(".live2d-dialogue__text")
            .getBoundingClientRect(),
          choices = w.querySelector(".vn-choices"),
          body = w.querySelector(".vn-dialogue-body"),
          viewport = body.getBoundingClientRect(),
          conversation = w
            .querySelector(".companion-conversation")
            .getBoundingClientRect();
        return (
          text.top >= reading.top - 1 &&
          text.bottom <= reading.bottom + 1 &&
          w.querySelector(".vn-scene-frame").contains(choices) &&
          viewport.top >= conversation.top - 1 &&
          viewport.bottom <= conversation.bottom + 1 &&
          (getComputedStyle(body).overflowY === "auto" || body.scrollHeight <= body.clientHeight + 1)
        );
      }),
      "replies appear in the scene while the dialogue stays in its own reading area"
    );
    const fixedRegions = () =>
      widget.evaluate((w) =>
        [".vn-scene-frame", ".companion-conversation", ".vn-bgm"].map(
          (selector) =>
            w.querySelector(selector).getBoundingClientRect().toJSON()
        )
      );
    const beforeChoiceScroll = await fixedRegions();
    // Long branches may exceed the viewport. Verify their clipped portion can
    // actually be reached instead of requiring every raw rect to fit at once.
    for (const option of await page.locator(".vn-choices button").all()) {
      await option.scrollIntoViewIfNeeded();
      await option.click({ trial: true });
      assert(
        await option.evaluate((el) => {
          const r = el.getBoundingClientRect(),
            body = el.closest(".vn-scene-frame").getBoundingClientRect();
          return r.top >= body.top - 1 && r.bottom <= body.bottom + 1;
        }),
        "each branch option can be brought fully into its viewport"
      );
    }
    assert.deepEqual(
      await fixedRegions(),
      beforeChoiceScroll,
      "scrolling choices never moves the scene, dialogue frame or radio"
    );
    await page.locator(".vn-choices button").first().click();
    await page.evaluate(() => SiteCompanion.start("today"));
    await page.locator("[data-danmaku-open]").click();
    await page.locator('[data-danmaku-challenge="marisa"]').click();
    await page.waitForTimeout(350);
    let gameCanvas = await page.locator("[data-danmaku-canvas]").boundingBox();
    assert(
      gameCanvas.height > 350 && gameCanvas.width > 230,
      JSON.stringify(gameCanvas)
    );
    await widget.screenshot({ path: out + "/maximized-game.png" });
    await page.locator("[data-danmaku-exit]").click();
    await page.locator('[data-vn-open="settings"]').click();
    assert(await page.locator("[data-vn-affinity-input]").isVisible());
    await page.keyboard.press("Escape");
    await page.locator("[data-companion-maximize]").click();
    assert(await docked(), "restore returns to original page dock");
    // Detach, place at the top-left and resize using a genuine pointer drag.
    await page.locator("[data-companion-titlebar]").focus();
    await page.keyboard.press("ArrowLeft");
    const title = await page.locator("[data-companion-titlebar]").boundingBox();
    await page.mouse.move(title.x + 70, title.y + 12);
    await page.mouse.down();
    await page.mouse.move(78, 20, { steps: 6 });
    await page.mouse.up();
    const grip = page.locator("[data-companion-resize]");
    let g = await grip.boundingBox();
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down();
    await page.mouse.move(800, 870, { steps: 10 });
    await page.mouse.up();
    await checkCanvas();
    r = await widget.boundingBox();
    assert(
      r.width > 700 && r.height >= 700 && r.height <= 750,
      JSON.stringify(r)
    );
    assert.equal(await widget.getAttribute("data-playground-layout"), "wide");
    await grip.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(100);
    let adjusted = await widget.boundingBox();
    assert.equal(Math.round(adjusted.width - r.width), 16);
    await page.locator("[data-companion-maximize]").click();
    await page.locator("[data-companion-maximize]").click();
    r = await widget.boundingBox();
    assert.equal(Math.round(r.width), Math.round(adjusted.width));
    await page.locator("[data-companion-minimize]").click();
    assert(!(await page.locator("[data-companion-content]").isVisible()));
    assert(!(await grip.isVisible()));
    await checkWindowControls("Maximize", "Expand");
    await page.locator("[data-companion-maximize]").click();
    assert(await page.locator("[data-companion-content]").isVisible());
    // Maximized windows remain within the screen after narrowing/rotation.
    for (const [width, height] of [
      [2560, 1440],
      [1920, 1080],
      [1366, 768],
      [1024, 768],
      [620, 720],
      [390, 844],
      [320, 700],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      await checkCanvas();
      await checkWindowControls("Restore", "Minimize");
      const info = await widget.evaluate((w) => {
        const r = w.getBoundingClientRect(),
          main = w.querySelector(".vn-main-view");
        return {
          x: r.x,
          y: r.y,
          right: r.right,
          bottom: r.bottom,
          overflow: main.scrollWidth > main.clientWidth + 1,
          pageOverflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert(
        info.x >= 0 &&
          info.y >= 0 &&
          info.right <= width &&
          info.bottom <= height &&
          !info.overflow &&
          !info.pageOverflow,
        JSON.stringify({ width, height, ...info })
      );
      if (height >= 700)
        assert(
          await widget.evaluate((w) => {
            const main = w.querySelector(".vn-main-view");
            return main.scrollHeight <= main.clientHeight + 2;
          }),
          `portrait maximization must fit its controls at ${width}x${height}: ${JSON.stringify(
            await widget.evaluate((w) => {
              const main = w.querySelector(".vn-main-view");
              return { height: main.clientHeight, content: main.scrollHeight };
            })
          )}`
        );
      if (width >= 1024) {
        for (const character of ["alice", "marisa", "patchouli"]) {
          await page
            .locator('button[data-vn-character="' + character + '"]')
            .click();
          await page.waitForFunction(
            (id) =>
              document.querySelector("#live2d-widget").dataset
                .live2dCharacter === id,
            character
          );
          const dialogueHeight = await page
            .locator(".companion-conversation")
            .evaluate((el) => el.getBoundingClientRect().height);
          await page.evaluate(() => {
            SiteCompanion.start("craft");
            SiteCompanion.next();
            SiteCompanion.next();
            SiteCompanion.next();
          });
          await page.waitForTimeout(100);
          assert(
            await widget.evaluate((w) => {
              const choices = w.querySelector(".vn-choices"),
                body = w.querySelector(".vn-dialogue-body");
              return (
                w.querySelector(".vn-scene-frame").contains(choices) &&
                body.getBoundingClientRect().bottom <=
                  w
                    .querySelector(".companion-conversation")
                    .getBoundingClientRect().bottom &&
                (getComputedStyle(body).overflowY === "auto" || body.scrollHeight <= body.clientHeight + 1)
              );
            }),
            `${character} options stay on the scene and the dialogue remains readable at ${width}x${height}`
          );
          assert(
            Math.abs(
              (await page
                .locator(".companion-conversation")
                .evaluate((el) => el.getBoundingClientRect().height)) -
                dialogueHeight
            ) < 1,
            "options never change the dialogue height"
          );
          for (const option of await page.locator(".vn-choices button").all())
            await option.click({ trial: true });
        }
        await page.evaluate(() => SiteCompanion.start("today"));
      }
      await widget.screenshot({
        path: out + "/" + width + "x" + height + ".png",
      });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("[data-companion-reset-position]").click();
    assert(await docked());
    assert(!(await widget.evaluate((w) => w.classList.contains("is-sized"))));
    await page.locator("[data-companion-maximize]").click();
    // Soft navigation resets dimensions without recreating the radio/model DOM.
    await page.evaluate(() => {
      window.retainedRadio = document.querySelector(".vn-bgm");
      window.retainedCanvas = document.querySelector("#live2dcanvas");
      document.querySelector('[data-classic-page="gallery"]').click();
    });
    await page.waitForURL("**/gallery/");
    assert(await docked());
    assert(await widget.evaluate((w) => !!w.closest(".classic-gallery-rail")));
    assert(
      await page.evaluate(
        () =>
          window.retainedRadio &&
          window.retainedRadio === document.querySelector(".vn-bgm") &&
          window.retainedCanvas === document.querySelector("#live2dcanvas")
      )
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: Playground pointer/keyboard resize, centered 75% cap, uniform sprite/effect scale, maximize/restore/minimize/reset, canvas aspect ratio, 8 desktop/narrow/landscape layouts, retained navigation."
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
