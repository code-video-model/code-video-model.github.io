import * as THREE from './vendor/three.module.js';
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});
renderer.setSize(960,544);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.02;
const scene=new THREE.Scene();scene.background=new THREE.Color('#869398');scene.fog=new THREE.Fog('#869398',8,25);
const camera=new THREE.PerspectiveCamera(39,960/544,.05,80);
const ec=document.createElement('canvas');ec.width=1024;ec.height=512;const e=ec.getContext('2d');e.fillStyle='#39434f';e.fillRect(0,0,1024,512);
for(const [x,w,col] of [[90,200,'#eff6fa'],[420,100,'#8ca9c8'],[710,170,'#efe8dc']]){let g=e.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#39434f');g.addColorStop(.25,col);g.addColorStop(.75,col);g.addColorStop(1,'#39434f');e.fillStyle=g;e.fillRect(x,70,w,290);}
const env=new THREE.CanvasTexture(ec);env.mapping=THREE.EquirectangularReflectionMapping;scene.environment=new THREE.PMREMGenerator(renderer).fromEquirectangular(env).texture;
const ceramic=new THREE.MeshStandardMaterial({color:'#d3d6d4',metalness:.18,roughness:.33});
const seam=new THREE.MeshStandardMaterial({color:'#333a40',metalness:.23,roughness:.52});
const visor=new THREE.MeshPhysicalMaterial({color:'#172632',metalness:.62,roughness:.17,clearcoat:1,clearcoatRoughness:.1});
const textile=new THREE.MeshStandardMaterial({color:'#373b40',roughness:.94});
const padding=new THREE.MeshStandardMaterial({color:'#25282c',roughness:.98});
const lensMat=new THREE.MeshPhysicalMaterial({color:'#344e70',metalness:.9,roughness:.095,clearcoat:1});
const weave=document.createElement('canvas');weave.width=128;weave.height=128;const wx=weave.getContext('2d');wx.fillStyle='#909090';wx.fillRect(0,0,128,128);for(let i=0;i<128;i+=4){wx.fillStyle='#777777';wx.fillRect(i,0,1,128);wx.fillStyle='#ababab';wx.fillRect(0,i,128,1);}const wt=new THREE.CanvasTexture(weave);wt.wrapS=wt.wrapT=THREE.RepeatWrapping;wt.repeat.set(3,3);padding.bumpMap=wt;padding.bumpScale=.008;
const black=new THREE.MeshStandardMaterial({color:'#090e14',roughness:.6});
function add(g,m,p,group=scene){const o=new THREE.Mesh(g,m);if(p)o.position.set(...p);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;}
function rr(w,h,r){const s=new THREE.Shape(),x=-w/2,y=-h/2;s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;}
function slab(w,h,r,depth,bevel,mat,p){const g=new THREE.ExtrudeGeometry(rr(w,h,r),{depth,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:5,steps:1,curveSegments:24});g.translate(0,0,-depth/2);return add(g,mat,p);}
function disc(r,depth,mat,p){const o=add(new THREE.CylinderGeometry(r,r,depth,64),mat,p);o.rotation.x=Math.PI/2;return o;}
const floor=add(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#717b7d',roughness:.9}),[0,0,0]);floor.rotation.x=-Math.PI/2;
slab(2.65,1.23,.34,.73,.08,ceramic,[0,.74,0]);
slab(2.62,1.17,.34,.035,.038,seam,[0,.74,.405]);
const front=slab(2.57,1.12,.34,.065,.065,visor,[0,.74,.475]);
const fp=front.geometry.attributes.position;for(let i=0;i<fp.count;i++){const x=fp.getX(i),y=fp.getY(i);fp.setZ(i,fp.getZ(i)+.13*(1-(x/1.4)**2)*(1-(y/.75)**2));}front.geometry.computeVertexNormals();
// Front tracking cameras are symmetric and embedded in the visor.
for(const x of [-1.02,1.02]){disc(.098,.018,black,[x,.73,.645]);disc(.062,.022,lensMat,[x,.73,.659]);}
slab(.31,.058,.029,.012,.008,seam,[0,1.41,-.04]);
for(const x of [-.72,-.54,-.36,-.18,0,.18,.36,.54,.72]){slab(.095,.025,.01,.008,.004,black,[x,1.36,.14]);}
// Rear optics deck lies inside the continuous cushion aperture.
slab(2.5,1.14,.3,.035,.055,black,[0,.74,-.42]);
const cushionShape=rr(2.59,1.23,.33),hole=rr(2.20,.90,.27);cushionShape.holes.push(new THREE.Path(hole.getPoints(96).reverse()));
const cushionGeo=new THREE.ExtrudeGeometry(cushionShape,{depth:.19,bevelEnabled:true,bevelThickness:.065,bevelSize:.05,bevelSegments:5,curveSegments:32});cushionGeo.translate(0,0,-.095);
add(cushionGeo,padding,[0,.74,-.56]);
for(const x of [-.58,.58]){
 disc(.425,.10,seam,[x,.77,-.46]);disc(.37,.105,black,[x,.77,-.50]);const optic=add(new THREE.SphereGeometry(1,64,40),lensMat,[x,.77,-.551]);optic.scale.set(.308,.308,.065);
 const rim=add(new THREE.TorusGeometry(.328,.025,16,80),seam,[x,.77,-.59]);
 for(const r of [.23,.267]){add(new THREE.TorusGeometry(r,.004,6,80),new THREE.MeshStandardMaterial({color:'#4b6381',metalness:.4,roughness:.4}),[x,.77,-.579]);}
}
slab(.28,.28,.12,.13,.05,padding,[0,.31,-.59]);
// Rigid molded side arms connect shell hinges to the rear support band.
function rod(a,b,r,m){const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),o=add(new THREE.CylinderGeometry(r,r,av.distanceTo(bv),24),m);o.position.copy(av).add(bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return o;}
for(const sign of [-1,1]){
 const hinge=add(new THREE.CylinderGeometry(.17,.17,.13,48),ceramic,[sign*1.39,.94,-.1]);hinge.rotation.z=Math.PI/2;
 band([[sign*1.39,.94,-.1],[sign*1.40,1.14,-.65],[sign*1.22,1.49,-1.40],[sign*.92,1.63,-1.84]],.20,.09,ceramic,'y');
}
function band(points,width,thickness,mat,axis='x'){
 const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p))),verts=[],idx=[],n=90;
 for(let i=0;i<=n;i++){const t=i/n,c=curve.getPoint(t),tan=curve.getTangent(t),ac=axis==='x'?new THREE.Vector3(1,0,0):new THREE.Vector3(0,1,0),normal=new THREE.Vector3().crossVectors(tan,ac).normalize();for(const [w,h] of [[-1,-1],[1,-1],[1,1],[-1,1]]){const v=c.clone().addScaledVector(ac,w*width/2).addScaledVector(normal,h*thickness/2);verts.push(v.x,v.y,v.z);}}
 for(let i=0;i<n;i++)for(let j=0;j<4;j++){let a=i*4+j,b=i*4+(j+1)%4,c=b+4,d=a+4;idx.push(a,b,d,b,c,d);}
 idx.push(0,2,1,0,3,2,n*4,n*4+1,n*4+2,n*4,n*4+2,n*4+3);
 const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.setIndex(idx);g.computeVertexNormals();return add(g,mat);
}
band([[-1.19,1.54,-1.45],[-.92,1.63,-1.84],[0,1.69,-2.12],[.92,1.63,-1.84],[1.19,1.54,-1.45]],.27,.085,textile,'y');
band([[0,1.38,-.05],[0,1.99,-.48],[0,2.16,-1.08],[0,2.01,-1.72],[0,1.69,-2.12]],.33,.065,textile);
const dial=disc(.18,.1,ceramic,[0,1.69,-2.22]);disc(.12,.106,seam,[0,1.69,-2.23]);
for(const sign of [-1,1]){const foot=slab(.52,.035,.017,.38,.01,padding,[sign*.79,.015,-.015]);}
for(const sign of [-1,1]){slab(.34,.05,.025,.24,.014,padding,[sign*.82,.038,-.51]);}
scene.add(new THREE.HemisphereLight('#dceafa','#41464a',1.4));
const key=new THREE.DirectionalLight('#fff3e1',1.9);key.position.set(-3,8,4);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.012;key.shadow.bias=-.0001;scene.add(key);
const rimLight=new THREE.DirectionalLight('#b9d7ff',2.0);rimLight.position.set(3,4,-5);scene.add(rimLight);
function seek(t){const u=THREE.MathUtils.clamp(t/(123/24),0,1),ease=u*u*(3-2*u),pace=.45*u+.55*ease,arc=Math.sin(Math.PI*u)**2,angle=THREE.MathUtils.lerp(-.42,3.12,pace),r=THREE.MathUtils.lerp(2.95,4.35,ease)+2.7*arc;camera.position.set(Math.sin(angle)*r,THREE.MathUtils.lerp(1.2,1.35,ease)+2.7*arc,Math.cos(angle)*r-.65);camera.lookAt(0,THREE.MathUtils.lerp(.77,.97,ease),THREE.MathUtils.lerp(-.2,-.75,ease));renderer.render(scene,camera);}
window.reconstruction={pause(){},seek,getCameraState(){return{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};}};seek(0);
