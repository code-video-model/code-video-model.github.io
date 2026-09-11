import * as THREE from './vendor/three.module.js';

const WIDTH = 1280;
const HEIGHT = 720;
const FPS = 30;
const DURATION = 5;
const trajectory = await fetch('./trajectory.json').then(response => {
  if (!response.ok) throw new Error(`Trajectory load failed: ${response.status}`);
  return response.json();
});
if (trajectory.schema !== 'double-pendulum-trajectory-v1' || trajectory.duration !== DURATION) {
  throw new Error('Unexpected trajectory contract');
}

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd9d4c9);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(34, WIDTH / HEIGHT, 0.05, 100);
camera.position.set(0.22, 0.02, 5.6);
camera.lookAt(0.25, 0.38, 0);

scene.add(new THREE.HemisphereLight(0xf5f2e7, 0x69625a, 2.0));
const key = new THREE.DirectionalLight(0xfff6df, 3.4);
key.position.set(-3, 5, 5);
scene.add(key);
const fill = new THREE.DirectionalLight(0xb9d5e8, 1.2);
fill.position.set(4, 2, 3);
scene.add(fill);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 9),
  new THREE.MeshStandardMaterial({color: 0xb8b2a8, roughness: 0.86}),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.53;
scene.add(floor);

const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(18, 8),
  new THREE.MeshStandardMaterial({color: 0xe6e1d8, roughness: 0.95}),
);
wall.position.set(0, 1.25, -2.0);
scene.add(wall);

const board = new THREE.Mesh(
  new THREE.BoxGeometry(6.2, 1.7, 0.08),
  new THREE.MeshStandardMaterial({color: 0xe9eee9, roughness: 0.48}),
);
board.position.set(0.1, 1.85, -1.88);
scene.add(board);

const steel = new THREE.MeshStandardMaterial({color: 0x3e4549, metalness: 0.72, roughness: 0.32});
const rodMaterial = new THREE.MeshStandardMaterial({color: 0x8a542d, metalness: 0.05, roughness: 0.42});
const brass = new THREE.MeshStandardMaterial({color: 0xb8872e, metalness: 0.82, roughness: 0.2});
const dark = new THREE.MeshStandardMaterial({color: 0x20262a, metalness: 0.55, roughness: 0.38});

function box(size, position, material) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  scene.add(mesh);
  return mesh;
}
const supportPost = {
  centerX: 0.55,
  centerZ: -0.42,
  width: 0.14,
  depth: 0.18,
  baseTopY: -0.40,
};
box([1.18, 0.12, 0.70], [supportPost.centerX, -0.46, supportPost.centerZ], steel);
box(
  [supportPost.width, 1.66, supportPost.depth],
  [supportPost.centerX, 0.43, supportPost.centerZ],
  steel,
);
box([0.42, 0.14, supportPost.depth], [0.725, 1.27, supportPost.centerZ], steel);
box([0.16, 0.28, 0.50], [0.9, 1.34, -0.21], dark);

const pivot = new THREE.Vector3(0.9, 1.34, 0);
const pivotCap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.24, 32), dark);
pivotCap.rotation.x = Math.PI / 2;
pivotCap.position.copy(pivot);
scene.add(pivotCap);

const rodGeometry = new THREE.CylinderGeometry(0.022, 0.022, 1, 24);
const rod1 = new THREE.Mesh(rodGeometry, rodMaterial);
const rod2 = new THREE.Mesh(rodGeometry, rodMaterial);
scene.add(rod1, rod2);
const bob1 = new THREE.Mesh(new THREE.SphereGeometry(0.06, 40, 28), brass);
const bob2 = new THREE.Mesh(new THREE.SphereGeometry(0.04, 40, 28), brass);
scene.add(bob1, bob2);

function placeRod(mesh, a, b) {
  const midpoint = a.clone().add(b).multiplyScalar(0.5);
  const direction = b.clone().sub(a);
  mesh.position.copy(midpoint);
  mesh.scale.set(1, direction.length(), 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
}

function stateAt(time) {
  const scaled = Math.min(trajectory.samples.length - 1, Math.max(0, time * trajectory.fps));
  const index = Math.min(trajectory.samples.length - 2, Math.floor(scaled));
  const fraction = scaled - index;
  const a = trajectory.samples[index];
  const b = trajectory.samples[index + 1];
  const mix = key => a[key] + (b[key] - a[key]) * fraction;
  return {
    sourceTime: mix('sourceTime'),
    theta1: mix('theta1'),
    theta2: mix('theta2'),
    x1: mix('x1'),
    y1: mix('y1'),
    x2: mix('x2'),
    y2: mix('y2'),
  };
}

let current = null;
function draw(time) {
  const t = Math.max(0, Math.min(DURATION, Number(time)));
  current = stateAt(t);
  const p1 = new THREE.Vector3(pivot.x + current.x1, pivot.y + current.y1, 0);
  const p2 = new THREE.Vector3(pivot.x + current.x2, pivot.y + current.y2, 0);
  placeRod(rod1, pivot, p1);
  placeRod(rod2, p1, p2);
  bob1.position.copy(p1);
  bob2.position.copy(p2);
  renderer.render(scene, camera);
}

function diagnostics() {
  const p1 = bob1.position;
  const p2 = bob2.position;
  const l1 = p1.distanceTo(pivot);
  const l2 = p2.distanceTo(p1);
  const postFront = supportPost.centerZ + supportPost.depth / 2;
  const secondRodPostClearance = -0.022 - postFront;
  const terminalBobPostClearance = -0.04 - postFront;
  const standHeight = pivot.y - supportPost.baseTopY;
  const gl = renderer.getContext();
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  return {
    time: current ? current.sourceTime - trajectory.selectedWindow.sourceStartSeconds : 0,
    sourceTime: current?.sourceTime ?? trajectory.selectedWindow.sourceStartSeconds,
    theta1: current?.theta1 ?? 0,
    theta2: current?.theta2 ?? 0,
    pivot: pivot.toArray(),
    bob1: p1.toArray(),
    bob2: p2.toArray(),
    l1,
    l2,
    l1Error: Math.abs(l1 - trajectory.parameters.l1Meters),
    l2Error: Math.abs(l2 - trajectory.parameters.l2Meters),
    secondLinkPostClearance: Math.min(secondRodPostClearance, terminalBobPostClearance),
    supportModel: {
      pendulumPlaneZ: 0,
      postFrontZ: postFront,
      depthSeparated: true,
      standHeight,
      firstRodToStandHeightRatio: trajectory.parameters.l1Meters / standHeight,
      projectedBracketToFirstRodRatio:
        (pivot.x - supportPost.centerX) / trajectory.parameters.l1Meters,
    },
    renderer: debugInfo
      ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)
      : gl.getParameter(gl.RENDERER),
    topology: {fixedPivots: 1, rods: 2, bobs: 2, bob1IsSecondPivot: true},
  };
}

draw(0);
window.reconstruction = {
  ready: true,
  duration: DURATION,
  pause() {},
  seek(time) { draw(time); },
  diagnostics,
  async streamFrame(index, fps = FPS) {
    draw(index / fps);
    const gl = renderer.getContext();
    const pixels = new Uint8Array(WIDTH * HEIGHT * 4);
    gl.readPixels(0, 0, WIDTH, HEIGHT, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const response = await fetch(`/__frame?index=${index}`, {method: 'POST', body: pixels});
    if (!response.ok) throw new Error(`Frame upload failed: ${response.status}`);
  },
};
