import * as THREE from '../vendor/three.module.js';
import { buildScene } from './scene.mjs';

const spec = await (await fetch('../spec.json')).json();
const { width, height, duration } = spec.target;
const canvas = document.getElementById('proxy');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.setSize(width, height);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.autoClear = false;
const built = buildScene(THREE, spec);
const { scene, camera, setTime } = built;
if (!scene?.isScene || !camera?.isPerspectiveCamera || typeof setTime !== 'function') {
  throw new Error('buildScene must return {scene, camera: PerspectiveCamera, setTime(t)}');
}
const [x, y, w, h] = spec.normalization.viewport;
camera.aspect = w / h;
camera.updateProjectionMatrix();
const renderOverride = new URLSearchParams(window.location.search).get('renderOverride') || 'rgb';
if (renderOverride === 'gray-model') {
  scene.background = new THREE.Color(0x777777);
  scene.overrideMaterial = new THREE.MeshStandardMaterial({
    color: 0xa6a6a6,
    roughness: 0.72,
    metalness: 0.0,
    side: THREE.DoubleSide,
  });
} else if (renderOverride !== 'rgb') {
  throw new Error(`Unknown render override: ${renderOverride}`);
}

function seek(time) { window.__bfTrace?.add(37);
  if (!Number.isFinite(time)) throw new Error('Seek requires finite time');
  setTime(Math.max(0, Math.min(duration, time)));
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  renderer.setScissorTest(false);
  renderer.setViewport(0, 0, width, height);
  renderer.setClearColor(0x000000, 1);
  renderer.clear(true, true, true);
  renderer.setViewport(x, height - y - h, w, h);
  renderer.setScissor(x, height - y - h, w, h);
  renderer.setScissorTest(true);
  renderer.render(scene, camera);
}

function diagnostics() { window.__bfTrace?.add(54);
  let hash = 2166136261;
  let objects = 0;
  const seenGeometry = new Set();
  const add = values => {
    for (const value of values) {
      hash = Math.imul(hash ^ Math.round(value * 1e6), 16777619) >>> 0;
    }
  };
  scene.traverse(object => {
    if (object.isCamera) return;
    objects++;
    add(object.matrixWorld.elements);
    add([Number(object.visible)]);
    if (object.instanceMatrix) add(object.instanceMatrix.array);
    if (object.geometry && !seenGeometry.has(object.geometry.uuid)) {
      seenGeometry.add(object.geometry.uuid);
      for (const attribute of Object.values(object.geometry.attributes)) add(attribute.array);
      if (object.geometry.index) add(object.geometry.index.array);
    }
    for (const material of [object.material].flat().filter(Boolean)) {
      if (material.color) add(material.color.toArray());
      if (material.emissive) add(material.emissive.toArray());
      add([material.opacity, material.roughness ?? 0, material.metalness ?? 0,
        material.emissiveIntensity ?? 0, material.transparent ? 1 : 0,
        material.depthWrite ? 1 : 0, material.side ?? 0]);
    }
  });
  const gl = renderer.getContext();
  const extension = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    camera: { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(),
      fov: camera.fov, aspect: camera.aspect, near: camera.near, far: camera.far,
      projectionMatrix: camera.projectionMatrix.toArray() },
    staticSceneDigest: hash.toString(16), objectCount: objects,
    calls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
    renderer: extension ? gl.getParameter(extension.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
    renderOverride,
    viewport: [x, y, w, h],
  };
}

async function streamFrame(index) {
  if (!Number.isInteger(index) || index < 0) throw new Error('Frame index must be a non-negative integer');
  const gl = renderer.getContext();
  const pixels = new Uint8Array(width * height * 4);
  gl.readPixels(0, 0, width, height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const response = await fetch(`/__frame?index=${index}`, {
    method: 'POST',
    headers: {'Content-Type': 'application/octet-stream'},
    body: pixels,
  });
  if (!response.ok) throw new Error(`Raw frame upload failed: ${response.status} ${await response.text()}`);
}

window.reconstruction = { pause() {}, seek, diagnostics, streamFrame, ready: true };
seek(0);
