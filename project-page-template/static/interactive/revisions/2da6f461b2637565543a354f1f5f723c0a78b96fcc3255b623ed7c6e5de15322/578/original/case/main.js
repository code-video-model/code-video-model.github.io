import * as THREE from '../vendor/three.module.js';

const WIDTH = 960, HEIGHT = 540, DURATION = 124 / 24;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d5d8d2');
const camera = new THREE.PerspectiveCamera(43.5, WIDTH / HEIGHT, 0.1, 70);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const room = new THREE.Group();
room.name = 'shared-hospital-lobby';
scene.add(room);
let seed = 577;
function random() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
function material(name, color, roughness = 0.65, metalness = 0) {
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  m.name = name;
  return m;
}
function proceduralTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(256, 256);
  for (let y = 0; y < 256; y++) for (let x = 0; x < 256; x++) {
    const r = random();
    let n = 184 + (r - 0.5) * 26 + 3 * Math.sin(x * 0.08 + Math.sin(y * 0.09)) * Math.cos(y * 0.11);
    if (kind === 'wood') n = 160 + 23 * Math.sin(y * 0.34 + 2 * Math.sin(x * 0.017)) + (r - 0.5) * 16;
    if (kind === 'metal') n = 200 + (r - 0.5) * 9 + Math.sin(y * 5.1) * 9;
    const i = (y * 256 + x) * 4;
    image.data[i] = n; image.data[i + 1] = n; image.data[i + 2] = n; image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(kind === 'floor' ? 15 : 1, kind === 'floor' ? 15 : 1);
  return tex;
}
const mats = {
  wall: material('warm-white-plaster', '#d9d9cf', 0.95),
  floor: material('mottled-grey-stone', '#b7b9b4', 0.49),
  dark: material('charcoal-painted-metal', '#303a38', 0.57, 0.35),
  silver: material('brushed-steel', '#c3c8c6', 0.39, 0.68),
  brightMetal: material('polished-edge-steel', '#cbd1ca', 0.25, 0.8),
  wood: material('warm-oak', '#94653d', 0.57),
  teal: material('teal-upholstery', '#294f4d', 0.87),
  white: material('white-planter-ceramic', '#e8e6dc', 0.43),
  soil: material('dark-potting-soil', '#262c1d', 1),
  bark: material('tree-bark', '#5b5036', 1),
  leaf: material('leaf-green', '#28421c', 0.8),
  leafLight: material('new-growth-green', '#536e2a', 0.82),
  fern: material('fern-green', '#304e21', 0.8),
  skin: material('nurse-skin', '#c79273', 0.85),
  hair: material('brown-hair', '#48372a', 0.94),
  scrubs: material('nurse-teal-scrubs', '#287878', 0.9),
  rubber: material('black-rubber', '#1d2524', 0.87),
  red: material('red-insulated-cable', '#833a2b', 0.64),
  cyan: new THREE.MeshStandardMaterial({ color: '#57e7df', emissive: '#26d7c5', emissiveIntensity: 1.65, roughness: 0.5 }),
};
mats.floor.map = proceduralTexture('floor');
mats.floor.bumpMap = mats.floor.map; mats.floor.bumpScale = 0.012;
mats.wood.map = proceduralTexture('wood');
mats.silver.map = proceduralTexture('metal');
const environmentDefinition = {
  type: 'procedural-interior-reflection-room', background: '#a3b0ad',
  panels: [
    { size: [0.1, 7, 12], position: [8, 4, 0], color: '#fff6df', intensity: 2.2 },
    { size: [0.1, 6, 9], position: [-7, 4, 1], color: '#e9f3f0', intensity: 1.1 },
    { size: [10, 0.1, 10], position: [0, 8, 0], color: '#edf0ec', intensity: 1.3 },
    { size: [8, 5, 0.1], position: [0, 3, 9], color: '#d6dfdc', intensity: 0.9 }
  ]
};
const reflectionRoom = new THREE.Scene();
reflectionRoom.background = new THREE.Color(environmentDefinition.background);
for (const panel of environmentDefinition.panels) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(...panel.size),
    new THREE.MeshBasicMaterial({ color: new THREE.Color(panel.color).multiplyScalar(panel.intensity) }));
  m.position.set(...panel.position); reflectionRoom.add(m);
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(reflectionRoom, 0.06, 0.1, 40).texture;
pmrem.dispose();
for (const m of Object.values(mats)) m.envMapIntensity = m.metalness > 0.6 ? 0.85 : 0.25;
function mesh(geometry, mat, pos, parent = room, name = '') {
  const m = new THREE.Mesh(geometry, mat);
  m.name = name;
  if (pos) m.position.copy(pos);
  m.castShadow = true; m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(w, h, d, mat, x, y, z, parent = room, name = '') {
  return mesh(new THREE.BoxGeometry(w, h, d), mat, v3(x, y, z), parent, name);
}
function cyl(rt, rb, h, mat, x, y, z, parent = room, segments = 32) {
  return mesh(new THREE.CylinderGeometry(rt, rb, h, segments), mat, v3(x, y, z), parent);
}
function ellipsoid(x, y, z, sx, sy, sz, mat, parent = room) {
  const m = mesh(new THREE.SphereGeometry(1, 16, 12), mat, v3(x, y, z), parent);
  m.scale.set(sx, sy, sz); return m;
}
function rod(a, b, radius, mat, parent = room, radiusB = radius) {
  const d = b.clone().sub(a);
  const m = mesh(new THREE.CylinderGeometry(radiusB, radius, d.length(), 10), mat, a.clone().add(b).multiplyScalar(0.5), parent);
  m.quaternion.setFromUnitVectors(v3(0, 1, 0), d.normalize());
  return m;
}
function tube(points, radius, mat, parent = room) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 48, radius, 8, false), mat, null, parent);
}
function sign(text, w, h, x, y, z, options = {}) {
  const { color = '#303b36', background = '#bdbeb3', parent = room, size = 72 } = options;
  const c = document.createElement('canvas'); c.width = 1024; c.height = Math.round(1024 * h / w);
  const ctx = c.getContext('2d');
  ctx.fillStyle = background; ctx.fillRect(0, 0, c.width, c.height);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `600 ${size}px sans-serif`;
  ctx.fillText(text, c.width / 2, c.height / 2, c.width * 0.91);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshStandardMaterial({ map: texture, roughness: 0.65 });
  mat.name = `procedural-sign-${text}`;
  return box(w, h, 0.035, mat, x, y, z, parent, text);
}

box(28, 0.16, 27, mats.floor, 0, -0.09, 2);
const grout = material('tile-grout', '#555d57', 0.9);
grout.envMapIntensity = 0.2;
for (let i = -12; i <= 12; i++) {
  box(25, 0.005, 0.012, grout, 0, 0.001, i * 1.2);
  box(0.012, 0.005, 25, grout, i * 1.2, 0.001, 1);
}
box(26, 6.7, 0.2, mats.wall, 0, 3.35, -6.2);
box(0.2, 6.7, 17, mats.wall, -9.5, 3.35, 2.2);
box(26, 0.13, 0.11, mats.dark, 0, 0.11, -6.06);
box(0.11, 0.13, 17, mats.dark, -9.35, 0.11, 2.2);
box(25, 0.12, 3.2, mats.wall, 0, 6.5, -5.2);
for (const x of [-3, 2, 7]) {
  box(3.7, 0.07, 0.18, mats.silver, x, 6.3, -3.6);
  box(3.5, 0.022, 0.14, mats.cyan, x, 6.25, -3.6);
}

function elevator(x, selected) {
  box(2.63, 3.67, 0.16, mats.silver, x, 1.88, -6.02, room, 'elevator-surround');
  box(2.24, 3.18, 0.19, mats.dark, x, 1.66, -5.9);
  for (const side of [-1, 1]) {
    box(1.075, 3.03, 0.09, mats.silver, x + side * 0.546, 1.63, -5.78);
    box(0.015, 2.97, 0.01, mats.dark, x + side * 0.01, 1.63, -5.72);
    for (let k = 0; k < 15; k++) {
      box(0.003, 2.95, 0.006, k % 2 ? mats.brightMetal : mats.silver,
        x + side * (0.06 + k * 0.065), 1.63, -5.72);
    }
  }
  box(0.29, 0.18, 0.02, mats.dark, x, 3.4, -5.76);
  sign(selected ? '1  v' : 'v  1', 0.24, 0.11, x, 3.4, -5.73, { color: '#8ee0cb', background: '#243c35', size: 200 });
  box(0.12, 0.37, 0.04, mats.silver, x - 1.24, 1.17, -5.79);
  for (const y of [1.12, 1.24]) ellipsoid(x - 1.24, y, -5.76, 0.028, 0.028, 0.014, mats.dark);
  box(2.22, 0.025, 0.31, mats.brightMetal, x, 0.028, -5.64);
}
elevator(2.7, true); elevator(5.45, false);
sign('E L E V A T O R S', 3.1, 0.32, 4.08, 4.04, -6.02, { size: 80 });
sign('L O B B Y  -  L E V E L', 2.08, 0.27, -0.2, 3.76, -6.02, { size: 64 });
box(0.2, 0.74, 0.075, mats.cyan, -1.04, 3.03, -5.97);
box(0.68, 0.2, 0.075, mats.cyan, -1.04, 3.03, -5.97);

const desk = new THREE.Group(); desk.position.set(-3.5, 0, -3.5); room.add(desk); desk.name = 'reception';
box(2.25, 0.96, 0.85, mats.wood, 0, 0.5, 0, desk);
box(2.46, 0.12, 1.0, mats.wood, 0, 1.04, 0, desk);
box(1.93, 0.55, 0.035, mats.teal, 0, 0.55, 0.44, desk);
sign('RECEPTION', 1.74, 0.3, 0, 0.63, 0.465, { parent: desk, color: '#d7d3ac', background: '#315d56', size: 115 });
box(0.54, 0.045, 0.34, mats.dark, 0.47, 1.13, -0.02, desk);
box(0.085, 0.27, 0.085, mats.silver, 0.47, 1.26, -0.14, desk);
const monitor = box(0.66, 0.46, 0.065, mats.dark, 0.47, 1.52, -0.15, desk);
monitor.rotation.x = -0.12;
box(0.19, 0.3, 0.13, mats.teal, -0.88, 1.25, -0.04, desk);
box(0.27, 0.015, 0.34, mats.white, -0.28, 1.11, 0.15, desk);
cyl(0.055, 0.05, 0.14, mats.white, -0.58, 1.17, 0.14, desk);

const island = new THREE.Group(); room.add(island); island.name = 'central-seating-island';
cyl(2.08, 2.08, 0.19, mats.dark, 0, 0.1, 0, island, 96);
cyl(0.83, 0.78, 0.72, mats.white, 0, 0.53, 0, island, 64);
cyl(0.78, 0.78, 0.035, mats.soil, 0, 0.902, 0, island, 64);
for (const side of [0, 1, 2, 3]) {
  const b = new THREE.Group(); island.add(b); b.rotation.y = side * Math.PI / 2;
  box(1.87, 0.27, 0.58, mats.wood, 0, 0.37, 1.4, b);
  for (const y of [0.28, 0.35, 0.42]) box(1.89, 0.012, 0.59, mats.wood, 0, y, 1.4, b);
  box(1.77, 0.105, 0.53, mats.teal, 0, 0.56, 1.4, b);
  for (const x of [-0.67, 0.67]) box(0.13, 0.15, 0.38, mats.dark, x, 0.21, 1.4, b);
}

const leafGeo = new THREE.BufferGeometry();
leafGeo.setAttribute('position', new THREE.Float32BufferAttribute([
  0, 0, -1, -0.8, 0.04, -0.25, 0, 0.19, -0.15, 0.8, 0.04, -0.25,
  -0.64, 0, 0.45, 0, 0.13, 0.5, 0.64, 0, 0.45, 0, -0.05, 1
], 3));
leafGeo.setIndex([0, 1, 2, 0, 2, 3, 1, 4, 5, 1, 5, 2, 2, 5, 6, 2, 6, 3, 4, 7, 5, 5, 7, 6]);
leafGeo.computeVertexNormals();
for (const m of [mats.leaf, mats.leafLight, mats.fern]) m.side = THREE.DoubleSide;
function leaves(instances, mat, parent = room) {
  const im = new THREE.InstancedMesh(leafGeo, mat, instances.length);
  const d = new THREE.Object3D();
  instances.forEach((p, i) => {
    d.position.copy(p.pos); d.scale.copy(p.scale); d.rotation.set(p.rx, p.ry, p.rz);
    d.updateMatrix(); im.setMatrixAt(i, d.matrix);
  });
  im.castShadow = true; im.receiveShadow = true; parent.add(im); return im;
}
function tree(x, z, base, scale = 1, parent = room) {
  const t = new THREE.Group(); t.position.set(x, base, z); t.scale.setScalar(scale); parent.add(t);
  const trunk = [v3(0, 0, 0), v3(0.07, 0.75, 0.02), v3(-0.04, 1.55, 0), v3(0.09, 2.17, 0)];
  tube(trunk, 0.035, mats.bark, t);
  const foliage = [], lightFoliage = [];
  for (let b = 0; b < 24; b++) {
    const a = random() * Math.PI * 2, y = 1.2 + random() * 1.1, r = 0.28 + random() * 0.52;
    const tip = v3(Math.cos(a) * r, y + 0.28, Math.sin(a) * r);
    rod(v3(0, y - 0.4, 0), tip, 0.014, mats.bark, t, 0.005);
    for (let j = 0; j < 43; j++) {
      const p = tip.clone().add(v3((random() - 0.5) * 0.56, (random() - 0.5) * 0.42, (random() - 0.5) * 0.56));
      const entry = { pos: p, scale: v3(0.06, 0.1, 0.1), rx: random() * 2, ry: random() * 6.28, rz: random() };
      (j % 4 ? foliage : lightFoliage).push(entry);
    }
  }
  leaves(foliage, mats.leaf, t); leaves(lightFoliage, mats.leafLight, t);
}
function fern(x, y, z, scale = 1, parent = room) {
  const f = new THREE.Group(); f.position.set(x, y, z); f.scale.setScalar(scale); parent.add(f);
  const ls = [];
  for (let j = 0; j < 11; j++) {
    const a = j * Math.PI * 2 / 11 + random() * 0.2, len = 0.48 + random() * 0.35;
    const start = v3(0, 0, 0), mid = v3(Math.cos(a) * len * 0.42, len * 0.55, Math.sin(a) * len * 0.42);
    const end = v3(Math.cos(a) * len, len * 0.3, Math.sin(a) * len);
    tube([start, mid, end], 0.006, mats.fern, f);
    for (let k = 1; k < 10; k++) {
      const u = k / 10, radial = len * u;
      const center = v3(Math.cos(a) * radial, len * Math.sin(u * Math.PI * 0.85) * 0.5, Math.sin(a) * radial);
      for (const side of [-1, 1]) {
        const size = 0.13 * Math.sin(Math.PI * u) + 0.02;
        ls.push({ pos: center.clone().add(v3(-Math.sin(a) * size * side * 0.45, 0, Math.cos(a) * size * side * 0.45)),
          scale: v3(0.023, 0.04, size), rx: 0.25, ry: -a + side * 0.5, rz: 0 });
      }
    }
  }
  leaves(ls, mats.fern, f);
}
tree(0.02, -0.12, 0.9, 1, island);
for (let j = 0; j < 7; j++) {
  const a = j * Math.PI * 2 / 7;
  fern(Math.cos(a) * 0.58, 0.91, Math.sin(a) * 0.58, 0.94, island);
}
const flowerMats = [material('coral-flowers', '#cf737c'), material('cream-flowers', '#ede8bb')];
for (let j = 0; j < 23; j++) {
  const a = random() * 6.28, r = random() * 0.75, h = 1.1 + random() * 0.48;
  const x = Math.cos(a) * r, z = Math.sin(a) * r;
  rod(v3(x, 0.9, z), v3(x, h, z), 0.007, mats.fern, island);
  for (let k = 0; k < 5; k++) {
    const angle = k * 6.28 / 5;
    ellipsoid(x + Math.cos(angle) * 0.039, h, z + Math.sin(angle) * 0.039, 0.037, 0.025, 0.03, flowerMats[j % 2], island);
  }
}
function pottedPlant(x, z, scale, type = 'fern') {
  const p = new THREE.Group(); p.position.set(x, 0, z); p.scale.setScalar(scale); room.add(p);
  cyl(0.55, 0.4, 0.78, mats.white, 0, 0.39, 0, p);
  cyl(0.51, 0.51, 0.04, mats.soil, 0, 0.79, 0, p);
  if (type === 'bush') {
    const ls = [];
    for (let j = 0; j < 950; j++) {
      const a = random() * 6.28, b = Math.acos(2 * random() - 1), r = 0.65 * Math.cbrt(random());
      ls.push({ pos: v3(Math.sin(b) * Math.cos(a) * r, 1.1 + Math.cos(b) * r * 0.8, Math.sin(b) * Math.sin(a) * r),
        scale: v3(0.04, 0.05, 0.065), rx: random() * 3, ry: random() * 6, rz: random() });
    }
    leaves(ls, mats.leaf, p);
  } else if (type === 'palm') {
    for (let j = 0; j < 12; j++) {
      const a = j * 6.28 / 12;
      rod(v3(0, 0.8, 0), v3(Math.cos(a) * 0.55, 1.9, Math.sin(a) * 0.55), 0.013, mats.bark, p);
      const ls = [];
      for (let k = 0; k < 9; k++) {
        const u = k / 9;
        for (const side of [-1, 1]) ls.push({
          pos: v3(Math.cos(a) * (0.2 + u * 0.55) - Math.sin(a) * side * 0.15, 1.7 + Math.sin(u * 3) * 0.4, Math.sin(a) * (0.2 + u * 0.55) + Math.cos(a) * side * 0.15),
          scale: v3(0.055, 0.1, 0.28 * (1 - u * 0.5)), rx: 0.45, ry: -a + side * 0.65, rz: 0 });
      }
      leaves(ls, mats.leaf, p);
    }
  } else {
    fern(0, 0.8, 0, 1.6, p);
    fern(0.2, 0.85, 0.2, 1.1, p);
  }
}
pottedPlant(5.4, 5.2, 1.2); pottedPlant(6.7, 5.0, 1.4, 'palm'); pottedPlant(4.8, 6.1, 0.9, 'bush');
tree(9.5, 2.5, 0, 1.9);

const nurse = new THREE.Group(); nurse.position.set(-0.2, 0.19, 1.48); nurse.rotation.y = -0.16; room.add(nurse); nurse.name = 'seated-nurse-with-tablet';
ellipsoid(0, 0.63, 0, 0.23, 0.18, 0.22, mats.scrubs, nurse);
const torso = ellipsoid(0, 0.99, -0.06, 0.25, 0.39, 0.155, mats.scrubs, nurse); torso.rotation.x = -0.14;
cyl(0.062, 0.076, 0.14, mats.skin, 0, 1.33, -0.01, nurse);
const head = ellipsoid(0, 1.49, 0.035, 0.135, 0.18, 0.13, mats.skin, nurse); head.rotation.x = 0.22;
ellipsoid(0, 1.59, -0.008, 0.14, 0.115, 0.13, mats.hair, nurse);
ellipsoid(0, 1.57, -0.14, 0.088, 0.09, 0.08, mats.hair, nurse);
const hairCap = mesh(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.5), mats.hair, v3(0, 1.575, 0.015), nurse);
hairCap.scale.set(0.143, 0.12, 0.133);
ellipsoid(0, 1.47, 0.164, 0.027, 0.042, 0.025, mats.skin, nurse);
for (const side of [-1, 1]) {
  ellipsoid(side * 0.049, 1.5, 0.155, 0.019, 0.008, 0.008, mats.hair, nurse);
  rod(v3(side * 0.027, 1.527, 0.153), v3(side * 0.065, 1.52, 0.147), 0.006, mats.hair, nurse);
  ellipsoid(side * 0.13, 1.48, 0.015, 0.022, 0.037, 0.03, mats.skin, nurse);
}
for (const side of [-1, 1]) {
  rod(v3(side * 0.12, 0.64, 0.06), v3(side * 0.15, 0.52, 0.43), 0.115, mats.scrubs, nurse);
  rod(v3(side * 0.15, 0.52, 0.43), v3(side * 0.15, 0.1, 0.51), 0.082, mats.scrubs, nurse);
  ellipsoid(side * 0.15, 0.071, 0.61, 0.085, 0.062, 0.17, mats.white, nurse);
  rod(v3(side * 0.23, 1.17, -0.02), v3(side * 0.31, 0.92, 0.15), 0.085, mats.scrubs, nurse);
  rod(v3(side * 0.31, 0.92, 0.15), v3(side * 0.16, 0.91, 0.38), 0.056, mats.skin, nurse);
  ellipsoid(side * 0.16, 0.91, 0.38, 0.065, 0.04, 0.07, mats.skin, nurse);
}
const tablet = box(0.38, 0.026, 0.3, mats.dark, 0, 0.91, 0.36, nurse); tablet.rotation.x = -0.32;
const screenMaterial = new THREE.MeshStandardMaterial({ color: '#537a79', emissive: '#244c4b', emissiveIntensity: 0.25, roughness: 0.32 });
box(0.33, 0.005, 0.25, screenMaterial, 0, 0.016, 0, tablet);
for (let i = 0; i < 3; i++) box(0.2 - i * 0.04, 0.002, 0.011, mats.white, -0.025, 0.019, -0.06 + i * 0.055, tablet);
box(0.09, 0.11, 0.02, mats.white, -0.13, 1.12, 0.108, nurse);
tube([v3(-0.09, 1.31, 0.06), v3(-0.09, 1.13, 0.15), v3(0.07, 1.1, 0.16), v3(0.11, 1.3, 0.06)], 0.012, mats.dark, nurse);

const portal = new THREE.Group(); portal.position.set(-0.75, 0, 6.1); portal.rotation.y = 0.05; portal.scale.set(0.94, 0.98, 1); room.add(portal); portal.name = 'main-entry-portal';
for (const x of [-1.58, 1.58]) box(0.17, 4.35, 0.31, mats.silver, x, 2.17, 0, portal);
box(3.36, 0.28, 0.38, mats.silver, 0, 4.31, 0, portal);
box(3.24, 0.04, 0.25, mats.dark, 0, 0.023, 0, portal);
for (const x of [-0.78, 0.78]) box(0.05, 0.32, 0.08, mats.dark, x, 4.56, 0, portal);
box(2.25, 0.67, 0.12, mats.silver, 0, 4.95, 0, portal);
sign('MAIN ENTRY', 2.14, 0.55, 0, 4.95, 0.078, { color: '#216e73', background: '#b9bcb0', parent: portal, size: 176 });
box(0.4, 0.12, 0.1, mats.dark, 0, 4.31, 0.24, portal);
const glass = new THREE.MeshPhysicalMaterial({ color: '#bed3ce', roughness: 0.13, metalness: 0.05, transparent: true, opacity: 0.16, depthWrite: false });
glass.name = 'clear-entry-glass';
const doorLeaves = [];
for (const side of [-1, 1]) {
  box(0.64, 3.97, 0.027, glass, side * 1.18, 2.1, -0.07, portal);
  box(0.05, 4.09, 0.075, mats.silver, side * 0.84, 2.09, -0.07, portal);
  const g = new THREE.Group(); portal.add(g); g.name = `sliding-glass-leaf-${side}`; doorLeaves.push(g);
  box(0.73, 3.97, 0.027, glass, 0, 2.1, 0.018, g);
  for (const x of [-0.39, 0.39]) box(0.045, 4.09, 0.075, mats.silver, x, 2.09, 0, g);
  for (const y of [0.06, 4.12]) box(0.82, 0.07, 0.075, mats.silver, 0, y, 0, g);
  rod(v3(-side * 0.24, 1.65, 0.1), v3(-side * 0.24, 2.25, 0.1), 0.02, mats.dark, g);
}

const machines = new THREE.Group(); machines.position.set(7.9, 0, 0.4); machines.rotation.y = -Math.PI / 2; room.add(machines); machines.name = 'shared-right-extension-vending';
for (const x of [-0.58, 0.58]) {
  box(1.08, 2.25, 0.7, mats.dark, x, 1.125, 0, machines);
  box(0.86, 1.42, 0.025, glass, x, 1.29, 0.365, machines);
  sign(x < 0 ? 'WATER' : 'SNACKS', 0.9, 0.22, x, 2.06, 0.375, { parent: machines, background: '#235955', color: '#dce8da', size: 150 });
  for (let row = 0; row < 3; row++) for (let col = 0; col < 4; col++) {
    cyl(0.045, 0.045, 0.18, col % 2 ? mats.teal : mats.white, x - 0.3 + col * 0.2, 0.8 + row * 0.38, 0.29, machines, 10);
  }
  box(0.61, 0.22, 0.04, mats.rubber, x, 0.32, 0.37, machines);
}

const hemi = new THREE.HemisphereLight('#e9f2ee', '#88877a', 1.4); hemi.name = 'daylight-ambient'; scene.add(hemi);
const sun = new THREE.DirectionalLight('#fff1d8', 3.3); sun.name = 'broad-window-sun';
sun.position.set(9, 9, 1); sun.target.position.set(-3, 0, 2); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -13, right: 13, top: 13, bottom: -13, near: 0.5, far: 35 });
sun.shadow.bias = -0.00025; sun.shadow.normalBias = 0.025;
const fill = new THREE.DirectionalLight('#e3f0ef', 0.55); fill.position.set(-5, 6, 8); scene.add(fill);

const robot = new THREE.Group(); robot.name = 'invariant-retro-quadruped'; scene.add(robot);
const chassis = new THREE.Group(); robot.add(chassis); chassis.name = 'silver-chassis';
box(0.84, 0.56, 1.23, mats.silver, 0, 0, 0, chassis);
box(0.91, 0.07, 1.28, mats.brightMetal, 0, 0.285, 0, chassis);
box(0.88, 0.06, 1.24, mats.dark, 0, -0.29, 0, chassis);
box(0.58, 0.39, 0.035, mats.white, 0, 0, -0.633, chassis);
box(0.64, 0.41, 0.032, mats.silver, 0, 0, 0.633, chassis);
box(0.13, 0.24, 0.04, mats.dark, -0.19, -0.01, 0.66, chassis);
box(0.12, 0.22, 0.03, mats.dark, 0.2, 0, -0.66, chassis);
for (const x of [-0.31, 0.31]) for (const y of [-0.19, 0.19]) {
  ellipsoid(x, y, -0.653, 0.022, 0.022, 0.012, mats.dark, chassis);
}
for (const side of [-1, 1]) {
  box(0.025, 0.38, 0.74, mats.dark, side * 0.432, 0, 0.04, chassis);
  for (let i = 0; i < 8; i++) box(0.026, 0.018, 0.29, mats.silver, side * 0.448, 0.13 - i * 0.035, 0.02, chassis);
  for (let k = 0; k < 3; k++) {
    tube([v3(side * (0.16 + k * 0.055), 0.34, -0.51), v3(side * 0.31, 0.35 + k * 0.02, -0.2),
      v3(side * 0.46, 0.3, 0.22), v3(side * 0.47, -0.21, 0.44)], 0.017, k === 1 ? mats.red : mats.rubber, chassis);
  }
  rod(v3(side * 0.33, 0.4, -0.38), v3(side * 0.33, 0.4, 0.37), 0.023, mats.dark, chassis);
}
box(0.29, 0.13, 0.29, mats.dark, 0, 0.38, 0.18, chassis);
box(0.17, 0.04, 0.08, mats.teal, 0, 0.46, 0.18, chassis);
const limbLength = 0.6;
const legDefs = [
  { x: -0.51, z: -0.43, phase: 0 }, { x: 0.51, z: -0.43, phase: 0.5 },
  { x: -0.51, z: 0.43, phase: 0.5 }, { x: 0.51, z: 0.43, phase: 0 }
];
const legs = legDefs.map((def, i) => {
  const group = new THREE.Group(); group.name = `articulated-leg-${i}`; robot.add(group);
  const hip = cyl(0.145, 0.145, 0.18, mats.silver, 0, 0, 0, group); hip.rotation.z = Math.PI / 2;
  const cap = cyl(0.1, 0.1, 0.19, mats.dark, 0, 0, 0, group); cap.rotation.z = Math.PI / 2;
  const upper = cyl(0.077, 0.09, 1, mats.silver, 0, 0, 0, group, 16);
  const lower = cyl(0.052, 0.061, 1, mats.brightMetal, 0, 0, 0, group, 16);
  const knee = ellipsoid(0, 0, 0, 0.095, 0.095, 0.095, mats.dark, group);
  const foot = box(0.17, 0.07, 0.26, mats.rubber, 0, 0, 0, group);
  const cable = cyl(0.018, 0.018, 1, mats.red, 0, 0, 0, group, 8);
  return { ...def, group, hip, cap, upper, lower, knee, foot, cable, target: v3() };
});

const start = v3(-0.75, 0, 6.75), goal = v3(2.7, 0, -5.06);
const paths = {
  '577': new THREE.CatmullRomCurve3([
    start, v3(-0.75, 0, 4.6), v3(-3.2, 0, 1.2), v3(-2.9, 0, -0.7),
    v3(-2.4, 0, -2.15), v3(-0.4, 0, -3.25), v3(1.45, 0, -3.9), v3(2.65, 0, -4.58), goal
  ], false, 'centripetal'),
  '578': new THREE.CatmullRomCurve3([
    start, v3(-0.75, 0, 4.6), v3(0.4, 0, 3.3), v3(2.5, 0, 3.0),
    v3(4.3, 0, 2.3), v3(5.35, 0, 0.4), v3(5.05, 0, -2.0), v3(3.95, 0, -3.9), v3(2.75, 0, -4.58), goal
  ], false, 'centripetal')
};
for (const path of Object.values(paths)) { path.arcLengthDivisions = 1400; path.updateArcLengths(); }
function routeGeometry(path) {
  const vertices = [], indices = [];
  for (let i = 0; i <= 300; i++) {
    const u = i / 300, p = path.getPointAt(u), t = path.getTangentAt(u);
    const normal = v3(-t.z, 0, t.x).multiplyScalar(0.044);
    vertices.push(p.x + normal.x, 0.015, p.z + normal.z, p.x - normal.x, 0.015, p.z - normal.z);
    if (i < 300) { const n = i * 2; indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3)); geo.setIndex(indices); geo.computeVertexNormals();
  return geo;
}
const routeMeshes = {};
for (const id of ['577', '578']) {
  routeMeshes[id] = mesh(routeGeometry(paths[id]), mats.cyan, null, scene, `floor-route-${id}`);
  routeMeshes[id].castShadow = false;
}
let variant = '577', time = 0, navigation = {};
const stepLength = 1.05, stance = 0.64;
function progressAt(t) {
  const u = clamp((t - 0.1) / 4.78, 0, 1), ramp = 0.14;
  const startIntegral = value => {
    const s = value / ramp;
    return ramp * (s * s * s - 0.5 * s * s * s * s) / (1 - ramp);
  };
  if (u < ramp) return startIntegral(u);
  if (u > 1 - ramp) return 1 - startIntegral(1 - u);
  return (u - ramp * 0.5) / (1 - ramp);
}
function routeSample(distance) {
  const path = paths[variant], length = path.getLength(), u = clamp(distance / length, 0, 1);
  const p = path.getPointAt(u), tangent = path.getTangentAt(u);
  let yaw = Math.atan2(-tangent.x, -tangent.z);
  const weight = smooth(0, 0.65, distance);
  yaw *= weight;
  return { p, yaw };
}
function localOffset(x, z, yaw) { return v3(Math.cos(yaw) * x + Math.sin(yaw) * z, 0, -Math.sin(yaw) * x + Math.cos(yaw) * z); }
function placeSegment(m, a, b) {
  m.position.copy(a).add(b).multiplyScalar(0.5); m.scale.y = a.distanceTo(b);
  m.quaternion.setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize());
}
function animateRobot(t) {
  const path = paths[variant], length = path.getLength(), progress = progressAt(t), distance = progress * length;
  const stride = length / Math.ceil(length / stepLength);
  const sample = routeSample(distance), moving = smooth(0, 0.4, distance) * (1 - smooth(length - 0.48, length, distance));
  robot.position.copy(sample.p); robot.rotation.y = sample.yaw;
  chassis.position.y = 0.99 + 0.018 * Math.sin(distance / stride * Math.PI * 4) * moving;
  const before = routeSample(Math.max(0, distance - 0.15)), after = routeSample(Math.min(length, distance + 0.15));
  const turn = Math.atan2(Math.sin(after.yaw - before.yaw), Math.cos(after.yaw - before.yaw));
  chassis.rotation.z = clamp(-turn * 0.14, -0.06, 0.06) * moving;
  robot.updateMatrixWorld(true);
  for (const leg of legs) {
    const q = distance / stride + leg.phase, cycle = Math.floor(q + 1e-9), phase = q - cycle;
    const contactDistance = cycle === 0 ? 0 : (cycle - leg.phase + stance * 0.5) * stride;
    const nextContactDistance = (cycle + 1 - leg.phase + stance * 0.5) * stride;
    const footAt = d => {
      const s = routeSample(d);
      return s.p.clone().add(localOffset(leg.x * 1.08, leg.z, s.yaw));
    };
    let worldFoot;
    if (phase < stance) worldFoot = footAt(contactDistance);
    else {
      const u = (phase - stance) / (1 - stance), w = u * u * (3 - 2 * u);
      worldFoot = footAt(contactDistance).lerp(footAt(nextContactDistance), w);
      worldFoot.y = Math.sin(Math.PI * u) * 0.16;
    }
    worldFoot.y += 0.05;
    leg.target.copy(worldFoot);
    leg.contact = { cycle, phase, stance: phase < stance };
    const foot = robot.worldToLocal(worldFoot.clone()), hip = v3(leg.x, chassis.position.y - 0.17, leg.z);
    const direction = foot.clone().sub(hip), d = direction.length(), mid = hip.clone().add(foot).multiplyScalar(0.5);
    const bend = v3(0, -direction.z, direction.y).normalize().multiplyScalar(leg.z < 0 ? -1 : 1);
    if (d > 2 * limbLength) throw new RangeError('Route stride exceeded articulated leg reach');
    const knee = mid.addScaledVector(bend, Math.sqrt(limbLength * limbLength - d * d * 0.25));
    leg.hip.position.copy(hip); leg.cap.position.copy(hip);
    leg.knee.position.copy(knee); leg.foot.position.copy(foot);
    placeSegment(leg.upper, hip, knee); placeSegment(leg.lower, knee, foot);
    placeSegment(leg.cable, hip.clone().add(v3(0.045, 0, 0)), knee.clone().add(v3(0.045, 0, 0)));
  }
  navigation = { variant, curve: paths[variant].points.map(p => p.toArray()), position: robot.position.toArray(), yaw: sample.yaw,
    distance, progress, length, effectiveStride: stride, sharedStart: start.toArray(), sharedGoal: goal.toArray(),
    feet: legs.map(l => ({ position: l.target.toArray(), ...l.contact })),
    limbLengths: legs.map(l => [l.upper.scale.y, l.lower.scale.y]) };
}
function transformState(o) {
  return { name: o.name, type: o.type, position: o.position.toArray(), quaternion: o.quaternion.toArray(), scale: o.scale.toArray(), visible: o.visible };
}
function geometryDefinition(g) {
  const result = { type: g.type, parameters: g.parameters || null };
  if (g.isBufferGeometry && !g.parameters) {
    result.attributes = Object.fromEntries(Object.entries(g.attributes).map(([k, a]) => [k, Array.from(a.array)]));
    result.index = g.index ? Array.from(g.index.array) : null;
  }
  return result;
}
function materialDefinition(m) {
  return { type: m.type, name: m.name, color: m.color?.getHex(), emissive: m.emissive?.getHex(), emissiveIntensity: m.emissiveIntensity,
    roughness: m.roughness, metalness: m.metalness, opacity: m.opacity, transparent: m.transparent, depthWrite: m.depthWrite, side: m.side, envMapIntensity: m.envMapIntensity,
    texture: m.map ? { source: 'seeded-procedural-canvas', repeat: m.map.repeat.toArray(), width: m.map.image.width, height: m.map.image.height } : null };
}
function hierarchyDefinition(root) {
  return { ...transformState(root),
    geometry: root.geometry ? geometryDefinition(root.geometry) : null,
    material: root.material ? materialDefinition(root.material) : null,
    instanceMatrices: root.isInstancedMesh ? Array.from(root.instanceMatrix.array) : null,
    children: root.children.map(hierarchyDefinition) };
}
animateRobot(0);
const agentDefinition = {
  identity: 'square-silver-retro-industrial-quadruped',
  dimensions: { chassis: [0.84, 0.56, 1.23], hipHeight: 0.82, limbLength },
  gait: { controller: 'route-distance-analytic-world-foot-IK', stepLength, stance, swingHeight: 0.16, phases: legDefs.map(l => l.phase) },
  restHierarchy: hierarchyDefinition(robot)
};
function getCameraState() { return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov }; }
function seek(seconds) {
  if (!Number.isFinite(seconds)) throw new TypeError('seek requires finite seconds');
  time = clamp(seconds, 0, DURATION);
  const u = time / DURATION;
  camera.position.set(4.3 + 0.2 * u, 5.6 - 0.06 * u, 11.5 - 0.48 * u);
  camera.lookAt(-0.4 + 0.12 * u, -0.05, -0.5 - 0.09 * u);
  camera.updateMatrixWorld(true);
  const opening = smooth(0, 0.42, time);
  doorLeaves.forEach((d, i) => { d.position.x = (i ? 1 : -1) * (0.405 + opening * 0.81); });
  routeMeshes['577'].visible = variant === '577'; routeMeshes['578'].visible = variant === '578';
  animateRobot(time); scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}
window.reconstruction = {
  pause() {},
  seek,
  setVariant(id) {
    if (id !== '577' && id !== '578') throw new RangeError('Variant must be "577" or "578"');
    if (variant === id) return;
    variant = id; seek(time);
  },
  getCameraState,
  getNavigationState: () => structuredClone(navigation),
  getAgentDefinitionState: () => structuredClone(agentDefinition),
  getEditedObjectState: () => ({
    navigation: structuredClone(navigation), root: transformState(robot), hierarchy: hierarchyDefinition(robot),
    feet: legs.map(l => l.target.toArray()), route: { design: { width: 0.088, elevation: 0.015, material: materialDefinition(mats.cyan) },
      geometry: geometryDefinition(routeMeshes[variant].geometry), visible: routeMeshes[variant].visible }
  }),
  getInvariantState: () => ({
    room: hierarchyDefinition(room), agentDefinition: structuredClone(agentDefinition),
    routeDesign: { width: 0.088, elevation: 0.015, material: materialDefinition(mats.cyan) },
    lights: [hemi, sun, fill].map(l => ({ ...transformState(l), color: l.color.getHex(), intensity: l.intensity,
      groundColor: l.groundColor?.getHex(), castShadow: l.castShadow, target: l.target?.position.toArray(),
      shadow: l.shadow ? { mapSize: l.shadow.mapSize.toArray(), bias: l.shadow.bias, normalBias: l.shadow.normalBias,
        camera: { near: l.shadow.camera.near, far: l.shadow.camera.far, left: l.shadow.camera.left, right: l.shadow.camera.right, top: l.shadow.camera.top, bottom: l.shadow.camera.bottom } } : null })),
    camera: { ...getCameraState(), near: camera.near, far: camera.far, aspect: camera.aspect },
    renderer: { width: WIDTH, height: HEIGHT, antialias: true, pixelRatio: renderer.getPixelRatio(), toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, outputColorSpace: renderer.outputColorSpace, shadowType: renderer.shadowMap.type },
    background: scene.background.getHex(), environment: environmentDefinition
  })
};
seek(0);
