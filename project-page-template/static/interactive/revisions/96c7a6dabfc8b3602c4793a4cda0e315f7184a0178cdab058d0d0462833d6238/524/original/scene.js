import * as THREE from './vendor/three.module.js';
import RAPIER from './vendor/rapier.mjs';

await RAPIER.init();

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAMES = 124;
const DURATION = FRAMES / FPS;
const FIXED_DT = 1 / 240;

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
renderer.toneMappingExposure = 1.03;
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

function box(width, height, depth, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function cylinderBetween(start, end, radius, material, radialSegments = 12) {
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
    roughness: 0.5,
    metalness: 0.03,
    clearcoat: 0.12,
    clearcoatRoughness: 0.58
  }),
  walnutEdge: new THREE.MeshStandardMaterial({ color: 0x2b1813, roughness: 0.48 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xdce1e2, roughness: 0.88 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x728087, roughness: 0.7 }),
  steel: new THREE.MeshStandardMaterial({ color: 0xc8d6dc, roughness: 0.22, metalness: 0.72 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x26353d, roughness: 0.22, metalness: 0.78 }),
  bridge: new THREE.MeshStandardMaterial({ color: 0xd0a066, roughness: 0.56, metalness: 0.01 }),
  bridgeEdge: new THREE.MeshStandardMaterial({ color: 0x654028, roughness: 0.64 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x192126, roughness: 0.68 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xc28a2f, roughness: 0.25, metalness: 0.66 }),
  red: new THREE.MeshPhysicalMaterial({
    color: 0xb92f2a, roughness: 0.34, metalness: 0.03, clearcoat: 0.17, clearcoatRoughness: 0.46
  }),
  ivory: new THREE.MeshPhysicalMaterial({
    color: 0xf1dec0, roughness: 0.36, metalness: 0.01, clearcoat: 0.15, clearcoatRoughness: 0.5
  }),
  teal: new THREE.MeshPhysicalMaterial({
    color: 0x137d82, roughness: 0.34, metalness: 0.03, clearcoat: 0.17, clearcoatRoughness: 0.46
  }),
  cobalt: new THREE.MeshPhysicalMaterial({
    color: 0x245f9d, roughness: 0.33, metalness: 0.03, clearcoat: 0.17, clearcoatRoughness: 0.46
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
  roughness: 0.46,
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
  new THREE.Vector3(-3.78, 0, 1.33),
  new THREE.Vector3(-3.01, 0, 0.63),
  new THREE.Vector3(-2.14, 0, 0.41),
  new THREE.Vector3(-1.25, 0, 0.91),
  new THREE.Vector3(-0.35, 0, 0.56),
  new THREE.Vector3(0.43, 0, -0.14),
  new THREE.Vector3(1.41, 0, -0.36),
  new THREE.Vector3(2.39, 0, -0.45),
  new THREE.Vector3(3.24, 0, -0.87),
  new THREE.Vector3(4.38, 0, -1.08)
], false, 'catmullrom', 0.35);

const BRIDGE_START = -0.1;
const BRIDGE_END = 3.41;
const BRIDGE_SPAN = BRIDGE_END - BRIDGE_START;

function bridgeSurfaceY(x) {
  if (x <= BRIDGE_START || x >= BRIDGE_END) return 0.025;
  const phase = (x - BRIDGE_START) / BRIDGE_SPAN;
  return 0.025 + 0.15 * Math.sin(Math.PI * phase) ** 2;
}

function bridgeSlope(x) {
  if (x <= BRIDGE_START || x >= BRIDGE_END) return 0;
  const phase = (x - BRIDGE_START) / BRIDGE_SPAN;
  return 0.15 * Math.PI / BRIDGE_SPAN * Math.sin(2 * Math.PI * phase);
}

function pathPoint(u) {
  const p = pathCurve.getPointAt(clamp01(u));
  p.y = bridgeSurfaceY(p.x);
  return p;
}

function physicsPathPoint(u) {
  const point = pathPoint(u);
  point.y -= 0.025;
  if (point.x > BRIDGE_START && point.x < BRIDGE_END) point.y += 0.018;
  return point;
}

function pathTangent(u) {
  const p0 = pathPoint(Math.max(0, u - 0.002));
  const p1 = pathPoint(Math.min(1, u + 0.002));
  return p1.sub(p0).normalize();
}

function pathOrientation(u) {
  const forward = pathTangent(u).setY(0).normalize();
  const up = new THREE.Vector3(0, 1, 0);
  const across = new THREE.Vector3().crossVectors(forward, up).normalize();
  const basis = new THREE.Matrix4().makeBasis(forward, up, across);
  return new THREE.Quaternion().setFromRotationMatrix(basis);
}

function pathPointAtX(x) {
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const middle = (low + high) / 2;
    if (pathCurve.getPointAt(middle).x < x) low = middle;
    else high = middle;
  }
  return pathPoint((low + high) / 2);
}

// Bridge deck: timber approaches, raised center, steel piers, and guard rails.
function slopedDeck(start, end, width) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  direction.normalize();
  const slope = bridgeSlope((start.x + end.x) / 2);
  const surfaceNormal = new THREE.Vector3(-slope, 1, 0).normalize();
  const across = new THREE.Vector3().crossVectors(direction, surfaceNormal).normalize();
  const normal = new THREE.Vector3().crossVectors(across, direction).normalize();
  const orientation = new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(direction, normal, across)
  );
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const deck = box(length, 0.13, width, materials.bridge);
  deck.position.copy(midpoint).addScaledVector(normal, -0.09);
  deck.quaternion.copy(orientation);
  scene.add(deck);

  for (const side of [-1, 1]) {
    const rail = box(length, 0.11, 0.07, materials.bridgeEdge);
    rail.position.copy(midpoint)
      .addScaledVector(normal, 0.015)
      .addScaledVector(across, side * width * 0.47);
    rail.quaternion.copy(orientation);
    scene.add(rail);
  }

  const jointCount = Math.max(3, Math.round(length / 0.28));
  for (let joint = 1; joint < jointCount; joint += 1) {
    const ratio = joint / jointCount;
    const seam = box(0.026, 0.025, width * 0.88, materials.bridgeEdge);
    seam.position.copy(start).lerp(end, ratio).addScaledVector(normal, -0.01);
    seam.quaternion.copy(orientation);
    scene.add(seam);
  }
}

const BRIDGE_SEGMENTS = 12;
for (let segment = 0; segment < BRIDGE_SEGMENTS; segment += 1) {
  const startX = BRIDGE_START + BRIDGE_SPAN * segment / BRIDGE_SEGMENTS;
  const endX = BRIDGE_START + BRIDGE_SPAN * (segment + 1) / BRIDGE_SEGMENTS;
  const start = pathPointAtX(startX);
  const end = pathPointAtX(endX);
  slopedDeck(start, end, 1.35);
}

for (const x of [1.2, 1.97, 2.69]) {
  const bridgePoint = pathPointAtX(x);
  const z = bridgePoint.z;
  const pierTop = bridgePoint.y - 0.04;
  const left = cylinderBetween(
    new THREE.Vector3(x, 0, z - 0.48),
    new THREE.Vector3(x, pierTop, z - 0.48),
    0.055,
    materials.darkSteel
  );
  const right = left.clone();
  right.position.z += 0.96;
  scene.add(left, right);
  const cross = box(0.08, 0.08, 1.05, materials.darkSteel);
  cross.position.set(x, pierTop / 2, z);
  cross.rotation.z = Math.PI / 4;
  scene.add(cross);
}

const dominoMaterials = [materials.ivory, materials.teal, materials.cobalt, materials.red];
const DOMINO_COUNT = 25;
const dominos = [];
const dominoShape = new THREE.Shape();
dominoShape.moveTo(-0.18, -0.58);
dominoShape.lineTo(0.18, -0.58);
dominoShape.quadraticCurveTo(0.22, -0.58, 0.22, -0.54);
dominoShape.lineTo(0.22, 0.54);
dominoShape.quadraticCurveTo(0.22, 0.58, 0.18, 0.58);
dominoShape.lineTo(-0.18, 0.58);
dominoShape.quadraticCurveTo(-0.22, 0.58, -0.22, 0.54);
dominoShape.lineTo(-0.22, -0.54);
dominoShape.quadraticCurveTo(-0.22, -0.58, -0.18, -0.58);
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
  const orientation = pathOrientation(u);
  const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(orientation);
  const supportPoint = physicsPathPoint(u);
  if (supportPoint.x > BRIDGE_START && supportPoint.x < BRIDGE_END) {
    const tread = box(0.22, 0.07, 0.54, materials.bridgeEdge);
    tread.position.set(supportPoint.x, supportPoint.y - 0.035, supportPoint.z);
    tread.quaternion.copy(orientation);
    scene.add(tread);
  }
  const pivot = new THREE.Group();
  pivot.position.copy(point).addScaledVector(normal, 0.58);
  pivot.quaternion.copy(orientation);

  const segment = Math.min(3, Math.floor(u * 4));
  const body = new THREE.Mesh(dominoGeometry, dominoMaterials[segment]);
  body.castShadow = true;
  body.receiveShadow = true;
  pivot.add(body);

  const divider = box(0.018, 0.018, 0.3, materials.black);
  divider.position.set(0.084, 0, 0);
  pivot.add(divider);

  const pipLayout = i % 3 === 0
    ? [[0, 0], [-0.13, 0.11], [0.13, -0.11]]
    : [[-0.15, -0.1], [0.15, 0.1]];
  for (const [py, pz] of pipLayout) {
    const pip = new THREE.Mesh(pipGeometry, materials.black);
    pip.position.set(0.081, py, pz);
    pip.castShadow = true;
    pivot.add(pip);
  }

  scene.add(pivot);
  dominos.push(pivot);
}

// Steel ball lane and a clearly visible lever/fulcrum assembly.
const LANE_SHELF_START_X = 4.78;
const LANE_RAMP_START_X = 5.28;
const LANE_RAMP_END_X = 5.55;
const LANE_RAMP_START_Y = 0.08;
const LANE_RAMP_END_Y = 0;
const BALL_RADIUS = 0.23;
const BALL_DENSITY = 300;
const LEVER_DENSITY = 160;
const LEVER_MIN_ANGLE = THREE.MathUtils.degToRad(-31);
const LEVER_MAX_ANGLE = THREE.MathUtils.degToRad(3);
const LATCH_RELEASE_ANGLE = THREE.MathUtils.degToRad(10);
const laneSurfaceY = (x) => lerp(
  LANE_RAMP_START_Y,
  LANE_RAMP_END_Y,
  clamp01((x - LANE_RAMP_START_X) / (LANE_RAMP_END_X - LANE_RAMP_START_X))
);
const laneStart = new THREE.Vector3(5.04, laneSurfaceY(5.04), -1.08);
const laneEnd = new THREE.Vector3(5.55, laneSurfaceY(5.55), -1.08);
const laneAngle = Math.atan2(
  LANE_RAMP_END_Y - LANE_RAMP_START_Y,
  LANE_RAMP_END_X - LANE_RAMP_START_X
);
const laneShelf = box(
  LANE_RAMP_START_X - LANE_SHELF_START_X,
  0.07,
  0.7,
  materials.darkSteel
);
laneShelf.position.set(
  (LANE_SHELF_START_X + LANE_RAMP_START_X) / 2,
  LANE_RAMP_START_Y - 0.035,
  laneStart.z
);
scene.add(laneShelf);
const laneRamp = box(
  Math.hypot(
    LANE_RAMP_END_X - LANE_RAMP_START_X,
    LANE_RAMP_END_Y - LANE_RAMP_START_Y
  ),
  0.07,
  0.7,
  materials.darkSteel
);
laneRamp.position.set(
  (LANE_RAMP_START_X + LANE_RAMP_END_X) / 2,
  (LANE_RAMP_START_Y + LANE_RAMP_END_Y) / 2 - 0.035,
  laneStart.z
);
laneRamp.rotation.z = laneAngle;
scene.add(laneRamp);
for (const dz of [-0.31, 0.31]) {
  const rail = cylinderBetween(
    new THREE.Vector3(LANE_SHELF_START_X, LANE_RAMP_START_Y + 0.08, laneStart.z + dz),
    new THREE.Vector3(LANE_RAMP_END_X, LANE_RAMP_END_Y + 0.08, laneStart.z + dz),
    0.035,
    materials.brass
  );
  scene.add(rail);
}
for (const x of [4.56, 5.13, 5.7]) {
  const tie = box(0.08, 0.06, 0.78, materials.darkSteel);
  tie.position.set(x, laneSurfaceY(x) + 0.03, laneStart.z);
  tie.rotation.z = laneAngle;
  scene.add(tie);
}

const ballGroup = new THREE.Group();
const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_RADIUS, 32, 20), materials.steel);
ball.castShadow = true;
ball.receiveShadow = true;
ballGroup.add(ball);
const ballBand = new THREE.Mesh(
  new THREE.TorusGeometry(BALL_RADIUS + 0.002, 0.015, 8, 28),
  materials.darkSteel
);
ballBand.rotation.y = Math.PI / 2;
ballGroup.add(ballBand);
scene.add(ballGroup);

const leverPivot = new THREE.Vector3(6.27, 0.62, -1.08);
const leverGroup = new THREE.Group();
leverGroup.position.copy(leverPivot);
const leverBeam = box(1.36, 0.14, 0.24, materials.yellow);
leverBeam.position.y = -0.08;
leverGroup.add(leverBeam);
const leverEnd = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.28, 18), materials.red);
leverEnd.rotation.x = Math.PI / 2;
leverEnd.position.x = -0.72;
leverEnd.position.y = -0.12;
leverGroup.add(leverEnd);
const leverCounterweight = new THREE.Mesh(
  new THREE.CylinderGeometry(0.16, 0.16, 0.28, 18),
  materials.brass
);
leverCounterweight.rotation.x = Math.PI / 2;
leverCounterweight.position.x = 0.72;
leverCounterweight.position.y = -0.08;
leverGroup.add(leverCounterweight);
scene.add(leverGroup);

const fulcrumGeometry = new THREE.BufferGeometry();
fulcrumGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
  -0.34, 0, -0.2, 0.34, 0, -0.2, 0, 0.67, -0.2,
  -0.34, 0, 0.2, 0.34, 0, 0.2, 0, 0.67, 0.2
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

const CORD_POINT_COUNT = 7;
const cordGeometry = new THREE.BufferGeometry();
const cordPositions = new Float32Array(CORD_POINT_COUNT * 3);
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

const rimLight = new THREE.PointLight(0x8ac8e8, 4, 12, 2);
rimLight.position.set(4.8, 3.8, -2.6);
scene.add(rimLight);

const fillLight = new THREE.SpotLight(0xffd8ab, 32, 11, Math.PI / 5.5, 0.6, 1.4);
fillLight.castShadow = false;
fillLight.target = new THREE.Object3D();
scene.add(fillLight, fillLight.target);

const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
world.timestep = FIXED_DT;
world.numSolverIterations = 12;
world.numInternalPgsIterations = 2;
world.maxCcdSubsteps = 2;

const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
world.createCollider(
  RAPIER.ColliderDesc.cuboid(9, 0.24, 4.5)
    .setTranslation(0, -0.24, 0)
    .setFriction(0.9)
    .setRestitution(0.03),
  groundBody
);

for (let index = 0; index < DOMINO_COUNT; index += 1) {
  const u = index / (DOMINO_COUNT - 1);
  const point = physicsPathPoint(u);
  if (point.x <= BRIDGE_START || point.x >= BRIDGE_END) continue;
  const rotation = pathOrientation(u);
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.11, 0.035, 0.27)
      .setTranslation(point.x, point.y - 0.035, point.z)
      .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w })
      .setFriction(1.08)
      .setRestitution(0.01),
    groundBody
  );
}

const dominoBodies = [];
const dominoColliders = [];
for (let i = 0; i < DOMINO_COUNT; i += 1) {
  const u = i / (DOMINO_COUNT - 1);
  const point = physicsPathPoint(u);
  const rotation = pathOrientation(u);
  const normal = new THREE.Vector3(0, 1, 0).applyQuaternion(rotation);
  point.addScaledVector(normal, 0.58);
  const descriptor = RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(point.x, point.y, point.z)
    .setRotation({ x: rotation.x, y: rotation.y, z: rotation.z, w: rotation.w })
    .setLinearDamping(0.055)
    .setAngularDamping(0.035)
    .setCanSleep(true)
    .setSleeping(true)
    .setCcdEnabled(true)
    .setAdditionalSolverIterations(3);
  const rigidBody = world.createRigidBody(descriptor);
  const collider = world.createCollider(
    RAPIER.ColliderDesc.roundCuboid(0.077, 0.568, 0.205, 0.012)
      .setDensity(720)
      .setFriction(0.72)
      .setRestitution(0.075)
      .setContactSkin(0.0015),
    rigidBody
  );
  dominoBodies.push(rigidBody);
  dominoColliders.push(collider);
}

const ballBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(laneStart.x, laneStart.y + BALL_RADIUS, laneStart.z)
    .setLinearDamping(0.01)
    .setAngularDamping(0.015)
    .setCcdEnabled(true)
    .setCanSleep(true)
    .setSleeping(true)
    .setAdditionalSolverIterations(5)
);
const ballCollider = world.createCollider(
  RAPIER.ColliderDesc.ball(BALL_RADIUS)
    .setDensity(BALL_DENSITY)
    .setFriction(0.12)
    .setRestitution(0.025)
    .setContactSkin(0.001),
  ballBody
);

const laneShelfBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
const laneShelfCollider = world.createCollider(
  RAPIER.ColliderDesc.cuboid(
    (LANE_RAMP_START_X - LANE_SHELF_START_X) / 2,
    0.035,
    0.35
  )
    .setTranslation(
      (LANE_SHELF_START_X + LANE_RAMP_START_X) / 2,
      LANE_RAMP_START_Y - 0.035,
      laneStart.z
    )
    .setFriction(0.48)
    .setRestitution(0.03)
    .setContactSkin(0.002),
  laneShelfBody
);
const rampLength = Math.hypot(
  LANE_RAMP_END_X - LANE_RAMP_START_X,
  LANE_RAMP_END_Y - LANE_RAMP_START_Y
);
const rampRotation = new THREE.Quaternion().setFromAxisAngle(
  new THREE.Vector3(0, 0, 1),
  laneAngle
);
const laneRampBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
world.createCollider(
  RAPIER.ColliderDesc.cuboid(rampLength / 2, 0.035, 0.35)
    .setTranslation(
      (LANE_RAMP_START_X + LANE_RAMP_END_X) / 2 +
        0.035 * Math.sin(laneAngle),
      (LANE_RAMP_START_Y + LANE_RAMP_END_Y) / 2 -
        0.035 * Math.cos(laneAngle),
      laneStart.z
    )
    .setRotation({
      x: rampRotation.x,
      y: rampRotation.y,
      z: rampRotation.z,
      w: rampRotation.w
    })
    .setFriction(0.48)
    .setRestitution(0.03),
  laneRampBody
);

// Low rails physically constrain the ball without blocking the falling tile.
for (const dz of [-0.33, 0.33]) {
  world.createCollider(
    RAPIER.ColliderDesc.cuboid(0.85, 0.08, 0.035)
      .setTranslation(5.22, 0.1, laneStart.z + dz)
      .setFriction(0.45)
      .setRestitution(0.08),
    groundBody
  );
}

const leverAnchorBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.fixed().setTranslation(leverPivot.x, leverPivot.y, leverPivot.z)
);
const leverBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(leverPivot.x, leverPivot.y, leverPivot.z)
    .setLinearDamping(0.08)
    .setAngularDamping(0.03)
    .setCanSleep(true)
    .setSleeping(true)
    .setAdditionalSolverIterations(8)
);
const leverColliders = [];
leverColliders.push(world.createCollider(
  RAPIER.ColliderDesc.roundCuboid(0.68, 0.07, 0.12, 0.018)
    .setTranslation(0, -0.08, 0)
    .setDensity(LEVER_DENSITY)
    .setFriction(0.46)
    .setRestitution(0.015),
  leverBody
));
leverColliders.push(world.createCollider(
  RAPIER.ColliderDesc.ball(0.18)
    .setTranslation(-0.72, -0.12, 0)
    .setDensity(LEVER_DENSITY)
    .setFriction(0.42)
    .setRestitution(0.015),
  leverBody
));
leverColliders.push(world.createCollider(
  RAPIER.ColliderDesc.ball(0.18)
    .setTranslation(0.72, -0.08, 0)
    .setDensity(LEVER_DENSITY)
    .setFriction(0.42)
    .setRestitution(0.015),
  leverBody
));
const leverJoint = world.createImpulseJoint(
  RAPIER.JointData.revolute(
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 0 },
    { x: 0, y: 0, z: 1 }
  ),
  leverAnchorBody,
  leverBody,
  true
);
leverJoint.setLimits(LEVER_MIN_ANGLE, LEVER_MAX_ANGLE);

const flagBody = world.createRigidBody(
  RAPIER.RigidBodyDesc.dynamic()
    .setTranslation(poleX + 0.07, 2.96, poleZ)
    .lockTranslations()
    .lockRotations()
    .setLinearDamping(0.38)
    .setCanSleep(false)
);
world.createCollider(
  RAPIER.ColliderDesc.cuboid(flagWidth / 2, flagHeight / 2, 0.025)
    .setTranslation(flagWidth / 2, -flagHeight / 2, 0)
    .setDensity(84)
    .setFriction(0.4)
    .setRestitution(0.02),
  flagBody
);

const floorStop = world.createRigidBody(RAPIER.RigidBodyDesc.fixed());
world.createCollider(
  RAPIER.ColliderDesc.cuboid(0.14, 0.06, 0.18)
    .setTranslation(poleX + 0.07, 0.78, poleZ)
    .setFriction(0.5)
    .setRestitution(0.02),
  floorStop
);

const dynamicBodies = [...dominoBodies, ballBody, leverBody, flagBody];
for (const body of dominoBodies) body.sleep();
ballBody.wakeUp();
for (let step = 0; step < 120; step += 1) world.step();
for (const body of dominoBodies) body.sleep();
ballBody.sleep();
leverBody.sleep();
const dominoInitialRotations = dominoBodies.map((body) => ({ ...body.rotation() }));
const initialBallPosition = { ...ballBody.translation() };
const initialLeverRotation = { ...leverBody.rotation() };
const initialFallAxis = new THREE.Vector3(0, 0, -1).applyQuaternion(
  new THREE.Quaternion().copy(dominos[0].quaternion)
);
const INITIAL_TRIGGER_TORQUE_IMPULSE = 30;
dominoBodies[0].applyTorqueImpulse({
  x: initialFallAxis.x * INITIAL_TRIGGER_TORQUE_IMPULSE,
  y: initialFallAxis.y * INITIAL_TRIGGER_TORQUE_IMPULSE,
  z: initialFallAxis.z * INITIAL_TRIGGER_TORQUE_IMPULSE
}, true);

const states = [];
const eventSteps = {
  firstDomino: 0,
  bridgeEntry: null,
  finalDomino: null,
  ballContact: null,
  leverContact: null,
  flagRelease: null,
  settled: null
};
const dominoMoveSteps = new Array(DOMINO_COUNT).fill(null);
dominoMoveSteps[0] = 0;
const observedDominoMoveSteps = new Array(DOMINO_COUNT).fill(null);
observedDominoMoveSteps[0] = 0;
const contactEvents = [];
const peakDominoContactImpulses = new Array(DOMINO_COUNT - 1).fill(0);
let peakBallContactImpulse = 0;
let peakLeverContactImpulse = 0;
const energyTrend = [];
const bridgeDominoIndex = Array.from({ length: DOMINO_COUNT }, (_, index) => index)
  .find((index) => pathPoint(index / (DOMINO_COUNT - 1)).y > 0.08);
let activeDominoCount = 1;
let flagReleased = false;
let latchArmed = false;
let leverReleaseAngle = null;
let peakLeverAngle = 0;
let peakLeverAngleStep = 0;
let leverContactStepCount = 0;
let lastLeverContactStep = null;
let minimumBallXVelocityAfterLeverContact = Infinity;
let latchReleaseEnergyBefore = null;
let latchReleaseEnergyAfter = null;
let flagVelocityBeforeRelease = null;
let flagVelocityAfterRelease = null;
let maxBallDisplacementBeforeContact = 0;
let maxBallDisplacementBeforeContactState = null;
let maxLeverRotationBeforeContact = 0;
const mechanismTelemetry = [];

function capturePhysicsState() {
  return dynamicBodies.map((body) => {
    const position = body.translation();
    const rotation = body.rotation();
    return {
      p: [position.x, position.y, position.z],
      q: [rotation.x, rotation.y, rotation.z, rotation.w]
    };
  });
}

function quaternionAngleAroundZ(rotation) {
  return 2 * Math.atan2(rotation.z, rotation.w);
}

const relativeLeverQuaternion = new THREE.Quaternion();
const inverseInitialLeverQuaternion = new THREE.Quaternion(
  initialLeverRotation.x,
  initialLeverRotation.y,
  initialLeverRotation.z,
  initialLeverRotation.w
).invert();

function leverAngleFromInitial() {
  const rotation = leverBody.rotation();
  relativeLeverQuaternion
    .set(rotation.x, rotation.y, rotation.z, rotation.w)
    .multiply(inverseInitialLeverQuaternion);
  return quaternionAngleAroundZ(relativeLeverQuaternion);
}

function angularDisplacement(body, initial) {
  const current = body.rotation();
  const dot = Math.abs(
    initial.x * current.x + initial.y * current.y +
    initial.z * current.z + initial.w * current.w
  );
  return 2 * Math.acos(Math.min(1, dot));
}

function colliderContact(first, second) {
  let touching = false;
  let impulse = 0;
  world.contactPair(first, second, (manifold) => {
    if (manifold.numContacts() > 0 || manifold.numSolverContacts() > 0) touching = true;
    for (let contact = 0; contact < manifold.numContacts(); contact += 1) {
      impulse += Math.abs(manifold.contactImpulse(contact));
    }
  });
  return { touching, impulse };
}

const inverseBodyRotation = new THREE.Quaternion();
const localAngularVelocity = new THREE.Vector3();

function bodyKineticEnergy(body) {
  const mass = body.mass();
  const linear = body.linvel();
  const angular = body.angvel();
  const inertia = body.principalInertia();
  const rotation = body.rotation();
  inverseBodyRotation.set(rotation.x, rotation.y, rotation.z, rotation.w).invert();
  localAngularVelocity.set(angular.x, angular.y, angular.z).applyQuaternion(inverseBodyRotation);
  const translational = 0.5 * mass * (
    linear.x * linear.x + linear.y * linear.y + linear.z * linear.z
  );
  const rotational = 0.5 * (
    inertia.x * localAngularVelocity.x * localAngularVelocity.x +
    inertia.y * localAngularVelocity.y * localAngularVelocity.y +
    inertia.z * localAngularVelocity.z * localAngularVelocity.z
  );
  return { translational, rotational, total: translational + rotational };
}

function measureSystemEnergy() {
  let translationalKinetic = 0;
  let rotationalKinetic = 0;
  let gravitationalPotential = 0;
  for (const body of dynamicBodies) {
    const mass = body.mass();
    const center = body.worldCom();
    const kinetic = bodyKineticEnergy(body);
    translationalKinetic += kinetic.translational;
    rotationalKinetic += kinetic.rotational;
    gravitationalPotential += mass * 9.81 * Math.max(0, center.y);
  }
  const kinetic = translationalKinetic + rotationalKinetic;
  return {
    kinetic,
    potential: gravitationalPotential,
    total: kinetic + gravitationalPotential
  };
}

function captureEnergy(step) {
  energyTrend.push({
    time: step * FIXED_DT,
    ...measureSystemEnergy()
  });
}

states.push(capturePhysicsState());
captureEnergy(0);
const simulationSteps = Math.round(DURATION / FIXED_DT);
// Passive simulation begins; no impulse, velocity, transform, or body-type mutation is allowed below.
for (let step = 1; step <= simulationSteps; step += 1) {
  world.step();

  for (let index = 1; index < DOMINO_COUNT; index += 1) {
    if (observedDominoMoveSteps[index] === null && angularDisplacement(
      dominoBodies[index],
      dominoInitialRotations[index]
    ) > 0.07) {
      observedDominoMoveSteps[index] = step;
    }
  }

  for (let index = 0; index < DOMINO_COUNT - 1; index += 1) {
    const contact = colliderContact(dominoColliders[index], dominoColliders[index + 1]);
    peakDominoContactImpulses[index] = Math.max(
      peakDominoContactImpulses[index],
      contact.impulse
    );
  }
  const ballContactSample = colliderContact(dominoColliders[DOMINO_COUNT - 1], ballCollider);
  peakBallContactImpulse = Math.max(peakBallContactImpulse, ballContactSample.impulse);
  let leverContactSample = { touching: false, impulse: 0 };
  for (const leverCollider of leverColliders) {
    const contact = colliderContact(ballCollider, leverCollider);
    leverContactSample.touching ||= contact.touching;
    leverContactSample.impulse += contact.impulse;
  }
  peakLeverContactImpulse = Math.max(peakLeverContactImpulse, leverContactSample.impulse);

  if (activeDominoCount < DOMINO_COUNT) {
    const previousIndex = activeDominoCount - 1;
    const previousMoved = angularDisplacement(
      dominoBodies[previousIndex],
      dominoInitialRotations[previousIndex]
    ) > 0.07;
    const contact = colliderContact(
      dominoColliders[previousIndex],
      dominoColliders[activeDominoCount]
    );
    if (previousMoved && contact.touching) {
      const nextIndex = activeDominoCount;
      contactEvents.push({
        kind: 'domino-to-domino',
        from: previousIndex,
        to: nextIndex,
        step,
        measuredImpulse: contact.impulse
      });
      dominoMoveSteps[nextIndex] = step;
      activeDominoCount += 1;
    }
  }

  if (eventSteps.ballContact === null) {
    const lastIndex = DOMINO_COUNT - 1;
    const lastMoved = angularDisplacement(
      dominoBodies[lastIndex],
      dominoInitialRotations[lastIndex]
    ) > 0.07;
    const contact = ballContactSample;
    if (lastMoved && contact.touching) {
      eventSteps.ballContact = step;
      contactEvents.push({
        kind: 'domino-to-ball',
        from: lastIndex,
        to: 'ball',
        step,
        measuredImpulse: contact.impulse
      });
    } else {
      const position = ballBody.translation();
      const displacement = Math.hypot(
        position.x - initialBallPosition.x,
        position.y - initialBallPosition.y,
        position.z - initialBallPosition.z
      );
      if (displacement > maxBallDisplacementBeforeContact) {
        maxBallDisplacementBeforeContact = displacement;
        maxBallDisplacementBeforeContactState = {
          time: step * FIXED_DT,
          position: [position.x, position.y, position.z]
        };
      }
    }
  }

  if (eventSteps.leverContact === null) {
    if (leverContactSample.touching) {
      eventSteps.leverContact = step;
      latchArmed = true;
      contactEvents.push({
        kind: 'ball-to-lever',
        from: 'ball',
        to: 'lever',
        step,
        measuredImpulse: leverContactSample.impulse
      });
    } else {
      maxLeverRotationBeforeContact = Math.max(
        maxLeverRotationBeforeContact,
        angularDisplacement(leverBody, initialLeverRotation)
      );
    }
  }

  if (eventSteps.bridgeEntry === null && dominoMoveSteps[bridgeDominoIndex] !== null) {
    eventSteps.bridgeEntry = dominoMoveSteps[bridgeDominoIndex];
  }
  if (eventSteps.finalDomino === null && dominoMoveSteps[DOMINO_COUNT - 1] !== null) {
    eventSteps.finalDomino = dominoMoveSteps[DOMINO_COUNT - 1];
  }

  const leverAngle = leverAngleFromInitial();
  if (Math.abs(leverAngle) > Math.abs(peakLeverAngle)) {
    peakLeverAngle = leverAngle;
    peakLeverAngleStep = step;
  }
  if (leverContactSample.touching) {
    leverContactStepCount += 1;
    lastLeverContactStep = step;
  }
  if (eventSteps.leverContact !== null) {
    minimumBallXVelocityAfterLeverContact = Math.min(
      minimumBallXVelocityAfterLeverContact,
      ballBody.linvel().x
    );
  }
  if (!flagReleased && latchArmed && leverAngle <= -LATCH_RELEASE_ANGLE) {
    flagReleased = true;
    leverReleaseAngle = leverAngle;
    eventSteps.flagRelease = step;
    latchReleaseEnergyBefore = measureSystemEnergy();
    const velocityBefore = flagBody.linvel();
    flagVelocityBeforeRelease = [velocityBefore.x, velocityBefore.y, velocityBefore.z];
    flagBody.setEnabledTranslations(false, true, false, true);
    const velocityAfter = flagBody.linvel();
    flagVelocityAfterRelease = [velocityAfter.x, velocityAfter.y, velocityAfter.z];
    latchReleaseEnergyAfter = measureSystemEnergy();
  }

  if (eventSteps.settled === null && flagReleased && flagBody.translation().y < 1.75 &&
      Math.abs(flagBody.linvel().y) < 0.13) {
    eventSteps.settled = step;
  }
  if (step % 60 === 0 || step === simulationSteps) captureEnergy(step);
  if (step * FIXED_DT >= 4.15) {
    const ballVelocity = ballBody.linvel();
    const leverVelocity = leverBody.angvel();
    const ballKinetic = bodyKineticEnergy(ballBody);
    const leverKinetic = bodyKineticEnergy(leverBody);
    mechanismTelemetry.push({
      time: step * FIXED_DT,
      ballPosition: [
        ballBody.translation().x,
        ballBody.translation().y,
        ballBody.translation().z
      ],
      ballVelocity: [ballVelocity.x, ballVelocity.y, ballVelocity.z],
      ballKinetic: ballKinetic.total,
      leverAngleDegrees: THREE.MathUtils.radToDeg(leverAngle),
      leverAngularVelocity: [
        leverVelocity.x,
        leverVelocity.y,
        leverVelocity.z
      ],
      leverKinetic: leverKinetic.total,
      leverContact: leverContactSample.touching,
      leverContactImpulse: leverContactSample.impulse,
      flagReleased
    });
  }
  states.push(capturePhysicsState());
}

for (const key of Object.keys(eventSteps)) {
  if (eventSteps[key] !== null) eventSteps[key] *= FIXED_DT;
}
const dominoMoveTimes = dominoMoveSteps.map((step) => step === null ? null : step * FIXED_DT);
const observedDominoMoveTimes = observedDominoMoveSteps.map(
  (step) => step === null ? null : step * FIXED_DT
);
for (const event of contactEvents) {
  event.peakMeasuredImpulse = event.kind === 'domino-to-domino'
    ? peakDominoContactImpulses[event.from]
    : event.kind === 'domino-to-ball'
      ? peakBallContactImpulse
      : peakLeverContactImpulse;
  event.time = event.step * FIXED_DT;
  delete event.step;
}
const initialTotalEnergy = energyTrend[0].total;
const maximumTotalEnergy = Math.max(...energyTrend.map((sample) => sample.total));
const finalTotalEnergy = energyTrend.at(-1).total;
const nearestMechanismSample = (time) => mechanismTelemetry.reduce((nearest, candidate) => (
  Math.abs(candidate.time - time) < Math.abs(nearest.time - time) ? candidate : nearest
));
const incomingBallSample = mechanismTelemetry
  .filter((sample) => (
    sample.time >= eventSteps.ballContact && sample.time <= eventSteps.leverContact
  ))
  .reduce((peak, sample) => sample.ballKinetic > peak.ballKinetic ? sample : peak);
const peakLeverKineticSample = mechanismTelemetry
  .filter((sample) => sample.time >= eventSteps.leverContact)
  .reduce((peak, sample) => sample.leverKinetic > peak.leverKinetic ? sample : peak);
const contactSeparationTime = lastLeverContactStep === null
  ? null
  : (lastLeverContactStep + 1) * FIXED_DT;
const separationSample = contactSeparationTime === null
  ? null
  : nearestMechanismSample(contactSeparationTime);
const releaseSample = eventSteps.flagRelease === null
  ? null
  : nearestMechanismSample(eventSteps.flagRelease);
const mechanismFrameEvidence = Array.from({ length: FRAMES - 101 }, (_, index) => {
  const frame = 101 + index;
  const time = frame / FPS;
  const sample = nearestMechanismSample(time);
  return { frame, ...sample };
});
const dominoFinalLeanDegrees = states.at(-1).slice(0, DOMINO_COUNT).map((state) => {
  const [x, , z] = state.q;
  const upY = Math.max(-1, Math.min(1, 1 - 2 * (x * x + z * z)));
  return THREE.MathUtils.radToDeg(Math.acos(upY));
});

let currentTime = 0;
let animationFrame = 0;
let playing = true;
let playStart = performance.now();
const interpolateQuaternion = new THREE.Quaternion();
const stateQuaternionA = new THREE.Quaternion();
const stateQuaternionB = new THREE.Quaternion();

function updateScene(time) {
  const t = Math.max(0, Math.min(DURATION, Number.isFinite(time) ? time : 0));
  currentTime = t;

  const stateIndex = Math.min(states.length - 1, Math.floor(t / FIXED_DT));
  const nextStateIndex = Math.min(states.length - 1, stateIndex + 1);
  const blend = clamp01((t - stateIndex * FIXED_DT) / FIXED_DT);
  const meshes = [...dominos, ballGroup, leverGroup, flagGroup];
  for (let i = 0; i < meshes.length; i += 1) {
    const from = states[stateIndex][i];
    const to = states[nextStateIndex][i];
    meshes[i].position.set(
      lerp(from.p[0], to.p[0], blend),
      lerp(from.p[1], to.p[1], blend),
      lerp(from.p[2], to.p[2], blend)
    );
    stateQuaternionA.fromArray(from.q);
    stateQuaternionB.fromArray(to.q);
    interpolateQuaternion.copy(stateQuaternionA).slerp(stateQuaternionB, blend);
    meshes[i].quaternion.copy(interpolateQuaternion);
  }

  const localEnd = new THREE.Vector3(0.63, 0.05, 0)
    .applyQuaternion(leverGroup.quaternion)
    .add(leverGroup.position);
  const released = eventSteps.flagRelease !== null && t >= eventSteps.flagRelease;
  cord.visible = !released;
  const cordTarget = new THREE.Vector3(poleX - 0.05, flagGroup.position.y + 0.1, poleZ);
  for (let point = 0; point < CORD_POINT_COUNT; point += 1) {
    const ratio = point / (CORD_POINT_COUNT - 1);
    const offset = point * 3;
    if (released) {
      cordPositions[offset] = localEnd.x + 0.12 * ratio;
      cordPositions[offset + 1] = localEnd.y - 0.58 * ratio + 0.08 * Math.sin(Math.PI * ratio);
      cordPositions[offset + 2] = localEnd.z + 0.05 * Math.sin(Math.PI * ratio);
    } else {
      cordPositions[offset] = lerp(localEnd.x, cordTarget.x, ratio);
      cordPositions[offset + 1] =
        lerp(localEnd.y, cordTarget.y, ratio) - 0.23 * Math.sin(Math.PI * ratio);
      cordPositions[offset + 2] = lerp(localEnd.z, cordTarget.z, ratio);
    }
  }
  cordGeometry.attributes.position.needsUpdate = true;

  let active;
  const ballEvent = eventSteps.ballContact ?? 3.65;
  if (t <= ballEvent) {
    const waveProgress = clamp01((t - 0.03) / Math.max(ballEvent - 0.03, 0.1));
    active = pathPoint(waveProgress);
  } else {
    const mechanismProgress = smooth((t - ballEvent) / Math.max(DURATION - ballEvent, 0.2));
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
    active.x + lerp(-0.18, 1.02, mechanismReveal),
    Math.max(0.48, active.y + 0.34) + 0.12 * mechanismReveal,
    active.z - 0.12
  );
  camera.lookAt(lookTarget);
  camera.fov = lerp(45, 45.4, travel) + 1.6 * mechanismReveal;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);

  fillLight.position.copy(camera.position).add(new THREE.Vector3(-0.6, 1.1, -0.5));
  fillLight.target.position.copy(lookTarget);
  fillLight.target.updateMatrixWorld(true);

  renderer.render(scene, camera);
}

function animate(now) {
  if (!playing) return;
  const elapsed = (now - playStart) / 1000;
  updateScene(elapsed % DURATION);
  animationFrame = requestAnimationFrame(animate);
}

function pause() {
  playing = false;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
}

function seek(seconds) {
  pause();
  updateScene(Number(seconds));
}

function getCameraState() {
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
  getPhysicsInfo: () => ({
    engine: 'Rapier 0.20.0',
    gravity: [0, -9.81, 0],
    fixedStep: FIXED_DT,
    precomputedStates: states.length,
    dynamicBodyCount: dynamicBodies.length,
    dominoCount: DOMINO_COUNT,
    releasedDominoCount: activeDominoCount,
    allBodiesDynamicFromStart: true,
    downstreamBodiesInitiallySleeping: true,
    initialTrigger: {
      body: 'domino-0',
      method: 'applyTorqueImpulse',
      time: 0,
      magnitude: INITIAL_TRIGGER_TORQUE_IMPULSE
    },
    postTriggerStateAssignments: 0,
    maxBallDisplacementBeforeContact,
    maxBallDisplacementBeforeContactState,
    maxLeverRotationBeforeContact,
    contactEvents,
    energyTrend,
    energyValidation: {
      initialTotal: initialTotalEnergy,
      maximumTotal: maximumTotalEnergy,
      finalTotal: finalTotalEnergy,
      maximumToInitialRatio: maximumTotalEnergy / initialTotalEnergy,
      finalToInitialRatio: finalTotalEnergy / initialTotalEnergy
    },
    mechanismEvidence: {
      ballMass: ballBody.mass(),
      leverMass: leverBody.mass(),
      ballToLeverMassRatio: ballBody.mass() / leverBody.mass(),
      ballPrincipalInertia: Object.values(ballBody.principalInertia()),
      leverPrincipalInertia: Object.values(leverBody.principalInertia()),
      initialLeverAngleDegrees: THREE.MathUtils.radToDeg(
        quaternionAngleAroundZ(initialLeverRotation)
      ),
      leverJointLimitsDegrees: [
        THREE.MathUtils.radToDeg(LEVER_MIN_ANGLE),
        THREE.MathUtils.radToDeg(LEVER_MAX_ANGLE)
      ],
      latchReleaseThresholdDegrees: THREE.MathUtils.radToDeg(LATCH_RELEASE_ANGLE),
      latchReleaseAngleDegrees: leverReleaseAngle === null
        ? null
        : THREE.MathUtils.radToDeg(leverReleaseAngle),
      peakLeverAngleDegrees: THREE.MathUtils.radToDeg(peakLeverAngle),
      peakLeverAngleTime: peakLeverAngleStep * FIXED_DT,
      leverContactDuration: leverContactStepCount * FIXED_DT,
      lastLeverContactTime: lastLeverContactStep === null
        ? null
        : lastLeverContactStep * FIXED_DT,
      contactSeparationTime,
      contactSeparatedBeforeLatchRelease: contactSeparationTime !== null &&
        eventSteps.flagRelease !== null &&
        contactSeparationTime < eventSteps.flagRelease,
      minimumBallXVelocityAfterLeverContact: Number.isFinite(minimumBallXVelocityAfterLeverContact)
        ? minimumBallXVelocityAfterLeverContact
        : null,
      maximumBallReboundSpeed: Number.isFinite(minimumBallXVelocityAfterLeverContact)
        ? Math.max(0, -minimumBallXVelocityAfterLeverContact)
        : null,
      incomingBallKineticEnergy: incomingBallSample.ballKinetic,
      incomingBallKineticTime: incomingBallSample.time,
      peakLeverKineticEnergy: peakLeverKineticSample.leverKinetic,
      peakLeverKineticTime: peakLeverKineticSample.time,
      visibleKineticTransferFraction:
        peakLeverKineticSample.leverKinetic / incomingBallSample.ballKinetic,
      separationSample,
      releaseSample,
      latchReleaseEnergyBefore,
      latchReleaseEnergyAfter,
      latchReleaseEnergyDelta: latchReleaseEnergyBefore && latchReleaseEnergyAfter
        ? latchReleaseEnergyAfter.total - latchReleaseEnergyBefore.total
        : null,
      flagVelocityBeforeRelease,
      flagVelocityAfterRelease,
      frameEvidence: mechanismFrameEvidence
    },
    eventTimes: { ...eventSteps },
    dominoMoveTimes,
    observedDominoMoveTimes,
    dominoFinalLeanDegrees,
    finalState: {
      lastDomino: states.at(-1)[DOMINO_COUNT - 1],
      ball: states.at(-1)[DOMINO_COUNT],
      lever: states.at(-1)[DOMINO_COUNT + 1],
      flag: states.at(-1)[DOMINO_COUNT + 2]
    },
    flagReleasedAtCurrentTime: eventSteps.flagRelease !== null && currentTime >= eventSteps.flagRelease,
    cordDetachedAtCurrentTime: eventSteps.flagRelease !== null && currentTime >= eventSteps.flagRelease
  }),
  metadata: { width: WIDTH, height: HEIGHT, fps: FPS, frames: FRAMES, duration: DURATION }
};

updateScene(0);
window.sceneReady = true;
animationFrame = requestAnimationFrame(animate);
