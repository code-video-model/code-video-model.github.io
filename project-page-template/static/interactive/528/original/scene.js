import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

const renderer = new THREE.WebGLRenderer({
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
renderer.toneMappingExposure = 0.96;
renderer.domElement.setAttribute("aria-label", "Gyroscopic precession experiment");
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111a20);
scene.fog = new THREE.Fog(0x111a20, 8.5, 15.5);

const camera = new THREE.PerspectiveCamera(39, WIDTH / HEIGHT, 0.05, 40);

const MAT = {
  tire: new THREE.MeshStandardMaterial({ color: 0x050708, roughness: 0.94, metalness: 0.02 }),
  rubberEdge: new THREE.MeshStandardMaterial({ color: 0x07090a, roughness: 0.9, metalness: 0.02 }),
  rim: new THREE.MeshPhysicalMaterial({ color: 0xc8d2d5, roughness: 0.2, metalness: 0.93, clearcoat: 0.5 }),
  spoke: new THREE.MeshStandardMaterial({ color: 0xcfd7d8, roughness: 0.24, metalness: 0.94 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x252d31, roughness: 0.34, metalness: 0.84 }),
  brushed: new THREE.MeshStandardMaterial({ color: 0x69777d, roughness: 0.32, metalness: 0.78 }),
  brass: new THREE.MeshPhysicalMaterial({ color: 0xb88128, roughness: 0.25, metalness: 0.82, clearcoat: 0.35 }),
  red: new THREE.MeshPhysicalMaterial({ color: 0xc62019, roughness: 0.28, metalness: 0.38, clearcoat: 0.65 }),
  redGlow: new THREE.MeshStandardMaterial({ color: 0xeb342a, roughness: 0.25, emissive: 0x5a0804, emissiveIntensity: 0.35 }),
  cable: new THREE.MeshStandardMaterial({ color: 0xd3aa58, roughness: 0.66, metalness: 0.2 }),
  steelFrame: new THREE.MeshStandardMaterial({ color: 0x27343a, roughness: 0.42, metalness: 0.73 }),
  frameEdges: new THREE.MeshStandardMaterial({ color: 0x56676e, roughness: 0.3, metalness: 0.82 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x657076, roughness: 0.94, metalness: 0.02 }),
  wall: new THREE.MeshStandardMaterial({ color: 0x263239, roughness: 0.84, metalness: 0.08 }),
  bench: new THREE.MeshStandardMaterial({ color: 0x364247, roughness: 0.68, metalness: 0.35 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x5c4330, roughness: 0.67, metalness: 0.02 }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x33b8cd, roughness: 0.32, metalness: 0.48, emissive: 0x07343c, emissiveIntensity: 0.7 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe5ecea, roughness: 0.5, metalness: 0.1 }),
};

function mesh(geometry, material, parent = scene, shadows = true) {
  const item = new THREE.Mesh(geometry, material);
  item.castShadow = shadows;
  item.receiveShadow = shadows;
  parent.add(item);
  return item;
}

function box(size, position, material, parent = scene, rotation = null) {
  const item = mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material, parent);
  item.position.set(...position);
  if (rotation) item.rotation.set(...rotation);
  return item;
}

function cylinderBetween(a, b, radius, material, parent, radialSegments = 12) {
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const direction = end.clone().sub(start);
  const item = mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), radialSegments),
    material,
    parent,
  );
  item.position.copy(start).add(end).multiplyScalar(0.5);
  item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return item;
}

function smoothstep(t) {
  const x = THREE.MathUtils.clamp(t, 0, 1);
  return x * x * (3 - 2 * x);
}

function addEnvironment() {
  const floor = mesh(new THREE.PlaneGeometry(22, 18), MAT.concrete);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = 0;
  floor.receiveShadow = true;
  floor.castShadow = false;

  box([14, 6, 0.24], [0, 3, -5.2], MAT.wall);
  box([0.22, 6, 12], [-7, 3, 0], MAT.wall);

  for (let x = -5.6; x <= 5.6; x += 1.4) {
    box([0.025, 5.2, 0.035], [x, 3, -5.055], MAT.frameEdges, scene, null).castShadow = false;
  }
  for (let y = 0.45; y < 5.7; y += 1.3) {
    box([12.7, 0.025, 0.035], [0, y, -5.05], MAT.frameEdges, scene, null).castShadow = false;
  }

  const lightPanelMat = new THREE.MeshStandardMaterial({
    color: 0xe8f1ec,
    emissive: 0xc9e4dd,
    emissiveIntensity: 2.8,
    roughness: 0.45,
  });
  box([2.15, 0.05, 0.82], [-1.9, 5.58, -1.0], lightPanelMat, scene, [0, 0, -0.03]).castShadow = false;
  box([2.15, 0.05, 0.82], [2.25, 5.58, -1.9], lightPanelMat, scene, [0, 0, 0.02]).castShadow = false;

  const bench = new THREE.Group();
  scene.add(bench);
  box([5.2, 0.2, 0.9], [2.2, 1.02, -4.42], MAT.wood, bench);
  for (const x of [-0.15, 4.55]) {
    box([0.15, 1.0, 0.65], [x, 0.5, -4.42], MAT.bench, bench);
  }
  box([1.05, 0.66, 0.48], [1.05, 1.45, -4.56], MAT.bench, bench);
  box([0.34, 0.42, 0.3], [2.05, 1.31, -4.54], MAT.red, bench);
  cylinderBetween([2.73, 1.2, -4.38], [2.73, 1.75, -4.38], 0.075, MAT.brass, bench);
  cylinderBetween([2.73, 1.75, -4.38], [3.16, 1.86, -4.38], 0.06, MAT.brass, bench);

  const cabinet = new THREE.Group();
  scene.add(cabinet);
  box([1.3, 2.35, 0.52], [-4.85, 1.2, -4.66], MAT.bench, cabinet);
  for (let y = 0.42; y < 2.25; y += 0.45) {
    box([1.14, 0.025, 0.04], [-4.85, y, -4.37], MAT.frameEdges, cabinet);
    box([0.1, 0.035, 0.05], [-4.85, y + 0.2, -4.34], MAT.brass, cabinet);
  }

  for (let i = 0; i < 5; i++) {
    const x = -5.7 + i * 2.42;
    cylinderBetween([x, 0.012, -1.7], [x + 1.18, 0.012, -1.7], 0.012, MAT.white, scene, 6);
  }
}

function addSuspensionRig() {
  const rig = new THREE.Group();
  scene.add(rig);

  box([1.15, 0.13, 0.88], [-1.02, 0.075, 0], MAT.darkMetal, rig);
  box([0.9, 0.06, 0.06], [-1.02, 0.155, -0.35], MAT.frameEdges, rig);
  box([0.9, 0.06, 0.06], [-1.02, 0.155, 0.35], MAT.frameEdges, rig);
  box([0.23, 4.16, 0.23], [-1.18, 2.16, 0], MAT.steelFrame, rig);
  box([1.55, 0.22, 0.24], [-0.52, 4.18, 0], MAT.steelFrame, rig);
  box([0.22, 0.28, 0.3], [0.18, 4.04, 0], MAT.darkMetal, rig);

  for (const z of [-0.27, 0.27]) {
    cylinderBetween([-1.18, 0.22, z], [-0.52, 1.72, z], 0.045, MAT.frameEdges, rig, 10);
  }

  const pulley = mesh(new THREE.TorusGeometry(0.17, 0.045, 10, 28), MAT.brass, rig);
  pulley.position.set(0.03, 3.98, 0);
  pulley.rotation.y = Math.PI / 2;
  cylinderBetween([-0.05, 3.98, -0.17], [-0.05, 3.98, 0.17], 0.035, MAT.darkMetal, rig, 12);

  cylinderBetween([0.02, 3.92, 0], [0.02, 2.69, 0], 0.027, MAT.cable, rig, 12);
  cylinderBetween([0.02, 2.69, 0], [0, 2.58, 0], 0.052, MAT.brass, rig, 14);
  const hook = mesh(new THREE.TorusGeometry(0.11, 0.031, 9, 24, Math.PI * 1.55), MAT.brass, rig);
  hook.position.set(0, 2.56, 0);
  hook.rotation.set(Math.PI / 2, 0, -0.72);

  const warning = box([0.28, 0.62, 0.018], [-1.055, 2.78, 0.126], MAT.red, rig);
  warning.castShadow = false;
  for (let i = 0; i < 3; i++) {
    box([0.19, 0.032, 0.02], [-1.055, 2.62 + i * 0.15, 0.137], MAT.white, rig).castShadow = false;
  }
}

const precessionRoot = new THREE.Group();
precessionRoot.position.set(0, 2.55, 0);
scene.add(precessionRoot);

const tiltGroup = new THREE.Group();
tiltGroup.rotation.z = -THREE.MathUtils.degToRad(8.5);
precessionRoot.add(tiltGroup);

const axleLength = 1.56;
const wheelRadius = 0.91;

function addWheelAssembly() {
  cylinderBetween([-0.03, 0, 0], [1.88, 0, 0], 0.052, MAT.brushed, tiltGroup, 18);
  cylinderBetween([-0.02, 0, 0], [0.16, 0, 0], 0.095, MAT.brass, tiltGroup, 18);
  const pivotCollar = mesh(new THREE.TorusGeometry(0.09, 0.025, 9, 28), MAT.red, tiltGroup);
  pivotCollar.position.x = 0.12;
  pivotCollar.rotation.y = Math.PI / 2;

  const spin = new THREE.Group();
  spin.position.x = axleLength;
  tiltGroup.add(spin);

  const tire = mesh(new THREE.TorusGeometry(wheelRadius, 0.092, 18, 96), MAT.tire, spin);
  tire.rotation.y = Math.PI / 2;

  const rimOuter = mesh(new THREE.TorusGeometry(0.79, 0.035, 12, 96), MAT.rim, spin);
  rimOuter.rotation.y = Math.PI / 2;
  const rimInner = mesh(new THREE.TorusGeometry(0.735, 0.016, 8, 96), MAT.spoke, spin);
  rimInner.rotation.y = Math.PI / 2;

  cylinderBetween([-0.17, 0, 0], [0.17, 0, 0], 0.115, MAT.darkMetal, spin, 24);
  cylinderBetween([-0.22, 0, 0], [0.22, 0, 0], 0.046, MAT.rim, spin, 18);
  for (const x of [-0.18, 0.18]) {
    const flange = mesh(new THREE.TorusGeometry(0.15, 0.025, 10, 30), MAT.brass, spin);
    flange.position.x = x;
    flange.rotation.y = Math.PI / 2;
  }

  const spokeCount = 24;
  for (let i = 0; i < spokeCount; i++) {
    const angle = (i / spokeCount) * Math.PI * 2;
    const shifted = angle + (i % 2 === 0 ? 0.15 : -0.15);
    const x = i % 2 === 0 ? -0.17 : 0.17;
    cylinderBetween(
      [x, Math.cos(angle) * 0.14, Math.sin(angle) * 0.14],
      [0, Math.cos(shifted) * 0.765, Math.sin(shifted) * 0.765],
      0.008,
      MAT.spoke,
      spin,
      6,
    );
  }

  const redSpoke = cylinderBetween([0.01, 0.15, 0], [0.01, 0.74, 0], 0.018, MAT.redGlow, spin, 8);
  redSpoke.renderOrder = 2;
  const marker = box([0.055, 0.19, 0.075], [0.015, 0.66, 0], MAT.redGlow, spin);
  marker.rotation.x = 0.1;

  for (let i = 0; i < 4; i++) {
    const angle = i * Math.PI / 2 + Math.PI / 4;
    const reflector = box([0.026, 0.13, 0.08], [0.015, Math.cos(angle) * 0.81, Math.sin(angle) * 0.81], MAT.white, spin);
    reflector.rotation.x = angle;
  }

  const freeCap = mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.13, 18), MAT.red, tiltGroup);
  freeCap.rotation.z = Math.PI / 2;
  freeCap.position.x = 1.94;
  const capRing = mesh(new THREE.TorusGeometry(0.077, 0.015, 8, 24), MAT.rim, tiltGroup);
  capRing.position.x = 2.0;
  capRing.rotation.y = Math.PI / 2;

  return spin;
}

addEnvironment();
addSuspensionRig();
const spinningWheel = addWheelAssembly();

const bearingBall = mesh(new THREE.SphereGeometry(0.115, 24, 16), MAT.brass);
bearingBall.position.set(0, 2.55, 0);
const bearingBand = mesh(new THREE.TorusGeometry(0.125, 0.022, 10, 30), MAT.red);
bearingBand.position.set(0, 2.55, 0);
bearingBand.rotation.x = Math.PI / 2;

const key = new THREE.SpotLight(0xfff0d2, 360, 13, 0.56, 0.55, 1.4);
key.position.set(1.1, 6.2, 3.8);
key.target.position.set(0.7, 2.1, 0);
key.castShadow = true;
key.shadow.mapSize.set(1536, 1536);
key.shadow.bias = -0.0004;
scene.add(key, key.target);

const fill = new THREE.DirectionalLight(0x9bd6ec, 1.35);
fill.position.set(-4, 4.5, 2);
scene.add(fill);

const rimLight = new THREE.SpotLight(0x73cce7, 280, 10, 0.52, 0.65, 1.5);
rimLight.position.set(3.8, 3.8, -4.3);
rimLight.target.position.set(0.8, 2.4, 0);
scene.add(rimLight, rimLight.target);

scene.add(new THREE.HemisphereLight(0xc8dce2, 0x293039, 0.95));

function updateScene(seconds) {
  const t = THREE.MathUtils.clamp(Number.isFinite(seconds) ? seconds : 0, 0, DURATION);
  const u = t / DURATION;

  const precessionAngle = THREE.MathUtils.degToRad(-34 + 76 * u);
  precessionRoot.rotation.y = precessionAngle;

  const spinAngle = -(t * Math.PI * 4.35 + 0.18 * Math.sin(t * 1.7));
  spinningWheel.rotation.x = spinAngle;

  const settle = Math.exp(-t * 1.45) * Math.sin(t * 6.2);
  const nutation = Math.sin(u * Math.PI * 2 + 0.4) * 0.005;
  tiltGroup.rotation.z = -THREE.MathUtils.degToRad(8.5) + settle * 0.012 + nutation;

  const centerLocal = new THREE.Vector3(axleLength, 0, 0);
  const centerWorld = tiltGroup.localToWorld(centerLocal.clone());
  const pivot = new THREE.Vector3(0, 2.55, 0);
  const focus = pivot.clone().lerp(centerWorld, 0.5);
  focus.y += 0.01;

  const cameraAzimuth = THREE.MathUtils.degToRad(70 - 42 * u);
  const distance = 6.68 - 0.12 * Math.sin(Math.PI * u);
  camera.position.set(
    focus.x + Math.cos(cameraAzimuth) * distance,
    3.02 + 0.1 * Math.sin(Math.PI * u),
    focus.z + Math.sin(cameraAzimuth) * distance,
  );
  camera.fov = 40 - 0.9 * Math.sin(Math.PI * u);
  camera.updateProjectionMatrix();
  camera.lookAt(focus.x, focus.y + 0.03, focus.z);

  renderer.render(scene, camera);
}

let animationFrame = null;

function pause() {
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

function seek(seconds) {
  pause();
  updateScene(seconds);
}

function getCameraState() {
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

window.reconstruction = { pause, seek, getCameraState };
seek(0);
window.__READY__ = true;
