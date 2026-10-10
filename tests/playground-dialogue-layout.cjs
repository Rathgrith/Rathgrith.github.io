/* Real resized windows must contain every new branch/follow-up button. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.QA_OUTPUT || require('node:os').tmpdir() + '/playground-dialogue-layout';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
  try {
    const page = await browser.newPage({ viewport: { width: 2560, height: 1440 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('site-companion-v1', JSON.stringify({ speed: 0, affinity: { alice: 35, marisa: 35, patchouli: 35 } }));
    });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4100/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.CompanionBranches && document.querySelector('#live2d-widget')?.dataset.live2dCharacter === 'alice', null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    const widget = page.locator('#live2d-widget');
    const options = page.locator('[data-vn-choices]');
    const trees = await page.evaluate(() => CompanionBranches);
    let checks = 0, wrappedChecks = 0;

    async function settle() {
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
    }
    async function character(id) {
      await page.locator(`button[data-vn-character="${id}"]`).click();
      await page.waitForFunction(id => {
        const w = document.querySelector('#live2d-widget');
        return w.dataset.live2dCharacter === id && !w.classList.contains('is-loading');
      }, id, { timeout: 60000 });
    }
    async function openTopic(topic) {
      await page.locator('[data-vn-open="topics"]').click();
      await page.locator(`[data-vn-panel="topics"] [data-vn-topic-start="${topic}"]`).click();
      await finishLines();
    }
    async function finishLines() {
      for (let i = 0; i < 12; i++) {
        const state = await widget.getAttribute('data-dialogue-state');
        if (state !== 'typing' && !/^次へ/.test(await page.locator('#live2d-interact').textContent())) return;
        await page.locator('#live2d-interact').click();
      }
      assert.fail('Dialogue did not reach its choices/conclusion');
    }
    async function geometry(label, count, fitWindow) {
      await settle();
      assert.equal(await options.locator('button').count(), count, label);
      const result = await widget.evaluate(w => {
        const rect = element => {
          const r = element.getBoundingClientRect();
          return { top: r.top, right: r.right, bottom: r.bottom, left: r.left, height: r.height };
        };
        const main = w.querySelector('.vn-main-view');
        const conversation = w.querySelector('.companion-conversation');
        const reading = w.querySelector('.vn-reading');
        const text = w.querySelector('[data-live2d-dialogue-text]');
        const choices = w.querySelector('.vn-choices');
        const c = rect(conversation), r = rect(reading), t = rect(text), o = rect(choices);
        const scale = Number(w.dataset.playgroundScale) || 1;
        const innerBottom = c.bottom - parseFloat(getComputedStyle(conversation).borderBottomWidth) * scale;
        return {
          layout: w.dataset.playgroundLayout,
          conversation: c, reading: r, text: t, choices: o,
          footer: rect(w.querySelector('.companion-footer')),
          scale, innerBottom,
          mainHeight: main.clientHeight, mainScrollHeight: main.scrollHeight,
          mainOverflow: main.scrollHeight > main.clientHeight + 2,
          horizontalOverflow: main.scrollWidth > main.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth,
          textFits: t.top >= r.top - 1 && t.bottom <= r.bottom + 1 && text.scrollWidth <= text.clientWidth + 1,
          choicesScroll: choices.scrollHeight > choices.clientHeight + 1,
          buttons: Array.from(choices.querySelectorAll('button')).map(button => ({
            ...rect(button), label: button.textContent,
            readable: button.scrollHeight <= button.clientHeight + 1 && button.scrollWidth <= button.clientWidth + 1,
            wrapped: button.clientHeight > parseFloat(getComputedStyle(button).lineHeight) + parseFloat(getComputedStyle(button).paddingTop) + parseFloat(getComputedStyle(button).paddingBottom) + 2,
          })),
        };
      });
      const details = `${label}: ${JSON.stringify(result)}`;
      try {
        assert(!result.horizontalOverflow, details);
        assert(result.textFits && result.reading.bottom <= result.choices.top + 1, details);
        assert(!result.choicesScroll && result.choices.bottom <= result.innerBottom + 1, details);
        assert(result.conversation.bottom <= result.footer.top + 1, details);
        assert(result.buttons.every(b => b.readable && b.top >= result.choices.top - 1 && b.left >= result.conversation.left && b.right <= result.conversation.right + 1 && b.bottom <= result.innerBottom + 1), details);
        if (fitWindow) assert(!result.mainOverflow, details);
        // Trial clicks also detect overlays and ensure the last option can be
        // reached by scrolling the outer window when its dimensions are tiny.
        for (const button of await options.locator('button').all()) await button.click({ trial: true });
      } catch (error) {
        await widget.screenshot({ path: `${out}/failure-${label.replace(/[^a-zA-Z0-9_-]/g, '-')}.png` });
        throw error;
      }
      checks++;
      if (result.buttons.some(button => button.wrapped)) wrappedChecks++;
    }
    async function exercise(label, fitWindow) {
      for (const [id, tree] of Object.entries(trees)) {
        await character(id);
        for (const topic of tree.topics) {
          await openTopic('branch:' + topic.id);
          assert.equal(await widget.getAttribute('data-dialogue-state'), 'choice');
          await geometry(`${label}/${id}/${topic.id}/three`, 3, fitWindow);
          // Choose the longest authored follow-up question, then its longest
          // response. These are real authored routes, not a fabricated DOM.
          const first = tree.nodes[topic.entry].choices.reduce((a, b) => {
            const length = choice => Math.max(...tree.nodes[choice.next].choices.map(next => next.label.length));
            return length(a) >= length(b) ? a : b;
          });
          await options.locator(`[data-vn-choice-next="${first.next}"]`).click();
          await finishLines();
          await geometry(`${label}/${id}/${topic.id}/two`, 2, fitWindow);
          const second = tree.nodes[first.next].choices.reduce((a, b) => {
            const length = choice => Math.max(...(tree.nodes[choice.next].affinityLines || tree.nodes[choice.next].lines).map(line => line.text.length));
            return length(a) >= length(b) ? a : b;
          });
          await options.locator(`[data-vn-choice-next="${second.next}"]`).click();
          await finishLines();
          assert.equal(await widget.getAttribute('data-dialogue-state'), 'ready');
          await geometry(`${label}/${id}/${topic.id}/return`, 2, fitWindow);
        }
        for (const topic of ['today', 'rest', 'weather']) {
          await openTopic(topic);
          assert.equal(await widget.getAttribute('data-dialogue-state'), 'ready');
          await geometry(`${label}/${id}/${topic}/suggest`, 3, fitWindow);
          await options.locator('[data-vn-suggest-topic]').last().click();
          await finishLines();
          assert.equal(await widget.getAttribute('data-vn-branch-node'), tree.topics.at(-1).entry);
        }
        await widget.screenshot({ path: `${out}/${label}-${id}.png` });
      }
    }
    async function wrappedChoices(label) {
      // Current authored labels are short. Expand one through the data source
      // to exercise an ordinary two-line question with the real renderer and
      // event handler, then restore it before the next character/story.
      await character('patchouli');
      const topic = trees.patchouli.topics[0];
      const before = wrappedChecks;
      await page.evaluate(entry => {
        const question = CompanionBranches.patchouli.nodes[entry].choices[0];
        window.layoutOriginalChoiceLabel = question.label;
        question.label += '。その話をもう少し詳しく聞かせてもらえる？';
      }, topic.entry);
      try {
        await openTopic('branch:' + topic.id);
        await geometry(`${label}/wrapped-choice`, 3, false);
        assert(wrappedChecks > before, 'The extended question must actually wrap');
        await options.locator('[data-vn-choice-next]').first().click();
        await finishLines();
        assert.equal(await widget.getAttribute('data-vn-branch-node'), trees.patchouli.nodes[topic.entry].choices[0].next);
      } finally {
        await page.evaluate(entry => {
          CompanionBranches.patchouli.nodes[entry].choices[0].label = window.layoutOriginalChoiceLabel;
          delete window.layoutOriginalChoiceLabel;
        }, topic.entry);
      }
    }

    await page.locator('[data-companion-maximize]').click();
    for (const [width, height] of [[2560, 1440], [1920, 1080], [1366, 768]]) {
      await page.setViewportSize({ width, height });
      await settle();
      assert.equal(await widget.getAttribute('data-playground-layout'), 'wide');
      // A 768px screen caps the window at 576px, below the 600px wide
      // composition at the minimum legible scale of 1. Outer scrolling is
      // expected there; fully sized desktop compositions must fit outright.
      await exercise(`max-${width}x${height}`, height * .75 >= 600);
      console.log(`PASS layouts: maximized ${width}x${height}`);
    }

    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.locator('[data-companion-reset-position]').click();
    await widget.scrollIntoViewIfNeeded();
    await page.locator('[data-companion-titlebar]').focus();
    await page.keyboard.press('ArrowLeft');
    const title = await page.locator('[data-companion-titlebar]').boundingBox();
    await page.mouse.move(title.x + 70, title.y + 12);
    await page.mouse.down();
    await page.mouse.move(90, 32, { steps: 6 });
    await page.mouse.up();
    const grip = page.locator('[data-companion-resize]');
    for (const [width, height] of [[619, 700], [620, 700], [620, 540]]) {
      const handle = await grip.boundingBox();
      const x = handle.x + handle.width / 2, y = handle.y + handle.height / 2;
      await page.mouse.move(x, y);
      await page.mouse.down();
      // Pointer-down can clamp a formerly auto-height docked window to the
      // floating maximum. Match the resize handler's post-clamp start box.
      const bounds = await widget.boundingBox();
      await page.mouse.move(x + width - bounds.width, y + height - bounds.height, { steps: 8 });
      await page.mouse.up();
      await settle();
      const sized = await widget.boundingBox();
      assert(Math.abs(sized.width - width) < 2 && Math.abs(sized.height - height) < 2, JSON.stringify({ width, height, sized }));
      assert.equal(await widget.getAttribute('data-playground-layout'), width < 620 ? 'compact' : 'wide');
      await exercise(`resize-${width}x${height}`, false);
      if (width === 620) await wrappedChoices(`resize-${width}x${height}`);
      console.log(`PASS layouts: resized ${width}x${height}`);
    }
    assert(wrappedChecks >= 2, 'Expanded labels must wrap in both wide resize cases');
    assert.deepEqual(errors, []);
    console.log(`PASS: ${checks} dialogue layouts across three desktop maxima and 619/620px resize boundaries; all nine topics, 3→2→2 choices, ready-state suggestions, ${wrappedChecks} wrapped-label cases, no clipped text/options or footer overlap, every option clickable.`);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
