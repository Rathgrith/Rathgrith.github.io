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
      const silhouettes = new Set();
      for (const id of ["alice", "marisa", "patchouli"]) {
        for (const scale of [1, 0.8]) {
          const poses = new Set();
          for (const pose of ["idle", "ready", "release", "settle"]) {
            ctx.clearRect(0, 0, 64, 64);
            DanmakuBossSprites.satellite(ctx, id, 32, 32, 0, 0, scale, "#aed6da", null, pose);
            const rgba = ctx.getImageData(0, 0, 64, 64).data;
            let visible = 0, mask = "";
            for (let a = 3; a < rgba.length; a += 4) {
              mask += rgba[a] > 120 ? "#" : ".";
              if (rgba[a] > 120) visible++;
            }
            if (visible < 60 || visible > 370) throw Error(id + " unreadable at " + scale);
            if (scale === 1 && pose === "idle") silhouettes.add(mask);
            poses.add(c.toDataURL());
          }
          if (poses.size !== 4) throw Error(id + " missing action poses at scale " + scale);
        }
      }
      if (silhouettes.size !== 3) throw Error("All familiar silhouettes must differ");
      for (const [elapsed, remaining, expected] of [
        [Infinity, .25, "ready"], [.05, Infinity, "release"],
        [.22, Infinity, "settle"], [.4, Infinity, "idle"]
      ]) if (DanmakuBossSprites.castPose(elapsed, remaining) !== expected) throw Error(expected);
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
    const rounds = await page.evaluate(() => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = 28;
      const c = canvas.getContext("2d", {willReadFrequently:true});
      c.imageSmoothingEnabled = false;
      const sizes = {saber:2.3, largeorb:4.8, smallorb:1.7, needle:2.1, spool:2.7,
        bobbin:2.7, ribbon:2.3, comet:3.1, prism:3.1, flare:3.1, stardust:1.9,
        quill:2.3, folio:2.7, seal:2.7, crystal:2.4};
      function sample(style, radius, direct, reduced, hard) {
        c.clearRect(0,0,28,28);
        const b = {shape:"orb",color:"#e0b297",vx:0,vy:-10,radius,hard};
        if (direct) b.visualStyle = style; else b.motion = {visualStyle:style};
        DanmakuBossSprites.projectile(c,14,14,b,reduced);
        const data = c.getImageData(0,0,28,28).data;
        let mask="", count=0;
        for (let i=3; i<data.length; i+=4) {
          mask += data[i] ? "1" : "0";
          if (data[i]) count++;
        }
        return {mask, count, center:data[(14*28+14)*4+3], pixels:canvas.toDataURL()};
      }
      return Object.entries(sizes).map(([style,radius]) => {
        const normal = sample(style,radius,true,false,false);
        return {style,count:normal.count,mask:normal.mask,center:normal.center,
          soft:normal.pixels === sample(style,radius,false,true,false).pixels,
          hard:normal.pixels !== sample(style,radius,true,false,true).pixels};
      });
    });
    assert.equal(new Set(rounds.map(r=>r.mask)).size, rounds.length,
      "All new rounds have different silhouettes when colour, angle and lighting are identical");
    assert(rounds.every(r=>r.soft && r.hard && r.center), "No drifting core; hard rounds retain a physical marking");
    assert(rounds[1].count > 3.5 * rounds[2].count, "Large and small pearls are different at native mobile size");
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
