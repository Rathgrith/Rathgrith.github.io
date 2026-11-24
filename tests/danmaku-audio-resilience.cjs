const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
async function checkBattlePlayback(browser, errors) {
  const page = await browser.newPage();
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(base);
    await page.locator("[data-danmaku-open]").click();
    await page.evaluate(() => {
      const create = DanmakuFlower.create;
      DanmakuFlower.create = (...args) => (window.bgmGame = create(...args));
    });
    await page.locator('[data-danmaku-game-mode="flower"]').click();
    await page.locator('[data-danmaku-challenge="marisa"]').click();
    await page.evaluate(() => {
      const s = bgmGame.state;
      s.countdown = 0;
      s.time = 150;
      s.fields.forEach((field) => (field.player.invulnerable = 1000));
    });
    const music = page.locator("[data-danmaku-music]");
    await music.click();
    const audio = page.locator("[data-danmaku-audio]");
    await page.waitForFunction(() => {
      const a = document.querySelector("[data-danmaku-audio]");
      return (
        a &&
        a.readyState >= 3 &&
        !a.paused &&
        !a.seeking &&
        a.volume > 0 &&
        Math.abs(a.currentTime - bgmGame.state.time) < 0.2
      );
    });
    await audio.evaluate((a) => {
      window.bgmPlayEvents = 0;
      a.addEventListener("play", () => bgmPlayEvents++);
    });

    const playback = () =>
      audio.evaluate((a) => ({
        audible: !a.paused && !a.muted && a.volume > 0 && !a.seeking,
        media: a.currentTime,
        expected:
          bgmGame.state.time %
          DanmakuScore.getTrack(bgmGame.state.enemyId).duration,
      }));
    // A later-half interruption is independent of reaching the end of the file.
    await audio.evaluate((a) => {
      a.pause();
      bgmGame.state.time = 185;
    });
    await page.waitForFunction(() => bgmGame.state.time > 187);
    const recovery = await playback();

    async function assertStaysPaused(action) {
      await action();
      await page.waitForFunction(
        () => document.querySelector("[data-danmaku-audio]").paused
      );
      const before = await audio.evaluate((a) => [
        a.currentTime,
        bgmPlayEvents,
      ]);
      await page.waitForTimeout(1500);
      assert.deepEqual(
        await audio.evaluate((a) => [a.currentTime, bgmPlayEvents, a.paused]),
        [...before, true],
        "an intentional pause must stay silent even when transport recovery is armed"
      );
    }
    await assertStaysPaused(() => page.locator("[data-danmaku-pause]").click());
    await page.locator("[data-danmaku-resume]").click();
    await page.waitForFunction(
      () =>
        !document.querySelector("[data-danmaku-audio]").paused &&
        bgmGame.state.countdown <= 0
    );
    await assertStaysPaused(() => music.click());
    await music.click();
    await page.waitForFunction(() => {
      const a = document.querySelector("[data-danmaku-audio]");
      return (
        Number.isFinite(a.duration) &&
        a.readyState >= 3 &&
        !a.paused &&
        !a.seeking &&
        a.volume > 0
      );
    });

    // Keep the simulation just short of the boundary while the last notes play.
    // This makes the browser, rather than a game-clock seek, reach the actual EOF.
    await audio.evaluate(async (a) => {
      const s = bgmGame.state;
      const length = DanmakuScore.getTrack(s.enemyId).duration;
      const step = bgmGame.step;
      bgmGame.step = () => {};
      try {
        s.time = length - 0.1;
        a.currentTime = a.duration - 0.16;
        const start = performance.now();
        while (!a.ended && !(a.loop && !a.seeking && a.currentTime < 1)) {
          if (performance.now() - start > 4000) {
            throw new Error(
              "the browser did not reach the natural end of the MP3"
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 20));
        }
      } finally {
        bgmGame.step = step;
      }
    });
    await page.waitForFunction(() => {
      const s = bgmGame.state;
      return s.time > DanmakuScore.getTrack(s.enemyId).duration + 1;
    });
    const loop = await playback();
    for (const [scenario, sample] of Object.entries({ loop, recovery })) {
      assert(
        sample.audible && Math.abs(sample.media - sample.expected) < 0.35,
        scenario +
          " must play at the current battle cue: " +
          JSON.stringify(sample)
      );
    }

    // Render at about 6 FPS. The fixed-step battle loop advances at most 100 ms
    // per frame, while the native media clock keeps ticking between renders.
    await audio.evaluate((a) => {
      window.bgmSlowSeeks = 0;
      a.addEventListener("seeking", () => bgmSlowSeeks++);
      const frame = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = (callback) =>
        frame(() => setTimeout(() => callback(performance.now()), 150));
    });
    const initial = await audio.evaluate((a) => [
      a.currentTime,
      bgmGame.state.time,
    ]);
    await page.waitForTimeout(4100);
    const slow = await audio.evaluate((a) => ({
      seeks: bgmSlowSeeks,
      media: a.currentTime,
      game: bgmGame.state.time,
      audible: !a.paused && !a.muted && a.volume > 0,
    }));
    assert(
      slow.game - initial[1] > 0.8 && slow.game - initial[1] < 3,
      "the battle must reproduce capped slow frames: " + JSON.stringify(slow)
    );
    assert(
      slow.audible && slow.media - initial[0] > 0.8 && slow.seeks <= 1,
      "slow frames must keep music advancing without repeated seeks: " +
        JSON.stringify(slow)
    );
  } finally {
    await page.close();
  }
}

(async () => {
  const b = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-gpu"],
  });
  try {
    const page = await b.newPage({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const Real = window.AudioContext;
      window.AudioContext = class extends Real {
        constructor() {
          super();
          window.seContext = this;
        }
      };
      Object.defineProperty(window, "localStorage", {
        get() {
          throw new DOMException("blocked", "SecurityError");
        },
      });
    });
    await page.route("**/*.wav", async (r) => {
      // A slow failure from the first batch must not poison an immediate retry.
      if (r.request().url().endsWith("/page_turn.wav"))
        await new Promise((resolve) => setTimeout(resolve, 400));
      await r.fulfill({ status: 404, body: "missing" });
    });
    await page.goto(base);
    await page.locator("[data-danmaku-open]").click();
    await page.locator('[data-danmaku-challenge="alice"]').click();
    await page.locator("[data-danmaku-sfx]").click();
    await page.waitForFunction(() =>
      document
        .querySelector("[data-danmaku-sfx]")
        .textContent.includes("再試行")
    );
    assert.equal(
      await page.locator("#live2d-widget").getAttribute("data-danmaku-state"),
      "playing"
    );
    assert.equal(
      await page.locator("[data-danmaku-sfx]").getAttribute("aria-pressed"),
      "false"
    );
    await page.unroute("**/*.wav");
    await page.locator("[data-danmaku-sfx]").click();
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-danmaku-sfx]")
          .getAttribute("aria-busy") === "false" &&
        seContext.state === "running"
    );
    await page.route("**/alice-dbu.mp3", (r) =>
      r.fulfill({ status: 404, body: "missing" })
    );
    await page.locator("[data-danmaku-music]").click();
    await page.waitForFunction(() =>
      document
        .querySelector("[data-danmaku-music]")
        .textContent.includes("再試行")
    );
    assert.equal(
      await page.locator("[data-danmaku-music]").getAttribute("aria-pressed"),
      "true",
      "transport failure preserves the chosen battle music setting"
    );
    assert.equal(
      await page.locator("[data-danmaku-sfx]").getAttribute("aria-pressed"),
      "true"
    );
    assert(
      await page.locator("[data-danmaku-audio]").evaluate((a) => a.paused)
    );
    await page.unroute("**/alice-dbu.mp3");
    await page.locator("[data-danmaku-music]").click();
    await page.waitForFunction(
      () => !document.querySelector("[data-danmaku-audio]").paused
    );
    await page.locator("[data-danmaku-exit]").click();
    assert(
      await page.locator("[data-danmaku-audio]").evaluate((a) => a.paused)
    );
    await page.waitForFunction(() => seContext.state === "suspended");
    // Muting before decoding finishes must not replay a backlog or re-enable SE.
    await page.reload();
    await page.locator("[data-danmaku-open]").click();
    await page.route("**/*.wav", async (r) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await r.continue();
    });
    await page.locator("[data-danmaku-sfx]").click();
    await page.locator("[data-danmaku-sfx]").click();
    await page.waitForTimeout(1300);
    assert.equal(
      await page.locator("[data-danmaku-sfx]").getAttribute("aria-pressed"),
      "false"
    );
    assert.equal(await page.evaluate(() => seContext.state), "suspended");
    await page.locator('[data-danmaku-challenge="marisa"]').click();
    assert.equal(await page.evaluate(() => seContext.state), "suspended");
    assert.equal(await page.locator("[data-danmaku-audio]").count(), 0);
    const unsupported = await b.newPage();
    unsupported.on("pageerror", (e) => errors.push(e.message));
    await unsupported.addInitScript(() => {
      window.AudioContext = undefined;
      window.webkitAudioContext = undefined;
    });
    await unsupported.goto(base);
    await unsupported.locator("[data-danmaku-open]").click();
    await unsupported.locator("[data-danmaku-sfx]").click();
    assert.equal(
      await unsupported
        .locator("[data-danmaku-sfx]")
        .getAttribute("aria-pressed"),
      "false"
    );
    await unsupported.locator('[data-danmaku-challenge="patchouli"]').click();
    assert.equal(
      await unsupported
        .locator("#live2d-widget")
        .getAttribute("data-danmaku-state"),
      "playing"
    );
    await page.close();
    await unsupported.close();
    await checkBattlePlayback(b, errors);
    assert.deepEqual(errors, []);
    console.log(
      "PASS: mobile real decode/play, independent recoverable media failures, blocked storage, mute-before-decode, no Web Audio fallback, mid-battle music recovery, natural loop, slow frames and intentional pauses."
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
