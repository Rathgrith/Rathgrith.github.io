/* Session contracts use real native media and Web Audio. A deterministic local
 * tone replaces the songs; held network responses exercise actual media gates.
 * The fixture loads current production JS directly, independent of a build. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { installYouTubeDouble } = require("./helpers/companion-radio.cjs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const root = path.resolve(__dirname, "..");
const duration = 90;
const catalog = ["one", "two", "three"].map((slug, i) => ({
  id: "radio-session-" + slug,
  title: "Session " + slug,
  artist: "Local test tone",
  kind: "SONG",
  src: new URL("assets/music/radio/session-" + slug + ".mp3", base).href,
  lyrics: "",
  instrumental: true,
  duration,
  cueStarts: [10 + i, 30 + i, 50 + i],
  cueMethod: "energy-transition-v1",
  videoId: "Session000" + i,
  url: "https://example.invalid/session-" + slug,
  intro: "受信テスト。",
}));
function tone() {
  const rate = 11025,
    length = rate * duration,
    bytes = Buffer.alloc(44 + length * 2);
  bytes.write("RIFF", 0);
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16);
  bytes.writeUInt16LE(1, 20);
  bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(rate, 24);
  bytes.writeUInt32LE(rate * 2, 28);
  bytes.writeUInt16LE(2, 32);
  bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36);
  bytes.writeUInt32LE(length * 2, 40);
  for (let i = 0; i < length; i++) {
    const t = i / rate;
    bytes.writeInt16LE(
      Math.round(
        7000 * Math.sin(2 * Math.PI * 440 * t) * (0.7 + 0.2 * Math.sin(t))
      ),
      44 + i * 2
    );
  }
  return bytes;
}
const media = tone();
const scripts = ["radio-lyrics", "radio-audio", "radio-signal", "bgm"];

async function fixture(browser, { rejectContext = false } = {}) {
  const context = await browser.newContext({
    viewport: { width: 1120, height: 900 },
  });
  await context.addInitScript(installYouTubeDouble);
  await context.addInitScript(
    ({ rejectContext }) => {
      window.__radioAudit = { sources: [], calls: [], contextFailures: 0 };
      const source = AudioContext.prototype.createMediaElementSource;
      AudioContext.prototype.createMediaElementSource = function (audio) {
        const node = source.call(this, audio);
        __radioAudit.sources.push({ audio, node });
        return node;
      };
      if (rejectContext)
        AudioContext.prototype.resume = function () {
          __radioAudit.contextFailures++;
          return Promise.reject(
            new DOMException("Test context blocked", "NotAllowedError")
          );
        };
    },
    { rejectContext }
  );
  const control = {
    hold: false,
    fail: false,
    pending: [],
    requests: [],
    errors: [],
  };
  await context.route("**/assets/js/core/companion-*.js*", (route) => {
    const filename = path.basename(new URL(route.request().url()).pathname);
    return route.fulfill({
      contentType: "application/javascript",
      body: fs.readFileSync(path.join(root, "assets/js/core", filename)),
    });
  });
  await context.route("**/assets/music/radio/session-*.mp3*", async (route) => {
    control.requests.push(route.request().url());
    if (control.hold)
      await new Promise((resolve) => control.pending.push(resolve));
    try {
      if (control.fail)
        return await route.fulfill({
          status: 404,
          body: "Test source unavailable",
        });
      const match = /^bytes=(\d+)-(\d*)$/.exec(
        route.request().headers().range || ""
      );
      const start = match ? Number(match[1]) : 0;
      const end =
        match && match[2]
          ? Math.min(Number(match[2]), media.length - 1)
          : media.length - 1;
      if (start > end) return await route.fulfill({ status: 416, body: "" });
      await route.fulfill({
        status: match ? 206 : 200,
        contentType: "audio/wav",
        headers: {
          "accept-ranges": "bytes",
          "cache-control": "no-store",
          ...(match
            ? { "content-range": `bytes ${start}-${end}/${media.length}` }
            : {}),
        },
        body: media.subarray(start, end + 1),
      });
    } catch (error) {
      // Replacing an audio source legitimately aborts its held request.
      if (
        !/closed|disposed|cancel|handled|invalid interception/i.test(
          error.message
        )
      )
        throw error;
    }
  });
  const url = new URL("radio-session-fixture", base).href;
  await context.route(url, (route) =>
    route.fulfill({
      contentType: "text/html",
      body:
        '<!doctype html><meta charset="utf-8"><style>body{background:#182332;color:#eee;font:14px sans-serif}#radio-root{width:420px;margin:30px}.vn-radio-receiver{max-width:430px}.vn-radio-screen iframe{width:300px;height:220px}canvas{max-width:100%}</style>' +
        '<main id="radio-root"><div class="vn-weather-strip"></div></main>' +
        `<script>window.CompanionRadioTracks=${JSON.stringify(catalog)};</script>` +
        scripts
          .map(
            (name) =>
              `<script src="/assets/js/core/companion-${name}.js"></script>`
          )
          .join("") +
        `<script>
      const factory=CompanionRadioSignal.create;
      CompanionRadioSignal.create=function(){
        const signal=factory.apply(this,arguments);window.__signal=signal;
        for(const name of ['attach','unlock','tune','lock','stop','setVolume','destroy']){
          const method=signal[name];signal[name]=function(){
            __radioAudit.calls.push({name,time:performance.now(),args:[...arguments].filter(v=>typeof v==='number')});
            return method.apply(this,arguments);
          };
        }
        return signal;
      };
      window.radio=CompanionBGM.mount(document.querySelector('#radio-root'));
      radio.setCharacter('alice');
    </script>`,
    })
  );
  const page = await context.newPage();
  page.on("pageerror", (e) => control.errors.push(e.message));
  await page.goto(url);
  await page.locator(".vn-bgm").waitFor();
  return { page, context, control };
}
const current = (page) =>
  page.locator(".vn-bgm").getAttribute("data-radio-track");
const playing = (page) =>
  page.waitForFunction(() => {
    const a = document.querySelector("[data-radio-audio]");
    return (
      a &&
      !a.paused &&
      a.currentTime > 1 &&
      document.querySelector(".vn-bgm").dataset.bgmState === "playing"
    );
  });
async function waitHeld(control) {
  for (let i = 0; i < 100 && !control.pending.length; i++)
    await new Promise((resolve) => setTimeout(resolve, 25));
  assert(
    control.pending.length,
    "Selection starts the media request while tuning is still active"
  );
}
function release(control) {
  control.hold = false;
  control.pending.splice(0).forEach((resolve) => resolve());
}
async function stopped(page, message) {
  await page.waitForFunction(() => {
    const a = document.querySelector("[data-radio-audio]");
    return (
      (!a || a.paused) &&
      document.querySelector(".vn-bgm").dataset.bgmTuning !== "true"
    );
  });
  assert.equal(
    await page.locator("[data-bgm-play]").getAttribute("aria-label"),
    "ラジオを再生",
    message
  );
}

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--mute-audio"],
  });
  try {
    const { page, context, control } = await fixture(browser);
    const play = page.locator("[data-bgm-play]");
    const next = page.locator("[data-bgm-next]");
    const audio = page.locator("[data-radio-audio]");
    const first = await current(page);
    assert(catalog.some((t) => t.id === first));
    await page.evaluate(() => {
      radio.setCharacter("patchouli");
      radio.setCharacter("marisa");
    });
    assert.equal(
      await current(page),
      first,
      "Characters never assign a station, even before first playback"
    );
    assert.equal(await audio.count(), 0, "The radio remains opt-in");
    assert.equal(
      control.requests.length,
      0,
      "Idle radio makes no media request"
    );
    assert.equal(await page.evaluate(() => __radioAudit.sources.length), 0);

    await page.locator("[data-bgm-volume]").fill("32");
    control.hold = true;
    await play.click();
    await waitHeld(control);
    await page.waitForTimeout(1300);
    assert.equal(
      await page.locator(".vn-bgm").getAttribute("data-bgm-tuning"),
      "true",
      "Tuning survives a load longer than the old fixed 1.06 seconds"
    );
    assert.notEqual(
      await page.locator(".vn-bgm").getAttribute("data-bgm-state"),
      "playing"
    );
    assert.equal(
      await page.evaluate(
        () => __radioAudit.calls.filter((c) => c.name === "lock").length
      ),
      0,
      "Loading cannot lock onto an unready source"
    );
    release(control);
    await playing(page);
    const entry = await audio.evaluate((a) => ({
      time: a.currentTime,
      duration: a.duration,
      volume: a.volume,
    }));
    assert(
      entry.time > 5 && entry.time < duration - 10,
      "New tracks enter at a cue or random interior position with a playable tail"
    );
    assert(Math.abs(entry.duration - duration) < 0.2);
    assert.equal(
      entry.volume,
      0.32,
      "Crossfade gain never changes the user's media volume"
    );
    await page.waitForFunction(
      () => document.querySelector(".vn-bgm").dataset.bgmTuning !== "true"
    );
    await page.waitForFunction(() => {
      const bins = new Uint8Array(32);
      __signal.frequencies(bins);
      return bins.some((value) => value > 0);
    });
    assert.equal(
      await page.locator("[data-radio-spectrum]").getAttribute("data-state"),
      "live",
      "The canvas reports a real media spectrum"
    );
    assert.equal(
      await page.evaluate(() => __radioAudit.sources.length),
      1,
      "One media element has exactly one Web Audio source"
    );

    const beforeTheme = await audio.evaluate((a) => a.currentTime);
    await page.evaluate(() => {
      radio.setCharacter("alice");
      radio.setCharacter("patchouli");
    });
    assert.equal(await current(page), first);
    assert(
      await audio.evaluate(
        (a, t) => a.currentTime >= t && !a.paused,
        beforeTheme
      ),
      "Theme changes leave playback untouched"
    );
    await play.click();
    await stopped(page, "One Pause cancels both audio and tuning");
    const pausedAt = await audio.evaluate((a) => a.currentTime);
    await play.click();
    await playing(page);
    assert(
      await audio.evaluate(
        (a, t) => a.currentTime >= t && a.currentTime < t + 3,
        pausedAt
      ),
      "Resume does not pick a second cue"
    );
    await page.locator("[data-bgm-seek]").fill("450");
    await page.waitForFunction(() => {
      const a = document.querySelector("[data-radio-audio]");
      return a.currentTime > 40 && a.currentTime < 44;
    });
    await page.evaluate(() => radio.setGameActive(true));
    await page.waitForFunction(
      () => document.querySelector("[data-radio-audio]").paused
    );
    const battleAt = await audio.evaluate((a) => a.currentTime);
    await page.evaluate(() => radio.setGameActive(false));
    await playing(page);
    assert(
      await audio.evaluate(
        (a, t) => a.currentTime >= t && a.currentTime < t + 3,
        battleAt
      ),
      "Battle handoff preserves radio position and intent"
    );

    const history = [await current(page)];
    for (let i = 0; i < 2; i++) {
      await next.click();
      await page.waitForFunction(
        (id) => document.querySelector(".vn-bgm").dataset.radioTrack !== id,
        history.at(-1)
      );
      await playing(page);
      history.push(await current(page));
    }
    assert.equal(
      new Set(history).size,
      3,
      "Shuffle traverses the available bag before repeating"
    );
    await page.locator("[data-bgm-prev]").click();
    await playing(page);
    assert.equal(
      await current(page),
      history[1],
      "Previous follows listening history rather than catalog order"
    );
    assert.equal(
      await page.evaluate(() => __radioAudit.sources.length),
      1,
      "Track changes reuse the native media graph"
    );

    control.hold = true;
    await next.click();
    await waitHeld(control);
    await play.click();
    await stopped(
      page,
      "Pause also works while the selected source is loading"
    );
    release(control);
    await page.waitForTimeout(400);
    assert(
      await audio.evaluate((a) => a.paused),
      "A late response must not override Pause"
    );
    await audio.evaluate((a) => a.dispatchEvent(new Event("playing")));
    await stopped(page, "A stale playing event is not fresh user intent");
    await play.click();
    await playing(page);

    control.hold = true;
    await next.click();
    await waitHeld(control);
    await page.evaluate(() => {
      document.querySelector("[data-bgm-next]").click();
      document.querySelector("[data-bgm-next]").click();
    });
    const last = await current(page);
    release(control);
    await playing(page);
    assert.equal(
      await audio.getAttribute("src"),
      catalog.find((t) => t.id === last).src,
      "Only the latest rapid selection becomes audible"
    );

    control.fail = true;
    await next.click();
    await page.waitForFunction(
      () => document.querySelector(".vn-bgm").dataset.bgmState === "error"
    );
    assert.equal(
      await page.locator(".vn-bgm").getAttribute("data-bgm-tuning"),
      "false",
      "Failure cannot leave infinite tuning noise"
    );
    assert(await audio.evaluate((a) => a.paused));
    control.fail = false;
    await play.click();
    await playing(page);
    await play.click();
    await stopped(page, "Retry retains one-click pause");
    await page.waitForTimeout(250);
    assert.equal(
      await page.locator("[data-radio-spectrum]").getAttribute("data-state"),
      "idle"
    );
    assert.deepEqual(control.errors, []);
    await context.close();

    const blocked = await fixture(browser, { rejectContext: true });
    await blocked.page.locator("[data-bgm-play]").click();
    await playing(blocked.page);
    assert.equal(
      await blocked.page.evaluate(() => __radioAudit.sources.length),
      0,
      "An unusable Web Audio graph must not capture and silence native media"
    );
    assert.equal(
      await blocked.page
        .locator("[data-radio-spectrum]")
        .getAttribute("data-state"),
      "unavailable"
    );
    assert.deepEqual(blocked.control.errors, []);
    await blocked.context.close();
    console.log(
      "PASS: opt-in random radio, character-independent history, load-spanning tuning, cue/fade/media volume, real spectrum, seek/handoff, pause races, latest selection, failures and blocked-WebAudio fallback."
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
