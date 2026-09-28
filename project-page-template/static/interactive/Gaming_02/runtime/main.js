import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 5;

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x70c8f3);
scene.fog = new THREE.Fog(0x8acff0, 115, 275);

const camera = new THREE.PerspectiveCamera(72, WIDTH / HEIGHT, 0.08, 420);
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xd9f5ff, 0x526d37, 1.8);
scene.add(hemi);

const sunLight = new THREE.DirectionalLight(0xfff1c9, 3);
sunLight.position.set(-65, 105, 35);
scene.add(sunLight);

const fillLight = new THREE.PointLight(0xffd49c, 1.7, 8);
fillLight.position.set(0, 0.2, -0.5);
camera.add(fillLight);

const saturate = (value) => Math.min(1, Math.max(0, value));
const lerp = (a, b, t) => a + (b - a) * t;
const smoothstep = (a, b, value) => {
  const t = saturate((value - a) / (b - a));
  return t * t * (3 - 2 * t);
};
const easeOutCubic = (t) => 1 - (1 - t) ** 3;
const hash = (n) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function terrainHeight(x, z) { window.__bfTrace?.add(50);
  const broad = Math.sin(x * 0.043) * 1.25 + Math.cos(z * 0.035) * 1.05;
  const detail = Math.sin((x + z) * 0.09) * 0.45;
  const distantRise = 4.5 * smoothstep(-125, -205, z);
  return broad + detail + distantRise;
}

function riverX(z) { window.__bfTrace?.add(57);
  return -7 + Math.sin((z + 30) * 0.047) * 14 + Math.sin((z - 15) * 0.018) * 7;
}

function makeTerrain() { window.__bfTrace?.add(61);
  const columns = 42;
  const rows = 50;
  const positions = [];
  const colors = [];
  const indices = [];
  const color = new THREE.Color();

  for (let row = 0; row <= rows; row += 1) {
    const z = lerp(38, -220, row / rows);
    for (let column = 0; column <= columns; column += 1) {
      const x = lerp(-125, 125, column / columns);
      const y = terrainHeight(x, z);
      positions.push(x, y, z);

      const dry = hash(row * 83 + column * 19);
      color.setHSL(0.255 + dry * 0.035, 0.48, 0.27 + y * 0.007 + dry * 0.035);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const a = row * (columns + 1) + column;
      const b = a + 1;
      const c = a + columns + 1;
      const d = c + 1;
      if ((row + column) % 2 === 0) {
        indices.push(a, b, c, b, d, c);
      } else {
        indices.push(a, d, c, a, b, d);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.94,
    metalness: 0,
    flatShading: true,
  });
  const terrain = new THREE.Mesh(geometry, material);
  scene.add(terrain);
}

function makeRibbon(width, heightOffset, material) { window.__bfTrace?.add(112);
  const segments = 110;
  const positions = [];
  const indices = [];
  for (let i = 0; i <= segments; i += 1) {
    const z = lerp(34, -218, i / segments);
    const x = riverX(z);
    const zAhead = z - 0.25;
    const tangentX = riverX(zAhead) - x;
    const tangentZ = zAhead - z;
    const length = Math.hypot(tangentX, tangentZ);
    const normalX = -tangentZ / length;
    const normalZ = tangentX / length;
    const halfWidth = width * (0.83 + 0.13 * Math.sin(i * 0.41));
    const y = terrainHeight(x, z) + heightOffset;
    positions.push(
      x + normalX * halfWidth, y, z + normalZ * halfWidth,
      x - normalX * halfWidth, y, z - normalZ * halfWidth,
    );
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, material);
}

function makeRiver() { window.__bfTrace?.add(143);
  const bank = makeRibbon(6.5, 0.18, new THREE.MeshStandardMaterial({
    color: 0xb9a867,
    roughness: 1,
    flatShading: true,
  }));
  scene.add(bank);

  const river = makeRibbon(5.15, 0.36, new THREE.MeshPhysicalMaterial({
    color: 0x1f8ed1,
    emissive: 0x075184,
    emissiveIntensity: 0.2,
    roughness: 0.24,
    metalness: 0.05,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  }));
  river.renderOrder = 2;
  scene.add(river);
}

function makeForests() { window.__bfTrace?.add(165);
  const count = 285;
  const trunkGeometry = new THREE.CylinderGeometry(0.19, 0.28, 1, 5);
  const canopyGeometry = new THREE.ConeGeometry(1, 1, 7);
  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6a482d, roughness: 1 });
  const canopyMaterial = new THREE.MeshStandardMaterial({
    color: 0x146b36,
    roughness: 0.93,
    flatShading: true,
  });
  const trunks = new THREE.InstancedMesh(trunkGeometry, trunkMaterial, count);
  const canopies = new THREE.InstancedMesh(canopyGeometry, canopyMaterial, count);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  let placed = 0;

  for (let i = 0; i < count * 3 && placed < count; i += 1) {
    const z = lerp(28, -205, hash(i * 4 + 1));
    const x = lerp(-112, 112, hash(i * 4 + 2));
    const size = lerp(0.72, 1.65, hash(i * 4 + 3));
    const riverDistance = Math.abs(x - riverX(z));
    const castleDistance = Math.hypot(x - 28, (z + 130) * 0.7);
    const towerDistance = Math.hypot(x, z - 18);
    if (riverDistance < 10 || castleDistance < 18 || towerDistance < 15) continue;

    const y = terrainHeight(x, z);
    position.set(x, y + size * 0.65, z);
    scale.set(size * 0.34, size * 1.3, size * 0.34);
    matrix.compose(position, quaternion, scale);
    trunks.setMatrixAt(placed, matrix);

    position.set(x, y + size * 2.55, z);
    scale.set(size * 1.25, size * 3.2, size * 1.25);
    matrix.compose(position, quaternion, scale);
    canopies.setMatrixAt(placed, matrix);
    placed += 1;
  }
  trunks.count = placed;
  canopies.count = placed;
  scene.add(trunks, canopies);
}

function makeRocks() { window.__bfTrace?.add(209);
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const material = new THREE.MeshStandardMaterial({
    color: 0x708073,
    roughness: 0.96,
    flatShading: true,
  });
  const rocks = new THREE.InstancedMesh(geometry, material, 58);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  for (let i = 0; i < 58; i += 1) {
    const z = lerp(15, -195, hash(900 + i * 4));
    const x = lerp(-110, 110, hash(901 + i * 4));
    const size = lerp(0.6, 2.5, hash(902 + i * 4));
    position.set(x, terrainHeight(x, z) + size * 0.35, z);
    quaternion.setFromEuler(new THREE.Euler(hash(i) * 0.4, hash(i + 33) * 6, 0));
    scale.set(size, size * lerp(0.5, 1.1, hash(i + 66)), size * 0.8);
    matrix.compose(position, quaternion, scale);
    rocks.setMatrixAt(i, matrix);
  }
  scene.add(rocks);
}

function makeMountains() { window.__bfTrace?.add(234);
  const mountainColors = [0x617c8b, 0x748d91, 0x536f7f];
  const peaks = [
    [-105, -194, 34, 58, 24],
    [-74, -210, 40, 70, 25],
    [-36, -205, 30, 51, 21],
    [2, -223, 42, 75, 28],
    [48, -215, 35, 60, 24],
    [88, -202, 43, 76, 28],
    [120, -217, 36, 63, 24],
  ];
  peaks.forEach(([x, z, width, height, depth], index) => {
    const geometry = new THREE.ConeGeometry(1, 1, 5);
    const material = new THREE.MeshStandardMaterial({
      color: mountainColors[index % mountainColors.length],
      roughness: 1,
      flatShading: true,
    });
    const mountain = new THREE.Mesh(geometry, material);
    mountain.position.set(x, terrainHeight(x, z) + height * 0.5 - 2, z);
    mountain.scale.set(width, height, depth);
    mountain.rotation.y = hash(index + 400) * Math.PI;
    scene.add(mountain);

    if (height > 60) {
      const snow = new THREE.Mesh(
        new THREE.ConeGeometry(1, 1, 5),
        new THREE.MeshStandardMaterial({ color: 0xd9edf0, roughness: 0.9, flatShading: true }),
      );
      snow.position.set(x, terrainHeight(x, z) + height * 0.79, z);
      snow.scale.set(width * 0.35, height * 0.28, depth * 0.36);
      snow.rotation.y = mountain.rotation.y;
      scene.add(snow);
    }
  });
}

function addCastleTower(parent, x, z, radius, height) { window.__bfTrace?.add(271);
  const stone = new THREE.MeshStandardMaterial({
    color: 0xb2aa91,
    roughness: 0.92,
    flatShading: true,
  });
  const roofMaterial = new THREE.MeshStandardMaterial({
    color: 0x9a3e32,
    roughness: 0.85,
    flatShading: true,
  });
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.1, height, 8), stone);
  tower.position.set(x, height * 0.5, z);
  parent.add(tower);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(radius * 1.45, radius * 1.65, 8), roofMaterial);
  roof.position.set(x, height + radius * 0.75, z);
  parent.add(roof);
}

function makeCastle() { window.__bfTrace?.add(290);
  const castle = new THREE.Group();
  const x = 28;
  const z = -130;
  castle.position.set(x, terrainHeight(x, z) + 2.2, z);

  const plateau = new THREE.Mesh(
    new THREE.CylinderGeometry(15, 18, 4.5, 10),
    new THREE.MeshStandardMaterial({ color: 0x66715e, roughness: 1, flatShading: true }),
  );
  plateau.position.y = -0.5;
  castle.add(plateau);

  const wallMaterial = new THREE.MeshStandardMaterial({ color: 0xbab39a, roughness: 0.95 });
  const frontWall = new THREE.Mesh(new THREE.BoxGeometry(24, 5.5, 2.2), wallMaterial);
  frontWall.position.set(0, 3.2, 8);
  castle.add(frontWall);
  const sideWallLeft = new THREE.Mesh(new THREE.BoxGeometry(2.2, 5.5, 17), wallMaterial);
  sideWallLeft.position.set(-11, 3.2, 0);
  castle.add(sideWallLeft);
  const sideWallRight = sideWallLeft.clone();
  sideWallRight.position.x = 11;
  castle.add(sideWallRight);

  addCastleTower(castle, -11, 8, 2.6, 10);
  addCastleTower(castle, 11, 8, 2.6, 10);
  addCastleTower(castle, -9, -6, 2.3, 13);
  addCastleTower(castle, 9, -6, 2.3, 12);

  const keep = new THREE.Mesh(new THREE.BoxGeometry(11, 16, 10), wallMaterial);
  keep.position.set(0, 10, -1);
  castle.add(keep);
  addCastleTower(castle, 0, -1, 4.1, 23);

  const spire = new THREE.Mesh(
    new THREE.ConeGeometry(2.2, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x913b31, roughness: 0.82 }),
  );
  spire.position.set(0, 29, -1);
  castle.add(spire);

  const beacon = new THREE.Mesh(
    new THREE.TorusGeometry(6.4, 0.32, 8, 28),
    new THREE.MeshBasicMaterial({ color: 0xd04c9f, transparent: true, opacity: 0.72 }),
  );
  beacon.position.set(0, 15, -1);
  beacon.rotation.x = Math.PI / 2;
  castle.add(beacon);

  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0xffd56f });
  [-3.1, 0, 3.1].forEach((windowX, index) => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.3, 0.12), windowMaterial);
    window.position.set(windowX, 10.5 + (index % 2) * 3.2, 4.06);
    castle.add(window);
  });
  const highWindow = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.45, 0.12), windowMaterial);
  highWindow.position.set(0, 20.5, 3.14);
  castle.add(highWindow);

  scene.add(castle);
}

function makeTower() { window.__bfTrace?.add(352);
  const tower = new THREE.Group();
  tower.position.z = 18;
  const stone = new THREE.MeshStandardMaterial({
    color: 0x31434b,
    roughness: 0.86,
    metalness: 0.05,
    flatShading: true,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: 0x758079,
    roughness: 0.82,
    flatShading: true,
  });
  const glow = new THREE.MeshBasicMaterial({ color: 0x2be4f1 });

  const column = new THREE.Mesh(new THREE.CylinderGeometry(3.8, 6.3, 48, 12, 8), stone);
  column.position.y = 24;
  tower.add(column);

  for (let y = 7; y < 44; y += 8) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(4.3 + y * 0.02, 0.22, 6, 28), glow);
    ring.position.y = y;
    ring.rotation.x = Math.PI / 2;
    tower.add(ring);
  }

  const capital = new THREE.Mesh(new THREE.CylinderGeometry(7.8, 4.4, 2.5, 16), trim);
  capital.position.y = 47.8;
  tower.add(capital);
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(8.6, 8.1, 1.05, 20), stone);
  platform.position.y = 49.25;
  tower.add(platform);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(8.45, 0.34, 8, 40), glow);
  rim.position.y = 49.78;
  rim.rotation.x = Math.PI / 2;
  tower.add(rim);

  const floorSeal = new THREE.Mesh(new THREE.TorusGeometry(2.15, 0.13, 6, 32), glow);
  floorSeal.position.y = 49.82;
  floorSeal.rotation.x = Math.PI / 2;
  tower.add(floorSeal);
  for (let i = 0; i < 8; i += 1) {
    const angle = (i / 8) * Math.PI * 2;
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.05, 5.7), glow);
    spoke.position.set(Math.sin(angle) * 4.8, 49.82, Math.cos(angle) * 4.8);
    spoke.rotation.y = angle;
    tower.add(spoke);
  }

  const eyeOuter = new THREE.Mesh(new THREE.TorusGeometry(1.25, 0.19, 6, 24), glow);
  eyeOuter.position.set(0, 45.2, -4.2);
  eyeOuter.rotation.x = Math.PI / 2;
  tower.add(eyeOuter);
  const eyePupil = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 8), glow);
  eyePupil.position.set(0, 45.1, -4.48);
  tower.add(eyePupil);
  scene.add(tower);
}

function makeClouds() { window.__bfTrace?.add(412);
  const material = new THREE.MeshBasicMaterial({
    color: 0xf4fcff,
    transparent: true,
    opacity: 0.72,
    depthWrite: false,
  });
  const cloudSpecs = [
    [-72, 55, -145, 1.2],
    [73, 62, -168, 1.5],
    [-42, 72, -225, 1.8],
    [105, 44, -112, 0.9],
    [25, 78, -250, 1.4],
  ];
  cloudSpecs.forEach(([x, y, z, scale], cloudIndex) => {
    const cloud = new THREE.Group();
    for (let i = 0; i < 6; i += 1) {
      const puff = new THREE.Mesh(new THREE.SphereGeometry(3.6, 10, 7), material);
      puff.position.set((i - 2.5) * 4.2, Math.sin(i * 1.8 + cloudIndex) * 1.4, hash(i + cloudIndex * 13) * 2);
      puff.scale.set(1.5, 0.62 + hash(i + 44) * 0.22, 0.75);
      cloud.add(puff);
    }
    cloud.position.set(x, y, z);
    cloud.scale.setScalar(scale);
    scene.add(cloud);
  });

  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(6, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff2b3, fog: false }),
  );
  sun.position.set(-88, 93, -190);
  scene.add(sun);
}

function makeTube(material, radius = 0.04) { window.__bfTrace?.add(447);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 8), material);
  return mesh;
}

function setTube(mesh, start, end) { window.__bfTrace?.add(452);
  const delta = new THREE.Vector3().subVectors(end, start);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.scale.set(1, delta.length(), 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
}

const foreground = new THREE.Group();
camera.add(foreground);

const sleeveMaterial = new THREE.MeshStandardMaterial({ color: 0x366e8b, roughness: 0.8 });
const bracerMaterial = new THREE.MeshStandardMaterial({ color: 0x4d3429, roughness: 0.9 });
const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xe2a378, roughness: 0.82 });
const ropeMaterial = new THREE.MeshBasicMaterial({ color: 0xf4e2b8 });
const woodMaterial = new THREE.MeshStandardMaterial({ color: 0x6f4327, roughness: 0.86 });

function makeHand(side) { window.__bfTrace?.add(468);
  const group = new THREE.Group();
  foreground.add(group);
  const sleeve = makeTube(sleeveMaterial, 0.18);
  const forearm = makeTube(skinMaterial, 0.14);
  const bracer = makeTube(bracerMaterial, 0.2);
  const palm = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), skinMaterial);
  palm.scale.set(1.05, 1.25, 0.58);
  const thumb = makeTube(skinMaterial, 0.055);
  const fingers = [];
  for (let i = 0; i < 4; i += 1) {
    const finger = makeTube(skinMaterial, 0.045);
    group.add(finger);
    fingers.push(finger);
  }
  group.add(sleeve, forearm, bracer, palm, thumb);
  return { side, group, sleeve, forearm, bracer, palm, thumb, fingers };
}

const leftHand = makeHand(-1);
const rightHand = makeHand(1);

const glider = new THREE.Group();
foreground.add(glider);
const canopyMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x9b5d2f, roughness: 0.9, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ color: 0xd09a45, roughness: 0.86, side: THREE.DoubleSide }),
  new THREE.MeshStandardMaterial({ color: 0x2c6071, roughness: 0.82, side: THREE.DoubleSide }),
];
const panelCount = 8;
for (let i = 0; i < panelCount; i += 1) {
  const x0 = lerp(-2.25, 2.25, i / panelCount);
  const x1 = lerp(-2.25, 2.25, (i + 1) / panelCount);
  const upper0 = 1.1 + 0.62 * (1 - (x0 / 2.25) ** 2);
  const upper1 = 1.1 + 0.62 * (1 - (x1 / 2.25) ** 2);
  const lower0 = 0.58 + 0.22 * (1 - (x0 / 2.25) ** 2);
  const lower1 = 0.58 + 0.22 * (1 - (x1 / 2.25) ** 2);
  const z0 = -0.1 * (x0 / 2.25) ** 2;
  const z1 = -0.1 * (x1 / 2.25) ** 2;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    x0, lower0, z0,
    x1, lower1, z1,
    x0, upper0, z0 - 0.08,
    x1, upper1, z1 - 0.08,
  ], 3));
  geometry.setIndex([0, 1, 2, 1, 3, 2]);
  geometry.computeVertexNormals();
  const materialIndex = i === 3 || i === 4 ? 2 : i % 2;
  glider.add(new THREE.Mesh(geometry, canopyMaterials[materialIndex]));
}

const canopyRim = makeTube(woodMaterial, 0.055);
setTube(canopyRim, new THREE.Vector3(-2.25, 0.58, 0), new THREE.Vector3(2.25, 0.58, 0));
glider.add(canopyRim);

const gliderEye = new THREE.Group();
const eyeRing = new THREE.Mesh(new THREE.TorusGeometry(0.25, 0.045, 6, 20), ropeMaterial);
eyeRing.scale.y = 0.6;
gliderEye.add(eyeRing);
const eyeDot = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 6), ropeMaterial);
eyeDot.position.z = 0.02;
gliderEye.add(eyeDot);
gliderEye.position.set(0, 1.13, 0.04);
glider.add(gliderEye);

const crossbar = makeTube(woodMaterial, 0.075);
foreground.add(crossbar);
const ropes = [makeTube(ropeMaterial, 0.018), makeTube(ropeMaterial, 0.018)];
foreground.add(...ropes);

const windMaterial = new THREE.MeshBasicMaterial({
  color: 0xd8f7ff,
  transparent: true,
  opacity: 0,
  depthWrite: false,
});
const windStreaks = [];
for (let i = 0; i < 18; i += 1) {
  const streak = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.024, 1, 5), windMaterial.clone());
  streak.rotation.x = Math.PI / 2;
  foreground.add(streak);
  windStreaks.push(streak);
}

function updateHand(hand, time, deploy) { window.__bfTrace?.add(553);
  const side = hand.side;
  const reach = smoothstep(0.35, 1.2, time);
  const grip = smoothstep(1.28, 1.78, time);
  const shoulder = new THREE.Vector3(side * 1.16, -1.28, -0.72);
  const openPalm = new THREE.Vector3(
    side * lerp(1.03, 0.78, reach),
    lerp(-1.5, -0.46, reach),
    lerp(-1.05, -2.05, reach),
  );
  const gripPalm = new THREE.Vector3(side * 0.72, -0.54, -1.74);
  const palm = openPalm.lerp(gripPalm, grip);
  const wrist = new THREE.Vector3().lerpVectors(shoulder, palm, 0.72);

  setTube(hand.sleeve, shoulder, wrist);
  setTube(hand.bracer, wrist.clone().lerp(palm, 0.05), wrist.clone().lerp(palm, 0.46));
  setTube(hand.forearm, wrist.clone().lerp(palm, 0.42), palm);
  hand.palm.position.copy(palm);
  hand.palm.rotation.set(0.15 + grip * 0.7, side * -0.28, side * (0.45 - grip * 0.36));

  const spread = lerp(0.12, 0.055, grip);
  hand.fingers.forEach((finger, index) => {
    const offset = (index - 1.5) * spread;
    const start = palm.clone().add(new THREE.Vector3(
      side * (0.05 + index * 0.018),
      0.08 - index * 0.012,
      -0.06,
    ));
    const openEnd = start.clone().add(new THREE.Vector3(side * offset * 0.5, 0.19, -0.12));
    const closedEnd = start.clone().add(new THREE.Vector3(side * 0.02, 0.03, -0.18));
    setTube(finger, start, openEnd.lerp(closedEnd, grip));
  });
  const thumbStart = palm.clone().add(new THREE.Vector3(-side * 0.13, -0.01, -0.02));
  const thumbEnd = thumbStart.clone().add(new THREE.Vector3(-side * 0.12, 0.1 - grip * 0.08, -0.08));
  setTube(hand.thumb, thumbStart, thumbEnd);
  hand.group.visible = time > 0.3;

  const ropeAnchor = new THREE.Vector3(side * 1.72 * deploy, lerp(0.2, 0.73, deploy), -2.76);
  setTube(ropes[side < 0 ? 0 : 1], ropeAnchor, palm.clone().add(new THREE.Vector3(0, 0.08, -0.02)));
}

function updateForeground(time) { window.__bfTrace?.add(594);
  const deploy = smoothstep(1.28, 1.82, time);
  glider.visible = time >= 1.22;
  glider.position.set(0, lerp(-0.2, 0.32, deploy), -2.78);
  glider.scale.set(lerp(0.08, 1, deploy), lerp(0.03, 1, deploy), 1);
  glider.rotation.z = Math.sin((time - 1.7) * 2.1) * 0.025 * deploy;

  updateHand(leftHand, time, deploy);
  updateHand(rightHand, time, deploy);

  const barLeft = new THREE.Vector3(-0.78, -0.46, -1.8);
  const barRight = new THREE.Vector3(0.78, -0.46, -1.8);
  setTube(crossbar, barLeft, barRight);
  crossbar.visible = deploy > 0.42;
  ropes.forEach((rope) => {
    rope.visible = deploy > 0.08;
  });

  const freefall = smoothstep(0.72, 1.02, time) * (1 - smoothstep(1.68, 2.02, time));
  const glide = smoothstep(1.8, 2.35, time) * 0.36;
  const speed = freefall + glide;
  windStreaks.forEach((streak, index) => {
    const cycle = (time * (2.7 + freefall * 4.5) + hash(index + 18) * 3.5) % 1;
    const edge = index % 2 === 0 ? -1 : 1;
    streak.position.set(
      edge * lerp(0.8, 2.7, hash(index + 70)),
      lerp(-1.25, 1.1, hash(index + 90)),
      lerp(-1.5, -10, cycle),
    );
    streak.scale.y = lerp(0.4, 2.3, speed);
    streak.material.opacity = speed * lerp(0.22, 0.62, hash(index + 120));
    streak.visible = speed > 0.05;
  });
}

function updateCamera(time) { window.__bfTrace?.add(629);
  const position = new THREE.Vector3();
  const target = new THREE.Vector3();
  let bank = 0;

  if (time < 0.78) {
    const breathe = Math.sin(time * Math.PI * 2.1);
    position.set(breathe * 0.07, 52.15 + breathe * 0.06, 13.1);
    target.set(0, 9.5, -122);
  } else if (time < 1.68) {
    const u = saturate((time - 0.78) / 0.9);
    const fall = u ** 1.4;
    position.set(Math.sin(u * Math.PI) * -0.75, lerp(52.15, 28.4, fall), lerp(13.1, -17, u));
    target.copy(position).add(new THREE.Vector3(
      Math.sin(u * Math.PI * 1.4) * 2,
      lerp(-18, -32, smoothstep(0.1, 0.8, u)),
      -52,
    ));
    bank = Math.sin(u * Math.PI * 2) * 0.028;
  } else if (time < 2.18) {
    const u = saturate((time - 1.68) / 0.5);
    const caught = easeOutCubic(u);
    position.set(
      lerp(-0.75, riverX(-27) * 0.2, caught),
      lerp(28.4, 29.3, caught) + Math.sin(u * Math.PI) * 1.45,
      lerp(-17, -27, caught),
    );
    target.copy(position).add(new THREE.Vector3(
      lerp(0, 3.5, caught),
      lerp(-31, -8.5, caught),
      -55,
    ));
    bank = Math.sin(u * Math.PI) * -0.045;
  } else {
    const u = saturate((time - 2.18) / (DURATION - 2.18));
    const z = lerp(-27, -103, u);
    const x = riverX(z) * 0.42 + Math.sin(u * Math.PI * 1.3) * 1.8;
    position.set(x, lerp(29.3, 21.5, u) + Math.sin(u * Math.PI * 2.3) * 0.55, z);
    const lookZ = z - 58;
    target.set(
      lerp(riverX(lookZ) * 0.35, 18, smoothstep(0.35, 1, u)),
      lerp(8, 10.5, u),
      lookZ,
    );
    bank = Math.sin(u * Math.PI * 2.25) * 0.045;
  }

  camera.position.copy(position);
  camera.lookAt(target);
  camera.rotateZ(bank);
  camera.updateMatrixWorld(true);
  return { position, target, bank };
}

function setSceneTime(rawTime) { window.__bfTrace?.add(683);
  const time = Math.min(DURATION, Math.max(0, Number(rawTime) || 0));
  const cameraState = updateCamera(time);
  updateForeground(time);
  renderer.render(scene, camera);
  window.__sceneState = {
    time,
    camera: cameraState.position.toArray().map((value) => Number(value.toFixed(6))),
    target: cameraState.target.toArray().map((value) => Number(value.toFixed(6))),
    bank: Number(cameraState.bank.toFixed(6)),
    gliderScale: glider.scale.toArray().map((value) => Number(value.toFixed(6))),
    gliderVisible: glider.visible,
    leftPalm: leftHand.palm.position.toArray().map((value) => Number(value.toFixed(6))),
  };
  return window.__sceneState;
}

makeTerrain();
makeRiver();
makeForests();
makeRocks();
makeMountains();
makeCastle();
makeTower();
makeClouds();

let paused = false;
let startTime = performance.now();
let pausedAt = 0;

function animate(now) { window.__bfTrace?.add(713);
  if (!paused) {
    const time = ((now - startTime) / 1000) % DURATION;
    setSceneTime(time);
    requestAnimationFrame(animate);
  }
}

window.reconstruction = {
  pause() {
    if (!paused) {
      pausedAt = window.__sceneState?.time ?? 0;
      paused = true;
    }
    return pausedAt;
  },
  seek(seconds) {
    paused = true;
    pausedAt = Math.min(DURATION, Math.max(0, Number(seconds) || 0));
    return setSceneTime(pausedAt);
  },
};

setSceneTime(0);
requestAnimationFrame(animate);
