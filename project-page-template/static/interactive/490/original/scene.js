import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;

const canvas = document.querySelector("#scene");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.04;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xd19a83, 0.008);

const camera = new THREE.PerspectiveCamera(66, WIDTH / HEIGHT, 0.025, 300);
camera.rotation.order = "YXZ";

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (value) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};

function cubicBezier(a, b, c, d, t, target = new THREE.Vector3()) {
  const u = 1 - t;
  return target
    .copy(a)
    .multiplyScalar(u * u * u)
    .addScaledVector(b, 3 * u * u * t)
    .addScaledVector(c, 3 * u * t * t)
    .addScaledVector(d, t * t * t);
}

function box(size, position, material, parent, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function roundedRectShape(width, height, radius) {
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function prismXZ(points, thickness, material) {
  const vertices = [];
  const top = thickness / 2;
  const bottom = -top;
  for (let i = 1; i < points.length - 1; i += 1) {
    vertices.push(
      points[0][0], top, points[0][1],
      points[i][0], top, points[i][1],
      points[i + 1][0], top, points[i + 1][1],
      points[0][0], bottom, points[0][1],
      points[i + 1][0], bottom, points[i + 1][1],
      points[i][0], bottom, points[i][1],
    );
  }
  for (let i = 0; i < points.length; i += 1) {
    const next = (i + 1) % points.length;
    vertices.push(
      points[i][0], top, points[i][1],
      points[next][0], top, points[next][1],
      points[next][0], bottom, points[next][1],
      points[i][0], top, points[i][1],
      points[next][0], bottom, points[next][1],
      points[i][0], bottom, points[i][1],
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {
    zenith: { value: new THREE.Color(0x18365d) },
    upper: { value: new THREE.Color(0x7898bb) },
    horizon: { value: new THREE.Color(0xf2a166) },
    nadir: { value: new THREE.Color(0x754c5e) },
  },
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    varying vec3 vWorldPosition;
    uniform vec3 zenith;
    uniform vec3 upper;
    uniform vec3 horizon;
    uniform vec3 nadir;
    void main() {
      float h = normalize(vWorldPosition).y;
      vec3 color = h > 0.0
        ? mix(horizon, mix(upper, zenith, smoothstep(0.28, 0.9, h)), smoothstep(0.0, 0.32, h))
        : mix(horizon, nadir, smoothstep(0.0, 0.65, -h));
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});
scene.add(new THREE.Mesh(new THREE.SphereGeometry(180, 48, 24), skyMaterial));

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(4.5, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffd08a, fog: false }),
);
sun.position.set(-42, 3, -70);
scene.add(sun);

const hazeDisc = new THREE.Mesh(
  new THREE.CircleGeometry(11, 48),
  new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      glowColor: { value: new THREE.Color(0xffa065) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 glowColor;
      void main() {
        float radius = length(vUv - vec2(0.5));
        float alpha = 0.24 * (1.0 - smoothstep(0.05, 0.5, radius));
        gl_FragColor = vec4(glowColor, alpha);
      }
    `,
  }),
);
hazeDisc.position.copy(sun.position).multiplyScalar(0.98);
hazeDisc.lookAt(0, 0, 0);
scene.add(hazeDisc);

const hemiLight = new THREE.HemisphereLight(0xa9ccff, 0xc1684c, 2.0);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffc38d, 4.1);
sunLight.position.set(20, 24, -22);
sunLight.target.position.set(0, -1, 0);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -15;
sunLight.shadow.camera.right = 15;
sunLight.shadow.camera.top = 12;
sunLight.shadow.camera.bottom = -12;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 70;
scene.add(sunLight, sunLight.target);

const rimLight = new THREE.DirectionalLight(0x8cbcff, 0.9);
rimLight.position.set(-14, 10, 22);
rimLight.target.position.set(0, -0.2, 0);
scene.add(rimLight, rimLight.target);

const cloudLayer = new THREE.Group();
scene.add(cloudLayer);
const cloudGeometry = new THREE.SphereGeometry(1, 14, 9);
const cloudMaterial = new THREE.MeshStandardMaterial({
  color: 0xffd4bc,
  roughness: 1,
  metalness: 0,
});
const random = seededRandom(490);
const cloudCount = 190;
const clouds = new THREE.InstancedMesh(cloudGeometry, cloudMaterial, cloudCount);
const dummy = new THREE.Object3D();
const cloudColor = new THREE.Color();
for (let i = 0; i < cloudCount; i += 1) {
  const angle = random() * Math.PI * 2;
  const radius = 8 + random() * 65;
  const bank = Math.floor(i / 5);
  const puff = i % 5;
  const clusterX = Math.cos(angle) * radius + (bank % 3) * 4;
  const clusterZ = Math.sin(angle) * radius;
  const baseY = -7.2 - random() * 4.0;
  dummy.position.set(
    clusterX + (puff - 2) * (0.9 + random() * 0.5),
    baseY + Math.sin(puff * 1.9) * 0.5 + random() * 0.5,
    clusterZ + (random() - 0.5) * 2.5,
  );
  dummy.scale.set(0.9 + random() * 1.35, 0.55 + random() * 0.65, 0.85 + random() * 1.3);
  dummy.rotation.y = random() * Math.PI;
  dummy.updateMatrix();
  clouds.setMatrixAt(i, dummy.matrix);
  cloudColor.setHSL(0.055, 0.3, 0.78 + random() * 0.14);
  clouds.setColorAt(i, cloudColor);
}
clouds.receiveShadow = true;
cloudLayer.add(clouds);

const aircraft = new THREE.Group();
aircraft.position.y = 0.1;
scene.add(aircraft);

const fuselageMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf0f1ef,
  roughness: 0.25,
  metalness: 0.2,
  clearcoat: 0.62,
  clearcoatRoughness: 0.17,
  side: THREE.FrontSide,
});
const wingMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xd9e1e5,
  roughness: 0.28,
  metalness: 0.24,
  clearcoat: 0.48,
});
const stripeMaterial = new THREE.MeshStandardMaterial({
  color: 0x274764,
  roughness: 0.38,
  metalness: 0.08,
});
const darkMetal = new THREE.MeshStandardMaterial({
  color: 0x1d2831,
  roughness: 0.32,
  metalness: 0.7,
});
const panelLineMaterial = new THREE.MeshStandardMaterial({
  color: 0x8194a4,
  roughness: 0.6,
  metalness: 0.28,
});
const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x6aa6cb,
  transparent: true,
  opacity: 0.34,
  roughness: 0.08,
  metalness: 0,
  transmission: 0.42,
  side: THREE.DoubleSide,
  depthWrite: false,
});

const fuselage = new THREE.Mesh(
  new THREE.CylinderGeometry(1.08, 1.08, 9.8, 64, 4, false),
  fuselageMaterial,
);
fuselage.rotation.z = Math.PI / 2;
fuselage.castShadow = true;
fuselage.receiveShadow = true;
aircraft.add(fuselage);

const nose = new THREE.Mesh(new THREE.SphereGeometry(1.08, 48, 24), fuselageMaterial);
nose.position.x = 4.9;
nose.scale.x = 1.55;
nose.castShadow = true;
nose.receiveShadow = true;
aircraft.add(nose);

const tailCone = new THREE.Mesh(new THREE.ConeGeometry(1.08, 3.0, 48, 2, false), fuselageMaterial);
tailCone.position.x = -5.35;
tailCone.rotation.z = Math.PI / 2;
tailCone.castShadow = true;
tailCone.receiveShadow = true;
aircraft.add(tailCone);

const lowerStripe = box([8.8, 0.12, 0.035], [0, -0.5, 1.04], stripeMaterial, aircraft);
lowerStripe.castShadow = false;

const windowShape = roundedRectShape(0.46, 0.58, 0.18);
const windowGeometry = new THREE.ShapeGeometry(windowShape, 20);
for (const side of [-1, 1]) {
  for (let x = -3.65; x <= 3.55; x += 0.72) {
    const windowMesh = new THREE.Mesh(windowGeometry, glassMaterial);
    windowMesh.position.set(x, 0.18, side * 1.055);
    if (side < 0) windowMesh.rotation.y = Math.PI;
    aircraft.add(windowMesh);
  }
}

for (const side of [-1, 1]) {
  const cockpitWindow = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedRectShape(0.68, 0.3, 0.07), 16),
    darkMetal,
  );
  cockpitWindow.position.set(4.13, 0.42, side * 1.012);
  if (side < 0) cockpitWindow.rotation.y = Math.PI;
  aircraft.add(cockpitWindow);
}

const rightWing = prismXZ([
  [2.05, 0.56],
  [0.55, 7.4],
  [-1.32, 7.4],
  [-2.15, 0.62],
], 0.18, wingMaterial);
rightWing.position.y = -0.34;
aircraft.add(rightWing);

const leftWing = prismXZ([
  [2.05, -0.56],
  [-2.15, -0.62],
  [-1.32, -7.4],
  [0.55, -7.4],
], 0.18, wingMaterial);
leftWing.position.y = -0.34;
aircraft.add(leftWing);

for (const side of [-1, 1]) {
  const flapLine = box(
    [2.55, 0.012, 0.018],
    [-0.4, -0.235, side * 4.75],
    panelLineMaterial,
    aircraft,
    [0, side * -0.2, 0],
  );
  flapLine.castShadow = false;
  for (const z of [2.0, 3.15, 5.9]) {
    const panelLine = box(
      [2.15, 0.01, 0.015],
      [-0.15, -0.232, side * z],
      panelLineMaterial,
      aircraft,
      [0, side * -0.13, 0],
    );
    panelLine.castShadow = false;
  }
}

const wingMarkRight = prismXZ([
  [0.28, 5.75], [-0.12, 7.28], [-0.65, 7.3], [-0.22, 5.72],
], 0.015, stripeMaterial);
wingMarkRight.position.y = -0.235;
aircraft.add(wingMarkRight);
const wingMarkLeft = prismXZ([
  [0.28, -5.75], [-0.22, -5.72], [-0.65, -7.3], [-0.12, -7.28],
], 0.015, stripeMaterial);
wingMarkLeft.position.y = -0.235;
aircraft.add(wingMarkLeft);

function createWinglet(side) {
  const geometry = new THREE.BufferGeometry();
  const z = side * 7.32;
  const inward = side * 0.08;
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -1.34, -0.24, z,
    -0.74, -0.24, z + inward,
    -0.92, 0.94, z,
    -1.34, -0.24, z,
    -0.92, 0.94, z,
    -1.38, -0.24, z + inward,
  ], 3));
  geometry.computeVertexNormals();
  const winglet = new THREE.Mesh(geometry, stripeMaterial);
  winglet.material.side = THREE.DoubleSide;
  winglet.castShadow = true;
  aircraft.add(winglet);
}
createWinglet(1);
createWinglet(-1);

const tailWingRight = prismXZ([
  [-4.25, 0.4],
  [-4.65, 3.25],
  [-5.45, 3.25],
  [-5.28, 0.35],
], 0.13, wingMaterial);
tailWingRight.position.y = 0.03;
aircraft.add(tailWingRight);

const tailWingLeft = prismXZ([
  [-4.25, -0.4],
  [-5.28, -0.35],
  [-5.45, -3.25],
  [-4.65, -3.25],
], 0.13, wingMaterial);
tailWingLeft.position.y = 0.03;
aircraft.add(tailWingLeft);

const verticalTailGeometry = new THREE.BufferGeometry();
verticalTailGeometry.setAttribute("position", new THREE.Float32BufferAttribute([
  -5.25, 0.55, -0.07, -5.25, 0.55, 0.07, -4.65, 3.25, 0,
  -4.65, 3.25, 0, -3.65, 0.72, -0.07, -3.65, 0.72, 0.07,
  -5.25, 0.55, -0.07, -4.65, 3.25, 0, -3.65, 0.72, -0.07,
  -5.25, 0.55, 0.07, -3.65, 0.72, 0.07, -4.65, 3.25, 0,
], 3));
verticalTailGeometry.computeVertexNormals();
const verticalTail = new THREE.Mesh(verticalTailGeometry, stripeMaterial);
verticalTail.castShadow = true;
aircraft.add(verticalTail);

const fanGroups = [];
function createEngine(side) {
  const engine = new THREE.Group();
  engine.position.set(0.15, -1.08, side * 3.95);
  const nacelle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.67, 1.9, 40, 3, true),
    fuselageMaterial,
  );
  nacelle.rotation.z = Math.PI / 2;
  nacelle.castShadow = true;
  nacelle.receiveShadow = true;
  engine.add(nacelle);

  const intakeRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.58, 0.095, 16, 48),
    wingMaterial,
  );
  intakeRing.position.x = 0.97;
  intakeRing.rotation.y = Math.PI / 2;
  intakeRing.castShadow = true;
  engine.add(intakeRing);

  const intake = new THREE.Mesh(new THREE.CircleGeometry(0.49, 40), darkMetal);
  intake.position.x = 0.982;
  intake.rotation.y = Math.PI / 2;
  engine.add(intake);

  const fanGroup = new THREE.Group();
  fanGroup.position.x = 1.0;
  const fanBladeMaterial = new THREE.MeshStandardMaterial({
    color: 0x9ba8b2,
    metalness: 0.9,
    roughness: 0.24,
  });
  for (let i = 0; i < 12; i += 1) {
    const bladePivot = new THREE.Group();
    bladePivot.rotation.x = i * Math.PI / 6;
    const blade = box(
      [0.025, 0.27, 0.065],
      [0.016, 0.21, 0],
      fanBladeMaterial,
      bladePivot,
      [0, 0, -0.18],
    );
    blade.castShadow = false;
    fanGroup.add(bladePivot);
  }
  const hub = new THREE.Mesh(new THREE.SphereGeometry(0.13, 20, 10), darkMetal);
  hub.position.x = 0.035;
  fanGroup.add(hub);
  const spinner = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.28, 20),
    panelLineMaterial,
  );
  spinner.position.x = 0.12;
  spinner.rotation.z = -Math.PI / 2;
  fanGroup.add(spinner);
  engine.add(fanGroup);
  fanGroups.push(fanGroup);

  const pylon = box([1.15, 0.52, 0.2], [-0.25, 0.58, 0], wingMaterial, engine, [0, 0, -0.18]);
  pylon.castShadow = true;
  aircraft.add(engine);
}
createEngine(1);
createEngine(-1);

const redLightMaterial = new THREE.MeshBasicMaterial({ color: 0xff2b25 });
const greenLightMaterial = new THREE.MeshBasicMaterial({ color: 0x42ff8e });
const rightNav = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 8), greenLightMaterial);
rightNav.position.set(-1.3, -0.2, 7.42);
const leftNav = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 8), redLightMaterial);
leftNav.position.set(-1.3, -0.2, -7.42);
aircraft.add(rightNav, leftNav);

const cabin = new THREE.Group();
aircraft.add(cabin);
const cabinWallMaterial = new THREE.MeshStandardMaterial({
  color: 0xe7e0d4,
  roughness: 0.78,
  side: THREE.DoubleSide,
});
const cabinTrimMaterial = new THREE.MeshStandardMaterial({ color: 0xb9ad9d, roughness: 0.7 });
const carpetMaterial = new THREE.MeshStandardMaterial({ color: 0x1f344d, roughness: 0.95 });
const seatMaterial = new THREE.MeshStandardMaterial({ color: 0x263f5a, roughness: 0.58 });
const seatAccentMaterial = new THREE.MeshStandardMaterial({ color: 0x8eb1c8, roughness: 0.62 });
const lightMaterial = new THREE.MeshStandardMaterial({
  color: 0xffe6c0,
  emissive: 0xffb873,
  emissiveIntensity: 2.35,
  roughness: 0.42,
});

box([8.4, 0.1, 1.55], [-0.3, -0.83, 0], cabinWallMaterial, cabin);
box([8.4, 0.012, 0.32], [-0.3, -0.77, 0], carpetMaterial, cabin);
box([8.4, 0.12, 0.86], [-0.3, 0.84, 0], cabinWallMaterial, cabin);
box([8.3, 1.38, 0.09], [-0.35, -0.08, -0.87], cabinWallMaterial, cabin);
box([8.3, 0.38, 0.09], [-0.35, -0.57, 0.87], cabinWallMaterial, cabin);
box([8.3, 0.22, 0.09], [-0.35, 0.7, 0.82], cabinWallMaterial, cabin);

for (const side of [-1, 1]) {
  box([8.0, 0.3, 0.22], [-0.25, 0.59, side * 0.58], cabinTrimMaterial, cabin, [0, 0, side * 0.08]);
  box([7.8, 0.035, 0.08], [-0.25, 0.82, side * 0.3], lightMaterial, cabin);
}

const cabinWindowXs = [-3.35, -2.45, -1.55, -0.65, 0.55, 1.45, 2.35, 3.25];
for (const x of cabinWindowXs) {
  for (const side of [-1, 1]) {
    const frameParent = cabin;
    const z = side * 0.88;
    box([0.1, 1.08, 0.075], [x - 0.42, 0.08, z], cabinTrimMaterial, frameParent);
    box([0.1, 1.08, 0.075], [x + 0.42, 0.08, z], cabinTrimMaterial, frameParent);
    box([0.74, 0.12, 0.075], [x, 0.57, z], cabinTrimMaterial, frameParent);
    box([0.74, 0.12, 0.075], [x, -0.42, z], cabinTrimMaterial, frameParent);
    const innerGlass = new THREE.Mesh(new THREE.ShapeGeometry(roundedRectShape(0.62, 0.82, 0.2), 16), glassMaterial);
    innerGlass.position.set(x, 0.08, z + side * 0.008);
    if (side < 0) innerGlass.rotation.y = Math.PI;
    frameParent.add(innerGlass);
  }
}

const seatRows = [-3.05, -2.15, -1.25, -0.35, 1.45, 2.35, 3.25];
for (const x of seatRows) {
  for (const side of [-1, 1]) {
    const z = side * 0.53;
    box([0.22, 0.84, 0.4], [x, -0.21, z], seatMaterial, cabin, [0, 0, -0.08]);
    box([0.56, 0.16, 0.42], [x + 0.22, -0.55, z], seatMaterial, cabin, [0, 0, -0.03]);
    box([0.08, 0.24, 0.38], [x - 0.12, 0.24, z], seatAccentMaterial, cabin);
    box([0.5, 0.055, 0.055], [x + 0.1, -0.39, z - side * 0.25], darkMetal, cabin);
  }
}

for (const x of [-3, -1.2, 0.6, 2.4]) {
  const cabinLight = new THREE.PointLight(0xffc990, 1.3, 3.0, 2);
  cabinLight.position.set(x, 0.68, 0);
  cabin.add(cabinLight);
}

const path = {
  aisle: {
    position: [
      new THREE.Vector3(-3.62, 0.11, 0),
      new THREE.Vector3(-2.35, 0.14, -0.01),
      new THREE.Vector3(-0.7, 0.14, 0),
      new THREE.Vector3(0.15, 0.13, 0.02),
    ],
    target: [
      new THREE.Vector3(1.4, 0.06, 0),
      new THREE.Vector3(2.15, 0.07, 0),
      new THREE.Vector3(2.35, 0.08, 0.18),
      new THREE.Vector3(0.6, 0.1, 0.9),
    ],
  },
  window: {
    position: [
      new THREE.Vector3(0.15, 0.13, 0.02),
      new THREE.Vector3(0.46, 0.15, 0.25),
      new THREE.Vector3(0.56, 0.13, 0.84),
      new THREE.Vector3(0.55, 0.14, 1.18),
    ],
    target: [
      new THREE.Vector3(0.6, 0.1, 0.9),
      new THREE.Vector3(0.58, 0.05, 1.55),
      new THREE.Vector3(0.45, -0.12, 2.75),
      new THREE.Vector3(0.3, -0.28, 3.8),
    ],
  },
  wing: {
    position: [
      new THREE.Vector3(0.55, 0.14, 1.18),
      new THREE.Vector3(1.78, 0.54, 1.95),
      new THREE.Vector3(2.18, 0.12, 2.85),
      new THREE.Vector3(1.78, -0.35, 3.34),
    ],
    target: [
      new THREE.Vector3(0.3, -0.28, 3.8),
      new THREE.Vector3(0.35, -0.8, 3.95),
      new THREE.Vector3(0.85, -1.02, 3.98),
      new THREE.Vector3(1.05, -1.06, 3.96),
    ],
  },
  reveal: {
    position: [
      new THREE.Vector3(1.78, -0.35, 3.34),
      new THREE.Vector3(2.65, 0.8, 6.9),
      new THREE.Vector3(7.5, 2.75, 12.8),
      new THREE.Vector3(11.8, 4.65, 16.8),
    ],
    target: [
      new THREE.Vector3(1.05, -1.06, 3.96),
      new THREE.Vector3(0.35, -0.45, 2.1),
      new THREE.Vector3(0.15, -0.2, 0.3),
      new THREE.Vector3(0.2, -0.12, 0),
    ],
  },
};
const cameraPosition = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();

function setCamera(time) {
  if (time <= 0.95) {
    const u = smoothstep(time / 0.95);
    cubicBezier(...path.aisle.position, u, cameraPosition);
    cubicBezier(...path.aisle.target, u, cameraTarget);
    camera.fov = THREE.MathUtils.lerp(64, 62, smoothstep(u));
  } else if (time <= 1.55) {
    const u = smoothstep((time - 0.95) / 0.6);
    cubicBezier(...path.window.position, u, cameraPosition);
    cubicBezier(...path.window.target, u, cameraTarget);
    camera.fov = THREE.MathUtils.lerp(62, 70, smoothstep(u));
  } else if (time <= 3.08) {
    const u = smoothstep((time - 1.55) / (3.08 - 1.55));
    cubicBezier(...path.wing.position, u, cameraPosition);
    cubicBezier(...path.wing.target, u, cameraTarget);
    camera.fov = THREE.MathUtils.lerp(70, 64, smoothstep(u));
  } else {
    const u = smoothstep((time - 3.08) / (DURATION - 3.08));
    cubicBezier(...path.reveal.position, u, cameraPosition);
    cubicBezier(...path.reveal.target, u, cameraTarget);
    camera.fov = THREE.MathUtils.lerp(64, 48, smoothstep(u));
  }
  camera.position.copy(cameraPosition);
  camera.lookAt(cameraTarget);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

let currentTime = 0;
let paused = true;

function updateScene(time) {
  currentTime = Math.max(0, Math.min(DURATION, Number.isFinite(time) ? time : 0));
  setCamera(currentTime);
  for (let i = 0; i < fanGroups.length; i += 1) {
    fanGroups[i].rotation.x = currentTime * 18 + i * 0.07;
  }
  cloudLayer.position.x = -currentTime * 0.32;
  const blink = 0.72 + 0.28 * Math.sin(currentTime * Math.PI * 3.5);
  redLightMaterial.color.setRGB(blink, 0.025, 0.018);
  greenLightMaterial.color.setRGB(0.02, blink, 0.18);
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}

function pause() {
  paused = true;
  updateScene(currentTime);
}

function seek(seconds) {
  paused = true;
  updateScene(Number(seconds));
}

function getCameraState() {
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

window.reconstruction = { pause, seek, getCameraState };
window.sceneMetadata = { width: WIDTH, height: HEIGHT, fps: FPS, frames: FRAME_COUNT, duration: DURATION };
window.sceneReady = false;

updateScene(0);
window.sceneReady = true;

// Keep the page visually stable if a browser schedules animation frames.
function idleRender() {
  if (!paused) updateScene(currentTime);
}
renderer.setAnimationLoop(idleRender);
