const {chromium}=require('playwright');const assert=require('node:assert/strict');const fs=require('node:fs');
(async()=>{const browser=await chromium.launch({channel:'chrome'});const report={profiles:[],issues:[]};try{
for(const profile of [{width:360,height:800,caseId:'583',category:'gallery',edited:'663'}, {width:390,height:844,caseId:'physical-induction',category:'physical-grounding'}, {width:430,height:932,caseId:'132',category:'control-world-states'}]){
 const context=await browser.newContext({viewport:{width:profile.width,height:profile.height},deviceScaleFactor:2,isMobile:true,hasTouch:true});const page=await context.newPage();const cdp=await context.newCDPSession(page);const result={...profile,steps:[],errors:[]};report.profiles.push(result);page.on('pageerror',e=>result.errors.push(e.message));
 async function swipe(locator,vertical=false){
  await locator.scrollIntoViewIfNeeded();await page.waitForTimeout(650);const box=await locator.boundingBox();
  const before=await page.evaluate(()=>scrollY),nearBottom=await page.evaluate(()=>document.documentElement.scrollHeight-innerHeight-scrollY<150);
  const a={x:box.x+box.width*(vertical?.5:.2),y:box.y+box.height*.55};const b={x:box.x+box.width*(vertical?.5:.8),y:a.y+(vertical?(nearBottom?110:-110):0)};
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{...a,id:1}]});
  for(let i=1;i<=9;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:a.x+(b.x-a.x)*i/9,y:a.y+(b.y-a.y)*i/9,id:1}]});await page.waitForTimeout(18);}
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(180);
  return {scrollDelta:(await page.evaluate(()=>scrollY))-before};
 }
 async function noOverflow(){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));for(const f of page.frames().filter(f=>f.url().includes('workbench.html')))assert.ok(await f.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));}
 try{
 await page.goto('http://127.0.0.1:8795/?review=0');await page.waitForFunction(()=>window.homeGalleryReady);
 assert.ok(await page.evaluate(()=>navigator.maxTouchPoints>0&&matchMedia('(pointer:coarse)').matches));
 await page.screenshot({path:`test-results/mobile-${profile.width}-hero.png`});await noOverflow();
 const shell=page.locator('#'+profile.category),card=shell.locator('.application-preview'),frame=card.locator('.comparison-frame');
 await frame.scrollIntoViewIfNeeded();await frame.tap();await card.locator('.application-play').tap();
 await page.waitForFunction(id=>document.querySelector('#'+id+' video').currentTime>.1,profile.category,{timeout:70000,polling:100});
 await frame.tap();await card.locator('.application-play').tap();result.steps.push('tap to reveal controls, play/pause');
 await swipe(frame);assert.ok(Number(await card.locator('.comparison-handle').getAttribute('aria-valuenow'))>65);
 const reveal=await card.locator('.comparison-handle').getAttribute('aria-valuenow');
 const vertical=await swipe(frame,true);assert.equal(await card.locator('.comparison-handle').getAttribute('aria-valuenow'),reveal);assert.ok(Math.abs(vertical.scrollDelta)>5);result.steps.push('horizontal drag + vertical page scroll');
 if(profile.edited){
  await card.locator('.application-variant-toggle').tap();await card.locator('.preview-code-diff[data-stage="inserting"]').waitFor();
  await frame.screenshot({path:`test-results/mobile-${profile.width}-edit.png`});
  const fit=await card.locator('.preview-diff-code').evaluate(n=>({h:n.clientHeight,scroll:n.scrollHeight}));assert.ok(fit.scroll<=fit.h+2,'Mobile diff clipped: '+JSON.stringify(fit));
  await page.waitForFunction(id=>document.querySelector('#'+id+' .application-preview').dataset.variant==='b'&&document.querySelector('#'+id+' .application-preview').getAttribute('aria-busy')==='false',profile.category,{timeout:90000,polling:100});
  await card.locator('.application-variant-toggle').tap();await page.waitForFunction(id=>document.querySelector('#'+id+' .application-preview').dataset.variant==='a'&&document.querySelector('#'+id+' .application-preview').getAttribute('aria-busy')==='false',profile.category,{timeout:90000,polling:100});result.steps.push('highlight edit/restore');
 }
 await card.locator('h2 a').tap();await page.waitForTimeout(650);await noOverflow();await shell.screenshot({path:`test-results/mobile-${profile.width}-grid.png`});
 await shell.locator('.fps-case-bubble[data-case="'+profile.caseId+'"]').first().tap();
 await page.waitForFunction(id=>document.querySelector('#'+id+' iframe')?.contentDocument?.documentElement?.dataset.workbenchState==='ready',profile.category,{timeout:120000,polling:100});
 let f=page.frames().find(f=>f.url().includes('workbench.html'));await noOverflow();
 if(profile.edited){await swipe(f.locator('.comparison-frame'));assert.ok(Number(await f.locator('.comparison-handle').getAttribute('aria-valuenow'))>65);}
 await f.locator('#play').tap();await f.waitForFunction(()=>window.behindFrame.getState().videoTime>.1,null,{polling:100});await f.locator('#play').tap();
 await f.locator('#sound').tap();assert.equal(await f.locator('#result-video').evaluate(v=>v.muted),false);await f.locator('#sound').tap();
 await swipe(f.locator('#timeline'));await f.waitForFunction(()=>!window.behindFrame.getState().seeking&&document.getElementById('result-video').currentTime>document.getElementById('result-video').duration*.6,null,{polling:100});
 await f.locator('.code-disclosure>summary').tap();await f.waitForFunction(()=>document.querySelectorAll('.code-line').length>0,null,{polling:100});await noOverflow();await f.locator('.code-disclosure>summary').tap();result.steps.push('detail play, sound, touch seek, source disclosure');
 if(profile.edited){await shell.locator('.fps-edit-toggle').tap();await page.waitForFunction(id=>!document.querySelector('#'+id+' .fps-edit-toggle').disabled&&document.querySelector('#'+id+' iframe')?.contentWindow.behindFrame?.getState().caseId==='663',profile.category,{timeout:120000,polling:100});await shell.locator('.fps-edit-toggle').tap();await page.waitForFunction(id=>!document.querySelector('#'+id+' .fps-edit-toggle').disabled,profile.category,{timeout:120000,polling:100});result.steps.push('detail edit/restore');}
 await shell.locator('.fps-frame-slot').screenshot({path:`test-results/mobile-${profile.width}-detail.png`});
 await page.setViewportSize({width:profile.height,height:profile.width});await page.waitForTimeout(700);await noOverflow();await shell.locator('.fps-frame-slot').scrollIntoViewIfNeeded();await page.waitForTimeout(250);await page.screenshot({path:`test-results/mobile-${profile.width}-landscape.png`});result.steps.push('landscape rotation');
 await shell.locator('.fps-back').tap();assert.equal(await page.locator('iframe').count(),0);await shell.locator('.category-collapse').tap();await page.waitForTimeout(700);assert.equal(await shell.getAttribute('data-state'),'overview');
 await page.setViewportSize({width:profile.width,height:profile.height});await shell.locator('.category-mosaic').tap({position:{x:12,y:12}});await shell.locator('.fps-case-bubble').first().tap();await shell.locator('.fps-back').tap();assert.equal(await page.locator('iframe').count(),0);result.steps.push('Return, overview, cancel opening');
 assert.deepEqual(result.errors,[]);console.log('PASS TOUCH',profile.width,JSON.stringify(result.steps));
 }catch(error){result.failure=error.message;report.issues.push({width:profile.width,error:error.message});console.log('ISSUE TOUCH',profile.width,error.message);await page.screenshot({path:`test-results/mobile-${profile.width}-issue.png`}).catch(()=>{});}
 finally{await context.close();}
}
}finally{fs.writeFileSync('test-results/mobile-touch-audit.json',JSON.stringify(report,null,2));await browser.close();}
assert.deepEqual(report.issues,[]);
})().catch(e=>{console.error(e);process.exitCode=1;});
