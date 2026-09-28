export function buildScene(THREE, spec) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b1aea0');
  const camera = new THREE.PerspectiveCamera(51, spec.target.width / spec.target.height, 0.06, 35);
  let seed = 7315;
  const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const material = (color, roughness = .75, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  function proceduralMap(kind, size = kind === 'wood' ? 512 : 256) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const pixels = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const n = rand();
      let v;
      if (kind === 'wood') {
        v = 174 + 7 * Math.sin(y * .18 + Math.sin(x * .012) * 1.8) +
          3 * Math.sin(y * .91 + Math.sin(x * .018) * 2) + n * 12;
      } else if (kind === 'curtain') {
        v = 157 + 16 * Math.sin(x * 2.6) + 8 * Math.sin(y * 2.7) + 35 * n;
      } else {
        v = 162 + 52 * n + ((x + y) % 4 === 0 ? 27 : -8) +
          21 * Math.sin(x * 1.57) * Math.cos(y * 1.57) +
          7 * Math.sin(x * .071 + y * .028);
      }
      const i = (y * size + x) * 4;
      pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = v;
      pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(kind === 'wood' ? 1 : 1.4, kind === 'wood' ? 1 : 1.4);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }
  const clothMap = proceduralMap('cloth');
  const curtainMap = proceduralMap('curtain');
  const woodMap = proceduralMap('wood');
  const fabric = color => material(color, 1, { map: clothMap, bumpMap: clothMap, bumpScale: .008, envMapIntensity: .08 });
  const blue = fabric('#72888c'), blueDark = fabric('#51666a');
  const sofaCloth = fabric('#85847c'), sofaDark = fabric('#56594f');
  const cream = fabric('#e3d9b0'), brown = fabric('#795330');
  const wall = material('#e4dcc8'), trim = material('#ece8db');
  const black = material('#111714', .42), screenMat = new THREE.MeshBasicMaterial({ color: '#030607' });
  const speakerBlack = material('#161b1a', .58);
  const grille = fabric('#202624');
  const floorWood = material('#bc8e47', .62, { map: woodMap, bumpMap: woodMap, bumpScale: .003 });
  const oak = material('#b78636', .5, { map: woodMap });
  const tableWood = material('#955c2b', .34, { map: woodMap, bumpMap: woodMap, bumpScale: .002 });
  const metal = material('#dadace', .10, { metalness: 1 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: '#cfddd1', roughness: .08, metalness: .12, transparent: true,
    opacity: .09, side: THREE.DoubleSide, depthWrite: false, envMapIntensity: .30,
  });
  const glassRim = material('#c7d2bc', .18, { metalness: .48, transparent: true, opacity: .64 });

  // Generated illumination bands give metal and glass readable room-like highlights.
  const envCanvas = document.createElement('canvas');
  envCanvas.width = 512; envCanvas.height = 256;
  const ec = envCanvas.getContext('2d');
  const gradient = ec.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#b3ada0'); gradient.addColorStop(.48, '#d2cdb7');
  gradient.addColorStop(.53, '#49473b'); gradient.addColorStop(1, '#a07843');
  ec.fillStyle = gradient; ec.fillRect(0, 0, 512, 256);
  ec.fillStyle = '#f5f6df'; ec.fillRect(64, 40, 66, 91);
  ec.fillStyle = '#252b26'; ec.fillRect(240, 83, 120, 69);
  ec.fillStyle = '#8f805c'; ec.fillRect(146, 20, 29, 142);
  for (let i = 0; i < 19; i++) {
    ec.fillStyle = ['#d7d8bb', '#393b2e', '#d9b66e', '#f8f7d9', '#746b51'][i % 5];
    ec.fillRect(183 + i * 13, 78 + (i % 4) * 4, 3 + (i % 3) * 2, 82);
  }
  const env = new THREE.CanvasTexture(envCanvas);
  env.mapping = THREE.EquirectangularReflectionMapping;
  env.colorSpace = THREE.SRGBColorSpace;
  scene.environment = env;

  function mesh(geometry, mat, x, y, z, parent = scene) {
    const obj = new THREE.Mesh(geometry, mat);
    obj.position.set(x, y, z); obj.castShadow = true; obj.receiveShadow = true;
    parent.add(obj); return obj;
  }
  const box = (w, h, d, mat, x, y, z, parent) =>
    mesh(new THREE.BoxGeometry(w, h, d), mat, x, y, z, parent);
  function round(w, h, d, r, mat, x, y, z, parent = scene, rumple = 0) {
    const geo = new THREE.BoxGeometry(w, h, d, 9, 9, 9);
    const p = geo.attributes.position;
    const v = new THREE.Vector3(), inner = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      inner.set(
        THREE.MathUtils.clamp(v.x, -w / 2 + r, w / 2 - r),
        THREE.MathUtils.clamp(v.y, -h / 2 + r, h / 2 - r),
        THREE.MathUtils.clamp(v.z, -d / 2 + r, d / 2 - r),
      );
      const normal = v.clone().sub(inner).normalize();
      const ripple = rumple * .25 * Math.sin(v.x * 61 + v.y * 42) * Math.sin(v.z * 51 + v.x * 14);
      v.copy(inner).addScaledVector(normal, r + ripple);
      p.setXYZ(i, v.x, v.y, v.z);
    }
    geo.computeVertexNormals();
    return mesh(geo, mat, x, y, z, parent);
  }
  function ellipsoid(rx, ry, rz, mat, x, y, z, parent = scene) {
    const obj = mesh(new THREE.SphereGeometry(1, 26, 18), mat, x, y, z, parent);
    obj.scale.set(rx, ry, rz); return obj;
  }
  function tube(points, radius, mat, parent = scene, closed = false) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), closed);
    return mesh(new THREE.TubeGeometry(curve, Math.max(16, points.length * 5), radius, 7, closed), mat, 0, 0, 0, parent);
  }
  function cylinder(radius, height, mat, x, y, z, parent = scene, top = radius) {
    return mesh(new THREE.CylinderGeometry(top, radius, height, 32), mat, x, y, z, parent);
  }
  function torus(radius, thickness, mat, x, y, z, parent = scene) {
    const obj = mesh(new THREE.TorusGeometry(radius, thickness, 9, 48), mat, x, y, z, parent);
    obj.rotation.x = Math.PI / 2; return obj;
  }
  const group = (x, y, z, rotation = 0) => {
    const obj = new THREE.Group(); obj.position.set(x, y, z); obj.rotation.y = rotation; scene.add(obj); return obj;
  };

  // Architectural volumes include the actual window void, recess, jambs and skirting.
  box(8.2, .14, 9.5, material('#927347'), 0, -.10, .3);
  for (let i = 0; i < 34; i++) {
    const board = box(7.9, .055, .266, floorWood, 0, -.006, -4.1 + i * .27);
    board.material = floorWood.clone();
    board.material.color.offsetHSL(0, (rand() - .5) * .06, (rand() - .5) * .08);
    for (let j = 0; j < 3; j++) {
      const x = -3.4 + j * 2.55 + (i % 3) * .65;
      box(.008, .002, .264, material('#806139'), x, .024, -4.1 + i * .27);
      for (const dx of [-.02, .02]) ellipsoid(.007, .0012, .008, black, x + dx, .026, -4.02 + i * .27);
    }
  }
  box(1.02, 3.5, .18, wall, -3.44, 1.75, -3.4);
  box(3.5, 3.5, .18, wall, 1.55, 1.75, -3.4);
  box(2.28, .88, .18, wall, -1.8, .44, -3.4);
  box(2.28, .50, .18, wall, -1.8, 3.25, -3.4);
  box(.18, 3.5, 9.1, wall, -4.02, 1.75, 1.05);
  box(.18, 3.5, 9.1, wall, 3.24, 1.75, 1.05);
  box(7.4, .14, 9.1, material('#d6d2bd'), -.38, 3.56, 1.05);
  box(7.22, .15, .075, trim, -.38, .12, -3.28);
  box(.08, .15, 8.6, trim, 3.11, .12, 1.08);
  box(.08, .15, 8.6, trim, -3.9, .12, 1.08);
  box(2.38, .075, .42, trim, -1.8, .89, -3.24);
  box(2.28, 2.13, .03, material('#e4e9de', .9, { emissive: '#c6d1c7', emissiveIntensity: .32 }), -1.8, 1.96, -3.54);
  for (const x of [-2.92, -1.8, -.68]) box(.065, 2.18, .14, trim, x, 1.98, -3.34);
  for (const y of [.94, 2.95]) box(2.26, .065, .14, trim, -1.8, y, -3.34);
  const sheerMat = material('#d6ddcc', 1, { map: clothMap, transparent: true, opacity: .77, side: THREE.DoubleSide });
  box(2.18, 2.08, .018, sheerMat, -1.8, 1.97, -3.21);
  const curtainMat = material('#6b654a', .93, { map: curtainMap, bumpMap: curtainMap, bumpScale: .009, side: THREE.DoubleSide });
  function curtain(x, width) {
    const geometry = new THREE.PlaneGeometry(width, 3.35, 104, 22);
    const p = geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const px = p.getX(i), py = p.getY(i);
      const wave = Math.sin((px + width / 2) * 37) * .075 + Math.sin(px * 74) * .018;
      p.setXYZ(i, px + .025 * Math.sin(py * 1.9), py + .014 * Math.cos(px * 37), wave);
    }
    geometry.computeVertexNormals();
    mesh(geometry, curtainMat, x, 1.72, -2.99);
    tube(Array.from({ length: 36 }, (_, i) => {
      const xx = -width / 2 + i * width / 35;
      return [x + xx, .075 + .014 * Math.cos(xx * 37), -2.99 + .075 * Math.sin((xx + width / 2) * 37)];
    }), .012, curtainMat);
  }
  curtain(-3.27, .93); curtain(.04, 1.70);
  const curtainRod = cylinder(.022, 4.42, metal, -1.58, 3.31, -2.93);
  curtainRod.rotation.z = Math.PI / 2;

  // Complete the unseen enclosure without deleting walls for the orbit.
  box(.48, 3.5, .18, wall, -.43, 1.75, -3.4);
  box(4.77, 3.5, .18, wall, -1.565, 1.75, 4.76);
  box(1.10, 3.5, .18, wall, 2.69, 1.75, 4.76);
  box(1.36, .86, .18, wall, 1.49, 3.07, 4.76);
  for (const x of [.81, 2.17]) box(.10, 2.66, .24, trim, x, 1.33, 4.71);
  box(1.46, .11, .24, trim, 1.49, 2.69, 4.71);
  box(4.70, .15, .075, trim, -1.56, .12, 4.64);
  box(1.02, .15, .075, trim, 2.68, .12, 4.64);
  box(1.38, .08, 2.3, floorWood, 1.49, -.014, 5.84);
  box(1.55, 3.5, .16, wall, 1.49, 1.75, 6.95);
  for (const x of [.74, 2.24]) box(.14, 3.5, 2.3, wall, x, 1.75, 5.84);
  box(1.55, .14, 2.3, trim, 1.49, 3.56, 5.84);
  const entryDoor = group(2.15, 0, 4.81, -1.16);
  box(1.28, 2.55, .075, trim, -.64, 1.29, 0, entryDoor);
  for (const y of [.76, 1.89]) {
    box(.93, .90, .02, material('#c9c3aa'), -.64, y, -.05, entryDoor);
    box(.81, .77, .025, trim, -.64, y, -.064, entryDoor);
  }
  cylinder(.03, .065, metal, -1.13, 1.15, -.10, entryDoor).rotation.x = Math.PI / 2;
  box(.16, .027, .027, metal, -1.05, 1.15, -.15, entryDoor);
  for (const x of [-3.87, 3.09]) box(.10, .10, 8.0, trim, x, 3.40, .65);
  for (const z of [-3.26, 4.64]) box(7.1, .10, .10, trim, -.38, 3.40, z);
  for (const [x,z] of [[-3.89,2.9],[3.10,2.8]]) {
    const socket = box(.025, .13, .19, trim, x, .30, z);
    for (const dz of [-.047,.047]) box(.027,.028,.012,black,x,.30,z+dz);
  }
  box(.026, .16, .11, trim, 2.63, 1.22, 4.63).rotation.y = Math.PI / 2;
  const ceilingRose = cylinder(.19, .055, trim, -.3, 3.445, .6);
  cylinder(.012, .22, black, -.3, 3.31, .6);
  const shade = material('#d7cba9', .95, {side: THREE.DoubleSide});
  mesh(new THREE.CylinderGeometry(.27,.47,.30,48,1,true),shade,-.3,3.05,.6);
  cylinder(.44,.015,material('#faf0d1',.7,{emissive:'#fff1cb',emissiveIntensity:.3}),-.3,2.897,.6);

  // Conservative rear-wall furniture remains outside the source-camera crop.
  const bookcase = group(-2.62, 0, 4.47);
  for (const x of [-.59,.59]) box(.065,1.72,.36,oak,x,.88,0,bookcase);
  box(1.24,1.7,.045,oak,0,.9,.16,bookcase);
  for(const y of [.07,.46,.87,1.29,1.76]) box(1.24,.05,.38,oak,0,y,0,bookcase);
  for(let row=0;row<4;row++) for(let i=0;i<10;i++){
    const colors=['#5b6250','#a6754c','#343e48','#bdb59a','#693a31','#7b7b70'];
    const h=.23+rand()*.10;
    box(.042+rand()*.025,h,.235,material(colors[(i+row)%colors.length]),-.48+i*.096,.10+row*.40+h/2,-.025,bookcase);
  }
  cylinder(.22,.035,black,-3.38,.065,3.57);
  cylinder(.018,1.62,material('#5c4d38',.4,{metalness:.6}),-3.38,.87,3.57);
  mesh(new THREE.CylinderGeometry(.19,.33,.40,40,1,true),shade,-3.38,1.77,3.57);
  const frameBack = material('#625236');
  for(const [x,y,w,h] of [[-1.10,2.13,.80,.62],[-2.70,2.42,.72,.58]]){
    box(w,h,.05,frameBack,x,y,4.61);
    box(w-.075,h-.075,.01,material('#d0c3a0'),x,y,4.578);
    for(let i=0;i<5;i++) box((w-.15)/5,.10+rand()*.15,.005,material(['#6a7557','#8a9471','#a89571'][i%3]),x-w*.34+i*w*.17,y-.07,4.57);
  }

  // Upholstered recliner: sloped lumbar, padded headrest, curved arms, feet and seams.
  const chair = group(-1.44, 0, -2.30, -.02);
  chair.scale.set(1.30, 1.21, 1.30);
  for (const x of [-.46, .46]) for (const z of [-.34, .37])
    cylinder(.042, .14, black, x, .085, z, chair);
  round(1.17, .41, 1.0, .14, blueDark, 0, .29, .06, chair);
  round(1.14, .27, .86, .12, blue, 0, .49, .16, chair, .006);
  round(1.05, .27, .89, .12, blue, 0, .67, .15, chair, .007);
  const back = round(1.02, 1.22, .24, .10, blueDark, 0, 1.20, -.32, chair, .004);
  back.rotation.x = -.1;
  const lumbar = round(.98, .40, .24, .09, blue, 0, 1.12, -.16, chair, .006);
  lumbar.rotation.x = -.12;
  const head = round(1.02, .46, .28, .13, blue, 0, 1.57, -.29, chair, .01);
  head.rotation.x = -.13;
  for (const x of [-.61, .61]) {
    round(.26, .63, .91, .10, blueDark, x, .54, .06, chair);
    const arm = round(.33, .23, .95, .11, blue, x, .90, .10, chair, .008);
    arm.rotation.z = x < 0 ? -.08 : .08;
    tube([[x - .12, .87, .53], [x, .84, .59], [x + .12, .87, .53]], .007, blueDark, chair);
  }
  tube([[-.45, .71, .52], [0, .70, .55], [.45, .71, .52]], .006, blueDark, chair);
  // The cream-and-brown dog is curled sideways rather than sitting like a person.
  const dog = new THREE.Group(); chair.add(dog); dog.position.set(-.03, .90, .13); dog.rotation.y = -.25;
  dog.scale.set(1.11, 1.09, 1.04);
  ellipsoid(.34, .22, .22, cream, -.06, .17, -.03, dog);
  ellipsoid(.115, .105, .032, brown, -.22, .20, .175, dog);
  ellipsoid(.12, .045, .13, brown, .10, .36, -.03, dog);
  ellipsoid(.19, .17, .18, cream, .28, .12, .04, dog);
  const ear = ellipsoid(.085, .145, .075, brown, .35, .08, .17, dog);
  ear.rotation.z = -.70;
  ellipsoid(.115, .075, .095, cream, .40, .05, .06, dog);
  ellipsoid(.034, .027, .03, black, .477, .069, .11, dog);
  for (const x of [-.23, .04]) {
    ellipsoid(.14, .11, .16, cream, x, .01, .23, dog);
    ellipsoid(.095, .06, .07, brown, x, -.015, .36, dog);
  }
  const furGeometry = new THREE.IcosahedronGeometry(.0048, 0);
  const fur = new THREE.InstancedMesh(furGeometry, cream, 2400);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 2400; i++) {
    const theta = rand() * Math.PI * 2, u = rand() * 2 - 1, r = Math.sqrt(1 - u * u);
    dummy.position.set(-.06 + .342 * r * Math.cos(theta), .17 + .223 * u, -.03 + .224 * r * Math.sin(theta));
    dummy.scale.setScalar(.65 + rand() * .7); dummy.updateMatrix(); fur.setMatrixAt(i, dummy.matrix);
  }
  dog.add(fur);

  // Left sofa continues off the photographed crop; the nearer seat occludes the floor.
  const sofa = group(-3.08, 0, .83);
  round(1.23, .40, 3.65, .10, sofaDark, 0, .26, 0, sofa);
  for (const z of [-1.22, 0, 1.22]) {
    round(1.07, .31, 1.14, .11, sofaCloth, .05, .55, z, sofa, .004);
    const backCushion = round(.29, .86, 1.14, .12, sofaCloth, -.45, .91, z, sofa, .006);
    backCushion.rotation.z = .07;
    tube([[.48, .61, z - .51], [.53, .57, z], [.48, .61, z + .51]], .006, sofaDark, sofa);
  }
  for (const z of [-1.81, 1.80]) round(1.19, .67, .24, .09, sofaCloth, -.02, .59, z, sofa, .004);
  for(const z of [-1.22,0,1.22]){
    tube([[-.33,1.30,z-.49],[-.35,1.34,z],[-.33,1.30,z+.49]],.006,sofaDark,sofa);
  }
  const pillow = round(.55, .52, .22, .1, fabric('#4d5954'), -.16, .93, .88, sofa, .012);
  pillow.rotation.set(-.32, .25, -.17);
  for (let i = 0; i < 13; i++) {
    const petalMat = fabric(i % 2 ? '#ab513c' : '#d8b089');
    const a = i * .62;
    ellipsoid(.046, .10, .009, petalMat, -.16 + .20 * Math.cos(a), .94 + .20 * Math.sin(a), 1.005, sofa);
  }
  const blanket = round(.90, .10, .93, .045, fabric('#343e37'), .1, .80, 1.29, sofa, .021);
  blanket.rotation.set(.3, -.12, .20);
  round(.28, .14, .32, .06, fabric('#a6351f'), .24, .71, .63, sofa, .01);
  round(.19, .055, .20, .022, fabric('#d39716'), .34, .79, .72, sofa);
  const keyboard = group(-2.89, 1.0, -1.04, -.06);
  box(.86, .045, .28, black, 0, 0, 0, keyboard);
  for (let row = 0; row < 5; row++) for (let col = 0; col < 17; col++)
    box(.036, .009, .032, material('#323833'), -.39 + col * .046, .03, -.106 + row * .049, keyboard);
  box(.24, .009, .03, material('#51574d'), -.04, .032, .094, keyboard);

  const footstool = group(-1.82, 0, -.50, .10);
  footstool.scale.set(1.18, 1, 1.12);
  for (const x of [-.48, .48]) {
    tube([[x, .08, .33], [x, .22, .36], [x, .53, .28], [x, .57, -.38], [x, .37, -.46], [x, .07, -.4]], .042, oak, footstool);
  }
  round(.92, .18, .81, .075, blue, 0, .46, -.025, footstool, .004);

  // Woven geometric carpet. Every region is actual fixed floor geometry.
  const rugCream = fabric('#bac5bc'), rugDark = fabric('#355653');
  const rug = group(.22, 0, 1.42);
  box(3.72, .021, 3.74, rugCream, 0, .035, 0, rug);
  const rugPattern = new THREE.Shape();
  const outline = [[-.2,-1.375],[.855,-1.375],[.855,-1.065],[1.855,-1.065],
    [1.855,1.845],[-.095,1.845],[-.095,.84],[.35,.84],[.35,.12],[-.095,.12],
    [-.095,-.605],[-.2,-.605]];
  outline.forEach(([x,z], i) => i ? rugPattern.lineTo(x,-z) : rugPattern.moveTo(x,-z));
  rugPattern.closePath();
  const rugInset = mesh(new THREE.ShapeGeometry(rugPattern), rugDark, 0, .046, 0, rug);
  rugInset.rotation.x = -Math.PI / 2;
  function slipper(x, z, angle) {
    const s = group(x, .068, z, angle);
    ellipsoid(.123, .018, .252, material('#ac9764'), 0, .018, 0, s);
    ellipsoid(.110, .012, .232, cream, 0, .036, 0, s);
    const geo = new THREE.SphereGeometry(1, 28, 16, Math.PI, Math.PI, 0, Math.PI / 2);
    const upper = fabric('#a17528'); upper.side=THREE.DoubleSide;
    const top = mesh(geo, upper, 0, .047, .045, s);
    top.scale.set(.12, .115, .24);
    ellipsoid(.088, .006, .09, material('#574b2b'), 0, .053, -.02, s);
    tube([[-.115, .05, .059], [-.093, .13, .051], [0, .155, .045], [.093, .13, .051], [.115, .05, .059]], .018, cream, s);
    tube([[-.075, .128, -.045], [0, .16, -.03], [.075, .128, -.045]], .003, oak, s);
  }
  slipper(-.88, .72, -.48); slipper(-.51, .67, .35);

  // Right-wall media unit: deep television shell, glass shelves and separate electronics.
  const tv = group(2.20, 0, -.16, -Math.PI / 2);
  tv.scale.setScalar(1.055);
  const panelFrame = round(3.0, 1.80, .095, .024, black, 0, 1.64, 0, tv);
  panelFrame.rotation.z = -.13;
  const panelScreen = box(2.93, 1.73, .012, screenMat, 0, 1.645, .054, tv);
  panelScreen.rotation.z = -.13;
  const rearShell = round(1.58,.86,.14,.05,material('#252827'),0,1.54,-.12,tv);
  rearShell.rotation.z = -.13;
  for(let i=0;i<28;i++) box(.012,.16,.009,black,-.64+i*.047,1.74,-.197,tv);
  for(const x of [-.57,.57]) for(const y of [1.28,1.83])
    ellipsoid(.012,.012,.006,metal,x,y,-.199,tv);
  for(let i=0;i<4;i++) box(.052,.024,.012,black,.66,1.30+i*.045,-.202,tv);
  box(.38, .36, .07, black, 0, 1.05, -.04, tv);
  round(.74, .024, .34, .011, black, 0, .996, .04, tv);
  ellipsoid(.006, .005, .004, material('#416757', .5, { emissive: '#557263', emissiveIntensity: .3 }), .86, 1.057, .061, tv);
  const shelfGlass = material('#82958b', .18, { transparent: true, opacity: .25, metalness: .2, depthWrite: false });
  for (const y of [.12, .48, .98]) {
    box(2.87, .020, .65, shelfGlass, 0, y, .015, tv);
    box(2.88, .012, .018, glassRim, 0, y, .347, tv);
  }
  for (const x of [-1.28, 1.28]) for (const z of [-.24, .25])
    cylinder(.027, .88, material('#64452a', .35, { metalness: .3 }), x, .54, z, tv);
  round(1.26, .36, .35, .018, speakerBlack, .40, .31, .03, tv);
  function driver(parent, x, y, z, radius) {
    const ring = torus(radius, .011, black, x, y, z, parent); ring.rotation.x = 0;
    mesh(new THREE.CircleGeometry(radius * .86, 40), material('#c0c2ad', .38, { metalness: .52 }), x, y, z + .004, parent);
    const dust = ellipsoid(radius * .34, radius * .34, .026, speakerBlack, x, y, z + .015, parent);
    return dust;
  }
  for (const x of [-.09, .90]) driver(tv, x, .31, .22, .126);
  driver(tv, .40, .32, .22, .060);
  box(.34, .19, .075, black, -.55, .26, .24, tv);
  round(.064, .18, .065, .025, material('#bd3222', .48), -.75, .26, .24, tv);
  for (const y of [.21, .26, .30]) ellipsoid(.009, .009, .005, black, -.75, y, .276, tv);
  round(.45, .045, .29, .012, material('#b3b2a4'), -.83, .50, .02, tv);
  box(.27, .11, .19, black, -.88, .21, .01, tv);
  for (let i = 0; i < 6; i++) {
    const x = -.9 + i * .18;
    tube([[x, .99, -.17], [x + .08, .79, -.22], [x - .15, .31, -.13],
      [x + .08, .16, .16], [x + .27, .20, .08]], .009, i % 3 === 0 ? trim : black, tv);
  }
  const speaker = group(1.45, 0, -1.72, -.08);
  speaker.scale.setScalar(1.18);
  box(.65, .81, .53, speakerBlack, 0, 1.37, 0, speaker);
  box(.57, .76, .013, black, 0, 1.37, .276, speaker);
  driver(speaker, 0, 1.22, .291, .159);
  driver(speaker, 0, 1.59, .291, .047);
  box(.59, .045, .46, black, 0, .94, 0, speaker);
  for (const x of [-.21, .21]) box(.065, .79, .075, black, x, .52, -.10, speaker);
  box(.64, .042, .54, black, 0, .10, .03, speaker);
  const sub = group(.54, 0, -.30, -.03);
  sub.scale.setScalar(1.12);
  round(.80, .95, .74, .014, speakerBlack, 0, .50, 0, sub);
  box(.70, .82, .010, grille, 0, .50, .377, sub);
  box(.70, .010, .65, material('#222a26'), 0, .982, 0, sub);
  for (let i = 0; i < 4; i++) cylinder(.007, .003, metal, .16 + i * .035, .99, .24, sub);
  const radiator = group(2.53, 0, -2.15);
  box(.13, 1.50, 1.49, trim, 0, .83, 0, radiator);
  for (let i = 0; i < 15; i++) box(.055, 1.38, .039, material('#c4c5b8'), -.092, .84, -.68 + i * .095, radiator);
  tube([[2.38, .15, -2.83], [2.33, .08, -2.6], [2.33, .08, -1.6]], .018, trim);
  box(1.25, .055, .55, black, 1.89, 1.62, -2.57);
  for (const x of [1.34, 2.43]) box(.04, 1.60, .05, black, x, .81, -2.64);
  round(.38, .13, .43, .035, trim, 2.27, 1.68, -2.56);
  round(.24, .47, .16, .031, black, 2.27, 1.90, -2.61);
  cylinder(.053, .14, material('#3a2619'), 1.86, 1.75, -2.67);
  cylinder(.058, .025, material('#a22c21'), 1.86, 1.835, -2.67);
  box(.64, .64, .018, trim, 2.23, 2.97, -3.26);
  box(.54, .54, .021, material('#30282a'), 2.23, 2.97, -3.245);
  for (let i = 0; i < 11; i++) {
    const petal = ellipsoid(.06, .11, .006, material(i % 2 ? '#b44e62' : '#da767d'), 2.02 + rand() * .43, 2.76 + rand() * .43, -3.23);
    petal.rotation.z = rand() * 3;
  }

  // Foreground steel-frame walnut table and freestanding hollow vessels.
  const table = group(-1.75, 0, 1.48, .28);
  table.scale.set(.88, 1, .90);
  box(1.28, .040, 1.01, tableWood, 0, .698, 0, table);
  for (const x of [-.655, .655]) box(.045, .075, 1.10, black, x, .69, 0, table);
  for (const z of [-.527, .527]) box(1.35, .075, .045, black, 0, .69, z, table);
  for (const x of [-.635, .635]) for (const z of [-.505, .505]) box(.046, .67, .048, black, x, .337, z, table);
  function lathe(profile, mat, x, y, z, parent) {
    return mesh(new THREE.LatheGeometry(profile.map(p => new THREE.Vector2(...p)), 64), mat, x, y, z, parent);
  }
  lathe([[.075, 0], [.080, .013], [.091, .045], [.099, .15], [.096, .235], [.080, .29],
    [.074, .29], [.090, .23], [.093, .15], [.079, .032], [.01, .022]], glass, -.44, .726, -.08, table);
  torus(.078, .0038, glassRim, -.44, 1.017, -.08, table);
  torus(.074, .004, glassRim, -.44, .738, -.08, table);
  lathe([[.09, 0], [.114, .016], [.119, .065], [.117, .21], [.09, .33], [.060, .46],
    [.055, .54], [.065, .57], [.070, .58], [.060, .583], [.049, .55], [.050, .46],
    [.081, .33], [.106, .21], [.108, .044], [.01, .029]], glass, .37, .726, -.05, table);
  torus(.069, .004, glassRim, .37, 1.309, -.05, table);
  torus(.106, .006, glassRim, .37, .750, -.05, table);
  tube([[.273,.77,-.01],[.269,.88,-.01],[.294,1.03,-.028],[.322,1.17,-.041],[.326,1.28,-.05]], .0022, glassRim, table);
  tube([[.429,.77,.03],[.44,.90,.01],[.406,1.10,-.015]], .0016, glassRim, table);
  const water = material('#bdcbbb', .15, { transparent: true, opacity: .11, depthWrite: false });
  cylinder(.107, .037, water, .37, .773, -.05, table);
  lathe([[.063, 0], [.065, .045], [.064, .25], [.057, .33], [.033, .385], [.031, .456],
    [.026, .456], [.027, .385], [.056, .31], [.056, .022], [.01, .018]], glass, .49, .726, -.15, table);
  cylinder(.034, .047, material('#214c64', .38), .49, 1.195, -.15, table);
  cylinder(.060, .025, glassRim, .49, .751, -.15, table);
  box(.092, .09, .008, material('#c4be9a'), .49, .945, -.088, table);
  // Double-walled lathe leaves the bowl interior open and reflective.
  lathe([[.10, 0], [.135, .014], [.173, .068], [.194, .145], [.21, .221],
    [.205, .235], [.196, .230], [.188, .152], [.161, .069], [.125, .026], [.015, .024]],
  metal, -.055, .727, .11, table);
  torus(.204, .009, metal, -.055, .962, .11, table);
  tube([[-.36, .875, .13], [-.15, .915, .15], [.06, .947, .17]], .010, oak, table);
  ellipsoid(.047, .008, .026, metal, .09, .95, .17, table);
  const remote = round(.093, .031, .27, .013, black, -.28, .746, -.015, table);
  remote.rotation.y = -.55;
  for (let i = 0; i < 5; i++) ellipsoid(.009, .002, .008, material('#6b6e64'), -.285, .766, -.1 + i * .039, table);
  for (const x of [.37, .50]) {
    tube([[x - .048, .741, .30], [x - .052, .765, .36], [x, .77, .41],
      [x + .05, .762, .36], [x + .045, .74, .30]], .0034, material('#594126'), table, true);
  }
  tube([[.414, .753, .34], [.435, .756, .33], [.452, .753, .34]], .003, metal, table);
  tube([[.55, .749, .32], [.57, .77, .19], [.52, .79, .10]], .003, black, table);
  tube([[.32, .749, .32], [.33, .77, .19], [.29, .79, .10]], .003, black, table);

  scene.add(new THREE.HemisphereLight('#f4f4db', '#615036', 1.9));
  const key = new THREE.DirectionalLight('#fff6da', 1.05);
  key.position.set(-2.6, 4.6, -1.8); key.target.position.set(0, 0, 1);
  key.castShadow = true; key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -6; key.shadow.camera.right = 6;
  key.shadow.camera.top = 6; key.shadow.camera.bottom = -6;
  key.shadow.normalBias = .023; key.shadow.bias = -.00015;
  scene.add(key, key.target);
  const fill = new THREE.PointLight('#e2e4ce', 1.25, 10, 2);
  fill.position.set(-1.7, 3.4, -2.5); scene.add(fill);
  const ambient = new THREE.PointLight('#eadbb2', 5, 12, 2);
  ambient.position.set(-1.5, 3.15, 2); scene.add(ambient);

  // Gray geometry must not inherit the RGB scene's warm illumination.
  if (new URLSearchParams(window.location.search).get('renderOverride') === 'gray-model') {
    scene.environment = null;
    const neutralize = color => {
      const luminance = .2126 * color.r + .7152 * color.g + .0722 * color.b;
      color.setRGB(luminance, luminance, luminance);
    };
    scene.traverse(object => {
      if (!object.isLight) return;
      neutralize(object.color);
      if (object.groundColor) neutralize(object.groundColor);
    });
  }

  const motion = [
    [5.172281893, 2.05, -.20, .40, -1.05, 51],
    [3.60, 2.22, -.55, .57, .10, 60],
    [2.60, 2.62, -.60, .64, .50, 67],
    [2.50, 2.85, -.60, .66, .65, 71],
    [2.40, 2.94, -.60, .66, .65, 73],
    [2.35, 2.92, -.60, .66, .65, 76],
    [2.30, 2.92, -.60, .66, .65, 76],
    [2.28, 2.86, -.60, .66, .65, 72],
    [2.34, 2.57, -.60, .66, .65, 67],
    [2.62, 2.25, -.60, .60, .65, 59],
    [3.00, 2.06, -.65, .54, .65, 55],
  ];
  const startBearing = Math.atan2(-1.5, 4.95);
  function poseAt(time) {
    const t = THREE.MathUtils.clamp(time, 0, 10);
    const i = Math.min(9, Math.floor(t)), u = t - i;
    const p = motion[i].map((v, j) => {
      const before = motion[Math.max(0,i-1)][j], after = motion[Math.min(10,i+2)][j];
      const next = motion[i+1][j];
      const m0 = (next-before)/2, m1=(after-v)/2;
      return (2*u*u*u-3*u*u+1)*v+(u*u*u-2*u*u+u)*m0+
        (-2*u*u*u+3*u*u)*next+(u*u*u-u*u)*m1;
    });
    const a = startBearing + THREE.MathUtils.degToRad(35.9 * t);
    return {time:t, position:[p[2]+p[0]*Math.sin(a),p[1],p[4]+p[0]*Math.cos(a)],
      target:p.slice(2,5), fov:p[5], orbitProgressDegrees:35.9*t};
  }
  function setTime(time) {
    const p = poseAt(time);
    camera.position.fromArray(p.position);
    camera.fov = p.fov;
    camera.updateProjectionMatrix();
    camera.lookAt(...p.target);
  }
  scene.userData.cameraPoses = Array.from({length:11},(_,time)=>poseAt(time));
  window.roomInspection = {THREE,scene,camera,poseAt};
  setTime(0);
  return { scene, camera, setTime };
}
