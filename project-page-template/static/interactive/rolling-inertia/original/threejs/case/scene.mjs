import * as THREE from './vendor/three.module.js';

async function json(path) {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`${path}: HTTP ${response.status}`);
  return response.json();
}
const config = await json('config.json');
const manifest = await json('manifest.json');
const id = new URLSearchParams(location.search).get('case') || manifest.cases[0].id;
const entry = manifest.cases.find(c => c.id === id);
if (!entry) throw new Error(`Unknown case: ${id}`);
const trajectory = await json(entry.trajectory);
const layout = (await json('layouts.json'))[id];
const supersampling = id === 'newtons-cradle' ? 4 : config.supersampling;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e4e9ec');
const renderer = new THREE.WebGLRenderer({antialias: false, preserveDrawingBuffer: true});
renderer.setSize(config.width * supersampling, config.height * supersampling, false);
renderer.setPixelRatio(1);
renderer.getContext().disable(renderer.getContext().DITHER);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const delivery = document.createElement('canvas');
delivery.width = config.width;
delivery.height = config.height;
const context = delivery.getContext('2d');
context.imageSmoothingEnabled = true;
context.imageSmoothingQuality = 'high';
const aspect = config.width / config.height;
const halfSpan = (layout.orthographic_span || 0) / 2;
const camera = layout.orthographic_span
  ? new THREE.OrthographicCamera(-halfSpan * aspect, halfSpan * aspect, halfSpan, -halfSpan, .05, 80)
  : new THREE.PerspectiveCamera(layout.fov, aspect, .05, 80);
camera.position.fromArray(layout.camera);
camera.lookAt(...layout.target);
scene.add(new THREE.HemisphereLight('#eff7ff', '#65716e', 2.3));
const key = new THREE.DirectionalLight('#fff3db', 3.7);
key.position.set(-3, 8, 6);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, {left: -7, right: 7, top: 7, bottom: -7, near: .1, far: 30});
key.shadow.normalBias = .018;
scene.add(key);
const fill = new THREE.DirectionalLight('#c0d7f6', 1.8);
fill.position.set(5, 3, -4);
scene.add(fill);
const material = (color, metalness = 0, roughness = .5) =>
  new THREE.MeshStandardMaterial({color, metalness, roughness});
const mats = {
  dark: material('#243642', .45, .4), silver: material('#b9c5cc', .65, .27),
  brass: material('#bd8849', .65, .3), orange: material('#d16b35', .25, .3),
  blue: material('#356da7', .25, .3), green: material('#3d937e', .2, .35),
  wood: material('#b69a73', 0, .72), white: material('#f3f4ed', .05, .75),
};
const V = a => new THREE.Vector3(...a);
const Y = new THREE.Vector3(0, 1, 0);
const structuralLinks = [];
const geometryAudits = [];
let floorMesh;
const linked = (upper, lower, name) => structuralLinks.push({upper, lower, name});
function mesh(geometry, mat, position, parent = scene) {
  const object = new THREE.Mesh(geometry, mat);
  if (position) object.position.fromArray(position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
function box(size, position, mat, parent = scene) {
  return mesh(new THREE.BoxGeometry(...size), mat, position, parent);
}
function ball(radius, position, mat, parent = scene) {
  return mesh(new THREE.SphereGeometry(radius, 40, 28), mat, position, parent);
}
function paintedSphereTexture(base, hollow) {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(canvas.width, canvas.height);
  for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
    const phi = 2 * Math.PI * (x + .5) / canvas.width;
    const theta = Math.PI * (y + .5) / canvas.height;
    const nx = -Math.cos(phi) * Math.sin(theta), ny = Math.cos(theta);
    const nz = Math.sin(phi) * Math.sin(theta);
    const stripe = Math.abs(nx) < .035 || Math.abs(nz) < .035;
    const dot = ny > .986;
    const color = dot ? [245, 245, 235] : stripe ? [25, 43, 55] : base;
    const offset = (y * canvas.width + x) * 4;
    image.data.set([...color, hollow && !stripe && !dot ? 140 : 255], offset);
  }
  ctx.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return texture;
}
function wheelFace() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#243642'; ctx.fillRect(0, 0, 256, 256);
  ctx.strokeStyle = '#ccd4da'; ctx.lineWidth = 13;
  for (const angle of [0, 2 * Math.PI / 3, 4 * Math.PI / 3]) {
    ctx.beginPath(); ctx.moveTo(128, 128);
    ctx.lineTo(128 + 105 * Math.cos(angle), 128 + 105 * Math.sin(angle)); ctx.stroke();
  }
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map, roughness: .5});
}
function markedWeightMaterial() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#d2d9dd'; ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#59666e'; ctx.lineWidth = 3; ctx.strokeRect(1.5, 1.5, 125, 125);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({map, metalness: .5, roughness: .35});
}
function segmentEndpoint(object, sign) {
  return new THREE.Vector3(0, sign * .5, 0).applyMatrix4(object.matrixWorld);
}
function setCable(object, a, b, restLength, radius) {
  const start = V(a), end = V(b), chord = end.clone().sub(start), distance = chord.length();
  let path;
  if (distance >= restLength - 1e-10) {
    path = new THREE.LineCurve3(start, end);
  } else {
    const direction = chord.clone().normalize();
    const side = new THREE.Vector3(0, 0, Math.sign(a[2]) || 1);
    side.addScaledVector(direction, -side.dot(direction)).normalize();
    const arcLength = sag => sag === 0 ? distance :
      .5 * Math.hypot(distance, 4 * sag) + distance ** 2 / (8 * sag) * Math.asinh(4 * sag / distance);
    let low = 0, high = restLength;
    for (let i = 0; i < 40; i++) {
      const middle = (low + high) / 2;
      if (arcLength(middle) < restLength) low = middle;
      else high = middle;
    }
    const control = start.clone().add(end).multiplyScalar(.5).addScaledVector(side, low + high);
    path = new THREE.QuadraticBezierCurve3(start, control, end);
  }
  path.arcLengthDivisions = 400;
  object.geometry.dispose();
  object.geometry = new THREE.TubeGeometry(path, 48, radius, 6, false);
  object.userData.path = path;
  object.userData.expectedLength = Math.max(distance, restLength);
}
function segment(a, b, radius, mat, parent = scene) {
  const object = mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), mat, null, parent);
  setSegment(object, a, b);
  return object;
}
function setSegment(object, a, b) {
  const start = V(a), end = V(b), direction = end.clone().sub(start);
  const length = direction.length();
  if (length < 1e-8) { object.visible = false; return; }
  object.visible = true;
  object.position.copy(start).add(end).multiplyScalar(.5);
  object.scale.y = length;
  object.quaternion.setFromUnitVectors(Y, direction.normalize());
}
function spring(radius = .065, turns = 13, freeLength = 1) {
  const points = Array.from({length: 300}, (_, i) => {
    const t = i / 299;
    return new THREE.Vector3(radius * Math.cos(t * turns * 2 * Math.PI), t, radius * Math.sin(t * turns * 2 * Math.PI));
  });
  const object = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 299, .012, 7, false), mats.silver);
  object.userData.springSpec = {turns, freeLength, freeRadius: radius, wireRadius: .012};
  return object;
}
function setSpring(object, a, b) {
  setCompressionSpring(object, a, b, object.userData.springSpec);
}
class CompressionHelix extends THREE.Curve {
  constructor(length, radius, turns) {
    super(); this.length = length; this.radius = radius; this.turns = turns;
    this.arcLengthDivisions = 4000;
  }
  getPoint(t, target = new THREE.Vector3()) {
    const angle = 2 * Math.PI * this.turns * t;
    return target.set(this.radius * Math.cos(angle), this.length * t, this.radius * Math.sin(angle));
  }
  getTangent(t, target = new THREE.Vector3()) {
    const angle = 2 * Math.PI * this.turns * t;
    const speed = 2 * Math.PI * this.turns * this.radius;
    return target.set(-speed * Math.sin(angle), this.length, speed * Math.cos(angle)).normalize();
  }
}
function setCompressionSpring(object, a, b, spec = {turns: 8, freeLength: .45, freeRadius: .06, wireRadius: .012}) {
  const direction = V(b).sub(V(a)), length = direction.length();
  const {turns, freeLength, freeRadius, wireRadius} = spec;
  const wireLength = Math.hypot(2 * Math.PI * turns * freeRadius, freeLength);
  const radius = Math.sqrt(wireLength ** 2 - length ** 2) / (2 * Math.PI * turns);
  const curve = new CompressionHelix(length, radius, turns);
  object.geometry.dispose();
  object.geometry = new THREE.TubeGeometry(curve, 1024, wireRadius, 12, false);
  object.position.fromArray(a);
  object.quaternion.setFromUnitVectors(Y, direction.normalize());
  object.scale.set(1, 1, 1);
  object.userData.wireLength = wireLength;
  object.userData.helixLength = Math.hypot(2 * Math.PI * turns * radius, length);
  object.userData.pitch = length / turns;
}
function coilChecks(object, name) {
  return [
    {name: `${name}/constant-wire-radius`, error: Math.abs(object.geometry.parameters.radius - object.userData.springSpec.wireRadius)},
    {name: `${name}/no-axis-scaling`, error: object.scale.distanceTo(new THREE.Vector3(1, 1, 1))},
    {name: `${name}/constant-wire-length`, error: Math.abs(object.userData.helixLength - object.userData.wireLength)},
    {name: `${name}/turn-clearance`, error: Math.max(0, 2 * object.userData.springSpec.wireRadius - object.userData.pitch)},
  ];
}
function stand(x, height, z = -.15) {
  const base = box([.6, .1, .55], [x, .05, z], mats.dark);
  const post = box([.095, height, .095], [x, height / 2 + .1, z], mats.silver);
  linked(base, floorMesh, 'stand/base-floor');
  linked(post, base, 'stand/post-base');
  return {base, post};
}
function ground(width = 10, depth = 7) {
  floorMesh = box([width, .12, depth], [.5, -.06, 0], material('#a9b5ba', .05, .75));
}
function platform(size, position, mat) {
  const deck = box(size, position, mat);
  const height = position[1] - size[1] / 2;
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const foot = box([.14, height, .14],
      [position[0] + x * (size[0] / 2 - .16), height / 2,
       position[2] + z * (size[2] / 2 - .16)], mats.dark);
    linked(foot, floorMesh, 'platform/foot-floor');
    linked(deck, foot, 'platform/deck-foot');
  }
  return deck;
}
ground();
let animate;

function rollingScene() {
  const p = entry.parameters;
  const bodies = [], surfaces = [];
  for (const [i, z] of [.8, -.8].entries()) {
    const length = 6.2;
    const center = [-2.8 + length / 2 * Math.cos(p.incline) - .06 * Math.sin(p.incline),
      2.1 - length / 2 * Math.sin(p.incline) - .06 * Math.cos(p.incline), z];
    const ramp = box([length, .12, .72], center, mats.silver);
    ramp.rotation.z = -p.incline;
    surfaces.push(ramp);
    for (const distance of [.1, length - .1]) {
      const x = -2.8 + distance * Math.cos(p.incline);
      const h = 2.1 - distance * Math.sin(p.incline) - .1;
      const support = box([.12, h, .62], [x, h / 2, z], mats.dark);
      linked(support, floorMesh, 'ramp/support-floor');
      linked(ramp, support, 'ramp/deck-support');
    }
    const group = new THREE.Group();
    const shell = i === 1 ? new THREE.MeshPhysicalMaterial({
      color: '#ffffff', metalness: .15, roughness: .12, transparent: true,
      opacity: 1, side: THREE.DoubleSide, depthWrite: false, clearcoat: 1,
      map: paintedSphereTexture([69, 155, 192], true),
    }) : new THREE.MeshStandardMaterial({color: '#ffffff', metalness: .65, roughness: .3,
      map: paintedSphereTexture([189, 136, 73], false)});
    mesh(new THREE.SphereGeometry(p.radius, 128, 96), shell, [0, 0, 0], group);
    scene.add(group); bodies.push(group);
  }
  geometryAudits.push(() => {
    const result = [];
    const n = new THREE.Vector3(Math.sin(p.incline), Math.cos(p.incline), 0);
    bodies.forEach((body, i) => {
      const planePoint = new THREE.Vector3(0, .06, 0).applyMatrix4(surfaces[i].matrixWorld);
      const center = body.getWorldPosition(new THREE.Vector3());
      result.push({name: `rolling/${i}/analytic-contact`, error: Math.abs(center.clone().sub(planePoint).dot(n) - p.radius)});
      result.push({name: `sliding/${i}/no-spin`, error: Math.abs(body.rotation.z)});
      if (body.children.length !== 1) throw new Error('Rolling markers must not introduce geometry');
      let minimum = Infinity;
      const sphere = body.children[0], positions = sphere.geometry.attributes.position;
      for (let j = 0; j < positions.count; j++) {
        const point = new THREE.Vector3().fromBufferAttribute(positions, j).applyMatrix4(sphere.matrixWorld);
        minimum = Math.min(minimum, point.sub(planePoint).dot(n));
      }
      result.push({name: `rolling/${i}/rendered-contact`, error: Math.abs(minimum), tolerance: .00015});
    });
    const first = bodies[0].getWorldPosition(new THREE.Vector3());
    const second = bodies[1].getWorldPosition(new THREE.Vector3());
    result.push({name: 'sliding/equal-world-height', error: Math.abs(first.y - second.y)});
    result.push({name: 'sliding/equal-screen-height', error: Math.abs(first.project(camera).y - second.project(camera).y)});
    return result;
  });
  return state => bodies.forEach((body, i) => {
    body.position.fromArray(state.positions[i]); body.rotation.z = state.rotation[i];
  });
}

function cradleScene() {
  const p = entry.parameters;
  const cable = entry.cable_parameters;
  const cableMaterial = new THREE.MeshBasicMaterial({color: '#111820'});
  const posts = [stand(-1.8, 2.15), stand(1.8, 2.15)];
  const beam = box([3.7, .12, .45], [0, 2.23, 0], mats.dark);
  posts.forEach(s => linked(beam, s.post, 'cradle/beam-post'));
  const bodies = [], wires = [], restVertices = [], restNormals = [];
  for (const x of p.pivots_x) {
    const sphere = mesh(new THREE.SphereGeometry(p.radius, 128, 96), mats.silver, [x, 2.1 - p.length, 0]);
    bodies.push(sphere);
    restVertices.push(sphere.geometry.attributes.position.array.slice());
    restNormals.push(sphere.geometry.attributes.normal.array.slice());
    wires.push([-cable.anchor_depth, cable.anchor_depth].map(z =>
      mesh(new THREE.TubeGeometry(new THREE.LineCurve3(V([x, 2.1, z]),
        V([x, 2.1 - p.length, 0])), 48, cable.radius, 6, false), cableMaterial)));
    for (const z of [-.13, .13]) {
      const cap = ball(.035, [x, 2.1, z], mats.brass);
      const hanger = segment([x, 2.19, z], [x, 2.1, z], .012, mats.brass);
      linked(hanger, beam, 'cradle/hanger-beam'); linked(cap, hanger, 'cradle/pivot-hanger');
    }
  }
  let contacts = [];
  geometryAudits.push(() => bodies.flatMap((body, i) => wires[i].flatMap((wire, j) => [
    {name: `cradle/${i}/${j}/wire-pivot`, error: wire.userData.path.getPoint(0).distanceTo(V([p.pivots_x[i], 2.1, j ? cable.anchor_depth : -cable.anchor_depth]))},
    {name: `cradle/${i}/${j}/wire-bob`, error: wire.userData.path.getPoint(1).distanceTo(body.getWorldPosition(new THREE.Vector3()))},
    {name: `cradle/${i}/${j}/wire-length`, error: Math.abs(wire.userData.path.getLength() - wire.userData.expectedLength)},
    {name: `cradle/${i}/${j}/no-compression`, error: Math.max(0, -current.cable_tension[i])},
  ])));
  geometryAudits.push(() => contacts.flatMap(contact => contact.indices.map((i, side) => {
    const object = bodies[i], vertices = object.geometry.attributes.position;
    let penetration = 0;
    for (let j = 0; j < vertices.count; j++) {
      const point = new THREE.Vector3().fromBufferAttribute(vertices, j).applyMatrix4(object.matrixWorld);
      const distance = point.sub(contact.midpoint).dot(contact.normal) * (side ? -1 : 1);
      penetration = Math.max(penetration, distance);
    }
    return {name: `cradle/${i}/deformed-contact`, error: penetration};
  })));
  return state => {
    contacts = [];
    for (let i = 0; i < bodies.length - 1; i++) {
      const a = V(state.positions[i]), b = V(state.positions[i + 1]);
      if (entry.model_type !== 'ideal-instant-contact' && a.distanceTo(b) < 2 * p.radius) {
        contacts.push({indices: [i, i + 1], midpoint: a.clone().add(b).multiplyScalar(.5),
          normal: b.clone().sub(a).normalize()});
      }
    }
    bodies.forEach((body, i) => {
      body.position.fromArray(state.positions[i]);
      const localContacts = contacts.filter(c => c.indices.includes(i)).map(c => {
        const normal = c.normal.clone().multiplyScalar(c.indices[0] === i ? 1 : -1);
        return {normal, limit: c.midpoint.clone().sub(body.position).dot(normal)};
      });
      const positions = body.geometry.attributes.position;
      positions.array.set(restVertices[i]);
      for (let j = 0; j < positions.count; j++) {
        const vertex = new THREE.Vector3().fromBufferAttribute(positions, j);
        for (const contact of localContacts) {
          const excess = vertex.dot(contact.normal) - contact.limit;
          if (excess > 0) vertex.addScaledVector(contact.normal, -excess);
        }
        positions.setXYZ(j, vertex.x, vertex.y, vertex.z);
      }
      positions.needsUpdate = true;
      if (localContacts.length) body.geometry.computeVertexNormals();
      else { body.geometry.attributes.normal.array.set(restNormals[i]); body.geometry.attributes.normal.needsUpdate = true; }
      wires[i].forEach((wire, j) => setCable(wire,
        [p.pivots_x[i], 2.1, j ? cable.anchor_depth : -cable.anchor_depth],
        state.positions[i], cable.rest_length, cable.radius));
    });
  };
}

function recoilScene() {
  const deck = box([8, .06, .92], [1, .03, 0], mats.silver);
  linked(deck, floorMesh, 'track/deck-floor');
  const rails = [-.27, .27].map(z => box([8, .05, .08], [1, .085, z], mats.dark));
  rails.forEach(rail => linked(rail, deck, 'track/rail-deck'));
  const carts = [], wheels = [];
  const radius = entry.parameters.wheel_radius, axleY = .11 + radius;
  const bodyY = axleY + .13;
  const faceMaterial = wheelFace();
  const loadMaterial = markedWeightMaterial();
  for (let i = 0; i < 2; i++) {
    const cart = new THREE.Group();
    const body = box([.7, .16, .46], [0, bodyY, 0], i ? mats.orange : mats.blue, cart);
    const loads = [];
    for (let weight = 0; weight < (i ? 1 : 3); weight++) {
      const load = box([.40, .12, .36], [0, bodyY + .14 + weight * .12, 0], loadMaterial, cart);
      linked(load, weight ? loads[weight - 1] : body, 'cart/weight-support');
      loads.push(load);
    }
    const spins = [];
    for (const x of [-.23, .23]) for (const z of [-.27, .27]) {
      const pivot = new THREE.Group(); pivot.position.set(x, axleY, z); cart.add(pivot);
      const wheel = mesh(new THREE.CylinderGeometry(radius, radius, .06, 128),
        [mats.dark, faceMaterial, faceMaterial], [0, 0, 0], pivot);
      wheel.rotation.x = Math.PI / 2;
      spins.push(pivot);
    }
    for (const x of [-.23, .23]) {
      const bearing = box([.10, .10, .20], [x, axleY + .04, 0], mats.dark, cart);
      const axle = segment([x, axleY, -.30], [x, axleY, .30], .018, mats.silver, cart);
      linked(bearing, body, 'cart/bearing-body'); linked(axle, bearing, 'cart/axle-bearing');
    }
    scene.add(cart); carts.push(cart); wheels.push(spins);
  }
  const coil = spring(.06, 8);
  geometryAudits.push(() => [
    {name: 'recoil/constant-wire-radius', error: Math.abs(coil.geometry.parameters.radius - .012)},
    {name: 'recoil/no-axis-scaling', error: coil.scale.distanceTo(new THREE.Vector3(1, 1, 1))},
    {name: 'recoil/inextensible-wire', error: Math.abs(coil.userData.helixLength - coil.userData.wireLength)},
    {name: 'recoil/no-overlapping-turns', error: Math.max(0, .024 - coil.userData.pitch)},
  ]);
  const marker = mesh(new THREE.PlaneGeometry(.015, .85), mats.orange, [0, .0601, 0]);
  marker.rotation.x = -Math.PI / 2;
  geometryAudits.push(() => wheels.flatMap((spins, i) => spins.map((wheel, j) => {
    const center = wheel.getWorldPosition(new THREE.Vector3());
    const rail = new THREE.Box3().setFromObject(rails[j % 2]);
    return [
      {name: `cart/${i}/wheel-${j}-rail`, error: Math.abs(center.y - radius - rail.max.y)},
      {name: `cart/${i}/wheel-${j}-no-slip`, error: Math.abs(wheel.rotation.z + (current.x[i] - trajectory.samples[0].x[i]) / radius)},
      {name: `cart/${i}/wheel-${j}-rail-width`, error: Math.max(0, Math.abs(center.z - (rail.min.z + rail.max.z) / 2) + .03 - (rail.max.z - rail.min.z) / 2)},
    ];
  }).flat()));
  return state => {
    carts.forEach((cart, i) => {
      cart.position.x = state.x[i];
      wheels[i].forEach(w => { w.rotation.z = -(state.x[i] - trajectory.samples[0].x[i]) / radius; });
    });
    const a = [state.x[0] + .35, bodyY + .03, 0], b = [a[0] + state.spring_length, bodyY + .03, 0];
    setCompressionSpring(coil, a, b);
  };
}

function coupledScene() {
  const p = entry.parameters;
  const posts = [stand(-1.35, 2), stand(1.35, 2)];
  const beam = box([2.8, .1, .3], [0, 2.1, 0], mats.dark);
  posts.forEach(s => linked(beam, s.post, 'coupled/beam-post'));
  const pivots = [[-p.spacing / 2, 2, 0], [p.spacing / 2, 2, 0]];
  const bodies = pivots.map((pivot, i) => ball(.13, [pivot[0], 2 - p.length, 0], i ? mats.blue : mats.orange));
  const rods = pivots.map((pivot, i) => segment(pivot, bodies[i].position.toArray(), .018, mats.silver));
  pivots.forEach(pivot => linked(ball(.05, pivot, mats.brass), beam, 'coupled/pivot-beam'));
  const coil = spring(.06, 18, p.spacing);
  geometryAudits.push(() => coilChecks(coil, 'coupled/spring'));
  geometryAudits.push(() => bodies.flatMap((body, i) => [
    {name: `coupled/${i}/rod-pivot`, error: segmentEndpoint(rods[i], -1).distanceTo(V(pivots[i]))},
    {name: `coupled/${i}/rod-bob`, error: segmentEndpoint(rods[i], 1).distanceTo(body.getWorldPosition(new THREE.Vector3()))},
    {name: `coupled/${i}/rod-length`, error: body.getWorldPosition(new THREE.Vector3()).distanceTo(V(pivots[i])) - p.length},
  ]));
  return state => {
    bodies.forEach((body, i) => { body.position.fromArray(state.positions[i]); setSegment(rods[i], pivots[i], state.positions[i]); });
    setSpring(coil, state.positions[0], state.positions[1]);
  };
}

function resonanceScene() {
  const posts = [stand(-2.0, 2.5), stand(2.0, 2.5)];
  const bar = box([4.1, .1, .10], [0, 2.3, 0], mats.dark);
  const guides = [-2, 2].map((x, i) => {
    const group = new THREE.Group(); group.position.set(x, 2.3, -.15); scene.add(group);
    const walls = [];
    for (const sign of [-1, 1]) {
      walls.push(box([.0225, .12, .14], [sign * .05875, 0, 0], mats.silver, group));
      walls.push(box([.095, .12, .0225], [0, 0, sign * .05875], mats.silver, group));
    }
    const connector = box([.12, .07, .08], [0, 0, .09], mats.silver, group);
    linked(connector, walls[3], 'resonance/guide-front-connector');
    linked(connector, bar, 'resonance/guide-bar');
    return {group, walls, post: posts[i].post};
  });
  const xs = [-1.3, 0, 1.3];
  const coils = xs.map(() => spring(.095, 12, .7));
  geometryAudits.push(() => coils.flatMap((coil, i) => coilChecks(coil, `resonance/spring-${i}`)));
  const weights = xs.map((x, i) => box([.34, .3, .32], [x, 1.5, 0], [mats.blue, mats.orange, mats.green][i]));
  const motor = new THREE.Group();
  motor.position.set(2.0, 2.3 + entry.parameters.base_amplitude, .24); scene.add(motor);
  const rotor = mesh(new THREE.CylinderGeometry(.18, .18, .07, 32), mats.brass, [0, 0, 0], motor);
  rotor.rotation.x = Math.PI / 2;
  const pin = ball(.022, [0, -entry.parameters.base_amplitude, .055], mats.dark, motor);
  const yoke = new THREE.Group(); scene.add(yoke);
  for (const y of [-.032, .032]) box([.55, .02, .035], [0, y, 0], mats.silver, yoke);
  for (const x of [-.285, .285]) box([.02, .085, .035], [x, 0, 0], mats.silver, yoke);
  const linkage = new THREE.Group(); scene.add(linkage);
  const bridge = box([.64, .04, .04], [2, 0, .03], mats.silver, linkage);
  linked(bridge, bar, 'resonance/yoke-bridge-bar');
  for (const x of [1.715, 2.285]) {
    const rod = segment([x, 0, .03], [x, 0, .295], .014, mats.silver, linkage);
    linked(rod, bridge, 'resonance/yoke-linkage');
  }
  const motorPost = stand(2.6, 2.6, .18);
  const topBracket = box([.7, .10, .12], [2.3, 2.65, .18], mats.dark);
  const rearBracket = segment([2, 2.65, .18], [2, 2.32, .18], .03, mats.silver);
  const shaft = segment([2, 2.32, .18], [2, 2.32, .24], .026, mats.silver);
  linked(topBracket, motorPost.post, 'resonance/motor-support');
  linked(rearBracket, topBracket, 'resonance/motor-bracket');
  linked(shaft, rearBracket, 'resonance/motor-shaft');
  linked(rotor, shaft, 'resonance/rotor-shaft');
  linked(pin, rotor, 'resonance/pin-rotor');
  geometryAudits.push(() => {
    const checks = [{name: 'resonance/pin-yoke-kinematics',
      error: Math.abs(pin.getWorldPosition(new THREE.Vector3()).y - bar.position.y)}];
    for (const [i, guide] of guides.entries()) {
      const postBox = new THREE.Box3().setFromObject(guide.post);
      for (const [j, wall] of guide.walls.entries()) {
        const box = new THREE.Box3().setFromObject(wall);
        const overlap = ['x', 'y', 'z'].map(axis =>
          Math.min(box.max[axis], postBox.max[axis]) - Math.max(box.min[axis], postBox.min[axis]));
        checks.push({name: `resonance/guide-${i}-${j}/no-solid-overlap`,
          error: Math.max(0, Math.min(...overlap))});
      }
    }
    return checks;
  });
  return state => {
    bar.position.y = 2.3 + state.base;
    motor.rotation.z = state.drive_phase;
    yoke.position.set(2.0, bar.position.y, .295);
    linkage.position.y = bar.position.y;
    guides.forEach(guide => { guide.group.position.y = bar.position.y; });
    xs.forEach((x, i) => {
      weights[i].position.y = state.y[i];
      setSpring(coils[i], [x, 2.3 + state.base, 0], [x, state.y[i], 0]);
    });
  };
}

function waveScene() {
  const posts = [stand(-2.1, 1.6), stand(2.1, 1.6)];
  const beam = box([4.3, .1, .26], [0, 1.68, 0], mats.dark);
  posts.forEach(s => linked(beam, s.post, 'wave/beam-post'));
  const pivots = entry.parameters.lengths.map((_, i) => [(i - 3.5) * .5, 1.6, 0]);
  pivots.forEach(pivot => {
    const connector = segment([pivot[0], 1.65, 0], pivot, .013, mats.brass);
    const cap = ball(.022, pivot, mats.silver);
    linked(connector, beam, 'wave/hanger-beam');
    linked(cap, connector, 'wave/pivot-hanger');
  });
  const bodies = pivots.map((p, i) => ball(.095, [p[0], .9, 0], i % 2 ? mats.blue : mats.brass));
  const rods = pivots.map((p, i) => segment(p, bodies[i].position.toArray(), .009, mats.dark));
  geometryAudits.push(() => bodies.flatMap((body, i) => [
    {name: `wave/${i}/wire-pivot`, error: segmentEndpoint(rods[i], -1).distanceTo(V(pivots[i]))},
    {name: `wave/${i}/wire-bob`, error: segmentEndpoint(rods[i], 1).distanceTo(body.getWorldPosition(new THREE.Vector3()))},
    {name: `wave/${i}/length`, error: Math.abs(body.getWorldPosition(new THREE.Vector3()).distanceTo(V(pivots[i])) - entry.parameters.lengths[i])},
  ]));
  return state => bodies.forEach((body, i) => {
    body.position.fromArray(state.positions[i]); setSegment(rods[i], pivots[i], state.positions[i]);
  });
}

function beamMaterial(color) {
  return new THREE.MeshBasicMaterial({color, transparent: true, opacity: .9, depthWrite: false, toneMapped: false});
}
function sourceBody(position, direction, parent = scene) {
  const group = new THREE.Group();
  const housing = mesh(new THREE.CylinderGeometry(.10, .10, .32, 24), mats.dark, [0, -.16, 0], group);
  const lens = mesh(new THREE.CylinderGeometry(.072, .072, .018, 24), mats.brass, [0, .006, 0], group);
  parent.add(group);
  group.position.fromArray(position); group.quaternion.setFromUnitVectors(Y, V(direction).normalize());
  return group;
}

function mirrorScene() {
  const table = platform([5.6, .15, 4.5], [-.3, .12, .7], mats.wood);
  const origin = [0, .8, 0], source = [-2.15, .8, 0];
  sourceBody(source, [1, 0, 0]);
  const sourceStand = segment([-2.30, .195, 0], [-2.30, .8, 0], .035, mats.dark);
  const mirrorStand = segment([0, .195, 0], [0, .4, 0], .055, mats.dark);
  linked(sourceStand, table, 'mirror/source-stand-table');
  linked(mirrorStand, table, 'mirror/mirror-stand-table');
  const mirror = mesh(new THREE.PlaneGeometry(.60, .76),
    new THREE.MeshStandardMaterial({color: '#bcd0dc', metalness: .7, roughness: .13, side: THREE.DoubleSide}), origin);
  const border = mesh(new THREE.BoxGeometry(.67, .83, .045), mats.dark, origin);
  linked(border, mirrorStand, 'mirror/frame-stand');
  const incoming = segment(source, origin, .012, beamMaterial('#ff5140'));
  incoming.castShadow = false;
  const reflected = segment(origin, [0, .8, 2.4], .012, beamMaterial('#ff5140'));
  reflected.castShadow = false;
  const screen = mesh(new THREE.PlaneGeometry(3.0, 1.35),
    new THREE.MeshStandardMaterial({color: '#f3f4ed', roughness: .9, transparent: true,
      opacity: .87, side: THREE.DoubleSide}), [0, .99, 2.4]);
  const screenBase = box([3.1, .12, .6], [0, .255, 2.42], mats.dark);
  linked(screen, screenBase, 'mirror/screen-base');
  linked(screenBase, table, 'mirror/screen-base-table');
  const spot = ball(.035, [0, .8, 2.4],
    new THREE.MeshBasicMaterial({color: '#ff4b30', toneMapped: false}));
  geometryAudits.push(() => {
    const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(mirror.getWorldQuaternion(new THREE.Quaternion()));
    const incidentDirection = new THREE.Vector3(1, 0, 0);
    const law = incidentDirection.clone().addScaledVector(normal, -2 * incidentDirection.dot(normal));
    const outgoing = segmentEndpoint(reflected, 1).sub(segmentEndpoint(reflected, -1)).normalize();
    return [
      {name: 'mirror/rendered-reflection-law', error: law.distanceTo(outgoing)},
      {name: 'mirror/screen-hit', error: segmentEndpoint(reflected, 1).distanceTo(spot.getWorldPosition(new THREE.Vector3()))},
      {name: 'mirror/spot-on-screen', error: Math.abs(spot.position.z - screen.position.z)},
    ];
  });
  return state => {
    mirror.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), V(state.normal));
    border.quaternion.copy(mirror.quaternion);
    border.position.copy(V(origin)).addScaledVector(V(state.normal), -.03);
    setSegment(reflected, origin, state.screen_hit);
    spot.position.set(state.screen_hit[0], .8, 2.4);
  };
}

function tirScene() {
  const p = entry.parameters, origin = [0, .7, 0];
  const table = platform([5.3, .15, 5.0], [0, .18, 0], mats.dark);
  const shape = new THREE.Shape();
  shape.moveTo(0, p.radius);
  shape.absarc(0, 0, p.radius, Math.PI / 2, 3 * Math.PI / 2, false);
  shape.lineTo(0, p.radius);
  const geometry = new THREE.ExtrudeGeometry(shape, {depth: .32, bevelEnabled: false, curveSegments: 80});
  geometry.rotateX(Math.PI / 2); geometry.translate(0, .86, 0);
  const glass = mesh(geometry, new THREE.MeshPhysicalMaterial({
    color: '#acd9e3', roughness: .08, metalness: .05, transparent: true, opacity: .23,
    side: THREE.DoubleSide, depthWrite: false, clearcoat: 1,
  }));
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geometry, 25),
    new THREE.LineBasicMaterial({color: '#83c4d8', transparent: true, opacity: .85}));
  scene.add(edges);
  for (const [x, z] of [[-.75, .2], [-.1, -1.1], [-.1, 1.1]]) {
    const foot = mesh(new THREE.CylinderGeometry(.055, .055, .285, 20), mats.silver, [x, .3975, z]);
    linked(foot, table, 'tir/glass-foot-table');
    linked(glass, foot, 'tir/glass-foot');
  }
  mesh(new THREE.CylinderGeometry(.13, .13, .06, 28), mats.brass, [0, .31, 0]);
  const arm = segment([0, .35, 0], [-1.6, .35, -1.2], .032, mats.silver);
  const laser = sourceBody([-1.6, .7, -1.2], [.8, 0, .6]);
  const incident = segment([-1.6, .7, -1.2], origin, .012, beamMaterial('#ffe978'));
  const reflected = segment(origin, [-1, .7, 1], .014, beamMaterial('#ffe978'));
  const transmitted = segment(origin, [1, .7, 1], .014, beamMaterial('#ffe978'));
  for (const line of [incident, reflected, transmitted]) line.castShadow = false;
  const support = segment([-1.6, .35, -1.2], [-1.6, .7, -1.2], .03, mats.silver);
  return state => {
    laser.position.fromArray(state.origin);
    laser.quaternion.setFromUnitVectors(Y, V(state.incident));
    setSegment(arm, [0, .35, 0], [state.origin[0], .35, state.origin[2]]);
    setSegment(support, [state.origin[0], .35, state.origin[2]], state.origin);
    setSegment(incident, state.origin, origin);
    setSegment(reflected, origin, V(origin).addScaledVector(V(state.reflected), 2.0).toArray());
    reflected.material.opacity = state.reflectance;
    transmitted.visible = Boolean(state.transmitted);
    if (state.transmitted) {
      setSegment(transmitted, origin, V(origin).addScaledVector(V(state.transmitted), 2.0).toArray());
      transmitted.material.opacity = state.transmittance;
    }
  };
}

animate = ({
  'rolling-inertia': rollingScene, 'newtons-cradle': cradleScene, 'spring-recoil': recoilScene,
  'coupled-pendulums': coupledScene, 'driven-resonance': resonanceScene, 'pendulum-wave': waveScene,
  'rotating-mirror': mirrorScene, 'total-internal-reflection': tirScene,
})[id]();

function interpolate(a, b, u) {
  if (typeof a === 'number' && typeof b === 'number') return a + (b - a) * u;
  if (Array.isArray(a) && Array.isArray(b)) return a.map((value, i) => interpolate(value, b[i], u));
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    return Object.fromEntries(Object.keys(a).map(key => [key, interpolate(a[key], b[key], u)]));
  }
  return u < .5 ? a : b;
}
let current;
function geometryChecks() {
  scene.updateMatrixWorld(true);
  const checks = structuralLinks.map(({upper, lower, name}) => {
    const a = new THREE.Box3().setFromObject(upper);
    const b = new THREE.Box3().setFromObject(lower);
    const gap = Math.max(0, ...['x', 'y', 'z'].flatMap(axis =>
      [a.min[axis] - b.max[axis], b.min[axis] - a.max[axis]]));
    return {name, error: gap};
  });
  checks.push(...geometryAudits.flatMap(check => check()));
  return {
    checks,
    errors: checks.filter(check => !Number.isFinite(check.error) || Math.abs(check.error) > (check.tolerance ?? .00001)),
    defaultToleranceMeters: .00001,
    sphereMeshContactToleranceMeters: .00015,
  };
}
function seek(time) {
  if (!Number.isFinite(time)) throw new Error('Absolute finite time required');
  time = Math.max(0, Math.min(config.frames / config.fps, time));
  const index = Math.min(trajectory.samples.length - 2, Math.floor(time * trajectory.fps));
  current = interpolate(trajectory.samples[index], trajectory.samples[index + 1], time * trajectory.fps - index);
  animate(current);
  renderer.render(scene, camera);
  context.drawImage(renderer.domElement, 0, 0, config.width, config.height);
}
window.reconstruction = {
  ready: true, title: entry.title, ...config, supersampling, duration: config.frames / config.fps, pause() {}, seek,
  capture: () => delivery.toDataURL('image/png'),
  geometryChecks,
  diagnostics: () => ({id, state: current, camera: {position: camera.position.toArray(),
    type: camera.type, fov: camera.fov, orthographic_span: layout.orthographic_span}}),
};
seek(0);
seek(0);
