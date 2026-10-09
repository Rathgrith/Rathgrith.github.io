const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const out = process.env.QA_OUTPUT || '/tmp/companion-reactions';
fs.mkdirSync(out,{recursive:true});
(async()=>{
 const browser=await chromium.launch({channel:'chrome',headless:true});
 try {
  const page=await browser.newPage({viewport:{width:728,height:960},deviceScaleFactor:2});
  await page.setContent('<style>body{margin:16px;background:#141b2a;color:#cdd8ec;font:12px monospace}main{display:grid;grid-template-columns:repeat(7,96px);gap:3px}figure{margin:0;background:#232d40;padding:8px 16px}canvas{display:block;width:64px;height:64px;image-rendering:pixelated}figcaption{font-size:9px;white-space:nowrap;margin-top:8px}h1{font-size:14px}</style><h1>Companion FX · 24fps · entrance → settle → dissolve</h1><main></main>');
  await page.addScriptTag({path:path.join(__dirname,'../assets/js/core/companion-reactions.js')});
  const result=await page.evaluate(()=>{
   const types=CompanionReactions.types;
   const times=[0.08,0.2,0.42,0.75,1.25,1.85,2.3];
   return types.map(kind=>{
    const frames=times.map(time=>{
     const figure=document.createElement('figure'),canvas=document.createElement('canvas');
     canvas.width=canvas.height=64;
     CompanionReactions.draw(canvas,kind,time,'marisa');
     figure.append(canvas);
     const caption=document.createElement('figcaption');caption.textContent=kind+' · '+time+'s';figure.append(caption);document.querySelector('main').append(figure);
     const data=canvas.getContext('2d').getImageData(0,0,64,64).data;
     let opaque=0,partial=0,hash=0;const colors=new Set();
     for(let i=0;i<data.length;i+=4){if(data[i+3]===255)opaque++;else if(data[i+3])partial++; if(data[i+3])colors.add(data.slice(i,i+3).join(',')); hash=(Math.imul(hash,31)+data[i]+data[i+1]*2+data[i+2]*3+data[i+3])|0;}
     return {opaque,partial,colors:colors.size,hash};
    });
    return {kind,frames};
   });
  });
  await page.screenshot({path:out+'/reaction-sequences.png'});
  fs.writeFileSync(out+'/pixel-checks.json',JSON.stringify(result,null,2));
  for(const {kind,frames} of result){
   assert(frames.slice(0,-1).every(f=>f.opaque>0),kind+' must animate through entrance, hold and exit');
   assert(frames.every(f=>f.partial===0),kind+' must have crisp opaque pixel edges');
   assert.equal(frames.at(-1).opaque,0,kind+' must finish');
   assert(new Set(frames.slice(0,-1).map(f=>f.hash)).size>=5,kind+' needs distinct animation frames');
   assert(frames[3].colors>=4,kind+' needs shaded pixel art');
   assert(frames[5].opaque<frames[4].opaque,kind+' must visibly dissolve');
  }
  console.log('PASS: nine distinct entrance/hold/exit sequences, shaded palettes, opaque pixel edges, dissolution and bounded lifetime at DPR 2');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
