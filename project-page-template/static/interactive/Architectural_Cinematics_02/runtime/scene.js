import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAMES = 124;
const DURATION = FRAMES / FPS;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbccfd3);
scene.fog = new THREE.Fog(0xbccfd3, 30, 62);

const camera = new THREE.PerspectiveCamera(60, WIDTH / HEIGHT, 0.08, 90);

const mat = {
  plaster: new THREE.MeshStandardMaterial({ color: 0xded8cc, roughness: 0.88 }),
  plasterWarm: new THREE.MeshStandardMaterial({ color: 0xbfae96, roughness: 0.92 }),
  charcoal: new THREE.MeshStandardMaterial({ color: 0x252c2d, roughness: 0.62, metalness: 0.12 }),
  soffit: new THREE.MeshStandardMaterial({ color: 0x3c3028, roughness: 0.76 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x8f8b81, roughness: 0.9 }),
  concreteLight: new THREE.MeshStandardMaterial({ color: 0xb8b1a3, roughness: 0.86 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x9e9b90, roughness: 0.82 }),
  joint: new THREE.MeshStandardMaterial({ color: 0x655f58, roughness: 1 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8f5534, roughness: 0.68 }),
  woodLight: new THREE.MeshStandardMaterial({ color: 0xb47745, roughness: 0.64 }),
  upholstery: new THREE.MeshStandardMaterial({ color: 0xc8bdab, roughness: 0.96 }),
  textile: new THREE.MeshStandardMaterial({ color: 0x6c6e65, roughness: 1 }),
  soil: new THREE.MeshStandardMaterial({ color: 0x32271e, roughness: 1 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x68412a, roughness: 1 }),
  leafA: new THREE.MeshStandardMaterial({ color: 0x426d48, roughness: 0.96 }),
  leafB: new THREE.MeshStandardMaterial({ color: 0x5a8256, roughness: 0.94 }),
  leafC: new THREE.MeshStandardMaterial({ color: 0x7c9665, roughness: 0.94 }),
  rug: new THREE.MeshStandardMaterial({ color: 0x705c4b, roughness: 1 }),
  black: new THREE.MeshStandardMaterial({ color: 0x080a0a, roughness: 0.45 }),
  brass: new THREE.MeshStandardMaterial({ color: 0x9b6e37, roughness: 0.38, metalness: 0.72 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xa8ced2,
    transparent: true,
    opacity: 0.18,
    roughness: 0.12,
    metalness: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  water: new THREE.MeshPhysicalMaterial({
    color: 0x598b8a,
    transparent: true,
    opacity: 0.7,
    roughness: 0.12,
    metalness: 0.08,
  }),
};

const architecture = new THREE.Group();
architecture.name = 'Contemporary courtyard house';
scene.add(architecture);

function box(name, size, position, material, parent = architecture, shadows = true) { window.__bfTrace?.add(73);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  parent.add(mesh);
  return mesh;
}

function cylinder(name, radiusTop, radiusBottom, height, position, material, segments = 18, parent = architecture) { window.__bfTrace?.add(83);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function beamBetween(name, start, end, radius, material, parent) { window.__bfTrace?.add(96);
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const midpoint = a.clone().add(b).multiplyScalar(0.5);
  const mesh = cylinder(name, radius * 0.78, radius, a.distanceTo(b), midpoint.toArray(), material, 12, parent);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return mesh;
}

// Ground and the four wings retain a readable ring around the open courtyard.
box('Garden ground', [46, 0.22, 46], [0, -0.26, 0], mat.plasterWarm, architecture, false);
box('South hallway floor', [20, 0.22, 8], [0, 0, 10.2], mat.concrete);
box('North living floor', [20, 0.22, 8], [0, 0, -10.2], mat.concreteLight);
box('West gallery floor', [4, 0.22, 12.4], [-8, 0, 0], mat.concrete);
box('East gallery floor', [4, 0.22, 12.4], [8, 0, 0], mat.concrete);

box('South roof', [20.4, 0.4, 8.4], [0, 4.55, 10.2], mat.soffit);
box('North roof', [20.4, 0.4, 8.4], [0, 4.55, -10.2], mat.soffit);
box('West roof', [4.4, 0.4, 12.4], [-8, 4.55, 0], mat.soffit);
box('East roof', [4.4, 0.4, 12.4], [8, 4.55, 0], mat.soffit);

box('South exterior wall', [20, 4.5, 0.34], [0, 2.25, 14.05], mat.plaster);
box('North exterior wall', [20, 4.5, 0.34], [0, 2.25, -14.05], mat.plaster);
box('West exterior wall', [0.34, 4.5, 28], [-10.05, 2.25, 0], mat.plaster);
box('East exterior wall', [0.34, 4.5, 28], [10.05, 2.25, 0], mat.plaster);

for (const x of [-9.8, -6.15, 6.15, 9.8]) {
  box(`South structure ${x}`, [0.3, 4.45, 0.42], [x, 2.25, 6.12], mat.charcoal);
  box(`North structure ${x}`, [0.3, 4.45, 0.42], [x, 2.25, -6.12], mat.charcoal);
}
for (const z of [-5.9, -2.1, 2.1, 5.9]) {
  box(`West courtyard structure ${z}`, [0.42, 4.45, 0.28], [-6.05, 2.25, z], mat.charcoal);
  box(`East courtyard structure ${z}`, [0.42, 4.45, 0.28], [6.05, 2.25, z], mat.charcoal);
}

function glassPanel(name, size, position) { window.__bfTrace?.add(131);
  return box(name, size, position, mat.glass, architecture, false);
}

// Floor-to-ceiling glazing with broad central openings on the camera axis.
glassPanel('South glass left', [6, 3.86, 0.08], [-6.6, 2.15, 6.1]);
glassPanel('South glass right', [6, 3.86, 0.08], [6.6, 2.15, 6.1]);
glassPanel('North glass left', [6.9, 3.86, 0.08], [-6.55, 2.15, -6.1]);
glassPanel('North glass right', [6.9, 3.86, 0.08], [6.55, 2.15, -6.1]);
glassPanel('West courtyard glass', [0.08, 3.86, 11.4], [-6.03, 2.15, 0]);
glassPanel('East courtyard glass', [0.08, 3.86, 11.4], [6.03, 2.15, 0]);

box('South opening header', [6.1, 0.32, 0.35], [0, 4.25, 6.1], mat.charcoal);
box('North opening header', [5.4, 0.32, 0.35], [0, 4.25, -6.1], mat.charcoal);
for (const x of [-3.05, 3.05]) {
  box(`South opening jamb ${x}`, [0.22, 4.2, 0.34], [x, 2.1, 6.1], mat.charcoal);
}
for (const x of [-2.7, 2.7]) {
  box(`North opening jamb ${x}`, [0.22, 4.2, 0.34], [x, 2.1, -6.1], mat.charcoal);
}

// Paving grid makes camera translation and perspective immediately legible.
box('Courtyard paving', [11.8, 0.18, 11.8], [0, 0.01, 0], mat.stone);
for (let i = -2; i <= 2; i += 1) {
  box(`Paving joint x ${i}`, [0.045, 0.015, 11.7], [i * 2.35, 0.108, 0], mat.joint, architecture, false);
  box(`Paving joint z ${i}`, [11.7, 0.015, 0.045], [0, 0.108, i * 2.35], mat.joint, architecture, false);
}

const planter = new THREE.Group();
planter.name = 'Central circular tree planter';
architecture.add(planter);
cylinder('Planter rim', 1.88, 2.05, 0.48, [0, 0.31, 0], mat.concreteLight, 48, planter);
cylinder('Planter soil', 1.67, 1.67, 0.08, [0, 0.59, 0], mat.soil, 48, planter);

const tree = new THREE.Group();
tree.name = 'Mature courtyard tree';
architecture.add(tree);
cylinder('Tree trunk', 0.34, 0.48, 4.55, [0, 2.75, 0], mat.trunk, 16, tree);
for (const [endX, endZ, radius] of [[1.05, 0.25, 0.13], [-0.8, 0.72, 0.12], [-0.55, -0.9, 0.1]]) {
  beamBetween('Exposed tree root', [0, 0.69, 0], [endX, 0.64, endZ], radius, mat.trunk, tree);
}
beamBetween('Tree branch west', [0, 4.35, 0], [-1.38, 6.25, 0.35], 0.25, mat.trunk, tree);
beamBetween('Tree branch east', [0.08, 4.2, 0], [1.56, 5.9, -0.5], 0.23, mat.trunk, tree);
beamBetween('Tree branch north', [0, 4.75, 0], [-0.25, 6.55, -1.25], 0.2, mat.trunk, tree);
beamBetween('Tree branch south', [0, 4.65, 0.12], [0.6, 6.25, 1.42], 0.18, mat.trunk, tree);

const leafClusters = [];
const foliageData = [
  [-1.55, 6.45, 0.35, 1.35, 0], [-0.65, 7.05, -0.4, 1.45, 1],
  [0.6, 6.85, -0.7, 1.5, 2], [1.55, 6.15, -0.35, 1.32, 1],
  [1.0, 6.55, 1.05, 1.48, 0], [-0.3, 6.8, 1.3, 1.38, 2],
  [-1.55, 6.05, -0.9, 1.18, 1], [0.15, 7.55, 0.4, 1.25, 0],
  [2.05, 6.15, 0.65, 1.05, 2], [-2.1, 6.05, 0.85, 1.05, 0],
];
foliageData.forEach(([x, y, z, scale, color], index) => {
  const mesh = new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, 2),
    [mat.leafA, mat.leafB, mat.leafC][color],
  );
  mesh.name = `Foliage cluster ${index}`;
  mesh.position.set(x, y, z);
  mesh.scale.set(scale * 1.15, scale * 0.84, scale);
  mesh.rotation.set(index * 0.37, index * 0.61, index * 0.19);
  mesh.userData.baseRotation = mesh.rotation.clone();
  mesh.userData.phase = index * 0.73;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  tree.add(mesh);
  leafClusters.push(mesh);
});

// A narrow reflecting pool and planting balance the massive tree and aid depth reading.
box('Reflecting pool curb', [3.1, 0.16, 1.25], [3.9, 0.2, 3.85], mat.concreteLight);
box('Reflecting pool water', [2.8, 0.08, 0.95], [3.9, 0.31, 3.85], mat.water, architecture, false);
for (const [x, z, s] of [[-4.9, 4.7, 0.8], [4.9, -4.8, 0.7], [-5.0, -4.7, 0.72]]) {
  const pot = cylinder('Courtyard planter pot', 0.38, 0.46, 0.65, [x, 0.43, z], mat.charcoal, 20);
  const plant = new THREE.Mesh(new THREE.IcosahedronGeometry(0.62, 1), mat.leafC);
  plant.position.set(x, 1.08, z);
  plant.scale.set(s, 1.25 * s, s);
  plant.castShadow = true;
  architecture.add(plant);
  pot.receiveShadow = true;
}

// South entry hall details read in silhouette before the courtyard reveal.
for (let x = -8.7; x <= -4.1; x += 0.46) {
  box(`Entry timber slat ${x.toFixed(2)}`, [0.12, 3.55, 0.22], [x, 2.0, 12.9], mat.wood, architecture, false);
}
box('Entry console', [3.2, 0.18, 0.72], [6.6, 1.05, 12.85], mat.wood);
box('Entry console left leg', [0.14, 1.05, 0.14], [5.3, 0.54, 12.85], mat.charcoal);
box('Entry console right leg', [0.14, 1.05, 0.14], [7.9, 0.54, 12.85], mat.charcoal);
box('Entry artwork recess', [3.5, 1.65, 0.08], [6.6, 2.63, 13.84], mat.charcoal, architecture, false);
box('Entry artwork panel', [2.75, 1.0, 0.06], [6.6, 2.63, 13.78], mat.plasterWarm, architecture, false);

// The opposite living wing is deliberately furnished off-axis so the camera can enter unobstructed.
box('Living rug', [5.2, 0.05, 3.7], [4.6, 0.15, -10.45], mat.rug, architecture, false);
box('Living sofa seat', [3.9, 0.55, 1.1], [5.7, 0.68, -9.25], mat.upholstery);
box('Living sofa back', [3.9, 1.05, 0.36], [5.7, 1.28, -9.78], mat.upholstery);
box('Living sofa return', [1.1, 0.55, 2.5], [7.1, 0.68, -10.55], mat.upholstery);
box('Living sofa near arm', [0.28, 0.86, 1.18], [3.82, 0.84, -9.28], mat.upholstery);
box('Living sofa far arm', [0.28, 0.86, 1.18], [7.58, 0.84, -9.28], mat.upholstery);
for (const x of [4.35, 5.65, 6.9]) {
  box(`Sofa cushion ${x}`, [1.05, 0.62, 0.28], [x, 1.2, -9.54], mat.plasterWarm);
}
box('Coffee table top', [2.5, 0.15, 1.25], [4.25, 0.68, -11.15], mat.woodLight);
box('Coffee table plinth', [1.65, 0.5, 0.8], [4.25, 0.39, -11.15], mat.charcoal);
box('Media wall timber', [5.4, 3.3, 0.22], [4.8, 2.0, -13.78], mat.wood);
box('Media screen', [2.8, 1.55, 0.10], [4.6, 2.25, -13.62], mat.black, architecture, false);
box('Media hearth', [4.6, 0.38, 0.45], [4.8, 0.4, -13.45], mat.concreteLight);
for (let x = 0.6; x <= 1.8; x += 0.24) {
  box(`Living timber screen ${x.toFixed(2)}`, [0.1, 3.45, 0.22], [x, 2.02, -13.72], mat.woodLight, architecture, false);
}
box('Living display shelf', [1.6, 0.12, 0.36], [8.5, 2.65, -13.55], mat.brass);
box('Living display shelf lower', [1.6, 0.12, 0.36], [8.5, 1.45, -13.55], mat.brass);

box('Dining rug', [4.8, 0.04, 3.6], [-5.4, 0.15, -10.35], mat.textile, architecture, false);
box('Dining table', [3.7, 0.17, 1.45], [-5.35, 0.96, -10.4], mat.wood);
for (const [x, z] of [[-6.7, -10.9], [-4.0, -10.9], [-6.7, -9.9], [-4.0, -9.9]]) {
  box('Dining chair seat', [0.72, 0.16, 0.72], [x, 0.62, z], mat.charcoal);
  box('Dining chair back', [0.72, 0.75, 0.14], [x, 1.02, z + (z < -10.4 ? -0.28 : 0.28)], mat.charcoal);
}
for (const x of [-6.25, -4.45]) {
  cylinder('Dining pendant shade', 0.16, 0.44, 0.42, [x, 2.92, -10.4], mat.charcoal, 24);
  cylinder('Dining pendant stem', 0.025, 0.025, 1.2, [x, 3.7, -10.4], mat.brass, 10);
  const bulb = new THREE.PointLight(0xffb867, 14, 3.5, 2);
  bulb.position.set(x, 2.72, -10.4);
  scene.add(bulb);
}

// Side galleries add layered silhouettes through the glass.
box('West gallery bench', [0.85, 0.5, 4.4], [-8.35, 0.43, 0], mat.wood);
for (const z of [-4.5, -3, -1.5, 0, 1.5, 3, 4.5]) {
  box(`West shelf ${z}`, [0.36, 2.8, 0.1], [-9.76, 1.65, z], mat.charcoal);
}
box('East gallery cabinet', [1.0, 1.1, 4.8], [8.8, 0.66, -0.5], mat.wood);

// Architectural lighting: cool daylight in court, warm pools under deep roofs.
const hemi = new THREE.HemisphereLight(0xd7e8ed, 0x5f5548, 1.7);
scene.add(hemi);
const ambient = new THREE.AmbientLight(0xaabbbd, 0.28);
scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffefd5, 3.25);
sun.position.set(-11, 17, 9);
sun.target.position.set(0, 0, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 18;
sun.shadow.camera.bottom = -18;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 46;
sun.shadow.bias = -0.0004;
scene.add(sun, sun.target);

const warmLights = [];
for (const [x, z, intensity] of [[-5, 10, 40], [5, 10, 40], [-5, -10, 52], [4, -10.2, 60]]) {
  const light = new THREE.PointLight(0xffc47f, intensity, 8, 2);
  light.position.set(x, 3.55, z);
  scene.add(light);
  warmLights.push(light);
  cylinder('Ceiling downlight', 0.13, 0.13, 0.05, [x, 4.31, z], mat.brass, 16);
}

const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.2, 2.25, 12.05),
  new THREE.Vector3(0.1, 2.3, 9.35),
  new THREE.Vector3(-1.15, 2.38, 6.25),
  new THREE.Vector3(-4.35, 2.58, 3.45),
  new THREE.Vector3(-5.05, 2.68, -0.8),
  new THREE.Vector3(-3.55, 2.52, -4.55),
  new THREE.Vector3(-0.45, 2.35, -6.45),
  new THREE.Vector3(0.15, 2.28, -7.55),
  new THREE.Vector3(0.3, 2.25, -9.15),
], false, 'centripetal');

const lookPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 2.25, 2.4),
  new THREE.Vector3(0, 2.5, 0.4),
  new THREE.Vector3(0, 2.85, 0),
  new THREE.Vector3(0, 3.05, 0),
  new THREE.Vector3(0, 3.0, 0),
  new THREE.Vector3(-0.45, 2.45, -5.7),
  new THREE.Vector3(1.3, 2.12, -9.35),
  new THREE.Vector3(3.2, 1.9, -11.15),
  new THREE.Vector3(4.45, 1.85, -12.35),
], false, 'centripetal');

function smoothstep(value) { window.__bfTrace?.add(319);
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function updateAtTime(seconds) { window.__bfTrace?.add(324);
  const time = THREE.MathUtils.clamp(Number(seconds) || 0, 0, DURATION);
  const progress = smoothstep(time / DURATION);
  camera.position.copy(path.getPointAt(progress));
  const target = lookPath.getPointAt(progress);
  camera.fov = 55 + 5.5 * Math.sin(Math.PI * progress);
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  camera.updateMatrixWorld(true);

  leafClusters.forEach((leaf) => {
    const base = leaf.userData.baseRotation;
    const phase = leaf.userData.phase;
    leaf.rotation.x = base.x + 0.012 * Math.sin(time * 1.7 + phase);
    leaf.rotation.y = base.y + 0.018 * Math.sin(time * 1.15 + phase * 0.7);
    leaf.rotation.z = base.z + 0.02 * Math.cos(time * 1.4 + phase);
  });
  warmLights.forEach((light, index) => {
    light.intensity = [40, 40, 52, 60][index] * (1 + 0.012 * Math.sin(time * 2.1 + index));
  });

  renderer.render(scene, camera);
  return time;
}

let animationHandle = 0;
let paused = false;
const playbackStart = performance.now();

function animate(now) { window.__bfTrace?.add(353);
  if (paused) return;
  updateAtTime(((now - playbackStart) / 1000) % DURATION);
  animationHandle = requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    paused = true;
    if (animationHandle) cancelAnimationFrame(animationHandle);
    animationHandle = 0;
  },
  seek(seconds) {
    paused = true;
    if (animationHandle) cancelAnimationFrame(animationHandle);
    animationHandle = 0;
    return updateAtTime(seconds);
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
};

updateAtTime(0);
animationHandle = requestAnimationFrame(animate);
