const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{const {editPairs}=await import('../scripts/audit_edit_sources.mjs');const browser=await chromium.launch({channel:'chrome'});try{
 const page=await browser.newPage({viewport:{width:1000,height:800},reducedMotion:'reduce'});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:8795/?review=0');await page.waitForFunction(()=>window.homeGalleryReady);
 await page.evaluate(async()=>{
  window.makeDiff=(await import('./static/js/preview-edit-diff.js')).createPreviewEditDiff;
  const fixture=document.createElement('div');fixture.id='diff-test';fixture.style.cssText='position:fixed;inset:0;z-index:99999;background:#d7e5e7;padding:12px;box-sizing:border-box';
  const card=document.createElement('div');card.id='test-card';card.style.cssText='max-width:900px';card.innerHTML='<div class="comparison-frame"></div>';fixture.append(card);document.body.append(fixture);
  window.diffCanvases=[0,1].map(()=>{const c=document.createElement('canvas');c.width=1280;c.height=720;c.getContext('2d').fillRect(0,0,1280,720);return c;});
 });
 for(const width of (process.argv.includes('--mobile')?[360]:[1000,360])){
  await page.setViewportSize({width,height:800});
  for(const pair of editPairs){
   const check=await page.evaluate(async pair=>{
    const card=document.getElementById('test-card');const c=new AbortController();
    const caseLabels={[pair.a]:`${pair.title}_A`,[pair.b]:`${pair.title}_B`};
    const view=window.makeDiff(card,pair.a,pair.b,pair.selection,c.signal,false,{sources:window.diffCanvases,caseLabels});
    await view.freeze();await view.present();window.activeDiff=view;
    const code=card.querySelector('.preview-diff-code');
    const clipped=[...card.querySelectorAll('.diff-segment[data-mode="resolved"]')].filter(n=>n.getClientRects().length).flatMap(panel=>{
     const box=panel.getBoundingClientRect();return [...panel.querySelectorAll('.add,.remove')].filter(row=>{const r=row.getBoundingClientRect();return r.bottom>box.bottom+1||r.top<box.top-1;}).map(row=>row.dataset.sourceText);
    });
    return {mode:view.layer.dataset.diffMode,width:code.clientWidth,scrollWidth:code.scrollWidth,height:code.clientHeight,scrollHeight:code.scrollHeight,clipped,text:view.layer.innerText};
   },pair);
   assert.equal(check.mode,'semantic',pair.id);assert.ok(check.scrollWidth<=check.width+1,`${pair.id} width ${width}: ${JSON.stringify(check)}`);assert.ok(check.scrollHeight<=check.height+2,`${pair.id} height ${width}: ${JSON.stringify(check)}`);
   assert.deepEqual(check.clipped,[],pair.id+' state changes must not be clipped');
   for(const id of [pair.a,pair.b])assert.doesNotMatch(check.text,new RegExp(`\\b${id}\\b`),pair.id);
   if(['R014','R016','R017','R018','R031','R041','R042','R043','R087'].includes(pair.id))await page.locator('#test-card').screenshot({path:`test-results/semantic-${pair.id}-${width}.png`});
   await page.evaluate(()=>window.activeDiff.dispose());
  }
  console.log(`PASS all ${editPairs.length} rendered semantic snippets at width`,width);
 }
 assert.deepEqual(errors,[]);
}finally{await browser.close()}})().catch(e=>{console.error(e);process.exitCode=1;});
