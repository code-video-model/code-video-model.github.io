import './case/main.js';
// Select the recorded variant of the shared source program.
if (typeof window.reconstruction?.setVariant !== 'function') throw new Error('Missing source variant API');
window.reconstruction.setVariant("563");
window.reconstruction.seek(0);
