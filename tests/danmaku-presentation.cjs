const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out =
  process.env.QA_OUTPUT ||
  require("node:os").tmpdir() + "/danmaku-presentation";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const page = await browser.newPage({ reducedMotion });
      // Render the real production modules in a minimal, same-origin test fixture.
      await page.route(base + "renderer-test", (route) =>
        route.fulfill({
          contentType: "text/html",
          body: '<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="/assets/css/classic-companion.css"></head><body><canvas id="field"></canvas><script src="/assets/js/games/danmaku-score.js"></script><script src="/assets/js/games/danmaku-patterns-alice.js"></script><script src="/assets/js/games/danmaku-patterns-marisa.js"></script><script src="/assets/js/games/danmaku-patterns-patchouli.js"></script><script src="/assets/js/games/danmaku-patterns.js"></script><script src="/assets/js/games/danmaku-scroll.js"></script><script src="/assets/js/games/danmaku-run.js"></script><script src="/assets/js/games/danmaku-pilot.js"></script><script src="/assets/js/games/danmaku-engine.js"></script><script src="/assets/js/games/danmaku-boss-sprites.js"></script><script src="/assets/js/games/danmaku-player-sprites.js"></script><script src="/assets/js/games/danmaku-scenery.js"></script><script src="/assets/js/games/danmaku-renderer.js"></script></body></html>',
        })
      );
      await page.goto(base + "renderer-test");
      const results = await page.evaluate(async () => {
        const canvas = document.querySelector("canvas");
        const renderer = DanmakuRenderer.create(canvas);
        await renderer.ready;
        await document.fonts.load('12px "Fusion Pixel"');
        const pixels = () =>
          canvas
            .getContext("2d")
            .getImageData(0, 0, canvas.width, canvas.height).data;
        function difference(a, b) {
          let sum = 0;
          for (let i = 0; i < a.length; i++)
            if (i % 4 !== 3) sum += Math.abs(a[i] - b[i]);
          return sum / ((a.length * 3) / 4);
        }
        const results = [];
        for (const id of Object.keys(DanmakuEngine.cast)) {
          const game = DanmakuEngine.create(id, id, 1977),
            s = game.state;
          s.countdown = 0;
          game.step(1 / 60);
          renderer.draw(s);
          const still = pixels();
          s.scroll = 2031;
          renderer.draw(s);
          const moving = pixels();
          const background = canvas.toDataURL();
          // Capture the real playfield immediately after the production renderer
          // paints the scenery. This excludes changing player poses and HUD text.
          const drawScenery = DanmakuScenery.draw, routeStart = DanmakuScore.getTrack(id).phrases[2].start;
          let scenePixels;
          DanmakuScenery.draw = function (...args) {
            drawScenery(...args);
            scenePixels = pixels();
          };
          const travel = { ...s };
          function sceneAt(time, distance = 2031) {
            travel.time = time;
            travel.rhythm = DanmakuScore.at(id, time);
            travel.scroll = distance;
            renderer.draw(travel);
            return scenePixels;
          }
          const oldScene = sceneAt(routeStart - 0.01);
          const changes = [0.002, 0.25, 1, 1.75, 2.01].map((age) =>
            difference(oldScene, sceneAt(routeStart + age)));
          const secondScene = canvas.toDataURL();
          const staticScene = difference(sceneAt(routeStart + 2.01), sceneAt(routeStart + 6, 415));
          const seam = difference(sceneAt(routeStart + 5, 335.98), sceneAt(routeStart + 5, 336.02));
          const duration = DanmakuScore.getTrack(id).duration;
          const beforeRest = sceneAt(duration - 0.01);
          travel.round++;
          const afterRest = sceneAt(duration - 0.01);
          const restartPop = difference(beforeRest, afterRest);
          DanmakuScenery.draw = drawScenery;
          s.items = [
            { type: "power", x: 72, y: 175, age: 1 },
            { type: "life", x: 120, y: 175, age: 1 },
            { type: "clear", x: 168, y: 175, age: 1 },
          ];
          renderer.draw(s);
          const pickupDifference = difference(moving, pixels());
          const pickups = canvas.toDataURL();
          s.items = [];
          const transitions = [];
          for (const boundary of [
            48,
            64,
            96,
            160,
            80 / 0.45,
            180 / 0.8,
            4800,
            (360 - 24) / 0.34,
            (2 * (360 - 24)) / 0.34,
            360 / 0.76,
            440 / 0.16,
          ]) {
            s.scroll = boundary - 0.1;
            renderer.draw(s);
            const before = pixels();
            s.scroll = boundary + 0.1;
            renderer.draw(s);
            transitions.push(difference(before, pixels()));
          }
          s.scroll = 2031;
          game.bomb();
          s.spell.age = 0.5;
          renderer.draw(s);
          const spell = canvas.toDataURL();
          const spellDifference = difference(moving, pixels());
          const capture = DanmakuEngine.create(id, id, 1977),
            cs = capture.state;
          cs.countdown = 0;
          cs.player.invulnerable = 999;
          capture.step(1 / 60);
          cs.enemySpell.age = 3;
          cs.time = cs.rhythm.spellEnd - 0.01;
          cs.bullets = Array.from({ length: 240 }, (_, i) => ({
            x: 12 + (i % 16) * 14,
            y: 45 + Math.floor(i / 16) * 16,
            vx: 0,
            vy: 0,
            radius: 2.4,
            color: "#d8b3e6",
          }));
          capture.step(1 / 60);
          if (!cs.breakNotice.captured || cs.scoreItems.length !== 240)
            throw Error("Timed spell completion must convert every bullet");
          const captureFrames = [],
            counts = [];
          let frame = 0;
          for (const target of [3, 14, 36, 78]) {
            while (frame++ < target) capture.step(1 / 60);
            renderer.draw(cs);
            captureFrames.push(canvas.toDataURL());
            counts.push(cs.scoreItems.length);
          }
          if (counts[3] !== 0 || !counts[1])
            throw Error("Visible drift must precede collection");
          const events = {};
          const entry = DanmakuEngine.create(id, id, 1977);
          for (let f = 0; f < 90; f++) entry.step(1 / 60);
          renderer.draw(entry.state);
          events.intro = canvas.toDataURL();
          s.enemySpell.age = 0.7;
          s.spell = null;
          renderer.draw(s);
          events.declaration = canvas.toDataURL();
          s.enemySpell.age = 3;
          s.eventNotice = { kind: "miss", age: 0.4, value: 2 };
          s.missBurst = { x: s.player.x, y: s.player.y, age: 0.25 };
          renderer.draw(s);
          events.miss = canvas.toDataURL();
          s.eventNotice = s.missBurst = null;
          for (const power of [1, 32]) {
            const shotGame = DanmakuEngine.create(id, id, 1977),
              ss = shotGame.state;
            ss.countdown = 0;
            ss.power = power;
            ss.player.invulnerable = 999;
            for (let f = 0; f < 125; f++)
              shotGame.step(1 / 60, { focus: true });
            ss.enemySpell.age = 3;
            ss.bullets = [];
            renderer.draw(ss);
            events["power-" + power] = canvas.toDataURL();
          }
          const shakeGame = DanmakuEngine.create(id, id, 1977),
            sh = shakeGame.state;
          sh.countdown = 0;
          shakeGame.step(1 / 60);
          sh.time = 1.007;
          sh.enemySpell.age = 3;
          sh.shots = [];
          sh.lasers = [
            {
              x: 120,
              y: 54,
              angle: 1.4,
              width: 18,
              spread: 0.18,
              warning: 1,
              duration: 2,
              color: "#eee",
              sweep: 0,
              age: 1.12,
            },
          ];
          const ctx = canvas.getContext("2d"),
            translate = ctx.translate.bind(ctx),
            translations = [];
          ctx.translate = (x, y) => {
            translations.push([x, y]);
            translate(x, y);
          };
          renderer.draw(sh);
          events.spark = canvas.toDataURL();
          ctx.translate = translate;
          const shake = translations[0];
          if (matchMedia("(prefers-reduced-motion: reduce)").matches) {
            if (
              translations.some(
                ([x, y]) => Math.abs(x) <= 3 && Math.abs(y) <= 3 && (x || y)
              )
            )
              throw Error("Reduced motion must skip world shake");
          } else if (
            Math.abs(shake[0]) > 3 ||
            Math.abs(shake[1]) > 3 ||
            !shake.some(Boolean)
          )
            throw Error("Bounded shake should precede beam placement");
          const matrix = ctx.getTransform();
          if (matrix.e !== 0 || matrix.f !== 0)
            throw Error("World shake must not leak into HUD or next frame");
          renderer.draw(s);
          results.push({
            id, secondScene, changes, staticScene, seam, restartPop,
            captureFrames,
            counts,
            events,
            scrollDifference: difference(still, moving),
            transitions,
            spellDifference,
            background,
            pickups,
            pickupDifference,
            spell,
          });
        }
        return results;
      });
      for (const r of results) {
        const [start, early, middle, late, end] = r.changes;
        assert(end > 3, `${r.id}: the second route must render distinct artwork (${end})`);
        assert(r.seam < 1 && r.restartPop < 0.01, `${r.id}: tile and round boundaries stay continuous (tile ${r.seam}, round ${r.restartPop})`);
        if (reducedMotion === "reduce") {
          assert(r.staticScene < 0.01 && r.changes.every((v) => Math.abs(v - end) < 0.01),
            `${r.id}: reduced motion holds the new illustration still`);
        } else {
          assert(start < end * 0.05 && early > end * 0.06 && early < end * 0.22 &&
            middle > end * 0.36 && middle < end * 0.65 && late > end * 0.75 && late < end * 0.98,
            `${r.id}: background blends over two seconds (${r.changes.map(v => v.toFixed(2))})`);
          assert(r.staticScene > 0.5, `${r.id}: the second route scrolls during flight`);
        }
        assert(
          reducedMotion === "reduce"
            ? r.scrollDifference < 0.001
            : r.scrollDifference > 0.5,
          `${r.id}: scenery motion preference: ${r.scrollDifference}`
        );
        assert(
          r.transitions.every((n) => n < 2.5),
          `${r.id}: no scenery pop at wrap boundaries ${r.transitions}`
        );
        assert(
          r.spellDifference > 3,
          `${r.id}: X must produce a substantial visible effect, also with reduced motion`
        );
        assert(r.pickupDifference > 0.1, "Distinct boxed pickups must render");
        for (const type of ["background", "secondScene", "spell", "pickups"])
          fs.writeFileSync(
            `${out}/${r.id}-${reducedMotion}-${type}.png`,
            Buffer.from(r[type].split(",")[1], "base64")
          );
        for (const [name, data] of Object.entries(r.events))
          fs.writeFileSync(
            `${out}/${r.id}-${reducedMotion}-${name}.png`,
            Buffer.from(data.split(",")[1], "base64")
          );
        r.captureFrames.forEach((data, i) =>
          fs.writeFileSync(
            `${out}/${r.id}-${reducedMotion}-capture-${i}.png`,
            Buffer.from(data.split(",")[1], "base64")
          )
        );
        console.log(
          `${reducedMotion}/${r.id}: scroll ${r.scrollDifference.toFixed(2)}, wrap max ${Math.max(...r.transitions).toFixed(2)}, spell ${r.spellDifference.toFixed(2)}`
        );
      }
      await page.close();
    }
    console.log(
      "PASS: six route illustrations, two-second fades, seamless tile and round boundaries, spell effects and reduced-motion rendering"
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
