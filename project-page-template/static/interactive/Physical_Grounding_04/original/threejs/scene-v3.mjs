import * as THREE from './vendor/three.module.js';

const optics = await (await fetch('./optics-v1.json')).json();
const geom = optics.geometry;
const rays = optics.rays;
const canvas = document.getElementById('proxy');
const renderer = new THREE.WebGLRenderer({canvas, antialias: false, preserveDrawingBuffer: true});
renderer.getContext().disable(renderer.getContext().DITHER);
renderer.setSize(2560, 1440, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.07;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const deliveryCanvas = document.createElement('canvas');
deliveryCanvas.width = 1280;
deliveryCanvas.height = 720;
const deliveryContext = deliveryCanvas.getContext('2d');
deliveryContext.imageSmoothingEnabled = true;
deliveryContext.imageSmoothingQuality = 'high';
scene.background = new THREE.Color('#151c23');
scene.fog = new THREE.Fog('#151c23', 21, 38);
const camera = new THREE.PerspectiveCamera(78.529, 16 / 9, 0.05, 65);
camera.position.set(0.6, 3.0, 2.0);
camera.lookAt(0.0, 0.7, -1.0);
const world = (p, height = geom.beam_height) => new THREE.Vector3(p[0], height, p[1]);
const standard = (color, roughness = 0.55, metalness = 0) => new THREE.MeshStandardMaterial({color, roughness, metalness});
const black = standard('#242a30', 0.33, 0.7);
const steel = standard('#89939b', 0.23, 0.86);
const rubber = standard('#111418', 0.85);

function box(size, position, material, angle = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.rotation.y = angle;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
function cylinder(radius, length, position, material) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, length, 32), material);
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}
function segment(a, b, radius, material) {
  const d = b.clone().sub(a);
  const mesh = cylinder(radius, d.length(), a.clone().add(b).multiplyScalar(0.5).toArray(), material);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  return mesh;
}
function meshTriangles(positions, colors, opacity, additive = false) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const m = new THREE.MeshBasicMaterial({
    color: 0xffffff, vertexColors: Boolean(colors), side: THREE.DoubleSide,
    transparent: true, opacity, depthWrite: false,
    blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    toneMapped: false,
  });
  const mesh = new THREE.Mesh(g, m);
  scene.add(mesh);
  return mesh;
}

scene.add(new THREE.HemisphereLight('#b5c5dc', '#3a3027', 0.8));
const key = new THREE.DirectionalLight('#fff0d9', 2.5);
key.position.set(-3, 8, 3);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, {left: -7, right: 7, top: 7, bottom: -7, near: 0.1, far: 24});
key.shadow.bias = -0.0002;
key.shadow.normalBias = 0.02;
key.target.position.set(0, 0, -2);
scene.add(key, key.target);
const rim = new THREE.DirectionalLight('#a3cce8', 1.4);
rim.position.set(4, 4, -7);
scene.add(rim);
box([11.6, 0.25, 8.7], [0.4, -0.18, -1.7], standard('#2d3335', 0.76));
box([11.8, 0.11, 8.9], [0.4, -0.34, -1.7], black);
box([50, 0.15, 50], [0, -2.0, 0], standard('#36363a', 0.95));
for (const x of [-4.3, 4.8]) for (const z of [-5.2, 1.6]) {
  box([0.22, 1.7, 0.22], [x, -1.13, z], black);
}
// Instanced optical-table mounting holes, never a photographic texture.
const holes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.012, 10), rubber, 540);
const transform = new THREE.Object3D();
let holeIndex = 0;
for (let x = -4.65; x < 5.4; x += 0.45) for (let z = -5.5; z < 2.35; z += 0.45) {
  transform.position.set(x, -0.048, z);
  transform.updateMatrix();
  holes.setMatrixAt(holeIndex++, transform.matrix);
}
holes.count = holeIndex;
scene.add(holes);
box([16, 7, 0.20], [0, 1.2, -8.5], standard('#485155', 0.95));
box([5.2, 2.1, 0.07], [-3.6, 2.1, -8.32], standard('#24423e', 0.95));
box([5.4, 0.06, 0.09], [-3.6, 1.04, -8.20], steel);
box([2.4, 0.15, 0.72], [4.5, 0.7, -7.5], standard('#5a4d3f', 0.8));
for (let i = 0; i < 5; i++) box([0.15, 0.42 + i * 0.05, 0.35], [3.9 + i * 0.18, 1.00 + i * 0.025, -7.48], standard(['#626e76', '#785953', '#465665'][i % 3]));

const source = rays[0].origin;
box([0.94, 0.58, 0.55], [source[0] - 0.50, geom.beam_height, source[1]], black);
box([0.70, 0.13, 0.72], [source[0] - 0.47, 0.06, source[1]], black);
cylinder(0.047, 0.40, [source[0] - 0.47, 0.30, source[1]], steel);
for (let i = 0; i < 6; i++) box([0.026, 0.21, 0.008], [source[0] - 0.80 + i * 0.075, geom.beam_height + 0.08, 0.28], rubber);
const snout = cylinder(0.16, 0.22, [source[0] - 0.03, geom.beam_height, source[1]], steel);
snout.rotation.z = Math.PI / 2;
box([0.025, 0.30, 0.30], [source[0] + 0.081, geom.beam_height, source[1]], rubber);
box([0.027, geom.slit_height, geom.slit_width], [source[0] + 0.096, geom.beam_height, source[1]], new THREE.MeshBasicMaterial({color: '#fff3dd', toneMapped: false}));
const sourceLamp = new THREE.PointLight('#ffecd6', 1.1, 1.4);
sourceLamp.position.set(source[0] + 0.18, geom.beam_height, 0);
scene.add(sourceLamp);

const center = geom.vertices.reduce((v, p) => v.add(world(p, 0)), new THREE.Vector3()).multiplyScalar(1 / 3);
cylinder(0.78, 0.12, [center.x, 0.09, center.z], black);
cylinder(0.053, 0.21, [center.x, 0.255, center.z], steel);
cylinder(0.63, 0.052, [center.x, 0.388, center.z], black);
const glassPositions = [];
const glassVertex = (index, h) => world(geom.vertices[index], h).toArray();
function glassTri(a, b, c) { glassPositions.push(...a, ...b, ...c); }
for (let i = 0; i < 3; i++) {
  const j = (i + 1) % 3;
  glassTri(glassVertex(i, geom.prism_bottom), glassVertex(j, geom.prism_bottom), glassVertex(j, geom.prism_top));
  glassTri(glassVertex(i, geom.prism_bottom), glassVertex(j, geom.prism_top), glassVertex(i, geom.prism_top));
}
glassTri(...[0, 2, 1].map(i => glassVertex(i, geom.prism_bottom)));
glassTri(...[0, 1, 2].map(i => glassVertex(i, geom.prism_top)));
const glassGeometry = new THREE.BufferGeometry();
glassGeometry.setAttribute('position', new THREE.Float32BufferAttribute(glassPositions, 3));
glassGeometry.computeVertexNormals();
const glass = new THREE.Mesh(glassGeometry, new THREE.MeshPhysicalMaterial({
  color: '#d5e8ef', metalness: 0, roughness: 0.07, transparent: true,
  opacity: 0.095, side: THREE.DoubleSide, depthWrite: false,
  clearcoat: 1, clearcoatRoughness: 0.04,
}));
glass.renderOrder = 4;
scene.add(glass);
const edges = new THREE.LineSegments(new THREE.EdgesGeometry(glassGeometry, 20), new THREE.LineBasicMaterial({color: '#d7edf5', transparent: true, opacity: 0.68}));
scene.add(edges);
for (const p of geom.vertices) {
  cylinder(0.062, 0.035, [p[0] * 0.88 + center.x * 0.12, 0.424, p[1] * 0.88 + center.z * 0.12], rubber);
}

const screen = geom.screen;
const screenYaw = Math.atan2(-screen.tangent[1], screen.tangent[0]);
const screenPosition = [screen.center[0] - screen.normal[0] * 0.030, 0.88, screen.center[1] - screen.normal[1] * 0.030];
box([screen.width + 0.08, screen.height + 0.08, 0.045], screenPosition, black, screenYaw);
const paperPosition = [screen.center[0] - screen.normal[0] * 0.0035, 0.88, screen.center[1] - screen.normal[1] * 0.0035];
box([screen.width, screen.height, 0.007], paperPosition, standard('#f3f3eb', 0.97), screenYaw);
box([1.05, 0.12, 0.8], [screen.center[0], 0.03, screen.center[1]], black, screenYaw);
cylinder(0.045, 0.24, [screen.center[0], 0.19, screen.center[1]], steel);

// This display conversion only colors numerical wavelength samples; it never sets geometry.
function spectralColor(nm) {
  let rgb;
  if (nm < 440) rgb = [(440 - nm) / 40, 0, 1];
  else if (nm < 490) rgb = [0, (nm - 440) / 50, 1];
  else if (nm < 510) rgb = [0, 1, (510 - nm) / 20];
  else if (nm < 580) rgb = [(nm - 510) / 70, 1, 0];
  else if (nm < 645) rgb = [1, (645 - nm) / 65, 0];
  else rgb = [1, 0, 0];
  return new THREE.Color(...rgb.map(v => Math.max(0, Math.min(1, v))));
}
function spectralSurface(startField, endField, height, opacity) {
  const positions = [], colors = [];
  for (let i = 0; i < rays.length - 1; i++) {
    const a = rays[i], b = rays[i + 1];
    for (const [r, field] of [[a, startField], [a, endField], [b, endField], [a, startField], [b, endField], [b, startField]]) {
      positions.push(...world(r[field], height).toArray());
      colors.push(...spectralColor(r.wavelength_nm).toArray());
    }
  }
  return meshTriangles(positions, colors, opacity, false);
}
const beamObjects = [];
beamObjects.push(spectralSurface('entry', 'exit', geom.beam_height, 0.50));
beamObjects.push(spectralSurface('exit', 'screen_hit', geom.beam_height, 0.55));
// A dim parallel layer represents the finite slit height, not a displaced ray centerline.
for (const offset of [-geom.slit_height / 2, geom.slit_height / 2]) {
  beamObjects.push(spectralSurface('exit', 'screen_hit', geom.beam_height + offset, 0.025));
}
const internalSegments = [];
for (const ray of rays) {
  // Coaxial thickness/scatter only: endpoints and all 301 directions are immutable.
  for (const [radius, opacity] of [[0.009, 0.018], [0.024, 0.002]]) {
    const material = new THREE.MeshBasicMaterial({
      color: spectralColor(ray.wavelength_nm), transparent: true, opacity,
      blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false,
    });
    const mesh = segment(world(ray.entry), world(ray.exit), radius, material);
    mesh.renderOrder = 3;
    internalSegments.push({mesh, ray, radius});
  }
}
const origin = world(rays[0].origin);
const entry = world(rays[0].entry);
const whiteMaterial = new THREE.MeshBasicMaterial({color: '#fff7e8', transparent: true, opacity: 0.78, depthWrite: false, toneMapped: false});
beamObjects.push(segment(origin, entry, geom.slit_width / 2, whiteMaterial));
const ribbon = [];
for (const p of [origin, entry, entry, origin, entry, origin]) {
  const index = ribbon.length / 3;
  ribbon.push(p.x, p.y + ([-1, -1, 1, -1, 1, 1][index]) * geom.slit_height / 2, p.z);
}
beamObjects.push(meshTriangles(ribbon, null, 0.07, true));
const spectrumPositions = [], spectrumColors = [];
for (let i = 0; i < rays.length - 1; i++) {
  const a = rays[i], b = rays[i + 1];
  for (const [r, vertical] of [[a, -1], [b, -1], [b, 1], [a, -1], [b, 1], [a, 1]]) {
    const p = world(r.screen_hit, geom.beam_height + vertical * geom.slit_height / 2);
    spectrumPositions.push(...p.toArray());
    spectrumColors.push(...spectralColor(r.wavelength_nm).toArray());
  }
}
const spectrum = meshTriangles(spectrumPositions, spectrumColors, 1);
spectrum.renderOrder = 8;
spectrum.material.polygonOffset = true;
spectrum.material.polygonOffsetFactor = -1;
spectrum.material.polygonOffsetUnits = -1;
const dustPositions = [];
let seed = 5012026;
const seeded = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
for (let i = 0; i < 150; i++) {
  const ray = rays[Math.floor(seeded() * rays.length)];
  const t = seeded();
  const p = world(ray.exit).lerp(world(ray.screen_hit), t);
  p.y += (seeded() - 0.5) * geom.slit_height;
  dustPositions.push(...p.toArray());
}
const dustGeometry = new THREE.BufferGeometry();
dustGeometry.setAttribute('position', new THREE.Float32BufferAttribute(dustPositions, 3));
scene.add(new THREE.Points(dustGeometry, new THREE.PointsMaterial({color: '#fff1db', size: 0.009, transparent: true, opacity: 0.18, depthWrite: false})));

let currentTime = 0;
function seek(time) {
  if (!Number.isFinite(time)) throw new Error('A finite absolute time is required');
  currentTime = Math.max(0, Math.min(5, time));
  // Exposure-only breathing is deliberately tiny; all optical geometry and camera are immutable.
  renderer.toneMappingExposure = 1.07 + 0.004 * Math.sin(2 * Math.PI * currentTime / 5);
  renderer.render(scene, camera);
}
function diagnostics() {
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld();
  let stateHash = 2166136261;
  const seen = new Set();
  const accumulate = values => {
    for (const v of values) stateHash = Math.imul(stateHash ^ Math.round(v * 1e7), 16777619) >>> 0;
  };
  scene.traverse(object => {
    accumulate(object.matrixWorld.elements);
    if (object.instanceMatrix) accumulate(object.instanceMatrix.array);
    if (object.geometry && !seen.has(object.geometry)) {
      seen.add(object.geometry);
      for (const attribute of Object.values(object.geometry.attributes)) accumulate(attribute.array);
    }
  });
  const projected = {};
  const project = p => {
    const ndc = p.clone().project(camera);
    return [(ndc.x + 1) * 640, (1 - ndc.y) * 360, ndc.z];
  };
  for (const [name, p] of Object.entries({source: world(rays[0].origin), entry: world(rays[0].entry),
    violetExit: world(rays[0].exit), redExit: world(rays.at(-1).exit),
    violetScreen: world(rays[0].screen_hit), redScreen: world(rays.at(-1).screen_hit)})) {
    projected[name] = project(p);
  }
  const prismVertices = geom.vertices.flatMap(p => [geom.prism_bottom, geom.prism_top].map(h => project(world(p, h))));
  const sourceCorners = [];
  for (const x of [source[0] - 0.97, source[0] + 0.11])
    for (const y of [0, geom.beam_height + 0.29])
      for (const z of [-0.36, 0.36]) sourceCorners.push(project(new THREE.Vector3(x, y, z)));
  const screenCorners = [-0.89, 0.89].flatMap(u => [0, 1.695].map(h => project(world([
    screen.center[0] + screen.tangent[0] * u, screen.center[1] + screen.tangent[1] * u], h))));
  const bounds = points => ({left: Math.min(...points.map(p => p[0])), right: Math.max(...points.map(p => p[0])),
    top: Math.min(...points.map(p => p[1])), bottom: Math.max(...points.map(p => p[1]))});
  const prismBounds = bounds(prismVertices);
  const apparatusBounds = bounds([...sourceCorners, ...prismVertices, ...screenCorners]);
  const representative = [0, 150, 300].map(i => {
    const ray = rays[i];
    const interfaces = ['first_interface', 'second_interface'].map((field, index) => {
      const point = ray[index ? 'exit' : 'entry'];
      const normal = ray[field].normal_into_incident_medium;
      const incident = ray[index ? 'internal_direction' : 'incident_direction'];
      const transmitted = ray[index ? 'outgoing_direction' : 'internal_direction'];
      const arc = (a, b, radius) => {
        const start = Math.atan2(a[1], a[0]);
        const difference = Math.atan2(a[0] * b[1] - a[1] * b[0], a[0] * b[0] + a[1] * b[1]);
        return Array.from({length: 25}, (_, j) => {
          const angle = start + difference * j / 24;
          return project(world([point[0] + radius * Math.cos(angle), point[1] + radius * Math.sin(angle)]));
        });
      };
      return {field, ...ray[field], point: project(world(point)),
        projectedAngleArcs: {
          incident: arc(normal, incident.map(v => -v), 0.25),
          transmitted: arc(normal.map(v => -v), transmitted, 0.32),
        },
        normalEndpoints: [-0.48, 0.48].map(s => project(world([point[0] + s * normal[0], point[1] + s * normal[1]])))};
    });
    const points = Object.fromEntries(['origin', 'entry', 'exit', 'screen_hit'].map(k => [k, project(world(ray[k]))]));
    return {wavelengthNm: ray.wavelength_nm, n: ray.n, points, interfaces,
      internalPathPixels: Math.hypot(points.exit[0] - points.entry[0], points.exit[1] - points.entry[1])};
  });
  let maximumInternalEndpointResidual = 0;
  for (const {mesh, ray} of internalSegments) {
    const half = mesh.geometry.parameters.height / 2;
    for (const [s, field] of [[-1, 'entry'], [1, 'exit']]) {
      const actual = new THREE.Vector3(0, s * half, 0).applyMatrix4(mesh.matrixWorld);
      maximumInternalEndpointResidual = Math.max(maximumInternalEndpointResidual, actual.distanceTo(world(ray[field])));
    }
  }
  return {time: currentTime, camera: {position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov},
    rayCount: rays.length, projected, render: renderer.info.render,
    representative, prismVertices, sourceCorners, screenCorners,
    composition: {prismBounds, apparatusBounds, prismPixelHeight: prismBounds.bottom - prismBounds.top,
      prismHeightFraction: (prismBounds.bottom - prismBounds.top) / 720,
      apparatusWidthFraction: (apparatusBounds.right - apparatusBounds.left) / 1280,
      internalPathPixels550: representative[1].internalPathPixels,
      spectrumSeparationPixels: Math.hypot(projected.redScreen[0] - projected.violetScreen[0], projected.redScreen[1] - projected.violetScreen[1])},
    numericalGeometry: {maximumInternalEndpointResidual, drawnInternalSegments: internalSegments.length,
      screenCenter: screen.center, screenNormal: screen.normal, visibilityChanges: 'coaxial tubes, opacity, scatter only'},
    geometryAuthority: 'optics-v1.json', spectrumConstruction: '301 computed wavelength rays, adjacent vertex-colored cells',
    geometryStateHash: stateHash.toString(16), supersampling: 2, outputDimensions: [1280, 720], objects: scene.children.length,
    forbiddenTextures: scene.children.some(o => o.material?.map != null)};
}
for (let i = 0; i < 4; i++) seek(0);
window.reconstruction = {ready: true, pause() {}, seek, diagnostics, capture() {
  deliveryContext.drawImage(canvas, 0, 0, 1280, 720);
  return deliveryCanvas.toDataURL('image/png');
}};
