const assert = require('node:assert/strict');
const { chromium } = require('playwright');
const fs = require('node:fs/promises');
const path = require('node:path');

async function main() {
  const base = process.env.DEMO_URL;
  assert.ok(base);
  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    const errors = [], media = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => { if (request.url().includes('.mp4')) media.push(request.url()); });
    await page.goto(base);
    const cards = page.locator('.application-preview');
    assert.equal(await cards.count(), 8);
    assert.equal(await page.locator('.application-preview video').count(), 16);
    assert.equal(await page.locator('iframe').count(), 0);
    const expected = ['first-person-009', '505', '583', '563', '577', '624', '524', '643'];
    assert.deepEqual(await cards.evaluateAll((nodes) => nodes.map((node) => node.dataset.case)), expected);
    const mapping = await page.evaluate(() => fetch('static/images/application-previews/manifest.json').then((r) => r.json()));
    for (let index = 0; index < mapping.length; index++) {
      const row = cards.nth(index);
      const entry = mapping[index];
      assert.equal(await row.locator('h2 a').getAttribute('href'), `gallery.html#${entry.section_id}`);
      assert.deepEqual(await row.locator('video').evaluateAll((videos) => videos.map((video) => video.dataset.src)),
        [entry.threejs, entry.result].map((value) => 'static/project-page-cases/' + value));
      assert.ok(await row.locator('video').evaluateAll((videos) => videos.every((video) =>
        video.preload === 'none' && !video.hasAttribute('src') && !video.controls && !video.autoplay)));
    }
    assert.deepEqual(media, []);
    assert.equal(await page.locator('.application-edit-controls').count(), 3);
    assert.deepEqual(await page.locator('.application-edit').allTextContents(),
      ['Move Chair to Desk', 'Use Humanoid Robot', 'Take Right Route']);
    assert.deepEqual(mapping.filter((entry) => entry.edited).map((entry) => entry.edited.case_id),
      ['663', '564', '578']);
    const published = await page.evaluate(() => fetch('static/project-page-cases/prompts.json').then((response) => response.json()));
    for (const entry of mapping.filter((item) => item.edited)) {
      const item = published.items.find((item) => String(item.case_id) === entry.edited.case_id);
      assert.equal(entry.edited.threejs, item.threejs_video);
      assert.equal(entry.edited.result, item.display_code_video_model || item.code_video_model_v2 || item.code_video_model);
    }
    const rowBoxes = await cards.evaluateAll((nodes) => nodes.slice(0, 3).map((node) => {
      const box = node.getBoundingClientRect(); return { x: box.x, y: box.y };
    }));
    assert.equal(rowBoxes[0].y, rowBoxes[1].y);
    assert.ok(rowBoxes[2].y > rowBoxes[0].y);
    const first = cards.first();
    await first.scrollIntoViewIfNeeded();
    await first.locator('.application-play').click();
    await page.waitForFunction(() => [...document.querySelectorAll('.application-preview:first-child video')]
      .every((video) => !video.paused && video.currentTime > .2));
    await first.locator('.application-play').click();
    assert.ok(await first.locator('video').evaluateAll((videos) => videos.every((video) => video.paused)));
    await first.locator('.application-seek').evaluate((input) => {
      input.value = '500'; input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => [...document.querySelectorAll('.application-preview:first-child video')]
      .every((video) => !video.seeking && Math.abs(video.currentTime - 2.583) < .03));
    await first.locator('.application-sound').click();
    assert.deepEqual(await first.locator('video').evaluateAll((videos) => videos.map((video) => video.muted)), [true, false]);
    await first.locator('.application-play').click();
    await cards.nth(1).locator('.application-play').click();
    await page.waitForFunction(() => [...document.querySelectorAll('.application-preview:nth-child(2) video')]
      .every((video) => !video.paused && video.currentTime > .1));
    assert.deepEqual(await cards.nth(1).locator('video').evaluateAll((videos) =>
      videos.map((video) => [video.videoWidth, video.videoHeight])), [[960, 540], [1920, 1088]]);
    assert.ok(await first.locator('video').evaluateAll((videos) => videos.every((video) => video.paused)));
    await cards.nth(1).locator('.application-play').click();
    const third = cards.nth(2);
    const source = new URL(await third.locator('video').first().getAttribute('data-src'), base).href;
    await page.route(source, (route) => route.fulfill({ status: 404, body: 'Unavailable' }));
    await third.locator('.application-play').click();
    await third.locator('.application-status').filter({ hasText: 'HTTP 404' }).waitFor();
    assert.equal(await third.locator('.application-play').textContent(), 'Retry');
    await page.unroute(source);
    await third.locator('.application-play').click();
    await page.waitForFunction(() => [...document.querySelectorAll('.application-preview:nth-child(3) video')]
      .every((video) => !video.paused && video.currentTime > .1));
    await third.locator('.application-play').click();
    for (let index = 3; index < mapping.length; index++) {
      const card = cards.nth(index);
      await card.locator('.application-play').click();
      await page.waitForFunction((position) => [...document.querySelectorAll('.application-preview')[position].querySelectorAll('video')]
        .every((video) => !video.paused && video.currentTime > .1), index);
      if (index === mapping.length - 1) {
        assert.deepEqual(await card.locator('video').evaluateAll((videos) =>
          videos.map((video) => [video.videoWidth, video.videoHeight])), [[960, 540], [1920, 1088]]);
      }
      await card.locator('.application-seek').evaluate((input) => {
        for (const value of ['250', '750', '500']) {
          input.value = value; input.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      await page.waitForFunction((position) => {
        const videos = [...document.querySelectorAll('.application-preview')[position].querySelectorAll('video')];
        return videos.every((video) => !video.paused && !video.seeking && video.currentTime > video.duration * .48)
          && Math.abs(videos[0].currentTime - videos[1].currentTime) < .1;
      }, index);
      await card.locator('.application-play').click();
    }
    for (let index = 2; index <= 4; index++) {
      const card = cards.nth(index);
      assert.equal(await card.getAttribute('data-variant'), 'a');
      assert.ok(await card.locator('.application-restore').isDisabled());
      const edited = mapping[index].edited;
      const editedURL = new URL('static/project-page-cases/' + edited.result, base).href;
      assert.ok(!media.includes(editedURL), 'Edited videos are not loaded before editing');
      let unblock;
      const gate = new Promise((resolve) => { unblock = resolve; });
      await page.route(editedURL, async (route) => { await gate; await route.continue(); });
      await card.locator('.application-edit').click();
      assert.equal(await card.getAttribute('aria-busy'), 'true');
      assert.ok(await card.locator('.application-edit').isDisabled());
      assert.ok(await card.locator('.application-restore').isDisabled());
      assert.ok(await card.locator('.application-play').isDisabled());
      assert.ok(await card.locator('video').evaluateAll((videos) =>
        videos.every((video) => getComputedStyle(video).visibility === 'hidden')));
      unblock();
      await page.waitForFunction((position) => {
        const card = document.querySelectorAll('.application-preview')[position];
        return card.dataset.variant === 'b' && card.getAttribute('aria-busy') === 'false'
          && [...card.querySelectorAll('video')].every((video) => !video.paused && video.currentTime > .1);
      }, index);
      await page.unroute(editedURL);
      assert.equal(await card.locator('.application-version').textContent(), 'Edited');
      assert.deepEqual(await card.locator('video').evaluateAll((videos) => videos.map((video) => video.dataset.src)),
        [edited.threejs, edited.result].map((value) => 'static/project-page-cases/' + value));
      await card.locator('.application-play').click();
      if (process.env.DEMO_ARTIFACTS) {
        await fs.mkdir(process.env.DEMO_ARTIFACTS, { recursive: true });
        await card.screenshot({ path: path.join(process.env.DEMO_ARTIFACTS, `application-edited-${edited.case_id}.png`) });
      }
      await card.locator('.application-restore').click();
      await page.waitForFunction((position) => {
        const card = document.querySelectorAll('.application-preview')[position];
        return card.dataset.variant === 'a' && card.getAttribute('aria-busy') === 'false'
          && [...card.querySelectorAll('video')].every((video) => !video.paused && video.currentTime > .1);
      }, index);
      assert.deepEqual(await card.locator('video').evaluateAll((videos) => videos.map((video) => video.dataset.src)),
        [mapping[index].threejs, mapping[index].result].map((value) => 'static/project-page-cases/' + value));
      await card.locator('.application-play').click();
    }
    const failedEditURL = new URL('static/project-page-cases/' + mapping[2].edited.result, base).href;
    await page.route(failedEditURL, (route) => route.fulfill({ status: 404, body: 'Unavailable' }));
    await third.locator('.application-edit').click();
    await third.locator('.application-status').filter({ hasText: 'Unable to switch preview: HTTP 404' }).waitFor();
    assert.equal(await third.getAttribute('data-variant'), 'a');
    assert.equal(await third.locator('.application-version').textContent(), 'Original');
    assert.ok(await third.locator('.application-edit').isEnabled());
    assert.ok(await third.locator('video').evaluateAll((videos) =>
      videos.every((video) => video.dataset.src === video.dataset.srcA && !video.hasAttribute('src'))));
    await page.unroute(failedEditURL);
    await third.locator('.application-edit').click();
    await page.waitForFunction(() => document.querySelectorAll('.application-preview')[2].dataset.variant === 'b');
    await third.locator('.application-play').click();
    let finishRestore;
    const restoreGate = new Promise((resolve) => { finishRestore = resolve; });
    await page.route(source, async (route) => { await restoreGate; await route.continue(); });
    await third.locator('.application-restore').click();
    assert.equal(await third.getAttribute('aria-busy'), 'true');
    await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
    assert.equal(await third.getAttribute('aria-busy'), 'false');
    assert.equal(await third.getAttribute('data-variant'), 'b');
    assert.ok(await third.locator('video').evaluateAll((videos) =>
      videos.every((video) => video.dataset.src === video.dataset.srcB && !video.hasAttribute('src'))));
    finishRestore();
    await page.unrouteAll({ behavior: 'wait' });
    await third.locator('.application-play').click();
    await page.waitForFunction(() => [...document.querySelectorAll('.application-preview')[2].querySelectorAll('video')]
      .every((video) => !video.paused && video.currentTime > .1));
    assert.equal(await third.getAttribute('data-variant'), 'b', 'A cancelled restore cannot replace the committed edit');
    await third.locator('.application-play').click();
    if (process.env.DEMO_ARTIFACTS) {
      await fs.mkdir(process.env.DEMO_ARTIFACTS, { recursive: true });
      await page.locator('.application-previews').screenshot({ path: path.join(process.env.DEMO_ARTIFACTS, 'applications-desktop.png') });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await first.scrollIntoViewIfNeeded();
    const mobile = await first.locator('video').evaluateAll((videos) => videos.map((video) => {
      const box = video.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width };
    }));
    assert.equal(mobile[0].y, mobile[1].y);
    assert.ok(mobile[1].x > mobile[0].x);
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    if (process.env.DEMO_ARTIFACTS) await first.screenshot({ path: path.join(process.env.DEMO_ARTIFACTS, 'applications-mobile.png') });
    await page.setViewportSize({ width: 320, height: 720 });
    await third.scrollIntoViewIfNeeded();
    assert.ok(await third.locator('.application-edit').isVisible());
    assert.ok(await third.locator('.application-restore').isVisible());
    if (process.env.DEMO_ARTIFACTS) await third.screenshot({ path: path.join(process.env.DEMO_ARTIFACTS, 'application-edit-mobile.png') });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await third.locator('h2 a').click();
    await page.waitForURL('**/gallery.html#gallery');
    assert.equal(await page.locator('.gallery-section').count(), 8);
    assert.deepEqual(errors, []);
    console.log('PASS eight first-case pairs, three published A/B edits/restores, lazy loading, sync playback/seek/audio, failed-switch recovery and mobile/Gallery navigation');
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
