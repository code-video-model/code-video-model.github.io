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

    let response = await page.goto(`http://127.0.0.1:${port}/code_video_model_blog.html`, {
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response.status(), 200);
    assert.equal(await page.title(), '视频生成也能代码驱动了! Code Video Model 它来了!');
    assert.equal(await page.locator('link[rel="stylesheet"]').getAttribute('href'),
      'static/code-video-model-blog/news.css?v=88dc03e1cdfbdf75');
    assert.ok(await page.locator('.brush-highlight').count() > 0);
    assert.ok(await page.locator('.article-placeholder').count() > 0);
    assert.equal(await page.locator('.article-footer').count(), 1);
    assert.ok((await page.locator('script[src]').evaluateAll(scripts =>
      scripts.every(script => script.getAttribute('src').startsWith('static/code-video-model-blog/')))));
    assert.equal(await page.locator('#demo').getAttribute('src'),
      'static/code-video-model-blog/demo/Demo_CodeVideoModel_New.mp4?v=7801287252794806');
    const blogArticle = await page.locator('#article').innerHTML();

    response = await page.goto(`http://127.0.0.1:${port}/promotional_article.html`);
    assert.equal(response.status(), 200);
    await page.waitForURL(`http://127.0.0.1:${port}/code_video_model_blog.html`);
    assert.equal(await page.title(), '视频生成也能代码驱动了! Code Video Model 它来了!');

    response = await page.goto(`http://127.0.0.1:${port}/promotional_article_new.html`, {
      waitUntil: 'domcontentloaded',
    });
    assert.equal(response.status(), 200);
    assert.equal(await page.title(), '视频生成也能代码驱动了! Code Video Model 它来了!');
    assert.equal(await page.locator('link[rel="stylesheet"]').getAttribute('href'),
      'static/promotional-article/news_new.css?v=837aea9f99fe7543');
    assert.ok((await page.locator('script[src]').evaluateAll(scripts =>
      scripts.every(script => script.getAttribute('src').startsWith('static/promotional-article/')))));
    assert.equal(await page.locator('#demo').getAttribute('src'),
      'static/demo/Demo_CodeVideoModel_New.mp4?v=f3259741b723aa48');
    const newArticle = await page.locator('#article').innerHTML();
    assert.ok(!blogArticle.includes('figure-one-video-grid'));
    assert.ok(newArticle.includes('figure-one-video-grid'));
    assert.equal(await page.locator('.figure-one-video-grid .application-card').count(), 3);
    assert.deepEqual(await page.locator('.figure-one-video-grid video').evaluateAll(videos =>
      videos.map(video => video.getAttribute('src'))), [
      'static/promotional-article/figure-01/row1-threejs.mp4?v=cfd7f8a0c8bbd056',
      'static/promotional-article/figure-01/row1-generated.mp4?v=54595ff6ac15fa6a',
      'static/promotional-article/figure-01/row2-threejs.mp4?v=574b265f28a42dca',
      'static/promotional-article/figure-01/row2-generated.mp4?v=31a478d7cbcd2966',
      'static/promotional-article/figure-01/row3-threejs.mp4?v=14610905e9be25e6',
      'static/promotional-article/figure-01/row3-generated.mp4?v=4c0bc875cd2b7de5',
    ]);
    assert.equal(await page.locator('.figure-two-case').count(), 2);
    assert.deepEqual(await page.locator('.figure-two-headers > div').allTextContents(), [
      'Program (edited lines)', 'Proxy Video', 'Code Video Model',
    ]);
    assert.ok(await page.locator('.figure-two-case').first().evaluate(row => {
      const boxes = [...row.children].map(element => element.getBoundingClientRect());
      return Math.max(...boxes.map(box => box.width)) - Math.min(...boxes.map(box => box.width)) < 1
        && Math.max(...boxes.map(box => box.height)) - Math.min(...boxes.map(box => box.height)) < 1;
    }));
    assert.deepEqual(await page.locator('.figure-two-gif img').evaluateAll(images =>
      images.map(image => image.getAttribute('src'))), [
      'static/promotional-article/figure-02/row1-threejs.gif?v=86af6e25a46dec35',
      'static/promotional-article/figure-02/row1-generated.gif?v=6ac21841f2a639ed',
      'static/promotional-article/figure-02/row2-threejs.gif?v=9b4076461358ab83',
      'static/promotional-article/figure-02/row2-generated.gif?v=c123764de17b3d10',
    ]);
    assert.ok(!newArticle.includes('w/o Early Step'));
    assert.ok(!newArticle.includes('figure-02-program-control.png'));
    assert.equal(await page.locator('.figure-three-case').count(), 2);
    assert.deepEqual(await page.locator('.figure-three-case h3').allTextContents(), [
      "Newton's Cradle", 'Spring Recoil',
    ]);
    assert.deepEqual(await page.locator('.figure-three-sync-gif').evaluateAll(panels =>
      panels.map(panel => panel.style.getPropertyValue('--figure-three-sync'))), [
      "url('figure-03/cradle-sync.gif?v=b6a16684724e9bd6')",
      "url('figure-03/cradle-sync.gif?v=b6a16684724e9bd6')",
      "url('figure-03/cradle-sync.gif?v=b6a16684724e9bd6')",
      "url('figure-03/spring-sync.gif?v=9d36b530f564b5ac')",
      "url('figure-03/spring-sync.gif?v=9d36b530f564b5ac')",
      "url('figure-03/spring-sync.gif?v=9d36b530f564b5ac')",
    ]);
    assert.ok(!newArticle.includes('figure-08-physics.png'));
    assert.equal(await page.locator('.ablation-video-panel').count(), 2);
    assert.deepEqual(await page.locator('.ablation-video-panel video').evaluateAll(videos =>
      videos.map(video => video.getAttribute('src'))), [
      'static/promotional-article/r2v-ablation/row2-proxy.mp4?v=6d4990f6cba4131a',
      'static/promotional-article/r2v-ablation/row2-direct-r2v.mp4?v=972b1de699407340',
      'static/promotional-article/r2v-ablation/row1-proxy.mp4?v=a1d128ed64f19e89',
      'static/promotional-article/r2v-ablation/row1-direct-r2v.mp4?v=e85c04f4c3b330e6',
      'static/promotional-article/r2v-ablation/row1-code-video-model.mp4?v=2bdfbe4b1b132f43',
    ]);
    assert.ok(!newArticle.includes('此处添加 proxy video'));
    assert.ok(!newArticle.includes('此处添加消融实验'));
    assert.ok(await page.locator('.brush-highlight').count() > 0);
    assert.equal(await page.locator('.article-placeholder').count(), 0);
    assert.equal(await page.locator('.article-footer').count(), 1);
    assert.equal(await page.locator('.article-footer').innerText(), 'Code Video Model © 2026');
    const articleText = await page.locator('.article-body').innerText();
    assert.ok(articleText.includes('约 25% 阶段对生成产生更大影响'));
    assert.ok(articleText.includes('reference image 负责塑造生成结果的 appearance，Proxy-VAE 负责保持预演所定义的 structure'));
    assert.ok(!articleText.includes('夜景参考能够稳定改变亮度'));
    assert.equal(await page.getByText('约 20% 阶段对生成产生更大影响', { exact: false }).count(), 0);
    const visualConditions = page.locator('.visual-conditions-crop img[src*="figure-11-visual-conditions.png"]');
    await visualConditions.waitFor({ state: 'visible' });
    assert.ok(await visualConditions.evaluate(image => image.complete && image.naturalWidth > 0));
    const cropBox = await page.locator('.visual-conditions-crop').boundingBox();
    const imageBox = await visualConditions.boundingBox();
    assert.ok(cropBox && imageBox && imageBox.width > cropBox.width && imageBox.height > cropBox.height);
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
