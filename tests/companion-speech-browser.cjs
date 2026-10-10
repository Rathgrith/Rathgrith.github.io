const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const out = process.env.QA_OUTPUT || '/tmp/companion-speech-qa';
fs.mkdirSync(out, {recursive:true});
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1050}});
    const errors = [];
    page.on('pageerror', e=>errors.push(e.message));
    await page.route('**/companion-dialogue.js*', async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:await response.text()+'; const savedMount=SiteCompanion.mount; SiteCompanion.mount=function(w,h){window.actingHooks=h;const perform=h.perform;h.perform=function(line){window.directedLine=line;return perform(line)};return savedMount(w,h)};'});
    });
    await page.route('**/companion-lighting.js*', async route=>{
      const response=await route.fetch();
      await route.fulfill({response,body:await response.text()+'; const savedCreate=CompanionLighting.create; CompanionLighting.create=function(a,w){window.actingApp=a;return savedCreate(a,w)};'});
    });
    await page.goto(process.env.PREVIEW_URL || 'http://127.0.0.1:4100/',{waitUntil:'domcontentloaded'});
    for (const id of ['alice','marisa','patchouli']) {
      await page.locator(`[data-classic-character="${id}"]`).click();
      await page.waitForFunction(id=>{
        const w=document.querySelector('#live2d-widget');
        return w?.dataset.live2dCharacter===id && !w.classList.contains('is-loading');
      },id,{timeout:45000});
      await page.evaluate(()=>{
        window.actingFrames=[];
        const model=actingApp.stage.children[0];
        model.internalModel.on('beforeModelUpdate',()=>{
          const core=model.internalModel.coreModel;
          actingFrames.push({
            viseme:document.querySelector('#live2d-widget').dataset.live2dViseme,
            jaw:core.getParameterValueById('ParamMouthOpenY'),
            form:core.getParameterValueById('ParamMouthForm'),
            cheek:core.getParameterValueById('ParamCheek'),
            highlight:core.getParameterValueById('ParamEyeHiLightShake')
          });
        });
      });
      await page.locator('[data-vn-open="topics"]').click();
      await page.locator('[data-vn-topic-start="craft"]').click();
      await page.waitForFunction(()=>document.querySelector('#live2d-widget').dataset.dialogueState==='ready',null,{timeout:25000});
      const frames=await page.evaluate(()=>actingFrames);
      const vowels=new Set(frames.map(f=>f.viseme));
      const expected = await page.evaluate(() => [...new Set(CompanionSpeech.plan(directedLine.text).units.flat())].filter(v => 'aiueo'.includes(v)));
      for (const v of expected) assert(vowels.has(v), `${id}: the actual line drives ${v}`);
      assert(Math.max(...frames.map(f=>f.jaw))>0.25);
      await page.waitForTimeout(250);
      assert((await page.evaluate(()=>actingFrames.at(-1).jaw))<0.01);
      // Exercise the real next-line path, rather than only injecting expressions.
      await page.locator('#live2d-interact').click();
      const directed = await page.evaluate(() => directedLine.effect);
      if (directed === 'none') assert.equal(await page.locator('.vn-reaction').isVisible(), false);
      else assert.equal(await page.locator('.vn-reaction').getAttribute('data-reaction'),directed);
      await page.locator('#live2d-interact').click(); // Finish typing before isolated FX checks.
      for (const effect of [undefined, 'none', 'unsupported']) {
        await page.evaluate(effect=>actingHooks.perform({poseId:'1',expressionMotionId:'02',effect}),effect);
        assert.equal(await page.locator('.vn-reaction').isVisible(),false,'A smile must not imply any icon');
      }
      for(const [face,effect] of [['02','sparkle'],['04','sweat'],['05','anger'],['06','surprise'],['08','sigh'],['02','music'],['01','question'],['07','blush'],['01','idea']]) {
        await page.evaluate(({face,effect})=>actingHooks.perform({poseId:'1',expressionMotionId:face,effect}),{face,effect});
        await page.waitForTimeout(380);
        const icon=page.locator('.vn-reaction');
        assert.equal(await icon.count(),1,'Character replacement must clean up the old reaction');
        assert.equal(await icon.getAttribute('data-reaction'),effect);
        assert(await icon.isVisible());
        if(effect==='blush') assert((await page.evaluate(()=>actingFrames.at(-1).cheek))>1.1);
        if(effect==='surprise') assert((await page.evaluate(()=>actingFrames.at(-1).highlight))>1);
        if(['music','question','blush','idea'].includes(effect)) await page.locator('[data-companion-stage]').screenshot({path:`${out}/${id}-${effect}.png`});
      }
      await page.waitForTimeout(2100);
      assert.equal(await page.locator('.vn-reaction').isVisible(),false,'Effects are transient');
    }
    await page.evaluate(()=>actingHooks.perform({poseId:'1',expressionMotionId:'06',effect:'surprise'}));
    await page.waitForTimeout(300);
    await page.locator('[data-companion-minimize]').click();
    await page.waitForTimeout(50);
    const pausedEffect=await page.locator('.vn-reaction').getAttribute('style');
    await page.waitForTimeout(650);
    assert.equal(await page.locator('.vn-reaction').getAttribute('style'),pausedEffect,'Minimized effects must freeze');
    await page.locator('[data-companion-minimize]').click();
    assert(await page.locator('.vn-reaction').isVisible());
    await page.locator('[data-danmaku-open]').click();
    assert(await page.locator('[data-danmaku-lobby]').isVisible());
    await page.locator('[data-danmaku-exit]').click();
    assert(await page.locator('[data-companion-stage]').isVisible());
    for(const width of [320,375,768,1440]) {
      await page.setViewportSize({width,height:1000});
      await page.waitForTimeout(150);
      await page.evaluate(()=>actingHooks.perform({poseId:'1',expressionMotionId:'06',effect:'question'}));
      await page.waitForTimeout(200);
      const geometry=await page.locator('.vn-reaction').evaluate(el=>{
        const r=el.getBoundingClientRect(),s=el.parentElement.getBoundingClientRect();
        return {x:r.x,y:r.y,width:r.width,inside:r.left>=s.left&&r.right<=s.right,rendering:getComputedStyle(el).imageRendering};
      });
      assert(Math.abs(geometry.x-Math.round(geometry.x))<0.01&&Math.abs(geometry.y-Math.round(geometry.y))<0.01,JSON.stringify(geometry));
      assert.equal(geometry.width,64);
      assert(geometry.inside);
      assert.equal(geometry.rendering,'pixelated');
    }
    await page.emulateMedia({reducedMotion:'reduce'});
    await page.evaluate(()=>actingHooks.perform({poseId:'1',expressionMotionId:'06',effect:'surprise'}));
    await page.waitForTimeout(100);
    assert.equal(await page.locator('.vn-reaction').isVisible(),false);
    assert.deepEqual(errors,[]);
    console.log('PASS: text-driven mouth shapes on three rigs; context-driven effects, quiet smiles, nine pixel animations, native blush/highlights, pause/resume and reduced motion');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exitCode=1;});
