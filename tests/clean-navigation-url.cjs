const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const b=await chromium.launch({channel:'chrome'});try{
 const p=await b.newPage({reducedMotion:'reduce'});const base='http://127.0.0.1:8795/';
 const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(base+'?review=0#reconstruction-3d-4d');await p.waitForFunction(()=>window.homeGalleryReady);
 assert.equal(new URL(p.url()).hash,'');
 const section=p.locator('#reconstruction-3d-4d');await section.locator('h2 a').click();
 assert.equal(new URL(p.url()).hash,'');assert.equal(new URL(p.url()).searchParams.get('category'),'reconstruction-3d-4d');
 await section.locator('.category-collapse').click();assert.equal(new URL(p.url()).search,'');assert.equal(new URL(p.url()).hash,'');
 await p.goto(base+'?case=577&selection=trajectory-group23-577-578-image-group23-2-v16#trajectory-variation');
 await p.waitForFunction(()=>document.querySelector('#robotics-simulation iframe')?.contentDocument?.documentElement?.dataset.workbenchState==='ready',null,{timeout:90000});
 assert.equal(new URL(p.url()).hash,'');assert.equal(new URL(p.url()).searchParams.get('case'),'577');
 await p.locator('#robotics-simulation .fps-back').click();assert.equal(new URL(p.url()).hash,'');
 await p.locator('#robotics-simulation .category-collapse').click();assert.equal(new URL(p.url()).search,'');
 await p.goto(base+'gallery.html#long-horizon-style');
 await p.waitForFunction(()=>!location.hash);
 await p.evaluate(()=>location.hash='reconstruction-3d-4d');await p.waitForFunction(()=>!location.hash);
 assert.deepEqual(errors,[]);console.log('PASS clean category URLs, legacy anchors, overview return, case/selection deep link and standalone Gallery.');
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
