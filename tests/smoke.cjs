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
    assert.equal(await page.locator('.demo-heading + .demo-summary').innerText(),
      "TL;DR: We turn prompts into code-driven video previews, then use early-step conditioning to generate videos that follow their structure and the reference image's appearance—without additional training.");
    assert.equal(await page.locator('.demo-summary + .intro-video').count(), 1);
    assert.deepEqual(await page.locator('.publication-links a').allTextContents().then(labels=>labels.map(label=>label.trim())),
      ['Paper', 'Code', 'Hugging Face']);
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
    await page.setViewportSize({width:390,height:844});
    await page.locator('.demo-summary').scrollIntoViewIfNeeded();
    assert.ok(await page.locator('.demo-summary').evaluate(node=>{
      const summary=node.getBoundingClientRect();
      const video=node.nextElementSibling.getBoundingClientRect();
      return summary.left>=0 && summary.right<=innerWidth && summary.bottom<=video.top;
    }));
    await page.screenshot({path: path.join(__dirname, '../test-results/home-summary-mobile.png')});
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
