import * as THREE from '../vendor/three.module.js';

const WIDTH = 960, HEIGHT = 540, DURATION = 124 / 24;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c2c5c2');
const camera = new THREE.PerspectiveCamera(61, WIDTH / HEIGHT, 0.035, 70);
const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
document.body.appendChild(renderer.domElement);

const world = new THREE.Group();
world.name = 'sharedHospital';
scene.add(world);
const materials = {};
function mat(name, color, roughness = 0.65, metalness = 0) {
  const material = new THREE.MeshStandardMaterial({color, roughness, metalness});
  material.name = name;
  materials[name] = material;
  return material;
}
const wall = mat('warm white painted wall', '#d7d8d0');
const wallLow = mat('lower wall protective panel', '#cecfc9');
const ceiling = mat('acoustic ceiling', '#cecfcb', 0.95);
ceiling.emissive.set('#989c98'); ceiling.emissiveIntensity = 0.32;
const stone = mat('pale quartz countertop', '#dedfdb', 0.35);
const wood = mat('honey oak', '#a58566', 0.62);
const woodLight = mat('light oak panel', '#b49a7c', 0.65);
const grain = mat('subtle oak grain', '#967753', 0.76);
const frame = mat('slate grey door frames', '#566367', 0.48);
const stripe = mat('slate floor stripe', '#647780', 0.44);
const floorMat = mat('light grey polished vinyl', '#babdb9', 0.40, 0.04);
const seam = mat('vinyl tile joints', '#a9b1af', 0.6);
const ceilingSeam = mat('ceiling grid recessed joints', '#9b9f9c', 0.95);
const black = mat('graphite rubber', '#151c20', 0.4);
const metal = mat('brushed aluminum', '#929d9e', 0.31, 0.72);
const chrome = mat('door and cupboard hardware', '#bbc3c1', 0.23, 0.85);
const screenMat = mat('monitor black bezel', '#182327', 0.3);
const blue = mat('nurse blue scrubs', '#416a9d', 0.93);
const skin = mat('skin', '#c79c7e', 0.86);
const hair = mat('brown hair', '#44352e', 0.91);
const whiteRobot = mat('robot white ceramic shell', '#e0e3df', 0.3, 0.18);
const jointMat = mat('black robot actuators', '#1b2327', 0.3, 0.55);
const dogSilver = mat('dog satin silver body', '#929d9e', 0.34, 0.64);
const paper = mat('white paper', '#e4e5df', 0.8);
const glow = mat('white LED diffuser', '#eaf1f4', 0.3);
glow.emissive.set('#dce8ed'); glow.emissiveIntensity = 1.2;
const green = mat('green exit sign', '#087155');
green.emissive.set('#119176'); green.emissiveIntensity = 0.5;
const statusLight = mat('cyan robot indicator', '#4eccbd');
statusLight.emissive.set('#4eccbd'); statusLight.emissiveIntensity = 1;
function proceduralSurface(material,kind) {
  const formula=kind==='wood'
    ? 'float g=sin(vSurfacePosition.x*98.0+sin(vSurfacePosition.y*3.4)*1.1+sin(vSurfacePosition.x*22.0)*2.1); diffuseColor.rgb*=0.981+0.018*g;'
    : 'float g=fract(sin(dot(floor(vSurfacePosition.xz*510.0),vec2(12.9898,78.233)))*43758.5453); diffuseColor.rgb*=0.979+0.042*g;';
  material.userData.proceduralSurface={kind,formula};
  material.onBeforeCompile=shader=>{
    shader.vertexShader='varying vec3 vSurfacePosition;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvSurfacePosition=position;');
    shader.fragmentShader='varying vec3 vSurfacePosition;\n'+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\n'+formula);
  };
  material.customProgramCacheKey=()=>kind;
}
proceduralSurface(wood,'wood');proceduralSurface(woodLight,'wood');
proceduralSurface(floorMat,'vinyl');proceduralSurface(stone,'vinyl');
let objectIndex = 0;
function group(name, parent = world) {
  const g = new THREE.Group(); g.name = name; parent.add(g); return g;
}
function mesh(geometry, material, parent, name) {
  const o = new THREE.Mesh(geometry, material);
  o.name = name || `detail-${objectIndex++}`;
  o.castShadow = true; o.receiveShadow = true;
  parent.add(o); return o;
}
function box(parent, x, y, z, w, h, d, material, name) {
  const o = mesh(new THREE.BoxGeometry(w, h, d), material, parent, name);
  o.position.set(x, y, z); return o;
}
function sphere(parent, x, y, z, sx, sy, sz, material, name) {
  const o = mesh(new THREE.SphereGeometry(1, 20, 14), material, parent, name);
  o.position.set(x, y, z); o.scale.set(sx, sy, sz); return o;
}
function cylinder(parent, x, y, z, radius, length, material, axis = 'y', name) {
  const o = mesh(new THREE.CylinderGeometry(radius, radius, length, 20), material, parent, name);
  o.position.set(x, y, z);
  if (axis === 'x') o.rotation.z = Math.PI / 2;
  if (axis === 'z') o.rotation.x = Math.PI / 2;
  return o;
}
function link(parent, a, b, radius, material, name, radius2 = radius) {
  const p = new THREE.Vector3(...a), q = new THREE.Vector3(...b);
  const o = mesh(new THREE.CylinderGeometry(radius2, radius, p.distanceTo(q), 16), material, parent, name);
  o.position.copy(p).add(q).multiplyScalar(0.5);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), q.sub(p).normalize());
  return o;
}
function rounded(parent, x, y, z, w, h, d, material, name) {
  const o = box(parent, x, y, z, w, h, d, material, name);
  const edge = new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry), new THREE.LineBasicMaterial({color: material.color.clone().multiplyScalar(0.76), transparent: true, opacity: 0.25}));
  edge.name = `${o.name}-seams`; o.add(edge); return o;
}

// All lettering is vector geometry, not an image or runtime texture.
const font = {
  '0':['111','101','101','101','111'], '1':['010','110','010','010','111'],
  '2':['111','001','111','100','111'], '3':['111','001','111','001','111'],
  '4':['101','101','111','001','001'], '5':['111','100','111','001','111'],
  '6':['111','100','111','101','111'], '7':['111','001','010','010','010'],
  '8':['111','101','111','101','111'], '9':['111','101','111','001','111'],
  E:['111','100','110','100','111'], X:['101','101','010','101','101'],
  I:['111','010','010','010','111'], T:['111','010','010','010','010'],
  R:['110','101','110','101','101'], N:['101','111','111','111','101'],
  U:['101','101','101','101','111'], S:['111','100','111','001','111'],
  A:['010','101','111','101','101'], O:['111','101','101','101','111']
};
function lettering(parent, text, x, y, z, size, material) {
  const g = group(`label-${text}`, parent);
  const step = size / 5;
  [...text].forEach((c, n) => (font[c] || ['000','000','000','000','000']).forEach((line, j) =>
    [...line].forEach((v, i) => {if (v === '1') box(g, (n * 4 + i) * step, -j * step, 0, step * 0.87, step * 0.87, 0.002, material);})));
  g.position.set(x, y, z); return g;
}
function notice(parent, x, y, z, w = 0.17, h = 0.26) {
  box(parent, x, y, z, w, h, 0.007, paper);
  for (let i = 0; i < 9; i++) box(parent, x - 0.008, y + h * 0.34 - i * h * 0.075, z + 0.005, w * (0.57 + (i % 3) * 0.11), 0.004, 0.003, frame);
  box(parent, x, y - h * 0.4, z + 0.006, w * 0.93, h * 0.095, 0.003, blue);
}
function woodPanel(parent, x, y, z, w, h, d, alternate = false) {
  const p = box(parent, x, y, z, w, h, d, alternate ? woodLight : wood);
  return p;
}

const hospital = group('hospital-shell');
box(hospital, 0, -0.085, 1.6, 18, 0.16, 20, floorMat, 'continuous-vinyl-floor');
for (let x = -8; x <= 8; x += 1.1) box(hospital, x, 0.001, 1.6, 0.003, 0.001, 18, seam);
for (let z = -7; z <= 10; z += 1.1) box(hospital, 0, 0.002, z, 17, 0.001, 0.003, seam);
function wallRun(x1, x2, z, h = 3.25) {
  box(hospital, (x1+x2)/2, h/2, z, x2-x1, h, 0.18, wall);
  box(hospital, (x1+x2)/2, 0.065, z + 0.102, x2-x1, 0.13, 0.033, frame);
}
wallRun(-6, -1.23, -1.65);
wallRun(-1.23, -0.5, -0.7);
wallRun(0.62, 1.95, -0.7);
box(hospital, 0.06, 2.88, -0.7, 1.12, 0.75, 0.18, wall);
box(hospital, -1.26, 1.62, -1.13, 0.13, 3.25, 1.05, wall);
wallRun(1.95, 3.9, -2.2);
box(hospital, 1.93, 1.625, -1.42, 0.18, 3.25, 1.6, wall);
wallRun(5.2, 7.5, -2.2);
box(hospital, 4.55, 2.89, -2.2, 1.3, 0.72, 0.18, wall);
// Near-right return wall contains the second doorway, with a deeper hall beyond.
const rightWall = group('near-right-return');
rightWall.position.set(3.95, 0, 2.4); rightWall.rotation.y = -Math.PI / 2;
function localRight(x, y, w, h) { box(rightWall, x, y, 0, w, h, 0.2, wall); }
localRight(-1.7, 1.625, 1.9, 3.25);
localRight(1.65, 1.625, 2.55, 3.25);
localRight(-0.187, 2.86, 1.125, 0.78);
box(rightWall, -1.7, 0.07, 0.12, 1.9, 0.14, 0.04, frame);
box(rightWall, 1.65, 0.07, 0.12, 2.55, 0.14, 0.04, frame);
wallRun(2.5, 7.4, -6.1);
box(hospital, 7.2, 1.625, -3.9, 0.18, 3.25, 5.0, wall);
box(hospital, -6, 1.625, 1.8, 0.18, 3.25, 7, wall);
box(hospital, 0, 3.3, 1, 18, 0.1, 18, ceiling, 'full-interior-ceiling').castShadow=false;
for (let x = -8; x < 9; x += 1.2) box(hospital, x, 3.245, 1, 0.006, 0.004, 18, ceilingSeam).castShadow=false;
for (let z = -7; z < 10; z += 1.2) box(hospital, 0, 3.245, z, 18, 0.004, 0.006, ceilingSeam).castShadow=false;
for (const [x,z] of [[-3,0.5],[0.5,1.4],[3.4,-0.7],[-3,-2.5],[4,-4]]) {
  box(hospital, x, 3.227, z, 0.18, 0.025, 1.55, glow).castShadow=false;
}
for (const [x,z] of [[-4,2.3],[1.2,2.5],[3.6,-1.4],[0,-0.9]]) {
  cylinder(hospital,x,3.225,z,0.075,0.012,chrome).castShadow=false;
  cylinder(hospital,x,3.211,z,0.057,0.015,glow).castShadow=false;
}
function door(parent, x, z, number, angle = 0) {
  const g = group(`door-${number}`, parent); g.position.set(x,0,z); g.rotation.y=angle;
  box(g,0,1.19,0,1.08,2.38,0.065,wood);
  for (const u of [-0.575,0.575]) box(g,u,1.22,0.018,0.065,2.44,0.16,frame);
  box(g,0,2.445,0.018,1.22,0.075,0.16,frame);
  box(g,0.411,1.03,0.065,0.045,0.17,0.023,chrome);
  cylinder(g,0.342,1.055,0.11,0.015,0.15,chrome,'x');
  box(g,0.78,1.42,0.035,0.20,0.25,0.022,frame);
  lettering(g,number,0.704,1.49,0.05,0.071,paper);
  box(g,0.8,1.045,0.043,0.16,0.24,0.045,stone);
  box(g,0.8,1.07,0.07,0.048,0.12,0.012,blue);
  notice(g,-0.08,1.62,0.036,0.24,0.37);
  return g;
}
door(hospital,0.06,-0.58,'301');
door(rightWall,-0.187,0.12,'302');
door(hospital,3.4,-5.99,'305');
door(hospital,-5.26,-1.54,'300');
box(hospital,3.95,1.21,-2.13,0.1,2.42,0.18,frame);
box(hospital,5.15,1.21,-2.13,0.1,2.42,0.18,frame);
box(hospital,4.55,2.445,-2.13,1.3,0.1,0.18,frame);
box(hospital,4.55,2.83,-2.08,0.48,0.25,0.06,green);
lettering(hospital,'EXIT',4.36,2.9,-2.043,0.135,glow);
function rail(parent,x,y,z,w) {
  box(parent,x,y,z,w,0.11,0.05,stone);
  box(parent,x,y+0.029,z+0.025,w,0.014,0.027,paper);
  for(let u=-w/2+0.12;u<w/2;u+=0.65) box(parent,x+u,y-0.045,z-0.03,0.026,0.11,0.065,chrome);
}
rail(hospital,1.29,0.96,-0.565,1.19);
rail(hospital,2.87,0.96,-2.07,1.75);
const shortRail=group('corner-hand-rail'); shortRail.position.set(1.817,0,-1.44); shortRail.rotation.y=-Math.PI/2;
rail(shortRail,0,0.96,0,1.4);
rail(hospital,5.8,0.96,-5.96,2.0);
const painting = group('framed-corridor-landscape');
painting.position.set(2.91,1.9,-2.078);
box(painting,0,0,0,0.53,0.64,0.037,wood);
box(painting,0,0,0.025,0.47,0.58,0.009,paper);
const sky = mat('landscape sky','#7598b1');
const mountain = mat('landscape mountains','#496274');
const land = mat('landscape meadow','#849075');
box(painting,0,0.03,0.032,0.4,0.45,0.003,sky);
box(painting,0,-0.16,0.036,0.4,0.11,0.003,land);
for(const [x,y,s] of [[-.11,-.03,.17],[.04,.02,.2],[.15,-.04,.12]]) {
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute([x-s,y-s,0.039,x+s,y-s,0.039,x,y+s,0.039],3));
  geo.computeVertexNormals();
  mesh(geo,mountain,painting);
}
const lake=mat('landscape lake','#668c9d');
box(painting,.04,-.134,.042,.25,.065,.003,lake);
for(const [x,y,s] of [[-.11,.055,.036],[.04,.132,.042]]) {
  const geo=new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute([x-s,y-s,0.045,x+s,y-s,0.045,x,y+s,0.045],3));
  geo.computeVertexNormals();mesh(geo,paper,painting);
}
// Dark inlaid boundary stripe bends at the corridor junction.
box(hospital,1.20,0.004,4.175,0.085,0.006,5.05,stripe,'approach-floor-stripe');
const stripeEnd=new THREE.Vector2(3.95,-1.50),stripeCorner=new THREE.Vector2(1.20,1.65);
const boundary=box(hospital,(stripeEnd.x+stripeCorner.x)/2,.004,(stripeEnd.y+stripeCorner.y)/2,stripeEnd.distanceTo(stripeCorner),.006,.085,stripe,'turn-floor-stripe');
boundary.rotation.y=-Math.atan2(stripeEnd.y-stripeCorner.y,stripeEnd.x-stripeCorner.x);

const station = group('nurse-station');
function counterSegment(ax,az,bx,bz,name) {
  const g=group(name,station), length=Math.hypot(bx-ax,bz-az);
  g.position.set((ax+bx)/2,0,(az+bz)/2);g.rotation.y=-Math.atan2(bz-az,bx-ax);
  box(g,0,.09,0,length,.18,.48,frame);
  box(g,0,.58,0,length,.91,.44,wood);
  const count=Math.ceil(length/.46),width=length/count;
  for(let i=0;i<count;i++) woodPanel(g,-length/2+width*(i+.5),.58,.23,width-.016,.89,.018,true);
  box(g,0,.96,.25,length,.038,.033,chrome);
  return g;
}
const frontCounter=counterSegment(-5.2,-.35,-1.8,2.6,'angled-long-counter');
counterSegment(-1.8,2.6,-.94,1.75,'counter-return');
const counterLine=[new THREE.Vector2(-5.2,-.35),new THREE.Vector2(-1.8,2.6),new THREE.Vector2(-.94,1.75)];
const normals=counterLine.slice(0,-1).map((p,i)=>{
  const d=counterLine[i+1].clone().sub(p).normalize();return new THREE.Vector2(-d.y,d.x);
});
const middle=normals[0].clone().add(normals[1]).normalize();
const offsets=[normals[0].clone().multiplyScalar(.325),middle.clone().multiplyScalar(.325/middle.dot(normals[0])),normals[1].clone().multiplyScalar(.325)];
const outline=[...counterLine.map((p,i)=>p.clone().add(offsets[i])),...counterLine.map((p,i)=>p.clone().sub(offsets[i])).reverse()];
const topShape=new THREE.Shape(outline);
const continuousTop=mesh(new THREE.ExtrudeGeometry(topShape,{depth:.075,bevelEnabled:false}),stone,station,'single-mitered-L-stone-top');
continuousTop.rotation.x=Math.PI/2;continuousTop.position.y=1.1075;
box(station,-3.33,.79,-1.01,4.44,.065,.86,stone,'worktop');
for(let x=-5.22;x<-1.6;x+=.63) {
  box(station,x,.42,-1.03,.6,.72,.65,wood);
  for(let y=.23;y<.75;y+=.22) {
    woodPanel(station,x,y,-.69,.58,.20,.015,true);
    cylinder(station,x,y+.025,-.66,.008,.17,chrome,'x');
  }
}
for(let x=-4.93;x<-1.3;x+=.55) {
  woodPanel(station,x,2.35,-1.4,.53,.91,.38,true);
  cylinder(station,x+.18,2.09,-1.183,.008,.115,chrome);
}
box(station,-3.2,2.825,-1.32,4.6,.06,.58,stone);
box(station,-3.2,2.97,-1.02,4.65,.3,.18,wall,'station-soffit');
for(const x of [-4.1,-2.05]) notice(station,x,2.01,-1.195,.19,.24);
function monitor(parent,x,y,z,rotation=0) {
  const g=group('computer-monitor',parent);g.position.set(x,y,z);g.rotation.y=rotation;
  box(g,0,.02,0,.31,.028,.21,black);
  box(g,0,.13,0,.039,.22,.04,metal);
  const screen=box(g,0,.34,0,.48,.31,.045,screenMat);screen.rotation.x=-.075;
  const display=mat(`display-${objectIndex}`,'#273c43',.43);
  box(g,0,.34,.025,.425,.262,.004,display);
  for(let i=0;i<5;i++) box(g,-.072,.424-i*.035,.029,.2-(i%2)*.05,.009,.002,i===0?stone:frame);
  box(g,.139,.33,.029,.073,.19,.003,frame);
  cylinder(g,.197,.202,.029,.003,.002,statusLight,'z');
  const key=box(g,0,.007,.27,.42,.017,.145,black);
  for(let i=0;i<10;i++) for(let j=0;j<4;j++) box(g,-.18+i*.037,.018,.216+j*.032,.026,.004,.019,frame);
  sphere(g,.27,.022,.26,.034,.023,.055,black);
  return key;
}
monitor(station,-4.24,.825,-.79);
monitor(station,-2.02,.825,-.79);
monitor(frontCounter,-.95,1.115,0,Math.PI);
monitor(frontCounter,.79,1.115,0,Math.PI+.10);
function phone(x,y,z) {
  const g=group('desk-telephone',station);
  box(g,x,y,z,.19,.04,.22,black);
  for(const u of [-.067,.067]) sphere(g,x+u,y+.045,z-.04,.035,.034,.048,black);
  cylinder(g,x,y+.065,z-.04,.023,.135,black,'x');
  for(let i=0;i<3;i++) for(let j=0;j<3;j++) box(g,x-.03+i*.03,y+.025,z+.005+j*.031,.018,.01,.019,metal);
}
phone(-4.85,.848,-.65);phone(-1.57,.848,-.69);phone(-4.55,1.13,.18);
for(const x of [-1.5,.13]) {
  box(frontCounter,x,1.25,0,.17,.29,.17,paper);
  notice(frontCounter,x,1.26,.088,.135,.23);
}
for(const x of [-4.65,-1.72]) {
  cylinder(station,x,.89,-.61,.039,.12,stone);
  for(let i=0;i<4;i++) cylinder(station,x+.015*Math.sin(i),1,-.61+.015*Math.cos(i),.004,.15,i%2?blue:black);
}
function nurse(x,z,angle=0) {
  const g=group('seated-nurse',station);g.position.set(x,0,z);g.rotation.y=angle;
  cylinder(g,0,.27,0,.033,.44,metal);
  for(let i=0;i<5;i++) {
    const a=i*Math.PI*2/5;
    link(g,[0,.12,0],[Math.sin(a)*.27,.08,Math.cos(a)*.27],.018,black);
    sphere(g,Math.sin(a)*.27,.055,Math.cos(a)*.27,.04,.05,.035,black);
  }
  box(g,0,.48,0,.43,.09,.42,black);
  box(g,0,.76,.18,.43,.45,.065,black);
  sphere(g,0,.84,0,.22,.31,.14,blue);
  sphere(g,0,.60,-.075,.21,.13,.19,blue);
  for(const side of [-1,1]) {
    link(g,[side*.12,.55,-.07],[side*.12,.47,-.36],.082,blue);
    link(g,[side*.12,.47,-.36],[side*.12,.1,-.37],.067,blue);
    sphere(g,side*.12,.075,-.43,.075,.055,.13,black);
    sphere(g,side*.235,.99,-.01,.09,.12,.09,blue);
    link(g,[side*.235,.99,-.01],[side*.265,.8,-.22],.065,blue);
    link(g,[side*.265,.8,-.22],[side*.21,.85,-.43],.042,skin);
    sphere(g,side*.21,.852,-.455,.048,.022,.073,skin);
  }
  cylinder(g,0,1.135,-.018,.053,.12,skin);
  sphere(g,0,1.29,-.035,.105,.145,.098,skin);
  sphere(g,0,1.33,.001,.111,.13,.106,hair);
  sphere(g,0,1.248,-.13,.031,.036,.038,skin);
  sphere(g,0,1.21,.097,.081,.13,.085,hair);
  sphere(g,0,1.02,.112,.062,.14,.057,hair);
}
nurse(-3.88,-.2,-.52);
nurse(-1.88,-.22,-.65);

const hemi = new THREE.HemisphereLight('#f1f3f1','#a1a19a',1.65);
hemi.name='shared-ambient';scene.add(hemi);
const keyLight = new THREE.DirectionalLight('#f6f2e9',1.5);
keyLight.name='ceiling-soft-key'; keyLight.position.set(-2,8,2);
keyLight.castShadow=true;
keyLight.shadow.mapSize.set(2048,2048);
keyLight.shadow.camera.left=-9;keyLight.shadow.camera.right=9;
keyLight.shadow.camera.top=9;keyLight.shadow.camera.bottom=-9;
keyLight.shadow.normalBias=.009;keyLight.shadow.bias=-.0001;keyLight.shadow.radius=5;
scene.add(keyLight);
for(const [x,y,z,intensity] of [[-3,2.95,.1,5],[2.6,2.95,1,5],[4.2,2.95,-3.8,5]]) {
  const l=new THREE.PointLight('#eef3f5',intensity,9,2);l.name=`ceiling-fill-${x}`;
  l.position.set(x,y,z);scene.add(l);
}

const robotRig = group('robotRig',scene);
const human = group('humanoid568',robotRig);
const dog = group('quadruped567',robotRig);
human.scale.setScalar(1.14);
dog.scale.setScalar(1.12);
const humanBody = group('humanoid-body',human);
const dogBody = group('quadruped-body',dog);
function taperedShell(parent, y, width, height, depth, material, name) {
  const shape=new THREE.Shape();
  shape.moveTo(-width*.38,-height/2);shape.lineTo(width*.38,-height/2);
  shape.lineTo(width/2,height*.22);shape.lineTo(width*.43,height/2);
  shape.lineTo(-width*.43,height/2);shape.lineTo(-width/2,height*.22);shape.closePath();
  const geo=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.025,bevelThickness:.02,bevelSegments:2,steps:1});
  const m=mesh(geo,material,parent,name);m.position.set(0,y,-depth/2);return m;
}
// Both embodiments point down local -Z; only this subtree may differ.
sphere(humanBody,0,1.72,0,.115,.14,.112,jointMat,'black-head');
box(humanBody,0,1.727,-.093,.13,.049,.04,black,'front-visor');
for(const x of [-.103,.103]) cylinder(humanBody,x,1.728,0,.032,.017,metal,'x');
cylinder(humanBody,0,1.555,0,.045,.12,metal);
for(let y=1.52;y<1.6;y+=.023) cylinder(humanBody,0,y,0,.055,.008,jointMat);
taperedShell(humanBody,1.345,.43,.35,.2,whiteRobot,'white-torso-shell');
box(humanBody,0,1.36,.126,.013,.27,.005,metal,'back-shell-center-seam');
box(humanBody,0,1.2,.116,.17,.065,.018,jointMat);
for(const x of [-.14,.14]) for(const y of [1.27,1.44]) sphere(humanBody,x,y,.132,.008,.008,.004,metal);
cylinder(humanBody,0,1.07,0,.08,.17,jointMat);
for(let y=1.01;y<1.14;y+=.035) cylinder(humanBody,0,y,0,.086,.012,metal);
sphere(humanBody,0,.965,0,.18,.1,.125,jointMat);
box(humanBody,0,.982,.128,.13,.065,.025,metal);
const arms=[];
for(const side of [-1,1]) {
  const a=group(side<0?'left-arm':'right-arm',humanBody);a.position.set(side*.273,1.435,0);
  sphere(a,0,0,0,.092,.095,.095,jointMat);
  cylinder(a,side*.057,0,0,.061,.025,whiteRobot,'x');
  taperedShell(a,-.17,.108,.235,.105,whiteRobot,'upper-arm-shell');
  const elbow=group('elbow',a);elbow.position.y=-.32;
  sphere(elbow,0,0,0,.054,.052,.055,jointMat);
  taperedShell(elbow,-.125,.092,.205,.09,whiteRobot,'forearm-shell');
  const hand=group('hand',elbow);hand.position.set(0,-.273,0);
  sphere(hand,0,0,0,.04,.05,.034,jointMat);
  for(let i=0;i<4;i++) {
    link(hand,[-.029+i*.018,-.03,0],[-.029+i*.018,-.087,-.008],.0075,metal);
    link(hand,[-.029+i*.018,-.087,-.008],[-.029+i*.018,-.103,-.027],.006,jointMat);
  }
  link(hand,[side*.034,0,0],[side*.055,-.053,-.035],.011,metal);
  arms.push({a,elbow,side});
}
function movingSegment(parent,length,radius,material,name,shellWidth=0) {
  const g=group(name,parent);
  cylinder(g,0,-length/2,0,radius,length,jointMat);
  if(shellWidth) {
    const p=taperedShell(g,-length/2,shellWidth,length*.76,radius*1.8,material,`${name}-shell`);
    p.position.z+=.004;
  } else cylinder(g,0,-length/2,0,radius,length,material);
  return g;
}
const humanLegs=[];
for(const side of [-1,1]) {
  const hip=group(side<0?'left-hip':'right-hip',human);
  sphere(hip,0,0,0,.08,.085,.085,jointMat);
  cylinder(hip,side*.055,0,0,.079,.038,metal,'x');
  const upper=movingSegment(hip,.47,.06,whiteRobot,'thigh',.15);
  const knee=group('knee',human);sphere(knee,0,0,0,.059,.065,.065,jointMat);
  cylinder(knee,side*.052,0,0,.044,.026,metal,'x');
  const lower=movingSegment(knee,.47,.046,whiteRobot,'shin',.115);
  const foot=group('planted-foot',human);
  box(foot,0,.045,-.052,.12,.09,.25,jointMat);
  rounded(foot,0,.085,-.048,.108,.065,.214,whiteRobot,'shoe-upper');
  humanLegs.push({side,hip,upper,knee,lower,foot});
}
rounded(dogBody,0,.665,0,.33,.19,.65,dogSilver,'silver-dog-torso');
box(dogBody,0,.78,.006,.24,.035,.49,metal);
for(let i=0;i<9;i++) box(dogBody,0,.805,-.2+i*.05,.18,.009,.014,frame);
box(dogBody,0,.69,-.345,.25,.12,.05,jointMat,'sensor-face');
for(const x of [-.075,.075]) cylinder(dogBody,x,.709,-.377,.024,.016,black,'z');
cylinder(dogBody,0,.669,-.381,.012,.018,statusLight,'z');
for(const side of [-1,1]) {
  box(dogBody,side*.172,.684,.02,.014,.104,.26,frame);
  cylinder(dogBody,side*.185,.69,-.06,.011,.016,statusLight,'x');
}
const dogLegs=[];
for(const side of [-1,1]) for(const end of [-1,1]) {
  const hip=group(`dog-hip-${side}-${end}`,dog);
  cylinder(hip,0,0,0,.067,.095,dogSilver,'x');
  cylinder(hip,side*.05,0,0,.049,.017,metal,'x');
  const upper=movingSegment(hip,.32,.033,dogSilver,'dog-upper',.076);
  const knee=group('dog-knee',dog);cylinder(knee,0,0,0,.039,.06,jointMat,'x');
  const lower=movingSegment(knee,.34,.022,metal,'dog-lower');
  const foot=group('dog-contact-foot',dog);
  sphere(foot,0,.031,0,.032,.031,.041,black);
  dogLegs.push({side,end,hip,upper,knee,lower,foot});
}

const START = new THREE.Vector3(-.02,0,2.95);
const ROUTE_YAW = -.38;
const APPROACH = 1.05, RADIUS = .62, TURN = Math.PI/2*RADIUS, EXIT = 2.23;
const LENGTH = APPROACH+TURN+EXIT;
const TURN_START_Z=START.z-APPROACH;
function unrotatedRoute(distance) {
  const d=THREE.MathUtils.clamp(distance,0,LENGTH);
  if(d<APPROACH) return {position:new THREE.Vector3(START.x,0,START.z-d),yaw:0};
  if(d<APPROACH+TURN) {
    const theta=(d-APPROACH)/RADIUS;
    return {position:new THREE.Vector3(START.x+RADIUS*(1-Math.cos(theta)),0,TURN_START_Z-RADIUS*Math.sin(theta)),yaw:-theta};
  }
  return {position:new THREE.Vector3(START.x+RADIUS+d-APPROACH-TURN,0,TURN_START_Z-RADIUS),yaw:-Math.PI/2};
}
function route(distance) {
  const state=unrotatedRoute(distance);
  state.position.sub(START).applyAxisAngle(new THREE.Vector3(0,1,0),ROUTE_YAW).add(START);
  state.yaw+=ROUTE_YAW;
  return state;
}
function navigation(t) {
  const u=THREE.MathUtils.clamp(t/4.72,0,1);
  const p=u*u*(3-2*u);
  const d=p*LENGTH;
  return {...route(d),distance:d,progress:p};
}
let nav=navigation(0), activeVariant='568', currentTime=0;
function worldFoot(distance,lateral,fore) {
  const r=route(distance);
  return new THREE.Vector3(lateral,0,fore).applyAxisAngle(new THREE.Vector3(0,1,0),r.yaw).add(r.position);
}
function gaitFootWorld(distance,lateral,fore,offset,step,swingHeight) {
  const phase=distance/step+offset;
  const n=Math.floor(phase), f=phase-n;
  const a=(n-offset+.30)*step, b=(n+1-offset+.30)*step;
  let p, yaw;
  if(f<.60) {
    p=worldFoot(a,lateral,fore);
    yaw=route(a).yaw;
  }
  else {
    const u=(f-.60)/.40;
    const v=u*u*(3-2*u);
    p=worldFoot(a,lateral,fore).lerp(worldFoot(b,lateral,fore),v);
    p.y=swingHeight*Math.sin(Math.PI*u);
    yaw=THREE.MathUtils.lerp(route(a).yaw,route(b).yaw,v);
  }
  return {position:p,yaw};
}
function footTarget(t,lateral,fore,offset,step,swingHeight,scale=1,firstSettlingOffset=0) {
  const settleStart=offset===firstSettlingOffset?4.18:4.60;
  let state=gaitFootWorld(nav.distance,lateral*scale,fore*scale,offset,step,swingHeight);
  if(t>=settleStart) {
    const start=gaitFootWorld(navigation(settleStart).distance,lateral*scale,fore*scale,offset,step,swingHeight);
    const u=THREE.MathUtils.clamp((t-settleStart)/.39,0,1),v=u*u*(3-2*u);
    state.position=start.position.clone().lerp(worldFoot(LENGTH,lateral*scale,fore*scale),v);
    state.position.y=start.position.y*(1-v)+swingHeight*.65*Math.sin(Math.PI*u);
    state.yaw=THREE.MathUtils.lerp(start.yaw,route(LENGTH).yaw,v);
  }
  state.position.sub(nav.position).applyAxisAngle(new THREE.Vector3(0,1,0),-nav.yaw).divideScalar(scale);
  state.yaw-=nav.yaw;
  return state;
}
function solveLeg(leg,hipPos,footState,l1,l2,bendSign,ankleHeight=.08) {
  const footPos=footState.position;
  const end=footPos.clone();end.y+=ankleHeight;
  const delta=end.clone().sub(hipPos);
  const dist=Math.min(delta.length(),l1+l2-.0001);
  const dir=delta.normalize();
  const along=(l1*l1-l2*l2+dist*dist)/(2*dist);
  const height=Math.sqrt(Math.max(0,l1*l1-along*along));
  const preferred=new THREE.Vector3(0,0,bendSign);
  const bend=preferred.addScaledVector(dir,-preferred.dot(dir)).normalize();
  const k=hipPos.clone().addScaledVector(dir,along).addScaledVector(bend,height);
  leg.hip.position.copy(hipPos);leg.knee.position.copy(k);
  leg.upper.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),k.clone().sub(hipPos).normalize());
  leg.lower.quaternion.setFromUnitVectors(new THREE.Vector3(0,-1,0),end.clone().sub(k).normalize());
  leg.foot.position.copy(footPos);
  leg.foot.rotation.y=footState.yaw;
}
function poseRobots(t) {
  const d=nav.distance;
  const activity=THREE.MathUtils.smoothstep(t,0,.3)*(1-THREE.MathUtils.smoothstep(t,4.2,5.0));
  const wave=Math.sin(d/1.0*Math.PI*2);
  humanBody.position.y=.008*activity*Math.cos(d/1.0*Math.PI*4);
  humanBody.rotation.z=.015*activity*wave;
  for(const arm of arms) {
    arm.a.rotation.x=arm.side*.25*wave*activity;
    arm.elbow.rotation.x=-.14-Math.max(0,-arm.side*wave)*.13*activity;
  }
  for(const leg of humanLegs) {
    const foot=footTarget(t,leg.side*.135,0,leg.side<0?0:.5,1.0,.11,1.14,.5);
    solveLeg(leg,new THREE.Vector3(leg.side*.135,.94+humanBody.position.y,0),foot,.47,.47,-1);
  }
  dogBody.position.y=-.052+.007*activity*Math.cos(d/.72*Math.PI*4);
  dogBody.rotation.z=.013*activity*Math.sin(d/.72*Math.PI*2);
  for(const leg of dogLegs) {
    const width=leg.end<0?.37:.245;
    const foot=footTarget(t,leg.side*width,leg.end*.275,leg.side*leg.end<0?0:.5,.72,.072,1.12);
    solveLeg(leg,new THREE.Vector3(leg.side*.224,.645+dogBody.position.y,leg.end*.248),foot,.32,.34,leg.end<0?1:-1,.035);
  }
}
function cameraAt(t) {
  const u=THREE.MathUtils.clamp(t/DURATION,0,1);
  camera.position.set(-.3+.14*u,3.05-.025*u,6.2-.14*u);
  camera.fov=59;
  camera.lookAt(.65+.08*u,.60,-.5);
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
}
function seek(seconds) {
  if(!Number.isFinite(seconds)) throw new TypeError('seek requires a finite number');
  currentTime=THREE.MathUtils.clamp(seconds,0,DURATION);
  nav=navigation(currentTime);
  robotRig.position.copy(nav.position);robotRig.rotation.set(0,nav.yaw,0);
  human.visible=activeVariant==='568';dog.visible=activeVariant==='567';
  poseRobots(currentTime);cameraAt(currentTime);
  scene.updateMatrixWorld(true);renderer.render(scene,camera);
}
function getCameraState() {
  return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};
}
function getNavigationState() {
  return {position:nav.position.toArray(),yaw:nav.yaw,traveledDistance:nav.distance,pathProgress:nav.progress,
    start:START.toArray(),goal:route(LENGTH).position.toArray(),pathLength:LENGTH};
}
function serializedObject(o) {
  const state={name:o.name,type:o.type,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),visible:o.visible,castShadow:o.castShadow,receiveShadow:o.receiveShadow};
  if(o.geometry) {
    state.geometry={type:o.geometry.type,parameters:o.geometry.parameters||null};
    if(!o.geometry.parameters) state.geometry.attributes=Object.fromEntries(Object.entries(o.geometry.attributes).map(([k,a])=>[k,{itemSize:a.itemSize,array:Array.from(a.array)}]));
  }
  if(o.material) {
    const serializeMaterial=m=>({type:m.type,name:m.name,color:m.color?.getHex(),emissive:m.emissive?.getHex(),emissiveIntensity:m.emissiveIntensity,roughness:m.roughness,metalness:m.metalness,opacity:m.opacity,transparent:m.transparent,side:m.side,proceduralSurface:m.userData.proceduralSurface||null});
    state.material=Array.isArray(o.material)?o.material.map(serializeMaterial):serializeMaterial(o.material);
  }
  if(o.isLight) {
    state.light={color:o.color.getHex(),intensity:o.intensity,distance:o.distance,decay:o.decay,groundColor:o.groundColor?.getHex(),castShadow:o.castShadow};
    if(o.shadow) state.light.shadow={bias:o.shadow.bias,normalBias:o.shadow.normalBias,radius:o.shadow.radius,mapSize:o.shadow.mapSize.toArray(),camera:{near:o.shadow.camera.near,far:o.shadow.camera.far,left:o.shadow.camera.left,right:o.shadow.camera.right,top:o.shadow.camera.top,bottom:o.shadow.camera.bottom}};
    if(o.target) state.light.target=o.target.position.toArray();
  }
  state.children=o.children.filter(child=>child!==robotRig).map(serializedObject);
  return state;
}
window.reconstruction={
  pause(){return currentTime;},
  seek,
  setVariant(id){
    if(id!=='568'&&id!=='567') throw new RangeError('variant must be "568" or "567"');
    if(id===activeVariant) return;
    activeVariant=id;seek(currentTime);
  },
  getCameraState,
  getNavigationState,
  getInvariantState(){
    return {navigation:getNavigationState(),camera:getCameraState(),world:serializedObject(scene),
      rendering:{width:WIDTH,height:HEIGHT,exposure:renderer.toneMappingExposure,toneMapping:renderer.toneMapping,outputColorSpace:renderer.outputColorSpace,background:scene.background.getHex(),shadowMap:renderer.shadowMap.type}};
  },
  getEditedObjectState(){
    const legs=activeVariant==='568'?humanLegs:dogLegs;
    const bounds=new THREE.Box3().setFromObject(activeVariant==='568'?human:dog);
    const reachErrors=legs.map(leg=>{
      const lowerEnd=new THREE.Vector3(0,activeVariant==='568'?-.47:-.34,0).applyQuaternion(leg.lower.quaternion).add(leg.knee.position);
      const ankle=leg.foot.position.clone().add(new THREE.Vector3(0,activeVariant==='568'?.08:.035,0));
      return lowerEnd.distanceTo(ankle);
    });
    return {variant:activeVariant,embodiment:activeVariant==='568'?'humanoid':'quadruped',
      root:{position:robotRig.position.toArray(),quaternion:robotRig.quaternion.toArray()},
      rig:serializedObject(activeVariant==='568'?human:dog),
      bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
      contacts:legs.map(leg=>({position:leg.foot.getWorldPosition(new THREE.Vector3()).toArray(),yaw:leg.foot.rotation.y+nav.yaw})),
      maximumLegReachError:Math.max(...reachErrors)};
  }
};
seek(0);
