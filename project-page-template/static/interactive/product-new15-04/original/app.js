import * as THREE from './vendor/three.module.js';
const scene = new THREE.Scene();
scene.background = new THREE.Color('#c5c1b8');
scene.fog = new THREE.Fog('#c5c1b8', 17, 37);
const renderer = new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});
renderer.setSize(960,544); renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.VSMShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping; renderer.toneMappingExposure=1.13;
const camera=new THREE.PerspectiveCamera(39,960/544,.1,60);
const matte=(c,r=.4,m=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:m});
const shell=matte('#d4d3ca',.31,.32), dark=matte('#20272a',.4,.2), rubber=matte('#25292b',.75), metal=matte('#737f83',.25,.75);
function mesh(g,m,x=0,y=0,z=0){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;scene.add(o);return o;}
function rounded(w,h,d,r,m,x,y,z){
 const s=new THREE.Shape();s.moveTo(-w/2+r,-h/2);s.lineTo(w/2-r,-h/2);s.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);s.lineTo(w/2,h/2-r);s.quadraticCurveTo(w/2,h/2,w/2-r,h/2);s.lineTo(-w/2+r,h/2);s.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);s.lineTo(-w/2,-h/2+r);s.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
 const g=new THREE.ExtrudeGeometry(s,{depth:d-2*r,steps:1,bevelEnabled:true,bevelSegments:5,steps:1,bevelSize:r,bevelThickness:r,curveSegments:16});g.translate(0,0,-d/2+r);return mesh(g,m,x,y,z);
}
function cyl(r,len,m,x,y,z){const o=mesh(new THREE.CylinderGeometry(r,r,len,80),m,x,y,z);o.rotation.x=Math.PI/2;return o;}
mesh(new THREE.PlaneGeometry(200,200),matte('#b4b0a7',.83),0,-.015,0).rotation.x=-Math.PI/2;
for(const x of [-1.06,1.06])for(const z of [-.72,.72])mesh(new THREE.CylinderGeometry(.17,.19,.18,32),rubber,x,.09,z);
rounded(2.85,1.17,2.12,.12,shell,0,.83,0);
rounded(2.68,.98,.09,.045,dark,0,.81,1.105);
rounded(2.73,.11,1.96,.035,metal,0,.29,0);
// Front optical assembly shares the same world-space axis as the beam.
const lx=-.58,ly=.88;
cyl(.49,.16,rubber,lx,ly,1.19);
cyl(.437,.13,metal,lx,ly,1.285);
cyl(.38,.07,dark,lx,ly,1.36);
const glass=new THREE.MeshPhysicalMaterial({color:'#193a4f',metalness:.35,roughness:.12,clearcoat:1,emissive:'#77b9dd',emissiveIntensity:0});
cyl(.322,.022,glass,lx,ly,1.405);
const iris=new THREE.MeshStandardMaterial({color:'#102a3b',roughness:.15,metalness:.4,emissive:'#aac7d4',emissiveIntensity:0});cyl(.245,.023,iris,lx,ly,1.42);
const highlight=mesh(new THREE.TorusGeometry(.27,.009,8,80,1.18),matte('#98bdce',.2,.5),lx,ly,1.433);highlight.rotation.z=.6;
for(let i=0;i<9;i++)rounded(.046,.54,.027,.012,matte('#485053',.6),.24+i*.103,.81,1.164);
// Recessed long side heat-exchanger channels, confined to the housing surface.
for(let i=0;i<12;i++){const o=mesh(new THREE.BoxGeometry(.014,.51,.035),dark,1.548,.82,-.72+i*.112);}
rounded(.63,.027,.36,.02,matte('#a5aca9',.42,.5),.15,1.551,-.28);
mesh(new THREE.CylinderGeometry(.098,.098,.012,40),dark,.15,1.575,-.28);
const led=mesh(new THREE.SphereGeometry(.024,16,8),new THREE.MeshBasicMaterial({color:'#85b9c6'}),.68,1.561,-.28);
scene.add(new THREE.HemisphereLight('#f3f6fa','#747166',2.2));
function area(x,y,z,p,color,size){const l=new THREE.DirectionalLight(color,p);l.position.set(x,y,z);l.castShadow=true;l.shadow.mapSize.set(1024,1024);l.shadow.camera.left=-5;l.shadow.camera.right=5;l.shadow.camera.top=5;l.shadow.camera.bottom=-5;l.shadow.normalBias=.025;l.shadow.bias=-.0002;l.shadow.radius=size;l.shadow.blurSamples=12;scene.add(l);}
area(-3,7,5,2.6,'#fff1dc',5);
const rim=new THREE.DirectionalLight('#d9efff',1.7);rim.position.set(4,4,-5);scene.add(rim);
const beamMaterial=new THREE.ShaderMaterial({
 transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
 uniforms:{amount:{value:0}},
 vertexShader:'varying vec2 vUv; varying vec3 vn; varying vec3 vp; void main(){vUv=uv;vn=normalize(normalMatrix*normal);vec4 p=modelViewMatrix*vec4(position,1.);vp=p.xyz;gl_Position=projectionMatrix*p;}',
 fragmentShader:'uniform float amount; varying vec2 vUv; varying vec3 vn; varying vec3 vp; void main(){float fade=pow(vUv.y,1.7)*(1.-smoothstep(.9,1.,vUv.y));float edge=pow(abs(dot(normalize(vn),normalize(-vp))),.8);gl_FragColor=vec4(.65,.81,1.,amount*.105*fade*edge);}'
});
const beam=mesh(new THREE.CylinderGeometry(.30,.57,2.7,80,1,true),beamMaterial,lx,ly,2.79);beam.rotation.x=-Math.PI/2;beam.castShadow=false;beam.receiveShadow=false;
const lensLight=new THREE.PointLight('#9ad7ff',0,2.8,2);lensLight.position.set(lx,ly,1.52);scene.add(lensLight);
function smooth(a,b,x){const t=THREE.MathUtils.clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);}
function seek(seconds){
 const t=THREE.MathUtils.clamp(seconds,0,124/24),linear=t/(124/24);
 const cameraProgress=.18*linear+.82*linear*linear*(3-2*linear);
 const a=1.75-2.6*cameraProgress,dollyProgress=1-(1-cameraProgress)**2,r=2.9+2.8*dollyProgress;
 camera.position.set(Math.sin(a)*r,2.85-1.25*cameraProgress**1.7,Math.cos(a)*r);
 camera.lookAt(.4*(1-cameraProgress),1.04-.27*cameraProgress,.1);camera.updateMatrixWorld();
 const on=smooth(.4,2.15,t);glass.emissiveIntensity=.85*on;iris.emissiveIntensity=.85*on;beamMaterial.uniforms.amount.value=on;lensLight.intensity=.17*on;
 renderer.render(scene,camera);
}
window.reconstruction={pause(){},seek,getCameraState(){return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};}};
seek(0);
