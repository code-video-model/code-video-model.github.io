import * as THREE from '../vendor/three.module.js';

const W = 960, H = 540, END = 123 / 24;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c2bcae');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .86;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(53, W / H, 0.05, 70);
camera.setViewOffset(W, H, 0, 70, W, H);
const world = new THREE.Group();
world.name = 'shared-hospital';
scene.add(world);
const editedRoot = new THREE.Group();
editedRoot.name = 'robotRig';
scene.add(editedRoot);

function material(color, roughness = 0.7, metalness = 0) { window.__bfTrace?.add(24);
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
const M = {
  tile: material('#b5aa96'), grout: material('#c3bcac'), floor: material('#a39b8c', .54),
  ceiling: material('#d0cec3'), trim: material('#79786e', .48),
  rail: material('#d9d4c0', .4), black: material('#141a1c', .48, .35),
  silver: material('#b4b9b6', .39, .72), bright: material('#ced2ce', .3, .72),
  steel: material('#7c8580', .38, .75), rubber: material('#242929', .86),
  cable: material('#282d2c', .66), blue: material('#467bb4'),
  navy: material('#233f56'), teal: material('#528e90'), skin: material('#bf8f70'),
  hair: material('#302820'), white: material('#dddcd0'), paper: material('#e2e2d8'),
  wood: material('#8c806b'), desk: material('#958a76'), red: material('#a23527'),
  screen: new THREE.MeshStandardMaterial({ color: '#3b8bb0', emissive: '#21536f', emissiveIntensity: .4, roughness: .3 }),
  lamp: new THREE.MeshStandardMaterial({ color: '#fffef0', emissive: '#fff8df', emissiveIntensity: 1.4 }),
  led: new THREE.MeshStandardMaterial({ color: '#74bfa9', emissive: '#4fa890', emissiveIntensity: .65 })
};
function mesh(geo, mat, parent, name) { window.__bfTrace?.add(41);
  const o = new THREE.Mesh(geo, mat);
  o.castShadow = true; o.receiveShadow = true;
  if (name) o.name = name;
  parent.add(o); return o;
}
function box(parent, size, pos, mat, name) { window.__bfTrace?.add(47);
  const o = mesh(new THREE.BoxGeometry(...size), mat, parent, name);
  o.position.set(...pos); return o;
}
function beveledBox(parent, size, pos, mat, name, bevel = .018) { window.__bfTrace?.add(51);
  const [w, h, d] = size;
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + bevel, -h / 2 + bevel);
  shape.lineTo(w / 2 - bevel, -h / 2 + bevel);
  shape.lineTo(w / 2 - bevel, h / 2 - bevel);
  shape.lineTo(-w / 2 + bevel, h / 2 - bevel);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * bevel, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, steps: 1 });
  geometry.translate(0, 0, -d / 2 + bevel);
  const o = mesh(geometry, mat, parent, name); o.position.set(...pos); return o;
}
function sphere(parent, radius, pos, mat, scale = [1, 1, 1], name) { window.__bfTrace?.add(63);
  const o = mesh(new THREE.SphereGeometry(radius, 20, 14), mat, parent, name);
  o.position.set(...pos); o.scale.set(...scale); return o;
}
function cylinder(parent, r1, r2, length, pos, mat, name) { window.__bfTrace?.add(67);
  const o = mesh(new THREE.CylinderGeometry(r1, r2, length, 20), mat, parent, name);
  o.position.set(...pos); return o;
}
function rod(parent, a, b, radius, mat, name) { window.__bfTrace?.add(71);
  const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b);
  const o = cylinder(parent, radius, radius, av.distanceTo(bv), [0, 0, 0], mat, name);
  o.position.copy(av).add(bv).multiplyScalar(.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bv.sub(av).normalize());
  return o;
}
function wire(parent, points, radius = .012, mat = M.cable) { window.__bfTrace?.add(78);
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 20, radius, 6, false), mat, parent);
}
function group(parent, name, pos = [0, 0, 0]) { window.__bfTrace?.add(81);
  const g = new THREE.Group(); g.name = name; g.position.set(...pos); parent.add(g); return g;
}
const hash = n => { const v = Math.sin(n * 137.17 + 41.9) * 43758.5453; return v - Math.floor(v); };

box(world, [17, .16, 23], [1, -.09, -4], M.floor, 'vinyl-floor');
// Sparse, low-contrast geometric flecks keep every visible surface procedural.
const fleckGeo = new THREE.PlaneGeometry(.009, .004);
const flecks = new THREE.InstancedMesh(fleckGeo, material('#918d81', .52), 16000);
flecks.name = 'vinyl-flecks';
flecks.receiveShadow = true;
const dummy = new THREE.Object3D();
for (let i = 0; i < 16000; i++) {
  dummy.position.set(-5 + hash(i * 4) * 14, -.007, -14 + hash(i * 4 + 1) * 22);
  dummy.rotation.set(-Math.PI / 2, 0, hash(i * 4 + 2) * 6);
  dummy.scale.setScalar(.4 + hash(i * 4 + 3) * 1.5);
  dummy.updateMatrix(); flecks.setMatrixAt(i, dummy.matrix);
}
world.add(flecks);
for (let x = -4; x <= 8; x += 1.2) box(world, [.006, .001, 21], [x, -.005, -3], material('#a5a092'), 'floor-seam');
for (let z = -13; z <= 7; z += 1.2) box(world, [13, .001, .006], [2, -.004, z], material('#a5a092'), 'floor-seam');

function tiledWall(name, length, height, origin, yaw = 0) { window.__bfTrace?.add(103);
  const wall = group(world, name, origin); wall.rotation.y = yaw;
  box(wall, [length, height, .14], [length / 2, height / 2, -.08], M.grout);
  const sx = .62, sy = .59;
  for (let x = 0, ix = 0; x < length; x += sx, ix++) {
    for (let y = 0, iy = 0; y < height; y += sy, iy++) {
      const w = Math.min(sx, length - x), h = Math.min(sy, height - y);
      const shade = .965 + .055 * hash(ix + iy * 15 + length * 7);
      const mat = M.tile.clone(); mat.color.multiplyScalar(shade);
      box(wall, [w - .006, h - .006, .018], [x + w / 2, y + h / 2, .002], mat);
    }
  }
  box(wall, [length, .105, .034], [length / 2, .052, .022], M.trim);
  return wall;
}
// Main corridor and its right-hand perpendicular branch are one connected floor.
tiledWall('corridor-right-near', 4.5, 2.95, [1.65, 0, -4.5], -Math.PI / 2);
tiledWall('corridor-right-far', 7.3, 2.95, [1.65, 0, -13], -Math.PI / 2);
tiledWall('corridor-left', 14.5, 2.95, [-3.0, 0, 1.5], Math.PI / 2);
tiledWall('branch-corner-wall', 2.05, 2.95, [1.65, 0, 0]);
tiledWall('branch-door-pier', .65, 2.95, [4.60, 0, 0]);
tiledWall('branch-end-wall', 5.85, 2.95, [6.15, 0, 0]);
tiledWall('foreground-left-jamb', .26, 2.95, [-2.2, 0, 2.1], Math.PI / 2);
box(world, [.17, 2.34, .12], [-2.15, 1.17, 1.88], M.trim, 'foreground-door-frame');
box(world, [.10, 2.25, .65], [-2.21, 1.125, 1.55], M.black, 'foreground-dark-recess');
tiledWall('foreground-right-pier', .64, 2.95, [7.15, 0, 2.3]);
function doorwayX(name, x, width = .9, z = 0, label = '201') { window.__bfTrace?.add(129);
  const g = group(world, name, [x, 0, z]);
  box(g, [width + .16, .67, .18], [width / 2, 2.615, -.035], M.tile);
  for (const a of [-.035, width + .035]) box(g, [.072, 2.31, .16], [a, 1.155, .025], M.trim);
  box(g, [width + .14, .09, .16], [width / 2, 2.285, .025], M.trim);
  const recess = new THREE.MeshBasicMaterial({ color: '#252820' });
  box(g, [width, 2.2, .06], [width / 2, 1.1, -1.2], recess);
  box(g, [.06, 2.2, 1.2], [-.04, 1.1, -.6], new THREE.MeshBasicMaterial({ color: '#4d5045' }));
  box(g, [.06, 2.2, 1.2], [width + .04, 1.1, -.6], new THREE.MeshBasicMaterial({ color: '#3b3e34' }));
  box(g, [width, .04, 1.2], [width / 2, .01, -.6], new THREE.MeshBasicMaterial({ color: '#636356' }));
  box(g, [width, .04, 1.2], [width / 2, 2.23, -.6], recess);
  const door = group(g, 'open-door', [.03, 0, -.06]);
  door.rotation.y = 1.55;
  box(door, [width - .04, 2.16, .042], [(width - .04) / 2, 1.1, 0], material('#666452'));
  rod(door, [width - .14, 1, .04], [width - .29, 1, .04], .012, M.steel);
  box(g, [.13, .19, .015], [width + .18, 1.56, .036], material('#475953'), label);
  for (let i = 0; i < 3; i++) box(g, [.07, .007, .005], [width + .18, 1.6 - i * .035, .046], M.white);
}
doorwayX('doorway-201', 3.70, .9, 0, '201');
doorwayX('doorway-202', 5.25, .9, 0, '202');
// Repeated door recesses provide recognizable depth down the long corridor.
for (const z of [-2.7, -5.7, -8.6, -11]) {
  const g = group(world, 'corridor-door-' + z, [1.617, 0, z]);
  g.rotation.y = -Math.PI / 2;
  box(g, [.78, 2.17, .035], [0, 1.09, 0], material('#625e4e'));
  box(g, [.68, 2.09, .014], [0, 1.05, .028], material('#817c68'));
  for (const x of [-.42, .42]) box(g, [.055, 2.25, .08], [x, 1.125, .03], M.trim);
  box(g, [.89, .07, .08], [0, 2.24, .03], M.trim);
  sphere(g, .023, [-.25, 1, .075], M.steel);
}
function rail(parent, length, position, yaw = 0) { window.__bfTrace?.add(159);
  const g = group(parent, 'wall-handrail', position); g.rotation.y = yaw;
  box(g, [length, .13, .07], [0, .88, 0], M.rail);
  const r = cylinder(g, .026, .026, length, [0, .965, .024], M.rail);
  r.rotation.z = Math.PI / 2;
  for (let x = -length / 2 + .12; x < length / 2; x += .8) box(g, [.04, .11, .08], [x, .84, -.06], M.trim);
}
rail(world, 1.55, [1.57, 0, -.94], -Math.PI / 2);
rail(world, 1.45, [1.57, 0, -4.15], -Math.PI / 2);
rail(world, 3.1, [1.57, 0, -9], -Math.PI / 2);
rail(world, 2.2, [-2.90, 0, .1], Math.PI / 2);
rail(world, 1.22, [2.33, 0, .095]);

function poster(name, pos, yaw, width = .45, height = .66, medical = false) { window.__bfTrace?.add(172);
  const g = group(world, name, pos); g.rotation.y = yaw;
  box(g, [width + .045, height + .045, .035], [0, 0, 0], M.trim);
  box(g, [width, height, .01], [0, 0, .025], M.paper);
  if (medical) {
    for (let i = 0; i < 9; i++) box(g, [width * (.45 + .3 * hash(i)), .006, .004], [0, height * .33 - i * .045, .033], M.steel);
    box(g, [.13, .018, .004], [0, height * .42, .033], M.blue);
  } else {
    const art = [material('#a8b7b7'), material('#91a7af'), material('#c4cabc'), material('#798d97')];
    for (let i = 0; i < 19; i++) {
      const o = sphere(g, .065 + .03 * hash(i), [-width * .3 + hash(i + 32) * width * .6, -height * .34 + hash(i + 77) * height * .68, .033], art[i % 4], [.6, 1.9, .035]);
      o.castShadow = false;
    }
  }
}
poster('pale-art-near', [1.59, 1.55, -.65], -Math.PI / 2);
poster('medical-notice', [1.59, 1.57, -1.34], -Math.PI / 2, .28, .48, true);
poster('pale-art-far', [1.59, 1.55, -2.02], -Math.PI / 2, .4, .63);
poster('rear-notice', [-.7, 1.5, -9.8], 0, .6, .5, true);

box(world, [12, .12, 20], [2, 3.02, -3.5], M.ceiling, 'acoustic-ceiling');
for (let x = -3.1; x < 8; x += .62) box(world, [.012, .016, 19], [x, 2.947, -3.5], M.rail);
for (let z = -13; z < 6; z += .62) box(world, [11.5, .016, .012], [2, 2.947, z], M.rail);
for (const [x, z] of [[-.8, 2.6], [-.8, -.7], [-.8, -4.0], [-.8, -7.3], [-.8, -10.6], [4, 2.1], [6.1, 1.1]]) {
  box(world, [1.16, .036, .55], [x, 2.926, z], M.trim, 'fluorescent-frame');
  box(world, [1.1, .023, .5], [x, 2.9, z], M.lamp, 'fluorescent-diffuser');
}
for (const [x, z] of [[.35, 1.8], [3, 1.8], [.4, -4.8], [-2, -1.5]]) {
  box(world, [.43, .028, .38], [x, 2.924, z], M.trim, 'ceiling-vent');
  for (let n = 0; n < 8; n++) box(world, [.37, .02, .019], [x, 2.902, z - .16 + n * .042], M.ceiling);
}
// Distant portal, quiet clinical signs and the recessed nurse station.
box(world, [4.65, .5, .2], [-.67, 2.7, -9.7], M.rail, 'distant-header');
box(world, [.5, .17, .04], [-.3, 2.45, -9.56], material('#a85345'), 'exit-sign');
for (let i = 0; i < 4; i++) box(world, [.035, .09, .008], [-.43 + i * .085, 2.45, -9.53], M.white);
const stationStart = world.children.length;
box(world, [1.63, .94, 2.55], [-2.25, .47, -.8], M.desk, 'nurse-desk');
box(world, [1.81, .075, 2.72], [-2.23, .975, -.8], M.white, 'countertop');
box(world, [1.55, .73, .035], [-2.24, .46, .495], material('#706b5d'), 'desk-front-panel');
box(world, [.55, 1.10, .85], [-1.65, .55, -1.9], M.desk, 'counter-raised');
box(world, [.66, .05, .95], [-1.65, 1.12, -1.9], M.white);
function monitor(name, pos, yaw) { window.__bfTrace?.add(213);
  const g = group(world, name, pos); g.rotation.y = yaw;
  box(g, [.26, .027, .19], [0, 0, 0], M.black);
  box(g, [.04, .2, .04], [0, .1, 0], M.black);
  box(g, [.45, .32, .045], [0, .32, 0], M.black);
  box(g, [.401, .267, .009], [0, .32, .029], M.screen);
  for (let i = 0; i < 6; i++) box(g, [.15 + .04 * (i % 3), .007, .002], [.07, .40 - i * .03, .035], M.paper);
  box(g, [.07, .23, .003], [-.15, .32, .035], material('#80aec0'));
  box(g, [.39, .019, .135], [0, .006, .28], M.black);
  for (let i = 0; i < 4; i++) box(g, [.34, .005, .009], [0, .017, .23 + i * .026], M.steel);
}
monitor('desk-monitor-front', [-2.10, 1.025, .05], .35);
monitor('desk-monitor-rear', [-2.19, 1.03, -1.52], .2);
box(world, [.13, .2, .13], [-1.65, 1.11, -.55], M.white, 'pen-cup');
for (let i = 0; i < 5; i++) rod(world, [-1.70 + i * .025, 1.1, -.55], [-1.70 + i * .025, 1.36, -.53], .006, M.blue);
for (let i = 0; i < 3; i++) box(world, [.31, .018, .22], [-1.63, 1.033 + i * .02, -1.08], i % 2 ? M.blue : M.paper);
box(world, [1.95, .91, .05], [-2.03, 1.85, -2.52], M.trim, 'staff-whiteboard-frame');
box(world, [1.86, .82, .015], [-2.03, 1.85, -2.48], M.paper, 'staff-whiteboard');
for (let i = 0; i < 13; i++) box(world, [1.80, .006, .002], [-2.03, 1.48 + i * .058, -2.465], M.steel);
for (let i = 0; i < 9; i++) box(world, [.005, .79, .002], [-2.9 + i * .22, 1.85, -2.463], M.steel);
for (let i = 0; i < 35; i++) box(world, [.045 + hash(i) * .06, .008, .003], [-2.82 + (i % 8) * .22, 2.13 - Math.floor(i / 8) * .115, -2.459], M.blue);
poster('station-notice', [-2.66, 1.7, -2.4], 0, .32, .4, true);
for (const object of world.children.slice(stationStart)) {
  object.position.z -= .7;
  object.position.x += .05;
}

function human(name, pos, yaw, scrub, skinColor, pose = 'standing') { window.__bfTrace?.add(240);
  const g = group(world, name, pos); g.rotation.y = yaw;
  const skin = material(skinColor), cloth = scrub;
  const seated = pose === 'seated', pelvisY = seated ? .61 : .86;
  sphere(g, .23, [0, pelvisY + .28, 0], cloth, [.88, 1.3, .60]);
  box(g, [.38, .27, .21], [0, pelvisY + .06, 0], cloth);
  cylinder(g, .057, .067, .11, [0, pelvisY + .58, 0], skin);
  sphere(g, .12, [0, pelvisY + .75, 0], skin, [.79, 1.16, .86]);
  sphere(g, .121, [0, pelvisY + .79, -.024], M.hair, [.85, .87, .87]);
  sphere(g, .06, [0, pelvisY + .81, -.115], M.hair, [1, 1, .8]);
  sphere(g, .022, [0, pelvisY + .735, .104], skin, [.65, 1, 1.35]);
  for (const s of [-1, 1]) {
    sphere(g, .019, [s * .094, pelvisY + .75, 0], skin, [.7, 1.2, .7]);
    sphere(g, .008, [s * .039, pelvisY + .77, .095], M.hair, [1, .6, .3]);
    const hip = [s * .105, pelvisY - .01, 0];
    const knee = [s * .105, seated ? .43 : .46, seated ? .29 : s * .035];
    const ankle = [s * .11, .075, seated ? .28 : s * -.025];
    rod(g, hip, knee, .083, cloth);
    rod(g, knee, ankle, .064, cloth);
    sphere(g, .08, [s * .11, .055, ankle[2] + .044], M.white, [.86, .6, 1.6]);
    const shoulder = [s * .23, pelvisY + .44, 0];
    const elbow = [s * .27, pelvisY + .18, .09];
    const wrist = [s * .15, pelvisY + .23, .27];
    rod(g, shoulder, [s * .255, pelvisY + .3, .04], .09, cloth);
    rod(g, [s * .255, pelvisY + .3, .04], elbow, .053, skin);
    rod(g, elbow, wrist, .044, skin);
    sphere(g, .05, wrist, skin, [.65, 1, .55]);
  }
  box(g, [.053, .071, .007], [-.105, pelvisY + .40, .123], M.paper, 'staff-id');
  const neckline = mesh(new THREE.ConeGeometry(.075, .10, 3), skin, g);
  neckline.position.set(0, pelvisY + .51, .126);
  neckline.rotation.z = Math.PI;
  box(g, [.078, .07, .008], [.115, pelvisY + .32, .143], cloth, 'scrub-pocket');
  if (pose === 'clipboard') {
    const clip = group(g, 'clipboard', [0, pelvisY + .28, .30]);
    clip.rotation.x = .72;
    box(clip, [.35, .018, .28], [0, 0, 0], M.wood);
    box(clip, [.29, .005, .215], [0, .013, 0], M.paper);
    box(clip, [.085, .009, .026], [0, .019, -.123], M.steel);
    for (let i = 0; i < 5; i++) box(clip, [.20, .002, .004], [0, .017, -.06 + i * .026], M.steel);
  }
  return g;
}
human('clipboard-nurse', [-.98, 0, -.16], .13, M.blue, '#b28a70', 'clipboard');
human('staff-standing-navy', [-1.64, 0, -2.66], .75, M.navy, '#bb927c');
human('staff-teal', [-2.43, 0, -2.5], -.3, M.teal, '#cda68b');
human('staff-seated', [-2.60, 0, -.7], 1.03, M.navy, '#bd997e', 'seated');
human('staff-far', [-2.75, 0, -2.86], .4, M.white, '#785b47');
const chair = group(world, 'station-chair', [-2.60, 0, -.7]);
cylinder(chair, .04, .04, .45, [0, .25, 0], M.black);
box(chair, [.44, .09, .42], [0, .5, 0], M.black);
box(chair, [.43, .4, .07], [0, .77, -.2], M.black);
for (let i = 0; i < 5; i++) {
  const a = i * Math.PI * 2 / 5;
  rod(chair, [0, .11, 0], [.29 * Math.cos(a), .06, .29 * Math.sin(a)], .018, M.black);
}

const hemi = new THREE.HemisphereLight('#edf1ec', '#b9b4a7', 1.45);
hemi.name = 'ambient-ceiling'; scene.add(hemi);
const key = new THREE.DirectionalLight('#fff6df', 1.15);
key.name = 'fluorescent-key'; key.position.set(-.3, 9, 2); key.target.position.set(1, 0, 0);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: .5, far: 22 });
key.shadow.normalBias = .012; key.shadow.bias = -.00015; key.shadow.radius = 5;
scene.add(key, key.target);
const fill = new THREE.DirectionalLight('#e6edf0', .48); fill.name = 'hall-fill'; fill.position.set(4, 3, -6); scene.add(fill);
for (const [x, z] of [[-.8, -.5], [3.8, 1.4], [-.8, -5]]) {
  const light = new THREE.PointLight('#fff2d6', 14, 8, 2);
  light.name = 'fluorescent-bounce-' + x + '-' + z;
  light.position.set(x, 2.75, z); scene.add(light);
}
for (const object of world.children) {
  if (object.position.y >= 2.89) object.castShadow = false;
}
M.ceiling.emissive.set('#b1ab9b'); M.ceiling.emissiveIntensity = .12;
const reflectionRoom = new THREE.Scene();
const reflectionShell = new THREE.Mesh(
  new THREE.BoxGeometry(16, 9, 18),
  new THREE.MeshBasicMaterial({ color: '#b0aca2', side: THREE.BackSide })
);
reflectionRoom.add(reflectionShell);
for (const [size, position, color] of [
  [[6, .03, 2], [-2, 4, 1], '#fffdf4'],
  [[3, 4, .03], [3, 0, 7], '#dedfda'],
  [[.03, 5, 5], [-7, 0, 0], '#666b69'],
  [[4, .03, 2], [4, 3.9, -4], '#f8f9f7']
]) {
  const card = new THREE.Mesh(new THREE.BoxGeometry(...size), new THREE.MeshBasicMaterial({ color }));
  card.position.set(...position); reflectionRoom.add(card);
}
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(reflectionRoom, .05).texture;
scene.environmentIntensity = .65;
pmrem.dispose();

function joint(parent, name, radius, pos, axis = 'x') { window.__bfTrace?.add(335);
  const g = group(parent, name, pos);
  const hub = cylinder(g, radius, radius, radius * 1.30, [0, 0, 0], M.black);
  if (axis === 'x') hub.rotation.z = Math.PI / 2; else hub.rotation.x = Math.PI / 2;
  for (const s of [-1, 1]) {
    const p = axis === 'x' ? [s * radius * .7, 0, 0] : [0, 0, s * radius * .7];
    const cap = cylinder(g, radius * .79, radius * .79, .017, p, M.bright);
    if (axis === 'x') cap.rotation.z = Math.PI / 2; else cap.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      const bp = axis === 'x' ? [p[0] * 1.07, Math.cos(a) * radius * .54, Math.sin(a) * radius * .54] : [Math.cos(a) * radius * .54, Math.sin(a) * radius * .54, p[2] * 1.07];
      sphere(g, .007, bp, M.steel);
    }
  }
  return g;
}
function segment(parent, name, length, radius, armored = true) { window.__bfTrace?.add(351);
  const g = group(parent, name);
  cylinder(g, radius * .55, radius * .55, length, [0, -length / 2, 0], M.black);
  if (armored) {
    const shell = sphere(g, radius, [0, -length * .47, -.008], M.silver, [1, length * .39 / radius, .8]);
    shell.name = name + '-cast-shell';
    rod(g, [radius * .65, -length * .13, -.035], [radius * .65, -length * .76, -.035], .012, M.bright);
    for (const y of [-length * .16, -length * .73]) sphere(g, .012, [0, y, radius * .82], M.black);
  } else {
    for (const s of [-1, 1]) rod(g, [s * radius * .45, -.015, 0], [s * radius * .45, -length + .02, 0], .018, M.steel);
  }
  wire(g, [[radius * .75, -.025, 0], [radius * 1.1, -length * .5, -.02], [radius * .65, -length + .02, 0]], .009);
  return g;
}
function humanoid() { window.__bfTrace?.add(365);
  const rig = group(editedRoot, 'humanoid568');
  const body = group(rig, 'body');
  sphere(body, .18, [0, 1.05, 0], M.silver, [1.15, .65, .65]);
  box(body, [.19, .15, .17], [0, 1.18, .005], M.black);
  for (const s of [-1, 1]) wire(body, [[s * .1, 1.10, -.07], [s * .14, 1.20, -.14], [s * .10, 1.34, -.12]], .02);
  for (const s of [-1, 1]) {
    rod(body, [s * .09, 1.13, .03], [s * .12, 1.35, .04], .025, M.bright);
    wire(body, [[s * .17, 1.38, -.07], [s * .20, 1.18, -.07], [s * .16, 1.04, -.08]], .009, M.red);
    sphere(body, .125, [s * .258, 1.64, -.01], M.silver, [1.06, .60, .95]);
    box(body, [.06, .22, .10], [s * .196, 1.45, -.04], M.silver);
  }
  sphere(body, .26, [0, 1.43, 0], M.black, [.83, .92, .47]);
  beveledBox(body, [.32, .34, .09], [0, 1.45, -.118], M.silver, 'back-plate');
  beveledBox(body, [.27, .29, .038], [0, 1.45, -.176], M.bright, 'brushed-back-panel', .01);
  for (const x of [-.13, .13]) for (const y of [1.32, 1.58]) sphere(body, .013, [x, y, -.201], M.steel);
  for (let i = 0; i < 9; i++) box(body, [.18, .006, .006], [0, 1.48 + i * .009, -.2], M.silver);
  cylinder(body, .065, .06, .15, [0, 1.72, 0], M.black);
  wire(body, [[-.08, 1.63, 0], [-.10, 1.74, -.035], [-.06, 1.82, -.025]], .017);
  sphere(body, .14, [0, 1.9, .005], M.black, [.86, 1.05, .85]);
  sphere(body, .14, [0, 1.915, -.014], M.silver, [.91, .90, .76]);
  box(body, [.164, .065, .045], [0, 1.919, .104], M.black, 'optical-face');
  for (const s of [-1, 1]) sphere(body, .019, [s * .047, 1.924, .131], M.led);
  box(body, [.067, .04, .012], [0, 1.89, -.133], M.black, 'rear-head-sensor');
  for (const s of [-1, 1]) joint(body, 'temple-' + s, .066, [s * .113, 1.9, 0]);
  const legs = [], arms = [];
  for (const s of [-1, 1]) {
    const hip = joint(rig, 'hip-' + s, .105, [s * .13, 1.01, 0]);
    const upper = segment(hip, 'thigh-' + s, .52, .091);
    const knee = joint(upper, 'knee-' + s, .069, [0, -.52, 0]);
    const lower = segment(knee, 'shin-' + s, .51, .066);
    const ankle = joint(lower, 'ankle-' + s, .048, [0, -.51, 0]);
    const foot = group(ankle, 'foot-' + s);
    sphere(foot, .10, [0, -.022, .045], M.silver, [.72, .36, 1.60]);
    box(foot, [.14, .037, .28], [0, -.05, .037], M.rubber);
    legs.push({ s, hip, upper, knee, lower, ankle, foot, a: .52, b: .51, offset: [s * .13, 0] });
    const shoulder = joint(body, 'shoulder-' + s, .105, [s * .26, 1.58, 0]);
    const up = segment(shoulder, 'upper-arm-' + s, .30, .068);
    const elbow = joint(up, 'elbow-' + s, .065, [0, -.30, 0]);
    const fore = segment(elbow, 'forearm-' + s, .29, .055);
    const hand = group(fore, 'hand-' + s, [0, -.32, 0]);
    box(hand, [.072, .10, .036], [0, 0, 0], M.silver);
    for (let f = 0; f < 4; f++) {
      rod(hand, [-.025 + f * .017, -.045, .003], [-.025 + f * .017, -.10, .028], .008, M.steel);
      sphere(hand, .011, [-.025 + f * .017, -.073, .016], M.black);
    }
    arms.push({ s, shoulder, elbow });
  }
  return { rig, body, legs, arms, kind: 'humanoid', base: 1.00 };
}
function quadruped() { window.__bfTrace?.add(415);
  const rig = group(editedRoot, 'quadruped567');
  const body = group(rig, 'body');
  beveledBox(body, [.43, .22, 1.15], [0, .76, 0], M.silver, 'horizontal-chassis', .03);
  sphere(body, .2, [0, .72, 0], M.black, [1.12, .67, 2.7]);
  box(body, [.38, .055, 1.06], [0, .9, -.025], M.bright, 'dorsal-plate');
  for (const s of [-1, 1]) {
    rod(body, [s * .15, .945, -.49], [s * .15, .945, .44], .017, M.steel);
    box(body, [.019, .15, .85], [s * .227, .78, -.025], M.bright);
    for (let i = 0; i < 7; i++) box(body, [.009, .024, .035], [s * .240, .83, -.28 + i * .063], M.black);
  }
  cylinder(body, .07, .09, .09, [0, .97, .47], M.black);
  beveledBox(body, [.28, .20, .25], [0, 1.085, .50], M.silver, 'sensor-head');
  box(body, [.225, .10, .04], [0, 1.09, .645], M.black);
  for (const s of [-1, 1]) {
    sphere(body, .042, [s * .064, 1.10, .669], M.steel, [1, 1, .5]);
    sphere(body, .025, [s * .064, 1.10, .686], M.black, [1, 1, .25]);
    joint(body, 'sensor-ear-' + s, .063, [s * .147, 1.08, .49]);
  }
  box(body, [.16, .023, .17], [0, 1.192, .49], M.black, 'lidar-cap');
  wire(body, [[0, .9, .32], [.07, .96, .39], [.08, 1.015, .47]], .016);
  box(body, [.12, .105, .028], [0, .78, .59], M.black);
  box(body, [.035, .055, .006], [0, .78, .61], M.led);
  const legs = [];
  for (const z of [-.46, .46]) for (const s of [-1, 1]) {
    const hip = joint(rig, 'hip-' + s + '-' + z, .10, [s * .28, .78, z]);
    const upper = segment(hip, 'upper-leg-' + s + '-' + z, .40, .066);
    const knee = joint(upper, 'knee-' + s + '-' + z, .058, [0, -.40, 0]);
    const lower = segment(knee, 'lower-leg-' + s + '-' + z, .42, .046, false);
    const ankle = group(lower, 'paw-' + s + '-' + z, [0, -.42, 0]);
    sphere(ankle, .055, [0, -.015, .012], M.rubber, [.8, .65, 1.2]);
    legs.push({ s, z, hip, upper, knee, lower, ankle, a: .40, b: .42, offset: [s * .28, z] });
  }
  return { rig, body, legs, kind: 'quadruped', base: .715 };
}
const rigs = { '568': humanoid(), '567': quadruped() };
let variant = '568', time = 0;
const start = new THREE.Vector3(.73, 0, 2.1);
const straight = .74, radius = .65, arc = Math.PI * radius / 2, tail = 3.47;
const total = straight + arc + tail;
function distanceAt(t) { window.__bfTrace?.add(455);
  const duration = 4.85, ramp = .45, vmax = total / (duration - ramp);
  t = THREE.MathUtils.clamp(t, 0, duration);
  if (t < ramp) return vmax * t * t / (2 * ramp);
  if (t <= duration - ramp) return vmax * (t - ramp / 2);
  return total - vmax * (duration - t) ** 2 / (2 * ramp);
}
function pathAt(distance) { window.__bfTrace?.add(462);
  const d = THREE.MathUtils.clamp(distance, 0, total);
  let x = start.x, z = start.z, yaw = Math.PI;
  if (d < straight) z -= d;
  else if (d < straight + arc) {
    const a = (d - straight) / radius;
    x += radius * (1 - Math.cos(a)); z -= straight + radius * Math.sin(a);
    yaw = Math.PI - a;
  } else {
    x += radius + d - straight - arc; z -= straight + radius; yaw = Math.PI / 2;
  }
  return { position: [x, 0, z], yaw };
}
function navigation(t) { window.__bfTrace?.add(475);
  const distance = distanceAt(t), pose = pathAt(distance);
  return { ...pose, distance, progress: distance / total, start: start.toArray(), goal: pathAt(total).position };
}
function embodimentYaw(kind, distance) { window.__bfTrace?.add(479);
  return kind === 'quadruped' ? .48 * (1 - THREE.MathUtils.smoothstep(distance, 0, 1.1)) : 0;
}
function footholdPose(kind, distance) { window.__bfTrace?.add(482);
  const pose = pathAt(distance);
  pose.yaw += embodimentYaw(kind, distance);
  return pose;
}
function localToGround(pose, offset, height) { window.__bfTrace?.add(487);
  return new THREE.Vector3(
    pose.position[0] + Math.cos(pose.yaw) * offset[0] + Math.sin(pose.yaw) * offset[1],
    height,
    pose.position[2] - Math.sin(pose.yaw) * offset[0] + Math.cos(pose.yaw) * offset[1]
  );
}
function footTarget(t, leg, kind, nav) { window.__bfTrace?.add(494);
  const cycles = kind === 'humanoid' ? 7 : 8;
  const stride = total / cycles;
  const phaseOffset = kind === 'humanoid' ? (leg.s === -1 ? 0 : .5) : ((leg.s === -1) === (leg.z > 0) ? 0 : .5);
  const phase = (nav.distance >= total ? cycles : nav.distance / stride) + phaseOffset;
  const cycle = Math.floor(phase), u = phase - cycle, stance = .59;
  const stepDistance = (cycle - phaseOffset) * stride;
  const previousPose = footholdPose(kind, stepDistance + stride * .30);
  const nextPose = footholdPose(kind, stepDistance + stride * 1.30);
  const height = kind === 'humanoid' ? .063 : .045;
  const prev = localToGround(previousPose, leg.offset, height);
  const next = localToGround(nextPose, leg.offset, height);
  const p = prev.clone();
  let yaw = previousPose.yaw;
  if (u > stance) {
    const a = (u - stance) / (1 - stance);
    const smooth = a * a * (3 - 2 * a);
    p.lerp(next, smooth); p.y += Math.sin(Math.PI * a) * (kind === 'humanoid' ? .13 : .105);
    yaw = THREE.MathUtils.lerp(previousPose.yaw, nextPose.yaw, smooth);
  }
  const local = p.clone().sub(new THREE.Vector3(...nav.position));
  const bodyYaw = nav.yaw + embodimentYaw(kind, nav.distance);
  local.applyAxisAngle(new THREE.Vector3(0, 1, 0), -bodyYaw);
  return { local, world: p, yaw: yaw - bodyYaw, stance: u <= stance };
}
const down = new THREE.Vector3(0, -1, 0);
function solveLeg(leg, hipPosition, target, bendSign) { window.__bfTrace?.add(520);
  const foot = target.local;
  leg.hip.position.copy(hipPosition);
  const delta = foot.clone().sub(hipPosition);
  const distance = Math.min(delta.length(), leg.a + leg.b - .004);
  const dir = delta.normalize();
  let pole = new THREE.Vector3(0, 0, bendSign);
  pole.addScaledVector(dir, -pole.dot(dir)).normalize();
  const along = (leg.a * leg.a - leg.b * leg.b + distance * distance) / (2 * distance);
  const knee = hipPosition.clone().addScaledVector(dir, along).addScaledVector(pole, Math.sqrt(Math.max(0, leg.a * leg.a - along * along)));
  leg.hip.quaternion.setFromUnitVectors(down, knee.clone().sub(hipPosition).normalize());
  const localLower = foot.clone().sub(knee).normalize().applyQuaternion(leg.hip.quaternion.clone().invert());
  leg.knee.quaternion.setFromUnitVectors(down, localLower);
  leg.ankle.quaternion.copy(leg.hip.quaternion).multiply(leg.knee.quaternion).invert()
    .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), target.yaw));
  leg.contact = target;
}
function animateRig(rig, t, nav) { window.__bfTrace?.add(537);
  rig.rig.rotation.y = embodimentYaw(rig.kind, nav.distance);
  const moving = Math.sin(Math.PI * THREE.MathUtils.clamp(t / 4.85, 0, 1)) ** .25;
  const phase = nav.progress * (rig.kind === 'humanoid' ? 7 : 8) * Math.PI * 2;
  const bob = Math.cos(phase * 2) * .010 * moving;
  const targets = rig.legs.map(leg => footTarget(t, leg, rig.kind, nav));
  let hipHeight = rig.base + bob;
  for (let i = 0; i < rig.legs.length; i++) {
    const leg = rig.legs[i], p = targets[i].local;
    const horizontalSquared = (p.x - leg.offset[0]) ** 2 + (p.z - leg.offset[1]) ** 2;
    hipHeight = Math.min(hipHeight, p.y + Math.sqrt(Math.max(.01, (leg.a + leg.b - .012) ** 2 - horizontalSquared)));
  }
  rig.body.position.y = hipHeight - rig.base;
  rig.body.rotation.z = rig.kind === 'humanoid' ? Math.sin(phase) * .025 * moving : 0;
  for (let i = 0; i < rig.legs.length; i++) {
    const leg = rig.legs[i];
    const hip = new THREE.Vector3(leg.offset[0], hipHeight, leg.offset[1]);
    solveLeg(leg, hip, targets[i], rig.kind === 'humanoid' ? 1 : -1);
  }
  if (rig.arms) for (const arm of rig.arms) {
    arm.shoulder.rotation.x = Math.sin(phase + (arm.s < 0 ? 0 : Math.PI)) * .36 * moving;
    arm.shoulder.rotation.z = -arm.s * .055;
    arm.elbow.rotation.x = -.15 - Math.max(0, Math.sin(phase + arm.s * Math.PI / 2)) * .14 * moving;
  }
}
function cameraAt(t) { window.__bfTrace?.add(562);
  const u = THREE.MathUtils.smoothstep(t, 0, END);
  camera.position.set(-.55 + 1.3 * u, 1.65, 5.08 - .48 * u);
  camera.lookAt(3.35 - .70 * u, 1.65, -5.5 + 1.5 * u);
  camera.updateMatrixWorld(true);
}
function seek(t) { window.__bfTrace?.add(568);
  if (!Number.isFinite(t)) throw new TypeError('Time must be finite');
  time = THREE.MathUtils.clamp(t, 0, END);
  const nav = navigation(time);
  editedRoot.position.set(...nav.position);
  editedRoot.rotation.set(0, nav.yaw, 0);
  for (const [id, rig] of Object.entries(rigs)) {
    rig.rig.visible = id === variant;
    animateRig(rig, time, nav);
  }
  cameraAt(time);
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}
function cameraState() { window.__bfTrace?.add(582);
  return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
}
function objectState(object) { window.__bfTrace?.add(585);
  const state = {
    name: object.name, type: object.type, position: object.position.toArray(),
    quaternion: object.quaternion.toArray(), scale: object.scale.toArray(), visible: object.visible
  };
  if (object.geometry) {
    state.geometry = { type: object.geometry.type, parameters: object.geometry.parameters };
    if (!object.geometry.parameters) state.geometry.attributes = Object.fromEntries(Object.entries(object.geometry.attributes).map(([k, a]) => [k, Array.from(a.array)]));
  }
  if (object.material) {
    const definition = m => ({ type: m.type, color: m.color?.getHex(), roughness: m.roughness, metalness: m.metalness, emissive: m.emissive?.getHex(), emissiveIntensity: m.emissiveIntensity, opacity: m.opacity, transparent: m.transparent, side: m.side });
    state.material = Array.isArray(object.material) ? object.material.map(definition) : definition(object.material);
  }
  if (object.isInstancedMesh) state.instances = Array.from(object.instanceMatrix.array);
  if (object.isLight) state.light = { color: object.color.getHex(), intensity: object.intensity, distance: object.distance, decay: object.decay, groundColor: object.groundColor?.getHex(), castShadow: object.castShadow, shadow: object.shadow ? { mapSize: object.shadow.mapSize.toArray(), bias: object.shadow.bias, normalBias: object.shadow.normalBias, radius: object.shadow.radius, camera: object.shadow.camera.toJSON().object } : null };
  state.children = object.children.map(objectState);
  return state;
}
window.reconstruction = {
  pause() {},
  seek,
  renderFrame(id, t) {
    if (!(id === '568' || id === '567')) throw new RangeError('Variant must be "568" or "567"');
    variant = id; seek(t);
  },
  setVariant(id) {
    if (!(id === '568' || id === '567')) throw new RangeError('Variant must be "568" or "567"');
    variant = id; seek(time);
  },
  getCameraState: cameraState,
  getNavigationState: () => navigation(time),
  getContactState: () => rigs[variant].legs.map(leg => ({
    name: leg.hip.name, stance: leg.contact.stance,
    target: leg.contact.world.toArray(),
    actual: leg.ankle.getWorldPosition(new THREE.Vector3()).toArray(),
    bodyOffset: rigs[variant].body.position.y
  })),
  getInvariantState: () => ({
    navigation: navigation(time), camera: cameraState(), projection: { view: camera.view, near: camera.near, far: camera.far },
    world: scene.children.filter(o => o !== editedRoot).map(objectState),
    render: { exposure: renderer.toneMappingExposure, toneMapping: renderer.toneMapping, environmentIntensity: scene.environmentIntensity, background: scene.background.getHex(), width: W, height: H, proceduralReflectionRoom: objectState(reflectionRoom) }
  }),
  getEditedObjectState: () => ({ variant, embodiment: rigs[variant].kind, groundRoot: { position: editedRoot.position.toArray(), quaternion: editedRoot.quaternion.toArray() }, subtree: objectState(rigs[variant].rig) })
};
seek(0);
