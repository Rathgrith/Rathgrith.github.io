/* Real HTMLAudioElement + radio adapter, with official URLs intercepted by a
 * local MP3 fixture. Provider availability is checked separately, never by
 * downloading or rehosting a remote preview in this regression suite. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { installYouTubeDouble, installTuningAudioDouble } = require("./helpers/companion-radio.cjs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out = process.env.QA_OUTPUT || require("node:os").tmpdir() + "/companion-radio-audio";
const fixture = fs.readFileSync(path.join(__dirname, "../assets/music/companion/alice-ensemble.mp3"));
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-gpu"] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(installYouTubeDouble);
    await context.addInitScript(installTuningAudioDouble);
    const musicRequests = [], forbiddenRequests = [], errors = [];
    let failAudio = false, holdAudio = false, releaseAudio;
    context.on("page", page => page.on("pageerror", e => errors.push(e.message)));
    context.on("request", request => {
      if (/youtube(?:-nocookie)?\.com|ytimg\.com|googlevideo\.com|soundcloud\.com|google-analytics\.com|googletagmanager\.com|clustrmaps\.com/.test(request.url())) forbiddenRequests.push(request.url());
    });
    await context.route(/https:\/\/[^/]*(?:youtube(?:-nocookie)?\.com|ytimg\.com|googlevideo\.com|soundcloud\.com)\//, route => route.abort());
    await context.route(/^https:\/\/(?:tamaonsen\.com|e-ns\.net)\/.*\.mp3(?:\?.*)?$/, async route => {
      musicRequests.push(route.request().url());
      if (holdAudio) await new Promise(resolve => { releaseAudio = resolve; });
      if (failAudio) return route.fulfill({ status: 404, body: "Unavailable test preview" });
      const headers = { "access-control-allow-origin": "*", "accept-ranges": "bytes" };
      const range = /^bytes=(\d+)-(\d*)$/.exec(route.request().headers().range || "");
      if (range) {
        const start = Number(range[1]), end = Math.min(fixture.length - 1, range[2] ? Number(range[2]) : fixture.length - 1);
        headers["content-range"] = `bytes ${start}-${end}/${fixture.length}`;
        return route.fulfill({ status: 206, contentType: "audio/mpeg", headers, body: fixture.subarray(start, end + 1) });
      }
      await route.fulfill({ status: 200, contentType: "audio/mpeg", headers, body: fixture });
    });
    const page = await context.newPage();
    const panel = page.locator(".vn-bgm"), receiver = page.locator(".vn-radio-receiver"), audio = page.locator("audio[data-radio-audio]");
    const playing = () => page.waitForFunction(() => {
      const a = document.querySelector("audio[data-radio-audio]");
      return a && !a.paused && a.currentTime > .03 && document.querySelector(".vn-bgm").dataset.bgmState === "playing";
    });
    const paused = () => page.waitForFunction(() => document.querySelector("audio[data-radio-audio]")?.paused);
    await page.goto(base);
    await panel.waitFor();
    const catalog = await page.evaluate(() => CompanionRadioTracks);
    const playlist = catalog.filter(track => track.src);
    const indexOf = id => catalog.findIndex(track => track.id === id);
    const choose = id => page.locator("[data-radio-station]").selectOption(String(indexOf(id)));
    const optionLabels = () => page.locator("[data-radio-station] option").allTextContents();
    const assertUnavailable = async () => {
      assert.equal(await panel.getAttribute("data-bgm-state"), "unavailable");
      for (const selector of ["[data-bgm-play]", "[data-bgm-mute]", "[data-radio-start]"]) assert(await page.locator(selector).isDisabled(), `${selector} disables unsupported playback`);
      assert.equal(await audio.count(), 0);
      assert.equal(await receiver.locator("iframe").count(), 0);
    };
    assert(playlist.length >= 3);
    assert(playlist.every(track => /^https:\/\//.test(track.src) && /^(XFD|PREVIEW)$/.test(track.kind)), "native queue has explicit promotional-preview scope");
    assert.equal(await panel.getAttribute("data-radio-mode"), "audio");
    assert.equal(await panel.getAttribute("data-bgm-state"), "paused");
    assert.equal(await audio.count(), 0);
    assert.equal(await receiver.locator("iframe").count(), 0);
    assert.equal(await receiver.isVisible(), false);
    assert.equal(await page.evaluate(() => __tuningMock.contexts.length), 0);
    assert.deepEqual(musicRequests, []);
    for (const [character, index] of [["alice", 0], ["patchouli", 1], ["marisa", 2]]) {
      await page.locator(`button[data-vn-character="${character}"]`).click();
      await page.waitForFunction(id => document.querySelector(".vn-bgm").dataset.radioTrack === id, playlist[index].id);
      assert.equal(await page.locator("[data-bgm-credit]").getAttribute("href"), playlist[index].url);
    }
    await page.locator("[data-radio-open]").click();
    assert(await receiver.isVisible());
    assert.equal(await page.locator("[data-radio-station] option").count(), catalog.length);
    const sharedOptions = await optionLabels();
    for (const [index, track] of catalog.entries()) {
      if (!track.src) assert(sharedOptions[index].includes("PVのみ"));
      if (!track.videoId) assert(sharedOptions[index].includes("RADIOのみ"));
    }
    assert.deepEqual(musicRequests, [], "station browsing does not load audio");
    await page.locator("[data-radio-close]").click();
    await page.locator("[data-bgm-play]").click();
    await playing();
    assert.equal(await receiver.isVisible(), false, "audio starts without opening a second window");
    assert.equal(await audio.count(), 1);
    assert.equal(await receiver.locator("iframe").count(), 0);
    assert.equal(await audio.getAttribute("src"), playlist[2].src);
    assert.equal(await audio.getAttribute("preload"), "none");
    assert.equal(await audio.evaluate(a => a.muted), false);
    assert(await audio.evaluate(a => a.duration > 10 && a.readyState >= 3));
    await page.locator("[data-bgm-volume]").fill("32");
    assert.equal(await audio.evaluate(a => a.volume), .32);
    await page.locator("[data-bgm-seek]").fill("400");
    await page.waitForFunction(() => { const a = document.querySelector("[data-radio-audio]"); return a.currentTime >= a.duration * .39; });

    await page.locator("[data-bgm-mute]").click();
    const noiseBeforeMute = await page.evaluate(() => __tuningMock.sources.length);
    await page.locator("[data-bgm-play]").click(); await paused();
    await page.locator("[data-bgm-play]").click(); await playing();
    assert(await audio.evaluate(a => a.muted));
    assert.equal(await page.evaluate(() => __tuningMock.sources.length), noiseBeforeMute);
    await page.locator("[data-companion-minimize]").click(); await paused();
    await page.locator("[data-companion-minimize]").click(); await playing();
    assert(await audio.evaluate(a => a.muted));
    await page.locator("[data-bgm-mute]").click();

    // A local LRC remains synchronized with actual media time.
    await page.locator("[data-radio-open]").click();
    await page.locator("[data-lyrics-file]").setInputFiles({ name: "native-original.lrc", mimeType: "text/plain", buffer: Buffer.from("[00:01]音声テスト一。\n[00:05]音声テスト二。\n[00:09]音声テスト三。") });
    await page.waitForFunction(() => document.querySelector(".vn-radio-lyrics").dataset.lyricsState === "ready");
    await page.locator("[data-radio-start]").click(); await paused();
    await audio.evaluate(a => { a.currentTime = 5.1; });
    await page.waitForFunction(() => document.querySelector("[data-lyrics-current]").textContent === "音声テスト二。");
    await page.locator("[data-lyrics-later]").click();
    assert.equal(await page.locator("[data-lyrics-current]").textContent(), "音声テスト一。");
    await page.locator("[data-lyrics-reset]").click();
    await page.locator("[data-radio-start]").click(); await playing();
    await page.locator("[data-radio-close]").click();
    await playing();
    assert.equal(await receiver.isVisible(), false, "closing the audio chooser preserves playback");

    await page.locator("[data-radio-open]").click();
    await page.locator("[data-radio-station]").selectOption("0");
    await page.waitForFunction(() => document.querySelector(".vn-bgm").dataset.bgmState === "intermission");
    assert.equal((await page.locator("[data-bgm-intro]").textContent()).trim(), playlist[0].intro);
    await page.waitForFunction(src => document.querySelector("[data-radio-audio]").src === src, playlist[0].src);
    await playing();
    await page.locator('button[data-vn-character="patchouli"]').click();
    assert.equal(await panel.getAttribute("data-radio-track"), playlist[0].id, "explicit audio selection survives themes");
    const endedNoise = await page.evaluate(() => __tuningMock.sources.length);
    await audio.evaluate(a => { a.currentTime = a.duration - .05; });
    await page.waitForFunction(() => document.querySelector(".vn-bgm").dataset.bgmState === "intermission");
    assert.equal(await panel.getAttribute("data-radio-track"), playlist[1].id);
    await page.waitForFunction(src => document.querySelector("[data-radio-audio]").src === src, playlist[1].src);
    await playing();
    assert.equal(await page.evaluate(() => __tuningMock.sources.length), endedNoise);
    await page.locator("[data-radio-close]").click();

    await page.locator("[data-danmaku-open]").click(); await paused();
    await page.locator("[data-danmaku-exit]").click(); await playing();
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await paused();
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
    await playing();
    await audio.evaluate(a => { window.radioBeforeNavigation = a; });
    await page.locator('[data-classic-page="gallery"]').click(); await page.waitForURL("**/gallery/");
    assert(await audio.evaluate(a => a === radioBeforeNavigation));
    await playing();

    // An unavailable counterpart preserves the selection and creates no backend.
    const audioOnly = playlist.find(track => !track.videoId);
    await page.locator("[data-radio-open]").click();
    await choose(audioOnly.id);
    if (await panel.getAttribute("data-bgm-state") === "intermission") {
      await page.waitForFunction(src => document.querySelector("[data-radio-audio]").src === src, audioOnly.src);
      await playing();
    }
    await audio.evaluate(a => { window.audioBeforePV = a; });
    const beforeUnavailableRequests = musicRequests.length;
    await page.locator("[data-radio-pv]").click();
    assert.equal(await panel.getAttribute("data-radio-track"), audioOnly.id);
    assert(await page.evaluate(() => audioBeforePV.paused && !audioBeforePV.getAttribute("src")));
    await assertUnavailable();
    assert.deepEqual(await optionLabels(), sharedOptions, "both modes show the same catalog in the same order");
    assert.equal(musicRequests.length, beforeUnavailableRequests);

    // Three verified album XFDs align by stable catalog ID across both modes.
    const pairs = [["tos003-weg-xfd", "Ob4suUHQY74"], ["tos001-lss-xfd", "Bfb5xYpQras"], ["ens0078-xfd", "PiFXNHg8W8s"]];
    for (const [id, videoId] of pairs) {
      const track = catalog[indexOf(id)];
      assert.equal(track.videoId, videoId);
      await choose(id);
      assert.equal(await receiver.locator("iframe").count(), 0, "selection alone never starts PV");
      assert.equal(await page.locator("[data-radio-source]").getAttribute("href"), `https://www.youtube.com/watch?v=${videoId}`);
      await page.locator("[data-radio-start]").click();
      await page.waitForFunction(videoId => __radioMock.active?.getPlayerState() === 1 && __radioMock.active.videoId === videoId, videoId);
      await page.locator('button[data-radio-mode="audio"]').click();
      assert(await page.evaluate(() => __radioMock.active.destroyed));
      assert.equal(await panel.getAttribute("data-radio-track"), id);
      assert.equal(await panel.getAttribute("data-bgm-state"), "paused");
      assert.equal(await audio.count(), 0, "switching to audio requires explicit Play");
      assert.equal(await receiver.locator("iframe").count(), 0);
      assert.equal(await page.locator("[data-radio-source]").getAttribute("href"), track.url);
      assert.deepEqual(await optionLabels(), sharedOptions);
      await page.locator("[data-radio-start]").click(); await playing();
      assert.equal(await audio.getAttribute("src"), track.src);
      await audio.evaluate(a => { window.audioBeforePV = a; });
      await page.locator('button[data-radio-mode="pv"]').click();
      assert.equal(await panel.getAttribute("data-radio-track"), id);
      assert.equal(await panel.getAttribute("data-bgm-state"), "paused");
      assert(await page.evaluate(() => audioBeforePV.paused && !audioBeforePV.getAttribute("src")));
      assert.equal(await audio.count(), 0);
      assert.equal(await receiver.locator("iframe").count(), 0, "returning to PV never silently resumes video");
    }

    // A PV-only selection remains selected in RADIO, without loading a substitute.
    const videoOnly = catalog.find(track => track.videoId && !track.src);
    await choose(videoOnly.id);
    await page.locator("[data-radio-start]").click();
    await page.waitForFunction(id => __radioMock.active?.getPlayerState() === 1 && __radioMock.active.videoId === id, videoOnly.videoId);
    await page.locator('button[data-radio-mode="audio"]').click();
    assert.equal(await panel.getAttribute("data-radio-track"), videoOnly.id);
    assert(await page.evaluate(() => __radioMock.active.destroyed));
    await assertUnavailable();
    const idleCounts = [musicRequests.length, await page.evaluate(() => __radioMock.players.length)];
    await page.waitForTimeout(250);
    assert.deepEqual([musicRequests.length, await page.evaluate(() => __radioMock.players.length)], idleCounts, "unsupported selection stays network/backend silent");
    await page.locator('button[data-radio-mode="pv"]').click();
    assert.equal(await panel.getAttribute("data-radio-track"), videoOnly.id);
    assert.equal(await receiver.locator("iframe").count(), 0);
    assert.equal(await panel.getAttribute("data-bgm-state"), "paused");

    // Previous/next skip unavailable entries instead of changing to another mode.
    await choose(pairs[0][0]);
    await page.locator("[data-bgm-next]").click();
    assert.equal(await panel.getAttribute("data-radio-track"), pairs[1][0], "PV Next skips the three audio-only entries");
    await page.locator("[data-bgm-prev]").click();
    assert.equal(await panel.getAttribute("data-radio-track"), pairs[0][0]);
    await page.locator('button[data-radio-mode="audio"]').click();
    await page.locator("[data-bgm-prev]").click();
    assert.equal(await panel.getAttribute("data-radio-track"), playlist.at(-1).id, "RADIO Previous skips PV-only entries at catalog end");
    await page.locator("[data-radio-start]").click(); await playing();
    await audio.evaluate(a => { a.currentTime = a.duration - .05; });
    await page.waitForFunction(() => document.querySelector(".vn-bgm").dataset.bgmState === "intermission");
    assert.equal(await panel.getAttribute("data-radio-track"), playlist[0].id, "RADIO auto-advance skips every PV-only entry");
    await page.waitForFunction(src => document.querySelector("[data-radio-audio]").src === src, playlist[0].src);
    await playing();

    // Audio and video previews have different timelines: LRC files and offsets stay separate.
    await page.locator("[data-lyrics-file]").setInputFiles({ name: "aligned-audio.lrc", mimeType: "text/plain", buffer: Buffer.from("[00:01]音声版のテスト。") });
    await page.waitForFunction(() => document.querySelector(".vn-radio-lyrics").dataset.lyricsState === "ready");
    await page.locator("[data-lyrics-later]").click();
    await page.locator('button[data-radio-mode="pv"]').click();
    assert.equal(await page.locator(".vn-radio-lyrics").getAttribute("data-lyrics-state"), "empty", "video does not reuse audio's timestamps");
    await page.locator("[data-lyrics-file]").setInputFiles({ name: "aligned-video.lrc", mimeType: "text/plain", buffer: Buffer.from("[00:01]映像版のテスト。") });
    await page.waitForFunction(() => document.querySelector(".vn-radio-lyrics").dataset.lyricsState === "ready");
    await page.locator("[data-radio-start]").click();
    await page.waitForFunction(() => __radioMock.active?.getPlayerState() === 1);
    await page.evaluate(() => __radioMock.active.seekTo(2));
    await page.waitForFunction(() => document.querySelector("[data-lyrics-current]").textContent === "映像版のテスト。");
    assert.equal(await page.locator("[data-lyrics-offset]").textContent(), "±0.0秒");
    await page.locator('button[data-radio-mode="audio"]').click();
    assert.equal(await page.locator("[data-lyrics-offset]").textContent(), "＋0.5秒");
    const records = await page.evaluate(() => JSON.parse(localStorage.getItem("site-companion-radio-lrc-v1")).tracks);
    assert(records[pairs[0][0]].lrc.includes("音声版のテスト。"));
    assert(records[pairs[0][1]].lrc.includes("映像版のテスト。"));
    await page.locator("[data-radio-start]").click(); await playing();
    await audio.evaluate(a => { a.currentTime = 2; });
    await page.waitForFunction(() => document.querySelector("[data-lyrics-current]").textContent === "音声版のテスト。");
    await page.locator("[data-radio-close]").click(); await playing();

    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator("[data-radio-open]").click();
      await page.waitForTimeout(150);
      const layout = await page.evaluate(() => {
        const p = document.querySelector(".vn-bgm"), r = document.querySelector(".vn-radio-receiver");
        const b = r.getBoundingClientRect(), q = p.getBoundingClientRect();
        return { page: document.documentElement.scrollWidth <= innerWidth, panel: p.scrollWidth <= p.clientWidth + 1,
          receiver: b.left >= 0 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1 && r.scrollWidth <= r.clientWidth + 1,
          controls: [...p.querySelectorAll("button,input")].every(e => { const a = e.getBoundingClientRect(); return a.width >= 20 && a.left >= q.left - 1 && a.right <= q.right + 1; }),
          screenHidden: getComputedStyle(r.querySelector(".vn-radio-screen")).display === "none" };
      });
      assert(Object.values(layout).every(Boolean), JSON.stringify({ width, layout }));
      await receiver.screenshot({ path: `${out}/audio-${width}.png` });
      await page.locator("[data-radio-close]").click(); await playing();
    }
    await page.reload(); await panel.waitFor();
    assert.equal(await audio.count(), 0, "full reload never resumes music automatically");
    assert.equal(await panel.getAttribute("data-radio-mode"), "audio");

    // Failed sources can be replaced and retried without retaining a dead player.
    failAudio = true;
    await page.locator("[data-bgm-play]").click();
    await page.waitForFunction(() => document.querySelector(".vn-bgm").dataset.bgmState === "error");
    failAudio = false;
    await page.locator("[data-radio-open]").click();
    await page.locator("[data-radio-station]").selectOption("2");
    await page.locator("[data-radio-start]").click(); await playing();

    // Pausing while a response is pending must prevent late audible playback.
    await page.reload(); await panel.waitFor();
    holdAudio = true;
    await page.locator("[data-bgm-play]").click();
    await audio.waitFor({ state: "attached" });
    const requestDeadline = Date.now() + 10000;
    while (!releaseAudio && Date.now() < requestDeadline) await new Promise(resolve => setTimeout(resolve, 10));
    assert(releaseAudio, "delayed native media request reached the fixture route");
    await page.locator("[data-bgm-play]").click();
    holdAudio = false; releaseAudio();
    await page.waitForTimeout(400);
    assert(await audio.evaluate(a => a.paused), "Pause cancels a pending native play request");
    assert.equal(await panel.getAttribute("data-bgm-state"), "paused");
    assert.deepEqual(forbiddenRequests, []);
    assert.deepEqual(errors, []);
    console.log("PASS: real HTMLAudio adapter, opt-in/default audio, recommendations, no iframe/third-party widget, transport, mute/noise, LRC, queue, lifecycle, softnav, shared catalog and three exact video pairings, unavailable-mode silence, source-aware queue, separate LRC clocks, 4 widths, reload silence, source-error recovery, and pending-play cancellation (local MP3 fixture; remote availability smoke separate).");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
