import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAMES = 124;
const DURATION = FRAMES / FPS;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ba5bd);
scene.fog = new THREE.FogExp2(0x8ea5b7, 0.012);

const camera = new THREE.PerspectiveCamera(48, WIDTH / HEIGHT, 0.08, 180);

const MAT = {
  roof: new THREE.MeshStandardMaterial({ color: 0x667078, roughness: 0.9, metalness: 0.04 }),
  roofEdge: new THREE.MeshStandardMaterial({ color: 0x232b31, roughness: 0.72 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x3d474f, roughness: 0.94 }),
  concreteDark: new THREE.MeshStandardMaterial({ color: 0x202b35, roughness: 0.92 }),
  glass: new THREE.MeshStandardMaterial({ color: 0x6d93a8, roughness: 0.25, metalness: 0.35 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x7a8588, roughness: 0.42, metalness: 0.72 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: 0x27323a, roughness: 0.38, metalness: 0.78 }),
  jacket: new THREE.MeshPhysicalMaterial({
    color: 0xde3828,
    roughness: 0.38,
    metalness: 0.02,
    clearcoat: 0.22,
    clearcoatRoughness: 0.42,
    sheen: 0.18,
    sheenColor: new THREE.Color(0xff7b5f),
  }),
  jacketDark: new THREE.MeshStandardMaterial({ color: 0x7d211b, roughness: 0.48 }),
  pants: new THREE.MeshStandardMaterial({ color: 0x222d3b, roughness: 0.58 }),
  shoe: new THREE.MeshStandardMaterial({ color: 0xe9eef0, roughness: 0.48 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xb86f4f, roughness: 0.72 }),
  hair: new THREE.MeshStandardMaterial({ color: 0x171414, roughness: 0.92 }),
  water: new THREE.MeshPhysicalMaterial({
    color: 0x73d7f5,
    emissive: 0x0d4566,
    emissiveIntensity: 0.72,
    roughness: 0.08,
    metalness: 0.04,
    transmission: 0.08,
    clearcoat: 0.9,
  }),
  gravel: new THREE.MeshStandardMaterial({ color: 0xb68d64, roughness: 0.95 }),
  yellow: new THREE.MeshStandardMaterial({ color: 0xf3b22b, roughness: 0.62 }),
};

function mesh(geometry, material, position, castShadow = true, receiveShadow = true) { window.__bfTrace?.add(65);
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.castShadow = castShadow;
  object.receiveShadow = receiveShadow;
  scene.add(object);
  return object;
}

function box(name, size, position, material, parent = scene) { window.__bfTrace?.add(74);
  const object = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  object.name = name;
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function cylinder(name, radiusTop, radiusBottom, height, segments, position, material, parent = scene) { window.__bfTrace?.add(84);
  const object = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
  );
  object.name = name;
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function seeded(index, salt = 0) { window.__bfTrace?.add(97);
  const value = Math.sin(index * 91.731 + salt * 37.119) * 43758.5453;
  return value - Math.floor(value);
}

function smooth01(value) { window.__bfTrace?.add(102);
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function addSky() { window.__bfTrace?.add(107);
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x20466a) },
      horizonColor: { value: new THREE.Color(0xf0b074) },
      lowColor: { value: new THREE.Color(0x8194a4) },
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorld = normalize(worldPosition.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 lowColor;
      varying vec3 vWorld;
      void main() {
        float h = smoothstep(-0.12, 0.72, vWorld.y);
        vec3 lower = mix(lowColor, horizonColor, smoothstep(-0.18, 0.13, vWorld.y));
        gl_FragColor = vec4(mix(lower, topColor, h), 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(115, 32, 18), skyMaterial);
  scene.add(sky);

  const sun = mesh(
    new THREE.SphereGeometry(2.0, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd49b, fog: false }),
    [-42, 27, -72],
    false,
    false,
  );
  sun.renderOrder = -1;
}

function addCity() { window.__bfTrace?.add(149);
  const buildingMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x3b4b59, roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: 0x53606a, roughness: 0.91 }),
    new THREE.MeshStandardMaterial({ color: 0x293944, roughness: 0.86 }),
    new THREE.MeshStandardMaterial({ color: 0x6c625c, roughness: 0.92 }),
  ];
  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd28a,
    emissive: 0xffa93d,
    emissiveIntensity: 1.7,
    roughness: 0.35,
  });

  for (let side = -1; side <= 1; side += 2) {
    for (let i = 0; i < 15; i += 1) {
      const x = -32 + i * 4.6 + seeded(i, side) * 2.1;
      const z = side * (12 + seeded(i, 4) * 8);
      const width = 3.2 + seeded(i, 7) * 3.5;
      const depth = 3.0 + seeded(i, 11) * 4.5;
      const height = 5 + seeded(i, 19) * 16;
      const building = box(
        `background-building-${side}-${i}`,
        [width, height, depth],
        [x, -7.2 + height / 2, z],
        buildingMaterials[i % buildingMaterials.length],
      );
      building.castShadow = false;

      const rows = Math.max(2, Math.floor(height / 3.4));
      for (let row = 0; row < rows; row += 1) {
        if ((row + i) % 2 === 0) {
          const window = box(
            `window-${side}-${i}-${row}`,
            [0.65, 0.42, 0.04],
            [x + width * 0.18, -5.1 + row * 2.4, z - side * (depth / 2 + 0.025)],
            windowMaterial,
          );
          window.castShadow = false;
        }
      }
    }
  }

  for (let i = 0; i < 12; i += 1) {
    const x = -38 + i * 7;
    const z = -34 - seeded(i, 31) * 17;
    const height = 13 + seeded(i, 43) * 24;
    box(
      `distant-tower-${i}`,
      [4 + seeded(i, 1) * 4, height, 5 + seeded(i, 2) * 5],
      [x, -7.5 + height / 2, z],
      buildingMaterials[(i + 2) % buildingMaterials.length],
    ).castShadow = false;
  }
}

function addRooftops() { window.__bfTrace?.add(206);
  box('takeoff-building', [12, 9.2, 13], [-9, -2.8, 0], MAT.concrete);
  box('landing-building', [12, 9.2, 13], [9, -2.8, 0], MAT.concreteDark);
  box('takeoff-roof-slab', [12.2, 0.48, 13.2], [-9, 1.92, 0], MAT.roof);
  box('landing-roof-slab', [12.2, 0.48, 13.2], [9, 1.92, 0], MAT.roof);
  box('takeoff-edge', [0.34, 0.45, 13.25], [-2.92, 2.17, 0], MAT.roofEdge);
  box('landing-edge', [0.34, 0.45, 13.25], [2.92, 2.17, 0], MAT.roofEdge);

  const gapWindowMaterial = new THREE.MeshStandardMaterial({
    color: 0x406c82,
    emissive: 0x1f6f96,
    emissiveIntensity: 0.75,
    roughness: 0.24,
    metalness: 0.28,
  });
  for (const side of [-1, 1]) {
    for (let row = 0; row < 3; row += 1) {
      for (let column = -2; column <= 2; column += 1) {
        box(
          `gap-window-${side}-${row}-${column}`,
          [0.055, 0.64, 1.16],
          [side * 2.81, -4.75 + row * 2.1, column * 2.25],
          gapWindowMaterial,
        ).castShadow = false;
      }
    }
    for (const z of [-5.85, -3.0, 0, 3.0, 5.85]) {
      box(`gap-facade-rib-${side}-${z}`, [0.25, 8.2, 0.18], [side * 2.72, -2.1, z], MAT.darkMetal);
    }
    for (let marker = -5; marker <= 5; marker += 1) {
      box(
        `roof-edge-marker-${side}-${marker}`,
        [0.15, 0.12, 0.58],
        [side * 2.72, 2.43, marker * 1.05],
        marker % 2 === 0 ? MAT.yellow : MAT.roofEdge,
      );
    }
  }

  for (const side of [-1, 1]) {
    const centerX = side * 9;
    box(`far-parapet-${side}`, [12.1, 0.65, 0.38], [centerX, 2.45, -6.42], MAT.concreteDark);
    box(`near-parapet-${side}`, [12.1, 0.65, 0.38], [centerX, 2.45, 6.42], MAT.concreteDark);
    box(`outer-parapet-${side}`, [0.38, 0.65, 13], [side * 14.82, 2.45, 0], MAT.concreteDark);
  }

  box('street', [6.1, 0.22, 66], [0, -7.47, 0], new THREE.MeshStandardMaterial({
    color: 0x11171c,
    roughness: 1,
  }));
  for (let z = -28; z <= 28; z += 5) {
    box('street-line', [0.12, 0.03, 2.4], [0, -7.34, z], MAT.yellow).castShadow = false;
  }
  box('left-sidewalk', [1.1, 0.28, 66], [-3.55, -7.3, 0], MAT.concrete);
  box('right-sidewalk', [1.1, 0.28, 66], [3.55, -7.3, 0], MAT.concrete);

  const vent = box('takeoff-hvac', [2.2, 1.15, 1.55], [-8.8, 2.73, -3.5], MAT.metal);
  for (let i = -2; i <= 2; i += 1) {
    box('hvac-grille', [0.05, 0.62, 0.14], [-7.67, 2.73, -3.5 + i * 0.24], MAT.darkMetal);
  }
  cylinder('takeoff-vent', 0.52, 0.6, 1.2, 20, [-5.4, 2.82, 3.7], MAT.darkMetal);
  cylinder('takeoff-vent-cap', 0.74, 0.48, 0.28, 20, [-5.4, 3.5, 3.7], MAT.metal);
  vent.rotation.y = 0.02;

  const tank = cylinder('landing-water-tank', 1.25, 1.25, 2.5, 24, [10.2, 3.72, -3.8], MAT.darkMetal);
  tank.rotation.y = Math.PI / 12;
  cylinder('tank-top', 1.28, 1.28, 0.18, 24, [10.2, 5.03, -3.8], MAT.metal);
  for (const z of [-4.6, -3.0]) {
    for (const x of [9.5, 10.9]) {
      box('tank-leg', [0.18, 1.0, 0.18], [x, 2.67, z], MAT.darkMetal);
    }
  }
  box('landing-duct', [3.4, 0.72, 1.1], [7.4, 2.52, 3.9], MAT.metal);

  const puddle = new THREE.Mesh(
    new THREE.CircleGeometry(1.0, 32),
    new THREE.MeshPhysicalMaterial({
      color: 0x4d8497,
      roughness: 0.12,
      metalness: 0.4,
      clearcoat: 1,
      transparent: true,
      opacity: 0.78,
    }),
  );
  puddle.name = 'takeoff-puddle';
  puddle.rotation.x = -Math.PI / 2;
  puddle.scale.set(1.45, 0.58, 1);
  puddle.position.set(-3.95, 2.185, 0.42);
  scene.add(puddle);

  for (let i = 0; i < 16; i += 1) {
    const pebble = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.035 + seeded(i, 2) * 0.055, 0),
      MAT.gravel,
    );
    pebble.position.set(
      -4.5 + seeded(i, 3) * 1.6,
      2.22,
      -1.8 + seeded(i, 5) * 3.6,
    );
    pebble.rotation.set(seeded(i, 8) * 3, seeded(i, 9) * 3, seeded(i, 10) * 3);
    pebble.castShadow = true;
    scene.add(pebble);
  }
}

addSky();
addCity();
addRooftops();

const hemisphere = new THREE.HemisphereLight(0xbcdcff, 0x25201d, 1.45);
scene.add(hemisphere);

const sunLight = new THREE.DirectionalLight(0xffd2a3, 4.4);
sunLight.position.set(-18, 30, 22);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -22;
sunLight.shadow.camera.right = 22;
sunLight.shadow.camera.top = 20;
sunLight.shadow.camera.bottom = -14;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 75;
sunLight.shadow.bias = -0.00025;
scene.add(sunLight);

const rimLight = new THREE.SpotLight(0x7fb8ff, 42, 28, Math.PI / 5.5, 0.55, 1.4);
rimLight.position.set(3, 12, -9);
rimLight.target.position.set(0, 4, 0);
scene.add(rimLight, rimLight.target);

const cameraFill = new THREE.SpotLight(0xd9e9ff, 34, 24, Math.PI / 4, 0.72, 1.3);
cameraFill.castShadow = false;
scene.add(cameraFill, cameraFill.target);

const athlete = new THREE.Group();
athlete.name = 'parkour-athlete';
scene.add(athlete);

const body = {};
const unitY = new THREE.Vector3(0, 1, 0);
const tempDirection = new THREE.Vector3();
const tempMidpoint = new THREE.Vector3();

function makeSegment(name, radius, material, radialSegments = 12) { window.__bfTrace?.add(351);
  const object = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius * 0.94, 1, radialSegments),
    material,
  );
  object.name = name;
  object.castShadow = true;
  object.receiveShadow = true;
  athlete.add(object);
  body[name] = object;
  return object;
}

function makeJoint(name, radius, material) { window.__bfTrace?.add(364);
  const object = new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material);
  object.name = name;
  object.castShadow = true;
  athlete.add(object);
  body[name] = object;
  return object;
}

makeSegment('torso', 0.37, MAT.jacket, 16);
makeSegment('pelvis', 0.3, MAT.jacketDark, 16);
for (const side of ['L', 'R']) {
  makeSegment(`upperArm${side}`, 0.13, MAT.jacket);
  makeSegment(`lowerArm${side}`, 0.105, MAT.skin);
  makeJoint(`hand${side}`, 0.135, MAT.skin);
  makeSegment(`thigh${side}`, 0.17, MAT.pants);
  makeSegment(`shin${side}`, 0.135, MAT.pants);
  makeJoint(`knee${side}`, 0.17, MAT.pants);
  body[`shoe${side}`] = box(
    `shoe${side}`,
    [0.54, 0.2, 0.29],
    [0, 0, 0],
    MAT.shoe,
    athlete,
  );
}

body.head = makeJoint('head', 0.32, MAT.skin);
body.hair = new THREE.Mesh(
  new THREE.SphereGeometry(0.326, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56),
  MAT.hair,
);
body.hair.name = 'hair';
body.hair.castShadow = true;
athlete.add(body.hair);
body.nose = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.19, 10), MAT.skin);
body.nose.name = 'nose';
body.nose.rotation.z = -Math.PI / 2;
body.nose.castShadow = true;
athlete.add(body.nose);
for (const side of [-1, 1]) {
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.035, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x100e0d, roughness: 0.45 }),
  );
  eye.name = side > 0 ? 'left-eye' : 'right-eye';
  eye.castShadow = true;
  athlete.add(eye);
  body[side > 0 ? 'eyeL' : 'eyeR'] = eye;
}
body.belt = makeSegment('belt', 0.315, MAT.darkMetal, 16);

const backpack = box('compact-backpack', [0.46, 0.75, 0.22], [0, 0, 0], MAT.jacketDark, athlete);
backpack.geometry.translate(0, 0, 0);
body.zipper = box('jacket-zipper', [0.045, 0.62, 0.055], [0, 0, 0], MAT.darkMetal, athlete);
body.hood = new THREE.Mesh(new THREE.TorusGeometry(0.27, 0.075, 8, 20), MAT.jacketDark);
body.hood.name = 'jacket-hood';
body.hood.rotation.x = Math.PI / 2;
body.hood.castShadow = true;
athlete.add(body.hood);
for (const suffix of ['L', 'R']) {
  body[`sole${suffix}`] = box(
    `shoe-sole-${suffix}`,
    [0.57, 0.065, 0.31],
    [0, 0, 0],
    MAT.darkMetal,
    athlete,
  );
}

const POSES = {
  run: {
    hip: [0, 0, 0],
    chest: [0.24, 1.08, 0],
    neck: [0.38, 1.53, 0],
    shoulderL: [0.28, 1.28, 0.36],
    elbowL: [-0.28, 0.92, 0.42],
    handL: [-0.72, 0.7, 0.35],
    shoulderR: [0.28, 1.28, -0.36],
    elbowR: [0.82, 0.92, -0.42],
    handR: [1.18, 1.08, -0.35],
    kneeL: [0.58, -0.46, 0.18],
    footL: [1.02, -1.0, 0.14],
    kneeR: [-0.5, -0.34, -0.16],
    footR: [-0.92, -0.98, -0.1],
  },
  launch: {
    hip: [0, 0, 0],
    chest: [0.22, 1.02, 0],
    neck: [0.34, 1.48, 0],
    shoulderL: [0.25, 1.2, 0.36],
    elbowL: [0.88, 0.92, 0.45],
    handL: [1.28, 1.12, 0.39],
    shoulderR: [0.25, 1.2, -0.36],
    elbowR: [-0.35, 0.77, -0.4],
    handR: [-0.83, 0.5, -0.32],
    kneeL: [0.85, -0.43, 0.18],
    footL: [1.52, -0.25, 0.14],
    kneeR: [-0.62, -0.47, -0.16],
    footR: [-1.16, -0.9, -0.08],
  },
  flight: {
    hip: [0, 0, 0],
    chest: [0.3, 0.98, 0],
    neck: [0.47, 1.43, 0],
    shoulderL: [0.32, 1.17, 0.36],
    elbowL: [0.98, 1.1, 0.51],
    handL: [1.55, 0.9, 0.43],
    shoulderR: [0.32, 1.17, -0.36],
    elbowR: [-0.2, 0.72, -0.48],
    handR: [-0.83, 0.74, -0.44],
    kneeL: [0.82, -0.42, 0.23],
    footL: [1.6, -0.34, 0.18],
    kneeR: [-0.65, -0.62, -0.17],
    footR: [-1.34, -0.3, -0.23],
  },
  landing: {
    hip: [0, 0, 0],
    chest: [0.58, 0.72, 0],
    neck: [0.85, 1.02, 0],
    shoulderL: [0.62, 0.85, 0.34],
    elbowL: [0.04, 0.55, 0.45],
    handL: [-0.4, 0.18, 0.36],
    shoulderR: [0.62, 0.85, -0.34],
    elbowR: [1.12, 0.45, -0.42],
    handR: [1.42, 0.08, -0.31],
    kneeL: [0.62, -0.58, 0.2],
    footL: [1.08, -1.03, 0.18],
    kneeR: [-0.32, -0.72, -0.18],
    footR: [-0.65, -1.06, -0.1],
  },
};

function interpolatePose(a, b, amount) { window.__bfTrace?.add(497);
  const pose = {};
  const t = smooth01(amount);
  for (const key of Object.keys(a)) {
    pose[key] = new THREE.Vector3(...a[key]).lerp(new THREE.Vector3(...b[key]), t);
  }
  return pose;
}

function updateSegment(object, start, end) { window.__bfTrace?.add(506);
  tempDirection.subVectors(end, start);
  const length = tempDirection.length();
  tempMidpoint.addVectors(start, end).multiplyScalar(0.5);
  object.position.copy(tempMidpoint);
  object.scale.set(1, length, 1);
  object.quaternion.setFromUnitVectors(unitY, tempDirection.normalize());
}

function updateShoe(object, ankle, toe, side) { window.__bfTrace?.add(515);
  object.position.copy(ankle).lerp(toe, 0.72);
  object.rotation.set(0, -side * 0.05, -Math.atan2(toe.y - ankle.y, toe.x - ankle.x));
}

function actionProgress(time) { window.__bfTrace?.add(520);
  const t = THREE.MathUtils.clamp(time, 0, DURATION);
  if (t <= 1.08) {
    return THREE.MathUtils.lerp(0, 0.495, smooth01(t / 1.08));
  }
  if (t <= 4.18) {
    return 0.495 + ((t - 1.08) / 3.1) * 0.017;
  }
  const resume = (t - 4.18) / (DURATION - 4.18);
  return 0.512 + 0.488 * (1 - Math.pow(1 - resume, 1.4));
}

function athleteRoot(progress) { window.__bfTrace?.add(532);
  if (progress < 0.18) {
    const q = progress / 0.18;
    return new THREE.Vector3(
      THREE.MathUtils.lerp(-8.4, -2.72, q),
      3.18 + Math.sin(q * Math.PI * 2) * 0.06,
      0.12 * Math.sin(q * Math.PI),
    );
  }
  if (progress < 0.85) {
    const q = (progress - 0.18) / 0.67;
    return new THREE.Vector3(
      THREE.MathUtils.lerp(-2.72, 2.75, q),
      3.18 + Math.sin(q * Math.PI) * 2.52,
      0.18 * Math.sin(q * Math.PI * 1.4),
    );
  }
  const q = (progress - 0.85) / 0.15;
  return new THREE.Vector3(
    THREE.MathUtils.lerp(2.75, 5.45, q),
    3.18 - Math.sin(q * Math.PI) * 0.28 + q * 0.1,
    THREE.MathUtils.lerp(0.1, -0.08, q),
  );
}

function updateAthlete(progress) { window.__bfTrace?.add(557);
  athlete.position.copy(athleteRoot(progress));
  athlete.rotation.set(
    progress < 0.82 ? -0.02 : 0.03,
    -0.035,
    progress < 0.72 ? -0.11 : THREE.MathUtils.lerp(-0.11, -0.38, smooth01((progress - 0.72) / 0.28)),
  );

  let pose;
  if (progress < 0.12) {
    pose = interpolatePose(POSES.run, POSES.launch, progress / 0.12);
  } else if (progress < 0.3) {
    pose = interpolatePose(POSES.launch, POSES.flight, (progress - 0.12) / 0.18);
  } else if (progress < 0.72) {
    pose = interpolatePose(POSES.flight, POSES.flight, 0);
  } else {
    pose = interpolatePose(POSES.flight, POSES.landing, (progress - 0.72) / 0.28);
  }

  updateSegment(body.torso, pose.hip, pose.chest);
  updateSegment(body.pelvis, new THREE.Vector3(-0.02, -0.18, 0), new THREE.Vector3(0.02, 0.22, 0));
  updateSegment(body.belt, new THREE.Vector3(0, -0.02, 0), new THREE.Vector3(0.01, 0.14, 0));
  body.head.position.copy(pose.neck).add(new THREE.Vector3(0.12, 0.24, 0));
  body.hair.position.copy(body.head.position).add(new THREE.Vector3(-0.04, 0.08, 0));
  body.nose.position.copy(body.head.position).add(new THREE.Vector3(0.31, 0.01, 0));
  body.eyeL.position.copy(body.head.position).add(new THREE.Vector3(0.29, 0.08, 0.12));
  body.eyeR.position.copy(body.head.position).add(new THREE.Vector3(0.29, 0.08, -0.12));
  backpack.position.copy(pose.hip).lerp(pose.chest, 0.62).add(new THREE.Vector3(-0.16, 0.02, -0.32));
  backpack.rotation.z = -0.14;
  body.zipper.position.copy(pose.hip).lerp(pose.chest, 0.57).add(new THREE.Vector3(0.34, 0, 0));
  body.zipper.rotation.z = -0.12;
  body.hood.position.copy(pose.neck).add(new THREE.Vector3(-0.05, -0.13, 0));

  for (const [suffix, side] of [['L', 1], ['R', -1]]) {
    const shoulder = pose[`shoulder${suffix}`];
    const elbow = pose[`elbow${suffix}`];
    const hand = pose[`hand${suffix}`];
    const hip = new THREE.Vector3(0, -0.08, side * 0.19);
    const knee = pose[`knee${suffix}`];
    const foot = pose[`foot${suffix}`];
    const toe = foot.clone().add(new THREE.Vector3(0.34, -0.02, 0));
    updateSegment(body[`upperArm${suffix}`], shoulder, elbow);
    updateSegment(body[`lowerArm${suffix}`], elbow, hand);
    body[`hand${suffix}`].position.copy(hand);
    updateSegment(body[`thigh${suffix}`], hip, knee);
    updateSegment(body[`shin${suffix}`], knee, foot);
    body[`knee${suffix}`].position.copy(knee);
    updateShoe(body[`shoe${suffix}`], foot, toe, side);
    updateShoe(body[`sole${suffix}`], foot.clone().add(new THREE.Vector3(0, -0.105, 0)), toe, side);
  }
}

const debris = [];
for (let i = 0; i < 23; i += 1) {
  const isWater = i < 13;
  const geometry = isWater
    ? new THREE.SphereGeometry(0.035 + seeded(i, 50) * 0.065, 10, 8)
    : new THREE.DodecahedronGeometry(0.045 + seeded(i, 55) * 0.075, 0);
  const particle = new THREE.Mesh(geometry, isWater ? MAT.water : MAT.gravel);
  particle.name = isWater ? `suspended-droplet-${i}` : `suspended-debris-${i}`;
  particle.userData = {
    water: isWater,
    origin: new THREE.Vector3(
      -3.38 - seeded(i, 61) * 0.65,
      2.22 + seeded(i, 62) * 0.18,
      -0.35 + seeded(i, 63) * 1.25,
    ),
    velocity: new THREE.Vector3(
      0.45 + seeded(i, 64) * 1.65,
      1.0 + seeded(i, 65) * 2.8,
      -1.15 + seeded(i, 66) * 2.3,
    ),
    spin: new THREE.Vector3(seeded(i, 67) * 7, seeded(i, 68) * 8, seeded(i, 69) * 6),
  };
  particle.castShadow = true;
  scene.add(particle);
  debris.push(particle);
}

function updateDebris(progress) { window.__bfTrace?.add(636);
  const phase = Math.max(0, (progress - 0.105) * 4.3);
  for (let i = 0; i < debris.length; i += 1) {
    const particle = debris[i];
    const delay = i * 0.018;
    const age = Math.max(0, phase - delay);
    particle.visible = phase > delay * 0.45;
    particle.position.copy(particle.userData.origin)
      .addScaledVector(particle.userData.velocity, age);
    particle.position.y -= 1.12 * age * age;
    particle.rotation.set(
      particle.userData.spin.x * age,
      particle.userData.spin.y * age,
      particle.userData.spin.z * age,
    );
    if (particle.userData.water) {
      particle.scale.set(0.72, 1.45 + age * 0.25, 0.72);
    }
  }
}

const cameraPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-11.6, 4.8, 6.8),
  new THREE.Vector3(-7.8, 4.05, 5.2),
  new THREE.Vector3(-3.45, 4.25, 4.45),
  new THREE.Vector3(-1.55, 3.35, 3.0),
  new THREE.Vector3(-0.55, 2.05, 1.65),
  new THREE.Vector3(0.62, 0.95, -0.8),
  new THREE.Vector3(2.35, 2.35, -3.1),
  new THREE.Vector3(4.45, 3.45, -4.25),
  new THREE.Vector3(6.75, 3.55, -2.8),
  new THREE.Vector3(9.65, 4.8, 5.4),
], false, 'centripetal', 0.5);

const lookTarget = new THREE.Vector3();
const landingLook = new THREE.Vector3(2.75, 3.2, 0);

function updateCamera(time) { window.__bfTrace?.add(673);
  const u = THREE.MathUtils.clamp(time / DURATION, 0, 1);
  const travel = smooth01(u);
  camera.position.copy(cameraPath.getPoint(travel));
  const athleteLook = athlete.position.clone().add(new THREE.Vector3(0.22, 0.45, 0));
  lookTarget.copy(athleteLook);
  if (u > 0.78) {
    lookTarget.lerp(landingLook, smooth01((u - 0.78) / 0.22));
  }
  camera.fov = THREE.MathUtils.lerp(48, 63, Math.sin(Math.PI * smooth01(u)));
  camera.updateProjectionMatrix();
  camera.lookAt(lookTarget);
}

let currentTime = 0;
let playing = false;
let animationStart = performance.now();
let animationStartTime = 0;

function renderAt(time) { window.__bfTrace?.add(692);
  currentTime = THREE.MathUtils.clamp(Number(time) || 0, 0, DURATION);
  const progress = actionProgress(currentTime);
  updateAthlete(progress);
  updateDebris(progress);
  updateCamera(currentTime);
  rimLight.target.position.copy(athlete.position);
  rimLight.target.updateMatrixWorld();
  cameraFill.position.copy(camera.position);
  cameraFill.target.position.copy(athlete.position).add(new THREE.Vector3(0, 0.45, 0));
  cameraFill.target.updateMatrixWorld();
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}

function animationLoop(now) { window.__bfTrace?.add(707);
  if (playing) {
    const elapsed = (now - animationStart) / 1000;
    renderAt((animationStartTime + elapsed) % DURATION);
  }
  requestAnimationFrame(animationLoop);
}

function finiteArray(values) { window.__bfTrace?.add(715);
  return values.map((value) => Number(value));
}

window.reconstruction = {
  pause() {
    playing = false;
    renderAt(currentTime);
  },
  seek(seconds) {
    playing = false;
    renderAt(seconds);
  },
  play() {
    animationStart = performance.now();
    animationStartTime = currentTime;
    playing = true;
  },
  getCameraState() {
    return {
      position: finiteArray(camera.position.toArray()),
      quaternion: finiteArray(camera.quaternion.toArray()),
      fov: Number(camera.fov),
    };
  },
  getDebugState() {
    return {
      time: currentTime,
      actionProgress: actionProgress(currentTime),
      athletePosition: finiteArray(athlete.position.toArray()),
      firstParticlePosition: finiteArray(debris[0].position.toArray()),
      camera: this.getCameraState(),
    };
  },
};

renderAt(0);
window.sceneReady = true;
requestAnimationFrame(animationLoop);
