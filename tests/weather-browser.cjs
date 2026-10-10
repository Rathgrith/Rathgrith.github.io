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
    return {
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
  assert(
    geometry.scrollWidth <= geometry.clientWidth + 1,
    "weather sheet has no horizontal scroll"
  );
  return geometry;
}

async function checkMap(page) {
  const map = page.locator(".weather-map > img");
  await map.evaluate((image) => image.decode());
  const boxes = await page.locator(".weather-map").evaluate((element) => {
    const image = element.querySelector("img").getBoundingClientRect();
    const svg = element.querySelector("svg").getBoundingClientRect();
    return {
      image: {
        width: image.width,
        height: image.height,
        x: image.x,
        y: image.y,
      },
      svg: { width: svg.width, height: svg.height, x: svg.x, y: svg.y },
    };
  });
  assert(
    Math.abs(boxes.image.width / boxes.image.height - 2) < 0.01,
    "world map preserves 2:1 geography"
  );
  assert(
    Math.abs(boxes.svg.width / boxes.svg.height - 2) < 0.01,
    "map crosshair uses the same aspect ratio"
  );
  assert(
    Math.abs(boxes.image.width - boxes.svg.width) < 1 &&
      Math.abs(boxes.image.height - boxes.svg.height) < 1,
    "map and geographic overlay align"
  );
  assert(
    Math.abs(boxes.image.x - boxes.svg.x) < 1 &&
      Math.abs(boxes.image.y - boxes.svg.y) < 1,
    "map marker origin aligns"
  );
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
    if (url.hostname === "api.open-meteo.com") {
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
