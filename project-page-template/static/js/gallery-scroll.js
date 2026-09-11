const main = document.querySelector('main');
const sections = [...document.querySelectorAll('.gallery-section')];

if (main && sections.length) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const records = sections.flatMap((section) => [
    ...section.querySelectorAll('.fps-bubbles-host > h2, .fps-bubble-float'),
  ].map((node) => ({ node, section, progress: 0, started: false, delay: 0, top: 0, shift: 0, stagger: 0, direction: 0, wave: 0 })));
  const navigation = document.createElement('nav');
  navigation.className = 'gallery-section-nav';
  navigation.setAttribute('aria-label', 'Gallery sections');
  const stops = sections.map((section) => {
    const heading = section.querySelector('.fps-bubbles-host > h2');
    const link = document.createElement('a');
    link.href = `#${section.id}`;
    link.setAttribute('aria-label', heading.textContent);
    const label = document.createElement('span');
    label.className = 'gallery-nav-label';
    label.textContent = heading.textContent;
    link.append(label);
    link.addEventListener('click', (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      heading.tabIndex = -1;
      heading.focus({ preventScroll: true });
      section.scrollIntoView({ block: 'start', behavior: reduced.matches ? 'instant' : 'smooth' });
    });
    navigation.append(link);
    return { section, link, top: 0, center: 0, height: 0, color: [] };
  });
  document.body.append(navigation);
  document.body.classList.add('gallery-enhanced');
  let frame = null;
  let needsMeasure = true;
  let depth = 0;
  let mainTop = 0;
  let disposed = false;
  let lastFrame = performance.now();

  function layoutTop(node) {
    let top = 0;
    for (let current = node; current; current = current.offsetParent) top += current.offsetTop;
    return top;
  }

  function reveal(record, trigger, immediate = false, elapsed = 16) {
    const heading = record.node.matches('h2');
    const mobile = innerWidth <= 640;
    if (trigger && !record.started) {
      record.started = true;
      record.delay = record.stagger;
      elapsed = 0;
    }
    // Scrolling only starts the entrance. Once started, time carries it all the way to rest.
    if (immediate) record.progress = 1;
    else if (record.started) {
      const motionTime = Math.max(0, elapsed - record.delay);
      record.delay = Math.max(0, record.delay - elapsed);
      record.progress = Math.min(1, record.progress + motionTime / (heading ? 500 : mobile ? 700 : 1100));
    }
    const eased = record.progress * record.progress * (3 - 2 * record.progress);
    const opacity = 1 - (1 - record.progress) ** 2;
    record.shift = (1 - eased) * (heading ? 24 : mobile ? 36 : 76 + record.wave);
    record.node.style.setProperty('--scroll-opacity', opacity.toFixed(4));
    record.node.style.setProperty('--scroll-rise', `${record.shift.toFixed(3)}px`);
    record.node.style.setProperty('--scroll-scale', (1 - (1 - eased) * (mobile ? .12 : .2)).toFixed(4));
    record.node.style.setProperty('--scroll-tilt', `${((1 - eased) * 28).toFixed(3)}deg`);
    record.node.style.setProperty('--scroll-roll', `${((1 - eased) * 9 * record.direction).toFixed(3)}deg`);
    record.node.style.setProperty('--scroll-yaw', `${((1 - eased) * -22 * record.direction).toFixed(3)}deg`);
    record.node.style.setProperty('--scroll-spread', `${((1 - eased) * 38 * record.direction).toFixed(3)}px`);
    record.node.classList.toggle('is-scroll-pending', record.progress === 0);
    return record.started && record.progress < 1;
  }

  function focusSections() {
    const viewportCenter = scrollY + innerHeight * .5;
    const mobile = innerWidth <= 640;
    for (const stop of stops) {
      const distance = (stop.center - viewportCenter) / (innerHeight * .65 + stop.height * .25);
      const focus = Math.max(0, 1 - Math.abs(distance));
      const eased = focus * focus * (3 - 2 * focus);
      stop.section.style.setProperty('--section-presence', (1 - (1 - eased) * (mobile ? .12 : .28)).toFixed(4));
      stop.section.style.setProperty('--section-saturation', (.88 + eased * .12).toFixed(4));
      stop.section.style.setProperty('--section-title-rise', `${(mobile ? 0 : Math.max(-10, Math.min(10, distance * 12))).toFixed(2)}px`);
      stop.section.style.setProperty('--section-accent-scale', (.35 + eased * .65).toFixed(4));
    }
    // Blend between chapter centers instead of snapping a spotlight at section boundaries.
    const next = stops.findIndex((stop) => stop.center > viewportCenter);
    const to = stops[next < 0 ? stops.length - 1 : next];
    const from = stops[Math.max(0, (next < 0 ? stops.length - 1 : next) - 1)];
    const progress = Math.max(0, Math.min(1, (viewportCenter - from.center) / Math.max(1, to.center - from.center)));
    const blend = progress * progress * (3 - 2 * progress);
    const color = from.color.map((value, index) => Math.round(value + (to.color[index] - value) * blend));
    const y = Math.max(stops[0].center, Math.min(stops.at(-1).center, viewportCenter));
    main.style.setProperty('--gallery-glow-y', `${(y - mainTop).toFixed(2)}px`);
    main.style.setProperty('--gallery-glow-x', `${(50 + Math.sin(y / innerHeight * 1.3) * 16).toFixed(2)}%`);
    main.style.setProperty('--gallery-glow-color', color.join(', '));
  }

  function update(now = performance.now()) {
    frame = null;
    if (disposed || document.hidden) return;
    const elapsed = Math.max(0, Math.min(64, now - lastFrame));
    lastFrame = now;
    if (needsMeasure) {
      mainTop = main.getBoundingClientRect().top + scrollY;
      const rows = new Map();
      // Measure layout coordinates, independent of the perspective transform used for entry.
      for (const record of records) {
        record.top = layoutTop(record.node);
        if (record.node.matches('h2')) continue;
        const key = `${record.section.id}:${Math.round(record.top)}`;
        if (!rows.has(key)) rows.set(key, []);
        rows.get(key).push(record);
      }
      const rowNumbers = new Map();
      for (const row of rows.values()) {
        const section = row[0].section;
        const number = rowNumbers.get(section) || 0;
        row.forEach((record, index) => {
          const column = row.length === 1 ? .5 : index / (row.length - 1);
          record.stagger = (number % 2 ? 1 - column : column) * 240;
          record.direction = column * 2 - 1;
          record.wave = Math.sin(column * Math.PI) * 26;
        });
        rowNumbers.set(section, number + 1);
      }
      stops.forEach((stop) => {
        stop.top = layoutTop(stop.section);
        stop.height = stop.section.offsetHeight;
        stop.center = stop.top + stop.height / 2;
        stop.color = getComputedStyle(stop.section).getPropertyValue('--atmosphere-b').split(',').map(Number);
      });
      needsMeasure = false;
    }
    const openSection = stops.find((stop) => stop.section.querySelector('.fps-bubbles-host.is-open'))?.section;
    main.classList.toggle('gallery-motion-frozen', Boolean(openSection));
    const atBottom = scrollY + innerHeight >= document.documentElement.scrollHeight - 4;
    let animating = false;
    for (const record of records) {
      if (openSection && record.section !== openSection && !reduced.matches) continue;
      const force = reduced.matches || atBottom || record.section === openSection
        || record.node.contains(document.activeElement);
      const trigger = force || record.top - scrollY <= innerHeight * (record.node.matches('h2') ? .96 : .92);
      animating = reveal(record, Boolean(trigger), Boolean(force), elapsed) || animating;
    }
    if (!openSection || reduced.matches) {
      depth = Math.max(depth, scrollY + innerHeight * .88 - mainTop);
      if (atBottom) depth = main.scrollHeight + 220;
      main.style.setProperty('--gallery-reveal-depth', `${depth}px`);
    }
    let currentStop = 0;
    for (let index = 0; index < stops.length; index++) {
      if (stops[index].top <= scrollY + innerHeight * .35) currentStop = index;
    }
    if (atBottom) currentStop = stops.length - 1;
    stops.forEach((stop, index) => {
      if (index === currentStop) stop.link.setAttribute('aria-current', 'location');
      else stop.link.removeAttribute('aria-current');
    });
    if (!openSection) {
      const scrollRange = Math.max(1, document.documentElement.scrollHeight - innerHeight);
      const parallax = reduced.matches || innerWidth <= 640 ? 0 : (scrollY / scrollRange - .5) * 64;
      main.style.setProperty('--gallery-parallax', `${parallax.toFixed(2)}px`);
      if (!reduced.matches) focusSections();
    }
    main.classList.toggle('gallery-scroll-active', !reduced.matches);
    if (animating) requestUpdate();
  }

  function requestUpdate(measure = false) {
    needsMeasure ||= measure;
    if (!disposed && frame === null) frame = requestAnimationFrame(update);
  }

  records.forEach(({ node }) => node.classList.add('gallery-scroll-item'));
  update();
  const onScroll = () => requestUpdate();
  const onResize = () => requestUpdate(true);
  const onFocus = (event) => {
    for (const record of records) {
      if (record.node.contains(event.target)) reveal(record, true, true);
    }
    requestUpdate();
  };
  const onVisibility = () => { if (!document.hidden) requestUpdate(true); };
  const onPageshow = () => requestUpdate(true);
  const resize = new ResizeObserver(onResize);
  resize.observe(main);
  sections.forEach((section) => resize.observe(section));
  const changes = new MutationObserver(onResize);
  sections.forEach((section) => {
    changes.observe(section.querySelector('.fps-bubbles-host'), { attributes: true, attributeFilter: ['class'] });
  });
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('pageshow', onPageshow);
  document.addEventListener('focusin', onFocus);
  document.addEventListener('visibilitychange', onVisibility);
  reduced.addEventListener('change', onResize);
  window.addEventListener('pagehide', (event) => {
    cancelAnimationFrame(frame);
    frame = null;
    if (event.persisted) return;
    disposed = true;
    navigation.remove();
    document.body.classList.remove('gallery-enhanced');
    resize.disconnect();
    changes.disconnect();
    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('pageshow', onPageshow);
    document.removeEventListener('focusin', onFocus);
    document.removeEventListener('visibilitychange', onVisibility);
    reduced.removeEventListener('change', onResize);
  });
}
