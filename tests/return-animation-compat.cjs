const {chromium}=require('playwright');
const assert=require('node:assert/strict');

(async()=>{
 const browser=await chromium.launch({channel:'chrome'});
 try{
  for(const supportsGetAnimations of [true,false]){
   const page=await browser.newPage({viewport:{width:1600,height:1000}});
   const errors=[];page.on('pageerror',error=>errors.push(error.message));
   if(!supportsGetAnimations)await page.addInitScript(()=>{
    Object.defineProperty(Element.prototype,'getAnimations',{configurable:true,value:undefined});
   });
   await page.goto(process.env.DEMO_URL||'http://127.0.0.1:8795/');
   await page.waitForFunction(()=>window.homeGalleryReady===true);
   const section=page.locator('#gallery');
   await section.locator('.category-overview h2 a').click();
   await section.locator('.fps-case-bubble').nth(1).click();
   await section.locator('.fps-expanded:not([hidden])').waitFor();
   await page.waitForTimeout(300);
   await section.locator('.fps-back').click();
   assert.equal(await section.getAttribute('data-state'),'grid');
   assert.equal(await section.locator('.fps-bubble-grid').isVisible(),true);
   assert.equal(await section.locator('.fps-expanded').isVisible(),false);
   assert.deepEqual(await section.locator('.fps-case-bubble').evaluateAll(nodes=>nodes.map(node=>({
    opacity:getComputedStyle(node).opacity,
    current:node.getAttribute('aria-current'),
    expanded:node.getAttribute('aria-expanded'),
   }))),Array(6).fill(null).map(()=>({opacity:'1',current:null,expanded:'false'})));
   assert.deepEqual(errors,[]);
   await page.close();
  }
  console.log('PASS Return restores every result with and without Element.getAnimations.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
