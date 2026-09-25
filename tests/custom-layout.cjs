const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8795')&&r.status()>=400)errors.push(r.url());});
  const base='http://127.0.0.1:8795/';
  await page.goto(base);await page.waitForFunction(()=>window.homeGalleryReady);
  const sections=await page.locator('.category-shell').evaluateAll(ns=>ns.map(n=>n.id));
  assert.deepEqual(sections,['control-world-states','anime','long-horizon-style','gallery','robotics-simulation','architectural-cinematics','product-cinematography','physical-grounding','reconstruction-3d-4d']);
  const ids=await page.locator('.application-preview').evaluateAll(ns=>ns.map(n=>n.dataset.case));
  assert.equal(ids[0],'first-person-030');assert.equal(ids[1],'anime-hotel');assert.equal(ids[2],'508');assert.equal(ids[4],'564');assert.equal(ids[5],'643');assert.equal(ids.at(-1),'astra-train');
  const rows=await page.locator('.application-preview').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().top));
  assert.ok(rows.every((y,i)=>!i||y>rows[i-1]),'Each category occupies its own row');
  assert.equal(await page.locator('.hero-tagline').count(),0);
  assert.ok(await page.locator('.hero-affiliation img').evaluate(n=>n.complete&&n.naturalWidth>0));
  assert.equal(await page.getByText('First-Person Games',{exact:true}).count(),0);
  await page.goto(base+'?review=0');await page.screenshot({path:path.resolve(__dirname,'../test-results/custom-home.png'),fullPage:true});
  await page.goto(base+'gallery.html');await page.waitForFunction(()=>document.querySelector('.balanced-gallery'));
  assert.equal(await page.locator('.fps-case-bubble[data-case="434"]').count(),0);
  assert.equal(await page.locator('.fps-case-bubble[data-case="659"]').count(),0);
  assert.equal(await page.locator('.fps-case-bubble[data-case="93"]').count(),0);
  assert.equal(await page.locator('.fps-case-bubble[data-case="504"]').count(),0);
  for(const id of ['product-new15-01','product-new15-02','product-new15-05','product-new15-10','620','528','astra-truck','astra-fern-safe']){
   assert.equal(await page.locator(`.fps-case-bubble[data-case="${id}"]`).count(),0);
  }
  const architecture=page.locator('#architectural-cinematics .fps-bubble-grid');
  assert.equal(await architecture.getAttribute('data-rows'),'3+3');
  assert.equal(await architecture.locator('.fps-bubble-float').count(),6);
  for(const grid of await page.locator('.fps-bubble-grid').all()){
   const count=await grid.locator('.fps-bubble-float').count();
   if(count===6)assert.equal(await grid.getAttribute('data-rows'),'3+3');
  }
  await architecture.scrollIntoViewIfNeeded();
  const boxes=await architecture.locator('.fps-bubble-float').evaluateAll(ns=>ns.map(n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width};}));
  assert.equal(boxes[0].y,boxes[2].y);assert.equal(boxes[3].y,boxes[5].y);assert.ok(boxes[3].y>boxes[0].y);
  assert.ok(Math.abs((boxes[0].x+boxes[2].x+boxes[2].w)/2-(boxes[3].x+boxes[5].x+boxes[5].w)/2)<2);
  await page.locator('#architectural-cinematics').screenshot({path:path.resolve(__dirname,'../test-results/custom-architecture.png')});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(base+'?review=0');await page.screenshot({path:path.resolve(__dirname,'../test-results/custom-mobile.png'),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log('PASS curated R IDs, paired homepage rows, logo, Gaming, R055/R056 hidden, balanced 3+3 and mobile.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
