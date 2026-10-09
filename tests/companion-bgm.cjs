/* Real MP3 playback and lifecycle regression checks; no fake Audio implementation. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out = process.env.QA_OUTPUT || require("node:os").tmpdir() + "/companion-bgm";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true, args: ["--disable-gpu"] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [], requests = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("request", (r) => { if (r.url().endsWith("-ensemble.mp3")) requests.push(r.url()); });
    const audio = () => page.locator("[data-companion-audio]");
    const playing = (id) => page.waitForFunction((id) => {
      const a = document.querySelector("[data-companion-audio]");
      return !a.paused && a.currentTime > .2 && Number.isFinite(a.duration) && (!id || a.src.endsWith(id + "-ensemble.mp3"));
    }, id);
    await page.goto(base);
    await page.locator(".vn-bgm").waitFor();
    await page.evaluate(() => document.fonts.ready);
    assert(await audio().evaluate(a => a.paused && a.muted && !a.getAttribute("src") && a.preload === "none" && a.loop));
    for (const id of ["marisa", "patchouli", "alice"]) {
      await page.locator(`button[data-vn-character="${id}"]`).click();
      await page.waitForFunction(id => document.querySelector(".vn-bgm").dataset.bgmCharacter === id, id);
      assert.equal(await page.locator("audio").count(), 1);
    }
    assert.deepEqual(requests, [], "default character changes must not download music");
    await page.locator("[data-bgm-volume]").fill("36");
    assert(await audio().evaluate(a => a.paused && a.muted));
    await page.locator("[data-bgm-play]").click();
    await playing("alice");
    assert.equal(await audio().evaluate(a => a.muted), false);
    await page.waitForTimeout(400);
    assert(Math.abs(await audio().evaluate(a => a.volume) - .36) < .01);
    await page.locator("[data-bgm-mute]").click();
    assert(await audio().evaluate(a => a.muted && !a.paused));
    await page.locator("[data-bgm-mute]").click();
    await page.locator("[data-bgm-seek]").fill("400");
    assert(await audio().evaluate(a => a.currentTime > a.duration * .38));
    await page.locator("[data-bgm-play]").click();
    assert(await audio().evaluate(a => a.paused));
    await page.locator('button[data-vn-character="patchouli"]').click();
    assert(await audio().evaluate(a => a.paused && !a.getAttribute("src")));
    await page.locator("[data-bgm-play]").click();
    await playing("patchouli");
    await page.locator('button[data-vn-character="marisa"]').click();
    await playing("marisa");
    for (const id of ["alice", "patchouli", "marisa", "alice"]) {
      await page.evaluate(id => document.querySelector('button[data-vn-character="' + id + '"]').click(), id);
    }
    await playing("alice");
    assert.equal(await page.locator(".vn-bgm").getAttribute("data-bgm-character"), "alice");
    // Loop the actual asset, including its release tail.
    await audio().evaluate(a => { a.currentTime = a.duration - .2; });
    await page.waitForFunction(() => { const a = document.querySelector("audio"); return !a.paused && a.currentTime < 2; });
    await page.locator("[data-companion-minimize]").click();
    assert(await audio().evaluate(a => a.paused));
    await page.locator("[data-companion-minimize]").click();
    await playing("alice");
    await page.locator("[data-danmaku-open]").click();
    assert(await audio().evaluate(a => a.paused));
    await page.locator("[data-danmaku-exit]").click();
    await playing("alice");
    await page.locator("[data-companion-close]").click();
    assert(await audio().evaluate(a => a.paused));
    await page.evaluate(() => SiteCompanionVisibility.set(true));
    await playing("alice");
    // Exercise the visibility handler without browser-specific tab occlusion heuristics.
    await page.evaluate(() => { Object.defineProperty(document, "hidden", { configurable: true, value: true }); document.dispatchEvent(new Event("visibilitychange")); });
    assert(await audio().evaluate(a => a.paused));
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event("visibilitychange")); });
    await playing("alice");
    await page.evaluate(() => { window.bgmBeforeNavigation = document.querySelector("audio"); });
    await page.locator('[data-classic-page="gallery"]').click();
    await page.waitForURL("**/gallery/");
    assert(await page.evaluate(() => document.querySelector("audio") === window.bgmBeforeNavigation));
    await playing("alice");
    assert.equal(await page.locator("audio").count(), 1);
    await page.reload();
    await page.locator(".vn-bgm").waitFor();
    assert(await audio().evaluate(a => a.paused && a.muted && !a.getAttribute("src")));
    assert.equal(await page.locator("[data-bgm-volume]").inputValue(), "36");
    for (const id of ["alice", "marisa", "patchouli"]) {
      await page.locator(`button[data-vn-character="${id}"]`).click();
      for (const width of [320, 375, 768, 1000, 1440, 1920]) {
        await page.setViewportSize({ width, height: 1000 });
        await page.waitForTimeout(120);
        const layout = await page.locator(".vn-bgm").evaluate(e => {
          const r = e.getBoundingClientRect(), view = e.closest(".vn-main-view");
          return {
            pageFits: document.documentElement.scrollWidth <= innerWidth,
            panelFits: e.scrollWidth <= e.clientWidth,
            noNestedScroll: view.scrollHeight <= view.clientHeight + 1,
            controlsFit: [...e.querySelectorAll("button,input")].every(c => { const q = c.getBoundingClientRect(); return q.left >= r.left && q.right <= r.right && q.width >= 20; }),
          };
        });
        assert(Object.values(layout).every(Boolean), JSON.stringify({ id, width, layout }));
        if ([375, 1440].includes(width)) await page.locator("#live2d-widget").screenshot({ path: `${out}/${id}-${width}.png` });
      }
    }
    // Broken media is recoverable and never affects conversation controls.
    await page.route("**/patchouli-ensemble.mp3", route => route.fulfill({ status: 404, body: "missing" }));
    await page.locator("[data-bgm-play]").click();
    await page.waitForFunction(() => document.querySelector(".vn-bgm").dataset.bgmState === "error");
    assert(await audio().evaluate(a => a.paused));
    await page.unroute("**/patchouli-ensemble.mp3");
    await page.locator("[data-bgm-play]").click();
    await playing("patchouli");
    await page.locator("[data-bgm-play]").click();
    // Blocked storage must not prevent default silence or playback.
    const blocked = await browser.newPage();
    await blocked.addInitScript(() => {
      Storage.prototype.getItem = Storage.prototype.setItem = () => { throw new DOMException("blocked", "SecurityError"); };
    });
    blocked.on("pageerror", e => errors.push(e.message));
    await blocked.goto(base);
    await blocked.locator(".vn-bgm").waitFor();
    assert(await blocked.locator("audio").evaluate(a => a.paused && a.muted));
    await blocked.locator("[data-bgm-play]").click();
    await blocked.waitForFunction(() => document.querySelector("audio").currentTime > .2);
    assert.deepEqual(errors, []);
    console.log("PASS: real playback for 3 themes, silent/no-request default, volume, mute, seek, loop, rapid switches, lifecycle, retained audio, retry, blocked storage; 18 responsive layouts.");
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
