/* Real Cannonball rigs: inspect values at render time, not Cubism's saved
 * neutral baseline restored after drawing. Screenshots use the docked size. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const out = process.env.QA_OUTPUT || path.join(require('node:os').tmpdir(), 'companion-expression-qa/rendered');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--disable-gpu'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1100 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.route('**/companion-performance.js*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()) + `
        const expressionCreate = CompanionPerformance.create;
        CompanionPerformance.create = function(model, id, widget, faces, options) {
          const act = expressionCreate(model, id, widget, faces, options);
          const rig = model.internalModel.coreModel;
          const parameters = rig._model.parameters;
          window.expressionTest = { model, act, id, frames: [], bounds: parameters.ids.map((id, i) => ({
            id, min: parameters.minimumValues[i], max: parameters.maximumValues[i]
          })).filter(p => /^Param(Eye|Brow|Mouth|Cheek)/.test(p.id)) };
          model.internalModel.on('beforeModelUpdate', function() {
            const state = window.expressionTest;
            if (state.model !== model) return;
            state.frame = Object.fromEntries(state.bounds.map(p => [p.id, rig.getParameterValueById(p.id)]));
            state.frames.push(state.frame);
            if (state.frames.length > 400) state.frames.shift();
          });
          return act;
        };` });
    });
    await page.route('**/companion-dialogue.js*', async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()) + `
        const expressionMount = SiteCompanion.mount;
        SiteCompanion.mount = function(widget, hooks) {
          window.expressionHooks = hooks;
          return expressionMount(widget, hooks);
        };` });
    });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4100/', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.expressionTest && document.querySelector('#live2d-widget').dataset.dialogueState === 'typing', null, { timeout: 45000 });
    await page.locator('[data-vn-open="settings"]').click();
    await page.locator('[data-vn-speed]').selectOption('0');
    await page.keyboard.press('Escape');
    const results = {};
    for (const id of ['alice', 'marisa', 'patchouli']) {
      await page.locator(`button[data-vn-character="${id}"]`).click();
      await page.waitForFunction(id => window.expressionTest?.id === id && !document.querySelector('#live2d-widget').classList.contains('is-loading'), id, { timeout: 45000 });
      await page.evaluate(() => expressionHooks.perform({ poseId: '1', expressionMotionId: '01', effect: 'none' }));
      await page.waitForFunction(() => document.querySelector('#live2d-widget').dataset.live2dPoseId === '1' && document.querySelector('#live2d-widget').dataset.live2dResting === 'true', null, { timeout: 15000 });
      results[id] = {};
      for (const face of ['01', '02', '03', '04', '05', '06', '07', '08']) {
        await page.evaluate(face => {
          expressionTest.act.perform({ expressionMotionId: face, effect: 'none' });
          expressionTest.model.internalModel.focusController.focus(0, 0, true);
          expressionTest.frames.length = 0;
        }, face);
        await page.waitForTimeout(1700);
        await page.waitForFunction(face => {
          const state = expressionTest;
          if (document.querySelector('#live2d-widget').hasAttribute('data-live2d-blinking')) return false;
          // The blink attribute clears during reopening. Sample only after
          // the eye reaches its sustained opening, not halfway through that
          // final blink phase (which would make neutral look half asleep).
          if (face === '01') return state.frame.ParamEyeLOpen > 0.99;
          const recentOpen = Math.max(...state.frames.slice(-20).map(f => f.ParamEyeLOpen));
          return state.frame.ParamEyeLOpen >= recentOpen - 0.001;
        }, face);
        const { frame, frames, bounds } = await page.evaluate(() => ({ frame: expressionTest.frame, frames: expressionTest.frames, bounds: expressionTest.bounds }));
        for (const frame of frames) for (const p of bounds)
          assert(frame[p.id] >= p.min - 0.001 && frame[p.id] <= p.max + 0.001, `${id}/${face} ${p.id} escaped authored limits: ${frame[p.id]}`);
        results[id][face] = frame;
        await page.locator('[data-companion-stage]').screenshot({ path: path.join(out, `${id}-${face}.png`) });
      }
      const faces = results[id];
      assert(faces['02'].ParamMouthForm > 0.8 && faces['02'].ParamMouthFormScale > 0.7, `${id} readable gentle smile`);
      assert(faces['05'].ParamMouthForm < -0.8, `${id} readable annoyed mouth`);
      assert(faces['06'].ParamMouthOpenY > 0.10 && faces['06'].ParamMouthFormScale > 0.35, `${id} visible surprised resting mouth`);
      assert(faces['07'].ParamEyeLOpen < faces['01'].ParamEyeLOpen - 0.25, `${id} amused eyes differ from neutral`);
      assert(faces['08'].ParamEyeLOpen < faces['01'].ParamEyeLOpen - 0.1, `${id} tired eyes differ from neutral`);
      // Phrased mouth shapes remain in control while speaking: a nasal closes
      // even the surprised jaw, then silence returns to the emotional face.
      await page.evaluate(() => {
        expressionTest.act.perform({ expressionMotionId: '06', effect: 'none' });
        expressionTest.act.speak('ん', 1800, ['n']);
      });
      await page.waitForTimeout(650);
      assert((await page.evaluate(() => expressionTest.frame.ParamMouthOpenY)) < 0.001);
      await page.evaluate(() => expressionTest.act.stopSpeaking());
      await page.waitForTimeout(650);
      const resting = await page.evaluate(() => expressionTest.frame);
      assert(resting.ParamMouthOpenY > 0.10);
      assert(Math.abs(resting.ParamMouthForm - faces['06'].ParamMouthForm) < 0.005, 'Silent surprise must not retain the last vowel');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.evaluate(() => expressionTest.act.perform({ expressionMotionId: '02', effect: 'none' }));
      await page.waitForTimeout(300);
      assert((await page.evaluate(() => expressionTest.frame.ParamMouthForm)) > 0.8, 'Reduced motion keeps the static facial expression');
      await page.emulateMedia({ reducedMotion: 'no-preference' });
      await page.evaluate(() => expressionTest.act.perform({ expressionMotionId: '01', effect: 'none' }));
      await page.waitForTimeout(1600);
      const neutral = await page.evaluate(() => expressionTest.frame);
      assert(Math.abs(neutral.ParamMouthForm - faces['01'].ParamMouthForm) < 0.005, `${id} returns to its own neutral mouth`);
      assert(Math.abs(neutral.ParamMouthFormScale - faces['01'].ParamMouthFormScale) < 0.005, `${id} does not retain the surprise mouth width`);
      assert((await page.evaluate(() => expressionTest.frame.ParamMouthOpenY)) < 0.001);
    }
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(out, 'rendered-values.json'), JSON.stringify(results, null, 2));
    console.log('PASS: all 24 real-rig faces retain visible eye/mouth differences within authored bounds; spoken nasal, silence, neutral reset and reduced motion compose correctly');
    console.log(`Docked expression screenshots: ${out}`);
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exit(1); });
