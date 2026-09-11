import * as THREE from '../vendor/three.module.js';

const WIDTH = 960, HEIGHT = 540, FPS = 24, FRAMES = 124;
const duration = FRAMES / FPS;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#bbc0c0');
scene.fog = new THREE.Fog('#bfc2be', 23, 65);
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(49, WIDTH / HEIGHT, 0.05, 100);
camera.name = 'shared-camera';
const world = new THREE.Group();
world.name = 'shared-industrial-yard';
scene.add(world);
const robotRig = new THREE.Group();
robotRig.name = 'robotRig';
scene.add(robotRig);
const v = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
const Y = v(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const mix = THREE.MathUtils.lerp;
const smooth = t => { t = clamp(t, 0, 1); return t * t * (3 - 2 * t); };
function randomGenerator(seed) { window.__bfTrace?.add(30);
  return () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
}
const rnd = randomGenerator(572013);
const materials = {};
function material(name, color, roughness = 0.8, metalness = 0) { window.__bfTrace?.add(35);
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  m.name = name; materials[name] = m; return m;
}
const silver = material('brushed cast aluminium', '#bec5c9', 0.53, 0.65);
const edgeSilver = material('machined bright edges', '#c2c7c5', 0.35, 0.78);
const darkSilver = material('weathered galvanized metal', '#929794', 0.72, 0.5);
const black = material('black exposed actuators', '#171b1d', 0.48, 0.48);
const rubber = material('black rubber hoses and soles', '#101313', 0.95);
const rust = material('rust brown iron', '#4b3427', 0.94, 0.16);
const visor = material('dark optical windows', '#070f13', 0.22, 0.5);
const cream = material('dirty cream warehouse cladding', '#b8b6a2', 0.94, 0.14);
const shedGray = material('gray corrugated sheet steel', '#798080', 0.85, 0.35);
const mortar = material('aged beige mortar', '#827f72', 1);
const white = material('worn lane paint', '#d9d9c9', 0.98);
const orange = material('dirty safety orange', '#b94d22', 0.9);
const stripe = material('weathered cone reflector', '#d0cfc0', 0.8);
const brickColors = ['#74665c', '#77695e', '#6e635a', '#816f62', '#776b60'].map((c, i) => material(`brick-${i}`, c, 1));
const dirt = material('soil and dead grass', '#605f4a', 1);

function box(parent, name, size, position, mat, cast = true) { window.__bfTrace?.add(55);
  const obj = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  obj.name = name; obj.position.set(...position);
  obj.castShadow = cast; obj.receiveShadow = true; parent.add(obj); return obj;
}
function bevelBox(parent, name, size, position, mat, bevel = 0.025) { window.__bfTrace?.add(60);
  const [w, h, d] = size, b = Math.min(bevel, w / 5, h / 5, d / 5);
  const shape = new THREE.Shape();
  shape.moveTo(-w / 2 + b, -h / 2);
  shape.lineTo(w / 2 - b, -h / 2); shape.lineTo(w / 2, -h / 2 + b);
  shape.lineTo(w / 2, h / 2 - b); shape.lineTo(w / 2 - b, h / 2);
  shape.lineTo(-w / 2 + b, h / 2); shape.lineTo(-w / 2, h / 2 - b);
  shape.lineTo(-w / 2, -h / 2 + b); shape.closePath();
  const geom = new THREE.ExtrudeGeometry(shape, { depth: d - 2 * b, bevelEnabled: true, bevelSegments: 1, steps: 1, bevelSize: b / 2, bevelThickness: b });
  geom.translate(0, 0, -d / 2 + b);
  const m = new THREE.Mesh(geom, mat);
  m.name = name; m.position.set(...position); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function rod(parent, name, a, b, radius, mat, radial = 8) { window.__bfTrace?.add(73);
  const dir = b.clone().sub(a), len = dir.length();
  const m = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, len, radial), mat);
  m.name = name; m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(Y, dir.normalize()); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function cable(parent, name, points, radius = 0.015, mat = rubber) { window.__bfTrace?.add(79);
  const curve = new THREE.CatmullRomCurve3(points.map(p => v(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, 18, radius, 6, false), mat);
  m.name = name; m.castShadow = true; parent.add(m); return m;
}
function bolts(parent, width, height, depth) { window.__bfTrace?.add(84);
  for (const x of [-1, 1]) for (const y of [-1, 1]) {
    rod(parent, 'hex plate fastener', v(x * width, y * height, depth), v(x * width, y * height, depth + 0.012), 0.012, edgeSilver, 6);
  }
}
function makeTexture(size, recipe, paint) { window.__bfTrace?.add(89);
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  paint(canvas.getContext('2d'), size);
  const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8; tex.userData = { procedural: true, recipe, width: size, height: size };
  return tex;
}
const groundTexture = makeTexture(2048, 'seed 8721: concrete grain, patches, joints, oil and curved double tyre tracks in world coordinates', (ctx, size) => {
  const rand = randomGenerator(8721), data = ctx.createImageData(size, size);
  for (let i = 0; i < data.data.length; i += 4) {
    const n = (rand() - 0.5) * 22;
    data.data[i] = 177 + n; data.data[i + 1] = 175 + n; data.data[i + 2] = 163 + n; data.data[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const px = x => (x + 12) / 24 * size;
  for (let i = 0; i < 15000; i++) {
    const x = rand() * size, y = rand() * size, r = 1 + rand() * 12;
    ctx.fillStyle = rand() < 0.6 ? `rgba(41,43,35,${rand() * 0.075})` : `rgba(213,211,190,${rand() * 0.1})`;
    ctx.beginPath(); ctx.ellipse(x, y, r * 2, r, rand() * Math.PI, 0, Math.PI * 2); ctx.fill();
  }
  function blot(x, z, radius, opacity) {
    const cx = px(x), cy = px(z), s = radius * size / 24;
    ctx.fillStyle = `rgba(43,44,33,${opacity})`; ctx.beginPath();
    for (let j = 0; j < 36; j++) {
      const a = j / 36 * Math.PI * 2, r = s * (0.87 + 0.08 * Math.sin(a * 3) + 0.06 * Math.sin(a * 7) + rand() * 0.04);
      const xx = cx + Math.cos(a) * r, yy = cy + Math.sin(a) * r * 0.63;
      if (j === 0) ctx.moveTo(xx, yy); else ctx.lineTo(xx, yy);
    }
    ctx.closePath(); ctx.fill();
  }
  for (let i = 0; i < 140; i++) blot(rand() * 16 - 8, rand() * 18 - 8, 0.015 + rand() * 0.17, 0.08 + rand() * 0.2);
  blot(-0.65, 2.75, 0.51, 0.42); blot(0.9, 2.7, 0.15, 0.4);
  ctx.strokeStyle = 'rgba(48,49,44,.46)'; ctx.lineWidth = 1.4;
  for (const z of [-3.5, 0.0, 3.5, 7]) {
    ctx.beginPath(); ctx.moveTo(px(-12), px(z)); ctx.lineTo(px(-1.6), px(z + 0.06)); ctx.lineTo(px(12), px(z - 0.02)); ctx.stroke();
  }
  for (let i = 0; i < 14; i++) {
    ctx.strokeStyle = `rgba(34,37,31,${0.08 + rand() * 0.09})`; ctx.lineWidth = 0.7 + rand() * 1.4;
    for (const off of [0, 0.76]) {
      ctx.beginPath(); ctx.moveTo(px(-1.7 + off + i * 0.012), px(6.1));
      ctx.bezierCurveTo(px(-2.8 + off + i * 0.012), px(2.2), px(-1.7 + off + i * 0.012), px(1.6), px(-1.6 + off + i * 0.012), px(0.3)); ctx.stroke();
    }
  }
  for (let i = 0; i < 24; i++) {
    const x = px(rand() * 16 - 8), z = px(rand() * 16 - 8);
    ctx.strokeStyle = 'rgba(36,39,32,.23)'; ctx.lineWidth = 0.6; ctx.beginPath(); ctx.moveTo(x, z);
    for (let j = 1; j < 6; j++) ctx.lineTo(x + j * 5 + rand() * 8, z + j * 3 + rand() * 10);
    ctx.stroke();
  }
});
const concrete = material('fixed stained concrete', '#d9d8d0', 0.98);
concrete.map = groundTexture;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), concrete);
ground.name = 'concrete with fixed tyre marks'; ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; world.add(ground);
const farGround = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), dirt);
farGround.name = 'continuous distant ground beneath the yard';
farGround.position.y = -0.02; farGround.rotation.x = -Math.PI / 2; world.add(farGround);

const sky = new THREE.Mesh(new THREE.SphereGeometry(70, 32, 16), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  vertexShader: 'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: `varying vec3 p;
    float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
    float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
    void main(){vec3 d=normalize(p);vec2 q=d.xz/(max(d.y,.12))*1.7;
    float c=.53*n(q)+.28*n(q*2.2)+.13*n(q*4.8)+.06*n(q*10.);
    vec3 col=mix(vec3(.56,.59,.60),vec3(.83,.84,.82),c);
    col=mix(vec3(.74,.76,.75),col,smoothstep(-.04,.45,d.y));gl_FragColor=vec4(col,1.);}`
}));
sky.name = 'procedural overcast cloud dome'; world.add(sky);
const environmentScene = new THREE.Scene();
environmentScene.add(sky.clone());
const reflectedGround = new THREE.Mesh(new THREE.BoxGeometry(160, 0.1, 160), new THREE.MeshBasicMaterial({ color: '#74766d' }));
reflectedGround.position.y = -2; environmentScene.add(reflectedGround);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(environmentScene, 0.12, 0.1, 100).texture;
scene.environment.name = 'generated overcast reflection environment';
scene.environment.userData = { procedural: true, recipe: 'same analytic cloud dome and neutral ground; PMREM roughness convolution' };
pmrem.dispose();
const metalGrain = makeTexture(512, 'seed 912: brushed silver scratches and subtle oxide mottling', (ctx, size) => {
  const rand = randomGenerator(912);
  ctx.fillStyle = '#dedfdf'; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 5000; i++) {
    const c = 135 + Math.floor(rand() * 80); ctx.strokeStyle = `rgba(${c},${c},${c},.15)`;
    const x = rand() * size, y = rand() * size;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + rand() * 35, y + (rand() - 0.5) * 2); ctx.stroke();
  }
  for (let i = 0; i < 130; i++) {
    ctx.fillStyle = 'rgba(87,86,72,.035)';
    ctx.beginPath(); ctx.ellipse(rand() * size, rand() * size, 2 + rand() * 19, 2 + rand() * 7, 0, 0, Math.PI * 2); ctx.fill();
  }
});
silver.map = metalGrain; silver.envMapIntensity = 0.85;
const claddingTexture = makeTexture(512, 'seed 623: fixed corrugated cladding oxide drips and fine surface grain', (ctx, size) => {
  const rand = randomGenerator(623); ctx.fillStyle = '#e4e4df'; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 2700; i++) {
    ctx.fillStyle = `rgba(67,69,61,${rand() * 0.095})`;
    ctx.fillRect(rand() * size, rand() * size, rand() * 2, 1 + rand() * 36);
  }
  for (let x = 0; x < size; x += 16) {
    ctx.fillStyle = 'rgba(40,46,42,.08)'; ctx.fillRect(x, 0, 2, size);
    ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.fillRect(x + 2, 0, 2, size);
  }
});
cream.map = claddingTexture; shedGray.map = claddingTexture;
const hemi = new THREE.HemisphereLight('#edf0f1', '#8b877b', 2.15);
hemi.name = 'shared overcast ambient'; scene.add(hemi);
const sun = new THREE.DirectionalLight('#f2f0e6', 0.62);
sun.name = 'shared broad cloud-filtered sun'; sun.position.set(-4, 8, 4);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -9; sun.shadow.camera.right = 9; sun.shadow.camera.top = 9; sun.shadow.camera.bottom = -9;
sun.shadow.normalBias = 0.015; sun.shadow.bias = -0.00015; sun.shadow.radius = 5;
sun.target.position.set(0, 0, -1); scene.add(sun, sun.target);

function lane(x) { window.__bfTrace?.add(203);
  const strip = box(world, 'white marked lane', [0.065, 0.003, 10.5], [x, 0.003, 2.1], white, false);
  for (let i = 0; i < 30; i++) {
    const chip = box(world, 'lane paint chip', [0.007 + rnd() * 0.027, 0.002, 0.01 + rnd() * 0.025], [x + (rnd() - 0.5) * 0.035, 0.006, -3.1 + rnd() * 10.3], concrete, false);
    chip.rotation.y = rnd() * 0.5;
  }
  return strip;
}
lane(-0.91); lane(0.91);
box(world, 'lane far cross stripe', [1.87, 0.003, 0.05], [0, 0.004, -3.13], white, false);
const ramp = new THREE.Group(); ramp.name = 'shared shallow diamond-plate bridge'; world.add(ramp);
const profile = [[-1.35, 0.018], [-0.85, 0.18], [0.4, 0.18], [1.05, 0.018]];
function surfaceHeight(x, z) { window.__bfTrace?.add(215);
  if (Math.abs(x) > 0.75 || z < -1.35 || z > 1.05) return 0;
  for (let i = 0; i < profile.length - 1; i++) {
    const [a, h] = profile[i], [b, k] = profile[i + 1];
    if (z <= b) return mix(h, k, (z - a) / (b - a));
  }
  return 0;
}
for (let i = 0; i < profile.length - 1; i++) {
  const [za, ya] = profile[i], [zb, yb] = profile[i + 1], dz = zb - za;
  const plate = box(ramp, 'silver bridge deck panel', [1.5, 0.024, Math.hypot(dz, yb - ya)], [0, (ya + yb) / 2 - 0.013, (za + zb) / 2], silver);
  plate.rotation.x = -Math.atan2(yb - ya, dz);
  for (const x of [-0.74, 0.74]) rod(ramp, 'deck rolled edge', v(x, ya, za), v(x, yb, zb), 0.012, darkSilver, 6);
}
for (const z of [-0.74, 0.29]) for (const x of [-0.56, 0.56]) box(ramp, 'bridge steel supports', [0.06, 0.15, 0.08], [x, 0.075, z], darkSilver);
const treadMatrices = [];
const dummy = new THREE.Object3D();
for (let z = -1.3; z < 1.02; z += 0.075) for (let x = -0.71; x < 0.73; x += 0.075) {
  const row = Math.round((z + 1.3) / 0.075);
  dummy.position.set(x, surfaceHeight(x, z) + 0.002, z);
  dummy.rotation.set(0, (row % 2 === 0 ? 1 : -1) * 0.68, 0);
  dummy.updateMatrix(); treadMatrices.push(dummy.matrix.clone());
}
const tread = new THREE.InstancedMesh(new THREE.BoxGeometry(0.035, 0.003, 0.008), edgeSilver, treadMatrices.length);
tread.name = 'raised diamond tread'; treadMatrices.forEach((m, i) => tread.setMatrixAt(i, m)); tread.receiveShadow = true; ramp.add(tread);
function cone(x, z, index) { window.__bfTrace?.add(240);
  const g = new THREE.Group(); g.name = `shared dirty cone ${index}`; g.position.set(x, 0, z); world.add(g);
  g.scale.set(1.08, 1.22, 1.08);
  const base = bevelBox(g, 'rubber cone base', [0.36, 0.035, 0.34], [0, 0.018, 0], rubber, 0.01); base.rotation.y = 0.12 * index;
  const height = 0.61, radiusAt = y => 0.137 * (1 - y / height) + 0.017;
  const ys = [0.04, 0.27, 0.33, 0.42, 0.48, 0.63];
  for (let i = 0; i < ys.length - 1; i++) {
    const lo = ys[i], hi = ys[i + 1];
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusAt(hi), radiusAt(lo), hi - lo, 28), i === 1 || i === 3 ? stripe : orange);
    mesh.name = 'orange taper and reflector bands'; mesh.position.y = (hi + lo) / 2; mesh.castShadow = true; g.add(mesh);
  }
  for (let i = 0; i < 15; i++) {
    const a = rnd() * Math.PI * 2, y = 0.065 + rnd() * 0.21, r = radiusAt(y) + 0.001;
    const patch = new THREE.Mesh(new THREE.CircleGeometry(0.008 + rnd() * 0.012, 5), dirt);
    patch.name = 'cone dirt'; patch.position.set(Math.sin(a) * r, y, Math.cos(a) * r); patch.rotation.y = a; g.add(patch);
  }
}
cone(-0.93, -2.71, 1); cone(0.94, -2.71, 2);

box(world, 'rear wall mortar', [32, 1.58, 0.2], [2, 0.79, -7.4], mortar);
const brickGeom = new THREE.BoxGeometry(0.37, 0.105, 0.22);
for (let color = 0; color < brickColors.length; color++) {
  const transforms = [];
  for (let row = 0; row < 14; row++) for (let col = 0; col < 84; col++) {
    const materialIndex = ((Math.imul(row + 41, 73856093) ^ Math.imul(col + 19, 19349663)) >>> 0) % 5;
    if (materialIndex !== color) continue;
    dummy.position.set(-13.8 + col * 0.38 + row % 2 * 0.19, 0.065 + row * 0.112, -7.39);
    dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); transforms.push(dummy.matrix.clone());
  }
  const mesh = new THREE.InstancedMesh(brickGeom, brickColors[color], transforms.length);
  mesh.name = 'weathered staggered brick courses'; transforms.forEach((m, i) => mesh.setMatrixAt(i, m)); mesh.receiveShadow = true; world.add(mesh);
}
box(world, 'wall coping', [32, 0.045, 0.29], [2, 1.59, -7.4], darkSilver);

const wireMat = new THREE.LineBasicMaterial({ color: '#737870', transparent: true, opacity: 0.43 });
wireMat.name = 'fine galvanized chain link';
function fencePanel(parent, width, height, isGate) { window.__bfTrace?.add(276);
  const g = new THREE.Group(); g.name = isGate ? 'closed chain-link gate leaf' : 'chain-link fence panel'; parent.add(g);
  for (const x of [0, width]) rod(g, 'fence upright', v(x, 0, 0), v(x, height + 0.16, 0), isGate ? 0.025 : 0.024, isGate ? rust : darkSilver);
  for (const y of [0.08, height]) rod(g, 'fence horizontal rail', v(0, y, 0), v(width, y, 0), isGate ? 0.026 : 0.018, isGate ? rust : darkSilver);
  if (isGate) rod(g, 'gate middle brace', v(0, height * 0.44, 0), v(width, height * 0.44, 0), 0.018, rust);
  const points = [], spacing = 0.105;
  for (let k = -height; k <= width + height; k += spacing) for (const sign of [-1, 1]) {
    let low = Math.max(0, sign > 0 ? -k : k - width);
    let high = Math.min(height, sign > 0 ? width - k : k);
    if (high <= low) continue;
    points.push(k + sign * low, low, 0.002, k + sign * high, high, 0.002);
  }
  const geom = new THREE.BufferGeometry(); geom.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  const links = new THREE.LineSegments(geom, wireMat); links.name = 'diagonal woven diamond wire'; g.add(links);
  for (const x of [0, width]) {
    rod(g, 'barbed-wire angled arm', v(x, height, 0), v(x, height + 0.36, 0.14), 0.014, darkSilver);
  }
  for (let row = 0; row < 3; row++) {
    const y = height + 0.1 + row * 0.11, z = row * 0.045;
    rod(g, 'barbed strand', v(0, y, z), v(width, y, z), 0.003, darkSilver, 5);
    for (let x = 0.16; x < width; x += 0.24) {
      rod(g, 'twisted barb', v(x - 0.024, y - 0.024, z), v(x + 0.024, y + 0.024, z), 0.0025, darkSilver, 4);
    }
  }
  return g;
}
for (let i = 0; i < 4; i++) {
  const g = fencePanel(world, 2.7, 1.95, false); g.position.set(-7.9 + 2.7 * i, 0, -4.45);
}
for (let i = 0; i < 3; i++) {
  const g = fencePanel(world, 2.9, 2.55, true); g.position.set(2.9, 0, -4.45 + i * 2.9); g.rotation.y = -Math.PI / 2;
}
for (const z of [-4.45, -1.55, 1.35, 4.25]) {
  rod(world, 'heavy right gate post', v(2.91, 0, z), v(2.91, 2.99, z), 0.052, darkSilver, 12);
  for (const y of [0.35, 1.54, 2.52]) box(world, 'gate post hinge collar', [0.13, 0.05, 0.13], [2.91, y, z], silver);
}
rod(world, 'gate latch', v(2.85, 1.02, -1.75), v(2.85, 1.02, -1.35), 0.024, darkSilver);
box(world, 'gate padlock', [0.05, 0.075, 0.07], [2.81, 0.96, -1.55], rust);
const ladder = new THREE.Group(); ladder.name = 'shared folded metal step ladder'; world.add(ladder);
ladder.position.set(2.61, 0, 0.4); ladder.rotation.y = Math.PI / 2;
for (const x of [-0.2, 0.2]) {
  rod(ladder, 'ladder front rail', v(x, 0.035, 0.18), v(x, 0.95, -0.03), 0.022, silver);
  rod(ladder, 'ladder folded rear rail', v(x, 0.025, 0.24), v(x, 0.92, 0.015), 0.018, darkSilver);
  box(ladder, 'ladder rubber cap', [0.065, 0.055, 0.08], [x, 0.03, 0.19], rubber);
}
for (let i = 1; i <= 4; i++) box(ladder, 'ladder step', [0.42, 0.024, 0.12], [0, i * 0.19, 0.18 - i * 0.043], edgeSilver);

function warehouse(x, z, w, d, h, mat) { window.__bfTrace?.add(323);
  const g = new THREE.Group(); g.name = 'shared corrugated warehouse'; g.position.set(x, 0, z); world.add(g);
  box(g, 'shed mass', [w, h, d], [0, h / 2, 0], mat);
  for (let xx = -w / 2; xx <= w / 2; xx += 0.14) {
    box(g, 'vertical front corrugation', [0.017, h - 0.1, 0.025], [xx, h / 2, d / 2 + 0.018], mat, false);
  }
  for (let zz = -d / 2; zz <= d / 2; zz += 0.15) {
    box(g, 'side corrugation', [0.027, h - 0.06, 0.018], [-w / 2 - 0.01, h / 2, zz], mat, false);
  }
  const roofHeight = w * 0.07;
  for (const sign of [-1, 1]) {
    const roof = box(g, 'pitched sheet metal roof', [w / 2 + 0.13, 0.07, d + 0.2], [sign * w / 4, h + roofHeight / 2, 0], darkSilver);
    roof.rotation.z = -sign * Math.atan2(roofHeight, w / 2);
  }
  const gableGeometry = new THREE.BufferGeometry();
  gableGeometry.setAttribute('position', new THREE.Float32BufferAttribute([-w / 2, h, d / 2, w / 2, h, d / 2, 0, h + roofHeight, d / 2], 3));
  gableGeometry.computeVertexNormals();
  const gable = new THREE.Mesh(gableGeometry, mat); gable.name = 'closed corrugated gable'; g.add(gable);
  box(g, 'loading door dark reveal', [w * 0.28 + 0.1, h * 0.68 + 0.05, 0.035], [w * 0.15, h * 0.34, d / 2 + 0.035], darkSilver);
  box(g, 'closed loading shutter', [w * 0.28, h * 0.68, 0.04], [w * 0.15, h * 0.34, d / 2 + 0.06], shedGray);
  for (let y = 0.08; y < h * 0.68; y += 0.1) box(g, 'door slat', [w * 0.28, 0.009, 0.012], [w * 0.15, y, d / 2 + 0.087], darkSilver, false);
  for (let i = 0; i < 35; i++) {
    const streak = box(g, 'cladding weather streak', [0.02 + rnd() * 0.06, 0.1 + rnd() * 0.65, 0.003], [(rnd() - 0.5) * w, h * (0.5 + rnd() * 0.45), d / 2 + 0.033], i % 2 ? darkSilver : mortar, false);
  }
}
warehouse(-2.7, -9.3, 7.6, 3.0, 3.5, shedGray);
warehouse(4, -11.3, 8, 4.5, 3.5, cream);
warehouse(11.5, -3.8, 6.4, 6.5, 3.3, cream);
rod(world, 'tall weathered utility pole', v(3.18, 0, 0.85), v(3.18, 6.5, 0.85), 0.098, material('gray treated pole', '#6b7166', 0.95), 12);
for (let y = 0.2; y < 6; y += 0.61) rod(world, 'pole conduit', v(3.065, y, 0.82), v(3.065, y + 0.6, 0.82), 0.011, darkSilver);
cable(world, 'overhead utility line', [[-9, 5.3, -6], [-3, 5.0, -3.7], [3.18, 5.65, 0.85], [10, 5.3, 2]], 0.008, rubber);
const bark = material('bare tree bark', '#43483f', 1);
function tree(x, z, height, seed) { window.__bfTrace?.add(355);
  const g = new THREE.Group(); g.name = 'leafless winter tree'; g.position.set(x, 0, z); world.add(g);
  const random = randomGenerator(seed);
  function branch(a, direction, len, radius, depth) {
    const b = a.clone().addScaledVector(direction, len);
    rod(g, 'bare branching limb', a, b, radius, bark, 5);
    if (depth === 0) return;
    for (let j = 0; j < 3; j++) {
      const d = direction.clone().add(v((random() - 0.5) * 1.6, 0.05 + random() * 0.35, (random() - 0.5) * 1.6)).normalize();
      branch(b, d, len * (0.55 + random() * 0.14), radius * 0.53, depth - 1);
    }
  }
  branch(v(), v(0.025, 1, 0), height * 0.35, 0.075, 5);
}
tree(1.2, -8.5, 6.7, 42); tree(2.5, -9, 5.7, 127); tree(4.8, -8, 4.5, 71);
box(world, 'right rough soil verge', [3.2, 0.007, 15], [4.6, 0.002, -2.5], dirt, false);
box(world, 'rear rough soil verge', [18, 0.01, 2.93], [-3, 0.001, -5.96], dirt, false);
const grassMat = material('dry weeds', '#787b58', 1);
const soilTexture = makeTexture(512, 'seed 729: bare earth, dead grass and patchy damp verge', (ctx, size) => {
  const random = randomGenerator(729); ctx.fillStyle = '#b3b298'; ctx.fillRect(0, 0, size, size);
  for (let i = 0; i < 9500; i++) {
    ctx.fillStyle = i % 3 ? `rgba(56,55,39,${0.02 + random() * 0.12})` : `rgba(196,191,161,${0.03 + random() * 0.16})`;
    ctx.beginPath(); ctx.ellipse(random() * size, random() * size, 1 + random() * 8, 1 + random() * 4, random() * Math.PI, 0, 2 * Math.PI); ctx.fill();
  }
});
soilTexture.wrapS = soilTexture.wrapT = THREE.RepeatWrapping; soilTexture.repeat.set(3, 4); dirt.map = soilTexture;
const grassGeo = new THREE.BufferGeometry(), grassPositions = [];
for (let i = 0; i < 1400; i++) {
  const x = i < 900 ? 3.1 + rnd() * 3 : -10 + rnd() * 13, z = i < 900 ? -9 + rnd() * 14 : -5.5 + rnd() * 1.05;
  const h = 0.025 + rnd() * 0.13;
  grassPositions.push(x - 0.012, 0.012, z, x + 0.012, 0.012, z, x + (rnd() - 0.5) * 0.07, h, z + 0.025);
}
grassGeo.setAttribute('position', new THREE.Float32BufferAttribute(grassPositions, 3)); grassGeo.computeVertexNormals();
grassMat.side = THREE.DoubleSide;
const weeds = new THREE.Mesh(grassGeo, grassMat); weeds.name = 'fixed verge weeds'; world.add(weeds);
rod(world, 'near left entrance post', v(-2.6, 0, 2.3), v(-2.6, 4, 2.3), 0.045, rust, 8);

function motor(parent, name, radius = 0.095, width = 0.12) { window.__bfTrace?.add(392);
  const g = new THREE.Group(); g.name = name; parent.add(g);
  rod(g, 'black rotary motor', v(-width / 2, 0, 0), v(width / 2, 0, 0), radius, black, 20);
  for (const x of [-width * 0.31, width * 0.31]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.015, 0.006, 6, 24), darkSilver);
    ring.name = 'actuator housing ring'; ring.position.x = x; ring.rotation.y = Math.PI / 2; g.add(ring);
  }
  for (const side of [-1, 1]) {
    rod(g, 'silver motor end cap', v(side * width / 2, 0, 0), v(side * (width / 2 + 0.015), 0, 0), radius * 0.83, silver, 16);
    rod(g, 'motor axle', v(side * (width / 2 + 0.015), 0, 0), v(side * (width / 2 + 0.023), 0, 0), radius * 0.32, edgeSilver, 10);
    for (let k = 0; k < 4; k++) {
      const a = k * Math.PI / 2 + 0.5;
      rod(g, 'motor face bolt', v(side * (width / 2 + 0.016), Math.cos(a) * radius * 0.61, Math.sin(a) * radius * 0.61), v(side * (width / 2 + 0.024), Math.cos(a) * radius * 0.61, Math.sin(a) * radius * 0.61), 0.008, black, 6);
    }
  }
  return g;
}
function mechanicalLink(parent, name, length, width, shell = true) { window.__bfTrace?.add(409);
  const g = new THREE.Group(); g.name = name; parent.add(g); g.userData.length = length;
  rod(g, 'structural black central tube', v(0, -length / 2, 0), v(0, length / 2, 0), width * 0.31, black, 10);
  for (const side of [-1, 1]) {
    rod(g, 'exposed linear actuator rod', v(side * width * 0.34, -length * 0.41, 0.02), v(side * width * 0.34, length * 0.41, 0.02), width * 0.075, edgeSilver, 8);
    rod(g, 'actuator barrel', v(side * width * 0.34, -length * 0.32, 0.02), v(side * width * 0.34, length * 0.1, 0.02), width * 0.13, darkSilver, 8);
  }
  if (shell) {
    const plate = bevelBox(g, 'angular silver armor plate', [width, length * 0.6, width * 0.44], [0, 0.015, width * 0.22], silver);
    bolts(plate, width * 0.31, length * 0.23, width * 0.22);
    box(g, 'dark rear service opening', [width * 0.74, length * 0.42, 0.02], [0, 0, -width * 0.24], black);
    cable(g, 'flexible linkage service cable', [[-width * 0.38, -length * 0.42, 0], [-width * 0.7, -length * 0.19, -width * 0.2], [-width * 0.68, length * 0.23, -width * 0.25], [-width * 0.36, length * 0.42, 0]], 0.009);
  }
  return g;
}
function placeLink(obj, a, b) { window.__bfTrace?.add(424);
  obj.position.copy(a).add(b).multiplyScalar(0.5);
  obj.quaternion.setFromUnitVectors(Y, b.clone().sub(a).normalize());
  obj.scale.y = a.distanceTo(b) / obj.userData.length;
}
function makeHead(parent, small = false) { window.__bfTrace?.add(429);
  const g = new THREE.Group(); g.name = small ? 'quadruped optical sensor module' : 'square humanoid sensor head'; parent.add(g);
  const scale = small ? 0.85 : 1;
  bevelBox(g, 'beveled silver square sensor casing', [0.29, 0.29, 0.27], [0, 0, 0], silver, 0.035);
  bevelBox(g, 'black rectangular optical face', [0.244, 0.127, 0.012], [0, 0.014, 0.141], visor, 0.01);
  for (const x of [-0.078, 0.078]) {
    rod(g, 'optical lens rim', v(x, 0.011, 0.142), v(x, 0.011, 0.151), 0.024, darkSilver, 18);
    rod(g, 'recessed camera lens', v(x, 0.011, 0.151), v(x, 0.011, 0.154), 0.018, visor, 18);
  }
  for (let i = 0; i < 4; i++) box(g, 'head side cooling slit', [0.003, 0.012, 0.13], [-0.153, -0.06 + i * 0.034, 0], black);
  box(g, 'top lidar puck base', [0.12, 0.025, 0.1], [0, 0.158, 0], black);
  rod(g, 'lidar', v(0, 0.17, 0), v(0, 0.205, 0), 0.044, darkSilver, 16);
  g.scale.setScalar(scale); return g;
}
function humanoid() { window.__bfTrace?.add(443);
  const group = new THREE.Group(); group.name = 'humanoid572'; robotRig.add(group);
  const body = new THREE.Group(); body.name = 'articulated humanoid torso'; group.add(body);
  bevelBox(body, 'black pelvis chassis', [0.38, 0.22, 0.23], [0, 1.19, 0], black);
  bevelBox(body, 'pelvis silver front shield', [0.31, 0.18, 0.045], [0, 1.19, 0.135], silver);
  rod(body, 'waist gimbal', v(0, 1.26, 0), v(0, 1.43, 0), 0.105, black, 16);
  bevelBox(body, 'thorax exposed frame', [0.47, 0.49, 0.25], [0, 1.68, 0], black);
  const chest = bevelBox(body, 'broad silver breast plate', [0.41, 0.48, 0.07], [0, 1.67, 0.162], silver, 0.034); bolts(chest, 0.16, 0.186, 0.036);
  for (const side of [-1, 1]) {
    rod(body, 'torso side frame', v(side * 0.22, 1.43, -0.12), v(side * 0.24, 1.89, -0.12), 0.025, edgeSilver);
    cable(body, 'shoulder service loop', [[side * 0.19, 1.9, -0.07], [side * 0.31, 2.03, -0.16], [side * 0.4, 1.88, -0.16], [side * 0.28, 1.71, -0.12]], 0.022);
    cable(body, 'waist hydraulic hose', [[side * 0.15, 1.65, -0.15], [side * 0.28, 1.45, -0.21], [side * 0.21, 1.3, -0.19], [side * 0.11, 1.25, -0.11]], 0.013);
  }
  bevelBox(body, 'back battery and compute pack', [0.32, 0.35, 0.15], [0, 1.69, -0.21], darkSilver);
  for (let y = 1.55; y < 1.83; y += 0.04) box(body, 'back cooling fins', [0.28, 0.018, 0.028], [0, y, -0.296], black);
  rod(body, 'neck central pivot', v(0, 1.93, 0), v(0, 2.095, 0), 0.047, black, 12);
  for (const side of [-1, 1]) rod(body, 'neck silver truss', v(side * 0.14, 1.93, 0.09), v(side * 0.075, 2.09, 0.025), 0.017, edgeSilver);
  const head = makeHead(body); head.position.set(0, 2.205, 0); head.scale.setScalar(0.83);
  const legs = [];
  for (const side of [-1, 1]) {
    const hip = motor(group, 'hip servo'), knee = motor(group, 'knee servo', 0.105, 0.14), ankle = motor(group, 'ankle servo', 0.062, 0.1);
    const upper = mechanicalLink(group, 'thigh articulated linkage', 0.57, 0.235);
    const lower = mechanicalLink(group, 'shin articulated linkage', 0.56, 0.19);
    const foot = new THREE.Group(); foot.name = 'planted humanoid foot'; group.add(foot);
    bevelBox(foot, 'rubber foot sole', [0.16, 0.047, 0.29], [0, 0.027, 0.035], rubber, 0.009);
    bevelBox(foot, 'silver articulated toe plate', [0.145, 0.035, 0.22], [0, 0.065, 0.052], silver, 0.012);
    legs.push({ side, hip, knee, ankle, upper, lower, foot, lengths: [0.57, 0.56] });
  }
  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = motor(group, 'shoulder rotary actuator', 0.11, 0.14);
    const elbow = motor(group, 'elbow actuator', 0.072, 0.105);
    const upper = mechanicalLink(group, 'upper arm linkage', 0.37, 0.15);
    const lower = mechanicalLink(group, 'forearm linkage', 0.34, 0.12);
    const hand = new THREE.Group(); hand.name = 'mechanical articulated gripper'; group.add(hand);
    bevelBox(hand, 'gripper palm', [0.105, 0.12, 0.07], [0, -0.035, 0], silver, 0.01);
    for (const x of [-0.04, 0.04]) {
      box(hand, 'gripper finger', [0.025, 0.11, 0.027], [x, -0.14, 0.014], darkSilver);
      box(hand, 'gripper fingertip', [0.024, 0.028, 0.045], [x, -0.189, 0.026], black);
    }
    arms.push({ side, shoulder, elbow, upper, lower, hand });
  }
  return { group, body, head, legs, arms, kind: 'humanoid', stride: 0, feet: [] };
}
function quadruped() { window.__bfTrace?.add(487);
  const group = new THREE.Group(); group.name = 'quadruped571'; robotRig.add(group);
  const body = new THREE.Group(); body.name = 'quadruped articulated body'; group.add(body);
  bevelBox(body, 'dog exposed spine chassis', [0.39, 0.28, 0.86], [0, 0.79, 0], black);
  for (const side of [-1, 1]) {
    rod(body, 'long tubular side frame', v(side * 0.24, 0.73, -0.41), v(side * 0.24, 0.73, 0.42), 0.024, edgeSilver);
    rod(body, 'upper dog side frame', v(side * 0.22, 0.93, -0.41), v(side * 0.22, 0.93, 0.4), 0.019, silver);
    for (let z = -0.3; z < 0.38; z += 0.15) rod(body, 'open diagonal body truss', v(side * 0.24, 0.72, z), v(side * 0.22, 0.92, z + 0.11), 0.013, silver);
    cable(body, 'dog flexible hydraulic loom', [[side * 0.17, 0.9, -0.3], [side * 0.31, 1.0, -0.31], [side * 0.34, 0.85, -0.1], [side * 0.25, 0.72, 0.28]], 0.018);
  }
  bevelBox(body, 'onboard processor box', [0.29, 0.15, 0.27], [0, 1.015, -0.12], silver);
  bevelBox(body, 'rear range sensor block', [0.21, 0.13, 0.15], [0, 1.07, -0.35], edgeSilver);
  box(body, 'rear range sensor window', [0.16, 0.075, 0.005], [0, 1.07, -0.43], visor);
  const head = makeHead(body, true); head.position.set(0, 1.04, 0.45);
  rod(body, 'dog sensor neck pivot', v(0, 0.86, 0.4), v(0, 0.96, 0.45), 0.07, black, 16);
  bevelBox(body, 'curved forward bumper approximation', [0.44, 0.2, 0.075], [0, 0.78, 0.45], silver);
  for (let x = -0.16; x <= 0.17; x += 0.065) box(body, 'front grille black slots', [0.033, 0.105, 0.004], [x, 0.78, 0.491], black);
  const legs = [];
  for (const fore of [-1, 1]) for (const side of [-1, 1]) {
    const hip = motor(group, 'dog shoulder or hip drive', 0.116, 0.12);
    const knee = motor(group, 'dog articulated knee', 0.057, 0.068);
    const upper = mechanicalLink(group, 'dog upper actuator arm', 0.39, 0.105);
    const lower = mechanicalLink(group, 'dog lower slender linkage', 0.4, 0.068, false);
    const foot = new THREE.Group(); foot.name = 'planted dog rubber foot'; group.add(foot);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), rubber);
    pad.name = 'rounded high-friction dog toe'; pad.scale.set(0.82, 0.65, 1.05); pad.position.y = 0.038; pad.castShadow = true; foot.add(pad);
    legs.push({ side, fore, hip, knee, upper, lower, foot, lengths: [0.39, 0.4] });
  }
  return { group, body, head, legs, kind: 'quadruped', stride: 0, feet: [] };
}
const rigs = { '572': humanoid(), '571': quadruped() };
const contactTexture = makeTexture(128, 'analytic radial ambient contact shadow', (ctx, size) => {
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, 'rgba(0,0,0,.7)'); gradient.addColorStop(0.35, 'rgba(0,0,0,.3)'); gradient.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, size, size);
});
for (const rig of Object.values(rigs)) {
  for (const leg of rig.legs) {
    const size = rig.kind === 'humanoid' ? 0.34 : 0.23;
    const mat = new THREE.MeshBasicMaterial({ map: contactTexture, transparent: true, opacity: 0.36, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    mat.name = 'procedural soft foot contact occlusion';
    leg.contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(size, size * 1.15), mat);
    leg.contactShadow.name = 'rig-local moving foot shadow'; rig.group.add(leg.contactShadow);
  }
}
const straight = 4.65, turnRadius = 0.6, arcLength = turnRadius * Math.PI / 2;
const pathLength = straight + arcLength + 1.4;
rigs['572'].stride = pathLength / 6; rigs['571'].stride = pathLength / 8;
function pathAt(distance) { window.__bfTrace?.add(535);
  if (distance <= straight) return { x: 0, z: 1.5 - distance, yaw: -Math.PI };
  if (distance < straight + arcLength) {
    const a = (distance - straight) / turnRadius;
    return { x: turnRadius * (1 - Math.cos(a)), z: 1.5 - straight - turnRadius * Math.sin(a), yaw: -Math.PI - a };
  }
  return { x: 0.6 + distance - straight - arcLength, z: 1.5 - straight - turnRadius, yaw: -Math.PI * 1.5 };
}
const pivotDuration = 0.78;
function distanceAt(t) { window.__bfTrace?.add(544);
  const start = pivotDuration, stop = 4.8, accel = 0.35, decel = 0.58, total = stop - start;
  const vmax = pathLength / (total - (accel + decel) / 2), u = clamp(t - start, 0, total);
  let s, speed;
  if (u < accel) { speed = vmax * (0.5 - 0.5 * Math.cos(Math.PI * u / accel)); s = vmax * (u / 2 - accel / (2 * Math.PI) * Math.sin(Math.PI * u / accel)); }
  else if (u < total - decel) { speed = vmax; s = vmax * (u - accel / 2); }
  else { const q = u - total + decel; speed = vmax * (0.5 + 0.5 * Math.cos(Math.PI * q / decel)); s = vmax * (total - decel - accel / 2 + q / 2 + decel / (2 * Math.PI) * Math.sin(Math.PI * q / decel)); }
  if (t >= stop) return { distance: pathLength, speed: 0 };
  return { distance: s, speed };
}
function navigationAt(t) { window.__bfTrace?.add(554);
  const travel = distanceAt(t), p = pathAt(travel.distance);
  const yaw = t < pivotDuration ? mix(-0.2, -Math.PI, smooth(t / pivotDuration)) : p.yaw;
  return { position: [p.x, surfaceHeight(p.x, p.z), p.z], yaw, distance: travel.distance, progress: travel.distance / pathLength, speed: travel.speed };
}
let activeVariant = '572', currentTime = 0, navigation = navigationAt(0);
function worldFoot(distance, side, fore, width) { window.__bfTrace?.add(560);
  const p = pathAt(distance);
  const x = p.x + Math.cos(p.yaw) * side * width + Math.sin(p.yaw) * fore;
  const z = p.z - Math.sin(p.yaw) * side * width + Math.cos(p.yaw) * fore;
  return { x, y: surfaceHeight(x, z), z, yaw: p.yaw };
}
function footAt(t, rig, leg) { window.__bfTrace?.add(566);
  const stride = rig.stride, duty = 0.64, offset = rig.kind === 'humanoid' ? (leg.side === -1 ? 0.5 : 0) : (leg.side * leg.fore > 0 ? 0 : 0.5);
  const phase = navigation.distance / stride + offset, cycle = Math.floor(phase + 1e-9), q = phase - cycle;
  const center = (cycle - offset + duty / 2) * stride;
  const fore = rig.kind === 'humanoid' ? 0 : leg.fore * 0.34, width = rig.kind === 'humanoid' ? 0.16 : 0.285;
  let out = worldFoot(center, leg.side, fore, width), stance = q <= duty, lift = 0;
  if (!stance) {
    const u = (q - duty) / (1 - duty), next = worldFoot(center + stride, leg.side, fore, width);
    out = { x: mix(out.x, next.x, smooth(u)), z: mix(out.z, next.z, smooth(u)), yaw: mix(out.yaw, next.yaw, smooth(u)) };
    lift = Math.sin(Math.PI * u) * (rig.kind === 'humanoid' ? 0.155 : 0.13);
    out.y = surfaceHeight(out.x, out.z) + lift;
  }
  if (t < pivotDuration) {
    const steps = rig.kind === 'humanoid' ? 2 : 3, turnPhase = t / pivotDuration * steps + offset;
    const turnCycle = Math.floor(turnPhase), turnQ = turnPhase - turnCycle;
    const anchorAngle = cycleIndex => {
      const u = clamp(((cycleIndex - offset + 0.31) / steps - 0.08) / 0.8, 0, 1);
      return (Math.PI - 0.2) * (1 - smooth(u));
    };
    let angle = anchorAngle(turnCycle);
    stance = turnQ <= 0.62;
    lift = 0;
    if (!stance) {
      const u = (turnQ - 0.62) / 0.38;
      angle = mix(angle, anchorAngle(turnCycle + 1), smooth(u));
      lift = Math.sin(Math.PI * u) * (rig.kind === 'humanoid' ? 0.10 : 0.09);
    }
    const x = out.x - navigation.position[0], z = out.z - navigation.position[2];
    out.x = navigation.position[0] + Math.cos(angle) * x + Math.sin(angle) * z;
    out.z = navigation.position[2] - Math.sin(angle) * x + Math.cos(angle) * z;
    out.y = surfaceHeight(out.x, out.z) + lift;
    out.yaw += angle;
  }
  return { ...out, stance, lift };
}
function toLocal(point) { window.__bfTrace?.add(601);
  const x = point.x - navigation.position[0], z = point.z - navigation.position[2], y = point.y - navigation.position[1];
  const a = navigation.yaw;
  return v(Math.cos(a) * x - Math.sin(a) * z, y, Math.sin(a) * x + Math.cos(a) * z);
}
function solveKnee(hip, foot, l1, l2, bend) { window.__bfTrace?.add(606);
  const d = foot.clone().sub(hip), raw = d.length(), len = clamp(raw, Math.abs(l1 - l2) + 0.0001, l1 + l2 - 0.0001);
  const dir = d.clone().normalize(), along = (l1 * l1 - l2 * l2 + len * len) / (2 * len);
  const perpendicular = bend.clone().addScaledVector(dir, -bend.dot(dir)).normalize();
  return hip.clone().addScaledVector(dir, along).addScaledVector(perpendicular, Math.sqrt(Math.max(0, l1 * l1 - along * along)));
}
function animateRig(rig, t) { window.__bfTrace?.add(612);
  const cycle = navigation.distance / rig.stride * Math.PI * 2;
  const activity = Math.min(1, navigation.speed / 0.8);
  let bob = Math.cos(cycle * 2) * 0.018 * activity;
  const targets = rig.legs.map(leg => footAt(t, rig, leg));
  const baseHipHeight = rig.kind === 'humanoid' ? 1.16 : 0.77;
  for (let i = 0; i < rig.legs.length; i++) {
    const leg = rig.legs[i], local = toLocal(targets[i]);
    const hipX = leg.side * (rig.kind === 'humanoid' ? 0.16 : 0.285), hipZ = (leg.fore || 0) * 0.34;
    const reach = leg.lengths[0] + leg.lengths[1] - 0.018;
    const verticalReach = Math.sqrt(Math.max(0.01, reach * reach - (local.x - hipX) ** 2 - (local.z - hipZ) ** 2));
    const ankleHeight = rig.kind === 'humanoid' ? 0.095 : 0.06;
    bob = Math.min(bob, local.y + ankleHeight + verticalReach - baseHipHeight);
  }
  rig.body.position.y = bob; rig.feet = [];
  for (let i = 0; i < rig.legs.length; i++) {
    const leg = rig.legs[i], target = targets[i], local = toLocal(target);
    const ankleHeight = rig.kind === 'humanoid' ? 0.095 : 0.06;
    const anklePosition = local.clone().add(v(0, ankleHeight, 0));
    const hip = rig.kind === 'humanoid' ? v(leg.side * 0.16, 1.16 + bob, 0) : v(leg.side * 0.285, 0.77 + bob, leg.fore * 0.34);
    const knee = solveKnee(hip, anklePosition, ...leg.lengths, v(0, 0, rig.kind === 'humanoid' ? 1 : -leg.fore));
    leg.hip.position.copy(hip); leg.knee.position.copy(knee);
    if (leg.ankle) leg.ankle.position.copy(anklePosition);
    placeLink(leg.upper, hip, knee); placeLink(leg.lower, knee, anklePosition);
    const halfFoot = rig.kind === 'humanoid' ? 0.115 : 0.037;
    const dx = Math.sin(target.yaw) * halfFoot, dz = Math.cos(target.yaw) * halfFoot;
    const slope = Math.atan2(surfaceHeight(target.x + dx, target.z + dz) - surfaceHeight(target.x - dx, target.z - dz), halfFoot * 2);
    leg.foot.position.copy(local);
    leg.foot.quaternion.setFromAxisAngle(Y, target.yaw - navigation.yaw);
    leg.foot.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(v(1, 0, 0), -slope));
    leg.contactShadow.position.copy(toLocal({ x: target.x, y: surfaceHeight(target.x, target.z) + 0.006, z: target.z }));
    leg.contactShadow.quaternion.copy(leg.foot.quaternion);
    leg.contactShadow.quaternion.multiply(new THREE.Quaternion().setFromAxisAngle(v(1, 0, 0), -Math.PI / 2));
    leg.contactShadow.material.opacity = 0.36 * Math.exp(-target.lift * 13);
    rig.feet.push({ side: leg.side, fore: leg.fore || 0, stance: target.stance, worldTarget: [target.x, target.y, target.z], worldYaw: target.yaw, solePitch: -slope, hip: hip.toArray(), knee: knee.toArray(), ankle: anklePosition.toArray(), segmentLengths: [hip.distanceTo(knee), knee.distanceTo(anklePosition)], nominalLengths: leg.lengths });
  }
  if (rig.kind === 'humanoid') for (const arm of rig.arms) {
    const swing = Math.sin(cycle + (arm.side === 1 ? Math.PI : 0)) * 0.4 * activity;
    const shoulder = v(arm.side * 0.405, 1.86 + bob, 0);
    const elbow = shoulder.clone().add(v(arm.side * 0.075, -0.37 * Math.cos(swing), 0.37 * Math.sin(swing)));
    const hand = elbow.clone().add(v(arm.side * 0.025, -0.34 * Math.cos(swing + 0.3), 0.34 * Math.sin(swing + 0.3)));
    arm.shoulder.position.copy(shoulder); arm.elbow.position.copy(elbow);
    placeLink(arm.upper, shoulder, elbow); placeLink(arm.lower, elbow, hand);
    arm.hand.position.copy(hand); arm.hand.rotation.x = -swing - 0.3;
  }
  rig.head.rotation.y = Math.sin(cycle * 0.5) * 0.035 * activity;
}
function cameraAt(t) { window.__bfTrace?.add(659);
  const a = smooth(t / 5.125);
  camera.position.set(-2.9 + a * 0.3, 2.0, 4.1 - a * 1.05);
  camera.lookAt(1.3 + a * 0.3, 0.62, -0.1 - a * 1.05);
  camera.updateMatrixWorld(true);
}
function seek(seconds) { window.__bfTrace?.add(665);
  if (!Number.isFinite(seconds)) throw new TypeError('seek requires a finite numeric timestamp');
  currentTime = clamp(seconds, 0, duration);
  navigation = navigationAt(currentTime);
  robotRig.position.fromArray(navigation.position); robotRig.rotation.set(0, navigation.yaw, 0);
  for (const [id, rig] of Object.entries(rigs)) { rig.group.visible = id === activeVariant; animateRig(rig, currentTime); }
  cameraAt(currentTime); scene.updateMatrixWorld(true); renderer.render(scene, camera);
}
function setVariant(id) { window.__bfTrace?.add(673);
  if (id !== '572' && id !== '571') throw new RangeError('Expected variant "572" or "571"');
  activeVariant = id; seek(currentTime);
}
function cameraState() { window.__bfTrace?.add(677);
  return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
}
function transformState(obj, recurse = true) { window.__bfTrace?.add(680);
  const state = { name: obj.name, type: obj.type, position: obj.position.toArray(), quaternion: obj.quaternion.toArray(), scale: obj.scale.toArray(), visible: obj.visible, castShadow: obj.castShadow, receiveShadow: obj.receiveShadow, renderOrder: obj.renderOrder };
  if (obj.geometry) state.geometry = obj.geometry.uuid;
  if (obj.material) state.material = Array.isArray(obj.material) ? obj.material.map(m => m.uuid) : obj.material.uuid;
  if (obj.isInstancedMesh) state.instanceMatrix = Array.from(obj.instanceMatrix.array);
  if (recurse && obj.children.length) state.children = obj.children.map(child => transformState(child));
  return state;
}
function definitions(root) { window.__bfTrace?.add(688);
  const geometries = {}, mats = {}, textures = {};
  root.traverse(obj => {
    if (obj.geometry && !geometries[obj.geometry.uuid]) geometries[obj.geometry.uuid] = obj.geometry.toJSON();
    for (const m of obj.material ? (Array.isArray(obj.material) ? obj.material : [obj.material]) : []) {
      if (mats[m.uuid]) continue;
      const json = m.toJSON(); delete json.images; delete json.textures; mats[m.uuid] = json;
      if (m.map) textures[m.map.uuid] = { ...m.map.userData, wrapS: m.map.wrapS, wrapT: m.map.wrapT, colorSpace: m.map.colorSpace, repeat: m.map.repeat.toArray(), offset: m.map.offset.toArray() };
    }
  });
  return { geometries, materials: mats, textures };
}
const sharedDefinitions = definitions(world), rigDefinitions = { '572': definitions(rigs['572'].group), '571': definitions(rigs['571'].group) };
function lightState(light) { window.__bfTrace?.add(701);
  return { ...transformState(light), color: light.color.toArray(), intensity: light.intensity, groundColor: light.groundColor?.toArray(), shadow: light.shadow ? { bias: light.shadow.bias, normalBias: light.shadow.normalBias, radius: light.shadow.radius, mapSize: light.shadow.mapSize.toArray(), camera: light.shadow.camera.toJSON() } : null };
}
window.reconstruction = {
  pause() {},
  seek,
  setVariant,
  getCameraState: cameraState,
  getNavigationState: () => structuredClone(navigation),
  getInvariantState: () => ({
    navigation: structuredClone(navigation), camera: { ...cameraState(), near: camera.near, far: camera.far, aspect: camera.aspect, zoom: camera.zoom, up: camera.up.toArray() },
    sharedWorld: transformState(world), definitions: sharedDefinitions,
    lights: [lightState(hemi), lightState(sun)], lightTarget: transformState(sun.target),
    renderer: { toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, outputColorSpace: renderer.outputColorSpace, shadows: renderer.shadowMap.type },
    fog: { color: scene.fog.color.toArray(), near: scene.fog.near, far: scene.fog.far },
    environment: { name: scene.environment.name, ...scene.environment.userData }
  }),
  getEditedObjectState: () => ({
    variant: activeVariant, embodiment: rigs[activeVariant].kind,
    root: transformState(robotRig, false), rig: transformState(rigs[activeVariant].group),
    definitions: rigDefinitions[activeVariant], localJoints: structuredClone(rigs[activeVariant].feet),
    animatedMaterials: rigs[activeVariant].legs.map(leg => ({ name: leg.contactShadow.material.name, opacity: leg.contactShadow.material.opacity }))
  }),
  getContactState: () => rigs[activeVariant].feet.map(foot => ({
    ...structuredClone(foot), surfaceHeight: surfaceHeight(foot.worldTarget[0], foot.worldTarget[2])
  })),
  getRigBounds: () => {
    const bounds = new THREE.Box3().setFromObject(rigs[activeVariant].group);
    return { min: bounds.min.toArray(), max: bounds.max.toArray() };
  },
  metadata: { width: WIDTH, height: HEIGHT, fps: FPS, frames: FRAMES, duration },
};
seek(0);
