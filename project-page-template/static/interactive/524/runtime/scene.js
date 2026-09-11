import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAMES = 124;
const DURATION = FRAMES / FPS;

const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance'
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.13;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9c5cf);
scene.fog = new THREE.Fog(0xb9c5cf, 15, 29);

const camera = new THREE.PerspectiveCamera(38, WIDTH / HEIGHT, 0.05, 45);
camera.rotation.order = 'YXZ';

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};
const smoother = (value) => {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const lerp = (a, b, t) => a + (b - a) * t;

function box(width, height, depth, material) { window.__bfTrace?.add(43);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinderBetween(start, end, radius, material, radialSegments = 12) { window.__bfTrace?.add(50);
  const direction = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), radialSegments),
    material
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

const materials = {
  walnut: new THREE.MeshPhysicalMaterial({
    color: 0x5e3424,
    roughness: 0.34,
    metalness: 0.03,
    clearcoat: 0.32,
    clearcoatRoughness: 0.42
  }),
  walnutEdge: new THREE.MeshStandardMaterial({ color: 0x2b1813, roughness: 0.48 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xdce1e2, roughness: 0.88 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x728087, roughness: 0.7 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xaec5d2, roughness: 0.13, metalness: 0.92 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x26353d, roughness: 0.22, metalness: 0.78 }),
  bridge: new THREE.MeshStandardMaterial({ color: 0xc39155, roughness: 0.46, metalness: 0.02 }),
  bridgeEdge: new THREE.MeshStandardMaterial({ color: 0x6d4529, roughness: 0.52 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x192126, roughness: 0.68 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc28a2f, roughness: 0.25, metalness: 0.66 }),
  red: new THREE.MeshPhysicalMaterial({
    color: 0xb92f2a, roughness: 0.27, metalness: 0.03, clearcoat: 0.24, clearcoatRoughness: 0.4
  }),
  ivory: new THREE.MeshPhysicalMaterial({
    color: 0xf1dec0, roughness: 0.3, metalness: 0.01, clearcoat: 0.2, clearcoatRoughness: 0.45
  }),
  teal: new THREE.MeshPhysicalMaterial({
    color: 0x137d82, roughness: 0.27, metalness: 0.03, clearcoat: 0.25, clearcoatRoughness: 0.38
  }),
  cobalt: new THREE.MeshPhysicalMaterial({
    color: 0x245f9d, roughness: 0.26, metalness: 0.03, clearcoat: 0.25, clearcoatRoughness: 0.38
  }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xf0aa28, roughness: 0.23, metalness: 0.22 }),
  black: new THREE.MeshStandardMaterial({ color: 0x15191c, roughness: 0.35 }),
  white: new THREE.MeshStandardMaterial({ color: 0xeeeeea, roughness: 0.42 }),
  plant: new THREE.MeshStandardMaterial({ color: 0x2f6747, roughness: 0.76 }),
  pot: new THREE.MeshStandardMaterial({ color: 0xb65e3c, roughness: 0.65 })
};

// Modern studio environment.
const tabletop = box(18, 0.48, 9, materials.walnut);
tabletop.position.set(0, -0.26, 0);
scene.add(tabletop);

const tableInlay = box(17.6, 0.025, 8.6, new THREE.MeshStandardMaterial({
  color: 0x754a34,
  roughness: 0.31,
  metalness: 0.02
}));
tableInlay.position.y = -0.006;
tableInlay.receiveShadow = true;
scene.add(tableInlay);

const frontEdge = box(18.05, 0.35, 0.16, materials.walnutEdge);
frontEdge.position.set(0, -0.19, 4.48);
scene.add(frontEdge);

const backWall = box(22, 9, 0.25, materials.wall);
backWall.position.set(0, 3.0, -5.0);
backWall.receiveShadow = true;
scene.add(backWall);

const floor = box(24, 0.2, 11, materials.floor);
floor.position.set(0, -2.25, -0.7);
floor.receiveShadow = true;
scene.add(floor);

const skyMaterial = new THREE.MeshBasicMaterial({ color: 0x91b9cf });
const windowPane = box(10.5, 4.0, 0.04, skyMaterial);
windowPane.position.set(1.3, 3.45, -4.84);
scene.add(windowPane);
for (const x of [-3.95, -1.3, 1.3, 3.95, 6.55]) {
  const mullion = box(0.09, 4.15, 0.08, materials.darkSteel);
  mullion.position.set(x, 3.45, -4.76);
  scene.add(mullion);
}
for (const y of [1.5, 3.45, 5.4]) {
  const mullion = box(10.65, 0.09, 0.08, materials.darkSteel);
  mullion.position.set(1.3, y, -4.76);
  scene.add(mullion);
}

// A restrained plant and lamp make the laboratory tabletop read as a real room.
const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.29, 0.7, 20), materials.pot);
pot.position.set(-7.6, 0.34, -3.55);
pot.castShadow = true;
scene.add(pot);
for (let i = 0; i < 7; i += 1) {
  const angle = -1.1 + i * 0.35;
  const stemStart = new THREE.Vector3(-7.6, 0.68, -3.55);
  const stemEnd = new THREE.Vector3(
    -7.6 + Math.sin(angle) * (0.45 + (i % 2) * 0.12),
    1.65 + (i % 3) * 0.14,
    -3.55 + Math.cos(angle) * 0.28
  );
  scene.add(cylinderBetween(stemStart, stemEnd, 0.025, materials.plant, 8));
  const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), materials.plant);
  leaf.scale.set(0.65, 1.55, 0.28);
  leaf.position.copy(stemEnd);
  leaf.rotation.z = -angle * 0.5;
  leaf.castShadow = true;
  scene.add(leaf);
}

const lampStem = cylinderBetween(
  new THREE.Vector3(7.9, 0.0, -3.55),
  new THREE.Vector3(7.9, 2.8, -3.55),
  0.06,
  materials.darkSteel
);
scene.add(lampStem);
const lampShade = new THREE.Mesh(
  new THREE.CylinderGeometry(0.22, 0.58, 0.55, 24, 1, true),
  new THREE.MeshStandardMaterial({ color: 0x2d555d, roughness: 0.3, side: THREE.DoubleSide })
);
lampShade.position.set(7.9, 2.75, -3.55);
lampShade.castShadow = true;
scene.add(lampShade);

// Path centerline stays monotonic in x so bridge elevation remains unambiguous.
const pathCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-7.25, 0, 2.35),
  new THREE.Vector3(-6.15, 0, 1.35),
  new THREE.Vector3(-4.9, 0, 1.05),
  new THREE.Vector3(-3.65, 0, 1.75),
  new THREE.Vector3(-2.35, 0, 1.25),
  new THREE.Vector3(-1.25, 0, 0.25),
  new THREE.Vector3(0.15, 0, -0.05),
  new THREE.Vector3(1.55, 0, -0.18),
  new THREE.Vector3(2.75, 0, -0.78),
  new THREE.Vector3(4.38, 0, -1.08)
], false, 'catmullrom', 0.35);

function bridgeSurfaceY(x) { window.__bfTrace?.add(196);
  if (x <= -1.35 || x >= 2.75) return 0.025;
  if (x < -0.3) return lerp(0.025, 0.96, (x + 1.35) / 1.05);
  if (x <= 1.65) return 0.96;
  return lerp(0.96, 0.025, (x - 1.65) / 1.1);
}

function pathPoint(u) { window.__bfTrace?.add(203);
  const p = pathCurve.getPointAt(clamp01(u));
  p.y = bridgeSurfaceY(p.x);
  return p;
}

function pathTangent(u) { window.__bfTrace?.add(209);
  const p0 = pathPoint(Math.max(0, u - 0.002));
  const p1 = pathPoint(Math.min(1, u + 0.002));
  return p1.sub(p0).normalize();
}

// Bridge deck: timber approaches, raised center, steel piers, and guard rails.
function slopedDeck(start, end, z, width) { window.__bfTrace?.add(216);
  const rise = end.y - start.y;
  const run = end.x - start.x;
  const length = Math.hypot(run, rise);
  const deck = box(length, 0.13, width, materials.bridge);
  deck.position.set((start.x + end.x) / 2, (start.y + end.y) / 2 - 0.03, z);
  deck.rotation.z = Math.atan2(rise, run);
  scene.add(deck);

  for (const side of [-1, 1]) {
    const rail = box(length, 0.11, 0.07, materials.bridgeEdge);
    rail.position.copy(deck.position);
    rail.position.y += 0.08;
    rail.position.z += side * (width * 0.47);
    rail.rotation.z = deck.rotation.z;
    scene.add(rail);
  }

  const jointCount = Math.max(3, Math.round(length / 0.28));
  for (let joint = 1; joint < jointCount; joint += 1) {
    const ratio = joint / jointCount;
    const seam = box(0.026, 0.025, width * 0.88, materials.bridgeEdge);
    seam.position.set(
      lerp(start.x, end.x, ratio),
      lerp(start.y, end.y, ratio) + 0.045,
      z
    );
    seam.rotation.z = deck.rotation.z;
    scene.add(seam);
  }
}

slopedDeck(
  new THREE.Vector2(-1.4, -0.01),
  new THREE.Vector2(-0.25, 0.92),
  0.04,
  1.35
);
slopedDeck(
  new THREE.Vector2(-0.25, 0.99),
  new THREE.Vector2(1.68, 0.99),
  -0.1,
  1.35
);
slopedDeck(
  new THREE.Vector2(1.68, 0.92),
  new THREE.Vector2(2.8, -0.01),
  -0.43,
  1.35
);

for (const x of [-0.2, 0.75, 1.65]) {
  const z = pathCurve.getPointAt((x + 7.25) / 11.63).z;
  const left = cylinderBetween(
    new THREE.Vector3(x, 0, z - 0.48),
    new THREE.Vector3(x, 0.92, z - 0.48),
    0.055,
    materials.darkSteel
  );
  const right = left.clone();
  right.position.z += 0.96;
  scene.add(left, right);
  const cross = box(0.08, 0.08, 1.05, materials.darkSteel);
  cross.position.set(x, 0.46, z);
  cross.rotation.z = Math.PI / 4;
  scene.add(cross);
}

const dominoMaterials = [materials.ivory, materials.teal, materials.cobalt, materials.red];
const DOMINO_COUNT = 62;
const dominos = [];
const dominoShape = new THREE.Shape();
dominoShape.moveTo(-0.18, -0.44);
dominoShape.lineTo(0.18, -0.44);
dominoShape.quadraticCurveTo(0.22, -0.44, 0.22, -0.4);
dominoShape.lineTo(0.22, 0.4);
dominoShape.quadraticCurveTo(0.22, 0.44, 0.18, 0.44);
dominoShape.lineTo(-0.18, 0.44);
dominoShape.quadraticCurveTo(-0.22, 0.44, -0.22, 0.4);
dominoShape.lineTo(-0.22, -0.4);
dominoShape.quadraticCurveTo(-0.22, -0.44, -0.18, -0.44);
const dominoGeometry = new THREE.ExtrudeGeometry(dominoShape, {
  depth: 0.145,
  steps: 1,
  bevelEnabled: true,
  bevelThickness: 0.012,
  bevelSize: 0.012,
  bevelSegments: 2,
  curveSegments: 3
});
dominoGeometry.translate(0, 0, -0.0725);
dominoGeometry.rotateY(Math.PI / 2);
const pipGeometry = new THREE.CylinderGeometry(0.035, 0.035, 0.018, 12);
pipGeometry.rotateZ(Math.PI / 2);

for (let i = 0; i < DOMINO_COUNT; i += 1) {
  const u = i / (DOMINO_COUNT - 1);
  const point = pathPoint(u);
  const tangent = pathTangent(u);
  const pivot = new THREE.Group();
  pivot.position.copy(point);
  pivot.rotation.order = 'YZX';
  pivot.rotation.y = -Math.atan2(tangent.z, tangent.x);

  const segment = Math.min(3, Math.floor(u * 4));
  const body = new THREE.Mesh(dominoGeometry, dominoMaterials[segment]);
  body.position.y = 0.44;
  body.castShadow = true;
  body.receiveShadow = true;
  pivot.add(body);

  const divider = box(0.018, 0.018, 0.3, materials.black);
  divider.position.set(0.084, 0.44, 0);
  pivot.add(divider);

  const pipLayout = i % 3 === 0
    ? [[0, 0], [-0.13, 0.11], [0.13, -0.11]]
    : [[-0.15, -0.1], [0.15, 0.1]];
  for (const [py, pz] of pipLayout) {
    const pip = new THREE.Mesh(pipGeometry, materials.black);
    pip.position.set(0.081, 0.44 + py, pz);
    pip.castShadow = true;
    pivot.add(pip);
  }

  scene.add(pivot);
  dominos.push(pivot);
}

// Steel ball lane and a clearly visible lever/fulcrum assembly.
const laneStart = new THREE.Vector3(4.72, 0.04, -1.08);
const laneEnd = new THREE.Vector3(5.76, 0.04, -1.08);
for (const dz of [-0.31, 0.31]) {
  const rail = cylinderBetween(
    new THREE.Vector3(4.48, 0.10, laneStart.z + dz),
    new THREE.Vector3(5.83, 0.10, laneStart.z + dz),
    0.035,
    materials.brass
  );
  scene.add(rail);
}
for (const x of [4.56, 5.13, 5.7]) {
  const tie = box(0.08, 0.06, 0.78, materials.darkSteel);
  tie.position.set(x, 0.055, laneStart.z);
  scene.add(tie);
}

const ballGroup = new THREE.Group();
const ball = new THREE.Mesh(new THREE.SphereGeometry(0.29, 32, 20), materials.steel);
ball.castShadow = true;
ball.receiveShadow = true;
ballGroup.add(ball);
const ballBand = new THREE.Mesh(new THREE.TorusGeometry(0.292, 0.018, 8, 28), materials.darkSteel);
ballBand.rotation.y = Math.PI / 2;
ballGroup.add(ballBand);
scene.add(ballGroup);

const leverPivot = new THREE.Vector3(6.12, 0.37, -1.08);
const leverGroup = new THREE.Group();
leverGroup.position.copy(leverPivot);
const leverBeam = box(1.36, 0.14, 0.24, materials.yellow);
leverBeam.position.x = -0.05;
leverGroup.add(leverBeam);
const leverEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.28, 18), materials.red);
leverEnd.rotation.x = Math.PI / 2;
leverEnd.position.x = -0.71;
leverGroup.add(leverEnd);
scene.add(leverGroup);

const fulcrumGeometry = new THREE.BufferGeometry();
fulcrumGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
  -0.34, 0, -0.2, 0.34, 0, -0.2, 0, 0.42, -0.2,
  -0.34, 0, 0.2, 0.34, 0, 0.2, 0, 0.42, 0.2
], 3));
fulcrumGeometry.setIndex([
  0, 2, 1, 3, 4, 5,
  0, 1, 4, 0, 4, 3,
  1, 2, 5, 1, 5, 4,
  2, 0, 3, 2, 3, 5
]);
fulcrumGeometry.computeVertexNormals();
const fulcrum = new THREE.Mesh(fulcrumGeometry, materials.darkSteel);
fulcrum.position.set(leverPivot.x, 0.01, leverPivot.z);
fulcrum.castShadow = true;
fulcrum.receiveShadow = true;
scene.add(fulcrum);
const leverAxle = cylinderBetween(
  new THREE.Vector3(leverPivot.x, leverPivot.y, leverPivot.z - 0.3),
  new THREE.Vector3(leverPivot.x, leverPivot.y, leverPivot.z + 0.3),
  0.085,
  materials.brass,
  18
);
scene.add(leverAxle);

// Finish flag, slider, and cord create a concrete final consequence.
const poleX = 7.2;
const poleZ = -1.08;
const pole = cylinderBetween(
  new THREE.Vector3(poleX, 0.02, poleZ),
  new THREE.Vector3(poleX, 3.25, poleZ),
  0.055,
  materials.darkSteel
);
scene.add(pole);
const poleBase = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.52, 0.16, 24), materials.darkSteel);
poleBase.position.set(poleX, 0.08, poleZ);
poleBase.castShadow = true;
scene.add(poleBase);

const flagGroup = new THREE.Group();
const flagWidth = 1.34;
const flagHeight = 0.88;
const columns = 6;
const rows = 4;
for (let row = 0; row < rows; row += 1) {
  for (let col = 0; col < columns; col += 1) {
    const square = box(
      flagWidth / columns + 0.006,
      flagHeight / rows + 0.006,
      0.035,
      (row + col) % 2 === 0 ? materials.white : materials.black
    );
    square.position.set(
      (col + 0.5) * flagWidth / columns,
      -(row + 0.5) * flagHeight / rows,
      0
    );
    flagGroup.add(square);
  }
}
const flagSlider = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.18, 16), materials.red);
flagSlider.rotation.z = Math.PI / 2;
flagSlider.position.set(0, 0, 0);
flagGroup.add(flagSlider);
scene.add(flagGroup);

const cordGeometry = new THREE.BufferGeometry();
const cordPositions = new Float32Array(6);
cordGeometry.setAttribute('position', new THREE.BufferAttribute(cordPositions, 3));
const cord = new THREE.Line(
  cordGeometry,
  new THREE.LineBasicMaterial({ color: 0xc63b2f, linewidth: 2 })
);
scene.add(cord);

// Lighting is broad and plausible, with a camera-following fill for clear causal action.
scene.add(new THREE.HemisphereLight(0xd9ecf4, 0x3b2a22, 1.75));
const keyLight = new THREE.DirectionalLight(0xfff3db, 3.2);
keyLight.position.set(-3.5, 8.5, 6.5);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -11;
keyLight.shadow.camera.right = 11;
keyLight.shadow.camera.top = 8;
keyLight.shadow.camera.bottom = -6;
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 22;
keyLight.shadow.bias = -0.00025;
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x8ac8e8, 14, 12, 2);
rimLight.position.set(4.8, 3.8, -2.6);
scene.add(rimLight);

const fillLight = new THREE.SpotLight(0xffd8ab, 32, 11, Math.PI / 5.5, 0.6, 1.4);
fillLight.castShadow = false;
fillLight.target = new THREE.Object3D();
scene.add(fillLight, fillLight.target);

let currentTime = 0;
let animationFrame = 0;
let playing = true;
let playStart = performance.now();

function updateScene(time) { window.__bfTrace?.add(491);
  const t = Math.max(0, Math.min(DURATION, Number.isFinite(time) ? time : 0));
  currentTime = t;

  for (let i = 0; i < dominos.length; i += 1) {
    const start = 0.14 + i * 0.0525;
    const fall = smoother((t - start) / 0.245);
    dominos[i].rotation.z = -fall * 1.43;
  }

  const ballTravel = smoother((t - 3.43) / 0.82);
  ballGroup.position.set(
    lerp(laneStart.x, laneEnd.x, ballTravel),
    0.32,
    laneStart.z
  );
  ballGroup.rotation.z = -(laneEnd.x - laneStart.x) * ballTravel / 0.29;

  const leverMotion = smooth((t - 3.72) / 0.48);
  leverGroup.rotation.z = lerp(0.15, -0.66, leverMotion);

  const flagDrop = smoother((t - 4.03) / 0.82);
  const flagY = lerp(2.96, 0.96, flagDrop);
  flagGroup.position.set(poleX + 0.07, flagY, poleZ);
  flagGroup.rotation.z = Math.sin(flagDrop * Math.PI) * 0.035;

  const localEnd = new THREE.Vector3(0.63, 0, 0).applyEuler(leverGroup.rotation).add(leverPivot);
  cordPositions[0] = localEnd.x;
  cordPositions[1] = localEnd.y;
  cordPositions[2] = localEnd.z;
  cordPositions[3] = poleX - 0.05;
  cordPositions[4] = flagY + 0.1;
  cordPositions[5] = poleZ;
  cordGeometry.attributes.position.needsUpdate = true;

  let active;
  if (t <= 3.36) {
    active = pathPoint(clamp01((t - 0.08) / 3.28));
  } else {
    const mechanismProgress = smooth((t - 3.36) / 1.64);
    active = new THREE.Vector3(
      lerp(4.38, 6.85, mechanismProgress),
      lerp(0.25, 0.7, mechanismProgress),
      poleZ
    );
  }

  const travel = smooth(t / DURATION);
  const mechanismReveal = smooth((t - 2.75) / 0.85);
  const cameraX = active.x + lerp(1.52, 0.88, travel);
  const cameraY = 3.02 + 0.26 * Math.sin(travel * Math.PI) + 0.1 * mechanismReveal;
  const cameraZ = active.z + lerp(5.62, 5.28, travel);
  camera.position.set(cameraX, cameraY, cameraZ);
  const lookTarget = new THREE.Vector3(
    active.x + lerp(-0.24, 0.18, mechanismReveal),
    Math.max(0.48, active.y + 0.34) + 0.12 * mechanismReveal,
    active.z - 0.12
  );
  camera.lookAt(lookTarget);
  camera.fov = lerp(42.2, 40.6, travel) + 1.1 * mechanismReveal;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  fillLight.position.copy(camera.position).add(new THREE.Vector3(-0.6, 1.1, -0.5));
  fillLight.target.position.copy(lookTarget);
  fillLight.target.updateMatrixWorld(true);

  renderer.render(scene, camera);
}

function animate(now) { window.__bfTrace?.add(561);
  if (!playing) return;
  const elapsed = (now - playStart) / 1000;
  updateScene(elapsed % DURATION);
  animationFrame = requestAnimationFrame(animate);
}

function pause() { window.__bfTrace?.add(568);
  playing = false;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
}

function seek(seconds) { window.__bfTrace?.add(574);
  pause();
  updateScene(Number(seconds));
}

function getCameraState() { window.__bfTrace?.add(579);
  camera.updateMatrixWorld(true);
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov
  };
}

window.reconstruction = {
  pause,
  seek,
  getCameraState,
  getTime: () => currentTime,
  metadata: { width: WIDTH, height: HEIGHT, fps: FPS, frames: FRAMES, duration: DURATION }
};

updateScene(0);
window.sceneReady = true;
animationFrame = requestAnimationFrame(animate);
