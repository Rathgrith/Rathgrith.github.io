/* Real generated audio, content-derived phonemes and independent sound controls. */
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const base=process.env.PREVIEW_URL||'http://127.0.0.1:4100/';
const manifest=JSON.parse(fs.readFileSync(path.join(__dirname,'../assets/audio/voices/manifest.json')));
let total=0;
for(const [id,lines] of Object.entries(manifest.lines))for(const [text,line] of Object.entries(lines)) {
  total++; assert(text.length>0);assert(line.duration>0&&line.duration<60);
  assert(fs.statSync(path.join(__dirname,'../assets/audio/voices',line.src)).size>1000);
  let previous=-1;
  for(const [at,length,vowel] of line.cues){assert(at>=previous&&length>=0&&at+length<=line.duration+.02);previous=at;assert(['a','i','u','e','o','n','cl','rest'].includes(vowel));}
  assert(line.src.startsWith(id+'-'));
}
assert.equal(total,135);
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/audio/voices/'))requests.push(r.url())});
  await page.route('**/companion-dialogue.js*',async route=>{
    const r=await route.fetch();await route.fulfill({response:r,body:await r.text()+`;const voiceMount=SiteCompanion.mount;SiteCompanion.mount=function(w,h){window.phonemes=window.phonemes||[];const speak=h.speak;h.speak=function(g,d,p){phonemes.push(p);return speak(g,d,p)};return voiceMount(w,h)};`});
  });
  await page.goto(base);
  const voice=page.locator('[data-companion-voice]'), toggle=page.locator('[data-voice-toggle]');
  const playing=id=>page.waitForFunction(id=>{const a=document.querySelector('[data-companion-voice]');return a&&!a.paused&&!a.muted&&a.currentTime>.15&&a.src.includes('/'+id+'-');},id);
  const silent=async()=>assert(await voice.evaluate(a=>a.paused&&a.muted));
  await page.waitForFunction(()=>document.querySelector('#live2d-widget')?.dataset.dialogueState==='typing');
  assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.equal(await voice.count(),0);assert.deepEqual(requests,[]);
  await page.locator('[data-bgm-play]').click();
  await page.waitForFunction(()=>!document.querySelector('[data-companion-audio]').paused);
  await toggle.click();await playing('alice');
  await page.waitForFunction(()=>/^[aeiou]$/.test(document.querySelector('#live2d-widget').dataset.live2dViseme));
  await page.waitForFunction(()=>document.querySelector('[data-companion-audio]').volume<.09);
  await page.evaluate(()=>{phonemes=[];});
  await page.waitForFunction(()=>phonemes.length>3);
  assert(await page.evaluate(()=>phonemes.every(p=>p.length===1)),JSON.stringify(await page.evaluate(()=>phonemes)));
  await page.locator('[data-vn-reading]').click(); // Showing the full text must not stop the voice.
  assert(await voice.evaluate(a=>!a.paused));
  await toggle.click();await silent();
  await page.waitForFunction(()=>document.querySelector('[data-companion-audio]').volume>.27);
  await page.locator('[data-bgm-play]').click();
  await toggle.click();await playing('alice');
  await page.locator('[data-companion-minimize]').click();await silent();
  await page.locator('[data-companion-minimize]').click();await silent();
  await page.locator('[data-voice-replay]').click();await playing('alice');
  for(const id of ['marisa','patchouli']) {
    await page.locator('button[data-vn-character="'+id+'"]').click();await playing(id);
    await page.locator('[data-vn-open="settings"]').click();
    await page.locator('[data-voice-volume]').fill('0');assert.equal(await voice.evaluate(a=>a.volume),0);
    await page.locator('[data-voice-volume]').fill('70');
    await page.keyboard.press('Escape');
  }
  await page.locator('[data-companion-maximize]').click();
  await page.locator('[data-danmaku-open]').click();await silent();
  await page.locator('[data-danmaku-exit]').click();await silent();
  await page.locator('[data-voice-replay]').click();await playing('patchouli');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await silent();
  await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});await silent();
  // Failed media stays optional, leaves dialogue usable, and permits explicit retry.
  await page.route('**/audio/voices/*.mp3',r=>r.abort());
  await page.locator('[data-voice-replay]').click();
  await page.waitForFunction(()=>document.querySelector('#live2d-widget').dataset.voiceState==='error');await silent();
  await page.unroute('**/audio/voices/*.mp3');await page.locator('[data-voice-replay]').click();await playing('patchouli');
  await page.evaluate(()=>document.querySelector('[data-classic-page="gallery"]').click());
  await page.waitForURL('**/gallery/');await silent();
  await page.reload();assert.equal(await toggle.getAttribute('aria-pressed'),'false');assert.equal(await voice.count(),0);
  assert.deepEqual(errors,[]);
  // An opt-out before metadata arrives must never start delayed sound.
  const mobile=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  await mobile.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('blocked')}}));
  let release;const gate=new Promise(r=>release=r);
  await mobile.route('**/audio/voices/manifest.json*',async route=>{await gate;await route.continue()});
  await mobile.goto(base);await mobile.waitForFunction(()=>document.querySelector('#live2d-widget')?.dataset.dialogueState==='typing');
  await mobile.locator('[data-voice-toggle]').click();await mobile.locator('[data-voice-toggle]').click();release();await mobile.waitForTimeout(400);
  assert(await mobile.locator('[data-companion-voice]').evaluate(a=>a.paused&&!a.getAttribute('src')));
  await mobile.locator('[data-voice-toggle]').click();
  await mobile.waitForFunction(()=>{const a=document.querySelector('[data-companion-voice]');return a&&!a.paused&&a.currentTime>.1});
  await mobile.close();
  console.log('PASS: 135 generated lines/timings, silent defaults, 3 voices, real playback/lip cues, BGM ducking, independent volume, lifecycle, retry, delayed opt-out, mobile/blocked storage.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
