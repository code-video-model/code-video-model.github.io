const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'chrome'});const report={cases:[],issues:[],errors:[]};try{
const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
page.on('pageerror',e=>report.errors.push(e.message));
const base='http://127.0.0.1:8795/';await page.goto(base+'?review=0');await page.waitForFunction(()=>window.homeGalleryReady);
const categories=await page.locator('.category-shell').evaluateAll(ns=>ns.map(n=>({id:n.id,caseId:n.querySelector('.application-preview').dataset.case,selection:n.querySelector('.application-preview').dataset.selection||''})));
report.groups=await page.locator('.category-shell .fps-case-bubble').count();
const images=await page.locator('.category-shell img').evaluateAll(ns=>[...new Set(ns.map(n=>n.src))]);
for(let i=0;i<images.length;i+=4)await Promise.all(images.slice(i,i+4).map(async url=>{const r=await page.request.head(url);if(!r.ok())report.issues.push({image:url,status:r.status()});}));
for(const category of categories){
 const entry={...category,steps:[]};report.cases.push(entry);const section=page.locator('#'+category.id);
 try{
  await section.locator('.category-mosaic').click({position:{x:10,y:10}});entry.steps.push('category');
  const link=section.locator('.fps-case-bubble');
  const chosen=await section.locator('.fps-case-bubble').evaluateAll((ns,c)=>ns.findIndex(n=>n.dataset.case===c.caseId&&(n.dataset.selection||'')===c.selection),category);
  const target=link.nth(chosen<0?0:chosen);const caseId=await target.getAttribute('data-case'),caseB=await target.getAttribute('data-case-b');
  const started=Date.now();await target.click();
  await page.waitForFunction(c=>document.querySelector('#'+c+' iframe')?.contentDocument?.documentElement?.dataset.workbenchState==='ready',category.id,{timeout:120000,polling:100});
  entry.loadMs=Date.now()-started;entry.testedCase=caseId;entry.steps.push('detail');
  let f=page.frames().find(f=>f.url().includes('workbench.html'));
  assert.equal(await section.locator('.fps-back').textContent(),'← Return');
  if(caseB){const h=f.locator('.comparison-handle');await h.focus();await h.press('End');assert.equal(await h.getAttribute('aria-valuenow'),'100');await h.press('Home');await h.press('PageUp');entry.steps.push('comparison');}
  await f.locator('#play').click();await f.waitForFunction(()=>window.behindFrame.getState().videoTime>.12,null,{timeout:20000,polling:100});await f.locator('#play').click();
  await f.locator('#sound').click();assert.equal(await f.locator('#result-video').evaluate(n=>n.muted),false);await f.locator('#sound').click();
  await f.locator('#timeline').focus();await f.locator('#timeline').press('Home');await f.locator('#next').click();await f.waitForFunction(()=>!window.behindFrame.getState().seeking,null,{polling:100});entry.steps.push('play/sound/seek');
  await f.locator('.code-disclosure>summary').click();await f.waitForFunction(()=>document.querySelectorAll('.code-line').length>0,null,{timeout:30000,polling:100});
  const options=await f.locator('#source-file option').count();await f.locator('#source-file').selectOption(String(options-1));await f.locator('[data-section="actor"]').click();await f.locator('.code-disclosure>summary').click();entry.steps.push('code/files/tabs');
  if(['gallery','physical-grounding','control-world-states'].includes(category.id)){
   const camera=await f.evaluate(()=>window.behindFrame.getState().camera);
   await f.locator('.inspector-disclosure>summary').click();await f.waitForFunction(()=>window.behindFrame.getState().inspector,null,{timeout:90000,polling:100});
   const stage=await f.locator('#world-stage').boundingBox();await page.mouse.move(stage.x+10,stage.y+10); // local keyboard control avoids iframe coordinate ambiguity.
   await f.locator('#world-stage').focus();await f.locator('#world-stage').press('ArrowRight');await f.locator('#reset-view').click();
   assert.deepEqual(await f.evaluate(()=>window.behindFrame.getState().camera),camera);
   await f.locator('.inspector-disclosure>summary').click();entry.steps.push('3D/orbit/reset/camera invariant');
  }
  await section.locator('.fps-frame-slot').screenshot({path:`test-results/audit-${category.id}.png`});
  if(caseB){
   await section.locator('.fps-edit-toggle').click();await page.waitForFunction(({id,to})=>{const s=document.getElementById(id);return !s.querySelector('.fps-edit-toggle').disabled&&s.querySelector('iframe')?.contentWindow.behindFrame?.getState().caseId===to;},{id:category.id,to:caseB},{timeout:120000,polling:100});
   await section.locator('.fps-edit-toggle').click();await page.waitForFunction(({id,to})=>{const s=document.getElementById(id);return !s.querySelector('.fps-edit-toggle').disabled&&s.querySelector('iframe')?.contentWindow.behindFrame?.getState().caseId===to;},{id:category.id,to:caseId},{timeout:120000,polling:100});entry.steps.push('edit/restore');
  }
  await section.locator('.fps-back').click();assert.equal(await page.locator('iframe').count(),0);await section.locator('.category-collapse').click();assert.equal(await section.getAttribute('data-state'),'overview');entry.steps.push('return/overview');
  console.log('PASS',category.id,entry.loadMs+'ms',entry.steps.join(', '));
 }catch(error){entry.error=error.message;report.issues.push({category:category.id,error:error.message});console.log('ISSUE',category.id,error.message);await page.screenshot({path:`test-results/audit-error-${category.id}.png`}).catch(()=>{});await page.goto(base+'?review=0');await page.waitForFunction(()=>window.homeGalleryReady);}
}
await page.setViewportSize({width:390,height:844});await page.goto(base+'?review=0');await page.waitForFunction(()=>window.homeGalleryReady);
for(const id of ['physical-grounding','control-world-states']){const s=page.locator('#'+id);await s.locator('.category-mosaic').click({position:{x:10,y:10}});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await s.screenshot({path:`test-results/audit-mobile-${id}.png`});await s.locator('.fps-case-bubble').first().click();await s.locator('.fps-back').click();assert.equal(await page.locator('iframe').count(),0);await s.locator('.category-collapse').click();}
report.mobile='grid, immediate return during load, overview, no horizontal overflow';
console.log(JSON.stringify({cases:report.cases.length,groups:report.groups,issues:report.issues,errors:report.errors,mobile:report.mobile}));
}finally{fs.writeFileSync('test-results/exploratory-audit.json',JSON.stringify(report,null,2));await browser.close();}
assert.deepEqual(report.issues,[]);assert.deepEqual(report.errors,[]);
})().catch(e=>{console.error(e);process.exitCode=1;});
