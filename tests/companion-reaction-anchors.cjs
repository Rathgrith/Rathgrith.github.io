// Check the rendered overlay against independent, moving cheek and mouth meshes.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const meshes = {
  alice: ["Face", "CheekR", "MouthOral", "EyeWhiteR", "EyeWhiteL"],
  marisa: ["Face", "CheekL", "MouthOral", "EyeWhite", "EyeWhite2"],
  patchouli: ["D_PSD1_54", "D_PSD1_62", "D_PSD1_58", "D_PSD1_74", "D_PSD1_83"],
};

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    // Use the site's normal performance hook. Capture the real rig only in the test.
    for (const [file, patch] of [
      ["companion-lighting", "const original = CompanionLighting.create; CompanionLighting.create = (app, widget) => { window.testApp = app; return original(app, widget); };"],
      ["companion-dialogue", "const originalMount = SiteCompanion.mount; SiteCompanion.mount = (widget, hooks) => { window.testHooks = hooks; return originalMount(widget, hooks); };"],
    ]) {
      await page.route("**/" + file + ".js*", async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()) + "\n" + patch });
      });
    }
    async function select(id) {
      await page.locator('button[data-vn-character="' + id + '"]').click();
      await page.waitForFunction(id => {
        const widget = document.querySelector("#live2d-widget");
        return widget.dataset.live2dCharacter === id && !widget.classList.contains("is-loading") &&
          widget.querySelectorAll(".vn-reaction").length === 1 &&
          window.testApp?.stage.children[0]?.glContextID === testApp.renderer.CONTEXT_UID;
      }, id, { timeout: 60000 });
      await page.locator("[data-companion-stage]").scrollIntoViewIfNeeded();
    }
    async function perform(kind, poseId) {
      await page.evaluate(({kind, poseId}) => testHooks.perform({
        effect: kind, poseId, expressionMotionId: kind === "anger" ? "05" : "06",
      }), {kind, poseId});
    }
    async function check(id, kind, label) {
      await page.waitForFunction(kind => {
        const canvas = document.querySelector(".vn-reaction");
        const stage = document.querySelector("[data-companion-stage]");
        const screen = testApp.renderer.screen;
        return Math.abs(screen.width - stage.clientWidth) <= 1 &&
          Math.abs(screen.height - stage.clientHeight) <= 1 && canvas && !canvas.hidden &&
          canvas.dataset.reaction === kind && canvas.style.left &&
          canvas.getContext("2d").getImageData(0, 0, 64, 64).data.some((v, i) => i % 4 === 3 && v);
      }, kind);
      const p = await page.evaluate(({ids, id}) => {
        const app = testApp, model = app.stage.children[0], fx = document.querySelector(".vn-reaction");
        const [face, cheek, mouth, leftEye, rightEye] = ids.map(i => model.internalModel.getDrawableBounds(i));
        const rect = fx.getBoundingClientRect(), view = app.view.getBoundingClientRect();
        const safe = document.querySelector(".vn-actor-area").getBoundingClientRect();
        // Invert the rendered position through PIXI and Cubism. Compare it to
        // the cheek or mouth mesh, independent of the effect's placement code.
        const point = model.toModelPosition(new PIXI.Point(
          (rect.x + rect.width / 2 - view.x) / view.width * app.screen.width,
          (rect.y + rect.height / 2 - view.y) / view.height * app.screen.height
        ));
        const eyeX = (leftEye.x + leftEye.width / 2 + rightEye.x + rightEye.width / 2) / 2;
        const eyeY = (leftEye.y + leftEye.height / 2 + rightEye.y + rightEye.height / 2) / 2;
        const side = id === "alice" ? -1 : 1;
        return {
          cheekDistance: Math.hypot(point.x - cheek.x - cheek.width / 2, point.y - cheek.y - cheek.height / 2) / face.width,
          fromMouthX: side * (point.x - mouth.x - mouth.width / 2) / face.width,
          fromMouthY: (point.y - mouth.y - mouth.height / 2) / face.width,
          fromEyesX: side * (point.x - eyeX) / face.width, fromEyesY: (point.y - eyeY) / face.width,
          inset: Math.min(rect.left - view.left, rect.top - view.top, view.right - rect.right, view.bottom - rect.bottom),
          safeInset: Math.min(rect.left - safe.left, rect.top - safe.top, safe.right - rect.right, safe.bottom - rect.bottom),
        };
      }, {ids: meshes[id], id});
      const info = [id, kind, label, JSON.stringify(p)].join(" ");
      assert(p.inset >= -1, info);
      assert(p.safeInset >= -1, info);
      if (kind === "blush") assert(p.cheekDistance < 0.16, info);
      if (kind === "sigh") assert(p.fromMouthX > 0.18 && p.fromMouthX < 0.64 && Math.abs(p.fromMouthY) < 0.22, info);
      if (kind === "anger") assert(p.fromEyesX > 0.22 && p.fromEyesX < 0.60 && p.fromEyesY < -0.08 && p.fromEyesY > -0.48, info);
      if (kind === "sweat") assert(p.fromEyesX > 0.20 && p.fromEyesX < 0.65 && Math.abs(p.fromEyesY) < 0.25, info);
      if (["question", "music", "surprise", "sparkle", "idea"].includes(kind)) assert(Math.abs(p.fromEyesX) > 0.40 && Math.abs(p.fromEyesX) < 0.90 && p.fromEyesY < -0.04 && p.fromEyesY > -0.53, info);
    }
    await page.goto(new URL("playground/", base).href);
    for (const id of Object.keys(meshes)) {
      await select(id);
      for (const [width, height] of [[320,740], [844,390], [1440,900], [2560,1080]]) {
        await page.setViewportSize({width, height});
        await page.locator("[data-companion-stage]").scrollIntoViewIfNeeded();
        await page.mouse.move(width - 2, 2);
        const accents = [["blush","2"],["anger","4"],["sigh","3"],["sweat","3"],["question","1"]];
        if (width === 1440) accents.push(["idea","4"], ["surprise","2"], ["sparkle","3"], ["music","5"]);
        for (const [kind, pose] of accents) {
          await perform(kind, pose);
          await check(id, kind, width + "x" + height);
          if (width === 1440 && kind === "music") {
            await page.mouse.move(2, height - 2);
            await page.waitForTimeout(300);
            await check(id, kind, "during pose and gaze movement");
          }
        }
      }
      // The canvas also extends behind the commands. Facial accents must stay
      // on the moving model, entirely inside the unobscured composition area.
      await page.locator('[data-vn-open="topics"]').click();
      await page.locator('[data-vn-topic-start^="branch:"]').first().click();
      await page.locator(".vn-scene-choices button").first().waitFor();
      for (const [width, height] of [[1440, 900], [390, 844]]) {
        await page.setViewportSize({ width, height });
        await page.locator(".vn-actor-area").scrollIntoViewIfNeeded();
        await perform("blush", "2");
        await check(id, "blush", "reply menu " + width + "x" + height);
      }
    }
    await page.setViewportSize({width:1440, height:900});
    await page.goto(base);
    for (const id of Object.keys(meshes)) {
      await select(id);
      await perform("blush","2");
      await check(id, "blush", "dock");
      await perform("anger","4");
      await page.locator("[data-companion-maximize]").click();
      await check(id, "anger", "maximize during effect");
      await page.setViewportSize({width:390, height:844});
      await check(id, "anger", "rotate during effect");
      await perform("sigh","3");
      await check(id, "sigh", "narrow floating");
      await page.setViewportSize({width:1440, height:900});
      await page.locator("[data-companion-reset-position]").click();
    }
    await page.emulateMedia({reducedMotion: "reduce"});
    await perform("blush", "2");
    assert(await page.locator(".vn-reaction").isHidden());
    assert.deepEqual(errors, []);
    console.log("PASS: three animated rigs, nine effects, moving facial anchors, four standalone sizes, dock, live maximize/rotate, narrow floating and reduced motion.");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
