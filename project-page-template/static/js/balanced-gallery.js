// Balance row sizes, keeping original DOM order and all case interactions intact.
export function balanceGallery() {
  const capacity=innerWidth<=640?2:innerWidth<=1000?3:4;
  for(const grid of document.querySelectorAll('.fps-bubble-grid')) {
    const cards=[...grid.children].filter(n=>n.matches('.fps-bubble-float')&&!n.hidden);
    if(!cards.length)continue;
    const rows=Math.ceil(cards.length/capacity);
    const small=Math.floor(cards.length/rows), extra=cards.length%rows;
    const columns=small+(extra?1:0);
    const sizes=Array.from({length:rows},(_,r)=>small+(r<extra?1:0));
    grid.classList.add('balanced-gallery');
    grid.style.setProperty('--gallery-rails',String(columns*2));
    grid.style.setProperty('--gallery-max-width',`${columns*250+(columns-1)*32+32}px`);
    grid.dataset.rows=sizes.join('+');
    let index=0;
    for(const size of sizes) {
      for(let c=0;c<size;c++) {
        const node=cards[index++];
        node.style.gridColumn=c===0?`${columns-size+1} / span 2`:'span 2';
      }
    }
  }
}
balanceGallery();
let frame;
addEventListener('resize',()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(balanceGallery);});
for(const grid of document.querySelectorAll('.fps-bubble-grid')) {
  new MutationObserver(balanceGallery).observe(grid,{childList:true});
}
