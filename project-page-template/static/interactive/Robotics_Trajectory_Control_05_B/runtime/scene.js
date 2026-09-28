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

function createHumanoidLeg(parent, side, materials) { window.__bfTrace?.add(266);
  const hip = new THREE.Group();
  hip.position.set(side * 0.22, -0.02, 0);
  parent.add(hip);

  cylinder(0.13, 0.13, 0.16, materials.joint, [0, 0, 0], hip, 24).rotation.z = Math.PI / 2;
  const upper = new THREE.Group();
  hip.add(upper);
  cylinder(0.1, 0.135, 0.48, materials.shell, [0, -0.24, 0], upper, 20);
  box([0.19, 0.31, 0.065], materials.panel, [0, -0.22, 0.105], upper);

  const lower = new THREE.Group();
  lower.position.y = -0.48;
  upper.add(lower);
  cylinder(0.12, 0.12, 0.16, materials.joint, [0, 0, 0], lower, 24).rotation.z = Math.PI / 2;
  const kneeCap = mesh(new THREE.SphereGeometry(0.115, 20, 14), materials.accent, lower);
  kneeCap.position.set(0, 0, 0.075);
  cylinder(0.075, 0.105, 0.45, materials.joint, [0, -0.225, -0.005], lower, 18);
  box([0.16, 0.33, 0.075], materials.shell, [0, -0.225, 0.085], lower);
  box([0.055, 0.25, 0.18], materials.shell, [side * 0.09, -0.23, -0.005], lower);

  const ankle = new THREE.Group();
  ankle.position.y = -0.45;
  lower.add(ankle);
  mesh(new THREE.SphereGeometry(0.09, 18, 12), materials.joint, ankle);
  cylinder(0.095, 0.11, 0.12, materials.accent, [0, -0.035, 0], ankle, 18);
  const foot = box([0.24, 0.13, 0.42], materials.sole, [0, -0.1, 0.09], ankle);
  foot.position.z = 0.11;
  box([0.2, 0.07, 0.3], materials.shell, [0, -0.025, 0.1], ankle);
  box([0.21, 0.08, 0.08], materials.accent, [0, -0.07, 0.29], ankle);

  return { hip, upper, lower, ankle, side };
}

function createHumanoidArm(parent, side, materials) { window.__bfTrace?.add(300);
  const shoulder = new THREE.Group();
  shoulder.position.set(side * 0.46, 0.82, 0);
  parent.add(shoulder);
  mesh(new THREE.SphereGeometry(0.14, 20, 14), materials.joint, shoulder);
  const shoulderShell = mesh(new THREE.SphereGeometry(0.165, 20, 14), materials.shell, shoulder);
  shoulderShell.scale.set(1.08, 0.88, 0.94);

  const upper = new THREE.Group();
  shoulder.add(upper);
  cylinder(0.085, 0.115, 0.4, materials.shell, [0, -0.2, 0], upper, 18);
  box([0.16, 0.25, 0.055], materials.panel, [0, -0.18, 0.085], upper);

  const elbow = new THREE.Group();
  elbow.position.y = -0.4;
  upper.add(elbow);
  cylinder(0.095, 0.095, 0.15, materials.joint, [0, 0, 0], elbow, 20).rotation.z = Math.PI / 2;
  cylinder(0.065, 0.085, 0.37, materials.joint, [0, -0.185, 0], elbow, 16);
  box([0.13, 0.26, 0.06], materials.shell, [0, -0.175, 0.07], elbow);

  const wrist = new THREE.Group();
  wrist.position.y = -0.37;
  elbow.add(wrist);
  cylinder(0.065, 0.065, 0.08, materials.joint, [0, 0, 0], wrist, 16);
  const hand = roundedPanel(0.15, 0.2, 0.13, 0.04, materials.sole, wrist);
  hand.position.y = -0.12;

  return { shoulder, upper, elbow, wrist, side };
}

function createHumanoid() { window.__bfTrace?.add(330);
  const root = new THREE.Group();
  root.scale.setScalar(0.92);
  scene.add(root);

  const materials = {
    shell: mats.robotShell.clone(),
    panel: mats.robotPanel.clone(),
    joint: mats.darkMetal.clone(),
    sole: mats.rubber.clone(),
    accent: mats.orange.clone(),
    sensor: mats.lens.clone(),
    warning: mats.red.clone(),
  };
  materials.shell.color.setHex(0xd9e4e8);
  materials.shell.roughness = 0.34;
  materials.shell.metalness = 0.52;
  materials.panel.color.setHex(0x1d2b32);
  materials.joint.color.setHex(0x26343b);
  materials.sole.color.setHex(0x0d1417);
  materials.accent.color.setHex(0xff8b18);
  materials.accent.roughness = 0.45;
  materials.sensor.color.setHex(0x68eaff);
  materials.sensor.emissive.setHex(0x08768f);
  materials.sensor.emissiveIntensity = 2.1;

  const pelvis = new THREE.Group();
  root.add(pelvis);
  const pelvisShell = roundedPanel(0.55, 0.28, 0.42, 0.09, materials.shell, pelvis);
  pelvisShell.position.y = 0.08;
  box([0.34, 0.17, 0.045], materials.panel, [0, 0.08, 0.235], pelvis);
  cylinder(0.16, 0.2, 0.18, materials.joint, [0, 0.27, 0], pelvis, 24);

  const torso = new THREE.Group();
  torso.position.y = 0.25;
  pelvis.add(torso);
  const chest = roundedPanel(0.72, 0.68, 0.42, 0.11, materials.shell, torso);
  chest.position.y = 0.36;
  const shoulderBridge = roundedPanel(0.86, 0.13, 0.3, 0.045, materials.joint, torso);
  shoulderBridge.position.y = 0.76;
  box([0.4, 0.38, 0.055], materials.panel, [0, 0.39, 0.235], torso);
  box([0.055, 0.38, 0.25], materials.accent, [-0.37, 0.38, 0], torso);
  box([0.055, 0.38, 0.25], materials.accent, [0.37, 0.38, 0], torso);
  box([0.46, 0.12, 0.035], materials.sensor, [0, 0.55, 0.275], torso);
  box([0.46, 0.48, 0.15], materials.panel, [0, 0.36, -0.27], torso);

  cylinder(0.105, 0.13, 0.2, materials.joint, [0, 0.84, 0], torso, 20);
  const headPivot = new THREE.Group();
  headPivot.position.y = 0.95;
  torso.add(headPivot);
  const head = roundedPanel(0.43, 0.43, 0.37, 0.1, materials.shell, headPivot);
  head.position.y = 0.13;
  box([0.34, 0.22, 0.045], materials.panel, [0, 0.14, 0.21], headPivot);
  box([0.27, 0.055, 0.025], materials.sensor, [0, 0.18, 0.24], headPivot);
  for (const side of [-1, 1]) {
    const ear = cylinder(0.065, 0.065, 0.055, materials.joint, [side * 0.235, 0.13, 0], headPivot, 20);
    ear.rotation.z = Math.PI / 2;
    const sideSensor = cylinder(0.038, 0.05, 0.06, materials.sensor, [side * 0.27, 0.13, 0], headPivot, 20);
    sideSensor.rotation.z = Math.PI / 2;
  }
  cylinder(0.075, 0.09, 0.11, materials.sensor, [0, 0.405, 0], headPivot, 24);

  const legs = [
    createHumanoidLeg(pelvis, -1, materials),
    createHumanoidLeg(pelvis, 1, materials),
  ];
  const arms = [
    createHumanoidArm(torso, -1, materials),
    createHumanoidArm(torso, 1, materials),
  ];

  return { root, pelvis, torso, headPivot, legs, arms, materials };
}

const robot = createHumanoid();
const lookTarget = new THREE.Vector3();

function smootherstep(value) { window.__bfTrace?.add(407);
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function routePosition(time) { window.__bfTrace?.add(412);
  const u = smootherstep(time / DURATION);
  return THREE.MathUtils.lerp(-7.5, 5.7, u);
}

function updateRobot(time) { window.__bfTrace?.add(417);
  const z = routePosition(time);
  const ground = rampHeight(z);
  const slope = rampSlope(z);
  const traveled = z + 7.5;
  const gait = traveled * 5.15;
  const speedEnvelope = Math.sin(Math.PI * THREE.MathUtils.clamp(time / DURATION, 0, 1));
  const bob = 0.025 * Math.sin(gait * 2) * speedEnvelope;

  robot.root.position.set(0, 1.02 + ground + bob, z);
  robot.root.rotation.x = -Math.atan(slope) * 0.72;
  robot.pelvis.position.x = 0.025 * Math.sin(gait) * speedEnvelope;
  robot.pelvis.rotation.y = 0.045 * Math.sin(gait) * speedEnvelope;
  robot.pelvis.rotation.z = 0.02 * Math.sin(gait) * speedEnvelope;
  robot.torso.rotation.x = Math.atan(slope) * 0.9;
  robot.torso.rotation.y = -0.08 * Math.sin(gait) * speedEnvelope;
  robot.torso.rotation.z = -0.014 * Math.sin(gait) * speedEnvelope;
  robot.headPivot.rotation.y = 0.035 * Math.sin(gait + 0.4) * speedEnvelope;
  robot.headPivot.rotation.x = -Math.atan(slope) * 0.18;

  robot.legs.forEach((leg) => {
    const phase = leg.side < 0 ? 0 : Math.PI;
    const wave = Math.sin(gait + phase);
    const lift = Math.max(0, wave);
    leg.upper.rotation.x = -0.42 * wave * speedEnvelope;
    leg.lower.rotation.x = 0.08 + (0.55 * lift + 0.08 * Math.max(0, -wave)) * speedEnvelope;
    leg.ankle.rotation.x = -Math.atan(slope) * 0.28 - leg.upper.rotation.x - leg.lower.rotation.x - 0.08 * lift * speedEnvelope;
    const strideOffset = 0.16 * wave * speedEnvelope;
    leg.hip.position.y = -0.02 + rampHeight(z + strideOffset) - ground;
  });

  robot.arms.forEach((arm) => {
    const phase = arm.side < 0 ? 0 : Math.PI;
    const wave = Math.sin(gait + phase);
    arm.upper.rotation.x = 0.42 * wave * speedEnvelope;
    arm.upper.rotation.z = arm.side * -0.035;
    arm.elbow.rotation.x = -0.24 - 0.16 * Math.max(0, -wave) * speedEnvelope;
    arm.wrist.rotation.x = 0.04 * Math.sin(gait * 2 + phase) * speedEnvelope;
  });

  return { z, ground };
}

function updateCamera(z, ground) { window.__bfTrace?.add(460);
  camera.position.set(6.2, 2.78 + ground * 0.22, z + 0.62);
  lookTarget.set(0, 0.82 + ground * 0.68, z + 1.42);
  camera.lookAt(lookTarget);
  camera.updateMatrixWorld(true);
}

function renderAt(time) { window.__bfTrace?.add(467);
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

function tick(now) { window.__bfTrace?.add(481);
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
