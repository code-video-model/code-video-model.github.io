import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;
const PENDULUM_COUNT = 11;
const PIVOT_Y = 2.05;
const PENDULUM_LENGTH = 2.55;
const SPACING = 0.78;

const canvas = document.getElementById("stage");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x101923);
scene.fog = new THREE.Fog(0x101923, 11, 24);

const camera = new THREE.PerspectiveCamera(39, WIDTH / HEIGHT, 0.1, 80);
camera.position.set(0, 2.6, 8.8);

const mats = {
  steel: new THREE.MeshStandardMaterial({
    color: 0x778795,
    metalness: 0.83,
    roughness: 0.27,
  }),
  darkSteel: new THREE.MeshStandardMaterial({
    color: 0x34434d,
    metalness: 0.88,
    roughness: 0.28,
  }),
  edgeSteel: new THREE.MeshStandardMaterial({
    color: 0xa8bac5,
    metalness: 0.75,
    roughness: 0.18,
  }),
  brass: new THREE.MeshStandardMaterial({
    color: 0xb7822d,
    metalness: 0.79,
    roughness: 0.21,
  }),
  brassDark: new THREE.MeshStandardMaterial({
    color: 0x745125,
    metalness: 0.72,
    roughness: 0.3,
  }),
  motor: new THREE.MeshStandardMaterial({
    color: 0xbe3026,
    emissive: 0x260300,
    emissiveIntensity: 0.18,
    metalness: 0.63,
    roughness: 0.24,
  }),
  motorDark: new THREE.MeshStandardMaterial({
    color: 0x381513,
    metalness: 0.52,
    roughness: 0.34,
  }),
  cable: new THREE.MeshStandardMaterial({
    color: 0xe07b26,
    emissive: 0x321000,
    emissiveIntensity: 0.4,
    metalness: 0.68,
    roughness: 0.23,
  }),
  rubber: new THREE.MeshStandardMaterial({
    color: 0x11161a,
    metalness: 0.05,
    roughness: 0.72,
  }),
  bench: new THREE.MeshStandardMaterial({
    color: 0x36434d,
    metalness: 0.3,
    roughness: 0.42,
  }),
  floor: new THREE.MeshStandardMaterial({
    color: 0x374857,
    metalness: 0.08,
    roughness: 0.68,
  }),
  wall: new THREE.MeshStandardMaterial({
    color: 0x1e2c38,
    metalness: 0.12,
    roughness: 0.72,
  }),
  wallInset: new THREE.MeshStandardMaterial({
    color: 0x2b3f4f,
    metalness: 0.24,
    roughness: 0.55,
  }),
  warning: new THREE.MeshStandardMaterial({
    color: 0xe69d32,
    emissive: 0x3f1600,
    emissiveIntensity: 0.45,
    metalness: 0.32,
    roughness: 0.35,
  }),
  lamp: new THREE.MeshStandardMaterial({
    color: 0xffba58,
    emissive: 0xff5a08,
    emissiveIntensity: 2.2,
    metalness: 0.12,
    roughness: 0.24,
  }),
};

function mesh(geometry, material, position, rotation = [0, 0, 0]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  scene.add(object);
  return object;
}

function addBox(size, material, position, rotation = [0, 0, 0]) {
  return mesh(new THREE.BoxGeometry(...size), material, position, rotation);
}

function addCylinder(radius, depth, material, position, rotation = [0, 0, 0], radialSegments = 24) {
  return mesh(
    new THREE.CylinderGeometry(radius, radius, depth, radialSegments),
    material,
    position,
    rotation,
  );
}

// Laboratory room and workbench establish the scale of a real experiment.
addBox([26, 0.18, 18], mats.floor, [0, -2.24, 1.5]);
addBox([26, 11, 0.18], mats.wall, [0, 2.9, -3.15]);
for (let x = -9; x <= 9; x += 3) {
  addBox([0.035, 8, 0.04], mats.wallInset, [x, 1.8, -3.04]);
}
for (let x = -8; x <= 8; x += 4) {
  addBox([3.45, 1.1, 0.08], mats.wallInset, [x, 1.5, -3.02]);
  addBox([3.45, 0.06, 0.12], mats.edgeSteel, [x, 0.92, -2.96]);
}
for (let x = -10; x <= 10; x += 2) {
  addBox([0.025, 0.012, 16], mats.edgeSteel, [x, -2.14, 1.5]);
}
for (let z = -2; z <= 8; z += 2) {
  addBox([22, 0.012, 0.025], mats.edgeSteel, [0, -2.14, z]);
}

addBox([10.8, 0.3, 2.3], mats.bench, [0, -1.35, 0]);
addBox([10.4, 0.12, 2.0], mats.edgeSteel, [0, -1.15, 0]);
for (const x of [-4.75, 4.75]) {
  for (const z of [-0.82, 0.82]) {
    addBox([0.18, 0.85, 0.18], mats.darkSteel, [x, -1.78, z]);
    addBox([0.45, 0.1, 0.45], mats.rubber, [x, -2.18, z]);
  }
}

// Rigid frame with diagonal braces and machined pivot beam.
addBox([10.15, 0.24, 0.42], mats.darkSteel, [0, -1.0, 0]);
addBox([9.85, 0.17, 0.31], mats.edgeSteel, [0, -0.91, 0]);
for (const x of [-4.65, 4.65]) {
  addBox([0.3, 3.55, 0.45], mats.darkSteel, [x, 0.71, 0]);
  addBox([0.17, 3.25, 0.22], mats.edgeSteel, [x, 0.71, 0.12]);
  addBox([0.22, 4.1, 0.18], mats.steel, [x * 0.52, 0.55, -1.52], [0, 0, x < 0 ? -0.86 : 0.86]);
  addBox([0.2, 0.2, 1.5], mats.darkSteel, [x, -0.9, -0.72]);
  addBox([0.2, 0.2, 1.5], mats.darkSteel, [x, 2.3, -0.72]);
}
addBox([9.72, 0.42, 0.62], mats.darkSteel, [0, 2.34, 0]);
addBox([9.35, 0.14, 0.66], mats.edgeSteel, [0, 2.5, 0.02]);
for (let x = -4.2; x <= 4.2; x += 0.6) {
  addCylinder(0.045, 0.05, mats.brassDark, [x, 2.52, 0.04], [Math.PI / 2, 0, 0], 16);
}

const pendulums = [];
const anchorLocal = new THREE.Vector3(0, -0.48, 0);
const anchors = [];

for (let i = 0; i < PENDULUM_COUNT; i += 1) {
  const x = (i - (PENDULUM_COUNT - 1) / 2) * SPACING;
  const pivot = new THREE.Group();
  pivot.position.set(x, PIVOT_Y, 0);
  scene.add(pivot);

  const axle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.105, 0.105, 0.76, 28),
    i === 0 ? mats.motor : mats.steel,
  );
  axle.rotation.x = Math.PI / 2;
  axle.castShadow = true;
  axle.receiveShadow = true;
  pivot.add(axle);

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.17, 0.17, 0.24, 28),
    i === 0 ? mats.warning : mats.darkSteel,
  );
  collar.rotation.x = Math.PI / 2;
  collar.position.z = 0.23;
  collar.castShadow = true;
  pivot.add(collar);

  const rod = new THREE.Mesh(
    new THREE.CylinderGeometry(0.028, 0.035, PENDULUM_LENGTH, 16),
    mats.edgeSteel,
  );
  rod.position.y = -PENDULUM_LENGTH / 2;
  rod.castShadow = true;
  rod.receiveShadow = true;
  pivot.add(rod);

  const couplingCollar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.075, 0.075, 0.13, 18),
    mats.cable,
  );
  couplingCollar.position.y = anchorLocal.y;
  couplingCollar.castShadow = true;
  pivot.add(couplingCollar);

  const bob = new THREE.Mesh(
    new THREE.SphereGeometry(i === 0 ? 0.3 : 0.275, 40, 24),
    i === 0 ? mats.motor : mats.brass,
  );
  bob.position.y = -PENDULUM_LENGTH;
  bob.castShadow = true;
  bob.receiveShadow = true;
  pivot.add(bob);

  const bobBand = new THREE.Mesh(
    new THREE.TorusGeometry(i === 0 ? 0.305 : 0.28, 0.026, 10, 40),
    i === 0 ? mats.warning : mats.brassDark,
  );
  bobBand.rotation.x = Math.PI / 2;
  bobBand.position.y = -PENDULUM_LENGTH;
  bobBand.castShadow = true;
  pivot.add(bobBand);

  pendulums.push({ pivot, bob, collar, angle: 0 });
  anchors.push(new THREE.Vector3());
}

function makeSpring() {
  const points = [];
  const turns = 6;
  const segments = 72;
  for (let i = 0; i <= segments; i += 1) {
    const u = i / segments;
    const angle = u * turns * Math.PI * 2;
    points.push(new THREE.Vector3(u - 0.5, Math.cos(angle) * 0.046, Math.sin(angle) * 0.046));
  }
  const curve = new THREE.CatmullRomCurve3(points);
  const spring = new THREE.Mesh(
    new THREE.TubeGeometry(curve, segments, 0.018, 8, false),
    mats.cable,
  );
  spring.castShadow = true;
  scene.add(spring);
  return spring;
}

const springs = Array.from({ length: PENDULUM_COUNT - 1 }, makeSpring);

const motor = new THREE.Group();
motor.position.set(-4.62, 2.05, -0.02);
scene.add(motor);
const motorBody = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.72, 32), mats.motor);
motorBody.rotation.x = Math.PI / 2;
motorBody.castShadow = true;
motor.add(motorBody);
const motorCap = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.08, 32), mats.motorDark);
motorCap.rotation.x = Math.PI / 2;
motorCap.position.z = 0.4;
motorCap.castShadow = true;
motor.add(motorCap);
const rotor = new THREE.Group();
rotor.position.z = 0.46;
motor.add(rotor);
const flywheel = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.045, 12, 36), mats.warning);
flywheel.castShadow = true;
rotor.add(flywheel);
for (let i = 0; i < 4; i += 1) {
  const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.035, 0.035), mats.warning);
  spoke.rotation.z = i * Math.PI / 4;
  rotor.add(spoke);
}
const eccentric = new THREE.Mesh(new THREE.SphereGeometry(0.065, 18, 12), mats.lamp);
eccentric.position.x = 0.15;
rotor.add(eccentric);
const statusLamp = new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 12), mats.lamp);
statusLamp.position.set(-0.2, 0.21, 0.31);
motor.add(statusLamp);

const driveLink = new THREE.Mesh(
  new THREE.CylinderGeometry(0.025, 0.025, 1, 12),
  mats.warning,
);
driveLink.castShadow = true;
scene.add(driveLink);

// Small instrument modules make the driven end visibly distinct.
addBox([1.05, 0.58, 0.72], mats.motorDark, [-4.35, -0.72, -0.48]);
for (let i = 0; i < 3; i += 1) {
  addCylinder(
    0.05,
    0.035,
    i === 0 ? mats.lamp : mats.edgeSteel,
    [-4.62 + i * 0.23, -0.65, -0.09],
    [Math.PI / 2, 0, 0],
    16,
  );
}
addBox([0.75, 0.055, 0.04], mats.warning, [-4.35, -0.9, -0.09]);

function smoothstep(a, b, value) {
  const x = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

const xAxis = new THREE.Vector3(1, 0, 0);
const direction = new THREE.Vector3();
const midpoint = new THREE.Vector3();

function placeBetween(object, a, b, localAxis = "x") {
  direction.subVectors(b, a);
  const length = direction.length();
  midpoint.addVectors(a, b).multiplyScalar(0.5);
  object.position.copy(midpoint);
  const baseAxis = localAxis === "x" ? xAxis : new THREE.Vector3(0, 1, 0);
  object.quaternion.setFromUnitVectors(baseAxis, direction.normalize());
  object.scale.set(localAxis === "x" ? length : 1, localAxis === "y" ? length : 1, 1);
}

function updatePendulums(time) {
  const omega = 4.9;
  const driveEnvelope = smoothstep(0, 0.38, time);
  for (let i = 0; i < PENDULUM_COUNT; i += 1) {
    let angle;
    if (i === 0) {
      angle = 0.62 * driveEnvelope * Math.cos(omega * time);
    } else {
      const arrival = 0.42 + (i - 1) * 0.22;
      const envelope = smoothstep(arrival, arrival + 1.15, time);
      const amplitude = 0.54 - i * 0.012;
      angle = amplitude * envelope * Math.cos(omega * time - i * 0.56);
    }
    pendulums[i].angle = angle;
    pendulums[i].pivot.rotation.x = angle;
    pendulums[i].pivot.updateMatrixWorld(true);
    anchors[i].copy(anchorLocal);
    pendulums[i].pivot.localToWorld(anchors[i]);
  }

  for (let i = 0; i < springs.length; i += 1) {
    placeBetween(springs[i], anchors[i], anchors[i + 1], "x");
  }

  rotor.rotation.z = -omega * time - Math.PI / 2;
  const rotorPoint = new THREE.Vector3(0.15, 0, 0);
  rotor.localToWorld(rotorPoint);
  placeBetween(driveLink, rotorPoint, anchors[0], "y");
  mats.lamp.emissiveIntensity = 1.65 + 0.55 * (0.5 + 0.5 * Math.cos(omega * time));
}

function updateCamera(time) {
  const u = smoothstep(0, DURATION, time);
  const ease = u * u * (3 - 2 * u);
  camera.position.set(
    THREE.MathUtils.lerp(-0.55, 1.6, ease),
    THREE.MathUtils.lerp(2.4, 3.25, ease),
    THREE.MathUtils.lerp(9.3, 8.4, ease),
  );
  const target = new THREE.Vector3(
    THREE.MathUtils.lerp(-0.25, 0, ease),
    THREE.MathUtils.lerp(0.25, 0.2, ease),
    THREE.MathUtils.lerp(0.05, -0.02, ease),
  );
  camera.fov = THREE.MathUtils.lerp(39.5, 39, ease);
  camera.updateProjectionMatrix();
  camera.lookAt(target);
}

const hemi = new THREE.HemisphereLight(0xb8dcff, 0x17202a, 1.7);
scene.add(hemi);
const key = new THREE.DirectionalLight(0xffe1bd, 3.6);
key.position.set(-3.8, 7.5, 6.8);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -7;
key.shadow.camera.right = 7;
key.shadow.camera.top = 6;
key.shadow.camera.bottom = -5;
key.shadow.camera.near = 1;
key.shadow.camera.far = 20;
scene.add(key);
const rim = new THREE.DirectionalLight(0x72b8ff, 2.2);
rim.position.set(5.5, 4.8, -4);
scene.add(rim);
const motorGlow = new THREE.PointLight(0xff6a1e, 2.8, 4.2, 2);
motorGlow.position.set(-4.4, 2.05, 1);
scene.add(motorGlow);

function renderAt(time) {
  updatePendulums(time);
  updateCamera(time);
  renderer.render(scene, camera);
}

let currentTime = 0;
let paused = false;
let previousStamp = performance.now();

function pause() {
  paused = true;
}

function seek(seconds) {
  const parsed = Number(seconds);
  currentTime = THREE.MathUtils.clamp(Number.isFinite(parsed) ? parsed : 0, 0, DURATION);
  renderAt(currentTime);
}

function getCameraState() {
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

window.reconstruction = { pause, seek, getCameraState };

function animate(stamp) {
  if (!paused) {
    const elapsed = Math.min((stamp - previousStamp) / 1000, 0.1);
    currentTime = (currentTime + elapsed) % DURATION;
    renderAt(currentTime);
  }
  previousStamp = stamp;
  requestAnimationFrame(animate);
}

renderAt(0);
requestAnimationFrame(animate);
