/* The worldwide batch is independent of individual station forecasts. */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const origin = new URL(base).origin;

async function settle(page) {
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}

async function labelsFit(map) {
  await settle(map.page());
  const measurements = await map.evaluate((el) => {
    const frame = el.querySelector("[data-atlas-viewport]").getBoundingClientRect();
    return Array.from(el.querySelectorAll('[data-weather-sample][visibility="visible"]'), (group) => {
      const tag = group.querySelector(".weather-map__sample-badge").getBoundingClientRect();
      const name = group.querySelector("text");
      const ink = name.getBoundingClientRect();
      return {
        name: name.textContent, width: tag.width, height: tag.height,
        x: tag.x, y: tag.y, right: tag.right, bottom: tag.bottom,
        inside: tag.left >= frame.left && tag.top >= frame.top && tag.right <= frame.right && tag.bottom <= frame.bottom,
        textFits: ink.left >= tag.left - .6 && ink.right <= tag.right + .6 && ink.width >= 6 && ink.height >= 10,
        font: getComputedStyle(name).fontFamily,
      };
    });
  });
  assert(measurements.length > 0, "the visible map has a readable weather title");
  measurements.forEach((a, index) => {
    assert(a.inside && a.textFits, JSON.stringify(a));
    assert.match(a.font, /Fusion Pixel/);
    for (const b of measurements.slice(index + 1)) {
      assert(a.x >= b.right || b.x >= a.right || a.y >= b.bottom || b.y >= a.bottom,
        a.name + " and " + b.name + " have separate paper labels");
    }
  });
  return measurements.length;
}

async function verify(browser) {
  const page = await browser.newPage({ viewport: { width: 1360, height: 900 }, reducedMotion: "reduce", hasTouch: true });
  let batches = 0;
  let singleRequests = [];
  let offline = false;
  let firstBatch;
  const waitFirst = new Promise((resolve) => { firstBatch = resolve; });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => localStorage.setItem("site-live2d-enabled", "false"));
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin) return route.continue();
    if (url.hostname !== "api.open-meteo.com") return route.abort();
    const latitudes = url.searchParams.get("latitude").split(",").map(Number);
    const longitudes = url.searchParams.get("longitude").split(",").map(Number);
    const current = {
      weather_code: 95, temperature_2m: 12, apparent_temperature: 13, is_day: 1,
      relative_humidity_2m: 65, wind_gusts_10m: 15, wind_speed_10m: 9, snowfall: 0,
      precipitation: 1, cloud_cover: 50, time: "2026-10-10T12:00"
    };
    if (latitudes.length === 1) {
      singleRequests.push([latitudes[0], longitudes[0]]);
      return route.fulfill({ json: { current: {
        ...current, weather_code: latitudes[0] === 62.03 ? 56 : current.weather_code
      } } });
    }
    batches++;
    assert.equal(longitudes.length, latitudes.length);
    assert(latitudes.length >= 8 && latitudes.length <= 12);
    assert(!url.searchParams.has("hourly") && !url.searchParams.has("daily"));
    if (offline) return route.abort();
    if (batches === 1) await waitFirst;
    const codes = [95, 71, 1, 3, 2, 95, 45, 56, 71, 3, 95];
    const rows = latitudes.map((latitude, index) => ({
      latitude, longitude: longitudes[index],
      current: { ...current, precipitation: 0, weather_code: codes[index],
        temperature_2m: index === 2 ? null : 12 }
    }));
    return route.fulfill({ json: batches === 1 ? rows : rows.reverse() });
  });

  async function openWeather() {
    await page.locator("[data-site-options-trigger]").click();
    await page.locator("[data-site-options-menu] [data-visitor-map-open]").click();
    await page.getByRole("tab", { name: "Weather" }).click();
  }
  const atlas = page.locator("[data-atlas-weather]");
  const sample = atlas.locator("[data-weather-sample]");
  await page.goto(base);
  assert.equal(batches, 0, "hidden maps never fetch the regional forecast");
  await openWeather();
  await page.waitForFunction(() => document.querySelector("[data-atlas-weather] [data-weather-sample-status]").textContent.includes("受信中"));
  await page.getByRole("tab", { name: "Visitors" }).click();
  await page.getByRole("tab", { name: "Weather" }).click();
  firstBatch();
  await sample.first().waitFor({ state: "attached" });
  assert.equal(batches, 1);
  assert.equal(await sample.count(), 6);
  assert.equal(await page.locator("[data-weather-widget] [data-weather-sample]").count(), 6);
  const fingerprint = () => sample.evaluateAll(groups => groups.map(g => [g.dataset.sampleName, g.dataset.label]));
  const original = await fingerprint();
  assert.equal(new Set(original.map(([name]) => name)).size, original.length, "each weather type has one representative");
  assert.equal(await atlas.locator("[data-weather-sample-status]").innerText(), "10地点を観測 · 6種の天候");
  const diamond = atlas.locator('[data-sample-name="ダイヤモンドダスト"]');
  assert.equal(await diamond.locator("text").textContent(), "細氷");
  assert.equal(await diamond.locator(".weather-map__sample-badge").getAttribute("width"), "45");
  assert.equal(await diamond.locator(".weather-map__sample-badge").getAttribute("height"), "17");
  const diamondTitle = await diamond.locator("title").textContent();
  assert.match(diamondTitle, /ダイヤモンドダスト 12°C/);
  assert.equal(await diamond.getAttribute("aria-label"), diamondTitle);
  await diamond.locator(".weather-map__sample-badge").click();
  await page.waitForFunction(() =>
    document.querySelector("[data-atlas-weather] [data-weather-name]").textContent === "ダイヤモンドダスト");
  assert(await labelsFit(atlas.locator(".weather-map")) >= 5);
  const first = atlas.locator('[data-sample-name="晴嵐"]');
  assert.equal(await first.locator("use").getAttribute("href"), "#weather-icon-squall");
  assert.equal(await atlas.locator('[data-sample-name="雪"] use').getAttribute("href"), "#weather-icon-snow");
  assert.match(await first.locator("title").textContent(), /晴嵐 12°C/);
  const firstStation = [Number(await first.getAttribute("data-latitude")), Number(await first.getAttribute("data-longitude"))];
  const sigil = first.locator(".weather-map__sample-badge");
  assert.equal(await sigil.evaluate(el => {
    const r=el.getBoundingClientRect();
    return document.elementFromPoint(r.left+r.width/2, r.top+r.height/2)?.closest("[data-weather-sample]") === el.closest("[data-weather-sample]");
  }), true, "station badges remain clickable inside the reticle overlay");
  assert.equal(await first.locator("use").evaluate(el => getComputedStyle(el).animationName), "none");
  await sigil.click();
  await page.waitForFunction((label) => document.querySelector("[data-atlas-weather] [data-weather-location]").textContent === label,
    await first.getAttribute("data-label"));
  assert.deepEqual(singleRequests.at(-1), firstStation, "sample selection requests that station's full forecast");
  await atlas.locator("[data-atlas-zoom-in]").click();
  await settle(page);
  assert.equal(await first.getAttribute("visibility"), "visible", "the active station keeps its title after zooming");
  const firstLabel = await first.getAttribute("data-label");
  const nextStation = atlas.locator('[data-weather-sample][visibility="visible"]:not([data-label="' + firstLabel + '"])').first();
  const nextLabel = await nextStation.getAttribute("data-label");
  await nextStation.locator(".weather-map__sample-badge").click();
  await page.waitForFunction((label) => document.querySelector("[data-atlas-weather] [data-weather-location]").textContent === label,
    nextLabel);
  await atlas.locator("[data-atlas-reset]").click();
  await sigil.tap();
  await page.waitForFunction((label) => document.querySelector("[data-atlas-weather] [data-weather-location]").textContent === label,
    await first.getAttribute("data-label"));
  assert.equal(batches, 1, "mouse clicks and native taps still resolve a named station after zooming");
  await page.reload();
  await openWeather();
  await sample.first().waitFor();
  assert.equal(batches, 1, "a fresh session cache survives reload");
  await page.evaluate(() => {
    const k = "site-weather-map-samples-v1";
    const data = JSON.parse(sessionStorage.getItem(k));
    data.at -= 16 * 60 * 1000;
    sessionStorage.setItem(k, JSON.stringify(data));
  });
  offline = true;
  await page.reload();
  await openWeather();
  await page.waitForFunction(() => document.querySelector("[data-atlas-weather] [data-weather-sample-status]").textContent.includes("取得できません"));
  assert.equal(batches, 2);
  assert.equal(await sample.count(), 0, "expired readings are absent when offline");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  offline = false;
  await page.reload(); await openWeather(); await sample.first().waitFor();
  assert.deepEqual(await fingerprint(), original, "reordering the provider response preserves every representative");
  const fx = first.locator(".weather-map__sample-flourish");
  assert.equal(await fx.evaluate(el => getComputedStyle(el).animationIterationCount), "1");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(new URL("playground/", base).href);
  await page.locator('[data-vn-open="weather"]').click();
  const compact = page.locator("[data-weather-widget] .weather-map");
  await compact.locator('[data-weather-sample][visibility="visible"]').first().waitFor();
  assert(await labelsFit(compact) < 6, "the compact map shows only complete, separated titles");
  await compact.locator("[data-atlas-zoom-in]").click();
  await labelsFit(compact);
  assert.deepEqual(errors, []);
  await page.close();
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try { await verify(browser); console.log("PASS worldwide weather samples, selection, cache and motion"); }
  finally { await browser.close(); }
})().catch((error) => { console.error(error); process.exitCode = 1; });
