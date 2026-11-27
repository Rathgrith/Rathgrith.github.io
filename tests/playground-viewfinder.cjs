// Exercise the visible lens settings against the actual painting and WebGL rig.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const captureRenderer = require("./helpers/companion-renderer.cjs");
const checkFocusPixels = require("./helpers/companion-focus-planes.cjs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    for (const [path, width, height] of [
      ["playground/", 1440, 900], ["playground/", 320, 740],
      ["", 1440, 900], ["", 390, 844],
    ]) {
      const page = await browser.newPage({ viewport: { width, height }, reducedMotion: "reduce" });
      await captureRenderer(page);
      await page.addInitScript(() => {
        if (!localStorage.getItem("site-companion-v1")) {
          localStorage.setItem("site-companion-v1", JSON.stringify({ speed: 0, foldIdleReplies: false }));
        }
      });
      await page.goto(new URL(path, base).href, { waitUntil: "domcontentloaded" });
      const widget = page.locator("#live2d-widget");
      const settings = widget.locator('[data-vn-open="settings"]');
      const plane = widget.locator("[data-vn-focus-plane]");
      const mode = widget.locator("[data-vn-focus-mode]");
      const iris = widget.locator("[data-vn-f-number]");
      const waitForLens = async () => {
        await widget.locator(".companion-stage").scrollIntoViewIfNeeded();
        await widget.locator("[data-lens-engaged]").waitFor();
      };
      await widget.locator('button[data-vn-character="marisa"]').click();
      await waitForLens();
      const model = await page.evaluateHandle(() => cameraTestApp.stage.children[0]);
      const renderer = await page.evaluateHandle(() => cameraTestApp.renderer);
      const measure = () => widget.evaluate(w => {
        const room = w.querySelector(".vn-room"), rig = cameraTestApp.stage.children[0];
        const uniform = cameraTestApp.stage.filters[0].uniforms;
        // The homepage can scroll when a menu gets focus. Measure inside its stage.
        const stage = w.querySelector(".companion-stage").getBoundingClientRect();
        const bounds = r => [r.x - stage.x, r.y - stage.y, r.width, r.height];
        const plate = getComputedStyle(room.querySelector(".vn-room-aperture"));
        return {
          framing: [rig.scale.x, rig.scale.y, rig.x, rig.y,
            ...bounds(room.getBoundingClientRect()), ...bounds(cameraTestApp.view.getBoundingClientRect())],
          radius: uniform.uLensRadius, focus: uniform.uFocusPlane,
          exposure: plate.display === "none" ? getComputedStyle(room).backgroundImage : plate.backgroundImage,
        };
      });
      const normal = await measure();
      assert.equal(normal.focus, 0, "Auto tracks the face");
      assert(normal.exposure.endsWith('marisa-workshop-f4.webp")'));
      assert(await widget.locator(".pg-viewfinder-grid").isVisible());
      await settings.click();
      assert.equal(await mode.inputValue(), "auto");
      assert(await plane.isDisabled());
      await mode.selectOption("manual");
      const planes = [
        ["near", -1, ["1.4", "2", "2.8", "4"]],
        ["subject", 0, ["2", "2.8", "4", "5.6"]],
        ["far", 1, []],
      ];
      for (const [planeName, focus, stops] of planes) {
        const radii = [];
        let index = 0;
        for (const fNumber of ["2", "2.8", "4", "5.6"]) {
          await plane.selectOption(planeName);
          await iris.selectOption(fNumber);
          await page.keyboard.press("Escape");
          await waitForLens();
          const shot = await measure();
          assert.equal(shot.focus, focus);
          const filename = stops.length ? "marisa-workshop-f" + stops[index] + ".webp" : "marisa-workshop.png";
          assert(shot.exposure.endsWith(filename + '")'), "Exposure at " + planeName + " f/" + fNumber);
          assert.deepEqual(shot.framing, normal.framing, "Focus and aperture preserve model, background crop and canvas");
          radii.push(shot.radius);
          index++;
          await settings.click();
        }
        assert(radii.every((n, i) => n > 0 && (!i || n < radii[i - 1])),
          "Stopping down progressively reduces the optical blur radius");
      }
      await page.keyboard.press("Escape");
      await widget.locator('[data-vn-open="topics"]').click();
      await widget.locator('[data-vn-topic-start^="branch:"]').first().click();
      const reply = widget.locator(".vn-scene-choices button").first();
      await reply.click({ trial: true });
      assert.equal((await measure()).focus, 1, "A reply retains manual background focus");
      assert(await renderer.evaluate(r => r === cameraTestApp.renderer));
      assert(await model.evaluate(m => m === cameraTestApp.stage.children[0]));
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForLens();
      await settings.click();
      assert.deepEqual(await Promise.all([mode.inputValue(), plane.inputValue(), iris.inputValue()]), ["manual", "far", "5.6"]);
      await mode.selectOption("auto");
      await page.keyboard.press("Escape");
      await waitForLens();
      assert.equal((await measure()).focus, 0, "Auto returns focus to the subject");
      if (path && width === 1440) {
        let resolvedHand = false;
        for (const character of ["alice", "marisa", "patchouli"]) {
          await widget.locator('button[data-vn-character="' + character + '"]').click();
          await page.waitForFunction(id => {
            const w = document.querySelector("#live2d-widget");
            return w.dataset.live2dCharacter === id && w.querySelector("[data-lens-engaged]");
          }, character);
          const evidence = await checkFocusPixels(page, character);
          if (evidence.hand[0] > 0) resolvedHand = true;
        }
        assert(resolvedHand, "At least one actual posed hand is visible and resolves at near focus");
      }
      await page.close();
      console.log("PASS three focus planes, four stops, fixed framing, replies and saved settings at", path || "home", width, height);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
