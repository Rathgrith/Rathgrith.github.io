const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 960, height: 660 },
    });
    await page.route(base + "boss-art-test", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: '<!doctype html><body style="margin:0;background:#111827"><canvas id="art" width="960" height="660"></canvas><script src="/assets/js/games/danmaku-boss-sprites.js"></script>',
      })
    );
    await page.goto(base + "boss-art-test");
    const results = await page.evaluate(async () => {
      await DanmakuBossSprites.load();
      const output = document.querySelector("canvas").getContext("2d");
      output.imageSmoothingEnabled = false;
      const c = document.createElement("canvas");
      c.width = c.height = 64;
      const ctx = c.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      const results = [];
      for (const [row, id] of ["alice", "marisa", "patchouli"].entries()) {
        const frames = [];
        for (let i = 0; i < 8; i++) {
          ctx.clearRect(0, 0, 64, 64);
          if (
            !DanmakuBossSprites.draw(
              ctx,
              id,
              32,
              32,
              i < 4 ? i / 6 : 0,
              i >= 4 ? [0, 0.26, 0.52, 0.95][i - 4] : -1,
              false,
              48
            )
          )
            throw Error("missing " + id);
          frames.push(c.toDataURL());
          output.drawImage(c, 0, 0, 64, 64, i * 120, row * 220 + 38, 120, 120);
        }
        output.font = "14px monospace";
        output.fillStyle = "#e2e8f0";
        output.fillText(
          id.toUpperCase() + " / IDLE → CAST",
          20,
          row * 220 + 22
        );
        results.push({ id, unique: new Set(frames).size });
      }
      const boss = { x: 120, y: 54 },
        emitter = { x: 194, y: 95 };
      const start = DanmakuBossSprites.deploy(boss, emitter, 0, 4, false),
        end = DanmakuBossSprites.deploy(boss, emitter, 2, 4, false);
      if (start.x !== boss.x || start.y !== boss.y || start.opacity !== 0)
        throw Error("deployment must begin at boss");
      if (end.x !== emitter.x || end.y !== emitter.y || end.opacity !== 1)
        throw Error("deployed emitter must match bullet origin");
      const still = DanmakuBossSprites.deploy(boss, emitter, 0, 4, true);
      if (still.x !== emitter.x || still.y !== emitter.y)
        throw Error("reduced motion skips deployment");
      const recurring = {
        x: 39,
        y: 42,
        deployed: true,
        opacity: 0.4,
        scale: 0.8,
      };
      for (const reduced of [false, true]) {
        const pose = DanmakuBossSprites.deploy(boss, recurring, 18, 9, reduced);
        if (
          pose.x !== recurring.x ||
          pose.y !== recurring.y ||
          pose.opacity !== 0.4 ||
          pose.scale !== 0.8 ||
          pose.progress !== 1
        )
          throw Error("a recurring source must keep its actual firing pose");
      }
      if (
        DanmakuBossSprites.deploy(
          boss,
          { ...recurring, opacity: 0 },
          18,
          9,
          false
        ).opacity !== 0
      )
        throw Error("zero-opacity retirement must not reveal a stale source");
      return results;
    });
    results.forEach((r) => assert(r.unique >= 7, JSON.stringify(r)));
    fs.mkdirSync("/private/tmp/playground-design", { recursive: true });
    await page.screenshot({
      path: "/private/tmp/playground-design/boss-animation-frames.png",
    });
    console.log(
      "PASS: three transparent registered atlases, animated idle/casting frames, emitter deployment endpoints and reduced motion",
      results
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
