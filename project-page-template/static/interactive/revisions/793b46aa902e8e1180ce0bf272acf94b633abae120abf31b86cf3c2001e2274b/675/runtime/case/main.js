import * as THREE from '../vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x181c1c);
scene.fog = new THREE.FogExp2(0x272b2b, 0.007);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.86;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(47, WIDTH / HEIGHT, 0.08, 100);
camera.name = 'sharedCamera';
const world = new THREE.Group();
world.name = 'sharedGarage';
scene.add(world);

function randomFactory(seed) { window.__bfTrace?.add(24);
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function hash2(x, y, seed) { window.__bfTrace?.add(30);
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}
const smooth = v => v * v * (3 - 2 * v);
function noise(x, y, seed) { window.__bfTrace?.add(36);
  const ix = Math.floor(x), iy = Math.floor(y);
  const a = smooth(x - ix), b = smooth(y - iy);
  const p = THREE.MathUtils.lerp(hash2(ix, iy, seed), hash2(ix + 1, iy, seed), a);
  const q = THREE.MathUtils.lerp(hash2(ix, iy + 1, seed), hash2(ix + 1, iy + 1, seed), a);
  return THREE.MathUtils.lerp(p, q, b);
}
function concreteTexture(seed, wall = false) { window.__bfTrace?.add(43);
  const size = 1024;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const context = canvas.getContext('2d');
  const image = context.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const broad = noise(x / 95, y / (wall ? 145 : 95), seed);
      const medium = noise(x / 16, y / (wall ? 39 : 16), seed + 31);
      const fine = noise(x / 2.4, y / 2.4, seed + 117);
      const grain = hash2(x, y, seed + 87);
      const pits = grain < 0.07 ? -49 : 0;
      const value = 120 + broad * (wall ? 33 : 16) + medium * 25 + fine * 24 + grain * 35 + pits;
      const index = (y * size + x) * 4;
      image.data[index] = value;
      image.data[index + 1] = value * 0.99;
      image.data[index + 2] = value * 0.98;
      image.data[index + 3] = 255;
    }
  }
  context.putImageData(image, 0, 0);
  const rng = randomFactory(seed);
  for (let i = 0; i < (wall ? 1800 : 6800); i++) {
    const x = rng() * size, y = rng() * size;
    const radius = 1 + rng() * (wall ? 8 : 10);
    context.fillStyle = `rgba(25,27,25,${0.025 + rng() * (wall ? 0.08 : 0.21)})`;
    context.beginPath();
    for (let k = 0; k < 6; k++) {
      const angle = k * Math.PI / 3;
      const r = radius * (0.3 + rng() * 0.7);
      const px = x + Math.cos(angle) * r, py = y + Math.sin(angle) * r * (wall ? 1.8 : 0.7);
      if (k === 0) context.moveTo(px, py);
      else context.lineTo(px, py);
    }
    context.closePath();
    context.fill();
  }
  for (let i = 0; i < 70; i++) {
    const x = rng() * size, y = rng() * size;
    context.strokeStyle = `rgba(26,28,25,${0.02 + rng() * 0.06})`;
    context.lineWidth = 0.5 + rng() * 2;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x + rng() * 55 - 25, y + rng() * 38);
    context.lineTo(x + rng() * 70 - 20, y + rng() * 76);
    context.stroke();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = `generated-concrete-${seed}-${wall}`;
  texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.repeat.set(wall ? 5 : 6, wall ? 1 : 6);
  texture.userData.procedural = { algorithm: 'seeded multi-scale concrete value-noise with pits, irregular aggregate stains and cracks', seed, wall, size };
  return texture;
}
function standard(name, color, options = {}) { window.__bfTrace?.add(100);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.75, ...options });
  material.name = name;
  return material;
}
const floorMap = concreteTexture(31);
const wallMap = concreteTexture(82, true);
const ceilingMap = concreteTexture(182);
const columnMap = concreteTexture(411, true);
columnMap.repeat.set(0.65, 1.2);
const concrete = standard('grey stained wall concrete', 0x989b95, { map: wallMap, bumpMap: wallMap, bumpScale: 0.05 });
const floorMat = standard('worn concrete floor', 0x969992, { map: floorMap, bumpMap: floorMap, bumpScale: 0.038, roughness: 0.91 });
const ceilingMat = standard('dark rough ceiling', 0x93988e, { map: ceilingMap, bumpMap: ceilingMap, bumpScale: 0.065 });
const columnMat = standard('cast concrete columns', 0x989d95, { map: columnMap, bumpMap: columnMap, bumpScale: 0.042 });
const yellow = standard('muted safety yellow', 0xb69c32, { roughness: 0.84 });
const safetyBlack = standard('safety band black', 0x131615);
const lineMat = standard('aged white bay paint', 0xb7b8aa, { roughness: 0.92 });
const pipeMat = standard('red fire pipe enamel', 0x773733, { metalness: 0.28, roughness: 0.41 });
const darkMetal = standard('dark fixture steel', 0x343b3a, { metalness: 0.65, roughness: 0.44 });
const brightMetal = standard('brushed chrome', 0x9ba4a4, { metalness: 0.88, roughness: 0.25 });
const rubber = standard('black tire rubber', 0x101313, { roughness: 0.96 });
const glass = new THREE.MeshPhysicalMaterial({
  color: 0x131c20, metalness: 0, roughness: 0.24, transparent: true,
  opacity: 0.84, envMapIntensity: 0.35, specularIntensity: 0.14, ior: 1.4
});
glass.name = 'smoked automotive glass with restrained dielectric reflection';
const lampMat = standard('unlit headlamp glass', 0x9eaeb0, { metalness: 0.68, roughness: 0.18 });
const emissive = standard('fluorescent phosphor', 0xe7e9d9, { emissive: 0xe7eedf, emissiveIntensity: 3.5, roughness: 0.4 });

function mesh(parent, name, geometry, material, position = [0, 0, 0]) { window.__bfTrace?.add(129);
  const object = new THREE.Mesh(geometry, material);
  object.name = name;
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}
function box(parent, name, dimensions, material, position) { window.__bfTrace?.add(138);
  return mesh(parent, name, new THREE.BoxGeometry(...dimensions), material, position);
}
function cylinderBetween(parent, name, start, end, radius, material, sides = 12) { window.__bfTrace?.add(141);
  const a = new THREE.Vector3(...start), b = new THREE.Vector3(...end);
  const object = mesh(parent, name, new THREE.CylinderGeometry(radius, radius, a.distanceTo(b), sides), material);
  object.position.copy(a).add(b).multiplyScalar(0.5);
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.sub(a).normalize());
  return object;
}
function line(parent, name, points, material, radius = 0.008) { window.__bfTrace?.add(148);
  const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)));
  return mesh(parent, name, new THREE.TubeGeometry(curve, points.length * 5, radius, 6, false), material);
}
function shapeOnWall(parent, name, coords, material, position) { window.__bfTrace?.add(152);
  const shape = new THREE.Shape();
  coords.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  return mesh(parent, name, new THREE.ShapeGeometry(shape), material, position);
}
function patch(parent, name, points, material) { window.__bfTrace?.add(158);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points.flat(), 3));
  const indices = [];
  for (let i = 1; i < points.length - 1; i++) indices.push(0, i, i + 1);
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const object = mesh(parent, name, geometry, material);
  object.material.side = THREE.DoubleSide;
  return object;
}

box(world, 'floor', [36, 0.25, 38], floorMat, [0, -0.125, 3]);
box(world, 'rear wall', [29, 5.1, 0.45], concrete, [0, 2.55, -11.1]);
box(world, 'left side wall', [0.5, 5.1, 30], concrete, [-14.5, 2.55, 3.7]);
box(world, 'right side wall', [0.5, 5.1, 30], concrete, [14.5, 2.55, 3.7]);
box(world, 'ceiling', [29, 0.35, 34], ceilingMat, [0, 4.65, 3.4]);
box(world, 'rear yellow stripe', [28.8, 0.095, 0.012], yellow, [0, 0.87, -10.867]);
for (const side of [-1, 1]) {
  box(world, `${side} side yellow stripe`, [0.012, 0.095, 29], yellow, [side * 14.24, 0.87, 3.5]);
  const innerEdge = side < 0 ? -6.05 : 3.65;
  const soffitWidth = 14.5 - Math.abs(innerEdge);
  box(world, `${side} ceiling side soffit`, [soffitWidth, 0.48, 33], ceilingMat, [innerEdge + side * soffitWidth / 2, 4.19, 3.5]);
  box(world, `${side} soffit inner face`, [0.34, 0.4, 33], concrete, [innerEdge, 4.29, 3.5]);
  for (const z of [1.6, -9.7]) {
    const x = z > 0 ? (side < 0 ? -9.3 : 8.7) : side * 10.7;
    const column = new THREE.Group();
    column.name = `${side} column at ${z}`;
    column.position.set(x, 0, z);
    world.add(column);
    box(column, 'column shaft', [0.95, 4.55, 0.95], columnMat, [0, 2.275, 0]);
    if (z > 0) {
      box(column, 'upper yellow safety band', [0.984, 0.21, 0.984], yellow, [0, 0.93, 0]);
      box(column, 'middle black safety band', [0.99, 0.145, 0.99], safetyBlack, [0, 0.755, 0]);
      box(column, 'lower yellow safety band', [0.984, 0.22, 0.984], yellow, [0, 0.575, 0]);
    }
  }
}
const seamMat = standard('dark formwork seams', 0x494e47, { roughness: 1 });
for (let x = -13; x <= 13; x += 2.05) {
  box(world, `rear panel joint ${x}`, [0.015, 4.9, 0.006], seamMat, [x, 2.45, -10.869]);
  for (const y of [0.34, 2.05, 4.0]) {
    const hole = mesh(world, `form tie ${x} ${y}`, new THREE.CircleGeometry(0.027, 8), seamMat, [x + 0.16, y, -10.864]);
    hole.castShadow = false;
  }
}
for (const [x, sign] of [[-4.8, -1], [2.2, 1]]) {
  box(world, `${sign} arrow sign plaque`, [1.42, 0.7, 0.055], darkMetal, [x, 2.64, -10.825]);
  const arrow = [[-0.43, -0.07], [0.14, -0.07], [0.14, -0.21], [0.46, 0], [0.14, 0.21], [0.14, 0.07], [-0.43, 0.07]];
  shapeOnWall(world, `${sign} opposing sign arrow`, arrow.map(([a, b]) => [a * sign, b]), lineMat, [x, 2.64, -10.789]);
}
for (const z of [5.8, -0.4, -5.9, -9.7]) {
  cylinderBetween(world, `red cross pipe ${z}`, [-13.7, 4.18, z], [13.7, 4.18, z], 0.065, pipeMat, 16);
  for (const x of [-6, 0, 6]) {
    cylinderBetween(world, `pipe hanger ${x} ${z}`, [x, 4.26, z], [x, 4.48, z], 0.015, darkMetal);
    const ring = mesh(world, `pipe coupling ${x} ${z}`, new THREE.CylinderGeometry(0.077, 0.077, 0.12, 16), pipeMat, [x, 4.18, z]);
    ring.rotation.z = Math.PI / 2;
  }
}
cylinderBetween(world, 'main longitudinal fire pipe', [-1.6, 4.12, -10.9], [1.6, 4.12, 14], 0.072, pipeMat, 16);
for (const [cx, z] of [[0.87, 5.95], [0.1, 0.45], [-0.6, -5.15], [-0.8, -9.3]]) {
  box(world, `fluorescent housing ${z}`, [3.5, 0.1, 0.52], darkMetal, [cx, 4.41, z]);
  box(world, `fluorescent reflector ${z}`, [3.41, 0.04, 0.44], brightMetal, [cx, 4.339, z]);
  for (const dz of [-0.145, 0.145]) {
    cylinderBetween(world, `fluorescent tube ${z} ${dz}`, [cx - 1.63, 4.28, z + dz], [cx + 1.63, 4.28, z + dz], 0.034, emissive, 12);
  }
  for (const x of [cx - 1.70, cx + 1.70]) box(world, `tube endcap ${z} ${x}`, [0.1, 0.13, 0.48], darkMetal, [x, 4.33, z]);
}
const hemi = new THREE.HemisphereLight(0xb5c4c7, 0x6e7471, 0.65);
hemi.name = 'shared ambient';
scene.add(hemi);
for (const [index, z] of [5.95, 0.45, -5.15, -9.3].entries()) {
  const light = new THREE.SpotLight(0xe8ece8, 58, 27, Math.PI * 0.42, 0.85, 1.6);
  light.name = `fluorescent pool ${index}`;
  light.position.set(0, 4.12, z);
  light.target.position.set(0, 0, z - 1);
  light.castShadow = index === 1 || index === 3;
  light.shadow.mapSize.set(2048, 2048);
  light.shadow.bias = -0.0002;
  light.shadow.normalBias = 0.028;
  scene.add(light, light.target);
}
const rearWash = new THREE.PointLight(0xe6eceb, 18, 17, 1.6);
rearWash.name = 'rear fluorescent wall spill';
rearWash.position.set(0, 3.65, -8.8);
scene.add(rearWash);
for (const [cx, z] of [[0.87, 5.95], [0.1, 0.45], [-0.6, -5.15], [-0.8, -9.3]]) {
  const light = new THREE.PointLight(0xf0f0e6, 16, 10, 1.75);
  light.name = `fixture ceiling bounce ${z}`;
  light.position.set(cx, 3.75, z);
  scene.add(light);
}
for (const x of [-7.5, 6.5]) {
  const light = new THREE.SpotLight(0xd6dee0, 42, 18, Math.PI * 0.38, 0.95, 1.65);
  light.name = `fluorescent side fill ${x}`;
  light.position.set(x, 3.7, -4.8);
  light.target.position.set(x, 0.6, -7.8);
  light.castShadow = true;
  light.shadow.mapSize.set(1024, 1024);
  light.shadow.bias = -0.0002;
  light.shadow.normalBias = 0.025;
  scene.add(light, light.target);
}
const foregroundBounce = new THREE.SpotLight(0xe7e7de, 82, 18, Math.PI * 0.41, 1, 1.6);
foregroundBounce.name = 'soft foreground reflected fluorescent fill';
foregroundBounce.position.set(0, 4.05, 12);
foregroundBounce.target.position.set(0, 0, 9);
scene.add(foregroundBounce, foregroundBounce.target);

for (const x of [-11.1, -5.9, -2.45, 1.45, 5.2, 9.0, 12.8]) {
  box(world, `white bay divider ${x}`, [0.075, 0.009, 7.5], lineMat, [x, 0.009, -6.65]);
}
box(world, 'bay front transverse line', [26, 0.009, 0.075], lineMat, [0, 0.01, -2.9]);
for (const x of [-8.5, -4.175, -0.5, 3.325, 7.1, 10.9]) {
  const stop = box(world, `yellow wheel stop ${x}`, [1.9, 0.12, 0.27], yellow, [x, 0.07, -9.8]);
  for (const dx of [-0.65, 0.65]) box(stop, `wheel stop bolt ${dx}`, [0.05, 0.015, 0.07], darkMetal, [dx, 0.067, 0]);
}
function makeArrow() { window.__bfTrace?.add(275);
  const shape = new THREE.Shape();
  const vertices = [[-0.16, -2.15], [0.16, -2.15], [0.16, 0.8], [0.7, 0.8], [0, 1.8], [-0.7, 0.8], [-0.16, 0.8]];
  vertices.forEach(([x, y], i) => i ? shape.lineTo(x, y) : shape.moveTo(x, y));
  shape.closePath();
  const rng = randomFactory(159);
  for (let i = 0; i < 1700; i++) {
    const x = (rng() - 0.5) * 1.4, y = rng() * 3.95 - 2.15;
    const inShaft = Math.abs(x) < 0.14 && y < 0.78;
    const inHead = y > 0.83 && y < 1.76 && Math.abs(x) < (1.8 - y) * 0.68 - 0.025;
    if (!inShaft && !inHead) continue;
    const r = 0.003 + rng() * 0.027;
    const hole = new THREE.Path();
    for (let k = 0; k < 5; k++) {
      const angle = -k * Math.PI * 2 / 5, radius = r * (0.45 + rng() * 0.55);
      const px = x + Math.cos(angle) * radius, py = y + Math.sin(angle) * radius * 0.8;
      if (k === 0) hole.moveTo(px, py);
      else hole.lineTo(px, py);
    }
    hole.closePath();
    shape.holes.push(hole);
  }
  const arrow = mesh(world, 'large worn forward floor arrow', new THREE.ShapeGeometry(shape), lineMat, [1.12, 0.014, 10.25]);
  arrow.rotation.x = -Math.PI / 2;
  arrow.rotation.z = 0.0;
  return arrow;
}
makeArrow();

const reflectionScene = new THREE.Scene();
reflectionScene.background = new THREE.Color(0x242a2c);
for (const [x, z] of [[0, 0], [-4, -4], [4, 4]]) {
  const strip = new THREE.Mesh(new THREE.PlaneGeometry(7, 0.65), new THREE.MeshBasicMaterial({ color: 0xf4f3dd, side: THREE.DoubleSide }));
  strip.position.set(x, 4, z);
  strip.rotation.x = Math.PI / 2;
  reflectionScene.add(strip);
}
const reflectionWall = new THREE.Mesh(new THREE.PlaneGeometry(18, 5), new THREE.MeshBasicMaterial({ color: 0x646966, side: THREE.DoubleSide }));
reflectionWall.position.set(0, 1, 8);
reflectionScene.add(reflectionWall);
const pmrem = new THREE.PMREMGenerator(renderer);
const reflectionTarget = pmrem.fromScene(reflectionScene, 0.05);
scene.environment = reflectionTarget.texture;
scene.environment.name = 'generated fluorescent reflection environment';
scene.environment.userData.procedural = { algorithm: 'PMREM of three white overhead strips and grey wall', strips: [[0, 4, 0], [-4, 4, -4], [4, 4, 4]], stripSize: [7, 0.65], wall: [0, 1, 8], background: 0x242a2c };
pmrem.dispose();

const contactCanvas = document.createElement('canvas');
contactCanvas.width = contactCanvas.height = 128;
const contactContext = contactCanvas.getContext('2d');
const shadowGradient = contactContext.createRadialGradient(64, 64, 20, 64, 64, 63);
shadowGradient.addColorStop(0, 'rgba(0,0,0,0.8)');
shadowGradient.addColorStop(0.6, 'rgba(0,0,0,0.55)');
shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
contactContext.fillStyle = shadowGradient;
contactContext.fillRect(0, 0, 128, 128);
const contactMap = new THREE.CanvasTexture(contactCanvas);
contactMap.name = 'generated soft undercarriage occlusion';
contactMap.userData.procedural = { algorithm: 'radial black alpha gradient', size: 128, stops: [[0, 0.8], [0.6, 0.55], [1, 0]] };
const contactMaterial = new THREE.MeshBasicMaterial({ map: contactMap, transparent: true, depthWrite: false, opacity: 0.78 });
contactMaterial.name = 'soft tire and underbody contact shadow';

function loftBody(parent, paint) { window.__bfTrace?.add(337);
  // Rounded cross sections create the hood, shoulder and bumper without a box silhouette.
  const rings = [
    [-2.23, 0.85, 0.29, 0.87],
    [-2.12, 0.94, 0.26, 0.98],
    [-1.76, 0.965, 0.30, 1.05],
    [-1.25, 0.965, 0.30, 1.055],
    [-0.3, 0.955, 0.30, 1.08],
    [0.55, 0.965, 0.30, 1.06],
    [1.24, 0.965, 0.30, 1.01],
    [1.86, 0.97, 0.26, 0.95],
    [2.16, 0.96, 0.18, 0.87],
    [2.24, 0.92, 0.16, 0.82]
  ];
  const vertices = [], indices = [];
  const cross = [
    [-0.96, 0], [-1, 0.20], [-1, 0.64], [-0.93, 0.86], [-0.72, 0.975],
    [-0.36, 1.02], [0, 1.035], [0.36, 1.02], [0.72, 0.975], [0.93, 0.86],
    [1, 0.64], [1, 0.20], [0.96, 0]
  ];
  const sections = 112;
  for (let j = 0; j <= sections; j++) {
    const z = -2.23 + j / sections * 4.47;
    let k = 0;
    while (k < rings.length - 2 && rings[k + 1][0] < z) k++;
    const blend = (z - rings[k][0]) / (rings[k + 1][0] - rings[k][0]);
    const width = THREE.MathUtils.lerp(rings[k][1], rings[k + 1][1], blend);
    const bottom = THREE.MathUtils.lerp(rings[k][2], rings[k + 1][2], blend);
    const top = THREE.MathUtils.lerp(rings[k][3], rings[k + 1][3], blend);
    const wheelDistance = Math.min(Math.abs(z - 1.39), Math.abs(z + 1.43));
    const arch = wheelDistance < 0.37 ? 0.345 + Math.sqrt(0.37 ** 2 - wheelDistance ** 2) : bottom;
    for (const [u, v] of cross) {
      const lower = Math.max(bottom, arch);
      vertices.push(u * width, lower + v * (top - lower), z);
    }
  }
  for (let j = 0; j < sections; j++) {
    for (let i = 0; i < cross.length - 1; i++) {
      const a = j * cross.length + i, b = a + cross.length;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  mesh(parent, 'continuous rounded sedan body', geometry, paint);
  patch(parent, 'front bumper end', [[-0.85, 0.16, 2.243], [0.85, 0.16, 2.243], [0.92, 0.42, 2.243], [0.89, 0.73, 2.243], [0.72, 0.834, 2.243], [-0.72, 0.834, 2.243], [-0.89, 0.73, 2.243], [-0.92, 0.42, 2.243]], paint);
  patch(parent, 'rear bumper end', [[0.85, 0.29, -2.23], [-0.85, 0.29, -2.23], [-0.85, 0.87, -2.23], [0.85, 0.87, -2.23]], paint);
}
function makeSedan(name, color) { window.__bfTrace?.add(387);
  const car = new THREE.Group();
  car.name = name;
  const paint = standard(`${name} metallic paint`, color, { metalness: 0.48, roughness: 0.31, envMapIntensity: 0.8 });
  loftBody(car, paint);
  const cabin = new THREE.Group();
  cabin.name = 'curved passenger cabin';
  cabin.position.z = -0.2;
  car.add(cabin);
  const cabinRings = [
    [-0.86, 0.67, 1.57], [-0.25, 0.67, 1.62], [0.27, 0.67, 1.60], [0.50, 0.69, 1.52]
  ];
  const roofVertices = [], roofIndices = [];
  for (const [z, width, y] of cabinRings) {
    for (let i = 0; i <= 12; i++) {
      const u = i / 6 - 1;
      roofVertices.push(u * width, y + 0.035 * (1 - u * u), z);
    }
  }
  for (let j = 0; j < cabinRings.length - 1; j++) {
    for (let i = 0; i < 12; i++) {
      const a = j * 13 + i, b = a + 13;
      roofIndices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const roofGeo = new THREE.BufferGeometry();
  roofGeo.setAttribute('position', new THREE.Float32BufferAttribute(roofVertices, 3));
  roofGeo.setIndex(roofIndices);
  roofGeo.computeVertexNormals();
  mesh(cabin, 'arched cabin and roof', roofGeo, paint);
  patch(cabin, 'front windshield', [[-0.78, 1.092, 1.092], [0.78, 1.092, 1.092], [0.633, 1.541, 0.48], [-0.633, 1.541, 0.48]], glass);
  patch(cabin, 'rear glass', [[-0.718, 1.1, -1.56], [-0.61, 1.53, -0.85], [0.61, 1.53, -0.85], [0.718, 1.1, -1.56]], glass);
  for (const side of [-1, 1]) {
    patch(cabin, `${side} cabin side frame`, [
      [side * 0.85, 1.045, 1.1], [side * 0.69, 1.53, 0.49],
      [side * 0.67, 1.59, -0.27], [side * 0.68, 1.56, -0.88],
      [side * 0.81, 1.048, -1.60]
    ], paint);
    patch(cabin, `${side} front side window`, [
      [side * 0.842, 1.092, 0.97], [side * 0.696, 1.508, 0.46],
      [side * 0.686, 1.542, -0.20], [side * 0.825, 1.1, -0.20]
    ], glass);
    patch(cabin, `${side} rear side window`, [
      [side * 0.825, 1.1, -0.29], [side * 0.685, 1.539, -0.29],
      [side * 0.699, 1.508, -0.84], [side * 0.810, 1.1, -1.42]
    ], glass);
    line(cabin, `${side} window lower chrome`, [[side * 0.855, 1.07, 1.01], [side * 0.854, 1.07, -0.15], [side * 0.815, 1.07, -1.49]], brightMetal, 0.011);
    line(cabin, `${side} A pillar`, [[side * 0.813, 1.087, 1.102], [side * 0.687, 1.536, 0.47]], paint, 0.033);
    line(cabin, `${side} windshield gasket`, [[side * 0.778, 1.105, 1.096], [side * 0.637, 1.547, 0.48]], safetyBlack, 0.012);
    line(car, `${side} door seam`, [[side * 0.958, 0.4, -0.28], [side * 0.974, 0.76, -0.26], [side * 0.898, 1.027, -0.25]], safetyBlack, 0.006);
    for (const z of [0.44, -0.8]) box(car, `${side} door handle ${z}`, [0.025, 0.033, 0.18], brightMetal, [side * 0.97, 0.94, z]);
    const mirror = mesh(cabin, `${side} rounded door mirror`, new THREE.SphereGeometry(1, 16, 10), paint, [side * 1.027, 1.08, 0.74]);
    mirror.scale.set(0.16, 0.078, 0.17);
    box(cabin, `${side} mirror support`, [0.15, 0.055, 0.075], safetyBlack, [side * 0.92, 1.058, 0.73]);
    for (const z of [-1.43, 1.39]) {
      const wheel = new THREE.Group();
      wheel.name = `${side} wheel ${z}`;
      wheel.position.set(side * 0.88, 0.345, z);
      car.add(wheel);
      const tire = mesh(wheel, 'rounded black tire', new THREE.TorusGeometry(0.259, 0.082, 12, 36), rubber);
      tire.rotation.y = Math.PI / 2;
      tire.scale.z = 1.45;
      const hub = mesh(wheel, 'alloy wheel disc', new THREE.CylinderGeometry(0.207, 0.207, 0.19, 32), darkMetal);
      hub.rotation.z = Math.PI / 2;
      const rim = mesh(wheel, 'rim outer lip', new THREE.TorusGeometry(0.206, 0.014, 8, 32), brightMetal, [side * 0.104, 0, 0]);
      rim.rotation.y = Math.PI / 2;
      for (let k = 0; k < 10; k++) {
        const angle = k * Math.PI / 5;
        cylinderBetween(wheel, `alloy spoke ${k}`, [side * 0.113, Math.sin(angle) * 0.047, Math.cos(angle) * 0.047], [side * 0.113, Math.sin(angle + 0.12) * 0.186, Math.cos(angle + 0.12) * 0.186], 0.016, brightMetal, 6);
      }
      const center = mesh(wheel, 'wheel center cap', new THREE.CylinderGeometry(0.053, 0.053, 0.015, 16), brightMetal, [side * 0.12, 0, 0]);
      center.rotation.z = Math.PI / 2;
    }
    patch(car, `${side} swept clear headlamp`, [
      [side * 0.43, 0.79, 2.277], [side * 0.84, 0.87, 2.267],
      [side * 0.89, 0.76, 2.265], [side * 0.53, 0.72, 2.277]
    ], lampMat);
    line(car, `${side} headlamp upper gasket`, [[side * 0.43, 0.798, 2.281], [side * 0.65, 0.839, 2.278], [side * 0.845, 0.878, 2.271]], safetyBlack, 0.009);
    for (const dx of [-0.075, 0.065]) {
      const lens = mesh(car, `${side} projector ${dx}`, new THREE.SphereGeometry(1, 12, 8), brightMetal, [side * (0.64 + dx), 0.79, 2.29]);
      lens.scale.set(0.048, 0.047, 0.023);
    }
    const fog = mesh(car, `${side} inset fog lamp`, new THREE.SphereGeometry(1, 12, 8), darkMetal, [side * 0.68, 0.40, 2.263]);
    fog.scale.set(0.09, 0.055, 0.026);
    const tail = mesh(car, `${side} red tail light`, new THREE.SphereGeometry(1, 16, 8), standard(`${name} rear red lens ${side}`, 0x65151a, { roughness: 0.24 }), [side * 0.69, 0.84, -2.15]);
    tail.scale.set(0.22, 0.08, 0.07);
  }
  const grillePoints = [[-0.43, 0.766], [0.43, 0.766], [0.39, 0.55], [0.30, 0.51], [-0.30, 0.51], [-0.39, 0.55]];
  shapeOnWall(car, 'dark shield grille inset', grillePoints, safetyBlack, [0, 0, 2.246]);
  line(car, 'chrome grille perimeter', [...grillePoints, grillePoints[0]].map(([x, y]) => [x, y, 2.253]), brightMetal, 0.017);
  for (let x = -0.33; x < 0.36; x += 0.055) {
    cylinderBetween(car, `fine grille vertical ${x}`, [x, 0.545, 2.258], [x, 0.748, 2.258], 0.005, brightMetal, 5);
  }
  for (const y of [0.572, 0.617, 0.664, 0.709]) box(car, `grille horizontal ${y}`, [0.74, 0.009, 0.01], brightMetal, [0, y, 2.258]);
  box(car, 'lower black air intake', [1.02, 0.125, 0.028], safetyBlack, [0, 0.33, 2.261]);
  box(car, 'license plate', [0.52, 0.10, 0.018], lineMat, [0, 0.33, 2.284]);
  for (let i = 0; i < 8; i++) box(car, `plate glyph ${i}`, [0.018 + (i % 2) * 0.005, 0.049, 0.002], darkMetal, [-0.185 + i * 0.053, 0.331, 2.295]);
  const emblem = mesh(car, 'small hood badge', new THREE.SphereGeometry(0.035, 12, 8), brightMetal, [0, 0.807, 2.16]);
  emblem.scale.set(1, 0.5, 0.4);
  line(car, 'hood left crease', [[-0.4, 0.866, 2.05], [-0.49, 0.989, 1.5], [-0.62, 1.062, 1.12]], paint, 0.009);
  line(car, 'hood right crease', [[0.4, 0.866, 2.05], [0.49, 0.989, 1.5], [0.62, 1.062, 1.12]], paint, 0.009);
  for (const x of [-0.41, 0.41]) {
    box(car, `front seat ${x}`, [0.43, 0.54, 0.22], safetyBlack, [x, 1.02, 0.02]);
    const headrest = mesh(car, `rounded headrest ${x}`, new THREE.SphereGeometry(1, 12, 8), safetyBlack, [x, 1.37, -0.04]);
    headrest.scale.set(0.17, 0.12, 0.09);
  }
  box(car, 'dashboard', [1.48, 0.1, 0.25], safetyBlack, [0, 1.05, 0.86]);
  const steering = mesh(car, 'steering wheel', new THREE.TorusGeometry(0.17, 0.022, 8, 24), safetyBlack, [-0.39, 1.18, 0.68]);
  steering.rotation.x = -0.42;
  for (const x of [-0.42, 0.1]) line(cabin, `wiper ${x}`, [[x, 1.112, 1.098], [x + 0.33, 1.164, 1.025]], safetyBlack, 0.009);
  box(car, 'undercarriage', [1.65, 0.18, 3.8], safetyBlack, [0, 0.28, 0]);
  const contact = mesh(car, 'soft underbody occlusion', new THREE.PlaneGeometry(2.65, 5.1), contactMaterial, [0, 0.019, 0]);
  contact.rotation.x = -Math.PI / 2;
  contact.castShadow = false;
  contact.receiveShadow = false;
  return car;
}
const teal = makeSedan('fixed teal sedan', 0x1e4c5b);
teal.position.set(-8.62, 0, -8.25);
world.add(teal);
const burgundy = makeSedan('fixed burgundy sedan', 0x481c23);
burgundy.position.set(6.75, 0, -8.35);
burgundy.scale.x = 1.09;
world.add(burgundy);
const movedCarRoot = makeSedan('movedCarRoot', 0x17294b);
movedCarRoot.scale.x = 1.12;
scene.add(movedCarRoot);
const variantPoses = {
  '595': { position: [3.03, 0, -8.18], yaw: 0.1 },
  '675': { position: [-0.28, 0, -8.18], yaw: 0 }
};
let currentTime = 0;
let variant = '595';

const orbitPivot = new THREE.Vector3(1.375, 1, -6.0);
const cameraAim = new THREE.Vector3();

function updateSharedCamera(time) { window.__bfTrace?.add(524);
  const travelTime = 123 / 24;
  const elapsed = THREE.MathUtils.clamp(time, 0, travelTime);
  const accelerate = 0.55;
  const decelerate = 0.85;
  const brakingTime = travelTime - decelerate;
  let distance;
  if (elapsed < accelerate) {
    distance = 0.5 * (elapsed - accelerate / Math.PI * Math.sin(Math.PI * elapsed / accelerate));
  } else if (elapsed < brakingTime) {
    distance = elapsed - accelerate / 2;
  } else {
    const braking = elapsed - brakingTime;
    distance = brakingTime - accelerate / 2
      + 0.5 * (braking + decelerate / Math.PI * Math.sin(Math.PI * braking / decelerate));
  }
  // An integrated cosine velocity envelope keeps the unwrapped orbit strictly forward.
  const progress = THREE.MathUtils.clamp(distance / (travelTime - (accelerate + decelerate) / 2), 0, 1);
  const angle = THREE.MathUtils.degToRad(-81 + 156 * progress);
  const columnClearance = 1.35 * Math.exp(-(((progress - 0.8) / 0.115) ** 2));
  const radius = THREE.MathUtils.lerp(13, 12.6, progress)
    - 3.7 * Math.sin(Math.PI * progress) - columnClearance;
  camera.position.set(
    orbitPivot.x + radius * Math.sin(angle),
    3.10 + 0.15 * progress - 1.70 * Math.sin(Math.PI * progress) ** 2,
    orbitPivot.z + radius * Math.cos(angle)
  );
  cameraAim.set(
    THREE.MathUtils.lerp(-4.3, 2, progress),
    THREE.MathUtils.lerp(0.45, 0.25, progress),
    -8.0
  );
  camera.lookAt(cameraAim);
  camera.fov = 70 - 12 * progress ** 6;
  camera.updateProjectionMatrix();
}

function setVariant(id) { window.__bfTrace?.add(561);
  if (id !== '595' && id !== '675') throw new RangeError(`Unknown variant: ${id}`);
  variant = id;
  const pose = variantPoses[id];
  movedCarRoot.position.set(...pose.position);
  movedCarRoot.rotation.set(0, pose.yaw, 0);
  renderAt(currentTime);
}
function renderAt(seconds) { window.__bfTrace?.add(569);
  if (!Number.isFinite(seconds)) throw new TypeError('seek requires a finite timestamp');
  currentTime = THREE.MathUtils.clamp(seconds, 0, DURATION);
  updateSharedCamera(currentTime);
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  renderer.render(scene, camera);
}
function getCameraState() { window.__bfTrace?.add(577);
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov
  };
}
function textureState(texture) { window.__bfTrace?.add(584);
  const image = texture.image;
  if (image?.getContext && !texture.userData.contentFingerprint) {
    const pixels = image.getContext('2d').getImageData(0, 0, image.width, image.height).data;
    let hash = 2166136261;
    for (const value of pixels) hash = Math.imul(hash ^ value, 16777619) >>> 0;
    texture.userData.contentFingerprint = hash.toString(16).padStart(8, '0');
  }
  return {
    name: texture.name, type: texture.type, colorSpace: texture.colorSpace,
    wrapS: texture.wrapS, wrapT: texture.wrapT, repeat: texture.repeat.toArray(),
    offset: texture.offset.toArray(), rotation: texture.rotation,
    procedural: texture.userData.procedural ?? null,
    generatedPixelFingerprint: texture.userData.contentFingerprint ?? null,
    dimensions: image ? [image.width, image.height] : null,
    flipY: texture.flipY, minFilter: texture.minFilter, magFilter: texture.magFilter,
    anisotropy: texture.anisotropy
  };
}
function materialState(material) { window.__bfTrace?.add(603);
  const state = { type: material.type, name: material.name };
  for (const key of ['color', 'emissive', 'roughness', 'metalness', 'opacity', 'transparent', 'side', 'emissiveIntensity', 'bumpScale', 'envMapIntensity', 'specularIntensity', 'specularColor', 'ior', 'transmission', 'clearcoat', 'clearcoatRoughness', 'sheen', 'thickness', 'depthWrite', 'depthTest', 'visible', 'wireframe', 'alphaTest', 'blending', 'colorWrite']) {
    const value = material[key];
    if (value !== undefined) state[key] = value?.isColor ? value.toArray() : value;
  }
  for (const key of ['map', 'bumpMap', 'normalMap', 'roughnessMap', 'alphaMap', 'envMap']) {
    if (material[key]) state[key] = textureState(material[key]);
  }
  return state;
}
function geometryState(geometry) { window.__bfTrace?.add(614);
  const attributes = {};
  for (const [key, attribute] of Object.entries(geometry.attributes)) {
    attributes[key] = { itemSize: attribute.itemSize, normalized: attribute.normalized, array: Array.from(attribute.array) };
  }
  return { type: geometry.type, parameters: geometry.parameters ?? null, attributes, index: geometry.index ? Array.from(geometry.index.array) : null };
}
function serializeTree(root) { window.__bfTrace?.add(621);
  const geometries = new Map(), materials = new Map();
  function serialize(object) {
    const state = {
      name: object.name, type: object.type, position: object.position.toArray(),
      quaternion: object.quaternion.toArray(), scale: object.scale.toArray(),
      visible: object.visible, castShadow: object.castShadow, receiveShadow: object.receiveShadow
    };
    if (object.geometry) {
      if (!geometries.has(object.geometry)) geometries.set(object.geometry, { id: geometries.size, definition: geometryState(object.geometry) });
      state.geometry = geometries.get(object.geometry).id;
    }
    if (object.material) {
      const list = Array.isArray(object.material) ? object.material : [object.material];
      state.materials = list.map(material => {
        if (!materials.has(material)) materials.set(material, { id: materials.size, definition: materialState(material) });
        return materials.get(material).id;
      });
    }
    if (object.isLight) {
      state.light = {};
      for (const key of ['color', 'groundColor', 'intensity', 'distance', 'decay', 'angle', 'penumbra']) {
        const value = object[key];
        if (value !== undefined) state.light[key] = value?.isColor ? value.toArray() : value;
      }
      if (object.target) state.light.target = object.target.position.toArray();
      if (object.shadow) {
        const shadowCamera = object.shadow.camera;
        state.light.shadow = {
          mapSize: object.shadow.mapSize.toArray(), bias: object.shadow.bias,
          normalBias: object.shadow.normalBias, radius: object.shadow.radius,
          camera: { near: shadowCamera.near, far: shadowCamera.far, fov: shadowCamera.fov, aspect: shadowCamera.aspect }
        };
      }
    }
    state.children = object.children.filter(child => child !== movedCarRoot).map(serialize);
    return state;
  }
  const tree = serialize(root);
  return { tree, geometries: [...geometries.values()], materials: [...materials.values()] };
}
function getInvariantState() { window.__bfTrace?.add(662);
  return {
    scene: serializeTree(scene),
    camera: { ...getCameraState(), near: camera.near, far: camera.far, aspect: camera.aspect, zoom: camera.zoom, filmGauge: camera.filmGauge, filmOffset: camera.filmOffset },
    background: scene.background.toArray(), fog: { color: scene.fog.color.toArray(), density: scene.fog.density },
    renderer: { width: WIDTH, height: HEIGHT, exposure: renderer.toneMappingExposure, toneMapping: renderer.toneMapping, outputColorSpace: renderer.outputColorSpace, shadowType: renderer.shadowMap.type },
    environment: { type: 'procedural overhead strips and grey wall', texture: textureState(scene.environment) }
  };
}
function getEditedObjectState() { window.__bfTrace?.add(671);
  return {
    position: movedCarRoot.position.toArray(), quaternion: movedCarRoot.quaternion.toArray(),
    scale: movedCarRoot.scale.toArray(), visible: movedCarRoot.visible,
    ...serializeTree(movedCarRoot)
  };
}
window.reconstruction = {
  pause() {},
  seek: renderAt,
  setVariant,
  getCameraState,
  getInvariantState,
  getEditedObjectState,
  get variant() { return variant; }
};
setVariant('595');
