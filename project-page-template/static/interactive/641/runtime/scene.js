import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAMES = 124;
const DURATION = FRAMES / FPS;

const canvas = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050812);
scene.fog = new THREE.FogExp2(0x07101a, 0.023);

const camera = new THREE.PerspectiveCamera(48, WIDTH / HEIGHT, 0.08, 120);
camera.up.set(0, 1, 0);

const mats = {
  outsole: new THREE.MeshStandardMaterial({
    color: 0x263340,
    emissive: 0x03070c,
    emissiveIntensity: 0.5,
    roughness: 0.63,
    metalness: 0.12,
  }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x061015, roughness: 0.78, metalness: 0.06 }),
  midsole: new THREE.MeshPhysicalMaterial({
    color: 0xbfd3d5,
    roughness: 0.41,
    metalness: 0.02,
    clearcoat: 0.32,
    clearcoatRoughness: 0.46,
  }),
  upper: new THREE.MeshPhysicalMaterial({
    color: 0x5c226f,
    roughness: 0.49,
    metalness: 0.04,
    clearcoat: 0.18,
    clearcoatRoughness: 0.65,
  }),
  coral: new THREE.MeshPhysicalMaterial({ color: 0xd91f43, roughness: 0.41, clearcoat: 0.46 }),
  orange: new THREE.MeshPhysicalMaterial({ color: 0xf06417, roughness: 0.40, clearcoat: 0.42 }),
  cyan: new THREE.MeshPhysicalMaterial({
    color: 0x00aeb3,
    emissive: 0x042d31,
    emissiveIntensity: 0.45,
    roughness: 0.34,
    clearcoat: 0.72,
  }),
  violet: new THREE.MeshPhysicalMaterial({ color: 0x892bbd, roughness: 0.34, clearcoat: 0.45 }),
  lace: new THREE.MeshPhysicalMaterial({ color: 0xdbe8ea, roughness: 0.34, clearcoat: 0.24 }),
  darkFabric: new THREE.MeshStandardMaterial({ color: 0x11131f, roughness: 0.91 }),
  silver: new THREE.MeshStandardMaterial({ color: 0xbfe7e7, roughness: 0.24, metalness: 0.68 }),
  window: new THREE.MeshPhysicalMaterial({
    color: 0x102b32,
    emissive: 0x0b333a,
    emissiveIntensity: 0.8,
    roughness: 0.18,
    metalness: 0.2,
    transmission: 0.18,
    transparent: true,
    opacity: 0.94,
  }),
};

function makeLoftGeometry(sections, radialSegments = 24) { window.__bfTrace?.add(80);
  const positions = [];
  const indices = [];
  const ringCount = sections.length;

  for (const section of sections) {
    const [x, centerY, radiusY, radiusZ] = section;
    for (let j = 0; j < radialSegments; j += 1) {
      const angle = (j / radialSegments) * Math.PI * 2;
      const sideSoftening = 0.92 + 0.08 * Math.abs(Math.cos(angle));
      positions.push(
        x,
        centerY + Math.sin(angle) * radiusY,
        Math.cos(angle) * radiusZ * sideSoftening,
      );
    }
  }

  for (let i = 0; i < ringCount - 1; i += 1) {
    for (let j = 0; j < radialSegments; j += 1) {
      const next = (j + 1) % radialSegments;
      const a = i * radialSegments + j;
      const b = i * radialSegments + next;
      const c = (i + 1) * radialSegments + next;
      const d = (i + 1) * radialSegments + j;
      indices.push(a, b, d, b, c, d);
    }
  }

  const startCenter = positions.length / 3;
  positions.push(sections[0][0], sections[0][1], 0);
  const endCenter = positions.length / 3;
  const last = sections[sections.length - 1];
  positions.push(last[0], last[1], 0);

  for (let j = 0; j < radialSegments; j += 1) {
    const next = (j + 1) % radialSegments;
    indices.push(startCenter, next, j);
    const offset = (ringCount - 1) * radialSegments;
    indices.push(endCenter, offset + j, offset + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function addMesh(parent, geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) { window.__bfTrace?.add(130);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addSideShape(parent, points, z, material, scale = 1) { window.__bfTrace?.add(140);
  const shape = new THREE.Shape();
  shape.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i += 1) shape.lineTo(points[i][0], points[i][1]);
  shape.closePath();
  const geometry = new THREE.ShapeGeometry(shape);
  for (const side of [-1, 1]) {
    const mesh = addMesh(parent, geometry, material, [0, 0, side * z]);
    mesh.scale.set(scale, scale, scale);
    if (side < 0) mesh.rotation.y = Math.PI;
  }
}

function addTube(parent, points, radius, material, closed = false, segments = 48) { window.__bfTrace?.add(153);
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'centripetal');
  return addMesh(parent, new THREE.TubeGeometry(curve, segments, radius, 8, closed), material);
}

function hash01(value) { window.__bfTrace?.add(158);
  const n = Math.sin(value * 127.1 + 311.7) * 43758.5453123;
  return n - Math.floor(n);
}

const world = new THREE.Group();
scene.add(world);

const trackMaterial = new THREE.ShaderMaterial({
  uniforms: {
    baseColor: { value: new THREE.Color(0x3a171d) },
    laneColor: { value: new THREE.Color(0xd38b79) },
  },
  vertexShader: `
    varying vec3 vWorld;
    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      vWorld = world.xyz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `,
  fragmentShader: `
    varying vec3 vWorld;
    uniform vec3 baseColor;
    uniform vec3 laneColor;
    float hash(vec2 p) {
      return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
    }
    void main() {
      float coarse = hash(floor(vWorld.xz * 12.0));
      float fine = hash(floor(vWorld.xz * 48.0));
      float lane = smoothstep(0.13, 0.02, abs(mod(vWorld.z + 4.0, 8.0) - 4.0));
      vec3 grain = baseColor * (0.66 + coarse * 0.28 + fine * 0.1);
      vec3 color = mix(grain, laneColor, lane * 0.72);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});
const track = addMesh(
  world,
  new THREE.PlaneGeometry(80, 80, 1, 1),
  trackMaterial,
  [0, 0, 0],
  [-Math.PI / 2, 0, 0],
);
track.receiveShadow = true;
track.castShadow = false;

const pebbleGeometry = new THREE.DodecahedronGeometry(0.035, 0);
const pebbleMaterial = new THREE.MeshStandardMaterial({ color: 0x6b3032, roughness: 1 });
const pebbles = new THREE.InstancedMesh(pebbleGeometry, pebbleMaterial, 420);
const dummy = new THREE.Object3D();
for (let i = 0; i < 420; i += 1) {
  const x = (hash01(i + 1) - 0.5) * 27;
  const z = (hash01(i + 501) - 0.5) * 22;
  const size = 0.5 + hash01(i + 947) * 1.2;
  dummy.position.set(x, 0.025 + size * 0.012, z);
  dummy.rotation.set(hash01(i + 71) * Math.PI, hash01(i + 97) * Math.PI, 0);
  dummy.scale.setScalar(size);
  dummy.updateMatrix();
  pebbles.setMatrixAt(i, dummy.matrix);
}
pebbles.receiveShadow = true;
world.add(pebbles);

const stageGlow = addMesh(
  world,
  new THREE.CircleGeometry(5.8, 64),
  new THREE.MeshBasicMaterial({
    color: 0x5b1735,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
  [0, 0.018, 0],
  [-Math.PI / 2, 0, 0],
);
stageGlow.castShadow = false;

const shoePivot = new THREE.Group();
shoePivot.position.set(0, 2.65, 0);
world.add(shoePivot);

const shoe = new THREE.Group();
shoePivot.add(shoe);

const outsoleSections = [
  [-3.78, -0.65, 0.22, 0.50],
  [-3.48, -0.61, 0.32, 0.92],
  [-2.55, -0.61, 0.34, 1.16],
  [-1.35, -0.65, 0.30, 1.30],
  [0.05, -0.67, 0.26, 1.36],
  [1.55, -0.68, 0.25, 1.31],
  [2.75, -0.64, 0.27, 1.10],
  [3.55, -0.57, 0.25, 0.65],
  [3.92, -0.52, 0.12, 0.22],
];
addMesh(shoe, makeLoftGeometry(outsoleSections), mats.outsole);

const midsoleSections = outsoleSections.map(([x, y, ry, rz], index) => [
  x,
  y + 0.25,
  ry * (index === 0 || index === outsoleSections.length - 1 ? 0.74 : 0.82),
  rz * 0.97,
]);
addMesh(shoe, makeLoftGeometry(midsoleSections), mats.midsole);

const upperSections = [
  [-3.52, 0.08, 0.60, 0.46],
  [-3.22, 0.18, 0.94, 0.91],
  [-2.55, 0.24, 1.02, 1.08],
  [-1.65, 0.20, 0.86, 1.19],
  [-0.55, 0.10, 0.76, 1.28],
  [0.65, 0.00, 0.63, 1.31],
  [1.75, -0.12, 0.51, 1.25],
  [2.75, -0.25, 0.37, 1.06],
  [3.48, -0.34, 0.25, 0.66],
  [3.80, -0.39, 0.11, 0.25],
];
addMesh(shoe, makeLoftGeometry(upperSections, 30), mats.upper);

addSideShape(shoe, [
  [-3.42, -0.28], [-3.17, 0.52], [-2.75, 0.88], [-2.25, 0.70],
  [-2.24, 0.18], [-2.62, -0.18],
], 0.92, mats.coral);
addSideShape(shoe, [
  [-2.22, -0.15], [-1.48, 0.52], [-0.55, 0.70], [0.20, 0.52],
  [0.82, -0.12], [0.08, 0.08], [-0.60, 0.02], [-1.36, -0.35],
], 1.19, mats.violet);
addSideShape(shoe, [
  [-1.75, 0.02], [-0.82, 0.33], [-0.14, 0.25], [0.74, -0.09],
  [1.52, -0.19], [0.80, 0.04], [0.02, 0.55], [-0.84, 0.70],
], 1.235, mats.cyan);
addSideShape(shoe, [
  [1.34, -0.22], [2.05, 0.23], [2.92, 0.04], [3.43, -0.34],
  [2.66, -0.16], [1.92, -0.08],
], 1.08, mats.orange);

for (const side of [-1, 1]) {
  addTube(shoe, [
    [-3.32, 0.60, side * 0.80],
    [-3.02, 1.05, side * 0.77],
    [-2.58, 1.17, side * 0.72],
  ], 0.075, mats.orange);
  addTube(shoe, [
    [-2.40, -0.25, side * 1.08],
    [-1.50, -0.43, side * 1.27],
    [-0.45, -0.50, side * 1.31],
    [0.75, -0.53, side * 1.32],
    [2.05, -0.48, side * 1.18],
  ], 0.052, mats.cyan);
  addTube(shoe, [
    [-3.38, -0.12, side * 0.84],
    [-3.25, 0.52, side * 0.96],
    [-2.83, 0.88, side * 1.00],
    [-2.38, 0.74, side * 1.06],
  ], 0.045, mats.orange);
  addTube(shoe, [
    [2.28, -0.45, side * 1.12],
    [2.92, -0.41, side * 0.92],
    [3.52, -0.43, side * 0.53],
  ], 0.068, mats.silver);
}

const collar = addMesh(
  shoe,
  new THREE.SphereGeometry(1, 40, 20),
  mats.darkFabric,
  [-2.58, 0.95, 0],
  [0, 0, -0.10],
);
collar.scale.set(0.80, 0.19, 0.74);
const collarRim = addMesh(
  shoe,
  new THREE.TorusGeometry(0.73, 0.095, 12, 48),
  mats.coral,
  [-2.58, 0.98, 0],
  [Math.PI / 2, 0, -0.10],
);
collarRim.scale.set(1.08, 1, 0.92);

const tongue = addMesh(
  shoe,
  new THREE.BoxGeometry(2.75, 0.12, 1.06, 8, 1, 4),
  mats.darkFabric,
  [-0.75, 0.84, 0],
  [0, 0, -0.20],
);
tongue.geometry.translate(0, 0, 0);

for (let i = 0; i < 6; i += 1) {
  const x = -1.36 + i * 0.47;
  const y = 0.89 - i * 0.075;
  const width = 0.69 + i * 0.08;
  const laceMaterial = i === 1 || i === 4 ? mats.orange : mats.lace;
  addTube(shoe, [
    [x - 0.13, y - 0.02, -width],
    [x, y + 0.16, 0],
    [x + 0.13, y - 0.01, width],
  ], 0.052, laceMaterial, false, 18);
  for (const side of [-1, 1]) {
    addMesh(
      shoe,
      new THREE.TorusGeometry(0.09, 0.027, 8, 20),
      mats.silver,
      [x, y - 0.035, side * width],
    );
  }
}

addMesh(
  shoe,
  new THREE.BoxGeometry(0.48, 0.08, 0.72),
  mats.coral,
  [-1.92, 1.16, 0],
  [0, 0, -0.1],
);

for (const side of [-1, 1]) {
  for (const x of [-2.95, -2.10]) {
    const inset = addMesh(
      shoe,
      new THREE.CapsuleGeometry(0.20, 0.74, 6, 16),
      mats.window,
      [x, -0.47, side * 1.10],
      [0, 0, Math.PI / 2],
    );
    inset.scale.set(0.52, 1, 0.23);
    addMesh(
      shoe,
      new THREE.CylinderGeometry(0.075, 0.075, 0.66, 16),
      mats.cyan,
      [x, -0.47, side * 1.115],
      [0, 0, Math.PI / 2],
    );
  }
}

for (let row = 0; row < 3; row += 1) {
  for (let i = 0; i < 10; i += 1) {
    const x = -0.85 + i * 0.32;
    const y = 0.14 + row * 0.17 - Math.max(0, x) * 0.045;
    const z = 1.275 - row * 0.012;
    for (const side of [-1, 1]) {
      const dot = addMesh(
        shoe,
        new THREE.SphereGeometry(0.026, 8, 6),
        mats.darkFabric,
        [x, y, side * z],
      );
      dot.scale.set(1.6, 1, 0.35);
    }
  }
}

const lugGeometry = new THREE.CapsuleGeometry(0.15, 0.48, 4, 10);
for (let row = 0; row < 2; row += 1) {
  for (let i = 0; i < 8; i += 1) {
    const x = -3.05 + i * 0.86;
    const z = (row === 0 ? -1 : 1) * (0.47 + 0.10 * Math.cos(i));
    const lug = addMesh(
      shoe,
      lugGeometry,
      i % 3 === 1 ? mats.cyan : i % 3 === 2 ? mats.orange : mats.rubber,
      [x, -0.94 + 0.03 * Math.cos(i * 1.7), z],
      [0, 0, Math.PI / 2],
    );
    lug.scale.set(0.72, 1, 0.72);
  }
}
for (const [index, x] of [-2.75, -1.85, -0.90, 0.10, 1.10, 2.08, 2.88].entries()) {
  addMesh(
    shoe,
    new THREE.BoxGeometry(0.58, 0.10, index % 2 === 0 ? 1.08 : 0.86),
    index === 2 || index === 5 ? mats.orange : index === 3 ? mats.cyan : mats.rubber,
    [x, -1.01 + 0.025 * Math.cos(index), index % 2 === 0 ? 0.04 : -0.05],
    [0, 0.16 * Math.sin(x), 0],
  );
}

const heelTab = addMesh(
  shoe,
  new THREE.CapsuleGeometry(0.15, 0.42, 6, 16),
  mats.orange,
  [-3.42, 0.67, 0],
  [0, 0, 0.10],
);
heelTab.scale.set(0.48, 1, 1.35);

const undersideMark = addMesh(
  shoe,
  new THREE.TorusGeometry(0.56, 0.11, 10, 40),
  mats.cyan,
  [0.55, -0.98, 0],
  [Math.PI / 2, 0, 0],
);
undersideMark.scale.set(1.55, 1, 0.84);

const keyLight = new THREE.SpotLight(0xffeadb, 285, 35, Math.PI / 5.2, 0.45, 1.4);
keyLight.position.set(2.5, 10, 7);
keyLight.target.position.set(0, 2.4, 0);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.bias = -0.0002;
scene.add(keyLight, keyLight.target);

const cyanRim = new THREE.SpotLight(0x28e5ff, 245, 30, Math.PI / 4.6, 0.58, 1.3);
cyanRim.position.set(-7, 5.5, -6);
cyanRim.target.position.set(-1, 2.3, 0);
scene.add(cyanRim, cyanRim.target);

const magentaRim = new THREE.SpotLight(0xff326d, 190, 25, Math.PI / 4.3, 0.64, 1.35);
magentaRim.position.set(6, 3.2, -5);
magentaRim.target.position.set(1.4, 2.2, 0);
scene.add(magentaRim, magentaRim.target);

const heelLight = new THREE.PointLight(0xff7a31, 52, 9, 1.6);
heelLight.position.set(-4.5, 2.0, 2.0);
scene.add(heelLight);

const underFill = new THREE.PointLight(0x55dce1, 62, 11, 1.55);
underFill.position.set(0.5, 0.72, 3.8);
scene.add(underFill);

scene.add(new THREE.HemisphereLight(0xa7c5e2, 0x271018, 0.92));
scene.add(new THREE.AmbientLight(0x27364b, 0.48));

const cameraKeys = [
  { time: 0.0, position: [0.62, 0.66, 5.36], target: [0.28, 1.70, 0], fov: 48 },
  { time: 0.72, position: [-2.18, 1.04, 4.45], target: [-1.15, 2.02, 0], fov: 47 },
  { time: 1.65, position: [-5.40, 2.30, 2.92], target: [-2.58, 2.47, 0], fov: 44 },
  { time: 2.45, position: [-4.72, 4.56, -4.16], target: [-1.42, 2.68, 0], fov: 43 },
  { time: 3.45, position: [1.18, 5.18, -5.96], target: [0.14, 2.63, 0], fov: 42 },
  { time: 4.20, position: [7.55, 3.92, -3.42], target: [1.08, 2.41, 0], fov: 44 },
  { time: DURATION, position: [4.65, 4.10, 8.70], target: [0.05, 2.48, 0], fov: 38 },
];

const cameraPosition = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const from = new THREE.Vector3();
const to = new THREE.Vector3();
const tangentFrom = new THREE.Vector3();
const tangentTo = new THREE.Vector3();

function smootherStep(value) { window.__bfTrace?.add(503);
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function hermiteVector(index, property, mix, output) { window.__bfTrace?.add(508);
  const previous = cameraKeys[Math.max(0, index - 1)];
  const current = cameraKeys[index];
  const next = cameraKeys[index + 1];
  const following = cameraKeys[Math.min(cameraKeys.length - 1, index + 2)];
  const segmentDuration = next.time - current.time;
  const mix2 = mix * mix;
  const mix3 = mix2 * mix;

  from.fromArray(current[property]);
  to.fromArray(next[property]);
  tangentFrom
    .fromArray(next[property])
    .sub(new THREE.Vector3().fromArray(previous[property]))
    .multiplyScalar(segmentDuration / (next.time - previous.time));
  tangentTo
    .fromArray(following[property])
    .sub(new THREE.Vector3().fromArray(current[property]))
    .multiplyScalar(segmentDuration / (following.time - current.time));

  output
    .copy(from)
    .multiplyScalar(2 * mix3 - 3 * mix2 + 1)
    .addScaledVector(tangentFrom, mix3 - 2 * mix2 + mix)
    .addScaledVector(to, -2 * mix3 + 3 * mix2)
    .addScaledVector(tangentTo, mix3 - mix2);
}

function hermiteScalar(index, property, mix) { window.__bfTrace?.add(536);
  const previous = cameraKeys[Math.max(0, index - 1)];
  const current = cameraKeys[index];
  const next = cameraKeys[index + 1];
  const following = cameraKeys[Math.min(cameraKeys.length - 1, index + 2)];
  const segmentDuration = next.time - current.time;
  const tangentA = (next[property] - previous[property])
    * segmentDuration / (next.time - previous.time);
  const tangentB = (following[property] - current[property])
    * segmentDuration / (following.time - current.time);
  const mix2 = mix * mix;
  const mix3 = mix2 * mix;
  return current[property] * (2 * mix3 - 3 * mix2 + 1)
    + tangentA * (mix3 - 2 * mix2 + mix)
    + next[property] * (-2 * mix3 + 3 * mix2)
    + tangentB * (mix3 - mix2);
}

function interpolateCamera(time) { window.__bfTrace?.add(554);
  let index = cameraKeys.length - 2;
  for (let i = 0; i < cameraKeys.length - 1; i += 1) {
    if (time <= cameraKeys[i + 1].time) {
      index = i;
      break;
    }
  }
  const a = cameraKeys[index];
  const b = cameraKeys[index + 1];
  const mix = THREE.MathUtils.clamp((time - a.time) / (b.time - a.time), 0, 1);
  hermiteVector(index, 'position', mix, cameraPosition);
  hermiteVector(index, 'target', mix, cameraTarget);
  camera.position.copy(cameraPosition);
  camera.fov = hermiteScalar(index, 'fov', mix);
  camera.updateProjectionMatrix();
  camera.lookAt(cameraTarget);
}

let currentTime = 0;

function updateScene(time) { window.__bfTrace?.add(575);
  const clamped = THREE.MathUtils.clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  currentTime = clamped;
  const progress = clamped / DURATION;

  shoePivot.position.y = 2.65 + 0.075 * Math.sin(progress * Math.PI * 2 + 0.35);
  shoePivot.rotation.x = -0.035 + 0.055 * Math.sin(progress * Math.PI * 1.4);
  shoePivot.rotation.y = -0.12 + progress * 0.34 + 0.055 * Math.sin(progress * Math.PI * 2);
  shoePivot.rotation.z = -0.035 + 0.055 * Math.sin(progress * Math.PI * 1.65);

  stageGlow.material.opacity = 0.18 + 0.08 * Math.sin(progress * Math.PI);
  heelLight.intensity = 44 + 12 * Math.sin(progress * Math.PI * 2 + 0.6);
  interpolateCamera(clamped);

  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}

function cameraState() { window.__bfTrace?.add(593);
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

window.reconstruction = {
  pause() {
    updateScene(currentTime);
  },
  seek(seconds) {
    updateScene(seconds);
  },
  getCameraState() {
    return cameraState();
  },
};

updateScene(0);
window.__RECONSTRUCTION_READY__ = true;
