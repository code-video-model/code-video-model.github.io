import * as THREE from '../vendor/three.module.js';

const W=960,H=544,LAST=123/24;
const animated=new URLSearchParams(location.search).get('motion')==='1';
const scene=new THREE.Scene();
scene.background=new THREE.Color('#6e442a');
scene.fog=new THREE.Fog('#7c5331',19,35);
const camera=new THREE.PerspectiveCamera(18.8,W/H,.03,80);
camera.position.set(0,2.7,6.5);camera.lookAt(0,1.18,0);camera.updateMatrixWorld(true);
const referenceCamera=camera.clone();
const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
renderer.setPixelRatio(devicePixelRatio);renderer.setSize(W,H);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
scene.add(new THREE.HemisphereLight('#fff0d2','#705134',2.2));
const light=new THREE.DirectionalLight('#ffdc99',2.5);light.position.set(-3,7,6);
light.castShadow=true;light.shadow.mapSize.set(2048,2048);
Object.assign(light.shadow.camera,{left:-8,right:8,top:10,bottom:-10,near:.5,far:30});
light.shadow.bias=-.0002;light.shadow.normalBias=.012;scene.add(light);
const raycaster=new THREE.Raycaster(),V=(x,y,z=0)=>new THREE.Vector3(x,y,z);
const up=V(0,1,0), smooth=x=>{const t=Math.max(0,Math.min(1,x));return t*t*(3-2*t);};
const lerp=THREE.MathUtils.lerp;
function ray(x,y){raycaster.setFromCamera(new THREE.Vector2(x/1920*2-1,1-(y+4)/1088*2),referenceCamera);return raycaster.ray.clone();}
function plane(x,y,z){const r=ray(x,y);return r.at((z-r.origin.z)/r.direction.z,new THREE.Vector3());}
function floor(x,y){const r=ray(x,y);return r.at(-r.origin.y/r.direction.y,new THREE.Vector3());}
const tex=new THREE.DataTexture(new Uint8Array([110,185,230,255]),4,1,THREE.RedFormat);
tex.minFilter=tex.magFilter=THREE.NearestFilter;tex.needsUpdate=true;
const toon=color=>new THREE.MeshToonMaterial({color,gradientMap:tex});
const flat=color=>new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide});
const metal=color=>new THREE.MeshPhongMaterial({color,specular:'#fff0c9',shininess:75});
const mat={cream:toon('#ffefba'),purple:toon('#614482'),gold:metal('#d8a33b'),hair:toon('#c88079'),
  skin:toon('#ffe7bf'),blue:toon('#32a9ff'),yellow:toon('#f6d250'),dark:toon('#594b51'),
  ivory:toon('#f5efd4'),wood:toon('#684128'),red:toon('#713c25'),line:flat('#684c48')};
const sphere=new THREE.SphereGeometry(1,24,18),cube=new THREE.BoxGeometry(1,1,1);
function mesh(g,m,parent,p=V(0,0,0),s=V(1,1,1)){const o=new THREE.Mesh(g,m);o.position.copy(p);o.scale.copy(s);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
const ell=(parent,m,p,s)=>mesh(sphere,m,parent,p,s);
const box=(parent,m,p,s)=>mesh(cube,m,parent,p,s);
function outline(o,scale=1.017){const edge=new THREE.Mesh(o.geometry,new THREE.MeshBasicMaterial({color:'#644f49',side:THREE.BackSide}));edge.scale.setScalar(scale);edge.castShadow=false;o.add(edge);}
function stick(parent,m,a,b,r=.012){const o=mesh(new THREE.CylinderGeometry(r,r,1,10),m,parent);setStick(o,a,b);return o;}
function setStick(o,a,b){const d=b.clone().sub(a);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(up,d.clone().normalize());o.scale.set(1,d.length(),1);}
function tube(parent,points,r,m){return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),Math.max(24,points.length*6),r,8,false),m,parent);}

const hall=new THREE.Group();scene.add(hall);
const floorGroup=new THREE.Group();hall.add(floorGroup);floorGroup.rotation.y=Math.PI/4;
const tileGeo=new THREE.BoxGeometry(.72,.045,.72),tileMats=[new THREE.MeshPhongMaterial({color:'#f1ddb4',shininess:65}),new THREE.MeshPhongMaterial({color:'#97663d',shininess:50})];
for(let x=-23;x<=23;x++)for(let z=-28;z<=16;z++){const tile=mesh(tileGeo,tileMats[(x+z+200)%2],floorGroup,V(x*.72,-.023,z*.72));tile.castShadow=false;}
box(hall,toon('#71482c'),V(0,3,-16),V(24,6,.35));
for(const side of [-1,1]){
  const start=floor(side<0?428:1497,354);const width=1.72;
  for(let i=0;i<22;i++){
    const y=(i+1)*.135,z=start.z-i*.28;
    box(hall,mat.red,V(start.x,y/2,z),V(width,y,.29));
    box(hall,toon('#bc8a4e'),V(start.x,y+.004,z+.135),V(width,.009,.014));
  }
  for(const railSide of [-1,1]){
    const x=start.x+railSide*width*.52;
    const a=V(x,.75,start.z+.13),b=V(x,3.7,start.z-5.97);
    stick(hall,mat.wood,a,b,.058);stick(hall,mat.gold,a.clone().add(V(0,.038,0)),b.clone().add(V(0,.038,0)),.024);
    for(let i=0;i<22;i+=2)stick(hall,mat.wood,V(x,i*.135,start.z-i*.28),V(x,.75+i*.135,start.z-i*.28),.032);
    box(hall,mat.wood,V(x,.48,start.z+.16),V(.14,.96,.14));ell(hall,mat.gold,V(x,1.02,start.z+.16),V(.08,.08,.08));
  }
  for(let j=0;j<3;j++){
    const x=side*(4.2+j*1.25),z=-8.8-j*.3;
    box(hall,toon('#583c28'),V(x,2.1,z),V(.20,4.2,.25));
    box(hall,toon('#b68d55'),V(x+.42,1.55,z-.18),V(.85,2.4,.07));
    box(hall,toon('#573b25'),V(x+.42,2.85,z-.13),V(.98,.14,.18));
    ell(hall,new THREE.MeshBasicMaterial({color:'#fff1b4'}),V(x+.39,2.18,z+.03),V(.13,.17,.13));
  }
}
const tankFloor=floor(960,451),tankZ=tankFloor.z;
const tankLeft=plane(642,309,tankZ),tankRight=plane(1283,309,tankZ),tankTop=plane(960,30,tankZ);
const tw=tankRight.x-tankLeft.x, baseH=tankLeft.y, th=tankTop.y-baseH;
box(hall,mat.wood,V(0,baseH/2,tankZ-.5),V(tw+.12,baseH,1.25));
box(hall,mat.gold,V(0,baseH,tankZ-.42),V(tw+.18,.045,1.2));
box(hall,flat('#ccded0'),V(0,baseH+th/2,tankZ-.95),V(tw,th,.04));
const glass=new THREE.MeshPhongMaterial({color:'#d4ffed',transparent:true,opacity:.13,shininess:100,depthWrite:false});
box(hall,glass,V(0,baseH+th/2,tankZ),V(tw,th,.018));
for(const x of [-tw/2,tw/2])stick(hall,flat('#eaffdf'),V(x,baseH,tankZ),V(x,baseH+th,tankZ),.018);
for(const y of [baseH,baseH+th])stick(hall,flat('#f5ffe2'),V(-tw/2,y,tankZ),V(tw/2,y,tankZ),.020);
let seed=94217;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
for(let i=0;i<75;i++){
  const x=(random()-.5)*tw*.89,z=tankZ-.16-random()*.63;
  const mound=(1-Math.abs(x/(tw*.5)))*th*.49+random()*.22;
  const rock=mesh(new THREE.IcosahedronGeometry(1,1),toon(i%4===0?'#a79d60':'#537b45'),hall,V(x,baseH+mound*.42,z),V(.17+random()*.23,mound+.08,.13+random()*.18));
  rock.rotation.set(random(),random()*3,random());
}
tube(hall,[V(-tw*.37,baseH+.2,tankZ-.3),V(-tw*.13,baseH+.63,tankZ-.4),V(tw*.17,baseH+th*.78,tankZ-.43)],.14,toon('#677442'));

function robotLegs(group,color,radius,topY,spread,white=false){
  for(const a of [Math.PI*.20,Math.PI*.80,Math.PI*1.20,Math.PI*1.80]){
    const p=V(Math.sin(a)*radius,topY,Math.cos(a)*radius);
    const k=V(Math.sin(a)*(radius+spread*.45),.20,Math.cos(a)*(radius+spread*.45));
    const f=V(Math.sin(a)*(radius+spread),.075,Math.cos(a)*(radius+spread));
    ell(group,mat.gold,p,V(.06,.06,.06));
    const upper=stick(group,color,p,k,.062);outline(upper);
    const lower=stick(group,white?mat.ivory:color,k,f,.085);outline(lower);
    const foot=ell(group,white?mat.ivory:color,f,V(.09,.075,.14));foot.rotation.y=a;outline(foot);
    ell(group,mat.dark,f.clone().add(V(0,-.046,0)),V(.085,.026,.13));
  }
}
function capsuleRobot(x,y,topPixel,radiusPixels,color){
  const base=floor(x,y),group=new THREE.Group();group.position.copy(base);scene.add(group);
  const top=plane(x,topPixel,base.z).y, radius=Math.abs(plane(x+radiusPixels,topPixel+180,base.z).x-plane(x,topPixel+180,base.z).x);
  const bottom=.30, bodyHeight=top-bottom-radius;
  const body=mesh(new THREE.CylinderGeometry(radius,radius,bodyHeight,40),color,group,V(0,bottom+bodyHeight/2,0));outline(body);
  const cap=mesh(new THREE.SphereGeometry(radius,40,20,0,Math.PI*2,0,Math.PI/2),color,group,V(0,bottom+bodyHeight,0));outline(cap);
  const baseCap=ell(group,color,V(0,bottom,0),V(radius,.08,radius));outline(baseCap);
  for(const fy of [.20,.44]){
    const y=bottom+bodyHeight*fy;
    const ring=mesh(new THREE.TorusGeometry(radius+.004,.006,6,64),mat.line,group,V(0,y,0));ring.rotation.x=Math.PI/2;
  }
  for(const fx of [-.59,.59])for(const fy of [.27,.65])ell(group,new THREE.MeshBasicMaterial({color:'#79c997'}),V(radius*fx,bottom+bodyHeight*fy,radius*.818),V(.015,.015,.009));
  tube(group,[V(-.055,bottom+bodyHeight*.43,radius+.008),V(0,bottom+bodyHeight*.46,radius+.008),V(.055,bottom+bodyHeight*.43,radius+.008)],.006,mat.line);
  for(const side of [-1,1])tube(group,[V(side*radius*.93,bottom+bodyHeight*.19,radius*.38),V(side*radius*.97,bottom+bodyHeight*.23,radius*.38),V(side*radius*.97,bottom+bodyHeight*.75,radius*.38)],.007,mat.line);
  robotLegs(group,color,radius,.38,.26);
  return group;
}
const blueRobot=capsuleRobot(433,892,351,89,mat.blue);
const yellowRobot=capsuleRobot(665,755,323,76,mat.yellow);
const cart=new THREE.Group();cart.position.copy(floor(1346,701));scene.add(cart);
const cartTop=plane(1335,24,cart.position.z).y;
const cartWidth=Math.abs(plane(1450,455,cart.position.z).x-plane(1240,455,cart.position.z).x);
const cr=cartWidth/2;
const cartBase=box(cart,mat.purple,V(0,.43,0),V(cartWidth,.27,.54));outline(cartBase);
box(cart,mat.gold,V(0,.32,.01),V(cartWidth+.08,.055,.58));
robotLegs(cart,mat.gold,cr*.83,.40,.20,true);
for(const x of [-cr,cr])for(const z of [-.2,.2]){
  stick(cart,mat.gold,V(x,.51,z),V(x,cartTop*.62,z),.021);
  tube(cart,[V(x,cartTop*.62,z),V(x*.83,cartTop*.87,z),V(0,cartTop*.965,z)],.021,mat.gold);
}
const oval=[];
for(let i=0;i<=64;i++){const a=i/64*Math.PI*2;oval.push(V(Math.sin(a)*cr*.96,cartTop*.69+Math.cos(a)*cartTop*.29,.215));}
tube(cart,oval,.014,mat.gold);stick(cart,mat.gold,V(0,.55,0),V(0,cartTop,0),.018);
for(const y of [cartTop*.46,cartTop*.58]){
  const bar=box(cart,mat.gold,V(0,y,.245),V(cartWidth+.14,.13,.055));outline(bar);
  for(const s of [-1,1])ell(cart,mat.gold,V(s*(cr+.055),y+.017,.25),V(.055,.075,.04));
}
for(const y of [cartTop+.018,cartTop+.068,cartTop+.104])ell(cart,mat.gold,V(0,y,0),V(.036,.025,.036));
const face=ell(cart,mat.yellow,V(0,.29,.345),V(cr*.67,.18,.06));outline(face);
ell(cart,flat('#e1ecd0'),V(0,.305,.397),V(cr*.51,.135,.013));
for(const x of [-cr*.32,cr*.32])ell(cart,flat('#80c2a1'),V(x,.282,.414),V(.017,.017,.008));
tube(cart,[V(-cr*.45,.25,.420),V(0,.275,.420),V(cr*.45,.25,.420)],.006,mat.line);
const smallBot=new THREE.Group();smallBot.position.copy(floor(1488,887));scene.add(smallBot);
const little=ell(smallBot,mat.yellow,V(0,.27,0),V(.23,.13,.17));outline(little);
box(smallBot,mat.dark,V(0,.17,0),V(.27,.12,.20));
robotLegs(smallBot,mat.yellow,.13,.18,.12);
for(const x of [-.13,.13])ell(smallBot,flat('#82c4a0'),V(x,.27,.162),V(.012,.014,.007));
tube(smallBot,[V(-.08,.235,.177),V(0,.25,.180),V(.08,.235,.177)],.005,mat.line);

const footPlane=floor(944,1040),girlZ=footPlane.z;
const girl=new THREE.Group();scene.add(girl);
const hipWorld=plane(945,490,girlZ);
const upper=new THREE.Group();upper.position.copy(hipWorld);girl.add(upper);
function localPixel(x,y){return plane(x,y,girlZ).sub(hipWorld);}
let artOrder=0;
function art(parent,data,color,origin=hipWorld){
  const tokens=data.match(/[MLCQZ]|-?\d*\.?\d+/gi);let index=0;const s=new THREE.Shape();
  const point=()=>{const p=plane(Number(tokens[index++]),Number(tokens[index++]),girlZ).sub(origin);return[p.x,p.y];};
  while(index<tokens.length){const c=tokens[index++];if(c==='M')s.moveTo(...point());else if(c==='L')s.lineTo(...point());else if(c==='C')s.bezierCurveTo(...point(),...point(),...point());else if(c==='Q')s.quadraticCurveTo(...point(),...point());else if(c==='Z')s.closePath();else throw new Error(c);}
  const z=.055+(artOrder++)*.00065;
  const fill=mesh(new THREE.ShapeGeometry(s,16),flat(color),parent,V(0,0,z));
  const pts=s.getPoints(25).map(p=>V(p.x,p.y,z+.0004));
  const stroke=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineBasicMaterial({color:'#77544b'}));parent.add(stroke);
  return fill;
}
const skirtTop=hipWorld.y;
const skirtBottom=plane(945,821,girlZ).y;
const radius=Math.abs(plane(1080,789,girlZ).x-plane(945,789,girlZ).x);
const profile=[new THREE.Vector2(radius*.38,skirtTop),new THREE.Vector2(radius*.52,skirtTop-.14),new THREE.Vector2(radius*.82,skirtBottom+.14),new THREE.Vector2(radius,skirtBottom+.045),new THREE.Vector2(radius*.95,skirtBottom)];
const skirt=mesh(new THREE.LatheGeometry([...profile].reverse(),48),mat.purple,girl,V(hipWorld.x,0,girlZ),V(1,1,.54));outline(skirt);
const hem=mesh(new THREE.CylinderGeometry(radius*.99,radius*.96,.045,48,1,true),mat.gold,girl,V(hipWorld.x,skirtBottom+.025,girlZ),V(1,1,.54));
const underskirt=mesh(new THREE.CylinderGeometry(radius*.97,radius*.93,.060,48,1,true),mat.ivory,girl,V(hipWorld.x,skirtBottom-.025,girlZ),V(1,1,.54));
for(const s of [-1,1]){
  const ankle=floor(s<0?928:986,s<0?1025:1005);ankle.y=.11;
  const knee=plane(s<0?921:975,867,girlZ);
  const leg=stick(girl,mat.dark,knee,ankle,.053);outline(leg);
  const shoe=ell(girl,mat.dark,ankle.clone().add(V(0,-.055,.06)),V(.068,.061,.14));shoe.rotation.y=s*.12;outline(shoe);
  const strap=box(girl,toon('#8b625c'),ankle.clone().add(V(0,.002,.032)),V(.106,.032,.049));strap.rotation.x=-.10;
}
art(upper,'M902 366 L978 361 L1009 502 L983 532 L886 527 L891 461 Z','#684486');
art(upper,'M884 344 Q855 336 843 364 L821 413 Q817 431 835 443 L846 469 L851 495 L881 524 L909 504 L912 442 L927 369 Z','#faeac1');
art(upper,'M982 342 Q1016 336 1035 364 L1061 416 Q1066 434 1045 447 L1037 471 L1038 491 L1004 524 L980 505 L976 437 L960 367 Z','#faeac1');
art(upper,'M903 348 L912 343 Q932 359 927 387 L909 457 L892 481 L882 483 L903 448 L918 380 Z','#e0b250');
art(upper,'M981 345 L973 342 L960 367 L974 433 L993 468 L1003 484 L1012 482 L986 432 L971 370 Z','#e0b250');
art(upper,'M916 477 Q943 484 969 477 L967 485 Q941 490 916 484 Z','#c49841');
art(upper,'M890 315 L914 309 L932 320 L952 305 L982 315 L977 348 L953 361 L925 351 L907 354 L884 335 Z','#b68bd9');
art(upper,'M904 315 L920 319 L912 339 L924 348 L914 355 L899 334 Z','#fcf0d9');
art(upper,'M941 317 L956 312 L967 325 L954 349 L941 352 L945 331 Z','#efe5ff');

const headPivot=plane(945,312,girlZ).sub(hipWorld);
const head=new THREE.Group();head.position.copy(headPivot);upper.add(head);
const headOrigin=plane(945,312,girlZ);
const hairCenter=plane(944,219,girlZ).sub(headOrigin);
const hairScale=V(Math.abs(plane(1017,218,girlZ).x-plane(944,218,girlZ).x),.17,.095);
ell(head,mat.hair,hairCenter.clone().add(V(0,0,-.060)),hairScale);
art(head,'M882 228 Q888 181 929 181 Q979 175 999 216 L1000 272 Q982 309 947 312 Q910 306 890 281 Z','#ffe9bf',headOrigin);
art(head,'M887 272 Q869 264 878 245 L891 249 Z','#ffe9bf',headOrigin);
art(head,'M992 253 Q1011 242 1007 259 L994 277 Z','#ffe9bf',headOrigin);
art(head,'M884 246 Q863 230 870 203 Q874 173 893 165 Q902 158 913 168 Q929 139 949 143 Q984 151 991 202 Q1000 238 1018 248 L987 255 L973 244 L951 225 L939 189 Q924 213 915 220 L909 241 L898 231 L889 268 Z','#d89488',headOrigin);
art(head,'M886 194 Q895 176 904 178 L910 181 Q893 188 886 210 Z','#f4c2a7',headOrigin);
art(head,'M932 152 Q951 141 964 166 Q948 153 932 166 Z','#f6c9b1',headOrigin);
const eyeMeshes=[];
for(const x of [913,966]){
  const p=plane(x,252,girlZ).sub(headOrigin);
  const g=new THREE.Group();g.position.copy(p).add(V(0,0,.086));head.add(g);
  ell(g,flat('#fff5d8'),V(0,0,0),V(.028,.038,.002));
  ell(g,flat('#925c45'),V(.001,-.004,.003),V(.012,.030,.002));
  ell(g,flat('#4d3f4b'),V(.001,0,.005),V(.007,.022,.002));
  ell(g,flat('#fff1ca'),V(.006,.013,.008),V(.006,.008,.002));
  eyeMeshes.push(g);
}
art(head,'M903 239 Q913 231 925 242 L923 246 Q914 238 904 245 Z','#895142',headOrigin);
art(head,'M955 241 Q966 232 977 240 L978 247 Q966 239 956 246 Z','#895142',headOrigin);
art(head,'M932 289 Q942 293 951 289 Q942 295 933 292 Z','#965f55',headOrigin);
art(head,'M939 260 L942 271 L938 272 Z','#d4a58a',headOrigin);

function solveElbow(a,b,len1,len2,preferred){
  const d=b.clone().sub(a),distance=d.length();
  if(distance>len1+len2+.0001)throw new Error('Unreachable wrist target');
  const axis=d.normalize(),along=(len1*len1-len2*len2+distance*distance)/(2*distance);
  const pole=preferred.clone().sub(a);pole.addScaledVector(axis,-pole.dot(axis)).normalize();
  return a.clone().addScaledVector(axis,along).addScaledVector(pole,Math.sqrt(Math.max(0,len1*len1-along*along)));
}
function makeArm(side){
  const shoulder=localPixel(side<0?847:1035,380),elbow=localPixel(side<0?856:1032,473),wrist=localPixel(side<0?925:966,548);
  const sleeve=mesh(new THREE.CylinderGeometry(.068,.088,1,20),mat.cream,upper);outline(sleeve);
  const puff=ell(upper,mat.cream,shoulder,V(.086,.09,.082));outline(puff);
  const forearm=mesh(new THREE.CylinderGeometry(.049,.067,1,18),mat.cream,upper);outline(forearm);
  const cuff=mesh(new THREE.CylinderGeometry(.060,.058,1,18),mat.ivory,upper);outline(cuff);
  const hand=new THREE.Group();upper.add(hand);
  const palm=ell(hand,mat.skin,V(0,0,.018),V(.042,.06,.018));outline(palm,1.02);
  const fingers=[];
  for(let i=0;i<4;i++){
    const joint=new THREE.Group();joint.position.set((i-1.5)*.020,.037,.018);hand.add(joint);
    const f=ell(joint,mat.skin,V(0,.027,0),V(.010,.036-(i===3?.006:0),.011));outline(f,1.02);fingers.push(joint);
  }
  const thumb=ell(hand,mat.skin,V(side*.041,.003,.017),V(.016,.033,.012));thumb.rotation.z=-side*.7;
  return{side,shoulder,elbow,wrist,len1:shoulder.distanceTo(elbow),len2:elbow.distanceTo(wrist),sleeve,forearm,cuff,hand,fingers};
}
const arms=[makeArm(-1),makeArm(1)];
const braids=[-1,1].map(side=>{
  const pieces=[];
  for(let i=0;i<20;i++){const segment=mesh(new THREE.CylinderGeometry(.014,.014,1,10),i%2?toon('#bc6e76'):mat.hair,scene);outline(segment,1.05);pieces.push(segment);}
  const tip=ell(scene,mat.hair,V(0,0,0),V(.026,.050,.018));
  return{side,pieces,tip,anchor:plane(side<0?890:991,295,girlZ-.025).sub(headOrigin)};
});
let diagnostics={};
function seek(value){
  const t=animated?Math.max(0,Math.min(LAST,Number(value))):0;
  const pull=smooth(t/LAST),open=smooth((t-.35)/1.65),bow=smooth((t-2.05)/1.95);
  camera.position.set(0,2.7+.28*pull,6.5+2.05*pull);camera.lookAt(0,1.18,0);camera.updateProjectionMatrix();
  upper.rotation.x=bow*.61;head.rotation.x=bow*.045;
  for(const arm of arms){
    const target=arm.wrist.clone().lerp(localPixel(arm.side<0?755:1134,464),open);
    target.z=lerp(.12,.06,open);
    const preferred=arm.elbow.clone().lerp(localPixel(arm.side<0?802:1092,437),open);
    const elbow=solveElbow(arm.shoulder,target,arm.len1+.02,arm.len2+.02,preferred);
    const cuffStart=target.clone().lerp(elbow,.21);
    setStick(arm.sleeve,arm.shoulder,elbow);setStick(arm.forearm,elbow,cuffStart);setStick(arm.cuff,cuffStart,target);
    arm.hand.position.copy(target).add(V(0,-.032,.035));
    arm.hand.rotation.set(lerp(-.22,-.1,open),arm.side*lerp(.13,.30,open),arm.side*lerp(.72,1.07,open));
    for(let i=0;i<arm.fingers.length;i++){arm.fingers[i].rotation.x=lerp(-1.04,0,open);arm.fingers[i].rotation.z=arm.side*(i-1.5)*.060*open;}
  }
  for(const eye of eyeMeshes)eye.scale.y=1-.90*smooth((t-2.15)/.7);
  scene.updateMatrixWorld(true);
  for(const braid of braids){
    const anchor=head.localToWorld(braid.anchor.clone());
    const points=[];
    for(let i=0;i<=20;i++){
      const u=i/20;
      points.push(anchor.clone().add(V(braid.side*(.23*u+.011*Math.sin(u*18*Math.PI)), -.80*u,
        -.012+bow*.06*Math.sin(Math.PI*u)+.015*Math.sin(u*9*Math.PI))));
    }
    for(let i=0;i<20;i++)setStick(braid.pieces[i],points[i],points[i+1]);
    braid.tip.position.copy(points[20]).add(V(braid.side*.020,-.012,0));braid.tip.rotation.z=braid.side*1.05;
  }
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const projected=upper.getWorldPosition(new THREE.Vector3()).project(camera);
  diagnostics={seconds:t,robot_count:4,girl_count:1,pullback_fraction:pull,arm_open_fraction:open,bow_degrees:bow*.61*180/Math.PI,
    projected_waist:[(projected.x+1)*W/2,(1-projected.y)*H/2],hip_world:hipWorld.toArray(),foot_support:'fixed-floor',
    wrist_world:arms.map(a=>a.hand.getWorldPosition(new THREE.Vector3()).toArray()),image_generation_calls:0,reference_textures:0};
  renderer.render(scene,camera);
}
window.reconstruction={pause(){},seek,getCameraState(){return{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};},
  getDiagnostics(){return structuredClone(diagnostics);},getSceneContract(){return{width:W,height:H,fps:24,frames:124,robot_count:4,
    mode:animated?'pullback-open-palms-bow':'static',geometry:'3D lobby/robots/rig with authored anime face and garment contours',reference_image_textures:0};}};
seek(0);

// Project-page capture adapter; original source is available separately.
const __animeRender = renderer.render.bind(renderer);
renderer.render = (s,c) => {if (!window.__bfSampling) return __animeRender(s,c);};
window.__bfCapture = {THREE, renderer, scene, camera};
