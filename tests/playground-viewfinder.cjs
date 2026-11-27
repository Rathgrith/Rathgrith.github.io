// Exercise the scene dials against the actual painting and WebGL rig.
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
      const touch = width < 500;
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: touch, isMobile: touch, reducedMotion: "reduce" });
      await captureRenderer(page);
      await page.addInitScript(() => {
        if (!localStorage.getItem("site-companion-v1")) {
          localStorage.setItem("site-companion-v1", JSON.stringify({ speed: 0, foldIdleReplies: false }));
        }
      });
      await page.goto(new URL(path, base).href, { waitUntil: "domcontentloaded" });
      const widget = page.locator("#live2d-widget");
      const deck = widget.locator(".pg-lens-deck");
      const focusDial = deck.locator("[data-vn-focus-dial]");
      const iris = deck.locator("[data-vn-aperture-dial]");
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
        // The homepage can scroll to keep the controls in view. Measure inside the stage.
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
      assert(await deck.isVisible(), "The camera controls are on the scene without opening any panel");
      assert.equal(await deck.getByRole("slider", { name: /.+/ }).count(), 2, "Both dials have accessible names");
      for (const dial of [focusDial, iris]) {
        assert(await dial.isEnabled());
        assert(await dial.getAttribute("aria-valuetext"), "The current stop is announced as a named value");
      }
      assert.deepEqual(await Promise.all([focusDial.inputValue(), iris.inputValue()]), ["0", "2"]);

      const focusKnob = deck.locator('[data-lens-dial="focus"]');
      const turnFocus = () => touch ? focusKnob.tap() : focusKnob.click();
      await turnFocus();
      assert.equal(await focusDial.inputValue(), "1", "Tapping the dial advances one stop");
      const hit = await focusKnob.boundingBox();
      const x = hit.x + hit.width / 2, y = hit.y + hit.height / 2;
      if (touch) {
        const finger = await page.context().newCDPSession(page);
        await finger.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
        await finger.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x + 64, y }] });
        await finger.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        await finger.detach();
      } else {
        await page.mouse.move(x, y);
        await page.mouse.down();
        await page.mouse.move(x + 64, y, { steps: 5 });
        await page.mouse.up();
      }
      assert.equal(await focusDial.inputValue(), "3", "Dragging turns through stops up to the limit");
      await turnFocus();
      assert.equal(await focusDial.inputValue(), "0", "One tap wraps from background to autofocus");

      const planes = [
        ["near", -1, ["1.4", "2", "2.8", "4"]],
        ["subject", 0, ["2", "2.8", "4", "5.6"]],
        ["far", 1, []],
      ];
      for (const [planeName, focus, stops] of planes) {
        await focusDial.press("ArrowRight");
        assert.equal(await widget.getAttribute("data-lens-focus-mode"), "manual");
        assert.equal(await widget.getAttribute("data-lens-focus-plane"), planeName);
        const radii = [];
        for (const [index, fNumber] of ["2", "2.8", "4", "5.6"].entries()) {
          await iris.press(index === 0 ? "Home" : "ArrowRight");
          assert.equal(await widget.getAttribute("data-lens-f-number"), fNumber);
          await waitForLens();
          const shot = await measure();
          assert.equal(shot.focus, focus);
          const filename = stops.length ? "marisa-workshop-f" + stops[index] + ".webp" : "marisa-workshop.png";
          assert(shot.exposure.endsWith(filename + '")'), "Exposure at " + planeName + " f/" + fNumber);
          assert.deepEqual(shot.framing, normal.framing, "Focus and aperture preserve model, background crop and canvas");
          radii.push(shot.radius);
        }
        assert(radii.every((n, i) => n > 0 && (!i || n < radii[i - 1])),
          "Stopping down progressively reduces the optical blur radius");
      }
      await widget.locator('[data-vn-open="topics"]').click();
      await widget.locator('[data-vn-topic-start^="branch:"]').first().click();
      const reply = widget.locator(".vn-scene-choices button").first();
      await reply.click({ trial: true });
      assert.equal((await measure()).focus, 1, "A reply retains manual background focus");
      const replies = widget.locator(".vn-scene-choices button");
      const choices = await replies.allTextContents();
      const instrument = await deck.boundingBox();
      for (const option of await replies.all()) {
        const b = await option.boundingBox();
        assert(b.x + b.width <= instrument.x + 1 || instrument.x + instrument.width <= b.x + 1 ||
          b.y + b.height <= instrument.y + 1 || instrument.y + instrument.height <= b.y + 1,
          "Every reply is clear of the camera controls");
      }
      await focusDial.press("ArrowLeft");
      assert.equal((await measure()).focus, 0, "The knob works while the story is waiting for a reply");
      await focusDial.press("ArrowRight");
      assert.equal(await widget.getAttribute("data-dialogue-state"), "choice");
      assert.deepEqual(await replies.allTextContents(), choices, "Turning a dial keeps the current reply menu");
      assert(await renderer.evaluate(r => r === cameraTestApp.renderer));
      assert(await model.evaluate(m => m === cameraTestApp.stage.children[0]));
      await page.reload({ waitUntil: "domcontentloaded" });
      await waitForLens();
      assert.deepEqual(await Promise.all([focusDial.inputValue(), iris.inputValue()]), ["3", "3"],
        "Manual background focus and f/5.6 persist");
      await focusDial.press("Home");
      await waitForLens();
      assert.equal(await widget.getAttribute("data-lens-focus-mode"), "auto");
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
      console.log("PASS on-scene dials, three focus planes, four stops, fixed framing, replies and saved settings at", path || "home", width, height);
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
