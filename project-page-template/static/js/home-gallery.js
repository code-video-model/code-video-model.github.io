import {initializeBubbles} from './first-person-bubbles.js';
import {balanceGallery} from './balanced-gallery.js';

const shells=[...document.querySelectorAll('.category-shell')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const records=new Map();
let active=null,pinFrame,pinRevision=0;
const nativeMosaics=new IntersectionObserver(entries=>{
  for(const entry of entries){
    if(!entry.isIntersecting)continue;
    const image=entry.target;nativeMosaics.unobserve(image);
    image.onload=()=>{image.dataset.nativeReady='true';};
    image.src=image.dataset.nativeSrc;
  }
},{rootMargin:'350px'});

function announceReady(){window.homeGalleryReady=true;document.dispatchEvent(new Event('home-gallery-ready'));}
function stopPin(){pinRevision++;cancelAnimationFrame(pinFrame);document.documentElement.classList.remove('is-category-navigation');}
addEventListener('wheel',stopPin,{passive:true});addEventListener('touchstart',stopPin,{passive:true});
function pin(shell){
  stopPin();const revision=pinRevision,initial=shell.getBoundingClientRect().top;
  const destination=24;
  const start=performance.now(),duration=reduced.matches?0:560;
  document.documentElement.classList.add('is-category-navigation');
  function tick(now){
    if(revision!==pinRevision)return;
    const t=duration?Math.min(1,(now-start)/duration):1,ease=1-(1-t)**3;
    const expected=initial+(destination-initial)*ease;
    scrollBy({top:shell.getBoundingClientRect().top-expected,behavior:'instant'});
    if(t<1)pinFrame=requestAnimationFrame(tick);else document.documentElement.classList.remove('is-category-navigation');
  }
  pinFrame=requestAnimationFrame(tick);
}
function resize(record,from=record.content.getBoundingClientRect().height){
  const target=(record.overview.hidden?record.results:record.overview).getBoundingClientRect().height;
  record.target=target;record.animation?.cancel();
  if(reduced.matches||Math.abs(target-from)<1||!from){record.content.style.height='';record.content.classList.remove('is-transitioning');return;}
  record.content.style.height=`${target}px`;record.content.classList.add('is-transitioning');
  const animation=record.content.animate([{height:`${from}px`},{height:`${target}px`}],{duration:460,easing:'cubic-bezier(.22,.7,.2,1)'});
  record.animation=animation;
  animation.finished.then(()=>{
    if(record.animation!==animation)return;
    record.animation=null;record.content.style.height='';record.content.classList.remove('is-transitioning');
  }).catch(()=>{});
}
function urlFor(record){
  const url=new URL(location.href);url.searchParams.delete('case');url.searchParams.delete('selection');
  url.hash='';
  if(record){url.searchParams.set('category',record.shell.id);}
  else url.searchParams.delete('category');
  history.replaceState(history.state,'',url);
}
function cancelReturn(record){
  record.returnRevision=(record.returnRevision||0)+1;
  record.returnAnimation?.cancel();record.returnAnimation=null;record.returning=false;
}
function collapse(record,{navigate=true}={}){
  if(!record||record.overview.hidden===false)return;
  if(record.returning&&navigate)return;
  cancelReturn(record);
  const revision=record.returnRevision;
  // Stop audio immediately, but retain the outgoing view long enough to fade it out.
  record.results.querySelectorAll('iframe').forEach(f=>f.contentWindow?.behindFrame?.pause());
  const finish=()=>{
    if(record.returnRevision!==revision)return;
    record.returning=false;record.returnAnimation=null;
    const from=record.content.getBoundingClientRect().height;
    record.world.close();record.results.hidden=true;record.overview.hidden=false;
    record.shell.dataset.state='overview';record.trigger.setAttribute('aria-expanded','false');record.mosaic.setAttribute('aria-expanded','false');
    if(active===record)active=null;
    resize(record,from);
    if(!reduced.matches&&navigate)record.overview.animate([{opacity:0,transform:'translateY(10px)'},{opacity:1,transform:'none'}],{duration:440,easing:'cubic-bezier(.22,.7,.2,1)'});
    if(navigate){urlFor(null);record.trigger.focus({preventScroll:true});pin(record.shell);}
  };
  if(reduced.matches||!navigate){finish();return;}
  record.returning=true;
  record.returnAnimation=record.results.animate([{opacity:1},{opacity:0}],{duration:160,easing:'ease-out',fill:'forwards'});
  const animation=record.returnAnimation;
  animation.finished.then(()=>{finish();animation.cancel();}).catch(()=>{});
}
function open(record,{navigate=true}={}){
  if(!record)return;
  if(record.returning)cancelReturn(record);
  if(active===record)return;
  const from=record.content.getBoundingClientRect().height;
  if(active)collapse(active,{navigate:false});
  document.querySelectorAll('.application-preview').forEach(n=>n.dispatchEvent(new Event('preview:pause')));
  const demo=document.querySelector('.intro-standalone-video');
  demo?.dispatchEvent(new Event('demo:pause'));demo?.pause();
  record.overview.hidden=true;record.results.hidden=false;active=record;
  record.shell.dataset.state='grid';record.trigger.setAttribute('aria-expanded','true');record.mosaic.setAttribute('aria-expanded','true');
  balanceGallery();resize(record,from);
  if(!reduced.matches)record.results.animate([{opacity:0,transform:'translateY(12px)'},{opacity:1,transform:'none'}],{duration:300});
  if(navigate){urlFor(record);record.heading.focus({preventScroll:true});pin(record.shell);}
}
function button(text,className){const n=document.createElement('button');n.type='button';n.textContent=text;n.className=className;return n;}

async function initialize(){
  const response=await fetch('gallery.html');
  if(!response.ok)throw new Error(`Gallery HTTP ${response.status}`);
  const source=new DOMParser().parseFromString(await response.text(),'text/html');
  const mosaicPosters=await fetch('static/images/mosaic-posters.json').then(r=>r.ok?r.json():{}).catch(()=>({}));
  for(const shell of shells){
    const sourceHost=source.getElementById(shell.id)?.querySelector('.fps-bubbles-host');
    if(!sourceHost)throw new Error(`Missing category ${shell.id}`);
    const overview=shell.querySelector('.category-overview'),card=overview.querySelector('.application-preview'),trigger=card.querySelector('h2 a');
    const host=document.createElement('div');host.className='fps-bubbles-host';
    host.append(sourceHost.querySelector('.fps-bubble-grid').cloneNode(true),sourceHost.querySelector('.fps-expanded').cloneNode(true));
    host.querySelector('.fps-back').textContent='← Return';
    const links=[...host.querySelectorAll('.fps-case-bubble')];
    const results=document.createElement('div');results.className='category-results';results.id=`${shell.id}-results`;results.hidden=true;
    const header=document.createElement('header');header.className='category-results-header';
    const title=document.createElement('div');const heading=document.createElement('h2');heading.textContent=trigger.textContent;heading.tabIndex=-1;
    title.append(heading);
    const close=button('← Back to overview','category-collapse');header.append(title,close);
    results.append(header,host);
    shell.querySelector('.category-content').append(results);
    const mosaic=button('','category-mosaic');mosaic.setAttribute('aria-label',`Explore ${trigger.textContent} results`);
    const pile=document.createElement('span');pile.className='mosaic-frames';
    const other=links.filter(n=>n.dataset.case!==card.dataset.case|| (n.dataset.selection||'')!==(card.dataset.selection||''));
    other.slice(0,4).forEach((link,index)=>{
      const key=[shell.id,link.dataset.case,link.dataset.caseB||'',link.dataset.selection||''].join('|');
      // Request only the final full-resolution frame, never a low-res image
      // followed by a second download. Offscreen collages wait their turn.
      const img=document.createElement('img');img.alt='';img.width=384;img.height=216;img.decoding='async';
      img.dataset.nativeSrc=mosaicPosters[key]?.src||link.querySelector('img').getAttribute('src');
      nativeMosaics.observe(img);
      pile.append(img);
    });
    pile.dataset.count=String(pile.children.length);
    mosaic.append(pile);
    card.querySelector('.application-copy').append(mosaic);
    trigger.setAttribute('aria-controls',results.id);trigger.setAttribute('aria-expanded','false');
    trigger.setAttribute('role','button');
    mosaic.setAttribute('aria-controls',results.id);mosaic.setAttribute('aria-expanded','false');
    const world=initializeBubbles(host);
    const record={shell,overview,results,content:shell.querySelector('.category-content'),trigger,mosaic,host,world,heading,target:0,animation:null};
    records.set(shell.id,record);shell.dataset.state='overview';
    trigger.addEventListener('click',event=>{if(event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;event.preventDefault();open(record);});
    trigger.addEventListener('keydown',event=>{if(event.key===' '){event.preventDefault();open(record);}});
    mosaic.addEventListener('click',()=>open(record));
    close.addEventListener('click',()=>collapse(record));
    shell.addEventListener('keydown',event=>{
      if(event.key!=='Escape'||active!==record)return;event.stopPropagation();
      if(host.classList.contains('is-open'))world.close();else collapse(record);
    });
    host.addEventListener('world-state',event=>{if(active===record)shell.dataset.state=event.detail.state;});
    const observer=new ResizeObserver(()=>{
      const target=(overview.hidden?results:overview).getBoundingClientRect().height;
      if(Math.abs(target-record.target)>1)resize(record,record.animation?record.content.getBoundingClientRect().height:(record.target||target));
    });
    record.observer=observer;record.target=overview.getBoundingClientRect().height;observer.observe(overview);observer.observe(results);
  }
  balanceGallery();
  window.homeGallery={openCategory:id=>open(records.get(id)),collapseCategory:()=>collapse(active),getState:()=>({category:active?.shell.id||null,state:active?.shell.dataset.state||'overview'})};
  announceReady();
  function restoreURL(){
    const url=new URL(location.href),caseId=url.searchParams.get('case'),selection=url.searchParams.get('selection')||'';
    const requestedCategory=url.searchParams.get('category');
    const categoryAliases={'trajectory-variation':'robotics-simulation','scientific-visualization':'physical-grounding'};
    const category=categoryAliases[requestedCategory]||requestedCategory;
    if(caseId){
      const preferred=records.get(category);
      const candidates=preferred?[preferred,...[...records.values()].filter(record=>record!==preferred)]:records.values();
      for(const record of candidates){
        const link=[...record.host.querySelectorAll('.fps-case-bubble')].find(n=>(n.dataset.case===caseId||n.dataset.caseB===caseId)&&(n.dataset.selection||'')===selection);
        if(link){open(record,{navigate:false});pin(record.shell);record.world.open(link,link.dataset.caseB===caseId?'b':'a');return;}
      }
      const notice=document.createElement('p');notice.className='integrated-gallery-error';notice.setAttribute('role','alert');notice.textContent=`This result is unavailable. Choose a category below.`;document.querySelector('.gallery-intro').append(notice);
    }else if(records.has(category)){const record=records.get(category);open(record,{navigate:false});pin(record.shell);}
    else if(active)collapse(active,{navigate:false});
  }
  restoreURL();addEventListener('popstate',restoreURL);
  addEventListener('pagehide',event=>{if(event.persisted)return;stopPin();nativeMosaics.disconnect();for(const record of records.values()){cancelReturn(record);record.world.dispose();record.observer.disconnect();record.animation?.cancel();}});
}
initialize().catch(error=>{
  console.error(error);
  const note=document.createElement('p');note.className='integrated-gallery-error';note.setAttribute('role','alert');note.textContent='More results could not be loaded. The category links still open the standalone Gallery.';
  document.querySelector('.gallery-intro').append(note);announceReady();
});
