(() => {
  const viewer = document.querySelector('.image-viewer');
  const viewerImage = viewer.querySelector('img');
  const viewerCaption = viewer.querySelector('.viewer-caption p');
  const original = viewer.querySelector('.viewer-caption a');
  const zoom = viewer.querySelector('.viewer-zoom');
  function setZoom(enlarged) {
    viewer.classList.toggle('zoomed', enlarged);
    zoom.setAttribute('aria-pressed', String(enlarged));
    zoom.textContent = enlarged ? '适应窗口' : '放大';
    viewer.querySelector('.viewer-image').scrollTo(0, 0);
  }
  zoom.addEventListener('click', () => setZoom(!viewer.classList.contains('zoomed')));
  for (const image of document.querySelectorAll('.article-body img')) {
    const link = image.closest('a');
    if (!link) continue;
    link.addEventListener('click', event => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      viewerCaption.textContent = image.alt;
      viewerImage.alt = image.alt;
      viewerImage.src = image.src;
      original.href = link.href;
      setZoom(false);
      viewer.showModal();
    });
  }
  viewerImage.addEventListener('error', () => {
    viewerCaption.textContent = '图片加载失败，请尝试打开原图。';
  });
  viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
  viewer.addEventListener('click', event => {
    if (event.target === viewer) viewer.close();
  });

  const videos = [...document.querySelectorAll('#demo')];
  for (const video of videos) {
    const status = video.nextElementSibling;
    video.addEventListener('error', () => {
      status.textContent = '视频加载失败，请前往文末项目主页查看。';
    });
    video.addEventListener('loadeddata', () => { status.textContent = ''; });
  }
})();
