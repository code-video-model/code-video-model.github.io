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
    assert.equal(await page.locator('.application-preview').count(), 11);
    assert.deepEqual(await page.locator('.application-preview').evaluateAll(nodes => nodes.map(n => n.dataset.case)),
      ['astra-train', 'anime-hotel', '508', '583', '577', '656', '624', 'black-hole-background-grade', 'physical-induction', '564', '132']);
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
    for (const route of ['group23-pairs.html', 'seedvr-comparison.html']) {
      await page.goto(base + route);
      await page.waitForTimeout(1000);
    }
    assert.deepEqual(errors, []);
    await page.goto(base);
    await page.screenshot({path: path.join(__dirname, '../test-results/home.png'), fullPage: true});
    console.log('PASS: homepage assets, video playback, gallery, case deep link, comparison pages; no page errors or local HTTP errors.');
  } finally {
    if (browser) await browser.close();
    server.kill();
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
