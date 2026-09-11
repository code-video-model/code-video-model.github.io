import * as THREE from './vendor/three.module.js';

const data = await (await fetch('../simulation/series.json')).json();
const rows = data.rows;
const canvas = document.querySelector('#proxy');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true});
renderer.setSize(1920,1080);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#d9dfdd');
const camera = new THREE.PerspectiveCamera(35,16/9,0.1,60);
camera.position.set(.9,2.8,8.6);
camera.lookAt(-.45,.9,0);
scene.add(new THREE.HemisphereLight(0xe9f3ff,0x655646,2.4));
const light = new THREE.DirectionalLight(0xfff4df,3.5);
light.position.set(-3,7,5);light.castShadow=true;
light.shadow.mapSize.set(2048,2048);
Object.assign(light.shadow.camera,{left:-6,right:6,top:5,bottom:-5});
light.shadow.normalBias=.025;scene.add(light);
const mat = (color,roughness=.6,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const black=mat('#202728'), copper=mat('#b56324',.3,.72), red=mat('#bc2925',.38),
 blue=mat('#234879',.35), ivory=mat('#f4efd9'), skin=mat('#b77858',.82), steel=mat('#aeb5b6',.3,.8);
function box(w,h,d,m,x,y,z,parent=scene) {
 const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);
 o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;
}
function ball(x,y,z,sx,sy,sz,m,parent=scene) {
 const o=new THREE.Mesh(new THREE.SphereGeometry(1,24,16),m);
 o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;parent.add(o);return o;
}
function tube(points,r,m,parent=scene,segments=100) {
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
 const o=new THREE.Mesh(new THREE.TubeGeometry(curve,segments,r,10,false),m);
 o.castShadow=true;parent.add(o);return o;
}
function textPlane(text,w,h,x,y,z,parent=scene,size=120,color='#222724') {
 const c=document.createElement('canvas');c.width=1024;c.height=256;
 const ctx=c.getContext('2d');ctx.clearRect(0,0,1024,256);
 ctx.fillStyle=color;ctx.font='600 190px Arial';ctx.textAlign='center';
 ctx.textBaseline='middle';
 const textWidth=ctx.measureText(text).width;
 ctx.translate(512,128);ctx.scale(870/textWidth,1);ctx.fillText(text,0,0);
 const texture=new THREE.CanvasTexture(c);texture.colorSpace=THREE.SRGBColorSpace;
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false}));
 mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
// All textures are locally authored graphics, never the appearance photo.
const woodCanvas=document.createElement('canvas');woodCanvas.width=1024;woodCanvas.height=1024;
const wood=woodCanvas.getContext('2d');wood.fillStyle='#90714e';wood.fillRect(0,0,1024,1024);
for(let j=0;j<650;j++){
 const y=j*1.7;
 wood.strokeStyle=`rgba(51,27,9,${.035+(j%5)*.01})`;wood.lineWidth=.6+(j%3)*.4;
 wood.beginPath();wood.moveTo(0,y);
 for(let x=0;x<=1024;x+=12)wood.lineTo(x,y+1.8*Math.sin(x*.021+j*.9));
 wood.stroke();
}
const woodTexture=new THREE.CanvasTexture(woodCanvas);woodTexture.colorSpace=THREE.SRGBColorSpace;
woodTexture.wrapS=woodTexture.wrapT=THREE.RepeatWrapping;woodTexture.repeat.set(3,2);
box(15,.22,7,new THREE.MeshStandardMaterial({map:woodTexture,roughness:.77}),0,-.13,0);
box(15,4,.1,mat('#c4cec9'),0,2,-3.2);
box(7,2.0,.09,mat('#f0f1e8'),0,2.55,-3.08);
box(7,.055,.1,steel,0,1.55,-3.0);

// Horizontal rigid coil with a genuinely open bore and a collinear magnet.
const coilX=-.7, coilY=1.0;
box(1.27,.16,1.16,black,coilX,.09,0);
for(const x of [-1.11,-.29])box(.19,.50,.85,black,x,.40,0);
for(const x of [-1.18,-.22]){
 const ring=new THREE.Mesh(new THREE.TorusGeometry(.43,.073,18,80),black);
 ring.rotation.y=Math.PI/2;ring.position.set(x,coilY,0);ring.castShadow=true;scene.add(ring);
}
const helix=[];
for(let j=0;j<=3200;j++){
 const u=j/3200, a=-u*Math.PI*2*48;
 helix.push(new THREE.Vector3(-1.14+.88*u,coilY+.405*Math.cos(a),.405*Math.sin(a)));
}
const winding=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(helix),3200,.014,7,false),copper);
winding.castShadow=true;scene.add(winding);
const terminals=[[-1.02,.22,.51],[-.4,.22,.51]];
for(const [x,y,z] of terminals)ball(x,y,z,.052,.052,.052,steel);
tube([[-1.14,1.405,0],[-1.22,.68,.12],[-1.13,.32,.38],terminals[0]],.014,copper);
tube([[-.26,1.405,0],[-.18,.62,.12],[-.28,.30,.38],terminals[1]],.014,copper);

// Full center-zero meter face: pointer's only animated input is simulated theta.
const meter=new THREE.Group();meter.position.set(1.75,0,.05);scene.add(meter);
box(2.15,1.98,.5,black,0,1.07,0,meter);
box(1.93,1.35,.035,ivory,0,1.30,.269,meter);
const dial=new THREE.Group();dial.position.set(0,.84,.30);meter.add(dial);
const radius=.91, fullAngle=0.70;
for(let n=-50;n<=50;n+=2){
 const a=n/50*fullAngle, len=n%10===0?.115:.06;
 tube([[Math.sin(a)*(radius-len),Math.cos(a)*(radius-len),0],
       [Math.sin(a)*radius,Math.cos(a)*radius,0]],n===0?.008:.004,black,dial,1);
 if(n%10===0)textPlane(n===0?'0':String(n),.15,.095,Math.sin(a)*(radius+.135),Math.cos(a)*(radius+.135),.012,dial,104);
}
textPlane('µA',.38,.16,0,.48,.006,dial,115);
textPlane('CENTER ZERO',.9,.10,0,.26,.008,dial,75);
const pointer=new THREE.Group();dial.add(pointer);
const needleShape=new THREE.Shape();needleShape.moveTo(-.014,-.10);needleShape.lineTo(.012,-.10);
needleShape.lineTo(.003,.86);needleShape.lineTo(-.003,.86);needleShape.closePath();
const needle=new THREE.Mesh(new THREE.ShapeGeometry(needleShape),new THREE.MeshBasicMaterial({color:'#161a18',side:THREE.DoubleSide}));
needle.position.z=.035;pointer.add(needle);ball(0,0,.04,.048,.048,.022,black,dial);
textPlane('GALVANOMETER',1.6,.10,0,.58,.277,meter,100,'#c5ceca');
const meterBlack=[1.13,.36,.39],meterRed=[2.29,.36,.39];
for(const [p,m] of [[meterBlack,black],[meterRed,red]])ball(...p,.095,.095,.065,m);
tube([terminals[0],[-1.08,.12,.80],[-.68,.065,1.42],[.25,.065,1.6],[.83,.075,1.0],meterBlack],.028,black);
tube([terminals[1],[-.29,.10,.77],[.1,.068,1.04],[1.32,.064,1.26],[2.20,.09,.86],meterRed],.028,red);

// Sliding clamp and hand travel with the magnet: red N tail, blue S leading pole.
const moving=new THREE.Group();scene.add(moving);
box(.75,.27,.29,red,-.375,coilY,0,moving);
box(.75,.27,.29,blue,.375,coilY,0,moving);
textPlane('N',.2,.15,-.41,coilY,.150,moving,165,'#f2e9d9');
textPlane('S',.2,.15,.44,coilY,.150,moving,165,'#f2e9d9');
box(.18,.47,.43,black,-.68,coilY,0,moving);
box(.22,.67,.24,steel,-.68,.53,0,moving);
box(.56,.11,.58,black,-.68,.21,0,moving);
// A fixed linear support holds the clamp at constant height throughout insertion.
box(2.5,.09,.10,steel,-2.20,.14,.20);
box(2.5,.09,.10,steel,-2.20,.14,-.20);
// Rigid anatomical proxy: all coordinates are assembly-local, never time driven.
moving.name='magnet-hand-rigid-assembly';
const hand=new THREE.Group();hand.name='hand-rig';moving.add(hand);
const jointSkin=mat('#a9694f',.86), nailMaterial=mat('#d5aa91',.7);
const sleeveMaterial=mat('#647d8b'), cuffMaterial=mat('#506876');
function namedBall(name,p,r,m,parent,scale=[1,1,1]){
 const mesh=ball(...p,r*scale[0],r*scale[1],r*scale[2],m,parent);
 mesh.name=name;return mesh;
}
function taperedSegment(name,a,b,ra,rb,m,parent){
 const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b);
 const direction=end.clone().sub(start);
 const mesh=new THREE.Mesh(new THREE.CylinderGeometry(rb,ra,direction.length(),24,1),m);
 mesh.position.copy(start).add(end).multiplyScalar(.5);
 mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
 mesh.name=name;mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);
 mesh.userData.endpoints=[a,b];mesh.userData.radii=[ra,rb];
 return mesh;
}
function palmBody(){
 // Elliptical cross-sections create a broad metacarpal body and narrow wrist.
 const rings=[[-1.71,1.65,.135,.125],[-1.48,1.65,.19,.15],
              [-1.27,1.65,.30,.16],[-1.095,1.65,.275,.145]];
 const positions=[],indices=[],n=32;
 for(const [x,y,ry,rz] of rings)for(let j=0;j<n;j++){
  const a=2*Math.PI*j/n;positions.push(x,y+ry*Math.cos(a),rz*Math.sin(a));
 }
 for(let k=0;k<rings.length-1;k++)for(let j=0;j<n;j++){
  const a=k*n+j,b=k*n+(j+1)%n,c=b+n,d=a+n;
  indices.push(a,b,c,a,c,d);
 }
 for(const [ring,flip] of [[0,true],[rings.length-1,false]]){
  const center=positions.length/3;positions.push(rings[ring][0],rings[ring][1],0);
  for(let j=0;j<n;j++){
   const a=ring*n+j,b=ring*n+(j+1)%n;
   indices.push(center,flip?b:a,flip?a:b);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setIndex(indices);geometry.computeVertexNormals();
 const mesh=new THREE.Mesh(geometry,skin);mesh.name='palm-metacarpal-body';
 mesh.castShadow=true;mesh.receiveShadow=true;hand.add(mesh);
}
taperedSegment('continuous-sleeved-forearm',[-7.8,1.65,0],[-1.95,1.65,0],.265,.18,sleeveMaterial,hand);
taperedSegment('sleeve-cuff',[-2.04,1.65,0],[-1.91,1.65,0],.188,.184,cuffMaterial,hand);
taperedSegment('exposed-forearm',[-2.00,1.65,0],[-1.58,1.65,0],.163,.131,skin,hand);
namedBall('tapered-wrist',[-1.66,1.65,0],.14,skin,hand,[1.25,1, .94]);
palmBody();
const handle=new THREE.Group();handle.name='vertical-grip-handle';moving.add(handle);
taperedSegment('black-handle',[-.78,1.22,.02],[-.78,2.015,.02],.105,.105,black,handle);
namedBall('handle-top',[-.78,2.015,.02],.105,black,handle,[1,.35,1]);
box(.27,.09,.26,black,-.74,1.22,.02,handle).name='handle-clamp-bridge';
const digits=[];
function digit(name,points,radii){
 const group=new THREE.Group();group.name=name;group.userData.kind='digit';hand.add(group);
 const labels=name==='thumb'?['proximal','distal']:['proximal','middle','distal'];
 const joints=name==='thumb'?['MCP','IP','tip']:['MCP','PIP','DIP','tip'];
 points.forEach((p,i)=>namedBall(`${name}-${joints[i]}`,p,
  radii[i],i===points.length-1?skin:jointSkin,group));
 for(let i=0;i<points.length-1;i++){
  const segment=taperedSegment(`${name}-${labels[i]}-phalanx`,points[i],points[i+1],
   radii[i]*.96,radii[i+1]*.96,skin,group);
  segment.userData.kind='phalanx';
 }
 const tip=new THREE.Vector3(...points.at(-1)),previous=new THREE.Vector3(...points.at(-2));
 const direction=tip.clone().sub(previous).normalize();
 const nail= namedBall(`${name}-nail`,tip.clone().lerp(previous,.30).toArray(),1,
  nailMaterial,group,[radii.at(-1)*.73,.044,.009]);
 // Dorsal nail surface follows the distal segment, offset toward the camera.
 nail.position.z+=radii.at(-1)*.85;
 nail.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction);
 digits.push(group);return group;
}
const fingerSpecs=[
 ['index',1.885,-1.10,.062, .00],
 ['middle',1.715,-1.075,.066,.025],
 ['ring',1.545,-1.095,.061,.012],
 ['little',1.395,-1.15,.052,-.025],
];
for(const [name,y,x,r,reach] of fingerSpecs){
 namedBall(`${name}-metacarpal-pad`,[x-.055,y-.006,.055],r*1.16,
  skin,hand,[1.45,1.08,1.18]);
 digit(name,[[x,y,.11],[-.88+reach,y+.012,.245],
  [-.64+reach,y-.015,.115],[-.785,y-.055,-.135]],
  [r,r*.96,r*.86,r*.77]);
}
const thumb=digit('thumb',[[-1.255,1.98,-.055],[-1.015,2.14,.035],[-.66,2.02,.14]],
 [.090,.075,.064]);
namedBall('thumb-thenar-base',[-1.30,1.85,-.035],.143,skin,thumb,[1.12,1.23,.95])
 .userData.kind='thenar';
function objectBounds(object){
 const bounds=new THREE.Box3().setFromObject(object),pixels=[];
 for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])
 for(const z of [bounds.min.z,bounds.max.z]){
  const p=new THREE.Vector3(x,y,z).project(camera);
  pixels.push([(p.x+1)*960,(1-p.y)*540]);
 }
 return {world:{min:bounds.min.toArray(),max:bounds.max.toArray()},
  screen:{min:[Math.min(...pixels.map(p=>p[0])),Math.min(...pixels.map(p=>p[1]))],
  max:[Math.max(...pixels.map(p=>p[0])),Math.max(...pixels.map(p=>p[1]))]}};
}
function handDiagnostics(){
 scene.updateMatrixWorld(true);
 return {movingParent:moving.name,handParent:hand.parent.name,handleParent:handle.parent.name,
  magnetParent:moving.children[0].parent.name,
  camera:{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),
   projection:camera.projectionMatrix.toArray(),fov:camera.fov,near:camera.near,far:camera.far},
  digits:digits.map(d=>({name:d.name,position:d.position.toArray(),quaternion:d.quaternion.toArray(),
   scale:d.scale.toArray(),phalanges:d.children.filter(o=>o.userData.kind==='phalanx').length,
   thenar:d.children.filter(o=>o.userData.kind==='thenar').length,
   segments:d.children.filter(o=>o.userData.kind==='phalanx').map(o=>({name:o.name,...o.userData})),
   transforms:d.children.map(o=>({name:o.name,position:o.position.toArray(),
    quaternion:o.quaternion.toArray(),scale:o.scale.toArray()})),bounds:objectBounds(d)})),
  palmBounds:objectBounds(hand.getObjectByName('palm-metacarpal-body')),
  sleeveBounds:objectBounds(hand.getObjectByName('continuous-sleeved-forearm')),
  handleBounds:objectBounds(handle),handBounds:objectBounds(hand),meterBounds:objectBounds(meter),
  magnetBounds:objectBounds(moving.children[0]),
  assemblyQuaternion:moving.quaternion.toArray(),assemblyScale:moving.scale.toArray()};
}

function sample(time){
 const t=Math.max(0,Math.min(5,time)), scaled=t*1000;
 const lo=Math.min(rows.length-2,Math.floor(scaled)), f=scaled-lo;
 return rows[lo].map((v,j)=>v+(rows[lo+1][j]-v)*f);
}
let state=sample(0);
function seek(t){
 state=sample(t);
 moving.position.x=-1.55+12*state[1];
 pointer.rotation.z=-state[6];
 renderer.render(scene,camera);
}
window.reconstruction={
 ready:true,pause(){},seek,
 diagnostics(){
 const gl=renderer.getContext(), ext=gl.getExtension('WEBGL_debug_renderer_info');
 return {time:state[0],magnetPositionM:state[1],currentA:state[5],
 pointerAngleRad:state[6],pointerRotationZ:pointer.rotation.z,
 magnetWorldX:moving.position.x,cameraPosition:camera.position.toArray(),
 renderer:ext?gl.getParameter(ext.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
 source:'simulation/series.json',columns:{magnet:1,pointer:6},handRig:handDiagnostics()};
 }
};
seek(0);
