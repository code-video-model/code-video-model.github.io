const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const baseline=process.argv.includes('--baseline');
await p.goto('http://127.0.0.1:8795/?case=physical-induction&review=0');await p.waitForFunction(()=>document.querySelector('#physical-grounding iframe')?.contentDocument?.documentElement?.dataset.workbenchState==='ready',null,{timeout:120000,polling:100});
const f=p.frames().find(f=>f.url().includes('workbench.html'));
await f.evaluate(()=>{const v=document.getElementById('result-video');let count=0;const original=v.play.bind(v);v.play=()=>++count===1?new Promise((resolve,reject)=>window.rejectOldPlay=reject):original();});
await f.locator('#play').click();await f.locator('#play').click();await f.locator('#play').click();
await f.waitForFunction(()=>window.behindFrame.getState().videoTime>.05,null,{polling:100});
await f.evaluate(()=>window.rejectOldPlay(new DOMException('interrupted old play','AbortError')));await p.waitForTimeout(150);
const latestPlaySurvived=await f.evaluate(()=>!window.behindFrame.getState().paused);console.log('latest play survives old rejection:',latestPlaySurvived);if(!baseline)assert.equal(latestPlaySurvived,true);
await p.goto('http://127.0.0.1:8795/?review=0');await p.waitForFunction(()=>window.homeGalleryReady);
let release,requested;const gate=new Promise(r=>release=r),seen=new Promise(r=>requested=r);
await p.route('**/static/demo/*.mp4',async route=>{requested();await gate;await route.continue().catch(()=>{});});
try{
 await p.locator('.demo-load').click();await seen;await p.locator('#physical-grounding .category-mosaic').click({position:{x:10,y:10}});release();
 await p.waitForTimeout(2500);
 const demoPaused=await p.locator('.intro-standalone-video').evaluate(v=>v.paused);console.log('demo remains paused after leaving during load:',demoPaused);if(!baseline)assert.equal(demoPaused,true);
}finally{release();await p.unroute('**/static/demo/*.mp4');}
if(!baseline){
 await p.locator('#physical-grounding .category-collapse').click();
 await p.locator('.demo-load').click();await p.waitForFunction(()=>!document.querySelector('.intro-standalone-video').paused,null,{timeout:30000,polling:100});
 const card=p.locator('#physical-grounding .application-preview');await card.locator('.comparison-frame').hover();await card.locator('.application-play').click();
 await p.waitForFunction(()=>document.querySelector('#physical-grounding .application-preview').dataset.playback==='playing',null,{timeout:30000,polling:100});
 assert.equal(await p.locator('.intro-standalone-video').evaluate(v=>v.paused),true);
 await card.locator('.application-play').click();
 await card.locator('video').first().evaluate(v=>{let count=0;const original=v.play.bind(v);v.play=()=>++count===1?new Promise((resolve,reject)=>window.rejectPreview=reject):original();});
 await card.locator('.application-play').click();await p.waitForFunction(()=>window.rejectPreview);await card.locator('.application-play').click();await card.locator('.application-play').click();
 await p.evaluate(()=>window.rejectPreview(new DOMException('old preview play interrupted','AbortError')));await p.waitForTimeout(150);
 assert.equal(await card.getAttribute('data-playback'),'playing');
 console.log('PASS cancelled demo can restart, single active media, stale preview play ignored');
}
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1;});
