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
      window.__playgroundTitleEntries = 0;
      document.addEventListener("transitionrun", (event) => {
        if (event.propertyName === "transform" && event.target.matches(".companion-title"))
          window.__playgroundTitleEntries++;
      });
      window.__documentEntries = [];
      document.addEventListener("animationstart", (event) => {
        if (event.animationName !== "classic-document-enter") return;
        const panel = event.target;
        const heading = panel.querySelector(".document-entry-heading");
        const motion = heading?.getAnimations().find((a) => a.animationName === "classic-document-title");
        window.__documentEntries.push({
          direction: panel.dataset.documentEntry,
          offset: motion?.effect.getKeyframes()[0].transform,
          duration: motion?.effect.getTiming().duration,
          frameLine: getComputedStyle(panel, "::before").animationName,
          includesWidget: !!panel.querySelector("#live2d-widget"),
        });
      });
    });
    // Optional source overrides let contributors iterate without rebuilding Jekyll.
    if (process.env.QA_SOURCE) {
      await page.route("**/assets/css/classic-motion.css*", (route) =>
        route.fulfill({ path: path.join(__dirname, "../assets/css/classic-motion.css"), contentType: "text/css" })
      );
      for (const filename of [
        "page-transition.js",
        "classic-navigation.js",
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
    page.on("pageerror", (error) => errors.push(error.stack || error.message));
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
    await page.keyboard.press("ArrowUp");
    assert(
      await page
        .locator("[data-site-options-menu] button")
        .last()
        .evaluate((e) => e === document.activeElement),
      "ArrowUp from the trigger should open on the last action"
    );
    await page.keyboard.press("Escape");
    const toggle = page.locator("[data-live2d-toggle]");
    for (const expanded of ["true", "false"]) {
      await options.click();
      await toggle.locator(".site-options-fab__action-label").click();
      assert.equal(await toggle.getAttribute("aria-expanded"), expanded);
      assert.equal(await options.getAttribute("aria-expanded"), "false");
      assert(await options.evaluate((e) => e === document.activeElement));
    }
    await options.click();
    await page.locator("[data-classic-page='home']").focus();
    await page.waitForFunction(
      () => document.querySelector("[data-site-options-menu]").hidden
    );

    for (const width of [320, 400, 412, 425, 460]) {
      await page.setViewportSize({ width, height: 800 });
      const clipped = await page.locator(".classic-tab").evaluateAll((tabs) =>
        tabs.filter((tab) => {
          const bounds = tab.getBoundingClientRect();
          const label = document.createRange();
          label.selectNodeContents(tab.lastChild);
          const icon = tab.querySelector("img");
          const parts = [label.getBoundingClientRect()];
          if (icon) parts.push(icon.getBoundingClientRect());
          return parts.some((part) => part.left < bounds.left || part.right > bounds.right);
        }).map((tab) => tab.textContent.trim())
      );
      assert.deepEqual(clipped, [], "Tab content should fit at " + width + "px");
    }

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

    await page.evaluate(() => {
      window.__persistentNodes = [".classic-masthead", "#live2d-widget", "#live2dcanvas", ".vn-radio-receiver"]
        .map((s) => [s, document.querySelector(s)]);
    });
    async function expectEntry(direction) {
      await page.waitForFunction(() => window.__documentEntries.length > 0);
      const [entry] = await page.evaluate(() => window.__documentEntries.splice(0));
      assert.equal(entry.direction, direction);
      assert.equal(entry.offset, direction === "back" ? "translateX(-8px)" : "translateX(8px)");
      assert(entry.duration > 0 && entry.duration <= 250);
      assert.equal(entry.frameLine, "classic-document-rule");
      assert.equal(entry.includesWidget, false, "The Gallery companion stays outside the animated panel");
      assert(await page.evaluate(() =>
        window.__persistentNodes.every(([s, node]) => node && document.querySelector(s) === node)
      ), "Masthead, model canvas and radio survive the document change");
    }

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
      window.scrollTo({ top: 650, behavior: "instant" });
      window.__anchorOrigin = scrollY;
    });
    await page
      .locator(".classic-page-index a[href$='#awards']")
      .first()
      .evaluate((e) => e.click());
    await page.waitForURL("**/#awards");
    await page.goBack();
    // Let the compositor deliver any pending frame from the canceled smooth scroll.
    await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
    assert(await page.evaluate(() => scrollY === window.__anchorOrigin),
      "Interrupting an anchor with Back restores the exact previous pixel");
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
    assert.deepEqual(await page.evaluate(() => window.__documentEntries), [], "Local anchors and canceled requests do not animate a document");
    await page.locator("[data-classic-page='gallery']").click();
    await page.waitForSelector("#gallery");
    await expectEntry("forward");
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
    await expectEntry("forward");
    await page.goBack();
    await page.waitForSelector("#gallery");
    await expectEntry("back");
    await page.waitForFunction(
      () => Math.abs(scrollY - window.__scrollBeforeLeave) < 2
    );

    await page.goForward();
    await page.waitForURL(base);
    await expectEntry("forward");
    delayGallery = true;
    await page.locator("[data-classic-page='gallery']").click();
    await page.waitForFunction(() =>
      document.documentElement.hasAttribute("data-navigation-pending")
    );
    await page.goBack();
    await page.waitForSelector("#gallery");
    await expectEntry("back");
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
    assert.equal(await page.locator("[data-document-entry], .document-entry-heading").count(), 0);
    assert.deepEqual(await page.evaluate(() => window.__documentEntries), []);

    // Fail a Back fetch to an entry with a hash. The browser must reload that
    // exact history entry, leaving the destination of Forward available.
    await page.locator(".classic-navigation a[href$='#publications']").evaluate((a) => a.click());
    await page.waitForURL("**/#publications");
    await page.route(base + "gallery/**", (route) =>
      route.request().resourceType() === "fetch"
        ? route.fulfill({ status: 503, body: "unavailable" })
        : route.continue()
    );
    const hardLoad = page.waitForRequest((r) => r.isNavigationRequest() && r.url().includes("/gallery/"));
    await page.goBack();
    await hardLoad;
    await page.waitForSelector("#gallery");
    assert.equal(new URL(page.url()).hash, "#%E0%A4%A");
    await page.goForward();
    await page.waitForFunction(() => location.hash === "#publications" && !!document.querySelector("#publications"));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.goto(base + "playground/");
    await page.waitForFunction(() => window.__playgroundTitleEntries === 1);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();
    await page.waitForSelector(".companion-title");
    assert.equal(await page.evaluate(() => window.__playgroundTitleEntries), 0);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: forward/back document motion, persistent masthead/canvas/radio, latest intent, Back during fetch, scroll and focus, reduced motion, fragment fallback, standalone title entry, keyboard options and preview"
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
