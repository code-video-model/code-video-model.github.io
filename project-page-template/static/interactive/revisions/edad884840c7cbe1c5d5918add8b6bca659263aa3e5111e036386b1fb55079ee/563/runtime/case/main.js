import * as THREE from '../vendor/three.module.js';

const W = 960, H = 540, END = 123 / 24;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#e5e9eb');
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(W, H);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(57, W / H, 0.05, 70);
const world = new THREE.Group();
world.name = 'shared-laboratory';
scene.add(world);
const robotRig = new THREE.Group();
robotRig.name = 'robotRig';
scene.add(robotRig);
const materials = {};
function mat(name, color, roughness = .55, metalness = 0, extra = {}) { window.__bfTrace?.add(23);
  const m = new THREE.MeshStandardMaterial({ color, roughness, metalness, ...extra });
  m.name = name;
  materials[name] = m;
  return m;
}
const white = mat('warm-white-lab', '#f0efeb', .8);
const counter = mat('counter-porcelain', '#cbd0cf', .5);
const black = mat('black-steel', '#181d22', .35, .65);
const cabinet = mat('graphite-cabinets', '#3b4248', .5, .35);
const rubber = mat('rubber-joints', '#0b1015', .7);
const silver = mat('anodized-aluminum', '#aeb9c0', .28, .75);
const shell = mat('robot-silver-shell', '#bec6ce', .28, .62);
const shellWhite = mat('robot-white-shell', '#e0e3e3', .3, .42);
const headMat = mat('black-gloss-head', '#090f16', .13, .66);
const navy = mat('navy-parts-organizer', '#112442', .46, .25);
const blue = mat('blue-utility-rail', '#1975b1', .5, .25);
const cyan = mat('blue-navigation', '#2c95df', .65, 0, { emissive: '#167ec0', emissiveIntensity: .40 });
const led = mat('blue-status-lights', '#168aff', .2, .1, { emissive: '#007aff', emissiveIntensity: 1.0 });
const screen = mat('display-blue', '#12456d', .3, .1, { emissive: '#137dc0', emissiveIntensity: .4 });
const wood = mat('pale-oak', '#b08c68', .66);
const floor = mat('grey-speckled-carpet', '#67696c', 1);
function grain(material, kind) { window.__bfTrace?.add(45);
  material.userData.proceduralPattern = kind;
  material.onBeforeCompile = shader => {
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vPattern;').replace('#include <begin_vertex>', '#include <begin_vertex>\nvPattern = position;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vPattern;
      float noiseHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}`);
    const pattern = kind === 'carpet'
      ? 'float n=noiseHash(floor(vPattern*1100.0)); diffuseColor.rgb*=0.73+0.48*n;'
      : 'float n=noiseHash(floor(vPattern*vec3(18.0,25.0,420.0))); float g=sin(vPattern.z*170.0+sin(vPattern.x*3.0)*2.0); diffuseColor.rgb*=0.94+0.07*n+0.025*g;';
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + pattern);
  };
  material.customProgramCacheKey = () => kind;
}
grain(wood, 'oak');
grain(floor, 'carpet');
function mesh(geo, material, parent, name) { window.__bfTrace?.add(61);
  const o = new THREE.Mesh(geo, material);
  o.name = name || material.name;
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}
function box(parent, name, xyz, size, material, rot = null) { window.__bfTrace?.add(69);
  const o = mesh(new THREE.BoxGeometry(...size), material, parent, name);
  o.position.set(...xyz);
  if (rot) o.rotation.set(...rot);
  return o;
}
function sphere(parent, name, xyz, size, material) { window.__bfTrace?.add(75);
  const o = mesh(new THREE.SphereGeometry(1, 28, 20), material, parent, name);
  o.position.set(...xyz);
  o.scale.set(...size);
  return o;
}
function cyl(parent, name, xyz, rt, rb, height, material, rot = null) { window.__bfTrace?.add(81);
  const o = mesh(new THREE.CylinderGeometry(rt, rb, height, 32), material, parent, name);
  o.position.set(...xyz);
  if (rot) o.rotation.set(...rot);
  return o;
}
function bar(parent, name, a, b, radius, material) { window.__bfTrace?.add(87);
  const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
  const o = cyl(parent, name, va.clone().add(vb).multiplyScalar(.5).toArray(), radius, radius, va.distanceTo(vb), material);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.sub(va).normalize());
  return o;
}
function torus(parent, name, xyz, radius, tube, material, rotation = [Math.PI / 2, 0, 0]) { window.__bfTrace?.add(93);
  const o = mesh(new THREE.TorusGeometry(radius, tube, 10, 56), material, parent, name);
  o.position.set(...xyz); o.rotation.set(...rotation); return o;
}
function cable(parent, points, radius = .012, material = rubber) { window.__bfTrace?.add(97);
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 40, radius, 7, false), material, parent, 'connected-cable');
}
function group(parent, name, xyz = [0,0,0]) { window.__bfTrace?.add(100);
  const g = new THREE.Group(); g.name = name; g.position.set(...xyz); parent.add(g); return g;
}
const contactMaterial=mat('soft-contact-occlusion','#14191d',1,0,{transparent:true,opacity:.30,depthWrite:false});
contactMaterial.userData.proceduralPattern='radial-contact-falloff';
contactMaterial.onBeforeCompile=shader=>{
  shader.vertexShader=shader.vertexShader.replace('#include <common>','#include <common>\nvarying vec2 vContact;').replace('#include <begin_vertex>','#include <begin_vertex>\nvContact=position.xy;');
  shader.fragmentShader=shader.fragmentShader.replace('#include <common>','#include <common>\nvarying vec2 vContact;').replace('#include <color_fragment>','#include <color_fragment>\ndiffuseColor.a*=pow(max(0.0,1.0-length(vContact)),1.6);');
};
contactMaterial.customProgramCacheKey=()=> 'radial-contact-falloff';
function contact(parent,name,x,z,sx,sz){ window.__bfTrace?.add(110);
  const o=mesh(new THREE.CircleGeometry(1,40),contactMaterial,parent,name);
  o.position.set(x,.008,z);o.rotation.x=-Math.PI/2;o.scale.set(sx,sz,1);
  o.castShadow=false;o.receiveShadow=false;
  return o;
}
// Tiny labels are generated from line geometry, without image assets.
const segments = { '0': [0,1,2,3,4,5], '1':[1,2] };
const ends = [[[-.5,1],[.5,1]],[[.5,1],[.5,0]],[[.5,0],[.5,-1]],[[-.5,-1],[.5,-1]],[[-.5,0],[-.5,-1]],[[-.5,1],[-.5,0]]];
function label001(parent, xyz, scale, rotation = [0,0,0]) { window.__bfTrace?.add(119);
  const g = group(parent,'001-marking',xyz); g.rotation.set(...rotation);
  for (let i=0;i<3;i++) for (const s of segments['001'[i]]) {
    const a=ends[s][0],b=ends[s][1];
    bar(g,'label-stroke',[(a[0]+(i-1)*1.55)*scale,a[1]*scale,0],[(b[0]+(i-1)*1.55)*scale,b[1]*scale,0],scale*.12,shellWhite);
  }
}

box(world,'carpet-floor',[0,-.065,0],[17,.12,19],floor);
box(world,'rear-white-wall',[0,3,-4.45],[22,6,.15],white);
box(world,'left-white-wall',[-4.2,1.9,1.0],[.15,3.8,11],white);
box(world,'near-left-wall-return',[-3.94,1.9,3.70],[.60,3.8,5.40],white);
box(world,'near-left-wall-skirting',[-3.625,.08,3.70],[.035,.16,5.40],cabinet);
box(world,'left-skirting',[-4.1,.08,1],[.035,.16,11],cabinet);
box(world,'back-skirting',[0,.08,-4.34],[13,.16,.035],cabinet);
// Exit is a shallow geometric vista behind two dark framed glass doors.
const doorX=-2.25, doorZ=-4.31;
const doorGlass=mat('exit-tinted-glass','#788e98',.16,.22);
const outdoor=mat('diffuse-outdoor','#c9d8d6',1,0,{emissive:'#879da1',emissiveIntensity:.45});
box(world,'exit-light-vista',[doorX,1.38,doorZ+.008],[1.9,2.76,.035],outdoor);
for (const dx of [-.48,.48]) {
  box(world,'exit-glass-pane',[doorX+dx,1.39,doorZ+.045],[.88,2.63,.025],doorGlass);
  box(world,'exit-lower-daylight',[doorX+dx,.58,doorZ+.062],[.84,.92,.006],outdoor);
  box(world,'exit-exterior-column',[doorX+dx-.19,2.04,doorZ+.065],[.10,1.19,.012],counter);
  box(world,'exit-exterior-building',[doorX+dx+.20,2.31,doorZ+.068],[.25,.62,.012],counter);
  for(let i=0;i<6;i++){
    const plant=mat('vista-foliage-'+dx+'-'+i,i%2?'#687e6c':'#8e9d81',1);
    sphere(world,'muted-exterior-foliage',[doorX+dx-.21+Math.sin(i*3)*.04,1.53+i*.145,doorZ+.081],[.08,.13,.007],plant);
  }
}
for(const dx of [-.98,0,.98]) box(world,'exit-black-mullion',[doorX+dx,1.40,doorZ+.11],[.065,2.8,.075],black);
for(const y of [.045,2.78]) box(world,'exit-black-header',[doorX,y,doorZ+.11],[2.03,.07,.09],black);
box(world,'exit-crash-bar',[doorX,1.31,doorZ+.16],[1.90,.035,.045],silver);
for(const dx of [-.06,.06]) bar(world,'exit-handle',[doorX+dx,1.12,doorZ+.23],[doorX+dx,1.56,doorZ+.23],.018,silver);
box(world,'access-reader',[-.95,1.43,-4.19],[.1,.14,.06],black);
box(world,'access-green-led',[-.95,1.46,-4.153],[.058,.037,.006],mat('access-green','#25b890',.4,0,{emissive:'#188853',emissiveIntensity:.5}));
const rack=group(world,'narrow-empty-black-rack',[-3.72,0,-3.56]);
for(const x of [-.2,.2]) for(const z of [-.17,.17]) box(rack,'rack-upright',[x,1.03,z],[.035,2.06,.035],black);
for(const y of [.22,1.94]) box(rack,'rack-shelf',[0,y,0],[.47,.06,.42],black);
box(world,'left-side-door-trim',[-4.1,1.4,-1.25],[.055,2.8,.065],blue);

// Long rear counter, utility strip, sink, organizers and pegboard.
const rearStart=world.children.length;
box(world,'rear-base-cabinets',[2.45,.45,-3.82],[6.0,.88,.88],white);
box(world,'rear-countertop',[2.45,.92,-3.79],[6.15,.075,1.02],counter);
for(let i=0;i<8;i++){
  const x=-.15+i*.74;
  for (const y of [.25,.62,.80]) {
    box(world,'rear-drawer',[x,y,-3.357],[.70,y===.25?.39:.16,.03],white);
    bar(world,'rear-drawer-pull',[x-.115,y+.01,-3.318],[x+.115,y+.01,-3.318],.011,silver);
  }
}
box(world,'blue-horizontal-utility-strip',[2.32,1.43,-4.335],[6.4,.115,.05],blue);
for(let i=0;i<8;i++) {
  box(world,'utility-socket',[.03+i*.70,1.432,-4.299],[.065,.068,.01],counter);
  for(const dx of [-.015,.015]) sphere(world,'socket-hole',[.03+i*.70+dx,1.433,-4.289],[.004,.01,.003],black);
}
box(world,'sink-inset',[2.5,.965,-3.81],[.70,.015,.47],black);
box(world,'sink-basin',[2.5,.968,-3.8],[.54,.012,.35],silver);
cable(world,[[2.63,.98,-4.03],[2.63,1.21,-4.03],[2.51,1.26,-4.03],[2.44,1.19,-4.03]],.018,silver);
const bottle=group(world,'black-water-bottle',[3.03,.97,-3.79]);
cyl(bottle,'bottle',[0,.145,0],.055,.057,.28,rubber);
cyl(bottle,'bottle-lid',[0,.305,0],.026,.037,.05,black);
const parts=group(world,'dark-blue-small-parts-cabinet',[5.18,.97,-3.89]);
box(parts,'organizer-case',[0,.48,0],[.56,.96,.34],navy);
for(let i=0;i<8;i++) for(let j=0;j<2;j++){
  box(parts,'small-parts-drawer',[-.136+j*.271,.07+i*.112,.182],[.245,.09,.03],cabinet);
  box(parts,'parts-bin-label',[-.136+j*.271,.068+i*.112,.201],[.095,.023,.003],silver);
}
box(world,'pegboard',[5.96,1.58,-4.14],[.85,1.22,.045],silver);
for(let i=0;i<10;i++) for(let j=0;j<15;j++) sphere(world,'pegboard-perforation',[5.595+i*.08,1.04+j*.077,-4.11],[.009,.009,.004],black);
for(let i=0;i<5;i++){
  const x=5.7+i*.12,y=1.40+(i%2)*.29;
  bar(world,'hanging-tool',[x,y,-4.04],[x,y+.28,-4.04],.012,silver);
  bar(world,'tool-grip',[x,y-.09,-4.04],[x,y+.02,-4.04],.023,i===1?mat('red-grip','#9b2521'):rubber);
}
box(world,'wall-monitor-frame',[1.97,2.05,-4.32],[.88,.64,.065],black);
box(world,'wall-monitor',[1.97,2.05,-4.28],[.81,.57,.012],mat('wall-monitor-blue','#739cbd',.65,0,{emissive:'#426786',emissiveIntensity:.2}));
for(let i=0;i<8;i++) box(world,'monitor-schematic',[1.7+(i%4)*.16,1.91+Math.floor(i/4)*.21,-4.267],[.085,.014,.006],counter);
const rearObjects=world.children.slice(rearStart);
const rearZone=group(world,'rear-counter-and-utility-zone',[.85,0,.40]);
rearZone.scale.y=.90;
rearObjects.forEach(o=>rearZone.add(o));

const bench=group(world,'central-black-drawer-island',[.70,0,1.44]);
bench.rotation.y=.14;
bench.scale.y=1.20;
bench.scale.z=.90;
box(bench,'broad-wooden-worktop',[0,1.02,0],[3.85,.095,2.72],wood);
box(bench,'worktop-edge-shadow',[0,.956,0],[3.83,.025,2.7],black);
for(const x of [-1.79,1.79]) for(const z of [-1.23,1.23]){
  box(bench,'square-black-table-leg',[x,.47,z],[.085,.94,.085],black);
  cyl(bench,'adjustable-table-foot',[x,.026,z],.068,.071,.035,silver);
}
for(const z of [-1.23,1.23]) {
  box(bench,'bench-top-rail',[0,.902,z],[3.64,.105,.07],black);
  box(bench,'bench-bottom-rail',[0,.14,z],[3.64,.06,.06],black);
}
box(bench,'under-worktop-cabinet',[0,.49,0],[3.40,.75,2.25],cabinet);
for(let i=0;i<3;i++){
  const x=-1.10+i*1.1;
  box(bench,'front-cabinet-door',[x,.51,1.146],[1.065,.70,.034],cabinet);
  box(bench,'front-door-hinge',[x-.48,.70,1.174],[.022,.08,.028],black);
  bar(bench,'front-door-pull',[x+.39,.48,1.184],[x+.39,.61,1.184],.013,silver);
}
for(let i=0;i<7;i++){
  box(bench,'side-tool-drawer',[-1.717,.22+i*.09,-.43],[.024,.077,1.22],cabinet);
  box(bench,'side-drawer-handle',[-1.738,.243+i*.09,-.43],[.028,.013,1.06],silver);
}
box(bench,'side-cabinet-door',[-1.722,.50,.70],[.034,.69,.88],cabinet);
torus(bench,'side-cabinet-lock',[-1.747,.59,.81],.018,.005,silver,[0,Math.PI/2,0]);
function stool(name,x,z){ window.__bfTrace?.add(230);
  const g=group(world,name,[x,0,z]);
  cyl(g,'round-wood-seat',[0,.71,0],.29,.28,.052,wood);
  cyl(g,'seat-black-mount',[0,.646,0],.12,.09,.075,black);
  cyl(g,'stool-stem',[0,.42,0],.026,.026,.45,black);
  for(let i=0;i<4;i++){
    const a=Math.PI/4+i*Math.PI/2;
    bar(g,'splayed-stool-leg',[Math.cos(a)*.115,.64,Math.sin(a)*.115],[Math.cos(a)*.26,.028,Math.sin(a)*.26],.025,black);
  }
  torus(g,'round-foot-ring',[0,.22,0],.26,.015,black);
  g.scale.y=1.18;
  contact(g,'stool-contact-occlusion',0,0,.36,.36);
}
stool('aisle-wood-stool',-1.45,1.44);
stool('foreground-wood-stool',-.14,3.08);
const laptop=group(bench,'open-laptop',[-.42,1.074,1.05]);
laptop.rotation.y=2.70;
laptop.scale.setScalar(.70);
box(laptop,'laptop-keyboard-base',[0,.019,0],[.62,.025,.41],black);
box(laptop,'keyboard-deck',[0,.034,-.045],[.55,.007,.25],silver);
for(let i=0;i<12;i++) for(let j=0;j<4;j++) box(laptop,'laptop-key',[ -.249+i*.045,.04,-.145+j*.052],[.033,.004,.034],black);
box(laptop,'trackpad',[0,.039,.123],[.19,.004,.082],cabinet);
const lid=group(laptop,'tilted-laptop-screen',[0,.035,-.19]);
lid.rotation.x=-.30;
box(lid,'laptop-lid',[0,.215,0],[.62,.43,.017],cabinet);
box(lid,'laptop-display',[0,.215,.011],[.568,.376,.005],screen);
for(let i=0;i<5;i++) box(lid,'display-code-lines',[-.12,.32-i*.043,.015],[.19+i*.027,.009,.002],cyan);
sphere(lid,'laptop-back-logo',[0,.21,-.013],[.025,.025,.004],silver);
const power=group(bench,'four-way-power-block',[-.98,1.105,1.04]);
box(power,'power-strip',[0,.055,0],[.34,.11,.17],counter);
for(let i=0;i<4;i++){
  cyl(power,'power-socket-front',[-.124+i*.083,.056,.09],.029,.029,.007,black,[Math.PI/2,0,0]);
  for(const dx of [-.009,.009]) sphere(power,'socket-pin',[-.124+i*.083+dx,.058,.095],[.003,.006,.002],silver);
}
cable(bench,[[-.84,1.12,1.04],[-.65,1.09,.90],[-.32,1.10,.92],[-.22,1.10,1.05]],.012);
cable(bench,[[-.22,1.10,1.05],[.05,1.09,.95],[.29,1.10,1.14],[.18,1.09,1.08]],.009);
box(bench,'connected-instrument',[.18,1.11,1.08],[.21,.065,.12],cabinet);
const gantry=group(bench,'small-gantry-test-fixture',[-.50,1.075,-.68]);
gantry.position.z=-1.0;
gantry.scale.set(.80,.62,.80);
for(const x of [-.35,.35]){
  box(gantry,'gantry-base',[x,.025,0],[.075,.05,.62],silver);
  box(gantry,'gantry-upright',[x,.41,-.14],[.055,.82,.055],silver);
  for(let i=0;i<9;i++) sphere(gantry,'extrusion-hole',[x,.09+i*.08,-.108],[.009,.009,.003],black);
}
box(gantry,'gantry-crossbar',[0,.68,-.14],[.78,.067,.063],silver);
box(gantry,'gantry-slider',[.07,.55,-.10],[.07,.25,.085],cabinet);
box(gantry,'blue-test-block',[.07,.08,-.03],[.16,.11,.13],blue);
box(gantry,'instrument-control',[.45,.038,.30],[.28,.06,.19],black);
cyl(gantry,'red-stop-button',[.5,.085,.31],.028,.028,.04,mat('red-stop','#b52521',.4));
cable(gantry,[[.07,.68,-.09],[.35,1.02,-.16],[.45,.64,-.07],[.29,.2,.17],[.45,.07,.31]],.01);
box(bench,'small-blue-connected-device',[-.36,1.10,.67],[.17,.045,.13],blue);
cable(bench,[[-.36,1.13,.69],[-.33,1.26,.69],[-.40,1.28,.71],[-.41,1.13,.73]],.006,silver);
const kiosk=group(world,'charging-kiosk',[-3.38,0,1.92]);
box(kiosk,'charger-tower',[0,.74,0],[.24,1.48,.25],black);
box(kiosk,'charger-face',[.012,1.19,.138],[.22,.48,.027],silver);
box(kiosk,'upper-display',[.012,1.28,.157],[.155,.23,.015],screen);
box(kiosk,'lower-blue-screen',[.012,.99,.157],[.16,.23,.015],screen);
for(let j=0;j<3;j++) box(kiosk,'charging-screen-bars',[.012,1.04-j*.055,.168],[.1-j*.025,.012,.004],led);
torus(kiosk,'screen-charge-indicator',[.012,1.29,.169],.048,.004,led,[0,0,0]);
box(kiosk,'battery-outline',[.012,1.288,.172],[.026,.048,.003],counter);
box(kiosk,'battery-blue-fill',[.012,1.281,.175],[.018,.030,.003],led);
box(kiosk,'battery-positive-terminal',[.012,1.314,.172],[.012,.005,.003],counter);
box(kiosk,'dock-base',[.07,.056,.21],[.47,.10,.70],black);
box(kiosk,'dock-slope',[.07,.13,.24],[.36,.10,.42],cabinet,[-.08,0,0]);
box(kiosk,'dock-blue-edge',[.07,.14,.458],[.34,.018,.015],led);
box(kiosk,'dock-side-light',[.252,.15,.20],[.009,.018,.37],led);
cable(world,[[-3.38,1.41,1.92],[-3.42,1.64,1.97],[-3.61,1.63,2.05]],.012);
box(world,'charging-wall-socket',[-3.606,1.63,2.05],[.025,.12,.11],white);

const points=[[-2.78,0,2.15],[-2.72,0,1.77],[-2.11,0,.68],[-1.94,0,-.36],[-2.51,0,-1.90],[-2.22,0,-3.73]];
const route = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'catmullrom',.40);
route.arcLengthDivisions=1200;
const routeLength=route.getLength();
const routePaint=group(world,'shared-dashed-soft-blue-route');
// The painted route extends into the foreground, as in the opening photograph.
const paintRoute=new THREE.CatmullRomCurve3([new THREE.Vector3(-2.55,0,4.2),new THREE.Vector3(-1.97,0,2.15),...points.slice(2).map(p=>new THREE.Vector3(...p))],false,'catmullrom',.42);
const paintLength=paintRoute.getLength();
for(let d=0;d<paintLength;d+=.32){
  const p=paintRoute.getPointAt(d/paintLength), tangent=paintRoute.getTangentAt(d/paintLength);
  const dash=box(routePaint,'navigation-dash',[p.x,.004,p.z],[.11,.002,.17],cyan);
  dash.rotation.y=Math.atan2(tangent.x,tangent.z);
  dash.castShadow=false;
}
const hemi=new THREE.HemisphereLight('#f6f7fa','#96918b',2.4); hemi.name='overhead-diffuse'; scene.add(hemi);
const sun=new THREE.DirectionalLight('#fff5e6',1.1); sun.name='door-daylight'; sun.position.set(-3.0,7,-4);
sun.castShadow=true; sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-7; sun.shadow.camera.right=7;sun.shadow.camera.top=7;sun.shadow.camera.bottom=-7;
sun.shadow.normalBias=.008; sun.shadow.bias=-.00008; sun.shadow.radius=4; scene.add(sun);
const fill=new THREE.DirectionalLight('#eef4ff',1.0);fill.name='ceiling-fill';fill.position.set(1,5,4);scene.add(fill);
const environmentScene=new THREE.Scene();
environmentScene.background=new THREE.Color('#9b9fa4');
const envWhite=new THREE.MeshBasicMaterial({color:'#ffffff'});
const envDark=new THREE.MeshBasicMaterial({color:'#5d6063'});
box(environmentScene,'environment-floor',[0,-3,0],[12,.1,12],envDark);
for(const x of [-2,2]) box(environmentScene,'ceiling-reflection-panel',[x,4,0],[1.2,.1,5],envWhite);
box(environmentScene,'window-reflection-panel',[-4,1,-3],[.1,4,4],envWhite);
const pmrem=new THREE.PMREMGenerator(renderer);
scene.environment=pmrem.fromScene(environmentScene,.06).texture;
pmrem.dispose();
for(const m of Object.values(materials)) m.envMapIntensity=.32;
contact(world,'island-ground-contact',.68,1.30,2.1,1.7);

function link(parent,name,radius,material){ window.__bfTrace?.add(332);
  return cyl(parent,name,[0,0,0],radius,radius,1,material);
}
function placeLink(o,a,b){ window.__bfTrace?.add(335);
  o.position.copy(a).add(b).multiplyScalar(.5);
  o.scale.y=a.distanceTo(b);
  o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),b.clone().sub(a).normalize());
}
function limb(parent,name,r1,r2,len1,len2){ window.__bfTrace?.add(340);
  const g=group(parent,name);
  return {group:g,l1:len1,l2:len2,upper:link(g,'upper-shell',r1,shell),lower:link(g,'lower-shell',r2,shellWhite),
    joint:sphere(g,'black-knee-or-elbow',[0,0,0],[r1*1.12,r1*1.12,r1*1.12],rubber),
    hip:sphere(g,'black-hip-or-shoulder',[0,0,0],[r1*1.22,r1*1.22,r1*1.22],headMat),
    ankle:sphere(g,'black-ankle',[0,0,0],[r2,r2,r2],rubber)};
}
function solveLimb(l,a,b,bend){ window.__bfTrace?.add(347);
  const dir=b.clone().sub(a),d=Math.min(dir.length(),l.l1+l.l2-.0001);
  l.group.userData.reachError=Math.max(0,dir.length()-l.l1-l.l2);
  dir.normalize();
  const side=bend.clone().addScaledVector(dir,-bend.dot(dir)).normalize();
  const projection=(l.l1*l.l1-l.l2*l.l2+d*d)/(2*d);
  const mid=a.clone().addScaledVector(dir,projection).addScaledVector(side,Math.sqrt(Math.max(0,l.l1*l.l1-projection*projection)));
  placeLink(l.upper,a,mid);placeLink(l.lower,mid,b);
  l.hip.position.copy(a);l.joint.position.copy(mid);l.ankle.position.copy(b);
}
function buildHuman(){ window.__bfTrace?.add(357);
  const root=group(robotRig,'humanoid-564');
  const body=group(root,'humanoid-body');
  sphere(body,'pelvis',[0,.80,0],[.155,.12,.12],black);
  cyl(body,'waist',[0,.91,0],.13,.14,.13,rubber);
  const torso=mesh(new THREE.CylinderGeometry(.195,.14,.40,12),shellWhite,body,'tapered-white-torso');
  torso.position.set(0,1.13,0);torso.scale.z=.60;
  box(body,'back-panel',[0,1.17,.132],[.155,.12,.025],cabinet);
  label001(body,[0,1.18,.149],.022);
  sphere(body,'upper-back-cover',[0,1.31,.043],[.155,.055,.092],shell);
  cyl(body,'neck',[0,1.385,0],.067,.07,.10,rubber);
  sphere(body,'round-black-head',[0,1.51,-.006],[.112,.14,.111],headMat);
  torus(body,'head-side-blue-ring',[.108,1.51,-.005],.043,.005,led,[0,Math.PI/2,0]);
  torus(body,'head-shell-seam',[0,1.54,-.006],.108,.002,cabinet,[Math.PI/2,0,0]);
  for(const x of [-.085,.085]) sphere(body,'back-fastener',[x,1.035,.109],[.009,.009,.004],silver);
  const legs=[],arms=[],feet=[];
  for(const side of [-1,1]){
    legs.push(limb(root,'leg-'+side,.065,.050,.40,.40));
    arms.push(limb(root,'arm-'+side,.055,.043,.25,.245));
    sphere(body,'shoulder-white-cover',[side*.20,1.285,.025],[.069,.080,.072],shell);
    const f=group(root,'humanoid-foot-'+side);
    box(f,'rubber-sole',[0,.024,-.045],[.115,.039,.225],rubber);
    sphere(f,'silver-boot',[0,.065,-.045],[.056,.054,.106],shell);
    box(f,'toe-panel',[0,.053,-.146],[.10,.041,.03],cabinet);
    f.userData.shadowIndex=feet.length;
    feet.push(f);
    const hand=group(root,'articulated-hand-'+side);
    box(hand,'palm',[0,0,0],[.074,.10,.046],black);
    for(let j=0;j<3;j++) box(hand,'fingers',[(j-1)*.024,-.07,-.005],[.017,.068,.024],rubber,[.12,0,0]);
    arms[arms.length-1].hand=hand;
  }
  const shadows=feet.map((f,i)=>contact(root,'foot-contact-'+i,0,0,.12,.19));
  return {root,body,legs,arms,feet,shadows};
}
function buildDog(){ window.__bfTrace?.add(391);
  const root=group(robotRig,'quadruped-563'),body=group(root,'quadruped-body');
  box(body,'compact-trunk',[0,.57,0],[.29,.19,.59],black);
  box(body,'silver-back-shell',[0,.664,0],[.305,.066,.53],shell);
  box(body,'back-dark-panel',[0,.703,0],[.23,.018,.41],cabinet);
  label001(body,[0,.715,.095],.019,[-Math.PI/2,0,0]);
  box(body,'forward-sensor-head',[0,.588,-.33],[.255,.145,.10],cabinet);
  for(const x of [-.077,.077]) {
    sphere(body,'blue-front-sensor',[x,.604,-.386],[.027,.022,.008],led);
    box(body,'blue-back-status',[x,.72,-.065],[.01,.008,.053],led);
  }
  const legs=[],feet=[];
  for(let i=0;i<4;i++){
    legs.push(limb(root,'quadruped-leg-'+i,.038,.029,.31,.32));
    const foot=sphere(root,'rubber-paw-'+i,[0,0,0],[.047,.035,.065],rubber);feet.push(foot);
    const side=i%2===0?-1:1,z=i<2?-.235:.235;
    cyl(body,'shoulder-motor',[side*.17,.58,z],.073,.073,.075,black,[0,0,Math.PI/2]);
    cyl(body,'motor-silver-cap',[side*.213,.58,z],.059,.059,.018,silver,[0,0,Math.PI/2]);
  }
  const shadows=feet.map((f,i)=>contact(root,'paw-contact-'+i,0,0,.09,.10));
  return {root,body,legs,feet,shadows};
}
const human=buildHuman(),dog=buildDog();
let variant='564',time=0, navigation;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=u=>u*u*(3-2*u);
function distanceAt(t){ window.__bfTrace?.add(417);
  const u=clamp(t/END,0,1);
  return routeLength*(.14*u+.86*smooth(u));
}
function navAt(t){ window.__bfTrace?.add(421);
  const d=distanceAt(t),p=route.getPointAt(d/routeLength),tan=route.getTangentAt(d/routeLength);
  return {p,yaw:Math.atan2(-tan.x,-tan.z),distance:d,progress:d/routeLength};
}
function worldFoot(t,side,offsetZ,phase,period,stance,lift){ window.__bfTrace?.add(425);
  const cycle=t/period+phase, k=Math.floor(cycle),q=cycle-k;
  const anchorTime=(k-phase+stance*.5)*period;
  function at(tt){
    const n=navAt(tt),p=new THREE.Vector3(side,0,offsetZ).applyAxisAngle(new THREE.Vector3(0,1,0),n.yaw).add(n.p);
    return p;
  }
  let p;
  if(q<stance) p=at(anchorTime);
  else {
    const u=(q-stance)/(1-stance);
    p=at(anchorTime).lerp(at(anchorTime+period),smooth(u));
    p.y=lift*Math.sin(Math.PI*u);
  }
  p.sub(robotRig.position).applyAxisAngle(new THREE.Vector3(0,1,0),-robotRig.rotation.y);
  const heading = q < stance ? navAt(anchorTime).yaw : THREE.MathUtils.lerp(navAt(anchorTime).yaw,navAt(anchorTime+period).yaw,smooth((q-stance)/(1-stance)));
  return {p,phase:q,stance:q<stance,heading:heading-robotRig.rotation.y};
}
function animateHuman(t){ window.__bfTrace?.add(443);
  const period=.62, bob=.012*Math.cos(4*Math.PI*t/period);
  human.body.position.y=bob;
  human.body.rotation.z=.018*Math.sin(2*Math.PI*t/period);
  for(let i=0;i<2;i++){
    const side=i===0?-1:1,f=worldFoot(t,side*.108,0,i*.5,period,.60,.095);
    const ankle=f.p.clone();ankle.y+=.11;
    solveLimb(human.legs[i],new THREE.Vector3(side*.108,.81+bob,0),ankle,new THREE.Vector3(0,0,-1));
    human.feet[i].position.copy(f.p);
    human.feet[i].rotation.y=f.heading;
    human.feet[i].rotation.x=f.stance?0:-.18*Math.sin(Math.PI*(f.phase-.6)/.4);
    human.feet[i].userData.contact={stance:f.stance,phase:f.phase};
    human.shadows[i].position.set(f.p.x,.008,f.p.z);
    human.shadows[i].visible=f.stance;
    const swing=Math.sin(2*Math.PI*t/period+i*Math.PI)*.15;
    const shoulder=new THREE.Vector3(side*.20,1.285+bob,0);
    const hand=new THREE.Vector3(side*.235,.83+bob,swing);
    solveLimb(human.arms[i],shoulder,hand,new THREE.Vector3(0,0,-1));
    human.arms[i].hand.position.copy(hand);
  }
}
function animateDog(t){ window.__bfTrace?.add(464);
  const period=.46,bob=.008*Math.cos(4*Math.PI*t/period);
  dog.body.position.y=bob;dog.body.rotation.x=.016*Math.sin(2*Math.PI*t/period);
  for(let i=0;i<4;i++){
    const side=i%2===0?-1:1,z=i<2?-.235:.235;
    const f=worldFoot(t,side*.205,z,(i===0||i===3)?0:.5,period,.62,.085);
    const ankle=f.p.clone();ankle.y+=.045;
    solveLimb(dog.legs[i],new THREE.Vector3(side*.20,.58+bob,z),ankle,new THREE.Vector3(0,0,i<2?1:-1));
    dog.feet[i].position.copy(f.p);dog.feet[i].position.y+=.036;
    dog.feet[i].rotation.y=f.heading;
    dog.feet[i].userData.contact={stance:f.stance,phase:f.phase};
    dog.shadows[i].position.set(f.p.x,.008,f.p.z);
    dog.shadows[i].visible=f.stance;
  }
}
function cameraAt(t){ window.__bfTrace?.add(479);
  const u=clamp(t/END,0,1);
  camera.position.set(-2.15+.30*u,2.20,5.12-.38*u);
  camera.lookAt(-.65+.08*u,-.57,-1.27-.10*u);
  camera.fov=46;camera.updateProjectionMatrix();
}
function seek(seconds){ window.__bfTrace?.add(485);
  if(!Number.isFinite(seconds)) throw new TypeError('seek requires a finite time');
  time=clamp(seconds,0,END);
  const n=navAt(time);robotRig.position.copy(n.p);robotRig.rotation.set(0,n.yaw,0);
  navigation={position:n.p.toArray(),yaw:n.yaw,traveledDistance:n.distance,pathProgress:n.progress,start:points[0],goal:points[points.length-1]};
  human.root.visible=variant==='564';dog.root.visible=variant==='563';
  animateHuman(time);animateDog(time);cameraAt(time);
  scene.updateMatrixWorld(true);
  renderer.render(scene,camera);
}
function cameraState(){ window.__bfTrace?.add(495);return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};}
function serializeObject(o){ window.__bfTrace?.add(496);
  const result={name:o.name,type:o.type,position:o.position.toArray(),quaternion:o.quaternion.toArray(),scale:o.scale.toArray(),visible:o.visible,castShadow:o.castShadow,receiveShadow:o.receiveShadow,renderOrder:o.renderOrder,userData:o.userData};
  if(o.geometry) result.geometry=o.geometry.toJSON();
  if(o.material){
    const m=o.material;
    result.material={...m.toJSON(),proceduralShader:m.userData.proceduralPattern?m.onBeforeCompile.toString():null};
  }
  if(o.isLight) result.light={color:o.color.getHex(),intensity:o.intensity,groundColor:o.groundColor?.getHex(),castShadow:o.castShadow,shadow:o.shadow?{bias:o.shadow.bias,normalBias:o.shadow.normalBias,mapSize:o.shadow.mapSize.toArray(),camera:{left:o.shadow.camera.left,right:o.shadow.camera.right,top:o.shadow.camera.top,bottom:o.shadow.camera.bottom,near:o.shadow.camera.near,far:o.shadow.camera.far}}:null};
  result.children=o.children.filter(c=>c!==robotRig).map(serializeObject);
  return result;
}
window.reconstruction={
  pause(){},
  seek,
  setVariant(id){if(id!=='564'&&id!=='563')throw new RangeError('variant must be 564 or 563');variant=id;seek(time);},
  getCameraState:cameraState,
  getNavigationState(){return structuredClone(navigation);},
  getInvariantState(){return {navigation:structuredClone(navigation),world:serializeObject(scene),environment:{background:environmentScene.background.getHex(),objects:environmentScene.children.map(serializeObject)},camera:{...cameraState(),near:camera.near,far:camera.far,aspect:camera.aspect,zoom:camera.zoom},render:{exposure:renderer.toneMappingExposure,toneMapping:renderer.toneMapping,background:scene.background.getHex()},route:{points,length:routeLength}};},
  getEditedObjectState(){return {variant,embodiment:variant==='564'?'humanoid':'quadruped',root:{position:robotRig.position.toArray(),quaternion:robotRig.quaternion.toArray()},rig:serializeObject(variant==='564'?human.root:dog.root)};},
  getGaitDiagnostics(){
    const rig=variant==='564'?human:dog;
    return {
      feet:rig.feet.map(f=>({position:f.getWorldPosition(new THREE.Vector3()).toArray(),...f.userData.contact})),
      reachErrors:rig.legs.map(l=>l.group.userData.reachError)
    };
  }
};
seek(0);
