// Exercise the actual document filters, navigation, archive dock and narrow tables.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const url = route => new URL(route, base).href;

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, reducedMotion: "reduce" });
    const errors = [];
    page.on("pageerror", error => errors.push(error.message));
    await page.route(/(?:mapmyvisitors|geojs)\./, route => route.abort());
    await page.goto(base);
    const tabs = page.locator(".classic-navigation");
    await tabs.locator('a[href$="#publications"]').click();
    await page.waitForFunction(() => document.querySelector('.classic-tab[aria-current="location"]')?.hash === "#publications");
    const rows = page.locator(".publication-item:visible");
    assert.equal(await rows.count(), 3);
    await page.getByRole("button", { name: "All listed" }).click();
    assert.equal(await rows.count(), 5);
    assert.equal(await page.locator(".publication-filter__scholar").getAttribute("target"), "_blank");
    const preview = page.locator(".publication-item img").first();
    await preview.scrollIntoViewIfNeeded();
    await page.waitForFunction(() => document.querySelector(".publication-item img").currentSrc.endsWith("peca-still.png"));
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.waitForFunction(() => document.querySelector(".publication-item img").currentSrc.endsWith("peca_eccv2026.gif"));

    const credits = page.locator(".classic-credits");
    await credits.locator("summary").focus();
    await page.keyboard.press("Enter");
    assert(await credits.locator(".classic-credits__body").isVisible());
    await page.keyboard.press("Enter");
    assert(!(await credits.locator(".classic-credits__body").isVisible()));

    await page.goto(url("notes/"));
    await page.locator(".classic-index-rail [data-companion-dock] > #live2d-widget").waitFor({ state: "attached" });
    const overlaps = await page.evaluate(() => document.querySelector("article.page").getBoundingClientRect().right >
      document.querySelector(".classic-index-rail").getBoundingClientRect().left);
    assert.equal(overlaps, false);
    await page.setViewportSize({ width: 375, height: 740 });
    await page.locator('.classic-index-rail nav a[href="#notes-projects-heading"]').click();
    await page.waitForURL("**/#notes-projects-heading");
    assert.equal(await page.evaluate(() => document.activeElement.id), "notes-projects-heading");
    assert.equal(await page.locator(".notes-index a[href]").count(), 11);

    const plain = await browser.newPage({ viewport: { width: 320, height: 700 }, javaScriptEnabled: false });
    await plain.goto(base);
    assert.equal(await plain.locator(".publication-item:visible").count(), 5);
    assert.equal(await plain.locator(".publication-filter button:visible").count(), 0);
    assert(await plain.locator(".publication-filter__scholar").isVisible());
    assert.match(await plain.locator("[data-site-runtime-since]").innerText(), /\d{4}-\d{2}-\d{2}/);
    assert.equal(await plain.locator("[data-site-runtime-elapsed]").isVisible(), false);
    await plain.goto(url("assets/music/radio/"));
    assert.equal(await plain.locator(".classic-page-index").count(), 0);
    assert.equal(await plain.locator(".classic-navigation [aria-current]").count(), 0);
    const table = plain.locator(".document-table").first();
    await table.scrollIntoViewIfNeeded();
    await table.focus();
    await plain.keyboard.press("ArrowRight");
    // Browser-side animation/timer polling can be suspended when scripting is off.
    for (let i = 0; i < 40 && !(await table.evaluate(el => el.scrollLeft > 0)); i++) {
      await plain.waitForTimeout(50);
    }
    assert(await table.evaluate(el => el === document.activeElement && el.scrollLeft > 0));
    assert(await table.evaluate(el => el.scrollWidth > el.clientWidth && el.querySelector("tr").cells.length > 1));
    assert(await plain.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    console.log("PASS: publication filter, static/animated art, secondary navigation, Notes dock and anchors, credits disclosure, narrow tables, script-free reading.");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
