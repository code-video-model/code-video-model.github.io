const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');

(async () => {
  const server = spawn(process.execPath, [path.join(__dirname, '../scripts/serve.cjs')], {
    env: {...process.env, PORT: '18795'}, stdio: ['ignore', 'pipe', 'pipe'], windowsHide: true
  });
  let browser;
  try {
    await new Promise((resolve, reject) => {
      server.stdout.once('data', resolve);
      server.once('error', reject);
      server.once('exit', code => reject(new Error(`Server exited ${code}`)));
    });
    browser = await chromium.launch({headless: true, ...(process.env.BROWSER_CHANNEL ? {channel: process.env.BROWSER_CHANNEL} : {})});
    const page = await browser.newPage({viewport: {width: 1440, height: 1000}, reducedMotion: 'reduce'});
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('response', r => { if (r.url().startsWith('http://127.0.0.1:18795') && r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
    const base = 'http://127.0.0.1:18795/';
    await page.goto(base);
    assert.equal(await page.getByRole('contentinfo').innerText(), 'Code Video Model @ 2026');
    assert.equal(await page.getByRole('contentinfo').evaluate(node=>getComputedStyle(node).textAlign), 'center');
    assert.ok(await page.getByRole('contentinfo').evaluate(node=>{
      const style=getComputedStyle(node);
      return node.closest('main.has-page-atmosphere')!==null
        && style.backgroundColor==='rgba(0, 0, 0, 0)' && style.borderTopWidth==='0px';
    }));
    assert.equal(await page.locator('.demo-heading + .demo-summary').innerText(),
      "TL;DR: We turn prompts into code-driven video previews, then use early-step conditioning to generate videos that follow their structure and the reference image's appearance—without additional training.");
    assert.equal(await page.locator('.demo-summary + .intro-video').count(), 1);
    assert.equal(await page.getByRole('region', {name:'Abstract', exact:true}).count(), 1);
    assert.equal(await page.locator('.opening-atmosphere + .gallery-intro').count(), 1);
    assert.ok(await page.locator('.abstract-section').evaluate(node=>{
      const style=getComputedStyle(node);
      return node.parentElement===document.querySelector('.publication-hero').parentElement
        && style.backgroundColor==='rgba(0, 0, 0, 0)' && style.borderTopWidth==='0px'
        && document.querySelector('main').classList.contains('has-page-atmosphere');
    }));
    assert.equal(await page.locator('.abstract-section p').count(), 1);
    assert.ok((await page.locator('.abstract-section').innerText()).includes('85.2, 82.1, and 85.8'));
    await page.locator('.abstract-section').screenshot({path: path.join(__dirname, '../test-results/home-abstract-desktop.png')});
    assert.deepEqual(await page.locator('.publication-links a').allTextContents().then(labels=>labels.map(label=>label.trim())),
      ['Tech Report', 'Code', 'Hugging Face']);
    const teamToggle = page.getByRole('button', {name:'Code Video Model Team', exact:true});
    const teamMembers = page.locator('#team-members');
    const teamWebsites = ['https://zhiyangliang.github.io', 'https://zjwsite.github.io',
      'https://guochengqian.github.io', 'https://www.dongdongchen.bid', 'http://raywzy.com'];
    const teamTypography = () => teamToggle.evaluate(node=>({
      fontSize:getComputedStyle(node).fontSize,
      decoration:getComputedStyle(node).textDecorationLine,
      after:getComputedStyle(node,'::after').content
    }));
    const desktopTeamTypography = {fontSize:'16px',decoration:'none',after:'none'};
    assert.deepEqual(await teamTypography(),desktopTeamTypography);
    assert.equal(await teamToggle.getAttribute('aria-expanded'), 'false');
    assert.equal(await teamMembers.isVisible(), false);
    await teamToggle.hover();
    assert.deepEqual(await teamTypography(),desktopTeamTypography);
    await teamToggle.click();
    assert.deepEqual(await teamTypography(),desktopTeamTypography);
    assert.equal(await teamToggle.getAttribute('aria-expanded'), 'true');
    assert.ok(await teamMembers.isVisible());
    assert.deepEqual(await teamMembers.locator('a').evaluateAll(links=>links.map(link=>link.getAttribute('href'))),
      teamWebsites);
    await page.waitForFunction(()=>[...document.querySelectorAll('#team-members img')].every(image=>image.complete && image.naturalWidth>0));
    assert.ok(await teamMembers.locator('img').evaluateAll(images=>images.length===5 && images.every(image=>{
      const rect=image.getBoundingClientRect();
      return rect.width===rect.height && getComputedStyle(image).borderRadius==='50%';
    })));
    await page.screenshot({path: path.join(__dirname, '../test-results/home-team-desktop.png')});
    await teamToggle.focus();
    await page.keyboard.press('Space');
    assert.equal(await teamMembers.isVisible(), false);
    await page.keyboard.press('Enter');
    assert.ok(await teamMembers.isVisible());
    await teamToggle.click();
    const codeLink = page.getByRole('link', {name:'Code', exact:true});
    assert.equal(await codeLink.getAttribute('href'),'https://github.com/code-video-model/CodeVideoModel');
    assert.equal(await codeLink.locator('img').getAttribute('src'),'static/images/github.svg');
    assert.ok(await codeLink.locator('img').evaluate(image=>image.complete && image.naturalWidth > 0));
    const datasetLink = page.getByRole('link', {name:'Hugging Face', exact:true});
    assert.equal(await datasetLink.getAttribute('href'),'https://huggingface.co/datasets/code-video-model/CodeVideoBench');
    assert.ok(await datasetLink.locator('img').evaluate(image=>image.complete && image.naturalWidth > 0));
    assert.equal(await page.locator('.application-preview').count(), 9);
    assert.deepEqual(await page.locator('.application-preview').evaluateAll(nodes => nodes.map(n => n.dataset.case)),
      ['anime-hotel', '508', 'first-person-030', '583', '564', '643', '624', 'physical-isochronous', 'astra-train']);
    const urls = await page.locator('[src], [href], [poster], [data-src]').evaluateAll(nodes => nodes.flatMap(n => ['src','href','poster','data-src','data-src-a','data-src-b'].map(a => n.getAttribute(a))).filter(Boolean));
    for (const url of new Set(urls)) {
      if (/^(https?:|#|mailto:|data:)/.test(url)) continue;
      assert.ok((await page.request.head(new URL(url, base).href)).ok(), `Missing homepage asset: ${url}`);
    }
    await page.locator('.application-preview').first().scrollIntoViewIfNeeded();
    await page.locator('.comparison-frame').first().hover();
    await page.locator('.application-play').first().click();
    try {
      await page.waitForFunction(() => document.querySelector('.application-preview video').currentTime > 0.2, null, {timeout:65000});
    } catch(error) {
      console.log(await page.locator('.application-preview').first().evaluate(n=>({state:n.dataset.playback,status:n.querySelector('.application-status').textContent,button:n.querySelector('.application-play').textContent,videos:[...n.querySelectorAll('video')].map(v=>({ready:v.readyState,paused:v.paused,time:v.currentTime,error:v.error?.message}))})));
      throw error;
    }
    await page.goto(base + 'gallery.html');
    assert.ok(await page.locator('.fps-case-bubble').count() > 40);
    await page.goto(base + '?case=505');
    await page.waitForFunction(()=>window.homeGallery?.getState().state==='detail');
    await page.waitForTimeout(5000);
    await page.screenshot({path: path.join(__dirname, '../test-results/gallery.png')});
    assert.deepEqual(errors, []);
    await page.goto(base);
    await page.screenshot({path: path.join(__dirname, '../test-results/home.png'), fullPage: true});
    for (const width of [390,320]) {
      await page.setViewportSize({width,height:844});
      await teamToggle.click();
      assert.ok(await teamMembers.isVisible());
      assert.deepEqual(await teamTypography(),{fontSize:'14px',decoration:'none',after:'none'});
      assert.ok(await teamMembers.evaluate(node=>{
        const rect=node.getBoundingClientRect();
        return rect.left>=0 && rect.right<=innerWidth
          && [...node.querySelectorAll('img')].every(image=>{
            const bounds=image.getBoundingClientRect();
            return bounds.left>=0 && bounds.right<=innerWidth;
          });
      }));
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.screenshot({path: path.join(__dirname, `../test-results/home-team-${width}.png`)});
      await teamToggle.click();
      assert.equal(await teamMembers.isVisible(),false);
    }
    await page.setViewportSize({width:390,height:844});
    await page.locator('.demo-summary').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('.demo-summary').evaluate(node=>{
      const summary=node.getBoundingClientRect();
      const video=node.nextElementSibling.getBoundingClientRect();
      return summary.left>=0 && summary.right<=innerWidth && summary.bottom<=video.top;
    }));
    await page.screenshot({path: path.join(__dirname, '../test-results/home-summary-mobile.png')});
    await page.locator('#abstract-heading').evaluate(node=>node.scrollIntoView({block:'start'}));
    assert.ok(await page.locator('.abstract-section .container').evaluate(node=>{
      const rect=node.getBoundingClientRect();
      return rect.left>=0 && rect.right<=innerWidth;
    }));
    await page.screenshot({path: path.join(__dirname, '../test-results/home-abstract-mobile.png')});
    await page.getByRole('contentinfo').scrollIntoViewIfNeeded();
    assert.ok(await page.getByRole('contentinfo').isVisible());
    assert.ok(await page.getByRole('contentinfo').evaluate(node=>{
      const rect=node.getBoundingClientRect();
      return rect.left>=0 && rect.right<=innerWidth;
    }));
    await page.screenshot({path: path.join(__dirname, '../test-results/home-footer-mobile.png')});
    console.log('PASS: homepage assets, video playback, gallery and case deep link; no page errors or local HTTP errors.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
