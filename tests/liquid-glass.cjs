const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];
 p.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:8795/';await p.goto(base+'?review=0');await p.waitForFunction(()=>window.homeGalleryReady);
 assert.deepEqual(await p.locator('.publication-links a').allTextContents().then(ns=>ns.map(t=>t.trim())),['Tech Report','Code','Hugging Face']);
 const colors=[];
 for(const [id,category] of [['583','gallery'],['physical-induction','physical-grounding']]){
  await p.goto(base+'?case='+id+'&review=0');await p.waitForFunction(()=>window.homeGalleryReady);
  await p.waitForFunction(c=>document.querySelector('#'+c+' iframe')?.contentWindow.behindFrame,category,{timeout:120000});
  const f=p.frames().find(f=>f.url().includes('workbench.html'));
  await f.waitForFunction(()=>document.querySelector('.panels>.panel:not(.source-panel)')?.dataset.glassPalette==='page-position');
  colors.push(await f.locator('.panels>.panel').first().evaluate(n=>getComputedStyle(n).getPropertyValue('--glass-a')));
  assert.equal(await f.locator('#result-video').evaluate(n=>getComputedStyle(n).filter),'none');
  await p.waitForTimeout(600);await p.locator('#'+category+' .fps-frame-slot').screenshot({path:`test-results/liquid-${id}.png`});
  await f.locator('.code-disclosure>summary').click();await f.waitForFunction(()=>document.querySelectorAll('.code-line').length>0);
  await f.waitForFunction(()=>document.querySelector('.code-disclosure').dataset.glassPalette==='page-position');
  await f.locator('.code-disclosure>summary').click();
  await f.locator('#play').click();await f.waitForFunction(()=>window.behindFrame.getState().videoTime>.1);await f.locator('#play').click();
 }
 assert.notEqual(colors[0],colors[1]);
 await p.setViewportSize({width:390,height:844});await p.waitForTimeout(650);
 await p.locator('#physical-grounding .fps-frame-slot').screenshot({path:'test-results/liquid-mobile.png'});
 assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await p.locator('#physical-grounding .fps-back').click();assert.equal(await p.locator('iframe').count(),0);
 assert.deepEqual(errors,[]);console.log('PASS publication buttons, position-dependent glass colors, code disclosure, playback, mobile and teardown',colors);
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1;});
