import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x203543);
scene.fog = new THREE.FogExp2(0x253640, 0.0095);

const camera = new THREE.PerspectiveCamera(74, WIDTH / HEIGHT, 0.04, 340);
scene.add(camera);

const hemi = new THREE.HemisphereLight(0x9fd8ed, 0x674832, 1.65);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffd8ae, 3.8);
sun.position.set(-18, 32, 25);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -35;
sun.shadow.camera.right = 35;
sun.shadow.camera.top = 35;
sun.shadow.camera.bottom = -35;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 110;
scene.add(sun);

const fill = new THREE.PointLight(0x5dd9ff, 17, 24, 2);
fill.position.set(0, 7, -10);
scene.add(fill);

const visorLight = new THREE.PointLight(0xb7e9f2, 6.5, 9, 2);
visorLight.position.set(0, 0.15, -0.2);
camera.add(visorLight);

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x665746, roughness: 0.96, metalness: 0.02 }),
  groundDark: new THREE.MeshStandardMaterial({ color: 0x302d2b, roughness: 1 }),
  rock: new THREE.MeshStandardMaterial({ color: 0x655b51, roughness: 1 }),
  darkRock: new THREE.MeshStandardMaterial({ color: 0x383b3a, roughness: 1 }),
  armor: new THREE.MeshStandardMaterial({ color: 0x38235f, roughness: 0.28, metalness: 0.82 }),
  armorLight: new THREE.MeshStandardMaterial({ color: 0x69479b, roughness: 0.24, metalness: 0.72 }),
  armorEdge: new THREE.MeshStandardMaterial({ color: 0x9a69c2, roughness: 0.2, metalness: 0.68 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x10151b, roughness: 0.4, metalness: 0.88 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x667985, roughness: 0.32, metalness: 0.82 }),
  cyan: new THREE.MeshStandardMaterial({
    color: 0x78e9ff,
    emissive: 0x16bce8,
    emissiveIntensity: 4,
    roughness: 0.18,
    metalness: 0.25,
  }),
  orange: new THREE.MeshStandardMaterial({
    color: 0xffb13b,
    emissive: 0xff5a08,
    emissiveIntensity: 3,
    roughness: 0.25,
  }),
};

function mesh(geometry, material, position, rotation = [0, 0, 0], parent = scene) {
  const value = new THREE.Mesh(geometry, material);
  value.position.set(...position);
  value.rotation.set(...rotation);
  value.castShadow = true;
  value.receiveShadow = true;
  parent.add(value);
  return value;
}

function box(size, material, position, rotation, parent) {
  return mesh(new THREE.BoxGeometry(...size), material, position, rotation, parent);
}

function cylinder(radiusTop, radiusBottom, height, segments, material, position, rotation, parent) {
  return mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
    position,
    rotation,
    parent,
  );
}

function smooth01(value) {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function easeOutCubic(value) {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return 1 - (1 - x) ** 3;
}

const ground = mesh(new THREE.PlaneGeometry(180, 260), materials.ground, [0, -0.02, -45], [-Math.PI / 2, 0, 0]);
ground.receiveShadow = true;

for (const x of [-12, -6, 6, 12]) {
  box([0.16, 0.035, 235], materials.groundDark, [x, 0.01, -45], [0, 0, 0]);
}

const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
for (let i = 0; i < 54; i += 1) {
  const side = i % 2 === 0 ? -1 : 1;
  const x = side * (9 + ((i * 7) % 27));
  const z = 34 - i * 3.25;
  const scale = 0.45 + ((i * 11) % 9) * 0.18;
  const rock = mesh(rockGeometry, i % 3 ? materials.rock : materials.darkRock, [x, scale * 0.52, z]);
  rock.scale.set(scale * (0.8 + (i % 4) * 0.18), scale, scale * (1.1 + (i % 3) * 0.2));
  rock.rotation.set(i * 0.31, i * 0.79, i * 0.17);
}

for (let i = 0; i < 9; i += 1) {
  const side = i % 2 === 0 ? -1 : 1;
  const x = side * (27 + (i % 3) * 7);
  const z = 18 - i * 18;
  const cliff = mesh(new THREE.DodecahedronGeometry(7 + (i % 3) * 2, 1), materials.darkRock, [x, 3.5, z]);
  cliff.scale.set(1.1, 0.75 + (i % 2) * 0.35, 1.7);
  cliff.rotation.y = i * 0.73;
}

// Blocky fortifications and antennae turn the terrain into a large active battlefield.
for (let i = 0; i < 8; i += 1) {
  const side = i % 2 === 0 ? -1 : 1;
  const fort = new THREE.Group();
  fort.position.set(side * (18 + (i % 3) * 5), 0, 12 - i * 19);
  scene.add(fort);
  box([5.5, 2.1, 4], materials.darkMetal, [0, 1.05, 0], [0, i * 0.2, 0], fort);
  box([3.6, 1.1, 3], materials.steel, [0, 2.45, 0], [0, i * 0.2, 0], fort);
  cylinder(0.1, 0.15, 7, 8, materials.steel, [0, 6.1, 0], [0, 0, 0], fort);
  mesh(new THREE.SphereGeometry(0.28, 12, 8), materials.orange, [0, 9.65, 0], [0, 0, 0], fort);
}

const smokeMaterial = new THREE.MeshLambertMaterial({
  color: 0x1a2024,
  transparent: true,
  opacity: 0.56,
  depthWrite: false,
});
for (let column = 0; column < 5; column += 1) {
  const side = column % 2 === 0 ? -1 : 1;
  const x = side * (18 + column * 3);
  const z = 4 - column * 23;
  for (let puff = 0; puff < 7; puff += 1) {
    const cloud = mesh(
      new THREE.IcosahedronGeometry(1.7 + puff * 0.28, 1),
      smokeMaterial,
      [x + Math.sin(puff * 1.7) * 1.2, 3.2 + puff * 2.25, z + Math.cos(puff) * 1.1],
    );
    cloud.scale.y = 1.25;
    cloud.castShadow = false;
  }
}

const dropship = new THREE.Group();
dropship.position.set(0, 6.6, 38);
scene.add(dropship);
box([8.5, 1.3, 13], materials.darkMetal, [0, 2.4, 3], [-0.04, 0, 0], dropship);
box([3.7, 0.45, 10], materials.steel, [0, -0.25, -4.2], [0.12, 0, 0], dropship);
box([15, 0.55, 5], materials.darkMetal, [0, 2.4, 3.3], [0, 0, 0], dropship);
box([1.1, 2.8, 8], materials.steel, [-3.8, 1.0, -1.2], [0, 0, -0.12], dropship);
box([1.1, 2.8, 8], materials.steel, [3.8, 1.0, -1.2], [0, 0, 0.12], dropship);
for (const x of [-5.2, 5.2]) {
  cylinder(1.05, 1.35, 4.2, 12, materials.darkMetal, [x, 2.2, 4.2], [Math.PI / 2, 0, 0], dropship);
  cylinder(0.62, 0.62, 0.2, 12, materials.cyan, [x, 2.2, 2.05], [Math.PI / 2, 0, 0], dropship);
}

const tank = new THREE.Group();
scene.add(tank);

box([5.9, 1.05, 9.3], materials.armor, [0, 2.25, 0], [0, 0, 0], tank);
box([5.45, 0.82, 3.2], materials.armorLight, [0, 2.72, -3.7], [-0.13, 0, 0], tank);
box([4.5, 0.55, 3.3], materials.armorEdge, [0, 2.92, 3.45], [0.08, 0, 0], tank);
for (const side of [-1, 1]) {
  mesh(
    new THREE.ConeGeometry(0.42, 1.8, 4),
    materials.armorEdge,
    [side * 2.5, 3.25, -2.15],
    [0, 0, side * -0.52],
    tank,
  );
  box([1.65, 0.13, 0.35], materials.darkMetal, [side * 1.75, 3.13, 2.75], [0, 0, 0], tank);
}

for (const side of [-1, 1]) {
  const pod = new THREE.Group();
  pod.position.x = side * 3.45;
  tank.add(pod);
  box([1.35, 1.45, 8.7], materials.armor, [0, 2.05, 0], [0, 0, side * 0.035], pod);
  box([1.55, 0.68, 3.1], materials.armorLight, [0, 2.62, -3.5], [-0.18, 0, 0], pod);
  box([1.1, 0.12, 7.1], materials.cyan, [0, 1.31, 0.15], [0, 0, 0], pod);
  for (const z of [-3, -1, 1, 3]) {
    box([1.52, 0.12, 0.12], materials.armorEdge, [0, 2.78, z], [0, 0, 0], pod);
  }
}

const turret = new THREE.Group();
turret.position.set(0, 3.22, -0.4);
tank.add(turret);
cylinder(2.15, 2.35, 0.72, 12, materials.armorLight, [0, 0, 0], [0, 0, 0], turret);
cylinder(1.65, 1.85, 0.55, 12, materials.armor, [0, 0.47, 0.05], [0, 0, 0], turret);

const cannon = new THREE.Group();
cannon.position.set(0, 0.52, -1.25);
turret.add(cannon);
for (const x of [-0.48, 0.48]) {
  cylinder(0.24, 0.34, 5.3, 12, materials.darkMetal, [x, 0, -2.4], [Math.PI / 2, 0, 0], cannon);
  cylinder(0.3, 0.3, 0.6, 12, materials.cyan, [x, 0, -5.05], [Math.PI / 2, 0, 0], cannon);
}
box([1.75, 0.55, 1.6], materials.armorEdge, [0, 0, -0.35], [-0.06, 0, 0], cannon);

const hatchWell = mesh(
  new THREE.CylinderGeometry(1.05, 1.05, 0.28, 24, 1, true),
  materials.darkMetal,
  [0, 0.91, 0.43],
  [0, 0, 0],
  turret,
);
const cockpitCavity = mesh(
  new THREE.CylinderGeometry(0.82, 0.65, 0.54, 20, 1, true),
  materials.darkMetal,
  [0, 0.67, 0.43],
  [0, 0, 0],
  turret,
);
const innerGlow = cylinder(0.57, 0.57, 0.08, 20, materials.orange.clone(), [0, 0.43, 0.43], [0, 0, 0], turret);
innerGlow.visible = false;
const cockpitDetails = new THREE.Group();
cockpitDetails.position.set(0, 0.77, 0.43);
turret.add(cockpitDetails);
box([0.3, 0.25, 0.42], materials.steel, [0, 0, -0.08], [-0.2, 0, 0], cockpitDetails);
for (const side of [-1, 1]) {
  box([0.15, 0.08, 0.34], materials.cyan, [side * 0.38, 0.08, 0.05], [-0.25, side * 0.2, 0], cockpitDetails);
}
cockpitDetails.visible = false;
const hatchRing = mesh(
  new THREE.TorusGeometry(1.02, 0.11, 10, 32),
  materials.armorEdge,
  [0, 1.03, 0.43],
  [Math.PI / 2, 0, 0],
  turret,
);

const hatchPivot = new THREE.Group();
hatchPivot.position.set(0, 1.08, -0.48);
turret.add(hatchPivot);
const hatch = cylinder(0.92, 1.0, 0.22, 16, materials.armorLight, [0, 0, 0.88], [0, 0, 0], hatchPivot);
const hatchUnderside = cylinder(0.78, 0.78, 0.035, 16, materials.darkMetal, [0, -0.13, 0.88], [0, 0, 0], hatchPivot);
for (const angle of [-0.55, 0, 0.55]) {
  box([0.12, 0.08, 1.25], materials.steel, [angle, -0.16, 0.88], [0, 0, angle * 0.3], hatchPivot);
}
for (const x of [-0.55, 0.55]) {
  cylinder(0.07, 0.07, 0.65, 8, materials.steel, [x, 0.18, 0.95], [Math.PI / 2, 0, 0], hatchPivot);
  box([0.28, 0.28, 0.42], materials.darkMetal, [x * 0.95, 0, -0.05], [0, 0, 0], hatchPivot);
}

for (const side of [-1, 1]) {
  cylinder(0.08, 0.08, 1.15, 8, materials.steel, [side * 1.75, 3.18, 2.4], [Math.PI / 2, 0, 0], tank);
  cylinder(0.08, 0.08, 0.65, 8, materials.steel, [side * 1.75, 2.85, 1.85], [0, 0, 0], tank);
}

const dustMaterial = new THREE.MeshLambertMaterial({
  color: 0xa89373,
  transparent: true,
  opacity: 0.3,
  depthWrite: false,
});
const dustPuffs = [];
for (let i = 0; i < 14; i += 1) {
  const puff = mesh(new THREE.IcosahedronGeometry(1.1, 1), dustMaterial.clone(), [0, 0, 0]);
  puff.castShadow = false;
  dustPuffs.push(puff);
}

const plasmaEvents = [
  { start: 0.34, y: 8.2, z: -5, reverse: false, color: 0x52e9ff },
  { start: 0.86, y: 6.7, z: -10, reverse: true, color: 0xff59ef },
  { start: 1.52, y: 7.2, z: -7, reverse: false, color: 0x52e9ff },
  { start: 2.28, y: 6.4, z: -11, reverse: true, color: 0xff59ef },
  { start: 3.12, y: 7.7, z: -8, reverse: false, color: 0x52e9ff },
  { start: 4.02, y: 6.6, z: -10, reverse: true, color: 0xff59ef },
  { start: 4.58, y: 8.1, z: -13, reverse: false, color: 0x52e9ff },
];
const plasmaBolts = plasmaEvents.map((event, index) => {
  const group = new THREE.Group();
  scene.add(group);
  const boltMaterial = new THREE.MeshBasicMaterial({ color: event.color, transparent: true });
  const core = cylinder(0.12, 0.12, 5.8, 10, boltMaterial, [0, 0, 0], [0, 0, Math.PI / 2], group);
  const halo = cylinder(
    0.28,
    0.28,
    7.2,
    10,
    new THREE.MeshBasicMaterial({
      color: event.color,
      transparent: true,
      opacity: 0.24,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    [0, 0, 0],
    [0, 0, Math.PI / 2],
    group,
  );
  core.castShadow = false;
  halo.castShadow = false;
  const light = new THREE.PointLight(event.color, 18, 9, 2);
  group.add(light);
  group.userData = { event, index, core, halo, light };
  return group;
});

const explosionEvents = [
  { start: 0.72, local: new THREE.Vector3(-12, 1.2, -16) },
  { start: 2.62, local: new THREE.Vector3(13, 1.3, -19) },
  { start: 4.18, local: new THREE.Vector3(-10, 1.4, -22) },
];
const explosions = explosionEvents.map((event) => {
  const group = new THREE.Group();
  scene.add(group);
  const outer = mesh(
    new THREE.IcosahedronGeometry(1.2, 2),
    new THREE.MeshBasicMaterial({
      color: 0xff5516,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
    [0, 0, 0],
    [0, 0, 0],
    group,
  );
  const core = mesh(new THREE.IcosahedronGeometry(0.66, 1), materials.orange, [0, 0, 0], [0, 0, 0], group);
  const light = new THREE.PointLight(0xff6a1a, 28, 20, 2);
  group.add(light);
  group.userData = { event, outer, core, light };
  return group;
});

function createArm(side) {
  const group = new THREE.Group();
  camera.add(group);
  const sleeveMaterial = new THREE.MeshStandardMaterial({
    color: side < 0 ? 0x3b626c : 0x456e76,
    roughness: 0.55,
    metalness: 0.45,
  });
  const forearm = cylinder(0.18, 0.26, 1.0, 10, sleeveMaterial, [0, 0, 0], [0, 0, 0], group);
  const cuff = cylinder(0.27, 0.27, 0.24, 10, materials.darkMetal, [0, 0, 0], [0, 0, 0], group);
  const hand = mesh(new THREE.SphereGeometry(0.23, 12, 8), materials.steel, [0, 0, 0], [0, 0, 0], group);
  hand.scale.set(1.05, 0.82, 1.35);
  const knuckle = box([0.36, 0.11, 0.27], materials.armorEdge, [0, 0, 0], [0, 0, 0], group);
  return { group, forearm, cuff, hand, knuckle, side };
}

const leftArm = createArm(-1);
const rightArm = createArm(1);

const hudMaterial = new THREE.MeshBasicMaterial({
  color: 0x71d9ea,
  transparent: true,
  opacity: 0.48,
  depthTest: false,
});
const reticle = mesh(new THREE.RingGeometry(0.018, 0.024, 16), hudMaterial, [0, 0, -1.1], [0, 0, 0], camera);
reticle.renderOrder = 100;
for (const side of [-1, 1]) {
  const helmetEdge = box(
    [0.18, 1.0, 0.05],
    new THREE.MeshBasicMaterial({ color: 0x050709, depthTest: false }),
    [side * 0.87, -0.44, -0.55],
    [0, side * 0.18, side * -0.1],
    camera,
  );
  helmetEdge.renderOrder = 99;
}

function alignSegment(object, start, end) {
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start);
  object.position.copy(midpoint);
  object.scale.set(1, direction.length(), 1);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
}

function setArmPose(arm, handPosition, elbowPosition, twist = 0) {
  alignSegment(arm.forearm, elbowPosition, handPosition);
  const cuffPoint = handPosition.clone().lerp(elbowPosition, 0.14);
  arm.cuff.position.copy(cuffPoint);
  arm.cuff.quaternion.copy(arm.forearm.quaternion);
  arm.hand.position.copy(handPosition);
  arm.hand.rotation.set(-0.2, arm.side * 0.2, twist);
  arm.knuckle.position.copy(handPosition).add(new THREE.Vector3(0, 0.075, -0.08));
  arm.knuckle.rotation.copy(arm.hand.rotation);
}

function tankLocal(vector) {
  return tank.localToWorld(vector.clone());
}

const cameraPosition = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const tankEndPosition = new THREE.Vector3();
const tempVector = new THREE.Vector3();
const tempVector2 = new THREE.Vector3();

function updateTank(time) {
  tank.position.set(Math.sin(time * 1.05) * 0.72, 0.08 + Math.sin(time * 8.2) * 0.035, 18 - time * 17.2);
  tank.rotation.set(0, Math.sin(time * 0.75) * 0.035, Math.sin(time * 1.4) * 0.012);
  turret.rotation.y = Math.sin(time * 0.92) * 0.16;
  cannon.rotation.x = Math.sin(time * 1.7) * 0.025;
  tank.updateMatrixWorld(true);

  const hatchProgress = smooth01((time - 4.28) / 0.66);
  const tensionAge = time - 4.08;
  const resistedShake = tensionAge >= 0 && tensionAge < 0.28
    ? Math.sin(tensionAge * 85) * Math.sin((tensionAge / 0.28) * Math.PI) * 0.035
    : 0;
  hatchPivot.rotation.x = -hatchProgress * 1.72 + resistedShake;
  innerGlow.visible = hatchProgress > 0.06;
  cockpitDetails.visible = hatchProgress > 0.18;
  innerGlow.material.emissiveIntensity = 2.5 + hatchProgress * 6;
  hatchRing.material.emissive = new THREE.Color(0x2a123f);
  hatchRing.material.emissiveIntensity = hatchProgress * 1.5;
}

function updateCamera(time) {
  const landingTime = 1.25;
  if (time < landingTime) {
    const progress = smooth01(time / landingTime);
    const start = new THREE.Vector3(0, 8.15, 32.0);
    tankEndPosition.copy(tankLocal(new THREE.Vector3(0, 4.45, 5.15)));
    cameraPosition.lerpVectors(start, tankEndPosition, progress);
    cameraPosition.y += Math.sin(progress * Math.PI) * 3.7;
    cameraPosition.x += Math.sin(progress * Math.PI) * 0.7;
    cameraTarget.copy(tankLocal(new THREE.Vector3(0, 3.2, -1.3)));
    camera.fov = THREE.MathUtils.lerp(71, 83, Math.sin(progress * Math.PI));
  } else if (time < 2.12) {
    const progress = smooth01((time - landingTime) / 0.87);
    tempVector.set(0, 4.45, 5.15).lerp(new THREE.Vector3(0, 4.15, 4.55), progress);
    cameraPosition.copy(tankLocal(tempVector));
    cameraTarget.copy(tankLocal(new THREE.Vector3(0, 3.04, -0.4)));
    camera.fov = THREE.MathUtils.lerp(79, 74, progress);
  } else if (time < 3.72) {
    const progress = smooth01((time - 2.12) / 1.6);
    tempVector.set(0, 4.15, 4.55).lerp(new THREE.Vector3(0, 5.0, 2.0), progress);
    tempVector.x += Math.sin(progress * Math.PI * 4) * 0.13;
    tempVector.y += Math.sin(progress * Math.PI * 4) * 0.1;
    cameraPosition.copy(tankLocal(tempVector));
    cameraTarget.copy(tankLocal(new THREE.Vector3(0, 3.65, -1.0)));
    camera.fov = 74;
  } else {
    const progress = smooth01((time - 3.72) / 1.44);
    const recoil = easeOutCubic((time - 4.28) / 0.78);
    tempVector.set(0, 5.0, 2.0).lerp(new THREE.Vector3(0, 5.12, 2.05), progress);
    tempVector.y += recoil * 0.18;
    tempVector.z += recoil * 0.38;
    cameraPosition.copy(tankLocal(tempVector));
    cameraTarget.copy(tankLocal(new THREE.Vector3(0, 4.08, 0.0)));
    camera.fov = THREE.MathUtils.lerp(74, 70, progress);
  }

  let shake = 0;
  const impactAge = time - landingTime;
  if (impactAge >= 0 && impactAge < 0.75) {
    shake = Math.sin(impactAge * 54) * Math.exp(-impactAge * 5.2) * 0.18;
  }
  cameraPosition.y += shake;
  cameraPosition.x += Math.sin(time * 27) * 0.012;
  camera.position.copy(cameraPosition);
  camera.lookAt(cameraTarget);
  camera.rotation.z += Math.sin(time * 4.5) * 0.008 + shake * 0.08;
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

function updateArms(time) {
  let left = new THREE.Vector3(-0.54, -0.62, -1.02);
  let right = new THREE.Vector3(0.54, -0.62, -1.02);

  if (time < 1.25) {
    const reach = smooth01((time - 0.32) / 0.82);
    left.lerp(new THREE.Vector3(-0.57, -0.15, -1.58), reach);
    right.lerp(new THREE.Vector3(0.57, -0.15, -1.58), reach);
    left.y += Math.sin(time * 8) * 0.035;
    right.y -= Math.sin(time * 8) * 0.035;
  } else if (time < 2.12) {
    const settle = smooth01((time - 1.25) / 0.42);
    left.lerpVectors(new THREE.Vector3(-0.62, -0.04, -1.48), new THREE.Vector3(-0.58, -0.2, -1.36), settle);
    right.lerpVectors(new THREE.Vector3(0.62, -0.04, -1.48), new THREE.Vector3(0.58, -0.2, -1.36), settle);
  } else if (time < 3.72) {
    const phase = ((time - 2.12) / 0.8) * Math.PI * 2;
    const leftPull = (Math.sin(phase) + 1) * 0.5;
    const rightPull = (Math.sin(phase + Math.PI) + 1) * 0.5;
    left.set(-0.6, THREE.MathUtils.lerp(-0.4, 0.16, leftPull), THREE.MathUtils.lerp(-1.1, -1.72, leftPull));
    right.set(0.6, THREE.MathUtils.lerp(-0.4, 0.16, rightPull), THREE.MathUtils.lerp(-1.1, -1.72, rightPull));
  } else if (time < 4.22) {
    const reach = smooth01((time - 3.72) / 0.5);
    left.lerpVectors(new THREE.Vector3(-0.55, -0.28, -1.28), new THREE.Vector3(-0.62, -0.05, -1.55), reach);
    right.lerpVectors(new THREE.Vector3(0.55, -0.28, -1.28), new THREE.Vector3(0.62, -0.05, -1.55), reach);
  } else {
    const pull = easeOutCubic((time - 4.22) / 0.78);
    left.lerpVectors(new THREE.Vector3(-0.62, -0.05, -1.55), new THREE.Vector3(-0.52, -0.45, -1.05), pull);
    right.lerpVectors(new THREE.Vector3(0.62, -0.05, -1.55), new THREE.Vector3(0.52, -0.45, -1.05), pull);
  }

  const leftElbow = new THREE.Vector3(-0.82, -0.79, -0.42);
  const rightElbow = new THREE.Vector3(0.82, -0.79, -0.42);
  setArmPose(leftArm, left, leftElbow, -0.08);
  setArmPose(rightArm, right, rightElbow, 0.08);
}

function updateEffects(time) {
  plasmaBolts.forEach((bolt) => {
    const { event, index, core, halo, light } = bolt.userData;
    const age = time - event.start;
    const progress = age / 0.38;
    bolt.visible = progress >= 0 && progress <= 1;
    if (bolt.visible) {
      const direction = event.reverse ? -1 : 1;
      const x = direction * THREE.MathUtils.lerp(-13, 13, progress);
      const position = tankLocal(new THREE.Vector3(x, event.y, event.z));
      bolt.position.copy(position);
      bolt.rotation.y = (event.reverse ? -1 : 1) * (0.07 + index * 0.008);
      const opacity = Math.sin(progress * Math.PI);
      core.material.opacity = opacity;
      halo.material.opacity = opacity * 0.26;
      light.intensity = opacity * 18;
    }
  });

  explosions.forEach((explosion) => {
    const { event, outer, core, light } = explosion.userData;
    const age = time - event.start;
    const progress = age / 0.72;
    explosion.visible = progress >= 0 && progress <= 1;
    if (explosion.visible) {
      explosion.position.copy(tankLocal(event.local));
      const scale = 0.25 + easeOutCubic(progress) * 3.0;
      explosion.scale.setScalar(scale);
      outer.material.opacity = (1 - progress) * 0.9;
      core.material.opacity = 1 - progress;
      light.intensity = (1 - progress) * 35;
    }
  });

  dustPuffs.forEach((puff, index) => {
    const phase = (time * 0.72 + index / dustPuffs.length) % 1;
    const side = index % 2 === 0 ? -1 : 1;
    const local = new THREE.Vector3(
      side * (2.2 + phase * 3.3),
      0.65 + phase * 1.4,
      3.0 + phase * 10.5,
    );
    puff.position.copy(tankLocal(local));
    const scale = 0.45 + phase * 2.4;
    puff.scale.set(scale * 1.45, scale * 0.75, scale * 1.8);
    puff.material.opacity = (1 - phase) * 0.26;
  });

  fill.position.copy(tankLocal(new THREE.Vector3(0, 5.2, -4)));
  fill.intensity = 7 + Math.max(0, Math.sin(time * 2.2)) * 4;
}

function renderAt(time) {
  const safeTime = THREE.MathUtils.clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  updateTank(safeTime);
  updateCamera(safeTime);
  updateArms(safeTime);
  updateEffects(safeTime);
  renderer.render(scene, camera);
  window.__reconstructionTime = safeTime;
}

let paused = false;
let animationStart = performance.now();
let animationOffset = 0;

function animate(now) {
  if (paused) {
    return;
  }
  const time = ((now - animationStart) / 1000 + animationOffset) % DURATION;
  renderAt(time);
  requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    paused = true;
    renderAt(window.__reconstructionTime ?? 0);
  },
  seek(seconds) {
    paused = true;
    renderAt(Number(seconds));
  },
};

renderAt(0);
window.sceneReady = true;
requestAnimationFrame(animate);
