import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;

const canvas = document.getElementById('reconstruction-canvas');
const renderer = new THREE.WebGLRenderer({
  canvas,
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
renderer.toneMappingExposure = 0.96;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa9bdc6);
scene.fog = new THREE.Fog(0xc0cccd, 27, 48);

const camera = new THREE.PerspectiveCamera(44, WIDTH / HEIGHT, 0.1, 100);
const clock = new THREE.Clock();
let animationFrame = 0;
let playing = false;
let currentTime = 0;

const palette = {
  wall: new THREE.MeshStandardMaterial({ color: 0xd2dcda, roughness: 0.82 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xaab9bc, roughness: 0.4, metalness: 0.3 }),
  charcoal: new THREE.MeshStandardMaterial({ color: 0x18242b, roughness: 0.5, metalness: 0.35 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x33434a, roughness: 0.62 }),
  teal: new THREE.MeshStandardMaterial({ color: 0x159a98, roughness: 0.42, metalness: 0.05 }),
  tealGlow: new THREE.MeshStandardMaterial({
    color: 0x26d0ca,
    emissive: 0x0a7773,
    emissiveIntensity: 1.2,
    roughness: 0.32,
  }),
  oak: new THREE.MeshStandardMaterial({ color: 0xa97343, roughness: 0.72 }),
  oakLight: new THREE.MeshStandardMaterial({ color: 0xd09a61, roughness: 0.66 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x66757b, roughness: 0.74 }),
  white: new THREE.MeshStandardMaterial({ color: 0xf5f7f7, roughness: 0.35, metalness: 0.08 }),
  black: new THREE.MeshStandardMaterial({ color: 0x10181c, roughness: 0.38, metalness: 0.55 }),
  silver: new THREE.MeshStandardMaterial({ color: 0xaebbc0, roughness: 0.28, metalness: 0.78 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xb9e4ec,
    roughness: 0.08,
    metalness: 0,
    transparent: true,
    opacity: 0.19,
    transmission: 0.45,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  foliage: new THREE.MeshStandardMaterial({ color: 0x2d7555, roughness: 0.9 }),
  foliageLight: new THREE.MeshStandardMaterial({ color: 0x5a9668, roughness: 0.88 }),
  cushion: new THREE.MeshStandardMaterial({ color: 0x376e76, roughness: 0.88 }),
  robotShell: new THREE.MeshStandardMaterial({ color: 0xe6ece9, roughness: 0.28, metalness: 0.16 }),
};

function addMesh(geometry, material, position, parent = scene, cast = true, receive = true) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function addBox(name, size, position, material, parent = scene, cast = true, receive = true) {
  const mesh = addMesh(new THREE.BoxGeometry(...size), material, position, parent, cast, receive);
  mesh.name = name;
  return mesh;
}

function textTexture(text, foreground, background, width = 1024, height = 256) {
  const label = document.createElement('canvas');
  label.width = width;
  label.height = height;
  const context = label.getContext('2d');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);
  context.fillStyle = foreground;
  context.font = `700 ${Math.floor(height * 0.47)}px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(label);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}

function addSign(text, size, position, rotation, foreground = '#eefafa', background = '#247c7a') {
  const material = new THREE.MeshBasicMaterial({
    map: textTexture(text, foreground, background),
    side: THREE.DoubleSide,
  });
  const sign = addMesh(new THREE.PlaneGeometry(size[0], size[1]), material, position, scene, false, false);
  sign.rotation.set(...rotation);
  return sign;
}

function addPlant(position, scale = 1, parent = scene) {
  const plant = new THREE.Group();
  plant.position.set(...position);
  plant.scale.setScalar(scale);
  parent.add(plant);
  addMesh(new THREE.CylinderGeometry(0.3, 0.25, 0.48, 16), palette.stone, [0, 0.24, 0], plant);
  addMesh(new THREE.CylinderGeometry(0.055, 0.07, 0.8, 8), palette.dark, [0, 0.8, 0], plant);
  const leafGeometry = new THREE.SphereGeometry(0.26, 12, 8);
  const leaves = [
    [-0.24, 1.05, 0.02, 1.1, 1.7, 0.7],
    [0.2, 1.08, 0.04, 1, 1.55, 0.75],
    [0.03, 1.28, -0.1, 0.9, 1.6, 0.75],
    [-0.05, 0.98, 0.26, 1.2, 1.45, 0.72],
  ];
  leaves.forEach((leaf, index) => {
    const mesh = addMesh(leafGeometry, index % 2 ? palette.foliageLight : palette.foliage, leaf.slice(0, 3), plant);
    mesh.scale.set(...leaf.slice(3));
    mesh.rotation.z = index % 2 ? 0.42 : -0.35;
  });
  return plant;
}

function createPerson(position, colors, seated = false, rotationY = 0) {
  const person = new THREE.Group();
  person.position.set(...position);
  person.rotation.y = rotationY;
  scene.add(person);
  const clothes = new THREE.MeshStandardMaterial({ color: colors[0], roughness: 0.85 });
  const trousers = new THREE.MeshStandardMaterial({ color: colors[1], roughness: 0.9 });
  const skin = new THREE.MeshStandardMaterial({ color: 0xb97a5d, roughness: 0.88 });
  addMesh(new THREE.SphereGeometry(0.15, 16, 12), skin, [0, seated ? 1.34 : 1.68, 0], person);
  const torso = addMesh(new THREE.CapsuleGeometry(0.19, 0.46, 6, 12), clothes, [0, seated ? 0.93 : 1.2, 0], person);
  torso.scale.x = 1.18;
  const limbGeometry = new THREE.CapsuleGeometry(0.065, 0.42, 4, 8);
  if (seated) {
    [-1, 1].forEach((side) => {
      const thigh = addMesh(limbGeometry, trousers, [side * 0.12, 0.63, -0.13], person);
      thigh.rotation.x = Math.PI / 2;
      const shin = addMesh(limbGeometry, trousers, [side * 0.12, 0.36, -0.36], person);
      shin.rotation.x = -0.16;
    });
  } else {
    [-1, 1].forEach((side) => {
      addMesh(limbGeometry, trousers, [side * 0.12, 0.48, 0], person);
    });
  }
  return person;
}

function buildArchitecture() {
  const floorMaterial = new THREE.MeshStandardMaterial({
    color: 0xadbdbc,
    roughness: 0.48,
    metalness: 0.07,
  });
  addMesh(new THREE.PlaneGeometry(28, 30), floorMaterial, [0, 0, 0], scene, false, true).rotation.x = -Math.PI / 2;
  const ceilingMaterial = new THREE.MeshBasicMaterial({
    color: 0xdbe4e3,
    side: THREE.DoubleSide,
  });
  addMesh(new THREE.PlaneGeometry(28, 30), ceilingMaterial, [0, 7.28, 0], scene, false, true).rotation.x = Math.PI / 2;

  const grout = new THREE.MeshBasicMaterial({ color: 0x8f9e9c, transparent: true, opacity: 0.58 });
  for (let x = -14; x <= 14; x += 2) {
    addBox('floor-grout', [0.018, 0.006, 30], [x, 0.004, 0], grout, scene, false, false);
  }
  for (let z = -14; z <= 14; z += 2) {
    addBox('floor-grout', [28, 0.006, 0.018], [0, 0.004, z], grout, scene, false, false);
  }

  addBox('rear-wall', [28, 7, 0.42], [0, 3.5, -12.7], palette.wall);
  addBox('left-wall', [0.42, 7, 25], [-12.7, 3.5, -0.2], palette.wall);
  addBox('rear-baseboard', [28, 0.24, 0.16], [0, 0.18, -12.43], palette.trim);
  addBox('left-baseboard', [0.16, 0.24, 25], [-12.43, 0.18, -0.2], palette.trim);

  // Glass entrance, offset to the right so the robot begins directly inside it.
  const entrance = new THREE.Group();
  entrance.position.set(5.8, 0, 10.95);
  scene.add(entrance);
  addBox('entry-header', [6.5, 0.22, 0.26], [0, 4.2, 0], palette.trim, entrance);
  [-3.18, 3.18].forEach((x) => {
    addBox('entry-mullion', [0.1, 4.25, 0.18], [x, 2.12, 0], palette.charcoal, entrance);
  });
  addBox('entry-glass-left', [1.34, 4.0, 0.04], [-2.45, 2.08, 0], palette.glass, entrance, false, false);
  addBox('entry-glass-center', [3.32, 4.0, 0.04], [0, 2.08, 0], palette.glass, entrance, false, false);
  addBox('entry-glass-right', [1.34, 4.0, 0.04], [2.45, 2.08, 0], palette.glass, entrance, false, false);
  addSign('MAIN ENTRY', [3.8, 0.46], [5.8, 4.62, 10.87], [0, 0, 0], '#f1ffff', '#267e7e');

  // Elevator bank and framing.
  addBox('elevator-surround', [9.7, 5.75, 0.38], [0, 3.03, -12.36], palette.stone);
  const elevatorCenters = [-2.25, 2.25];
  elevatorCenters.forEach((centerX, index) => {
    addBox('elevator-opening', [3.65, 4.9, 0.18], [centerX, 2.5, -12.11], palette.charcoal);
    addBox('elevator-left-door', [1.68, 4.64, 0.12], [centerX - 0.86, 2.47, -11.99], palette.silver);
    addBox('elevator-right-door', [1.68, 4.64, 0.12], [centerX + 0.86, 2.47, -11.99], palette.silver);
    addBox('elevator-seam', [0.035, 4.64, 0.04], [centerX, 2.47, -11.9], palette.black);
    addBox('indicator', [0.68, 0.32, 0.08], [centerX, 5.12, -11.9], palette.black);
    addMesh(new THREE.ConeGeometry(0.1, 0.18, 3), palette.tealGlow, [centerX + (index ? -0.11 : 0.11), 5.12, -11.81], scene, false, false).rotation.z = Math.PI;
  });
  addSign('ELEVATORS', [4.6, 0.6], [0, 6.2, -12.1], [0, 0, 0], '#26353a', '#dfe8e8');
  addBox('call-panel', [0.25, 0.72, 0.12], [-4.45, 1.45, -11.94], palette.black);
  addMesh(new THREE.CylinderGeometry(0.07, 0.07, 0.025, 16), palette.tealGlow, [-4.45, 1.58, -11.84], scene, false, false).rotation.x = Math.PI / 2;

  // Hospital wayfinding cross.
  addBox('hospital-cross-vertical', [0.42, 1.45, 0.09], [-10.65, 4.72, -12.08], palette.tealGlow);
  addBox('hospital-cross-horizontal', [1.45, 0.42, 0.09], [-10.65, 4.72, -12.02], palette.tealGlow);
  addSign('LOBBY  •  LEVEL 1', [4.6, 0.55], [-7.3, 6.08, -12.08], [0, 0, 0], '#3c4f55', '#edf2f1');

  // Ceiling beams and luminous panels establish the indoor volume.
  for (const x of [-8, -2.5, 3, 8.5]) {
    const lightPanelMaterial = new THREE.MeshBasicMaterial({ color: 0xf7ffff, side: THREE.DoubleSide });
    const panel = addMesh(new THREE.PlaneGeometry(3.4, 1.2), lightPanelMaterial, [x, 7.22, -2.8], scene, false, false);
    panel.rotation.x = Math.PI / 2;
  }
  [ -8.5, 0, 8.5 ].forEach((x) => addBox('ceiling-beam', [0.16, 0.22, 11], [x, 7.18, -6.4], palette.trim));

  // Reception is along the left side of the robot's curved route.
  const reception = new THREE.Group();
  reception.position.set(-8.0, 0, -4.1);
  scene.add(reception);
  addBox('reception-front', [4.7, 1.25, 1.16], [0, 0.64, 0], palette.oak, reception);
  addBox('reception-counter', [5.05, 0.16, 1.52], [0, 1.33, 0.08], palette.oakLight, reception);
  addBox('reception-inset', [3.45, 0.64, 0.08], [0, 0.65, 0.59], palette.teal, reception);
  addSign('RECEPTION', [3.25, 0.56], [-8.0, 0.83, -3.42], [0, 0, 0], '#ffffff', '#176e70');
  const monitor = addBox('monitor', [0.92, 0.64, 0.14], [0.75, 1.82, -0.22], palette.black, reception);
  monitor.rotation.x = -0.1;
  createPerson([-7.4, 0, -4.75], [0x5c8792, 0x25343b], false, 0);

  addPlant([-11.4, 0, -9.7], 1.2);
  addPlant([10.4, 0, -9.8], 1.25);
  addPlant([10.8, 0, 8.7], 1.05);
}

function buildSeatingIsland() {
  const island = new THREE.Group();
  island.position.set(0.65, 0, 1.1);
  scene.add(island);

  const base = addMesh(new THREE.CylinderGeometry(1, 1, 0.26, 64), palette.stone, [0, 0.13, 0], island);
  base.scale.set(3.85, 1, 2.55);
  const planter = addMesh(new THREE.CylinderGeometry(1, 1.08, 0.72, 48), palette.white, [0, 0.54, 0], island);
  planter.scale.set(1.75, 1, 1.2);
  const soil = addMesh(new THREE.CylinderGeometry(0.94, 0.94, 0.08, 48), palette.dark, [0, 0.93, 0], island);
  soil.scale.set(1.7, 1, 1.15);

  const benchPositions = [
    [0, 0.54, 1.83, 0],
    [0, 0.54, -1.83, 0],
    [2.67, 0.54, 0, Math.PI / 2],
    [-2.67, 0.54, 0, Math.PI / 2],
  ];
  benchPositions.forEach(([x, y, z, rotation]) => {
    const bench = addBox('island-bench', [3.25, 0.34, 0.72], [x, y, z], palette.oakLight, island);
    bench.rotation.y = rotation;
    const cushion = addBox('bench-cushion', [2.85, 0.13, 0.62], [x, y + 0.23, z], palette.cushion, island);
    cushion.rotation.y = rotation;
  });
  addPlant([-0.72, 0.94, 0.05], 0.78, island);
  addPlant([0.58, 0.94, -0.18], 0.86, island);
  addPlant([0.05, 0.94, 0.42], 0.72, island);
  createPerson([1.1, 0.66, 2.9], [0xc76f5d, 0x344b62], true, Math.PI);
}

const route = new THREE.CatmullRomCurve3([
  new THREE.Vector3(5.8, 0.035, 10.45),
  new THREE.Vector3(5.5, 0.035, 8.35),
  new THREE.Vector3(3.35, 0.035, 6.45),
  new THREE.Vector3(-2.25, 0.035, 5.25),
  new THREE.Vector3(-4.65, 0.035, 2.2),
  new THREE.Vector3(-5.1, 0.035, -2.25),
  new THREE.Vector3(-4.65, 0.035, -6.25),
  new THREE.Vector3(-3.45, 0.035, -9.2),
  new THREE.Vector3(-2.28, 0.035, -10.85),
], false, 'centripetal', 0.42);

let goalBeacon;

function buildRouteGuide() {
  const guideMaterial = new THREE.MeshStandardMaterial({
    color: 0x1cb3ad,
    emissive: 0x075754,
    emissiveIntensity: 0.9,
    roughness: 0.4,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const routeMesh = addMesh(new THREE.TubeGeometry(route, 150, 0.055, 10, false), guideMaterial, [0, 0, 0], scene, false, false);
  routeMesh.name = 'navigation-route';
  for (const u of [0.12, 0.28, 0.44, 0.6, 0.76, 0.9]) {
    const point = route.getPointAt(u);
    const tangent = route.getTangentAt(u);
    const arrow = addMesh(new THREE.ConeGeometry(0.16, 0.46, 3), guideMaterial, [point.x, 0.06, point.z], scene, false, false);
    arrow.rotation.x = Math.PI / 2;
    arrow.rotation.z = Math.atan2(tangent.z, tangent.x) - Math.PI / 2;
  }
  const goalMaterial = new THREE.MeshBasicMaterial({
    color: 0x35eee4,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  });
  const goalPoint = route.getPointAt(1);
  goalBeacon = addMesh(
    new THREE.TorusGeometry(0.6, 0.055, 10, 40),
    goalMaterial,
    [goalPoint.x, 0.06, goalPoint.z],
    scene,
    false,
    false,
  );
  goalBeacon.rotation.x = -Math.PI / 2;
}

function createRobot() {
  const root = new THREE.Group();
  root.name = 'quadruped-robot';
  root.scale.setScalar(1.24);
  scene.add(root);

  const shell = addBox('robot-body', [0.85, 0.58, 1.48], [0, 0.88, 0], palette.robotShell, root);
  shell.geometry.translate(0, 0, 0);
  addBox('robot-side-band-left', [0.9, 0.24, 0.84], [0, 0.89, 0.02], palette.charcoal, root);
  addBox('robot-back-shell', [0.68, 0.34, 0.26], [0, 0.94, 0.72], palette.robotShell, root);
  [-0.438, 0.438].forEach((x) => {
    addBox('robot-status-strip', [0.025, 0.12, 0.74], [x, 1.08, 0.04], palette.tealGlow, root);
  });
  const head = addBox('robot-head', [0.74, 0.47, 0.52], [0, 0.9, -0.93], palette.robotShell, root);
  head.rotation.x = -0.05;
  addBox('robot-face', [0.55, 0.25, 0.06], [0, 0.92, -1.21], palette.black, root);
  [-0.16, 0.16].forEach((x) => {
    addMesh(new THREE.CylinderGeometry(0.055, 0.055, 0.035, 16), palette.tealGlow, [x, 0.93, -1.25], root, false, false).rotation.x = Math.PI / 2;
  });
  addMesh(new THREE.CylinderGeometry(0.18, 0.2, 0.16, 20), palette.black, [0, 1.26, -0.1], root);
  addMesh(new THREE.CylinderGeometry(0.13, 0.13, 0.11, 20), palette.tealGlow, [0, 1.4, -0.1], root);
  const bumper = addMesh(new THREE.CapsuleGeometry(0.055, 0.48, 4, 12), palette.charcoal, [0, 0.72, -1.24], root);
  bumper.rotation.z = Math.PI / 2;

  const legReferences = [];
  const hipLocations = [
    [-0.47, 0.76, -0.48, 0],
    [0.47, 0.76, -0.48, Math.PI],
    [-0.47, 0.76, 0.49, Math.PI],
    [0.47, 0.76, 0.49, 0],
  ];
  hipLocations.forEach(([x, y, z, phase], index) => {
    const hip = new THREE.Group();
    hip.position.set(x, y, z);
    root.add(hip);
    addMesh(new THREE.SphereGeometry(0.13, 12, 8), palette.black, [0, 0, 0], hip);
    addMesh(new THREE.CapsuleGeometry(0.085, 0.28, 5, 8), palette.robotShell, [0, -0.22, 0], hip);
    const knee = new THREE.Group();
    knee.position.set(0, -0.43, 0);
    hip.add(knee);
    addMesh(new THREE.SphereGeometry(0.105, 12, 8), palette.black, [0, 0, 0], knee);
    addMesh(new THREE.CapsuleGeometry(0.07, 0.28, 5, 8), palette.charcoal, [0, -0.21, 0], knee);
    const foot = addBox('robot-foot', [0.2, 0.11, 0.32], [0, -0.43, -0.05], palette.black, knee);
    foot.rotation.x = 0.08;
    legReferences.push({ hip, knee, phase, index });
  });

  const tailPivot = new THREE.Group();
  tailPivot.position.set(0, 1.03, 0.79);
  root.add(tailPivot);
  const tail = addMesh(new THREE.CapsuleGeometry(0.045, 0.34, 4, 8), palette.charcoal, [0, 0.18, 0.12], tailPivot);
  tail.rotation.x = -0.62;
  return { root, legReferences, tailPivot };
}

buildArchitecture();
buildSeatingIsland();
buildRouteGuide();
const robot = createRobot();

const hemisphere = new THREE.HemisphereLight(0xe8f7ff, 0x596970, 1.32);
scene.add(hemisphere);
const keyLight = new THREE.DirectionalLight(0xffefd2, 2.4);
keyLight.position.set(7, 13, 9);
keyLight.target.position.set(-1, 0, -2);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -15;
keyLight.shadow.camera.right = 15;
keyLight.shadow.camera.top = 15;
keyLight.shadow.camera.bottom = -15;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 38;
keyLight.shadow.bias = -0.0003;
scene.add(keyLight, keyLight.target);
const elevatorFill = new THREE.PointLight(0xb7ecff, 1.4, 16, 2);
elevatorFill.position.set(0, 5.3, -9.8);
scene.add(elevatorFill);
const entranceFill = new THREE.PointLight(0xe4f8ff, 1.65, 18, 2);
entranceFill.position.set(5, 4.8, 9.5);
scene.add(entranceFill);

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smootherstep(value) {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function updateAt(time) {
  currentTime = Math.max(0, Math.min(DURATION, Number.isFinite(time) ? time : 0));
  const travelProgress = clamp01((currentTime - 0.12) / 4.78);
  const progress = travelProgress - 0.18 * Math.sin(travelProgress * Math.PI * 2) / (Math.PI * 2);
  const moving = clamp01(Math.min(travelProgress * 10, (1 - travelProgress) * 10));
  const routePoint = route.getPointAt(progress);
  const tangent = route.getTangentAt(Math.min(progress, 0.999999)).normalize();
  const tangentAhead = route.getTangentAt(Math.min(progress + 0.018, 0.999999)).normalize();
  const steering = tangent.x * tangentAhead.z - tangent.z * tangentAhead.x;
  const gaitPhase = progress * route.getLength() * Math.PI * 2.15;
  const travelPulse = Math.sin(gaitPhase) * moving;

  robot.root.position.set(routePoint.x, 0.14 + 0.018 * Math.abs(travelPulse) * moving, routePoint.z);
  robot.root.rotation.y = Math.atan2(-tangent.x, -tangent.z);
  robot.root.rotation.x = 0.012 * Math.sin(gaitPhase * 2) * moving;
  robot.root.rotation.z = -0.16 * steering * moving;
  robot.legReferences.forEach(({ hip, knee, phase, index }) => {
    const stride = Math.sin(gaitPhase + phase + (index % 2) * 0.08) * moving;
    hip.rotation.x = 0.34 * stride;
    knee.rotation.x = 0.28 - 0.31 * stride;
  });
  robot.tailPivot.rotation.z = 0.2 * Math.sin(gaitPhase * 0.47) * moving;
  const goalPulse = 0.5 + 0.5 * Math.sin(currentTime * Math.PI * 2.4);
  goalBeacon.scale.setScalar(0.92 + 0.16 * goalPulse);
  goalBeacon.material.opacity = 0.42 + 0.38 * goalPulse;

  const shotProgress = clamp01(currentTime / DURATION);
  camera.position.set(
    12.7 - 2.0 * shotProgress,
    4.35 + 0.55 * smootherstep(shotProgress),
    13.25 - 2.4 * shotProgress,
  );
  camera.lookAt(
    2.7 - 4.3 * smootherstep(shotProgress),
    0.9,
    3.8 - 10.3 * smootherstep(shotProgress),
  );
  camera.updateMatrixWorld(true);
  renderer.render(scene, camera);
}

function pause() {
  playing = false;
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
    animationFrame = 0;
  }
}

function tick() {
  if (!playing) return;
  updateAt((currentTime + clock.getDelta()) % DURATION);
  animationFrame = requestAnimationFrame(tick);
}

function play() {
  if (playing) return;
  playing = true;
  clock.getDelta();
  animationFrame = requestAnimationFrame(tick);
}

function seek(seconds) {
  pause();
  updateAt(Number(seconds));
}

function getCameraState() {
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

window.reconstruction = {
  pause,
  play,
  seek,
  getCameraState,
  metadata: { width: WIDTH, height: HEIGHT, fps: FPS, frames: FRAME_COUNT, duration: DURATION },
};

updateAt(0);
window.__RECONSTRUCTION_READY__ = true;
