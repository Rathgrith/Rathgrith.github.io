// Sample the real Cubism rig: a moving HTML indicator cannot satisfy this check.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const roles = {
  alice: { gesture: "doll", next: "inspect", face: "Face", mouth: "MouthOral" },
  marisa: { gesture: "survey", next: "curious", face: "Face", mouth: "MouthOral" },
  patchouli: { gesture: "read", next: "scan", face: "D_PSD1_54", mouth: "D_PSD1_58" },
};

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 820 } });
    const errors = [];
    page.on("pageerror", e => errors.push(e.message));
    await page.addInitScript(() => localStorage.setItem("site-companion-v1", JSON.stringify({ speed: 0 })));
    await page.route("**/companion-performance.js*", async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: await response.text() + `
        const originalCreate = CompanionPerformance.create;
        CompanionPerformance.create = function (model, id, widget, expressions, options) {
          window.idleProbe = { model, id, widget, canIdle: options.canIdle };
          return originalCreate.apply(this, arguments);
        };` });
    });
    const widget = page.locator("#live2d-widget");
    const stage = page.locator("[data-companion-stage]");
    const reading = page.locator("[data-vn-reading]");
    async function ready(id) {
      await page.waitForFunction(id => window.idleProbe?.id === id &&
        idleProbe.widget.dataset.live2dCharacter === id && !idleProbe.widget.classList.contains("is-loading"),
      id, { timeout: 60000 });
    }
    async function waitIdle(gesture) {
      await page.waitForFunction(gesture => gesture ? idleProbe.widget.dataset.live2dIdle === gesture : Boolean(idleProbe.widget.dataset.live2dIdle), gesture || null, { timeout: 30000 });
    }
    async function blocked(message) {
      await page.waitForFunction(() => !idleProbe.widget.dataset.live2dIdle && !idleProbe.canIdle());
      assert.equal(await widget.getAttribute("data-live2d-idle"), null, message);
    }

    async function sampleGesture(rig) {
      return page.evaluate(async ({ gesture, face, mouth }) => {
        const { model, widget } = idleProbe;
        const canvas = widget.querySelector("#live2dcanvas");
        const internal = model.internalModel, core = internal.coreModel;
        // Cubism restores the authored parameter snapshot after drawing. Read
        // final angles in the model-update hook and observe its deformed meshes in rAF.
        const parameterIds = ["ParamAngleX", "ParamAngleY", "ParamAngleZ", "ParamEyeBallY"];
        let angles;
        function readAngles() { angles = parameterIds.map(id => core.getParameterValueById(id)); }
        internal.on("beforeModelUpdate", readAngles);
        const camera = () => [model.x, model.y, model.scale.x, model.scale.y, canvas.width, canvas.height];
        const initial = camera(), originalLine = widget.querySelector("[data-live2d-dialogue-text]").textContent;
        let neutral, active = false, frames = [];
        const deadline = performance.now() + 45000;
        while (performance.now() < deadline) {
          await new Promise(requestAnimationFrame);
          const f = internal.getDrawableBounds(face), m = internal.getDrawableBounds(mouth);
          if (!angles) continue;
          const current = angles.concat(m.x + m.width / 2, m.y + m.height / 2, f.x, f.y);
          if (widget.dataset.live2dIdle === gesture && neutral) {
            active = true;
            frames.push(current.map((v, i) => (v - neutral[i]) / (i < 4 ? 1 : f.width)));
          } else if (active) {
            internal.off("beforeModelUpdate", readAngles);
            return {
              frames: frames.length, ranges: frames[0].map((_, i) =>
                [Math.min(...frames.map(row => row[i])), Math.max(...frames.map(row => row[i]))]),
              mesh: Math.max(...frames.map(row => Math.max(Math.hypot(row[4], row[5]), Math.hypot(row[6], row[7])))),
              sameCamera: initial.every((v, i) => v === camera()[i]),
              sameLine: originalLine === widget.querySelector("[data-live2d-dialogue-text]").textContent,
              state: widget.dataset.dialogueState,
            };
          } else {
            neutral = current;
          }
        }
        internal.off("beforeModelUpdate", readAngles);
        throw new Error("No complete visible " + gesture + " gesture in the real model");
      }, rig);
    }

    await page.goto(new URL("playground/", base).href, { waitUntil: "domcontentloaded" });
    for (const [id, rig] of Object.entries(roles)) {
      await page.locator('button[data-vn-character="' + id + '"]').click();
      await ready(id);
      // Exercise all three allowed states, including an outstanding unanswered choice.
      if (id === "alice") {
        await page.locator('[data-vn-open="topics"]').click();
        await page.locator('[data-vn-topic-start^="branch:"]').first().click();
      } else if (id === "marisa") {
        await page.evaluate(() => SiteCompanion.cancel());
      }
      await reading.hover();
      const observed = await sampleGesture(rig);
      const [[left, right], [down, up], [, rollRight], [eyesDown]] = observed.ranges;
      const evidence = id + " " + JSON.stringify(observed);
      assert.equal(observed.state, { alice: "choice", marisa: "idle", patchouli: "ready" }[id]);
      assert(observed.frames >= 6 && observed.mesh > .008, evidence);
      assert(observed.sameCamera && observed.sameLine, evidence);
      if (id === "alice") assert(right > 4 && rollRight > 1.5, evidence);
      if (id === "marisa") assert(left < -3 && right > 3 && up > 1.5, evidence);
      if (id === "patchouli") assert(down < -3 && eyesDown < -.15, evidence);
      const second = await sampleGesture({ ...rig, gesture: rig.next });
      const secondEvidence = rig.next + " " + JSON.stringify(second);
      assert(second.mesh > .004 && second.sameCamera && second.sameLine, secondEvidence);
      if (id === "alice") assert(second.ranges[1][0] < -2, secondEvidence);
      if (id === "marisa") assert(second.ranges[2][1] > 3, secondEvidence);
      if (id === "patchouli") assert(second.ranges[1][0] < -2, secondEvidence);
      console.log(id, [observed, second].map(g => (g.mesh * 100).toFixed(1) + "%").join(" / "), "face-width displacement");
    }

    // Let the real pointer retake gaze, then interrupt again with only the keyboard.
    await waitIdle();
    const scene = await stage.boundingBox();
    await page.mouse.move(scene.x + scene.width * .95, scene.y + scene.height * .4);
    await page.waitForFunction(() => !idleProbe.widget.dataset.live2dIdle &&
      idleProbe.model.internalModel.focusController.targetX > .2);
    await reading.focus();
    await waitIdle();
    await page.keyboard.press("Shift");
    await page.waitForFunction(() => !idleProbe.widget.dataset.live2dIdle);
    await page.locator('[data-vn-open="settings"]').click();
    await blocked("Settings suspend idle motion");
    await page.locator("[data-vn-speed]").selectOption("65");
    await page.keyboard.press("Escape");
    await page.locator('[data-vn-open="topics"]').click();
    await page.locator('[data-vn-topic-start^="branch:"]').first().click();
    assert.equal(await widget.getAttribute("data-dialogue-state"), "typing");
    await blocked("Dialogue takes priority while typing");
    await reading.click();
    await waitIdle();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.waitForFunction(() => !idleProbe.widget.dataset.live2dIdle);
    await page.waitForTimeout(4500);
    assert.equal(await widget.getAttribute("data-live2d-idle"), null);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await waitIdle();
    await page.locator("[data-danmaku-open]").click();
    await blocked("The game owns the stage");
    await page.locator("[data-danmaku-exit]").click();

    // Compact Playground uses a scrolling workspace. Opening its receiver
    // creates enough room to move the entire scene outside that viewport.
    await page.setViewportSize({ width: 320, height: 540 });
    await page.waitForFunction(() => idleProbe.widget.dataset.playgroundLayout === "compact");
    const receiver = page.locator(".pg-radio");
    if (!(await receiver.evaluate(e => e.open))) await receiver.locator("summary").click();
    await page.locator(".vn-main-view").evaluate(e => e.scrollTo({ top: e.scrollHeight, behavior: "instant" }));
    await page.waitForFunction(() => document.querySelector("[data-companion-stage]").getBoundingClientRect().bottom <
      document.querySelector(".vn-main-view").getBoundingClientRect().top);
    await blocked("A scene outside the scrolling workspace suspends its gesture");
    await stage.scrollIntoViewIfNeeded();
    await waitIdle();

    await page.setViewportSize({ width: 1366, height: 820 });
    await page.goto(base, { waitUntil: "domcontentloaded" });
    await page.locator('[data-classic-character="alice"]').click();
    await ready("alice");
    await stage.scrollIntoViewIfNeeded();
    await waitIdle("doll");
    await page.locator("[data-companion-minimize]").click();
    await blocked("Minimized companions stop their gesture");
    await page.locator("[data-companion-minimize]").click();
    await page.locator("[data-companion-maximize]").click();
    await page.setViewportSize({ width: 1000, height: 700 });
    await stage.scrollIntoViewIfNeeded();
    await waitIdle();
    assert.deepEqual(errors, []);
    console.log("PASS: six distinct mesh gestures, unchanged camera and text, pointer and keyboard priority, typing, panels, game, reduced motion, offscreen, minimize and resize recovery");
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
