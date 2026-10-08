// Verify real WebGL output: a compiled shader, a visible rig and alpha-safe light.
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const out =
  process.env.QA_OUTPUT || require("node:os").tmpdir() + "/lighting-qa";
fs.mkdirSync(out, { recursive: true });

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
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (e) => {
        if (/shader|gl\.getProgramInfoLog|Geometry attribute/i.test(e.text()))
          errors.push(e.text());
      });
      // Capture the renderer in the test only, without exposing production internals.
      await page.route("**/companion-lighting.js*", async (route) => {
        const response = await route.fetch();
        await route.fulfill({
          response,
          body:
            (await response.text()) +
            `
            const originalLightingCreate = CompanionLighting.create;
            CompanionLighting.create = function(app, widget) {
              window.lightingTestApp = app;
              return originalLightingCreate(app, widget);
            };`,
        });
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
              window.lightingTestApp?.stage.children.length
            );
          },
          id,
          { timeout: 45000 }
        );
        // Loading resolves before the first GPU texture upload / model update.
        await page.waitForFunction(() => {
          const app = window.lightingTestApp;
          return app.stage.children[0].glContextID === app.renderer.CONTEXT_UID;
        });
        const result = await page.evaluate(() => {
          const app = window.lightingTestApp;
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
        await page.evaluate(() => window.lightingTestApp.start());
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
      "Lighting: all three rendered models, DPR 1/2, alpha, strength, weather and persistence passed."
    );
  } finally {
    await browser.close();
  }
})();
