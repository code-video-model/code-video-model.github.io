import * as THREE from './vendor/three.module.js';
const canvas=document.querySelector('#reconstruction-canvas');
const renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});
renderer.setSize(960,544); renderer.setPixelRatio(1);
renderer.shadowMap.enabled=true; renderer.shadowMap.type=THREE.PCFShadowMap;
renderer.outputColorSpace=THREE.SRGBColorSpace; renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
const scene=new THREE.Scene();scene.background=new THREE.Color('#292b28');
scene.fog=new THREE.Fog('#292b28',18,40);
const camera=new THREE.PerspectiveCamera(39,960/544,.05,70);
const mat=(color,metalness=0,roughness=.45)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
const silver=mat('#b5bab6',.85,.27), black=mat('#161b1b',.25,.35),rubber=mat('#131616',0,.75);
const envScene=new THREE.Scene();envScene.background=new THREE.Color('#646762');
for(const [p,s,c] of [[[0,6,0],[9,1,5],'#fff4dc'],[[-5,2,1],[1,6,8],'#d2e4ff'],[[5,3,-5],[5,4,1],'#fff7ea']]){
const m=new THREE.Mesh(new THREE.PlaneGeometry(s[0],s[1]),new THREE.MeshBasicMaterial({color:c,side:THREE.DoubleSide}));m.position.set(...p);m.lookAt(0,0,0);envScene.add(m);}
const pmrem=new THREE.PMREMGenerator(renderer);scene.environment=pmrem.fromScene(envScene,.07).texture;
scene.add(new THREE.HemisphereLight('#e9eff3','#4e4637',2.0));
function area(x,y,z,power,color,size){ window.__bfTrace?.add(17);const l=new THREE.DirectionalLight(color,power);l.position.set(x,y,z);l.castShadow=true;l.shadow.mapSize.set(2048,2048);l.shadow.camera.left=-7;l.shadow.camera.right=7;l.shadow.camera.top=7;l.shadow.camera.bottom=-7;l.shadow.normalBias=.015;l.shadow.bias=-.00015;l.shadow.radius=size;scene.add(l);}
area(-3,8,5,3.2,'#fff0d7',3);area(4,5,-4,1.7,'#dceaff',3);
const ground=new THREE.Mesh(new THREE.PlaneGeometry(200,200),mat('#272f2c',.05,.8));ground.rotation.x=-Math.PI/2;ground.receiveShadow=true;scene.add(ground);
function mesh(g,m,x,y,z,parent=scene){ window.__bfTrace?.add(20);const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function cyl(r,h,m,x,y,z,parent=scene,r2=r){ window.__bfTrace?.add(21);return mesh(new THREE.CylinderGeometry(r,r2,h,128),m,x,y,z,parent);}
function box(w,h,d,m,x,y,z,parent=scene){ window.__bfTrace?.add(22);return mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z,parent);}
function rounded(w,d,h,r,m,x,y,z){ window.__bfTrace?.add(23);
const s=new THREE.Shape();s.moveTo(-w/2+r,-d/2);s.lineTo(w/2-r,-d/2);s.quadraticCurveTo(w/2,-d/2,w/2,-d/2+r);s.lineTo(w/2,d/2-r);s.quadraticCurveTo(w/2,d/2,w/2-r,d/2);s.lineTo(-w/2+r,d/2);s.quadraticCurveTo(-w/2,d/2,-w/2,d/2-r);s.lineTo(-w/2,-d/2+r);s.quadraticCurveTo(-w/2,-d/2,-w/2+r,-d/2);
const g=new THREE.ExtrudeGeometry(s,{depth:h,bevelEnabled:true,bevelSegments:3,steps:1,bevelSize:.035,bevelThickness:.025,curveSegments:12});g.rotateX(-Math.PI/2);return mesh(g,m,x,y-h/2,z);}
const woodCanvas=document.createElement('canvas');woodCanvas.width=1024;woodCanvas.height=256;
const ctx=woodCanvas.getContext('2d');ctx.fillStyle='#755039';ctx.fillRect(0,0,1024,256);
for(let j=0;j<310;j++){const y=j*256/310;ctx.strokeStyle=`rgba(${j%2?45:181},${j%2?25:119},${j%2?14:76},${.1+(j%7)*.024})`;ctx.lineWidth=.4+(j%4)*.3;ctx.beginPath();for(let x=0;x<=1024;x+=8){const yy=y+2*Math.sin(x*.009+j*.7)+Math.sin(x*.027+j);x?ctx.lineTo(x,yy):ctx.moveTo(x,yy);}ctx.stroke();}
const woodTex=new THREE.CanvasTexture(woodCanvas);woodTex.colorSpace=THREE.SRGBColorSpace;woodTex.wrapS=woodTex.wrapT=THREE.RepeatWrapping;
const wood=new THREE.MeshStandardMaterial({map:woodTex,roughness:.39,metalness:.02});
for(const x of [-1.8,1.8])for(const z of [-1.24,1.24]){cyl(.23,.17,rubber,x,.095,z);cyl(.22,.09,silver,x,.21,z);}
rounded(4.75,3.55,.38,.10,wood,0,.455,0);
rounded(4.62,3.42,.035,.08,mat('#353b37',.55,.34),0,.67,0);
cyl(1.50,.09,black,-.55,.727,0);cyl(1.49,.055,silver,-.55,.775,0);
for(let i=0;i<3;i++)cyl(1.493,.008,black,-.55,.757+i*.017,0);
const record=new THREE.Group();record.position.set(-.55,.818,0);scene.add(record);
cyl(1.45,.025,mat('#090e10',.45,.3),0,0,0,record);
const grooves=mat('#10171b',.3,.5);
for(let i=0;i<20;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.55+i*.044,.0018,6,384),grooves);ring.rotation.x=Math.PI/2;ring.position.y=.012;record.add(ring);}
cyl(.43,.003,mat('#d9bf8e',0,.8),0,.014,0,record);
const label=new THREE.Mesh(new THREE.CircleGeometry(.39,64,0,Math.PI*.67),mat('#a8482c',0,.76));label.rotation.x=-Math.PI/2;label.position.y=.016;record.add(label);
cyl(.09,.004,black,0,.017,0,record);cyl(.035,.12,silver,-.55,.857,0);
const pivot={x:1.66,z:-.98};cyl(.22,.085,black,pivot.x,.74,pivot.z);cyl(.16,.25,silver,pivot.x,.90,pivot.z);cyl(.11,.11,black,pivot.x,1.07,pivot.z);
function rod(a,b,r,m){ window.__bfTrace?.add(44);const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b),delta=bv.clone().sub(av);const o=mesh(new THREE.CylinderGeometry(r,r,delta.length(),24),m,...av.clone().add(bv).multiplyScalar(.5).toArray());o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return o;}
const armPoints=[[1.82,1.15,-1.28],[1.66,1.15,-.98],[1.25,1.12,-.2],[.72,1.09,.57],[.53,1.08,.78]];
for(let i=1;i<armPoints.length;i++)rod(armPoints[i-1],armPoints[i],.046,silver);
const weight=cyl(.13,.27,silver,1.83,1.15,-1.29);weight.rotation.x=Math.PI/2;weight.rotation.z=-.35;
const bearing=new THREE.Mesh(new THREE.TorusGeometry(.11,.025,12,48),silver);bearing.position.set(1.66,1.15,-.98);bearing.rotation.y=.48;scene.add(bearing);
rod([1.56,1.14,-.98],[1.76,1.14,-.98],.028,black);
box(.17,.065,.34,black,.52,1.06,.83);
for(const z of [.76,.86]){cyl(.020,.009,silver,.52,1.097,z);box(.007,.004,.025,black,.52,1.103,z);}
box(.14,.095,.18,mat('#b29056',.68,.33),.52,.98,.86);
rod([.52,.94,.87],[.50,.831,.94],.006,silver);
rod([.6,1.09,.92],[.74,1.13,.97],.015,silver);
cyl(.075,.23,black,1.12,.82,.20);rod([1.03,.93,.20],[1.26,.93,.20],.015,silver);
box(.035,.11,.12,black,1.10,.98,.20);
cyl(.155,.052,silver,-1.92,.73,1.35);cyl(.11,.018,black,-1.92,.765,1.35);
const light=mat('#e8a85c',.2,.35);light.emissive=new THREE.Color('#915421');light.emissiveIntensity=.4;cyl(.018,.006,light,-1.62,.706,1.36);
function update(t){ window.__bfTrace?.add(59);
t=THREE.MathUtils.clamp(t,0,123/24);const u=t/(123/24);const s=.15*u+.85*u*u*(3-2*u);
record.rotation.y=-t*Math.PI*2*33.333333/60;
const angle=THREE.MathUtils.degToRad(40+145*s),radius=3.05+.90*s+1.5*Math.sin(Math.PI*s);
camera.position.set(radius*Math.sin(angle),1.95+8.5*s,radius*Math.cos(angle));
camera.fov=39-7*s;camera.updateProjectionMatrix();
camera.lookAt(.52*(1-s)+.35*Math.sin(Math.PI*s),.86-.36*s,.82*(1-s)-.25*Math.sin(Math.PI*s));camera.updateMatrixWorld();renderer.render(scene,camera);}
let paused=false,start=performance.now();
window.reconstruction={pause(){paused=true;},seek(t){paused=true;update(t);},getCameraState(){return{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};}};
function tick(now){ window.__bfTrace?.add(68);if(!paused)update(((now-start)/1000)%(124/24));requestAnimationFrame(tick);}update(0);requestAnimationFrame(tick);

// Capture and sampling adapter; product geometry and animation are unchanged.
const __productRender = renderer.render.bind(renderer);
renderer.render = (s, c) => { if (!window.__bfSampling) return __productRender(s, c); };
window.__bfCapture = { THREE: THREE, renderer: renderer, scene: scene, camera: camera };
