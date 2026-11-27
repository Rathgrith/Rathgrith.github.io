/* Real resized windows must contain every new branch/follow-up button. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const checkSceneChoices = require("./helpers/scene-choices.cjs");
const out =
  process.env.QA_OUTPUT ||
  require("node:os").tmpdir() + "/playground-dialogue-layout";
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({
    channel: "chrome",
    headless: true,
    args: ["--disable-gpu"],
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 2560, height: 1440 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem(
        "site-companion-v1",
        JSON.stringify({
          speed: 0,
          // Keep the same replies on screen throughout the layout and hit tests.
          // companion-branches-browser exercises the actual inactivity deadline.
          foldIdleReplies: false,
          affinity: { alice: 35, marisa: 35, patchouli: 35 },
        })
      );
    });
    await page.goto(process.env.PREVIEW_URL || "http://127.0.0.1:4100/", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForFunction(
      () =>
        window.CompanionBranches &&
        document.querySelector("#live2d-widget")?.dataset.live2dCharacter ===
          "alice",
      null,
      { timeout: 60000 }
    );
    await page.evaluate(() => document.fonts.ready);
    const widget = page.locator("#live2d-widget");
    const options = page.locator("[data-vn-choices]");
    const trees = await page.evaluate(() => CompanionBranches);
    let checks = 0,
      wrappedChecks = 0,
      frameBaseline = null,
      heightBaseline = null;
    async function rememberGeometry() {
      const baseline = await widget.evaluate((w) => {
        const frame = w.querySelector(".vn-scene-frame");
        const extension = (parseFloat(w.style.getPropertyValue("--vn-reading-extension")) || 0) *
          (Number(w.dataset.playgroundScale) || 1);
        return {
          frame: [frame.clientWidth, frame.clientHeight],
          heights: [w.querySelector(".companion-conversation").getBoundingClientRect().height - extension,
            w.querySelector(".vn-bgm").getBoundingClientRect().height],
        };
      });
      frameBaseline = baseline.frame;
      heightBaseline = baseline.heights;
    }

    async function settle() {
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve))
          )
      );
    }
    async function character(id) {
      await page.locator(`button[data-vn-character="${id}"]`).click();
      await page.waitForFunction(
        (id) => {
          const w = document.querySelector("#live2d-widget");
          return (
            w.dataset.live2dCharacter === id &&
            !w.classList.contains("is-loading")
          );
        },
        id,
        { timeout: 60000 }
      );
    }
    async function openTopic(topic) {
      await page.locator('[data-vn-open="topics"]').click();
      await page
        .locator(`[data-vn-panel="topics"] [data-vn-topic-start="${topic}"]`)
        .click();
      await finishLines();
    }
    async function finishLines() {
      for (let i = 0; i < 12; i++) {
        const state = await widget.getAttribute("data-dialogue-state");
        if (
          state !== "typing" &&
          !/^次へ/.test(await page.locator("#live2d-interact").textContent())
        )
          return;
        await page.locator("#live2d-interact").click();
      }
      assert.fail("Dialogue did not reach its choices/conclusion");
    }
    async function geometry(label, count, fitWindow) {
      await settle();
      assert.equal(await options.locator("button").count(), count, label);
      await checkSceneChoices(widget);
      const result = await widget.evaluate((w) => {
        const rect = (element) => {
          const r = element.getBoundingClientRect();
          return {
            top: r.top,
            right: r.right,
            bottom: r.bottom,
            left: r.left,
            height: r.height,
          };
        };
        const main = w.querySelector(".vn-main-view");
        const conversation = w.querySelector(".companion-conversation");
        const body = w.querySelector(".vn-dialogue-body");
        const frame = w.querySelector(".vn-scene-frame");
        const scrollsVertically = (element) =>
          /^(auto|scroll|overlay)$/.test(getComputedStyle(element).overflowY) &&
          element.scrollHeight > element.clientHeight + 1;
        const reading = w.querySelector(".vn-reading");
        const text = w.querySelector("[data-live2d-dialogue-text]");
        const choices = w.querySelector(".vn-choices");
        const c = rect(conversation),
          r = rect(reading),
          t = rect(text),
          o = rect(choices);
        const scale = Number(w.dataset.playgroundScale) || 1;
        const extension = (parseFloat(w.style.getPropertyValue("--vn-reading-extension")) || 0) * scale;
        const textInsets = [reading, body].reduce((sum, el) => {
          const style = getComputedStyle(el);
          return sum + parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
        }, 0);
        const lineHeight = t.height + textInsets * scale;
        const innerBottom =
          c.bottom -
          parseFloat(getComputedStyle(conversation).borderBottomWidth) * scale;
        return {
          layout: w.dataset.playgroundLayout,
          body: rect(body),
          frame: [frame.clientWidth, frame.clientHeight],
          heights: [c.height - extension, rect(w.querySelector(".vn-bgm")).height],
          extensionJustified: !extension || scrollsVertically(main) && !scrollsVertically(body) &&
            lineHeight > rect(body).height - extension - 3,
          spectrumVisible:
            w.querySelector(".vn-radio-spectrum").getBoundingClientRect()
              .height > 0,
          nameplateFits: [".vn-nameplate strong", "[data-vn-affinity]"].every(
            (selector) => {
              const label = w.querySelector(selector);
              const range = document.createRange();
              // Measure the printed glyphs. The speaker's styled inline
              // wrapper can have different ink and border-box bounds.
              const printed = label.querySelector(".vn-speaker-name") || label;
              const text = document.createTreeWalker(printed, NodeFilter.SHOW_TEXT);
              const fragments = [];
              for (let node; (node = text.nextNode());) {
                if (!node.textContent.trim()) continue;
                range.selectNodeContents(node);
                fragments.push(...range.getClientRects());
              }
              return (
                fragments.length > 0 && fragments.every(rect => Math.abs(rect.top - fragments[0].top) < 1) &&
                printed.scrollWidth <= printed.clientWidth + 1 && label.scrollWidth <= label.clientWidth + 1
              );
            }
          ),
          conversation: c,
          reading: r,
          text: t,
          choices: o,
          footer: rect(w.querySelector(".companion-footer")),
          scale,
          innerBottom,
          mainHeight: main.clientHeight,
          mainScrollHeight: main.scrollHeight,
          mainOverflow: main.scrollHeight > main.clientHeight + 2,
          nestedScroll: scrollsVertically(main) && scrollsVertically(body),
          horizontalOverflow:
            main.scrollWidth > main.clientWidth + 1 ||
            document.documentElement.scrollWidth > innerWidth,
          textFits:
            t.top >= r.top - 1 &&
            t.bottom <= r.bottom + 1 &&
            text.scrollWidth <= text.clientWidth + 1,
          choicesScroll: choices.scrollHeight > choices.clientHeight + 1,
          buttons: Array.from(choices.querySelectorAll("button")).map(
            (button) => ({
              ...rect(button),
              label: button.textContent,
              readable:
                button.scrollHeight <= button.clientHeight + 1 &&
                button.scrollWidth <= button.clientWidth + 1,
              wrapped:
                button.clientHeight >
                parseFloat(getComputedStyle(button).lineHeight) +
                  parseFloat(getComputedStyle(button).paddingTop) +
                  parseFloat(getComputedStyle(button).paddingBottom) +
                  2,
            })
          ),
        };
      });
      const details = `${label}: ${JSON.stringify(result)}`;
      try {
        assert(!result.horizontalOverflow, details);
        assert(!result.nestedScroll, "The dialogue and its window both scroll: " + details);
        assert(result.textFits, details);
        assert(result.extensionJustified, "Only text that exceeds the base reading area may extend a scrolling workspace: " + details);
        assert(
          !result.choicesScroll && result.body.bottom <= result.innerBottom + 1,
          details
        );
        assert(result.body.top >= result.conversation.top, details);
        assert.deepEqual(
          result.frame,
          frameBaseline,
          "Choices and lines keep the outside scene frame stable: " + details
        );
        assert(
          result.heights.every(
            (height, i) => Math.abs(height - heightBaseline[i]) < 1
          ),
          "The base dialogue and player heights stay fixed across all content states; baseline " + JSON.stringify(heightBaseline) + ": " +
            details
        );
        assert(
          result.spectrumVisible,
          "Dialogue options must never hide player controls: " + details
        );
        assert(
          result.nameplateFits,
          "Speaker and affinity stay on one line: " + details
        );
        assert(result.conversation.bottom <= result.footer.top + 1, details);
        assert(result.buttons.every(button => button.readable), details);
        if (fitWindow) assert(!result.mainOverflow, details);
        // Every scene reply must remain a usable pointer target.
        for (const button of await options.locator("button").all())
          await button.click({ trial: true });
      } catch (error) {
        await widget.screenshot({
          path: `${out}/failure-${label.replace(/[^a-zA-Z0-9_-]/g, "-")}.png`,
        });
        throw error;
      }
      checks++;
      if (result.buttons.some((button) => button.wrapped)) wrappedChecks++;
    }
    async function exercise(label, fitWindow) {
      for (const [id, tree] of Object.entries(trees)) {
        await character(id);
        await settle();
        await rememberGeometry();
        for (const topic of tree.topics) {
          await openTopic("branch:" + topic.id);
          assert.equal(
            await widget.getAttribute("data-dialogue-state"),
            "choice"
          );
          await geometry(`${label}/${id}/${topic.id}/three`, 3, fitWindow);
          // Choose the longest authored follow-up question, then its longest
          // response. These are real authored routes, not a fabricated DOM.
          const first = tree.nodes[topic.entry].choices.reduce((a, b) => {
            const length = (choice) =>
              Math.max(
                ...tree.nodes[choice.next].choices.map(
                  (next) => next.label.length
                )
              );
            return length(a) >= length(b) ? a : b;
          });
          await options
            .locator(`[data-vn-choice-next="${first.next}"]`)
            .click();
          await finishLines();
          await geometry(`${label}/${id}/${topic.id}/two`, 2, fitWindow);
          const second = tree.nodes[first.next].choices.reduce((a, b) => {
            const length = (choice) =>
              Math.max(
                ...(
                  tree.nodes[choice.next].affinityLines ||
                  tree.nodes[choice.next].lines
                ).map((line) => line.text.length)
              );
            return length(a) >= length(b) ? a : b;
          });
          await options
            .locator(`[data-vn-choice-next="${second.next}"]`)
            .click();
          await finishLines();
          assert.equal(
            await widget.getAttribute("data-dialogue-state"),
            "ready"
          );
          await geometry(`${label}/${id}/${topic.id}/return`, 2, fitWindow);
        }
        for (const topic of ["today", "rest", "weather"]) {
          await openTopic(topic);
          assert.equal(
            await widget.getAttribute("data-dialogue-state"),
            "ready"
          );
          await geometry(`${label}/${id}/${topic}/suggest`, 3, fitWindow);
          await options.locator("[data-vn-suggest-topic]").last().click();
          await finishLines();
          assert.equal(
            await widget.getAttribute("data-vn-branch-node"),
            tree.topics.at(-1).entry
          );
        }
        await widget.screenshot({ path: `${out}/${label}-${id}.png` });
      }
    }
    async function wrappedChoices(label) {
      // Current authored labels are short. Expand one through the data source
      // to exercise an ordinary two-line question with the real renderer and
      // event handler, then restore it before the next character/story.
      await character("patchouli");
      await settle();
      await rememberGeometry();
      const topic = trees.patchouli.topics[0];
      const before = wrappedChecks;
      await page.evaluate((entry) => {
        const question = CompanionBranches.patchouli.nodes[entry].choices[0];
        window.layoutOriginalChoiceLabel = question.label;
        question.label += "。その話をもう少し詳しく聞かせてもらえる？";
      }, topic.entry);
      try {
        await openTopic("branch:" + topic.id);
        await geometry(`${label}/wrapped-choice`, 3, false);
        assert(
          wrappedChecks > before,
          "The extended question must actually wrap"
        );
        await options.locator("[data-vn-choice-next]").first().click();
        await finishLines();
        assert.equal(
          await widget.getAttribute("data-vn-branch-node"),
          trees.patchouli.nodes[topic.entry].choices[0].next
        );
      } finally {
        await page.evaluate((entry) => {
          CompanionBranches.patchouli.nodes[entry].choices[0].label =
            window.layoutOriginalChoiceLabel;
          delete window.layoutOriginalChoiceLabel;
        }, topic.entry);
      }
    }

    if (!process.env.LAYOUT_CASE || process.env.LAYOUT_CASE === "docked") {
      await exercise("docked", false);
      console.log("PASS layouts: docked, fixed dialogue and player heights");
    }
    await page.locator("[data-companion-maximize]").click();
    for (const [width, height] of [
      [2560, 1440],
      [1920, 1080],
      [1366, 768],
    ].filter(
      (s) => !process.env.LAYOUT_CASE || s.join("x") === process.env.LAYOUT_CASE
    )) {
      await page.setViewportSize({ width, height });
      await settle();
      assert.equal(await widget.getAttribute("data-playground-layout"), "wide");
      // Tiny windows may scroll the control composition, but choices always
      // remain inside the scene and clear of the character.
      await exercise(`max-${width}x${height}`, height * 0.75 >= 600);
      console.log(`PASS layouts: maximized ${width}x${height}`);
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator("[data-companion-reset-position]").click();
    await widget.scrollIntoViewIfNeeded();
    await page.locator("[data-companion-titlebar]").focus();
    await page.keyboard.press("ArrowLeft");
    const title = await page.locator("[data-companion-titlebar]").boundingBox();
    await page.mouse.move(title.x + 70, title.y + 12);
    await page.mouse.down();
    await page.mouse.move(90, 32, { steps: 6 });
    await page.mouse.up();
    const grip = page.locator("[data-companion-resize]");
    for (const [width, height] of [
      [420, 540],
      [619, 700],
      [620, 700],
      [620, 540],
    ].filter(
      (s) => !process.env.LAYOUT_CASE || s.join("x") === process.env.LAYOUT_CASE
    )) {
      const handle = await grip.boundingBox();
      const before = await widget.boundingBox();
      const x = handle.x + handle.width / 2,
        y = handle.y + handle.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      // The floating window can move or shrink when first detached. Drag the
      // spot we picked up on its grip to the requested lower-right corner.
      const bounds = await widget.boundingBox();
      await page.mouse.move(
        bounds.x + width - (before.x + before.width - x),
        bounds.y + height - (before.y + before.height - y),
        { steps: 8 }
      );
      await page.mouse.up();
      await settle();
      const sized = await widget.boundingBox();
      assert(
        Math.abs(sized.width - width) < 2 &&
          Math.abs(sized.height - height) < 2,
        JSON.stringify({ width, height, sized })
      );
      assert.equal(
        await widget.getAttribute("data-playground-layout"),
        width < 620 ? "compact" : "wide"
      );
      await exercise(`resize-${width}x${height}`, false);
      if (width === 620) await wrappedChoices(`resize-${width}x${height}`);
      console.log(`PASS layouts: resized ${width}x${height}`);
    }
    if (!process.env.LAYOUT_CASE)
      assert(
        wrappedChecks >= 2,
        "Expanded labels must wrap in both wide resize cases"
      );
    assert.deepEqual(errors, []);
    console.log(
      `PASS: ${checks} dialogue layouts (${process.env.LAYOUT_CASE || "three desktop maxima, a small float and 619/620px resize boundaries"}); all nine topics, 3→2→2 choices, ready-state suggestions, ${wrappedChecks} wrapped-label cases, stable scene and original dialogue geometry, contained dialogue scrolling, no footer overlap, every option reachable.`
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
