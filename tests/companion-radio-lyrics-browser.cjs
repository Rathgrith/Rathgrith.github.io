/* Bundled LRC loading and local overrides, using invented labels on an isolated origin. */
"use strict";
const assert = require("node:assert/strict");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const source = path.join(__dirname, "../assets/js/core/companion-radio-lyrics.js");
const file = text => ({ name: "test.lrc", mimeType: "text/plain", buffer: Buffer.from(text) });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-gpu"] });
  try {
    const page = await browser.newPage();
    const requests = [];
    await page.route("**/*", route => {
      const url = new URL(route.request().url());
      requests.push(url.href);
      if (url.pathname === "/") return route.fulfill({ contentType: "text/html", body: "<!doctype html><div id=lyrics></div>" });
      if (url.pathname === "/missing.lrc") return route.fulfill({ status: 404, body: "Not found" });
      if (url.pathname === "/redirect.lrc") return route.fulfill({ status: 302, headers: { location: "https://other.test/lyrics.lrc" } });
      return route.fulfill({ contentType: "text/plain", body: `[00:00]${url.pathname}\n[00:02]<img src=x onerror=alert(1)>` });
    });
    await page.goto("https://lyrics.test/");
    await page.evaluate(() => {
      window.fetches = [];
      const nativeFetch = window.fetch;
      window.fetch = (url, options) => {
        const call = { url, options };
        fetches.push(call);
        // Deliberately resolve even after abort to exercise stale-result guards.
        if (url.includes("/deferred")) return new Promise(resolve => { call.resolve = text => resolve(new Response(text)); });
        if (url.endsWith("/large-header.lrc")) return Promise.resolve(new Response("[00:00]small", { headers: { "Content-Length": "300000" } }));
        if (url.endsWith("/large-stream.lrc")) return Promise.resolve(new Response(new ReadableStream({
          start(controller) {
            for (let i = 0; i < 5; i++) controller.enqueue(new Uint8Array(50000).fill(65));
            controller.close();
          }
        })));
        if (url.endsWith("/invalid-utf8.lrc")) return Promise.resolve(new Response(new Uint8Array([0xff, 0xff])));
        return nativeFetch(url, options);
      };
    });
    await page.addScriptTag({ path: source });
    await page.evaluate(() => { window.lrc = CompanionRadioLyrics.mount(document.querySelector("#lyrics")); });
    const input = page.locator("[data-lyrics-file]");
    const current = page.locator("[data-lyrics-current]");
    const status = page.locator("[data-lyrics-status]");
    const setTrack = (id, src) => page.evaluate(([id, src]) => lrc.setTrack(id, src), [id, src]);
    const displayed = text => page.waitForFunction(text => document.querySelector("[data-lyrics-current]").textContent === text, text);
    const errorShown = () => page.waitForFunction(() => document.querySelector("[data-lyrics-status]").textContent.includes("読み込めません"));
    const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem("site-companion-radio-lrc-v1")).tracks);
    const resolveDeferred = (suffix, text) => page.evaluate(([suffix, text]) => fetches.find(call => call.url.endsWith(suffix)).resolve(text), [suffix, text]);
    const wasAborted = suffix => page.evaluate(suffix => fetches.find(call => call.url.endsWith(suffix)).options.signal.aborted, suffix);

    await setTrack("A", "/a.lrc");
    await displayed("/a.lrc");
    assert(await page.evaluate(() => fetches[0].options.mode === "same-origin" && fetches[0].options.redirect === "error"));
    await page.locator("[data-lyrics-later]").click();
    assert.equal((await saved()).A.delay, .5);
    assert.equal((await saved()).A.lrc, undefined, "bundled text does not consume local override storage");
    await page.evaluate(() => { lrc.destroy(); window.lrc = CompanionRadioLyrics.mount(document.querySelector("#lyrics")); lrc.setTrack("A", "/a.lrc"); lrc.setTime(2.25); });
    await displayed("/a.lrc");
    assert.equal(await page.locator("[data-lyrics-offset]").textContent(), "＋0.5秒", "bundled timing adjustment survives remount");
    await page.evaluate(() => lrc.setTime(2.5));
    await displayed("<img src=x onerror=alert(1)>");
    assert.equal(await current.locator("img").count(), 0, "lyrics are text, never HTML");
    const beforeRepeat = await page.evaluate(() => fetches.length);
    await setTrack("A", "/a.lrc");
    assert.equal(await page.evaluate(() => fetches.length), beforeRepeat, "identical setTrack is idempotent");

    await setTrack("B", "/deferred-b.lrc");
    await setTrack("C", "/c.lrc");
    await displayed("/c.lrc");
    assert(await wasAborted("/deferred-b.lrc"));
    await resolveDeferred("/deferred-b.lrc", "[00:00]stale B");
    await page.waitForTimeout(20);
    assert.equal(await current.textContent(), "/c.lrc", "previous track cannot replace current lyrics");
    await setTrack("C", "/deferred-c.lrc");
    await setTrack("C", "/c-second.lrc");
    await displayed("/c-second.lrc");
    assert(await wasAborted("/deferred-c.lrc"));
    await resolveDeferred("/deferred-c.lrc", "[00:00]old source");
    await page.waitForTimeout(20);
    assert.equal(await current.textContent(), "/c-second.lrc", "same ID with a new source invalidates old requests");

    await setTrack("D", "/deferred-d.lrc");
    await input.setInputFiles(file("[00:00]manual D"));
    await displayed("manual D");
    assert(await wasAborted("/deferred-d.lrc"));
    await resolveDeferred("/deferred-d.lrc", "[00:00]bundled D");
    await page.waitForTimeout(20);
    assert.equal(await current.textContent(), "manual D", "manual import wins the fetch race");
    await page.locator("[data-lyrics-earlier]").click();
    const beforeOverride = await page.evaluate(() => fetches.length);
    await page.evaluate(() => { lrc.destroy(); window.lrc = CompanionRadioLyrics.mount(document.querySelector("#lyrics")); lrc.setTrack("D", "/d-second.lrc"); });
    assert.equal(await current.textContent(), "manual D");
    assert.equal(await page.locator("[data-lyrics-offset]").textContent(), "−0.5秒");
    assert.equal(await page.evaluate(() => fetches.length), beforeOverride, "persisted manual override takes priority without a fetch");

    // Picker-open context includes source changes, not only track identity.
    await setTrack("P", "/p.lrc");
    await displayed("/p.lrc");
    const pickerEvent = page.waitForEvent("filechooser");
    await page.locator("[data-lyrics-open]").click();
    const picker = await pickerEvent;
    await setTrack("P", "/p-second.lrc");
    await displayed("/p-second.lrc");
    await picker.setFiles(file("[00:00]old picker"));
    assert.equal(await current.textContent(), "/p-second.lrc");
    assert.match(await status.textContent(), /曲が切り替わりました/);

    // A slow local file read must not overwrite a subsequent source selection.
    await page.evaluate(() => { window.originalArrayBuffer = File.prototype.arrayBuffer; File.prototype.arrayBuffer = () => new Promise(resolve => { window.finishImport = resolve; }); });
    await input.setInputFiles(file("[00:00]slow local file"));
    await setTrack("P", "/p-third.lrc");
    await displayed("/p-third.lrc");
    await page.evaluate(() => { finishImport(new TextEncoder().encode("[00:00]slow local file").buffer); File.prototype.arrayBuffer = originalArrayBuffer; });
    await page.waitForTimeout(20);
    assert.equal(await current.textContent(), "/p-third.lrc");

    for (const src of ["https://other.test/lyrics.lrc", "data:text/plain,test", "javascript:void(0)"]) {
      const count = await page.evaluate(() => fetches.length);
      await setTrack(src, src);
      assert.equal(await page.evaluate(() => fetches.length), count, "non-same-origin sources are rejected before any request");
    }
    for (const src of ["/missing.lrc", "/redirect.lrc", "/large-header.lrc", "/large-stream.lrc", "/invalid-utf8.lrc"]) {
      await setTrack(src, src);
      await errorShown();
      assert.equal(await current.textContent(), "歌詞は未登録");
    }
    assert(requests.every(url => new URL(url).origin === "https://lyrics.test"), "redirects never send lyrics requests to another origin");
    await setTrack("local-only");
    await input.setInputFiles(file("[00:00]local only"));
    await displayed("local only");
    await setTrack("destroy", "/deferred-destroy.lrc");
    await page.evaluate(() => lrc.destroy());
    assert(await wasAborted("/deferred-destroy.lrc"));
    await resolveDeferred("/deferred-destroy.lrc", "[00:00]too late");
    await page.waitForTimeout(20);
    assert.equal(await page.locator(".vn-radio-lyrics").count(), 0);
    console.log("PASS: bundled loading, persisted timing, manual precedence, track/source/import/picker races, abort on destroy, same-origin/redirect rules, byte limits, UTF-8 and text-only rendering");
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
