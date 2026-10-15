/* Navigation intent, accessibility and persistent widgets across real page swaps. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    await page.addInitScript(() => {
      localStorage.setItem("site-live2d-enabled", "false");
      localStorage.setItem("site-live2d-mobile-enabled", "false");
    });
    // Optional source overrides let contributors iterate without rebuilding Jekyll.
    if (process.env.QA_SOURCE) {
      for (const filename of [
        "page-transition.js",
        "site-options.js",
        "hover-photo-preview.js",
      ]) {
        await page.route(`**/assets/js/core/${filename}*`, (route) =>
          route.fulfill({
            contentType: "application/javascript",
            body: fs.readFileSync(
              path.join(__dirname, "../assets/js/core", filename),
              "utf8"
            ),
          })
        );
      }
    }
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(
      () => !document.body.classList.contains("home-loading")
    );

    const options = page.locator("[data-site-options-trigger]");
    await options.focus();
    await page.keyboard.press("ArrowDown");
    assert.equal(await options.getAttribute("aria-expanded"), "true");
    assert(
      await page
        .locator("[data-live2d-toggle]")
        .evaluate((e) => e === document.activeElement)
    );
    await page.keyboard.press("Escape");
    assert.equal(await options.getAttribute("aria-expanded"), "false");
    assert(await options.evaluate((e) => e === document.activeElement));
    await options.click();
    await page.locator("[data-classic-page='home']").focus();
    await page.waitForFunction(
      () => document.querySelector("[data-site-options-menu]").hidden
    );

    await page.setViewportSize({ width: 375, height: 580 });
    const preview = page.locator(".hover-photo--manga").first();
    await preview.focus();
    const card = preview.locator(".hover-photo__card");
    await page.waitForFunction(
      () =>
        getComputedStyle(
          document.querySelector(".hover-photo--manga .hover-photo__card")
        ).visibility === "visible"
    );
    const rect = await card.boundingBox();
    assert(
      rect.x >= 0 &&
        rect.x + rect.width <= 375 &&
        rect.y >= 0 &&
        rect.y + rect.height <= 580
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () =>
        getComputedStyle(
          document.querySelector(".hover-photo--manga .hover-photo__card")
        ).visibility === "hidden"
    );
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.evaluate(() => window.scrollTo(0, 0));

    let delayGallery = true;
    await page.route(base + "gallery/**", async (route) => {
      if (route.request().resourceType() !== "fetch" || !delayGallery)
        return route.continue();
      const response = await route.fetch();
      await new Promise((resolve) => setTimeout(resolve, 650));
      try {
        await route.fulfill({ response });
      } catch (_) {
        /* Superseded request was aborted. */
      }
    });
    await page.locator("[data-classic-page='gallery']").click();
    await page.waitForFunction(() =>
      document.documentElement.hasAttribute("data-navigation-pending")
    );
    await page.locator("[data-classic-page='home']").click();
    await page.waitForFunction(
      () => !document.documentElement.hasAttribute("data-navigation-pending")
    );
    await page.waitForTimeout(750);
    assert.equal(
      page.url(),
      base,
      "Latest click wins even when an older response arrives last"
    );
    assert.equal(await page.locator("#gallery").count(), 0);

    await page.evaluate(() => {
      window.scrollTo(0, 650);
      window.__anchorOrigin = scrollY;
    });
    await page
      .locator(".classic-page-index a[href$='#awards']")
      .first()
      .evaluate((e) => e.click());
    await page.waitForURL("**/#awards");
    await page.goBack();
    await page.waitForFunction(
      () => Math.abs(scrollY - window.__anchorOrigin) < 2
    );
    await page.evaluate(() => window.scrollTo(0, 0));

    await page.locator("[data-classic-page='gallery']").click();
    await page.waitForFunction(() =>
      document.documentElement.hasAttribute("data-navigation-pending")
    );
    await page.locator(".classic-navigation a[href$='#publications']").click();
    await page.waitForTimeout(750);
    assert.equal(
      new URL(page.url()).hash,
      "#publications",
      "A section link cancels pending page navigation"
    );
    assert.equal(await page.locator("#gallery").count(), 0);
    assert.equal(
      await page.locator("html[data-navigation-pending]").count(),
      0
    );

    delayGallery = false;
    await page.locator("[data-classic-page='gallery']").click();
    await page.waitForSelector("#gallery");
    assert(
      await page.locator("#main").evaluate((e) => e === document.activeElement)
    );
    assert.equal(
      await page.locator("#main").getAttribute("aria-busy"),
      "false"
    );
    assert(
      (
        await page.locator("link[rel='canonical']").getAttribute("href")
      ).endsWith("/gallery/")
    );
    await page.evaluate(() => {
      window.scrollTo(0, 800);
      window.__scrollBeforeLeave = scrollY;
    });
    // Keyboard activation avoids click's auto-scroll to the masthead.
    await page.locator("[data-classic-page='home']").evaluate((e) => e.click());
    await page.waitForURL(base);
    await page.goBack();
    await page.waitForSelector("#gallery");
    await page.waitForFunction(
      () => Math.abs(scrollY - window.__scrollBeforeLeave) < 2
    );

    await page.locator("[data-classic-page='home']").evaluate((e) => e.click());
    await page.waitForURL(base);
    delayGallery = true;
    await page.locator("[data-classic-page='gallery']").click();
    await page.waitForFunction(() =>
      document.documentElement.hasAttribute("data-navigation-pending")
    );
    await page.goBack();
    await page.waitForSelector("#gallery");
    await page.waitForTimeout(750);
    assert.equal(
      new URL(page.url()).pathname,
      new URL(base + "gallery/").pathname
    );
    assert.equal(
      await page.locator("#live2d-widget").count(),
      1,
      "Navigation keeps a single Playground instance"
    );

    delayGallery = false;
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.locator("[data-classic-page='home']").click();
    await page.waitForURL(base);
    await page.locator("[data-classic-page='gallery']").evaluate((e) => {
      e.href += "#%E0%A4%A";
      e.click();
    });
    await page.waitForSelector("#gallery");
    assert.equal(await page.locator(".is-content-entering").count(), 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: latest navigation intent, Back during fetch, restored scroll, focus/meta, reduced motion, malformed fragment, keyboard options and dismissible preview"
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
