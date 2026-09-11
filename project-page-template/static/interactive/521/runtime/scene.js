import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;
const FREEZE_START = 0.72;
const FREEZE_END = 4.50;

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.98;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x202a30);
scene.fog = new THREE.Fog(0x202a30, 15, 31);

const camera = new THREE.PerspectiveCamera(43, WIDTH / HEIGHT, 0.04, 80);
camera.position.set(7.55, 5.05, 7.65);

const materials = {
  wall: new THREE.MeshStandardMaterial({ color: 0x9aa4a2, roughness: 0.9, metalness: 0.02 }),
  grout: new THREE.MeshStandardMaterial({ color: 0x475156, roughness: 0.9 }),
  counter: new THREE.MeshStandardMaterial({ color: 0x31393c, roughness: 0.3, metalness: 0.45 }),
  cabinet: new THREE.MeshStandardMaterial({ color: 0x263039, roughness: 0.42, metalness: 0.25 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x9ca8ad, roughness: 0.22, metalness: 0.92 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x1b2124, roughness: 0.28, metalness: 0.83 }),
  wok: new THREE.MeshStandardMaterial({ color: 0x151b1d, roughness: 0.25, metalness: 0.86, side: THREE.DoubleSide }),
  wokInner: new THREE.MeshStandardMaterial({ color: 0x263033, roughness: 0.34, metalness: 0.8, side: THREE.BackSide }),
  chefWhite: new THREE.MeshStandardMaterial({ color: 0xf1f1e9, roughness: 0.78 }),
  apron: new THREE.MeshStandardMaterial({ color: 0xc8d2d1, roughness: 0.7 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xb96f50, roughness: 0.72 }),
  skinLight: new THREE.MeshStandardMaterial({ color: 0xca8060, roughness: 0.72 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x211a17, roughness: 0.88 }),
  trouser: new THREE.MeshStandardMaterial({ color: 0x20282c, roughness: 0.8 }),
  red: new THREE.MeshStandardMaterial({ color: 0xd8291c, roughness: 0.4 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xf0b51a, roughness: 0.42 }),
  green: new THREE.MeshStandardMaterial({ color: 0x289744, roughness: 0.55 }),
  greenDark: new THREE.MeshStandardMaterial({ color: 0x17632c, roughness: 0.65 }),
  carrot: new THREE.MeshStandardMaterial({ color: 0xf07819, roughness: 0.48 }),
  onion: new THREE.MeshStandardMaterial({ color: 0xe8d4ae, roughness: 0.55 }),
  mushroom: new THREE.MeshStandardMaterial({ color: 0xdbc5a3, roughness: 0.68 }),
  mushroomDark: new THREE.MeshStandardMaterial({ color: 0x806a55, roughness: 0.72 }),
};

function addMesh(geometry, material, parent = scene) { window.__bfTrace?.add(59);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBox(name, size, position, material, parent = scene, bevel = 0) { window.__bfTrace?.add(67);
  const geometry = bevel > 0
    ? new THREE.BoxGeometry(size[0], size[1], size[2], 2, 2, 2)
    : new THREE.BoxGeometry(size[0], size[1], size[2]);
  const mesh = addMesh(geometry, material, parent);
  mesh.name = name;
  mesh.position.set(...position);
  return mesh;
}

function cylinderBetween(a, b, radius, material, parent = scene, radialSegments = 14) { window.__bfTrace?.add(77);
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const mesh = addMesh(
    new THREE.CylinderGeometry(radius, radius * 1.03, direction.length(), radialSegments),
    material,
    parent,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function sphereAt(position, radius, material, parent = scene, width = 20, height = 12) { window.__bfTrace?.add(91);
  const mesh = addMesh(new THREE.SphereGeometry(radius, width, height), material, parent);
  mesh.position.set(...position);
  return mesh;
}

function smoothstep(a, b, value) { window.__bfTrace?.add(97);
  const x = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

function smootherstep01(x) { window.__bfTrace?.add(102);
  const c = THREE.MathUtils.clamp(x, 0, 1);
  return c * c * c * (c * (c * 6 - 15) + 10);
}

// Architectural shell and range station.
const floor = addMesh(new THREE.PlaneGeometry(36, 30), new THREE.MeshStandardMaterial({
  color: 0x2d3437,
  roughness: 0.74,
  metalness: 0.08,
}));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;

for (let x = -12; x <= 12; x += 2) {
  addBox('floor-joint-x', [0.018, 0.008, 28], [x, 0.006, 1], materials.grout).castShadow = false;
}
for (let z = -12; z <= 14; z += 2) {
  addBox('floor-joint-z', [28, 0.008, 0.018], [0, 0.006, z], materials.grout).castShadow = false;
}

addBox('back-wall', [18, 7.4, 0.22], [0, 3.7, -6.1], materials.wall);
for (let y = 1.3; y < 6.7; y += 0.72) {
  addBox('tile-grout-horizontal', [17.7, 0.025, 0.025], [0, y, -5.965], materials.grout).castShadow = false;
}
for (let row = 0; row < 8; row += 1) {
  const offset = row % 2 ? 0.9 : 0;
  for (let x = -8.1 + offset; x < 8.2; x += 1.8) {
    addBox('tile-grout-vertical', [0.025, 0.7, 0.025], [x, 1.66 + row * 0.72, -5.96], materials.grout).castShadow = false;
  }
}

addBox('back-cabinet-bank', [17.2, 1.65, 1.5], [0, 0.825, -5.15], materials.cabinet);
addBox('back-countertop', [17.6, 0.18, 1.8], [0, 1.72, -5.05], materials.counter);
for (let x = -7.4; x <= 7.4; x += 1.85) {
  addBox('cabinet-seam', [0.035, 1.45, 0.035], [x, 0.84, -4.382], materials.grout).castShadow = false;
  cylinderBetween([x + 0.58, 0.78, -4.35], [x + 0.58, 1.28, -4.35], 0.035, materials.steel);
}

const island = new THREE.Group();
island.name = 'range-island';
scene.add(island);
addBox('island-base', [7.6, 1.30, 3.25], [0, 0.65, 0], materials.cabinet, island);
addBox('island-counter', [8.0, 0.18, 3.55], [0, 1.39, 0], materials.counter, island);
addBox('range-inset', [4.25, 0.08, 2.35], [0, 1.52, -0.02], materials.darkSteel, island);
for (const x of [-2.9, -1.45, 0, 1.45, 2.9]) {
  addBox('island-door-line', [0.025, 1.05, 0.045], [x, 0.67, 1.65], materials.grout, island).castShadow = false;
}
for (const x of [-2.3, -0.75, 0.75, 2.3]) {
  cylinderBetween([x - 0.28, 0.90, 1.70], [x + 0.28, 0.90, 1.70], 0.035, materials.steel, island);
}

const burner = new THREE.Group();
burner.name = 'gas-burner';
burner.position.set(0, 1.58, 0);
scene.add(burner);
const burnerRing = addMesh(new THREE.TorusGeometry(0.88, 0.095, 12, 48), materials.darkSteel, burner);
burnerRing.rotation.x = Math.PI / 2;
for (let i = 0; i < 6; i += 1) {
  const angle = i * Math.PI / 3;
  const bar = addBox(
    'burner-grate',
    [1.18, 0.09, 0.11],
    [Math.cos(angle) * 0.58, 0.08, Math.sin(angle) * 0.58],
    materials.darkSteel,
    burner,
  );
  bar.rotation.y = -angle;
}

// Wok, rim, handle, and subtle oily interior.
const wokGroup = new THREE.Group();
wokGroup.name = 'wok';
wokGroup.position.set(0, 2.08, 0);
scene.add(wokGroup);
const wokProfile = [
  new THREE.Vector2(0.06, -0.64),
  new THREE.Vector2(0.34, -0.57),
  new THREE.Vector2(0.72, -0.39),
  new THREE.Vector2(1.08, -0.14),
  new THREE.Vector2(1.31, 0),
];
addMesh(new THREE.LatheGeometry(wokProfile, 64), materials.wok, wokGroup);
const innerWok = addMesh(new THREE.LatheGeometry(wokProfile, 64), materials.wokInner, wokGroup);
innerWok.scale.setScalar(0.965);
innerWok.position.y = 0.035;
const rim = addMesh(new THREE.TorusGeometry(1.31, 0.055, 12, 64), materials.darkSteel, wokGroup);
rim.rotation.x = Math.PI / 2;
const sootRing = addMesh(new THREE.TorusGeometry(1.17, 0.045, 10, 64), new THREE.MeshStandardMaterial({
  color: 0x080a0a,
  roughness: 0.72,
  metalness: 0.28,
}), wokGroup);
sootRing.rotation.x = Math.PI / 2;
sootRing.position.y = -0.08;
addBox('wok-oil-glint', [1.28, 0.018, 0.56], [0, -0.38, 0], new THREE.MeshStandardMaterial({
  color: 0x805415,
  emissive: 0x2e1600,
  emissiveIntensity: 0.35,
  roughness: 0.16,
  metalness: 0.55,
}), wokGroup).rotation.y = -0.15;
cylinderBetween([1.24, 0.03, 0], [2.72, 0.22, 0.08], 0.12, materials.darkSteel, wokGroup, 18);
const handleEnd = cylinderBetween([2.66, 0.21, 0.08], [3.08, 0.28, 0.1], 0.17, new THREE.MeshStandardMaterial({
  color: 0x171414,
  roughness: 0.72,
}), wokGroup, 18);
handleEnd.scale.z = 0.92;
for (const z of [-0.14, 0.14]) {
  sphereAt([1.17, 0.02, z], 0.075, materials.steel, wokGroup, 14, 8);
}

// Frozen gas flame lances.
const flames = [];
const flameOuterMaterial = new THREE.MeshStandardMaterial({
  color: 0xff4b09,
  emissive: 0xff2b00,
  emissiveIntensity: 1.9,
  transparent: true,
  opacity: 0.88,
  roughness: 0.3,
  depthWrite: false,
});
const flameInnerMaterial = new THREE.MeshStandardMaterial({
  color: 0xffcf42,
  emissive: 0xff8600,
  emissiveIntensity: 2.4,
  transparent: true,
  opacity: 0.9,
  depthWrite: false,
});
const flameBlueMaterial = new THREE.MeshStandardMaterial({
  color: 0x58c9ff,
  emissive: 0x087cff,
  emissiveIntensity: 2.8,
  transparent: true,
  opacity: 0.72,
  roughness: 0.2,
  depthWrite: false,
});
const flameOuterGeometry = new THREE.LatheGeometry([
  new THREE.Vector2(0.075, 0),
  new THREE.Vector2(0.12, 0.18),
  new THREE.Vector2(0.105, 0.53),
  new THREE.Vector2(0.055, 0.82),
  new THREE.Vector2(0.0, 1),
], 16);
const flameInnerGeometry = new THREE.LatheGeometry([
  new THREE.Vector2(0.04, 0),
  new THREE.Vector2(0.065, 0.25),
  new THREE.Vector2(0.042, 0.67),
  new THREE.Vector2(0.0, 1),
], 14);
for (let i = 0; i < 13; i += 1) {
  const angle = i / 13 * Math.PI * 2;
  const flame = new THREE.Group();
  flame.position.set(Math.cos(angle) * 0.86, 1.48, Math.sin(angle) * 0.86);
  flame.rotation.y = -angle;
  scene.add(flame);
  const height = 0.34 + 0.24 * (0.5 + 0.5 * Math.sin(i * 2.71));
  const blue = addMesh(flameOuterGeometry, flameBlueMaterial, flame);
  blue.scale.set(1.12, height * 0.45, 1.12);
  const outer = addMesh(flameOuterGeometry, flameOuterMaterial, flame);
  outer.scale.set(1, height, 1);
  outer.rotation.z = 0.12 * Math.sin(i * 1.4);
  const inner = addMesh(flameInnerGeometry, flameInnerMaterial, flame);
  inner.scale.set(1, height * 0.62, 1);
  flame.userData.baseHeight = height;
  flame.userData.index = i;
  flame.userData.blue = blue;
  flame.userData.outer = outer;
  flame.userData.inner = inner;
  flames.push(flame);
}

// Chef with a held action silhouette: one hand grips the wok, one works the spatula.
const chef = new THREE.Group();
chef.name = 'cook-frozen-in-action';
scene.add(chef);
addMesh(new THREE.CapsuleGeometry(0.72, 1.38, 8, 20), materials.chefWhite, chef).position.set(0, 2.75, -2.32);
const apron = addBox('apron', [1.18, 1.43, 0.10], [0, 2.56, -1.67], materials.apron, chef);
apron.rotation.x = -0.05;
for (let y = 2.34; y <= 3.30; y += 0.32) {
  sphereAt([0.0, y, -1.595], 0.045, materials.darkSteel, chef, 12, 8);
}
addMesh(new THREE.CylinderGeometry(0.19, 0.22, 0.28, 16), materials.skin, chef).position.set(0, 3.63, -2.26);
const head = sphereAt([0, 4.05, -2.22], 0.50, materials.skinLight, chef, 28, 18);
head.scale.set(0.88, 1.10, 0.92);
sphereAt([-0.44, 4.06, -2.20], 0.11, materials.skin, chef);
sphereAt([0.44, 4.06, -2.20], 0.11, materials.skin, chef);
sphereAt([0, 4.02, -1.76], 0.11, materials.skinLight, chef);
for (const x of [-0.18, 0.18]) {
  const eye = sphereAt([x, 4.16, -1.79], 0.045, materials.hair, chef, 12, 8);
  eye.scale.y = 0.7;
}
cylinderBetween([-0.19, 3.88, -1.80], [0.19, 3.88, -1.80], 0.025, materials.hair, chef, 12);
const hairCap = addMesh(new THREE.SphereGeometry(0.46, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), materials.hair, chef);
hairCap.position.set(0, 4.30, -2.26);
const hatBand = addMesh(new THREE.CylinderGeometry(0.48, 0.45, 0.26, 24), materials.chefWhite, chef);
hatBand.position.set(0, 4.53, -2.24);
const hatTop = addMesh(new THREE.CylinderGeometry(0.54, 0.46, 0.53, 24), materials.chefWhite, chef);
hatTop.position.set(0, 4.88, -2.24);
for (let i = 0; i < 5; i += 1) {
  sphereAt([
    (i - 2) * 0.19,
    5.14 + (i % 2) * 0.06,
    -2.24 + (i === 2 ? 0.06 : 0),
  ], 0.25, materials.chefWhite, chef, 16, 10);
}

function addArm(shoulder, elbow, hand) { window.__bfTrace?.add(312);
  cylinderBetween(shoulder, elbow, 0.22, materials.chefWhite, chef, 18);
  sphereAt(elbow, 0.225, materials.chefWhite, chef);
  cylinderBetween(elbow, hand, 0.15, materials.skin, chef, 18);
  sphereAt(hand, 0.18, materials.skinLight, chef);
}

addArm([0.72, 3.42, -2.15], [1.48, 3.02, -1.25], [2.18, 2.34, -0.05]);
addArm([-0.72, 3.43, -2.14], [-1.38, 3.62, -1.30], [-1.23, 3.31, -0.46]);
cylinderBetween([-1.21, 3.32, -0.42], [-0.26, 2.40, -0.02], 0.035, materials.steel, chef, 12);
const spatulaBlade = addBox('spatula-blade', [0.52, 0.055, 0.38], [-0.18, 2.34, 0.01], materials.steel, chef);
spatulaBlade.rotation.z = -0.15;
spatulaBlade.rotation.y = 0.26;

// Trouser legs and shoes are mostly occluded by the island from the opening view.
cylinderBetween([-0.36, 1.83, -2.36], [-0.39, 0.22, -2.33], 0.28, materials.trouser, chef, 18);
cylinderBetween([0.36, 1.83, -2.36], [0.39, 0.22, -2.33], 0.28, materials.trouser, chef, 18);
const shoeMaterial = new THREE.MeshStandardMaterial({ color: 0x101315, roughness: 0.58 });
for (const x of [-0.39, 0.39]) {
  const shoe = addMesh(new THREE.CapsuleGeometry(0.24, 0.34, 6, 14), shoeMaterial, chef);
  shoe.position.set(x, 0.19, -2.16);
  shoe.rotation.x = Math.PI / 2;
}

// Background culinary props establish depth without relying on external assets.
const shelf = addBox('wall-shelf', [5.4, 0.12, 0.62], [-4.9, 4.05, -5.55], materials.darkSteel);
for (let i = 0; i < 4; i += 1) {
  const pot = addMesh(new THREE.CylinderGeometry(0.32 + i * 0.025, 0.29, 0.56, 20), materials.steel);
  pot.position.set(-6.65 + i * 1.05, 4.38, -5.43);
  const potRim = addMesh(new THREE.TorusGeometry(0.32 + i * 0.025, 0.025, 8, 24), materials.darkSteel);
  potRim.position.set(-6.65 + i * 1.05, 4.66, -5.43);
  potRim.rotation.x = Math.PI / 2;
}
addBox('hood', [4.4, 0.48, 1.30], [3.8, 5.38, -5.38], materials.steel);
const hoodStem = addBox('hood-chimney', [2.1, 1.55, 0.9], [3.8, 6.16, -5.58], materials.steel);
hoodStem.castShadow = true;
for (let i = 0; i < 5; i += 1) {
  cylinderBetween(
    [-0.8 + i * 0.38, 4.95, -5.78],
    [-0.8 + i * 0.38, 4.1 - (i % 2) * 0.18, -5.74],
    0.025,
    materials.steel,
  );
  sphereAt([-0.8 + i * 0.38, 4.96, -5.78], 0.06, materials.darkSteel);
}

// Procedural ingredient models. Each root stores a deterministic apex transform.
const ingredients = [];
function registerIngredient(root, position, rotation, spin, name) { window.__bfTrace?.add(360);
  root.name = name;
  root.userData.apexPosition = new THREE.Vector3(...position);
  root.userData.apexRotation = new THREE.Euler(...rotation);
  root.userData.spin = new THREE.Vector3(...spin);
  root.position.copy(root.userData.apexPosition);
  root.rotation.copy(root.userData.apexRotation);
  const scale = name === 'broccoli-floret' ? 0.72 : (name === 'mushroom' ? 0.82 : 0.86);
  root.scale.setScalar(scale);
  scene.add(root);
  ingredients.push(root);
  return root;
}

function pepperChunk(colorMaterial, position, rotation, scale, index) { window.__bfTrace?.add(374);
  const root = new THREE.Group();
  const chunk = addMesh(new THREE.DodecahedronGeometry(0.30, 1), colorMaterial, root);
  chunk.scale.set(scale[0], scale[1], scale[2]);
  const pale = addMesh(new THREE.SphereGeometry(0.055, 10, 7), materials.onion, root);
  pale.position.set(0.06, 0.08, 0.23);
  return registerIngredient(root, position, rotation, [1.9 + index * 0.08, -1.2, 1.4], 'bell-pepper-chunk');
}

function carrotSlice(position, rotation, index) { window.__bfTrace?.add(383);
  const root = new THREE.Group();
  const slice = addMesh(new THREE.CylinderGeometry(0.25, 0.25, 0.10, 20), materials.carrot, root);
  slice.rotation.z = Math.PI / 2;
  const core = addMesh(new THREE.CylinderGeometry(0.09, 0.09, 0.104, 12), materials.yellow, root);
  core.rotation.z = Math.PI / 2;
  return registerIngredient(root, position, rotation, [-1.4, 2.2 + index * 0.1, 1.1], 'carrot-slice');
}

function broccoli(position, rotation, index) { window.__bfTrace?.add(392);
  const root = new THREE.Group();
  const stem = addMesh(new THREE.CylinderGeometry(0.10, 0.15, 0.48, 12), materials.green, root);
  stem.position.y = -0.18;
  for (let i = 0; i < 6; i += 1) {
    const angle = i / 6 * Math.PI * 2;
    sphereAt([Math.cos(angle) * 0.18, 0.13 + (i % 2) * 0.08, Math.sin(angle) * 0.18], 0.21, materials.greenDark, root, 14, 9);
  }
  sphereAt([0, 0.22, 0], 0.23, materials.greenDark, root, 14, 9);
  return registerIngredient(root, position, rotation, [1.5, -1.8, 1.2 + index * 0.1], 'broccoli-floret');
}

function mushroom(position, rotation, index) { window.__bfTrace?.add(404);
  const root = new THREE.Group();
  const stem = addMesh(new THREE.CylinderGeometry(0.10, 0.14, 0.34, 14), materials.mushroom, root);
  stem.position.y = -0.13;
  const cap = addMesh(new THREE.SphereGeometry(0.30, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.52), materials.mushroomDark, root);
  cap.position.y = 0.05;
  return registerIngredient(root, position, rotation, [-1.2, 1.4, 1.8 + index * 0.12], 'mushroom');
}

function onionRing(position, rotation, index) { window.__bfTrace?.add(413);
  const root = new THREE.Group();
  const ring = addMesh(new THREE.TorusGeometry(0.28, 0.055, 10, 28), materials.onion, root);
  ring.scale.y = 0.72;
  const inner = addMesh(new THREE.TorusGeometry(0.17, 0.036, 8, 24), materials.onion, root);
  inner.scale.y = 0.72;
  return registerIngredient(root, position, rotation, [1.3, 1.8 + index * 0.1, -1.4], 'onion-rings');
}

const foodLayout = [
  [-1.48, 3.82, -0.48], [-0.82, 4.72, 0.04], [0.08, 5.17, -0.56], [0.85, 4.68, 0.38],
  [1.54, 3.92, -0.28], [-1.72, 4.28, 0.70], [-0.42, 4.18, 1.02], [0.52, 4.30, 1.22],
  [1.72, 4.36, 0.78], [-1.12, 5.12, 0.24], [1.25, 5.06, 0.18], [-0.10, 4.65, 1.48],
  [-0.32, 3.56, 0.82], [0.55, 3.67, -0.72], [-1.88, 3.56, 0.40], [1.95, 3.58, 0.30],
  [-0.64, 5.58, -0.05], [0.62, 5.48, 0.58],
];
pepperChunk(materials.red, foodLayout[0], [0.2, 0.4, 0.8], [1.1, 0.72, 1.25], 0);
pepperChunk(materials.yellow, foodLayout[2], [1.0, 0.1, 0.3], [1.0, 0.72, 1.16], 1);
pepperChunk(materials.green, foodLayout[4], [0.2, 1.2, 0.4], [1.1, 0.78, 1.18], 2);
pepperChunk(materials.red, foodLayout[7], [0.6, 1.0, 0.2], [1.2, 0.68, 1.0], 3);
pepperChunk(materials.yellow, foodLayout[10], [1.2, 0.6, 0.4], [0.9, 0.8, 1.25], 4);
pepperChunk(materials.green, foodLayout[13], [0.3, 0.8, 1.1], [1.1, 0.8, 1.0], 5);
carrotSlice(foodLayout[1], [0.7, 0.2, 1.2], 0);
carrotSlice(foodLayout[6], [1.4, 0.4, 0.1], 1);
carrotSlice(foodLayout[12], [0.2, 1.0, 0.5], 2);
carrotSlice(foodLayout[16], [1.1, 0.7, 0.3], 3);
broccoli(foodLayout[3], [0.4, 0.7, 0.1], 0);
broccoli(foodLayout[9], [0.9, 0.2, 0.8], 1);
broccoli(foodLayout[15], [0.3, 1.2, 0.6], 2);
mushroom(foodLayout[5], [0.5, 0.3, 1.2], 0);
mushroom(foodLayout[11], [1.1, 0.4, 0.2], 1);
mushroom(foodLayout[17], [0.3, 0.8, 1.0], 2);
onionRing(foodLayout[8], [0.8, 0.4, 0.2], 0);
onionRing(foodLayout[14], [0.2, 1.0, 0.8], 1);

// Oil droplets form an unmistakable suspended spray around the food.
const droplets = [];
const oilMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xeaa12c,
  roughness: 0.08,
  metalness: 0.0,
  transmission: 0.2,
  thickness: 0.12,
  ior: 1.46,
  clearcoat: 0.7,
  clearcoatRoughness: 0.12,
  transparent: true,
  opacity: 0.74,
});
for (let i = 0; i < 31; i += 1) {
  const angle = i * 2.399963;
  const radius = 0.5 + (i % 7) * 0.24;
  const apex = new THREE.Vector3(
    Math.cos(angle) * radius,
    3.12 + (i % 9) * 0.27 + 0.18 * Math.sin(i * 1.7),
    0.24 + Math.sin(angle) * radius * 0.52,
  );
  const drop = addMesh(new THREE.SphereGeometry(0.035 + (i % 4) * 0.014, 12, 8), oilMaterial);
  drop.scale.y = 1.45 + (i % 3) * 0.25;
  drop.rotation.z = -Math.cos(angle) * 0.48;
  drop.rotation.x = Math.sin(angle) * 0.38;
  drop.userData.apexPosition = apex;
  drop.position.copy(apex);
  droplets.push(drop);
}

// Steam ribbons are geometry, not sprites, and remain fixed throughout the reframing interval.
const steamMaterials = [];
const steamWisps = [];
for (let i = 0; i < 7; i += 1) {
  const startX = -0.75 + i * 0.25;
  const points = [];
  for (let j = 0; j < 7; j += 1) {
    points.push(new THREE.Vector3(
      startX + 0.18 * Math.sin(j * 1.25 + i),
      2.40 + j * 0.48,
      -0.1 + 0.24 * Math.cos(j * 1.11 + i * 0.7),
    ));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const material = new THREE.MeshStandardMaterial({
    color: 0xe7f4f2,
    emissive: 0x9ebfc4,
    emissiveIntensity: 0.28,
    transparent: true,
    opacity: 0.13 + (i % 3) * 0.02,
    roughness: 0.2,
    depthWrite: false,
  });
  const steam = addMesh(new THREE.TubeGeometry(curve, 48, 0.045 + (i % 2) * 0.015, 8, false), material);
  steam.castShadow = false;
  steam.renderOrder = 2;
  steam.userData.index = i;
  steamMaterials.push(material);
  steamWisps.push(steam);
}

const steamPuffs = [];
const steamPuffMaterials = [];
for (let i = 0; i < 12; i += 1) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xeaf5f3,
    emissive: 0x91b6bc,
    emissiveIntensity: 0.18,
    transparent: true,
    opacity: 0.045 + (i % 3) * 0.012,
    roughness: 0.45,
    depthWrite: false,
  });
  const puff = addMesh(new THREE.IcosahedronGeometry(0.34 + (i % 4) * 0.045, 2), material);
  const base = new THREE.Vector3(
    -0.58 + (i % 4) * 0.38 + 0.08 * Math.sin(i * 1.7),
    2.72 + Math.floor(i / 2) * 0.43,
    -0.1 + 0.28 * Math.cos(i * 1.31),
  );
  puff.position.copy(base);
  puff.scale.set(0.72 + (i % 2) * 0.22, 1.15 + (i % 3) * 0.2, 0.62);
  puff.castShadow = false;
  puff.renderOrder = 1;
  puff.userData.basePosition = base;
  steamPuffs.push(puff);
  steamPuffMaterials.push(material);
}

// Studio-kitchen lighting with warm practical glow below and cool fill above.
scene.add(new THREE.HemisphereLight(0xd5eaff, 0x2b2018, 1.4));
const keyLight = new THREE.DirectionalLight(0xfff2da, 3.8);
keyLight.position.set(5.5, 10, 7);
keyLight.target.position.set(0, 2.4, 0);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -9;
keyLight.shadow.camera.right = 9;
keyLight.shadow.camera.top = 9;
keyLight.shadow.camera.bottom = -4;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 28;
keyLight.shadow.bias = -0.0003;
scene.add(keyLight, keyLight.target);
const coolFill = new THREE.DirectionalLight(0x9fcfff, 1.5);
coolFill.position.set(-7, 6, 4);
scene.add(coolFill);
const fireLight = new THREE.PointLight(0xff5a13, 9.0, 6.5, 2);
fireLight.position.set(0, 2.1, 0.1);
scene.add(fireLight);
const rimLight = new THREE.SpotLight(0xffd6a3, 3.5, 18, Math.PI / 4, 0.65, 1.4);
rimLight.position.set(-4.5, 7.5, -2);
rimLight.target.position.set(0, 3.0, 0);
scene.add(rimLight, rimLight.target);

function getMotionProgress(time) { window.__bfTrace?.add(563);
  if (time < FREEZE_START) {
    return { phase: 'rise', progress: smootherstep01(time / FREEZE_START) };
  }
  if (time <= FREEZE_END) {
    return { phase: 'hold', progress: 1 };
  }
  return { phase: 'fall', progress: smootherstep01((time - FREEZE_END) / (DURATION - FREEZE_END)) };
}

function updateIngredients(time) { window.__bfTrace?.add(573);
  const motion = getMotionProgress(time);
  for (let i = 0; i < ingredients.length; i += 1) {
    const item = ingredients[i];
    const apex = item.userData.apexPosition;
    const apexRotation = item.userData.apexRotation;
    const spin = item.userData.spin;
    if (motion.phase === 'rise') {
      const p = motion.progress;
      item.position.set(
        apex.x * (0.28 + p * 0.72),
        2.28 + (apex.y - 2.28) * p,
        0.02 + (apex.z - 0.02) * (0.25 + p * 0.75),
      );
      item.rotation.set(
        apexRotation.x - spin.x * (1 - p),
        apexRotation.y - spin.y * (1 - p),
        apexRotation.z - spin.z * (1 - p),
      );
    } else if (motion.phase === 'fall') {
      const p = motion.progress;
      item.position.set(
        apex.x * (1 - 0.38 * p),
        apex.y + (2.14 - apex.y) * p - 0.30 * p * p,
        apex.z + (0.06 - apex.z) * p,
      );
      item.rotation.set(
        apexRotation.x + spin.x * p,
        apexRotation.y + spin.y * p,
        apexRotation.z + spin.z * p,
      );
    } else {
      item.position.copy(apex);
      item.rotation.copy(apexRotation);
    }
  }
  for (let i = 0; i < droplets.length; i += 1) {
    const drop = droplets[i];
    const apex = drop.userData.apexPosition;
    if (motion.phase === 'rise') {
      const p = motion.progress;
      drop.position.set(apex.x * p, 2.25 + (apex.y - 2.25) * p, apex.z * p);
    } else if (motion.phase === 'fall') {
      const p = motion.progress;
      drop.position.set(apex.x * (1 - 0.4 * p), apex.y + (1.92 - apex.y) * p, apex.z * (1 - 0.5 * p));
    } else {
      drop.position.copy(apex);
    }
  }
}

function updateCookAction(time) { window.__bfTrace?.add(624);
  const motion = getMotionProgress(time);
  let tossImpulse = 0;
  if (motion.phase === 'rise') {
    tossImpulse = Math.sin(motion.progress * Math.PI);
  } else if (motion.phase === 'fall') {
    tossImpulse = -0.55 * Math.sin(motion.progress * Math.PI);
  }
  wokGroup.position.y = 2.08 + 0.11 * Math.abs(tossImpulse);
  wokGroup.rotation.set(0.035 * tossImpulse, 0, -0.085 * tossImpulse);
  spatulaBlade.rotation.set(
    0.08 * tossImpulse,
    0.26,
    -0.15 - 0.08 * tossImpulse,
  );
}

function updateFrozenEffects(time) { window.__bfTrace?.add(641);
  const frozenTime = time < FREEZE_START ? time : (time <= FREEZE_END ? FREEZE_START : FREEZE_START + time - FREEZE_END);
  for (const flame of flames) {
    const i = flame.userData.index;
    const pulse = 1 + 0.14 * Math.sin(frozenTime * 16 + i * 1.87);
    const height = flame.userData.baseHeight;
    flame.userData.blue.scale.set(1.12 / Math.sqrt(pulse), height * 0.45 * pulse, 1.12 / Math.sqrt(pulse));
    flame.userData.outer.scale.set(1 / Math.sqrt(pulse), height * pulse, 1 / Math.sqrt(pulse));
    flame.userData.inner.scale.set(1, height * 0.62 * (0.94 + 0.10 * Math.sin(frozenTime * 18 + i)), 1);
    flame.rotation.z = 0.07 * Math.sin(frozenTime * 11 + i * 0.82);
  }
  const steamShift = 0.06 * Math.sin(frozenTime * 2.8);
  for (let i = 0; i < steamWisps.length; i += 1) {
    steamWisps[i].position.y = steamShift;
    steamWisps[i].rotation.y = 0.03 * Math.sin(frozenTime * 2.1 + i);
    steamMaterials[i].opacity = 0.13 + (i % 3) * 0.02 + 0.01 * Math.sin(frozenTime * 3.2 + i);
  }
  for (let i = 0; i < steamPuffs.length; i += 1) {
    const puff = steamPuffs[i];
    const base = puff.userData.basePosition;
    puff.position.set(
      base.x + 0.045 * Math.sin(frozenTime * 1.8 + i),
      base.y + 0.07 * Math.sin(frozenTime * 1.35 + i * 0.8),
      base.z + 0.035 * Math.cos(frozenTime * 1.55 + i),
    );
    puff.rotation.set(
      0.12 * Math.sin(frozenTime + i),
      frozenTime * 0.08 + i * 0.31,
      0.09 * Math.cos(frozenTime * 1.2 + i),
    );
    steamPuffMaterials[i].opacity = 0.045 + (i % 3) * 0.012
      + 0.007 * Math.sin(frozenTime * 1.9 + i);
  }
  fireLight.intensity = 8.6 + 0.7 * Math.sin(frozenTime * 15.0);
}

const sidePosition = new THREE.Vector3(7.55, 5.05, 7.65);
const overheadPosition = new THREE.Vector3(0.05, 10.65, 0.25);
const closePosition = new THREE.Vector3(0.05, 3.78, 7.15);
const ascentCurve = new THREE.CatmullRomCurve3([
  sidePosition,
  new THREE.Vector3(6.8, 5.9, 6.8),
  new THREE.Vector3(4.4, 7.7, 4.4),
  new THREE.Vector3(1.7, 9.75, 1.7),
  overheadPosition,
], false, 'centripetal');
const diveCurve = new THREE.CatmullRomCurve3([
  overheadPosition,
  new THREE.Vector3(0.45, 8.6, 0.72),
  new THREE.Vector3(-0.72, 6.3, 1.60),
  new THREE.Vector3(0.66, 4.95, 2.95),
  new THREE.Vector3(-0.18, 4.05, 5.15),
  closePosition,
], false, 'centripetal');

function updateCamera(time) { window.__bfTrace?.add(696);
  const focal = new THREE.Vector3();
  const up = new THREE.Vector3();
  if (time <= FREEZE_START) {
    const drift = smoothstep(0, FREEZE_START, time);
    camera.position.copy(sidePosition).add(new THREE.Vector3(-0.18 * drift, 0.08 * drift, -0.12 * drift));
    focal.set(0, 2.86, -0.15);
    up.set(0, 1, 0);
    camera.fov = 43;
  } else if (time <= 2.20) {
    const p = smootherstep01((time - FREEZE_START) / (2.20 - FREEZE_START));
    camera.position.copy(ascentCurve.getPoint(p));
    focal.set(0, THREE.MathUtils.lerp(2.90, 2.35, p), THREE.MathUtils.lerp(-0.1, 0.15, p));
    up.set(0, 1 - p, -p).normalize();
    camera.fov = THREE.MathUtils.lerp(43, 46, p);
  } else if (time <= 4.50) {
    const p = smootherstep01((time - 2.20) / (4.50 - 2.20));
    camera.position.copy(diveCurve.getPoint(p));
    focal.set(
      0,
      THREE.MathUtils.lerp(2.35, 3.10, p),
      THREE.MathUtils.lerp(0.15, -0.20, p),
    );
    const topBlend = smoothstep(0, 0.62, p);
    up.set(0, topBlend, -(1 - topBlend)).normalize();
    camera.fov = THREE.MathUtils.lerp(46, 42, p);
  } else {
    camera.position.copy(closePosition);
    focal.set(0, 3.10, -0.20);
    up.set(0, 1, 0);
    camera.fov = 42;
  }
  camera.up.copy(up);
  camera.lookAt(focal);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

function updateScene(time) { window.__bfTrace?.add(734);
  const clamped = THREE.MathUtils.clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  updateIngredients(clamped);
  updateCookAction(clamped);
  updateFrozenEffects(clamped);
  updateCamera(clamped);
  renderer.render(scene, camera);
  return clamped;
}

let currentTime = 0;
let paused = true;
window.reconstruction = {
  pause() {
    paused = true;
    return currentTime;
  },
  seek(seconds) {
    paused = true;
    currentTime = updateScene(Number(seconds));
    return currentTime;
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
  getSceneState() {
    return {
      time: currentTime,
      paused,
      ingredientPositions: ingredients.map((item) => item.position.toArray()),
      dropletPositions: droplets.map((item) => item.position.toArray()),
      flameScales: flames.map((item) => item.userData.outer.scale.toArray()),
      steamTransforms: [
        ...steamWisps.map((item, index) => [
          item.position.y,
          item.rotation.y,
          steamMaterials[index].opacity,
        ]),
        ...steamPuffs.map((item, index) => [
          ...item.position.toArray(),
          ...item.quaternion.toArray(),
          steamPuffMaterials[index].opacity,
        ]),
      ],
      wokTransform: [
        ...wokGroup.position.toArray(),
        ...wokGroup.quaternion.toArray(),
        ...spatulaBlade.quaternion.toArray(),
      ],
    };
  },
};

updateScene(0);
window.reconstructionReady = true;
