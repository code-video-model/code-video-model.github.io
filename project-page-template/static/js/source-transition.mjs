import { diffSources } from './source-diff.mjs?v=1';
import { resolvePublishedScene } from './published-scenes.mjs?v=1';
import { variantSourceContext } from './variant-source-context.mjs?v=2';
import {readResource} from './resource-fetch.mjs';

const sourceCache = new Map();

export async function loadSources(caseId, signal, selectionId) {
  const { base, expectedSHA } = await resolvePublishedScene(caseId, selectionId, signal);
  if (sourceCache.has(base)) return sourceCache.get(base);
  async function get(path, asJSON = false) {
    return readResource(base+path,{signal,type:asJSON?'json':'text',label:`Case ${caseId} source ${path}`});
  }
  const metadata = await get('case.json', true);
  if (metadata.threejs_sha256 !== expectedSHA) throw new Error('Source diff does not match the selected video input');
  const files = await Promise.all(metadata.sources.map(async (entry) => ({
    path: entry.path, text: await get(entry.path), functions: entry.functions || [],
    generatedAdapter: Boolean(entry.generated_adapter),
  })));
  signal.throwIfAborted();
  const source = { files, variant: metadata.provenance?.selected_variant };
  sourceCache.set(base, source);
  return source;
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createSourceTransition(from, to, reducedMotion, selectionId = '') {
  const controller = new AbortController();
  const timers = [];
  const layer = element('div', 'fps-source-transition');
  layer.dataset.fromCase = from;
  layer.dataset.toCase = to;
  const panels = element('div', 'fps-transition-panels');
  const source = element('section', 'fps-transition-panel fps-transition-source');
  source.append(element('h3', '', '01 / Scene program'));
  const summary = element('p', 'fps-diff-summary', `Comparing original source: case ${from} → ${to}`);
  summary.setAttribute('role', 'status');
  source.append(summary, element('p', 'fps-diff-legend', '− Removed (old lines) · + Added (new lines)'));
  const sharedContext = element('div', 'fps-shared-variant-context');
  sharedContext.hidden = true;
  source.append(sharedContext);
  const paths = element('p', 'fps-diff-files');
  source.append(paths);
  const code = element('pre', 'fps-source-diff');
  code.tabIndex = 0;
  code.setAttribute('aria-label', `Actual source changes from case ${from} to case ${to}`);
  code.textContent = 'Reading the original source files…';
  source.append(code, element('p', 'fps-transition-note', 'Real file changes, not execution highlights. Old and new line numbers are shown side by side.'));
  panels.append(source);
  for (const [output, title] of [['threejs', '02 / Three.js + World Inspector'], ['video', '03 / Code Video Model']]) {
    const panel = element('section', 'fps-transition-panel fps-output-loading');
    panel.dataset.output = output;
    panel.setAttribute('aria-busy', 'true');
    panel.append(element('h3', '', title));
    const loading = element('div', 'fps-loading-placeholder');
    const indicator = element('span', 'fps-loading-indicator');
    indicator.setAttribute('aria-hidden', 'true');
    loading.append(indicator, element('strong', 'fps-output-message', 'Loading selected variant…'));
    panel.append(loading);
    if (output === 'threejs') panel.append(element('p', 'fps-transition-note', 'Scene, filming camera and World Inspector reset together.'));
    else panel.append(element('p', 'fps-transition-note', 'Switching a pre-generated result. No live model inference.'));
    panels.append(panel);
  }
  const timeline = element('div', 'fps-transition-panel fps-transition-timeline',
    'Shared timeline · Outputs stay covered for at least 3 seconds and until the selected world is ready.');
  layer.append(panels, timeline);

  async function prepare() {
    const [before, after] = await Promise.all([
      loadSources(from, controller.signal, selectionId), loadSources(to, controller.signal, selectionId),
    ]);
    const files = diffSources(before.files, after.files);
    const contexts = variantSourceContext(before, after, files);
    controller.signal.throwIfAborted();
    if (contexts.length) {
      layer.dataset.sharedVariant = 'true';
      sharedContext.hidden = false;
      sharedContext.append(
        element('p', 'fps-shared-variant-note',
          `Case ${from} → ${to}: shared scene, different selected state. The configuration and implementation below are unchanged original source, not file edits.`),
      );
      const excerpts = element('pre', 'fps-source-diff fps-variant-implementation');
      excerpts.tabIndex = 0;
      excerpts.setAttribute('aria-label', 'Original variant configuration and switching implementation');
      for (const context of contexts) {
        excerpts.append(element('span', 'fps-diff-file', context.path));
        let previous = 0;
        for (const line of context.lines) {
          if (previous && previous + 1 !== line.number) excerpts.append(element('span', 'fps-diff-hunk', '…'));
          const row = element('span', 'fps-shared-source-line');
          row.dataset.sourceLine = line.number;
          row.dataset.file = context.path;
          row.append(element('span', 'fps-diff-numbers', String(line.number).padStart(4)),
            element('span', 'fps-diff-text', line.text));
          excerpts.append(row);
          previous = line.number;
        }
      }
      sharedContext.append(excerpts);
      const raw = element('details', 'fps-selector-diff');
      raw.append(element('summary', '', 'Actual selector change (file diff)'),
        source.querySelector('.fps-diff-legend'), paths, code);
      source.querySelector('.fps-transition-note').textContent =
        'Original source excerpts with real line numbers. Expand below to inspect the actual selector edit.';
      source.append(raw);
    }
    code.replaceChildren();
    let added = 0, removed = 0;
    const hunkNodes = [];
    for (const file of files) {
      added += file.additions;
      removed += file.deletions;
      const filename = element('span', 'fps-diff-file',
        `--- ${file.oldPath ? `${from}/${file.oldPath}` : '/dev/null'}\n+++ ${file.newPath ? `${to}/${file.newPath}` : '/dev/null'}`);
      code.append(filename);
      for (const hunk of file.hunks) {
        const header = element('span', 'fps-diff-hunk',
          `@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`);
        hunkNodes.push(header);
        code.append(header);
        for (const row of hunk.rows) {
          const line = element('span', `fps-diff-line fps-diff-${row.kind}`);
          line.dataset.oldLine = row.beforeLine ?? '';
          line.dataset.newLine = row.afterLine ?? '';
          line.dataset.file = file.newPath || file.oldPath;
          const number = element('span', 'fps-diff-numbers',
            `${String(row.beforeLine ?? '').padStart(4)} ${String(row.afterLine ?? '').padStart(4)} ${row.kind === 'add' ? '+' : row.kind === 'remove' ? '−' : ' '}`);
          line.append(number, element('span', 'fps-diff-text', row.text));
          code.append(line);
        }
      }
      if (file.oldFinalNewline !== file.newFinalNewline) {
        code.append(element('span', 'fps-diff-hunk',
          `Final newline: ${file.oldFinalNewline ? 'present' : 'absent'} → ${file.newFinalNewline ? 'present' : 'absent'}`));
      }
    }
    if (!files.length) code.textContent = 'The original source files are identical.';
    paths.textContent = files.map((file) => file.oldPath === file.newPath ? file.oldPath
      : `${file.oldPath || '/dev/null'} → ${file.newPath || '/dev/null'}`).join(' · ');
    summary.textContent = `Case ${from} → ${to} · ${files.length} changed file${files.length === 1 ? '' : 's'} · +${added} / −${removed} lines`;
    if (contexts.length) summary.textContent = `Case ${from} → ${to} · Shared scene state switch`;
    layer.dataset.diffReady = 'true';
    let manualScroll = false;
    for (const event of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
      code.addEventListener(event, () => { manualScroll = true; }, { signal: controller.signal });
    }
    function showHunk(node, index) {
      if (manualScroll) return;
      code.scrollTo({ top: Math.max(0, node.getBoundingClientRect().top - code.getBoundingClientRect().top + code.scrollTop - 34),
        behavior: reducedMotion ? 'instant' : 'smooth' });
      if (!reducedMotion) {
        let line = node.classList.contains('fps-diff-line') ? node : node.nextElementSibling;
        while (line?.classList.contains('fps-diff-line')) {
          if (!line.classList.contains('fps-diff-equal')) {
            line.animate([{ opacity: .7 }, { opacity: 1 }], { duration: 500, delay: index * 30 });
          }
          line = line.nextElementSibling;
        }
      }
    }
    // Long replacement hunks can contain many deleted lines before any added
    // lines. Bring both real change runs into view, not only the hunk header.
    const focusNodes = [...new Set([
      code.querySelector('.fps-diff-remove'), code.querySelector('.fps-diff-add'), ...hunkNodes.slice(1),
    ].filter(Boolean))];
    (contexts.length ? [] : focusNodes).slice(0, 4).forEach((node, index) => {
      timers.push(setTimeout(() => showHunk(node, index), index * 650));
    });
  }

  return {
    layer, prepare,
    dispose() {
      controller.abort();
      timers.forEach(clearTimeout);
      layer.getAnimations({ subtree: true }).forEach((animation) => animation.cancel());
    },
    fail(message) {
      layer.classList.add('has-error');
      layer.querySelectorAll('.fps-output-loading').forEach((panel) => panel.setAttribute('aria-busy', 'false'));
      layer.querySelectorAll('.fps-output-message').forEach((node) => { node.textContent = 'Unable to load selected variant.'; });
      if (!layer.dataset.diffReady) code.textContent = `Source comparison unavailable: ${message}`;
    },
  };
}
