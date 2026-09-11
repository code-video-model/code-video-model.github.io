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
  const ids=await page.locator('.application-preview').evaluateAll(ns=>ns.map(n=>n.dataset.case));
  assert.equal(ids[0],'astra-train');assert.equal(ids[1],'508');assert.equal(ids[3],'577');assert.equal(ids[4],'656');assert.equal(ids[9],'132');
  const rows=await page.locator('.application-preview').evaluateAll(ns=>ns.map(n=>n.getBoundingClientRect().top));
  assert.ok(rows.every((y,i)=>!i||y>rows[i-1]),'Each category occupies its own row');
  assert.equal(await page.locator('.hero-tagline').count(),0);
  assert.ok(await page.locator('.hero-affiliation img').evaluate(n=>n.complete&&n.naturalWidth>0));
  assert.equal(await page.getByText('First-Person Games',{exact:true}).count(),0);
  await page.goto(base+'?review=0');await page.screenshot({path:path.resolve(__dirname,'../test-results/custom-home.png'),fullPage:true});
  await page.goto(base+'gallery.html');await page.waitForFunction(()=>document.querySelector('.balanced-gallery'));
  assert.equal(await page.locator('.fps-case-bubble[data-case="434"]').count(),0);
  const architecture=page.locator('#architectural-cinematics .fps-bubble-grid');
  assert.equal(await architecture.getAttribute('data-rows'),'4+3');
  assert.equal(await architecture.locator('.fps-bubble-float').count(),7);
  for(const grid of await page.locator('.fps-bubble-grid').all()){
   const count=await grid.locator('.fps-bubble-float').count();
   if(count===6)assert.equal(await grid.getAttribute('data-rows'),'3+3');
  }
  await architecture.scrollIntoViewIfNeeded();
  const boxes=await architecture.locator('.fps-bubble-float').evaluateAll(ns=>ns.map(n=>{const b=n.getBoundingClientRect();return {x:b.x,y:b.y,w:b.width};}));
  assert.equal(boxes[0].y,boxes[3].y);assert.equal(boxes[4].y,boxes[6].y);assert.ok(boxes[4].y>boxes[0].y);
  assert.ok(Math.abs((boxes[0].x+boxes[3].x+boxes[3].w)/2-(boxes[4].x+boxes[6].x+boxes[6].w)/2)<2);
  await page.locator('#architectural-cinematics').screenshot({path:path.resolve(__dirname,'../test-results/custom-architecture.png')});
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(200);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(base+'?review=0');await page.screenshot({path:path.resolve(__dirname,'../test-results/custom-mobile.png'),fullPage:true});
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(errors,[]);
  console.log('PASS curated R IDs, paired homepage rows, logo, Gaming, R056 hidden, centered 4+3, balanced 3+3 and mobile.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
