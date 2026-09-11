import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;
const FREEZE_START = 0.75;
const FREEZE_END = 4.7;
const FREEZE_EVENT_TIME = 0.95;
// Preserve the original final action state while extending the stationary interval.
const RESUME_RATE = ((DURATION - 1 / 24 - 4.25) * 1.35)
  / (DURATION - 1 / 24 - FREEZE_END);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050911);
scene.fog = new THREE.FogExp2(0x07101a, 0.028);

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
renderer.toneMappingExposure = 1.12;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(43, WIDTH / HEIGHT, 0.08, 150);
const clock = new THREE.Clock();
let paused = true;
let currentTime = 0;
let playbackStart = 0;

const clamp = THREE.MathUtils.clamp;
const smoothstep = (x) => {
  const t = clamp(x, 0, 1);
  return t * t * (3 - 2 * t);
};
const seeded = (() => {
  let state = 0x508b7a31;
  return () => {
    state = Math.imul(state ^ (state >>> 15), 1 | state);
    state ^= state + Math.imul(state ^ (state >>> 7), 61 | state);
    return ((state ^ (state >>> 14)) >>> 0) / 4294967296;
  };
})();

const materials = {
  tire: new THREE.MeshStandardMaterial({ color: 0x090b0d, roughness: 0.76, metalness: 0.08 }),
  wheelMetal: new THREE.MeshStandardMaterial({ color: 0xaab7c4, roughness: 0.23, metalness: 0.93 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x17202a, roughness: 0.3, metalness: 0.84 }),
  engine: new THREE.MeshStandardMaterial({ color: 0x56616c, roughness: 0.3, metalness: 0.9 }),
  fairing: new THREE.MeshPhysicalMaterial({
    color: 0x195794,
    roughness: 0.2,
    metalness: 0.72,
    clearcoat: 1,
    clearcoatRoughness: 0.13,
  }),
  fairingAccent: new THREE.MeshPhysicalMaterial({
    color: 0xd7e9f5,
    roughness: 0.18,
    metalness: 0.64,
    clearcoat: 1,
  }),
  red: new THREE.MeshPhysicalMaterial({
    color: 0xb51f1f,
    roughness: 0.2,
    metalness: 0.7,
    clearcoat: 0.9,
  }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x101317, roughness: 0.86 }),
  suit: new THREE.MeshPhysicalMaterial({ color: 0x202b37, roughness: 0.32, metalness: 0.16 }),
  suitAccent: new THREE.MeshStandardMaterial({ color: 0xe1e7eb, roughness: 0.42 }),
  suitPanel: new THREE.MeshStandardMaterial({ color: 0x2a69a1, roughness: 0.34, metalness: 0.28 }),
  visor: new THREE.MeshPhysicalMaterial({
    color: 0x07151f,
    roughness: 0.08,
    metalness: 0.72,
    clearcoat: 1,
  }),
};

function mesh(geometry, material, parent, position = [0, 0, 0], rotation = [0, 0, 0], scale = [1, 1, 1]) {
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.scale.set(...scale);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function cylinderBetween(parent, start, end, radius, material, radialSegments = 10) {
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const delta = b.clone().sub(a);
  const object = mesh(
    new THREE.CylinderGeometry(radius, radius, delta.length(), radialSegments),
    material,
    parent,
    a.clone().add(b).multiplyScalar(0.5).toArray(),
  );
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  return object;
}

function makeWheel(parent, x, front = false) {
  const wheel = new THREE.Group();
  wheel.position.set(x, 0.68, 0);
  parent.add(wheel);
  mesh(new THREE.TorusGeometry(0.62, 0.115, 14, 48), materials.tire, wheel);
  mesh(new THREE.TorusGeometry(0.46, 0.026, 8, 40), materials.wheelMetal, wheel);
  mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.26, 20), materials.darkMetal, wheel, [0, 0, 0], [Math.PI / 2, 0, 0]);
  for (let index = 0; index < 12; index += 1) {
    const angle = (index / 12) * Math.PI * 2;
    cylinderBetween(
      wheel,
      [0, 0, index % 2 === 0 ? -0.045 : 0.045],
      [Math.cos(angle) * 0.43, Math.sin(angle) * 0.43, index % 2 === 0 ? 0.045 : -0.045],
      0.012,
      materials.wheelMetal,
      6,
    );
  }
  if (front) {
    mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.018, 32), materials.darkMetal, wheel, [0, 0, 0.075], [Math.PI / 2, 0, 0]);
    mesh(new THREE.TorusGeometry(0.68, 0.055, 8, 28, Math.PI * 0.82), materials.fairing, wheel, [0, 0, 0], [0, 0, 0.29]);
  } else {
    mesh(new THREE.TorusGeometry(0.31, 0.018, 7, 30), materials.wheelMetal, wheel, [0, 0, -0.08]);
    mesh(new THREE.TorusGeometry(0.68, 0.045, 8, 24, Math.PI * 0.58), materials.red, wheel, [0, 0, 0], [0, 0, 0.66]);
  }
  return wheel;
}

function makeMotorcycle() {
  const root = new THREE.Group();
  const leanPivot = new THREE.Group();
  root.add(leanPivot);
  scene.add(root);

  const rearWheel = makeWheel(leanPivot, -1.03, false);
  const frontWheel = makeWheel(leanPivot, 1.1, true);

  cylinderBetween(leanPivot, [-1.02, 0.72, -0.1], [-0.12, 1.05, -0.1], 0.055, materials.red);
  cylinderBetween(leanPivot, [-1.02, 0.72, 0.1], [-0.12, 1.05, 0.1], 0.055, materials.red);
  cylinderBetween(leanPivot, [-0.12, 1.05, -0.1], [0.58, 1.38, -0.1], 0.055, materials.red);
  cylinderBetween(leanPivot, [-0.12, 1.05, 0.1], [0.58, 1.38, 0.1], 0.055, materials.red);
  cylinderBetween(leanPivot, [0.78, 1.46, -0.15], [1.1, 0.68, -0.15], 0.052, materials.wheelMetal);
  cylinderBetween(leanPivot, [0.78, 1.46, 0.15], [1.1, 0.68, 0.15], 0.052, materials.wheelMetal);

  mesh(new THREE.BoxGeometry(0.9, 0.62, 0.62), materials.engine, leanPivot, [-0.1, 0.88, 0], [0, 0, -0.08]);
  for (let y = 0.67; y < 1.12; y += 0.09) {
    mesh(new THREE.BoxGeometry(0.54, 0.026, 0.7), materials.darkMetal, leanPivot, [-0.08, y, 0]);
  }

  const tank = mesh(new THREE.SphereGeometry(0.62, 28, 18), materials.fairing, leanPivot, [0.2, 1.52, 0], [0, 0, -0.12], [1.22, 0.7, 0.83]);
  mesh(new THREE.BoxGeometry(0.84, 0.18, 0.5), materials.rubber, leanPivot, [-0.53, 1.48, 0], [0, 0, 0.03]);
  mesh(new THREE.SphereGeometry(0.54, 24, 16), materials.fairing, leanPivot, [0.69, 1.25, 0], [0, 0, 0.1], [1.15, 0.72, 0.82]);
  mesh(new THREE.BoxGeometry(0.92, 0.045, 0.09), materials.darkMetal, leanPivot, [0.76, 1.58, 0]);
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 12), materials.rubber, leanPivot, [0.76, 1.58, -0.53], [Math.PI / 2, 0, 0]);
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.3, 12), materials.rubber, leanPivot, [0.76, 1.58, 0.53], [Math.PI / 2, 0, 0]);

  mesh(new THREE.CylinderGeometry(0.1, 0.15, 1.02, 16), materials.darkMetal, leanPivot, [-0.6, 0.61, 0.38], [0, 0, Math.PI / 2], [1, 1, 1]);
  mesh(new THREE.CylinderGeometry(0.16, 0.2, 0.78, 18), materials.darkMetal, leanPivot, [-0.23, 0.7, 0.42], [0, 0, Math.PI / 2]);
  cylinderBetween(leanPivot, [-0.6, 1.05, -0.25], [-1.0, 0.7, -0.17], 0.035, materials.wheelMetal, 8);
  cylinderBetween(leanPivot, [-0.28, 0.72, -0.28], [-0.28, 0.72, -0.64], 0.038, materials.wheelMetal, 8);
  mesh(new THREE.BoxGeometry(0.25, 0.045, 0.11), materials.wheelMetal, leanPivot, [-0.28, 0.72, -0.68], [0, 0.25, 0]);

  const headlight = mesh(
    new THREE.CylinderGeometry(0.24, 0.2, 0.13, 28),
    new THREE.MeshStandardMaterial({ color: 0xf4fbff, emissive: 0xc8e9ff, emissiveIntensity: 5 }),
    leanPivot,
    [0.99, 1.32, 0],
    [0, 0, -Math.PI / 2],
  );
  const headBeam = mesh(
    new THREE.ConeGeometry(0.82, 3.8, 28, 1, true),
    new THREE.MeshBasicMaterial({
      color: 0xb9e6ff,
      transparent: true,
      opacity: 0.055,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    }),
    leanPivot,
    [2.88, 1.32, 0],
    [0, 0, -Math.PI / 2],
  );
  headBeam.renderOrder = 2;

  const rider = new THREE.Group();
  leanPivot.add(rider);
  mesh(new THREE.SphereGeometry(0.38, 24, 16), materials.suit, rider, [0.04, 2.03, -0.04], [0, 0, -0.56], [0.82, 1.3, 0.76]);
  mesh(new THREE.SphereGeometry(0.34, 28, 18), materials.suitAccent, rider, [0.61, 2.34, -0.03], [0, 0, -0.23], [1, 1.08, 0.95]);
  mesh(new THREE.SphereGeometry(0.3, 26, 16, 0, Math.PI * 2, 0, Math.PI * 0.54), materials.visor, rider, [0.78, 2.35, -0.03], [0, 0, -0.18], [1.03, 0.72, 0.99]);
  cylinderBetween(rider, [0.25, 1.96, -0.2], [0.74, 1.6, -0.47], 0.12, materials.suit);
  cylinderBetween(rider, [0.74, 1.6, -0.47], [0.82, 1.57, -0.48], 0.09, materials.suitAccent);
  cylinderBetween(rider, [0.22, 1.98, 0.18], [0.72, 1.62, 0.46], 0.12, materials.suit);
  cylinderBetween(rider, [0.72, 1.62, 0.46], [0.8, 1.58, 0.48], 0.09, materials.suitAccent);
  cylinderBetween(rider, [-0.16, 1.75, -0.18], [-0.68, 1.28, -0.37], 0.16, materials.suit);
  cylinderBetween(rider, [-0.68, 1.28, -0.37], [-0.46, 0.82, -0.42], 0.125, materials.suit);
  cylinderBetween(rider, [-0.18, 1.74, 0.19], [-0.7, 1.3, 0.33], 0.16, materials.suit);
  cylinderBetween(rider, [-0.7, 1.3, 0.33], [-0.52, 0.83, 0.4], 0.125, materials.suit);
  mesh(new THREE.BoxGeometry(0.38, 0.05, 0.1), materials.suitPanel, rider, [0.0, 2.05, -0.29], [0, 0, -0.48]);
  mesh(new THREE.BoxGeometry(0.38, 0.05, 0.1), materials.suitPanel, rider, [0.0, 2.05, 0.29], [0, 0, -0.48]);
  mesh(new THREE.SphereGeometry(0.13, 14, 10), materials.suitPanel, rider, [0.23, 2.04, -0.25], [0, 0, 0], [1.1, 0.58, 0.9]);
  mesh(new THREE.SphereGeometry(0.13, 14, 10), materials.suitPanel, rider, [0.23, 2.04, 0.25], [0, 0, 0], [1.1, 0.58, 0.9]);

  return { root, leanPivot, rearWheel, frontWheel, tank, headlight };
}

const motorcycle = makeMotorcycle();

const road = mesh(
  new THREE.PlaneGeometry(80, 36),
  new THREE.MeshPhysicalMaterial({
    color: 0x101820,
    roughness: 0.21,
    metalness: 0.22,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16,
  }),
  scene,
  [0, 0, 0],
  [-Math.PI / 2, 0, 0],
);
road.receiveShadow = true;

const roadMarkMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xb9c1bd,
  emissive: 0x29302f,
  emissiveIntensity: 0.7,
  roughness: 0.3,
  clearcoat: 1,
});
for (let x = -34; x <= 34; x += 5) {
  mesh(new THREE.BoxGeometry(2.65, 0.012, 0.13), roadMarkMaterial, scene, [x, 0.013, -3.3], [0, 0, -0.08]);
  mesh(new THREE.BoxGeometry(2.65, 0.012, 0.13), roadMarkMaterial, scene, [x, 0.013, 3.3], [0, 0, -0.08]);
}
mesh(new THREE.BoxGeometry(70, 0.018, 0.08), roadMarkMaterial, scene, [0, 0.018, -7.6]);
mesh(new THREE.BoxGeometry(70, 0.018, 0.08), roadMarkMaterial, scene, [0, 0.018, 7.6]);

const puddleMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x17334b,
  roughness: 0.04,
  metalness: 0.55,
  clearcoat: 1,
  transparent: true,
  opacity: 0.74,
  depthWrite: false,
});
for (let index = 0; index < 18; index += 1) {
  const x = seeded() * 32 - 16;
  const z = seeded() * 12 - 6;
  mesh(
    new THREE.CircleGeometry(0.4 + seeded() * 1.4, 28),
    puddleMaterial,
    scene,
    [x, 0.024 + index * 0.0001, z],
    [-Math.PI / 2, 0, seeded() * Math.PI],
    [1.4 + seeded(), 1, 0.4 + seeded() * 0.35],
  );
}

const railMaterial = new THREE.MeshStandardMaterial({ color: 0x53606a, metalness: 0.82, roughness: 0.3 });
for (const side of [-1, 1]) {
  cylinderBetween(scene, [-30, 0.68, side * 8.8], [30, 0.68, side * 8.8], 0.07, railMaterial, 10);
  for (let x = -30; x <= 30; x += 3) {
    cylinderBetween(scene, [x, 0.03, side * 8.8], [x, 0.72, side * 8.8], 0.05, railMaterial, 8);
  }
}

const buildingMaterial = new THREE.MeshStandardMaterial({ color: 0x101a25, roughness: 0.78, metalness: 0.25 });
const lightColors = [0x1fbbef, 0xf39a43, 0x315a83];
for (let side = -1; side <= 1; side += 2) {
  for (let index = 0; index < 12; index += 1) {
    const x = -27 + index * 5 + seeded() * 2;
    const height = 3 + seeded() * 8;
    const z = side * (12 + seeded() * 5);
    mesh(new THREE.BoxGeometry(3.5 + seeded() * 2, height, 3 + seeded() * 2), buildingMaterial, scene, [x, height / 2, z]);
    const windowMat = new THREE.MeshBasicMaterial({
      color: lightColors[index % lightColors.length],
      transparent: true,
      opacity: 0.52,
      toneMapped: false,
    });
    for (let floor = 1.2; floor < height - 0.5; floor += 1.25) {
      mesh(
        new THREE.BoxGeometry(0.85, 0.25, 0.025),
        windowMat,
        scene,
        [x + ((floor * 3 + index) % 2 ? -0.7 : 0.7), floor, z - side * (1.51 + seeded())],
      );
    }
  }
}

const arrowMaterial = new THREE.MeshBasicMaterial({ color: 0xcbd6d8, transparent: true, opacity: 0.24 });
for (let x = -10; x < 15; x += 6) {
  const arrow = new THREE.Shape();
  arrow.moveTo(0.8, 0);
  arrow.lineTo(-0.1, 0.55);
  arrow.lineTo(-0.1, 0.18);
  arrow.lineTo(-1, 0.18);
  arrow.lineTo(-1, -0.18);
  arrow.lineTo(-0.1, -0.18);
  arrow.lineTo(-0.1, -0.55);
  arrow.closePath();
  mesh(new THREE.ShapeGeometry(arrow), arrowMaterial, scene, [x, 0.028, 0], [-Math.PI / 2, 0, 0], [1.3, 1.3, 1.3]);
}

const skidMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x030609,
  roughness: 0.5,
  clearcoat: 0.68,
  transparent: true,
  opacity: 0.78,
});
for (let index = 0; index < 24; index += 1) {
  const u = index / 23;
  const x = -1.15 - u * 8.4;
  const z = 0.12 + 1.7 * u * u;
  mesh(
    new THREE.BoxGeometry(0.48, 0.012, 0.14 + u * 0.08),
    skidMaterial,
    scene,
    [x, 0.031, z],
    [0, 0.12 + u * 0.25, 0],
  );
}

const dropletCount = 160;
const dropletGeometry = new THREE.SphereGeometry(0.006, 12, 8);
const dropletMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xe6f0f4,
  roughness: 0.025,
  metalness: 0,
  transmission: 0.92,
  ior: 1.33,
  thickness: 0.012,
  transparent: false,
  opacity: 1,
  depthWrite: false,
});
const droplets = new THREE.InstancedMesh(dropletGeometry, dropletMaterial, dropletCount);
droplets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
droplets.castShadow = false;
scene.add(droplets);
const dropletData = Array.from({ length: dropletCount }, (_, index) => {
  const side = index % 3 === 0 ? -1 : 1;
  return {
    x: -1.1 - seeded() * 2.9 + (seeded() - 0.5) * 0.4,
    y: 0.12 + seeded() * 1.45,
    z: side * (0.15 + seeded() * 2.9),
    vx: -0.45 - seeded() * 1.7,
    vy: 0.15 + seeded() * 1.1,
    vz: side * (0.3 + seeded() * 1.35),
    size: 0.55 + seeded() * 0.85,
    stretch: 1.05 + seeded() * 1.65,
  };
});

const sparkCount = 52;
const sparkGeometry = new THREE.SphereGeometry(0.006, 8, 6);
const sparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffd58a, toneMapped: false });
const sparks = new THREE.InstancedMesh(sparkGeometry, sparkMaterial, sparkCount);
sparks.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(sparks);
const sparkData = Array.from({ length: sparkCount }, (_, index) => ({
  x: -0.15 - seeded() * 2.5,
  y: 0.035 + seeded() * 0.44,
  z: -0.55 - seeded() * 1.25,
  vx: -0.8 - seeded() * 1.8,
  vy: 0.1 + seeded() * 0.55,
  vz: -(0.25 + seeded()),
  size: 0.65 + seeded() * 1.8,
  phase: index * 0.61,
}));

const debrisCount = 34;
// The old rectangular debris proxies become fine secondary water spray.
const debrisGeometry = dropletGeometry;
const debrisMaterial = dropletMaterial;
const debris = new THREE.InstancedMesh(debrisGeometry, debrisMaterial, debrisCount);
debris.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(debris);
const debrisData = Array.from({ length: debrisCount }, () => ({
  x: -0.8 - seeded() * 3,
  y: 0.04 + seeded() * 0.78,
  z: (seeded() - 0.5) * 3.8,
  vx: -0.3 - seeded(),
  vy: seeded() * 0.65,
  vz: (seeded() - 0.5) * 1.4,
  spin: seeded() * 5,
  scale: 0.5 + seeded() * 1.5,
}));

const rainCount = 120;
const rainGeometry = new THREE.CylinderGeometry(0.009, 0.009, 0.4, 5);
const rainMaterial = new THREE.MeshBasicMaterial({ color: 0x8fc5de, transparent: true, opacity: 0.24 });
const rain = new THREE.InstancedMesh(rainGeometry, rainMaterial, rainCount);
rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
scene.add(rain);
const rainData = Array.from({ length: rainCount }, () => ({
  x: seeded() * 24 - 12,
  y: 0.4 + seeded() * 9,
  z: seeded() * 16 - 8,
  speed: 2.8 + seeded() * 2,
  scale: 0.5 + seeded(),
}));

scene.add(new THREE.HemisphereLight(0x6da9d2, 0x0b0e12, 1.45));
const keyLight = new THREE.DirectionalLight(0xcceaff, 4.2);
keyLight.position.set(4, 9, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1536, 1536);
keyLight.shadow.camera.left = -8;
keyLight.shadow.camera.right = 8;
keyLight.shadow.camera.top = 8;
keyLight.shadow.camera.bottom = -8;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 25;
scene.add(keyLight);
const rimLight = new THREE.PointLight(0x168de8, 26, 20, 2);
rimLight.position.set(-4, 4, 5);
scene.add(rimLight);
const cameraFill = new THREE.PointLight(0xa6dcff, 8.5, 13, 2);
scene.add(cameraFill);
const sparkLight = new THREE.PointLight(0xff7a16, 32, 6, 2);
scene.add(sparkLight);
const rearLight = new THREE.PointLight(0xff2c18, 22, 8, 2);
rearLight.position.set(-1.4, 1.2, 0);
scene.add(rearLight);
mesh(
  new THREE.SphereGeometry(0.1, 12, 8),
  new THREE.MeshBasicMaterial({ color: 0xff2b18, toneMapped: false }),
  motorcycle.leanPivot,
  [-1.1, 1.42, 0],
);

const dummy = new THREE.Object3D();
const cameraTarget = new THREE.Vector3();

function eventTime(time) {
  if (time < FREEZE_START) return time * FREEZE_EVENT_TIME / FREEZE_START;
  if (time <= FREEZE_END) return FREEZE_EVENT_TIME;
  return FREEZE_EVENT_TIME + (time - FREEZE_END) * RESUME_RATE;
}

function sprayAmountForTime(physicalTime) {
  return smoothstep((physicalTime - 0.18) / 0.72)
    * (1 - smoothstep((physicalTime - 1.48) / 0.58));
}

function sparkAmountForTime(physicalTime) {
  return smoothstep((physicalTime - 0.3) / 0.56)
    * (1 - smoothstep((physicalTime - 1.22) / 0.48));
}

function updateInstances(physicalTime) {
  const delta = physicalTime - FREEZE_EVENT_TIME;
  const sprayAmount = sprayAmountForTime(physicalTime);
  const sparkAmount = sparkAmountForTime(physicalTime);
  for (let index = 0; index < dropletCount; index += 1) {
    const point = dropletData[index];
    dummy.position.set(
      point.x + point.vx * delta,
      Math.max(0.025, point.y + point.vy * delta - 1.8 * delta * delta),
      point.z + point.vz * delta,
    );
    dummy.rotation.set(0, Math.atan2(point.vz, point.vx), 0.15);
    dummy.scale.set(
      point.size * sprayAmount,
      point.size * Math.sqrt(point.stretch) * sprayAmount,
      point.size * sprayAmount,
    );
    dummy.updateMatrix();
    droplets.setMatrixAt(index, dummy.matrix);
  }
  droplets.instanceMatrix.needsUpdate = true;

  for (let index = 0; index < sparkCount; index += 1) {
    const point = sparkData[index];
    dummy.position.set(
      point.x + point.vx * delta,
      Math.max(0.018, point.y + point.vy * delta - 1.5 * delta * delta),
      point.z + point.vz * delta,
    );
    dummy.rotation.set(point.phase + delta * 7, point.phase * 0.4, 0);
    dummy.scale.set(
      point.size * sparkAmount,
      point.size * 0.18 * sparkAmount,
      point.size * 0.18 * sparkAmount,
    );
    dummy.updateMatrix();
    sparks.setMatrixAt(index, dummy.matrix);
  }
  sparks.instanceMatrix.needsUpdate = true;

  for (let index = 0; index < debrisCount; index += 1) {
    const point = debrisData[index];
    dummy.position.set(
      point.x + point.vx * delta,
      Math.max(0.02, point.y + point.vy * delta - 1.7 * delta * delta),
      point.z + point.vz * delta,
    );
    dummy.rotation.set(point.spin + delta * 4, point.spin * 1.3 + delta * 2, point.spin * 0.5);
    dummy.scale.setScalar(point.scale * sprayAmount * 0.55);
    dummy.updateMatrix();
    debris.setMatrixAt(index, dummy.matrix);
  }
  debris.instanceMatrix.needsUpdate = true;

  for (let index = 0; index < rainCount; index += 1) {
    const point = rainData[index];
    const frozenY = point.y;
    let y = frozenY;
    if (delta < 0) y = ((frozenY - delta * point.speed + 10) % 10);
    if (delta > 0) y = ((frozenY - delta * point.speed + 10) % 10);
    dummy.position.set(point.x, y, point.z);
    dummy.rotation.set(0, 0, -0.14);
    // Shorter, thinner streaks at the frozen instant; retain the opening image.
    const freezeShutter = smoothstep((physicalTime - 0.18) / (FREEZE_EVENT_TIME - 0.18));
    dummy.scale.set(
      point.scale * THREE.MathUtils.lerp(1, 0.3, freezeShutter),
      point.scale * THREE.MathUtils.lerp(1, 0.12, freezeShutter),
      point.scale * THREE.MathUtils.lerp(1, 0.3, freezeShutter),
    );
    dummy.updateMatrix();
    rain.setMatrixAt(index, dummy.matrix);
  }
  rain.instanceMatrix.needsUpdate = true;
}

function updateCamera(time, bikeX) {
  const orbit = smoothstep((time - 0.45) / 4.05);
  const angle = THREE.MathUtils.lerp(0.12, Math.PI + 0.24, orbit);
  const radius = THREE.MathUtils.lerp(6.05, 5.45, Math.sin(orbit * Math.PI));
  const focusX = bikeX + THREE.MathUtils.lerp(0.46, -0.44, orbit);
  cameraTarget.set(focusX, 1.18, -0.26);
  camera.position.set(
    bikeX + Math.cos(angle) * radius,
    1.86 + Math.sin(orbit * Math.PI) * 0.82,
    Math.sin(angle) * radius,
  );
  camera.fov = 42.5 - Math.sin(orbit * Math.PI) * 1.5;
  camera.updateProjectionMatrix();
  camera.lookAt(cameraTarget);
  camera.updateMatrixWorld(true);
}

function update(time) {
  currentTime = clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  const physicalTime = eventTime(currentTime);
  const delta = physicalTime - FREEZE_EVENT_TIME;
  const bikeX = delta * 3.05;
  const entry = smoothstep(physicalTime / FREEZE_EVENT_TIME);
  const exit = smoothstep((physicalTime - FREEZE_EVENT_TIME) / 1.15);

  motorcycle.root.position.set(bikeX, 0.08, 0);
  motorcycle.root.rotation.y = 0.16 - exit * 0.1;
  motorcycle.leanPivot.rotation.x = THREE.MathUtils.lerp(-0.48, -0.79, entry) + exit * 0.24;
  const wheelAngle = -physicalTime * 15.2;
  motorcycle.frontWheel.rotation.z = wheelAngle;
  motorcycle.rearWheel.rotation.z = wheelAngle * 1.06;
  motorcycle.frontWheel.rotation.y = 0.08 + 0.05 * entry;
  motorcycle.tank.rotation.z = -0.12;

  updateInstances(physicalTime);
  sparkLight.position.set(-0.8 + delta * 1.1, 0.34, -1.05);
  sparkLight.intensity = 5 + 34 * sparkAmountForTime(physicalTime);
  rearLight.position.x = bikeX - 1.2;
  updateCamera(currentTime, bikeX);
  cameraFill.position.copy(camera.position);
  renderer.render(scene, camera);
}

function animate() {
  requestAnimationFrame(animate);
  if (!paused) {
    update((clock.getElapsedTime() - playbackStart) % DURATION);
  }
}

window.reconstruction = {
  pause() {
    paused = true;
  },
  seek(seconds) {
    paused = true;
    update(seconds);
    return currentTime;
  },
  play() {
    playbackStart = clock.getElapsedTime() - currentTime;
    paused = false;
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
  getFreezeInterval() {
    return [FREEZE_START, FREEZE_END];
  },
  getWorldFingerprint() {
    return JSON.stringify({
      eventTime: eventTime(currentTime),
      bikePosition: motorcycle.root.position.toArray(),
      bikeQuaternion: motorcycle.root.quaternion.toArray(),
      leanQuaternion: motorcycle.leanPivot.quaternion.toArray(),
      frontWheel: motorcycle.frontWheel.quaternion.toArray(),
      rearWheel: motorcycle.rearWheel.quaternion.toArray(),
      droplets: Array.from(droplets.instanceMatrix.array),
      sparks: Array.from(sparks.instanceMatrix.array),
      debris: Array.from(debris.instanceMatrix.array),
      rain: Array.from(rain.instanceMatrix.array),
      sparkLight: [...sparkLight.position.toArray(), sparkLight.intensity],
      rearLight: rearLight.position.toArray(),
    });
  },
};

update(0);
window.sceneReady = true;
animate();
