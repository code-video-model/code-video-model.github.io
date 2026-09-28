import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;
const CAMERA_DURATION = 5;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;
renderer.domElement.id = 'scene-canvas';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111a23);
scene.fog = new THREE.Fog(0x526977, 28, 70);

const camera = new THREE.PerspectiveCamera(47, WIDTH / HEIGHT, 0.1, 100);
const lookTarget = new THREE.Vector3();

const M = {
  concrete: new THREE.MeshStandardMaterial({ color: 0x596067, roughness: 0.9, metalness: 0.02 }),
  concreteDark: new THREE.MeshStandardMaterial({ color: 0x2c3339, roughness: 0.92 }),
  concreteLight: new THREE.MeshStandardMaterial({ color: 0x81878a, roughness: 0.86 }),
  floor: new THREE.MeshStandardMaterial({ color: 0x343b3f, roughness: 0.72, metalness: 0.06 }),
  floorDark: new THREE.MeshStandardMaterial({ color: 0x1c2328, roughness: 0.82 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x273039, roughness: 0.46, metalness: 0.72 }),
  steelLight: new THREE.MeshStandardMaterial({ color: 0x8b969e, roughness: 0.42, metalness: 0.72 }),
  shutter: new THREE.MeshStandardMaterial({ color: 0x9da5a8, roughness: 0.48, metalness: 0.68 }),
  shutterEdge: new THREE.MeshStandardMaterial({ color: 0x39434a, roughness: 0.38, metalness: 0.82 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xe4a521, roughness: 0.55 }),
  safetyYellow: new THREE.MeshStandardMaterial({ color: 0xf4bd24, roughness: 0.5 }),
  black: new THREE.MeshStandardMaterial({ color: 0x101418, roughness: 0.72 }),
  tire: new THREE.MeshStandardMaterial({ color: 0x101214, roughness: 0.9 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x1a2024, roughness: 0.9 }),
  doorSeal: new THREE.MeshStandardMaterial({ color: 0x070a0c, roughness: 0.98 }),
  red: new THREE.MeshStandardMaterial({ color: 0x9f2c25, roughness: 0.52 }),
  redBright: new THREE.MeshStandardMaterial({ color: 0xd54a32, roughness: 0.43 }),
  blue: new THREE.MeshStandardMaterial({ color: 0x126d9f, roughness: 0.42, metalness: 0.12 }),
  blueBright: new THREE.MeshStandardMaterial({ color: 0x2094c5, roughness: 0.38, metalness: 0.1 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf0f1eb, roughness: 0.62 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xc2c8c8, roughness: 0.22, metalness: 0.92 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x173544, roughness: 0.18, metalness: 0.36 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8b5c2e, roughness: 0.88 }),
  cardboard: new THREE.MeshStandardMaterial({ color: 0x8d6740, roughness: 0.92 }),
  green: new THREE.MeshStandardMaterial({ color: 0x315e48, roughness: 0.8 }),
  light: new THREE.MeshStandardMaterial({
    color: 0xf7f5dc,
    emissive: 0xf4e9bd,
    emissiveIntensity: 3.6,
    roughness: 0.35,
  }),
};

function box(name, size, position, material, parent = scene, cast = true, receive = true) { window.__bfTrace?.add(65);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function cylinder(name, radius, depth, position, material, parent = scene, radialSegments = 20) { window.__bfTrace?.add(75);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, depth, radialSegments),
    material,
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function beamBetween(name, a, b, radius, material, parent = scene) { window.__bfTrace?.add(88);
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const mesh = cylinder(name, radius, start.distanceTo(end), midpoint.toArray(), material, parent, 10);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
  return mesh;
}

function addHazardStrip(parent, x, y, z, width, horizontal = true) { window.__bfTrace?.add(97);
  const stripeCount = 9;
  for (let i = 0; i < stripeCount; i += 1) {
    const stripe = box(
      `hazard-stripe-${i}`,
      horizontal ? [width / stripeCount, 0.055, 0.03] : [0.055, width / stripeCount, 0.03],
      horizontal
        ? [x - width / 2 + (i + 0.5) * width / stripeCount, y, z]
        : [x, y - width / 2 + (i + 0.5) * width / stripeCount, z],
      i % 2 === 0 ? M.safetyYellow : M.black,
      parent,
      false,
      false,
    );
    if (horizontal) stripe.rotation.z = -0.12;
  }
}

function makePalletStack(x, z, rotation, cartons) { window.__bfTrace?.add(115);
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  scene.add(group);

  for (let level = 0; level < 2; level += 1) {
    for (let rail = -1; rail <= 1; rail += 1) {
      box('pallet-rail', [2.4, 0.12, 0.18], [0, 0.09 + level * 0.16, rail * 0.72], M.wood, group);
    }
    for (let slat = -4; slat <= 4; slat += 1) {
      box('pallet-slat', [0.18, 0.1, 1.7], [slat * 0.27, 0.21 + level * 0.16, 0], M.wood, group);
    }
  }

  for (let i = 0; i < cartons; i += 1) {
    const layer = Math.floor(i / 3);
    const col = i % 3;
    const offset = layer % 2 ? 0.18 : 0;
    box(
      `carton-${i}`,
      [0.72, 0.68, 1.28],
      [-0.78 + col * 0.78 + offset, 0.67 + layer * 0.7, 0],
      i % 4 === 0 ? M.cardboard.clone() : M.cardboard,
      group,
    );
  }
  return group;
}

function makeDrum(x, z, colorMaterial) { window.__bfTrace?.add(145);
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  scene.add(group);
  const body = cylinder('oil-drum', 0.42, 1.25, [0, 0.65, 0], colorMaterial, group, 24);
  for (const y of [0.08, 0.62, 1.18]) {
    cylinder('drum-ring', 0.435, 0.06, [0, y, 0], M.steelLight, group, 24);
  }
  return body;
}

// Warehouse shell, assembled around the loading opening rather than masking it.
box('floor', [30, 0.25, 31], [0, -0.16, 0], M.floor, scene, false, true);
box('left-wall', [0.45, 11.5, 31], [-14.1, 5.55, 0], M.concreteDark, scene, false, true);
box('right-wall', [0.45, 11.5, 31], [14.1, 5.55, 0], M.concreteDark, scene, false, true);
box('roof', [30, 0.35, 31], [0, 11.35, 0], M.concreteDark, scene, false, true);

// Back wall sections preserve a real opening under the raised door.
box('back-wall-left', [8.75, 10.9, 0.5], [-9.625, 5.3, -14], M.concrete, scene, false, true);
box('back-wall-right', [8.75, 10.9, 0.5], [9.625, 5.3, -14], M.concrete, scene, false, true);
box('back-wall-header', [10.5, 2.45, 0.5], [0, 9.1, -14], M.concrete, scene, false, true);

// Concrete block joints on the back wall.
for (let y = 0.65; y < 10.2; y += 0.82) {
  for (const segment of [[-13.75, -5.25], [5.25, 13.75]]) {
    box('mortar-line', [segment[1] - segment[0], 0.025, 0.025], [(segment[0] + segment[1]) / 2, y, -13.735], M.concreteLight, scene, false, false);
  }
}
for (let x = -13.2; x <= 13.2; x += 1.65) {
  if (Math.abs(x) < 5.3) continue;
  box('block-joint', [0.025, 10.2, 0.025], [x, 5.3, -13.735], M.concreteDark, scene, false, false);
}

// Floor slab seams and loading-bay markings.
for (let x = -12; x <= 12; x += 4) {
  box('floor-seam-x', [0.025, 0.012, 29], [x, -0.025, 0], M.floorDark, scene, false, false);
}
for (let z = -11; z <= 12; z += 4) {
  box('floor-seam-z', [28, 0.012, 0.025], [0, -0.025, z], M.floorDark, scene, false, false);
}
for (const x of [-5.85, 5.85]) {
  box('yellow-lane', [0.15, 0.025, 13.2], [x, 0.01, -6.9], M.yellow, scene, false, false);
}
box('stop-line', [11.85, 0.025, 0.18], [0, 0.012, -11.8], M.yellow, scene, false, false);

// Structural columns, beams, and roof trusses.
for (const x of [-12.1, 12.1]) {
  for (const z of [-11.5, -5.0, 1.5, 8.0]) {
    box('steel-column', [0.48, 10.8, 0.48], [x, 5.3, z], M.steel, scene, true, true);
    box('column-foot', [0.92, 0.22, 0.92], [x, 0.1, z], M.steelLight, scene);
  }
}
for (const z of [-11.5, -5, 1.5, 8]) {
  beamBetween('left-rafter', [-12.2, 10.55, z], [0, 11.15, z], 0.18, M.steel);
  beamBetween('right-rafter', [0, 11.15, z], [12.2, 10.55, z], 0.18, M.steel);
  beamBetween('truss-bottom', [-12.1, 9.75, z], [12.1, 9.75, z], 0.13, M.steel);
  for (let x = -10; x <= 10; x += 4) {
    beamBetween('truss-web', [x, 9.75, z], [x + 2, 11.05 - Math.abs(x + 2) * 0.04, z], 0.08, M.steel);
  }
}

// Ceiling fixtures with small pools of warm light.
for (const x of [-6.4, 0, 6.4]) {
  for (const z of [-7.5, 0, 7.5]) {
    box('light-housing', [2.5, 0.16, 0.72], [x, 10.55, z], M.steel, scene, false, false);
    box('light-strip', [2.2, 0.07, 0.48], [x, 10.43, z], M.light, scene, false, false);
  }
}

// Fully closed rolling shutter and its hardware.
const door = new THREE.Group();
door.name = 'closed-loading-door';
scene.add(door);
box('left-door-jamb', [0.42, 8.35, 0.62], [-5.25, 4.2, -13.55], M.steelLight, door);
box('right-door-jamb', [0.42, 8.35, 0.62], [5.25, 4.2, -13.55], M.steelLight, door);
box('top-door-jamb', [10.9, 0.42, 0.62], [0, 8.28, -13.55], M.steelLight, door);
box('roll-hood', [10.65, 0.9, 1.05], [0, 8.74, -13.2], M.steel, door);

const shutterBottom = 0.06;
const shutterTop = 8.18;
const slatCount = 28;
for (let i = 0; i < slatCount; i += 1) {
  const y = shutterBottom + (i + 0.5) * ((shutterTop - shutterBottom) / slatCount);
  const slat = box('rolling-door-slat', [10.08, 0.255, 0.16], [0, y, -13.36], M.shutter, door);
  slat.geometry.translate(0, 0.01, 0);
  box('slat-shadow', [10.03, 0.035, 0.19], [0, y - 0.13, -13.32], M.shutterEdge, door, false, false);
}
box('door-bottom-bar', [10.2, 0.28, 0.34], [0, shutterBottom, -13.27], M.shutterEdge, door);
box('door-bottom-seal', [10.18, 0.08, 0.22], [0, -0.015, -13.23], M.doorSeal, door);
addHazardStrip(door, 0, shutterBottom, -13.08, 9.8, true);
cylinder('chain-wheel', 0.26, 0.12, [4.67, 7.65, -13.05], M.steelLight, door, 20).rotation.x = Math.PI / 2;
for (const x of [4.51, 4.83]) {
  cylinder('door-chain', 0.025, 3.7, [x, 5.85, -13.02], M.steelLight, door, 8);
}

// Protective bollards emphasize the depth boundary at the opening.
for (const x of [-5.78, 5.78]) {
  cylinder('bollard', 0.22, 1.35, [x, 0.68, -12.85], M.safetyYellow, scene, 20);
  cylinder('bollard-cap', 0.23, 0.08, [x, 1.37, -12.85], M.black, scene, 20);
}

// The unchanged procedural exterior remains behind the closed loading door.
const exterior = new THREE.Group();
exterior.name = 'exterior-yard';
scene.add(exterior);
box('exterior-sky', [40, 19, 0.35], [0, 8, -38], new THREE.MeshBasicMaterial({ color: 0x9fc7dd }), exterior, false, false);
box('distant-haze', [40, 4.5, 0.25], [0, 2.1, -37.7], new THREE.MeshBasicMaterial({ color: 0xc8d7d5 }), exterior, false, false);
box('yard-ground', [40, 0.18, 30], [0, -0.12, -27.5], new THREE.MeshStandardMaterial({ color: 0x8e9490, roughness: 0.95 }), exterior, false, true);
box('distant-warehouse', [34, 2.8, 0.5], [0, 1.35, -34.8], M.concreteLight, exterior, false, true);
box('distant-roof-cap', [35, 0.22, 0.72], [0, 2.82, -34.7], M.steel, exterior, false, true);
for (const x of [-13, -6.5, 0, 6.5, 13]) {
  box('distant-bay', [3.4, 1.85, 0.06], [x, 1.02, -34.5], M.concreteDark, exterior, false, false);
}
for (let x = -17; x <= 17; x += 4.5) {
  box('yard-seam', [0.025, 0.02, 26], [x, -0.005, -27.5], M.concreteDark, exterior, false, false);
}
box('parking-line', [0.12, 0.025, 14], [-5.6, 0.01, -25], M.white, exterior, false, false);
box('parking-line', [0.12, 0.025, 14], [6.2, 0.01, -25], M.white, exterior, false, false);

// Parked blue-and-white box truck, presented broadside for immediate recognition.
const truck = new THREE.Group();
truck.name = 'parked-box-truck';
truck.position.set(-0.5, 0, -22.3);
truck.rotation.y = -0.07;
exterior.add(truck);
box('truck-cargo', [6.2, 3.45, 2.65], [-1.3, 2.18, 0], M.white, truck);
box('truck-cargo-lower', [6.25, 0.2, 2.72], [-1.3, 0.53, 0], M.chrome, truck);
box('truck-blue-stripe', [6.24, 0.42, 2.69], [-1.3, 1.16, 0], M.blue, truck, false, false);
for (let x = -4.05; x <= 1.45; x += 0.92) {
  box('truck-cargo-rib', [0.055, 3.22, 0.055], [x, 2.2, 1.355], M.steelLight, truck, false, false);
}
box('truck-rear-frame', [0.12, 3.42, 2.7], [-4.43, 2.17, 0], M.chrome, truck);
for (const y of [0.75, 1.08]) {
  box('truck-tail-lamp', [0.13, 0.2, 0.28], [-4.5, y, 1.23], M.redBright, truck, false, false);
}
box('truck-cab', [2.2, 2.75, 2.5], [3.0, 1.54, 0], M.blueBright, truck);
box('truck-hood', [1.15, 1.35, 2.42], [4.48, 0.92, 0], M.blueBright, truck);
box('truck-windshield', [0.95, 0.9, 0.05], [3.34, 2.18, 1.275], M.glass, truck, false, false).rotation.z = -0.08;
box('truck-side-window', [0.8, 0.76, 0.05], [2.62, 2.18, 1.278], M.glass, truck, false, false);
box('truck-door-seam', [0.035, 1.55, 0.035], [2.1, 1.53, 1.3], M.steel, truck, false, false);
box('truck-step', [1.25, 0.16, 0.42], [3.0, 0.36, 1.38], M.chrome, truck);
for (const x of [2.45, 2.8, 3.15]) {
  box('truck-roof-marker', [0.14, 0.1, 0.08], [x, 2.94, 1.24], M.yellow, truck, false, false);
}
box('truck-bumper', [0.28, 0.34, 2.58], [5.15, 0.42, 0], M.chrome, truck);
box('truck-grille', [0.05, 0.58, 1.35], [5.09, 0.82, 0], M.black, truck, false, false);
for (const x of [-3.0, -0.25, 3.6]) {
  for (const z of [-1.38, 1.38]) {
    const wheel = cylinder('truck-wheel', 0.62, 0.32, [x, 0.58, z], M.tire, truck, 24);
    wheel.rotation.x = Math.PI / 2;
    const hub = cylinder('wheel-hub', 0.24, 0.34, [x, 0.58, z * 1.01], M.chrome, truck, 20);
    hub.rotation.x = Math.PI / 2;
  }
}
for (const z of [-1.27, 1.27]) {
  box('truck-headlamp', [0.08, 0.28, 0.35], [5.13, 1.18, z * 0.72], M.light, truck, false, false);
}

// Unchanged interior warehouse assets.
makePalletStack(-9.5, -7.8, 0.05, 8);
makePalletStack(-10.4, -3.9, -0.08, 6);
makePalletStack(9.3, -8.6, -0.1, 7);
makeDrum(10.6, -5.1, M.red);
makeDrum(9.6, -4.5, M.green);
makeDrum(10.8, -3.9, M.blue);
box('electrical-cabinet', [1.55, 2.55, 0.55], [11.6, 1.35, -11.48], M.steelLight);
box('cabinet-panel', [1.22, 1.85, 0.06], [11.6, 1.5, -11.18], M.concreteLight, scene, false, false);
for (let i = 0; i < 3; i += 1) {
  cylinder('indicator', 0.055, 0.03, [11.3 + i * 0.3, 2.04, -11.13], i === 0 ? M.redBright : M.green, scene, 12).rotation.x = Math.PI / 2;
}
for (const x of [-4.5, 0, 4.5]) {
  beamBetween('overhead-pipe', [x, 9.05, -13], [x, 9.05, 10], 0.08, M.steelLight);
}

// Lighting preserves the paired warehouse setup while keeping the closed door readable.
scene.add(new THREE.HemisphereLight(0xb9d8e6, 0x2a3031, 1.75));
const sun = new THREE.DirectionalLight(0xfff3d4, 4.2);
sun.position.set(-3, 9, -24);
sun.target.position.set(0, 1, -5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -12;
sun.shadow.camera.right = 12;
sun.shadow.camera.top = 12;
sun.shadow.camera.bottom = -4;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 45;
sun.shadow.bias = -0.0006;
scene.add(sun, sun.target);

const interiorFill = new THREE.SpotLight(0xffe9bd, 54, 30, Math.PI / 3.2, 0.55, 1.2);
interiorFill.position.set(1, 10, 5);
interiorFill.target.position.set(0, 1.5, -10);
scene.add(interiorFill, interiorFill.target);

const doorwayFill = new THREE.RectAreaLight(0xc9e7ff, 48, 9.5, 3.8);
doorwayFill.position.set(0, 2.1, -13.8);
doorwayFill.lookAt(0, 2.1, -4);
scene.add(doorwayFill);

for (const z of [-7.5, 0, 7.5]) {
  const ceilingFill = new THREE.PointLight(0xffe4b8, 20, 13, 1.5);
  ceilingFill.position.set(0, 9.8, z);
  scene.add(ceilingFill);
}

// Deterministic motes help reveal the daylight volume without simulation state.
const moteMaterial = new THREE.MeshBasicMaterial({ color: 0xd9edf5, transparent: true, opacity: 0.52 });
const motes = [];
for (let i = 0; i < 24; i += 1) {
  const seed = ((i * 97) % 251) / 251;
  const mote = new THREE.Mesh(new THREE.SphereGeometry(0.025 + (i % 3) * 0.009, 6, 5), moteMaterial);
  mote.userData.base = {
    x: -4.6 + ((i * 47) % 97) / 97 * 9.2,
    y: 0.4 + ((i * 31) % 89) / 89 * 4.7,
    z: -12.1 + seed * 8.8,
    phase: seed * Math.PI * 2,
  };
  scene.add(mote);
  motes.push(mote);
}

function smootherstep(value) { window.__bfTrace?.add(367);
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function update(time) { window.__bfTrace?.add(372);
  const t = THREE.MathUtils.clamp(time, 0, DURATION);
  const progress = smootherstep(t / CAMERA_DURATION);
  const lateralArc = Math.sin(progress * Math.PI) * 0.22;

  door.position.set(0, 0, 0);
  door.quaternion.identity();
  door.scale.set(1, 1, 1);

  camera.position.set(
    THREE.MathUtils.lerp(4.35, 1.85, progress) + lateralArc,
    THREE.MathUtils.lerp(3.7, 3.25, progress),
    THREE.MathUtils.lerp(11.25, 8.15, progress),
  );
  lookTarget.set(
    THREE.MathUtils.lerp(0.05, -0.15, progress),
    THREE.MathUtils.lerp(3.55, 3.35, progress),
    -13.8,
  );
  camera.lookAt(lookTarget);

  for (let i = 0; i < motes.length; i += 1) {
    const mote = motes[i];
    const base = mote.userData.base;
    mote.position.set(
      base.x + Math.sin(t * 0.42 + base.phase) * 0.15,
      base.y + Math.sin(t * 0.65 + base.phase * 1.7) * 0.1,
      base.z + Math.cos(t * 0.34 + base.phase) * 0.13,
    );
  }

  renderer.render(scene, camera);
}

let paused = true;
window.reconstruction = {
  pause() {
    paused = true;
  },
  seek(seconds) {
    paused = true;
    update(Number.isFinite(seconds) ? seconds : 0);
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
  getDoorState() {
    return {
      position: door.position.toArray(),
      quaternion: door.quaternion.toArray(),
      scale: door.scale.toArray(),
    };
  },
};

window.__sceneReady = true;
update(0);
