const $ = id => document.getElementById(id);
const states = [];
const loads = new WeakMap();
let active;

function pause(state) {
  state.serial++;
  state.playing = false;
  cancelAnimationFrame(state.animation);
  state.videos.forEach(video => video.pause());
  state.play.textContent = '同步播放';
  if (active === state) active = null;
}

function fail(state, error) {
  pause(state);
  state.error.hidden = false;
  state.error.textContent = `播放失败：${error.message}。可点击同步播放重试。`;
}

function mediaEvent(video, event, action) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => finish(new Error('媒体操作超时')), 30000);
    const done = () => finish();
    const failed = () => finish(new Error(`无法解码视频 (${video.error?.code})`));
    function finish(error) {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener('error', failed);
      if (error) reject(error); else resolve();
    }
    video.addEventListener(event, done, { once: true });
    video.addEventListener('error', failed, { once: true });
    try { action(); } catch (error) { finish(error); }
  });
}

function load(video) {
  if (video.readyState >= 2) return Promise.resolve();
  if (loads.has(video)) return loads.get(video);
  const promise = (async () => {
    // Local blob URLs allow seeking on the existing non-Range static server.
    if (!video.dataset.blob) {
      const response = await fetch(video.dataset.src, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      video.dataset.blob = URL.createObjectURL(await response.blob());
    }
    await mediaEvent(video, 'loadeddata', () => { video.src = video.dataset.blob; video.load(); });
  })().finally(() => loads.delete(video));
  loads.set(video, promise);
  return promise;
}

function displayTime(state, time) {
  state.slider.value = String(time);
  state.time.value = `${time.toFixed(2)} / ${state.duration.toFixed(2)} s`;
}

async function seek(state, time, ticket) {
  await Promise.all(state.videos.map(load));
  if (ticket !== state.serial) return;
  await Promise.all(state.videos.map(video => {
    if (!video.seeking && Math.abs(video.currentTime - time) < 0.0001) return;
    return mediaEvent(video, 'seeked', () => { video.currentTime = time; });
  }));
}

function follow(state) {
  if (!state.playing) return;
  const time = state.videos[0].currentTime;
  const other = state.videos[1];
  if (!other.seeking && Math.abs(other.currentTime - time) > 1 / state.fps) other.currentTime = time;
  displayTime(state, time);
  state.animation = requestAnimationFrame(() => follow(state));
}

async function play(state) {
  if (active) pause(active);
  active = state;
  const ticket = ++state.serial;
  state.play.disabled = true;
  state.error.hidden = true;
  try {
    const time = Number(state.slider.value) >= state.duration - 1 / state.fps ? 0 : Number(state.slider.value);
    await seek(state, time, ticket);
    if (ticket !== state.serial || state.row.hidden) return;
    state.videos.forEach(video => { video.playbackRate = Number($('speed').value); });
    await Promise.all(state.videos.map(video => video.play()));
    if (ticket !== state.serial) { state.videos.forEach(video => video.pause()); return; }
    state.playing = true;
    state.play.textContent = '同步暂停';
    follow(state);
  } catch (error) {
    if (ticket === state.serial) fail(state, error);
  } finally {
    state.play.disabled = false;
  }
}

async function scrub(state, time) {
  pause(state);
  const ticket = state.serial;
  displayTime(state, time);
  state.error.hidden = true;
  try { await seek(state, time, ticket); } catch (error) {
    if (ticket === state.serial) fail(state, error);
  }
}

function filter() {
  const terms = $('search').value.toLowerCase().split(/[\s/，,]+/).filter(Boolean);
  let count = 0;
  for (const state of states) {
    const item = state.item;
    const visible = (!$('version').value || item.version === $('version').value)
      && (!$('take').value || String(item.take) === $('take').value)
      && terms.every(term => state.search.includes(term));
    state.row.hidden = !visible;
    if (visible) count++; else pause(state);
  }
  document.querySelectorAll('#root > section').forEach(section => {
    section.hidden = ![...section.querySelectorAll('article')].some(row => !row.hidden);
  });
  $('status').textContent = `显示 ${count} / ${states.length} 组 Pair · ${count * 2} 个视频`;
  $('empty').hidden = count !== 0;
  const params = new URLSearchParams();
  for (const key of ['version', 'take', 'search']) if ($(key).value) params.set(key, $(key).value);
  history.replaceState(null, '', `${location.pathname}${params.size ? `?${params}` : ''}`);
}

async function initialize() {
  const response = await fetch('static/paired-camera/manifest.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`清单请求失败：HTTP ${response.status}`);
  const data = await response.json();
  $('summary').textContent = `${data.familyCount} 组原场景 × 2 套运镜 · ${data.pairCount} 组 Pair · ${data.videoCount} 个视频 · 960×540 / 24 FPS / 5.17 s`;
  for (const version of [...new Set(data.pairs.map(pair => pair.version))]) {
    $('version').add(new Option(version, version));
  }
  const groups = new Map();
  for (const item of data.pairs) {
    if (!groups.has(item.family)) {
      const section = document.createElement('section');
      const title = document.createElement('h2');
      title.textContent = `${item.version} · Case ${item.videos.map(video => video.caseId).join(' / ')} · ${item.title}`;
      section.append(title);
      $('root').append(section);
      groups.set(item.family, section);
    }
    const row = $('pair-template').content.firstElementChild.cloneNode(true);
    row.dataset.pair = item.id;
    row.querySelector('h3').textContent = `运镜 ${item.take} · ${item.version}`;
    row.querySelector('.meta').textContent = `同一 Pair 使用相同相机轨迹 · ${item.refinementPasses} 轮视觉调整 · ${item.note}`;
    const videos = item.videos.map((asset, index) => {
      const panel = $('panel-template').content.firstElementChild.cloneNode(true);
      panel.querySelector('figcaption').textContent = `${index ? 'B · Variant' : 'A · Anchor'} · Case ${asset.caseId}`;
      const video = panel.querySelector('video');
      video.dataset.src = asset.url;
      video.poster = asset.poster;
      video.muted = true;
      video.setAttribute('aria-label', `${item.version} 运镜 ${item.take} Case ${asset.caseId}`);
      const link = panel.querySelector('.download');
      link.href = asset.url;
      link.download = asset.filename;
      panel.querySelector('.fullscreen').addEventListener('click', async () => {
        try { await video.requestFullscreen(); } catch (error) { fail(state, error); }
      });
      row.querySelector('.panels').append(panel);
      return video;
    });
    const state = {
      item, row, videos, duration: item.videos[0].metadata.duration,
      fps: Number(item.videos[0].metadata.fps), serial: 0, playing: false,
      play: row.querySelector('[data-action=play]'), slider: row.querySelector('.seek'),
      time: row.querySelector('.time'), error: row.querySelector('.error'),
      search: `${item.version} ${item.title} ${item.videos.map(video => video.caseId).join(' ')}`.toLowerCase(),
    };
    state.slider.max = String(state.duration - 1 / state.fps);
    displayTime(state, 0);
    state.play.addEventListener('click', () => state.playing ? pause(state) : play(state));
    row.querySelector('[data-action=reset]').addEventListener('click', () => scrub(state, 0));
    state.slider.addEventListener('input', () => scrub(state, Number(state.slider.value)));
    videos[0].addEventListener('ended', () => {
      if (state.playing) { pause(state); displayTime(state, 0); void play(state); }
    });
    states.push(state);
    groups.get(item.family).append(row);
  }
  const params = new URLSearchParams(location.search);
  for (const id of ['version', 'take', 'search']) {
    if (params.has(id)) $(id).value = params.get(id);
    $(id).addEventListener('input', filter);
  }
  $('clear').addEventListener('click', () => {
    ['version', 'take', 'search'].forEach(id => { $(id).value = ''; });
    filter();
  });
  $('speed').addEventListener('change', () => states.forEach(state =>
    state.videos.forEach(video => { video.playbackRate = Number($('speed').value); })));
  document.addEventListener('visibilitychange', () => { if (document.hidden && active) pause(active); });
  filter();
}

window.cameraShowcaseReady = initialize().catch(error => {
  $('status').classList.add('error');
  $('status').textContent = `页面加载失败：${error.message}。请刷新重试。`;
  throw error;
});
