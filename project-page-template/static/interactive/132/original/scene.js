import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (a, b, amount) => a + (b - a) * amount;
const smooth = (a, b, value) => {
  const x = clamp01((value - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const pulse = (time, center, halfWidth) =>
  Math.max(0, 1 - Math.abs(time - center) / halfWidth);

function mulberry32(seed) {
  return () => {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(132044);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02070b);
scene.fog = new THREE.FogExp2(0x071119, 0.023);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.9;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(48, WIDTH / HEIGHT, 0.08, 90);
scene.add(camera);

const hemi = new THREE.HemisphereLight(0x759bb3, 0x09140d, 0.62);
scene.add(hemi);

const moon = new THREE.DirectionalLight(0x90b7cf, 2.55);
moon.position.set(-8, 16, 8);
moon.castShadow = true;
moon.shadow.mapSize.set(1024, 1024);
moon.shadow.camera.left = -15;
moon.shadow.camera.right = 15;
moon.shadow.camera.top = 15;
moon.shadow.camera.bottom = -8;
moon.shadow.camera.near = 1;
moon.shadow.camera.far = 48;
scene.add(moon);

const lightning = new THREE.DirectionalLight(0xd9edff, 0);
lightning.position.set(7, 18, -10);
scene.add(lightning);

const cameraFill = new THREE.DirectionalLight(0x75a7bd, 1.05);
cameraFill.position.set(5, 7, 10);
scene.add(cameraFill);

const headlightTarget = new THREE.Object3D();
headlightTarget.position.set(0.5, 3.2, -11);
scene.add(headlightTarget);
const headlightBaseTarget = headlightTarget.position.clone();
const headlight = new THREE.SpotLight(0xffd899, 86, 38, 0.34, 0.58, 1.3);
headlight.position.set(-2.65, 1.65, 2.75);
headlight.target = headlightTarget;
headlight.castShadow = true;
headlight.shadow.mapSize.set(512, 512);
scene.add(headlight);

const roadMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x11191b,
  roughness: 0.25,
  metalness: 0.15,
  clearcoat: 0.62,
  clearcoatRoughness: 0.18,
});
const road = new THREE.Mesh(new THREE.PlaneGeometry(11, 70), roadMaterial);
road.rotation.x = -Math.PI / 2;
road.position.set(0, -0.04, -11);
road.receiveShadow = true;
scene.add(road);

const mudMaterial = new THREE.MeshStandardMaterial({
  color: 0x172018,
  roughness: 0.95,
});
for (const side of [-1, 1]) {
  const shoulder = new THREE.Mesh(new THREE.PlaneGeometry(8, 70), mudMaterial);
  shoulder.rotation.x = -Math.PI / 2;
  shoulder.position.set(side * 9.2, -0.025, -11);
  shoulder.receiveShadow = true;
  scene.add(shoulder);
}

const rutMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x060b0c,
  roughness: 0.18,
  clearcoat: 0.9,
});
for (const x of [-2.55, 2.55]) {
  const rut = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 58), rutMaterial);
  rut.rotation.x = -Math.PI / 2;
  rut.position.set(x, 0.012, -13);
  scene.add(rut);
}

const puddleMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x263a43,
  roughness: 0.08,
  metalness: 0.2,
  transparent: true,
  opacity: 0.54,
  depthWrite: false,
});
const puddles = [
  [-1.2, 3.5, 1.6, 0.45],
  [2.2, -2.4, 1.25, 0.4],
  [-2.0, -9.0, 1.65, 0.52],
  [1.5, -17.0, 1.8, 0.5],
  [0.3, -25.0, 2.1, 0.55],
];
for (const [x, z, sx, sy] of puddles) {
  const puddle = new THREE.Mesh(
    new THREE.CircleGeometry(1, 40),
    puddleMaterial,
  );
  puddle.rotation.x = -Math.PI / 2;
  puddle.scale.set(sx, sy, 1);
  puddle.position.set(x, 0.02, z);
  scene.add(puddle);
}

const trunkMaterial = new THREE.MeshStandardMaterial({
  color: 0x202a20,
  roughness: 1,
});
const leafMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x10261a, roughness: 0.96 }),
  new THREE.MeshStandardMaterial({ color: 0x173323, roughness: 0.94 }),
  new THREE.MeshStandardMaterial({ color: 0x1d412a, roughness: 0.92 }),
];
const trunkGeometry = new THREE.CylinderGeometry(0.28, 0.48, 9, 7);
const leafGeometry = new THREE.IcosahedronGeometry(1.7, 1);

for (let i = 0; i < 34; i += 1) {
  const side = i % 2 === 0 ? -1 : 1;
  const x = side * (6.2 + random() * 7.5);
  const z = 15 - Math.floor(i / 2) * 3.0 + (random() - 0.5) * 2.2;
  const scale = 0.72 + random() * 0.65;
  const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
  trunk.scale.set(scale, 0.85 + random() * 0.55, scale);
  trunk.position.set(x, 3.8 * trunk.scale.y, z);
  trunk.rotation.z = (random() - 0.5) * 0.12;
  trunk.castShadow = true;
  trunk.receiveShadow = true;
  scene.add(trunk);

  for (let crown = 0; crown < 3; crown += 1) {
    const leaves = new THREE.Mesh(
      leafGeometry,
      leafMaterials[(i + crown) % leafMaterials.length],
    );
    leaves.scale.set(
      scale * (1.25 + random() * 0.65),
      scale * (1.1 + random() * 0.55),
      scale * (1.25 + random() * 0.7),
    );
    leaves.position.set(
      x + (random() - 0.5) * 2.5,
      7.1 + crown * 1.4 + random() * 1.4,
      z + (random() - 0.5) * 2.2,
    );
    leaves.castShadow = true;
    scene.add(leaves);
  }
}

for (let i = 0; i < 18; i += 1) {
  const side = i % 2 === 0 ? -1 : 1;
  const fern = new THREE.Group();
  const stemMaterial = leafMaterials[1 + (i % 2)];
  for (let blade = 0; blade < 5; blade += 1) {
    const leaf = new THREE.Mesh(
      new THREE.ConeGeometry(0.18, 2.6, 5),
      stemMaterial,
    );
    leaf.position.y = 1.0;
    leaf.rotation.z = mix(-0.9, 0.9, blade / 4);
    leaf.scale.y = 0.72 + random() * 0.5;
    fern.add(leaf);
  }
  fern.position.set(
    side * (5.8 + random() * 2.7),
    0,
    9 - i * 2.45 + random(),
  );
  fern.scale.setScalar(0.7 + random() * 0.55);
  scene.add(fern);
}

const jeep = new THREE.Group();
jeep.position.set(-4.5, 0, 5.25);
jeep.rotation.y = -0.035;
scene.add(jeep);

const jeepGreen = new THREE.MeshPhysicalMaterial({
  color: 0x59613b,
  roughness: 0.35,
  metalness: 0.35,
  clearcoat: 0.62,
  clearcoatRoughness: 0.22,
});
const jeepDark = new THREE.MeshStandardMaterial({
  color: 0x080b0b,
  roughness: 0.65,
});
const jeepGlass = new THREE.MeshPhysicalMaterial({
  color: 0x20343b,
  roughness: 0.08,
  metalness: 0.2,
  transparent: true,
  opacity: 0.68,
});
const steel = new THREE.MeshStandardMaterial({
  color: 0x747b78,
  roughness: 0.35,
  metalness: 0.85,
});

function addBox(parent, size, position, material, rotation = null) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function taperedBox(parent, backWidth, frontWidth, height, length, position, material) {
  const backZ = -length / 2;
  const frontZ = length / 2;
  const y = height / 2;
  const vertices = new Float32Array([
    -backWidth / 2, -y, backZ, backWidth / 2, -y, backZ,
    backWidth / 2, y, backZ, -backWidth / 2, y, backZ,
    -frontWidth / 2, -y, frontZ, frontWidth / 2, -y, frontZ,
    frontWidth / 2, y, frontZ, -frontWidth / 2, y, frontZ,
  ]);
  const indices = [
    0, 3, 2, 0, 2, 1,
    4, 5, 6, 4, 6, 7,
    0, 1, 5, 0, 5, 4,
    3, 7, 6, 3, 6, 2,
    1, 2, 6, 1, 6, 5,
    0, 4, 7, 0, 7, 3,
  ];
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

addBox(jeep, [3.0, 0.95, 4.7], [0, 1.25, 0], jeepGreen);
addBox(jeep, [2.86, 0.55, 1.65], [0, 2.02, -1.22], jeepGreen);
addBox(jeep, [2.72, 1.08, 0.12], [0, 2.68, 0.08], jeepGlass, [-0.18, 0, 0]);
addBox(jeep, [0.12, 1.2, 0.16], [-1.44, 2.68, 0.08], steel, [-0.18, 0, 0]);
addBox(jeep, [0.12, 1.2, 0.16], [1.44, 2.68, 0.08], steel, [-0.18, 0, 0]);
addBox(jeep, [2.95, 0.13, 0.18], [0, 3.27, -0.04], steel, [-0.18, 0, 0]);
addBox(jeep, [2.75, 0.62, 0.12], [0, 1.18, -2.39], jeepDark);
for (let x = -1; x <= 1; x += 0.5) {
  addBox(jeep, [0.1, 0.45, 0.08], [x, 1.2, -2.47], steel);
}

const wheelGeometry = new THREE.CylinderGeometry(0.73, 0.73, 0.48, 20);
for (const x of [-1.58, 1.58]) {
  for (const z of [-1.55, 1.52]) {
    const wheel = new THREE.Mesh(wheelGeometry, jeepDark);
    wheel.position.set(x, 0.76, z);
    wheel.rotation.z = Math.PI / 2;
    wheel.castShadow = true;
    jeep.add(wheel);
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.27, 0.27, 0.51, 12),
      steel,
    );
    hub.position.copy(wheel.position);
    hub.rotation.z = Math.PI / 2;
    jeep.add(hub);
  }
}

const headlampMaterial = new THREE.MeshStandardMaterial({
  color: 0xffe5ac,
  emissive: 0xffc768,
  emissiveIntensity: 5.5,
});
for (const x of [-0.9, 0.9]) {
  const lamp = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28, 0.28, 0.1, 20),
    headlampMaterial,
  );
  lamp.position.set(x, 1.55, -2.45);
  lamp.rotation.x = Math.PI / 2;
  jeep.add(lamp);
}

const mirrorArm = new THREE.Mesh(
  new THREE.CylinderGeometry(0.035, 0.035, 0.65, 8),
  steel,
);
mirrorArm.position.set(1.72, 2.25, -0.45);
mirrorArm.rotation.z = 0.45;
jeep.add(mirrorArm);
addBox(jeep, [0.46, 0.28, 0.12], [1.89, 2.52, -0.45], jeepDark);

const povHand = new THREE.Group();
camera.add(povHand);
povHand.position.set(-0.2, -0.24, 0);
povHand.scale.setScalar(0.7);
const sleeveMaterial = new THREE.MeshStandardMaterial({
  color: 0x2e3529,
  roughness: 0.95,
});
const skinMaterial = new THREE.MeshStandardMaterial({
  color: 0x9a7055,
  roughness: 0.82,
});
const forearm = new THREE.Mesh(
  new THREE.CylinderGeometry(0.11, 0.17, 1.35, 10),
  sleeveMaterial,
);
forearm.position.set(-1.03, -0.76, -1.75);
forearm.rotation.z = -0.72;
forearm.rotation.x = -0.18;
povHand.add(forearm);
const hand = new THREE.Mesh(new THREE.SphereGeometry(0.19, 14, 10), skinMaterial);
hand.scale.set(0.75, 1.28, 0.65);
hand.position.set(-0.57, -0.35, -1.82);
povHand.add(hand);
for (let i = 0; i < 3; i += 1) {
  const finger = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.035, 0.23, 4, 7),
    skinMaterial,
  );
  finger.position.set(-0.68 + i * 0.055, -0.25, -1.88);
  finger.rotation.z = 0.35;
  povHand.add(finger);
}

const rex = new THREE.Group();
scene.add(rex);

const rexSkin = new THREE.MeshStandardMaterial({
  color: 0x526a48,
  roughness: 0.62,
  metalness: 0.04,
});
const rexLight = new THREE.MeshStandardMaterial({
  color: 0x7c8557,
  roughness: 0.64,
});
const rexDark = new THREE.MeshStandardMaterial({
  color: 0x283d2c,
  roughness: 0.74,
});
const mouthMaterial = new THREE.MeshStandardMaterial({
  color: 0x4b1014,
  roughness: 0.85,
});
const tongueMaterial = new THREE.MeshStandardMaterial({
  color: 0x8d3b43,
  roughness: 0.72,
});
const toothMaterial = new THREE.MeshStandardMaterial({
  color: 0xe8ddbd,
  roughness: 0.38,
});
const eyeMaterial = new THREE.MeshStandardMaterial({
  color: 0xf3c353,
  emissive: 0xd37b16,
  emissiveIntensity: 4,
  roughness: 0.25,
});

function ellipsoid(parent, radius, scale, position, material, detail = 20) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(radius, detail, Math.max(10, detail / 2)),
    material,
  );
  mesh.scale.set(...scale);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

const unitUp = new THREE.Vector3(0, 1, 0);
function makeLimb(parent, topRadius, bottomRadius, material, segments = 10) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(topRadius, bottomRadius, 1, segments),
    material,
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function placeBetween(mesh, from, to) {
  const direction = new THREE.Vector3().subVectors(to, from);
  mesh.position.copy(from).addScaledVector(direction, 0.5);
  mesh.scale.y = direction.length();
  mesh.quaternion.setFromUnitVectors(unitUp, direction.normalize());
}

ellipsoid(rex, 1, [1.95, 1.82, 2.7], [0, 5.2, -0.15], rexSkin, 26);
ellipsoid(rex, 1, [1.52, 1.34, 2.7], [0, 5.78, 1.85], rexSkin, 26);
ellipsoid(rex, 1, [1.35, 0.82, 1.5], [0, 4.8, 0.7], rexLight, 22);

const tailPoints = [
  new THREE.Vector3(0, 5.5, -1.2),
  new THREE.Vector3(0.55, 5.3, -3.3),
  new THREE.Vector3(1.45, 4.9, -5.5),
  new THREE.Vector3(2.65, 4.45, -7.5),
  new THREE.Vector3(3.9, 4.1, -9.25),
  new THREE.Vector3(5.15, 3.9, -10.7),
  new THREE.Vector3(6.25, 3.82, -11.9),
];
for (let i = 0; i < tailPoints.length - 1; i += 1) {
  const tail = makeLimb(
    rex,
    mix(1.45, 0.2, i / 6),
    mix(1.15, 0.1, i / 6),
    rexSkin,
    12,
  );
  placeBetween(tail, tailPoints[i], tailPoints[i + 1]);
}

const legData = [];
for (const side of [-1, 1]) {
  const thigh = makeLimb(rex, 0.7, 0.52, rexSkin, 14);
  const shin = makeLimb(rex, 0.48, 0.3, rexLight, 12);
  const hipJoint = ellipsoid(rex, 1, [0.78, 0.86, 0.78], [0, 0, 0], rexSkin);
  const kneeJoint = ellipsoid(rex, 1, [0.52, 0.52, 0.52], [0, 0, 0], rexSkin);
  const foot = ellipsoid(rex, 1, [0.62, 0.25, 1.28], [0, 0, 0], rexDark);
  const claws = [];
  for (let toe = -1; toe <= 1; toe += 1) {
    const claw = new THREE.Mesh(
      new THREE.ConeGeometry(0.11, 0.5, 7),
      toothMaterial,
    );
    claw.rotation.x = Math.PI / 2;
    rex.add(claw);
    claws.push(claw);
  }
  legData.push({ side, thigh, shin, hipJoint, kneeJoint, foot, claws });
}

const armData = [];
for (const side of [-1, 1]) {
  const upper = makeLimb(rex, 0.2, 0.14, rexSkin, 9);
  const lower = makeLimb(rex, 0.13, 0.08, rexLight, 8);
  const claw = new THREE.Mesh(
    new THREE.ConeGeometry(0.055, 0.36, 6),
    toothMaterial,
  );
  rex.add(claw);
  armData.push({ side, upper, lower, claw });
}

const neckLower = makeLimb(rex, 1.25, 1.05, rexSkin, 16);
const neckUpper = makeLimb(rex, 1.05, 0.8, rexSkin, 16);
const neckJoint = ellipsoid(rex, 1, [1.2, 1.1, 1.35], [0, 0, 0], rexSkin, 22);

const headRig = new THREE.Group();
rex.add(headRig);
ellipsoid(headRig, 1, [1.68, 1.12, 1.68], [0, 0.18, -0.05], rexSkin, 26);
taperedBox(headRig, 2.95, 2.05, 0.82, 2.75, [0, -0.17, 1.35], rexLight);
taperedBox(headRig, 2.25, 1.82, 0.56, 1.25, [0, -0.31, 2.76], rexLight);
const mouthInterior = ellipsoid(
  headRig,
  1,
  [1.3, 0.3, 1.4],
  [0, -0.66, 1.34],
  mouthMaterial,
  18,
);
for (const side of [-1, 1]) {
  ellipsoid(headRig, 1, [0.35, 0.27, 0.32], [side * 1.3, 0.58, 0.72], rexDark);
  ellipsoid(headRig, 1, [0.14, 0.14, 0.12], [side * 1.48, 0.62, 0.82], eyeMaterial, 16);
  ellipsoid(headRig, 1, [0.22, 0.13, 0.1], [side * 0.57, -0.03, 3.33], rexDark, 14);
  addBox(
    headRig,
    [1.18, 0.22, 0.42],
    [side * 0.73, 0.73, 0.76],
    rexDark,
    [0, side * 0.08, side * -0.16],
  );
}

const jaw = new THREE.Group();
jaw.position.set(0, -0.5, 0.18);
headRig.add(jaw);
taperedBox(jaw, 2.62, 1.76, 0.46, 2.9, [0, -0.21, 1.45], rexLight);
ellipsoid(jaw, 1, [1.04, 0.12, 1.18], [0, 0.04, 1.42], tongueMaterial, 18);

for (const side of [-1, 1]) {
  for (let row = 0; row < 5; row += 1) {
    const upperTooth = new THREE.Mesh(
      new THREE.ConeGeometry(0.105, 0.48 - row * 0.025, 7),
      toothMaterial,
    );
    upperTooth.position.set(
      side * (1.0 + (row % 2) * 0.12),
      -0.69,
      0.45 + row * 0.47,
    );
    upperTooth.rotation.z = side * 0.12;
    headRig.add(upperTooth);

    const lowerTooth = new THREE.Mesh(
      new THREE.ConeGeometry(0.09, 0.4 - row * 0.02, 7),
      toothMaterial,
    );
    lowerTooth.position.set(
      side * (0.88 + (row % 2) * 0.12),
      0.02,
      0.5 + row * 0.46,
    );
    lowerTooth.rotation.z = Math.PI + side * 0.1;
    jaw.add(lowerTooth);
  }
}

for (let frontTooth = 0; frontTooth < 4; frontTooth += 1) {
  const x = -0.72 + frontTooth * 0.48;
  const upperTooth = new THREE.Mesh(
    new THREE.ConeGeometry(0.105, 0.48, 7),
    toothMaterial,
  );
  upperTooth.position.set(x, -0.69, 2.67);
  headRig.add(upperTooth);

  const lowerTooth = new THREE.Mesh(
    new THREE.ConeGeometry(0.09, 0.38, 7),
    toothMaterial,
  );
  lowerTooth.position.set(x * 0.9, 0.02, 2.62);
  lowerTooth.rotation.z = Math.PI;
  jaw.add(lowerTooth);
}

const dorsalScales = [];
for (let i = 0; i < 9; i += 1) {
  const scaleMesh = new THREE.Mesh(
    new THREE.ConeGeometry(0.18 + i * 0.025, 0.65 + i * 0.06, 6),
    rexDark,
  );
  scaleMesh.position.set(0, 7.05 - Math.abs(i - 5) * 0.12, -2.6 + i * 0.76);
  scaleMesh.rotation.x = -0.16;
  rex.add(scaleMesh);
  dorsalScales.push(scaleMesh);
}

const toothDrops = [];
for (let i = 0; i < 24; i += 1) {
  const dropMaterial = new THREE.MeshBasicMaterial({
    color: 0xc4e8f2,
    transparent: true,
    opacity: 0,
    depthWrite: false,
  });
  const drop = new THREE.Mesh(
    new THREE.SphereGeometry(0.035 + (i % 3) * 0.012, 6, 5),
    dropMaterial,
  );
  drop.scale.y = 2.5;
  headRig.add(drop);
  toothDrops.push({
    mesh: drop,
    offset: (i * 0.119) % 0.9,
    x: (i % 2 === 0 ? -1 : 1) * (0.65 + ((i * 7) % 6) * 0.09),
    z: 0.5 + ((i * 5) % 11) * 0.2,
  });
}

const rainCount = 620;
const rainGeometry = new THREE.CylinderGeometry(0.008, 0.014, 1, 4);
const rainMaterial = new THREE.MeshBasicMaterial({
  color: 0xaac7d2,
  transparent: true,
  opacity: 0.46,
  depthWrite: false,
});
const rain = new THREE.InstancedMesh(rainGeometry, rainMaterial, rainCount);
rain.frustumCulled = false;
scene.add(rain);
const rainData = [];
for (let i = 0; i < rainCount; i += 1) {
  rainData.push({
    x: -14 + random() * 28,
    y: random() * 15,
    z: -34 + random() * 48,
    speed: 14 + random() * 13,
    length: 0.38 + random() * 0.95,
    drift: 0.18 + random() * 0.28,
  });
}
const rainMatrix = new THREE.Matrix4();
const rainPosition = new THREE.Vector3();
const rainQuaternion = new THREE.Quaternion().setFromEuler(
  new THREE.Euler(0.16, 0, 0.08),
);
const rainScale = new THREE.Vector3();

const splashMaterial = new THREE.MeshBasicMaterial({
  color: 0x8eb2c0,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
  side: THREE.DoubleSide,
});
const splashes = [];
for (let i = 0; i < 18; i += 1) {
  const splash = new THREE.Mesh(
    new THREE.RingGeometry(0.07, 0.095, 16),
    splashMaterial.clone(),
  );
  splash.rotation.x = -Math.PI / 2;
  splash.position.set(
    -4.6 + random() * 9.2,
    0.035,
    -17 + random() * 26,
  );
  scene.add(splash);
  splashes.push({ mesh: splash, offset: random() });
}

const boltMaterial = new THREE.LineBasicMaterial({
  color: 0xe5f5ff,
  transparent: true,
  opacity: 0,
});
const boltPoints = [
  new THREE.Vector3(6.5, 15, -25),
  new THREE.Vector3(6.0, 12.7, -25),
  new THREE.Vector3(6.45, 12.7, -25),
  new THREE.Vector3(5.55, 9.7, -25),
  new THREE.Vector3(5.9, 9.8, -25),
  new THREE.Vector3(5.1, 6.8, -25),
  new THREE.Vector3(5.55, 10.2, -25),
  new THREE.Vector3(4.5, 8.8, -25),
];
const bolt = new THREE.Line(
  new THREE.BufferGeometry().setFromPoints(boltPoints),
  boltMaterial,
);
scene.add(bolt);

const tmpA = new THREE.Vector3();
const tmpB = new THREE.Vector3();
const tmpC = new THREE.Vector3();
const baseCamera = new THREE.Vector3(0.38, 1.18, 8.0);

function updateLegs(time, entrance) {
  for (const data of legData) {
    const phase = data.side < 0 ? 0 : Math.PI;
    const stride = Math.sin(entrance * Math.PI + phase) * (1 - entrance) * 0.7;
    const hip = tmpA.set(data.side * 1.12, 5.15, 0.0).clone();
    const knee = tmpB
      .set(data.side * 1.24, 2.72, -1.15 + stride * 0.55)
      .clone();
    const footZ = data.side < 0
      ? mix(-0.8, 0.62, entrance)
      : mix(0.8, -0.35, entrance);
    const ankle = tmpC.set(data.side * 1.08, 0.72, footZ).clone();
    placeBetween(data.thigh, hip, knee);
    placeBetween(data.shin, knee, ankle);
    data.hipJoint.position.copy(hip);
    data.kneeJoint.position.copy(knee);
    data.foot.position.set(data.side * 1.08, 0.33, footZ + 0.55);
    data.foot.rotation.y = data.side * -0.06;
    data.claws.forEach((claw, index) => {
      claw.position.set(
        data.side * 1.08 + (index - 1) * 0.28,
        0.28,
        footZ + 1.52,
      );
      claw.rotation.x = Math.PI / 2;
    });
  }

  for (const arm of armData) {
    const shoulder = new THREE.Vector3(arm.side * 1.32, 6.35, 2.65);
    const elbow = new THREE.Vector3(arm.side * 1.52, 5.55, 3.08);
    const wrist = new THREE.Vector3(arm.side * 1.18, 5.2, 3.55);
    placeBetween(arm.upper, shoulder, elbow);
    placeBetween(arm.lower, elbow, wrist);
    arm.claw.position.copy(wrist).add(new THREE.Vector3(0, -0.12, 0.17));
    arm.claw.rotation.x = Math.PI;
  }
}

function updateRain(time) {
  for (let i = 0; i < rainData.length; i += 1) {
    const drop = rainData[i];
    const wrappedY = ((drop.y - time * drop.speed) % 15 + 15) % 15;
    rainPosition.set(
      drop.x + time * drop.drift,
      wrappedY,
      drop.z - time * 0.5,
    );
    rainScale.set(1, drop.length, 1);
    rainMatrix.compose(rainPosition, rainQuaternion, rainScale);
    rain.setMatrixAt(i, rainMatrix);
  }
  rain.instanceMatrix.needsUpdate = true;

  splashes.forEach(({ mesh, offset }, index) => {
    const phase = (time * (2.8 + (index % 4) * 0.17) + offset) % 1;
    mesh.scale.setScalar(0.55 + phase * 3.4);
    mesh.material.opacity = (1 - phase) * 0.24;
  });
}

function updateScene(rawTime) {
  const time = Math.min(DURATION, Math.max(0, Number(rawTime) || 0));
  const entrance = smooth(0.1, 1.65, time);
  const settle = smooth(1.55, 2.3, time);
  const lower = smooth(2.85, 4.35, time);
  const mouthOpen = smooth(3.92, 4.45, time);
  const roar = smooth(4.18, 4.52, time);
  const flash =
    pulse(time, 1.28, 0.12) * 1.0 +
    pulse(time, 1.5, 0.075) * 0.55 +
    pulse(time, 3.93, 0.09) * 0.7;

  rex.position.set(
    mix(4.05, 0.45, entrance),
    0.04 + Math.sin(time * 2.6) * 0.035 * settle,
    mix(-15.5, -11.85, entrance),
  );
  rex.rotation.y = mix(-0.38, -0.1, entrance);
  rex.rotation.z = Math.sin(time * 1.7) * 0.01 * entrance;
  updateLegs(time, entrance);

  headRig.position.set(
    mix(0.25, -0.08, lower),
    mix(7.25, 3.45, lower),
    mix(4.1, 11.3, lower),
  );
  headRig.rotation.set(
    mix(-0.015, 0.13, lower),
    Math.sin(time * 1.35) * 0.025,
    Math.sin(time * 1.1) * 0.018 * lower,
  );
  jaw.rotation.x =
    mouthOpen * (0.57 + Math.sin(time * 22) * 0.018 * roar);
  mouthInterior.scale.y = 0.025 + mouthOpen * 0.57;
  mouthInterior.position.y = -0.55 - mouthOpen * 0.24;

  const lowerNeckStart = new THREE.Vector3(0, 6.25, 2.45);
  const neckMiddle = new THREE.Vector3(
    mix(0.02, -0.03, lower),
    mix(7.05, 5.25, lower),
    mix(3.4, 6.4, lower),
  );
  const upperNeckEnd = headRig.position
    .clone()
    .add(new THREE.Vector3(0, 0.22, -1.12));
  placeBetween(neckLower, lowerNeckStart, neckMiddle);
  placeBetween(neckUpper, neckMiddle, upperNeckEnd);
  neckJoint.position.copy(neckMiddle);

  dorsalScales.forEach((scaleMesh, index) => {
    scaleMesh.visible = lower < 0.82 || index < 6;
  });

  toothDrops.forEach((drop, index) => {
    const cycle = ((time - 4.18) * (1.25 + (index % 4) * 0.08) + drop.offset) % 1;
    const active = time > 4.2 ? 1 : 0;
    drop.mesh.position.set(
      drop.x + Math.sin(index * 2.7) * cycle * 0.08,
      -0.76 - cycle * 1.5,
      drop.z + cycle * 0.25,
    );
    drop.mesh.material.opacity = active * Math.sin(cycle * Math.PI) * 0.72;
  });

  const shake =
    roar *
    (0.012 + 0.018 * smooth(4.42, 4.8, time)) *
    (1 - smooth(5.02, DURATION, time));
  camera.position.copy(baseCamera);
  camera.position.x +=
    Math.sin(time * 46) * shake + Math.sin(time * 79) * shake * 0.42;
  camera.position.y += Math.sin(time * 57) * shake * 0.75;
  camera.position.z += Math.sin(time * 39) * shake * 0.34;
  const initialLook = new THREE.Vector3(0.25, 4.1, -11.2);
  const finalHeadWorld = headRig.position.clone().add(rex.position);
  headlightTarget.position.lerpVectors(
    headlightBaseTarget,
    finalHeadWorld,
    smooth(2.7, 4.05, time),
  );
  const lookBlend = smooth(2.55, 4.12, time);
  const lookAt = initialLook.lerp(
    finalHeadWorld.clone().add(new THREE.Vector3(0, 0.1, 0.7)),
    lookBlend,
  );
  lookAt.x += Math.sin(time * 41) * shake * 0.45;
  lookAt.y += Math.sin(time * 53) * shake * 0.36;
  camera.lookAt(lookAt);

  lightning.intensity = flash * 15;
  moon.intensity = 2.45 + flash * 2.6;
  hemi.intensity = 0.58 + flash * 1.18;
  cameraFill.intensity = 0.95 + lower * 0.45 + flash * 0.35;
  headlight.intensity =
    (time < 0.38 ? 55 + pulse(time, 0.15, 0.12) * 35 : 86) *
    (1 - pulse(time, 2.15, 0.08) * 0.35);
  headlampMaterial.emissiveIntensity = headlight.intensity / 15;
  renderer.toneMappingExposure = 0.87 + flash * 0.34;
  scene.background.setRGB(
    mix(0.008, 0.18, flash),
    mix(0.025, 0.25, flash),
    mix(0.04, 0.33, flash),
  );
  scene.fog.color.copy(scene.background);
  boltMaterial.opacity = flash > 0.35 ? Math.min(1, flash) : 0;

  jeep.rotation.z = Math.sin(time * 0.8) * 0.0015;
  povHand.rotation.z = Math.sin(time * 46) * shake * 0.3;
  updateRain(time);
  renderer.render(scene, camera);
  return time;
}

let currentTime = 0;
let paused = true;

window.reconstruction = {
  pause() {
    paused = true;
    updateScene(currentTime);
    return currentTime;
  },
  seek(seconds) {
    paused = true;
    currentTime = updateScene(seconds);
    return currentTime;
  },
  getState() {
    return {
      paused,
      time: currentTime,
      width: WIDTH,
      height: HEIGHT,
      fps: FPS,
      frames: FRAME_COUNT,
      duration: DURATION,
    };
  },
};

updateScene(0);
window.sceneReady = true;
