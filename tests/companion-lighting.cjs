// Verify real WebGL output: a compiled shader, a visible rig and alpha-safe light.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const captureRenderer = require("./helpers/companion-renderer.cjs");
const measureLens = require("./helpers/lens-pass.cjs");
const checkRim = require("./helpers/companion-rim-light.cjs");
const out =
  process.env.QA_OUTPUT || require("node:os").tmpdir() + "/lighting-qa";
fs.mkdirSync(out, { recursive: true });

async function expectMotion(page, expected) {
  await page.waitForFunction(expected => {
    const stage = document.querySelector("[data-companion-stage]"), motes = document.querySelectorAll(".vn-mote");
    const moving = [...motes].some(el => el.getAnimations().some(a => a.playState === "running"));
    const room = stage.querySelector(":scope > .vn-room"), aperture = room?.querySelector(":scope > .vn-room-aperture");
    if (!aperture) return false;
    const base = getComputedStyle(room), plate = getComputedStyle(aperture), open = getComputedStyle(aperture, "::after");
    const activePlates = plate.display !== "none" && open.animationName.includes("vn-aperture");
    return motes.length && stage.hasAttribute("data-camera-active") === expected && moving === expected &&
      activePlates === expected && base.animationName.includes("vn-handheld") === expected &&
      (expected || plate.display === "none") && base.backgroundImage.includes(".png") && base.filter === "none";
  }, expected);
}

async function checkRoomPlates(stage) {
  const result = await stage.evaluate(async node => {
    const room = node.querySelector(":scope > .vn-room"), aperture = room.querySelector(":scope > .vn-room-aperture");
    const styles = [getComputedStyle(room), getComputedStyle(aperture), getComputedStyle(aperture, "::after")];
    const images = await Promise.all(styles.map(async style => {
      const url = style.backgroundImage.match(/^url\("([^"]+)"\)$/);
      if (!url) throw new Error("Each aperture must paint one image: " + style.backgroundImage);
      const image = new Image();
      image.src = url[1];
      await image.decode();
      // Sample neighboring source pixels across the entire frame. Adding
      // isolated lights cannot account for the loss of detail across the room.
      const canvas = document.createElement("canvas");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(image, 0, 0);
      const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      const stride = 4 * canvas.width;
      let detail = 0;
      for (let y = 1; y < canvas.height - 1; y += 11) {
        for (let x = 1; x < canvas.width - 1; x += 11) {
          const offset = 4 * x + stride * y;
          for (let c = offset; c < offset + 3; c++) {
            detail += Math.abs(rgba[c] - rgba[c + 4]) + Math.abs(rgba[c] - rgba[c + stride]);
          }
        }
      }
      return { path: new URL(image.src).pathname, width: canvas.width, height: canvas.height, detail };
    }));
    const handheld = room.getAnimations().find(a => a.animationName === "vn-handheld");
    const elapsed = handheld.currentTime;
    handheld.pause();
    handheld.currentTime = 0;
    const start = aperture.getBoundingClientRect();
    handheld.currentTime = .26 * handheld.effect.getTiming().duration;
    const originalRect = room.getBoundingClientRect(), apertureRect = aperture.getBoundingClientRect();
    const slider = node.closest("#live2d-widget").querySelector("[data-vn-light-strength]");
    const originalStrength = slider.value;
    const motes = node.querySelector(".vn-motes-far");
    const normalOpacity = Number(getComputedStyle(motes).opacity);
    slider.value = "1";
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    const quietRect = room.getBoundingClientRect();
    const quietOpacity = Number(getComputedStyle(motes).opacity);
    slider.value = originalStrength;
    slider.dispatchEvent(new Event("input", { bubbles: true }));
    handheld.currentTime = elapsed;
    handheld.play();
    return {
      images,
      cameraTravel: Math.hypot(apertureRect.x - start.x, apertureRect.y - start.y),
      quietTravel: Math.hypot(quietRect.x - start.x, quietRect.y - start.y),
      normalOpacity, quietOpacity,
      sameRect: ["left", "top", "width", "height"].every(k => Math.abs(originalRect[k] - apertureRect[k]) < 1),
      crops: styles.map(s => [s.backgroundSize, s.backgroundPosition, s.backgroundRepeat]),
      fill: styles.slice(1).every(style =>
        Math.abs(parseFloat(style.width) - parseFloat(styles[0].width)) < 1 &&
        Math.abs(parseFloat(style.height) - parseFloat(styles[0].height)) < 1 &&
        parseFloat(style.left) === 0 && parseFloat(style.top) === 0),
    };
  });
  const [source, mid, wide] = result.images;
  assert.equal(mid.path, source.path.replace(/\.png$/, "-f4.webp"));
  assert.equal(wide.path, source.path.replace(/\.png$/, "-f2.webp"));
  for (const plate of [mid, wide]) {
    assert.deepEqual([plate.width, plate.height], [source.width, source.height],
      "The photograph keeps the source painting's full resolution");
  }
  assert(wide.detail > 0 && wide.detail < mid.detail && mid.detail < source.detail,
    "Opening the aperture progressively softens the source texture throughout the frame");
  assert(result.cameraTravel > .15, "The handheld camera actually moves the aperture plane");
  assert(result.quietTravel < result.cameraTravel * .1 && result.quietOpacity < result.normalOpacity * .1,
    "At minimum nonzero strength, both the room movement and particles become barely perceptible");
  assert(result.sameRect && result.fill, "Both apertures cover the original painting exactly");
  assert(result.crops.every(crop => crop[0] === "cover" && crop.join("|") === result.crops[0].join("|")),
    "Changing aperture keeps the same crop: " + JSON.stringify(result.crops));
}

async function checkRoomEdges(stage, path) {
  const screenshot = await stage.screenshot({ path });
  const litEdges = await stage.evaluate(async (_, png) => {
    const image = new Image();
    image.src = "data:image/png;base64," + png;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(image, 0, 0);
    const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const samples = [0, 0, 0, 0], inset = 5;
    for (let i = 1; i <= 40; i++) {
      const x = Math.floor(i * (canvas.width - 2 * inset) / 41) + inset;
      const y = Math.floor(i * (canvas.height - 2 * inset) / 41) + inset;
      [[x, inset], [x, canvas.height - inset], [inset, y], [canvas.width - inset, y]].forEach(([x, y], side) => {
        const offset = 4 * (y * canvas.width + x);
        if (Math.max(data[offset], data[offset + 1], data[offset + 2]) > 8) samples[side]++;
      });
    }
    return samples;
  }, screenshot.toString("base64"));
  assert(litEdges.every(n => n > 0), "The composited room has no solid black strip at any of its four edges: " + litEdges);
}
(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-gpu"],
  });
  try {
    for (const dpr of [1, 2]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
        deviceScaleFactor: dpr,
        reducedMotion: dpr === 2 ? "reduce" : "no-preference",
      });
      const errors = [], themeStyles = new Set();
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (e) => {
        if (/shader|gl\.getProgramInfoLog|Geometry attribute/i.test(e.text()))
          errors.push(e.text());
      });
      await captureRenderer(page);
      await page.route("**/companion-dialogue.js*", async route => {
        const response = await route.fetch();
        await route.fulfill({ response, body: (await response.text()) + `
          const mountForLens = SiteCompanion.mount;
          SiteCompanion.mount = (widget, hooks) => { window.lensTestHooks = hooks; return mountForLens(widget, hooks); };` });
      });
      await page.goto(process.env.PREVIEW_URL || "http://127.0.0.1:4100/");
      for (const id of ["alice", "marisa", "patchouli"]) {
        await page.locator(`button[data-vn-character="${id}"]`).click();
        await page.waitForFunction(
          (id) => {
            const widget = document.querySelector("#live2d-widget");
            return (
              widget.dataset.live2dCharacter === id &&
              !widget.classList.contains("is-loading") &&
              window.cameraTestApp?.stage.children.length
            );
          },
          id,
          { timeout: 45000 }
        );
        // Loading resolves before the first GPU texture upload / model update.
        await page.waitForFunction(() => {
          const app = window.cameraTestApp;
          return app.stage.children[0].glContextID === app.renderer.CONTEXT_UID;
        });
        const widget = page.locator("#live2d-widget"), stage = widget.locator("[data-companion-stage]");
        await stage.scrollIntoViewIfNeeded();
        await expectMotion(page, dpr === 1);
        const theme = await widget.evaluate(w => {
          const far = w.querySelector(".vn-motes-far"), near = w.querySelector(".vn-motes-near");
          const layers = [far, near];
          const spark = far.querySelector(".vn-mote-spark"), style = getComputedStyle(spark);
          const animation = spark.getAnimations()[0];
          let verticalTravel = 0;
          if (animation) {
            const original = animation.currentTime, timing = animation.effect.getTiming();
            const yAt = fraction => {
              animation.currentTime = timing.delay + Number(timing.duration) * (1 + fraction);
              return new DOMMatrixReadOnly(getComputedStyle(spark).transform).m42;
            };
            animation.pause();
            const start = yAt(.1);
            verticalTravel = yAt(.85) - start;
            animation.currentTime = original;
            animation.play();
          }
          return {
            verticalTravel, color: style.color.match(/[\d.]+/g).map(Number),
            particlesOnly: !w.querySelector(".vn-mote-bokeh, [data-light-source]") &&
              layers.every(layer => [...layer.children].every(mote =>
                mote.matches(".vn-mote-spark") && getComputedStyle(mote, "::before").clipPath.startsWith("polygon("))),
            controlsClear: layers.every(layer => layer.inert && layer.getAttribute("aria-hidden") === "true" &&
              getComputedStyle(layer).pointerEvents === "none"),
            signature: [style.animationName, style.color, style.clipPath].join("/"),
          };
        });
        assert(theme.controlsClear, "Neither particle layer captures interaction or screen-reader focus");
        assert(theme.particlesOnly, "Only airborne sparks or dust are drawn above the processed painting");
        const [red, green, blue] = theme.color;
        assert(id === "alice" ? blue > red : id === "marisa" ? red > blue : blue > green && red > green, JSON.stringify(theme));
        if (dpr === 1) assert(id === "patchouli" ? theme.verticalTravel > 1 : theme.verticalTravel < -1,
          "Book dust falls, sparks and embers rise: " + JSON.stringify(theme));
        themeStyles.add(theme.signature);
        if (dpr === 1) {
          await checkRim(page, id);
          await checkRoomPlates(stage);
          await checkRoomEdges(stage, `${out}/${id}-room.png`);
        }
        for (const [pose, active] of [[null, dpr === 1], ["3", true]]) {
          await page.emulateMedia({ reducedMotion: active ? "no-preference" : "reduce" });
          await expectMotion(page, active);
          await page.waitForFunction(motion => {
            const radius = cameraTestApp.stage.filters[0].uniforms.uLensRadius;
            return typeof radius === "number" && (motion ? radius > 0 : radius === 0);
          }, active);
          if (pose) {
            await page.evaluate(poseId => lensTestHooks.perform({ poseId, expressionMotionId: "04", effect: "question" }), pose);
            await page.waitForFunction(poseId => document.querySelector("#live2d-widget").dataset.live2dPoseId === poseId, pose);
          }
          const lens = await page.evaluate(measureLens);
          const info = JSON.stringify({ id, dpr, pose, active, lens });
          if (active) assert(lens.faceDistance <= 1.01, "Both eyes and the mouth lie inside the sharp focus ellipse: " + info);
          assert(lens.largestFocusChange <= 1 && lens.largestAlphaChange === 0, "Focused detail and the silhouette stay intact: " + info);
          assert.deepEqual(lens.disabledSamples, [1, 1], "Disabled optics reads exactly one texel per pixel: " + info);
          assert.deepEqual(lens.lightingSamples, [1, 3], "Only lit contours need both coverage probes: " + info);
          assert(lens.activeSamples[0] === 1 && (active ? lens.activeSamples[1] > 1 : lens.activeSamples[1] === 1),
            "Extra samples belong to the active depth pass: " + info);
          if (active) assert(lens.changedBody > 0 && lens.opaqueBody > lens.changedBody,
            "Out-of-focus body detail genuinely changes on the same rendered frame: " + info);
          else assert.equal(lens.changedBody, 0, "Reduced motion keeps a clear model: " + info);
          console.log("Lens", info);
        }
        if (dpr === 2) {
          await page.emulateMedia({ reducedMotion: "reduce" });
          await expectMotion(page, false);
        }
        const result = await page.evaluate(() => {
          const app = window.cameraTestApp;
          const model = app.stage.children[0];
          app.stop();
          model.autoUpdate = false;
          model.deltaTime = 0;
          const canvas = document.createElement("canvas");
          canvas.width = app.view.width;
          canvas.height = app.view.height;
          const ctx = canvas.getContext("2d", { willReadFrequently: true });
          const checkbox = document.querySelector("[data-vn-lighting]");
          const slider = document.querySelector("[data-vn-light-strength]");
          function light(enabled, strength) {
            checkbox.checked = enabled;
            checkbox.dispatchEvent(new Event("change", { bubbles: true }));
            slider.value = strength;
            slider.dispatchEvent(new Event("input", { bubbles: true }));
          }
          function weather(isDay, phase) {
            window.__siteWeather = {
              isDay,
              phase,
              location: "テスト",
              temperature: 15,
              name: "晴れ",
            };
            document.dispatchEvent(new CustomEvent("site:weather-updated"));
          }
          function pixels() {
            app.render();
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(app.view, 0, 0);
            return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
          }
          function difference(a, b) {
            let sum = 0,
              count = 0,
              alpha = 0;
            for (let i = 0; i < a.length; i += 4) {
              alpha = Math.max(alpha, Math.abs(a[i + 3] - b[i + 3]));
              if (a[i + 3] > 250 && b[i + 3] > 250) {
                for (let c = 0; c < 3; c++)
                  sum += Math.abs(a[i + c] - b[i + c]);
                count += 3;
              }
            }
            return { color: sum / Math.max(1, count), alpha };
          }
          weather(true, "clear");
          light(false, 75);
          const off = pixels();
          const offImage = canvas.toDataURL("image/png");
          light(true, 0);
          const zero = pixels();
          light(true, 75);
          const on = pixels();
          const onImage = canvas.toDataURL("image/png");
          light(true, 100);
          const full = pixels();
          weather(false, "rain");
          const wetNight = pixels();
          let opaque = 0,
            transparent = 0;
          for (let i = 3; i < on.length; i += 4) {
            if (on[i] > 250) opaque++;
            if (on[i] === 0) transparent++;
          }
          light(false, 75);
          const wetOff = pixels();
          weather(true, "clear");
          light(true, 75);
          pixels();
          return {
            opaque: opaque / (on.length / 4),
            transparent: transparent / (on.length / 4),
            zero: difference(off, zero),
            on: difference(zero, on),
            full: difference(zero, full),
            weather: difference(full, wetNight),
            off: difference(off, wetOff),
            onImage,
            offImage,
          };
        });
        const { onImage, offImage, ...metrics } = result;
        fs.writeFileSync(
          `${out}/${id}-unlit-${dpr}x.png`,
          Buffer.from(offImage.split(",")[1], "base64")
        );
        console.log(id, "DPR", dpr, JSON.stringify(metrics));
        assert(result.opaque > 0.1, "The actual model must be visible");
        assert(result.transparent > 0.1, "No opaque rectangle around the rig");
        assert(
          result.zero.color < 1,
          "Zero strength preserves original colors"
        );
        assert(
          result.on.color > 5,
          "Default light must visibly affect model pixels"
        );
        assert.equal(
          result.on.alpha,
          0,
          "Lighting preserves the model silhouette"
        );
        assert(
          result.full.color > result.on.color,
          "Strength changes actual output"
        );
        assert(
          result.weather.color > 2,
          "Time/weather updates reach the shader"
        );
        assert.equal(
          result.off.color,
          0,
          "Disabling light restores original colors"
        );
        fs.writeFileSync(
          `${out}/${id}-model-${dpr}x.png`,
          Buffer.from(onImage.split(",")[1], "base64")
        );
        await page.locator("#live2d-widget").scrollIntoViewIfNeeded();
        await page.screenshot({ path: `${out}/${id}-${dpr}x.png` });
        await page.evaluate(() => window.cameraTestApp.start());
      }
      assert.equal(themeStyles.size, 3, "Each character gets a distinct visible atmosphere");
      if (dpr === 1) {
        const widget = page.locator("#live2d-widget");
        const renderer = await page.evaluateHandle(() => cameraTestApp.renderer);
        const activity = await page.evaluate(() => cameraTestApp.ticker.count);
        await widget.locator('[data-vn-open="settings"]').click();
        await expectMotion(page, false);
        assert(await page.evaluate(active => cameraTestApp.ticker.count < active, activity),
          "An inactive camera removes its ticker listener");
        await page.keyboard.press("Escape");
        await expectMotion(page, true);
        await widget.locator('[data-companion-minimize]').click();
        await expectMotion(page, false);
        await widget.locator('[data-companion-minimize]').click();
        await expectMotion(page, true);
        await widget.locator('[data-vn-open="settings"]').click();
        await widget.locator('[data-vn-lighting]').uncheck();
        await page.keyboard.press("Escape");
        await expectMotion(page, false);
        await widget.locator('[data-vn-open="settings"]').click();
        await widget.locator('[data-vn-lighting]').check();
        await page.keyboard.press("Escape");
        await expectMotion(page, true);
        await widget.locator('[data-vn-open="settings"]').click();
        await widget.locator("[data-vn-light-strength]").fill("0");
        await page.keyboard.press("Escape");
        await expectMotion(page, false);
        await widget.locator('[data-vn-open="settings"]').click();
        await widget.locator("[data-vn-light-strength]").fill("75");
        await page.keyboard.press("Escape");
        await expectMotion(page, true);
        await widget.locator('[data-danmaku-open]').click();
        await expectMotion(page, false);
        await widget.locator('[data-danmaku-exit]').click();
        await expectMotion(page, true);
        await page.emulateMedia({ reducedMotion: "reduce" });
        await expectMotion(page, false);
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await expectMotion(page, true);
        assert(await renderer.evaluate(r => r === cameraTestApp.renderer), "Suspending photography keeps the renderer");
        await renderer.dispose();
        const churn = await page.evaluate(async () => {
          const gl = cameraTestApp.renderer.gl, renderer = cameraTestApp.renderer;
          const calls = { reallocations: 0, uploads: 0 };
          const originals = [[renderer, "resize", "reallocations"], [gl, "texImage2D", "uploads"],
            [gl, "texSubImage2D", "uploads"]].map(([object, key, counter]) => {
            const original = object[key];
            object[key] = function (...args) { calls[counter]++; return original.apply(this, args); };
            return () => { object[key] = original; };
          });
          try {
            for (let i = 0; i < 16; i++) await new Promise(requestAnimationFrame);
            return calls;
          } finally { originals.forEach(restore => restore()); }
        });
        assert.deepEqual(churn, { reallocations: 0, uploads: 0 }, "Steady photography reuses its render targets and textures");
        // On a phone the embedded home stage scrolls completely outside the viewport.
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => scrollTo({ top: 0, behavior: "instant" }));
        await page.waitForFunction(() => document.querySelector("[data-companion-stage]").getBoundingClientRect().top > innerHeight);
        await expectMotion(page, false);
        const phoneStage = widget.locator("[data-companion-stage]");
        await phoneStage.scrollIntoViewIfNeeded();
        await expectMotion(page, true);
        await checkRoomPlates(phoneStage);
        await page.setViewportSize({ width: 1440, height: 1000 });
      }
      await page.locator('[data-vn-open="settings"]').click();
      await page.locator("[data-vn-light-strength]").fill("42");
      await page.reload();
      await page.locator('[data-vn-open="settings"]').click();
      assert.equal(
        await page.locator("[data-vn-light-strength]").inputValue(),
        "42"
      );
      await page.locator("[data-vn-lighting]").uncheck();
      assert(await page.locator("[data-vn-light-strength]").isDisabled());
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(
      "PASS: three full-resolution aperture sets registered to the source paintings, three particle themes, four lit edges, alpha-safe lighting, DPR 1/2, camera suspension/resumption, 16 stable frames without reallocations or texture uploads, weather and preference persistence."
    );
  } finally {
    await browser.close();
  }
})();
