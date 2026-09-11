// Keep each original program in its own document, with an externally driven clock.
(() => {
  const raf = window.requestAnimationFrame.bind(window);
  const cancel = window.cancelAnimationFrame.bind(window);
  const pending = new Set();
  let frozen = false;
  window.__bfErrors = [];
  window.addEventListener('error', (event) => window.__bfErrors.push(event.message));
  window.addEventListener('unhandledrejection', (event) => window.__bfErrors.push(String(event.reason)));
  window.requestAnimationFrame = (callback) => {
    if (frozen) return 0;
    const id = raf((time) => {
      pending.delete(id);
      if (!frozen) callback(time);
    });
    pending.add(id);
    return id;
  };
  window.__bfStopLoops = () => {
    window.reconstruction?.pause?.();
    frozen = true;
    pending.forEach(cancel);
    pending.clear();
    window.__bfCapture?.renderer?.setAnimationLoop(null);
  };
})();
