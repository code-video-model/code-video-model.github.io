const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}});const errors=[];let media=0;
  page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.url().startsWith('http://127.0.0.1:8795')&&r.status()>=400)errors.push(r.url());});
  page.on('request',r=>{if(r.url().includes('.mp4'))media++;});
  const base='http://127.0.0.1:8795/';
  await page.goto(base+'?review=1');await page.waitForFunction(()=>window.homeGalleryReady);
  assert.equal(await page.locator('.review-toolbar,.review-label').count(),0);
  assert.equal(await page.locator('.category-shell').count(),9);assert.equal(await page.locator('.category-mosaic').count(),9);
  assert.equal(await page.locator('.category-shell .fps-case-bubble').count(),62);
  const sectionOrder=await page.locator('.category-shell').evaluateAll(ns=>ns.map(n=>n.id));
  const expectedSectionOrder=['control-world-states','anime','long-horizon-style','gallery','robotics-simulation','architectural-cinematics','product-cinematography','physical-grounding','reconstruction-3d-4d'];
  assert.deepEqual(sectionOrder,expectedSectionOrder);
  const gallerySectionOrder=await page.evaluate(async()=>{
    const html=await (await fetch('gallery.html')).text();
    return [...new DOMParser().parseFromString(html,'text/html').querySelectorAll('.gallery-section')].map(n=>n.id);
  });
  assert.deepEqual(gallerySectionOrder,['control-world-states','anime','long-horizon-style','gallery','robotics-simulation','physical-grounding','product-cinematography','architectural-cinematics','reconstruction-3d-4d']);
  assert.equal(await page.locator('.application-preview').first().getAttribute('data-case'),'first-person-030');
  assert.equal(await page.locator('#robotics-simulation .application-preview').getAttribute('data-case'),'564');
  assert.equal(await page.locator('#robotics-simulation .fps-case-bubble').count(),6);
  assert.equal(await page.locator('#robotics-simulation .fps-case-bubble[data-case="567"]').count(),0);
  assert.equal(await page.locator('#robotics-simulation .fps-case-bubble[data-case="568"]').count(),0);
  assert.equal(await page.locator('#robotics-simulation .fps-case-bubble[data-case="581"]:not([data-selection])').count(),0);
  assert.deepEqual(await page.locator('#robotics-simulation .fps-case-bubble').evaluateAll(ns=>ns.map(n=>[n.dataset.case,n.dataset.selection||''])),[
    ['563',''],
    ['581','trajectory-group23-581-582-image-group23-4-v12'],
    ['564','robotics-group23-564-563-image-group23-2-v13'],
    ['564','robotics-group23-564-563-image-group23-4-v15'],
    ['571',''],
    ['577','trajectory-group23-577-578-image-group23-2-v16'],
  ]);
  assert.deepEqual(await page.locator('#reconstruction-3d-4d .fps-case-bubble').evaluateAll(ns=>ns.map(n=>n.dataset.case)),[
    'astra-bicycle','astra-garden-gray','442','astra-room-gray','astra-bonsai',
    'astra-cook-spinach','astra-kitchen','astra-train',
  ]);
  assert.deepEqual(await page.locator('#gallery .fps-case-bubble').evaluateAll(ns=>ns.map(n=>[n.dataset.case,n.dataset.selection||''])),[
    ['583',''],['586',''],['601',''],['590',''],
    ['601','gallery-v13-601-681-take2-seed44'],['591',''],
  ]);
  assert.deepEqual(await page.locator('#physical-grounding .fps-case-bubble').evaluateAll(ns=>ns.map(n=>n.dataset.case)),[
    'physical-isochronous','physical-pendulum','physical-induction','physical-prism',
    'black-hole-background-grade','stable-mass-transfer-binary',
    'rolling-inertia','newtons-cradle',
  ]);
  assert.equal(await page.locator('.demo-load').textContent(),'Watch');assert.equal(media,0);
  const colors=await page.locator('.category-shell').evaluateAll(ns=>ns.map(n=>getComputedStyle(n).getPropertyValue('--atmosphere-a')));assert.ok(new Set(colors).size>6);
  await page.goto(base+'?review=0');await page.waitForFunction(()=>window.homeGalleryReady);await page.waitForTimeout(600);
  await page.screenshot({path:path.resolve(__dirname,'../test-results/integrated-home.png'),fullPage:true});
  const first=page.locator('#control-world-states'),next=page.locator('#anime');
  const gapBefore=await next.evaluate(n=>n.offsetTop);
  await first.locator('.application-copy h2 a').click();
  await page.waitForFunction(()=>document.querySelector('#control-world-states').dataset.state==='grid');
  await page.waitForTimeout(700);
  assert.equal(new URL(page.url()).pathname,'/');assert.equal(await first.locator('.category-overview').isVisible(),false);
  assert.ok(await next.evaluate(n=>n.offsetTop)>gapBefore);
  await first.screenshot({path:path.resolve(__dirname,'../test-results/integrated-results.png')});
  await first.locator('.fps-case-bubble').first().click();
  await page.waitForFunction(()=>[...document.querySelectorAll('iframe')].some(f=>{try{return !!f.contentWindow.behindFrame;}catch{return false;}}),null,{timeout:90000});
  assert.equal(await first.getAttribute('data-state'),'detail');assert.equal(new URL(page.url()).pathname,'/');
  await first.locator('.fps-back').click();await page.waitForTimeout(650);
  assert.equal(await first.getAttribute('data-state'),'grid');assert.equal(await first.locator('iframe').count(),0);
  await first.locator('.category-collapse').first().click();await page.waitForTimeout(650);
  assert.equal(await first.getAttribute('data-state'),'overview');
  assert.ok(Math.abs(await next.evaluate(n=>n.offsetTop)-gapBefore)<3);
  await first.locator('.category-mosaic').click({position:{x:20,y:20}});await page.waitForTimeout(600);
  await next.locator('.application-copy h2 a').click();await page.waitForTimeout(700);
  assert.equal(await first.getAttribute('data-state'),'overview');assert.equal(await next.getAttribute('data-state'),'grid');
  assert.equal(await page.locator('.category-shell[data-state="grid"]').count(),1);
  await next.locator('.category-collapse').first().click();await page.waitForTimeout(650);
  await page.goto(base+'?review=1&category=trajectory-variation');await page.waitForFunction(()=>window.homeGalleryReady);
  assert.equal(await page.locator('#robotics-simulation').getAttribute('data-state'),'grid');
  assert.ok(await page.locator('#robotics-simulation .fps-case-bubble[data-case="577"]').count());
  for(const [caseId,category,selection] of [['601','gallery','gallery-v13-601-681-take2-seed44'],['newtons-cradle','physical-grounding','']]){
    await page.goto(base+'?category='+category+'&case='+caseId+(selection?'&selection='+selection:''));await page.waitForFunction(()=>window.homeGalleryReady);
    await page.waitForFunction(id=>[...document.querySelectorAll('iframe')].some(f=>{try{return f.contentWindow.behindFrame?.getState().caseId===id;}catch{return false;}}),caseId,{timeout:90000});
    const state=await page.evaluate(()=>[...document.querySelectorAll('iframe')].find(f=>f.contentWindow.behindFrame).contentWindow.behindFrame.getState());
    assert.equal(state.caseId,caseId);
    assert.equal(state.selectionId,selection);
    assert.equal(await page.locator('#'+category).getAttribute('data-state'),'detail');
  }
  await page.setViewportSize({width:390,height:844});await page.waitForTimeout(400);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.goto(base+'?review=0');await page.waitForFunction(()=>window.homeGalleryReady);await page.waitForTimeout(500);
  await page.screenshot({path:path.resolve(__dirname,'../test-results/integrated-mobile.png'),fullPage:true});
  await first.locator('.category-mosaic').click({position:{x:20,y:20}});await page.waitForTimeout(650);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await first.locator('.category-collapse').first().click();await page.waitForTimeout(600);
  assert.equal(await first.getAttribute('data-state'),'overview');
  assert.deepEqual(errors,[]);
  console.log('PASS: homepage highlights, Watch, category collages, shared result groups, inline expansion/pushdown, live detail/Return/overview, one open category, URL restoration, no review UI and mobile.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
