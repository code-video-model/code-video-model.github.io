import * as THREE from './vendor/three.module.js';
import {createInvasionWorld} from './invasion_world.mjs';
import {clipTime} from './clip-contract.mjs';

const data=await (await fetch('./motion.json')).json();
const baselineData=data;
const geometryData=await (await fetch('./titan-mesh.json')).json();
const V=a=>new THREE.Vector3(...a),UP=V([0,1,0]),anchor=V(data.anchor);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,t)=>{const q=clamp((t-a)/(b-a),0,1);return q*q*(3-2*q);};
const AT=data.events.attach,LAUNCH=data.events.launch,PEAK=data.events.attackPeak;
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});
renderer.setSize(1280,720);renderer.setPixelRatio(1);renderer.setClearColor(0xd4dddf);
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=true;
const scene=new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xffffff,0x69736c,1.55));
const sun=new THREE.DirectionalLight(0xffffff,2.4);sun.position.set(-45,90,60);scene.add(sun);
sun.target.position.set(0,22,0);scene.add(sun.target);sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048);
Object.assign(sun.shadow.camera,{left:-75,right:75,top:85,bottom:-85,near:1,far:220});
sun.shadow.bias=-.00015;sun.shadow.normalBias=.02;
const camera=new THREE.PerspectiveCamera(data.cameraLensDegrees,16/9,.05,650);
const material=color=>new THREE.MeshStandardMaterial({color,roughness:.96,metalness:0});
const titanMaterial=material(0x909b95),jacketMaterial=material(0x263933),limbMaterial=material(0x737c75);
const gearMaterial=material(0x202b2b),bladeMaterial=material(0xe1e5dc),capeMaterial=material(0x304d3d);
capeMaterial.side=THREE.DoubleSide;
const sphere=new THREE.SphereGeometry(1,24,16),box=new THREE.BoxGeometry(1,1,1);
const cylinder=new THREE.CylinderGeometry(1,1,1,8);
function mesh(geometry,mat,parent=scene){const object=new THREE.Mesh(geometry,mat);object.receiveShadow=true;parent.add(object);return object;}
function ellipsoid(center,radii,mat,parent=scene){const object=mesh(sphere,mat,parent);object.position.copy(V(center));object.scale.copy(V(radii));return object;}
function setRod(object,a,b,r){object.position.copy(a).add(b).multiplyScalar(.5);object.scale.set(r,a.distanceTo(b),r);object.quaternion.setFromUnitVectors(UP,b.clone().sub(a).normalize());}
function rod(a,b,r,mat,parent=scene){const object=mesh(cylinder,mat,parent);setRod(object,a,b,r);return object;}
const titanGeometry=new THREE.BufferGeometry();
titanGeometry.setAttribute('position',new THREE.Float32BufferAttribute(geometryData.positions,3));
titanGeometry.setIndex(geometryData.indices);titanGeometry.computeVertexNormals();titanGeometry.computeBoundingBox();
const nape=ellipsoid(data.nape.center,data.nape.radii,material(0x7e8b83));
const ground=mesh(box,material(0x949f97));ground.position.y=-.3;ground.scale.set(380,.6,380);
function roofGeometry(b){
  const x=b.w/2,z=b.d/2,y=b.eave,h=b.rise,offset=(b.ridgeOffset||0)*b.w,hip=b.hip?b.d*.2:0;
  const points=[[-x,y,-z],[x,y,-z],[offset,y+h,-z+hip],[-x,y,z],[x,y,z],[offset,y+h,z-hip]];
  const result=new THREE.BufferGeometry();result.setAttribute('position',new THREE.Float32BufferAttribute(points.flat(),3));
  result.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,2,5,4,2,4,1,0,1,4,0,4,3]);result.computeVertexNormals();return result;
}
const buildingGroups=[];
const invasion=await createInvasionWorld(scene,data,geometryData,{titanMaterial});
const titan=invasion.rigs[0].skin;
scene.traverse(object=>{if(object.isMesh)object.castShadow=object!==ground&&object!==nape&&!object.material.transparent;});

const soldier=new THREE.Group();scene.add(soldier);
const torso=ellipsoid([0,.26,0],[.22,.28,.125],jacketMaterial,soldier);
const head=ellipsoid([0,.69,0],[.13,.13,.13],limbMaterial,soldier);
const pelvis=ellipsoid([0,-.035,0],[.19,.115,.13],jacketMaterial,soldier);
const outletLocal=V([.36,-.08,-.05]);
ellipsoid(outletLocal.toArray(),[.045,.045,.045],bladeMaterial,soldier);
for(const x of [-.24,.24]){
  const gear=mesh(box,gearMaterial,soldier);gear.position.set(x,-.17,-.05);gear.scale.set(.14,.55,.19);
  rod(V([x*.6,-.09,.14]),V([x*.7,.48,.08]),.025,gearMaterial,soldier);
}
ellipsoid([0,.01,-.17],[.13,.12,.07],gearMaterial,soldier);
const belt=mesh(box,gearMaterial,soldier);belt.position.set(0,.01,0);belt.scale.set(.405,.045,.27);
const legs=Array.from({length:4},()=>mesh(cylinder,limbMaterial,soldier));
const feet=[mesh(box,gearMaterial,soldier),mesh(box,gearMaterial,soldier)];
const arms=Array.from({length:4},()=>mesh(cylinder,limbMaterial));
const blades=[mesh(box,bladeMaterial),mesh(box,bladeMaterial)];
const cape=mesh(new THREE.BufferGeometry(),capeMaterial);
const rope=mesh(cylinder,gearMaterial);
const hook=ellipsoid([0,0,0],[.09,.09,.09],gearMaterial);
const shank=mesh(cylinder,gearMaterial);
const jetMaterial=new THREE.MeshBasicMaterial({color:0xe5eee9,transparent:true,opacity:.50,depthWrite:false,side:THREE.DoubleSide});
const jets=[mesh(new THREE.ConeGeometry(.10,1,10,1,true),jetMaterial),mesh(new THREE.ConeGeometry(.10,1,10,1,true),jetMaterial)];
const bodyMeshes=[torso,head,pelvis,...legs,...feet,...arms];
const heroSolids=[];
soldier.traverse(object=>{if(object.isMesh)heroSolids.push(object);});
heroSolids.push(...arms,...blades);
const heroLabel=object=>object===torso?'torso':object===head?'head':object===pelvis?'pelvis':
  blades.includes(object)?'blade-'+blades.indexOf(object):
  object.parent===soldier&&object.position.distanceTo(outletLocal)<1e-8&&Math.abs(object.scale.x-.045)<1e-8?'outlet-connector':
  'gear-or-limb-'+heroSolids.indexOf(object);
let segments=[],state={},width=1280,height=720;
let roofCableGroup,roofRods=[],roofJoints=[],roofHook,roofShank;
const dormantDefaults=new Map();
function resetDormantTransforms(){
  for(const [object,rest] of dormantDefaults){
    let active=true;
    for(let ancestor=object;ancestor;ancestor=ancestor.parent)active&&=ancestor.visible;
    if(active)continue;
    object.position.copy(rest.position);object.quaternion.copy(rest.quaternion);object.scale.copy(rest.scale);
  }
}
const rootShift=t=>V(data.invasion.mainVelocity).multiplyScalar(t);
const anchorAt=t=>V(data.anchor).add(rootShift(t));
const napeAt=t=>V(data.nape.center).add(rootShift(t));
function hermite(a,b,va,vb,q,dt){
  return V(a).multiplyScalar(2*q**3-3*q*q+1).addScaledVector(V(va),(q**3-2*q*q+q)*dt)
    .addScaledVector(V(b),-2*q**3+3*q*q).addScaledVector(V(vb),(q**3-q*q)*dt);
}
function sample(t){
  const table=t<7?baselineData.samples:data.samples;
  const u=clamp(t,0,10)*240,index=Math.min(2399,Math.floor(u)),q=u-index,a=table[index],b=table[index+1];
  return {p:hermite(a.p,b.p,a.v,b.v,q,1/240),v:V(a.v).lerp(V(b.v),q),a:V(a.a).lerp(V(b.a),q),
    gas:V(a.gasAcceleration).lerp(V(b.gasAcceleration),q),tension:a.tensionN*(1-q)+b.tensionN*q,
    reelLength:a.reelLengthM*(1-q)+b.reelLengthM*q,reelRate:a.reelRateMps*(1-q)+b.reelRateMps*q};
}
function baselineSample(t){
  const u=clamp(t,0,10)*240,index=Math.min(2399,Math.floor(u)),q=u-index,a=baselineData.samples[index],b=baselineData.samples[index+1];
  return {p:hermite(a.p,b.p,a.v,b.v,q,1/240),v:V(a.v).lerp(V(b.v),q),a:V(a.a).lerp(V(b.a),q),
    gas:V(a.gasAcceleration).lerp(V(b.gasAcceleration),q),tension:a.tensionN*(1-q)+b.tensionN*q,
    reelLength:a.reelLengthM*(1-q)+b.reelLengthM*q,reelRate:a.reelRateMps*(1-q)+b.reelRateMps*q};
}
function cameraPose(t){
  const table=t<=7?baselineData.camera:data.camera;
  const u=clamp(t,0,10)*240,index=Math.min(2399,Math.floor(u)),q=u-index,a=table[index],b=table[index+1];
  return {position:hermite(a.position,b.position,a.velocity,b.velocity,q,1/240),
    target:hermite(a.target,b.target,a.targetVelocity,b.targetVelocity,q,1/240)};
}
function baselineOrientation(t,s){
  const delayed=baselineSample(Math.max(0,t-.12)),forward=delayed.v.clone();forward.y*=.35;forward.normalize();
  const inward=anchor.clone().sub(s.p).normalize();
  const attackLean=smooth(PEAK-.3,PEAK-.06,t)*(1-smooth(PEAK+.06,PEAK+.3,t));
  const y=forward.multiplyScalar(.9).addScaledVector(UP,.08)
    .addScaledVector(inward,Math.min(.22,s.tension/5000)).addScaledVector(V([0,0,-1]),.4*attackLean).normalize();
  const late=smooth(7.7,9.2,t);
  if(late>0){
    const horizontal=delayed.v.clone();horizontal.y=0;const speed=horizontal.length();horizontal.normalize();
    const limit=35*Math.PI/180,pitch=limit*Math.tanh(Math.atan2(delayed.v.y*.35,speed)/limit);
    y.lerp(horizontal.multiplyScalar(Math.cos(pitch)).addScaledVector(UP,Math.sin(pitch)),late).normalize();
  }
  const restingX=new THREE.Vector3().crossVectors(y,V([0,0,1])).normalize();
  const cableX=inward.clone().addScaledVector(y,-inward.dot(y)).normalize();
  const x=restingX.lerp(cableX,smooth(2,AT,t)*(1-smooth(7.7,8.3,t))).normalize();
  x.addScaledVector(y,-x.dot(y)).normalize();
  const z=new THREE.Vector3().crossVectors(x,y).normalize();
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z));
}
function roofHookPosition(t){
  const roof=data.roofExit;
  if(t>=roof.hookSeat)return V(roof.eye);
  const elapsed=t-roof.hookLaunch;
  return V(roof.launchPosition).addScaledVector(V(roof.hookLaunchVelocity),elapsed).add(V([0,-.5*9.81*elapsed*elapsed,0]));
}
function roofSlack(t){
  const roof=data.roofExit;
  if(t<roof.hookLaunch||t>=roof.loadStart)return 0;
  if(t<roof.hookSeat){
    const q=clamp((t-roof.hookLaunch)/(roof.hookSeat-roof.hookLaunch),0,1);
    return roof.slackAtSeatM*(6*q**5-15*q**4+10*q**3);
  }
  const q=(t-roof.hookSeat)/(roof.loadStart-roof.hookSeat);
  const c=(roof.loadStart-roof.hookSeat)*roof.slackCaptureExtraFeedRateMps+3*roof.slackAtSeatM;
  return (1-q)**3*(roof.slackAtSeatM+c*q);
}
function roofCablePath(t,p){
  const end=roofHookPosition(t),delta=end.clone().sub(p),length=delta.length(),slack=roofSlack(t);
  const axis=delta.clone().normalize(),sag=V([0,-1,0]).addScaledVector(axis,axis.y).normalize();
  const make=amplitude=>Array.from({length:65},(_,i)=>p.clone().lerp(end,i/64).addScaledVector(sag,4*amplitude*(i/64)*(1-i/64)));
  let amplitude=0;
  if(slack>1e-9&&length>1e-8){
    let lo=0,hi=Math.max(1,slack+Math.sqrt(length*slack));
    for(let k=0;k<24;k++){
      const middle=(lo+hi)/2,points=make(middle);let arc=0;
      for(let j=0;j<64;j++)arc+=points[j].distanceTo(points[j+1]);
      if(arc>length+slack)hi=middle;else lo=middle;
    }
    amplitude=(lo+hi)/2;
  }
  const initialDirection=length<1e-6?V(data.roofExit.hookLaunchVelocity).sub(sample(t).v).normalize():
    delta.clone().addScaledVector(sag,4*amplitude).normalize();
  return {points:make(amplitude),end,initialDirection,slack,length:length+slack};
}
function orientation(t,s){
  if(t<=7)return baselineOrientation(t,s);
  const delayed=sample(Math.max(0,t-.12)),forward=delayed.v.clone();forward.y*=.35;forward.normalize();
  const inward=V(data.roofExit.eye).sub(s.p).normalize();
  const departure=s.v.clone();departure.y*=.22;departure.normalize();
  const banked=departure.addScaledVector(inward,Math.min(.12,s.tension/18000)).normalize();
  const y=forward.multiplyScalar(.9).addScaledVector(UP,.08).addScaledVector(inward,Math.min(.22,s.tension/5000)).normalize()
    .lerp(banked,smooth(8.1,8.7,t)).normalize();
  const direction=t>=data.roofExit.hookLaunch?roofCablePath(t,s.p).initialDirection:V(data.roofExit.hookLaunchVelocity).sub(s.v).normalize();
  const x=direction.clone().addScaledVector(y,-direction.dot(y));
  if(x.lengthSq()<1e-10)x.crossVectors(y,V([0,0,1]));
  x.normalize().addScaledVector(y,-x.dot(y)).normalize();
  const z=new THREE.Vector3().crossVectors(x,y).normalize();
  const target=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(x,y,z)).normalize();
  return baselineOrientation(t,baselineSample(t)).slerp(target,smooth(7,7.55,t)).normalize();
}
function world(p){return soldier.localToWorld(p.clone());}
function addSegment(a,b,r,id){segments.push({a:a.toArray(),b:b.toArray(),r,id});}
function napeCutTarget(t,sign,active){
  const local=V(data.nape.center).add(V([sign*.19+(t-PEAK)*5,sign*.12,0]));
  if(active){
    const ray=new THREE.Ray(V([local.x,local.y,8]),V([0,0,-1]));
    let best=null;
    for(const tri of napeCutTriangles){
      if(Math.max(tri.a.y,tri.b.y,tri.c.y)<local.y||Math.min(tri.a.y,tri.b.y,tri.c.y)>local.y||
         Math.max(tri.a.x,tri.b.x,tri.c.x)<local.x||Math.min(tri.a.x,tri.b.x,tri.c.x)>local.x)continue;
      const hit=ray.intersectTriangle(tri.a,tri.b,tri.c,false,new THREE.Vector3());
      if(hit&&(!best||hit.z>best.z))best=hit;
    }
    if(!best)throw Error('Nape target has no actual torso-surface intersection');
    local.z=best.z-.008;
  }
  return local.add(rootShift(t));
}
function articulate(t,s){
  soldier.quaternion.copy(orientation(t,s));soldier.position.copy(s.p).sub(outletLocal.clone().applyQuaternion(soldier.quaternion));
  soldier.updateMatrixWorld(true);segments=[];
  const tuck=t<=7?smooth(AT,AT+.45,t)*(1-smooth(7.7,8.25,t)):1+.15*smooth(8.3,9.2,t);
  for(let j=0;j<2;j++){
    const sign=j?1:-1,hip=V([sign*.105,-.065,0]);
    const knee=hip.clone().add(V([sign*.015,-.4*Math.cos(tuck*.95),-.4*Math.sin(tuck*.95)]));
    const ankle=knee.clone().add(V([0,-.4*Math.cos(tuck*.75),.4*Math.sin(tuck*.75)]));
    setRod(legs[j*2],hip,knee,.064);setRod(legs[j*2+1],knee,ankle,.052);
    feet[j].position.copy(ankle).add(V([0,-.025,.06]));feet[j].scale.set(.105,.08,.2);
    addSegment(world(hip),world(knee),.075,'thigh');addSegment(world(knee),world(ankle),.07,'shin');
    addSegment(world(ankle),world(ankle),.14,'foot');
    addSegment(world(V([sign*.24,-.445,-.05])),world(V([sign*.24,.105,-.05])),.12,'equipment');
  }
  addSegment(world(V([0,.02,0])),world(V([0,.49,0])),.225,'torso');
  addSegment(world(V([0,.69,0])),world(V([0,.69,0])),.14,'head');
  const envelope=smooth(PEAK-.28,PEAK-.06,t)*(1-smooth(PEAK+.06,PEAK+.28,t));
  for(let j=0;j<2;j++){
    const sign=j?1:-1,shoulder=world(V([sign*.215,.455,0]));
    const target=napeCutTarget(t,sign,envelope>0);
    const aim=target.clone().sub(shoulder).normalize(),wanted=target.clone().addScaledVector(aim,-1.3);
    const withdrawal=t<=7?smooth(PEAK+.06,PEAK+.28,t)*(1-smooth(8,8.6,t)):1;
    const idleLocal=V([sign*.42,.17,.17]).lerp(V([j?-.08:-.42,.24,.4]),withdrawal);
    const wrist=world(idleLocal).lerp(wanted,envelope),relative=wrist.clone().sub(shoulder),d=clamp(relative.length(),.08,.55);
    wrist.copy(shoulder).addScaledVector(relative.normalize(),d);
    const bend=new THREE.Vector3().crossVectors(relative,V([0,0,1])).normalize().multiplyScalar(sign);
    const elbow=shoulder.clone().add(wrist).multiplyScalar(.5).addScaledVector(bend,Math.sqrt(Math.max(0,.28**2-(d/2)**2)));
    setRod(arms[j*2],shoulder,elbow,.05);setRod(arms[j*2+1],elbow,wrist,.042);
    const idle=V([sign*.45,-.7,.25]).normalize().applyQuaternion(soldier.quaternion);
    idle.lerp(V([-.65,-.2,.9+sign*.1]).normalize().applyQuaternion(soldier.quaternion),withdrawal).normalize();
    const escape=V([sign*.18,-.12,1]).normalize();
    if(t>7){
      const safe=V([-.55,-.08,1]).normalize().lerp(V([-.85,-.10,.45]).normalize().applyQuaternion(soldier.quaternion),smooth(8.15,8.5,t)).normalize();
      escape.lerp(safe,smooth(7,7.2,t)).normalize();
    }
    idle.lerp(escape,smooth(6.85,7.02,t)).normalize();
    const direction=idle.lerp(target.clone().sub(wrist).normalize(),envelope).normalize(),tip=wrist.clone().addScaledVector(direction,1.3);
    blades[j].position.copy(wrist).add(tip).multiplyScalar(.5);blades[j].quaternion.setFromUnitVectors(UP,direction);blades[j].scale.set(.043,1.3,.016);
    addSegment(shoulder,elbow,.055,'upper-arm');addSegment(elbow,wrist,.05,'forearm');addSegment(wrist,tip,.025,'blade-'+j);
  }
  const lag=sample(Math.max(0,t-(t<=7?.2:.2-.14*smooth(8.1,8.7,t)))).v.normalize();
  const a=world(V([-.22,.43,-.12])),b=world(V([.22,.43,-.12]));
  const side=V([1,0,0]).applyQuaternion(soldier.quaternion);
  const stream=smooth(8.1,8.7,t);
  const tail=world(V([0,.1,-.12])).addScaledVector(lag,-.7-.2*stream).addScaledVector(UP,-.16+.12*stream).addScaledVector(side,-.15*tuck);
  const tailX=tail.clone().sub(soldier.position).dot(side),foldedX=-.1-Math.log1p(Math.exp(-8*(tailX+.1)))/8;
  tail.addScaledVector(side,(foldedX-tailX)*(t<=7?smooth(2,AT,t)*(1-smooth(7,7.6,t)):1));
  const capeHalfWidth=.30-.14*stream;
  const points=[a,b,tail.clone().addScaledVector(side,capeHalfWidth),tail.clone().addScaledVector(side,-capeHalfWidth)];
  cape.geometry.dispose();cape.geometry=new THREE.BufferGeometry();
  cape.geometry.setAttribute('position',new THREE.Float32BufferAttribute(points.flatMap(p=>p.toArray()),3));cape.geometry.setIndex([0,1,2,0,2,3]);cape.geometry.computeVertexNormals();
  for(let k=0;k<=12;k++)addSegment(points[0].clone().lerp(points[3],k/12),points[1].clone().lerp(points[2],k/12),.06,'cape');
  for(let j=0;j<2;j++){
    jets[j].visible=s.gas.length()>1e-6;
    if(jets[j].visible){
      const axis=s.gas.clone().normalize(),length=.4+Math.min(1.2,s.gas.length()/35);
      const nozzle=world(V([j?.24:-.24,-.14,-.12]));
      jets[j].position.copy(nozzle).addScaledVector(axis,-length/2);
      jets[j].quaternion.setFromUnitVectors(UP,axis);jets[j].scale.set(1,length,1);
    }
  }
  nape.position.copy(napeAt(t));nape.position.z+=(t>PEAK+.02&&t<PEAK+.4?.025*Math.sin((t-PEAK-.02)/.38*Math.PI):0);
}
function hookPosition(t){
  if(t>=AT)return anchorAt(t);
  const start=sample(LAUNCH).p,dt=AT-LAUNCH,u=t-LAUNCH;
  const velocity=anchorAt(AT).sub(start).addScaledVector(UP,.5*9.81*dt*dt).divideScalar(dt);
  return start.addScaledVector(velocity,u).addScaledVector(UP,-.5*9.81*u*u);
}
function projected(point){
  const p=point.clone().project(camera);
  return {x:(p.x+1)*width/2,y:(1-p.y)*height/2,inFrustum:Math.abs(p.x)<=1&&Math.abs(p.y)<=1&&p.z>=-1&&p.z<=1};
}
function seek(t,draw=true){
  t=clipTime(t);
  invasion.update(t);anchor.copy(anchorAt(t));
  const s=sample(t);articulate(t,s);
  rope.visible=hook.visible=shank.visible=t>=LAUNCH&&t<7;
  const end=t<LAUNCH?s.p.clone():hookPosition(t);
  if(rope.visible){setRod(rope,s.p,end,.022);hook.position.copy(end);setRod(shank,end.clone().add(V([0,0,-.25])),end,.035);}
  roofCableGroup.visible=t>=data.roofExit.hookLaunch;
  let roofPath=null;
  if(roofCableGroup.visible){
    roofPath=roofCablePath(t,s.p);
    for(let i=0;i<64;i++)setRod(roofRods[i],roofPath.points[i],roofPath.points[i+1],.022);
    for(let i=0;i<63;i++)roofJoints[i].position.copy(roofPath.points[i+1]);
    roofHook.position.copy(roofPath.end);
    setRod(roofShank,roofPath.end.clone().addScaledVector(V(data.roofExit.normal),-.25),roofPath.end,.035);
  }
  const pose=cameraPose(t);camera.position.copy(pose.position);camera.up.copy(UP);camera.lookAt(pose.target);
  resetDormantTransforms();
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  if(draw)renderer.render(scene,camera);
  const headPoint=head.localToWorld(V([0,1,0])),soles=feet.map(f=>f.localToWorld(V([0,-.5,0])));
  const hp=projected(headPoint),fp=soles.map(projected);
  const landmarks={headTop:[0,60,-.25],shoulderLeft:[-10.5,44,0],shoulderRight:[10.5,44,0],
    torso:[0,37,0],hip:[0,25,0],leftKnee:[-4.4,11,-.6],rightKnee:[4.4,11,-.6],footLeft:[-4.7,0,-1],footRight:[4.7,0,-1]};
  state={t,position:s.p.toArray(),velocity:s.v.toArray(),outlet:world(outletLocal).toArray(),
    camera:pose.position.toArray(),lookAt:pose.target.toArray(),tensionN:s.tension,reelRateMps:s.reelRate,
    gasAcceleration:s.gas.toArray(),bodySegments:segments,headPixel:hp,bootPixels:fp,
    gasCueVisible:jets.some(jet=>jet.visible),
    bodyExtentPixels:Math.max(...fp.map(p=>Math.hypot(p.x-hp.x,p.y-hp.y))),
    bodyLandmarksInFrame:hp.inFrustum&&fp.every(p=>p.inFrustum),
    titanLandmarks:Object.fromEntries(Object.entries(landmarks).map(([name,p])=>[name,projected(V(p))])),
    hookPixel:projected(end),napePixel:projected(nape.position),
    roofState:t<7?'giant-phase':t<data.roofExit.hookLaunch?'released':t<data.roofExit.hookSeat?'roof-hook-flight':t<data.roofExit.loadStart?'roof-seated-slack':'roof-loaded-retreat',
    roofCablePoints:roofPath?roofPath.points.map(p=>p.toArray()):[],
    roofSlackM:roofPath?roofPath.slack:0,roofRenderedLengthM:roofPath?roofPath.points.slice(1).reduce((sum,p,i)=>sum+p.distanceTo(roofPath.points[i]),0):0,
    roofAnchorPixel:projected(V(data.roofExit.eye)),roofProjectilePixel:roofPath?projected(roofPath.end):null,
    bodyQuaternionNorm:soldier.quaternion.length(),
    loadedAnchorCount:t<7?(s.tension>0?1:0):(t>data.roofExit.loadStart&&s.tension>0?1:0),
    invasion:invasion.diagnostics()};
}
function interpolateRing(y){
  const rings=data.bodyGeometry.rings;let index=0;
  while(index<rings.length-2&&rings[index+1][0]<y)index++;
  const a=rings[index],b=rings[index+1],q=clamp((y-a[0])/(b[0]-a[0]),0,1);
  return a.map((v,i)=>v+(b[i]-v)*q);
}
function bodyField(p){
  const ring=interpolateRing(clamp(p[1],23,60)),rx=ring[1],rz=ring[2],power=ring[3],center=ring[4];
  let d=Math.max(23-p[1],p[1]-60,((Math.abs(p[0]/rx)**power+Math.abs((p[2]-center)/rz)**power)**(1/power)-1)*Math.min(rx,rz)/3);
  for(const s of data.bodyGeometry.segments){
    const a=V(s.a),v=V(s.b).sub(a),length=v.length(),q=clamp(V(p).sub(a).dot(v)/(length*length),0,1);
    d=Math.min(d,(V(p).distanceTo(a.addScaledVector(v,q))-(s.ra+q*(s.rb-s.ra)))/Math.sqrt(1+((s.rb-s.ra)/length)**2));
  }
  for(const e of data.bodyGeometry.ellipsoids)d=Math.min(d,(V(p).sub(V(e.c)).divide(V(e.r)).length()-1)*Math.min(...e.r));
  const q=clamp(p[1]-42,0,1),back=3.85+.15*q*q*(3-2*q);
  return Math.max(d,p[2]-back,-p[1]);
}
function roofField(p,r=0){
  let best=Infinity;
  for(const b of data.buildings){
    const dx=p[0]-b.x,dz=p[2]-b.z,c=Math.cos(b.yaw),s=Math.sin(b.yaw),x=c*dx-s*dz,z=s*dx+c*dz;
    const slope=2*b.rise/b.w;
    let d=Math.max(Math.abs(x)-b.w/2,Math.abs(z)-b.d/2,-p[1],(p[1]+slope*Math.abs(x)-b.eave-b.rise)/Math.sqrt(1+slope*slope));
    if(!b.wing)d=Math.min(d,Math.max(Math.abs(x-b.w*.23)-.36,Math.abs(z-1)-.425,Math.abs(p[1]-b.eave-b.rise*.6)-b.rise*.4));
    best=Math.min(best,d-r-.05);
  }
  return best;
}
function bodyClear(p,r){
  const q=clamp(p[1]-42,0,1),back=3.85+.15*q*q*(3-2*q);
  return Math.max(bodyField(p)-.08,(p[2]-back-.015)/Math.sqrt(1+.225**2),p[2]-4)-r;
}
const triangleGrid=new Map(),meshTriangles=[];
{
  const attribute=titanGeometry.getAttribute('position'),index=titanGeometry.getIndex();
  const points=Array.from({length:attribute.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(attribute,i));
  for(let i=0;i<index.count;i+=3){
    const a=points[index.getX(i)],b=points[index.getX(i+1)],c=points[index.getX(i+2)];
    const center=a.clone().add(b).add(c).divideScalar(3),radius=Math.max(center.distanceTo(a),center.distanceTo(b),center.distanceTo(c));
    const id=meshTriangles.length;meshTriangles.push({a,b,c,center,radius});
    const lo=[Math.floor(Math.min(a.x,b.x,c.x)),Math.floor(Math.min(a.y,b.y,c.y)),Math.floor(Math.min(a.z,b.z,c.z))];
    const hi=[Math.floor(Math.max(a.x,b.x,c.x)),Math.floor(Math.max(a.y,b.y,c.y)),Math.floor(Math.max(a.z,b.z,c.z))];
    for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){
      const key=`${x},${y},${z}`;if(!triangleGrid.has(key))triangleGrid.set(key,[]);triangleGrid.get(key).push(id);
    }
  }
}
const napeCutTriangles=meshTriangles.filter(tri=>
  Math.max(tri.a.y,tri.b.y,tri.c.y)>=data.nape.center[1]-.12001&&
  Math.min(tri.a.y,tri.b.y,tri.c.y)<=data.nape.center[1]+.12001&&
  Math.max(tri.a.x,tri.b.x,tri.c.x)>=-1.60&&Math.min(tri.a.x,tri.b.x,tri.c.x)<=1.60);
function segmentDistance(a,b,c,d){
  const u=b.clone().sub(a),v=d.clone().sub(c),r=a.clone().sub(c);
  const aa=u.dot(u),ee=v.dot(v),ff=v.dot(r);let s=0,q=0;
  if(aa<1e-12&&ee<1e-12)return a.distanceTo(c);
  if(aa<1e-12)q=clamp(ff/ee,0,1);
  else{
    const cc=u.dot(r);
    if(ee<1e-12)s=clamp(-cc/aa,0,1);
    else{
      const bb=u.dot(v),den=aa*ee-bb*bb;s=den>1e-12?clamp((bb*ff-cc*ee)/den,0,1):0;q=(bb*s+ff)/ee;
      if(q<0){q=0;s=clamp(-cc/aa,0,1);}else if(q>1){q=1;s=clamp((bb-cc)/aa,0,1);}
    }
  }
  return r.addScaledVector(u,s).addScaledVector(v,-q).length();
}
function triangleDistance(start,end,a,b,c,ray=null,length=null){
  length=length??start.distanceTo(end);
  ray=ray??new THREE.Ray(start,end.clone().sub(start).normalize());
  const hit=new THREE.Vector3(),closest=new THREE.Vector3();
  if(length>1e-12&&ray.intersectTriangle(a,b,c,false,hit)&&hit.distanceTo(start)<=length+1e-10)return 0;
  const triangle=new THREE.Triangle(a,b,c);
  return Math.min(start.distanceTo(triangle.closestPointToPoint(start,closest)),
    end.distanceTo(triangle.closestPointToPoint(end,closest)),
    segmentDistance(start,end,a,b),segmentDistance(start,end,b,c),segmentDistance(start,end,c,a));
}
function segmentBoxDistance(a,b,center,half){
  const start=a.clone().sub(center).toArray(),dir=b.clone().sub(a).toArray(),h=half.toArray(),breaks=[0,1];
  for(let j=0;j<3;j++)if(Math.abs(dir[j])>1e-12)for(const side of [-1,1]){
    const t=(side*h[j]-start[j])/dir[j];if(t>0&&t<1)breaks.push(t);
  }
  breaks.sort((a,b)=>a-b);let best=Infinity;
  for(let i=0;i<breaks.length-1;i++){
    const lo=breaks[i],hi=breaks[i+1],mid=(lo+hi)/2;let aa=0,bb=0;
    for(let j=0;j<3;j++){
      const p=start[j]+mid*dir[j];let slope=0,intercept=0;
      if(p>h[j]){slope=dir[j];intercept=start[j]-h[j];}
      else if(p< -h[j]){slope=-dir[j];intercept=-h[j]-start[j];}
      aa+=slope*slope;bb+=slope*intercept;
    }
    const t=aa>1e-12?clamp(-bb/aa,lo,hi):mid;
    let d=0;for(let j=0;j<3;j++)d+=Math.max(Math.abs(start[j]+t*dir[j])-h[j],0)**2;
    best=Math.min(best,d);
  }
  return Math.sqrt(best);
}
let lastMeshWitness=null;
function meshSegmentDistance(start,end,allowNape=false,grid=triangleGrid,triangles=meshTriangles,cellSize=1,ignoreBuilding=-1){
  lastMeshWitness=null;
  const vector=end.clone().sub(start),length=vector.length(),steps=Math.max(1,Math.ceil(length/.25)),ids=new Set();
  for(let i=0;i<=steps;i++){
    const p=start.clone().lerp(end,i/steps),x=Math.floor(p.x/cellSize),y=Math.floor(p.y/cellSize),z=Math.floor(p.z/cellSize);
    for(let dx=-1;dx<=1;dx++)for(let dy=-1;dy<=1;dy++)for(let dz=-1;dz<=1;dz++){
      const list=grid.get(`${x+dx},${y+dy},${z+dz}`);if(list)for(const id of list)ids.add(id);
    }
  }
  let best=.5;const ray=new THREE.Ray(start,vector.clone().normalize());
  for(const id of ids){
    const t=triangles[id];
    if(ignoreBuilding>=0&&t.buildingIndex===ignoreBuilding)continue;
    if(allowNape&&Math.abs(t.center.x)<1.2&&Math.abs(t.center.y-52)<1.1&&t.center.z>3.3)continue;
    const q=clamp(t.center.clone().sub(start).dot(vector)/Math.max(1e-12,length*length),0,1);
    if(t.center.distanceToSquared(start.clone().addScaledVector(vector,q))>(best+t.radius)**2)continue;
    const distance=triangleDistance(start,end,t.a,t.b,t.c,ray,length);
    if(distance<best){best=distance;lastMeshWitness={triangle:id,vertices:[t.a.toArray(),t.b.toArray(),t.c.toArray()],centerlineDistanceM:distance};}
    if(best<1e-9)return 0;
  }
  return best;
}
  const cityGrid=new Map(),cityTriangles=[];
  function initializeRoofObjects(){
    for(const {buildingIndex,group} of buildingGroups){
      group.updateWorldMatrix(true,true);
      group.traverse(object=>{
        if(!object.isMesh)return;
        const attribute=object.geometry.getAttribute('position'),index=object.geometry.getIndex();
        const points=Array.from({length:attribute.count},(_,i)=>new THREE.Vector3().fromBufferAttribute(attribute,i).applyMatrix4(object.matrixWorld));
        const count=index?index.count:attribute.count;
        for(let i=0;i<count;i+=3){
          const a=points[index?index.getX(i):i],b=points[index?index.getX(i+1):i+1],c=points[index?index.getX(i+2):i+2];
          const center=a.clone().add(b).add(c).divideScalar(3),radius=Math.max(center.distanceTo(a),center.distanceTo(b),center.distanceTo(c));
          const id=cityTriangles.length;cityTriangles.push({a,b,c,center,radius,buildingIndex});
          const lo=[Math.floor(Math.min(a.x,b.x,c.x)/2),Math.floor(Math.min(a.y,b.y,c.y)/2),Math.floor(Math.min(a.z,b.z,c.z)/2)];
          const hi=[Math.floor(Math.max(a.x,b.x,c.x)/2),Math.floor(Math.max(a.y,b.y,c.y)/2),Math.floor(Math.max(a.z,b.z,c.z)/2)];
          for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){
            const key=`${x},${y},${z}`;if(!cityGrid.has(key))cityGrid.set(key,[]);cityGrid.get(key).push(id);
          }
        }
      });
    }
    roofCableGroup=new THREE.Group();roofCableGroup.visible=false;scene.add(roofCableGroup);
    for(let i=0;i<64;i++)roofRods.push(mesh(cylinder,gearMaterial,roofCableGroup));
    for(let i=0;i<63;i++)roofJoints.push(ellipsoid([0,0,0],[.022,.022,.022],gearMaterial,roofCableGroup));
    roofHook=ellipsoid([0,0,0],[.09,.09,.09],gearMaterial,roofCableGroup);
    roofShank=mesh(cylinder,gearMaterial,roofCableGroup);
  }
  function pointInsideCity(p,ignoreBuilding=-1){
    for(const component of data.cityCollisionComponents){
      if(component.buildingIndex===ignoreBuilding)continue;
      if(p.x<component.min[0]||p.x>component.max[0]||p.y<component.min[1]||p.y>component.max[1]||p.z<component.min[2]||p.z>component.max[2])continue;
      if(component.planes.every(q=>q[0]*p.x+q[1]*p.y+q[2]*p.z+q[3]<=1e-8))return true;
    }
    return false;
  }
  function cityDistance(a,b,ignoreBuilding=-1){
    if(pointInsideCity(a,ignoreBuilding)||pointInsideCity(b,ignoreBuilding)||pointInsideCity(a.clone().add(b).multiplyScalar(.5),ignoreBuilding))return 0;
    return meshSegmentDistance(a,b,false,cityGrid,cityTriangles,2,ignoreBuilding);
  }
  function auditRoofExit(){
    const minima={bodyCity:{d:Infinity},bodyTitan:{d:Infinity},bladeCity:{d:Infinity},cableCity:{d:Infinity},
      cableTitan:{d:Infinity},cableBody:{d:Infinity},cameraCity:{d:Infinity},cameraTitan:{d:Infinity},
      cameraBody:{d:Infinity},cameraCable:{d:Infinity},hookCity:{d:Infinity},hookTitan:{d:Infinity},bodyGround:{d:Infinity}};
    const update=(name,d,t,detail={})=>{if(d<minima[name].d)minima[name]={d,t,...detail};};
    const times=Array.from({length:721},(_,i)=>7+i/240);
    for(const [start,end] of [[data.roofExit.hookLaunch-.04,data.roofExit.hookSeat+.06],
                             [data.roofExit.loadStart-.06,data.roofExit.loadStart+.30],[9.5,10]])
      for(let i=Math.round(start*960);i<=Math.round(end*960);i++)if(i/960>=7&&i/960<=10)times.push(i/960);
    const ordered=[...new Set(times)].sort((a,b)=>a-b),rows=[];
    let maxOutletError=0,maxLengthError=0,maxLoaded=0,maxQuaternionError=0;
    for(const t of ordered){
      seek(t,false);const p=V(state.outlet),cameraP=V(state.camera);
      maxOutletError=Math.max(maxOutletError,p.distanceTo(V(state.position)));maxLoaded=Math.max(maxLoaded,state.loadedAnchorCount);
      maxQuaternionError=Math.max(maxQuaternionError,Math.abs(state.bodyQuaternionNorm-1));
      for(const segment of segments){
        const a=V(segment.a),b=V(segment.b);
        update(segment.id.startsWith('blade')?'bladeCity':'bodyCity',cityDistance(a,b)-segment.r-.0001,t,{part:segment.id});
        update('bodyGround',Math.min(a.y,b.y)-segment.r,t,{part:segment.id});
        const count=Math.max(1,Math.ceil(a.distanceTo(b)/.07));
        for(let i=0;i<=count;i++)update('bodyTitan',bodyClear(a.clone().lerp(b,i/count).toArray(),segment.r),t,{part:segment.id});
        update('cameraBody',segmentDistance(cameraP,cameraP,a,b)-segment.r-.15,t,{part:segment.id});
      }
      update('cameraCity',cityDistance(cameraP,cameraP)-.3-.0001,t);
      update('cameraTitan',bodyClear(state.camera,.3),t);
      if(state.roofCablePoints.length){
        const points=state.roofCablePoints.map(V),actualLength=state.roofRenderedLengthM;
        const wanted=p.distanceTo(points.at(-1))+state.roofSlackM;
        maxLengthError=Math.max(maxLengthError,Math.abs(actualLength-wanted));
        for(let i=0;i<points.length-1;i++){
          const a=points[i],b=points[i+1];
          const city=cityDistance(a,b)-.022-.0001;
          update('cableCity',city,t,{piece:i,start:a.toArray(),end:b.toArray(),witness:lastMeshWitness});
          update('cableTitan',meshSegmentDistance(a,b)-.022,t,{piece:i});
          update('cameraCable',segmentDistance(cameraP,cameraP,a,b)-.15-.022,t);
          for(const segment of segments){
            if(segment.id==='equipment')continue;
            update('cableBody',segmentDistance(a,b,V(segment.a),V(segment.b))-segment.r-.022,t,{part:segment.id,piece:i,
              ropeA:a.toArray(),ropeB:b.toArray(),bodyA:segment.a,bodyB:segment.b,bodyRadius:segment.r});
          }
          const localA=soldier.worldToLocal(a.clone()),localB=soldier.worldToLocal(b.clone());
          for(const sign of [-1,1])update('cableBody',segmentBoxDistance(localA,localB,V([sign*.24,-.17,-.05]),V([.07,.275,.095]))-.022,t,{part:'equipment',piece:i});
        }
        const eye=points.at(-1),tip=eye.clone().addScaledVector(V(data.roofExit.normal),-.25);
        update('hookCity',cityDistance(eye,eye)-.09-.0001,t,{part:'eye'});
        update('hookTitan',meshSegmentDistance(tip,eye)-.09,t);
        const allowed=t>=data.roofExit.hookSeat-.02&&tip.distanceTo(V(data.roofExit.surface))<.5;
        update('hookCity',cityDistance(tip,eye,allowed?data.roofExit.buildingIndex:-1)-.035-.0001,t,{part:'shank',intendedSeatContact:allowed});
      }
      rows.push({t,p:state.position,v:state.velocity,camera:state.camera,roofState:state.roofState,tensionN:state.tensionN,
        reelRateMps:state.reelRateMps,slackM:state.roofSlackM,renderedRopeLengthM:state.roofRenderedLengthM,
        bodyExtentPixels:state.bodyExtentPixels,bodyLandmarksInFrame:state.bodyLandmarksInFrame,
        roofAnchorInFrame:state.roofAnchorPixel.inFrustum,roofAnchorPixel:state.roofAnchorPixel,roofProjectilePixel:state.roofProjectilePixel,
        gasAcceleration:state.gasAcceleration,gasCueVisible:state.gasCueVisible,loadedAnchorCount:state.loadedAnchorCount});
    }
    return {schema:'roof-exit-rendered-sweep-audit-v1',baseSamplingHz:240,criticalSamplingHz:960,timeSamples:ordered.length,minima,
      maximumOutletErrorM:maxOutletError,maximumQuaternionNormError:maxQuaternionError,maximumRenderedRopeLengthResidualM:maxLengthError,maximumLoadedAnchors:maxLoaded,rows,
      meshMethod:'Actual rendered city triangles transformed to world space, finite segment/triangle distance with2m grid broadphase, plus exact convex-solid inclusion checks. Wire radius22mm unchanged; city transform allowance0.1mm.',
      intendedContacts:'Only the roof hook shank at the selected structural seat is exempt from that same building during the final20ms of seating and thereafter. The cable has no endpoint exclusions.',
      limitations:['Dense-time sweeps, not a formal continuous-time theorem.','Force model remains an outlet particle and massless cable; slack is length-matched quasi-static parabolic geometry.']};
  }
function audit(){
  const minima={bodyTitan:{d:Infinity},bladeTitan:{d:Infinity},bladeMesh:{d:Infinity},cableTitan:{d:Infinity},cableBody:{d:Infinity},cameraBody:{d:Infinity},cameraTitan:{d:Infinity},bodyRoof:{d:Infinity},cameraRoof:{d:Infinity}};
  const update=(name,d,t,part)=>{if(d<minima[name].d)minima[name]={d,t,part};};
  let outletError=0;const visibility=[],contacts=[],cableSamples=[],cameraSamples=[];let conservativeCable={d:Infinity};
  const allTimes=Array.from({length:2401},(_,i)=>i/240);
  for(const [start,end] of [[LAUNCH-.05,AT+.2],[PEAK-.35,PEAK+.35],[7,7.8]])
    for(let i=Math.round(start*960);i<=Math.round(end*960);i++)allTimes.push(i/960);
  const times=[...new Set(allTimes)].sort((a,b)=>a-b);let count=0;
  for(const t of times){
    seek(t,false);
    outletError=Math.max(outletError,V(state.outlet).distanceTo(V(state.position)));
    for(const segment of segments){
      const a=V(segment.a),b=V(segment.b),steps=Math.max(1,Math.ceil(a.distanceTo(b)/.08));
      for(let k=0;k<=steps;k++){
        const p=a.clone().lerp(b,k/steps).toArray();
        const intended=segment.id.startsWith('blade')&&Math.abs(t-PEAK)<.3&&Math.abs(p[0])<1.2&&Math.abs(p[1]-52)<1.1&&p[2]>3.3;
        if(!intended)update(segment.id.startsWith('blade')?'bladeTitan':'bodyTitan',bodyClear(p,segment.r),t,segment.id);
        update('bodyRoof',roofField(p,segment.r),t,segment.id);
      }
      if(segment.id.startsWith('blade')){
        const distance=meshSegmentDistance(a,b,Math.abs(t-PEAK)<.3)-segment.r;
        update('bladeMesh',distance,t,segment.id);
      }
    }
    update('cameraTitan',bodyClear(state.camera,.3),t,'camera');update('cameraRoof',roofField(state.camera,.3),t,'camera');
    cameraSamples.push({t,position:state.camera,titanClearanceM:bodyClear(state.camera,.3),roofClearanceM:roofField(state.camera,.3)});
    for(const segment of segments)update('cameraBody',segmentDistance(V(state.camera),V(state.camera),V(segment.a),V(segment.b))-segment.r-.15,t,segment.id);
    if(t>=LAUNCH&&t<7){
      const start=V(state.outlet),end=hookPosition(t),steps=Math.max(1,Math.ceil(start.distanceTo(end)/.05));
      const meshDistance=meshSegmentDistance(start,end),meshClearance=meshDistance-.022;
      cableSamples.push({t,centerlineDistanceM:meshDistance,radiusM:.022,clearanceM:meshClearance});
      if(meshClearance<minima.cableTitan.d)minima.cableTitan={d:meshClearance,t,part:'exact rendered triangle mesh, full cable',
        segmentStart:start.toArray(),segmentEnd:end.toArray(),witness:lastMeshWitness};
      for(const segment of segments){
        if(segment.id==='equipment')continue;
        update('cableBody',segmentDistance(start,end,V(segment.a),V(segment.b))-segment.r-.022,t,segment.id);
      }
      const localA=soldier.worldToLocal(start.clone()),localB=soldier.worldToLocal(end.clone());
      for(const sign of [-1,1])update('cableBody',segmentBoxDistance(localA,localB,V([sign*.24,-.17,-.05]),V([.07,.275,.095]))-.022,t,'actual equipment box');
      for(let k=0;k<=steps;k++){
        const point=start.clone().lerp(end,k/steps),bound=bodyClear(point.toArray(),.022);
        if(bound<conservativeCable.d)conservativeCable={d:bound,t,point:point.toArray()};
      }
    }
    if(count++%8===0)visibility.push({t,bodyExtentPixels:state.bodyExtentPixels,bodyLandmarksInFrame:state.bodyLandmarksInFrame,titanLandmarks:state.titanLandmarks});
    const hit=segments.filter(s=>s.id.startsWith('blade')).every(s=>{
      const a=V(s.a).sub(V(data.nape.center)).divide(V(data.nape.radii));
      const d=V(s.b).sub(V(data.nape.center)).divide(V(data.nape.radii)).sub(a);
      return a.addScaledVector(d,clamp(-a.dot(d)/d.lengthSq(),0,1)).lengthSq()<=1;
    });
    if(hit)contacts.push(t);
  }
  const a=V([0,0,0]),b=V([1,0,0]),c=V([0,1,0]);
  const helperTests=[
    {name:'cross-triangle',actual:triangleDistance(V([.25,.25,1]),V([.25,.25,-1]),a,b,c),expected:0},
    {name:'parallel-triangle',actual:triangleDistance(V([.2,.2,1]),V([.4,.2,1]),a,b,c),expected:1},
    {name:'edge-distance',actual:triangleDistance(V([.75,.75,1]),V([.75,.75,-1]),a,b,c),expected:Math.sqrt(.125)},
    {name:'box-crossing',actual:segmentBoxDistance(V([-2,0,0]),V([2,0,0]),V([0,0,0]),V([.5,.5,.5])),expected:0},
    {name:'box-parallel',actual:segmentBoxDistance(V([-2,1,0]),V([2,1,0]),V([0,0,0]),V([.5,.5,.5])),expected:.5}
  ].map(test=>({...test,passed:Math.abs(test.actual-test.expected)<1e-9}));
  return {schema:'cinematic-v2-reviewed-graybox-audit-v1',samplingHz:240,criticalIntervalSamplingHz:960,timeSamples:times.length,helperTests,
    minima,conservativeCableEnvelope:conservativeCable,outletErrorM:outletError,
    pairedContactSamples:contacts,visibility,cableSamples,cameraSamples,
    cableMeshMethod:'Exact finite segment/triangle distances on the rendered Float32 mesh, accelerated by a1m spatial grid. 0.25m samples with27 neighboring cells conservatively collect every triangle within0.5m; farther distances are capped at0.5m. Full cable endpoints included, radius0.022m unchanged; no anchor/outlet exclusions.',
    limitations:['Dense-time validation, not a formal continuous-time proof.','Actor attitude remains kinematic and the cable is massless; equipment load feasibility is not established.']};
}
function verifyMeshSegments(times){
  return times.map(t=>{
    const start=sample(t).p,end=hookPosition(t),length=start.distanceTo(end),ray=new THREE.Ray(start,end.clone().sub(start).normalize());
    const accelerated=meshSegmentDistance(start,end);let exact=Infinity,index=-1;
    for(let i=0;i<meshTriangles.length;i++){
      const triangle=meshTriangles[i],distance=triangleDistance(start,end,triangle.a,triangle.b,triangle.c,ray,length);
      if(distance<exact){exact=distance;index=i;}
    }
    return {t,trianglesScanned:meshTriangles.length,acceleratedDistanceM:accelerated,exhaustiveDistanceM:exact,
      differenceM:Math.abs(accelerated-Math.min(.5,exact)),actualCableRadiusM:.022,
      actualMeshClearanceM:exact-.022,triangle:index,passed:Math.abs(accelerated-Math.min(.5,exact))<1e-9&&exact>.022};
  });
}
const invasionColliderGrid=new Map();
for(const [index,c] of invasion.colliders.entries()){
  for(let x=Math.floor(c.min[0]/8);x<=Math.floor(c.max[0]/8);x++)
    for(let z=Math.floor(c.min[2]/8);z<=Math.floor(c.max[2]/8);z++){
      const key=x+','+z;if(!invasionColliderGrid.has(key))invasionColliderGrid.set(key,[]);
      invasionColliderGrid.get(key).push(index);
    }
}
function ruinEnvelope(a,b,r,ignoreOwner=null){
  let minimum=Infinity,witness=null;const candidates=new Set();
  for(let x=Math.floor((Math.min(a.x,b.x)-r)/8);x<=Math.floor((Math.max(a.x,b.x)+r)/8);x++)
    for(let z=Math.floor((Math.min(a.z,b.z)-r)/8);z<=Math.floor((Math.max(a.z,b.z)+r)/8);z++)
      for(const index of invasionColliderGrid.get(x+','+z)||[])candidates.add(index);
  for(const index of candidates){
    const c=invasion.colliders[index];
    if(ignoreOwner!==null&&c.owner===ignoreOwner)continue;
    if(c.max[1]+r<Math.min(a.y,b.y)||c.min[1]-r>Math.max(a.y,b.y))continue;
    const center=V(c.min).add(V(c.max)).multiplyScalar(.5),half=V(c.max).sub(V(c.min)).multiplyScalar(.5);
    const distance=segmentBoxDistance(a,b,center,half)-r;
    if(distance<minimum){minimum=distance;witness={owner:c.owner,kind:c.kind,index};}
  }
  return {d:Number.isFinite(minimum)?minimum:100,witness};
}
const actualRuinTriangles=new Map();
function pieceTriangles(index){
  if(actualRuinTriangles.has(index))return actualRuinTriangles.get(index);
  const record=invasion.colliders[index],source=invasion.ruinSources[record.kind];
  const geometry=invasion.staticMeshes[Object.keys(invasion.ruinSources).indexOf(record.kind)].geometry;
  const position=geometry.getAttribute('position'),triangles=[];
  for(let i=record.indexStart;i<record.indexStart+record.indexCount;i+=3){
    triangles.push([0,1,2].map(j=>new THREE.Vector3().fromBufferAttribute(position,source.indices[i+j])));
  }
  actualRuinTriangles.set(index,triangles);return triangles;
}
function insidePiece(point,index){
  const ray=new THREE.Ray(point,V([.812,.271,.513]).normalize()),hits=[];
  for(const tri of pieceTriangles(index)){
    const hit=ray.intersectTriangle(...tri,false,new THREE.Vector3());
    if(hit){
      const distance=hit.distanceTo(point);
      if(distance>1e-7&&!hits.some(d=>Math.abs(d-distance)<1e-6))hits.push(distance);
    }
  }
  return hits.length%2===1;
}
function exactRuinWire(a,b,r=.022){
  const margin=r+.5,candidates=new Set();let best=.5,witness=null;
  for(let x=Math.floor((Math.min(a.x,b.x)-margin)/8);x<=Math.floor((Math.max(a.x,b.x)+margin)/8);x++)
    for(let z=Math.floor((Math.min(a.z,b.z)-margin)/8);z<=Math.floor((Math.max(a.z,b.z)+margin)/8);z++)
      for(const index of invasionColliderGrid.get(x+','+z)||[])candidates.add(index);
  for(const index of candidates){
    const c=invasion.colliders[index],center=V(c.min).add(V(c.max)).multiplyScalar(.5),half=V(c.max).sub(V(c.min)).multiplyScalar(.5);
    if(segmentBoxDistance(a,b,center,half)>best+r+.0001)continue;
    let distance=Infinity,triangle=-1;
    const triangles=pieceTriangles(index);
    for(let i=0;i<triangles.length;i++){
      const d=triangleDistance(a,b,...triangles[i]);
      if(d<distance){distance=d;triangle=i;}
    }
    if(insidePiece(a,index)||insidePiece(b,index))distance=0;
    if(distance-r<best){best=distance-r;witness={owner:c.owner,kind:c.kind,piece:index,triangle,
      vertices:triangles[triangle]?.map(v=>v.toArray()),centerlineDistanceM:distance};}
  }
  return {d:best,witness};
}
function exactColossalRuinCheck(t,rig){
  const position=rig.skin.geometry.getAttribute('position');
  const points=Array.from({length:position.count},(_,i)=>{
    const p=new THREE.Vector3().fromBufferAttribute(position,i);rig.skin.applyBoneTransform(i,p);return rig.skin.localToWorld(p);
  });
  const bounds=new THREE.Box3().setFromPoints(points),index=rig.skin.geometry.index.array;
  let tested=0,minimum=.5,witness=null;
  for(let piece=0;piece<invasion.colliders.length;piece++){
    const c=invasion.colliders[piece],box=new THREE.Box3(V(c.min),V(c.max));
    const expanded=box.clone().expandByScalar(.5);
    if(!bounds.intersectsBox(expanded))continue;
    const triangles=pieceTriangles(piece);
    for(let i=0;i<index.length;i+=3){
      const tri=[points[index[i]],points[index[i+1]],points[index[i+2]]];
      if(!new THREE.Box3().setFromPoints(tri).intersectsBox(expanded))continue;
      for(const other of triangles){
        tested++;
        let d=Infinity;
        for(let edge=0;edge<3;edge++){
          d=Math.min(d,triangleDistance(tri[edge],tri[(edge+1)%3],...other),
            triangleDistance(other[edge],other[(edge+1)%3],...tri));
        }
        if(d<minimum){minimum=d;witness={owner:c.owner,kind:c.kind,piece,skinTriangle:i/3};}
      }
      if(insidePiece(tri[0],piece)){minimum=0;witness={owner:c.owner,piece,skinTriangle:i/3,insideSolid:true};}
    }
    const corner=triangles[0][0];
    if(bounds.containsPoint(corner)){
      const ray=new THREE.Ray(corner,V([.812,.271,.513]).normalize()),hits=[];
      for(let i=0;i<index.length;i+=3){
        const hit=ray.intersectTriangle(points[index[i]],points[index[i+1]],points[index[i+2]],false,new THREE.Vector3());
        if(hit){
          const d=hit.distanceTo(corner);
          if(d>1e-7&&!hits.some(v=>Math.abs(v-d)<1e-6))hits.push(d);
        }
      }
      if(hits.length%2){minimum=0;witness={owner:c.owner,piece,ruinVertexInsideGiant:true};}
    }
  }
  return {t,id:rig.config.id,testedTrianglePairs:tested,minimumComparedTriangleDistanceM:minimum,witness,
    actualSkinnedVertexBounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},
    intersecting:minimum<1e-7};
}
function auditExactCorrections(){
  const expected=['main-colossal','background-colossal-left','background-colossal-right'];
  const cast=invasion.rigs.map(r=>({id:r.config.id,heightM:r.config.height,shape:r.config.shape}));
  if(cast.length!==3||cast.some((actor,i)=>actor.id!==expected[i]||actor.heightM!==60||actor.shape!=='main'))
    throw Error('Exact correction audit requires the three-Colossal cast');
  const times=Array.from({length:Math.ceil((10-data.roofExit.hookLaunch)*120)+1},(_,i)=>Math.min(10,data.roofExit.hookLaunch+i/120));
  for(let i=Math.floor((data.roofExit.hookSeat-.06)*480);i<=Math.ceil((data.roofExit.hookSeat+.06)*480);i++)times.push(i/480);
  const roofRows=[];let roofMinimum={d:Infinity};
  for(const t of [...new Set(times)].sort((a,b)=>a-b)){
    seek(t,false);const path=state.roofCablePoints.map(V);let minimum={d:Infinity};
    for(let i=0;i<path.length-1;i++){
      const check=exactRuinWire(path[i],path[i+1]);
      if(check.d<minimum.d)minimum={...check,piece:i};
    }
    roofRows.push({t,...minimum});
    if(minimum.d<roofMinimum.d)roofMinimum={t,...minimum};
  }
  const colossals=[];
  for(let i=0;i<=60;i++){
    const t=i/6;seek(t,false);
    for(const rig of invasion.rigs)colossals.push(exactColossalRuinCheck(t,rig));
  }
  return {schema:'three-colossal-exact-correction-checks-v1',cast,
    roofWire:{radiusM:.022,noEndpointExclusions:true,minimum:roofMinimum,rows:roofRows,
      method:'Actual rendered Float32 ruin triangles,finite wire-segment/triangle distance and closed-solid endpoint inclusion. Distant distances capped at0.5m.'},
    colossals:{samplesHz:6,rows:colossals,anyIntersection:colossals.some(r=>r.intersecting),
      method:'All three actual posed/skinned60m mesh vertices and triangles against actual ruin triangles,with vertex containment in closed ruin solids. Broadphase uses complete actual vertex bounds; no building exclusions.'},
    fullContinuousTimeCertification:false};
}
function auditInvasion(){
  const minima={},flags=[],rows=[];let maxOutlet=0;
  function update(key,d,t,detail){
    if(!minima[key]||d<minima[key].d)minima[key]={d,t,...detail};
    if(d<0&&flags.length<120)flags.push({key,d,t,...detail});
  }
  for(let i=0;i<=300;i++){
    const t=i/30;seek(t,false);
    maxOutlet=Math.max(maxOutlet,V(state.outlet).distanceTo(V(state.position)));
    const gi=invasion.rigs,cam=V(state.camera),hero=state.bodySegments;
    const cameraCity=ruinEnvelope(cam,cam,.3);update('cameraRuinsAabb',cameraCity.d,t,cameraCity.witness);
    for(const part of hero){
      const a=V(part.a),b=V(part.b),result=ruinEnvelope(a,b,part.r);
      update('soldierRuinsAabb',result.d,t,{part:part.id,...result.witness});
      for(const g of gi){
        for(const obstacle of g.segments){
          if(g.config.id==='main-colossal'&&obstacle.id==='torso-envelope')continue;
          if(g.config.id==='main-colossal'&&obstacle.id==='head-neck-envelope'&&part.id.startsWith('blade')&&Math.abs(t-PEAK)<.3)continue;
          const distance=segmentDistance(a,b,V(obstacle.a),V(obstacle.b))-part.r-obstacle.r;
          update('soldierVs:'+g.config.id,distance,t,{part:part.id,obstacle:obstacle.id});
        }
      }
    }
    for(const g of gi){
      for(const part of g.segments){
        const a=V(part.a),b=V(part.b);
        const rc=ruinEnvelope(a,b,part.r);update('giantRuinsAabb:'+g.config.id,rc.d,t,{part:part.id,...rc.witness});
        const dc=segmentDistance(cam,cam,a,b)-.3-part.r;
        update('cameraVs:'+g.config.id,dc,t,{part:part.id});
      }
    }
    for(let a=0;a<gi.length;a++)for(let b=a+1;b<gi.length;b++)
      for(const sa of gi[a].segments)for(const sb of gi[b].segments){
        const distance=segmentDistance(V(sa.a),V(sa.b),V(sb.a),V(sb.b))-sa.r-sb.r;
        update('giantPair:'+gi[a].config.id+'/'+gi[b].config.id,distance,t,{parts:[sa.id,sb.id]});
      }
    const path=t>=LAUNCH&&t<7?[sample(t).p,hookPosition(t)]:
      t>=data.roofExit.hookLaunch?state.roofCablePoints.map(V):[];
    for(let j=0;j<path.length-1;j++){
      const result=ruinEnvelope(path[j],path[j+1],.022);
      update('cableRuinsAabb',result.d,t,{piece:j,...result.witness});
      for(const g of gi){
        for(const obstacle of g.segments){
          if(g.config.id==='main-colossal'&&obstacle.id==='torso-envelope')continue;
          const distance=segmentDistance(path[j],path[j+1],V(obstacle.a),V(obstacle.b))-.022-obstacle.r;
          update('cableVs:'+g.config.id,distance,t,{piece:j,obstacle:obstacle.id});
        }
      }
    }
    if(i%3===0)rows.push({t,position:state.position,camera:state.camera,
      bodyExtentPixels:state.bodyExtentPixels,bodyLandmarksInFrame:state.bodyLandmarksInFrame,
      napePixel:state.napePixel,roofState:state.roofState,
      giantHeadPixels:Object.fromEntries(gi.map(g=>[g.config.id,projected(g.group.position.clone().add(V([0,g.config.height*.91,0])))]))});
  }
  return {schema:'invasion-v5-provisional-collision-review-v1',samplingHz:30,minima,flags,rows,
    maximumOutletErrorM:maxOutlet,mainAnchorSkinBinding:invasion.anchorSkinEvidence,
    limitations:['Ruin AABBs and giant capsule envelopes are conservative preliminary checks,not exact deformed triangle sweeps.',
      'Main torso capsule is deliberately not used to certify near-skin contact; affine anchor binding is verified separately and a full deformed-mesh audit remains required.',
      'Only intended near-nape blade contact is omitted from the coarse head/neck envelope during the single attack window.',
      'This world/gait preview is not a full force/clearance or creative pass.'],fullCollisionPassClaim:false};
}
function validationAssets(){
  const geometryData=geometry=>({
    positions:Array.from(geometry.getAttribute('position').array),
    indices:geometry.index?Array.from(geometry.index.array):Array.from({length:geometry.getAttribute('position').count},(_,i)=>i),
  });
  return {schema:'invasion-full-validation-input-v1',
    giants:invasion.rigs.map(r=>({id:r.config.id,...geometryData(r.skin.geometry),
      skinIndex:Array.from(r.skin.geometry.getAttribute('skinIndex').array),
      skinWeight:Array.from(r.skin.geometry.getAttribute('skinWeight').array),
      capIds:r.segments.map(s=>s.id)})),
    hero:heroSolids.map(object=>({id:heroLabel(object),...geometryData(object.geometry)})),
    ruins:invasion.ruinSources,ruinPieces:invasion.colliders,
    events:data.events,nape:data.nape,mainVelocity:data.invasion.mainVelocity,
    roof:data.roofExit,geometryGuardM:.0001};
}
function validationSnapshot(t){
  seek(t,false);
  const giantMatrices=invasion.rigs.map(r=>{
    r.skin.skeleton.update();
    const left=r.skin.matrixWorld.clone().multiply(r.skin.bindMatrixInverse);
    return r.skin.skeleton.bones.map((_,i)=>left.clone()
      .multiply(new THREE.Matrix4().fromArray(r.skin.skeleton.boneMatrices,i*16))
      .multiply(r.skin.bindMatrix).toArray());
  });
  const capePoints=Array.from(cape.geometry.getAttribute('position').array);
  return {t,giantMatrices,giantCaps:invasion.rigs.map(r=>r.segments.map(s=>[...s.a,...s.b,s.r])),
    heroMatrices:heroSolids.map(o=>o.matrixWorld.toArray()),capePoints,
    camera:state.camera,position:state.position,velocity:state.velocity,outlet:state.outlet,
    hookEye:t>=LAUNCH&&t<7?hookPosition(t).toArray():null,
    roofEye:t>=data.roofExit.hookLaunch?roofHookPosition(t).toArray():null,
    rope:t>=LAUNCH&&t<7?[state.outlet,hookPosition(t).toArray()]:state.roofCablePoints,
    nape:napeAt(t).toArray(),loadedAnchorCount:state.loadedAnchorCount,
    skinWitnesses:invasion.rigs.map(r=>[0,Math.floor(r.skin.geometry.attributes.position.count/3),
      Math.floor(r.skin.geometry.attributes.position.count*2/3),r.skin.geometry.attributes.position.count-1].map(i=>{
        const p=new THREE.Vector3().fromBufferAttribute(r.skin.geometry.attributes.position,i);
        r.skin.applyBoneTransform(i,p);r.skin.localToWorld(p);return {i,p:p.toArray()};
      }))};
}
const gl=renderer.getContext(),extension=gl.getExtension('WEBGL_debug_renderer_info');
initializeRoofObjects();
// Dormant state uses constructor transforms; fixed hook/joint radii must survive reactivation.
for(const object of [rope,hook,shank,roofCableGroup,...roofRods,...roofJoints,roofHook,roofShank,...jets])
  dormantDefaults.set(object,{position:object.position.clone(),quaternion:object.quaternion.clone(),scale:object.scale.clone()});
window.reconstruction={ready:true,pause(){},seek,auditInvasion,auditExactCorrections,gaitEvidence:()=>invasion.gaitEvidence(),
  validationAssets,validationSnapshot,
  setSteam:value=>invasion.setSteam(value),diagnostics:()=>state,
  gaitCamera(t){seek(t,false);camera.position.copy(rootShift(t)).add(V([70,24,42]));camera.lookAt(rootShift(t).add(V([0,26,0])));renderer.render(scene,camera);},
  setResolution(w,h){width=w;height=h;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();},
  rendererEvidence:{renderer:extension?gl.getParameter(extension.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
    vendor:extension?gl.getParameter(extension.UNMASKED_VENDOR_WEBGL):gl.getParameter(gl.VENDOR),threeRevision:THREE.REVISION,
    textureInputs:[],cameraRule:data.cameraMode,constantBodySizeControl:false,
    shadows:{method:'dynamic directional PCF shadow map updated for every newly rendered walking-world frame',size:[2048,2048],footSupportPlaneY:0,fakeContactDecals:false},
    frozenPrefixRetired:true,allFramesNewWorld:true,steam:'deterministic finite-age translucent3D steam meshes; no image textures'}};
renderer.shadowMap.needsUpdate=true;seek(0);

(() => {
  const config = {
    family: 'smooth-changing-offset', blendEnd: 2.6, fullGiantUntil: 1,
    minimumBodyPixels: 35, maximumBodyPixels: 180,
    screenMargin: 16, cameraClearance: .75, cellSize: 6,
  };
  const baseFov = camera.fov;
  const probeCamera = camera.clone();
  const projection = new THREE.Matrix4();
  const frames = new Map();
  const grid = new Map();
  let lastRejection=null;
  const reject=(frame,reason,detail={})=>{
    lastRejection={t:frame.t,reason,...detail};
    return null;
  };
  for (const box of invasion.colliders) {
    const lo = box.min.map(v => Math.floor((v-config.cameraClearance)/config.cellSize));
    const hi = box.max.map(v => Math.floor((v+config.cameraClearance)/config.cellSize));
    for(let x=lo[0];x<=hi[0];x++)for(let y=lo[1];y<=hi[1];y++)for(let z=lo[2];z<=hi[2];z++){
      const key=x+','+y+','+z;
      if(!grid.has(key))grid.set(key,[]);
      grid.get(key).push(box);
    }
  }
  const quintic = q => q*q*q*(10+q*(-15+6*q));
  const weight = (t,p) => t<=p.blendStart?1:t>=config.blendEnd?0:
    1-quintic((t-p.blendStart)/(config.blendEnd-p.blendStart));
  function worldVertices(group) {
    const points=[],p=new THREE.Vector3();
    group.traverse(object=>{
      if(!object.isMesh)return;
      const attribute=object.geometry.getAttribute('position');
      for(let i=0;i<attribute.count;i++){
        p.fromBufferAttribute(attribute,i);
        if(object.isSkinnedMesh)object.applyBoneTransform(i,p);
        p.applyMatrix4(object.matrixWorld);
        points.push([p.x,p.y,p.z]);
      }
    });
    return points;
  }
  function supportPoints(points) {
    const selected=new Set();
    for(let x=-1;x<=1;x++)for(let y=-1;y<=1;y++)for(let z=-1;z<=1;z++){
      if(!x&&!y&&!z)continue;
      let best=-Infinity,index=-1;
      points.forEach((p,i)=>{const score=x*p[0]+y*p[1]+z*p[2];if(score>best){best=score;index=i;}});
      selected.add(index);
    }
    for(let i=0;i<points.length;i+=Math.max(1,Math.floor(points.length/64)))selected.add(i);
    return [...selected].map(i=>points[i]);
  }
  function collect(t,cacheResult=true) {
    t=clipTime(t);
    const key=t.toFixed(6);
    if(frames.has(key))return frames.get(key);
    camera.fov=baseFov;camera.updateProjectionMatrix();seek(t,false);
    const hero=[head.localToWorld(V([0,1,0])),...feet.map(f=>f.localToWorld(V([0,-.5,0])))].map(p=>p.toArray());
    const allGiants=invasion.rigs.map(rig=>{
      const points=worldVertices(rig.group),origin=rig.group.position.toArray();
      let minY=Infinity,maxY=-Infinity,radiusSquared=0;
      for(const point of points){
        minY=Math.min(minY,point[1]);maxY=Math.max(maxY,point[1]);
        radiusSquared=Math.max(radiusSquared,(point[0]-origin[0])**2+(point[2]-origin[2])**2);
      }
      return {
        points,origin,
        minY,maxY,radius:Math.sqrt(radiusSquared),
      };
    });
    const main=allGiants[0];
    const frame={
      t,position:[...state.position],oldCamera:[...state.camera],oldTarget:[...state.lookAt],
      oldBodyPixels:state.bodyExtentPixels,hero,allGiants,
      heroShapePoints:[...heroSolids,cape].flatMap(object=>worldVertices(object)),
      mainPoints:main.points,mainSupport:cacheResult?supportPoints(main.points):null,
      upperPoints:main.points.filter(p=>p[1]>=main.origin[1]+40),
    };
    if(cacheResult){
      frame.upperSupport=supportPoints(frame.upperPoints);
      frame.heroSupport=supportPoints(frame.heroShapePoints);
      frames.set(key,frame);
    }
    return frame;
  }
  function pose(frame,p) {
    const w=weight(frame.t,p),subject=V(frame.position);
    const q=frame.t<=p.transitionStart?0:frame.t>=p.transitionEnd?1:
      quintic((frame.t-p.transitionStart)/(p.transitionEnd-p.transitionStart));
    const distance=p.distanceStart+(p.distanceEnd-p.distanceStart)*q;
    const yaw=p.yawStart+(p.yawEnd-p.yawStart)*q;
    const rise=p.riseStart+(p.riseEnd-p.riseStart)*q;
    const aimHeight=frame.t<1?
      p.earlyAimHeight+(p.aimHeightStart-p.earlyAimHeight)*quintic(Math.max(0,frame.t)):
      p.aimHeightStart+(p.aimHeightEnd-p.aimHeightStart)*q;
    const direction=V(frame.oldCamera).sub(subject).normalize().applyAxisAngle(UP,yaw*Math.PI/180);
    const alternate=subject.clone().addScaledVector(direction,distance).addScaledVector(UP,rise);
    const alternateTarget=V(frame.allGiants[0].origin).add(V([0,aimHeight,0])).lerp(subject,p.aimWeight);
    return {
      position:V(frame.oldCamera).lerp(alternate,w),
      target:V(frame.oldTarget).lerp(alternateTarget,w),
      fov:baseFov+(p.fov-baseFov)*w,
    };
  }
  function pointClear(position,frame) {
    const r=config.cameraClearance;
    if(position.y<r)return false;
    const key=[position.x,position.y,position.z].map(v=>Math.floor(v/config.cellSize)).join(',');
    for(const box of grid.get(key)||[])if(
      position.x>=box.min[0]-r&&position.x<=box.max[0]+r&&
      position.y>=box.min[1]-r&&position.y<=box.max[1]+r&&
      position.z>=box.min[2]-r&&position.z<=box.max[2]+r
    )return false;
    for(const giant of frame.allGiants)if(
      position.y>=giant.minY-r&&position.y<=giant.maxY+r&&
      Math.hypot(position.x-giant.origin[0],position.z-giant.origin[2])<=giant.radius+r
    )return false;
    return true;
  }
  function projectPoint(p,m) {
    const w=m[3]*p[0]+m[7]*p[1]+m[11]*p[2]+m[15];
    if(w<=0)return null;
    const x=(m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12])/w;
    const y=(m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13])/w;
    const z=(m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14])/w;
    if(z< -1||z>1)return null;
    return [(x+1)*640,(1-y)*360];
  }
  function inside(p,margin=config.screenMargin) {
    return p&&p[0]>=margin&&p[0]<=1280-margin&&p[1]>=margin&&p[1]<=720-margin;
  }
  function evaluateFrame(frame,p,full=false) {
    const proposed=pose(frame,p);
    if(!pointClear(proposed.position,frame))return reject(frame,'camera-clearance',{position:proposed.position.toArray()});
    if(frame.t<=2&&proposed.position.z-frame.allGiants[0].origin[2]<4.5)return reject(frame,'back-side',{position:proposed.position.toArray()});
    probeCamera.position.copy(proposed.position);probeCamera.up.copy(UP);
    probeCamera.fov=proposed.fov;probeCamera.updateProjectionMatrix();
    probeCamera.lookAt(proposed.target);probeCamera.updateMatrixWorld(true);
    projection.multiplyMatrices(probeCamera.projectionMatrix,probeCamera.matrixWorldInverse);
    const m=projection.elements;
    const hero=frame.hero.map(point=>projectPoint(point,m));
    if(!hero.every(point=>inside(point)))return reject(frame,'hero-landmarks',{projected:hero});
    const heroShape=full?frame.heroShapePoints:frame.heroSupport;
    const outsideHero=heroShape.find(point=>!inside(projectPoint(point,m),8));
    if(outsideHero)return reject(frame,'hero-shape',{worldPoint:outsideHero,projected:projectPoint(outsideHero,m)});
    const bodyPixels=Math.max(...hero.slice(1).map(point=>Math.hypot(point[0]-hero[0][0],point[1]-hero[0][1])));
    if(bodyPixels>config.maximumBodyPixels)return reject(frame,'hero-too-large',{bodyPixels});
    const points=frame.t<=config.fullGiantUntil?
      (full?frame.mainPoints:frame.mainSupport):(full?frame.upperPoints:frame.upperSupport);
    const outsideGiant=frame.t<=2?points.find(point=>!inside(projectPoint(point,m),8)):null;
    if(outsideGiant)return reject(frame,'giant-framing',{worldPoint:outsideGiant,projected:projectPoint(outsideGiant,m)});
    return {
      t:frame.t,bodyPixels,oldBodyPixels:frame.oldBodyPixels,
      position:proposed.position.toArray(),target:proposed.target.toArray(),fov:proposed.fov,
      displacement:proposed.position.distanceTo(V(frame.oldCamera)),
      sampledCameraClearancePassed:true,
    };
  }
  function evaluate(p,times,full=false) {
    const values=[];
    for(const t of times){
      const result=evaluateFrame(collect(t),p,full);
      if(!result)return null;
      values.push(result);
    }
    const opening=values.filter(row=>row.t<=2);
    const minimum=Math.min(...opening.map(row=>row.bodyPixels));
    const displacement=values.reduce((sum,row)=>sum+row.displacement,0)/values.length;
    let maximumCameraSpeed=0;
    for(let i=1;i<values.length;i++){
      maximumCameraSpeed=Math.max(maximumCameraSpeed,
        V(values[i].position).distanceTo(V(values[i-1].position))/(values[i].t-values[i-1].t));
    }
    return {
      params:p,minimumBodyPixels:minimum,meetsBodyThreshold:minimum>=config.minimumBodyPixels,
      maximumSampledCameraSpeedMps:maximumCameraSpeed,
      cost:displacement+.1*Math.abs(p.yawEnd-p.yawStart)+.5*(p.fov-baseFov)+.05*maximumCameraSpeed,samples:values,
    };
  }
  function visibility() {
    const hero=new Set([...heroSolids,cape]),objects=[];
    scene.traverse(o=>{if(o.isMesh||o.isLine||o.isPoints||o.isSprite)objects.push({o,visible:o.visible,material:o.material});});
    const oldBackground=scene.background,oldFog=scene.fog,oldShadow=renderer.shadowMap.enabled;
    const oldClear=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha(),materials=new Map();
    const maskMaterial=(original,isHero)=>{
      const key=(isHero?'w':'b')+original.side;
      if(!materials.has(key))materials.set(key,new THREE.MeshBasicMaterial({
        color:isHero?0xffffff:0x000000,side:original.side,depthTest:true,depthWrite:true,toneMapped:false,fog:false
      }));
      return materials.get(key);
    };
    const readMask=()=>{
      const pixels=new Uint8Array(1280*720*4),mask=new Uint8Array(1280*720);
      gl.readPixels(0,0,1280,720,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
      for(let i=0;i<mask.length;i++)mask[i]=Number(pixels[4*i]>=128&&pixels[4*i+1]>=128&&pixels[4*i+2]>=128);
      return mask;
    };
    let visible,isolated;
    try{
      scene.background=null;scene.fog=null;renderer.setClearColor(0x000000,1);renderer.shadowMap.enabled=false;
      for(const item of objects){
        const mats=Array.isArray(item.material)?item.material:[item.material];
        item.o.visible=item.visible&&item.o.isMesh&&!mats.some(m=>m.transparent||m.opacity<1);
        if(item.o.isMesh)item.o.material=Array.isArray(item.material)?
          mats.map(m=>maskMaterial(m,hero.has(item.o))):maskMaterial(item.material,hero.has(item.o));
      }
      renderer.render(scene,camera);visible=readMask();
      for(const item of objects)if(!hero.has(item.o))item.o.visible=false;
      renderer.render(scene,camera);isolated=readMask();
    }finally{
      for(const item of objects){item.o.visible=item.visible;item.o.material=item.material;}
      scene.background=oldBackground;scene.fog=oldFog;renderer.setClearColor(oldClear,oldAlpha);
      renderer.shadowMap.enabled=oldShadow;for(const material of materials.values())material.dispose();
      renderer.render(scene,camera);
    }
    let total=0,count=0;
    for(let i=0;i<isolated.length;i++){total+=isolated[i];count+=isolated[i]&&visible[i];}
    return {isolatedPixels:total,visiblePixels:count,opaqueVisibleFraction:total?count/total:null};
  }
  window.__searchOpeningCamera=function(){
    const coarse=[0,.5,1,1.5,2,2.6],dense=Array.from({length:53},(_,i)=>i*.05);
    [...new Set([...coarse,...dense])].forEach(collect);
    let tested=0,valid=0;
    const coarseRejections={},denseRejections=[],denseSupportRejections={};
    const shortlist=[];
    for(const distanceEnd of [4,6,8,10,12])
      for(const yawEnd of [-60,-40,-20,0,20,40])
        for(const riseEnd of [-6,-4,-2,0,2,4])
          for(const aimHeightEnd of [28,32,36,40])
            for(const transitionStart of [1,1.1])
              for(const transitionEnd of [1.6,1.8])
                for(const blendStart of [1.7,1.9])
                  for(const earlyAimHeight of [22,24,26,28,30,32]){
                tested++;
                const result=evaluate({
                  distanceStart:15,distanceEnd,yawStart:20,yawEnd,riseStart:4,riseEnd,
                  aimHeightStart:32,aimHeightEnd,aimWeight:.3,fov:85,
                  transitionStart,transitionEnd,blendStart,earlyAimHeight
                },coarse);
                if(!result){
                  const reason=lastRejection?.reason||'unknown';
                  coarseRejections[reason]=(coarseRejections[reason]||0)+1;
                  continue;
                }
                valid++;shortlist.push(result);
              }
    shortlist.sort((a,b)=>Number(b.meetsBodyThreshold)-Number(a.meetsBodyThreshold)||
      (a.meetsBodyThreshold?a.cost-b.cost:b.minimumBodyPixels-a.minimumBodyPixels));
    const denseSupport=[];
    for(const candidate of shortlist){
      const result=evaluate(candidate.params,dense,false);
      if(result)denseSupport.push(result);
      else{
        const reason=lastRejection?.reason||'unknown';
        denseSupportRejections[reason]=(denseSupportRejections[reason]||0)+1;
      }
    }
    denseSupport.sort((a,b)=>Number(b.meetsBodyThreshold)-Number(a.meetsBodyThreshold)||
      (a.meetsBodyThreshold?a.cost-b.cost:b.minimumBodyPixels-a.minimumBodyPixels));
    const refined=[];
    for(const candidate of denseSupport.slice(0,120)){
      const result=evaluate(candidate.params,dense,true);
      if(result)refined.push(result);
      else denseRejections.push({params:candidate.params,...lastRejection});
    }
    refined.sort((a,b)=>Number(b.meetsBodyThreshold)-Number(a.meetsBodyThreshold)||
      (a.meetsBodyThreshold?a.cost-b.cost:b.minimumBodyPixels-a.minimumBodyPixels));
    camera.fov=baseFov;camera.updateProjectionMatrix();seek(0);
    return {
      config,parameterSetsTested:tested,coarseSafetyAndFramingValid:valid,
      coarseRejections,denseRejections,
      denseSupportSafetyAndFramingValid:denseSupport.length,
      denseSupportMeetsBodyThreshold:denseSupport.filter(item=>item.meetsBodyThreshold).length,
      denseSupportRejections,
      denseSafetyAndFramingValid:refined.length,best:refined[0]||null,
      alternatives:refined.slice(0,5),
      caveats:['Sampled conservative camera checks, not an infinite-time collision proof.',
        'Initial search uses support vertices; finalists use all actual main-giant mesh vertices at53times.',
        'Finalists also keep the entire projected hero geometry, cape and blades inside the image at the sampled times.',
        'Anatomy, motion, anchors and blades are unchanged; camera is intentionally changed only until2.6s.',
        'No image/video model generation or creative approval.']
    };
  };
  window.__renderOpeningCamera=function(t,p){
    const oldMarker=nape.visible;
    try{
      camera.fov=baseFov;camera.updateProjectionMatrix();nape.visible=false;
      const before=JSON.stringify(validationSnapshot(t));
      renderer.render(scene,camera);
      const baseline=document.querySelector('canvas').toDataURL('image/png').split(',')[1];
      const frame=collect(t),proposed=pose(frame,p),metric=evaluateFrame(frame,p,true);
      if(!metric)throw Error('Selected camera fails its sampled safety/framing check');
      camera.position.copy(proposed.position);camera.up.copy(UP);camera.fov=proposed.fov;
      camera.updateProjectionMatrix();camera.lookAt(proposed.target);camera.updateMatrixWorld(true);
      renderer.render(scene,camera);
      const candidate=document.querySelector('canvas').toDataURL('image/png').split(',')[1];
      const visible=visibility();
      camera.fov=baseFov;camera.updateProjectionMatrix();
      const after=JSON.stringify(validationSnapshot(t));
      if(before!==after)throw Error('Camera preview changed source numeric state');
      return {t,baseline,candidate,metric,visibility:visible,restoredSnapshot:after,numericStateRestored:true};
    }finally{
      nape.visible=oldMarker;camera.fov=baseFov;camera.updateProjectionMatrix();seek(t);
    }
  };
  window.__verifySelectedCamera=function(times,p){
    const results=[];
    for(const t of times){
      const frame=collect(t,false);
      const metric=evaluateFrame(frame,p,true);
      results.push(metric?{...metric,passed:true}:{t,passed:false,...lastRejection});
    }
    camera.fov=baseFov;camera.updateProjectionMatrix();seek(times[times.length-1]);
    return results;
  };
  window.__verifyCameraJoin=function(p){
    const samples=[2.6,2.8,5,7,9.5,10].map(t=>{
      const frame=collect(t,false),result=pose(frame,p);
      return {t,positionDifference:result.position.distanceTo(V(frame.oldCamera)),
        targetDifference:result.target.distanceTo(V(frame.oldTarget)),fovDifference:Math.abs(result.fov-baseFov)};
    });
    const epsilon=1/960,left=collect(2.6-epsilon,false),right=collect(2.6+epsilon,false);
    const candidateVelocity=pose(right,p).position.sub(pose(left,p).position).divideScalar(2*epsilon);
    const sourceVelocity=V(right.oldCamera).sub(V(left.oldCamera)).divideScalar(2*epsilon);
    camera.fov=baseFov;camera.updateProjectionMatrix();seek(0);
    return {samples,epsilon,finiteDifferenceVelocityMismatchMps:candidateVelocity.distanceTo(sourceVelocity)};
  };
  
window.__refinedPose=function(t,p){
  t=clipTime(t);
  camera.fov=baseFov;camera.updateProjectionMatrix();seek(t,false);
  const proposed=pose({t,position:[...state.position],oldCamera:[...state.camera],
    oldTarget:[...state.lookAt],allGiants:[{origin:invasion.rigs[0].group.position.toArray()}]},p);
  return {position:proposed.position.toArray(),target:proposed.target.toArray(),fov:proposed.fov};
};
window.__captureRefinedProxy=function(t,p,palette){
  t=clipTime(t);
    const oldMarker=nape.visible,saved=new Map();
    const setColor=(material,value)=>{
      if(!material?.color||!Number.isInteger(value))throw Error('Invalid color-cue target');
      if(!saved.has(material))saved.set(material,material.color.clone());
      material.color.setHex(value);
    };
    try{
      camera.fov=baseFov;camera.updateProjectionMatrix();nape.visible=false;
      const before=JSON.stringify(validationSnapshot(t));
      const frame={
        t,position:[...state.position],oldCamera:[...state.camera],oldTarget:[...state.lookAt],
        allGiants:[{origin:invasion.rigs[0].group.position.toArray()}],
      };
      const proposed=pose(frame,p);
      const kinds=Object.keys(invasion.ruinSources);
      if(kinds.length!==invasion.staticMeshes.length)throw Error('Ruin material mapping changed');
      kinds.forEach((kind,index)=>{
        if(!(kind in palette.ruins))throw Error('Unknown ruin material category');
        setColor(invasion.staticMeshes[index].material,palette.ruins[kind]);
      });
      const ids=['main-colossal','background-colossal-left','background-colossal-right'];
      if(invasion.rigs.length!==3||invasion.rigs.some((rig,i)=>
        rig.config.id!==ids[i]||rig.config.shape!=='main'||rig.config.height!==60))
        throw Error('Expected exactly three 60m Colossals');
      invasion.rigs.forEach(rig=>setColor(rig.skin.material,palette.main));
      setColor(jacketMaterial,palette.jacket);setColor(limbMaterial,palette.limbs);
      setColor(capeMaterial,palette.cape);setColor(gearMaterial,palette.gear);
      setColor(bladeMaterial,palette.blade);setColor(ground.material,palette.ground);
      camera.position.copy(proposed.position);camera.up.copy(UP);camera.fov=proposed.fov;
      camera.updateProjectionMatrix();camera.lookAt(proposed.target);camera.updateMatrixWorld(true);
      renderer.render(scene,camera);
      const png=document.querySelector('canvas').toDataURL('image/png').split(',')[1];
      const appliedCamera={position:proposed.position.toArray(),target:proposed.target.toArray(),fov:proposed.fov};
      const originalCamera={position:frame.oldCamera,target:frame.oldTarget,fov:baseFov};
      for(const [material,color] of saved)material.color.copy(color);
      camera.fov=baseFov;camera.updateProjectionMatrix();
      const after=JSON.stringify(validationSnapshot(t));
      if(before!==after)throw Error('Combined candidate changed original numerical scene state');
      return {t,png,sourceSnapshot:before,numericSourceStateRestored:true,
        appliedCamera,originalCamera,changedMaterials:saved.size,markerVisibleDuringCapture:false};
    }finally{
      for(const [material,color] of saved)material.color.copy(color);
      nape.visible=oldMarker;camera.fov=baseFov;camera.updateProjectionMatrix();seek(t,false);
    }
  };
})();

const stagingSettings=await(await fetch('./refined-settings.json')).json();
function applyRefined(t){
  t=clipTime(t);
  const applied=window.__refinedPose(t,stagingSettings.params);
  camera.position.fromArray(applied.position);camera.up.copy(UP);camera.fov=applied.fov;
  camera.updateProjectionMatrix();camera.lookAt(V(applied.target));camera.updateMatrixWorld(true);
  nape.visible=false;
  return applied;
}
function installPalette(){
  const palette=stagingSettings.palette;
  Object.keys(invasion.ruinSources).forEach((kind,i)=>invasion.staticMeshes[i].material.color.setHex(palette.ruins[kind]));
  let ordinary=0;
  invasion.rigs.forEach(rig=>rig.skin.material.color.setHex(
    rig.config.shape==='main'?palette.main:palette.ordinary[ordinary++]));
  for(const [mat,key] of [[jacketMaterial,'jacket'],[limbMaterial,'limbs'],[capeMaterial,'cape'],
    [gearMaterial,'gear'],[bladeMaterial,'blade'],[ground.material,'ground']])mat.color.setHex(palette[key]);
}
function actualBounds(rig){
  const attribute=rig.skin.geometry.getAttribute('position'),bounds=new THREE.Box3(),p=new THREE.Vector3();
  let radius=0;
  for(let i=0;i<attribute.count;i++){
    p.fromBufferAttribute(attribute,i);rig.skin.applyBoneTransform(i,p);rig.skin.localToWorld(p);
    bounds.expandByPoint(p);
    radius=Math.max(radius,Math.hypot(p.x-rig.group.position.x,p.z-rig.group.position.z));
  }
  return {bounds,radius,vertices:attribute.count};
}
function boxDistance(a,b){
  return Math.hypot(...['x','y','z'].map(axis=>Math.max(0,a.min[axis]-b.max[axis],b.min[axis]-a.max[axis])));
}
function primarySnapshot(t){
  t=clipTime(t);
  const raw=validationSnapshot(t),actualCamera=applyRefined(t),main=invasion.rigs[0];
  const {giantMatrices,giantCaps,skinWitnesses,...common}=raw;
  const objects=[soldier,...heroSolids,cape,rope,hook,shank,roofCableGroup,...roofRods,...roofJoints,roofHook,roofShank,...jets];
  return {...common,actualCamera,
    actualCameraMatrix:camera.matrixWorld.toArray(),actualProjection:camera.projectionMatrix.toArray(),
    mainMatrices:giantMatrices[0],mainCaps:giantCaps[0],mainSkinWitnesses:skinWitnesses[0],
    mainConfig:main.config,mainFeet:main.feet,mainGroup:main.group.matrixWorld.toArray(),
    mainBones:main.bones.map(b=>({position:b.position.toArray(),quaternion:b.quaternion.toArray(),scale:b.scale.toArray()})),
    mainAnchorSkinBinding:invasion.anchorSkinEvidence,
    geometryObjects:objects.map(o=>{
      let effectiveVisible=true;
      for(let ancestor=o;ancestor;ancestor=ancestor.parent)effectiveVisible&&=ancestor.visible;
      return {matrix:o.matrixWorld.toArray(),visible:o.visible,effectiveVisible,
        label:o===rope?'primary-cable':o===hook?'primary-hook':o===shank?'primary-shank':
          o===roofCableGroup?'roof-cable-group':roofRods.includes(o)?'roof-rod-'+roofRods.indexOf(o):
          roofJoints.includes(o)?'roof-joint-'+roofJoints.indexOf(o):o===roofHook?'roof-hook':
          o===roofShank?'roof-shank':jets.includes(o)?'gas-jet-'+jets.indexOf(o):'hero-'+objects.indexOf(o)};
    }),
    bodySegments:state.bodySegments,lookAt:state.lookAt,roofState:state.roofState,
    tensionN:state.tensionN,reelRateMps:state.reelRateMps,gasAcceleration:state.gasAcceleration,
    roofSlackM:state.roofSlackM,roofRenderedLengthM:state.roofRenderedLengthM,
    steam:invasion.diagnostics().steamParticles,
  };
}
function measureStaging(t){
  t=clipTime(t);
  const appliedCamera=applyRefined(t),posed=invasion.rigs.map(actualBounds),heroBounds=new THREE.Box3();
  for(const object of [...heroSolids,cape]){
    const attr=object.geometry.getAttribute('position'),p=new THREE.Vector3();
    for(let i=0;i<attr.count;i++){
      p.fromBufferAttribute(attr,i).applyMatrix4(object.matrixWorld);heroBounds.expandByPoint(p);
    }
  }
  const path=t>=LAUNCH&&t<7?[V(state.outlet),hookPosition(t)]:
    t>=data.roofExit.hookLaunch?state.roofCablePoints.map(V):[];
  const actors=invasion.rigs.map((rig,i)=>{
    const {bounds,radius,vertices}=posed[i],center=bounds.getCenter(new THREE.Vector3()),half=bounds.getSize(new THREE.Vector3()).multiplyScalar(.5);
    let ruinDistance=Infinity,ruinWitness=null,overlappingRuinBoxes=0;
    for(let j=0;j<invasion.colliders.length;j++){
      const c=invasion.colliders[j],box=new THREE.Box3(V(c.min),V(c.max)),d=boxDistance(bounds,box);
      if(d===0)overlappingRuinBoxes++;
      if(d<ruinDistance){ruinDistance=d;ruinWitness={piece:j,owner:c.owner,kind:c.kind,min:c.min,max:c.max};}
    }
    let cableDistance=Infinity;
    for(let j=0;j<path.length-1;j++)cableDistance=Math.min(cableDistance,segmentBoxDistance(path[j],path[j+1],center,half)-.022);
    const footBounds=rig.soleIndices.map(indices=>{
      const attribute=rig.skin.geometry.getAttribute('position'),b=new THREE.Box3();
      for(const index of indices){
        const p=new THREE.Vector3().fromBufferAttribute(attribute,index);
        rig.skin.applyBoneTransform(index,p);rig.skin.localToWorld(p);b.expandByPoint(p);
      }
      return {min:b.min.toArray(),max:b.max.toArray()};
    });
    return {id:rig.config.id,origin:rig.group.position.toArray(),heightM:rig.config.height,
      role:rig.config.id==='main-colossal'?'primary':'background',
      bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()},horizontalRadius:radius,actualVertices:vertices,
      ruinAabbDistanceM:ruinDistance,ruinWitness,overlappingRuinBoxes,
      heroIncludingBladesAndCapeAabbDistanceM:boxDistance(bounds,heroBounds),
      cameraToBodyAabbClearanceM:bounds.distanceToPoint(V(appliedCamera.position))-.75,
      activeCableToBodyAabbClearanceM:Number.isFinite(cableDistance)?cableDistance:null,
      projectedHead:projected(rig.group.position.clone().add(V([0,55,0]))),
      feet:rig.feet,footBounds,anchorVertexCount:rig.anchorVertices.length,
      scale:rig.group.scale.toArray(),quaternion:rig.group.quaternion.toArray()};
  });
  const pairs=[];
  for(let i=0;i<actors.length;i++)for(let j=i+1;j<actors.length;j++)
    pairs.push({ids:[actors[i].id,actors[j].id],wholeBodyAabbDistanceM:boxDistance(posed[i].bounds,posed[j].bounds)});
  return {t,appliedCamera,actors,pairs,heroBounds:{min:heroBounds.min.toArray(),max:heroBounds.max.toArray()},
    activeCableSegments:path.length?path.length-1:0};
}
function visibilityMask(){
  const hero=new Set([...heroSolids,cape]),targets=invasion.rigs.map(r=>r.skin);
  const colors=[0xff0000,0x00ff00,0x0000ff],objects=[],materials=new Map();
  scene.traverse(o=>{if(o.isMesh||o.isLine||o.isPoints||o.isSprite)objects.push({o,visible:o.visible,material:o.material});});
  const oldBackground=scene.background,oldFog=scene.fog,oldShadow=renderer.shadowMap.enabled;
  const oldClear=renderer.getClearColor(new THREE.Color()),oldAlpha=renderer.getClearAlpha();
  const countPixels=()=>{
    const pixels=new Uint8Array(1280*720*4),counts=[0,0,0,0];
    gl.readPixels(0,0,1280,720,gl.RGBA,gl.UNSIGNED_BYTE,pixels);
    for(let i=0;i<pixels.length;i+=4){
      const r=pixels[i]>200,g=pixels[i+1]>200,b=pixels[i+2]>200;
      if(r&&g&&b)counts[3]++;
      else if(r&&!g&&!b)counts[0]++;
      else if(!r&&g&&!b)counts[1]++;
      else if(!r&&!g&&b)counts[2]++;
    }
    return counts;
  };
  let visible,isolated,mask;
  try{
    scene.background=null;scene.fog=null;renderer.setClearColor(0x000000,1);renderer.shadowMap.enabled=false;
    for(const item of objects){
      const mats=Array.isArray(item.material)?item.material:[item.material];
      item.o.visible=item.visible&&item.o.isMesh&&!mats.some(m=>m.transparent||m.opacity<1);
      if(!item.o.isMesh)continue;
      const index=targets.indexOf(item.o),color=index>=0?colors[index]:hero.has(item.o)?0xffffff:0x000000;
      const replacement=original=>{
        const key=color+':'+original.side;
        if(!materials.has(key))materials.set(key,new THREE.MeshBasicMaterial({color,side:original.side,toneMapped:false,fog:false}));
        return materials.get(key);
      };
      item.o.material=Array.isArray(item.material)?mats.map(replacement):replacement(item.material);
    }
    renderer.render(scene,camera);visible=countPixels();
    mask=document.querySelector('canvas').toDataURL('image/png').split(',')[1];
    for(const item of objects)if(!hero.has(item.o))item.o.visible=false;
    renderer.render(scene,camera);isolated=countPixels()[3];
  }finally{
    for(const item of objects){item.o.visible=item.visible;item.o.material=item.material;}
    scene.background=oldBackground;scene.fog=oldFog;renderer.setClearColor(oldClear,oldAlpha);
    renderer.shadowMap.enabled=oldShadow;for(const material of materials.values())material.dispose();
  }
  return {png:mask,actorVisiblePixels:targets.map((_,i)=>({id:invasion.rigs[i].config.id,pixels:visible[i]})),
    soldierVisiblePixels:visible[3],soldierIsolatedPixels:isolated,
    soldierOpaqueVisibleFraction:isolated?visible[3]/isolated:null,
    method:'Depth-tested opaque geometry ID pass at applied refined camera; transparent steam/gas omitted, no proxy-camera replacement.'};
}
installPalette();nape.visible=false;
window.__staging={
  primarySnapshot,measure:measureStaging,
  roleEvidence(t=3.5){
    t=clipTime(t);
    applyRefined(t);
    const main=invasion.rigs[0];
    return invasion.rigs.map(rig=>{
      const sameArray=(a,b)=>a.length===b.length&&a.every((value,i)=>value===b[i]);
      const attributes=['position','skinIndex','skinWeight'];
      const angle=(t/rig.config.period+rig.config.phase)*Math.PI*2;
      const unguarded=.24*Math.sin(angle+Math.PI),bone=rig.bones[rig.armIndices[1][0]];
      return {id:rig.config.id,heightM:rig.config.height,scale:rig.group.scale.toArray(),
        anatomyAttributesMatchMain:attributes.every(name=>sameArray(
          main.skin.geometry.getAttribute(name).array,rig.skin.geometry.getAttribute(name).array)),
        indicesMatchMain:sameArray(main.skin.geometry.index.array,rig.skin.geometry.index.array),
        anchorVertexCount:rig.anchorVertices.length,
        rightArmActualQuaternion:bone.quaternion.toArray(),
        rightArmUnguardedQuaternion:new THREE.Quaternion().setFromAxisAngle(V([1,0,0]),unguarded).toArray(),
        primary:rig.config.id==='main-colossal'};
    });
  },
  capture(t,withMask=true){
    t=clipTime(t);
    const result=window.__captureRefinedProxy(t,stagingSettings.params,stagingSettings.palette);
    applyRefined(t);
    const mask=withMask?visibilityMask():null;
    return {...result,mask};
  },
  topdown(t=0){
    t=clipTime(t);
    applyRefined(t);installPalette();
    const top=new THREE.OrthographicCamera(-175,175,175,-175,.1,600);
    top.position.set(0,300,0);top.up.set(0,0,-1);top.lookAt(0,0,0);top.updateMatrixWorld(true);
    renderer.setSize(1280,1280);renderer.render(scene,top);
    const png=document.querySelector('canvas').toDataURL('image/png').split(',')[1];
    renderer.setSize(1280,720);applyRefined(t);renderer.render(scene,camera);
    return png;
  },
};
window.reconstruction.seek=(t,draw=true)=>{
  applyRefined(t);if(draw)renderer.render(scene,camera);
};
window.reconstruction.seek(0);

window.__productionRaw=function(t){
  t=clipTime(t);
  const primary=window.__staging.primarySnapshot(t),full=validationSnapshot(t);
  const applied=applyRefined(t),objects=[];
  scene.traverse(object=>objects.push({
    type:object.type,name:object.name,visible:object.visible,
    position:object.position.toArray(),quaternion:object.quaternion.toArray(),scale:object.scale.toArray(),
    matrix:object.matrix.toArray(),matrixWorld:object.matrixWorld.toArray(),
  }));
  return {t,primary,full,applied,objects,world:invasion.diagnostics(),state:JSON.parse(JSON.stringify(state))};
};
