import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;
const FREEZE_EVENT_TIME = 0.9;
const FREEZE_START = 0.75;
const FREEZE_END = 4.7;
// Keep the original landing endpoint after the longer frozen camera move.
const RESUME_RATE = (((FRAME_COUNT - 1) / FPS - 4.35) * 1.6)
  / ((FRAME_COUNT - 1) / FPS - FREEZE_END);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9fd8f6);
scene.fog = new THREE.Fog(0xb9dcdf, 16, 42);

const sky = new THREE.Mesh(
  new THREE.SphereGeometry(58, 40, 24),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x5eb9ee) },
      horizonColor: { value: new THREE.Color(0xccecff) },
      sunColor: { value: new THREE.Color(0xfff4c4) },
    },
    vertexShader: `
      varying vec3 vWorldDirection;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldDirection = normalize(worldPosition.xyz);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 sunColor;
      varying vec3 vWorldDirection;
      void main() {
        float gradient = smoothstep(-0.08, 0.72, vWorldDirection.y);
        vec3 skyColor = mix(horizonColor, topColor, gradient);
        vec3 sunDirection = normalize(vec3(-0.42, 0.72, 0.54));
        float sunGlow = pow(max(dot(vWorldDirection, sunDirection), 0.0), 96.0);
        skyColor += sunColor * sunGlow * 0.72;
        gl_FragColor = vec4(skyColor, 1.0);
      }
    `,
  }),
);
sky.renderOrder = -1000;
scene.add(sky);

const camera = new THREE.PerspectiveCamera(42, WIDTH / HEIGHT, 0.1, 100);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xd9efff, 0x50762f, 2.0);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff1cf, 4.2);
sun.position.set(-7, 13, 8);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -13;
sun.shadow.camera.right = 13;
sun.shadow.camera.top = 13;
sun.shadow.camera.bottom = -13;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 35;
sun.shadow.bias = -0.0002;
scene.add(sun);

const rimLight = new THREE.DirectionalLight(0xc8e5ff, 1.15);
rimLight.position.set(8, 6, -7);
scene.add(rimLight);

function shadowed(object, cast = true, receive = false) {
  object.castShadow = cast;
  object.receiveShadow = receive;
  return object;
}

function mesh(geometry, material, cast = true, receive = false) {
  return shadowed(new THREE.Mesh(geometry, material), cast, receive);
}

function material(color, roughness = 0.7, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

function smoothstep(a, b, value) {
  const x = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

function lerpVector(a, b, amount) {
  return new THREE.Vector3().lerpVectors(a, b, amount);
}

function seeded(index, salt = 0) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function roundedLimb(length, radius, color) {
  const group = new THREE.Group();
  const limbMaterial = material(color, 0.95);
  const shaft = mesh(new THREE.CylinderGeometry(radius, radius * 1.06, length, 12), limbMaterial);
  shaft.position.y = -length * 0.5;
  group.add(shaft);
  const joint = mesh(new THREE.SphereGeometry(radius, 12, 8), limbMaterial);
  joint.position.y = -length;
  group.add(joint);
  return group;
}

function createTree(x, z, scale, hue = 0) {
  const tree = new THREE.Group();
  tree.position.set(x, 0, z);
  tree.scale.setScalar(scale);

  const trunk = mesh(
    new THREE.CylinderGeometry(0.25, 0.38, 3.4, 10),
    material(0x765036, 1),
  );
  trunk.position.y = 1.7;
  tree.add(trunk);

  const leafColors = [0x397b32, 0x4b8f3c, 0x2f6d32, 0x65a447];
  const canopyData = [
    [0, 3.7, 0, 1.22],
    [-0.75, 3.55, 0.1, 0.9],
    [0.7, 3.65, -0.1, 0.98],
    [-0.2, 4.55, -0.05, 0.92],
    [0.15, 4.05, 0.6, 0.86],
  ];
  canopyData.forEach((data, index) => {
    const leaves = mesh(
      new THREE.IcosahedronGeometry(data[3], 2),
      material(leafColors[(index + hue) % leafColors.length], 0.94),
    );
    leaves.position.set(data[0], data[1], data[2]);
    leaves.scale.y = 0.88;
    tree.add(leaves);
  });
  scene.add(tree);
}

function createCloud(x, y, z, scale) {
  const cloud = new THREE.Group();
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    transparent: true,
    opacity: 0.88,
    depthWrite: false,
  });
  [
    [-0.8, 0, 0, 0.75],
    [0, 0.2, 0, 1],
    [0.9, 0, 0, 0.7],
    [0.25, -0.15, 0.35, 0.72],
  ].forEach(([px, py, pz, ps]) => {
    const puff = mesh(new THREE.SphereGeometry(ps, 18, 12), cloudMaterial, false);
    puff.position.set(px, py, pz);
    cloud.add(puff);
  });
  cloud.position.set(x, y, z);
  cloud.scale.setScalar(scale);
  scene.add(cloud);
}

const ground = mesh(
  new THREE.CircleGeometry(38, 96),
  material(0x5f9b43, 0.98),
  false,
  true,
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const path = mesh(
  new THREE.PlaneGeometry(42, 3.1),
  material(0xc9ad78, 1),
  false,
  true,
);
path.rotation.x = -Math.PI / 2;
path.position.set(0, 0.012, -6.4);
scene.add(path);

const pathEdgeA = mesh(new THREE.BoxGeometry(42, 0.06, 0.08), material(0xe0c795, 1), false, true);
pathEdgeA.position.set(0, 0.04, -4.86);
scene.add(pathEdgeA);
const pathEdgeB = pathEdgeA.clone();
pathEdgeB.position.z = -7.94;
scene.add(pathEdgeB);

[
  [-9.5, -8.7, 1.45, 0],
  [-4.4, -9.2, 1.05, 2],
  [1.5, -10.5, 1.35, 1],
  [8.2, -8.4, 1.18, 3],
  [12.5, -2.8, 1.3, 0],
  [12.2, 6.2, 1.2, 2],
  [5.2, 10.8, 1.45, 1],
  [-5.5, 11.4, 1.3, 3],
  [-12.5, 6.6, 1.15, 0],
  [-13.2, -1.4, 1.35, 1],
].forEach(([x, z, scale, hue]) => createTree(x, z, scale, hue));

createCloud(-8, 10.5, -18, 1.3);
createCloud(7, 12.3, -20, 1.7);
createCloud(16, 9.2, -10, 1.15);

const bench = new THREE.Group();
bench.position.set(-2.8, 0, -5.2);
const benchWood = material(0x8d5834, 0.78);
const benchMetal = material(0x35413d, 0.5, 0.3);
for (const y of [0.75, 1.15]) {
  const slat = mesh(new THREE.BoxGeometry(3.2, 0.18, 0.22), benchWood);
  slat.position.set(0, y, 0);
  bench.add(slat);
}
const seat = mesh(new THREE.BoxGeometry(3.2, 0.18, 0.75), benchWood);
seat.position.set(0, 0.72, 0.35);
bench.add(seat);
for (const x of [-1.25, 1.25]) {
  const leg = mesh(new THREE.BoxGeometry(0.12, 0.72, 0.12), benchMetal);
  leg.position.set(x, 0.36, 0.28);
  bench.add(leg);
}
scene.add(bench);

const grassMaterial = material(0x3e7f35, 1);
for (let i = 0; i < 150; i += 1) {
  const angle = seeded(i, 1) * Math.PI * 2;
  const radius = 2.7 + seeded(i, 2) * 13;
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  if (Math.abs(z + 6.4) < 1.8) continue;
  const blade = mesh(new THREE.ConeGeometry(0.025, 0.24 + seeded(i, 3) * 0.26, 4), grassMaterial, false);
  blade.position.set(x, blade.geometry.parameters.height * 0.5, z);
  blade.rotation.y = seeded(i, 4) * Math.PI;
  scene.add(blade);
}

const flowerColors = [0xffffff, 0xffdf4a, 0xe8d4ff];
for (let i = 0; i < 34; i += 1) {
  const flower = new THREE.Group();
  const angle = seeded(i, 7) * Math.PI * 2;
  const radius = 3.5 + seeded(i, 8) * 9;
  flower.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
  const stem = mesh(new THREE.CylinderGeometry(0.012, 0.016, 0.24, 5), grassMaterial, false);
  stem.position.y = 0.12;
  flower.add(stem);
  const bloom = mesh(
    new THREE.SphereGeometry(0.055, 8, 6),
    material(flowerColors[i % flowerColors.length], 0.8),
    false,
  );
  bloom.position.y = 0.26;
  flower.add(bloom);
  scene.add(flower);
}

const dog = new THREE.Group();
scene.add(dog);

const furGold = material(0xb86f2d, 0.9);
const furLight = material(0xe0ad68, 0.95);
const furDark = material(0x6b351f, 0.95);
const noseMaterial = material(0x211b19, 0.46);
const mouthMaterial = material(0x3c1715, 0.8);
const tongueMaterial = material(0xd87576, 0.8);

const body = mesh(new THREE.SphereGeometry(0.72, 32, 20), furGold);
body.scale.set(1.75, 0.92, 0.9);
dog.add(body);

const chest = mesh(new THREE.SphereGeometry(0.68, 28, 18), furLight);
chest.position.set(0.78, 0.08, 0);
chest.scale.set(0.82, 1.03, 0.92);
dog.add(chest);

const neck = mesh(new THREE.CylinderGeometry(0.46, 0.59, 0.8, 20), furGold);
neck.rotation.z = -0.7;
neck.position.set(0.95, 0.38, 0);
dog.add(neck);

const head = mesh(new THREE.SphereGeometry(0.58, 30, 20), furGold);
head.position.set(1.35, 0.55, 0);
head.scale.set(1.04, 0.95, 0.9);
dog.add(head);

const muzzleUpper = mesh(new THREE.SphereGeometry(0.35, 24, 16), furLight);
muzzleUpper.position.set(1.82, 0.43, 0);
muzzleUpper.scale.set(1.28, 0.67, 0.72);
dog.add(muzzleUpper);

const mouthInterior = mesh(new THREE.SphereGeometry(0.29, 20, 12), mouthMaterial);
mouthInterior.position.set(1.78, 0.2, 0);
mouthInterior.scale.set(1.35, 0.42, 0.67);
dog.add(mouthInterior);

const lowerJaw = mesh(new THREE.SphereGeometry(0.3, 22, 14), furLight);
lowerJaw.position.set(1.72, 0.07, 0);
lowerJaw.rotation.z = -0.1;
lowerJaw.scale.set(1.32, 0.48, 0.68);
dog.add(lowerJaw);

const tongue = mesh(new THREE.SphereGeometry(0.18, 18, 10), tongueMaterial);
tongue.position.set(1.88, 0.12, 0);
tongue.scale.set(1.2, 0.3, 0.68);
dog.add(tongue);

const toothMaterial = material(0xfff4d2, 0.42);
for (const side of [-1, 1]) {
  const upperTooth = mesh(new THREE.ConeGeometry(0.055, 0.16, 10), toothMaterial);
  upperTooth.position.set(1.96, 0.3, side * 0.22);
  upperTooth.rotation.z = Math.PI;
  dog.add(upperTooth);

  const lowerTooth = mesh(new THREE.ConeGeometry(0.045, 0.12, 10), toothMaterial);
  lowerTooth.position.set(1.9, 0.16, side * 0.2);
  dog.add(lowerTooth);
}

const nose = mesh(new THREE.SphereGeometry(0.2, 20, 14), noseMaterial);
nose.position.set(2.14, 0.49, 0);
nose.scale.set(0.9, 0.75, 1);
dog.add(nose);

for (const side of [-1, 1]) {
  const eyeWhite = mesh(new THREE.SphereGeometry(0.105, 14, 10), material(0xf7f0dd, 0.55));
  eyeWhite.position.set(1.55, 0.78, side * 0.42);
  eyeWhite.scale.set(0.78, 1, 0.52);
  dog.add(eyeWhite);
  const pupil = mesh(new THREE.SphereGeometry(0.052, 12, 8), noseMaterial);
  pupil.position.set(1.61, 0.79, side * 0.47);
  dog.add(pupil);

  const ear = mesh(new THREE.SphereGeometry(0.34, 20, 14), furDark);
  ear.position.set(1.1, 0.82, side * 0.43);
  ear.rotation.x = side * 0.22;
  ear.rotation.z = -0.35;
  ear.scale.set(0.75, 1.4, 0.35);
  dog.add(ear);
}

const collar = mesh(new THREE.TorusGeometry(0.49, 0.065, 10, 30), material(0x1b74b9, 0.42, 0.08));
collar.rotation.y = Math.PI / 2;
collar.rotation.z = -0.72;
collar.position.set(1.02, 0.33, 0);
dog.add(collar);

const tag = mesh(new THREE.SphereGeometry(0.09, 14, 10), material(0xf2c94c, 0.3, 0.55));
tag.position.set(1.16, -0.08, 0.32);
tag.scale.set(1, 1.25, 0.35);
dog.add(tag);

const legs = [];
function addLeg(x, z, upperAngle, lowerAngle) {
  const root = new THREE.Group();
  root.position.set(x, -0.38, z);
  root.rotation.z = upperAngle;
  dog.add(root);

  const upper = roundedLimb(0.72, 0.16, 0xb86f2d);
  root.add(upper);

  const lowerPivot = new THREE.Group();
  lowerPivot.position.y = -0.7;
  lowerPivot.rotation.z = lowerAngle;
  root.add(lowerPivot);
  const lower = roundedLimb(0.57, 0.125, 0xd49a57);
  lowerPivot.add(lower);

  const paw = mesh(new THREE.SphereGeometry(0.17, 14, 10), furLight);
  paw.position.set(0.08, -0.56, 0);
  paw.scale.set(1.45, 0.65, 1);
  lowerPivot.add(paw);
  legs.push({ root, lowerPivot, baseUpper: upperAngle, baseLower: lowerAngle });
}

addLeg(0.72, 0.44, 1.12, -0.5);
addLeg(0.68, -0.44, 0.92, -0.35);
addLeg(-0.72, 0.43, -1.02, 0.45);
addLeg(-0.76, -0.43, -0.86, 0.3);

const tail = new THREE.Group();
tail.position.set(-1.18, 0.25, 0);
tail.rotation.z = 1.15;
dog.add(tail);
const tailMain = mesh(new THREE.CylinderGeometry(0.12, 0.22, 1.25, 14), furGold);
tailMain.position.y = 0.6;
tail.add(tailMain);
const tailTip = mesh(new THREE.SphereGeometry(0.15, 14, 10), furLight);
tailTip.position.y = 1.22;
tailTip.scale.y = 1.4;
tail.add(tailTip);

const frisbee = new THREE.Group();
scene.add(frisbee);
const frisbeeRed = new THREE.MeshPhysicalMaterial({
  color: 0xe31d35,
  roughness: 0.24,
  metalness: 0.04,
  clearcoat: 0.9,
  clearcoatRoughness: 0.14,
});
const frisbeeDark = new THREE.MeshPhysicalMaterial({
  color: 0x9e1020,
  roughness: 0.32,
  clearcoat: 0.75,
  clearcoatRoughness: 0.18,
});
const disc = mesh(new THREE.CylinderGeometry(0.5, 0.47, 0.09, 48), frisbeeRed);
frisbee.add(disc);
const rim = mesh(new THREE.TorusGeometry(0.47, 0.075, 12, 48), frisbeeDark);
rim.rotation.x = Math.PI / 2;
rim.position.y = 0.035;
frisbee.add(rim);
const inset = mesh(
  new THREE.CylinderGeometry(0.3, 0.34, 0.045, 40),
  new THREE.MeshPhysicalMaterial({
    color: 0xff5a61,
    roughness: 0.2,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  }),
);
inset.position.y = 0.06;
frisbee.add(inset);

const frozenMotes = new THREE.Group();
scene.add(frozenMotes);
const moteMaterial = new THREE.MeshStandardMaterial({
  color: 0xffe7a4,
  emissive: 0x78551f,
  emissiveIntensity: 0.25,
  roughness: 0.75,
  transparent: true,
  opacity: 0.75,
});
const moteData = [];
for (let i = 0; i < 22; i += 1) {
  const mote = mesh(new THREE.SphereGeometry(0.022 + seeded(i, 15) * 0.035, 8, 6), moteMaterial, false);
  frozenMotes.add(mote);
  moteData.push({
    object: mote,
    x: -1.7 + seeded(i, 16) * 3.4,
    y: 0.14 + seeded(i, 17) * 1.2,
    z: -0.75 + seeded(i, 18) * 1.5,
  });
}

const frisbeeTrail = new THREE.Group();
scene.add(frisbeeTrail);
const trailMaterial = new THREE.MeshBasicMaterial({
  color: 0xff6972,
  transparent: true,
  opacity: 0.22,
  depthWrite: false,
});
for (let i = 0; i < 3; i += 1) {
  const arc = mesh(new THREE.TorusGeometry(0.35 + i * 0.08, 0.018, 6, 28, Math.PI * 1.2), trailMaterial, false);
  arc.rotation.set(Math.PI / 2, 0.15, 0.5);
  arc.position.x = -0.32 - i * 0.19;
  frisbeeTrail.add(arc);
}

function eventTimeAt(time) {
  if (time < FREEZE_START) return time * FREEZE_EVENT_TIME / FREEZE_START;
  if (time <= FREEZE_END) return FREEZE_EVENT_TIME;
  return FREEZE_EVENT_TIME + (time - FREEZE_END) * RESUME_RATE;
}

function dogHeight(eventTime) {
  const phase = THREE.MathUtils.clamp(eventTime / 1.8, 0, 1);
  return 1.0 + 1.5 * Math.sin(Math.PI * phase);
}

function updateWorld(time) {
  const eventTime = eventTimeAt(time);
  const dogX = -2 + 2.3 * eventTime;
  const dogY = dogHeight(eventTime);
  dog.position.set(dogX, dogY, 0);
  dog.rotation.set(0.02 * Math.sin(eventTime * 4), 0, -0.035 + 0.045 * Math.sin(eventTime * 3));

  const airborne = smoothstep(0.12, 0.65, eventTime) * (1 - smoothstep(1.35, 1.8, eventTime));
  const stride = Math.sin(eventTime * Math.PI * 3);
  legs.forEach((leg, index) => {
    const front = index < 2;
    const sideOffset = index % 2 === 0 ? 1 : -1;
    const target = front ? 1.02 : -0.92;
    leg.root.rotation.z = THREE.MathUtils.lerp(
      leg.baseUpper + stride * 0.35 * sideOffset,
      target + sideOffset * 0.1,
      airborne,
    );
    leg.lowerPivot.rotation.z = THREE.MathUtils.lerp(
      leg.baseLower - stride * 0.25 * sideOffset,
      front ? -0.42 : 0.38,
      airborne,
    );
  });
  tail.rotation.z = 1.08 + 0.14 * Math.sin(eventTime * 5.2);

  const catchTime = 1.12;
  if (eventTime < catchTime) {
    frisbee.position.set(
      2.82 + 0.27 * eventTime,
      2.76 - 0.045 * eventTime,
      0.08 * Math.sin(eventTime * 1.7),
    );
  } else {
    frisbee.position.set(dogX + 2.55, dogY + 0.32, 0.07);
  }
  frisbee.rotation.set(0.27, Math.min(eventTime, catchTime) * 7.2, -0.23);

  frisbeeTrail.position.copy(frisbee.position);
  frisbeeTrail.rotation.copy(frisbee.rotation);
  frisbeeTrail.visible = eventTime < catchTime;

  frozenMotes.position.x = dogX - 0.45;
  moteData.forEach((data, index) => {
    data.object.position.set(
      data.x - 0.4 * eventTime,
      data.y + 0.05 * Math.sin(eventTime * 3 + index),
      data.z,
    );
  });
}

const sidePosition = new THREE.Vector3(0.25, 3.05, 10.6);
const sideTarget = new THREE.Vector3(0.35, 2.05, 0);
const freezeTarget = new THREE.Vector3(0.75, 2.45, 0);
const openingOffset = sidePosition.clone().sub(sideTarget);
const openingAngle = Math.atan2(openingOffset.z, openingOffset.x);
const openingRadius = Math.hypot(openingOffset.x, openingOffset.z);

function updateCamera(time) {
  let position = sidePosition;
  let target = sideTarget;
  let fov = 42;

  if (time > FREEZE_START) {
    const amount = smoothstep(FREEZE_START, 4.65, time);
    const dip = Math.sin(amount * Math.PI);
    const angle = THREE.MathUtils.lerp(openingAngle, -2.48, amount);
    const radius = THREE.MathUtils.lerp(openingRadius, 8.6, amount) - 2.1 * dip;
    target = lerpVector(sideTarget, freezeTarget, smoothstep(FREEZE_START, 1.35, time));
    position = new THREE.Vector3(
      target.x + Math.cos(angle) * radius,
      THREE.MathUtils.lerp(sidePosition.y, 3.35, amount) - 2.15 * dip,
      target.z + Math.sin(angle) * radius,
    );
    fov = 42 + 2 * dip;
  }

  camera.position.copy(position);
  camera.fov = fov;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
}

let currentTime = 0;
let paused = false;
let animationStart = performance.now();
let animationFrame = null;

function renderAt(time) {
  currentTime = THREE.MathUtils.clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  updateWorld(currentTime);
  updateCamera(currentTime);
  renderer.render(scene, camera);
}

function animate(now) {
  if (paused) return;
  const elapsed = ((now - animationStart) / 1000) % DURATION;
  renderAt(elapsed);
  animationFrame = requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    paused = true;
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  },
  seek(seconds) {
    this.pause();
    renderAt(Number(seconds));
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
  getStateFingerprint() {
    return JSON.stringify({
      time: currentTime,
      dogPosition: dog.position.toArray(),
      dogQuaternion: dog.quaternion.toArray(),
      frisbeePosition: frisbee.position.toArray(),
      frisbeeQuaternion: frisbee.quaternion.toArray(),
      cameraPosition: camera.position.toArray(),
      cameraQuaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    });
  },
  getWorldFingerprint() {
    return JSON.stringify({
      eventTime: eventTimeAt(currentTime),
      dogPosition: dog.position.toArray(),
      dogQuaternion: dog.quaternion.toArray(),
      frisbeePosition: frisbee.position.toArray(),
      frisbeeQuaternion: frisbee.quaternion.toArray(),
      legs: legs.map((leg) => [leg.root.rotation.z, leg.lowerPivot.rotation.z]),
      tail: tail.rotation.z,
      motesPosition: frozenMotes.position.toArray(),
      motes: moteData.map((data) => data.object.position.toArray()),
      trailPosition: frisbeeTrail.position.toArray(),
      trailQuaternion: frisbeeTrail.quaternion.toArray(),
      trailVisible: frisbeeTrail.visible,
    });
  },
  getFreezeInterval() {
    return [FREEZE_START, FREEZE_END];
  },
};

renderAt(0);
window.__RECONSTRUCTION_READY__ = true;
animationFrame = requestAnimationFrame(animate);
