import * as THREE from './vendor/three.module.js';

const W = 1280, H = 720, DURATION = 8;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = (a, b, t) => { const u = clamp((t - a) / (b - a)); return u * u * (3 - 2 * u); };
const lerp = THREE.MathUtils.lerp;
const v = (x, y, z) => new THREE.Vector3(x, y, z);
let seed = 93017;
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const canvas = document.querySelector('#proxy');
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, preserveDrawingBuffer: true, alpha: false});
renderer.setSize(W, H, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b7c8c5');
scene.fog = new THREE.FogExp2('#acbebb', 0.024);
const camera = new THREE.PerspectiveCamera(40, W / H, 0.025, 130);
scene.add(new THREE.HemisphereLight('#dce9ed', '#5c5940', 2));
const sun = new THREE.DirectionalLight('#ffddb2', 2.6);
sun.position.set(8, 8, -7);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, {left: -8, right: 8, top: 8, bottom: -8, near: 0.2, far: 32});
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.02;
sun.target.position.set(-1, 0, 0);
scene.add(sun, sun.target);
const fill = new THREE.DirectionalLight('#c1d9de', 1.1);
fill.position.set(1, 5, 7); scene.add(fill);
const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({color, roughness: 0.83, ...extra});
const palette = {
  olive: mat('#484d32'), seam: mat('#333a28'), oliveLight: mat('#555a3d'),
  pants: mat('#555446'), boots: mat('#302e29'), skin: mat('#b78359', {roughness: 0.77}),
  cork: mat('#9b784e'), carbon: mat('#202a27', {roughness: 0.39, metalness: 0.24}),
  steel: mat('#657473', {metalness: 0.6, roughness: 0.3}),
  stool: mat('#353f35'), fish: mat('#a9b7b7', {metalness: 0.53, roughness: 0.28}),
  fishDark: mat('#4d686c', {metalness: 0.28, roughness: 0.35}),
  fin: mat('#738581', {side: THREE.DoubleSide, transparent: true, opacity: 0.96, roughness: 0.48}),
  eye: mat('#091716', {roughness: 0.18}),
};
const sphereGeometry = new THREE.SphereGeometry(1, 24, 16);
function mesh(geometry, material, position, scale, parent = scene) {
  const m = new THREE.Mesh(geometry, material);
  if (position) m.position.copy(position);
  if (scale) m.scale.copy(scale);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
const ellipsoid = (material, position, scale, parent = scene) => mesh(sphereGeometry, material, position, scale, parent);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);
function segment(material, radius, parent = scene) {
  const m = mesh(cylinderGeometry, material, null, v(radius, 1, radius), parent);
  m.userData.radius = radius;
  return m;
}
function connect(m, a, b, radius = m.userData.radius) {
  m.position.copy(a).add(b).multiplyScalar(0.5);
  const delta = b.clone().sub(a);
  m.scale.set(radius, delta.length(), radius);
  m.quaternion.setFromUnitVectors(v(0, 1, 0), delta.normalize());
}
function tube(points, radius, material, parent = scene) {
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(16, points.length * 2), radius, 7, false), material, null, null, parent);
}
const sky = mesh(new THREE.SphereGeometry(95, 48, 32), new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false,
  vertexShader: 'varying vec3 p; void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
  fragmentShader: `varying vec3 p; void main(){
    vec3 d=normalize(p); float h=smoothstep(-.06,.55,d.y);
    vec3 col=mix(vec3(.81,.80,.68),vec3(.37,.56,.64),h);
    float s=pow(max(0.,dot(d,normalize(vec3(.7,.15,-.65)))),24.);
    col+=vec3(.22,.115,.025)*s;gl_FragColor=vec4(col,1.);
  }`,
}), v(0, 0, 0));
sky.castShadow = sky.receiveShadow = false;

const waterMaterial = new THREE.ShaderMaterial({
  uniforms: {time: {value: 0}},
  vertexShader: `varying vec3 w; void main(){ vec4 wp=modelMatrix*vec4(position,1.);w=wp.xyz;gl_Position=projectionMatrix*viewMatrix*wp;}`,
  fragmentShader: `
  uniform float time; varying vec3 w;
  float wave(vec2 p){return sin(p.x*13.+p.y*8.+time*1.45)*.0018+
    sin(p.y*23.-p.x*7.-time*.9)*.0011+sin(p.x*4.+p.y*5.+time*.5)*.003;}
  void main(){
    float eps=.02;float h=wave(w.xz);
    vec3 n=normalize(vec3((h-wave(w.xz+vec2(eps,0.)))/eps,1.,(h-wave(w.xz+vec2(0.,eps)))/eps));
    vec3 eye=normalize(cameraPosition-w), refl=reflect(-eye,n);
    float fres=pow(1.-max(.0,dot(n,eye)),3.);
    vec3 col=mix(vec3(.155,.245,.218),vec3(.49,.61,.60),.3+.66*fres);
    float trees=sin(refl.x*42.)*.14+sin(refl.x*97.)*.08;
    float treeMask=(1.-smoothstep(.05,.19+trees*.18,refl.y))*smoothstep(-.15,.01,refl.y);
    col=mix(col,vec3(.175,.246,.206),treeMask*.5);
    float glint=pow(max(0.,dot(refl,normalize(vec3(-.48,.20,-.85)))),75.);
    col+=vec3(.8,.59,.29)*glint*.48;
    float nearBank=1.-smoothstep(-1.8,-.8,w.x);
    col=mix(col,vec3(.20,.235,.163),nearBank*.42);
    col+=.004*sin(w.z*51.+sin(w.x*7.)*3.+time*.8)*fres;
    float fog=1.-exp(-length(cameraPosition-w)*.027);
    gl_FragColor=vec4(mix(col*.66,vec3(.47,.56,.54),fog),1.);
  }`,
});
const water = mesh(new THREE.PlaneGeometry(100, 100), waterMaterial, v(10, 0, -15));
water.rotation.x = -Math.PI / 2;
water.castShadow = water.receiveShadow = false;
function shoreEdge(z) { return -1.62 + .12 * Math.sin(z * .7) + .09 * Math.sin(z * 2.1); }
function groundHeight(x, z) {
  const away = clamp((shoreEdge(z) - x) / 1.4);
  return .035 + away * .18 + .013 * Math.sin(x * 12 + z * 4) + .008 * Math.sin(z * 17);
}
const groundPositions = [], groundIndices = [], groundColors = [];
for (let j = 0; j <= 100; j++) {
  const z = -24 + j * .48;
  for (let i = 0; i <= 30; i++) {
    const x = lerp(-12, shoreEdge(z), i / 30), y = groundHeight(x, z);
    groundPositions.push(x, y, z);
    const c = new THREE.Color().setHSL(.092 + random() * .025, .20 + random() * .14, .085 + random() * .06);
    groundColors.push(c.r, c.g, c.b);
    if (i < 30 && j < 100) {
      const a = j * 31 + i;
      groundIndices.push(a, a + 31, a + 1, a + 1, a + 31, a + 32);
    }
  }
}
const groundGeometry = new THREE.BufferGeometry();
groundGeometry.setAttribute('position', new THREE.Float32BufferAttribute(groundPositions, 3));
groundGeometry.setAttribute('color', new THREE.Float32BufferAttribute(groundColors, 3));
groundGeometry.setIndex(groundIndices);
groundGeometry.computeVertexNormals();
mesh(groundGeometry, mat('#ffffff', {vertexColors: true}));
const pebbleGeometry = new THREE.IcosahedronGeometry(1, 1);
const pebbleCount = 430, pebbles = new THREE.InstancedMesh(pebbleGeometry, mat('#6c6a58'), pebbleCount);
const dummy = new THREE.Object3D();
for (let i = 0; i < pebbleCount; i++) {
  const z = random() * 15 - 7.5, x = shoreEdge(z) - random() * 2.8, s = .013 + random() * .045;
  dummy.position.set(x, groundHeight(x, z), z); dummy.scale.set(s * 1.7, s * .55, s);
  dummy.rotation.set(random(), random() * 6, random()); dummy.updateMatrix();
  pebbles.setMatrixAt(i, dummy.matrix);
  pebbles.setColorAt(i, new THREE.Color().setHSL(.105, .08 + random() * .16, .2 + random() * .13));
}
pebbles.castShadow = pebbles.receiveShadow = true; scene.add(pebbles);
const bladeGeometry = new THREE.ConeGeometry(1, 1, 3);
const grass = new THREE.InstancedMesh(bladeGeometry, mat('#656849', {side: THREE.DoubleSide}), 1600);
for (let i = 0; i < 1600; i++) {
  const z = random() * 18 - 9, x = shoreEdge(z) - .12 - random() * 3.5;
  const h = .06 + random() * .24;
  dummy.position.set(x, groundHeight(x, z) + h / 2, z);
  dummy.scale.set(.006 + random() * .008, h, .008);
  dummy.rotation.set((random() - .5) * .7, random() * 6, (random() - .5) * .7);
  dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix);
  grass.setColorAt(i, new THREE.Color().setHSL(.14 + random() * .08, .2 + random() * .23, .19 + random() * .14));
}
grass.castShadow = true; scene.add(grass);
const treeTrunk = mat('#555346');
const treeCount = 58, leavesPerTree = 105;
const leaves = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), mat('#ffffff', {roughness: 1}), treeCount * leavesPerTree);
let leafIndex = 0;
function tree(x, z, size, distant = false) {
  const y = .12;
  const trunk = segment(treeTrunk, size * .027);
  connect(trunk, v(x, y, z), v(x + size * .035, y + size * .7, z));
  for (let k = 0; k < 4; k++) {
    const a = k * 2.4, branch = segment(treeTrunk, size * .009);
    connect(branch, v(x, y + size * .35, z), v(x + Math.cos(a) * size * .25, y + size * .68, z + Math.sin(a) * size * .25));
  }
  for (let k = 0; k < leavesPerTree; k++) {
    const a = random() * Math.PI * 2, h = random() * 2 - 1;
    const r = Math.sqrt(1 - h * h) * Math.pow(random(), .3), leafSize = size * (.065 + random() * .055);
    dummy.position.set(x + Math.cos(a) * r * size * .37, y + size * (.65 + h * .32), z + Math.sin(a) * r * size * .35);
    dummy.scale.set(leafSize * 1.25, leafSize, leafSize);
    dummy.rotation.set(random() * 3, random() * 3, random() * 3); dummy.updateMatrix();
    leaves.setMatrixAt(leafIndex, dummy.matrix);
    leaves.setColorAt(leafIndex, new THREE.Color().setHSL(.19 + random() * .06, .18 + random() * .2, (distant ? .16 : .11) + random() * .08));
    leafIndex++;
  }
}
for (let i = 0; i < 46; i++) tree(-20 + i * 1.7, -25.5 - random() * 7, 2.1 + random() * 2.1, true);
for (let i = 0; i < 12; i++) tree(-6.5 - random() * 5, -17 + random() * 12, 2.2 + random() * 1.7);
leaves.castShadow = leaves.receiveShadow = true; scene.add(leaves);
const farBank = mesh(new THREE.PlaneGeometry(120, 25), mat('#3e4939'), v(12, .055, -37.5));
farBank.rotation.x = -Math.PI / 2;
const mist = mesh(new THREE.PlaneGeometry(100, 2.1), new THREE.ShaderMaterial({
  transparent: true, depthWrite: false, side: THREE.DoubleSide,
  vertexShader: 'varying vec2 uv0;void main(){uv0=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader: 'varying vec2 uv0;void main(){float a=pow(sin(uv0.y*3.141593),3.);gl_FragColor=vec4(.73,.78,.71,a*.18);}',
}), v(10, .6, -23));
mist.castShadow = mist.receiveShadow = false;

const stoolCenter = v(-2.52, .57, 0);
mesh(new THREE.BoxGeometry(.42, .05, .41), palette.stool, stoolCenter);
for (const z of [-.17, .17]) {
  for (const sign of [-1, 1]) {
    const bar = segment(palette.carbon, .017);
    connect(bar, v(-2.52 - sign * .2, .22, z), v(-2.52 + sign * .18, .55, z));
  }
}
const angler = new THREE.Group(); scene.add(angler);
const torsoGeometry = new THREE.LatheGeometry([
  new THREE.Vector2(.135, 0), new THREE.Vector2(.19, .07),
  new THREE.Vector2(.192, .27), new THREE.Vector2(.225, .47),
  new THREE.Vector2(.15, .52), new THREE.Vector2(.105, .55),
], 32);
const torso = mesh(torsoGeometry, palette.olive, null, v(1, 1, .85), angler);
const hips = ellipsoid(palette.pants, v(-2.49, .72, 0), v(.215, .15, .22), angler);
const head = new THREE.Group(); angler.add(head);
ellipsoid(palette.skin, v(0, 0, 0), v(.104, .143, .092), head);
ellipsoid(palette.skin, v(.078, -.014, 0), v(.027, .047, .061), head);
ellipsoid(palette.skin, v(.107, .027, 0), v(.019, .025, .017), head);
for (const side of [-1, 1]) {
  ellipsoid(palette.skin, v(-.014, 0, side * .091), v(.022, .035, .014), head);
  ellipsoid(palette.eye, v(.09, .055, side * .056), v(.01, .008, .005), head);
  const brow = segment(palette.seam, .006, head);
  connect(brow, v(.082, .072, side * .073), v(.102, .071, side * .04));
}
ellipsoid(palette.olive, v(-.012, .095, 0), v(.115, .09, .102), head);
const brim = ellipsoid(palette.olive, v(.091, .086, 0), v(.123, .012, .104), head);
const neck = segment(palette.skin, .059, angler);
const collar = new THREE.Group(); angler.add(collar);
ellipsoid(palette.oliveLight, v(0, 0, 0), v(.12, .062, .14), collar);
const zipper = segment(palette.seam, .006, angler);
const pockets = [-1, 1].map(side => mesh(new THREE.BoxGeometry(.025, .135, .13), palette.oliveLight, null, null, angler));
const legs = [];
for (const side of [-1, 1]) {
  const hip = v(-2.47, .72, side * .15), knee = v(-2.0, .65, side * .175), ankle = v(-1.99, .27, side * .19);
  const thigh = segment(palette.pants, .105, angler), shin = segment(palette.pants, .085, angler);
  connect(thigh, hip, knee); connect(shin, knee, ankle);
  ellipsoid(palette.pants, knee, v(.105, .11, .105), angler);
  ellipsoid(palette.boots, v(-1.895, .245, side * .19), v(.18, .084, .095), angler);
  const sole = mesh(new THREE.BoxGeometry(.31, .023, .17), palette.boots, v(-1.9, .192, side * .19), null, angler);
  legs.push({hip: hip.toArray(), knee: knee.toArray(), ankle: ankle.toArray()});
}
const arms = [-1, 1].map(side => ({
  side,
  upper: segment(palette.olive, .078, angler),
  fore: segment(palette.oliveLight, .064, angler),
  elbow: ellipsoid(palette.olive, null, v(.077, .075, .075), angler),
  cuff: segment(palette.seam, .059, angler),
}));
function makeHand(side) {
  const group = new THREE.Group(); scene.add(group);
  ellipsoid(palette.skin, v(.018, 0, side * .021), v(.025, .051, .024), group);
  for (let i = 0; i < 4; i++) {
    const yy = -.032 + i * .019;
    const pts = [];
    for (let j = 0; j <= 10; j++) {
      const a = -.4 + j / 10 * 4.7;
      pts.push(v(Math.cos(a) * .028, yy, Math.sin(a) * .028));
    }
    tube(pts, .008, palette.skin, group);
  }
  tube([v(.025, .043, side * .028), v(.003, .061, side * .027), v(-.019, .052, side * .012)], .011, palette.skin, group);
  return group;
}
const hands = [makeHand(-1), makeHand(1)];
const rodSegments = 96, rodSides = 8, rodLength = 2.34;
const rodGeometry = new THREE.BufferGeometry();
const rodPositions = new Float32Array((rodSegments + 1) * rodSides * 3);
const rodIndices = [];
for (let i = 0; i < rodSegments; i++) for (let j = 0; j < rodSides; j++) {
  const a = i * rodSides + j, b = i * rodSides + (j + 1) % rodSides;
  rodIndices.push(a, b, a + rodSides, b, b + rodSides, a + rodSides);
}
rodGeometry.setAttribute('position', new THREE.BufferAttribute(rodPositions, 3).setUsage(THREE.DynamicDrawUsage));
rodGeometry.setIndex(rodIndices);
const rod = mesh(rodGeometry, palette.carbon); rod.frustumCulled = false;
const handle = segment(palette.cork, .022);
const butt = segment(palette.carbon, .024);
const reel = new THREE.Group(); scene.add(reel);
const reelStem = segment(palette.carbon, .014, reel);
connect(reelStem, v(0, 0, 0), v(0, -.07, .035));
ellipsoid(palette.carbon, v(0, -.075, .04), v(.045, .045, .034), reel);
const spool = mesh(new THREE.CylinderGeometry(.026, .026, .055, 24), palette.steel, v(.04, -.075, .04), null, reel);
spool.rotation.z = Math.PI / 2;
const reelCrank = segment(palette.steel, .007, reel);
connect(reelCrank, v(0, -.075, .068), v(-.033, -.13, .07));
ellipsoid(palette.carbon, v(-.035, -.13, .07), v(.025, .01, .013), reel);
const guides = Array.from({length: 7}, (_, i) => {
  const ring = mesh(new THREE.TorusGeometry(.019 - i * .0018, .002, 6, 14), palette.steel);
  ring.userData.u = .28 + i * .12;
  return ring;
});
const lineCount = 72;
const lineGeometry = new THREE.BufferGeometry();
const linePositions = new Float32Array((lineCount + 1) * 3);
lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3).setUsage(THREE.DynamicDrawUsage));
const line = new THREE.Line(lineGeometry, new THREE.LineBasicMaterial({color: '#596f60', transparent: true, opacity: .94}));
line.frustumCulled = false; scene.add(line);
const float = new THREE.Group(); scene.add(float);
ellipsoid(mat('#39382b'), v(0, -.067, 0), v(.014, .063, .014), float);
const floatStem = segment(mat('#b9a267'), .0038, float);
connect(floatStem, v(0, -.07, 0), v(0, .173, 0));
const floatRed = segment(mat('#f06438', {roughness: .42}), .0055, float);
connect(floatRed, v(0, .09, 0), v(0, .173, 0));
const floatYellow = segment(mat('#e7dd82'), .0057, float);
connect(floatYellow, v(0, .028, 0), v(0, .083, 0));

const fish = new THREE.Group(); fish.name = 'single-30cm-freshwater-fish'; scene.add(fish);
const bodyRows = 30, bodySides = 24, fishPositions = [], fishIndices = [], fishColors = [];
for (let i = 0; i <= bodyRows; i++) {
  const u = i / bodyRows, x = lerp(-.112, .148, u);
  const shape = Math.pow(Math.sin(Math.PI * u), .76);
  for (let j = 0; j <= bodySides; j++) {
    const a = j / bodySides * Math.PI * 2;
    fishPositions.push(x, Math.cos(a) * .052 * shape, Math.sin(a) * .024 * shape);
    const c = new THREE.Color(Math.cos(a) > .3 ? '#607879' : Math.cos(a) < -.3 ? '#d7d7c6' : '#a3b6b5');
    c.multiplyScalar(.92 + .08 * Math.sin(i * 2 + j * .7) ** 2);
    fishColors.push(c.r, c.g, c.b);
    if (i < bodyRows && j < bodySides) {
      const p = i * (bodySides + 1) + j;
      fishIndices.push(p, p + 1, p + bodySides + 1, p + 1, p + bodySides + 2, p + bodySides + 1);
    }
  }
}
const fishGeometry = new THREE.BufferGeometry();
fishGeometry.setAttribute('position', new THREE.Float32BufferAttribute(fishPositions, 3).setUsage(THREE.DynamicDrawUsage));
fishGeometry.setAttribute('color', new THREE.Float32BufferAttribute(fishColors, 3));
fishGeometry.setIndex(fishIndices); fishGeometry.computeVertexNormals();
mesh(fishGeometry, mat('#ffffff', {vertexColors: true, metalness: .20, roughness: .32}), null, null, fish);
function fin(vertices, parent = fish) {
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute(vertices.flat(), 3));
  geom.setIndex([0, 1, 2]); geom.computeVertexNormals();
  return mesh(geom, palette.fin, null, null, parent);
}
const tail = new THREE.Group(); fish.add(tail); tail.position.x = -.105;
fin([[0, 0, 0], [-.06, .057, 0], [-.047, 0, 0]], tail);
fin([[0, 0, 0], [-.047, 0, 0], [-.06, -.05, 0]], tail);
fin([[-.063, .035, 0], [.026, .056, 0], [-.018, .087, 0]]);
fin([[-.036, -.04, 0], [.01, -.042, 0], [-.055, -.069, 0]]);
for (const side of [-1, 1]) {
  fin([[.045, -.014, side * .018], [-.014, -.059, side * .061], [-.013, -.019, side * .019]]);
  ellipsoid(palette.eye, v(.107, .016, side * .014), v(.007, .008, .0035), fish);
  ellipsoid(mat('#ccb977', {metalness: .5, roughness: .3}), v(.106, .016, side * .016), v(.009, .01, .001), fish);
  ellipsoid(palette.eye, v(.109, .016, side * .017), v(.005, .006, .001), fish);
  tube([v(.077, .027, side * .017), v(.068, 0, side * .023), v(.069, -.024, side * .016)], .0017, palette.fishDark, fish);
}
const mouthLocal = v(.147, -.003, 0);
ellipsoid(palette.fishDark, mouthLocal, v(.003, .006, .007), fish);

function rippleSet(start, origin, speed, duration, count, materialOpacity) {
  return Array.from({length: count}, (_, i) => {
    const geom = new THREE.RingGeometry(.98, 1, 160);
    const material = new THREE.MeshBasicMaterial({color: '#cedaca', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false});
    const m = mesh(geom, material, v(origin.x, .006 + i * .0004, origin.z));
    m.rotation.x = -Math.PI / 2; m.castShadow = m.receiveShadow = false;
    return {m, start: start + i * .115, speed, duration, opacity: materialOpacity, initial: .015 + i * .022};
  });
}
const rippleEvents = [
  ...rippleSet(.0, v(.86, 0, .1), .045, 2, 2, .2),
  ...rippleSet(1.43, v(.86, 0, .1), .14, 1.25, 2, .43),
  ...rippleSet(5.63, v(.86, 0, .1), .3, 1.05, 3, .45),
  ...rippleSet(6.5, v(.7, 0, .1), .57, 2.3, 5, .53),
];
function makeSplash(start, origin, count, landing) {
  const items = [];
  for (let i = 0; i < count; i++) {
    const a = random() * Math.PI * 2, speed = (landing ? .35 : .18) + random() * (landing ? .53 : .36);
    const material = new THREE.MeshStandardMaterial({color: '#dce7de', roughness: .17, metalness: .14, transparent: true, opacity: .78});
    const m = ellipsoid(material, null, v(1, 1, 1));
    m.castShadow = m.receiveShadow = false;
    items.push({m, start: start + random() * .055, origin: origin.clone(),
      velocity: v(Math.cos(a) * speed - (landing ? 0 : .17), .95 + random() * (landing ? 1.1 : .7), Math.sin(a) * speed),
      radius: .0025 + random() * (landing ? .0055 : .0045), landing});
  }
  return items;
}
const droplets = [
  ...makeSplash(5.63, v(.86, .006, .1), 36, false),
  ...makeSplash(6.5, v(.7, .005, .1), 58, true),
];
const crowns = [];
for (let i = 0; i < 17; i++) {
  const a = i / 17 * Math.PI * 2;
  const geom = new THREE.BufferGeometry();
  geom.setAttribute('position', new THREE.Float32BufferAttribute([
    -.018, 0, 0, .018, 0, 0,
    -.012, .45, .03, .012, .45, .03,
    -.005, .82, .058, .005, .82, .058,
    -.001, 1, .087, .001, 1, .087,
  ], 3));
  geom.setIndex([0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4, 4, 5, 6, 5, 7, 6]); geom.computeVertexNormals();
  const m = mesh(geom, new THREE.MeshStandardMaterial({color: '#d9e3d5', transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false}));
  m.castShadow = false; crowns.push({m, a, height: .10 + random() * .16});
}
let state = {};
function pose(t) {
  const lift = smooth(2.12, 2.7, t);
  const taut = smooth(2.4, 2.79, t);
  const bend = smooth(2.72, 3.2, t);
  const fight = smooth(3.3, 4, t) * (Math.sin(t * 5.2) * .012 + Math.sin(t * 9.4) * .005);
  const jumpP = clamp((t - 5.72) / .78);
  let fishY = -.16;
  if (t >= 5.52 && t < 5.72) fishY = lerp(-.16, .025, smooth(5.52, 5.72, t));
  if (t >= 5.72 && t <= 6.5) fishY = .025 + 4 * .405 * jumpP * (1 - jumpP);
  if (t > 6.5) fishY = lerp(.025, -.22, smooth(6.5, 6.71, t));
  fish.position.set(.86 - .16 * jumpP, fishY, .1 + .03 * Math.sin(Math.PI * jumpP));
  const pitch = lerp(.76, -.85, jumpP);
  const xAxis = v(-Math.cos(pitch), Math.sin(pitch), .025).normalize();
  const zAxis = xAxis.clone().cross(v(0, 1, 0)).normalize(), yAxis = zAxis.clone().cross(xAxis).normalize();
  fish.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(xAxis, yAxis, zAxis));
  fish.visible = t >= 5.52 && t < 6.71;
  const flex = .016 * Math.sin((t - 5.72) * 22) * Math.sin(Math.PI * jumpP);
  const bodyAttr = fishGeometry.attributes.position;
  for (let i = 0; i < bodyAttr.count; i++) {
    const xx = fishPositions[i * 3], weight = Math.max(0, (.09 - xx) / .202);
    bodyAttr.array[i * 3] = xx;
    bodyAttr.array[i * 3 + 1] = fishPositions[i * 3 + 1];
    bodyAttr.array[i * 3 + 2] = fishPositions[i * 3 + 2] + flex * weight * weight;
  }
  bodyAttr.needsUpdate = true; fishGeometry.computeVertexNormals();
  tail.position.z = flex * .93; tail.rotation.y = Math.sin((t - 5.72) * 25) * .42 * Math.sin(Math.PI * jumpP);
  fish.updateMatrixWorld(true);
  const mouthWorld = mouthLocal.clone().applyMatrix4(fish.matrixWorld);
  const angle = lerp(.115, .94, lift) + fight;
  const rodBase = v(lerp(-2.16, -2.17, lift), lerp(1.01, 1.30, lift), .005);
  const dir = v(Math.cos(angle), Math.sin(angle), 0);
  const rodBend = bend * (.97 + fight * 1.6 + .045 * Math.sin(jumpP * Math.PI));
  const rodPoints = [rodBase.clone()];
  for (let i = 1; i <= rodSegments; i++) {
    const u = (i - .5) / rodSegments;
    const theta = angle - rodBend * u * u;
    rodPoints.push(rodPoints[i - 1].clone().add(v(Math.cos(theta), Math.sin(theta), 0).multiplyScalar(rodLength / rodSegments)));
  }
  for (let i = 0; i <= rodSegments; i++) {
    const p = rodPoints[i], theta = angle - rodBend * (i / rodSegments) ** 2;
    const normal = v(-Math.sin(theta), Math.cos(theta), 0), radius = lerp(.012, .003, i / rodSegments);
    for (let j = 0; j < rodSides; j++) {
      const a = j / rodSides * Math.PI * 2;
      const off = normal.clone().multiplyScalar(Math.cos(a) * radius).add(v(0, 0, Math.sin(a) * radius));
      p.clone().add(off).toArray(rodPositions, (i * rodSides + j) * 3);
    }
  }
  rodGeometry.attributes.position.needsUpdate = true; rodGeometry.computeVertexNormals();
  connect(handle, rodBase.clone().addScaledVector(dir, -.20), rodBase.clone().addScaledVector(dir, .19));
  connect(butt, rodBase.clone().addScaledVector(dir, -.24), rodBase.clone().addScaledVector(dir, -.20));
  reel.position.copy(rodBase).addScaledVector(dir, -.04); reel.rotation.z = angle;
  const lean = lift * .09;
  torso.position.set(-2.49 - lean, .72, 0);
  torso.rotation.z = lift * .115 - .08;
  head.position.set(-2.44 - lean * 1.6, 1.45, 0);
  head.rotation.z = -.055 + lift * .05;
  connect(neck, v(-2.47 - lean, 1.20, 0), head.position.clone().add(v(0, -.1, 0)));
  collar.position.set(-2.47 - lean, 1.26, 0);
  connect(zipper, v(-2.30 - lean, .81, 0), v(-2.30 - lean * 1.5, 1.21, 0));
  for (let i = 0; i < 2; i++) pockets[i].position.set(-2.292 - lean, .925, (i ? 1 : -1) * .12);
  const grips = [rodBase.clone().addScaledVector(dir, .10), rodBase.clone().addScaledVector(dir, -.07)];
  const handErrors = [];
  arms.forEach((arm, i) => {
    const {side} = arm, grip = grips[i];
    const wrist = grip.clone().add(v(-.018, -.012, side * .038));
    const shoulder = v(-2.47 - lean * 1.6, 1.20, side * .188);
    const toward = wrist.clone().sub(shoulder), distance = toward.length();
    toward.normalize();
    const pole = v(-.15, -1, side * .55);
    pole.addScaledVector(toward, -pole.dot(toward)).normalize();
    const along = (.285 ** 2 - .30 ** 2 + distance ** 2) / (2 * distance);
    const elbow = shoulder.clone().addScaledVector(toward, along).addScaledVector(pole, Math.sqrt(Math.max(0, .285 ** 2 - along ** 2)));
    connect(arm.upper, shoulder, elbow); connect(arm.fore, elbow, wrist);
    arm.elbow.position.copy(elbow);
    connect(arm.cuff, wrist.clone().lerp(elbow, .13), wrist);
    hands[i].position.copy(grip);
    hands[i].quaternion.setFromUnitVectors(v(0, 1, 0), dir);
    handErrors.push(hands[i].position.distanceTo(grip));
  });
  for (const ring of guides) {
    const index = Math.round(ring.userData.u * rodSegments);
    const theta = angle - rodBend * ring.userData.u ** 2;
    ring.position.copy(rodPoints[index]).add(v(Math.sin(theta) * .012, -Math.cos(theta) * .012, 0));
    ring.quaternion.setFromUnitVectors(v(0, 0, 1), v(Math.cos(theta), Math.sin(theta), 0));
  }
  const floatSink = smooth(1.10, 1.74, t);
  const twitch = t >= .78 && t <= 1.08 ? Math.sin((t - .78) / .30 * Math.PI * 4) * .065 * Math.sin((t - .78) / .30 * Math.PI) : 0;
  float.position.set(.86 + twitch * .017, .008 + (1 - floatSink) * Math.sin(t * 5) * .003 - .24 * floatSink, .1);
  float.rotation.z = twitch;
  const rodTip = rodPoints.at(-1);
  let endpoint = v(.86, .012, .1);
  if (t >= 5.52) {
    if (mouthWorld.y >= .012) endpoint.copy(mouthWorld);
    else endpoint.copy(rodTip).lerp(mouthWorld, (rodTip.y - .012) / (rodTip.y - mouthWorld.y));
  } else if (t < 1.74) endpoint.set(.86, Math.max(.012, float.position.y + .028), .1);
  const slackSag = .26 * (1 - taut);
  for (let i = 0; i <= lineCount; i++) {
    const u = i / lineCount, p = rodTip.clone().lerp(endpoint, u);
    p.y -= Math.sin(Math.PI * u) * slackSag;
    p.toArray(linePositions, i * 3);
  }
  lineGeometry.attributes.position.needsUpdate = true;
  for (const r of rippleEvents) {
    const age = t - r.start;
    r.m.visible = age >= 0 && age < r.duration;
    const radius = r.initial + Math.max(0, age) * r.speed;
    r.m.scale.setScalar(radius);
    r.m.material.opacity = r.opacity * (1 - clamp(age / r.duration)) * smooth(0, .09, age);
  }
  for (const d of droplets) {
    const age = t - d.start;
    const y = d.origin.y + d.velocity.y * age - 2.5 * age * age;
    d.m.visible = age >= 0 && age < .9 && y > .006;
    d.m.position.copy(d.origin).addScaledVector(d.velocity, age);
    d.m.position.y = y;
    d.m.scale.set(d.radius, d.radius * (1.5 + Math.abs(d.velocity.y - 5 * age) * .35), d.radius);
    d.m.material.opacity = .83 * (1 - clamp(age / .9) * .35);
  }
  for (const c of crowns) {
    const age = t - 6.5, envelope = Math.sin(clamp(age / .48) * Math.PI);
    const radius = .045 + Math.max(0, age) * .30;
    c.m.visible = age >= 0 && age < .48;
    c.m.position.set(.7 + Math.cos(c.a) * radius, .004, .1 + Math.sin(c.a) * radius);
    c.m.rotation.y = -c.a;
    c.m.scale.set(1, c.height * envelope, 1);
    c.m.material.opacity = envelope * .55;
  }
  waterMaterial.uniforms.time.value = t;
  let cameraPhase;
  if (t < 2) {
    cameraPhase = 'float-close';
    camera.position.set(2.1 - t * .012, .31, 1.05);
    camera.lookAt(.44, .185, -.15); camera.fov = 43;
  } else {
    const mediumPosition = v(.15, 1.75, 4.85), mediumTarget = v(-.7, 1.43, .05);
    const fishPosition = v(1.53, .97, 2.65), fishTarget = v(.64, .25, .1);
    if (t < 4) {
      cameraPhase = 'side-medium'; camera.position.copy(mediumPosition);
      camera.lookAt(mediumTarget); camera.fov = 42;
    } else if (t < 6.55) {
      cameraPhase = 'line-follow-fish';
      const k = smooth(4, 5.05, t);
      camera.position.copy(mediumPosition).lerp(fishPosition, k);
      camera.lookAt(mediumTarget.clone().lerp(fishTarget, k)); camera.fov = lerp(42, 36, k);
    } else {
      cameraPhase = 'continuing-fight-wide';
      const k = smooth(6.55, 7.87, t);
      camera.position.copy(fishPosition).lerp(v(.45, 1.8, 5.25), k);
      camera.lookAt(fishTarget.clone().lerp(v(-.63, 1.28, .03), k)); camera.fov = lerp(36, 38, k);
    }
  }
  camera.updateProjectionMatrix(); camera.updateMatrixWorld(true);
  scene.updateMatrixWorld(true);
  const project = point => { const p = point.clone().project(camera); return [(p.x + 1) * W / 2, (1 - p.y) * H / 2, p.z]; };
  state = {
    time: t, cameraPhase, lift, lineTaut: taut, rodBendRadians: rodBend, slackSagMeters: slackSag,
    floatPosition: float.position.toArray(), floatTipY: float.position.y + .173,
    fishCount: 1, fishVisible: fish.visible, fishLengthMeters: .313,
    fishPosition: fish.position.toArray(), fishMouth: mouthWorld.toArray(),
    fishPitch: pitch, fishFlex: flex,
    rodBase: rodBase.toArray(), rodTip: rodTip.toArray(), lineStart: Array.from(linePositions.slice(0, 3)),
    lineEnd: Array.from(linePositions.slice(-3)), lineEndpoint: endpoint.toArray(),
    lineStartError: v(...linePositions.slice(0, 3)).distanceTo(rodTip),
    lineEndError: v(...linePositions.slice(-3)).distanceTo(endpoint),
    rodLengthMeters: rodPoints.slice(1).reduce((sum, p, i) => sum + p.distanceTo(rodPoints[i]), 0),
    handGripErrors: handErrors, handGrips: grips.map(g => g.toArray()), legs,
    screen: {hands: grips.map(project), rod: rodPoints.map(project), fish: project(fish.position),
      lineEndpoint: project(endpoint), head: project(head.position), float: project(float.position)},
    splashDropletsVisible: droplets.filter(d => d.m.visible).length,
    landingCrownVisible: crowns.filter(c => c.m.visible).length,
    rippleRadii: rippleEvents.filter(r => r.m.visible).map(r => ({start: r.start, radius: r.m.scale.x})),
    camera: {position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov},
  };
}
const gl = renderer.getContext();
const debug = gl.getExtension('WEBGL_debug_renderer_info');
const device = {
  renderer: debug ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
  vendor: debug ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
  version: gl.getParameter(gl.VERSION),
  threeRevision: THREE.REVISION,
};
const pixels = new Uint8Array(W * H * 4);
// Explicit supersampling avoids nondeterministic half-float MSAA transparency resolves.
const sceneTarget = new THREE.WebGLRenderTarget(W * 2, H * 2, {type: THREE.HalfFloatType, samples: 0});
sceneTarget.depthTexture = new THREE.DepthTexture(W * 2, H * 2, THREE.UnsignedIntType);
const postScene = new THREE.Scene(), postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
const postMaterial = new THREE.ShaderMaterial({
  depthTest: false, depthWrite: false,
  uniforms: {image: {value: sceneTarget.texture}, depth: {value: sceneTarget.depthTexture},
    focus: {value: 1.7}, blur: {value: 0}, resolution: {value: new THREE.Vector2(W, H)}},
  vertexShader: 'varying vec2 uv0;void main(){uv0=uv;gl_Position=vec4(position.xy,0.,1.);}',
  fragmentShader: `
    uniform sampler2D image; uniform sampler2D depth;
    uniform float focus,blur; uniform vec2 resolution; varying vec2 uv0;
    void main(){
      float raw=texture2D(depth,uv0).x;
      float z=(.025*130.)/(130.-raw*(130.-.025));
      float coc=clamp(abs(z-focus)*2.7,0.,7.)*blur;
      vec4 color=texture2D(image,uv0); float weight=1.;
      for(int i=0;i<16;i++){
        float a=float(i)*2.399963, r=sqrt((float(i)+.5)/16.);
        vec2 offset=vec2(cos(a),sin(a))*coc*r/resolution;
        color+=texture2D(image,uv0+offset);weight+=1.;
      }
      gl_FragColor=color/weight;
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
});
postScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), postMaterial));
function seek(t) {
  pose(clamp(Number(t), 0, DURATION));
  postMaterial.uniforms.focus.value = -v(.86, .08, .1).applyMatrix4(camera.matrixWorldInverse).z;
  postMaterial.uniforms.blur.value = state.time < 2 ? 1 : 0;
  renderer.setRenderTarget(sceneTarget); renderer.render(scene, camera);
  renderer.setRenderTarget(null); renderer.render(postScene, postCamera);
  return state;
}
window.reconstruction = {
  ready: true, pause() {}, seek,
  diagnostics() { return {...state, renderer: device}; },
  async streamFrame(index) {
    gl.readPixels(0, 0, W, H, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    const response = await fetch(`/__frame?index=${index}`, {method: 'POST', body: pixels});
    if (!response.ok) throw new Error(`Frame transport rejected ${index}: ${await response.text()}`);
  },
};
seek(0);

// Workbench capture adapter; the published original is unchanged.
const __pageRender = renderer.render.bind(renderer);
renderer.render = (s,c) => { if (!window.__bfSampling) return __pageRender(s,c); };
window.__bfCapture = {THREE: THREE, renderer, scene, camera};
