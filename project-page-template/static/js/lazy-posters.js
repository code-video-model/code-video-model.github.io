// A video poster has no reliable cross-browser native lazy-loading attribute.
// Keep it out of `poster` until close to the viewport (or explicitly played).
export function hydratePoster(video){
  if(!video.dataset.poster)return;
  video.poster=video.dataset.poster;
  delete video.dataset.poster;
}
const observer=new IntersectionObserver(entries=>{
  for(const entry of entries)if(entry.isIntersecting){hydratePoster(entry.target);observer.unobserve(entry.target);}
},{rootMargin:'350px'});
document.querySelectorAll('video[data-poster]').forEach(video=>observer.observe(video));
addEventListener('pagehide',event=>{if(!event.persisted)observer.disconnect();});
