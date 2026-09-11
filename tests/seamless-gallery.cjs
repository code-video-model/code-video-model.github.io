const {chromium}=require('playwright');const assert=require('node:assert/strict');const path=require('node:path');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8795/?review=0');await page.waitForFunction(()=>window.homeGalleryReady);
 const rows=await page.locator('.category-shell').evaluateAll(nodes=>nodes.map(n=>{
  const preview=n.querySelector('.application-preview'),a=n.querySelector('.comparison-frame'),b=n.querySelector('.application-copy'),title=n.querySelector('.application-copy h2'),mosaic=n.querySelector('.category-mosaic');
  const rect=e=>{const r=e.getBoundingClientRect();return {x:r.x,right:r.right,y:r.y,bottom:r.bottom};};
  return {a:rect(a),b:rect(b),title:rect(title),mosaic:rect(mosaic),panelBackground:getComputedStyle(n).backgroundImage,padding:getComputedStyle(n.querySelector('.category-overview')).padding,radius:getComputedStyle(preview).borderRadius,videoRadius:getComputedStyle(a).borderRadius,gap:getComputedStyle(preview).gap};
 }));
 for(const r of rows){assert.equal(r.panelBackground,'none');assert.equal(r.padding,'0px');assert.equal(r.gap,'0px');assert.equal(r.videoRadius,'0px');assert.notEqual(r.radius,'0px');assert.ok(Math.min(Math.abs(r.a.right-r.b.x),Math.abs(r.b.right-r.a.x))<1);assert.equal(r.a.y,r.b.y);assert.equal(r.a.bottom,r.b.bottom);assert.ok(r.title.y>=r.b.y&&r.title.bottom<=r.b.bottom);assert.deepEqual(r.b,r.mosaic);}
 assert.ok(await page.locator('main').evaluate(n=>getComputedStyle(n).getPropertyValue('--page-atmosphere-image').includes('data:image')));
 for(const card of await page.locator('.category-overview').all()){
  await card.scrollIntoViewIfNeeded();
  await card.locator('.mosaic-frames').evaluate(n=>Promise.all([...n.querySelectorAll('img')].map(img=>new Promise((resolve,reject)=>{
   const start=Date.now();const timer=setInterval(()=>{if(img.dataset.nativeReady==='true'&&img.naturalWidth>=960){clearInterval(timer);resolve();}else if(Date.now()-start>20000){clearInterval(timer);reject(new Error('Native image did not load'));}},50);
  }))));
 }
 await page.evaluate(()=>scrollTo(0,0));
 await page.screenshot({path:path.resolve(__dirname,'../test-results/seamless-home.png'),fullPage:true});
 await page.locator('.category-overview').first().screenshot({path:path.resolve(__dirname,'../test-results/seamless-row.png')});
 await page.locator('.category-mosaic').first().click({position:{x:20,y:20}});await page.waitForFunction(()=>window.homeGallery.getState().state==='grid');
 await page.locator('.category-shell[data-state="grid"] .category-collapse').first().click();await page.waitForFunction(()=>window.homeGallery.getState().state==='overview');
 await page.goto('http://127.0.0.1:8795/?review=1');await page.waitForFunction(()=>window.homeGalleryReady);assert.equal(await page.locator('.review-toolbar,.review-label').count(),0);
 await page.setViewportSize({width:390,height:844});await page.goto('http://127.0.0.1:8795/?review=0');await page.waitForFunction(()=>window.homeGalleryReady);
 const mobile=await page.locator('.category-overview').first().evaluate(n=>({video:n.querySelector('.comparison-frame').getBoundingClientRect().bottom,images:n.querySelector('.application-copy').getBoundingClientRect().top}));assert.ok(Math.abs(mobile.video-mobile.images)<1);
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await page.locator('.category-overview').first().screenshot({path:path.resolve(__dirname,'../test-results/seamless-mobile.png')});
 assert.deepEqual(errors,[]);console.log('PASS full-page atmosphere, seamless video/image joins, outer-only rounding, image-overlay titles, mobile stacking and existing open/close/review.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
