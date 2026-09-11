import {readResource} from './resource-fetch.mjs';
const demo=document.querySelector('.intro-standalone-video');
const button=document.querySelector('.demo-load');
const status=document.querySelector('.demo-status');
if(demo&&button&&status){
 demo.controls=false;
 let objectURL,loading=false,generation=0,request;
 function pauseDemo(){
  generation++;request?.abort();request=null;loading=false;demo.pause();
  button.disabled=false;button.textContent='Watch';status.textContent='';
  if(!objectURL)button.hidden=false;
 }
 button.addEventListener('click',async()=>{
  if(loading)return;
  const ticket=++generation,controller=new AbortController();request=controller;
  loading=true;button.disabled=true;button.textContent='Loading demo…';status.textContent='';
  try{
   if(!objectURL){
    const blob=await readResource(demo.dataset.src,{signal:controller.signal,type:'blob',label:'Demo video',timeoutMs:20000});
    controller.signal.throwIfAborted();if(ticket!==generation)return;
    objectURL=URL.createObjectURL(blob);demo.src=objectURL;
   }
   await demo.play();
   if(ticket===generation){button.hidden=true;demo.controls=true;}
  }catch(error){
   if(ticket!==generation||controller.signal.aborted)return;
   if(error.name==='NotAllowedError'||error.name==='AbortError'){
    status.textContent='Video ready. Press Watch to start.';button.textContent='Watch';
   }else{
    console.error(error);status.textContent='Unable to play the demo: '+error.message;button.textContent='Retry demo';
    demo.controls=false;demo.removeAttribute('src');demo.load();if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;
   }
  }finally{if(ticket===generation){loading=false;button.disabled=false;request=null;}}
 });
 demo.addEventListener('demo:pause',pauseDemo);
 demo.addEventListener('play',()=>document.querySelectorAll('.application-preview').forEach(card=>card.dispatchEvent(new Event('preview:pause'))));
 document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseDemo();});
 window.addEventListener('pagehide',event=>{
  pauseDemo();if(event.persisted)return;
  demo.removeAttribute('src');demo.load();if(objectURL)URL.revokeObjectURL(objectURL);objectURL=null;
 });
}
