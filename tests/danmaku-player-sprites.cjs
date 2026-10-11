/* Real canvas checks at game size: direction/animation registration, transparent
 * silhouettes, reduced motion, both renderer integrations and failed art loads.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out = process.env.QA_OUTPUT || "/private/tmp/danmaku-player-sprites";
const scripts = [
  "score",
  "patterns-alice",
  "patterns-marisa",
  "patterns-patchouli",
  "patterns",
  "scroll",
  "engine",
  "boss-sprites",
  "player-sprites",
  "renderer",
  "flower",
  "flower-renderer",
];
fs.mkdirSync(out, { recursive: true });

async function fixture(browser, reducedMotion, failImages = false) {
  const page = await browser.newPage({
    reducedMotion,
    viewport: { width: 1020, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  if (failImages) await page.route("**/*.png", (route) => route.abort());
  await page.route(new URL("player-art-test", base).href, (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        '<!doctype html><meta charset="utf-8"><body style="margin:0;background:#131e2c;color:#e7edf5;font:13px monospace">' +
        scripts
          .map(
            (name) =>
              `<script src="/assets/js/games/danmaku-${name}.js"></script>`
          )
          .join(""),
    })
  );
  await page.goto(new URL("player-art-test", base).href);
  return { page, errors };
}

async function renderModes(page) {
  return page.evaluate(async () => {
    const directions = ["idle", "n", "ne", "e", "se", "s", "sw", "w", "nw"];
    const calls = [],
      original = DanmakuPlayerSprites.draw;
    DanmakuPlayerSprites.draw = function (...args) {
      const success = original(...args);
      calls.push({
        id: args[1],
        x: args[2],
        y: args[3],
        pose: args[5],
        reduced: args[6],
        size: args[7] || 32,
        success,
      });
      return success;
    };
    const records = [],
      images = [];
    try {
      for (const mode of ["score", "flower"]) {
        const canvas = document.createElement("canvas");
        const renderer = (
          mode === "score" ? DanmakuRenderer : DanmakuFlowerRenderer
        ).create(canvas);
        await renderer.ready;
        for (const id of ["alice", "marisa", "patchouli"]) {
          const game = (
            mode === "score" ? DanmakuEngine : DanmakuFlower
          ).create(id, "marisa", 1977);
          const s = game.state;
          s.countdown = 0;
          s.intro = null;
          game.step(1 / 60);
          const field = mode === "score" ? s : s.fields[0],
            p = field.player;
          p.invulnerable = 0;
          if (mode === "flower") s.fields[1].player.invulnerable = 0;
          if (mode === "score") s.enemySpell.age = 3;
          for (const pose of directions)
            for (const focus of [false, true]) {
              p.facing = pose;
              field.focus = focus;
              calls.length = 0;
              const before = JSON.stringify(s);
              renderer.draw(s);
              if (JSON.stringify(s) !== before)
                throw Error("Rendering mutated combat state");
              const drawn = calls.find(
                (c) =>
                  c.id === id && c.x === p.x && c.y === p.y && c.pose === pose
              );
              if (!drawn)
                throw Error(
                  `${mode}/${id}/${pose}: player module was bypassed`
                );
              if (mode === "flower") {
                const opponent = s.fields[1];
                const cpuDraw = calls[calls.length - 1];
                if (
                  calls.length !== 2 ||
                  cpuDraw.id !== opponent.id ||
                  cpuDraw.x !== opponent.player.x ||
                  cpuDraw.y !== opponent.player.y ||
                  cpuDraw.pose !== opponent.player.facing ||
                  cpuDraw.success !== drawn.success
                )
                  throw Error("CPU field must use the same sprite integration");
              }
              if (p.radius !== 2.2)
                throw Error("Sprite size changed the gameplay hitbox");
              records.push({ mode, id, pose, focus, ...drawn });
            }
          field.focus = true;
          p.facing = "ne";
          renderer.draw(s);
          images.push({ name: `${mode}-${id}`, data: canvas.toDataURL() });
        }
      }
    } finally {
      DanmakuPlayerSprites.draw = original;
    }
    return { records, images };
  });
}

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--mute-audio"],
  });
  try {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const { page, errors } = await fixture(browser, reducedMotion);
      const art = await page.evaluate(async () => {
        const loading = DanmakuPlayerSprites.load();
        if (loading !== DanmakuPlayerSprites.load())
          throw Error(
            "Concurrent renderer loads must share the sprite request"
          );
        await loading;
        const directions = ["idle", "n", "ne", "e", "se", "s", "sw", "w", "nw"];
        const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const sheet = document.createElement("canvas");
        sheet.width = 1008;
        sheet.height = 690;
        const output = sheet.getContext("2d");
        output.imageSmoothingEnabled = false;
        output.fillStyle = "#172232";
        output.fillRect(0, 0, sheet.width, sheet.height);
        const cell = document.createElement("canvas");
        cell.width = cell.height = 64;
        const ctx = cell.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        const results = [];
        function metrics() {
          const pixels = ctx.getImageData(0, 0, 64, 64).data;
          let x0 = 64,
            y0 = 64,
            x1 = -1,
            y1 = -1,
            count = 0,
            sx = 0,
            sy = 0;
          for (let y = 0; y < 64; y++)
            for (let x = 0; x < 64; x++) {
              if (pixels[(y * 64 + x) * 4 + 3] < 16) continue;
              x0 = Math.min(x0, x);
              y0 = Math.min(y0, y);
              x1 = Math.max(x1, x);
              y1 = Math.max(y1, y);
              count++;
              sx += x;
              sy += y;
            }
          return {
            width: x1 - x0 + 1,
            height: y1 - y0 + 1,
            x0,
            y0,
            x1,
            y1,
            count,
            occupancy: count / ((x1 - x0 + 1) * (y1 - y0 + 1)),
            cx: sx / count,
            cy: sy / count,
          };
        }
        for (const [row, id] of ["alice", "marisa", "patchouli"].entries()) {
          const poses = [];
          for (const [column, pose] of directions.entries()) {
            const frames = [],
              bounds = [];
            for (const time of [0, 0.13, 0.26, 0.39, 0.52, 0.65]) {
              ctx.clearRect(0, 0, 64, 64);
              if (
                !DanmakuPlayerSprites.draw(
                  ctx,
                  id,
                  32,
                  35,
                  time,
                  pose,
                  reduced,
                  32
                )
              )
                throw Error(`Missing ${id}/${pose}`);
              frames.push(cell.toDataURL());
              bounds.push(metrics());
              if (!time) {
                output.fillStyle = "#e8e8df";
                output.font = "12px monospace";
                output.fillText(
                  pose.toUpperCase(),
                  column * 112 + 8,
                  row * 230 + 22
                );
                output.drawImage(cell, column * 112 + 20, row * 230 + 30); // Native game pixels.
                output.drawImage(
                  cell,
                  8,
                  8,
                  48,
                  48,
                  column * 112 + 8,
                  row * 230 + 104,
                  96,
                  96
                );
              }
            }
            const drift = Math.max(
              ...bounds.map((b) =>
                Math.hypot(b.cx - bounds[0].cx, b.cy - bounds[0].cy)
              )
            );
            poses.push({
              pose,
              unique: new Set(frames).size,
              first: frames[0],
              bounds,
              drift,
            });
          }
          output.fillStyle = "#f2cf90";
          output.fillText(
            id.toUpperCase() + " — native / 2× detail",
            8,
            row * 230 + 222
          );
          results.push({
            id,
            directions: new Set(poses.slice(1).map((p) => p.first)).size,
            poses: poses.map(({ first, ...p }) => p),
          });
        }
        ctx.clearRect(0, 0, 64, 64);
        if (
          DanmakuPlayerSprites.draw(
            ctx,
            "missing",
            32,
            35,
            0,
            "idle",
            reduced,
            32
          )
        )
          throw Error("Unknown artwork must allow fallback");
        return { results, sheet: sheet.toDataURL() };
      });
      for (const character of art.results) {
        assert.equal(
          character.directions,
          8,
          `${character.id}: all eight flight directions are distinct`
        );
        for (const pose of character.poses) {
          assert(
            reducedMotion === "reduce" ? pose.unique === 1 : pose.unique >= 2,
            `${character.id}/${pose.pose}: motion preference`
          );
          assert(
            pose.drift < 4.5,
            `${character.id}/${pose.pose}: flutter frames must not jump their anchor (${pose.drift})`
          );
          for (const b of pose.bounds) {
            assert(
              b.count > 60 && b.width <= 36 && b.height <= 38,
              `${character.id}: readable small sprite dimensions`
            );
            assert(
              b.x0 > 0 &&
                b.y0 > 0 &&
                b.x1 < 63 &&
                b.y1 < 63 &&
                b.occupancy < 0.95,
              `${character.id}: transparent silhouette, no rectangular background or crop bleed`
            );
          }
        }
      }
      fs.writeFileSync(
        path.join(out, `directions-${reducedMotion}.png`),
        Buffer.from(art.sheet.split(",")[1], "base64")
      );
      const modes = await renderModes(page);
      assert.equal(modes.records.length, 108);
      assert(
        modes.records.every(
          (r) =>
            r.success &&
            r.size <= 34 &&
            r.reduced === (reducedMotion === "reduce")
        ),
        "Both engines use the new small sprites and reduced-motion flag"
      );
      for (const image of modes.images)
        fs.writeFileSync(
          path.join(out, `${image.name}-${reducedMotion}.png`),
          Buffer.from(image.data.split(",")[1], "base64")
        );
      assert.deepEqual(errors, []);
      console.log(
        `PASS ${reducedMotion}: 3 pilots × 8 directions + idle, flutter registration/alpha/game size, 108 score/flower/focus rendering cases`
      );
      await page.close();
    }
    const { page, errors } = await fixture(browser, "no-preference", true);
    const fallback = await renderModes(page);
    assert(
      fallback.records.every((r) => !r.success),
      "Failed sprite PNGs invoke the renderer fallback"
    );
    assert.deepEqual(
      errors,
      [],
      "Asset failures must not stop either canvas renderer"
    );
    for (const image of fallback.images)
      fs.writeFileSync(
        path.join(out, `${image.name}-fallback.png`),
        Buffer.from(image.data.split(",")[1], "base64")
      );
    await page.close();
    console.log(
      "PASS: failed image loads settle and both modes retain fallback rendering without changing focus hitboxes."
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
