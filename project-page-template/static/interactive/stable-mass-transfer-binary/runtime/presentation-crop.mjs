import "./case/main.js";
// Match the symmetric crop of the displayed video without changing scene content.
const crop = {"source_width": 1280, "source_height": 720, "width": 960, "height": 540};
const api = window.reconstruction;
const capture = window.__bfCapture;
if (!api?.seek || !capture?.camera?.isPerspectiveCamera) throw new Error('Missing source capture');
const { renderer, camera, scene } = capture;
const originalSeek = api.seek.bind(api);
let nativeFov = camera.fov;
const verticalFraction = Math.min(1, (crop.source_width / crop.source_height) / (crop.width / crop.height));
api.seek = time => {
  camera.fov = nativeFov;
  originalSeek(time);
  nativeFov = camera.fov;
  camera.fov = 2 * Math.atan(Math.tan(nativeFov * Math.PI / 360) * verticalFraction) * 180 / Math.PI;
  camera.aspect = crop.width / crop.height;
  camera.updateProjectionMatrix();
  renderer.setSize(crop.width, crop.height);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, crop.width, crop.height);
  renderer.clear(true, true, true);
  renderer.render(scene, camera);
};
api.seek(0);
