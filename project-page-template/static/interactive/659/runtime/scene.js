import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

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
renderer.toneMappingExposure = 0.94;
renderer.setClearColor(0xcad8df, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcad8df);
scene.fog = new THREE.Fog(0xcad8df, 24, 52);

const camera = new THREE.PerspectiveCamera(62, WIDTH / HEIGHT, 0.08, 100);

const mat = {
  floor: new THREE.MeshStandardMaterial({ color: 0xb8b1a4, roughness: 0.72, metalness: 0.03 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x777d7f, roughness: 0.86 }),
  white: new THREE.MeshStandardMaterial({ color: 0xe8e6de, roughness: 0.62 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x202a2c, roughness: 0.35, metalness: 0.55 }),
  black: new THREE.MeshStandardMaterial({ color: 0x111719, roughness: 0.3, metalness: 0.42 }),
  oak: new THREE.MeshStandardMaterial({ color: 0x895331, roughness: 0.58 }),
  oakLight: new THREE.MeshStandardMaterial({ color: 0xb97943, roughness: 0.6 }),
  fabricBlue: new THREE.MeshStandardMaterial({ color: 0x284f62, roughness: 0.92 }),
  fabricCoral: new THREE.MeshStandardMaterial({ color: 0xa84738, roughness: 0.9 }),
  fabricOchre: new THREE.MeshStandardMaterial({ color: 0xb17c2e, roughness: 0.88 }),
  teal: new THREE.MeshStandardMaterial({ color: 0x286a69, roughness: 0.82 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x315f3c, roughness: 0.9 }),
  leafLight: new THREE.MeshStandardMaterial({ color: 0x5e8657, roughness: 0.9 }),
  planter: new THREE.MeshStandardMaterial({ color: 0xa15a3c, roughness: 0.82 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x88bdc8,
    transparent: true,
    opacity: 0.28,
    transmission: 0.28,
    roughness: 0.14,
    metalness: 0,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  screen: new THREE.MeshStandardMaterial({
    color: 0x17292f,
    emissive: 0x3d9cb2,
    emissiveIntensity: 0.48,
    roughness: 0.32,
  }),
  warmLight: new THREE.MeshStandardMaterial({
    color: 0xffe1a6,
    emissive: 0xffc56b,
    emissiveIntensity: 2.8,
    roughness: 0.28,
  }),
  skyGlass: new THREE.MeshPhysicalMaterial({
    color: 0xa8d2dc,
    transparent: true,
    opacity: 0.33,
    roughness: 0.16,
    metalness: 0.05,
    depthWrite: false,
  }),
};

function box(parent, name, size, material, position, rotation = [0, 0, 0], shadows = true) { window.__bfTrace?.add(76);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = shadows;
  mesh.receiveShadow = shadows;
  parent.add(mesh);
  return mesh;
}

function cylinder(parent, name, radiusTop, radiusBottom, height, material, position, segments = 20) { window.__bfTrace?.add(87);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addWindowWall() { window.__bfTrace?.add(100);
  const wall = new THREE.Group();
  wall.name = 'NorthWindowWall';
  scene.add(wall);
  box(wall, 'WindowSill', [28, 0.28, 0.28], mat.dark, [0, 0.25, -8.9]);
  box(wall, 'WindowHeader', [28, 0.3, 0.32], mat.dark, [0, 8.05, -8.9]);
  for (let x = -14; x <= 14; x += 3.5) {
    box(wall, 'WindowMullion', [0.14, 7.7, 0.18], mat.dark, [x, 4.1, -8.86]);
  }
  box(wall, 'NorthGlass', [27.7, 7.5, 0.08], mat.skyGlass, [0, 4.12, -8.95], [0, 0, 0], false);

  const skyline = new THREE.Group();
  skyline.name = 'DistantCity';
  scene.add(skyline);
  const heights = [5.2, 3.1, 6.7, 4.3, 5.8, 3.7, 7.1, 4.9, 6.2, 3.5, 5.4];
  for (let i = 0; i < heights.length; i += 1) {
    const x = -19 + i * 3.8;
    const h = heights[i];
    box(skyline, 'DistantBuilding', [3.1, h, 3.8], mat.concrete, [x, h / 2 - 0.1, -18 - (i % 3) * 2.2], [0, 0, 0], false);
    for (let y = 0.8; y < h - 0.5; y += 1.1) {
      box(skyline, 'DistantWindowBand', [2.9, 0.16, 0.05], mat.warmLight, [x, y, -15.95 - (i % 3) * 2.2], [0, 0, 0], false);
    }
  }
}

function addArchitecture() { window.__bfTrace?.add(125);
  const shell = new THREE.Group();
  shell.name = 'OfficeArchitecture';
  scene.add(shell);

  box(shell, 'FloorSlab', [28, 0.3, 18], mat.floor, [0, -0.16, 0]);
  for (let x = -13.5; x <= 13.5; x += 1.5) {
    box(shell, 'FloorJoint', [0.018, 0.008, 18], mat.concrete, [x, 0.003, 0], [0, 0, 0], false);
  }
  for (let z = -8.5; z <= 8.5; z += 1.5) {
    box(shell, 'FloorJoint', [28, 0.008, 0.018], mat.concrete, [0, 0.004, z], [0, 0, 0], false);
  }

  box(shell, 'WestWall', [0.35, 8.4, 18], mat.white, [-14.05, 4.15, 0]);
  box(shell, 'EastWall', [0.35, 8.4, 18], mat.white, [14.05, 4.15, 0]);
  box(shell, 'SouthWallLow', [28, 2.7, 0.4], mat.white, [0, 1.35, 9.05]);
  box(shell, 'SouthWallHigh', [28, 1.5, 0.4], mat.white, [0, 7.65, 9.05]);
  for (let x = -12; x <= 12; x += 4) {
    box(shell, 'SouthMullion', [0.16, 4.8, 0.2], mat.dark, [x, 4.65, 8.9]);
  }
  box(shell, 'SouthGlass', [27.5, 4.75, 0.08], mat.skyGlass, [0, 4.62, 8.93], [0, 0, 0], false);

  for (let x = -12; x <= 12; x += 4) {
    box(shell, 'CeilingBeam', [0.22, 0.3, 17.5], mat.dark, [x, 8.05, 0]);
  }
  for (let z = -7.5; z <= 7.5; z += 3) {
    box(shell, 'CeilingRail', [27.5, 0.12, 0.14], mat.dark, [0, 7.95, z]);
  }
  for (const x of [-10, -4, 2, 8]) {
    for (const z of [-5.8, 0, 5.8]) {
      box(shell, 'PendantCord', [0.025, 1.2, 0.025], mat.black, [x, 7.3, z], [0, 0, 0], false);
      const shade = cylinder(shell, 'PendantShade', 0.12, 0.34, 0.34, mat.dark, [x, 6.66, z], 24);
      shade.rotation.x = Math.PI;
      cylinder(shell, 'PendantGlow', 0.18, 0.18, 0.04, mat.warmLight, [x, 6.48, z], 24);
    }
  }
  addWindowWall();
}

function addChair(parent, x, z, rotation, colorMaterial = mat.fabricBlue) { window.__bfTrace?.add(164);
  const chair = new THREE.Group();
  chair.name = 'TaskChair';
  chair.position.set(x, 0, z);
  chair.rotation.y = rotation;
  parent.add(chair);
  box(chair, 'ChairSeat', [0.62, 0.13, 0.58], colorMaterial, [0, 0.55, 0]);
  const back = box(chair, 'ChairBack', [0.64, 0.78, 0.12], colorMaterial, [0, 1.0, 0.25], [-0.08, 0, 0]);
  back.castShadow = true;
  cylinder(chair, 'ChairPost', 0.055, 0.055, 0.48, mat.dark, [0, 0.28, 0], 12);
  for (let i = 0; i < 5; i += 1) {
    const a = (i / 5) * Math.PI * 2;
    const leg = box(chair, 'ChairCasterArm', [0.06, 0.06, 0.43], mat.dark, [Math.sin(a) * 0.18, 0.08, Math.cos(a) * 0.18], [0, a, 0]);
    leg.castShadow = true;
  }
}

function addMonitor(parent, x, z, facing) { window.__bfTrace?.add(181);
  const group = new THREE.Group();
  group.name = 'DesktopMonitor';
  group.position.set(x, 0, z);
  group.rotation.y = facing;
  parent.add(group);
  box(group, 'MonitorScreen', [0.9, 0.54, 0.07], mat.screen, [0, 1.28, 0]);
  box(group, 'MonitorBezelTop', [0.96, 0.045, 0.1], mat.black, [0, 1.575, 0]);
  box(group, 'MonitorBezelBottom', [0.96, 0.06, 0.1], mat.black, [0, 0.985, 0]);
  box(group, 'MonitorBezelLeft', [0.045, 0.55, 0.1], mat.black, [-0.48, 1.28, 0]);
  box(group, 'MonitorBezelRight', [0.045, 0.55, 0.1], mat.black, [0.48, 1.28, 0]);
  box(group, 'MonitorStem', [0.07, 0.3, 0.07], mat.dark, [0, 0.9, 0]);
  box(group, 'MonitorFoot', [0.34, 0.04, 0.22], mat.dark, [0, 0.75, 0.08]);
}

function addDeskIsland(x, z, rotation = 0, accent = mat.fabricBlue) { window.__bfTrace?.add(196);
  const island = new THREE.Group();
  island.name = 'FourPersonDeskIsland';
  island.position.set(x, 0, z);
  island.rotation.y = rotation;
  scene.add(island);

  box(island, 'DeskRug', [5.4, 0.035, 3.7], accent, [0, 0.03, 0]);
  box(island, 'SharedOakTop', [4.35, 0.16, 1.65], mat.oakLight, [0, 0.82, 0]);
  for (const lx of [-1.92, 1.92]) {
    for (const lz of [-0.62, 0.62]) {
      box(island, 'DeskLeg', [0.09, 0.78, 0.09], mat.dark, [lx, 0.4, lz]);
    }
  }
  box(island, 'AcousticDivider', [3.9, 0.42, 0.06], accent, [0, 1.08, 0]);
  for (const mx of [-1.25, 1.25]) {
    addMonitor(island, mx, -0.28, 0);
    addMonitor(island, mx, 0.28, Math.PI);
    box(island, 'Keyboard', [0.56, 0.025, 0.2], mat.dark, [mx, 0.93, -0.57]);
    box(island, 'Keyboard', [0.56, 0.025, 0.2], mat.dark, [mx, 0.93, 0.57]);
    addChair(island, mx, -1.25, 0, accent);
    addChair(island, mx, 1.25, Math.PI, accent);
  }
}

function addPlant(x, z, scale = 1) { window.__bfTrace?.add(221);
  const plant = new THREE.Group();
  plant.name = 'IndoorPlant';
  plant.position.set(x, 0, z);
  plant.scale.setScalar(scale);
  scene.add(plant);
  cylinder(plant, 'TerracottaPot', 0.42, 0.31, 0.7, mat.planter, [0, 0.36, 0], 18);
  cylinder(plant, 'PlantStem', 0.05, 0.065, 1.35, mat.leaf, [0, 1.15, 0], 10);
  for (let i = 0; i < 9; i += 1) {
    const a = i * 2.399963;
    const y = 0.95 + (i % 5) * 0.24;
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.32 + (i % 2) * 0.07, 12, 8),
      i % 2 ? mat.leaf : mat.leafLight,
    );
    leaf.name = 'PlantLeaf';
    leaf.scale.set(1.8, 0.25, 0.65);
    leaf.position.set(Math.cos(a) * 0.4, y, Math.sin(a) * 0.4);
    leaf.rotation.y = -a;
    leaf.rotation.z = 0.15 * Math.sin(a);
    leaf.castShadow = true;
    plant.add(leaf);
  }
}

function addMeetingPod() { window.__bfTrace?.add(246);
  const pod = new THREE.Group();
  pod.name = 'GlassMeetingPod';
  pod.position.set(2.8, 0, 0);
  scene.add(pod);

  box(pod, 'PodCarpet', [5.4, 0.04, 5.6], mat.fabricBlue, [0, 0.035, 0]);
  const xEdge = 2.72;
  const zEdge = 2.82;
  for (const x of [-xEdge, xEdge]) {
    box(pod, 'PodVerticalFrame', [0.11, 3.25, 0.11], mat.dark, [x, 1.64, -zEdge]);
    box(pod, 'PodVerticalFrame', [0.11, 3.25, 0.11], mat.dark, [x, 1.64, zEdge]);
    box(pod, 'PodSideGlass', [0.07, 3.05, 5.42], mat.glass, [x, 1.62, 0], [0, 0, 0], false);
  }
  for (const z of [-zEdge, zEdge]) {
    box(pod, 'PodHeader', [5.55, 0.12, 0.12], mat.dark, [0, 3.22, z]);
    box(pod, 'PodDoorPost', [0.1, 3.18, 0.1], mat.dark, [-2.68, 1.62, z]);
    box(pod, 'PodDoorPost', [0.1, 3.18, 0.1], mat.dark, [0.65, 1.62, z]);
    box(pod, 'PodFrontGlass', [3.3, 3.02, 0.06], mat.glass, [-1.02, 1.62, z], [0, 0, 0], false);
  }
  box(pod, 'PodRoofFrameLeft', [0.13, 0.1, 5.7], mat.dark, [-2.72, 3.25, 0]);
  box(pod, 'PodRoofFrameRight', [0.13, 0.1, 5.7], mat.dark, [2.72, 3.25, 0]);
  box(pod, 'PodRoofBeam', [5.4, 0.1, 0.13], mat.dark, [0, 3.25, 0]);
  box(pod, 'PodRoofGlass', [5.25, 0.05, 5.5], mat.glass, [0, 3.28, 0], [0, 0, 0], false);

  box(pod, 'ConferenceTableTop', [2.6, 0.14, 1.35], mat.oak, [-0.8, 0.8, 0]);
  cylinder(pod, 'ConferencePedestal', 0.22, 0.32, 0.72, mat.dark, [-0.8, 0.4, 0], 16);
  for (const z of [-1.05, 1.05]) {
    addChair(pod, -1.45, z, z > 0 ? Math.PI : 0, mat.fabricCoral);
    addChair(pod, -0.1, z, z > 0 ? Math.PI : 0, mat.fabricCoral);
  }
  box(pod, 'Pinboard', [1.7, 1.2, 0.08], mat.fabricCoral, [-2.62, 1.7, -0.85], [0, Math.PI / 2, 0]);
  box(pod, 'PinboardNote1', [0.35, 0.3, 0.03], mat.warmLight, [-2.56, 1.9, -1.1], [0, Math.PI / 2, 0]);
  box(pod, 'PinboardNote2', [0.48, 0.24, 0.03], mat.white, [-2.56, 1.5, -0.62], [0, Math.PI / 2, 0]);
}

function addStaircase() { window.__bfTrace?.add(282);
  const stair = new THREE.Group();
  stair.name = 'CentralStaircase';
  scene.add(stair);
  const x = 8.2;
  const startZ = -1.8;
  const count = 18;
  const rise = 0.27;
  const run = 0.34;
  for (let i = 0; i < count; i += 1) {
    const y = (i + 1) * rise;
    const z = startZ - i * run;
    box(stair, 'OakStairTread', [2.25, 0.12, run + 0.08], mat.oakLight, [x, y, z]);
    box(stair, 'OakStairRiser', [2.25, rise, 0.08], mat.oak, [x, y - rise * 0.5, z + run * 0.5]);
    box(stair, 'DarkStairNosing', [2.3, 0.045, 0.075], mat.dark, [x, y + 0.065, z - run * 0.5]);
    box(stair, 'StairMarkerLight', [1.5, 0.025, 0.035], mat.warmLight, [x, y + 0.072, z - run * 0.53], [0, 0, 0], false);
  }
  const topY = count * rise;
  const topZ = startZ - (count - 1) * run;
  box(stair, 'MezzanineSlab', [10.2, 0.32, 2.8], mat.concrete, [9.0, topY - 0.18, -7.45]);
  box(stair, 'MezzanineOakEdge', [10.2, 0.3, 0.25], mat.oakLight, [9.0, topY - 0.02, -6.02]);

  const stringerLength = Math.sqrt((count * run) ** 2 + (count * rise) ** 2);
  const stringerAngle = Math.atan2(count * rise, count * run);
  for (const stringerX of [7.25, 9.15]) {
    box(
      stair,
      'DarkStairStringer',
      [0.16, 0.2, stringerLength],
      mat.dark,
      [stringerX, (count * rise) / 2 - 0.02, startZ - (count * run) / 2],
      [stringerAngle, 0, 0],
    );
  }

  const railMaterial = mat.dark;
  for (const sideX of [7.0, 9.4]) {
    for (let i = 0; i <= count; i += 2) {
      const y = 0.95 + i * rise;
      const z = startZ - i * run;
      box(stair, 'StairRailPost', [0.055, 1.05, 0.055], railMaterial, [sideX, y - 0.47, z]);
    }
    const railLength = Math.sqrt((count * run) ** 2 + (count * rise) ** 2);
    const angle = Math.atan2(count * rise, count * run);
    const rail = box(
      stair,
      'StairHandrail',
      [0.09, 0.09, railLength],
      mat.oak,
      [sideX, 0.98 + (count * rise) / 2, startZ - (count * run) / 2],
      [angle, 0, 0],
    );
    rail.castShadow = true;
  }
  for (let xPos = 4.0; xPos <= 13.7; xPos += 1.1) {
    box(stair, 'MezzanineGuardPost', [0.06, 1.25, 0.06], mat.dark, [xPos, topY + 0.48, -6.06]);
  }
  box(stair, 'MezzanineHandrail', [10.1, 0.1, 0.1], mat.oak, [9.0, topY + 1.12, -6.06]);

  const landing = new THREE.Group();
  landing.name = 'UpperCreativeLounge';
  scene.add(landing);
  box(landing, 'LoungeSofaBase', [2.8, 0.42, 0.9], mat.fabricOchre, [11.2, topY + 0.22, -7.3]);
  box(landing, 'LoungeSofaBack', [2.8, 0.85, 0.25], mat.fabricOchre, [11.2, topY + 0.7, -7.7], [-0.08, 0, 0]);
  cylinder(landing, 'LoungeTable', 0.55, 0.55, 0.08, mat.oakLight, [7.2, topY + 0.47, -7.25], 24);
  cylinder(landing, 'LoungeTableStem', 0.09, 0.13, 0.44, mat.dark, [7.2, topY + 0.24, -7.25], 16);
}

function addCreativeDetails() { window.__bfTrace?.add(350);
  addDeskIsland(-9.1, 3.2, 0.02, mat.fabricBlue);
  addDeskIsland(-4.35, 5.65, -0.08, mat.fabricCoral);
  addDeskIsland(-4.15, -0.75, 0.08, mat.fabricOchre);
  addDeskIsland(-9.0, -4.5, -0.03, mat.teal);
  addDeskIsland(0.1, 6.3, 0.05, mat.teal);
  addPlant(-12.5, 7.3, 1.15);
  addPlant(-0.8, 5.0, 0.8);
  addPlant(6.7, 4.4, 0.9);
  addPlant(12.4, -3.4, 1.25);
  addPlant(-12.3, -7.1, 1.05);

  const storage = new THREE.Group();
  storage.name = 'CreativeStorageWall';
  scene.add(storage);
  for (let i = 0; i < 6; i += 1) {
    box(storage, 'StorageCabinet', [1.35, 1.0, 0.55], i % 2 ? mat.oak : mat.teal, [-10.1 + i * 1.42, 0.52, -7.75]);
  }
  box(storage, 'StorageTop', [8.6, 0.1, 0.65], mat.oakLight, [-6.55, 1.08, -7.75]);
  for (let i = 0; i < 11; i += 1) {
    box(storage, 'Book', [0.16 + (i % 3) * 0.05, 0.58 + (i % 2) * 0.16, 0.3], i % 3 === 0 ? mat.fabricCoral : (i % 3 === 1 ? mat.fabricOchre : mat.fabricBlue), [-9.8 + i * 0.38, 1.42, -7.7]);
  }

  const fan = new THREE.Group();
  fan.name = 'CeilingFan';
  fan.position.set(-1.5, 7.55, -3.8);
  scene.add(fan);
  cylinder(fan, 'FanHub', 0.18, 0.18, 0.25, mat.dark, [0, 0, 0], 20);
  for (let i = 0; i < 4; i += 1) {
    const blade = box(fan, 'FanBlade', [1.65, 0.06, 0.25], mat.oak, [0.82, -0.1, 0], [0, i * Math.PI / 2, 0]);
    blade.position.set(Math.cos(i * Math.PI / 2) * 0.82, -0.1, -Math.sin(i * Math.PI / 2) * 0.82);
  }
  return fan;
}

addArchitecture();
addMeetingPod();
addStaircase();
const ceilingFan = addCreativeDetails();

const hemi = new THREE.HemisphereLight(0xd7edf2, 0x4f4a42, 1.7);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffe0b4, 3.15);
sun.position.set(-9, 12, 7);
sun.target.position.set(2, 0, -2);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -18;
sun.shadow.camera.right = 18;
sun.shadow.camera.top = 14;
sun.shadow.camera.bottom = -14;
sun.shadow.camera.near = 0.5;
sun.shadow.camera.far = 40;
sun.shadow.bias = -0.0003;
scene.add(sun, sun.target);

const podLight = new THREE.PointLight(0xffc77a, 17, 8, 2);
podLight.position.set(2.6, 2.8, 0);
scene.add(podLight);
const stairLight = new THREE.PointLight(0xffd099, 22, 10, 2);
stairLight.position.set(8.4, 6.5, -5.5);
scene.add(stairLight);
const fillLight = new THREE.PointLight(0x8ccde0, 14, 12, 2);
fillLight.position.set(-7, 4.5, 2);
scene.add(fillLight);

const cameraPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-12.2, 1.72, 7.1),
  new THREE.Vector3(-10.0, 1.68, 5.6),
  new THREE.Vector3(-7.35, 1.63, 3.95),
  new THREE.Vector3(-5.6, 1.68, 2.15),
  new THREE.Vector3(-2.2, 1.72, 3.0),
  new THREE.Vector3(0.55, 1.70, 2.7),
  new THREE.Vector3(3.65, 1.70, 2.55),
  new THREE.Vector3(3.85, 1.73, 0.15),
  new THREE.Vector3(4.05, 1.78, -2.65),
  new THREE.Vector3(5.65, 1.95, -3.45),
  new THREE.Vector3(5.72, 2.65, -3.92),
  new THREE.Vector3(5.68, 3.82, -4.3),
  new THREE.Vector3(5.65, 4.95, -4.64),
  new THREE.Vector3(5.75, 5.55, -5.18),
], false, 'centripetal');

const cameraTargetPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-9.6, 1.45, 4.0),
  new THREE.Vector3(-6.2, 1.42, 2.45),
  new THREE.Vector3(-2.1, 1.55, 2.65),
  new THREE.Vector3(1.9, 1.58, 1.65),
  new THREE.Vector3(3.75, 1.62, -1.5),
  new THREE.Vector3(6.4, 2.15, -3.25),
  new THREE.Vector3(8.2, 3.55, -4.55),
  new THREE.Vector3(8.65, 5.34, -6.65),
], false, 'centripetal');

function updateAtTime(seconds) { window.__bfTrace?.add(444);
  const time = THREE.MathUtils.clamp(Number(seconds) || 0, 0, DURATION);
  const u = time / DURATION;
  const position = cameraPath.getPointAt(u);
  const lookTarget = cameraTargetPath.getPointAt(u);

  camera.position.copy(position);
  camera.fov = 63 - 4 * Math.sin(Math.PI * u);
  camera.updateProjectionMatrix();
  camera.lookAt(lookTarget);
  camera.rotateZ(0.012 * Math.sin(u * Math.PI * 2) * Math.sin(u * Math.PI));

  ceilingFan.rotation.y = time * 0.72;
  mat.screen.emissiveIntensity = 0.45 + 0.08 * Math.sin(time * 2.4);
  podLight.intensity = 19 + 1.4 * Math.sin(time * 1.7);
  stairLight.intensity = 27 + 1.2 * Math.cos(time * 1.3);

  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  renderer.render(scene, camera);
  return time;
}

let paused = true;

window.reconstruction = {
  pause() {
    paused = true;
    return paused;
  },
  seek(seconds) {
    paused = true;
    return updateAtTime(seconds);
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
