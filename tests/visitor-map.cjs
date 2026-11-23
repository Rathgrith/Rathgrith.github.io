/* Exercise the production hostname without sending visits to the real counter. */
const assert = require("node:assert/strict");
const { createHash } = require("node:crypto");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = new URL(process.env.PREVIEW_URL || "http://127.0.0.1:4100/");
const site = "https://rathgrith.github.io";
const excluded = "192.0.2.40";
const canonicalV6 = "2001:db8::12";
const expandedV6 = "2001:0DB8:0000:0000:0000:0000:0000:0012";
const digest = (ip) => "sha256:" + createHash("sha256").update(ip).digest("hex");
const mixed = ["198.51.100.22", excluded, digest(canonicalV6)];
const birmingham = [{ country: "GB", city: "Birmingham" }];
const network = (ip, city = "Coventry", country_code = "GB") => ({
  ip, city, country_code, region: "West Midlands",
});

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    for (const [rules, cities, result, expected, checkIP, vendorFails] of [
      [mixed, birmingham, network(excluded), "excluded", true],
      [mixed, birmingham, network(expandedV6), "excluded", true],
      [[expandedV6, digest(excluded)], [], network(canonicalV6), "excluded", true],
      [[expandedV6, digest(excluded)], [], network(excluded), "excluded", true],
      [mixed, birmingham, network("2001:db8::13"), "allowed", true],
      [[], birmingham, network("192.0.2.1", " bIRmingHam ", "gb"), "excluded", true],
      [[], birmingham, network("192.0.2.1", "Birmingham", "US"), "allowed", true],
      [[], birmingham, network("192.0.2.1", "New Birmingham", "GB"), "allowed", true],
      [[], birmingham, network("192.0.2.1", null), "unavailable", true],
      [[], birmingham, network("192.0.2.1", "Birmingham", null), "unavailable", true],
      [mixed, [], network("192.0.2.999"), "unavailable", true],
      [mixed, birmingham, null, "unavailable", true],
      [[excluded, "sha256:invalid"], [], null, "unavailable", false],
      [[excluded, "2001:db8:::12"], [], null, "unavailable", false],
      [excluded, [], null, "unavailable", false],
      [[], [{ city: "Birmingham" }], null, "unavailable", false],
      [[], [], null, "allowed", false],
      [[], [], null, "unavailable", false, true],
      [mixed, birmingham, null, "preview", false],
    ]) {
      const page = await browser.newPage({ reducedMotion: "reduce" });
      const origin = expected === "preview" ? "https://preview.example" : site;
      let lookups = 0, release;
      const vendorRequests = [];
      const lookupGate = new Promise((resolve) => { release = resolve; });
      await page.route("**/*", async (route) => {
        const url = new URL(route.request().url());
        if (url.origin === origin) {
          // The map and soft-navigation modules are independent of the other
          // page assets. Keep model, gallery and audio loads out of this suite.
          if (!["/", "/gallery/", "/assets/css/classic-base.css", "/assets/css/classic-widgets.css",
                "/assets/js/core/site-assets.js", "/assets/js/core/site-options.js",
                "/assets/js/core/visitor-map.js", "/assets/js/core/page-transition.js"].includes(url.pathname)) {
            return route.abort();
          }
          const response = await route.fetch({ url: new URL(url.pathname + url.search, base).href });
          if (url.pathname === "/" || url.pathname === "/gallery/") {
            let body = await response.text();
            for (const [key, value] of [["ips", rules], ["cities", cities]]) {
              const attribute = "data-visitor-map-excluded-" + key;
              const pattern = new RegExp(attribute + '="[^"]*"');
              assert.match(body, pattern, "the map must render the " + key + " list");
              body = body.replace(pattern, attribute + '="' +
                JSON.stringify(value).replaceAll('"', "&quot;") + '"');
            }
            return route.fulfill({ response, body });
          }
          return route.fulfill({ response });
        }
        if (url.href === "https://get.geojs.io/v1/ip/geo.json") {
          lookups++;
          await lookupGate;
          if (!result) return route.abort();
          return route.fulfill({ json: result, headers: { "Access-Control-Allow-Origin": "*" } });
        }
        if (/(^|\.)mapmyvisitors\.com$/.test(url.hostname)) {
          vendorRequests.push(url.href);
          if (url.pathname === "/map.js" && !vendorFails) {
            return route.fulfill({ contentType: "application/javascript", body: `
              const script = document.currentScript;
              const map = document.createElement("a");
              map.dataset.testWidget = new URL(script.src).searchParams.get("d");
              map.href = "https://mapmyvisitors.com/";
              map.textContent = "Visitor map";
              script.after(map);
            ` });
          }
        }
        return route.abort();
      });
      const pending = checkIP ? page.waitForRequest("https://get.geojs.io/v1/ip/geo.json") : null;
      await page.goto(origin, { waitUntil: "domcontentloaded" });
      if (pending) {
        await pending;
        assert.equal(vendorRequests.length, 0, "the embed must stay inert during the IP check");
      }
      release();
      await page.locator("[data-visitor-map-open]:visible").first().click();
      assert(await page.locator("#visitor-map-dialog").isVisible());
      if (expected === "preview") {
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
      const mount = page.locator('[data-visitor-map-state="' + expected + '"]');
      await mount.waitFor({ state: "attached" });
      if (expected === "allowed") {
        const widget = mount.locator("[data-test-widget]");
        await widget.waitFor({ state: "attached" });
        assert.equal(await widget.getAttribute("data-test-widget"), mapKey);
        assert(await widget.isVisible());
      } else {
        assert(await page.locator("[data-visitor-map-status]").isVisible());
      }
      await page.keyboard.press("Escape");
      assert.equal(await page.locator("#visitor-map-dialog").isVisible(), false);
      await mount.evaluate((el) => { window.originalMap = el; });
      await page.locator('[data-classic-page="gallery"]').evaluate((a) => a.click());
      await page.waitForURL(origin + "/gallery/");
      assert(await mount.evaluate((el) => el === window.originalMap));
      if (expected === "allowed") {
        await page.locator("[data-site-options-trigger]").click();
        await page.locator("[data-site-options-menu] [data-visitor-map-open]").click();
        assert(await mount.locator("[data-test-widget]").isVisible());
        await page.locator(".visitor-map__close").click();
        assert.equal(await page.locator("#visitor-map-dialog").isVisible(), false);
      }
      assert.equal(lookups, Number(checkIP));
      assert.deepEqual(vendorRequests, expected === "allowed" || vendorFails ? [templateSrc] : []);
      await page.unrouteAll({ behavior: "wait" });
      await page.close();
    }
    console.log("PASS: mixed IPv4/IPv6 exclusions and hashes, exact city/country matches, empty lists, fail-closed lookup/config, preview suppression, dialog controls, provider errors and one map across navigation");
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
