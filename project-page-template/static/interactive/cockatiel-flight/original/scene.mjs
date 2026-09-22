import * as T from './vendor/three.module.js';
import {furnish} from './environment.mjs';
import {clamp,mix,ease,lerp,position,velocity,direction,articulation,perch,creamPerch,launch,contact,aperture,cycles} from './motion.mjs';
import {cameraState,cameraContract} from './camera.mjs';
const renderer=new T.WebGLRenderer({canvas:document.querySelector('#proxy'),antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(1);renderer.setSize(1280,720,false);
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.08;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
const scene=new T.Scene();scene.background=new T.Color('#c5c9cc');
const world=new T.Group();world.name='one-immutable-living-room';scene.add(world);
const camera=new T.PerspectiveCamera(43,16/9,.025,70);
const overhead=new T.OrthographicCamera(-6.6,6.6,3.7125,-3.7125,.01,40);
overhead.position.set(-.70,20,.5);overhead.up.set(0,0,-1);overhead.lookAt(-.70,0,.5);
overhead.left=-8.85;overhead.right=8.85;overhead.top=4.978;overhead.bottom=-4.978;overhead.updateProjectionMatrix();
const sun=new T.DirectionalLight('#ffffff',3);sun.position.set(8,9,-4);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-8,right:8,top:8,bottom:-8});sun.shadow.normalBias=.018;sun.shadow.bias=-.0001;scene.add(sun);
scene.add(new T.HemisphereLight('#f4f4f4','#858585',2.4));
const fill=new T.DirectionalLight('#ffffff',.8);fill.position.set(-6,5,5);scene.add(fill);
// Presentation palette referenced to the accepted output; geometry and motion are unchanged.
const material=(name,color)=>new T.MeshStandardMaterial({name,color,roughness:.84});
const oak=material('oak clay','#a17c50'),wallmat=material('warm plaster','#b7ad97'),sage=material('sage plaster','#89917b'),
  ivory=material('ivory','#ece7d9'),teal=material('sofa teal','#668682'),linen=material('oat textile','#cbc0a8'),
  walnut=material('dark wood','#6c5542'),metal=material('cage charcoal','#292c2a'),glass=material('closed window','#b6d4df'),
  terra=material('terracotta','#bc8564');
metal.metalness=.46;metal.roughness=.48;
glass.transparent=true;glass.opacity=.18;glass.roughness=.16;glass.metalness=.04;glass.depthWrite=false;glass.side=T.DoubleSide;
const cagePlastic=material('used charcoal tray plastic','#292c29');cagePlastic.roughness=.72;
const steel=material('powder coated cage steel','#252a26');steel.metalness=.58;steel.roughness=.42;
const lawn=material('sunlit lawn','#6f8f58'),foliage=material('mixed deciduous foliage','#557a4f'),
  foliageLight=material('sunlit leaf clusters','#7f9d62'),bark=material('weathered tree bark','#665142'),
  fence=material('weathered timber fence','#9b8264'),siding=material('neighbor house siding','#c9c1ad'),
  roof=material('neighbor asphalt roof','#625f5b');
const sky=new T.MeshBasicMaterial({name:'daylight sky',color:'#b4d2df',side:T.DoubleSide});
const sph=new T.SphereGeometry(1,24,16),cube=new T.BoxGeometry(1,1,1);
const statics=[],colliders=[];
function mesh(g,m,p,s,parent=world,name='',collide=true){
  const o=new T.Mesh(g,m);o.name=name;o.position.fromArray(p);o.scale.fromArray(s);o.castShadow=true;o.receiveShadow=true;parent.add(o);
  if(parent===world){statics.push(o);if(collide)colliders.push(o);}
  return o;
}
const box=(name,p,s,m=oak,parent=world,collide=true)=>mesh(cube,m,p,s,parent,name,collide);
const ell=(name,p,s,m,parent=world,collide=true)=>mesh(sph,m,p,s,parent,name,collide);
function rod(name,a,b,r,m=metal,parent=world,collide=true){
  const av=new T.Vector3(...a),bv=new T.Vector3(...b),delta=bv.clone().sub(av);
  const o=mesh(new T.CylinderGeometry(r,r,delta.length(),8),m,av.add(bv).multiplyScalar(.5).toArray(),[1,1,1],parent,name,collide);
  o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),delta.normalize());return o;
}
box('continuous living-room floor',[-.7,-.07,.55],[11.4,.14,9.7],oak);
for(let x=-6.3;x<5;x+=.42)box('floor seam',[x,.004,.55],[.007,.005,9.65],walnut,world,false);
const hallDoorMinZ=3.35,hallDoorMaxZ=4.85,hallDoorTop=2.48;
box('west wall north of hall opening',[-6.40,1.90,-.475],[.16,3.8,7.65],sage);
box('west wall south of hall opening',[-6.40,1.90,5.125],[.16,3.8,.55],sage);
box('west wall hall opening header',[-6.40,3.14,4.10],[.16,1.32,1.50],sage);
box('east wall north of windows',[5.0,1.90,-3.46],[.16,3.8,1.68],wallmat);
box('east wall south of windows',[5.0,1.90,3.96],[.16,3.8,2.88],wallmat);
box('east wall below windows',[5.0,.54,-.05],[.16,1.08,5.08],wallmat);
box('east wall above windows',[5.0,3.605,-.05],[.16,.49,5.08],wallmat);
box('east wall center pier',[5.0,2.22,-.05],[.16,2.28,.28],wallmat);
box('north living-room wall',[-.7,1.9,-4.30],[11.4,3.8,.16],sage);
box('south living-room wall',[-.7,1.9,5.40],[11.4,3.8,.16],wallmat);
const ceiling=box('living-room ceiling',[-.7,3.85,.55],[11.4,.10,9.7],ivory);ceiling.castShadow=false;
box('hall oak floor',[-8.35,-.07,4.10],[3.90,.14,1.50],oak);
for(let x=-10.25;x<-6.40;x+=.42)box('hall floor seam',[x,.004,4.10],[.007,.005,1.47],walnut,world,false);
box('hall north wall',[-8.35,1.90,3.35],[3.90,3.8,.16],wallmat);
box('hall south wall',[-8.35,1.90,4.85],[3.90,3.8,.16],wallmat);
const hallCeiling=box('hall ceiling',[-8.35,3.85,4.10],[3.90,.10,1.50],ivory);hallCeiling.castShadow=false;
for(const z of[hallDoorMinZ,hallDoorMaxZ])box('hall opening jamb',[-6.31,hallDoorTop/2,z],[.18,hallDoorTop,.10],ivory);
box('hall opening casing top',[-6.31,hallDoorTop,4.10],[.18,.11,1.70],ivory);
for(const z of[3.43,4.77])box('hall painted baseboard',[-8.35,.075,z],[3.74,.15,.045],ivory,world,false);
for(const [x,y,w,h] of [[-7.45,2.15,.46,.62],[-8.45,2.08,.40,.54]]){
  box('hall picture frame',[x,y,3.255],[w,h,.035],walnut,world,false);
  box('hall picture mat',[x,y,3.232],[w-.055,h-.055,.014],ivory,world,false);
  ell('hall muted artwork',[x-.03,y+.015,3.222],[w*.20,h*.18,.006],linen,world,false);
}
box('hall slim console top',[-8.15,.82,3.51],[1.08,.075,.25],oak);
for(const x of[-8.61,-7.69])for(const z of[3.43,3.59])box('hall console leg',[x,.41,z],[.045,.82,.045],walnut);
box('hall key tray',[-8.33,.875,3.51],[.22,.025,.12],linen,world,false);
ell('hall tray keys',[-8.33,.897,3.51],[.055,.010,.020],metal,world,false);
box('hall console mail',[-7.95,.867,3.50],[.25,.016,.15],ivory,world,false).rotation.y=-.08;
box('hall side door panel',[-8.55,1.14,4.758],[.94,2.18,.035],ivory,world,false);
for(const y of[.73,1.55])box('hall side door inset',[-8.55,y,4.735],[.70,.57,.016],linen,world,false);
for(const x of[-9.05,-8.05])box('hall side door casing',[x,1.18,4.72],[.075,2.36,.075],ivory,world,false);
box('hall side door casing top',[-8.55,2.36,4.72],[1.08,.08,.075],ivory,world,false);
ell('hall side door knob',[-8.18,1.12,4.69],[.035,.035,.035],metal,world,false);
box('hall runner rug',[-8.30,.018,4.10],[2.75,.018,.76],linen,world,false);
box('hall runner inset',[-8.30,.029,4.10],[2.54,.004,.58],ivory,world,false);
for(let x=-9.40;x<=-7.20;x+=.44)box('hall runner woven band',[x,.034,4.10],[.025,.003,.55],teal,world,false);
rod('hall pendant stem',[-8.62,3.82,4.10],[-8.62,3.13,4.10],.014,metal);
const hallShade=mesh(new T.CylinderGeometry(.13,.23,.22,24,1,true),linen,[-8.62,3.02,4.10],[1,1,1],world,'hall pendant tapered shade',false);
hallShade.material.side=T.DoubleSide;
ell('hall pendant bulb',[-8.62,2.99,4.10],[.052,.07,.052],ivory,world,false);
box('dining room floor',[-12.10,-.07,3.75],[3.60,.14,4.00],oak);
for(let x=-13.85;x<-10.25;x+=.42)box('dining floor seam',[x,.004,3.75],[.007,.005,3.96],walnut,world,false);
box('dining north wall',[-12.10,1.90,1.75],[3.60,3.8,.16],linen);
box('dining south wall',[-12.10,1.90,5.75],[3.60,3.8,.16],linen);
box('dining west wall',[-13.90,1.90,3.75],[.16,3.8,4.00],wallmat);
const diningCeiling=box('dining ceiling',[-12.10,3.85,3.75],[3.60,.10,4.00],ivory);diningCeiling.castShadow=false;
box('hall to dining left return',[-10.30,1.90,2.55],[.16,3.8,1.60],wallmat);
box('hall to dining right return',[-10.30,1.90,5.30],[.16,3.8,.90],wallmat);
for(const z of[3.35,4.85])box('dining opening jamb',[-10.205,1.31,z],[.11,2.62,.11],ivory);
box('dining opening header',[-10.205,2.62,4.10],[.11,.13,1.61],ivory);
for(const z of[1.85,5.65])box('dining painted baseboard',[-12.08,.075,z],[3.46,.15,.045],ivory,world,false);
box('dining woven area rug',[-11.96,.017,3.72],[2.04,.020,1.62],linen,world,false);
box('dining rug inner field',[-11.96,.030,3.72],[1.84,.004,1.42],ivory,world,false);
box('dining table top',[-11.96,.775,3.72],[1.62,.095,.94],oak);
for(const z of[3.265,4.175])rod('dining table eased long edge',[-12.75,.825,z],[-11.17,.825,z],.022,oak,world,false);
for(const x of[-12.75,-11.17])rod('dining table eased end edge',[x,.825,3.28],[x,.825,4.16],.022,oak,world,false);
for(const x of[-12.65,-11.27])for(const z of[3.38,4.06]){
  box('dining tapered table leg',[x,.38,z],[.075,.76,.075],walnut);
  box('dining table apron',[x,.70,3.72],[.065,.13,.70],walnut);
}
function diningChair(name,x,z,rotation=0){
  const chair=new T.Group();chair.name=name;chair.position.set(x,0,z);chair.rotation.y=rotation;world.add(chair);
  const cb=(part,p,s,mat=walnut)=>box(`${name} ${part}`,p,s,mat,chair,false);
  cb('seat',[0,.49,0],[.54,.075,.50]);
  cb('seat cushion',[0,.545,-.005],[.47,.055,.43],linen);
  for(const sx of[-.225,.225])for(const sz of[-.205,.205])cb('leg',[sx,.245,sz],[.047,.49,.047]);
  for(const sx of[-.235,.235])cb('back post',[sx,.93,.22],[.050,.84,.050]);
  cb('curved back top rail',[0,1.315,.22],[.52,.075,.065]);
  for(const sx of[-.16,-.08,0,.08,.16])cb('back slat',[sx,.98,.22],[.025,.58,.035],oak);
  statics.push(...chair.children);
}
diningChair('near dining chair',-11.95,2.98,0);
diningChair('far dining chair',-11.95,4.48,Math.PI);
diningChair('left dining chair',-12.82,3.72,-Math.PI/2);
diningChair('right dining chair',-11.08,3.72,Math.PI/2);
box('dining linen placemat',[-11.96,.831,3.72],[.58,.006,.34],linen,world,false);
ell('dining ceramic bowl',[-11.96,.875,3.72],[.14,.05,.20],ivory);
for(const [x,z,r] of [[-12.23,3.58,-.10],[-11.69,3.87,.13]]){
  const plate=ell('dining everyday plate',[x,.846,z],[.13,.012,.13],ivory,world,false);plate.rotation.y=r;
}
box('kitchen continuous toe kick',[-13.43,.16,3.56],[.70,.24,2.75],walnut);
for(const [z,w] of [[2.50,.58],[3.14,.64],[3.86,.70],[4.58,.60]]){
  box('kitchen lower cabinet carcass',[-13.53,.59,z],[.54,.90,w],linen);
  box('kitchen recessed cabinet panel',[-13.245,.60,z],[.018,.68,w-.10],ivory,world,false);
  rod('kitchen cabinet stile',[-13.225,.27,z-w/2+.045],[-13.225,.93,z-w/2+.045],.010,walnut,world,false);
  rod('kitchen cabinet stile',[-13.225,.27,z+w/2-.045],[-13.225,.93,z+w/2-.045],.010,walnut,world,false);
  rod('kitchen cabinet pull',[-13.205,.64,z-.10],[-13.205,.64,z+.10],.010,metal,world,false);
}
box('kitchen worktop',[-13.20,1.095,3.55],[.80,.095,2.88],oak);
rod('kitchen worktop front edge',[-12.79,1.105,2.13],[-12.79,1.105,4.97],.022,oak,world,false);
box('kitchen backsplash',[-13.80,1.47,3.55],[.05,.66,2.88],ivory);
for(let z=2.20;z<4.98;z+=.23)box('backsplash vertical grout',[-13.766,1.47,z],[.008,.60,.008],linen,world,false);
for(let y=1.20;y<1.77;y+=.15)box('backsplash horizontal grout',[-13.765,y,3.55],[.008,.008,2.83],linen,world,false);
for(const [z,w] of [[2.48,.62],[3.18,.68],[3.95,.72],[4.68,.58]]){
  box('kitchen upper cabinet carcass',[-13.56,2.30,z],[.56,1.04,w],linen);
  box('kitchen upper recessed panel',[-13.265,2.30,z],[.018,.82,w-.10],ivory,world,false);
  rod('kitchen upper cabinet pull',[-13.235,2.16,z-.09],[-13.235,2.16,z+.09],.010,metal,world,false);
}
ell('kitchen sink basin',[-13.08,1.14,3.55],[.19,.035,.32],metal);
rod('kitchen faucet stem',[-13.08,1.15,3.80],[-13.08,1.42,3.80],.018,metal);
rod('kitchen faucet spout',[-13.08,1.42,3.80],[-13.08,1.42,3.58],.018,metal);
box('kitchen refrigerator body',[-13.47,1.14,5.18],[.75,2.28,.86],metal);
box('refrigerator upper door',[-13.075,1.59,5.18],[.035,1.28,.81],metal);
box('refrigerator lower drawer',[-13.075,.51,5.18],[.035,.68,.81],metal);
rod('refrigerator door split',[-13.045,.92,4.79],[-13.045,.92,5.57],.010,walnut,world,false);
for(const z of[4.83,5.53])rod('refrigerator long handle',[-13.025,1.24,z],[-13.025,1.91,z],.014,walnut,world,false);
for(const z of[4.84,5.52])box('refrigerator foot',[-13.40,.055,z],[.10,.11,.08],walnut);
const board=box('leaning cutting board',[-13.12,1.37,2.30],[.055,.44,.31],oak,world,false);board.rotation.z=-.06;
ell('counter fruit bowl',[-13.06,1.18,4.44],[.17,.055,.20],ivory,world,false);
for(const [z,s] of [[4.36,.07],[4.47,.06],[4.56,.065]])ell('counter fruit',[-13.06,1.25,z],[s,s,s],linen,world,false);
box('counter folded towel',[-13.02,1.17,2.84],[.22,.025,.18],linen,world,false).rotation.y=.12;
ell('dining corner planter',[-12.92,.30,2.02],[.19,.30,.19],linen,world,false);
for(let i=0;i<7;i++){
  const a=i*2.399,tip=[-12.92+.25*Math.cos(a),.78+.08*(i%3),2.02+.25*Math.sin(a)];
  rod('dining plant stem',[-12.92,.52,2.02],tip,.008,walnut,world,false);
  const leaf=ell('dining plant leaf',tip,[.17,.035,.075],linen,world,false);
  leaf.rotation.set(.18*Math.sin(a),-a,.22*Math.cos(a));
}
rod('dining pendant stem',[-11.96,3.82,3.72],[-11.96,2.87,3.72],.014,metal);
const diningShade=mesh(new T.CylinderGeometry(.18,.34,.25,28,1,true),linen,[-11.96,2.75,3.72],[1,1,1],world,'dining pendant broad shade',false);
diningShade.material.side=T.DoubleSide;
ell('dining pendant bulb',[-11.96,2.70,3.72],[.065,.085,.065],ivory,world,false);
box('dining framed art',[-13.80,2.28,2.18],[.05,.74,.60],walnut,world,false);
box('dining art mount',[-13.765,2.28,2.18],[.015,.64,.50],ivory,world,false);
for(const z of[-1.4,1.3]){
  box('closed window glazing',[4.899,2.22,z],[.035,2.20,2.35],glass);
  for(const dz of[-1.20,0,1.20])box('window vertical frame',[4.85,2.22,z+dz],[.07,2.30,.07],ivory);
  for(const y of[1.08,3.36])box('window horizontal frame',[4.85,y,z],[.07,.08,2.48],ivory);
  box('window sill',[4.72,1.035,z],[.40,.08,2.55],ivory);
}
box('exterior daylight backdrop',[25,4.2,.55],[.08,8.4,14],sky,world,false);
box('exterior lawn',[11.5,-.12,.55],[13,.12,9.6],lawn,world,false);
for(let z=-3.9;z<=4.7;z+=.58){
  box('weathered fence board',[9.3,.69,z],[.075,1.38,.49],fence,world,false);
}
for(const y of[.20,.72,1.20])box('fence horizontal rail',[9.18,y,.40],[.10,.075,9.2],fence,world,false);
box('neighbor house wall',[16.0,1.55,-.65],[1.15,3.10,5.9],siding,world,false);
box('neighbor roof',[15.7,3.22,-.65],[1.75,.28,6.6],roof,world,false).rotation.z=-.10;
for(const z of[-2.25,.95]){
  box('neighbor window',[15.39,1.88,z],[.035,1.05,1.25],glass,world,false);
  for(const dz of[-.64,.64])box('neighbor window trim',[15.34,1.88,z+dz],[.04,1.18,.07],ivory,world,false);
  for(const y of[1.31,2.45])box('neighbor window trim',[15.34,y,z],[.04,.07,1.35],ivory,world,false);
}
for(const [x,z,h,r]of[[7.2,-3.45,3.0,.13],[8.1,3.10,3.6,.15],[11.7,-2.35,4.1,.17],[13.2,3.65,4.6,.19]]){
  rod('exterior tree trunk',[x,0,z],[x,h,z],r,bark,world,false);
  for(let i=0;i<7;i++){
    const a=i*2.399,spread=.46+.10*(i%3),y=h-.25+.34*Math.sin(i*1.7);
    ell('layered exterior tree crown',[x+spread*Math.cos(a),y,z+spread*Math.sin(a)],
      [.65+.08*(i%2),.58+.06*((i+1)%2),.70],i%3?foliage:foliageLight,world,false);
  }
}
for(const [x,z]of[[6.2,-.5],[7.0,1.25],[10.3,-3.5],[12.2,1.8]]){
  ell('garden shrub',[x,.42,z],[.58,.46,.66],foliageLight,world,false);
}
box('fixed rug',[-1.6,.023,-1.08],[4.90,.025,3.70],linen,world,false);
for(let i=0;i<10;i++)box('rug woven line',[-1.6,.039,-2.7+i*.36],[4.84,.005,.012],teal,world,false);
box('sofa plinth',[-2.02,.30,-3.40],[3.92,.24,.86],walnut);
box('sofa back shell',[-2.02,.91,-3.80],[4.02,.83,.18],teal);
for(let i=0;i<3;i++){
  box('sofa seat support',[-3.34+i*1.3,.57,-3.34],[1.20,.16,.92],teal);
  const seat=ell('soft seat cushion',[-3.34+i*1.3,.67,-3.31],[.60,.16,.45],teal);seat.rotation.x=.03*(i-1);
  const back=ell('soft back cushion',[-3.34+i*1.3,1.04,-3.66],[.59,.42,.16],teal);back.rotation.z=.025*(i-1);
  const p=ell('soft sofa cushion',[-3.34+i*1.3,1.00,-3.48],[.36,.30,.15],i===1?terra:linen);p.rotation.z=(i-1)*.16;
}
for(const x of[-4.02,-.02]){
  box('sofa arm support',[x,.72,-3.38],[.20,.55,1.02],teal);
  ell('rounded sofa arm',[x,.91,-3.37],[.16,.24,.51],teal);
}
for(const x of[-3.96,-2.68,-1.36,-.08])box('short sofa leg',[x,.14,-3.51],[.075,.28,.075],walnut);
for(let i=0;i<2;i++)rod('sofa cushion seam',[-2.69+i*1.30,.62,-3.75],[-2.69+i*1.30,.76,-2.93],.006,walnut,world,false);
box('coffee table',[-1.98,.62,-1.58],[2.25,.095,1.15],oak);
for(const z of[-2.13,-1.03])rod('coffee table softened edge',[-3.04,.675,z],[-.92,.675,z],.025,oak,world,false);
for(const x of[-3.04,-.92])rod('coffee table softened edge',[x,.675,-2.10],[x,.675,-1.06],.025,oak,world,false);
for(const x of[-2.86,-1.1])for(const z of[-1.98,-1.20])box('table leg',[x,.30,z],[.07,.60,.07],walnut);
box('open book left',[-2.28,.688,-1.58],[.29,.024,.36],ivory).rotation.y=.13;
box('open book right',[-1.98,.688,-1.62],[.29,.024,.36],ivory).rotation.y=.13;
ell('mug',[-1.25,.765,-1.60],[.075,.10,.075],terra);
box('sofa throw',[-3.40,.823,-3.10],[.62,.04,.82],linen).rotation.y=.12;
ell('plant pot',[4.27,.25,-3.40],[.25,.27,.25],terra);
rod('plant stem',[4.27,.4,-3.40],[4.27,1.25,-3.40],.025,walnut);
const green=material('leaf clay','#648168');
for(let i=0;i<10;i++){
  const a=i*2.4;const l=ell('fixed leaf',[4.27+.22*Math.cos(a),.60+i*.076,-3.4+.22*Math.sin(a)],[.26,.032,.105],green);l.rotation.y=-a;
}
box('small living print frame',[-6.295,2.1,-1.7],[.06,1.3,1.0],walnut);
box('small living print surface',[-6.257,2.1,-1.7],[.015,1.13,.83],linen);
rod('stationary fan stem',[-.7,3.79,.6],[-.7,3.29,.6],.028);
ell('stationary fan hub',[-.7,3.25,.6],[.14,.08,.14],metal);
for(let i=0;i<3;i++){
  const a=i*2*Math.PI/3;const b=box('stationary fan blade',[-.7+.43*Math.cos(a),3.24,.6+.43*Math.sin(a)],[.78,.025,.14],oak);b.rotation.y=-a;
}
// The sole opening in the cage is its practical front access door.
const front=-3.51,back=-4.43,z0=1.25,z1=2.67,low=1.18,high=2.48;
const doorZ0=aperture.minZ,doorZ1=aperture.maxZ,doorLow=aperture.bottom,doorHigh=aperture.top;
for(const x of[back+.10,front-.10])for(const z of[z0+.10,z1-.10]){
  rod('cage stand tubular leg',[x,.10,z],[x,1.08,z],.022,steel);
  ell('cage stand rubber caster',[x,.075,z],[.055,.055,.035],cagePlastic);
}
for(const z of[z0+.10,z1-.10])rod('cage stand lower crossbar',[back+.10,.42,z],[front-.10,.42,z],.018,steel);
for(const x of[back+.10,front-.10])rod('cage stand lower crossbar',[x,.42,z0+.10],[x,.42,z1-.10],.018,steel);
box('cage stand lower storage shelf',[(front+back)/2,.405,(z0+z1)/2],[.70,.025,1.14],cagePlastic);
box('cage lower tray housing',[(front+back)/2,1.105,(z0+z1)/2],[1.02,.15,1.54],cagePlastic);
box('cage removable litter tray',[(front+back)/2+.035,1.17,(z0+z1)/2],[.91,.045,1.39],ivory);
box('cage tray paper',[(front+back)/2+.035,1.196,(z0+z1)/2],[.86,.006,1.34],linen,world,false);
box('cage tray pull handle',[front+.045,1.125,(z0+z1)/2],[.035,.045,.28],steel);
for(const x of[front,back])for(const z of[z0,z1])rod('cage structural corner',[x,low,z],[x,high,z],.011,steel);
for(const y of[low,high])for(const x of[front,back])rod('cage structural perimeter',[x,y,z0],[x,y,z1],.010,steel);
for(const y of[low,high])for(const z of[z0,z1])rod('cage structural perimeter',[back,y,z],[front,y,z],.010,steel);
for(const y of[1.55,1.91,2.27]){
  rod('cage rear reinforcing rail',[back,y,z0],[back,y,z1],.005,steel,world,false);
  for(const z of[z0,z1])rod('cage side reinforcing rail',[back,y,z],[front,y,z],.005,steel,world,false);
}
for(let z=z0+.035;z<z1;z+=.045){
  rod('cage fine back bar',[back,low,z],[back,high,z],.0024,steel,world,false);
  if(z<doorZ0||z>doorZ1)rod('cage fine front bar',[front,low,z],[front,high,z],.0024,steel,world,false);
  else{
    rod('cage fine front lower bar',[front,low,z],[front,doorLow,z],.0024,steel,world,false);
    rod('cage fine front upper bar',[front,doorHigh,z],[front,high,z],.0024,steel,world,false);
  }
  rod('cage fine roof bar',[back,high,z],[front,high,z],.0024,steel,world,false);
}
for(let x=back+.035;x<front;x+=.045)for(const z of[z0,z1])rod('cage fine side bar',[x,low,z],[x,high,z],.0024,steel,world,false);
for(const z of[doorZ0,doorZ1])rod('aperture jamb',[front,doorLow,z],[front,doorHigh,z],.010,steel);
for(const y of[doorLow,doorHigh])rod('aperture rail',[front,y,doorZ0],[front,y,doorZ1],.010,steel);
const doorWidth=doorZ1-doorZ0,doorAngle=178*Math.PI/180;
const doorEnd=[front+doorWidth*Math.sin(doorAngle),doorZ0+doorWidth*Math.cos(doorAngle)];
for(const y of[doorLow,doorHigh])rod('open door rail',[front,y,doorZ0],[doorEnd[0],y,doorEnd[1]],.008,steel);
for(const i of[0,1])rod('open door side',[mix(front,doorEnd[0],i),doorLow,mix(doorZ0,doorEnd[1],i)],[mix(front,doorEnd[0],i),doorHigh,mix(doorZ0,doorEnd[1],i)],.008,steel);
for(let i=1;i<20;i++){
  const u=i/20,x=mix(front,doorEnd[0],u),z=mix(doorZ0,doorEnd[1],u);
  rod('open door fine bar',[x,doorLow,z],[x,doorHigh,z],.0024,steel,world,false);
}
rod('cage door latch body',[front+.012,1.88,doorZ1],[front+.075,1.88,doorZ1],.018,steel,world,false);
rod('cage door latch keeper',[front,1.82,doorZ1-.035],[front,1.96,doorZ1-.035],.009,steel,world,false);
for(let x=back+.035;x<front;x+=.052)rod('cage bottom grate',[x,1.225,z0+.025],[x,1.225,z1-.025],.0024,steel,world,false);
const perchMesh=rod('shared perch intended foot support',[-4,1.6,1.33],[-4,1.6,2.59],.023,oak);
ell('water cup',[-4.39,1.48,1.38],[.10,.08,.10],ivory);
const environment=furnish({world,statics,box,ell,rod,mesh,material,oak,walnut,ivory,linen,teal,terra,metal,green});

function makeBird(name,isCream){
  const root=new T.Group();root.name=name;scene.add(root);
  const body=material(name+' smooth body guide',isCream?'#e9dfbb':'#62615e');
  const wingmat=material(name+' continuous wing guide',isCream?'#f0e7cb':'#565652');wingmat.side=T.DoubleSide;
  const edge=material(name+' soft joint guide',isCream?'#d8cba4':'#5a5a55');
  const face=material(name+' face',isCream?'#eddda0':'#e5cb5b'),cheek=material(name+' cheek','#e79828');
  const eyes=material(name+' eyes','#111513'),beakmat=material(name+' beak','#8e897a'),footmat=material(name+' feet','#b5a18d');
  const torso=ell('smooth torso',[0,0,0],[.074,.113,.129],body,root);
  const breast=ell('breast',[0,.006,.071],[.067,.097,.075],body,root);
  const head=new T.Group();root.add(head);
  const neck=ell('flexible neck',[0,.08,.04],[.038,.07,.037],body,root);
  ell('smooth head',[0,0,0],[.052,.057,.057],face,head);
  ell('nape',[0,-.015,-.025],[.048,.052,.041],body,head);
  for(const s of[-1,1]){
    ell('cheek',[s*.048,-.013,.019],[.008,.020,.020],cheek,head);
    ell('eye',[s*.049,.018,.033],[.006,.007,.006],eyes,head);
  }
  const beak=ell('hooked beak',[0,-.007,.066],[.017,.022,.024],beakmat,head);beak.rotation.x=-.4;
  const beakTip=new T.Object3D();beakTip.position.set(0,-.016,.085);head.add(beakTip);
  const crest=ell('single smooth crest',[0,.073,-.028],[.017,.052,.008],face,head);crest.rotation.x=-.53;
  const wings=[];
  for(const s of[-1,1]){
    const shoulder=new T.Group();shoulder.position.set(s*.061,.044,-.006);root.add(shoulder);
    const elbow=new T.Group();elbow.position.set(s*.143,0,-.018);shoulder.add(elbow);
    const wrist=new T.Group();wrist.position.set(s*.125,0,-.012);elbow.add(wrist);
    const tip=new T.Object3D();tip.position.set(s*.137,0,-.027);wrist.add(tip);
    const stations=[
      [shoulder,[0,0,.032],[0,0,-.067]],
      [elbow,[0,0,.038],[0,0,-.122]],
      [wrist,[0,0,.040],[0,0,-.133]],
      [tip,[0,0,0],[0,0,-.013]],
    ];
    const n=30,m=7,vertices=new Float32Array((n+1)*(m+1)*3),indices=[];
    for(let i=0;i<n;i++)for(let j=0;j<m;j++){
      const a=i*(m+1)+j,b=a+m+1;indices.push(a,b,a+1,b,b+1,a+1);
    }
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(vertices,3));g.setIndex(indices);
    const featherColors=new Float32Array((n+1)*(m+1)*3);
    const featherBase=wingmat.color.clone(),ivoryPatch=new T.Color('#e8e5d9');
    for(let i=0;i<=n;i++)for(let j=0;j<=m;j++){
      const span=i/n,chord=j/m;
      const patch=isCream?0:ease(.16,.24,span)*(1-ease(.51,.61,span))*ease(.18,.34,chord);
      featherBase.clone().lerp(ivoryPatch,patch).toArray(featherColors,3*(i*(m+1)+j));
    }
    g.setAttribute('color',new T.BufferAttribute(featherColors,3));
    const featherMaterial=wingmat.clone();featherMaterial.color.set('#ffffff');featherMaterial.vertexColors=true;
    const membrane=new T.Mesh(g,featherMaterial);membrane.name='continuous articulated wing membrane';membrane.castShadow=true;membrane.receiveShadow=true;root.add(membrane);
    ell('shoulder articulation',[0,0,0],[.025,.025,.026],edge,shoulder);
    ell('elbow articulation',[0,0,0],[.018,.018,.019],edge,elbow);
    ell('wrist articulation',[0,0,0],[.013,.013,.014],edge,wrist);
    wings.push({s,shoulder,elbow,wrist,tip,stations,membrane,n,m});
  }
  const tail=new T.Group();tail.position.set(0,-.05,-.10);root.add(tail);
  const tg=new T.BufferGeometry(),tailN=24,tailM=6;
  tg.setAttribute('position',new T.BufferAttribute(new Float32Array((tailN+1)*(tailM+1)*3),3));
  const ix=[];for(let i=0;i<tailN;i++)for(let j=0;j<tailM;j++){const a=i*(tailM+1)+j,b=a+tailM+1;ix.push(a,b,a+1,b,b+1,a+1);}tg.setIndex(ix);
  const tailSurface=new T.Mesh(tg,wingmat);tailSurface.name='single long closed-bundle tail surface';tailSurface.castShadow=true;tail.add(tailSurface);
  const feet=[];
  for(const s of[-1,1]){
    const foot=new T.Group();foot.name='foot-'+s;root.add(foot);
    rod('tarsus',[0,.052,-.010],[0,.008,.002],.0065,footmat,foot);
    for(const dx of[-.011,.011]){
      rod('front toe',[0,.002,0],[dx,-.001,.024],.0035,footmat,foot);
      rod('toe curl',[dx,-.001,.024],[dx,-.014,.020],.0028,beakmat,foot);
    }
    for(const dx of[-.008,.008])rod('rear toe',[0,.002,0],[dx,-.008,-.023],.0034,footmat,foot);
    feet.push({s,foot});
  }
  const parts=[];root.traverse(o=>{if(o.isMesh){o.geometry.computeBoundingBox();parts.push(o);}});
  return {root,torso,breast,head,neck,beakTip,wings,tail,tailSurface,tailN,tailM,feet,isCream,parts};
}
const gray=makeBird('grey-cockatiel',false),cream=makeBird('cream-cockatiel',true);
function updateSurfaces(b,halfAngle){
  b.root.updateMatrixWorld(true);
  const inv=b.root.matrixWorld.clone().invert();
  for(const w of b.wings){
    const points=edgeIndex=>w.stations.map(([joint,...ends])=>new T.Vector3(...ends[edgeIndex]).applyMatrix4(joint.matrixWorld).applyMatrix4(inv));
    const leading=new T.CatmullRomCurve3(points(0),false,'centripetal');
    const trailing=new T.CatmullRomCurve3(points(1),false,'centripetal');
    const attr=w.membrane.geometry.attributes.position;
    for(let i=0;i<=w.n;i++){
      const u=i/w.n,a=leading.getPoint(u),c=trailing.getPoint(u).lerp(a,w.chordCompression);
      for(let j=0;j<=w.m;j++){
        const v=j/w.m,p=a.clone().lerp(c,v);p.y+=.008*Math.sin(Math.PI*v)*Math.sin(Math.PI*u);
        attr.setXYZ(i*(w.m+1)+j,p.x,p.y,p.z);
      }
    }
    attr.needsUpdate=true;w.membrane.geometry.computeVertexNormals();w.membrane.geometry.computeBoundingBox();w.membrane.geometry.computeBoundingSphere();
  }
  const attr=b.tailSurface.geometry.attributes.position;
  for(let i=0;i<=b.tailN;i++)for(let j=0;j<=b.tailM;j++){
    const u=i/b.tailN,v=2*j/b.tailM-1,width=.017+u*.258*Math.tan(halfAngle);
    const taper=1-.19*Math.abs(v)**2*u**3;
    attr.setXYZ(i*(b.tailM+1)+j,v*width,-.005*Math.cos(v*Math.PI/2),-.258*u*taper);
  }
  attr.needsUpdate=true;b.tailSurface.geometry.computeVertexNormals();b.tailSurface.geometry.computeBoundingBox();b.tailSurface.geometry.computeBoundingSphere();
}
function setBird(b,t,a){
  const air=b.isCream?0:a.flight;
  const p=b.isCream?creamPerch.slice():position(t);
  if(b.isCream)p[2]+=.018*ease(12.05,12.45,t);
  else p[1]+=a.bob-a.crouch-a.settling;
  b.root.position.fromArray(p);
  const d=direction(t),yaw=Math.atan2(d[0],d[2]);
  b.root.rotation.set(0,b.isCream?Math.PI/2:mix(Math.PI/2,yaw,ease(launch,2.55,t)),0);
  if(!b.isCream&&t>=contact)b.root.rotation.y=mix(-Math.PI/2,-3*Math.PI/2,ease(11.59,12.15,t));
  if(!b.isCream){
    b.root.rotateX(-a.flarePitch+a.pitchLag+a.lean);b.root.rotateZ(a.bank);
  }else{
    const openingLife=1-ease(4.15,4.75,t);
    b.root.rotateX(.018*openingLife*Math.sin(t*3.7+.35));
    b.root.rotateZ(.022*openingLife*Math.sin(t*2.45+.8));
  }
  const creamLife=b.isCream?(1-ease(4.15,4.75,t))*(.5+.5*Math.sin(t*4.35+.4)):0;
  b.torso.scale.set(.074*(1+.025*creamLife),mix(.113,.076,air)*(1+.018*creamLife),mix(.129,.148,air)*(1+.032*creamLife));
  b.torso.rotation.x=.18*air;b.breast.scale.set(.067*(1+.018*creamLife),mix(.097,.068,air)*(1+.026*creamLife),.075);
  const preen=b.isCream?0:a.preen;
  if(b.isCream){
    const opening=1-ease(2.34,2.76,t),returnBow=ease(12.00,12.45,t);
    const bow=clamp(opening+returnBow);
    const preenResponse=(1-ease(1.18,1.55,t))*(.5+.5*Math.sin(t*8.8+.4));
    const waitShift=ease(1.28,1.72,t)*(1-ease(2.18,2.48,t));
    const watch=ease(2.18,2.70,t)*(1-ease(4.05,4.70,t));
    const nod=(1-ease(2.45,2.90,t))*(.035*Math.sin(t*4.2)+.016*Math.sin(t*9.1+.5));
    b.head.position.set(.008+.006*preenResponse+.010*watch,.128-.044*bow-.008*preenResponse+.009*watch,.071+.025*bow+.004*waitShift);
    b.head.rotation.set(.32*bow+nod-.08*watch,-.62*watch,.038*Math.sin(t*1.7)+.045*waitShift);
  }else{
    b.head.position.set(.165*preen+.004*preen*Math.sin(t*11),mix(.14,.070,air)-.025*preen,.074+.057*air);
    b.head.rotation.set(.31*preen+.035*preen*Math.sin(t*12),1.20*preen,.025*preen*Math.sin(t*8));
  }
  const ns=new T.Vector3(.014,.066,.034),ne=b.head.position.clone();
  b.neck.position.copy(ns).add(ne).multiplyScalar(.5);b.neck.scale.set(.037,ns.distanceTo(ne)*.59,.037);
  b.neck.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),ne.sub(ns).normalize());
  const active=b.isCream?0:a.active;
  for(const w of b.wings){
    const {s,shoulder,elbow,wrist}=w;
    shoulder.position.x=s*mix(.044,.061,active);
    shoulder.scale.setScalar(mix(.62,1,active));
    w.chordCompression=.55*a.recovery*active;
    shoulder.rotation.set(0,s*mix(1.48,a.aftSweep,active),s*mix(-.12,a.shoulder,active));
    elbow.rotation.set(0,s*mix(.23,a.elbowBend,active),-s*.10*a.recovery*active);
    wrist.rotation.set(a.wristTwist*active,s*mix(-.13,a.wristBend,active),s*.11*a.recovery*active);
    if(b.isCream){
      const featherSettle=.025*Math.sin(t*5.2+s*.7)+.055*ease(1.38,1.72,t)*(1-ease(2.08,2.38,t));
      shoulder.rotation.z+=s*featherSettle;
      elbow.rotation.y+=s*.022*Math.sin(t*4.6+.9);
    }
  }
  b.tail.rotation.set(b.isCream?-.21+.018*Math.sin(t*3.1+.2):a.tailPitch,b.isCream?.018*Math.sin(t*2.2):a.tailYaw,0);
  b.root.updateMatrixWorld(true);
  for(const {s,foot}of b.feet){
    const tuck=b.isCream?0:a.legTuck;
    foot.position.set(s*.033,mix(-.182,-.045,tuck)+(b.isCream?0:a.crouch+a.settling),-.020*tuck+(b.isCream?0:.064*a.feet*(1-ease(11.18,contact,t))));
    foot.rotation.set(1.0*tuck,0,0);
    if(!b.isCream&&t<launch+.10){
      const target=new T.Vector3(-4,1.623,2-s*.033).sub(b.root.position).applyQuaternion(b.root.quaternion.clone().invert());
      foot.position.lerp(target,1-ease(launch,launch+.10,t));
      foot.quaternion.slerp(b.root.quaternion.clone().invert(),1-ease(launch,launch+.10,t));
    }
    if(!b.isCream&&t>=10.98&&t<contact){
      const p=position(t),target=new T.Vector3(p[0],1.623+p[1]-perch[1],2+s*.033).sub(b.root.position).applyQuaternion(b.root.quaternion.clone().invert());
      foot.position.lerp(target,ease(10.98,contact,t));
      foot.quaternion.slerp(b.root.quaternion.clone().invert(),ease(10.98,contact,t));
    }
    if(t>=contact&&!b.isCream){
      const ta=s<0?11.59:11.82,tb=s<0?11.81:12.04,u=clamp((t-ta)/(tb-ta));
      const lift=.020*Math.sin(Math.PI*u)**2;
      const fixed=new T.Vector3(-4,1.623+lift,2+s*.033).sub(b.root.position).applyQuaternion(b.root.quaternion.clone().invert());
      foot.position.copy(fixed);foot.quaternion.copy(b.root.quaternion.clone().invert());
    }
  }
  updateSurfaces(b,b.isCream?.025:a.tailHalfAngle);
}
const guide=new T.Group();guide.name='witness-only-route-guides';scene.add(guide);guide.visible=false;
function line(points,color){
  const g=new T.BufferGeometry().setFromPoints(points.map(p=>new T.Vector3(...p)));
  guide.add(new T.Line(g,new T.LineBasicMaterial({color,depthTest:false})));
}
line(Array.from({length:520},(_,i)=>position(launch+(contact-launch)*i/519)),'#db6446');
line(Array.from({length:500},(_,i)=>cameraState(15*i/499).position),'#3989d1');
let current=0,view='main',environmentView='furnishings';
const environmentCameras={
  furnishings:{position:[-1.5,2.7,1.8],target:[-1.6,1.0,-3.15],fov:71},
  'cage-essentials':{position:[-2.6,2.8,3.85],target:[-4.45,1.64,1.8],fov:59},
  'storage-detail':{position:[-3.7,2.05,4.4],target:[-5.45,.70,1.88],fov:57},
  'table-textiles':{position:[-.85,2.8,-.2],target:[-2.5,.77,-2.25],fov:61},
  'window-exterior':{position:[2.25,2.15,.05],target:[9.8,1.85,.05],fov:64},
  'hall-and-dining':{position:[-2.95,2.10,3.52],target:[-11.40,1.25,4.05],fov:58},
};
function update(t){
  current=clamp(t,0,15);const a=articulation(current);
  setBird(cream,current,a);setBird(gray,current,a);
  const c=cameraState(current);camera.position.fromArray(c.position);camera.fov=c.fov;camera.up.set(0,1,0);camera.lookAt(...c.target);
  ceiling.visible=view!=='overhead';guide.visible=view==='overhead';world.visible=view!=='anatomy';cream.root.visible=view!=='anatomy';
  scene.background.set(view==='anatomy'?'#32383c':'#c5c9cc');
  if(view==='cage'){camera.position.set(-1.93,2.58,3.63);camera.lookAt(-4,1.91,1.80);camera.fov=38;}
  if(view==='anatomy'){
    const off=new T.Vector3(1.05,.31,-.45).applyQuaternion(gray.root.quaternion);
    camera.position.copy(gray.root.position).add(off);camera.lookAt(gray.root.position.clone().add(new T.Vector3(0,0,-.06).applyQuaternion(gray.root.quaternion)));camera.fov=43;
  }
  if(view==='environment'){
    const e=environmentCameras[environmentView];camera.position.fromArray(e.position);camera.lookAt(...e.target);camera.fov=e.fov;
  }
  if(view==='main')camera.rotateZ(c.roll);
  camera.updateProjectionMatrix();camera.updateMatrixWorld(true);scene.updateMatrixWorld(true);
}
const render=()=>renderer.render(scene,view==='overhead'?overhead:camera);
world.updateMatrixWorld(true);
const collisionBoxes=colliders.filter(o=>o!==perchMesh).map(o=>({name:o.name,box:new T.Box3().setFromObject(o),mesh:o}));
const initialWorld=JSON.stringify(statics.map(o=>[o.name,o.matrixWorld.elements,o.material.name]));
const ray=new T.Raycaster(),bb=new T.Box3();
const environmentSet=new Set([...environment.added,...environment.modified]);
const environmentBoxes=collisionBoxes.filter(c=>environmentSet.has(c.mesh));
const aabbGap=(a,b)=>Math.hypot(...['x','y','z'].map(k=>Math.max(0,a.min[k]-b.max[k],b.min[k]-a.max[k])));
function hitReport(b){
  const hits=[];
  for(const p of b.parts){
    if(!p.geometry.boundingBox)p.geometry.computeBoundingBox();
    bb.copy(p.geometry.boundingBox).applyMatrix4(p.matrixWorld);
    for(const c of collisionBoxes)if(bb.intersectsBox(c.box)&&hits.length<16)hits.push({part:p.name,obstacle:c.name});
  }return hits;
}
function diagnostics(){
  const a=articulation(current),pos=gray.root.position.clone(),d=new T.Vector3(...direction(current)),v=velocity(current);
  const offset=camera.position.clone().sub(pos),rear=offset.clone().setY(0).normalize().dot(d.clone().negate());
  const frame=[],grayBoxes=[];
  for(const p of gray.parts){
    const box=new T.Box3().copy(p.geometry.boundingBox).applyMatrix4(p.matrixWorld);grayBoxes.push({name:p.name,box});
    const vertices=p.geometry.attributes.position;
    for(let i=0;i<vertices.count;i++)frame.push(new T.Vector3().fromBufferAttribute(vertices,i).applyMatrix4(p.matrixWorld).project(camera));
  }
  const target=pos.clone().sub(camera.position);ray.set(camera.position,target.clone().normalize());ray.far=target.length()-.08;
  const occlusion=ray.intersectObjects(colliders.filter(o=>o!==perchMesh&&o!==ceiling),false).map(h=>h.object.name);
  const feet=gray.feet.map(f=>f.foot.getWorldPosition(new T.Vector3()).toArray());
  const cagePoints=[];
  const architecture=colliders.filter(o=>!/^cage|^aperture|^open door|^shared perch|^water cup/.test(o.name)&&o!==ceiling);
  for(const y of[low,(low+high)/2,high])for(const z of[z0,(z0+z1)/2,z1]){
    const p=new T.Vector3(front,y,z),ndc=p.clone().project(camera),delta=p.clone().sub(camera.position);
    ray.set(camera.position,delta.clone().normalize());ray.far=delta.length()-.02;
    cagePoints.push({ndc:ndc.toArray(),clear:ray.intersectObjects(architecture,false).length===0,inFrame:Math.abs(ndc.x)<=1&&Math.abs(ndc.y)<=1&&Math.abs(ndc.z)<=1});
  }
  const surfaceArea=g=>{
    const v=g.attributes.position,ix=g.index.array,a=new T.Vector3(),b=new T.Vector3(),c=new T.Vector3();let area=0;
    for(let i=0;i<ix.length;i+=3){
      a.fromBufferAttribute(v,ix[i]);b.fromBufferAttribute(v,ix[i+1]);c.fromBufferAttribute(v,ix[i+2]);
      area+=b.sub(a).cross(c.sub(a)).length()/2;
    }return area;
  };
  const wings=gray.wings.map(w=>({
    side:w.s,shoulder:w.shoulder.rotation.toArray().slice(0,3),elbow:w.elbow.rotation.toArray().slice(0,3),wrist:w.wrist.rotation.toArray().slice(0,3),
    root:w.shoulder.getWorldPosition(new T.Vector3()).toArray(),elbowPosition:w.elbow.getWorldPosition(new T.Vector3()).toArray(),
    wristPosition:w.wrist.getWorldPosition(new T.Vector3()).toArray(),tip:w.tip.getWorldPosition(new T.Vector3()).toArray(),
    localTip:w.tip.getWorldPosition(new T.Vector3()).sub(gray.root.position).applyQuaternion(gray.root.quaternion.clone().invert()).toArray(),
    surfaceArea:surfaceArea(w.membrane.geometry),
  }));
  const creamBoxes=cream.parts.map(p=>({name:p.name,box:new T.Box3().copy(p.geometry.boundingBox).applyMatrix4(p.matrixWorld)}));
  const peerHits=[];
  if(current>1.65&&current<13.30)for(const g of grayBoxes.filter(p=>/wing membrane|torso/.test(p.name)))for(const c of creamBoxes)
    if(g.box.intersectsBox(c.box)&&peerHits.length<12)peerHits.push({grey:g.name,cream:c.name});
  const environmentClearance={grey:Infinity,cream:Infinity,camera:Infinity,rayHits:[]};
  for(const c of environmentBoxes){
    environmentClearance.grey=Math.min(environmentClearance.grey,...grayBoxes.map(p=>aabbGap(p.box,c.box)));
    environmentClearance.cream=Math.min(environmentClearance.cream,...creamBoxes.map(p=>aabbGap(p.box,c.box)));
    environmentClearance.camera=Math.min(environmentClearance.camera,c.box.distanceToPoint(camera.position)-.075);
  }
  const targets=[gray.root.position,gray.head.getWorldPosition(new T.Vector3()),gray.tailSurface.getWorldPosition(new T.Vector3()),
    ...gray.wings.map(w=>w.tip.getWorldPosition(new T.Vector3()))];
  for(const [i,p]of targets.entries()){
    const delta=p.clone().sub(camera.position);ray.set(camera.position,delta.clone().normalize());ray.far=delta.length()-.01;
    for(const hit of ray.intersectObjects([...environmentSet],false))environmentClearance.rayHits.push({target:i,obstacle:hit.object.name});
  }
  const distanceToPerch=pos.distanceTo(new T.Vector3(...perch));
  return {time:current,position:pos.toArray(),routePosition:position(current),velocity:v,speed:Math.hypot(...v),direction:d.toArray(),
    camera:{...cameraState(current),position:camera.position.toArray(),fov:camera.fov,quaternion:camera.quaternion.toArray()},
    rearAngleDegrees:Math.acos(clamp(rear,-1,1))*180/Math.PI,cameraDistance:offset.length(),
    framing:{minX:Math.min(...frame.map(p=>p.x)),maxX:Math.max(...frame.map(p=>p.x)),minY:Math.min(...frame.map(p=>p.y)),maxY:Math.max(...frame.map(p=>p.y)),allInFront:frame.every(p=>p.z>-1&&p.z<1)},
    grayHits:hitReport(gray),creamHits:hitReport(cream),peerHits,
    cameraHits:collisionBoxes.filter(c=>c.box.distanceToPoint(camera.position)<.075).map(c=>c.name),occlusion,
    creamPosition:cream.root.position.toArray(),grayFeet:feet,feetContactError:feet.map(f=>Math.abs(f[1]-1.623)),
    preenDistance:gray.beakTip.getWorldPosition(new T.Vector3()).distanceTo(cream.head.getWorldPosition(new T.Vector3())),
    bodyQuaternion:gray.root.quaternion.toArray(),staticWorldUnchanged:initialWorld===JSON.stringify(statics.map(o=>[o.name,o.matrixWorld.elements,o.material.name])),
    cagePoints,cageVisibleSamples:cagePoints.filter(p=>p.clear&&p.inFrame).length,
    cageCenterNDC:new T.Vector3(front,(low+high)/2,(z0+z1)/2).project(camera).toArray(),
    anatomy:{...a,wings,span:Math.hypot(...wings[0].tip.map((x,i)=>x-wings[1].tip[i])),horizontalLocalSpan:Math.abs(wings[0].localTip[0]-wings[1].localTip[0])},
    tail:{halfAngleRadians:a.tailHalfAngle,fullAngleDegrees:a.tailHalfAngle*360/Math.PI,flare:a.tailFlare,pitch:a.tailPitch,
      distanceToPerch,distanceToDoorPlane:Math.abs(pos.x-aperture.plane)},
    landing:{contactTime:contact,secondsToContact:contact-current,feetExtension:a.feet,legTuck:a.legTuck,
      weightBearing:current>=contact},
    environmentClearance,cameraAudit:cameraAudit(),
  };
}
const gl=renderer.getContext(),ext=gl.getExtension('WEBGL_debug_renderer_info');
const maskTarget=new T.WebGLRenderTarget(320,180,{depthBuffer:true});
const flat=color=>new T.MeshBasicMaterial({color,toneMapped:false,side:T.DoubleSide});
const maskBlack=flat(0x000000),maskBody=flat(0xff0000),maskHead=flat(0xffff00),
  maskWing=flat(0xff00ff),maskCrest=flat(0xffffff),maskRoot=flat(0x00ffff);
function occupancy(){
  const saved=[],background=scene.background.clone(),shadows=renderer.shadowMap.enabled;
  world.traverse(o=>{if(o.isMesh){saved.push([o,o.material]);o.material=maskBlack;}});
  for(const b of[cream,gray])for(const o of b.parts){
    saved.push([o,o.material]);o.material=b===cream?maskBlack:o.name==='single smooth crest'?maskCrest:
      o.name==='shoulder articulation'?maskRoot:o.name==='continuous articulated wing membrane'?maskWing:
      ['smooth head','nape','cheek','eye','hooked beak'].includes(o.name)?maskHead:maskBody;
  }
  scene.background.set(0);renderer.shadowMap.enabled=false;renderer.setRenderTarget(maskTarget);renderer.render(scene,camera);
  const pixels=new Uint8Array(320*180*4);renderer.readRenderTargetPixels(maskTarget,0,0,320,180,pixels);
  renderer.setRenderTarget(null);renderer.shadowMap.enabled=shadows;scene.background.copy(background);
  for(const [o,m]of saved)o.material=m;
  const counts={bird:0,wing:0,crest:0,head:0,root:0,body:0,upperHalfBird:0,lowerHalfBird:0};
  let sx=0,sy=0;
  for(let i=0;i<320*180;i++){
    const r=pixels[4*i]>127,g=pixels[4*i+1]>127,b=pixels[4*i+2]>127;
    if(!(r||g||b))continue;
    counts.bird++;sx+=i%320;sy+=179-Math.floor(i/320);
    counts[Math.floor(i/320)<90?'lowerHalfBird':'upperHalfBird']++;
    if(r&&g&&b)counts.crest++;else if(!r&&g&&b)counts.root++;else if(r&&!g&&b)counts.wing++;
    else if(r&&g&&!b)counts.head++;else counts.body++;
  }
  return {resolution:[320,180],counts,fraction:counts.bird/(320*180),wingFraction:counts.wing/(320*180),
    forwardRoomFraction:1-counts.bird/(320*180),upperHalfForwardFraction:1-counts.upperHalfBird/(320*90),
    birdCentroidPixels:counts.bird?[sx/counts.bird,sy/counts.bird]:null};
}
function cameraAudit(){
  const p=camera.position,allParts=[...gray.parts,...cream.parts];
  let worldClearance=Infinity,birdClearance=Infinity,worldClosest=null,birdClosest=null,minBirdDepth=Infinity,minGreyDepth=Infinity;
  for(const c of collisionBoxes){
    const distance=c.box.distanceToPoint(p)-.075;
    if(distance<worldClearance){worldClearance=distance;worldClosest=c.name;}
  }
  for(const part of allParts){
    const bounds=new T.Box3().copy(part.geometry.boundingBox).applyMatrix4(part.matrixWorld),distance=bounds.distanceToPoint(p)-.075;
    if(distance<birdClearance){birdClearance=distance;birdClosest=part.name;}
    const attr=part.geometry.attributes.position;
    for(let i=0;i<attr.count;i++){
      const q=new T.Vector3().fromBufferAttribute(attr,i).applyMatrix4(part.matrixWorld).applyMatrix4(camera.matrixWorldInverse);
      // Depth is checked for the entire mesh, including vertices outside the viewport.
      minBirdDepth=Math.min(minBirdDepth,-q.z);
      if(gray.parts.includes(part))minGreyDepth=Math.min(minGreyDepth,-q.z);
    }
  }
  const landmark=(name,point)=>{
    const q=point.clone().project(camera),delta=point.clone().sub(p);
    ray.set(p,delta.clone().normalize());ray.far=Math.max(0,delta.length()-.003);
    const obstruction=ray.intersectObjects([...colliders,...allParts],false);
    return {name,world:point.toArray(),ndc:q.toArray(),inFrame:Math.abs(q.x)<1&&Math.abs(q.y)<1&&q.z>-1&&q.z<1,
      clear:obstruction.length===0,firstHit:obstruction[0]?.object.name||null};
  };
  const local=(point,object=gray.root)=>new T.Vector3(...point).applyMatrix4(object.matrixWorld);
  const landmarks=[landmark('crest',local([0,.115,-.044],gray.head)),
    landmark('upper-back',local([0,.080,-.035])),
    ...gray.wings.map(w=>landmark('wing-root-'+w.s,local([0,.027,0],w.shoulder)))];
  const nearCornerRadius=.025*Math.sqrt(1+Math.tan(camera.fov*Math.PI/360)**2*(1+(16/9)**2));
  return {worldClearance,birdClearance,worldClosest,birdClosest,minBirdDepth,minGreyDepth,nearPlane:.025,
    nearCornerRadius,nearPlaneBoundingSphereMargin:Math.min(worldClearance,birdClearance)+.075-nearCornerRadius,
    birdNearPlaneMargin:minGreyDepth-.025,landmarks,
    relativeLocal:p.clone().sub(gray.root.position).applyQuaternion(gray.root.quaternion.clone().invert()).toArray(),
    relativeDistance:p.distanceTo(gray.root.position)};
}
window.reconstruction={
  ready:true,pause(){},seek(t){update(t);render();return current;},
  setView(v){if(!['main','overhead','anatomy','cage'].includes(v))throw Error('Unknown view');view=v;update(current);render();},
  setEnvironmentView(v){if(!environmentCameras[v])throw Error('Unknown environment view');environmentView=v;view='environment';update(current);render();},
  sample(t){update(t);return diagnostics();},diagnostics,
  cameraContract,cameraAt:cameraState,occupancy,
  world(){return {roomCount:3,zones:['living-room','hall','dining-kitchen'],bounds:{min:[-13.98,0,-4.3],max:[5,3.8,5.75]},aperture,perch,creamPerch,
    staticMeshCount:statics.length,colliders:collisionBoxes.map(c=>({name:c.name,min:c.box.min.toArray(),max:c.box.max.toArray()})),
    environment:{addedMeshCount:environment.added.length,modifiedMeshCount:environment.modified.length,cameras:environmentCameras,
      categories:Object.fromEntries(Object.entries(environment.groups).map(([name,objects])=>[name,objects.length])),
      colliders:environmentBoxes.map(c=>({name:c.name,min:c.box.min.toArray(),max:c.box.max.toArray()}))}};},
  phaseTimes(){const start=4.2,base=Math.ceil(cycles(start));return Array.from({length:9},(_,i)=>{
    const desired=base+i/9;let lo=start,hi=start+.6;for(let k=0;k<48;k++){const m=(lo+hi)/2;if(cycles(m)<desired)lo=m;else hi=m;}return (lo+hi)/2;});},
  device:{vendor:ext?gl.getParameter(ext.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),threeRevision:T.REVISION},
  async streamFrame(index){
    const pixels=new Uint8Array(1280*720*4);gl.readPixels(0,0,1280,720,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    const r=await fetch('/__frame?index='+index,{method:'POST',body:pixels});if(!r.ok)throw Error('Frame transport '+r.status);
  }
};
update(0);render();
