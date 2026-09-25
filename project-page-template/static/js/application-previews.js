import { setupComparison } from './diagonal-comparison.js';
import { createPreviewEditDiff } from './preview-edit-diff.js';
import { hydratePoster } from './lazy-posters.js';
import { editVariantLabels } from './code-display-names.mjs';

let activePair;
const previews = [];

for (const card of document.querySelectorAll('.application-preview')) {
  setupComparison(card);
  const videos = [...card.querySelectorAll('video')];
  const [proxy, result] = videos;
  const play = card.querySelector('.application-play');
  const seek = card.querySelector('.application-seek');
  const sound = card.querySelector('.application-sound');
  const status = card.querySelector('.application-status');
  let group = card.querySelector('.application-edit-controls');
  let toggle = card.querySelector('.application-variant-toggle');
  const bubble=[...card.closest('.category-shell')?.querySelectorAll('.fps-case-bubble')||[]].find(link=>
    link.dataset.case===card.dataset.case
    && (link.dataset.caseB||'')===(card.dataset.caseB||'')
    && (link.dataset.selection||'')===(card.dataset.selection||''));
  const caseLabels=editVariantLabels(card.dataset.displayName||bubble?.dataset.title,card.dataset.case,card.dataset.caseB);
  if(!toggle&&card.dataset.caseB){
    const label=group?.querySelector('.application-edit')?.textContent||card.dataset.editLabel||'Apply edit';
    if(!group){group=document.createElement('div');group.className='application-edit-controls';}
    toggle=document.createElement('button');toggle.type='button';toggle.className='application-variant-toggle';toggle.dataset.editLabel=label;group.replaceChildren(toggle);
  }
  const editLabel=toggle?.dataset.editLabel||toggle?.textContent.trim()||card.dataset.editLabel||'Apply edit';
  if(toggle){if(!group){group=document.createElement('div');group.className='application-edit-controls';group.append(toggle);}card.dataset.editable='true';card.querySelector('.comparison-frame').append(group);}
  let editController=null,editTransition=null;
  let variant = 'a';
  let switching = false;
  let switchRevision = 0;
  let loadRevision = 0;
  let controller = new AbortController();
  let urls = [];
  let loading;
  let ready = false;
  let playing = false;
  let revision = 0;
  let callback = null;
  let raf = null;
  let seekRevision = 0;
  let resumeAfterSeek = false;

  function duration() { return Math.min(...videos.map((video) => video.duration)); }
  function cancelClock() {
    if (callback !== null) result.cancelVideoFrameCallback(callback);
    if (raf !== null) cancelAnimationFrame(raf);
    callback = raf = null;
  }
  function pause() {
    card.dataset.playback = 'paused';
    revision++;
    playing = false;
    resumeAfterSeek = false;
    cancelClock();
    videos.forEach((video) => video.pause());
    play.textContent = 'Play';
    play.setAttribute('aria-label', 'Play video pair');
    if (activePair === api) activePair = null;
  }
  function error(reason) {
    if (reason.name === 'AbortError') return;
    pause();
    status.textContent = `Unable to play this pair: ${reason.message}`;
    play.textContent = 'Retry';
    card.dataset.playback = 'error';
  }
  function release() {
    pause();
    seekRevision++;
    loadRevision++;
    controller.abort();
    ready = false;
    videos.forEach((video) => { video.removeAttribute('src'); video.preload = 'none'; video.load(); });
    urls.forEach((url) => URL.revokeObjectURL(url));
    urls = [];
    loading = null;
    play.disabled = switching;
    seek.disabled = true;
    seek.value = '0';
    controller = new AbortController();
  }
  async function load() {
    videos.forEach(hydratePoster);
    if (ready) return;
    if (loading) return loading;
    const loadController = controller;
    const loadTicket = ++loadRevision;
    const signal = loadController.signal;
    const timeout = setTimeout(() => {
      loadController.abort(new DOMException('Video loading timed out', 'TimeoutError'));
    }, 60000);
    play.disabled = true;
    card.dataset.playback = 'loading';
    play.textContent = 'Loading…';
    loading = Promise.all(videos.map(async (video) => {
      // Local blobs preserve reliable seeking on the authenticated static server.
      const response = await fetch(video.dataset.src, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const blob = await response.blob();
      signal.throwIfAborted();
      const url = URL.createObjectURL(blob);
      urls.push(url);
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => finish(new Error('Video loading timed out')), 60000);
        const loaded = () => finish();
        const failed = () => finish(new Error('Video decoding failed'));
        const aborted = () => finish(signal.reason);
        function finish(reason) {
          clearTimeout(timer);
          video.removeEventListener('loadeddata', loaded);
          video.removeEventListener('error', failed);
          signal.removeEventListener('abort', aborted);
          if (reason) reject(reason); else resolve();
        }
        video.addEventListener('loadeddata', loaded);
        video.addEventListener('error', failed);
        signal.addEventListener('abort', aborted, { once: true });
        video.preload = 'auto';
        video.src = url;
        video.load();
      });
    })).then(() => {
      signal.throwIfAborted();
      if (!Number.isFinite(duration()) || duration() <= 0) throw new Error('Invalid video duration');
      ready = true;
      seek.disabled = switching;
    }).catch((reason) => {
      if (controller === loadController) release();
      throw reason;
    }).finally(() => {
      clearTimeout(timeout);
      if (loadTicket === loadRevision) {
        play.disabled = switching;
        if (!playing) play.textContent = 'Play';
      }
    });
    return loading;
  }
  function setTime(video, time) {
    const signal = controller.signal;
    signal.throwIfAborted();
    if (!video.seeking && Math.abs(video.currentTime - time) < .001) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error('Video seeking timed out')), 15000);
      const done = () => finish();
      const aborted = () => finish(signal.reason);
      function finish(reason) {
        clearTimeout(timer);
        video.removeEventListener('seeked', done);
        signal.removeEventListener('abort', aborted);
        if (reason) reject(reason); else resolve();
      }
      video.addEventListener('seeked', done);
      signal.addEventListener('abort', aborted, { once: true });
      video.currentTime = time;
    });
  }
  function clock() {
    callback = raf = null;
    if (!playing) return;
    seek.value = String(Math.round(result.currentTime / duration() * 1000));
    if (!proxy.seeking && Math.abs(proxy.currentTime - result.currentTime) > .08) proxy.currentTime = result.currentTime;
    if (result.requestVideoFrameCallback) callback = result.requestVideoFrameCallback(clock);
    else raf = requestAnimationFrame(clock);
  }
  async function start() {
    if (switching) return;
    const demo=document.querySelector('.intro-standalone-video');
    demo?.dispatchEvent(new Event('demo:pause'));demo?.pause();
    const ticket = ++revision;
    status.textContent = '';
    activePair?.pause();
    activePair = api;
    await load();
    if (ticket !== revision) return;
    const time = result.currentTime >= duration() - .05 ? 0 : result.currentTime;
    await Promise.all(videos.map((video) => setTime(video, time)));
    if (ticket !== revision) return;
    playing = true;
    card.dataset.playback = 'playing';
    try{await Promise.all(videos.map((video) => video.play()));}
    catch(reason){if(ticket!==revision)return;throw reason;}
    if (ticket !== revision) return;
    play.textContent = 'Pause';
    play.setAttribute('aria-label', 'Pause video pair');
    clock();
  }
  function selectSources(target) {
    videos.forEach((video) => {
      video.dataset.src = video.dataset[target === 'a' ? 'srcA' : 'srcB'];
      video.poster = video.dataset[target === 'a' ? 'posterA' : 'posterB'];
      delete video.dataset.poster;
    });
  }
  function updateEditControls() {
    if (!toggle) return;
    card.dataset.variant = variant;
    card.setAttribute('aria-busy', String(switching));
    toggle.disabled=switching;
    sound.disabled=switching;
    const handle=card.querySelector('.comparison-handle');if(handle){handle.tabIndex=switching?-1:0;handle.setAttribute('aria-disabled',String(switching));}
    toggle.setAttribute('aria-pressed',String(variant==='b'));
    toggle.textContent=switching?(variant==='a'?'Applying…':'Restoring…'):(variant==='a'?editLabel:'Restore original');
    if(!switching)card.dataset.editPhase='idle';
    play.disabled = switching;
    seek.disabled = switching || !ready;
  }
  async function switchVersion(target) {
    if (switching || target === variant) return;
    videos.forEach(hydratePoster);
    const ticket = ++switchRevision;
    switching = true;
    pause();
    activePair?.pause();
    activePair = api;
    let playbackTicket;
    status.textContent = '';
    card.dataset.editPhase='preparing';
    updateEditControls();
    editController=new AbortController();
    const operation=editController;
    const visual=createPreviewEditDiff(card,variant==='a'?card.dataset.case:card.dataset.caseB,target==='a'?card.dataset.case:card.dataset.caseB,card.dataset.selection||'',operation.signal,target==='a',{caseLabels});
    editTransition=visual;
    try {
      await visual.freeze();
      operation.signal.throwIfAborted();
      release();activePair=api;playbackTicket=revision;
      selectSources(target);
      await Promise.all([load(),visual.present()]);
      if (ticket !== switchRevision) return;
      variant = target;
      card.dataset.variant=variant;
      await visual.reveal();
    } catch (reason) {
      if (ticket !== switchRevision) return;
      release();
      selectSources(variant);
      status.textContent = `Unable to switch preview: ${reason.message}. The previous version is retained; try the button again.`;
    } finally {
      visual.dispose();
      if (ticket === switchRevision) {
        editController=null;editTransition=null;
        switching = false;
        updateEditControls();
      }
    }
    if (ticket === switchRevision && variant === target && playbackTicket === revision) {
      // A switch reveals both prepared videos together, then starts them from zero.
      if (activePair === api) activePair = null;
      await start().catch(error);
    }
  }
  function dispose() {
    switchRevision++;
    editController?.abort(new DOMException('Preview switch cancelled','AbortError'));editController=null;
    editTransition?.dispose();editTransition=null;
    switching = false;
    release();
    if (toggle) {
      selectSources(variant);
      updateEditControls();
    }
  }
  const pauseOrCancel=()=>{if(switching)dispose();else pause();};
  const api = { pause:pauseOrCancel, release: dispose };
  card.addEventListener('preview:pause', pauseOrCancel);
  previews.push(api);
  toggle?.addEventListener('click', () => switchVersion(variant==='a'?'b':'a'));
  updateEditControls();
  play.addEventListener('click', () => {
    if (playing) pause();
    else start().catch(error);
  });
  seek.addEventListener('input', async () => {
    const resume = playing || resumeAfterSeek;
    pause();
    resumeAfterSeek = resume;
    const ticket = ++seekRevision;
    try {
      const time = Number(seek.value) / 1000 * duration();
      await Promise.all(videos.map((video) => setTime(video, time)));
      if (ticket === seekRevision && resumeAfterSeek) {
        resumeAfterSeek = false;
        await start();
      }
    } catch (reason) { if (ticket === seekRevision) error(reason); }
  });
  sound.addEventListener('click', () => {
    result.muted = !result.muted;
    sound.textContent = result.muted ? 'Sound off' : 'Sound on';
    sound.setAttribute('aria-pressed', String(!result.muted));
  });
  videos.forEach((video) => {
    video.addEventListener('ended', () => {
      if (!playing) return;
      pause();
      seek.value = '1000';
    });
    video.addEventListener('error', () => { if (ready) error(new Error('Video playback failed')); });
  });
  const visibility = new IntersectionObserver(([entry]) => {
    if (!entry.isIntersecting && (playing || activePair === api)) {
      // Layout/scroll animation can deliver an old offscreen notification after a click.
      const box=card.getBoundingClientRect();
      if(box.bottom < -150 || box.top > innerHeight+150 || box.height===0) pause();
    }
  }, { rootMargin: '150px' });
  visibility.observe(card);
  window.addEventListener('pagehide', (event) => {
    if (event.persisted && !switching) pause();
    else {
      if (!event.persisted) visibility.disconnect();
      dispose();
    }
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) previews.forEach((preview) => preview.pause());
});
