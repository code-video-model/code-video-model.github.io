import * as THREE from '../vendor/three.module.js';

const W = 960, H = 540, DURATION = 124 / 24;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b5bbb9');
scene.fog = new THREE.Fog('#adb4ad', 23, 55);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(26, W / H, 0.08, 90);
const world = new THREE.Group();
world.name = 'shared-yard';
scene.add(world);
const robotRig = new THREE.Group();
robotRig.name = 'robotRig';
scene.add(robotRig);
let seed = 572;
function rand() { window.__bfTrace?.add(24); seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; }
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, t) => { const u = clamp((t - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };
const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
function group(name, parent = world) { window.__bfTrace?.add(28); const g = new THREE.Group(); g.name = name; parent.add(g); return g; }
function material(name, color, metalness = 0, roughness = 0.8) { window.__bfTrace?.add(29);
  return new THREE.MeshStandardMaterial({ name, color, metalness, roughness });
}
function noiseTexture(name, base, size, speckle = 20) { window.__bfTrace?.add(32);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const data = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = (rand() - 0.5) * speckle + Math.sin(x * 0.051 + Math.sin(y * 0.023) * 3) * 3 + Math.sin(y * 0.031) * 3;
    const k = (y * size + x) * 4;
    data.data[k] = base[0] + n; data.data[k + 1] = base[1] + n;
    data.data[k + 2] = base[2] + n; data.data[k + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  if (name.includes('concrete')) {
    for (let i = 0; i < 90; i++) {
      const x = rand() * size, y = rand() * size, radius = 24 + rand() * 130;
      const stain = ctx.createRadialGradient(x, y, 0, x, y, radius);
      stain.addColorStop(0, `rgba(63,58,44,${0.035 + rand() * 0.12})`);
      stain.addColorStop(1, 'rgba(63,58,44,0)');
      ctx.fillStyle = stain; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }
  }
  for (let i = 0; i < size * 2; i++) {
    ctx.fillStyle = `rgba(52,44,29,${rand() * 0.12})`;
    ctx.beginPath(); ctx.ellipse(rand() * size, rand() * size, 1 + rand() * 18, 1 + rand() * 5, rand() * 6, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = name; texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 8;
  texture.userData = { procedural: 'seeded noise, aggregate and elliptical stains', seed: 572, size, base, speckle };
  return texture;
}
const concreteTex = noiseTexture('generated concrete aggregate', [156, 157, 151], 1024, 48);
concreteTex.repeat.set(6, 6);
const metalTex = noiseTexture('generated scuffed metal', [203, 208, 208], 512, 30);
const orangeTex = noiseTexture('generated dirty orange', [196, 62, 22], 512, 22);
const whiteTex = noiseTexture('generated dirty reflector', [190, 185, 172], 256, 30);
const concrete = material('weathered warm concrete', '#d6d8d6'); concrete.map = concreteTex; concrete.bumpMap = concreteTex; concrete.bumpScale = 0.026;
const silver = material('worn cast aluminium', '#b4bec2', 0.72, 0.43); silver.map = metalTex;
const edgeSilver = material('machined edges', '#b4bbbd', 0.78, 0.35);
const black = material('dark motors and rubber', '#202625', 0.22, 0.74);
const charcoal = material('black painted gate', '#242b28', 0.58, 0.75);
const chrome = material('steel piston rods', '#a6afb0', 0.9, 0.26);
const yellow = material('worn yellow lane paint', '#cfb35e', 0, 0.95);
const rust = material('oxidized scratches', '#61513e', 0.15, 0.95);
const insetMetal = material('graphite inset armor panels', '#4d585c', 0.56, 0.57);
const gravel = material('gravel', '#888b84');
const bark = material('winter tree bark', '#3e4036');
const leafMat = material('dry fallen leaves', '#665841');
const shadowMat = new THREE.MeshBasicMaterial({ color: '#34362f', transparent: true, opacity: 0.09, depthWrite: false });
function mesh(geo, mat, p, parent = world, name = '') { window.__bfTrace?.add(80);
  const m = new THREE.Mesh(geo, mat); m.name = name;
  if (p) m.position.copy(p);
  m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function box(w, h, d, mat, p, parent = world, name = '') { window.__bfTrace?.add(85); return mesh(new THREE.BoxGeometry(w, h, d), mat, p, parent, name); }
function cylinder(rt, rb, h, mat, p, parent = world, sides = 16, name = '') { window.__bfTrace?.add(86); return mesh(new THREE.CylinderGeometry(rt, rb, h, sides), mat, p, parent, name); }
function sphere(r, mat, p, parent = world, name = '') { window.__bfTrace?.add(87); return mesh(new THREE.SphereGeometry(r, 16, 12), mat, p, parent, name); }
function rod(a, b, radius, mat, parent = world, name = '') { window.__bfTrace?.add(88);
  const d = b.clone().sub(a); const m = cylinder(radius, radius, d.length(), mat, a.clone().add(b).multiplyScalar(0.5), parent, 8, name);
  m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); return m;
}
function polyline(points, mat, radius, parent = world) { window.__bfTrace?.add(92);
  for (let i = 1; i < points.length; i++) rod(points[i - 1], points[i], radius, mat, parent);
}
function bevel(w, h, d, r, mat, p, parent, name) { window.__bfTrace?.add(95);
  const s = new THREE.Shape(); const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y); s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const geo = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2, steps: 1, curveSegments: 4 });
  geo.translate(0, 0, -d / 2);
  return mesh(geo, mat, p, parent, name);
}
function bolt(p, parent, radius = 0.016) { window.__bfTrace?.add(105);
  const m = cylinder(radius, radius, 0.012, chrome, p, parent, 6); m.rotation.x = Math.PI / 2; return m;
}
const environmentCanvas = document.createElement('canvas'); environmentCanvas.width = 1024; environmentCanvas.height = 512;
const environmentContext = environmentCanvas.getContext('2d');
const skyGradient = environmentContext.createLinearGradient(0, 0, 0, 512);
skyGradient.addColorStop(0, '#cad3d9'); skyGradient.addColorStop(0.38, '#f0f2ef');
skyGradient.addColorStop(0.53, '#c9cdc8'); skyGradient.addColorStop(0.7, '#80877e'); skyGradient.addColorStop(1, '#696d65');
environmentContext.fillStyle = skyGradient; environmentContext.fillRect(0, 0, 1024, 512);
const cloudGlow = environmentContext.createRadialGradient(250, 140, 5, 250, 140, 220);
cloudGlow.addColorStop(0, 'rgba(255,255,255,0.8)'); cloudGlow.addColorStop(1, 'rgba(255,255,255,0)');
environmentContext.fillStyle = cloudGlow; environmentContext.fillRect(0, 0, 1024, 512);
const environmentTexture = new THREE.CanvasTexture(environmentCanvas);
environmentTexture.mapping = THREE.EquirectangularReflectionMapping; environmentTexture.colorSpace = THREE.SRGBColorSpace;
environmentTexture.name = 'procedural overcast reflection environment';
environmentTexture.userData = { procedural: 'vertical outdoor sky-ground gradient and radial cloud glow', width: 1024, height: 512 };
scene.environment = environmentTexture;
scene.environmentIntensity = 0.65;
const hemi = new THREE.HemisphereLight('#e1e5e5', '#777970', 1.55); hemi.name = 'overcast skylight'; scene.add(hemi);
const sun = new THREE.DirectionalLight('#eff2ee', 1.8); sun.name = 'soft afternoon key'; sun.position.set(-5, 9, 5);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 10, bottom: -10, near: 0.2, far: 35 });
sun.shadow.bias = -0.00005; sun.shadow.normalBias = 0.003; sun.shadow.radius = 4; scene.add(sun);

box(28, 0.16, 32, concrete, V(0, -0.08, -3), world, 'concrete yard slab');
box(7, 0.055, 13, gravel, V(6.3, -0.006, -4.5), world, 'right gravel verge');
box(20, 0.025, 4, material('unmown verge', '#535a43'), V(0, 0.005, -7.1), world, 'rear grass');
for (const x of [-0.94, 0.94]) box(0.065, 0.009, 12.6, yellow, V(x, 0.007, -0.1), world, 'parallel yellow lane line');
for (let z = 0.55; z < 6; z += 0.43) box(1.9, 0.008, 0.047, yellow, V(0, 0.009, z), world, 'ladder transverse stripe');
const dirt = group('cracks tyre marks leaves and aggregate');
const crackMat = material('concrete cracks', '#615f55', 0, 1);
for (let i = 0; i < 38; i++) {
  const x = -8 + rand() * 16, z = -5 + rand() * 17, points = [V(x, 0.003, z)];
  for (let j = 1; j < 8; j++) points.push(V(x + j * 0.12 + rand() * 0.14, 0.0035, z + j * 0.16 + rand() * 0.2));
  polyline(points, crackMat, 0.004, dirt);
}
for (let band = 0; band < 4; band++) {
  const points = [];
  for (let j = 0; j <= 65; j++) {
    const a = -0.9 + j / 65 * 2.2;
    points.push(V(-2.4 + (1.3 + band * 0.045) * Math.cos(a), 0.007, 3 + 2.6 * Math.sin(a)));
  }
  polyline(points, shadowMat, 0.016, dirt);
}
const debrisGeo = new THREE.DodecahedronGeometry(1, 0);
const stones = new THREE.InstancedMesh(debrisGeo, gravel, 1000); stones.name = 'individual verge gravel'; world.add(stones);
const leaves = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), leafMat, 400); leaves.name = 'scattered dry leaves'; world.add(leaves);
const dummy = new THREE.Object3D();
for (let i = 0; i < 1000; i++) {
  dummy.position.set(2.8 + rand() * 6, 0.016 + rand() * 0.02, -8 + rand() * 13);
  dummy.scale.set(0.014 + rand() * 0.042, 0.011 + rand() * 0.024, 0.02 + rand() * 0.04);
  dummy.rotation.set(rand(), rand() * 6, rand()); dummy.updateMatrix(); stones.setMatrixAt(i, dummy.matrix);
}
for (let i = 0; i < 400; i++) {
  dummy.position.set(-6 + rand() * 14, 0.008, -5 + rand() * 15);
  dummy.rotation.set(-Math.PI / 2, 0, rand() * 6); dummy.scale.set(0.015 + rand() * 0.06, 0.02 + rand() * 0.055, 1);
  dummy.updateMatrix(); leaves.setMatrixAt(i, dummy.matrix);
}
function cone(x, z, orangeBase) { window.__bfTrace?.add(163);
  const g = group('dirty orange white traffic cone');
  g.position.set(x, 0, z);
  bevel(0.57, 0.055, 0.52, 0.045, orangeBase ? material('cone base faded orange', '#8e3922') : black, V(0, 0.035, 0), g, 'square rubber base');
  const orange = material('traffic orange stained', '#eeeeee'); orange.map = orangeTex;
  const white = material('dirty reflective white', '#eeeeee'); white.map = whiteTex;
  const ys = [0.06, 0.43, 0.59, 0.67, 0.85, 0.98];
  for (let i = 0; i < ys.length - 1; i++) {
    const radius = y => 0.195 - (y - 0.06) * 0.155;
    cylinder(radius(ys[i + 1]), radius(ys[i]), ys[i + 1] - ys[i], i === 1 || i === 3 ? white : orange, V(0, (ys[i] + ys[i + 1]) / 2, 0), g, 36);
  }
  cylinder(0.038, 0.044, 0.016, orange, V(0, 0.985, 0), g, 24);
  for (let i = 0; i < 16; i++) {
    const a = rand() * Math.PI * 2, y = 0.1 + rand() * 0.74;
    const r = 0.196 - (y - 0.06) * 0.155;
    const mark = box(0.005 + rand() * 0.012, 0.012 + rand() * 0.055, 0.002, rust, V(Math.sin(a) * r, y, Math.cos(a) * r), g);
    mark.rotation.set(0.167, a, rand() * 0.6);
  }
  return g;
}
cone(-1.2, 0.95, true); cone(1.1, 1.8, false).scale.y = 0.9;

const RAMP = { near: -1.05, crestNear: -2.1, crestFar: -2.3, far: -3.05, height: 0.24, halfWidth: 0.9 };
function groundHeight(x, z) { window.__bfTrace?.add(186);
  if (Math.abs(x) > RAMP.halfWidth || z > RAMP.near || z < RAMP.far) return 0;
  if (z > RAMP.crestNear) return RAMP.height * (RAMP.near - z) / (RAMP.near - RAMP.crestNear);
  if (z < RAMP.crestFar) return RAMP.height * (z - RAMP.far) / (RAMP.crestFar - RAMP.far);
  return RAMP.height;
}
const ramp = group('shallow scuffed silver traversable ramp');
const profile = [[RAMP.near, 0], [RAMP.crestNear, RAMP.height], [RAMP.crestFar, RAMP.height], [RAMP.far, 0]];
const verts = [], inds = [], uvs = [];
profile.forEach(([z, y]) => { verts.push(-0.9, y, z, 0.9, y, z); uvs.push(0, z, 1, z); });
for (let i = 0; i < 3; i++) { const n = i * 2; inds.push(n, n + 2, n + 1, n + 1, n + 2, n + 3); }
const rampGeo = new THREE.BufferGeometry();
rampGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
rampGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2)); rampGeo.setIndex(inds); rampGeo.computeVertexNormals();
mesh(rampGeo, silver, null, ramp, 'ramp collision surface');
for (const x of [-0.9, 0.9]) {
  const shape = new THREE.Shape(); shape.moveTo(profile[0][0], 0);
  profile.forEach(([z, y]) => shape.lineTo(z, y)); shape.lineTo(profile.at(-1)[0], 0);
  const geo = new THREE.ExtrudeGeometry(shape, { depth: 0.018, bevelEnabled: false }); geo.rotateY(-Math.PI / 2);
  mesh(geo, silver, V(x, 0, 0), ramp, 'ramp side plate');
}
for (let z = RAMP.far + 0.1; z < RAMP.near - 0.05; z += 0.19) {
  box(1.76, 0.008, 0.009, edgeSilver, V(0, groundHeight(0, z) + 0.005, z), ramp, 'anti slip seams');
  for (const x of [-0.85, 0.85]) cylinder(0.014, 0.014, 0.01, black, V(x, groundHeight(x, z) + 0.009, z), ramp, 8);
}
for (let i = 0; i < 35; i++) {
  const x = (rand() - 0.5) * 1.65, z = RAMP.far + 0.15 + rand() * 1.75;
  const scuff = box(0.03 + rand() * 0.16, 0.002, 0.008 + rand() * 0.018, i % 3 ? rust : edgeSilver, V(x, groundHeight(x, z) + 0.008, z), ramp);
  scuff.rotation.y = rand();
}

const gateZ = -4.9;
const fence = group('closed rear gate and chain link fence');
fence.position.x = 0.95;
fence.scale.x = 0.78;
for (const x of [-2.75, 0, 2.75]) cylinder(0.048, 0.052, 2.05, charcoal, V(x, 1.025, gateZ), fence, 16, 'gate upright');
for (const side of [-1, 1]) {
  const cx = side * 1.36;
  for (const y of [0.12, 1.84]) box(2.6, 0.065, 0.065, charcoal, V(cx, y, gateZ), fence, 'gate horizontal rail');
  for (let i = 0; i <= 16; i++) box(0.023, 1.69, 0.027, charcoal, V(side * (0.09 + i * 0.158), 0.975, gateZ), fence, 'vertical gate bar');
  rod(V(side * 2.6, 1.8, gateZ + 0.035), V(side * 0.05, 0.16, gateZ + 0.035), 0.024, charcoal, fence, 'diagonal gate brace');
}
box(0.17, 0.08, 0.1, black, V(0.05, 0.95, gateZ + 0.03), fence, 'closed gate latch');
for (const interval of [[-10, -2.8], [2.8, 11]]) {
  const [lo, hi] = interval;
  for (let x = lo; x <= hi + 0.1; x += 2) cylinder(0.033, 0.039, 2.06, edgeSilver, V(x, 1.03, gateZ), fence);
  for (const y of [0.18, 1.88]) rod(V(lo, y, gateZ), V(hi, y, gateZ), 0.021, edgeSilver, fence);
  const ps = [];
  for (const slope of [-1.8, 1.8]) for (let b = -22; b < 22; b += 0.18) {
    let x0 = (0.19 - b) / slope, x1 = (1.86 - b) / slope;
    if (x0 > x1) [x0, x1] = [x1, x0];
    x0 = Math.max(lo, x0); x1 = Math.min(hi, x1);
    if (x1 > x0) ps.push(x0, slope * x0 + b, gateZ, x1, slope * x1 + b, gateZ);
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3));
  const lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: '#747f7b', transparent: true, opacity: 0.65 }));
  lines.name = 'diamond chain link mesh'; fence.add(lines);
}
const building = group('corrugated grey utility building');
building.position.set(4.2, 0, -1.6);
box(6, 4.5, 6, material('warehouse wall grey', '#747a77', 0.3, 0.85), V(6.4, 2.25, -5.8), building);
for (let x = 3.42; x < 9.4; x += 0.085) box(0.026, 4.42, 0.036, material('galvanized ribs', '#8a8e87', 0.45), V(x, 2.25, -2.777), building);
const sideRibMaterial = material('weathered side wall ribs', '#858b87', 0.4, 0.8);
for (let z = -8.76; z < -2.78; z += 0.085) box(0.036, 4.42, 0.026, sideRibMaterial, V(3.385, 2.25, z), building);
box(0.045, 2.08, 0.77, material('side service door', '#b9bcb6'), V(3.36, 1.04, -4.5), building);
box(0.065, 0.15, 0.035, black, V(3.31, 1.01, -4.24), building);
box(6.15, 0.12, 6.15, charcoal, V(6.4, 4.52, -5.8), building, 'roof flashing');
box(0.77, 2.08, 0.042, material('service door', '#afb1a8'), V(3.97, 1.04, -2.75), building);
box(0.035, 0.15, 0.06, black, V(4.24, 1.01, -2.71), building);
box(0.29, 0.4, 0.13, material('electrical cabinet', '#697777', 0.3), V(5.07, 1.22, -2.69), building);
rod(V(5.04, 0.05, -2.65), V(5.04, 3.5, -2.65), 0.016, edgeSilver, building);
rod(V(7.68, 0.04, -2.63), V(7.68, 4.43, -2.63), 0.037, charcoal, building);
box(0.35, 0.4, 0.06, black, V(6.3, 0.3, -2.73), building, 'wall vent');
for (let y = 0.14; y < 0.5; y += 0.05) box(0.34, 0.016, 0.08, edgeSilver, V(6.3, y, -2.69), building);
cylinder(0.055, 0.055, 0.86, yellow, V(3.05, 0.43, -3.5), building, 12, 'yellow safety bollard');
const vegetation = group('leafless trees and scrub behind fence');
const shrubMats = ['#505d3b', '#626d48', '#484f39'].map((c, i) => material(`winter shrub ${i}`, c));
const shrubs = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), material('scrub vertex color base', '#ffffff'), 1500); vegetation.add(shrubs);
for (let i = 0; i < 1500; i++) {
  dummy.position.set(-12 + rand() * 25, 0.12 + rand() * 1.32, -7 - rand() * 3);
  dummy.scale.set(0.08 + rand() * 0.28, 0.08 + rand() * 0.24, 0.08 + rand() * 0.3);
  dummy.rotation.set(rand(), rand() * 6, rand()); dummy.updateMatrix(); shrubs.setMatrixAt(i, dummy.matrix);
  shrubs.setColorAt(i, new THREE.Color(shrubMats[i % 3].color).multiplyScalar(0.8 + rand() * 0.4));
}
function branch(start, dir, length, radius, depth) { window.__bfTrace?.add(270);
  const end = start.clone().addScaledVector(dir, length);
  rod(start, end, radius, bark, vegetation);
  if (!depth) return;
  for (let j = 0; j < 3; j++) {
    const next = dir.clone().add(V((rand() - 0.5) * 1.2, 0.2, (rand() - 0.5) * 1.1)).normalize();
    branch(end, next, length * (0.56 + rand() * 0.17), radius * 0.49, depth - 1);
  }
}
for (let i = 0; i < 19; i++) branch(V(-12 + i * 1.3, 0, -9 - rand() * 4), V((rand() - 0.5) * 0.25, 1, (rand() - 0.5) * 0.12).normalize(), 1.5 + rand() * 1.3, 0.06 + rand() * 0.06, 3);
const twigPoints = [];
function fineBranches(a, direction, length, depth) { window.__bfTrace?.add(281);
  const b = a.clone().addScaledVector(direction, length);
  twigPoints.push(...a.toArray(), ...b.toArray());
  if (!depth) return;
  for (let j = 0; j < 3; j++) fineBranches(b, direction.clone().add(V((rand() - 0.5) * 1.6, (rand() - 0.5) * 0.75, (rand() - 0.5) * 1.3)).normalize(), length * 0.65, depth - 1);
}
for (let i = 0; i < 85; i++) fineBranches(V(-16 + rand() * 31, 0.7 + rand() * 2, -8 - rand() * 8), V((rand() - 0.5) * 0.85, 1, (rand() - 0.5) * 0.5).normalize(), 1 + rand() * 1.7, 4);
const twigs = new THREE.InstancedMesh(new THREE.CylinderGeometry(1, 1, 1, 5), bark, twigPoints.length / 6);
twigs.name = 'dense winter twig silhouettes'; vegetation.add(twigs);
for (let i = 0; i < twigPoints.length / 6; i++) {
  const a = V(...twigPoints.slice(i * 6, i * 6 + 3)), b = V(...twigPoints.slice(i * 6 + 3, i * 6 + 6));
  dummy.position.copy(a).add(b).multiplyScalar(0.5);
  dummy.quaternion.setFromUnitVectors(V(0, 1, 0), b.clone().sub(a).normalize());
  const radius = 0.008 + a.distanceTo(b) * 0.012;
  dummy.scale.set(radius, a.distanceTo(b), radius); dummy.updateMatrix(); twigs.setMatrixAt(i, dummy.matrix);
}

function joint(p, radius, parent, name) { window.__bfTrace?.add(298);
  const g = group(name, parent); g.position.copy(p);
  const motor = cylinder(radius, radius, radius * 1.55, black, V(), g, 24); motor.rotation.z = Math.PI / 2;
  for (const s of [-1, 1]) {
    const cap = cylinder(radius * 0.87, radius * 0.87, 0.025, edgeSilver, V(s * radius * 0.79, 0, 0), g, 24); cap.rotation.z = Math.PI / 2;
    const hub = cylinder(radius * 0.36, radius * 0.36, 0.029, charcoal, V(s * radius * 0.85, 0, 0), g, 16); hub.rotation.z = Math.PI / 2;
    const ring = mesh(new THREE.TorusGeometry(radius * 0.69, radius * 0.032, 5, 24), chrome, V(s * radius * 0.96, 0, 0), g, 'machined bearing ring');
    ring.rotation.y = Math.PI / 2;
    for (let j = 0; j < 6; j++) {
      const a = j * Math.PI / 3;
      const screw = cylinder(radius * 0.067, radius * 0.067, 0.008, black, V(s * radius * 0.98, Math.sin(a) * radius * 0.53, Math.cos(a) * radius * 0.53), g, 6);
      screw.rotation.z = Math.PI / 2;
    }
  }
  return g;
}
function segment(length, width, parent, name) { window.__bfTrace?.add(314);
  const g = group(name, parent);
  const shell = new THREE.Shape();
  shell.moveTo(-width * 0.3, -0.045); shell.lineTo(-width * 0.48, -0.11);
  shell.lineTo(-width * 0.31, -length + 0.035); shell.lineTo(width * 0.25, -length + 0.035);
  shell.lineTo(width * 0.46, -0.11); shell.lineTo(width * 0.3, -0.045); shell.closePath();
  const shellGeo = new THREE.ExtrudeGeometry(shell, { depth: width * 0.64, bevelEnabled: true, bevelSize: 0.01, bevelThickness: 0.012, bevelSegments: 2, steps: 1 });
  shellGeo.translate(0, 0, -width * 0.32);
  mesh(shellGeo, silver, null, g, 'tapered aluminium limb shell');
  bevel(width * 0.56, length * 0.65, 0.012, 0.015, insetMetal, V(0, -length * 0.52, width * 0.35), g, 'recessed graphite front panel');
  box(width * 0.45, length * 0.75, width * 0.8, black, V(0, -length / 2, -width * 0.2), g, 'dark limb recess');
  rod(V(width * 0.38, -0.03, width * 0.4), V(width * 0.38, -length + 0.03, width * 0.4), width * 0.09, chrome, g, 'exposed actuator rod');
  for (const y of [-0.055, -length + 0.05]) bolt(V(-width * 0.22, y, width * 0.42), g, 0.012);
  return g;
}
const contactCanvas = document.createElement('canvas'); contactCanvas.width = contactCanvas.height = 64;
const contactContext = contactCanvas.getContext('2d');
const contactGradient = contactContext.createRadialGradient(32, 32, 2, 32, 32, 32);
contactGradient.addColorStop(0, 'rgba(22,25,22,0.8)'); contactGradient.addColorStop(0.45, 'rgba(22,25,22,0.35)');
contactGradient.addColorStop(1, 'rgba(22,25,22,0)');
contactContext.fillStyle = contactGradient; contactContext.fillRect(0, 0, 64, 64);
const contactTexture = new THREE.CanvasTexture(contactCanvas); contactTexture.name = 'generated soft contact shadow';
contactTexture.userData = { procedural: 'radial alpha falloff', size: 64, stops: [[0, 0.8], [0.45, 0.35], [1, 0]] };
function limb(parent, name, l1, l2, width, footLength) { window.__bfTrace?.add(337);
  const g = group(name, parent);
  const upper = segment(l1, width, g, 'upper link');
  const lower = segment(l2, width * 0.58, g, 'lower link');
  const hip = joint(V(), width * 0.62, g, 'hip motor');
  const knee = joint(V(), width * 0.49, g, 'knee motor');
  const ankle = joint(V(), width * 0.29, g, 'ankle motor');
  const foot = bevel(width * 0.81, 0.057, footLength, 0.023, black, V(), g, 'contact foot');
  box(width * 0.72, 0.019, footLength * 0.65, silver, V(0, 0.045, 0.02), foot, 'foot top plate');
  const contactShadow = mesh(new THREE.PlaneGeometry(width + 0.13, footLength + 0.15), new THREE.MeshBasicMaterial({ name: 'soft foot occlusion', map: contactTexture, transparent: true, opacity: 0.4, depthWrite: false }), V(), g, 'foot contact occlusion');
  contactShadow.castShadow = false; contactShadow.receiveShadow = false;
  return { g, upper, lower, hip, knee, ankle, foot, contactShadow, l1, l2, name };
}
const human = group('humanoid572', robotRig);
const humanBody = group('humanoid articulated trunk', human);
bevel(0.45, 0.23, 0.25, 0.07, black, V(0, 1.01, 0), humanBody, 'pelvic motor housing');
bevel(0.19, 0.22, 0.12, 0.035, silver, V(0, 1.01, 0.15), humanBody, 'front pelvis armor');
const abdomenShape = new THREE.Shape();
abdomenShape.moveTo(-0.21, 0.16); abdomenShape.quadraticCurveTo(-0.20, -0.06, -0.11, -0.18);
abdomenShape.lineTo(0.11, -0.18); abdomenShape.quadraticCurveTo(0.20, -0.06, 0.21, 0.16); abdomenShape.closePath();
const abdomenGeo = new THREE.ExtrudeGeometry(abdomenShape, { depth: 0.23, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.017, bevelSegments: 3, curveSegments: 8, steps: 1 }); abdomenGeo.translate(0, 0, -0.115);
mesh(abdomenGeo, silver, V(0, 1.32, 0), humanBody, 'curved tapered abdominal armor');
bevel(0.53, 0.26, 0.31, 0.065, silver, V(0, 1.58, 0), humanBody, 'rounded chest armor');
bevel(0.39, 0.16, 0.13, 0.04, edgeSilver, V(0, 1.66, 0.14), humanBody, 'upper chest panel');
box(0.26, 0.41, 0.13, black, V(0, 1.48, -0.2), humanBody, 'spine electronics');
for (let y = 1.34; y < 1.63; y += 0.055) box(0.23, 0.017, 0.022, silver, V(0, y, -0.28), humanBody, 'back cooling fins');
cylinder(0.06, 0.075, 0.13, black, V(0, 1.79, 0), humanBody);
const head = group('open cage sensor head', humanBody); head.position.y = 1.93;
bevel(0.29, 0.2, 0.2, 0.025, black, V(), head, 'sensor block');
for (const x of [-0.085, 0.085]) {
  const eye = cylinder(0.038, 0.038, 0.04, chrome, V(x, 0.02, 0.12), head, 24); eye.rotation.x = Math.PI / 2;
  const lens = cylinder(0.026, 0.026, 0.042, material('dark optical lens', '#101b1c', 0.55, 0.17), V(x, 0.02, 0.14), head, 24); lens.rotation.x = Math.PI / 2;
}
for (const x of [-0.17, 0.17]) polyline([V(x, -0.12, 0.15), V(x, 0.09, 0.15), V(x * 0.7, 0.2, 0.02), V(x * 0.7, 0.2, -0.12), V(x, -0.12, -0.12)], edgeSilver, 0.014, head);
for (const yz of [[-0.12, 0.15], [0.09, 0.15], [0.2, -0.12]]) rod(V(-0.17, ...yz), V(0.17, ...yz), 0.013, edgeSilver, head);
const humanLegs = [-1, 1].map((side, i) => ({ ...limb(human, `${side < 0 ? 'left' : 'right'} walking leg`, 0.49, 0.48, 0.15, 0.24), side, phase: i * 0.5 }));
const arms = [-1, 1].map(side => {
  const shoulder = group(`${side < 0 ? 'left' : 'right'} shoulder`, humanBody); shoulder.position.set(side * 0.325, 1.62, 0);
  joint(V(), 0.105, shoulder, 'shoulder motor');
  segment(0.33, 0.12, shoulder, 'upper arm');
  const elbow = group('elbow hinge', shoulder); elbow.position.y = -0.33;
  joint(V(), 0.069, elbow, 'elbow motor'); segment(0.31, 0.095, elbow, 'forearm');
  sphere(0.071, black, V(0, -0.345, 0), elbow, 'closed articulated gripper');
  for (let j = 0; j < 3; j++) box(0.025, 0.055, 0.025, edgeSilver, V(-0.035 + j * 0.035, -0.35, 0.058), elbow);
  const cable = new THREE.CatmullRomCurve3([V(side * 0.21, 1.58, -0.1), V(side * 0.3, 1.82, -0.1), V(side * 0.43, 1.73, -0.09), V(side * 0.42, 1.47, -0.08)]);
  mesh(new THREE.TubeGeometry(cable, 18, 0.026, 8, false), black, null, humanBody, 'shoulder cable loop');
  return { shoulder, elbow, side };
});
for (const side of [-1, 1]) {
  const cable = new THREE.CatmullRomCurve3([V(side * 0.1, 1.24, -0.03), V(side * 0.3, 1.16, -0.09), V(side * 0.27, 0.98, -0.04)]);
  mesh(new THREE.TubeGeometry(cable, 16, 0.023, 8, false), black, null, humanBody, 'hip cable loop');
}
const dog = group('quadruped571', robotRig);
const dogBody = group('quadruped chassis', dog);
bevel(0.41, 0.27, 0.91, 0.065, silver, V(0, 0.89, 0), dogBody, 'horizontal industrial torso');
bevel(0.32, 0.12, 0.82, 0.035, black, V(0, 0.74, 0), dogBody, 'underbody electronics');
for (const z of [-0.3, 0.3]) {
  bevel(0.43, 0.045, 0.095, 0.015, edgeSilver, V(0, 1.035, z), dogBody, 'raised chassis panel rim');
  box(0.24, 0.01, 0.067, black, V(0, 1.065, z), dogBody, 'recessed top vent');
  for (const x of [-0.18, 0.18]) bolt(V(x, 0.98, z + 0.03), dogBody);
}
for (const side of [-1, 1]) {
  bevel(0.018, 0.15, 0.48, 0.008, insetMetal, V(side * 0.22, 0.9, 0), dogBody, 'side access panel');
  for (const z of [-0.2, 0.2]) {
    const screw = cylinder(0.015, 0.015, 0.018, chrome, V(side * 0.24, 0.94, z), dogBody, 6);
    screw.rotation.z = Math.PI / 2;
  }
}
bevel(0.34, 0.23, 0.10, 0.025, silver, V(0, 0.91, 0.51), dogBody, 'front sensor module');
for (const x of [-0.09, 0.09]) {
  const lens = cylinder(0.033, 0.033, 0.025, black, V(x, 0.96, 0.575), dogBody, 18); lens.rotation.x = Math.PI / 2;
  bolt(V(x, 0.96, 0.592), dogBody, 0.011);
}
for (let i = 0; i < 5; i++) box(0.027, 0.057, 0.006, black, V(-0.11 + i * 0.055, 0.85, 0.574), dogBody);
const dogLegs = [];
for (const front of [-1, 1]) for (const side of [-1, 1]) {
  dogLegs.push({ ...limb(dog, `${front > 0 ? 'front' : 'rear'} ${side < 0 ? 'left' : 'right'} leg`, 0.42, 0.43, 0.12, 0.13), side, front, phase: side * front > 0 ? 0 : 0.5 });
  const motor = joint(V(side * 0.265, 0.88, front * 0.345), 0.115, dogBody, 'large quadruped hip actuator');
  motor.rotation.y = front * 0.05;
}

const NAV = { startZ: 1.6, endZ: -3.92, startTime: 0.62, endTime: 4.78, acceleration: 0.42 };
const travelLength = NAV.startZ - NAV.endZ;
const travelDuration = NAV.endTime - NAV.startTime;
const cruiseSpeed = travelLength / (travelDuration - NAV.acceleration);
function navigation(t) { window.__bfTrace?.add(422);
  const u = clamp(t - NAV.startTime, 0, travelDuration);
  let distance;
  if (u < NAV.acceleration) distance = cruiseSpeed * u * u / (2 * NAV.acceleration);
  else if (u > travelDuration - NAV.acceleration) {
    const tail = travelDuration - u; distance = travelLength - cruiseSpeed * tail * tail / (2 * NAV.acceleration);
  } else distance = cruiseSpeed * (u - NAV.acceleration / 2);
  const z = NAV.startZ - distance;
  return { position: [0, groundHeight(0, z), z], yaw: -0.22 + (-Math.PI + 0.22) * smooth(0.08, 0.92, t), traveledDistance: distance, pathProgress: distance / travelLength };
}
function navPoint(t, x, z = 0) { window.__bfTrace?.add(432);
  const n = navigation(t);
  const p = V(x, 0, z).applyAxisAngle(V(0, 1, 0), n.yaw).add(V(...n.position));
  p.y = groundHeight(p.x, p.z);
  return p;
}
const PERIOD = 0.66, STANCE = 0.62, GAIT_START = 0.12, GAIT_END = DURATION;
const pivotEnd = 0.92, pivotPeriod = 0.42;
const pivotCycles = (pivotEnd - GAIT_START) / pivotPeriod;
function gaitClock(t) { window.__bfTrace?.add(441); return t < pivotEnd ? (t - GAIT_START) / pivotPeriod : pivotCycles + (t - pivotEnd) / PERIOD; }
function gaitTime(c) { window.__bfTrace?.add(442); return c < pivotCycles ? GAIT_START + c * pivotPeriod : pivotEnd + (c - pivotCycles) * PERIOD; }
function footTarget(t, phase, lateral, longitudinal = 0) { window.__bfTrace?.add(443);
  const time = clamp(t, GAIT_START, GAIT_END);
  const q = gaitClock(time) + phase;
  const cycle = Math.floor(q), p = q - cycle;
  const touchdown = gaitTime(cycle - phase);
  const lift = gaitTime(cycle - phase + STANCE);
  const next = gaitTime(cycle - phase + 1);
  const targetTime = at => clamp(at + STANCE * (at < pivotEnd ? pivotPeriod : PERIOD) * 0.5, 0, NAV.endTime);
  const targetAt = at => navPoint(targetTime(at), lateral, longitudinal);
  const a = touchdown < GAIT_START ? navPoint(0, lateral, longitudinal) : targetAt(touchdown);
  const yawA = navigation(touchdown < GAIT_START ? 0 : targetTime(touchdown)).yaw;
  if (p < STANCE) return { point: a, yaw: yawA, stance: true, cycle, phase: p };
  const b = targetAt(next);
  const u = (time - lift) / (next - lift);
  const pnt = a.clone().lerp(b, smooth(0, 1, u));
  const travel = a.distanceTo(b);
  pnt.y = Math.max(pnt.y, groundHeight(pnt.x, pnt.z)) + Math.sin(Math.PI * u) * 0.13 * Math.min(1, travel / 0.14);
  return { point: pnt, yaw: THREE.MathUtils.lerp(yawA, navigation(targetTime(next)).yaw, smooth(0, 1, u)), stance: travel < 0.00001, cycle, phase: p };
}
function solveLimb(limb, hip, ankle, bendSign) { window.__bfTrace?.add(462);
  const delta = ankle.clone().sub(hip);
  const distance = Math.min(delta.length(), limb.l1 + limb.l2 - 0.001);
  const direction = delta.clone().normalize();
  const along = (limb.l1 ** 2 - limb.l2 ** 2 + distance ** 2) / (2 * distance);
  const height = Math.sqrt(Math.max(0, limb.l1 ** 2 - along ** 2));
  const bend = V(0, 0, bendSign).addScaledVector(direction, -direction.z * bendSign).normalize();
  const knee = hip.clone().addScaledVector(direction, along).addScaledVector(bend, height);
  limb.hip.position.copy(hip); limb.knee.position.copy(knee); limb.ankle.position.copy(ankle);
  limb.upper.position.copy(hip); limb.upper.quaternion.setFromUnitVectors(V(0, -1, 0), knee.clone().sub(hip).normalize());
  limb.lower.position.copy(knee); limb.lower.quaternion.setFromUnitVectors(V(0, -1, 0), ankle.clone().sub(knee).normalize());
}
let time = 0, variant = '572';
let contacts = [];
function animate(t) { window.__bfTrace?.add(476);
  time = clamp(t, 0, DURATION);
  const nav = navigation(time);
  robotRig.position.fromArray(nav.position); robotRig.rotation.set(0, nav.yaw, 0);
  human.visible = variant === '572'; dog.visible = variant === '571';
  const gaitAmount = smooth(0, 0.35, time) * (1 - smooth(4.55, 5.05, time));
  const bob = 0.017 * Math.sin((time - GAIT_START) / PERIOD * Math.PI * 4) * gaitAmount;
  humanBody.rotation.z = 0.018 * Math.sin((time - GAIT_START) / PERIOD * Math.PI * 2) * gaitAmount;
  const inverseYaw = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), -nav.yaw);
  contacts = [];
  const legTargets = [...humanLegs, ...dogLegs].map(leg => {
    const isHuman = humanLegs.includes(leg);
    const target = footTarget(time, leg.phase, leg.side * (isHuman ? 0.18 : 0.31), isHuman ? 0 : leg.front * 0.34);
    const delta = 0.002;
    const slope = (groundHeight(target.point.x, target.point.z + delta) - groundHeight(target.point.x, target.point.z - delta)) / (2 * delta);
    const normal = V(0, 1, -slope).normalize();
    const local = target.point.clone().addScaledVector(normal, 0.08).sub(robotRig.position).applyQuaternion(inverseYaw);
    return { leg, isHuman, target, local, normal };
  });
  const humanBaseHip = 0.96, dogBaseHip = 0.88;
  const hipHeights = [true, false].map(isHuman => Math.min(
    (isHuman ? humanBaseHip : dogBaseHip) + bob * (isHuman ? 1 : 0.65),
    ...legTargets.filter(entry => entry.isHuman === isHuman).map(({ leg, local }) => {
      const dx = local.x - leg.side * (isHuman ? 0.185 : 0.265);
      const dz = local.z - (isHuman ? 0 : leg.front * 0.345);
      return local.y + Math.sqrt(Math.max(0.04, (leg.l1 + leg.l2 - 0.02) ** 2 - dx * dx - dz * dz));
    })
  ));
  humanBody.position.y = hipHeights[0] - humanBaseHip;
  dogBody.position.y = hipHeights[1] - dogBaseHip;
  for (const { leg, isHuman, target, local, normal } of legTargets) {
    const hip = V(leg.side * (isHuman ? 0.185 : 0.265), hipHeights[isHuman ? 0 : 1], isHuman ? 0 : leg.front * 0.345);
    solveLimb(leg, hip, local, isHuman ? 1 : -1);
    leg.foot.position.copy(target.point).addScaledVector(normal, 0.0435).sub(robotRig.position).applyQuaternion(inverseYaw);
    leg.foot.quaternion.copy(inverseYaw).multiply(new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), normal)).multiply(new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), target.yaw));
    const surface = groundHeight(target.point.x, target.point.z);
    leg.contactShadow.position.copy(V(target.point.x, surface + 0.003, target.point.z)).sub(robotRig.position).applyQuaternion(inverseYaw);
    leg.contactShadow.quaternion.copy(leg.foot.quaternion).multiply(new THREE.Quaternion().setFromAxisAngle(V(1, 0, 0), -Math.PI / 2));
    leg.contactShadow.material.opacity = 0.43 * Math.exp(-(target.point.y - surface) * 14);
    if (isHuman === (variant === '572')) contacts.push({ name: leg.name, stance: target.stance, cycle: target.cycle, world: target.point.toArray(), surfaceHeight: surface, jointReach: hip.distanceTo(local), maximumReach: leg.l1 + leg.l2, actualSole: null });
  }
  for (const arm of arms) {
    arm.shoulder.rotation.x = arm.side * 0.37 * Math.sin((time - GAIT_START) / PERIOD * Math.PI * 2) * gaitAmount;
    arm.shoulder.rotation.z = arm.side * -0.035;
    arm.elbow.rotation.x = -0.17 - 0.12 * gaitAmount;
  }
  const push = smooth(0, 5.15, time);
  camera.position.set(-4.3 + 0.10 * push, 2.7, 6.8 - 0.65 * push);
  camera.lookAt(0.3 + 0.10 * push, 0.5, -0.65 - 0.65 * push);
  camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);
  const visibleLegs = variant === '572' ? humanLegs : dogLegs;
  contacts.forEach((contact, i) => { contact.actualSole = visibleLegs[i].foot.localToWorld(V(0, -0.0435, 0)).toArray(); });
  renderer.render(scene, camera);
}
function cameraState() { window.__bfTrace?.add(531);
  return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
}
function geometryDefinition(g) { window.__bfTrace?.add(534);
  const definition = { id: g.uuid, type: g.type };
  if (g.parameters && !['ExtrudeGeometry', 'TubeGeometry'].includes(g.type)) definition.parameters = g.parameters;
  else {
    definition.attributes = Object.fromEntries(Object.entries(g.attributes).map(([key, a]) => [key, { itemSize: a.itemSize, array: Array.from(a.array) }]));
    definition.index = g.index ? Array.from(g.index.array) : null;
  }
  return definition;
}
function materialDefinition(m) { window.__bfTrace?.add(543);
  return { id: m.uuid, name: m.name, type: m.type, color: m.color?.toArray(), metalness: m.metalness, roughness: m.roughness, opacity: m.opacity, transparent: m.transparent, side: m.side, depthWrite: m.depthWrite, bumpScale: m.bumpScale,
    map: m.map ? { name: m.map.name, repeat: m.map.repeat.toArray(), wrapping: [m.map.wrapS, m.map.wrapT], source: m.map.userData } : null };
}
function definitions(root) { window.__bfTrace?.add(547);
  const geos = new Map(), mats = new Map();
  root.traverse(o => {
    if (o.geometry) geos.set(o.geometry.uuid, geometryDefinition(o.geometry));
    if (o.material) for (const m of Array.isArray(o.material) ? o.material : [o.material]) mats.set(m.uuid, materialDefinition(m));
  });
  return { geometries: [...geos.values()], materials: [...mats.values()] };
}
function transforms(root) { window.__bfTrace?.add(555);
  const objects = [];
  root.traverse(o => objects.push({
    id: o.uuid, parent: o.parent?.uuid, name: o.name, type: o.type, position: o.position.toArray(), quaternion: o.quaternion.toArray(), scale: o.scale.toArray(), visible: o.visible,
    castShadow: o.castShadow, receiveShadow: o.receiveShadow, geometry: o.geometry?.uuid,
    materials: o.material ? (Array.isArray(o.material) ? o.material : [o.material]).map(m => m.uuid) : [],
    instances: o.isInstancedMesh ? Array.from(o.instanceMatrix.array) : undefined,
    instanceColors: o.instanceColor ? Array.from(o.instanceColor.array) : undefined
  }));
  return objects;
}
const sharedDefinitions = definitions(world);
const humanDefinitions = definitions(human), dogDefinitions = definitions(dog);
window.reconstruction = {
  pause() {},
  seek(t) { if (!Number.isFinite(t)) throw new TypeError('seek requires finite seconds'); animate(t); },
  setVariant(id) { if (id !== '572' && id !== '571') throw new RangeError('variant must be 572 or 571'); variant = id; animate(time); },
  renderFrame(id, t) {
    if (id !== '572' && id !== '571') throw new RangeError('variant must be 572 or 571');
    if (!Number.isFinite(t)) throw new TypeError('renderFrame requires finite seconds');
    variant = id; animate(t);
  },
  getCameraState: cameraState,
  getNavigationState() { return navigation(time); },
  getInvariantState() {
    return {
      navigation: navigation(time), camera: cameraState(), objects: transforms(world), definitions: sharedDefinitions,
      lighting: [hemi, sun].map(l => ({ type: l.type, name: l.name, position: l.position.toArray(), quaternion: l.quaternion.toArray(), color: l.color.toArray(), groundColor: l.groundColor?.toArray(), intensity: l.intensity, castShadow: l.castShadow, target: l.target?.position.toArray(), shadow: l.shadow ? { bias: l.shadow.bias, normalBias: l.shadow.normalBias, radius: l.shadow.radius, mapSize: l.shadow.mapSize.toArray(), camera: l.shadow.camera.projectionMatrix.toArray() } : null })),
      rendering: { background: scene.background.toArray(), environment: environmentTexture.userData, environmentIntensity: scene.environmentIntensity, fog: { color: scene.fog.color.toArray(), near: scene.fog.near, far: scene.fog.far }, exposure: renderer.toneMappingExposure, toneMapping: renderer.toneMapping, shadowType: renderer.shadowMap.type }
    };
  },
  getEditedObjectState() {
    const bounds = new THREE.Box3().setFromObject(variant === '572' ? human : dog);
    return { variant, embodiment: variant === '572' ? 'articulated humanoid' : 'industrial quadruped', root: { position: robotRig.position.toArray(), quaternion: robotRig.quaternion.toArray(), scale: robotRig.scale.toArray(), visible: robotRig.visible },
      objects: transforms(variant === '572' ? human : dog), definitions: variant === '572' ? humanDefinitions : dogDefinitions,
      worldBounds: { min: bounds.min.toArray(), max: bounds.max.toArray() },
      contactOpacities: (variant === '572' ? humanLegs : dogLegs).map(leg => leg.contactShadow.material.opacity), contacts };
  }
};
animate(0);
