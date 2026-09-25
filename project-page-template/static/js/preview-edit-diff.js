import {loadSources} from './source-transition.mjs';
import {diffSources,diffHunks} from './source-diff.mjs';
import {semanticEditDiff} from './semantic-edit-diff.mjs';
import {editDiffSegments} from './edit-diff-segments.mjs';
import {normalizeDisplayIdentifiers} from './code-display-names.mjs';

export function createPreviewEditDiff(card,from,to,selection,signal,restoring,options={}){
 const frame=card.querySelector('.comparison-frame'),controller=new AbortController(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
 const labels=options.caseLabels||{},display=id=>labels[id]||id;
 const abort=()=>controller.abort(signal.reason);signal.addEventListener('abort',abort,{once:true});
 const local=controller.signal;
 const layer=document.createElement('section');layer.className='preview-code-diff';layer.dataset.fromCase=from;layer.dataset.toCase=to;
 layer.setAttribute('aria-label',`Scene changes from ${display(from)} to ${display(to)}`);
 const heading=document.createElement('strong');heading.className='preview-diff-heading';heading.textContent=restoring?'Restoring original':'Applying scene edit';
 const code=document.createElement('pre');code.className='preview-diff-code';code.textContent='Reading scene parameters…';
 const note=document.createElement('span');note.className='preview-diff-note';note.textContent='Source-derived excerpt · pre-rendered video';
 layer.append(heading,code,note);
 let freeze;
 function wait(ms){return new Promise((resolve,reject)=>{
  local.throwIfAborted();const done=()=>{clearTimeout(timer);local.removeEventListener('abort',cancel);resolve();};
  const cancel=()=>{clearTimeout(timer);local.removeEventListener('abort',cancel);reject(local.reason);};
  const timer=setTimeout(done,ms);local.addEventListener('abort',cancel,{once:true});
 });}
 function imageFor(video){
  if(video?.tagName==='CANVAS')return Promise.resolve(video);
  if(video.readyState>=2)return Promise.resolve(video);
  return new Promise((resolve,reject)=>{const image=new Image();
   const cleanup=()=>local.removeEventListener('abort',cancel);
   const cancel=()=>{image.onload=image.onerror=null;cleanup();reject(local.reason);};
   image.onload=()=>{cleanup();resolve(image);};image.onerror=()=>{cleanup();reject(new Error('Could not prepare the current preview frame'));};
   local.addEventListener('abort',cancel,{once:true});image.src=video.poster;
  });
 }
 function line(text,kind='',number='',container=code){
  text=normalizeDisplayIdentifiers(text,labels);
  const row=document.createElement('span');row.className=`preview-diff-row ${kind}`;
  row.dataset.kind=kind;row.dataset.sourceText=text;
  const marker=document.createElement('span');marker.className='preview-diff-marker';marker.textContent=kind==='add'?'+':kind==='remove'?'−':' ';
  const body=document.createElement('span');body.textContent=(number?`${number}  `:'')+text;row.append(marker,body);container.append(row);
 }
 return {
  layer,
  async freeze(){
   const videos=options.sources||[...card.querySelectorAll('.application-video-pair video')];const [proxy,result]=await Promise.all(videos.map(imageFor));local.throwIfAborted();
   freeze=document.createElement('canvas');freeze.className='preview-edit-freeze';freeze.setAttribute('aria-hidden','true');freeze.width=1280;freeze.height=720;
   const ctx=freeze.getContext('2d');
   const draw=source=>{const w=source.videoWidth||source.naturalWidth||source.width,h=source.videoHeight||source.naturalHeight||source.height,ratio=16/9;let sw=w,sh=h;if(w/h>ratio)sw=h*ratio;else sh=w/ratio;ctx.drawImage(source,(w-sw)/2,(h-sh)/2,sw,sh,0,0,1280,720);};
   draw(result);const center=Number(frame.dataset.reveal||50)*1.2-10;
   ctx.save();ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo((center+10)*12.8,0);ctx.lineTo((center-10)*12.8,720);ctx.lineTo(0,720);ctx.clip();draw(proxy);ctx.restore();
   frame.append(freeze,layer);
   if(!reduced)layer.animate([{transform:'translateX(-105%)',opacity:0},{transform:'none',opacity:1}],{duration:300,easing:'cubic-bezier(.2,.7,.2,1)'});
  },
  async present(){
   const [before,after]=await Promise.all([loadSources(from,local,selection),loadSources(to,local,selection)]);local.throwIfAborted();
   const semantic=semanticEditDiff(before,after);code.replaceChildren();
   layer.dataset.diffMode=semantic?'semantic':'source';
   if(semantic){
    heading.textContent=semantic.title;
    for(const row of semantic.rows)line(row.text,row.kind);
   }else{
   note.textContent='Source diff · pre-rendered video';
   const files=diffSources(before.files,after.files);
   let count=0;
   for(const file of files.slice(0,2)){
    line(`--- ${file.oldPath||'/dev/null'}`,'file');line(`+++ ${file.newPath||'/dev/null'}`,'file');
    for(const hunk of diffHunks(file.rows,1).slice(0,2)){
     line(`@@ -${hunk.oldStart},${hunk.oldCount} +${hunk.newStart},${hunk.newCount} @@`,'hunk');
     for(const row of hunk.rows){if(count++>=(options.maxRows||22))break;line(row.text,row.kind,row.kind==='remove'?row.beforeLine:row.afterLine);}
    }
   }
   if(!files.length)line('No source-text changes for this pair.','context');
   }
   // Multi-window composition: semantic state + real source patches. Neutral
   // context is never styled as an edit. Keep the legacy rendering as fallback.
   const segments=editDiffSegments(before,after,semantic);
   if(segments.length){
    code.replaceChildren();layer.classList.add('is-segmented');
    segments.forEach((segment,index)=>{
     const panel=document.createElement('section');panel.className='diff-segment';panel.dataset.mode=segment.mode;panel.style.setProperty('--segment-index',index);
     const bar=document.createElement('header');bar.className='diff-segment-header';
     const label=document.createElement('span');label.textContent=segment.title;
     const indexLabel=document.createElement('span');indexLabel.textContent=String(index+1).padStart(2,'0');bar.append(label,indexLabel);
     const path=document.createElement('div');path.className='diff-segment-path';path.textContent=segment.path.replace(/^original\//,'');
     const body=document.createElement('pre');body.className='diff-segment-code';
     for(const row of segment.rows)line(row.text,row.kind,row.number,body);
     panel.append(bar,path);
     if(segment.context?.length){
      const context=document.createElement('div');context.className='diff-segment-context';
      const caption=document.createElement('span');caption.className='diff-context-label';caption.textContent='Shared source excerpt';
      const excerpt=document.createElement('pre');segment.context.forEach(row=>line(row.text,'context','',excerpt));
      context.append(caption,excerpt);panel.append(context);
     }
     if(segment.mode==='resolved'){const caption=document.createElement('span');caption.className='diff-resolved-label';caption.textContent='Resolved state change';panel.append(caption);}
     panel.append(body);code.append(panel);
     if(!reduced)panel.animate([{opacity:0,transform:'translateY(18px) scale(.96)'},{opacity:1,transform:'none'}],{duration:480,delay:index*100,fill:'backwards',easing:'cubic-bezier(.2,.7,.2,1)'});
    });
   }
   // Keep all changed rows visible on small screens; trim optional context first.
   if(semantic&&!segments.length){
    for(const row of [...code.querySelectorAll('.context')].reverse()){
     if(code.scrollHeight<=code.clientHeight+1)break;
     if(row.dataset.sourceText.startsWith('rigs['))continue;
     row.remove();code.dataset.compact='true';
    }
   }
   layer.dataset.diffReady='true';layer.dataset.additions=String(code.querySelectorAll('.add').length);layer.dataset.deletions=String(code.querySelectorAll('.remove').length);
   card.dataset.editPhase='showing-diff';
   if(semantic&&!reduced){
    layer.dataset.stage='original';
    await wait(850);
    layer.dataset.stage='removing';
    await wait(650);
    layer.dataset.stage='inserting';
    [...code.querySelectorAll('.add')].forEach((node,i)=>node.animate([{opacity:0,transform:'translateX(-10px)'},{opacity:1,transform:'none'}],{duration:420,delay:i*160,fill:'backwards'}));
    await wait(950);
    layer.dataset.stage='applied';
    await wait(1100);
   }else await wait(reduced?600:2700);
  },
  async reveal(){
   local.throwIfAborted();card.dataset.editPhase='revealing';
   if(!reduced){
    layer.animate([{transform:'none',opacity:1},{transform:'translateX(-105%)',opacity:0}],{duration:360,easing:'ease-in',fill:'forwards'});
    freeze.animate([{opacity:1},{opacity:0}],{duration:360,fill:'forwards'});await wait(370);
   }
  },
  dispose(){controller.abort();signal.removeEventListener('abort',abort);layer.getAnimations({subtree:true}).forEach(a=>a.cancel());freeze?.getAnimations().forEach(a=>a.cancel());layer.remove();freeze?.remove();}
 };
}
