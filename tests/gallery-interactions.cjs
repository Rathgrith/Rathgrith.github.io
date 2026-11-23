/* Viewer interaction and asynchronous originals, independent of the CDN. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";
const output = process.env.QA_OUTPUT || "/tmp/gallery-interactions";
fs.mkdirSync(output, { recursive: true });
async function checkTouchZoom(page) {
  const session = await page.context().newCDPSession(page);
  const counter = page.locator("#gallery-modal-counter");
  const stage = await page.locator(".gallery-modal__image-stage").boundingBox();
  const x = Math.round(stage.x + stage.width / 2);
  const y = Math.round(stage.y + stage.height / 2);
  const touch = (type, xs) => session.send("Input.dispatchTouchEvent", {
    type,
    touchPoints: xs.map((point, id) => ({ x: point, y, id })),
  });
  const photo = await counter.textContent();
  await touch("touchStart", [x - 30, x + 30]);
  for (let offset = 40; offset <= 92; offset += 4)
    await touch("touchMove", [x - offset, x + offset]);
  await touch("touchEnd", []);
  await page.waitForFunction(() => visualViewport.scale > 1.5);
  const start = await page.evaluate(() => visualViewport.offsetLeft);
  await touch("touchStart", [x]);
  for (let offset = 10; offset <= 80; offset += 10)
    await touch("touchMove", [x - offset]);
  await touch("touchEnd", []);
  await page.waitForFunction((start) => visualViewport.offsetLeft > start + 5, start);
  assert.equal(await counter.textContent(), photo, "Panning a magnified original keeps the current photo");
  await session.detach();
}

async function checkEncodedFilenames(browser) {
  const fixture = await browser.newPage();
  const files = ["plain.jpg", "trip #1.jpg", "other.jpg"];
  const requests = [];
  const prefix = base + "__gallery-fixture/";
  await fixture.route(prefix + "images/**", async (route) => {
    requests.push(new URL(route.request().url()));
    await route.fulfill({
      path: path.join(__dirname, "../images/gallery/thumbnails/mayoi.jpg"),
      contentType: "image/jpeg",
    });
  });
  await fixture.route(prefix + "index", (route) =>
    route.fulfill({
      contentType: "text/html",
      body: `<!doctype html><div class="gallery-container"
      data-thumbnail-dir="${prefix}images/thumb/" data-original-dir="${prefix}images/full/">
      <div id="gallery"><div class="classic-showcase-grid">${files
        .map(
          (name) =>
            `<figure><a href="${prefix}images/full/${encodeURIComponent(name)}" data-gallery-filename="${name}">${name}</a></figure>`
        )
        .join("")}</div></div></div>
      <div id="gallery-modal" hidden aria-hidden="true">
        <button class="gallery-modal__close" data-gallery-close>Close</button>
        <div class="gallery-modal__image-stage"><img id="gallery-modal-image"><img data-gallery-placeholder></div>
        <span id="gallery-modal-caption"></span><span id="gallery-modal-gear"></span>
        <span id="gallery-modal-counter"></span><span data-gallery-status></span>
        <div id="gallery-modal-strip"></div>
      </div>`,
    })
  );
  // Preserve the fixture order, so the special name first appears via preloading.
  await fixture.addInitScript(() => {
    Math.random = () => 0.999;
  });
  await fixture.goto(prefix + "index");
  await fixture.addScriptTag({
    path: path.join(__dirname, "../assets/js/pages/gallery-page.js"),
  });
  await fixture.locator('[data-gallery-filename="plain.jpg"]').click();
  await fixture.waitForFunction(
    () =>
      document
        .querySelector(".gallery-modal__image-stage")
        .getAttribute("aria-busy") === "false"
  );
  const thumbSrc = await fixture
    .locator('[data-gallery-thumb-index="1"] img')
    .getAttribute("src");
  assert.equal(
    thumbSrc,
    prefix + "images/thumb/trip%20%231.jpg",
    "Filmstrip encodes the complete filename"
  );
  assert(
    requests.some((url) => url.pathname.endsWith("/full/trip%20%231.jpg")),
    "Adjacent original preloading encodes # instead of treating it as a fragment"
  );
  await fixture.keyboard.press("ArrowRight");
  await fixture.waitForFunction(
    () =>
      document
        .querySelector(".gallery-modal__image-stage")
        .getAttribute("aria-busy") === "false"
  );
  assert.equal(
    await fixture.locator("[data-gallery-placeholder]").getAttribute("src"),
    prefix + "images/thumb/trip%20%231.jpg"
  );
  assert.equal(
    await fixture.locator("#gallery-modal-image").getAttribute("src"),
    prefix + "images/full/trip%20%231.jpg"
  );
  assert(
    requests.some((url) => url.pathname.endsWith("/thumb/trip%20%231.jpg"))
  );
  assert(
    requests.every(
      (url) =>
        !url.hash &&
        files.includes(decodeURIComponent(url.pathname.split("/").pop()))
    ),
    "Every request names a complete original file"
  );
  await fixture.close();
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const gates = new Map();
  function gate(filename) {
    if (!gates.has(filename)) {
      let resolve;
      const ready = new Promise((done) => (resolve = done));
      gates.set(filename, { ready, resolve });
    }
    return gates.get(filename);
  }
  try {
    const page = await browser.newPage({
      viewport: { width: 375, height: 812 },
      isMobile: true,
      hasTouch: true,
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(/mapmyvisitors|clustrmaps|geojs\.io|google-analytics|googletagmanager|busuanzi/i, route => route.abort());
    await page.addInitScript(() => {
      localStorage.setItem("site-live2d-enabled", "false");
      localStorage.setItem("site-live2d-mobile-enabled", "false");
    });
    await page.route("**/images/gallery/originals/**", async (route) => {
      const filename = decodeURIComponent(
        new URL(route.request().url()).pathname.split("/").pop()
      );
      const outcome = await gate(filename).ready;
      if (outcome === "error") return route.abort();
      await route.fulfill({
        path: path.join(__dirname, "../images/gallery/thumbnails", filename),
        contentType: "image/jpeg",
      });
    });
    await page.goto(base + "gallery/");
    await page.locator('#gallery[data-gallery-bound="true"]').waitFor();
    await page.evaluate(() => document.fonts.ready);
    const cards = page.locator(".classic-photo a");
    const names = await cards.evaluateAll((links) =>
      links.map((link) => link.dataset.galleryFilename)
    );
    assert(names.length > 3);
    // The gallery should not suppress the browser's open-original gestures.
    for (const modifier of ["ctrlKey", "metaKey", "shiftKey", "altKey"]) {
      const cancelled = await cards.first().evaluate((link, modifier) => {
        let cancelledAtTarget = null;
        link.addEventListener(
          "click",
          (event) => {
            cancelledAtTarget = event.defaultPrevented;
            event.preventDefault(); // Do not really open a remote tab in the test.
          },
          { once: true }
        );
        link.dispatchEvent(
          new MouseEvent("click", {
            bubbles: true,
            cancelable: true,
            [modifier]: true,
          })
        );
        return cancelledAtTarget;
      }, modifier);
      assert.equal(
        cancelled,
        false,
        `${modifier} keeps native link activation`
      );
      assert(!(await page.locator("#gallery-modal").isVisible()));
    }
    await cards.first().scrollIntoViewIfNeeded();
    const scroll = await page.evaluate(() => scrollY);
    await cards.first().locator("figcaption").tap();
    const stage = page.locator(".gallery-modal__image-stage");
    assert.equal(await page.locator("[data-gallery-collection-title]").textContent(),
      await cards.first().evaluate(a => a.closest("[data-gallery-collection]").dataset.galleryCollection));
    assert.equal(await page.locator("[data-gallery-original]").getAttribute("href"),
      await cards.first().getAttribute("href"));
    assert.deepEqual(await page.locator("[data-gallery-thumb-index]").evaluateAll(buttons =>
      buttons.map(button => Number(button.dataset.galleryThumbIndex))), Array.from({length:13}, (_, i) => i));
    await page.waitForTimeout(260); // Allow the brief viewer entrance to finish.
    assert.equal(await stage.getAttribute("aria-busy"), "true");
    assert.equal(
      await page
        .locator(".gallery-modal__image-stage [data-gallery-status]")
        .count(),
      1
    );
    await page.keyboard.press("ArrowRight");
    const beforeDecode = await stage.boundingBox();
    gate(names[1]).resolve("ready");
    await page.waitForFunction(
      () =>
        document
          .querySelector(".gallery-modal__image-stage")
          .getAttribute("aria-busy") === "false"
    );
    assert(
      (await page.locator("#gallery-modal-image").getAttribute("src")).endsWith(
        names[1]
      )
    );
    assert.deepEqual(
      await stage.boundingBox(),
      beforeDecode,
      "Loading completion never resizes the stage"
    );
    gate(names[0]).resolve("ready");
    await page.waitForTimeout(80);
    assert(
      (await page.locator("#gallery-modal-image").getAttribute("src")).endsWith(
        names[1]
      ),
      "A late previous original cannot replace the current photo"
    );
    await page.screenshot({ path: output + "/viewer-ready.png" });

    await page.keyboard.press("ArrowRight");
    const beforeError = await stage.boundingBox();
    gate(names[2]).resolve("error");
    await page.waitForFunction(() =>
      document
        .querySelector("[data-gallery-status]")
        .textContent.includes("unavailable")
    );
    assert.equal(await stage.getAttribute("aria-busy"), "false");
    assert(await page.locator("[data-gallery-placeholder]").isVisible());
    assert.deepEqual(
      await stage.boundingBox(),
      beforeError,
      "Failure feedback keeps the stage stable"
    );
    await page.screenshot({ path: output + "/viewer-fallback.png" });
    assert(await page.locator("#gallery-modal-image").isHidden(), "A failed current original cannot expose the previous photo");
    gates.delete(names[2]);
    await page.getByRole("button", {name: "Retry"}).click();
    gate(names[2]).resolve("ready");
    await page.waitForFunction(() => document.querySelector(".gallery-modal__image-stage").getAttribute("aria-busy") === "false");
    assert((await page.locator("#gallery-modal-image").getAttribute("src")).endsWith(names[2]));
    assert(await page.getByRole("button", {name: "Retry"}).isHidden());

    for (const key of ["Tab", "Shift+Tab"]) {
      for (let i = 0; i < 12; i++) {
        await page.keyboard.press(key);
        assert(
          await page.evaluate(
            () => !!document.activeElement.closest("#gallery-modal")
          ),
          "Keyboard focus stays inside the viewer"
        );
      }
    }
    await page.keyboard.press("End");
    assert.equal(await page.locator("[data-gallery-thumb-index]").last().getAttribute("data-gallery-thumb-index"), String(names.length - 1));
    assert.equal(
      await page.locator("#gallery-modal-counter").textContent(),
      `${names.length} / ${names.length}`
    );
    await page.keyboard.press("Home");
    assert.equal(
      await page.locator("#gallery-modal-counter").textContent(),
      `1 / ${names.length}`
    );
    const swipe = async (dx, dy = 0) => {
      await stage.dispatchEvent("pointerdown", {
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
        clientX: 170,
        clientY: 200,
      });
      await stage.dispatchEvent("pointerup", {
        pointerId: 1,
        pointerType: "touch",
        isPrimary: true,
        clientX: 170 + dx,
        clientY: 200 + dy,
      });
    };
    await swipe(-90);
    assert.equal(
      await page.locator("#gallery-modal-counter").textContent(),
      `2 / ${names.length}`
    );
    await swipe(10, 90);
    assert.equal(
      await page.locator("#gallery-modal-counter").textContent(),
      `2 / ${names.length}`,
      "Vertical gestures do not change the photo"
    );
    await swipe(90);
    assert.equal(
      await page.locator("#gallery-modal-counter").textContent(),
      `1 / ${names.length}`
    );
    await page.keyboard.press("Escape");
    assert(!(await page.locator("#gallery-modal").isVisible()));
    assert.equal(await page.evaluate(() => scrollY), scroll);
    assert(await cards.first().evaluate((el) => el === document.activeElement));

    await page.setViewportSize({ width: 844, height: 390 });
    const rail = page.getByRole("navigation", {name: "Gallery collections"});
    assert((await rail.boundingBox()).height < 70, "All collection links share a reachable strip in short landscape");
    const collection = rail.locator('a[href="#gallery-group-places"]');
    await collection.click();
    await page.waitForFunction(() => {
      const heading = document.querySelector("#gallery-group-places");
      const y = heading.getBoundingClientRect().top;
      return Math.abs(y - parseFloat(getComputedStyle(heading).scrollMarginTop)) < 2 &&
        document.querySelector('.classic-year-navigation [aria-current="location"]')?.hash === "#gallery-group-places";
    });
    await cards.first().click();
    const railPhoto = await stage.boundingBox();
    const contactSheet = await page.locator("#gallery-modal-strip").boundingBox();
    assert(railPhoto.height > 280 && contactSheet.x >= railPhoto.x + railPhoto.width, "Landscape photos keep the full available height");
    await page.locator('[data-gallery-thumb-index="5"]').click();
    assert.equal(await page.locator("#gallery-modal-counter").textContent(), "6 / " + names.length);
    assert.equal(await page.locator("#gallery-modal-strip [aria-selected=true]").getAttribute("aria-posinset"), "6");
    await page.keyboard.press("ArrowLeft");
    assert.equal(await page.evaluate(() => document.activeElement.dataset.galleryThumbIndex), "4");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 375, height: 812 });

    await page.emulateMedia({ reducedMotion: "reduce" });
    await cards.first().click();
    assert.deepEqual(
      await page.evaluate(() => ({
        animation: getComputedStyle(
          document.querySelector(".gallery-modal__dialog")
        ).animationName,
        transition: getComputedStyle(
          document.querySelector(".gallery-modal__image")
        ).transitionDuration,
        photograph: getComputedStyle(document.querySelector(".gallery-modal__image")).animationName,
      })),
      { animation: "none", transition: "0s", photograph: "none" }
    );
    assert.deepEqual(errors, []);
    await checkTouchZoom(page);
    await checkEncodedFilenames(browser);
    console.log(
      "PASS: native modified links, fixed loading/error geometry, stale requests, keyboard focus/first/last, touch swipes, restored scroll/focus, reduced motion, encoded filenames across all image paths"
    );
  } finally {
    for (const pending of gates.values()) pending.resolve("ready");
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
