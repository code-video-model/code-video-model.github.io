import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 8;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x91c5e8);
scene.fog = new THREE.Fog(0x91c5e8, 145, 440);

const camera = new THREE.PerspectiveCamera(69, WIDTH / HEIGHT, 0.05, 700);
scene.add(camera);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
document.body.appendChild(renderer.domElement);

const hemi = new THREE.HemisphereLight(0xd8efff, 0x4a5260, 2.3);
scene.add(hemi);

const sun = new THREE.DirectionalLight(0xfff0d0, 4.2);
sun.position.set(-85, 170, 80);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -90;
sun.shadow.camera.right = 90;
sun.shadow.camera.top = 110;
sun.shadow.camera.bottom = -110;
sun.shadow.camera.near = 20;
sun.shadow.camera.far = 390;
sun.shadow.bias = -0.00015;
scene.add(sun);

const sunDisc = new THREE.Mesh(
  new THREE.SphereGeometry(8, 24, 12),
  new THREE.MeshBasicMaterial({ color: 0xffe2a0, fog: false }),
);
sunDisc.position.set(-170, 205, -360);
scene.add(sunDisc);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smooth = (a, b, value) => {
  const x = clamp01((value - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const positiveMod = (value, modulus) => ((value % modulus) + modulus) % modulus;

const matte = (color, roughness = 0.72, metalness = 0.04) => (
  new THREE.MeshStandardMaterial({ color, roughness, metalness })
);
const roadMaterial = matte(0x252b32, 0.94);
const sidewalkMaterial = matte(0x8f969a, 0.88);
const curbMaterial = matte(0xb9bdbe, 0.82);
const whitePaint = matte(0xf4f0d7, 0.78);
const yellowPaint = matte(0xe5bc28, 0.76);

const world = new THREE.Group();
scene.add(world);

function addBox(parent, size, position, material, cast = false, receive = false) { window.__bfTrace?.add(70);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

// Street canyon and road markings.
addBox(world, [300, 2, 650], [0, -1.2, -100], matte(0x596167), false, true);
addBox(world, [40, 0.7, 620], [0, -0.45, -105], roadMaterial, false, true);
addBox(world, [6, 0.9, 620], [-23, -0.15, -105], sidewalkMaterial, false, true);
addBox(world, [6, 0.9, 620], [23, -0.15, -105], sidewalkMaterial, false, true);
addBox(world, [0.45, 1.05, 620], [-20.2, -0.05, -105], curbMaterial, false, true);
addBox(world, [0.45, 1.05, 620], [20.2, -0.05, -105], curbMaterial, false, true);

for (let z = 175; z >= -390; z -= 20) {
  addBox(world, [0.22, 0.06, 10], [-6.5, -0.06, z], whitePaint);
  addBox(world, [0.22, 0.06, 10], [6.5, -0.06, z], whitePaint);
}
addBox(world, [0.23, 0.07, 610], [-0.8, -0.05, -105], yellowPaint);
addBox(world, [0.23, 0.07, 610], [0.8, -0.05, -105], yellowPaint);

const crossStreetZ = [96, 28, -40, -108, -176, -244, -312];
for (const z of crossStreetZ) {
  addBox(world, [300, 0.72, 14], [0, -0.42, z], roadMaterial, false, true);
  addBox(world, [126, 0.74, 5], [-83, -0.36, z - 9.5], sidewalkMaterial);
  addBox(world, [126, 0.74, 5], [83, -0.36, z - 9.5], sidewalkMaterial);
}

for (let i = 0; i < 7; i += 1) {
  addBox(world, [36, 0.08, 0.72], [0, 0.01, -250 + i * 1.55], whitePaint);
}
for (let i = 0; i < 10; i += 1) {
  addBox(world, [0.72, 0.08, 13], [-17 + i * 3.7, 0.015, -244], whitePaint);
}

function facadeMaterial(baseColor, glass, floors, columns, seed) { window.__bfTrace?.add(108);
  const base = new THREE.Color(baseColor);
  const lit = glass ? new THREE.Color(0x9adfff) : new THREE.Color(0xffd986);
  return new THREE.ShaderMaterial({
    uniforms: {
      baseColor: { value: base },
      litColor: { value: lit },
      fogColor: { value: scene.fog.color },
      fogNear: { value: scene.fog.near },
      fogFar: { value: scene.fog.far },
      floors: { value: floors },
      columns: { value: columns },
      glassMix: { value: glass ? 1 : 0 },
      seed: { value: seed },
    },
    vertexShader: `
      varying vec2 vUv;
      varying vec3 vNormalWorld;
      varying vec3 vWorldPosition;
      void main() {
        vUv = uv;
        vNormalWorld = normalize(mat3(modelMatrix) * normal);
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 baseColor;
      uniform vec3 litColor;
      uniform vec3 fogColor;
      uniform float fogNear;
      uniform float fogFar;
      uniform float floors;
      uniform float columns;
      uniform float glassMix;
      uniform float seed;
      varying vec2 vUv;
      varying vec3 vNormalWorld;
      varying vec3 vWorldPosition;

      float hash21(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
      }

      void main() {
        vec3 normal = normalize(vNormalWorld);
        float side = 1.0 - smoothstep(0.62, 0.92, abs(normal.y));
        vec2 grid = vec2(columns, floors);
        vec2 cellId = floor(vUv * grid);
        vec2 cell = fract(vUv * grid);
        float frameX = step(0.13, cell.x) * step(cell.x, 0.87);
        float frameY = step(0.16, cell.y) * step(cell.y, 0.78);
        float windowMask = frameX * frameY * side;
        float randomLight = step(0.69, hash21(cellId + vec2(seed, seed * 1.37)));
        vec3 darkWindow = mix(vec3(0.025, 0.055, 0.085), vec3(0.07, 0.20, 0.29), glassMix);
        vec3 windowColor = mix(darkWindow, litColor, randomLight * (0.42 + glassMix * 0.2));
        float sunLight = 0.58 + 0.42 * max(0.0, dot(normal, normalize(vec3(-0.4, 0.82, 0.32))));
        vec3 wall = baseColor * sunLight;
        float reflectionBand = smoothstep(0.15, 0.45, fract(vUv.y * 2.0 + vUv.x * 0.4));
        windowColor += glassMix * vec3(0.12, 0.27, 0.35) * reflectionBand;
        vec3 color = mix(wall, windowColor, windowMask);
        float distanceToCamera = length(cameraPosition - vWorldPosition);
        float fogFactor = smoothstep(fogNear, fogFar, distanceToCamera);
        gl_FragColor = vec4(mix(color, fogColor, fogFactor), 1.0);
      }
    `,
    fog: false,
  });
}

const buildingPalette = [
  0x7f8b95, 0x766f6a, 0xa39a8f, 0x596875, 0x8c786d, 0x6b7884,
];
const buildingCenters = [130, 62, -6, -74, -142, -210, -278, -346];

function addWaterTower(building, height, index) { window.__bfTrace?.add(184);
  const tower = new THREE.Group();
  const wood = matte(0x765744, 0.92);
  const dark = matte(0x393b3e, 0.86, 0.25);
  for (const x of [-1.25, 1.25]) {
    for (const z of [-1.25, 1.25]) {
      addBox(tower, [0.18, 3.4, 0.18], [x, 1.5, z], dark, true);
    }
  }
  const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.3, 2.05, 3.2, 12), wood);
  tank.position.y = 4.2;
  tank.castShadow = true;
  tower.add(tank);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.25, 12), dark);
  roof.position.y = 6.4;
  tower.add(roof);
  tower.position.set(index % 2 ? 4 : -4, height / 2 + 0.5, 2);
  building.add(tower);
}

function createBuilding(x, z, width, depth, height, color, glass, index) { window.__bfTrace?.add(204);
  const group = new THREE.Group();
  group.position.set(x, height / 2, z);
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, depth),
    facadeMaterial(
      color,
      glass,
      Math.max(12, Math.floor(height / 4)),
      Math.max(5, Math.floor(width / 4)),
      index + 1,
    ),
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const trim = glass ? matte(0x8ba9b9, 0.42, 0.56) : matte(0x4c5155, 0.8);
  for (const sx of [-1, 1]) {
    addBox(group, [0.45, height + 0.8, 0.6], [sx * (width / 2 - 0.22), 0, -depth / 2 - 0.05], trim);
  }
  addBox(group, [width + 0.8, 0.8, depth + 0.8], [0, height / 2 + 0.35, 0], trim);

  if (index % 3 === 0 && height > 75) {
    addWaterTower(group, height, index);
  } else {
    addBox(group, [5, 2.8, 5], [index % 2 ? 4 : -4, height / 2 + 1.5, 0], matte(0x62686b));
    if (height > 125) {
      addBox(group, [0.28, 12, 0.28], [0, height / 2 + 7, 0], matte(0x353a3d, 0.55, 0.5));
    }
  }
  world.add(group);
  return group;
}

let buildingIndex = 0;
for (let row = 0; row < buildingCenters.length; row += 1) {
  const z = buildingCenters[row];
  for (const side of [-1, 1]) {
    const nearHeight = 74 + ((row * 41 + (side > 0 ? 31 : 7)) % 92);
    const isHeroGlass = side > 0 && row === 3;
    createBuilding(
      side * 42,
      z,
      34,
      52,
      isHeroGlass ? 178 : nearHeight,
      isHeroGlass ? 0x487d96 : buildingPalette[(row * 2 + (side > 0 ? 1 : 0)) % buildingPalette.length],
      isHeroGlass || (row + (side > 0 ? 1 : 0)) % 4 === 0,
      buildingIndex,
    );
    buildingIndex += 1;

    const outerHeight = 95 + ((row * 53 + (side > 0 ? 17 : 43)) % 115);
    createBuilding(
      side * 79,
      z + (row % 2 ? 5 : -4),
      34,
      50,
      outerHeight,
      buildingPalette[(row + 3) % buildingPalette.length],
      row % 3 === 1,
      buildingIndex,
    );
    buildingIndex += 1;
  }
}

// A few distant silhouettes close gaps at the end of the avenue.
for (let i = 0; i < 9; i += 1) {
  const x = -112 + i * 28;
  const height = 80 + (i * 37) % 120;
  createBuilding(x, -405 - (i % 2) * 24, 24, 32, height, 0x657681, i % 3 === 0, buildingIndex);
  buildingIndex += 1;
}

function createTrafficLight(x, z, rotation = 0) { window.__bfTrace?.add(280);
  const group = new THREE.Group();
  const pole = matte(0x2f3a37, 0.54, 0.55);
  const housing = matte(0x23282a, 0.78);
  addBox(group, [0.25, 7.2, 0.25], [0, 3.5, 0], pole, true);
  addBox(group, [5.5, 0.22, 0.22], [2.6, 6.9, 0], pole, true);
  addBox(group, [0.75, 2.3, 0.8], [5.1, 5.95, 0], housing, true);
  for (let i = 0; i < 3; i += 1) {
    const material = new THREE.MeshStandardMaterial({
      color: i === 0 ? 0xd5271f : (i === 1 ? 0xb08416 : 0x1b5d31),
      emissive: i === 0 ? 0xff2015 : 0x000000,
      emissiveIntensity: i === 0 ? 2.8 : 0,
      roughness: 0.45,
    });
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.22, 14, 8), material);
    light.position.set(5.1, 6.65 - i * 0.7, -0.42);
    group.add(light);
  }
  group.position.set(x, 0, z);
  group.rotation.y = rotation;
  world.add(group);
}

createTrafficLight(-19, -253, 0);
createTrafficLight(19, -235, Math.PI);
createTrafficLight(-19, -117, 0);
createTrafficLight(19, -99, Math.PI);

const movingCars = [];
function createCar(color, taxi, index) { window.__bfTrace?.add(309);
  const car = new THREE.Group();
  const paint = matte(color, 0.43, 0.22);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x234050,
    roughness: 0.18,
    metalness: 0.45,
  });
  addBox(car, [2.2, 0.65, 4.6], [0, 0.75, 0], paint, true);
  addBox(car, [1.75, 0.7, 2.3], [0, 1.38, -0.2], glass, true);
  addBox(car, [1.88, 0.08, 0.18], [0, 1.28, -1.42], matte(0xc5e8ef, 0.3, 0.1));
  for (const x of [-1.05, 1.05]) {
    for (const z of [-1.35, 1.35]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.36, 0.36, 0.22, 16),
        matte(0x121415, 0.94),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(x, 0.5, z);
      car.add(wheel);
    }
  }
  if (taxi) {
    addBox(car, [0.75, 0.28, 0.42], [0, 1.9, 0], matte(0xffdc55), true);
  }
  car.userData.index = index;
  world.add(car);
  movingCars.push(car);
  return car;
}

const carColors = [0xe0a51b, 0x313943, 0x8d1821, 0xe2a817, 0xd7d9d6, 0x244968];
for (let i = 0; i < 16; i += 1) {
  const car = createCar(carColors[i % carColors.length], i % 5 === 0 || i % 5 === 3, i);
  car.userData.lane = i % 2 === 0 ? -10.7 : 10.7;
  car.userData.direction = i % 2 === 0 ? -1 : 1;
  car.userData.base = 165 - i * 33;
  car.rotation.y = car.userData.direction < 0 ? 0 : Math.PI;
}

const crossTraffic = [];
for (let i = 0; i < 5; i += 1) {
  const car = createCar(carColors[(i + 2) % carColors.length], i === 2, 30 + i);
  car.userData.cross = true;
  car.userData.base = -120 + i * 45;
  car.position.z = -176;
  car.rotation.y = -Math.PI / 2;
  crossTraffic.push(car);
}

function createBus() { window.__bfTrace?.add(359);
  const bus = new THREE.Group();
  const yellow = matte(0xf0ad16, 0.48, 0.18);
  const darkYellow = matte(0xc77d08, 0.52, 0.14);
  const glass = new THREE.MeshStandardMaterial({
    color: 0x173b4c,
    roughness: 0.16,
    metalness: 0.5,
    emissive: 0x0a1a20,
    emissiveIntensity: 0.3,
  });
  addBox(bus, [4.4, 3.6, 11.5], [0, 2.1, 0], yellow, true);
  addBox(bus, [4.5, 0.55, 11.7], [0, 0.48, 0], darkYellow, true);
  addBox(bus, [4.47, 0.3, 11.55], [0, 2.25, 0], matte(0x1f2527, 0.6), true);
  addBox(bus, [3.8, 1.55, 0.16], [0, 2.85, -5.83], glass, true);
  addBox(bus, [3.5, 0.25, 0.12], [0, 1.25, -5.92], matte(0x2d3335), true);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i += 1) {
      addBox(bus, [0.12, 1.25, 1.55], [side * 2.24, 2.9, -3.65 + i * 1.85], glass, true);
    }
  }
  for (const side of [-1, 1]) {
    for (const z of [-3.8, 3.8]) {
      const wheel = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.72, 0.5, 20),
        matte(0x111314, 0.95),
      );
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 2.25, 0.62, z);
      wheel.castShadow = true;
      bus.add(wheel);
    }
  }
  const bumper = addBox(bus, [4.55, 0.3, 0.35], [0, 0.55, -5.9], matte(0x3d4142, 0.48, 0.65), true);
  bumper.name = 'frontBumper';
  for (const x of [-1.45, 1.45]) {
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 12, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfff3be,
        emissive: 0xffd36a,
        emissiveIntensity: 2.7,
      }),
    );
    lamp.position.set(x, 1.0, -5.98);
    bus.add(lamp);
  }
  bus.position.set(0, 76, -258);
  world.add(bus);
  return bus;
}

const bus = createBus();

function createHand(side) { window.__bfTrace?.add(413);
  const hand = new THREE.Group();
  const red = matte(0xc41423, 0.48, 0.12);
  const darkRed = matte(0x73101a, 0.6, 0.08);
  const webBlack = matte(0x171b20, 0.68, 0.1);
  const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.145, 0.56, 6, 12), red);
  forearm.rotation.x = Math.PI / 2;
  forearm.position.z = 0.02;
  hand.add(forearm);
  addBox(hand, [0.45, 0.22, 0.5], [0, 0, -0.28], red, true);

  for (let i = 0; i < 4; i += 1) {
    const finger = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, 0.32, 4, 8), red);
    finger.rotation.x = Math.PI / 2;
    finger.position.set((i - 1.5) * 0.115, 0.025, -0.64 - Math.abs(i - 1.5) * 0.025);
    hand.add(finger);
    addBox(hand, [0.025, 0.235, 0.035], [finger.position.x, 0.125, -0.61], webBlack);
  }

  const thumb = new THREE.Mesh(new THREE.CapsuleGeometry(0.065, 0.26, 4, 8), darkRed);
  thumb.rotation.z = Math.PI / 3 * side;
  thumb.position.set(-side * 0.27, -0.01, -0.34);
  hand.add(thumb);

  addBox(hand, [0.5, 0.07, 0.16], [0, -0.135, -0.02], webBlack, true);
  addBox(hand, [0.2, 0.08, 0.19], [0, -0.18, -0.02], matte(0xbccbd1, 0.34, 0.62), true);
  const nozzle = new THREE.Object3D();
  nozzle.position.set(0, -0.17, -0.66);
  hand.add(nozzle);
  hand.userData.nozzle = nozzle;
  camera.add(hand);
  return hand;
}

const leftHand = createHand(-1);
const rightHand = createHand(1);

const streakMaterial = new THREE.LineBasicMaterial({
  color: 0xd9f3ff,
  transparent: true,
  opacity: 0,
  depthTest: false,
  blending: THREE.AdditiveBlending,
});
const streakPositions = [];
for (let i = 0; i < 36; i += 1) {
  const angle = i * 2.399963;
  const radius = 1.1 + (i % 7) * 0.16;
  const x = Math.cos(angle) * radius;
  const y = Math.sin(angle) * radius * 0.56;
  const z = -3.4 - (i % 5) * 0.35;
  streakPositions.push(x, y, z, x * 1.55, y * 1.55, z - 1.7);
}
const streakGeometry = new THREE.BufferGeometry();
streakGeometry.setAttribute('position', new THREE.Float32BufferAttribute(streakPositions, 3));
const streaks = new THREE.LineSegments(streakGeometry, streakMaterial);
streaks.renderOrder = 20;
camera.add(streaks);

const webMaterial = new THREE.MeshBasicMaterial({
  color: 0xe8fbff,
  transparent: true,
  opacity: 0.95,
  fog: false,
  depthTest: false,
  depthWrite: false,
});
const webGlowMaterial = new THREE.MeshBasicMaterial({
  color: 0x83d8ff,
  transparent: true,
  opacity: 0.32,
  fog: false,
  depthTest: false,
  depthWrite: false,
});

function createWebPair() { window.__bfTrace?.add(489);
  const group = new THREE.Group();
  const core = new THREE.Mesh(new THREE.TubeGeometry(
    new THREE.LineCurve3(new THREE.Vector3(), new THREE.Vector3(0, 0, -0.1)),
    2, 0.035, 5, false,
  ), webMaterial);
  const glow = new THREE.Mesh(core.geometry.clone(), webGlowMaterial);
  glow.renderOrder = 14;
  core.renderOrder = 15;
  group.add(glow, core);
  group.visible = false;
  scene.add(group);
  return { group, core, glow };
}

const leftWeb = createWebPair();
const rightWeb = createWebPair();

function updateWeb(web, start, target, growth, sag, active) { window.__bfTrace?.add(507);
  web.group.visible = active && growth > 0.001;
  if (!web.group.visible) return;
  const end = start.clone().lerp(target, clamp01(growth));
  const midpoint = start.clone().lerp(end, 0.5);
  midpoint.y -= sag;
  midpoint.x += (target.x - start.x) * 0.035 * Math.sin(growth * Math.PI);
  const curve = new THREE.QuadraticBezierCurve3(start, midpoint, end);
  web.core.geometry.dispose();
  web.glow.geometry.dispose();
  web.core.geometry = new THREE.TubeGeometry(curve, 28, 0.09, 7, false);
  web.glow.geometry = new THREE.TubeGeometry(curve, 28, 0.19, 7, false);
}

const cameraPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0, 64, 130),
  new THREE.Vector3(-3, 43, 82),
  new THREE.Vector3(-1, 73, 34),
  new THREE.Vector3(1, 122, -13),
  new THREE.Vector3(3, 91, -61),
  new THREE.Vector3(12, 50, -106),
  new THREE.Vector3(4, 42, -155),
  new THREE.Vector3(0, 35, -196),
  new THREE.Vector3(0, 31, -220),
], false, 'catmullrom', 0.48);

const busLeftAttach = new THREE.Object3D();
const busRightAttach = new THREE.Object3D();
busLeftAttach.position.set(-2.0, 3.25, -5.25);
busRightAttach.position.set(2.0, 3.25, -5.25);
bus.add(busLeftAttach, busRightAttach);

function updateTraffic(time) { window.__bfTrace?.add(539);
  for (const car of movingCars) {
    if (car.userData.cross) continue;
    const speed = 11 + (car.userData.index % 4) * 1.6;
    const z = 180 - positiveMod(180 - car.userData.base - car.userData.direction * speed * time, 590);
    car.position.set(car.userData.lane, 0, z);
    car.visible = !(z < -270 && z > -286);
  }
  for (const car of crossTraffic) {
    const x = -128 + positiveMod(car.userData.base + time * 10 + 128, 256);
    car.position.set(x, 0, -176);
  }
}

function updateBus(time) { window.__bfTrace?.add(553);
  let y = 76;
  let rotationX = -0.28;
  if (time >= 5.0 && time < 7.15) {
    const fallTime = time - 5.0;
    const u = clamp01(fallTime / 2.15);
    y = 76 - 15.04 * fallTime * fallTime;
    rotationX = -0.28 + 0.2 * u + Math.sin(u * Math.PI) * 0.12;
  } else if (time >= 7.15) {
    const u = (time - 7.15) / 0.85;
    y = 6.5 + 7.0 * (1 - Math.exp(-3.2 * u))
      + 2.8 * Math.sin(u * Math.PI * 2.2) * Math.exp(-1.8 * u);
    rotationX = -0.08 * Math.exp(-2.5 * u) * Math.cos(u * Math.PI * 2);
  }
  bus.visible = time >= 4.7;
  bus.position.set(0, y, -258);
  bus.rotation.set(
    rotationX,
    Math.PI + 0.02 * Math.sin(time * 1.7),
    0.07 * Math.sin(time * 1.25),
  );
}

function updateCamera(time) { window.__bfTrace?.add(576);
  const u = clamp01(time / DURATION);
  camera.position.copy(cameraPath.getPoint(u));
  if (time >= 7.15) {
    const recoilTime = time - 7.15;
    camera.position.y -= 2.8 * Math.sin(recoilTime * Math.PI * 3.2)
      * Math.exp(-3.1 * recoilTime);
  }
  const tangent = cameraPath.getTangent(Math.min(0.998, u + 0.004)).normalize();
  const forwardPoint = camera.position.clone().addScaledVector(tangent, 55);
  if (time > 5.05) {
    const busTarget = bus.position.clone();
    busTarget.y += 1.8;
    const focus = smooth(5.05, 5.72, time);
    forwardPoint.lerp(busTarget, focus);
  }
  camera.up.set(0, 1, 0);
  camera.lookAt(forwardPoint);
  const roll = -0.04 * Math.sin(time * 1.2)
    + Math.sin(clamp01((time - 3.8) / 1.45) * Math.PI) * 0.52
    - Math.sin(clamp01((time - 5.15) / 0.7) * Math.PI) * 0.22;
  camera.rotateZ(roll);
}

function updateHands(time) { window.__bfTrace?.add(600);
  const freefall = smooth(2.95, 3.45, time) * (1 - smooth(4.8, 5.2, time));
  const catchReach = smooth(5.15, 5.65, time);
  const firstReach = smooth(0.2, 0.62, time) * (1 - smooth(2.45, 2.8, time));
  const catchShock = time >= 7.15
    ? Math.sin((time - 7.15) * Math.PI * 3.2) * Math.exp(-(time - 7.15) * 3.1)
    : 0;

  leftHand.position.set(
    -0.62 - freefall * 0.16 + catchReach * 0.14,
    -0.6 + freefall * 0.08 + catchReach * 0.2 - catchShock * 0.08,
    -1.25 - catchReach * 0.5 + catchShock * 0.12,
  );
  rightHand.position.set(
    0.62 + freefall * 0.16 - catchReach * 0.14,
    -0.6 + firstReach * 0.29 + freefall * 0.08 + catchReach * 0.2 - catchShock * 0.08,
    -1.25 - firstReach * 0.42 - catchReach * 0.5 + catchShock * 0.12,
  );
  leftHand.rotation.set(
    -0.12 + catchReach * 0.24,
    -0.12 - freefall * 0.18,
    -0.14 - freefall * 0.2 + catchReach * 0.08,
  );
  rightHand.rotation.set(
    -0.12 + catchReach * 0.24,
    0.12 + freefall * 0.18,
    0.14 + freefall * 0.2 - catchReach * 0.08,
  );

  const pulse = Math.sin(time * 18) * 0.018 * catchReach;
  leftHand.position.y += pulse;
  rightHand.position.y -= pulse;
  camera.updateMatrixWorld(true);
}

const tempStartLeft = new THREE.Vector3();
const tempStartRight = new THREE.Vector3();
const tempTargetLeft = new THREE.Vector3();
const tempTargetRight = new THREE.Vector3();

function updateWebs(time) { window.__bfTrace?.add(640);
  leftHand.userData.nozzle.getWorldPosition(tempStartLeft);
  rightHand.userData.nozzle.getWorldPosition(tempStartRight);

  if (time < 3.0) {
    const rightGrowth = smooth(0.28, 0.58, time);
    updateWeb(
      rightWeb,
      tempStartRight,
      new THREE.Vector3(24.6, 128, -10),
      rightGrowth,
      1.3 + (1 - rightGrowth) * 3,
      time > 0.28 && time < 2.82,
    );
    const leftGrowth = smooth(1.42, 1.74, time);
    updateWeb(
      leftWeb,
      tempStartLeft,
      new THREE.Vector3(-24.6, 143, -54),
      leftGrowth,
      1.7,
      time > 1.42 && time < 2.62,
    );
  } else if (time >= 5.3) {
    busLeftAttach.getWorldPosition(tempTargetLeft);
    busRightAttach.getWorldPosition(tempTargetRight);
    const growth = smooth(5.3, 5.72, time);
    const tension = smooth(6.15, 7.15, time);
    updateWeb(
      leftWeb,
      tempStartLeft,
      tempTargetLeft,
      growth,
      THREE.MathUtils.lerp(2.4, 0.18, tension),
      true,
    );
    updateWeb(
      rightWeb,
      tempStartRight,
      tempTargetRight,
      growth,
      THREE.MathUtils.lerp(2.4, 0.18, tension),
      true,
    );
  } else {
    leftWeb.group.visible = false;
    rightWeb.group.visible = false;
  }
}

function updateScene(time) { window.__bfTrace?.add(690);
  const exactTime = THREE.MathUtils.clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  updateTraffic(exactTime);
  updateBus(exactTime);
  updateCamera(exactTime);
  updateHands(exactTime);
  updateWebs(exactTime);
  const plunge = smooth(3.1, 3.55, exactTime) * (1 - smooth(4.6, 5.05, exactTime));
  streakMaterial.opacity = plunge * 0.48;
  streaks.visible = plunge > 0.01;
  renderer.render(scene, camera);
}

let paused = false;
let startTime = performance.now();
let pausedAt = 0;

function animate(now) { window.__bfTrace?.add(707);
  if (!paused) {
    const time = ((now - startTime) / 1000) % DURATION;
    updateScene(time);
  }
  requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    paused = true;
    return pausedAt;
  },
  seek(seconds) {
    paused = true;
    pausedAt = THREE.MathUtils.clamp(Number(seconds) || 0, 0, DURATION);
    updateScene(pausedAt);
    return pausedAt;
  },
};

window.__sceneReady = true;
updateScene(0);
requestAnimationFrame(animate);
