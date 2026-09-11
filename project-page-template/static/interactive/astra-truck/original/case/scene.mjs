import { cameraPose } from './camera.mjs';

export function buildScene(THREE, spec) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xd6dee0);
  scene.fog = new THREE.Fog(0xd6dee0, 30, 75);
  let seed = 3041;
  const rand = () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
  const material = (color, roughness = .85, metalness = 0) =>
    new THREE.MeshStandardMaterial({color, roughness, metalness});
  const mats = {
    black: material(0x202125), rubber: material(0x23262a), tread: material(0x292b2b),
    iron: material(0x393831, .9, .3), rust: material(0x594438),
    cream: material(0xc9cac0, .62, .3), chrome: material(0x979e96, .43, .55),
    darkGlass: material(0x344950, .24, .3), glass: material(0x567b7f, .3, .2),
    teal: material(0x58adad, .84, .14), faded: material(0xa9d1cc, .87, .1),
    lamp: material(0xdfdfc9, .3), red: material(0x893129, .48),
    pole: material(0x272e31, .7, .25), bark: material(0x5b5a4a),
    road: material(0x777e7d), yellow: material(0xc7ae48), table: material(0xced4d1, .62, .2)
  };
  const texture = (w, h, painter) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    painter(ctx, w, h);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  };
  const wood = texture(1024, 192, (ctx, w, h) => {
    ctx.fillStyle = '#98918d'; ctx.fillRect(0,0,w,h);
    for (let i=0;i<1300;i++) {
      const y=rand()*h, x=rand()*w, len=rand()*w*.6+20;
      ctx.strokeStyle=`rgba(${rand()>.5?'217,208,201':'73,65,61'},${.03+rand()*.17})`;
      ctx.lineWidth=.3+rand()*1.8;
      ctx.beginPath(); ctx.moveTo(x,y);
      ctx.bezierCurveTo(x+len*.2,y-3,x+len*.7,y+4,x+len,y+rand()*4-2); ctx.stroke();
    }
    for (let j=0;j<6;j++) {
      const x=rand()*w,y=rand()*h;
      for (let k=1;k<15;k++) {
        ctx.strokeStyle=`rgba(213,203,196,${.30-k*.01})`;
        ctx.lineWidth=1;ctx.beginPath();ctx.ellipse(x,y,k*17,k*1.2,0,0,Math.PI*2);ctx.stroke();
      }
    }
    for(let i=0;i<90;i++) {
      ctx.fillStyle='rgba(210,207,198,.18)';
      ctx.fillRect(rand()*w,rand()*h,rand()*32+2,rand()*3+.4);
    }
  });
  const chipped = texture(1024, 256, (ctx,w,h) => {
    ctx.fillStyle='#78c8d4';ctx.fillRect(0,0,w,h);
    for(let i=0;i<2200;i++) {
      const x=rand()*w,y=rand()*h,edge=Math.min(y,h-y)/h;
      if(rand()> .65-edge) continue;
      const r=rand()*13+1;
      ctx.fillStyle=rand()>.35?'#59453f':'#847366';
      ctx.beginPath();ctx.moveTo(x-r,y);
      for(let k=0;k<7;k++) {const a=k*Math.PI*2/7, rr=r*(.4+rand());ctx.lineTo(x+Math.cos(a)*rr,y+Math.sin(a)*rr*1.2);}
      ctx.closePath();ctx.fill();
    }
    for(let i=0;i<900;i++){
      ctx.fillStyle=rand()>.5?'rgba(207,227,211,.18)':'rgba(44,65,61,.16)';
      ctx.fillRect(rand()*w,rand()*h,rand()*16+.5,rand()*2+.2);
    }
  });
  const concrete = texture(1024,1024,(ctx,w,h)=>{
    ctx.fillStyle='#a7b4c1';ctx.fillRect(0,0,w,h);
    for(let i=0;i<220;i++){
      ctx.fillStyle=`rgba(${rand()>.5?'218,230,234':'76,92,108'},.025)`;
      ctx.beginPath();ctx.ellipse(rand()*w,rand()*h,rand()*140+15,rand()*70+15,rand()*6.28,0,7);ctx.fill();
    }
    for(let i=0;i<65000;i++){
      const v=rand()>.45?225:68;
      ctx.fillStyle=`rgba(${v},${v},${v},${rand()*.085})`;
      ctx.fillRect(rand()*w,rand()*h,1+rand()*5,1+rand()*3);
    }
    ctx.strokeStyle='#6f7a81';ctx.lineWidth=5;
    ctx.strokeRect(1,1,w-2,h-2);
    ctx.strokeStyle='rgba(224,231,228,.45)';ctx.lineWidth=1;ctx.strokeRect(4,4,w-8,h-8);
    for(let i=0;i<20;i++){
      ctx.fillStyle='rgba(61,77,70,.055)';
      ctx.beginPath();ctx.ellipse(rand()*w,rand()*h,rand()*40,rand()*15,rand()*4,0,7);ctx.fill();
    }
  });
  concrete.wrapS=concrete.wrapT=THREE.RepeatWrapping;concrete.repeat.set(38,38);
  const woodMat=new THREE.MeshStandardMaterial({map:wood,roughness:.96,color:0xf0edf2});
  const chipMat=new THREE.MeshStandardMaterial({map:chipped,roughness:.92,metalness:.1});
  const concreteMat=new THREE.MeshStandardMaterial({map:concrete,roughness:1,color:0xc4d0e5});
  const boxGeo=new THREE.BoxGeometry(1,1,1);
  function box(x,y,z,w,h,d,mat,parent=scene) {
    const m=new THREE.Mesh(boxGeo,mat);m.position.set(x,y,z);m.scale.set(w,h,d);
    m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function mesh(geo,mat,x,y,z,parent=scene) {
    const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;
  }
  function cyl(x,y,z,r,h,mat,axis='y',segments=24,parent=scene) {
    const m=mesh(new THREE.CylinderGeometry(r,r,h,segments),mat,x,y,z,parent);
    if(axis==='z')m.rotation.x=Math.PI/2;
    if(axis==='x')m.rotation.z=Math.PI/2;
    return m;
  }
  function bar(a,b,r,mat,parent=scene) {
    const A=new THREE.Vector3(...a),B=new THREE.Vector3(...b),delta=B.clone().sub(A);
    const m=cyl(...A.clone().add(B).multiplyScalar(.5).toArray(),r,delta.length(),mat,'y',8,parent);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;
  }
  function roundBox(x,y,z,w,h,d,r,mat,parent=scene) {
    const s=new THREE.Shape(),X=w/2,Y=h/2;
    s.moveTo(-X+r,-Y);s.lineTo(X-r,-Y);s.quadraticCurveTo(X,-Y,X,-Y+r);
    s.lineTo(X,Y-r);s.quadraticCurveTo(X,Y,X-r,Y);s.lineTo(-X+r,Y);
    s.quadraticCurveTo(-X,Y,-X,Y-r);s.lineTo(-X,-Y+r);s.quadraticCurveTo(-X,-Y,-X+r,-Y);
    const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.028,bevelThickness:.025,bevelSegments:2,steps:1,curveSegments:6});
    g.translate(0,0,-d/2);return mesh(g,mat,x,y,z,parent);
  }
  const cabPaint=texture(512,512,(ctx,w,h)=>{
    ctx.fillStyle='#76c4c8';ctx.fillRect(0,0,w,h);
    for(let i=0;i<2500;i++){
      const x=rand()*w,y=rand()*h,edge=Math.min(x,w-x,y,h-y);
      ctx.fillStyle=edge<30&&rand()>.55?'rgba(76,63,52,.58)':'rgba(187,208,192,.14)';
      ctx.fillRect(x,y,1+rand()*5,1+rand()*6);
    }
    for(let j=0;j<50;j++){
      ctx.fillStyle='rgba(79,92,76,.075)';ctx.fillRect(rand()*w,rand()*h,1+rand()*3,20+rand()*70);
    }
  });
  mats.teal.map=cabPaint;mats.teal.color.set(0xffffff);
  const hemi=new THREE.HemisphereLight(0xe2eeff,0x91908a,2.65);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xfff8da,1.5);sun.position.set(-7,12,6);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-13,right:13,top:13,bottom:-13,near:1,far:38});
  sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;sun.shadow.radius=4;scene.add(sun);
  mesh(new THREE.PlaneGeometry(90,90),concreteMat,0,-.025,0).rotation.x=-Math.PI/2;
  box(-12,-.035,-12,9,.04,65,mats.road);
  box(-7.65,.04,-12,.16,.12,65,material(0xd0d1c7));
  for(let i=-3;i<5;i++)box(-10,.006,i*4,.12,.013,2,material(0xd9c48c));

  const truck=new THREE.Group();scene.add(truck);
  // Longitudinal x axis: old rounded nose at negative x, rear lifting hardware at positive x.
  for(const z of [-.68,.68]){
    box(.05,1.03,z,7.25,.22,.15,mats.iron,truck);
    for(let x=-2.7;x<3.8;x+=1.2) box(x,1.2,0,.1,.15,2.04,mats.iron,truck);
  }
  const axleXs=[-2.95,.72];
  for(const x of axleXs){
    cyl(x,.71,0,.095,2.42,mats.iron,'z',16,truck);
    mesh(new THREE.SphereGeometry(.23,12,8),mats.iron,x,.73,0,truck).scale.set(1,1,1.5);
    for(const z of [-.68,.68]){
      for(let j=0;j<4;j++)box(x,1.03-j*.035,z,1.38-j*.14,.029,.095,mats.rust,truck);
      bar([x-.48,.93,z],[x-.33,1.28,z],.045,mats.iron,truck);
    }
  }
  cyl(-.72,.78,0,.08,3.3,mats.iron,'x',16,truck);
  box(-1.02,.91,1.0,.91,.37,.4,mats.iron,truck);
  box(-1.8,1.0,1.13,.59,.11,.39,mats.rust,truck);
  const wheel = (worldX,z,rear=false) => {
    const truck=new THREE.Group();sceneTruck.add(truck);
    truck.position.x=worldX;truck.scale.x=1/1.25727198;
    const x=0;
    const R=rear?.76:.65, y=R, depth=rear?.36:.3, side=Math.sign(z);
    cyl(x,y,z,R*.95,depth,mats.rubber,'z',40,truck);
    const tire=mesh(new THREE.TorusGeometry(R*.76,R*.24,10,48),mats.rubber,x,y,z,truck);
    tire.scale.z=depth/(R*.48);
    for(let j=0;j<48;j++){
      const a=j*Math.PI*2/48;
      for(let k=-1;k<=1;k++){
        const t=box(x+Math.cos(a)*R*.963,y+Math.sin(a)*R*.963,z+k*depth*.26,.085,.055,depth*.29,mats.tread,truck);
        t.rotation.z=a-Math.PI/2;t.rotation.y=(k%2)*.12;
      }
    }
    const face=z+side*(depth*.5+.008);
    for(const r of [R*.88,R*.81,R*.65]){
      mesh(new THREE.TorusGeometry(r,.007,5,48),mats.tread,x,y,face,truck);
    }
    cyl(x,y,face,.445*(R/.76),.022,mats.cream,'z',40,truck);
    mesh(new THREE.TorusGeometry(R*.574,.034,8,40),mats.chrome,x,y,face+side*.022,truck);
    cyl(x,y,face+side*.025,R*.27,.07,mats.cream,'z',32,truck);
    for(let j=0;j<6;j++){
      const a=j*Math.PI/3;
      const hole=cyl(x+Math.sin(a)*R*.405,y+Math.cos(a)*R*.405,face+side*.019,R*.094,.012,mats.black,'z',18,truck);
      hole.scale.x=.9;hole.scale.y=1.2;
    }
    cyl(x,y,face+side*.078,R*.16,.14,mats.iron,'z',12,truck);
    for(let j=0;j<8;j++){
      const a=j*Math.PI/4;
      cyl(x+Math.sin(a)*R*.22,y+Math.cos(a)*R*.22,face+side*.067,.027,.037,mats.rust,'z',6,truck);
    }
    for(let j=0;j<38;j++){
      const a=rand()*6.283,r=R*(.3+rand()*.27);
      const dot=cyl(x+Math.sin(a)*r,y+Math.cos(a)*r,face+side*.025,.008+rand()*.015,.004,mats.rust,'z',5,truck);
      dot.scale.x=.4+rand()*1.2;
    }
  };
  const sceneTruck=truck;
  for(const side of [-1,1]){
    wheel(-2.95,side*1.04);
    wheel(.72,side*1.07,true);wheel(.72,side*.67,true);
    box(1.64,.71,side*.95,.065,1.02,.64,mats.rubber,truck).rotation.z=-.08;
  }
  cyl(2.13,.77,0,.56,.3,mats.rubber,'y',32,truck);
  cyl(2.13,.58,0,.27,.045,mats.iron,'y',24,truck);
  bar([1.63,.6,-.58],[2.68,.6,.58],.037,mats.iron,truck);
  // Cab shell, curved hood and open wheel arches.
  roundBox(-2.15,1.77,0,1.3,1.64,2.04,.18,mats.teal,truck);
  roundBox(-2.05,2.47,0,1.14,1.06,1.97,.18,mats.faded,truck);
  roundBox(-2.12,2.98,0,1.25,.14,2.14,.07,mats.faded,truck);
  roundBox(-3.21,1.84,0,1.16,.42,1.87,.16,mats.teal,truck);
  roundBox(-3.8,1.52,0,.18,.61,1.89,.08,mats.teal,truck);
  for(const side of [-1,1]){
    const z=side*1.042;
    const door=roundBox(-2.17,1.67,z,1.1,1.24,.042,.12,mats.teal,truck);
    const window=roundBox(-2.17,2.51,z+side*.009,.88,.7,.025,.07,mats.darkGlass,truck);
    roundBox(-2.18,2.51,z+side*.028,.75,.59,.009,.055,mats.glass,truck);
    bar([-2.31,2.23,z+side*.04],[-2.29,2.78,z+side*.04],.013,mats.faded,truck);
    box(-1.78,2.13,z+side*.045,.17,.033,.06,mats.chrome,truck);
    box(-1.63,1.25,z+side*.038,.15,.10,.015,mats.rust,truck);
    box(-2.04,.99,z+side*.08,.75,.12,.23,chipMat,truck);
    const shape=new THREE.Shape();
    shape.moveTo(-3.82,.94);shape.lineTo(-3.82,1.67);
    shape.quadraticCurveTo(-3.8,1.86,-3.6,1.86);shape.lineTo(-2.3,1.86);
    shape.lineTo(-2.29,.98);shape.lineTo(-2.29,.69);shape.lineTo(-2.32,.69);
    shape.absarc(-2.95,.65,.69,.02,Math.PI-.02,false);
    shape.lineTo(-3.82,.94);
    const g=new THREE.ExtrudeGeometry(shape,{depth:.16,bevelEnabled:true,bevelSize:.034,bevelThickness:.027,bevelSegments:2,steps:1,curveSegments:16});
    mesh(g,mats.teal,0,0,z-side*.08,truck);
    const arch=mesh(new THREE.TorusGeometry(.705,.045,8,36,Math.PI),mats.teal,-2.95,.65,z+side*.13,truck);
    box(-3.31,1.91,z+side*.021,.32,.04,.025,mats.chrome,truck);
    cyl(-3.965,1.44,side*.7,.15,.06,mats.chrome,'x',24,truck);
    cyl(-4.005,1.44,side*.7,.115,.026,mats.lamp,'x',24,truck);
    bar([-2.53,2.63,z],[-2.71,2.68,z+side*.33],.018,mats.chrome,truck);
    bar([-2.67,2.35,z],[-2.71,2.68,z+side*.33],.018,mats.chrome,truck);
    roundBox(-2.71,2.7,z+side*.33,.09,.29,.17,.028,mats.chrome,truck);
  }
  roundBox(-2.872,2.48,0,.036,.7,1.73,.04,mats.darkGlass,truck);
  const signTex=texture(256,320,(ctx,w,h)=>{
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#e8e9d9';ctx.beginPath();ctx.ellipse(128,87,72,79,0,0,7);ctx.fill();
    ctx.save();ctx.beginPath();ctx.ellipse(128,87,72,79,0,0,7);ctx.clip();
    ctx.fillStyle='#604458';ctx.fillRect(25,97,210,66);
    ctx.beginPath();ctx.moveTo(50,98);ctx.lineTo(75,67);ctx.lineTo(89,83);ctx.lineTo(117,50);ctx.lineTo(152,85);ctx.lineTo(177,74);ctx.lineTo(207,103);ctx.fill();
    ctx.fillStyle='#d4ddd6';ctx.fillRect(92,87,14,62);ctx.fillRect(135,95,16,48);ctx.restore();
    ctx.textAlign='center';ctx.fillStyle='#697c6c';
    ctx.font='25px Georgia';ctx.fillText('SAN PEDRO',128,201);
    ctx.font='31px Georgia';ctx.fillText('SQUARE',128,237);
    ctx.font='25px Georgia';ctx.fillText('MARKET',128,270);
    for(let i=0;i<350;i++){ctx.clearRect(rand()*w,rand()*h,rand()*4+1,rand()*3+1);}
  });
  const signMat=new THREE.MeshStandardMaterial({map:signTex,transparent:true,roughness:.94,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1});
  mesh(new THREE.PlaneGeometry(.46,.65),signMat,-2.48,1.64,1.245,truck);
  box(-2.904,2.48,0,.036,.66,.036,mats.faded,truck);
  for(const z of [-.42,.42])bar([-2.93,2.2,z-.2],[-2.93,2.38,z+.07],.012,mats.iron,truck);
  box(-3.94,.99,0,.16,.18,2.13,mats.rust,truck);
  for(let j=0;j<6;j++)box(-3.912,1.34+j*.055,0,.018,.015,1.04,mats.iron,truck);
  // The full orbit exposes the grille, both cab sides and the previously hidden rear window.
  for(const z of [-.57,.57]){
    box(-3.915,1.56,z,.022,.022,.38,mats.chrome,truck);
    box(-3.919,1.22,z,.026,.024,.38,mats.chrome,truck);
  }
  cyl(-3.933,1.59,0,.047,.02,mats.chrome,'x',16,truck);
  roundBox(-1.43,2.57,0,.03,.46,1.18,.05,mats.darkGlass,truck);
  box(-1.40,2.57,0,.017,.40,.021,mats.faded,truck);
  const farSign=mesh(new THREE.PlaneGeometry(.46,.65),signMat,-2.48,1.64,-1.245,truck);
  farSign.rotation.y=Math.PI;
  for(const z of [-.86,.86]){
    box(-2.01,1.6,z,.7,.04,.016,mats.faded,truck);
    bar([-1.98,1.21,z],[-1.67,1.53,z],.025,mats.iron,truck);
  }
  // Bed: weathered turquoise perimeter, individual floor planks and tiered timber boards.
  box(1.16,1.56,0,5.06,.22,2.35,chipMat,truck);
  for(let k=0;k<14;k++)box(1.16,1.707,-1.08+k*.166,4.89,.055,.16,woodMat,truck);
  for(const z of [-1.2,1.2]){
    box(.82,1.6,z,5.81,.23,.1,chipMat,truck);
    for(let j=0;j<2;j++)box(.82,1.906+j*.323,z,5.67,.31,.085,woodMat,truck);
    for(let x=-2;x<3.8;x+=1.4){
      box(x,2.05,z+Math.sign(z)*.066,.075,.75,.065,mats.rust,truck);
      for(const y of [1.77,2.31])cyl(x,y,z+Math.sign(z)*.107,.021,.024,mats.chrome,'z',8,truck);
    }
    for(let j=0;j<3;j++)box(-.91,2.49+j*.215,z,2.23,.201,.082,woodMat,truck);
    box(-1.50,3.136,z,1.05,.215,.085,woodMat,truck);
    box(-1.50,3.29,z,1.16,.075,.115,woodMat,truck);
    box(-1.99,2.51,z+Math.sign(z)*.065,.077,1.67,.075,mats.rust,truck);
    box(-.95,2.51,z+Math.sign(z)*.065,.073,1.67,.075,mats.rust,truck);
    box(-.88,2.73,z+Math.sign(z)*.067,.085,.67,.065,mats.rust,truck);
    for(let j=0;j<2;j++)box(.66,2.48+j*.214,z, .91,.2,.079,woodMat,truck);
    for(const x of [-1.96,.17,1.13]){
      box(x,x<.3?2.44:2.23,z+Math.sign(z)*.07,.071,x<.3?1.57:1.14,.075,mats.rust,truck);
    }
  }
  for(let j=0;j<7;j++)box(-1.34,1.85+j*.222,0,.106,.208,2.4,woodMat,truck);
  for(const z of [-1.12,0,1.12])box(-1.267,2.45,z,.09,1.75,.08,mats.rust,truck);
  box(-1.31,3.34,0,.18,.09,2.52,woodMat,truck);
  for(let j=0;j<3;j++)box(3.695,1.85+j*.213,0,.092,.203,2.42,woodMat,truck);
  for(const z of [-1.15,-.4,.4,1.15]){
    box(3.757,2.04,z,.061,.75,.067,mats.rust,truck);
    cyl(3.799,2.31,z,.023,.018,mats.chrome,'x',8,truck);
  }
  for(const z of [-1.04,1.04]){
    box(3.85,1.25,z,.17,.96,.33,chipMat,truck).rotation.z=-.10;
    box(3.96,.78,z,.27,.065,.38,chipMat,truck);
    box(3.92,.78,z,.28,.05,.31,mats.iron,truck);
    cyl(3.855,1.66,z,.16,.26,mats.rust,'z',20,truck);
    cyl(3.87,1.68,z+Math.sign(z)*.151,.11,.034,chipMat,'z',20,truck);
    cyl(3.87,1.68,z+Math.sign(z)*.171,.05,.045,mats.iron,'z',16,truck);
    for(const faceZ of [z-.151,z+.151]){
      cyl(3.87,1.68,faceZ,.14,.025,chipMat,'z',24,truck);
      cyl(3.87,1.68,faceZ+Math.sign(faceZ-z)*.016,.055,.035,mats.iron,'z',16,truck);
      for(let k=0;k<5;k++){
        const a=k*6.283/5;
        cyl(3.87+Math.sin(a)*.105,1.68+Math.cos(a)*.105,faceZ+Math.sign(faceZ-z)*.019,.016,.029,mats.rust,'z',6,truck);
      }
    }
    bar([3.82,1.5,z],[3.92,.75,z],.033,mats.faded,truck);
    bar([3.55,1.35,z],[3.94,.82,z],.041,mats.iron,truck);
    box(3.62,1.35,z,.06,.12,.26,mats.cream,truck);
    box(3.656,1.35,z,.01,.07,.17,mats.red,truck);
  }
  box(3.57,1.08,0,.16,.17,2.22,mats.iron,truck);
  box(3.677,1.08,0,.024,.19,.48,mats.cream,truck);
  box(3.693,1.08,0,.008,.105,.33,mats.pole,truck);
  for(const z of [-.61,.61]){
    box(3.73,1.53,z,.06,.08,.24,mats.rust,truck);
    cyl(3.745,1.56,z,.05,.33,mats.iron,'z',16,truck);
    bar([3.73,1.3,z],[3.93,.92,z],.023,mats.iron,truck);
  }
  bar([3.57,1.08,0],[3.98,.94,0],.074,mats.iron,truck);
  const hook=mesh(new THREE.TorusGeometry(.095,.029,8,18,Math.PI*1.7),mats.rust,4,.86,0,truck);hook.rotation.y=Math.PI/2;
  // Plaza landmarks have actual depth; none are image planes.
  const manhole=material(0x565956,.94,.2);
  const manholeX=-1.433,manholeZ=2.028;
  cyl(manholeX,.005,manholeZ,.71,.017,manhole,'y',64);
  for(const r of [.66,.60,.47,.33])mesh(new THREE.TorusGeometry(r,.011,5,64),mats.iron,manholeX,.016,manholeZ).rotation.x=Math.PI/2;
  for(let i=0;i<100;i++){
    const a=rand()*Math.PI*2,r=.62*Math.sqrt(rand());
    const o=box(manholeX+Math.cos(a)*r,.019,manholeZ+Math.sin(a)*r,.047,.006,.013,mats.chrome);o.rotation.y=a;
  }
  mesh(new THREE.TorusGeometry(.22,.014,5,48),material(0xc88b5e),manholeX,.026,manholeZ).rotation.x=Math.PI/2;
  const paint=material(0xd18a5c);
  for(let i=0;i<10;i++){
    const a=box(-2.71+i*.055,.003,1.32+i*.27,.26,.008,.023,paint);a.rotation.y=.45;
  }
  // Modern right-hand civic facade and the receding dark glazed left block.
  const facade=material(0x929a96), seam=material(0x798481), glassBg=material(0x43564e,.45,.2);
  box(0,7,-30,62,14,.5,facade);
  for(let x=-31;x<31;x+=.56)box(x,7,-29.736,.012,14,.012,seam);
  for(let y=.6;y<14;y+=.43)box(0,y,-29.733,62,.009,.014,seam);
  box(-4.8,1.62,-29.69,3.3,3.2,.055,mats.pole);
  for(let j=0;j<11;j++)box(-4.8,.3+j*.235,-29.64,3.25,.026,.025,mats.iron);
  box(-4.8,3.31,-29.2,3.65,.15,1.0,mats.pole);
  box(-17,4.2,-15.5,.5,8.4,24,material(0x7d8981));
  for(let j=0;j<14;j++){
    const z=-3-j*1.6;
    box(-16.732,2.9,z,.025,3.5,1.48,glassBg);
    box(-16.732,6.3,z,.025,2.65,1.48,glassBg);
    box(-16.7,4.76,z,.12,.12,1.65,mats.cream);
    box(-16.65,2.4,z,.15,4.8,.08,mats.cream);
  }
  box(-17,5.5,-19,5,3,9,material(0xc8c7b4));
  // Stationary distant transit bus with dark glazing.
  roundBox(-15.1,1.25,-12.5,2.2,2.32,5.4,.2,material(0xc8c9b1));
  for(let i=0;i<5;i++)box(-13.975,1.68,-14.62+i*1.01,.025,.85,.88,mats.darkGlass);
  box(-13.948,.71,-12.5,.027,.13,5.17,material(0x667a67));
  for(const z of [-14.1,-10.9])cyl(-13.99,.5,z,.43,.07,mats.rubber,'x',20);
  for(let i=0;i<5;i++){
    box(-8.2,.35,-3.4-i*.83,.45,.65,.64,material(0xbd5b3c));
    box(-7.96,.37,-3.4-i*.83,.013,.12,.62,material(0xe3cba7));
  }
  const foliageMats=[0x354c31,0x456039,0x546942,0x66774c,0x718549,0x3f5535].map(c=>material(c,.98));
  const leafGeo=new THREE.SphereGeometry(1,5,3);
  const instances=foliageMats.map(mat=>{
    const m=new THREE.InstancedMesh(leafGeo,mat,1400);m.castShadow=true;m.receiveShadow=true;scene.add(m);return m;
  });
  const counts=Array(6).fill(0),dummy=new THREE.Object3D();
  function tree(x,z,height,radius){
    bar([x,0,z],[x-.12,height*.29,z+.12],.14,mats.bark);
    bar([x-.12,height*.29,z+.12],[x+.14,height*.64,z-.2],.105,mats.bark);
    for(let k=0;k<7;k++){
      const a=k*2.4, xx=x+Math.sin(a)*radius*.69,zz=z+Math.cos(a)*radius*.69, yy=height*(.65+rand()*.23);
      const bend=[x+(xx-x)*.42+.13,height*.60,z+(zz-z)*.31-.12];
      bar([x+.1,height*.44,z],bend,.055+rand()*.025,mats.bark);
      bar(bend,[xx,yy,zz],.035+rand()*.022,mats.bark);
      bar([xx,yy-.2,zz],[xx+.3,yy+.7,zz+.2],.035,mats.bark);
    }
    for(let k=0;k<1250;k++){
      const a=rand()*6.283,r=radius*Math.sqrt(rand()), yy=height-.55+(rand()-.5)*radius*.9*Math.sqrt(1-r*r/(radius*radius));
      dummy.position.set(x+Math.cos(a)*r,yy,z+Math.sin(a)*r);
      dummy.rotation.set(rand()*3,rand()*3,rand()*3);
      const s=radius/2.2;
      dummy.scale.set((.06+rand()*.17)*s,(.035+rand()*.10)*s,(.07+rand()*.19)*s);dummy.updateMatrix();
      const n=Math.floor(rand()*6);if(counts[n]<1400)instances[n].setMatrixAt(counts[n]++,dummy.matrix);
    }
  }
  tree(-16.808,-14.611,10.1,4.34);tree(-12.212,-20.396,8.9,4.34);tree(-4.657,-22.684,8.7,4.55);
  tree(3.26,-23.828,9.7,4.4);tree(-20.235,-7.31,8.2,2.8);tree(-23.268,-2.957,7.2,2.9);
  instances.forEach((m,i)=>{m.count=counts[i];m.instanceMatrix.needsUpdate=true;});
  // Twin lantern and hanging flowers, well behind the rear half of the truck.
  const lanternStart=scene.children.length;
  const poleX=-1.822,poleZ=-16.579;
  cyl(poleX,2.4,poleZ,.065,4.8,mats.pole,'y',16);
  cyl(poleX,.17,poleZ,.17,.34,mats.pole,'y',16);
  for(const y of [1.0,2.6,3.7,4.15])cyl(poleX,y,poleZ,.1,.075,mats.pole,'y',12);
  for(const side of [-1,1]){
    bar([poleX,4.25,poleZ],[poleX+side*.22,4.6,poleZ],.05,mats.pole);
    cyl(poleX+side*.22,4.69,poleZ,.105,.25,mats.pole,'y',8);
    mesh(new THREE.SphereGeometry(.15,8,8),material(0xd4dfd4),poleX+side*.22,4.98,poleZ).scale.set(.8,1.5,.8);
    mesh(new THREE.ConeGeometry(.14,.09,8),mats.pole,poleX+side*.22,5.19,poleZ);
  }
  bar([poleX,3.23,poleZ],[poleX+.38,3.12,poleZ],.025,mats.pole);
  const flowerMats=[material(0x9b3770),material(0xc16391),material(0x5e7750)];
  for(let j=0;j<28;j++)mesh(new THREE.IcosahedronGeometry(.055+rand()*.035,0),flowerMats[j%3],poleX+.35+(rand()-.5)*.45,3.03+(rand()-.5)*.45,poleZ+(rand()-.5)*.3);
  const lanternParts=scene.children.slice(lanternStart),lanternGroup=new THREE.Group();scene.add(lanternGroup);
  lanternParts.forEach(part=>{part.position.x-=poleX;part.position.z-=poleZ;lanternGroup.add(part);});
  lanternGroup.position.set(poleX,0,poleZ);lanternGroup.scale.set(1.5,1.65,1.5);
  const patioStart=scene.children.length;
  for(const x of [2.8,4.8,6.8]){
    for(const z of [-19.6,-17.7]){
      box(x,.77,z,1.35,.045,.72,mats.table);
      for(const dx of [-.59,.59])for(const dz of [-.29,.29])box(x+dx,.39,z+dz,.035,.75,.035,mats.table);
      const chair=material(x===9.8?0x8a2f4c:0x626763);
      for(const dz of [-.61,.61]){
        box(x,.43,z+dz,.43,.044,.4,chair);
        box(x,.76,z+dz+Math.sign(dz)*.16,.43,.42,.035,chair);
        for(const dx of [-.18,.18])bar([x+dx,0,z+dz-.15],[x+dx,.44,z+dz+.15],.015,chair);
      }
    }
  }
  for(const x of [3.776,5.3]){
    cyl(x,1.88,-20.702,.025,3.76,mats.chrome,'y',10);
    cyl(x,.045,-20.702,.36,.09,mats.iron,'y',16);
    const g=new THREE.CylinderGeometry(.07,.47,2.14,10,1,true);
    const a=g.attributes.position;
    for(let i=0;i<a.count;i++){if(a.getY(i)<0)a.setY(i,a.getY(i)+.09*Math.sin(i*2.5));}
    g.computeVertexNormals();mesh(g,mats.yellow,x,2.45,-20.702).scale.y=1.18;
    for(let k=0;k<10;k++){
      const a=k*6.283/10;
      bar([x+Math.sin(a)*.08,3.73,-20.702+Math.cos(a)*.08],[x+Math.sin(a)*.46,1.18,-20.702+Math.cos(a)*.46],.012,material(0xa48e40));
    }
  }
  for(let x=1.8;x<8;x+=1.6)box(x,.56,-21.6,.05,1.1,.05,mats.pole);
  box(4.8,.93,-21.6,7.0,.045,.045,mats.pole);
  const patioParts=scene.children.slice(patioStart),patioGroup=new THREE.Group();scene.add(patioGroup);
  patioParts.forEach(part=>patioGroup.add(part));patioGroup.scale.y=1.4;
  cyl(-2.8,1.5,-26.1,.14,.02,material(0x8a3833),'z',8);
  box(-2.8,1.5,-26.085,.17,.035,.014,mats.cream);
  bar([-2.8,0,-26.11],[-2.8,1.7,-26.11],.017,mats.chrome);
  // Inferred 360-degree plaza perimeter, placed outside the translated camera path.
  const brickMat=material(0x9b8980), cornice=material(0xc8c5b7);
  for(const side of [-1,1]){
    const x=side*31;
    box(x,6,4,.55,12,70,side>0?brickMat:facade);
    box(x-side*.31,7.8,4,.1,.17,70,cornice);
    box(x-side*.31,11.8,4,.1,.2,70,cornice);
    for(let z=-27;z<37;z+=3.1){
      for(const y of [2.2,5.8,9.6]){
        box(x-side*.30,y,z,.07,2.4,2.5,glassBg);
        box(x-side*.35,y,z,.04,2.45,.065,cornice);
      }
      box(x-side*.33,1.6,z+1.35,.12,3.2,.18,cornice);
    }
  }
  box(0,4.8,33,62,9.6,.65,material(0x969e94));
  for(let x=-28;x<31;x+=3.2){
    for(const y of [2.1,5.3,8.1]){
      box(x,y,32.65,2.6,2.05,.035,glassBg);
      box(x,y,32.62,.065,2.1,.045,cornice);
    }
    box(x+1.44,4.8,32.6,.16,9.6,.16,cornice);
  }
  const pavementEdge=material(0xc2c5bd);
  box(22,.055,4,1,.11,47,pavementEdge);
  box(-22,.055,9,1,.11,42,pavementEdge);
  box(0,.055,23,44,.11,1,pavementEdge);
  const planterMat=material(0x858a81),soil=material(0x564e3c);
  const extraLeafGeometry=new THREE.IcosahedronGeometry(1,1);
  const extraLeaves=new THREE.InstancedMesh(extraLeafGeometry,foliageMats[2],3200);
  extraLeaves.castShadow=true;extraLeaves.receiveShadow=true;scene.add(extraLeaves);
  let extraCount=0;
  for(const [x,z,h,r] of [[23,-5,7.8,3.0],[23,10,7,2.8],[13,25,7.5,3.2],[-3,25,8,3.3],[-18,24,7.4,3],[-24,10,8,3.3]]){
    box(x,.26,z,2.2,.5,2.2,planterMat);box(x,.52,z,1.99,.025,1.99,soil);
    bar([x,.5,z],[x+.2,h*.65,z-.2],.15,mats.bark);
    for(let k=0;k<7;k++){
      const a=k*2.4,b=[x+Math.sin(a)*r*.7,h*.83,z+Math.cos(a)*r*.7];
      bar([x+.1,h*.46,z],b,.058,mats.bark);
      bar(b,[b[0]+.3,h,b[2]+.2],.03,mats.bark);
    }
    for(let k=0;k<510;k++){
      const a=rand()*6.283, rr=r*Math.sqrt(rand());
      dummy.position.set(x+Math.sin(a)*rr,h-.3+(rand()-.5)*r*.7,z+Math.cos(a)*rr);
      dummy.rotation.set(rand()*3,rand()*3,rand()*3);
      dummy.scale.set(.15+rand()*.19,.12+rand()*.22,.15+rand()*.19);dummy.updateMatrix();
      extraLeaves.setMatrixAt(extraCount++,dummy.matrix);
    }
  }
  extraLeaves.count=extraCount;extraLeaves.instanceMatrix.needsUpdate=true;
  for(const x of [-16,2,17]){
    const z=21;
    for(let k=0;k<5;k++)box(x,.52,z+k*.13,2.1,.055,.1,woodMat);
    for(let k=0;k<4;k++)box(x,.82+k*.11,z+.53,2.1,.085,.07,woodMat);
    for(const dx of [-.84,.84]){
      box(x+dx,.27,z+.26,.08,.51,.63,mats.pole);
      bar([x+dx,.32,z+.5],[x+dx,1.21,z+.6],.035,mats.pole);
    }
  }
  for(const [x,z] of [[20,4],[-19,15],[8,27],[-11,27]]){
    cyl(x,3,z,.065,6,mats.pole,'y',12);
    box(x,5.95,z+.38,.48,.12,.83,mats.pole);
    box(x,5.875,z+.44,.4,.023,.55,mats.lamp);
    cyl(x,.16,z,.18,.32,mats.pole,'y',12);
  }
  for(const [x,z] of [[24,19],[-25,21]]){
    roundBox(x,.65,z,1.6,1.3,.85,.07,material(0x798d82));
    for(let j=0;j<10;j++)box(x-.68+j*.14,.75,z+.44,.055,.65,.017,mats.iron);
    box(x,1.34,z,1.71,.08,.96,mats.chrome);
  }
  truck.scale.x=1.25727198;
  // Combine only fixed meshes with identical materials; preserve true world-space geometry.
  scene.updateMatrixWorld(true);
  const batches=new Map();
  scene.traverse(object=>{
    if(!object.isMesh||object.isInstancedMesh||Array.isArray(object.material))return;
    if(!batches.has(object.material))batches.set(object.material,[]);
    batches.get(object.material).push(object);
  });
  for(const [mat,objects] of batches){
    if(objects.length<2)continue;
    const positions=[],normals=[],uvs=[];
    for(const object of objects){
      const geometry=object.geometry.index?object.geometry.toNonIndexed():object.geometry.clone();
      geometry.applyMatrix4(object.matrixWorld);
      positions.push(geometry.attributes.position.array);
      normals.push(geometry.attributes.normal.array);
      uvs.push(geometry.attributes.uv?.array||new Float32Array(geometry.attributes.position.count*2));
      geometry.dispose();object.removeFromParent();
    }
    const combine=arrays=>{
      const result=new Float32Array(arrays.reduce((sum,a)=>sum+a.length,0));let offset=0;
      for(const a of arrays){result.set(a,offset);offset+=a.length;}return result;
    };
    const g=new THREE.BufferGeometry();
    g.setAttribute('position',new THREE.BufferAttribute(combine(positions),3));
    g.setAttribute('normal',new THREE.BufferAttribute(combine(normals),3));
    g.setAttribute('uv',new THREE.BufferAttribute(combine(uvs),2));
    const merged=new THREE.Mesh(g,mat);merged.castShadow=true;merged.receiveShadow=true;scene.add(merged);
  }
  const camera=new THREE.PerspectiveCamera(33.70345173,16/9,.08,110);
  function setTime(t){
    const pose=cameraPose(t);
    camera.position.fromArray(pose.position);
    camera.fov=pose.fov;
    camera.lookAt(...pose.target);
    camera.updateProjectionMatrix();
  }
  setTime(0);
  return {scene,camera,setTime};
}
