const main = document.querySelector('main');
const sections = [...document.querySelectorAll('.opening-atmosphere, .gallery-section, .category-shell')]
  .filter(section => section.matches('.opening-atmosphere') || !section.closest('.opening-atmosphere'));

if (main && sections.length) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('The page atmosphere requires a 2D canvas context');
  let resizeTimer;
  let pixels;
  // Sample the same rendered color field used behind the page, including its
  // current small drift. Embedded panels cannot backdrop-filter across iframes.
  const atmosphere={sample(viewportX,viewportY){
    if(!pixels)return null;
    const bounds=main.getBoundingClientRect(),style=getComputedStyle(main,'::before');
    const matrix=new DOMMatrixReadOnly(style.transform==='none'?undefined:style.transform);
    const x=Math.max(0,Math.min(canvas.width-1,Math.floor((viewportX-bounds.left+12-matrix.m41)/(bounds.width+24)*canvas.width)));
    const y=Math.max(0,Math.min(canvas.height-1,Math.floor((viewportY-bounds.top+12-matrix.m42)/(bounds.height+24)*canvas.height)));
    const index=(y*canvas.width+x)*4;return Array.from(pixels.slice(index,index+3));
  }};
  window.pageAtmosphere=atmosphere;

  function renderAtmosphere() {
    const bounds = main.getBoundingClientRect();
    const regions = sections.map((section) => {
      const box = section.getBoundingClientRect();
      const style = getComputedStyle(section);
      const palette = ['a', 'b', 'c'].map((key) => {
        const rgb = style.getPropertyValue(`--atmosphere-${key}`).split(',').map(Number);
        if (rgb.length !== 3 || !rgb.every((value) => Number.isFinite(value) && value >= 0 && value <= 255)) {
          throw new Error(`Invalid atmosphere palette for ${section.id || 'opening'}`);
        }
        return rgb;
      });
      return { center: box.top - bounds.top + box.height / 2, palette };
    });
    canvas.width = 160;
    canvas.height = Math.min(2048, Math.max(1, Math.ceil(bounds.height / 6)));
    const image = context.createImageData(canvas.width, canvas.height);
    for (let row = 0; row < canvas.height; row++) {
      const y = row / Math.max(1, canvas.height - 1) * bounds.height;
      for (let column = 0; column < canvas.width; column++) {
        const x = column / (canvas.width - 1);
        // A continuous, gently warped color field has no section-edge strips or repeating resets.
        const sampleY = y + 140 * Math.sin(x * Math.PI * 2 + y / 920)
          + 60 * Math.sin(x * Math.PI * 4 - y / 650);
        let next = regions.findIndex((region) => region.center > sampleY);
        if (next < 0) next = regions.length - 1;
        const previous = Math.max(0, next - 1);
        const from = regions[previous], to = regions[next];
        const t = next === previous ? 0 : Math.max(0, Math.min(1,
          (sampleY - from.center) / (to.center - from.center)));
        const blend = t * t * (3 - 2 * t);
        const weights = [
          (.5 + .5 * Math.sin(Math.PI * 2 * (x * 1.7 + y / 1100))) ** 2 + .08,
          (.5 + .5 * Math.cos(Math.PI * 2 * (x * .85 - y / 1550 + .2))) ** 2 + .08,
          (.5 + .5 * Math.sin(Math.PI * 2 * (x * 1.2 - y / 1900))) ** 2 * .35 + .04,
        ];
        const sum = weights.reduce((total, weight) => total + weight, 0);
        const offset = (row * canvas.width + column) * 4;
        for (let channel = 0; channel < 3; channel++) {
          let value = 0;
          for (let color = 0; color < weights.length; color++) {
            value += weights[color] * (from.palette[color][channel] * (1 - blend)
              + to.palette[color][channel] * blend);
          }
          image.data[offset + channel] = Math.round(value / sum);
        }
        image.data[offset + 3] = 255;
      }
    }
    context.putImageData(image, 0, 0);
    pixels=image.data;
    main.style.setProperty('--page-atmosphere-image', `url("${canvas.toDataURL()}")`);
    main.classList.add('has-page-atmosphere');
    window.dispatchEvent(new Event('page-atmosphere-updated'));
  }

  const resize = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(renderAtmosphere, 120);
  });
  renderAtmosphere();
  resize.observe(main);
  sections.forEach((section) => resize.observe(section));
  const updateVisibility = () => main.classList.toggle('is-atmosphere-paused', document.hidden);
  document.addEventListener('visibilitychange', updateVisibility);
  updateVisibility();
  window.addEventListener('pagehide', (event) => {
    if (event.persisted) return;
    clearTimeout(resizeTimer);
    resize.disconnect();
    document.removeEventListener('visibilitychange', updateVisibility);
    if(window.pageAtmosphere===atmosphere)delete window.pageAtmosphere;
  });
}
