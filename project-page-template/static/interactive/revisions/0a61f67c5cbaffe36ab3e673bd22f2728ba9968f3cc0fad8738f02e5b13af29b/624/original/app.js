import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

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
renderer.toneMappingExposure = 0.96;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.domElement.id = 'reconstruction-canvas';
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020307);
scene.fog = new THREE.FogExp2(0x020307, 0.028);

const camera = new THREE.PerspectiveCamera(34, WIDTH / HEIGHT, 0.025, 60);

const studio = new THREE.Group();
scene.add(studio);

const floorMaterial = new THREE.MeshStandardMaterial({
  color: 0x080a0e,
  roughness: 0.36,
  metalness: 0.58,
});
const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
studio.add(floor);

const environment = new THREE.Mesh(
  new THREE.SphereGeometry(24, 40, 20),
  new THREE.MeshBasicMaterial({ color: 0x03050a, side: THREE.BackSide }),
);
environment.position.y = 4;
studio.add(environment);

const stage = new THREE.Mesh(
  new THREE.CylinderGeometry(4.2, 4.35, 0.12, 96),
  new THREE.MeshStandardMaterial({
    color: 0x080b10,
    roughness: 0.24,
    metalness: 0.72,
  }),
);
stage.position.y = 0.06;
stage.receiveShadow = true;
studio.add(stage);

const stageRing = new THREE.Mesh(
  new THREE.TorusGeometry(4.12, 0.018, 8, 128),
  new THREE.MeshBasicMaterial({ color: 0x273446 }),
);
stageRing.rotation.x = Math.PI / 2;
stageRing.position.y = 0.128;
studio.add(stageRing);

const shadow = new THREE.Mesh(
  new THREE.CircleGeometry(2.75, 64),
  new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.7,
    depthWrite: false,
  }),
);
shadow.scale.set(1, 0.43, 1);
shadow.rotation.x = -Math.PI / 2;
shadow.position.y = 0.135;
studio.add(shadow);

const accentMaterial = new THREE.MeshBasicMaterial({
  color: 0x8eb7dc,
  transparent: true,
  opacity: 0.28,
  toneMapped: false,
});
for (const x of [-5.8, -4.7, 4.7, 5.8]) {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(0.035, 3.5, 0.035), accentMaterial);
  bar.position.set(x, 2.0, -4.3);
  studio.add(bar);
}
for (const x of [-3.0, 0, 3.0]) {
  const rib = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.025, 5.6), accentMaterial);
  rib.position.set(x, 5.2, -0.8);
  studio.add(rib);
}

scene.add(new THREE.HemisphereLight(0x6488b4, 0x050608, 0.72));

const keyLight = new THREE.SpotLight(0xeaf4ff, 190, 18, Math.PI / 5.5, 0.65, 1.5);
keyLight.position.set(-3.5, 6.0, 4.5);
keyLight.target.position.set(-0.8, 0.7, 0);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.near = 0.5;
keyLight.shadow.camera.far = 20;
scene.add(keyLight, keyLight.target);

const rearRim = new THREE.SpotLight(0x4b85ca, 150, 15, Math.PI / 4, 0.72, 1.4);
rearRim.position.set(4.5, 3.3, -4.0);
rearRim.target.position.set(1.1, 0.8, 0);
scene.add(rearRim, rearRim.target);

const sideFill = new THREE.PointLight(0x9fc8ff, 36, 9, 1.7);
sideFill.position.set(0, 1.4, 4.5);
scene.add(sideFill);

const movingLight = new THREE.SpotLight(0xf3f8ff, 330, 13, Math.PI / 8, 0.62, 1.3);
movingLight.position.set(-3.4, 5.0, 2.65);
movingLight.target.position.set(-3.4, 1.08, 0);
scene.add(movingLight, movingLight.target);

const heroLight = new THREE.SpotLight(0xb5d4ff, 12, 14, Math.PI / 4.2, 0.78, 1.45);
heroLight.position.set(0.7, 4.1, 5.2);
heroLight.target.position.set(0.5, 0.85, 0);
scene.add(heroLight, heroLight.target);

const sweepPanelMaterial = new THREE.MeshBasicMaterial({
  color: 0xffffff,
  transparent: true,
  opacity: 0.82,
  toneMapped: false,
});
const sweepPanel = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.025, 0.22), sweepPanelMaterial);
sweepPanel.position.set(-3.4, 5.05, 2.5);
scene.add(sweepPanel);

const bodyMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x0a0e14,
  roughness: 0.21,
  metalness: 0.88,
  clearcoat: 1,
  clearcoatRoughness: 0.14,
});
const bodySecondaryMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x0b1118,
  roughness: 0.34,
  metalness: 0.82,
  clearcoat: 0.8,
  clearcoatRoughness: 0.18,
});
const carbonMaterial = new THREE.MeshStandardMaterial({
  color: 0x07090b,
  roughness: 0.34,
  metalness: 0.62,
});
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x10253b,
  roughness: 0.12,
  metalness: 0.58,
  transmission: 0.08,
  transparent: true,
  opacity: 0.94,
  clearcoat: 1,
});
const trimMaterial = new THREE.MeshStandardMaterial({
  color: 0x4c5965,
  roughness: 0.27,
  metalness: 1,
});
const tireMaterial = new THREE.MeshStandardMaterial({
  color: 0x060708,
  roughness: 0.78,
  metalness: 0.08,
});
const rimMaterial = new THREE.MeshStandardMaterial({
  color: 0x46515b,
  roughness: 0.3,
  metalness: 0.95,
});
const brakeMaterial = new THREE.MeshStandardMaterial({
  color: 0x20252a,
  roughness: 0.38,
  metalness: 0.9,
});

function createLoft(sections, radialSegments, material) {
  const positions = [];
  const indices = [];
  for (const section of sections) {
    for (let j = 0; j < radialSegments; j += 1) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const sideShape = 0.92 + 0.08 * Math.abs(Math.sin(angle));
      positions.push(
        section.x,
        section.cy + Math.sin(angle) * section.ry,
        Math.cos(angle) * section.hw * sideShape,
      );
    }
  }
  for (let i = 0; i < sections.length - 1; i += 1) {
    for (let j = 0; j < radialSegments; j += 1) {
      const next = (j + 1) % radialSegments;
      const a = i * radialSegments + j;
      const b = i * radialSegments + next;
      const c = (i + 1) * radialSegments + next;
      const d = (i + 1) * radialSegments + j;
      indices.push(a, b, d, b, c, d);
    }
  }
  for (const endIndex of [0, sections.length - 1]) {
    const centerIndex = positions.length / 3;
    const section = sections[endIndex];
    positions.push(section.x, section.cy, 0);
    for (let j = 0; j < radialSegments; j += 1) {
      const next = (j + 1) % radialSegments;
      const a = endIndex * radialSegments + j;
      const b = endIndex * radialSegments + next;
      if (endIndex === 0) indices.push(centerIndex, b, a);
      else indices.push(centerIndex, a, b);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeQuad(points, material) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(points.flatMap((point) => [point.x, point.y, point.z]), 3),
  );
  geometry.setIndex([0, 1, 2, 0, 2, 3]);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function makeLine(points, color, opacity = 1, radius = 0.014) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geometry = new THREE.TubeGeometry(curve, 48, radius, 6, false);
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      toneMapped: false,
    }),
  );
}

const car = new THREE.Group();
car.position.y = 0.16;
// Keep the v2 camera path, but present the nose rather than the tail to its opening view.
car.rotation.y = Math.PI;
scene.add(car);

const lowerBody = createLoft([
  { x: -2.58, cy: 0.66, ry: 0.18, hw: 0.34 },
  { x: -2.38, cy: 0.69, ry: 0.29, hw: 0.72 },
  { x: -1.92, cy: 0.74, ry: 0.38, hw: 0.91 },
  { x: -1.22, cy: 0.76, ry: 0.43, hw: 0.98 },
  { x: -0.35, cy: 0.78, ry: 0.45, hw: 1.0 },
  { x: 0.65, cy: 0.8, ry: 0.45, hw: 1.0 },
  { x: 1.42, cy: 0.8, ry: 0.42, hw: 0.98 },
  { x: 2.07, cy: 0.76, ry: 0.34, hw: 0.88 },
  { x: 2.47, cy: 0.69, ry: 0.25, hw: 0.6 },
  { x: 2.6, cy: 0.63, ry: 0.14, hw: 0.25 },
], 24, bodyMaterial);
car.add(lowerBody);

const shoulder = createLoft([
  { x: -2.25, cy: 0.94, ry: 0.16, hw: 0.66 },
  { x: -1.45, cy: 1.02, ry: 0.22, hw: 0.9 },
  { x: -0.5, cy: 1.05, ry: 0.22, hw: 0.93 },
  { x: 0.55, cy: 1.07, ry: 0.24, hw: 0.94 },
  { x: 1.45, cy: 1.02, ry: 0.22, hw: 0.91 },
  { x: 2.18, cy: 0.92, ry: 0.17, hw: 0.72 },
], 20, bodyMaterial);
car.add(shoulder);

const cabin = createLoft([
  { x: -0.92, cy: 1.15, ry: 0.06, hw: 0.7 },
  { x: -0.62, cy: 1.38, ry: 0.22, hw: 0.72 },
  { x: -0.18, cy: 1.56, ry: 0.14, hw: 0.71 },
  { x: 0.68, cy: 1.57, ry: 0.15, hw: 0.69 },
  { x: 1.12, cy: 1.38, ry: 0.2, hw: 0.7 },
  { x: 1.42, cy: 1.16, ry: 0.05, hw: 0.69 },
], 20, glassMaterial);
car.add(cabin);

const roof = createLoft([
  { x: -0.45, cy: 1.65, ry: 0.045, hw: 0.61 },
  { x: 0.18, cy: 1.72, ry: 0.055, hw: 0.62 },
  { x: 0.75, cy: 1.66, ry: 0.05, hw: 0.6 },
], 16, bodySecondaryMaterial);
car.add(roof);

for (const side of [-1, 1]) {
  const z = side * 1.008;
  const frontWindow = makeQuad([
    new THREE.Vector3(-0.72, 1.2, z),
    new THREE.Vector3(-0.48, 1.53, z),
    new THREE.Vector3(0.1, 1.6, z),
    new THREE.Vector3(0.07, 1.2, z),
  ], glassMaterial);
  const rearWindow = makeQuad([
    new THREE.Vector3(0.12, 1.2, z),
    new THREE.Vector3(0.16, 1.6, z),
    new THREE.Vector3(0.72, 1.57, z),
    new THREE.Vector3(1.25, 1.2, z),
  ], glassMaterial);
  car.add(frontWindow, rearWindow);

  const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.46, 0.035), carbonMaterial);
  pillar.position.set(0.1, 1.4, z + side * 0.006);
  pillar.rotation.z = -0.06;
  car.add(pillar);

  const sillTrim = new THREE.Mesh(new THREE.BoxGeometry(1.98, 0.025, 0.025), trimMaterial);
  sillTrim.position.set(0.26, 1.185, z + side * 0.012);
  car.add(sillTrim);

  const doorInsert = makeQuad([
    new THREE.Vector3(-0.67, 1.04, z + side * 0.012),
    new THREE.Vector3(-0.52, 0.53, z + side * 0.012),
    new THREE.Vector3(0.57, 0.54, z + side * 0.012),
    new THREE.Vector3(0.9, 1.04, z + side * 0.012),
  ], bodySecondaryMaterial);
  car.add(doorInsert);

  const mirrorArm = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.24, 10), carbonMaterial);
  mirrorArm.rotation.x = Math.PI / 2;
  mirrorArm.position.set(-0.62, 1.27, side * 1.04);
  car.add(mirrorArm);

  const mirror = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 12), bodyMaterial);
  mirror.scale.set(1.35, 0.5, 0.7);
  mirror.position.set(-0.63, 1.3, side * 1.17);
  car.add(mirror);

  const skirt = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.13, 0.11), carbonMaterial);
  skirt.position.set(0.02, 0.39, side * 0.99);
  car.add(skirt);

  const doorContour = makeLine([
    new THREE.Vector3(-0.7, 1.08, z + side * 0.018),
    new THREE.Vector3(-0.52, 0.73, z + side * 0.018),
    new THREE.Vector3(0.55, 0.66, z + side * 0.018),
    new THREE.Vector3(0.93, 1.08, z + side * 0.018),
  ], 0x4d5964, 0.72, 0.009);
  car.add(doorContour);

  const shoulderLine = makeLine([
    new THREE.Vector3(-1.26, 0.98, z + side * 0.024),
    new THREE.Vector3(-0.4, 1.08, z + side * 0.024),
    new THREE.Vector3(0.6, 1.08, z + side * 0.024),
    new THREE.Vector3(1.48, 0.98, z + side * 0.024),
  ], 0x95b6cf, 0.38, 0.011);
  car.add(shoulderLine);

  const intake = makeQuad([
    new THREE.Vector3(1.05, 0.85, z + side * 0.025),
    new THREE.Vector3(1.25, 1.02, z + side * 0.025),
    new THREE.Vector3(1.54, 0.94, z + side * 0.025),
    new THREE.Vector3(1.4, 0.58, z + side * 0.025),
  ], carbonMaterial);
  car.add(intake);
}

const wheelCenters = [-1.68, 1.58];
for (const wheelX of wheelCenters) {
  for (const side of [-1, 1]) {
    const wheel = new THREE.Group();
    wheel.position.set(wheelX, 0.58, side * 1.02);

    const tire = new THREE.Mesh(new THREE.TorusGeometry(0.43, 0.105, 18, 48), tireMaterial);
    tire.castShadow = true;
    wheel.add(tire);

    const sidewall = new THREE.Mesh(new THREE.CylinderGeometry(0.405, 0.405, 0.055, 48), tireMaterial);
    sidewall.rotation.x = Math.PI / 2;
    sidewall.position.z = side * 0.018;
    wheel.add(sidewall);

    const brakeDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.285, 0.285, 0.045, 40), brakeMaterial);
    brakeDisc.rotation.x = Math.PI / 2;
    brakeDisc.position.z = side * 0.055;
    wheel.add(brakeDisc);

    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.075, 24), rimMaterial);
    hub.rotation.x = Math.PI / 2;
    hub.position.z = side * 0.085;
    wheel.add(hub);

    const rimRing = new THREE.Mesh(new THREE.TorusGeometry(0.31, 0.025, 10, 40), rimMaterial);
    rimRing.position.z = side * 0.105;
    wheel.add(rimRing);

    for (let spokeIndex = 0; spokeIndex < 7; spokeIndex += 1) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.032, 0.3, 0.028), rimMaterial);
      spoke.position.z = side * 0.102;
      spoke.rotation.z = (spokeIndex / 7) * Math.PI * 2;
      spoke.position.x = Math.sin(spoke.rotation.z) * 0.13;
      spoke.position.y = Math.cos(spoke.rotation.z) * 0.13;
      wheel.add(spoke);
    }

    const caliper = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.24, 0.07),
      new THREE.MeshStandardMaterial({
        color: 0xb51e18,
        roughness: 0.32,
        metalness: 0.5,
      }),
    );
    caliper.position.set(0.2, 0, side * 0.095);
    wheel.add(caliper);
    car.add(wheel);
  }

  for (const side of [-1, 1]) {
    const fender = new THREE.Mesh(
      new THREE.SphereGeometry(0.64, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
      bodyMaterial,
    );
    fender.scale.set(1.05, 0.76, 0.56);
    fender.position.set(wheelX, 0.55, side * 0.8);
    fender.castShadow = true;
    car.add(fender);

    const archPoints = [];
    for (let i = 0; i <= 20; i += 1) {
      const angle = Math.PI * (i / 20);
      archPoints.push(new THREE.Vector3(
        wheelX - Math.cos(angle) * 0.57,
        0.58 + Math.sin(angle) * 0.57,
        side * 1.015,
      ));
    }
    car.add(makeLine(archPoints, 0x222a31, 0.9, 0.026));
  }
}

const frontSplitter = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.11, 1.58), carbonMaterial);
frontSplitter.position.set(-2.48, 0.38, 0);
frontSplitter.rotation.z = -0.06;
car.add(frontSplitter);

const rearDiffuser = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.16, 1.5), carbonMaterial);
rearDiffuser.position.set(2.38, 0.4, 0);
rearDiffuser.rotation.z = 0.08;
car.add(rearDiffuser);

const rearDeckLip = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.045, 1.52), carbonMaterial);
rearDeckLip.position.set(2.08, 1.03, 0);
rearDeckLip.rotation.z = 0.05;
car.add(rearDeckLip);

for (const side of [-1, 1]) {
  const hoodVent = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.018, 0.08), carbonMaterial);
  hoodVent.position.set(-1.33, 1.095, side * 0.37);
  hoodVent.rotation.z = -0.03;
  car.add(hoodVent);
}

const grille = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 0.92), carbonMaterial);
grille.position.set(-2.54, 0.61, 0);
car.add(grille);

const headlightMaterial = new THREE.MeshStandardMaterial({
  color: 0xc9e8ff,
  emissive: 0xbadfff,
  emissiveIntensity: 1.8,
  roughness: 0.12,
});
const tailMaterial = new THREE.MeshStandardMaterial({
  color: 0x7c0503,
  emissive: 0xff1208,
  emissiveIntensity: 1.25,
  roughness: 0.18,
});
for (const side of [-1, 1]) {
  const headlight = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.1, 0.54), headlightMaterial);
  headlight.position.set(-2.48, 0.84, side * 0.48);
  headlight.rotation.y = side * 0.18;
  car.add(headlight);

  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.075, 0.58), tailMaterial);
  tail.position.set(2.42, 0.86, side * 0.43);
  tail.rotation.y = -side * 0.12;
  car.add(tail);

  const exhaust = new THREE.Mesh(
    new THREE.CylinderGeometry(0.085, 0.085, 0.16, 20, 1, true),
    trimMaterial,
  );
  exhaust.rotation.z = Math.PI / 2;
  exhaust.position.set(2.5, 0.39, side * 0.55);
  car.add(exhaust);
}

const hoodSpine = makeLine([
  new THREE.Vector3(-2.35, 0.94, 0),
  new THREE.Vector3(-1.7, 1.09, 0),
  new THREE.Vector3(-1.0, 1.13, 0),
], 0x7790a5, 0.35, 0.01);
car.add(hoodSpine);

function smootherStep(value) {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

const cameraPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(4.5, 2.65, -5.7),
  new THREE.Vector3(4.0, 2.42, -2.7),
  new THREE.Vector3(5.8, 2.2, 0.3),
  new THREE.Vector3(4.7, 1.86, 3.5),
  new THREE.Vector3(2.7, 1.48, 4.8),
  new THREE.Vector3(1.3, 1.1, 4.1),
  new THREE.Vector3(0.4, 0.92, 3.15),
], false, 'centripetal');

const cameraTargetPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 0.9, 0),
  new THREE.Vector3(0.1, 0.84, 0),
  new THREE.Vector3(0.12, 0.8, 0.05),
  new THREE.Vector3(-0.05, 0.76, 0.22),
  new THREE.Vector3(-0.5, 0.7, 0.55),
  new THREE.Vector3(-1.05, 0.68, 0.75),
  new THREE.Vector3(-1.35, 0.68, 0.9),
], false, 'centripetal');

function sampleCameraProgress(normalizedTime) {
  const startTime = 0.35 / DURATION;
  const endTime = 4.72 / DURATION;
  const progress = THREE.MathUtils.clamp(
    (normalizedTime - startTime) / (endTime - startTime),
    0,
    1,
  );
  const easingSpan = 0.12;
  const easeEdge = (value) => -(value ** 3) / (easingSpan ** 2)
    + (2 * value ** 2) / easingSpan;
  if (progress < easingSpan) return easeEdge(progress);
  if (progress > 1 - easingSpan) return 1 - easeEdge(1 - progress);
  return progress;
}

function sampleCamera(normalizedTime) {
  const pathProgress = sampleCameraProgress(normalizedTime);
  const travelWidening = smootherStep(pathProgress / 0.48);
  const detailTransition = smootherStep((pathProgress - 0.7) / 0.3);
  const travelFov = THREE.MathUtils.lerp(33, 38, travelWidening);
  return {
    position: cameraPath.getPoint(pathProgress),
    target: cameraTargetPath.getPoint(pathProgress),
    fov: THREE.MathUtils.lerp(travelFov, 29, detailTransition),
  };
}

let currentTime = 0;
let animationFrame = 0;
let playing = false;

function updateAtTime(seconds) {
  currentTime = THREE.MathUtils.clamp(Number(seconds) || 0, 0, DURATION);
  const normalizedTime = currentTime / DURATION;
  const cameraState = sampleCamera(normalizedTime);
  camera.position.copy(cameraState.position);
  camera.fov = cameraState.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(cameraState.target);
  camera.updateMatrixWorld(true);

  const sweepProgress = smootherStep(THREE.MathUtils.clamp((normalizedTime - 0.04) / 0.86, 0, 1));
  const sweepX = THREE.MathUtils.lerp(-3.4, 3.5, sweepProgress);
  movingLight.position.x = sweepX;
  movingLight.target.position.x = sweepX - 0.15;
  sweepPanel.position.x = sweepX;
  movingLight.intensity = 160 + Math.sin(sweepProgress * Math.PI) * 220;
  sweepPanelMaterial.opacity = 0.4 + Math.sin(sweepProgress * Math.PI) * 0.35;

  const reveal = smootherStep((normalizedTime - 0.73) / 0.23);
  rearRim.intensity = 110 + reveal * 105;
  sideFill.intensity = 34 + reveal * 90;
  heroLight.intensity = 12 + reveal * 145;
  headlightMaterial.emissiveIntensity = 1.5 + reveal * 1.8;
  tailMaterial.emissiveIntensity = 1.15 + reveal * 1.3;
  accentMaterial.opacity = 0.2 + reveal * 0.26;

  renderer.render(scene, camera);
}

function animate(now) {
  if (!playing) return;
  updateAtTime((now / 1000) % DURATION);
  animationFrame = requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    playing = false;
    cancelAnimationFrame(animationFrame);
    updateAtTime(currentTime);
  },
  seek(seconds) {
    playing = false;
    cancelAnimationFrame(animationFrame);
    updateAtTime(seconds);
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
};

window.addEventListener('resize', () => {
  renderer.setSize(WIDTH, HEIGHT, false);
  camera.aspect = WIDTH / HEIGHT;
  camera.updateProjectionMatrix();
  updateAtTime(currentTime);
});

updateAtTime(0);
