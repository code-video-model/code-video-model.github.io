const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const base=(process.env.DEMO_URL||'http://127.0.0.1:8795').replace(/\/$/,'');
const videoPattern='**/static/demo/Demo_CodeVideoModel_New.mp4';
const video='.intro-standalone-video';
const launch=process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'chrome'};
(async()=>{
 const browser=await chromium.launch(launch);
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[],requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>{if(r.url().includes('/static/demo/')&&r.url().includes('.mp4'))requests.push({type:r.resourceType(),range:r.headers().range});});
  await page.goto(base,{waitUntil:'networkidle'});
  assert.deepEqual(requests,[],'Do not request the demo before Watch');
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('Network.enable');
  await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
  const mediaIds=new Set();let transferred=0;
  cdp.on('Network.responseReceived',e=>{if(e.response.url.includes('/static/demo/'))mediaIds.add(e.requestId);});
  cdp.on('Network.dataReceived',e=>{if(mediaIds.has(e.requestId))transferred+=e.dataLength;});
  // 4 Mbps needs over two minutes for the whole file; playback must start earlier.
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:150,downloadThroughput:500000,uploadThroughput:125000});
  const start=Date.now();await page.locator('.demo-load').click();
  await page.waitForFunction(()=>{const v=document.querySelector('.intro-standalone-video');return v.currentTime>.2&&!v.paused&&v.controls;},null,{timeout:30000});
  const startupMs=Date.now()-start,bytesAtStart=transferred;
  assert.ok(bytesAtStart<83055056/4,'Playback must not wait for the complete video');
  assert.ok(requests.length>0&&requests.every(r=>r.type==='media'),'Use browser media requests instead of fetch/Blob');
  assert.ok(requests.some(r=>r.range),'Browser should issue Range requests');
  const state=await page.locator(video).evaluate(v=>({width:v.videoWidth,height:v.videoHeight,audio:v.webkitAudioDecodedByteCount,src:v.currentSrc}));
  assert.equal(state.width,1600);assert.equal(state.height,900);assert.ok(state.audio>0);assert.ok(!state.src.startsWith('blob:'));
  await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:0,downloadThroughput:-1,uploadThroughput:-1});
  await page.locator(video).evaluate(v=>{v.pause();v.currentTime=100;});
  await page.waitForFunction(()=>{const v=document.querySelector('.intro-standalone-video');return !v.seeking&&Math.abs(v.currentTime-100)<.2;});
  await page.locator(video).evaluate(v=>v.play());
  await page.waitForFunction(()=>document.querySelector('.intro-standalone-video').currentTime>100.2);
  await page.locator('#reconstruction-3d-4d .application-copy h2 a').click();
  assert.ok(await page.locator(video).evaluate(v=>v.paused),'Opening Gallery pauses Demo');
  await page.locator('#reconstruction-3d-4d .category-collapse').first().click();
  await page.locator(video).evaluate(v=>v.play());
  await page.waitForFunction(()=>!document.querySelector('.intro-standalone-video').paused);
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({base,slowNetworkMbps:4,startupMs,bytesAtStart,requests,seekAndResume:true}));
  await page.close();

  const recovery=await browser.newPage();await recovery.goto(base,{waitUntil:'networkidle'});
  let release,seen;const gate=new Promise(r=>release=r),requested=new Promise(r=>seen=r);
  await recovery.route(videoPattern,async route=>{seen();await gate;await route.continue().catch(()=>{});});
  await recovery.locator('.demo-load').click();await requested;
  const buttonBox=await recovery.locator('.demo-load').boundingBox(),statusBox=await recovery.locator('.demo-status').boundingBox();
  assert.ok(statusBox.y+statusBox.height<=buttonBox.y,'Loading message must not overlap Cancel');
  await recovery.locator('.demo-load').click(); // Cancel loading.
  assert.equal(await recovery.locator(video).getAttribute('src'),null);
  release();await recovery.unroute(videoPattern);
  await recovery.waitForTimeout(300);
  assert.ok(await recovery.locator(video).evaluate(v=>v.paused));
  assert.equal(await recovery.locator('.demo-load').innerText(),'Watch');

  await recovery.route(videoPattern,route=>route.fulfill({status:503,contentType:'text/plain',body:'Unavailable'}));
  await recovery.locator('.demo-load').click();
  await recovery.waitForFunction(()=>document.querySelector('.demo-load').textContent==='Retry demo');
  assert.ok(await recovery.locator('.demo-status').innerText());
  await recovery.unroute(videoPattern);
  await recovery.locator('.demo-load').click();
  await recovery.waitForFunction(()=>document.querySelector('.intro-standalone-video').currentTime>.2);

  // A late error during playback must also surface, and retry preserves position.
  await recovery.locator(video).evaluate(v=>{v.pause();v.currentTime=50;});
  await recovery.waitForFunction(()=>!document.querySelector('.intro-standalone-video').seeking);
  await recovery.locator(video).evaluate(v=>{Object.defineProperty(v,'error',{configurable:true,value:{code:2}});v.dispatchEvent(new Event('error'));delete v.error;});
  assert.equal(await recovery.locator('.demo-load').innerText(),'Retry demo');
  await recovery.locator('.demo-load').click();
  await recovery.waitForFunction(()=>{const v=document.querySelector('.intro-standalone-video');return v.currentTime>50&&!v.paused;});
  await recovery.close();

  const stalled=await browser.newPage();
  await stalled.addInitScript(()=>{const original=window.setTimeout;window.setTimeout=(fn,delay,...args)=>original(fn,delay===45000?250:delay,...args);});
  await stalled.goto(base,{waitUntil:'networkidle'});
  let unblock;const blocked=new Promise(r=>unblock=r);
  await stalled.route(videoPattern,async route=>{await blocked;await route.continue().catch(()=>{});});
  await stalled.locator('.demo-load').click();
  await stalled.waitForFunction(()=>document.querySelector('.demo-load').textContent==='Retry demo');
  assert.match(await stalled.locator('.demo-status').innerText(),/stopped responding/);
  assert.equal(await stalled.locator(video).getAttribute('src'),null);
  unblock();await stalled.close();
  console.log('PASS progressive startup, lazy media, audio, seeking, Gallery pause, cancellation, HTTP failure, stalled connection and retry at the saved position.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
