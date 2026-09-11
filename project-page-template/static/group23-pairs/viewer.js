const $ = (id) => document.getElementById(id);
const lifetime = new AbortController();
let data;
let players = [];
let generation = 0;
let caseViews = [];

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function makePlayer(asset, title) {
  const figure = element('figure');
  figure.append(element('figcaption', '', title));
  const stage = element('div', 'video-stage');
  const video = element('video');
  video.controls = true;
  video.playsInline = true;
  video.preload = 'none';
  video.muted = true;
  video.loop = true;
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

function batch() {
  return data.batches.find((entry) => entry.id === $('batch').value);
}

function batchCases() {
  const current = batch();
  return current.cases.concat(document.body.dataset.pairedResults === 'true' ? current.counterparts || [] : []);
}

function visibleCases() {
  return batchCases().filter((entry) => entry.section === $('section').value
    && (!$('version')?.value || entry.referenceVersion === $('version').value));
}

function options(select, entries, selected) {
  select.replaceChildren(...entries.map(([value, label]) => {
    const option = element('option', '', label);
    option.value = value;
    return option;
  }));
  if (entries.some(([value]) => value === selected)) select.value = selected;
}

function resetBatch() {
  options($('section'), [...new Set(batchCases().map((entry) => entry.section))]
    .map((name) => [name, name]), $('section').value);
  const groups = batch().cases[0].results;
  options($('group'), data.groupOptions || [['', 'All references'], ...groups.map((result) =>
    [result.group, `${result.version} / ${result.label}`])], '');
  resetCases();
}

function resetCases() {
  if ($('version')) {
    const versions = [...new Set(batchCases().filter((entry) => entry.section === $('section').value)
      .map((entry) => entry.referenceVersion))].sort((a, b) => Number(a.slice(1)) - Number(b.slice(1)));
    options($('version'), [['', 'All versions'], ...versions.map((version) => [version, version])], $('version').value);
  }
  options($('case'), [['', 'Top of section'], ...visibleCases().map((entry) => [
    entry.id, `Case ${entry.id}${entry.origin === 'original-experiment' ? ' · Original experiment' : ''}`,
  ])], '');
}

function originBadge(current) {
  if (batch().id !== 'reference-updates') return null;
  const reused = current.origin === 'original-experiment';
  return element('p', `result-origin ${reused ? 'origin-original' : 'origin-updated'}`,
    reused ? 'Original · reused' : 'Reference updated');
}

function reference(asset, label) {
  const link = element('a', 'reference');
  link.href = asset.url;
  link.target = '_blank';
  link.rel = 'noopener';
  const image = element('img');
  image.src = asset.url;
  image.alt = label;
  image.loading = 'lazy';
  link.append(image, element('span', '', label));
  return link;
}

function sourcePlayer(current) {
  const player = makePlayer(current.source, batch().sourceLabel ||
    (batch().id === 'threejs-v2' ? 'Three.js v2 input' : 'Original Three.js input'));
  player.figure.classList.add('source-card');
  player.figure.dataset.case = current.id;
  return player;
}

function resultPlayer(result, current) {
  const player = makePlayer(result.video, `${result.label} · ${result.version}`);
  player.figure.classList.add('result-card');
  player.figure.dataset.case = current.id;
  player.figure.dataset.group = result.group;
  player.figure.dataset.origin = current.origin || (batch().id === 'reference-updates' ? 'reference-updated' : 'current-batch');
  const badge = originBadge(current);
  if (badge) player.figure.insertBefore(badge, player.figure.querySelector('.video-stage'));
  const refs = element('div', 'references');
  if (!current.reference) refs.append(reference(result.reference, 'Used reference'));
  if (result.before) {
    refs.append(reference(result.before, 'Before update'), reference(result.anchor, `Anchor ${result.anchorId}`));
  }
  if (refs.childElementCount) player.figure.append(refs);
  if (result.updateMode) {
    const labels = {
      'anchor-local-edit': 'Edited from anchor',
      'shared_initial': 'Shared initial state',
      'existing_target_state': 'Anchor already matches target state',
      'route-neutral-reference': 'Route-neutral reference edit',
    };
    player.figure.append(element('p', 'update-mode',
      result.reusedAnchor ? `Reference reused from anchor ${result.anchorId}` : labels[result.updateMode]));
  }
  if (result.provenance?.origin === 'original-experiment') {
    const provenance = result.provenance;
    if (provenance.algorithm_revision !== provenance.updated_algorithm_revision) {
      player.figure.append(element('p', 'revision-note',
        'Historical implementation revision differs from the updated run; see provenance.'));
    }
    const details = element('details', 'result-provenance');
    details.append(element('summary', '', 'Original-run provenance'));
    const fields = element('dl');
    for (const [label, value] of [
      ['Original run', provenance.original_run],
      ['Generation seed', provenance.generation_seed],
      ['Original revision', provenance.algorithm_revision],
      ['Updated revision', provenance.updated_algorithm_revision],
      ['Model checkpoint SHA256', provenance.model_checkpoint_sha256],
      ['Original Three.js SHA256', provenance.source_video_sha256],
    ]) fields.append(element('dt', '', label), element('dd', '', value));
    details.append(fields);
    player.figure.append(details);
  }
  return player;
}

function promptDetails(current) {
  const details = element('details');
  details.dataset.case = current.id;
  details.append(element('summary', '', data.promptLabel || 'Input prompt'), element('p', 'case-prompt', current.prompt));
  return details;
}

function syncControls(active, fps, scope) {
  const actions = element('div', 'actions');
  const runButton = element('button', 'sync-run', 'Sync in Run');
  const stopButton = element('button', 'sync-stop', 'Sync in Stop');
  runButton.type = stopButton.type = 'button';
  actions.append(runButton, stopButton);
  const status = element('p', 'case-status');
  status.setAttribute('role', 'status');
  players.push(...active);
  let operation = 0;
  function pause() {
    operation++;
    active.forEach((player) => player.pause());
  }
  async function synchronize(run) {
    pause();
    const ticket = operation;
    const version = generation;
    const button = run ? runButton : stopButton;
    const time = run ? 0 : Math.floor(Math.min(...active.map((player) => player.video.currentTime)) * fps) / fps;
    button.disabled = true;
    status.classList.remove('error');
    status.textContent = `Synchronizing this ${scope}…`;
    try {
      await Promise.all(active.map((player) => player.load()));
      if (ticket !== operation || version !== generation) return;
      await Promise.all(active.map((player) => player.seek(time)));
      if (ticket !== operation || version !== generation) return;
      if (run) await Promise.all(active.map((player) => player.play()));
      if (ticket === operation && version === generation) status.textContent = '';
    } catch (error) {
      if (ticket === operation && version === generation && error.name !== 'AbortError') {
        active.forEach((player) => player.pause());
        status.classList.add('error');
        status.textContent = `Unable to synchronize this ${scope}: ${error.message}`;
      }
    } finally {
      if (version === generation) button.disabled = false;
    }
  }
  runButton.addEventListener('click', () => synchronize(true));
  stopButton.addEventListener('click', () => synchronize(false));
  caseViews.push({ pause });
  return { actions, status };
}

function renderCase(current) {
  const article = element('article', 'case-card');
  article.id = `case-${current.id}`;
  article.dataset.case = current.id;
  const heading = element('div', 'case-heading');
  const title = element('h3', '', `Case ${current.id}`);
  title.id = `case-title-${current.id}`;
  article.setAttribute('aria-labelledby', title.id);
  const grid = element('div', 'results-grid');
  const active = [];
  if (current.reference) {
    grid.classList.add('reference-comparison');
    const image = element('figure', 'source-card input-reference');
    image.append(element('figcaption', '', 'Reference image'), reference(current.reference, 'Open full image'));
    grid.append(image);
  }
  const source = sourcePlayer(current);
  active.push(source);
  grid.append(source.figure);
  for (const result of current.results.filter((result) => !$('group').value || result.group === $('group').value)) {
    const player = resultPlayer(result, current);
    active.push(player);
    grid.append(player.figure);
  }
  const { actions, status } = syncControls(active, current.fps || 24, 'case');
  heading.append(title, actions);
  article.append(heading);
  if (current.settings) article.append(element('p', 'muted case-settings', current.settings));
  article.append(promptDetails(current), status, grid);
  return article;
}

function renderPair(pair, cases) {
  const [a, b, label] = pair;
  const members = [a, b].map((id) => cases.find((entry) => entry.id === id));
  const article = element('article', 'case-card case-pair');
  article.id = `pair-${a}-${b}`;
  article.dataset.pair = `${a}-${b}`;
  const title = element('h3', '', `${a} ↔ ${b} · ${label}`);
  title.id = `pair-title-${a}-${b}`;
  article.setAttribute('aria-labelledby', title.id);
  const heading = element('div', 'case-heading');
  const columns = element('div', 'pair-columns');
  [a, b].forEach((id, index) => {
    const column = element('div', 'pair-case-heading');
    column.id = `case-${id}`;
    column.dataset.case = id;
    column.dataset.present = String(Boolean(members[index]));
    column.append(element('h4', '', `${index === 0 ? 'A' : 'B'} · Case ${id}`));
    if (members[index]) {
      const badge = originBadge(members[index]);
      if (badge) column.append(badge);
      if (members[index].settings) column.append(element('p', 'muted case-settings', members[index].settings));
      column.append(promptDetails(members[index]));
    } else column.append(element('p', 'muted', 'Counterpart not included in this batch'));
    columns.append(column);
  });
  const active = [];
  const rows = element('div', 'pair-rows');
  function addPlayer(player, index) {
    player.figure.querySelector('figcaption').prepend(`${index === 0 ? 'A' : 'B'} · Case ${pair[index]} · `);
    active.push(player);
    return player.figure;
  }
  function missing(id, counterpart, text) {
    const cell = element('div', 'pair-missing');
    cell.dataset.missingCase = id;
    cell.append(element('strong', '', `Case ${id}`), element('p', '', text));
    if (counterpart?.anchor && String(counterpart.anchorId) === id) {
      cell.append(reference(counterpart.anchor, 'Anchor reference only · No video in this batch'));
    }
    return cell;
  }
  function row(title, cells, group) {
    const section = element('section', 'pair-row');
    if (group) section.dataset.group = group;
    section.append(element('h4', '', title));
    const grid = element('div', 'pair-columns');
    grid.append(...cells);
    section.append(grid);
    rows.append(section);
  }
  row('Three.js inputs', members.map((member, index) => {
    if (!member) return missing(pair[index], null, 'Three.js input not included in this batch.');
    return addPlayer(sourcePlayer(member), index);
  }));
  if (members.some((member) => member?.reference)) {
    row('Input references', members.map((member, index) => member?.reference
      ? reference(member.reference, `Case ${pair[index]} reference`)
      : missing(pair[index], null, 'Input reference not included in this batch.')));
  }
  const groupRows = new Map();
  members.forEach((member) => member?.results.forEach((result) => {
    if (!$('group').value || result.group === $('group').value) {
      groupRows.set(`${result.group}/${result.version}`, result);
    }
  }));
  for (const result of groupRows.values()) {
    const matched = members.map((member) => member?.results.find((entry) =>
      entry.group === result.group && entry.version === result.version));
    row(`${result.label} · ${result.version}`, matched.map((entry, index) => {
      if (!entry?.video) return missing(pair[index], matched[1 - index], entry
        ? `${entry.status || 'Pending'} · Result not ready`
        : 'Generated result not included in this batch / group.');
      return addPlayer(resultPlayer(entry, members[index]), index);
    }), result.group);
  }
  const { actions, status } = syncControls(active, members.find(Boolean).fps || 24, 'pair');
  heading.append(title, actions);
  article.append(heading);
  if (members.some((member) => !member)) {
    article.append(element('p', 'pair-note',
      'This batch includes only one side of this pair. Missing videos are not borrowed from another batch; anchor images are reference-only.'));
  } else if (members.some((member) => member.origin === 'original-experiment')) {
    article.append(element('p', 'pair-reuse-note',
      'Original experiment results are reused, not rerun. Group, model and sampling settings match; each side retains its verified original inputs and reference.'));
  }
  article.append(status, columns, rows);
  return article;
}

function renderEntries(cases) {
  const pairs = document.body.dataset.pairedResults === 'true' && data.pairs?.[$('section').value];
  if (!pairs) return cases.map(renderCase);
  const rendered = new Set();
  const articles = [];
  for (const current of cases) {
    const pair = pairs.find(([a, b]) => current.id === a || current.id === b);
    if (!pair) {
      articles.push(renderCase(current));
    } else if (!rendered.has(pair)) {
      articles.push(renderPair(pair, cases));
      rendered.add(pair);
    }
  }
  return articles;
}

function render() {
  generation++;
  players.forEach((player) => player.dispose());
  players = [];
  caseViews = [];
  $('case-list').replaceChildren();
  $('status').textContent = '';
  $('status').classList.remove('error');
  $('case').value = '';
  const cases = visibleCases();
  if (!cases.length) throw new Error('No cases in this section');
  $('section-title').textContent = $('section').value;
  $('batch-description').textContent = batch().description
    + (batch().counterpartCount ? ' Original counterpart videos are reused, not new runs.' : '');
  $('case-list').append(...renderEntries(cases));
  const pairCount = document.querySelectorAll('.case-pair').length;
  const missing = document.querySelectorAll('.pair-case-heading[data-present="false"]').length;
  const reused = document.querySelectorAll('.result-card[data-origin="original-experiment"]').length;
  const resultCount = document.querySelectorAll('.result-card').length;
  $('result-count').textContent = `${pairCount ? `${pairCount} pairs · ` : ''}${cases.length} cases · ${resultCount} results shown`
    + (reused ? ` (${resultCount - reused} updated + ${reused} original)` : '')
    + (missing ? ` · ${missing} counterpart cases not included in this batch` : '');
  $('section-view').hidden = false;
  const url = new URL(location.href);
  url.searchParams.set('batch', batch().id);
  url.searchParams.set('section', $('section').value);
  url.searchParams.delete('case');
  url.hash = '';
  if ($('group').value) url.searchParams.set('group', $('group').value); else url.searchParams.delete('group');
  if ($('version')?.value) url.searchParams.set('version', $('version').value); else url.searchParams.delete('version');
  history.replaceState(history.state, '', url);
}

function fail(error) {
  if (error.name === 'AbortError') return;
  console.error(error);
  $('status').classList.add('error');
  $('status').textContent = error.message;
}

$('batch').addEventListener('change', () => { resetBatch(); render(); });
$('section').addEventListener('change', () => { resetCases(); render(); });
$('case').addEventListener('change', () => {
  const id = $('case').value;
  const target = id ? document.getElementById(`case-${id}`) : $('section-view');
  const url = new URL(location.href);
  url.hash = id ? `case-${id}` : '';
  history.replaceState(history.state, '', url);
  target.scrollIntoView({ block: 'start', behavior: 'instant' });
});
$('group').addEventListener('change', render);
$('version')?.addEventListener('change', () => { resetCases(); render(); });

async function initialize() {
  const response = await fetch(document.body.dataset.manifest || 'static/refresh-results/manifest.json',
    { signal: lifetime.signal });
  if (!response.ok) throw new Error(`Results manifest: HTTP ${response.status}`);
  data = await response.json();
  const expected = Number(document.body.dataset.resultCount || 234);
  if (!Array.isArray(data.batches) || !data.batches.length || data.count !== expected ||
      data.batches.reduce((total, batch) => total + batch.cases.reduce((sum, entry) => sum + entry.results.length, 0), 0) !== expected) {
    throw new Error('Incomplete results manifest');
  }
  let counterpartCount = 0;
  for (const entry of data.batches) {
    const counterparts = entry.counterparts || [];
    if (!Array.isArray(counterparts) || counterparts.some((item) =>
      item.origin !== 'original-experiment' || !Array.isArray(item.results))) {
      throw new Error('Invalid original counterpart manifest');
    }
    const count = counterparts.reduce((sum, item) => sum + item.results.length, 0);
    const ids = entry.cases.concat(counterparts).map((item) => item.id);
    if (count !== (entry.counterpartCount || 0) || new Set(ids).size !== ids.length) {
      throw new Error('Incomplete or duplicate original counterparts');
    }
    counterpartCount += count;
  }
  if ($('result-summary')) {
    $('result-summary').textContent = data.summaryText
      || `${data.count} completed refresh videos · ${counterpartCount} original experiment videos reused for pairs`;
  }
  $('settings').textContent = data.settings;
  const url = new URL(location.href);
  const requestedBatch = url.searchParams.get('batch') || data.batches[0].id;
  if (!data.batches.some((entry) => entry.id === requestedBatch)) throw new Error('Unknown experiment batch');
  options($('batch'), data.batches.map((entry) => [
    entry.id, `${entry.label} (${entry.count}${entry.counterpartCount ? ` + ${entry.counterpartCount} originals` : ''})`,
  ]), requestedBatch);
  resetBatch();
  const requestedCase = url.searchParams.get('case') || (url.hash.startsWith('#case-') ? url.hash.slice(6) : '');
  if (url.searchParams.has('section')) {
    if (![...$('section').options].some((option) => option.value === url.searchParams.get('section'))) throw new Error('Unknown section');
    $('section').value = url.searchParams.get('section');
  }
  if (requestedCase) {
    const entry = batchCases().find((entry) => entry.id === requestedCase);
    if (!entry) throw new Error('Unknown case in this batch');
    if (url.searchParams.has('section') && entry.section !== $('section').value) throw new Error('Case does not belong to this section');
    $('section').value = entry.section;
  }
  resetCases();
  if ($('version') && url.searchParams.has('version')) {
    if (![...$('version').options].some((option) => option.value === url.searchParams.get('version'))) throw new Error('Unknown input version');
    $('version').value = url.searchParams.get('version');
    if (requestedCase && !visibleCases().some((entry) => entry.id === requestedCase)) throw new Error('Case does not belong to this version');
    resetCases();
  }
  if (url.searchParams.has('group')) {
    if (![...$('group').options].some((option) => option.value === url.searchParams.get('group'))) throw new Error('Unknown reference group');
    $('group').value = url.searchParams.get('group');
  }
  for (const id of ['batch', 'section', 'case', 'group']) $(id).disabled = false;
  if ($('version')) $('version').disabled = false;
  render();
  if (requestedCase) {
    $('case').value = requestedCase;
    $('case').dispatchEvent(new Event('change'));
  }
}

window.addEventListener('pagehide', (event) => {
  caseViews.forEach((view) => view.pause());
  if (event.persisted) return;
  generation++;
  lifetime.abort();
  players.forEach((player) => player.dispose());
});
initialize().catch(fail);
