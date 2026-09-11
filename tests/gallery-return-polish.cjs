const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},deviceScaleFactor:2,reducedMotion:'no-preference'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8795/?review=0');await page.waitForFunction(()=>window.homeGalleryReady);
 assert.equal(await page.locator('.mosaic-hint,.category-result-count,.category-collapse-bottom').count(),0);
 for(const section of await page.locator('.category-shell').all())assert.equal(await section.locator('.category-collapse').count(),1);
 assert.deepEqual(await page.locator('.category-collapse').allTextContents(),Array(9).fill('← Back to overview'));
 assert.ok(await page.locator('.application-video-pair video').evaluateAll(ns=>ns.every(v=>getComputedStyle(v).objectFit==='cover')));
 assert.ok(await page.locator('.application-preview').evaluateAll(ns=>ns.every(v=>getComputedStyle(v).clipPath.includes('round'))));
 const category=page.locator('#reconstruction-3d-4d');await category.locator('h2 a').click();await page.waitForTimeout(650);
 const samples=await category.evaluate(async node=>{
  const content=node.querySelector('.category-content'),results=node.querySelector('.category-results'),overview=node.querySelector('.category-overview');
  const values=[];const read=()=>({height:content.getBoundingClientRect().height,out:results.hidden?null:Number(getComputedStyle(results).opacity),inside:overview.hidden?null:Number(getComputedStyle(overview).opacity),state:node.dataset.state});
  values.push(read());node.querySelector('.category-collapse').click();
  for(let i=0;i<10;i++){await new Promise(r=>setTimeout(r,80));values.push(read());}
  return values;
 });
 assert.ok(samples.some(v=>v.out>0&&v.out<1),'Outgoing results fade out');
 assert.ok(samples.some(v=>v.inside>0&&v.inside<1),'Overview fades back in');
 const first=samples[0].height,last=samples.at(-1).height;
 assert.ok(samples.some(v=>v.height>Math.min(first,last)+2&&v.height<Math.max(first,last)-2),'Return height has intermediate frames');
 assert.equal(samples.at(-1).state,'overview');
 console.log('Return samples:',JSON.stringify(samples));
 await page.locator('#gallery .category-overview').scrollIntoViewIfNeeded();
 await page.locator('#gallery .category-overview').screenshot({path:path.resolve(__dirname,'../test-results/corner-fill-2x.png')});
 await page.setViewportSize({width:390,height:844});await page.locator('#gallery .category-overview').screenshot({path:path.resolve(__dirname,'../test-results/corner-fill-mobile.png')});
 await page.emulateMedia({reducedMotion:'reduce'});
 await category.locator('h2 a').click();await category.locator('.category-collapse').click();assert.equal(await category.getAttribute('data-state'),'overview');
 assert.deepEqual(errors,[]);console.log('PASS count labels removed, one Back to overview action, cover fill/single clipping and animated/reduced-motion return.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
