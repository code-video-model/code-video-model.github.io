(() => {
  const params = new URLSearchParams(location.search);
  // Record early resource errors: CSS can fail before DOMContentLoaded.
  window.addEventListener('error',event=>{
    if(event.target?.tagName==='LINK'&&event.target.rel==='stylesheet')event.target.dataset.loadFailed='true';
  },true);
  if (params.get('embed') !== 'bubbles') {
    document.documentElement.hidden = true;
    const destination = new URL('gallery.html', document.baseURI);
    destination.searchParams.set('case', params.get('case') || '505');
    if (params.has('selection')) destination.searchParams.set('selection', params.get('selection'));
    location.replace(destination.href);
    return;
  }
  document.addEventListener('DOMContentLoaded', async () => {
    try {
      // This static shell has no media src yet. Its load event waits for all CSS,
      // including cached sheets whose element load event may already have fired.
      if(document.readyState!=='complete')await new Promise(resolve=>window.addEventListener('load',resolve,{once:true}));
      if([...document.querySelectorAll('link[rel="stylesheet"]')].some(link=>link.dataset.loadFailed==='true'||!link.sheet)){
        throw new Error('A view stylesheet could not be loaded. Please retry.');
      }
      await import('./behind-frame.js?v=delivery-composites-14');
    } catch(error) {
      const status = document.getElementById('status');
      const message = `Unable to load the interactive view: ${error.message}`;
      status.textContent = message;
      status.classList.add('error');
      document.documentElement.dataset.workbenchState='error';
      document.querySelector('.workbench-boot').textContent=message;
      console.error(error);
      if (parent !== window) {
        parent.postMessage({ type: 'bf-error', caseId: params.get('case') || '505', message }, location.origin);
      }
    }
  }, { once: true });
})();
