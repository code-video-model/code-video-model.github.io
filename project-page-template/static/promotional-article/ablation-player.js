(() => {
  const panels = [];

  function waitForMedia(video, signal) {
    if (video.readyState >= 2) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('视频加载超时')), 20000);
      const loaded = () => finish();
      const failed = () => finish(new Error('视频无法加载或解码'));
      const aborted = () => finish(signal.reason);
      function finish(error) {
        clearTimeout(timer);
        video.removeEventListener('loadeddata', loaded);
        video.removeEventListener('error', failed);
        signal.removeEventListener('abort', aborted);
        error ? reject(error) : resolve();
      }
      video.addEventListener('loadeddata', loaded, { once: true });
      video.addEventListener('error', failed, { once: true });
      signal.addEventListener('abort', aborted, { once: true });
      video.preload = 'auto';
      video.load();
    });
  }

  for (const panel of document.querySelectorAll('.ablation-video-panel')) {
    const videos = [...panel.querySelectorAll('video')];
    const play = panel.querySelector('.ablation-play');
    const seek = panel.querySelector('.ablation-seek');
    const status = panel.querySelector('.ablation-status');
    const mediaController = new AbortController();
    const clockVideo = videos.at(-1);
    let ready = false;
    let loading = null;
    let running = false;
    let raf = null;

    videos.forEach(video => {
      video.controls = false;
      video.muted = true;
    });

    function pause() {
      running = false;
      cancelAnimationFrame(raf);
      videos.forEach(video => video.pause());
      play.disabled = false;
      play.textContent = '▶';
      play.setAttribute('aria-label', '播放消融对照视频');
      panel.dataset.playback = 'paused';
    }

    function fail(error) {
      pause();
      ready = false;
      seek.disabled = true;
      status.textContent = `${error.message}，请重试。`;
      play.textContent = '↻';
      play.setAttribute('aria-label', '重试消融对照视频');
      panel.dataset.playback = 'error';
    }

    async function load() {
      if (ready) return;
      if (!loading) {
        loading = Promise.all(videos.map(video => waitForMedia(video, mediaController.signal)))
          .then(() => {
            if (!videos.every(video => Number.isFinite(video.duration) && video.duration > 0)) {
              throw new Error('视频时长无效');
            }
            videos.forEach(video => { video.playbackRate = video.duration / clockVideo.duration; });
            ready = true;
            seek.disabled = false;
          })
          .finally(() => { loading = null; });
      }
      await loading;
    }

    function seekTo(ratio) {
      videos.forEach(video => {
        video.currentTime = Math.min(ratio * video.duration, Math.max(0, video.duration - .04));
      });
      seek.value = String(Math.round(ratio * 1000));
    }

    function update() {
      if (!running) return;
      const ratio = Math.min(1, clockVideo.currentTime / clockVideo.duration);
      seek.value = String(Math.round(ratio * 1000));
      videos.slice(0, -1).forEach(video => {
        const target = ratio * video.duration;
        if (!video.seeking && Math.abs(video.currentTime - target) > .12) {
          video.currentTime = Math.min(target, video.duration - .03);
        }
      });
      raf = requestAnimationFrame(update);
    }

    async function start() {
      panels.forEach(other => { if (other.panel !== panel) other.pause(); });
      status.textContent = '';
      play.disabled = true;
      play.textContent = '…';
      play.setAttribute('aria-label', '正在加载消融对照视频');
      panel.dataset.playback = 'loading';
      try {
        await load();
        if (clockVideo.currentTime >= clockVideo.duration - .1) seekTo(0);
        await Promise.all(videos.map(video => video.play()));
        running = true;
        play.disabled = false;
        play.textContent = 'Ⅱ';
        play.setAttribute('aria-label', '暂停消融对照视频');
        panel.dataset.playback = 'playing';
        update();
      } catch (error) {
        fail(error);
      }
    }

    play.addEventListener('click', () => running ? pause() : start());
    seek.addEventListener('input', () => {
      pause();
      if (ready) seekTo(Number(seek.value) / 1000);
    });
    clockVideo.addEventListener('ended', () => { pause(); seek.value = '1000'; });
    panels.push({ panel, pause });
  }
})();
