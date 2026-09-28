const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const base=(process.env.DEMO_URL||'http://127.0.0.1:8795/').replace(/\/?$/,'/');
const site=path.resolve(__dirname,'../project-page-template');
const cases=['anime-hotel','anime-kumiko','anime-nichijou','three-colossal'];
const records=JSON.parse(fs.readFileSync(path.join(site,'static/project-page-cases/prompts.json'))).items;
const output=path.resolve(__dirname,'../test-results/anime');fs.mkdirSync(output,{recursive:true});
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const id of cases){
 const item=records.find(r=>r.case_id===id),meta=JSON.parse(fs.readFileSync(path.join(site,'static/interactive',id,'case.json')));
 assert.equal(meta.threejs_sha256,item.threejs_sha256);
 assert.equal(hash(path.join(site,'static/project-page-cases',item.display_code_video_model)),item.display_code_video_model_sha256);
 for(const source of meta.sources)assert.equal(hash(path.join(site,'static/interactive',id,source.path)),source.sha256);
 assert.equal(meta.sources[0].sha256,meta.provenance.source_program_sha256);
}
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'chrome'})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],media=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  page.on('request',r=>{if(r.url().includes('.mp4'))media.push(r.url());});
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.homeGalleryReady);
  assert.equal(await page.locator('.category-shell').count(),9);
  assert.equal(await page.locator('.category-shell .fps-case-bubble').count(),62);
  assert.equal(await page.locator('#product-cinematography .fps-case-bubble').count(),8,'Keep selected product additions');
  assert.equal(await page.locator('#anime .category-mosaic img').count(),3);
  assert.equal(media.length,0,'Homepage must not eagerly fetch videos');
  const section=page.locator('#anime');await section.scrollIntoViewIfNeeded();
  await section.locator('.comparison-frame').hover();await section.locator('.application-play').click();
  await page.waitForFunction(()=>[...document.querySelectorAll('#anime .application-preview video')].every(v=>v.currentTime>.3&&!v.paused));
  await section.locator('.application-play').click();
  await section.screenshot({path:path.join(output,'overview-desktop.png')});
  await section.locator('h2 a').click();
  assert.deepEqual(await section.locator('.fps-case-bubble').evaluateAll(ns=>ns.map(n=>n.dataset.case)),cases);
  await section.screenshot({path:path.join(output,'grid-desktop.png')});
  for(const id of cases){
   await page.goto(base+'?case='+id);
   await page.waitForFunction(()=>document.querySelector('#anime iframe')?.contentWindow.behindFrame,null,{timeout:90000});
   const frame=page.frames().find(f=>f.url().includes('/static/interactive/workbench.html'));
   const state=await frame.evaluate(async()=>{await window.behindFrame.seek(48);return window.behindFrame.getState();});
   assert.equal(state.caseId,id);assert.equal(state.frame,48);assert.ok(Math.abs(state.videoTime-2)<.06);
   const runtime=frame.childFrames()[0];
   const scene=await runtime.evaluate(()=>({errors:window.__bfErrors,diagnostics:window.reconstruction.getDiagnostics?.(),canvas:!!window.__bfCapture?.renderer.domElement}));
   assert.deepEqual(scene.errors,[]);assert.ok(scene.canvas);
   if(id!=='three-colossal')assert.equal(scene.diagnostics.seconds,2,'Run animated scene, not static default');
   await frame.locator('#proxy-stage').screenshot({path:path.join(output,id+'-proxy.png')});
   await frame.locator('#result-video').screenshot({path:path.join(output,id+'-output.png')});
   await frame.locator('.code-disclosure > summary').click();
   await frame.waitForFunction(()=>document.querySelectorAll('#source-code .code-line').length>0);
   const source=await frame.locator('#source-code').innerText();assert.ok(source.includes('PerspectiveCamera'));
   if(id!=='three-colossal')assert.match(await frame.locator('#code-note').innerText(),/motion=1/);
   await frame.locator('#play').evaluate(n=>n.click());await frame.waitForFunction(()=>window.behindFrame.getState().videoTime>2.15);await frame.locator('#play').evaluate(n=>n.click());
   assert.ok(await frame.evaluate(()=>window.behindFrame.getState().paused));
   await page.screenshot({path:path.join(output,id+'.png')});
   await section.locator('.fps-back').click();
   assert.equal(await section.getAttribute('data-state'),'grid');
   console.log('PASS',id,'live scene, original source, output-clock seek, playback and Return');
  }
  await page.setViewportSize({width:390,height:844});await page.goto(base+'?category=anime');
  await page.waitForFunction(()=>window.homeGalleryReady);
  assert.equal(await section.getAttribute('data-state'),'grid');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await section.screenshot({path:path.join(output,'grid-mobile.png')});
  await section.locator('.category-collapse').first().click();assert.equal(await section.getAttribute('data-state'),'overview');
  await section.screenshot({path:path.join(output,'overview-mobile.png')});
  await page.goto(base+'gallery.html#anime');assert.equal(await page.locator('#anime .fps-case-bubble').count(),4);
  assert.deepEqual(errors,[]);console.log('PASS Anime homepage, four cases, original bytes, desktop/mobile, standalone Gallery and no HTTP/script errors:',base);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
