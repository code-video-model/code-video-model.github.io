import * as THREE from '../vendor/three.module.js';
import { rng, oakTexture, plasterTexture, architectureTexture, abstractTexture } from './textures.js';
import { person } from './people.js';
import { cameraAt } from './camera-path.mjs';

const WIDTH = 960, HEIGHT = 540, DURATION = 124 / 24;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d6d2c6');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(43, WIDTH / HEIGHT, .05, 60);
camera.name = 'shared gallery camera';

const shared = new THREE.Group(); shared.name = 'invariant gallery'; scene.add(shared);
const partitionRoot = new THREE.Group(); partitionRoot.name = 'partitionRoot'; scene.add(partitionRoot);
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const plaster = plasterTexture(); plaster.wrapS = plaster.wrapT = THREE.RepeatWrapping; plaster.repeat.set(5, 5);
const blue = new THREE.MeshStandardMaterial({ color: '#293943', roughness: .94, bumpMap: plaster, bumpScale: .005 });
const white = new THREE.MeshStandardMaterial({ color: '#eeeae2', roughness: .9, bumpMap: plaster, bumpScale: .003 });
const ceilingWhite = new THREE.MeshStandardMaterial({ color: '#b9afa3', roughness: .95 });
const cream = new THREE.MeshStandardMaterial({ color: '#b3a08b', roughness: .8, bumpMap: plaster, bumpScale: .004 });
const trim = new THREE.MeshStandardMaterial({ color: '#ddd5c9', roughness: .7 });
const black = new THREE.MeshStandardMaterial({ color: '#111715', roughness: .48 });
const matboard = new THREE.MeshStandardMaterial({ color: '#eeeade', roughness: .94 });

function box(parent, name, x, y, z, sx, sy, sz, mat) {
  const mesh = new THREE.Mesh(boxGeo, mat);
  mesh.name = name; mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz);
  mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}

function horizontalMouldings(parent, x1, x2, z, ceiling = false) {
  box(parent, 'white baseboard', (x1 + x2) / 2, .085, z + .035, x2 - x1, .17, .07, trim);
  box(parent, 'baseboard cap', (x1 + x2) / 2, .175, z + .046, x2 - x1, .035, .092, trim);
  if (ceiling) {
    box(parent, 'cornice lower fillet', (x1 + x2) / 2, 3.49, z + .035, x2 - x1, .045, .07, trim);
    box(parent, 'cornice cove', (x1 + x2) / 2, 3.55, z + .065, x2 - x1, .08, .13, white);
    box(parent, 'cornice crown', (x1 + x2) / 2, 3.61, z + .10, x2 - x1, .055, .20, trim);
  }
}

// All openings are real holes through extruded masonry; the rear world never changes.
function wallWithOpening(parent, name, x1, x2, opening, wallMat, z = 0, depth = .29) {
  const shape = new THREE.Shape();
  shape.moveTo(x1, 0); shape.lineTo(x1, 3.65); shape.lineTo(x2, 3.65); shape.lineTo(x2, 0);
  shape.lineTo(opening.right, 0); shape.lineTo(opening.right, opening.spring);
  if (opening.radius) {
    shape.absellipse((opening.left + opening.right) / 2, opening.spring, opening.radius, opening.radiusY || opening.radius, 0, Math.PI, false);
  } else {
    shape.lineTo(opening.left, opening.spring);
  }
  shape.lineTo(opening.left, 0); shape.lineTo(x1, 0);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 64 });
  const mesh = new THREE.Mesh(geometry, wallMat);
  mesh.name = name; mesh.position.z = z - depth; mesh.castShadow = mesh.receiveShadow = true;
  parent.add(mesh);
}

box(shared, 'left gallery wall', -4.135, 1.825, 3.7, .29, 3.65, 7.4, blue);
box(shared, 'white foreground ceiling', 1.8, 3.72, 3.6, 12.2, .14, 7.2, ceilingWhite);
wallWithOpening(shared, 'shared left doorway wall', -4, .535, { left: -3.48, right: -2.78, spring: 2.44 }, blue, -.001);
box(shared, 'small doorway left reveal', -3.45, 1.22, -.17, .06, 2.44, .44, cream);
box(shared, 'small doorway right reveal', -2.81, 1.22, -.17, .06, 2.44, .44, cream);
box(shared, 'small doorway header reveal', -3.13, 2.42, -.17, .70, .05, .44, cream);
box(shared, 'small passage far wall', -3.0, 1.8, -1.6, 2, 3.6, .15, white);
box(shared, 'small passage side', -3.65, 1.8, -.9, .15, 3.6, 1.7, cream);
horizontalMouldings(shared, -4, -3.48, 0);
horizontalMouldings(shared, -2.78, .52, 0);
box(shared, 'continuous main cornice lower fillet', 1.5, 3.49, .035, 11, .045, .07, trim);
box(shared, 'continuous main cornice cove', 1.5, 3.55, .065, 11, .08, .13, white);
box(shared, 'continuous main cornice crown', 1.5, 3.61, .10, 11, .055, .20, trim);
const leftMouldings = new THREE.Group(); leftMouldings.name = 'left wall mouldings';
leftMouldings.position.set(-4, 0, 0); leftMouldings.rotation.y = Math.PI / 2; shared.add(leftMouldings);
horizontalMouldings(leftMouldings, -7.4, 0, 0, true);

const archState = new THREE.Group(); archState.name = '601 broad arched partition';
const doorState = new THREE.Group(); doorState.name = '681 narrow doorway partition';
partitionRoot.add(archState, doorState);
wallWithOpening(archState, 'blue arched masonry', .52, 7, { left: .52, right: 3.14, spring: 2.0, radius: 1.31, radiusY: 1.13 }, blue, 0, .68);
wallWithOpening(doorState, 'restored blue masonry with narrow doorway', .52, 7, { left: .60, right: 1.83, spring: 2.40 }, blue, 0, .68);
function archTrim(parent) {
  const shape = new THREE.Shape();
  shape.moveTo(.52, 0); shape.lineTo(.52, 2);
  shape.absellipse(1.83, 2, 1.31, 1.13, Math.PI, 0, true);
  shape.lineTo(3.14, 0); shape.lineTo(3.06, 0); shape.lineTo(3.06, 2);
  shape.absellipse(1.83, 2, 1.23, 1.05, 0, Math.PI, false);
  shape.lineTo(.60, 0); shape.closePath();
  const mesh = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: .705, bevelEnabled: false, curveSegments: 80 }), cream);
  mesh.name = 'continuous cream arch lining'; mesh.position.z = -.69;
  mesh.castShadow = mesh.receiveShadow = true; parent.add(mesh);
}
archTrim(archState);
horizontalMouldings(archState, 3.14, 7, 0);
horizontalMouldings(archState, .52, .60, .045, false);
horizontalMouldings(doorState, .52, .60, 0);
horizontalMouldings(doorState, 1.83, 7, 0);
for (const x of [.60, 1.83]) {
  box(doorState, 'cream door jamb', x, 1.20, -.33, .06, 2.40, .72, cream);
  for (let layer = 0; layer < 3; layer++) {
    const dir = x < 1 ? -1 : 1;
    box(doorState, 'stepped vertical door casing', x + dir * (.037 + layer * .021), 1.22, .027 + layer * .012,
      .024, 2.44 + layer * .043, .030, trim);
  }
}
box(doorState, 'door soffit', 1.215, 2.40, -.33, 1.29, .06, .72, cream);
for (let layer = 0; layer < 3; layer++) box(doorState, 'stepped top door casing', 1.215, 2.44 + layer * .0215, .027 + layer * .012,
  1.36 + layer * .042, .027, .030, trim);

box(shared, 'rear gallery back white wall', 1.05, 1.825, -5.5, 6.0, 3.65, .20, white);
box(shared, 'rear gallery left white wall', -1.975, 1.825, -3.1, .15, 3.65, 4.8, white);
box(shared, 'rear gallery right white wall', 4.12, 1.825, -3.1, .18, 3.65, 4.8, white);
box(shared, 'rear white ceiling', 1.03, 3.70, -3.1, 6.25, .1, 4.8, white);
horizontalMouldings(shared, -1.9, 4.1, -5.39, true);
const rearSideMould = new THREE.Group(); rearSideMould.name = 'rear side cornice';
rearSideMould.position.set(-1.90, 0, -.70); rearSideMould.rotation.y = Math.PI / 2; shared.add(rearSideMould);
horizontalMouldings(rearSideMould, 0, 4.69, 0, true);

const floorMats = [];
for (let i = 0; i < 10; i++) floorMats.push(new THREE.MeshStandardMaterial({
  map: oakTexture(100 + i), color: new THREE.Color().setHSL(.08, .13, .42 + i * .010),
  roughness: .42 + i * .016, metalness: 0
}));
box(shared, 'subfloor between plank seams', 1, -.068, 1.1, 13, .08, 15, new THREE.MeshStandardMaterial({ color: '#4b3425' }));
const random = rng(18);
for (let col = 0; col < 49; col++) {
  const x = -4.05 + col * .224;
  for (let row = 0; row < 9; row++) {
    const z = -5.5 + row * 1.54 + (col % 3) * .513;
    box(shared, 'individual oak floor plank', x, -.018, z, .221, .037, 1.536, floorMats[Math.floor(random() * floorMats.length)]);
  }
}

function artwork(parent, name, width, height, texture, abstract = false) {
  const g = new THREE.Group(); g.name = name; parent.add(g);
  const edge = abstract ? new THREE.MeshStandardMaterial({ color: '#8b8066', roughness: .66 }) : black;
  box(g, 'slim frame', 0, 0, 0, width, height, .036, edge);
  box(g, 'offwhite mat board', 0, 0, .021, width - .035, height - .035, .012, matboard);
  const artW = abstract ? width - .065 : width * .59;
  const artH = abstract ? height - .065 : height * .70;
  const image = new THREE.Mesh(new THREE.PlaneGeometry(artW, artH),
    new THREE.MeshStandardMaterial({ map: texture, roughness: .92, color: '#ffffff' }));
  image.name = abstract ? 'procedural abstract canvas' : 'procedural architectural print';
  image.position.z = .03; g.add(image);
  return g;
}
function label(parent, x, y, z, angle = 0) {
  const g = new THREE.Group(); g.name = 'small museum artwork caption'; g.position.set(x, y, z); g.rotation.y = angle; parent.add(g);
  box(g, 'caption paper', 0, 0, 0, .135, .205, .007, matboard);
  const ink = new THREE.MeshStandardMaterial({ color: '#93978f', roughness: 1 });
  for (let i = 0; i < 9; i++) box(g, 'caption rule', -.002, .065 - i * .012, .004, i > 6 ? .067 : .103, .002, .001, ink);
}
const leftArt = [[1.81, 2.07, .60, .80], [.944, 2.055, .62, .79], [1.81, 1.365, .60, .57], [.944, 1.365, .70, .58]];
leftArt.forEach(([z, y, w, h], i) => {
  const p = artwork(shared, `left wall architecture ${i + 1}`, w, h, architectureTexture(300 + i, i));
  p.position.set(-3.974, y, z); p.rotation.y = Math.PI / 2;
});
label(shared, -3.947, 1.36, .49, Math.PI / 2);
label(shared, -3.947, 1.31, 2.70, Math.PI / 2);
const mainArt = [[-2.127, 1.94, .56, .61], [-1.383, 1.945, .57, .62], [-2.127, 1.27, .56, .51], [-1.383, 1.28, .57, .50], [-.35, 1.68, .73, .83]];
mainArt.forEach(([x, y, w, h], i) => {
  const p = artwork(shared, `center wall architecture ${i + 1}`, w, h, architectureTexture(401 + i, i));
  p.position.set(x, y, .046);
});
label(shared, .20, 1.32, .065);
label(shared, -.88, 1.39, .065);
for (let i = 0; i < 2; i++) {
  const p = artwork(shared, `cropped right wall architecture ${i + 1}`, .90, i ? .56 : .44, architectureTexture(430 + i, i + 2));
  p.position.set(3.94, i ? 1.34 : 1.90, .045);
}
const sidePainting = artwork(shared, 'rear side portrait abstract', .68, .90, abstractTexture(71), true);
sidePainting.position.set(-1.885, 1.65, -4.68); sidePainting.rotation.y = Math.PI / 2;
label(shared, -1.881, 1.37, -4.95, Math.PI / 2);
for (let i = 0; i < 2; i++) {
  const p = artwork(shared, `rear small landscape ${i + 1}`, .69, .52, abstractTexture(85 + i), true);
  p.position.set(-.74, 1.95 - i * .60, -5.373);
}
const large = artwork(shared, 'large rear blue ochre painting', 2.06, 1.38, abstractTexture(89), true);
large.position.set(1.53, 1.79, -5.371);

shared.add(person({ name: 'older man viewing left prints', type: 'older-man', position: [-2.073, 0, 2.038], rotation: -2.38, scale: 1.08, seed: 11 }));
shared.add(person({ name: 'older woman viewing left prints', type: 'older-woman', position: [-2.839, 0, 2.182], rotation: -2.21, scale: .985, seed: 21 }));
shared.add(person({ name: 'olive coated woman reading leaflet', type: 'reader', position: [-.114, 0, 1.017], rotation: 2.13, scale: 1.015, seed: 43 }));
shared.add(person({ name: 'rear older man', type: 'older-man', position: [.398, 0, -3.773], rotation: 1.80, scale: 1.07, seed: 15 }));
shared.add(person({ name: 'rear plaid coated woman', type: 'plaid', position: [.903, 0, -3.745], rotation: 3.05, scale: 1.0, seed: 17 }));
const wood = new THREE.MeshStandardMaterial({ map: oakTexture(551), color: '#c0a17c', roughness: .49 });
box(shared, 'rear wooden bench top', 1.20, .51, -2.95, 1.9, .065, .45, wood);
for (const x of [.32, 2.08]) for (const z of [-3.11, -2.79]) box(shared, 'rear wooden bench leg', x, .239, z, .068, .478, .068, wood);
box(shared, 'rear bench front apron', 1.20, .435, -2.755, 1.83, .10, .05, wood);
const tableLeaflet = new THREE.Group(); tableLeaflet.name = 'small information sheet resting on rear table';
tableLeaflet.position.set(1.89, .73, -2.94); tableLeaflet.rotation.x = -.23; shared.add(tableLeaflet);
box(tableLeaflet, 'inclined table sheet', 0, 0, 0, .48, .38, .009, matboard);
for (let i = 0; i < 18; i++) box(tableLeaflet, 'printed sheet rule', 0, .13 - i * .013, .006, i > 13 ? .26 : .36, .002, .001, new THREE.MeshStandardMaterial({ color: '#848782' }));

const hemi = new THREE.HemisphereLight('#fff3e2', '#b9b2a4', .85); hemi.name = 'soft gallery ambient'; scene.add(hemi);
const ambient = new THREE.AmbientLight('#fff8ef', 1.6); ambient.name = 'shared diffuse interior bounce'; scene.add(ambient);
function ceilingFill(name, position, intensity) {
  const light = new THREE.PointLight('#fff1e1', intensity, 20, 1);
  light.name = name; light.position.set(...position); light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.camera.near = .08; light.shadow.camera.far = 20;
  light.shadow.normalBias = .025; light.shadow.bias = -.0003; light.shadow.radius = 4;
  scene.add(light);
}
ceilingFill('soft ceiling key sample northwest', [-.65, 3.15, 2.15], 2);
ceilingFill('soft ceiling key sample northeast', [.25, 3.15, 2.15], 2);
ceilingFill('soft ceiling key sample southwest', [-.65, 3.15, 2.65], 2);
ceilingFill('soft ceiling key sample southeast', [.25, 3.15, 2.65], 2);
ceilingFill('right gallery bounced fill', [3.1, 3.20, 2.0], 5);
ceilingFill('rear gallery soft white fill', [.9, 3.05, -3.0], 7);
function track(parent, name, a, b) {
  const delta = new THREE.Vector3(...b).sub(new THREE.Vector3(...a));
  const rail = box(parent, name, ...new THREE.Vector3(...a).add(new THREE.Vector3(...b)).multiplyScalar(.5).toArray(), .024, .025, delta.length(), trim);
  rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), delta.normalize());
}
track(shared, 'foreground ceiling light rail', [-3.5, 3.60, 1.0], [5.5, 3.60, 1.0]);
track(shared, 'left ceiling light rail', [-3.5, 3.60, 1], [-3.5, 3.60, 6]);
track(shared, 'rear ceiling light rail', [-1.6, 3.56, -4.5], [3.7, 3.56, -4.5]);
function spotlight(x, z, tx, ty, tz, power, back = false) {
  const mount = new THREE.Group(); mount.name = 'white adjustable track spotlight'; mount.position.set(x, 3.54, z); shared.add(mount);
  box(mount, 'spot mount', 0, 0, 0, .08, .075, .10, white);
  const target = new THREE.Vector3(tx, ty, tz);
  const head = new THREE.Mesh(new THREE.CylinderGeometry(.055, .064, .16, 20), white);
  head.name = 'angled spotlight barrel'; head.position.y = -.10;
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), target.clone().sub(new THREE.Vector3(x, 3.44, z)).normalize()); mount.add(head);
  const light = new THREE.SpotLight('#fff0d9', power * .30, 12, .86, 1, 1.3);
  light.name = back ? 'rear artwork wash' : 'foreground artwork wash';
  light.position.set(x, 3.41, z); light.target.position.copy(target); scene.add(light, light.target);
}
spotlight(-2.0, 1, -2.1, 1.6, 0, 17);
spotlight(-.3, 1, -.3, 1.8, 0, 17);
spotlight(3.8, 1, 3.8, 1.8, 0, 17);
spotlight(-3.5, 2.2, -4, 1.8, 2.2, 14);
spotlight(-3.5, 3.7, -4, 1.8, 3.5, 14);
spotlight(-.5, -4.5, -.7, 1.6, -5.5, 14, true);
spotlight(1.6, -4.5, 1.5, 1.8, -5.5, 19, true);
spotlight(-1.5, -2.8, -1.9, 1.8, -4.3, 12, true);
box(shared, 'small white wall sensor', -3.96, 2.73, .18, .06, .12, .07, trim);

let variant = '601', currentTime = 0;
function cameraTravel(u) {
  const acceleration = .14, deceleration = .18;
  const distance = 1 - (acceleration + deceleration) / 2;
  if (u < acceleration) return (u / 2 - acceleration * Math.sin(Math.PI * u / acceleration) / (2 * Math.PI)) / distance;
  if (u <= 1 - deceleration) return (u - acceleration / 2) / distance;
  const remaining = 1 - u;
  return 1 - (remaining / 2 - deceleration * Math.sin(Math.PI * remaining / deceleration) / (2 * Math.PI)) / distance;
}
function seek(seconds) {
  if (!Number.isFinite(seconds)) throw new TypeError('seek requires finite seconds');
  currentTime = THREE.MathUtils.clamp(seconds, 0, DURATION);
  const pose = cameraAt(currentTime);
  camera.position.set(...pose.position);
  camera.fov = pose.fov;
  camera.updateProjectionMatrix();
  camera.lookAt(...pose.target);
  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}
function setVariant(id) {
  if (id !== '601' && id !== '681') throw new RangeError('variant must be 601 or 681');
  variant = id;
  archState.visible = id === '601'; doorState.visible = id === '681';
  renderer.shadowMap.needsUpdate = true;
  seek(currentTime);
}
function getCameraState() {
  return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
}
function serialize(root, excluded) {
  const geometries = {}, materials = {}, objects = [];
  const visit = (object, parent) => {
    if (object === excluded) return;
    const record = {
      id: object.uuid, parent, name: object.name, type: object.type,
      position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray(),
      visible: object.visible, castShadow: object.castShadow, receiveShadow: object.receiveShadow
    };
    if (object.geometry) {
      record.geometry = object.geometry.uuid;
      if (!geometries[record.geometry]) geometries[record.geometry] = object.geometry.toJSON();
    }
    if (object.material) {
      const list = Array.isArray(object.material) ? object.material : [object.material];
      record.materials = list.map(m => m.uuid);
      for (const mat of list) if (!materials[mat.uuid]) materials[mat.uuid] = mat.toJSON();
    }
    if (object.isLight) {
      record.light = { color: object.color.toArray(), intensity: object.intensity, distance: object.distance,
        angle: object.angle, penumbra: object.penumbra, decay: object.decay, groundColor: object.groundColor?.toArray(),
        target: object.target?.uuid, shadow: object.shadow?.toJSON() };
    }
    objects.push(record);
    for (const child of object.children) visit(child, object.uuid);
  };
  visit(root, null);
  return { objects, geometries, materials };
}
window.reconstruction = {
  pause() {},
  seek,
  setVariant,
  getCameraState,
  getInvariantState() {
    return { ...serialize(scene, partitionRoot), camera: getCameraState(), cameraProjection: { aspect: camera.aspect, near: camera.near, far: camera.far },
      renderer: { exposure: renderer.toneMappingExposure, toneMapping: renderer.toneMapping, shadowType: renderer.shadowMap.type },
      background: scene.background.toArray() };
  },
  getEditedObjectState() { return { variant, ...serialize(partitionRoot) }; }
};
setVariant('601');

// Project-page adapter: expose the reviewed source to the read-only inspector.
window.__bfCapture = {THREE, renderer, scene, camera};
