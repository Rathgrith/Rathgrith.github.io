/* Layout and retained functionality across every theme and breakpoint. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const out =
  process.env.QA_OUTPUT || require("node:os").tmpdir() + "/homepage-qa";
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
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
    const errors = [],
      bad = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().startsWith(base) && r.status() >= 400) bad.push(r.url());
    });
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await page.locator("audio,[data-music-player]").count(), 0);
    let checks = 0;
    for (const id of ["alice", "marisa", "patchouli"]) {
      await page.locator(`[data-classic-character="${id}"]`).click();
      await page.waitForFunction(
        (id) => document.documentElement.dataset.live2dCharacter === id,
        id
      );
      await page.waitForFunction((id) => getComputedStyle(document.querySelector(`.author__avatar-image[data-avatar-character="${id}"]`)).opacity === "1", id);
      assert.equal(
        await page
          .locator(`.author__avatar-image[data-avatar-character="${id}"]`)
          .evaluate((e) => getComputedStyle(e).opacity),
        "1"
      );
      for (const width of [
        320, 375, 480, 599, 600, 699, 700, 767, 768, 999, 1000, 1279, 1280,
        1440, 1920,
      ]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(100);
        const geometry = await page.evaluate(() => {
          const frame = document
              .querySelector(".classic-frame")
              .getBoundingClientRect(),
            footer = document
              .querySelector(".site-runtime")
              .getBoundingClientRect();
          const tabs = [...document.querySelectorAll(".classic-tab")].map((e) =>
            e.getBoundingClientRect()
          );
          const portrait = document
            .querySelector(".author__avatar-media")
            .getBoundingClientRect();
          return {
            overflow: document.documentElement.scrollWidth > innerWidth,
            footerFits:
              footer.left >= frame.left && footer.right <= frame.right,
            footerHeight: footer.height,
            navOneRow: tabs.every((r) => Math.abs(r.top - tabs[0].top) < 1),
            portraitSquare: Math.abs(portrait.width - portrait.height) < 1,
            logos: [
              ...document.querySelectorAll(".classic-education .inline-school-icon"),
            ].map((e) => {
              let r = e.getBoundingClientRect();
              return [r.width, r.height, getComputedStyle(e).objectFit];
            }),
          };
        });
        assert(
          !geometry.overflow &&
            geometry.footerFits &&
            geometry.navOneRow &&
            geometry.portraitSquare,
          JSON.stringify({ id, width, ...geometry })
        );
        assert(geometry.footerHeight < 130);
        geometry.logos.forEach((x) => assert.deepEqual(x, [16, 16, "contain"]));
        checks++;
        if ([375, 768, 1440].includes(width))
          await page.screenshot({ path: out + `/home-${id}-${width}.png` });
      }
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('[data-publication-filter="all"]').click();
    assert.equal(await page.locator(".publication-item:visible").count(), 4);
    await page.locator('[data-publication-filter="selected"]').click();
    assert.equal(await page.locator(".publication-item:visible").count(), 3);
    await page.setViewportSize({ width: 375, height: 812 });
    await page.locator(".hover-photo--manga").first().focus();
    const preview = await page
      .locator(".hover-photo--manga .hover-photo__card")
      .first()
      .boundingBox();
    assert(preview.x >= 0 && preview.x + preview.width <= 375);
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    );
    await page.locator('[data-classic-page="gallery"]').click();
    await page.waitForURL("**/gallery/");
    assert.equal(await page.locator(".classic-photo").count(), 110);
    for (const width of [320, 375, 600, 768, 1000, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(100);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth
        ),
        false
      );
      const photos = await page
        .locator(".classic-photo img")
        .evaluateAll((es) =>
          es.map((e) => {
            let r = e.getBoundingClientRect();
            return [r.width / r.height, getComputedStyle(e).objectFit];
          })
        );
      photos.forEach(([ratio, fit]) => {
        assert(Math.abs(ratio - 4 / 3) < 0.015);
        assert.equal(fit, "cover");
      });
      if ([375, 768, 1440].includes(width))
        await page.screenshot({ path: out + `/gallery-${width}.png` });
    }
    await page.setViewportSize({ width: 375, height: 812 });
    await page
      .locator('.classic-photo a[data-gallery-filename="mayoi.jpg"]')
      .click();
    assert(await page.locator("#gallery-modal").isVisible());
    assert.equal(
      await page
        .locator("#gallery-modal-image")
        .evaluate((e) => getComputedStyle(e).objectFit),
      "contain"
    );
    const first = await page.locator(".gallery-modal__counter").textContent();
    await page.keyboard.press("ArrowRight");
    assert.notEqual(
      await page.locator(".gallery-modal__counter").textContent(),
      first
    );
    for (let i = 0; i < 8; i++) await page.keyboard.press("Tab");
    assert(
      await page.evaluate(
        () => !!document.activeElement.closest("#gallery-modal")
      )
    );
    await page.screenshot({ path: out + "/gallery-viewer-mobile.png" });
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("#gallery-modal").isVisible(), false);
    await page.locator('[data-classic-page="home"]').click();
    await page.waitForURL(base);
    await page.goBack();
    await page.waitForURL("**/gallery/");
    await page.waitForSelector(".classic-photo");
    await page.locator("#live2d-widget").waitFor({ state: "attached" });
    assert.equal(await page.locator("#live2d-widget").count(), 1);
    assert.deepEqual(errors, []);
    assert.deepEqual(bad, []);
    // The static gallery remains useful when scripting is disabled.
    const plain = await browser.newPage({
      javaScriptEnabled: false,
      viewport: { width: 375, height: 812 },
    });
    await plain.goto(base + "gallery/");
    assert.equal(await plain.locator(".classic-photo a[href]").count(), 110);
    assert.equal(
      await plain.evaluate(
        () => document.documentElement.scrollWidth > innerWidth
      ),
      false
    );
    console.log(
      `PASS: ${checks} theme/width combinations, 7 gallery widths, viewer keyboard/focus, publications, history navigation, and no-JS gallery`
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
