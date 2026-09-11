import * as THREE from '../vendor/three.module.js';

const WIDTH = 960, HEIGHT = 540, DURATION = 124 / 24;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#eef2f1');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(58, WIDTH / HEIGHT, 0.05, 70);
const world = new THREE.Group();
world.name = 'invariant-gallery';
scene.add(world);
let seed = 581;
function random() {
  seed = (1664525 * seed + 1013904223) >>> 0;
  return seed / 4294967296;
}
function material(color, roughness = 0.65, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}
function noisyMaterial(color, roughness, metalness, scale = 6, strength = 0.18) {
  const m = material(color, roughness, metalness);
  m.userData.procedural = { scale, strength, type: 'object-space-multiscale-grain' };
  m.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 grainPosition;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ngrainPosition = position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
varying vec3 grainPosition;
float grainHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
float grainNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
return mix(mix(mix(grainHash(i),grainHash(i+vec3(1,0,0)),f.x),mix(grainHash(i+vec3(0,1,0)),grainHash(i+vec3(1,1,0)),f.x),f.y),
mix(mix(grainHash(i+vec3(0,0,1)),grainHash(i+vec3(1,0,1)),f.x),mix(grainHash(i+vec3(0,1,1)),grainHash(i+vec3(1,1,1)),f.x),f.y),f.z);}`)
      .replace('#include <color_fragment>', `#include <color_fragment>
float g=grainNoise(grainPosition*${scale.toFixed(2)});
float fine=grainNoise(grainPosition*${(scale * 27).toFixed(2)});
diffuseColor.rgb*=1.+${strength.toFixed(3)}*(g*1.5+fine*.5-1.);
diffuseColor.rgb*=1.-step(.88,fine)*.16;`);
  };
  m.customProgramCacheKey = () => JSON.stringify(m.userData.procedural);
  return m;
}
const white = material('#f6f5f1', 0.82);
const ceilingMat = material('#eeefea', 0.78);
const concrete = noisyMaterial('#777973', 0.79, 0, 22, 0.20);
const black = material('#161c1b', 0.46, 0.4);
const steel = material('#a2adac', 0.4, 0.45);
const rust = noisyMaterial('#503624', 0.72, 0.18, 9, 0.45);
const rustEdge = noisyMaterial('#856549', 0.62, 0.22, 30, 0.3);
const yellow = material('#e7ac09', 0.32, 0.3);
const rubber = material('#151b1c', 0.9);
const stone = noisyMaterial('#b8aa91', 0.94, 0, 65, 0.35);
const darkBronze = noisyMaterial('#393a35', 0.58, 0.12, 32, 0.45);

function mesh(parent, geo, mat, name, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(geo, mat);
  m.name = name;
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  parent.add(m);
  return m;
}
function box(parent, name, size, pos, mat = white) {
  return mesh(parent, new THREE.BoxGeometry(...size), mat, name, ...pos);
}
function sphere(parent, name, pos, scale, mat, detail = 20) {
  const m = mesh(parent, new THREE.SphereGeometry(1, detail, 12), mat, name, ...pos);
  m.scale.set(...scale);
  return m;
}
function rod(parent, name, a, b, radius, mat, sides = 10) {
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const m = mesh(parent, new THREE.CylinderGeometry(radius, radius, va.distanceTo(vb), sides), mat, name);
  m.position.copy(va).add(vb).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize());
  return m;
}
function tube(parent, name, points, radius, mat, closed = false) {
  return mesh(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed), 40, radius, 7, closed), mat, name);
}
function labelTexture(text, bg, fg, w = 256, h = 96) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = fg; ctx.font = `bold ${Math.round(h * 0.52)}px sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(text, w / 2, h / 2);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function sign(parent, name, text, pos, size, bg, fg) {
  const mat = new THREE.MeshBasicMaterial({ map: labelTexture(text, bg, fg) });
  return mesh(parent, new THREE.PlaneGeometry(...size), mat, name, ...pos);
}

// Architecture uses real wall openings; the floor reflection contains only scene geometry.
const floor = mesh(world, new THREE.PlaneGeometry(12, 18), noisyMaterial('#7b7b73', 0.49, 0.04, 2.5, 0.16), 'polished-concrete', 0, 0, 0.5);
floor.rotation.x = -Math.PI / 2;
box(world, 'left-wall', [0.18, 4.9, 17], [-6, 2.45, 0.5]);
box(world, 'right-wall-front', [0.18, 4.9, 3.5], [6, 2.45, 7.25]);
box(world, 'right-wall-rear', [0.18, 4.9, 9.2], [6, 2.45, -3.4]);
box(world, 'right-window-header', [0.18, 1, 4.3], [6, 4.4, 3.35]);
box(world, 'rear-left-wall', [4.65, 4.9, 0.18], [-3.675, 2.45, -8]);
box(world, 'rear-right-wall', [4.65, 4.9, 0.18], [3.675, 2.45, -8]);
box(world, 'rear-left-partition', [4.5, 4.1, .16], [-3.75, 2.05, -6.75]);
box(world, 'exit-header', [2.7, 1.4, 0.2], [0, 4.2, -8]);
box(world, 'ceiling', [12, 0.12, 17], [0, 4.96, 0.5], material('#858e8b'));
for (let z = -7.5; z < 9; z += 1.55) {
  box(world, `roof-cross-beam-${z}`, [12, 0.20, 0.09], [0, 4.64, z], ceilingMat);
}
for (let x = -5.7; x < 6; x += 1.45) {
  box(world, `roof-longitudinal-${x}`, [0.085, 0.22, 17], [x, 4.67, 0.5], ceilingMat);
}
for (let z = -7.9; z < 9; z += 0.27) {
  box(world, `roof-corrugation-${z.toFixed(2)}`, [12, 0.06, 0.025], [0, 4.85, z], ceilingMat);
}
for (const x of [0.5, 2.6]) {
  rod(world, 'white-ventilation-duct', [x, 4.45, -8], [x, 4.45, 9], 0.20, ceilingMat, 24);
  for (let z = -7.8; z < 9; z += 0.22) {
    const ring = mesh(world, new THREE.TorusGeometry(0.202, 0.009, 4, 24), white, 'duct-rib', x, 4.45, z);
    ring.rotation.y = 0;
  }
}
for (const x of [-3.8, -0.1, 3.9]) {
  box(world, 'lighting-track', [0.037, 0.045, 16], [x, 4.36, 0.1], steel);
  for (let z = -6.7; z <= 7; z += 2.3) {
    rod(world, 'lamp-hanger', [x, 4.36, z], [x, 4.15, z], 0.025, white);
    const body = mesh(world, new THREE.CylinderGeometry(0.075, 0.075, 0.22, 14), white, 'track-light', x, 4.09, z);
    body.rotation.z = x > 0 ? -0.38 : 0.38;
    const bulb = mesh(body, new THREE.CircleGeometry(0.06, 16), new THREE.MeshBasicMaterial({ color: '#fff5df' }), 'lamp-lens', 0, -0.112, 0);
    bulb.rotation.x = Math.PI / 2;
  }
}
const dayMat = new THREE.MeshBasicMaterial({ color: '#e7faff' });
box(world, 'daylight-through-side-opening', [0.1, 3.85, 4.1], [6.07, 1.93, 3.35], dayMat);
for (const z of [1.3, 3.3, 5.4]) box(world, 'window-mullion', [0.1, 3.9, 0.045], [5.97, 1.95, z], steel);
box(world, 'window-bottom-rail', [0.08, 0.045, 4.15], [5.95, 0.06, 3.35], steel);
box(world, 'exit-daylight', [2.65, 3.48, 0.05], [0, 1.74, -8.1], dayMat);
for (const x of [-1.34, -0.88, 0, 0.88, 1.34]) box(world, 'exit-upright', [0.045, 3.5, 0.10], [x, 1.75, -7.95], steel);
for (const y of [0.08, 0.58, 2.45, 3.48]) box(world, 'exit-crossbar', [2.72, 0.046, 0.09], [0, y, -7.94], steel);
for (const x of [-0.43, 0.43]) {
  box(world, 'exit-push-bar', [0.73, 0.037, 0.035], [x, 1.08, -7.86], steel);
  rod(world, 'exit-handle', [x * 0.23, 1.08, -7.82], [x * 0.23, 1.54, -7.82], 0.022, steel);
}
const glass = material('#bddee3', 0.08, 0.15);
glass.transparent = true; glass.opacity = 0.22;
box(world, 'exit-glass', [2.64, 3.4, 0.018], [0, 1.74, -7.96], glass);
for (let i = 0; i < 24; i++) {
  const x = (random() - 0.5) * 2.6, y = 0.3 + random() * 2.1;
  box(world, 'outside-soft-architecture', [0.06 + random() * 0.13, 0.1 + random() * 0.6, 0.02], [x, y, -8.065], material(i % 2 ? '#c9dfdd' : '#abc8c6'));
}
sign(world, 'rear-exit-sign', 'EXIT', [0, 3.64, -7.85], [0.30, 0.16], '#179c6a', '#e6fff0');
const rightExit = sign(world, 'right-exit-sign', 'EXIT', [5.87, 4.28, 3.5], [0.34, 0.20], '#119960', '#e4ffee');
rightExit.rotation.y = -Math.PI / 2;

function pedestal(name, x, z, w, h, d, allWhite = false) {
  const g = new THREE.Group(); g.name = name; g.position.set(x, 0, z); world.add(g);
  box(g, 'plinth-base', [w, h - 0.14, d], [0, (h - 0.14) / 2 + 0.025, 0], allWhite ? white : concrete);
  box(g, 'white-cap', [w + 0.02, 0.16, d + 0.02], [0, h - 0.07, 0], white);
  box(g, 'plinth-recessed-foot', [w - 0.08, 0.045, d - 0.08], [0, 0.027, 0], material('#494b46'));
  return g;
}
const beamPlinth = pedestal('crossed-rust-I-beams', -2.94, 3.32, 1.85, 1.55, 1.7);
function iBeam(parent, name, pos, length, rz, ry, depth = 0.42) {
  const g = new THREE.Group(); g.name = name; g.position.set(...pos); g.rotation.set(0, ry, rz); parent.add(g);
  box(g, 'I-web', [0.075, length, depth], [0, 0, 0], rust);
  for (const z of [-depth / 2, depth / 2]) {
    box(g, 'I-flange', [0.46, length, .065], [0, 0, z], rust);
    for (const x of [-.226,.226]) box(g, 'worn-flange-edge', [0.012, length, .067], [x, 0, z], rustEdge);
  }
  for (const y of [-length / 2, length / 2]) box(g, 'cut-web-edge', [0.1, 0.009, depth], [0, y, 0], rustEdge);
}
iBeam(beamPlinth, 'descending-diagonal', [0, 2.42, -0.12], 2.15, 0.88, 0.42);
iBeam(beamPlinth, 'steep-upright', [-0.10, 2.36, 0.08], 1.90, -0.55, -0.52);
iBeam(beamPlinth, 'rising-diagonal', [0.05, 2.23, 0.24], 1.92, -0.94, 0.35);

const colorPlinth = pedestal('multicolor-assemblage', -1.8, -.5, 1.3, 1.35, 1.25, true);
const palette = ['#069b9f', '#d5b525', '#ce6414', '#1043a2', '#70b9a4', '#513b25'];
function irregular(parent, name, pos, scale, mat, k = 0.12, detail = 2) {
  const geo = new THREE.IcosahedronGeometry(1, detail);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const f = 1 + k * Math.sin(v.x * 13 + v.z * 6) * Math.cos(v.y * 11 - v.x * 5);
    p.setXYZ(i, v.x * f, v.y * f, v.z * f);
  }
  geo.computeVertexNormals();
  const m = mesh(parent, geo, mat, name, ...pos); m.scale.set(...scale); return m;
}
for (let i = 0; i < 23; i++) {
  const a = i * 2.4, y = 1.51 + i / 23 * 0.91;
  const radius = (1 - i / 28) * 0.29;
  irregular(colorPlinth, 'colored-found-fragment', [Math.sin(a) * radius, y, Math.cos(a) * radius],
    [0.13 + random() * 0.18, 0.11 + random() * 0.20, 0.10 + random() * 0.14],
    noisyMaterial(palette[i % palette.length], 0.61, 0.14, 20, 0.45), 0.23);
}
for (const [x, y, z, c] of [[-.25,2.26,.1,3],[.02,2.41,0,4],[.25,2.14,0,1]]) {
  irregular(colorPlinth, 'assemblage-spire', [x,y,z], [.07,.35,.06], material(palette[c]), .2);
}
for (let i = 0; i < 7; i++) {
  rod(colorPlinth, 'assemblage-crosswire', [-.55, 1.95 + i * .04, i * .02], [.61, 2.0 + i * .04, -.04], .009, rustEdge);
}
rod(colorPlinth, 'assemblage-top-antenna', [.02, 2.48, 0], [.0, 2.82, .02], .006, steel);

const darkPlinth = pedestal('dark-lobed-organic', 2.8, .3, 1.3, 1.4, 1.35);
irregular(darkPlinth, 'organic-tapered-base', [0, 1.70, 0], [.35, .35, .29], darkBronze, .15);
for (let i = 0; i < 12; i++) {
  const a = i * 2.399, radius = i < 5 ? .23 : .32;
  const g = new THREE.Group(); g.name = 'organic-hollow-lobe';
  g.position.set(Math.sin(a) * radius, 1.85 + (i % 4) * .16, Math.cos(a) * radius);
  g.rotation.set(.30 * Math.cos(a), a, .25 * Math.sin(a)); darkPlinth.add(g);
  const cup = new THREE.CylinderGeometry(.16 + (i % 3) * .025, .12, .32, 11, 3, true);
  const lobeMat = darkBronze.clone(); lobeMat.side = THREE.DoubleSide;
  mesh(g, cup, lobeMat, 'open-fold');
  const rim = mesh(g, new THREE.TorusGeometry(.175, .035, 7, 12), darkBronze, 'thick-irregular-rim', 0, .16, 0);
  rim.rotation.x = Math.PI / 2;
  mesh(g, new THREE.CircleGeometry(.13, 12), black, 'dark-hollow-interior', 0, -.08, 0).rotation.x = -Math.PI / 2;
}
for (let i = 0; i < 5; i++) {
  tube(darkPlinth, 'hanging-fold', [[-.4+i*.2,2.12,.31],[-.35+i*.18,1.9,.48],[-.30+i*.18,1.78,.38]], .053, darkBronze);
}
for (let i=0;i<6;i++) {
  const a=i*Math.PI/3;
  irregular(darkPlinth,'joined-organic-fold',[Math.cos(a)*.28,1.93+(i%2)*.16,Math.sin(a)*.26],[.20,.25,.20],darkBronze,.18,2);
}

const stonePlinth = pedestal('stone-and-metal-cutout', 3.05, 4.24, .90, 1.6, .60);
const outline = new THREE.Shape();
outline.moveTo(-.43, 0); outline.lineTo(-.49, .27); outline.lineTo(-.39, .94);
outline.lineTo(-.42, 1.18); outline.lineTo(-.30, 1.43); outline.lineTo(-.03, 1.46);
outline.lineTo(.02, 1.08); outline.lineTo(.34, 1.14); outline.lineTo(.42, 1.05);
outline.lineTo(.44, .15); outline.lineTo(.31, 0); outline.closePath();
const hole = new THREE.Path();
hole.moveTo(-.23, .38); hole.lineTo(-.26,.58); hole.lineTo(-.20,.76);
hole.lineTo(-.23, 1.01); hole.lineTo(.04, 1.03);
hole.lineTo(.11, .86); hole.lineTo(.065,.68); hole.lineTo(.08, .42); hole.lineTo(-.03, .31); hole.closePath();
outline.holes.push(hole);
const rock = mesh(stonePlinth, new THREE.ExtrudeGeometry(outline, { depth: .32, bevelEnabled: true, bevelThickness: .045, bevelSize: .04, bevelSegments: 2, curveSegments: 4 }), stone, 'rough-stone-cutout', 0, 1.62, -.10);
rock.rotation.y = -.13;
rock.scale.set(.72,.82,1);
const rockVertices=rock.geometry.attributes.position;
for(let i=0;i<rockVertices.count;i++){
  const x=rockVertices.getX(i),y=rockVertices.getY(i),z=rockVertices.getZ(i);
  rockVertices.setXYZ(i,x+Math.sin(y*91+z*34)*.009,y+Math.sin(x*77-z*63)*.009,z+Math.sin(x*91+y*53)*.013);
}
rock.geometry.computeVertexNormals();
box(stonePlinth, 'dark-metal-tall-insert', [.22, .98, .13], [.035, 2.37, -.19], rust);
box(stonePlinth, 'dark-metal-cross-insert', [.52, .10, .29], [-.058, 2.47, -.08], rust);
box(stonePlinth, 'inset-charcoal-recess', [.17, .56, .03], [-.072, 2.2, -.16], darkBronze);

function painting(side, z, y, w, h, colors) {
  const g = new THREE.Group(); g.name = 'framed-procedural-art'; g.position.set(side * 5.87, y, z); g.rotation.y = -side * Math.PI / 2; world.add(g);
  box(g, 'slim-wood-frame', [w, h, .055], [0, 0, 0], material('#8a7963'));
  box(g, 'ivory-mat', [w-.055, h-.055, .016], [0, 0, .036], white);
  for (let i = 0; i < 30; i++) {
    const x = (random()-.5)*(w-.16), yy = (random()-.5)*(h-.16);
    const m = box(g, 'abstract-painted-mark', [.02+random()*.10,.03+random()*.3,.003], [x,yy,.049], material(colors[i%colors.length]));
    m.rotation.z = (random()-.5)*.35;
  }
}
painting(-1, .7, 2.1, .78, 1.08, ['#938577','#c0c3bb','#7d8c88']);
painting(-1, -3.8, 1.94, .8, .9, ['#697773','#a29076','#b4a991']);
painting(1, -.1, 2.02, .76, 1.10, ['#779caa','#aebfb9','#cec3a8']);
painting(1, -3.1, 1.88, .58, .72, ['#897053','#bbac95','#796d5c']);
function person(name, x, z, shirtColor, pantsColor, yaw, pose) {
  const g = new THREE.Group(); g.name = name; g.position.set(x,0,z); g.rotation.y = yaw; world.add(g);
  const shirt = material(shirtColor), pants = material(pantsColor), skin = material('#c49779', .86);
  sphere(g, 'jacket-torso', [0,1.13,0], [.20,.32,.13], shirt);
  sphere(g, 'head', [0,1.58,-.015], [.095,.13,.10], skin);
  sphere(g, 'hair', [0,1.65,.012], [.096,.075,.095], material('#51473d'));
  rod(g,'neck',[0,1.37,0],[0,1.48,0],.055,skin);
  for (const s of [-1,1]) {
    const footz = pose ? s*.15 : s*.025;
    rod(g,'trouser-thigh',[s*.10,.94,0],[s*.10,.52,footz*.4],.077,pants);
    rod(g,'trouser-calf',[s*.10,.52,footz*.4],[s*.105,.10,footz],.059,pants);
    sphere(g,'shoe',[s*.105,.052,footz-.035],[.072,.047,.14],black);
    rod(g,'sleeve',[s*.18,1.34,0],[s*.25,1.05,.025],.066,shirt);
    rod(g,'forearm',[s*.25,1.05,.025],[s*.20,.87,-.05],.045,skin);
    sphere(g,'hand',[s*.20,.86,-.05],[.042,.06,.033],skin);
  }
  if (pose) {
    sphere(g,'backpack',[0,1.17,.18],[.17,.22,.085],material('#243f49'));
    tube(g,'backpack-strap',[[-.12,1.4,.1],[-.15,1.21,-.14],[-.11,.99,.04]],.017,black);
  } else {
    box(g,'shoulder-bag',[.17,.20,.10],[.22,.82,.05],black);
    tube(g,'bag-strap',[[.22,.85,.06],[-.08,1.38,.02],[.19,1.05,.05]],.011,black);
  }
}
person('rear-visitor-left', -1.18, -6.7, '#4f6267', '#183b49', .6, true);
person('rear-visitor-middle', 2.20, -4.72, '#203d40', '#173541', -.35, false);
person('rear-visitor-right', 2.64, -4.55, '#9b9180', '#343e3d', -1.1, false);
// Neutral, discontinuous wear arcs are invariant floor detail, not route guides.
for (let i = 0; i < 7; i++) {
  const points = [];
  for (let j = 0; j < 55; j++) {
    const a = -.9 + j/54*1.8;
    points.push([2.1*Math.sin(a)-.25+i*.025, .008, 3.0+1.45*Math.cos(a)+i*.02]);
  }
  const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p=>new THREE.Vector3(...p))), new THREE.LineBasicMaterial({color:'#65675e',transparent:true,opacity:.11}));
  line.name = 'shared-concrete-wear'; world.add(line);
}
for (let z = -7; z < 9; z += 2.1) {
  const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-6,.006,z),new THREE.Vector3(6,.006,z)]),new THREE.LineBasicMaterial({color:'#85877f',transparent:true,opacity:.25}));
  l.name = 'concrete-expansion-joint'; world.add(l);
}

const hemi = new THREE.HemisphereLight('#edf5ff', '#b6b0a2', 1.8); hemi.name='ceiling-bounce'; scene.add(hemi);
const ambient = new THREE.AmbientLight('#f7f5ec', .85); ambient.name='diffuse-gallery-fill';scene.add(ambient);
const sun = new THREE.DirectionalLight('#fff6e5', 1.5); sun.name='side-daylight'; sun.position.set(6,6,3); sun.target.position.set(-1,0,-1);
sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-10;sun.shadow.camera.right=10;sun.shadow.camera.top=10;sun.shadow.camera.bottom=-10;
sun.shadow.normalBias=.025;sun.shadow.bias=-.0001;sun.shadow.radius=6; scene.add(sun,sun.target);
const rearLight = new THREE.DirectionalLight('#d6f0ff', .6); rearLight.name='exit-fill'; rearLight.position.set(0,4,-8); scene.add(rearLight);
const artworkLight=new THREE.PointLight('#fff0d8',6,9,2);artworkLight.name='front-track-bounce';artworkLight.position.set(-2.4,3.8,5.8);scene.add(artworkLight);

const robot = new THREE.Group(); robot.name='shared-industrial-quadruped'; scene.add(robot);
const chassis = new THREE.Group(); chassis.name='articulated-chassis'; robot.add(chassis);
const contactShadowMaterial=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,
  vertexShader:'varying vec2 v;void main(){v=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
  fragmentShader:'varying vec2 v;void main(){float a=max(0.,1.-length((v-.5)*2.));gl_FragColor=vec4(.10,.105,.095,a*a*.25);}'
});
const bodyContact=mesh(robot,new THREE.PlaneGeometry(.95,1.6),contactShadowMaterial,'body-contact-occlusion',0,.018,0);
bodyContact.rotation.x=-Math.PI/2;bodyContact.castShadow=false;bodyContact.receiveShadow=false;
box(chassis,'yellow-body',[.48,.27,1.1],[0,0,0],yellow);
box(chassis,'black-belly',[.37,.13,.87],[0,-.16,0],black);
box(chassis,'back-deck',[.46,.06,1.0],[0,.16,0],black);
for (const z of [-.54,.54]) {
  const cap=box(chassis,'yellow-end-shell',[.47,.30,.18],[0,0,z],yellow);cap.rotation.x=z*.12;
  box(chassis,'end-black-vent',[.30,.17,.012],[0,0,z+(z<0?-.094:.094)],black);
  for(let x=-.1;x<.12;x+=.05) box(chassis,'vent-slat',[.014,.13,.016],[x,0,z+(z<0?-.103:.103)],steel);
}
for(const x of [-.248,.248]) {
  const badge=sign(chassis,'robot-industrial-badge','FIELD / Q4',[x,.015,.0],[.33,.075],'#dcab15','#262b25');
  badge.rotation.y=x>0?Math.PI/2:-Math.PI/2;
  for(const z of [-.38,.38]) sphere(chassis,'body-fastener',[x,0,z],[.013,.013,.013],steel,8);
}
box(chassis,'electronics-computer',[.36,.17,.27],[0,.265,.16],steel);
box(chassis,'battery-pack',[.23,.15,.19],[-.03,.25,.42],black);
box(chassis,'exposed-green-circuit-board',[.28,.025,.22],[.02,.35,.18],material('#14583d',.6,.25));
for(let i=0;i<8;i++) box(chassis,'circuit-components',[.027,.028,.038],[-.10+(i%4)*.06,.375,.12+Math.floor(i/4)*.1],i%2?black:steel);
for(let i=0;i<6;i++) {
  tube(chassis,'exposed-cable',[[-.17+i*.06,.30,.39],[-.23+i*.06,.48,.05],[.07+i*.017,.37,-.24]],.010,material(i%3===0?'#a33723':'#151c21',.6,.2));
}
rod(chassis,'sensor-mast',[0,.18,-.38],[0,.56,-.38],.065,black,16);
sphere(chassis,'lidar-core',[0,.56,-.38],[.12,.14,.12],black);
for(const y of [.47,.67]) {
  const ring=mesh(chassis,new THREE.TorusGeometry(.18,.015,8,24),black,'sensor-cage-ring',0,y,-.38);ring.rotation.x=Math.PI/2;
}
for(let i=0;i<4;i++) {
  const a=i*Math.PI/2;
  tube(chassis,'sensor-protective-cage',[[Math.cos(a)*.15,.39,-.38+Math.sin(a)*.15],[Math.cos(a)*.185,.58,-.38+Math.sin(a)*.185],[0,.75,-.38]],.015,black);
}
const ledMat=new THREE.MeshBasicMaterial({color:'#61ddb0'});
box(chassis,'status-led',[.018,.055,.02],[.251,.04,.47],ledMat);
const legs=[];
for(const front of [-1,1]) for(const side of [-1,1]) {
  const hip=new THREE.Group();hip.name=`leg-${front}-${side}`;robot.add(hip);
  const upper=box(hip,'yellow-upper-link',[.105,1,.14],[0,0,0],yellow);
  const lower=rod(hip,'black-lower-link',[0,0,0],[0,1,0],.038,black);
  const knee=sphere(hip,'knee-joint',[0,0,0],[.069,.069,.069],black);
  const shoulder=sphere(hip,'hip-motor',[0,0,0],[.09,.09,.09],black);
  const foot=sphere(hip,'rubber-foot',[0,0,0],[.046,.034,.066],rubber);
  const shadow=mesh(hip,new THREE.PlaneGeometry(.25,.25),contactShadowMaterial,'foot-contact-occlusion',0,.021,0);
  shadow.rotation.x=-Math.PI/2;shadow.castShadow=false;shadow.receiveShadow=false;
  legs.push({front,side,hip,upper,lower,knee,shoulder,foot,shadow,offset:front===side?0:.5});
}
const gaitConfig={stride:.84,duty:.62,footLift:.11,bodyHeight:.80,upperLength:.46,lowerLength:.50,hipWidth:.29,hipLongitudinal:.43,stanceWidth:.35};
let agentDefinition;

const start=new THREE.Vector3(.15,0,3.45), goal=new THREE.Vector3(0,0,-7.15);
const routePoints={
  '581': [[.15,3.45],[-.65,3.12],[-.48,2.62],[.50,2.6],[1.25,2.8],[1.70,2.4],[1.65,1.65],[.90,1.0],[.15,.3],[-.30,-.50],[.20,-1.2],[1.25,-1.85],[.58,-3.3],[0,-5.45],[0,-7.15]],
  '582': [[.15,3.45],[-.40,3.65],[-.45,4.4],[.55,4.95],[2.65,5.0],[3.95,4.98],[4.50,4.35],[4.65,3.20],[4.65,1.8],[4.65,-2.9],[4.55,-5.5],[2.25,-6.1],[1.10,-6.0],[.25,-6.3],[0,-6.7],[0,-7.15]]
};
const routes={};
for(const id of ['581','582']){
  const curve=new THREE.CatmullRomCurve3(routePoints[id].map(p=>new THREE.Vector3(p[0],0,p[1])),false,'centripetal');
  curve.arcLengthDivisions=2500;curve.updateArcLengths();
  routes[id]={curve,length:curve.getLength()};
}
let variant='581', currentTime=0, navState, editedState;
function clamp(v,a=0,b=1){return Math.max(a,Math.min(b,v));}
function smooth(v){v=clamp(v);return v*v*(3-2*v);}
function envelope(t){
  const u=clamp((t-.18)/(4.96-.18));
  const ramp=.12;
  if(u<ramp)return u*u/(2*ramp)/(1-ramp);
  if(u>1-ramp)return 1-(1-u)*(1-u)/(2*ramp)/(1-ramp);
  return (u-ramp/2)/(1-ramp);
}
function yawAtDistance(route,d){
  const tangent=route.curve.getTangentAt(clamp(d/route.length));
  return Math.atan2(-tangent.x,-tangent.z);
}
function poseAtDistance(route,d){
  if(d<=0)return {p:start.clone(),yaw:yawAtDistance(route,0)};
  if(d>=route.length)return {p:goal.clone(),yaw:0};
  return {p:route.curve.getPointAt(clamp(d/route.length)),yaw:yawAtDistance(route,d)};
}
function angleMix(a,b,t){return a+Math.atan2(Math.sin(b-a),Math.cos(b-a))*t;}
function transformOffset(p,yaw,x,z){
  return new THREE.Vector3(p.x+Math.cos(yaw)*x+Math.sin(yaw)*z,0,p.z-Math.sin(yaw)*x+Math.cos(yaw)*z);
}
function setSegment(obj,a,b,width,isBox=false){
  obj.position.copy(a).add(b).multiplyScalar(.5);
  obj.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());
  if(isBox)obj.scale.set(1,a.distanceTo(b),1);else obj.scale.set(1,a.distanceTo(b),1);
}
function updateRobot(t){
  const route=routes[variant],progress=envelope(t),distance=route.length*progress;
  const pose=poseAtDistance(route,distance);
  const openingYaw=1.18;
  const pathYaw=angleMix(openingYaw,pose.yaw,smooth(distance/.65));
  const yaw=progress===1?0:angleMix(pathYaw,0,smooth((distance-route.length+.5)/.5));
  robot.position.copy(pose.p);robot.rotation.set(0,yaw,0);
  const activity=smooth(distance/.4)*smooth((route.length-distance)/.45);
  const cycle=distance/gaitConfig.stride;
  chassis.position.set(0,gaitConfig.bodyHeight+Math.sin(cycle*Math.PI*4)*.018*activity,0);
  const curvature=Math.atan2(Math.sin(yawAtDistance(route,distance+.15)-yawAtDistance(route,distance-.15)),Math.cos(yawAtDistance(route,distance+.15)-yawAtDistance(route,distance-.15)));
  chassis.rotation.set(Math.sin(cycle*Math.PI*2)*.015*activity,0,clamp(curvature,-.25,.25)*.15*activity);
  robot.updateMatrixWorld(true);
  const invRoot=robot.matrixWorld.clone().invert();
  for(const leg of legs){
    const {front,side,offset}=leg;
    const q=cycle+offset,step=Math.floor(q),phase=q-step;
    const touchdown=(step-offset)*gaitConfig.stride;
    const stanceEnd=touchdown+gaitConfig.duty*gaitConfig.stride;
    function targetFoot(at){
      const sample=poseAtDistance(route,clamp(at,0,route.length));
      const syaw=angleMix(openingYaw,sample.yaw,smooth(clamp(at,0,route.length)/.65));
      return transformOffset(sample.p,syaw,side*gaitConfig.stanceWidth,front*gaitConfig.hipLongitudinal);
    }
    let footWorld;
    if(phase<gaitConfig.duty){
      footWorld=targetFoot(touchdown+gaitConfig.duty*gaitConfig.stride*.5);
    }else{
      const swing=(phase-gaitConfig.duty)/(1-gaitConfig.duty);
      const a=targetFoot(touchdown+gaitConfig.duty*gaitConfig.stride*.5);
      const b=targetFoot(touchdown+gaitConfig.stride+gaitConfig.duty*gaitConfig.stride*.5);
      footWorld=a.lerp(b,smooth(swing));footWorld.y=Math.sin(Math.PI*swing)*gaitConfig.footLift;
    }
    const rest=transformOffset(pose.p,yaw,side*gaitConfig.stanceWidth,front*gaitConfig.hipLongitudinal);
    if(activity===0)footWorld.copy(rest);else footWorld.lerp(rest,1-activity);
    footWorld.y+=.035;
    const localFoot=footWorld.clone().applyMatrix4(invRoot);
    const hipPos=new THREE.Vector3(side*gaitConfig.hipWidth,chassis.position.y-.025,front*gaitConfig.hipLongitudinal);
    const reach=localFoot.clone().sub(hipPos);
    const len=Math.min(reach.length(),gaitConfig.upperLength+gaitConfig.lowerLength-.002);
    const dir=reach.clone().normalize();
    const along=(gaitConfig.upperLength**2-gaitConfig.lowerLength**2+len**2)/(2*len);
    const bend=Math.sqrt(Math.max(0,gaitConfig.upperLength**2-along**2));
    const kneeDir=new THREE.Vector3(side*.11,0,front<0?.95:-.95).addScaledVector(dir,-new THREE.Vector3(side*.11,0,front<0?.95:-.95).dot(dir)).normalize();
    const kneePos=hipPos.clone().addScaledVector(dir,along).addScaledVector(kneeDir,bend);
    setSegment(leg.upper,hipPos,kneePos,.1,true);
    setSegment(leg.lower,kneePos,localFoot,.038);
    leg.knee.position.copy(kneePos);leg.shoulder.position.copy(hipPos);leg.foot.position.copy(localFoot);
    leg.shadow.position.set(localFoot.x,.021,localFoot.z);
    leg.shadow.scale.setScalar(1+footWorld.y*1.5);
    leg.hip.userData.contact={stance:phase<gaitConfig.duty||activity===0,worldFoot:footWorld.toArray(),phase,cycle:step,activity,reach:reach.length(),hip:hipPos.clone().applyMatrix4(robot.matrixWorld).toArray(),knee:kneePos.clone().applyMatrix4(robot.matrixWorld).toArray()};
  }
  navState={variant,type:variant==='581'?'serpentine-between-four-plinths':'outer-right-wall-perimeter',routeControlPoints:routePoints[variant].map(p=>[p[0],0,p[1]]),position:robot.position.toArray(),yaw,distance,routeLength:route.length,progress,start:start.toArray(),goal:goal.toArray()};
  editedState={name:robot.name,visible:robot.visible,position:robot.position.toArray(),quaternion:robot.quaternion.toArray(),scale:robot.scale.toArray(),geometryDefinition:'shared-agent-definition',movingTransforms:[],contacts:legs.map(l=>({name:l.hip.name,...l.hip.userData.contact}))};
  robot.traverse(o=>editedState.movingTransforms.push({name:o.name,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),visible:o.visible}));
}

const reflectionTarget=new THREE.WebGLRenderTarget(960,540,{minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter});
const reflectionMatrix=new THREE.Matrix4(),mirrorCamera=camera.clone();
const reflectionMaterial=new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,
  uniforms:{reflectionMap:{value:reflectionTarget.texture},reflectionMatrix:{value:reflectionMatrix}},
  vertexShader:`uniform mat4 reflectionMatrix;varying vec4 rp;varying vec3 wp;void main(){vec4 w=modelMatrix*vec4(position,1.);wp=w.xyz;rp=reflectionMatrix*w;gl_Position=projectionMatrix*viewMatrix*w;}`,
  fragmentShader:`uniform sampler2D reflectionMap;varying vec4 rp;varying vec3 wp;void main(){vec2 uv=rp.xy/rp.w;vec3 c=texture2D(reflectionMap,uv).rgb*.4;vec2 b=vec2(.012,.015);c+=texture2D(reflectionMap,uv+b).rgb*.15;c+=texture2D(reflectionMap,uv-b).rgb*.15;c+=texture2D(reflectionMap,uv+vec2(b.x,-b.y)).rgb*.15;c+=texture2D(reflectionMap,uv+vec2(-b.x,b.y)).rgb*.15;gl_FragColor=vec4(c,.09);\n#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}`
});
const reflection=mesh(scene,new THREE.PlaneGeometry(12,18),reflectionMaterial,'soft-floor-reflection',0,.012,.5);
reflection.rotation.x=-Math.PI/2;reflection.castShadow=false;reflection.receiveShadow=false;
function render(){
  camera.updateMatrixWorld(true);
  mirrorCamera.position.copy(camera.position);mirrorCamera.position.y*=-1;
  const forward=new THREE.Vector3(0,0,-1).applyQuaternion(camera.quaternion);forward.y*=-1;
  mirrorCamera.up.set(0,-1,0);mirrorCamera.lookAt(mirrorCamera.position.clone().add(forward));
  mirrorCamera.updateMatrixWorld(true);
  reflectionMatrix.set(.5,0,0,.5,0,.5,0,.5,0,0,.5,.5,0,0,0,1).multiply(mirrorCamera.projectionMatrix).multiply(mirrorCamera.matrixWorldInverse);
  reflection.visible=false;floor.visible=false;
  renderer.setRenderTarget(reflectionTarget);renderer.render(scene,mirrorCamera);
  floor.visible=true;reflection.visible=true;
  renderer.setRenderTarget(null);renderer.render(scene,camera);
}
function serializeDefinition(root){
  const geometries={},materials={},objects=[];
  root.traverse(o=>{
    const entry={name:o.name,type:o.type,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),visible:o.visible,castShadow:o.castShadow,receiveShadow:o.receiveShadow};
    if(o.geometry){
      entry.geometry=o.geometry.uuid;
      if(!geometries[o.geometry.uuid]){
        const json=o.geometry.toJSON();delete json.uuid;
        if(o.geometry.type==='IcosahedronGeometry'||o.name==='rough-stone-cutout'){
          json.actualPositionAttribute=Array.from(o.geometry.attributes.position.array);
          json.actualNormalAttribute=Array.from(o.geometry.attributes.normal.array);
        }
        geometries[o.geometry.uuid]=json;
      }
    }
    if(o.material){
      const mats=Array.isArray(o.material)?o.material:[o.material];
      entry.material=mats.map(m=>m.uuid);
      for(const m of mats)if(!materials[m.uuid]){
        const j=m.toJSON();delete j.uuid;materials[m.uuid]=j;
      }
    }
    entry.parent=o.parent&&o!==root?o.parent.name:null;
    objects.push(entry);
  });
  return {objects,geometries,materials};
}
const environmentDefinition=serializeDefinition(world);
function getCameraState(){return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};}
function getAgentDefinitionState(){return {definition:agentDefinition,scale:[1,1,1],gait:gaitConfig};}
function getInvariantState(){
  const currentSharedTransforms=[];
  world.traverse(o=>currentSharedTransforms.push({name:o.name,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),visible:o.visible}));
  return {environment:environmentDefinition,currentSharedTransforms,agent:getAgentDefinitionState(),lights:[hemi,ambient,sun,rearLight,artworkLight].map(l=>({name:l.name,type:l.type,color:l.color.getHex(),intensity:l.intensity,position:l.position.toArray(),quaternion:l.quaternion.toArray(),castShadow:l.castShadow,target:l.target?.position.toArray(),groundColor:l.groundColor?.getHex(),distance:l.distance,decay:l.decay,shadow:l.shadow?.toJSON()})),camera:getCameraState(),renderer:{width:WIDTH,height:HEIGHT,toneMapping:renderer.toneMapping,exposure:renderer.toneMappingExposure,colorSpace:renderer.outputColorSpace,shadowType:renderer.shadowMap.type},floorReflection:{opacity:.09,resolution:[960,540]},background:scene.background.getHex()};
}
function seek(seconds){
  if(!Number.isFinite(seconds))throw new TypeError('seek requires finite seconds');
  currentTime=clamp(seconds,0,DURATION);
  const u=smooth(currentTime/DURATION);
  const reveal=smooth((currentTime-.18)/1.25);
  camera.position.set(.04+.75*reveal+.06*u,2.25,8.0+1.35*reveal-.08*u);
  camera.lookAt(.05+.35*reveal, .52, -4.6);
  updateRobot(currentTime);render();
}
window.reconstruction={
  pause(){},
  seek,
  setVariant(id){if(id!=='581'&&id!=='582')throw new RangeError('Unknown variant');variant=id;seek(currentTime);},
  getCameraState,
  getInvariantState,
  getAgentDefinitionState,
  getNavigationState(){return structuredClone(navState);},
  getEditedObjectState(){return structuredClone(editedState);}
};
seek(0);
agentDefinition=serializeDefinition(robot);
