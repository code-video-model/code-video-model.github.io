export function setupComparison(card,initialValue=50) {
  const frame=card.querySelector('.comparison-frame');
  if(!frame)return;
  const proxy=card.querySelector('.application-video-pair figure');
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
  svg.setAttribute('viewBox','0 0 100 100');svg.setAttribute('preserveAspectRatio','none');
  svg.setAttribute('aria-hidden','true');svg.classList.add('comparison-divider');
  const line=document.createElementNS(svg.namespaceURI,'line');
  line.setAttribute('y1','0');line.setAttribute('y2','100');line.setAttribute('vector-effect','non-scaling-stroke');
  svg.append(line);frame.append(svg);
  const handle=document.createElement('div');
  handle.className='comparison-handle';handle.tabIndex=0;handle.setAttribute('role','slider');
  handle.setAttribute('aria-label','Reveal Three.js proxy versus generated result');
  handle.setAttribute('aria-orientation','horizontal');handle.setAttribute('aria-valuemin','0');handle.setAttribute('aria-valuemax','100');
  handle.title='Drag left or right to compare. Arrow keys also work.';
  handle.textContent='↔';frame.append(handle);
  let value=50,drag=null,hideTimer;
  function setValue(next) {
    value=Math.max(0,Math.min(100,next));
    const center=value*1.2-10,top=center+10,bottom=center-10;
    proxy.style.clipPath=`polygon(0 0, ${top}% 0, ${bottom}% 100%, 0 100%)`;
    line.setAttribute('x1',String(top));line.setAttribute('x2',String(bottom));
    handle.style.left=`clamp(24px, ${center}%, calc(100% - 24px))`;
    handle.setAttribute('aria-valuenow',String(Math.round(value)));
    handle.setAttribute('aria-valuetext',value===0?'Generated result only':value===100?'Three.js proxy only':`Comparison position ${Math.round(value)} of 100; proxy left, generated result right`);
    frame.dataset.reveal=String(value);
  }
  function fromX(x) {
    const box=frame.getBoundingClientRect(),ratio=(x-box.left)/box.width;
    setValue(ratio<=.03?0:ratio>=.97?100:(ratio*100+10)/1.2);
  }
  frame.addEventListener('pointerdown',event=>{
    if(card.getAttribute('aria-busy')==='true')return;
    if(event.button!==0||event.target.closest('button,input,.application-transport'))return;
    drag={id:event.pointerId,x:event.clientX,touch:event.pointerType!=='mouse',moved:false};
    frame.setPointerCapture(event.pointerId);
    if(!drag.touch){fromX(event.clientX);frame.classList.add('is-dragging');}
  });
  frame.addEventListener('pointermove',event=>{
    if(card.getAttribute('aria-busy')==='true'){drag=null;frame.classList.remove('is-dragging');return;}
    if(!drag||drag.id!==event.pointerId)return;
    if(drag.touch&&!drag.moved&&Math.abs(event.clientX-drag.x)<6)return;
    drag.moved=true;frame.classList.add('is-dragging');fromX(event.clientX);
  });
  function finish(event) {
    if(!drag||drag.id!==event.pointerId)return;
    if(drag.touch&&!drag.moved&&event.type==='pointerup'){
      frame.classList.add('show-controls');clearTimeout(hideTimer);
      hideTimer=setTimeout(()=>frame.classList.remove('show-controls'),5000);
    }
    if(frame.hasPointerCapture(event.pointerId))frame.releasePointerCapture(event.pointerId);
    drag=null;frame.classList.remove('is-dragging');
  }
  frame.addEventListener('pointerup',finish);frame.addEventListener('pointercancel',finish);
  frame.addEventListener('lostpointercapture',()=>{drag=null;frame.classList.remove('is-dragging');});
  handle.addEventListener('keydown',event=>{
    if(card.getAttribute('aria-busy')==='true')return;
    const step=event.shiftKey?10:2;
    const values={ArrowLeft:value-step,ArrowDown:value-step,ArrowRight:value+step,ArrowUp:value+step,Home:0,End:100,PageUp:value+10,PageDown:value-10};
    if(event.key in values){event.preventDefault();setValue(values[event.key]);}
  });
  setValue(Number.isFinite(initialValue)?initialValue:50);
}
