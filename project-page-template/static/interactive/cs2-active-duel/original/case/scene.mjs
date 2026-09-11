import * as THREE from './vendor/three.module.js';

const v = (x,y,z) => new THREE.Vector3(x,y,z);
const clamp = x => Math.max(0,Math.min(1,x));
const smooth = x => { x=clamp(x); return x*x*(3-2*x); };
const lerp = (a,b,t) => a+(b-a)*t;
let seed=934172;
function random() { seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/4294967296; }

function proceduralTexture(kind) {
  const c=document.createElement('canvas'); c.width=c.height=512;
  const g=c.getContext('2d');
  const base=kind==='wood'?[112,83,49]:kind==='ground'?[172,157,129]:[212,190,145];
  const im=g.createImageData(512,512);
  for(let y=0;y<512;y++) for(let x=0;x<512;x++){
    const n=(random()-.5)*(kind==='wood'?18:15);
    const grain=kind==='wood'?Math.sin(x*.55+Math.sin(y*.023)*2)*8:Math.sin(x*.021)*Math.cos(y*.028)*3;
    const k=(y*512+x)*4;
    for(let j=0;j<3;j++) im.data[k+j]=base[j]+n+grain;
    im.data[k+3]=255;
  }
  g.putImageData(im,0,0);
  if(kind==='plaster') {
    for(let i=0;i<310;i++) {
      const x=random()*512,y=random()*512,r=2+random()*19;
      g.fillStyle=`rgba(99,83,60,${.025+random()*.055})`;
      g.beginPath();g.ellipse(x,y,r,r*(.3+random()),random()*3,0,Math.PI*2);g.fill();
    }
    g.strokeStyle='rgba(95,81,59,.20)';g.lineWidth=.7;
    for(let i=0;i<15;i++){
      let x=random()*512,y=random()*512;g.beginPath();g.moveTo(x,y);
      for(let j=0;j<5;j++){x+=(random()-.5)*16;y+=random()*12;g.lineTo(x,y);}g.stroke();
    }
  }
  if(kind==='ground') {
    for(let i=0;i<4200;i++) {g.fillStyle=random()>.5?'#baa889':'#8f8570';g.fillRect(random()*512,random()*512,1+random()*2,1);}
    g.strokeStyle='rgba(91,80,61,.15)';g.lineWidth=2;
    for(let y=0;y<512;y+=128){g.beginPath();g.moveTo(0,y);g.lineTo(512,y);g.stroke();}
    for(let i=0;i<4;i++) for(let j=0;j<4;j++){const x=(j*128+i%2*64)%512;g.beginPath();g.moveTo(x,i*128);g.lineTo(x,(i+1)*128);g.stroke();}
  }
  if(kind==='wood') {
    for(let x=4;x<512;x+=48) {g.fillStyle='rgba(20,15,8,.33)';g.fillRect(x,0,3,512);g.fillStyle='rgba(222,181,118,.15)';g.fillRect(x+3,0,2,512);}
    for(let i=0;i<800;i++){g.fillStyle='rgba(40,24,10,.10)';g.fillRect(random()*512,random()*512,.7,5+random()*45);}
  }
  const t=new THREE.CanvasTexture(c);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=8;
  return t;
}

export function buildScene(timeline) {
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x91c9e8);
  scene.fog=new THREE.Fog(0xbbd1cc,48,110);
  const camera=new THREE.PerspectiveCamera(61,16/9,.05,140);
  const world=new THREE.Group();world.name='immutable-world';scene.add(world);
  const materials={};
  const mat=(name,color,roughness=.8,metalness=0,map=null) => materials[name]=new THREE.MeshStandardMaterial({color,roughness,metalness,map});
  const plaster=mat('sunlit-plaster',0xffffff,.93,0,proceduralTexture('plaster'));
  const pale=mat('pale-plaster',0xe6d2a5);
  const stone=mat('sandstone',0xb29e7a);
  const trim=mat('limestone-coping',0xd5c4a1);
  const ground=mat('rough-stone-paving',0xffffff,.98,0,proceduralTexture('ground'));ground.map.repeat.set(20,25);
  const timber=mat('crate-timber',0xffffff,.89,0,proceduralTexture('wood'));
  const wood=mat('rifle-walnut',0xe5b98b,.59,0,proceduralTexture('wood'));
  const metal=mat('blued-steel',0x35424b,.48,.38);
  const black=mat('matte-dark-metal',0x151c23,.63,.4);
  const edge=mat('metal-edges',0x687078,.4,.68);
  const cloth=mat('olive-sleeves',0x555347);
  const glove=mat('dark-gloves',0x262e2e);
  const rubber=mat('glove-padding',0x424844);
  const blue=mat('defender-uniform',0x334859);
  const vest=mat('defender-armor',0x242e38);
  const skin=mat('face-shadow',0xa38d74);
  const dark=mat('deep-recess',0x3b4140);
  const brass=mat('spent-brass',0xc9a255,.32,.72);
  const geomBox=new THREE.BoxGeometry(1,1,1);
  const geomSphere=new THREE.SphereGeometry(1,12,8);
  function box(parent,m,x,y,z,sx,sy,sz) {
    const o=new THREE.Mesh(geomBox,m);o.position.set(x,y,z);o.scale.set(sx,sy,sz);
    o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function ellipsoid(parent,m,p,s) {
    const o=new THREE.Mesh(geomSphere,m);o.position.copy(p);o.scale.copy(s);o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function cylinder(parent,m,a,b,r,r2=r,segments=12) {
    const d=b.clone().sub(a),o=new THREE.Mesh(new THREE.CylinderGeometry(r2,r,d.length(),segments),m);
    o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());
    o.castShadow=o.receiveShadow=true;parent.add(o);return o;
  }
  function lineBox(parent,m,a,b,width,depth=width) {
    const d=b.clone().sub(a);const o=box(parent,m,0,0,0,width,d.length(),depth);
    o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());return o;
  }
  scene.add(new THREE.HemisphereLight(0xcfe8ff,0x857559,2.05));
  const sun=new THREE.DirectionalLight(0xffefd2,3.3);
  sun.position.set(-9,19,10);sun.target.position.set(1,0,-9);scene.add(sun,sun.target);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-20,right:20,top:24,bottom:-24,near:.5,far:70});
  sun.shadow.bias=-.00025;sun.shadow.normalBias=.035;
  box(world,ground,0,-.13,-15,90,.24,100);
  // The near corner and all distant landmarks are built once, never reposed.
  box(world,plaster,-4,1.9,-.5,7.4,3.8,5.0);
  box(world,trim,-4,3.84,-.5,7.55,.16,5.12);
  box(world,stone,-4,.28,2.02,7.4,.55,.11);
  for(let y=.3;y<3.3;y+=.5) {
    box(world,trim,-.52,y,2.012,.42,.19,.025);
  }
  box(world,plaster,-6.35,2.6,-14,1.4,5.2,23);
  box(world,stone,-5.58,.24,-13.5,.20,.46,24);
  box(world,plaster,6.6,2.75,-12,1.2,5.5,28);
  box(world,trim,5.94,5.48,-12,.22,.24,28);
  box(world,stone,5.93,.22,-12,.21,.43,28);
  for(let z=-2;z>-27;z-=5) {
    box(world,trim,5.91,2.7,z,.18,5.25,.28);
    box(world,dark,5.97,3.56,z-1.8,.06,1.2,.84);
    box(world,timber,5.91,3.56,z-1.8,.04,1.06,.74);
    for(let i=0;i<5;i++) box(world,black,5.86,3.56,z-2.10+i*.15,.035,1.02,.025);
    box(world,trim,5.85,2.88,z-1.8,.22,.12,1.0);
  }
  box(world,plaster,-3.4,3.0,-30,7.0,6.0,2.0);
  box(world,plaster,5.8,3.0,-30,4.7,6.0,2.0);
  box(world,pale,1.7,5.1,-30,3.3,1.8,2.0);
  // Original irregular arch opening; it is not a recreation of a game map.
  const archOuter=2.0,archInner=1.50,archY=2.35,archX=1.75;
  for(let i=0;i<15;i++){
    const a=i*Math.PI/15,b=(i+1)*Math.PI/15;
    const s=new THREE.Shape();
    s.moveTo(archX+Math.cos(a)*archInner,archY+Math.sin(a)*archInner);
    s.lineTo(archX+Math.cos(a)*archOuter,archY+Math.sin(a)*archOuter);
    s.lineTo(archX+Math.cos(b)*archOuter,archY+Math.sin(b)*archOuter);
    s.lineTo(archX+Math.cos(b)*archInner,archY+Math.sin(b)*archInner);s.closePath();
    const o=new THREE.Mesh(new THREE.ExtrudeGeometry(s,{depth:.45,bevelEnabled:false}),i%3?trim:stone);o.position.z=-28.9;o.castShadow=o.receiveShadow=true;world.add(o);
  }
  box(world,trim,.02,1.14,-28.7,.42,2.3,.43);
  box(world,trim,3.48,1.14,-28.7,.42,2.3,.43);
  box(world,dark,1.75,1.65,-33,3.1,3.4,.2);
  box(world,stone,1.75,.13,-29.5,3.5,.23,3.5);
  for(let i=0;i<7;i++){
    const x=-9+i*3.4,h=4.8+random()*3;
    box(world,i%2?pale:plaster,x,h*.5,-39-random()*4,3.1,h,5);
    box(world,trim,x,h+.12,-39,3.25,.2,5.1);
  }
  for(let z=-3;z>-30;z-=2) {
    box(world,trim,-5.30,.05,z,.32,.12,1.95);
    box(world,trim,5.61,.05,z,.30,.12,1.95);
  }
  function crate(x,y,z,w=1.65,h=1.6,d=1.55){
    const g=new THREE.Group();g.position.set(x,y,z);world.add(g);
    box(g,timber,0,h/2,0,w,h,d);
    for(const face of [-1,1]) {
      for(const xx of [-w*.43,w*.43]) box(g,stone,xx,h/2,face*(d/2+.025),.085,h,.042);
      for(const yy of [.13,h-.13]) box(g,timber,0,yy,face*(d/2+.055),w,.18,.08);
      const brace=box(g,timber,0,h/2,face*(d/2+.08),.14,h*1.10,.07);brace.rotation.z=.48;
      for(const xx of [-w*.43,w*.43]) for(const yy of [.18,h-.18]) ellipsoid(g,metal,v(xx,yy,face*(d/2+.063)),v(.025,.025,.015));
    }
    for(const xx of [-w/2,w/2]) for(const yy of [.14,h-.14]) box(g,timber,xx,yy,0,.07,.18,d);
  }
  crate(2.76,0,-10.5,1.8,1.6,1.8);crate(3.83,0,-12.5,1.7,1.5,1.7);
  crate(2.82,1.6,-10.6,1.53,1.35,1.55);
  crate(-4.6,0,-17.5,1.65,1.4,1.6);crate(-3.3,0,-19.4,1.2,1.15,1.3);
  // Inexpensive instancing for scattered original stones.
  const stones=new THREE.InstancedMesh(new THREE.DodecahedronGeometry(1,0),stone,100);
  const dummy=new THREE.Object3D();
  for(let i=0;i<100;i++){
    dummy.position.set((random()>.5?1:-1)*(4.6+random()*.7),.025,-2-random()*31);
    dummy.scale.set(.025+random()*.06,.02+random()*.03,.03+random()*.08);dummy.rotation.set(random(),random()*6,random());
    dummy.updateMatrix();stones.setMatrixAt(i,dummy.matrix);
  }
  stones.receiveShadow=true;world.add(stones);
  for(const [x,z] of [[-5.2,-7.2],[5.55,-23]]){
    cylinder(world,metal,v(x,0,z),v(x,.95,z),.31);
    cylinder(world,edge,v(x,.12,z),v(x,.16,z),.32);
    cylinder(world,edge,v(x,.76,z),v(x,.80,z),.32);
  }
  const cablePoints=[v(-5.6,4.6,-7),v(-2,4.0,-8),v(2,3.9,-9),v(6,4.65,-10)];
  world.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints),24,.014,5,false),black));
  cylinder(world,metal,v(5.76,2.5,-4),v(5.15,2.5,-4),.035);
  box(world,metal,5.10,2.46,-4,.27,.13,.38);
  box(world,pale,5.10,2.375,-4,.23,.026,.32);

  const defender=new THREE.Group();defender.name='single-defender';scene.add(defender);
  const torso=new THREE.Group();defender.add(torso);
  ellipsoid(torso,blue,v(0,.25,0),v(.26,.36,.16));
  box(torso,vest,0,.30,.018,.43,.45,.34);
  for(const x of [-.135,0,.135])box(torso,black,x,.20,.205,.11,.17,.055);
  box(torso,cloth,0,.40,.204,.15,.07,.028);
  const helmet=new THREE.Group();defender.add(helmet);
  ellipsoid(helmet,skin,v(0,0,.02),v(.135,.145,.13));
  ellipsoid(helmet,blue,v(0,.06,-.01),v(.17,.145,.155));
  box(helmet,black,0,.018,.145,.235,.066,.043);
  box(helmet,vest,0,-.075,.12,.20,.115,.068);
  const pelvis=ellipsoid(defender,blue,v(0,0,0),v(.24,.18,.16));
  const limbs=[];
  for(const name of ['leftThigh','rightThigh','leftCalf','rightCalf','leftUpper','rightUpper','leftFore','rightFore']){
    const arm=name.includes('Upper')||name.includes('Fore'),m=new THREE.Mesh(new THREE.CylinderGeometry(arm?.085:.12,arm?.075:.105,1,10),blue);
    m.castShadow=m.receiveShadow=true;defender.add(m);limbs.push([name,m]);
  }
  const boots=[-1,1].map(()=>box(defender,black,0,0,0,.20,.16,.31));
  const pads=[-1,1].map(()=>ellipsoid(defender,vest,v(0,0,0),v(.13,.14,.09)));
  const enemyRifle=new THREE.Group();defender.add(enemyRifle);
  box(enemyRifle,black,0,0,0,.12,.13,.51);
  cylinder(enemyRifle,metal,v(0,.025,.1),v(0,.025,.67),.032);
  box(enemyRifle,black,0,-.16,-.05,.07,.26,.10);
  box(enemyRifle,black,0,0,-.42,.10,.16,.24);
  const enemyHands=[0,1].map(()=>ellipsoid(defender,glove,v(0,0,0),v(.085,.075,.09)));
  const joints={
    stand:{hip:[0,.93,0],neck:[0,1.56,0],head:[0,1.74,.015],lk:[-.17,.48,.035],rk:[.17,.48,-.03],la:[-.21,.10,.08],ra:[.23,.10,-.07],le:[-.34,1.20,.17],re:[.30,1.18,.02],lh:[-.12,1.26,.38],rh:[.12,1.30,.16]},
    buckle:{hip:[.045,.66,.10],neck:[.12,1.21,.24],head:[.14,1.39,.28],lk:[-.22,.37,.33],rk:[.21,.34,.29],la:[-.22,.09,.06],ra:[.22,.09,-.04],le:[-.26,.93,.39],re:[.38,.93,.18],lh:[-.12,1.02,.58],rh:[.25,1.03,.38]},
    down:{hip:[.12,.18,.02],neck:[.26,.20,.66],head:[.30,.20,.87],lk:[-.16,.12,-.38],rk:[.35,.13,-.37],la:[-.26,.085,-.79],ra:[.47,.085,-.76],le:[-.15,.13,.42],re:[.55,.13,.38],lh:[-.30,.11,.68],rh:[.58,.11,.65]}
  };
  function enemyPose(t) {
    const emerge=smooth((t-.25)/.57),f=smooth((t-timeline.fallStart)/(timeline.fallEnd-timeline.fallStart));
    let enemyX=lerp(2.25,1.1,emerge);
    if(t>=.82&&t<1.18)enemyX=lerp(1.1,.72,smooth((t-.82)/.36));
    else if(t>=1.18&&t<1.52)enemyX=lerp(.72,.96,smooth((t-1.18)/.34));
    else if(t>=1.52)enemyX=lerp(.96,1.28,smooth((t-1.52)/.42));
    defender.position.set(enemyX,0,-11.5);
    const a=f<.35?joints.stand:joints.buckle,b=f<.35?joints.buckle:joints.down;
    const u=f<.35?smooth(f/.35):smooth((f-.35)/.65);
    const p={};for(const k of Object.keys(a))p[k]=v(...a[k]).lerp(v(...b[k]),u);
    const activeStride=t<1.7?(1-f):0;
    const stride=Math.sin((t-.25)*18)*.065*activeStride;
    p.lk.x-=stride;p.la.x-=stride*1.35;p.rk.x+=stride;p.ra.x+=stride*1.35;
    p.hip.y+=Math.abs(Math.sin((t-.25)*18))*.025*activeStride;
    p.neck.x-=.045*activeStride;p.head.x-=.055*activeStride;
    const hit=timeline.shots.reduce((r,s)=>r+(t>=s?Math.exp(-(t-s)/.07)*.014:0),0)*(1-f);
    torso.position.copy(p.hip);torso.quaternion.setFromUnitVectors(v(0,1,0),p.neck.clone().sub(p.hip).normalize());
    torso.rotation.z-=hit+.035*activeStride;helmet.position.copy(p.head);helmet.quaternion.copy(torso.quaternion);
    pelvis.position.copy(p.hip);pelvis.quaternion.copy(torso.quaternion);
    const ls=p.neck.clone().add(v(-.24,-.12,0)),rs=p.neck.clone().add(v(.24,-.12,0));
    const pairs={leftThigh:[p.hip.clone().add(v(-.13,0,0)),p.lk],rightThigh:[p.hip.clone().add(v(.13,0,0)),p.rk],leftCalf:[p.lk,p.la],rightCalf:[p.rk,p.ra],leftUpper:[ls,p.le],rightUpper:[rs,p.re],leftFore:[p.le,p.lh],rightFore:[p.re,p.rh]};
    for(const [name,o] of limbs){const [a,b]=pairs[name],d=b.clone().sub(a);o.position.copy(a).add(b).multiplyScalar(.5);o.scale.y=d.length();o.quaternion.setFromUnitVectors(v(0,1,0),d.normalize());}
    for(let i=0;i<2;i++){boots[i].position.copy(i?p.ra:p.la);pads[i].position.copy(i?p.rk:p.lk).add(v(0,0,.07));boots[i].rotation.x=-f*.10;}
    enemyHands[0].position.copy(p.lh);enemyHands[1].position.copy(p.rh);
    enemyRifle.position.copy(p.lh).add(p.rh).multiplyScalar(.5);enemyRifle.rotation.set(f*1.40,lerp(-.16,.78,f),f*.28);
    return {fallProgress:f,root:defender.position.toArray(),head:p.head.clone().add(defender.position).toArray(),down:t>=timeline.fallEnd};
  }

  // A separate viewmodel scene is the usual FPS way to keep hands clear of walls.
  const viewScene=new THREE.Scene(),viewCamera=new THREE.PerspectiveCamera(61,16/9,.025,15);
  viewScene.add(new THREE.HemisphereLight(0xe9f3ff,0x5c594a,2.2));
  const gunLight=new THREE.DirectionalLight(0xffe5bd,3.0);gunLight.position.set(-3,5,2);viewScene.add(gunLight);
  const gun=new THREE.Group();gun.scale.setScalar(.78);viewScene.add(gun);
  box(gun,metal,0,0,0,.16,.145,.54);
  cylinder(gun,black,v(0,.077,-.27),v(0,.077,.27),.068);
  box(gun,edge,.084,.015,-.08,.012,.062,.21);
  box(gun,black,.096,.025,-.075,.012,.027,.13);
  cylinder(gun,metal,v(.088,.005,.01),v(.17,.005,.01),.014);
  for(let i=0;i<8;i++)box(gun,black,0,.106,-.22+i*.055,.105,.009,.012);
  box(gun,wood,0,-.008,-.48,.165,.16,.38);
  cylinder(gun,metal,v(0,.032,-.63),v(0,.032,-1.11),.025);
  cylinder(gun,black,v(0,.067,-.40),v(0,.067,-.90),.032);
  for(const z of [-.35,-.60,-.80])box(gun,metal,0,.065,z,.172,.035,.036);
  box(gun,metal,0,.105,-.95,.05,.12,.06);
  box(gun,black,0,.175,-.95,.018,.06,.019);
  for(const x of [-.033,.033])box(gun,metal,x,.16,-.95,.016,.05,.017);
  cylinder(gun,black,v(0,.032,-1.11),v(0,.032,-1.18),.031);
  cylinder(gun,metal,v(0,.032,-1.155),v(0,.032,-1.185),.034);
  function sideShape(points,depth,m) {
    const s=new THREE.Shape();points.forEach(([z,y],i)=>i?s.lineTo(z,y):s.moveTo(z,y));s.closePath();
    const geom=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.012,bevelSize:.01,bevelSegments:1,steps:1});
    // Map the shape's original x to weapon z, extrusion z to weapon x.
    const pos=geom.attributes.position;
    for(let i=0;i<pos.count;i++){const x=pos.getX(i),z=pos.getZ(i);pos.setXYZ(i,z-depth/2,pos.getY(i),-x);}
    geom.computeVertexNormals();const o=new THREE.Mesh(geom,m);gun.add(o);return o;
  }
  sideShape([[-.24,.04],[-.64,.01],[-.70,-.15],[-.46,-.18],[-.27,-.075]],.12,wood);
  sideShape([[.01,-.07],[.20,-.07],[.24,-.26],[.38,-.49],[.23,-.54],[.09,-.30]],.10,metal);
  for(let i=0;i<3;i++){
    const rib=lineBox(gun,black,v(.057,-.13-i*.018,-.055),v(.057,-.43-i*.015,-.245),.013,.014);
    rib.position.z-=i*.043;
  }
  const grip=box(gun,wood,0,-.18,.18,.10,.27,.14);grip.rotation.x=-.28;
  const guard=new THREE.Mesh(new THREE.TorusGeometry(.076,.012,6,18,Math.PI*1.55),black);guard.rotation.y=Math.PI/2;guard.rotation.x=.5;guard.position.set(0,-.105,.08);gun.add(guard);
  lineBox(gun,metal,v(0,-.065,.045),v(0,-.115,.065),.014);
  for(const z of [-.18,.08,.23])ellipsoid(gun,edge,v(.085,.015,z),v(.009,.009,.009));
  function hand(p,left){
    const g=new THREE.Group();g.position.copy(p);gun.add(g);
    ellipsoid(g,glove,v(0,0,0),v(.095,.077,.12));
    box(g,rubber,left?-.047:.047,.025,.005,.064,.07,.12);
    for(let i=0;i<4;i++) {
      const x=left?.045:-.025,zz=-.075+i*.047;
      ellipsoid(g,glove,v(x,-.040,zz),v(.052,.035,.022));
      ellipsoid(g,rubber,v(left?-.05:.05,.060,zz),v(.025,.012,.019));
    }
    ellipsoid(g,glove,v(left?.07:-.07,.025,.035),v(.035,.043,.067));
    return g;
  }
  hand(v(-.085,-.205,.18),false);
  hand(v(-.035,-.105,-.50),true);
  cylinder(gun,cloth,v(-.04,-.25,.23),v(.10,-.57,.52),.091,.11);
  cylinder(gun,cloth,v(-.075,-.14,-.47),v(-.34,-.50,.04),.087,.13);
  cylinder(gun,glove,v(-.075,-.13,-.48),v(-.11,-.20,-.40),.092);
  cylinder(gun,glove,v(-.07,-.20,.22),v(-.02,-.29,.29),.091);
  const flash=new THREE.Group();flash.position.set(0,.032,-1.20);gun.add(flash);
  const flashMat=new THREE.MeshBasicMaterial({color:0xffeb9d,transparent:true,opacity:.95,depthWrite:false,side:THREE.DoubleSide});
  for(let i=0;i<3;i++){
    const shape=new THREE.Shape();shape.moveTo(-.025,0);shape.lineTo(-.046,.065);shape.lineTo(-.02,.045);shape.lineTo(0,.19);shape.lineTo(.025,.046);shape.lineTo(.045,.07);shape.lineTo(.027,0);
    const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),flashMat);mesh.rotation.x=-Math.PI/2;mesh.rotation.z=i*Math.PI/3;flash.add(mesh);
  }
  const flashCore=new THREE.Mesh(new THREE.SphereGeometry(.027,8,6),new THREE.MeshBasicMaterial({color:0xfffde9}));flash.add(flashCore);
  const flashLight=new THREE.PointLight(0xffd385,0,3);flashLight.position.copy(flash.position);gun.add(flashLight);
  const casings=timeline.shots.map(()=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(.014,.014,.063,10),brass);o.castShadow=true;scene.add(o);return o;});

  let state;
  function setTime(t) {
    const peek=smooth((t-timeline.peekStart)/(timeline.movementStop-timeline.peekStart));
    const retreat=smooth((t-timeline.retreatStart)/(timeline.retreatEnd-timeline.retreatStart));
    const x=lerp(-.70,1.10,peek)-1.80*retreat,z=4.30+.27*retreat;
    const movement=t>timeline.peekStart&&t<timeline.movementStop || t>timeline.retreatStart&&t<timeline.retreatEnd;
    const movementEnvelope=movement?(t<1?Math.sin(Math.PI*clamp((t-.08)/.82)):Math.sin(Math.PI*clamp((t-3.05)/1.60))):0;
    const kick=timeline.shots.reduce((a,s)=>{const age=t-s;return a+(age>=0?Math.exp(-age/.067):0);},0);
    const correction=timeline.shots.reduce((a,s)=>{const age=t-s;return a+(age>=0&&age<.35?Math.sin(age/.35*Math.PI)*.0009:0);},0);
    camera.position.set(x,1.65,z);
    camera.rotation.set(-.013+kick*.0025-correction,0,0,'YXZ');
    gun.position.set(.45+Math.sin(t*13)*.009*movementEnvelope,-.26+Math.cos(t*16)*.006*movementEnvelope,-1.10+kick*.033);
    gun.rotation.set(.16+kick*.019,.36+kick*.003,-.02+Math.sin(t*13)*.007*movementEnvelope);
    let flashIndex=-1;
    for(let i=0;i<timeline.shots.length;i++){const age=t-timeline.shots[i];if(age>=-1e-9&&age<timeline.flashDuration)flashIndex=i;}
    flash.visible=flashIndex>=0;flashLight.intensity=flash.visible?1.5:0;flash.rotation.z=flashIndex*.81;
    flash.scale.setScalar(1+(Math.max(0,flashIndex)%2)*.12);
    for(let i=0;i<casings.length;i++){
      const age=t-timeline.shots[i],o=casings[i];o.visible=age>=0;
      if(age>=0){
        const flight=Math.min(age,timeline.casingImpactDelay);
        const floorY=.028;
        const startY=1.43,vy=1.2,gravity=2*(startY+vy*.54-floorY)/(.54*.54);
        const bounce=age>.54&&age<.84?.09*Math.sin((age-.54)/.30*Math.PI):0;
        o.position.set(1.61+flight*(1.0+i*.07)+Math.min(Math.max(age-.54,0),.25)*.25,Math.max(floorY,startY+vy*flight-.5*gravity*flight*flight)+bounce,3.20-flight*.58+i*.04);
        o.rotation.set(age<.84?age*16:13.44,age<.84?age*11:9.24,age<.84?age*8:Math.PI/2);
      }
    }
    const enemy=enemyPose(t);
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);viewScene.updateMatrixWorld(true);
    state={time:t,cameraPosition:camera.position.toArray(),cameraQuaternion:camera.quaternion.toArray(),movement,shotCount:timeline.shots.filter(s=>t>=s-1e-9).length,flashIndex,ammo:timeline.ammoStart-timeline.shots.filter(s=>t>=s-1e-9).length,killFeed:t>=timeline.feedStart,enemy,weaponPosition:gun.position.toArray(),weaponRotation:gun.rotation.toArray().slice(0,3),casingPositions:casings.map(o=>o.visible?o.position.toArray():null)};
  }
  const worldSignature=()=> {
    let h=2166136261,count=0;
    world.updateMatrixWorld(true);
    world.traverse(o=>{count++;for(const n of o.matrixWorld.elements)h=Math.imul(h^Math.round(n*1e6),16777619)>>>0;});
    return {digest:h.toString(16),objects:count};
  };
  return {scene,camera,viewScene,viewCamera,setTime,state:()=>state,worldSignature};
}
