import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

const canvas = document.createElement("canvas");
canvas.width = WIDTH;
canvas.height = HEIGHT;
document.body.appendChild(canvas);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb9c8d0);
scene.fog = new THREE.Fog(0xb9c8d0, 24, 52);

const camera = new THREE.PerspectiveCamera(62, WIDTH / HEIGHT, 0.08, 80);
camera.up.set(0, 1, 0);

const materials = {
  concrete: new THREE.MeshStandardMaterial({
    color: 0x777976,
    roughness: 0.88,
    metalness: 0.02,
  }),
  concreteDark: new THREE.MeshStandardMaterial({
    color: 0x4b4e4d,
    roughness: 0.93,
  }),
  floor: new THREE.MeshStandardMaterial({
    color: 0x686b69,
    roughness: 0.46,
    metalness: 0.08,
  }),
  steel: new THREE.MeshStandardMaterial({
    color: 0x1c2427,
    roughness: 0.3,
    metalness: 0.82,
  }),
  black: new THREE.MeshStandardMaterial({
    color: 0x111719,
    roughness: 0.38,
    metalness: 0.42,
  }),
  walnut: new THREE.MeshStandardMaterial({
    color: 0x70452c,
    roughness: 0.48,
  }),
  walnutLight: new THREE.MeshStandardMaterial({
    color: 0xa36a3f,
    roughness: 0.42,
  }),
  leather: new THREE.MeshStandardMaterial({
    color: 0x95512f,
    roughness: 0.5,
  }),
  leatherDark: new THREE.MeshStandardMaterial({
    color: 0x603725,
    roughness: 0.54,
  }),
  cream: new THREE.MeshStandardMaterial({
    color: 0xd5c9ae,
    roughness: 0.78,
  }),
  rug: new THREE.MeshStandardMaterial({
    color: 0x30383a,
    roughness: 0.98,
  }),
  plant: new THREE.MeshStandardMaterial({
    color: 0x315d45,
    roughness: 0.72,
  }),
  plantLight: new THREE.MeshStandardMaterial({
    color: 0x4f7853,
    roughness: 0.72,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xb9d0d4,
    roughness: 0.08,
    transmission: 0.35,
    transparent: true,
    opacity: 0.26,
    metalness: 0,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  window: new THREE.MeshPhysicalMaterial({
    color: 0xa9c7d1,
    roughness: 0.12,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide,
    depthWrite: false,
  }),
  brass: new THREE.MeshStandardMaterial({
    color: 0xa5773d,
    roughness: 0.3,
    metalness: 0.78,
  }),
  white: new THREE.MeshStandardMaterial({
    color: 0xe7e1d4,
    roughness: 0.68,
  }),
  warmGlow: new THREE.MeshStandardMaterial({
    color: 0xffd59a,
    emissive: 0xff9d45,
    emissiveIntensity: 4.2,
    roughness: 0.4,
  }),
};

function box(name, size, position, material, cast = true, receive = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  scene.add(mesh);
  return mesh;
}

function cylinder(
  name,
  radiusTop,
  radiusBottom,
  height,
  position,
  material,
  radialSegments = 20,
) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      radialSegments,
    ),
    material,
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function roundedBox(name, size, position, radius, material) {
  const [width, height, depth] = size;
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(
    x + width,
    y + height,
    x + width - radius,
    y + height,
  );
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: radius * 0.28,
    bevelThickness: radius * 0.28,
  });
  geometry.center();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function addLine(start, end, material, radius = 0.025) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const midpoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), 10),
    material,
  );
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );
  mesh.castShadow = true;
  scene.add(mesh);
  return mesh;
}

// Architectural shell: a double-height concrete volume, opened at the front.
box("polished concrete floor", [14, 0.18, 18], [0, -0.09, 0], materials.floor);
box("rear concrete wall", [14, 8.8, 0.32], [0, 4.4, -8.75], materials.concrete);
box("right concrete wall", [0.34, 8.8, 18], [6.83, 4.4, 0], materials.concrete);
box("ceiling", [14, 0.28, 18], [0, 8.75, 0], materials.concreteDark);

// Left wall is a six-bay double-height window grid.
box("left base", [0.36, 0.42, 18], [-6.82, 0.21, 0], materials.concreteDark);
box("left header", [0.36, 0.42, 18], [-6.82, 8.5, 0], materials.concreteDark);
for (let bay = 0; bay <= 6; bay += 1) {
  const z = -8.65 + bay * 2.9;
  box(`window mullion ${bay}`, [0.28, 8.2, 0.18], [-6.76, 4.35, z], materials.steel);
  if (bay < 6) {
    box(
      `window glass ${bay}`,
      [0.06, 7.95, 2.7],
      [-6.78, 4.34, z + 1.45],
      materials.window,
      false,
      false,
    );
  }
}
box("window transom", [0.24, 0.17, 17.4], [-6.72, 4.42, 0], materials.steel);

// Exterior geometry adds depth beyond the glazing without image assets.
const cityMaterial = new THREE.MeshStandardMaterial({
  color: 0x778991,
  roughness: 0.95,
});
for (let i = 0; i < 11; i += 1) {
  const z = -12 + i * 2.45;
  const height = 2.2 + ((i * 17) % 6) * 0.65;
  box(
    `distant building ${i}`,
    [2.8 + (i % 3) * 0.6, height, 1.8],
    [-12.5 - (i % 2) * 2.8, height / 2 - 0.1, z],
    cityMaterial,
    false,
    false,
  );
}

// Exposed concrete ceiling beams reinforce the industrial structure.
for (let z = -6.8; z <= 7.2; z += 3.5) {
  box(`ceiling beam ${z}`, [13.6, 0.34, 0.32], [0, 8.42, z], materials.concreteDark);
}

// Rear-right mezzanine and its open glass edge.
box("mezzanine slab", [7.4, 0.38, 6.5], [3.1, 4.38, -5.28], materials.concreteDark);
box("mezzanine warm floor", [7.15, 0.08, 6.18], [3.05, 4.61, -5.3], materials.walnut);
box("mezzanine concrete pier", [0.42, 4.25, 0.55], [-0.35, 2.12, -8.28], materials.concrete);
box("mezzanine edge light", [6.5, 0.035, 0.055], [3.0, 4.16, -2.04], materials.warmGlow, false, false);
for (const x of [1.25, 3.1, 4.95]) {
  cylinder("recessed downlight", 0.11, 0.11, 0.035, [x, 4.16, -5.05], materials.warmGlow);
}
for (let x = -0.2; x <= 6.2; x += 1.07) {
  box(`mezzanine rail post ${x}`, [0.055, 1.15, 0.055], [x, 5.18, -2.02], materials.steel);
}
box(
  "mezzanine glass rail",
  [6.45, 0.96, 0.045],
  [3.0, 5.17, -2.03],
  materials.glass,
  false,
  false,
);
box("mezzanine handrail", [6.55, 0.065, 0.08], [3.0, 5.76, -2.02], materials.steel);

// Floating walnut staircase climbs beside the right concrete wall.
const stairCount = 17;
for (let step = 0; step < stairCount; step += 1) {
  const p = step / (stairCount - 1);
  const y = 0.34 + p * 3.92;
  const z = 4.6 - p * 6.75;
  roundedBox(
    `floating stair tread ${step}`,
    [2.62, 0.18, 0.52],
    [5.05, y, z],
    0.045,
    materials.walnutLight,
  );
  box(
    `stair wall bracket ${step}`,
    [0.28, 0.24, 0.3],
    [6.48, y - 0.08, z],
    materials.steel,
  );
}
const stairRailStart = new THREE.Vector3(3.69, 1.12, 4.85);
const stairRailEnd = new THREE.Vector3(3.69, 5.25, -2.38);
addLine(stairRailStart, stairRailEnd, materials.steel, 0.042);
addLine(
  new THREE.Vector3(6.46, 1.15, 4.85),
  new THREE.Vector3(6.46, 5.22, -2.32),
  materials.steel,
  0.034,
);
for (let step = 0; step < stairCount; step += 2) {
  const p = step / (stairCount - 1);
  const y = 0.44 + p * 3.92;
  const z = 4.6 - p * 6.75;
  addLine(
    new THREE.Vector3(3.69, y, z),
    new THREE.Vector3(3.69, y + 0.76, z),
    materials.steel,
    0.025,
  );
}

// Main seating vignette anchors the camera's floor-level orbit.
box("woven rug", [5.7, 0.035, 4.3], [-1.15, 0.03, 0.45], materials.rug, false);
roundedBox("sofa base", [4.05, 0.5, 1.35], [-1.3, 0.51, 1.18], 0.16, materials.leatherDark);
for (const x of [-2.28, -0.32]) {
  roundedBox("sofa seat cushion", [1.84, 0.38, 1.18], [x, 0.86, 0.98], 0.15, materials.leather);
  roundedBox("sofa back cushion", [1.82, 1.0, 0.36], [x, 1.35, 1.65], 0.12, materials.leather);
}
roundedBox("sofa left arm", [0.34, 0.86, 1.35], [-3.22, 1.08, 1.15], 0.12, materials.leather);
roundedBox("sofa right arm", [0.34, 0.86, 1.35], [0.62, 1.08, 1.15], 0.12, materials.leather);
for (const x of [-2.82, 0.22]) {
  for (const z of [0.72, 1.52]) {
    box("sofa black leg", [0.09, 0.35, 0.09], [x, 0.22, z], materials.black);
  }
}
roundedBox("cream cushion", [0.72, 0.62, 0.2], [-2.15, 1.25, 1.43], 0.12, materials.cream);

// Low coffee table and decorative objects create foreground parallax.
box("coffee table top", [2.35, 0.15, 1.12], [-0.85, 0.68, -0.72], materials.walnut);
for (const x of [-1.75, 0.05]) {
  for (const z of [-1.1, -0.35]) {
    box("coffee table leg", [0.08, 0.58, 0.08], [x, 0.36, z], materials.steel);
  }
}
cylinder("ceramic vase", 0.13, 0.18, 0.38, [-1.35, 0.98, -0.72], materials.white);
box("coffee table book", [0.58, 0.06, 0.42], [-0.45, 0.83, -0.66], materials.cream);

// Lounge chair faces the sofa from the window side.
roundedBox("lounge chair seat", [1.25, 0.24, 1.08], [-4.35, 0.7, -0.85], 0.12, materials.cream);
const chairBack = roundedBox(
  "lounge chair back",
  [1.25, 1.0, 0.25],
  [-4.35, 1.24, -1.25],
  0.1,
  materials.cream,
);
chairBack.rotation.x = -0.18;
for (const x of [-4.82, -3.88]) {
  for (const z of [-1.18, -0.45]) {
    const leg = box("lounge chair leg", [0.055, 0.63, 0.055], [x, 0.35, z], materials.brass);
    leg.rotation.x = z < -0.8 ? -0.1 : 0.1;
  }
}

// Kitchen and dining zones remain legible under the mezzanine.
box("kitchen rear cabinet", [5.9, 2.25, 0.55], [3.15, 1.13, -8.35], materials.black);
box("kitchen counter", [4.9, 0.12, 1.05], [2.55, 1.04, -6.55], materials.white);
box("kitchen island", [4.9, 0.86, 0.9], [2.55, 0.5, -6.55], materials.concreteDark);
for (const x of [1.35, 3.75]) {
  cylinder("pendant shade", 0.22, 0.38, 0.34, [x, 3.16, -6.5], materials.brass);
  addLine(
    new THREE.Vector3(x, 3.34, -6.5),
    new THREE.Vector3(x, 4.2, -6.5),
    materials.black,
    0.018,
  );
}
box("dining table", [3.0, 0.16, 1.25], [-3.2, 0.85, -5.65], materials.walnut);
for (const x of [-4.35, -2.05]) {
  box("dining leg", [0.11, 0.82, 0.11], [x, 0.42, -5.65], materials.steel);
}
for (let i = 0; i < 4; i += 1) {
  const x = -4.25 + i * 0.72;
  roundedBox("dining chair", [0.54, 0.12, 0.55], [x, 0.55, -4.75], 0.05, materials.leatherDark);
  box("dining chair back", [0.54, 0.62, 0.1], [x, 0.94, -4.98], materials.leatherDark);
}

// Upper-level workspace makes the mezzanine read as inhabitable.
box("mezzanine desk", [2.65, 0.11, 0.85], [3.45, 5.35, -6.95], materials.walnutLight);
for (const x of [2.35, 4.55]) {
  box("desk leg", [0.07, 0.75, 0.07], [x, 4.95, -6.95], materials.steel);
}
roundedBox("upper chair", [0.75, 0.18, 0.72], [3.45, 5.03, -5.92], 0.07, materials.leather);
box("upper chair back", [0.75, 0.82, 0.13], [3.45, 5.55, -5.6], materials.leather);
box("upper art panel", [2.7, 1.55, 0.08], [3.5, 6.55, -8.53], materials.cream, false);
box("upper art inset", [1.7, 0.82, 0.06], [3.5, 6.55, -8.46], materials.concreteDark, false);

// Sculptural plant helps communicate scale at floor level.
cylinder("plant pot", 0.43, 0.33, 0.82, [-5.35, 0.42, -3.75], materials.black);
for (let i = 0; i < 10; i += 1) {
  const angle = (i / 10) * Math.PI * 2;
  const leaf = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 12, 8),
    i % 2 ? materials.plant : materials.plantLight,
  );
  leaf.name = "plant leaf";
  leaf.scale.set(0.65, 2.2, 0.42);
  leaf.rotation.z = Math.sin(angle) * 0.62;
  leaf.rotation.x = Math.cos(angle) * 0.55;
  leaf.position.set(
    -5.35 + Math.cos(angle) * 0.38,
    1.12 + (i % 3) * 0.18,
    -3.75 + Math.sin(angle) * 0.38,
  );
  leaf.castShadow = true;
  scene.add(leaf);
}

// Warm practical lights balance the cool daylight.
for (const z of [-5.8, -2.9, 0, 2.9, 5.8]) {
  addLine(
    new THREE.Vector3(6.48, 7.15, z),
    new THREE.Vector3(5.15, 7.15, z),
    materials.black,
    0.035,
  );
  const bulb = cylinder("wall light", 0.09, 0.09, 0.55, [5.12, 7.15, z], materials.brass);
  bulb.rotation.z = Math.PI / 2;
}

const hemisphere = new THREE.HemisphereLight(0xdcebf0, 0x34302b, 1.95);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xfff0d5, 3.8);
sun.position.set(-9, 12, 10);
sun.target.position.set(1, 1.5, -2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -13;
sun.shadow.camera.right = 13;
sun.shadow.camera.top = 13;
sun.shadow.camera.bottom = -13;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 35;
sun.shadow.bias = -0.00018;
scene.add(sun, sun.target);

const fill = new THREE.PointLight(0xffc98a, 24, 11, 1.7);
fill.position.set(1.8, 6.3, -4.8);
scene.add(fill);
for (const x of [1.25, 4.8]) {
  const mezzanineFill = new THREE.PointLight(0xffbe72, 11, 7, 1.8);
  mezzanineFill.position.set(x, 3.72, -5.0);
  scene.add(mezzanineFill);
}
const entryFill = new THREE.PointLight(0xb8d8e8, 15, 13, 1.5);
entryFill.position.set(-2, 4.5, 6.5);
scene.add(entryFill);

// Camera follows a smooth, continuous dolly-and-crane trajectory.
const cameraPath = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-5.1, 1.04, 10.9),
    new THREE.Vector3(-4.85, 1.12, 7.8),
    new THREE.Vector3(-4.45, 1.35, 5.35),
    new THREE.Vector3(-4.05, 1.58, 3.35),
    new THREE.Vector3(-1.2, 1.72, 3.95),
    new THREE.Vector3(2.55, 2.18, 4.15),
    new THREE.Vector3(3.55, 3.82, 2.05),
    new THREE.Vector3(0.5, 5.4, 6.05),
  ],
  false,
  "catmullrom",
  0.5,
);
const targetPath = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-1.1, 1.2, 1.0),
    new THREE.Vector3(-1.1, 1.25, 0.25),
    new THREE.Vector3(-0.8, 1.4, -0.7),
    new THREE.Vector3(1.7, 2.15, -2.7),
    new THREE.Vector3(3.0, 3.0, -4.6),
    new THREE.Vector3(2.0, 3.2, -4.9),
    new THREE.Vector3(0.5, 3.2, -4.8),
    new THREE.Vector3(0.35, 3.35, -4.2),
  ],
  false,
  "catmullrom",
  0.5,
);

const lookMatrix = new THREE.Matrix4();
const target = new THREE.Vector3();

function smootherstep(value) {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function updateAtTime(seconds) {
  const clamped = THREE.MathUtils.clamp(Number(seconds) || 0, 0, DURATION);
  const normalized = clamped / DURATION;
  const progress = 0.5 - 0.5 * Math.cos(Math.PI * normalized);
  cameraPath.getPointAt(progress, camera.position);
  targetPath.getPointAt(progress, target);
  camera.fov = THREE.MathUtils.lerp(63, 70, smootherstep((normalized - 0.7) / 0.3));
  camera.updateProjectionMatrix();
  lookMatrix.lookAt(camera.position, target, camera.up);
  camera.quaternion.setFromRotationMatrix(lookMatrix);
  camera.updateMatrixWorld(true);
  renderer.render(scene, camera);
}

window.reconstruction = {
  pause() {
    renderer.render(scene, camera);
  },
  seek(seconds) {
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

updateAtTime(0);
window.__sceneReady = true;
