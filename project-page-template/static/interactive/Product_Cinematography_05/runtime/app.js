import * as T from './vendor/three.module.js';
const canvas=document.querySelector('canvas');
const renderer=new T.WebGLRenderer({canvas,antialias:true});
renderer.setSize(960,544);renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;
renderer.outputColorSpace=T.SRGBColorSpace;renderer.toneMapping=T.ACESFilmicToneMapping;renderer.toneMappingExposure=1.03;
const scene=new T.Scene();scene.background=new T.Color('#bab8b4');
scene.fog=new T.Fog('#bab8b4',15,36);
const camera=new T.PerspectiveCamera(40,960/544,.1,80);
const mat=(color,metalness=0,roughness=.4)=>new T.MeshStandardMaterial({color,metalness,roughness});
const shell=mat('#c9d0cf',.55,.31),edge=mat('#545f61',.65,.32),rubber=mat('#20292c',.05,.68),prop=mat('#252d30',.3,.4),metal=mat('#8b9699',.8,.25),glass=mat('#133342',.75,.13);
function mesh(g,m,x=0,y=0,z=0){ window.__bfTrace?.add(12);let o=new T.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o}
function oval(m,x,y,z,sx,sy,sz){ window.__bfTrace?.add(13);const o=mesh(new T.SphereGeometry(1,48,24),m,x,y,z);o.scale.set(sx,sy,sz);return o}
function cyl(m,x,y,z,r,h){ window.__bfTrace?.add(14);return mesh(new T.CylinderGeometry(r,r,h,48),m,x,y,z)}
function bar(a,b,r,m){ window.__bfTrace?.add(15);const d=new T.Vector3().subVectors(b,a),o=mesh(new T.CylinderGeometry(r,r,d.length(),24),m);o.position.copy(a).add(b).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());return o}
const v=(x,y,z)=>new T.Vector3(x,y,z);
mesh(new T.PlaneGeometry(200,200),mat('#b2ada4',.05,.72)).rotation.x=-Math.PI/2;
oval(edge,0,1.05,0,.66,.28,1.18);
oval(shell,0,1.18,0,.65,.3,1.16);
oval(edge,0,1.466,-.12,.35,.025,.65);
oval(shell,0,1.484,-.12,.31,.018,.60);
oval(rubber,0,1.507,.19,.105,.012,.105);
// The four folded joints are fixed at their deployed positions.
for(const sx of [-1,1])for(const sz of [-1,1]){
 const start=v(sx*.46,1.06,sz*.66),end=v(sx*1.65,1.09,sz*1.35);
 const armShape=new T.Shape(),dx=end.x-start.x,dz=end.z-start.z,len=Math.hypot(dx,dz),nx=-dz/len,nz=dx/len;
 armShape.moveTo(start.x+nx*.19,-start.z-nz*.19);
 armShape.lineTo(end.x+nx*.095,-end.z-nz*.095);
 armShape.lineTo(end.x-nx*.095,-end.z+nz*.095);
 armShape.lineTo(start.x-nx*.19,-start.z+nz*.19);armShape.closePath();
 const arm=mesh(new T.ExtrudeGeometry(armShape,{depth:.14,bevelEnabled:true,bevelThickness:.025,bevelSize:.035,bevelSegments:3}),shell,0,1.02,0);arm.rotation.x=-Math.PI/2;
 cyl(edge,start.x,start.y+.045,start.z,.145,.2);
 cyl(rubber,end.x,1.12,end.z,.235,.22);cyl(metal,end.x,1.27,end.z,.2,.12);
 if(sz===1)cyl(mat('#bd7540',.7,.3),end.x,1.295,end.z,.204,.028);
 cyl(edge,end.x,1.36,end.z,.13,.07);
 const rotor=new T.Group();rotor.position.set(end.x,1.385,end.z);rotor.rotation.y=sx*sz*.4;
 scene.add(rotor);
 for(const sign of [-1,1]){
  const shape=new T.Shape();shape.moveTo(sign*.07,-.065);shape.bezierCurveTo(sign*.37,-.18,sign*.79,-.12,sign*.9,.0);shape.bezierCurveTo(sign*.74,.09,sign*.34,.12,sign*.07,.065);
  const blade=new T.Mesh(new T.ExtrudeGeometry(shape,{depth:.025,bevelEnabled:true,bevelThickness:.008,bevelSize:.01,bevelSegments:2,steps:1}),prop);
  blade.rotation.x=-Math.PI/2;blade.castShadow=true;rotor.add(blade);
 }
 cyl(metal,end.x,1.43,end.z,.08,.06);
 bar(v(end.x,1.02,end.z),v(end.x*.92,.1,end.z*.97),.073,edge);
 oval(rubber,end.x*.92,.055,end.z*.97,.14,.055,.25);
}
// Rigid front yoke, pivot axle, and forward-facing optical barrel.
bar(v(-.36,.95,.91),v(-.36,.58,1.04),.065,edge);
bar(v(.36,.95,.91),v(.36,.58,1.04),.065,edge);
bar(v(-.38,.59,1.06),v(.38,.59,1.06),.09,metal);
oval(edge,0,.6,1.15,.3,.235,.25);
let lens=cyl(rubber,0,.6,1.365,.205,.17);lens.rotation.x=Math.PI/2;
lens=cyl(metal,0,.6,1.455,.177,.025);lens.rotation.x=Math.PI/2;
lens=cyl(glass,0,.6,1.472,.148,.018);lens.rotation.x=Math.PI/2;
oval(mat('#668895',.5,.1),-.04,.65,1.486,.045,.022,.007);
for(const sx of [-1,1]){
 oval(rubber,sx*.36,1.18,.98,.09,.065,.035);
 for(let i=0;i<5;i++)oval(edge,sx*.58,1.2,-.38+i*.115,.018,.04,.034);
}
scene.add(new T.HemisphereLight('#f5fcff','#66767e',2.3));
const key=new T.DirectionalLight('#fff5e9',3.2);key.position.set(-3,7,5);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.025;key.shadow.bias=-.0001;key.shadow.radius=3;scene.add(key);
const fill=new T.DirectionalLight('#bfdcff',1.4);fill.position.set(4,4,-4);scene.add(fill);
function seek(time){ window.__bfTrace?.add(63);
 const t=T.MathUtils.clamp(time/(124/24),0,1),u=.5*t+.5*t*t*(3-2*t);
 const angle=-.12+2.88*u,radius=2.65+3.65*(1-Math.pow(1-u,2.6));
 camera.position.set(Math.sin(angle)*radius,1.25+4.2*u,Math.cos(angle)*radius);
 camera.lookAt(0,.72+.15*u,1.0*(1-T.MathUtils.smoothstep(t,0,.45)));camera.updateMatrixWorld();renderer.render(scene,camera);
}
window.reconstruction={pause(){},seek,getCameraState(){return{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov}}};seek(0);

// Capture and sampling adapter; product geometry and animation are unchanged.
const __productRender = renderer.render.bind(renderer);
renderer.render = (s, c) => { if (!window.__bfSampling) return __productRender(s, c); };
window.__bfCapture = { THREE: T, renderer: renderer, scene: scene, camera: camera };
