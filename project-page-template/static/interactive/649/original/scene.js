import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAMES = 124;
const DURATION = FRAMES / FPS;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.92;
renderer.physicallyCorrectLights = true;
renderer.domElement.dataset.renderSurface = "museum-atrium";
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc7dce6);
scene.fog = new THREE.Fog(0xc7dce6, 38, 78);

const camera = new THREE.PerspectiveCamera(65, WIDTH / HEIGHT, 0.08, 120);
camera.up.set(0, 1, 0);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

function makeStoneTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256;
  canvas.height = 256;
  const context = canvas.getContext("2d");
  context.fillStyle = "#e7e2d8";
  context.fillRect(0, 0, 256, 256);
  for (let y = 0; y < 256; y += 32) {
    for (let x = 0; x < 256; x += 32) {
      const v = 221 + ((x * 13 + y * 7) % 12);
      context.fillStyle = `rgb(${v + 5},${v + 3},${v})`;
      context.fillRect(x + 1, y + 1, 30, 30);
    }
  }
  context.strokeStyle = "rgba(115,105,92,0.16)";
  context.lineWidth = 1;
  for (let i = 0; i <= 256; i += 32) {
    context.beginPath();
    context.moveTo(i, 0);
    context.lineTo(i, 256);
    context.stroke();
    context.beginPath();
    context.moveTo(0, i);
    context.lineTo(256, i);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(7, 7);
  texture.anisotropy = maxAnisotropy;
  return texture;
}

const stoneTexture = makeStoneTexture();
const materials = {
  stone: new THREE.MeshStandardMaterial({
    color: 0xe9e4d9,
    map: stoneTexture,
    roughness: 0.63,
    metalness: 0.02,
  }),
  concrete: new THREE.MeshStandardMaterial({
    color: 0xdfe3df,
    roughness: 0.74,
    metalness: 0.01,
  }),
  concreteUnderside: new THREE.MeshStandardMaterial({
    color: 0xc9cece,
    roughness: 0.82,
  }),
  wall: new THREE.MeshStandardMaterial({
    color: 0xe9e9e2,
    roughness: 0.79,
  }),
  oak: new THREE.MeshStandardMaterial({
    color: 0x8b5a32,
    roughness: 0.48,
  }),
  darkMetal: new THREE.MeshStandardMaterial({
    color: 0x20313a,
    roughness: 0.28,
    metalness: 0.7,
  }),
  brass: new THREE.MeshStandardMaterial({
    color: 0xd69a38,
    roughness: 0.24,
    metalness: 0.82,
  }),
  tealMetal: new THREE.MeshStandardMaterial({
    color: 0x147d82,
    roughness: 0.22,
    metalness: 0.68,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xaed7df,
    roughness: 0.07,
    metalness: 0.03,
    transmission: 0.35,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  window: new THREE.MeshPhysicalMaterial({
    color: 0xb8dce8,
    roughness: 0.04,
    metalness: 0.05,
    transmission: 0.4,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  darkGlass: new THREE.MeshPhysicalMaterial({
    color: 0x335763,
    roughness: 0.12,
    metalness: 0.18,
    transmission: 0.18,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
  }),
  whiteLight: new THREE.MeshStandardMaterial({
    color: 0xffefca,
    emissive: 0xffe4a4,
    emissiveIntensity: 0.9,
    roughness: 0.25,
  }),
  foliage: new THREE.MeshStandardMaterial({
    color: 0x3e7552,
    roughness: 0.8,
  }),
  soil: new THREE.MeshStandardMaterial({
    color: 0x4b3327,
    roughness: 1,
  }),
  red: new THREE.MeshStandardMaterial({
    color: 0xb84636,
    roughness: 0.5,
  }),
  blue: new THREE.MeshStandardMaterial({
    color: 0x376f91,
    roughness: 0.5,
  }),
  cream: new THREE.MeshStandardMaterial({
    color: 0xf4ede0,
    roughness: 0.56,
  }),
};

function meshBox(name, size, position, material, castShadow = true, receiveShadow = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = receiveShadow;
  scene.add(mesh);
  return mesh;
}

function addRailSegment(name, size, position) {
  meshBox(`${name}-glass`, size, position, materials.glass, false, false);
  const horizontal = size[0] > size[2];
  const railSize = horizontal ? [size[0] + 0.12, 0.09, 0.1] : [0.1, 0.09, size[2] + 0.12];
  meshBox(
    `${name}-handrail`,
    railSize,
    [position[0], position[1] + size[1] / 2 + 0.05, position[2]],
    materials.oak,
  );
  const span = horizontal ? size[0] : size[2];
  const count = Math.max(2, Math.floor(span / 3.5));
  for (let i = 0; i <= count; i += 1) {
    const offset = -span / 2 + (span * i) / count;
    meshBox(
      `${name}-post-${i}`,
      [0.07, size[1] + 0.12, 0.07],
      [
        position[0] + (horizontal ? offset : 0),
        position[1],
        position[2] + (horizontal ? 0 : offset),
      ],
      materials.darkMetal,
    );
  }
}

function addLevel(level, y) {
  const slabParts = [
    [`level-${level}-left`, [6.2, 0.62, 30.4], [-13.9, y, 0]],
    [`level-${level}-right`, [6.2, 0.62, 30.4], [13.9, y, 0]],
    [`level-${level}-back`, [21.7, 0.62, 5.2], [0, y, -12.6]],
    [`level-${level}-front-left`, [5.3, 0.62, 4.5], [-8.6, y, 12.9]],
    [`level-${level}-front-right`, [5.3, 0.62, 4.5], [8.6, y, 12.9]],
  ];
  slabParts.forEach(([name, size, position]) => meshBox(name, size, position, materials.concrete));

  const railY = y + 0.9;
  addRailSegment(`level-${level}-left-rail`, [0.08, 1.18, 20.0], [-10.75, railY, 0]);
  addRailSegment(`level-${level}-right-rail`, [0.08, 1.18, 20.0], [10.75, railY, 0]);
  addRailSegment(`level-${level}-back-rail`, [21.5, 1.18, 0.08], [0, railY, -9.95]);
  addRailSegment(`level-${level}-front-left-rail`, [5.4, 1.18, 0.08], [-8.65, railY, 10.6]);
  addRailSegment(`level-${level}-front-right-rail`, [5.4, 1.18, 0.08], [8.65, railY, 10.6]);
  meshBox(`level-${level}-left-fascia`, [0.15, 0.38, 20.1], [-10.78, y - 0.23, 0], materials.darkMetal);
  meshBox(`level-${level}-right-fascia`, [0.15, 0.38, 20.1], [10.78, y - 0.23, 0], materials.darkMetal);
  meshBox(`level-${level}-back-fascia`, [21.6, 0.38, 0.15], [0, y - 0.23, -9.98], materials.darkMetal);

  for (const x of [-14.8, 14.8]) {
    for (const z of [-7.5, 0, 7.5]) {
      meshBox(
        `level-${level}-ceiling-strip-${x}-${z}`,
        [3.1, 0.07, 0.12],
        [x, y - 0.36, z],
        materials.whiteLight,
        false,
        false,
      );
    }
  }
}

// Architectural shell.
meshBox("ground-floor", [39, 0.45, 35], [0, -0.28, 0], materials.stone, false, true);
meshBox("back-wall", [34.4, 22.5, 0.55], [0, 10.8, -15.55], materials.wall, false, true);
meshBox("left-wall", [0.55, 22.5, 31], [-17.15, 10.8, 0], materials.wall, false, true);
meshBox("right-wall", [0.55, 22.5, 31], [17.15, 10.8, 0], materials.wall, false, true);

for (const y of [5.1, 10.2, 15.3]) {
  addLevel(Math.round(y * 10), y);
}

for (const x of [-10.7, 10.7]) {
  for (const z of [-9.8, 9.6]) {
    meshBox(`column-${x}-${z}`, [0.72, 21.3, 0.72], [x, 10.4, z], materials.concrete);
    const collar = new THREE.Mesh(
      new THREE.CylinderGeometry(0.58, 0.58, 0.22, 24),
      materials.brass,
    );
    collar.position.set(x, 1.0, z);
    collar.castShadow = true;
    scene.add(collar);
  }
}

// Lower bridge is deliberately broad and low enough for the opening shot to pass beneath it.
meshBox("lower-bridge", [21.7, 0.72, 3.25], [0, 5.1, 0.1], materials.concrete);
meshBox("lower-bridge-underside", [21.3, 0.06, 2.95], [0, 4.71, 0.1], materials.concreteUnderside);
for (const x of [-7.2, 0, 7.2]) {
  meshBox(`lower-bridge-rib-${x}`, [0.18, 0.3, 3.2], [x, 4.57, 0.1], materials.darkMetal);
}
addRailSegment("lower-bridge-north-rail", [21.5, 1.22, 0.08], [0, 6.0, -1.5]);
addRailSegment("lower-bridge-south-rail", [21.5, 1.22, 0.08], [0, 6.0, 1.7]);

meshBox("upper-bridge", [3.1, 0.66, 20.3], [3.2, 10.2, 0], materials.concrete);
addRailSegment("upper-bridge-left-rail", [0.08, 1.18, 20.1], [1.7, 11.1, 0]);
addRailSegment("upper-bridge-right-rail", [0.08, 1.18, 20.1], [4.7, 11.1, 0]);

// Skylight and its gridded structure create a bright upper destination.
meshBox("skylight-pane", [34, 0.06, 29], [0, 21.72, 0], materials.window, false, false);
for (let x = -16; x <= 16; x += 4) {
  meshBox(`skylight-rib-x-${x}`, [0.13, 0.24, 29], [x, 21.82, 0], materials.darkMetal);
}
for (let z = -14; z <= 14; z += 4) {
  meshBox(`skylight-rib-z-${z}`, [34, 0.24, 0.13], [0, 21.82, z], materials.darkMetal);
}
for (const x of [-16.55, 16.55]) {
  for (const z of [-13.8, -4.6, 4.6, 13.8]) {
    meshBox(`clerestory-${x}-${z}`, [0.08, 3.25, 8.5], [x, 19.45, z], materials.window, false, false);
  }
}

// Glazed elevator shaft and deterministic moving cabin.
const elevator = new THREE.Group();
elevator.name = "glass-elevator";
scene.add(elevator);
const shaftGlass = new THREE.Mesh(new THREE.BoxGeometry(3.1, 20.2, 3.1), materials.darkGlass);
shaftGlass.position.set(-13.4, 10.0, -12.5);
shaftGlass.castShadow = false;
scene.add(shaftGlass);
for (const x of [-14.85, -11.95]) {
  for (const z of [-13.95, -11.05]) {
    meshBox(`elevator-frame-${x}-${z}`, [0.12, 20.5, 0.12], [x, 10.1, z], materials.darkMetal);
  }
}
const liftCabin = new THREE.Mesh(new THREE.BoxGeometry(2.55, 2.45, 2.55), materials.brass);
liftCabin.castShadow = true;
elevator.add(liftCabin);

// A stepped escalator gives the ground level a recognizable circulation element.
for (let i = 0; i < 13; i += 1) {
  const stepY = 0.12 + i * 0.37;
  const stepZ = 8.1 - i * 0.56;
  meshBox(`escalator-step-${i}`, [2.2, 0.18, 0.63], [12.0, stepY, stepZ], materials.darkMetal);
}
for (const x of [10.78, 13.22]) {
  const side = meshBox("escalator-side", [0.09, 0.56, 8.4], [x, 2.35, 4.75], materials.glass, false, false);
  side.rotation.x = -Math.atan2(4.5, 7.3);
}

// Central installation: intertwined metallic ribbons, suspended forms, and luminous rings.
const installation = new THREE.Group();
installation.name = "central-installation";
scene.add(installation);

const plinth = new THREE.Mesh(new THREE.CylinderGeometry(4.55, 4.85, 0.7, 64), materials.cream);
plinth.position.y = 0.15;
plinth.receiveShadow = true;
plinth.castShadow = true;
installation.add(plinth);
const plinthBand = new THREE.Mesh(new THREE.TorusGeometry(4.66, 0.11, 12, 96), materials.brass);
plinthBand.rotation.x = Math.PI / 2;
plinthBand.position.y = 0.43;
installation.add(plinthBand);

function makeHelix(phase, radius, height, turns, material, tubeRadius) {
  const points = [];
  for (let i = 0; i <= 120; i += 1) {
    const p = i / 120;
    const angle = phase + p * Math.PI * 2 * turns;
    const r = radius * (0.88 + 0.16 * Math.sin(p * Math.PI));
    points.push(new THREE.Vector3(Math.cos(angle) * r, 0.55 + p * height, Math.sin(angle) * r));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 240, tubeRadius, 12, false),
    material,
  );
  mesh.castShadow = true;
  installation.add(mesh);
}

makeHelix(0.15, 2.2, 10.7, 1.75, materials.brass, 0.23);
makeHelix(Math.PI, 2.65, 10.0, 1.62, materials.tealMetal, 0.18);
makeHelix(Math.PI * 0.55, 1.25, 8.8, 1.45, materials.darkMetal, 0.11);

const kineticRings = new THREE.Group();
installation.add(kineticRings);
[
  [3.15, 1.9, 0.13, materials.brass],
  [5.9, 2.15, 0.11, materials.tealMetal],
  [8.55, 1.65, 0.1, materials.brass],
].forEach(([y, radius, tube, material], index) => {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 16, 96), material);
  ring.name = `kinetic-ring-${index}`;
  ring.position.y = y;
  ring.rotation.set(Math.PI / 2.8, index * 0.8, index * 0.45);
  ring.castShadow = true;
  kineticRings.add(ring);
});

const suspendedOrbs = [];
for (let i = 0; i < 11; i += 1) {
  const angle = i * 2.39996;
  const radius = 1.0 + (i % 4) * 0.7;
  const orb = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.25 + (i % 3) * 0.08, 2),
    i % 2 === 0 ? materials.brass : materials.tealMetal,
  );
  orb.position.set(
    Math.cos(angle) * radius,
    2.2 + i * 0.82,
    Math.sin(angle) * radius,
  );
  orb.userData.baseY = orb.position.y;
  orb.userData.phase = angle;
  orb.castShadow = true;
  installation.add(orb);
  suspendedOrbs.push(orb);
}

const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(0.9, 3), materials.whiteLight);
crown.position.y = 11.7;
crown.castShadow = true;
installation.add(crown);

// Furnishings, plants, and people make scale legible from every elevation.
function addBench(x, z, rotation = 0) {
  const group = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.18, 0.75), materials.oak);
  seat.position.y = 0.64;
  seat.castShadow = true;
  group.add(seat);
  for (const legX of [-1.05, 1.05]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.55), materials.darkMetal);
    leg.position.set(legX, 0.32, 0);
    leg.castShadow = true;
    group.add(leg);
  }
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  scene.add(group);
}

addBench(-7.7, 8.0, Math.PI / 2);
addBench(7.8, -7.7, 0);
addBench(-6.2, -11.4, 0);
addBench(13.9, 7.2, Math.PI / 2);

function addPlanter(x, y, z, scale = 1) {
  const pot = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65 * scale, 0.48 * scale, 0.75 * scale, 24),
    materials.darkMetal,
  );
  pot.position.set(x, y + 0.38 * scale, z);
  pot.castShadow = true;
  scene.add(pot);
  const leaves = new THREE.Group();
  for (let i = 0; i < 8; i += 1) {
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.38 * scale, 16, 12),
      materials.foliage,
    );
    const a = (i / 8) * Math.PI * 2;
    leaf.scale.set(0.55, 1.35, 0.42);
    leaf.position.set(
      x + Math.cos(a) * 0.34 * scale,
      y + (0.95 + (i % 3) * 0.17) * scale,
      z + Math.sin(a) * 0.34 * scale,
    );
    leaf.rotation.z = Math.cos(a) * 0.55;
    leaf.rotation.x = Math.sin(a) * 0.55;
    leaf.castShadow = true;
    leaves.add(leaf);
  }
  scene.add(leaves);
}

[
  [-9.2, 0, -7.5, 1.05],
  [9.2, 0, 7.4, 1.1],
  [-13.7, 5.45, 7.1, 0.82],
  [13.8, 10.55, -6.5, 0.8],
  [-8.4, 15.65, -12.2, 0.78],
].forEach((args) => addPlanter(...args));

const people = [];
function addPerson(x, y, z, color, rotation = 0) {
  const person = new THREE.Group();
  const bodyMaterial = color === "red" ? materials.red : color === "blue" ? materials.blue : materials.darkMetal;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.23, 0.75, 5, 12), bodyMaterial);
  body.position.y = 0.82;
  body.castShadow = true;
  person.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), materials.cream);
  head.position.y = 1.58;
  head.castShadow = true;
  person.add(head);
  person.position.set(x, y, z);
  person.rotation.y = rotation;
  person.userData.base = new THREE.Vector3(x, y, z);
  person.userData.phase = x * 0.7 + z * 0.31;
  scene.add(person);
  people.push(person);
}

[
  [-7.0, 0, 4.5, "red", 0.5],
  [8.4, 0, -4.0, "blue", -0.7],
  [0.2, 5.46, 0.1, "blue", 1.5],
  [-13.6, 5.46, 2.8, "red", 0.2],
  [13.7, 10.56, 5.8, "blue", -1.8],
  [-5.8, 10.56, -12.4, "red", 0.7],
  [6.5, 15.66, -12.4, "blue", -0.4],
  [-13.6, 15.66, -1.4, "red", 1.1],
].forEach((args) => addPerson(...args));

// Abstract exhibition panels are modeled objects rather than screen overlays.
for (const [x, y, color] of [
  [-8.2, 3.0, materials.red],
  [-4.9, 3.0, materials.blue],
  [6.0, 8.0, materials.brass],
  [9.0, 8.0, materials.tealMetal],
  [-4.6, 13.0, materials.blue],
  [0.0, 13.0, materials.red],
]) {
  meshBox(`gallery-panel-${x}-${y}`, [2.35, 2.9, 0.12], [x, y, -15.18], color, false, false);
  meshBox(`gallery-panel-frame-${x}-${y}`, [2.6, 3.15, 0.08], [x, y, -15.27], materials.darkMetal, false, false);
  meshBox(`gallery-panel-face-${x}-${y}`, [2.28, 2.82, 0.07], [x, y, -15.09], color, false, false);
}

// Soft pools under the installation and furnishings deepen contact with the floor.
const shadowMaterial = new THREE.MeshBasicMaterial({
  color: 0x2b3540,
  transparent: true,
  opacity: 0.12,
  depthWrite: false,
});
const installationShadow = new THREE.Mesh(new THREE.CircleGeometry(5.15, 64), shadowMaterial);
installationShadow.rotation.x = -Math.PI / 2;
installationShadow.position.y = -0.045;
scene.add(installationShadow);

// Lighting favors daylight while retaining warm interior contrast.
const hemisphere = new THREE.HemisphereLight(0xd9efff, 0x706457, 2.0);
hemisphere.intensity = 1.55;
scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xfff2d5, 3.4);
sun.position.set(-10, 25, 11);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -23;
sun.shadow.camera.right = 23;
sun.shadow.camera.top = 23;
sun.shadow.camera.bottom = -23;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 60;
sun.shadow.bias = -0.0003;
scene.add(sun);
scene.add(sun.target);
const warmFill = new THREE.PointLight(0xffc977, 650, 32, 2);
warmFill.position.set(0, 13.5, -7);
scene.add(warmFill);
const lowerFill = new THREE.PointLight(0x8fd2dc, 360, 22, 2);
lowerFill.position.set(2, 5, 8);
scene.add(lowerFill);

const cameraPath = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(8.5, 2.05, 8.9),
    new THREE.Vector3(7.3, 2.12, 5.9),
    new THREE.Vector3(7.0, 2.28, 1.15),
    new THREE.Vector3(5.6, 3.85, -5.7),
    new THREE.Vector3(-1.6, 6.8, -8.7),
    new THREE.Vector3(-7.0, 9.7, -8.6),
    new THREE.Vector3(-2.0, 12.8, -8.4),
    new THREE.Vector3(6.8, 13.7, -7.3),
    new THREE.Vector3(9.1, 13.9, -0.8),
    new THREE.Vector3(11.2, 17.3, 4.8),
    new THREE.Vector3(10.2, 19.15, 8.8),
  ],
  false,
  "catmullrom",
  0.38,
);

function smoothstep(edge0, edge1, value) {
  const p = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return p * p * (3 - 2 * p);
}

function setCamera(time) {
  const normalized = THREE.MathUtils.clamp(time / DURATION, 0, 1);
  const travel = smoothstep(0, 1, normalized);
  cameraPath.getPointAt(travel, camera.position);

  const rise = smoothstep(0.22, 0.82, travel);
  const finale = smoothstep(0.72, 1, travel);
  const target = new THREE.Vector3(
    THREE.MathUtils.lerp(0.0, -0.6, finale),
    THREE.MathUtils.lerp(3.7, 8.3, rise),
    THREE.MathUtils.lerp(0.0, -1.6, finale),
  );
  camera.lookAt(target);
  camera.rotateZ(0.008 * Math.sin(travel * Math.PI * 2));
  camera.fov = THREE.MathUtils.lerp(63, 70, smoothstep(0.68, 1, travel));
  camera.updateProjectionMatrix();
}

function updateScene(time) {
  setCamera(time);
  kineticRings.children.forEach((ring, index) => {
    ring.rotation.y = index * 0.8 + time * (0.13 + index * 0.025);
    ring.rotation.z = index * 0.45 + Math.sin(time * 0.55 + index) * 0.18;
  });
  suspendedOrbs.forEach((orb) => {
    orb.position.y = orb.userData.baseY + Math.sin(time * 1.1 + orb.userData.phase) * 0.12;
    orb.rotation.x = time * 0.18 + orb.userData.phase;
    orb.rotation.y = time * 0.24 - orb.userData.phase;
  });
  crown.rotation.y = time * 0.16;
  crown.rotation.z = time * 0.09;
  liftCabin.position.set(-13.4, 2.0 + 14.1 * (0.5 - 0.5 * Math.cos((time / DURATION) * Math.PI)), -12.5);
  people.forEach((person) => {
    person.position.y = person.userData.base.y + Math.sin(time * 1.8 + person.userData.phase) * 0.012;
  });
}

let animationFrame = 0;
let playing = true;
let currentTime = 0;
let playStart = performance.now();

function renderAt(time) {
  currentTime = THREE.MathUtils.clamp(Number(time) || 0, 0, DURATION);
  updateScene(currentTime);
  renderer.render(scene, camera);
}

function tick(now) {
  if (!playing) {
    return;
  }
  const elapsed = (now - playStart) / 1000;
  renderAt(elapsed % DURATION);
  animationFrame = requestAnimationFrame(tick);
}

function cameraState() {
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

window.reconstruction = {
  pause() {
    playing = false;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    renderAt(currentTime);
  },
  seek(seconds) {
    playing = false;
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
      animationFrame = 0;
    }
    renderAt(seconds);
  },
  getCameraState: cameraState,
  getMetadata() {
    return { width: WIDTH, height: HEIGHT, fps: FPS, frames: FRAMES, duration: DURATION };
  },
};

renderAt(0);
playStart = performance.now();
animationFrame = requestAnimationFrame(tick);
window.__RECONSTRUCTION_READY__ = true;
