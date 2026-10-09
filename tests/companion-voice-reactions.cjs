/* Real recorded audio, opt-in behavior and cancellation across the site lifecycle. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4100/';
const manifest = require('../assets/audio/reactions/manifest.json');
assert.equal(Object.values(manifest).flatMap(m => Object.values(m).flat()).length,18);
for (const clips of Object.values(manifest)) for (const names of Object.values(clips)) for (const name of names) {
  assert(fs.statSync(path.join(__dirname,'../assets/audio/reactions',name)).size > 1000);
}
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}), errors=[], requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(/\/audio\/(voices|reactions)\//.test(r.url()))requests.push(r.url())});
  await page.addInitScript(()=>{
   window.playedReactions=[];
   const original=HTMLMediaElement.prototype.play;
   HTMLMediaElement.prototype.play=function(){
    const promise=original.call(this);
    if(this.hasAttribute('data-companion-reaction-audio'))promise.then(()=>playedReactions.push({src:this.src,duration:this.duration})).catch(()=>{});
    return promise;
   };
  });
  await page.goto(base);
  const widget=page.locator('#live2d-widget'), toggle=page.locator('[data-voice-reactions]');
  await page.waitForFunction(()=>document.querySelector('#live2d-widget')?.dataset.live2dCharacter==='alice');
  assert.equal(await toggle.getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('[data-companion-reaction-audio]').count(),0);
  assert.equal(await page.locator('script[src*="companion-voice.js"]').count(),0);
  assert.deepEqual(requests,[]);
  for (const character of ['alice','marisa','patchouli']) {
   if(character!=='alice') {
    await toggle.click();
    await page.locator('button[data-vn-character="'+character+'"]').click();
    await page.waitForFunction(id=>document.querySelector('#live2d-widget').dataset.live2dCharacter===id,character);
   }
   await toggle.click();
   await page.waitForFunction(id=>playedReactions.some(p=>p.src.includes('/'+id+'-')),character);
   const count=await page.evaluate(()=>playedReactions.length);
   await page.evaluate(()=>SiteCompanion.start('craft'));
   await page.waitForTimeout(200);
   assert.equal(await page.evaluate(()=>playedReactions.length),count,'rapidly advancing text must not spam voices');
   await page.locator('[data-vn-open="settings"]').click();
   await page.locator('[data-reaction-volume]').fill('30');
   assert.equal(await page.locator('[data-companion-reaction-audio]').evaluate(a=>a.volume),.3);
   assert(await page.locator('.vn-voice-credits').textContent().then(s=>s.includes('あみたろの声素材工房')));
   await page.keyboard.press('Escape');
  }
  assert(await page.evaluate(()=>playedReactions.every(p=>p.duration>.1&&p.duration<1.1)),'interjections stay under a second');
  assert(!requests.some(r=>r.includes('/audio/voices/')));
  await page.waitForFunction(()=>/^[aeiou]$/.test(document.querySelector('#live2d-widget').dataset.live2dViseme));
  await page.locator('[data-companion-minimize]').click();
  assert(await page.locator('[data-companion-reaction-audio]').evaluate(a=>a.paused&&a.muted));
  await page.locator('[data-companion-minimize]').click();
  await page.locator('[data-danmaku-open]').click();
  assert(await page.locator('[data-companion-reaction-audio]').evaluate(a=>a.paused));
  await page.locator('[data-danmaku-exit]').click();
  await toggle.click();
  await page.route('**/audio/reactions/*.mp3',route=>route.abort());
  await toggle.click();
  await page.waitForFunction(()=>document.querySelector('#live2d-widget').dataset.reactionVoiceState==='error');
  await page.evaluate(()=>SiteCompanion.next());
  assert.notEqual(await widget.getAttribute('data-dialogue-state'),'idle');
  await page.unroute('**/audio/reactions/*.mp3');
  await toggle.click(); await toggle.click();
  await page.waitForFunction(()=>document.querySelector('#live2d-widget').dataset.reactionVoiceState==='playing');
  await page.evaluate(()=>document.querySelector('[data-classic-page="gallery"]').click());
  await page.waitForURL('**/gallery/');
  assert(await page.locator('[data-companion-reaction-audio]').evaluate(a=>a.paused&&a.muted));
  assert.deepEqual(errors,[]);

  const mobile=await browser.newPage({viewport:{width:320,height:800},isMobile:true,hasTouch:true});
  let release;const gate=new Promise(r=>release=r);
  await mobile.route('**/audio/reactions/manifest.json*',async route=>{await gate;await route.continue()});
  await mobile.goto(base);
  await mobile.waitForFunction(()=>document.querySelector('#live2d-widget')?.dataset.live2dCharacter==='alice');
  await mobile.locator('[data-voice-reactions]').click();
  await mobile.locator('[data-voice-reactions]').click();
  release();await mobile.waitForTimeout(300);
  assert(await mobile.locator('[data-companion-reaction-audio]').evaluate(a=>a.paused&&a.muted),'delayed opt-out stays silent');
  assert(await mobile.locator('.vn-nameplate').evaluate(el=>el.scrollWidth<=el.clientWidth+1),'compact nameplate fits');
  await mobile.locator('[data-voice-reactions]').click();
  await mobile.waitForFunction(()=>document.querySelector('#live2d-widget').dataset.reactionVoiceState==='playing');
  await mobile.reload();
  assert.equal(await mobile.locator('[data-voice-reactions]').getAttribute('aria-pressed'),'false');
  console.log('PASS: 18 short recordings; three real voices; default silence; cooldown; text mouth animation; volume/credits; minimize/game/navigation stop; retry; delayed opt-out; compact layout.');
 } finally {await browser.close()}
})().catch(e=>{console.error(e);process.exit(1)});
