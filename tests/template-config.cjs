/* A real project-subpath build, not an assertion about Liquid source strings. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const { spawnSync } = require("node:child_process");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");

const root = path.resolve(__dirname, "..");
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "classic-template-"));
const destination = path.join(temp, "site");
const config = path.join(temp, "config.yml");
fs.writeFileSync(
  config,
  JSON.stringify({
    url: "https://example.org",
    baseurl: "/portfolio",
    title: "A & B",
    author: { name: "Template Author", role: "Independent Research" },
    classic: {
      default_character: "patchouli",
      window_label: "Research desk",
      home_loading: false,
      math: false,
      runtime: false,
    },
    gallery: { originals_url: "https://example.org/photographs/" },
  })
);

const types = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
};
let browser, server;
(async () => {
  const build = spawnSync(
    "bundle",
    [
      "exec",
      "jekyll",
      "build",
      "--config",
      path.join(root, "_config.yml") + "," + config,
      "--destination",
      destination,
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: { ...process.env, LANG: "en_US.UTF-8", LC_ALL: "en_US.UTF-8" },
    }
  );
  assert.equal(build.status, 0, build.stdout + build.stderr);
  server = http.createServer((request, response) => {
    let name = decodeURIComponent(
      new URL(request.url, "http://localhost").pathname
    );
    if (!name.startsWith("/portfolio/")) {
      response.writeHead(404).end();
      return;
    }
    name = name.slice("/portfolio/".length);
    const file = path.resolve(
      destination,
      name + (name.endsWith("/") || !name ? "index.html" : "")
    );
    if (
      !file.startsWith(destination + path.sep) ||
      !fs.existsSync(file) ||
      !fs.statSync(file).isFile()
    ) {
      response.writeHead(404).end();
      return;
    }
    response.writeHead(200, {
      "Content-Type": types[path.extname(file)] || "application/octet-stream",
    });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const origin = "http://127.0.0.1:" + server.address().port;
  const base = origin + "/portfolio/";
  browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
  });
  const bad = [],
    errors = [],
    localRequests = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", (response) => {
    if (response.url().startsWith(origin) && response.status() >= 400)
      bad.push(response.url());
  });
  page.on("request", (request) => {
    if (request.url().startsWith(origin)) localRequests.push(request.url());
  });
  await page.route("**/*", (route) =>
    new URL(route.request().url()).origin === origin
      ? route.continue()
      : route.abort()
  );
  await page.goto(base);
  await page.locator(".vn-bgm").waitFor({ state: "attached" });
  assert.equal(await page.title(), "A & B - Homepage");
  assert.equal(
    await page.locator(".classic-site-name").textContent(),
    "Template Author"
  );
  assert.equal(
    await page.locator(".author__role").textContent(),
    "Independent Research"
  );
  assert.equal(
    await page.locator(".classic-window-label").textContent(),
    "Research desk"
  );
  assert.equal(
    await page.locator("html").getAttribute("data-live2d-character"),
    "patchouli"
  );
  assert.equal(
    await page.locator("link[rel=canonical]").getAttribute("href"),
    "https://example.org/portfolio/"
  );
  assert.equal(
    await page.locator(".home-loading-screen, .site-runtime").count(),
    0
  );
  assert.equal(
    await page
      .locator(
        'script[src*="mathjax"],script[src*="home-loading.js"],script[src*="site-runtime-timer.js"]'
      )
      .count(),
    0
  );
  assert(
    !(await page
      .locator("body")
      .evaluate((node) => node.classList.contains("home-loading")))
  );
  const scripts = await page
    .locator("script[src]")
    .evaluateAll((nodes) => nodes.map((node) => node.src));
  assert.equal(
    new Set(scripts).size,
    scripts.length,
    "A runtime module must initialize once"
  );
  assert(
    scripts.indexOf(scripts.find((src) => src.includes("site-assets.js"))) <
      scripts.indexOf(
        scripts.find((src) => src.includes("companion-dialogue.js"))
      )
  );
  const manifest = await (await fetch(base + "images/site.webmanifest")).json();
  assert.equal(manifest.name, "A & B");
  assert.equal(manifest.start_url, "/portfolio/");
  for (const icon of manifest.icons)
    assert.equal(
      (await fetch(new URL(icon.src, base + "images/site.webmanifest"))).status,
      200
    );
  await page.locator('[data-classic-page="gallery"]').click();
  await page.waitForURL(base + "gallery/");
  await page.locator('#gallery[data-gallery-bound="true"]').waitFor();
  assert.equal(await page.title(), "Gallery · A & B");
  assert.equal(
    await page.locator("link[rel=canonical]").getAttribute("href"),
    "https://example.org/portfolio/gallery/"
  );
  assert(
    (
      await page.locator("[data-gallery-filename]").first().getAttribute("href")
    ).startsWith("https://example.org/photographs/")
  );
  assert.equal(
    await page.locator(".gallery-container").getAttribute("data-original-dir"),
    "https://example.org/photographs/"
  );
  await page.goto(base + "playground/");
  await page.locator("[data-danmaku-open]").waitFor({ state: "visible" });
  assert.equal(await page.title(), "Playground · A & B");
  assert.equal(
    await page.locator('script[src*="page-transition.js"]').count(),
    0,
    "Standalone uses its own shell"
  );
  assert.equal(
    await page.evaluate(() => SiteAssets.url("/assets/example.svg")),
    "/portfolio/assets/example.svg"
  );
  assert.equal(
    await page.evaluate(() => SiteAssets.url("https://example.org/image.png")),
    "https://example.org/image.png"
  );
  assert.equal(
    await page.evaluate(() => SiteAssets.url("//example.org/image.png")),
    "//example.org/image.png"
  );
  for (const id of ["alice", "marisa", "patchouli"])
    assert.equal(
      await page.evaluate((id) => DanmakuScore.getTrack(id).src, id),
      "/portfolio/assets/music/danmaku/" + id + "-dbu.mp3"
    );
  await page.locator("[data-danmaku-open]").click();
  // Exercise both renderer loaders, including their separate boss/player atlases.
  await page.evaluate(async () => {
    const a = document.createElement("canvas"),
      b = document.createElement("canvas");
    await Promise.all([
      DanmakuRenderer.create(a).ready,
      DanmakuFlowerRenderer.create(b).ready,
    ]);
  });
  for (const kind of ["bosses", "players", "backgrounds", "portraits"])
    assert(
      localRequests.some((url) =>
        url.includes("/portfolio/assets/images/classic/danmaku/" + kind + "/")
      ),
      "Missing " + kind + " request"
    );
  assert.deepEqual(
    bad,
    [],
    "Project deploy must not request nonexistent root assets"
  );
  assert.deepEqual(
    errors,
    [],
    "Offline optional services must not break the UI"
  );
  // A visitor's stored choice should override the configured first-visit default.
  await page.evaluate(() =>
    localStorage.setItem("site-live2d-character", "marisa")
  );
  await page.goto(base);
  assert.equal(
    await page.locator("html").getAttribute("data-live2d-character"),
    "marisa"
  );
  console.log(
    "PASS: customized project-subpath build, config switches, SEO/manifest, soft navigation, all game asset families and saved theme override"
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
    fs.rmSync(temp, { recursive: true, force: true });
  });
