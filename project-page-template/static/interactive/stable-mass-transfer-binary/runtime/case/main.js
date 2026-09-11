import * as THREE from './vendor/three.module.js';

// Dimensionless, enhanced-color kinematic model, not a fluid-dynamics solution.
const C = Object.freeze({
  duration: 8, width: 1280, height: 720, fps: 24,
  separation: 4.5, donorMass: 1, dwarfMass: 1,
  orbitRate: 0.043, orbitInitial: -0.09,
  donorRadius: 1.47, dwarfRadius: 0.145,
  diskInner: 0.125, diskOuter: 1.44,
  diskOmegaOuter: 0.61, diskOmegaMax: 4.65,
  impactTheta: 2.30, impactRadius: 1.39,
  streamTransit: 1.65, tracerLifetime: 2.55,
  cameraArcDegrees: -25, cameraStart: 2, cameraEnd: 6.55,
  cameraRadius: 11.70, cameraPush: 0.075,
  cameraElevationDegrees: 31, cameraFov: 32,
});
const TAU = Math.PI * 2;
const clamp = THREE.MathUtils.clamp;
const smooth = (a,b,t) => {
  const x = clamp((t-a)/(b-a),0,1);
  return x*x*(3-2*x);
};
const ease = x => x*x*x*(10+x*(-15+6*x));
const cx = C.separation/2;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x000000);
const renderer = new THREE.WebGLRenderer({
  antialias: true, alpha: false, preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(C.width,C.height);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.getContext().disable(renderer.getContext().DITHER);
renderer.domElement.id = 'proxy';
document.body.appendChild(renderer.domElement);
const camera = new THREE.PerspectiveCamera(C.cameraFov, C.width/C.height, .05, 180);
const binary = new THREE.Group();
scene.add(binary);
const donorGroup = new THREE.Group();
donorGroup.position.x = -cx;
binary.add(donorGroup);
const dwarfGroup = new THREE.Group();
dwarfGroup.position.x = cx;
binary.add(dwarfGroup);
const clockUniform = {value:0};

const noiseGLSL = `
float hash3(vec3 p) {
  p=fract(p*0.3183099+vec3(.17,.11,.07)); p*=17.;
  return fract(p.x*p.y*p.z*(p.x+p.y+p.z));
}
float noise3(vec3 p) {
  vec3 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(mix(hash3(i),hash3(i+vec3(1,0,0)),f.x),
                 mix(hash3(i+vec3(0,1,0)),hash3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(hash3(i+vec3(0,0,1)),hash3(i+vec3(1,0,1)),f.x),
                 mix(hash3(i+vec3(0,1,1)),hash3(i+vec3(1,1,1)),f.x),f.y),f.z);
}
float fbm(vec3 p) {
  return .55*noise3(p)+.28*noise3(p*2.03+7.1)+.17*noise3(p*4.07+3.4);
}`;
const sphereVertex = `
varying vec3 vP;
varying vec3 vN;
varying vec3 vV;
void main() {
  vP=position; vec4 mv=modelViewMatrix*vec4(position,1.);
  vN=normalize(normalMatrix*normal); vV=normalize(-mv.xyz);
  gl_Position=projectionMatrix*mv;
}`;

function donorShape(x,y,z) { window.__bfTrace?.add(74);
  return new THREE.Vector3(
    C.donorRadius*x,
    C.donorRadius*y,
    C.donorRadius*z,
  );
}
const donorGeometry = new THREE.SphereGeometry(1,128,96);
const donorPositions = donorGeometry.attributes.position;
for(let i=0;i<donorPositions.count;i++) {
  const p=donorShape(donorPositions.getX(i),donorPositions.getY(i),donorPositions.getZ(i));
  donorPositions.setXYZ(i,p.x,p.y,p.z);
}
donorGeometry.computeVertexNormals();
const donorMaterial = new THREE.ShaderMaterial({
  uniforms: {uTime:clockUniform},
  vertexShader: sphereVertex,
  fragmentShader: `
    uniform float uTime;
    varying vec3 vP; varying vec3 vN; varying vec3 vV;
    ${noiseGLSL}
    void main() {
      vec3 p=vP+vec3(0.,uTime*.010,uTime*.004);
      float large=fbm(p*4.2);
      float cells=fbm(p*34.+large*.8);
      float grain=pow(smoothstep(.25,.80,cells),.85);
      float small=noise3(p*112.);
      float limb=pow(max(dot(normalize(vN),normalize(vV)),0.),.83);
      vec3 color=mix(vec3(.62,.19,.033),vec3(1.08,.53,.135),grain);
      color*=.73+.37*large+.035*small;
      color*=.075+.925*limb;
      gl_FragColor=vec4(color,1.);
      #include <colorspace_fragment>
    }`,
});
const donor = new THREE.Mesh(donorGeometry,donorMaterial);
donorGroup.add(donor);

function glowTexture() { window.__bfTrace?.add(112);
  const canvas=document.createElement('canvas');
  canvas.width=256;canvas.height=256;
  const ctx=canvas.getContext('2d');
  const gradient=ctx.createRadialGradient(128,128,0,128,128,128);
  gradient.addColorStop(0,'rgba(255,255,255,0.72)');
  gradient.addColorStop(.22,'rgba(255,255,255,0.35)');
  gradient.addColorStop(.48,'rgba(255,255,255,0.07)');
  gradient.addColorStop(1,'rgba(255,255,255,0)');
  ctx.fillStyle=gradient;ctx.fillRect(0,0,256,256);
  return new THREE.CanvasTexture(canvas);
}
const glowMap=glowTexture();
function glow(group,color,size,opacity,position) { window.__bfTrace?.add(125);
  const sprite=new THREE.Sprite(new THREE.SpriteMaterial({
    map:glowMap,color,transparent:true,opacity,
    blending:THREE.AdditiveBlending,depthWrite:false,depthTest:true,
  }));
  sprite.scale.set(size,size,1);
  if(position) sprite.position.copy(position);
  group.add(sprite);
  return sprite;
}
glow(donorGroup,0xff8b20,6.25,.34);
const corona = new THREE.Mesh(donorGeometry,new THREE.ShaderMaterial({
  transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:sphereVertex,
  fragmentShader:`
    varying vec3 vP; varying vec3 vN; varying vec3 vV;
    void main(){
      float edge=pow(1.-abs(dot(normalize(vN),normalize(vV))),4.);
      gl_FragColor=vec4(vec3(1.,.30,.035),edge*.10);
      #include <colorspace_fragment>
    }`,
}));
corona.scale.setScalar(1.013);
donorGroup.add(corona);

const dwarf = new THREE.Mesh(new THREE.SphereGeometry(C.dwarfRadius,64,48),new THREE.ShaderMaterial({
  vertexShader:sphereVertex,
  fragmentShader:`
    varying vec3 vP; varying vec3 vN; varying vec3 vV;
    void main(){
      float front=pow(max(dot(normalize(vN),normalize(vV)),0.),.45);
      gl_FragColor=vec4(mix(vec3(.27,.60,.98),vec3(1.,1.,1.),front),1.);
      #include <colorspace_fragment>
    }`,
}));
dwarf.position.y=.035;
dwarfGroup.add(dwarf);
glow(dwarfGroup,0x8bcfff,.89,.46,new THREE.Vector3(0,.05,0));

function diskGeometry(side) { window.__bfTrace?.add(164);
  const vertices=[],uvs=[],indices=[];
  const radial=108,angular=320;
  for(let i=0;i<=radial;i++) {
    const r=C.diskInner+(C.diskOuter-C.diskInner)*i/radial;
    for(let j=0;j<=angular;j++) {
      const a=j/angular*TAU;
      const height=(.014+.039*Math.pow(r/C.diskOuter,1.35))*side;
      vertices.push(r*Math.cos(a),height,r*Math.sin(a));
      uvs.push(i/radial,j/angular);
      if(i<radial && j<angular) {
        const k=i*(angular+1)+j;
        indices.push(k,k+1,k+angular+1,k+1,k+angular+2,k+angular+1);
      }
    }
  }
  const g=new THREE.BufferGeometry();
  g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
  g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  g.setIndex(indices);g.computeVertexNormals();
  return g;
}
const diskFragment = `
  uniform float uTime; uniform float uLayer;
  varying vec3 vP;
  ${noiseGLSL}
  float wrap(float a){return atan(sin(a),cos(a));}
  vec2 gasLayer(float a,float r,float age,float epoch,float omega) {
    float phase=a+omega*age+epoch*.731;
    vec3 p=vec3(r*22.+epoch*.341,cos(phase)*4.7,sin(phase)*4.7);
    float clouds=fbm(p);
    float longPhase=phase*5.+r*27.+sin(phase*3.+r*9.)*.7;
    float finePhase=phase*9.-r*48.+clouds*1.5;
    float filterLong=1.-smoothstep(.6,2.5,fwidth(longPhase));
    float filterFine=1.-smoothstep(.6,2.5,fwidth(finePhase));
    float streak=pow(max(0.,sin(longPhase)*.55*filterLong+sin(finePhase)*.28*filterFine+.18),3.);
    return vec2(clouds,streak);
  }
  void main() {
    float r=length(vP.xz), a=atan(vP.z,vP.x);
    float omega=min(${C.diskOmegaMax.toFixed(3)},${C.diskOmegaOuter.toFixed(3)}*pow(${C.diskOuter.toFixed(3)}/max(r,.18),1.5));
    // Smoothly born/dissolving turbulent parcels avoid unbounded winding and aliasing.
    float ageA=mod(uTime+.35,2.4),ageB=mod(uTime+1.55,2.4);
    float weightA=pow(sin(3.14159265*ageA/2.4),2.);
    vec2 fieldA=gasLayer(a,r,ageA,floor((uTime+.35)/2.4),omega);
    vec2 fieldB=gasLayer(a,r,ageB,floor((uTime+1.55)/2.4)+4.,omega);
    vec2 field=mix(fieldB,fieldA,weightA);
    float clouds=field.x,streak=field.y;
    float texture=.26+.68*clouds+.61*streak;
    float heat=1.-smoothstep(.22,${C.diskOuter.toFixed(3)},r);
    vec3 color=mix(vec3(.37,.073,.022),vec3(.18,.47,.80),smoothstep(.18,.64,heat));
    color=mix(color,vec3(.50,.70,.91),smoothstep(.55,1.,heat));
    color*=texture*(.70+.60*heat);
    float da=wrap(a-${C.impactTheta.toFixed(4)});
    float shock=exp(-pow((r-${C.impactRadius.toFixed(4)})/.095,2.)-pow(da/.090,2.));
    float wake=exp(-pow((r-1.32)/.12,2.))*exp(-pow((da+.19)/.22,2.));
    color+=vec3(1.,.55,.22)*shock*1.45;
    color+=vec3(.66,.25,.075)*wake*.34;
    float edge=1.-smoothstep(${(C.diskOuter-.16).toFixed(4)},${C.diskOuter.toFixed(4)},r+(.5-clouds)*.065);
    float inner=smoothstep(${C.diskInner.toFixed(3)},.20,r);
    gl_FragColor=vec4(color,edge*inner*uLayer);
    #include <colorspace_fragment>
  }`;
for(const [height,opacity] of [[-1,.44],[0,.30],[1,.91]]) {
  const mesh=new THREE.Mesh(diskGeometry(height),new THREE.ShaderMaterial({
    uniforms:{uTime:clockUniform,uLayer:{value:opacity}},
    vertexShader:'varying vec3 vP; void main(){vP=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:diskFragment,transparent:true,depthWrite:false,side:THREE.DoubleSide,
  }));
  dwarfGroup.add(mesh);
}

const impact = new THREE.Vector3(
  cx+C.impactRadius*Math.cos(C.impactTheta),.028,
  C.impactRadius*Math.sin(C.impactTheta),
);
const donorTip=donorShape(1,0,0).x-cx;
const stream = new THREE.CubicBezierCurve3(
  new THREE.Vector3(donorTip+.018,0,0),
  new THREE.Vector3(.42,0,.005),
  impact.clone().add(new THREE.Vector3(-.48*Math.sin(C.impactTheta),0,.48*Math.cos(C.impactTheta))),
  impact,
);

function tubeGeometry(curve, radius, count=240) { window.__bfTrace?.add(248);
  const g=new THREE.TubeGeometry(curve,count,radius,10,false);
  const pos=g.attributes.position,uv=g.attributes.uv;
  for(let i=0;i<pos.count;i++) {
    const u=uv.getX(i),center=curve.getPointAt(u);
    const taper=1.+4.25*Math.exp(-u*11.)+.38*Math.pow(u,5);
    pos.setXYZ(i,
      center.x+(pos.getX(i)-center.x)*taper,
      center.y+(pos.getY(i)-center.y)*taper,
      center.z+(pos.getZ(i)-center.z)*taper);
  }
  g.computeVertexNormals();
  return g;
}
for(const [radius,opacity] of [[.078,.10],[.040,.31],[.020,.56]]) {
  const mat=new THREE.ShaderMaterial({
    uniforms:{uTime:clockUniform,uOpacity:{value:opacity}},
    vertexShader:`
      varying vec2 vUv; varying vec3 vN; varying vec3 vV;
      void main(){vUv=uv;vec4 mv=modelViewMatrix*vec4(position,1.);
      vN=normalize(normalMatrix*normal);vV=normalize(-mv.xyz);
      gl_Position=projectionMatrix*mv;}`,
    fragmentShader:`
      uniform float uTime;uniform float uOpacity;
      varying vec2 vUv;varying vec3 vN;varying vec3 vV;
      void main(){
        float phase=vUv.x-uTime/${C.streamTransit.toFixed(3)};
        float pulse=pow(.5+.5*cos(phase*6.2831853*5.),4.);
        float fine=.5+.5*sin(phase*6.2831853*13.+sin(vUv.y*18.)*.6);
        float rim=pow(abs(dot(normalize(vN),normalize(vV))),1.35);
        vec3 color=mix(vec3(1.,.43,.075),vec3(.95,.60,.32),vUv.x);
        float join=smoothstep(0.,.025,vUv.x)*(1.-smoothstep(.92,1.,vUv.x));
        gl_FragColor=vec4(color*(.55+.48*pulse+.12*fine),uOpacity*rim*join);
        #include <colorspace_fragment>
      }`,
    transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  });
  binary.add(new THREE.Mesh(tubeGeometry(stream,radius),mat));
}

// A broad exterior launch fan converges toward L1; the stellar mesh stays spherical.
for(let i=0;i<31;i++) {
  const a=TAU*i/31;
  const patchRadius=.18+.39*(.5+.5*Math.sin(i*3.17));
  const y=patchRadius*Math.sin(a),z=patchRadius*Math.cos(a);
  const x=-cx+Math.sqrt(C.donorRadius*C.donorRadius-y*y-z*z);
  const start=new THREE.Vector3(x,y,z);
  const end=stream.getPointAt(.18+.018*Math.sin(i*2.31));
  const filament=new THREE.CubicBezierCurve3(
    start,
    start.clone().add(new THREE.Vector3(.25,-y*.04,-z*.04)),
    end.clone().add(new THREE.Vector3(-.22,y*.20,z*.20)),
    end,
  );
  binary.add(new THREE.Mesh(new THREE.TubeGeometry(filament,32,.014,5,false),
    new THREE.MeshBasicMaterial({color:0xffbb65,transparent:true,opacity:.36,
      blending:THREE.AdditiveBlending,depthWrite:false})));
}
glow(binary,0xffbc70,.55,.45,impact.clone().add(new THREE.Vector3(0,.05,0)));

const launchParticles=[];
for(let i=0;i<320;i++) {
  const a=TAU*((i*.61803398875)%1);
  const radius=.035+.555*((i*37%319)/318);
  const y=radius*Math.sin(a),z=radius*Math.cos(a);
  const x=-cx+Math.sqrt(C.donorRadius*C.donorRadius-y*y-z*z);
  const mesh=new THREE.Mesh(
    new THREE.SphereGeometry(.011+.010*((i*29%47)/46),7,5),
    new THREE.MeshBasicMaterial({
      color:i%5===0?0xfff0c2:0xffa94f,transparent:true,opacity:0,
      blending:THREE.AdditiveBlending,depthWrite:false,
    }),
  );
  binary.add(mesh);
  launchParticles.push({
    mesh,
    start:new THREE.Vector3(x,y,z),
    phase:(i+.5)/320,
    wobble:.014+.036*((i*17%61)/60),
    angle:a,
  });
}

const tracers=[];
for(let i=0;i<11;i++) {
  const mesh=new THREE.Mesh(new THREE.SphereGeometry(.010+.003*(.5+.5*Math.sin(i*7.1)),8,6),
    new THREE.MeshBasicMaterial({color:0xffedc7,transparent:true,opacity:1,
      blending:THREE.AdditiveBlending,depthWrite:false}));
  binary.add(mesh);
  tracers.push(mesh);
}

// Localized arc packets move at their own radius, never as one rigid mesh.
const arcs=[];
for(let i=0;i<54;i++) {
  const h=Math.sin(i*91.773+7.41)*43758.54;
  const seed=h-Math.floor(h);
  const r=.28+(C.diskOuter-.37)*((i+.35)/54);
  const length=.07+.30*seed;
  const points=[];
  for(let j=0;j<=18;j++) {
    const a=j/18*length;
    points.push(new THREE.Vector3(r*Math.cos(a),.061,r*Math.sin(a)));
  }
  const geometry=new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),20,.0035,4,false);
  const heat=1-r/C.diskOuter;
  const color=new THREE.Color().setRGB(.42+.30*heat,.20+.53*heat,.11+.85*heat);
  const mesh=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({
    color,transparent:true,opacity:.27+seed*.20,depthWrite:false,
    blending:THREE.AdditiveBlending,
  }));
  dwarfGroup.add(mesh);
  arcs.push({mesh,r,phase:seed*TAU,omega:diskOmega(r)});
}
function diskOmega(r) { window.__bfTrace?.add(362);
  return Math.min(C.diskOmegaMax,C.diskOmegaOuter*Math.pow(C.diskOuter/r,1.5));
}

let rngState=20260908;
function random() { window.__bfTrace?.add(367);
  rngState=(1664525*rngState+1013904223)>>>0;
  return rngState/4294967296;
}
const starsP=[],starsC=[];
for(let i=0;i<390;i++) {
  const a=random()*TAU,u=random()*2-1,r=70+random()*30;
  const s=Math.sqrt(1-u*u);
  starsP.push(r*s*Math.cos(a),r*u,r*s*Math.sin(a));
  const b=.12+random()*.23;
  starsC.push(b*.83,b*.88,b);
}
const starGeometry=new THREE.BufferGeometry();
starGeometry.setAttribute('position',new THREE.Float32BufferAttribute(starsP,3));
starGeometry.setAttribute('color',new THREE.Float32BufferAttribute(starsC,3));
scene.add(new THREE.Points(starGeometry,new THREE.PointsMaterial({
  vertexColors:true,size:.95,sizeAttenuation:false,transparent:true,opacity:.74,depthWrite:false,
})));

const nebulaVertex=`
  varying vec2 vUv;
  void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}
`;
const nebulaFragment=`
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){
    vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),
      mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);
  }
  void main(){
    vec2 p=(vUv-.5)*2.;
    float cloud=.55*noise(vUv*3.1)+.30*noise(vUv*6.3+4.7)+.15*noise(vUv*12.7+9.2);
    float distortedRadius=dot(p,p)*(.82+.30*noise(vUv*2.4+13.));
    float radial=smoothstep(1.,.20,distortedRadius);
    float wisps=smoothstep(.40,.70,cloud+.14*sin(p.x*4.2-p.y*2.1));
    float alpha=uOpacity*radial*(.22+.78*wisps);
    gl_FragColor=vec4(uColor*(.68+.82*cloud),alpha);
    #include <colorspace_fragment>
  }
`;
const nebulaMeshes=[];
for(const spec of [
  {position:[-17,12,-36],scale:[126,68],color:0x334f9c,opacity:.76,rotation:-.18},
  {position:[20,-13,-39],scale:[132,72],color:0x9a3d69,opacity:.63,rotation:.31},
  {position:[6,23,-43],scale:[112,58],color:0x3b8294,opacity:.49,rotation:-.42},
  {position:[-27,-18,-47],scale:[104,56],color:0x704d9a,opacity:.42,rotation:.22},
]) {
  const material=new THREE.ShaderMaterial({
    uniforms:{uColor:{value:new THREE.Color(spec.color)},uOpacity:{value:spec.opacity}},
    vertexShader:nebulaVertex,fragmentShader:nebulaFragment,transparent:true,
    depthWrite:false,depthTest:false,blending:THREE.AdditiveBlending,
  });
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(spec.scale[0],spec.scale[1]),material);
  mesh.position.set(...spec.position);
  mesh.userData.rotation=spec.rotation;
  mesh.renderOrder=-10;
  scene.add(mesh);
  nebulaMeshes.push(mesh);
}

let currentTime=0;
let playing=false;
let startWall=0;
function seek(seconds) { window.__bfTrace?.add(434);
  const t=clamp(Number(seconds)||0,0,C.duration);
  currentTime=t;
  clockUniform.value=t;
  binary.rotation.y=C.orbitInitial+C.orbitRate*t;
  for(const particle of launchParticles) {
    const cycle=(t/.92+particle.phase)%1;
    const u=.235*ease(cycle);
    const target=stream.getPointAt(u);
    particle.mesh.position.lerpVectors(particle.start,target,ease(cycle));
    const envelope=Math.sin(Math.PI*cycle);
    particle.mesh.position.y+=Math.sin(t*7.3+particle.angle)*particle.wobble*envelope;
    particle.mesh.position.z+=Math.cos(t*6.1+particle.angle)*particle.wobble*envelope;
    particle.mesh.material.opacity=.12+.62*envelope*envelope;
    particle.mesh.scale.setScalar(.65+.65*envelope);
  }
  for(let i=0;i<tracers.length;i++) {
    const age=(t+i/tracers.length*C.tracerLifetime)%C.tracerLifetime;
    const alpha=smooth(0,.11,age)*(1-smooth(C.tracerLifetime-.25,C.tracerLifetime,age));
    if(age<C.streamTransit) {
      const u=age/C.streamTransit;
      tracers[i].position.copy(stream.getPointAt(u));
      tracers[i].position.y+=.009*Math.sin(i*2.4);
    } else {
      const elapsed=age-C.streamTransit;
      const r=C.impactRadius-.015*elapsed;
      const a=C.impactTheta-diskOmega(C.impactRadius)*elapsed;
      tracers[i].position.set(cx+r*Math.cos(a),impact.y+.033*smooth(0,.20,elapsed),r*Math.sin(a));
    }
    tracers[i].material.opacity=alpha*(.50+.25*(.5+.5*Math.sin(i*4.31)));
  }
  for(const arc of arcs) arc.mesh.rotation.y=arc.omega*t-arc.phase;
  const q=ease(clamp((t-C.cameraStart)/(C.cameraEnd-C.cameraStart),0,1));
  const az=.12+C.cameraArcDegrees*Math.PI/180*q;
  const elevation=C.cameraElevationDegrees*Math.PI/180;
  const radius=C.cameraRadius*(1-C.cameraPush*q);
  const target=new THREE.Vector3(-.32,0,.10);
  camera.position.set(
    target.x+radius*Math.cos(elevation)*Math.sin(az),
    target.y+radius*Math.sin(elevation),
    target.z+radius*Math.cos(elevation)*Math.cos(az),
  );
  camera.lookAt(target);
  for(const nebula of nebulaMeshes) {
    nebula.lookAt(camera.position);
    nebula.rotateZ(nebula.userData.rotation);
  }
  scene.updateMatrixWorld(true);
  renderer.render(scene,camera);
}
function diagnostics() { window.__bfTrace?.add(484);
  const d=donorGroup.getWorldPosition(new THREE.Vector3());
  const w=dwarfGroup.getWorldPosition(new THREE.Vector3());
  const tip=binary.localToWorld(new THREE.Vector3(donorTip,0,0));
  const elongation=tip.clone().sub(d).normalize();
  const companionDirection=w.clone().sub(d).normalize();
  const gl=renderer.getContext(),debug=gl.getExtension('WEBGL_debug_renderer_info');
  const projected=p=>{
    const q=p.clone().project(camera);
    return [(q.x+1)*C.width/2,(1-q.y)*C.height/2,q.z];
  };
  const bounds=[];
  for(let i=0;i<donorPositions.count;i+=33) {
    bounds.push(projected(donor.localToWorld(new THREE.Vector3().fromBufferAttribute(donorPositions,i))));
  }
  for(let i=0;i<128;i++) {
    const a=i/128*TAU;
    bounds.push(projected(dwarfGroup.localToWorld(new THREE.Vector3(C.diskOuter*Math.cos(a),0,C.diskOuter*Math.sin(a)))));
  }
  return {
    time:currentTime,parameters:C,
    renderer:debug?gl.getParameter(debug.UNMASKED_RENDERER_WEBGL):gl.getParameter(gl.RENDERER),
    donorPosition:d.toArray(),whiteDwarfPosition:w.toArray(),
    barycenter:d.clone().multiplyScalar(C.donorMass).addScaledVector(w,C.dwarfMass)
      .divideScalar(C.donorMass+C.dwarfMass).toArray(),
    separation:d.distanceTo(w),tidalAlignmentDot:elongation.dot(companionDirection),
    impactRadius:impact.clone().sub(new THREE.Vector3(cx,impact.y,0)).length(),
    streamStart:stream.getPointAt(0).toArray(),streamEnd:stream.getPointAt(1).toArray(),
    donorScreen:projected(d),whiteDwarfScreen:projected(w),
    projectedBounds:{
      minX:Math.min(...bounds.map(p=>p[0])),maxX:Math.max(...bounds.map(p=>p[0])),
      minY:Math.min(...bounds.map(p=>p[1])),maxY:Math.max(...bounds.map(p=>p[1])),
    },
    diskRates:{innerRadius:.36,innerRadiansPerSecond:diskOmega(.36),
      outerRadius:1.3,outerRadiansPerSecond:diskOmega(1.3),radialDriftPerSecond:.015},
    camera:{position:camera.position.toArray(),target:[-.32,0,.10],fov:camera.fov},
    orbitalAngle:binary.rotation.y,
    arcPackets:arcs.filter((_,i)=>[4,45].includes(i)).map(a=>({
      radius:a.r,angle:a.phase-a.omega*currentTime,omega:a.omega,
    })),
    tracerPositions:tracers.map(p=>({position:p.position.toArray(),alpha:p.material.opacity})),
  };
}
window.reconstruction={
  ready:true,
  pause(){playing=false;},
  seek,
  play(){playing=true;startWall=performance.now()/1000-currentTime;},
  diagnostics,
  async streamFrame(index,fps=24){
    seek(index/fps);
    const gl=renderer.getContext();
    const rgba=new Uint8Array(C.width*C.height*4);
    gl.readPixels(0,0,C.width,C.height,gl.RGBA,gl.UNSIGNED_BYTE,rgba);
    const response=await fetch('/__frame?index='+index,{method:'POST',body:rgba});
    if(!response.ok) throw new Error('Frame transfer failed: '+response.status);
  },
};
function animate() { window.__bfTrace?.add(542);
  if(playing) {
    const t=performance.now()/1000-startWall;
    seek(t);
    if(t>=C.duration) playing=false;
  }
  requestAnimationFrame(animate);
}
seek(0);
animate();
