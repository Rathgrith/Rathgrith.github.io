/* Recording-clock alignment and actual rendered spell/flight assets. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const out =
  process.env.QA_OUTPUT || require("node:os").tmpdir() + "/danmaku-score";
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1120, height: 1200 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route(base + "score-test", (r) =>
      r.fulfill({
        contentType: "text/html",
        body: `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="/assets/css/classic-companion.css"><style>body{margin:20px;background:#111a28;color:#ddd;font:14px 'Fusion Pixel';}#cards{display:grid;grid-template-columns:repeat(3,320px);gap:18px;}figure{margin:0}canvas{width:320px;height:480px}figcaption{height:38px;line-height:18px}#flights{margin-top:28px}#flights img{width:1080px;height:288px;image-rendering:pixelated}header{display:flex;width:1080px;}header span{width:120px;text-align:center}</style><div id="cards"></div><div id="flights"></div><script src="/assets/js/games/danmaku-score.js"></script><script src="/assets/js/games/danmaku-patterns.js"></script><script src="/assets/js/games/danmaku-scroll.js"></script><script src="/assets/js/games/danmaku-engine.js"></script><script src="/assets/js/games/danmaku-boss-sprites.js"></script><script src="/assets/js/games/danmaku-renderer.js"></script>`,
      })
    );
    await page.goto(base + "score-test");
    const actual = await page.evaluate(async () => {
      await document.fonts.load('12px "Fusion Pixel"');
      let stats = [];
      for (const id of ["alice", "marisa", "patchouli"]) {
        for (let card = 0; card < 6; card++) {
          const fig = document.createElement("figure"),
            label = document.createElement("figcaption"),
            canvas = document.createElement("canvas");
          const g = DanmakuEngine.create(id, id, 1977),
            s = g.state;
          s.countdown = 0;
          s.player.invulnerable = 999;
          s.time = DanmakuScore.getTrack(id).phrases[card].start + 0.01;
          // Let real production volleys reach the lower arena before visual inspection.
          for (let f = 0; f < 720; f++) {
            s.enemySpell.hp = s.enemySpell.maxHp = 9999;
            g.step(1 / 60);
          }
          const renderer = DanmakuRenderer.create(canvas);
          await renderer.ready;
          renderer.draw(s);
          label.textContent = card + 1 + " / 6 · " + s.enemySpell.name;
          fig.append(label, canvas);
          document.querySelector("#cards").append(fig);
          stats.push({
            id,
            card,
            spell: s.enemySpell.id,
            bullets: s.bullets.length,
            lasers: s.lasers.length,
          });
          // Trigger the actual timed clear, then run its distinct nonspell interlude.
          s.time = s.rhythm.spellEnd - 0.01;
          g.step(1 / 60);
          for (let frame = 0; frame < 420; frame++) {
            s.enemySpell.hp = 9999;
            g.step(1 / 60);
          }
          if (
            !s.enemySpell.nonspell ||
            !s.enemySpell.nonspellName ||
            !(s.bullets.length + s.lasers.length)
          )
            throw Error("Missing playable nonspell " + id + ":" + card);
          const nf = document.createElement("figure"),
            nl = document.createElement("figcaption"),
            nc = document.createElement("canvas");
          const nr = DanmakuRenderer.create(nc);
          await nr.ready;
          nr.draw(s);
          nl.textContent =
            card + 1 + " / 6 · 通常「" + s.enemySpell.nonspellName + "」";
          nf.append(nl, nc);
          let ng = document.querySelector("#nonspells");
          if (!ng) {
            ng = document.createElement("div");
            ng.id = "nonspells";
            ng.style.cssText =
              "display:grid;grid-template-columns:repeat(3,320px);gap:18px;margin-top:30px";
            document.querySelector("#cards").after(ng);
          }
          ng.append(nf);
        }
        const title = document.createElement("h3");
        title.textContent = id;
        const header = document.createElement("header");
        header.innerHTML = ["idle", "N", "NE", "E", "SE", "S", "SW", "W", "NW"]
          .map((x) => "<span>" + x + "</span>")
          .join("");
        const img = new Image();
        img.src = "/assets/images/classic/danmaku/" + id + "-flight.svg";
        await img.decode();
        document.querySelector("#flights").append(title, header, img);
        const c = document.createElement("canvas");
        c.width = 40;
        c.height = 48;
        const ctx = c.getContext("2d");
        const hashes = [];
        for (let col = 0; col < 9; col++) {
          ctx.clearRect(0, 0, 40, 48);
          ctx.drawImage(img, col * 40, 0, 40, 48, 0, 0, 40, 48);
          const pixels = ctx.getImageData(0, 0, 40, 48).data;
          if (!pixels.some((v) => v))
            throw Error("Empty flight frame " + id + ":" + col);
          hashes.push([...pixels].join(","));
        }
        if (new Set(hashes).size !== 9)
          throw Error(
            "Directions must have distinct banking/silhouettes " + id
          );
      }
      return stats;
    });
    assert(actual.every((s) => s.bullets > 30));
    assert(
      actual.find((s) => s.spell === "master").lasers > 0,
      "Master Spark must appear in the real pattern"
    );
    await page
      .locator("#cards")
      .screenshot({ path: out + "/eighteen-spells.png" });
    await page
      .locator("#nonspells")
      .screenshot({ path: out + "/eighteen-nonspells.png" });
    await page
      .locator("#flights")
      .screenshot({ path: out + "/flight-atlases.png" });
    await page.evaluate(() => {
      const figures = [...document.querySelectorAll("#nonspells figure")],
        preview = document.createElement("div");
      preview.id = "nonspell-preview";
      preview.style.cssText =
        "display:grid;grid-template-columns:repeat(3,320px);gap:18px;padding:14px;background:#111a28";
      for (const i of [0, 6, 12, 4, 10, 16]) preview.append(figures[i]);
      document.body.append(preview);
    });
    await page
      .locator("#nonspell-preview")
      .screenshot({ path: out + "/nonspell-preview.png" });
    await page.close();
    if (process.env.RENDER_ONLY) {
      console.log(
        "PASS: 36 spell/nonspell renders and compact comparison saved."
      );
      return;
    }

    const p = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    p.on("pageerror", (e) => errors.push(e.message));
    await p.route("**/danmaku-engine.js*", async (r) => {
      const response = await r.fetch();
      await r.fulfill({
        response,
        body:
          (await response.text()) +
          "\nconst realCreate=DanmakuEngine.create;DanmakuEngine.create=(...args)=>window.scoreGame=realCreate(...args);",
      });
    });
    await p.goto(base);
    await p.locator("[data-danmaku-open]").click();
    await p.locator('[data-danmaku-challenge="marisa"]').click();
    const music = p.locator("[data-danmaku-music]");
    await music.click();
    await p.waitForTimeout(900);
    assert(
      await p.evaluate(
        () =>
          scoreGame.state.time === 0 &&
          scoreGame.state.score === 0 &&
          scoreGame.state.intro
      ),
      "intro must hold the real combat clock"
    );
    assert.equal(await music.getAttribute("aria-pressed"), "true");
    assert(
      await p.evaluate(() => {
        const audio = document.querySelector("[data-danmaku-audio]");
        return (
          scoreGame.state.time === 0 &&
          (!audio || audio.paused || audio.muted || audio.volume === 0)
        );
      }),
      "intro stays silent while a user gesture primes the armed BGM"
    );
    await p.locator("[data-danmaku-pause]").click();
    const entry = await p.evaluate(() => scoreGame.state.intro.age);
    await p.locator("[data-danmaku-resume]").click();
    assert(
      await p.evaluate(
        () => scoreGame.state.intro && scoreGame.state.countdown > 1.5
      ),
      "resume keeps enemy entry"
    );
    await p.evaluate(() => {
      scoreGame.state.countdown = 0;
      scoreGame.state.time = 61;
      scoreGame.state.player.invulnerable = 999;
    });
    const aligned = () =>
      p.waitForFunction(() => {
        const a = document.querySelector("[data-danmaku-audio]"),
          s = scoreGame.state;
        return (
          a &&
          !a.paused &&
          !a.seeking &&
          Math.abs(
            a.currentTime - (s.time % DanmakuScore.getTrack(s.enemyId).duration)
          ) < 0.11
        );
      });
    await aligned();
    await p.evaluate(() => {
      const a = document.querySelector("[data-danmaku-audio]");
      window.seeks = 0;
      window.syncSamples = [];
      a.addEventListener("seeking", () => {
        seeks++;
        syncSamples.push({
          at: performance.now(),
          audio: a.currentTime,
          game: scoreGame.state.time,
        });
      });
    });
    await p.waitForTimeout(1500);
    await aligned();
    assert(
      await p.evaluate(() => seeks < 5),
      "normal playback must not keep stuttering through hard seeks " +
        JSON.stringify(await p.evaluate(() => syncSamples))
    );
    await p.locator("[data-danmaku-pause]").click();
    const held = await p.evaluate(() => ({
      audio: document.querySelector("[data-danmaku-audio]").currentTime,
      game: scoreGame.state.time,
    }));
    await p.waitForTimeout(300);
    assert.deepEqual(
      await p.evaluate(() => ({
        audio: document.querySelector("[data-danmaku-audio]").currentTime,
        game: scoreGame.state.time,
      })),
      held
    );
    await p.locator("[data-danmaku-resume]").click();
    assert(
      await p.locator("[data-danmaku-audio]").evaluate((a) => a.paused),
      "resume countdown must hold music"
    );
    await aligned();
    await p.evaluate(() => {
      scoreGame.state.time = DanmakuScore.getTrack("marisa").duration - 0.35;
    });
    await p.waitForFunction(() => Boolean(scoreGame.state.intermission));
    assert(
      await p.locator("[data-danmaku-audio]").evaluate((a) => a.paused),
      "track ending must stop armed music"
    );
    await p.locator("[data-danmaku-round-next]").waitFor({ state: "visible" });
    const total = await p.evaluate(() => scoreGame.state.score);
    await p
      .locator("#live2d-widget")
      .screenshot({ path: out + "/round-rest.png" });
    await p.locator("[data-danmaku-pause]").click();
    const restTime = await p.evaluate(
      () => scoreGame.state.intermission.remaining
    );
    await p.waitForTimeout(250);
    assert.equal(
      await p.evaluate(() => scoreGame.state.intermission.remaining),
      restTime
    );
    await p.locator("[data-danmaku-resume]").click();
    await p.locator("[data-danmaku-round-next]").click();
    assert(
      await p.evaluate(
        () => scoreGame.state.round === 2 && !scoreGame.state.intermission
      )
    );
    assert.equal(await p.evaluate(() => scoreGame.state.score), total);
    assert(
      await p.locator("[data-danmaku-audio]").evaluate((a) => a.paused),
      "next round countdown holds music"
    );
    await aligned();
    await music.click();
    await p.waitForTimeout(250);
    await music.click();
    await aligned();
    await p.locator("[data-danmaku-pause]").click();
    assert.deepEqual(errors, []);
    console.log(
      "PASS: eighteen real spells and eighteen nonspells rendered, nine distinct rear-flight poses per character, late music enable, stable clock sync, pause/countdown hold, track-end rest, explicit cumulative continuation and re-enable."
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
