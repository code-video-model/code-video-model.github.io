import * as THREE from '../vendor/three.module.js';

const W = 960, H = 540, FPS = 24, FRAMES = 124, END = (FRAMES - 1) / FPS;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color('#bcc5c8');
const world = new THREE.Group();
world.name = 'sharedLab';
scene.add(world);
const camera = new THREE.PerspectiveCamera(42, W / H, 0.05, 60);
scene.add(camera);

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (1664525 * s + 1013904223) >>> 0) / 4294967296);
}
function generatedTexture(kind) {
  const c = document.createElement('canvas');
  c.width = c.height = 512;
  const ctx = c.getContext('2d'), random = rng(kind === 'wood' ? 414 : 917);
  ctx.fillStyle = kind === 'wood' ? '#c6b395' : '#979996';
  ctx.fillRect(0, 0, 512, 512);
  if (kind === 'wood') {
    for (let x = 0; x < 512; x += 43) {
      ctx.fillStyle = `rgba(${random() > .5 ? '238,223,198' : '116,95,68'},${.04 + random() * .09})`;
      ctx.fillRect(x, 0, 42, 512);
      ctx.fillStyle = '#735c3924';
      ctx.fillRect(x, 0, 1, 512);
    }
    for (let i = 0; i < 2600; i++) {
      const x = random() * 512, y = random() * 512;
      ctx.strokeStyle = `rgba(83,58,27,${random() * .12})`;
      ctx.beginPath(); ctx.moveTo(x, y);
      ctx.bezierCurveTo(x + random() * 5, y + 30, x - 3, y + 60, x + 2, y + 120);
      ctx.stroke();
    }
  } else {
    const image = ctx.getImageData(0, 0, 512, 512);
    for (let i = 0; i < image.data.length; i += 4) {
      const x = (i / 4) % 512, y = Math.floor(i / 2048);
      const n = (random() - .5) * 11 + Math.sin(x * .052 + Math.sin(y * .033) * 2) * 1.8 + Math.cos(y * .024 + x * .013) * 2.1;
      image.data[i] += n; image.data[i + 1] += n; image.data[i + 2] += n;
    }
    ctx.putImageData(image, 0, 0);
  }
  const texture = new THREE.CanvasTexture(c);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'wood' ? 1 : 6, kind === 'wood' ? 2 : 8);
  texture.anisotropy = 8;
  texture.name = `seeded-procedural-${kind}`;
  return texture;
}
const mat = (color, roughness = .5, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const M = {
  wall: mat('#cecac1', .9), floor: new THREE.MeshStandardMaterial({ color: '#858782', map: generatedTexture('floor'), roughness: .62, metalness: .02, envMapIntensity: .35 }),
  black: mat('#202326', .46, .28), drawer: mat('#202629', .42, .40), edge: mat('#41494c', .35, .6),
  silver: mat('#aab3b6', .27, .8), bright: mat('#d2d8d8', .23, .7), rubber: mat('#101516', .8),
  wood: new THREE.MeshStandardMaterial({ color: '#d7c4a2', map: generatedTexture('wood'), roughness: .48 }),
  white: mat('#dadbd6', .34, .18), joint: mat('#10181c', .28, .65),
  dome: mat('#05090d', .12, .65), pcb: mat('#263734', .6, .3), red: mat('#8d2921', .55),
  ochre: mat('#b78b24', .48, .25), blue: mat('#3d687a', .46),
  glass: new THREE.MeshPhysicalMaterial({ color: '#b2d1d6', roughness: .12, metalness: .1, transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide }),
  frost: new THREE.MeshStandardMaterial({ color: '#a0bac2', transparent: true, opacity: .7, roughness: .6 }),
  light: new THREE.MeshStandardMaterial({ color: '#edf6f3', emissive: '#e5f2f5', emissiveIntensity: 1.2 }),
};
M.floor.bumpMap = M.floor.map;
M.floor.bumpScale = .009;
function group(name, parent = world) {
  const g = new THREE.Group(); g.name = name; parent.add(g); return g;
}
function mesh(geo, material, parent, name) {
  const o = new THREE.Mesh(geo, material); o.name = name || geo.type;
  o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}
function box(parent, name, x, y, z, sx, sy, sz, material) {
  const o = mesh(new THREE.BoxGeometry(sx, sy, sz), material, parent, name);
  o.position.set(x, y, z); return o;
}
function ball(parent, name, x, y, z, sx, sy, sz, material) {
  const o = mesh(new THREE.SphereGeometry(1, 20, 12), material, parent, name);
  o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o;
}
function cylinder(parent, name, x, y, z, r, height, material, axis = 'y', r2 = r) {
  const o = mesh(new THREE.CylinderGeometry(r, r2, height, 20), material, parent, name);
  o.position.set(x, y, z);
  if (axis === 'x') o.rotation.z = Math.PI / 2;
  if (axis === 'z') o.rotation.x = Math.PI / 2;
  return o;
}
function rod(parent, name, a, b, r, material) {
  const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b);
  const o = mesh(new THREE.CylinderGeometry(r, r, av.distanceTo(bv), 10), material, parent, name);
  o.position.copy(av).add(bv).multiplyScalar(.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bv.sub(av).normalize());
  return o;
}
function cable(parent, name, points, material = M.rubber, radius = .007) {
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return mesh(new THREE.TubeGeometry(curve, 24, radius, 6, false), material, parent, name);
}
function shell(parent, name, x, y, z, w, h, d, material, radius = .035) {
  const r = Math.min(radius, w / 3, h / 3, d / 3);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + r, -h / 2);
  shape.lineTo(w / 2 - r, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  shape.lineTo(w / 2, h / 2 - r); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  shape.lineTo(-w / 2 + r, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  shape.lineTo(-w / 2, -h / 2 + r); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * r, bevelEnabled: true, bevelSize: r / 2, bevelThickness: r, bevelSegments: 2, curveSegments: 4, steps: 1 });
  geo.translate(0, 0, -d / 2 + r);
  const o = mesh(geo, material, parent, name); o.position.set(x, y, z); return o;
}
function bolts(parent, x, y, z, dx, dy, axis = 'z') {
  for (const a of [-1, 1]) for (const b of [-1, 1])
    cylinder(parent, 'fixed-screw', x + a * dx, y + b * dy, z, .009, .006, M.silver, axis);
}

// The observation wall is behind the benches, rather than a painted imitation.
box(world, 'grey-lab-floor', 0, -.055, 0, 8.6, .1, 14, M.floor);
box(world, 'right-plaster-wall', 3.35, 1.8, -.5, .12, 3.6, 10, M.wall);
box(world, 'back-left-pier', -2.75, 1.8, -4.0, 2.1, 3.6, .15, M.wall);
box(world, 'back-right-pier', 2.85, 1.8, -4.0, 1.3, 3.6, .15, M.wall);
box(world, 'door-header', 1.15, 3.22, -4.0, 3.05, .75, .18, M.wall);
box(world, 'rear-observation-window', -1.03, 1.68, -3.98, 1.31, 2.52, .018, M.glass);
for (const x of [-1.70, -1.03, -.37]) box(world, 'rear-window-mullion', x, 1.75, -3.95, .047, 2.55, .075, M.silver);
box(world, 'rear-window-sill', -1.03, .47, -3.92, 1.36, .05, .14, M.silver);
box(world, 'rear-window-lower-panel', -1.03, .24, -3.97, 1.35, .46, .08, M.wall);
box(world, 'left-wall-sill', -3.05, .64, -.5, .13, 1.28, 9.8, M.wall);
box(world, 'right-baseboard', 3.27, .075, -.5, .035, .15, 10, M.black);
box(world, 'rear-baseboard', 0, .075, -3.89, 7.2, .15, .035, M.black);
const observation = group('broad-observation-glazing');
for (let i = 0; i < 6; i++) {
  const z = 3.5 - i * 1.48;
  box(observation, 'pane', -3.055, 2.11, z, .015, 1.65, 1.44, M.glass);
  box(observation, 'vertical-mullion', -3.02, 2.15, z + .74, .08, 1.8, .038, M.silver);
}
box(observation, 'continuous-sill', -3.02, 1.25, -.35, .15, .07, 9.7, M.silver);
box(observation, 'continuous-top-rail', -3.02, 3.02, -.35, .12, .06, 9.7, M.silver);
box(world, 'adjacent-lab-floor', -4.5, 0, -.4, 3, .07, 10, M.floor);
box(world, 'adjacent-lab-far-wall', -5.9, 1.8, -.4, .1, 3.6, 10, mat('#b9c6c6', .85));
for (let i = 0; i < 6; i++) {
  const z = 3.4 - i * 1.4;
  box(world, 'adjacent-worktop', -4.6, 1.05, z, 1.8, .05, .82, M.white);
  for (const dz of [-.32, .32]) box(world, 'adjacent-bench-leg', -4.8, .5, z + dz, .07, 1, .07, M.edge);
  box(world, 'adjacent-instrument', -4.6, 1.4, z, .45, .63, .36, i % 2 ? M.silver : M.edge);
  box(world, 'adjacent-display', -4.35, 1.45, z + .05, .008, .27, .24, M.blue);
  box(world, 'ceiling-strip-reflection', -4.55, 3.08, z, 1.8, .02, .12, M.light);
  for (const dz of [-.31, .31]) {
    rod(world, 'adjacent-aluminum-upright', [-4.34, 1.05, z + dz], [-4.34, 2.30, z + dz], .014, M.silver);
    rod(world, 'adjacent-rack-crossbar', [-4.34, 2.30, z + dz], [-4.9, 2.30, z + dz], .014, M.silver);
  }
  box(world, 'equipment-upper-module', -4.59, 1.90, z, .40, .18, .28, M.white);
  for (let j = 0; j < 4; j++) box(world, 'equipment-vent', -4.374, 1.33 + j * .035, z, .006, .009, .19, M.black);
  cable(world, 'fixed-equipment-harness', [[-4.36, 1.93, z], [-4.25, 1.77, z + .12], [-4.3, 1.55, z + .23], [-4.25, 1.1, z + .25]]);
}
function drawers(parent, name, x, z, width, depth, face = 'front') {
  const g = group(name, parent);
  g.position.set(x, 0, z);
  box(g, 'black-cabinet-body', 0, .48, 0, width, .9, depth, M.black);
  for (let i = 0; i < 5; i++) {
    const y = .88 - i * .167;
    if (face === 'front') {
      box(g, 'drawer-front', 0, y, depth / 2 + .008, width - .025, .153, .022, M.drawer);
      box(g, 'fixed-silver-handle', 0, y + .037, depth / 2 + .043, width - .15, .019, .028, M.silver);
    } else {
      box(g, 'drawer-front', width / 2 + .008, y, 0, .022, .153, depth - .025, M.drawer);
      box(g, 'fixed-silver-handle', width / 2 + .043, y + .037, 0, .028, .019, depth - .13, M.silver);
    }
  }
  for (const a of [-1, 1]) for (const b of [-1, 1])
    box(g, 'cabinet-foot', a * (width / 2 - .045), .07, b * (depth / 2 - .045), .055, .14, .055, M.edge);
  return g;
}
const leftBench = group('left-wall-drawer-benches');
for (let i = 0; i < 8; i++) {
  const z = 3.05 - i * .86;
  drawers(leftBench, `left-cabinet-${i}`, -2.63, z, .75, .84, 'side');
  box(leftBench, 'continuous-wood-bench', -2.6, .995, z, .91, .065, .86, M.wood);
  cylinder(leftBench, 'bench-caster', -2.29, .055, z + .32, .045, .035, M.rubber, 'x');
}
box(leftBench, 'perforated-backsplash', -2.98, 1.14, -.0, .018, .25, 7.9, M.silver);
for (let z = -3.6; z < 3.9; z += .065) for (const y of [1.075, 1.135, 1.195])
  cylinder(leftBench, 'pegboard-hole', -2.966, y, z, .008, .003, M.black, 'x');
function components(parent, x, y, z, count) {
  const g = group('fixed-electronic-component-stack', parent); g.position.set(x, y, z);
  for (let j = 0; j < count; j++) {
    const yy = .025 + j * .047;
    box(g, 'black-component-tray', 0, yy, 0, .26, .029, .23, M.black);
    box(g, 'tray-silver-rim', 0, yy + .018, 0, .272, .008, .239, M.silver);
    box(g, 'PCB', 0, yy + .025, 0, .22, .008, .18, M.pcb);
    for (const zz of [-.065, .055]) box(g, 'gold-connector', .103, yy + .03, zz, .026, .018, .05, M.ochre);
  }
  return g;
}
for (let i = 0; i < 18; i++) {
  const z = 3.25 - i * .37;
  components(leftBench, -2.58 + (i % 2) * .13, 1.03, z, 2 + (i * 7) % 6);
  if (i % 3 === 0) {
    const g = group('fixed-exposed-test-assembly', leftBench);
    g.position.set(-2.32, 1.05, z - .07);
    box(g, 'circuit-board', 0, .03, 0, .19, .013, .24, M.pcb);
    for (let j = 0; j < 3; j++) {
      cylinder(g, 'silver-electrolytic-capacitor', -.04, .09, -.07 + j * .066, .019, .10, M.silver);
      box(g, 'black-control-chip', .033, .048, -.075 + j * .064, .045, .017, .036, M.black);
    }
    for (const dz of [-.095, .095]) rod(g, 'brass-standoff', [.07, .04, dz], [.07, .16, dz], .006, M.ochre);
    cable(g, 'test-loop', [[-.06, .05, -.06], [.04, .19, -.035], [.08, .16, .1], [.06, .05, .12]], M.rubber, .005);
  }
}
const island = group('central-solid-drawer-island');
island.scale.y = 1.07;
island.scale.x = .92;
island.position.set(-.12, 0, -.19);
box(island, 'solid-end-panel', .47, .51, 1.44, 1.35, .93, .07, M.black);
box(island, 'island-left-side', -.18, .51, -.04, .06, .93, 2.96, M.black);
for (let i = 0; i < 4; i++) drawers(island, `island-drawer-bank-${i}`, .47, 1.055 - .74 * i, 1.32, .73, 'side');
box(island, 'thick-butcher-block-top', .47, 1.023, -.02, 1.46, .085, 3.1, M.wood);
for (const x of [-.2, 1.14]) for (const z of [-1.48, 1.46])
  box(island, 'island-square-leg', x, .115, z, .045, .23, .045, M.black);
bolts(island, .47, .72, 1.485, .59, .17);
const tools = group('fixed-tools-on-island');
tools.position.set(0, .075, -.19);
tools.scale.x = .92;
tools.position.x = -.12;
box(tools, 'red-PCB-tray', .25, 1.079, .91, .36, .035, .24, M.red);
box(tools, 'tray-inset', .25, 1.101, .91, .32, .01, .205, M.black);
for (let i = 0; i < 5; i++) {
  box(tools, 'tray-circuit', .115 + i * .061, 1.11, .92, .045, .012, .14, M.pcb);
  for (let j = 0; j < 3; j++) box(tools, 'circuit-silver-chip', .115 + i * .061, 1.119, .87 + j * .05, .025, .01, .028, M.silver);
}
box(tools, 'rubber-tool-mat', .12, 1.074, .54, .52, .013, .22, M.rubber);
for (let i = 0; i < 3; i++) {
  const x = -.02 + .14 * i;
  rod(tools, 'screwdriver-shaft', [x, 1.10, .45], [x + .04, 1.10, .68], .009, M.silver);
  rod(tools, 'red-tool-grip', [x, 1.10, .46], [x + .015, 1.10, .53], .024, i % 2 ? M.red : M.rubber);
}
components(tools, .60, 1.07, .45, 2);
for (const x of [.47, .72]) rod(tools, 'PCB-antenna', [x, 1.10, .45], [x, 1.26, .45], .006, M.ochre);
cable(tools, 'coiled-test-cable', [[.3, 1.12, .5], [.45, 1.14, .3], [.57, 1.15, .39], [.43, 1.13, .54], [.41, 1.12, .35]]);
box(tools, 'meter', .9, 1.09, .24, .15, .05, .22, M.edge);
box(tools, 'meter-display', .9, 1.119, .21, .10, .004, .07, M.blue);
box(tools, 'rear-paper', .23, 1.07, -1.16, .27, .002, .21, M.white);
components(tools, .89, 1.07, -1.08, 1);
cylinder(tools, 'bottle', .64, 1.17, -1.23, .028, .2, M.white);
cylinder(tools, 'bottle-cap', .64, 1.28, -1.23, .018, .025, M.blue);
box(tools, 'yellow-meter', .6, 1.10, -.95, .19, .055, .12, M.ochre);
function stool(name, x, z, scale = 1) {
  const g = group(name); g.position.set(x, 0, z); g.scale.setScalar(scale);
  cylinder(g, 'padded-black-seat', 0, .61, 0, .215, .075, M.rubber);
  cylinder(g, 'seat-edge', 0, .575, 0, .219, .023, M.black);
  cylinder(g, 'chrome-piston', 0, .34, 0, .028, .46, M.silver);
  cylinder(g, 'gas-lift-sleeve', 0, .22, 0, .044, .24, M.black);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5, x1 = Math.sin(a) * .33, z1 = Math.cos(a) * .33;
    rod(g, 'chrome-five-star-spoke', [0, .15, 0], [x1, .095, z1], .025, M.silver);
    cylinder(g, 'caster', x1, .054, z1, .047, .04, M.rubber, 'x');
    box(g, 'caster-bracket', x1, .091, z1, .045, .047, .035, M.edge);
  }
  const ring = mesh(new THREE.TorusGeometry(.15, .011, 8, 32), M.silver, g, 'foot-ring'); ring.rotation.x = Math.PI / 2; ring.position.y = .19;
  rod(g, 'backrest-stalk', [0, .54, -.17], [0, .89, -.2], .017, M.silver);
  shell(g, 'small-black-backrest', 0, .87, -.2, .17, .105, .04, M.rubber, .015);
  return g;
}
const nearStool = stool('right-rolling-stool', 1.36, .35);
const farStool = stool('far-rolling-stool', 1.36, -1.10, .91);
const door = group('dark-framed-glass-double-exit');
door.scale.x = .88;
door.position.x = -.07;
for (const x of [-.35, 1.15, 2.65]) box(door, 'door-vertical-frame', x, 1.47, -3.91, .085, 2.94, .105, M.edge);
for (const x of [.40, 1.90]) {
  box(door, 'clear-door-glazing', x, 1.53, -3.93, 1.41, 2.75, .022, M.glass);
  box(door, 'frosted-lower-pane', x, .64, -3.90, 1.35, 1.05, .017, M.frost);
  box(door, 'lower-door-rail', x, .095, -3.86, 1.5, .12, .10, M.edge);
  rod(door, 'fixed-panic-bar', [x - .60, 1.32, -3.78], [x + .6, 1.32, -3.78], .023, M.silver);
  for (const dx of [-.57, .57]) box(door, 'panic-mount', x + dx, 1.32, -3.83, .07, .065, .13, M.silver);
}
box(door, 'top-door-frame', 1.15, 2.93, -3.89, 3.10, .09, .12, M.edge);
box(door, 'threshold', 1.15, .018, -3.84, 3.09, .03, .23, M.silver);
box(world, 'outside-path', .4, -.015, -5.15, 8, .035, 2.4, mat('#b7c1c0', .9));
box(world, 'garden-background', .1, 1.7, -7.1, 9, 3.4, .1, mat('#819b8e', .9));
const leaves = [mat('#426448', .95), mat('#5e7955', .95), mat('#74926d', .95), mat('#91a383', .95)];
const random = rng(671);
const leafDummy = new THREE.Object3D();
for (let color = 0; color < leaves.length; color++) {
  const foliage = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), leaves[color], 1900);
  foliage.name = `procedural-shrub-leaves-${color}`;
  for (let i = 0; i < 1900; i++) {
    const x = -3.7 + random() * 7.7, y = .35 + random() * 2.95, z = -5.7 - random() * 1.2;
    leafDummy.position.set(x, y, z);
    leafDummy.rotation.set(random() * 3, random() * 6, random() * 3);
    leafDummy.scale.set(.028 + random() * .045, .023 + random() * .032, .045 + random() * .05);
    leafDummy.updateMatrix(); foliage.setMatrixAt(i, leafDummy.matrix);
  }
  world.add(foliage);
}
for (let i = 0; i < 22; i++) {
  const x = -3.5 + i * .35, z = -6.15 - random() * .4;
  rod(world, 'shrub-branch', [x, 0, z], [x + .15, 2.2 + random(), z], .014, M.edge);
}
for (const z of [-3.0, -1.25, .6]) {
  const utilities = group('right-wall-fixed-utilities');
  utilities.position.x = -.30;
  rod(utilities, 'metal-conduit', [3.56, .94, z], [3.56, 3.4, z], .015, M.silver);
  box(utilities, 'electrical-junction-box', 3.54, 1.15, z, .08, .14, .105, M.silver);
  for (const yy of [1.12, 1.17]) cylinder(utilities, 'socket', 3.49, yy, z, .015, .005, M.black, 'x');
  cable(utilities, 'hanging-black-cable', [[3.51, 2.9, z - .1], [3.51, 1.57, z - .12], [3.51, 1.45, z + .03], [3.51, 1.77, z + .05]]);
}
rod(world, 'blue-air-line', [3.23, 3.4, -1.9], [3.23, 1.75, -1.9], .012, M.blue);
const charger = group('fixed-right-wall-charging-dock');
charger.position.set(2.99, 0, -2.9);
shell(charger, 'black-charger', 0, .225, 0, .24, .39, .14, M.black);
shell(charger, 'charging-ground-base', 0, .045, .09, .33, .07, .34, M.rubber);
const indicator = mesh(new THREE.TorusGeometry(.05, .008, 8, 24), M.light, charger, 'white-charge-ring'); indicator.position.set(0, .17, .078);
box(charger, 'small-white-charge-indicator', 0, .33, .077, .009, .075, .006, M.light);
cable(charger, 'fixed-power-lead', [[.1, .12, 0], [.27, .04, -.08], [.29, .06, -.28], [.29, .35, -.29]]);

// Fixed background robot hardware is shared by both variants.
const backgroundRobot = group('fixed-background-robot-test-stand');
backgroundRobot.position.set(-2.42, 1.04, -2.70);
box(backgroundRobot, 'stand', 0, .03, 0, .43, .06, .32, M.black);
rod(backgroundRobot, 'stand-post', [0, .04, 0], [0, .54, 0], .03, M.silver);
box(backgroundRobot, 'test-torso', 0, .38, 0, .26, .29, .16, M.white);
for (const x of [-.19, .19]) {
  ball(backgroundRobot, 'test-shoulder', x, .57, 0, .085, .08, .08, M.joint);
  rod(backgroundRobot, 'test-arm', [x, .52, 0], [x * 1.2, .25, -.025], .043, M.white);
}
box(backgroundRobot, 'head-sensor', 0, .66, 0, .14, .12, .13, M.black);
for (const z of [-2.25, -1.92]) {
  box(world, 'fixed-rear-component-rack', -1.95, 1.04, z, .29, .03, .28, M.silver);
  rod(world, 'rack-post', [-1.82, .03, z], [-1.82, 1.12, z], .019, M.silver);
}

scene.add(new THREE.HemisphereLight('#e4edf3', '#777b7d', 1.45));
const ceiling = new THREE.DirectionalLight('#fff8ed', 1.30);
ceiling.position.set(-1, 6.5, 2.7); ceiling.castShadow = true;
ceiling.shadow.mapSize.set(2048, 2048);
ceiling.shadow.camera.left = -6; ceiling.shadow.camera.right = 6;
ceiling.shadow.camera.top = 6; ceiling.shadow.camera.bottom = -6;
ceiling.shadow.normalBias = .018; ceiling.shadow.bias = -.0002; ceiling.shadow.radius = 3;
scene.add(ceiling);
const daylight = new THREE.DirectionalLight('#d3e8f4', 1.65);
daylight.position.set(1, 4, -6); scene.add(daylight);
const fill = new THREE.PointLight('#f6f5ed', 12, 10, 2);
fill.position.set(-3.7, 2.6, 2); scene.add(fill);

const root = group('shared-navigation-ground-root', scene);
const robotRig = group('robotRig', root);
const humanoid = group('humanoid564', robotRig);
const dog = group('quadruped563', robotRig);
const humanScale = 1.075, dogScale = .96;
humanoid.scale.setScalar(humanScale);
dog.scale.setScalar(dogScale);
const contactCanvas = document.createElement('canvas');
contactCanvas.width = contactCanvas.height = 64;
const contactContext = contactCanvas.getContext('2d');
const contactGradient = contactContext.createRadialGradient(32, 32, 3, 32, 32, 31);
contactGradient.addColorStop(0, 'rgba(0,0,0,0.8)');
contactGradient.addColorStop(.5, 'rgba(0,0,0,0.35)');
contactGradient.addColorStop(1, 'rgba(0,0,0,0)');
contactContext.fillStyle = contactGradient;
contactContext.fillRect(0, 0, 64, 64);
const contactMap = new THREE.CanvasTexture(contactCanvas);
contactMap.name = 'analytic-contact-penumbra';
function contactShadow(parent, name, width, depth) {
  const g = group(name, parent);
  const material = new THREE.MeshBasicMaterial({ map: contactMap, transparent: true, opacity: .35, depthWrite: false });
  const plane = mesh(new THREE.PlaneGeometry(width, depth), material, g, 'procedural-foot-contact-shadow');
  plane.rotation.x = -Math.PI / 2;
  plane.castShadow = false; plane.receiveShadow = false; plane.renderOrder = 2;
  return { group: g, material };
}
function actuator(parent, name, x, y, z, radius, length) {
  cylinder(parent, name, x, y, z, radius, length, M.joint, 'x');
  for (const side of [-1, 1]) {
    cylinder(parent, 'silver-actuator-rim', x + side * length / 2, y, z, radius * .82, .014, M.silver, 'x');
    cylinder(parent, 'dark-actuator-cap', x + side * (length / 2 + .009), y, z, radius * .60, .015, M.black, 'x');
  }
}
const humanBody = group('humanoid-body', humanoid);
shell(humanBody, 'pelvic-white-shell', 0, .92, 0, .33, .15, .23, M.white);
box(humanBody, 'waist-mechanism', 0, 1.035, 0, .22, .14, .16, M.joint);
shell(humanBody, 'thoracic-black-frame', 0, 1.30, 0, .4, .43, .23, M.joint);
shell(humanBody, 'large-white-back-plate', 0, 1.32, .105, .39, .36, .07, M.white, .045);
shell(humanBody, 'lower-back-access-panel', 0, 1.19, .135, .31, .21, .018, M.white, .012);
bolts(humanBody, 0, 1.29, .156, .143, .11);
for (let i = 0; i < 7; i++) box(humanBody, 'upper-back-vent', -.087 + i * .029, 1.48, .151, .012, .024, .006, M.edge);
for (const side of [-1, 1]) {
  ball(humanBody, 'rounded-upper-back-corner', side * .135, 1.445, .075, .072, .078, .025, M.white);
  cable(humanBody, 'exposed-spinal-harness', [[side * .178, 1.39, .095], [side * .21, 1.19, .085], [side * .154, 1.05, .09], [side * .11, .99, .07]], M.joint, .012);
  shell(humanBody, 'split-pelvic-side-panel', side * .183, .94, .037, .095, .12, .18, M.white, .023);
}
cylinder(humanBody, 'black-neck', 0, 1.58, 0, .075, .13, M.joint);
ball(humanBody, 'gloss-black-domed-head', 0, 1.73, -.013, .118, .15, .112, M.dome);
shell(humanBody, 'black-face-plate', 0, 1.715, -.102, .16, .14, .018, M.black, .02);
for (const y of [1.595, 1.62, 1.64]) cylinder(humanBody, 'neck-articulation-ring', 0, y, 0, .078, .012, M.black);
const arms = [];
for (const side of [-1, 1]) {
  const shoulder = group(`shoulder-${side}`, humanBody); shoulder.position.set(side * .253, 1.44, 0);
  actuator(shoulder, 'black-shoulder-motor', 0, 0, 0, .092, .11);
  ball(shoulder, 'black-rounded-shoulder-housing', 0, .005, .002, .084, .087, .087, M.joint);
  shell(shoulder, 'upper-arm-white-shell', 0, -.145, 0, .13, .22, .14, M.white);
  ball(shoulder, 'upper-arm-rounded-cap', 0, -.062, .007, .065, .065, .071, M.white);
  const elbow = group('elbow', shoulder); elbow.position.y = -.29;
  actuator(elbow, 'elbow-motor', 0, 0, 0, .062, .12);
  shell(elbow, 'forearm-white-shell', 0, -.115, .006, .102, .18, .113, M.white);
  cylinder(elbow, 'wrist', 0, -.234, 0, .04, .075, M.joint);
  shell(elbow, 'black-palm', 0, -.29, 0, .076, .10, .045, M.black, .01);
  for (let i = 0; i < 4; i++) {
    rod(elbow, 'finger-segment', [-.026 + i * .017, -.32, 0], [-.026 + i * .017, -.375, -.005], .008, M.joint);
    ball(elbow, 'finger-knuckle', -.026 + i * .017, -.345, 0, .011, .013, .011, M.black);
  }
  rod(elbow, 'thumb', [side * .045, -.29, 0], [side * .06, -.335, -.02], .011, M.joint);
  arms.push({ shoulder, elbow, side });
}
function limb(parent, name, length, width, depth, material) {
  const g = group(name, parent);
  cylinder(g, 'exposed-link-core', 0, 0, 0, width * .27, length, M.joint);
  if (material === M.white) {
    const profile = [
      [0, -.39], [.28, -.39], [.43, -.30], [.51, -.13], [.50, .21], [.38, .37], [0, .39],
    ].map(([r, h]) => new THREE.Vector2(r * width, h * length));
    const armor = mesh(new THREE.LatheGeometry(profile, 20), material, g, 'curved-tapered-white-armor');
    armor.scale.z = depth / width;
    box(g, 'black-service-strip', 0, -.015, depth * .525, width * .18, length * .27, .008, M.edge);
  } else {
    shell(g, 'machined-limb-link', 0, .005, .008, width, length * .71, depth, material, .009);
    for (const y of [-length * .24, length * .24]) cylinder(g, 'link-fastener', 0, y, depth * .53, width * .14, .008, M.black, 'z');
  }
  return g;
}
const humanLegs = [];
for (const side of [-1, 1]) {
  const hip = group(`hip-${side}`, humanoid); actuator(hip, 'hip-motor', 0, 0, 0, .087, .115);
  const upper = limb(humanoid, `thigh-${side}`, .405, .148, .17, M.white);
  const knee = group(`knee-${side}`, humanoid); actuator(knee, 'knee-actuator', 0, 0, 0, .064, .12);
  const lower = limb(humanoid, `shin-${side}`, .415, .105, .125, M.white);
  const ankle = group(`ankle-${side}`, humanoid); actuator(ankle, 'ankle-actuator', 0, 0, 0, .044, .095);
  const foot = group(`planted-foot-${side}`, humanoid);
  shell(foot, 'black-sole', 0, .032, -.035, .135, .055, .255, M.rubber, .015);
  shell(foot, 'foot-top-plate', 0, .064, -.023, .104, .047, .183, M.edge, .012);
  humanLegs.push({ side, hip, upper, knee, lower, ankle, foot, contactShadow: contactShadow(humanoid, `human-contact-${side}`, .24, .34) });
}
const dogBody = group('quadruped-body', dog);
shell(dogBody, 'black-longitudinal-chassis', 0, .54, 0, .29, .19, .64, M.joint, .025);
for (const side of [-1, 1]) {
  shell(dogBody, 'silver-side-rail', side * .149, .582, 0, .044, .15, .57, M.silver, .012);
  for (let j = 0; j < 5; j++) cylinder(dogBody, 'side-panel-screw', side * .174, .591, -.22 + .11 * j, .009, .005, M.black, 'x');
}
box(dogBody, 'top-processor', 0, .65, -.06, .16, .027, .22, M.edge);
box(dogBody, 'rear-battery-cover', 0, .651, .20, .23, .035, .17, M.silver);
for (const side of [-1, 1]) {
  box(dogBody, 'broad-silver-top-rail', side * .10, .653, -.06, .073, .028, .41, M.silver);
  box(dogBody, 'longitudinal-top-brace', side * .138, .677, -.04, .014, .018, .51, M.bright);
}
for (let i = 0; i < 7; i++) box(dogBody, 'top-cooling-fin', -.066 + i * .022, .673, -.06, .01, .02, .14, M.black);
box(dogBody, 'front-sensor-block', 0, .56, -.355, .21, .10, .065, M.black);
for (const x of [-.065, .065]) cylinder(dogBody, 'stereo-sensor', x, .569, -.392, .02, .008, M.dome, 'z');
cable(dogBody, 'exposed-back-harness', [[-.09, .66, .2], [-.095, .692, .0], [.08, .69, -.13], [.10, .63, -.24]]);
const dogLegs = [];
for (const side of [-1, 1]) for (const end of [-1, 1]) {
  const hip = group(`dog-hip-${side}-${end}`, dog);
  actuator(hip, 'large-circular-hip-motor', 0, 0, 0, .071, .092);
  const upper = limb(dog, `dog-upper-link-${side}-${end}`, .26, .05, .061, M.silver);
  const knee = group(`dog-knee-${side}-${end}`, dog);
  actuator(knee, 'knee-bearing', 0, 0, 0, .036, .047);
  const lower = limb(dog, `dog-lower-link-${side}-${end}`, .28, .038, .046, M.silver);
  const foot = group(`dog-planted-pad-${side}-${end}`, dog);
  ball(foot, 'rubber-contact-pad', 0, .021, 0, .038, .029, .046, M.rubber);
  dogLegs.push({ side, end, hip, upper, knee, lower, foot, contactShadow: contactShadow(dog, `dog-contact-${side}-${end}`, .14, .16) });
}

const path = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-.80, 0, 1.75),
  new THREE.Vector3(-1.00, 0, 1.08),
  new THREE.Vector3(-1.60, 0, -.05),
  new THREE.Vector3(-1.64, 0, -1.55),
  new THREE.Vector3(-.90, 0, -2.78),
  new THREE.Vector3(.80, 0, -2.72),
  new THREE.Vector3(1.46, 0, -2.86),
  new THREE.Vector3(1.70, 0, -3.28),
], false, 'centripetal');
path.arcLengthDivisions = 1500;
path.updateArcLengths();
const pathLength = path.getLength();
const Y = new THREE.Vector3(0, 1, 0);
let currentTime = 0, variant = '564', navigation, localJointState;
function navAt(time) {
  const p = time / END;
  const u = THREE.MathUtils.clamp(p, 0, 1);
  const position = path.getPointAt(u), tangent = path.getTangentAt(u).normalize();
  if (p < 0 || p > 1) position.addScaledVector(tangent, (p - u) * pathLength);
  return { position, yaw: Math.atan2(-tangent.x, -tangent.z), distance: p * pathLength, progress: p };
}
function footContact(time, period, offset, stance, lateral, longitudinal = 0, lift = .08) {
  const phase = time / period + offset, cycle = Math.floor(phase), f = phase - cycle;
  const contactTime = (cycle - offset) * period + stance * period / 2;
  function contact(t) {
    const n = navAt(t), q = new THREE.Quaternion().setFromAxisAngle(Y, n.yaw);
    return { p: new THREE.Vector3(lateral, 0, longitudinal).applyQuaternion(q).add(n.position), yaw: n.yaw };
  }
  const a = contact(contactTime);
  if (f < stance) return { position: a.p, yaw: a.yaw, phase: f, stance: true };
  const b = contact(contactTime + period), s = (f - stance) / (1 - stance);
  const blend = s * s * (3 - 2 * s);
  a.p.lerp(b.p, blend); a.p.y = Math.sin(Math.PI * s) * lift;
  let angle = b.yaw - a.yaw;
  angle = Math.atan2(Math.sin(angle), Math.cos(angle));
  return { position: a.p, yaw: a.yaw + angle * blend, phase: f, stance: false };
}
function setLink(object, a, b) {
  object.position.copy(a).add(b).multiplyScalar(.5);
  object.quaternion.setFromUnitVectors(Y, new THREE.Vector3().subVectors(a, b).normalize());
}
function solveLeg(a, b, l1, l2, forward) {
  const direction = new THREE.Vector3().subVectors(b, a), distance = direction.length();
  if (distance > l1 + l2 + 1e-8 || distance < Math.abs(l1 - l2)) throw new RangeError('Leg target is outside the articulated workspace');
  direction.normalize();
  const d = distance;
  const along = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const pole = new THREE.Vector3(0, 0, forward);
  pole.addScaledVector(direction, -pole.dot(direction)).normalize();
  return a.clone().addScaledVector(direction, along).addScaledVector(pole, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
}
function supportedHipHeight(target, feet, reach, maxCrouch) {
  let height = target;
  for (const { hip, ankle } of feet) {
    const horizontalSquared = (hip.x - ankle.x) ** 2 + (hip.z - ankle.z) ** 2;
    if (horizontalSquared >= reach * reach) throw new RangeError('Planted foot is beyond horizontal reach');
    height = Math.min(height, ankle.y + Math.sqrt(reach * reach - horizontalSquared));
  }
  if (target - height > maxCrouch) throw new RangeError('Navigation requires excessive body crouch');
  return height;
}
function animateHuman(time, n) {
  const period = .66, phase = time / period * Math.PI * 2;
  const bob = .012 * Math.cos(phase * 2), sway = .014 * Math.sin(phase);
  const inverse = root.quaternion.clone().invert();
  const contacts = [];
  const feet = humanLegs.map(leg => {
    const c = footContact(time, period, leg.side < 0 ? 0 : .5, .61, leg.side * .145 * humanScale, 0, .082);
    const p = c.position.clone().sub(n.position).applyQuaternion(inverse).divideScalar(humanScale);
    return { leg, c, p, hip: new THREE.Vector3(leg.side * .145 + sway, .815 + bob, 0), ankle: p.clone().add(new THREE.Vector3(0, .092, 0)) };
  });
  const hipHeight = supportedHipHeight(.815 + bob, feet, .405 + .415 - .006, .06);
  const crouch = hipHeight - (.815 + bob);
  humanBody.position.set(sway, bob + crouch, 0);
  humanBody.rotation.set(-.035, .025 * Math.sin(phase), -.022 * Math.sin(phase));
  for (const { leg, c, p, hip, ankle } of feet) {
    leg.foot.position.copy(p); leg.foot.rotation.set(0, c.yaw - n.yaw, 0);
    leg.contactShadow.group.position.set(p.x, .004 / humanScale, p.z);
    leg.contactShadow.group.rotation.y = c.yaw - n.yaw;
    leg.contactShadow.material.opacity = c.stance ? .38 : .14 * (1 - c.position.y / .082);
    hip.y = hipHeight;
    const knee = solveLeg(hip, ankle, .405, .415, -1);
    leg.hip.position.copy(hip); leg.knee.position.copy(knee); leg.ankle.position.copy(ankle);
    setLink(leg.upper, hip, knee); setLink(leg.lower, knee, ankle);
    contacts.push({ side: leg.side, phase: c.phase, stance: c.stance, worldContact: c.position.toArray(), hip: hip.toArray(), knee: knee.toArray(), ankle: ankle.toArray() });
  }
  for (const arm of arms) {
    arm.shoulder.rotation.x = .34 * Math.cos(phase + (arm.side < 0 ? 0 : Math.PI));
    arm.shoulder.rotation.z = arm.side * .055;
    arm.elbow.rotation.x = -.16 - .12 * (1 + Math.sin(phase + arm.side * Math.PI / 2));
  }
  return { bodyBob: bob, bodyCrouch: crouch, bodySway: sway, contacts, arms: arms.map(a => ({ side: a.side, shoulder: a.shoulder.rotation.toArray().slice(0, 3), elbow: a.elbow.rotation.x })) };
}
function animateDog(time, n) {
  const period = .40, phase = time / period * Math.PI * 2;
  const bob = .007 * Math.cos(phase * 2);
  const inverse = root.quaternion.clone().invert(), contacts = [];
  const feet = dogLegs.map(leg => {
    const offset = leg.side * leg.end > 0 ? 0 : .5;
    const longitudinal = leg.end < 0 ? -.243 : .225;
    const c = footContact(time, period, offset, .58, leg.side * .207 * dogScale, longitudinal * dogScale, .064);
    const p = c.position.clone().sub(n.position).applyQuaternion(inverse).divideScalar(dogScale);
    return { leg, c, p, hip: new THREE.Vector3(leg.side * .204, .470 + bob, leg.end * .25), ankle: p.clone().add(new THREE.Vector3(0, .032, 0)) };
  });
  const hipHeight = supportedHipHeight(.470 + bob, feet, .26 + .28 - .006, .10);
  const crouch = hipHeight - (.470 + bob);
  dogBody.position.set(0, bob + crouch, 0); dogBody.rotation.set(.013 * Math.sin(phase * 2), 0, .012 * Math.sin(phase));
  for (const { leg, c, p, hip, ankle } of feet) {
    leg.foot.position.copy(p); leg.foot.rotation.set(0, c.yaw - n.yaw, 0);
    leg.contactShadow.group.position.set(p.x, .004 / dogScale, p.z);
    leg.contactShadow.group.rotation.y = c.yaw - n.yaw;
    leg.contactShadow.material.opacity = c.stance ? .40 : .16 * (1 - c.position.y / .064);
    hip.y = hipHeight;
    const knee = solveLeg(hip, ankle, .26, .28, 1);
    leg.hip.position.copy(hip); leg.knee.position.copy(knee);
    setLink(leg.upper, hip, knee); setLink(leg.lower, knee, ankle);
    contacts.push({ side: leg.side, end: leg.end, phase: c.phase, stance: c.stance, worldContact: c.position.toArray(), hip: hip.toArray(), knee: knee.toArray(), ankle: ankle.toArray() });
  }
  return { bodyBob: bob, bodyCrouch: crouch, contacts };
}
function cameraAt(time) {
  const u = time / END, s = u * u * (3 - 2 * u);
  const lateral = -1.55 * Math.sin(Math.PI * u) ** 2 + .50 * s;
  camera.position.set(1.57 + lateral, 2.04 + .025 * s, 4.72 - .30 * s);
  camera.fov = 42;
  camera.setViewOffset(W, H, 0, 222, W, H);
  camera.lookAt(-.35 + .15 * s, camera.position.y, -.91 - .24 * s);
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
}
function seek(time) {
  if (!Number.isFinite(time)) throw new TypeError('seek requires a finite numeric time');
  currentTime = THREE.MathUtils.clamp(time, 0, END);
  const n = navAt(currentTime);
  root.position.copy(n.position); root.rotation.set(0, n.yaw, 0); root.updateMatrixWorld(true);
  const h = animateHuman(currentTime, n), d = animateDog(currentTime, n);
  humanoid.visible = variant === '564'; dog.visible = variant === '563';
  localJointState = variant === '564' ? h : d;
  navigation = { position: n.position.toArray(), yaw: n.yaw, traveledDistance: n.distance, pathProgress: n.progress, start: path.points[0].toArray(), goal: path.points[path.points.length - 1].toArray() };
  cameraAt(currentTime); scene.updateMatrixWorld(true); renderer.render(scene, camera);
}
function getCameraState() {
  return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
}
const geometryDefinitions = new Map(), materialDefinitions = new Map();
function definition(value, cache) {
  if (!cache.has(value.uuid)) cache.set(value.uuid, value.toJSON());
  return cache.get(value.uuid);
}
function objectState(o, includeDefinitions) {
  const state = { name: o.name, type: o.type, position: o.position.toArray(), quaternion: o.quaternion.toArray(), scale: o.scale.toArray(), visible: o.visible, castShadow: o.castShadow, receiveShadow: o.receiveShadow, renderOrder: o.renderOrder };
  if (o.geometry) state.geometry = includeDefinitions ? definition(o.geometry, geometryDefinitions) : { type: o.geometry.type, parameters: o.geometry.parameters };
  if (o.isInstancedMesh) state.instances = { count: o.count, matrix: Array.from(o.instanceMatrix.array), colors: o.instanceColor ? Array.from(o.instanceColor.array) : null };
  if (o.material) state.material = (Array.isArray(o.material) ? o.material : [o.material]).map(m => ({ definition: definition(m, materialDefinitions), currentOpacity: m.opacity, currentColor: m.color?.toArray() ?? null, visible: m.visible }));
  if (o.isLight) {
    state.light = { color: o.color.toArray(), intensity: o.intensity, distance: o.distance ?? null, decay: o.decay ?? null, groundColor: o.groundColor?.toArray() ?? null, castShadow: o.castShadow, shadow: o.shadow?.toJSON() ?? null, target: o.target ? { position: o.target.position.toArray(), quaternion: o.target.quaternion.toArray() } : null };
  }
  if (o.isCamera) state.camera = { ...getCameraState(), near: o.near, far: o.far, aspect: o.aspect, view: { ...o.view }, projectionMatrix: o.projectionMatrix.toArray() };
  state.children = o.children.filter(c => c !== robotRig).map(c => objectState(c, includeDefinitions));
  return state;
}
window.reconstruction = {
  pause() {},
  seek,
  setVariant(id) {
    if (id !== '564' && id !== '563') throw new RangeError('Variant must be "564" or "563"');
    variant = id; seek(currentTime);
  },
  getCameraState,
  getNavigationState: () => structuredClone(navigation),
  getInvariantState: () => ({
    navigation: structuredClone(navigation), scene: objectState(scene, true),
    rendering: { width: W, height: H, toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, outputColorSpace: renderer.outputColorSpace, shadowMapType: renderer.shadowMap.type, background: scene.background.toArray(), environment: { source: 'procedural-shared-room-cubemap', capturePosition: [.4, 1.7, 2.7], resolution: 256, intensity: scene.environmentIntensity } },
  }),
  getEditedObjectState: () => ({ variant, rigType: variant === '564' ? 'humanoid' : 'quadruped', root: objectState(robotRig, true), localJoints: structuredClone(localJointState) }),
  getCollisionState: () => {
    const hits = [], active = variant === '564' ? humanoid : dog;
    const obstacles = [island, leftBench, nearStool, farStool, ...door.children.filter(object => object.isMesh)].map(object => ({ name: object.name, bounds: new THREE.Box3().setFromObject(object, true) }));
    active.traverse(object => {
      if (!object.isMesh || object.name === 'procedural-foot-contact-shadow') return;
      const bounds = new THREE.Box3().setFromObject(object, true);
      for (const obstacle of obstacles) if (bounds.intersectsBox(obstacle.bounds)) hits.push({ robotPart: object.name, obstacle: obstacle.name });
    });
    return { method: 'conservative per-mesh world-space AABB against shared furniture and individual exit components', hits };
  },
  metadata: { width: W, height: H, fps: FPS, frames: FRAMES, duration: FRAMES / FPS },
};
// All glossy reflections come from this procedural room, never from an image asset.
const environmentTarget = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
const environmentCamera = new THREE.CubeCamera(.1, 30, environmentTarget);
environmentCamera.position.set(.4, 1.7, 2.7);
robotRig.visible = false;
environmentCamera.update(renderer, scene);
robotRig.visible = true;
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromCubemap(environmentTarget.texture).texture;
scene.environmentIntensity = .65;
environmentTarget.dispose();
pmrem.dispose();
seek(0);
