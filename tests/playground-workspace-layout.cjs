// The right side stays useful as the receiver is folded or the window changes shape.
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(new URL("playground/", base).href, { waitUntil: "domcontentloaded" });
    const receiver = page.locator(".pg-radio");
    const summary = receiver.locator("summary");
    await summary.waitFor();
    await page.evaluate(() => document.fonts.ready);

    for (const [width, height, layout] of [
      [1440, 900, "wide"], [1920, 1080, "wide"], [2560, 1080, "wide"],
      [1280, 720, "wide"], [1024, 600, "wide"], [3200, 1800, "wide"],
      [1280, 878, "wide"], [1440, 925, "wide"],
      [1024, 1366, "compact"], [375, 1000, "compact"], [390, 844, "compact"],
      [844, 390, "landscape"],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(({ width, height }) => {
        const widget = document.querySelector("#live2d-widget");
        return widget.style.height === height + "px" && widget.style.getPropertyValue("--vn-width") === width + "px";
      }, { width, height });
      assert.equal(await page.locator("#live2d-widget").getAttribute("data-playground-layout"), layout);
      for (const open of [false, true]) {
        if (await receiver.evaluate(e => e.open) !== open) {
          await summary.focus();
          await page.keyboard.press("Enter");
          assert.equal(await receiver.evaluate(e => e.open), open);
          assert(await summary.evaluate(e => e === document.activeElement), "Folding keeps keyboard focus");
        }
        const m = await page.locator(".vn-main-view").evaluate(view => {
          view.scrollTop = 0;
          const rect = selector => view.querySelector(selector).getBoundingClientRect().toJSON();
          const tools = view.querySelector(".pg-tools");
          return {
            view: view.getBoundingClientRect().toJSON(), desk: rect(".pg-dialogue-desk"),
            stage: rect(".companion-stage"), radio: rect(".pg-radio"), apps: rect(".pg-launchers"),
            roster: rect(".pg-roster"), mainOverflowX: view.scrollWidth - view.clientWidth,
            toolsOverflowY: tools.scrollHeight - tools.clientHeight,
          };
        });
        const label = width + "×" + height + ", receiver " + (open ? "open" : "closed");
        assert(m.mainOverflowX <= 1, label + " horizontal overflow");
        if (layout === "wide") {
          assert(m.toolsOverflowY <= 2, label + " clipped tools");
          assert(m.view.bottom - m.desk.bottom < 12, label + " reading desk must finish at the bottom frame");
          if (!open) {
            assert(Math.abs(m.roster.bottom - m.apps.bottom) < 2, label + " inline toolbar");
            assert(m.view.right - m.stage.right < 10 && m.view.right - m.desk.right < 10, label + " empty side rail");
          } else if (m.stage.width > m.view.width * .95) {
            assert(Math.abs(m.radio.bottom - m.desk.bottom) < 2, label + " bottom receiver alignment");
          } else {
            const toolsEnd = m.desk.right > m.apps.left ? m.desk.top : m.view.bottom;
            assert(toolsEnd >= m.apps.bottom && toolsEnd - m.apps.bottom < 80, label + " right column gap");
          }
        } else {
          if (layout === "compact" && !open)
            assert(Math.abs(m.view.bottom - m.apps.bottom) < 10, label + " empty floor below controls");
          await page.locator(".pg-launchers button").last().click({ trial: true });
        }
      }
      console.log("PASS receiver layouts", width, height);
    }
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
