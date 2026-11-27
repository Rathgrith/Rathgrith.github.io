const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const checkSceneChoices = require('./helpers/scene-choices.cjs');
const out = process.env.QA_OUTPUT || require('node:os').tmpdir() + '/companion-branches-qa';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      if (!localStorage.getItem('site-companion-v1')) localStorage.setItem('site-companion-v1', JSON.stringify({ speed: 0, affinity: { alice: 35, marisa: 35, patchouli: 35 } }));
    });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4100/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.CompanionBranches && document.querySelector('#live2d-widget')?.dataset.dialogueState === 'ready', null, { timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    const trees = await page.evaluate(() => CompanionBranches);
    const widget = page.locator('#live2d-widget');
    const options = page.locator('[data-vn-choices]');

    async function character(id) {
      await page.locator(`button[data-vn-character="${id}"]`).click();
      await page.waitForFunction(id => {
        const el = document.querySelector('#live2d-widget');
        return el.dataset.live2dCharacter === id && !el.classList.contains('is-loading');
      }, id, { timeout: 45000 });
    }
    async function openTopic(topic) {
      if (!(await page.locator('[data-vn-panel="topics"]').isVisible())) await page.locator('[data-vn-open="topics"]').click();
      await page.locator(`[data-vn-panel="topics"] [data-vn-topic-start="${topic}"]`).click();
    }
    async function finishLines() {
      for (let attempt = 0; attempt < 12; attempt++) {
        const state = await widget.getAttribute('data-dialogue-state');
        if (state === 'typing' || /^次へ/.test(await page.locator('#live2d-interact').textContent())) {
          await page.locator('#live2d-interact').click();
        } else return;
      }
      assert.fail('Dialogue did not reach its authored choices/conclusion');
    }
    async function node(key, count) {
      await page.waitForFunction(key => document.querySelector('#live2d-widget').dataset.vnBranchNode === key, key);
      await finishLines();
      assert.equal(await options.locator('[data-vn-choice-next]').count(), count, key);
      assert.equal(await widget.getAttribute('data-dialogue-state'), count ? 'choice' : 'ready', key);
    }
    async function setAffinity(value) {
      await page.locator('[data-vn-open="settings"]').click();
      await page.locator('[data-vn-affinity-input]').evaluate((el, value) => {
        el.value = value;
        el.dispatchEvent(new Event('input', { bubbles: true }));
      }, value);
      await page.keyboard.press('Escape');
    }
    async function affinity() {
      return page.locator('[data-vn-affinity-meter]').evaluate(el => el.value);
    }
    async function choose(choice) {
      await options.locator(`[data-vn-choice-next="${choice.next}"]`).click();
    }

    let paths = 0;
    for (const [id, tree] of Object.entries(trees)) {
      await character(id);
      for (const topic of tree.topics) {
        for (const first of tree.nodes[topic.entry].choices) {
          for (const second of tree.nodes[first.next].choices) {
            await openTopic('branch:' + topic.id);
            await node(topic.entry, 3);
            await choose(first);
            await node(first.next, 2);
            const before = await affinity();
            await choose(second);
            await node(second.next, 0);
            const leaf = tree.nodes[second.next];
            const expected = leaf.affinityLines
              ? leaf.affinityLines[Math.min(3, Math.floor(before / 25))]
              : leaf.lines.at(-1);
            assert.equal(await page.locator('[data-live2d-dialogue-text]').textContent(), expected.text, `${id}/${topic.id}: response follows the selected path and affection tier`);
            assert.equal(await options.locator('[data-vn-return-topic]').count(), 1);
            assert.equal(await options.locator('[data-vn-return-topics]').count(), 1);
            assert.equal(await affinity(), Math.min(100, before + second.delta));
            paths++;
          }
        }
        await options.locator('[data-vn-return-topic]').click();
        await node(topic.entry, 3);
        const first = tree.nodes[topic.entry].choices[0];
        await choose(first);
        await node(first.next, 2);
        await choose(tree.nodes[first.next].choices[0]);
        await node(tree.nodes[first.next].choices[0].next, 0);
        await options.locator('[data-vn-return-topics]').click();
        assert(await page.locator('[data-vn-panel="topics"]').isVisible());
        await page.keyboard.press('Escape');
      }

      // The response uses affinity before the choice's delta crosses a tier.
      const topic = tree.topics.find(topic => tree.nodes[topic.entry].choices.some(first => tree.nodes[first.next].choices.some(second => tree.nodes[second.next].affinityLines)));
      const first = tree.nodes[topic.entry].choices.find(first => tree.nodes[first.next].choices.some(second => tree.nodes[second.next].affinityLines));
      const second = tree.nodes[first.next].choices.find(second => tree.nodes[second.next].affinityLines);
      for (const boundary of [24, 49, 74, 98]) {
        await setAffinity(boundary - first.delta);
        await openTopic('branch:' + topic.id);
        await node(topic.entry, 3);
        await choose(first);
        await node(first.next, 2);
        assert.equal(await affinity(), boundary);
        await choose(second);
        await node(second.next, 0);
        assert.equal(await page.locator('[data-live2d-dialogue-text]').textContent(), tree.nodes[second.next].affinityLines[Math.min(3, Math.floor(boundary / 25))].text);
      }

      await openTopic('friends');
      const friend = await page.evaluate(id => CompanionRemarks[id][0], id);
      await page.locator(`[data-vn-friends-list] [data-vn-topic-start="friend:${friend.id}"]`).click();
      const heard = new Set();
      for (let index = 0; index < 1 + friend.variants.length; index++) {
        await finishLines();
        const text = await page.locator('[data-live2d-dialogue-text]').textContent();
        assert(!heard.has(text), `${id}: asking for more does not repeat the same friend remark`);
        heard.add(text);
        if (index < friend.variants.length) await options.locator('[data-vn-friend-more]').click();
      }
      await options.locator('[data-vn-friend-back]').click();
      assert(await page.locator('[data-vn-panel="friends"]').isVisible());
      await page.keyboard.press('Escape');

      for (const ordinaryTopic of ['today', 'rest', 'weather']) {
        await openTopic(ordinaryTopic);
        await finishLines();
        const suggested = options.locator('[data-vn-suggest-topic]');
        assert(await suggested.count(), `${id}/${ordinaryTopic}: ordinary conversation offers an actionable follow-up`);
        assert.equal(await widget.getAttribute('data-dialogue-state'), 'ready', 'Suggested topics are navigation, not forced response choices');
        assert.equal(await suggested.first().textContent(), tree.topics[0].label);
        await suggested.first().click();
        await node(tree.topics[0].entry, 3);
      }
    }

    // A rapid second click on a removed choice cannot apply the old edge twice,
    // even when instant text has already put the next node in choice state.
    await character('alice');
    const topic = trees.alice.topics[0], first = trees.alice.nodes[topic.entry].choices[0];
    await setAffinity(35);
    await openTopic('branch:' + topic.id);
    await node(topic.entry, 3);
    await options.locator(`[data-vn-choice-next="${first.next}"]`).evaluate(el => { window.oldBranchButton = el; });
    await choose(first);
    await node(first.next, 2);
    const once = await affinity();
    await page.evaluate(() => window.oldBranchButton.click());
    assert.equal(await widget.getAttribute('data-vn-branch-node'), first.next);
    assert.equal(await affinity(), once, 'A stale button cannot add affinity again');

    // Browsing the friends menu without choosing someone preserves the current
    // conversation, including the response buttons and their original edges.
    await openTopic('friends');
    assert(await page.locator('[data-vn-panel="friends"]').isVisible());
    await page.keyboard.press('Escape');
    await node(first.next, 2);
    const afterMenu = trees.alice.nodes[first.next].choices[1];
    await choose(afterMenu);
    await node(afterMenu.next, 0);
    await options.locator('[data-vn-return-topic]').click();
    await node(topic.entry, 3);
    await choose(first);
    await node(first.next, 2);

    await page.locator('[data-vn-reading]').focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Space');
    assert.equal(await widget.getAttribute('data-vn-branch-node'), first.next, 'Advance keys never choose a response');
    await page.locator('[data-vn-auto]').click();
    await page.waitForTimeout(4200);
    assert.equal(await widget.getAttribute('data-vn-branch-node'), first.next, 'Automatic reading pauses for the player’s choice');
    assert.equal(await widget.getAttribute('data-dialogue-state'), 'choice');
    await page.locator('[data-vn-auto]').click();

    for (const width of [320, 768, 1440]) {
      await page.setViewportSize({ width, height: 1100 });
      for (const [id, tree] of Object.entries(trees)) {
        await character(id);
        for (const topic of tree.topics) {
          await openTopic('branch:' + topic.id);
          await node(topic.entry, 3);
          await widget.scrollIntoViewIfNeeded();
          await checkSceneChoices(widget);
          const geometry = await options.evaluate(container => {
            const bounds = document.querySelector('#live2d-widget').getBoundingClientRect();
            const reading = document.querySelector('[data-live2d-dialogue-text]');
            return {
              horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
              textReadable: reading.scrollWidth <= reading.clientWidth + 1 && reading.scrollHeight <= reading.clientHeight + 1,
              buttons: Array.from(container.querySelectorAll('button')).map(button => {
                const rect = button.getBoundingClientRect();
                return {
                  label: button.textContent,
                  fits: rect.left >= bounds.left && rect.right <= bounds.right + 1 && rect.bottom <= bounds.bottom + 1,
                  readable: button.scrollWidth <= button.clientWidth + 1 && button.scrollHeight <= button.clientHeight + 1,
                };
              }),
            };
          });
          assert(!geometry.horizontalOverflow && geometry.textReadable && geometry.buttons.every(button => button.fits && button.readable), `${id}/${topic.id}/${width}: ${JSON.stringify(geometry)}`);
        }
        await widget.screenshot({ path: `${out}/${id}-${width}-branch.png` });
      }
    }
    // Reload under the controllable clock so existing real-time timers cannot affect the inactivity deadline.
    await page.clock.install();
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await widget.locator('[data-vn-open="topics"]').waitFor();
    await character('alice');
    const touch = await page.context().newCDPSession(page);
    for (const topicId of ['branch:daily', 'rest']) {
      await openTopic(topicId);
      await finishLines();
      const labels = await options.locator('button').allTextContents();
      const state = await widget.getAttribute('data-dialogue-state');
      const priorNode = await widget.getAttribute('data-vn-branch-node');
      const priorAffinity = await affinity();
      await widget.locator('[data-vn-open="history"]').click();
      const log = widget.locator('[data-vn-history-list] li');
      const history = await log.allTextContents();
      await page.keyboard.press('Escape');
      const firstReply = options.locator('button').first();
      await page.mouse.move(1, 1);
      await page.clock.fastForward(2100);
      assert.deepEqual(await options.locator('button').allTextContents(), labels, 'A newly visible reply gets its reading interval');
      await firstReply.hover();
      await page.clock.fastForward(3600);
      assert.deepEqual(await options.locator('button').allTextContents(), labels, 'A resting mouse over an intentionally hovered reply holds it open');
      await widget.locator('#live2d-interact').hover();
      await page.clock.fastForward(1500);
      await firstReply.focus();
      await page.keyboard.press('ArrowDown');
      await page.clock.fastForward(3600);
      assert.deepEqual(await options.locator('button').allTextContents(), labels, 'A keyboard-focused reply holds the decision open');
      await page.keyboard.press('End');
      await page.keyboard.press('Tab');
      assert(!(await options.evaluate(el => el.contains(document.activeElement))));

      // A tap-and-hold is input even on devices without hover. Cancelling
      // the touch releases it without accidentally following the story edge.
      await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 2 });
      const rect = await firstReply.boundingBox();
      await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }] });
      await page.clock.fastForward(3600);
      assert.deepEqual(await options.locator('button').allTextContents(), labels, 'A held touch suspends folding');
      await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] });
      await touch.send('Emulation.setTouchEmulationEnabled', { enabled: false });
      await page.clock.fastForward(1200);
      await page.evaluate(() => SiteCompanion.setVisible(false));
      await page.clock.fastForward(5000);
      await page.evaluate(() => SiteCompanion.setVisible(true));
      await page.clock.fastForward(1200);
      assert.deepEqual(await options.locator('button').allTextContents(), labels, 'Hidden time does not consume the decision deadline');
      await page.clock.fastForward(1200);
      assert(await widget.evaluate(w => w.hasAttribute('data-replies-folded') && !w.querySelector('.vn-scene-frame').hasAttribute('data-replies-pending')));
      assert.equal(await options.locator('button').count(), 0, 'The reply folds after three seconds of visible inactivity');
      assert.equal(await widget.locator('[data-companion-stage]').getAttribute('data-camera-shot'), 'neutral', 'Folding returns the shot to rest');
      assert.equal(await widget.getAttribute('data-dialogue-state'), state);
      assert.equal(await widget.getAttribute('data-vn-branch-node'), priorNode);
      assert.equal(await affinity(), priorAffinity);
      await widget.locator('#live2d-interact').press('Enter');
      assert.deepEqual(await options.locator('button').allTextContents(), labels);
      assert(await options.locator('button').first().evaluate(button => button === document.activeElement));
      await widget.locator('[data-vn-open="history"]').click();
      assert.deepEqual(await log.allTextContents(), history, 'Folding and restoring a decision does not create dialogue history');
      await page.keyboard.press('Escape');
    }
    // The next decision can occupy exactly the same pixels. A replacement
    // underneath a still mouse starts its own timer without inheriting hover.
    await openTopic('branch:daily');
    await finishLines();
    await options.locator('button').first().hover();
    await page.evaluate(() => SiteCompanion.start('branch:daily'));
    await options.locator('button').first().waitFor();
    await page.clock.fastForward(2200);
    assert(await options.locator('button').count() > 0);
    await page.clock.fastForward(1100);
    assert.equal(await options.locator('button').count(), 0, 'An untouched new decision under a still pointer folds normally');
    await widget.locator('#live2d-interact').press('Enter');
    await widget.locator('[data-vn-open="settings"]').click();
    const folding = widget.getByRole('checkbox', { name: '3秒操作がないと返事をたたむ' });
    assert(await folding.isChecked(), 'Idle folding starts enabled');
    await page.clock.fastForward(5000);
    await page.keyboard.press('Escape');
    assert(await options.locator('button').count() > 0, 'An open settings panel suspends the fold timer');
    await widget.locator('[data-vn-open="settings"]').click();
    await folding.uncheck();
    await page.keyboard.press('Escape');
    await page.clock.fastForward(5000);
    assert(await options.locator('button').count() > 0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.locator('[data-vn-open="settings"]').click();
    assert(!(await folding.isChecked()), 'The idle-fold preference persists');
    assert.equal(paths, 54);
    assert.deepEqual(errors, []);
    console.log('PASS: all 54 two-stage paths, four affection tiers per character, return controls, friend follow-ups, suggested topics, interrupted-menu recovery, stale-choice guard, keyboard/auto choice safety, and 320/768/1440 layouts');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
