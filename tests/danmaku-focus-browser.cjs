/* Real controller events must transfer AUTO to manual without clearing a field. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const source = (name) =>
  fs.readFileSync(path.join(__dirname, "../assets/js/games", name), "utf8");

function instrumentation(global) {
  return `\n(function () {
    const create = ${global}.create;
    ${global}.create = function (...args) {
      const game = create(...args), step = game.step;
      const probe = window.focusQA = {
        game, input: {}, frames: 0,
        advance() { step(1 / 60, probe.input); }
      };
      // Let the real RAF/controller keep sampling actual browser events, while
      // combat advances only at a checkpoint. This removes music/AI timing races.
      game.step = function (dt, input) {
        probe.input = { ...input };
        probe.frames++;
      };
      return game;
    };
  })();`;
}

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--mute-audio"],
  });
  const failures = [];
  try {
    for (const mode of ["score", "flower"]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1100 },
      });
      const errors = [];
      page.on("pageerror", (error) => errors.push(error.message));
      try {
        // Use current production sources, including a controller fix before a
        // Jekyll rebuild; the only additions expose state and freeze simulation.
        for (const [file, global] of [
          ["danmaku-engine.js", "DanmakuEngine"],
          ["danmaku-flower.js", "DanmakuFlower"],
        ]) {
          await page.route("**/" + file + "*", (route) =>
            route.fulfill({
              contentType: "application/javascript",
              body: source(file) + instrumentation(global),
            })
          );
        }
        await page.route("**/companion-danmaku.js*", (route) =>
          route.fulfill({
            contentType: "application/javascript",
            body: source("companion-danmaku.js"),
          })
        );
        await page.goto(new URL("playground/", base).href);
        await page.locator("[data-danmaku-open]").click();
        if (mode === "flower")
          await page.locator('[data-danmaku-game-mode="flower"]').click();
        await page.locator('[data-danmaku-challenge="marisa"]').click();
        await page.waitForFunction(() => window.focusQA?.frames > 0);
        await page.evaluate(() => {
          const q = focusQA,
            s = q.game.state;
          s.countdown = 0;
          s.intro = null;
          q.advance(); // Initialize the score encounter before adding sentinels.
          const f = s.mode === "flower" ? s.fields[0] : s;
          f.player.invulnerable = 999;
          f.player.x = 120;
          f.player.y = 310;
          f.bullets = [
            {
              qaSentinel: "enemy",
              x: 26,
              y: 110,
              vx: 3,
              vy: 8,
              age: 0,
              radius: 2,
              shape: "orb",
              color: "#e0c8ff",
              kind: "white",
            },
          ];
          f.shots = [
            {
              qaSentinel: "player",
              x: 30,
              y: 265,
              vx: 0,
              vy: -80,
              age: 0,
              damage: 0.1,
              kind: "needle",
              color: "#e0c8ff",
            },
          ];
          f.lasers = [];
          if (s.mode === "flower") {
            f.gauge = 350;
            f.charge = 0;
            f.charging = false;
            f.cooldown = 0;
            f.enemies = [];
            f.waveClock = 999;
          } else {
            s.enemySpell.hp = Infinity;
            s.items = [];
          }
          q.initial = {
            bombs: s.bombs,
            gauge: f.gauge,
            cards: f.cards,
          };
        });
        const sample = async () => {
          const frame = await page.evaluate(() => focusQA.frames);
          await page.waitForFunction(
            (before) => focusQA.frames > before,
            frame
          );
          return page.evaluate(() => ({
            auto: focusQA.game.state.auto,
            input: focusQA.input,
          }));
        };
        const advanceAndCheck = async (focused, label) => {
          const input = await sample();
          assert.equal(input.auto, false, `${mode}: ${label} exits AUTO`);
          assert.equal(
            Boolean(input.input.focus),
            focused,
            `${mode}: ${label} reaches the controller`
          );
          const state = await page.evaluate(() => {
            const q = focusQA;
            q.advance();
            const s = q.game.state,
              f = s.mode === "flower" ? s.fields[0] : s;
            return {
              auto: s.auto,
              phase: s.phase,
              focused: s.mode === "flower" ? f.focus : s.focus,
              bombs: s.bombs,
              gauge: f.gauge,
              cards: f.cards,
              enemy: f.bullets.some((b) => b.qaSentinel === "enemy"),
              player: f.shots.some((b) => b.qaSentinel === "player"),
              initial: q.initial,
            };
          });
          assert.equal(
            state.phase,
            "playing",
            `${mode}: ${label} stays active`
          );
          assert.equal(state.auto, false, `${mode}: ${label} stays manual`);
          assert.equal(state.focused, focused);
          assert(state.enemy, `${mode}: ${label} preserves distant enemy fire`);
          assert(
            state.player,
            `${mode}: ${label} preserves existing player fire`
          );
          if (mode === "score")
            assert.equal(state.bombs, state.initial.bombs, "no automatic bomb");
          else {
            assert(state.gauge >= state.initial.gauge, "no gauge consumption");
            assert.equal(state.cards, state.initial.cards, "no automatic card");
          }
        };

        // First establish the existing pointer behavior, then require parity
        // from Shift. The old controller fails this keyboard takeover assertion.
        await page.keyboard.press("t");
        assert.equal((await sample()).auto, true);
        await page.locator("[data-danmaku-slow]").click();
        await advanceAndCheck(true, "low-speed button");
        await page.locator("[data-danmaku-slow]").click();
        await advanceAndCheck(false, "high-speed button");
        await page.keyboard.press("t");
        assert.equal((await sample()).auto, true);
        for (let i = 0; i < 4; i++) {
          await page.keyboard.down("Shift");
          await advanceAndCheck(true, `Shift down ${i + 1}`);
          await page.keyboard.up("Shift");
          await advanceAndCheck(false, `Shift up ${i + 1}`);
        }
        // Shift changes printable key casing. Releasing uppercase movement must
        // clear the same key without re-enabling AUTO or leaving motion stuck.
        await page.keyboard.down("Shift");
        await page.keyboard.down("W");
        assert.equal((await sample()).input.y, -1);
        await advanceAndCheck(true, "Shift + W");
        await page.keyboard.up("W");
        await page.keyboard.up("Shift");
        const released = await sample();
        assert.equal(released.input.x, 0);
        assert.equal(released.input.y, 0);
        await advanceAndCheck(false, "all keys released");
        assert.deepEqual(errors, [], `${mode}: no browser exceptions`);
        console.log(
          `PASS ${mode}: Shift/button takeover preserves both firing fields and resources.`
        );
      } catch (error) {
        failures.push(`${mode}: ${error.message}`);
      } finally {
        await page.keyboard.up("Shift");
        await page.close();
      }
    }
    assert.deepEqual(failures, [], failures.join("\n"));
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
