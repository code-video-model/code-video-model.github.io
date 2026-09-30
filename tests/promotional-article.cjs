const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const path = require('node:path');
const fs = require('node:fs');

(async () => {
  const root = process.env.SITE_ROOT || path.join(__dirname, '../project-page-template');
  let server, browser;
  try {
    let url = process.env.ARTICLE_URL;
    if (!url) {
      server = spawn(process.execPath, [path.join(__dirname, '../scripts/serve.cjs')], {
        env: { ...process.env, SITE_ROOT: root, PORT: '0' }, stdio: ['ignore', 'pipe', 'ignore'],
      });
      const port = await new Promise((resolve, reject) => {
        server.stdout.on('data', data => {
          const match = String(data).match(/http:\/\/127\.0\.0\.1:(\d+)/);
          if (match) resolve(match[1]);
        });
        server.on('error', reject);
        server.on('exit', code => reject(new Error(`Article server exited: ${code}`)));
      });
      url = `http://127.0.0.1:${port}/promotional_article.html`;
    }
    const mapping = JSON.parse(fs.readFileSync(path.join(__dirname,
      '../project-page-template/static/promotional-article/media-map.json'), 'utf8')).resources;
    browser = await chromium.launch({ headless: true });
    for (const width of [1440, 390]) {
      const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
      const errors = [], mediaRequests = [];
      page.on('pageerror', error => errors.push(error.message));
      page.on('request', request => { if (request.resourceType() === 'media') mediaRequests.push(request.url()); });
      page.on('response', response => {
        if (response.url().startsWith(new URL(url).origin) && response.status() >= 400) {
          errors.push(`${response.status()} ${response.url()}`);
        }
      });
      const response = await page.goto(url);
      assert.equal(response.status(), 200);
      await page.waitForFunction(() => [...document.querySelectorAll('.article-body img')]
        .every(image => image.complete && image.naturalWidth > 0));
      assert.deepEqual(mediaRequests, []);
      assert.equal(await page.locator('header,footer,nav,.sidebar,.reading-tools').count(), 0);
      assert.equal(await page.locator('.article-body img').count(), 7);
      assert.equal(await page.locator('video').count(), 19);
      assert.deepEqual(await page.locator('.application-card h3').allTextContents(), [
        'Anime', 'Bullet Time', 'Gaming', 'Scene Editing', 'Robotics & Trajectory Control',
        'Architectural Cinematics', 'Product Cinematography', 'Physical Grounding', '3D / 4D Reconstruction',
      ]);
      assert.equal(await page.locator('.pair-edit-toggle').count(), 2);
      const image = page.locator('.article-body a:has(img)').first();
      await image.click();
      assert.ok(await page.locator('.image-viewer').evaluate(element => element.open));
      await page.keyboard.press('Escape');
      if (width === 1440) {
        for (const published of new Set(Object.values(mapping))) {
          assert.ok((await page.request.head(new URL(published, url).href)).ok(), published);
        }
      }
      const cards = page.locator('.application-card');
      for (let index = 0; index < 9; index++) {
        const card = cards.nth(index);
        await card.locator('.pair-play').click();
        await page.waitForFunction(index => {
          const card = document.querySelectorAll('.application-card')[index];
          return card.dataset.playback === 'playing'
            && [...card.querySelectorAll('video')].every(video => !video.paused && video.currentTime > .12);
        }, index, { timeout: 60000 });
        await card.locator('.pair-play').click();
        await card.locator('.pair-seek').fill('450');
        await page.waitForFunction(index => [...document.querySelectorAll('.application-card')[index].querySelectorAll('video')]
          .every(video => !video.seeking && Math.abs(video.currentTime / video.duration - .45) < .03), index);
        assert.ok(await card.locator('video').evaluateAll(videos => videos.every(video => video.muted)));
        if (await card.locator('.pair-edit-toggle').count()) {
          const toggle = card.locator('.pair-edit-toggle');
          const label = await toggle.innerText();
          assert.ok(['Move Chair to Desk', 'Use Quadruped Robot'].includes(label));
          await toggle.click();
          await page.waitForFunction(index => {
            const card = document.querySelectorAll('.application-card')[index];
            return card.dataset.variant === 'b' && card.dataset.playback === 'paused'
              && [...card.querySelectorAll('video')].every(video =>
                video.getAttribute('src') === video.dataset.srcB && !video.seeking &&
                Math.abs(video.currentTime / video.duration - .45) < .03);
          }, index);
          assert.equal(await toggle.innerText(), 'Restore original');
          await card.locator('.pair-play').click();
          await page.waitForFunction(index => document.querySelectorAll('.application-card')[index].dataset.playback === 'playing', index);
          await card.locator('.pair-play').click();
          await toggle.click();
          await page.waitForFunction(index => document.querySelectorAll('.application-card')[index].dataset.playback === 'paused', index);
          assert.equal(await toggle.innerText(), label);
        }
      }
      const demo = page.locator('#demo');
      await demo.evaluate(async video => { video.muted = true; await video.play(); });
      await page.waitForFunction(() => document.querySelector('#demo').currentTime > .2, null, { timeout: 60000 });
      assert.deepEqual(await demo.evaluate(video => [video.videoWidth, video.videoHeight]), [1600, 900]);
      await demo.evaluate(video => { video.pause(); video.currentTime = 100; });
      await page.waitForFunction(() => {
        const video = document.querySelector('#demo');
        return !video.seeking && Math.abs(video.currentTime - 100) < .1;
      });
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log('PASS: article production assets, exact case order, nine video pairs, A/B edits and demo at desktop/mobile widths');
  } finally {
    if (browser) await browser.close();
    if (server) server.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
