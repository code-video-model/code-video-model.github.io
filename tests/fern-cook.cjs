const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const base=(process.env.DEMO_URL||'http://127.0.0.1:8795/').replace(/\/?$/,'/');
const site=path.resolve(__dirname,'../project-page-template');
const out=path.resolve(__dirname,'../test-results/fern-cook');fs.mkdirSync(out,{recursive:true});
const section='#reconstruction-3d-4d';
const cases=[
 {id:'astra-cook-spinach',proxy:'4e8b217375ad0a3efa39163f70b577207f1f461b2ce09e19d3b990cab240cfd5',output:'3184e6259cdbb486affd7bd2e546a181c158cd3f85ffc8819815040a0e231f6d',size:[960,540],frames:240},
];
const records=JSON.parse(fs.readFileSync(path.join(site,'static/project-page-cases/prompts.json'))).items;
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const c of cases){
 c.record=records.find(r=>r.case_id===c.id);assert.ok(c.record);
 c.meta=JSON.parse(fs.readFileSync(path.join(site,'static/interactive',c.record.interactive_source,'case.json')));
 assert.equal(c.meta.threejs_sha256,c.proxy);
 assert.equal(c.record.threejs_sha256,c.proxy);
 assert.equal(hash(path.join(site,'static/project-page-cases',c.record.display_code_video_model)),c.output);
 assert.equal(c.meta.frames,c.frames);
 for(const s of c.meta.sources)assert.equal(hash(path.join(site,'static/interactive',c.record.interactive_source,s.path)),s.sha256);
}
const hidden=['509','521','490','632','641','542','609','434','astra-fern-safe','astra-truck'];
for(const id of hidden)assert.equal(records.some(r=>r.case_id===id),false);
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'chrome'})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],media=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  page.on('request',r=>{if(r.url().includes('.mp4'))media.push(r.url());});
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.homeGalleryReady);
  assert.equal(await page.locator('.category-shell .fps-case-bubble').count(),58);
  assert.equal(await page.locator(section+' .fps-case-bubble').count(),8);
  assert.equal(await page.locator('#anime .fps-case-bubble').count(),4);
  for(const id of hidden)assert.equal(await page.locator(`.fps-case-bubble[data-case="${id}"]`).count(),0);
  assert.equal(media.length,0,'No eager video requests');
  for(const c of cases){
   const range=await page.request.get(base+'static/project-page-cases/'+c.record.display_code_video_model,{headers:{Range:'bytes=0-99'}});
   assert.equal(range.status(),206);assert.equal((await range.body()).length,100);
   await page.goto(base+'?category=reconstruction-3d-4d');await page.waitForFunction(()=>window.homeGalleryReady);
   await page.locator(`${section} .fps-case-bubble[data-case="${c.id}"]`).click();
   await page.waitForFunction(()=>document.querySelector('#reconstruction-3d-4d iframe')?.contentWindow.behindFrame,null,{timeout:120000});
   assert.equal(await page.locator(section+' iframe').evaluate(n=>n.contentWindow.behindFrame.getState().caseId),c.id);
   await page.goto(base+'?case='+c.id);
   await page.waitForFunction(()=>document.querySelector('#reconstruction-3d-4d iframe')?.contentWindow.behindFrame,null,{timeout:120000});
   const frame=page.frames().find(f=>f.url().includes('/static/interactive/workbench.html'));
   const runtime=frame.childFrames()[0];
   assert.deepEqual(await frame.locator('#result-video').evaluate(v=>[v.videoWidth,v.videoHeight]),c.size);
   const positions=[];
   for(const seconds of [1,5,9]){
    const state=await frame.evaluate(async s=>{await window.behindFrame.seek(s*24);return window.behindFrame.getState();},seconds);
    assert.ok(Math.abs(state.videoTime-seconds)<.06);positions.push(state.camera.position);
    if(seconds===1){
     await frame.locator('#proxy-stage').screenshot({path:path.join(out,c.id+'-proxy.png')});
     await frame.locator('#result-video').screenshot({path:path.join(out,c.id+'-output.png')});
    }
   }
   assert.notDeepEqual(positions[0],positions[1]);assert.notDeepEqual(positions[1],positions[2]);
   assert.deepEqual(await runtime.evaluate(()=>window.__bfErrors),[]);
   await frame.evaluate(()=>window.behindFrame.seek(48));
   await frame.locator('#play').evaluate(n=>n.click());await frame.waitForFunction(()=>window.behindFrame.getState().videoTime>2.2);
   await frame.locator('#play').evaluate(n=>n.click());assert.ok(await frame.evaluate(()=>window.behindFrame.getState().paused));
   await frame.locator('.code-disclosure > summary').click();
   await frame.waitForFunction(()=>document.querySelectorAll('#source-code .code-line').length>0);
   assert.match(await frame.locator('#source-code').innerText(),/PerspectiveCamera/);
   assert.equal(await frame.locator('#source-code').getAttribute('data-source-path'),c.meta.sources[0].path);
   await page.locator(section+' .fps-back').click();assert.equal(await page.locator(section).getAttribute('data-state'),'grid');
   console.log('PASS',c.id,'exact media/source, card, deep link, live camera, seek, play/pause, View Code, Return, Range');
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'?category=reconstruction-3d-4d');
  await page.waitForFunction(()=>window.homeGalleryReady);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,'mobile.png')});
  assert.equal(await page.locator(section).getAttribute('data-state'),'grid');
  await page.locator(section).screenshot({path:path.join(out,'grid-mobile.png')});
  await page.goto(base+'gallery.html');
  for(const c of cases)assert.equal(await page.locator(`${section} .fps-case-bubble[data-case="${c.id}"]`).count(),1);
  assert.deepEqual(errors,[]);console.log('PASS 58 cards; unused Fern/Truck entries excluded; desktop/mobile and no HTTP/script errors:',base);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
