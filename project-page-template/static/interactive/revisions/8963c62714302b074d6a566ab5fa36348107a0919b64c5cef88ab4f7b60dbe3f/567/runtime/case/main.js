import * as THREE from '../vendor/three.module.js';

const WIDTH = 960, HEIGHT = 540, DURATION = 124 / 24;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d2d1be');
const camera = new THREE.PerspectiveCamera(50, WIDTH / HEIGHT, 0.08, 60);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.97;
document.body.appendChild(renderer.domElement);
const world = new THREE.Group();
world.name = 'shared-hospital';
scene.add(world);
const robotRoot = new THREE.Group();
robotRoot.name = 'robotRig';
scene.add(robotRoot);

const mat = (color, roughness = 0.65, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const cream = mat('#d6ceb5'), wallLower = mat('#d1cab7'), trim = mat('#53655f', 0.52);
const white = mat('#efeee5', 0.36), cabinet = mat('#b6ab8c', 0.67), seam = mat('#8e8b77');
const black = mat('#171f21', 0.48), rubber = mat('#242a2b', 0.9), steel = mat('#8e999a', 0.3, 0.75);
const silver = mat('#bdc6c6', 0.3, 0.82), darkMetal = mat('#394647', 0.4, 0.7);
const navy = mat('#0b263a', 0.96), navyLight = mat('#16384b', 0.9);
const skin = mat('#c39676', 0.8), hair = mat('#392c24', 0.96), hairBrown = mat('#695039', 0.95);
const red = mat('#9e211e', 0.35, 0.25), teal = mat('#366b70', 0.7);
const glow = new THREE.MeshStandardMaterial({ color: '#fafbf2', emissive: '#edf9ff', emissiveIntensity: 1.2 });
const glass = new THREE.MeshStandardMaterial({ color: '#b4c9c5', roughness: 0.2, metalness: 0.25, transparent: true, opacity: 0.4 });
const geometries = new Map();
function roundGeometry(w, h, d, r = 0.04) { window.__bfTrace?.add(34);
  const key = `r${w},${h},${d},${r}`;
  if (geometries.has(key)) return geometries.get(key);
  const g = new THREE.BoxGeometry(w, h, d, 5, 5, 5);
  const p = g.attributes.position;
  const v = new THREE.Vector3(), q = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    q.set(THREE.MathUtils.clamp(v.x, -w / 2 + r, w / 2 - r), THREE.MathUtils.clamp(v.y, -h / 2 + r, h / 2 - r), THREE.MathUtils.clamp(v.z, -d / 2 + r, d / 2 - r));
    v.sub(q).normalize().multiplyScalar(r).add(q);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  g.userData.proceduralDefinition = { shape: 'rounded-box', width: w, height: h, depth: d, radius: r };
  geometries.set(key, g);
  return g;
}
function mesh(g, material, parent, x = 0, y = 0, z = 0, name = '') { window.__bfTrace?.add(51);
  const m = new THREE.Mesh(g, material);
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  m.name = name;
  parent.add(m);
  return m;
}
function box(parent, w, h, d, material, x = 0, y = 0, z = 0, r = 0, name = '') { window.__bfTrace?.add(60);
  return mesh(r ? roundGeometry(w, h, d, Math.min(r, w / 2, h / 2, d / 2)) : new THREE.BoxGeometry(w, h, d), material, parent, x, y, z, name);
}
function ball(parent, x, y, z, sx, sy, sz, material, name = '') { window.__bfTrace?.add(63);
  const m = mesh(new THREE.SphereGeometry(1, 24, 16), material, parent, x, y, z, name);
  m.scale.set(sx, sy, sz);
  return m;
}
function cyl(parent, radius, length, material, x = 0, y = 0, z = 0, radius2 = radius) { window.__bfTrace?.add(68);
  return mesh(new THREE.CylinderGeometry(radius, radius2, length, 24), material, parent, x, y, z);
}
function rod(parent, a, b, radius, material, radius2 = radius) { window.__bfTrace?.add(71);
  const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b);
  const m = cyl(parent, radius, av.distanceTo(bv), material, 0, 0, 0, radius2);
  m.position.copy(av).add(bv).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), bv.sub(av).normalize());
  return m;
}
function group(parent, name, x = 0, y = 0, z = 0, yaw = 0) { window.__bfTrace?.add(78);
  const g = new THREE.Group();
  g.name = name; g.position.set(x, y, z); g.rotation.y = yaw; parent.add(g); return g;
}
function label(parent, text, w, h, x, y, z, options = {}) { window.__bfTrace?.add(82);
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = Math.round(512 * h / w);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = options.background || '#eeeede'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = options.color || '#223c38';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.font = `${options.weight || 600} ${options.size || Math.round(canvas.height * 0.62)}px Arial`;
  const lines = text.split('\n');
  lines.forEach((line, i) => ctx.fillText(line, 256, canvas.height * (i + 0.5) / lines.length, 488));
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const m = mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }), parent, x, y, z);
  m.userData.generatedText = { text, w, h, options };
  return m;
}
function floorTexture() { window.__bfTrace?.add(98);
  const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#818d92'; ctx.fillRect(0, 0, 1024, 1024);
  let seed = 568;
  const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 18000; i++) {
    const x = rand() * 1024, y = rand() * 1024, light = rand() > 0.48;
    ctx.strokeStyle = light ? `rgba(206,214,204,${0.04 + rand() * 0.15})` : `rgba(38,56,62,${0.04 + rand() * 0.11})`;
    ctx.lineWidth = 0.6 + rand() * 4.0;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 2, y + 15, x - 4, y + 31, x + rand() * 12 - 6, y + 8 + rand() * 125); ctx.stroke();
  }
  for (let i = 0; i < 4; i++) {
    ctx.strokeStyle = 'rgba(57,65,65,.15)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(i * 256, 0); ctx.lineTo(i * 256, 1024); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, i * 256); ctx.lineTo(1024, i * 256); ctx.stroke();
  }
  const tex = new THREE.CanvasTexture(canvas); tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3.5, 4); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
  tex.userData.proceduralDefinition = { algorithm: 'seeded-vinyl-bezier-streaks', seed: 568, width: 1024, height: 1024, streaks: 18000, baseColor: '#818d92', tileSeams: 4 };
  return tex;
}
const floorMat = new THREE.MeshStandardMaterial({ map: floorTexture(), color: '#89969d', roughness: 0.48, metalness: 0.06 });
box(world, 16, 0.12, 19, floorMat, -0.5, -0.06, 1.5);

// The solid corner has separate observation and doorway faces, with a real open 4B recess.
box(world, 7.4, 3.35, 0.18, cream, -3.7, 1.675, -0.09);
box(world, 7.4, 0.8, 0.035, wallLower, -3.7, 0.58, 0.018);
box(world, 7.4, 0.14, 0.06, trim, -3.7, 0.07, 0.045);
const doorRanges = [[-1.75, 1.38, '4A', false], [-4.05, 1.35, '4B', true]];
let edge = 0;
for (const [z, w, name, open] of doorRanges) {
  const near = z + w / 2, far = z - w / 2;
  box(world, 0.18, 3.35, edge - near, cream, -0.09, 1.675, (edge + near) / 2);
  box(world, 0.18, 0.82, w, cream, -0.09, 2.94, z);
  box(world, 0.07, 0.14, edge - near, trim, 0.025, 0.07, (edge + near) / 2);
  const d = group(world, `door-${name}`, 0.045, 0, z, Math.PI / 2);
  d.scale.y = 1.075;
  box(d, w + 0.16, 0.12, 0.17, trim, 0, 2.34, 0);
  box(d, 0.09, 2.34, 0.17, trim, -w / 2 - 0.035, 1.17, 0);
  box(d, 0.09, 2.34, 0.17, trim, w / 2 + 0.035, 1.17, 0);
  if (!open) {
    box(d, w - 0.04, 2.27, 0.07, cabinet, 0, 1.135, -0.012);
    box(d, w - 0.07, 0.29, 0.018, darkMetal, 0, 0.17, 0.034);
    box(d, 0.07, 0.19, 0.025, steel, -0.43, 0.98, 0.038);
    rod(d, [-0.43, 0.99, 0.09], [-0.29, 0.99, 0.09], 0.018, steel);
    label(d, 'WARD NOTICE\nSTAFF ONLY', 0.28, 0.31, 0, 1.57, 0.035, { size: 45 });
  } else {
    box(d, 1.6, 2.55, 0.08, wallLower, 0, 1.28, -1.65);
    box(d, 0.08, 2.55, 1.7, cream, -0.8, 1.28, -0.82);
    box(d, 0.08, 2.55, 1.7, cream, 0.8, 1.28, -0.82);
    box(d, 1.6, 0.02, 1.65, mat('#bdbb9f'), 0, 0.011, -0.8);
    const leaf = group(d, 'open-door-leaf', w / 2, 0, 0, -Math.PI * 0.49);
    box(leaf, w - 0.04, 2.27, 0.055, cabinet, -(w - 0.04) / 2, 1.135, 0);
    const chair = group(d, 'clinical-chair', 0.25, 0, -0.24, -0.1);
    box(chair, 0.61, 0.13, 0.58, trim, 0, 0.53, 0, 0.055);
    const back = box(chair, 0.59, 0.69, 0.12, trim, 0, 0.97, -0.26, 0.05); back.rotation.x = -0.1;
    for (const x of [-0.29, 0.29]) {
      rod(chair, [x, 0.13, -0.19], [x, 0.77, -0.19], 0.025, steel);
      rod(chair, [x, 0.12, 0.22], [x, 0.51, 0.22], 0.025, steel);
      box(chair, 0.08, 0.06, 0.53, black, x, 0.77, 0, 0.025);
    }
    box(d, 0.22, 0.35, 0.13, black, 0.44, 1.47, -1.52, 0.045);
  }
  label(d, name, 0.29, 0.4, -w / 2 - 0.23, 1.63, 0.075, { background: '#405b54', color: '#ffffea' });
  edge = far;
}
box(world, 0.18, 3.35, 2.25, cream, -0.09, 1.675, -5.775);
box(world, 0.06, 0.14, 2.25, trim, 0.025, 0.07, -5.775);
box(world, 5.5, 3.35, 0.15, cream, 2.65, 1.675, -7.0);
box(world, 5.5, 0.14, 0.05, trim, 2.65, 0.07, -6.89);
box(world, 0.16, 3.35, 6.08, cream, 3.25, 1.675, -3.97);
box(world, 0.045, 0.15, 6.08, trim, 3.15, 0.075, -3.97);
box(world, 0.09, 0.095, 5.75, white, 3.1, 0.84, -3.93, 0.025);
box(world, 0.24, 1.15, 0.54, cream, 3.57, 0.575, 0.35);
box(world, 0.25, 0.15, 0.55, trim, 3.56, 0.075, 0.35);
box(world, 0.18, 3.35, 7.2, cream, -7.4, 1.675, 3.5);

function windowFrame(parent, x, y, z, w, h, observation = false) { window.__bfTrace?.add(176);
  const g = group(parent, observation ? 'observation-window' : 'daylight-window', x, y, z);
  box(g, w, h, 0.07, observation ? mat('#718b86', 0.4) : mat('#d7e5e3', 0.8), 0, 0, -0.03);
  if (!observation) {
    box(g, w - 0.12, h * 0.4, 0.015, mat('#b9cbb9'), 0, -h * 0.27, 0.013);
    for (let i = 0; i < 4; i++) box(g, 0.21, h * 0.35, 0.02, mat('#a9b4ac'), -w * 0.38 + i * w * 0.25, -h * 0.14, 0.025);
    box(g, w - 0.1, 0.17, 0.03, mat('#e4e5dc'), 0, -h * 0.24, 0.037);
  }
  for (const xx of [-w / 2, 0, w / 2]) box(g, 0.065, h + 0.12, 0.13, trim, xx, 0, 0.045);
  for (const yy of [-h / 2, h / 2]) box(g, w + 0.1, 0.065, 0.13, trim, 0, yy, 0.045);
  box(g, w + 0.14, 0.045, 0.23, white, 0, -h / 2 - 0.04, 0.07);
  if (observation) {
    for (let j = 0; j < 30; j++) {
      const yy = h / 2 - 0.045 - j * h / 30;
      box(g, w * 0.46, 0.012, 0.035, mat(j < 8 ? '#a4aa98' : '#94a397'), -w * 0.25, yy, 0.06);
      box(g, w * 0.46, 0.012, 0.035, mat(j < 8 ? '#a4aa98' : '#94a397'), w * 0.25, yy, 0.06);
    }
    box(g, w - 0.13, h - 0.1, 0.009, glass, 0, 0, 0.085);
  } else {
    box(g, w - 0.08, h * 0.34, 0.02, mat('#d0d1c3'), 0, h * 0.33, 0.082);
  }
  return g;
}
windowFrame(world, -5.32, 2.0, 0.1, 3.9, 1.91);
windowFrame(world, -2.03, 1.96, 0.1, 1.5, 1.5, true);
const stationSign = group(world, 'hanging-nurse-station-sign', -4.2, 0, 1.2, 0.25);
label(stationSign, 'NURSE STATION', 2.43, 0.38, 0, 2.84, 0, { size: 85 });
for (const x of [-1.1, 1.1]) rod(stationSign, [x, 3.31, 0], [x, 3.03, 0], 0.005, steel);

function poster(parent, x, y, z, yaw, title) { window.__bfTrace?.add(205);
  const g = group(parent, `poster-${title}`, x, y, z, yaw);
  box(g, 0.4, 0.64, 0.024, white, 0, 0, 0);
  label(g, title, 0.37, 0.105, 0, 0.245, 0.017, { background: '#2f726c', color: '#ffffff', size: 71 });
  for (let i = 0; i < 7; i++) box(g, i % 2 ? 0.26 : 0.31, 0.012, 0.008, mat('#7e9390'), -0.013, 0.13 - i * 0.057, 0.018);
  for (const x2 of [-0.1, 0, 0.1]) ball(g, x2, -0.245, 0.025, 0.025, 0.025, 0.006, teal);
}
poster(world, -3.2, 1.93, 0.12, 0, 'CARE');
poster(world, 0.12, 1.73, -5.21, Math.PI / 2, 'HAND HYGIENE');
poster(world, 2.8, 1.74, -6.9, 0, 'PATIENT CARE');
poster(world, 3.145, 1.75, -3.15, -Math.PI / 2, 'WARD SAFETY');
function sanitizer(parent, x, y, z, yaw) { window.__bfTrace?.add(216);
  const g = group(parent, 'sanitizer', x, y, z, yaw);
  box(g, 0.23, 0.51, 0.04, white, 0, 0, 0, 0.045);
  box(g, 0.18, 0.31, 0.12, white, 0, 0.05, 0.08, 0.065);
  box(g, 0.06, 0.085, 0.018, black, 0, 0.025, 0.151, 0.016);
  box(g, 0.12, 0.025, 0.09, white, 0, -0.19, 0.08, 0.009);
  label(g, '+', 0.08, 0.07, 0, 0.125, 0.15, { color: '#356c56' });
}
sanitizer(world, 0.115, 1.18, -0.65, Math.PI / 2);
box(world, 0.07, 0.16, 0.018, white, -0.57, 1.64, 0.12, 0.008);
box(world, 0.02, 0.02, 0.012, black, -0.57, 1.67, 0.135);
for (const [a, b] of [[-2.4, -3.39], [-4.74, -6.7]]) {
  box(world, 0.11, 0.095, Math.abs(b - a), white, 0.145, 0.84, (a + b) / 2, 0.025);
  for (const z of [a, b]) box(world, 0.16, 0.055, 0.045, steel, 0.08, 0.8, z);
}

const desk = group(world, 'nurse-station-counter', -1.75, 0, 2.6);
box(desk, 2.4, 0.82, 0.64, cabinet, 0, 0.44, 0);
box(desk, 2.52, 0.07, 0.92, white, 0, 0.89, -0.1, 0.02);
box(desk, 0.22, 1.22, 0.78, cabinet, 1.06, 0.61, 0);
box(desk, 2.51, 0.06, 0.29, white, 0, 1.25, 0.24, 0.012);
box(desk, 2.33, 0.28, 0.09, cabinet, 0, 1.08, 0.26);
for (const x of [-0.77, 0, 0.77]) {
  box(desk, 0.73, 0.59, 0.018, cabinet, x, 0.49, 0.329);
  box(desk, 0.008, 0.59, 0.01, seam, x + 0.367, 0.49, 0.34);
  rod(desk, [x - 0.1, 0.68, 0.35], [x + 0.1, 0.68, 0.35], 0.012, steel);
}
const monitor = group(desk, 'workstation-monitor', -0.12, 0.92, -0.21, Math.PI - 0.1);
box(monitor, 0.3, 0.025, 0.22, black, 0, 0, 0, 0.012);
box(monitor, 0.05, 0.19, 0.045, black, 0, 0.09, 0);
box(monitor, 0.57, 0.38, 0.05, black, 0, 0.37, 0, 0.018);
box(monitor, 0.525, 0.335, 0.008, mat('#b8d1d1'), 0, 0.37, 0.028);
for (let i = 0; i < 6; i++) box(monitor, 0.34, 0.012, 0.005, teal, 0.035, 0.47 - i * 0.035, 0.033);
box(desk, 0.41, 0.022, 0.14, black, -0.1, 0.94, -0.47, 0.01);
for (let i = 0; i < 11; i++) for (let j = 0; j < 3; j++) box(desk, 0.026, 0.007, 0.025, mat('#717b7b'), -0.27 + i * 0.034, 0.954, -0.513 + j * 0.035);
box(desk, 0.065, 0.035, 0.09, black, 0.22, 0.947, -0.45, 0.025);
for (let i = 0; i < 4; i++) {
  const paper = box(desk, 0.29, 0.002, 0.39, white, -0.69 + i * 0.012, 0.931 + i * 0.003, -0.27);
  paper.rotation.y = -0.13;
}
box(desk, 0.39, 0.075, 0.26, black, 0.63, 0.96, 0.02, 0.01);
box(desk, 0.35, 0.008, 0.22, white, 0.63, 1.001, 0.015);
box(desk, 0.18, 0.16, 0.16, white, -0.8, 0.99, 0.2, 0.013);
for (let i = 0; i < 4; i++) rod(desk, [-0.85 + i * 0.028, 1.04, 0.2], [-0.83 + i * 0.027, 1.19, 0.205], 0.008, i % 2 ? black : teal);

function officeChair(x, z, yaw) { window.__bfTrace?.add(261);
  const g = group(world, 'office-chair', x, 0, z, yaw);
  cyl(g, 0.042, 0.45, steel, 0, 0.29, 0);
  box(g, 0.49, 0.1, 0.48, trim, 0, 0.57, 0, 0.08);
  box(g, 0.49, 0.58, 0.12, cabinet, 0, 0.9, -0.23, 0.09);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    rod(g, [0, 0.16, 0], [Math.sin(a) * 0.4, 0.1, Math.cos(a) * 0.4], 0.022, black);
    ball(g, Math.sin(a) * 0.4, 0.06, Math.cos(a) * 0.4, 0.055, 0.055, 0.035, rubber);
  }
  for (const x2 of [-0.27, 0.27]) {
    rod(g, [x2, 0.58, -0.14], [x2, 0.8, -0.14], 0.018, black);
    box(g, 0.075, 0.05, 0.29, black, x2, 0.81, 0, 0.02);
  }
}
officeChair(-2.33, 1.6, 0);

function person(name, x, z, yaw, seated, hairMat) { window.__bfTrace?.add(278);
  const g = group(world, name, x, 0, z, yaw);
  const pelvisY = seated ? 0.65 : 0.92;
  ball(g, 0, pelvisY, 0, 0.195, 0.18, 0.125, navy);
  const torso = box(g, 0.41, 0.5, 0.245, navy, 0, pelvisY + 0.29, 0, 0.12);
  torso.rotation.x = seated ? 0.15 : 0;
  cyl(g, 0.063, 0.11, skin, 0, pelvisY + 0.595, 0.015);
  const head = group(g, 'head', 0, pelvisY + 0.765, seated ? 0.09 : 0.01);
  head.rotation.x = seated ? 0.38 : 0.035;
  ball(head, 0, 0, 0, 0.105, 0.142, 0.104, skin);
  ball(head, 0, 0.055, -0.029, 0.11, 0.111, 0.1, hairMat);
  ball(head, 0, 0.02, -0.128, 0.065, 0.064, 0.06, hairMat);
  ball(head, 0, -0.018, 0.102, 0.02, 0.027, 0.028, skin);
  for (const xx of [-0.041, 0.041]) {
    ball(head, xx, 0.014, 0.093, 0.018, 0.009, 0.01, white);
    ball(head, xx, 0.014, 0.102, 0.007, 0.007, 0.004, hair);
    ball(head, xx * 2.4, -0.016, 0, 0.016, 0.033, 0.025, skin);
  }
  box(head, 0.038, 0.005, 0.005, mat('#946457'), 0, -0.069, 0.082);
  rod(g, [-0.07, pelvisY + 0.52, 0.125], [0, pelvisY + 0.43, 0.137], 0.01, navyLight);
  rod(g, [0.07, pelvisY + 0.52, 0.125], [0, pelvisY + 0.43, 0.137], 0.01, navyLight);
  box(g, 0.065, 0.079, 0.014, white, 0.12, pelvisY + 0.36, 0.132, 0.005);
  box(g, 0.04, 0.02, 0.004, teal, 0.12, pelvisY + 0.38, 0.142);
  for (const side of [-1, 1]) {
    const hip = [side * 0.115, pelvisY, 0];
    const knee = [side * 0.13, seated ? 0.47 : 0.5, seated ? 0.39 : side * 0.028];
    const ankle = [side * 0.135, 0.1, seated ? 0.38 : side * 0.05];
    rod(g, hip, knee, 0.105, navy, 0.09); rod(g, knee, ankle, 0.087, navy, 0.069);
    box(g, 0.15, 0.1, 0.27, rubber, ankle[0], 0.06, ankle[2] + 0.07, 0.04);
    box(g, 0.153, 0.022, 0.275, white, ankle[0], 0.024, ankle[2] + 0.07, 0.014);
    const shoulder = [side * 0.22, pelvisY + 0.43, 0];
    const elbow = [side * 0.27, pelvisY + 0.17, seated ? 0.18 : 0.075];
    const hand = [side * (seated ? 0.16 : 0.12), seated ? 0.947 : pelvisY + 0.22, seated ? 0.49 : 0.26];
    const middle = shoulder.map((n, i) => n * 0.45 + elbow[i] * 0.55);
    rod(g, shoulder, middle, 0.095, navy, 0.079);
    rod(g, middle, elbow, 0.059, skin, 0.05);
    ball(g, ...elbow, 0.052, 0.058, 0.052, skin);
    rod(g, elbow, hand, 0.047, skin, 0.036);
    ball(g, ...hand, 0.037, 0.025, 0.069, skin);
  }
  return g;
}
person('nurse-seated', -2.33, 1.64, 0, true, hairBrown);
person('nurse-standing-window', -3.82, 1.13, 0.42, false, hair);
person('nurse-standing-conversation', -4.43, 2.01, Math.PI - 0.38, false, hair);

function trolley(x, z, yaw = 0) { window.__bfTrace?.add(324);
  const g = group(world, 'clinical-trolley', x, 0, z, yaw);
  for (const y of [0.23, 0.64, 0.99]) {
    box(g, 0.57, 0.033, 0.43, steel, 0, y, 0);
    box(g, 0.55, 0.07, 0.022, steel, 0, y + 0.046, -0.21);
  }
  for (const xx of [-0.27, 0.27]) for (const zz of [-0.19, 0.19]) {
    rod(g, [xx, 0.1, zz], [xx, 1.08, zz], 0.016, steel);
    ball(g, xx, 0.07, zz, 0.046, 0.065, 0.038, rubber);
  }
  for (const xx of [-0.12, 0.07]) {
    cyl(g, 0.039, 0.16, white, xx, 1.09, -0.04);
    cyl(g, 0.024, 0.025, teal, xx, 1.184, -0.04);
  }
  box(g, 0.22, 0.13, 0.2, mat('#afc1bc'), 0.08, 0.72, 0);
}
trolley(-3.4, 0.54);
trolley(2.75, -5.85, -0.2);
function medicalStand(x, z) { window.__bfTrace?.add(342);
  const g = group(world, 'vital-signs-cart', x, 0, z);
  rod(g, [0, 0.1, 0], [0, 1.76, 0], 0.027, white);
  box(g, 0.41, 0.31, 0.14, white, 0, 1.54, 0.02, 0.038);
  box(g, 0.29, 0.18, 0.012, mat('#23667c', 0.3), 0, 1.56, 0.098, 0.013);
  label(g, '98  72', 0.245, 0.09, 0, 1.57, 0.107, { background: '#174858', color: '#afffc0', size: 119 });
  box(g, 0.34, 0.045, 0.31, teal, 0, 0.95, 0.06, 0.015);
  for (let i = 0; i < 5; i++) {
    const a = i * Math.PI * 2 / 5;
    rod(g, [0, 0.16, 0], [Math.sin(a) * 0.33, 0.09, Math.cos(a) * 0.33], 0.017, white);
    ball(g, Math.sin(a) * 0.33, 0.055, Math.cos(a) * 0.33, 0.041, 0.041, 0.03, rubber);
  }
  const points = [[0.2, 1.55, 0.01], [0.32, 1.1, 0.03], [0.29, 0.64, 0.09], [0.17, 0.73, 0.08]].map(p => new THREE.Vector3(...p));
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 32, 0.012, 8, false), black, g);
}
medicalStand(1.5, -6.5);
function extinguisher(x, z, yaw = 0) { window.__bfTrace?.add(358);
  const g = group(world, 'fire-extinguisher', x, 0, z, yaw);
  cyl(g, 0.1, 0.45, red, 0, 0.43, 0);
  ball(g, 0, 0.66, 0, 0.096, 0.071, 0.096, red);
  cyl(g, 0.032, 0.07, steel, 0, 0.73, 0);
  box(g, 0.17, 0.025, 0.06, black, 0.03, 0.775, 0);
  label(g, 'FIRE\nEXTINGUISHER', 0.15, 0.22, 0, 0.45, 0.097, { size: 43 });
  const points = [[0.07, 0.74, 0], [0.17, 0.65, 0], [0.15, 0.34, 0]].map(p => new THREE.Vector3(...p));
  mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 24, 0.016, 8, false), rubber, g);
}
extinguisher(2.61, -6.78);
label(world, 'FIRE', 0.23, 0.25, 2.6, 1.3, -6.89, { background: '#a12223', color: '#ffffff' });
extinguisher(3.36, 0.59, -0.7);
const farDoor = group(world, 'far-clinical-door', 4.53, 0, -6.86);
box(farDoor, 1.04, 2.37, 0.09, trim, 0, 1.185, 0);
box(farDoor, 0.87, 2.2, 0.05, cabinet, 0, 1.1, 0.06);
box(farDoor, 0.54, 0.64, 0.035, trim, 0, 1.62, 0.1);
box(farDoor, 0.45, 0.55, 0.012, glass, 0, 1.62, 0.123);
label(farDoor, 'TREATMENT', 0.72, 0.15, 0, 2.53, 0.1, { size: 71 });

// Suspended acoustic grid, luminous strips, vents and a ceiling security dome.
const ceilingMat = mat('#d8d9ce', 0.95);
ceilingMat.emissive = new THREE.Color('#93978c'); ceilingMat.emissiveIntensity = 0.23;
box(world, 16, 0.08, 18, ceilingMat, -0.5, 3.4, 1).castShadow = false;
for (let x = -7; x <= 7; x += 0.72) box(world, 0.015, 0.012, 18, mat('#b9c0b6'), x, 3.35, 1).castShadow = false;
for (let z = -8; z <= 9; z += 0.72) box(world, 16, 0.012, 0.015, mat('#b9c0b6'), -0.5, 3.35, z).castShadow = false;
for (const [x, z] of [[-4.2, 1.4], [-1.3, 2.6], [2.2, -0.7], [2.2, -3.7], [2.2, -6.1], [-4.2, 4.7]]) {
  box(world, 0.65, 0.037, 1.25, white, x, 3.327, z, 0.008).castShadow = false;
  box(world, 0.53, 0.012, 1.14, glow, x, 3.3, z).castShadow = false;
}
for (const [x, z] of [[-5.4, 1.5], [1, -5.9]]) {
  box(world, 0.54, 0.025, 0.54, white, x, 3.322, z);
  for (let i = 0; i < 9; i++) box(world, 0.43, 0.009, 0.014, trim, x, 3.304, z - 0.2 + i * 0.05);
}
cyl(world, 0.12, 0.045, white, -0.02, 3.291, 0.5);
ball(world, -0.02, 3.24, 0.5, 0.09, 0.09, 0.09, mat('#182729', 0.14, 0.25));
const ambient = new THREE.HemisphereLight('#f5f5e9', '#667b81', 1.05); ambient.name = 'soft-room-bounce'; world.add(ambient);
const key = new THREE.DirectionalLight('#fff1de', 1.65);
key.name = 'window-key'; key.position.set(-1, 7, 3); key.target.position.set(0, 0, -1);
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -9; key.shadow.camera.right = 9; key.shadow.camera.top = 8; key.shadow.camera.bottom = -8;
key.shadow.normalBias = 0.012; key.shadow.bias = -0.00012; key.shadow.radius = 4; world.add(key, key.target);
for (const [x, z, power] of [[-4, 2, 20], [2.5, -1, 18], [2.5, -5, 13]]) {
  const l = new THREE.PointLight('#f7f5e5', power, 10, 2); l.position.set(x, 3.1, z); l.name = 'fluorescent-fill'; world.add(l);
}
const reflectionRoom = new THREE.Scene();
reflectionRoom.background = new THREE.Color('#aebabc');
const envShell = new THREE.Mesh(new THREE.BoxGeometry(16, 12, 16), new THREE.MeshBasicMaterial({ color: '#778889', side: THREE.BackSide }));
reflectionRoom.add(envShell);
for (const [x, y, z, w, h, d, color] of [
  [-5, 1, 2, 0.05, 5, 7, '#f0f6f6'],
  [3, 4, 0, 6, 0.05, 3, '#fff7dc'],
  [1, 0, -6, 6, 4, 0.05, '#b1c5c7'],
  [5, 1, 4, 0.05, 4, 2, '#e9eeee'],
  [0, -4, 0, 14, 0.05, 14, '#495c61']
]) {
  const panel = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), new THREE.MeshBasicMaterial({ color }));
  panel.position.set(x, y, z); reflectionRoom.add(panel);
}
const pmrem = new THREE.PMREMGenerator(renderer);
const environmentTarget = pmrem.fromScene(reflectionRoom, 0.035);
scene.environment = environmentTarget.texture;
scene.userData.environmentDefinition = {
  type: 'procedural-softbox-room',
  objects: reflectionRoom.toJSON(),
  blurSigma: 0.035
};
pmrem.dispose();

function joint(parent, x, y, z, r, name) { window.__bfTrace?.add(427);
  const g = group(parent, name, x, y, z);
  ball(g, 0, 0, 0, r, r, r, black);
  const hub = cyl(g, r * 0.79, r * 2.1, silver); hub.rotation.z = Math.PI / 2;
  for (const side of [-1, 1]) {
    const inset = cyl(g, r * 0.52, 0.009, darkMetal, side * r * 1.065, 0, 0); inset.rotation.z = Math.PI / 2;
    const pin = cyl(g, r * 0.17, 0.012, steel, side * r * 1.13, 0, 0); pin.rotation.z = Math.PI / 2;
  }
  return g;
}
function shellSegment(parent, length, width, depth, name) { window.__bfTrace?.add(437);
  const g = group(parent, name);
  box(g, width, length, depth, silver, 0, -length / 2, 0, Math.min(width, depth) * 0.37);
  box(g, width * 0.56, length * 0.66, 0.015, darkMetal, 0, -length * 0.52, -depth / 2 + 0.003, 0.013);
  for (const yy of [-0.06, -length + 0.06]) for (const xx of [-width * 0.26, width * 0.26]) {
    ball(g, xx, yy, depth / 2 - 0.004, 0.008, 0.008, 0.004, darkMetal);
  }
  return g;
}
function cameraHead(parent, y, scale = 1) { window.__bfTrace?.add(446);
  const g = group(parent, 'rounded-camera-head', 0, y, 0);
  g.scale.setScalar(scale);
  ball(g, 0, 0.024, 0, 0.145, 0.129, 0.154, silver);
  box(g, 0.254, 0.136, 0.18, silver, 0, -0.029, 0.065, 0.045);
  box(g, 0.235, 0.07, 0.025, black, 0, 0.026, 0.149, 0.023);
  for (const [x, r] of [[-0.062, 0.036], [0.07, 0.027]]) {
    const rim = cyl(g, r, 0.021, steel, x, 0.026, 0.17); rim.rotation.x = Math.PI / 2;
    const lens = cyl(g, r * 0.76, 0.023, mat('#09222c', 0.1, 0.45), x, 0.026, 0.183); lens.rotation.x = Math.PI / 2;
    ball(g, x - r * 0.2, 0.026 + r * 0.25, 0.197, r * 0.23, r * 0.23, 0.002, mat('#b7ddde', 0.1, 0.4));
  }
  for (const side of [-1, 1]) {
    const rim = cyl(g, 0.06, 0.011, steel, side * 0.139, 0.015, 0); rim.rotation.z = Math.PI / 2;
    const inset = cyl(g, 0.041, 0.015, darkMetal, side * 0.147, 0.015, 0); inset.rotation.z = Math.PI / 2;
  }
  return g;
}
const humanoid = group(robotRoot, 'humanoid-568');
const hBody = group(humanoid, 'body');
box(hBody, 0.39, 0.45, 0.245, silver, 0, 1.325, 0, 0.085);
box(hBody, 0.20, 0.22, 0.029, darkMetal, 0, 1.31, -0.119, 0.035);
box(hBody, 0.14, 0.13, 0.028, steel, 0, 1.43, 0.121, 0.025);
cyl(hBody, 0.079, 0.15, black, 0, 1.04, 0);
for (let i = 0; i < 5; i++) cyl(hBody, 0.082, 0.011, steel, 0, 0.99 + i * 0.022, 0);
box(hBody, 0.33, 0.18, 0.24, silver, 0, 0.925, 0, 0.073);
cyl(hBody, 0.052, 0.13, black, 0, 1.59, 0);
rod(hBody, [-0.04, 1.54, 0.02], [-0.055, 1.66, 0.04], 0.012, steel);
rod(hBody, [0.04, 1.54, 0.02], [0.055, 1.66, 0.04], 0.012, steel);
cameraHead(hBody, 1.75);
const hLegs = [];
for (const side of [-1, 1]) {
  const hip = joint(humanoid, side * 0.145, 0.91, 0, 0.1, `hip-${side}`);
  const thigh = shellSegment(hip, 0.5, 0.17, 0.19, 'thigh');
  const knee = joint(thigh, 0, -0.5, 0, 0.07, 'knee');
  const shin = shellSegment(knee, 0.49, 0.13, 0.15, 'shin');
  const ankle = joint(shin, 0, -0.49, 0, 0.049, 'ankle');
  const foot = group(ankle, 'foot');
  box(foot, 0.15, 0.067, 0.28, silver, 0, -0.024, 0.06, 0.032);
  box(foot, 0.152, 0.019, 0.28, rubber, 0, -0.06, 0.06, 0.014);
  hLegs.push({ side, hip, thigh, knee, shin, ankle, foot, upper: 0.5, lower: 0.49 });
}
const hArms = [];
for (const side of [-1, 1]) {
  const shoulder = joint(hBody, side * 0.236, 1.47, 0, 0.093, `shoulder-${side}`);
  const upper = shellSegment(shoulder, 0.29, 0.12, 0.14, 'upper-arm');
  const elbow = joint(upper, 0, -0.29, 0, 0.057, 'elbow');
  const forearm = shellSegment(elbow, 0.26, 0.095, 0.115, 'forearm');
  const wrist = joint(forearm, 0, -0.26, 0, 0.036, 'wrist');
  box(wrist, 0.087, 0.096, 0.045, silver, 0, -0.055, 0, 0.015);
  for (let i = 0; i < 4; i++) {
    const f = group(wrist, 'finger', -0.031 + i * 0.021, -0.106, 0.005);
    box(f, 0.016, 0.043, 0.02, steel, 0, -0.017, 0, 0.007);
    box(f, 0.016, 0.023, 0.02, darkMetal, 0, -0.041, 0.008, 0.007);
  }
  hArms.push({ side, shoulder, elbow });
}
const dog = group(robotRoot, 'quadruped-567');
const dBody = group(dog, 'body');
box(dBody, 0.38, 0.26, 0.93, silver, 0, 0.77, 0, 0.09);
box(dBody, 0.27, 0.028, 0.53, darkMetal, 0, 0.9, -0.07, 0.014);
for (let i = 0; i < 6; i++) box(dBody, 0.19, 0.012, 0.019, black, 0, 0.923, -0.19 + i * 0.045, 0.004);
cyl(dBody, 0.066, 0.19, black, 0, 0.952, 0.43);
rod(dBody, [-0.045, 0.86, 0.43], [-0.06, 1.04, 0.48], 0.014, steel);
cameraHead(dBody, 1.095, 0.96).position.z = 0.48;
box(dBody, 0.11, 0.05, 0.033, red, 0, 0.775, -0.471, 0.014);
const dLegs = [];
for (const front of [-1, 1]) for (const side of [-1, 1]) {
  const hip = joint(dog, side * 0.218, 0.76, front * 0.35, 0.085, `hip-${front}-${side}`);
  const thigh = shellSegment(hip, 0.365, 0.11, 0.13, 'upper-leg');
  const knee = joint(thigh, 0, -0.365, 0, 0.052, 'knee');
  const shin = shellSegment(knee, 0.36, 0.055, 0.075, 'lower-leg');
  const ankle = joint(shin, 0, -0.36, 0, 0.03, 'ankle');
  const foot = group(ankle, 'paw');
  ball(foot, 0, -0.02, 0.022, 0.055, 0.031, 0.075, rubber);
  dLegs.push({ front, side, hip, thigh, knee, shin, ankle, foot, upper: 0.365, lower: 0.36 });
}
function contactShadow(parent, name, width, depth, opacity) { window.__bfTrace?.add(522);
  const material = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: { opacity: { value: opacity } },
    vertexShader: 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'varying vec2 vUv; uniform float opacity; void main(){float r=length((vUv-0.5)*2.0);float a=opacity*pow(max(0.0,1.0-r*r),3.0);gl_FragColor=vec4(0.055,0.072,0.075,a);}'
  });
  const m = mesh(new THREE.CircleGeometry(1, 48), material, parent, 0, 0.007, 0, name);
  m.rotation.x = -Math.PI / 2; m.scale.set(width, depth, 1);
  m.castShadow = false; m.receiveShadow = false; m.renderOrder = 2; return m;
}
contactShadow(humanoid, 'body-contact-shadow', 0.39, 0.3, 0.12);
contactShadow(dog, 'body-contact-shadow', 0.44, 0.76, 0.12);
for (const leg of hLegs) leg.shadow = contactShadow(humanoid, `sole-shadow-${leg.side}`, 0.135, 0.22, 0.37);
for (const leg of dLegs) leg.shadow = contactShadow(dog, `paw-shadow-${leg.front}-${leg.side}`, 0.11, 0.13, 0.39);

const ROUTE = { start: [0.98, 0, 1.35], line: 0.48, radius: 0.65, endZ: -3.72 };
const arcLength = ROUTE.radius * Math.PI / 2;
const cornerX = ROUTE.start[0] + ROUTE.line;
const finalX = cornerX + ROUTE.radius;
const cornerZ = ROUTE.start[2] - ROUTE.radius;
const totalDistance = ROUTE.line + arcLength + cornerZ - ROUTE.endZ;
function pathAtDistance(distance) { window.__bfTrace?.add(545);
  const s = THREE.MathUtils.clamp(distance, 0, totalDistance);
  if (s <= ROUTE.line) return { position: [ROUTE.start[0] + s, 0, ROUTE.start[2]], yaw: Math.PI / 2 };
  if (s < ROUTE.line + arcLength) {
    const a = (s - ROUTE.line) / ROUTE.radius;
    return { position: [cornerX + ROUTE.radius * Math.sin(a), 0, cornerZ + ROUTE.radius * Math.cos(a)], yaw: Math.PI / 2 + a };
  }
  return { position: [finalX, 0, cornerZ - (s - ROUTE.line - arcLength)], yaw: Math.PI };
}
const smooth = x => { const k = THREE.MathUtils.clamp(x, 0, 1); return k * k * (3 - 2 * k); };
function distanceAtTime(t) { window.__bfTrace?.add(555);
  const start = 0.18, end = 4.79, ramp = 0.45;
  const movingTime = end - start;
  const speed = totalDistance / (movingTime - ramp);
  const u = THREE.MathUtils.clamp(t - start, 0, movingTime);
  if (u < ramp) return speed * u * u / (2 * ramp);
  if (u > movingTime - ramp) {
    const v = movingTime - u;
    return totalDistance - speed * v * v / (2 * ramp);
  }
  return speed * (u - ramp / 2);
}
function groundOffset(s, lateral, forward) { window.__bfTrace?.add(567);
  const p = pathAtDistance(s);
  return new THREE.Vector3(p.position[0] + lateral * Math.cos(p.yaw) + forward * Math.sin(p.yaw), 0, p.position[2] - lateral * Math.sin(p.yaw) + forward * Math.cos(p.yaw));
}
function footTarget(s, lateral, fore, phaseOffset, stride, lift) { window.__bfTrace?.add(571);
  const phase = s / stride + phaseOffset;
  const n = Math.floor(phase), f = phase - n, stance = 0.61;
  const contactDistance = (n - phaseOffset) * stride + stride * stance / 2;
  let target;
  if (f < stance) {
    target = groundOffset(contactDistance, lateral, fore);
  } else {
    const u = (f - stance) / (1 - stance);
    const a = groundOffset(contactDistance, lateral, fore);
    const b = groundOffset(contactDistance + stride, lateral, fore);
    target = a.lerp(b, smooth(u));
    target.y = lift * Math.sin(Math.PI * u);
  }
  return target;
}
function scheduledFoot(t, s, lateral, fore, phaseOffset, stride, lift) { window.__bfTrace?.add(587);
  const settleStart = 4.30;
  if (t < settleStart) return footTarget(s, lateral, fore, phaseOffset, stride, lift);
  const a = footTarget(distanceAtTime(settleStart), lateral, fore, phaseOffset, stride, lift);
  const b = groundOffset(totalDistance, lateral, fore);
  const delay = phaseOffset > 0 ? 0.13 : 0;
  const u = THREE.MathUtils.clamp((t - settleStart - delay) / 0.5, 0, 1);
  const y = a.y;
  a.lerp(b, smooth(u));
  a.y = y * (1 - smooth(u)) + lift * 0.65 * Math.sin(Math.PI * u);
  return a;
}
function solveLeg(leg, target, hipHeight, bendSign, ankleHeight) { window.__bfTrace?.add(599);
  leg.target = target.clone(); leg.ankleHeight = ankleHeight;
  leg.hip.position.y = hipHeight;
  const local = robotRoot.worldToLocal(target.clone());
  local.y += ankleHeight;
  const delta = local.sub(leg.hip.position);
  const yaw = Math.atan2(delta.x, -delta.y);
  leg.hip.rotation.z = yaw;
  const vertical = Math.hypot(delta.x, delta.y);
  const dist = THREE.MathUtils.clamp(Math.hypot(vertical, delta.z), 0.05, leg.upper + leg.lower - 0.002);
  const theta = Math.atan2(-delta.z, vertical);
  const alpha = Math.acos(THREE.MathUtils.clamp((leg.upper ** 2 + dist ** 2 - leg.lower ** 2) / (2 * leg.upper * dist), -1, 1));
  const knee = Math.PI - Math.acos(THREE.MathUtils.clamp((leg.upper ** 2 + leg.lower ** 2 - dist ** 2) / (2 * leg.upper * leg.lower), -1, 1));
  leg.thigh.rotation.x = theta - bendSign * alpha;
  leg.shin.rotation.x = bendSign * knee;
  leg.foot.rotation.x = -leg.thigh.rotation.x - leg.shin.rotation.x;
  leg.foot.rotation.z = -yaw;
  leg.shadow.position.copy(robotRoot.worldToLocal(target.clone()));
  leg.shadow.position.y = 0.008;
  leg.shadow.material.uniforms.opacity.value = 0.4 * Math.exp(-target.y * 13);
}
let activeVariant = '568', currentTime = 0, navigation;
function animateRobots(t, s) { window.__bfTrace?.add(621);
  const moving = smooth((t - 0.18) / 0.4) * (1 - smooth((t - 4.25) / 0.57));
  const stride = 1.25, cycle = s / stride * Math.PI * 2;
  const bob = 0.012 * Math.cos(cycle * 2) * moving;
  hBody.position.y = 0.055 + bob;
  hBody.rotation.z = Math.sin(cycle) * 0.022 * moving;
  hBody.rotation.x = -0.025 * moving;
  for (const leg of hLegs) {
    const target = scheduledFoot(t, s, leg.side * 0.145, 0, leg.side < 0 ? 0 : 0.5, stride, 0.13);
    solveLeg(leg, target, 0.95 + bob, 1, 0.078);
  }
  for (const arm of hArms) {
    const leg = hLegs.find(l => l.side === arm.side);
    const localTarget = robotRoot.worldToLocal(leg.target.clone());
    arm.shoulder.rotation.x = localTarget.z * 1.18 * moving;
    arm.shoulder.rotation.z = arm.side * 0.06;
    arm.elbow.rotation.x = -0.23 - 0.12 * moving * (1 + arm.side * Math.sin(cycle));
  }
  const dogBob = Math.cos(cycle * 2) * 0.013 * moving;
  dBody.position.y = -0.045 + dogBob;
  dBody.rotation.x = Math.sin(cycle * 2) * 0.017 * moving;
  for (const leg of dLegs) {
    const target = scheduledFoot(t, s, leg.side * 0.218, leg.front * 0.35, leg.front * leg.side < 0 ? 0 : 0.5, 0.84, 0.11);
    solveLeg(leg, target, 0.66 + dogBob, leg.front > 0 ? -1 : 1, 0.046);
  }
}
function cameraState() { window.__bfTrace?.add(647);
  return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
}
function seek(time) { window.__bfTrace?.add(650);
  if (!Number.isFinite(time)) throw new TypeError('seek requires finite seconds');
  currentTime = THREE.MathUtils.clamp(time, 0, DURATION);
  const s = distanceAtTime(currentTime), p = pathAtDistance(s);
  robotRoot.position.fromArray(p.position); robotRoot.rotation.set(0, p.yaw, 0); robotRoot.updateMatrixWorld(true);
  navigation = { position: p.position, yaw: p.yaw, traveledDistance: s, pathProgress: s / totalDistance, start: [...ROUTE.start], goal: [finalX, 0, ROUTE.endZ], totalDistance };
  animateRobots(currentTime, s);
  humanoid.visible = activeVariant === '568'; dog.visible = activeVariant === '567';
  const u = currentTime / DURATION;
  camera.position.set(3.5 + 0.28 * u, 2.73, 4.45 - 0.21 * u);
  camera.lookAt(-1.1 + 0.15 * u, 0.58, -0.7 - 0.16 * u);
  camera.updateMatrixWorld(true); scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}
function transformState(object) { window.__bfTrace?.add(664);
  return { name: object.name, type: object.type, position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray(), visible: object.visible };
}
function materialState(m) { window.__bfTrace?.add(667);
  return {
    type: m.type, color: m.color?.getHex(), roughness: m.roughness, metalness: m.metalness,
    opacity: m.opacity, transparent: m.transparent, side: m.side, emissive: m.emissive?.getHex(),
    emissiveIntensity: m.emissiveIntensity,
    envMapIntensity: m.envMapIntensity,
    uniforms: m.isShaderMaterial ? m.uniforms : undefined,
    vertexShader: m.isShaderMaterial ? m.vertexShader : undefined,
    fragmentShader: m.isShaderMaterial ? m.fragmentShader : undefined,
    map: m.map ? { id: m.map.uuid, repeat: m.map.repeat.toArray(), wrapS: m.map.wrapS, wrapT: m.map.wrapT, colorSpace: m.map.colorSpace, proceduralDefinition: m.map.userData.proceduralDefinition } : null
  };
}
function serializeTree(root) { window.__bfTrace?.add(679);
  const objects = [];
  root.traverse(o => {
    const record = transformState(o);
    if (o.geometry) record.geometry = { type: o.geometry.type, parameters: o.geometry.parameters, proceduralDefinition: o.geometry.userData.proceduralDefinition, id: o.geometry.uuid, positionCount: o.geometry.attributes.position.count };
    if (o.material) record.material = Array.isArray(o.material) ? o.material.map(materialState) : materialState(o.material);
    if (o.isLight) {
      record.light = { color: o.color.getHex(), intensity: o.intensity, distance: o.distance, decay: o.decay, groundColor: o.groundColor?.getHex(), castShadow: o.castShadow, shadow: o.shadow ? { bias: o.shadow.bias, normalBias: o.shadow.normalBias, mapSize: o.shadow.mapSize.toArray(), camera: o.shadow.camera.toJSON() } : null };
    }
    record.parent = o === root ? null : o.parent.uuid;
    record.id = o.uuid;
    record.castShadow = o.castShadow; record.receiveShadow = o.receiveShadow;
    if (o.userData.generatedText) record.generatedText = o.userData.generatedText;
    objects.push(record);
  });
  return objects;
}
window.reconstruction = {
  pause() {},
  seek,
  setVariant(id) {
    if (id !== '568' && id !== '567') throw new RangeError('Variant must be "568" or "567"');
    activeVariant = id; seek(currentTime);
  },
  getCameraState: cameraState,
  getNavigationState: () => structuredClone(navigation),
  getInvariantState: () => ({
    world: serializeTree(world),
    navigation: structuredClone(navigation),
    camera: cameraState(),
    cameraConfiguration: { near: camera.near, far: camera.far, aspect: camera.aspect, zoom: camera.zoom },
    renderer: { toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, outputColorSpace: renderer.outputColorSpace },
    background: scene.background.getHex(),
    environment: scene.userData.environmentDefinition
  }),
  getEditedObjectState: () => ({
    variant: activeVariant,
    embodiment: activeVariant === '568' ? 'humanoid' : 'quadruped',
    root: transformState(robotRoot),
    objects: serializeTree(activeVariant === '568' ? humanoid : dog),
    contacts: (activeVariant === '568' ? hLegs : dLegs).map(leg => ({
      name: leg.hip.name,
      targetGroundPosition: leg.target.toArray(),
      actualAnklePosition: leg.ankle.getWorldPosition(new THREE.Vector3()).toArray(),
      ankleHeight: leg.ankleHeight
    }))
  })
};
seek(0);
