export function sourcePresentationTime(outputTime) {
  if (outputTime < 3 || outputTime >= 4) return outputTime;
  const expandedPatchTime = .8 + (outputTime - 3) * 6.2;
  return 3 + Math.max(0, expandedPatchTime - 1) / 10;
}

export function buildScene(THREE, spec) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xaac8d7);
  scene.fog = new THREE.Fog(0xaac8d7, 180, 580);
  const worldRoot = new THREE.Group();
  worldRoot.matrixAutoUpdate = false;
  scene.add(worldRoot);
  const camera = new THREE.PerspectiveCamera(48, 16 / 9, .035, 900);
  const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, x) => { const q = clamp((x - a) / (b - a)); return q * q * (3 - 2 * q); };
  const lerp = (a, b, q) => a + (b - a) * q;
  const hash = n => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123; return x - Math.floor(x); };
  const mat = (c, roughness = .8, metalness = 0) => new THREE.MeshStandardMaterial({color: c, roughness, metalness});
  const gravelMat = mat(0x9d998b), rockMat = mat(0x9eaaa9);
  const white = mat(0xeff1ed, .35, .22), red = mat(0xc51d2c, .36, .28);
  const dark = mat(0x10191e, .55), rubber = mat(0x181b1b, .94);
  const steel = mat(0x9da8ad, .35, .72), navy = mat(0x152532), harnessMat = mat(0xdb4128);
  const lightMat = new THREE.MeshStandardMaterial({color: 0xf7fff3, emissive: 0xe0f0e2, emissiveIntensity: .55});
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const sphereGeo = new THREE.SphereGeometry(1, 16, 12);
  const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
  function mesh(geo, material, parent = worldRoot) {
    const o = new THREE.Mesh(geo, material); parent.add(o); return o;
  }
  function box(parent, material, p, scale) {
    const o = mesh(boxGeo, material, parent); o.position.set(...p); o.scale.set(...scale); return o;
  }
  function ball(parent, material, p, scale) {
    const o = mesh(sphereGeo, material, parent); o.position.set(...p); o.scale.set(...scale); return o;
  }
  function rod(parent, material, a, b, radius = .035) {
    const delta = V(...b).sub(V(...a));
    const o = mesh(new THREE.CylinderGeometry(radius, radius, 1, 8), material, parent);
    o.position.copy(V(...a).add(V(...b)).multiplyScalar(.5));
    o.quaternion.setFromUnitVectors(V(0, 1, 0), delta.clone().normalize());
    o.scale.y = delta.length(); return o;
  }
  const hemi = new THREE.HemisphereLight(0xeaf5ff, 0x514938, 1.35); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff4de, 2.55); sun.position.set(-45, 80, 35);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {left: -62, right: 62, top: 56, bottom: -56, near: 1, far: 200});
  sun.shadow.bias = -.00018; sun.shadow.normalBias = .015; scene.add(sun); scene.add(sun.target);
  sun.target.position.set(0, 0, -12);

  const R = 13, HALF = 3.6, ARC = Math.PI * R, STRAIGHT = 85;
  function road(s, offset = 0) {
    if (s < 0) return {x: -R - offset, z: s, yaw: 0};
    if (s > ARC) return {x: R + offset, z: ARC - s, yaw: Math.PI};
    const theta = Math.PI - s / R;
    return {x: (R + offset) * Math.cos(theta), z: (R + offset) * Math.sin(theta), yaw: s / R};
  }
  function roadMargin(x, z) {
    const distance = z >= 0 ? Math.abs(Math.hypot(x, z) - R) : Math.min(Math.abs(x + R), Math.abs(x - R));
    return HALF - distance;
  }
  function geometry(vertices, colors, indices) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    if (colors) g.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    if (indices) g.setIndex(indices);
    g.computeVertexNormals(); return g;
  }
  const groundVerts = [], groundColors = [], groundIdx = [], steps = 440, cross = 12;
  for (let i = 0; i <= steps; i++) {
    const s = lerp(-STRAIGHT, ARC + STRAIGHT, i / steps);
    for (let j = 0; j <= cross; j++) {
      const p = road(s, lerp(-HALF, HALF, j / cross));
      groundVerts.push(p.x, 0, p.z);
      const n = .245 + hash(i * 19 + j * 73) * .075;
      const track = Math.abs(Math.abs(lerp(-HALF, HALF, j / cross)) - .9) < .38 ? .95 : 1;
      groundColors.push(n * track, n * .98 * track, n * .89 * track);
      if (i < steps && j < cross) {
        const k = i * (cross + 1) + j;
        groundIdx.push(k, k + 1, k + cross + 1, k + 1, k + cross + 2, k + cross + 1);
      }
    }
  }
  const roadSurface = mesh(geometry(groundVerts, groundColors, groundIdx),
    new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, side: THREE.DoubleSide}));
  roadSurface.receiveShadow = true;

  // One continuous mountain shelf shares its top edge with the drivable ribbon.
  for (const sign of [-1, 1]) {
    const v = [], c = [], ix = [];
    for (let i = 0; i <= steps; i++) {
      const s = lerp(-STRAIGHT, ARC + STRAIGHT, i / steps);
      for (let level = 0; level < 5; level++) {
        const d = sign * (HALF + (level === 0 ? 0 : level * 1.8 + Math.sin(s*.27+level)*.7+Math.sin(s*.83)*.25));
        const p = road(s, d);
        const y = level === 0 ? -.025 : -level * 10 + Math.sin(s*.23+level)*1.6;
        v.push(p.x, y, p.z);
        const shade = .25 + .085*(.5+.5*Math.sin(s*.38+level*3));
        c.push(shade, shade * 1.03, shade * 1.02);
        if (i < steps && level < 4) {
          const k = i * 5 + level; ix.push(k, k + 5, k + 1, k + 1, k + 5, k + 6);
        }
      }
    }
    mesh(geometry(v, c, ix), new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, side: THREE.DoubleSide, flatShading: true})).receiveShadow = true;
  }
  const outline = [];
  for (let i = 0; i <= 90; i++) {
    const angle = Math.PI * i / 90;
    outline.push([9.33 * Math.cos(angle), 9.33 * Math.sin(angle)]);
  }
  outline.push([-9.33, -85], [9.33, -85]);
  const wallV = [], wallC = [], wallI = [];
  for (let i = 0; i < outline.length; i++) {
    const [x, z] = outline[i];
    const h = 3.8 + Math.max(0, -z) * .13 + Math.sin(i*.17)*.42;
    for (let layer = 0; layer < 3; layer++) {
      wallV.push(x * (1 - layer * .06), layer === 0 ? -.03 : h * layer / 2, z - layer * .14);
      const q = .35 + .055*Math.sin(i*.31+layer); wallC.push(q, q * 1.02, q * 1.015);
    }
    const k = i * 3, n = ((i + 1) % outline.length) * 3;
    wallI.push(k, n, k + 1, k + 1, n, n + 1, k + 1, n + 1, k + 2, k + 2, n + 1, n + 2);
  }
  const top = wallV.length / 3; wallV.push(0, 11, -38); wallC.push(.40, .42, .40);
  for (let i = 0; i < outline.length; i++) wallI.push(top, i * 3 + 2, ((i + 1) % outline.length) * 3 + 2);
  const wall = mesh(geometry(wallV, wallC, wallI), new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide}));
  wall.castShadow = true; wall.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const wallFragments = new THREE.InstancedMesh(stoneGeo, rockMat, 170); worldRoot.add(wallFragments);
  for(let i=0;i<wallFragments.count;i++){
    const a=lerp(0,Math.PI,hash(i*29)), r=8.75+hash(i*19)*.12;
    dummy.position.set(Math.cos(a)*r,.35+hash(i*11)*3.5,Math.sin(a)*r);
    dummy.rotation.set(i*.17,i*.31,i*.11);
    dummy.scale.set(.48+hash(i*23)*.22,.35+hash(i*17)*.55,.45+hash(i*31)*.20);
    dummy.updateMatrix();wallFragments.setMatrixAt(i,dummy.matrix);
  }
  wallFragments.castShadow=true;wallFragments.receiveShadow=true;
  const gravel = new THREE.InstancedMesh(stoneGeo, gravelMat, 12000); worldRoot.add(gravel);
  for (let i = 0; i < gravel.count; i++) {
    const p = road(lerp(-80, ARC + 80, hash(i * 11)), lerp(-3.52, 3.52, hash(i * 11 + 1)));
    const scale = .010 + hash(i * 11 + 2) ** 3 * .045;
    dummy.position.set(p.x, scale * .26, p.z); dummy.rotation.set(i, i * .27, i * .79);
    dummy.scale.set(scale * 1.4, scale * .52, scale); dummy.updateMatrix(); gravel.setMatrixAt(i, dummy.matrix);
  }
  gravel.receiveShadow = true;
  const boulders = new THREE.InstancedMesh(stoneGeo, rockMat, 480); worldRoot.add(boulders);
  for (let i = 0; i < boulders.count; i++) {
    const p = road(lerp(-80, ARC + 80, hash(i * 17)), 3.94 + hash(i * 17 + 1) * 1.5);
    const scale = .12 + hash(i * 17 + 3) * .34;
    dummy.position.set(p.x, -.05 - hash(i * 17 + 5) * 1.7, p.z); dummy.rotation.set(i, i * .7, i * .2);
    dummy.scale.set(scale, scale * .8, scale * 1.4); dummy.updateMatrix(); boulders.setMatrixAt(i, dummy.matrix);
  }
  boulders.castShadow = true;
  // Distant, genuinely three-dimensional valley floor and layered ridges.
  const terrainV = [], terrainC = [], terrainI = [], n = 90;
  for (let iz = 0; iz <= n; iz++) for (let ix = 0; ix <= n; ix++) {
    const x = lerp(-420, 420, ix / n), z = lerp(-420, 360, iz / n);
    const rad = Math.hypot(x * .85, z);
    const ridge = Math.sin(x * .024 + z * .011) * Math.cos(z * .019) * 38;
    const h = -84 + ridge + smooth(75, 280, rad) * 30 + 6 * hash(ix * 47 + iz * 91);
    terrainV.push(x, h, z);
    const q = hash(ix * 7 + iz * 53) * .10;
    terrainC.push(.075 + q*.5, .125 + q*.5, .15 + q*.5);
    if (iz < n && ix < n) {
      const k = iz * (n + 1) + ix; terrainI.push(k, k + n + 1, k + 1, k + 1, k + n + 1, k + n + 2);
    }
  }
  mesh(geometry(terrainV, terrainC, terrainI), new THREE.MeshStandardMaterial({vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide}));
  const peakMaterial = mat(0x667e89);
  for (let i = 0; i < 24; i++) {
    const a = i * Math.PI * 2 / 24;
    const mountain = mesh(new THREE.IcosahedronGeometry(1,1), peakMaterial);
    mountain.position.set(Math.cos(a) * 430, -62, Math.sin(a) * 430);
    mountain.rotation.set(i*.12,i,0);
    mountain.scale.set(28+hash(i)*24,18+hash(i+3)*20,72);
  }
  const stakeWhite = mat(0xd9d9cd), stakeDark = mat(0x303a3c);
  for (let i = 0; i < 19; i++) {
    if (i >= 8 && i <= 10) continue;
    const p = road(-65 + i * 9.5, 3.49);
    box(scene, stakeWhite, [p.x, .37, p.z], [.10, .74, .10]);
    box(scene, stakeDark, [p.x, .5, p.z], [.115, .18, .115]);
  }
  for (const s of [12, 28]) {
    const p = road(s, -3.53), sign = new THREE.Group(); worldRoot.add(sign);
    sign.position.set(p.x, 1.28, p.z); sign.rotation.y = s / R;
    rod(sign, steel, [0, -1.28, 0], [0, .35, 0], .035);
    box(sign, stakeWhite, [0, .1, 0], [.9, .52, .055]);
    const stripe1 = box(sign, stakeDark, [-.06, .20, -.035], [.37, .075, .03]); stripe1.rotation.z = -.6;
    const stripe2 = box(sign, stakeDark, [-.06, .01, -.035], [.37, .075, .03]); stripe2.rotation.z = .6;
  }

  const car = new THREE.Group(); scene.add(car);
  const sprung = new THREE.Group(); car.add(sprung);
  function loft(sections, material, openTop=false) {
    const v = [], ix = [];
    for (const [z, width, bottom, top] of sections) {
      v.push(-width, bottom, z, width, bottom, z, width, top, z, -width, top, z);
    }
    for (let k = 0; k < sections.length - 1; k++) for (let j = 0; j < 4; j++) {
      if(openTop&&j===2)continue;
      const a = 4 * k + j, b = 4 * k + (j + 1) % 4;
      ix.push(a, b, a + 4, b, b + 4, a + 4);
    }
    ix.push(0, 2, 1, 0, 3, 2);
    const end = v.length / 3 - 4; ix.push(end, end + 1, end + 2, end, end + 2, end + 3);
    const o = mesh(geometry(v, null, ix), material, sprung); o.castShadow = true; o.receiveShadow = true; return o;
  }
  loft([[-2.08,.83,-.12,.37],[-1.72,.95,-.18,.58],[-.8,.95,-.17,.63],[.72,.94,-.17,.59],[1.8,.9,-.13,.46],[2.10,.81,-.04,.34]], white, true);
  loft([[.86,.88,.48,.596],[1.8,.89,.40,.468],[2.10,.81,.26,.348]], red);
  loft([[-2.08,.83,.28,.373],[-1.56,.91,.48,.60]], white);
  box(sprung, dark, [0, -.10, 0], [1.71, .16, 3.72]);
  for (const x of [-1, 1]) {
    const sideRed = box(sprung, red, [x * .952, .21, -.6], [.018, .31, 1.8]); sideRed.rotation.x = -.10;
    box(sprung, dark, [x * .954, .09, 0], [.025, .065, 3.35]);
    box(sprung, steel, [x * .97, .46, -.30], [.025, .027, .18]);
    box(sprung, dark, [x * .952, .46, .83], [.026, .10, .39]);
    box(sprung, red, [x * .74, .65, -1.31], [.15, .23, .38]);
  }
  box(sprung, dark, [0, .13, 2.092], [1.41, .24, .09]);
  box(sprung, dark, [0, .15, -2.08], [1.5, .14, .07]);
  for (const x of [-.59, .59]) {
    const headlight = box(sprung, lightMat, [x, .34, 2.04], [.34, .09, .075]); headlight.rotation.z = x * -.12;
    box(sprung, red, [x, .39, -2.055], [.26, .13, .09]);
  }
  for (let x = -.55; x <= .55; x += .11) box(sprung, steel, [x, .125, 2.146], [.027, .15, .011]);
  const glass = new THREE.MeshStandardMaterial({color: 0x487180, roughness: .15, metalness: .15, transparent: true, opacity: .27, side: THREE.DoubleSide, depthWrite: false});
  function quad(points, material, parent = sprung) {
    const o = mesh(geometry(points.flat(), null, [0,1,2,0,2,3]), material, parent); return o;
  }
  quad([[-.69,1.14,-.94],[-.70,1.12,.29],[.70,1.12,.29],[.69,1.14,-.94]], white);
  quad([[-.70,1.12,.29],[.70,1.12,.29],[.86,.60,1.0],[-.86,.60,1.0]], glass);
  quad([[-.69,1.14,-.94],[.69,1.14,-.94],[.83,.59,-1.56],[-.83,.59,-1.56]], glass);
  for (const x of [-1,1]) {
    quad([[x*.69,1.14,-.94],[x*.70,1.12,.29],[x*.86,.60,1.0],[x*.88,.61,-1.28]], glass);
    rod(sprung, red, [x*.70,1.12,.29], [x*.86,.60,1.0], .047);
    rod(sprung, white, [x*.69,1.14,-.94], [x*.83,.59,-1.56], .052);
    rod(sprung, white, [x*.72,1.12,-.43], [x*.91,.61,-.43], .033);
    rod(sprung, white, [x*.70,1.135,-.94], [x*.70,1.135,.29], .035);
    rod(sprung, steel, [x*.70,.65,-1.2], [x*.59,1.08,-.70], .025);
    box(sprung, red, [x * .99, .72, .63], [.25, .15, .17]);
    box(sprung, dark, [x * 1.10, .72, .61], [.012, .1, .14]);
  }
  for (const x of [-.47, .47]) box(sprung, dark, [x, .68, -1.91], [.08,.42,.10]);
  box(sprung, dark, [0,.90,-1.91], [1.91,.085,.32]);
  box(sprung, white, [0,1.15,-.30], [.18,.035,.77]);
  box(sprung, dark, [0,1.20,-.55], [.32,.13,.32]);
  rod(sprung, rubber, [0,1.2,-.76], [0,1.68,-.87], .008);
  const wheelRadius = .36, halfTrack = .90, wheelbase = 2.64;
  const wheels = [], suspensions = [];
  const contactMaterial=new THREE.MeshBasicMaterial({color:0x171b1b,transparent:true,opacity:.36,depthWrite:false});
  for (const x of [-halfTrack, halfTrack]) for (const z of [-wheelbase/2, wheelbase/2]) {
    const hub = new THREE.Group(); car.add(hub); hub.position.set(x, wheelRadius, z);
    const rotor = new THREE.Group(); hub.add(rotor);
    const tire = mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, .25, 28), rubber, rotor); tire.rotation.z = Math.PI/2; tire.castShadow = true;
    for (const side of [-1,1]) {
      const rim = mesh(new THREE.CylinderGeometry(.238,.238,.018,20), steel, rotor); rim.rotation.z = Math.PI/2; rim.position.x = side*.135;
      const brake = mesh(new THREE.CylinderGeometry(.195,.195,.021,20), dark, rotor); brake.rotation.z=Math.PI/2; brake.position.x=side*.147;
      const spokes=new THREE.InstancedMesh(boxGeo,steel,8);rotor.add(spokes);
      for(let i=0;i<8;i++){
        const a=i*Math.PI/4;dummy.position.set(side*.16,Math.cos(a)*.115,Math.sin(a)*.115);
        dummy.rotation.set(a,0,0);dummy.scale.set(.021,.22,.027);dummy.updateMatrix();spokes.setMatrixAt(i,dummy.matrix);
      }
    }
    const treads=new THREE.InstancedMesh(boxGeo,dark,28);rotor.add(treads);
    for (let i=0;i<28;i++) {
      const a=i*Math.PI*2/28;
      dummy.position.set(0,Math.cos(a)*.350,Math.sin(a)*.350);dummy.rotation.set(a,0,0);
      dummy.scale.set(.255,.020,.037);dummy.updateMatrix();treads.setMatrixAt(i,dummy.matrix);
    }
    const contact=mesh(new THREE.CircleGeometry(1,24),contactMaterial,car);
    contact.rotation.x=-Math.PI/2;contact.position.set(x,.008,z);contact.scale.set(.19,.16,1);
    wheels.push({hub,rotor,contact,x,z});
    const strut=rod(car, steel, [x,.4,z], [x,.9,z], .039);
    const spring = mesh(new THREE.TorusGeometry(.073,.018,6,12), red, car);
    spring.position.set(x,.66,z); spring.rotation.x=Math.PI/2;
    suspensions.push({strut,spring,x,z});
    const arch=mesh(new THREE.TorusGeometry(.40,.054,6,24,Math.PI),dark,sprung);
    arch.rotation.y=Math.PI/2; arch.position.set(x*1.05,-.15,z);
  }
  // The cockpit is the same model carried by the exterior chassis, never an insert set.
  box(sprung, navy, [0,-.07,-.1], [1.55,.06,2.3]);
  box(sprung,dark,[0,.24,1.04],[1.72,.60,.045]);
  for(const x of [-.86,.86])box(sprung,dark,[x,.26,-.12],[.035,.60,2.30]);
  box(sprung, dark, [0,.54,.73], [1.5,.19,.34]);
  const instruments=box(sprung,dark,[-.44,.69,.69],[.48,.20,.15]);
  for (let i=0;i<3;i++) {
    const dial=mesh(new THREE.CylinderGeometry(.052,.052,.012,16),steel,sprung);
    dial.rotation.x=Math.PI/2; dial.position.set(-.60+i*.15,.71,.603);
    const needle=box(sprung,red,[-.60+i*.15,.724,.594],[.009,.043,.008]); needle.rotation.z=.6-i*.4;
  }
  const seatMaterial = mat(0x171c21);
  for (const x of [-.43,.43]) {
    box(sprung,seatMaterial,[x,.22,-.46],[.53,.13,.66]);
    const back=box(sprung,seatMaterial,[x,.55,-.74],[.51,.78,.14]); back.rotation.x=-.12;
    box(sprung,seatMaterial,[x,.95,-.81],[.30,.23,.13]);
    for (const dx of [-.24,.24]) box(sprung,seatMaterial,[x+dx,.53,-.57],[.07,.52,.32]);
  }
  const driver = new THREE.Group(); sprung.add(driver);
  const torso=ball(driver,navy,[-.43,.59,-.40],[.245,.335,.17]);
  const helmet=ball(driver,white,[-.43,.995,-.34],[.19,.205,.21]);
  const visor=ball(driver,dark,[-.43,1.015,-.153],[.16,.075,.035]);
  const chin=box(driver,white,[-.43,.919,-.14],[.28,.055,.10]);
  const harness=[];
  for (const x of [-.54,-.32]) harness.push(rod(sprung,harnessMat,[x,.85,-.255],[x*.95-.02,.36,-.20],.035));
  const lapHarness=rod(sprung,harnessMat,[-.65,.36,-.24],[-.22,.36,-.24],.035);
  box(driver,steel,[-.43,.40,-.185],[.072,.065,.022]);
  const steering=new THREE.Group(); sprung.add(steering); steering.position.set(-.43,.69,.37);
  steering.rotation.x=-.22;
  const instrumentDisplay=box(sprung,dark,[-.43,.77,.485],[.34,.16,.024]);
  const steeringRotor=new THREE.Group(); steering.add(steeringRotor);
  mesh(new THREE.TorusGeometry(.225,.024,8,32),rubber,steeringRotor);
  for (const a of [0,Math.PI*2/3,Math.PI*4/3]) rod(steeringRotor,steel,[0,0,0],[Math.sin(a)*.20,Math.cos(a)*.20,0],.019);
  ball(steeringRotor,dark,[0,0,0],[.065,.065,.028]);
  const gloves=[ball(sprung,red,[0,0,0],[.055,.064,.048]),ball(sprung,red,[0,0,0],[.055,.064,.048])];
  const arms=[];
  for (let i=0;i<4;i++) arms.push(rod(sprung,navy,[0,0,0],[0,.2,0],.067));
  const legs=[rod(driver,navy,[-.54,.33,-.3],[-.52,.13,.28],.09),rod(driver,navy,[-.30,.33,-.3],[-.29,.14,.36],.09)];
  const leftBoot=box(sprung,dark,[-.53,.13,.56],[.17,.13,.34]);
  const rightBoot=new THREE.Group();sprung.add(rightBoot);rightBoot.position.set(-.28,.13,.57);
  ball(rightBoot,red,[0,0,0],[.079,.073,.176]);
  box(rightBoot,dark,[0,-.046,0],[.16,.034,.33]);
  ball(rightBoot,dark,[0,.05,-.075],[.068,.061,.082]);
  for(let i=0;i<3;i++)box(rightBoot,white,[0,.074,-.035+i*.027],[.105,.008,.010]);
  rod(driver,navy,[-.29,.14,.36],[-.28,.18,.54],.075);
  const pedalPivot = new THREE.Group(); sprung.add(pedalPivot); pedalPivot.position.set(-.28,.23,.94);
  rod(pedalPivot,steel,[0,0,0],[0,-.11,-.10],.024);
  const pedal=box(pedalPivot,steel,[0,-.11,-.10],[.13,.15,.025]); pedal.rotation.x=-.35;
  for (let i=0;i<4;i++) box(pedalPivot,dark,[0,-.16+i*.033,-.119],[.11,.009,.008]);
  const throttle=box(sprung,dark,[-.08,.12,.88],[.07,.19,.035]); throttle.rotation.x=-.35;
  const cabinLight = new THREE.PointLight(0xe3edf3,1.25,4,1); cabinLight.position.set(.30,1.01,-.1); sprung.add(cabinLight);

  const knots=[[0,-46,17],[2,-10.5,15],[3,-3.2,5.5],[4.2,3.6,7],[5.8,23.5,10.5],[7,ARC,15],[8,65,20]];
  function distance(t) {
    let i=0; while(i<knots.length-2 && t>knots[i+1][0])i++;
    const [a,p,va]=knots[i], [b,q,vb]=knots[i+1], u=clamp((t-a)/(b-a)), dt=b-a;
    return (2*u**3-3*u*u+1)*p+(u**3-2*u*u+u)*dt*va+(-2*u**3+3*u*u)*q+(u**3-u*u)*dt*vb;
  }
  function physicalTime(t) { return t<=5.8?t:t<=7.8?5.8:t-2; }
  function smoothDerivative(a,b,t){
    if(t<=a||t>=b)return 0;
    const u=(t-a)/(b-a);return 6*u*(1-u)/(b-a);
  }
  function distanceVelocity(t){
    let i=0;while(i<knots.length-2&&t>knots[i+1][0])i++;
    const [a,p,va]=knots[i],[b,q,vb]=knots[i+1],u=clamp((t-a)/(b-a)),dt=b-a;
    return (6*u*u-6*u)*p/dt+(3*u*u-4*u+1)*va+(-6*u*u+6*u)*q/dt+(3*u*u-2*u)*vb;
  }
  function vehicleAt(t) {
    const s=distance(t), drift=smooth(4.05,5.8,t)*(1-smooth(5.8,7.25,t));
    const slip=.57*drift, offset=1.52*smooth(4.05,5.52,t)*(1-smooth(6.1,7.25,t));
    const p=road(s,offset), brake=smooth(2.0,2.58,t)*(1-smooth(3.55,4.18,t));
    const turnIn=.62*smooth(3.0,3.48,t)*(1-smooth(4.18,4.55,t));
    const counterSteer=-.49*smooth(4.28,5.8,t)*(1-smooth(5.8,7.25,t));
    const steer=turnIn+counterSteer;
    const offsetSpeed=1.52*(smoothDerivative(4.05,5.52,t)*(1-smooth(6.1,7.25,t))-smooth(4.05,5.52,t)*smoothDerivative(6.1,7.25,t));
    const theta=Math.PI-s/R,tangentSpeed=distanceVelocity(t)*(R+offset)/R;
    const actualHeading=s>=0&&s<=ARC?Math.atan2(tangentSpeed*Math.sin(theta)+offsetSpeed*Math.cos(theta),-tangentSpeed*Math.cos(theta)+offsetSpeed*Math.sin(theta)):p.yaw;
    return {time:t,s,x:p.x,z:p.z,pathYaw:p.yaw,velocityHeading:actualHeading,yaw:actualHeading+slip,slip,offset,brake,steer,
      pitch:.075*brake+.025*smooth(3.25,4.2,t)*(1-smooth(4.2,4.7,t)),roll:.083*drift,
      bodyHeight:.57-.036*brake-.020*drift,wheelAngle:s/wheelRadius};
  }
  function localToWorld(state,x,y,z) {
    return [state.x+Math.cos(state.yaw)*x+Math.sin(state.yaw)*z,y,state.z-Math.sin(state.yaw)*x+Math.cos(state.yaw)*z];
  }
  // Every particle has an immutable birth event and closed-form position.
  const particleDefs=[];
  for(let i=0;i<440;i++){
    const large=i>=424, birth=large?lerp(5.19,5.72,hash(i*17)):lerp(4.18,8.15,hash(i*17));
    const state=vehicleAt(birth), side=hash(i+8)>.26?-1:1;
    const origin=localToWorld(state,side*halfTrack,.10,-wheelbase/2);
    const angle=state.yaw+Math.PI+lerp(-.90,.90,hash(i*19));
    const speed=large?lerp(4.5,8,hash(i*31)):lerp(2.5,8,hash(i*31));
    particleDefs.push({id:i,kind:large?'stone':'gravel',birth,origin,
      velocity:large?[Math.sin(state.pathYaw)*lerp(12,17,hash(i*31)),lerp(3.6,5.0,hash(i*29)),Math.cos(state.pathYaw)*12+2.5]:
        [Math.sin(angle)*speed+Math.sin(state.pathYaw)*7,lerp(1.8,4.9,hash(i*29)),Math.cos(angle)*speed+Math.cos(state.pathYaw)*7],
      radius:large?lerp(.060,.115,hash(i*43)):lerp(.018,.044,hash(i*43))});
  }
  const dustDefs=[];
  for(let i=0;i<740;i++){
    const birth=lerp(.15,8.27,hash(i*53)), state=vehicleAt(birth), drift=smooth(4.05,5.2,birth);
    const origin=localToWorld(state,hash(i*3)>.5?-.92:.92,.08,-1.42);
    const angle=state.yaw+Math.PI+lerp(-.7,.7,hash(i*31));
    dustDefs.push({id:i,birth,origin,velocity:[Math.sin(angle)*(1.2+drift*2),.22+hash(i*71)*.52,Math.cos(angle)*(1.2+drift*2)],size:.11+hash(i*43)*.15,life:1.6+hash(i*17)*1.6});
  }
  function particleAt(p,t){
    const a=t-p.birth;
    if(a<0)return {visible:false,position:p.origin.slice(),radius:p.radius};
    const [x,y,z]=p.origin, [vx,vy,vz]=p.velocity;
    const hit=(vy+Math.sqrt(vy*vy+2*9.81*(y-p.radius)))/9.81;
    let position;
    if(a<=hit)position=[x+vx*a,y+vy*a-4.905*a*a,z+vz*a];
    else {
      const h=a-hit, travel=(1-Math.exp(-4*h))/4;
      const hx=x+vx*hit,hz=z+vz*hit;
      if(roadMargin(hx,hz)<0) position=[x+vx*a,y+vy*a-4.905*a*a,z+vz*a];
      else position=[hx+vx*.38*travel,p.radius,hz+vz*.38*travel];
    }
    return {visible:a<2.7,position,radius:p.radius};
  }
  const flying=new THREE.InstancedMesh(stoneGeo,mat(0x514d44),particleDefs.length);worldRoot.add(flying);flying.castShadow=true;
  const dustGeometry=new THREE.BufferGeometry(), dustPositions=new Float32Array(dustDefs.length*3),dustSizes=new Float32Array(dustDefs.length),dustAlpha=new Float32Array(dustDefs.length);
  dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
  dustGeometry.setAttribute('size',new THREE.BufferAttribute(dustSizes,1));
  dustGeometry.setAttribute('alpha',new THREE.BufferAttribute(dustAlpha,1));
  const dustMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{resolution:{value:720}},
    vertexShader:`attribute float size; attribute float alpha; varying float a; uniform float resolution;
    void main(){a=alpha;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*resolution/max(.1,-p.z),0.,210.);}`,
    fragmentShader:`varying float a;void main(){float r=length(gl_PointCoord-.5)*2.;float f=exp(-r*r*4.)*smoothstep(1.,.65,r);gl_FragColor=vec4(.68,.62,.50,a*f);}`
  });
  const dustCloud=new THREE.Points(dustGeometry,dustMaterial);dustCloud.frustumCulled=false;worldRoot.add(dustCloud);
  function updateRod(o,a,b) {
    const delta=V(...b).sub(V(...a)); o.position.copy(V(...a).add(V(...b)).multiplyScalar(.5));
    o.quaternion.setFromUnitVectors(V(0,1,0),delta.clone().normalize());o.scale.y=delta.length();
  }
  let state, presentationTime=0, mappedTime=0, cameraTarget=V();
  function cameraAt(t,v) {
    if(t<2){
      const q=t/2;
      camera.position.set(lerp(4,3,q),lerp(58,55,q),lerp(48,45,q));cameraTarget.set(0,0,-19);
      camera.fov=52;
    } else if(t<4.2) {
      const pedalShot=t<3;
      const p=pedalShot?V(.10,.34,.14):V(.62,.91,-.04);
      const target=pedalShot?V(-.28,.11,.84):V(-.34,.75,.47);
      sprung.updateWorldMatrix(true,false);camera.position.copy(sprung.localToWorld(p));cameraTarget.copy(sprung.localToWorld(target));
      camera.fov=pedalShot?46:70;
    } else {
      const freeze=vehicleAt(5.8), q=smooth(4.2,5.8,t), orbit=clamp((t-5.8)/2);
      const angle=t<5.8?lerp(.52,-.30,q):-.30-orbit*38*Math.PI/180;
      const focus=t<=7.8?v:freeze;
      const p=localToWorld(focus,Math.sin(angle)*7.7,1.22,Math.cos(angle)*7.7);
      camera.position.set(...p);cameraTarget.set(v.x,.79,v.z);camera.fov=50;
    }
    camera.up.set(0,1,0);camera.lookAt(cameraTarget);camera.updateProjectionMatrix();
  }
  function physicalSnapshot(t){
    const v=vehicleAt(t), contacts=wheels.map(w=>({name:`${w.x<0?'outside-left':'inside-right'}-${w.z>0?'front':'rear'}`,
      center:localToWorld(v,w.x,wheelRadius,w.z),footprintMargin:roadMargin(...[localToWorld(v,w.x,0,w.z)[0],localToWorld(v,w.x,0,w.z)[2]])-.19}));
    return {vehicle:v,contacts,particles:particleDefs.map(p=>({id:p.id,kind:p.kind,...particleAt(p,t)})),
      dust:dustDefs.map(p=>({id:p.id,age:t-p.birth,position:p.origin.map((n,i)=>n+p.velocity[i]*Math.max(0,t-p.birth))}))};
  }
  function displayedSteer(t,v) {
    return t>=3&&t<4.2?-v.steer:v.steer;
  }
  function setTime(t){
    presentationTime=t;mappedTime=sourcePresentationTime(t);
    const tau=physicalTime(mappedTime);state=vehicleAt(tau);
    car.position.set(state.x,0,state.z);car.rotation.y=state.yaw;
    const mirrorCockpitWorld=mappedTime>=3&&mappedTime<4.2;
    if(mirrorCockpitWorld){
      worldRoot.matrix.identity()
        .premultiply(new THREE.Matrix4().makeTranslation(-state.x,0,-state.z))
        .premultiply(new THREE.Matrix4().makeScale(-1,1,1))
        .premultiply(new THREE.Matrix4().makeRotationY(.40))
        .premultiply(new THREE.Matrix4().makeTranslation(state.x,0,state.z));
    }else worldRoot.matrix.identity();
    worldRoot.matrixWorldNeedsUpdate=true;
    sprung.position.y=state.bodyHeight;sprung.rotation.set(state.pitch,0,state.roll);
    for(const w of wheels){w.hub.rotation.y=w.z>0?state.steer:0;w.rotor.rotation.x=state.wheelAngle;}
    for(const s of suspensions){
      const height=state.bodyHeight+.30+state.roll*s.x-state.pitch*s.z;
      updateRod(s.strut,[s.x,.37,s.z],[s.x,height,s.z]);s.spring.position.y=(height+.37)/2;
    }
    const bodyLoad=.15*state.brake;
    driver.position.z=bodyLoad;driver.rotation.x=.12*state.brake;
    updateRod(harness[0],[-.54,.85,-.255+bodyLoad],[-.533,.36,-.20]);
    updateRod(harness[1],[-.32,.85,-.255+bodyLoad],[-.324,.36,-.20]);
    updateRod(lapHarness,[-.65,.36,-.24],[-.22,.36,-.24]);
    pedalPivot.rotation.x=-.58*state.brake;
    rightBoot.position.set(-.28,.13-.025*state.brake,.57+.23*state.brake);
    rightBoot.rotation.x=.34*state.brake;
    const cockpitSteer=displayedSteer(mappedTime,state);
    steeringRotor.rotation.z=-cockpitSteer*2.8;
    for(let i=0;i<2;i++){
      const a=(i===0?-Math.PI/2:Math.PI/2)-cockpitSteer*2.8;
      const hand=V(Math.sin(a)*.225,Math.cos(a)*.225,0).applyEuler(steering.rotation).add(steering.position);
      gloves[i].position.copy(hand);
      const shoulder=[i===0?-.64:-.22,.78,-.32+bodyLoad];
      const elbow=[i===0?-.76:-.08,.53,-.04];
      updateRod(arms[i*2],shoulder,elbow);updateRod(arms[i*2+1],elbow,hand.toArray());
    }
    particleDefs.forEach((p,i)=>{
      const a=tau-p.birth, s=particleAt(p,tau);
      dummy.position.set(...s.position);dummy.rotation.set(a*(1+hash(i)*5),i+a*2,a*3);
      dummy.scale.setScalar(s.visible?p.radius:0);dummy.updateMatrix();flying.setMatrixAt(i,dummy.matrix);
    });flying.instanceMatrix.needsUpdate=true;
    dustDefs.forEach((p,i)=>{
      const a=tau-p.birth, valid=a>=0&&a<p.life;
      dustPositions.set(p.origin.map((n,j)=>n+p.velocity[j]*Math.max(a,0)),i*3);
      dustSizes[i]=valid?p.size+Math.max(a,0)*.9:0;
      dustAlpha[i]=valid?.18*Math.sin(Math.PI*clamp(a/p.life))*(p.birth<3.4?.35:1):0;
    });
    for(const key of ['position','size','alpha'])dustGeometry.attributes[key].needsUpdate=true;
    cameraAt(mappedTime,state);
    scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  }
  window.caseEvidence={
    physicalTime,vehicleAt,physicalSnapshot,roadMargin,displayedSteer,sourcePresentationTime,
    snapshot(){return {presentationTime,mappedTime,physicalTime:physicalTime(mappedTime),physical:physicalSnapshot(physicalTime(mappedTime)),
      cockpitSteeringDisplay:displayedSteer(mappedTime,state),
      cockpitWorldTopology:{
        mirroredAcrossVehicleLongitudinalPlane:mappedTime>=3&&mappedTime<4.2,
        innerWallSide:"screen-left",
        outerValleySide:"screen-right",
        roadBend:"left"
      },
      temporalComposition:{
        outputWindow:[3,4],
        expandedPatchWindow:[.8,7],
        sourceSteeringWindow:[3,3.6],
        sourceResumeAt:4
      },
      camera:{position:camera.position.toArray(),target:cameraTarget.toArray(),fov:camera.fov},
      topology:{radius:R,width:HALF*2,turnDegrees:180,connectedSurface:true},particlePopulation:{dust:dustDefs.length,gravel:424,largeStones:16}};},
    project(points){return points.map(p=>{const v=V(...p).project(camera);return [(v.x+1)/2,(1-v.y)/2,v.z];});}
  };
  setTime(0);
  return {scene,camera,setTime};
}
