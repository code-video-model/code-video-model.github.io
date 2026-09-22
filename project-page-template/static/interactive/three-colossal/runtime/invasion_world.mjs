import * as THREE from './vendor/three.module.js';
import {DURATION,clipTime} from './clip-contract.mjs';

const V=a=>new THREE.Vector3(...a),Y=V([0,1,0]);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const smooth=(a,b,t)=>{const q=clamp((t-a)/(b-a));return q*q*(3-2*q);};
const quintic=q=>q*q*q*(10+q*(-15+6*q));
const isPrimary=config=>config.id==='main-colossal';

export async function createInvasionWorld(scene,data,mainGeometry,materials){
  const ruins=await(await fetch('./ruins.json')).json();
  const staticMeshes=[];
  const colors={wall:0xa6aaa5,roof:0x696e6a,wood:0x625b51,rubble:0x8c918a};
  for(const [kind,source] of Object.entries(ruins.meshes)){
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(source.positions,3));
    geometry.setIndex(source.indices);geometry.computeVertexNormals();geometry.computeBoundingBox();
    const object=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial({color:colors[kind],roughness:1,side:THREE.DoubleSide}));
    object.castShadow=object.receiveShadow=true;scene.add(object);staticMeshes.push(object);
  }
  const configs=data.invasion.giants;
  const rigs=[];
  const footBind=[[-4.7,1.8,.2],[4.7,1.8,.2]];
  function buildRig(config,source){
    const group=new THREE.Group();scene.add(group);
    const geometry=new THREE.BufferGeometry();
    geometry.setAttribute('position',new THREE.Float32BufferAttribute(source.positions,3));
    geometry.setIndex(source.indices);geometry.computeVertexNormals();
    const bones=[new THREE.Bone(),new THREE.Bone()];
    bones[0].name=config.id+'-torso';bones[1].name='pelvis';bones[1].position.set(0,27,0);bones[0].add(bones[1]);
    const rest=[V([0,0,0]),V([0,27,0])];
    const legIndices=[],armIndices=[];
    for(const sign of [-1,1]){
      const list=[];
      for(const point of [[sign*3.5,25,0],[sign*4.4,11,-.6],[sign*4.7,1.8,.2]]){
        const bone=new THREE.Bone();bone.position.copy(V(point));bones[0].add(bone);
        list.push(bones.length);bones.push(bone);rest.push(V(point));
      }
      legIndices.push(list);
    }
    for(const sign of [-1,1]){
      const list=[];
      for(const point of [[sign*config.shoulderX,44,-.4],[sign*config.elbowX,config.elbowY,.1]]){
        const bone=new THREE.Bone();bone.position.copy(V(point));bones[0].add(bone);
        list.push(bones.length);bones.push(bone);rest.push(V(point));
      }
      armIndices.push(list);
    }
    const weights=[],indices=[],anchorVertices=[],soleIndices=[[],[]];
    for(let i=0;i<source.positions.length;i+=3){
      const [x,y,z]=source.positions.slice(i,i+3),side=x<0?0:1,ax=Math.abs(x);
      const high=smooth(36,42,y);
      const inner=config.shape==='main'?6.6+(9.7-6.6)*high:config.shoulderX-2+1.8*high;
      const outer=config.shape==='main'?8.5+(11-8.5)*high:config.shoulderX+.3+high;
      const arm=smooth(inner,outer,ax)*(1-smooth(44,47,y));
      const leg=(1-smooth(23,28,y))*(1-smooth(6.8,8.2,ax))*(1-arm);
      const foot=1-smooth(1.8,3.8,y),thigh=smooth(9,13,y);
      const elbow=1-smooth(config.elbowY-2,config.elbowY+2,y);
      const remaining=Math.max(0,1-arm-leg),pelvis=(1-smooth(29,39,y))*remaining;
      const candidates=[
        [armIndices[side][0],arm*(1-elbow)],[armIndices[side][1],arm*elbow],
        [legIndices[side][0],leg*(1-foot)*thigh],[legIndices[side][1],leg*(1-foot)*(1-thigh)],
        [legIndices[side][2],leg*foot],[1,pelvis],[0,remaining-pelvis],
      ].filter(x=>x[1]>1e-8).sort((a,b)=>b[1]-a[1]).slice(0,4);
      const total=candidates.reduce((s,x)=>s+x[1],0);
      while(candidates.length<4)candidates.push([0,0]);
      indices.push(...candidates.map(x=>x[0]));weights.push(...candidates.map(x=>x[1]/total));
      if(y<.001)soleIndices[side].push(i/3);
      if(isPrimary(config)&&Math.hypot(x-data.anchor[0],y-data.anchor[1],z-(data.anchor[2]-.25))<.45){
        anchorVertices.push({index:i/3,position:[x,y,z],bones:candidates.map(x=>x[0]),weights:candidates.map(x=>x[1]/total)});
      }
    }
    geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4));
    geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
    const material=new THREE.MeshStandardMaterial({color:config.color,roughness:.96});
    const skin=new THREE.SkinnedMesh(geometry,material);
    skin.add(bones[0]);group.add(skin);skin.bind(new THREE.Skeleton(bones));
    skin.castShadow=skin.receiveShadow=true;skin.frustumCulled=false;
    const scale=config.height/60;group.scale.setScalar(scale);
    if(config.shape!=='main'){
      const headZ=config.shape==='hunched'?-1.2:-.3;
      const dark=new THREE.MeshStandardMaterial({color:config.shape==='stocky'?0x4e4a42:0x625e54,roughness:1});
      const hair=new THREE.Mesh(new THREE.SphereGeometry(1,16,10),dark);
      hair.position.set(0,58,headZ+.5);hair.scale.set(config.shape==='gaunt'?3.2:3.8,1.8,3.2);
      group.add(hair);hair.castShadow=true;
      for(const x of [-1.2,1.2]){
        const eye=new THREE.Mesh(new THREE.SphereGeometry(.42,10,8),dark);eye.position.set(x,55.3,headZ-3);eye.scale.z=.35;group.add(eye);
      }
      const mouth=new THREE.Mesh(new THREE.BoxGeometry(1.8,.45,.25),dark);mouth.position.set(0,52.8,headZ-3.0);group.add(mouth);
    }
    return {config,group,skin,bones,rest,legIndices,armIndices,scale,anchorVertices,
      soleIndices:soleIndices.map(list=>list.filter((_,i)=>i%Math.max(1,Math.floor(list.length/32))===0)),
      segments:[],feet:[]};
  }
  for(const config of configs){
    const source=config.shape==='main'?mainGeometry:await(await fetch('./'+config.mesh)).json();
    rigs.push(buildRig(config,source));
  }
  function worldPoint(rig,p){return p.clone().multiplyScalar(rig.scale).add(rig.group.position);}
  function addSegment(rig,a,b,r,id){
    rig.segments.push({a:worldPoint(rig,a).toArray(),b:worldPoint(rig,b).toArray(),r:r*rig.scale,id});
  }
  function updateRig(rig,t){
    const {config,bones,rest,scale}=rig;
    rig.group.position.copy(V(config.origin)).addScaledVector(V(config.velocity),t);
    rig.segments=[];rig.feet=[];
    const u=t/config.period+config.phase,angle=u*Math.PI*2;
    const sway=.30*Math.sin(angle*2),heave=-.45+.12*Math.cos(angle*2);
    bones[1].position.copy(rest[1]).add(V([sway,heave,0]));
    bones[1].quaternion.setFromAxisAngle(V([0,0,1]),.012*Math.sin(angle*2));
    const localVelocity=V(config.velocity).divideScalar(scale);
    for(let side=0;side<2;side++){
      const sign=side?1:-1,phaseValue=u+side*.5,cycle=Math.floor(phaseValue),phase=phaseValue-cycle;
      const duty=data.invasion.gaitDuty,stance=phase<duty,q=stance?0:(phase-duty)/(1-duty);
      const advance=stance?0:quintic(q);
      const pitch=stance?0:-.12*Math.sin(q*Math.PI*2);
      const lift=stance?0:config.lift*Math.sin(q*Math.PI)**2+5*Math.abs(Math.sin(pitch));
      const foot=V(footBind[side]).addScaledVector(localVelocity,config.period*(duty/2-phase+advance));
      foot.y+=lift;
      const hip=V([sign*3.5+sway,25+heave+sign*.10*Math.sin(angle*2),0]);
      const [hi,ki,fi]=rig.legIndices[side];
      const upper=rest[hi].distanceTo(rest[ki]),lower=rest[ki].distanceTo(rest[fi]);
      const axis=foot.clone().sub(hip),distance=Math.min(upper+lower-1e-5,axis.length());axis.normalize();
      const along=(upper*upper-lower*lower+distance*distance)/(2*distance);
      const bend=V([0,0,-1]).addScaledVector(axis,axis.z).normalize();
      const knee=hip.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,upper*upper-along*along)));
      bones[hi].position.copy(hip);bones[ki].position.copy(knee);bones[fi].position.copy(foot);
      bones[hi].quaternion.setFromUnitVectors(rest[ki].clone().sub(rest[hi]).normalize(),knee.clone().sub(hip).normalize());
      bones[ki].quaternion.setFromUnitVectors(rest[fi].clone().sub(rest[ki]).normalize(),foot.clone().sub(knee).normalize());
      bones[fi].quaternion.setFromAxisAngle(V([1,0,0]),pitch);
      const contact=V([sign*4.7,0,-1.05]).sub(rest[fi]).applyQuaternion(bones[fi].quaternion).add(foot);
      rig.feet.push({side:side?'right':'left',phase,cycle,stance,liftM:lift*scale,toePitchRadians:pitch,
        contact:worldPoint(rig,contact).toArray(),ankle:worldPoint(rig,foot).toArray(),knee:worldPoint(rig,knee).toArray(),
        hip:worldPoint(rig,hip).toArray()});
      addSegment(rig,hip,knee,config.shape==='gaunt'?2.5:3.3,'thigh-'+side);
      addSegment(rig,knee,foot,2.15,'shin-'+side);
      addSegment(rig,foot.clone().add(V([0,-1.0,-2.0])),foot.clone().add(V([0,-1.0,1.3])),1.65,'foot-'+side);
      const [si,ei]=rig.armIndices[side];
      const shoulder=rest[si].clone();
      let theta=.24*Math.sin(angle+side*Math.PI);
      if(isPrimary(config)&&side===1){
        const guarded=smooth(2,2.8,t)*(1-smooth(4.2,5,t));
        theta=theta*(1-guarded)+(.18+.06*Math.sin(angle+side*Math.PI))*guarded;
      }
      const upperQ=new THREE.Quaternion().setFromAxisAngle(V([1,0,0]),theta);
      const foreQ=upperQ.clone().multiply(new THREE.Quaternion().setFromAxisAngle(V([1,0,0]),.10+.07*Math.cos(angle+side*Math.PI)));
      const elbow=rest[ei].clone().sub(shoulder).applyQuaternion(upperQ).add(shoulder);
      const wrist=V([sign*config.wristX,config.wristY,.4]).sub(rest[ei]).applyQuaternion(foreQ).add(elbow);
      bones[si].position.copy(shoulder);bones[si].quaternion.copy(upperQ);
      bones[ei].position.copy(elbow);bones[ei].quaternion.copy(foreQ);
      addSegment(rig,shoulder,elbow,config.shape==='main'?2.8:2.3,'upper-arm-'+side);
      addSegment(rig,elbow,wrist,config.shape==='main'?2.0:1.6,'forearm-'+side);
    }
    addSegment(rig,V([0,25,0]),V([0,44,0]),config.shape==='main'?8.3:config.shape==='gaunt'?5.7:8.0,'torso-envelope');
    addSegment(rig,V([0,51,0]),V([0,57,-.3]),3.5,'head-neck-envelope');
    rig.group.updateMatrixWorld(true);rig.skin.skeleton.update();
  }
  const steamGroup=new THREE.Group();scene.add(steamGroup);
  const emitters=[[-10.5,45,3],[11,47,1],[-4.3,55,2.5],[-2,59,0],[-5,38,4.8],[-7,30,3.5],[6,32,3.5]];
  const particles=[];
  const steamGeometry=new THREE.IcosahedronGeometry(1,2);
  for(let i=0;i<70;i++){
    const material=new THREE.ShaderMaterial({
      transparent:true,depthWrite:false,blending:THREE.NormalBlending,
      uniforms:{opacity:{value:0},ambientRadiance:{value:new THREE.Color()},
        sunRadiance:{value:new THREE.Color()},sunDirection:{value:V([-45,68,60]).normalize()}},
      vertexShader:`varying vec3 normalView;varying vec3 towardView;varying vec3 towardWorld;
        void main(){vec4 view=modelViewMatrix*vec4(position,1.0);
          normalView=normalize(normalMatrix*normal);towardView=normalize(-view.xyz);
          towardWorld=normalize(cameraPosition-(modelMatrix*vec4(position,1.0)).xyz);
          gl_Position=projectionMatrix*view;}`,
      fragmentShader:`uniform float opacity;uniform vec3 ambientRadiance;uniform vec3 sunRadiance;
        uniform vec3 sunDirection;varying vec3 normalView;varying vec3 towardView;varying vec3 towardWorld;
        void main(){float facing=max(0.0,dot(normalize(normalView),normalize(towardView)));
          float cosine=dot(normalize(towardWorld),sunDirection);
          vec3 reflected=vec3(0.87,0.90,0.87)*(ambientRadiance+sunRadiance*(0.55+0.45*cosine*cosine));
          gl_FragColor=vec4(reflected,opacity*pow(facing,1.5));
          #include <colorspace_fragment>
        }`,
    });
    const object=new THREE.Mesh(steamGeometry,material);steamGroup.add(object);
    particles.push({object,emitter:emitters[i%emitters.length],phase:i/70*3.4});
  }
  let steamEnabled=true,currentT=0;
  function update(t){
    t=clipTime(t);
    currentT=t;
    for(const rig of rigs)updateRig(rig,t);
    for(let i=0;i<particles.length;i++){
      const particle=particles[i],life=3.4;
      const age=((t+particle.phase)%life+life)%life,birth=t-age;
      particle.object.position.copy(V(particle.emitter)).addScaledVector(V(data.invasion.mainVelocity),birth)
        .add(V([age*.55+Math.sin(i*2.1+age)*.13,age*1.8,age*.35]));
      const size=.55+age*.53;particle.object.scale.set(size*.7,size*1.65,size);
      const nape=V(data.nape.center).addScaledVector(V(data.invasion.mainVelocity),t);
      const protectedFade=smooth(3.8,5.2,particle.object.position.distanceTo(nape));
      const uniforms=particle.object.material.uniforms;
      uniforms.opacity.value=.30*Math.sin(Math.PI*age/life)**2*protectedFade;
      uniforms.ambientRadiance.value.setRGB(0,0,0);uniforms.sunRadiance.value.setRGB(0,0,0);
      for(const light of scene.children){
        if(light.isHemisphereLight){
          uniforms.ambientRadiance.value.add(light.color.clone().multiplyScalar(light.intensity*.34))
            .add(light.groundColor.clone().multiplyScalar(light.intensity*.10));
        }else if(light.isDirectionalLight){
          uniforms.sunRadiance.value.add(light.color.clone().multiplyScalar(light.intensity*.21));
          uniforms.sunDirection.value.copy(light.position).sub(light.target.position).normalize();
        }
      }
    }
    steamGroup.visible=steamEnabled;
  }
  function diagnostics(){
    return {t:currentT,giants:rigs.map(rig=>({id:rig.config.id,heightM:rig.config.height,
      root:rig.group.position.toArray(),velocity:rig.config.velocity,feet:rig.feet,
      segments:rig.segments,pelvis:worldPoint(rig,rig.bones[1].position).toArray()})),
      mainAnchorWorld:V(data.anchor).addScaledVector(V(data.invasion.mainVelocity),currentT).toArray(),
      napeWorld:V(data.nape.center).addScaledVector(V(data.invasion.mainVelocity),currentT).toArray(),
      steamEnabled,steamParticles:particles.map(p=>({position:p.object.position.toArray(),opacity:p.object.material.uniforms.opacity.value}))};
  }
  function gaitEvidence(){
    const rows=[],plants=new Map();let maxDrift=0,minSole=Infinity;
    for(let i=0;i<=DURATION*120;i++){
      const t=i/120;update(t);
      const row={t,giants:[]};
      for(const rig of rigs){
        const position=rig.skin.geometry.getAttribute('position');
        const feet=rig.feet.map((foot,side)=>{
          const actualSoles=rig.soleIndices[side].map(index=>{
            const p=new THREE.Vector3().fromBufferAttribute(position,index);
            rig.skin.applyBoneTransform(index,p);rig.skin.localToWorld(p);return p;
          });
          const minimum=Math.min(...actualSoles.map(p=>p.y));minSole=Math.min(minSole,minimum);
          let drift=0;
          if(foot.stance){
            const key=rig.config.id+side+':'+foot.cycle;
            if(!plants.has(key))plants.set(key,V(foot.contact));
            drift=V(foot.contact).distanceTo(plants.get(key));maxDrift=Math.max(maxDrift,drift);
          }
          return {...foot,actualRenderedSoleMinimumY:minimum,stanceWorldDriftM:drift};
        });
        row.giants.push({id:rig.config.id,root:rig.group.position.toArray(),feet});
      }
      rows.push(row);
    }
    return {schema:'invasion-v5-planted-gait-evidence-v1',samplingHz:120,
      mainTravelM:V(configs[0].velocity).length()*DURATION,
      roots:configs.map(c=>({id:c.id,height:c.height,velocity:c.velocity,travelM:V(c.velocity).length()*DURATION,period:c.period,phase:c.phase})),
      maximumPlantedFootContactDriftM:maxDrift,minimumSampledSkinnedSoleY:minSole,
      method:'World stance contact and actual skinned sole-vertex samples; absolute-time IK with alternating fixed-world plants, swing toe pitch, knee flexion and counter-swinging arms.',
      rows};
  }
  return {rigs,staticMeshes,ruinSources:ruins.meshes,colliders:ruins.colliders,update,diagnostics,
    gaitEvidence,
    setSteam(value){steamEnabled=value;steamGroup.visible=value;},
    anchorSkinEvidence:{vertices:rigs[0].anchorVertices,
      allTorsoOnly:rigs[0].anchorVertices.every(v=>v.weights.every((w,i)=>w<1e-8||v.bones[i]===0)),
      patchRadiusM:.45,affineTranslation:true,nonAffineUpperAnchorMotion:false},
  };
}
