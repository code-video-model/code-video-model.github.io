import * as THREE from './vendor/three.module.js';
import {cameraPose} from './camera.mjs';

const timeline = await fetch('./master-camera-timeline.json').then(r => r.json());
const WIDTH = timeline.width, HEIGHT = timeline.height, ASPECT = WIDTH / HEIGHT;
const INNER = 1.90, OUTER = 6.0, THICKNESS = 0.034, SHADOW_MARKER = 1.25;
const renderer = new THREE.WebGLRenderer({
  canvas: document.querySelector('#proxy'), antialias: false, alpha: false,
  preserveDrawingBuffer: true, powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setClearColor(0x000000, 1);
renderer.getContext().disable(renderer.getContext().DITHER);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(timeline.fieldOfViewDegrees, ASPECT, timeline.near, timeline.far);
const center = new THREE.Vector3();
const projectedCenter = new THREE.Vector3();
let time = 0, pose, shadowNdc = 0;

function annulusGeometry() { window.__bfTrace?.add(23);
  const positions = [], indices = [];
  const angles = 512, rings = 72, layerVertices = (angles + 1) * (rings + 1);
  for (const side of [-1, 1]) {
    for (let j = 0; j <= rings; j++) {
      const r = INNER + (OUTER - INNER) * j / rings;
      for (let i = 0; i <= angles; i++) {
        const phi = i * Math.PI * 2 / angles;
        positions.push(r * Math.cos(phi), side * THICKNESS / 2, r * Math.sin(phi));
      }
    }
  }
  for (let layer = 0; layer < 2; layer++) {
    for (let j = 0; j < rings; j++) for (let i = 0; i < angles; i++) {
      const a = layer * layerVertices + j * (angles + 1) + i, b = a + angles + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  for (const j of [0, rings]) for (let i = 0; i < angles; i++) {
    const a = j * (angles + 1) + i, b = a + layerVertices;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeBoundingSphere();
  return geometry;
}

const diskGeometry = annulusGeometry();
const diskColors = [];
const diskPositions = diskGeometry.attributes.position;
const innerColor = new THREE.Color('#ffdda9'), outerColor = new THREE.Color('#3c1c0a');
for (let i = 0; i < diskPositions.count; i++) {
  const radius = Math.hypot(diskPositions.getX(i), diskPositions.getZ(i));
  const u = Math.max(0, Math.min(1, (radius - INNER) / (OUTER - INNER)));
  const angle = Math.atan2(diskPositions.getZ(i), diskPositions.getX(i));
  const band = 0.86 + 0.14 * Math.sin(radius * 19 + angle * 3);
  const color = innerColor.clone().lerp(outerColor, Math.pow(u, 0.25)).multiplyScalar(band);
  diskColors.push(color.r, color.g, color.b);
}
diskGeometry.setAttribute('color', new THREE.Float32BufferAttribute(diskColors, 3));
const disk = new THREE.Mesh(diskGeometry, new THREE.MeshBasicMaterial({
  color: 0xffffff, vertexColors: true, depthWrite: true, depthTest: true, side: THREE.DoubleSide,
}));
disk.name = 'ONE_annular_matter_disk';
disk.userData.role = 'matter: one flat annular volume, genuinely empty inside r=1.90';
disk.renderOrder = 3;
scene.add(disk);

const marker = new THREE.Mesh(new THREE.SphereGeometry(SHADOW_MARKER, 192, 128),
  new THREE.MeshBasicMaterial({color: 0x000000, depthTest: true, depthWrite: true}));
marker.name = 'shadow_placeholder_NOT_event_horizon';
marker.userData.role = 'unlit silhouette proxy only; NOT an observable physical sphere or a calibrated event horizon';
marker.renderOrder = 2;
scene.add(marker);

function setCamera(seconds) { window.__bfTrace?.add(80);
  pose = cameraPose(timeline, seconds);
  camera.position.fromArray(pose.position);
  camera.up.set(0, 1, 0);
  camera.lookAt(new THREE.Vector3().fromArray(pose.target));
  camera.updateMatrixWorld(true);
  projectedCenter.copy(center).project(camera);
  const cameraSpaceCenter = center.clone().applyMatrix4(camera.matrixWorldInverse);
  const depth = -cameraSpaceCenter.z;
  shadowNdc = SHADOW_MARKER / Math.sqrt(depth * depth - SHADOW_MARKER * SHADOW_MARKER)
    / Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
}

let seed = 0x0739efd6;
function random() { window.__bfTrace?.add(94);
  seed ^= seed << 13; seed ^= seed >>> 17; seed ^= seed << 5;
  return (seed >>> 0) / 4294967296;
}
setCamera(3.5);
const catalog = [];
const landmarks = [[-0.7, 0.5], [0.2, 0.75], [0.7, 0.5], [-0.15, 0.30], [0.40, -0.30], [-0.6, -0.7], [0.0, -0.75], [0.9, -0.6]];
for (let i = 0; i < landmarks.length; i++) {
  const direction = new THREE.Vector3(...landmarks[i], 0.5).unproject(camera).sub(camera.position).normalize();
  catalog.push({id: `landmark-${i + 1}`, position: direction.multiplyScalar(2200).toArray(), brightness: 0.68 + i % 3 * 0.09, size: 5.6, tint: i % 2});
}
for (let i = 0; i < 1100; i++) {
  const y = 2 * random() - 1, phi = random() * Math.PI * 2, r = Math.sqrt(1 - y * y);
  catalog.push({id: `star-${i}`, position: [r * Math.cos(phi) * 2200, y * 2200, r * Math.sin(phi) * 2200],
    brightness: 0.23 + random() * 0.47, size: 2.5 + random() * 1.9, tint: random()});
}
const starGeometry = new THREE.BufferGeometry();
starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(catalog.flatMap(s => s.position), 3));
const stars = new THREE.Points(starGeometry, new THREE.PointsMaterial({
  color: 0x777777, size: 2, sizeAttenuation: false, depthWrite: false, depthTest: false,
}));
stars.name = 'fixed_world_star_catalog';
stars.frustumCulled = false;
stars.renderOrder = 0;
scene.add(stars);

function fnv(array) { window.__bfTrace?.add(120);
  let h = 2166136261;
  for (const value of new Uint8Array(array.buffer, array.byteOffset, array.byteLength)) {
    h ^= value; h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}
const geometryHash = fnv(diskGeometry.attributes.position.array);
const starHash = fnv(starGeometry.attributes.position.array);
const gl = renderer.getContext();
const debug = gl.getExtension('WEBGL_debug_renderer_info');
const device = {
  vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
  renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  version: gl.getParameter(gl.VERSION), threeRevision: THREE.REVISION,
};
const rawPixels = new Uint8Array(WIDTH * HEIGHT * 4);
let lastPixelAudit = null;
function seek(seconds) { window.__bfTrace?.add(138);
  if (!Number.isFinite(seconds)) throw new Error('seek requires a finite absolute time');
  time = Math.max(0, Math.min(8, seconds));
  setCamera(time);
  renderer.render(scene, camera);
  lastPixelAudit = null;
}
function projectedStar(star) { window.__bfTrace?.add(145);
  const p = new THREE.Vector3().fromArray(star.position);
  const cameraSpace = p.clone().applyMatrix4(camera.matrixWorldInverse);
  const ndc = p.project(camera);
  return {id: star.id, world: star.position, unwarpedNdc: [ndc.x, ndc.y],
    mappedNdc: [ndc.x, ndc.y], influence: 0, stretch: 1, inFront: cameraSpace.z < 0};
}
function diagnostics() { window.__bfTrace?.add(152);
  return {
    time, renderer: device, camera: {...pose, quaternion: camera.quaternion.toArray(),
      worldMatrix: camera.matrixWorld.toArray(), projectionMatrix: camera.projectionMatrix.toArray()},
    blackHoleNdc: projectedCenter.toArray(), lensCenterNdc: [projectedCenter.x, projectedCenter.y], shadowRadiusNdc: shadowNdc,
    staticSceneDigest: `${geometryHash}:${starHash}`,
    fixedGeometryDigest: geometryHash, starCatalogDigest: starHash, starCount: catalog.length,
    disk: {solidMatterMeshCount: 1, innerRadius: INNER, outerRadius: OUTER, thickness: THICKNESS,
      planeNormal: [0, 1, 0], minimumVertexRadius: INNER, materialFree: true,
      encoding: 'uniform unlit neutral fill; true geometric boundaries only; no stroked edges',
      emission: false, texture: false, differentialEmissivityRemoved: true},
    center: {radius: SHADOW_MARKER, role: marker.userData.role, unlit: true, eventHorizonModeled: false},
    opticalImages: {rendered: false, raisedDiskImage: false, upperBand: false, lowerBand: false,
      solidAuxiliaryDisks: 0, geometryCount: 0, shadowOutline: false, haloContour: false},
    appearance: {neutral: false, colorizedPreview: true, lightCount: 0, textureCount: 0, bloom: false,
      backgroundRgb: [0, 0, 0], concentricTexture: false, fullPhotonRing: false,
      fadingOverlay: false, silhouetteFromWorldGeometry: true, boundaryStrokes: false,
      starLensing: false, starStretching: false, starPointSizePixels: 2},
    trackedStars: catalog.slice(0, landmarks.length).map(projectedStar),
    sceneInventory: scene.children.map(o => ({
      name: o.name, type: o.type, geometry: o.geometry.type, material: o.material.type,
      colorHex: o.material.color.getHexString(), wireframe: !!o.material.wireframe,
      map: !!o.material.map, transparent: o.material.transparent, opacity: o.material.opacity,
      children: o.children.length,
    })),
    renderCalls: renderer.info.render.calls,
    nativePixelAudit: lastPixelAudit,
    visibleHelpers: 0, sceneObjectNames: scene.children.map(o => o.name),
  };
}

window.reconstruction = {
  ready: true, pause() {}, seek, diagnostics,
  timeline, cameraPose: seconds => cameraPose(timeline, seconds),
  starCatalog: () => catalog,
  geometryAudit() {
    const a = diskGeometry.attributes.position.array;
    let minRadius = Infinity, maxRadius = 0, maxAbsY = 0, minTriangleRadius = Infinity;
    for (let i = 0; i < a.length; i += 3) {
      const r = Math.hypot(a[i], a[i + 2]);
      minRadius = Math.min(minRadius, r); maxRadius = Math.max(maxRadius, r); maxAbsY = Math.max(maxAbsY, Math.abs(a[i + 1]));
    }
    const index = diskGeometry.index.array;
    for (let i = 0; i < index.length; i += 3) {
      let x = 0, z = 0;
      for (let k = 0; k < 3; k++) { x += a[index[i + k] * 3]; z += a[index[i + k] * 3 + 2]; }
      minTriangleRadius = Math.min(minTriangleRadius, Math.hypot(x / 3, z / 3));
    }
    const renderables = [];
    scene.traverse(o => {
      if (o.isMesh || o.isPoints || o.isLine) renderables.push({
        name: o.name, type: o.type, geometry: o.geometry.type,
        material: o.material.type, vertexCount: o.geometry.attributes.position.count,
      });
    });
    return {minRadius, maxRadius, maxAbsY, minTriangleCentroidRadius: minTriangleRadius,
      vertexCount: a.length / 3, triangleCount: index.length / 3,
      matterMeshes: renderables.filter(o => o.name === disk.name).length,
      renderables, auxiliaryGeometryCount: renderables.filter(o => ![disk.name, marker.name, stars.name].includes(o.name)).length,
      lineGeometryCount: renderables.filter(o => o.type.includes('Line')).length,
      customShaderCount: scene.children.filter(o => o.material.isShaderMaterial).length};
  },
  rawFrameHash() {
    gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, rawPixels);
    return fnv(rawPixels);
  },
  async streamFrame(frame) {
    gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, rawPixels);
    const histogram = new Uint32Array(256);
    let nonNeutralPixels = 0;
    for (let i = 0; i < rawPixels.length; i += 4) {
      histogram[rawPixels[i]]++;
      if (rawPixels[i] !== rawPixels[i + 1] || rawPixels[i] !== rawPixels[i + 2]) nonNeutralPixels++;
    }
    lastPixelAudit = {
      nonNeutralPixels, pixelCount: WIDTH * HEIGHT,
      grayscaleHistogram: Object.fromEntries(Array.from(histogram.entries()).filter(([, count]) => count)),
    };
    const response = await fetch(`/__frame?index=${frame}`, {method: 'POST', body: rawPixels});
    if (!response.ok) throw new Error(`Frame transport: ${response.status}`);
  },
};
seek(0);
