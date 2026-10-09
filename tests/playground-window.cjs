/* Real pointer/keyboard resizing, canvas resolution and window lifecycle. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.QA_OUTPUT || require('node:os').tmpdir() + '/playground-window';
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4100/');
    const widget = page.locator('#live2d-widget');
    await page.waitForFunction(() => document.querySelector('#live2d-widget')?.dataset.live2dCharacter === 'alice', {timeout: 60000});
    assert.equal(await page.locator('[data-companion-name]').textContent(), 'Playground');
    const docked = () => widget.evaluate(w => w.classList.contains('is-docked'));
    const checkCanvas = async () => {
      await page.waitForTimeout(250);
      assert(await widget.evaluate(w => {
        const s = w.querySelector('.companion-stage'), c = w.querySelector('canvas');
        return s.clientWidth > 0 && s.clientHeight > 0 && Math.abs(c.width / s.clientWidth - c.height / s.clientHeight) < .03;
      }), 'canvas must be rerendered at the stage aspect ratio, not stretched');
    };
    assert(await docked());
    await widget.scrollIntoViewIfNeeded();
    await widget.screenshot({ path: out + '/docked.png' });
    await page.locator('[data-companion-maximize]').click();
    assert(!(await docked()));
    assert.equal(await widget.getAttribute('data-playground-layout'), 'wide');
    await checkCanvas();
    let r = await widget.boundingBox();
    assert.equal(Math.round(r.width), 1424);
    assert.equal(Math.round(r.height), 984);
    await widget.screenshot({ path: out + '/maximized.png' });
    await page.locator('[data-danmaku-open]').click();
    await page.locator('[data-danmaku-challenge="marisa"]').click();
    await page.waitForTimeout(350);
    let gameCanvas = await page.locator('[data-danmaku-canvas]').boundingBox();
    assert(gameCanvas.height > 600 && gameCanvas.width > 400, JSON.stringify(gameCanvas));
    await widget.screenshot({ path: out + '/maximized-game.png' });
    await page.locator('[data-danmaku-exit]').click();
    await page.locator('[data-vn-open="settings"]').click();
    assert(await page.locator('[data-vn-affinity-input]').isVisible());
    await page.keyboard.press('Escape');
    await page.locator('[data-companion-maximize]').click();
    assert(await docked(), 'restore returns to original page dock');
    // Detach, place at the top-left and resize using a genuine pointer drag.
    await page.locator('[data-companion-titlebar]').focus();
    await page.keyboard.press('ArrowLeft');
    const title = await page.locator('[data-companion-titlebar]').boundingBox();
    await page.mouse.move(title.x + 70, title.y + 12);
    await page.mouse.down(); await page.mouse.move(78, 20, { steps: 6 }); await page.mouse.up();
    const grip = page.locator('[data-companion-resize]');
    let g = await grip.boundingBox();
    await page.mouse.move(g.x + g.width / 2, g.y + g.height / 2);
    await page.mouse.down(); await page.mouse.move(800, 870, { steps: 10 }); await page.mouse.up();
    await checkCanvas();
    r = await widget.boundingBox();
    assert(r.width > 700 && r.height > 750, JSON.stringify(r));
    assert.equal(await widget.getAttribute('data-playground-layout'), 'wide');
    await grip.focus(); await page.keyboard.press('ArrowRight');
    await page.waitForTimeout(100);
    let adjusted = await widget.boundingBox();
    assert.equal(Math.round(adjusted.width - r.width), 16);
    await page.locator('[data-companion-maximize]').click();
    await page.locator('[data-companion-maximize]').click();
    r = await widget.boundingBox();
    assert.equal(Math.round(r.width), Math.round(adjusted.width));
    await page.locator('[data-companion-minimize]').click();
    assert(!(await page.locator('[data-companion-content]').isVisible()));
    assert(!(await grip.isVisible()));
    await page.locator('[data-companion-maximize]').click();
    assert(await page.locator('[data-companion-content]').isVisible());
    // Maximized windows remain within the screen after narrowing/rotation.
    for (const [width, height] of [[1024,768], [620,720], [390,844], [320,700], [844,390]]) {
      await page.setViewportSize({ width, height });
      await checkCanvas();
      const info = await widget.evaluate(w => {
        const r = w.getBoundingClientRect(), main = w.querySelector('.vn-main-view');
        return { x:r.x, y:r.y, right:r.right, bottom:r.bottom, overflow:main.scrollWidth > main.clientWidth + 1, pageOverflow:document.documentElement.scrollWidth > innerWidth };
      });
      assert(info.x >= 0 && info.y >= 0 && info.right <= width && info.bottom <= height && !info.overflow && !info.pageOverflow, JSON.stringify({width,height,...info}));
      if (height >= 700) assert(await widget.evaluate(w => { const main=w.querySelector('.vn-main-view'); return main.scrollHeight <= main.clientHeight + 2; }), 'portrait maximization must fit its controls');
      await widget.screenshot({ path: out + '/' + width + 'x' + height + '.png' });
    }
    await page.setViewportSize({width:1440,height:1000});
    await page.locator('[data-companion-reset-position]').click();
    assert(await docked());
    assert(!(await widget.evaluate(w => w.classList.contains('is-sized'))));
    await page.locator('[data-companion-maximize]').click();
    // Soft navigation resets dimensions without recreating the audio/model DOM.
    await page.evaluate(() => {
      window.retainedAudio = document.querySelector('audio');
      window.retainedCanvas = document.querySelector('#live2dcanvas');
      document.querySelector('[data-classic-page="gallery"]').click();
    });
    await page.waitForURL('**/gallery/');
    assert(await docked());
    assert(await widget.evaluate(w => !!w.closest('.classic-gallery-rail')));
    assert(await page.evaluate(() => window.retainedAudio === document.querySelector('audio') && window.retainedCanvas === document.querySelector('#live2dcanvas')));
    assert.deepEqual(errors, []);
    console.log('PASS: Playground pointer/keyboard resize, maximize/restore/minimize/reset, canvas aspect ratio, 5 narrow/landscape layouts, retained navigation.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exit(1); });
