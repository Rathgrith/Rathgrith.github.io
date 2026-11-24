const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out =
  process.env.QA_OUTPUT || require("node:os").tmpdir() + "/loading-qa";
fs.mkdirSync(out, { recursive: true });
async function pauseClock(page) {
  const start = new Date("2026-01-01T12:00:00Z");
  await page.clock.install({ time: start });
  await page.clock.pauseAt(new Date(start.getTime() + 1000));
}
async function checkChimeOrder(art, character) {
  const row = await art.locator(".prayer-loader__chime[data-chime]").evaluateAll(chimes =>
    chimes.map(chime => {
      const box = chime.getBoundingClientRect();
      const motif = chime.querySelector(".prayer-loader__motif");
      const drawing = Array.from(motif.querySelectorAll("path"), path => path.getAttribute("d")).join(" ");
      return { character: chime.dataset.chime, x: box.left + box.width / 2,
        motifWidth: motif.getBoundingClientRect().width, drawing };
    }).sort((a, b) => a.x - b.x));
  assert.deepEqual(row.map(chime => chime.character).sort(), ["alice", "marisa", "patchouli"]);
  assert(row.every(chime => chime.drawing && chime.motifWidth > 0), "all three character motifs are visible");
  assert.equal(new Set(row.map(chime => chime.drawing)).size, 3, "each motif has distinct pixel geometry");
  assert(row[0].x < row[1].x && row[1].x < row[2].x, "each bell has its own place");
  assert.equal(row[1].character, character, "the active character's bell is in the centre");
}

async function checkGraphic(host, reduced) {
  const art = host.locator(".prayer-loader svg");
  await checkChimeOrder(art, await host.evaluate(() => document.documentElement.dataset.live2dCharacter));
  const metrics = await host.evaluate(host => {
    const art = host.querySelector(".prayer-loader svg");
    const frame = host.getBoundingClientRect();
    const fits = element => {
      const box = element.getBoundingClientRect();
      return box.width > 0 && box.height > 0 &&
        box.left >= frame.left - 1 && box.right <= frame.right + 1 &&
        box.top >= frame.top - 1 && box.bottom <= frame.bottom + 1;
    };
    const localReferences = Array.from(art.querySelectorAll("*")).every(el =>
      Array.from(el.attributes).every(({ name, value }) => {
        const pattern = name === "href" ? /^#(.+)$/ : /^url\(["']?#([^)"']+)["']?\)$/;
        const match = value.match(pattern);
        return !match || art.contains(document.getElementById(match[1]));
      }));
    return {
      localReferences,
      fits: fits(art) && fits(host.querySelector("[data-prayer-label]")),
      motions: art.getAnimations({ subtree: true }).length,
      decorative: art.getAttribute("aria-hidden") === "true",
      crisp: getComputedStyle(art).shapeRendering.toLowerCase() === "crispedges",
      pixelScale: art.getBoundingClientRect().width * devicePixelRatio / art.viewBox.baseVal.width,
    };
  });
  assert(metrics.fits, "the bells and their label fit the loading surface");
  assert(metrics.crisp, "the pixel-art plate keeps hard pixel edges at its rendered size");
  assert(Math.abs(metrics.pixelScale - Math.round(metrics.pixelScale)) < .001,
    "each sprite pixel fills whole device pixels at the tested desktop and phone sizes");
  assert(metrics.localReferences, "each loader owns its SVG paint and shape references");
  assert(metrics.decorative, "assistive technology reads the loading label once");
  assert(reduced ? metrics.motions === 0 : metrics.motions > 0);

  async function captureFrame(phase) {
    await art.evaluate((el, phase) => {
      for (const motion of el.getAnimations({ subtree: true })) {
        motion.pause();
        motion.currentTime = phase * motion.effect.getTiming().duration;
      }
    }, phase);
    return (await art.screenshot()).toString("base64");
  }
  const frames = new Set();
  let heldPose = false;
  for (const phase of [0, .29, .57, .81]) {
    const frame = await captureFrame(phase);
    frames.add(frame);
    if (!heldPose) heldPose = frame === (await captureFrame(phase + .01));
  }
  assert(heldPose, "the sprite holds a pose between frame changes");
  assert(reduced ? frames.size === 1 : frames.size >= 3,
    "the chimes render distinct poses and a single reduced-motion frame");
}

async function checkFastModel(page) {
  // Use the same status notifications the model promise sends while the SDK request is held.
  const stage = page.locator("[data-companion-stage]");
  // Let initial layout and visibility notifications settle before simulating a completed request.
  await page.clock.runFor(150);
  await page.evaluate(() => {
    SiteCompanion.setReady("error");
    SiteCompanion.setReady("loading");
    SiteCompanion.setReady("ready");
  });
  await page.clock.runFor(1199);
  assert.equal(await stage.getAttribute("aria-busy"), "true", "a cached model still shows its chimes");
  await page.clock.runFor(32);
  assert.equal(await stage.getAttribute("aria-busy"), "false", "a ready model appears after the minimum");
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const errors = [];
  try {
    for (const options of [
      { width: 1440, height: 1000, reducedMotion: "no-preference" },
      { width: 390, height: 844, reducedMotion: "no-preference" },
      { width: 320, height: 740, reducedMotion: "reduce" },
    ]) {
      const page = await browser.newPage({
        viewport: { width: options.width, height: options.height },
        isMobile: options.width <= 390,
        hasTouch: options.width <= 390,
        deviceScaleFactor: options.width === 390 ? 2 : 1,
        reducedMotion: options.reducedMotion,
      });
      page.on("pageerror", (e) => errors.push(e.message));
      // Inspect the entrance at deterministic points within its actual 1.8s lifetime.
      await pauseClock(page);
      // Delay the local portrait indefinitely and hold the remote model loader.
      // The homepage must still dismiss independently by its bounded deadline.
      await page.route("**/images/avatars/alice-portrait.png", () => {});
      let failModel;
      const heldModel = new Promise(resolve => { failModel = resolve; });
      await page.route("**/live2dcubismcore.min.js", async route => {
        await heldModel;
        await route.abort();
      });
      await page.goto(base, { waitUntil: "domcontentloaded" });
      const overlay = page.locator("#home-loading-screen");
      assert(await overlay.isVisible(), "the entrance is shown on a fresh homepage load");
      await page.clock.runFor(20);
      assert.equal(
        await overlay.locator("[data-prayer-label]").textContent(),
        "少女祈祷中…"
      );
      const homeArt = overlay.locator(".prayer-loader svg");
      const palettes = new Set();
      for (const character of ["marisa", "patchouli", "alice"]) {
        await page.evaluate(id => document.documentElement.dataset.live2dCharacter = id, character);
        await checkChimeOrder(homeArt, character);
        const palette = await homeArt.evaluate(svg =>
          Array.from(svg.querySelectorAll("path, circle, ellipse, line, polygon, rect, stop, use"), el => {
            const style = getComputedStyle(el);
            return [style.fill, style.stroke, style.stopColor].join("/");
          }).join(" "));
        palettes.add(palette);
      }
      assert.equal(palettes.size, 3, "all three themes recolor the graphic");
      await checkGraphic(overlay, options.reducedMotion === "reduce");
      await overlay.screenshot({
        path: `${out}/homepage-prayer-${options.width}.png`,
      });
      await page.clock.runFor(1770);
      assert.equal(await page.locator("#main").getAttribute("aria-busy"), "true",
        "a pending portrait keeps the entrance until its deadline");
      await page.clock.runFor(230);
      await overlay.waitFor({ state: "detached", timeout: 1000 });
      assert.equal(
        await page.locator("#main").getAttribute("aria-busy"),
        "false"
      );
      const model = page.locator("#live2d-widget.is-loading .companion-load-status");
      await model.scrollIntoViewIfNeeded();
      await checkGraphic(model, options.reducedMotion === "reduce");
      assert.equal(await model.locator("[data-vn-load-label]").textContent(), "少女祈祷中…");
      await model.screenshot({ path: out + "/companion-prayer-" + options.width + ".png" });
      if (options.width === 390) await checkFastModel(page);
      failModel();
      const errorPanel = page.locator("#live2d-widget.has-live2d-error .companion-load-status");
      await errorPanel.waitFor();
      assert(await errorPanel.locator(".prayer-loader svg").isHidden());
      assert.equal(await errorPanel.locator("[data-vn-load-label]").textContent(), "接続できませんでした");
      assert(await errorPanel.locator("[data-vn-retry]").isVisible());

      // A direct Playground visit has no homepage SVG or its paint definitions.
      await page.unroute("**/live2dcubismcore.min.js");
      await page.route("**/live2dcubismcore.min.js", () => {});
      await page.goto(new URL("playground/", base).href, { waitUntil: "domcontentloaded" });
      await model.waitFor({ state: "visible" });
      assert.equal(await page.locator("#home-loading-screen").count(), 0);
      assert.equal(await model.locator("[data-vn-load-label]").textContent(), "少女祈祷中…");
      await checkGraphic(model, options.reducedMotion === "reduce");
      await model.screenshot({ path: out + "/playground-prayer-" + options.width + ".png" });
      if (options.width === 390) await checkFastModel(page);
      await page.close();
    }
    for (const readyAt of [0, 1450]) {
      const cached = await browser.newPage({ reducedMotion: "reduce" });
      await pauseClock(cached);
      await cached.addInitScript(() => {
        document.fonts.load = () => Promise.resolve([]);
        const decode = HTMLImageElement.prototype.decode;
        HTMLImageElement.prototype.decode = function () {
          if (this.closest(".author__avatar-link")) {
            return new Promise((resolve) => { window.releasePortrait = resolve; });
          }
          return decode.call(this);
        };
      });
      await cached.goto(base, { waitUntil: "domcontentloaded" });
      await cached.waitForFunction(() => typeof window.releasePortrait === "function");
      const overlay = cached.locator("#home-loading-screen");
      const busy = () => cached.locator("#main").getAttribute("aria-busy");
      await cached.clock.runFor(readyAt);
      assert(await overlay.isVisible());
      assert.equal(await busy(), "true");
      await cached.evaluate(() => window.releasePortrait());
      if (readyAt === 0) {
        await cached.clock.runFor(1199);
        assert.equal(await busy(), "true", "ready assets still show a full 1.2 seconds");
        await cached.clock.runFor(32); // Allow one initial rendered frame for the minimum timer.
      } else {
        await cached.clock.runFor(1);
      }
      assert.equal(await busy(), "false", "the entrance releases when both time and assets are ready");
      await cached.close();
    }
    const input = await browser.newPage();
    await input.route("**/images/avatars/alice-portrait.png", () => {});
    await input.goto(base, { waitUntil: "domcontentloaded" });
    await input.keyboard.press("Tab");
    await input
      .locator("#home-loading-screen")
      .waitFor({ state: "detached", timeout: 500 });
    assert(
      await input
        .locator(".classic-skip-link")
        .evaluate((el) => document.activeElement === el),
      "Dismissal must preserve keyboard input"
    );
    await input.close();
    const nojs = await browser.newPage({ javaScriptEnabled: false });
    await nojs.goto(base);
    assert.equal(await nojs.locator("#home-loading-screen").isVisible(), false);
    assert(await nojs.locator("#main").isVisible());
    await nojs.close();
    const fallback = await browser.newPage({ reducedMotion: "reduce" });
    await fallback.route("**/home-loading.js*", (r) => r.abort());
    await fallback.goto(base, { waitUntil: "domcontentloaded" });
    await fallback
      .locator("#home-loading-screen")
      .waitFor({ state: "hidden", timeout: 500 });
    assert.equal(
      await fallback
        .locator("#home-loading-screen")
        .evaluate((el) => getComputedStyle(el).pointerEvents),
      "none"
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: three pixel-art chimes, active character centring and palettes, held and changing sprite poses, static reduced motion, compact dock and standalone Playground, model error and retry, 1.2s homepage and model minimum, bounded entrance, keyboard dismissal and script-free fallback"
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
