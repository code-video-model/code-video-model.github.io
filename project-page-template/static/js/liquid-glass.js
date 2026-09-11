// Position-aware color transmission for same-origin embedded workbenches.
// No animation loop: update only on layout/palette changes, not video frames.
const surface='.panels > .panel:not(.source-panel), .timeline, .code-disclosure';
const lifetime=new AbortController();let pending=0;
export function paintGlass(){
 pending=0;
 if(parent===window||!window.frameElement||!parent.pageAtmosphere)return;
 const frame=window.frameElement.getBoundingClientRect();
 for(const panel of document.querySelectorAll(surface)){
  const box=panel.getBoundingClientRect();if(!box.width||!box.height)continue;
  const points=[[.15,.1],[.85,.5],[.35,.9]];
  points.forEach(([x,y],i)=>{
   const rgb=parent.pageAtmosphere.sample(frame.left+box.left+box.width*x,frame.top+box.top+box.height*y);
   if(rgb)panel.style.setProperty(`--glass-${['a','b','c'][i]}`,rgb.join(', '));
  });
  panel.dataset.glassPalette='page-position';
 }
}
function schedule(){if(!lifetime.signal.aborted&&!pending)pending=requestAnimationFrame(paintGlass);}
const observer=new ResizeObserver(schedule);observer.observe(document.querySelector('.workbench'));
// Details are rearranged by the workbench module after this module may load.
const mutation=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes].some(n=>n.nodeType===1&&n.matches?.(surface))))schedule();});
mutation.observe(document.querySelector('.workbench'),{childList:true});
window.addEventListener('resize',schedule,{signal:lifetime.signal});
document.addEventListener('toggle',schedule,{capture:true,signal:lifetime.signal});
if(parent!==window){
 parent.addEventListener('page-atmosphere-updated',schedule,{signal:lifetime.signal});
 parent.addEventListener('resize',schedule,{signal:lifetime.signal});
}
function dispose(){lifetime.abort();observer.disconnect();mutation.disconnect();cancelAnimationFrame(pending);}
window.addEventListener('pagehide',dispose,{once:true});
window.addEventListener('workbench-dispose',dispose,{once:true});
schedule();
