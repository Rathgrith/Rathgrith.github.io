const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const out =
  process.env.QA_OUTPUT || require("node:os").tmpdir() + "/danmaku-qa";
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-gpu"],
  });
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [],
      bad = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("response", (r) => {
      if (r.url().startsWith(base) && r.status() >= 400) bad.push(r.url());
    });
    await page.route("**/danmaku-engine.js*", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          "\nconst createForQA = DanmakuEngine.create; DanmakuEngine.create = function(...args) { return window.gameForQA = createForQA(...args); };",
      });
    });
    await page.route("**/companion-lighting.js*", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          "\nconst lightForQA = CompanionLighting.create; CompanionLighting.create = function(app,widget) { window.modelAppForQA=app; return lightForQA(app,widget); };",
      });
    });
    await page.goto(base);
    await page.waitForFunction(
      () =>
        document.querySelector("#live2d-widget")?.dataset.dialogueState ===
        "typing",
      null,
      { timeout: 45000 }
    );
    await page.locator("[data-danmaku-open]").click();
    assert(await page.locator("[data-danmaku-lobby]").isVisible());
    assert.equal(await page.locator(".vn-main-view").isVisible(), false);
    assert.equal(
      await page.evaluate(() => modelAppForQA.ticker.started),
      false
    );
    await page
      .locator("#live2d-widget")
      .screenshot({ path: out + "/lobby.png" });
    const pausedDialogue = await page
      .locator("[data-live2d-dialogue-text]")
      .textContent();
    const pairs = [
      ["alice", "marisa"],
      ["marisa", "patchouli"],
      ["patchouli", "alice"],
    ];
    for (const [player, enemy] of pairs) {
      await page.locator(`[data-danmaku-player="${player}"]`).click();
      await page.locator(`[data-danmaku-challenge="${enemy}"]`).click();
      await page.waitForFunction(() => gameForQA.state.phase === "playing");
      await page.evaluate(() => {
        gameForQA.state.countdown = 0;
        gameForQA.state.player.invulnerable = 999;
      });
      const x = await page.evaluate(() => gameForQA.state.player.x);
      await page.keyboard.down("ArrowLeft");
      await page.waitForTimeout(200);
      await page.keyboard.up("ArrowLeft");
      assert((await page.evaluate(() => gameForQA.state.player.x)) < x - 10);
      await page.evaluate(() => {
        gameForQA.state.time = 55;
        for (let i = 0; i < 180; i++) gameForQA.step(1 / 60);
      });
      await page.waitForTimeout(180);
      assert(
        Number(await page.locator("[data-danmaku-score]").textContent()) > 50
      );
      const pixels = await page
        .locator("[data-danmaku-canvas]")
        .evaluate((c) => {
          const a = c
            .getContext("2d")
            .getImageData(0, 0, c.width, c.height).data;
          let light = 0;
          for (let i = 0; i < a.length; i += 4)
            if (a[i] + a[i + 1] + a[i + 2] > 430) light++;
          return light;
        });
      assert(pixels > 600, "Real sprites and bullets must render");
      await page
        .locator("#live2d-widget")
        .screenshot({ path: out + `/${player}-vs-${enemy}.png` });
      await page.keyboard.press("x");
      assert.equal(await page.evaluate(() => gameForQA.state.bombs), 1);
      await page.keyboard.press("p");
      const t = await page.evaluate(() => gameForQA.state.time);
      await page.waitForTimeout(150);
      assert.equal(await page.evaluate(() => gameForQA.state.time), t);
      await page.locator("[data-danmaku-resume]").click();
      assert((await page.evaluate(() => gameForQA.state.countdown)) > 0);
      // A final hit must enter the score screen and save exactly this matchup.
      await page.evaluate(() => {
        const s = gameForQA.state;
        s.countdown = 0;
        s.lives = 1;
        s.player.invulnerable = 0;
        s.bullets.push({
          x: s.player.x,
          y: s.player.y,
          vx: 0,
          vy: 0,
          radius: 3,
          shape: "orb",
          color: "#fff",
        });
      });
      await page.waitForFunction(
        () =>
          document.querySelector("#live2d-widget").dataset.danmakuState ===
          "over"
      );
      assert(await page.locator("[data-danmaku-retry]").isVisible());
      assert(
        (await page.evaluate(
          (key) =>
            JSON.parse(localStorage.getItem("site-danmaku-records-v1"))[key],
          player + ":" + enemy
        )) > 50
      );
      await page.locator("[data-danmaku-retry]").click();
      assert.equal(await page.evaluate(() => gameForQA.state.lives), 3);
      await page.keyboard.press("p");
      await page.locator("[data-danmaku-menu]").click();
    }
    await page.locator('[data-danmaku-challenge="patchouli"]').click();
    assert.equal(
      await page.locator("[data-live2d-dialogue-text]").textContent(),
      pausedDialogue,
      "The typewriter pauses during battle"
    );
    await page.locator("[data-companion-minimize]").click();
    assert.equal(await page.evaluate(() => gameForQA.state.phase), "paused");
    await page.locator("[data-companion-minimize]").click();
    assert(await page.locator("[data-danmaku-resume]").isVisible());
    await page.locator("[data-danmaku-resume]").click();
    await page.locator('[data-classic-page="gallery"]').click();
    await page.waitForURL("**/gallery/");
    assert.equal(await page.evaluate(() => gameForQA.state.phase), "paused");
    assert.equal(await page.locator("[data-danmaku-canvas]").count(), 1);
    await page.locator('[data-classic-page="home"]').click();
    await page.waitForURL(base);
    for (const width of [320, 375, 600, 999, 1000, 1280, 1920]) {
      await page.setViewportSize({ width, height: 900 });
      await page.waitForTimeout(180);
      if (!(await page.locator("#live2d-widget").isVisible())) {
        await page.locator("[data-site-options-trigger]").click();
        await page.locator("[data-live2d-toggle]").click();
        await page.keyboard.press("Escape");
      }
      await page.locator("#live2d-widget").scrollIntoViewIfNeeded();
      const g = await page.evaluate(() => {
        const rect = (s) => document.querySelector(s).getBoundingClientRect(),
          w = rect("#live2d-widget"),
          c = rect("[data-danmaku-canvas]"),
          ctrl = rect("[data-danmaku-controls]");
        return {
          overflow: document.documentElement.scrollWidth > innerWidth,
          inside:
            c.left >= w.left &&
            c.right <= w.right &&
            ctrl.bottom <= w.bottom + 1,
          ratio: c.width / c.height,
          height: c.height,
          hud:
            document.querySelector(".danmaku-hud").scrollWidth <=
            document.querySelector(".danmaku-hud").clientWidth,
        };
      });
      assert(
        !g.overflow &&
          g.inside &&
          g.hud &&
          Math.abs(g.ratio - 2 / 3) < 0.01 &&
          g.height > 240,
        JSON.stringify({ width, ...g })
      );
      if (width === 375)
        await page
          .locator("#live2d-widget")
          .screenshot({ path: out + "/mobile-paused.png" });
    }
    await page.setViewportSize({ width: 600, height: 360 });
    await page.waitForTimeout(180);
    assert(
      (await page.locator(".vn-danmaku-view").boundingBox()).height <= 285
    );
    await page.locator("[data-danmaku-exit]").click();
    assert(await page.locator(".vn-main-view").isVisible());
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(() => modelAppForQA.ticker.started), true);
    await page.reload();
    await page.locator("[data-danmaku-open]").click();
    await page.locator('[data-danmaku-player="alice"]').click();
    assert(
      Number(
        (
          await page.locator('[data-danmaku-record="marisa"]').textContent()
        ).replace(/\D/g, "")
      ) > 50
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(bad, []);
    await page.close();
    // The game works with blocked model CDN and localStorage, including real touch input.
    const mobile = await browser.newPage({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
      reducedMotion: "reduce",
    });
    mobile.on("pageerror", (e) => errors.push(e.message));
    await mobile.addInitScript(() =>
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      })
    );
    await mobile.route("**/live2dcubismcore.min.js", (r) => r.abort());
    await mobile.route("**/danmaku-engine.js*", async (route) => {
      const response = await route.fetch();
      await route.fulfill({
        response,
        body:
          (await response.text()) +
          "\nconst touchCreate = DanmakuEngine.create; DanmakuEngine.create = function(...args) { return window.touchGame = touchCreate(...args); };",
      });
    });
    await mobile.goto(base);
    await mobile.locator("[data-site-options-trigger]").click();
    await mobile.locator("[data-live2d-toggle]").click();
    await mobile.keyboard.press("Escape");
    await mobile.locator("[data-danmaku-open]").click();
    await mobile.locator('[data-danmaku-player="marisa"]').click();
    await mobile.locator('[data-danmaku-challenge="alice"]').click();
    const box = await mobile.locator("[data-danmaku-canvas]").boundingBox();
    const cdp = await mobile.context().newCDPSession(mobile);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [
        { x: box.x + box.width * 0.5, y: box.y + box.height * 0.8 },
      ],
    });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: box.x + box.width * 0.75, y: box.y + box.height * 0.7 },
      ],
    });
    await mobile.waitForTimeout(300);
    const moved = await mobile.evaluate(() => ({
      x: touchGame.state.player.x,
      y: touchGame.state.player.y,
    }));
    assert(
      moved.x > 160 && moved.y < 290,
      "A real touch drag moves the pilot without teleporting to the initial contact"
    );
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchEnd",
      touchPoints: [],
    });
    await mobile.waitForTimeout(1500);
    assert(
      Number(await mobile.locator("[data-danmaku-score]").textContent()) > 0
    );
    await mobile
      .locator("#live2d-widget")
      .screenshot({ path: out + "/mobile-touch.png" });
    await mobile.locator("[data-danmaku-pause]").click();
    assert(await mobile.locator("[data-danmaku-resume]").isVisible());
    assert.deepEqual(errors, []);
    console.log(
      "PASS: three live matchups, keyboard/touch, pixels, pause/retry/results, records/reload, minimize/navigation, seven widths, short landscape, blocked storage/CDN, and L2D resume"
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
