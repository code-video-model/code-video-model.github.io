import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x07131d);
scene.fog = new THREE.FogExp2(0x0b1821, 0.012);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance'
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(54, WIDTH / HEIGHT, 0.1, 70);

const materials = {
  wall: new THREE.MeshStandardMaterial({ color: 0xd9e1e2, roughness: 0.58, metalness: 0.06 }),
  wallInset: new THREE.MeshStandardMaterial({ color: 0xbccacd, roughness: 0.48, metalness: 0.16 }),
  wallDark: new THREE.MeshStandardMaterial({ color: 0x304955, roughness: 0.4, metalness: 0.45 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x8599a1, roughness: 0.26, metalness: 0.72 }),
  darkTrim: new THREE.MeshStandardMaterial({ color: 0x192b36, roughness: 0.3, metalness: 0.65 }),
  floor: new THREE.MeshPhysicalMaterial({ color: 0x8fa7ae, roughness: 0.2, metalness: 0.32, clearcoat: 0.58, clearcoatRoughness: 0.18 }),
  floorDark: new THREE.MeshStandardMaterial({ color: 0x344a53, roughness: 0.42, metalness: 0.28 }),
  door: new THREE.MeshStandardMaterial({ color: 0x6e8490, roughness: 0.3, metalness: 0.46 }),
  doorInset: new THREE.MeshStandardMaterial({ color: 0x294450, roughness: 0.38, metalness: 0.38 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x173542, roughness: 0.12, metalness: 0.12, transmission: 0.28, transparent: true, opacity: 0.74 }),
  orange: new THREE.MeshStandardMaterial({ color: 0xf18124, roughness: 0.28, metalness: 0.32 }),
  robotDark: new THREE.MeshStandardMaterial({ color: 0x26323a, roughness: 0.3, metalness: 0.7 }),
  whiteRobot: new THREE.MeshStandardMaterial({ color: 0xdce4e4, roughness: 0.28, metalness: 0.35 }),
  bench: new THREE.MeshStandardMaterial({ color: 0x52707b, roughness: 0.38, metalness: 0.48 }),
  screen: new THREE.MeshStandardMaterial({ color: 0x073744, emissive: 0x29c9e2, emissiveIntensity: 1.9, roughness: 0.22 }),
  cyan: new THREE.MeshStandardMaterial({ color: 0x3dced8, emissive: 0x0b7f8d, emissiveIntensity: 0.7, roughness: 0.35 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xf1b931, roughness: 0.38, metalness: 0.22 }),
  black: new THREE.MeshStandardMaterial({ color: 0x111a1f, roughness: 0.5, metalness: 0.28 }),
  light: new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xe9fbff, emissiveIntensity: 4.1, roughness: 0.2 })
};

function box(name, size, position, material, parent = scene, shadow = true) { window.__bfTrace?.add(49);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = shadow;
  mesh.receiveShadow = shadow;
  parent.add(mesh);
  return mesh;
}

function cylinder(name, radius, height, position, material, parent = scene, segments = 24) { window.__bfTrace?.add(59);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, segments), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCeilingLight(x, z, parent = scene, intensity = 0.72) { window.__bfTrace?.add(69);
  box('recessed ceiling light', [1.55, 0.06, 0.52], [x, 4.36, z], materials.light, parent, false);
  const light = new THREE.PointLight(0xeafaff, intensity, 8, 2);
  light.position.set(x, 4.12, z);
  parent.add(light);
}

// Stable corridor shell.
box('corridor floor', [10.3, 0.18, 25], [0, -0.12, -2.4], materials.floor);
box('left corridor wall', [0.2, 4.6, 25], [-5.12, 2.15, -2.4], materials.wall);
box('right corridor wall', [0.2, 4.6, 25], [5.12, 2.15, -2.4], materials.wall);
box('corridor ceiling', [10.3, 0.18, 25], [0, 4.48, -2.4], materials.wallDark);

// Long floor rails and wall utility bands strengthen perspective.
for (const x of [-4.55, 4.55]) {
  box('floor edge rail', [0.2, 0.035, 24.4], [x, 0.02, -2.3], materials.cyan, scene, false);
}
for (const x of [-5.0, 5.0]) {
  box('wall lower bumper', [0.12, 0.28, 24.3], [x, 0.36, -2.25], materials.darkTrim);
  box('wall upper utility rail', [0.12, 0.15, 24.3], [x, 3.42, -2.25], materials.trim);
}

for (const z of [5.5, 1.5, -2.5, -6.5, -10.5]) {
  for (const side of [-1, 1]) {
    box('corridor wall bay', [0.09, 2.65, 2.95], [side * 5.005, 1.88, z], materials.wallInset);
    box('bay dark inset', [0.08, 1.38, 1.4], [side * 4.95, 2.18, z], materials.wallDark);
    box('bay kick plate', [0.07, 0.48, 1.55], [side * 4.94, 0.72, z], materials.trim);
    const access = box('cyan access pad', [0.07, 0.46, 0.22], [side * 4.89, 1.72, z + 1.14], materials.screen, scene, false);
    access.rotation.y = Math.PI / 2;
    for (const offset of [-0.38, 0, 0.38]) {
      box('instrument status tick', [0.07, 0.045, 0.2], [side * 4.885, 2.46, z + offset], materials.cyan, scene, false);
    }
  }
  box('ceiling cross rib', [10.05, 0.17, 0.13], [0, 4.32, z - 1.75], materials.trim);
}

for (const z of [6.2, 2.8, -0.6, -4.0, -7.4, -10.8]) {
  addCeilingLight(-2.25, z);
  addCeilingLight(2.25, z);
}

// End wall and substantial door frame.
box('end wall left', [2.85, 4.55, 0.28], [-3.65, 2.18, -14.25], materials.wall);
box('end wall right', [2.85, 4.55, 0.28], [3.65, 2.18, -14.25], materials.wall);
box('end wall header', [4.55, 0.72, 0.28], [0, 4.12, -14.25], materials.wall);
box('door jamb left', [0.22, 4.05, 0.5], [-2.25, 2.0, -14.03], materials.trim);
box('door jamb right', [0.22, 4.05, 0.5], [2.25, 2.0, -14.03], materials.trim);
box('door jamb header', [4.72, 0.22, 0.5], [0, 4.02, -14.03], materials.trim);
box('threshold', [4.7, 0.08, 0.62], [0, 0.04, -14.0], materials.darkTrim);

// Robotics room remains static and is revealed by the only edited motion.
const room = new THREE.Group();
room.name = 'bright robotics room';
scene.add(room);
box('robotics room floor', [10.4, 0.2, 12], [0, -0.1, -19.7], materials.floor, room);
box('robotics room rear wall', [10.4, 4.7, 0.22], [0, 2.2, -25.7], materials.wall, room);
box('robotics room left wall', [0.2, 4.7, 12], [-5.1, 2.2, -19.7], materials.wall, room);
box('robotics room right wall', [0.2, 4.7, 12], [5.1, 2.2, -19.7], materials.wall, room);
box('robotics room ceiling', [10.4, 0.18, 12], [0, 4.5, -19.7], materials.wallInset, room);

for (const z of [-16.1, -19.2, -22.3, -25.0]) {
  addCeilingLight(-2.25, z, room, 1.2);
  addCeilingLight(2.25, z, room, 1.2);
}

for (const x of [-3.55, 3.55]) {
  box('robotics workbench base', [1.65, 0.82, 3.6], [x, 0.42, -20.0], materials.bench, room);
  box('robotics workbench top', [1.9, 0.12, 3.9], [x, 0.9, -20.0], materials.trim, room);
  box('vertical tool display', [0.12, 1.55, 2.35], [x + (x < 0 ? -0.72 : 0.72), 1.85, -20.1], materials.wallDark, room);
  box('glowing diagnostic display', [0.08, 0.72, 1.25], [x + (x < 0 ? -0.79 : 0.79), 2.04, -19.95], materials.screen, room, false);
}

// Layered fixtures at several depths keep the revealed room from reading as a flat backdrop.
box('rear control wall', [5.8, 2.25, 0.16], [0, 2.15, -25.48], materials.wallDark, room);
for (const x of [-1.85, -0.62, 0.62, 1.85]) {
  box('rear control screen', [0.88, 0.62, 0.06], [x, 2.45, -25.36], materials.screen, room, false);
  box('rear control cabinet', [0.98, 0.58, 0.08], [x, 1.55, -25.35], materials.bench, room);
}
for (const z of [-17.0, -20.1, -23.2]) {
  box('robotics overhead gantry', [8.2, 0.16, 0.2], [0, 3.76, z], materials.trim, room);
  box('left gantry upright', [0.16, 3.1, 0.2], [-4.0, 2.2, z], materials.trim, room);
  box('right gantry upright', [0.16, 3.1, 0.2], [4.0, 2.2, z], materials.trim, room);
}

// Central assembly platform provides an immediate depth cue through the opening.
cylinder('assembly platform', 1.25, 0.22, [0, 0.12, -21.1], materials.darkTrim, room, 48);
cylinder('assembly pedestal', 0.72, 0.5, [0, 0.42, -21.1], materials.whiteRobot, room, 32);
box('assembly payload', [0.95, 0.66, 0.95], [0, 0.97, -21.1], materials.cyan, room);
for (const x of [-1.48, 1.48]) {
  for (const z of [-19.55, -22.65]) {
    cylinder('safety zone post', 0.07, 0.72, [x, 0.37, z], materials.yellow, room, 18);
    cylinder('safety post cap', 0.09, 0.09, [x, 0.76, z], materials.black, room, 18);
  }
}
box('front safety rail', [3.02, 0.08, 0.08], [0, 0.66, -19.55], materials.yellow, room);
box('rear safety rail', [3.02, 0.08, 0.08], [0, 0.66, -22.65], materials.yellow, room);

function createRobotArm(x, z, mirror) { window.__bfTrace?.add(166);
  const robot = new THREE.Group();
  robot.name = 'industrial robot arm';
  robot.position.set(x, 0, z);
  room.add(robot);

  cylinder('robot base', 0.55, 0.36, [0, 0.18, 0], materials.robotDark, robot, 36);
  cylinder('orange turret', 0.4, 0.65, [0, 0.66, 0], materials.orange, robot, 28);
  const shoulder = cylinder('shoulder joint', 0.34, 0.62, [0, 1.02, 0], materials.robotDark, robot, 28);
  shoulder.rotation.z = Math.PI / 2;

  const upper = new THREE.Group();
  upper.position.set(0, 1.08, 0);
  upper.rotation.z = mirror * -0.52;
  robot.add(upper);
  box('upper robot link', [0.38, 1.65, 0.42], [0, 0.78, 0], materials.orange, upper);
  const elbow = cylinder('elbow joint', 0.32, 0.55, [0, 1.58, 0], materials.robotDark, upper, 28);
  elbow.rotation.z = Math.PI / 2;

  const forearm = new THREE.Group();
  forearm.position.set(0, 1.58, 0);
  forearm.rotation.z = mirror * 1.02;
  upper.add(forearm);
  box('white robot forearm', [0.32, 1.35, 0.36], [0, 0.64, 0], materials.whiteRobot, forearm);
  cylinder('wrist joint', 0.24, 0.42, [0, 1.3, 0], materials.robotDark, forearm, 24).rotation.z = Math.PI / 2;
  box('robot gripper palm', [0.58, 0.22, 0.46], [0, 1.55, 0], materials.orange, forearm);
  box('robot gripper left', [0.12, 0.52, 0.12], [-0.22, 1.8, 0], materials.robotDark, forearm);
  box('robot gripper right', [0.12, 0.52, 0.12], [0.22, 1.8, 0], materials.robotDark, forearm);
}

createRobotArm(-1.72, -18.15, -1);
createRobotArm(1.72, -18.15, 1);

// Cyan lane markings frame the robots without relying on textures.
for (const x of [-1.45, 1.45]) {
  box('robotics floor lane', [0.07, 0.025, 9.5], [x, 0.02, -20.3], materials.cyan, room, false);
}
for (const z of [-16.0, -24.6]) {
  box('robotics floor cross line', [3.0, 0.026, 0.07], [0, 0.022, z], materials.cyan, room, false);
}

const doorRig = new THREE.Group();
doorRig.name = 'outward opening double doors';
scene.add(doorRig);

function createDoor(side) { window.__bfTrace?.add(211);
  const pivot = new THREE.Group();
  pivot.name = side < 0 ? 'left door hinge' : 'right door hinge';
  pivot.position.set(side * 2.14, 0, -13.89);
  doorRig.add(pivot);

  const centerX = side < 0 ? 1.06 : -1.06;
  box('door leaf', [2.08, 3.82, 0.18], [centerX, 2.0, 0], materials.door, pivot);
  box('upper recessed panel', [1.62, 1.34, 0.06], [centerX, 2.94, 0.12], materials.doorInset, pivot);
  box('lower recessed panel', [1.62, 0.92, 0.06], [centerX, 1.08, 0.12], materials.doorInset, pivot);
  box('narrow observation glass', [0.5, 1.05, 0.07], [centerX, 2.8, 0.17], materials.glass, pivot, false);
  box('glass border top', [0.65, 0.08, 0.08], [centerX, 3.36, 0.2], materials.trim, pivot);
  box('glass border bottom', [0.65, 0.08, 0.08], [centerX, 2.24, 0.2], materials.trim, pivot);
  box('glass border outer', [0.08, 1.2, 0.08], [centerX - 0.285, 2.8, 0.2], materials.trim, pivot);
  box('glass border inner', [0.08, 1.2, 0.08], [centerX + 0.285, 2.8, 0.2], materials.trim, pivot);
  box('push plate', [0.48, 0.84, 0.07], [centerX + (side < 0 ? 0.62 : -0.62), 1.9, 0.18], materials.darkTrim, pivot);
  const handle = cylinder('horizontal push handle', 0.055, 0.72, [centerX + (side < 0 ? 0.62 : -0.62), 1.9, 0.28], materials.trim, pivot, 18);
  handle.rotation.z = Math.PI / 2;
  box('door kick plate', [1.78, 0.44, 0.055], [centerX, 0.48, 0.13], materials.trim, pivot);
  box(
    'yellow door edge marker',
    [0.065, 2.75, 0.07],
    [centerX + (side < 0 ? 0.88 : -0.88), 2.05, 0.17],
    materials.yellow,
    pivot,
    false
  );
  for (const y of [0.5, 2.0, 3.5]) {
    cylinder('visible hinge', 0.09, 0.32, [0, y, 0.05], materials.darkTrim, pivot, 16);
  }
  return pivot;
}

const leftDoor = createDoor(-1);
const rightDoor = createDoor(1);

// Status lintel: initially red, green once the opening clears.
box('status panel', [1.52, 0.48, 0.12], [0, 4.28, -13.86], materials.darkTrim);
const statusLeftMaterial = new THREE.MeshStandardMaterial({ color: 0xff3a31, emissive: 0xff1b13, emissiveIntensity: 1.7 });
const statusRightMaterial = statusLeftMaterial.clone();
cylinder('left status lamp', 0.105, 0.07, [-0.28, 4.29, -13.76], statusLeftMaterial, scene, 24).rotation.x = Math.PI / 2;
cylinder('right status lamp', 0.105, 0.07, [0.28, 4.29, -13.76], statusRightMaterial, scene, 24).rotation.x = Math.PI / 2;

const ambient = new THREE.HemisphereLight(0xbfe7ff, 0x23333a, 1.15);
scene.add(ambient);
const corridorKey = new THREE.DirectionalLight(0xe5f5ff, 1.0);
corridorKey.position.set(-3.5, 6.8, 5);
corridorKey.castShadow = true;
corridorKey.shadow.mapSize.set(1024, 1024);
corridorKey.shadow.camera.left = -8;
corridorKey.shadow.camera.right = 8;
corridorKey.shadow.camera.top = 6;
corridorKey.shadow.camera.bottom = -2;
corridorKey.shadow.camera.near = 1;
corridorKey.shadow.camera.far = 35;
scene.add(corridorKey);
const corridorFill = new THREE.PointLight(0xcceeff, 1.55, 18, 1.7);
corridorFill.position.set(0, 3.25, 3.2);
scene.add(corridorFill);
const roomGlow = new THREE.PointLight(0xc6f5ff, 4.8, 17, 1.5);
roomGlow.position.set(0, 3.3, -18.0);
roomGlow.castShadow = true;
roomGlow.shadow.mapSize.set(1024, 1024);
scene.add(roomGlow);

function clamp01(value) { window.__bfTrace?.add(276);
  return Math.min(1, Math.max(0, value));
}

function smoothstep(value) { window.__bfTrace?.add(280);
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
}

function update(time) { window.__bfTrace?.add(285);
  const t = Math.min(DURATION, Math.max(0, Number(time) || 0));
  const normalized = t / DURATION;

  // The doors are the sole edited motion: a clear, symmetric outward swing.
  const opening = smoothstep((t - 0.25) / 2.85);
  const angle = opening * THREE.MathUtils.degToRad(96);
  leftDoor.rotation.y = -angle;
  rightDoor.rotation.y = angle;

  const green = opening > 0.88;
  for (const material of [statusLeftMaterial, statusRightMaterial]) {
    material.color.setHex(green ? 0x39ef90 : 0xff3a31);
    material.emissive.setHex(green ? 0x1fdc73 : 0xff1b13);
  }

  // One stable uninterrupted camera path, independent from door state.
  const dolly = smoothstep(normalized);
  const x = THREE.MathUtils.lerp(-0.32, 0.16, dolly) + Math.sin(normalized * Math.PI) * 0.1;
  const y = THREE.MathUtils.lerp(1.66, 1.79, dolly) + Math.sin(normalized * Math.PI * 1.25) * 0.03;
  const z = THREE.MathUtils.lerp(6.15, -4.0, dolly);
  camera.position.set(x, y, z);
  camera.fov = THREE.MathUtils.lerp(51, 47, dolly);
  camera.updateProjectionMatrix();
  camera.lookAt(
    THREE.MathUtils.lerp(-0.08, 0.0, dolly),
    THREE.MathUtils.lerp(1.85, 1.68, dolly),
    -18.1
  );

  renderer.render(scene, camera);
}

let animationFrame = null;
function pause() { window.__bfTrace?.add(319);
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
}

function seek(seconds) { window.__bfTrace?.add(326);
  pause();
  update(seconds);
}

function getCameraState() { window.__bfTrace?.add(331);
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov
  };
}

window.reconstruction = { pause, seek, getCameraState };
window.__sceneReady = true;
seek(0);
