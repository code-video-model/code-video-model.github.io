const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
const page=await b.newPage({viewport:{width:1340,height:950}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{window.longTasks=[];new PerformanceObserver(l=>window.longTasks.push(...l.getEntries().map(e=>Math.round(e.duration)))).observe({type:'longtask',buffered:true});});
await page.goto('http://127.0.0.1:8795/static/interactive/workbench.html?case=583&embed=bubbles');
await page.waitForFunction(()=>window.behindFrame,{timeout:90000});
console.log('REFINED',await page.evaluate(()=>({elapsed:Math.round(performance.now()),longTasks,canvases:document.querySelectorAll('canvas').length,sourceLines:document.querySelectorAll('.code-line').length})));
assert.equal(await page.locator('.code-line').count(),0);assert.equal(await page.locator('#world-stage canvas').count(),0);
await page.screenshot({path:'test-results/refined-workbench.png'});
await page.locator('.code-disclosure>summary').click();await page.waitForFunction(()=>document.querySelectorAll('.code-line').length>0);
await page.locator('.code-disclosure>summary').click();
// Reproduce the transient playback failure that formerly disposed the scene.
await page.evaluate(()=>{const v=document.querySelector('video');v.play=()=>Promise.reject(new DOMException('Interrupted by pause','AbortError'));});
await page.locator('#play').click();await page.waitForTimeout(100);
assert.equal(await page.evaluate(()=>window.behindFrame.getState().paused),true);
assert.equal(await page.locator('#play').isEnabled(),true);assert.equal(await page.locator('iframe.scene-host').count(),1);
await page.evaluate(()=>{delete document.querySelector('video').play;});
await page.locator('#play').click();await page.waitForFunction(()=>window.behindFrame.getState().videoTime>.1);await page.locator('#play').click();
await page.locator('.inspector-disclosure>summary').click();await page.waitForFunction(()=>window.behindFrame.getState().inspector,{timeout:90000});
assert.equal(await page.locator('#world-stage canvas').count(),1);await page.locator('.inspector-disclosure>summary').click();
await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/refined-workbench-mobile.png'});
assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
console.log('PASS lazy code, lazy inspector, interrupted play recovery, mobile layout');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
