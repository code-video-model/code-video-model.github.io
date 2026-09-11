import {readResource} from './resource-fetch.mjs';
const readManifest=(path,signal)=>readResource(path,{signal,cache:'no-store',label:'Published scene manifest'});

export async function resolvePublishedScene(caseId, selectionId, signal) {
  const manifest = await readManifest('static/project-page-cases/prompts.json', signal);
  const item = manifest.items.find((entry) => String(entry.case_id) === caseId);
  if (!item) throw new Error('Unknown published scene');
  let selection, asset;
  let directory = item.interactive_source || `${caseId}/`;
  let expectedSHA = item.threejs_sha256;
  if (selectionId) {
    const registry = await readManifest('static/interactive/experiment-pairs.json', signal);
    selection = registry.pairs.find((entry) => entry.id === selectionId);
    asset = selection?.assets[caseId];
    if (!selection || ![selection.a, selection.b].includes(caseId) || !asset) {
      throw new Error('Experiment selection is unavailable');
    }
    expectedSHA = asset.threejs_sha256;
    if (asset.interactive_source) directory = asset.interactive_source;
    else if (expectedSHA !== item.threejs_sha256) {
      if (expectedSHA !== item.original_threejs?.sha256) throw new Error('Experiment scene revision is unavailable');
      directory = item.original_threejs.interactive_source;
    }
  }
  if (!/^[a-zA-Z0-9/_-]+\/$/.test(directory) || directory.startsWith('/')) {
    throw new Error('Invalid published source directory');
  }
  return { item, selection, asset, expectedSHA, base: `static/interactive/${directory}` };
}
