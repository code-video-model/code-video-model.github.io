import * as THREE from '../vendor/three.module.js';
import { rng, plaidTexture } from './textures.js';

const sphere = new THREE.SphereGeometry(1, 24, 18);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
const v = (x, y, z) => new THREE.Vector3(x, y, z);
const material = (color, roughness = .9) => new THREE.MeshStandardMaterial({ color, roughness });
const skin = material('#b48e73');
const skinLight = material('#c6a385');
const shoe = material('#141510', .65);
const trousers = material('#152123');
const seamMat = material('#1b2827');

function ellipsoid(root, name, mat, p, scale) {
  const m = new THREE.Mesh(sphere, mat);
  m.name = name; m.position.set(...p); m.scale.set(...scale);
  m.castShadow = true; m.receiveShadow = true; root.add(m);
  return m;
}

function bone(root, name, a, b, radiusA, radiusB, mat) {
  const av = v(...a), bv = v(...b), delta = bv.clone().sub(av);
  const g = radiusA === radiusB ? cylinder : new THREE.CylinderGeometry(radiusB, radiusA, 1, 16);
  const m = new THREE.Mesh(g, mat);
  m.name = name; m.position.copy(av.add(bv).multiplyScalar(.5));
  m.scale.set(radiusA === radiusB ? radiusA : 1, delta.length(), radiusA === radiusB ? radiusA : 1);
  m.quaternion.setFromUnitVectors(v(0, 1, 0), delta.normalize());
  m.castShadow = true; m.receiveShadow = true; root.add(m);
  return m;
}

function curve(root, name, points, radius, mat) {
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => v(...p))), 24, radius, 6, false);
  const m = new THREE.Mesh(g, mat); m.name = name; root.add(m); return m;
}

function jacket(root, coat, long, female) {
  const pts = long
    ? [[0, .65], [.24, .65], [.255, .69], [.22, .96], [.19, 1.2], [.245, 1.42], [.23, 1.49], [.12, 1.53], [0, 1.54]]
    : [[0, .88], [.205, .88], [.225, .93], [.215, 1.13], [.265, 1.39], [.24, 1.47], [.125, 1.52], [0, 1.53]];
  const geo = new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), 48);
  const m = new THREE.Mesh(geo, coat);
  m.scale.z = female ? .68 : .72; m.name = 'tailored coat torso';
  m.castShadow = m.receiveShadow = true; root.add(m);
  return m;
}

function head(root, female, older, reading, seed) {
  const h = new THREE.Group(); h.name = 'head with sculpted facial features';
  h.position.set(0, 1.59, .012);
  if (reading) h.rotation.x = .37;
  root.add(h);
  const s = older ? skinLight : skin;
  ellipsoid(h, 'face', s, [0, .058, .009], [.098, .13, .094]);
  ellipsoid(h, 'jaw', s, [0, -.001, .035], [.073, .061, .067]);
  ellipsoid(h, 'nose', s, [0, .055, .104], [.018, .032, .034]);
  ellipsoid(h, 'ear L', s, [-.099, .05, .003], [.018, .035, .023]);
  ellipsoid(h, 'ear R', s, [.099, .05, .003], [.018, .035, .023]);
  const hair = material(older ? female ? '#938c79' : '#625b4f' : '#514134');
  ellipsoid(h, 'hair cap', hair, [0, .11, -.024], [.105, .093, .102]);
  const r = rng(seed);
  for (let i = 0; i < (female ? 65 : 40); i++) {
    const a = r() * Math.PI * 2, py = r() * (female && !older ? .24 : .13);
    if (Math.cos(a) > .4 && py > .055) continue;
    const rad = .087 + r() * .023;
    ellipsoid(h, 'layered hair lock', hair, [Math.sin(a) * rad, .155 - py, Math.cos(a) * rad - .025],
      [.010 + r() * .010, female ? .050 : .018, .014]);
  }
  const dark = material('#292c28');
  for (const x of [-.039, .039]) {
    ellipsoid(h, 'eye', dark, [x, .078, .093], [.008, .004, .003]);
    curve(h, 'eyeglass rim', [[x - .025, .096, .096], [x + .024, .096, .103], [x + .024, .059, .107], [x - .025, .059, .101], [x - .025, .096, .096]], .0025, dark);
  }
  bone(h, 'glasses bridge', [-.014, .081, .106], [.014, .081, .106], .0025, .0025, dark);
}

export function person({ name, type, position, rotation, scale = 1, seed = 1 }) {
  const root = new THREE.Group(); root.name = name;
  root.position.set(...position); root.rotation.y = rotation; root.scale.setScalar(scale);
  if (type === 'older-woman') root.scale.x *= .87;
  const reading = type === 'reader', plaid = type === 'plaid';
  const female = reading || plaid || type === 'older-woman';
  const older = !reading && !plaid;
  const coat = plaid ? new THREE.MeshStandardMaterial({ map: plaidTexture(), color: '#cec4b0', roughness: 1 })
    : material(reading ? '#343a24' : '#101c1b');
  jacket(root, coat, reading || plaid, female);
  bone(root, 'neck', [0, 1.48, 0], [0, 1.59, 0], .061, .061, skin);
  ellipsoid(root, 'raised collar', coat, [0, 1.497, -.022], [.135, .075, .105]);
  for (const side of [-1, 1]) {
    const x = side * .105, z = side > 0 ? .032 : -.027;
    bone(root, 'trouser thigh', [x, .94, z], [x + side * .01, .51, z], .087, .069, trousers);
    ellipsoid(root, 'knee', trousers, [x + side * .01, .51, z], [.071, .09, .073]);
    bone(root, 'trouser shin', [x + side * .01, .51, z], [x + side * .03, .12, z + .013], .069, .05, trousers);
    ellipsoid(root, 'leather boot', shoe, [x + side * .03, .051, z + .053], [.066, .056, .12]);
    const shoulder = [side * .225, 1.415, 0];
    const elbow = reading ? [side * .22, 1.16, .14] : [side * .29, 1.17, .005];
    const wrist = reading ? [side * .085, 1.34, .31] : plaid ? [side * .20, 1.1, .20] : [side * .23, .94, .08];
    ellipsoid(root, 'coat shoulder', coat, shoulder, [.094, .117, .10]);
    bone(root, 'upper sleeve', shoulder, elbow, .089, .077, coat);
    ellipsoid(root, 'sleeve elbow', coat, elbow, [.084, .09, .084]);
    bone(root, 'fore sleeve', elbow, wrist, .077, .054, coat);
    ellipsoid(root, 'hand', skin, [wrist[0], wrist[1] - .017, wrist[2] + .021], [.039, .06, .034]);
    if (reading) {
      for (let f = 0; f < 4; f++) bone(root, 'fingers holding leaflet',
        [wrist[0] + (f - 1.5) * .011, wrist[1], wrist[2] + .025],
        [wrist[0] + (f - 1.5) * .011, wrist[1] + .032, wrist[2] + .055], .007, .006, skin);
    }
  }
  if (!reading && !plaid) {
    for (let y = .93; y < 1.43; y += .075) {
      const rad = .218 + (y - .93) * .065;
      const points = [];
      for (let i = 0; i <= 48; i++) {
        const a = i / 48 * Math.PI * 2;
        points.push([Math.sin(a) * rad, y + .006 * Math.cos(a * 4), Math.cos(a) * rad * .728]);
      }
      curve(root, 'quilted jacket horizontal stitching', points, .004, seamMat);
    }
  }
  if (reading) {
    const bagmat = material('#192119', .77);
    ellipsoid(root, 'backpack body', bagmat, [0, 1.20, -.229], [.188, .25, .093]);
    ellipsoid(root, 'backpack lower pocket', bagmat, [0, 1.04, -.302], [.13, .106, .042]);
    for (const side of [-1, 1]) {
      curve(root, 'backpack shoulder strap', [[side * .13, .98, -.20], [side * .175, 1.35, -.205], [side * .155, 1.50, -.095], [side * .18, 1.44, .088], [side * .165, 1.21, .15]], .022, bagmat);
    }
    curve(root, 'backpack pocket piping', [[-.12, 1.03, -.328], [-.10, 1.13, -.326], [.10, 1.13, -.326], [.12, 1.03, -.328]], .003, material('#656553'));
    const leaflet = new THREE.Group(); leaflet.name = 'open folded gallery leaflet';
    leaflet.position.set(0, 1.365, .35); leaflet.rotation.x = -.48;
    const paperMat = material('#f3f0e6');
    const paper = new THREE.Mesh(new THREE.BoxGeometry(.18, .23, .003), paperMat);
    leaflet.add(paper); root.add(leaflet);
    const ink = material('#7b8581');
    for (let i = 0; i < 13; i++) {
      const l = new THREE.Mesh(new THREE.BoxGeometry(i < 3 ? .145 : .155, .0025, .001), ink);
      l.position.set(0, .10 - i * .015, -.003); leaflet.add(l);
    }
    const scarf = material('#59584e');
    curve(root, 'knit scarf', [[-.11, 1.50, .03], [0, 1.49, .108], [.10, 1.51, .03]], .045, scarf);
    curve(root, 'folded olive hood rim', [[-.16, 1.46, -.04], [-.15, 1.50, -.11], [0, 1.48, -.16], [.15, 1.50, -.11], [.16, 1.46, -.04]], .027, coat);
    curve(root, 'coat center seam', [[0, .68, .155], [0, .93, .155], [0, 1.20, .134]], .003, material('#454831'));
  }
  head(root, female, older, reading, seed);
  return root;
}
