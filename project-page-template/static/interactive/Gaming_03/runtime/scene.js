import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 5;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020202);
scene.fog = new THREE.FogExp2(0x050302, 0.027);

const camera = new THREE.PerspectiveCamera(61, WIDTH / HEIGHT, 0.05, 90);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.38;
document.body.appendChild(renderer.domElement);

const clamp01 = (v) => Math.max(0, Math.min(1, v));
const smoothstep = (a, b, v) => {
  const x = clamp01((v - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const pulse = (start, peak, end, t) => {
  if (t <= start || t >= end) return 0;
  return t < peak ? smoothstep(start, peak, t) : 1 - smoothstep(peak, end, t);
};
const seeded = (i) => {
  const value = Math.sin(i * 91.733 + 17.17) * 43758.5453;
  return value - Math.floor(value);
};

const stoneMaterial = new THREE.MeshStandardMaterial({
  color: 0x49433f,
  roughness: 0.94,
  metalness: 0.02,
  emissive: 0x090503,
  emissiveIntensity: 0.32,
});
const stoneLightMaterial = new THREE.MeshStandardMaterial({
  color: 0x665950,
  roughness: 0.97,
  emissive: 0x0d0703,
  emissiveIntensity: 0.28,
});
const stoneEdgeMaterial = new THREE.MeshStandardMaterial({
  color: 0x272321,
  roughness: 1,
});
const emberMaterial = new THREE.MeshBasicMaterial({
  color: 0xffb029,
  toneMapped: false,
});
const hotMaterial = new THREE.MeshBasicMaterial({
  color: 0xff5418,
  toneMapped: false,
});
const fireMaterial = new THREE.MeshBasicMaterial({
  color: 0xff6b19,
  transparent: true,
  opacity: 0.82,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  toneMapped: false,
});

function makeBox(parent, size, position, material, rotation = null) { window.__bfTrace?.add(75);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(size.x, size.y, size.z), material);
  mesh.position.copy(position);
  if (rotation) mesh.rotation.set(rotation.x, rotation.y, rotation.z);
  parent.add(mesh);
  return mesh;
}

function makeSphere(parent, radius, position, material, scale = null, detail = 1) { window.__bfTrace?.add(83);
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, detail), material);
  mesh.position.copy(position);
  if (scale) mesh.scale.copy(scale);
  parent.add(mesh);
  return mesh;
}

function makeCylinder(parent, radiusTop, radiusBottom, height, position, material, radial = 8) { window.__bfTrace?.add(91);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radial),
    material,
  );
  mesh.position.copy(position);
  parent.add(mesh);
  return mesh;
}

const bridgeShake = new THREE.Group();
scene.add(bridgeShake);

const deckGroup = new THREE.Group();
bridgeShake.add(deckGroup);
for (let i = 0; i < 31; i += 1) {
  const z = 12.4 - i * 0.76;
  const missing = i === 12 || i === 24;
  if (missing) continue;
  const offset = (seeded(i) - 0.5) * 0.16;
  const slab = makeBox(
    deckGroup,
    new THREE.Vector3(3.88 - seeded(i + 21) * 0.16, 0.36, 0.71),
    new THREE.Vector3(offset, -0.06 + (seeded(i + 9) - 0.5) * 0.06, z),
    i % 3 === 0 ? stoneLightMaterial : stoneMaterial,
    new THREE.Vector3(
      (seeded(i + 14) - 0.5) * 0.025,
      (seeded(i + 27) - 0.5) * 0.045,
      (seeded(i + 33) - 0.5) * 0.018,
    ),
  );
  slab.userData.basePosition = slab.position.clone();
}

makeBox(
  bridgeShake,
  new THREE.Vector3(3.28, 0.48, 23.5),
  new THREE.Vector3(0, -0.47, 1.1),
  stoneEdgeMaterial,
);

const railingPosts = [];
for (const side of [-1, 1]) {
  for (let i = 0; i < 16; i += 1) {
    if ((side === -1 && i === 7) || (side === 1 && i === 11)) continue;
    const z = 11.9 - i * 1.48;
    const post = makeCylinder(
      bridgeShake,
      0.2,
      0.25,
      1.18,
      new THREE.Vector3(side * 1.82, 0.52, z),
      i % 4 === 0 ? stoneLightMaterial : stoneMaterial,
      6,
    );
    post.rotation.y = seeded(i + (side + 1) * 40) * 0.18;
    railingPosts.push(post);
    if (i < 15) {
      const rail = makeBox(
        bridgeShake,
        new THREE.Vector3(0.24, 0.25, 1.34),
        new THREE.Vector3(side * 1.82, 1.06, z - 0.74),
        stoneMaterial,
        new THREE.Vector3(0, 0, (seeded(i + 90) - 0.5) * 0.025),
      );
      railingPosts.push(rail);
    }
  }
}

const brokenEdgeRocks = [];
for (let i = 0; i < 18; i += 1) {
  const side = i % 2 === 0 ? -1 : 1;
  const rock = makeSphere(
    bridgeShake,
    0.24 + seeded(i + 110) * 0.18,
    new THREE.Vector3(
      side * (1.7 + seeded(i + 3) * 0.25),
      -0.08 + seeded(i + 4) * 0.3,
      10 - i * 1.18,
    ),
    i % 3 ? stoneMaterial : stoneLightMaterial,
    new THREE.Vector3(1.1, 0.75, 1.35),
    0,
  );
  rock.rotation.set(seeded(i + 8) * 2, seeded(i + 10) * 2, seeded(i + 13) * 2);
  brokenEdgeRocks.push(rock);
}

const chasm = new THREE.Group();
scene.add(chasm);
for (let i = 0; i < 18; i += 1) {
  const side = i % 2 === 0 ? -1 : 1;
  const x = side * (7 + seeded(i + 4) * 10);
  const z = 8 - seeded(i + 33) * 34;
  const height = 8 + seeded(i + 61) * 16;
  const pillar = makeCylinder(
    chasm,
    1.1 + seeded(i + 1) * 1.2,
    2.1 + seeded(i + 2) * 1.7,
    height,
    new THREE.Vector3(x, -3.2 + height * 0.25, z),
    i % 3 === 0 ? stoneLightMaterial : stoneEdgeMaterial,
    7,
  );
  pillar.rotation.z = (seeded(i + 70) - 0.5) * 0.25;
}

for (let i = 0; i < 22; i += 1) {
  const x = (seeded(i + 200) - 0.5) * 34;
  const z = 9 - seeded(i + 220) * 38;
  const length = 1.5 + seeded(i + 230) * 5;
  const stalactite = makeCylinder(
    chasm,
    0.06,
    0.62 + seeded(i + 250) * 0.7,
    length,
    new THREE.Vector3(x, 11.5 - length * 0.5, z),
    stoneEdgeMaterial,
    7,
  );
  stalactite.rotation.z = (seeded(i + 270) - 0.5) * 0.12;
}

function createHumanoid(options) { window.__bfTrace?.add(215);
  const group = new THREE.Group();
  const cloakMaterial = new THREE.MeshStandardMaterial({
    color: options.color,
    roughness: 0.9,
    emissive: 0x080504,
    emissiveIntensity: 0.55,
  });
  const skinMaterial = new THREE.MeshStandardMaterial({
    color: options.skin || 0x8f684e,
    roughness: 0.85,
  });
  const bootMaterial = new THREE.MeshStandardMaterial({ color: 0x11100f, roughness: 1 });
  const torso = makeCylinder(
    group,
    options.scale * 0.25,
    options.scale * 0.4,
    options.scale * 0.95,
    new THREE.Vector3(0, options.scale * 1.05, 0),
    cloakMaterial,
    7,
  );
  torso.rotation.x = 0.06;
  makeSphere(
    group,
    options.scale * 0.22,
    new THREE.Vector3(0, options.scale * 1.68, 0),
    skinMaterial,
    new THREE.Vector3(0.92, 1.05, 0.9),
    1,
  );
  const limbs = [];
  for (const side of [-1, 1]) {
    const arm = makeCylinder(
      group,
      options.scale * 0.09,
      options.scale * 0.08,
      options.scale * 0.72,
      new THREE.Vector3(side * options.scale * 0.34, options.scale * 1.05, 0),
      cloakMaterial,
      7,
    );
    const leg = makeCylinder(
      group,
      options.scale * 0.11,
      options.scale * 0.09,
      options.scale * 0.72,
      new THREE.Vector3(side * options.scale * 0.16, options.scale * 0.38, 0),
      bootMaterial,
      7,
    );
    limbs.push({ arm, leg, side });
  }
  group.userData.limbs = limbs;
  group.userData.scaleValue = options.scale;
  return group;
}

const fellowship = [];
const fellowshipSpecs = [
  { x: -0.85, z: 0.2, scale: 0.78, color: 0x27302a, phase: 0.2 },
  { x: 0.82, z: -0.8, scale: 0.84, color: 0x4a3427, phase: 1.9 },
  { x: -0.25, z: -2.0, scale: 0.68, color: 0x342b24, phase: 3.3 },
  { x: 1.0, z: -3.1, scale: 0.76, color: 0x232928, phase: 4.6 },
];
for (const spec of fellowshipSpecs) {
  const runner = createHumanoid(spec);
  runner.position.set(spec.x, 0.08, spec.z);
  runner.rotation.y = Math.PI;
  runner.userData.spec = spec;
  fellowship.push(runner);
  scene.add(runner);
}

const gandalf = new THREE.Group();
scene.add(gandalf);
gandalf.position.set(-0.12, 0.05, -5.5);
gandalf.rotation.y = Math.PI;
const robeMaterial = new THREE.MeshStandardMaterial({
  color: 0xa8a49a,
  roughness: 0.88,
  emissive: 0x24160b,
  emissiveIntensity: 0.4,
});
const robeShadowMaterial = new THREE.MeshStandardMaterial({
  color: 0x514f4b,
  roughness: 0.95,
});
makeCylinder(gandalf, 0.28, 0.68, 1.7, new THREE.Vector3(0, 0.9, 0), robeMaterial, 9);
makeSphere(
  gandalf,
  0.24,
  new THREE.Vector3(0, 2.0, 0),
  robeShadowMaterial,
  new THREE.Vector3(0.85, 1.04, 0.85),
  1,
);
const hat = makeCylinder(
  gandalf,
  0.02,
  0.49,
  0.92,
  new THREE.Vector3(0, 2.58, 0),
  robeMaterial,
  10,
);
hat.rotation.x = -0.1;
makeCylinder(gandalf, 0.57, 0.57, 0.08, new THREE.Vector3(0, 2.18, 0), robeMaterial, 12);
const staff = makeCylinder(
  gandalf,
  0.045,
  0.06,
  3.28,
  new THREE.Vector3(-0.68, 1.5, -0.1),
  new THREE.MeshStandardMaterial({ color: 0x3a2819, roughness: 1 }),
  7,
);
staff.rotation.z = -0.12;
const staffLight = new THREE.PointLight(0xffd89a, 2.8, 7, 2);
staffLight.position.set(-0.8, 3.1, -5.55);
scene.add(staffLight);
const staffGem = makeSphere(
  gandalf,
  0.12,
  new THREE.Vector3(-0.88, 3.08, -0.1),
  new THREE.MeshBasicMaterial({ color: 0xffe0ad, toneMapped: false }),
  null,
  1,
);

const balrog = new THREE.Group();
balrog.position.set(0, 0, -17.2);
scene.add(balrog);
const balrogRock = new THREE.MeshStandardMaterial({
  color: 0x100b09,
  roughness: 0.82,
  metalness: 0.08,
  emissive: 0x4b0b00,
  emissiveIntensity: 0.42,
});
const balrogChar = new THREE.MeshStandardMaterial({
  color: 0x070504,
  roughness: 0.92,
  emissive: 0x210300,
  emissiveIntensity: 0.6,
});

makeSphere(
  balrog,
  1.7,
  new THREE.Vector3(0, 4.4, 0),
  balrogRock,
  new THREE.Vector3(1.15, 1.4, 0.82),
  1,
);
makeSphere(
  balrog,
  1.05,
  new THREE.Vector3(0, 7.0, 0.1),
  balrogChar,
  new THREE.Vector3(1.15, 1.0, 0.9),
  1,
);
for (const side of [-1, 1]) {
  const leg = makeCylinder(
    balrog,
    0.5,
    0.92,
    3.5,
    new THREE.Vector3(side * 0.72, 1.75, -0.05),
    balrogChar,
    8,
  );
  leg.rotation.z = side * -0.12;
  const foot = makeSphere(
    balrog,
    0.65,
    new THREE.Vector3(side * 0.93, 0.18, 0.42),
    balrogRock,
    new THREE.Vector3(1.2, 0.55, 1.8),
    1,
  );
  foot.rotation.y = side * 0.12;
}
for (const side of [-1, 1]) {
  const shoulder = makeSphere(
    balrog,
    1.15,
    new THREE.Vector3(side * 1.7, 5.35, 0.1),
    balrogRock,
    new THREE.Vector3(1.25, 0.75, 0.78),
    1,
  );
  shoulder.rotation.z = side * 0.3;
  const arm = makeCylinder(
    balrog,
    0.47,
    0.7,
    3.2,
    new THREE.Vector3(side * 2.45, 4.2, 0.15),
    balrogChar,
    8,
  );
  arm.rotation.z = side * 0.38;
  arm.userData.side = side;
  balrog.userData[`arm${side}`] = arm;
  makeSphere(
    balrog,
    0.56,
    new THREE.Vector3(side * 2.96, 2.93, 0.48),
    balrogRock,
    new THREE.Vector3(1.25, 0.75, 1.3),
    1,
  );
  for (let clawIndex = 0; clawIndex < 3; clawIndex += 1) {
    const claw = new THREE.Mesh(
      new THREE.ConeGeometry(0.1, 0.72, 6),
      balrogChar,
    );
    claw.position.set(
      side * (3.18 + clawIndex * 0.11),
      2.54 - clawIndex * 0.08,
      0.62,
    );
    claw.rotation.z = side * -0.42;
    balrog.add(claw);
  }
  const horn = new THREE.Mesh(
    new THREE.ConeGeometry(0.55, 3.5, 9),
    balrogChar,
  );
  horn.position.set(side * 1.18, 8.2, 0);
  horn.rotation.z = side * -0.75;
  horn.rotation.x = 0.18;
  balrog.add(horn);
}

for (let i = 0; i < 13; i += 1) {
  const angle = -1.15 + i * 0.19;
  const crack = makeCylinder(
    balrog,
    0.045,
    0.075,
    1.1 + seeded(i + 300) * 1.1,
    new THREE.Vector3(
      (seeded(i + 310) - 0.5) * 2.2,
      3.2 + seeded(i + 320) * 3.4,
      1.25,
    ),
    i % 3 === 0 ? emberMaterial : hotMaterial,
    5,
  );
  crack.rotation.z = angle;
  crack.rotation.x = Math.PI * 0.5;
}
for (const side of [-1, 1]) {
  const eye = makeSphere(
    balrog,
    0.16,
    new THREE.Vector3(side * 0.37, 7.16, 0.92),
    emberMaterial,
    new THREE.Vector3(1.25, 0.55, 0.35),
    1,
  );
  eye.rotation.z = side * 0.15;
}
const mouth = makeBox(
  balrog,
  new THREE.Vector3(0.95, 0.12, 0.1),
  new THREE.Vector3(0, 6.58, 0.91),
  hotMaterial,
);
mouth.rotation.z = -0.03;

const balrogFlames = [];
for (let i = 0; i < 24; i += 1) {
  const angle = (i / 24) * Math.PI * 2;
  const radius = i % 3 === 0 ? 2.2 : 1.45;
  const height = 0.75 + seeded(i + 350) * 1.35;
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.16 + seeded(i + 351) * 0.22, height, 6),
    i % 4 === 0 ? emberMaterial : hotMaterial,
  );
  flame.position.set(
    Math.cos(angle) * radius,
    6.15 + Math.sin(angle) * 1.4,
    0.35 + seeded(i + 352) * 0.35,
  );
  flame.rotation.z = -Math.cos(angle) * 0.42;
  flame.userData.seed = seeded(i + 353) * Math.PI * 2;
  flame.userData.baseScale = 0.8 + seeded(i + 354) * 0.45;
  balrog.add(flame);
  balrogFlames.push(flame);
}

function makeWing(side) { window.__bfTrace?.add(510);
  const sx = side;
  const geometry = new THREE.BufferGeometry();
  const points = [
    [sx * 1.0, 6.2, 0],
    [sx * 4.5, 9.1, -0.3],
    [sx * 9.2, 10.1, -0.6],
    [sx * 1.0, 6.2, 0],
    [sx * 9.2, 10.1, -0.6],
    [sx * 7.0, 5.8, -0.2],
    [sx * 1.0, 6.2, 0],
    [sx * 7.0, 5.8, -0.2],
    [sx * 9.5, 2.5, 0.1],
    [sx * 1.0, 6.2, 0],
    [sx * 9.5, 2.5, 0.1],
    [sx * 3.4, 3.25, 0.15],
  ];
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  geometry.computeVertexNormals();
  const wingMaterial = new THREE.MeshBasicMaterial({
    color: 0x7b1305,
    transparent: true,
    opacity: 0.54,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const wing = new THREE.Mesh(geometry, wingMaterial);
  balrog.add(wing);

  const ribs = [];
  const tips = [
    new THREE.Vector3(sx * 4.5, 9.1, -0.3),
    new THREE.Vector3(sx * 9.2, 10.1, -0.6),
    new THREE.Vector3(sx * 7.0, 5.8, -0.2),
    new THREE.Vector3(sx * 9.5, 2.5, 0.1),
    new THREE.Vector3(sx * 3.4, 3.25, 0.15),
  ];
  for (const tip of tips) {
    const rib = makeCylinder(
      balrog,
      0.08,
      0.13,
      1,
      new THREE.Vector3(),
      hotMaterial,
      6,
    );
    rib.userData.start = new THREE.Vector3(sx * 1.0, 6.2, 0);
    rib.userData.end = tip;
    ribs.push(rib);
  }
  wing.userData.ribs = ribs;
  return wing;
}

const wings = [makeWing(-1), makeWing(1)];
const wingEdgeFlames = [];
for (const side of [-1, 1]) {
  const edgeSegments = [
    [new THREE.Vector3(side * 1.4, 6.5, 0), new THREE.Vector3(side * 4.5, 9.1, -0.25)],
    [new THREE.Vector3(side * 4.5, 9.1, -0.25), new THREE.Vector3(side * 9.2, 10.1, -0.5)],
    [new THREE.Vector3(side * 9.2, 10.1, -0.5), new THREE.Vector3(side * 7.0, 5.8, -0.12)],
    [new THREE.Vector3(side * 7.0, 5.8, -0.12), new THREE.Vector3(side * 9.5, 2.5, 0.12)],
  ];
  let edgeIndex = 0;
  for (const [start, end] of edgeSegments) {
    for (let step = 0; step < 5; step += 1) {
      const u = (step + 0.35) / 5;
      const position = start.clone().lerp(end, u);
      const height = 0.38 + seeded(380 + edgeIndex) * 0.55;
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(0.07 + seeded(390 + edgeIndex) * 0.09, height, 5),
        edgeIndex % 4 === 0 ? emberMaterial : hotMaterial,
      );
      flame.position.copy(position);
      flame.userData.seed = seeded(400 + edgeIndex) * Math.PI * 2;
      flame.userData.baseScale = 0.75 + seeded(410 + edgeIndex) * 0.6;
      balrog.add(flame);
      wingEdgeFlames.push(flame);
      edgeIndex += 1;
    }
  }
}

function placeBetween(mesh, start, end, thickness = 1) { window.__bfTrace?.add(596);
  const delta = new THREE.Vector3().subVectors(end, start);
  const length = delta.length();
  mesh.position.copy(start).addScaledVector(delta, 0.5);
  mesh.scale.set(thickness, length, thickness);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    delta.normalize(),
  );
}

for (const wing of wings) {
  for (const rib of wing.userData.ribs) {
    placeBetween(rib, rib.userData.start, rib.userData.end, 1);
  }
}

const fireField = [];
for (let i = 0; i < 52; i += 1) {
  const angle = seeded(i + 401) * Math.PI * 2;
  const radius = 2.0 + seeded(i + 402) * 9.5;
  const x = Math.cos(angle) * radius;
  const z = -18.5 + Math.sin(angle) * radius * 0.48;
  const height = 0.8 + seeded(i + 405) * 3.3;
  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.16 + seeded(i + 404) * 0.34, height, 6),
    i % 4 === 0 ? emberMaterial : fireMaterial,
  );
  flame.position.set(x, -0.25 + height * 0.5, z);
  flame.userData = {
    baseY: flame.position.y,
    baseScale: 0.72 + seeded(i + 406) * 0.6,
    seed: seeded(i + 407) * Math.PI * 2,
  };
  scene.add(flame);
  fireField.push(flame);
}

const lavaGlow = new THREE.Mesh(
  new THREE.CircleGeometry(10, 48),
  new THREE.MeshBasicMaterial({
    color: 0x7d1304,
    transparent: true,
    opacity: 0.8,
    toneMapped: false,
  }),
);
lavaGlow.position.set(0, -0.48, -19);
lavaGlow.rotation.x = -Math.PI * 0.5;
scene.add(lavaGlow);

const whip = new THREE.Group();
scene.add(whip);
const whipNodes = [];
const whipLinks = [];
const whipCount = 38;
for (let i = 0; i < whipCount; i += 1) {
  const node = makeSphere(
    whip,
    0.14 - (i / whipCount) * 0.075,
    new THREE.Vector3(),
    i % 4 === 0 ? emberMaterial : hotMaterial,
    null,
    0,
  );
  whipNodes.push(node);
  if (i > 0) {
    const link = makeCylinder(
      whip,
      0.055,
      0.085,
      1,
      new THREE.Vector3(),
      i % 3 === 0 ? emberMaterial : hotMaterial,
      5,
    );
    whipLinks.push(link);
  }
}

const sparks = [];
for (let i = 0; i < 72; i += 1) {
  const material = new THREE.MeshBasicMaterial({
    color: i % 5 === 0 ? 0xffe3a1 : i % 3 === 0 ? 0xffa31a : 0xff4b0c,
    transparent: true,
    opacity: 1,
    toneMapped: false,
  });
  const spark = new THREE.Mesh(
    new THREE.CylinderGeometry(0.01, 0.042, 0.48 + seeded(i + 510) * 0.7, 5),
    material,
  );
  spark.rotation.x = Math.PI * 0.5;
  spark.userData = {
    start: 2.05 + seeded(i + 500) * 0.92,
    life: 1.05 + seeded(i + 501) * 1.35,
    x: (seeded(i + 502) - 0.5) * 7.5,
    y: 3.2 + seeded(i + 503) * 4.8,
    z: -12 + seeded(i + 504) * 5.5,
    vx: (seeded(i + 505) - 0.5) * 8,
    vy: (seeded(i + 506) - 0.2) * 4.5,
    vz: 10 + seeded(i + 507) * 13,
    spin: seeded(i + 508) * 7,
  };
  scene.add(spark);
  sparks.push(spark);
}

const flyingDebris = [];
for (let i = 0; i < 16; i += 1) {
  const debris = makeSphere(
    scene,
    0.09 + seeded(i + 600) * 0.18,
    new THREE.Vector3(),
    i % 3 === 0 ? stoneLightMaterial : stoneMaterial,
    new THREE.Vector3(1.0, 0.65, 1.35),
    0,
  );
  const debrisSide = seeded(i + 603) > 0.5 ? -1 : 1;
  debris.userData = {
    start: 2.18 + seeded(i + 601) * 0.68,
    life: 1.4 + seeded(i + 602) * 1.35,
    x: debrisSide * (0.62 + seeded(i + 611) * 2.05),
    y: 0.1 + seeded(i + 604) * 1.2,
    z: -5.5 + seeded(i + 605) * 9,
    vx: (seeded(i + 606) - 0.5) * 4.8,
    vy: 3.1 + seeded(i + 607) * 6.5,
    vz: 4.2 + seeded(i + 608) * 8.5,
    spinX: 2 + seeded(i + 609) * 7,
    spinY: 2 + seeded(i + 610) * 8,
  };
  scene.add(debris);
  flyingDebris.push(debris);
}

const viewModel = new THREE.Group();
camera.add(viewModel);
scene.add(camera);
const foregroundStoneMaterial = stoneLightMaterial.clone();
foregroundStoneMaterial.depthTest = false;
const foregroundRails = [];
for (const side of [-1, 1]) {
  const rail = makeBox(
    viewModel,
    new THREE.Vector3(0.18, 0.18, 1.45),
    new THREE.Vector3(side * 0.8, -0.34, -1.55),
    foregroundStoneMaterial,
  );
  rail.renderOrder = 998;
  foregroundRails.push(rail);
}
const sleeveMaterial = new THREE.MeshStandardMaterial({
  color: 0x4b2c25,
  roughness: 0.9,
  emissive: 0x100604,
  emissiveIntensity: 0.45,
  depthTest: false,
});
const handMaterial = new THREE.MeshStandardMaterial({
  color: 0xaa7052,
  roughness: 0.78,
  emissive: 0x170806,
  emissiveIntensity: 0.32,
  depthTest: false,
});
const handGroups = [];
for (const side of [-1, 1]) {
  const hand = new THREE.Group();
  viewModel.add(hand);
  const sleeve = makeCylinder(
    hand,
    0.14,
    0.23,
    0.95,
    new THREE.Vector3(side * 0.13, -0.35, 0.32),
    sleeveMaterial,
    8,
  );
  sleeve.rotation.z = side * -0.48;
  sleeve.rotation.x = -0.15;
  const palm = makeSphere(
    hand,
    0.22,
    new THREE.Vector3(side * 0.31, 0.02, -0.05),
    handMaterial,
    new THREE.Vector3(1.0, 0.62, 1.32),
    1,
  );
  palm.rotation.z = side * 0.25;
  for (let i = 0; i < 4; i += 1) {
    const finger = makeCylinder(
      hand,
      0.034,
      0.044,
      0.34,
      new THREE.Vector3(side * (0.24 + i * 0.045), -0.07 + i * 0.035, -0.19),
      handMaterial,
      7,
    );
    finger.rotation.x = 1.12;
    finger.rotation.z = side * (0.35 + i * 0.05);
    finger.renderOrder = 1002;
  }
  sleeve.renderOrder = 1000;
  palm.renderOrder = 1001;
  hand.userData.side = side;
  handGroups.push(hand);
}

const ambient = new THREE.HemisphereLight(0x35415b, 0x210700, 0.92);
scene.add(ambient);
const fireLight = new THREE.PointLight(0xff3f0b, 37, 34, 1.55);
fireLight.position.set(0, 4.3, -16);
scene.add(fireLight);
const bridgeLight = new THREE.PointLight(0xff8a2b, 8.5, 20, 2);
bridgeLight.position.set(0, 2.5, -5.5);
scene.add(bridgeLight);
const balrogFaceLight = new THREE.PointLight(0xff5418, 9.5, 10, 2);
balrogFaceLight.position.set(0, 6.2, -15.5);
scene.add(balrogFaceLight);
const rimLight = new THREE.DirectionalLight(0x586b8f, 1.2);
rimLight.position.set(-4, 8, 9);
scene.add(rimLight);
const povLight = new THREE.PointLight(0x9eb3d2, 3.2, 8.5, 2);
povLight.position.set(0, 0.15, 0.45);
camera.add(povLight);

const tmpStart = new THREE.Vector3();
const tmpEnd = new THREE.Vector3();
const whipCurve = new THREE.CubicBezierCurve3(
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
  new THREE.Vector3(),
);

function updateScene(rawTime) { window.__bfTrace?.add(832);
  const t = Math.max(0, Math.min(DURATION, Number(rawTime) || 0));
  const strike = pulse(1.85, 2.62, 3.55, t);
  const quake = pulse(1.7, 2.7, 4.3, t);
  const runEase = smoothstep(0, 4.7, t);
  const cameraZ = 10.7 - 5.95 * runEase;
  const runCycle = t * 10.6;
  const shakeX = quake * (Math.sin(t * 41) * 0.105 + Math.sin(t * 67) * 0.045);
  const shakeY = quake * (Math.sin(t * 52 + 1.2) * 0.095);
  camera.position.set(
    Math.sin(runCycle * 0.5) * 0.05 + shakeX,
    2.25 + Math.sin(runCycle) * 0.065 + shakeY,
    cameraZ,
  );
  camera.fov = 61 - runEase * 3 + pulse(2.25, 2.68, 3.05, t) * 1.4;
  camera.updateProjectionMatrix();
  camera.lookAt(
    0.05 + quake * Math.sin(t * 31) * 0.16,
    3.85 + quake * Math.sin(t * 37) * 0.11,
    -14.5,
  );
  camera.rotateZ(
    Math.sin(runCycle * 0.5) * 0.008
      + quake * (Math.sin(t * 35) * 0.015 + Math.sin(t * 71) * 0.008),
  );

  bridgeShake.position.set(
    quake * Math.sin(t * 45) * 0.085,
    quake * Math.sin(t * 57 + 0.8) * 0.06,
    0,
  );
  bridgeShake.rotation.z = quake * Math.sin(t * 39) * 0.008;
  bridgeShake.rotation.x = quake * Math.sin(t * 31) * 0.006;

  for (let i = 0; i < fellowship.length; i += 1) {
    const runner = fellowship[i];
    const spec = runner.userData.spec;
    const cycle = t * 8.4 + spec.phase;
    runner.position.set(
      spec.x + Math.sin(t * 1.7 + spec.phase) * 0.12,
      0.08 + Math.abs(Math.sin(cycle)) * 0.08,
      spec.z - t * (0.52 + i * 0.035),
    );
    runner.rotation.z = Math.sin(cycle) * 0.025;
    for (const limb of runner.userData.limbs) {
      const swing = Math.sin(cycle + (limb.side > 0 ? 0 : Math.PI));
      limb.arm.rotation.x = swing * 0.76;
      limb.arm.rotation.z = limb.side * -0.16;
      limb.leg.rotation.x = -swing * 0.7;
      limb.leg.rotation.z = limb.side * 0.08;
    }
  }

  gandalf.rotation.z = quake * Math.sin(t * 25) * 0.009;
  gandalf.position.y = 0.05 + quake * Math.sin(t * 47) * 0.025;
  const ward = smoothstep(1.45, 2.55, t);
  staff.rotation.z = -0.12 - ward * 0.29;
  staffGem.scale.setScalar(0.9 + ward * 0.48 + Math.sin(t * 18) * 0.05);
  staffLight.intensity = 2.5 + ward * 4.2 + Math.sin(t * 14) * 0.35;

  const wingSpread = 0.78 + smoothstep(0.25, 1.75, t) * 0.26 + strike * 0.07;
  balrog.scale.set(wingSpread, 1 + Math.sin(t * 2.2) * 0.018, 1);
  balrog.position.y = Math.sin(t * 2.4) * 0.09;
  balrog.rotation.z = Math.sin(t * 1.6) * 0.012;
  balrog.userData['arm-1'].rotation.x = 0.1 + strike * 0.28;
  balrog.userData['arm-1'].rotation.z = -0.38 + strike * 0.43;
  balrog.userData.arm1.rotation.x = -0.08 - strike * 0.18;
  balrog.userData.arm1.rotation.z = 0.38 + strike * 0.14;
  fireLight.intensity = 32 + Math.sin(t * 16) * 4 + strike * 14;
  fireLight.position.x = Math.sin(t * 4.2) * 0.65;

  for (let i = 0; i < fireField.length; i += 1) {
    const flame = fireField[i];
    const flicker = 0.72 + Math.sin(t * (8 + (i % 5)) + flame.userData.seed) * 0.2;
    flame.scale.set(
      flame.userData.baseScale * (0.83 + flicker * 0.22),
      flame.userData.baseScale * flicker * (1 + strike * 0.24),
      flame.userData.baseScale * (0.83 + flicker * 0.22),
    );
    flame.position.y = flame.userData.baseY + Math.sin(t * 9 + flame.userData.seed) * 0.12;
    flame.rotation.y = t * (0.4 + (i % 4) * 0.2) + flame.userData.seed;
  }
  for (let i = 0; i < balrogFlames.length; i += 1) {
    const flame = balrogFlames[i];
    const flicker = 0.76 + Math.sin(t * (10 + (i % 4)) + flame.userData.seed) * 0.22;
    flame.scale.set(
      flame.userData.baseScale * (0.85 + flicker * 0.15),
      flame.userData.baseScale * flicker * (1 + strike * 0.2),
      flame.userData.baseScale,
    );
  }
  for (let i = 0; i < wingEdgeFlames.length; i += 1) {
    const flame = wingEdgeFlames[i];
    const flicker = 0.7 + Math.sin(t * (11 + (i % 5)) + flame.userData.seed) * 0.24;
    flame.scale.set(
      flame.userData.baseScale,
      flame.userData.baseScale * flicker * (1 + strike * 0.25),
      flame.userData.baseScale,
    );
  }

  let extent = 0.06;
  if (t >= 1.48 && t < 2.62) extent = 0.06 + smoothstep(1.48, 2.62, t) * 0.94;
  if (t >= 2.62) extent = 1 - smoothstep(2.62, 3.55, t) * 0.82;
  whipCurve.v0.set(-2.65, 4.25, -16.1);
  whipCurve.v1.set(3.3, 9.1 + strike * 0.8, -12.5);
  whipCurve.v2.set(9.8, 7.1 - strike * 1.6, -4.4);
  whipCurve.v3.set(3.45, 2.65, cameraZ - 0.95);
  for (let i = 0; i < whipCount; i += 1) {
    const u = i / (whipCount - 1);
    const visible = u <= extent;
    const node = whipNodes[i];
    node.visible = visible;
    if (!visible) {
      if (i > 0) whipLinks[i - 1].visible = false;
      continue;
    }
    whipCurve.getPoint(u, tmpEnd);
    tmpEnd.y += Math.sin(u * Math.PI * 5 - t * 11) * (0.12 + strike * 0.2) * u;
    node.position.copy(tmpEnd);
    const flare = 1 + pulse(2.45, 2.68, 2.96, t) * u * 1.5;
    node.scale.setScalar(flare);
    if (i > 0) {
      const link = whipLinks[i - 1];
      link.visible = true;
      tmpStart.copy(whipNodes[i - 1].position);
      placeBetween(link, tmpStart, tmpEnd, 1);
    }
  }

  for (const spark of sparks) {
    const data = spark.userData;
    const age = t - data.start;
    const lifeProgress = age / data.life;
    spark.visible = age >= 0 && lifeProgress <= 1;
    if (!spark.visible) continue;
    spark.position.set(
      data.x + data.vx * age,
      data.y + data.vy * age - 2.35 * age * age,
      data.z + data.vz * age,
    );
    spark.rotation.y = data.spin * age;
    spark.rotation.z = Math.atan2(data.vx, data.vz);
    spark.material.opacity = 1 - clamp01(lifeProgress) * 0.72;
    const scale = 0.45 + (1 - lifeProgress) * 0.75;
    spark.scale.set(scale, 0.55 + data.vz * 0.035, scale);
  }

  for (const debris of flyingDebris) {
    const data = debris.userData;
    const age = t - data.start;
    const lifeProgress = age / data.life;
    debris.visible = age >= 0 && lifeProgress <= 1;
    if (!debris.visible) continue;
    debris.position.set(
      data.x + data.vx * age,
      data.y + data.vy * age - 4.9 * age * age,
      data.z + data.vz * age,
    );
    debris.rotation.set(data.spinX * age, data.spinY * age, data.spinX * age * 0.6);
  }

  const grab = smoothstep(0.42, 1.05, t);
  for (const hand of handGroups) {
    const side = hand.userData.side;
    const runningX = side * 0.58 + Math.sin(runCycle + side) * 0.06;
    const runningY = -0.62 + Math.sin(runCycle + (side > 0 ? Math.PI : 0)) * 0.11;
    const gripX = side * 0.8;
    const gripY = -0.38;
    hand.position.set(
      THREE.MathUtils.lerp(runningX, gripX, grab),
      THREE.MathUtils.lerp(runningY, gripY, grab) + quake * Math.sin(t * 49 + side) * 0.025,
      THREE.MathUtils.lerp(-1.02, -1.25, grab),
    );
    hand.rotation.set(
      -0.05 + grab * 0.18,
      side * (-0.08 + grab * 0.16),
      side * THREE.MathUtils.lerp(-0.12, -0.29, grab),
    );
  }

  renderer.render(scene, camera);
  window.__currentReconstructionTime = t;
}

let paused = false;
let startTime = performance.now();
let pausedAt = 0;

function animate(now) { window.__bfTrace?.add(1021);
  requestAnimationFrame(animate);
  if (paused) return;
  const t = ((now - startTime) / 1000) % DURATION;
  pausedAt = t;
  updateScene(t);
}

window.reconstruction = {
  pause() {
    paused = true;
    return pausedAt;
  },
  seek(seconds) {
    paused = true;
    pausedAt = Math.max(0, Math.min(DURATION, Number(seconds) || 0));
    updateScene(pausedAt);
    return pausedAt;
  },
  getTime() {
    return window.__currentReconstructionTime;
  },
};

updateScene(0);
window.__sceneReady = true;
requestAnimationFrame(animate);
