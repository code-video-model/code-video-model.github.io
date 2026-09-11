import assert from 'node:assert/strict';
import {editPairs,loadLocalSource} from '../scripts/audit_edit_sources.mjs';
import {semanticEditDiff} from '../project-page-template/static/js/semantic-edit-diff.mjs';
for(const pair of editPairs){
 const a=loadLocalSource(pair.a,pair.selection),b=loadLocalSource(pair.b,pair.selection);
 const forward=semanticEditDiff(a,b),back=semanticEditDiff(b,a);
 assert.ok(forward&&back,pair.id+' must not fall back to selector/file diff');
 const lines=(d,kind)=>d.rows.filter(r=>r.kind===kind).map(r=>r.text);
 assert.deepEqual(lines(forward,'add'),lines(back,'remove'),pair.id);
 assert.deepEqual(lines(forward,'remove'),lines(back,'add'),pair.id);
 assert.ok(forward.rows.every(r=>!r.text.includes('setVariant(')),pair.id);
 assert.ok(forward.evidence?.length,pair.id);
 for(const ref of forward.evidence){const snapshot=ref.side==='before'?a:b;assert.ok(snapshot.files.find(f=>f.path===ref.path)?.text.includes(ref.text),pair.id+' evidence');}
 assert.equal(semanticEditDiff(a,a),null,pair.id+' identical inputs');
 console.log('PASS',pair.id,forward.title);
}
assert.equal(semanticEditDiff({files:[],variant:'unknown'},{files:[],variant:'unknown'}),null);
console.log(`PASS all ${editPairs.length} active pairs, both directions, source evidence, no invented fallback`);
