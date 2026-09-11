import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {semanticEditDiff} from '../project-page-template/static/js/semantic-edit-diff.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../project-page-template');
const read=p=>JSON.parse(fs.readFileSync(path.join(root,p),'utf8'));
const items=read('static/project-page-cases/prompts.json').items;
const pairs=read('static/interactive/experiment-pairs.json').pairs;
const registry=Object.values(read('../scripts/data/case-catalog.json').entries).filter(e=>e.active&&e.b);
export function loadLocalSource(caseId,selection){
 const item=items.find(i=>String(i.case_id)===caseId),asset=pairs.find(p=>p.id===selection)?.assets[caseId];
 let directory=asset?.interactive_source||item.interactive_source||caseId+'/';
 const expectedSHA=asset?.threejs_sha256||item.threejs_sha256;
 if(asset&&!asset.interactive_source&&asset.threejs_sha256!==item.threejs_sha256)directory=item.original_threejs.interactive_source;
 const base='static/interactive/'+directory,meta=read(base+'case.json');
 if(meta.threejs_sha256!==expectedSHA)throw new Error('Mismatched source '+caseId);
 return {base,variant:meta.provenance?.selected_variant,files:meta.sources.map(f=>({path:f.path,text:fs.readFileSync(path.join(root,base,f.path),'utf8'),functions:f.functions||[],generatedAdapter:!!f.generated_adapter}))};
}
export const editPairs=registry;
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const report=registry.map(e=>{const a=loadLocalSource(e.a,e.selection),b=loadLocalSource(e.b,e.selection);return {id:e.id,a:e.a,b:e.b,selection:e.selection,title:e.title,base:a.base,variantA:a.variant,variantB:b.variant,semantic:semanticEditDiff(a,b)?.title||null};});
 console.log(JSON.stringify(report,null,2));
}
