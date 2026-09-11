import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 5;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.07;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc6bea3);
scene.fog = new THREE.FogExp2(0xc5c5ab, 0.023);

const camera = new THREE.PerspectiveCamera(54, WIDTH / HEIGHT, 0.08, 150);
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xffdec0, 0x1d3a33, 1.9);
scene.add(hemi);

const dawnLight = new THREE.DirectionalLight(0xffc997, 3.65);
dawnLight.position.set(-16, 22, -28);
dawnLight.castShadow = true;
dawnLight.shadow.mapSize.set(1024, 1024);
dawnLight.shadow.camera.left = -28;
dawnLight.shadow.camera.right = 28;
dawnLight.shadow.camera.top = 26;
dawnLight.shadow.camera.bottom = -12;
dawnLight.shadow.camera.near = 1;
dawnLight.shadow.camera.far = 80;
scene.add(dawnLight);

const fillLight = new THREE.DirectionalLight(0x8fc8b5, 0.8);
fillLight.position.set(16, 8, 10);
scene.add(fillLight);

const mats = {
  ground: new THREE.MeshStandardMaterial({ color: 0x29463a, roughness: 1 }),
  path: new THREE.MeshStandardMaterial({ color: 0x816b48, roughness: 1 }),
  bark: new THREE.MeshStandardMaterial({ color: 0x443126, roughness: 1, flatShading: true }),
  barkLight: new THREE.MeshStandardMaterial({ color: 0x704c35, roughness: 1, flatShading: true }),
  moss: new THREE.MeshStandardMaterial({ color: 0x547b45, roughness: 1, flatShading: true }),
  mossLight: new THREE.MeshStandardMaterial({ color: 0x87a95d, roughness: 1, flatShading: true }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x244b3a, roughness: 0.9, flatShading: true }),
  leafLight: new THREE.MeshStandardMaterial({ color: 0x3d6750, roughness: 0.9, flatShading: true }),
  spirit: new THREE.MeshStandardMaterial({ color: 0xf4f0d9, roughness: 0.72 }),
  spiritGlow: new THREE.MeshBasicMaterial({ color: 0xfff7cf, transparent: true, opacity: 0.22 }),
  eye: new THREE.MeshBasicMaterial({ color: 0x17211d }),
  leather: new THREE.MeshStandardMaterial({ color: 0x39241e, roughness: 0.84 }),
  leatherLight: new THREE.MeshStandardMaterial({ color: 0x704838, roughness: 0.78 }),
  horse: new THREE.MeshStandardMaterial({ color: 0x4b3027, roughness: 0.95 }),
  horseDark: new THREE.MeshStandardMaterial({ color: 0x251d1b, roughness: 1 }),
  sleeve: new THREE.MeshStandardMaterial({ color: 0x294746, roughness: 0.95 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xb97c59, roughness: 0.94 }),
  forestSpirit: new THREE.MeshStandardMaterial({
    color: 0x344a3f,
    roughness: 0.98,
    flatShading: true,
    transparent: true,
    opacity: 0,
  }),
  forestSpiritLight: new THREE.MeshStandardMaterial({
    color: 0xb4ad79,
    emissive: 0x554c22,
    emissiveIntensity: 0.62,
    roughness: 0.9,
    flatShading: true,
    transparent: true,
    opacity: 0,
  }),
  antler: new THREE.MeshStandardMaterial({
    color: 0xe6d8a5,
    emissive: 0x62582d,
    emissiveIntensity: 0.55,
    roughness: 0.8,
    transparent: true,
    opacity: 0,
  }),
  animal: new THREE.MeshStandardMaterial({
    color: 0x4a392c,
    roughness: 1,
    flatShading: true,
    transparent: true,
    opacity: 0,
  }),
  animalLight: new THREE.MeshStandardMaterial({
    color: 0x9a7755,
    roughness: 1,
    flatShading: true,
    transparent: true,
    opacity: 0,
  }),
  whiteAnimal: new THREE.MeshStandardMaterial({
    color: 0xdbd3b9,
    roughness: 1,
    flatShading: true,
    transparent: true,
    opacity: 0,
  }),
  forestEye: new THREE.MeshBasicMaterial({
    color: 0xf4f1b2,
    transparent: true,
    opacity: 0,
  }),
};

function shadow(mesh, cast = true, receive = true) { window.__bfTrace?.add(117);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  return mesh;
}

function mesh(geometry, material, parent = scene) { window.__bfTrace?.add(123);
  const object = shadow(new THREE.Mesh(geometry, material));
  parent.add(object);
  return object;
}

function cylinderBetween(a, b, radius, material, parent = scene, radialSegments = 8) { window.__bfTrace?.add(129);
  const direction = new THREE.Vector3().subVectors(b, a);
  const object = mesh(
    new THREE.CylinderGeometry(radius * 0.72, radius, direction.length(), radialSegments),
    material,
    parent,
  );
  object.position.copy(a).add(b).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return object;
}

function smoothstep(edge0, edge1, value) { window.__bfTrace?.add(141);
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function dampedJolt(t, start, strength, frequency, decay) { window.__bfTrace?.add(146);
  const elapsed = Math.max(0, t - start);
  return elapsed > 0 ? strength * Math.sin(elapsed * frequency) * Math.exp(-elapsed * decay) : 0;
}

const ground = mesh(new THREE.PlaneGeometry(140, 160), mats.ground);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -1.3, -30);

const trail = mesh(new THREE.PlaneGeometry(7.2, 110, 1, 16), mats.path);
trail.rotation.x = -Math.PI / 2;
trail.position.set(0, -1.25, -25);

const trailEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0x58704b, roughness: 1 });
for (const side of [-1, 1]) {
  const edge = mesh(new THREE.PlaneGeometry(2.2, 112), trailEdgeMaterial);
  edge.rotation.x = -Math.PI / 2;
  edge.position.set(side * 4.45, -1.22, -25);
}

const sun = mesh(
  new THREE.CircleGeometry(7.2, 48),
  new THREE.MeshBasicMaterial({ color: 0xffc89a, fog: false }),
);
sun.position.set(-16, 18, -80);

const hazeMaterial = new THREE.MeshBasicMaterial({
  color: 0xe8deca,
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const hazeMeshes = [];
for (let i = 0; i < 8; i += 1) {
  const haze = mesh(new THREE.SphereGeometry(1, 16, 8), hazeMaterial);
  haze.scale.set(9 + (i % 3) * 4, 0.65 + (i % 2) * 0.2, 3.2);
  haze.position.set(((i * 7) % 19) - 9, -0.15 + (i % 3) * 0.7, -6 - i * 7);
  haze.userData.basePosition = haze.position.clone();
  haze.renderOrder = 2;
  hazeMeshes.push(haze);
}

const treeSpecs = [
  [-8.8, 17, 2.25, 24], [8.7, 15, 2.55, 26],
  [-7.2, 7, 1.75, 22], [7.7, 4, 2.15, 25],
  [-9.8, -3, 2.45, 28], [9.6, -7, 2.25, 27],
  [-7.7, -14, 1.7, 23], [8.4, -18, 2.1, 26],
  [-11.3, -26, 2.8, 30], [11.2, -30, 2.7, 29],
  [-6.5, -37, 1.8, 24], [7.4, -42, 2.0, 26],
  [-14, -48, 3.1, 31], [14, -52, 3.0, 32],
];

function addCedar(x, z, radius, height, index) { window.__bfTrace?.add(199);
  const group = new THREE.Group();
  group.position.set(x, -1.25, z);
  scene.add(group);

  const trunk = mesh(
    new THREE.CylinderGeometry(radius * 0.74, radius, height, 11, 6),
    index % 3 === 0 ? mats.barkLight : mats.bark,
    group,
  );
  trunk.position.y = height / 2;

  for (let rootIndex = 0; rootIndex < 5; rootIndex += 1) {
    const rootAngle = index * 0.64 + rootIndex * Math.PI * 0.4;
    cylinderBetween(
      new THREE.Vector3(0, 0.3, 0),
      new THREE.Vector3(Math.cos(rootAngle) * radius * 2.1, -0.02, Math.sin(rootAngle) * radius * 2.1),
      radius * 0.22,
      mats.bark,
      group,
      7,
    );
  }

  for (let i = 0; i < 7; i += 1) {
    const angle = index * 1.71 + i * 2.21;
    const y = 1.1 + ((i * 3.83 + index) % (height * 0.72));
    const patch = mesh(new THREE.IcosahedronGeometry(0.66 + (i % 3) * 0.23, 1), i % 2 ? mats.moss : mats.mossLight, group);
    patch.scale.set(0.45, 1.1 + (i % 2) * 0.65, 0.22);
    patch.position.set(Math.cos(angle) * radius * 0.87, y, Math.sin(angle) * radius * 0.87);
    patch.rotation.set(angle * 0.3, -angle, 0.2);
  }

  for (let level = 0; level < 4; level += 1) {
    const y = height * (0.48 + level * 0.13);
    const angle = index * 0.77 + level * 2.15;
    const length = 4.8 - level * 0.5 + (index % 2) * 0.7;
    const origin = new THREE.Vector3(Math.cos(angle) * radius * 0.3, y, Math.sin(angle) * radius * 0.3);
    const end = new THREE.Vector3(Math.cos(angle) * length, y + 0.25, Math.sin(angle) * length);
    cylinderBetween(origin, end, 0.23, mats.bark, group, 7);

    for (let j = 1; j <= 3; j += 1) {
      const crown = mesh(new THREE.ConeGeometry(1.3, 3.7, 7), (j + level) % 2 ? mats.leaf : mats.leafLight, group);
      crown.position.copy(origin).lerp(end, j / 3);
      crown.rotation.z = Math.PI / 2;
      crown.rotation.y = -angle;
      crown.scale.set(1, 0.92, 1);
    }
  }
  return group;
}

treeSpecs.forEach((spec, index) => addCedar(...spec, index));

const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0x536259, roughness: 1, flatShading: true });
for (let i = 0; i < 23; i += 1) {
  const side = i % 2 ? -1 : 1;
  const stone = mesh(new THREE.DodecahedronGeometry(0.3 + (i % 4) * 0.09, 0), i % 3 ? stoneMaterial : mats.moss);
  stone.scale.set(1.2, 0.55, 0.85);
  stone.position.set(side * (3.7 + (i % 5) * 0.7), -0.95, 18 - i * 3.2);
  stone.rotation.set(0.2, i * 0.9, 0.1);
}

const spiritHeads = [];
function addSmallSpirit(x, y, z, scale, facing, perchTilt = 0) { window.__bfTrace?.add(263);
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  group.rotation.z = perchTilt;
  scene.add(group);

  cylinderBetween(
    new THREE.Vector3(-1.15, -1.05, 0.2),
    new THREE.Vector3(1.2, -1.1, 0.15),
    0.11,
    mats.bark,
    group,
    7,
  );

  const glow = mesh(new THREE.SphereGeometry(0.85, 16, 10), mats.spiritGlow, group);
  glow.scale.set(1.12, 1.2, 0.72);

  const body = mesh(new THREE.SphereGeometry(0.5, 15, 10), mats.spirit, group);
  body.scale.set(0.78, 1.25, 0.72);
  body.position.y = -0.55;

  const headPivot = new THREE.Group();
  headPivot.position.y = 0.2;
  headPivot.rotation.y = facing;
  group.add(headPivot);

  const head = mesh(new THREE.SphereGeometry(0.58, 18, 12), mats.spirit, headPivot);
  head.scale.set(0.9, 1.05, 0.78);
  for (const side of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.065, 10, 8), mats.eye, headPivot);
    eye.position.set(side * 0.18, 0.06, 0.5);
    eye.scale.set(0.75, 1.2, 0.45);
  }
  const mouth = mesh(new THREE.SphereGeometry(0.035, 8, 6), mats.eye, headPivot);
  mouth.position.set(0, -0.17, 0.54);
  spiritHeads.push({ pivot: headPivot, start: facing });
}

addSmallSpirit(-4.9, 7.0, 6.2, 0.85, 1.2, -0.08);
addSmallSpirit(5.0, 8.9, 0.4, 1.0, -1.25, 0.08);
addSmallSpirit(-5.4, 6.4, -8.0, 1.12, 1.1);
addSmallSpirit(5.8, 10.2, -13.2, 0.82, -1.35);
addSmallSpirit(-6.2, 9.1, -25, 0.9, 0.9);

const forestSpirit = new THREE.Group();
forestSpirit.position.set(9.5, -1.16, -21.5);
scene.add(forestSpirit);

const auraMaterial = new THREE.MeshBasicMaterial({
  color: 0xf2d995,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const aura = mesh(new THREE.CircleGeometry(4.6, 48), auraMaterial, forestSpirit);
aura.position.set(0, 10.1, -1.12);
aura.scale.set(0.78, 1.15, 1);
aura.renderOrder = 1;

const spiritOpacityMaterials = [mats.forestSpirit, mats.forestSpiritLight, mats.antler, mats.forestEye];
const fsBody = mesh(new THREE.CapsuleGeometry(1.58, 5.2, 8, 12), mats.forestSpirit, forestSpirit);
fsBody.position.y = 6.25;
fsBody.scale.set(0.78, 1, 0.55);

const mantle = mesh(new THREE.ConeGeometry(2.35, 4.4, 9, 1, true), mats.forestSpiritLight, forestSpirit);
mantle.position.y = 7.4;
mantle.rotation.y = 0.3;

const fsNeck = mesh(new THREE.CylinderGeometry(0.7, 1.05, 2.3, 9), mats.forestSpirit, forestSpirit);
fsNeck.position.set(0, 10.2, -0.08);

const fsHead = mesh(new THREE.DodecahedronGeometry(1.22, 1), mats.forestSpiritLight, forestSpirit);
fsHead.position.set(0, 11.65, -0.18);
fsHead.scale.set(0.72, 1.05, 0.88);

const facePlate = mesh(new THREE.DodecahedronGeometry(0.72, 0), mats.forestSpiritLight, forestSpirit);
facePlate.position.set(0, 11.55, 0.8);
facePlate.scale.set(0.7, 1.05, 0.25);

for (const side of [-1, 1]) {
  cylinderBetween(
    new THREE.Vector3(side * 1.02, 8.9, 0),
    new THREE.Vector3(side * 1.72, 5.25, 0.35),
    0.27,
    mats.forestSpirit,
    forestSpirit,
    8,
  );
  const hand = mesh(new THREE.SphereGeometry(0.38, 9, 7), mats.forestSpiritLight, forestSpirit);
  hand.position.set(side * 1.72, 4.96, 0.38);
  hand.scale.set(0.7, 1.35, 0.7);

  const shoulderMoss = mesh(new THREE.IcosahedronGeometry(0.68, 1), mats.forestSpiritLight, forestSpirit);
  shoulderMoss.position.set(side * 1.08, 8.9, 0.12);
  shoulderMoss.scale.set(1.5, 0.65, 1);
}

for (const side of [-1, 1]) {
  const eye = mesh(new THREE.SphereGeometry(0.13, 12, 8), mats.forestEye, forestSpirit);
  eye.position.set(side * 0.34, 11.8, 1.18);

  const legPivot = new THREE.Group();
  legPivot.position.set(side * 0.72, 4.2, 0);
  forestSpirit.add(legPivot);
  const upper = mesh(new THREE.CylinderGeometry(0.34, 0.48, 4.4, 8), mats.forestSpirit, legPivot);
  upper.position.y = -2.1;
  const hoof = mesh(new THREE.CylinderGeometry(0.25, 0.38, 0.9, 8), mats.antler, legPivot);
  hoof.position.set(0, -4.55, -0.12);
  legPivot.userData.side = side;
  forestSpirit.userData.legs ??= [];
  forestSpirit.userData.legs.push(legPivot);

  const shoulder = new THREE.Vector3(side * 0.9, 10.8, 0);
  const branch1 = new THREE.Vector3(side * 2.0, 13.0, -0.1);
  const branch2 = new THREE.Vector3(side * 3.3, 14.3, 0.1);
  cylinderBetween(shoulder, branch1, 0.16, mats.antler, forestSpirit, 7);
  cylinderBetween(branch1, branch2, 0.13, mats.antler, forestSpirit, 7);
  cylinderBetween(
    new THREE.Vector3(side * 1.6, 12.55, 0),
    new THREE.Vector3(side * 1.45, 14.65, 0.15),
    0.09,
    mats.antler,
    forestSpirit,
    6,
  );
  cylinderBetween(
    new THREE.Vector3(side * 2.45, 13.58, 0),
    new THREE.Vector3(side * 2.7, 15.3, 0.2),
    0.08,
    mats.antler,
    forestSpirit,
    6,
  );
  cylinderBetween(
    new THREE.Vector3(side * 3.05, 14.08, 0),
    new THREE.Vector3(side * 3.8, 15.15, 0.08),
    0.07,
    mats.antler,
    forestSpirit,
    6,
  );
}

const animalGroups = [];
function addDeer(x, z, scale, material, angle) { window.__bfTrace?.add(410);
  const group = new THREE.Group();
  group.position.set(x, -0.75, z);
  group.scale.setScalar(scale);
  group.userData.baseScale = scale;
  group.userData.basePosition = group.position.clone();
  group.rotation.y = angle;
  scene.add(group);

  const body = mesh(new THREE.SphereGeometry(0.74, 10, 7), material, group);
  body.scale.set(1.45, 0.72, 0.65);
  body.position.y = 0.9;
  const neck = mesh(new THREE.CylinderGeometry(0.25, 0.36, 1.5, 7), material, group);
  neck.position.set(0, 1.6, -0.65);
  neck.rotation.x = -0.35;
  const head = mesh(new THREE.ConeGeometry(0.42, 1.05, 7), material, group);
  head.position.set(0, 2.35, -1.0);
  head.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    const leg = mesh(new THREE.CylinderGeometry(0.09, 0.13, 1.6, 6), material, group);
    leg.position.set(side * 0.46, 0, side * 0.18);
    const ear = mesh(new THREE.ConeGeometry(0.13, 0.48, 6), material, group);
    ear.position.set(side * 0.24, 2.68, -0.92);
    ear.rotation.z = side * -0.35;
  }
  animalGroups.push(group);
}

addDeer(-5.0, -21.8, 0.68, mats.animalLight, -0.2);
addDeer(4.6, -22.6, 0.55, mats.whiteAnimal, 0.25);
addDeer(-3.1, -28.0, 0.48, mats.animal, 0.5);
addDeer(5.8, -29.5, 0.42, mats.animalLight, -0.45);

function addRabbit(x, z, scale) { window.__bfTrace?.add(443);
  const group = new THREE.Group();
  group.position.set(x, -0.83, z);
  group.scale.setScalar(scale);
  group.userData.baseScale = scale;
  group.userData.basePosition = group.position.clone();
  scene.add(group);
  const body = mesh(new THREE.SphereGeometry(0.48, 9, 7), mats.whiteAnimal, group);
  body.scale.set(0.85, 1, 1.25);
  body.position.y = 0.35;
  const head = mesh(new THREE.SphereGeometry(0.34, 9, 7), mats.whiteAnimal, group);
  head.position.set(0, 0.72, -0.38);
  for (const side of [-1, 1]) {
    const ear = mesh(new THREE.CapsuleGeometry(0.09, 0.5, 4, 7), mats.whiteAnimal, group);
    ear.position.set(side * 0.14, 1.2, -0.38);
    ear.rotation.z = side * 0.12;
  }
  animalGroups.push(group);
}

addRabbit(-2.0, -20.4, 0.62);
addRabbit(2.2, -24.0, 0.55);

const dustGeometry = new THREE.BufferGeometry();
const dustPositions = [];
for (let i = 0; i < 120; i += 1) {
  dustPositions.push(
    ((i * 37) % 101) / 101 * 22 - 11,
    ((i * 53) % 97) / 97 * 13 + 0.3,
    -((i * 29) % 131) / 131 * 65 + 12,
  );
}
dustGeometry.setAttribute("position", new THREE.Float32BufferAttribute(dustPositions, 3));
const dust = new THREE.Points(
  dustGeometry,
  new THREE.PointsMaterial({
    color: 0xffe5b7,
    size: 0.075,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
  }),
);
scene.add(dust);

const firstPerson = new THREE.Group();
camera.add(firstPerson);

const horse = new THREE.Group();
horse.position.set(0, -1.7, -2.8);
firstPerson.add(horse);
const horseHead = mesh(new THREE.SphereGeometry(0.76, 16, 12), mats.horse, horse);
horseHead.scale.set(0.72, 1.25, 1.45);
horseHead.rotation.x = -0.18;
const blaze = mesh(new THREE.CapsuleGeometry(0.08, 0.7, 5, 8), mats.horseDark, horse);
blaze.position.set(0, 0.26, -0.92);
blaze.rotation.x = Math.PI / 2 - 0.12;

const ears = [];
for (const side of [-1, 1]) {
  const earPivot = new THREE.Group();
  earPivot.position.set(side * 0.36, 0.72, -0.12);
  horse.add(earPivot);
  const ear = mesh(new THREE.ConeGeometry(0.18, 0.82, 8), mats.horse, earPivot);
  ear.position.y = 0.34;
  ear.rotation.z = side * -0.18;
  ears.push(earPivot);
}

const bridle = mesh(new THREE.TorusGeometry(0.62, 0.055, 8, 24, Math.PI * 1.3), mats.leatherLight, horse);
bridle.scale.set(0.75, 1.15, 1);
bridle.position.set(0, 0.1, -0.78);
bridle.rotation.z = -Math.PI * 0.15;

const handPivots = [];
const reinCurves = [];
for (const side of [-1, 1]) {
  const arm = new THREE.Group();
  arm.position.set(side * 0.96, -0.78, -1.72);
  firstPerson.add(arm);
  const sleeve = mesh(new THREE.CapsuleGeometry(0.22, 1.35, 6, 10), mats.sleeve, arm);
  sleeve.position.set(side * 0.32, -0.65, 0.38);
  sleeve.rotation.z = side * -0.52;
  sleeve.rotation.x = -0.18;
  const cuff = mesh(new THREE.CylinderGeometry(0.27, 0.3, 0.3, 10), mats.leather, arm);
  cuff.position.set(0, -0.06, -0.03);
  cuff.rotation.z = side * -0.16;
  const hand = mesh(new THREE.CapsuleGeometry(0.18, 0.42, 6, 10), mats.skin, arm);
  hand.position.set(side * -0.02, 0.11, -0.23);
  hand.rotation.x = Math.PI / 2;
  hand.rotation.z = side * 0.18;
  handPivots.push(arm);

  const curve = new THREE.CubicBezierCurve3(
    new THREE.Vector3(side * 0.98, -0.66, -1.92),
    new THREE.Vector3(side * 0.78, -0.93, -2.35),
    new THREE.Vector3(side * 0.57, -1.35, -2.65),
    new THREE.Vector3(side * 0.43, -1.55, -3.18),
  );
  const rein = mesh(new THREE.TubeGeometry(curve, 18, 0.025, 6, false), mats.leatherLight, firstPerson);
  reinCurves.push(rein);
}

function cameraZAt(t) { window.__bfTrace?.add(546);
  if (t <= 1.95) return 18.7 - t * 4.55;
  if (t <= 2.28) {
    const u = (t - 1.95) / 0.33;
    return 9.8275 - 0.75 * (1 - (1 - u) * (1 - u));
  }
  return 9.0775 + dampedJolt(t, 2.28, -0.18, 12, 4.8);
}

let currentTime = 0;
let playing = true;
let lastWallTime = performance.now();

function update(t) { window.__bfTrace?.add(559);
  currentTime = THREE.MathUtils.clamp(t, 0, DURATION);
  const moving = currentTime < 2.28;
  const rideFade = 1 - smoothstep(1.95, 2.35, currentTime);
  const stopJolt = dampedJolt(currentTime, 2.04, 0.13, 17, 5.2);
  const reveal = smoothstep(2.28, 3.12, currentTime);

  camera.position.set(
    Math.sin(currentTime * 1.55) * 0.055 * rideFade,
    3.1 + Math.sin(currentTime * 8.2) * 0.085 * rideFade - stopJolt * 0.52,
    cameraZAt(currentTime),
  );
  camera.rotation.set(
    -0.018 - reveal * 0.055 + stopJolt * 0.14,
    Math.sin(currentTime * 1.2) * 0.012 * rideFade,
    Math.sin(currentTime * 7.8) * 0.009 * rideFade,
  );

  firstPerson.position.y = -0.12 + Math.sin(currentTime * 8.2 + 0.7) * 0.045 * rideFade;
  horse.rotation.x = -0.02 + Math.sin(currentTime * 8.2 + 1.2) * 0.026 * rideFade + stopJolt * 0.62;
  horse.position.z = -2.8 - stopJolt * 1.35;
  horse.position.y = -1.7 + Math.abs(Math.sin(currentTime * 8.2)) * 0.02 * rideFade;

  handPivots.forEach((hand, index) => {
    const side = index === 0 ? -1 : 1;
    hand.position.y = -0.78 + Math.sin(currentTime * 8.2 + index * 0.4) * 0.022 * rideFade;
    hand.position.z = -1.72 + stopJolt * 0.75;
    hand.rotation.z = side * (0.02 + smoothstep(2.0, 2.32, currentTime) * 0.08);
  });
  reinCurves.forEach((rein) => {
    rein.scale.y = 1 - smoothstep(2.0, 2.3, currentTime) * 0.08;
    rein.position.z = stopJolt * 0.5;
  });
  ears.forEach((ear, index) => {
    const alert = smoothstep(2.18, 2.65, currentTime);
    ear.rotation.z = (index ? -1 : 1) * (alert * 0.16 + Math.sin(currentTime * 4 + index) * 0.025);
    ear.rotation.x = -alert * 0.2;
  });

  spiritHeads.forEach(({ pivot, start }, index) => {
    const turn = smoothstep(0.45 + index * 0.22, 1.65 + index * 0.18, currentTime);
    pivot.rotation.y = THREE.MathUtils.lerp(start, 0, turn);
    pivot.rotation.x = Math.sin(currentTime * 1.5 + index) * 0.035;
  });

  const spiritX = THREE.MathUtils.lerp(8.8, 0, smoothstep(2.32, 3.8, currentTime));
  const spiritStep = smoothstep(2.32, 3.8, currentTime);
  forestSpirit.position.x = spiritX;
  forestSpirit.position.y = -1.16 + Math.sin(spiritStep * Math.PI) * 0.16;
  forestSpirit.rotation.y = THREE.MathUtils.lerp(-0.28, 0.02, smoothstep(2.5, 4.2, currentTime));
  const spiritAlpha = smoothstep(2.18, 3.05, currentTime);
  spiritOpacityMaterials.forEach((material) => {
    material.opacity = spiritAlpha;
  });
  auraMaterial.opacity = spiritAlpha * (0.12 + Math.sin(currentTime * 0.9) * 0.018);
  forestSpirit.userData.legs.forEach((leg) => {
    const stride = Math.sin(spiritStep * Math.PI * 2) * 0.31;
    leg.rotation.x = leg.userData.side * stride;
  });
  fsHead.rotation.y = Math.sin(currentTime * 0.42) * 0.06;

  const animalReveal = smoothstep(2.72, 3.58, currentTime);
  [mats.animal, mats.animalLight, mats.whiteAnimal].forEach((material) => {
    material.opacity = animalReveal;
  });
  animalGroups.forEach((animal, index) => {
    const gather = smoothstep(2.8 + index * 0.05, 4.45, currentTime);
    animal.scale.setScalar((0.92 + gather * 0.08) * animal.userData.baseScale);
    animal.position.x = animal.userData.basePosition.x * (1 - gather * 0.12);
    animal.position.z = animal.userData.basePosition.z + gather * (index % 2 ? 0.48 : -0.36);
    animal.position.y = animal.userData.basePosition.y + Math.sin(gather * Math.PI) * 0.05;
  });

  hazeMeshes.forEach((haze, index) => {
    const stopWake = smoothstep(2.0, 2.28, currentTime) * (1 - smoothstep(2.55, 3.35, currentTime));
    haze.position.x = haze.userData.basePosition.x
      + Math.sin(currentTime * 0.24 + index * 1.7) * 0.65;
    haze.position.y = haze.userData.basePosition.y + stopWake * (0.22 + (index % 3) * 0.08);
    haze.position.z = haze.userData.basePosition.z + Math.sin(currentTime * 0.31 + index) * 0.24;
  });

  const positions = dust.geometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    const particle = i / 3;
    positions[i + 1] = ((particle * 53) % 97) / 97 * 13 + 0.3
      + Math.sin(currentTime * 0.85 + particle * 1.7) * 0.18;
    positions[i] += 0;
  }
  dust.geometry.attributes.position.needsUpdate = true;

  dawnLight.intensity = 3.65 + reveal * 0.55;
  renderer.render(scene, camera);
}

function animate(now) { window.__bfTrace?.add(653);
  if (playing) {
    const delta = Math.min((now - lastWallTime) / 1000, 0.05);
    currentTime = (currentTime + delta) % DURATION;
    update(currentTime);
  }
  lastWallTime = now;
  requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    playing = false;
    update(currentTime);
  },
  seek(seconds) {
    playing = false;
    update(Number(seconds));
  },
};

update(0);
window.__reconstructionReady = true;
requestAnimationFrame(animate);
