import * as THREE from '../vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
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
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcbd2d5);
scene.fog = new THREE.Fog(0xcbd2d5, 24, 49);

const camera = new THREE.PerspectiveCamera(43, WIDTH / HEIGHT, 0.1, 80);
scene.add(camera);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
const clock = new THREE.Clock();
let paused = false;
let exactTime = 0;

function mat(color, roughness = 0.65, metalness = 0.05, extra = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness,
    metalness,
    ...extra,
  });
}

function mesh(geometry, material, parent = scene) {
  const value = new THREE.Mesh(geometry, material);
  value.castShadow = true;
  value.receiveShadow = true;
  parent.add(value);
  return value;
}

const whiteStone = mat(0xe7e5df, 0.78, 0.03);
const wallMaterial = mat(0xe0e4e3, 0.9, 0.01);
const darkMetal = mat(0x26343c, 0.3, 0.74);
const graphite = mat(0x52616a, 0.38, 0.6);
const rubber = mat(0x11171a, 0.9, 0.04);
const cyan = mat(0x15bfd0, 0.24, 0.45, {
  emissive: 0x0b8698,
  emissiveIntensity: 1.45,
});

const floor = mesh(
  new THREE.PlaneGeometry(17, 35),
  mat(0xbec4c3, 0.52, 0.05),
);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, 0, -5.4);

const floorInset = mesh(
  new THREE.PlaneGeometry(13.8, 32.5),
  mat(0xd4d5d1, 0.72, 0.02),
);
floorInset.rotation.x = -Math.PI / 2;
floorInset.position.set(0, 0.012, -5.4);

function addBox(size, position, material, parent = scene) {
  const value = mesh(new THREE.BoxGeometry(...size), material, parent);
  value.position.set(...position);
  return value;
}

addBox([0.35, 6.4, 35], [-8.45, 3.2, -5.4], wallMaterial);
addBox([0.35, 6.4, 35], [8.45, 3.2, -5.4], wallMaterial);
addBox([6.9, 6.4, 0.35], [-5.05, 3.2, -22.65], wallMaterial);
addBox([6.9, 6.4, 0.35], [5.05, 3.2, -22.65], wallMaterial);
addBox([3.2, 1.95, 0.35], [0, 5.43, -22.65], wallMaterial);

const exitVoid = addBox(
  [3.15, 4.45, 0.18],
  [0, 2.22, -27.45],
  mat(0x101820, 0.4, 0.15),
);
exitVoid.castShadow = false;
const corridorMaterial = mat(0x354149, 0.84, 0.05);
addBox([3.2, 0.1, 5], [0, 0.02, -24.95], corridorMaterial);
addBox([0.14, 4.4, 5], [-1.61, 2.2, -24.95], corridorMaterial);
addBox([0.14, 4.4, 5], [1.61, 2.2, -24.95], corridorMaterial);
addBox([3.2, 0.12, 5], [0, 4.42, -24.95], corridorMaterial);
addBox([0.2, 4.58, 0.5], [-1.7, 2.24, -22.43], darkMetal);
addBox([0.2, 4.58, 0.5], [1.7, 2.24, -22.43], darkMetal);
addBox([3.6, 0.2, 0.5], [0, 4.52, -22.43], darkMetal);
addBox([3.55, 0.15, 0.18], [0, 4.48, -22.3], cyan);

const arrowShape = new THREE.Shape();
arrowShape.moveTo(-0.25, 0.14);
arrowShape.lineTo(0.25, 0.14);
arrowShape.lineTo(0.25, -0.02);
arrowShape.lineTo(0.48, -0.02);
arrowShape.lineTo(0, -0.42);
arrowShape.lineTo(-0.48, -0.02);
arrowShape.lineTo(-0.25, -0.02);
arrowShape.closePath();
const exitArrow = mesh(
  new THREE.ShapeGeometry(arrowShape),
  new THREE.MeshBasicMaterial({ color: 0xc6ffff, side: THREE.DoubleSide }),
);
exitArrow.position.set(0, 4.5, -22.18);

for (const x of [-5.7, 5.7]) {
  const rail = addBox([0.1, 0.1, 30], [x, 6.15, -5.3], darkMetal);
  rail.castShadow = false;
}

const ceilingPanels = [];
for (const z of [7, 1, -5, -11, -17]) {
  const panel = addBox(
    [4.6, 0.08, 1.05],
    [0, 6.2, z],
    mat(0xffffff, 0.35, 0, {
      emissive: 0xffffff,
      emissiveIntensity: 1.35,
    }),
  );
  panel.castShadow = false;
  ceilingPanels.push(panel);
}

scene.add(new THREE.HemisphereLight(0xf4fbff, 0x56636a, 1.8));
const keyLight = new THREE.DirectionalLight(0xfff3df, 2.2);
keyLight.position.set(3.5, 9.5, 8);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -12;
keyLight.shadow.camera.right = 12;
keyLight.shadow.camera.top = 13;
keyLight.shadow.camera.bottom = -21;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 40;
scene.add(keyLight);

const pedestalData = [
  { x: -2.7, z: 3.1, accent: 0xb07338, type: 'knot' },
  { x: 2.7, z: -1.9, accent: 0x9c4242, type: 'stone' },
  { x: -2.7, z: -6.9, accent: 0x4c7486, type: 'rings' },
  { x: 2.7, z: -11.9, accent: 0xc79531, type: 'stack' },
];

function addPedestalPlaque(group, index) {
  const plaque = addBox(
    [0.54, 0.2, 0.045],
    [0, 0.56, 0.686],
    mat(0x253039, 0.52, 0.5),
    group,
  );
  plaque.castShadow = false;
  for (let dot = 0; dot <= index; dot += 1) {
    const marker = mesh(
      new THREE.SphereGeometry(0.035, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xd8ffff }),
      group,
    );
    marker.position.set((dot - index / 2) * 0.105, 0.56, 0.715);
  }
}

function addSculpture(parent, spec) {
  const sculptureMaterial = mat(spec.accent, 0.3, 0.62);
  if (spec.type === 'knot') {
    const object = mesh(
      new THREE.TorusKnotGeometry(0.43, 0.12, 96, 16, 2, 3),
      sculptureMaterial,
      parent,
    );
    object.position.y = 1.65;
    object.rotation.set(0.3, 0.2, -0.25);
  } else if (spec.type === 'stone') {
    const object = mesh(
      new THREE.IcosahedronGeometry(0.62, 1),
      sculptureMaterial,
      parent,
    );
    object.position.y = 1.68;
    object.scale.set(1, 1.18, 0.85);
    object.rotation.set(0.2, 0.45, -0.15);
  } else if (spec.type === 'rings') {
    const ringA = mesh(
      new THREE.TorusGeometry(0.52, 0.105, 16, 64),
      sculptureMaterial,
      parent,
    );
    ringA.position.y = 1.7;
    ringA.rotation.y = 0.5;
    const ringB = mesh(
      new THREE.TorusGeometry(0.43, 0.09, 16, 64),
      mat(0x9eb6bd, 0.24, 0.8),
      parent,
    );
    ringB.position.y = 1.7;
    ringB.rotation.set(Math.PI / 2, 0.35, 0);
  } else {
    for (let i = 0; i < 3; i += 1) {
      const form = mesh(
        new THREE.SphereGeometry(0.43 - i * 0.055, 28, 16),
        i === 1 ? mat(0xe0b858, 0.23, 0.72) : sculptureMaterial,
        parent,
      );
      form.scale.set(1.05, 0.5, 0.72);
      form.position.set(
        Math.sin(i * 1.8) * 0.18,
        1.32 + i * 0.36,
        Math.cos(i * 1.7) * 0.12,
      );
      form.rotation.y = i * 0.65;
    }
  }
}

for (let i = 0; i < pedestalData.length; i += 1) {
  const spec = pedestalData[i];
  const group = new THREE.Group();
  group.position.set(spec.x, 0, spec.z);
  scene.add(group);
  const base = addBox([1.5, 1.12, 1.35], [0, 0.56, 0], whiteStone, group);
  base.geometry.computeBoundingBox();
  addBox(
    [1.64, 0.1, 1.49],
    [0, 0.08, 0],
    mat(0x9ca2a0, 0.6, 0.12),
    group,
  );
  addPedestalPlaque(group, i);
  addSculpture(group, spec);

  const spot = new THREE.SpotLight(0xffecd1, 55, 10, 0.42, 0.55, 1.4);
  spot.position.set(spec.x, 5.8, spec.z + 0.6);
  spot.target.position.set(spec.x, 0.7, spec.z);
  spot.castShadow = true;
  spot.shadow.mapSize.set(512, 512);
  scene.add(spot, spot.target);
}

const artPanels = [
  { x: -8.2, z: 6.1, color: 0x5f7c84 },
  { x: -8.2, z: -3.9, color: 0x8b6552 },
  { x: -8.2, z: -13.8, color: 0x66705d },
];
for (const panel of artPanels) {
  const backing = addBox(
    [0.12, 2.05, 2.6],
    [panel.x, 3.05, panel.z],
    mat(0x2e3639, 0.5, 0.3),
  );
  backing.castShadow = false;
  const inset = addBox(
    [0.13, 1.67, 2.22],
    [panel.x + 0.07, 3.05, panel.z],
    mat(panel.color, 0.82, 0.06),
  );
  inset.castShadow = false;
}

const routePoints = [
  new THREE.Vector3(0, 0.055, 9),
  new THREE.Vector3(0.8, 0.055, 6.2),
  new THREE.Vector3(1.45, 0.055, 3.1),
  new THREE.Vector3(-1.45, 0.055, -1.9),
  new THREE.Vector3(1.45, 0.055, -6.9),
  new THREE.Vector3(-1.45, 0.055, -11.9),
  new THREE.Vector3(-0.6, 0.055, -17.5),
  new THREE.Vector3(0, 0.055, -25.15),
];
const routeCurve = new THREE.CatmullRomCurve3(routePoints, false, 'catmullrom', 0.48);
const routeMaterial = new THREE.MeshStandardMaterial({
  color: 0x19bfd0,
  roughness: 0.4,
  metalness: 0.2,
  emissive: 0x087b8b,
  emissiveIntensity: 0.95,
  transparent: true,
  opacity: 0.68,
});
const route = mesh(
  new THREE.TubeGeometry(routeCurve, 220, 0.047, 8, false),
  routeMaterial,
);
route.castShadow = false;

const routeMarkers = [];
for (let i = 1; i < 12; i += 1) {
  const point = routeCurve.getPointAt(i / 12);
  const tangent = routeCurve.getTangentAt(i / 12);
  const marker = mesh(
    new THREE.ConeGeometry(0.13, 0.34, 3),
    new THREE.MeshBasicMaterial({
      color: 0x97f5ff,
      transparent: true,
      opacity: 0.72,
    }),
  );
  marker.position.copy(point);
  marker.position.y = 0.072;
  marker.rotation.x = Math.PI / 2;
  marker.rotation.z = Math.atan2(tangent.x, tangent.z);
  marker.castShadow = false;
  routeMarkers.push(marker);
}

const robot = new THREE.Group();
scene.add(robot);

const body = addBox([1.06, 0.48, 1.42], [0, 1.05, 0], graphite, robot);
body.geometry.computeVertexNormals();
for (const x of [-0.555, 0.555]) {
  const sideArmor = addBox([0.07, 0.31, 1.02], [x, 1.07, 0.03], darkMetal, robot);
  sideArmor.rotation.x = 0.04;
  const statusStrip = addBox([0.076, 0.07, 0.62], [x * 1.014, 1.18, -0.03], cyan, robot);
  statusStrip.castShadow = false;
}
const underBody = addBox([0.72, 0.18, 0.92], [0, 0.76, 0.05], rubber, robot);
underBody.castShadow = true;
const bodyTop = addBox([0.78, 0.16, 0.83], [0, 1.36, 0.02], darkMetal, robot);
bodyTop.rotation.y = 0.02;
for (const x of [-0.43, 0.43]) {
  const rail = mesh(
    new THREE.CylinderGeometry(0.045, 0.045, 1.08, 12),
    darkMetal,
    robot,
  );
  rail.rotation.x = Math.PI / 2;
  rail.position.set(x, 1.36, 0);
}

const head = addBox([0.78, 0.48, 0.58], [0, 1.12, -0.91], darkMetal, robot);
head.rotation.x = -0.08;
const neck = mesh(
  new THREE.CylinderGeometry(0.16, 0.2, 0.34, 16),
  graphite,
  robot,
);
neck.rotation.x = Math.PI / 2;
neck.position.set(0, 1.1, -0.65);
const face = addBox([0.61, 0.28, 0.055], [0, 1.13, -1.22], rubber, robot);
for (const x of [-0.19, 0.19]) {
  const eye = mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.035, 24), cyan, robot);
  eye.rotation.x = Math.PI / 2;
  eye.position.set(x, 1.15, -1.26);
}
const lidar = mesh(
  new THREE.CylinderGeometry(0.14, 0.16, 0.12, 24),
  darkMetal,
  robot,
);
lidar.position.set(0, 1.51, -0.12);
const lidarBand = mesh(
  new THREE.CylinderGeometry(0.151, 0.151, 0.045, 24),
  cyan,
  robot,
);
lidarBand.position.set(0, 1.53, -0.12);
const robotRimLight = new THREE.PointLight(0x5cefff, 1.25, 3.6, 1.7);
robotRimLight.position.set(0, 1.72, 0.1);
robot.add(robotRimLight);

const tailBase = mesh(
  new THREE.CylinderGeometry(0.045, 0.055, 0.62, 12),
  darkMetal,
  robot,
);
tailBase.rotation.x = -0.65;
tailBase.position.set(0, 1.28, 0.91);
const tailTip = mesh(new THREE.SphereGeometry(0.085, 16, 10), cyan, robot);
tailTip.position.set(0, 1.49, 1.13);

function segment(material, radius, parent) {
  return mesh(new THREE.CylinderGeometry(radius, radius * 0.9, 1, 12), material, parent);
}

function alignSegment(object, start, end) {
  const direction = new THREE.Vector3().subVectors(end, start);
  object.position.copy(start).add(end).multiplyScalar(0.5);
  object.scale.set(1, direction.length(), 1);
  object.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize(),
  );
}

const legs = [];
for (const side of [-1, 1]) {
  for (const fore of [-1, 1]) {
    const hip = mesh(new THREE.SphereGeometry(0.155, 16, 10), graphite, robot);
    const knee = mesh(new THREE.SphereGeometry(0.115, 14, 9), graphite, robot);
    const upper = segment(graphite, 0.098, robot);
    const lower = segment(darkMetal, 0.074, robot);
    const foot = addBox([0.25, 0.115, 0.37], [0, 0, 0], rubber, robot);
    legs.push({ side, fore, hip, knee, upper, lower, foot });
  }
}

const navRing = mesh(
  new THREE.TorusGeometry(0.74, 0.035, 10, 64),
  new THREE.MeshBasicMaterial({
    color: 0x83f4ff,
    transparent: true,
    opacity: 0.75,
  }),
);
navRing.rotation.x = Math.PI / 2;
navRing.castShadow = false;

const tmpPoint = new THREE.Vector3();
const tmpTangent = new THREE.Vector3();
const cameraRoutePoint = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function smoothstep(value) {
  return value * value * (3 - 2 * value);
}

function travelProgress(time) {
  const value = clamp01(time / 5);
  const ramp = 0.1;
  const normalization = 1 - ramp;
  if (value < ramp) {
    return (0.5 * value * value / ramp) / normalization;
  }
  if (value > 1 - ramp) {
    const remaining = 1 - value;
    return 1 - (0.5 * remaining * remaining / ramp) / normalization;
  }
  return (value - 0.5 * ramp) / normalization;
}

function updateRobot(time) {
  const travel = travelProgress(time);
  routeCurve.getPointAt(travel, tmpPoint);
  routeCurve.getTangentAt(Math.min(0.9999, travel), tmpTangent);
  const yaw = Math.atan2(-tmpTangent.x, -tmpTangent.z);
  const moving = Math.pow(Math.sin(Math.PI * clamp01(time / 5)), 0.35);
  const gait = time * Math.PI * 4.5;

  robot.position.copy(tmpPoint);
  robot.position.y = Math.sin(gait * 2) * 0.025 * moving;
  robot.rotation.y = yaw;
  body.rotation.z = Math.sin(gait) * 0.018 * moving;
  bodyTop.rotation.z = body.rotation.z * 0.7;
  head.rotation.y = Math.sin(time * 2.2) * 0.07;
  lidar.rotation.y = time * 2.8;
  lidarBand.rotation.y = lidar.rotation.y;
  tailBase.rotation.z = Math.sin(time * 3.7) * 0.12;
  tailTip.position.x = Math.sin(time * 3.7) * 0.08;

  for (const leg of legs) {
    const diagonal = leg.side * leg.fore > 0 ? Math.PI : 0;
    const stride = Math.sin(gait + diagonal) * 0.28 * moving;
    const lift = Math.max(0, Math.cos(gait + diagonal)) * 0.17 * moving;
    const hipPoint = new THREE.Vector3(leg.side * 0.49, 0.91, leg.fore * 0.5);
    const kneePoint = new THREE.Vector3(
      leg.side * 0.68,
      0.52,
      leg.fore * 0.52 - stride * 0.33,
    );
    const footPoint = new THREE.Vector3(
      leg.side * 0.7,
      0.095 + lift,
      leg.fore * 0.55 + stride,
    );
    leg.hip.position.copy(hipPoint);
    leg.knee.position.copy(kneePoint);
    alignSegment(leg.upper, hipPoint, kneePoint);
    alignSegment(leg.lower, kneePoint, footPoint);
    leg.foot.position.copy(footPoint);
    leg.foot.rotation.y = 0;
  }

  navRing.position.copy(tmpPoint);
  navRing.position.y = 0.085;
  const ringScale = 1 + Math.sin(time * 5.5) * 0.08;
  navRing.scale.setScalar(ringScale);
  navRing.material.opacity = 0.58 + Math.sin(time * 5.5) * 0.15;
  routeMaterial.emissiveIntensity = 0.8 + Math.sin(time * 3.1) * 0.18;
  routeMarkers.forEach((marker, index) => {
    marker.material.opacity = 0.48 + 0.28 * Math.sin(time * 3.5 - index * 0.65) ** 2;
  });
}

function updateCamera(time) {
  const p = travelProgress(time);
  routeCurve.getPointAt(p, cameraRoutePoint);
  camera.position.set(
    THREE.MathUtils.lerp(6.65, 6.15, p),
    THREE.MathUtils.lerp(5.5, 4.9, p),
    cameraRoutePoint.z + THREE.MathUtils.lerp(8.9, 8.55, p),
  );
  cameraTarget.set(
    THREE.MathUtils.lerp(0.1, -0.05, p),
    THREE.MathUtils.lerp(0.9, 0.78, p),
    cameraRoutePoint.z - THREE.MathUtils.lerp(1.75, 1.25, p),
  );
  camera.fov = 42;
  camera.updateProjectionMatrix();
  camera.lookAt(cameraTarget);
  camera.updateMatrixWorld(true);
}

function renderAt(time) {
  exactTime = Math.max(0, Math.min(DURATION, Number(time) || 0));
  updateRobot(exactTime);
  updateCamera(exactTime);
  renderer.render(scene, camera);
}

function animate() {
  if (!paused) {
    renderAt(clock.getElapsedTime() % DURATION);
  }
  requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    paused = true;
    renderAt(exactTime);
  },
  seek(seconds) {
    paused = true;
    renderAt(seconds);
    return exactTime;
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
  metadata: {
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    frames: FRAME_COUNT,
    duration: DURATION,
  },
};

renderAt(0);
animate();
