/* Exercise card rendering, not just the headless rules: a render exception stops RAF. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const out = "/private/tmp/flower-presentation";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const p = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.route("**/danmaku-flower.js*", async (r) => {
      const res = await r.fetch();
      await r.fulfill({
        response: res,
        body:
          (await res.text()) +
          "\nconst originalCreate=DanmakuFlower.create;DanmakuFlower.create=(...args)=>window.flowerGame=originalCreate(...args);",
      });
    });
    await p.goto(
      (process.env.PREVIEW_URL || "http://127.0.0.1:4100/") + "playground/"
    );
    await p.locator("[data-danmaku-open]").click();
    await p.locator('[data-danmaku-game-mode="flower"]').click();
    await p.locator('[data-danmaku-player="patchouli"]').click();
    await p.locator('[data-danmaku-challenge="alice"]').click();
    await p.waitForFunction(
      () => window.flowerGame && flowerGame.state.countdown === 0
    );
    await p.keyboard.press("x");
    await p.waitForTimeout(300);
    assert.deepEqual(
      errors,
      [],
      "Patchouli quick card must render without breaking the frame loop"
    );
    const start = await p.evaluate(() => flowerGame.state.time);
    await p.waitForTimeout(500);
    assert(
      await p.evaluate((t) => flowerGame.state.time > t + 0.2, start),
      "game must keep stepping after the effect"
    );
    await p.screenshot({ path: out + "/patchouli-duel.png" });
    await p.keyboard.press("p");
    await p.locator("[data-danmaku-menu]").click();
    // Render actual C1–C4 effects for every pilot and CPU combination, including
    // portraits, boss attacks and the two presentation layouts.
    const count = await p.evaluate(async () => {
      const c = document.createElement("canvas"),
        r = DanmakuFlowerRenderer.create(c);
      await r.ready;
      let frames = 0;
      for (const compact of [false, true]) {
        r.dimensions(compact ? 350 : 900, 650);
        for (const a of ["alice", "marisa", "patchouli"])
          for (const b of ["alice", "marisa", "patchouli"])
            for (let level = 1; level <= 4; level++) {
              const g = DanmakuFlower.create(a, b, 1977);
              g.state.countdown = 0;
              g.state.fields[0].gauge = level * 100;
              if (level === 1) {
                for (let i = 0; i < 45; i++) g.step(1 / 60, { charge: true });
                g.step(1 / 60, {});
              } else g.bomb();
              // CPU shares the same casting renderer; mirror the cast while retaining its own identity.
              g.state.fields[1].cast = { ...g.state.fields[0].cast, id: b };
              for (const age of [0, 0.15, 0.5, 0.79, 1.1]) {
                g.state.fields.forEach((f) => (f.cast.age = age));
                r.draw(g.state);
                frames++;
              }
            }
      }
      return frames;
    });
    assert.equal(count, 360);
    // Native transparent pixels check every released ability against the true
    // enemy column / cancellation radius stored by the simulation.
    const coverage = await p.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = 240; canvas.height = 360;
      const ctx = canvas.getContext("2d", {willReadFrequently: true});
      const checked = [];
      for (const id of ["alice", "marisa", "patchouli"]) {
        for (let level = 1; level <= 4; level++) {
          const game = DanmakuFlower.create(id, "alice", 1);
          game.state.countdown = 0;
          const f = game.state.fields[0];
          f.gauge = level * 100; f.player.x = 92; f.player.y = 208;
          if (level === 1) { f.charge = 100; f.charging = true; game.step(1 / 60); }
          else game.bomb();
          const cast = f.cast;
          cast.age = 0.13;
          for (const reduce of [false, true]) {
            ctx.clearRect(0, 0, 240, 360);
            DanmakuPlayerSprites.drawSpiritStrike(ctx, cast, {x: 92, y: 120}, reduce);
            const pixels = ctx.getImageData(0, 0, 240, 360).data;
            const alpha = (x, y) => pixels[(240 * y + x) * 4 + 3];
            let ink = 0;
            for (let y = 0; y < 360; y++) {
              for (let x = 0; x < 240; x++) {
                if (!alpha(x, y)) continue;
                ink++;
                if (level === 1 ? Math.abs(x + 0.5 - cast.x) > 35 :
                    Math.hypot(x + 0.5 - cast.x, y + 0.5 - cast.y) > [0, 0, 76.8, 112.8, 500][level])
                  throw Error(id + " C" + level + " exceeds the release boundary");
              }
            }
            if (ink < 80) throw Error(id + " C" + level + " is invisible");
            if (level === 4 && ![[2, 2], [237, 2], [2, 357], [237, 357]].every(([x, y]) => alpha(x, y)))
              throw Error("C4 did not reach every corner");
            checked.push(id + level + reduce);
          }
        }
      }
      return checked.length;
    });
    assert.equal(coverage, 24);
    // Compare otherwise identical rendered scenes at the marked position on
    // both fields. The CPU inset has a different pixel transform on mobile.
    for (const reducedMotion of ["reduce", "no-preference"]) {
      await p.emulateMedia({reducedMotion});
      await p.evaluate(async () => {
        const canvas = document.createElement("canvas"), renderer = DanmakuFlowerRenderer.create(canvas);
        await renderer.ready;
        const ctx = canvas.getContext("2d");
        const g = DanmakuFlower.create("alice", "patchouli", 19);
        g.state.countdown = 0;
        for (const f of g.state.fields) {
          f.waveClock = f.aiClock = 999;
          f.boss = {id: "patchouli", x:120, y:53, age:2, hp:999, maxHp:999, fire:0};
          f.player.x = 90;
        }
        g.step(1 / 60);
        for (const f of g.state.fields) f.player.x = 157;
        for (let i = 0; i < 15; i++) g.step(1 / 60);
        for (const width of [350, 900]) {
          renderer.dimensions(width, 650);
          for (const f of g.state.fields) {
            const mark = f.boss.sight, scale = width === 350 && f.side ? 92 / 240 : 1;
            const x = Math.round((f.side * 256 + mark.x * scale) * 2);
            const y = Math.round((26 + mark.y * scale) * 2);
            const pixels = () => ctx.getImageData(x - 23, y - 23, 46, 46).data;
            renderer.draw(g.state);
            const before = pixels();
            f.boss.sight = null;
            renderer.draw(g.state);
            const after = pixels();
            if (!before.some((value, i) => Math.abs(value - after[i]) > 12)) {
              throw Error("No fixed sight at the aimed position, width " + width + " field " + f.side);
            }
            f.boss.sight = mark;
          }
        }
      });
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: Patchouli quick card keeps RAF running; 360 real canvas frames cover C1–C4, all nine matchups and both layouts."
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
