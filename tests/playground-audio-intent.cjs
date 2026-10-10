/* Stress native media callbacks and a gesture-gated battle player. User intent
 * must remain independent from provider events, countdowns and radio handoff. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.addInitScript(() => {
      const realPlay = HTMLMediaElement.prototype.play,
        realPause = HTMLMediaElement.prototype.pause;
      window.audioRace = {
        staleRadioEvents: false,
        holdRadioPlay: false,
        pendingRadio: [],
        holdBattlePlay: false,
        pendingBattle: [],
        gesture: false,
        battleAttempts: [],
      };
      document.addEventListener(
        "click",
        () => {
          audioRace.gesture = true;
          setTimeout(() => {
            audioRace.gesture = false;
          }, 0);
        },
        true
      );
      HTMLMediaElement.prototype.play = function () {
        if (this.hasAttribute("data-danmaku-audio")) {
          audioRace.battleAttempts.push({
            gesture: audioRace.gesture,
            unlocked: !!this.__gestureUnlocked,
          });
          if (!this.__gestureUnlocked && !audioRace.gesture)
            return Promise.reject(
              new DOMException("Click required", "NotAllowedError")
            );
          if (audioRace.gesture) this.__gestureUnlocked = true;
          if (audioRace.holdBattlePlay)
            return new Promise((resolve, reject) =>
              audioRace.pendingBattle.push(() =>
                realPlay.call(this).then(resolve, reject)
              )
            );
        }
        if (this.hasAttribute("data-radio-audio") && audioRace.holdRadioPlay) {
          return new Promise((resolve, reject) =>
            audioRace.pendingRadio.push(() =>
              realPlay.call(this).then(resolve, reject)
            )
          );
        }
        return realPlay.call(this);
      };
      HTMLMediaElement.prototype.pause = function () {
        const wasPlaying = !this.paused;
        realPause.call(this);
        if (
          this.hasAttribute("data-radio-audio") &&
          audioRace.staleRadioEvents &&
          wasPlaying
        )
          setTimeout(() => this.dispatchEvent(new Event("playing")), 50);
      };
    });
    const radio = page.locator("[data-radio-audio]"),
      play = page.locator("[data-bgm-play]"),
      music = page.locator("[data-danmaku-music]");
    const playingRadio = () =>
      page.waitForFunction(() => {
        const a = document.querySelector("[data-radio-audio]");
        return (
          a &&
          !a.paused &&
          document.querySelector(".vn-bgm").dataset.bgmState === "playing"
        );
      });
    const radioStopped = async (reason) => {
      assert(await radio.evaluate((a) => a.paused), reason);
      assert.equal(
        await play.getAttribute("aria-label"),
        "ラジオを再生",
        reason
      );
      assert.equal(
        await page.locator(".vn-bgm").getAttribute("data-bgm-state"),
        "paused",
        reason
      );
    };
    await page.goto(base + "playground/");
    await play.waitFor();
    assert.equal(await radio.count(), 0, "standalone starts silent");
    for (const mode of ["score", "flower"]) {
      await page.locator("[data-danmaku-open]").click();
      assert.equal(
        await music.getAttribute("aria-pressed"),
        "true",
        "battle preference starts enabled independently of radio"
      );
      await page.locator(`[data-danmaku-game-mode=${mode}]`).click();
      await page.locator("[data-danmaku-challenge=alice]").click();
      await page.waitForFunction(() => {
        const a = document.querySelector("[data-danmaku-audio]");
        return (
          a && !a.paused && !a.muted && a.volume > 0 && a.currentTime > 0.15
        );
      });
      assert.equal(
        await radio.count(),
        0,
        "battle never requires a preceding radio playback"
      );
      assert.equal(
        await music.getAttribute("aria-pressed"),
        "true",
        "gesture policy never changes user preference"
      );
      await page.locator("[data-danmaku-exit]").click();
    }
    await page.locator("[data-danmaku-open]").click();
    await page.evaluate(() => (audioRace.holdBattlePlay = true));
    await page.locator("[data-danmaku-challenge=marisa]").click();
    await page.waitForFunction(() => audioRace.pendingBattle.length > 0);
    await music.click();
    await page.evaluate(() => {
      audioRace.holdBattlePlay = false;
      audioRace.pendingBattle.splice(0).forEach((release) => release());
    });
    await page.waitForTimeout(200);
    assert.equal(
      await music.getAttribute("aria-pressed"),
      "false",
      "late battle play never changes the chosen off-state"
    );
    assert(
      await page
        .locator("[data-danmaku-audio]")
        .evaluate((a) => a.paused && a.muted),
      "late battle play is stopped after one toggle"
    );
    await music.click();
    await page.waitForFunction(() => {
      const a = document.querySelector("[data-danmaku-audio]");
      return a && !a.paused && !a.muted && a.volume > 0 && a.currentTime > 0.15;
    });
    await page.locator("[data-danmaku-exit]").click();
    await play.click();
    await playingRadio();
    await page.evaluate(() => (audioRace.staleRadioEvents = true));
    await play.click();
    await page.waitForTimeout(150);
    await radioStopped("one Pause survives a queued playing event");
    await page.evaluate(() => (audioRace.staleRadioEvents = false));
    await play.click();
    await page.waitForFunction(
      () => document.querySelector(".vn-bgm").dataset.bgmTuning === "true"
    );
    await play.click();
    await page.waitForTimeout(1250);
    await radioStopped(
      "one Pause cancels tuning before it can restart the song"
    );
    await page.evaluate(() => (audioRace.holdRadioPlay = true));
    await play.click();
    await page.waitForFunction(() => audioRace.pendingRadio.length > 0);
    await play.click();
    await page.evaluate(() => {
      audioRace.holdRadioPlay = false;
      audioRace.pendingRadio.splice(0).forEach((release) => release());
    });
    await page.waitForTimeout(200);
    await radioStopped("one Pause cancels an unresolved play promise");
    for (const mode of ["score", "flower"]) {
      await page.locator("[data-danmaku-open]").click();
      await page.locator(`[data-danmaku-game-mode=${mode}]`).click();
      assert.equal(
        await music.getAttribute("aria-pressed"),
        mode === "score" ? "true" : "false",
        "battle setting survives radio controls"
      );
      if (mode === "score") await music.click();
      await page.locator("[data-danmaku-challenge=marisa]").click();
      await page.waitForTimeout(250);
      assert.equal(await music.getAttribute("aria-pressed"), "false");
      assert(
        await page
          .locator("[data-danmaku-audio]")
          .evaluate((a) => a.paused && a.muted)
      );
      await page.locator("[data-danmaku-exit]").click();
      await radioStopped("battle return preserves paused radio");
      await play.click();
      await playingRadio();
      await play.click();
      await radioStopped("radio playback does not enable battle music");
    }
    assert.deepEqual(errors, []);
    console.log(
      "PASS: gesture-gated score/flower BGM independent of silent radio; one-click pause through stale events, tuning and late play promises; separate preferences and handoff"
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
