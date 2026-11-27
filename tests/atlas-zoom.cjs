/* Exercise real pointer, keyboard and touch input without sending a visitor hit. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const preview = new URL(process.env.PREVIEW_URL || "http://127.0.0.1:4100/");
const site = "https://rathgrith.github.io";
const shots = process.env.ATLAS_SCREENSHOTS;
const raster = process.env.ATLAS_PROVIDER_RASTER;

// The provider draws in its own projection. This fixture uses its native map
// dimensions and a marker at known pixel fractions of that raster.
const nativeMap = `
  const script = document.currentScript, width = Number(new URL(script.src).searchParams.get("w"));
  const link = document.createElement("a");
  link.id = "mapmyvisitors-widget";
  link.href = "https://mapmyvisitors.com/";
  link.style.cssText = "display:block;width:" + width + "px";
  link.innerHTML = '<div class="mapmyvisitors-map-container"><div class="mapmyvisitors-map"><i data-native-point></i></div></div>';
  const map = link.querySelector(".mapmyvisitors-map");
  map.style.cssText = "position:relative;width:100%;height:" + (width / 2.04) + "px";
  map.style.backgroundImage = "url(https://mapmyvisitors.com/generated_content/backs/bg-w_400-co_17212d-cl_7f9db3.png)";
  map.style.backgroundSize = "100% 100%";
  const point = map.querySelector("i");
  point.style.cssText = "position:absolute;left:61%;top:48%;width:5px;height:5px;transform:translate(-50%,-50%);background:#e97f48;border-radius:50%";
  window.nativeMapGestures = [];
  for (const event of ["touchstart", "touchmove"]) {
    map.addEventListener(event, () => window.nativeMapGestures.push(event));
  }
  script.after(link);
`;

async function geometry(root, native) {
  return root.evaluate((element, native) => {
    const viewport = element.querySelector("[data-atlas-viewport]").getBoundingClientRect();
    const layer = element.querySelector("[data-atlas-layer]");
    const transform = new DOMMatrixReadOnly(getComputedStyle(layer).transform);
    const surface = element.querySelector(native ? ".mapmyvisitors-map" : ".classic-map-surface").getBoundingClientRect();
    let x, y, xFraction, yFraction;
    if (native) {
      const point = element.querySelector("[data-native-point]").getBoundingClientRect();
      x = point.left + point.width / 2;
      y = point.top + point.height / 2;
      xFraction = .61;
      yFraction = .48;
    } else {
      const marker = element.querySelector("[data-weather-map-marker]");
      const anchor = new DOMPoint(0, 0).matrixTransform(marker.getScreenCTM());
      x = anchor.x;
      y = anchor.y;
      const projected = marker.transform.baseVal.getItem(0).matrix;
      xFraction = projected.e / 360;
      yFraction = projected.f / 180;
    }
    return {
      scale: transform.a, dx: transform.e, dy: transform.f, width: surface.width,
      viewWidth: viewport.width, viewHeight: viewport.height,
      projectionError: Math.max(Math.abs(x - surface.left - xFraction * surface.width),
        Math.abs(y - surface.top - yFraction * surface.height)),
    };
  }, native);
}

function checkProjection(before, after) {
  assert(after.projectionError < 2, "the marker stays on its geographical location");
  assert(Math.abs(after.viewWidth - before.viewWidth) < 1 && Math.abs(after.viewHeight - before.viewHeight) < 1,
    "zoom keeps the viewport dimensions");
  assert(Math.abs(after.width - before.width * after.scale) < 2, "the map and marker scale together");
}

async function pinch(page, viewport) {
  const box = await viewport.boundingBox();
  const cx = box.x + box.width / 2, cy = box.y + box.height / 2;
  const step = Math.min(20, box.width / 9);
  const cdp = await page.context().newCDPSession(page);
  const fingers = gap => [-1, 1].map((sign, i) => ({ x: cx + gap * sign, y: cy, id: i + 1 }));
  try {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: fingers(step) });
    for (const distance of [1.25, 1.5, 1.75, 2]) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: fingers(step * distance) });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    const offset = () => viewport.locator("[data-atlas-layer]").evaluate(el =>
      new DOMMatrixReadOnly(getComputedStyle(el).transform).e);
    const before = await offset();
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: cx, y: cy, id: 3 }] });
    for (const delta of [6, 14, 20]) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: cx + delta, y: cy, id: 3 }] });
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    assert(await offset() > before + 5, "one finger pans a magnified map");
  } finally {
    await cdp.detach();
  }
}

async function selectStation(page, root, touch, forecasts) {
  const target = await root.evaluate(element => {
    const view = element.querySelector("[data-atlas-viewport]").getBoundingClientRect();
    const matrix = element.querySelector(".weather-map__overlay").getScreenCTM();
    // Start with a world coordinate and click its transformed on-screen pixel.
    const coordinates = location.pathname.endsWith("/playground/")
      ? [[156, 49], [164, 58], [189, 61], [145, 40]]
      : [[212, 65], [194, 75], [175, 38], [200, 52]];
    for (const [x, y] of coordinates) {
      const screen = new DOMPoint(x, y).matrixTransform(matrix);
      if (screen.x < view.left + 6 || screen.x > view.right - 6 ||
          screen.y < view.top + 6 || screen.y > view.bottom - 6) continue;
      const pixel = new DOMPoint(Math.round(screen.x), Math.round(screen.y));
      const position = pixel.matrixTransform(matrix.inverse());
      return { x: pixel.x, y: pixel.y, longitude: position.x - 180, latitude: 90 - position.y };
    }
  });
  assert(target, "a known geographic point remains on screen after pan/zoom");
  const count = forecasts.length;
  const beforePick = await geometry(root, false);
  const isStationRequest = req => {
    const url = new URL(req.url());
    return url.hostname === "api.open-meteo.com" && !url.searchParams.get("latitude").includes(",");
  };
  const request = page.waitForRequest(isStationRequest);
  if (touch) await page.touchscreen.tap(target.x, target.y);
  else await page.mouse.click(target.x, target.y);
  const url = new URL((await request).url());
  const latitude = Number(url.searchParams.get("latitude")), longitude = Number(url.searchParams.get("longitude"));
  assert(Math.abs(latitude - target.latitude) < .03 && Math.abs(longitude - target.longitude) < .03,
    "the forecast request corresponds to the geographic coordinate that was tapped");
  await page.waitForFunction(() => document.querySelector("[data-weather-widget]")?.getAttribute("aria-busy") === "false");
  const afterPick = await geometry(root, false);
  assert(Math.abs(beforePick.dx - afterPick.dx) < 1 && Math.abs(beforePick.dy - afterPick.dy) < 1,
    "observing the tapped point keeps the user’s pan position");
  const projections = await page.locator("[data-weather-map-marker]").evaluateAll(markers => markers.map(marker => {
    const p = marker.transform.baseVal.getItem(0).matrix;
    return [p.e - 180, 90 - p.f];
  }));
  assert.equal(projections.length, page.url().endsWith("/playground/") ? 1 : 2);
  for (const [lon, lat] of projections) {
    assert(Math.abs(lon - longitude) < .015 && Math.abs(lat - latitude) < .015,
      "every view renders the selected forecast position");
  }
  const readings = await page.locator("[data-weather-temperature]").allTextContents();
  assert(readings.every(value => value === "26°C"), "all maps share the new observation");
  assert.equal(forecasts.length, count + 1, "a selection makes exactly one forecast request");
  if (!touch && !page.url().endsWith("/playground/")) {
    const viewport = root.locator("[data-atlas-viewport]");
    await viewport.press("Shift+ArrowLeft");
    assert.equal(await root.locator("[data-weather-cursor]").getAttribute("visibility"), "visible");
    assert.equal(forecasts.length, count + 1, "moving the weather cursor waits for confirmation");
    const confirmed = page.waitForRequest(isStationRequest);
    await viewport.press("Enter");
    const keyboard = new URL((await confirmed).url()).searchParams;
    assert(Math.abs(Number(keyboard.get("longitude")) - (longitude - 1)) < .015 &&
      Math.abs(Number(keyboard.get("latitude")) - latitude) < .015);
  }
}

async function exerciseMap(page, root, native, touch, forecasts) {
  const viewport = root.locator("[data-atlas-viewport]");
  const reset = root.locator("[data-atlas-reset]");
  const scale = root.locator("[data-atlas-scale]");
  await viewport.scrollIntoViewIfNeeded();
  const baseline = await geometry(root, native);
  assert.equal(baseline.scale, 1);
  checkProjection(baseline, baseline);
  const requestsBeforeGestures = forecasts.length;
  if (touch) {
    await pinch(page, viewport);
    const zoom = await geometry(root, native);
    assert(zoom.scale > 1.35, "two real touch points zoom the map");
    assert.equal(await page.evaluate(() => visualViewport.scale), 1, "only the map zooms");
    checkProjection(baseline, zoom);
    await reset.tap();
  }
  await root.locator("[data-atlas-zoom-in]").click();
  assert.equal((await scale.textContent()).trim(), "150%");
  await viewport.press("+");
  assert.equal((await scale.textContent()).trim(), "200%");
  const zoomed = await geometry(root, native);
  checkProjection(baseline, zoomed);
  await viewport.press("ArrowRight");
  const panned = await geometry(root, native);
  assert(panned.dx < zoomed.dx, "ArrowRight pans east");
  checkProjection(baseline, panned);

  const box = await viewport.boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  const dy = panned.dy < -20 ? 15 : -15;
  await page.mouse.move(x + 28, y + dy, { steps: 4 });
  await page.mouse.up();
  const dragged = await geometry(root, native);
  assert(dragged.dx > panned.dx + 5 && (dragged.dy - panned.dy) * Math.sign(dy) > 5,
    "drag pans the zoomed layer");
  checkProjection(baseline, dragged);
  assert.equal(forecasts.length, requestsBeforeGestures, "zooming, pinching and dragging never select a station");
  if (!native) await selectStation(page, root, touch, forecasts);
  await root.locator("[data-atlas-zoom-out]").click();
  assert.equal((await scale.textContent()).trim(), "150%");
  assert(await scale.evaluate(el => {
    const text = document.createRange();
    text.selectNodeContents(el);
    return text.getClientRects().length === 1;
  }), "the scale fits on one line even in a compact weather panel");
  if (shots) {
    const name = native ? "visitors" : page.url().endsWith("/playground/") ? "standalone-weather" : "weather";
    await page.screenshot({ path: path.join(shots, name + "-" + page.viewportSize().width + ".png") });
  }
  for (let i = 0; i < 4; i++) await viewport.press("=");
  assert.equal((await scale.textContent()).trim(), "400%");
  assert(await root.locator("[data-atlas-zoom-in]").isDisabled());
  await viewport.press("Home");
  assert.equal((await scale.textContent()).trim(), "100%");
  assert(await root.locator("[data-atlas-zoom-out]").isDisabled());
  const home = await geometry(root, native);
  assert(home.dx === 0 && home.dy === 0 && home.scale === 1);
  checkProjection(baseline, home);
}

async function checkViewport(browser, touch) {
  const context = await browser.newContext({
    viewport: touch ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: touch, hasTouch: touch, reducedMotion: "reduce",
  });
  let vendorLoads = 0;
  const forecasts = [];
  await context.route("**/*", async route => {
    const url = new URL(route.request().url());
    if (url.origin === site) {
      const response = await route.fetch({ url: new URL(url.pathname + url.search, preview).href });
      return route.fulfill({ response });
    }
    if (url.hostname === "api.open-meteo.com") {
      if (url.searchParams.get("latitude").includes(",")) return route.fulfill({ json: [] });
      forecasts.push(url);
      const latitude = Number(url.searchParams.get("latitude"));
      return route.fulfill({ json: {
        latitude, longitude: Number(url.searchParams.get("longitude")), timezone_abbreviation: "UTC",
        current: { time: "2026-10-10T15:00", temperature_2m: Math.abs(latitude - 52.4862) < .01 ? 17 : 26,
          weather_code: 2, is_day: 1, relative_humidity_2m: 63, wind_speed_10m: 14.1 },
        daily: { temperature_2m_max: [28], temperature_2m_min: [13] },
      } });
    }
    if (url.hostname === "mapmyvisitors.com" && url.pathname === "/map.js") {
      vendorLoads++;
      return route.fulfill({ contentType: "application/javascript", body: nativeMap });
    }
    if (raster && url.hostname === "mapmyvisitors.com" && url.pathname.startsWith("/generated_content/backs/")) {
      return route.fulfill({ path: raster, contentType: "image/png" });
    }
    return route.abort();
  });
  const page = await context.newPage();
  try {
    await page.goto(site, { waitUntil: "domcontentloaded" });
    await page.locator(".profile-map-trigger").click();
    const dialog = page.locator("#visitor-map-dialog");
    const visitors = dialog.locator("#atlas-visitors-panel");
    await visitors.locator("[data-native-point]").waitFor();
    await page.waitForFunction(() => document.querySelector("[data-weather-widget]")?.getAttribute("aria-busy") === "false");
    await exerciseMap(page, visitors, true, touch, forecasts);
    assert.deepEqual(await page.evaluate(() => window.nativeMapGestures), [],
      "the provider never applies a second camera transform inside the atlas");
    await dialog.locator("#atlas-weather-tab").click();
    await exerciseMap(page, dialog.locator("#atlas-weather-panel [data-atlas-zoom]"), false, touch, forecasts);
    await dialog.locator(".visitor-map__close").click();
    await page.locator('[data-vn-open="weather"]').click();
    const monitor = page.locator("[data-weather-widget]");
    await monitor.locator("[data-atlas-zoom-in]").click();
    await monitor.locator("[data-atlas-weather-open]").click();
    assert(await dialog.locator("#atlas-weather-panel").isVisible());
    assert.equal((await dialog.locator("#atlas-weather-panel [data-atlas-scale]").textContent()).trim(), "100%");
    await dialog.locator(".visitor-map__close").click();
    assert.equal((await monitor.locator("[data-atlas-scale]").textContent()).trim(), "150%",
      "opening the larger atlas preserves the small map's zoom");
    assert.equal(vendorLoads, 1, "zooming and switching layers never records another visit");

    await page.goto(site + "/playground/", { waitUntil: "domcontentloaded" });
    await page.locator('[data-vn-open="weather"]').click();
    const weather = page.locator("[data-weather-widget] [data-atlas-zoom]");
    await exerciseMap(page, weather, false, touch, forecasts);
  } finally {
    await context.close();
  }
}

(async () => {
  if (shots) fs.mkdirSync(shots, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    await checkViewport(browser, false);
    await checkViewport(browser, true);
    console.log("PASS atlas zoom and station selection: desktop controls, mobile gestures, provider projection and shared forecasts");
  } finally {
    await browser.close();
  }
})().catch(err => { console.error(err); process.exitCode = 1; });
