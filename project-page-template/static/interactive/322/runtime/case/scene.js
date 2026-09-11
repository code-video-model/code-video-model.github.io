import * as THREE from '../vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;
const TAU = Math.PI * 2;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x42576b);
scene.fog = new THREE.FogExp2(0x657782, 0.007);

const camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, 0.1, 260);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xc6ddf2, 0x3d2e29, 1.25);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xffcf99, 3.25);
sun.position.set(-38, 62, 28);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -45;
sun.shadow.camera.right = 45;
sun.shadow.camera.top = 50;
sun.shadow.camera.bottom = -45;
sun.shadow.camera.near = 10;
sun.shadow.camera.far = 120;
sun.shadow.bias = -0.0004;
scene.add(sun);

const rim = new THREE.DirectionalLight(0x7fc8ff, 2.9);
rim.position.set(35, 28, -38);
scene.add(rim);

const materials = {
  street: new THREE.MeshStandardMaterial({ color: 0x4e5659, roughness: 0.92 }),
  pavement: new THREE.MeshStandardMaterial({ color: 0x8c8980, roughness: 0.95 }),
  wall: new THREE.MeshStandardMaterial({ color: 0xc0b29a, roughness: 0.94 }),
  wallDark: new THREE.MeshStandardMaterial({ color: 0x81776b, roughness: 0.96 }),
  plasterA: new THREE.MeshStandardMaterial({ color: 0xc9b697, roughness: 0.9 }),
  plasterB: new THREE.MeshStandardMaterial({ color: 0xa89783, roughness: 0.92 }),
  plasterC: new THREE.MeshStandardMaterial({ color: 0xd5c7ad, roughness: 0.9 }),
  roofA: new THREE.MeshStandardMaterial({ color: 0x713a32, roughness: 0.88 }),
  roofB: new THREE.MeshStandardMaterial({ color: 0x884739, roughness: 0.88 }),
  roofC: new THREE.MeshStandardMaterial({ color: 0x593b39, roughness: 0.9 }),
  window: new THREE.MeshStandardMaterial({ color: 0x273741, emissive: 0x12202b, emissiveIntensity: 0.45 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xd78661, roughness: 0.72 }),
  skinLight: new THREE.MeshStandardMaterial({ color: 0xe9a777, roughness: 0.68 }),
  muscle: new THREE.MeshStandardMaterial({ color: 0x7d1727, roughness: 0.7 }),
  muscleLight: new THREE.MeshStandardMaterial({ color: 0xb7383b, roughness: 0.68 }),
  wound: new THREE.MeshStandardMaterial({ color: 0x4b0711, emissive: 0xa31322, emissiveIntensity: 0.75, roughness: 0.56 }),
  bone: new THREE.MeshStandardMaterial({ color: 0xf2e2c2, roughness: 0.58 }),
  eye: new THREE.MeshStandardMaterial({ color: 0xeaffff, emissive: 0x9eeeff, emissiveIntensity: 2.5 }),
  pupil: new THREE.MeshBasicMaterial({ color: 0x111820 }),
  mouth: new THREE.MeshStandardMaterial({ color: 0x3a1218, roughness: 0.8 }),
  uniform: new THREE.MeshStandardMaterial({ color: 0x252c2d, roughness: 0.76 }),
  jacket: new THREE.MeshStandardMaterial({ color: 0x866d4f, roughness: 0.82 }),
  harness: new THREE.MeshStandardMaterial({ color: 0x392a22, roughness: 0.82 }),
  cape: new THREE.MeshStandardMaterial({ color: 0x12523e, roughness: 0.8, side: THREE.DoubleSide }),
  metal: new THREE.MeshStandardMaterial({ color: 0x88939b, metalness: 0.82, roughness: 0.25 }),
  blade: new THREE.MeshStandardMaterial({ color: 0xd8f2f5, metalness: 0.88, roughness: 0.18, emissive: 0x56757a, emissiveIntensity: 0.35 }),
  gas: new THREE.MeshBasicMaterial({ color: 0xb9f7ff, transparent: true, opacity: 0.72, blending: THREE.AdditiveBlending, depthWrite: false }),
  cable: new THREE.LineBasicMaterial({ color: 0xc7e4e7 }),
};

const skyDome = mesh(
  new THREE.SphereGeometry(210, 32, 16),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x263e57) },
      horizonColor: { value: new THREE.Color(0xb08372) },
      bottomColor: { value: new THREE.Color(0x536778) },
    },
    vertexShader: `
      varying vec3 vPosition;
      void main() {
        vPosition = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vPosition;
      void main() {
        float h = normalize(vPosition).y;
        vec3 upper = mix(horizonColor, topColor, smoothstep(0.0, 0.72, h));
        vec3 color = mix(bottomColor, upper, smoothstep(-0.42, 0.06, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  }),
);
scene.add(skyDome);

function setShadows(object, cast = true, receive = true) { window.__bfTrace?.add(112);
  object.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = cast;
      child.receiveShadow = receive;
    }
  });
  return object;
}

function mesh(geometry, material, position, rotation, scale) { window.__bfTrace?.add(122);
  const object = new THREE.Mesh(geometry, material);
  if (position) object.position.set(...position);
  if (rotation) object.rotation.set(...rotation);
  if (scale) object.scale.set(...scale);
  return object;
}

function deterministicNoise(a, b = 0) { window.__bfTrace?.add(130);
  return Math.abs(Math.sin(a * 127.1 + b * 311.7) * 43758.5453) % 1;
}

const ground = mesh(new THREE.PlaneGeometry(240, 240), materials.street, [0, -0.15, 0], [-Math.PI / 2, 0, 0]);
ground.receiveShadow = true;
scene.add(ground);

const plaza = mesh(new THREE.CylinderGeometry(18, 20, 0.45, 48), materials.pavement, [0, 0.08, 0]);
plaza.receiveShadow = true;
scene.add(plaza);

function createBuilding(x, z, index) { window.__bfTrace?.add(142);
  const group = new THREE.Group();
  const width = 5 + deterministicNoise(index, 2) * 3.4;
  const depth = 5 + deterministicNoise(index, 3) * 3.2;
  const height = 5.5 + deterministicNoise(index, 4) * 9.5;
  const facade = [materials.plasterA, materials.plasterB, materials.plasterC][index % 3];
  const roof = [materials.roofA, materials.roofB, materials.roofC][(index + 1) % 3];

  const body = mesh(new THREE.BoxGeometry(width, height, depth), facade, [0, height / 2, 0]);
  group.add(body);

  const roofHeight = 2 + deterministicNoise(index, 5) * 1.2;
  const roofMesh = mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.72, roofHeight, 4), roof, [0, height + roofHeight / 2, 0], [0, Math.PI / 4, 0], [1, 1, depth / width]);
  group.add(roofMesh);

  const windowGeometry = new THREE.BoxGeometry(0.65, 0.95, 0.08);
  for (let floor = 0; floor < Math.max(1, Math.floor(height / 2.7) - 1); floor += 1) {
    for (const side of [-1, 1]) {
      const frontWindow = mesh(windowGeometry, materials.window, [side * width * 0.24, 2 + floor * 2.35, depth / 2 + 0.05]);
      group.add(frontWindow);
    }
  }

  group.position.set(x, 0, z);
  group.rotation.y = ((index % 5) - 2) * 0.035;
  return setShadows(group);
}

const city = new THREE.Group();
let buildingIndex = 0;
for (let gx = -8; gx <= 8; gx += 1) {
  for (let gz = -8; gz <= 8; gz += 1) {
    const x = gx * 11.2 + (gz % 2) * 1.5;
    const z = gz * 10.4;
    if (Math.hypot(x, z) < 22 || gx % 4 === 0 || gz % 5 === 0) continue;
    city.add(createBuilding(x, z, buildingIndex));
    buildingIndex += 1;
  }
}
scene.add(city);

const roadMarkMaterial = new THREE.MeshBasicMaterial({ color: 0xd1c8b4, transparent: true, opacity: 0.38 });
for (let i = -7; i <= 7; i += 1) {
  const stripX = mesh(new THREE.BoxGeometry(0.18, 0.025, 180), roadMarkMaterial, [i * 11.2 - 4.9, 0.09, 0]);
  const stripZ = mesh(new THREE.BoxGeometry(190, 0.025, 0.18), roadMarkMaterial, [0, 0.09, i * 10.4 + 4.6]);
  scene.add(stripX, stripZ);
}

const outerWall = new THREE.Group();
for (let i = 0; i < 42; i += 1) {
  const angle = (i / 42) * TAU;
  const radius = 103;
  const segment = mesh(new THREE.BoxGeometry(16.2, 14, 5.4), i % 7 === 0 ? materials.wallDark : materials.wall, [
    Math.sin(angle) * radius,
    7,
    Math.cos(angle) * radius,
  ], [0, angle, 0]);
  outerWall.add(segment);
}
scene.add(setShadows(outerWall));

const titan = new THREE.Group();
titan.name = 'Titan';

const pelvis = mesh(new THREE.SphereGeometry(5.2, 16, 12), materials.muscle, [0, 8.3, 0], null, [1.15, 1.15, 0.78]);
const abdomen = mesh(new THREE.CapsuleGeometry(4.1, 8.2, 8, 16), materials.skin, [0, 14.3, 0], null, [1.05, 1, 0.76]);
const chest = mesh(new THREE.SphereGeometry(7.6, 20, 14), materials.skinLight, [0, 20.6, 0], null, [1.15, 0.82, 0.68]);
const neck = mesh(new THREE.CylinderGeometry(2.75, 3.4, 5.7, 18), materials.muscle, [0, 25.4, 0]);
const napeWound = mesh(new THREE.SphereGeometry(1.15, 16, 10), materials.wound, [0, 26.2, -2.82], null, [1.8, 0.52, 0.16]);
const napeRim = mesh(new THREE.TorusGeometry(1.08, 0.17, 8, 20), materials.muscleLight, [0, 26.2, -2.97], null, [1.7, 0.65, 1]);
const napeLight = new THREE.PointLight(0xff3049, 10, 13, 2);
napeLight.position.set(0, 26.4, -3.4);
scene.add(napeLight);
const headPivot = new THREE.Group();
headPivot.position.set(0, 29.4, 0);
const skull = mesh(new THREE.SphereGeometry(3.9, 20, 16), materials.skinLight, [0, 0, 0], null, [0.86, 1.15, 0.86]);
const jaw = mesh(new THREE.BoxGeometry(5.2, 2.9, 4.4), materials.skin, [0, -2.2, 0.35], null, [0.9, 1, 0.85]);
headPivot.add(skull, jaw);

const browGeometry = new THREE.BoxGeometry(2.15, 0.5, 0.55);
for (const side of [-1, 1]) {
  const eye = mesh(new THREE.SphereGeometry(0.56, 12, 8), materials.eye, [side * 1.45, 0.35, 3.18], null, [1.25, 0.55, 0.35]);
  const pupil = mesh(new THREE.SphereGeometry(0.19, 8, 6), materials.pupil, [side * 1.45, 0.34, 3.54], null, [0.72, 1.25, 0.45]);
  const brow = mesh(browGeometry, materials.muscle, [side * 1.45, 1.05, 3.18], [0, 0, side * -0.18]);
  headPivot.add(eye, pupil, brow);
}

const nose = mesh(new THREE.ConeGeometry(0.65, 2.1, 5), materials.skin, [0, -0.35, 3.45], [Math.PI / 2, 0, 0]);
const mouth = mesh(new THREE.BoxGeometry(3.9, 1.15, 0.3), materials.mouth, [0, -2.18, 2.48]);
headPivot.add(nose, mouth);
for (let i = 0; i < 8; i += 1) {
  const tooth = mesh(new THREE.BoxGeometry(0.34, 0.72, 0.22), materials.bone, [-1.43 + i * 0.41, -2.18, 2.68]);
  headPivot.add(tooth);
}

titan.add(pelvis, abdomen, chest, neck, napeWound, napeRim, headPivot);

for (const side of [-1, 1]) {
  const shoulderPivot = new THREE.Group();
  shoulderPivot.position.set(side * 7.1, 21.7, 0);
  shoulderPivot.rotation.z = side * -0.32;
  const upperArm = mesh(new THREE.CapsuleGeometry(2.25, 7.8, 7, 14), materials.skin, [side * 1.2, -4.5, 0], [0, 0, side * 0.22]);
  const forearm = mesh(new THREE.CapsuleGeometry(1.75, 7.2, 7, 14), materials.muscle, [side * 2.6, -11.3, 0.5], [0, 0, side * 0.18]);
  shoulderPivot.add(upperArm, forearm);
  titan.add(shoulderPivot);
}

for (let i = -3; i <= 3; i += 1) {
  if (i === 0) continue;
  const rib = mesh(new THREE.CapsuleGeometry(0.34, 6.2 - Math.abs(i) * 0.45, 5, 8), materials.muscleLight, [i * 1.72, 21.2 - Math.abs(i) * 0.3, 4.15], [0, 0, i * -0.045]);
  titan.add(rib);
}
for (let i = 0; i < 8; i += 1) {
  const neckFiber = mesh(new THREE.CapsuleGeometry(0.18, 4.1, 4, 8), i % 2 ? materials.bone : materials.muscleLight, [
    Math.sin((i / 8) * TAU) * 2.76,
    25.35,
    Math.cos((i / 8) * TAU) * 2.76,
  ], [0, 0, Math.sin((i / 8) * TAU) * 0.12]);
  titan.add(neckFiber);
}
scene.add(setShadows(titan));

const soldier = new THREE.Group();
soldier.name = 'ODM Soldier';
const soldierScale = 1.22;
soldier.scale.setScalar(soldierScale);

const hips = mesh(new THREE.BoxGeometry(0.85, 0.45, 0.55), materials.uniform, [0, 0, 0]);
const torso = mesh(new THREE.CapsuleGeometry(0.48, 0.72, 5, 10), materials.jacket, [0, 1.02, 0], [0, 0, 0]);
const soldierHead = mesh(new THREE.SphereGeometry(0.42, 12, 9), materials.skinLight, [0, 2.05, -0.05]);
const hair = mesh(new THREE.SphereGeometry(0.44, 10, 7), materials.uniform, [0, 2.2, 0.06], null, [1.04, 0.56, 1]);
soldier.add(hips, torso, soldierHead, hair);

const soldierArms = [];
const soldierLegs = [];
const soldierBlades = [];
const gasJets = [];
for (const side of [-1, 1]) {
  const leg = mesh(new THREE.CapsuleGeometry(0.18, 1.05, 4, 8), materials.uniform, [side * 0.28, -0.78, 0.18], [0.28, 0, side * 0.13]);
  const boot = mesh(new THREE.BoxGeometry(0.34, 0.32, 0.72), materials.harness, [side * 0.34, -1.46, -0.06], [0.22, 0, 0]);
  const arm = mesh(new THREE.CapsuleGeometry(0.15, 0.92, 4, 8), materials.jacket, [side * 0.67, 1.16, -0.15], [side * 0.2, 0, side * -0.65]);
  const gear = mesh(new THREE.BoxGeometry(0.42, 0.62, 1.18), materials.metal, [side * 0.72, 0.05, 0.18]);
  const blade = mesh(new THREE.BoxGeometry(0.09, 0.17, 2.35), materials.blade, [side * 1.0, 1.08, -1.32], [0.04, side * -0.1, side * -0.22]);
  const guard = mesh(new THREE.BoxGeometry(0.42, 0.16, 0.16), materials.metal, [side * 0.96, 1.08, -0.2]);
  const gasJet = mesh(new THREE.ConeGeometry(0.22, 1.7, 10), materials.gas.clone(), [side * 0.72, 0.05, 1.38], [Math.PI / 2, 0, 0]);
  soldier.add(leg, boot, arm, gear, blade, guard, gasJet);
  soldierLegs.push(leg);
  soldierArms.push(arm);
  soldierBlades.push(blade);
  gasJets.push(gasJet);
}

const harnessVertical = mesh(new THREE.BoxGeometry(0.12, 1.8, 0.72), materials.harness, [0, 0.55, 0.02]);
const harnessBelt = mesh(new THREE.BoxGeometry(1.25, 0.13, 0.72), materials.harness, [0, 0.25, 0.02]);
soldier.add(harnessVertical, harnessBelt);

const capeGeometry = new THREE.BufferGeometry();
capeGeometry.setAttribute('position', new THREE.Float32BufferAttribute([
  -0.55, 1.63, 0.24,
  0.55, 1.63, 0.24,
  0.9, 0.2, 2.0,
  -0.55, 1.63, 0.24,
  0.9, 0.2, 2.0,
  -0.9, 0.2, 2.0,
], 3));
capeGeometry.computeVertexNormals();
const cape = mesh(capeGeometry, materials.cape);
soldier.add(cape);
scene.add(setShadows(soldier));

function dynamicLine(material) { window.__bfTrace?.add(312);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(6), 3));
  const line = new THREE.Line(geometry, material);
  scene.add(line);
  return line;
}

const leftCable = dynamicLine(materials.cable);
const rightCable = dynamicLine(materials.cable);
const leftHook = mesh(new THREE.SphereGeometry(0.22, 8, 6), materials.blade);
const rightHook = mesh(new THREE.SphereGeometry(0.22, 8, 6), materials.blade);
scene.add(leftHook, rightHook);

const speedLineMaterial = new THREE.LineBasicMaterial({
  color: 0xcceeff,
  transparent: true,
  opacity: 0.48,
  blending: THREE.AdditiveBlending,
});
const speedLines = Array.from({ length: 30 }, () => dynamicLine(speedLineMaterial.clone()));

const orbitTrailGeometry = new THREE.BufferGeometry();
orbitTrailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(52 * 3), 3));
const orbitTrail = new THREE.Line(orbitTrailGeometry, new THREE.LineBasicMaterial({
  color: 0x9ceeff,
  transparent: true,
  opacity: 0.72,
  blending: THREE.AdditiveBlending,
}));
scene.add(orbitTrail);

const steamGroup = new THREE.Group();
const steamPuffs = [];
for (let i = 0; i < 64; i += 1) {
  const puffMaterial = new THREE.MeshBasicMaterial({
    color: i % 4 === 0 ? 0xe9fbff : 0xc8dde0,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  });
  const puff = mesh(new THREE.IcosahedronGeometry(1, 1), puffMaterial);
  steamGroup.add(puff);
  steamPuffs.push(puff);
}
scene.add(steamGroup);

const slashArcMaterial = new THREE.LineBasicMaterial({
  color: 0xdffcff,
  transparent: true,
  opacity: 0.85,
  blending: THREE.AdditiveBlending,
});
const slashPoints = [];
for (let i = 0; i <= 24; i += 1) slashPoints.push(new THREE.Vector3());
const slashArc = new THREE.Line(new THREE.BufferGeometry().setFromPoints(slashPoints), slashArcMaterial);
scene.add(slashArc);

function smoothstep(edge0, edge1, value) { window.__bfTrace?.add(370);
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function soldierPosition(time, target = new THREE.Vector3()) {
  const u = THREE.MathUtils.clamp(time / DURATION, 0, 1);
  const attack = smoothstep(0.08, 0.92, u);
  const angle = -1.18 + attack * 5.9 + Math.sin(u * Math.PI) * 0.22;
  const radius = 11.8 - 5.4 * Math.pow(Math.sin(u * Math.PI), 1.35) + 0.7 * Math.sin(u * TAU);
  const y = 28.8 - 3.15 * Math.pow(Math.sin(u * Math.PI), 1.7) + 0.55 * Math.sin(u * TAU * 1.5);
  return target.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius);
}

const tempA = new THREE.Vector3();
const tempB = new THREE.Vector3();
const tempC = new THREE.Vector3();
const tempD = new THREE.Vector3();
const neckCenter = new THREE.Vector3(0, 25.8, 0);
const forwardAxis = new THREE.Vector3(0, 0, -1);
const upAxis = new THREE.Vector3(0, 1, 0);

function setLine(line, start, end) { window.__bfTrace?.add(392);
  const positions = line.geometry.attributes.position;
  positions.setXYZ(0, start.x, start.y, start.z);
  positions.setXYZ(1, end.x, end.y, end.z);
  positions.needsUpdate = true;
  line.geometry.computeBoundingSphere();
}

function updateSteam(time) { window.__bfTrace?.add(400);
  const u = THREE.MathUtils.clamp(time / DURATION, 0, 1);
  const eruption = smoothstep(0.08, 0.22, u);
  for (let i = 0; i < steamPuffs.length; i += 1) {
    const phase = deterministicNoise(i, 17);
    const age = (u * 2.25 + phase) % 1;
    const angle = deterministicNoise(i, 18) * TAU + u * 0.35;
    const spread = 2.25 + age * (5.7 + deterministicNoise(i, 19) * 4.5);
    const sideBurst = 0.55 + deterministicNoise(i, 20) * 0.9;
    const puff = steamPuffs[i];
    puff.position.set(
      Math.sin(angle) * spread,
      25.6 + age * (8 + deterministicNoise(i, 21) * 7),
      Math.cos(angle) * spread * sideBurst,
    );
    const scale = (0.36 + age * 1.35) * (0.72 + deterministicNoise(i, 22));
    puff.scale.set(scale * 1.15, scale, scale * 1.15);
    puff.material.opacity = eruption * Math.sin(age * Math.PI) * (0.14 + deterministicNoise(i, 23) * 0.17);
    puff.visible = eruption > 0.01 && i < 50;
  }
}

function updateSpeedLines(time, position) { window.__bfTrace?.add(422);
  for (let i = 0; i < speedLines.length; i += 1) {
    const line = speedLines[i];
    const lag = 0.045 + i * 0.012;
    const jitter = (deterministicNoise(i, 31) - 0.5) * 0.32;
    const p1 = soldierPosition(Math.max(0, time - lag), tempA).clone();
    const p2 = soldierPosition(Math.max(0, time - lag - 0.11 - deterministicNoise(i, 32) * 0.1), tempB).clone();
    const radial = p1.clone().setY(0).normalize();
    const vertical = (deterministicNoise(i, 33) - 0.5) * 2.3;
    p1.addScaledVector(radial, jitter).add(new THREE.Vector3(0, vertical, 0));
    p2.addScaledVector(radial, jitter * 1.8).add(new THREE.Vector3(0, vertical * 1.25, 0));
    setLine(line, p1, p2);
    line.material.opacity = (0.16 + deterministicNoise(i, 34) * 0.46) * smoothstep(0.03, 0.18, time / DURATION);
  }
}

function updateOrbitTrail(time) { window.__bfTrace?.add(438);
  const positions = orbitTrail.geometry.attributes.position;
  for (let i = 0; i < 52; i += 1) {
    const lag = (51 - i) * 0.025;
    soldierPosition(Math.max(0, time - lag), tempA);
    const outward = tempB.copy(tempA).setY(0).normalize();
    const fadeOffset = i / 51;
    tempA.addScaledVector(outward, 0.2 + fadeOffset * 0.36);
    positions.setXYZ(i, tempA.x, tempA.y + 0.22, tempA.z);
  }
  positions.needsUpdate = true;
  orbitTrail.geometry.computeBoundingSphere();
  orbitTrail.material.opacity = 0.7 * smoothstep(0.04, 0.24, time / DURATION);
}

function updateSlashArc(time) { window.__bfTrace?.add(453);
  const u = THREE.MathUtils.clamp(time / DURATION, 0, 1);
  const visibility = Math.sin(THREE.MathUtils.clamp((u - 0.39) / 0.33, 0, 1) * Math.PI);
  const positions = slashArc.geometry.attributes.position;
  for (let i = 0; i <= 24; i += 1) {
    const sampleTime = time - (24 - i) * 0.012;
    soldierPosition(sampleTime, tempA);
    const outward = tempB.copy(tempA).setY(0).normalize();
    tempA.addScaledVector(outward, 0.65).add(new THREE.Vector3(0, 0.45, 0));
    positions.setXYZ(i, tempA.x, tempA.y, tempA.z);
  }
  positions.needsUpdate = true;
  slashArc.geometry.computeBoundingSphere();
  slashArc.material.opacity = visibility * 0.88;
  slashArc.visible = visibility > 0.02;
}

function update(time) { window.__bfTrace?.add(470);
  const t = THREE.MathUtils.clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  const u = t / DURATION;

  const position = soldierPosition(t, tempA).clone();
  const future = soldierPosition(Math.min(DURATION, t + 0.015), tempB).clone();
  const past = soldierPosition(Math.max(0, t - 0.015), tempC).clone();
  const velocity = future.sub(past).normalize();

  soldier.position.copy(position);
  soldier.quaternion.setFromUnitVectors(forwardAxis, velocity);
  const banking = new THREE.Quaternion().setFromAxisAngle(forwardAxis, -0.58 + 1.1 * Math.sin(u * Math.PI));
  soldier.quaternion.multiply(banking);
  cape.rotation.x = -0.12 - 0.12 * Math.sin(u * TAU);
  cape.scale.z = 1 + 0.15 * Math.sin(u * Math.PI);
  const slashBeat = Math.sin(THREE.MathUtils.clamp((u - 0.33) / 0.34, 0, 1) * Math.PI);
  napeLight.intensity = 5 + slashBeat * 14;
  for (let i = 0; i < 2; i += 1) {
    const side = i === 0 ? -1 : 1;
    soldierArms[i].rotation.z = side * (-0.65 - slashBeat * 0.42);
    soldierArms[i].rotation.x = side * slashBeat * 0.18;
    soldierLegs[i].rotation.z = side * (0.13 + 0.18 * Math.sin(u * TAU));
    soldierBlades[i].rotation.y = side * (-0.1 - slashBeat * 0.38);
    soldierBlades[i].rotation.z = side * (-0.22 - slashBeat * 0.25);
    const exhaust = 0.65 + 0.32 * Math.sin(u * TAU * 13 + i * 1.7);
    gasJets[i].scale.set(1, exhaust * (1.25 + slashBeat * 0.65), 1);
    gasJets[i].material.opacity = 0.48 + exhaust * 0.34;
  }

  const anchorAngle = Math.atan2(position.x, position.z) + 0.62;
  const leftAnchor = new THREE.Vector3(Math.sin(anchorAngle) * 2.95, 26.5, Math.cos(anchorAngle) * 2.95);
  const rightAnchor = new THREE.Vector3(Math.sin(anchorAngle + 0.3) * 3.1, 25.55, Math.cos(anchorAngle + 0.3) * 3.1);
  const cableSpread = tempD.copy(velocity).cross(upAxis).normalize().multiplyScalar(0.72);
  setLine(leftCable, position.clone().add(cableSpread), leftAnchor);
  setLine(rightCable, position.clone().sub(cableSpread), rightAnchor);
  leftHook.position.copy(leftAnchor);
  rightHook.position.copy(rightAnchor);
  const hookPulse = 0.75 + 0.35 * Math.sin(u * TAU * 9);
  leftHook.scale.setScalar(hookPulse);
  rightHook.scale.setScalar(1.5 - hookPulse * 0.5);

  headPivot.rotation.y = -0.16 * Math.sin(u * Math.PI * 1.35);
  headPivot.rotation.z = 0.09 * Math.sin(u * Math.PI);
  titan.rotation.y = -0.07 * Math.sin(u * Math.PI);

  updateSteam(t);
  updateSpeedLines(t, position);
  updateOrbitTrail(t);
  updateSlashArc(t);

  const radial = tempC.copy(position).setY(0).normalize();
  const cameraPosition = position.clone()
    .addScaledVector(velocity, -10.4)
    .addScaledVector(radial, 9.4)
    .add(new THREE.Vector3(0, 7.15, 0));
  const target = neckCenter.clone().lerp(position, 0.27);
  target.y -= 0.2;
  camera.position.copy(cameraPosition);
  camera.up.copy(upAxis).addScaledVector(radial, 0.065 * Math.sin(u * Math.PI * 2)).normalize();
  camera.lookAt(target);
  camera.fov = 52 - 2.5 * Math.sin(u * Math.PI);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
}

let animationFrame = null;
let paused = false;
let autoplayStart = performance.now();

function animate(now) { window.__bfTrace?.add(540);
  if (paused) return;
  const elapsed = ((now - autoplayStart) / 1000) % DURATION;
  update(elapsed);
  animationFrame = requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    paused = true;
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
  },
  seek(seconds) {
    update(seconds);
  },
};

update(0);
animationFrame = requestAnimationFrame(animate);
