const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
const p=await b.newPage({reducedMotion:'reduce'});let injected=0,blocked=true;
await p.route('**/static/interactive/**/case.json',route=>{if(blocked){injected++;return route.fulfill({status:503,body:'test outage'});}return route.continue();});
await p.goto('http://127.0.0.1:8795/?category=gallery&review=0');await p.waitForFunction(()=>window.homeGalleryReady);
const category=p.locator('#gallery');await category.locator('.fps-case-bubble[data-case="583"]').first().click();
await category.locator('.fps-retry').waitFor();assert.equal(injected,3);blocked=false;
await category.locator('.fps-retry').click();
await p.waitForFunction(()=>document.querySelector('#gallery iframe')?.contentDocument?.documentElement?.dataset.workbenchState==='ready',null,{timeout:90000,polling:100});
assert.equal(await category.locator('.fps-retry').isVisible(),false);
await category.locator('.fps-back').click();assert.equal(await category.locator('iframe').count(),0);
console.log('PASS real detail initialization HTTP failure, in-place retry, teardown');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
