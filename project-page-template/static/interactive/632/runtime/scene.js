import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;
const canvas = document.querySelector('#scene');

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8edf0);
scene.fog = new THREE.Fog(0xe8edf0, 8.5, 17);

const camera = new THREE.PerspectiveCamera(34, WIDTH / HEIGHT, 0.025, 50);
camera.position.set(-1.7, 1.22, 0.62);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
const carbon = new THREE.MeshPhysicalMaterial({
  color: 0x10161c,
  metalness: 0.28,
  roughness: 0.22,
  clearcoat: 1,
  clearcoatRoughness: 0.15,
  anisotropy: Math.min(0.6, maxAnisotropy),
});
const carbonEdge = new THREE.MeshPhysicalMaterial({
  color: 0x26323b,
  metalness: 0.38,
  roughness: 0.2,
  clearcoat: 0.85,
});
const rubber = new THREE.MeshStandardMaterial({
  color: 0x080a0b,
  roughness: 0.72,
  metalness: 0.02,
});
const rimMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x171c20,
  roughness: 0.25,
  metalness: 0.7,
  clearcoat: 0.55,
});
const metal = new THREE.MeshPhysicalMaterial({
  color: 0xbec7cc,
  metalness: 0.94,
  roughness: 0.18,
});
const darkMetal = new THREE.MeshPhysicalMaterial({
  color: 0x293238,
  metalness: 0.88,
  roughness: 0.23,
});
const chainringMetal = new THREE.MeshPhysicalMaterial({
  color: 0x4e606a,
  metalness: 0.9,
  roughness: 0.17,
  clearcoat: 0.35,
});
const accent = new THREE.MeshPhysicalMaterial({
  color: 0xb9e51d,
  emissive: 0x223600,
  emissiveIntensity: 0.12,
  roughness: 0.25,
  metalness: 0.18,
  clearcoat: 0.8,
});
const chainMaterial = new THREE.MeshStandardMaterial({
  color: 0xc4c9c7,
  metalness: 0.9,
  roughness: 0.24,
});

function smoothstep(a, b, value) { window.__bfTrace?.add(85);
  const x = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

function smootherstep(a, b, value) { window.__bfTrace?.add(90);
  const x = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function tubeBetween(a, b, radius, material, radialSegments = 12) { window.__bfTrace?.add(95);
  const start = a instanceof THREE.Vector3 ? a : new THREE.Vector3(...a);
  const end = b instanceof THREE.Vector3 ? b : new THREE.Vector3(...b);
  const delta = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, delta.length(), radialSegments),
    material,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function taperedTube(a, b, radiusA, radiusB, material, radialSegments = 14) { window.__bfTrace?.add(110);
  const start = new THREE.Vector3(...a);
  const end = new THREE.Vector3(...b);
  const delta = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusB, radiusA, delta.length(), radialSegments),
    material,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function roundedBox(size, radius, material) { window.__bfTrace?.add(125);
  const shape = new THREE.Shape();
  const w = size[0];
  const h = size[1];
  const r = Math.min(radius, w * 0.5, h * 0.5);
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2);
  shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r);
  shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2);
  shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r);
  shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  return new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: size[2],
      bevelEnabled: true,
      bevelSegments: 2,
      steps: 1,
      bevelSize: Math.min(radius * 0.45, size[2] * 0.25),
      bevelThickness: Math.min(radius * 0.45, size[2] * 0.25),
    }),
    material,
  );
}

function makeGear(radius, teeth, thickness, material) { window.__bfTrace?.add(152);
  const shape = new THREE.Shape();
  const segments = teeth * 2;
  for (let i = 0; i <= segments; i += 1) {
    const angle = (i / segments) * Math.PI * 2;
    const r = radius * (i % 2 === 0 ? 1 : 0.92);
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  const hole = new THREE.Path();
  hole.absarc(0, 0, radius * 0.31, 0, Math.PI * 2, true);
  shape.holes.push(hole);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const aperture = new THREE.Path();
    aperture.absarc(
      Math.cos(angle) * radius * 0.62,
      Math.sin(angle) * radius * 0.62,
      radius * 0.115,
      0,
      Math.PI * 2,
      true,
    );
    shape.holes.push(aperture);
  }
  const gear = new THREE.Mesh(
    new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: true,
      bevelSegments: 1,
      bevelSize: 0.006,
      bevelThickness: 0.006,
      curveSegments: 24,
    }),
    material,
  );
  gear.castShadow = true;
  gear.receiveShadow = true;
  return gear;
}

const bicycle = new THREE.Group();
scene.add(bicycle);

const REAR = new THREE.Vector3(-1.42, 1.05, 0);
const FRONT = new THREE.Vector3(1.46, 1.05, 0);
const BB = new THREE.Vector3(-0.23, 0.73, 0);
const SEAT = new THREE.Vector3(-0.48, 1.95, 0);
const HEAD_TOP = new THREE.Vector3(0.78, 1.87, 0);
const HEAD_BOTTOM = new THREE.Vector3(0.69, 1.43, 0);
const WHEEL_RADIUS = 1.03;

const spinningParts = [];

function makeWheel(center, isRear) { window.__bfTrace?.add(208);
  const wheel = new THREE.Group();
  wheel.position.copy(center);

  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(WHEEL_RADIUS, 0.052, 16, 128),
    rubber,
  );
  tire.castShadow = true;
  tire.receiveShadow = true;
  wheel.add(tire);

  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(WHEEL_RADIUS - 0.072, 0.025, 10, 112),
    rimMaterial,
  );
  rim.castShadow = true;
  wheel.add(rim);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.055, 0.055, isRear ? 0.25 : 0.19, 18),
    darkMetal,
  );
  hub.rotation.x = Math.PI / 2;
  hub.castShadow = true;
  wheel.add(hub);

  for (let i = 0; i < 20; i += 1) {
    const angle = (i / 20) * Math.PI * 2;
    const side = i % 2 === 0 ? -1 : 1;
    const start = new THREE.Vector3(0, 0, side * (isRear ? 0.105 : 0.075));
    const end = new THREE.Vector3(
      Math.cos(angle) * (WHEEL_RADIUS - 0.085),
      Math.sin(angle) * (WHEEL_RADIUS - 0.085),
      side * 0.015,
    );
    wheel.add(tubeBetween(start, end, 0.006, metal, 6));
  }

  const valve = tubeBetween(
    [0, WHEEL_RADIUS - 0.13, 0],
    [0, WHEEL_RADIUS + 0.005, 0],
    0.012,
    darkMetal,
    8,
  );
  wheel.add(valve);
  bicycle.add(wheel);
  spinningParts.push({ object: wheel, speed: isRear ? -0.35 : 0, phase: isRear ? 0 : 0.24 });
  return wheel;
}

const rearWheel = makeWheel(REAR, true);
const frontWheel = makeWheel(FRONT, false);

const frame = new THREE.Group();
bicycle.add(frame);

frame.add(taperedTube(BB.toArray(), SEAT.toArray(), 0.075, 0.062, carbon));
frame.add(taperedTube(SEAT.toArray(), HEAD_TOP.toArray(), 0.064, 0.052, carbon));
frame.add(taperedTube(BB.toArray(), HEAD_BOTTOM.toArray(), 0.085, 0.065, carbon));
frame.add(tubeBetween(HEAD_BOTTOM, HEAD_TOP, 0.072, carbonEdge, 16));

for (const z of [-0.047, 0.047]) {
  frame.add(taperedTube(
    [BB.x, BB.y, z],
    [REAR.x, REAR.y, z * 1.5],
    0.043,
    0.026,
    carbon,
    10,
  ));
  frame.add(taperedTube(
    [SEAT.x, SEAT.y, z],
    [REAR.x, REAR.y, z * 1.5],
    0.036,
    0.022,
    carbon,
    10,
  ));
}

const forkCrown = new THREE.Vector3(0.67, 1.39, 0);
for (const z of [-0.09, 0.09]) {
  frame.add(taperedTube(
    [forkCrown.x, forkCrown.y, z * 0.65],
    [FRONT.x, FRONT.y, z],
    0.044,
    0.025,
    carbon,
    10,
  ));
}

const seatPostTop = new THREE.Vector3(-0.54, 2.22, 0);
frame.add(tubeBetween(SEAT, seatPostTop, 0.038, darkMetal, 12));
const saddle = roundedBox([0.46, 0.15, 0.12], 0.07, rubber);
saddle.position.set(-0.60, 2.25, -0.06);
saddle.rotation.z = -0.08;
saddle.castShadow = true;
frame.add(saddle);

const stemStart = new THREE.Vector3(0.77, 1.88, 0);
const stemEnd = new THREE.Vector3(1.02, 2.03, 0);
frame.add(tubeBetween(stemStart, stemEnd, 0.036, darkMetal, 12));

const handlebar = new THREE.Group();
handlebar.position.copy(stemEnd);
const barCenter = tubeBetween([0, 0, -0.37], [0, 0, 0.37], 0.027, carbonEdge, 12);
handlebar.add(barCenter);
for (const side of [-1, 1]) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, side * 0.34),
    new THREE.Vector3(0.08, -0.02, side * 0.40),
    new THREE.Vector3(0.11, -0.22, side * 0.42),
    new THREE.Vector3(-0.02, -0.34, side * 0.39),
    new THREE.Vector3(-0.12, -0.25, side * 0.36),
  ]);
  const drop = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 36, 0.028, 10, false),
    rubber,
  );
  drop.castShadow = true;
  handlebar.add(drop);
  const hood = roundedBox([0.15, 0.10, 0.075], 0.035, rubber);
  hood.position.set(0.03, -0.04, side * 0.37 - 0.038);
  hood.rotation.z = -0.28;
  handlebar.add(hood);
}
frame.add(handlebar);

const bottle = new THREE.Group();
const bottleBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.075, 0.088, 0.48, 20),
  new THREE.MeshPhysicalMaterial({
    color: 0xdde4e6,
    transparent: true,
    opacity: 0.84,
    roughness: 0.26,
    transmission: 0.15,
    thickness: 0.25,
  }),
);
bottleBody.castShadow = true;
bottle.add(bottleBody);
const bottleCap = new THREE.Mesh(
  new THREE.CylinderGeometry(0.052, 0.06, 0.075, 16),
  accent,
);
bottleCap.position.y = 0.275;
bottle.add(bottleCap);
bottle.position.set(0.15, 1.22, 0.07);
bottle.rotation.z = -0.68;
frame.add(bottle);

const accentBands = [
  { a: [-0.48, 1.92, 0], b: [-0.35, 1.91, 0] },
  { a: [0.57, 1.47, 0], b: [0.69, 1.44, 0] },
];
for (const band of accentBands) {
  frame.add(tubeBetween(band.a, band.b, 0.079, accent, 14));
}

const drivetrain = new THREE.Group();
bicycle.add(drivetrain);

const cassette = new THREE.Group();
cassette.position.copy(REAR);
const cassetteRadii = [0.215, 0.195, 0.176, 0.157, 0.139, 0.122, 0.106];
cassetteRadii.forEach((radius, index) => {
  const cog = makeGear(radius, 28 - index * 2, 0.016, index % 2 ? metal : darkMetal);
  cog.position.z = 0.105 + index * 0.021;
  cassette.add(cog);
});
drivetrain.add(cassette);

const chainring = new THREE.Group();
chainring.position.copy(BB);
const outerGear = makeGear(0.305, 44, 0.026, chainringMetal);
outerGear.position.z = 0.17;
chainring.add(outerGear);
const innerGear = makeGear(0.235, 34, 0.018, metal);
innerGear.position.z = 0.135;
chainring.add(innerGear);
for (let i = 0; i < 5; i += 1) {
  const angle = (i / 5) * Math.PI * 2 + 0.08;
  chainring.add(tubeBetween(
    [Math.cos(angle) * 0.065, Math.sin(angle) * 0.065, 0.205],
    [Math.cos(angle) * 0.245, Math.sin(angle) * 0.245, 0.205],
    0.022,
    chainringMetal,
    8,
  ));
}
drivetrain.add(chainring);

function makeCrankSide(side) { window.__bfTrace?.add(404);
  const group = new THREE.Group();
  group.position.copy(BB);
  group.position.z = side > 0 ? 0.225 : -0.15;
  const arm = tubeBetween([0, 0, 0], [0.29, 0, 0], 0.026, darkMetal, 10);
  group.add(arm);
  const pedalAxle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.018, 0.18, 10),
    metal,
  );
  pedalAxle.rotation.x = Math.PI / 2;
  pedalAxle.position.set(0.29, 0, side > 0 ? 0.07 : -0.07);
  group.add(pedalAxle);
  const pedal = roundedBox([0.18, 0.07, 0.06], 0.025, darkMetal);
  pedal.position.set(0.29, 0, side > 0 ? 0.15 : -0.21);
  group.add(pedal);
  drivetrain.add(group);
  return group;
}

const rightCrank = makeCrankSide(1);
const leftCrank = makeCrankSide(-1);
leftCrank.rotation.z = Math.PI;

const derailleur = new THREE.Group();
derailleur.position.set(REAR.x + 0.12, REAR.y - 0.18, 0.20);
derailleur.add(tubeBetween([0, 0.08, 0], [0.11, -0.18, 0], 0.026, darkMetal, 10));
for (const y of [-0.16, -0.29]) {
  const pulley = new THREE.Mesh(
    new THREE.CylinderGeometry(0.07, 0.07, 0.027, 18),
    darkMetal,
  );
  pulley.rotation.x = Math.PI / 2;
  pulley.position.set(0.11, y, 0);
  derailleur.add(pulley);
}
drivetrain.add(derailleur);

const chainLinks = [];
const chainPath = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(REAR.x, REAR.y + 0.18, 0.245),
    new THREE.Vector3(-0.84, 1.11, 0.245),
    new THREE.Vector3(BB.x, BB.y + 0.305, 0.245),
    new THREE.Vector3(BB.x + 0.305, BB.y, 0.245),
    new THREE.Vector3(BB.x, BB.y - 0.305, 0.245),
    new THREE.Vector3(-0.75, 0.52, 0.245),
    new THREE.Vector3(REAR.x + 0.24, REAR.y - 0.32, 0.245),
    new THREE.Vector3(REAR.x + 0.04, REAR.y - 0.34, 0.245),
    new THREE.Vector3(REAR.x - 0.17, REAR.y - 0.15, 0.245),
  ],
  true,
  'centripetal',
);
for (let i = 0; i < 82; i += 1) {
  const link = roundedBox([0.034, 0.015, 0.011], 0.005, chainMaterial);
  link.castShadow = true;
  chainLinks.push(link);
  drivetrain.add(link);
}

const brakeCalipers = [];
for (const data of [
  { x: REAR.x, y: REAR.y + 0.84, z: 0 },
  { x: FRONT.x - 0.10, y: FRONT.y + 0.81, z: 0 },
]) {
  const caliper = new THREE.Group();
  caliper.position.set(data.x, data.y, data.z);
  caliper.add(tubeBetween([-0.09, 0, -0.07], [0, -0.12, 0], 0.018, darkMetal, 8));
  caliper.add(tubeBetween([0.09, 0, 0.07], [0, -0.12, 0], 0.018, darkMetal, 8));
  bicycle.add(caliper);
  brakeCalipers.push(caliper);
}

const floorMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xeef1f1,
  roughness: 0.34,
  metalness: 0.03,
  clearcoat: 0.32,
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(24, 18), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.01;
floor.receiveShadow = true;
scene.add(floor);

const contactShadowMaterial = new THREE.MeshBasicMaterial({
  color: 0x5f6b70,
  transparent: true,
  opacity: 0.065,
  depthWrite: false,
});
for (const center of [REAR, FRONT]) {
  const contactShadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.72, 64),
    contactShadowMaterial,
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.scale.set(1, 0.26, 1);
  contactShadow.position.set(center.x, 0.002, 0);
  scene.add(contactShadow);
}

const backWall = new THREE.Mesh(
  new THREE.PlaneGeometry(24, 8),
  new THREE.MeshStandardMaterial({ color: 0xe2e7e9, roughness: 0.82 }),
);
backWall.position.set(0, 3.4, -4.2);
backWall.receiveShadow = true;
scene.add(backWall);

const studioTrim = new THREE.Mesh(
  new THREE.BoxGeometry(11, 0.035, 0.045),
  new THREE.MeshStandardMaterial({ color: 0xc7d0d4, roughness: 0.5 }),
);
studioTrim.position.set(0, 0.11, -4.12);
scene.add(studioTrim);

scene.add(new THREE.HemisphereLight(0xf8fbff, 0x71808a, 2.25));

const keyLight = new THREE.RectAreaLight(0xffffff, 12.5, 4.5, 3.1);
keyLight.position.set(-1.6, 5.2, 3.8);
keyLight.lookAt(0, 1.1, 0);
scene.add(keyLight);

const stripLight = new THREE.RectAreaLight(0xd9efff, 9.5, 1.1, 4.8);
stripLight.position.set(2.8, 3.2, 2.0);
stripLight.lookAt(0.2, 1.1, 0);
scene.add(stripLight);

const rimLight = new THREE.DirectionalLight(0xffffff, 2.7);
rimLight.position.set(-3.5, 4.8, -3.5);
rimLight.target.position.set(0, 1.0, 0);
rimLight.castShadow = true;
rimLight.shadow.mapSize.set(2048, 2048);
rimLight.shadow.camera.left = -4;
rimLight.shadow.camera.right = 4;
rimLight.shadow.camera.top = 4;
rimLight.shadow.camera.bottom = -1;
scene.add(rimLight, rimLight.target);

const driveSideLight = new THREE.PointLight(0xd9f5ff, 4.5, 8, 1.5);
driveSideLight.position.set(-0.8, 1.4, 3.2);
scene.add(driveSideLight);

const shadowLight = new THREE.SpotLight(0xffffff, 3.2, 12, 0.72, 0.82, 1.4);
shadowLight.position.set(-2.8, 5.3, 3.6);
shadowLight.target.position.set(0, 0.9, 0);
shadowLight.castShadow = true;
shadowLight.shadow.mapSize.set(2048, 2048);
shadowLight.shadow.bias = -0.00015;
scene.add(shadowLight, shadowLight.target);

const groundGlow = new THREE.PointLight(0xcce7f2, 1.8, 5, 2);
groundGlow.position.set(0.5, 0.4, 1.3);
scene.add(groundGlow);

const cameraTarget = new THREE.Vector3();
const cameraPosition = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);
const tempTangent = new THREE.Vector3();

function setCameraProgram(time) { window.__bfTrace?.add(566);
  const t = THREE.MathUtils.clamp(time, 0, DURATION);

  if (t <= 1.18) {
    const u = smootherstep(0, 1.18, t);
    cameraPosition.set(
      THREE.MathUtils.lerp(-1.72, -1.08, u),
      THREE.MathUtils.lerp(1.20, 0.92, u),
      THREE.MathUtils.lerp(0.84, 0.92, u),
    );
    cameraTarget.set(
      THREE.MathUtils.lerp(REAR.x - 0.01, -0.82, u),
      THREE.MathUtils.lerp(REAR.y, 0.96, u),
      0.16,
    );
    camera.fov = THREE.MathUtils.lerp(30, 32, u);
  } else if (t <= 2.38) {
    const u = smootherstep(1.18, 2.38, t);
    cameraPosition.set(
      THREE.MathUtils.lerp(-1.08, -0.12, u),
      THREE.MathUtils.lerp(0.92, 0.93, u),
      THREE.MathUtils.lerp(0.92, 1.05, u),
    );
    cameraTarget.set(
      THREE.MathUtils.lerp(-0.82, BB.x, u),
      THREE.MathUtils.lerp(0.96, BB.y + 0.04, u),
      THREE.MathUtils.lerp(0.16, 0.13, u),
    );
    camera.fov = THREE.MathUtils.lerp(32, 35, u);
  } else if (t <= 3.58) {
    const u = smootherstep(2.38, 3.58, t);
    cameraPosition.set(
      THREE.MathUtils.lerp(-0.12, 1.06, u),
      THREE.MathUtils.lerp(0.93, 1.77, u),
      THREE.MathUtils.lerp(1.05, 1.35, u),
    );
    cameraTarget.set(
      THREE.MathUtils.lerp(BB.x, 0.47, u),
      THREE.MathUtils.lerp(BB.y + 0.04, 1.62, u),
      0.04,
    );
    camera.fov = THREE.MathUtils.lerp(35, 38, u);
  } else if (t <= 4.18) {
    const u = smootherstep(3.58, 4.18, t);
    cameraPosition.set(
      THREE.MathUtils.lerp(1.06, 3.58, u),
      THREE.MathUtils.lerp(1.77, 2.55, u),
      THREE.MathUtils.lerp(1.35, 4.10, u),
    );
    cameraTarget.set(
      THREE.MathUtils.lerp(0.47, 0.02, u),
      THREE.MathUtils.lerp(1.62, 1.12, u),
      THREE.MathUtils.lerp(0.04, 0, u),
    );
    camera.fov = THREE.MathUtils.lerp(38, 40, u);
  } else {
    const u = smootherstep(4.18, DURATION, t);
    const angle = THREE.MathUtils.lerp(0.853, 1.88, u);
    const radius = THREE.MathUtils.lerp(5.44, 5.7, u);
    cameraPosition.set(
      0.02 + Math.cos(angle) * radius,
      THREE.MathUtils.lerp(2.55, 2.27, u),
      Math.sin(angle) * radius,
    );
    cameraTarget.set(0.02, 1.12, 0);
    camera.fov = THREE.MathUtils.lerp(40, 41, u);
  }

  camera.position.copy(cameraPosition);
  camera.up.copy(up);
  camera.lookAt(cameraTarget);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

function updateScene(time) { window.__bfTrace?.add(641);
  const t = THREE.MathUtils.clamp(time, 0, DURATION);
  const drivePhase = t * 2.55;

  for (const part of spinningParts) {
    part.object.rotation.z = part.phase + t * part.speed;
  }
  cassette.rotation.z = -drivePhase * 2.9;
  chainring.rotation.z = -drivePhase;
  rightCrank.rotation.z = -drivePhase;
  leftCrank.rotation.z = Math.PI - drivePhase;
  derailleur.rotation.z = Math.sin(t * 6.0) * 0.018;

  for (let i = 0; i < chainLinks.length; i += 1) {
    const phase = ((i / chainLinks.length) + t * 0.32) % 1;
    const link = chainLinks[i];
    chainPath.getPointAt(phase, link.position);
    chainPath.getTangentAt(phase, tempTangent);
    link.rotation.set(0, 0, Math.atan2(tempTangent.y, tempTangent.x));
  }

  const visiblePulse = 0.96 + Math.sin(t * Math.PI * 2.0) * 0.04;
  accent.emissiveIntensity = visiblePulse * 0.11;

  setCameraProgram(t);
  renderer.render(scene, camera);
}

let currentTime = 0;
let running = false;
let animationStart = performance.now();

function animationFrame(now) { window.__bfTrace?.add(673);
  if (!running) return;
  currentTime = ((now - animationStart) / 1000) % DURATION;
  updateScene(currentTime);
  requestAnimationFrame(animationFrame);
}

function pause() { window.__bfTrace?.add(680);
  running = false;
}

function seek(seconds) { window.__bfTrace?.add(684);
  pause();
  currentTime = THREE.MathUtils.clamp(Number(seconds) || 0, 0, DURATION);
  updateScene(currentTime);
}

function getCameraState() { window.__bfTrace?.add(690);
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

window.reconstruction = { pause, seek, getCameraState };
seek(0);
