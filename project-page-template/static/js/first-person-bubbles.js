import { createDetailEditTransition } from './detail-edit-transition.js';
import { editVariantLabels } from './code-display-names.mjs';

// Retire old shared review links/preferences without affecting case deep links.
try{localStorage.removeItem('code-video-model-review');}catch{}
function cleanLegacyURL(){
  const url=new URL(location.href);
  let target;
  try{target=document.getElementById(decodeURIComponent(url.hash.slice(1)));}catch{}
  const category=target?.matches('.category-shell,.gallery-section')?target:null;
  url.searchParams.delete('review');
  if(category)url.hash='';
  if(url.href!==location.href)history.replaceState(history.state,'',url);
  // Existing bookmarked category anchors still navigate, without leaving a
  // fragment behind or interfering with case/category query restoration.
  if(category&&!url.searchParams.has('case')&&!url.searchParams.has('category'))category.scrollIntoView({block:'start',behavior:'instant'});
}
cleanLegacyURL();
addEventListener('hashchange',cleanLegacyURL);

let closeActiveWorld;

export function initializeBubbles(host) {
  const grid = host.querySelector('.fps-bubble-grid');
  const expanded = host.querySelector('.fps-expanded');
  const slot = host.querySelector('.fps-frame-slot');
  const back = host.querySelector('.fps-back');
  back.textContent='← Return';
  const status = host.querySelector('.fps-load-status');
  let variants = host.querySelector('.fps-variant-controls');
  if(!variants&&grid.querySelector('[data-case-b]')){
    variants=document.createElement('div');variants.className='fps-variant-controls';variants.hidden=true;
    expanded.querySelector('.fps-expanded-heading').append(variants);
  }
  const toggle=document.createElement('button');toggle.type='button';toggle.className='fps-variant fps-edit-toggle';
  if(variants)variants.replaceChildren(toggle);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let selected;
  let frame;
  let currentCase;
  let committedCase;
  let transition;
  let generation = 0;
  let timeout;
  let busy = false;
  const retry=document.createElement('button');retry.className='fps-retry';retry.textContent='Try again';retry.hidden=true;
  const diagnostic=document.createElement('details');diagnostic.className='fps-error-detail';diagnostic.hidden=true;
  const diagnosticTitle=document.createElement('summary');diagnosticTitle.textContent='Load details';
  const diagnosticText=document.createElement('code');diagnostic.append(diagnosticTitle,diagnosticText);
  status.after(retry);
  retry.after(diagnostic);
  retry.addEventListener('click',()=>showVariant(currentCase===selected?.dataset.caseB?'b':'a'));

  function applyPalette(element, link) {
    const sectionStyle = getComputedStyle(host);
    for (const color of ['a', 'b', 'c']) {
      const property = `--atmosphere-${color}`;
      element.style.setProperty(property, sectionStyle.getPropertyValue(property));
    }
    element.style.setProperty('--case-rgb', link.dataset.color);
    JSON.parse(link.dataset.palette).forEach((rgb, index) => {
      element.style.setProperty(`--case-color-${index + 1}`, rgb.join(', '));
    });
  }

  function close() {
    const url = new URL(location.href);
    if (selected && [selected.dataset.case, selected.dataset.caseB].includes(url.searchParams.get('case'))) {
      url.searchParams.delete('case');
      url.searchParams.delete('selection');
      url.hash='';
      history.replaceState(history.state, '', url);
    }
    if (closeActiveWorld === close) closeActiveWorld = undefined;
    generation++;
    cancelTransition();
    releaseFrame();
    slot.replaceChildren();
    currentCase = null;
    committedCase = null;
    if (variants) variants.hidden = true;
    expanded.hidden = true;
    host.classList.remove('is-open');
    grid.hidden = false;
    grid.inert = false;
    grid.classList.remove('is-selecting');
    grid.querySelectorAll('a').forEach((link) => {
      link.getAnimations().forEach((animation) => animation.cancel());
      link.style.opacity = '';
      link.removeAttribute('aria-current');
      link.setAttribute('aria-expanded', 'false');
    });
    selected?.focus({ preventScroll: true });
    busy = false;
    retry.hidden=true;
    host.dispatchEvent(new CustomEvent('world-state', {bubbles:true, detail:{state:'grid'}}));
  }

  function releaseFrame() {
    clearTimeout(timeout);
    clearBoot();
    const child = frame?.contentWindow;
    (child?.behindFrameLifecycle || child?.behindFrame)?.dispose();
    frame?.remove();
    frame = null;
    slot.setAttribute('aria-busy', 'false');
  }

  function clearBoot(){slot.querySelector('.fps-opening-placeholder')?.remove();}
  function showBoot(editable){
    clearBoot();
    const placeholder=document.createElement('div');placeholder.className='fps-opening-placeholder';placeholder.dataset.editable=String(editable);placeholder.setAttribute('role','status');
    const media=document.createElement('div');media.className='fps-skeleton-media';media.setAttribute('aria-hidden','true');
    media.append(document.createElement('span'));if(!editable)media.append(document.createElement('span'));
    const label=document.createElement('p');label.textContent='Preparing view…';placeholder.append(media,label);slot.append(placeholder);
  }

  function lockVariants(locked) {
    toggle.disabled=locked;
    if(locked)toggle.textContent=committedCase===selected?.dataset.caseB?'Restoring…':'Applying…';
    else updateToggle();
  }

  function updateToggle(){
    const edited=committedCase===selected?.dataset.caseB;
    toggle.dataset.variant=edited?'a':'b';
    toggle.setAttribute('aria-pressed',String(edited));
    toggle.textContent=edited?'Restore original':selected?.dataset.editLabel||'Apply edit';
  }

  function cancelTransition() {
    if (transition) {
      clearTimeout(transition.timer);
      transition.view.dispose();
      transition.view.layer.remove();
      transition = null;
    }
    slot.style.minHeight = '';
    lockVariants(false);
  }

  function showError(message,resource='',attempts=0) {
    clearTimeout(timeout);
    if (transition) {
      transition.failed = true;
      clearTimeout(transition.timer);
      transition.view.fail(message);
      transition.view.dispose();
      lockVariants(false);
    }
    releaseFrame();
    slot.setAttribute('aria-busy', 'false');
    status.classList.add('error');
    status.textContent = message;
    retry.hidden=false;
    diagnostic.hidden=!resource;
    diagnosticText.textContent=resource?`${selected?.dataset.title||'Selected_Result'} · ${attempts} attempt(s)\n${resource}`:'';
  }

  async function revealTransition(state) {
    if (transition !== state || state.failed || state.revealing || !state.ready || !state.diffReady) return;
    state.revealing=true;
    clearTimeout(state.timer);
    frame.classList.remove('is-staged');
    frame.inert = false;
    frame.removeAttribute('aria-hidden');
    frame.removeAttribute('tabindex');
    clearTimeout(timeout);
    try{await state.view.reveal();}catch(error){if(error.name!=='AbortError'&&transition===state)showError(error.message);return;}
    if(transition!==state||state.failed)return;
    committedCase=state.to;
    cancelTransition();
    slot.setAttribute('aria-busy', 'false');
    status.classList.remove('error');
    status.textContent = '';
    retry.hidden=true;
    toggle.focus({ preventScroll: true });
  }

  function showVariant(variant, origin) {
    if (transition && !transition.failed) return;
    const started = performance.now();
    const link = selected;
    const caseId = variant === 'b' ? link.dataset.caseB : link.dataset.case;
    if (!caseId) return;
    if (caseId === currentCase && frame && !status.classList.contains('error')) return;
    // If comparison itself failed, no code change was shown: recovering the
    // original must not depend on fetching the unavailable target source again.
    const from=committedCase;
    const reveal=frame?.contentDocument?.querySelector('.comparison-frame')?.dataset.reveal||'50';
    const codeOpen=Boolean(frame?.contentDocument?.querySelector('.code-disclosure')?.open);
    const changing=from&&from!==caseId&&frame&&!status.classList.contains('error');
    const caseLabels=editVariantLabels(link.dataset.title,link.dataset.case,link.dataset.caseB);
    const view=changing?createDetailEditTransition(from,caseId,link.dataset.selection||'',frame,variant==='a',caseLabels):null;
    const previousHeight = frame?.getBoundingClientRect().height || 0;
    const version = ++generation;
    cancelTransition();
    releaseFrame();
    currentCase = caseId;
    const pageURL = new URL(location.href);
    if (pageURL.searchParams.has('case') || link.dataset.selection) {
      pageURL.searchParams.set('case', caseId);
      if (link.dataset.selection) pageURL.searchParams.set('selection', link.dataset.selection);
      else pageURL.searchParams.delete('selection');
      pageURL.hash = '';
      history.replaceState(history.state, '', pageURL);
    }
    if (variants) {
      variants.hidden = !link.dataset.caseB;
      updateToggle();
    }
    status.classList.remove('error');
    retry.hidden=true;
    diagnostic.hidden=true;diagnostic.open=false;
    status.textContent = '';
    lockVariants(true);
    slot.setAttribute('aria-busy', 'true');
    const nextFrame = document.createElement('iframe');
    frame = nextFrame;
    nextFrame.className = 'fps-workbench-frame';
    nextFrame.classList.add('is-booting');
    nextFrame.inert=true;nextFrame.setAttribute('aria-hidden','true');nextFrame.tabIndex=-1;
    if(!changing){
      const width=slot.clientWidth;
      const height=link.dataset.caseB?(Math.min(width,1000)-38)*9/16+250:innerWidth<=640?(width-30)*9/16*2+360:(width-50)/2*9/16+270;
      nextFrame.style.height=`${Math.max(320,Math.ceil(height))}px`;
      showBoot(Boolean(link.dataset.caseB));
    }
    if (changing) {
      nextFrame.classList.add('is-staged');
      nextFrame.inert = true;
      nextFrame.setAttribute('aria-hidden', 'true');
      nextFrame.tabIndex = -1;
      const state = {
        from, to: caseId, started, ready: false, diffReady: false, failed: false,
        view,
      };
      transition = state;
      slot.style.minHeight = `${previousHeight}px`;
      slot.append(state.view.layer);
      lockVariants(true);
      state.view.prepare().then(() => {
        if (transition !== state || state.failed) return;
        state.diffReady = true;
        state.diffShown = performance.now();
        revealTransition(state);
      }).catch((error) => {
        if (transition !== state || state.failed || error.name === 'AbortError') return;
        showError(error.message);
      });
    }
    nextFrame.title = `${link.dataset.title}: Three.js and output`;
    const url = new URL('static/interactive/workbench.html', document.baseURI);
    url.searchParams.set('case', caseId);
    if (link.dataset.selection) url.searchParams.set('selection', link.dataset.selection);
    if(link.dataset.caseB){
      url.searchParams.set('display_name',link.dataset.title);
      url.searchParams.set('case_a',link.dataset.case);
      url.searchParams.set('case_b',link.dataset.caseB);
    }
    url.searchParams.set('embed', 'bubbles');
    if(codeOpen)url.searchParams.set('code','1');
    if(link.dataset.caseB){url.searchParams.set('editing','1');url.searchParams.set('reveal',reveal);}
    url.searchParams.set('view', 'unified-cards-13');
    nextFrame.src = url.href;
    nextFrame.addEventListener('load', () => {
      if (version !== generation || frame !== nextFrame) return;
      const doc = nextFrame.contentDocument;
      if (!doc?.querySelector('.workbench')) {
        showError('Unable to open this world.');
        return;
      }
      applyPalette(doc.body, link);
    });
    slot.append(nextFrame);
    timeout = setTimeout(() => {
      if (version !== generation) return;
      showError('Loading is taking longer than expected.');
    }, 90000);
  }

  async function open(link, initialVariant = 'a') {
    if (busy) return;
    // Only one live scene/video at a time, even when navigating between sections.
    closeActiveWorld?.();
    closeActiveWorld = close;
    busy = true;
    selected = link;
    selected.setAttribute('aria-current', 'true');
    selected.setAttribute('aria-expanded', 'true');
    const version = ++generation;
    grid.classList.add('is-selecting');
    const origin = link.getBoundingClientRect();
    grid.inert = true;
    const fades = [...grid.querySelectorAll('.fps-case-bubble')].map((bubble) => {
      if (reducedMotion.matches) return Promise.resolve();
      return bubble.animate([
        { opacity: 1, transform: 'scale(1)' },
        { opacity: bubble === link ? 1 : 0, transform: `scale(${bubble === link ? 1.06 : .8})` },
      ], { duration: 260, fill: 'forwards', easing: 'ease-out' }).finished;
    });
    await Promise.all(fades);
    if (version !== generation) return;
    grid.hidden = true;
    expanded.hidden = false;
    host.classList.add('is-open');
    host.dispatchEvent(new CustomEvent('world-state', {bubbles:true, detail:{state:'detail'}}));
    applyPalette(expanded, link);
    showVariant(initialVariant, origin);
    back.focus({ preventScroll: true });
  }

  function handleOpenError(error) {
    if (error.name === 'AbortError') return; // Closing cancels the opening animation.
    console.error(error);
    close();
  }

  grid.addEventListener('click', (event) => {
    const link = event.target.closest('.fps-case-bubble');
    if (!link || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    open(link).catch(handleOpenError);
  });
  back.addEventListener('click', close);
  variants?.addEventListener('click', (event) => {
    const button = event.target.closest('[data-variant]');
    if (!button || button.disabled || expanded.hidden) return;
    showVariant(button.dataset.variant);
  });
  host.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !expanded.hidden) { close(); event.stopPropagation(); }
  });
  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && closeActiveWorld === close && !expanded.hidden) close();
  });
  window.addEventListener('message', (event) => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== location.origin) return;
    if (event.data?.caseId !== currentCase) return;
    if (event.data.type === 'bf-size' && Number.isFinite(event.data.height)) {
      frame.style.height = `${Math.max(300, Math.min(6000, event.data.height))}px`;
    } else if (event.data.type === 'bf-ready') {
      frame.classList.remove('is-booting');
      if (transition) {
        transition.ready = true;
        revealTransition(transition);
        return;
      }
      clearTimeout(timeout);
      clearBoot();
      frame.inert=false;frame.removeAttribute('aria-hidden');frame.removeAttribute('tabindex');
      if(!reducedMotion.matches)frame.animate([{opacity:0},{opacity:1}],{duration:220});
      slot.setAttribute('aria-busy', 'false');
      status.classList.remove('error');
      status.textContent = '';
      committedCase=currentCase;
      lockVariants(false);
    } else if (event.data.type === 'bf-error') {
      showError(event.data.message,event.data.resource,event.data.attempts);
    } else if (event.data.type === 'bf-warning') {
      status.textContent=event.data.message;
    } else if (event.data.type === 'bf-close') close();
  });
  return { host, close, dispose: () => {generation++;cancelTransition();releaseFrame();if(closeActiveWorld===close)closeActiveWorld=undefined;}, open: (link, variant) => open(link, variant).catch(handleOpenError) };
}

const integrated = document.documentElement.hasAttribute('data-integrated-gallery');
const worlds = integrated ? [] : [...document.querySelectorAll('.fps-bubbles-host')].map(initializeBubbles);
const pageURL = new URL(location.href);
if (pageURL.searchParams.has('case') && !integrated) {
  const caseId = pageURL.searchParams.get('case') || '505';
  const selectionId = pageURL.searchParams.get('selection') || '';
  const matches = (link) => (link.dataset.case === caseId || link.dataset.caseB === caseId)
    && (link.dataset.selection || '') === selectionId;
  const world = worlds.find(({ host }) => [...host.querySelectorAll('.fps-case-bubble')]
    .some(matches));
  if (world) {
    const link = [...world.host.querySelectorAll('.fps-case-bubble')]
      .find(matches);
    pageURL.hash = '';
    history.replaceState(history.state, '', pageURL);
    world.host.scrollIntoView({ block: 'start', behavior: 'instant' });
    world.open(link, link.dataset.caseB === caseId ? 'b' : 'a');
  } else {
    const notice = document.createElement('p');
    notice.className = 'fps-load-status error';
    notice.setAttribute('role', 'alert');
    notice.textContent = 'This result is unavailable. Choose a world below.';
    document.querySelector('main').prepend(notice);
  }
}
