import * as THREE from '../vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9cbc0);
scene.fog = new THREE.FogExp2(0xb9cbc0, 0.018);

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(52, WIDTH / HEIGHT, 0.05, 100);
camera.up.set(0, 1, 0);

const colors = {
  timber: 0x38281d,
  timberDark: 0x1d1712,
  tatami: 0xb4ab78,
  tatamiEdge: 0x53604b,
  plaster: 0xd8d1b8,
  paper: 0xf0ead7,
  stone: 0x77786e,
  stoneDark: 0x4a4e48,
  moss: 0x587044,
  mossLight: 0x79905a,
  water: 0x315b5b,
  koiOrange: 0xe8642f
};

const mats = {
  timber: new THREE.MeshStandardMaterial({ color: colors.timber, roughness: 0.82 }),
  timberDark: new THREE.MeshStandardMaterial({ color: colors.timberDark, roughness: 0.9 }),
  tatami: new THREE.MeshStandardMaterial({ color: colors.tatami, roughness: 0.95 }),
  tatamiEdge: new THREE.MeshStandardMaterial({ color: colors.tatamiEdge, roughness: 0.9 }),
  plaster: new THREE.MeshStandardMaterial({ color: colors.plaster, roughness: 0.95 }),
  paper: new THREE.MeshStandardMaterial({
    color: colors.paper,
    roughness: 0.75,
    transparent: true,
    opacity: 0.88,
    side: THREE.DoubleSide
  }),
  stone: new THREE.MeshStandardMaterial({ color: colors.stone, roughness: 1 }),
  stoneDark: new THREE.MeshStandardMaterial({ color: colors.stoneDark, roughness: 1 }),
  moss: new THREE.MeshStandardMaterial({ color: colors.moss, roughness: 1 }),
  mossLight: new THREE.MeshStandardMaterial({ color: colors.mossLight, roughness: 1 }),
  roof: new THREE.MeshStandardMaterial({ color: 0x202b28, roughness: 0.82, metalness: 0.05 }),
  bridge: new THREE.MeshStandardMaterial({ color: 0x78362b, roughness: 0.84 }),
  water: new THREE.MeshPhysicalMaterial({
    color: 0x214b4d,
    roughness: 0.22,
    metalness: 0.05,
    transparent: true,
    opacity: 0.91,
    transmission: 0.02,
    clearcoat: 0.88,
    clearcoatRoughness: 0.24,
    side: THREE.DoubleSide
  })
};

const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    topColor: { value: new THREE.Color(0x7fa5ad) },
    horizonColor: { value: new THREE.Color(0xd9d6bd) }
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    uniform vec3 topColor;
    uniform vec3 horizonColor;
    varying vec3 vWorldPosition;
    void main() {
      float h = smoothstep(-0.12, 0.58, normalize(vWorldPosition).y);
      gl_FragColor = vec4(mix(horizonColor, topColor, h), 1.0);
    }
  `
});
mesh(new THREE.SphereGeometry(45, 32, 18), skyMaterial, scene, false, false);

function mesh(geometry, material, parent = scene, cast = true, receive = true) { window.__bfTrace?.add(98);
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = cast;
  object.receiveShadow = receive;
  parent.add(object);
  return object;
}

function box(parent, size, position, material, cast = true, receive = true) { window.__bfTrace?.add(106);
  const object = mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material, parent, cast, receive);
  object.position.set(position[0], position[1], position[2]);
  return object;
}

function cylinder(parent, radiusTop, radiusBottom, height, segments, position, material) { window.__bfTrace?.add(112);
  const object = mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
    parent
  );
  object.position.set(position[0], position[1], position[2]);
  return object;
}

function smoothstep(a, b, value) { window.__bfTrace?.add(122);
  const x = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

function seeded(index, salt = 0) { window.__bfTrace?.add(127);
  const value = Math.sin(index * 91.327 + salt * 47.119) * 43758.5453;
  return value - Math.floor(value);
}

const architecture = new THREE.Group();
scene.add(architecture);

// Garden ground and raised room establish the indoor/outdoor height change.
box(scene, [22, 0.24, 22], [0, -0.18, -1.5], mats.moss, false, true);
box(architecture, [10.6, 0.42, 6.8], [0, 0.25, 6.35], mats.timberDark, false, true);
box(architecture, [10.25, 0.12, 6.55], [0, 0.5, 6.4], mats.plaster, false, true);

function makeTatami(x, z, rotate = false) { window.__bfTrace?.add(140);
  const group = new THREE.Group();
  group.position.set(x, 0.58, z);
  group.rotation.y = rotate ? Math.PI / 2 : 0;
  architecture.add(group);
  box(group, [1.82, 0.055, 0.88], [0, 0, 0], mats.tatami, false, true);
  box(group, [1.86, 0.06, 0.055], [0, 0.012, -0.445], mats.tatamiEdge, false, true);
  box(group, [1.86, 0.06, 0.055], [0, 0.012, 0.445], mats.tatamiEdge, false, true);
}

for (let row = 0; row < 5; row += 1) {
  for (let column = 0; column < 5; column += 1) {
    makeTatami(-3.72 + column * 1.86, 3.75 + row * 0.91, (row + column) % 2 === 1);
  }
}

// Timber frame around the sliding-door opening.
for (const x of [-5.1, -1.82, 1.82, 5.1]) {
  box(architecture, [0.2, 3.7, 0.22], [x, 2.12, 2.78], mats.timber);
}
box(architecture, [10.4, 0.22, 0.25], [0, 3.93, 2.78], mats.timber);
box(architecture, [10.4, 0.18, 0.25], [0, 0.6, 2.78], mats.timber);
box(architecture, [10.4, 0.28, 0.75], [0, 4.12, 2.48], mats.timberDark);
box(architecture, [11.4, 0.22, 1.7], [0, 4.32, 2.12], mats.timberDark);

const roofFront = box(architecture, [11.5, 0.18, 4.7], [0, 4.72, 4.02], mats.roof);
roofFront.rotation.x = -0.235;
const roofBack = box(architecture, [11.5, 0.18, 4.7], [0, 4.72, 8.18], mats.roof);
roofBack.rotation.x = 0.235;
box(architecture, [11.6, 0.3, 0.32], [0, 5.27, 6.1], mats.roof);
for (let i = 0; i < 17; i += 1) {
  const x = -5.3 + i * 0.66;
  const frontTile = box(architecture, [0.055, 0.055, 4.72], [x, 4.83, 4.02], mats.timberDark);
  frontTile.rotation.x = -0.235;
  const backTile = box(architecture, [0.055, 0.055, 4.72], [x, 4.83, 8.18], mats.timberDark);
  backTile.rotation.x = 0.235;
}
for (const x of [-5.18, 5.18]) {
  box(architecture, [0.22, 3.55, 6.65], [x, 2.3, 6.22], mats.timberDark);
}

function makeShojiPanel(width, height) { window.__bfTrace?.add(181);
  const panel = new THREE.Group();
  box(panel, [width, height, 0.055], [0, 0, 0], mats.paper, false, false);
  box(panel, [0.085, height + 0.1, 0.09], [-width / 2, 0, 0], mats.timber);
  box(panel, [0.085, height + 0.1, 0.09], [width / 2, 0, 0], mats.timber);
  box(panel, [width + 0.08, 0.085, 0.09], [0, -height / 2, 0], mats.timber);
  box(panel, [width + 0.08, 0.085, 0.09], [0, height / 2, 0], mats.timber);
  for (let i = 1; i < 4; i += 1) {
    box(panel, [0.038, height, 0.075], [-width / 2 + i * width / 4, 0, 0], mats.timber, false, false);
  }
  for (let i = 1; i < 7; i += 1) {
    box(panel, [width, 0.036, 0.075], [0, -height / 2 + i * height / 7, 0], mats.timber, false, false);
  }
  return panel;
}

const fixedPanels = [];
for (const x of [-4.25, 4.25]) {
  const panel = makeShojiPanel(1.55, 3.08);
  panel.position.set(x, 2.25, 2.74);
  architecture.add(panel);
  fixedPanels.push(panel);
}

const slidingLeft = makeShojiPanel(1.65, 3.08);
const slidingRight = makeShojiPanel(1.65, 3.08);
slidingLeft.position.set(-1.14, 2.25, 2.68);
slidingRight.position.set(1.14, 2.25, 2.65);
architecture.add(slidingLeft, slidingRight);

// Deep rear wall, tokonoma alcove, hanging scroll, and low furniture stay visible in the final reverse shot.
box(architecture, [10.3, 3.5, 0.22], [0, 2.24, 9.62], mats.plaster);
for (const x of [-5.0, -2.6, 2.6, 5.0]) {
  box(architecture, [0.18, 3.55, 0.28], [x, 2.28, 9.45], mats.timber);
}
box(architecture, [2.55, 3.0, 0.16], [0, 2.08, 9.45], mats.timberDark);
box(architecture, [1.8, 2.25, 0.08], [0, 2.12, 9.34], mats.paper, false, false);
box(architecture, [0.09, 1.18, 0.06], [-0.18, 2.18, 9.26], mats.timberDark, false, false).rotation.z = -0.12;
box(architecture, [0.08, 0.65, 0.06], [0.16, 2.0, 9.25], mats.timberDark, false, false).rotation.z = 0.24;
box(architecture, [3.25, 0.18, 0.55], [0, 0.78, 9.08], mats.timber);

const table = new THREE.Group();
table.position.set(-1.95, 0.62, 6.65);
architecture.add(table);
box(table, [2.15, 0.16, 1.15], [0, 0.42, 0], mats.timber);
for (const x of [-0.85, 0.85]) {
  for (const z of [-0.36, 0.36]) box(table, [0.12, 0.42, 0.12], [x, 0.18, z], mats.timberDark);
}
const ceramic = new THREE.MeshStandardMaterial({ color: 0x243f38, roughness: 0.55 });
cylinder(table, 0.16, 0.19, 0.2, 16, [0.15, 0.61, 0], ceramic);
for (const x of [-0.45, 0.65]) cylinder(table, 0.09, 0.08, 0.11, 16, [x, 0.55, 0.12], ceramic);
for (const x of [-1.45, 1.55]) {
  const cushion = box(architecture, [0.72, 0.1, 0.72], [x, 0.66, 6.7], mats.tatamiEdge);
  cushion.rotation.y = x > 0 ? -0.1 : 0.12;
}

// Warm pools inside contrast with cool daylight outside.
const interiorLight = new THREE.PointLight(0xffc98b, 34, 10, 2);
interiorLight.position.set(0, 3.15, 6.9);
architecture.add(interiorLight);
const lanternGlow = new THREE.PointLight(0xffb76b, 9, 3, 2);
lanternGlow.position.set(-0.12, 1.75, -0.52);
scene.add(lanternGlow);

const pendant = new THREE.Group();
pendant.position.set(0.65, 3.05, 6.85);
architecture.add(pendant);
box(pendant, [0.035, 0.72, 0.035], [0, 0.35, 0], mats.timberDark, false, false);
const pendantPaper = new THREE.MeshStandardMaterial({
  color: 0xffe2ad,
  emissive: 0xff9c45,
  emissiveIntensity: 0.95,
  roughness: 0.78
});
cylinder(pendant, 0.26, 0.31, 0.62, 20, [0, -0.17, 0], pendantPaper);
box(pendant, [0.58, 0.055, 0.58], [0, 0.16, 0], mats.timberDark);
box(pendant, [0.65, 0.055, 0.65], [0, -0.5, 0], mats.timberDark);

// Engawa veranda and stepping stones connect the room to the pond.
box(scene, [10.4, 0.28, 1.35], [0, 0.38, 2.05], mats.timber, false, true);
for (let i = 0; i < 10; i += 1) {
  box(scene, [0.06, 0.015, 1.25], [-4.65 + i * 1.03, 0.535, 2.05], mats.timberDark, false, false);
}

const steppingPath = [
  [0.05, 1.0], [-0.2, 0.25], [-0.75, -0.55], [-1.42, -1.18],
  [-2.25, -1.75], [-3.0, -2.55], [-3.5, -3.45], [-3.65, -4.45]
];
for (let i = 0; i < steppingPath.length; i += 1) {
  const stone = cylinder(
    scene,
    0.42 + seeded(i, 2) * 0.12,
    0.46 + seeded(i, 3) * 0.1,
    0.12,
    10,
    [steppingPath[i][0], 0.0, steppingPath[i][1]],
    mats.stone
  );
  stone.scale.z = 0.68 + seeded(i, 4) * 0.3;
  stone.rotation.y = seeded(i, 5) * Math.PI;
}

// Pond water, stone rim, and koi form the orbit's central subject.
const pond = new THREE.Group();
pond.position.set(0.2, 0, -4.1);
scene.add(pond);
const pondBed = cylinder(pond, 2.92, 3.12, 0.22, 48, [0, -0.12, 0], mats.stoneDark);
pondBed.scale.z = 0.67;
const water = mesh(new THREE.CircleGeometry(2.88, 64), mats.water, pond, false, true);
water.rotation.x = -Math.PI / 2;
water.position.y = 0.035;
water.scale.y = 0.66;

for (let i = 0; i < 28; i += 1) {
  const angle = i / 28 * Math.PI * 2;
  const radius = 3.05;
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.33 + seeded(i, 10) * 0.16, 0),
    i % 5 === 0 ? mats.mossLight : mats.stone
  );
  rock.position.set(
    Math.cos(angle) * radius,
    0.02 + seeded(i, 11) * 0.08,
    Math.sin(angle) * radius * 0.67
  );
  rock.scale.set(1.15, 0.65 + seeded(i, 12) * 0.45, 0.9);
  rock.rotation.set(seeded(i, 13), angle, seeded(i, 14));
  rock.castShadow = true;
  rock.receiveShadow = true;
  pond.add(rock);
}

const gardenBridge = new THREE.Group();
gardenBridge.position.set(0.3, 0, -4.8);
scene.add(gardenBridge);
for (let i = 0; i < 9; i += 1) {
  const x = -1.4 + i * 0.35;
  const arch = 0.18 + (1 - Math.pow(x / 1.55, 2)) * 0.28;
  const plank = box(gardenBridge, [0.32, 0.12, 0.82], [x, arch, 0], mats.bridge);
  plank.rotation.z = -x * 0.09;
  for (const z of [-0.43, 0.43]) {
    box(gardenBridge, [0.07, 0.72, 0.07], [x, arch + 0.35, z], mats.bridge);
  }
}
for (const z of [-0.43, 0.43]) {
  for (let i = 0; i < 8; i += 1) {
    const x = -1.225 + i * 0.35;
    const rail = box(gardenBridge, [0.38, 0.075, 0.075], [x, 0.89 - Math.abs(x) * 0.13, z], mats.bridge);
    rail.rotation.z = x < 0 ? 0.13 : -0.13;
  }
}

const koi = [];
const koiMaterials = [
  new THREE.MeshStandardMaterial({ color: colors.koiOrange, roughness: 0.55 }),
  new THREE.MeshStandardMaterial({ color: 0xf0ddd0, roughness: 0.55 }),
  new THREE.MeshStandardMaterial({ color: 0xe5a037, roughness: 0.55 })
];

function makeKoi(index) { window.__bfTrace?.add(340);
  const fish = new THREE.Group();
  const material = koiMaterials[index % koiMaterials.length];
  const body = mesh(new THREE.SphereGeometry(0.17, 14, 9), material, fish, false, false);
  body.scale.set(1, 0.38, 0.5);
  const head = mesh(new THREE.SphereGeometry(0.085, 12, 8), material, fish, false, false);
  head.position.x = 0.16;
  const tail = mesh(new THREE.ConeGeometry(0.12, 0.24, 3), material, fish, false, false);
  tail.position.x = -0.22;
  tail.rotation.z = Math.PI / 2;
  const patch = mesh(
    new THREE.SphereGeometry(0.08, 10, 7),
    index % 2 ? koiMaterials[0] : koiMaterials[1],
    fish,
    false,
    false
  );
  patch.position.set(0.04, 0.055, 0);
  patch.scale.set(1.2, 0.35, 0.8);
  fish.scale.setScalar(0.9 + seeded(index, 30) * 0.45);
  pond.add(fish);
  koi.push({ group: fish, tail, index });
}
for (let i = 0; i < 7; i += 1) makeKoi(i);

const rippleMaterial = new THREE.MeshBasicMaterial({
  color: 0xa5c7ba,
  transparent: true,
  opacity: 0.32,
  depthWrite: false
});
const ripples = [];
for (let i = 0; i < 3; i += 1) {
  const ring = mesh(new THREE.RingGeometry(0.18, 0.205, 32), rippleMaterial.clone(), pond, false, false);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.055;
  ripples.push(ring);
}

// The close stone lantern is both a landmark and a deliberate full-frame occluder.
const stoneLantern = new THREE.Group();
stoneLantern.position.set(-0.12, 0, -0.52);
stoneLantern.rotation.y = Math.PI / 10;
scene.add(stoneLantern);
cylinder(stoneLantern, 0.58, 0.68, 0.2, 8, [0, 0.1, 0], mats.stoneDark);
cylinder(stoneLantern, 0.34, 0.43, 0.3, 8, [0, 0.32, 0], mats.stone);
cylinder(stoneLantern, 0.2, 0.25, 0.85, 8, [0, 0.88, 0], mats.stone);
cylinder(stoneLantern, 0.42, 0.3, 0.18, 8, [0, 1.36, 0], mats.stone);
const chamber = new THREE.Group();
chamber.position.y = 1.67;
stoneLantern.add(chamber);
box(chamber, [0.72, 0.56, 0.72], [0, 0, 0], mats.stone);
const lanternWindowMat = new THREE.MeshStandardMaterial({
  color: 0x211e18,
  emissive: 0xb66f2c,
  emissiveIntensity: 0.28,
  roughness: 0.9
});
for (const side of [-1, 1]) {
  box(chamber, [0.38, 0.3, 0.025], [0, 0, side * 0.371], lanternWindowMat, false, false);
  box(chamber, [0.025, 0.3, 0.38], [side * 0.371, 0, 0], lanternWindowMat, false, false);
}
const lanternRoof = mesh(new THREE.ConeGeometry(0.72, 0.34, 4), mats.stoneDark, stoneLantern);
lanternRoof.position.y = 2.12;
lanternRoof.rotation.y = Math.PI / 4;
cylinder(stoneLantern, 0.12, 0.18, 0.28, 8, [0, 2.4, 0], mats.stoneDark);
const finial = mesh(new THREE.SphereGeometry(0.12, 12, 8), mats.stone, stoneLantern);
finial.position.y = 2.58;

// Fence, shrubs, pines, and maple layers enclose the courtyard without flattening it.
function makeBambooFence(z, xStart, count) { window.__bfTrace?.add(410);
  const group = new THREE.Group();
  scene.add(group);
  for (let i = 0; i < count; i += 1) {
    const x = xStart + i * 0.34;
    cylinder(group, 0.055, 0.065, 2.25 + seeded(i, 40) * 0.25, 8, [x, 1.0, z], mats.tatamiEdge);
  }
  box(group, [count * 0.34, 0.1, 0.1], [xStart + (count - 1) * 0.17, 0.42, z], mats.timberDark);
  box(group, [count * 0.34, 0.1, 0.1], [xStart + (count - 1) * 0.17, 1.55, z], mats.timberDark);
}
makeBambooFence(-9.2, -8.0, 48);

const leafMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x335c39, roughness: 0.92 }),
  new THREE.MeshStandardMaterial({ color: 0x577c42, roughness: 0.92 }),
  new THREE.MeshStandardMaterial({ color: 0x7d934a, roughness: 0.92 })
];
const mapleMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x913f2f, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0xb15a37, roughness: 0.9 }),
  new THREE.MeshStandardMaterial({ color: 0x6c392b, roughness: 0.9 })
];

function makeTree(position, scale, maple = false) { window.__bfTrace?.add(433);
  const tree = new THREE.Group();
  tree.position.set(position[0], position[1], position[2]);
  tree.scale.setScalar(scale);
  scene.add(tree);
  const trunkMat = new THREE.MeshStandardMaterial({ color: maple ? 0x3b2920 : 0x46362a, roughness: 1 });
  const trunk = cylinder(tree, 0.18, 0.3, 3.0, 9, [0, 1.5, 0], trunkMat);
  trunk.rotation.z = maple ? -0.12 : 0.05;
  for (let i = 0; i < 5; i += 1) {
    const branch = cylinder(tree, 0.055, 0.11, 1.55, 7, [0, 2.4 + i * 0.13, 0], trunkMat);
    branch.rotation.z = (i % 2 ? -1 : 1) * (0.55 + seeded(i, 51) * 0.28);
    branch.rotation.y = seeded(i, 52) * Math.PI;
  }
  const materials = maple ? mapleMaterials : leafMaterials;
  for (let i = 0; i < 19; i += 1) {
    const foliage = mesh(
      new THREE.IcosahedronGeometry(0.45 + seeded(i, 54) * 0.34, 1),
      materials[i % materials.length],
      tree
    );
    const angle = seeded(i, 55) * Math.PI * 2;
    const radius = 0.45 + seeded(i, 56) * 1.25;
    foliage.position.set(
      Math.cos(angle) * radius,
      2.25 + seeded(i, 57) * 1.65,
      Math.sin(angle) * radius
    );
    foliage.scale.y = 0.65 + seeded(i, 58) * 0.5;
  }
}
makeTree([5.4, 0, -5.6], 1.25, false);
makeTree([-5.5, 0, -2.1], 1.05, true);
makeTree([4.5, 0, 0.6], 0.72, false);

for (let i = 0; i < 34; i += 1) {
  const angle = seeded(i, 61) * Math.PI * 2;
  const radius = 4.5 + seeded(i, 62) * 3.3;
  const shrub = mesh(
    new THREE.IcosahedronGeometry(0.35 + seeded(i, 63) * 0.52, 1),
    leafMaterials[i % leafMaterials.length],
    scene
  );
  shrub.position.set(
    Math.cos(angle) * radius,
    0.22 + seeded(i, 64) * 0.25,
    -3.1 + Math.sin(angle) * radius * 0.62
  );
  shrub.scale.y = 0.65;
}

for (let i = 0; i < 16; i += 1) {
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.3 + seeded(i, 70) * 0.6, 0),
    i % 4 === 0 ? mats.mossLight : mats.stone
  );
  const side = i % 2 ? 1 : -1;
  rock.position.set(side * (3.2 + seeded(i, 71) * 3.7), 0.02, -1.0 - seeded(i, 72) * 7.0);
  rock.scale.set(1.25, 0.58 + seeded(i, 73) * 0.45, 0.9);
  rock.rotation.y = seeded(i, 74) * Math.PI;
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

const fallingLeaves = [];
for (let i = 0; i < 18; i += 1) {
  const material = mapleMaterials[i % mapleMaterials.length];
  const leaf = mesh(new THREE.CircleGeometry(0.055 + seeded(i, 80) * 0.035, 5), material, scene, false, false);
  leaf.userData.index = i;
  fallingLeaves.push(leaf);
}

const hemi = new THREE.HemisphereLight(0xd8e2d5, 0x506044, 2.05);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffefc8, 3.45);
sun.position.set(-5, 11, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12;
sun.shadow.camera.bottom = -12;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 32;
sun.shadow.bias = -0.0006;
scene.add(sun);

const cameraPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.15, 1.73, 8.15),
  new THREE.Vector3(0.05, 1.70, 6.55),
  new THREE.Vector3(0.0, 1.64, 4.62),
  new THREE.Vector3(0.12, 1.57, 2.5),
  new THREE.Vector3(0.08, 1.48, 1.05),
  new THREE.Vector3(-0.88, 1.46, -0.5),
  new THREE.Vector3(-2.65, 1.52, -1.45),
  new THREE.Vector3(-4.05, 1.6, -3.35),
  new THREE.Vector3(-3.4, 1.66, -5.75),
  new THREE.Vector3(-1.25, 1.7, -7.0),
  new THREE.Vector3(1.4, 1.72, -6.85),
  new THREE.Vector3(3.55, 1.74, -5.45)
], false, 'centripetal', 0.45);

const targetPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.15, 1.28, 3.0),
  new THREE.Vector3(0.0, 1.13, 1.3),
  new THREE.Vector3(0.0, 0.75, -1.5),
  new THREE.Vector3(0.2, 0.34, -4.05),
  new THREE.Vector3(0.2, 0.28, -4.1),
  new THREE.Vector3(0.25, 0.3, -4.0),
  new THREE.Vector3(0.2, 0.38, -3.7),
  new THREE.Vector3(0.1, 0.72, -1.6),
  new THREE.Vector3(0.0, 1.25, 3.7),
  new THREE.Vector3(0.0, 1.45, 6.1)
], false, 'centripetal', 0.42);

const lookTarget = new THREE.Vector3();

function updateKoi(time) { window.__bfTrace?.add(550);
  for (const fish of koi) {
    const i = fish.index;
    const phase = time * (0.46 + i * 0.027) + seeded(i, 90) * Math.PI * 2;
    const radiusX = 0.7 + seeded(i, 91) * 1.75;
    const radiusZ = 0.4 + seeded(i, 92) * 0.75;
    const x = Math.cos(phase) * radiusX;
    const z = Math.sin(phase) * radiusZ;
    fish.group.position.set(x, 0.075 + i * 0.006, z);
    const dx = -Math.sin(phase) * radiusX;
    const dz = Math.cos(phase) * radiusZ;
    fish.group.rotation.y = Math.atan2(-dz, dx);
    fish.tail.rotation.x = Math.sin(time * 7.2 + i * 1.7) * 0.42;
  }
  for (let i = 0; i < ripples.length; i += 1) {
    const cycle = (time * 0.42 + i / ripples.length) % 1;
    const angle = i * 2.1 + time * 0.08;
    ripples[i].position.x = Math.cos(angle) * 1.45;
    ripples[i].position.z = Math.sin(angle) * 0.7;
    ripples[i].scale.setScalar(0.45 + cycle * 4.0);
    ripples[i].material.opacity = 0.34 * (1 - cycle);
  }
}

function updateLeaves(time) { window.__bfTrace?.add(574);
  for (const leaf of fallingLeaves) {
    const i = leaf.userData.index;
    const cycle = (time * (0.08 + seeded(i, 100) * 0.025) + seeded(i, 101)) % 1;
    const startX = -5.6 + seeded(i, 102) * 2.2;
    leaf.position.set(
      startX + Math.sin(time * 0.9 + i) * 0.55 + cycle * 0.8,
      4.4 - cycle * 4.1,
      -2.6 + seeded(i, 103) * 4.5 + Math.cos(time * 0.7 + i) * 0.3
    );
    leaf.rotation.set(time * 1.7 + i, time * 1.2 + i * 0.6, time * 2.3);
  }
}

function update(time) { window.__bfTrace?.add(588);
  const t = THREE.MathUtils.clamp(time, 0, DURATION);
  const u = t / DURATION;
  const doorOpen = smoothstep(0.01, 0.15, u);
  slidingLeft.position.x = THREE.MathUtils.lerp(-1.38, -2.36, doorOpen);
  slidingRight.position.x = THREE.MathUtils.lerp(1.38, 2.36, doorOpen);

  updateKoi(t);
  updateLeaves(t);

  const pathU = THREE.MathUtils.clamp(u + Math.sin(u * Math.PI) * 0.15, 0, 1);
  const lookU = THREE.MathUtils.clamp(u + Math.sin(u * Math.PI) * 0.08, 0, 1);
  cameraPath.getPointAt(pathU, camera.position);
  targetPath.getPointAt(lookU, lookTarget);
  camera.lookAt(lookTarget);
  camera.rotation.z += Math.sin(u * Math.PI) * 0.012 - smoothstep(0.72, 1, u) * 0.015;
  camera.fov = 52 - smoothstep(0.64, 1, u) * 4.5;
  camera.updateProjectionMatrix();

  water.material.color.setHSL(0.49, 0.38, 0.19 + Math.sin(t * 0.7) * 0.01);
  renderer.render(scene, camera);
}

let playing = true;
let startTime = performance.now();
let pausedAt = 0;

function animate(now) { window.__bfTrace?.add(615);
  if (playing) {
    const time = ((now - startTime) / 1000) % DURATION;
    pausedAt = time;
    update(time);
  }
  requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    playing = false;
    update(pausedAt);
  },
  seek(seconds) {
    playing = false;
    pausedAt = THREE.MathUtils.clamp(Number(seconds) || 0, 0, DURATION);
    update(pausedAt);
    return pausedAt;
  }
};

update(0);
window.__reconstructionReady = true;
requestAnimationFrame(animate);
