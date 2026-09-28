import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAMES = 124;
const DURATION = FRAMES / FPS;

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
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
renderer.toneMappingExposure = 1.16;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xbad8e6);
scene.fog = new THREE.Fog(0xbad8e6, 23, 52);

const camera = new THREE.PerspectiveCamera(37, WIDTH / HEIGHT, 0.1, 100);

const hemi = new THREE.HemisphereLight(0xddefff, 0x58614f, 2.0);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1d3, 2.65);
sun.position.set(-8, 15, -7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -11;
sun.shadow.camera.right = 11;
sun.shadow.camera.top = 10;
sun.shadow.camera.bottom = -8;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 40;
sun.shadow.bias = -0.00012;
scene.add(sun);

const fill = new THREE.DirectionalLight(0xc5e3ff, 1.15);
fill.position.set(9, 7, -5);
scene.add(fill);

const mats = {
  concrete: new THREE.MeshStandardMaterial({ color: 0x798381, roughness: 0.9, metalness: 0.02 }),
  concreteDark: new THREE.MeshStandardMaterial({ color: 0x5d6463, roughness: 0.95 }),
  paintWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x33332d, emissiveIntensity: 0.18, roughness: 0.82 }),
  paintYellow: new THREE.MeshStandardMaterial({ color: 0xffca24, emissive: 0x563600, emissiveIntensity: 0.22, roughness: 0.72 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xf26522, roughness: 0.57 }),
  coneWhite: new THREE.MeshStandardMaterial({ color: 0xf4f0dc, roughness: 0.68 }),
  metal: new THREE.MeshStandardMaterial({ color: 0xa4b0b4, roughness: 0.3, metalness: 0.82 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x2b363b, roughness: 0.3, metalness: 0.86 }),
  robotShell: new THREE.MeshStandardMaterial({ color: 0xe2e5e1, roughness: 0.25, metalness: 0.62 }),
  robotPanel: new THREE.MeshStandardMaterial({ color: 0x303d42, roughness: 0.34, metalness: 0.75 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x161b1c, roughness: 0.88, metalness: 0.05 }),
  lens: new THREE.MeshStandardMaterial({ color: 0x79e7ff, emissive: 0x0b637a, emissiveIntensity: 1.7, roughness: 0.2, metalness: 0.45 }),
  hazard: new THREE.MeshStandardMaterial({ color: 0xffc51c, emissive: 0x4a3100, emissiveIntensity: 0.16, roughness: 0.55 }),
  red: new THREE.MeshStandardMaterial({ color: 0xd73b2c, emissive: 0x541009, emissiveIntensity: 0.45, roughness: 0.4 }),
  darkFence: new THREE.MeshStandardMaterial({ color: 0x52646a, roughness: 0.48, metalness: 0.68 }),
  grass: new THREE.MeshStandardMaterial({ color: 0x6d805d, roughness: 1.0 }),
};

function mesh(geometry, material, parent = scene) { window.__bfTrace?.add(69);
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function box(size, material, position, parent = scene) { window.__bfTrace?.add(77);
  const object = mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material, parent);
  object.position.set(...position);
  return object;
}

function cylinder(radiusTop, radiusBottom, height, material, position, parent = scene, segments = 20) { window.__bfTrace?.add(83);
  const object = mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material, parent);
  object.position.set(...position);
  return object;
}

function roundedPanel(width, height, depth, radius, material, parent) { window.__bfTrace?.add(89);
  const shape = new THREE.Shape();
  const x = width / 2;
  const y = height / 2;
  shape.moveTo(-x + radius, -y);
  shape.lineTo(x - radius, -y);
  shape.quadraticCurveTo(x, -y, x, -y + radius);
  shape.lineTo(x, y - radius);
  shape.quadraticCurveTo(x, y, x - radius, y);
  shape.lineTo(-x + radius, y);
  shape.quadraticCurveTo(-x, y, -x, y - radius);
  shape.lineTo(-x, -y + radius);
  shape.quadraticCurveTo(-x, -y, -x + radius, -y);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: radius * 0.35,
    bevelThickness: radius * 0.25,
  });
  geometry.center();
  return mesh(geometry, material, parent);
}

function addLaneStripe(x, z, width, length, material = mats.paintWhite) { window.__bfTrace?.add(114);
  return box([width, 0.018, length], material, [x, 0.018, z]);
}

box([23, 0.28, 36], mats.concrete, [0, -0.16, 3]);
box([6.0, 0.06, 36], mats.concreteDark, [0, -0.01, 3]);
box([5.75, 0.07, 36], mats.concrete, [0, 0.005, 3]);

addLaneStripe(-2.45, 3, 0.16, 34, mats.paintYellow);
addLaneStripe(2.45, 3, 0.16, 34, mats.paintYellow);
for (let z = -12; z <= 18; z += 2.7) {
  addLaneStripe(0, z, 0.11, 1.3);
}

function addLaneArrow(z) { window.__bfTrace?.add(128);
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.72);
  shape.lineTo(0.52, 0.08);
  shape.lineTo(0.2, 0.08);
  shape.lineTo(0.2, -0.68);
  shape.lineTo(-0.2, -0.68);
  shape.lineTo(-0.2, 0.08);
  shape.lineTo(-0.52, 0.08);
  shape.closePath();
  const arrow = mesh(new THREE.ShapeGeometry(shape), mats.paintWhite);
  arrow.rotation.x = Math.PI / 2;
  arrow.position.set(0, 0.035, z);
  arrow.castShadow = false;
}

addLaneArrow(4.15);
addLaneArrow(10.8);

for (let i = 0; i < 22; i += 1) {
  const side = i % 2 === 0 ? -1 : 1;
  const x = side * (3.4 + ((i * 37) % 30) / 10);
  const z = -11 + ((i * 47) % 290) / 10;
  const crack = box([0.025, 0.009, 0.65 + (i % 4) * 0.15], mats.concreteDark, [x, 0.012, z]);
  crack.rotation.y = ((i * 29) % 80 - 40) * Math.PI / 180;
}

box([9, 0.22, 36], mats.grass, [-16, -0.2, 3]);
box([9, 0.22, 36], mats.grass, [16, -0.2, 3]);

function createCone(x, z) { window.__bfTrace?.add(158);
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);
  box([0.68, 0.09, 0.68], mats.rubber, [0, 0.055, 0], group);
  cylinder(0.055, 0.29, 0.74, mats.orange, [0, 0.47, 0], group, 32);
  cylinder(0.16, 0.21, 0.18, mats.coneWhite, [0, 0.43, 0], group, 32);
  cylinder(0.045, 0.075, 0.07, mats.orange, [0, 0.875, 0], group, 24);
  return group;
}

createCone(-1.35, -4.75);
createCone(1.35, -4.75);

function rampHeight(z) { window.__bfTrace?.add(172);
  if (z <= -1.9 || z >= 1.9) return 0;
  if (z < -0.42) return 0.64 * (z + 1.9) / 1.48;
  if (z <= 0.42) return 0.64;
  return 0.64 * (1.9 - z) / 1.48;
}

function rampSlope(z) { window.__bfTrace?.add(179);
  if (z > -1.9 && z < -0.42) return 0.64 / 1.48;
  if (z > 0.42 && z < 1.9) return -0.64 / 1.48;
  return 0;
}

const ramp = new THREE.Group();
scene.add(ramp);
const rampAngle = Math.atan2(0.64, 1.48);
const rampLength = Math.hypot(0.64, 1.48);
const upRamp = box([4.1, 0.13, rampLength], mats.metal, [0, 0.32, -1.16], ramp);
upRamp.rotation.x = -rampAngle;
const topRamp = box([4.1, 0.13, 0.84], mats.metal, [0, 0.575, 0], ramp);
const downRamp = box([4.1, 0.13, rampLength], mats.metal, [0, 0.32, 1.16], ramp);
downRamp.rotation.x = rampAngle;
box([3.8, 0.36, 0.62], mats.darkMetal, [0, 0.25, 0], ramp);
for (const side of [-1, 1]) {
  const upEdge = box([0.09, 0.1, rampLength], mats.hazard, [side * 2.01, 0.40, -1.16], ramp);
  upEdge.rotation.x = -rampAngle;
  const downEdge = box([0.09, 0.1, rampLength], mats.hazard, [side * 2.01, 0.40, 1.16], ramp);
  downEdge.rotation.x = rampAngle;
  box([0.09, 0.1, 0.84], mats.hazard, [side * 2.01, 0.655, 0], ramp);
}
for (let z = -1.58; z <= 1.58; z += 0.39) {
  const h = rampHeight(z);
  const strip = box([3.75, 0.025, 0.055], mats.darkMetal, [0, h + 0.073, z], ramp);
  strip.rotation.x = z < -0.42 ? -rampAngle : z > 0.42 ? rampAngle : 0;
}

function createGatePanel(parent, direction) { window.__bfTrace?.add(208);
  const panel = new THREE.Group();
  panel.position.set(direction * 3.12, 0, 7.75);
  panel.rotation.y = direction * -1.22;
  parent.add(panel);
  box([0.09, 1.72, 0.09], mats.darkFence, [direction * 0.92, 1.25, 0], panel);
  box([0.09, 1.72, 0.09], mats.darkFence, [direction * 0.05, 1.25, 0], panel);
  box([0.96, 0.09, 0.09], mats.darkFence, [direction * 0.48, 0.42, 0], panel);
  box([0.96, 0.09, 0.09], mats.darkFence, [direction * 0.48, 2.08, 0], panel);
  for (let i = 1; i <= 4; i += 1) {
    box([0.035, 1.56, 0.035], mats.metal, [direction * (0.05 + i * 0.175), 1.25, 0], panel);
  }
  for (let i = 1; i <= 5; i += 1) {
    box([0.86, 0.03, 0.035], mats.metal, [direction * 0.48, 0.42 + i * 0.276, 0], panel);
  }
}

const gate = new THREE.Group();
scene.add(gate);
for (const side of [-1, 1]) {
  box([0.3, 2.82, 0.3], mats.darkFence, [side * 3.25, 1.39, 7.75], gate);
  box([0.52, 0.18, 0.52], mats.metal, [side * 3.25, 2.84, 7.75], gate);
  cylinder(0.18, 0.25, 0.28, mats.concreteDark, [side * 3.25, 0.14, 7.75], gate, 16);
}
box([6.8, 0.24, 0.3], mats.darkFence, [0, 2.7, 7.75], gate);
for (let x = -2.95; x <= 2.95; x += 0.48) {
  const hazard = box([0.23, 0.27, 0.04], Math.round((x + 2.95) / 0.48) % 2 ? mats.hazard : mats.rubber, [x, 2.7, 7.57], gate);
  hazard.rotation.z = -0.35;
}
createGatePanel(gate, -1);
createGatePanel(gate, 1);

function fenceSection(x, z, length) { window.__bfTrace?.add(240);
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);
  for (let dz = -length / 2; dz <= length / 2 + 0.01; dz += 2) {
    box([0.11, 2.25, 0.11], mats.darkFence, [0, 1.1, dz], group);
  }
  box([0.07, 0.07, length], mats.darkFence, [0, 0.18, 0], group);
  box([0.07, 0.07, length], mats.darkFence, [0, 2.18, 0], group);
  for (let dz = -length / 2; dz <= length / 2; dz += 0.42) {
    box([0.025, 1.93, 0.025], mats.metal, [0, 1.17, dz], group);
  }
  for (let y = 0.32; y <= 2.05; y += 0.34) {
    box([0.025, 0.025, length], mats.metal, [0, y, 0], group);
  }
}

fenceSection(-8.1, 3, 30);
fenceSection(8.1, 3, 30);

box([12, 4.7, 6], new THREE.MeshStandardMaterial({ color: 0x62727a, roughness: 0.78 }), [-8.5, 2.2, 19]);
box([12.6, 0.3, 6.5], mats.darkMetal, [-8.5, 4.65, 19]);
for (let x = -12; x <= -5; x += 2.3) {
  box([1.3, 1.85, 0.1], mats.robotPanel, [x, 1.45, 15.98]);
}

function createLeg(parent, side, fore, index) { window.__bfTrace?.add(266);
  const hip = new THREE.Group();
  hip.position.set(side * 0.48, -0.17, fore * 0.48);
  parent.add(hip);

  cylinder(0.14, 0.14, 0.18, mats.darkMetal, [0, 0, 0], hip, 20).rotation.z = Math.PI / 2;
  const upper = new THREE.Group();
  hip.add(upper);
  const upperBone = cylinder(0.085, 0.11, 0.44, mats.robotShell, [0, -0.22, 0], upper, 16);
  upperBone.scale.z = 0.82;
  cylinder(0.12, 0.12, 0.13, mats.darkMetal, [0, -0.44, 0], upper, 20).rotation.z = Math.PI / 2;
  const kneeCap = mesh(new THREE.SphereGeometry(0.078, 16, 10), mats.orange, upper);
  kneeCap.position.set(side * 0.09, -0.44, 0);

  const lower = new THREE.Group();
  lower.position.y = -0.44;
  upper.add(lower);
  const lowerBone = cylinder(0.065, 0.085, 0.43, mats.darkMetal, [0, -0.205, 0.035], lower, 14);
  lowerBone.rotation.x = -0.16;
  const foot = box([0.24, 0.12, 0.34], mats.rubber, [0, -0.43, 0.09], lower);
  foot.rotation.x = 0.06;

  return { hip, upper, lower, fore, side, index };
}

function createRobotDog() { window.__bfTrace?.add(291);
  const root = new THREE.Group();
  scene.add(root);

  const body = new THREE.Group();
  root.add(body);
  const shell = roundedPanel(0.92, 0.64, 1.32, 0.15, mats.robotShell, body);
  box([0.72, 0.16, 1.08], mats.robotPanel, [0, 0.31, 0], body);
  box([0.1, 0.35, 0.92], mats.orange, [0.47, 0.02, 0], body);
  box([0.1, 0.35, 0.92], mats.orange, [-0.47, 0.02, 0], body);
  box([0.025, 0.08, 0.2], mats.lens, [0.525, 0.08, -0.27], body);
  for (const z of [-0.35, 0, 0.35]) {
    box([0.94, 0.035, 0.055], mats.darkMetal, [0, 0.39, z], body);
  }

  const neck = new THREE.Group();
  neck.position.set(0, 0.16, 0.7);
  neck.rotation.x = -0.13;
  body.add(neck);
  cylinder(0.16, 0.19, 0.34, mats.darkMetal, [0, 0.08, 0], neck, 20).rotation.x = Math.PI / 2;
  const head = roundedPanel(0.68, 0.48, 0.56, 0.1, mats.robotShell, neck);
  head.position.set(0, 0.08, 0.33);
  for (const x of [-0.2, 0.2]) {
    const ear = mesh(new THREE.ConeGeometry(0.11, 0.27, 4), mats.darkMetal, neck);
    ear.position.set(x, 0.43, 0.31);
    ear.rotation.y = Math.PI / 4;
    ear.rotation.z = x * -0.35;
  }
  box([0.54, 0.23, 0.05], mats.robotPanel, [0, 0.11, 0.63], neck);
  for (const x of [-0.17, 0.17]) {
    const eye = cylinder(0.065, 0.065, 0.045, mats.lens, [x, 0.13, 0.665], neck, 24);
    eye.rotation.x = Math.PI / 2;
  }
  box([0.25, 0.035, 0.05], mats.red, [0, -0.055, 0.665], neck);

  const antenna = cylinder(0.018, 0.025, 0.32, mats.darkMetal, [0.2, 0.58, 0.18], body, 12);
  antenna.rotation.z = -0.08;
  cylinder(0.055, 0.055, 0.08, mats.red, [0.21, 0.75, 0.18], body, 16);
  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 0.02, -0.62);
  body.add(tailPivot);
  const tail = cylinder(0.035, 0.055, 0.48, mats.darkMetal, [0, 0.27, -0.17], tailPivot, 12);
  tail.rotation.x = -0.72;
  const tailLight = cylinder(0.06, 0.06, 0.11, mats.red, [0, 0.44, -0.34], tailPivot, 14);
  tailLight.rotation.x = -0.72;

  const legs = [
    createLeg(body, -1, 1, 0),
    createLeg(body, 1, 1, 1),
    createLeg(body, -1, -1, 2),
    createLeg(body, 1, -1, 3),
  ];
  return { root, body, neck, tailPivot, legs };
}

const robot = createRobotDog();
const lookTarget = new THREE.Vector3();

function smootherstep(value) { window.__bfTrace?.add(349);
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function routePosition(time) { window.__bfTrace?.add(354);
  const u = smootherstep(time / DURATION);
  return THREE.MathUtils.lerp(-7.5, 5.7, u);
}

function updateRobot(time) { window.__bfTrace?.add(359);
  const z = routePosition(time);
  const ground = rampHeight(z);
  const slope = rampSlope(z);
  const traveled = z + 7.5;
  const gait = traveled * 5.15;
  const speedEnvelope = Math.sin(Math.PI * THREE.MathUtils.clamp(time / DURATION, 0, 1));
  const bob = 0.025 * Math.sin(gait * 2) * speedEnvelope;

  robot.root.position.set(0, 0.94 + ground + bob, z);
  robot.root.rotation.x = -Math.atan(slope) * 0.72;
  robot.body.rotation.z = 0.018 * Math.sin(gait) * speedEnvelope;
  robot.neck.rotation.x = -0.13 + 0.05 * Math.sin(gait * 2 + 0.5) * speedEnvelope;
  robot.tailPivot.rotation.y = 0.22 * Math.sin(gait * 0.72) * speedEnvelope;
  robot.tailPivot.rotation.z = 0.04 * Math.sin(gait * 1.44) * speedEnvelope;

  robot.legs.forEach((leg, index) => {
    const diagonalPhase = index === 0 || index === 3 ? 0 : Math.PI;
    const wave = Math.sin(gait + diagonalPhase);
    const lift = Math.max(0, wave);
    const swing = 0.38 * wave * speedEnvelope;
    leg.upper.rotation.x = swing;
    leg.lower.rotation.x = -0.18 - 0.55 * lift * speedEnvelope + 0.12 * Math.min(0, wave) * speedEnvelope;
    const localZ = z + leg.fore * 0.48;
    leg.hip.position.y = -0.17 + rampHeight(localZ) - ground;
  });

  return { z, ground };
}

function updateCamera(z, ground) { window.__bfTrace?.add(389);
  camera.position.set(6.2, 2.78 + ground * 0.22, z + 0.62);
  lookTarget.set(0, 0.82 + ground * 0.68, z + 1.42);
  camera.lookAt(lookTarget);
  camera.updateMatrixWorld(true);
}

function renderAt(time) { window.__bfTrace?.add(396);
  const t = THREE.MathUtils.clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  const state = updateRobot(t);
  updateCamera(state.z, state.ground);
  renderer.render(scene, camera);
  return t;
}

let currentTime = 0;
let playing = true;
let startTime = performance.now();
let startOffset = 0;
let animationFrame = 0;

function tick(now) { window.__bfTrace?.add(410);
  if (!playing) return;
  currentTime = ((now - startTime) / 1000 + startOffset) % DURATION;
  renderAt(currentTime);
  animationFrame = requestAnimationFrame(tick);
}

window.reconstruction = {
  pause() {
    playing = false;
    cancelAnimationFrame(animationFrame);
  },
  seek(seconds) {
    currentTime = renderAt(seconds);
    startOffset = currentTime;
    startTime = performance.now();
    return currentTime;
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
};

renderAt(0);
animationFrame = requestAnimationFrame(tick);
