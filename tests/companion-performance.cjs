const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const out =
  process.env.QA_OUTPUT || require("node:os").tmpdir() + "/performance-qa";
fs.mkdirSync(out, { recursive: true });

// Visible left/right hand layers in the five authored Cannonball poses.
const hands = {
  alice: [
    ["01", "07"],
    ["04", "03"],
    ["07", "07"],
    ["02", "05"],
    ["07", "04"],
  ],
  marisa: [
    ["05", "05"],
    ["05", "04"],
    ["01", "05"],
    ["03", "02"],
    ["04", "04"],
  ],
  patchouli: [
    ["01", "02"],
    ["02", "02"],
    ["04", "02"],
    ["02", "02"],
    ["03", "03"],
  ],
};
(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-gpu"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1100 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/companion-dialogue.js*", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
        const mountForTest = SiteCompanion.mount;
        SiteCompanion.mount = function(widget, hooks) {
          window.performanceTestHooks = hooks;
          return mountForTest(widget, hooks);
        };`,
      });
    });
    await page.route("**/companion-lighting.js*", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          `
        const createForTest = CompanionLighting.create;
        CompanionLighting.create = function(app, widget) {
          window.performanceTestApp = app;
          return createForTest(app, widget);
        };`,
      });
    });
    await page.goto(process.env.PREVIEW_URL || "http://127.0.0.1:4100/");
    await page.waitForFunction(
      () =>
        document.querySelector("#live2d-widget")?.dataset.dialogueState ===
        "typing"
    );
    await page.locator('[data-vn-open="settings"]').click();
    await page.locator("[data-vn-speed]").selectOption("0");
    await page.keyboard.press("Escape");

    async function select(id) {
      await page.locator(`button[data-vn-character="${id}"]`).click();
      await page.waitForFunction(
        (id) => {
          const w = document.querySelector("#live2d-widget");
          return (
            w.dataset.live2dCharacter === id &&
            !w.classList.contains("is-loading")
          );
        },
        id,
        { timeout: 45000 }
      );
      await page.evaluate(() => {
        const model = performanceTestApp.stage.children[0];
        window.performanceFrames = [];
        model.internalModel.on("beforeModelUpdate", () => {
          const core = model.internalModel.coreModel;
          window.performanceFrame = {
            mouth: core.getParameterValueById("ParamMouthForm"),
            angleY: core.getParameterValueById("ParamAngleY"),
            hands: ["Right", "Left"].flatMap((side) =>
              Array.from({ length: 7 }, (_, i) => {
                const id = "Part" + side + "Hand0" + (i + 1);
                return core.getPartOpacityById(id) > 0.5 ? id : null;
              }).filter(Boolean)
            ),
          };
          performanceFrames.push({
            time: performance.now(),
            resting: document.querySelector("#live2d-widget").dataset.live2dResting === "true",
            angles: ["ParamAngleX", "ParamAngleY", "ParamAngleZ"].map(
              (id) => core.getParameterValueById(id)
            ),
          });
          if (performanceFrames.length > 500) performanceFrames.shift();
        });
      });
    }
    async function settle(pose, expression) {
      await page.waitForFunction(
        ({ pose, expression }) => {
          const w = document.querySelector("#live2d-widget");
          return (
            w.dataset.live2dPoseId === pose &&
            w.dataset.live2dExpressionId === expression &&
            w.dataset.live2dResting === "true"
          );
        },
        { pose, expression },
        { timeout: 15000 }
      );
      // Allow the expression blend to settle after the body transition.
      await page.waitForTimeout(650);
    }

    for (const id of Object.keys(hands)) {
      await select(id);
      for (let pose = 1; pose <= 5; pose++) {
        const line = await page.evaluate(
          ({ id, pose }) => {
            const lines = [];
            function collect(o) {
              if (!o || typeof o !== "object") return;
              if (o.text) lines.push(o);
              Object.values(o).forEach(collect);
            }
            collect(CompanionStories.characters[id]);
            return lines.find((l) => l.poseId === String(pose));
          },
          { id, pose }
        );
        assert(line, `${id} pose ${pose} is used in the script`);
        await page.evaluate((line) => {
          performanceFrames.length = 0;
          // A steady off-centre gaze exposes a change in focus amplitude.
          performanceTestApp.stage.children[0].internalModel.focusController.focus(0.6, -0.4, true);
          performanceTestHooks.perform(line);
        }, line);
        await settle(String(pose), line.expressionMotionId);
        const frames = await page.evaluate(() => performanceFrames);
        fs.writeFileSync(`${out}/${id}-pose-${pose}-frames.json`, JSON.stringify(frames));
        const handoff = frames.findIndex((frame, index) =>
          index > 0 && frame.resting && !frames[index - 1].resting
        );
        if (handoff > 0) {
          const jump = Math.max(...frames[handoff].angles.map(
            (value, index) => Math.abs(value - frames[handoff - 1].angles[index])
          ));
          assert(jump < 2, `${id} pose ${pose} snaps ${jump.toFixed(2)} degrees when its motion ends`);
        }
        const frame = await page.evaluate(() => performanceFrame);
        assert.deepEqual(
          frame.hands.sort(),
          [
            `PartRightHand${hands[id][pose - 1][0]}`,
            `PartLeftHand${hands[id][pose - 1][1]}`,
          ].sort()
        );
        if (id === "patchouli" && pose === 4)
          assert(
            frame.angleY < -9,
            "Reading pose really lowers Patchouli's head"
          );
        await page
          .locator("#live2d-widget")
          .screenshot({ path: `${out}/${id}-pose-${pose}.png` });
      }
      // Actual friend menu must carry its per-line direction into the renderer.
      const friend = await page.evaluate(
        (id) =>
          CompanionRemarks[id].find((l) => l.expressionMotionId === "05") ||
          CompanionRemarks[id][0],
        id
      );
      await page.locator('[data-vn-open="topics"]').click();
      await page.locator('[data-vn-topic-start="friends"]').click();
      await page
        .locator("[data-vn-friends-list] button")
        .filter({ hasText: friend.name })
        .click();
      await settle(friend.poseId, friend.expressionMotionId);
      assert.equal(
        await page.locator("[data-live2d-dialogue-text]").textContent(),
        friend.text
      );
      if (id === "patchouli") {
        assert(
          (await page.evaluate(() => performanceFrame.mouth)) < -0.9,
          "Marisa's book remark actually uses the annoyed face"
        );
        // The old implementation reverted every face after 7.2 seconds.
        await page.waitForTimeout(7600);
        assert.equal(
          await page
            .locator("#live2d-widget")
            .getAttribute("data-live2d-expression-id"),
          "05"
        );
        assert((await page.evaluate(() => performanceFrame.mouth)) < -0.9);
      }
      // Rapid next lines during a transition: retain the latest pose AND face.
      await page.evaluate(() => {
        for (const [pose, expression] of [
          ["4", "03"],
          ["1", "01"],
          ["3", "02"],
          ["5", "07"],
        ])
          performanceTestHooks.perform({
            poseId: pose,
            expressionMotionId: expression,
          });
      });
      await settle("5", "07");
      assert((await page.evaluate(() => performanceFrame.mouth)) > 0.9);
      // Minimized/hidden renderers must not settle a half-played animation on
      // a wall-clock timeout. Resume the same motion before accepting rest.
      await page.evaluate(() => performanceTestHooks.perform({ poseId: "4", expressionMotionId: "01" }));
      await page.waitForFunction(() => {
        const manager = performanceTestApp.stage.children[0].internalModel.motionManager;
        return manager.playing && !manager.isFinished();
      });
      await page.evaluate(() => {
        performanceTestApp.stage.children[0].autoUpdate = false;
        performanceTestApp.stop();
      });
      await page.waitForTimeout(1300);
      assert.notEqual(await page.locator("#live2d-widget").getAttribute("data-live2d-resting"), "true");
      await page.evaluate(() => {
        performanceTestApp.stage.children[0].autoUpdate = true;
        performanceTestApp.start();
      });
      await settle("4", "01");
      if (id === "alice") {
        await page.evaluate(() => performanceTestHooks.perform({ poseId: "2", expressionMotionId: "02" }));
        await page.waitForFunction(() => {
          const manager = performanceTestApp.stage.children[0].internalModel.motionManager;
          return manager.playing && !manager.isFinished();
        });
        await page.locator("[data-companion-close]").click();
        await page.waitForTimeout(1300);
        assert.notEqual(await page.locator("#live2d-widget").getAttribute("data-live2d-resting"), "true");
        await page.locator("[data-site-options-trigger]").click();
        await page.locator("[data-live2d-toggle]").click();
        await page.keyboard.press("Escape");
        await page.waitForFunction(() => {
          const widget = document.querySelector("#live2d-widget");
          return widget.dataset.live2dResting === "true" &&
            widget.dataset.live2dPoseId === widget.dataset.live2dRequestedPose;
        });
      }
    }

    // Reparenting after responsive changes must still put the index first.
    for (const width of [1440, 999, 1280, 1920]) {
      await page.setViewportSize({ width, height: 1100 });
      await page.waitForTimeout(150);
      if (width >= 1000)
        assert(
          await page.evaluate(() => {
            const nav = document.querySelector(".classic-page-index");
            const dock = document.querySelector("[data-companion-dock]");
            return (
              nav.nextElementSibling === dock &&
              nav.getBoundingClientRect().bottom <=
                dock.getBoundingClientRect().top
            );
          })
        );
    }
    // Reduced motion still gets the authored expression and static pose.
    await page.emulateMedia({ reducedMotion: "reduce" });
    await select("alice");
    await page.evaluate(() =>
      performanceTestHooks.perform({ poseId: "2", expressionMotionId: "07" })
    );
    await settle("2", "07");
    assert((await page.evaluate(() => performanceFrame.mouth)) > 0.99);
    assert.equal(
      await page
        .locator("#live2d-widget")
        .getAttribute("data-live2d-motion-id"),
      "static"
    );
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.locator(".author__avatar").scrollIntoViewIfNeeded();
    await page.screenshot({ path: `${out}/alice-home.png` });
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 15 real model poses, continuous head handoffs, paused motion completion, directed friend remarks, sustained faces, latest-line motion queue, reduced motion and desktop index ordering"
    );
  } finally {
    await browser.close();
  }
})();
