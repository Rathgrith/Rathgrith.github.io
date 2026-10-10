/* Render every production card at multiple points, retaining full music timing. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict"),
  fs = require("node:fs");
const out = "/private/tmp/playground-spells";
fs.mkdirSync(out, { recursive: true });
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const p = await browser.newPage({
        viewport: { width: 1020, height: 1110 },
      }),
      errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    await p.route(base + "spell-design-test", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: `<!doctype html><meta charset="utf-8"><style>body{margin:0;padding:18px;background:#101720;color:#e3dfd6;font:14px monospace}h1{font-size:20px;margin:0 0 14px}main{display:grid;grid-template-columns:repeat(3,1fr);gap:14px}figure{margin:0;background:#202d3b;padding:8px;border:1px solid #6c788b}figcaption{height:36px}canvas{display:block;width:100%;image-rendering:pixelated}</style><h1 id="title"></h1><main></main>`,
      })
    );
    await p.goto(base + "spell-design-test");
    for (const name of [
      "score",
      "patterns",
      "scroll",
      "engine",
      "boss-sprites",
      "renderer",
    ])
      await p.addScriptTag({
        url: base + "assets/js/games/danmaku-" + name + ".js",
      });
    for (const enemy of ["alice", "marisa", "patchouli"]) {
      await p.evaluate(async (enemy) => {
        document.querySelector("main").replaceChildren();
        document.querySelector("h1").textContent =
          enemy.toUpperCase() + " — 6 spell formations";
        const track = DanmakuEngine.score.getTrack(enemy);
        window.qaCards = [];
        for (let stage = 0; stage < 6; stage++) {
          const figure = document.createElement("figure"),
            label = document.createElement("figcaption"),
            canvas = document.createElement("canvas");
          label.textContent =
            stage + 1 + ". " + DanmakuPatterns.cards[enemy][stage].name;
          figure.append(label, canvas);
          document.querySelector("main").append(figure);
          const renderer = DanmakuRenderer.create(canvas);
          await renderer.ready;
          const game = DanmakuEngine.create("alice", enemy, 1977),
            s = game.state;
          s.countdown = 0;
          s.time = track.phrases[stage].start;
          s.player.invulnerable = Infinity;
          window.qaCards.push({ game, renderer, start: s.time });
        }
      }, enemy);
      for (const seconds of [7, 11, 16]) {
        const states = await p.evaluate(
          (seconds) =>
            window.qaCards.map(({ game, renderer, start }) => {
              const s = game.state;
              while (s.time < start + seconds) {
                s.enemySpell.hp = Infinity;
                s.shots = [];
                s.items = [];
                game.step(1 / 60);
              }
              renderer.draw(s);
              return {
                id: s.enemySpell.id,
                bullets: s.bullets.length,
                lasers: s.lasers.length,
                finite: s.bullets.every((b) =>
                  Number.isFinite(b.x + b.y + b.vx + b.vy)
                ),
              };
            }),
          seconds
        );
        assert(states.every((s) => s.finite && s.bullets + s.lasers > 0));
        await p.screenshot({
          path: `${out}/${enemy}-${seconds}.png`,
          fullPage: true,
        });
        if (seconds === 11)
          await p.evaluate((enemy) => {
            const index = { alice: 4, marisa: 3, patchouli: 5 }[enemy],
              figure = document.querySelectorAll("figure")[index];
            window.qaOverview = window.qaOverview || [];
            window.qaOverview.push({
              label:
                enemy.toUpperCase() +
                " / " +
                figure.querySelector("figcaption").textContent,
              image: figure.querySelector("canvas").toDataURL(),
            });
          }, enemy);
      }
      console.log("PASS spell frames", enemy);
    }
    await p.evaluate(() => {
      document.querySelector("main").replaceChildren();
      document.querySelector("h1").textContent =
        "PLAYGROUND / distinct spell formations";
      for (const record of window.qaOverview) {
        const figure = document.createElement("figure"),
          label = document.createElement("figcaption"),
          img = document.createElement("img");
        label.textContent = record.label;
        img.src = record.image;
        img.style = "display:block;width:100%;image-rendering:pixelated";
        figure.append(label, img);
        document.querySelector("main").append(figure);
      }
    });
    await p.setViewportSize({ width: 1020, height: 585 });
    await p.evaluate(async () => {
      await Promise.all([...document.images].map((img) => img.decode()));
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r))
      );
    });
    await p.screenshot({ path: out + "/overview.png", fullPage: true });
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
