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
      'static/promotional-article/news_new.css?v=52d4d54f81acbbe0');
    assert.ok((await page.locator('script[src]').evaluateAll(scripts =>
      scripts.every(script => script.getAttribute('src').startsWith('static/promotional-article/')))));
    assert.equal(await page.locator('#demo').getAttribute('src'),
      'static/demo/Demo_CodeVideoModel_New.mp4?v=f3259741b723aa48');
    const newArticle = await page.locator('#article').innerHTML();
    assert.ok(!blogArticle.includes('figure-one-composite'));
    assert.ok(newArticle.includes('figure-one-composite'));
    assert.equal(await page.locator('.figure-one-composite video').getAttribute('src'),
      'static/promotional-article/composites/figure-01-grid.mp4?v=601477fb551bc5a1');
    assert.deepEqual(await page.locator('.figure-one-composite .composite-row-labels span').allTextContents(), [
      'Tank Assault', 'Titan Attack', 'Double Pendulum',
    ]);
    assert.deepEqual(await page.locator('.figure-two-headers > div').allTextContents(), [
      'Program (edited lines)', 'Proxy Video', 'Code Video Model',
    ]);
    assert.equal(await page.locator('.figure-two-program').count(), 2);
    assert.ok(await page.locator('.figure-two-unified-body').evaluate(row => {
      const [programs, video] = [...row.children].map(element => element.getBoundingClientRect());
      return video.width > programs.width * 1.9 && Math.abs(programs.height - video.height) < 4;
    }));
    assert.equal(await page.locator('.figure-two-unified video').getAttribute('src'),
      'static/promotional-article/composites/figure-02-grid.mp4?v=10fddf429af5acef');
    assert.ok(!newArticle.includes('w/o Early Step'));
    assert.ok(!newArticle.includes('figure-02-program-control.png'));
    assert.equal(await page.locator('.figure-three-composite video').getAttribute('src'),
      'static/promotional-article/composites/figure-03-grid.mp4?v=11c2dc9d098c1f5f');
    assert.deepEqual(await page.locator('.figure-three-composite .composite-row-labels span').allTextContents(), [
      "Newton's Cradle", 'Spring Recoil',
    ]);
    assert.ok(!newArticle.includes('figure-08-physics.png'));
    assert.equal(await page.locator('.ablation-video-panel').count(), 2);
    assert.deepEqual(await page.locator('.ablation-video-panel video').evaluateAll(videos =>
      videos.map(video => video.getAttribute('src'))), [
      'static/promotional-article/r2v-ablation/row2-comparison.mp4?v=16b8d55673616da4',
      'static/promotional-article/r2v-ablation/row1-comparison.mp4?v=fe4682bf65990b82',
    ]);
    assert.equal(await page.locator('.application-composite').count(), 2);
    assert.deepEqual(await page.locator('.application-composite video').evaluateAll(videos =>
      videos.map(video => video.getAttribute('src'))), [
      'static/promotional-article/composites/applications-overview.mp4?v=6dce9e4734c390c8',
      'static/promotional-article/composites/applications-edits.mp4?v=baeb15ca5b83ea62',
    ]);
    assert.deepEqual(await page.locator('.application-overview-composite .composite-row-labels span').allTextContents(), [
      'Anime', 'Bullet Time', 'Gaming', 'ArchitecturalCinematics',
      'ProductCinematography', 'PhysicalGrounding', '3D / 4DReconstruction',
    ]);
    assert.equal(await page.locator('video').count(), 8);
    assert.equal(await page.locator('.comparison-frame, .pair-edit-toggle, .figure-three-sync-gif').count(), 0);
    assert.ok(!newArticle.includes('此处添加 proxy video'));
    assert.ok(!newArticle.includes('此处添加消融实验'));
    assert.ok(await page.locator('.brush-highlight').count() > 0);
    assert.equal(await page.locator('.article-placeholder').count(), 0);
    assert.equal(await page.locator('.article-footer').count(), 1);
    assert.equal(await page.locator('.article-footer').innerText(), 'Code Video Model © 2026');
    const articleText = await page.locator('.article-body').innerText();
    assert.ok(articleText.includes('Figure 10｜多场景应用中的程序预演与 Code Video Model 生成结果对照'));
    assert.ok(articleText.includes('Figure 11｜Scene Editing 与 Robotics & Trajectory Control 的原始及编辑结果对照'));
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
