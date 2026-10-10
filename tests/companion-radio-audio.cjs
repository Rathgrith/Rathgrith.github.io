/* Real HTMLAudioElement + radio adapter. Catalog MP3 requests use a small local
 * fixture, while the shipped MP3/LRC paths and bundled lyric loading are checked
 * separately. YouTube is a controlled API double, never a remote download. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { installYouTubeDouble, installTuningAudioDouble, installSourceGapCatalog } = require("./helpers/companion-radio.cjs");
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
    await context.addInitScript(installSourceGapCatalog);
    const musicRequests = [], lyricsRequests = [], forbiddenRequests = [], errors = [];
    let failAudio = false, holdAudio = false, releaseAudio;
    context.on("page", page => page.on("pageerror", e => errors.push(e.message)));
    context.on("request", request => {
      if (/\/assets\/music\/radio\/[^/]+\.lrc(?:\?.*)?$/.test(request.url())) lyricsRequests.push(request.url());
      if (/youtube(?:-nocookie)?\.com|ytimg\.com|googlevideo\.com|soundcloud\.com|google-analytics\.com|googletagmanager\.com|clustrmaps\.com/.test(request.url())) forbiddenRequests.push(request.url());
    });
    await context.route(/https:\/\/[^/]*(?:youtube(?:-nocookie)?\.com|ytimg\.com|googlevideo\.com|soundcloud\.com)\//, route => route.abort());
    await context.route(/\/assets\/music\/radio\/[^/]+\.mp3(?:\?.*)?$/, async route => {
      musicRequests.push(route.request().url());
      if (holdAudio) await new Promise(resolve => { releaseAudio = resolve; });
      if (failAudio) return route.fulfill({ status: 404, body: "Unavailable test song" });
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
    const production = await page.evaluate(() => __radioProductionTracks);
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
    assert(production.length >= 3);
    assert.equal(new Set(production.map(track => track.id)).size, production.length, "catalog IDs are unique");
    assert.equal(new Set(production.map(track => track.videoId)).size, production.length, "each song has its own PV");
    for (const track of production) {
      assert(/^radio-[a-z0-9-]+$/.test(track.id));
      const mediaURL = new URL(track.src, base);
      assert.equal(mediaURL.origin, new URL(base).origin, `${track.id} audio is same-origin`);
      assert(/\/assets\/music\/radio\/[a-z0-9-]+\.mp3$/.test(mediaURL.pathname), `${track.id} has a local MP3`);
      assert.equal(track.lyrics, track.src.replace(/\.mp3$/, ".lrc"), `${track.id} has matching bundled lyrics`);
      assert.equal(track.kind, "SONG");
      assert(/^[A-Za-z0-9_-]{11}$/.test(track.videoId));
      const sourcePath = path.join(__dirname, "../assets/music/radio", path.basename(mediaURL.pathname));
      assert(fs.statSync(sourcePath).size > 1024, `${track.id} MP3 exists`);
      const text = fs.readFileSync(sourcePath.replace(/\.mp3$/, ".lrc"), "utf8");
      assert(/\[\d{1,4}:[0-5]?\d(?:[.:]\d{1,3})?\].*\S/.test(text), `${track.id} LRC contains timed text`);
    }
    await page.waitForFunction(() => document.querySelector(".vn-radio-lyrics").dataset.lyricsState === "ready");
    assert(lyricsRequests.length > 0, "bundled lyrics load automatically without starting music");
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
    await page.waitForFunction(() => __tuningMock.sources.some(s => s.active));
    assert(await audio.evaluate(a => a.paused), "native audio stays paused throughout initial tuning");
    assert.deepEqual(musicRequests, [], "tuning starts before the first MP3 load");
    await playing();
    assert(await page.evaluate(() => !__tuningMock.sources.some(s => s.active)), "the first song cannot mask tuning");
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
    const manualNoise = await page.evaluate(() => __tuningMock.sources.length);
    await page.locator("[data-radio-station]").selectOption("0");
    await page.waitForFunction(() => document.querySelector(".vn-bgm").dataset.bgmState === "intermission");
    assert.equal((await page.locator("[data-bgm-intro]").textContent()).trim(), playlist[0].intro);
    await page.waitForFunction(count => __tuningMock.sources.length === count + 1 && __tuningMock.sources.some(s => s.active), manualNoise);
    assert(await audio.evaluate(a => a.paused), "the old song stays paused during station tuning");
    await page.waitForFunction(src => document.querySelector("[data-radio-audio]").getAttribute("src") === src, playlist[0].src);
    await playing();
    await page.locator('button[data-vn-character="patchouli"]').click();
    assert.equal(await panel.getAttribute("data-radio-track"), playlist[0].id, "explicit audio selection survives themes");
    const endedNoise = await page.evaluate(() => __tuningMock.sources.length);
    await audio.evaluate(a => { a.currentTime = a.duration - .05; });
    await page.waitForFunction(() => document.querySelector(".vn-bgm").dataset.bgmState === "intermission");
    assert.equal(await panel.getAttribute("data-radio-track"), playlist[1].id);
    await page.waitForFunction(src => document.querySelector("[data-radio-audio]").getAttribute("src") === src, playlist[1].src);
    await playing();
    assert.equal(await page.evaluate(() => __tuningMock.sources.length), endedNoise + 1, "native ended events also tune the next station");
    assert(await page.evaluate(() => !__tuningMock.sources.some(s => s.active)), "automatic tuning ends before native playback");
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
      await page.waitForFunction(src => document.querySelector("[data-radio-audio]").getAttribute("src") === src, audioOnly.src);
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

    // Real catalog songs retain their identity and source across both modes.
    const pairs = production.slice(0, 3).map(track => [track.id, track.videoId]);
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
    await choose("test-radio-pair");
    await page.locator("[data-bgm-next]").click();
    assert.equal(await panel.getAttribute("data-radio-track"), videoOnly.id, "PV Next skips the injected audio-only entry");
    await page.locator("[data-bgm-prev]").click();
    assert.equal(await panel.getAttribute("data-radio-track"), "test-radio-pair", "PV Previous also skips the audio-only entry");
    await page.locator('button[data-radio-mode="audio"]').click();
    await choose(production[0].id);
    await page.locator("[data-bgm-prev]").click();
    assert.equal(await panel.getAttribute("data-radio-track"), playlist.at(-1).id, "RADIO Previous skips PV-only entries at catalog end");
    await page.locator("[data-radio-start]").click(); await playing();
    await audio.evaluate(a => { a.currentTime = a.duration - .05; });
    await page.waitForFunction(() => document.querySelector(".vn-bgm").dataset.bgmState === "intermission");
    assert.equal(await panel.getAttribute("data-radio-track"), playlist[0].id, "RADIO auto-advance skips every PV-only entry");
    await page.waitForFunction(src => document.querySelector("[data-radio-audio]").getAttribute("src") === src, playlist[0].src);
    await playing();

    // Audio and video versions can have different timelines: LRC files and offsets stay separate.
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
    console.log("PASS: real HTMLAudio adapter, opt-in/default audio, recommendations, no iframe/third-party widget, transport, mute/noise, LRC, queue, lifecycle, softnav, local MP3/LRC catalog and paired songs, unavailable-mode silence, source-aware queue, separate LRC clocks, 4 widths, reload silence, source-error recovery, and pending-play cancellation (local MP3 fixture and controlled missing-source records).");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
