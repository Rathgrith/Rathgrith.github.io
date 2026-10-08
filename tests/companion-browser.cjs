const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const out =
  process.env.QA_OUTPUT || require("node:os").tmpdir() + "/homepage-qa";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-gpu"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  let errors = [],
    bad = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("response", (r) => {
    if (r.url().startsWith("http://127.0.0.1") && r.status() >= 400)
      bad.push(r.url());
  });
  await page.goto(process.env.PREVIEW_URL || "http://127.0.0.1:4100/");
  await page.waitForFunction(
    () =>
      document.querySelector("#live2d-widget")?.dataset.dialogueState ===
      "typing"
  );
  await page.evaluate(() => document.fonts.ready);
  const first = await page.locator("[data-live2d-dialogue-text]").textContent();
  await page.waitForTimeout(170);
  assert(
    (await page.locator("[data-live2d-dialogue-text]").textContent()).length >=
      first.length
  );
  await page.locator("[data-vn-reading]").click();
  assert.equal(
    await page.locator("#live2d-widget").getAttribute("data-dialogue-state"),
    "ready"
  );
  assert.equal(
    await page
      .locator("[data-vn-translation], [data-vn-source], [data-vn-hint]")
      .count(),
    0
  );
  assert.equal(await page.locator("#live2d-widget").getAttribute("lang"), "ja");
  assert.equal(
    await page
      .locator("#live2d-widget")
      .evaluate((e) => e.parentElement.hasAttribute("data-companion-dock")),
    true
  );
  for (const id of ["alice", "marisa", "patchouli"]) {
    await page.locator(`button[data-vn-character="${id}"]`).click();
    await page.waitForFunction(
      (id) =>
        document.querySelector("#live2d-widget").dataset.live2dCharacter ===
          id &&
        !document
          .querySelector("#live2d-widget")
          .classList.contains("is-loading"),
      id
    );
    await page.locator('[data-vn-open="settings"]').click();
    await page.locator("[data-vn-speed]").selectOption("0");
    await page.locator("[data-vn-affinity-input]").evaluate((e) => {
      e.value = "90";
      e.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.keyboard.press("Escape");
    await page.locator('[data-vn-open="topics"]').click();
    await page.locator('[data-vn-topic-start="craft"]').click();
    await page.locator("#live2d-interact").click();
    assert.equal(await page.locator("[data-vn-choices] button").count(), 2);
    await page.screenshot({ path: out + "/" + id + "-choices.png" });
    const response = await page.evaluate(
      (id) => CompanionStories.characters[id].choices[0].responses[3].text,
      id
    );
    await page.locator("[data-vn-choices] button").first().click();
    assert.equal(
      await page.locator("[data-live2d-dialogue-text]").textContent(),
      response
    );
    assert.equal(
      await page.locator("[data-vn-affinity]").textContent(),
      "内緒話"
    );
    assert.equal(
      await page.evaluate(
        (id) =>
          JSON.parse(localStorage.getItem("site-companion-v1")).affinity[id],
        id
      ),
      92
    );
    await page.locator('[data-vn-open="topics"]').click();
    await page.locator('[data-vn-topic-start="friends"]').click();
    const remarks = await page.evaluate((id) => CompanionRemarks[id], id);
    assert.equal(
      await page.locator("[data-vn-friends-list] button").count(),
      remarks.length
    );
    await page.screenshot({ path: out + "/" + id + "-friends.png" });
    await page.locator("[data-vn-friends-list] button").last().click();
    assert.equal(
      await page.locator("[data-live2d-dialogue-text]").textContent(),
      remarks.at(-1).text
    );
    await page.locator("#live2d-interact").click();
    assert(await page.locator('[data-vn-panel="friends"]').isVisible());
    await page.keyboard.press("Escape");
    assert(
      await page
        .locator('[data-vn-open="topics"]')
        .evaluate((e) => e === document.activeElement)
    );
    await page.locator("#live2d-widget").scrollIntoViewIfNeeded();
    await page.screenshot({ path: out + "/" + id + ".png" });
  }
  // Affinity settings survive reload and do not leak between characters.
  await page.locator('[data-vn-open="settings"]').click();
  await page.locator("[data-vn-affinity-input]").evaluate((e) => {
    e.value = "0";
    e.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await page.screenshot({ path: out + "/settings.png" });
  await page.keyboard.press("Escape");
  await page.reload();
  await page.waitForSelector("[data-vn-affinity]");
  assert.equal(
    await page.locator("[data-vn-affinity]").textContent(),
    "初対面"
  );
  await page.locator('[data-vn-open="settings"]').click();
  await page.keyboard.press("Escape");
  await page.locator('button[data-vn-character="alice"]').click();
  assert.equal(
    await page.locator("[data-vn-affinity]").textContent(),
    "内緒話"
  );
  await page.locator('[data-vn-open="weather"]').click();
  assert.equal(
    await page
      .locator("[data-weather-widget]")
      .evaluate((e) => !!e.closest("#live2d-widget")),
    true
  );
  assert(await page.locator("[data-weather-widget]").isVisible());
  await page.screenshot({ path: out + "/weather.png" });
  await page.keyboard.press("Escape");
  // A single retained window and weather widget across soft navigation.
  await page.evaluate(() => {
    window.qaCanvas = document.querySelector("#live2dcanvas");
  });
  await page.locator('[data-classic-page="gallery"]').click();
  await page.waitForURL("**/gallery/");
  assert.equal(await page.locator("#live2d-widget").count(), 1);
  assert(
    await page.evaluate(
      () => window.qaCanvas === document.querySelector("#live2dcanvas")
    )
  );
  assert.equal(await page.locator("[data-weather-widget]").count(), 1);
  assert.equal(await page.locator(".classic-photo").count(), 110);
  await page.locator(".classic-photo a").first().click();
  await page.keyboard.press("Escape");
  await page.locator('[data-classic-page="home"]').click();
  await page.waitForURL(process.env.PREVIEW_URL || "http://127.0.0.1:4100/");
  // Minimize, restore, then keyboard/pointer dragging and reset stay on screen.
  await page.locator("[data-companion-minimize]").click();
  assert.equal(
    await page.locator("[data-companion-content]").isVisible(),
    false
  );
  await page.locator("[data-companion-minimize]").click();
  const title = page.locator("[data-companion-titlebar]");
  await title.focus();
  await page.keyboard.press("ArrowLeft");
  await page.keyboard.press("ArrowUp");
  await page.keyboard.press("Home");
  await title.scrollIntoViewIfNeeded();
  const dragBox = await title.boundingBox();
  await page.mouse.move(dragBox.x + 70, dragBox.y + 12);
  await page.mouse.down();
  await page.mouse.move(700, 120, { steps: 6 });
  await page.mouse.up();
  const movedBox = await title.boundingBox();
  assert(
    Math.abs(movedBox.x - 630) < 3 && Math.abs(movedBox.y - 108) < 3,
    "Titlebar pointer drag must move the window"
  );
  await title.focus();
  await page.keyboard.press("Home");
  let widths = [];
  for (const width of [
    320, 375, 480, 599, 600, 768, 999, 1000, 1279, 1280, 1440, 1920,
  ]) {
    await page.setViewportSize({ width, height: 900 });
    await page.waitForTimeout(150);
    if (!(await page.locator("#live2d-widget").isVisible())) {
      await page.locator("[data-site-options-trigger]").click();
      await page.locator("[data-live2d-toggle]").click();
      await page.keyboard.press("Escape");
    }
    await page.evaluate(() => scrollTo(0, 0));
    const info = await page.evaluate(() => {
      let e = document.querySelector("#live2d-widget"),
        r = e.getBoundingClientRect(),
        f = document.querySelector(".classic-frame").getBoundingClientRect(),
        article = document.querySelector(".page").getBoundingClientRect(),
        docked = e.classList.contains("is-docked");
      return {
        width: innerWidth,
        overflow: document.documentElement.scrollWidth > innerWidth,
        widgetFits:
          r.left >= 0 &&
          r.right <= innerWidth &&
          (docked || (r.top >= 0 && r.bottom <= innerHeight)),
        overlapsWide: innerWidth >= 1000 && r.right > article.left,
        docked,
        frameWidth: f.width,
        contentOverflow:
          document.querySelector("[data-companion-content]").scrollWidth >
          e.clientWidth,
        chatOverflows:
          document.querySelector(".vn-main-view").scrollHeight >
          document.querySelector(".vn-main-view").clientHeight + 1,
      };
    });
    assert(
      !info.overflow &&
        info.widgetFits &&
        !info.overlapsWide &&
        !info.contentOverflow &&
        !info.chatOverflows,
      JSON.stringify(info)
    );
    assert.equal(info.docked, true);
    if (width < 1000) {
      assert(
        await page.locator("#live2d-widget").evaluate((e) => {
          const nav = document
            .querySelector(".classic-page-index")
            .getBoundingClientRect();
          const article = document
            .querySelector(".page")
            .getBoundingClientRect();
          return (
            e.parentElement.hasAttribute("data-companion-mobile-dock") &&
            e.getBoundingClientRect().top >= nav.bottom &&
            nav.top >= article.bottom
          );
        })
      );
    }
    if (width >= 1000) assert(info.frameWidth >= Math.min(width - 52, 1760));
    assert(await page.locator("[data-live2d-dialogue-text]").isVisible());
    assert(await page.locator("#live2d-interact").isVisible());
    widths.push(info);
    if ([320, 375, 768, 1440].includes(width)) {
      await page.locator("#live2d-widget").scrollIntoViewIfNeeded();
      await page.screenshot({ path: out + "/expanded-" + width + ".png" });
    }
  }
  await page.setViewportSize({ width: 600, height: 360 });
  await page.waitForTimeout(150);
  await title.scrollIntoViewIfNeeded();
  await title.focus();
  await page.keyboard.press("ArrowRight");
  await page.locator('[data-vn-open="settings"]').click();
  await page.screenshot({ path: out + "/short-settings.png" });
  await page.keyboard.press("Escape");
  await page.locator("[data-companion-minimize]").click();
  await page.screenshot({ path: out + "/short-minimized.png" });
  // Closing and reopening via Options restores usability.
  await page.locator("[data-companion-close]").click();
  assert.equal(await page.locator("#live2d-widget").isVisible(), false);
  await page.evaluate(() => scrollTo(0, 0));
  await page.locator("[data-site-options-trigger]").click();
  await page.locator("[data-live2d-toggle]").click();
  await page.keyboard.press("Escape");
  assert(await page.locator("[data-companion-content]").isVisible());
  assert.deepEqual(errors, []);
  assert.deepEqual(bad, []);
  console.log(JSON.stringify({ result: "PASS", widths, errors, bad }));
  await browser.close();
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
