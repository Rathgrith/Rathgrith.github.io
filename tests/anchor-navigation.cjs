/* Real anchor motion, entry-specific Back/Forward and compact section indexes. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const output = process.env.QA_OUTPUT;
if (output) fs.mkdirSync(output, { recursive: true });

async function settledAt(page, id) {
  await page.waitForFunction((id) => {
    const target = document.getElementById(id);
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const top = target.getBoundingClientRect().top + scrollY - margin;
    const destination = Math.min(Math.max(top, 0), document.documentElement.scrollHeight - innerHeight);
    return Math.abs(scrollY - destination) < 2;
  }, id).catch(async (error) => {
    console.error("Anchor did not settle", await page.evaluate((id) => ({ id, scroll: scrollY, top: document.getElementById(id).getBoundingClientRect().top, margin: getComputedStyle(document.getElementById(id)).scrollMarginTop, hash: location.hash }), id));
    throw error;
  });
}

async function activate(page, selector) {
  await page.locator(selector).evaluate((link) => link.focus({ preventScroll: true }));
  await page.keyboard.press("Enter");
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem("site-live2d-enabled", "false");
      localStorage.setItem("site-live2d-mobile-enabled", "false");
      window.__anchorSamples = [];
      addEventListener("scroll", () => window.__anchorSamples.push(scrollY), { passive: true });
    });
    if (process.env.QA_SOURCE) {
      for (const filename of ["classic-navigation.js", "page-transition.js"]) {
        await page.route(`**/assets/js/core/${filename}*`, (route) => route.fulfill({
          contentType: "application/javascript",
          body: fs.readFileSync(path.join(__dirname, "../assets/js/core", filename), "utf8"),
        }));
      }
    }
    await page.goto(base);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForFunction(() => !document.body.classList.contains("home-loading"));
    await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      window.__anchorSamples = [];
    });
    await activate(page, ".classic-navigation a[href$='#publications']");
    await settledAt(page, "publications");
    const motion = await page.evaluate(() => ({ samples: window.__anchorSamples, end: scrollY }));
    assert(motion.samples.some((y) => y > 10 && y < motion.end - 10), "Section links visibly scroll through intermediate positions");
    assert.equal(await page.locator(".classic-page-index a[href$='#publications']").getAttribute("aria-current"), "location");
    assert.equal(await page.evaluate(() => document.activeElement.id), "recent-publications", "Keyboard focus reaches the visible heading, not its aria-hidden marker");
    if (output) await page.screenshot({ path: path.join(output, "publications-desktop.png") });

    // Revisiting the same URL must not overwrite an older entry's scroll position.
    await page.evaluate(() => window.scrollTo({ top: 120, behavior: "instant" }));
    await activate(page, ".classic-page-index a[href$='#education']");
    await settledAt(page, "education");
    await activate(page, ".classic-page-index a[href$='#publications']");
    await settledAt(page, "publications");
    await page.evaluate(() => window.scrollTo({ top: 310, behavior: "instant" }));
    await page.goBack();
    await page.waitForURL("**/#education");
    await page.goBack();
    await page.waitForFunction(() => Math.abs(scrollY - 120) < 2);
    await page.goForward();
    await page.waitForURL("**/#education");
    await page.goForward();
    await page.waitForFunction(() => Math.abs(scrollY - 310) < 2);

    // Invalid and cross-document index entries cannot corrupt the valid scrollspy.
    await page.evaluate(() => {
      const nav = document.querySelector(".classic-page-index");
      for (const href of ["#%E0%A4%A", "#missing-section", "/elsewhere/#education", "https://example.com/#education"]) {
        const link = document.createElement("a");
        link.href = href;
        link.dataset.invalidIndexEntry = "";
        link.textContent = "Invalid target";
        nav.appendChild(link);
      }
      document.dispatchEvent(new CustomEvent("site:content-updated"));
      document.querySelector("[data-invalid-index-entry]").click();
    });
    assert.equal(new URL(page.url()).hash, "#%E0%A4%A");
    assert(Math.abs(await page.evaluate(() => scrollY) - 310) < 2, "A missing fragment does not move the page");
    assert.equal(await page.locator("[data-invalid-index-entry][aria-current]").count(), 0);
    await page.locator("[data-invalid-index-entry]").evaluateAll((links) => links.forEach((link) => link.remove()));

    await page.setViewportSize({ width: 375, height: 760 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    await activate(page, ".classic-page-index a[href$='#services']");
    await settledAt(page, "services");
    await page.waitForFunction(() => document.querySelector(".classic-page-index [aria-current='location']").hash === "#services");
    const compact = await page.locator(".classic-page-index").evaluate((nav) => {
      const active = nav.querySelector("[aria-current='location']");
      return { nav: nav.getBoundingClientRect().toJSON(), active: active.getBoundingClientRect().toJSON(), hash: active.hash };
    });
    assert.equal(compact.hash, "#services");
    assert(compact.active.left >= compact.nav.left - 1 && compact.active.right <= compact.nav.right + 1, "Compact navigation keeps the current section visible horizontally");
    assert(compact.nav.top >= 0 && compact.nav.top < 20, "Compact navigation stays available while reading");
    // Reduced motion must reach its destination in the same task, without animation.
    const reduced = await page.evaluate(() => {
      window.scrollTo({ top: 0, behavior: "instant" });
      document.querySelector(".classic-page-index a[href$='#publications']").click();
      const marker = document.getElementById("publications");
      return Math.abs(marker.getBoundingClientRect().top - parseFloat(getComputedStyle(marker).scrollMarginTop));
    });
    assert(reduced < 2, "Reduced motion uses immediate anchor scrolling");
    await page.waitForFunction(() => document.querySelector(".classic-page-index [aria-current='location']").hash === "#publications");
    if (output) await page.screenshot({ path: path.join(output, "publications-mobile-navigation.png") });

    await page.locator("[data-classic-page='gallery']").evaluate((link) => link.click());
    await page.waitForSelector("#gallery-group-figures");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await activate(page, ".classic-year-navigation a[href='#gallery-group-details']");
    await settledAt(page, "gallery-group-details");
    assert.equal(await page.locator(".classic-year-navigation a[aria-current='location']").getAttribute("href"), "#gallery-group-details");
    assert.equal(await page.evaluate(() => document.activeElement.id), "gallery-group-details");
    const gallery = await page.locator(".classic-year-navigation").evaluate((nav) => {
      const active = nav.querySelector("[aria-current='location']");
      return { nav: nav.getBoundingClientRect().toJSON(), active: active.getBoundingClientRect().toJSON() };
    });
    assert(gallery.active.left >= gallery.nav.left - 1 && gallery.active.right <= gallery.nav.right + 1);
    assert(gallery.nav.top >= 0 && gallery.nav.top < 20);
    await page.setViewportSize({ width: 820, height: 900 });
    await page.evaluate(() => {
      document.getElementById("gallery-group-details").scrollIntoView({ behavior: "instant", block: "start" });
      window.scrollBy({ top: -140, behavior: "instant" });
    });
    await page.waitForFunction(() => document.querySelector(".classic-year-navigation [aria-current='location']").hash === "#gallery-group-places");
    await activate(page, ".classic-year-navigation a[href='#gallery-group-details']");
    await settledAt(page, "gallery-group-details");
    await page.waitForFunction(() => document.querySelector(".classic-year-navigation [aria-current='location']").hash === "#gallery-group-details");
    await page.locator(".classic-navigation a[href$='#publications']").evaluate((link) => link.click());
    await page.waitForURL("**/#publications");
    await settledAt(page, "publications");
    await page.waitForFunction(() => document.querySelector(".classic-page-index a[href$='#publications']").getAttribute("aria-current") === "location");
    // MathJax's asynchronous startup used to reposition the current fragment
    // mid-scroll, making the very first Gallery click stop at the wrong section.
    await page.setViewportSize({ width: 375, height: 760 });
    await page.goto(base + "gallery/");
    await page.locator(".classic-year-navigation a[href='#gallery-group-places']").click();
    await settledAt(page, "gallery-group-places");
    await page.waitForTimeout(1200);
    await settledAt(page, "gallery-group-places");
    assert.equal(await page.locator(".classic-year-navigation a[aria-current='location']").getAttribute("href"), "#gallery-group-places");
    assert.deepEqual(errors, []);
    console.log("PASS: smooth section motion, heading focus, duplicate-entry history, malformed/missing anchors, compact scrollspy, Gallery index and reduced motion");
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
