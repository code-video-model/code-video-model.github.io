import * as THREE from './vendor/three.module.js';

const W = 1280, H = 720, TAU = Math.PI * 2;
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
const smooth = x => { x = clamp(x); return x*x*(3-2*x); };
const mix = (a, b, u) => a+(b-a)*u;
const V = (x=0,y=0,z=0) => new THREE.Vector3(x,y,z);
const hash = n => { const v = Math.sin(n*127.1+311.7)*43758.5453; return v-Math.floor(v); };
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9daab3);
scene.fog = new THREE.Fog(0x9daab3, 185, 510);
const renderer = new THREE.WebGLRenderer({canvas: document.querySelector('#proxy'), antialias: true, preserveDrawingBuffer: true});
renderer.setSize(W,H,false); renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.16;
scene.add(new THREE.HemisphereLight(0xc8dded,0x565346,2.1));
const sun = new THREE.DirectionalLight(0xf2e7cc,2.3); sun.position.set(-90,140,65); scene.add(sun);
const rig = new THREE.Group(); rig.name='saddle-mounted-rig'; scene.add(rig);
const camera = new THREE.PerspectiveCamera(62,W/H,.08,750); rig.add(camera);
const mat = (color, extras={}) => new THREE.MeshStandardMaterial({color, roughness: .96, metalness: 0, ...extras});
const stone=mat(0x879397), stoneLight=mat(0xa4aca8), stoneDark=mat(0x637378);
const timber=mat(0x775638), timberDark=mat(0x43362b), iron=mat(0x343e41,{metalness:.35});
const skin=mat(0x40514e), skinLight=mat(0x566760), membrane=mat(0x48534f,{side:THREE.DoubleSide});
const horn=mat(0xa6a491), leather=mat(0x594332), gloveMat=mat(0x72604c), reinMat=mat(0x9a815c);
const attackerMat=mat(0x506b71), attackerShield=mat(0x3e6271), defenderMat=mat(0x696777), defenderShield=mat(0x806d6d);
const roofMats=[mat(0x6b7176),mat(0x6d6259),mat(0x776b65),mat(0x556a70)];
const flameMat=new THREE.MeshBasicMaterial({color:0xf77719,transparent:true,opacity:.82,side:THREE.DoubleSide});
const coreMat=new THREE.MeshBasicMaterial({color:0xffdf78,side:THREE.DoubleSide});
const glowMat=mat(0x180b08,{emissive:0xff4710,emissiveIntensity:0});
const fireMat=new THREE.MeshBasicMaterial({color:0xffa52f});
const smokeMat=mat(0x60636a,{transparent:true,opacity:.45,depthWrite:false});
const charMat=mat(0x3e4140,{transparent:true,opacity:.82});
const boxG=new THREE.BoxGeometry(1,1,1), sphereG=new THREE.IcosahedronGeometry(1,1);
const up=V(0,1,0), forward=V(0,0,-1);
function mesh(g,m,p=V(),s=V(1,1,1),parent=scene,name='') {
  const obj=new THREE.Mesh(g,m); obj.position.copy(p); obj.scale.copy(s); obj.name=name; parent.add(obj); return obj;
}
function box(x,y,z,w,h,d,m,parent=scene,name='') { window.__bfTrace?.add(38); return mesh(boxG,m,V(x,y,z),V(w,h,d),parent,name); }
function ball(x,y,z,rx,ry,rz,m,parent=scene,name='') { window.__bfTrace?.add(39); return mesh(sphereG,m,V(x,y,z),V(rx,ry,rz),parent,name); }
function rod(a,b,r,m,parent=scene,sides=6) { window.__bfTrace?.add(40);
  const d=b.clone().sub(a);
  const obj=mesh(new THREE.CylinderGeometry(r,r,d.length(),sides),m,a.clone().add(b).multiplyScalar(.5),V(1,1,1),parent);
  obj.quaternion.setFromUnitVectors(up,d.normalize()); return obj;
}
function setRod(obj,a,b,r) { window.__bfTrace?.add(45);
  obj.position.copy(a).add(b).multiplyScalar(.5);
  obj.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());
  obj.scale.set(r,a.distanceTo(b),r);
}
function cone(x,y,z,r,h,m,parent=scene) { window.__bfTrace?.add(50);return mesh(new THREE.ConeGeometry(r,h,7),m,V(x,y,z),V(1,1,1),parent);}
function lineCurve(points,r,m,parent=scene) { window.__bfTrace?.add(51);
  return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),24,r,6,false),m,V(),V(1,1,1),parent);
}
function crenels(cx,y,z,width,parent=scene) { window.__bfTrace?.add(54);
  box(cx,y-.35,z,width,.7,1.15,stoneLight,parent);
  for(let x=cx-width/2+.7;x<cx+width/2;x+=2.7) box(x,y+.55,z,1.25,1.45,1.25,stoneLight,parent);
}
const world = new THREE.Group(); scene.add(world); world.name='fixed-castle-layout';
box(0,-.6,0,1000,1,1000,mat(0x74776a),world);
box(0,-.02,80,13,.14,245,mat(0x9b8d73),world,'central-approach-road');
box(-3.9,.065,81,.32,.05,235,mat(0x786a55),world);
box(3.9,.065,81,.32,.05,235,mat(0x786a55),world);
for(let i=0;i<65;i++){
  const x=(hash(i)-.5)*360, z=mix(15,225,hash(i+120));
  if(Math.abs(x)<10)continue;
  ball(x,.1,z,1.2+hash(i+22)*2,.3+hash(i+4)*.55,1+hash(i+8),stoneDark,world);
}
for(let i=0;i<20;i++){
  const x=(i-10)*60,z=-310-hash(i+40)*75;
  cone(x,22,z,70+hash(i)*30,55+hash(i+6)*55,mat(i%2?0x76868b:0x7d8d91),world);
}
// Gate at z=0, outside +z, city -z. Every architectural transform is immutable.
box(-8.8,10.5,0,6.4,21,12,stone,world,'gatehouse-left-pier');
box(8.8,10.5,0,6.4,21,12,stone,world,'gatehouse-right-pier');
box(0,18.2,0,11.4,7.6,12,stone,world,'gatehouse-lintel');
box(0,21.4,0,25,1.2,13.5,stoneLight,world,'fixed-gatehouse-roof');
box(0,7.1,5.42,10.4,14.2,.75,timberDark,world,'heavy-wooden-gate');
for(let x=-4.7;x<5;x+=.94)box(x,7.1,5.85,.78,14.1,.2,timber,world);
for(const y of[2.6,7.1,11.6])box(0,y,6.04,10.4,.3,.16,iron,world);
box(0,7.1,6.09,.15,14.1,.19,iron,world);
for(let x=-10.8;x<=11;x+=3.6) {
  box(x,17.4,6.12,.38,3.5,.22,stoneDark,world);
  box(x,19.5,6.17,.9,.5,.25,stoneLight,world);
}
crenels(0,22.2,-5.8,25,world);
crenels(-12.1,22.2,0,1.1,world); crenels(12.1,22.2,0,1.1,world);
for(const side of[-1,1]){
  box(side*67,7.8,0,86,15.6,7,stone,world,'connected-wall');
  crenels(side*67,16,4,86,world);
  box(side*67,15.45,0,86,.6,9,stoneDark,world);
  for(let x=26;x<110;x+=8) {
    box(side*x,7.3,4,1.4,14.6,1.7,stoneDark,world);
    box(side*x,14,5,1.8,.6,2.6,stoneLight,world);
  }
  for(const tx of[17,60,106]){
    const height=tx===17?25.5:22;
    mesh(new THREE.CylinderGeometry(5.3,5.9,height,12),stone,V(side*tx,height/2,0),V(1,1,1),world);
    mesh(new THREE.CylinderGeometry(6,5.4,1.1,12),stoneLight,V(side*tx,height,0),V(1,1,1),world);
    for(let k=0;k<12;k++){
      const a=k/12*TAU;
      const b=box(side*tx+5.55*Math.cos(a),height+1.1,5.55*Math.sin(a),1.7,1.6,1.5,stoneLight,world);
      b.rotation.y=-a;
    }
    for(const yy of[9,17])box(side*tx,yy,5.42,.38,2,.17,stoneDark,world);
  }
}
// Broad masonry courses establish scale without copied texture or image materials.
for(let y=2;y<=20;y+=2.4){
  for(const side of[-1,1])box(side*8.8,y,6.045,6.35,.09,.05,stoneDark,world);
  if(y>14.3)box(0,y,6.045,11.15,.09,.05,stoneDark,world);
}
for(let y=2;y<15;y+=2.6)for(const side of[-1,1])box(side*67,y,3.515,86,.07,.04,stoneDark,world);
const burnXs=[-8,-5,-2,1,4,7,9];
const combustible=[],burning=[],smoke=[],charMarks=[];
for(const x of burnXs){
  const plank=box(x,22.65,6.25,2.6,1.3,.4,timber,world,'wooden-front-defense');
  for(const xx of[-1,1])box(x+xx,22.6,6.45,.12,1.4,.1,timberDark,world);
  combustible.push(plank);
  const g=new THREE.Group();g.position.set(x,23.15,6.28);world.add(g);
  for(let k=0;k<5;k++){
    const f=cone((k-2)*.39,.6,Math.sin(k)*.23,.38,1.4+hash(k)*1,fireMat,g);
    f.userData.phase=k; burning.push({mesh:f,slot:burnXs.indexOf(x)});
  }
  const char=box(x,20.65,6.16,2.9,2.3,.06,charMat,world);charMarks.push(char);
  for(let k=0;k<5;k++)smoke.push({mesh:ball(x,24+k*.8,5,.6,.8,.6,smokeMat,world),slot:burnXs.indexOf(x),phase:k/5});
}
const flags=[];
for(const side of[-1,1]){
  const pole=rod(V(side*11,22,5.4),V(side*11,26.1,5.4),.09,iron,world);
  const f=box(side*10,24.8,5.4,2,1.15,.08,defenderShield,world,'gatehouse-banner');flags.push(f);
  rod(V(side*60,22,0),V(side*60,27,0),.08,iron,world);
  box(side*60+.85,26,0,1.7,1,.08,defenderShield,world);
}
box(0,.025,-123,11,.16,234,mat(0x9f9581),world,'interior-main-street');
for(const z of[-28,-66,-110,-160])box(0,.045,z,201,.15,6,mat(0x938b7a),world);
function house(x,z,w,d,h,index){ window.__bfTrace?.add(136);
  const wallMat=mat(index%2?0xb3ada0:0x9b9c94);
  box(x,h/2,z,w,h,d,wallMat,world);
  const roof=new THREE.BufferGeometry();
  const a=[-w*.58,0,-d*.57, w*.58,0,-d*.57, 0,h*.48,-d*.57,
    -w*.58,0,d*.57, 0,h*.48,d*.57, w*.58,0,d*.57,
    -w*.58,0,-d*.57,0,h*.48,-d*.57,0,h*.48,d*.57,
    -w*.58,0,-d*.57,0,h*.48,d*.57,-w*.58,0,d*.57,
    w*.58,0,-d*.57,w*.58,0,d*.57,0,h*.48,d*.57,
    w*.58,0,-d*.57,0,h*.48,d*.57,0,h*.48,-d*.57];
  for(let i=0;i<a.length;i+=9)for(let j=0;j<3;j++)[a[i+3+j],a[i+6+j]]=[a[i+6+j],a[i+3+j]];
  roof.setAttribute('position',new THREE.Float32BufferAttribute(a,3));roof.computeVertexNormals();
  mesh(roof,roofMats[index%4],V(x,h,z),V(1,1,1),world);
  box(x+w*.25,h+h*.32,z+1,.95,2.8,1.1,stoneDark,world);
  box(x,h*.42,z+d*.505,1.1,2.2,.12,timberDark,world);
  for(const off of[-.28,.28])box(x+w*off,h*.75,z+d*.508,.7,1,.15,stoneDark,world);
}
let houseIndex=0;
for(let row=0;row<8;row++)for(const side of[-1,1])for(let col=0;col<4;col++){
  const x=side*(16+col*21+(row%2)*2),z=-20-row*25;
  house(x,z,10+hash(houseIndex)*5,12+hash(houseIndex+80)*6,7+hash(houseIndex+25)*5,houseIndex++);
}
box(0,16,-230,33,32,29,stone,world); crenels(0,32.5,-214.5,34,world);
for(const side of[-1,1])cone(side*20,38,-231,8,24,roofMats[3],world);
function soldier(x,y,z,defender=false){ window.__bfTrace?.add(160);
  const g=new THREE.Group();g.position.set(x,y,z);scene.add(g);
  const cloth=defender?defenderMat:attackerMat;
  box(0,1,0,.65,.85,.43,cloth,g);
  ball(0,1.66,0,.27,.29,.26,iron,g);
  box(-.19,.35,0,.18,.7,.22,iron,g);box(.19,.35,0,.18,.7,.22,iron,g);
  rod(V(-.3,1.3,0),V(-.52,.87,.3),.11,cloth,g);
  rod(V(.3,1.3,0),V(.5,1.05,.35),.11,cloth,g);
  if(defender){
    lineCurve([V(.45,.6,.48),V(.67,1.05,.6),V(.45,1.6,.48)],.045,timber,g);
    rod(V(.45,.6,.48),V(.45,1.6,.48),.013,reinMat,g);
  }else{
    box(-.5,.86,.35,.65,.95,.14,attackerShield,g);
    rod(V(.49,.2,.1),V(.49,2.6,.1),.035,timber,g);
    cone(.49,2.7,.1,.075,.26,iron,g);
  }
  return g;
}
const attackers=[];
for(const side of[-1,1])for(let row=0;row<7;row++)for(let col=0;col<12;col++){
  const x=side*(12+col*3.9+hash(row*19+col)*1.1),z=25+row*14+hash(row*16+col+40)*3;
  // Siege lanes on the flanks stay open.
  if((Math.abs(x+38)<9&&Math.abs(z-78)<13)||(Math.abs(x-35)<9&&Math.abs(z-91)<14))continue;
  attackers.push(soldier(x,0,z));
}
const defenders=[];
for(const x of[-9,-6,-3,0,3,6,9]){
  defenders.push({mesh:soldier(x,22,4.7,true),x,baseY:22,baseZ:4.7,gate:true});
}
for(const side of[-1,1])for(let x=26;x<105;x+=4.5){
  defenders.push({mesh:soldier(side*x,15.8,2.8,true),x:side*x,baseY:15.8,baseZ:2.8,gate:false});
}
function wheels(group,xs,zs,r){ window.__bfTrace?.add(192);
  for(const x of xs)for(const z of zs){
    const w=mesh(new THREE.CylinderGeometry(r,r,.4,12),timberDark,V(x,r,z),V(1,1,1),group);
    w.rotation.z=Math.PI/2;
    const hub=rod(V(x-.25,r,z),V(x+.25,r,z),r*.24,iron,group);
  }
}
function catapult(x,z){ window.__bfTrace?.add(199);
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  box(0,1.05,0,5.5,.6,7,timber,g);wheels(g,[-2.85,2.85],[-2.35,2.35],.92);
  for(const side of[-1,1]){
    rod(V(side*2.1,1,-2.7),V(side*1.6,4.5,0),.25,timber,g);
    rod(V(side*2.1,1,2.7),V(side*1.6,4.5,0),.25,timber,g);
  }
  rod(V(-2.1,4.4,0),V(2.1,4.4,0),.36,iron,g);
  const arm=new THREE.Group();arm.position.set(0,4.4,0);g.add(arm);
  box(0,0,.9,.45,.46,6,timber,arm);
  ball(0,.28,3.7,.83,.35,.9,timberDark,arm);
  box(0,0,-2.5,1.6,1.5,1,stoneDark,arm);
  return{group:g,arm};
}
const firingCat=catapult(-38,78),resetCat=catapult(35,91),idleCat=catapult(-60,57);
const ram=new THREE.Group();ram.name='covered-ram-advancing-never-firing';scene.add(ram);
box(0,1.05,0,4.7,.6,8.6,timber,ram);wheels(ram,[-2.5,2.5],[-3,3],.9);
for(const x of[-2,2])for(const z of[-3.5,3.5])box(x,2.7,z,.34,3.5,.35,timber,ram);
for(const side of[-1,1]){
  const roof=box(side*1.25,4.7,0,3.1,.3,9.4,timberDark,ram);
  roof.rotation.z=side*-.37;
  for(const z of[-4,-2,0,2,4]){
    const band=box(side*1.25,4.9,z,3.15,.08,.15,iron,ram);band.rotation.z=side*-.37;
  }
}
rod(V(0,2.45,-5),V(0,2.45,3.8),.52,timber,ram,10);
ball(0,2.45,-5.25,.58,.58,.62,iron,ram);
for(const z of[-2,2])rod(V(0,4.3,z),V(0,2.55,z),.075,iron,ram);
const stoneShot=ball(0,0,0,.76,.76,.76,stoneDark,scene,'one-continuous-catapult-stone');
const impactDust=ball(-38,14.5,4.4,1,1,1,smokeMat);
const release=.72,stoneContact=2.92;
const releaseAngle=-.78;
const stoneStart=V(0,.28,3.7).applyAxisAngle(V(1,0,0),releaseAngle).add(V(-38,4.4,78));
const stoneEnd=V(-38,14.5,4.25);
function stoneAt(t){ window.__bfTrace?.add(233);
  const u=clamp((t-release)/(stoneContact-release));
  const p=stoneStart.clone().lerp(stoneEnd,u);p.y+=4*27*u*(1-u);return p;
}
const arrowSpecs=[
  {t:.34,d:1.55,a:[-27,17.3,3.8],b:[-16,1.2,83]},
  {t:1.14,d:1.15,a:[17,26.4,5],b:[-7,26,146]},
  {t:2.32,d:1.25,a:[-17,26.4,5],b:[9,24,123]},
  {t:3.37,d:1.32,a:[9,23.5,5],b:[18,1.2,78]},
  {t:4.16,d:1.02,a:[-9,23.5,5],b:[-5,25,98]},
  {t:4.8,d:1.35,a:[6,23.5,5],b:[23,1.2,66]},
];
const arrowG=new THREE.CylinderGeometry(1,1,1,5);
const arrows=arrowSpecs.map((s,i)=>{
  const g=new THREE.Group();scene.add(g);
  const shaft=mesh(arrowG,iron,V(),V(.042,1.25,.042),g);shaft.rotation.x=Math.PI/2;
  const head=cone(0,0,-.73,.12,.27,iron,g);head.rotation.x=-Math.PI/2;
  box(0,0,.48,.28,.035,.28,reinMat,g);
  return g;
});
// The whole mount and camera share ONE body frame; only the neck, jaw, reins and wing joints articulate.
const mount=new THREE.Group();rig.add(mount);mount.name='wyvern-two-hindlegs-two-forelimb-wings';
ball(0,-3.1,.8,1.85,1.2,4.3,skin,mount,'wyvern-body');
for(const side of[-1,1]){
  rod(V(side*.85,-3.3,1),V(side*1.2,-4.7,.4),.43,skin,mount);
  rod(V(side*1.2,-4.7,.4),V(side*1.05,-5.1,1.6),.26,skin,mount);
}
const saddle=new THREE.Group();mount.add(saddle);saddle.name='fixed-saddle';
ball(0,-2.42,-2.3,1.55,.5,1.2,leather,saddle);
lineCurve([V(-1.35,-2.13,-2.8),V(0,-1.76,-3.1),V(1.35,-2.13,-2.8)],.15,timberDark,saddle);
box(0,-1.77,-3.07,.28,.31,.15,iron,saddle);
for(const side of[-1,1])rod(V(side*.72,-1.98,-2.4),V(side*1.14,-2.5,-1.55),.07,reinMat,saddle);
const hands=[];
for(const side of[-1,1]){
  const hand=new THREE.Group();hand.name=side<0?'left-single-proxy-glove':'right-single-proxy-glove';
  hand.position.set(side*1.18,-1.3,-2.6);hand.scale.setScalar(.82);hand.rotation.z=side*.16;mount.add(hand);
  ball(0,0,0,.32,.22,.42,gloveMat,hand);
  ball(-side*.23,.025,-.18,.15,.14,.22,gloveMat,hand,'single-thumb');
  const cuff=box(side*.08,-.16,.39,.53,.38,.45,leather,hand);cuff.rotation.x=-.25;
  rod(V(side*.08,-.2,.5),V(side*.45,-.64,1.03),.26,leather,hand);
  for(let k=0;k<3;k++)box(-.15+k*.15,.19,-.11,.024,.015,.31,timberDark,hand);
  hands.push(hand);
}
const neckGroup=new THREE.Group();mount.add(neckGroup);
const neckMesh=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(0,-2.55,-2.4),V(0,-2.7,-4.5),V(0,-2.8,-6.9)]),24,.6,12,false),skin,V(),V(1,1,1),neckGroup);
const scales=[];
for(let i=0;i<9;i++){
  const g=new THREE.Group();mount.add(g);
  const plate=ball(0,0,0,.48,.09,.26,skinLight,g);
  const spine=cone(0,.14,.02,.13,.36,horn,g);spine.rotation.x=.5;
  scales.push(g);
}
const headGroup=new THREE.Group();headGroup.position.set(0,-2.8,-7);mount.add(headGroup);
headGroup.name='consistent-modest-wyvern-head';
ball(0,0,-.15,.61,.44,.9,skin,headGroup);
ball(0,-.07,-.94,.49,.28,.74,skinLight,headGroup);
for(const side of[-1,1]){
  const h=cone(side*.42,.5,.37,.17,.9,horn,headGroup);h.rotation.x=.62;h.rotation.z=-side*.32;
  ball(side*.55,.07,-.48,.06,.065,.13,mat(0xaaa574),headGroup);
  rod(V(side*.5,.25,-.68),V(side*.59,.24,-.14),.07,skinLight,headGroup);
}
const jaw=new THREE.Group();jaw.position.set(0,-.25,-.12);headGroup.add(jaw);
ball(0,-.08,-.79,.43,.16,.84,skin,jaw);
const mouthGlow=ball(0,-.35,-1.05,.44,.13,.54,glowMat,headGroup);
for(const side of[-1,1])for(let i=0;i<5;i++){
  const tooth=cone(side*.37,-.31,-.4-i*.23,.052,.16,horn,headGroup);tooth.rotation.z=Math.PI;
}
const mouthMarker=new THREE.Object3D();mouthMarker.position.set(0,-.36,-1.73);headGroup.add(mouthMarker);
const reins=[];
for(const side of[-1,1]){
  const rope=mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V(),V(0,0,-1),V(0,0,-2)]),32,.037,6,false),reinMat,V(),V(1,1,1),mount);
  reins.push(rope);
}
const wings=[];
for(const side of[-1,1]){
  const pivot=new THREE.Group();pivot.position.set(side*1.4,-3.3,-.7);mount.add(pivot);
  const g=new THREE.BufferGeometry();
  const p=[0,0,0,side*5.2,0,-6.3,side*10.2,-.6,-2.6,
    0,0,0,side*10.2,-.6,-2.6,side*7.4,-.8,1,
    0,0,0,side*7.4,-.8,1,side*3.5,-.2,2];
  g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.computeVertexNormals();
  mesh(g,membrane,V(),V(1,1,1),pivot);
  for(const tip of[[side*5.2,0,-6.3],[side*10.2,-.6,-2.6],[side*7.4,-.8,1]])rod(V(),V(...tip),.065,skinLight,pivot);
  wings.push(pivot);
}
const breathLight=new THREE.PointLight(0xff8428,0,35,1.5);mount.add(breathLight);
const targetLight=new THREE.PointLight(0xff8130,0,23,1.5);scene.add(targetLight);
const tubeSegments=44,tubeSides=9;
function flameGeometry(){ window.__bfTrace?.add(321);
  const g=new THREE.BufferGeometry(),positions=new Float32Array((tubeSegments+1)*(tubeSides+1)*3),indices=[];
  for(let i=0;i<tubeSegments;i++)for(let j=0;j<tubeSides;j++){
    const a=i*(tubeSides+1)+j,b=a+tubeSides+1;
    indices.push(a,b,a+1,b,b+1,a+1);
  }
  g.setAttribute('position',new THREE.BufferAttribute(positions,3));g.setIndex(indices);return g;
}
const breath=mesh(flameGeometry(),flameMat),breathCore=mesh(flameGeometry(),coreMat);
breath.frustumCulled=false;breathCore.frustumCulled=false;
function updateFlame(mesh,start,end,t,factor){ window.__bfTrace?.add(331);
  const axis=end.clone().sub(start).normalize(),right=axis.clone().cross(up).normalize(),normal=right.clone().cross(axis).normalize();
  const a=mesh.geometry.attributes.position;
  for(let i=0;i<=tubeSegments;i++){
    const u=i/tubeSegments;
    const p=start.clone().lerp(end,u);
    const radius=(.105+u*.66)*factor*(1+.12*Math.sin(27*u-14*t));
    p.addScaledVector(right,.15*Math.sin(u*19-t*7)*u*(1-u));
    p.addScaledVector(normal,.11*Math.sin(u*27+t*8)*u*(1-u));
    for(let j=0;j<=tubeSides;j++){
      const angle=j/tubeSides*TAU+.15*Math.sin(t*5+u*6);
      const q=p.clone().addScaledVector(right,Math.cos(angle)*radius).addScaledVector(normal,Math.sin(angle)*radius);
      a.setXYZ(i*(tubeSides+1)+j,q.x,q.y,q.z);
    }
  }
  a.needsUpdate=true;
}
const pathKeys=[
  [0,160,32,-.105],[2,126,31,-.095],[3,108,29.7,-.1],
  [4,91,25.8,-.10],[5,75,28.8,-.045],[6.5,56,31,-.065],
  [8,36,34,-.065],[9,5,41,-.035],[10,-32,44,-.075],
];
// Cubic Hermite interpolation is continuous in position and velocity at every authored beat.
function samplePath(t,col){ window.__bfTrace?.add(354);
  let i=0;while(i<pathKeys.length-2&&t>pathKeys[i+1][0])i++;
  const a=pathKeys[i],b=pathKeys[i+1],u=clamp((t-a[0])/(b[0]-a[0])),dt=b[0]-a[0];
  const before=pathKeys[Math.max(0,i-1)],after=pathKeys[Math.min(pathKeys.length-1,i+2)];
  const m0=(b[col]-before[col])/(b[0]-before[0]),m1=(after[col]-a[col])/(after[0]-a[0]);
  return (2*u*u*u-3*u*u+1)*a[col]+(u*u*u-2*u*u+u)*dt*m0+(-2*u*u*u+3*u*u)*b[col]+(u*u*u-u*u)*dt*m1;
}
function sweepX(t){ window.__bfTrace?.add(361);return mix(-8.8,9.2,smooth((t-5.15)/2.6));}
function contactTime(x){ window.__bfTrace?.add(362);
  let lo=5.15,hi=7.75;
  for(let i=0;i<32;i++){const mid=(lo+hi)/2;if(sweepX(mid)+.82>=x-1.3)hi=mid;else lo=mid;}
  return hi;
}
const ignitionTimes=burnXs.map(contactTime);
const deviceContext=renderer.getContext(),debug=deviceContext.getExtension('WEBGL_debug_renderer_info');
const device={
  renderer:debug?deviceContext.getParameter(debug.UNMASKED_RENDERER_WEBGL):deviceContext.getParameter(deviceContext.RENDERER),
  vendor:debug?deviceContext.getParameter(debug.UNMASKED_VENDOR_WEBGL):deviceContext.getParameter(deviceContext.VENDOR),
  version:deviceContext.getParameter(deviceContext.VERSION),threeRevision:THREE.REVISION,
};
let state={};
function seek(seconds){ window.__bfTrace?.add(375);
  const t=clamp(Number(seconds)||0,0,10),flapping=TAU*.69*t;
  const bob=.22*Math.sin(flapping);
  rig.position.set(.32*Math.sin(t*.47),samplePath(t,2)+bob,samplePath(t,1));
  rig.rotation.set(samplePath(t,3)+.007*Math.sin(flapping-.4),0,.009*Math.sin(flapping)+.008*Math.sin(t*.5));
  const prep=smooth((t-3.5)/1.3),close=smooth((t-8)/.7),open=prep*(1-close);
  const extension=.43*prep;
  const desiredTarget=V(sweepX(t),23,6.48);
  rig.updateMatrixWorld(true);
  const localTarget=rig.worldToLocal(desiredTarget.clone());
  headGroup.position.set(.09*Math.sin(t*.7),-2.8,-7-extension);
  const desiredDirection=localTarget.sub(headGroup.position).normalize();
  const aiming=new THREE.Quaternion().setFromUnitVectors(forward,desiredDirection);
  headGroup.quaternion.identity().slerp(aiming,smooth((t-4.25)/.8)*(1-smooth((t-8)/.65)));
  jaw.rotation.x=-.36*open;
  glowMat.emissiveIntensity=(.05+1.8*smooth((t-4.05)/.8))*open;
  const curve=new THREE.CatmullRomCurve3([V(0,-2.55,-2.4),V(.025*Math.sin(t*.7),-2.72,-4.6),headGroup.position.clone().add(V(0,-.1,.45))]);
  const oldNeck=neckMesh.geometry;neckMesh.geometry=new THREE.TubeGeometry(curve,24,.6,12,false);oldNeck.dispose();
  for(let i=0;i<scales.length;i++){
    const u=.14+i*.095,p=curve.getPoint(u);scales[i].position.copy(p).add(V(0,.57,0));
  }
  for(let i=0;i<2;i++){
    const side=i===0?-1:1;
    hands[i].position.set(side*(1.18-.09*prep),-1.3+.032*Math.sin(flapping+.3),-2.6-.07*prep);
    hands[i].rotation.x=-.08*prep;
    const start=hands[i].position.clone().add(V(-side*.1,.01,-.2));
    const end=V(side*.54,-.16,-.65).applyQuaternion(headGroup.quaternion).add(headGroup.position);
    const c=new THREE.CatmullRomCurve3([start,
      V(side*1.03,-1.65-.10*(1-prep),-3.4),
      V(side*.9,-2.1,-5.15),end]);
    const old=reins[i].geometry;reins[i].geometry=new THREE.TubeGeometry(c,32,.037,6,false);old.dispose();
    const high=smooth((Math.sin(flapping)-.7)/.3);
    wings[i].rotation.z=side*(-.35+high*.71);
    wings[i].rotation.x=.08+.03*Math.sin(flapping);
    wings[i].visible=true;
  }
  const fireActive=t>=5&&t<8;
  const reach=smooth((t-5)/.15);
  rig.updateMatrixWorld(true);
  const mouthWorld=mouthMarker.getWorldPosition(V());
  const flameEnd=mouthWorld.clone().lerp(desiredTarget,reach);
  breath.visible=fireActive;breathCore.visible=fireActive;
  if(fireActive){updateFlame(breath,mouthWorld,flameEnd,t,1);updateFlame(breathCore,mouthWorld,flameEnd,t,.46);}
  breathLight.position.copy(headGroup.position).add(V(0,-.1,-.6));
  breathLight.intensity=fireActive?95+10*Math.sin(t*18):8*open;
  targetLight.position.copy(desiredTarget).add(V(0,1,2));
  targetLight.intensity=fireActive&&reach===1?200:((t>=8)?35:0);
  for(const f of burning){
    const age=t-ignitionTimes[f.slot];
    f.mesh.visible=age>=0;
    f.mesh.scale.set(1,.5+smooth(age/.25)*(.65+.23*Math.sin(t*9+f.mesh.userData.phase)),1);
  }
  for(const s of smoke){
    const age=t-ignitionTimes[s.slot]-.2;
    const emissionAge=age-s.phase*1.8;
    s.mesh.visible=emissionAge>=0;
    const cycle=(Math.max(0,emissionAge)*.19)%1;
    s.mesh.position.set(burnXs[s.slot]+cycle*2,23.5+cycle*9,5-cycle*3);
    s.mesh.scale.set(.5+cycle*1.3,.6+cycle*1.8,.5+cycle*1.2);
  }
  for(let i=0;i<charMarks.length;i++)charMarks[i].visible=t>=ignitionTimes[i]+.12;
  for(let i=0;i<flags.length;i++){
    const contacted=i===0?ignitionTimes[0]:ignitionTimes.at(-1);
    flags[i].scale.y=1-.78*smooth((t-contacted)/.9);
    flags[i].rotation.y=.1*Math.sin(t*2+i);
  }
  let suppressed=0;
  for(const d of defenders){
    const trigger=d.gate?contactTime(d.x)+.15:(Math.abs(d.x)<38?6.25:20);
    const retreat=smooth((t-trigger)/.65);
    d.mesh.position.set(d.x,d.baseY-retreat*.76,d.baseZ-retreat*2.2);
    d.mesh.rotation.x=-.4*retreat;
    if(retreat>0)suppressed++;
  }
  const launch= smooth((t-.32)/.4);
  firingCat.arm.rotation.x=mix(.27,-.78,launch);
  resetCat.arm.rotation.x=mix(-.91,.27,smooth((t-.1)/3.1));
  idleCat.arm.rotation.x=.24;
  ram.position.set(0,0,79-t*.84);
  stoneShot.visible=t<stoneContact;
  if(t<release){
    firingCat.group.updateMatrixWorld(true);
    stoneShot.position.copy(firingCat.arm.localToWorld(V(0,.28,3.7)));
  }else stoneShot.position.copy(stoneAt(t));
  const impactAge=t-stoneContact;
  impactDust.visible=impactAge>=0&&impactAge<.7;
  impactDust.scale.setScalar(1+clamp(impactAge)*3);
  const activeArrows=[];
  for(let i=0;i<arrowSpecs.length;i++){
    const s=arrowSpecs[i],u=(t-s.t)/s.d;
    arrows[i].visible=u>=0&&u<=1;
    if(!arrows[i].visible)continue;
    const p=V(...s.a).lerp(V(...s.b),u);p.y+=3*u*(1-u);
    const dir=V(...s.b).sub(V(...s.a));dir.y+=3-6*u;
    arrows[i].position.copy(p);arrows[i].quaternion.setFromUnitVectors(forward,dir.normalize());
    activeArrows.push({index:i,position:p.toArray(),launchTime:s.t});
  }
  scene.updateMatrixWorld(true);
  const project=p=>{const n=p.clone().project(camera);return{x:(n.x+1)*W/2,y:(1-n.y)*H/2,inFrame:Math.abs(n.x)<=1&&Math.abs(n.y)<=1&&n.z>=-1&&n.z<=1};};
  const nearGate=Math.abs(rig.position.z)<14;
  let originError=null;
  if(fireActive){
    const a=breath.geometry.attributes.position,actualOrigin=V();
    for(let j=0;j<tubeSides;j++)actualOrigin.add(V(a.getX(j),a.getY(j),a.getZ(j)));
    originError=actualOrigin.divideScalar(tubeSides).distanceTo(mouthWorld);
  }
  const mountBounds=new THREE.Box3().setFromObject(mount);
  const inGateEnvelope=mountBounds.min.z<7&&mountBounds.max.z>-7;
  state={
    time:t,rigPosition:rig.position.toArray(),rigPitchRadians:rig.rotation.x,
    wingbeatHz:.69,bob,visibleWingEdges:wings.filter((w,i)=>project(w.localToWorld(V((i===0?-1:1)*5.2,0,-6.3))).inFrame).length,
    cameraParent:camera.parent.name,cameraLocalPosition:camera.position.toArray(),
    handCount:hands.length,handPixels:hands.map(h=>project(h.getWorldPosition(V()))),
    gate:{position:[0,0,0],roofHeight:22,maximumCentralFixtureHeight:24,frontZ:6.75},
    gateRoofPixels:project(V(0,22,6.75)),
    cameraClearanceAboveCentralFixtures:nearGate?rig.position.y-24:null,
    mountWorldBounds:{min:mountBounds.min.toArray(),max:mountBounds.max.toArray()},
    conservativeMountClearanceAboveTallestGateTower:inGateEnvelope?mountBounds.min.y-27.6:null,
    mouth:mouthWorld.toArray(),mouthPixels:project(mouthWorld),
    target:desiredTarget.toArray(),targetPixels:project(desiredTarget),
    jawOpen:open,throatGlow:glowMat.emissiveIntensity,fireActive,flameReach:fireActive?reach:0,
    mouthOriginError:originError,wallContact:fireActive&&reach===1,
    flameTargetX:desiredTarget.x,ignitedSlots:burnXs.filter((_,i)=>t>=ignitionTimes[i]),
    ignitionTimes:burnXs.map((x,i)=>({x,time:ignitionTimes[i]})),
    suppressedDefenders:suppressed,ramPosition:ram.position.toArray(),ramProjectileCount:0,
    catapultAngles:[firingCat.arm.rotation.x,resetCat.arm.rotation.x,idleCat.arm.rotation.x],
    catapultPixels:[firingCat,resetCat,idleCat].map(c=>project(c.group.localToWorld(V(0,4,0)))),
    stone:{visible:stoneShot.visible,position:stoneShot.position.toArray(),pixels:project(stoneShot.position),releaseTime:release,contactTime:stoneContact},
    arrows:activeArrows,attackerCount:attackers.length,defenderCount:defenders.length,
    cityBuildingCount:houseIndex,renderer:device,
  };
  renderer.render(scene,camera);
  return state;
}
const pixels=new Uint8Array(W*H*4);
window.reconstruction={
  ready:true,pause(){return true;},seek,
  diagnostics(){return state;},
  async streamFrame(index){
    deviceContext.readPixels(0,0,W,H,deviceContext.RGBA,deviceContext.UNSIGNED_BYTE,pixels);
    const response=await fetch(`/__frame?index=${index}`,{method:'POST',body:pixels});
    if(!response.ok)throw new Error(`Frame transfer ${index} failed ${response.status}`);
  },
};
seek(0);
