import { makePlayer } from './result-media.js?v=1';

const $ = id => document.getElementById(id);
const labels = { new: 'New 2x result', reuse: 'Existing 2x result', already: 'Already upscaled' };
let entries = [];
let visible = [];
let state = null;

function node(tag, text, className) {
  const el = document.createElement(tag);
  if (text !== undefined) el.textContent = text;
  if (className) el.className = className;
  return el;
}

function currentFrame(s = state) {
  return Math.min(s.entry.current.frames - 1, Math.round(s.players[0].video.currentTime * s.entry.current.fps));
}

function showTime(frame) {
  if (!state) return;
  $('timeline').value = frame;
  $('time').textContent = `${(frame / state.entry.current.fps).toFixed(2)}s / ${state.entry.current.frames}f`;
}

function pause(s) {
  s.playing = false;
  s.wantPlay = false;
  s.players.forEach(p => p.pause());
}

function error(message) {
  $('status').classList.add('error');
  $('status').textContent = message;
}

// Serialize seeks, discarding obsolete requests before they touch either video.
function transport(frame, running = false) {
  const s = state;
  if (!s) return Promise.resolve();
  const ticket = ++s.ticket;
  const active = () => state === s && ticket === s.ticket;
  pause(s);
  s.wantPlay = running;
  frame = Math.max(0, Math.min(s.entry.current.frames - 1, frame));
  showTime(frame);
  $('play').textContent = running ? 'Loading...' : 'Play both';
  $('status').classList.remove('error');
  $('status').textContent = 'Loading / synchronizing...';
  s.queue = s.queue.then(async () => {
    if (!active()) return;
    await Promise.all(s.players.map(p => p.load()));
    if (!active()) return;
    await Promise.all(s.players.map(p => p.seek(frame / s.entry.current.fps)));
    if (!active()) return;
    if (running) {
      await Promise.all(s.players.map(p => p.play()));
      if (!active()) return;
      s.playing = true;
    }
    $('play').textContent = running ? 'Pause both' : s.players.length === 1 ? 'Play' : 'Play both';
    $('status').textContent = running ? 'Synchronized playback' : `Paused on frame ${frame + 1}`;
  }).catch(reason => {
    if (!active()) return;
    pause(s);
    $('play').textContent = 'Retry';
    error(`Unable to synchronize: ${reason.message}`);
  });
  return s.queue;
}

function dispose() {
  if (!state) return;
  state.ticket++;
  pause(state);
  state.players.forEach(p => p.dispose());
  state = null;
}

function mediaLabel(asset) {
  return `${asset.width} x ${asset.height} / ${asset.fps} FPS`;
}

function setMode() {
  const single = state && !state.entry.upscaled;
  $('comparison').className = `mode-${$('mode').value}${single ? ' single' : ''}`;
  $('mode').disabled = Boolean(single);
  $('wipe-label').hidden = single || $('mode').value !== 'wipe';
}

function select(entry) {
  dispose();
  const assets = [entry.current, ...(entry.upscaled ? [entry.upscaled] : [])];
  const players = assets.map((asset, i) => {
    const p = makePlayer({ ...asset, loop: false }, i ? 'SeedVR2 2x result' : 'Current Project Page video');
    p.video.controls = false;
    p.video.addEventListener('error', () => {
      if (state?.entry === entry && p.video.error) error('Video decode failed. Use Play to retry or open the video directly.');
    });
    return p;
  });
  state = { entry, players, ticket: 0, queue: Promise.resolve(), playing: false, wantPlay: false };
  $('panes').replaceChildren(...players.map(p => p.figure));
  $('comparison').style.setProperty('--ratio', `${entry.current.width} / ${entry.current.height}`);
  $('comparison').style.setProperty('--origin', '50% 50%');
  $('viewer').hidden = false;
  $('empty').hidden = true;
  $('category').textContent = entry.section_title;
  $('title').textContent = `${entry.number.toString().padStart(2, '0')} / ${entry.title}${entry.side ? ` / Side ${entry.side}` : ''}`;
  $('setting').textContent = `Case ${entry.id} | ${entry.setting}`;
  $('case-note').textContent = entry.kind === 'already'
    ? 'Already displayed upscaled on the Project Page. This is the current video, not a new upscale or a before/after pair.'
    : entry.published_to_project_page
      ? 'Published: the Project Page now uses the 2x result on the right. The left retains the pre-replacement video for comparison.'
      : `${labels[entry.kind]} matched to the exact current generation. Left: current Project Page video. Right: SeedVR2 2x result.`;
  $('current-label').textContent = `${entry.published_to_project_page ? 'Before replacement' : 'Current'} / ${mediaLabel(entry.current)}`;
  $('upscale-label').textContent = entry.upscaled ? `SeedVR2 2x / ${mediaLabel(entry.upscaled)}` : 'Already displayed upscaled';
  $('timeline').max = entry.current.frames - 1;
  $('play').textContent = players.length === 1 ? 'Play' : 'Play both';
  $('status').classList.remove('error');
  $('status').textContent = 'Click Play or choose a frame to load this comparison.';
  $('current-download').href = entry.current.url;
  $('current-download').textContent = entry.published_to_project_page ? 'Open pre-replacement video' : 'Open current video';
  $('upscale-download').hidden = !entry.upscaled;
  if (entry.upscaled) $('upscale-download').href = entry.upscaled.url;
  const params = new URLSearchParams({ case: entry.id });
  if (entry.selection) params.set('selection', entry.selection);
  $('gallery-link').href = `gallery.html?${params}#${entry.section}`;
  $('provenance').textContent = JSON.stringify({
    case: entry.id, selection: entry.selection, status: labels[entry.kind],
    current_sha256: entry.current.sha256, ...entry.provenance,
  }, null, 2);
  showTime(0);
  setMode();
  setSound(false);
  for (const button of $('case-list').querySelectorAll('button')) {
    button.setAttribute('aria-current', String(Number(button.dataset.number) === entry.number));
  }
  $('previous').disabled = visible.indexOf(entry) <= 0;
  $('next').disabled = visible.indexOf(entry) >= visible.length - 1;
  history.replaceState(null, '', `#video-${entry.number}`);
}

function filter() {
  const query = $('search').value.trim().toLowerCase();
  visible = entries.filter(e => (!$('section').value || e.section === $('section').value)
    && (!$('kind').value || e.kind === $('kind').value)
    && `${e.id} ${e.title} ${e.setting}`.toLowerCase().includes(query));
  const fragment = document.createDocumentFragment();
  let section;
  for (const entry of visible) {
    if (entry.section !== section) {
      fragment.append(node('h3', entry.section_title, 'group-title'));
      section = entry.section;
    }
    const button = node('button', undefined, 'case-button');
    button.dataset.number = entry.number;
    const thumb = node('img');
    Object.assign(thumb, { src: entry.current.poster, alt: '', loading: 'lazy', width: 74, height: 43 });
    const text = node('span');
    text.append(node('strong', `${entry.number}. ${entry.title}${entry.side ? ` / ${entry.side}` : ''}`),
      node('small', `Case ${entry.id} / ${labels[entry.kind]}`));
    button.append(thumb, text);
    button.onclick = () => select(entry);
    fragment.append(button);
  }
  $('case-list').replaceChildren(fragment);
  $('list-count').textContent = `${visible.length} of ${entries.length} selected videos`;
  const selected = state?.entry;
  if (!visible.length) {
    dispose();
    $('panes').replaceChildren();
    $('viewer').hidden = true;
    $('empty').hidden = false;
  } else if (!visible.includes(selected)) {
    select(visible[0]);
  } else {
    $('case-list').querySelector(`[data-number="${selected.number}"]`).setAttribute('aria-current', 'true');
    $('previous').disabled = visible.indexOf(selected) <= 0;
    $('next').disabled = visible.indexOf(selected) >= visible.length - 1;
  }
}

function setSound(on) {
  if (!state) return;
  state.players.forEach((p, i) => { p.video.muted = i !== 0 || !on; });
  $('sound').setAttribute('aria-pressed', String(on));
  $('sound').textContent = on ? 'Sound on' : 'Sound off';
}

$('section').onchange = filter;
$('kind').onchange = filter;
$('search').oninput = filter;
$('mode').onchange = setMode;
$('wipe').oninput = () => $('comparison').style.setProperty('--wipe', `${$('wipe').value}%`);
$('zoom').onchange = () => $('comparison').style.setProperty('--zoom', $('zoom').value);
$('panes').onpointermove = event => {
  const stage = event.target.closest('.video-stage');
  if (!stage || $('zoom').value === '1') return;
  const rect = stage.getBoundingClientRect();
  const x = Math.max(0, Math.min(100, (event.clientX - rect.left) / rect.width * 100));
  const y = Math.max(0, Math.min(100, (event.clientY - rect.top) / rect.height * 100));
  $('comparison').style.setProperty('--origin', `${x}% ${y}%`);
};
$('timeline').oninput = () => transport(Number($('timeline').value));
$('back').onclick = () => transport(Number($('timeline').value) - 1);
$('forward').onclick = () => transport(Number($('timeline').value) + 1);
$('play').onclick = () => {
  if (!state) return;
  const frame = currentFrame();
  transport(!state.wantPlay && frame >= state.entry.current.frames - 1 ? 0 : frame, !state.wantPlay);
};
$('sound').onclick = () => setSound($('sound').getAttribute('aria-pressed') !== 'true');
$('previous').onclick = () => select(visible[visible.indexOf(state.entry) - 1]);
$('next').onclick = () => select(visible[visible.indexOf(state.entry) + 1]);
$('fullscreen').onclick = async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await $('viewer').requestFullscreen();
  } catch (reason) { error(`Fullscreen unavailable: ${reason.message}`); }
};

function tick() {
  if (state?.playing) {
    const leader = state.players[0].video;
    showTime(currentFrame());
    if (leader.ended) {
      transport(state.entry.current.frames - 1);
    } else {
      for (const p of state.players.slice(1)) {
        if (!p.video.seeking && Math.abs(p.video.currentTime - leader.currentTime) > 2 / state.entry.current.fps) {
          p.video.currentTime = leader.currentTime;
        }
      }
    }
  }
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
document.addEventListener('visibilitychange', () => {
  if (document.hidden && state?.playing) transport(currentFrame());
});
window.addEventListener('pagehide', event => {
  if (event.persisted && state) { state.ticket++; pause(state); $('play').textContent = 'Play'; }
  else dispose();
});

async function main() {
  const response = await fetch('static/current-upscale-comparison/manifest.json', { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Manifest HTTP ${response.status}`);
  const data = await response.json();
  if (!data.count || data.cases.length !== data.count) throw new Error('Incomplete comparison manifest');
  entries = data.cases;
  $('summary').textContent = `${data.count} selected videos / ${data.counts.new} new 2x results / ${data.counts.reuse} existing 2x results / ${data.counts.already} already displayed upscaled`;
  for (const [id, title] of new Map(entries.map(e => [e.section, e.section_title]))) {
    const option = node('option', title);
    option.value = id;
    $('section').append(option);
  }
  const initial = Number(location.hash.match(/^#video-(\d+)$/)?.[1]);
  filter();
  const chosen = entries.find(e => e.number === initial);
  if (chosen && chosen !== state?.entry) select(chosen);
}
main().catch(reason => { $('error').textContent = `Unable to load comparisons: ${reason.message}`; });
