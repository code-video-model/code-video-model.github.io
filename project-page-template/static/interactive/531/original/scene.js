import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAMES = 124;
const DURATION = FRAMES / FPS;

const canvas = document.querySelector("#scene");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x18212d);
scene.fog = new THREE.Fog(0x18212d, 11.5, 21);

const camera = new THREE.PerspectiveCamera(42, WIDTH / HEIGHT, 0.1, 80);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const mix = (a, b, t) => a + (b - a) * t;
const smoothstep = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const smootherstep = (value) => {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const easeInCubic = (value) => {
  const t = clamp01(value);
  return t * t * t;
};

const materials = {
  table: new THREE.MeshStandardMaterial({
    color: 0x714126,
    roughness: 0.62,
    metalness: 0.02,
  }),
  tableEdge: new THREE.MeshStandardMaterial({
    color: 0x3d2418,
    roughness: 0.66,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: 0x687888,
    roughness: 0.27,
    metalness: 0.78,
  }),
  darkSteel: new THREE.MeshStandardMaterial({
    color: 0x25303b,
    roughness: 0.31,
    metalness: 0.72,
  }),
  plank: new THREE.MeshStandardMaterial({
    color: 0xa8612c,
    roughness: 0.52,
    metalness: 0.01,
  }),
  plankEdge: new THREE.LineBasicMaterial({ color: 0x4f2d19 }),
  seesaw: new THREE.MeshStandardMaterial({
    color: 0xe3ad43,
    roughness: 0.39,
    metalness: 0.04,
  }),
  bowling: new THREE.MeshPhysicalMaterial({
    color: 0x173c6f,
    roughness: 0.19,
    metalness: 0.22,
    clearcoat: 0.72,
    clearcoatRoughness: 0.15,
  }),
  hole: new THREE.MeshStandardMaterial({
    color: 0x03070b,
    roughness: 0.7,
  }),
  smallBall: new THREE.MeshPhysicalMaterial({
    color: 0xe9342f,
    roughness: 0.22,
    metalness: 0.08,
    clearcoat: 0.55,
  }),
  brass: new THREE.MeshPhysicalMaterial({
    color: 0xdcae3d,
    roughness: 0.25,
    metalness: 0.82,
    clearcoat: 0.3,
  }),
  rubber: new THREE.MeshStandardMaterial({
    color: 0x1a222b,
    roughness: 0.75,
  }),
  wall: new THREE.MeshStandardMaterial({
    color: 0x394552,
    roughness: 0.93,
  }),
  wallInset: new THREE.MeshStandardMaterial({
    color: 0x202b37,
    roughness: 0.86,
  }),
  cream: new THREE.MeshStandardMaterial({
    color: 0xe4dfd0,
    roughness: 0.78,
  }),
  red: new THREE.MeshStandardMaterial({
    color: 0xc73b35,
    roughness: 0.48,
  }),
};

function addMesh(geometry, material, parent = scene) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addBox(size, position, material, parent = scene) {
  const mesh = addMesh(new THREE.BoxGeometry(...size), material, parent);
  mesh.position.set(...position);
  return mesh;
}

function addCylinder(radiusTop, radiusBottom, height, segments, position, material, parent = scene) {
  const mesh = addMesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
    parent,
  );
  mesh.position.set(...position);
  return mesh;
}

const floor = addBox([18, 0.3, 14], [0, -2.1, 0], materials.wallInset);
floor.receiveShadow = true;

const backWall = addBox([17, 8, 0.35], [0, 1.7, -3.15], materials.wall);
backWall.receiveShadow = true;

for (const x of [-5.6, -2.8, 0, 2.8, 5.6]) {
  addBox([0.06, 5.2, 0.06], [x, 1.45, -2.94], materials.darkSteel).castShadow = false;
}
for (const y of [-0.55, 1.25, 3.05]) {
  addBox([14.2, 0.06, 0.06], [0, y, -2.94], materials.darkSteel).castShadow = false;
}

const sideWindow = addBox([3.1, 1.8, 0.08], [-4.55, 2.55, -2.91], materials.wallInset);
sideWindow.castShadow = false;
addBox([2.82, 0.07, 0.11], [-4.55, 2.55, -2.84], materials.steel).castShadow = false;
addBox([0.07, 1.55, 0.11], [-4.55, 2.55, -2.84], materials.steel).castShadow = false;

for (const x of [-2.2, 2.15]) {
  const lamp = addBox([1.7, 0.11, 0.45], [x, 4.72, -1.35], materials.cream);
  lamp.rotation.x = -0.05;
}

const worktop = addBox([9.5, 0.34, 3.1], [-0.3, -0.16, 0], materials.table);
worktop.receiveShadow = true;
addBox([9.65, 0.16, 0.16], [-0.3, -0.22, 1.6], materials.tableEdge);
addBox([9.65, 0.16, 0.16], [-0.3, -0.22, -1.6], materials.tableEdge);
for (const x of [-4.25, 3.65]) {
  for (const z of [-1.25, 1.25]) {
    addBox([0.25, 1.95, 0.25], [x, -1.15, z], materials.darkSteel);
    addBox([0.48, 0.12, 0.48], [x, -2.0, z], materials.rubber);
  }
}

const frontRail = addBox([8.7, 0.26, 0.12], [-0.3, -0.7, 1.47], materials.darkSteel);
frontRail.castShadow = false;
for (let i = 0; i < 14; i += 1) {
  const marker = addBox(
    [0.3, 0.06, 0.025],
    [-4.18 + i * 0.61, -0.56, 1.544],
    i % 2 === 0 ? materials.seesaw : materials.darkSteel,
  );
  marker.rotation.z = -0.38;
  marker.castShadow = false;
}

const bowlingGroup = new THREE.Group();
bowlingGroup.position.set(-4.05, 0.43, 0.12);
scene.add(bowlingGroup);
addMesh(new THREE.SphereGeometry(0.43, 48, 32), materials.bowling, bowlingGroup);
const bowlingBand = addMesh(
  new THREE.TorusGeometry(0.432, 0.012, 8, 64),
  new THREE.MeshStandardMaterial({
    color: 0x4f7ba6,
    roughness: 0.25,
    metalness: 0.2,
  }),
  bowlingGroup,
);
bowlingBand.rotation.y = Math.PI / 2;
for (const [x, y] of [
  [-0.11, 0.13],
  [0.12, 0.14],
  [0.01, -0.09],
]) {
  const hole = addMesh(new THREE.SphereGeometry(0.077, 20, 12), materials.hole, bowlingGroup);
  hole.scale.z = 0.35;
  hole.position.set(x, y, 0.404);
}

const plankPivot = new THREE.Group();
plankPivot.position.set(-1.84, 0.025, 0.11);
scene.add(plankPivot);
const plankMesh = addBox([0.28, 1.62, 0.68], [0, 0.81, 0], materials.plank, plankPivot);
const plankEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(plankMesh.geometry),
  materials.plankEdge,
);
plankEdges.position.copy(plankMesh.position);
plankPivot.add(plankEdges);
for (const y of [0.45, 0.93, 1.31]) {
  const knot = addMesh(
    new THREE.CylinderGeometry(0.055, 0.055, 0.012, 20),
    materials.tableEdge,
    plankPivot,
  );
  knot.rotation.x = Math.PI / 2;
  knot.position.set(0.01, y, 0.347);
}
addBox([0.32, 0.12, 0.72], [0, 1.58, 0], materials.rubber, plankPivot);
const plankHinge = addCylinder(
  0.14,
  0.14,
  0.96,
  24,
  [-1.84, 0.14, 0.05],
  materials.steel,
);
plankHinge.rotation.x = Math.PI / 2;
addCylinder(0.075, 0.075, 0.99, 20, [-1.84, 0.14, 0.05], materials.darkSteel).rotation.x =
  Math.PI / 2;

const seesawPivot = new THREE.Group();
seesawPivot.position.set(0.72, 0.43, -0.02);
scene.add(seesawPivot);
const seesawBoard = addBox([2.9, 0.18, 0.68], [0, 0, 0], materials.seesaw, seesawPivot);
const seesawEdges = new THREE.LineSegments(
  new THREE.EdgesGeometry(seesawBoard.geometry),
  new THREE.LineBasicMaterial({ color: 0x5c351c }),
);
seesawPivot.add(seesawEdges);
for (const x of [-1.22, -0.61, 0, 0.61, 1.22]) {
  addBox([0.055, 0.19, 0.7], [x, 0, 0], materials.tableEdge, seesawPivot);
}
const strikePad = addBox([0.42, 0.09, 0.58], [-1.08, 0.135, 0], materials.rubber, seesawPivot);
strikePad.rotation.z = 0.01;

const supportGeometry = new THREE.BufferGeometry();
supportGeometry.setAttribute(
  "position",
  new THREE.Float32BufferAttribute(
    [
      -0.62, 0, 0.34, 0.62, 0, 0.34, 0, 0.82, 0.34,
      -0.62, 0, -0.34, 0, 0.82, -0.34, 0.62, 0, -0.34,
      -0.62, 0, -0.34, -0.62, 0, 0.34, 0, 0.82, 0.34,
      -0.62, 0, -0.34, 0, 0.82, 0.34, 0, 0.82, -0.34,
      0.62, 0, -0.34, 0, 0.82, -0.34, 0, 0.82, 0.34,
      0.62, 0, -0.34, 0, 0.82, 0.34, 0.62, 0, 0.34,
      -0.62, 0, -0.34, 0.62, 0, -0.34, 0.62, 0, 0.34,
      -0.62, 0, -0.34, 0.62, 0, 0.34, -0.62, 0, 0.34,
    ],
    3,
  ),
);
supportGeometry.computeVertexNormals();
const seesawSupport = addMesh(supportGeometry, materials.steel);
seesawSupport.position.set(0.72, 0.02, 0.03);
addCylinder(0.1, 0.1, 0.95, 24, [0.72, 0.43, 0.03], materials.darkSteel).rotation.x =
  Math.PI / 2;
addBox([1.45, 0.12, 0.92], [0.72, 0.07, 0.03], materials.darkSteel);

const launchCup = addCylinder(0.26, 0.2, 0.08, 32, [1.22, 0.15, 0], materials.steel, seesawPivot);
launchCup.scale.z = 0.72;
const launchCupRim = addMesh(
  new THREE.TorusGeometry(0.235, 0.032, 10, 32),
  materials.darkSteel,
  seesawPivot,
);
launchCupRim.position.set(1.22, 0.2, 0);
launchCupRim.rotation.x = Math.PI / 2;
const smallBall = addMesh(new THREE.SphereGeometry(0.22, 32, 24), materials.smallBall);

const bellStand = new THREE.Group();
scene.add(bellStand);
addBox([0.32, 0.16, 1.2], [3.02, 0.09, -0.18], materials.darkSteel, bellStand);
addBox([0.16, 3.95, 0.16], [3.16, 1.99, -0.18], materials.steel, bellStand);
addBox([1.12, 0.16, 0.16], [2.68, 3.88, -0.18], materials.steel, bellStand);
addCylinder(0.075, 0.075, 0.42, 16, [2.27, 3.66, -0.18], materials.darkSteel, bellStand);

const bellPivot = new THREE.Group();
bellPivot.position.set(2.27, 3.66, -0.18);
scene.add(bellPivot);
const bellProfile = [
  new THREE.Vector2(0.08, 0.77),
  new THREE.Vector2(0.2, 0.69),
  new THREE.Vector2(0.25, 0.5),
  new THREE.Vector2(0.31, 0.24),
  new THREE.Vector2(0.43, 0.06),
  new THREE.Vector2(0.46, 0),
];
const bell = addMesh(new THREE.LatheGeometry(bellProfile, 48), materials.brass, bellPivot);
bell.position.y = -0.96;
const bellLip = addMesh(new THREE.TorusGeometry(0.445, 0.045, 12, 48), materials.brass, bellPivot);
bellLip.rotation.x = Math.PI / 2;
bellLip.position.y = -0.96;
const clapperRod = addCylinder(0.025, 0.025, 0.58, 14, [0, -0.71, 0], materials.darkSteel, bellPivot);
const clapper = addMesh(new THREE.SphereGeometry(0.105, 24, 16), materials.brass, bellPivot);
clapper.position.y = -1.01;

const guardA = addBox([0.08, 0.42, 0.08], [-4.48, 0.22, -0.98], materials.red);
const guardB = addBox([0.08, 0.42, 0.08], [3.85, 0.22, -0.98], materials.red);
for (const guard of [guardA, guardB]) {
  addMesh(new THREE.SphereGeometry(0.08, 16, 10), materials.red).position.copy(
    guard.position.clone().add(new THREE.Vector3(0, 0.23, 0)),
  );
}

const ambient = new THREE.HemisphereLight(0xd8e6f4, 0x35383b, 2.15);
scene.add(ambient);
const keyLight = new THREE.SpotLight(0xffe1b0, 115, 16, Math.PI / 4.8, 0.55, 1.15);
keyLight.position.set(-3.6, 6.5, 5.8);
keyLight.target.position.set(-0.5, 0.6, 0);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.0003;
scene.add(keyLight, keyLight.target);
const rimLight = new THREE.PointLight(0x78aee8, 32, 10, 1.4);
rimLight.position.set(3.5, 4.6, -0.2);
scene.add(rimLight);
const bellLight = new THREE.PointLight(0xffc463, 18, 5, 1.6);
bellLight.position.set(2.1, 3.25, 1.3);
scene.add(bellLight);

const ballStartX = -4.05;
const ballContactX = -2.29;
const smallBallLaunchTime = 2.22;
const bellHitTime = 3.16;

function seesawAngleAt(t) {
  if (t < 1.82) return -0.045;
  if (t < smallBallLaunchTime) {
    return mix(-0.045, 0.245, smootherstep((t - 1.82) / (smallBallLaunchTime - 1.82)));
  }
  const u = t - smallBallLaunchTime;
  return 0.08 + 0.165 * Math.exp(-1.15 * u) * Math.cos(5.4 * u);
}

function attachedBallPosition(angle) {
  const localX = 1.22;
  const localY = 0.29;
  return new THREE.Vector3(
    seesawPivot.position.x + Math.cos(angle) * localX - Math.sin(angle) * localY,
    seesawPivot.position.y + Math.sin(angle) * localX + Math.cos(angle) * localY,
    0.11,
  );
}

const launchPosition = attachedBallPosition(seesawAngleAt(smallBallLaunchTime));
const preHitDuration = bellHitTime - smallBallLaunchTime;
const hitPosition = new THREE.Vector3(
  launchPosition.x + 0.63 * preHitDuration,
  launchPosition.y + 4.32 * preHitDuration - 2.4 * preHitDuration * preHitDuration,
  0.11,
);

function updateSmallBall(t, seesawAngle) {
  if (t <= smallBallLaunchTime) {
    smallBall.position.copy(attachedBallPosition(seesawAngle));
    smallBall.rotation.set(0, 0, 0);
    return;
  }

  if (t <= bellHitTime) {
    const u = t - smallBallLaunchTime;
    smallBall.position.set(
      launchPosition.x + 0.63 * u,
      launchPosition.y + 4.32 * u - 2.4 * u * u,
      0.11 + 0.03 * Math.sin(Math.PI * u / preHitDuration),
    );
    smallBall.rotation.z = -u * 3.8;
    return;
  }

  const u = t - bellHitTime;
  const airborneY = hitPosition.y + 1.05 * u - 2.8 * u * u;
  smallBall.position.x = hitPosition.x + 0.84 * u;
  smallBall.position.z = 0.11;
  if (airborneY > 0.23 || u < 1.16) {
    smallBall.position.y = Math.max(0.23, airborneY);
  } else {
    const bounceTime = u - 1.16;
    smallBall.position.y = 0.23 + 0.32 * Math.exp(-2.5 * bounceTime) * Math.abs(
      Math.sin(8.5 * bounceTime),
    );
  }
  smallBall.rotation.z = -preHitDuration * 3.8 - u * 4.2;
}

const cameraTarget = new THREE.Vector3();
function updateCamera(t) {
  const travel = smootherstep(t / 4.25);
  const settle = smoothstep((t - 2.5) / 2.2);
  camera.position.set(
    mix(-0.5, 0.18, travel),
    mix(3.2, 3.38, settle),
    mix(8.9, 8.58, travel),
  );
  cameraTarget.set(mix(-0.57, 0.09, travel), mix(1.02, 1.19, settle), 0.02);
  camera.lookAt(cameraTarget);
  camera.updateMatrixWorld(true);
}

let currentTime = 0;
let paused = false;
let clockOrigin = performance.now();

function updateScene(inputTime) {
  const t = Math.min(DURATION, Math.max(0, Number(inputTime) || 0));
  currentTime = t;

  const roll = smootherstep((t - 0.06) / 1.05);
  const bowlingX = mix(ballStartX, ballContactX, roll);
  bowlingGroup.position.x = bowlingX;
  bowlingGroup.rotation.z = -(bowlingX - ballStartX) / 0.43;

  let plankAngle = 0;
  if (t >= 1.1 && t < 1.86) {
    plankAngle = 1.47 * easeInCubic((t - 1.1) / 0.76);
  } else if (t >= 1.86) {
    const u = t - 1.86;
    plankAngle = 1.47 - 0.035 * Math.exp(-2.1 * u) * Math.sin(8.2 * u);
  }
  plankPivot.rotation.z = -plankAngle;

  const seesawAngle = seesawAngleAt(t);
  seesawPivot.rotation.z = seesawAngle;
  updateSmallBall(t, seesawAngle);

  if (t < bellHitTime) {
    bellPivot.rotation.z = 0;
    clapperRod.rotation.z = 0;
    clapper.position.x = 0;
  } else {
    const u = t - bellHitTime;
    const bellSwing = -0.25 * Math.exp(-0.55 * u) * Math.sin(9.4 * u + 0.45);
    const clapperSwing = 0.34 * Math.exp(-0.72 * u) * Math.sin(13.5 * u + 0.9);
    bellPivot.rotation.z = bellSwing;
    clapperRod.rotation.z = clapperSwing;
    clapper.position.x = 0.12 * Math.sin(clapperSwing);
  }

  updateCamera(t);
  renderer.render(scene, camera);
}

function getCameraState() {
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

function getSceneState() {
  return {
    time: currentTime,
    camera: getCameraState(),
    bowling: {
      position: bowlingGroup.position.toArray(),
      rotation: bowlingGroup.rotation.toArray(),
    },
    plankRotation: plankPivot.rotation.z,
    seesawRotation: seesawPivot.rotation.z,
    smallBall: {
      position: smallBall.position.toArray(),
      rotation: smallBall.rotation.toArray(),
    },
    bellRotation: bellPivot.rotation.z,
    clapperRotation: clapperRod.rotation.z,
  };
}

function pause() {
  paused = true;
  updateScene(currentTime);
}

function seek(seconds) {
  paused = true;
  updateScene(seconds);
  return getSceneState();
}

function play() {
  clockOrigin = performance.now() - currentTime * 1000;
  paused = false;
}

window.reconstruction = {
  pause,
  play,
  seek,
  getCameraState,
  getSceneState,
  metadata: { width: WIDTH, height: HEIGHT, fps: FPS, frames: FRAMES, duration: DURATION },
};

function animate(now) {
  requestAnimationFrame(animate);
  if (!paused) {
    const elapsed = (now - clockOrigin) / 1000;
    updateScene(elapsed % DURATION);
  }
}

updateScene(0);
requestAnimationFrame(animate);
