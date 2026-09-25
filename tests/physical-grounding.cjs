const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];
p.on('pageerror',e=>errors.push(e.message));p.on('response',r=>{if(r.url().includes('127.0.0.1:8795')&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
const base='http://127.0.0.1:8795/';await p.goto(base+'?review=1');await p.waitForFunction(()=>window.homeGalleryReady);
const s=p.locator('#physical-grounding');assert.equal(await p.locator('.category-shell').count(),9);
await s.locator('.application-preview').screenshot({path:'test-results/physical-highlight.png'});
await s.locator('.comparison-frame').hover();await s.locator('.application-play').click();
await p.waitForFunction(()=>document.querySelector('#physical-grounding video').currentTime>.1,null,{timeout:65000});
await s.locator('h2 a').click();assert.equal(await s.locator('.fps-case-bubble').count(),8);
const ids=await s.locator('.fps-case-bubble').evaluateAll(ns=>ns.map(n=>({id:n.dataset.case})));
assert.deepEqual(ids.map(i=>i.id),['physical-isochronous','physical-pendulum','physical-induction','physical-prism','black-hole-background-grade','stable-mass-transfer-binary','rolling-inertia','newtons-cradle']);
assert.equal(new Set(ids.map(i=>i.id)).size,8);assert.equal(await s.locator('[data-review-id]').count(),0);
await s.screenshot({path:'test-results/physical-gallery.png'});
for(const {id} of ids){
await p.goto(base+'?category=physical-grounding&case='+id+'&review=0');await p.waitForFunction(()=>window.homeGalleryReady);
await p.waitForFunction(()=>document.querySelector('#physical-grounding iframe')?.contentWindow.behindFrame,{timeout:120000});
const f=p.frames().find(f=>f.url().includes('workbench.html'));
assert.equal(await f.evaluate(()=>window.behindFrame.getState().caseId),id);
for(const frame of [0,48,96])await f.evaluate(n=>window.behindFrame.seek(n),frame);
await f.locator('.code-disclosure>summary').click();await f.waitForFunction(()=>document.querySelectorAll('.code-line').length>0);
await f.locator('.code-disclosure>summary').click();
await p.locator('#physical-grounding .fps-frame-slot').screenshot({path:`test-results/${id}-detail.png`});
await f.locator('#play').click();await f.waitForFunction(()=>window.behindFrame.getState().videoTime>4.1);await f.locator('#play').click();
await s.locator('.fps-back').click();assert.equal(await p.locator('iframe').count(),0);
console.log('PASS live source / selected result / seek / code / playback / return',id);
}
await p.setViewportSize({width:390,height:844});await p.goto(base+'?category=physical-grounding&review=0');await p.waitForFunction(()=>window.homeGalleryReady);
assert.equal(await s.locator('.fps-bubble-grid').getAttribute('data-rows'),'2+2+2+2');assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
await s.screenshot({path:'test-results/physical-mobile.png'});assert.deepEqual(errors,[]);console.log('PASS Physical Grounding, reordered first four, removed cases 524/531, stable IDs, eight cases, mobile');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
