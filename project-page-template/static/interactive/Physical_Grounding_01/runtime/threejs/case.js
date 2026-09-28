import * as THREE from "three";

export const WIDTH = 1280;
export const HEIGHT = 720;
export const FPS = 24;
export const FRAME_COUNT = 120;
export const DURATION = 5.0;
export const R = 2.4525;
export const G = 9.81;
export const RELEASE_TIME = 0.5;
export const ARRIVAL_TIME = 4.0;
export const SLOW_MOTION_FACTOR = 3.5;
export const ALPHAS_DEG = [20, 40, 60];
export const MODULE_X = [-8.0, 0.0, 8.0];
export const MODULE_DEPTH = [0.0, 0.0, 0.0];
export const RAIL_ROD_GAP = 0.20;
export const RING_MAJOR = 0.255;
export const RING_TUBE = 0.055;
export const CATCHER_RADIUS = 0.38;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x26313a);
scene.fog = new THREE.Fog(0x26313a, 38, 68);
const camera = new THREE.PerspectiveCamera(38, WIDTH / HEIGHT, 0.1, 160);
camera.position.set(0, 4.45, 21.5);
camera.lookAt(0, 4.45, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.55;
document.body.appendChild(renderer.domElement);

const metal = new THREE.MeshStandardMaterial({ color: 0xc7d0d5, metalness: 0.78, roughness: 0.22 });
const darkMetal = new THREE.MeshStandardMaterial({ color: 0x53616a, metalness: 0.78, roughness: 0.24 });
const brass = new THREE.MeshStandardMaterial({ color: 0xd99a38, metalness: 0.72, roughness: 0.24 });
const black = new THREE.MeshStandardMaterial({ color: 0x202930, metalness: 0.62, roughness: 0.34 });
const floorMat = new THREE.MeshStandardMaterial({ color: 0x59636a, metalness: 0.08, roughness: 0.72 });

scene.add(new THREE.HemisphereLight(0xe8f3ff, 0x52616b, 2.2));
const key = new THREE.DirectionalLight(0xffffff, 5.2);
key.position.set(10, 24, 20);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
scene.add(key);
const rim = new THREE.DirectionalLight(0xb9dcf2, 3.0);
rim.position.set(-22, 10, -18);
scene.add(rim);
const fill = new THREE.DirectionalLight(0xffe0b0, 2.2);
fill.position.set(0, 5, 24);
scene.add(fill);

const floor = new THREE.Mesh(new THREE.BoxGeometry(34, 0.35, 18), floorMat);
floor.position.set(0, -0.5, 1.5);
floor.receiveShadow = true;
scene.add(floor);

function cylinderBetween(a, b, radius, material, radial = 16) {
  const direction = new THREE.Vector3().subVectors(b, a);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, radial), material);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function box(size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.copy(position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function torusAroundDirection(center, direction, major, tube, material) {
  const mesh = new THREE.Mesh(new THREE.TorusGeometry(major, tube, 16, 48), material);
  mesh.position.copy(center);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), direction.clone().normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function moduleGeometry(i) {
  const x = MODULE_X[i];
  const z = MODULE_DEPTH[i];
  const alpha = THREE.MathUtils.degToRad(ALPHAS_DEG[i]);
  const circleY = 4.85;
  const bottomY = circleY - R;
  const L = 2 * R * Math.sin(alpha);
  const a = G * Math.sin(alpha);
  const horizontal = L * Math.cos(alpha);
  const drop = L * Math.sin(alpha);
  const start = new THREE.Vector3(x + horizontal, bottomY + drop, z);
  const finish = new THREE.Vector3(x, bottomY, z);
  const tangent = new THREE.Vector3(-Math.cos(alpha), -Math.sin(alpha), 0).normalize();
  const railLength = start.distanceTo(finish);
  const group = new THREE.Group();
  group.userData = { x, z, alpha, L, a, start, finish, tangent, circleY, bottomY, railLength };

  const hoop = new THREE.Mesh(new THREE.TorusGeometry(R, 0.065, 14, 96), brass);
  hoop.position.set(x, circleY, z);
  hoop.castShadow = true;
  group.add(hoop);

  const rodOffset = new THREE.Vector3(0, 0, RAIL_ROD_GAP / 2);
  const rodA = cylinderBetween(start.clone().add(rodOffset), finish.clone().add(rodOffset), 0.045, metal);
  const rodB = cylinderBetween(start.clone().sub(rodOffset), finish.clone().sub(rodOffset), 0.045, metal);
  group.add(rodA, rodB);

  const supportStart = new THREE.Vector3(x, 0.0, z);
  const supportTop = new THREE.Vector3(x, circleY - 0.1, z);
  group.add(cylinderBetween(supportStart, supportTop, 0.13, darkMetal));
  group.add(box([1.7, 0.22, 1.5], new THREE.Vector3(x, -0.24, z), darkMetal));

  const latch = box([0.32, 0.42, 0.32], start.clone().add(new THREE.Vector3(0, 0.22, 0)), brass);
  group.add(latch);
  const linkTop = new THREE.Vector3(start.x, 7.0, z);
  group.add(cylinderBetween(start.clone().add(new THREE.Vector3(0, 0.18, 0)), linkTop, 0.045, brass, 10));

  const cup = new THREE.Mesh(new THREE.CylinderGeometry(CATCHER_RADIUS, CATCHER_RADIUS * 0.68, 0.22, 32, 1, true), brass);
  cup.position.set(x, bottomY - 0.15, z);
  cup.castShadow = true;
  cup.receiveShadow = true;
  group.add(cup);
  group.add(cylinderBetween(new THREE.Vector3(x, bottomY - 0.05, z), new THREE.Vector3(x, bottomY - 0.62, z), 0.06, darkMetal));

  const carriage = new THREE.Group();
  carriage.name = `captive-annular-carriage-${i + 1}`;
  const ring = torusAroundDirection(start.clone(), tangent, RING_MAJOR, RING_TUBE, black);
  carriage.add(ring);
  const crossbar = cylinderBetween(
    start.clone().add(rodOffset.clone().multiplyScalar(0.92)),
    start.clone().sub(rodOffset.clone().multiplyScalar(0.92)),
    0.045, darkMetal, 12,
  );
  carriage.add(crossbar);
  const bearingA = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), brass);
  const bearingB = bearingA.clone();
  bearingA.position.copy(start).add(rodOffset);
  bearingB.position.copy(start).sub(rodOffset);
  carriage.add(bearingA, bearingB);
  carriage.userData = { start: start.clone(), finish: finish.clone(), tangent: tangent.clone(), railLength };
  group.add(carriage);
  group.userData.carriage = carriage;
  scene.add(group);
  return group;
}

const modules = ALPHAS_DEG.map((_, i) => moduleGeometry(i));

const shaft = cylinderBetween(new THREE.Vector3(-10.5, 7.0, -0.7), new THREE.Vector3(10.5, 7.0, -0.7), 0.12, brass, 20);
scene.add(shaft);

const outer = new THREE.Group();
outer.add(box([23.0, 0.28, 0.28], new THREE.Vector3(0, 9.0, -0.8), metal));
outer.add(box([23.0, 0.28, 0.28], new THREE.Vector3(0, -0.35, -0.8), metal));
outer.add(box([0.28, 9.35, 0.28], new THREE.Vector3(-11.5, 4.3, -0.8), metal));
outer.add(box([0.28, 9.35, 0.28], new THREE.Vector3(11.5, 4.3, -0.8), metal));
scene.add(outer);

function carriageState(t, module) {
  const u = module.userData;
  const tau = Math.max(0, Math.min(1, (t - RELEASE_TIME) / SLOW_MOTION_FACTOR));
  const distance = tau <= 0 ? 0 : tau >= 1 ? u.railLength : 0.5 * u.a * tau * tau;
  const clamped = Math.min(u.railLength, Math.max(0, distance));
  return u.start.clone().add(u.tangent.clone().multiplyScalar(clamped));
}

export function setTime(t) {
  for (const module of modules) {
    const center = carriageState(t, module);
    module.userData.carriage.position.copy(center).sub(module.userData.carriage.userData.start);
    module.userData.carriage.userData.lastCenter = center.clone();
  }
  renderer.render(scene, camera);
}

window.renderAt = setTime;
window.getTelemetry = () => modules.map((module, i) => {
  const c = module.userData.carriage.userData.lastCenter || module.userData.start;
  return { index: i, alphaDeg: ALPHAS_DEG[i], center: c.toArray(), finish: module.userData.finish.toArray() };
});
const gl = renderer.getContext();
renderer.compile(scene, camera);
const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
window.finishRender = () => gl.finish();
window.rendererEvidence = {
  backend: "nvidia-egl-requested",
  renderer: debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
    : gl.getParameter(gl.RENDERER),
  vendor: debugInfo
    ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL)
    : gl.getParameter(gl.VENDOR),
  width: WIDTH,
  height: HEIGHT,
  fps: FPS,
  frames: FRAME_COUNT,
  duration: DURATION
};
setTime(0);
gl.finish();

// Project-page adapter: expose the original runtime, without changing scene geometry.
window.reconstruction = {pause(){}, seek: setTime};
window.__bfCapture = {THREE, renderer, scene, camera};
