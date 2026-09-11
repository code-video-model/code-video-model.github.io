import {diffSources,diffHunks} from './source-diff.mjs';

function excerpt(snapshot,reference){
 const file=snapshot.files.find(f=>f.path===reference.path);
 if(!file)return null;
 const lines=file.text.split('\n'),start=Math.max(0,reference.line-3);
 return {title:reference.side==='before'?'Previous implementation':'Current implementation',path:file.path,mode:'context',side:reference.side,rows:lines.slice(start,start+7).map((text,i)=>({kind:'context',text,number:start+i+1}))};
}

export function editDiffSegments(before,after,semantic){
 const changes=diffSources(before.files,after.files),segments=[];
 if(semantic){
  const groups=new Map();
  for(const row of semantic.rows.filter(r=>r.kind==='add'||r.kind==='remove')){
   const key=row.changeKey||'state';if(!groups.has(key))groups.set(key,[]);groups.get(key).push(row);
  }
  const entries=[...groups.values()],cut=Math.ceil(entries.length/2);
  for(const group of [entries.slice(0,cut),entries.slice(cut)].filter(g=>g.length)){
   const rows=group.flat(),ref=rows.find(r=>r.reference)?.reference;
   const file=after.files.find(f=>f.path===ref?.path),old=before.files.find(f=>f.path===ref?.path);
   const common=file&&old?file.text.split('\n').slice(Math.max(0,ref.line-4),ref.line+4)
    .filter(text=>text.trim()&&old.text.split('\n').includes(text)&&!(/\b(?:activeVariant|variant)\s*=/.test(text)))
    .slice(0,4).map(text=>({kind:'context',text})):[];
   const names={position:'Object position',rotation:'Orientation',constructor:'Model construction',motion:'Motion update',shutterBottom:'Opening geometry',slatCount:'Panel assembly'};
   segments.push({title:names[rows[0]?.changeKey]||(segments.length?'Dependent state':'Scene state'),path:ref?.path||'',mode:'resolved',context:common,rows});
  }
 }
 // The actual file diff complements resolved semantic changes. The selection
 // entry is a genuine source change too, not a fabricated rewritten main.js.
 for(const file of changes){
  if(segments.length>=3)break;
  const hunk=diffHunks(file.rows,2)[0];if(!hunk)continue;
  // Favor a short, legible local hunk rather than pretending to display a whole file.
  const first=hunk.rows.findIndex(r=>r.kind!=='equal');
  const rows=hunk.rows.slice(Math.max(0,first-2),Math.max(0,first-2)+8);
  segments.push({title:'Source patch',path:file.newPath||file.oldPath,mode:'source',rows:rows.map(r=>({kind:r.kind,text:r.text,number:r.kind==='remove'?r.beforeLine:r.afterLine}))});
 }
 if(segments.length<3&&semantic?.evidence?.length){
  const ref=semantic.evidence.find(r=>r.side==='after')||semantic.evidence[0];
  const context=excerpt(ref.side==='after'?after:before,ref);
  if(context)segments.push(context);
 }
 return segments.slice(0,3);
}
