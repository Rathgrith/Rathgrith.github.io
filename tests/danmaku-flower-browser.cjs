const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out = process.env.QA_OUTPUT || "/private/tmp/dbu-danmaku/flower-browser";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const [width, height] of [
      [1440, 1000],
      [768, 1000],
      [375, 812],
      [320, 740],
      [600, 360],
    ].filter(
      (s) =>
        !process.env.FLOWER_QA_WIDTH ||
        s[0] === Number(process.env.FLOWER_QA_WIDTH)
    )) {
      const p = await browser.newPage({ viewport: { width, height } }),
        errors = [];
      p.on("pageerror", (e) => errors.push(e.message));
      await p.addInitScript(() => {
        window.flowerFocus = [];
        for (const name of ["blur", "resize", "focusout", "pointercancel"])
          window.addEventListener(
            name,
            (e) => {
              flowerFocus.push({
                type: name,
                target: e.target?.outerHTML?.slice(0, 180),
                next: e.relatedTarget?.outerHTML?.slice(0, 180),
              });
              if (flowerFocus.length > 15) flowerFocus.shift();
            },
            true
          );
      });
      await p.route("**/danmaku-flower.js*", async (r) => {
        const res = await r.fetch();
        await r.fulfill({
          response: res,
          body:
            (await res.text()) +
            "\nconst flowerCreate=DanmakuFlower.create;DanmakuFlower.create=(...args)=>window.flowerGame=flowerCreate(...args);",
        });
      });
      await p.goto(base);
      await p.locator("[data-danmaku-open]").click();
      if (width >= 768) await p.locator("[data-companion-maximize]").click();
      await p.locator('[data-danmaku-game-mode="flower"]').click();
      await p.locator('[data-danmaku-challenge="marisa"]').click();
      await p.waitForFunction(() => window.flowerGame);
      await p.evaluate(() => {
        flowerGame.state.countdown = 0;
        flowerGame.state.fields.forEach((f) => (f.player.invulnerable = 1000));
      });
      // Exercise real keyboard charge/release and fast card, not a mocked UI handler.
      await p.keyboard.down("z");
      await p.waitForTimeout(1480);
      await p.keyboard.up("z");
      await p.waitForTimeout(150);
      assert(
        await p.evaluate(() => flowerGame.state.fields[0].cards >= 1),
        "Z releases a charged card"
      );
      await p.evaluate(() => {
        flowerGame.state.fields[0].gauge = 300;
        flowerGame.state.fields[0].cooldown = 0;
      });
      await p.keyboard.press("x");
      assert(
        await p.evaluate(() => flowerGame.state.fields[0].gauge < 2),
        "X spends the meter"
      );
      await p.evaluate(() => {
        flowerGame.state.fields[0].gauge = 200;
        flowerGame.state.fields[0].cooldown = 0;
      });
      const charge = await p.locator("[data-flower-charge]").boundingBox();
      await p.mouse.move(
        charge.x + charge.width / 2,
        charge.y + charge.height / 2
      );
      await p.mouse.down();
      await p.waitForTimeout(1500);
      await p.mouse.move(charge.x + charge.width + 10, charge.y - 30);
      await p.mouse.up();
      await p.waitForFunction(
        () => !flowerGame.state.fields[0].charging,
        {},
        { timeout: 1000 }
      );
      assert(
        await p.evaluate(() => flowerGame.state.phase === "playing"),
        "captured touch charge releases outside the button without pausing: " +
          JSON.stringify(await p.evaluate(() => flowerFocus))
      );
      await p.keyboard.press("t");
      assert(
        await p.evaluate(
          () => flowerGame.state.auto && flowerGame.state.assisted
        )
      );
      await p.keyboard.press("ArrowLeft");
      assert(
        await p.evaluate(
          () => !flowerGame.state.auto && flowerGame.state.assisted
        )
      );
      // Run production simulation into a populated duel, with bounded tests for input after resize.
      await p.keyboard.press("t");
      await p.evaluate(() => {
        for (let i = 0; i < 30 * 60; i++) flowerGame.step(1 / 60);
      });
      await p.waitForTimeout(200);
      const fit = await p.evaluate(() => {
        const canvas = document.querySelector("[data-danmaku-canvas]"),
          wrap = document.querySelector("[data-danmaku-canvas-wrap]"),
          view = document.querySelector(".vn-danmaku-view"),
          controls = document.querySelector(".danmaku-controls");
        const c = canvas.getBoundingClientRect(),
          w = wrap.getBoundingClientRect(),
          v = view.getBoundingClientRect(),
          b = controls.getBoundingClientRect();
        return {
          canvas: { w: c.width, h: c.height },
          fit:
            c.left >= w.left - 1 &&
            c.right <= w.right + 1 &&
            c.bottom <= w.bottom + 1 &&
            b.bottom <= v.bottom + 1,
          overflow: view.scrollHeight > view.clientHeight + 1,
          internal: canvas.width,
          phase: flowerGame.state.phase,
        };
      });
      assert(fit.fit && !fit.overflow, JSON.stringify({ width, height, fit }));
      assert.equal(fit.phase, "playing");
      assert(
        fit.canvas.h > 150,
        "landscape must retain a playable arena, not merely avoid overflow"
      );
      await p
        .locator("#live2d-widget")
        .screenshot({ path: out + `/flower-${width}x${height}.png` });
      await p.keyboard.press("ArrowLeft");
      await p.evaluate(() => {
        flowerGame.state.player.x = 120;
        flowerGame.state.player.y = 300;
      });
      const canvasBox = await p.locator("[data-danmaku-canvas]").boundingBox(),
        logicalWidth = fit.internal / 2;
      const px = canvasBox.x + (canvasBox.width * 120) / logicalWidth,
        py = canvasBox.y + (canvasBox.height * 326) / 412;
      await p.mouse.move(px, py);
      await p.mouse.down();
      await p.mouse.move(px + 25, py - 10, { steps: 8 });
      await p.waitForTimeout(150);
      await p.mouse.up();
      assert(
        await p.evaluate(() => flowerGame.state.player.x > 135),
        "drag coordinates follow the player field in wide and compact layouts"
      );
      await p.keyboard.press("t");
      await p.mouse.click(
        canvasBox.x + (canvasBox.width * (logicalWidth - 30)) / logicalWidth,
        canvasBox.y + canvasBox.height * 0.25
      );
      assert(
        await p.evaluate(() => flowerGame.state.auto),
        "clicking the CPU preview must not seize player control"
      );
      await p.keyboard.press("p");
      const frozen = await p.evaluate(() => flowerGame.state.time);
      await p.waitForTimeout(150);
      assert.equal(await p.evaluate(() => flowerGame.state.time), frozen);
      await p.locator("[data-danmaku-resume]").click();
      if (width === 1440) {
        await p.evaluate(() => {
          flowerGame.state.countdown = 0;
        });
        await p.locator("[data-danmaku-music]").click();
        await p.waitForFunction(() => {
          const a = document.querySelector("[data-danmaku-audio]");
          return a && !a.paused && a.currentTime > 0;
        });
        await p.locator("[data-danmaku-music]").click();
        assert(
          await p.locator("[data-danmaku-audio]").evaluate((a) => a.paused),
          "flower music stops immediately when muted"
        );
      }
      // Force only the final hit; results still come through real collision and round resolution.
      await p.evaluate(() => {
        const s = flowerGame.state;
        s.countdown = 0;
        s.fields[0].player.invulnerable = 999;
        const f = s.fields[1];
        f.health = 1;
        f.player.invulnerable = 0;
        f.aiClock = 99;
        f.aiInput = {};
        f.charging = false;
        f.charge = 0;
        f.enemies = [];
        f.shots = [];
        f.bullets = [
          {
            x: f.player.x,
            y: f.player.y,
            vx: 0,
            vy: 0,
            radius: 3,
            age: 0,
            hard: true,
          },
        ];
        flowerGame.step(1 / 60);
        s.intermission.age = 2;
      });
      await p
        .locator("[data-danmaku-round-next]")
        .waitFor({ state: "visible" });
      await p
        .locator("#live2d-widget")
        .screenshot({ path: out + `/round-${width}x${height}.png` });
      await p.locator("[data-danmaku-round-next]").click();
      assert(await p.evaluate(() => flowerGame.state.round === 2));
      await p.keyboard.press("p");
      await p.locator("[data-danmaku-menu]").click();
      assert(
        await p.evaluate(() =>
          Object.keys(
            JSON.parse(localStorage.getItem("site-danmaku-records-v3"))
          ).some((k) => k.startsWith("flower:") && k.endsWith(":auto"))
        ),
        "flower assistance records have their own namespace"
      );
      await p.locator('[data-danmaku-game-mode="score"]').click();
      await p.locator('[data-danmaku-challenge="alice"]').click();
      assert.equal(
        await p.locator("[data-danmaku-canvas]").getAttribute("width"),
        "480",
        "single-field renderer restores its backing size"
      );
      assert(await p.locator(".danmaku-hud").isVisible());
      assert(!(await p.locator(".flower-hud").isVisible()));
      await p.locator("[data-danmaku-pause]").click();
      await p.locator("[data-danmaku-menu]").click();
      await p.locator('[data-danmaku-game-mode="flower"]').click();
      await p.locator('[data-danmaku-challenge="patchouli"]').click();
      assert.equal(await p.locator(".flower-hud").isVisible(), height > 500);
      assert.equal(
        await p.locator("[data-danmaku-music]").getAttribute("aria-pressed"),
        "false"
      );
      assert.equal(
        await p.locator("[data-danmaku-sfx]").getAttribute("aria-pressed"),
        "false"
      );
      assert.deepEqual(errors, []);
      console.log("PASS:", width, height, fit);
      await p.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
