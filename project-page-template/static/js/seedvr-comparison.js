const root = document.getElementById('cases');
const section = document.getElementById('section');
const controllers = [];
const node = (tag, text, className) => {
  const element = document.createElement(tag);
  if (text) element.textContent = text;
  if (className) element.className = className;
  return element;
};

function player(asset, status) {
  const figure = node('figure');
  const stage = node('div', '', 'stage');
  const video = node('video');
  Object.assign(video, { controls: true, playsInline: true, muted: true, loop: true, preload: 'none', poster: asset.poster });
  video.dataset.src = asset.src;
  video.dataset.scale = asset.scale;
  const button = node('button', 'Play', 'play');
  const abort = new AbortController();
  let loading, url, ticket = 0;
  const load = () => {
    if (loading) return loading;
    button.disabled = true;
    button.textContent = 'Loading…';
    loading = (async () => {
      const response = await fetch(asset.src, { signal: abort.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      abort.signal.throwIfAborted();
      url = URL.createObjectURL(blob);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error('Video loading timed out')), 60000);
        const loaded = () => finish();
        const failed = () => finish(new Error('Video decode failed'));
        const cancelled = () => finish(new DOMException('Closed', 'AbortError'));
        function finish(error) {
          clearTimeout(timer);
          video.removeEventListener('loadeddata', loaded);
          video.removeEventListener('error', failed);
          abort.signal.removeEventListener('abort', cancelled);
          if (error) reject(error); else resolve();
        }
        video.addEventListener('loadeddata', loaded, { once: true });
        video.addEventListener('error', failed, { once: true });
        abort.signal.addEventListener('abort', cancelled, { once: true });
        video.src = url;
        video.load();
      });
    })().catch(error => {
      loading = null;
      if (url) URL.revokeObjectURL(url);
      url = null;
      throw error;
    }).finally(() => { button.disabled = false; button.textContent = 'Play'; });
    return loading;
  };
  const pause = () => { ticket++; video.pause(); };
  const play = async () => {
    const current = ++ticket;
    await load();
    if (ticket === current && !abort.signal.aborted) await video.play();
  };
  video.addEventListener('play', () => { button.hidden = true; });
  button.onclick = () => play().catch(error => { if (error.name !== 'AbortError') status.textContent = error.message; });
  const seek = time => new Promise((resolve, reject) => {
    if (!video.seeking && Math.abs(video.currentTime - time) < .0001) { resolve(); return; }
    const timer = setTimeout(() => finish(new Error('Seek timed out')), 15000);
    const done = () => finish();
    const cancelled = () => finish(new DOMException('Closed', 'AbortError'));
    function finish(error) {
      clearTimeout(timer);
      video.removeEventListener('seeked', done);
      abort.signal.removeEventListener('abort', cancelled);
      if (error) reject(error); else resolve();
    }
    video.addEventListener('seeked', done, { once: true });
    abort.signal.addEventListener('abort', cancelled, { once: true });
    video.currentTime = time;
  });
  stage.append(video, button);
  figure.append(node('figcaption', asset.label), stage);
  return { figure, video, load, play, pause, seek, dispose() {
    abort.abort(); pause(); video.removeAttribute('src'); video.load(); if (url) URL.revokeObjectURL(url);
  } };
}

function caseCard(entry) {
  const card = node('article');
  card.dataset.section = entry.section;
  card.dataset.case = entry.id;
  const heading = node('div', '', 'heading');
  const buttons = node('div', '', 'controls');
  const run = node('button', 'Sync in Run', 'sync-run');
  const stop = node('button', 'Sync in Stop', 'sync-stop');
  buttons.append(run, stop);
  heading.append(node('h2', `Case ${entry.id} · ${entry.section}`), buttons);
  const status = node('p', '', 'status');
  status.setAttribute('role', 'status');
  const players = entry.videos.map(asset => player(asset, status));
  const grid = node('div', '', 'videos');
  grid.append(...players.map(p => p.figure));
  card.append(heading, node('p', entry.variant, 'subheading'), status, grid);
  let operation = 0;
  const pause = () => { operation++; players.forEach(p => p.pause()); };
  async function sync(running) {
    pause();
    const current = operation;
    const button = running ? run : stop;
    const time = running ? 0 : Math.floor(Math.min(...players.map(p => p.video.currentTime)) * 24) / 24;
    button.disabled = true;
    status.textContent = '';
    try {
      await Promise.all(players.map(p => p.load()));
      if (current !== operation) return;
      await Promise.all(players.map(p => p.seek(time)));
      if (current !== operation) return;
      if (running) await Promise.all(players.map(p => p.play()));
    } catch (error) {
      if (current === operation && error.name !== 'AbortError') {
        pause(); status.textContent = `Unable to synchronize: ${error.message}`;
      }
    } finally { button.disabled = false; }
  }
  run.onclick = () => sync(true);
  stop.onclick = () => sync(false);
  controllers.push({ card, pause, dispose() { pause(); players.forEach(p => p.dispose()); } });
  return card;
}

section.onchange = () => {
  for (const controller of controllers) {
    const hidden = section.value && controller.card.dataset.section !== section.value;
    if (hidden) controller.pause();
    controller.card.hidden = Boolean(hidden);
  }
};
window.addEventListener('pagehide', event => controllers.forEach(c => event.persisted ? c.pause() : c.dispose()));
fetch('static/seedvr-three-scale/manifest.json', { cache: 'no-cache' })
  .then(async response => {
    if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
    const data = await response.json();
    if (!data.count || data.cases.length !== data.count) throw new Error('No completed comparison data');
    document.getElementById('summary').textContent = `${data.count} of ${data.total} cases have complete 3× results · 24 FPS · Original audio preserved`;
    for (const title of new Set(data.cases.map(entry => entry.section))) {
      const option = node('option', title); option.value = title; section.append(option);
    }
    root.append(...data.cases.map(caseCard));
    section.disabled = false;
  }).catch(error => { document.getElementById('error').textContent = error.message; });
