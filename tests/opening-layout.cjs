const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try{
  const page=await browser.newPage({reducedMotion:'reduce'}),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  for(const width of [1440,390,320]){
   await page.setViewportSize({width,height:1000});
   let media=0;const count=r=>{if(r.url().includes('.mp4'))media++;};page.on('request',count);
   await page.goto('http://127.0.0.1:8795/',{waitUntil:'domcontentloaded'});
   await page.waitForFunction(()=>window.homeGalleryReady);
   await page.locator('.intro-standalone-video').evaluate(async v=>{const image=new Image();image.src=v.poster;await image.decode();});
   assert.equal(await page.locator('h1').innerText(),'Code Video Model');
   assert.equal(await page.locator('.demo-heading').innerText(),'From Code to Video');
   assert.equal(await page.locator('.hero-credits .hero-affiliation,.hero-credits .authors').count(),2);
   assert.equal(await page.locator('.category-shell').count(),10);
   const layout=await page.evaluate(()=>{
    const v=document.querySelector('.intro-standalone-video'),button=document.querySelector('.demo-load');
    const vb=v.getBoundingClientRect(),bb=button.getBoundingClientRect();
    return {controls:v.controls,poster:v.poster,overflow:document.documentElement.scrollWidth>innerWidth,
     fits:bb.left>=vb.left&&bb.right<=vb.right&&bb.top>=vb.top&&bb.bottom<=vb.bottom};
   });
   assert.equal(layout.controls,false);assert.ok(layout.poster.endsWith('frame000030.webp'));
   assert.equal(await page.locator('.intro-standalone-video').getAttribute('data-src'),'static/demo/CodeVideoPromoV9Refined_720p.mp4');
   assert.equal(layout.overflow,false);assert.ok(layout.fits);assert.equal(media,0);
   await page.screenshot({path:`test-results/opening-${width}.png`});page.off('request',count);
  }
  await page.locator('.demo-load').click();
  await page.waitForFunction(()=>{const v=document.querySelector('.intro-standalone-video');return v.currentTime>.1&&v.controls&&!v.paused;},null,{timeout:65000});
  assert.equal(await page.locator('.demo-load').isVisible(),false);
  const metadata=await page.locator('.intro-standalone-video').evaluate(v=>({width:v.videoWidth,height:v.videoHeight,duration:v.duration}));
  assert.equal(metadata.width,1280);assert.equal(metadata.height,720);assert.ok(metadata.duration>137&&metadata.duration<139);
  await page.locator('.intro-standalone-video').evaluate(v=>v.dispatchEvent(new Event('demo:pause')));
  assert.equal(await page.locator('.intro-standalone-video').evaluate(v=>v.paused),true);
  assert.deepEqual(errors,[]);
  console.log('PASS compact opening at 1440/390/320, native cover, no eager video, Watch/playback controls/pause, Gallery preserved.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
