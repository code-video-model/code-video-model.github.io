const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const browser=await chromium.launch({channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});const requests=[],errors=[];
 page.on('request',r=>{if(/review-mode|static\/review\//.test(r.url()))requests.push(r.url());});page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>localStorage.setItem('code-video-model-review','1'));
 const base='http://127.0.0.1:8795/';
 for(const route of ['?review=1','gallery.html?review=1','?category=physical-grounding&review=0']){
  await page.goto(base+route);await page.waitForFunction(()=>localStorage.getItem('code-video-model-review')===null);
  assert.equal(await page.locator('.review-toolbar,.review-label,[data-review-id],.review-copy-dialog').count(),0);
  assert.equal(new URL(page.url()).searchParams.has('review'),false);
 }
 assert.equal(await page.locator('.category-shell').count(),11);assert.equal(await page.locator('.category-shell .fps-case-bubble').count(),82);
 await page.goto(base+'?case=577&selection=trajectory-group23-577-578-image-group23-2-v16&review=1');
 await page.waitForFunction(()=>document.querySelector('#trajectory-variation iframe')?.contentDocument?.documentElement?.dataset.workbenchState==='ready',null,{timeout:120000,polling:100});
 assert.equal(new URL(page.url()).searchParams.get('case'),'577');assert.equal(new URL(page.url()).searchParams.has('review'),false);
 await page.locator('#trajectory-variation .fps-back').click();await page.locator('#trajectory-variation .category-collapse').click();assert.equal(await page.locator('iframe').count(),0);
 assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);
 for(const path of ['static/js/review-mode.js','static/css/review-mode.css','static/review/registry.json'])assert.equal((await page.request.get(base+path)).status(),404);
 console.log('PASS removed UI/assets/public registry, stale preference/link cleanup, 82 cases, deep links and return');
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1;});
