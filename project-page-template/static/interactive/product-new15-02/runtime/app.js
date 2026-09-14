import * as THREE from './vendor/three.module.js';

const canvas = document.querySelector('#reconstruction-canvas');
const renderer = new THREE.WebGLRenderer({canvas, antialias:true, preserveDrawingBuffer:true});
renderer.setSize(960,544,false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true;
renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace;
renderer.toneMapping=THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure=1.05;
const scene=new THREE.Scene();
scene.background=new THREE.Color('#a5b3b5');
scene.fog=new THREE.Fog('#a5b3b5',17,35);
const camera=new THREE.PerspectiveCamera(35,960/544,.1,60);
const pearl=new THREE.MeshPhysicalMaterial({color:'#eeeae1',roughness:.24,metalness:.08,clearcoat:.45,clearcoatRoughness:.24});
const lining=new THREE.MeshStandardMaterial({color:'#384345',roughness:.44,metalness:.15});
const silver=new THREE.MeshStandardMaterial({color:'#a1a9a7',roughness:.25,metalness:.7});
const dark=new THREE.MeshStandardMaterial({color:'#142023',roughness:.58});
const silicone=new THREE.MeshStandardMaterial({color:'#cccfc7',roughness:.68});

function roundedShape(w,d,r){ window.__bfTrace?.add(22);
 const s=new THREE.Shape();
 s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);
 s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);
 s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);
 s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
 return s;
}
function plate(w,d,h,r,bevel,mat,parent,x,y,z,hole){ window.__bfTrace?.add(30);
 const shape=roundedShape(w,d,r);
 if(hole){const inner=roundedShape(...hole);shape.holes.push(new THREE.Path(inner.getPoints(48).reverse()));}
 const g=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:bevel>0,bevelSegments:8,steps:1,bevelSize:bevel,bevelThickness:bevel,curveSegments:32});
 const positions=g.attributes.position,normals=g.attributes.normal,shared=new Map();
 const key=i=>[positions.getX(i),positions.getY(i),positions.getZ(i)].map(n=>n.toFixed(5)).join(',');
 for(let i=0;i<positions.count;i++){const k=key(i),n=shared.get(k)||new THREE.Vector3();n.add(new THREE.Vector3().fromBufferAttribute(normals,i));shared.set(k,n);}
 for(let i=0;i<positions.count;i++){const n=shared.get(key(i)).clone().normalize();normals.setXYZ(i,n.x,n.y,n.z);}
 g.rotateX(-Math.PI/2);
 const m=new THREE.Mesh(g,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function ellipsoid(x,y,z,sx,sy,sz,mat,parent=scene){ window.__bfTrace?.add(41);
 const m=new THREE.Mesh(new THREE.SphereGeometry(1,48,32),mat);m.position.set(x,y,z);m.scale.set(sx,sy,sz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
function cylinder(radius,length,mat,parent,x,y,z){ window.__bfTrace?.add(44);
 const m=new THREE.Mesh(new THREE.CylinderGeometry(radius,radius,length,48),mat);
 m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
}
const product=new THREE.Group();product.position.y=-.08;scene.add(product);
plate(2.66,1.62,.62,.56,.14,pearl,product,0,.22,0);
plate(2.64,1.62,.12,.56,.045,pearl,product,0,.87,0,[2.36,1.34,.44]);
plate(2.38,1.36,.06,.45,.02,lining,product,0,.93,0);
plate(1.82,.86,.045,.36,.025,dark,product,0,.12,0);
for(const x of [-.63,.63]){
 ellipsoid(x,1.015,.04,.43,.03,.57,dark,product);
 ellipsoid(x,1.02,-.17,.375,.035,.36,silver,product);
 const bud=new THREE.Group();product.add(bud);
 ellipsoid(x,1.105,-.17,.32,.205,.315,pearl,bud);
 plate(.255,.60,.115,.126,.045,pearl,bud,x,1.035,.225);
 ellipsoid(x+(x<0?-.20:.20),1.08,-.255,.14,.13,.14,silicone,bud);
 ellipsoid(x,1.298,-.19,.11,.008,.026,dark,bud);
 ellipsoid(x,1.195,.37,.025,.009,.039,dark,bud);
}
// The whole lid rotates around the physical rear hinge axis.
const lid=new THREE.Group();lid.position.set(0,1.02,-.77);product.add(lid);
plate(2.69,1.66,.26,.58,.045,pearl,lid,0,.055,.77,[2.38,1.35,.44]);
plate(2.65,1.62,.06,.56,.065,pearl,lid,0,.33,.77);
const lidLining=new THREE.MeshStandardMaterial({color:'#a8b2ae',roughness:.62,metalness:.04});
plate(2.30,1.27,.012,.42,.015,lidLining,lid,0,.245,.77);
for(const x of [-.48,.48]){
 const hinge=cylinder(.092,.50,silver,product,x,1.02,-.77);hinge.rotation.z=Math.PI/2;
}
const notch=ellipsoid(0,.97,.829,.22,.026,.025,dark,product);
const led=new THREE.Mesh(new THREE.SphereGeometry(.026,24,16),new THREE.MeshStandardMaterial({color:'#b7e4ce',emissive:'#5cad87',emissiveIntensity:.6,roughness:.35}));led.position.set(0,.63,.908);product.add(led);
const floor=new THREE.Mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#879b9d',roughness:.83}));floor.rotation.x=-Math.PI/2;floor.receiveShadow=true;scene.add(floor);
scene.add(new THREE.HemisphereLight('#f3f6ff','#566461',1.5));
function light(color,intensity,x,y,z,size){ window.__bfTrace?.add(76);
 const l=new THREE.DirectionalLight(color,intensity);l.position.set(x,y,z);l.castShadow=z>0;l.shadow.mapSize.set(1024,1024);l.shadow.camera.left=-5;l.shadow.camera.right=5;l.shadow.camera.top=5;l.shadow.camera.bottom=-5;l.shadow.normalBias=.015;l.shadow.bias=-.00015;l.shadow.radius=size;scene.add(l);
}
light('#fff0d8',2.6,-5,6,3,4);
light('#dce9ff',1.2,5,4,-3,3);
const smooth=(a,b,t)=>{const v=THREE.MathUtils.clamp((t-a)/(b-a),0,1);return v*v*(3-2*v);};
function seek(seconds){ window.__bfTrace?.add(82);
 const t=THREE.MathUtils.clamp(Number(seconds)||0,0,124/24);
 const u=t/(124/24);
 const cameraProgress=u*u*(3-2*u);
 const angle=THREE.MathUtils.degToRad(-105+170*cameraProgress);
 const cameraDolly=smooth(.05,.62,u);
 const radius=3.1+2.3*cameraDolly;
 camera.position.set(radius*Math.sin(angle),1.65+3.9*cameraProgress,radius*Math.cos(angle));
 camera.lookAt(0,.85+.52*smooth(.13,.40,u),0);
 lid.rotation.x=-1.82*smooth(.70,2.85,t);
 renderer.render(scene,camera);
}
window.reconstruction={pause(){},seek,getCameraState(){return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};}};
seek(0);

// Capture and sampling adapter; product geometry and animation are unchanged.
const __productRender = renderer.render.bind(renderer);
renderer.render = (s, c) => { if (!window.__bfSampling) return __productRender(s, c); };
window.__bfCapture = { THREE: THREE, renderer: renderer, scene: scene, camera: camera };
