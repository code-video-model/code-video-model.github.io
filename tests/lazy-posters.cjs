const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try{
  for(const mobile of [false,true]){
   const page=await browser.newPage({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile,reducedMotion:'reduce'});
   const errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>requests.push(r.url()));
   await page.goto('http://127.0.0.1:8795/');await page.waitForFunction(()=>window.homeGalleryReady);
   assert.equal(await page.locator('#control-world-states video[poster]').count(),0,'Bottom posters must not be eager');
   assert.equal(await page.locator('#control-world-states .mosaic-frames img[src]').count(),0);
   const cards=page.locator('.application-preview');
   for(let i=0;i<await cards.count();i++){
    await cards.nth(i).scrollIntoViewIfNeeded();
    await page.waitForFunction(index=>{
     const card=document.querySelectorAll('.application-preview')[index];
     return [...card.querySelectorAll('video')].every(v=>v.poster.endsWith('.webp'))&&[...card.querySelectorAll('.mosaic-frames img')].every(img=>img.dataset.nativeReady==='true'&&img.naturalWidth>=960);
    },i,{timeout:30000,polling:100});
    const widths=await cards.nth(i).evaluate(async card=>Promise.all([...card.querySelectorAll('video')].map(async v=>{const img=new Image();img.src=v.poster;await img.decode();return img.naturalWidth;})));
    assert.ok(widths.every(w=>w>=960));
   }
   assert.equal(requests.filter(url=>url.includes('.mp4')).length,0);
   assert.equal(requests.filter(url=>/first-frames-native\/.*\.png/.test(url)).length,0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert.deepEqual(errors,[]);
   await page.locator('.application-preview').first().scrollIntoViewIfNeeded();
   await page.screenshot({path:`test-results/loading-${mobile?'mobile':'desktop'}.png`});
   await page.close();
  }
  const response=await fetch('http://127.0.0.1:8795/static/js/home-gallery.js');
  const etag=response.headers.get('etag');assert.ok(etag);assert.equal(response.headers.get('content-encoding'),'gzip');await response.text();
  assert.equal((await fetch('http://127.0.0.1:8795/static/js/home-gallery.js',{headers:{'If-None-Match':etag}})).status,304);
  const range=await fetch('http://127.0.0.1:8795/static/demo/Demo_CodeVideoModel_New.mp4',{headers:{Range:'bytes=0-99'}});
  assert.equal(range.status,206);assert.equal((await range.arrayBuffer()).byteLength,100);
  console.log('PASS desktop/mobile lazy posters and mosaics, full-resolution frames, no eager MP4/PNG, gzip, cache revalidation and video ranges.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
