import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;

const canvas = document.querySelector("#stage");
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdceaf0);
scene.fog = new THREE.Fog(0xdceaf0, 19, 35);

const camera = new THREE.PerspectiveCamera(42, WIDTH / HEIGHT, 0.1, 60);

const matte = (color, roughness = 0.72, metalness = 0.02) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });

const materials = {
  floor: matte(0xcdd9dc, 0.78),
  wall: matte(0xe9f0f1, 0.84),
  trim: matte(0x33434b, 0.36, 0.7),
  bench: matte(0xe7eef0, 0.5, 0.12),
  benchEdge: matte(0x16546b, 0.3, 0.62),
  yellow: matte(0xf2b43b, 0.45, 0.22),
  charcoal: matte(0x202a2f, 0.28, 0.72),
  robot: matte(0xe1e5e6, 0.26, 0.72),
  robotDark: matte(0x151c20, 0.23, 0.82),
  joint: matte(0x6c7a7e, 0.28, 0.8),
  rubber: matte(0x101416, 0.9, 0.02),
  blue: new THREE.MeshStandardMaterial({
    color: 0x1b9ad1,
    emissive: 0x075476,
    emissiveIntensity: 0.9,
    roughness: 0.28,
    metalness: 0.28,
  }),
  green: new THREE.MeshStandardMaterial({
    color: 0x48d77d,
    emissive: 0x159447,
    emissiveIntensity: 1.15,
    roughness: 0.38,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x75cadb,
    emissive: 0x173f49,
    emissiveIntensity: 0.42,
    transparent: true,
    opacity: 0.4,
    roughness: 0.08,
    metalness: 0.05,
    transmission: 0.28,
    thickness: 0.08,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
};

const mesh = (geometry, material, cast = true, receive = true) => {
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = cast;
  object.receiveShadow = receive;
  return object;
};

const box = (sx, sy, sz, material, x = 0, y = 0, z = 0) => {
  const object = mesh(new THREE.BoxGeometry(sx, sy, sz), material);
  object.position.set(x, y, z);
  return object;
};

const cylinder = (radius, length, material, radialSegments = 18) =>
  mesh(new THREE.CylinderGeometry(radius, radius, length, radialSegments), material);

function addStroke(parent, x1, y1, x2, y2, thickness, depth, material) { window.__bfTrace?.add(89);
  const dx = x2 - x1;
  const dy = y2 - y1;
  const bar = box(Math.hypot(dx, dy), thickness, depth, material);
  bar.position.set((x1 + x2) / 2, (y1 + y2) / 2, 0);
  bar.rotation.z = Math.atan2(dy, dx);
  parent.add(bar);
}

function addStrokeText(parent, text, scale, material) { window.__bfTrace?.add(98);
  const glyphs = {
    E: [[0, 1, 0, 0], [0, 1, 0.68, 1], [0, 0.52, 0.56, 0.52], [0, 0, 0.68, 0]],
    X: [[0, 1, 0.68, 0], [0.68, 1, 0, 0]],
    I: [[0.34, 1, 0.34, 0], [0.05, 1, 0.63, 1], [0.05, 0, 0.63, 0]],
    T: [[0, 1, 0.68, 1], [0.34, 1, 0.34, 0]],
    C: [[0.68, 1, 0, 1], [0, 1, 0, 0], [0, 0, 0.68, 0]],
    H: [[0, 1, 0, 0], [0.68, 1, 0.68, 0], [0, 0.5, 0.68, 0.5]],
    A: [[0, 0, 0.34, 1], [0.34, 1, 0.68, 0], [0.12, 0.46, 0.56, 0.46]],
    R: [[0, 0, 0, 1], [0, 1, 0.58, 1], [0.58, 1, 0.58, 0.5], [0.58, 0.5, 0, 0.5], [0.28, 0.5, 0.68, 0]],
    G: [[0.68, 1, 0, 1], [0, 1, 0, 0], [0, 0, 0.68, 0], [0.68, 0, 0.68, 0.5], [0.68, 0.5, 0.38, 0.5]],
    N: [[0, 0, 0, 1], [0, 1, 0.68, 0], [0.68, 0, 0.68, 1]],
    Y: [[0, 1, 0.34, 0.53], [0.68, 1, 0.34, 0.53], [0.34, 0.53, 0.34, 0]],
  };
  let cursor = 0;
  for (const character of text) {
    if (character !== " ") {
      const letter = new THREE.Group();
      for (const [x1, y1, x2, y2] of glyphs[character] ?? []) {
        addStroke(letter, x1 * scale, y1 * scale, x2 * scale, y2 * scale, scale * 0.105, 0.035, material);
      }
      letter.position.x = cursor;
      parent.add(letter);
    }
    cursor += scale * 0.9;
  }
}

function buildLaboratory() { window.__bfTrace?.add(126);
  const lab = new THREE.Group();
  scene.add(lab);

  const floor = mesh(new THREE.PlaneGeometry(20, 12), materials.floor, false, true);
  floor.rotation.x = -Math.PI / 2;
  lab.add(floor);

  const gridPoints = [];
  for (let x = -10; x <= 10; x += 1) {
    gridPoints.push(x, 0.008, -6, x, 0.008, 6);
  }
  for (let z = -6; z <= 6; z += 1) {
    gridPoints.push(-10, 0.008, z, 10, 0.008, z);
  }
  const gridGeometry = new THREE.BufferGeometry();
  gridGeometry.setAttribute("position", new THREE.Float32BufferAttribute(gridPoints, 3));
  const grid = new THREE.LineSegments(
    gridGeometry,
    new THREE.LineBasicMaterial({ color: 0xaab8bc, transparent: true, opacity: 0.38 }),
  );
  lab.add(grid);

  lab.add(box(20, 6.5, 0.22, materials.wall, 0, 3.25, -6.08));
  lab.add(box(0.22, 6.5, 12, materials.wall, -10.08, 3.25, 0));
  lab.add(box(0.22, 6.5, 12, materials.wall, 10.08, 3.25, 0));
  lab.add(box(20, 0.16, 0.3, materials.trim, 0, 0.08, -5.88));

  for (const x of [-7.5, -2.5, 2.5, 7.5]) {
    const housing = box(3.15, 0.12, 0.95, materials.trim, x, 6.18, -0.6);
    lab.add(housing);
    const light = box(
      2.75,
      0.07,
      0.66,
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      x,
      6.1,
      -0.55,
    );
    lab.add(light);
    const point = new THREE.PointLight(0xeaf9ff, 20, 8, 1.8);
    point.position.set(x, 5.75, -0.5);
    lab.add(point);
  }

  const windowMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xaed9e6,
    transparent: true,
    opacity: 0.34,
    roughness: 0.15,
    metalness: 0.12,
  });
  for (const x of [-6.2, -3.2, 0, 3.2]) {
    lab.add(box(2.45, 2.1, 0.06, windowMaterial, x, 3.65, -5.91));
    lab.add(box(2.58, 0.09, 0.11, materials.trim, x, 2.57, -5.84));
    lab.add(box(2.58, 0.09, 0.11, materials.trim, x, 4.73, -5.84));
  }

  const entrance = new THREE.Group();
  entrance.position.set(-8.15, 0, 5.48);
  entrance.add(box(0.18, 3.1, 0.22, materials.trim, -1.0, 1.55, 0));
  entrance.add(box(0.18, 3.1, 0.22, materials.trim, 1.0, 1.55, 0));
  entrance.add(box(2.18, 0.2, 0.22, materials.trim, 0, 3.03, 0));
  entrance.add(box(1.7, 0.035, 1.0, matte(0x31586c, 0.85), 0, 0.02, -0.15));
  const entrySign = new THREE.Group();
  entrySign.position.set(-0.72, 3.28, 0);
  addStrokeText(entrySign, "ENTRY", 0.31, materials.blue);
  entrance.add(entrySign);
  lab.add(entrance);

  const door = new THREE.Group();
  door.position.set(7.25, 0, -5.83);
  door.add(box(2.82, 4.58, 0.04, matte(0x315a65, 0.5, 0.22), 0, 2.33, -0.04));
  door.add(box(1.3, 4.48, 0.12, materials.glass, -0.71, 2.33, 0.08));
  door.add(box(1.3, 4.48, 0.12, materials.glass, 0.71, 2.33, 0.08));
  door.add(box(3.08, 0.18, 0.22, materials.charcoal, 0, 4.72, 0.1));
  door.add(box(0.18, 4.9, 0.22, materials.charcoal, -1.45, 2.36, 0.1));
  door.add(box(0.18, 4.9, 0.22, materials.charcoal, 1.45, 2.36, 0.1));
  door.add(box(0.11, 4.55, 0.2, materials.trim, 0, 2.33, 0.16));
  door.add(box(2.78, 0.12, 0.2, materials.trim, 0, 0.08, 0.08));
  door.add(box(0.07, 0.8, 0.12, materials.yellow, -0.16, 2.22, 0.27));
  door.add(box(0.07, 0.8, 0.12, materials.yellow, 1.25, 2.22, 0.27));
  lab.add(door);

  const exitSign = new THREE.Group();
  exitSign.position.set(5.85, 4.66, -5.62);
  exitSign.add(box(2.78, 0.78, 0.12, materials.green, 1.32, 0.32, -0.06));
  const exitLetters = new THREE.Group();
  exitLetters.position.set(0.22, 0.08, 0.03);
  addStrokeText(exitLetters, "EXIT", 0.52, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  exitSign.add(exitLetters);
  lab.add(exitSign);

  const station = new THREE.Group();
  station.position.set(-7.3, 0, -5.58);
  station.add(box(2.35, 2.75, 0.55, materials.bench, 0, 1.38, 0));
  station.add(box(2.05, 0.2, 0.12, materials.blue, 0, 2.42, 0.34));
  station.add(box(1.65, 0.06, 2.0, materials.charcoal, 0, 0.04, 1.25));
  station.add(box(1.3, 0.035, 1.7, materials.blue, 0, 0.08, 1.23));
  const bolt = new THREE.Group();
  const boltMaterial = new THREE.MeshBasicMaterial({ color: 0x86e8ff });
  addStroke(bolt, 0.18, 0.85, -0.12, 0.25, 0.17, 0.05, boltMaterial);
  addStroke(bolt, -0.12, 0.25, 0.2, 0.3, 0.17, 0.05, boltMaterial);
  addStroke(bolt, 0.2, 0.3, -0.15, -0.38, 0.17, 0.05, boltMaterial);
  bolt.position.set(0, 1.42, 0.37);
  station.add(bolt);
  const chargeLabel = new THREE.Group();
  chargeLabel.position.set(-0.86, 2.86, 0.05);
  addStrokeText(chargeLabel, "CHARGE", 0.26, materials.blue);
  station.add(chargeLabel);
  lab.add(station);

  const table = new THREE.Group();
  table.position.set(0, 0, -0.25);
  table.add(box(5.5, 0.22, 2.45, materials.bench, 0, 1.62, 0));
  table.add(box(5.64, 0.09, 2.57, materials.benchEdge, 0, 1.53, 0));
  for (const x of [-2.35, 2.35]) {
    for (const z of [-0.85, 0.85]) {
      table.add(box(0.18, 1.5, 0.18, materials.trim, x, 0.76, z));
    }
  }
  table.add(box(4.75, 0.12, 1.72, materials.trim, 0, 0.54, 0));
  table.add(box(1.15, 0.78, 0.78, matte(0x3f899d, 0.48, 0.3), -1.55, 2.12, -0.15));
  table.add(box(1.0, 0.62, 0.06, materials.charcoal, 0.1, 2.28, -0.35));
  table.add(box(0.88, 0.5, 0.025, materials.blue, 0.1, 2.28, -0.31));
  table.add(box(0.08, 0.58, 0.08, materials.trim, 0.1, 1.92, -0.35));

  const arm = new THREE.Group();
  arm.position.set(1.75, 1.78, 0.18);
  arm.add(cylinder(0.34, 0.15, materials.yellow));
  arm.children[0].position.y = -0.08;
  const armJoint1 = mesh(new THREE.SphereGeometry(0.2, 20, 14), materials.joint);
  armJoint1.position.y = 0.22;
  arm.add(armJoint1);
  const link1 = cylinder(0.11, 0.9, materials.yellow);
  link1.position.set(-0.18, 0.66, 0);
  link1.rotation.z = -0.42;
  arm.add(link1);
  const armJoint2 = mesh(new THREE.SphereGeometry(0.17, 18, 12), materials.joint);
  armJoint2.position.set(-0.37, 1.05, 0);
  arm.add(armJoint2);
  const link2 = cylinder(0.09, 0.78, materials.yellow);
  link2.position.set(-0.08, 1.31, 0);
  link2.rotation.z = 0.84;
  arm.add(link2);
  table.add(arm);
  lab.add(table);

  function createStool(x, z, color) {
    const stool = new THREE.Group();
    stool.position.set(x, 0, z);
    const seatMaterial = matte(color, 0.4, 0.28);
    const seat = cylinder(0.52, 0.18, seatMaterial, 28);
    seat.position.y = 1.06;
    stool.add(seat);
    const stem = cylinder(0.11, 0.83, materials.trim, 14);
    stem.position.y = 0.6;
    stool.add(stem);
    const base = cylinder(0.43, 0.08, materials.trim, 24);
    base.position.y = 0.05;
    stool.add(base);
    const ring = mesh(new THREE.TorusGeometry(0.31, 0.045, 8, 24), materials.trim);
    ring.position.y = 0.48;
    ring.rotation.x = Math.PI / 2;
    stool.add(ring);
    lab.add(stool);
  }

  createStool(-1.95, 3.08, 0x197c9d);
  createStool(1.35, 3.45, 0xe1a02c);

  for (const x of [-2.85, 2.85]) {
    for (const z of [-1.6, 1.12]) {
      const marker = box(0.72, 0.02, 0.08, materials.yellow, x, 0.018, z);
      marker.rotation.y = z < 0 ? 0 : Math.PI / 2;
      lab.add(marker);
    }
  }

  return lab;
}

const route = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-8.15, 0.04, 4.72),
    new THREE.Vector3(-6.65, 0.04, 4.22),
    new THREE.Vector3(-4.65, 0.04, 3.55),
    new THREE.Vector3(-3.25, 0.04, 2.05),
    new THREE.Vector3(-1.85, 0.04, 1.75),
    new THREE.Vector3(-0.35, 0.04, 4.42),
    new THREE.Vector3(1.85, 0.04, 4.15),
    new THREE.Vector3(3.45, 0.04, 2.82),
    new THREE.Vector3(4.42, 0.04, 1.35),
    new THREE.Vector3(4.75, 0.04, -0.92),
    new THREE.Vector3(5.82, 0.04, -3.05),
    new THREE.Vector3(7.22, 0.04, -4.92),
  ],
  false,
  "catmullrom",
  0.28,
);
route.arcLengthDivisions = 600;

function buildRouteGuide() { window.__bfTrace?.add(330);
  const guideMaterial = new THREE.MeshStandardMaterial({
    color: 0x1eb6c4,
    emissive: 0x087b8b,
    emissiveIntensity: 0.5,
    roughness: 0.5,
    transparent: true,
    opacity: 0.55,
  });
  const guide = mesh(new THREE.TubeGeometry(route, 240, 0.035, 7, false), guideMaterial, false, false);
  scene.add(guide);
  for (let i = 1; i < 12; i += 1) {
    const u = i / 12;
    const point = route.getPointAt(u);
    const tangent = route.getTangentAt(u);
    const arrow = mesh(new THREE.ConeGeometry(0.16, 0.42, 3), guideMaterial, false, false);
    arrow.position.copy(point);
    arrow.position.y = 0.055;
    arrow.rotation.x = Math.PI / 2;
    arrow.rotation.z = -Math.atan2(tangent.z, tangent.x) - Math.PI / 2;
    scene.add(arrow);
  }
}

function createRobotDog() { window.__bfTrace?.add(354);
  const root = new THREE.Group();
  const body = new THREE.Group();
  body.position.y = 1.04;
  root.add(body);

  const torso = box(1.42, 0.53, 0.67, materials.robot);
  torso.geometry = new THREE.BoxGeometry(1.42, 0.53, 0.67, 3, 2, 2);
  body.add(torso);
  body.add(box(1.1, 0.13, 0.73, materials.robotDark, -0.08, 0.23, 0));
  body.add(box(0.12, 0.31, 0.74, materials.blue, -0.2, 0.03, 0));
  for (const side of [-1, 1]) {
    body.add(box(0.76, 0.27, 0.035, materials.robotDark, -0.12, 0.02, side * 0.355));
    body.add(box(0.42, 0.08, 0.025, materials.blue, -0.12, 0.03, side * 0.38));
  }
  for (const x of [-0.56, 0.56]) {
    for (const side of [-1, 1]) {
      const shoulder = mesh(new THREE.SphereGeometry(0.18, 18, 12), materials.robot);
      shoulder.scale.set(1.0, 1.2, 0.72);
      shoulder.position.set(x, -0.12, side * 0.39);
      body.add(shoulder);
    }
  }

  const head = new THREE.Group();
  head.position.set(0.88, 0.06, 0);
  head.add(box(0.48, 0.43, 0.58, materials.robotDark, 0, 0, 0));
  head.add(box(0.18, 0.27, 0.44, materials.robot, 0.25, -0.04, 0));
  const lensMaterial = new THREE.MeshStandardMaterial({
    color: 0x73e7ff,
    emissive: 0x27b9ed,
    emissiveIntensity: 2.2,
    roughness: 0.12,
  });
  for (const z of [-0.19, 0.19]) {
    const lens = cylinder(0.075, 0.035, lensMaterial, 18);
    lens.rotation.z = Math.PI / 2;
    lens.position.set(0.36, 0.03, z);
    head.add(lens);
  }
  const lidar = cylinder(0.14, 0.12, materials.robotDark, 20);
  lidar.position.set(-0.05, 0.31, 0);
  head.add(lidar);
  const lidarBand = cylinder(0.145, 0.035, materials.blue, 20);
  lidarBand.position.set(-0.05, 0.33, 0);
  head.add(lidarBand);
  body.add(head);

  const rearModule = cylinder(0.2, 0.52, materials.robotDark, 20);
  rearModule.rotation.x = Math.PI / 2;
  rearModule.position.set(-0.74, 0.02, 0);
  body.add(rearModule);

  const antenna = cylinder(0.025, 0.55, materials.trim, 10);
  antenna.rotation.z = -0.62;
  antenna.position.set(-0.92, 0.34, 0);
  body.add(antenna);
  const antennaTip = mesh(new THREE.SphereGeometry(0.06, 12, 8), materials.blue);
  antennaTip.position.set(-1.08, 0.57, 0);
  body.add(antennaTip);

  const legs = [];
  const upperLength = 0.42;
  const lowerLength = 0.45;
  for (const front of [-1, 1]) {
    for (const side of [-1, 1]) {
      const hip = new THREE.Group();
      hip.position.set(front * 0.55, -0.19, side * 0.39);
      const hipMotor = cylinder(0.13, 0.17, materials.joint, 18);
      hipMotor.rotation.x = Math.PI / 2;
      hip.add(hipMotor);

      const upper = cylinder(0.09, upperLength, materials.robotDark, 14);
      upper.position.y = -upperLength / 2;
      hip.add(upper);

      const knee = new THREE.Group();
      knee.position.y = -upperLength;
      const kneeMotor = cylinder(0.105, 0.14, materials.joint, 16);
      kneeMotor.rotation.x = Math.PI / 2;
      knee.add(kneeMotor);

      const lower = cylinder(0.065, lowerLength, materials.robot, 12);
      lower.position.y = -lowerLength / 2;
      knee.add(lower);
      const foot = box(0.24, 0.105, 0.18, materials.rubber, 0.07, -lowerLength, 0);
      knee.add(foot);
      hip.add(knee);
      body.add(hip);
      legs.push({
        hip,
        knee,
        front,
        side,
        phaseOffset: front === side ? 0 : Math.PI,
      });
    }
  }

  scene.add(root);
  return { root, body, head, legs, antenna };
}

buildLaboratory();
buildRouteGuide();
const robot = createRobotDog();

const hemisphere = new THREE.HemisphereLight(0xf2fbff, 0x728089, 2.05);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xffffff, 3.25);
sun.position.set(-5.5, 10, 7.5);
sun.target.position.set(0, 0, -0.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -13;
sun.shadow.camera.right = 13;
sun.shadow.camera.top = 11;
sun.shadow.camera.bottom = -8;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 30;
sun.shadow.bias = -0.00035;
scene.add(sun, sun.target);
const exitGlow = new THREE.PointLight(0x65e5bc, 11, 4.2, 1.7);
exitGlow.position.set(7.25, 3.7, -4.95);
scene.add(exitGlow);
const chargeGlow = new THREE.PointLight(0x72dfff, 7, 3.5, 1.8);
chargeGlow.position.set(-7.3, 2.2, -4.9);
scene.add(chargeGlow);

const tempPoint = new THREE.Vector3();
const tempTangent = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smootherStep = (value) => {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
};

function travelState(time) { window.__bfTrace?.add(493);
  const travelDuration = 4.95;
  const rampDuration = 0.55;
  const x = Math.max(0, Math.min(travelDuration, time));
  const distanceArea = travelDuration - rampDuration;
  if (x < rampDuration) {
    return {
      progress: (0.5 * x * x / rampDuration) / distanceArea,
      speed: x / rampDuration,
    };
  }
  if (x > travelDuration - rampDuration) {
    const remaining = travelDuration - x;
    return {
      progress: 1 - (0.5 * remaining * remaining / rampDuration) / distanceArea,
      speed: remaining / rampDuration,
    };
  }
  return {
    progress: (0.5 * rampDuration + x - rampDuration) / distanceArea,
    speed: 1,
  };
}

function updateScene(time) { window.__bfTrace?.add(517);
  const t = Math.max(0, Math.min(DURATION, time));
  const travel = travelState(t);
  const progress = travel.progress;
  route.getPointAt(progress, tempPoint);
  route.getTangentAt(Math.min(0.9999, progress), tempTangent).normalize();
  robot.root.position.copy(tempPoint);
  robot.root.rotation.y = Math.atan2(-tempTangent.z, tempTangent.x);

  const movementBlend = Math.sqrt(Math.max(0, travel.speed));
  const gait = t * Math.PI * 4.35;
  robot.body.position.y = 1.04 + Math.abs(Math.sin(gait)) * 0.045 * movementBlend;
  robot.body.rotation.z = Math.sin(gait * 0.5) * 0.025 * movementBlend;
  robot.head.rotation.z = -Math.sin(gait * 0.5) * 0.032 * movementBlend;
  robot.antenna.rotation.z = -0.62 + Math.sin(gait * 0.5 + 0.7) * 0.05 * movementBlend;

  for (const leg of robot.legs) {
    const phase = gait + leg.phaseOffset;
    const stride = Math.sin(phase) * movementBlend;
    const lift = Math.max(0, Math.cos(phase)) * movementBlend;
    leg.hip.rotation.z = stride * 0.52 - lift * 0.08;
    leg.hip.rotation.x = leg.side * (0.1 + lift * 0.04);
    leg.knee.rotation.z = 0.42 - stride * 0.34 + lift * 0.5;
  }

  camera.position.copy(tempPoint);
  const destinationReveal = smootherStep((progress - 0.82) / 0.18);
  camera.position.x -= THREE.MathUtils.lerp(1.55, 2.25, destinationReveal);
  camera.position.z += THREE.MathUtils.lerp(7.25, 8.65, destinationReveal);
  camera.position.y = THREE.MathUtils.lerp(4.9, 5.5, destinationReveal);
  cameraTarget.copy(tempPoint);
  cameraTarget.addScaledVector(tempTangent, 1.22);
  cameraTarget.y = THREE.MathUtils.lerp(0.92, 1.35, destinationReveal);
  camera.lookAt(cameraTarget);
  camera.fov = THREE.MathUtils.lerp(44, 47, destinationReveal);
  camera.updateProjectionMatrix();

  renderer.render(scene, camera);
}

let currentTime = 0;
let paused = true;

window.reconstruction = {
  pause() {
    paused = true;
    updateScene(currentTime);
  },
  seek(seconds) {
    paused = true;
    currentTime = Math.max(0, Math.min(DURATION, Number(seconds) || 0));
    updateScene(currentTime);
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
};

window.__sceneReady = true;
updateScene(0);

function animate() { window.__bfTrace?.add(582);
  if (!paused) {
    currentTime = (currentTime + 1 / FPS) % DURATION;
    updateScene(currentTime);
  }
  requestAnimationFrame(animate);
}
requestAnimationFrame(animate);
