// Check the painted room and the actual WebGL rig in the same coordinates.
const assert = require("node:assert/strict");
const captureRenderer = require("./helpers/companion-renderer.cjs");
const checkSceneChoices = require("./helpers/scene-choices.cjs");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const reference = new Map();
    for (const dpr of [1, 2]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 900 },
        deviceScaleFactor: dpr,
        reducedMotion: "reduce",
      });
      await captureRenderer(page);

      async function check(character, view) {
        await page.waitForFunction(
          (id) => {
            const w = document.querySelector("#live2d-widget");
            const app = window.cameraTestApp;
            return (
              w?.dataset.live2dCharacter === id &&
              app?.stage.children[0]?.glContextID ===
                app.renderer.CONTEXT_UID &&
              !w.classList.contains("is-loading")
            );
          },
          character,
          { timeout: 60000 }
        );
        // Resize is debounced, followed by a ResizeObserver render.
        await page.waitForFunction(() => {
          const stage = document.querySelector(".companion-stage");
          const screen = cameraTestApp.renderer.screen;
          return (
            Math.abs(screen.width - stage.clientWidth) <= 1 &&
            Math.abs(screen.height - stage.clientHeight) <= 1
          );
        });
        const result = await page.evaluate(async () => {
          const app = cameraTestApp;
          const model = app.stage.children[0];
          const stage = document.querySelector(".companion-stage");
          const frame = stage.closest(".vn-scene-frame");
          const choosing = Boolean(frame.querySelector(".vn-scene-choices button"));
          const actor = frame.querySelector(".vn-actor-area").getBoundingClientRect();
          const mount = stage.querySelector(".pg-scene-mount");
          const engraving = mount && getComputedStyle(mount, "::before").backgroundImage;
          const standalone = document.body.classList.contains("playground-page");
          const room = getComputedStyle(stage.querySelector(":scope > .vn-room"));
          const image = new Image();
          image.src = room.backgroundImage.match(/url\("(.+)"\)/)[1];
          await image.decode();
          const width = parseFloat(room.width),
            height = parseFloat(room.height);
          const scale = Math.max(
            width / image.naturalWidth,
            height / image.naturalHeight
          );
          const paintedHeight = image.naturalHeight * scale;
          const frameTop = parseFloat(room.top);
          const roomTop =
            frameTop + ((height - paintedHeight) * parseFloat(room.backgroundPositionY)) / 100;
          const roomLeft = parseFloat(room.left);
          const modelCenterInRoom = (model.x - roomLeft) / width;
          let headroom = null;
          if (standalone && stage.clientWidth >= 1000) {
            // Sample the rendered silhouette. The unpainted margin in each
            // Cubism rig makes the model bounds a poor guide to the hat or hair.
            const sample = document.createElement("canvas");
            sample.height = 128;
            sample.width = Math.ceil(128 * stage.clientWidth / stage.clientHeight);
            const context = sample.getContext("2d");
            app.render();
            context.drawImage(app.view, 0, 0, sample.width, sample.height);
            const pixels = context.getImageData(0, 0, sample.width, sample.height).data;
            const first = pixels.findIndex((alpha, i) => i % 4 === 3 && alpha > 128);
            headroom = Math.floor(first / (4 * sample.width)) / sample.height;
          }
          return {
            roomFile: new URL(image.src).pathname,
            headroom, standalone, engraving,
            decorative: mount && mount.inert && mount.getAttribute("aria-hidden") === "true" &&
              getComputedStyle(mount).pointerEvents === "none",
            choosing,
            faceFits: !choosing || window.cameraTestFace().every(f =>
              f.left >= actor.left - 2 && f.right <= actor.right + 2 && f.top >= actor.top - 2 && f.bottom <= actor.bottom + 2),
            overscan: [
              -roomLeft,
              -frameTop,
              roomLeft + width - stage.clientWidth,
              frameTop + height - stage.clientHeight,
            ],
            stageAspect: stage.clientWidth / stage.clientHeight,
            center: modelCenterInRoom,
            height: model.height / paintedHeight,
            top: (model.y - roomTop) / paintedHeight,
            bufferWidth: app.view.width,
            bufferHeight: app.view.height,
            screenWidth: app.renderer.screen.width,
            screenHeight: app.renderer.screen.height,
            resolution: app.renderer.resolution,
            lightResolution: app.stage.filters?.[0]?.resolution,
            lighting: stage.closest("#live2d-widget").dataset.sceneLighting !== "false",
          };
        });
        assert(result.roomFile.includes(character), JSON.stringify(result));
        if (result.standalone) {
          assert(result.decorative && result.engraving?.includes("frame-" + character + ".svg"),
            character + " has its own non-interactive foreground engraving at " + view);
        } else {
          assert.equal(result.engraving, null, "Embedded windows use their compact frame");
        }
        assert(
          result.overscan.every((edge) => edge >= 1),
          view + " painted scenery covers all four edges: " + JSON.stringify(result)
        );
        assert(result.stageAspect < 2.32, view + " preserves the half-body framing: " + result.stageAspect);
        if (result.headroom !== null) {
          const limit = { alice: .17, marisa: .11, patchouli: .14 }[character];
          assert(result.headroom > 0 && result.headroom <= limit,
            character + " retains a visible, bounded margin above the silhouette at " + view + ": " + result.headroom);
        }
        if (result.choosing) assert(result.faceFits, character + " keeps both eyes and mouth inside the reply-safe area at " + view);
        else assert(Math.abs(result.center - 0.5) < 0.004, view + " centered rig and room");
        assert(
          Math.abs(
            result.bufferWidth - result.screenWidth * result.resolution
          ) <= 1
        );
        assert(
          Math.abs(
            result.bufferHeight - result.screenHeight * result.resolution
          ) <= 1
        );
        if (result.lighting) assert.equal(result.lightResolution, result.resolution);
        // Idle framing stays registered to the painted room. Replies deliberately reframe the actor.
        if (result.choosing) return;
        const previous = reference.get(character) || result;
        for (const key of ["height", "top"]) {
          assert(
            Math.abs(result[key] - previous[key]) < 0.006,
            character +
              " " +
              view +
              " room-relative " +
              key +
              ": " +
              JSON.stringify(result)
          );
        }
        reference.set(character, previous);
      }

      async function openBranch() {
        await page.locator('[data-vn-open="topics"]').click();
        await page.locator('[data-vn-topic-start^="branch:"]').first().click();
        await page.locator(".vn-scene-choices button").first().waitFor();
      }

      let releasePixi;
      const gate = new Promise(resolve => { releasePixi = resolve; });
      await page.route("**/pixi.min.js*", async route => {
        await gate;
        await route.continue();
      }, { times: 1 });
      await Promise.all([
        page.waitForRequest("**/pixi.min.js*"),
        page.goto(new URL("playground/", base).href, { waitUntil: "domcontentloaded" }),
      ]);
      await page.locator('button[data-vn-character="marisa"]').click();
      await openBranch();
      // Let the scene settle while there is still no renderer to resize.
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      assert(await page.evaluate(() => !window.PIXI), "The branch was selected before the rendering library loaded");
      releasePixi();
      await check("marisa", "cold start with scene replies");
      await checkSceneChoices(page.locator("#live2d-widget"));

      for (const id of ["alice", "marisa", "patchouli"]) {
        await page.locator('button[data-vn-character="' + id + '"]').click();
        for (const [width, height] of [
          [320, 740],
          [375, 812],
          [844, 390],
          [768, 1024],
          [1440, 900],
          [2560, 1080],
          [2560, 1440],
          [3840, 1080],
        ]) {
          await page.setViewportSize({ width, height });
          await page.waitForFunction(({ width, height }) => {
            const style = document.querySelector("#live2d-widget").style;
            return style.getPropertyValue("--vn-width") === width + "px" && style.height === height + "px";
          }, { width, height });
          await check(id, width + "x" + height);
        }
        await openBranch();
        for (const [width, height] of [[1440, 900], [320, 740]]) {
          await page.setViewportSize({ width, height });
          await page.waitForFunction(width => parseFloat(document.querySelector("#live2d-widget").style
            .getPropertyValue("--vn-width")) === width, width);
          await check(id, width + "x" + height + " with replies");
          await checkSceneChoices(page.locator("#live2d-widget"));
        }
      }
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(base);
      await page.locator('button[data-vn-character="alice"]').click();
      await check("alice", "home dock");
      await page.setViewportSize({ width: 320, height: 740 });
      await page.waitForFunction(() => document.querySelector("[data-companion-mobile-dock] #live2d-widget"));
      await check("alice", "phone dock");
      await page.setViewportSize({ width: 960, height: 720 });
      await page.waitForFunction(() => document.querySelector(".companion-stage").clientWidth > 355);
      await check("alice", "tablet dock");
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.waitForFunction(() => document.querySelector("[data-companion-dock] #live2d-widget"));
      await page.locator("[data-companion-maximize]").click();
      await check("alice", "floating");
      await page.setViewportSize({ width: 3840, height: 1080 });
      await page.waitForFunction(() => document.querySelector("#live2d-widget").getBoundingClientRect().width > 2000);
      await check("alice", "ultrawide floating");
      await page.evaluate(() => {
        const lighting = document.querySelector("[data-vn-lighting]");
        lighting.checked = false;
        lighting.dispatchEvent(new Event("change", { bubbles: true }));
      });
      await check("alice", "lighting disabled");
      await page.goto(new URL("gallery/", base).href);
      await check("alice", "gallery dock");
      console.log(
        "PASS: cold start with a selected reply branch, three full-bleed room/rig registrations, eight viewport shapes, phone/tablet/desktop docks, floating and disabled lighting at DPR " +
          dpr
      );
      await page.close();
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
