(() => {
  if (document.documentElement.hasAttribute('data-integrated-gallery')) return;
  const source = new URL(location.href);
  if (!source.searchParams.has('case')) return;
  const gallery = new URL('gallery.html', source);
  gallery.searchParams.set('case', source.searchParams.get('case') || '505');
  if (source.searchParams.has('selection')) gallery.searchParams.set('selection', source.searchParams.get('selection'));
  gallery.hash = source.hash;
  document.documentElement.hidden = true;
  location.replace(gallery.href);
})();
