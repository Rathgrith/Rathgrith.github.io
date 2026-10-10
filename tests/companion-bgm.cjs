/* Radio integration regression. The test double implements the documented YouTube
 * IFrame API surface (https://developers.google.com/youtube/iframe_api_reference)
 * and emits its numeric PlayerState events. It does not assert that ads, licensing,
 * or real YouTube playback work; those require a separate real-provider smoke test.
 */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out = process.env.QA_OUTPUT || require("node:os").tmpdir() + "/companion-bgm";
fs.mkdirSync(out, { recursive: true });

const { installYouTubeDouble, installTuningAudioDouble } = require("./helpers/companion-radio.cjs");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-gpu"] });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(installYouTubeDouble);
    await context.addInitScript(installTuningAudioDouble);
    const page = await context.newPage();
    const errors = [], mediaRequests = [];
    page.on("pageerror", e => errors.push(e.message));
    page.on("request", r => {
      if (/youtube(?:-nocookie)?\.com|ytimg\.com|googlevideo\.com|google-analytics\.com|googletagmanager\.com|clustrmaps\.com|music\.163\.com|music\.126\.net|\/assets\/music\/(?:radio\/[^/]+|companion\/[^/]+-ensemble)\.mp3/.test(r.url())) mediaRequests.push(r.url());
    });
    // Fail closed if the implementation accidentally bypasses the opt-in mock.
    await context.route(/https:\/\/[^/]*(?:youtube(?:-nocookie)?\.com|ytimg\.com|googlevideo\.com)\//, route => route.abort());
    const panel = page.locator(".vn-bgm"), receiver = page.locator(".vn-radio-receiver");
    const frame = () => receiver.locator("iframe");
    const selected = () => panel.getAttribute("data-radio-track");
    const playing = id => page.waitForFunction(id => {
      const p = window.__radioMock.active;
      return p && !p.destroyed && p.getPlayerState() === 1 && p.getCurrentTime() > .05 && (!id || p.videoId === id);
    }, id);
    const paused = () => page.waitForFunction(() => window.__radioMock.active?.getPlayerState() === 2);
    const changeCharacter = async id => {
      await page.locator(`button[data-vn-character="${id}"]`).click();
      await page.waitForFunction(id => document.querySelector(".vn-bgm")?.dataset.bgmCharacter === id, id);
    };
    await page.goto(base);
    await panel.waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert.equal(await frame().count(), 0, "ordinary visits create no external video iframe");
    assert.equal(await receiver.isVisible(), false);
    assert.equal(await page.evaluate(() => __tuningMock.contexts.length), 0, "ordinary visits create no AudioContext");
    assert.equal(await panel.getAttribute("data-bgm-state"), "paused");
    assert.equal(await page.locator("[data-bgm-mute]").getAttribute("aria-pressed"), "true");
    assert.equal(await panel.getAttribute("data-radio-mode"), "audio", "visits start in native audio mode");
    const playlist = await page.evaluate(() => CompanionRadioTracks);
    const nativeTracks = playlist.filter(t => t.src);
    const pvTracks = playlist.filter(t => t.videoId);
    const firstPV = pvTracks[0];
    const indexOf = id => playlist.findIndex(t => t.id === id);
    const nextPV = index => {
      for (let offset = 1; offset <= playlist.length; offset++) {
        const candidate = (index + offset) % playlist.length;
        if (playlist[candidate].videoId) return candidate;
      }
    };
    for (const [character, index] of [["marisa", 2], ["patchouli", 1], ["alice", 0]]) {
      await changeCharacter(character);
      assert.equal(await selected(), nativeTracks[index].id, `${character} opening recommendation`);
      assert.equal(await page.locator("[data-bgm-credit]").getAttribute("href"), nativeTracks[index].url);
    }
    await page.locator("[data-radio-pv]").click();
    assert.equal(await selected(), nativeTracks[0].id, "opening PV retains the same shared selection");
    await page.locator("[data-radio-station]").selectOption(String(indexOf(firstPV.id)));
    await page.locator("[data-bgm-volume]").fill("36");
    assert.equal(await frame().count(), 0);
    await page.locator("[data-radio-open]").click();
    assert(await receiver.isVisible());
    assert.equal(await frame().count(), 0, "browsing the station picker is still network silent");
    assert.deepEqual(mediaRequests, []);
    assert.equal(await page.evaluate(() => __tuningMock.contexts.length), 0, "browsing stations must not create audio");
    assert(nativeTracks.length >= 3 && pvTracks.length >= 3);
    assert.equal(await page.locator("[data-radio-station] option").count(), playlist.length);
    assert(playlist.every(t => t.src && t.lyrics && t.videoId), "every shipped song has local audio, bundled lyrics, and a paired PV");
    assert.equal(await page.locator("[data-bgm-credit]").getAttribute("href"), firstPV.url);
    const listeningTracks = playlist.filter(t => t.listen);
    for (const track of listeningTracks) {
      assert(track.videoId && track.listen.name);
      const url = new URL(track.listen.url);
      assert.equal(url.protocol, "https:");
      assert(["music.163.com", "music.apple.com", "touhoulostword.com"].includes(url.hostname));
      await page.locator("[data-radio-station]").selectOption(String(indexOf(track.id)));
      const listen = page.locator("[data-radio-listen]");
      assert(await listen.isVisible());
      assert.equal(await listen.getAttribute("href"), track.listen.url);
      assert.equal((await listen.textContent()).trim(), track.listen.name + " ↗");
      assert.equal(await listen.getAttribute("target"), "_blank");
      assert((await listen.getAttribute("rel")).includes("noreferrer"));
      assert.equal(await frame().count(), 0, "showing an external listening link never loads its provider");
    }
    const withoutListeningLink = playlist.find(track => !track.listen);
    if (withoutListeningLink) {
      await page.locator("[data-radio-station]").selectOption(String(indexOf(withoutListeningLink.id)));
      assert(!(await page.locator("[data-radio-listen]").isVisible()), "songs without extra platform links do not retain the previous link");
      assert.equal(await page.locator("[data-radio-listen]").getAttribute("href"), null);
    }
    await page.locator("[data-radio-station]").selectOption(String(indexOf(firstPV.id)));
    assert.deepEqual(mediaRequests, [], "default and browsing do not contact NetEase or video providers");
    await page.locator("[data-radio-start]").click();
    await playing(firstPV.videoId);
    assert.equal(await frame().count(), 1);
    assert.equal(await page.evaluate(() => __radioMock.active.options.host), "https://www.youtube-nocookie.com");
    assert.equal(await page.evaluate(() => __radioMock.active.getVolume()), 36);
    assert.equal(await page.evaluate(() => __radioMock.active.isMuted()), false);
    assert.equal(await page.evaluate(() => __tuningMock.sources.filter(s => s.started).length), 1);
    assert(await page.evaluate(() => __tuningMock.sources[0].buffer.duration <= .45 && __tuningMock.filters[0].type === "bandpass" && Math.max(...__tuningMock.gains[0].values) <= .055 * .36 + .0001), "tuning noise is short, band-limited, and volume-scaled");
    await page.locator("[data-bgm-mute]").click();
    assert(await page.evaluate(() => __radioMock.active.isMuted()));
    await page.locator("[data-bgm-mute]").click();
    assert(!(await page.evaluate(() => __radioMock.active.isMuted())));
    await page.locator("[data-bgm-seek]").fill("400");
    assert(await page.evaluate(() => __radioMock.active.getCurrentTime() >= __radioMock.active.getDuration() * .4));
    await page.locator("[data-bgm-play]").click();
    await paused();
    await page.locator("[data-bgm-play]").click();
    await playing(firstPV.videoId);

    // Native controls and deliberate silence survive both transport and lifecycle changes.
    await page.evaluate(() => { __radioMock.active.mute(); __radioMock.active.setVolume(8); });
    await page.waitForFunction(() => document.querySelector("[data-bgm-volume]").value === "8" && document.querySelector("[data-bgm-mute]").getAttribute("aria-pressed") === "true");
    const silentStarts = await page.evaluate(() => __tuningMock.sources.length);
    await page.locator("[data-bgm-play]").click(); await paused();
    await page.locator("[data-bgm-play]").click(); await playing();
    await page.locator("[data-companion-minimize]").click(); await paused();
    await page.locator("[data-companion-minimize]").click(); await playing();
    assert(await page.evaluate(() => __radioMock.active.isMuted() && __radioMock.active.getVolume() === 8));
    assert.equal(await page.evaluate(() => __tuningMock.sources.length), silentStarts, "muted resumes produce no static");
    await page.evaluate(() => __radioMock.active.unMute());
    await page.waitForFunction(() => document.querySelector("[data-bgm-mute]").getAttribute("aria-pressed") === "false");
    await page.locator("[data-bgm-volume]").fill("0");
    await page.locator("[data-bgm-play]").click(); await paused();
    await page.locator("[data-bgm-play]").click(); await playing();
    assert.equal(await page.evaluate(() => __radioMock.active.getVolume()), 0, "Play preserves an intentional zero volume");
    assert.equal(await page.evaluate(() => __tuningMock.sources.length), silentStarts);
    await page.locator("[data-bgm-volume]").fill("36");

    await page.evaluate(() => __radioMock.active.buffer());
    await page.waitForFunction(() => document.querySelector(".vn-bgm").dataset.bgmState === "loading");
    await page.evaluate(() => __radioMock.active.nativePause());
    await page.waitForFunction(() => document.querySelector("[data-bgm-play]").getAttribute("aria-label") === "ラジオを再生");
    await page.locator("[data-companion-minimize]").click();
    await page.locator("[data-companion-minimize]").click();
    assert.equal(await page.evaluate(() => __radioMock.active.getPlayerState()), 2, "a native pause during buffering cancels playback intent");
    await page.locator("[data-bgm-play]").click(); await playing();

    // Explicit queue selections survive character/theme switches.
    const targetIndex = indexOf(pvTracks[1].id);
    const afterTarget = nextPV(targetIndex), afterNext = nextPV(afterTarget);
    const oldLoads = await page.evaluate(() => __radioMock.calls.filter(c => c[0] === "load").length);
    const oldNoise = await page.evaluate(() => __tuningMock.sources.length);
    await page.locator("[data-radio-station]").selectOption(String(targetIndex));
    await page.waitForFunction(() => document.querySelector(".vn-bgm").dataset.bgmState === "intermission");
    assert.equal((await page.locator("[data-radio-intro]").textContent()).trim(), playlist[targetIndex].intro);
    assert.equal(await selected(), playlist[targetIndex].id);
    assert.equal(await page.evaluate(() => __tuningMock.sources.length), oldNoise + 1, "explicit tuning creates a static burst");
    await page.waitForTimeout(4100);
    assert.equal(await page.evaluate(() => __radioMock.calls.filter(c => c[0] === "load").length), oldLoads, "DJ break must not overlap the next track");
    await playing(playlist[targetIndex].videoId);
    const automaticNoise = await page.evaluate(() => __tuningMock.sources.length);
    await changeCharacter("patchouli");
    assert.equal(await selected(), playlist[targetIndex].id);
    await playing(playlist[targetIndex].videoId);
    await page.evaluate(() => __radioMock.active.end());
    await page.waitForFunction(() => document.querySelector(".vn-bgm").dataset.bgmState === "intermission");
    assert.equal(await selected(), playlist[afterTarget].id);
    assert.equal((await page.locator("[data-radio-intro]").textContent()).trim(), playlist[afterTarget].intro);
    await playing(playlist[afterTarget].videoId);
    assert.equal(await page.evaluate(() => __tuningMock.sources.length), automaticNoise, "automatic queue advance does not create static");
    await page.locator("[data-bgm-next]").click();
    assert.equal(await selected(), playlist[afterNext].id);
    await playing(playlist[afterNext].videoId);

    // Browser-local LRC fixture is original test text, not third-party lyrics.
    await page.locator("[data-lyrics-file]").setInputFiles({
      name: "radio-original-fixture.lrc", mimeType: "text/plain",
      buffer: Buffer.from("[ti:Original integration fixture]\n[00:02.00]受信テスト、一行目。\n[00:05.00]受信テスト、二行目。\n[00:09.00]受信テスト、三行目。\n")
    });
    await page.waitForFunction(() => document.querySelector(".vn-radio-lyrics").dataset.lyricsState === "ready");
    await page.evaluate(() => __radioMock.active.seekTo(5.1));
    await page.waitForFunction(() => document.querySelector("[data-lyrics-current]").textContent === "受信テスト、二行目。");
    assert.equal(await page.locator("[data-lyrics-previous]").textContent(), "受信テスト、一行目。");
    assert.equal(await page.locator("[data-lyrics-next]").textContent(), "受信テスト、三行目。");
    await page.locator("[data-bgm-play]").click();
    await paused();
    await page.evaluate(() => __radioMock.active.seekTo(5.1));
    await page.waitForTimeout(750);
    await page.locator("[data-lyrics-later]").click();
    assert.equal(await page.locator("[data-lyrics-offset]").textContent(), "＋0.5秒");
    assert.equal(await page.locator("[data-lyrics-current]").textContent(), "受信テスト、一行目。");
    await page.locator("[data-lyrics-reset]").click();
    assert.equal(await page.locator("[data-lyrics-current]").textContent(), "受信テスト、二行目。");
    await page.locator("[data-bgm-play]").click();
    await playing();

    // Window and game lifecycle pauses the radio, preserving explicit play intent.
    await page.locator("[data-companion-minimize]").click();
    await paused(); assert(!(await receiver.isVisible()));
    await page.locator("[data-companion-minimize]").click();
    await playing(); assert(await receiver.isVisible());
    await page.locator("[data-danmaku-open]").click();
    await paused(); assert(!(await receiver.isVisible()));
    await page.locator("[data-danmaku-exit]").click();
    await playing();
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
    await paused(); assert(!(await receiver.isVisible()));
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
    await playing();
    await page.evaluate(() => { window.receiverBeforeNavigation = document.querySelector(".vn-radio-receiver"); window.playerBeforeNavigation = __radioMock.active; });
    await page.locator('[data-classic-page="gallery"]').click();
    await page.waitForURL("**/gallery/");
    assert(await page.evaluate(() => document.querySelector(".vn-radio-receiver") === receiverBeforeNavigation && __radioMock.active === playerBeforeNavigation));
    await playing();
    assert.equal(await receiver.count(), 1);

    await page.evaluate(() => { window.oldRadioPlayer = __radioMock.active; });
    await page.locator("[data-radio-close]").click();
    assert.equal(await frame().count(), 0);
    assert(await page.evaluate(() => __radioMock.active.destroyed));
    assert(!(await receiver.isVisible()));
    await page.locator("[data-bgm-play]").click();
    await playing();
    assert.equal(await frame().count(), 1, "reopening creates exactly one fresh receiver frame");
    await page.evaluate(() => oldRadioPlayer.options.events.onAutoplayBlocked());
    assert.equal(await panel.getAttribute("data-bgm-state"), "playing", "late callbacks from a destroyed player cannot change its replacement");
    await page.evaluate(() => __radioMock.active.fail());
    await page.waitForFunction(() => document.querySelector(".vn-bgm").dataset.bgmState === "error");
    assert(await page.locator("[data-radio-source]").isVisible());
    await page.locator("[data-bgm-play]").click();
    await playing();
    await page.locator("[data-radio-close]").click();
    await page.reload();
    await panel.waitFor();
    assert.equal(await frame().count(), 0, "a full reload is silent even after a playing session");
    assert.equal(await page.locator("[data-bgm-volume]").inputValue(), "36");
    await page.locator("[data-radio-pv]").click();
    await page.locator("[data-radio-station]").selectOption(String(indexOf(firstPV.id)));
    await page.locator("[data-radio-close]").click();

    for (const width of [320, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      await page.locator("[data-bgm-play]").click();
      await playing();
      await page.waitForTimeout(250);
      const layout = await page.evaluate(() => {
        const e = document.querySelector(".vn-bgm"), r = e.getBoundingClientRect();
        const receiver = document.querySelector(".vn-radio-receiver"), q = receiver.getBoundingClientRect();
        const iframe = receiver.querySelector("iframe").getBoundingClientRect();
        return {
          pageFits: document.documentElement.scrollWidth <= innerWidth,
          panelFits: e.scrollWidth <= e.clientWidth + 1,
          receiverFits: q.left >= 0 && q.right <= innerWidth + 1 && q.top >= 0 && q.bottom <= innerHeight + 1,
          videoMinimum: iframe.width >= 200 && iframe.height >= 200,
          controlsFit: [...e.querySelectorAll("button,input")].filter(c => c.getClientRects().length).every(c => { const b = c.getBoundingClientRect(); return b.left >= r.left - 1 && b.right <= r.right + 1 && b.width >= 20; }),
          receiverContentFits: receiver.scrollWidth <= receiver.clientWidth + 1,
        };
      });
      assert(Object.values(layout).every(Boolean), JSON.stringify({ width, layout }));
      await receiver.screenshot({ path: `${out}/radio-${width}.png` });
      await page.locator("[data-radio-close]").click();
    }
    assert.deepEqual(mediaRequests, [], "mocked regression must never hit remote music or analytics endpoints");

    const recovery = await context.newPage();
    recovery.on("pageerror", e => errors.push(e.message));
    await recovery.goto(base);
    await recovery.locator(".vn-bgm").waitFor();
    await recovery.locator("[data-radio-pv]").click();
    await recovery.locator("[data-radio-station]").selectOption(String(indexOf(firstPV.id)));
    await recovery.evaluate(() => { __radioMock.holdReady = true; });
    await recovery.locator("[data-bgm-play]").click();
    await recovery.waitForFunction(() => __radioMock.active);
    await recovery.evaluate(() => { window.failedBeforeReady = __radioMock.active; __radioMock.active.fail(); });
    await recovery.locator("[data-radio-station]").selectOption(String(targetIndex));
    assert(await recovery.evaluate(() => failedBeforeReady.destroyed), "changing songs discards a player that failed before onReady");
    await recovery.locator("[data-bgm-play]").click();
    await recovery.waitForFunction(() => __radioMock.active !== failedBeforeReady);
    await recovery.evaluate(() => __radioMock.active.releaseReady());
    await recovery.waitForFunction(() => __radioMock.active.getPlayerState() === 1);

    // Every visibility stop cancels a live burst; restoring never creates another.
    for (const stop of ["pause", "hidden", "game", "close"]) {
      await recovery.evaluate(() => { __radioMock.holdReady = false; document.querySelector("[data-radio-close]").click(); });
      await recovery.locator("[data-bgm-play]").click();
      await recovery.waitForFunction(() => __radioMock.active.getPlayerState() === 1);
      const stopped = await recovery.evaluate(stop => {
        const hadNoise = __tuningMock.sources.some(s => s.active), count = __tuningMock.sources.length;
        if (stop === "pause") document.querySelector("[data-bgm-play]").click();
        if (stop === "hidden") { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); }
        if (stop === "game") CompanionBGM.mount().setGameActive(true);
        if (stop === "close") document.querySelector("[data-radio-close]").click();
        const canceled = !__tuningMock.sources.some(s => s.active);
        if (stop === "hidden") { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); }
        if (stop === "game") CompanionBGM.mount().setGameActive(false);
        return { hadNoise, canceled, noNewNoise: count === __tuningMock.sources.length };
      }, stop);
      assert(stopped.hadNoise && stopped.canceled && stopped.noNewNoise, `${stop}: ${JSON.stringify(stopped)}`);
    }
    await recovery.close();

    const blockedAudio = await context.newPage();
    blockedAudio.on("pageerror", e => errors.push(e.message));
    await blockedAudio.goto(base);
    await blockedAudio.locator(".vn-bgm").waitFor();
    await blockedAudio.locator("[data-radio-pv]").click();
    await blockedAudio.locator("[data-radio-station]").selectOption(String(indexOf(firstPV.id)));
    await blockedAudio.evaluate(() => { __tuningMock.mode = "reject"; });
    await blockedAudio.locator("[data-bgm-play]").click();
    await blockedAudio.waitForFunction(() => __radioMock.active?.getPlayerState() === 1);
    assert.equal(await blockedAudio.evaluate(() => __tuningMock.sources.length), 0, "blocked Web Audio does not block music");
    await blockedAudio.locator("[data-bgm-play]").click();
    await blockedAudio.evaluate(() => { __tuningMock.mode = "pending"; });
    await blockedAudio.locator("[data-bgm-play]").click();
    await blockedAudio.locator("[data-bgm-play]").click();
    await blockedAudio.evaluate(() => __tuningMock.releases.splice(0).forEach(release => release()));
    await blockedAudio.waitForTimeout(50);
    assert.equal(await blockedAudio.evaluate(() => __tuningMock.sources.length), 0, "late audio resume after Pause cannot emit a burst");
    await blockedAudio.close();

    const blocked = await context.newPage();
    blocked.on("pageerror", e => errors.push(e.message));
    await blocked.addInitScript(() => { Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException("blocked", "SecurityError"); }; });
    await blocked.goto(base);
    await blocked.locator(".vn-bgm").waitFor();
    await blocked.locator("[data-radio-pv]").click();
    await blocked.locator("[data-radio-station]").selectOption(String(indexOf(firstPV.id)));
    assert.equal(await blocked.locator(".vn-radio-receiver iframe").count(), 0);
    await blocked.locator("[data-bgm-play]").click();
    await blocked.waitForFunction(() => __radioMock.active?.getPlayerState() === 1);
    assert.deepEqual(errors, []);
    console.log("PASS: paired local-song/PV catalog and optional external listening links, silent/network-free default, 3 recommendations, mode-aware PV queue persistence, DJ transitions, native/custom audio controls, buffering pause, local LRC sync/offset, lifecycle, retained player, unready retry, stale callbacks, bounded/cancellable opt-in tuning noise, blocked audio/storage, and 4 responsive widths (documented YT mock; real provider smoke separate).");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
