import * as THREE from '../vendor/three.module.js';

const W = 960, H = 540, DURATION = 124 / 24;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c1c4ba');
scene.fog = new THREE.Fog('#c1c4ba', 16, 29);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.10;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(28.5, W / H, 0.05, 40);
const world = new THREE.Group();
world.name = 'shared-documentary-lab';
scene.add(world);
const robotRig = new THREE.Group();
robotRig.name = 'edited-embodiment-root';
scene.add(robotRig);
const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const clamp = THREE.MathUtils.clamp;
const smooth = x => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };
let seed = 564;
function random() { window.__bfTrace?.add(27);
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}
function material(color, roughness = 0.7, metalness = 0) { window.__bfTrace?.add(31);
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
const mats = {
  wall: material('#c8c9bc'), trim: material('#747e77', .57, .25),
  steel: material('#3e4e4d', .42, .65), dark: material('#172020', .53, .55),
  rubber: material('#171b1a', .92), ivory: material('#cdd0c3', .57, .25),
  edge: material('#989e92', .44, .65), silver: material('#abb5af', .28, .83),
  rust: material('#91584b', .56, .5), copper: material('#a77853', .53, .65),
  wood: material('#cfc7b6', .76), woodEdge: material('#b2976b', .72),
  black: material('#1e2523', .87), paper: material('#d7d9cd', .92),
  blue: material('#33727e', .65, .2), red: material('#7c3930', .65),
  screen: new THREE.MeshStandardMaterial({ color: '#183738', emissive: '#315e61', emissiveIntensity: .26, roughness: .36 }),
  led: new THREE.MeshStandardMaterial({ color: '#7ba892', emissive: '#5eb78a', emissiveIntensity: .9 })
};
function proceduralSurface(kind) { window.__bfTrace?.add(46);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = kind === 'floor' ? '#768080' : '#bda275';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < (kind === 'floor' ? 15000 : 1600); i++) {
    const g = Math.floor(50 + random() * 130);
    ctx.fillStyle = `rgba(${g},${g},${g},${kind === 'floor' ? .07 : .13})`;
    const x = random() * 256, y = random() * 256;
    ctx.fillRect(x, y, kind === 'floor' ? 1 + random() * 3 : 30 + random() * 150, .3 + random());
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'floor' ? 7 : 2, kind === 'floor' ? 7 : 1);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}
mats.wood.map = proceduralSurface('wood');
const floorMat = material('#9da6a4', .58, .10);
floorMat.map = proceduralSurface('floor');
function mesh(geometry, mat, parent = world, name = '') { window.__bfTrace?.add(67);
  const o = new THREE.Mesh(geometry, mat);
  o.name = name;
  o.castShadow = true; o.receiveShadow = true;
  parent.add(o);
  return o;
}
function box(x, y, z, sx, sy, sz, mat, parent = world, name = '') { window.__bfTrace?.add(74);
  const o = mesh(new THREE.BoxGeometry(sx, sy, sz), mat, parent, name);
  o.position.set(x, y, z); return o;
}
const bevelCache = new Map();
function bevelGeometry(sx, sy, sz, r = .025) { window.__bfTrace?.add(79);
  const key = [sx, sy, sz, r].join(',');
  if (bevelCache.has(key)) return bevelCache.get(key);
  const shape = new THREE.Shape();
  const a = sx / 2 - r, b = sy / 2 - r;
  shape.moveTo(-a, -b); shape.lineTo(a, -b); shape.lineTo(a, b);
  shape.lineTo(-a, b); shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(.005, sz - 2 * r), bevelEnabled: true,
    bevelSegments: 2, steps: 1, bevelSize: r, bevelThickness: r
  });
  g.translate(0, 0, -sz / 2 + r);
  bevelCache.set(key, g);
  return g;
}
function armor(x, y, z, sx, sy, sz, parent, mat = mats.ivory, r = .022) { window.__bfTrace?.add(94);
  const o = mesh(bevelGeometry(sx, sy, sz, r), mat, parent, 'fabricated-shell');
  o.position.set(x, y, z); return o;
}
function cylinder(x, y, z, radius, length, mat, parent = world, axis = 'y', radial = 16) { window.__bfTrace?.add(98);
  const o = mesh(new THREE.CylinderGeometry(radius, radius, length, radial), mat, parent);
  o.position.set(x, y, z);
  if (axis === 'x') o.rotation.z = Math.PI / 2;
  if (axis === 'z') o.rotation.x = Math.PI / 2;
  return o;
}
function rod(a, b, r, mat, parent = world, radial = 10) { window.__bfTrace?.add(105);
  const o = cylinder(0, 0, 0, r, a.distanceTo(b), mat, parent, 'y', radial);
  o.position.copy(a).add(b).multiplyScalar(.5);
  o.quaternion.setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize());
  return o;
}
function cable(points, r = .007, mat = mats.rubber, parent = world) { window.__bfTrace?.add(111);
  const curve = new THREE.CatmullRomCurve3(points.map(p => Array.isArray(p) ? v(...p) : p));
  return mesh(new THREE.TubeGeometry(curve, 30, r, 6, false), mat, parent, 'cable');
}
function bolt(x, y, z, parent, axis = 'z', radius = .009) { window.__bfTrace?.add(115);
  return cylinder(x, y, z, radius, .009, mats.silver, parent, axis, 6);
}
function joint(x, y, z, parent, r = .065) { window.__bfTrace?.add(118);
  cylinder(x, y, z, r, .14, mats.dark, parent, 'x', 24);
  for (const s of [-1, 1]) {
    cylinder(x + s * .074, y, z, r * .77, .017, mats.silver, parent, 'x', 20);
    cylinder(x + s * .085, y, z, r * .47, .018, mats.dark, parent, 'x');
    bolt(x + s * .098, y, z, parent, 'x', r * .18);
  }
}

// Architecture is continuous 3D geometry, including the corridor beyond the glazing.
box(1, -.055, 1.7, 12, .1, 18, floorMat, world, 'worn-concrete-floor');
box(-2.03, 1.85, -.65, 8.0, 3.7, .16, mats.wall, world, 'back-wall-left');
box(5.30, 1.85, -.65, .85, 3.7, .16, mats.wall);
box(3.48, 3.53, -.65, 3.3, .4, .16, mats.wall);
const leftWall = box(-2.65, 1.8, 2.9, .16, 3.6, 7.1, mats.wall);
leftWall.castShadow = false;
box(5.8, 1.8, 2.0, .16, 3.6, 5.4, mats.wall);
const ceiling = box(1.0, 3.65, 1, 10, .1, 11, mats.paper);
ceiling.castShadow = false;
box(-1.1, .07, -.53, 6, .14, .08, mats.dark);
box(5.15, .07, -.53, .7, .14, .08, mats.dark);
// Window bays at left emit diffuse daylight.
const windowMat = new THREE.MeshStandardMaterial({ color: '#eef4ef', emissive: '#cce2e1', emissiveIntensity: .7, roughness: .45 });
for (const z of [-.05, 1.36, 2.77, 4.18]) {
  const pane = box(-2.54, 2.13, z, .05, 2.5, 1.29, windowMat, world, 'luminous-tall-window');
  pane.castShadow = false;
  box(-2.47, 2.13, z - .66, .15, 2.75, .075, mats.paper);
  box(-2.47, .89, z, .24, .085, 1.4, mats.paper);
  box(-2.45, 2.9, z, .11, .035, 1.3, mats.paper);
}
// Exit and fixed glass sidelight.
for (const x of [2.08, 3.44, 4.91]) box(x, 1.62, -.52, .085, 3.24, .16, mats.trim, world, 'door-frame');
box(3.50, 3.22, -.52, 2.9, .095, .16, mats.trim);
box(3.50, .033, -.48, 2.9, .055, .23, mats.silver);
box(4.175, 1.62, -.505, 1.40, 3.12, .085, mats.trim, world, 'exit-door');
box(4.175, 1.73, -.45, 1.08, 2.67, .095, windowMat).visible = false;
// The open aperture is modeled as four rails so the actual corridor remains visible.
const doorPanel = world.children.find(o => o.name === 'exit-door');
doorPanel.visible = false;
for (const x of [3.55, 4.80]) box(x, 1.6, -.48, .17, 3.10, .1, mats.trim);
box(4.175, .18, -.48, 1.25, .34, .1, mats.trim);
box(4.175, 3.075, -.48, 1.25, .16, .1, mats.trim);
const glass = new THREE.MeshPhysicalMaterial({
  color: '#abbeb8', transparent: true, opacity: .085, roughness: .17,
  metalness: .15, side: THREE.DoubleSide, depthWrite: false
});
box(2.75, 1.62, -.49, 1.22, 3.1, .015, glass, world, 'sidelight-glass');
box(4.175, 1.68, -.46, 1.08, 2.70, .015, glass, world, 'door-glass');
box(4.17, 1.30, -.33, 1.23, .06, .08, mats.dark, world, 'door-push-bar');
for (const x of [3.65, 4.7]) box(x, 1.3, -.39, .045, .14, .09, mats.silver);
box(4.31, 3.11, -.28, .45, .08, .14, mats.silver);
rod(v(4.31, 3.12, -.28), v(4.62, 3.14, -.47), .016, mats.dark);
box(3.48, 3.44, -.47, .6, .19, .055, material('#8a9b7c'));
// Corridor: bright neutral wall panels, doors, ceiling strips and tiled floor.
const corridorFloor = material('#a6a99d', .4, .1);
box(3.6, -.015, -3.3, 5.3, .045, 5.6, corridorFloor);
box(3.5, 1.65, -4.8, 5.7, 3.3, .13, material('#d2ccae'));
box(5.4, 1.65, -2.7, .12, 3.3, 4.1, mats.paper);
for (const x of [1.8, 3.1, 4.5]) {
  box(x, 1.42, -4.7, .87, 2.62, .045, mats.trim);
  box(x, 1.42, -4.66, .71, 2.39, .025, material('#859188', .35));
}
for (let z = -4.7; z < -.7; z += .8) box(3.6, .013, z, 5, .003, .014, mats.edge);
for (const x of [2, 3.5, 5]) box(x, .013, -3, .012, .003, 5, mats.edge);
for (const z of [-1.6, -3.2, -4.5]) box(3.5, 3.27, z, 2.7, .025, .10, windowMat);
// Shared passer-by outside; articulated but intentionally not an edited object.
const person = new THREE.Group(); person.name = 'shared-corridor-passerby';
world.add(person);
const clothes = material('#324348', .98), jeans = material('#344b55', .94), skin = material('#b69677', .92);
const personBody = armor(0, 1.17, 0, .33, .57, .23, person, clothes, .055);
const head = mesh(new THREE.SphereGeometry(.122, 18, 14), skin, person); head.position.set(0, 1.63, .005); head.scale.y = 1.23;
const hair = mesh(new THREE.SphereGeometry(.125, 16, 12, 0, Math.PI * 2, 0, Math.PI * .59), mats.dark, person);
hair.position.set(0, 1.67, .005);
const nose = mesh(new THREE.SphereGeometry(.025, 10, 8), skin, person);
nose.position.set(0, 1.625, .119); nose.scale.set(.72, 1, 1.2);
for (const x of [-.117, .117]) {
  const ear = mesh(new THREE.SphereGeometry(.025, 10, 8), skin, person);
  ear.position.set(x, 1.625, .004); ear.scale.set(.5, 1, .6);
}
box(0, 1.39, .123, .025, .065, .008, mats.dark, person);
const personLimbs = [];
for (const s of [-1, 1]) {
  personLimbs.push({
    s, thigh: cylinder(0, 0, 0, .075, 1, jeans, person),
    calf: cylinder(0, 0, 0, .055, 1, jeans, person),
    arm: cylinder(0, 0, 0, .052, 1, clothes, person),
    forearm: cylinder(0, 0, 0, .037, 1, skin, person),
    shoe: armor(0, 0, 0, .12, .085, .25, person, mats.dark)
  });
}
function linePose(o, a, b) { window.__bfTrace?.add(208);
  o.position.copy(a).add(b).multiplyScalar(.5);
  o.quaternion.setFromUnitVectors(v(0, 1, 0), b.clone().sub(a).normalize());
  o.scale.y = a.distanceTo(b);
}
// Open central bench, no opaque panel filling the under-table negative space.
const table = new THREE.Group(); table.name = 'central-open-workbench'; world.add(table);
table.scale.x = .79;
table.position.set(-.10, 0, .27);
box(.90, 1.105, 1.18, 2.98, .105, 1.35, mats.wood, table, 'wooden-worktop');
box(.90, 1.053, 1.84, 2.98, .038, .032, mats.woodEdge, table);
for (const x of [-.50, 2.30]) for (const z of [.59, 1.77]) {
  box(x, .515, z, .07, 1.03, .075, mats.steel, table, 'square-steel-leg');
  box(x, .025, z, .115, .05, .12, mats.dark, table);
}
for (const y of [.20, 1.013]) {
  box(.9, y, .59, 2.82, .065, .055, mats.steel, table);
  for (const x of [-.50, 2.30]) box(x, y, 1.18, .06, .065, 1.19, mats.steel, table);
}
box(.90, .25, 1.76, 2.82, .055, .045, mats.steel, table);
function stool(x, z) { window.__bfTrace?.add(228);
  const group = new THREE.Group(); group.name = 'bare-wooden-stool'; world.add(group);
  cylinder(x, .78, z, .25, .055, mats.wood, group, 'y', 48);
  cylinder(x, .75, z, .249, .018, mats.edge, group, 'y', 48);
  for (let i = 0; i < 4; i++) {
    const a = Math.PI / 4 + i * Math.PI / 2;
    rod(v(x + .19 * Math.cos(a), .742, z + .19 * Math.sin(a)), v(x + .28 * Math.cos(a), .035, z + .28 * Math.sin(a)), .017, mats.silver, group);
  }
  const ring = mesh(new THREE.TorusGeometry(.253, .013, 8, 40), mats.edge, group);
  ring.rotation.x = Math.PI / 2; ring.position.set(x, .24, z);
  for (let i = 0; i < 16; i++) {
    const a = random() * Math.PI * 2, r = random() * .21;
    const scratch = box(x + Math.cos(a) * r, .809, z + Math.sin(a) * r, .035 + random() * .05, .001, .002, mats.woodEdge, group);
    scratch.rotation.y = random();
  }
}
stool(.35, 2.72); stool(1.26, 2.72);
function workbench(x, z, sx, sz) { window.__bfTrace?.add(245);
  box(x, 1.04, z, sx, .085, sz, mats.wood);
  for (const dx of [-sx / 2 + .07, sx / 2 - .07]) for (const dz of [-sz / 2 + .07, sz / 2 - .07]) box(x + dx, .5, z + dz, .055, 1, .055, mats.steel);
}
workbench(-1.3, -.14, 2.65, .64);
workbench(-2.08, 1.92, .87, 4.45);
// Test instruments and many loose electronic parts, all geometric.
function instrument(x, y, z, sx = .31, parent = world) { window.__bfTrace?.add(252);
  armor(x, y + .09, z, sx, .18, .24, parent, mats.paper, .015);
  box(x - sx * .16, y + .095, z + .126, sx * .42, .095, .008, mats.screen, parent);
  for (let i = 0; i < 3; i++) cylinder(x + sx * .22, y + .045 + .04 * i, z + .132, .012, .015, mats.dark, parent, 'z');
}
instrument(-1.98, 1.084, -.06, .38);
instrument(-2.03, 1.085, 1.37, .34);
instrument(.9, 1.16, .91, .34, table);
const peg = box(-1.62, 1.41, -.42, 1.02, .51, .035, mats.dark);
for (let i = 0; i < 7; i++) for (let j = 0; j < 4; j++) cylinder(-2.02 + i * .13, 1.24 + j * .11, -.395, .006, .008, mats.edge, world, 'z', 6);
for (let i = 0; i < 25; i++) {
  const x = -.36 + random() * 2.47, z = .69 + random() * .90;
  const m = [mats.dark, mats.paper, mats.blue, mats.copper][i % 4];
  const o = box(x, 1.18 + random() * .016, z, .07 + random() * .18, .025 + random() * .045, .05 + random() * .12, m, table, 'loose-electronics');
  o.rotation.y = random() * 1.5;
  if (i % 3 === 0) cable([[x, 1.21, z], [x + .12, 1.24, z + .13], [x + .35, 1.2, z - .1]], .004, i % 2 ? mats.rubber : mats.red, table);
}
for (let j = 0; j < 5; j++) {
  const x = -.24 + j * .48, z = .84 + (j % 2) * .48;
  const pcb = box(x, 1.212, z, .23, .018, .16, material('#3e6050'), table);
  pcb.rotation.y = j * .23;
  for (let k = 0; k < 3; k++) {
    box(-.065 + k * .06, .018, .0, .032, .022, .047, mats.dark, pcb);
    cylinder(-.073 + k * .07, .027, .05, .013, .04, mats.silver, pcb);
  }
}
for (let j = 0; j < 3; j++) {
  const coil = [];
  for (let i = 0; i <= 70; i++) {
    const a = i / 70 * Math.PI * 7;
    coil.push([.22 + j * .46 + Math.cos(a) * .10, 1.21 + .0004 * i, 1.5 + Math.sin(a) * .08]);
  }
  cable(coil, .0045, j === 1 ? mats.red : mats.rubber, table);
}
for (let i = 0; i < 17; i++) {
  const z = -.20 + random() * 4.0;
  box(-2.25 + random() * .35, 1.12, z, .1 + random() * .2, .05 + random() * .12, .1, [mats.silver, mats.blue, mats.paper, mats.dark][i % 4]);
}
// Spool, vise, soldering stand, desk light and drinks.
cylinder(-2.09, 1.43, 2.6, .20, .10, mats.edge, world, 'x', 32);
cylinder(-2.09, 1.43, 2.6, .15, .13, mats.copper, world, 'x', 32);
box(-2.01, 1.17, 3.35, .22, .19, .26, mats.blue);
box(-1.99, 1.28, 3.35, .27, .065, .21, mats.silver);
rod(v(-2.13, 1.14, .30), v(-2.04, 1.62, .30), .015, mats.dark);
rod(v(-2.04, 1.62, .30), v(-1.78, 1.48, .40), .015, mats.dark);
const lampShade = mesh(new THREE.ConeGeometry(.08, .17, 20), mats.dark);
lampShade.position.set(-1.77, 1.47, .40); lampShade.rotation.z = .5;
cylinder(-1.73, 1.15, .07, .045, .15, mats.paper);
for (let i = 0; i < 6; i++) {
  const x = -.2 + i * .32;
  cable([[x, 1.17, 1.70], [x + .1, 1.24, 1.90], [x + .19, 1.18, 2.0], [x + .25, .7, 2.15], [x + .18, .025, 2.2], [x + .33, .018, 2.3]], .006, i === 2 ? mats.red : mats.rubber);
}
cable([[.83, 3.67, 1.10], [.78, 2.75, 1.1], [.66, 2.04, 1.1], [.53, 1.25, 1.12]], .010);
// Charging/control cabinet, sockets, plugs and hanging loops.
armor(1.19, 1.89, -.32, .65, 1.08, .25, world, mats.paper, .025);
box(1.18, 2.20, -.183, .21, .14, .016, mats.screen);
box(1.15, 2.20, -.169, .12, .055, .003, mats.blue);
for (const x of [1.01, 1.37]) {
  box(x, 1.98, -.158, .067, .061, .032, mats.dark);
  cable([[x, 1.99, -.10], [x - .13, 1.70, -.06], [x - .12, 1.14, -.08], [x + .12, 1.28, -.05], [x + .08, 1.95, -.1]], .013);
  armor(x + .08, 1.72, -.065, .06, .18, .06, world, mats.dark, .012);
}
rod(v(1.93, .80, -.50), v(1.93, 3.65, -.50), .025, mats.edge);
box(1.93, 1.74, -.46, .15, .18, .075, mats.edge);
cylinder(1.93, 1.74, -.414, .035, .01, mats.paper, world, 'z');
// Storage and believable cropped foreground workbench edges.
box(5.24, 1.42, .20, .58, 2.8, .80, mats.dark, world, 'right-storage-cabinet');
for (let y = .3; y < 2.7; y += .55) {
  box(5.20, y, .63, .54, .035, .055, mats.edge);
  box(5.23, y + .20, .655, .045, .14, .025, mats.silver);
}
box(5.17, 2.97, .2, .51, .30, .49, mats.wood);
workbench(-1.35, 5.70, .88, 1.92);
workbench(3.58, 5.80, .85, 1.88);
for (const x of [-1.35, 3.58]) {
  box(x, .53, 5.75, .73, .78, 1.62, mats.dark);
  instrument(x, 1.085, 5.20, .31);
  box(x, 1.12, 5.92, .5, .065, .22, mats.paper);
}
// Curving tire/drag wear follows the circulation aisle but is not a path overlay.
const scuffMat = material('#596260', .94);
scuffMat.transparent = true; scuffMat.opacity = .31; scuffMat.depthWrite = false;
const fadeCanvas = document.createElement('canvas');
fadeCanvas.width = 256; fadeCanvas.height = 8;
const fadeCtx = fadeCanvas.getContext('2d');
const fadeGradient = fadeCtx.createLinearGradient(0, 0, 256, 0);
fadeGradient.addColorStop(0, '#000'); fadeGradient.addColorStop(.16, '#fff');
fadeGradient.addColorStop(.82, '#fff'); fadeGradient.addColorStop(1, '#000');
fadeCtx.fillStyle = fadeGradient; fadeCtx.fillRect(0, 0, 256, 8);
scuffMat.alphaMap = new THREE.CanvasTexture(fadeCanvas);
for (let j = 0; j < 24; j++) {
  const d = (j - 12) * .018 + random() * .018;
  const pts = [
    [-1.20 + d, 3.08], [-1.46 + d, 3.56], [-.87 + d, 3.99],
    [.56 + d, 4.20], [2.30 + d, 4.07], [3.22 + d, 3.65],
    [3.49 + d, 3.18], [3.24 + d, 2.63], [3.47 + d, 2.05]
  ].map(([x, z]) => v(x + random() * .02, .0015 + j * .00005, z + d));
  const curve = new THREE.CatmullRomCurve3(pts);
  const mark = mesh(new THREE.TubeGeometry(curve, 100, j % 4 ? .004 : .015, 4, false), scuffMat);
  mark.castShadow = false;
}
for (let i = 0; i < 85; i++) {
  const o = box(-2.6 + random() * 7.8, .003, -.3 + random() * 6.5, .03 + random() * .21, .001, .002, mats.edge);
  o.rotation.y = random() * 5; o.castShadow = false;
}

const hemi = new THREE.HemisphereLight('#edf5f1', '#687171', 1.3);
hemi.name = 'shared-ambient'; world.add(hemi);
const sun = new THREE.DirectionalLight('#fff4e2', 1.8);
sun.position.set(-3.0, 5.1, 3.6);
sun.target.position.set(1.1, .3, 1.7);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: .5, far: 18 });
sun.shadow.bias = -.0003; sun.shadow.normalBias = .025;
sun.shadow.radius = 4;
world.add(sun, sun.target);
const fill = new THREE.PointLight('#d5e8e7', 16, 12, 2);
fill.position.set(-2.5, 2.3, 1.4); world.add(fill);
const frontFill = new THREE.DirectionalLight('#e2ecee', .45);
frontFill.position.set(1, 3.5, 7); world.add(frontFill);
// A generated light-box environment gives bare metal soft reflections without image assets.
const probeScene = new THREE.Scene();
probeScene.background = new THREE.Color('#9aabae');
const probePanel = new THREE.MeshBasicMaterial({ color: '#e6f1f2' });
box(-4, 2.5, 0, .1, 4, 7, probePanel, probeScene);
box(1, 5, 1, 7, .1, 7, new THREE.MeshBasicMaterial({ color: '#bac4c0' }), probeScene);
box(4, 1, -3, .1, 3, 3, new THREE.MeshBasicMaterial({ color: '#737d76' }), probeScene);
const pmrem = new THREE.PMREMGenerator(renderer);
const environmentTarget = pmrem.fromScene(probeScene, .15, .1, 20);
scene.environment = environmentTarget.texture;
scene.environmentIntensity = .45;
pmrem.dispose();

function cage(parent, y, front = .0, width = .40, depth = .39, height = .27) { window.__bfTrace?.add(386);
  const points = [
    v(-width / 2, y, front - depth / 2), v(width / 2, y, front - depth / 2),
    v(width / 2, y, front + depth / 2), v(-width / 2, y, front + depth / 2),
    v(-width * .31, y + height, front - depth * .24), v(width * .31, y + height, front - depth * .24),
    v(width * .31, y + height, front + depth * .19), v(-width * .31, y + height, front + depth * .19)
  ];
  for (const [a, b] of [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7],[0,7],[1,6]]) rod(points[a], points[b], .017, mats.dark, parent);
  armor(0, y + height * .72, front + .018, .17, .12, .12, parent, mats.dark, .014);
  box(0, y + height * .73, front + .084, .115, .064, .011, mats.screen, parent);
  box(0, y + .045, front, width * .64, .035, depth * .58, mats.edge, parent);
  for (const s of [-1, 1]) {
    rod(v(s * width * .25, y + .07, front - .10), v(s * width * .22, y + height * .7, front + .01), .012, mats.silver, parent);
    cable([[s * .08, y + height * .8, front - .04], [s * .13, y + height * .5, front - .08], [s * .12, y + .04, front + .05]], .005, mats.copper, parent);
  }
}
function mechanics(parent, y, z, width = .3) { window.__bfTrace?.add(402);
  for (const s of [-1, 1]) {
    rod(v(s * width / 2, y - .16, z), v(s * width / 2, y + .17, z), .023, mats.silver, parent);
    cylinder(s * width / 2, y - .08, z, .035, .17, mats.dark, parent);
    cable([[s * width / 2, y + .17, z], [s * (width / 2 + .07), y + .10, z - .07], [s * (width / 2 + .09), y - .13, z - .04], [s * width / 2, y - .19, z]], .012, mats.rubber, parent);
  }
}
function panelBolts(parent, sx, sy, z) { window.__bfTrace?.add(409);
  for (const x of [-sx * .36, sx * .36]) for (const y of [-sy * .36, sy * .36]) bolt(x, y, z, parent);
}
function bone(parent, length, width, name) { window.__bfTrace?.add(412);
  const group = new THREE.Group(); group.name = name; parent.add(group);
  cylinder(0, length * .5, 0, width * .23, length, mats.dark, group);
  const plate = armor(0, length * .53, .022, width, length * .73, width * .58, group);
  plate.rotation.x = -.055;
  for (const s of [-1, 1]) {
    rod(v(s * width * .36, .055, -.037), v(s * width * .36, length - .055, -.037), .011, mats.silver, group);
    for (const y of [length * .22, length * .82]) bolt(s * width * .34, y, width * .34, group);
  }
  box(0, length * .5, width * .335, width * .25, length * .34, .010, mats.edge, group);
  rod(v(-width * .30, .05, -width * .30), v(-width * .30, length * .58, -width * .30), .018, mats.dark, group);
  rod(v(-width * .30, length * .49, -width * .30), v(-width * .30, length - .028, -width * .30), .010, mats.silver, group);
  cable([[width * .31, .035, -.045], [width * .58, length * .30, -.052], [width * .56, length * .66, -.046], [width * .29, length - .028, -.02]], .009, mats.rubber, group);
  const sideShape = new THREE.Shape();
  sideShape.moveTo(-width * .26, length * .16);
  sideShape.lineTo(width * .24, length * .14);
  sideShape.lineTo(width * .44, length * .36);
  sideShape.lineTo(width * .39, length * .77);
  sideShape.lineTo(width * .22, length * .88);
  sideShape.lineTo(-width * .33, length * .83);
  sideShape.lineTo(-width * .43, length * .32);
  sideShape.closePath();
  const sideGeometry = new THREE.ExtrudeGeometry(sideShape, { depth: .012, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelThickness: .006, bevelSize: .006 });
  for (const s of [-1, 1]) {
    const side = mesh(sideGeometry, mats.ivory, group, 'tapered-side-armor');
    side.position.x = s * width * .51; side.rotation.y = s * Math.PI / 2;
    for (const y of [length * .23, length * .75]) bolt(s * (width * .51 + .022), y, 0, group, 'x', .008);
  }
  return group;
}
function poseBone(b, a, end) { window.__bfTrace?.add(442);
  b.position.copy(a);
  b.quaternion.setFromUnitVectors(v(0, 1, 0), end.clone().sub(a).normalize());
}
function makeLeg(parent, x, z, upper, lower, width, pole, name) { window.__bfTrace?.add(446);
  const leg = { x, z, upper, lower, pole, name };
  leg.top = bone(parent, upper, width, `${name}-upper-link`);
  leg.bottom = bone(parent, lower, width * .78, `${name}-lower-link`);
  leg.hip = new THREE.Group(); leg.hip.name = `${name}-hip`; parent.add(leg.hip); joint(0, 0, 0, leg.hip, width * .49);
  leg.knee = new THREE.Group(); leg.knee.name = `${name}-knee`; parent.add(leg.knee); joint(0, 0, 0, leg.knee, width * .40);
  leg.foot = new THREE.Group(); leg.foot.name = `${name}-contact-foot`; parent.add(leg.foot);
  armor(0, 0, .048, width * .80, .065, name.startsWith('human') ? .27 : .17, leg.foot, mats.dark, .025);
  armor(0, .035, .055, width * .67, .025, name.startsWith('human') ? .24 : .13, leg.foot, mats.edge, .010);
  leg.ankle = new THREE.Group(); leg.foot.add(leg.ankle); joint(0, .07, -.015, leg.ankle, .031);
  leg.contact = {};
  return leg;
}
const humanoid = new THREE.Group(); humanoid.name = 'humanoid564'; robotRig.add(humanoid);
const dog = new THREE.Group(); dog.name = 'quadruped563'; robotRig.add(dog);
const humanBody = new THREE.Group(); humanBody.name = 'human-balanced-torso'; humanoid.add(humanBody);
armor(0, 1.24, -.02, .35, .29, .26, humanBody, mats.dark);
armor(0, 1.48, .015, .44, .39, .32, humanBody);
armor(0, 1.31, .115, .32, .26, .075, humanBody, mats.ivory, .03);
box(0, 1.48, .183, .20, .20, .025, mats.dark, humanBody);
for (let i = 0; i < 6; i++) box(-.074 + i * .03, 1.49, .201, .013, .16, .01, mats.edge, humanBody);
armor(0, 1.43, -.22, .29, .44, .16, humanBody, mats.dark);
mechanics(humanBody, 1.41, -.315, .20);
armor(0, 1.00, 0, .33, .16, .25, humanBody, mats.dark);
for (const s of [-1, 1]) {
  armor(s * .155, 1.10, .0, .11, .24, .25, humanBody);
  armor(s * .225, 1.46, .015, .036, .31, .23, humanBody, mats.edge, .012);
  armor(s * .248, 1.39, .025, .026, .18, .20, humanBody, mats.ivory, .011);
  cylinder(s * .263, 1.55, -.035, .046, .018, mats.dark, humanBody, 'x', 24);
  cylinder(s * .275, 1.55, -.035, .024, .012, mats.silver, humanBody, 'x');
  for (const y of [1.31, 1.45]) for (const z of [-.055, .09]) bolt(s * .267, y, z, humanBody, 'x');
  const torsoShape = new THREE.Shape();
  torsoShape.moveTo(-.17, .18); torsoShape.lineTo(.13, .19);
  torsoShape.lineTo(.21, .08); torsoShape.lineTo(.11, -.04);
  torsoShape.lineTo(.13, -.25); torsoShape.lineTo(-.13, -.27);
  torsoShape.lineTo(-.20, -.15); torsoShape.closePath();
  const torsoPlate = mesh(new THREE.ExtrudeGeometry(torsoShape, { depth: .012, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelThickness: .012, bevelSize: .012 }), mats.ivory, humanBody, 'sculpted-torso-side-shell');
  torsoPlate.position.set(s * .238, 1.45, .025);
  torsoPlate.rotation.y = s * Math.PI / 2;
  cable([[s * .16, 1.67, -.18], [s * .25, 1.79, -.17], [s * .31, 1.53, -.23], [s * .28, 1.18, -.22], [s * .17, 1.0, -.17]], .021, mats.rubber, humanBody);
  cable([[s * .09, 1.87, -.1], [s * .13, 1.75, -.12], [s * .18, 1.51, -.11]], .006, mats.copper, humanBody);
}
cage(humanBody, 1.73, 0, .46, .39, .26);
mechanics(humanBody, 1.10, -.04, .19);
const humanLegs = [
  makeLeg(humanoid, -.135, 0, .47, .49, .18, 1, 'human-left'),
  makeLeg(humanoid, .135, 0, .47, .49, .18, 1, 'human-right')
];
const arms = [];
for (const s of [-1, 1]) {
  const a = { s, upper: bone(humanoid, .32, .13, 'human-upper-arm'), fore: bone(humanoid, .31, .115, 'human-forearm') };
  a.shoulder = new THREE.Group(); humanoid.add(a.shoulder); joint(0, 0, 0, a.shoulder, .085);
  a.elbow = new THREE.Group(); humanoid.add(a.elbow); joint(0, 0, 0, a.elbow, .047);
  cylinder(s * .09, 0, 0, .034, .012, mats.rust, a.elbow, 'x');
  a.hand = new THREE.Group(); a.hand.name = 'human-gripper'; humanoid.add(a.hand);
  armor(0, 0, 0, .11, .14, .12, a.hand, mats.dark, .025);
  for (const x of [-.04, .04]) box(x, -.09, .015, .026, .09, .038, mats.rubber, a.hand);
  arms.push(a);
}
const dogBody = new THREE.Group(); dogBody.name = 'dog-horizontal-chassis'; dog.add(dogBody);
armor(0, .90, 0, .39, .30, .97, dogBody, mats.dark);
for (const s of [-1, 1]) {
  armor(s * .198, .89, 0, .058, .24, .77, dogBody);
  box(s * .234, .94, .02, .014, .052, .43, mats.dark, dogBody);
  for (let i = 0; i < 7; i++) bolt(s * .248, .945, -.16 + i * .057, dogBody, 'x', .008);
  rod(v(s * .155, 1.05, -.43), v(s * .155, 1.05, .42), .018, mats.silver, dogBody);
  cable([[s * .17, .92, -.52], [s * .23, 1.13, -.51], [s * .18, 1.12, -.25], [s * .14, 1.08, .33]], .017, mats.rubber, dogBody);
}
for (let i = 0; i < 6; i++) {
  box(0, 1.061, -.31 + i * .105, .3, .025, .032, mats.edge, dogBody);
  cable([[-.11, 1.08, -.32 + i * .11], [0, 1.115, -.28 + i * .11], [.13, 1.08, -.32 + i * .11]], .004, i % 2 ? mats.copper : mats.red, dogBody);
}
armor(0, .95, .48, .37, .29, .23, dogBody);
armor(0, .93, .606, .22, .19, .045, dogBody, mats.dark, .025);
for (const x of [-.062, .062]) cylinder(x, .956, .638, .025, .023, mats.screen, dogBody, 'z', 16);
box(0, .89, .635, .033, .014, .008, mats.led, dogBody);
cage(dogBody, 1.06, .33, .37, .34, .23);
const dogLegs = [];
for (const z of [-.39, .39]) for (const x of [-.24, .24]) {
  dogLegs.push(makeLeg(dog, x, z, .455, .465, .155, z > 0 ? -1 : 1, `dog-${z > 0 ? 'front' : 'rear'}-${x < 0 ? 'left' : 'right'}`));
}
// Surface chips remain attached to each shell rather than using external image assets.
for (const model of [humanoid, dog]) {
  const shells = [];
  model.traverse(o => { if (o.isMesh && o.name === 'fabricated-shell' && o.material === mats.ivory) shells.push(o); });
  for (const shell of shells) {
    const g = shell.geometry; g.computeBoundingBox();
    const b = g.boundingBox, size = b.getSize(v());
    for (let i = 0; i < 4; i++) {
      const chip = box((random() - .5) * size.x * .8, (random() - .5) * size.y * .8, b.max.z + .001, .008 + random() * .019, .003, .001, mats.edge, shell);
      chip.rotation.z = random() * .4;
    }
  }
}

const route = new THREE.CatmullRomCurve3([
  v(-.13, 0, 3.96), v(.75, 0, 3.96), v(1.92, 0, 3.88),
  v(2.85, 0, 3.51), v(3.17, 0, 2.58), v(3.23, 0, 1.55),
  v(3.90, 0, .75), v(4.13, 0, -.03)
], false, 'catmullrom', .32);
route.arcLengthDivisions = 800;
const routeLength = route.getLength();
const travelTime = 5.45;
function distanceAt(t) { window.__bfTrace?.add(549);
  const ramp = .35, time = clamp(t, 0, travelTime);
  const speed = routeLength / (travelTime - ramp / 2);
  return speed * (time < ramp ? time * .5 - ramp / (2 * Math.PI) * Math.sin(Math.PI * time / ramp) : time - ramp / 2);
}
function poseAtDistance(distance) { window.__bfTrace?.add(554);
  const u = clamp(distance / routeLength, 0, 1);
  const p = route.getPointAt(u), tangent = route.getTangentAt(u).normalize();
  if (distance < 0) p.addScaledVector(tangent, distance);
  if (distance > routeLength) p.addScaledVector(tangent, distance - routeLength);
  return { position: p, yaw: Math.atan2(-tangent.x, -tangent.z) + Math.PI, tangent, progress: u };
}
function worldOffset(pose, x, z) { window.__bfTrace?.add(561);
  const c = Math.cos(pose.yaw), s = Math.sin(pose.yaw);
  return pose.position.clone().add(v(c * x + s * z, 0, -s * x + c * z));
}
function toRoot(point, nav) { window.__bfTrace?.add(565);
  return point.clone().sub(nav.position).applyAxisAngle(v(0, 1, 0), -nav.yaw);
}
function footContact(distance, phaseOffset, stride, stance, x, z, nav, lift) { window.__bfTrace?.add(568);
  const phase = distance / stride + phaseOffset;
  const cycle = Math.floor(phase), f = phase - cycle;
  const anchorDistance = (cycle - phaseOffset + stance / 2) * stride;
  const anchor = poseAtDistance(anchorDistance);
  let point = worldOffset(anchor, x, z), yaw = anchor.yaw, height = .04;
  if (f > stance) {
    const next = poseAtDistance(anchorDistance + stride);
    const a = (f - stance) / (1 - stance), ease = a * a * a * (10 + a * (-15 + 6 * a));
    point.lerp(worldOffset(next, x, z), ease);
    const turn = Math.atan2(Math.sin(next.yaw - anchor.yaw), Math.cos(next.yaw - anchor.yaw));
    yaw = anchor.yaw + turn * ease;
    height += Math.sin(Math.PI * a) * lift;
  }
  point.y = height;
  return { position: toRoot(point, nav), world: point.toArray(), yaw: yaw - nav.yaw, stance: f <= stance, phase: f };
}
function solveLeg(leg, hip, foot) { window.__bfTrace?.add(585);
  const ankle = foot.position.clone().add(v(0, .085, -.015));
  const delta = ankle.clone().sub(hip), d = Math.min(delta.length(), leg.upper + leg.lower - .001);
  const direction = delta.normalize();
  const along = (leg.upper ** 2 - leg.lower ** 2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, leg.upper ** 2 - along * along));
  const pole = v(0, 0, leg.pole);
  pole.addScaledVector(direction, -pole.dot(direction)).normalize();
  const knee = hip.clone().addScaledVector(direction, along).addScaledVector(pole, h);
  poseBone(leg.top, hip, knee); poseBone(leg.bottom, knee, ankle);
  leg.hip.position.copy(hip); leg.knee.position.copy(knee);
  leg.foot.position.copy(foot.position); leg.foot.rotation.y = foot.yaw;
  leg.contact = {
    planted: foot.stance, worldPosition: foot.world, phase: foot.phase,
    hip: hip.toArray(), knee: knee.toArray(), ankle: ankle.toArray(),
    upperReachError: Math.abs(hip.distanceTo(knee) - leg.upper),
    lowerReachError: Math.abs(knee.distanceTo(ankle) - leg.lower)
  };
}
function animateHuman(distance, nav) { window.__bfTrace?.add(604);
  const stride = 1.02, angle = distance / stride * Math.PI * 2;
  const bob = .013 * Math.cos(angle * 2);
  humanBody.position.y = bob; humanBody.rotation.z = .016 * Math.sin(angle);
  humanBody.rotation.x = .018;
  for (let i = 0; i < 2; i++) {
    const leg = humanLegs[i];
    const foot = footContact(distance, i * .5, stride, .61, leg.x, 0, nav, .115);
    solveLeg(leg, v(leg.x, .985 + bob, .005), foot);
  }
  for (const a of arms) {
    const swing = Math.cos(angle + (a.s > 0 ? 0 : Math.PI)) * .54;
    const shoulder = v(a.s * .275, 1.60 + bob, 0);
    const elbow = shoulder.clone().add(v(a.s * .018, -.32 * Math.cos(swing), .32 * Math.sin(swing)));
    const foreAngle = swing + .47;
    const hand = elbow.clone().add(v(0, -.31 * Math.cos(foreAngle), .31 * Math.sin(foreAngle)));
    poseBone(a.upper, shoulder, elbow); poseBone(a.fore, elbow, hand);
    a.shoulder.position.copy(shoulder); a.elbow.position.copy(elbow); a.hand.position.copy(hand);
    a.hand.rotation.x = -.1 + swing * .25;
  }
}
function animateDog(distance, nav) { window.__bfTrace?.add(625);
  const stride = 1.00, angle = distance / stride * Math.PI * 2;
  const bob = .014 * Math.cos(angle * 2);
  dogBody.position.y = bob; dogBody.rotation.x = .015 * Math.sin(angle * 2);
  for (const leg of dogLegs) {
    const offset = (leg.x < 0) === (leg.z > 0) ? 0 : .5;
    const foot = footContact(distance, offset, stride, .60, leg.x, leg.z, nav, .095);
    solveLeg(leg, v(leg.x, .86 + bob, leg.z), foot);
  }
}
function animatePerson(t) { window.__bfTrace?.add(635);
  person.position.set(2.97 - .12 * t, 0, -1.58);
  person.scale.setScalar(1.08);
  person.rotation.y = -Math.PI / 2;
  const phase = 1.0 + t * 4.5;
  for (const p of personLimbs) {
    const a = Math.sin(phase + (p.s > 0 ? 0 : Math.PI));
    const hip = v(p.s * .09, .94, 0), knee = v(p.s * .09, .54, a * .19);
    const ankle = v(p.s * .09, .10 + Math.max(0, -a) * .07, a * .35);
    linePose(p.thigh, hip, knee); linePose(p.calf, knee, ankle);
    p.shoe.position.copy(ankle).add(v(0, -.045, .035));
    const shoulder = v(p.s * .19, 1.41, 0), elbow = v(p.s * .23, 1.13, -a * .14);
    linePose(p.arm, shoulder, elbow);
    linePose(p.forearm, elbow, v(p.s * .24, .90, .06 - a * .25));
  }
  personBody.rotation.z = .015 * Math.sin(phase);
}
let variant = '564', currentTime = 0, navigation;
function seek(time) { window.__bfTrace?.add(653);
  if (!Number.isFinite(time)) throw new TypeError('seek time must be finite');
  currentTime = clamp(time, 0, DURATION);
  const distance = distanceAt(currentTime);
  const nav = poseAtDistance(distance);
  navigation = { groundRootPosition: nav.position.toArray(), yaw: nav.yaw, traveledDistance: distance, pathProgress: nav.progress, start: route.points[0].toArray(), goal: route.points.at(-1).toArray(), routeLength };
  robotRig.position.copy(nav.position); robotRig.rotation.set(0, nav.yaw, 0);
  humanoid.visible = variant === '564'; dog.visible = variant === '563';
  animateHuman(distance, nav); animateDog(distance, nav); animatePerson(currentTime);
  const u = currentTime / DURATION;
  camera.position.set(.90 + .52 * u, 1.75, 9.8 - .22 * u);
  camera.lookAt(.90 + .50 * u, .81, .8);
  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}
function getCameraState() { window.__bfTrace?.add(669);
  return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
}
function definitions(root) { window.__bfTrace?.add(672);
  const geometries = {}, materials = {};
  root.traverse(o => {
    if (o.geometry && !geometries[o.geometry.uuid]) geometries[o.geometry.uuid] = o.geometry.toJSON();
    for (const m of (Array.isArray(o.material) ? o.material : o.material ? [o.material] : [])) {
      if (!materials[m.uuid]) materials[m.uuid] = m.toJSON();
    }
  });
  return { geometries, materials };
}
function transforms(root) { window.__bfTrace?.add(682);
  const data = [];
  root.traverse(o => {
    const entry = {
      uuid: o.uuid, name: o.name, type: o.type, parent: o === root ? null : o.parent.uuid,
      position: o.position.toArray(), quaternion: o.quaternion.toArray(), scale: o.scale.toArray(),
      visible: o.visible, castShadow: o.castShadow, receiveShadow: o.receiveShadow
    };
    if (o.geometry) entry.geometry = o.geometry.uuid;
    if (o.material) entry.material = Array.isArray(o.material) ? o.material.map(m => m.uuid) : o.material.uuid;
    if (o.isLight) {
      entry.light = { color: o.color.toArray(), intensity: o.intensity, distance: o.distance ?? null, decay: o.decay ?? null, groundColor: o.groundColor?.toArray() ?? null };
      if (o.shadow) entry.shadow = { bias: o.shadow.bias, normalBias: o.shadow.normalBias, radius: o.shadow.radius, mapSize: o.shadow.mapSize.toArray(), camera: o.shadow.camera.toJSON() };
      if (o.target) entry.target = o.target.position.toArray();
    }
    data.push(entry);
  });
  return data;
}
scene.traverse(o => {
  if (o.material?.isMeshStandardMaterial) o.material.envMapIntensity = .28;
});
const worldDefinitions = definitions(world);
const robotDefinitions = { '564': definitions(humanoid), '563': definitions(dog) };
window.reconstruction = {
  pause() {},
  seek,
  setVariant(id) {
    if (id !== '564' && id !== '563') throw new RangeError('Variant must be "564" or "563"');
    variant = id; seek(currentTime);
  },
  getCameraState,
  getNavigationState() { return structuredClone(navigation); },
  getInvariantState() {
    return {
      navigation: structuredClone(navigation), camera: getCameraState(),
      renderer: { exposure: renderer.toneMappingExposure, toneMapping: renderer.toneMapping, colorSpace: renderer.outputColorSpace, shadowType: renderer.shadowMap.type },
      background: scene.background.toArray(), fog: { color: scene.fog.color.toArray(), near: scene.fog.near, far: scene.fog.far },
      environment: { kind: 'procedural-light-box-probe', intensity: scene.environmentIntensity, background: probeScene.background.toArray(), definitions: definitions(probeScene), objects: transforms(probeScene) },
      definitions: worldDefinitions, objects: transforms(world)
    };
  },
  getEditedObjectState() {
    const model = variant === '564' ? humanoid : dog;
    return {
      variant, rigType: variant === '564' ? 'articulated-humanoid' : 'articulated-quadruped',
      root: { position: robotRig.position.toArray(), quaternion: robotRig.quaternion.toArray(), scale: robotRig.scale.toArray(), visible: robotRig.visible },
      definitions: robotDefinitions[variant], objects: transforms(model),
      joints: (variant === '564' ? humanLegs : dogLegs).map(l => ({
        name: l.name, ...l.contact, worldPosition: l.foot.getWorldPosition(v()).toArray()
      }))
    };
  }
};
seek(0);
