const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const base=(process.env.DEMO_URL||'http://127.0.0.1:8795/').replace(/\/?$/,'/');
const site=path.resolve(__dirname,'../project-page-template');
const out=path.resolve(__dirname,'../test-results/seedance');fs.mkdirSync(out,{recursive:true});
const cases=[
 {id:'rally-hairpin',section:'long-horizon-style',duration:10,proxy:'de7604a279a0bc287a02a4cd69e14c60546feb6f9fcc3eab431d85f71deec6e8',output:'893f68a104465081ab2decf6cca1f9de8c87f63e3fa210a0144ddbd0acc84b93',source:'81083cf58802103f665e378c3ad1763f676f507a67834513934668b3eaf978a0'},
 {id:'cockatiel-flight',section:'control-world-states',duration:15,proxy:'ea34cd4f106b18f005467d1c157e44d4550242bbcd4702d4cf29f996e9277d98',output:'6b10b3c7a708bc2aa06aa8617689bbae7f723f51eaffcbd831abd08362ade18a',source:'867014e094355839738c4ba0293ac36fb286f44d0064ad94d3fa5123f16abcf8'},
 {id:'fishing-lake-strike',section:'control-world-states',duration:193/24,proxy:'9f8cadc45425e534bfa8f544ceb34508384ba48d219d7dcf34622067d0be492a',output:'fb5c8fdb1f3ce8014a47bf031ff0f83c90e3c276889b824d1a6d88700e66e332',source:'92d0630d0c111c76dc1e7b5eccd117505f4f8d0b0f80ba2e4ed491739a68a461'},
];
const records=JSON.parse(fs.readFileSync(path.join(site,'static/project-page-cases/prompts.json'))).items;
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
for(const c of cases){
 c.record=records.find(r=>r.case_id===c.id);
 c.meta=JSON.parse(fs.readFileSync(path.join(site,'static/interactive',c.id,'case.json')));
 assert.equal(hash(path.join(site,'static/project-page-cases',c.record.threejs_video)),c.proxy);
 assert.equal(hash(path.join(site,'static/project-page-cases',c.record.code_video_model)),c.output);
 assert.equal(c.meta.sources[0].sha256,c.source);
 assert.equal(c.meta.frames/c.meta.fps,c.duration);
 for(const s of c.meta.sources)assert.equal(hash(path.join(site,'static/interactive',c.id,s.path)),s.sha256);
}
assert.match(cases[1].meta.provenance.proxy_role,/Presentation recolor/);
assert.match(cases[2].meta.provenance.proxy_role,/Original generation input/);
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'chrome'})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),errors=[],media=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith(base)&&r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  page.on('request',r=>{if(r.url().includes('.mp4'))media.push(r.url());});
  await page.goto(base,{waitUntil:'networkidle'});await page.waitForFunction(()=>window.homeGalleryReady);
  assert.equal(await page.locator('.category-shell').count(),11);
  assert.equal(await page.locator('.category-shell .fps-case-bubble').count(),82);
  assert.equal(await page.locator('#anime .fps-case-bubble').count(),4);
  assert.equal(await page.locator('#product-cinematography .fps-case-bubble').count(),12);
  assert.equal(media.length,0,'No eager video downloads');
  for(const c of cases){
   const range=await page.request.get(base+'static/project-page-cases/'+c.record.code_video_model,{headers:{Range:'bytes=0-99'}});
   assert.equal(range.status(),206);assert.equal((await range.body()).length,100);
   assert.match(range.headers()['content-type'],/video\/mp4/);
   // Exercise both the real card click and direct-link restoration.
   await page.goto(base+'?category='+c.section);await page.waitForFunction(()=>window.homeGalleryReady);
   await page.locator(`#${c.section} .fps-case-bubble[data-case="${c.id}"]`).click();
   await page.waitForFunction(section=>document.querySelector(`#${section} iframe`)?.contentWindow.behindFrame,c.section,{timeout:120000});
   assert.equal(await page.locator(`#${c.section} iframe`).evaluate(n=>n.contentWindow.behindFrame.getState().caseId),c.id);
   await page.goto(base+'?case='+c.id);
   await page.waitForFunction(section=>document.querySelector(`#${section} iframe`)?.contentWindow.behindFrame,c.section,{timeout:120000});
   const frame=page.frames().find(f=>f.url().includes('/static/interactive/workbench.html'));
   const runtime=frame.childFrames()[0];
   for(const seconds of [2,6,c.duration-1]){
    const state=await frame.evaluate(async seconds=>{await window.behindFrame.seek(Math.round(seconds*24));return window.behindFrame.getState();},seconds);
    assert.equal(state.caseId,c.id);assert.ok(Math.abs(state.videoTime-seconds)<.06);
    assert.ok(Math.abs(state.world.time-seconds)<.06);
    const scene=await runtime.evaluate(()=>({errors:window.__bfErrors,canvas:!!window.__bfCapture?.renderer.domElement,diagnostics:window.reconstruction.diagnostics?.(),evidence:window.caseEvidence?.snapshot()}));
    assert.deepEqual(scene.errors,[]);assert.ok(scene.canvas);
    if(c.id==='rally-hairpin')assert.ok(Math.abs(scene.evidence.presentationTime-seconds)<.06);
    if(c.id==='fishing-lake-strike')assert.ok(Math.abs(scene.diagnostics.time-seconds)<.06);
    if(seconds===6){
     await frame.locator('#proxy-stage').screenshot({path:path.join(out,c.id+'-proxy.png')});
     await frame.locator('#result-video').screenshot({path:path.join(out,c.id+'-output.png')});
    }
   }
   await frame.evaluate(()=>window.behindFrame.seek(48));
   await frame.locator('#play').evaluate(n=>n.click());
   await frame.waitForFunction(()=>window.behindFrame.getState().videoTime>2.2);
   await frame.locator('#play').evaluate(n=>n.click());
   assert.ok(await frame.evaluate(()=>window.behindFrame.getState().paused));
   await frame.locator('.code-disclosure > summary').click();
   await frame.waitForFunction(()=>document.querySelectorAll('#source-code .code-line').length>0);
   assert.match(await frame.locator('#source-code').innerText(),/PerspectiveCamera/);
   assert.equal(await frame.locator('#source-code').getAttribute('data-source-path'),c.meta.sources[0].path);
   await page.locator(`#${c.section} .fps-back`).click();
   assert.equal(await page.locator('#'+c.section).getAttribute('data-state'),'grid');
   console.log('PASS',c.id,'card, deep link, live scene, full duration, seek, play/pause, original code, Range and Return');
  }
  await page.setViewportSize({width:390,height:844});
  await page.goto(base+'?category=control-world-states');await page.waitForFunction(()=>window.homeGalleryReady);
  await page.locator('#control-world-states .fps-case-bubble[data-case="cockatiel-flight"]').click();
  await page.waitForFunction(()=>document.querySelector('#control-world-states iframe')?.contentWindow.behindFrame,null,{timeout:120000});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(out,'mobile.png')});
  await page.locator('#control-world-states .fps-back').click();
  for(const category of ['control-world-states','long-horizon-style']){
   await page.goto(base+'?category='+category);await page.waitForFunction(()=>window.homeGalleryReady);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  }
  await page.goto(base+'gallery.html');
  for(const c of cases)assert.equal(await page.locator(`#${c.section} .fps-case-bubble[data-case="${c.id}"]`).count(),1);
  assert.deepEqual(errors,[]);
  console.log('PASS 82 cards, existing Anime/products retained, mobile viewport, standalone gallery, no HTTP/script errors:',base);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
