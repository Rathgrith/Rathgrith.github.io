/* Exercise the production hostname without sending visits to the real counter. */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = new URL(process.env.PREVIEW_URL || "http://127.0.0.1:4100/");
const site = "https://rathgrith.github.io";
const localWidget = `
// Match the provider's fixed projection and deferred marker-data response.
const script = document.currentScript;
const width = Number(new URL(script.src).searchParams.get("w"));
const map = document.createElement("a");
map.id = "mapmyvisitors-widget";
map.href = "https://mapmyvisitors.com/web/1c5dg";
map.style.cssText = "display:block;width:" + width + "px";
map.innerHTML = '<div class="mapmyvisitors-map-container"><div class="mapmyvisitors-map">' +
  '<div class="mapmyvisitors-loading">Loading data...</div><div class="jvectormap-container">' +
  '<svg width="100" height="100"><g></g></svg></div></div></div><small>MapMyVisitors</small>';
const host = map.querySelector(".mapmyvisitors-map"), svg = host.querySelector("svg");
host.style.height = (width / 2.04) + "px";
const model = {
  width:100, height:100,
  updateSize() {
    this.width = host.clientWidth; this.height = host.clientHeight;
    svg.setAttribute("width", this.width); svg.setAttribute("height", this.height);
  },
};
window.vmap_jq = () => ({children: () => ({data: () => model})});
window.finishLocalMap = count => {
  host.querySelector(".mapmyvisitors-loading")?.remove();
  const group = svg.querySelector("g"); group.replaceChildren();
  for (let i = 0; i < count; i++) {
    const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    circle.setAttribute("class", "jvectormap-marker");
    circle.setAttribute("r", "3"); circle.setAttribute("cx", 30 + 50 * i); circle.setAttribute("cy", 60);
    group.appendChild(circle);
  }
};
script.after(map);
`;

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    for (const [origin, clientIP, scenario] of [
      [site, "192.0.2.40", "points"], [site, "2001:db8::12", "empty"],
      [site, "198.51.100.22", "error"], [site, "192.0.2.55", "stalled"],
      ["https://preview.example", "2001:db8::12", "preview"],
    ]) {
      // A test edge forwards either address family. The client starts the map
      // without receiving the address or asking any geolocation service for it.
      const page = await browser.newPage({
        reducedMotion: "reduce", extraHTTPHeaders: {"X-Forwarded-For": clientIP},
      });
      const native = ["points","empty","stalled"].includes(scenario);
      if (scenario === "stalled") await page.clock.install();
      const vendorRequests = [], networkLookups = [];
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin) {
          // The map and soft-navigation modules are independent of the other
          // page assets. Keep model, gallery and audio loads out of this suite.
          if (!["/", "/gallery/", "/assets/css/classic-base.css", "/assets/css/classic-widgets.css",
                "/assets/css/classic-theme.css", "/assets/css/classic-site.css", "/assets/css/classic-weather.css",
                "/assets/images/classic/weather/world-map.svg",
                "/assets/js/core/site-assets.js", "/assets/js/core/site-options.js",
                "/assets/js/core/visitor-map.js", "/assets/js/core/page-transition.js"].includes(url.pathname)) {
            return route.abort();
          }
          const response = await route.fetch({ url: new URL(url.pathname + url.search, base).href });
          if (url.pathname === "/" || url.pathname === "/gallery/") {
            assert.equal(route.request().headers()["x-forwarded-for"], clientIP);
            assert.doesNotMatch(await response.text(), /data-visitor-map-excluded|sha256:[a-f0-9]{64}/i);
          }
          return route.fulfill({ response });
        }
        if (/(^|\.)mapmyvisitors\.com$/.test(url.hostname)) {
          vendorRequests.push(url.href);
          if (url.pathname === "/map.js" && native)
            return route.fulfill({ contentType: "application/javascript", body: localWidget });

        }
        if (url.hostname.endsWith(".geojs.io") || ["fetch","xhr"].includes(route.request().resourceType()))
          networkLookups.push(url.href);
        return route.abort();
      });
      await page.goto(origin, {waitUntil:"domcontentloaded"});
      const mount = page.locator("[data-visitor-map-mount]");
      const state = value => page.waitForFunction(s =>
        document.querySelector("[data-visitor-map-mount]").dataset.visitorMapState === s, value);
      const status = page.locator("[data-visitor-map-status]");
      await state(native ? "loading" : scenario === "preview" ? "preview" : "unavailable");
      if (native) {
        await mount.locator(".mapmyvisitors-loading").waitFor({state:"attached"});
        assert.match(await status.textContent(), /loading/i);
        if (scenario !== "stalled") await page.evaluate(count => window.finishLocalMap(count), scenario === "points" ? 3 : 0);
      }
      // Re-initializing the shared shell must not mount or retry the provider.
      await page.addScriptTag({url: origin + "/assets/js/core/visitor-map.js"});
      await page.locator("[data-visitor-map-open]:visible").first().click();
      assert(await page.locator("#visitor-map-dialog").isVisible());
      const report = page.locator("[data-visitor-map-report]");
      assert.equal(await report.getAttribute("href"), "https://mapmyvisitors.com/web/1c5dg");
      assert(await report.isVisible(), "the official report remains reachable in all states");
      if (scenario === "stalled") {
        await page.clock.fastForward(16000);
        await state("unavailable");
        assert.match(await status.textContent(), /unavailable/i);
        await page.evaluate(() => window.finishLocalMap(1));
        await state("allowed");
        assert.match(await status.textContent(), /1 recent location marker\./);
      }
      if (scenario === "preview") {
        const scan = page.locator(".visitor-map__scan");
        assert.equal(await scan.evaluate(el => getComputedStyle(el).animationName), "none");
        await page.emulateMedia({reducedMotion:"no-preference"});
        for (let replay = 0; replay < 2; replay++) {
          await page.locator("#atlas-weather-tab").click();
          await page.locator("#atlas-visitors-tab").click();
          assert(await scan.evaluate(el => el.getAnimations().some(a => a.animationName === "visitor-map-scan") &&
            getComputedStyle(el).pointerEvents === "none"), "opening the visitor layer plays a non-interactive sweep");
        }
        await page.emulateMedia({reducedMotion:"reduce"});
        await page.locator("#atlas-visitors-panel").focus();
        assert(await page.locator("#atlas-visitors-panel").evaluate(el => document.activeElement === el));
        const initialScroll = await page.evaluate(() => scrollY);
        await page.mouse.move(8, 8);
        await page.mouse.wheel(0, 380);
        await page.evaluate(() => new Promise((done) =>
          requestAnimationFrame(() => requestAnimationFrame(done))
        ));
        assert.equal(await page.evaluate(() => scrollY), initialScroll,
          "the modal backdrop keeps the launcher in view");
      }
      const templateSrc = await page.locator("#visitor-map-embed").evaluate((el) =>
        el.content.querySelector("script[src]").src);
      const mapKey = new URL(templateSrc).searchParams.get("d");
      assert(mapKey, "the provider script must contain a map identifier");
      if (native) {
        const count = scenario === "points" ? 3 : (scenario === "empty" ? 0 : 1);
        await state(count ? "allowed" : "empty");
        assert.equal(await mount.locator(".jvectormap-marker").count(), count);
        assert.match(await status.textContent(), count ? new RegExp(count + " recent location marker") : /no recent locations/i);
        const widget = mount.locator("#mapmyvisitors-widget");
        // The provider's SVG began as 100×100 inside a closed dialog.
        await page.waitForFunction(() => {
          const host = document.querySelector(".mapmyvisitors-map"), svg = host.querySelector("svg");
          return +svg.getAttribute("width") === host.clientWidth && +svg.getAttribute("height") === host.clientHeight;
        });
        assert(await widget.isVisible());
        const surface = page.locator(".visitor-map__display");
        await widget.evaluate(el => { window.nativeMapWidget = el; });
        const colors = [];
        for (const theme of ["alice", "marisa", "patchouli"]) {
          await page.evaluate(t => document.documentElement.dataset.live2dCharacter = t, theme);
          colors.push(await widget.locator(".mapmyvisitors-map").evaluate(el => getComputedStyle(el).backgroundColor));
        }
        assert.equal(new Set(colors).size, 3, "all three themes recolor the provider's original raster");
        if (count) {
          assert(await widget.locator(".jvectormap-marker").first().evaluate(el => {
            const style = getComputedStyle(el);
            return style.stroke !== "none" && parseFloat(style.strokeWidth) > 1 && style.vectorEffect === "non-scaling-stroke";
          }), "native points retain a contrasting outline on the chart");
        }
        for (const width of [320, 390, 1280]) {
          await page.setViewportSize({width, height:800});
          await page.waitForFunction(() => {
            const box = document.querySelector(".visitor-map__display").getBoundingClientRect();
            const native = document.querySelector("#mapmyvisitors-widget").getBoundingClientRect();
            return Math.abs(native.width - box.width) <= 1 && native.bottom <= box.bottom + 1;
          });
        }
        assert.equal(await surface.evaluate(el => getComputedStyle(el, "::before").opacity), "0");
        assert(await widget.evaluate(el => el === window.nativeMapWidget), "the same native link survives resize and palette changes");
        assert.equal(await widget.getAttribute("href"), "https://mapmyvisitors.com/web/1c5dg");
        await page.locator("#atlas-weather-tab").click();
        assert(!await widget.isVisible());
        await page.keyboard.press("ArrowLeft");
        assert(await widget.isVisible() && await widget.evaluate(el => el === window.nativeMapWidget));
        await widget.focus();
        assert(await widget.evaluate(el => document.activeElement === el));
      } else {
        assert(await page.locator("[data-visitor-map-status]").isVisible());
        assert.equal(await mount.locator("a, img, svg, iframe").count(), 0, "the fallback contains no visitor points or tracking image");
      }
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#visitor-map-dialog").isVisible(), false);
      await mount.evaluate((el) => { window.originalMap = el; });
      await page.locator('[data-classic-page="gallery"]').evaluate((a) => a.click());
      await page.waitForURL(origin + "/gallery/");
      assert(await mount.evaluate((el) => el === window.originalMap));
      if (native) {
        await page.locator("[data-site-options-trigger]").click();
        await page.locator("[data-site-options-menu] [data-visitor-map-open]").click();
        assert(await mount.locator("#mapmyvisitors-widget").isVisible());
        await page.locator(".visitor-map__close").click();
        assert.equal(await page.locator("#visitor-map-dialog").isVisible(), false);
      }
      assert.deepEqual(networkLookups, [], "the site never looks up the client IP or city");
      assert.deepEqual(vendorRequests, scenario === "preview" ? [] : [templateSrc]);
      await page.unrouteAll({ behavior: "wait" });
      await page.close();
    }
    console.log("PASS: native marker, empty, loading and failure states, recovery and hidden projection sizing; one mount on IPv4/IPv6 across tabs, themes and navigation; preview sends no visits.");
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
