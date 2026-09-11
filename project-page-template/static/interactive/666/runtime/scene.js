import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;

const renderer = new THREE.WebGLRenderer({
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
renderer.toneMappingExposure = 1.14;
renderer.setClearColor(0x191714, 1);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1d1a17);
scene.fog = new THREE.FogExp2(0x262019, 0.014);

const camera = new THREE.PerspectiveCamera(57, WIDTH / HEIGHT, 0.05, 100);
camera.position.set(0, 2.65, 8.2);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

function material(color, roughness = 0.72, metalness = 0) { window.__bfTrace?.add(34);
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const MAT = {
  wall: material(0xd8cbb9, 0.92),
  wallLower: material(0x514438, 0.84),
  trim: material(0x262523, 0.68),
  darkMetal: material(0x1d2120, 0.34, 0.52),
  brass: material(0xb5823c, 0.3, 0.68),
  walnut: material(0x75482a, 0.56),
  walnutEdge: material(0x43291a, 0.48),
  chairWood: material(0x513323, 0.55),
  chairSeat: material(0x4a6253, 0.92),
  cream: material(0xe7ddd0, 0.62),
  ceramic: material(0xf1eee6, 0.28),
  runner: material(0x31473e, 0.96),
  red: material(0x7e2c25, 0.76),
  green: material(0x365c3d, 0.82),
  soil: material(0x251913, 1),
  stone: material(0x887a69, 0.88),
};

function setShadow(object, cast = true, receive = true) { window.__bfTrace?.add(57);
  object.traverse((node) => {
    if (node.isMesh) {
      node.castShadow = cast;
      node.receiveShadow = receive;
    }
  });
  return object;
}

function box(name, size, position, mat, parent = scene) { window.__bfTrace?.add(67);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(name, radiusTop, radiusBottom, height, segments, position, mat, parent = scene) { window.__bfTrace?.add(77);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    mat,
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeFloor() { window.__bfTrace?.add(90);
  const floor = new THREE.Group();
  floor.name = 'oak_floor';
  const colors = [0x6e4a31, 0x795238, 0x644229, 0x825b3e];
  const plankDepth = 0.76;
  const rows = 27;

  for (let row = 0; row < rows; row += 1) {
    const z = -10.62 + row * plankDepth;
    const offset = row % 2 === 0 ? -0.95 : 0;
    for (let col = -4; col <= 4; col += 1) {
      const x = col * 1.9 + offset;
      const plank = new THREE.Mesh(
        new THREE.BoxGeometry(1.86, 0.045, plankDepth - 0.025),
        material(colors[(row + col + 16) % colors.length], 0.8),
      );
      plank.position.set(x, -0.035, z);
      plank.receiveShadow = true;
      floor.add(plank);
    }
  }

  scene.add(floor);

  const runner = box('central_aisle_runner', [1.45, 0.035, 17.1], [0, 0.012, -1.1], MAT.runner);
  runner.receiveShadow = true;
  box('runner_front_bar', [1.55, 0.04, 0.08], [0, 0.035, 7.43], MAT.brass);
  box('runner_back_bar', [1.55, 0.04, 0.08], [0, 0.035, -9.63], MAT.brass);

  for (const [x, z] of [
    [-3.28, 3.15],
    [3.32, 3.15],
    [-3.28, -3.65],
    [3.32, -3.65],
  ]) {
    makeDiningBayInlay(x, z);
  }
}

function makeDiningBayInlay(x, z) { window.__bfTrace?.add(129);
  const inset = material(0x9b713a, 0.6, 0.24);
  box('dining_bay_inlay_long', [4.05, 0.025, 0.055], [x, 0.012, z - 1.62], inset);
  box('dining_bay_inlay_long', [4.05, 0.025, 0.055], [x, 0.012, z + 1.62], inset);
  box('dining_bay_inlay_short', [0.055, 0.025, 3.29], [x - 2.0, 0.012, z], inset);
  box('dining_bay_inlay_short', [0.055, 0.025, 3.29], [x + 2.0, 0.012, z], inset);
}

function makeArchitecture() { window.__bfTrace?.add(137);
  box('left_wall', [0.28, 5.2, 20.5], [-6.42, 2.58, -1.05], MAT.wall);
  box('right_wall', [0.28, 5.2, 20.5], [6.42, 2.58, -1.05], MAT.wall);
  box('back_wall', [13.1, 5.2, 0.28], [0, 2.58, -11.22], MAT.wall);
  box('left_wainscot', [0.31, 1.08, 20.4], [-6.25, 0.54, -1.05], MAT.wallLower);
  box('right_wainscot', [0.31, 1.08, 20.4], [6.25, 0.54, -1.05], MAT.wallLower);
  box('back_wainscot', [12.8, 1.08, 0.31], [0, 0.54, -11.04], MAT.wallLower);
  box('left_trim', [0.34, 0.1, 20.4], [-6.23, 1.1, -1.05], MAT.brass);
  box('right_trim', [0.34, 0.1, 20.4], [6.23, 1.1, -1.05], MAT.brass);
  box('back_trim', [12.8, 0.1, 0.34], [0, 1.1, -11.02], MAT.brass);

  for (const z of [5.0, 0.1, -4.8, -9.6]) {
    box('ceiling_beam', [12.9, 0.18, 0.18], [0, 5.05, z], MAT.trim);
  }

  const ceiling = box('ceiling', [13, 0.15, 20.2], [0, 5.16, -1.05], material(0x493b31, 0.95));
  ceiling.receiveShadow = false;

  makeWindows();
  makeWallFrames();
  makeBackBar();
}

function makeWindows() { window.__bfTrace?.add(160);
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa9d5de,
    emissive: 0x7fa9af,
    emissiveIntensity: 0.72,
    roughness: 0.18,
    metalness: 0.05,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide,
  });

  for (const z of [4.15, -3.65]) {
    const group = new THREE.Group();
    group.name = 'right_window';
    group.position.set(6.23, 2.75, z);
    group.rotation.y = -Math.PI / 2;
    box('window_glass', [3.1, 2.5, 0.035], [0, 0, 0], glassMat, group);
    box('window_frame_top', [3.35, 0.12, 0.1], [0, 1.31, 0.05], MAT.trim, group);
    box('window_frame_bottom', [3.35, 0.12, 0.1], [0, -1.31, 0.05], MAT.trim, group);
    box('window_frame_left', [0.12, 2.72, 0.1], [-1.61, 0, 0.05], MAT.trim, group);
    box('window_frame_right', [0.12, 2.72, 0.1], [1.61, 0, 0.05], MAT.trim, group);
    box('window_mullion_h', [3.2, 0.085, 0.09], [0, 0, 0.06], MAT.trim, group);
    box('window_mullion_v', [0.085, 2.6, 0.09], [0, 0, 0.06], MAT.trim, group);
    scene.add(group);
  }
}

function makeWallFrames() { window.__bfTrace?.add(188);
  for (const z of [4.6, -0.15, -4.9]) {
    const frame = new THREE.Group();
    frame.position.set(-6.22, 2.75, z);
    frame.rotation.y = Math.PI / 2;
    box('art_frame', [1.72, 1.48, 0.11], [0, 0, 0], MAT.trim, frame);
    box('art_matte', [1.5, 1.27, 0.04], [0, 0, 0.07], MAT.cream, frame);
    const accent = material(z < -2 ? 0x405c51 : z < 2 ? 0xa46b42 : 0x783a30, 0.8);
    cylinder('art_circle', 0.39, 0.39, 0.025, 32, [-0.28, 0.08, 0.11], accent, frame).rotation.x = Math.PI / 2;
    box('art_line', [0.18, 0.85, 0.03], [0.4, -0.05, 0.11], MAT.brass, frame).rotation.z = -0.38;
    scene.add(frame);
  }
}

function makeBackBar() { window.__bfTrace?.add(202);
  const bar = new THREE.Group();
  bar.name = 'back_service_bar';
  bar.position.set(0, 0, -10.55);
  box('bar_body', [5.3, 0.98, 0.75], [0, 0.49, 0], MAT.wallLower, bar);
  box('bar_top', [5.6, 0.14, 1.0], [0, 1.03, 0.08], MAT.walnut, bar);
  box('bar_brass_rail', [5.48, 0.05, 0.08], [0, 0.9, 0.47], MAT.brass, bar);

  for (const x of [-1.85, -0.62, 0.62, 1.85]) {
    box('bar_panel', [0.98, 0.64, 0.05], [x, 0.46, 0.4], MAT.walnutEdge, bar);
  }

  for (const x of [-1.65, -0.82, 0, 0.82, 1.65]) {
    const bottleColor = material(x < -0.5 ? 0x31513a : x > 0.5 ? 0x754532 : 0xa07e39, 0.32);
    cylinder('bar_bottle', 0.1, 0.12, 0.55, 12, [x, 1.36, 0], bottleColor, bar);
    cylinder('bar_bottle_neck', 0.045, 0.065, 0.22, 12, [x, 1.7, 0], bottleColor, bar);
  }

  scene.add(bar);
}

function makePendant(x, z) { window.__bfTrace?.add(223);
  const group = new THREE.Group();
  group.name = 'unchanged_pendant';
  group.position.set(x, 0, z);
  cylinder('pendant_cord', 0.018, 0.018, 1.12, 8, [0, 4.55, 0], MAT.darkMetal, group);

  const shadeMat = new THREE.MeshStandardMaterial({
    color: 0x252726,
    roughness: 0.34,
    metalness: 0.64,
    side: THREE.DoubleSide,
  });
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.52, 0.44, 32, 1, true), shadeMat);
  shade.name = 'pendant_shade';
  shade.position.y = 3.85;
  shade.rotation.x = Math.PI;
  shade.castShadow = true;
  group.add(shade);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.515, 0.028, 8, 32), MAT.brass);
  rim.name = 'pendant_rim';
  rim.position.y = 3.63;
  rim.rotation.x = Math.PI / 2;
  group.add(rim);

  const bulbMat = new THREE.MeshStandardMaterial({
    color: 0xffe3ae,
    emissive: 0xffbc63,
    emissiveIntensity: 3.2,
    roughness: 0.18,
  });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 12), bulbMat);
  bulb.position.y = 3.7;
  group.add(bulb);

  const light = new THREE.PointLight(0xffc77a, 13.5, 6.2, 2.0);
  light.position.set(0, 3.65, 0);
  group.add(light);
  scene.add(group);
}

function makeChair(x, z, rotationY, name) { window.__bfTrace?.add(264);
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x, 0, z);
  group.rotation.y = rotationY;

  box('chair_seat', [0.72, 0.14, 0.72], [0, 0.63, 0], MAT.chairSeat, group);
  box('chair_apron_front', [0.65, 0.15, 0.1], [0, 0.53, 0.3], MAT.chairWood, group);
  for (const lx of [-0.27, 0.27]) {
    for (const lz of [-0.27, 0.27]) {
      box('chair_leg', [0.09, 0.64, 0.09], [lx, 0.3, lz], MAT.chairWood, group);
    }
  }
  for (const bx of [-0.29, 0.29]) {
    box('chair_back_post', [0.09, 1.08, 0.1], [bx, 1.05, -0.31], MAT.chairWood, group);
  }
  box('chair_back_top', [0.71, 0.13, 0.12], [0, 1.52, -0.31], MAT.chairWood, group);
  for (const sx of [-0.18, 0, 0.18]) {
    box('chair_back_slat', [0.07, 0.58, 0.08], [sx, 1.17, -0.31], MAT.chairWood, group);
  }

  scene.add(setShadow(group));
}

function makePlaceSetting(parent, x, z, rotationY) { window.__bfTrace?.add(288);
  const setting = new THREE.Group();
  setting.position.set(x, 0, z);
  setting.rotation.y = rotationY;

  const plate = cylinder('dinner_plate', 0.23, 0.23, 0.035, 28, [0, 1.17, 0], MAT.ceramic, setting);
  plate.scale.z = 0.82;
  cylinder('plate_center', 0.14, 0.14, 0.018, 24, [0, 1.195, 0], material(0xd2c6b7, 0.5), setting).scale.z = 0.82;
  const napkin = box('folded_napkin', [0.2, 0.035, 0.32], [0, 1.225, 0], MAT.red, setting);
  napkin.rotation.y = 0.16;

  box('fork', [0.022, 0.025, 0.34], [-0.31, 1.2, 0], MAT.brass, setting);
  box('knife', [0.022, 0.028, 0.34], [0.31, 1.2, 0], MAT.brass, setting);

  const glassMat = new THREE.MeshPhysicalMaterial({
    color: 0xcce4e5,
    roughness: 0.05,
    metalness: 0,
    transmission: 0.5,
    transparent: true,
    opacity: 0.48,
    thickness: 0.05,
  });
  const glass = cylinder('water_glass', 0.075, 0.06, 0.24, 16, [0.3, 1.31, -0.24], glassMat, setting);
  glass.castShadow = false;
  parent.add(setting);
}

function makeTableSet(x, z, label) { window.__bfTrace?.add(316);
  const group = new THREE.Group();
  group.name = label;
  group.position.set(x, 0, z);

  const top = box('table_top', [2.45, 0.16, 1.38], [0, 1.05, 0], MAT.walnut, group);
  top.geometry.translate(0, 0, 0);
  box('table_edge_front', [2.49, 0.13, 0.08], [0, 0.98, 0.69], MAT.walnutEdge, group);
  box('table_edge_back', [2.49, 0.13, 0.08], [0, 0.98, -0.69], MAT.walnutEdge, group);
  for (const lx of [-0.98, 0.98]) {
    for (const lz of [-0.47, 0.47]) {
      const leg = box('table_leg', [0.13, 1.02, 0.13], [lx, 0.51, lz], MAT.walnutEdge, group);
      leg.rotation.z = lx * 0.014;
    }
  }

  for (const [px, pz, rot] of [
    [-0.66, 0.32, 0],
    [0.66, 0.32, 0],
    [-0.66, -0.32, Math.PI],
    [0.66, -0.32, Math.PI],
  ]) {
    makePlaceSetting(group, px, pz, rot);
  }

  cylinder('vase', 0.12, 0.17, 0.42, 20, [0, 1.31, 0], MAT.cream, group);
  cylinder('vase_neck', 0.07, 0.1, 0.18, 20, [0, 1.57, 0], MAT.cream, group);
  for (const [dx, dz, color] of [
    [-0.12, 0, 0xc98b4e],
    [0.1, 0.08, 0xd9b25f],
    [0.04, -0.11, 0x9e493b],
  ]) {
    cylinder('flower_stem', 0.012, 0.012, 0.38, 6, [dx * 0.5, 1.83, dz * 0.5], MAT.green, group);
    const flower = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 8), material(color, 0.8));
    flower.name = 'flower';
    flower.position.set(dx, 2.02, dz);
    group.add(flower);
  }

  scene.add(setShadow(group));

  makeChair(x - 1.55, z, Math.PI / 2, `${label}_outer_chair`);
  makeChair(x + 1.55, z, -Math.PI / 2, `${label}_aisle_chair`);
  makeChair(x, z - 1.14, 0, `${label}_back_chair`);
  makeChair(x, z + 1.14, Math.PI, `${label}_front_chair`);
}

function makePlant(x, z, scale = 1) { window.__bfTrace?.add(363);
  const group = new THREE.Group();
  group.name = 'potted_plant';
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  cylinder('plant_pot', 0.34, 0.26, 0.55, 20, [0, 0.28, 0], material(0x8d5639, 0.87), group);
  cylinder('plant_soil', 0.3, 0.3, 0.025, 20, [0, 0.56, 0], MAT.soil, group);
  cylinder('plant_stem', 0.04, 0.055, 1.32, 8, [0, 1.12, 0], MAT.green, group);

  for (let i = 0; i < 9; i += 1) {
    const angle = i * 2.399;
    const y = 0.82 + (i % 5) * 0.27;
    const leaf = new THREE.Mesh(
      new THREE.SphereGeometry(0.34, 12, 7),
      i % 2 ? MAT.green : material(0x486f4a, 0.86),
    );
    leaf.name = 'plant_leaf';
    leaf.scale.set(1.45, 0.42, 0.56);
    leaf.position.set(Math.cos(angle) * 0.27, y, Math.sin(angle) * 0.27);
    leaf.rotation.y = -angle;
    leaf.rotation.z = Math.sin(angle) * 0.35;
    leaf.castShadow = true;
    group.add(leaf);
  }
  scene.add(group);
}

function makeLights() { window.__bfTrace?.add(390);
  scene.add(new THREE.HemisphereLight(0xb9d2d5, 0x573d2b, 2.0));

  const sun = new THREE.DirectionalLight(0xfff2dc, 2.45);
  sun.position.set(7.5, 7.8, 6.2);
  sun.target.position.set(-0.8, 0, -2.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1536, 1536);
  sun.shadow.camera.left = -8;
  sun.shadow.camera.right = 8;
  sun.shadow.camera.top = 11;
  sun.shadow.camera.bottom = -5;
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 26;
  sun.shadow.bias = -0.00035;
  scene.add(sun, sun.target);

  const frontFill = new THREE.DirectionalLight(0xffd7ad, 0.85);
  frontFill.position.set(-1.5, 4.3, 8.5);
  frontFill.target.position.set(0, 1.1, -4.5);
  scene.add(frontFill, frontFill.target);

  const backFill = new THREE.PointLight(0xffaa60, 10, 8, 2);
  backFill.position.set(0, 3.7, -9.2);
  scene.add(backFill);
}

makeFloor();
makeArchitecture();
makeLights();

// The original restaurant has one dining set beneath each pendant.
for (const [x, z] of [
  [-3.28, 3.15],
  [3.32, 3.15],
  [-3.28, -3.65],
  [3.32, -3.65],
]) {
  makePendant(x, z);
}

makeTableSet(-3.28, 3.15, 'left_first_table');
makeTableSet(3.32, 3.15, 'right_first_table');
makeTableSet(-3.28, -3.65, 'left_second_table');
makeTableSet(3.32, -3.65, 'right_second_table');

makePlant(-5.58, -9.65, 0.95);
makePlant(5.55, -9.7, 0.82);

function smootherStep(value) { window.__bfTrace?.add(439);
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function updateAtTime(seconds) { window.__bfTrace?.add(444);
  const t = THREE.MathUtils.clamp(Number.isFinite(seconds) ? seconds : 0, 0, DURATION);
  const u = t / DURATION;
  const travel = 0.68 * u + 0.32 * smootherStep(u);

  camera.position.set(
    0.1 - 0.36 * travel + 0.08 * Math.sin(u * Math.PI),
    2.9 - 0.42 * travel + 0.035 * Math.sin(u * Math.PI * 2),
    9.18 - 8.08 * travel,
  );

  const target = new THREE.Vector3(
    -0.06 - 0.4 * travel,
    1.14 + 0.03 * Math.sin(u * Math.PI),
    -1.82 - 4.64 * travel,
  );
  camera.fov = 60 - 5 * travel;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}

let paused = true;

window.reconstruction = {
  pause() {
    paused = true;
    return paused;
  },
  seek(seconds) {
    paused = true;
    updateAtTime(seconds);
    return seconds;
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
};

window.__SCENE_METADATA__ = {
  width: WIDTH,
  height: HEIGHT,
  fps: FPS,
  frames: FRAME_COUNT,
  duration: DURATION,
  diningSets: [
    'left_first_table',
    'right_first_table',
    'left_second_table',
    'right_second_table',
  ],
  maxAnisotropy,
};

updateAtTime(0);
window.__RECONSTRUCTION_READY__ = true;
