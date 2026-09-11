import * as THREE from '../vendor/three.module.js';

const WIDTH = 960, HEIGHT = 540, DURATION = 124 / 24;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d6d6ca');
const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = .94;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(49, WIDTH / HEIGHT, 0.05, 80);
const world = new THREE.Group();
world.name = 'sharedLaboratory';
scene.add(world);

let seed = 564;
function random() { window.__bfTrace?.add(21); seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
const v3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

function weatherSurface(kind, source) { window.__bfTrace?.add(27);
  const canvas = document.createElement('canvas');
  const size = kind === 'floor' ? 1024 : 512;
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(source, 0, 0, size, size);
  let wearSeed = kind === 'floor' ? 913564 : 701564;
  const rnd = () => { wearSeed = (1664525 * wearSeed + 1013904223) >>> 0; return wearSeed / 4294967296; };
  const lattice = (x, y) => {
    let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + 564;
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
  };
  const noise = (x, y) => {
    const ix = Math.floor(x), iy = Math.floor(y), fx = smooth(x - ix), fy = smooth(y - iy);
    return mix(mix(lattice(ix, iy), lattice(ix + 1, iy), fx), mix(lattice(ix, iy + 1), lattice(ix + 1, iy + 1), fx), fy);
  };
  const pixels = ctx.getImageData(0, 0, size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const i = (y * size + x) * 4;
    const cloud = (noise(x * .008, y * .008) - .5) * 31
      + (noise(x * .039, y * .039) - .5) * 19
      + (noise(x * .16, y * .16) - .5) * 9 + (rnd() - .5) * 10;
    const edge = 1 - smooth(Math.min(x, y, size - x, size - y) / (size * .14));
    const base = kind === 'floor' ? 163 + cloud : 230 + cloud * .25 - edge * (14 + 17 * noise(x * .03, y * .03));
    pixels.data[i] = base;
    pixels.data[i + 1] = base - (kind === 'floor' ? 7 : 5);
    pixels.data[i + 2] = base - (kind === 'floor' ? 17 : 16);
  }
  ctx.putImageData(pixels, 0, 0);
  const stain = (x, y, radius, alpha) => {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(54,44,29,${alpha})`);
    gradient.addColorStop(1, 'rgba(54,44,29,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  };
  if (kind === 'floor') {
    for (let i = 0; i < 90; i++) stain(rnd() * size, rnd() * size, 12 + rnd() * 58, .08 + rnd() * .19);
    for (let i = 0; i < 1900; i++) {
      const x = rnd() * size, y = rnd() * size;
      ctx.fillStyle = i % 4 ? `rgba(55,49,39,${.08 + rnd() * .27})` : `rgba(223,218,196,${.1 + rnd() * .34})`;
      ctx.beginPath();
      ctx.ellipse(x, y, .3 + rnd() * 2.8, .2 + rnd() * 1.4, rnd() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
    for (let i = 0; i < 32; i++) {
      ctx.strokeStyle = `rgba(49,46,37,${.06 + rnd() * .11})`;
      ctx.lineWidth = .5 + rnd() * 1.4;
      ctx.beginPath();
      ctx.ellipse(rnd() * size, rnd() * size, 9 + rnd() * 22, 7 + rnd() * 15, rnd() * Math.PI, 0, 1 + rnd() * 2.5);
      ctx.stroke();
    }
  } else {
    for (let i = 0; i < 28; i++) stain(rnd() * size, rnd() * size, 12 + rnd() * 47, .08 + rnd() * .14);
    for (let i = 0; i < 450; i++) {
      const side = i % 4, near = 4 + Math.pow(rnd(), 2) * 48;
      let x = rnd() * size, y = rnd() * size;
      if (i < 340) {
        if (side === 0) x = near;
        if (side === 1) x = size - near;
        if (side === 2) y = near;
        if (side === 3) y = size - near;
      }
      const r = .7 + Math.pow(rnd(), 3) * 6;
      ctx.fillStyle = i % 5 ? `rgba(66,62,50,${.27 + rnd() * .54})` : 'rgba(151,141,115,.7)';
      ctx.beginPath();
      for (let j = 0; j < 7; j++) {
        const a = j * Math.PI * 2 / 7, rr = r * (.55 + rnd() * .6);
        const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr * 1.8;
        if (j === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.fill();
    }
    for (let i = 0; i < 80; i++) {
      const x = rnd() * size, y = rnd() * size, length = 4 + rnd() * 32;
      ctx.strokeStyle = `rgba(77,72,60,${.13 + rnd() * .32})`;
      ctx.lineWidth = .4 + rnd() * 1.3;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + length * .23, y + length); ctx.stroke();
    }
  }
  return canvas;
}

function generatedSurface(kind, size = 256) { window.__bfTrace?.add(111);
  const initialSeed=seed;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const data = ctx.createImageData(size, size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const n = random();
    let base;
    if (kind === 'floor') base = 155 + 10 * Math.sin(x * .08) * Math.sin(y * .043) + 12 * (n - .5);
    else if (kind === 'wood') base = 206 + 4 * Math.sin(y * .8 + Math.sin(x * .03) * 2) + 8 * (n - .5);
    else base = 228 + 10 * (n - .5);
    const i = (y * size + x) * 4;
    data.data[i] = base;
    data.data[i + 1] = base - (kind === 'wood' ? 18 : 2);
    data.data[i + 2] = base - (kind === 'wood' ? 47 : 10);
    data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  if (kind !== 'wood') {
    for (let i = 0; i < (kind === 'floor' ? 1100 : 210); i++) {
      const x = random() * size, y = random() * size;
      ctx.fillStyle = kind === 'floor' ? `rgba(51,48,40,${random() * .12})` : `rgba(52,49,42,${.13 + random() * .4})`;
      ctx.fillRect(x, y, .5 + random() * (kind === 'floor' ? 15 : 6), .4 + random() * 1.7);
    }
  }
  // Wear has its own seed so refinement never reshuffles shared bench equipment.
  const tex = new THREE.CanvasTexture(kind === 'wood' ? canvas : weatherSurface(kind, canvas));
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1);
  tex.userData = {procedural:kind,seed:initialSeed,size:tex.image.width,algorithm:'LCG-1664525-1013904223; multiscale concrete and chipped-paint wear v2'};
  return tex;
}
function mat(color, metalness = 0, roughness = .6, extra = {}) { window.__bfTrace?.add(145);
  return new THREE.MeshStandardMaterial({color, metalness, roughness, ...extra});
}
const M = {
  wall: mat('#e2dfce'), ceiling: mat('#e8e8df',0,.75,{emissive:'#b8b7a8',emissiveIntensity:.18}),
  floor: mat('#c1bdb3', .06, .48, {map: generatedSurface('floor')}),
  wood: mat('#e8dbbc', 0, .57, {map: generatedSurface('wood')}),
  frame: mat('#a2a797', .48, .42),
  steel: mat('#78837f', .73, .29), chrome: mat('#adb3ae', .85, .22),
  rubber: mat('#171e1d', .12, .68), black: mat('#222a28', .5, .4),
  ivory: mat('#fff8e6', .26, .53, {map: generatedSurface('ivory')}),
  dark: mat('#353c35', .75, .38), wire: mat('#101c19', .2, .57),
  glass: mat('#a5c3c4', .25, .14, {transparent: true, opacity: .19, depthWrite: false}),
  window: mat('#94b0b4', .15, .34, {transparent: true, opacity: .3, depthWrite: false}),
  blue: mat('#124879', .2, .5), orange: mat('#d37a24', .05, .56),
  yellow: mat('#e0ae2c', .1, .5), pcb: mat('#236551', .23, .6),
  white: mat('#e8e8d7', 0, .61), tape: mat('#d7d7bf', 0, .81),
  red: mat('#843b26', .2, .6),
  screen: mat('#102d3d', .2, .4, {emissive: '#0b2431', emissiveIntensity: .45}),
  green: mat('#83dca1', .1, .4, {emissive: '#4fcd89', emissiveIntensity: .8}),
  light: mat('#fcfff6', 0, .3, {emissive: '#fffef0', emissiveIntensity: 3}),
};
M.floor.bumpMap = M.floor.map;
M.floor.bumpScale = .009;
M.ivory.bumpMap = M.ivory.map;
M.ivory.bumpScale = .0012;
M.tape.map = M.ivory.map;
const boxGeo = new THREE.BoxGeometry(1, 1, 1);
const ballGeo = new THREE.SphereGeometry(1, 16, 12);
const cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
function mesh(geometry, material, parent, name) { window.__bfTrace?.add(175);
  const m = new THREE.Mesh(geometry, material);
  m.castShadow = true; m.receiveShadow = true;
  if (name) m.name = name;
  parent.add(m);
  return m;
}
function box(parent, size, position, material, name) { window.__bfTrace?.add(182);
  const m = mesh(boxGeo, material, parent, name);
  m.scale.set(...size); m.position.set(...position);
  return m;
}
function sphere(parent, position, scale, material, name) { window.__bfTrace?.add(187);
  const m = mesh(ballGeo, material, parent, name);
  m.position.set(...position); m.scale.set(...scale);
  return m;
}
function cyl(parent, a, b, radius, material, name) { window.__bfTrace?.add(192);
  a = Array.isArray(a) ? v3(...a) : a; b = Array.isArray(b) ? v3(...b) : b;
  const m = mesh(cylinderGeo, material, parent, name);
  placeBone(m, a, b, radius);
  return m;
}
function placeBone(m, a, b, radius, width = radius) { window.__bfTrace?.add(198);
  m.position.copy(a).add(b).multiplyScalar(.5);
  m.scale.set(radius, a.distanceTo(b), width);
  m.quaternion.setFromUnitVectors(v3(0, 1, 0), b.clone().sub(a).normalize());
}
function cable(parent, points, radius = .018, material = M.wire, name = 'cable') { window.__bfTrace?.add(203);
  const curve = new THREE.CatmullRomCurve3(points.map(p => Array.isArray(p) ? v3(...p) : p));
  return mesh(new THREE.TubeGeometry(curve, 40, radius, 7, false), material, parent, name);
}
function ring(parent, radius, tube, position, material, rotation = [Math.PI / 2, 0, 0]) { window.__bfTrace?.add(207);
  const m = mesh(new THREE.TorusGeometry(radius, tube, 8, 40), material, parent);
  m.position.set(...position); m.rotation.set(...rotation);
  return m;
}
function group(parent, name, position = [0, 0, 0]) { window.__bfTrace?.add(212);
  const g = new THREE.Group(); g.name = name; g.position.set(...position); parent.add(g); return g;
}
function roundedCover(parent, w, h, d, position, material = M.ivory, name = 'armor') { window.__bfTrace?.add(215);
  const s = new THREE.Shape();
  s.moveTo(-w * .35, -h / 2); s.lineTo(w * .35, -h / 2);
  s.quadraticCurveTo(w / 2, -h / 2, w / 2, -h * .27);
  s.lineTo(w * .48, h * .29); s.quadraticCurveTo(w * .43, h / 2, w * .21, h / 2);
  s.lineTo(-w * .21, h / 2); s.quadraticCurveTo(-w * .43, h / 2, -w * .48, h * .29);
  s.lineTo(-w / 2, -h * .27); s.quadraticCurveTo(-w / 2, -h / 2, -w * .35, -h / 2);
  const geometry = new THREE.ExtrudeGeometry(s, {depth: d, bevelEnabled: true, bevelThickness: .025, bevelSize: .025, bevelSegments: 2, steps: 1, curveSegments: 8});
  geometry.translate(0, 0, -d / 2);
  const positions = geometry.attributes.position, normals = geometry.attributes.normal, uv = geometry.attributes.uv;
  for (let i = 0; i < positions.count; i++) {
    if (Math.abs(normals.getZ(i)) > .5) {
      uv.setXY(i, positions.getX(i) / (w + .05) + .5, positions.getY(i) / (h + .05) + .5);
    } else {
      const across = Math.abs(normals.getX(i)) > .5 ? positions.getY(i) / h : positions.getX(i) / w;
      uv.setXY(i, across + .5, positions.getZ(i) / (d + .05) + .5);
    }
  }
  uv.needsUpdate = true;
  const m = mesh(geometry, material, parent, name); m.position.set(...position);
  return m;
}
function bolt(parent, p, radius = .018) { window.__bfTrace?.add(237);
  return sphere(parent, p, [radius, radius, radius * .35], M.dark, 'fastener');
}
function panelBolts(parent, w, h, z, y = 0) { window.__bfTrace?.add(240);
  for (const x of [-w * .38, w * .38]) for (const yy of [-h * .32, h * .32]) bolt(parent, [x, yy + y, z]);
}

// Room boundaries stop at the open entrance; all visible walls are actual geometry.
box(world, [21, .12, 15], [-2, -.065, 1], M.floor, 'concreteFloor');
const rearWorld=group(world,'rearWallEquipment',[0,0,1.5]);
for(const [w,h,x,y] of [
  [13.8,1.48,-4.5,.74],[13.8,.09,-4.5,3.555],
  [1.48,2.03,-10.66,2.495],[2.12,2.03,-5.8,2.495],
  [3.45,2.03,.675,2.495],[1.17,3.6,5.915,1.8]
]) box(rearWorld,[w,h,.18],[x,y,-4.15],M.wall,'backWallPier');
box(world, [.18, 3.6, 12], [-11.4, 1.8, 1.8], M.wall, 'leftWall');
box(world, [21, .12, 13], [-2, 3.64, .5], M.ceiling, 'ceiling').castShadow=false;
box(rearWorld, [13, .12, .09], [0, .08, -4.02], M.frame, 'baseboard');
for (let x = -6; x <= 6; x += 1.2) box(world, [.013, .015, 12], [x, 3.568, .4], M.frame).castShadow=false;
for (let z = -4; z < 7; z += 1.2) box(world, [13, .016, .013], [0, 3.568, z], M.frame).castShadow=false;
for (const [x, z, length] of [[-3.2, -.7, 4.2], [1, -.4, 3.3], [-3.7, 2.8, 3.8], [1.1, 3.1, 3.5]]) {
  box(world, [length, .07, .18], [x, 3.27, z], M.frame, 'suspendedStripHousing').castShadow=false;
  box(world, [length - .08, .018, .14], [x, 3.224, z], M.light, 'stripDiffuser').castShadow=false;
  for (const a of [-length * .38, length * .38]) cyl(world, [x + a, 3.3, z], [x + a, 3.57, z], .007, M.steel).castShadow=false;
}
const hemi = new THREE.HemisphereLight('#f5f3e9', '#796e5b', .8);
hemi.name = 'ambientCeiling'; world.add(hemi);
const key = new THREE.DirectionalLight('#fff4df', 2.15);
key.position.set(-3, 7, 5); key.name = 'largeCeilingKey';
key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, {left: -9, right: 9, top: 9, bottom: -9, near: .1, far: 23});
key.shadow.bias = -.00025; key.shadow.normalBias = .025;
key.shadow.radius = 4;
world.add(key); world.add(key.target);
const fill = new THREE.DirectionalLight('#cee8ef', .5);
fill.position.set(0, 3, -6); fill.name = 'windowFill'; world.add(fill);
const softFront=new THREE.DirectionalLight('#fff9eb',.3);
softFront.position.set(2,2.8,6);softFront.name='entranceBounce';world.add(softFront);
for (const [x,z,power] of [[-1.1,1.1,22],[2.8,-1.3,17]]) {
  const pool = new THREE.SpotLight('#fff3dc', power, 9, 1.05, .9, 2);
  pool.name = 'localizedCeilingPool';
  pool.position.set(x,3.19,z);
  pool.target.position.set(x-.3,0,z+.2);
  pool.castShadow = true;
  pool.shadow.mapSize.set(1024,1024);
  pool.shadow.bias = -.00015; pool.shadow.normalBias = .018;
  world.add(pool,pool.target);
}
const environmentScene=new THREE.Scene();
environmentScene.background=new THREE.Color('#77746b');
for(const [x,z,w] of [[-3,0,4],[2,2,3],[-1,-4,4]]){
  const panel=new THREE.Mesh(new THREE.PlaneGeometry(w,1.1),new THREE.MeshBasicMaterial({color:'#ffffff',side:THREE.DoubleSide}));
  panel.rotation.x=Math.PI/2;panel.position.set(x,4,z);environmentScene.add(panel);
}
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(environmentScene,.08,.1,25).texture;
pmrem.dispose();

// Observation windows have a shallow procedural room behind their glass.
function observationWindow(x, width) { window.__bfTrace?.add(296);
  const g = group(rearWorld, 'observationWindow', [x, 2.5, -4.025]);
  g.scale.y=1.27;
  for(const y of [-.77,.77]) box(g,[width+.16,.08,.15],[0,y,0],M.frame);
  for(const xx of [-width/2,width/2]) box(g,[.08,1.6,.15],[xx,0,0],M.frame);
  box(g, [width + .08, 1.55, .05], [0, 0, -.88], mat('#829c9d', .1, .8));
  box(g, [width, .035, .85], [0, -.5, -.38], M.frame,'observationRoomBench');
  for(const xx of [-width/2,width/2]) box(g,[.035,1.5,.9],[xx,0,-.4],M.wall);
  for (const xx of [-width * .25, width * .25]) {
    box(g, [width * .44, .06, .18], [xx, -.25, -.6], M.frame);
    box(g, [.045, 1.3, .04], [xx + width * .13, 0, -.78], M.steel);
    box(g, [width * .3, .025, .13], [xx, .55, -.5], M.light).rotation.z = -.045;
    box(g, [width * .18, .31, .04], [xx, -.36, -.41], M.screen);
    box(g, [width * .32, .02, .018], [xx, .36, .145], M.light).rotation.z=-.13;
  }
  box(g, [width, 1.42, .018], [0, 0, .13], M.window);
  box(g, [.055, 1.5, .065], [0, 0, .16], M.steel);
  for (const xx of [-width / 2, width / 2]) box(g, [.055, 1.5, .065], [xx, 0, .16], M.steel);
}
observationWindow(-8.44, 3.04); observationWindow(-2.89, 3.68);
// Opaque wall is locally covered by the corridor recess and transparent glass planes.
const exit = group(rearWorld, 'glassDoubleExit', [3.87, -.05, -3.99]);
exit.scale.set(1.12,1.14,1);
box(exit, [2.55, 3.1, .04], [0, 1.55, -2.15], mat('#b1b5a5'));
box(exit, [.07, 3.1, 2.4], [-1.28, 1.55, -1.02], mat('#97a9a6'));
box(exit, [.07, 3.1, 2.4], [1.28, 1.55, -1.02], M.wall);
box(exit, [2.6, .035, 2.4], [0, .025, -1.02], M.floor);
box(exit, [.55, 2.3, .05], [.67, 1.15, -2.08], M.dark);
box(exit, [.44, 2.22, .05], [.67, 1.11, -2.04], mat('#877751'));
for (let z = -.45; z > -2.2; z -= .6) {
  box(exit,[2.5,.015,.026],[0,3,z],M.light,'corridorStrip');
  box(exit,[.021,3,.04],[-.97,1.5,z],M.steel);
}
for (const x of [-1.3, -.78, .1, 1.25]) box(exit, [.055, 3.1, .11], [x, 1.55, .22], M.steel);
for (const x of [-.35, .68]) {
  box(exit, [.91, 2.9, .035], [x, 1.49, .19], M.glass, 'exitGlassPane');
  box(exit, [.91, .33, .08], [x, .21, .24], M.frame);
  box(exit, [.91, .05, .1], [x, 2.91, .24], M.frame);
  box(exit, [.055, 2.91, .1], [x + .46, 1.5, .24], M.frame);
  box(exit, [.83, .055, .08], [x, 1.19, .37], M.chrome, 'doorPushBar');
  for (const xx of [-.36, .36]) cyl(exit, [x + xx, 1.19, .24], [x + xx, 1.19, .36], .027, M.steel);
  box(exit, [.3, .1, .14], [x, 2.79, .32], M.steel, 'doorCloser');
  box(exit, [.51, .02, .02], [x + .04, 2.87, .3], M.dark).rotation.z = -.08;
  box(exit, [.43, .018, .015], [x + .07, 2.58, .27], M.light).rotation.z = -.12;
}
box(exit, [2.7, .08, .14], [0, 3.1, .23], M.steel);
box(exit, [.59, .2, .09], [.1, 3.29, .23], M.dark, 'exitSign');
// Segment-letter lettering, generated only from geometry.
function segmentText(parent, text, position, size, material) { window.__bfTrace?.add(344);
  const glyphs = {E:[0,1,3,4,6], X:[7,8], I:[0,6,9], T:[0,9], 5:[0,1,3,5,6], 6:[0,1,3,4,5,6], 4:[1,2,3,5]};
  const coords = [[0,1,.65,0],[-.35,.5,0,.8],[.35,.5,0,.8],[0,0,.65,0],[-.35,-.5,0,.8],[.35,-.5,0,.8],[0,-1,.65,0],[0,0,.07,2],[0,0,.07,2],[0,0,0,1.8]];
  [...text].forEach((c,i) => (glyphs[c] || []).forEach(s => {
    const [x,y,w,h] = coords[s];
    const m = box(parent, [Math.max(w,.08)*size, Math.max(h,.1)*size, .006], [position[0]+i*size*.94+x*size,position[1]+y*size,position[2]], material);
    if (s === 7) m.rotation.z = .34; if (s === 8) m.rotation.z = -.34;
  }));
}
segmentText(exit, 'EXIT', [-.075, 3.29, .284], .066, mat('#ff7554',0,.4,{emissive:'#e1421c',emissiveIntensity:.9}));

function bench(parent, name, x, z, w, d, h = 1.0) { window.__bfTrace?.add(355);
  const g = group(parent, name, [x, 0, z]);
  box(g, [w, .095, d], [0, h, 0], M.wood, 'birchWorktop');
  box(g, [w - .12, .1, .075], [0, h - .105, d / 2 - .05], M.frame, 'frontApron');
  for (const a of [-1, 1]) for (const b of [-1, 1]) {
    const px = a * (w / 2 - .09), pz = b * (d / 2 - .09);
    box(g, [.084, h - .05, .084], [px, (h - .05)/2, pz], M.frame, 'squareTubeLeg');
    cyl(g, [px, .01, pz], [px, .045, pz], .044, M.dark, 'adjustableFoot');
  }
  for (const a of [-1,1]) box(g, [.05, .065, d - .14], [a*(w/2-.09), .27, 0], M.frame);
  box(g, [w-.15, .065, .05], [0,.27,-d/2+.09], M.frame);
  box(g, [w-.15, .056, .055], [0,.22,d/2-.09], M.frame,'lowerFrontStretcher');
  return g;
}
const table = bench(world, 'centralWorkbench', -.92, 1.22, 3.8, 1.65, 1.05);
const rear = bench(rearWorld, 'rearEquipmentBench', -2.84, -3.16, 6.85, .98, .96);
const left = bench(world, 'leftWorkbench', -4.95, .27, 2.7, 1.27, 1.0);
const foreground = bench(world, 'croppedEntranceWorkbench', -3.6, 4.05, 2.45, 1.25, 1.0);
box(foreground, [1.7,.022,.84],[0,1.063,0],M.blue);
box(table, [.63, .67, .61], [1.12, .39, -.25], M.dark, 'underbenchElectronicsCabinet');
for (let i=0; i<6; i++) box(table,[.45,.012,.012],[1.12,.57-i*.041,.063],M.steel);
function stool(x,z,name) { window.__bfTrace?.add(376);
  const g = group(world, name, [x,0,z]);
  const seat = cyl(g,[0,.65,0],[0,.735,0],.295,M.rubber,'blackPaddedSeat');
  seat.geometry = new THREE.CylinderGeometry(1,1,1,40);
  cyl(g,[0,.11,0],[0,.65,0],.039,M.chrome,'pneumaticColumn');
  cyl(g,[0,.13,0],[0,.38,0],.067,M.black);
  ring(g,.276,.012,[0,.27,0],M.chrome);
  for(let j=0;j<5;j++){
    const a=j*Math.PI*2/5, xx=Math.sin(a)*.36, zz=Math.cos(a)*.36;
    cyl(g,[0,.12,0],[xx,.075,zz],.022,M.black);
    const wheel=cyl(g,[xx-.027,.047,zz],[xx+.027,.047,zz],.049,M.rubber,'caster');
    wheel.name='caster';
  }
  cyl(g,[.04,.61,0],[.23,.60,.04],.012,M.black);
  return g;
}
stool(-1.83,2.18,'leftRollingStool'); stool(-.39,2.31,'rightRollingStool');
stool(-4.9,.55,'secondaryStool');
// Taped work bays and concrete seams.
for (const x of [-3.5, 1.21, 3.95]) box(world,[.043,.003,4.35],[x,.004,1.66],M.tape,'floorBayTape');
box(world,[4.7,.003,.045],[-1.15,.004,3.83],M.tape);
box(world,[2.65,.003,.045],[2.58,.004,-1.55],M.tape);
for (let z=-3;z<7;z+=2.9) box(world,[12,.002,.012],[0,.002,z],mat('#888b81'),'concreteJoint');
for (let i=0;i<90;i++){
  const x=random()*10-5,z=random()*9-3;
  const mark=box(world,[.025+random()*.18,.002,.008+random()*.022],[x,.006,z],i%3?mat('#82877d'):M.tape,'floorScuff');
  mark.rotation.y=random()*Math.PI;
}
// Open-front blue component bins in a metal shelving unit.
const shelf=group(world,'partsBinShelving',[-7.32,0,-.72]);
shelf.scale.set(1.18,1.14,1);
for(const x of [-.93,.93]) for(const z of [-.19,.28]) box(shelf,[.046,2.24,.046],[x,1.12,z],M.steel);
for(let j=0;j<5;j++){
  const y=.36+j*.43;
  box(shelf,[1.94,.041,.55],[0,y,.045],M.frame);
  for(let i=0;i<5;i++){
    const x=-.75+i*.37;
    if(j===2 || j===1) {
      box(shelf,[.3,.025,.42],[x,y+.031,.06],M.blue);
      box(shelf,[.025,.17,.42],[x-.145,y+.105,.06],M.blue);
      box(shelf,[.025,.17,.42],[x+.145,y+.105,.06],M.blue);
      box(shelf,[.3,.11,.025],[x,y+.08,.27],M.blue);
      box(shelf,[.1,.037,.009],[x,y+.089,.286],M.white);
      for(let p=0;p<3;p++) box(shelf,[.05,.05,.07],[x+(random()-.5)*.19,y+.08,-.03+random()*.18],M.steel);
    } else {
      box(shelf,[.13+random()*.13,.09+random()*.15,.23],[x,y+.09,.03],j===4?mat('#a78e61'):M.dark);
      box(shelf,[.13,.025,.01],[x,y+.10,.15],M.white);
    }
  }
}
function monitor(parent,x,y,z) { window.__bfTrace?.add(426);
  const g=group(parent,'computerMonitor',[x,y,z]);
  box(g,[.54,.34,.05],[0,.27,0],M.black);
  box(g,[.503,.301,.009],[0,.275,.03],M.screen);
  for(let i=0;i<13;i++){
    box(g,[.07+random()*.25,.0035,.004],[-.20+random()*.02,.399-i*.019,.037],i%3===0?M.green:mat('#6a9bb1',0,.6,{emissive:'#608c9f',emissiveIntensity:.3}));
  }
  cyl(g,[0,0,-.01],[0,.12,-.01],.025,M.black);
  box(g,[.26,.025,.17],[0,.012,.025],M.black);
  box(parent,[.49,.016,.16],[x,y+.002,z+.25],M.black,'keyboard');
  for(let i=0;i<11;i++) for(let j=0;j<3;j++) box(parent,[.03,.006,.027],[x-.2+i*.039,y+.013,z+.195+j*.043],M.dark);
}
monitor(rear,1.25,1.023,.1);monitor(rear,1.84,1.023,.1);
monitor(rear,-2.08,1.023,.12);
function multimeter(parent,x,z,color) { window.__bfTrace?.add(440);
  const g=group(parent,'handheldMultimeter',[x,1.11,z]); g.rotation.x=-.23;
  roundedCover(g,.17,.27,.055,[0,.12,0],color);
  box(g,[.123,.09,.008],[0,.188,.036],M.dark);
  box(g,[.105,.066,.006],[0,.188,.042],mat('#9cab92'));
  segmentText(g,'564',[-.034,.188,.048],.013,M.black);
  cyl(g,[0,.087,.029],[0,.087,.058],.041,M.black);
  for(const xx of [-.045,.045]) sphere(g,[xx,.025,.04],[.012,.012,.009],xx<0?M.red:M.black);
  cable(parent,[[x-.04,1.15,z+.04],[x-.19,1.106,z+.23],[x+.02,1.104,z+.36],[x+.33,1.104,z+.22]],.007,M.red,'redTestLead');
  cable(parent,[[x+.04,1.15,z+.04],[x+.17,1.105,z+.13],[x+.14,1.105,z+.32],[x+.42,1.105,z+.35]],.006);
}
multimeter(table,.45,.05,M.orange); multimeter(table,.87,.08,M.yellow);
function circuit(parent,x,y,z,w=.32) { window.__bfTrace?.add(452);
  box(parent,[w,.018,.21],[x,y,z],M.pcb,'circuitBoard');
  for(let i=0;i<4;i++){
    box(parent,[.052,.018,.035],[x-w*.32+i*w*.2,y+.018,z],M.black);
    for(const dz of [-.038,.038]) for(let j=0;j<4;j++) box(parent,[.005,.01,.02],[x-w*.32+i*w*.2-.018+j*.012,y+.014,z+dz],M.chrome);
  }
  for(let i=0;i<5;i++) cyl(parent,[x-w*.4+i*w*.18,y,z+.07],[x-w*.4+i*w*.18,y+.065,z+.07],.012,i%2?M.blue:M.steel);
}
circuit(table,-.38,1.108,.27,.43);circuit(table,-.83,1.108,-.12);
box(table,[.39,.075,.25],[-1.22,1.14,-.23],M.blue,'partsTray');
box(table,[.45,.21,.27],[1.43,1.2,-.04],M.frame,'benchtopPowerSupply');
box(table,[.425,.175,.01],[1.43,1.21,.102],M.black);
box(table,[.14,.065,.01],[1.35,1.247,.11],M.screen);
for (let i=0;i<3;i++) cyl(table,[1.47+i*.07,1.235,.11],[1.47+i*.07,1.235,.13],.025,M.frame);
for(let i=0;i<8;i++) box(table,[.028,.07,.012],[1.27+i*.042,1.15,.11],M.steel);
cable(table,[[1.65,1.2,.11],[1.9,1.05,.3],[1.94,.45,.33],[1.82,.25,.3],[1.8,.85,.39],[1.58,1.11,.35]],.009,M.red,'hangingTestLead');
for(let i=0;i<7;i++){
  const x=-1.45+random()*2,z=random()*.7-.3;
  cyl(table,[x,1.116,z],[x+.16,1.116,z+.08],.009,i%2?M.orange:M.steel,'handTool');
}
box(table,[.24,.025,.18],[-.67,1.11,-.44],M.white,'notebook');
const solder=group(table,'solderStation',[-.78,1.11,-.44]);
box(solder,[.29,.11,.23],[0,.055,0],M.dark);
box(solder,[.14,.06,.014],[-.055,.07,.123],M.screen);
cyl(solder,[.13,.12,-.035],[.13,.24,-.14],.016,M.chrome);
cable(solder,[[.12,.24,-.14],[.31,.13,-.14],[.38,.015,.18],[.14,.012,.23]],.008);
cyl(table,[-1.65,1.1,-.37],[-1.65,1.4,-.37],.067,M.white,'paperTowelRoll');
cyl(table,[-1.65,1.398,-.37],[-1.65,1.405,-.37],.019,M.dark);
for(let j=0;j<3;j++){
  const z=.18+j*.07;
  cable(table,[[-1.6,1.112,z],[-1.37,1.115,z+.1],[-1.21,1.14,z-.03],[-1.12,1.12,z+.13]],.006,j%2?M.red:M.wire,'jumperWire');
}
cyl(table,[-1.14,1.12,-.37],[-1.14,1.14,-.37],.092,M.chrome,'metalPartsDish');
for(let j=0;j<10;j++) bolt(table,[-1.19+random()*.09,1.146,-.4+random()*.07],.013);
for(let i=0;i<8;i++){
  const x=-2.9+i*.78;
  box(rear,[.19,.12,.17],[x,1.07,-.11],i%2?M.frame:M.black,'benchInstrument');
  circuit(rear,x,1.024,.25,.22);
}
const scope=group(rearWorld,'wallOscilloscope',[.91,2.32,-3.94]);
box(scope,[.74,.46,.2],[0,0,.07],M.frame);
box(scope,[.63,.34,.015],[-.015,0,.18],M.black);
box(scope,[.45,.285,.012],[-.071,.015,.192],mat('#17352c',.1,.5));
for(let x=-.26;x<.17;x+=.06) box(scope,[.003,.26,.003],[x,.016,.201],M.steel);
for(let y=-.10;y<.15;y+=.05) box(scope,[.43,.002,.003],[-.07,y,.201],M.steel);
for(let j=0;j<2;j++){
  const pts=[];
  for(let i=0;i<75;i++) pts.push([-.28+i*.0057,.01+j*.048+Math.sin(i*.33)*.027+(i%20===0?.065:0),.208]);
  cable(scope,pts,.004,M.green,'oscilloscopeTrace');
}
for(let j=0;j<4;j++) sphere(scope,[.265,.1-j*.065,.208],[.022,.022,.012],M.frame);
for(let j=0;j<3;j++){
  const pts=[];
  for(let i=0;i<=64;i++){
    const a=i/64*Math.PI*2;
    pts.push([.91+Math.sin(a)*(.19+j*.024),1.55+Math.cos(a)*(.5+j*.034),-3.73+j*.024]);
  }
  cable(rearWorld,pts,.016,M.wire,'hangingCableLoop');
}
box(rearWorld,[.11,.11,.02],[1.15,1.64,-3.65],M.tape,'cableTag');
box(rearWorld,[.095,.14,.014],[2.41,1.27,-4.039],M.white,'switchPlate');

function cageHead(parent, y, scale = 1) { window.__bfTrace?.add(514);
  const g=group(parent,'cageHead',[0,y,0]);
  g.scale.setScalar(scale);
  box(g,[.25,.21,.2],[0,.02,0],M.black,'sensorCore');
  for(const x of [-.085,.085]) cyl(g,[x,.03,.105],[x,.03,.127],.024,M.steel,'stereoCamera');
  for(const x of [-.085,.085]) sphere(g,[x,.03,.13],[.018,.018,.008],M.screen,'cameraLens');
  const lower=[[-.185,-.14,-.14],[.185,-.14,-.14],[.185,-.14,.15],[-.185,-.14,.15]];
  const upper=[[-.14,.15,-.12],[.14,.15,-.12],[.14,.15,.105],[-.14,.15,.105]];
  for(let i=0;i<4;i++){
    cyl(g,lower[i],lower[(i+1)%4],.014,M.dark,'headCage');
    cyl(g,upper[i],upper[(i+1)%4],.014,M.dark,'headCage');
    cyl(g,lower[i],upper[i],.014,M.dark,'headCage');
  }
  cyl(g,[-.18,-.025,.153],[.18,-.025,.153],.012,M.steel);
  cyl(g,[-.14,.15,.106],[.185,-.14,.153],.012,M.dark);
  for(const p of lower) bolt(g,p,.017);
  return g;
}
function smallRobot(parent,x,y,z,scale,pose=0) { window.__bfTrace?.add(532);
  const g=group(parent,'fixedBenchRobot',[x,y,z]);g.scale.setScalar(scale);g.rotation.y=pose;
  roundedCover(g,.35,.4,.18,[0,.66,0]);
  sphere(g,[0,.42,0],[.15,.1,.1],M.dark);
  cageHead(g,1.03,.68);
  for(const s of [-1,1]) {
    sphere(g,[s*.25,.79,0],[.095,.095,.095],M.dark);
    cyl(g,[s*.24,.77,0],[s*.29,.54,.04],.068,M.ivory);
    sphere(g,[s*.29,.54,.04],[.065,.065,.065],M.dark);
    cyl(g,[s*.29,.54,.04],[s*.33,.38,.12],.047,M.ivory);
    cyl(g,[s*.105,.43,0],[s*.12,.24,.02],.073,M.ivory);
    sphere(g,[s*.12,.24,.02],[.061,.061,.061],M.dark);
    cyl(g,[s*.12,.24,.02],[s*.13,.06,0],.05,M.ivory);
    box(g,[.13,.055,.22],[s*.13,.031,.05],M.dark);
  }
}
smallRobot(rear,-1.28,1.014,.15,.72,-.2);
smallRobot(rear,-.27,1.014,.03,.78,.15);
smallRobot(rear,.44,1.014,.11,.50,-.3);
smallRobot(left,-.37,1.052,0,.61,.35);
smallRobot(left,.59,1.052,-.03,.73,-.3);
const arm=group(rear,'fixedMiniManipulator',[2.69,1.015,.03]);
cyl(arm,[0,0,0],[0,.06,0],.14,M.dark);
cyl(arm,[0,.07,0],[.06,.29,0],.045,M.ivory);sphere(arm,[.06,.29,0],[.07,.07,.07],M.dark);
cyl(arm,[.06,.29,0],[-.12,.43,.05],.037,M.ivory);sphere(arm,[-.12,.43,.05],[.05,.05,.05],M.dark);
cyl(arm,[-.12,.43,.05],[-.2,.34,.12],.025,M.steel);
for(const s of [-1,1]) box(arm,[.018,.08,.02],[-.2+s*.029,.3,.12],M.dark);
const charger=group(world,'entranceChargingDock',[3.55,0,2.4]);
box(charger,[.43,.1,.42],[0,.05,0],M.dark);
box(charger,[.38,.34,.095],[0,.2,-.13],M.frame);
for(const x of [-.09,.09]) box(charger,[.04,.12,.015],[x,.2,-.073],M.chrome);
cable(charger,[[.16,.1,-.12],[.44,.03,-.24],[.58,.02,.11],[.42,.015,.2]],.014);

// Flush, irregular aggregate chips cluster in the heavily used floor areas.
const floorWear = group(world,'localizedConcreteWear');
let scuffSeed = 91564;
const scuffRandom = () => { scuffSeed = (1664525 * scuffSeed + 1013904223) >>> 0; return scuffSeed / 4294967296; };
const wearMaterials = [
  mat('#5b5447',0,.84,{transparent:true,opacity:.38,depthWrite:false}),
  mat('#82796b',0,.9,{transparent:true,opacity:.3,depthWrite:false}),
  mat('#dfd8c5',0,.79,{transparent:true,opacity:.5,depthWrite:false})
];
for (const [x,z,rx,rz] of [[-1.7,3.3,.85,.6],[.1,2.8,.43,.5],[2.4,1.7,.4,.6],[-3.4,.6,.65,.5]]) {
  for (let i=0;i<120;i++) {
    const angle=scuffRandom()*Math.PI*2, spread=Math.sqrt(scuffRandom());
    const px=x+Math.cos(angle)*rx*spread,pz=z+Math.sin(angle)*rz*spread;
    const radius=.006+Math.pow(scuffRandom(),2)*.032,vertices=[];
    const outline=[];
    for(let j=0;j<7;j++){
      const a=j*Math.PI*2/7,r=radius*(.4+scuffRandom()*.8);
      outline.push([px+Math.sin(a)*r,.008,pz+Math.cos(a)*r*.72]);
    }
    for(let j=0;j<7;j++)vertices.push(px,.008,pz,...outline[j],...outline[(j+1)%7]);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
    geometry.computeVertexNormals();
    const chip=mesh(geometry,wearMaterials[i%3],floorWear,'aggregateChip');
    chip.castShadow=false;
  }
}

// One arc-length path, one timing curve, and one ground reference for both embodiments.
const path = new THREE.CatmullRomCurve3([
  v3(2.18,0,2.14), v3(1.83,0,2.67), v3(1.68,0,2.67),
  v3(1.98,0,2.1), v3(2.48,0,1.05), v3(2.84,0,-.05), v3(3.48,0,-1.39)
],false,'catmullrom',.32);
path.arcLengthDivisions=1800;
const pathLength=path.getLength();
const yawSamples=[];
for(let i=0;i<=512;i++){
  const tangent=path.getTangentAt(i/512);
  let yaw=Math.atan2(tangent.x,tangent.z);
  if(i>0) yaw+=Math.round((yawSamples[i-1]-yaw)/(Math.PI*2))*Math.PI*2;
  yawSamples.push(yaw);
}
const travelDuration=5.125;
function pathProgress(t) { window.__bfTrace?.add(608);
  const u=clamp(t/travelDuration,0,1);
  // Mild acceleration/deceleration keeps contacts readable without a dead opening.
  return .82*u+.18*(3*u*u-2*u*u*u);
}
function navAtProgress(u) { window.__bfTrace?.add(613);
  const position=path.getPointAt(clamp(u,0,1));
  const tangent=path.getTangentAt(clamp(u,0,1));
  let yaw=Math.atan2(tangent.x,tangent.z);
  yaw+=Math.round((yawSamples[Math.round(clamp(u,0,1)*512)]-yaw)/(Math.PI*2))*Math.PI*2;
  if(u<.32) yaw=mix(yawSamples[0],yawSamples[Math.round(.32*512)],smooth(u/.32));
  return {position,yaw};
}
let navigation, currentTime=0, variant='564';
const robotRig=group(scene,'robotRig');
const humanoid=group(robotRig,'humanoid564');
const quadruped=group(robotRig,'quadruped563');
const humanBody=group(humanoid,'bipedBody');
const dogBody=group(quadruped,'quadrupedBody');
roundedCover(humanBody,.47,.56,.25,[0,0,0]);
roundedCover(humanBody,.62,.29,.27,[0,.26,.014]);
panelBolts(humanBody,.58,.25,.179,.25);
panelBolts(humanBody,.44,.5,.158,0);
box(humanBody,[.3,.2,.11],[0,.07,-.22],M.dark,'backpack');
for(let i=0;i<5;i++) box(humanBody,[.25,.014,.015],[0,.02+i*.031,-.284],M.steel);
cyl(humanBody,[0,-.33,0],[0,-.24,0],.105,M.dark,'waistBearing');
roundedCover(humanBody,.28,.25,.22,[0,-.41,0]);
cageHead(humanBody,.6,1.12);
cyl(humanBody,[0,.38,0],[0,.46,0],.078,M.dark,'neck');
for(const s of [-1,1]) {
  cable(humanBody,[[s*.18,.27,-.13],[s*.31,.52,-.17],[s*.41,.38,-.16],[s*.32,-.11,-.2]],.028,M.wire,'flexShoulderHose');
  cable(humanBody,[[s*.14,-.12,-.19],[s*.26,-.26,-.23],[s*.24,-.45,-.1]],.024);
}
segmentText(humanBody,'564',[-.065,.27,.184],.035,M.dark);
const dogShell=roundedCover(dogBody,.49,1.04,.30,[0,0,0]);
dogShell.rotation.x=Math.PI/2;
box(dogBody,[.35,.16,.82],[0,-.07,-.02],M.dark,'ventedDogChassis');
for(let j=0;j<7;j++) box(dogBody,[.016,.095,.027],[.261,.018,-.33+j*.11],M.dark,'sideCoolingSlots');
const dogHead=cageHead(dogBody,.35,1.18);dogHead.position.z=.36;
roundedCover(dogBody,.41,.31,.09,[0,-.01,.58]);
box(dogBody,[.15,.18,.012],[0,-.01,.641],M.black);
for(const x of [-.04,.04]) box(dogBody,[.018,.125,.005],[x,-.01,.649],M.steel);
panelBolts(dogBody,.4,.3,.641);
for(const s of [-1,1]) cable(dogBody,[[s*.2,.11,-.4],[s*.3,.19,-.22],[s*.3,.17,.2],[s*.19,.17,.39]],.022);

function createLimb(parent,name,l1,l2,upperWidth,lowerWidth,footSize) { window.__bfTrace?.add(653);
  const g=group(parent,name);
  const upper=cyl(g,[0,0,0],[0,-l1,0],upperWidth,M.ivory,'upperArmor');
  const lower=cyl(g,[0,-l1,0],[0,-l1-l2,0],lowerWidth,M.ivory,'lowerArmor');
  const piston=cyl(g,[0,0,0],[0,-l1,0],.02,M.chrome,'actuatorPiston');
  const hip=sphere(g,[0,0,0],[upperWidth*1.2,upperWidth*1.2,upperWidth*1.2],M.dark,'hipJoint');
  const knee=sphere(g,[0,-l1,0],[lowerWidth*1.45,lowerWidth*1.45,lowerWidth*1.45],M.dark,'kneeJoint');
  hip.geometry=cylinderGeo;hip.scale.set(upperWidth*1.18,upperWidth*2.5,upperWidth*1.18);hip.rotation.z=Math.PI/2;
  knee.geometry=cylinderGeo;knee.scale.set(lowerWidth*1.48,lowerWidth*2.7,lowerWidth*1.48);knee.rotation.z=Math.PI/2;
  const kneeCap=cyl(g,[0,0,0],[.025,0,0],lowerWidth*.88,M.steel,'kneeBearingCap');
  const hub=cyl(g,[0,0,0],[.03,0,0],lowerWidth*.32,M.dark,'kneeHub');
  const ankle=sphere(g,[0,-l1-l2,0],[lowerWidth,lowerWidth,lowerWidth],M.dark,'ankleJoint');
  const foot=box(g,footSize,[0,0,0],M.dark,'contactFoot');
  const footPlate=box(foot,[.85,.35,.87],[0,.38,0],M.ivory,'footCover');
  const upperPanel=roundedCover(g,upperWidth*1.8,l1*.76,upperWidth*.64,[0,0,0]);
  const lowerPanel=roundedCover(g,lowerWidth*1.6,l2*.78,lowerWidth*.7,[0,0,0]);
  panelBolts(upperPanel,upperWidth*1.8,l1*.76,upperWidth*.32+.028);
  panelBolts(lowerPanel,lowerWidth*1.6,l2*.78,lowerWidth*.35+.028);
  const hose=[];
  for(let i=0;i<6;i++)hose.push(cyl(g,[0,0,0],[0,.1,0],.013,M.wire,'jointFlexHose'));
  return {g,upper,lower,piston,hip,knee,kneeCap,hub,ankle,foot,footPlate,upperPanel,lowerPanel,hose,l1,l2,upperWidth,lowerWidth,footSize,pose:null};
}
const humanLegs=[-1,1].map((s,i)=>({...createLimb(humanoid,`leg${i}`, .49,.49,.12,.086,[.19,.065,.34]),side:s,offset:i*.5}));
const dogLegs=[];
for(const z of [.4,-.4]) for(const s of [-1,1]) dogLegs.push({...createLimb(quadruped,`dogLeg${dogLegs.length}`,.36,.4,.095,.045,[.105,.07,.15]),side:s,z,offset:(s<0)===(z>0)?0:.5});
const arms=[-1,1].map((s,i)=>({...createLimb(humanoid,`arm${i}`,.34,.32,.079,.061,[.12,.15,.12]),side:s}));

function solveIK(limb,root,target,pole,forward) { window.__bfTrace?.add(680);
  const delta=target.clone().sub(root), raw=delta.length();
  const d=clamp(raw,.02,limb.l1+limb.l2-.001);
  const axis=delta.normalize();
  const bend=pole.clone().addScaledVector(axis,-pole.dot(axis)).normalize();
  const along=(limb.l1**2-limb.l2**2+d*d)/(2*d);
  const height=Math.sqrt(Math.max(0,limb.l1**2-along**2));
  const joint=root.clone().addScaledVector(axis,along).addScaledVector(bend,height);
  limb.hip.position.copy(root);limb.knee.position.copy(joint);limb.ankle.position.copy(target);
  limb.kneeCap.position.copy(joint).add(v3(limb.side*limb.lowerWidth*1.39,0,0));
  limb.hub.position.copy(joint).add(v3(limb.side*limb.lowerWidth*1.52,0,0));
  placeBone(limb.upper,root,joint,limb.upperWidth,limb.upperWidth*.86);
  placeBone(limb.lower,joint,target,limb.lowerWidth,limb.lowerWidth*.78);
  const off=v3(limb.side*.035,0,-.055);
  placeBone(limb.piston,root.clone().add(off),joint.clone().add(off),.022);
  const hosePoint=u=>root.clone().lerp(joint,u).add(v3(limb.side*(limb.upperWidth+.021),0,-.055-.07*Math.sin(u*Math.PI)));
  for(let i=0;i<limb.hose.length;i++) placeBone(limb.hose[i],hosePoint(i/6),hosePoint((i+1)/6),.013);
  for(const [panel,a,b,width] of [[limb.upperPanel,root,joint,limb.upperWidth],[limb.lowerPanel,joint,target,limb.lowerWidth]]) {
    panel.position.copy(a).lerp(b,.5).add(v3(0,0,width*.77));
    panel.quaternion.setFromUnitVectors(v3(0,1,0),a.clone().sub(b).normalize());
  }
  limb.foot.position.copy(target).add(v3(0,-limb.footSize[1]*.32,limb.footSize[2]*.17).applyAxisAngle(v3(0,1,0),forward));
  limb.foot.rotation.set(0,forward,0);
  limb.pose={root:root.toArray(),joint:joint.toArray(),target:target.toArray(),reach:raw,lengths:[limb.l1,limb.l2]};
}
function groundPoint(progress,lateral,longitudinal) { window.__bfTrace?.add(705);
  const n=navAtProgress(progress);
  return v3(lateral,0,longitudinal).applyAxisAngle(v3(0,1,0),n.yaw).add(n.position);
}
function footTarget(limb,u,stride,lateral,longitudinal,lift) { window.__bfTrace?.add(709);
  const cycles=gaitPhase(u,stride)+limb.offset;
  const cycle=Math.floor(cycles),phase=cycles-cycle;
  const stance=.59;
  const contactProgress=progressForPhase(cycle-limb.offset+.29,stride);
  const nextProgress=progressForPhase(cycle-limb.offset+1.29,stride);
  let p,footYaw;
  if(phase<stance) {
    p=groundPoint(contactProgress,lateral,longitudinal);
    footYaw=navAtProgress(contactProgress).yaw;
  } else {
    const swing=(phase-stance)/(1-stance);
    const a=groundPoint(contactProgress,lateral,longitudinal);
    const b=groundPoint(nextProgress,lateral,longitudinal);
    p=a.lerp(b,smooth(swing));p.y=lift*Math.sin(Math.PI*swing);
    footYaw=mix(navAtProgress(contactProgress).yaw,navAtProgress(nextProgress).yaw,smooth(swing));
  }
  p.y+=limb.footSize[1]*.82;
  p.sub(navigation.position).applyAxisAngle(v3(0,1,0),-navigation.yaw);
  limb.contact={phase,stance:phase<stance,worldTarget:p.clone().applyAxisAngle(v3(0,1,0),navigation.yaw).add(navigation.position).toArray()};
  return {point:p,yaw:footYaw-navigation.yaw};
}
function gaitPhase(u,stride) { window.__bfTrace?.add(731);
  return u*pathLength/stride+(stride===.78?2.5:.85)*smooth(u/.32);
}
function progressForPhase(phase,stride) { window.__bfTrace?.add(734);
  if(phase<=0)return 0;
  if(phase>=gaitPhase(1,stride))return 1;
  let lo=0,hi=1;
  for(let i=0;i<28;i++){
    const mid=(lo+hi)/2;
    if(gaitPhase(mid,stride)<phase)lo=mid;else hi=mid;
  }
  return (lo+hi)/2;
}
function supportHeight(base,limbs,targets,hipX,hipZ) { window.__bfTrace?.add(744);
  let height=base;
  for(let i=0;i<limbs.length;i++){
    const limb=limbs[i],target=targets[i].point;
    const horizontal=(hipX(limb)-target.x)**2+(hipZ(limb)-target.z)**2;
    const length=limb.l1+limb.l2-.018;
    if(horizontal>=length*length)throw new Error(`Unreachable planned foot: ${limb.g.name}`);
    height=Math.min(height,target.y+Math.sqrt(length*length-horizontal));
  }
  return height;
}
function poseRobots(t,u) { window.__bfTrace?.add(755);
  const gait=gaitPhase(u,.88);
  const bob=.013*Math.cos(gait*Math.PI*4);
  const sway=.018*Math.sin(gait*Math.PI*2);
  const humanTargets=humanLegs.map(limb=>footTarget(limb,u,.88,limb.side*.155,0,.105));
  const humanHip=supportHeight(.974+bob,humanLegs,humanTargets,l=>l.side*.17+sway,()=>0);
  const humanHeight=humanHip-.974;
  humanBody.position.set(sway,1.44+humanHeight,0);
  humanBody.rotation.set(.025,0,.018*Math.sin(gait*Math.PI*2));
  for(const [i,limb] of humanLegs.entries()) {
    const target=humanTargets[i];
    solveIK(limb,v3(limb.side*.17+sway,humanHip,0),target.point,v3(0,0,1),target.yaw);
  }
  for(const limb of arms) {
    const phase=gait*Math.PI*2+(limb.side<0?0:Math.PI);
    const swing=.2*Math.sin(phase);
    const root=v3(limb.side*.37+sway,1.69+humanHeight,0);
    const target=v3(limb.side*.42+sway,1.12+humanHeight,.055+swing);
    solveIK(limb,root,target,v3(0,0,-1),0);
  }
  const dogGait=gaitPhase(u,.78);
  const dogBob=.012*Math.cos(dogGait*Math.PI*4);
  const dogTargets=dogLegs.map(limb=>footTarget(limb,u,.78,limb.side*.3,limb.z,.09));
  const dogHip=supportHeight(.72+dogBob,dogLegs,dogTargets,l=>l.side*.3,l=>l.z);
  dogBody.position.set(0,dogHip+.17,0);
  dogBody.rotation.set(.015*Math.sin(dogGait*Math.PI*2),0,.012*Math.sin(dogGait*Math.PI*2));
  for(const [i,limb] of dogLegs.entries()) {
    const target=dogTargets[i];
    solveIK(limb,v3(limb.side*.3,dogHip,limb.z),target.point,v3(0,0,limb.z>0?-1:1),target.yaw);
  }
  humanoid.visible=variant==='564';quadruped.visible=variant==='563';
}
function updateCamera(t) { window.__bfTrace?.add(787);
  const u=clamp(t/travelDuration,0,1);
  camera.position.set(2.7-.3*u,1.92+.025*u,6.5-.44*u);
  camera.fov=49;
  camera.lookAt(-1.05+.34*u,1.03+.1*u,-1.2-.1*u);
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
function seek(seconds) { window.__bfTrace?.add(794);
  if(!Number.isFinite(seconds)) throw new TypeError('seek requires finite seconds');
  currentTime=clamp(seconds,0,DURATION);
  const u=pathProgress(currentTime);
  navigation=navAtProgress(u);
  navigation.progress=u;navigation.distance=u*pathLength;
  robotRig.position.copy(navigation.position);robotRig.rotation.set(0,navigation.yaw,0);
  poseRobots(currentTime,u);updateCamera(currentTime);
  scene.updateMatrixWorld(true);
  renderer.render(scene,camera);
}
function getCameraState() { window.__bfTrace?.add(805);
  return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};
}
function getNavigationState() { window.__bfTrace?.add(808);
  return {position:navigation.position.toArray(),yaw:navigation.yaw,traveledDistance:navigation.distance,pathProgress:navigation.progress,start:path.getPointAt(0).toArray(),goal:path.getPointAt(1).toArray(),pathLength};
}
function materialState(m) { window.__bfTrace?.add(811);
  const textureState = texture => texture ? {...texture.userData,repeat:texture.repeat.toArray(),offset:texture.offset.toArray(),wrapS:texture.wrapS,wrapT:texture.wrapT,colorSpace:texture.colorSpace} : null;
  return {type:m.type,color:m.color?.toArray(),metalness:m.metalness,roughness:m.roughness,opacity:m.opacity,transparent:m.transparent,depthWrite:m.depthWrite,side:m.side,emissive:m.emissive?.toArray(),emissiveIntensity:m.emissiveIntensity,map:textureState(m.map),bumpMap:textureState(m.bumpMap),bumpScale:m.bumpScale};
}
function objectState(root) { window.__bfTrace?.add(815);
  const objects=[],geometries={},materials={};
  root.traverse(o=>{
    const entry={name:o.name,type:o.type,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),visible:o.visible,castShadow:o.castShadow,receiveShadow:o.receiveShadow};
    if(o.geometry) {
      const id=o.geometry.uuid;
      entry.geometry=id;
      if(!geometries[id]) geometries[id]=o.geometry.toJSON();
    }
    if(o.material) {
      const mm=Array.isArray(o.material)?o.material:[o.material];entry.material=mm.map(m=>m.uuid);
      for(const m of mm) materials[m.uuid]=materialState(m);
    }
    if(o.isLight) Object.assign(entry,{color:o.color.toArray(),intensity:o.intensity,groundColor:o.groundColor?.toArray(),distance:o.distance,angle:o.angle,penumbra:o.penumbra,decay:o.decay,castShadow:o.castShadow,shadow:o.shadow?{bias:o.shadow.bias,normalBias:o.shadow.normalBias,radius:o.shadow.radius,mapSize:o.shadow.mapSize.toArray(),camera:o.shadow.camera.toJSON()}:null});
    entry.parent=o===root?null:o.parent.uuid;entry.id=o.uuid;objects.push(entry);
  });
  return {objects,geometries,materials};
}
let sharedDefinitions;
function getInvariantState() { window.__bfTrace?.add(834);
  // Static definitions are serialized once; current local transforms are always read afresh.
  if(!sharedDefinitions) sharedDefinitions=objectState(world);
  const transforms=[];
  world.traverse(o=>transforms.push({id:o.uuid,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),visible:o.visible}));
  return {world:sharedDefinitions,transforms,camera:getCameraState(),navigation:getNavigationState(),render:{exposure:renderer.toneMappingExposure,toneMapping:renderer.toneMapping,background:scene.background.toArray(),environment:{background:environmentScene.background.toArray(),objects:objectState(environmentScene),pmremSigma:.08},outputColorSpace:renderer.outputColorSpace,shadowMap:{enabled:renderer.shadowMap.enabled,type:renderer.shadowMap.type}}};
}
function getEditedObjectState() { window.__bfTrace?.add(841);
  const active=variant==='564'?humanoid:quadruped;
  return {variant,embodiment:variant==='564'?'humanoid':'quadruped',groundRoot:{position:robotRig.position.toArray(),quaternion:robotRig.quaternion.toArray()},rig:objectState(active),joints:(variant==='564'?[...humanLegs,...arms]:dogLegs).map(l=>({name:l.g.name,...l.pose,contact:l.contact??null}))};
}
world.updateMatrixWorld(true);
const collisionMeshes=[];
for(const name of ['centralWorkbench','leftRollingStool','rightRollingStool','rearEquipmentBench','glassDoubleExit','entranceChargingDock']){
  world.getObjectByName(name).traverse(o=>{if(o.isMesh&&!o.material.transparent)collisionMeshes.push({name,box:new THREE.Box3().setFromObject(o)});});
}
function getMotionDiagnostics() { window.__bfTrace?.add(850);
  const active=variant==='564'?humanoid:quadruped;
  const collisions=[];
  active.traverse(o=>{
    if(!o.isMesh)return;
    const bounds=new THREE.Box3().setFromObject(o);
    for(const obstacle of collisionMeshes) if(bounds.intersectsBox(obstacle.box))collisions.push({part:o.name,obstacle:obstacle.name});
  });
  return {
    collisions,
    legs:(variant==='564'?humanLegs:dogLegs).map(l=>({
      name:l.g.name,...l.pose,...l.contact,
      footPosition:l.foot.getWorldPosition(v3()).toArray(),
      footQuaternion:l.foot.getWorldQuaternion(new THREE.Quaternion()).toArray(),
      footBottom:new THREE.Box3().setFromObject(l.foot).min.y,
      targetWorld:l.ankle.getWorldPosition(v3()).toArray()
    }))
  };
}
window.reconstruction={
  pause(){},
  seek,
  setVariant(id){if(id!=='564'&&id!=='563') throw new RangeError('Variant must be 564 or 563');variant=id;seek(currentTime);},
  getCameraState,getNavigationState,getInvariantState,getEditedObjectState,getMotionDiagnostics,
};
seek(0);
