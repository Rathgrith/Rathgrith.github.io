const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const out = process.env.QA_OUTPUT || require("node:os").tmpdir() + "/companion-gaze";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-gpu"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.route("**/companion-lighting.js*", async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: await response.text() + `
        const originalLighting = CompanionLighting.create;
        CompanionLighting.create = function(app, widget) { window.gazeApp = app; return originalLighting(app, widget); };
      ` });
    });
    await page.goto(process.env.PREVIEW_URL || "http://127.0.0.1:4100/", { waitUntil: "domcontentloaded" });
    const focus = () => page.evaluate(() => {
      const f = gazeApp.stage.children[0].internalModel.focusController;
      return { x: f.x, y: f.y, tx: f.targetX, ty: f.targetY };
    });
    const centred = async () => {
      await page.waitForFunction(() => {
        const f = gazeApp.stage.children[0].internalModel.focusController;
        return Math.abs(f.x) < .025 && Math.abs(f.y) < .025;
      });
    };
    for (const id of ["alice", "marisa", "patchouli"]) {
      await page.locator(`button[data-vn-character="${id}"]`).click();
      await page.waitForFunction(id => {
        const w = document.querySelector("#live2d-widget");
        return w.dataset.live2dCharacter === id && !w.classList.contains("is-loading") && window.gazeApp?.stage.children.length;
      }, id, { timeout: 60000 });
      await page.locator("#live2d-widget").scrollIntoViewIfNeeded();
      // Let the scroll event reset stale gaze before placing a new pointer target.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      await page.evaluate(() => document.documentElement.dispatchEvent(new MouseEvent("mouseleave")));
      await centred();
      const rect = await page.locator("[data-companion-stage]").boundingBox();
      await page.mouse.move(rect.x + rect.width * .9, rect.y + rect.height * .25);
      await page.waitForFunction(() => gazeApp.stage.children[0].internalModel.focusController.x > .2);
      const right = await focus();
      assert(right.tx > 0, JSON.stringify(right));
      // Follow eases back, rather than snapping when the pointer leaves the scene.
      await page.locator("[data-vn-reading]").hover();
      const returning = await focus();
      assert(Math.abs(returning.x) > .01, "return should be interpolated");
      await centred();
      await page.locator("[data-bgm-play]").hover();
      await page.waitForFunction(() => Math.abs(gazeApp.stage.children[0].internalModel.focusController.targetY) > .1);
      await page.locator("[data-vn-open='settings']").hover();
      await page.waitForFunction(() => Math.abs(gazeApp.stage.children[0].internalModel.focusController.targetY) > .1);
      await page.mouse.move(rect.x + rect.width * .1, rect.y + rect.height * .8);
      await page.waitForFunction(() => gazeApp.stage.children[0].internalModel.focusController.x < -.2);
      const left = await focus();
      assert(left.tx < 0, JSON.stringify(left));
      // Outside the entire window still uses the unmodified SDK target mapping.
      await page.mouse.move(1300, 100);
      await page.waitForFunction(() => gazeApp.stage.children[0].internalModel.focusController.targetX > .5);
      await page.locator("[data-vn-reading]").hover();
      await centred();
      await page.locator("#live2d-widget").screenshot({ path: `${out}/${id}-neutral.png` });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    const rect = await page.locator("[data-companion-stage]").boundingBox();
    await page.mouse.move(rect.x + 10, rect.y + 10);
    await centred();
    assert.deepEqual(errors, []);
    console.log("PASS: 3 real models, page-wide cursor following, dialogue-only neutral return, active menu/BGM gaze and reduced motion.");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
