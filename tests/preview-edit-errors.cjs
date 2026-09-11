const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base='http://127.0.0.1:8795/';await page.goto(base+'?review=0');await page.waitForFunction(()=>window.homeGalleryReady);
 const item=await page.evaluate(()=>fetch('static/project-page-cases/prompts.json').then(r=>r.json()).then(d=>d.items.find(i=>String(i.case_id)==='663')));
 const url=new URL('static/interactive/'+item.interactive_source+'case.json',base).href;
 await page.route(url,r=>r.fulfill({status:503,body:'Test source unavailable'}));
 const card=page.locator('#gallery .application-preview'),toggle=card.locator('.application-variant-toggle');
 await toggle.click();await card.locator('.application-status').filter({hasText:'HTTP 503'}).waitFor();
 assert.equal(await card.getAttribute('data-variant'),'a');assert.equal(await toggle.isEnabled(),true);assert.equal(await card.locator('.preview-code-diff,.preview-edit-freeze').count(),0);
 assert.ok(await card.locator('video').evaluateAll(ns=>ns.every(v=>v.dataset.src===v.dataset.srcA)));
 await page.unroute(url);await toggle.click();
 try {await card.locator('.preview-code-diff[data-diff-ready="true"]').waitFor();}catch(error){console.log(await card.evaluate(n=>({phase:n.dataset.editPhase,variant:n.dataset.variant,status:n.querySelector('.application-status').textContent,busy:n.getAttribute('aria-busy'),button:n.querySelector('.application-variant-toggle').textContent,code:n.querySelector('.preview-code-diff')?.textContent,videos:[...n.querySelectorAll('video')].map(v=>({ready:v.readyState,src:v.dataset.src,error:v.error?.message}))})));throw error;}
 await page.evaluate(()=>window.dispatchEvent(new PageTransitionEvent('pagehide',{persisted:true})));
 await page.waitForTimeout(200);assert.equal(await card.getAttribute('data-variant'),'a');assert.equal(await toggle.isEnabled(),true);assert.equal(await card.locator('.preview-code-diff,.preview-edit-freeze').count(),0);
 await toggle.click();await page.waitForFunction(()=>{const n=document.querySelector('#gallery .application-preview');return n.dataset.variant==='b'&&n.getAttribute('aria-busy')==='false';},null,{timeout:65000});
 assert.equal(await toggle.textContent(),'Restore original');assert.deepEqual(errors,[]);
 console.log('PASS source failure rollback, enabled retry, pagehide cancellation, no stale overlays or state commit, successful retry.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
