const {chromium}=require('playwright');
const assert=require('node:assert/strict');

const expected={
  'control-world-states':'Gaming',
  anime:'Anime',
  'long-horizon-style':'Bullet_Time',
  gallery:'Scene_World_Editing',
  'architectural-cinematics':'Architectural_Cinematics',
  'product-cinematography':'Product_Cinematography',
  'physical-grounding':'Physical_Grounding',
  'robotics-simulation':'Robotics_Trajectory_Control',
  'reconstruction-3d-4d':'3D_4D_Reconstruction',
};

(async()=>{
  const launch=process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{channel:'chrome'};
  const browser=await chromium.launch({headless:true,...launch});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
    await page.goto('http://127.0.0.1:8795/');
    await page.waitForFunction(()=>window.homeGalleryReady);
    const names=[];
    for(const [section,prefix] of Object.entries(expected)){
      const sectionNames=await page.locator(`#${section} .fps-case-bubble`).evaluateAll(ns=>ns.map(n=>n.dataset.title));
      sectionNames.forEach((name,index)=>assert.equal(name,`${prefix}_${String(index+1).padStart(2,'0')}`));
      names.push(...sectionNames);
    }
    assert.equal(names.length,58);
    assert.equal(new Set(names).size,58);
    assert.deepEqual(await page.locator('#control-world-states .fps-case-bubble').evaluateAll(nodes=>nodes.map(node=>node.dataset.case)),
      ['first-person-009','first-person-007','first-person-014','first-person-030','121','132','cs2-active-duel','wyvern-siege-fpv']);
    assert.equal((await page.locator('#product-cinematography .fps-case-bubble').nth(2).getAttribute('data-title')),'Product_Cinematography_03');
    assert.deepEqual(await page.locator('#product-cinematography .fps-case-bubble').evaluateAll(ns=>ns.map(n=>n.dataset.case)),
      ['624','625','636','640','product-new15-07','product-new15-09','product-new15-06','product-new15-04']);
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
    assert.equal(await page.locator('#architectural-cinematics .application-preview').getAttribute('data-case'),'643');
    assert.equal(await page.locator('#physical-grounding .application-preview').getAttribute('data-case'),'physical-isochronous');

    await page.goto('http://127.0.0.1:8795/?category=product-cinematography&case=636');
    await page.waitForFunction(()=>window.homeGalleryReady);
    await page.waitForFunction(()=>document.querySelector('#product-cinematography iframe')?.contentWindow.behindFrame?.getState().displayName==='Product_Cinematography_03',null,{timeout:90000});
    const frame=page.frames().find(f=>f.url().includes('/static/interactive/workbench.html'));
    assert.equal(await frame.locator('#case-heading').textContent(),'CODE VIDEO MODEL / Product_Cinematography_03');
    assert.match(await frame.locator('#status').textContent(),/^Product_Cinematography_03 ·/);
    const options=await frame.locator('#case-picker option').allTextContents();
    assert(options.length>0);
    assert(options.every(value=>/^[A-Za-z0-9_]+_\d{2}$/.test(value)));
    assert(!options.some(value=>/\b(?:524|531|636)\b/.test(value)));
    assert.equal(options.filter(value=>value.startsWith('Gaming_')).length,8);
    console.log('PASS 58 position-based display names, Product order, and normalized workbench labels.');
  }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
