/* Deterministic weather terminal integration without Live2D/CDN dependencies. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const output =
  process.env.WEATHER_SCREENSHOTS || "/private/tmp/playground-weather";
fs.mkdirSync(output, { recursive: true });

function forecast(mode = "normal") {
  const times = Array.from(
    { length: 48 },
    (_, index) =>
      `2026-10-${index < 24 ? "10" : "11"}T${String(index % 24).padStart(2, "0")}:00`
  );
  const result = {
    latitude: 52.4862,
    longitude: -1.8904,
    timezone: "Europe/London",
    timezone_abbreviation: "BST",
    current: {
      time: "2026-10-10T15:00",
      temperature_2m: 17.4,
      relative_humidity_2m: 63,
      apparent_temperature: 16.8,
      is_day: 1,
      precipitation: 0,
      snowfall: 0,
      weather_code: 2,
      cloud_cover: 47,
      surface_pressure: 1014.6,
      wind_speed_10m: 14.1,
      wind_direction_10m: 225,
      wind_gusts_10m: 22.2,
    },
    daily: { temperature_2m_max: [20.1, 18.2], temperature_2m_min: [9.4, 8.7] },
    hourly: {
      time: times,
      temperature_2m: times.map(
        (_, index) => Math.round((14 + 5 * Math.sin(index / 5)) * 10) / 10
      ),
      precipitation_probability: times.map((_, index) => (index % 6) * 15),
    },
  };
  if (mode === "holes") {
    result.hourly.temperature_2m[18] = null;
    result.hourly.temperature_2m[21] = null;
    result.hourly.precipitation_probability[20] = null;
  }
  if (mode === "null") {
    result.hourly.temperature_2m.fill(null);
    result.hourly.precipitation_probability.fill(null);
  }
  if (mode === "missing") delete result.hourly;
  if (typeof mode === "number") result.current.weather_code = mode;
  if (mode === "invalid") delete result.current;
  return result;
}

async function settle(page) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve))
      )
  );
}

async function withinPanel(page, panel, width, height) {
  await panel.scrollIntoViewIfNeeded();
  await settle(page);
  const geometry = await panel.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const close = element.querySelector("header button");
    const control = close.getBoundingClientRect();
    const target = document.elementFromPoint(control.x + control.width / 2, control.y + control.height / 2);
    return {
      closeReachable: close.contains(target),
      x: box.x,
      y: box.y,
      width: box.width,
      height: box.height,
      right: box.right,
      bottom: box.bottom,
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    };
  });
  assert(
    geometry.x >= -1 && geometry.right <= width + 1,
    `panel horizontal bounds: ${JSON.stringify(geometry)}`
  );
  assert(
    geometry.y >= -1 && geometry.bottom <= height + 1,
    `panel vertical bounds: ${JSON.stringify(geometry)}`
  );
  assert(geometry.closeReachable, "the sticky page index leaves the weather close button clickable");
  assert(
    geometry.scrollWidth <= geometry.clientWidth + 1,
    "weather sheet has no horizontal scroll"
  );
  return geometry;
}

async function checkMap(page) {
  const map = page.locator("[data-weather-widget] .classic-map-surface");
  const geometry = await map.evaluate((surface) => {
    const bounds = surface.getBoundingClientRect();
    const overlay = surface.querySelector("svg").getBoundingClientRect();
    const marker = surface.querySelector("[data-weather-map-marker]");
    const { e: longitudeX, f: latitudeY } = marker.transform.baseVal.getItem(0).matrix;
    const point = new DOMPoint(0, 0).matrixTransform(marker.getScreenCTM());
    return {
      aspectRatio: bounds.width / bounds.height,
      sizeError: Math.max(Math.abs(bounds.width - overlay.width), Math.abs(bounds.height - overlay.height)),
      positionError: Math.max(
        Math.abs(point.x - (bounds.x + longitudeX * bounds.width / 360)),
        Math.abs(point.y - (bounds.y + latitudeY * bounds.height / 180))
      ),
      land: getComputedStyle(surface, "::before").maskImage,
      crosshair: surface.querySelector("[data-weather-map-crosshair]").getAttribute("d"),
      expectedCrosshair: `M${longitudeX.toFixed(2)} 0V180M0 ${latitudeY.toFixed(2)}H360`,
      sight: getComputedStyle(surface.querySelector(".weather-map__sights")).animationName,
      halo: getComputedStyle(surface.querySelector(".weather-map__echo")).opacity,
    };
  });
  assert(Math.abs(geometry.aspectRatio - 2) < 0.01, "world map preserves 2:1 geography");
  assert(geometry.sizeError < 1 && geometry.positionError < 1, "station projects onto the land at its exact coordinates");
  assert.match(geometry.land, /weather\/world-map\.svg/);
  assert.equal(geometry.crosshair, geometry.expectedCrosshair);
  assert.equal(geometry.sight, "none", "reduced motion uses a static crosshair");
  assert.equal(geometry.halo, "0", "reduced motion keeps the transient halo hidden");
}

async function checkAtlas(page, widget, compact, refreshAs, requestCount) {
  const dialog = page.locator("#visitor-map-dialog");
  const visitor = dialog.locator("#atlas-visitors-tab");
  const weather = dialog.locator("#atlas-weather-tab");
  const atlas = dialog.locator("[data-atlas-weather]");
  const monitor = widget.locator("[data-atlas-weather-open]");
  const options = page.locator("[data-site-options-trigger]");
  const profile = page.locator(".profile-map-trigger");

  async function selected(tab, other) {
    assert.equal(await tab.getAttribute("aria-selected"), "true");
    assert.equal(await tab.evaluate(el => el.tabIndex), 0);
    assert.equal(await other.getAttribute("aria-selected"), "false");
    assert.equal(await other.getAttribute("tabindex"), "-1");
    const activePanel = await tab.getAttribute("aria-controls");
    const hiddenPanel = await other.getAttribute("aria-controls");
    assert(await dialog.locator("#" + activePanel).isVisible());
    assert(await dialog.locator("#" + hiddenPanel).isHidden());
  }
  async function closeAndCheckFocus(opener, escape = false) {
    if (escape) await page.keyboard.press("Escape");
    else await dialog.locator(".visitor-map__close").click();
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction((el) => document.activeElement === el, await opener.elementHandle());
  }
  async function sameStation(fix, coordinates) {
    for (const root of [widget, atlas]) {
      assert.equal(await root.locator("[data-weather-map-marker]").getAttribute("transform"), fix);
    }
    assert.equal(await atlas.locator("[data-weather-coordinates]").textContent(), coordinates);
    for (const field of ["coordinates", "location", "name", "temperature", "signal"]) {
      const selector = "[data-weather-" + field + "]";
      const reading = (await widget.locator(selector).textContent()).trim();
      assert(reading.length > 0);
      assert.equal((await atlas.locator(selector).textContent()).trim(), reading, field);
    }
    const overlay = atlas.locator(".weather-map__overlay");
    const sharedProjection = await overlay.evaluate((svg) => {
      const map = svg.closest(".classic-map-surface");
      const a = svg.getBoundingClientRect(), b = map.getBoundingClientRect();
      return a.width > 0 && Math.abs(a.width / a.height - 2) < 0.03 &&
        Math.abs(a.left - b.left) < 2 && Math.abs(a.top - b.top) < 2 &&
        Math.abs(a.right - b.right) < 2 && Math.abs(a.bottom - b.bottom) < 2;
    });
    assert(sharedProjection, "the atlas marker overlay fills the map at the native 2:1 projection");
  }

  if (compact) await page.setViewportSize({ width: 390, height: 844 });
  const activations = requestCount();
  await profile.click();
  await selected(visitor, weather);
  if (compact) {
    await weather.tap();
  } else {
    await visitor.focus();
    await page.keyboard.press("ArrowRight");
    await selected(weather, visitor);
    await page.keyboard.press("ArrowLeft");
    await selected(visitor, weather);
    await page.keyboard.press("End");
    assert(await weather.evaluate(el => el === document.activeElement));
  }
  await selected(weather, visitor);
  await sameStation("translate(178.11 37.51)", "52.49°N / 1.89°W");
  await closeAndCheckFocus(profile, !compact);
  await options.click();
  await page.locator("[data-site-options-menu] [data-visitor-map-open]").click();
  await selected(visitor, weather);
  await closeAndCheckFocus(options);
  assert.equal(requestCount(), activations, "switching atlas layers reuses the terminal observation");

  await page.evaluate(() => { window.__weatherLocateDenied = false; });
  await widget.locator('[data-weather-action="locate"]').click();
  await widget.locator('[data-weather-map-marker][transform="translate(319.65 54.32)"]').waitFor({ state: "attached" });
  await page.waitForFunction(() => document.querySelector("[data-weather-widget]").getAttribute("aria-busy") === "false");
  const beforeRefresh = requestCount();
  await refreshAs(82);
  await monitor.click();
  await selected(weather, visitor);
  await sameStation("translate(319.65 54.32)", "35.68°N / 139.65°E");
  assert.equal(await widget.getAttribute("data-weather-phase"), "storm");
  assert.equal(requestCount(), beforeRefresh + 1, "a single refresh updates both views");
  await page.screenshot({ path: path.join(output, "atlas-weather-" + page.viewportSize().width + ".png") });
  await closeAndCheckFocus(monitor);
}

async function terminalCase(
  browser,
  {
    width,
    height,
    home = false,
    failFirst = false,
    zone = "America/Los_Angeles",
  }
) {
  const context = await browser.newContext({
    viewport: { width, height },
    timezoneId: zone,
    hasTouch: home && width < 1000,
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const midnight = {
    "America/Los_Angeles": "2026-10-11T07:00:00Z",
    "Europe/London": "2026-10-10T23:00:00Z",
    "Asia/Tokyo": "2026-10-10T15:00:00Z",
  }[zone];
  await page.clock.setFixedTime(new Date(Date.parse(midnight) - 60000));
  let mode = failFirst ? "failure" : "normal";
  let calls = 0;
  const errors = [];
  const stylesheetFailures = [];
  const stylesheetResponses = [];
  const failedRequests = [];
  page.on("requestfailed", (request) =>
    failedRequests.push({
      url: request.url(),
      failure: request.failure()?.errorText,
    })
  );
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("response", async (response) => {
    if (response.request().resourceType() === "stylesheet") {
      const body = await response.text().catch(() => "");
      stylesheetResponses.push({
        url: response.url(),
        status: response.status(),
        contentType: response.headers()["content-type"],
        length: body.length,
        start: body.slice(0, 100),
      });
    }
    if (
      response.request().resourceType() === "stylesheet" &&
      response.status() >= 400
    )
      stylesheetFailures.push(`${response.status()} ${response.url()}`);
  });
  await page.addInitScript(() => {
    localStorage.setItem(
      "site-companion-v1",
      JSON.stringify({
        speed: 0,
        affinity: { alice: 35, marisa: 35, patchouli: 35 },
      })
    );
    localStorage.setItem("site-live2d-enabled", "true");
    window.__weatherLocateDenied = true;
    Object.defineProperty(navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition(success, failure) {
          if (window.__weatherLocateDenied)
            failure({ code: 1, message: "Test permission denied" });
          else success({ coords: { latitude: 35.6762, longitude: 139.6503 } });
        },
      },
    });
  });
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (url.hostname === "api.open-meteo.com" && (url.searchParams.get("latitude") || "").includes(",")) {
      await route.fulfill({ json: [] }); // Regional samples have their own integration suite.
    } else if (url.hostname === "api.open-meteo.com") {
      calls++;
      assert.equal(url.searchParams.get("forecast_days"), "2");
      assert(
        !url.searchParams
          .get("current")
          .split(",")
          .some((field) => ["rain", "showers"].includes(field)),
        "request only current fields used by the widget"
      );
      assert.equal(
        url.searchParams.get("daily"),
        "temperature_2m_max,temperature_2m_min"
      );
      assert.match(
        url.searchParams.get("hourly"),
        /temperature_2m,precipitation_probability/
      );
      await route.fulfill({
        status: mode === "failure" ? 503 : 200,
        contentType: "application/json",
        body: JSON.stringify(
          mode === "failure" ? { error: true } : forecast(mode)
        ),
      });
    } else if (url.origin === new URL(base).origin || url.protocol === "data:")
      await route.continue();
    else await route.abort();
  });
  try {
    await page.goto(base + (home ? "" : "playground/"), {
      waitUntil: "domcontentloaded",
    });
    await page.waitForLoadState("load");
    assert.deepEqual(
      stylesheetFailures,
      [],
      "preview stylesheets must be available; do not run during Jekyll rebuilds"
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-weather-calendar-gregorian]")
          ?.textContent.includes("2026.10.10"),
      null,
      { timeout: 15000 }
    );
    await page.locator('[data-vn-open="weather"]').click();
    const panel = page.locator('[data-vn-panel="weather"]');
    const widget = panel.locator("[data-weather-widget]");
    await widget.waitFor({ state: "visible" });
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-weather-widget]")
          .getAttribute("aria-busy") === "false"
    );
    await page.evaluate(() => document.fonts.ready);
    await withinPanel(page, panel, width, height);
    await checkMap(page);
    assert.equal(
      await widget
        .locator("[data-weather-map-marker]")
        .getAttribute("transform"),
      "translate(178.11 37.51)"
    );
    assert.equal(
      await widget.locator("[data-weather-coordinates]").textContent(),
      "52.49°N / 1.89°W"
    );
    assert.equal(
      await widget.locator("[data-weather-calendar-gregorian]").textContent(),
      "2026.10.10"
    );
    assert.equal(
      await widget.locator("[data-weather-calendar-kyureki]").textContent(),
      "八月三十日"
    );
    assert.equal(
      await widget.locator("[data-weather-calendar-gensokyo]").textContent(),
      "第141季"
    );
    assert.equal(
      await widget.locator("[data-weather-calendar-attributes]").textContent(),
      "日／夏／火"
    );
    assert.equal(
      await widget.locator("[data-weather-calendar-time]").textContent(),
      "23:59"
    );
    assert.equal(
      await widget.locator(".weather-calendar__notes").count(),
      0,
      "calendar remains concise without conversion explanations"
    );
    assert.equal(
      await widget
        .locator("[data-weather-calendar-gregorian]")
        .getAttribute("title"),
      "2026年10月10日（土）"
    );
    assert.match(
      await widget
        .locator("[data-weather-calendar-kyureki]")
        .getAttribute("aria-label"),
      /旧暦 2026年 八月三十日/
    );
    assert.match(
      await widget
        .locator(".weather-calendar__gensokyo dd")
        .getAttribute("aria-label"),
      /日と夏と火の年/
    );
    const calendarCells = await widget
      .locator(".weather-calendar dd")
      .evaluateAll((cells) =>
        cells.map((cell) => {
          const box = cell.getBoundingClientRect();
          const style = getComputedStyle(cell);
          return {
            y: box.y,
            height: cell.clientHeight,
            lineHeight: parseFloat(style.lineHeight),
          };
        })
      );
    assert.equal(calendarCells.length, 3);
    assert(
      Math.max(...calendarCells.map((cell) => cell.y)) -
        Math.min(...calendarCells.map((cell) => cell.y)) <
        1,
      "all three calendar dates share one line"
    );
    calendarCells.forEach((cell) =>
      assert(
        cell.height <= cell.lineHeight + 1.5,
        "each calendar date stays on one line"
      )
    );

    const refresh = widget.locator('[data-weather-action="refresh"]');
    const locate = widget.locator('[data-weather-action="locate"]');
    const refreshAs = async (nextMode) => {
      mode = nextMode;
      const oldCalls = calls;
      await refresh.click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("[data-weather-widget]")
            .getAttribute("aria-busy") === "false"
      );
      assert(calls > oldCalls, "refresh bypasses cached conditions");
    };

    if (failFirst) {
      assert.match(
        await widget.locator("[data-weather-status]").textContent(),
        /更新できません/
      );
      assert.equal(await widget.locator("[data-weather-signal]").textContent(), "通信待機");
      assert(
        await widget.locator("[data-weather-calendar-gregorian]").isVisible(),
        "calendar survives a failed weather request"
      );
      await refreshAs("normal");
    }
    assert.equal(
      await widget.locator("[data-weather-temperature]").textContent(),
      "17°C"
    );
    assert.equal(
      await widget.locator("[data-weather-pressure]").textContent(),
      "1015"
    );
    assert.equal(
      await widget.locator("[data-weather-direction]").textContent(),
      "南西 225°"
    );
    assert.equal(
      await widget.locator("[data-weather-humidity]").textContent(),
      "63%"
    );
    assert.equal(
      await widget.locator("[data-weather-chart-start]").textContent(),
      "15:00"
    );
    assert.equal(
      await widget.locator("[data-weather-chart-end]").textContent(),
      "14:00"
    );
    const temperaturePath = await widget
      .locator("[data-weather-chart-temperature]")
      .getAttribute("d");
    const rainPath = await widget
      .locator("[data-weather-chart-rain]")
      .getAttribute("d");
    assert(
      temperaturePath.startsWith("M") &&
        temperaturePath.split("L").length === 24,
      "actual hourly temperatures produce a 24-point curve"
    );
    assert(
      rainPath.includes("v-") && rainPath.length > 100,
      "hourly precipitation probabilities produce columns"
    );
    assert(!/NaN|Infinity/.test(temperaturePath + rainPath));
    assert(await widget.locator("[data-weather-chart]").isVisible());
    assert(!(await widget.locator("[data-weather-chart-empty]").isVisible()));

    await locate.click();
    assert.match(
      await widget.locator("[data-weather-status]").textContent(),
      /現在地を取得できません/
    );
    assert(
      (await refresh.isEnabled()) && (await locate.isEnabled()),
      "denied geolocation leaves both controls usable"
    );
    assert.equal(
      await widget
        .locator("[data-weather-map-marker]")
        .getAttribute("transform"),
      "translate(178.11 37.51)"
    );

    if (width === 1440 && !home) {
      for (const [code, phase] of [[80, "rain"], [81, "rain"], [82, "storm"], [85, "snow"], [86, "snow"]]) {
        await refreshAs(code);
        assert.equal(await widget.getAttribute("data-weather-phase"), phase, "Weather code " + code);
      }
      await refreshAs("invalid");
      assert.equal(await widget.locator("[data-weather-signal]").textContent(), "通信待機");
      assert.equal(await page.evaluate(() => JSON.parse(sessionStorage.getItem(
        "site-weather-v2:52.49:-1.89")).payload.current.weather_code), 86,
        "A failed response preserves the last usable cached observation");
      await refreshAs("holes");
      assert(
        (
          await widget
            .locator("[data-weather-chart-temperature]")
            .getAttribute("d")
        ).split("M").length > 2,
        "missing samples break the curve instead of inventing temperatures"
      );
      for (const nextMode of ["null", "missing"]) {
        await refreshAs(nextMode);
        assert(!(await widget.locator("[data-weather-chart]").isVisible()));
        assert.match(
          await widget.locator("[data-weather-chart-empty]").textContent(),
          /取得できません/
        );
        assert(
          !/NaN|Infinity/.test(
            (await widget
              .locator("[data-weather-chart-temperature]")
              .getAttribute("d")) || ""
          )
        );
        assert(
          !/NaN|Infinity/.test(
            (await widget
              .locator("[data-weather-chart-rain]")
              .getAttribute("d")) || ""
          )
        );
      }
      await refreshAs("normal");
      await page.evaluate(() => {
        window.__weatherLocateDenied = false;
      });
      await locate.click();
      await page.waitForFunction(
        () =>
          document
            .querySelector("[data-weather-widget]")
            .getAttribute("aria-busy") === "false"
      );
      assert.equal(
        await widget
          .locator("[data-weather-map-marker]")
          .getAttribute("transform"),
        "translate(319.65 54.32)"
      );
      assert.equal(
        await widget.locator("[data-weather-coordinates]").textContent(),
        "35.68°N / 139.65°E"
      );
      await checkMap(page);
      const mapViewport = widget.locator("[data-atlas-viewport]");
      await mapViewport.focus();
      mode = "failure";
      const failedPick = page.waitForRequest(request =>
        new URL(request.url()).searchParams.get("cell_selection") === "nearest");
      await mapViewport.press("Shift+ArrowRight");
      await mapViewport.press("Enter");
      await failedPick;
      await widget.locator("[data-weather-status]").filter({hasText: "現在地の観測を表示しています"}).waitFor();
      assert.equal(await widget.locator("[data-weather-coordinates]").textContent(), "35.68°N / 139.65°E");
      mode = "normal";
      await page.emulateMedia({ reducedMotion: "no-preference" });
      assert.equal(await widget.locator(".weather-map__sights").first().evaluate(sight =>
        getComputedStyle(sight).animationName), "none", "the crosshair stays fixed while a station settles");
      await page.emulateMedia({ reducedMotion: "reduce" });
    }

    await page.clock.setFixedTime(new Date(Date.parse(midnight) + 60000));
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange"))
    );
    assert.equal(
      await widget.locator("[data-weather-calendar-gregorian]").textContent(),
      "2026.10.11"
    );
    assert.equal(
      await widget.locator("[data-weather-calendar-kyureki]").textContent(),
      "九月一日"
    );
    assert.equal(
      await widget.locator("[data-weather-calendar-time]").textContent(),
      "00:01"
    );
    assert.equal(
      await widget.locator("[data-weather-time]").textContent(),
      "15:00 BST",
      "calendar midnight is independent of the observation timestamp"
    );
    await page.clock.setFixedTime(new Date(Date.parse(midnight) + 120000));
    await page.evaluate(() =>
      document.dispatchEvent(new Event("visibilitychange"))
    );
    assert.equal(
      await widget.locator("[data-weather-calendar-time]").textContent(),
      "00:02",
      "local clock refreshes even without a date change"
    );
    await refresh.click({ trial: true });
    await locate.click({ trial: true });
    await panel.locator(".vn-weather-talk").click({ trial: true });
    await withinPanel(page, panel, width, height);
    await panel.evaluate((element) => {
      element.scrollTop = 0;
    });
    await settle(page);
    await page.screenshot({
      path: path.join(
        output,
        `${home ? "docked" : failFirst ? "recovered" : "standalone"}-${width}${zone === "America/Los_Angeles" ? "" : "-" + zone.replace("/", "-")}.png`
      ),
    });
    if (home) await checkAtlas(page, widget, width < 1000, refreshAs, () => calls);
    assert.deepEqual(
      errors,
      [],
      "weather UI raises no page errors with unavailable model/CDN"
    );
    console.log("PASS weather terminal", {
      width,
      height,
      home,
      failFirst,
      zone,
      requests: calls,
    });
  } catch (error) {
    await page.screenshot({
      path: path.join(
        output,
        `failure-${home ? "docked" : "standalone"}-${width}.png`
      ),
    });
    const stylesheetDiagnostic = {
      responses: stylesheetResponses,
      failedRequests,
      page: await page.evaluate(() => ({
        title: document.title,
        url: location.href,
        links: [...document.querySelectorAll("link[rel=stylesheet]")].map(
          (link) => ({
            href: link.href,
            disabled: link.disabled,
            media: link.media,
            sheet: Boolean(link.sheet),
          })
        ),
        sheets: [...document.styleSheets].map((sheet) => {
          try {
            return {
              href: sheet.href,
              disabled: sheet.disabled,
              rules: sheet.cssRules.length,
            };
          } catch (error) {
            return { href: sheet.href, error: error.message };
          }
        }),
      })),
    };
    const diagnosticPath = path.join(
      output,
      `failure-styles-${home ? "docked" : "standalone"}-${width}.json`
    );
    fs.writeFileSync(
      diagnosticPath,
      JSON.stringify(stylesheetDiagnostic, null, 2)
    );
    console.error("Weather stylesheet diagnostic:", diagnosticPath);
    console.error(
      "Weather layout diagnostic",
      await page
        .locator('[data-vn-panel="weather"]')
        .evaluate((element) => {
          const list = [];
          while (element) {
            const box = element.getBoundingClientRect(),
              style = getComputedStyle(element);
            list.push({
              className: element.className,
              y: box.y,
              height: box.height,
              cssHeight: style.height,
              maxHeight: style.maxHeight,
              display: style.display,
              overflow: style.overflow,
              position: style.position,
            });
            element = element.parentElement;
          }
          return list;
        })
        .catch(() => [])
    );
    throw error;
  } finally {
    await context.close();
  }
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const [width, height] of [
      [1440, 1000],
      [768, 1000],
      [375, 812],
      [320, 740],
    ]) {
      await terminalCase(browser, { width, height });
    }
    await terminalCase(browser, { width: 1440, height: 1000, home: true });
    await terminalCase(browser, { width: 844, height: 390, home: true });
    await terminalCase(browser, { width: 375, height: 812, failFirst: true });
    await terminalCase(browser, {
      width: 375,
      height: 812,
      zone: "Europe/London",
    });
    await terminalCase(browser, {
      width: 375,
      height: 812,
      zone: "Asia/Tokyo",
    });
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
