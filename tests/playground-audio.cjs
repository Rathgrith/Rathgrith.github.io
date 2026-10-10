/* Real browser gesture, native media and Web Audio; never bypass autoplay rules. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
(async () => {
  const b = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const p = await b.newPage({ viewport: { width: 1440, height: 1000 } }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.addInitScript(() => {
      window.audioContexts = [];
      window.sfxStarts = 0;
      const Real = window.AudioContext;
      window.AudioContext = class extends Real {
        constructor(...a) {
          super(...a);
          audioContexts.push(this);
        }
        createBufferSource() {
          const s = super.createBufferSource(),
            start = s.start.bind(s);
          s.start = (...a) => {
            sfxStarts++;
            return start(...a);
          };
          return s;
        }
      };
    });
    await p.goto(base + "playground/");
    const music = p.locator("[data-danmaku-music]"),
      sfx = p.locator("[data-danmaku-sfx]");
    await p.locator("[data-bgm-play]").waitFor();
    assert.equal(
      await p.locator("[data-radio-audio]").count(),
      0,
      "opening standalone does not create a radio audio source"
    );
    assert.equal(
      await p.locator("[data-bgm-play]").getAttribute("aria-label"),
      "ラジオを再生"
    );
    await p.locator("[data-vn-character=marisa]").click();
    await p.locator("[data-vn-open=settings]").click();
    await p.keyboard.press("Escape");
    await p.locator("[data-bgm-next]").click();
    assert.equal(
      await p.locator("[data-radio-audio]").count(),
      0,
      "ordinary clicks, keys and station selection leave radio stopped"
    );
    await p.locator("[data-bgm-play]").click();
    await p.waitForFunction(() => {
      const a = document.querySelector("[data-radio-audio]");
      return a && !a.paused && !a.muted && a.currentTime > 0.1;
    });
    await p.locator("[data-danmaku-open]").click();
    assert(
      await p.locator("[data-radio-audio]").evaluate((e) => e.paused),
      "radio yields to battle"
    );
    assert.equal(await music.getAttribute("aria-pressed"), "true");
    assert.equal(await sfx.getAttribute("aria-pressed"), "true");
    await p.locator("[data-danmaku-challenge=marisa]").click();
    await p.waitForFunction(() => {
      const a = document.querySelector("[data-danmaku-audio]");
      return a && !a.paused && !a.muted && a.currentTime > 0.15;
    });
    await p.waitForFunction(
      () =>
        sfxStarts > 5 &&
        document
          .querySelector("[data-danmaku-sfx]")
          .getAttribute("aria-busy") === "false"
    );
    assert(
      await p.locator("[data-radio-audio]").evaluate((e) => e.paused),
      "only one music source plays"
    );
    await music.click();
    await sfx.click();
    assert(
      await p
        .locator("[data-danmaku-audio]")
        .evaluate((e) => e.paused && e.muted)
    );
    await p.locator("[data-danmaku-exit]").click();
    await p.waitForFunction(
      () => !document.querySelector("[data-radio-audio]").paused
    );
    await p.locator("[data-bgm-play]").click();
    await p.locator("[data-vn-character=alice]").click();
    assert(
      await p.locator("[data-radio-audio]").evaluate((e) => e.paused),
      "manual radio pause survives subsequent clicks"
    );
    await p.locator("[data-danmaku-open]").click();
    assert.equal(await music.getAttribute("aria-pressed"), "false");
    assert.equal(await sfx.getAttribute("aria-pressed"), "false");
    // First interaction can also be the battle launcher. It must not request radio audio.
    await p.reload();
    await p.locator("[data-danmaku-open]").click();
    assert.equal(await p.locator("[data-radio-audio]").count(), 0);
    assert.equal(await music.getAttribute("aria-pressed"), "true");
    await p.locator("[data-danmaku-challenge=alice]").click();
    await p.waitForFunction(() => {
      const a = document.querySelector("[data-danmaku-audio]");
      return a && !a.paused && !a.muted && a.currentTime > 0.15;
    });
    assert.equal(
      await p.locator("[data-radio-audio]").count(),
      0,
      "direct battle entry enables battle BGM only"
    );
    await p.locator("[data-danmaku-exit]").click();
    assert.equal(
      await p.locator("[data-radio-audio]").count(),
      0,
      "returning from a first battle does not start an unrequested radio"
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: standalone radio requires explicit play, default battle BGM/SE output, exclusive music handoff, persistent manual mute/pause and direct battle entry"
    );
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
