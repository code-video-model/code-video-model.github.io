import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;
const canvas = document.querySelector("#scene");

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x080b12);
scene.fog = new THREE.FogExp2(0x080b12, 0.018);

const camera = new THREE.PerspectiveCamera(34, WIDTH / HEIGHT, 0.04, 100);

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (value) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};
const smootherstep = (value) => {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

function roundedRectShape(width, depth, radius) {
  const x = -width / 2;
  const y = -depth / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + depth - radius);
  shape.quadraticCurveTo(x + width, y + depth, x + width - radius, y + depth);
  shape.lineTo(x + radius, y + depth);
  shape.quadraticCurveTo(x, y + depth, x, y + depth - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function roundedPrism(width, depth, height, radius, material, bevel = 0.025) {
  const geometry = new THREE.ExtrudeGeometry(
    roundedRectShape(width, depth, radius),
    {
      depth: height,
      bevelEnabled: bevel > 0,
      bevelSegments: 3,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 6,
    },
  );
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function planeMaterial(color, opacity = 1) {
  return new THREE.MeshBasicMaterial({
    color,
    transparent: opacity < 1,
    opacity,
    depthWrite: opacity >= 1,
    side: THREE.DoubleSide,
    toneMapped: false,
  });
}

const materials = {
  chassis: new THREE.MeshPhysicalMaterial({
    color: 0xb4bbc3,
    metalness: 0.88,
    roughness: 0.18,
    clearcoat: 0.48,
    clearcoatRoughness: 0.16,
  }),
  chassisEdge: new THREE.MeshPhysicalMaterial({
    color: 0xe3e8ed,
    metalness: 0.92,
    roughness: 0.11,
    clearcoat: 0.58,
  }),
  keyBed: new THREE.MeshStandardMaterial({
    color: 0x101318,
    metalness: 0.35,
    roughness: 0.38,
  }),
  key: new THREE.MeshPhysicalMaterial({
    color: 0x202832,
    metalness: 0.25,
    roughness: 0.26,
    clearcoat: 0.32,
  }),
  keyEdge: new THREE.MeshBasicMaterial({
    color: 0xc4ddf5,
    transparent: true,
    opacity: 0.74,
    toneMapped: false,
  }),
  trackpad: new THREE.MeshPhysicalMaterial({
    color: 0x85909b,
    metalness: 0.78,
    roughness: 0.21,
    clearcoat: 0.42,
  }),
  black: new THREE.MeshStandardMaterial({
    color: 0x07090c,
    metalness: 0.28,
    roughness: 0.24,
  }),
  rubber: new THREE.MeshStandardMaterial({
    color: 0x040506,
    roughness: 0.75,
  }),
  screenOff: new THREE.MeshBasicMaterial({
    color: 0x020409,
    toneMapped: false,
  }),
};

const set = new THREE.Group();
scene.add(set);

const deskMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x25262a,
  metalness: 0.2,
  roughness: 0.32,
  clearcoat: 0.18,
  clearcoatRoughness: 0.4,
});
const desk = roundedPrism(17, 11.5, 0.28, 0.28, deskMaterial, 0.06);
desk.position.set(0, -0.28, 0.35);
set.add(desk);

const wall = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 15),
  new THREE.MeshStandardMaterial({
    color: 0x11151d,
    metalness: 0.08,
    roughness: 0.62,
  }),
);
wall.position.set(0, 6.5, -8.2);
wall.receiveShadow = true;
set.add(wall);

const horizonGlow = new THREE.Mesh(
  new THREE.PlaneGeometry(12, 0.035),
  planeMaterial(0x446687, 0.16),
);
horizonGlow.position.set(0, 0.7, -8.12);
set.add(horizonGlow);

for (const x of [-6.9, 6.9]) {
  const lightStrip = new THREE.Mesh(
    new THREE.PlaneGeometry(0.055, 5.8),
    planeMaterial(x < 0 ? 0xc7dcff : 0x77a6ff, 0.22),
  );
  lightStrip.position.set(x, 3.6, -8.1);
  set.add(lightStrip);
}

const productShadow = new THREE.Mesh(
  new THREE.CircleGeometry(1, 64),
  new THREE.MeshBasicMaterial({
    color: 0x000000,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
  }),
);
productShadow.rotation.x = -Math.PI / 2;
productShadow.position.set(0, 0.012, 0.15);
productShadow.scale.set(4.4, 3.05, 1);
set.add(productShadow);

const laptop = new THREE.Group();
laptop.rotation.y = -0.045;
laptop.position.set(0, 0, 0.2);
set.add(laptop);

const base = roundedPrism(6.65, 4.35, 0.14, 0.18, materials.chassis, 0.028);
base.position.y = 0.1;
laptop.add(base);

const edgeBand = roundedPrism(6.57, 4.27, 0.035, 0.16, materials.chassisEdge, 0.012);
edgeBand.position.y = 0.248;
laptop.add(edgeBand);

const keyboardBed = roundedPrism(5.95, 2.28, 0.02, 0.14, materials.keyBed, 0.008);
keyboardBed.position.set(0, 0.3, -0.73);
laptop.add(keyboardBed);

const trackpadOutline = roundedPrism(2.84, 1.36, 0.012, 0.13, materials.black, 0.005);
trackpadOutline.position.set(0, 0.298, 1.16);
laptop.add(trackpadOutline);

const trackpad = roundedPrism(2.76, 1.28, 0.018, 0.12, materials.trackpad, 0.007);
trackpad.position.set(0, 0.31, 1.16);
laptop.add(trackpad);

const trackpadInset = new THREE.Mesh(
  new THREE.PlaneGeometry(2.5, 1.03),
  new THREE.MeshBasicMaterial({
    color: 0xaeb5bc,
    transparent: true,
    opacity: 0.12,
    toneMapped: false,
  }),
);
trackpadInset.rotation.x = -Math.PI / 2;
trackpadInset.position.set(0, 0.34, 1.16);
laptop.add(trackpadInset);

const keyGeometry = new THREE.BoxGeometry(0.335, 0.055, 0.29, 2, 1, 2);
const keyTopGeometry = new THREE.PlaneGeometry(0.2, 0.012);
function addKey(x, z, width = 0.335) {
  const key = new THREE.Mesh(keyGeometry, materials.key);
  key.scale.x = width / 0.335;
  key.position.set(x, 0.355, z);
  key.castShadow = true;
  laptop.add(key);

  const legend = new THREE.Mesh(keyTopGeometry, materials.keyEdge);
  legend.rotation.x = -Math.PI / 2;
  legend.position.set(x, 0.384, z - 0.025);
  legend.scale.x = Math.min(1, width / 0.335);
  laptop.add(legend);
}

const rowZ = [-1.58, -1.21, -0.84, -0.47];
for (let row = 0; row < rowZ.length; row += 1) {
  const offset = row === 2 ? 0.11 : row === 3 ? 0.2 : 0;
  const columns = row === 3 ? 13 : 14;
  for (let column = 0; column < columns; column += 1) {
    addKey(-2.46 + offset + column * 0.38, rowZ[row]);
  }
}
addKey(-2.48, -0.1, 0.5);
addKey(-1.95, -0.1, 0.42);
addKey(-1.48, -0.1, 0.42);
addKey(0, -0.1, 2.25);
addKey(1.48, -0.1, 0.42);
addKey(1.95, -0.1, 0.42);
addKey(2.48, -0.1, 0.5);

const grilleGeometry = new THREE.CylinderGeometry(0.027, 0.027, 0.014, 10);
for (const x of [-2.92, 2.92]) {
  for (let index = 0; index < 17; index += 1) {
    const hole = new THREE.Mesh(grilleGeometry, materials.black);
    hole.position.set(x, 0.34, -1.47 + index * 0.105);
    laptop.add(hole);
  }
}

const frontNotch = new THREE.Mesh(
  new THREE.BoxGeometry(0.92, 0.055, 0.035),
  materials.black,
);
frontNotch.position.set(0, 0.175, 2.205);
laptop.add(frontNotch);

for (const x of [-3.325, 3.325]) {
  const port = new THREE.Mesh(
    new THREE.BoxGeometry(0.028, 0.08, 0.44),
    materials.black,
  );
  port.position.set(x, 0.175, 0.35);
  laptop.add(port);
}

const hingeGeometry = new THREE.CylinderGeometry(0.09, 0.09, 1.18, 24);
for (const x of [-2.25, 2.25]) {
  const hinge = new THREE.Mesh(hingeGeometry, materials.black);
  hinge.rotation.z = Math.PI / 2;
  hinge.position.set(x, 0.34, -2.03);
  hinge.castShadow = true;
  laptop.add(hinge);
}

const lidPivot = new THREE.Group();
lidPivot.position.set(0, 0.405, -2.02);
laptop.add(lidPivot);

const lidShell = roundedPrism(6.62, 4.18, 0.095, 0.2, materials.chassis, 0.022);
lidShell.position.set(0, 0, 2.08);
lidPivot.add(lidShell);

const exteriorLogo = new THREE.Group();
exteriorLogo.rotation.x = -Math.PI / 2;
exteriorLogo.position.set(0, 0.125, 2.1);
lidPivot.add(exteriorLogo);
const logoOuter = new THREE.Mesh(
  new THREE.RingGeometry(0.22, 0.28, 48),
  planeMaterial(0xeaf3ff, 0.5),
);
exteriorLogo.add(logoOuter);
const logoCore = new THREE.Mesh(
  new THREE.CircleGeometry(0.095, 32),
  planeMaterial(0xeaf3ff, 0.36),
);
logoCore.position.z = 0.002;
exteriorLogo.add(logoCore);

const display = new THREE.Group();
display.rotation.x = Math.PI / 2;
display.position.set(0, -0.03, 2.1);
lidPivot.add(display);

const bezel = new THREE.Mesh(
  new THREE.PlaneGeometry(6.2, 3.78),
  materials.black,
);
display.add(bezel);

const screen = new THREE.Mesh(
  new THREE.PlaneGeometry(5.94, 3.46),
  materials.screenOff,
);
screen.position.z = 0.012;
display.add(screen);

const screenLayers = [];
function addScreenLayer(geometry, material, x, y, z = 0.02) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  display.add(mesh);
  screenLayers.push({ mesh, material, opacity: material.opacity ?? 1 });
  return mesh;
}

const screenDeepBlue = planeMaterial(0x07172f, 1);
addScreenLayer(new THREE.PlaneGeometry(5.86, 3.38), screenDeepBlue, 0, 0, 0.016);

const screenHaloA = planeMaterial(0x1676ae, 0.26);
const haloA = addScreenLayer(
  new THREE.CircleGeometry(1.8, 64),
  screenHaloA,
  1.68,
  0.2,
  0.022,
);
haloA.scale.y = 0.72;

const screenHaloB = planeMaterial(0x8147b6, 0.24);
const haloB = addScreenLayer(
  new THREE.CircleGeometry(1.45, 64),
  screenHaloB,
  -1.9,
  -0.9,
  0.024,
);
haloB.scale.y = 0.62;

const arcMaterial = planeMaterial(0x75d7ff, 0.75);
const arc = addScreenLayer(
  new THREE.RingGeometry(0.78, 0.84, 64, 1, 0.35, 4.9),
  arcMaterial,
  1.32,
  0.02,
  0.03,
);
arc.rotation.z = -0.45;

const arcInnerMaterial = planeMaterial(0xb8eaff, 0.58);
const arcInner = addScreenLayer(
  new THREE.RingGeometry(0.54, 0.57, 64, 1, 0.1, 5.3),
  arcInnerMaterial,
  1.32,
  0.02,
  0.032,
);
arcInner.rotation.z = 0.7;

const screenBarMaterial = planeMaterial(0xdcecff, 0.45);
for (let index = 0; index < 3; index += 1) {
  addScreenLayer(
    new THREE.PlaneGeometry(1.25 - index * 0.2, 0.035),
    screenBarMaterial.clone(),
    -1.72,
    0.42 - index * 0.19,
    0.034,
  );
}

const statusDotMaterial = planeMaterial(0x8de9ff, 0.82);
for (let index = 0; index < 4; index += 1) {
  addScreenLayer(
    new THREE.CircleGeometry(0.045, 24),
    statusDotMaterial.clone(),
    -2.15 + index * 0.18,
    -1.1,
    0.035,
  );
}

const webcam = new THREE.Mesh(
  new THREE.CircleGeometry(0.033, 20),
  planeMaterial(0x243344, 0.85),
);
webcam.position.set(0, 1.74, 0.025);
display.add(webcam);

const ambient = new THREE.HemisphereLight(0x91a8cf, 0x161116, 1.1);
scene.add(ambient);

const keyLight = new THREE.RectAreaLight(0xffead5, 15, 5.8, 4.2);
keyLight.position.set(-4.5, 7.5, 4.8);
keyLight.lookAt(0, 0.4, 0);
scene.add(keyLight);

const fillLight = new THREE.RectAreaLight(0x75a7ff, 10, 4.2, 3.2);
fillLight.position.set(5.8, 4.3, 4.5);
fillLight.lookAt(0, 0.8, 0);
scene.add(fillLight);

const rimLight = new THREE.RectAreaLight(0xa77cff, 10.5, 5.8, 2);
rimLight.position.set(0, 4.8, -5.1);
rimLight.lookAt(0, 1.5, 0);
scene.add(rimLight);

const shadowLight = new THREE.DirectionalLight(0xfff4e8, 1.65);
shadowLight.position.set(-3.5, 8.2, 5.5);
shadowLight.target.position.set(0, 0, 0);
shadowLight.castShadow = true;
shadowLight.shadow.mapSize.set(2048, 2048);
shadowLight.shadow.camera.left = -8;
shadowLight.shadow.camera.right = 8;
shadowLight.shadow.camera.top = 8;
shadowLight.shadow.camera.bottom = -8;
shadowLight.shadow.camera.near = 0.5;
shadowLight.shadow.camera.far = 24;
shadowLight.shadow.bias = -0.0003;
scene.add(shadowLight, shadowLight.target);

const cameraPath = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-8.8, 4.55, 5.6),
    new THREE.Vector3(-7.6, 4.95, 6.7),
    new THREE.Vector3(-5.8, 5.05, 7.7),
    new THREE.Vector3(-3.6, 4.65, 8.25),
    new THREE.Vector3(-1.2, 3.9, 8.15),
    new THREE.Vector3(1.2, 3.15, 7.2),
    new THREE.Vector3(2.9, 2.45, 5.6),
    new THREE.Vector3(3.75, 2.0, 4.1),
    new THREE.Vector3(4.05, 1.8, 3.15),
  ],
  false,
  "centripetal",
  0.28,
);

const targetPath = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-0.35, 0.2, 0.15),
    new THREE.Vector3(-0.15, 0.3, 0.05),
    new THREE.Vector3(0.25, 0.48, -0.1),
    new THREE.Vector3(0.35, 0.58, -0.28),
    new THREE.Vector3(0.1, 0.58, -0.48),
    new THREE.Vector3(-0.2, 0.56, -0.58),
    new THREE.Vector3(-0.15, 0.5, -0.45),
    new THREE.Vector3(0.15, 0.4, -0.12),
  ],
  false,
  "centripetal",
  0.28,
);

cameraPath.arcLengthDivisions = 1000;
cameraPath.updateArcLengths();
targetPath.arcLengthDivisions = 1000;
targetPath.updateArcLengths();

const fovTrack = [38, 37, 35, 34, 35, 37, 40, 43];
const cameraTiming = [
  [0, 0],
  [0.22, 0],
  [0.90, 0.20],
  [1.55, 0.34],
  [2.50, 0.56],
  [3.45, 0.76],
  [4.35, 0.91],
  [DURATION, 1],
];
const lookTarget = new THREE.Vector3();
let currentTime = 0;
let animationFrame = null;
let playing = false;
let playStartedAt = 0;
let playStartedTime = 0;

function createPchipTrack(points, zeroEndpointSlopes = false) {
  const x = points.map(([input]) => input);
  const y = points.map(([, output]) => output);
  const h = [];
  const delta = [];
  const slopes = new Array(points.length).fill(0);

  for (let index = 0; index < points.length - 1; index += 1) {
    h.push(x[index + 1] - x[index]);
    delta.push((y[index + 1] - y[index]) / h[index]);
  }

  for (let index = 1; index < points.length - 1; index += 1) {
    if (delta[index - 1] * delta[index] <= 0) continue;
    const firstWeight = 2 * h[index] + h[index - 1];
    const secondWeight = h[index] + 2 * h[index - 1];
    slopes[index] = (firstWeight + secondWeight)
      / (firstWeight / delta[index - 1] + secondWeight / delta[index]);
  }

  if (!zeroEndpointSlopes) {
    slopes[0] = delta[0];
    slopes[slopes.length - 1] = delta[delta.length - 1];
  }

  return (input) => {
    const value = Math.max(x[0], Math.min(x[x.length - 1], input));
    let index = x.length - 2;
    for (let candidate = 0; candidate < x.length - 1; candidate += 1) {
      if (value <= x[candidate + 1]) {
        index = candidate;
        break;
      }
    }
    const local = (value - x[index]) / h[index];
    const local2 = local * local;
    const local3 = local2 * local;
    const startWeight = 2 * local3 - 3 * local2 + 1;
    const startSlopeWeight = local3 - 2 * local2 + local;
    const endWeight = -2 * local3 + 3 * local2;
    const endSlopeWeight = local3 - local2;
    return (
      startWeight * y[index]
      + startSlopeWeight * h[index] * slopes[index]
      + endWeight * y[index + 1]
      + endSlopeWeight * h[index] * slopes[index + 1]
    );
  };
}

const cameraProgress = createPchipTrack(cameraTiming, true);
const interpolateFov = createPchipTrack(
  fovTrack.map((value, index) => [index / (fovTrack.length - 1), value]),
  true,
);

function updateScene(seconds) {
  const time = Math.max(0, Math.min(DURATION, Number(seconds) || 0));
  currentTime = time;
  const u = time / DURATION;
  const cameraU = cameraProgress(time);

  const lidProgress = smootherstep((time - 0.28) / 3.1);
  lidPivot.rotation.x = -THREE.MathUtils.degToRad(105.5) * lidProgress;

  const screenProgress = smoothstep((time - 1.02) / 1.1);
  materials.screenOff.color.setRGB(
    0.008 + screenProgress * 0.003,
    0.012 + screenProgress * 0.006,
    0.022 + screenProgress * 0.012,
  );
  for (const layer of screenLayers) {
    layer.mesh.visible = screenProgress > 0.01;
    layer.material.opacity = layer.opacity * screenProgress;
    layer.material.transparent = screenProgress < 0.999 || layer.opacity < 1;
  }
  arc.rotation.z = -0.45 + time * 0.09;
  arcInner.rotation.z = 0.7 - time * 0.065;

  cameraPath.getPointAt(cameraU, camera.position);
  targetPath.getPointAt(cameraU, lookTarget);
  camera.fov = interpolateFov(cameraU);
  camera.updateProjectionMatrix();
  camera.lookAt(lookTarget);
  camera.updateMatrixWorld(true);

  keyLight.intensity = THREE.MathUtils.lerp(13, 16.5, smoothstep(u));
  fillLight.intensity = THREE.MathUtils.lerp(8.5, 12, smoothstep((u - 0.3) / 0.7));
  rimLight.intensity = THREE.MathUtils.lerp(8.5, 13.2, smoothstep((u - 0.45) / 0.55));

  renderer.render(scene, camera);
  return time;
}

function tick(now) {
  if (!playing) return;
  const elapsed = (now - playStartedAt) / 1000;
  const next = Math.min(DURATION, playStartedTime + elapsed);
  updateScene(next);
  if (next >= DURATION) {
    playing = false;
    animationFrame = null;
    return;
  }
  animationFrame = requestAnimationFrame(tick);
}

function pause() {
  playing = false;
  if (animationFrame !== null) {
    cancelAnimationFrame(animationFrame);
    animationFrame = null;
  }
  return currentTime;
}

function seek(seconds) {
  pause();
  return updateScene(seconds);
}

function play() {
  pause();
  playing = true;
  playStartedAt = performance.now();
  playStartedTime = currentTime >= DURATION ? 0 : currentTime;
  animationFrame = requestAnimationFrame(tick);
}

function getCameraState() {
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

window.reconstruction = {
  pause,
  seek,
  play,
  getCameraState,
  duration: DURATION,
};

updateScene(0);
window.__THREE_SCENE_READY__ = true;
