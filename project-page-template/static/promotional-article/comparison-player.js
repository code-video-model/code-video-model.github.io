(() => {

const pairs = [];
const demo = document.querySelector('#demo');

function waitForMedia(video, event, action, message, signal) {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const timer = setTimeout(() => finish(new Error(message)), 20000);
    const done = () => finish();
    const failed = () => finish(new Error('视频无法加载或解码'));
    const aborted = () => finish(signal.reason);
    function finish(error) {
      clearTimeout(timer);
      video.removeEventListener(event, done);
      video.removeEventListener('error', failed);
      signal.removeEventListener('abort', aborted);
      if (error) reject(error);
      else resolve();
    }
    video.addEventListener(event, done, { once: true });
    video.addEventListener('error', failed, { once: true });
    signal.addEventListener('abort', aborted, { once: true });
    action();
  });
}

for (const card of document.querySelectorAll('.application-card')) {
  setupComparison(card);
  const [proxy, result] = card.querySelectorAll('video');
  const videos = [proxy, result];
  const play = card.querySelector('.pair-play');
  const seek = card.querySelector('.pair-seek');
  const status = card.querySelector('.pair-status');
  const variantButtons = [...card.querySelectorAll('.pair-variants button')];
  videos.forEach(video => { video.controls = false; video.muted = true; });
  let ready = false;
  let loading = null;
  let revision = 0;
  let running = false;
  let raf = null;
  let seekJob = Promise.resolve();
  let resumeAfterSeek = false;
  let mediaController = new AbortController();
  let pendingRatio = null;
  if (variantButtons.length) card.dataset.variant = 'a';

  function pause() {
    revision++;
    running = false;
    cancelAnimationFrame(raf);
    videos.forEach(video => video.pause());
    play.disabled = false;
    play.textContent = '▶';
    play.setAttribute('aria-label', '播放对照视频');
    card.dataset.playback = 'paused';
  }
  function fail(error) {
    pause();
    ready = false;
    seek.disabled = true;
    status.textContent = `${error.message}，请重试或前往文末项目主页查看。`;
    play.textContent = '↻';
    play.setAttribute('aria-label', '重试对照视频');
    card.dataset.playback = 'error';
  }
  async function load() {
    if (ready) return;
    if (!loading) {
      const signal = mediaController.signal;
      const job = Promise.all(videos.map(video => waitForMedia(video, 'loadeddata', () => {
        video.preload = 'auto';
        video.load();
      }, '视频加载超时', signal))).then(() => {
        signal.throwIfAborted();
        if (!videos.every(video => Number.isFinite(video.duration) && video.duration > 0)) {
          throw new Error('视频时长无效');
        }
        proxy.playbackRate = proxy.duration / result.duration;
        result.playbackRate = 1;
        ready = true;
        seek.disabled = false;
      }).finally(() => { if (loading === job) loading = null; });
      loading = job;
    }
    await loading;
  }
  async function seekTo(ratio) {
    const signal = mediaController.signal;
    signal.throwIfAborted();
    await Promise.all(videos.map(video => {
      const target = Math.min(ratio * video.duration, Math.max(0, video.duration - .05));
      if (!video.seeking && Math.abs(video.currentTime - target) < .001) return;
      return waitForMedia(video, 'seeked', () => { video.currentTime = target; }, '视频跳转超时', signal);
    }));
  }
  function clock() {
    if (!running) return;
    const ratio = Math.min(1, result.currentTime / result.duration);
    seek.value = String(Math.round(ratio * 1000));
    const target = ratio * proxy.duration;
    if (!proxy.seeking && Math.abs(proxy.currentTime - target) > .12) {
      proxy.currentTime = Math.min(target, proxy.duration - .03);
    }
    raf = requestAnimationFrame(clock);
  }
  async function start() {
    for (const pair of pairs) if (pair.card !== card) pair.pause();
    demo.pause();
    const ticket = ++revision;
    status.textContent = '';
    play.disabled = true;
    play.textContent = '…';
    play.setAttribute('aria-label', '正在加载对照视频');
    card.dataset.playback = 'loading';
    try {
      await load();
      await seekJob;
      if (ticket !== revision) return;
      const ratio = pendingRatio ?? (result.currentTime >= result.duration - .1 ? 0 : result.currentTime / result.duration);
      await seekTo(ratio);
      if (ticket !== revision) return;
      pendingRatio = null;
      await Promise.all(videos.map(video => video.play()));
      if (ticket !== revision) { videos.forEach(video => video.pause()); return; }
      running = true;
      play.disabled = false;
      play.textContent = 'Ⅱ';
      play.setAttribute('aria-label', '暂停对照视频');
      card.dataset.playback = 'playing';
      clock();
    } catch (error) {
      if (ticket === revision) fail(error);
    }
  }
  play.addEventListener('click', () => running ? pause() : start());
  seek.addEventListener('input', () => {
    resumeAfterSeek = resumeAfterSeek || running;
    pause();
    const ticket = revision;
    const ratio = Number(seek.value) / 1000;
    seekJob = seekJob.then(() => {
      if (ticket === revision) return seekTo(ratio);
    }).catch(error => { if (ticket === revision) fail(error); });
  });
  seek.addEventListener('change', async () => {
    await seekJob;
    if (resumeAfterSeek && card.dataset.playback !== 'error') {
      resumeAfterSeek = false;
      await start();
    }
  });
  async function selectVariant(variant) {
    if (variant === card.dataset.variant) return;
    const shouldResume = running;
    const hadReady = ready;
    const ratio = ready ? result.currentTime / result.duration : (pendingRatio ?? 0);
    pause();
    const ticket = revision;
    mediaController.abort(new DOMException('Video variant changed', 'AbortError'));
    mediaController = new AbortController();
    loading = null;
    ready = false;
    seekJob = Promise.resolve();
    resumeAfterSeek = false;
    pendingRatio = ratio >= .99 ? 0 : ratio;
    seek.value = String(Math.round(pendingRatio * 1000));
    seek.disabled = true;
    status.textContent = '';
    card.dataset.variant = variant;
    for (const button of variantButtons) {
      button.setAttribute('aria-pressed', String(variant === 'b'));
      button.textContent = variant === 'b' ? 'Restore original' : button.dataset.editLabel;
    }
    for (const video of videos) {
      video.preload = 'none';
      video.src = video.dataset[variant === 'a' ? 'srcA' : 'srcB'];
      video.poster = video.dataset[variant === 'a' ? 'posterA' : 'posterB'];
    }
    if (shouldResume) {
      await start();
    } else if (hadReady) {
      play.disabled = true;
      card.dataset.playback = 'loading';
      play.textContent = '…';
      play.setAttribute('aria-label', '正在加载对照视频');
      try {
        await load();
        if (ticket !== revision) return;
        await seekTo(pendingRatio);
        if (ticket !== revision) return;
        pendingRatio = null;
        pause();
      } catch (error) {
        if (ticket === revision) fail(error);
      }
    }
  }
  for (const button of variantButtons) {
    button.addEventListener('click', () => selectVariant(card.dataset.variant === 'a' ? 'b' : 'a'));
  }
  result.addEventListener('ended', () => { pause(); seek.value = '1000'; });
  for (const video of videos) {
    video.addEventListener('error', () => { if (running) fail(new Error('视频播放中断')); });
  }
  pairs.push({ card, pause });
}

demo.addEventListener('play', () => pairs.forEach(pair => pair.pause()));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) pairs.forEach(pair => pair.pause());
});
window.addEventListener('pagehide', () => pairs.forEach(pair => pair.pause()));
})();
