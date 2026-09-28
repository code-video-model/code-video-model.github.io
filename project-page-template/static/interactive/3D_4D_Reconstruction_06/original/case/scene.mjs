import { cameraPose } from './camera-trajectory.mjs';

export function buildScene(THREE, spec) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#b5a18a');
  const camera = new THREE.PerspectiveCamera(45, spec.target.width / spec.target.height, 0.05, 60);
  const sourcePosition = new THREE.Vector3(0, 4.3, 7);
  const sourceTarget = new THREE.Vector3(0, 2.9, 0);
  camera.position.copy(sourcePosition);
  camera.lookAt(sourceTarget);
  camera.updateMatrixWorld(true);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const pixel = (x, y, z) => {
    const ray = V(x / 480 - 1, 1 - y / 360, 0.5).unproject(camera).sub(sourcePosition);
    return sourcePosition.clone().addScaledVector(ray, (z - sourcePosition.z) / ray.z);
  };
  const material = (color, roughness = 0.75, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const M = {
    wall: material('#c9b9a9'), trim: material('#d9cbbf'), blind: material('#bba99b'),
    seam: material('#8a7968'), black: material('#101310'), iron: material('#111412', 0.57, 0.3),
    steel: material('#a8aaa4', 0.24, 0.82), gold: material('#957c47', 0.34, 0.7),
    wood: material('#765132'), woodLight: material('#916640'), woodDark: material('#593d27'),
    skin: material('#a66a47', 0.83), skinShade: material('#825037'),
    hair: material('#15140f'), shirt: material('#343537'), cuff: material('#515050'),
    apron: material('#1e211e', .93), stitch: material('#494940'), white: material('#e2d9c6'),
    glass: material('#5f6540', 0.22, 0.25), olive: material('#343c1c', 0.25),
    red: material('#882c1b'), cream: material('#d6c29a'), blue: material('#243549'),
  };
  let root = scene;
  const mesh = (geometry, mat, parent = root) => {
    const m = new THREE.Mesh(geometry, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  };
  const box = (x, y, z, sx, sy, sz, mat, parent = root) => {
    const m = mesh(new THREE.BoxGeometry(sx, sy, sz), mat, parent);
    m.position.set(x, y, z);
    return m;
  };
  const sphereGeometry = new THREE.SphereGeometry(1, 20, 14);
  const ellipsoid = (p, scale, mat, parent = root) => {
    const m = mesh(sphereGeometry, mat, parent);
    m.position.copy(p);
    m.scale.set(...scale);
    return m;
  };
  const cylinder = (p, r, h, mat, parent = root, top = r) => {
    const m = mesh(new THREE.CylinderGeometry(top, r, h, 28), mat, parent);
    m.position.copy(p);
    return m;
  };
  const tube = (points, radius, mat, parent = root) =>
    mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), Math.max(10, points.length * 5), radius, 6, false), mat, parent);
  const line = (a, b, radius, mat, parent = root) => tube([a, a.clone().lerp(b, .5), b], radius, mat, parent);
  const torus = (p, radius, thickness, mat, parent = root, horizontal = true) => {
    const m = mesh(new THREE.TorusGeometry(radius, thickness, 8, 48), mat, parent);
    m.position.copy(p);
    if (horizontal) m.rotation.x = -Math.PI / 2;
    return m;
  };
  const lathe = (p, profile, mat, parent = root) => {
    const m = mesh(new THREE.LatheGeometry(profile.map(a => new THREE.Vector2(...a)), 40), mat, parent);
    m.position.copy(p);
    return m;
  };
  const frac = x => x - Math.floor(x);
  const rand = i => frac(Math.sin(i * 127.1 + 31.7) * 43758.5453);
  scene.add(new THREE.HemisphereLight('#fff0e5', '#655b51', 1.65));
  const key = new THREE.DirectionalLight('#fff0df', 1.8);
  key.position.set(-3.5, 7, 5);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -7;
  key.shadow.camera.right = 7;
  key.shadow.camera.top = 7;
  key.shadow.camera.bottom = -5;
  key.shadow.normalBias = 0.055;
  key.shadow.bias = -0.00015;
  key.shadow.radius = 4;
  scene.add(key);
  const fill = new THREE.DirectionalLight('#dadde5', .45);
  fill.position.set(5, 3, 4);
  scene.add(fill);

  // A source-centered similarity keeps architectural anchors while opening real orbit clearance.
  const architecture = new THREE.Group();
  architecture.name = 'deep-room-shell';
  architecture.position.copy(sourcePosition).multiplyScalar(-.8);
  architecture.scale.setScalar(1.8);
  scene.add(architecture);
  root = architecture;
  box(0, 2.7, -1.60, 13, 8, .20, M.wall);
  box(4.65, 2.4, 1, .18, 8, 5.1, M.wall);
  const winTL = pixel(169, 75, -1.35);
  const winBR = pixel(696, 520, -1.35);
  const wx = (winTL.x + winBR.x) / 2;
  const ww = winBR.x - winTL.x;
  box(wx, 3.13, -1.44, ww + .19, 4.4, .12, M.trim);
  box(wx, 2.75, -1.31, ww - .23, 3.85, .04, material('#111712', .2)).name = 'window-landmark';
  for (let i = 0; i < 7; i++) {
    const x = winTL.x + .32 + i * (ww - .65) / 6;
    box(x, 2.55, -1.22, .034, 2.42, .075, M.trim);
  }
  for (const y of [1.36, 2.18, 2.93]) box(wx, y, -1.18, ww - .30, .034, .085, M.trim);
  for (const x of [winTL.x, winBR.x]) box(x, 3.0, -1.13, .12, 4.35, .15, M.trim);
  box(wx, 1.20, -1.03, ww + .32, .12, .35, M.trim);
  box(wx, 1.07, -1.17, ww + .23, .10, .16, M.trim);
  box(wx, .25, -1.26, ww + .18, 1.80, .055, M.wall);
  for (let i = 0; i < 10; i++) {
    const a = pixel(169, 76 + i * 29.3, -1.06);
    const b = pixel(693, 106 + i * 29.3, -1.06);
    const h = a.y - b.y;
    const slat = box((a.x + b.x) / 2, (a.y + b.y) / 2, -1.08, b.x - a.x, h - .014, .09, M.blind);
    slat.rotation.x = -.025;
    slat.receiveShadow = false;
    box(slat.position.x, b.y + .012, -1.008, b.x - a.x, .023, .027, M.seam);
  }
  line(pixel(166, 82, -1.0), pixel(164, 358, -1.0), .012, M.seam);
  torus(pixel(164, 353, -.98), .035, .008, M.seam, root, false).scale.y = 2;
  for (let i = 0; i < 15; i++) {
    const slat = box(4.52, 5.75 - .29 * i, -.15, .075, .275, 2.6, M.blind);
    slat.rotation.z = -.015;
  }
  box(-4.3, 1.22, -.10, 1.4, .095, 1.0, M.trim);
  box(-4.3, 1.53, -.23, 1.05, .56, .65, M.steel);
  box(-4.3, 1.53, .11, .81, .34, .022, M.black);
  line(V(-4.68, 1.59, .15), V(-3.93, 1.59, .15), .025, M.steel);
  for (const y of [1.40, 1.67]) ellipsoid(V(-3.79, y, .14), [.058, .058, .033], M.black);
  root = scene;
  const stone = [material('#aaa08b', .93), material('#b1a58f', .94), material('#a79e8a', .92)];
  box(0, -1.69, 0, 23, .16, 22, material('#89836f', .98)).name = 'room-floor';
  for (let i = 0; i < 17; i++) for (let j = 0; j < 16; j++) {
    box(-10.8 + i * 1.35, -1.603, -10.1 + j * 1.35, 1.337, .014, 1.337, stone[(i + j * 2) % stone.length]);
  }
  box(-9.0, 5.2, .4, .18, 13.6, 17.6, M.wall).name = 'room-left-wall';
  box(0, 5.2, 8.75, 18, 13.6, .20, M.wall).name = 'opposite-room-wall';
  box(8.37, 5.2, 4.78, .18, 13.6, 8.0, M.wall).name = 'room-right-front-wall';
  box(0, 10.31, -8.48, 23.4, 3.38, .36, M.wall).name = 'room-upper-back-wall';
  box(0, 12.0, 0, 18, .18, 17.6, M.trim).name = 'room-ceiling';
  for (const x of [-6, -2, 2, 6]) box(x, 11.75, 0, .18, .34, 17.4, M.woodDark);
  const rearKitchen = new THREE.Group();
  rearKitchen.name = 'inferred-opposite-kitchen';
  scene.add(rearKitchen);
  box(.2, .1, 7.94, 9.3, 3.40, 1.24, M.trim, rearKitchen);
  box(.2, 1.84, 7.88, 9.55, .16, 1.48, M.woodLight, rearKitchen);
  for (let i = 0; i < 8; i++) {
    const x = -3.84 + i * 1.16;
    box(x, .16, 7.30, 1.08, 3.06, .055, i % 2 ? M.white : M.cream, rearKitchen);
    line(V(x + .38, .65, 7.23), V(x + .38, .96, 7.23), .025, M.steel, rearKitchen);
  }
  box(.2, 2.92, 8.55, 9.50, 1.95, .04, M.white, rearKitchen);
  for (let i = 0; i < 17; i++) box(-4.45 + i * .58, 2.92, 8.52, .012, 1.95, .025, M.seam, rearKitchen);
  for (let i = 0; i < 4; i++) box(.2, 2.17 + i * .50, 8.52, 9.50, .012, .025, M.seam, rearKitchen);
  box(-1.5, 1.94, 7.82, 1.63, .08, .91, M.steel, rearKitchen);
  box(-1.5, 1.987, 7.82, 1.39, .015, .69, M.black, rearKitchen);
  tube([V(-1.5, 1.98, 8.23), V(-1.5, 2.65, 8.23), V(-1.5, 2.67, 7.85), V(-1.5, 2.48, 7.75)], .039, M.steel, rearKitchen);
  for (const x of [-3.2, -.75, 1.7, 4.15]) {
    box(x, 4.93, 8.20, 2.32, 2.15, .88, M.trim, rearKitchen);
    for (const s of [-1, 1]) {
      box(x + s * .57, 4.93, 7.745, 1.10, 2.03, .045, M.cream, rearKitchen);
      line(V(x + s * .11, 4.71, 7.70), V(x + s * .11, 5.00, 7.70), .020, M.steel, rearKitchen);
    }
  }
  box(-6.48, 1.63, 8.60, 2.04, 6.45, .14, M.woodDark);
  box(-6.48, 1.63, 8.50, 1.85, 6.20, .10, M.wood);
  ellipsoid(V(-5.86, 1.3, 8.40), [.065, .065, .060], M.gold);
  const rearFill = new THREE.DirectionalLight('#f4e7d7', .65);
  rearFill.position.set(-2, 9, -4);
  scene.add(rearFill);

  // Table, fixed burner, black pan and all of the surrounding clutter.
  const tableY = .735;
  box(.68, tableY - .13, 1.34, 5.05, .26, 2.85, M.wood);
  for (let i = 0; i < 13; i++) {
    box(.68, tableY + .005, -.03 + i * .226, 5.04, .009, .217, i % 3 ? M.wood : M.woodLight);
    for (let j = 0; j < 3; j++) {
      const x = -1.70 + rand(i * 7 + j) * 4.8;
      box(x, tableY + .012, -.04 + i * .226 + .05 * j, .25 + rand(i * 3 + j + 6) * .5, .002, .005, M.woodDark);
    }
  }
  const tableSupports = new THREE.Group();
  tableSupports.name = 'four-legged-counter-support';
  scene.add(tableSupports);
  for (const x of [-1.60, 2.96]) for (const z of [.16, 2.54]) {
    box(x, -.52, z, .17, 2.17, .17, M.woodDark, tableSupports);
  }
  for (const z of [.16, 2.54]) box(.68, .41, z, 4.72, .28, .13, M.woodDark, tableSupports);
  for (const x of [-1.60, 2.96]) box(x, .41, 1.35, .13, .28, 2.51, M.woodDark, tableSupports);
  box(.68, -1.0, .16, 4.72, .10, .11, M.woodDark, tableSupports);
  const panCenter = V(.055, .97, 1.18);
  box(.055, .807, 1.23, 1.16, .14, 1.21, material('#6d746f', .40, .65)).name = 'burner-support';
  box(-.57, .825, 1.28, .39, .20, 1.12, M.woodLight);
  cylinder(V(.055, .895, 1.18), .34, .055, M.black);
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    line(V(.055 + .26 * Math.cos(a), .92, 1.18 + .26 * Math.sin(a)),
      V(.055 + .45 * Math.cos(a), .92, 1.18 + .45 * Math.sin(a)), .025, M.steel);
  }
  lathe(V(.055, .91, 1.18), [[0, 0], [.37, 0], [.46, .045], [.515, .185], [.515, .21], [.478, .21], [.455, .075], [.44, .055], [0, .055]], M.iron).name = 'pan-contact-surface';
  torus(V(.055, 1.115, 1.18), .50, .017, material('#2a3027', .66, .25)).name = 'pan-rim';
  for (const sign of [-1, 1]) {
    const handle = torus(V(.055 + sign * .517, 1.055, 1.18), .058, .024, M.iron);
    handle.scale.set(.75, 1.25, 1);
  }
  line(V(-.25, 1.045, .80), V(-.55, 1.22, .10), .065, M.iron);
  torus(V(-.55, 1.22, .08), .054, .017, M.iron);
  for (let i = 0; i < 10; i++) box(-.37 + i * .087, .795, 1.847, .025, .027, .008, M.black);
  cylinder(V(-.63, .825, 1.855), .055, .044, M.black).rotation.x = Math.PI / 2;

  const bottle = (p, h, r, bodyMat, labelMat = M.cream, capMat = M.gold, parent = root) => {
    const g = new THREE.Group();
    g.position.copy(p);
    parent.add(g);
    lathe(V(0, 0, 0), [[0, 0], [r * .8, 0], [r, .04 * h], [r, .61 * h],
      [r * .88, .70 * h], [r * .40, .79 * h], [r * .36, h], [0, h]], bodyMat, g);
    cylinder(V(0, h * .50, 0), r * 1.008, h * .29, labelMat, g);
    cylinder(V(0, h * .965, 0), r * .40, h * .10, capMat, g);
    box(0, h * .50, r * 1.015, r * 1.2, h * .022, .003, M.woodDark, g);
    box(0, h * .42, r * 1.015, r * .95, h * .013, .003, M.woodDark, g);
    ellipsoid(V(0, h * .57, r * 1.014), [r * .22, h * .035, .005], M.gold, g);
    return g;
  };
  bottle(V(-1.459, tableY + .015, 1.341), 1.073, .14, M.glass).name = 'foreground-oil-bottle';
  for (const [x, z, h] of [[-1.34, .75, .64], [-1.12, .62, .65]]) {
    cylinder(V(x, tableY + h * .43, z), .105, h * .83, M.glass);
    cylinder(V(x, tableY + h * .93, z), .114, .16, M.black);
    cylinder(V(x, tableY + h * .64, z), .108, .12, M.cream);
  }
  cylinder(V(-1.20, tableY + .055, .03), .23, .10, M.black);
  cylinder(V(-1.20, tableY + .47, .03), .20, .85, M.white);
  cylinder(V(-1.20, tableY + .905, .03), .066, .038, M.black);
  ellipsoid(V(-1.20, tableY + .94, .03), [.052, .055, .052], M.black);
  for (const [x, z] of [[-.78, 1.05], [-.65, .84]]) {
    cylinder(V(x, tableY + .052, z), .085, .10, M.steel);
    cylinder(V(x, tableY + .108, z), .069, .012, M.black);
  }
  cylinder(V(-.92, tableY + .36, 1.61), .118, .72, M.red);
  cylinder(V(-.92, tableY + .16, 1.61), .120, .31, M.blue);
  cylinder(V(-.92, tableY + .75, 1.61), .084, .06, M.steel);
  box(-.94, tableY + .84, 1.60, .18, .16, .16, M.white);
  line(V(-.99, tableY + .87, 1.60), V(-1.43, tableY + .87, 1.60), .035, M.steel);
  box(1.17, tableY + .045, 1.34, .99, .07, .72, M.woodLight);
  for (let i = 0; i < 7; i++) {
    ellipsoid(V(1.09 + (rand(i + 32) - .5) * .55, tableY + .13, 1.45 + (rand(i + 41) - .5) * .21),
      [.17, .065, .11], material(i % 2 ? '#54351f' : '#694329'));
  }
  const cloth = box(.97, tableY + .035, 1.99, .47, .045, .39, material('#b17626'));
  cloth.rotation.y = -.19;
  for (let i = 0; i < 7; i++) line(V(.78 + i * .055, tableY + .064, 1.81), V(.84 + i * .055, tableY + .061, 2.15), .008, M.woodDark);
  bottle(V(1.698, tableY + .015, 1.050), .984, .145, M.olive, M.cream, M.red).name = 'foreground-redcap-bottle';
  box(1.698, tableY + .50, 1.198, .074, .39, .007, M.red);
  lathe(V(1.518, tableY + .015, .512), [[0, 0], [.21, 0], [.21, .34], [.192, .35], [.185, .04], [0, .04]], M.iron);
  const plate = V(2.00, tableY + .036, 1.55);
  lathe(plate, [[0, 0], [.22, .01], [.39, .075], [.49, .12], [.52, .11], [.43, .02], [0, -.018]], M.white);
  for (let i = 0; i < 38; i++) {
    const a = i * Math.PI * 2 / 38;
    line(plate.clone().add(V(.19 * Math.cos(a), .02, .19 * Math.sin(a))),
      plate.clone().add(V(.24 * Math.cos(a), .03, .24 * Math.sin(a))), .007, M.blue);
  }
  lathe(V(2.61, tableY + .055, 1.18), [[0, 0], [.22, 0], [.47, .16], [.49, .22], [.46, .23], [.20, .06], [0, .06]], M.woodDark);
  for (let i = 0; i < 3; i++) ellipsoid(V(2.41 + i * .20, tableY + .22, 1.19 + (i % 2) * .07), [.14, .11, .12], material('#d6a40b'));
  bottle(V(2.64, tableY + .01, 1.80), .96, .15, material('#868667', .35), M.glass, M.steel);
  bottle(V(3.13, tableY + .01, 1.91), 1.12, .17, material('#175321', .18), M.cream, M.steel);

  const shelf = new THREE.Group();
  shelf.position.set(2.58, .24, -.68);
  root.add(shelf);
  for (const y of [0, 1.11, 2.45]) box(.64, y, 0, 1.55, .095, 1.12, M.white, shelf);
  for (const x of [-.09, 1.37]) box(x, 1.22, 0, .11, 2.49, 1.12, M.white, shelf);
  box(.65, 1.22, -.53, 1.39, 2.43, .04, M.trim, shelf);
  for (let i = 0; i < 5; i++) {
    bottle(V(.11 + i * .26, .05, .23), .85 + rand(69 + i) * .14, .112,
      i === 4 ? M.glass : M.olive, i % 2 ? M.cream : M.white, i % 3 ? M.gold : M.black, shelf);
  }
  for (let i = 0; i < 4; i++) {
    const book = box(.75 + i * .14, 1.72, .15, .12, 1.03 - i * .025, .51,
      [material('#254e35'), M.cream, M.white, M.olive][i], shelf);
    book.rotation.z = -.025 * i;
    for (let j = 0; j < 4; j++) box(.75 + i * .14, 1.92 - j * .11, .412, .087, .012, .006, M.woodDark, shelf);
  }
  bottle(V(.18, 1.16, .25), .82, .15, M.glass, M.cream, M.black, shelf);
  bottle(V(.47, 1.16, .32), .62, .125, M.red, M.cream, M.gold, shelf);
  box(.04, 2.96, -.19, .61, .84, .047, M.white, shelf);
  ellipsoid(V(.04, 3.05, -.152), [.28, .27, .009], material('#6c91ab'), shelf);
  ellipsoid(V(.04, 2.97, -.133), [.19, .24, .012], M.woodDark, shelf);
  for (const x of [-.03, .10]) ellipsoid(V(x, 3.05, -.111), [.052, .032, .011], M.gold, shelf);
  cylinder(V(.79, 2.66, 0), .22, .36, M.glass, shelf);
  cylinder(V(.79, 2.85, 0), .232, .038, M.steel, shelf);
  for (let i = 0; i < 16; i++) ellipsoid(V(.79 + (rand(105 + i) - .5) * .30, 2.56 + rand(115 + i) * .16, .12 + (rand(125 + i) - .5) * .12), [.045, .039, .033], M.woodDark, shelf);
  box(1.21, 2.54, .04, .19, .05, .16, M.red, shelf);
  for (const x of [1.16, 1.25]) box(x, 2.70, .04, .045, .31, .06, M.black, shelf);
  cylinder(V(1.20, 2.96, .04), .084, .26, M.red, shelf);
  ellipsoid(V(1.20, 3.13, .04), [.085, .10, .077], M.cream, shelf);
  cylinder(V(1.20, 3.25, .04), .087, .12, M.black, shelf);
  for (const x of [1.08, 1.32]) cylinder(V(x, 2.96, .04), .026, .24, M.gold, shelf);

  // Stationary white dog: solid fur clumps, not an image patch.
  const dog = new THREE.Group();
  dog.position.copy(pixel(92, 578, .25));
  root.add(dog);
  const seatY = dog.position.y - .31;
  cylinder(V(dog.position.x, seatY - .09, .28), .77, .16, M.black);
  cylinder(V(dog.position.x, seatY - .68, .28), .055, 1.1, M.steel);
  ellipsoid(V(-.13, .02, 0), [.68, .31, .30], M.white, dog);
  ellipsoid(V(.46, -.02, .09), [.30, .30, .29], M.white, dog);
  ellipsoid(V(.56, -.23, .24), [.17, .14, .16], M.white, dog);
  for (const x of [.14, .43]) ellipsoid(V(x, -.29, .19), [.14, .15, .18], M.white, dog);
  ellipsoid(V(.67, -.25, .34), [.055, .038, .035], M.black, dog);
  for (let i = 0; i < 210; i++) {
    const a = rand(i + 211) * Math.PI * 2, b = Math.acos(2 * rand(i + 342) - 1);
    const isHead = i > 140;
    const center = isHead ? V(.45, -.005, .12) : V(-.16, .04, 0);
    const radii = isHead ? [.31, .28, .29] : [.67, .30, .29];
    center.add(V(radii[0] * Math.sin(b) * Math.cos(a), radii[1] * Math.cos(b), radii[2] * Math.sin(b) * Math.sin(a)));
    const r = .043 + .027 * rand(i + 677);
    const clump = ellipsoid(center, [r, r * .8, r * 1.13], M.white, dog);
    clump.rotation.z = a;
  }

  // Sculpted torso rings and a curved apron preserve a human silhouette under orbit.
  const cook = new THREE.Group();
  cook.name = 'cook';
  scene.add(cook);
  const ringBody = (rings, mat, parent, sides = 40) => {
    const positions = [], indices = [];
    rings.forEach(([x, y, z, rx, rz]) => {
      for (let j = 0; j <= sides; j++) {
        const a = j / sides * Math.PI * 2;
        positions.push(x + rx * Math.cos(a), y, z + rz * Math.sin(a));
      }
    });
    for (let i = 0; i < rings.length - 1; i++) for (let j = 0; j < sides; j++) {
      const a = i * (sides + 1) + j, b = a + sides + 1;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    g.setIndex(indices);
    g.computeVertexNormals();
    return mesh(g, mat, parent);
  };
  ringBody([
    [.23, .64, -.14, .40, .21], [.23, .88, -.12, .41, .23], [.23, 1.30, -.12, .42, .25],
    [.24, 1.73, -.11, .43, .25], [.24, 2.05, -.13, .44, .24],
    [.24, 2.34, -.14, .48, .23], [.25, 2.45, -.14, .37, .19],
    [.30, 2.54, -.14, .20, .14], [.32, 2.54, -.14, .16, .12],
  ], M.shirt, cook);
  const lowerBody = new THREE.Group();
  lowerBody.name = 'inferred-cook-hips-legs-shoes';
  cook.add(lowerBody);
  ellipsoid(V(.24, .50, -.15), [.405, .34, .245], M.black, lowerBody);
  for (const [x, z] of [[.015, -.18], [.49, -.30]]) {
    const thigh = cylinder(V(x, -.07, z), .16, 1.08, M.black, lowerBody, .195);
    thigh.rotation.x = -.075;
    const shin = cylinder(V(x, -.99, z - .075), .105, 1.05, M.black, lowerBody, .151);
    shin.rotation.x = .04;
    ellipsoid(V(x, -.55, z), [.157, .18, .151], M.black, lowerBody);
    ellipsoid(V(x, -1.52, z + .07), [.145, .085, .265], M.iron, lowerBody);
  }
  cylinder(V(.34, 2.58, -.12), .145, .28, M.skin, cook);
  const apronG = new THREE.BufferGeometry(), ap = [], ai = [];
  for (let i = 0; i <= 14; i++) for (let j = 0; j <= 16; j++) {
    const u = j / 16 * 2 - 1, f = i / 14;
    const w = .30 + .13 * Math.min(1, f * 3);
    ap.push(.24 + u * w, 2.30 - f * 1.59, .11 + .092 * (1 - u * u) + .013 * Math.cos(f * 21 + u * 9));
  }
  for (let i = 0; i < 14; i++) for (let j = 0; j < 16; j++) {
    const a = i * 17 + j;
    ai.push(a, a + 17, a + 1, a + 17, a + 18, a + 1);
  }
  apronG.setAttribute('position', new THREE.Float32BufferAttribute(ap, 3));
  apronG.setIndex(ai);
  apronG.computeVertexNormals();
  const apronMat = M.apron.clone();
  apronMat.side = THREE.DoubleSide;
  mesh(apronG, apronMat, cook);
  for (const x of [-.055, .535]) {
    tube([V(x, 2.30, .16), V(x - .03, 2.55, .015), V(x, 2.55, -.21)], .037, M.apron, cook);
    torus(V(x, 2.29, .19), .040, .011, M.gold, cook, false);
  }
  tube([V(-.18, 1.17, .13), V(.22, 1.08, .22), V(.65, 1.17, .13)], .018, M.black, cook);
  const rearApron = new THREE.Group();
  rearApron.name = 'inferred-apron-back-straps';
  cook.add(rearApron);
  for (const s of [-1, 1]) {
    tube([V(.24 + s * .29, 2.48, -.26), V(.24 + s * .12, 2.04, -.388),
      V(.24 - s * .31, 1.23, -.365)], .027, M.apron, rearApron);
  }
  tube([V(-.18, 1.17, .13), V(-.19, 1.19, -.16), V(.24, 1.20, -.388),
    V(.67, 1.19, -.16), V(.65, 1.17, .13)], .023, M.apron, rearApron);
  ellipsoid(V(.24, 1.20, -.407), [.074, .041, .039], M.apron, rearApron);
  tube([V(.24, 1.20, -.422), V(.32, .98, -.425), V(.36, .81, -.39)], .025, M.apron, rearApron);
  tube([V(.24, 1.20, -.422), V(.15, 1.03, -.43), V(.08, .87, -.40)], .025, M.apron, rearApron);
  tube([V(.00, 1.89, .217), V(.18, 1.87, .222), V(.20, 1.68, .216), V(.02, 1.68, .216)], .005, M.stitch, cook);
  box(.05, 1.94, .229, .18, .037, .017, M.woodDark, cook);
  for (const sign of [-1, 1]) {
    const collar = box(.31 + sign * .115, 2.45, .10, .17, .09, .024, M.shirt, cook);
    collar.rotation.z = sign * -.50;
  }
  const head = new THREE.Group();
  head.name = 'cook-head';
  head.position.copy(pixel(529, 357, -.18));
  head.rotation.set(.30, -.025, -.11);
  cook.add(head);
  ellipsoid(V(0, 0, 0), [.285, .365, .245], M.skin, head);
  ellipsoid(V(0, -.185, .015), [.244, .22, .225], M.skin, head);
  for (const s of [-1, 1]) {
    ellipsoid(V(s * .276, -.025, -.005), [.065, .115, .054], M.skin, head);
    ellipsoid(V(s * .299, -.023, .021), [.023, .062, .023], M.skinShade, head);
    ellipsoid(V(s * .134, -.06, .222), [.105, .068, .025], M.skin, head);
    ellipsoid(V(s * .135, -.07, .247), [.066, .026, .014], material('#bb9b7c'), head);
    ellipsoid(V(s * .137, -.079, .260), [.022, .015, .008], M.black, head);
    tube([V(s * .064, .004, .244), V(s * .14, .025, .247), V(s * .215, .006, .216)], .009, M.hair, head);
  }
  ellipsoid(V(0, -.11, .262), [.045, .086, .052], M.skin, head);
  ellipsoid(V(0, -.173, .279), [.050, .029, .035], M.skin, head);
  tube([V(-.069, -.251, .214), V(-.005, -.26, .240), V(.061, -.251, .214)], .009, M.skinShade, head);
  ellipsoid(V(0, -.32, .115), [.125, .049, .067], M.skin, head);
  const hairGeo = new THREE.SphereGeometry(1, 36, 20, 0, Math.PI * 2, 0, Math.PI * .59);
  const hair = mesh(hairGeo, M.hair, head);
  hair.position.set(0, .105, -.035);
  hair.scale.set(.302, .297, .257);
  for (let i = 0; i < 22; i++) {
    const x = -.26 + i * .024;
    tube([V(x, .175 + .045 * rand(i), .19), V(x + .025, .19, .23), V(x + .044, .08 + .075 * rand(i + 8), .23)], .008, M.hair, head);
  }
  const lens = new THREE.MeshStandardMaterial({ color: '#827b68', transparent: true, opacity: .13, roughness: .12, depthWrite: false });
  for (const s of [-1, 1]) {
    const cx = s * .144;
    const outline = [
      V(cx - .106, -.035, .274), V(cx, -.023, .287), V(cx + .106, -.036, .263),
      V(cx + .098, -.127, .268), V(cx, -.146, .293), V(cx - .095, -.125, .280),
      V(cx - .106, -.035, .274),
    ];
    tube(outline, .010, M.black, head);
    ellipsoid(V(cx, -.084, .272), [.095, .052, .011], lens, head);
    line(V(s * .244, -.05, .265), V(s * .295, .013, -.060), .011, M.black, head);
  }
  tube([V(-.042, -.066, .283), V(0, -.045, .296), V(.043, -.066, .283)], .010, M.black, head);

  const segment = (rTop, rBottom, mat) => {
    const geo = new THREE.CylinderGeometry(rTop, rBottom, 1, 28, 14);
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getY(i), angle = Math.atan2(p.getZ(i), p.getX(i));
      const factor = mat === M.skin
        ? 1 + .09 * Math.sin((y + .5) * Math.PI)
        : 1 + .043 * Math.sin(y * 43 + angle * 2) + .025 * Math.sin(y * 69 - angle);
      p.setX(i, p.getX(i) * factor);
      p.setZ(i, p.getZ(i) * factor);
    }
    geo.computeVertexNormals();
    return mesh(geo, mat, cook);
  };
  const align = (m, a, b) => {
    m.position.copy(a).lerp(b, .5);
    m.scale.y = a.distanceTo(b);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), a.clone().sub(b).normalize());
  };
  const arm = () => ({
    upper: segment(.18, .144, M.shirt), forearm: segment(.13, .078, M.skin),
    cuff: segment(.15, .151, M.cuff), elbow: ellipsoid(V(0, 0, 0), [.137, .145, .133], M.skin, cook),
  });
  const activeArm = arm(), steadyArm = arm();
  for (const [side, parts] of [['active', activeArm], ['steady', steadyArm]]) {
    for (const [part, object] of Object.entries(parts)) object.name = `${side}-${part}`;
  }
  const grip = new THREE.Group();
  grip.name = 'tong-hand-contact';
  cook.add(grip);
  ellipsoid(V(0, .015, 0), [.086, .121, .060], M.skin, grip);
  for (let i = 0; i < 4; i++) {
    const x = -.062 + i * .039;
    tube([V(x, -.024, .025), V(x + .007, -.094, .048), V(x + .009, -.137, .005), V(x, -.124, -.031)], .022 - i * .001, M.skin, grip);
    ellipsoid(V(x + .004, -.116, .029), [.015, .025, .005], material('#b78564'), grip);
  }
  tube([V(.077, .058, .005), V(.104, .005, .04), V(.062, -.053, .06)], .030, M.skin, grip);
  const freeHand = new THREE.Group();
  freeHand.name = 'steady-hand';
  cook.add(freeHand);
  ellipsoid(V(0, 0, 0), [.089, .11, .055], M.skin, freeHand);
  for (let i = 0; i < 4; i++) tube([V(-.06 + i * .036, -.04, .01), V(-.053 + i * .036, -.119, .04), V(-.042 + i * .036, -.14, .085)], .020, M.skin, freeHand);
  tube([V(-.075, .035, 0), V(-.111, -.026, .045), V(-.076, -.07, .085)], .026, M.skin, freeHand);
  const tongs = new THREE.Group();
  tongs.name = 'metal-tongs';
  cook.add(tongs);
  const tongBars = [], jaws = [];
  const tongSteel = material('#c4c6bd', .30, .62);
  for (const s of [-1, 1]) {
    const bar = mesh(new THREE.BoxGeometry(.032, 1, .033), tongSteel, tongs);
    tongBars.push(bar);
    const jaw = ellipsoid(V(0, 0, 0), [.052, .096, .026], tongSteel, tongs);
    jaw.name = `tong-jaw-${s}`;
    jaws.push(jaw);
    for (let j = 0; j < 4; j++) {
      const ridge = torus(V(0, -.03 + j * .022, .0), .039, .0035, M.steel, jaw, false);
      ridge.scale.set(1, .25, 1);
    }
  }
  torus(V(0, .13, 0), .033, .009, M.steel, tongs, false);

  const greens = ['#2e5a15', '#3b681c', '#24450e', '#477820', '#386119', '#21460e'].map(c => {
    const m = material(c, .46); m.side = THREE.DoubleSide; return m;
  });
  const leaves = [];
  const makeLeaf = (i, carried) => {
    const length = carried ? .085 + .035 * rand(i + 2013) : .105 + .050 * rand(i + 2013);
    const width = .075 + .030 * rand(i + 1122);
    const p = [], idx = [], uv = [];
    for (let a = 0; a <= 10; a++) for (let b = 0; b <= 6; b++) {
      const u = a / 10 * 2 - 1, v = b / 6 * 2 - 1;
      const w = Math.pow(Math.max(.001, Math.cos(u * Math.PI / 2)), .72);
      p.push(v * width * w, .025 * (1 - v * v) + .021 * u * u, u * length);
      uv.push(u, v);
    }
    for (let a = 0; a < 10; a++) for (let b = 0; b < 6; b++) {
      const k = a * 7 + b;
      idx.push(k, k + 1, k + 7, k + 1, k + 8, k + 7);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geometry.setIndex(idx);
    geometry.computeVertexNormals();
    const g = new THREE.Group();
    g.name = `${carried ? 'lifted' : 'pan'}-spinach-${i}`;
    root.add(g);
    const leafMesh = mesh(geometry, greens[i % greens.length], g);
    line(V(0, .028, -length * .8), V(0, .027, length), .005, greens[(i + 1) % greens.length], g);
    const a = rand(i + 88) * 2 * Math.PI, radius = .05 + .23 * Math.sqrt(rand(i + 944));
    leaves.push({ g, geometry, original: p, uv, carried, phase: a, radius, i,
      base: V(.055 + radius * Math.cos(a), 1.000 + rand(i + 196) * .038, 1.18 + radius * Math.sin(a)) });
    return leafMesh;
  };
  for (let i = 0; i < 42; i++) makeLeaf(i, false);
  for (let i = 42; i < 52; i++) makeLeaf(i, true);

  const smooth = x => { x = THREE.MathUtils.clamp(x, 0, 1); return x * x * (3 - 2 * x); };
  const phase = (t, a, b) => smooth((t - a) / (b - a));
  const knots = [
    [0, .13, 1.075, 1.33], [.75, .13, 1.018, 1.26], [1.6, .015, 1.018, 1.13],
    [2.5, -.19, 1.020, 1.17], [3.3, -.18, 1.075, 1.25],
    [4.2, -.13, 1.25, 1.28], [5.2, .075, 1.43, 1.20], [6.0, .21, 1.26, 1.17],
    [6.7, .19, 1.12, 1.20], [7.3, -.13, 1.023, 1.23], [8.2, -.025, 1.019, 1.36],
    [9.2, .18, 1.018, 1.35], [10, .28, 1.045, 1.18],
  ];
  function actionPath(t) {
    let i = 0;
    while (i < knots.length - 2 && t > knots[i + 1][0]) i++;
    const a = knots[i], b = knots[i + 1], f = smooth((t - a[0]) / (b[0] - a[0]));
    return V(a[1], a[2], a[3]).lerp(V(b[1], b[2], b[3]), f);
  }
  const shoulderL = V(-.31, 2.40, -.075), shoulderR = V(.65, 2.35, -.12);
  for (const shoulder of [shoulderL, shoulderR]) ellipsoid(shoulder, [.177, .190, .174], M.shirt, cook);
  function poseArm(parts, shoulder, wrist, side, elbowTuck = 0) {
    const dir = wrist.clone().sub(shoulder), distance = dir.length();
    const upper = side < 0 ? .67 : .55, lower = side < 0 ? .78 : .57;
    const along = (upper * upper - lower * lower + distance * distance) / (2 * distance);
    dir.normalize();
    const bendAxis = side < 0 ? V(side, .04, .16)
      : V(THREE.MathUtils.lerp(1, .2, elbowTuck), .04, THREE.MathUtils.lerp(.16, -.65, elbowTuck));
    const bend = bendAxis.clone().addScaledVector(dir, -bendAxis.dot(dir)).normalize();
    const elbow = shoulder.clone().addScaledVector(dir, along).addScaledVector(bend, Math.sqrt(Math.max(.002, upper * upper - along * along)));
    align(parts.upper, shoulder, elbow);
    align(parts.forearm, elbow, wrist);
    align(parts.cuff, elbow.clone().lerp(shoulder, .15), elbow.clone().lerp(shoulder, -.025));
    parts.elbow.position.copy(elbow);
  }
  function setTime(time) {
    const t = THREE.MathUtils.clamp(time, 0, 10);
    const pose = cameraPose(t);
    camera.position.fromArray(pose.position);
    camera.fov = pose.fov;
    camera.lookAt(V(...pose.target));
    camera.updateProjectionMatrix();
    const tip = actionPath(t);
    const turn = phase(t, 3.3, 6.7);
    const left = phase(t, .75, 3.3), right = phase(t, 7.3, 10);
    const grasp = phase(t, 2.5, 3.3) * (1 - phase(t, 6.7, 7.3));
    const axis = V(-.42 + .09 * turn, .45, -.37 + .07 * turn).normalize();
    const wrist = tip.clone().addScaledVector(axis, .70);
    const orientation = new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), axis);
    const roll = new THREE.Quaternion().setFromAxisAngle(V(0, 1, 0), turn * 1.15);
    orientation.multiply(roll);
    grip.position.copy(wrist);
    grip.quaternion.copy(orientation);
    tongs.position.copy(wrist);
    tongs.quaternion.copy(orientation);
    poseArm(activeArm, shoulderL, wrist, -1);
    for (let j = 0; j < 2; j++) {
      const side = j ? 1 : -1, gap = .065 - .043 * grasp;
      const a = V(side * .012, .11, 0), b = V(side * gap, -.70, 0);
      align(tongBars[j], a, b);
      jaws[j].position.copy(b);
      jaws[j].rotation.z = -side * (.06 + .08 * (1 - grasp));
    }
    const freeApproach = phase(t, 1.6, 4.3);
    const freeWrist = V(.53 + .47 * freeApproach,
      1.53 + .27 * freeApproach, .16 + .54 * freeApproach);
    freeHand.position.copy(freeWrist);
    freeHand.rotation.set(.18, -.15, -.22);
    poseArm(steadyArm, shoulderR, freeWrist, 1, phase(t, .5, 2.5));
    head.rotation.set(.30 - .032 * phase(t, 3.3, 5.2) + .022 * phase(t, 6.7, 10), -.025 - .07 * left + .12 * right, -.11);
    for (const leaf of leaves) {
      const { g, i } = leaf;
      if (leaf.carried) {
        const a = (i - 42) * 2.4 + turn * 2.2;
        const r = .025 + .035 * rand(i + 3421);
        const attach = phase(t, 2.2, 3.3);
        const release = phase(t, 6.7, 7.3);
        const supported = V(-.18 + r * Math.cos(a), 1.025 + .02 * rand(i), 1.25 + r * Math.sin(a));
        const held = V(tip.x + r * Math.cos(a), tip.y - .008 + .029 * rand(i + 433), tip.z + r * Math.sin(a));
        const returned = V(-.13 + .30 * right + r * Math.cos(a), 1.025 + .02 * rand(i), 1.23 + .04 * right + r * Math.sin(a));
        g.position.copy(supported).lerp(held, attach).lerp(returned, release);
        g.rotation.set(.2 + .48 * grasp * Math.sin(a), a, .30 * grasp * Math.cos(a));
        g.scale.set(1 - .17 * grasp, 1, 1);
        const p = leaf.geometry.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const u = leaf.uv[k * 2], v = leaf.uv[k * 2 + 1];
          p.setY(k, leaf.original[k * 3 + 1] + grasp * (.055 * Math.abs(v) + .024 * u * u));
        }
        p.needsUpdate = true;
        leaf.geometry.computeVertexNormals();
      } else {
        const a = leaf.phase - .30 * left + .42 * right;
        const influence = 1 - leaf.radius / .62;
        const leftContact = Math.max(.15, 1 - Math.hypot(leaf.base.x + .08, leaf.base.z - 1.20) / .55);
        const rightContact = Math.max(.15, 1 - Math.hypot(leaf.base.x - .13, leaf.base.z - 1.30) / .55);
        g.position.set(.055 + leaf.radius * Math.cos(a) + influence * (-.043 * left + .060 * right),
          leaf.base.y + .018 * left * leftContact - .012 * turn + .006 * right * rightContact,
          1.18 + leaf.radius * Math.sin(a));
        g.rotation.set(.12 * Math.cos(a) + .09 * left - .07 * right, a + .3, .09 * Math.sin(a));
        g.scale.set(1 - .06 * turn, 1, 1 - .07 * turn);
        const p = leaf.geometry.attributes.position;
        for (let k = 0; k < p.count; k++) {
          const u = leaf.uv[k * 2], v = leaf.uv[k * 2 + 1];
          p.setY(k, leaf.original[k * 3 + 1]
            + .014 * (left * leftContact + right * rightContact) * v * v
            - .009 * turn * (1 - u * u));
        }
        p.needsUpdate = true;
        leaf.geometry.computeVertexNormals();
      }
    }
  }
  setTime(0);
  return { scene, camera, setTime };
}
