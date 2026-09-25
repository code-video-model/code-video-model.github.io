import assert from 'node:assert/strict';
import {editPairs,loadLocalSource} from '../scripts/audit_edit_sources.mjs';
import {codePresentation} from '../project-page-template/static/js/code-presentation.mjs';
import {semanticEditDiff} from '../project-page-template/static/js/semantic-edit-diff.mjs';
import {editDiffSegments} from '../project-page-template/static/js/edit-diff-segments.mjs';
import {editVariantLabels,normalizeDisplayIdentifiers} from '../project-page-template/static/js/code-display-names.mjs';
for(const pair of editPairs){
 const a=loadLocalSource(pair.a,pair.selection),b=loadLocalSource(pair.b,pair.selection);
 const labels=editVariantLabels(pair.title,pair.a,pair.b);
 for(const [before,after] of [[a,b],[b,a]]){
  const files=after.files.map(file=>({...file,generated_adapter:file.generatedAdapter}));
  const view=codePresentation(files,after.variant,{},labels);
  assert.equal(view.files.length,files.length);
  for(const file of view.files)assert.equal(file.text,normalizeDisplayIdentifiers(after.files.find(f=>f.path===file.path).text,labels));
  if(after.variant){assert.ok(view.files[0].generated_adapter);assert.ok(view.files[0].text.includes(`setVariant(${JSON.stringify(labels[after.variant])})`));assert.match(view.note(view.files[1]),/Shared implementation/);}
  const visible=[...view.files.map(file=>file.text),...view.files.map(file=>view.label(file)),...view.files.map(file=>view.note(file))].join('\n');
  for(const id of [pair.a,pair.b])assert.doesNotMatch(visible,new RegExp(`\\b${id}\\b`),pair.id);
  const segments=editDiffSegments(before,after,semanticEditDiff(before,after));
  assert.ok(segments.length>=2&&segments.length<=3,pair.id);
  for(const segment of segments){
   for(const row of segment.rows){
    if(segment.mode==='resolved'&&row.reference){const state=row.reference.side==='before'?before:after;assert.ok(state.files.find(f=>f.path===row.reference.path).text.includes(row.reference.text));}
    if(row.number){const state=row.kind==='remove'||segment.side==='before'?before:after;assert.equal(state.files.find(f=>f.path===segment.path).text.split('\n')[row.number-1],row.text,pair.id);}
   }
  }
 }
}
assert.throws(()=>codePresentation([], 'invalid'),/matching source entry/);
console.log(`PASS all ${editPairs.length} pairs forward/reverse: exact active source entry, unmodified files and source-backed multi-segment diffs.`);
