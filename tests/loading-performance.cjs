// Repeatable cold-load audit. External fonts are held for 1.5s to expose blocking.
const {chromium}=require('playwright');
const fs=require('node:fs');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try{
  const report=[];
  for(const mobile of [false,true]){
   const context=await browser.newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},isMobile:mobile,hasTouch:mobile});
   const page=await context.newPage(),cdp=await context.newCDPSession(page);
   await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   await cdp.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:1024*1024,uploadThroughput:1024*1024});
   await page.route('https://fonts.googleapis.com/**',async route=>{await new Promise(r=>setTimeout(r,1500));await route.fulfill({contentType:'text/css',body:''});});
   await page.addInitScript(()=>{
    window.audit={lcp:0,longTasks:[]};
    new PerformanceObserver(l=>{window.audit.lcp=l.getEntries().at(-1).startTime;}).observe({type:'largest-contentful-paint',buffered:true});
    new PerformanceObserver(l=>{window.audit.longTasks.push(...l.getEntries().map(e=>e.duration));}).observe({type:'longtask',buffered:true});
   });
   await page.goto('http://127.0.0.1:8795/',{waitUntil:'domcontentloaded',timeout:90000});
   await page.waitForFunction(()=>window.homeGalleryReady,null,{timeout:90000});
   await page.waitForLoadState('networkidle',{timeout:90000});
   report.push({mobile,...await page.evaluate(()=>{
    const resources=performance.getEntriesByType('resource'),local=resources.filter(r=>r.name.startsWith(location.origin));
    return {fcp:performance.getEntriesByName('first-contentful-paint')[0]?.startTime,lcp:window.audit.lcp,load:performance.getEntriesByType('navigation')[0].loadEventEnd,bytes:local.reduce((s,r)=>s+r.transferSize,0),requests:local.length,images:local.filter(r=>/\.(png|webp|jpg)(\?|$)/.test(r.name)).length,videos:local.filter(r=>r.name.includes('.mp4')).length,longTasks:window.audit.longTasks,resources:local.map(r=>({url:r.name,bytes:r.transferSize}))};
   })});
   await context.close();
  }
  const target=path.resolve(__dirname,`../test-results/loading-${process.argv[2]||'current'}.json`);
  fs.writeFileSync(target,JSON.stringify(report,null,2));
  console.log(JSON.stringify(report.map(({resources,...r})=>r),null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
