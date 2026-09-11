const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.goto('http://127.0.0.1:8795/?case=583&review=0');await p.waitForFunction(()=>document.querySelector('#gallery iframe')?.contentWindow.behindFrame,null,{timeout:120000});
let f=p.frames().find(f=>f.url().includes('workbench.html'));await f.locator('.comparison-handle').focus();await f.locator('.comparison-handle').press('End');
assert.equal(await f.evaluate(()=>window.behindFrame.getState().frame),0);
await p.route('**/663/case.json',r=>r.fulfill({status:503,body:'injected failure'}));
await p.locator('#gallery .fps-edit-toggle').click();await p.locator('#gallery .fps-retry').waitFor();
await p.unroute('**/663/case.json');await p.locator('#gallery .fps-retry').click();
await p.waitForFunction(()=>!document.querySelector('#gallery .fps-edit-toggle').disabled&&document.querySelector('#gallery iframe')?.contentWindow.behindFrame?.getState().caseId==='663',null,{timeout:120000});
assert.equal(await p.locator('#gallery .fps-edit-toggle').textContent(),'Restore original');
f=p.frames().find(f=>f.url().includes('workbench.html'));await f.locator('.comparison-handle').focus();await f.locator('.comparison-handle').press('End');
await p.locator('#gallery .fps-edit-toggle').click();await p.waitForFunction(()=>!document.querySelector('#gallery .fps-edit-toggle').disabled,null,{timeout:120000});
f=p.frames().find(f=>f.url().includes('workbench.html'));assert.equal(await f.locator('.comparison-handle').getAttribute('aria-valuenow'),'100');
await p.locator('#gallery .fps-back').click();assert.equal(await p.locator('iframe').count(),0);assert.deepEqual(errors,[]);
console.log('PASS failed edit retry, committed label, divider continuity, keyboard isolation, cleanup');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1;});
