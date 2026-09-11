import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd8d1c5);
scene.fog = new THREE.FogExp2(0xd8d1c5, 0.008);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance'
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.03;
renderer.domElement.id = 'reconstruction-canvas';
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(58, WIDTH / HEIGHT, 0.05, 60);
camera.position.set(-4.8, 2.25, 5.1);

function material(color, roughness = 0.7, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const palette = {
  plaster: material(0xe8e1d4, 0.94),
  ceiling: material(0xf4f0e7, 0.97),
  oak: material(0xbe9562, 0.73),
  oakLight: material(0xcaa56f, 0.79),
  oakDark: material(0x916b43, 0.75),
  sofa: material(0xc9bdab, 0.98),
  sofaEdge: material(0xaa9c89, 1),
  cream: material(0xf2ecdf, 0.96),
  charcoal: material(0x3e403d, 0.76),
  green: material(0x315f3f, 0.82),
  greenLight: material(0x4f7953, 0.86),
  terracotta: material(0xac6848, 0.8),
  brass: material(0xc69d58, 0.38, 0.58),
  blueGrey: material(0x476b6c, 0.9)
};

function box(name, size, position, mat, parent = scene, cast = true, receive = true) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = cast;
  mesh.receiveShadow = receive;
  parent.add(mesh);
  return mesh;
}

function cylinder(name, radiusTop, radiusBottom, height, segments, position, mat, parent = scene) {
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    mat
  );
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function roundedShape(width, height, radius) {
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
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

function roundedPanel(name, width, height, depth, radius, position, mat, parent = scene) {
  const geometry = new THREE.ExtrudeGeometry(roundedShape(width, height, radius), {
    depth,
    curveSegments: 8,
    bevelEnabled: true,
    bevelThickness: 0.055,
    bevelSize: 0.055,
    bevelSegments: 3
  });
  geometry.center();
  const mesh = new THREE.Mesh(geometry, mat);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function leafGeometry(length = 0.72, width = 0.25) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(width, length * 0.18, width, length * 0.72, 0, length);
  shape.bezierCurveTo(-width, length * 0.72, -width, length * 0.18, 0, 0);
  const geometry = new THREE.ShapeGeometry(shape, 12);
  geometry.translate(0, -length * 0.1, 0);
  return geometry;
}

function makeRoom() {
  const room = new THREE.Group();
  room.name = 'architectural-shell';
  scene.add(room);

  box('left-wall', [0.16, 5.2, 10.6], [-5.5, 2.6, 0], palette.plaster, room, false);
  box('right-wall', [0.16, 5.2, 10.6], [5.5, 2.6, 0], palette.plaster, room, false);
  box('ceiling', [11.2, 0.14, 10.6], [0, 5.2, 0], palette.ceiling, room, false);

  box('window-wall-left', [3.9, 5.2, 0.18], [-3.55, 2.6, -5.18], palette.plaster, room, false);
  box('window-wall-right', [0.8, 5.2, 0.18], [5.1, 2.6, -5.18], palette.plaster, room, false);
  box('window-wall-lintel', [6.3, 0.64, 0.18], [1.55, 4.88, -5.18], palette.plaster, room, false);
  box('window-wall-sill', [6.3, 0.92, 0.18], [1.55, 0.46, -5.18], palette.plaster, room, false);

  const sky = new THREE.Mesh(
    new THREE.PlaneGeometry(6.35, 4),
    new THREE.MeshBasicMaterial({ color: 0xb9d5df })
  );
  sky.name = 'procedural-sky';
  sky.position.set(1.55, 2.75, -5.3);
  room.add(sky);

  const distantGround = new THREE.Mesh(
    new THREE.PlaneGeometry(6.35, 1.18),
    new THREE.MeshBasicMaterial({ color: 0x8ca091 })
  );
  distantGround.position.set(1.55, 1.44, -5.275);
  room.add(distantGround);

  const mountainShape = new THREE.Shape();
  mountainShape.moveTo(-3.2, -0.6);
  mountainShape.lineTo(-2.4, 0.1);
  mountainShape.lineTo(-1.7, -0.15);
  mountainShape.lineTo(-0.75, 0.48);
  mountainShape.lineTo(0.05, -0.02);
  mountainShape.lineTo(0.8, 0.28);
  mountainShape.lineTo(1.55, -0.12);
  mountainShape.lineTo(2.3, 0.38);
  mountainShape.lineTo(3.2, -0.35);
  mountainShape.lineTo(3.2, -0.7);
  mountainShape.lineTo(-3.2, -0.7);
  const mountains = new THREE.Mesh(
    new THREE.ShapeGeometry(mountainShape),
    new THREE.MeshBasicMaterial({ color: 0x78918a })
  );
  mountains.position.set(1.55, 2.0, -5.265);
  room.add(mountains);

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xddebed,
    transparent: true,
    opacity: 0.18,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.08,
    depthWrite: false
  });
  for (const x of [-0.5, 1.55, 3.6]) {
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 3.6), glassMaterial);
    glass.position.set(x, 2.72, -5.02);
    room.add(glass);
  }

  for (const x of [-1.55, 0.53, 2.58, 4.66]) {
    box('window-mullion', [0.11, 3.82, 0.16], [x, 2.76, -4.94], palette.cream, room, false);
  }
  box('window-head', [6.32, 0.12, 0.18], [1.55, 4.64, -4.94], palette.cream, room, false);
  box('window-sill', [6.45, 0.16, 0.4], [1.55, 0.88, -4.91], palette.cream, room, false);

  const curtainMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0eadc,
    roughness: 1,
    transparent: true,
    opacity: 0.78,
    side: THREE.DoubleSide
  });
  const curtainGeometry = new THREE.PlaneGeometry(0.78, 3.72, 7, 1);
  const curtainPositions = curtainGeometry.attributes.position;
  for (let i = 0; i < curtainPositions.count; i += 1) {
    const x = curtainPositions.getX(i);
    curtainPositions.setZ(i, Math.cos((x + 0.39) * 24) * 0.055);
  }
  curtainGeometry.computeVertexNormals();
  const leftCurtain = new THREE.Mesh(curtainGeometry, curtainMaterial);
  leftCurtain.name = 'left-curtain';
  leftCurtain.position.set(-1.29, 2.75, -4.67);
  leftCurtain.castShadow = true;
  room.add(leftCurtain);
  const rightCurtain = leftCurtain.clone();
  rightCurtain.name = 'right-curtain';
  rightCurtain.position.x = 4.38;
  room.add(rightCurtain);

  const plankColors = [0xcba878, 0xbf9868, 0xd4b586, 0xb99060, 0xc7a371];
  for (let i = 0; i < 22; i += 1) {
    const plankMat = material(plankColors[i % plankColors.length], 0.77);
    const x = -5.25 + i * 0.5;
    box(`floor-plank-${i}`, [0.485, 0.07, 10.5], [x, 0, 0], plankMat, room, false);
    if (i % 2 === 0) {
      box(`floor-grain-${i}`, [0.012, 0.009, 8.8], [x + 0.13, 0.041, 0], palette.oakDark, room, false);
    }
  }
}

function makeSofa() {
  const sofa = new THREE.Group();
  sofa.name = 'textured-linen-sofa';
  sofa.position.set(-2.82, 0, -2.14);
  scene.add(sofa);

  box('sofa-shadow-base', [3.62, 0.42, 1.18], [0, 0.38, 0], palette.sofaEdge, sofa);
  roundedPanel('sofa-back', 3.52, 1.18, 0.3, 0.18, [0, 1.25, -0.48], palette.sofa, sofa);
  roundedPanel('left-arm', 0.36, 0.73, 1.18, 0.15, [-1.74, 0.83, 0], palette.sofa, sofa);
  roundedPanel('right-arm', 0.36, 0.73, 1.18, 0.15, [1.74, 0.83, 0], palette.sofa, sofa);

  for (const x of [-0.86, 0.02, 0.9]) {
    const seat = roundedPanel('seat-cushion', 0.81, 0.28, 0.92, 0.13, [x, 0.78, 0.12], palette.sofa, sofa);
    seat.rotation.x = -0.03;
    const back = roundedPanel('back-cushion', 0.82, 0.84, 0.22, 0.15, [x, 1.25, -0.25], palette.sofa, sofa);
    back.rotation.x = -0.1;
  }

  const rustPillow = roundedPanel('rust-accent-pillow', 0.58, 0.58, 0.2, 0.16, [-1.18, 1.18, -0.02], palette.terracotta, sofa);
  rustPillow.rotation.z = 0.12;
  const palePillow = roundedPanel('pale-accent-pillow', 0.54, 0.62, 0.2, 0.16, [1.15, 1.18, -0.02], palette.cream, sofa);
  palePillow.rotation.z = -0.11;

  for (const x of [-1.42, 1.42]) {
    const leg = cylinder('sofa-leg', 0.045, 0.055, 0.28, 12, [x, 0.17, 0.35], palette.charcoal, sofa);
    leg.rotation.x = 0.09;
  }

  const weave = new THREE.Group();
  weave.name = 'sofa-texture-stitches';
  for (let i = 0; i < 16; i += 1) {
    const stitch = box('linen-stitch', [0.12, 0.009, 0.013], [-1.55 + i * 0.205, 1.72, -0.322], palette.sofaEdge, weave, false, false);
    stitch.rotation.z = (i % 2 ? 1 : -1) * 0.04;
  }
  sofa.add(weave);
}

function makeRugAndTable() {
  const rug = new THREE.Mesh(
    new THREE.ShapeGeometry(roundedShape(5.0, 3.55, 0.28), 10),
    new THREE.MeshStandardMaterial({
      color: 0xbeb29c,
      roughness: 1,
      side: THREE.DoubleSide
    })
  );
  rug.name = 'woven-wool-rug';
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(-0.2, 0.047, -0.05);
  rug.receiveShadow = true;
  scene.add(rug);

  const border = new THREE.Mesh(
    new THREE.RingGeometry(0.95, 1.04, 64),
    new THREE.MeshStandardMaterial({ color: 0x9e917b, roughness: 1, side: THREE.DoubleSide })
  );
  border.name = 'rug-woven-detail';
  border.rotation.x = -Math.PI / 2;
  border.scale.set(2.15, 1.3, 1);
  border.position.set(-0.2, 0.052, -0.05);
  scene.add(border);

  const table = new THREE.Group();
  table.name = 'oval-oak-coffee-table';
  table.position.set(0.02, 0, -0.08);
  scene.add(table);
  const top = cylinder('oval-table-top', 1.22, 1.25, 0.18, 64, [0, 0.62, 0], palette.oakLight, table);
  top.scale.z = 0.62;
  for (const [x, z] of [[-0.72, -0.35], [0.72, -0.35], [-0.72, 0.35], [0.72, 0.35]]) {
    const leg = cylinder('tapered-table-leg', 0.055, 0.085, 0.57, 12, [x, 0.3, z], palette.oakDark, table);
    leg.rotation.z = x * 0.045;
  }

  const tray = cylinder('ceramic-tray', 0.37, 0.39, 0.045, 40, [-0.25, 0.735, 0.02], palette.cream, table);
  tray.scale.z = 0.7;
  const vase = cylinder('small-vase', 0.13, 0.18, 0.37, 28, [0.35, 0.89, -0.07], palette.terracotta, table);
  const twigMaterial = palette.green;
  for (const angle of [-0.35, 0.08, 0.42]) {
    const twig = cylinder('vase-twig', 0.012, 0.017, 0.58, 8, [0.35, 1.28, -0.07], twigMaterial, table);
    twig.rotation.z = angle;
  }
}

function makeChairAndLamp() {
  const chair = new THREE.Group();
  chair.name = 'blue-grey-lounge-chair';
  chair.position.set(3.22, 0, -1.5);
  chair.rotation.y = -0.58;
  chair.scale.setScalar(0.94);
  scene.add(chair);
  const chairSeat = roundedPanel('chair-seat', 1.2, 0.25, 1.05, 0.16, [0, 0.68, 0], palette.blueGrey, chair);
  chairSeat.rotation.x = -0.08;
  const chairBack = roundedPanel('chair-back', 1.22, 1.18, 0.22, 0.19, [0, 1.28, -0.42], palette.blueGrey, chair);
  chairBack.rotation.x = -0.2;
  for (const x of [-0.46, 0.46]) {
    for (const z of [-0.34, 0.34]) {
      const leg = cylinder('chair-leg', 0.035, 0.055, 0.63, 10, [x, 0.32, z], palette.charcoal, chair);
      leg.rotation.z = x * 0.12;
    }
  }

  const lamp = new THREE.Group();
  lamp.name = 'arched-brass-floor-lamp';
  lamp.position.set(4.1, 0, -2.75);
  scene.add(lamp);
  cylinder('lamp-base', 0.34, 0.38, 0.08, 32, [0, 0.07, 0], palette.brass, lamp);
  const pole = cylinder('lamp-pole', 0.035, 0.045, 2.65, 12, [0, 1.38, 0], palette.brass, lamp);
  pole.rotation.z = -0.08;
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.48, 0.5, 32, 1, true),
    new THREE.MeshStandardMaterial({ color: 0xd7c7a8, roughness: 0.88, side: THREE.DoubleSide })
  );
  shade.name = 'linen-lamp-shade';
  shade.position.set(0.1, 2.65, 0);
  shade.castShadow = true;
  lamp.add(shade);
  const bulb = new THREE.PointLight(0xffd2a0, 9, 4.2, 2);
  bulb.position.set(0.1, 2.53, 0);
  bulb.castShadow = true;
  bulb.shadow.mapSize.set(512, 512);
  lamp.add(bulb);
}

function makeForegroundPlant() {
  const plant = new THREE.Group();
  plant.name = 'foreground-fiddle-leaf-plant';
  plant.position.set(-3.28, 0, 3.08);
  scene.add(plant);
  cylinder('ceramic-planter', 0.38, 0.29, 0.72, 32, [0, 0.38, 0], palette.cream, plant);
  cylinder('pot-rim', 0.42, 0.42, 0.1, 32, [0, 0.73, 0], palette.cream, plant);

  const stemMaterial = material(0x5e5136, 0.9);
  const leaves = new THREE.Group();
  leaves.name = 'animated-plant-leaves';
  plant.add(leaves);
  const stems = [
    { x: 0, z: 0, h: 2.15, rz: -0.08 },
    { x: -0.08, z: 0.03, h: 1.82, rz: 0.18 },
    { x: 0.1, z: -0.03, h: 1.67, rz: -0.22 }
  ];
  for (const [stemIndex, stem] of stems.entries()) {
    const branch = cylinder('plant-stem', 0.025, 0.038, stem.h, 10, [stem.x, 0.72 + stem.h / 2, stem.z], stemMaterial, plant);
    branch.rotation.z = stem.rz;
    const levels = stemIndex === 0 ? [0.42, 0.76, 1.1, 1.43, 1.78] : [0.45, 0.85, 1.2];
    for (const [index, level] of levels.entries()) {
      const leaf = new THREE.Mesh(leafGeometry(0.68 - stemIndex * 0.05, 0.24), index % 2 ? palette.greenLight : palette.green);
      leaf.name = 'broad-plant-leaf';
      const side = index % 2 ? 1 : -1;
      leaf.position.set(stem.x + side * 0.1, 0.79 + level, stem.z);
      leaf.rotation.set(-0.58 + stemIndex * 0.08, side * 0.34, side * 1.02);
      leaf.scale.set(1.02, 1.02, 1.02);
      leaf.castShadow = true;
      leaf.userData.baseRotationZ = leaf.rotation.z;
      leaf.userData.phase = stemIndex * 1.7 + index * 0.9;
      leaves.add(leaf);
    }
  }
  return leaves;
}

function makeDecor() {
  const art = new THREE.Group();
  art.name = 'minimal-wall-art';
  art.position.set(-5.36, 2.75, -0.85);
  art.rotation.y = Math.PI / 2;
  scene.add(art);
  box('art-frame', [1.72, 2.12, 0.08], [0, 0, 0], palette.oakDark, art, false);
  box('art-mat', [1.54, 1.94, 0.055], [0, 0, 0.055], palette.cream, art, false);
  const motif = new THREE.Mesh(
    new THREE.TorusGeometry(0.48, 0.08, 16, 48, Math.PI * 1.4),
    palette.terracotta
  );
  motif.position.z = 0.1;
  motif.rotation.z = 0.7;
  art.add(motif);

  const consoleGroup = new THREE.Group();
  consoleGroup.name = 'slatted-oak-sideboard';
  consoleGroup.position.set(4.92, 0, 0.72);
  consoleGroup.rotation.y = -Math.PI / 2;
  scene.add(consoleGroup);
  box('sideboard-body', [2.1, 0.76, 0.42], [0, 0.72, 0], palette.oakLight, consoleGroup);
  for (let i = 0; i < 10; i += 1) {
    box('sideboard-slat', [0.035, 0.62, 0.025], [-0.92 + i * 0.205, 0.72, 0.226], palette.oakDark, consoleGroup);
  }
  for (const x of [-0.82, 0.82]) {
    cylinder('sideboard-leg', 0.035, 0.05, 0.34, 10, [x, 0.24, 0], palette.charcoal, consoleGroup);
  }
  const bowl = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
    palette.terracotta
  );
  bowl.name = 'sideboard-bowl';
  bowl.scale.y = 0.4;
  bowl.position.set(0.45, 1.19, 0);
  consoleGroup.add(bowl);
}

makeRoom();
makeSofa();
makeRugAndTable();
makeChairAndLamp();
const animatedLeaves = makeForegroundPlant();
makeDecor();

const hemisphere = new THREE.HemisphereLight(0xdcebf0, 0xa59074, 1.55);
scene.add(hemisphere);
const windowLight = new THREE.DirectionalLight(0xfff0d4, 3.55);
windowLight.position.set(2.8, 6.8, -4.4);
windowLight.target.position.set(-0.5, 0, 1.5);
windowLight.castShadow = true;
windowLight.shadow.mapSize.set(1536, 1536);
windowLight.shadow.camera.left = -7;
windowLight.shadow.camera.right = 7;
windowLight.shadow.camera.top = 7;
windowLight.shadow.camera.bottom = -4;
windowLight.shadow.camera.near = 0.1;
windowLight.shadow.camera.far = 18;
windowLight.shadow.bias = -0.00015;
scene.add(windowLight, windowLight.target);

const fill = new THREE.PointLight(0xffe0b8, 8.5, 9, 2);
fill.position.set(-2.2, 3.8, 2.8);
scene.add(fill);
scene.add(new THREE.AmbientLight(0xfff4e6, 0.26));

const cameraCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-4.82, 2.28, 5.02),
  new THREE.Vector3(-4.32, 2.17, 3.72),
  new THREE.Vector3(-3.35, 1.96, 1.62),
  new THREE.Vector3(-1.42, 1.76, 1.72),
  new THREE.Vector3(0.18, 1.72, 2.46),
  new THREE.Vector3(1.08, 1.88, 2.0)
], false, 'catmullrom', 0.55);

const targetCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-3.24, 1.5, 3.04),
  new THREE.Vector3(-3.12, 1.37, -0.8),
  new THREE.Vector3(-2.42, 1.25, -2.0),
  new THREE.Vector3(-0.1, 0.94, -0.1),
  new THREE.Vector3(0.65, 1.42, -2.25),
  new THREE.Vector3(1.48, 2.32, -5.12)
], false, 'catmullrom', 0.45);

const curtains = [
  scene.getObjectByName('left-curtain'),
  scene.getObjectByName('right-curtain')
];
const cameraTarget = new THREE.Vector3();
const clock = new THREE.Clock();
let playing = true;
let playStart = performance.now() / 1000;
let currentTime = 0;

function smootherStep(value) {
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function updateScene(time) {
  currentTime = THREE.MathUtils.clamp(time, 0, DURATION);
  const normalized = currentTime / DURATION;
  const progress = THREE.MathUtils.lerp(normalized, smootherStep(normalized), 0.36);
  cameraCurve.getPointAt(progress, camera.position);
  targetCurve.getPointAt(progress, cameraTarget);
  camera.fov = THREE.MathUtils.lerp(61, 57, smootherStep(normalized));
  camera.updateProjectionMatrix();
  camera.lookAt(cameraTarget);
  camera.updateMatrixWorld(true);

  animatedLeaves.children.forEach((leaf) => {
    leaf.rotation.z = leaf.userData.baseRotationZ
      + Math.sin(currentTime * 1.15 + leaf.userData.phase) * 0.016;
  });
  curtains[0].rotation.y = Math.sin(currentTime * 0.72) * 0.018;
  curtains[1].rotation.y = -Math.sin(currentTime * 0.72 + 0.7) * 0.018;
}

function render() {
  renderer.render(scene, camera);
}

function animate() {
  if (playing) {
    const now = performance.now() / 1000;
    const elapsed = now - playStart;
    updateScene(elapsed % DURATION);
    render();
  }
  requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    playing = false;
    render();
  },
  seek(seconds) {
    playing = false;
    updateScene(Number(seconds));
    render();
    return currentTime;
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov
    };
  }
};

updateScene(0);
render();
window.__READY__ = true;
animate();
