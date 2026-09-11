const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
const p=await b.newPage({viewport:{width:1440,height:1000}});const errors=[];p.on('pageerror',e=>errors.push(e.message));
const base='http://127.0.0.1:8795/';
const {loadLocalSource}=await import('../scripts/audit_edit_sources.mjs');
async function checkCode(id,selection,alreadyOpen=false){
 const workbench=p.frames().find(f=>f.url().includes('workbench.html'));
 if(!alreadyOpen)await workbench.locator('.code-disclosure>summary').click();
 assert.equal(await workbench.locator('.code-disclosure').getAttribute('open'),'');
 await workbench.waitForFunction(()=>document.querySelectorAll('.code-line').length>0);
 const source=loadLocalSource(id,selection),expected=source.files.find(f=>f.generatedAdapter)||source.files[0];
 assert.equal(await workbench.locator('#source-code').getAttribute('data-case-id'),id);
 assert.equal(await workbench.locator('#source-code').getAttribute('data-source-path'),expected.path);
 const text=await workbench.locator('#source-code').evaluate(n=>[...n.children].map(line=>{const clone=line.cloneNode(true);clone.querySelector('.line-number').remove();return clone.textContent;}).join('\n'));
 assert.equal(text,expected.text);
 if(source.variant)assert.ok((await workbench.locator('#code-note').textContent()).includes(`Active variant ${source.variant}`));
}
for(const [id,target,category,selection] of [['583','663','gallery',''],['577','578','trajectory-variation','trajectory-group23-577-578-image-group23-2-v16'],['564','563','robotics-simulation','robotics-group23-564-563-image-group23-2-v13'],['586','666','gallery','']]){
 await p.goto(base+'?case='+id+'&selection='+selection+'&review=0');await p.waitForFunction(()=>window.homeGalleryReady);
 const section=p.locator('#'+category),toggle=section.locator('.fps-edit-toggle');
 await p.waitForFunction(c=>document.querySelector('#'+c+' iframe')?.contentWindow.behindFrame,category,{timeout:120000});
 await p.waitForFunction(c=>!document.querySelector('#'+c+' .fps-edit-toggle').disabled,category);
 const f=p.frames().find(f=>f.url().includes('workbench.html'));
 assert.equal(await f.locator('.editing-comparison-panel').count(),1);
 const handle=f.locator('.comparison-handle');await handle.focus();await handle.press('End');assert.equal(await handle.getAttribute('aria-valuenow'),'100');await handle.press('Home');await handle.press('PageUp');
 if(id==='583')await section.locator('.fps-frame-slot').screenshot({path:'test-results/detail-edit-overview.png'});
 assert.equal(await section.locator('.fps-variant-controls button').count(),1);assert.equal(await toggle.getAttribute('aria-pressed'),'false');
 await checkCode(id,selection);
 const label=await toggle.textContent();await toggle.click();
 await section.locator('.preview-code-diff[data-diff-ready="true"]').waitFor();
 assert.equal(await toggle.isDisabled(),true);assert.equal(await section.locator('.fps-transition-panels').count(),0);
 const forward=await section.locator('.preview-code-diff').evaluate(n=>({add:[...n.querySelectorAll('.add')].map(r=>r.dataset.sourceText),remove:[...n.querySelectorAll('.remove')].map(r=>r.dataset.sourceText)}));
 if(id==='583')await section.locator('.fps-frame-slot').screenshot({path:'test-results/detail-edit-forward.png'});
 await p.waitForFunction(({category,target})=>{const s=document.getElementById(category);return !s.querySelector('.fps-edit-toggle').disabled&&s.querySelector('iframe')?.contentWindow.behindFrame?.getState().caseId===target;},{category,target},{timeout:120000});
 assert.equal(await toggle.textContent(),'Restore original');assert.equal(await section.locator('.fps-edit-transition').count(),0);
 await checkCode(target,selection,true);
 await toggle.click();await section.locator('.preview-code-diff[data-diff-ready="true"]').waitFor();
 if(id==='583'){
  const reverse=await section.locator('.preview-code-diff').evaluate(n=>({add:[...n.querySelectorAll('.add')].map(r=>r.dataset.sourceText),remove:[...n.querySelectorAll('.remove')].map(r=>r.dataset.sourceText)}));
  assert.deepEqual(reverse.add,forward.remove);assert.deepEqual(reverse.remove,forward.add);
 }
 await p.waitForFunction(c=>!document.querySelector('#'+c+' .fps-edit-toggle').disabled,category,{timeout:120000});
 await checkCode(id,selection,true);
 assert.equal(await toggle.textContent(),label);console.log('PASS one toggle, compact forward/reverse transition',id,target);
}
const section=p.locator('#gallery');
await p.route('**/666/case.json',r=>r.fulfill({status:503,body:'test failure'}));
await section.locator('.fps-edit-toggle').click();await section.locator('.fps-retry').waitFor();
await p.unroute('**/666/case.json');await section.locator('.fps-retry').click();
await p.waitForFunction(()=>!document.querySelector('#gallery .fps-edit-toggle').disabled&&document.querySelector('#gallery iframe')?.contentWindow.behindFrame?.getState().caseId==='666',null,{timeout:120000});
assert.equal(await section.locator('.fps-edit-toggle').textContent(),'Restore original');console.log('PASS failed edit retry commits the correct variant');
await p.setViewportSize({width:390,height:844});
await section.locator('.fps-edit-toggle').click();await section.locator('.preview-code-diff').waitFor();
await section.locator('.fps-frame-slot').screenshot({path:'test-results/detail-edit-mobile.png'});
await section.locator('.fps-back').click();assert.equal(await section.locator('iframe,.fps-edit-transition').count(),0,JSON.stringify({errors,nodes:await section.locator('iframe,.fps-edit-transition').evaluateAll(ns=>ns.map(n=>n.outerHTML.slice(0,200)))}));
assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);
console.log('PASS mobile, cancellation, no page errors');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1;});
