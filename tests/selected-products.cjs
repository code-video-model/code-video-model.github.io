const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.DEMO_URL||'http://127.0.0.1:8795/';
const selected={
 'product-new15-01':42,'product-new15-02':45,'product-new15-04':42,'product-new15-05':42,
 'product-new15-06':45,'product-new15-07':42,'product-new15-09':43,'product-new15-10':44,
};
const site=path.resolve(__dirname,'../project-page-template');
const records=JSON.parse(fs.readFileSync(path.join(site,'static/project-page-cases/prompts.json'),'utf8')).items;
const output=path.resolve(__dirname,'../test-results/selected-products');
fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.BROWSER_CHANNEL?{channel:process.env.BROWSER_CHANNEL}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('response',response=>{if(response.url().startsWith(base)&&response.status()>=400)errors.push(`${response.status()} ${response.url()}`);});
  await page.goto(base+'?review=0&category=product-cinematography');
  await page.waitForFunction(()=>window.homeGalleryReady);
  const product=page.locator('#product-cinematography');
  assert.equal(await product.getAttribute('data-state'),'grid');
  const expected=['624','625','636','640',...Object.keys(selected)];
  assert.deepEqual(await product.locator('.fps-case-bubble').evaluateAll(nodes=>nodes.map(n=>n.dataset.case)),expected);
  await product.scrollIntoViewIfNeeded();
  await product.screenshot({path:path.join(output,'product-grid.png')});
  for(const [caseId,seed] of Object.entries(selected)){
   const record=records.find(item=>item.case_id===caseId);
   assert.equal(record.display_code_video_model_provenance.seed,seed);
   await page.goto(base+'?review=0&case='+caseId);
   await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].some(f=>{
    try{return !!f.contentWindow.behindFrame;}catch{return false;}
   }),null,{timeout:90000});
   const frame=page.frames().find(f=>f.url().includes('/static/interactive/workbench.html'));
   assert(frame,caseId);
   const state=await frame.evaluate(async()=>{
    await window.behindFrame.seek(48);
    return window.behindFrame.getState();
   });
   assert.equal(state.caseId,caseId);
   assert.equal(state.threejsSHA,record.threejs_sha256);
   assert.equal(state.frame,48);
   assert(Math.abs(state.videoTime-2)<.06);
   const digest=await frame.evaluate(async()=>{
    const video=document.getElementById('result-video');
    const buffer=await fetch(video.currentSrc).then(r=>r.arrayBuffer());
    return [...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(b=>b.toString(16).padStart(2,'0')).join('');
   });
   assert.equal(digest,record.display_code_video_model_sha256,`${caseId}: wrong result bytes`);
   await frame.locator('.code-disclosure > summary').click();
   await frame.waitForFunction(()=>document.querySelectorAll('#source-code .code-line').length>0);
   const source=await frame.locator('#source-code').innerText();
   assert(source.includes('PerspectiveCamera'),caseId);
   await frame.locator('.inspector-disclosure > summary').click();
   await frame.waitForFunction(()=>document.querySelector('#world-stage canvas')&&!document.getElementById('inspector-width').disabled);
   assert.equal(await frame.locator('#world-stage canvas').count(),1);
   if(caseId==='product-new15-01')await page.screenshot({path:path.join(output,'desk-lamp-detail.png'),fullPage:true});
   console.log(`PASS ${caseId} / seed ${seed}: exact result, source revision and live seek`);
  }
  await page.goto(base+'gallery.html#product-cinematography');
  assert.equal(await page.locator('#product-cinematography .fps-case-bubble').count(),12);
  await page.goto(base+'?review=0&category=product-cinematography');
  await page.waitForFunction(()=>window.homeGalleryReady);
  await page.setViewportSize({width:390,height:844});
  assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:path.join(output,'product-mobile.png'),fullPage:true});
  assert.deepEqual(errors,[]);
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
