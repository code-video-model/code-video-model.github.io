import * as THREE from './vendor/three.module.js';
const W=960,H=544,D=124/24;
const renderer=new THREE.WebGLRenderer({canvas:document.querySelector('canvas'),antialias:true,preserveDrawingBuffer:true});
renderer.setSize(W,H);renderer.setPixelRatio(1);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
const scene=new THREE.Scene();scene.background=new THREE.Color('#899598');scene.fog=new THREE.Fog('#899598',12,38);
const camera=new THREE.PerspectiveCamera(38,W/H,.05,60);
const ec=document.createElement('canvas');ec.width=1024;ec.height=512;const ctx=ec.getContext('2d');
ctx.fillStyle='#505860';ctx.fillRect(0,0,1024,512);
for(const [x,w,c] of [[80,140,'#eeeeec'],[400,75,'#a6b9c8'],[740,180,'#fff4de']]){const g=ctx.createLinearGradient(x,0,x+w,0);g.addColorStop(0,'#505860');g.addColorStop(.25,c);g.addColorStop(.75,c);g.addColorStop(1,'#505860');ctx.fillStyle=g;ctx.fillRect(x,65,w,330);}
const env=new THREE.CanvasTexture(ec);env.mapping=THREE.EquirectangularReflectionMapping;scene.environment=new THREE.PMREMGenerator(renderer).fromEquirectangular(env).texture;
const metal=new THREE.MeshStandardMaterial({color:'#a6afb2',metalness:.88,roughness:.28});
const grainCanvas=document.createElement('canvas');grainCanvas.width=128;grainCanvas.height=512;const gx=grainCanvas.getContext('2d');
for(let y=0;y<512;y++){const v=150+Math.round(18*Math.sin(y*2.413)+10*Math.sin(y*.733));gx.fillStyle=`rgb(${v},${v},${v})`;gx.fillRect(0,y,128,1);}
metal.roughnessMap=new THREE.CanvasTexture(grainCanvas);metal.roughness=.46;
const dark=new THREE.MeshStandardMaterial({color:'#252c30',metalness:.68,roughness:.34});
const rubber=new THREE.MeshStandardMaterial({color:'#181c1e',roughness:.82});
const ivory=new THREE.MeshStandardMaterial({color:'#e1dac6',metalness:.15,roughness:.33,side:THREE.BackSide});
function mesh(g,m,p,parent=scene){ window.__bfTrace?.add(19);const o=new THREE.Mesh(g,m);if(p)o.position.set(...p);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function rod(a,b,r,m,parent=scene){ window.__bfTrace?.add(20);const av=new THREE.Vector3(...a),bv=new THREE.Vector3(...b);const o=mesh(new THREE.CylinderGeometry(r,r,av.distanceTo(bv),32),m,null,parent);o.position.copy(av).add(bv).multiplyScalar(.5);o.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),bv.sub(av).normalize());return o;}
function cylinder(r,h,m,p){ window.__bfTrace?.add(21);return mesh(new THREE.CylinderGeometry(r,r,h,96),m,p);}
const floor=mesh(new THREE.PlaneGeometry(200,200),new THREE.MeshStandardMaterial({color:'#60696b',roughness:.86}),[0,-.012,0]);floor.rotation.x=-Math.PI/2;
cylinder(.64,.055,rubber,[0,.028,-.35]);
cylinder(.68,.14,metal,[0,.112,-.35]);
cylinder(.58,.025,dark,[0,.195,-.35]);
cylinder(.24,.085,metal,[0,.232,-.35]);
cylinder(.115,.16,dark,[0,.34,-.35]);
const a=[0,.39,-.35],b=[0,1.43,-.83],c=[0,2.43,.23];
for(const x of [-.10,.10]){rod([x,a[1],a[2]],[x,b[1],b[2]],.047,metal);rod([x,b[1],b[2]],[x,c[1],c[2]],.047,metal);}
for(const p of [a,b,c]){const j=rod([-.14,p[1],p[2]],[.14,p[1],p[2]],.105,dark);for(const x of [-.151,.151]){const cap=rod([x-.014,p[1],p[2]],[x+.014,p[1],p[2]],.068,metal);}}
rod([0,.58,-.43],[0,1.19,-.72],.025,dark);
const shade=new THREE.Group();shade.position.set(0,2.45,.48);shade.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),new THREE.Vector3(0,.82,-.57).normalize());scene.add(shade);
const profile=[new THREE.Vector2(.58,-.3),new THREE.Vector2(.575,-.26),new THREE.Vector2(.53,-.16),new THREE.Vector2(.44,.06),new THREE.Vector2(.29,.28),new THREE.Vector2(.16,.36),new THREE.Vector2(.11,.37)];
mesh(new THREE.LatheGeometry(profile,96),metal,null,shade);
const inner=mesh(new THREE.LatheGeometry(profile.map(p=>new THREE.Vector2(p.x-.013,p.y+.008)),96),ivory,null,shade);
const lip=mesh(new THREE.TorusGeometry(.574,.018,12,96),metal,[0,-.3,0],shade);lip.rotation.x=Math.PI/2;
mesh(new THREE.CylinderGeometry(.105,.105,.16,48),dark,[0,.43,0],shade);
const bulbMat=new THREE.MeshStandardMaterial({color:'#fff5d6',emissive:'#ffe1a1',emissiveIntensity:.05,roughness:.24});
mesh(new THREE.SphereGeometry(.105,32,24),bulbMat,[0,.05,0],shade);
rod([0,2.43,.23],[0,2.79,.24],.055,dark);
rod([-.13,2.79,.24],[.13,2.79,.24],.072,metal);
const switchButton=cylinder(.072,.026,dark,[.34,.195,-.22]);
const cablePoints=[new THREE.Vector3(0,.03,-.9),new THREE.Vector3(.08,.024,-1.24),new THREE.Vector3(.42,.024,-1.47),new THREE.Vector3(.6,.024,-1.84),new THREE.Vector3(.6,.024,-2.1)];
mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePoints),64,.022,10,false),rubber);
const ambient=new THREE.HemisphereLight('#e6f0ff','#343538',1.2);scene.add(ambient);
function areaLike(pos,intensity,color){ window.__bfTrace?.add(46);const l=new THREE.DirectionalLight(color,intensity);l.position.set(...pos);scene.add(l);return l;}
const key=areaLike([-3,7,4],1.9,'#fff3e0');key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.camera.left=-5;key.shadow.camera.right=5;key.shadow.camera.top=5;key.shadow.camera.bottom=-5;key.shadow.normalBias=.018;key.shadow.bias=-.0001;key.shadow.radius=4;
areaLike([3,4,-4],2,'#bacdde');
const beam=new THREE.SpotLight('#ffdfa0',0,10,.38,.4,1.7);beam.position.set(0,2.35,.55);beam.target.position.set(0,0,2.05);beam.castShadow=true;beam.shadow.mapSize.set(1024,1024);beam.shadow.bias=-.0001;scene.add(beam,beam.target);
function smooth(t){ window.__bfTrace?.add(50);return t*t*(3-2*t);}
function seek(t){ window.__bfTrace?.add(51);const u=Math.max(0,Math.min(1,t/(D-1/24)));const move=.25*u+.75*smooth(u);const reveal=smooth(Math.min(1,u/.78));const clearance=Math.sin(Math.PI*u)**2;const theta=THREE.MathUtils.lerp(3.35,.30,move);const radius=THREE.MathUtils.lerp(2.8,7.05,.6*u+.4*smooth(u))+.65*clearance;camera.position.set(Math.sin(theta)*radius,THREE.MathUtils.lerp(3.8,1.75,move),Math.cos(theta)*radius+.4);camera.lookAt(0,THREE.MathUtils.lerp(2.22,.99,reveal)+.12*clearance,THREE.MathUtils.lerp(.23,.78,reveal));const on=smooth(Math.max(0,Math.min(1,(u-.1)/.64)));beam.intensity=on*35;bulbMat.emissiveIntensity=.05+on*4;renderer.render(scene,camera);}
window.reconstruction={pause(){},seek,getCameraState(){return{position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov};}};seek(0);

// Capture and sampling adapter; product geometry and animation are unchanged.
const __productRender = renderer.render.bind(renderer);
renderer.render = (s, c) => { if (!window.__bfSampling) return __productRender(s, c); };
window.__bfCapture = { THREE: THREE, renderer: renderer, scene: scene, camera: camera };
