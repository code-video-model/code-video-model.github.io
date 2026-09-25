import {createPreviewEditDiff} from './preview-edit-diff.js';

export function createDetailEditTransition(from,to,selection,oldFrame,restoring,caseLabels){
 const controller=new AbortController(),layer=document.createElement('div');
 layer.className='fps-edit-transition';layer.dataset.fromCase=from;layer.dataset.toCase=to;
 const card=document.createElement('div');card.className='detail-edit-preview';
 const stage=document.createElement('div');stage.className='comparison-frame';card.append(stage);layer.append(card);
 // Capture synchronously before the old iframe/WebGL context is released.
 const doc=oldFrame?.contentDocument;
 stage.dataset.reveal=doc?.querySelector('.comparison-frame')?.dataset.reveal||'50';
 oldFrame?.contentWindow?.behindFrame?.pause();
 const sources=[doc?.querySelector('#proxy-stage canvas'),doc?.getElementById('result-video')].map(source=>{
  const canvas=document.createElement('canvas');canvas.width=1280;canvas.height=720;
  const ctx=canvas.getContext('2d');ctx.fillStyle='#172a35';ctx.fillRect(0,0,1280,720);
  if(source){const w=source.videoWidth||source.width,h=source.videoHeight||source.height;
   if(w&&h){const scale=Math.min(1280/w,720/h);ctx.drawImage(source,(1280-w*scale)/2,(720-h*scale)/2,w*scale,h*scale);}}
  return canvas;
 });
 const preview=createPreviewEditDiff(card,from,to,selection,controller.signal,restoring,{sources,maxRows:8,caseLabels});
 return {layer,
  async prepare(){await preview.freeze();await preview.present();layer.dataset.diffReady='true';},
  async reveal(){await preview.reveal();},
  fail(message){layer.dataset.failed='true';preview.layer.querySelector('.preview-diff-heading').textContent='Edit unavailable';preview.layer.querySelector('.preview-diff-note').textContent=message;},
  dispose(){controller.abort();preview.dispose();}
 };
}
