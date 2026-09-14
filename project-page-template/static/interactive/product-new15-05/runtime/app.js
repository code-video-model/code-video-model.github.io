import * as THREE from './vendor/three.module.js';
const canvas=document.querySelector('#reconstruction-canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true});
renderer.setSize(960,544); renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1;
const scene=new THREE.Scene(); scene.background=new THREE.Color('#c5bfb2');
scene.fog=new THREE.Fog('#c5bfb2',12,38);
const studio=new THREE.Scene();studio.background=new THREE.Color('#8e969b');
for(const [x,y,z,w,h,power] of [[-4,5,4,4,7,3],[5,3,-2,3,6,2],[2,6,3,5,3,2]]){
 const card=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(power,power,power)}));card.position.set(x,y,z);card.lookAt(0,1,0);studio.add(card);
}
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(studio,.08).texture;pmrem.dispose();
const camera=new THREE.PerspectiveCamera(36,960/544,.1,500);
const mat=(color,metalness=0,roughness=.5)=>new THREE.MeshStandardMaterial({color,metalness,roughness,envMapIntensity:.45});
const orange=mat('#de7623',.18,.36), dark=mat('#20272a',.05,.55), rubber=mat('#303638',0,.82), steel=mat('#adb6bd',.82,.28), black=mat('#101719',.2,.38);
function mesh(g,m,x=0,y=0,z=0){ window.__bfTrace?.add(18);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;}
function box(w,h,d,m,x,y,z=0){ window.__bfTrace?.add(19);return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);}
function profile(points,depth,m,z=0,bevel=.075){ window.__bfTrace?.add(20);
 const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();
 return mesh(new THREE.ExtrudeGeometry(s,{depth,bevelEnabled:true,bevelSegments:4,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:24}),m,0,0,z-depth/2);
}
function axisCylinder(r1,r2,length,m,x,y,z=0){ window.__bfTrace?.add(24);const o=mesh(new THREE.CylinderGeometry(r1,r2,length,64),m,x,y,z);o.rotation.z=Math.PI/2;return o;}
// Every part is built in assembled coordinates; the product never animates.
profile([[-.78,2.28],[-.85,2.77],[-.59,2.99],[.59,2.97],[.85,2.79],[.85,2.39],[.5,2.22],[-.32,2.22]],.68,orange,0,.11);
profile([[.69,2.3],[.92,2.4],[.98,2.69],[.83,2.9],[.71,2.94]],.63,dark,0,.06);
profile([[-.52,2.44],[-.56,2.73],[-.36,2.87],[.34,2.85],[.46,2.67],[.31,2.42]],.018,orange,.459,.024);
profile([[.25,2.24],[.68,2.23],[.68,1.77],[.85,.6],[.43,.48],[.1,.69],[.23,1.34],[-.06,1.95]],.47,dark);
profile([[.37,1.96],[.59,1.9],[.72,.72],[.43,.64],[.29,.83],[.36,1.34]],.49,rubber,.02,.045);
profile([[-.05,.12],[1.18,.12],[1.29,.28],[1.21,.52],[.91,.64],[.16,.59],[-.07,.39]],.92,dark,0,.07);
box(1.17,.11,.94,black,.61,.14);
box(.8,.12,.94,orange,.65,.47);
box(.22,.15,.06,orange,.08,.34,.50);
axisCylinder(.37,.38,.35,dark,-.88,2.64);
axisCylinder(.30,.37,.38,black,-1.20,2.64);
axisCylinder(.18,.29,.28,steel,-1.51,2.64);
axisCylinder(.095,.14,.17,black,-1.72,2.64);
axisCylinder(.051,.051,.75,steel,-2.14,2.64);
for(let k=0;k<2;k++){
 const points=[];for(let j=0;j<=100;j++){const t=j/100,a=t*Math.PI*6+k*Math.PI;points.push(new THREE.Vector3(-1.86-.64*t,2.64+Math.cos(a)*.049,Math.sin(a)*.049));}
 mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),100,.013,6,false),dark);
}
const tip=mesh(new THREE.ConeGeometry(.052,.15,6),steel,-2.59,2.64);tip.rotation.z=Math.PI/2;
for(let i=0;i<24;i++){const a=i*Math.PI/12;const b=box(.25,.022,.042,dark,-1.18,2.64+Math.cos(a)*.36,Math.sin(a)*.36);b.rotation.x=a;}
profile([[-.32,2.2],[-.06,2.17],[-.02,1.86],[-.19,1.86]],.46,black,0,.035);
box(.23,.12,.78,black,.16,2.28);
for(let i=0;i<7;i++){
 const rib=box(.23,.023,.02,dark,.5+i*.012,1.05+i*.092,.304);rib.rotation.z=.12;
}
box(.65,.065,.018,orange,.67,.32,.535);
for(let i=0;i<4;i++)box(.034,.18,.025,black,.53+i*.063,2.68,.461);
for(const [x,y] of [[-.45,2.88],[.76,2.42],[.53,.83]]){
 const screw=mesh(new THREE.CylinderGeometry(.034,.034,.016,24),steel,x,y,.44);screw.rotation.x=Math.PI/2;
}
const floor=mesh(new THREE.PlaneGeometry(200,200),mat('#c5bfb2',0,.91));floor.rotation.x=-Math.PI/2;floor.position.y=.05;floor.castShadow=false;
scene.add(new THREE.HemisphereLight('#f4f7ff','#625546',2.4));
function area(x,y,z,intensity,color,size){ window.__bfTrace?.add(58);const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);scene.add(l);if(size){l.castShadow=true;l.shadow.mapSize.set(2048,2048);l.shadow.camera.left=-6;l.shadow.camera.right=6;l.shadow.camera.top=6;l.shadow.camera.bottom=-6;l.shadow.normalBias=.025;l.shadow.bias=-.0002;l.shadow.radius=size;}return l;}
area(-3,7,5,2.7,'#fff2dc',5);area(3,4,-4,2,'#e4edff');area(5,2,5,1.4,'#ffffff');
let paused=false,time=0;
function render(t){ window.__bfTrace?.add(61);time=Math.max(0,Math.min(124/24,t));const p=time/(124/24),u=.55*p+.45*p*p*(3-2*p);
 const orbit=1-Math.pow(1-u,1.35),angle=THREE.MathUtils.degToRad(-115+135*orbit),r=2.4+4.3*u,pivot=-1.4+1.05*u;
 camera.fov=40;camera.updateProjectionMatrix();
 camera.position.set(pivot+Math.sin(angle)*r,3.4-2.3*u+.9*Math.sin(Math.PI*u),Math.cos(angle)*r);camera.lookAt(pivot,2.62-1.04*(1-Math.pow(1-u,1.5)),0);camera.updateMatrixWorld();renderer.render(scene,camera);
}
window.reconstruction={pause(){paused=true;},seek(t){render(t);},getCameraState(){return{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};}};
let previous=performance.now();function tick(now){ window.__bfTrace?.add(67);if(!paused)render((time+(now-previous)/1000)%(124/24));previous=now;requestAnimationFrame(tick);}render(0);requestAnimationFrame(tick);

// Capture and sampling adapter; product geometry and animation are unchanged.
const __productRender = renderer.render.bind(renderer);
renderer.render = (s, c) => { if (!window.__bfSampling) return __productRender(s, c); };
window.__bfCapture = { THREE: THREE, renderer: renderer, scene: scene, camera: camera };
