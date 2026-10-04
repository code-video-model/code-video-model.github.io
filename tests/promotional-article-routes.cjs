const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const { chromium } = require('playwright');

(async () => {
  const root = process.env.SITE_ROOT || path.join(__dirname, '../project-page-template');
  let server;
  let browser;
  try {
    server = spawn(process.execPath, [path.join(__dirname, '../scripts/serve.cjs')], {
      env: { ...process.env, SITE_ROOT: root, PORT: '0' },
      stdio: ['ignore', 'pipe', 'inherit'],
    });
    const port = await new Promise((resolve, reject) => {
      server.stdout.on('data', data => {
        const match = String(data).match(/http:\/\/127\.0\.0\.1:(\d+)/);
        if (match) resolve(match[1]);
      });
      server.on('error', reject);
      server.on('exit', code => reject(new Error(`Article server exited: ${code}`)));
    });
    browser = await chromium.launch({
      headless: true,
      ...(process.env.BROWSER_CHANNEL ? { channel: process.env.BROWSER_CHANNEL } : {}),
    });

    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(`http://127.0.0.1:${port}/`) && response.status() >= 400) {
        errors.push(`${response.status()} ${response.url()}`);
      }
    });

    let response = await page.goto(`http://127.0.0.1:${port}/promotional_article.html`, {
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response.status(), 200);
    assert.equal(await page.title(), 'Code Video Model：以可执行场景表示驱动可控视频生成');
    assert.equal(await page.locator('link[rel="stylesheet"]').getAttribute('href'),
      'static/promotional-article/news.css?v=d072b8be1fd129cf');
    assert.equal(await page.locator('.brush-highlight,.article-placeholder,.article-footer').count(), 0);

    response = await page.goto(`http://127.0.0.1:${port}/promotional_article_new.html`, {
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response.status(), 200);
    assert.equal(await page.title(), '视频生成也能代码驱动了! Code Video Model 它来了!');
    assert.equal(await page.locator('link[rel="stylesheet"]').getAttribute('href'),
      'static/promotional-article/news_new.css?v=51e4f0a24d4797ab');
    assert.ok(await page.locator('.brush-highlight').count() > 0);
    assert.ok(await page.locator('.article-placeholder').count() > 0);
    assert.equal(await page.locator('.article-footer').count(), 1);
    const teamImage = page.locator('img[src*="code-video-model-team.png"]');
    await teamImage.waitFor({ state: 'visible' });
    assert.ok(await teamImage.evaluate(image => image.complete && image.naturalWidth > 0));
    assert.deepEqual(errors, []);
    console.log('PASS: original and new promotional article routes remain isolated and load successfully');
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
