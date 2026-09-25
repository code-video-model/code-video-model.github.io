const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  const errors=[];let media=0;page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().endsWith('.mp4'))media++;});
  await page.goto('http://127.0.0.1:8795/?review=0');
  const report=await page.evaluate(async()=>{
   const manifest=await fetch('static/images/first-frames-native/manifest.json').then(r=>r.json());
   const byVideo=new Map(manifest.map(r=>[r.video,r]));
   const mismatches=[];
   for(const v of document.querySelectorAll('video')){
    for(const [src,poster] of [['data-src','poster'],['data-src-a','data-poster-a'],['data-src-b','data-poster-b']]){
     const actual=v.getAttribute(poster)||(poster==='poster'?v.getAttribute('data-poster'):null);
     if(v.hasAttribute(src)&&actual!==byVideo.get(v.getAttribute(src))?.poster.replace(/\.png$/,'.webp'))mismatches.push(v.getAttribute(src));
    }
   }
   const sizes=await Promise.all(manifest.map(r=>new Promise((resolve,reject)=>{
    const image=new Image();image.onload=()=>resolve({video:r.video,expected:[r.width,r.height],actual:[image.naturalWidth,image.naturalHeight],frame:r.frame_index});image.onerror=reject;image.src=r.poster.replace(/\.png$/,'.webp');
   })));
   return {mismatches,sizes};
  });
  assert.deepEqual(report.mismatches,[]);assert.ok(report.sizes.length>=23);
  for(const row of report.sizes){assert.deepEqual(row.actual,row.expected);assert.ok(row.frame>=0);assert.ok(row.actual[0]>=960);}
  assert.equal(media,0,'Native posters must not eagerly download videos');
  await page.locator('.application-preview').first().screenshot({path:path.resolve(__dirname,'../test-results/native-poster-row.png')});
  await page.locator('.intro-video').screenshot({path:path.resolve(__dirname,'../test-results/native-demo-poster.png')});
  assert.deepEqual(errors,[]);
  console.log('PASS: full-resolution WebP delivery of selected native frames, correct default/A/B mapping and no eager video requests.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
