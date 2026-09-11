const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
const p=await b.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const errors=[];p.on('pageerror',e=>errors.push(e.message));
await p.addInitScript(()=>{window.badFirstPaints=[];function inspect(){const main=document.querySelector('.workbench');if(main&&getComputedStyle(main).visibility!=='hidden'&&Number(getComputedStyle(main).opacity)>0){
 const editing=new URLSearchParams(location.search).get('editing')==='1';
 if(document.documentElement.dataset.workbenchState!=='ready'||!document.body.dataset.embed||(editing&&!document.querySelector('.editing-comparison-panel'))||document.querySelector('header')?.getBoundingClientRect().height)window.badFirstPaints.push('legacy view visible');
 }if(document.documentElement.dataset.workbenchState!=='ready')requestAnimationFrame(inspect);}requestAnimationFrame(inspect);});
const base='http://127.0.0.1:8795/';
for(const [id,category,resource] of [['583','gallery','**/behind-frame.js?*'],['physical-induction','physical-grounding','**/liquid-glass.css?*']]){
 let release,seen;const gate=new Promise(r=>release=r),requested=new Promise(r=>seen=r);
 await p.route(resource,async route=>{seen();await gate;await route.continue().catch(()=>{});});
 try{
 await p.goto(base+'?case='+id+'&review=0',{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>window.homeGalleryReady);await requested;
 const scope=p.locator('#'+category);await scope.locator('.fps-opening-placeholder').waitFor();
 const iframe=scope.locator('iframe');assert.equal(await iframe.evaluate(n=>getComputedStyle(n).opacity),'0');
 assert.equal(await iframe.getAttribute('aria-hidden'),'true');
 await p.waitForTimeout(650);await scope.locator('.fps-frame-slot').screenshot({path:`test-results/boot-${id}.png`});
 release();await p.waitForFunction(c=>{const f=document.querySelector('#'+c+' iframe');return f&&!f.classList.contains('is-booting')&&f.contentDocument?.documentElement?.dataset.workbenchState==='ready';},category,{timeout:120000});
 const f=p.frames().find(f=>f.url().includes('workbench.html'));assert.deepEqual(await f.evaluate(()=>window.badFirstPaints),[]);
 assert.equal(await scope.locator('.fps-opening-placeholder').count(),0);
 assert.equal(await f.locator('.workbench').getAttribute('aria-hidden'),null);assert.equal(await f.locator('.workbench').evaluate(n=>n.inert),false);
 await scope.locator('.fps-frame-slot').screenshot({path:`test-results/ready-${id}.png`});
 await scope.locator('.fps-back').click();assert.equal(await scope.locator('iframe,.fps-opening-placeholder').count(),0);
 console.log('PASS delayed resource, no old paint, ready geometry/color',id,resource);
 }finally{release();await p.unroute(resource);}
}
// Required stylesheet failure must not reveal an unstyled/legacy workbench.
await p.route('**/editable-workbench.css?*',r=>r.fulfill({status:503,body:'test failure'}));
await p.goto(base+'?case=583&review=0',{waitUntil:'domcontentloaded'});await p.locator('#gallery .fps-retry').waitFor();
assert.equal(await p.locator('#gallery iframe,#gallery .fps-opening-placeholder').count(),0);
await p.unroute('**/editable-workbench.css?*');await p.locator('#gallery .fps-retry').click();
await p.waitForFunction(()=>!document.querySelector('#gallery iframe')?.classList.contains('is-booting')&&document.querySelector('#gallery iframe')?.contentDocument?.documentElement?.dataset.workbenchState==='ready',null,{timeout:120000});
assert.deepEqual(errors,[]);console.log('PASS stylesheet failure stays hidden, successful retry; no page errors');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1;});
