/* Exercise Chrome's MP3 demuxer, including an invalid conditional byte-range
 * response when it seeks beyond the initial buffer. No media methods are mocked. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const http = require("node:http");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const assets = path.resolve(__dirname, "../assets");
const mixer = fs.readFileSync(path.join(assets, "js/games/danmaku-audio.js"));
const score = fs.readFileSync(path.join(assets, "js/games/danmaku-score.js"));
const recordings = Object.fromEntries(["marisa", "alice"].map(id =>
  [id, fs.readFileSync(path.join(assets, "music/danmaku", id + "-dbu.mp3"))]));
const html = `<!doctype html><meta charset="utf-8">
<div id="game"><div class="danmaku-header"></div></div>
<script src="/score.js"></script><script src="/mixer.js" data-sfx-base="/"></script>`;

async function check(browser, action) {
  let recovery, downloads = 0;
  const brokenOffsets = [];
  const server = http.createServer((req, res) => {
    if (req.url === "/") return res.writeHead(200, {"Content-Type":"text/html"}).end(html);
    if (req.url === "/score.js" || req.url === "/mixer.js")
      return res.writeHead(200, {"Content-Type":"text/javascript"}).end(req.url === "/score.js" ? score : mixer);
    const id = Object.keys(recordings).find(key => req.url === "/assets/music/danmaku/" + key + "-dbu.mp3");
    if (!id) return res.writeHead(404).end();
    const bytes = recordings[id];
    const headers = {"Content-Type":"audio/mpeg", "Accept-Ranges":"bytes", ETag:'"' + id + '"'};
    const range = /^bytes=(\d+)-(\d*)$/.exec(req.headers.range || "");
    if (!range) {
      if (id === "marisa") {
        downloads++;
        recovery = res;
        if (action === "retry" && downloads === 1)
          return res.writeHead(503, {"Cache-Control":"no-store"}).end();
        // Keep the whole-file recovery pending so the game clock can move or
        // the player can change their choice before the response arrives.
        res.writeHead(200, {...headers, "Content-Length":bytes.length});
        res.write(bytes.subarray(0, 65536));
      } else res.writeHead(200, {...headers, "Content-Length":bytes.length}).end(bytes);
      return;
    }
    const start = Number(range[1]), end = range[2] ? Number(range[2]) : bytes.length - 1;
    if (id === "marisa" && start > 0) {
      brokenOffsets.push(start);
      return res.writeHead(304).end(); // The invalid If-Range response seen on the preview.
    }
    res.writeHead(206, {...headers, "Content-Range":'bytes ' + start + '-' + end + '/' + bytes.length,
      "Content-Length":end - start + 1});
    if (id === "marisa") res.write(bytes.subarray(0, 131072));
    else res.end(bytes.subarray(start, end + 1));
  });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  const page = await browser.newPage();
  const music = page.locator("[data-danmaku-music]");
  try {
    await page.goto("http://127.0.0.1:" + server.address().port);
    await page.evaluate(() => {
      const mixer = DanmakuAudio.create(document.querySelector("#game"), {enabled:false});
      const state = {time:153.9, phase:"playing", countdown:0, intermission:null};
      // A real click both grants autoplay permission and starts the analyser.
      // Only the BGM feeds the analyser. Sound effects stay disabled.
      const button = document.querySelector("[data-danmaku-music]");
      button.addEventListener("click", () => {
        const context = new AudioContext();
        const analyser = context.createAnalyser();
        const audio = document.querySelector("[data-danmaku-audio]");
        context.createMediaElementSource(audio).connect(analyser).connect(context.destination);
        context.resume();
        window.bgmRms = () => {
          const data = new Float32Array(analyser.fftSize);
          analyser.getFloatTimeDomainData(data);
          return Math.sqrt(data.reduce((sum, value) => sum + value * value, 0) / data.length);
        };
      }, {once:true});
      window.rig = {mixer, state};
      mixer.setScene("playing", "marisa", true);
      mixer.syncTimeline(state);
    });
    await music.click();
    await assertWhen(() => recovery, "the native later-range error must start a whole-file recovery");
    assert(brokenOffsets.some(offset => offset > recordings.marisa.length / 2),
      "the failing Range must belong to the second half of the recording");

    if (action === "resume" || action === "retry") {
      if (action === "retry") {
        const retry = page.getByRole("button", {name:"BGM を再試行"});
        await retry.waitFor();
        assert.match(await page.getByRole("status").textContent(), /再試行/);
        // Keep the actual frame updates running across the resume throttle.
        // An unavailable whole track must wait for the player's next click.
        await page.evaluate(() => new Promise(resolve => {
          const start = performance.now();
          function frame(now) {
            rig.state.time = 153.9 + (now - start) / 1000;
            rig.mixer.syncTimeline(rig.state);
            if (now - start >= 1500) resolve();
            else requestAnimationFrame(frame);
          }
          requestAnimationFrame(frame);
        }));
        assert.equal(downloads, 1, "a failed full-track request must not loop automatically");
        await retry.click();
        await assertWhen(() => downloads === 2, "a trusted Retry must allow a fresh recovery");
      }
      // The clock advances past the failed cue while the download is pending.
      await page.evaluate(() => { rig.state.time = 160; rig.mixer.syncTimeline(rig.state); });
      recovery.end(recordings.marisa.subarray(65536));
      await page.waitForFunction(() => {
        const a = document.querySelector("[data-danmaku-audio]");
        return !a.paused && !a.seeking && a.currentTime >= 160 && a.currentTime < 162 && bgmRms() > .003;
      });
      const position = await page.locator("audio").evaluate(a => a.currentTime);
      await page.waitForFunction(time => document.querySelector("audio").currentTime > time + .35 && bgmRms() > .003, position);
      if (action === "resume") {
        const source = await page.locator("audio").evaluate(a => a.currentSrc);
        await music.click();
        assert(await page.locator("audio").evaluate(a => a.paused && a.muted));
        await page.evaluate(() => { rig.state.time = 167; rig.mixer.syncTimeline(rig.state); });
        await music.click();
        await page.waitForFunction(recovered => {
          const a = document.querySelector("audio");
          return a.currentSrc === recovered && !a.paused && !a.seeking &&
            a.currentTime >= 167 && a.currentTime < 169 && bgmRms() > .003;
        }, source);
      }
      assert.equal(await music.getAttribute("aria-pressed"), "true");
      assert.equal(await music.getAttribute("aria-label"), "BGM を切る");
    } else {
      if (action === "disable") await music.click();
      else await page.evaluate(() => {
        rig.state.time = 0;
        rig.mixer.setScene("playing", "alice", true);
        rig.mixer.syncTimeline(rig.state);
      });
      await assertWhen(() => recovery.destroyed, "changing the track or disabling BGM must abort the pending response");
      if (action === "disable") {
        assert.equal(await music.getAttribute("aria-pressed"), "false");
        assert(await page.locator("audio").evaluate(a => a.paused && a.muted));
      } else {
        await page.waitForFunction(() => {
          const a = document.querySelector("audio");
          return a.currentSrc.endsWith("/alice-dbu.mp3") && a.currentTime > .3 && !a.paused && bgmRms() > .003;
        });
      }
    }
    assert.equal(downloads, action === "retry" ? 2 : 1,
      "each user-initiated attempt must download the full track only once");
    console.log("PASS late-range recovery / " + action);
  } finally {
    await page.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
async function assertWhen(condition, message) {
  const deadline = Date.now() + 6000;
  while (!condition() && Date.now() < deadline) await new Promise(resolve => setTimeout(resolve, 25));
  assert(condition(), message);
}
(async () => {
  const browser = await chromium.launch({channel:"chrome", headless:true});
  try {
    for (const action of ["resume", "disable", "switch", "retry"]) await check(browser, action);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
