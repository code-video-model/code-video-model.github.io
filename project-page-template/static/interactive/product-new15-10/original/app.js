import * as THREE from './vendor/three.module.js';

const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#reconstruction-canvas'),antialias:true,preserveDrawingBuffer:true});
renderer.setSize(960,544,false);renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();scene.background=new THREE.Color('#c9c5bc');scene.fog=new THREE.Fog('#c9c5bc',12,32);
const camera=new THREE.PerspectiveCamera(38,960/544,.1,70);
const shell=new THREE.MeshPhysicalMaterial({color:'#557773',metalness:.24,roughness:.32,clearcoat:.25});
const bladeMat=new THREE.MeshStandardMaterial({color:'#decfac',metalness:.4,roughness:.30,side:THREE.DoubleSide});
const wire=new THREE.MeshStandardMaterial({color:'#bbc7c3',metalness:.7,roughness:.3});
const trim=new THREE.MeshStandardMaterial({color:'#aca998',metalness:.7,roughness:.29});
const rubber=new THREE.MeshStandardMaterial({color:'#283333',roughness:.82});
const head=new THREE.Group();head.position.y=2.55;scene.add(head);
function mesh(geo,mat,parent,x=0,y=0,z=0){
 if(geo.type==='ExtrudeGeometry'&&!geo.userData.smoothed){
  const positions=geo.attributes.position,normals=geo.attributes.normal,shared=new Map();
  const key=i=>[positions.getX(i),positions.getY(i),positions.getZ(i)].map(n=>n.toFixed(5)).join(',');
  for(let i=0;i<positions.count;i++){const k=key(i),n=shared.get(k)||new THREE.Vector3();n.add(new THREE.Vector3().fromBufferAttribute(normals,i));shared.set(k,n);}
  for(let i=0;i<positions.count;i++){const n=shared.get(key(i)).clone().normalize();normals.setXYZ(i,n.x,n.y,n.z);}
  geo.userData.smoothed=true;
 }
 const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function cyl(r1,r2,h,mat,parent,x,y,z,axis='y'){
 const m=mesh(new THREE.CylinderGeometry(r1,r2,h,80),mat,parent,x,y,z);
 if(axis==='z')m.rotation.x=Math.PI/2;
 if(axis==='x')m.rotation.z=Math.PI/2;
 return m;
}
function torus(radius,tube,mat,parent,z,x=0,y=0){
 return mesh(new THREE.TorusGeometry(radius,tube,12,128),mat,parent,x,y,z);
}
function tube(points,r,mat,parent){
 const curve=new THREE.CatmullRomCurve3(points.map(v=>new THREE.Vector3(...v)));
 return mesh(new THREE.TubeGeometry(curve,32,r,8,false),mat,parent);
}
function ring(outer,inner,depth,mat,parent,z){
 const s=new THREE.Shape();s.absarc(0,0,outer,0,Math.PI*2,false);
 const h=new THREE.Path();h.absarc(0,0,inner,0,Math.PI*2,true);s.holes.push(h);
 const g=new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelThickness:.018,bevelSize:.018,bevelSegments:3,curveSegments:96});
 return mesh(g,mat,parent,0,0,z);
}
ring(1.48,1.39,.48,shell,head,-.24);
torus(1.455,.032,trim,head,.27);
torus(1.455,.027,trim,head,-.27);
// Rear motor and its shaft are rigidly attached to the head.
cyl(.36,.36,.68,shell,head,0,0,-.25,'z');
cyl(.28,.28,.035,rubber,head,0,0,-.606,'z');
for(let i=0;i<12;i++){
 const a=i*Math.PI/6;
 const vent=mesh(new THREE.BoxGeometry(.024,.11,.018),rubber,head,.24*Math.cos(a),.24*Math.sin(a),-.632);vent.rotation.z=a-Math.PI/2;
}
const bladeShape=new THREE.Shape();
bladeShape.moveTo(.22,-.06);
bladeShape.bezierCurveTo(.48,-.20,1.04,-.17,1.25,.22);
bladeShape.bezierCurveTo(1.40,.61,.87,.90,.52,.56);
bladeShape.bezierCurveTo(.30,.39,.22,.23,.22,-.06);
const bladeGeometry=new THREE.ExtrudeGeometry(bladeShape,{depth:.035,bevelEnabled:true,bevelSize:.025,bevelThickness:.015,bevelSegments:4,curveSegments:36});
const bladePositions=bladeGeometry.attributes.position;
for(let i=0;i<bladePositions.count;i++){
 const x=bladePositions.getX(i),y=bladePositions.getY(i);
 bladePositions.setZ(i,bladePositions.getZ(i)+.075*x*x-.05*y);
}
bladeGeometry.computeVertexNormals();
const blades=new THREE.Group();head.add(blades);
for(let i=0;i<5;i++){
 const pivot=new THREE.Group();pivot.rotation.z=i*Math.PI*2/5+.16;blades.add(pivot);
 const b=mesh(bladeGeometry,bladeMat,pivot,0,0,-.045);b.rotation.x=.13;
}
cyl(.32,.34,.23,shell,head,0,0,.10,'z');
const hub=mesh(new THREE.SphereGeometry(1,64,32),shell,head,0,0,.265);hub.scale.set(.325,.325,.125);
torus(.29,.018,trim,head,.315);
// Two curved guard layers, concentric rings and side ties form a physical cage.
function guardDepth(r,front){return (front?1:-1)*(.28+.19*(1-r*r/(1.42*1.42)));}
for(const front of [true,false]){
 const count=front?28:20;
 for(let i=0;i<count;i++){
  const a=i*Math.PI*2/count;
  const pts=[];
  for(let j=0;j<7;j++){const r=.32+(1.42-.32)*j/6;pts.push([r*Math.cos(a),r*Math.sin(a),guardDepth(r,front)]);}
  tube(pts,front?.0115:.010,wire,head);
 }
 for(const r of [.55,.85,1.15])torus(r,.012,wire,head,guardDepth(r,front));
}
for(let i=0;i<16;i++){
 const a=i*Math.PI/8;const x=1.46*Math.cos(a),y=1.46*Math.sin(a);
 tube([[x,y,-.24],[x,y,0],[x,y,.24]],.014,trim,head);
}
const guardBadge=cyl(.24,.24,.055,shell,head,0,0,.478,'z');
torus(.24,.015,trim,head,.51);
torus(.32,.018,wire,head,guardDepth(.32,true));
for(let i=0;i<4;i++){
 const a=i*Math.PI/2,z=guardDepth(.32,true);
 tube([[.23*Math.cos(a),.23*Math.sin(a),z],[.32*Math.cos(a),.32*Math.sin(a),z]],.018,wire,head);
}
const yokeShape=new THREE.Shape();
yokeShape.moveTo(-1.68,2.60);yokeShape.lineTo(-1.68,1.15);yokeShape.quadraticCurveTo(-1.68,.63,-1.05,.63);yokeShape.lineTo(1.05,.63);yokeShape.quadraticCurveTo(1.68,.63,1.68,1.15);yokeShape.lineTo(1.68,2.60);yokeShape.lineTo(1.49,2.60);yokeShape.lineTo(1.49,1.18);yokeShape.quadraticCurveTo(1.49,.83,1.03,.83);yokeShape.lineTo(-1.03,.83);yokeShape.quadraticCurveTo(-1.49,.83,-1.49,1.18);yokeShape.lineTo(-1.49,2.60);yokeShape.closePath();
mesh(new THREE.ExtrudeGeometry(yokeShape,{depth:.19,bevelEnabled:true,bevelSize:.035,bevelThickness:.035,bevelSegments:4,curveSegments:32}),shell,scene,0,0,-.095);
for(const x of [-1.56,1.56]){
 cyl(.15,.15,.30,trim,scene,x,2.55,0,'x');
 cyl(.09,.09,.025,shell,scene,x<0?-1.72:1.72,2.55,0,'x');
}
cyl(.15,.21,.55,shell,scene,0,.47,0);
const base=cyl(1.06,1.14,.18,shell,scene,0,.15,0);base.scale.z=.82;
const foot=cyl(1.075,1.075,.06,rubber,scene,0,.03,0);foot.scale.z=.80;
const baseTrim=torus(1.07,.017,trim,scene,0);baseTrim.rotation.x=Math.PI/2;baseTrim.position.y=.23;baseTrim.scale.y=.82;
cyl(.18,.20,.09,trim,scene,0,.28,.51);
const knob=mesh(new THREE.BoxGeometry(.024,.016,.10),rubber,scene,0,.334,.55);
const floor=mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#b0aa9d',roughness:.85}),scene);
floor.rotation.x=-Math.PI/2;floor.castShadow=false;
scene.add(new THREE.HemisphereLight('#f1f6ff','#666053',2.1));
const key=new THREE.DirectionalLight('#ffefd8',2.8);key.position.set(-4,7,5);key.castShadow=true;key.shadow.mapSize.set(1024,1024);key.shadow.camera.left=-6;key.shadow.camera.right=6;key.shadow.camera.top=6;key.shadow.camera.bottom=-6;key.shadow.normalBias=.02;key.shadow.bias=-.0001;key.shadow.radius=4;scene.add(key);
const fill=new THREE.DirectionalLight('#d9e9ff',2.0);fill.position.set(5,4,-4);scene.add(fill);
function seek(seconds){
 const t=THREE.MathUtils.clamp(Number(seconds)||0,0,124/24),u=t/(124/24);
 const cameraProgress=u*u*(3-2*u);
 const a=THREE.MathUtils.degToRad(12+140*cameraProgress);
 const cameraEase=(start,end)=>{const v=THREE.MathUtils.clamp((u-start)/(end-start),0,1);return v*v*(3-2*v);};
 const radius=3.8+3.5*cameraEase(0,.72);
 camera.position.set(radius*Math.sin(a),2.25+3.55*cameraProgress,radius*Math.cos(a));
 camera.lookAt(0,2.6-.58*cameraEase(.10,.48),0);
 renderer.render(scene,camera);
}
window.reconstruction={pause(){},seek,getCameraState(){return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};}};
seek(0);
