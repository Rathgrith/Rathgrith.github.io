const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.QA_OUTPUT || require('node:os').tmpdir() + '/companion-branches-qa';
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      localStorage.setItem('site-companion-v1', JSON.stringify({ speed: 0, affinity: { alice: 35, marisa: 35, patchouli: 35 } }));
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
        assert.equal(await suggested.first().textContent(), tree.topics[0].label + ' ▸');
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
    assert.equal(paths, 54);
    assert.deepEqual(errors, []);
    console.log('PASS: all 54 two-stage paths, four affection tiers per character, return controls, friend follow-ups, suggested topics, interrupted-menu recovery, stale-choice guard, keyboard/auto choice safety, and 320/768/1440 layouts');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
