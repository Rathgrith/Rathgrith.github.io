/* Real HTMLAudio + Web Audio decoding/output, actual engine event hooks and lifecycle. */
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const base = process.env.PREVIEW_URL || 'http://127.0.0.1:4100/';
const out = process.env.QA_OUTPUT || require('node:os').tmpdir() + '/danmaku-audio';
fs.mkdirSync(out, { recursive: true });
async function instrument(page) {
  await page.addInitScript(() => {
    const RealAudioContext = window.AudioContext;
    window.sfxStarts = []; window.soundEvents = [];
    window.AudioContext = class extends RealAudioContext {
      constructor(...args) { super(...args); window.battleContext = this; }
      createBufferSource() {
        const source = super.createBufferSource(), start = source.start.bind(source);
        source.start = (...args) => { window.sfxStarts.push({duration: source.buffer.duration, time: performance.now()}); return start(...args); };
        return source;
      }
      createDynamicsCompressor() {
        const node = super.createDynamicsCompressor();
        window.battleMeter = this.createAnalyser(); node.connect(window.battleMeter);
        return node;
      }
    };
  });
  await page.route('**/danmaku-engine.js*', async route => {
    const response = await route.fetch();
    await route.fulfill({response, body: await response.text() + `
      const engineCreate = DanmakuEngine.create;
      DanmakuEngine.create = function(p,e,seed,sound) {
        return window.audioGame = engineCreate(p,e,seed,(name,id) => { soundEvents.push([name,id]); if (sound) sound(name,id); });
      };
    `});
  });
}
(async () => {
  const browser = await chromium.launch({channel:'chrome',headless:true,args:['--disable-gpu']});
  try {
    const page = await browser.newPage({viewport:{width:1440,height:1000}});
    const errors=[], requests=[];
    page.on('pageerror', e=>errors.push(e.message));
    page.on('request',r=>{if (r.url().endsWith('.wav') || r.url().endsWith('-ensemble.mp3')) requests.push(r.url());});
    await instrument(page);
    await page.goto(base);
    await page.locator('[data-danmaku-open]').click();
    const music = page.locator('[data-danmaku-music]'), sfx = page.locator('[data-danmaku-sfx]');
    const track = page.locator('[data-danmaku-audio]');
    const silent = async () => assert(await track.evaluate(a=>a.paused && a.muted));
    const playing = id => page.waitForFunction(id=>{const a=document.querySelector('[data-danmaku-audio]');return a&&!a.paused&&!a.muted&&a.currentTime>.15&&a.src.endsWith(id+'-ensemble.mp3');},id);
    const effectsReady = () => page.waitForFunction(()=>window.battleContext?.state==='running' && document.querySelector('[data-danmaku-sfx]').getAttribute('aria-busy')==='false');
    assert.equal(await music.getAttribute('aria-pressed'),'false');
    assert.equal(await sfx.getAttribute('aria-pressed'),'false');
    await page.locator('[data-danmaku-volume]').fill('45');
    await page.locator('[data-danmaku-challenge="marisa"]').click();
    await page.evaluate(()=>{audioGame.state.countdown=0;audioGame.state.player.invulnerable=999;});
    await page.waitForTimeout(300);
    assert.deepEqual(requests,[]);
    assert(await page.evaluate(()=>!window.battleContext));
    assert.equal(await track.count(),0);
    await music.click(); await playing('marisa');
    await sfx.click(); await effectsReady();
    await page.waitForFunction(()=>sfxStarts.length>3);
    await page.waitForFunction(()=>{const values=new Float32Array(battleMeter.fftSize);battleMeter.getFloatTimeDomainData(values);return values.some(v=>Math.abs(v)>.00001);});
    assert.equal(await page.evaluate(()=>audioGame.state.phase),'playing','mixer controls must not pause the battle');
    // Actual collection/collision/spell logic, including an auto-player spell path.
    await page.evaluate(()=>{
      const g=audioGame,p=g.state.player;
      g.state.shots.push({x:g.state.boss.x,y:g.state.boss.y,vx:0,vy:0,damage:1,color:"#fff"});
      g.state.bullets=[{x:p.x+11,y:p.y,vx:0,vy:0,radius:2.4,grazed:false}];
      p.invulnerable=0;g.step(1/60);
      g.state.items=['power','life','clear'].map(type=>({type,x:p.x,y:p.y,vx:0,vy:0,age:0}));g.step(1/60);
      g.state.countdown=0;g.bomb();
      g.state.spell=null;g.state.clearPulse=null;p.invulnerable=0;
      g.state.bullets=[{x:p.x,y:p.y,vx:0,vy:0,radius:2.4,grazed:false}];g.step(1/60);p.invulnerable=999;
    });
    const events=await page.evaluate(()=>soundEvents.map(x=>x[0]));
    for (const name of ['shot','hit','graze','power','life','clear','bomb','death']) assert(events.includes(name),name);
    await page.locator('[data-danmaku-pause]').click(); await silent();
    await page.waitForFunction(()=>battleContext.state==='suspended');
    const stopped = await page.evaluate(()=>sfxStarts.length);
    await page.waitForTimeout(150); assert.equal(await page.evaluate(()=>sfxStarts.length),stopped);
    await page.locator('[data-danmaku-resume]').click(); await playing('marisa'); await effectsReady();
    await page.locator('[data-danmaku-volume]').fill('0');
    assert.equal(await track.evaluate(a=>a.volume),0);
    await page.waitForTimeout(60);
    const noVolume = await page.evaluate(()=>sfxStarts.length);
    await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>sfxStarts.length),noVolume);
    await page.locator('[data-danmaku-volume]').fill('45');
    // SE and BGM are independent switches, and off immediately stops current voices.
    await sfx.click(); await page.waitForFunction(()=>battleContext.state==='suspended');
    await playing('marisa');
    await music.click();await silent();
    await sfx.click(); await effectsReady(); await silent();
    await music.click();await playing('marisa');
    await page.locator('[data-companion-minimize]').click(); await silent();
    await page.waitForFunction(()=>battleContext.state==='suspended');
    await page.locator('[data-companion-minimize]').click();await silent();
    assert.equal(await page.evaluate(()=>audioGame.state.phase),'paused');
    await page.locator('[data-danmaku-resume]').click();await playing('marisa');
    for(const id of ['alice','patchouli','marisa']) {
      await page.locator('[data-danmaku-pause]').click();
      await page.locator('[data-danmaku-menu]').click(); await silent();
      await page.locator('[data-danmaku-player="'+id+'"]').click();
      await page.locator('[data-danmaku-challenge="'+id+'"]').click();await playing(id);await effectsReady();
      await page.evaluate(()=>{audioGame.state.countdown=0;audioGame.state.player.invulnerable=999;audioGame.bomb();});
      await page.waitForTimeout(200);
      assert(await page.evaluate(id=>soundEvents.some(([n,p])=>n==='shot'&&p===id),id));
    }
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    await silent();await page.waitForFunction(()=>battleContext.state==='suspended');
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});
    await silent();
    await page.locator('[data-danmaku-resume]').click();await playing('marisa');
    // Final hit can ring out, but music stops on game over.
    await page.evaluate(()=>{
      const g=audioGame,p=g.state.player;g.state.countdown=0;g.state.spell=null;g.state.clearPulse=null;g.state.lives=1;p.invulnerable=0;
      g.state.bullets=[{x:p.x,y:p.y,vx:0,vy:0,radius:2.4,grazed:false}];
    });
    await page.waitForFunction(()=>audioGame.state.phase==='over');await silent();
    await page.waitForFunction(()=>battleContext.state==='suspended');
    await page.locator('[data-danmaku-exit]').click();await silent();
    // Re-entering a challenge keeps the local battle mixer selection, independently
    // of the opt-in radio (its provider handoff has a separate regression suite).
    await page.locator('[data-danmaku-open]').click();
    await silent();
    await page.locator('[data-danmaku-challenge="alice"]').click(); await playing('alice');
    await page.locator('[data-danmaku-exit]').click();await silent();
    await page.reload(); await page.locator('[data-danmaku-open]').click();
    assert.equal(await music.getAttribute('aria-pressed'),'false');assert.equal(await sfx.getAttribute('aria-pressed'),'false');
    assert(await page.evaluate(()=>!window.battleContext));assert.equal(await track.count(),0);
    await page.locator('[data-danmaku-challenge="alice"]').click();
    for(const width of [320,375,600,1000,1440]) {
      await page.setViewportSize({width,height:900});await page.waitForTimeout(150);
      assert(await page.locator('.danmaku-audio').evaluate(e=>e.scrollWidth<=e.clientWidth && [...e.querySelectorAll('button,input,a')].every(c=>{const r=c.getBoundingClientRect(),b=e.getBoundingClientRect();return r.left>=b.left && r.right<=b.right})),String(width));
      if(width===375)await page.locator('#live2d-widget').screenshot({path:out+'/mobile.png'});
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: opt-in/no-request default, real BGM+Web Audio output, all event cues, 3 pilots/opponents, independent switches, mute/volume, pause/minimize/hidden/game-over, battle exit/reentry, reload, 5 layouts.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exit(1)});
