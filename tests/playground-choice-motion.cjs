// Sample the real CSS timing model so slow CI frames cannot skip the moving menu.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const captureRenderer = require("./helpers/companion-renderer.cjs");
const checkSceneChoices = require("./helpers/scene-choices.cjs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    for (const [width, height, axis] of [[1440, 900, "x"], [390, 844, "y"]]) {
      const page = await browser.newPage({ viewport: { width, height }, hasTouch: width < 500 });
      await captureRenderer(page);
      // This test scrubs the transition by hand; inactivity folding has its own timing test.
      await page.addInitScript(() => localStorage.setItem("site-companion-v1",
        JSON.stringify({ speed: 0, foldIdleReplies: false })));
      await page.goto(new URL("playground/", base).href, { waitUntil: "domcontentloaded" });
      await page.waitForFunction(() => document.querySelector("#live2d-widget")?.dataset.live2dCharacter === "alice" &&
        window.cameraTestApp?.stage.children[0]?.glContextID === window.cameraTestApp?.renderer.CONTEXT_UID &&
        !document.querySelector("#live2d-widget").classList.contains("is-loading"));
      await page.evaluate(() => document.fonts.ready);
      const widget = page.locator("#live2d-widget"), topics = widget.locator('[data-vn-open="topics"]');
      for (const reduced of [false, true]) {
        await page.emulateMedia({ reducedMotion: reduced ? "reduce" : "no-preference" });
        await topics.click();
        await widget.locator('[data-vn-topic-start="craft"]').click();
        await topics.click();
        const branch = widget.locator('[data-vn-topic-start="branch:daily"]');
        const probe = await widget.evaluateHandle(async widget => {
          const app = cameraTestApp, renderer = app.renderer, model = app.stage.children[0], canvas = app.view;
          const frame = widget.querySelector(".vn-scene-frame");
          const tick = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve))));
          frame.getAnimations().forEach(effect => effect.finish());
          await tick();
          const originalResize = renderer.resize;
          let resizes = 0;
          renderer.resize = function(...args) { resizes++; return originalResize.apply(this, args); };
          const viewport = () => {
            const r = canvas.getBoundingClientRect(), f = frame.getBoundingClientRect();
            return [r.x - f.x, r.y - f.y, r.width, r.height, canvas.width, canvas.height, renderer.screen.width, renderer.screen.height];
          };
          const originalView = viewport();
          const steady = () => app === cameraTestApp && renderer === cameraTestApp.renderer &&
            model === app.stage.children[0] && canvas === widget.querySelector("#live2dcanvas") &&
            !resizes && viewport().every((v,i) => Math.abs(v - originalView[i]) < .01);
          // Track a fixed local point at eye level. Zooming around the face can move
          // the model's top-left origin in the opposite direction from the actual shot.
          const eyes = window.cameraTestFace().slice(0, 2), view = canvas.getBoundingClientRect();
          const eyeX = eyes.reduce((sum, r) => sum + (r.left + r.right) / 4, 0);
          const eyeY = eyes.reduce((sum, r) => sum + (r.top + r.bottom) / 4, 0);
          const focus = model.toLocal(new PIXI.Point((eyeX - view.left) * renderer.screen.width / view.width,
            (eyeY - view.top) * renderer.screen.height / view.height));
          return { tick, steady, pose: () => model.toGlobal(focus),
            restore: () => { renderer.resize = originalResize; } };
        });
        const result = await branch.evaluate(async (button, { axis, probe }) => {
          const widget = button.closest("#live2d-widget"), frame = widget.querySelector(".vn-scene-frame");
          const menu = frame.querySelector(".vn-scene-choices"), safeArea = frame.querySelector(".vn-actor-area");
          const watched = () => frame.getAnimations({ subtree: true }).filter(effect =>
            effect instanceof CSSTransition && effect.effect.target === frame ||
            menu.contains(effect.effect.target) && effect.effect.getTiming().iterations === 1);
          const layout = () => [frame, widget.querySelector(".companion-conversation"), widget.querySelector(".companion-footer")].flatMap(el => {
            const r = el.getBoundingClientRect(), main = el.closest(".vn-main-view");
            return [r.left, r.top - main.getBoundingClientRect().top + main.scrollTop, r.width, r.height];
          });
          // The craft opening has no pending replies. Finish its closing motion
          // before testing a fresh entrance through the actual topic button.
          watched().forEach(effect => effect.finish());
          const before = layout(), initial = probe.pose()[axis];
          button.click();
          const effects = watched();
          const camera = effects.find(effect => effect instanceof CSSTransition && effect.effect.target === frame);
          let stable = true, overlap = false, observedButtons = false, middle;
          for (const fraction of [.25, .5, .75, 1]) {
            for (const effect of effects) {
              const timing = effect.effect.getTiming();
              effect.pause();
              effect.currentTime = timing.delay + Number(timing.duration) * fraction;
            }
            await probe.tick();
            stable &&= probe.steady() && layout().every((value, index) => Math.abs(value - before[index]) <= 1);
            const protectedRegions = [safeArea.getBoundingClientRect(), ...window.cameraTestFace()];
            if (fraction === .5) middle = probe.pose()[axis];
            for (const reply of menu.querySelectorAll("button")) {
              if (!reply.checkVisibility({ opacityProperty: true })) continue;
              let { left, top, right, bottom } = reply.getBoundingClientRect();
              // As the grid opens, only pixels surviving its clipping ancestors can obscure the actor.
              for (let el = menu; el; el = el.parentElement) {
                const s = getComputedStyle(el), r = el.getBoundingClientRect();
                if (s.overflowX !== "visible") { left = Math.max(left, r.left); right = Math.min(right, r.right); }
                if (s.overflowY !== "visible") { top = Math.max(top, r.top); bottom = Math.min(bottom, r.bottom); }
                if (el === frame) break;
              }
              if (right - left < 1 || bottom - top < 1) continue;
              if (fraction === .5) observedButtons = true;
              overlap ||= protectedRegions.some(rect => Math.min(right, rect.right) > Math.max(left, rect.left) + 1 &&
                Math.min(bottom, rect.bottom) > Math.max(top, rect.top) + 1);
            }
          }
          effects.forEach(effect => effect.finish());
          const end = probe.pose()[axis];
          return { camera: Boolean(camera), animations: effects.length, stable, overlap, observedButtons, initial, middle, end };
        }, { axis, probe });
        assert.equal(result.camera, !reduced, width + "px: the actor pane honors the motion preference");
        const { initial, middle, end } = result;
        assert(Math.abs(end - initial) > 1, "The model reframes for replies: " + JSON.stringify(result));
        assert.equal((middle - initial) / (end - initial) > .001 && (middle - initial) / (end - initial) < .999,
          !reduced, "The real model interpolates toward the reply composition: " + JSON.stringify(result));
        if (reduced) assert.equal(result.animations, 0, "Reduced motion settles both the camera and the command menu immediately");
        assert(result.stable && !result.overlap && result.observedButtons, JSON.stringify({ width, reduced, result }));
        await checkSceneChoices(widget);
        await widget.locator("#live2d-interact").press("Enter");
        const replies = widget.locator(".vn-scene-choices button");
        assert(await replies.first().evaluate(button => button === document.activeElement));
        if (width < 500) await replies.last().tap();
        else { await page.keyboard.press("End"); await page.keyboard.press("Enter"); }
        await page.waitForFunction(() => document.querySelector("#live2d-widget").dataset.vnBranchNode !== "daily");
        for (let turns = 0; !await replies.count() && turns < 4; turns++) {
          await widget.locator("#live2d-interact").press("Enter");
        }
        assert.equal(await replies.count(), 2, "The next branch provides a new pair of choices");
        await checkSceneChoices(widget);
        await probe.evaluate(async p => { await p.tick(); });
        assert(await probe.evaluate(p => p.steady()), "Switching from three replies to two preserves the renderer and model");
        await topics.click();
        await widget.locator('[data-vn-topic-start="craft"]').click();
        const closed = await probe.evaluate(async p => {
          await Promise.all(document.querySelector(".vn-scene-frame").getAnimations().map(a => a.finished));
          await p.tick();
          const value = { steady: p.steady(), pose: p.pose() };
          p.restore();
          return value;
        });
        // A new authored line may retain a slight handheld offset after the menu closes.
        const returnTolerance = reduced ? 1 : Math.max(3, Math.abs(end - initial) * .12);
        assert(closed.steady && Math.abs(closed.pose[axis] - initial) < returnTolerance,
          "Closing replies restores the camera while keeping the full canvas: " + JSON.stringify({ initial, closed }));
        await probe.dispose();
      }
      console.log("PASS scene reply transitions and reduced motion at", width, height);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
