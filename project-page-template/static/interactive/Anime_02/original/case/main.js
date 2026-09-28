import * as THREE from '../vendor/three.module.js';

const W = 1024, H = 512, DURATION = 123 / 24;
const motionEnabled = new URLSearchParams(location.search).get('motion') === '1';
const scene = new THREE.Scene();
scene.background = new THREE.Color('#91b39e');
scene.fog = new THREE.Fog('#a0bcb0', 11, 24);
const camera = new THREE.PerspectiveCamera(26, W / H, 0.04, 40);
const renderer = new THREE.WebGLRenderer({antialias: true, alpha: false, preserveDrawingBuffer: true});
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(W, H);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight('#fffaf1', '#7b8390', 2.3));
const sun = new THREE.DirectionalLight('#fff0d2', 2.0);
sun.position.set(-3.5, 6, 4);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left: -5, right: 5, top: 5, bottom: -5, near: 0.2, far: 16});
sun.shadow.bias = -0.00035;
sun.shadow.normalBias = 0.004;
scene.add(sun);

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = x => {const t = clamp(x); return t * t * (3 - 2 * t);};
const mix = THREE.MathUtils.lerp;
const up = V(0, 1, 0);
let randomState = 934113;
function random() {
  randomState = (Math.imul(randomState, 1664525) + 1013904223) >>> 0;
  return randomState / 4294967296;
}
const palette = new Uint8Array([95, 169, 224, 255]);
const gradient = new THREE.DataTexture(palette, 4, 1, THREE.RedFormat);
gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
gradient.needsUpdate = true;
const toon = color => new THREE.MeshToonMaterial({color, gradientMap: gradient});
const materials = {
  skin: toon('#f8dec8'), brown: toon('#885f50'), skirt: toon('#88634f'),
  hem: new THREE.MeshToonMaterial({color: '#d9ab62', gradientMap: gradient,
    polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1}),
  white: toon('#ece9df'), dark: toon('#514955'),
  collar: toon('#eeefde'), tie: toon('#624656'), red: toon('#b8575e'),
  chair: new THREE.MeshPhongMaterial({color: '#7b8477', shininess: 45}),
  gold: new THREE.MeshPhongMaterial({color: '#e4ad40', specular: '#fff5cf', shininess: 95}),
  silver: new THREE.MeshPhongMaterial({color: '#d1dbe3', specular: '#ffffff', shininess: 110}),
  goldInside: toon('#ad6631'), silverInside: toon('#9a93ac'),
};
const sphere = new THREE.SphereGeometry(1, 24, 18);
const cylinder = new THREE.CylinderGeometry(1, 1, 1, 14);
const box = new THREE.BoxGeometry(1, 1, 1);
function mesh(geometry, material, parent, position, scale) {
  const object = new THREE.Mesh(geometry, material);
  if (position) object.position.copy(position);
  if (scale) object.scale.copy(scale);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
const ellipsoid = (parent, material, p, scale) => mesh(sphere, material, parent, p, scale);
const block = (parent, material, p, scale) => mesh(box, material, parent, p, scale);
function bone(parent, material, a, b, radius, endRadius = radius) {
  const geometry = new THREE.CylinderGeometry(endRadius, radius, 1, 14);
  const object = mesh(geometry, material, parent);
  setBone(object, a, b);
  return object;
}
function setBone(object, a, b) {
  const difference = b.clone().sub(a);
  object.position.copy(a).add(b).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(up, difference.clone().normalize());
  object.scale.set(1, difference.length(), 1);
}
function curve(parent, points, radius, material, closed = false) {
  const path = new THREE.CatmullRomCurve3(points, closed, 'centripetal');
  return mesh(new THREE.TubeGeometry(path, Math.max(24, points.length * 7), radius, 8, closed), material, parent);
}
function outline(object, amount = 1.018) {
  const shell = new THREE.Mesh(object.geometry, new THREE.MeshBasicMaterial({color: '#4c3944', side: THREE.BackSide}));
  shell.scale.setScalar(amount);
  shell.castShadow = false;
  object.add(shell);
}

const courtyard = new THREE.Group();
scene.add(courtyard);
block(courtyard, toon('#adaf9d'), V(0, -0.035, -0.25), V(13, 0.07, 3.3));
block(courtyard, toon('#9bb65b'), V(0, -0.032, 5), V(16, 0.06, 9.6));
const wallGeometry = new THREE.PlaneGeometry(6.5, 3.7, 12, 8);
const colors = [];
const positions = wallGeometry.attributes.position;
for (let i = 0; i < positions.count; i++) {
  const x = positions.getX(i), y = positions.getY(i);
  const color = new THREE.Color('#929e86').lerp(new THREE.Color('#9d8f9c'), clamp((x + 0.3) / 3));
  color.multiplyScalar(0.97 + 0.025 * Math.sin(x * 1.7 + y * 2.3));
  colors.push(color.r, color.g, color.b);
}
wallGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
mesh(wallGeometry, new THREE.MeshLambertMaterial({vertexColors: true, side: THREE.DoubleSide}),
  courtyard, V(1.18, 1.85, -0.71));
block(courtyard, toon('#737d6b'), V(0.8, 0.10, -0.60), V(7.2, 0.20, 0.18));
block(courtyard, toon('#bbc6a6'), V(-1.48, 1.8, -0.48), V(0.42, 3.6, 0.46));
block(courtyard, toon('#737360'), V(-1.48, 0.085, -0.43), V(0.48, 0.17, 0.55));
for (const x of [2.85, 3.25, 3.75]) {
  block(courtyard, toon('#796176'), V(x, 1.7, -0.53), V(0.06, 3.4, 0.10));
}
block(courtyard, toon('#70727e'), V(3.75, 1.4, -0.20), V(0.6, 2.8, 0.52));
block(courtyard, toon('#a39c99'), V(3.1, 0.34, 0.04), V(0.34, 0.045, 0.30));
for (const x of [2.96, 3.24]) for (const z of [-0.07, 0.15]) {
  bone(courtyard, toon('#946d7b'), V(x, 0.025, z), V(x, 0.34, z), 0.018);
}
const portico = new THREE.Group();
portico.position.set(-3.8, 0, -2.1);
courtyard.add(portico);
const wood = toon('#738776'), roof = toon('#647b88');
block(portico, roof, V(0, 2.22, 0), V(4.3, 0.13, 1.5));
for (let x = -1.9; x <= 2; x += 0.40) {
  bone(portico, toon('#9baead'), V(x, 2.25, -0.8), V(x, 2.25, 0.80), 0.06);
}
for (const x of [-1.8, -0.6, 0.6, 1.8]) {
  block(portico, wood, V(x, 1.06, 0.5), V(0.07, 2.12, 0.075));
  block(portico, wood, V(x, 1.06, -0.6), V(0.06, 2.12, 0.06));
}
for (const y of [0.1, 0.42, 1.55, 2.10]) {
  block(portico, wood, V(0, y, -0.59), V(4.2, 0.06, 0.07));
}
const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), toon('#347f60'), 130);
const dummy = new THREE.Object3D();
for (let i = 0; i < 130; i++) {
  dummy.position.set(-5 + random() * 3.3, 2.2 + random() * 1.8, -3.9 + random() * 1.0);
  dummy.scale.set(0.12 + random() * 0.38, 0.10 + random() * 0.3, 0.13 + random() * 0.35);
  dummy.rotation.set(random(), random() * 6.28, random());
  dummy.updateMatrix();
  leaves.setMatrixAt(i, dummy.matrix);
  leaves.setColorAt(i, new THREE.Color().setHSL(0.40 + random() * 0.06, 0.45, 0.24 + random() * 0.18));
}
courtyard.add(leaves);
const blade = new THREE.BufferGeometry();
blade.setAttribute('position', new THREE.Float32BufferAttribute([
  -0.025, 0, 0, 0.025, 0, 0, -0.011, 0.58, 0.02,
  0.025, 0, 0, 0.012, 0.57, 0.02, -0.011, 0.58, 0.02,
  -0.011, 0.58, 0.02, 0.012, 0.57, 0.02, 0.065, 1, 0.05,
], 3));
blade.computeVertexNormals();
const grass = new THREE.InstancedMesh(blade,
  new THREE.MeshLambertMaterial({color: '#ffffff', side: THREE.DoubleSide}), 50000);
for (let i = 0; i < grass.count; i++) {
  const x = (random() - 0.5) * 12, z = 0.36 + random() * 8;
  const centralView = Math.abs(x) < 1.55;
  const height = centralView
    ? 0.025 + random() * (z < 2 ? 0.045 : z < 4.8 ? 0.08 : 0.115)
    : 0.07 + random() * (z < 1 ? 0.07 : 0.28);
  dummy.position.set(x, 0, z);
  dummy.scale.set(0.35 + random() * 0.45, height, 1);
  dummy.rotation.set((random() - 0.5) * 0.30, random() * Math.PI * 2, (random() - 0.5) * 0.5);
  dummy.updateMatrix();
  grass.setMatrixAt(i, dummy.matrix);
  grass.setColorAt(i, new THREE.Color().setHSL(0.205 + random() * 0.075, 0.45 + random() * 0.24, 0.38 + random() * 0.20));
}
grass.receiveShadow = true;
courtyard.add(grass);

function makeChair(position, angle) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = angle;
  courtyard.add(group);
  block(group, toon('#788c73'), V(0, 0.46, 0), V(0.34, 0.035, 0.37));
  for (const x of [-0.145, 0.145]) for (const z of [-0.155, 0.145]) {
    bone(group, materials.chair, V(x, 0.02, z), V(x, z < 0 ? 0.84 : 0.45, z), 0.0105);
  }
  block(group, toon('#7f8a72'), V(0, 0.77, -0.157), V(0.31, 0.105, 0.020));
  for (const x of [-0.145, 0.145]) bone(group, materials.chair, V(x, 0.20, -0.155), V(x, 0.20, 0.145), 0.009);
  return group;
}

function makeHorn(parent, silver = false) {
  const group = new THREE.Group();
  const metal = silver ? materials.silver : materials.gold;
  const inside = silver ? materials.silverInside : materials.goldInside;
  parent.add(group);
  const profile = [
    [0.024, 0], [0.025, 0.10], [0.029, 0.24], [0.035, 0.33],
    [0.047, 0.39], [0.075, 0.435], [0.119, 0.465], [0.125, 0.473],
    [0.115, 0.471], [0.072, 0.441], [0.042, 0.396], [0.030, 0.34],
  ].map(([r, y]) => new THREE.Vector2(r, y));
  const bell = mesh(new THREE.LatheGeometry(profile, 40), metal, group, V(-0.125, 0.14, 0.223));
  bell.rotation.x = silver ? 0.14 : 0.10;
  const cavity = mesh(new THREE.CircleGeometry(0.032, 32), inside, bell, V(0, 0.348, 0));
  cavity.rotation.x = -Math.PI / 2;
  curve(group, [
    V(-0.125, 0.19, 0.228), V(-0.15, 0.060, 0.236), V(-0.06, 0.017, 0.262),
    V(0.075, 0.030, 0.265), V(0.115, 0.112, 0.268), V(0.099, 0.340, 0.238),
  ], 0.023, metal);
  curve(group, [
    V(0.095, 0.34, 0.24), V(0.064, 0.40, 0.21), V(0.038, 0.465, 0.16), V(0.022, 0.481, 0.107),
  ], 0.010, metal);
  bone(group, metal, V(0.022, 0.479, 0.099), V(0.022, 0.479, 0.123), 0.015);
  for (let i = 0; i < 3; i++) {
    const x = -0.038 + i * 0.043;
    bone(group, metal, V(x, 0.155, 0.298), V(x, 0.295, 0.298), 0.013);
    bone(group, materials.silver, V(x, 0.295, 0.298), V(x, 0.320, 0.298), 0.005);
    ellipsoid(group, metal, V(x, 0.320, 0.298), V(0.014, 0.006, 0.014));
    curve(group, [V(x, 0.19, 0.29), V(x, 0.18, 0.335), V(x, 0.245, 0.335), V(x, 0.25, 0.29)], 0.007, metal);
  }
  return {group, bell};
}

function hairStrand(parent, points, width, longHair) {
  const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 16, width, 7, false);
  const values = [];
  for (let i = 0; i < geometry.attributes.position.count; i++) {
    const y = geometry.attributes.position.getY(i);
    const color = new THREE.Color(longHair ? '#693a36' : '#71352e')
      .lerp(new THREE.Color(longHair ? '#ab7747' : '#d99540'), clamp((0.66 - y) / (longHair ? 0.55 : 0.29)));
    values.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(values, 3));
  const object = mesh(geometry, new THREE.MeshToonMaterial({vertexColors: true, gradientMap: gradient}), parent);
  outline(object, 1.035);
}

function makeGirl(position, angle, longHair = false) {
  const group = new THREE.Group();
  group.position.copy(position);
  group.rotation.y = angle;
  scene.add(group);
  const hip = new THREE.Group();
  const torso = new THREE.Group();
  group.add(hip);
  hip.add(torso);
  const bodyGeometry = new THREE.LatheGeometry([
    new THREE.Vector2(0.12, 0.00), new THREE.Vector2(0.14, 0.10),
    new THREE.Vector2(0.155, 0.24), new THREE.Vector2(0.165, 0.34),
    new THREE.Vector2(0.11, 0.395),
  ], 24);
  const body = mesh(bodyGeometry, materials.brown, torso, V(0, 0, 0), V(1, 1, 0.62));
  outline(body);
  block(torso, materials.collar, V(0, 0.364, -0.075), V(0.31, 0.036, 0.10));
  for (const s of [-1, 1]) curve(torso,
    [V(s * 0.15, 0.373, 0.025), V(s * 0.10, 0.350, 0.098), V(0, 0.265, 0.118)],
    0.018, materials.collar);
  ellipsoid(torso, materials.tie, V(0, 0.281, 0.13), V(0.028, 0.035, 0.018));
  const neck = bone(torso, materials.skin, V(0, 0.383, 0), V(0, 0.458, 0.004), 0.036);
  const head = new THREE.Group();
  head.position.y = 0.435;
  torso.add(head);
  const face = ellipsoid(head, materials.skin, V(0, 0.106, 0.011), V(0.120, 0.146, 0.100));
  outline(face, 1.016);
  const hairCap = mesh(new THREE.SphereGeometry(0.145, 28, 18, 0, Math.PI * 2, 0, Math.PI * 0.54),
    toon(longHair ? '#774c3b' : '#7e3d2f'), head, V(0, 0.117, -0.006), V(1, 1.03, 0.87));
  outline(hairCap);
  for (const s of [-1, 1]) {
    ellipsoid(head, materials.skin, V(s * 0.113, 0.096, 0), V(0.025, 0.045, 0.018));
    const eye = ellipsoid(head, materials.white, V(s * 0.049, 0.116, 0.097), V(0.035, 0.025, 0.010));
    ellipsoid(head, toon(longHair ? '#429991' : '#a16b39'), V(s * 0.047, 0.115, 0.105), V(0.016, 0.022, 0.006));
    ellipsoid(head, toon('#302b39'), V(s * 0.047, 0.117, 0.110), V(0.0075, 0.016, 0.0035));
    ellipsoid(head, materials.white, V(s * 0.045 - 0.004, 0.126, 0.113), V(0.005, 0.007, 0.002));
    curve(head, [V(s * 0.079, 0.129, 0.1), V(s * 0.050, 0.142, 0.105), V(s * 0.022, 0.133, 0.106)],
      0.0032, toon('#47313c'));
    eye.rotation.z = -s * 0.08;
  }
  ellipsoid(head, materials.skin, V(0, 0.085, 0.111), V(0.012, 0.019, 0.018));
  curve(head, [V(-0.018, 0.042, 0.097), V(0, 0.038, 0.105), V(0.018, 0.042, 0.097)], 0.002, toon('#a36863'));
  const hair = new THREE.Group();
  hair.position.y = -0.435;
  head.add(hair);
  for (let i = 0; i <= 13; i++) {
    const a = Math.PI + i / 13 * Math.PI;
    const x = Math.cos(a) * 0.122, z = Math.sin(a) * 0.103 - 0.01;
    const end = longHair ? 0.19 + 0.02 * Math.sin(i) : 0.40 + 0.016 * Math.sin(i * 1.8);
    hairStrand(hair, [V(x * 0.6, 0.681, z * 0.6), V(x, 0.555, z),
      V(x * 1.05, end + 0.050, z), V(x * (longHair ? 1.05 : 1.10), end, z + (longHair ? 0.01 : 0.03))],
    longHair ? 0.026 : 0.030, longHair);
  }
  for (let i = 0; i < 7; i++) {
    const x = -0.10 + i * 0.032;
    hairStrand(hair, [V(x - 0.025, 0.681, 0.032), V(x, 0.627, 0.112),
      V(x + 0.025, 0.602 + 0.012 * Math.cos(i * 1.5), 0.105)], 0.022, longHair);
  }
  const horn = makeHorn(torso, longHair);
  const shoulderA = V(-0.161, 0.352, 0.00), elbowA = V(-0.190, 0.172, 0.115), handA = V(-0.080, 0.105, 0.260);
  const shoulderB = V(0.161, 0.352, 0.00), elbowB = V(0.195, 0.208, 0.104), handB = V(0.074, 0.298, 0.295);
  for (const [shoulder, elbow, hand] of [[shoulderA, elbowA, handA], [shoulderB, elbowB, handB]]) {
    bone(torso, materials.brown, shoulder, elbow, 0.061, 0.052);
    ellipsoid(torso, materials.brown, elbow, V(0.055, 0.055, 0.055));
    const cuff = elbow.clone().lerp(hand, 0.88);
    bone(torso, materials.brown, elbow, cuff, 0.051, 0.039);
    bone(torso, materials.white, cuff, hand, 0.04, 0.039);
    ellipsoid(torso, materials.skin, hand, V(0.039, 0.033, 0.029));
    for (let j = 0; j < 4; j++) {
      const p = hand.clone().add(V((j - 1.5) * 0.011, -0.015, 0.02));
      bone(torso, materials.skin, p, p.clone().add(V(0.009, -0.026, 0.009)), 0.006);
    }
  }
  const skirtGeometry = new THREE.BufferGeometry();
  const skirtVertices = new Float32Array(36 * 6 * 3);
  skirtGeometry.setAttribute('position', new THREE.BufferAttribute(skirtVertices, 3));
  const skirt = mesh(skirtGeometry, new THREE.MeshToonMaterial({
    color: '#906855', gradientMap: gradient, side: THREE.DoubleSide,
  }), hip);
  const hemGeometry = skirtGeometry.clone();
  const hem = mesh(hemGeometry, materials.hem, hip);
  const legs = [-1, 1].map(side => {
    const a = V(side * 0.08, 0.56, 0), b = V(side * 0.08, 0.51, 0.41), c = V(side * 0.09, 0.085, 0.54);
    const thigh = bone(group, longHair ? materials.dark : materials.skin, a, b, 0.064, 0.05);
    const shin = bone(group, longHair ? materials.dark : materials.white, b, c, 0.049, 0.036);
    const knee = ellipsoid(group, longHair ? materials.dark : materials.skin, b, V(0.05, 0.05, 0.05));
    const shoe = new THREE.Group();
    group.add(shoe);
    ellipsoid(shoe, materials.white, V(0, 0.040, 0.024), V(0.051, 0.039, 0.105));
    ellipsoid(shoe, materials.red, V(0, 0.037, 0.094), V(0.049, 0.027, 0.035));
    block(shoe, materials.dark, V(0, 0.018, -0.035), V(0.068, 0.022, 0.051));
    return {side, thigh, shin, knee, shoe, hip: a, ankle: c};
  });
  return {group, hip, torso, head, horn, skirtGeometry, hemGeometry, legs, longHair};
}
const leftPosition = V(-0.235, 0, 0.018), rightPosition = V(0.235, 0, 0.15);
makeChair(leftPosition, -Math.PI / 2);
makeChair(rightPosition, Math.PI / 2);
const left = makeGirl(leftPosition, -Math.PI / 2, false);
const right = makeGirl(rightPosition, Math.PI / 2, true);

function updateSkirt(actor, standing) {
  function ring(a, fraction) {
    const flare = 0.142 + 0.105 * fraction;
    const pleat = 1 + 0.045 * Math.sin(a * 12) * fraction;
    const front = Math.max(0, Math.sin(a));
    const seatedY = 0.055 - fraction * (0.035 * front
      + 0.12 * Math.abs(Math.cos(a)) + 0.06 * Math.max(0, -Math.sin(a)));
    return V(Math.cos(a) * flare * pleat,
      mix(seatedY, -0.01 - fraction * 0.315, standing),
      Math.sin(a) * flare * 0.83 * pleat + fraction * mix(0.27, 0.028, standing));
  }
  for (const [geometry, start, end] of [[actor.skirtGeometry, 0, 1], [actor.hemGeometry, 0.885, 0.963]]) {
    const buffer = geometry.attributes.position.array;
    let offset = 0;
    for (let i = 0; i < 36; i++) {
      const a = i / 36 * Math.PI * 2, b = (i + 1) / 36 * Math.PI * 2;
      for (const p of [ring(a, start), ring(b, end), ring(a, end), ring(a, start), ring(b, start), ring(b, end)]) {
        buffer[offset++] = p.x; buffer[offset++] = p.y; buffer[offset++] = p.z;
      }
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }
}
function solveKnee(hip, ankle) {
  const upper = 0.42, lower = 0.46;
  const direction = ankle.clone().sub(hip);
  const distance = direction.length();
  if (distance >= upper + lower) throw new Error('Unreachable leg support target');
  direction.divideScalar(distance);
  const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
  const height = Math.sqrt(Math.max(0, upper * upper - along * along));
  const pole = V(0, -direction.z, direction.y).negate().normalize();
  return hip.clone().addScaledVector(direction, along).addScaledVector(pole, height);
}
function updateGirl(actor, seconds, active) {
  const feet = active ? smooth((seconds - 0.45) / 1.0) : 0;
  const rise = active ? smooth((seconds - 1.45) / 2.85) : 0;
  const lean = active ? (0.36 * smooth((seconds - 0.45) / 0.95) * (1 - smooth((seconds - 2.4) / 1.9))) : 0;
  actor.hip.position.set(0, mix(0.565, 0.932, rise), mix(0, 0.17, smooth((seconds - 0.9) / 2.75)) * Number(active));
  actor.torso.rotation.x = lean - 0.065 * (1 - rise);
  actor.head.rotation.y = (actor.longHair ? -0.67 : 0.40) * (1 - rise * 0.95);
  updateSkirt(actor, rise);
  for (const leg of actor.legs) {
    const near = leg.side > 0;
    const z = mix(near ? 0.545 : 0.36, near ? 0.235 : 0.120, feet);
    const footLift = active && feet > 0 && feet < 1 ? 0.018 * Math.sin(feet * Math.PI) : 0;
    const ankle = V(leg.side * 0.084, 0.085 + footLift, z);
    const hip = actor.hip.position.clone().add(V(leg.side * 0.078, 0, 0));
    const knee = solveKnee(hip, ankle);
    setBone(leg.thigh, hip, knee);
    setBone(leg.shin, knee, ankle);
    leg.knee.position.copy(knee);
    leg.shoe.position.set(ankle.x, footLift, ankle.z);
    leg.hip.copy(hip);
    leg.ankle.copy(ankle);
  }
  return {rise, feet, lean};
}
let latestState;
function seek(input) {
  const seconds = motionEnabled ? clamp(Number(input), 0, DURATION) : 0;
  const state = updateGirl(left, seconds, motionEnabled);
  updateGirl(right, 0, false);
  const orbit = motionEnabled ? smooth((seconds - 0.30) / (DURATION - 0.30)) : 0;
  const target = V(mix(0.025, -0.405, orbit), mix(0.280, 0.880, orbit), mix(0, 0.018, orbit));
  const angle = mix(0, -Math.PI / 2, orbit), radius = mix(6.0, 5.6, orbit);
  camera.position.set(target.x + Math.sin(angle) * radius, mix(0.32, 1.02, orbit), target.z + Math.cos(angle) * radius);
  camera.fov = 26;
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  scene.updateMatrixWorld(true);
  latestState = {seconds, orbitRadians: angle, leftRise: state.rise, leftTorsoLean: state.lean,
    leftHeadYaw: left.head.rotation.y, rightHeadYaw: right.head.rotation.y,
    leftHipWorld: left.hip.getWorldPosition(new THREE.Vector3()).toArray(),
    rightHipWorld: right.hip.getWorldPosition(new THREE.Vector3()).toArray(),
    leftFeet: left.legs.map(leg => left.group.localToWorld(leg.ankle.clone()).toArray()),
    rightFeet: right.legs.map(leg => right.group.localToWorld(leg.ankle.clone()).toArray()),
    leftKnees: left.legs.map(leg => leg.knee.getWorldPosition(new THREE.Vector3()).toArray()),
    leftHornBellWorld: left.horn.bell.getWorldPosition(new THREE.Vector3()).toArray(),
    actorCount: 2, hornCount: 2, movingActor: 'image-left-gold-instrument-girl'};
  renderer.render(scene, camera);
}
window.reconstruction = {
  pause() {},
  seek,
  getCameraState() {return {position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov};},
  getDiagnostics() {return structuredClone(latestState);},
  getSceneContract() {return {width: W, height: H, fps: 24, frames: 124, referenceBillboards: 0,
    mode: motionEnabled ? 'left-orbit-and-supported-rise' : 'static-reconstruction'};},
};
seek(0);
