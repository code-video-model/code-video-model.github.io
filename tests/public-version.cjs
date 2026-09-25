const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const output = path.resolve(__dirname, '../test-results/public-version');
fs.mkdirSync(output, {recursive:true});
const base = process.env.DEMO_URL || 'http://127.0.0.1:8795/';
(async () => {
  const browser = await chromium.launch({channel: process.env.BROWSER_CHANNEL || 'chrome'});
  try {
    const page = await browser.newPage({viewport: {width:1440, height:1000}});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => {if(r.url().startsWith(base) && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);});
    await page.goto(base);
    await page.screenshot({path: path.join(output, process.env.REFERENCE_ONLY ? 'reference-home.png':'local-home.png'), fullPage:true});
    if (process.env.REFERENCE_ONLY) return;
    const mapping = await page.evaluate(() => fetch('static/images/application-previews/manifest.json').then(r=>r.json()));
    assert.equal(mapping.length,9);
    const cards = page.locator('.application-preview');
    for (let i=0;i<mapping.length;i++) {
      assert.equal(await cards.nth(i).getAttribute('data-case'), String(mapping[i].case_id));
      const link=new URL(await cards.nth(i).locator('h2 a').getAttribute('href'),base);
      assert.ok(link.pathname.endsWith('/gallery.html'));
      assert.equal(link.hash,`#${mapping[i].section_id}`);
      const selection=await cards.nth(i).getAttribute('data-selection');
      assert.equal(mapping[i].selection_id||'',selection||'','Preview manifest must match the selected source/video version');
      if(selection) assert.equal(link.searchParams.get('selection'),selection);
    }
    for (const index of (process.env.SCENES_ONLY ? [] : process.env.PREVIEW_INDEX ? [Number(process.env.PREVIEW_INDEX)] : mapping.map((row,i)=>row.edited?i:-1).filter(i=>i>=0))) {
      await page.goto(base);
      console.log('Checking edit/restore', index);
      const card=cards.nth(index);
      await card.scrollIntoViewIfNeeded();
      await card.locator('.application-variant-toggle').click();
      try {
        await page.waitForFunction(i=>{const n=document.querySelectorAll('.application-preview')[i];return n.dataset.variant==='b'&&n.getAttribute('aria-busy')==='false';},index,{timeout:65000});
      } catch(error) {
        console.log(await card.evaluate(n=>({variant:n.dataset.variant,status:n.querySelector('.application-status').textContent,busy:n.getAttribute('aria-busy'),videos:[...n.querySelectorAll('video')].map(v=>({source:v.dataset.src,ready:v.readyState,error:v.error?.message}))})));
        throw error;
      }
      await card.locator('.application-variant-toggle').click();
      try {
        await page.waitForFunction(i=>{const n=document.querySelectorAll('.application-preview')[i];return n.dataset.variant==='a'&&n.getAttribute('aria-busy')==='false';},index,{timeout:65000});
      } catch(error) {
        console.log(await card.evaluate(n=>({variant:n.dataset.variant,status:n.querySelector('.application-status').textContent,busy:n.getAttribute('aria-busy'),videos:[...n.querySelectorAll('video')].map(v=>({source:v.dataset.src,ready:v.readyState,error:v.error?.message}))})));
        throw error;
      }
      console.log('PASS edit/restore', index);
    }
    await page.setViewportSize({width:390,height:844});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.screenshot({path:path.join(output,'local-mobile.png'),fullPage:true});
    await page.setViewportSize({width:1440,height:1000});
    for (const id of (process.env.PREVIEW_INDEX || process.env.PREVIEWS_ONLY ? [] : ['442','astra-bicycle','black-hole-background-grade','564'])) {
      const selection=id==='564'?'&selection=robotics-group23-564-563-image-group23-2-v13':'';
      await page.goto(base+'gallery.html?case='+id+selection);
      await page.waitForFunction(() => [...document.querySelectorAll('iframe')].some(f => {
        try {return !!f.contentWindow.behindFrame;} catch {return false;}
      }),null,{timeout:90000});
      const state=await page.evaluate(()=>[...document.querySelectorAll('iframe')].find(f=>f.contentWindow.behindFrame).contentWindow.behindFrame.getState());
      assert.equal(state.caseId,id);
      await page.screenshot({path:path.join(output,`case-${id}.png`)});
      console.log('READY',id,state.threejsSHA);
    }
    assert.deepEqual(errors,[]);
    console.log('PASS: requested preview/scene checks, nine-card mapping, mobile width; no local HTTP or page errors.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
