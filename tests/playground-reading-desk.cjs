/* Exercise the standalone reading desk with real choices, typing and model readiness. */
const assert = require("node:assert/strict");
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const base = process.env.PREVIEW_URL || "http://127.0.0.1:4100/";

// The document may scroll past a docked widget. Within the widget, one wheel
// gesture over the text or a reply should encounter at most one scroll region.
async function checkScrollOwners(target) {
  const scrollers = await target.evaluate(element => {
    const widget = element.closest("#live2d-widget");
    const panel = widget.closest(":popover-open") || widget;
    const owners = [];
    for (let node = element; panel.contains(node); node = node.parentElement) {
      if (/^(auto|scroll|overlay)$/.test(getComputedStyle(node).overflowY) &&
          node.scrollHeight > node.clientHeight + 1) {
        owners.push(node.className || node.id);
      }
    }
    return owners;
  });
  assert(scrollers.length <= 1, "Nested vertical scroll regions: " + scrollers.join(" inside "));
}

(async () => {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
    await page.addInitScript(() => {
      localStorage.setItem("site-companion-v1", JSON.stringify({ speed: 65 }));
    });
    let releaseModel;
    const loading = new Promise((resolve) => { releaseModel = resolve; });
    await page.route("**/live2dcubismcore.min.js*", async (route) => {
      await loading;
      await route.continue();
    });
    await page.goto(base + "playground/", { waitUntil: "domcontentloaded" });
    const topics = page.locator('[data-vn-open="topics"]');
    const menu = page.locator('[data-vn-panel="topics"]');
    await topics.click();
    await menu.waitFor();
    releaseModel();
    await page.waitForFunction(() => {
      const w = document.querySelector("#live2d-widget");
      return w.dataset.live2dCharacter === "alice" && !w.classList.contains("is-loading");
    });
    assert(await menu.isVisible(), "A model becoming ready preserves an open dialogue menu");
    await page.locator('[data-vn-topic-start="craft"]').click();
    const centered = await page.locator("[data-vn-reading]").evaluate((e) => {
      const body = e.getBoundingClientRect(), text = e.querySelector("p").getBoundingClientRect();
      return Math.abs(text.y + text.height / 2 - body.y - body.height / 2) < 6;
    });
    assert(centered, "The desktop opening line is vertically centered in the reading area");
    await page.locator("[data-vn-reading]").click();
    const nextCue = await page.locator(".vn-next-mark").evaluate((e) => {
      const style = getComputedStyle(e);
      return { name: style.animationName, iterations: style.animationIterationCount };
    });
    assert(nextCue.name !== "none" && nextCue.iterations === "1",
      "The next-line mark gives one finite cue");
    const dailyLine = await page.evaluate(() => {
      const node = CompanionBranches.alice.nodes.daily;
      node.choices[2].label += "　その話、初めて聞いたからもう少し詳しく聞かせてくれる？";
      return node.lines[0].text;
    });
    const reading = page.locator("[data-vn-reading]");
    const text = reading.locator("[data-live2d-dialogue-text]");
    const options = page.locator("[data-vn-choices] button");
    async function openBranch() {
      await topics.click();
      await page.locator('[data-vn-topic-start="branch:daily"]').click();
    }
    async function firstGlyph() {
      return text.evaluate((p) => {
        const walker = document.createTreeWalker(p, NodeFilter.SHOW_TEXT);
        let first;
        do { first = walker.nextNode(); } while (first && !first.length);
        const glyph = document.createRange();
        glyph.setStart(first, 0);
        glyph.setEnd(first, 1);
        const { x, y } = glyph.getBoundingClientRect();
        return { x, y };
      });
    }
    async function assertComplete() {
      const sample = await text.evaluate((p) => ({
        line: p.textContent, unread: p.dataset.unread || "",
        plain: p.childNodes.length === 1 && p.firstChild.nodeType === Node.TEXT_NODE,
      }));
      assert.equal(sample.line, await page.evaluate(() => {
        const id = document.querySelector("#live2d-widget").dataset.vnCharacter;
        return CompanionBranches[id].nodes.daily.lines[0].text;
      }));
      assert(sample.plain && !sample.unread, "A completed line is ordinary selectable text");
    }
    const deskRows = () => page.locator(".companion-stage, .companion-conversation").evaluateAll(
      rows => rows.map(row => {
        const { top, bottom } = row.getBoundingClientRect();
        return [top, bottom];
      })
    );
    for (const [width, height] of [[1600, 1040], [1366, 768], [320, 668], [844, 390]]) {
      await page.setViewportSize({ width, height });
      await page.waitForFunction(height =>
        parseFloat(document.querySelector("#live2d-widget").style.getPropertyValue("--vn-available-height")) === height,
        height);
      // The wide desk fits more characters per line; make sure its sample
      // also exceeds the available height.
      await page.evaluate(line => { CompanionBranches.alice.nodes.daily.lines[0].text = line; },
        dailyLine.repeat(width === 1600 ? 6 : 3));
      const before = await deskRows();
      await openBranch();
      await page.waitForFunction(() => {
        const p = document.querySelector("[data-live2d-dialogue-text]");
        return p.textContent.length >= 4 && p.dataset.unread &&
          p.getAnimations({ subtree: true }).some((a) =>
            a.effect.target.matches(".vn-ink") && a.effect.getKeyframes().some((f) => Number(f.opacity) < 1)
          );
      });
      assert(await text.evaluate((p) =>
        p.textContent + p.dataset.unread === CompanionBranches.alice.nodes.daily.lines[0].text
      ), "The unrevealed suffix reserves the authored Japanese line breaks");
      const bounds = await page.locator(".companion-conversation").boundingBox();
      const baseline = await firstGlyph();
      await page.waitForFunction(() => document.querySelector("[data-live2d-dialogue-text]").textContent.length >= 28);
      assert.deepEqual(await firstGlyph(), baseline, "Wrapping during typing keeps the first glyph in place");
      if (width === 320) await reading.click({ position: { x: 10, y: 10 } });
      else await page.keyboard.press("Enter");
      await options.first().waitFor();
      await assertComplete();
      await checkScrollOwners(options.last());
      if (width === 1600) {
        assert(await page.locator(".pg-radio").evaluate(radio => radio.open), "The tall desk includes its open radio");
        assert.deepEqual(await deskRows(), before, "A long line and replies preserve the wide desk and camera bounds");
      }
      assert.deepEqual(await firstGlyph(), baseline, "Showing all reply buttons keeps the first glyph in place");
      assert.equal(await reading.getAttribute("aria-disabled"), "true");
      assert.equal(await reading.getAttribute("tabindex"), "-1");
      const after = await page.locator(".companion-conversation").boundingBox();
      assert.equal(after.height, bounds.height, "Options keep the reading desk height stable");
      const replies = await options.evaluateAll((buttons) => buttons.map((b) => {
        const style = getComputedStyle(b);
        return { active: !b.disabled && style.pointerEvents !== "none" && style.transform === "none",
          delay: parseFloat(style.animationDelay), duration: parseFloat(style.animationDuration) };
      }));
      assert.equal(replies.length, 3);
      assert(replies.every((reply) => reply.active), "All reply hit areas are available together and stay still");
      assert(replies[0].delay < replies[1].delay && replies[1].delay < replies[2].delay &&
        replies[2].delay < replies[0].duration, "The reply fades overlap in reading order");
      await options.first().focus();
      await page.keyboard.press("ArrowRight");
      assert(await options.nth(1).evaluate((e) => e === document.activeElement),
        "Horizontal arrows follow the desktop reply row");
      await page.keyboard.press("ArrowLeft");
      await page.keyboard.press("ArrowUp");
      assert(await options.last().evaluate((e) => {
        const body = e.closest(".vn-dialogue-body");
        const b = body.getBoundingClientRect(), r = e.getBoundingClientRect();
        return document.activeElement === e && e.scrollWidth <= e.clientWidth + 1 &&
          r.top >= b.top - 1 && r.bottom <= b.bottom + 1;
      }), "Keyboard navigation reveals a wrapped final option completely");
      await page.keyboard.press("Enter");
      await page.waitForFunction(() => document.querySelector("#live2d-widget").dataset.vnBranchNode !== "daily");
    }
    await openBranch();
    await text.locator(".vn-ink").first().waitFor();
    const oldInk = await text.locator(".vn-ink").first().elementHandle();
    await page.locator('[data-vn-character="marisa"]').click();
    assert.equal(await oldInk.evaluate((ink) => ink.isConnected), false);
    assert.equal(await page.locator("[data-live2d-dialogue-name]").textContent(), "魔理沙");
    await page.locator('[data-vn-character="alice"]').click();
    await openBranch();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await options.first().waitFor();
    await assertComplete();
    assert.equal(await page.locator(".companion-conversation").evaluate((e) =>
      e.getAnimations({ subtree: true }).length
    ), 0, "Changing reduced motion during typing clears active dialogue cues");
    await openBranch();
    assert.equal(await options.count(), 3);
    await assertComplete();
    const reply = (await options.first().textContent()).replace(/^▸ /, "");
    await options.first().click();
    await page.locator('[data-vn-open="history"]').click();
    const history = page.locator("[data-vn-history-list]");
    await checkScrollOwners(history);
    const recordedReply = history.locator(".vn-history-reply").last();
    assert.equal(await recordedReply.locator("strong").textContent(), "あなた");
    assert.equal(await recordedReply.locator("p").textContent(), reply);
    assert.equal(await history.locator("li").last().locator("strong").textContent(), "アリス");
    assert(await history.evaluate(e => e.scrollTop + e.clientHeight >= e.scrollHeight - 1),
      "History opens at the latest exchange");
    await page.setViewportSize({ width: 1366, height: 768 });
    await page.goto(base);
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await openBranch();
    await text.locator(".vn-ink").first().waitFor();
    await page.emulateMedia({ reducedMotion: "reduce" });
    await options.first().waitFor();
    await assertComplete();
    await checkScrollOwners(reading);
    await openBranch();
    assert.equal(await options.count(), 3);
    await assertComplete();
    assert.equal(await page.locator(".companion-conversation").evaluate((e) =>
      e.getAnimations({ subtree: true }).length
    ), 0, "Reduced motion also keeps the embedded conversation still");
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await page.locator('[data-vn-open="settings"]').click();
    await page.locator("[data-vn-speed]").selectOption("0");
    await page.keyboard.press("Escape");
    await openBranch();
    assert.equal(await options.count(), 3);
    await assertComplete();
    // The Gallery rail has less height than the homepage dock. Compare the
    // frame through both a normal and a long reply-bearing line there.
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto(base + "gallery/");
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openBranch();
    const frame = page.locator(".companion-conversation");
    const ordinaryHeight = (await frame.boundingBox()).height;
    await page.evaluate(() => {
      const line = CompanionBranches.alice.nodes.daily.lines[0];
      line.text = line.text.repeat(6);
    });
    await openBranch();
    await assertComplete();
    assert.equal((await frame.boundingBox()).height, ordinaryHeight, "Long lines keep the docked frame stable");
    await checkScrollOwners(options.last());

    const body = page.locator("[data-vn-dialogue-body]");
    const previousPage = page.locator("[data-vn-page-prev]");
    const nextPage = page.locator("[data-vn-page-next]");
    await nextPage.waitFor();
    assert(await previousPage.isDisabled());
    await body.hover();
    const workspace = page.locator(".vn-main-view");
    const beforeWheel = await workspace.evaluate(e => e.scrollTop);
    const delta = await workspace.evaluate(e => e.scrollTop < (e.scrollHeight - e.clientHeight) / 2 ? 80 : -80);
    await page.mouse.wheel(0, delta);
    await page.waitForFunction(top => document.querySelector(".vn-main-view").scrollTop !== top, beforeWheel);
    assert.equal(await body.evaluate(e => e.scrollTop), 0, "Wheeling over a paged line scrolls only the workspace");
    await nextPage.click();
    await page.waitForFunction(() => document.querySelector("[data-vn-dialogue-body]").scrollTop > 0);
    await previousPage.click();
    await page.waitForFunction(() => document.querySelector("[data-vn-dialogue-body]").scrollTop < 1);
    // Turning pages must expose the whole line and the final reply. Bound the
    // loop so a pager that keeps returning the same page fails promptly.
    for (let turns = 0; await nextPage.isEnabled(); turns++) {
      assert(turns < 12, "The final dialogue page is reachable");
      await nextPage.click();
    }
    assert(await body.evaluate(e => e.scrollTop + e.clientHeight >= e.scrollHeight - 2));
    assert(await options.last().evaluate(button => {
      const r = button.getBoundingClientRect();
      const b = button.closest("[data-vn-dialogue-body]").getBoundingClientRect();
      return r.top >= b.top - 1 && r.bottom <= b.bottom + 1;
    }), "The final reply is visible on the last page");
    await options.last().click();
    await page.waitForFunction(() => document.querySelector("[data-vn-dialogue-body]").scrollTop < 1);
    await page.locator('[data-vn-open="history"]').click();
    await checkScrollOwners(history);
    await history.locator("li").last().scrollIntoViewIfNeeded();
    await page.locator('[data-vn-panel="history"] [data-vn-close]').click();
    assert(await options.first().isVisible(), "History returns to the active docked conversation");

    const phone = await browser.newPage({
      isMobile: true, hasTouch: true, deviceScaleFactor: 3,
    });
    await phone.addInitScript(() => localStorage.setItem("site-companion-v1", JSON.stringify({ speed: 0 })));
    for (const [width, height] of [[320, 740], [375, 812], [390, 844]]) {
      await phone.setViewportSize({ width, height });
      await phone.goto(base + "playground/", { waitUntil: "domcontentloaded" });
      assert(await phone.evaluate(() => matchMedia("(pointer: coarse)").matches));
      await phone.locator('[data-vn-open="topics"]').tap();
      await phone.locator('[data-vn-topic-start="branch:daily"]').tap();
      const phoneReplies = phone.locator("[data-vn-choices] button");
      await phoneReplies.first().waitFor();
      await phone.evaluate(() => document.fonts.ready);
      const touchLayout = await phoneReplies.evaluateAll((buttons) => {
        const body = buttons[0].closest(".vn-dialogue-body");
        const top = body.getBoundingClientRect().top + body.clientTop;
        return { top, bottom: top + body.clientHeight, scroll: body.scrollTop,
          targets: buttons.map((button) => {
            const { top, bottom, width, height } = button.getBoundingClientRect();
            return { top, bottom, width, height };
          }) };
      });
      assert.equal(touchLayout.targets.length, 3);
      assert.equal(touchLayout.scroll, 0);
      for (const button of touchLayout.targets) {
        assert(button.height >= 40 && button.width >= 40, "Replies retain their touch target");
        assert(button.top >= touchLayout.top - 1 && button.bottom <= touchLayout.bottom + 1,
          `All three ordinary replies must fit without scrolling at ${width}px: ${JSON.stringify(touchLayout)}`);
      }
      await phoneReplies.last().tap();
      await phone.waitForFunction(() => document.querySelector("#live2d-widget").dataset.vnBranchNode !== "daily");
    }
    await phone.goto(base + "gallery/");
    await phone.evaluate(() => window.scrollTo(0, 1050));
    await phone.locator("[data-reading-playground]").tap();
    const popup = phone.locator("[data-companion-mobile-dock]:popover-open");
    await popup.locator('[data-vn-open="topics"]').tap();
    await phone.evaluate(() => {
      const line = CompanionBranches.alice.nodes.daily.lines[0];
      line.text = line.text.repeat(6);
    });
    await popup.locator('[data-vn-topic-start="branch:daily"]').tap();
    const lastReply = popup.locator("[data-vn-choices] button").last();
    await lastReply.waitFor();
    await checkScrollOwners(lastReply);
    await popup.locator("[data-vn-page-next]").tap();
    assert(await popup.locator("[data-vn-dialogue-body]").evaluate(e => e.scrollTop > 0),
      "The mobile reading shortcut can turn a long dialogue page by touch");
    await phone.close();
    console.log("PASS: stable camera and dialogue frames, Japanese ink reveal, keyboard replies, single scroll regions, wheel and touch paging, reduced motion and accessible history");
  } finally {
    await browser.close();
  }
})().catch((error) => { console.error(error); process.exitCode = 1; });
