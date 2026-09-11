function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function makePlayer(asset, title) {
  const figure = element('figure');
  figure.append(element('figcaption', '', title));
  const stage = element('div', 'video-stage');
  const video = element('video');
  video.controls = true;
  video.playsInline = true;
  video.preload = 'none';
  video.muted = true;
  video.loop = asset.loop ?? true;
  video.poster = asset.poster;
  video.dataset.src = asset.url;
  video.setAttribute('aria-label', title);
  const button = element('button', 'video-play', 'Play');
  button.type = 'button';
  const status = element('p', 'video-status');
  status.setAttribute('role', 'status');
  const controller = new AbortController();
  let objectURL;
  let promise;
  let disposed = false;
  let playTicket = 0;
  stage.append(video, button);
  figure.append(stage, status);

  function showError(error) {
    if (disposed || error.name === 'AbortError') return;
    status.classList.add('error');
    status.textContent = `Unable to play: ${error.message}`;
    button.hidden = false;
    button.disabled = false;
    button.textContent = 'Retry';
  }

  function load() {
    if (promise) return promise;
    button.disabled = true;
    button.textContent = 'Loading…';
    status.classList.remove('error');
    status.textContent = '';
    promise = (async () => {
      const response = await fetch(asset.url, { signal: controller.signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      controller.signal.throwIfAborted();
      objectURL = URL.createObjectURL(blob);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error('Video loading timed out')), 60000);
        const loaded = () => finish();
        const failed = () => finish(new Error('Video could not be decoded'));
        const aborted = () => finish(new DOMException('Disposed', 'AbortError'));
        function finish(error) {
          clearTimeout(timer);
          video.removeEventListener('loadeddata', loaded);
          video.removeEventListener('error', failed);
          controller.signal.removeEventListener('abort', aborted);
          if (error) reject(error); else resolve();
        }
        video.addEventListener('loadeddata', loaded);
        video.addEventListener('error', failed);
        controller.signal.addEventListener('abort', aborted, { once: true });
        video.src = objectURL;
        video.load();
      });
      button.disabled = false;
      button.textContent = 'Play';
    })().catch((error) => {
      promise = null;
      if (objectURL) URL.revokeObjectURL(objectURL);
      objectURL = null;
      showError(error);
      throw error;
    });
    return promise;
  }

  async function play() {
    const ticket = ++playTicket;
    await load();
    controller.signal.throwIfAborted();
    if (ticket !== playTicket) return;
    await video.play();
  }
  function pause() { playTicket++; video.pause(); }
  function seek(time) {
    if (!video.seeking && Math.abs(video.currentTime - time) < .0001) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('Video seeking timed out')), 15000);
      const sought = () => finish();
      const aborted = () => finish(new DOMException('Disposed', 'AbortError'));
      const failed = () => finish(new Error('Video seek failed'));
      function finish(error) {
        clearTimeout(timer);
        video.removeEventListener('seeked', sought);
        video.removeEventListener('error', failed);
        controller.signal.removeEventListener('abort', aborted);
        if (error) reject(error); else resolve();
      }
      video.addEventListener('seeked', sought, { once: true });
      video.addEventListener('error', failed, { once: true });
      controller.signal.addEventListener('abort', aborted, { once: true });
      video.currentTime = Math.min(time, video.duration);
    });
  }
  button.addEventListener('click', () => play().catch(showError));
  video.addEventListener('play', () => { button.hidden = true; status.textContent = ''; });
  function dispose() {
    disposed = true;
    controller.abort();
    pause();
    video.removeAttribute('src');
    video.load();
    if (objectURL) URL.revokeObjectURL(objectURL);
  }
  return { figure, video, load, play, pause, seek, dispose };
}
