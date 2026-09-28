import { cameraPose } from './camera-motion.mjs';

// Dimensions are relative scene units. Photographic pixels are used only as
// editable landmark measurements; no image is loaded by this scene.
export function buildScene(THREE, spec) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xeeeeea);
  const v = (a) => new THREE.Vector3(...a);
  let seed = 843921;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const range = (a, b) => a + (b - a) * random();
  const material = (color, roughness = .7, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const paint = material(0xffffff, .48, .06);
  const rubber = material(0x303335, .91);
  const sidewall = material(0x464b4c, .86);
  const rimMat = material(0x3e4344, .46, .56);
  const silver = material(0xc6cbc7, .40, .35);
  const spokeMat = material(0xe0e2dc, .53, .22);
  const black = material(0x141819, .64, .1);
  const seatMat = material(0x303536, .66);
  const benchMat = material(0x242a27, .64, .12);
  const bark = material(0x393a2b, 1);
  const group = (name) => {
    const g = new THREE.Group();
    g.name = name;
    scene.add(g);
    return g;
  };
  const bike = group('stationary white bicycle');
  const bench = group('black slatted bench');
  const garden = group('layered garden');
  const perimeter = group('source-aligned volumetric perimeter and inferred opposite park');
  function mesh(geometry, mat, parent, position) {
    const m = new THREE.Mesh(geometry, mat);
    if (position) m.position.copy(v(position));
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function rod(a, b, radius, mat, parent = bike, segments = 12) {
    const A = v(a), B = v(b), d = B.clone().sub(A);
    const m = mesh(new THREE.CylinderGeometry(radius, radius, d.length(), segments),
      mat, parent);
    m.position.copy(A).add(B).multiplyScalar(.5);
    m.quaternion.setFromUnitVectors(v([0, 1, 0]), d.normalize());
    return m;
  }
  function tube(points, radius, mat, parent = bike, segments = 40) {
    return mesh(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map(v)), segments, radius, 8, false
    ), mat, parent);
  }
  function box(size, pos, mat, parent = bike) {
    return mesh(new THREE.BoxGeometry(...size), mat, parent, pos);
  }
  function ring(radius, thickness, pos, mat, parent = bike) {
    return mesh(new THREE.TorusGeometry(radius, thickness, 8, 112), mat, parent, pos);
  }

  scene.add(new THREE.HemisphereLight(0xf4f4ed, 0x73745e, 2.25));
  scene.add(new THREE.AmbientLight(0xf1f1ed, .42));
  const sun = new THREE.DirectionalLight(0xfffdf2, .90);
  sun.position.set(-3, 8, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, {
    left: -6, right: 6, top: 5, bottom: -5, near: .5, far: 24
  });
  sun.shadow.bias = -.00025;
  sun.shadow.normalBias = .016;
  sun.shadow.radius = 4;
  sun.shadow.autoUpdate = false;
  sun.shadow.needsUpdate = true;
  scene.add(sun);

  const sourcePosition = v([1.62252508, 1.64495293, 5.48961633]);
  const sourceTarget = v([.14081687, .84633413, 0]);
  const camera = new THREE.PerspectiveCamera(42, spec.target.width / spec.target.height, .045, 70);
  camera.position.copy(sourcePosition);
  camera.lookAt(sourceTarget);
  camera.updateMatrixWorld(true);
  function landmark(x, y, z = 0) {
    const ray = v([2 * x / 960 - 1, 1 - 2 * y / 720, .5])
      .unproject(camera).sub(sourcePosition).normalize();
    return sourcePosition.clone().addScaledVector(ray, (z - sourcePosition.z) / ray.z).toArray();
  }

  // Thin tires and crossed spokes, rather than solid discs or oversized tubes.
  for (const [x, steer, wheelName] of [
    [-1.08166074, .12473027, 'front steered wheel'], [1.08166074, 0, 'rear wheel']
  ]) {
    const wheel = new THREE.Group();
    wheel.name = wheelName;
    wheel.position.set(x, .72, 0);
    wheel.rotation.y = -steer;
    bike.add(wheel);
    ring(.683, .036, [0, 0, 0], rubber, wheel);
    for (const z of [-.023, .023]) {
      ring(.681, .012, [0, 0, z], sidewall, wheel);
      ring(.653, .011, [0, 0, z], rimMat, wheel);
      ring(.641, .003, [0, 0, z + Math.sign(z) * .007], silver, wheel);
    }
    rod([0, 0, -.074], [0, 0, .074], .027, silver, wheel, 20);
    for (const z of [-.046, .046]) {
      const flange = mesh(new THREE.CylinderGeometry(.042, .042, .008, 24), black, wheel, [0, 0, z]);
      flange.rotation.x = Math.PI / 2;
    }
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI * 2 / 32;
      const s = i % 2 ? 1 : -1;
      const b = a + (i % 4 < 2 ? .43 : -.43);
      rod([.036 * Math.cos(b), .036 * Math.sin(b), s * .046],
        [.639 * Math.cos(a), .639 * Math.sin(a), s * .006],
        .00215, spokeMat, wheel, 5);
      rod([.630 * Math.cos(a), .630 * Math.sin(a), s * .006],
        [.649 * Math.cos(a), .649 * Math.sin(a), s * .006],
        .003, silver, wheel, 6);
    }
    rod([.14, -.62, .005], [.134, -.587, .005], .0055, black, wheel);
    for (let i = 0; i < 64; i++) {
      const a = i * Math.PI / 32;
      const tread = box([.012, .003, .031],
        [.718 * Math.sin(a), .718 * Math.cos(a), 0], sidewall, wheel);
      tread.rotation.z = -a;
    }
  }

  const headTop = landmark(370, 211), headBottom = landmark(355, 253);
  const seatTop = landmark(548, 214), crank = landmark(481, 399);
  const front = [-1.08166074, .72, 0], rear = [1.08166074, .72, 0];
  rod(headTop, seatTop, .025, paint);
  rod(headTop, headBottom, .038, paint);
  rod(headBottom, crank, .036, paint);
  rod(crank, seatTop, .031, paint);
  const postTop = landmark(562, 173);
  rod(seatTop, postTop, .022, silver);
  rod(seatTop, landmark(556, 194), .031, paint);
  rod(landmark(554, 195), landmark(552, 204), .035, silver);
  for (const z of [-.058, .058]) {
    rod([crank[0], crank[1], z], [rear[0], rear[1], z], .017, paint);
    tube([[seatTop[0] + .011, seatTop[1] - .04, z * .45],
      [.81, 1.20, z * .95], [rear[0], rear[1], z]], .0135, paint);
    tube([[headBottom[0], headBottom[1], z * .45],
      [-.84, 1.22, z], [-1.03, .79, z], [front[0], front[1], z]], .022, paint);
    const dropout = mesh(new THREE.SphereGeometry(.034, 12, 8), paint, bike,
      [rear[0], rear[1], z]);
    dropout.scale.set(1.3, .75, .43);
    rod([front[0], front[1], z], [front[0], front[1], z + .027], .014, black);
    rod([rear[0], rear[1], z], [rear[0], rear[1], z + .023], .014, black);
  }
  // Rim-brake calipers, pads, quick releases, and visible cable routing.
  for (const [cx, cy] of [[-.74, 1.39], [.82, 1.35]]) {
    tube([[cx - .10, cy - .10, .056], [cx - .07, cy + .01, .083],
      [cx, cy + .043, .061], [cx + .05, cy - .065, .064]], .009, silver);
    box([.050, .020, .02], [cx - .085, cy - .075, .049], black);
    box([.050, .020, .02], [cx + .04, cy - .062, -.049], black);
  }
  rod([-1.083, .72, .090], [-1.05, .81, .101], .005, silver);

  const stemBottom = landmark(370, 207);
  const stemTop = landmark(380, 178);
  rod(stemBottom, stemTop, .021, silver);
  rod(stemTop, landmark(355, 165), .022, silver);
  const barPoints = [
    landmark(308, 143, .26), landmark(328, 153, .17),
    landmark(356, 165, 0), landmark(378, 175, -.15), landmark(399, 187, -.29)
  ];
  tube(barPoints, .013, silver);
  rod(landmark(308, 143, .26), landmark(334, 155, .15), .025, black, bike, 20);
  rod(landmark(383, 179, -.19), landmark(399, 187, -.29), .023, black, bike, 20);
  for (const [x, y, z] of [[320, 156, .23], [384, 184, -.20]]) {
    tube([landmark(x - 19, y, z), landmark(x + 1, y + 3, z),
      landmark(x + 10, y + 12, z)], .009, silver);
    rod(landmark(x - 4, y - 7, z), landmark(x + 2, y + 1, z), .016, black);
  }
  tube([landmark(323, 164, .25), landmark(320, 193, .27),
    landmark(312, 232, .23), landmark(325, 242, .16),
    landmark(354, 228, .08), landmark(368, 200, .01)], .0039, silver);
  tube([landmark(375, 181, -.16), landmark(382, 213, -.11),
    landmark(465, 215, -.045), landmark(548, 223, .035),
    landmark(583, 270, .070)], .0033, silver);

  const saddleCenter = landmark(566, 158);
  const saddleGeo = new THREE.BufferGeometry();
  const saddleVertices = [], saddleIndices = [];
  const profile = [
    [-.285, .026, -.012], [-.245, .047, .002], [-.14, .051, -.005],
    [-.04, .069, -.015], [.065, .112, -.003], [.18, .121, .022],
    [.265, .089, .024], [.283, .040, .005]
  ];
  for (const [x, width, y] of profile) {
    for (let j = 0; j < 12; j++) {
      const angle = j / 12 * Math.PI * 2;
      saddleVertices.push(x, y + .034 * Math.sin(angle), width * Math.cos(angle));
    }
  }
  for (let i = 0; i < profile.length - 1; i++) for (let j = 0; j < 12; j++) {
    const a = i * 12 + j, b = i * 12 + (j + 1) % 12;
    saddleIndices.push(a, a + 12, b, b, a + 12, b + 12);
  }
  for (const [end, reverse] of [[0, false], [profile.length - 1, true]]) {
    const [x, , y] = profile[end];
    const center = saddleVertices.length / 3;
    saddleVertices.push(x, y, 0);
    for (let j = 0; j < 12; j++) {
      const a = end * 12 + j, b = end * 12 + (j + 1) % 12;
      saddleIndices.push(center, reverse ? b : a, reverse ? a : b);
    }
  }
  saddleGeo.setAttribute('position', new THREE.Float32BufferAttribute(saddleVertices, 3));
  saddleGeo.setIndex(saddleIndices);
  saddleGeo.computeVertexNormals();
  mesh(saddleGeo, seatMat, bike, saddleCenter);
  for (const z of [-.061, .061]) {
    tube([[saddleCenter[0] - .24, saddleCenter[1] - .027, z],
      [saddleCenter[0] - .075, saddleCenter[1] - .101, z],
      [saddleCenter[0] + .17, saddleCenter[1] - .049, z]], .006, silver);
  }
  box([.071, .031, .135], postTop, silver);

  const ringCenter = [crank[0] + .015, crank[1] - .008, -.069];
  ring(.164, .016, ringCenter, black);
  ring(.142, .012, [ringCenter[0], ringCenter[1], -.054], silver);
  const chainPlate = new THREE.Shape();
  chainPlate.absarc(0, 0, .156, 0, Math.PI * 2, false);
  for (let j = 0; j < 5; j++) {
    const a = j * Math.PI * .4;
    const hole = new THREE.Path();
    hole.absarc(.090 * Math.cos(a), .090 * Math.sin(a), .040, 0, Math.PI * 2, true);
    chainPlate.holes.push(hole);
  }
  mesh(new THREE.ExtrudeGeometry(chainPlate, {
    depth: .008, bevelEnabled: false, curveSegments: 24
  }), silver, bike, [ringCenter[0], ringCenter[1], -.065]);
  for (let j = 0; j < 5; j++) {
    const a = j * Math.PI * .4;
    rod(ringCenter, [ringCenter[0] + .133 * Math.cos(a),
      ringCenter[1] + .133 * Math.sin(a), -.065], .024, silver);
  }
  for (let j = 0; j < 44; j++) {
    const a = j * Math.PI * 2 / 44;
    const tooth = box([.012, .012, .015], [
      ringCenter[0] + .179 * Math.cos(a), ringCenter[1] + .179 * Math.sin(a), -.069
    ], silver);
    tooth.rotation.z = a;
  }
  ring(.063, .011, [rear[0], rear[1], -.080], black);
  for (let j = 0; j < 18; j++) {
    const a = j * Math.PI * 2 / 18;
    const tooth = box([.015, .012, .018],
      [rear[0] + .074 * Math.cos(a), rear[1] + .074 * Math.sin(a), -.080], silver);
    tooth.rotation.z = a;
  }
  for (const axle of [front, rear]) for (const z of [-.095, .095]) {
    const nut = mesh(new THREE.CylinderGeometry(.025, .025, .019, 6),
      silver, bike, [axle[0], axle[1], z]);
    nut.rotation.x = Math.PI / 2;
  }
  tube([[crank[0], crank[1] + .178, -.09], [rear[0], rear[1] + .066, -.09],
    [rear[0] + .066, rear[1], -.09], [rear[0], rear[1] - .066, -.09],
    [crank[0], crank[1] - .178, -.09], [crank[0] - .178, crank[1], -.09],
    [crank[0], crank[1] + .178, -.09]], .009, rimMat, bike, 100);
  for (const [sign, z] of [[1, .116], [-1, -.141]]) {
    rod([crank[0], crank[1], z], [crank[0] + sign * .295, crank[1] + sign * .006, z], .023, paint);
    rod([crank[0] + sign * .295, crank[1], z],
      [crank[0] + sign * .295, crank[1], z + sign * .09], .009, silver);
    box([.063, .052, .16], [crank[0] + sign * .30, crank[1], z + sign * .11], black);
    for (const q of [-.055, .055])
      box([.015, .014, .023], [crank[0] + sign * .33, crank[1] + .03, z + sign * .11 + q], silver);
  }
  rod([crank[0], crank[1], -.15], [crank[0], crank[1], .145], .026, silver);
  ring(.026, .007, [crank[0], crank[1], .15], black);

  tube([landmark(475, 252, .16), landmark(467, 282, .17),
    landmark(458, 326, .18), landmark(473, 340, .18),
    landmark(492, 335, .18), landmark(507, 268, .16)], .0125, black);
  rod(landmark(473, 251, .16), landmark(513, 263, .16), .026, black);
  rod(landmark(472, 250, .16), landmark(493, 256, .16), .027, silver);
  const lockBracket = box([.068, .095, .078], landmark(521, 276, .01), black);
  lockBracket.rotation.z = -.26;

  // Bench slats have real depth and separate seat boards and back uprights.
  const benchLeft = -1.78, benchRight = 2.28;
  for (let i = 0; i < 11; i++) {
    const y = .78 + i * .084;
    const slat = box([benchRight - benchLeft, .046, .025],
      [(benchLeft + benchRight) / 2, y + .015, -.49], benchMat, bench);
    slat.rotation.z = .009;
  }
  for (const x of [benchLeft, benchRight]) {
    box([.070, 1.04, .089], [x, 1.20, -.50], benchMat, bench);
    const cap = box([.087, .054, .108], [x, 1.75, -.50], rimMat, bench);
    cap.rotation.x = .18;
    box([.071, .73, .095], [x, .365, -.39], benchMat, bench);
    box([.08, .70, .09], [x, .35, -.89], benchMat, bench);
    rod([x, .56, -.39], [x, .58, -.91], .026, benchMat, bench);
  }
  for (let i = 0; i < 5; i++)
    box([4.10, .049, .072], [.25, .715, -.79 + i * .082], benchMat, bench);
  for (const x of [-1.73, -.48, .80, 2.23]) {
    box([.045, .91, .045], [x, 1.17, -.535], benchMat, bench);
    box([.045, .055, .43], [x, .668, -.66], benchMat, bench);
    for (const y of [.81, 1.21, 1.62]) for (const z of [-.57, -.451]) {
      const bolt = mesh(new THREE.CylinderGeometry(.009, .009, .006, 10),
        rimMat, bench, [x, y, z]);
      bolt.rotation.x = Math.PI / 2;
    }
  }
  rod([-1.76, .23, -.86], [2.27, .23, -.86], .022, benchMat, bench);
  for (const x of [benchLeft, benchRight]) {
    rod([x, .25, -.84], [x, .64, -.43], .017, benchMat, bench);
    box([.115, .018, .14], [x, .008, -.89], benchMat, bench);
    box([.115, .018, .14], [x, .008, -.39], benchMat, bench);
  }
  tube([[.61, 1.51, -.43], [1.03, 1.66, -.43], [1.43, 1.69, -.43],
    [1.73, 1.61, -.43]], .019, benchMat, bench);

  // A colored triangulated surface supplies only procedural ground variation.
  function terrain(zmin, zmax, base, rough, name, elevation = -.040) {
    const nx = 360, nz = 160, vertices = [], colors = [], indices = [];
    const col = new THREE.Color(base);
    for (let iz = 0; iz <= nz; iz++) for (let ix = 0; ix <= nx; ix++) {
      const x = -45 + 90 * ix / nx, z = zmin + (zmax - zmin) * iz / nz;
      const noise = .012 * Math.sin(x * 2.4 + z * 1.1) +
        .008 * Math.cos(z * 4.2 - x * .7) + range(-rough, rough);
      vertices.push(x, elevation + range(-.003, .003), z);
      colors.push(Math.max(.01, col.r + noise), Math.max(.01, col.g + noise), Math.max(.01, col.b + noise * .55));
      if (ix < nx && iz < nz) {
        const a = iz * (nx + 1) + ix, b = a + nx + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const m = mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 }), garden);
    m.name = name;
    m.castShadow = false;
  }
  terrain(-45, 45, 0x717749, .021, 'continuous park lawn extending beyond the orbit');
  terrain(-7.8, -.535, 0x75736d, .016, 'fine aggregate path', -.019);

  const grassVertices = [], grassColors = [];
  const grassPalette = [0x70774e, 0x939967, 0x647247, 0x9ba171, 0xb0ac86, 0x757e52].map(c => new THREE.Color(c));
  for (let i = 0; i < 230000; i++) {
    const near = i < 145000;
    const a0 = random() * Math.PI * 2, gaussian = Math.sqrt(-2 * Math.log(Math.max(1e-6, random())));
    const x = near ? Math.cos(a0) * gaussian * 4.5 : range(-22, 22);
    const z = near ? 2 + Math.sin(a0) * gaussian * 3.6 : range(-22, 22);
    if (z < -.52 && z > -7.82) continue;
    const tuft = Math.exp(-Math.pow(x / 2.7, 4) - Math.pow((z - .05) / .55, 2));
    const h = range(.012, .043) + tuft * range(.01, .092);
    const a = range(0, Math.PI * 2), w = range(.0006, .0018);
    const dx = Math.cos(a), dz = Math.sin(a), lean = range(.012, .075);
    const p0 = [x - dz * w, -.01, z + dx * w];
    const p1 = [x + dz * w, -.01, z - dx * w];
    const pm = [x + dx * lean * .35 - dz * w * .35, h * .62, z + dz * lean * .35 + dx * w * .35];
    const tip = [x + dx * lean, h, z + dz * lean];
    grassVertices.push(...p0, ...p1, ...pm, ...p0, ...pm, ...tip);
    const c = grassPalette[Math.floor(random() * grassPalette.length)];
    for (let j = 0; j < 6; j++) grassColors.push(c.r, c.g, c.b);
  }
  const grassGeo = new THREE.BufferGeometry();
  grassGeo.setAttribute('position', new THREE.Float32BufferAttribute(grassVertices, 3));
  grassGeo.setAttribute('color', new THREE.Float32BufferAttribute(grassColors, 3));
  grassGeo.computeVertexNormals();
  const grass = mesh(grassGeo, new THREE.MeshStandardMaterial({
    vertexColors: true, side: THREE.DoubleSide, roughness: 1
  }), garden);
  grass.castShadow = false;
  grass.name = 'individual procedural grass blades';

  const pebbleGeo = new THREE.IcosahedronGeometry(1, 0);
  const pebbles = new THREE.InstancedMesh(pebbleGeo, material(0xaaa999, 1), 1600);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 1600; i++) {
    dummy.position.set(range(-15, 15), -.005, range(-7.75, -.55));
    dummy.scale.set(range(.004, .013), range(.002, .006), range(.004, .016));
    dummy.rotation.set(random(), random(), random());
    dummy.updateMatrix();
    pebbles.setMatrixAt(i, dummy.matrix);
    pebbles.setColorAt(i, new THREE.Color().setHSL(.13, range(.01, .08), range(.20, .42)));
  }
  garden.add(pebbles);

  // Volume-distributed pointed leaves keep shrub silhouettes irregular in
  // every view. There are no textured cards and no camera-facing surfaces.
  const leafGeo = new THREE.BufferGeometry();
  leafGeo.setAttribute('position', new THREE.Float32BufferAttribute([
    0, 0, 0, -.40, .42, .07, 0, .52, .16,
    0, 0, 0, 0, .52, .16, .40, .42, .07,
    -.40, .42, .07, 0, 1, 0, 0, .52, .16,
    0, .52, .16, 0, 1, 0, .40, .42, .07
  ], 3));
  leafGeo.computeVertexNormals();
  const clusters = [];
  for (let i = 0; i < 29; i++) {
    const x = -12 + i * .86;
    clusters.push([x, range(1.3, 1.7), range(-4.4, -3.2),
      range(.70, 1.1), range(1.15, 1.45), range(.65, 1.15), 520, i % 3]);
  }
  for (const c of [
    [-4.2, 3.7, -4, 2.05, 2.3, 1.7, 2200, 2],
    [5.0, 3.2, -4.5, 2.25, 2.8, 1.8, 2400, 2],
    [-3.2, 3.6, -8, .45, 1.4, .50, 750, 2],
    [-5.2, 4.3, -7, 2.3, 2.1, 1.6, 1700, 1],
    [7, 4.9, -7, 3.2, 2.5, 2.2, 1700, 2],
    [-3.0, .75, -3.0, 1.15, .83, .68, 650, 1],
    [3.7, 1.3, -2.8, 1.3, 1.35, .90, 1000, 2],
    [-1.1, 2.25, -4.8, 1.25, 1.55, 1.0, 1600, 1],
    [1.0, 2.30, -4.4, 1.7, 1.60, 1.0, 1900, 1]
  ]) clusters.push(c);
  // Move the source-side planting out of the camera corridor while preserving
  // its projected source rays; all newly exposed park planting is world-fixed.
  const environmentScale = 1.65;
  perimeter.scale.setScalar(environmentScale);
  perimeter.position.copy(sourcePosition).multiplyScalar(1 - environmentScale);
  const worldCluster = (x, y, z, sx, sy, sz, n, type) => {
    const p = v([x, y, z]).sub(perimeter.position).divideScalar(environmentScale);
    clusters.push([...p.toArray(), sx / environmentScale, sy / environmentScale,
      sz / environmentScale, n, type]);
  };
  for (let i = 0; i < 23; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 22;
    const r = range(13.2, 16);
    worldCluster(Math.sin(a) * r, range(1.2, 1.8), Math.cos(a) * r,
      range(1.2, 1.9), range(1.3, 2), range(1.1, 1.7), 500, i % 3);
  }
  for (const x of [-31, 31]) for (let i = 0; i < 9; i++) {
    worldCluster(x + range(-1.5, 1.5), range(3, 4.6), -18 + i * 4.5,
      range(2.1, 3.2), range(3, 4), range(2.5, 3.5), 700, 2);
  }
  for (const [x, z, y] of [[-12, 6, 5], [-9, 13, 5.9], [-3, 17, 5.4],
    [4, 16, 6.4], [10, 12, 5.6], [14, 3, 6]]) {
    worldCluster(x, y, z, 2.7, 2.8, 2.3, 1500, 2);
    const trunk = v([x, 0, z]).sub(perimeter.position).divideScalar(environmentScale);
    const crown = v([x + .2, y, z]).sub(perimeter.position).divideScalar(environmentScale);
    rod(trunk.toArray(), crown.toArray(), .13, bark, perimeter, 9);
    for (let j = 0; j < 7; j++) {
      const end = crown.clone().add(v([range(-1.6, 1.6), range(-.3, 1.0), range(-1.5, 1.5)]));
      rod(trunk.clone().lerp(crown, .63).toArray(), end.toArray(), .035, bark, perimeter, 7);
    }
  }
  for (const c of clusters) c[6] = Math.round(c[6] * 2.4);
  const count = clusters.reduce((s, c) => s + c[6], 0);
  const coreGeometry = new THREE.BufferGeometry();
  const coreVertices = [], coreColors = [];
  for (let i = 0; i < 64; i++) {
    const az = range(0, Math.PI * 2), polar = range(-1, 1);
    const rr = Math.pow(random(), .33), r2 = Math.sqrt(1 - polar * polar);
    const center = v([Math.cos(az) * r2 * rr, polar * rr, Math.sin(az) * r2 * rr]);
    const rotation = new THREE.Euler(range(-2, 2), range(-3, 3), range(-3, 3));
    const length = range(.29, .48), width = range(.11, .21);
    const points = [[0, -length / 2, 0], [-width / 2, 0, .025],
      [0, length / 2, 0], [width / 2, 0, .025]]
      .map(p => v(p).applyEuler(rotation).add(center));
    const tone = range(.62, 1.25);
    for (const index of [0, 1, 2, 0, 2, 3]) {
      coreVertices.push(...points[index].toArray());
      coreColors.push(tone, tone, tone);
    }
  }
  coreGeometry.setAttribute('position', new THREE.Float32BufferAttribute(coreVertices, 3));
  coreGeometry.setAttribute('color', new THREE.Float32BufferAttribute(coreColors, 3));
  coreGeometry.computeVertexNormals();
  const foliageCore = new THREE.InstancedMesh(
    coreGeometry,
    new THREE.MeshStandardMaterial({
      color: 0xffffff, roughness: 1, side: THREE.DoubleSide, vertexColors: true
    }),
    clusters.length * 160
  );
  foliageCore.name = 'dense small-leaf clusters without solid shrub spheres';
  let coreIndex = 0;
  for (const [x, y, z, sx, sy, sz, , type] of clusters) {
    for (let j = 0; j < 160; j++) {
      const az = range(0, Math.PI * 2), polar = range(-1, 1), rr = Math.pow(random(), .45);
      const rr2 = Math.sqrt(1 - polar * polar);
      dummy.position.set(x + Math.cos(az) * rr2 * rr * sx * .86,
        y + polar * rr * sy * .88, z + Math.sin(az) * rr2 * rr * sz * .88);
      const size = range(.13, .30);
      dummy.scale.set(size * range(.8, 1.25), size * range(.8, 1.25), size);
      dummy.rotation.set(random(), random(), random());
      dummy.updateMatrix();
      foliageCore.setMatrixAt(coreIndex, dummy.matrix);
      foliageCore.setColorAt(coreIndex++, new THREE.Color().setHSL(
        type === 2 ? .25 : .22, range(.24, .38), range(.040, type === 2 ? .085 : .12)
      ));
    }
  }
  perimeter.add(foliageCore);
  const leaves = new THREE.InstancedMesh(leafGeo, new THREE.MeshStandardMaterial({
    color: 0xffffff, side: THREE.DoubleSide, roughness: .96
  }), count);
  leaves.name = 'seeded volumetric shrub and tree leaves';
  const leafColor = new THREE.Color();
  let leafIndex = 0;
  for (const [x, y, z, sx, sy, sz, n, type] of clusters) {
    for (let j = 0; j < n; j++) {
      const az = range(0, Math.PI * 2), polar = range(-1, 1), rr = Math.pow(random(), .28);
      const rr2 = Math.sqrt(1 - polar * polar);
      const px = x + Math.cos(az) * rr2 * rr * sx;
      const py = y + polar * rr * sy;
      const pz = z + Math.sin(az) * rr2 * rr * sz;
      dummy.position.set(px, py, pz);
      dummy.rotation.set(range(-1.8, 1.8), range(0, Math.PI * 2), range(-2.7, 2.7));
      const size = range(.033, .080);
      dummy.scale.set(size * range(.75, 1.3), size * range(1.1, 1.8), size);
      dummy.updateMatrix();
      leaves.setMatrixAt(leafIndex, dummy.matrix);
      leafColor.setHSL(type === 2 ? range(.23, .285) : range(.19, .25),
        range(.19, .35), range(.045, type === 2 ? .12 : .175));
      leaves.setColorAt(leafIndex++, leafColor);
    }
    rod([x, .02, z], [x + .08, y + sy * .3, z], type === 2 ? .038 : .017, bark, perimeter, 7);
    for (let j = 0; j < 5; j++) {
      const a = range(0, Math.PI * 2);
      rod([x, y * .65, z], [x + Math.cos(a) * sx * .65, y + range(0, sy * .8),
        z + Math.sin(a) * sz * .65], .009, bark, perimeter, 5);
    }
  }
  perimeter.add(leaves);
  for (const [x, y, z] of [[-5.8, 4.6, -4.8], [5.3, 4.9, -4.4]]) {
    rod([x, 0, z], [x + .2, y, z], .13, bark, perimeter, 9);
    for (let j = 0; j < 6; j++)
      rod([x, y * .6, z], [x + range(-2.4, 2.4), y + range(-.6, 1.5), z + range(-1, 1)],
        .035, bark, perimeter, 7);
  }
  const sapling = group('weeds beside right bench leg');
  for (let j = 0; j < 8; j++) {
    const x = 2.35 + range(-.1, .13), h = range(.18, .92);
    rod([2.34, .01, -.32], [x + range(-.16, .15), h, -.28], .005, bark, sapling, 5);
    for (let k = 0; k < 4; k++) {
      const leaf = mesh(leafGeo, material(k % 2 ? 0x4d612d : 0x65723c, 1), sapling,
        [x, h * (k + 1) / 4, -.25]);
      leaf.scale.set(.15, .22, .16);
      leaf.rotation.set(.3, range(0, Math.PI * 2), range(-1.1, 1.1));
      leaf.material.side = THREE.DoubleSide;
      leaf.castShadow = false;
    }
  }
  const brick = material(0x817164, 1), roof = material(0x62645c, 1);
  for (const [x, z, width, top] of [[-4.1, -9, 1.8, 3.80], [-.65, -10, 1.3, 3.90],
    [2.1, -10, 1.7, 3.90], [5.0, -9.5, 2.1, 3.80]]) {
    box([width, 2.9, 1.6], [x, top - 1.45, z], brick, perimeter);
    box([width + .14, .08, 1.73], [x, top, z], roof, perimeter);
    box([.25, .40, .33], [x - .30, top + .17, z + .12], brick, perimeter);
    box([.31, .07, .40], [x - .30, top + .40, z + .12], roof, perimeter);
  }

  function setTime(time) {
    const pose = cameraPose(time);
    camera.position.fromArray(pose.position);
    camera.lookAt(v(pose.target));
    camera.fov = pose.fov;
  }
  setTime(0);
  return { scene, camera, setTime };
}
