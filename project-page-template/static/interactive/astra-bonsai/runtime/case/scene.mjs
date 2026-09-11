export function buildScene(THREE, spec) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#a8b0ae');
  const camera = new THREE.PerspectiveCamera(34, spec.target.width / spec.target.height, 0.08, 75);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let seed = 70891;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const material = (color, roughness = 0.5, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const M = {
    brown: material('#43271e', .31), brown2: material('#563126', .34),
    brown3: material('#30211b', .36), seam: material('#1e1411', .5),
    wood: material('#58382f', .53), wood2: material('#623d33', .47),
    black: material('#090d0d', .32), edge: material('#151c1b', .29),
    rubber: material('#12181a', .86), silver: material('#9aa7ac', .34, .72),
    spoke: material('#889799', .5, .62), red: material('#a42c20', .35),
    white: material('#d8d9d5', .36), pink: material('#d499d1', .32),
    palePink: material('#d4b1d5', .35), darkPink: material('#b653a6', .36),
    orange: material('#e76408', .48), cabinet: material('#131b1e', .61),
    wall: material('#b0bdbc', .96), sidewall: material('#929b98', .96),
    floor: material('#554a39', .91), cardboard: material('#6e5940', .91),
  };
  const unitBox = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
  const ball = new THREE.SphereGeometry(1, 12, 8);
  function mesh(geo, mat, parent = scene) {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true; m.receiveShadow = true; parent.add(m);
    return m;
  }
  function box(parent, mat, x, y, z, sx, sy, sz, rotation = 0) {
    const m = mesh(unitBox, mat, parent);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); m.rotation.y = rotation;
    return m;
  }
  function ellipsoid(parent, mat, x, y, z, sx, sy, sz) {
    const m = mesh(ball, mat, parent);
    m.position.set(x, y, z); m.scale.set(sx, sy, sz); return m;
  }
  function rod(parent, mat, a, b, radius, radius2 = radius, radial = 12) {
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b);
    const d = bv.clone().sub(av);
    const g = radius2 === radius ? cylinder :
      new THREE.CylinderGeometry(radius2 / radius, 1, 1, radial);
    const m = mesh(g, mat, parent);
    m.position.copy(av.add(bv).multiplyScalar(.5));
    m.scale.set(radius, d.length(), radius);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    return m;
  }
  function curve(parent, mat, points, radius = .025, segments = 24) {
    return mesh(new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), segments, radius, 8, false
    ), mat, parent);
  }
  function ring(parent, mat, x, y, z, radius, thickness, rx = 0, ry = 0) {
    const m = mesh(new THREE.TorusGeometry(radius, thickness, 8, 72), mat, parent);
    m.position.set(x, y, z); m.rotation.set(rx, ry, 0); return m;
  }
  function extrudePolygon(parent, mat, points, depth, bevel = .025) {
    const shape = new THREE.Shape();
    shape.moveTo(...points[0]);
    points.slice(1).forEach(p => shape.lineTo(...p)); shape.closePath();
    const g = new THREE.ExtrudeGeometry(shape, {
      depth, bevelEnabled: true, bevelThickness: bevel,
      bevelSize: bevel, bevelSegments: 2, steps: 1, curveSegments: 8,
    });
    const m = mesh(g, mat, parent); m.position.z = -depth / 2; return m;
  }
  const hemi = new THREE.HemisphereLight('#dce8ed', '#77716e', 1.65);
  scene.add(hemi);
  scene.add(new THREE.AmbientLight('#dce4e5', .62));
  const light = new THREE.DirectionalLight('#f4eeeb', 1.65);
  light.position.set(-5, 9, 7); light.castShadow = true;
  light.shadow.mapSize.set(2048, 2048);
  Object.assign(light.shadow.camera, { left: -8, right: 9, top: 9, bottom: -8, near: .1, far: 28 });
  light.shadow.bias = -.0005; light.shadow.normalBias = .015;
  light.shadow.radius = 4; scene.add(light);
  const fill = new THREE.DirectionalLight('#c5d4e0', .45);
  fill.position.set(7, 5, 2); scene.add(fill);
  const rearFill = new THREE.DirectionalLight('#e3d6e6', .8);
  rearFill.position.set(-3, 8, -8); scene.add(rearFill);

  // Full room planes and real depth behind the foreground, not a photo plane.
  box(scene, M.wall, 0, 6.6, -14, 30, 19, .2).receiveShadow = false;
  box(scene, M.sidewall, -15, 6.6, 0, .2, 19, 28).receiveShadow = false;
  box(scene, M.wall, 15, 6.6, 0, .2, 19, 28).receiveShadow = false;
  box(scene, M.wall, 0, 6.6, 14, 30, 19, .2).receiveShadow = false;
  box(scene, M.white, 0, 16, 0, 30, .2, 28);
  for (const z of [-13.85, 13.85]) box(scene, M.white, 0, -2.71, z, 30, .18, .1);
  for (const x of [-14.85, 14.85]) box(scene, M.white, x, -2.71, 0, .1, .18, 28);
  box(scene, M.floor, 0, -2.88, 0, 32, .16, 30);
  for (let ix = 0; ix < 18; ix++) {
    const mat = material(new THREE.Color('#5f503c').multiplyScalar(.80 + .18 * rand()), .9);
    for (let iz = 0; iz < 6; iz++) {
      box(scene, mat, -10 + ix * 1.18, -2.786, -9 + iz * 3.6 + (ix % 2) * 1.8,
        1.16, .016, 3.575);
    }
  }
  const suitcase = new THREE.Group(); scene.add(suitcase);
  suitcase.position.set(-3.05, .12, -4.7); suitcase.rotation.z = .018;
  box(suitcase, M.cabinet, 0, 0, 0, 3.65, 4.50, .64);
  box(suitcase, M.black, 0, 0, .34, 3.46, 4.29, .09);
  for (const x of [-1.73, 1.73])
    box(suitcase, M.edge, x, 0, .39, .06, 4.21, .025);
  curve(suitcase, M.black, [[-.55, 2.27, 0], [-.47, 2.48, 0], [.42, 2.48, 0], [.53, 2.27, 0]], .064);
  // Upright stored keyboard, with separately modeled white and black keys.
  const keyboard = new THREE.Group(); scene.add(keyboard);
  keyboard.position.set(-.73, 3.25, -5.38); keyboard.rotation.z = -.025;
  box(keyboard, M.cabinet, 0, 0, 0, .93, 6.95, .38);
  for (const yy of [-2.75, 2.75]) {
    box(keyboard, M.edge, 0, yy, -.202, .76, .26, .045);
    for (const xx of [-.30, .30])
      rod(keyboard, M.silver, [xx, yy, -.225], [xx, yy, -.231], .022);
  }
  for (let i = 0; i < 17; i++)
    box(keyboard, M.black, -.25 + i * .029, .3, -.201, .012, 1.9, .008);
  curve(keyboard, M.rubber, [[.38, -2.1, -.23], [.56, -2.9, -.4],
    [.30, -5.4, -.35], [.9, -6.0, -.2]], .025);
  for (let i = 0; i < 49; i++) {
    box(keyboard, M.white, -.15, -3.36 + i * .137, .222, .46, .132, .053);
    if (![2, 6].includes(i % 7))
      box(keyboard, M.black, .00, -3.29 + i * .137, .270, .28, .055, .039);
  }
  for (let i = 0; i < 12; i++) box(keyboard, M.edge, .335, -2.2 + i * .4, .215, .10, .14, .025);
  box(scene, M.cabinet, -.67, -1.48, -5.38, .87, 2.72, .37);
  box(scene, M.black, -2.42, 3.85, -5.1, 2.8, .12, .20, -.06);
  box(scene, M.black, -2.40, 3.32, -5.1, .14, 1.15, .20);
  const leftPiano = new THREE.Group(); scene.add(leftPiano);
  leftPiano.position.set(-5.8, 1.80, -1.6);
  box(leftPiano, M.black, 0, 0, 0, 2.2, .76, 1.3);
  box(leftPiano, M.brown3, 0, .43, -.29, 2.3, .22, .80);
  for (let i = 0; i < 19; i++) {
    box(leftPiano, M.white, -.95 + i * .105, .401, .42, .10, .065, .39);
    if (![2, 6].includes(i % 7))
      box(leftPiano, M.black, -.9 + i * .105, .455, .29, .056, .052, .23);
  }
  for (const z of [-.39, .39]) {
    rod(leftPiano, M.black, [-.78, -.38, z], [.72, -4.56, z], .048);
    rod(leftPiano, M.black, [.78, -.38, z], [-.72, -4.56, z], .048);
    rod(leftPiano, M.black, [-.80, -4.56, z], [.80, -4.56, z], .051);
  }
  // Lower-left photographed clutter: cartons, a wheel accessory box and mug.
  box(scene, M.cardboard, -4.3, -2.10, -.9, 1.85, 1.32, 1.60, -.13);
  box(scene, material('#292d2a', .92), -5.05, -1.07, -2.25, 1.5, 2.0, .38, -.12);
  for (const xx of [-5.78, -4.33]) box(scene, M.red, xx, -1.04, -1.97, .065, 2, .035);
  box(scene, M.red, -5.05, -.08, -1.97, 1.5, .18, .035);
  ring(scene, M.rubber, -5.06, -1.1, -1.93, .47, .12);
  rod(scene, M.black, [-4.76, -1.46, -.08], [-4.76, -1.01, -.08], .25);
  ring(scene, M.white, -4.76, -1.00, -.08, .235, .028, Math.PI / 2);
  ring(scene, M.brown2, -4.43, -1.22, -.08, .19, .045);
  for (let i = 0; i < 9; i++) ellipsoid(scene, M.white,
    -4.76 + .245 * Math.sin(i * 2.4), -1.1 - (i % 3) * .10,
    -.08 + .245 * Math.cos(i * 2.4), .028, .03, .022);

  // The bicycle faces LEFT: the drop bars and fork belong to the left wheel.
  const bike = new THREE.Group(); scene.add(bike);
  bike.position.set(1.13, 0, -3.3); bike.rotation.set(0, -.115, .06);
  const front = [-3.9, -.35, 0], rear = [4, -.35, 0], wheelR = 2.31;
  for (const c of [front, rear]) {
    ring(bike, M.rubber, ...c, wheelR, .105);
    ring(bike, M.silver, c[0], c[1], c[2] + .012, wheelR - .145, .043);
    ring(bike, M.edge, c[0], c[1], c[2] + .02, wheelR - .205, .022);
    rod(bike, M.silver, [c[0], c[1], -.16], [c[0], c[1], .16], .085);
    for (let i = 0; i < 32; i++) {
      const a = i * Math.PI * 2 / 32;
      rod(bike, M.spoke, [c[0] + .06 * Math.cos(a + .5), c[1] + .06 * Math.sin(a + .5), (i % 2 ? 1 : -1) * .11],
        [c[0] + (wheelR - .16) * Math.cos(a), c[1] + (wheelR - .16) * Math.sin(a), 0], .009);
    }
    for (const a of [2.4, 4.8]) {
      const badge = box(bike, M.white, c[0] + (wheelR - .145) * Math.cos(a),
        c[1] + (wheelR - .145) * Math.sin(a), .057, .36, .055, .02);
      badge.rotation.z = a + Math.PI / 2;
    }
  }
  const headTop = [-2.55, 2.90, 0], headBottom = [-2.83, 2.12, 0];
  const seatTop = [1.40, 2.85, 0], crank = [.35, -.29, 0];
  for (const [a, b, r] of [
    [headTop, seatTop, .095], [headTop, headBottom, .115],
    [headBottom, crank, .105], [crank, seatTop, .085],
    [seatTop, rear, .049], [crank, rear, .054],
  ]) rod(bike, M.red, a, b, r);
  for (const zz of [-.13, .13]) {
    rod(bike, M.red, [headBottom[0], headBottom[1], zz], [front[0], front[1], zz], .066);
    rod(bike, M.red, [1.40, 2.85, zz], [4, -.35, zz], .045);
    rod(bike, M.red, [.35, -.29, zz], [4, -.35, zz], .048);
  }
  rod(bike, M.silver, [-2.50, 2.96, 0], [-2.32, 3.48, 0], .07);
  rod(bike, M.black, [-2.32, 3.48, 0], [-3.20, 3.64, 0], .105);
  for (const zz of [-.35, .35]) {
    curve(bike, M.rubber, [[-2.93, 3.64, zz], [-3.58, 3.80, zz], [-4.55, 3.90, zz],
      [-4.64, 3.48, zz], [-4.27, 3.13, zz], [-3.91, 3.12, zz]], .090, 28);
    rod(bike, M.silver, [-4.55, 3.70, zz + .09], [-4.47, 3.25, zz + .15], .037);
    curve(bike, M.rubber, [[-4.5, 3.63, zz], [-3.46, 2.68, .35], [-2.41, 2.64, .31],
      [-2.87, 1.90, .22]], .015);
  }
  rod(bike, M.black, [-3.15, 3.64, -.4], [-3.15, 3.64, .4], .09);
  rod(bike, M.silver, [1.40, 2.87, 0], [1.59, 4.09, 0], .071);
  const saddle = extrudePolygon(bike, M.brown2,
    [[1.49, 4.06], [1.46, 4.16], [2.28, 4.29], [3.14, 4.58], [3.18, 4.43], [2.63, 4.12]], .34, .05);
  saddle.position.x -= .55;
  rod(bike, M.silver, [1.13, 4.00, 0], [2.34, 4.30, 0], .028);
  ring(bike, M.silver, .35, -.29, .15, .40, .045);
  ring(bike, M.edge, .35, -.29, .18, .34, .05);
  rod(bike, M.silver, [.35, -.29, .22], [.84, -.62, .22], .043);
  box(bike, M.black, .88, -.62, .22, .31, .08, .24);
  rod(bike, M.silver, [.35, -.29, -.22], [-.14, .04, -.22], .043);
  box(bike, M.black, -.18, .04, -.28, .31, .08, .24);
  for (let i = 0; i < 6; i++)
    ring(bike, M.silver, 4, -.35, -.17 - i * .022, .12 + i * .019, .011);
  rod(bike, M.silver, [4, -.35, -.33], [3.88, -.75, -.31], .035);
  ring(bike, M.black, 3.88, -.74, -.31, .075, .026);
  curve(bike, M.rubber, [[.35, .08, -.12], [4, -.17, -.12], [4.11, -.37, -.12],
    [.35, -.67, -.12], [-.02, -.31, -.12], [.35, .08, -.12]], .018);
  curve(bike, M.rubber, [[-2.44, 3.5, .15], [-1.47, 2.05, .21], [1.26, 2.43, .12], [1.58, 2.75, .13]], .014);
  rod(bike, M.orange, [-.87, .40, .16], [-1.48, 1.40, .16], .21);
  rod(bike, M.orange, [-1.48, 1.40, .16], [-1.56, 1.53, .16], .12);
  ring(bike, M.orange, -1.49, 1.59, .16, .18, .038);
  for (let i = 0; i < 10; i++) {
    const t = i / 10;
    const decal = box(bike, M.white, -2.30 + 2.05 * t, 1.74 - 1.57 * t, .108, .12, .027, .007);
    decal.rotation.z = -.63;
  }
  for (const p of [[-3.05, 1.54, .2], [2.70, 1.62, .2]]) {
    rod(bike, M.silver, [p[0] - .13, p[1], p[2]], [p[0] + .16, p[1] + .03, p[2]], .065);
    rod(bike, M.silver, p, [p[0] + .08, p[1] + .33, p[2]], .042);
  }

  scene.traverse(object => { if (object.isMesh) object.castShadow = false; });

  // A continuous hanging fabric volume with rounded shoulders and knit shading.
  const clothMat = material('#685172', .94);
  clothMat.side = THREE.DoubleSide;
  clothMat.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 vFabric;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\nvFabric = position;');
    shader.fragmentShader = 'varying vec3 vFabric;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      float row = vFabric.y * 112.0 + vFabric.z * 92.0;
      float col = vFabric.x * 112.0;
      float loops = sin(col + 1.75 * sin(row)) * sin(row);
      float fibre = sin(col * 3.15 + row * 1.7) * sin(row * 3.0 - col);
      float knit = .85 + .20 * loops + .055 * fibre;
      diffuseColor.rgb *= knit;
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <normal_fragment_begin>', `
      #include <normal_fragment_begin>
      vec3 q0 = dFdx(vViewPosition.xyz);
      vec3 q1 = dFdy(vViewPosition.xyz);
      float h = loops * .0100 + fibre * .0010;
      vec3 S = cross(q1, normal);
      vec3 T = cross(normal, q0);
      normal = normalize(abs(dot(q0, S)) * normal - sign(dot(q0, S)) * (dFdx(h) * S + dFdy(h) * T));
    `);
  };
  const clothP = [], clothUV = [], clothI = [], nr = 98, na = 220;
  for (let r = 0; r <= nr; r++) {
    const u = r / nr;
    const shoulder = Math.max(0, Math.min(1, (u - .43) / .18));
    const drop = Math.max(0, (u - .61) / .39);
    const top = u < .43 ? u / .43 * .88 : .88 + .12 * Math.sin(shoulder * Math.PI / 2);
    for (let j = 0; j <= na; j++) {
      const a = j / na * Math.PI * 2, ca = Math.cos(a), sa = Math.sin(a);
      const superR = Math.pow(Math.pow(Math.abs(ca), 5) + Math.pow(Math.abs(sa), 5), -.2);
      const folds = Math.sin(a * 13 + .8) * .10 + Math.sin(a * 21 + 1.9) * .04
        + Math.cos(a * 7) * .13;
      const ripple = folds * (.28 * shoulder + .90 * Math.pow(drop, .60));
      const radius = top + drop * .12 + ripple;
      const x = 1.05 + 2.88 * ca * superR * radius;
      const frontWeight = Math.pow(Math.max(0, sa), 6) * (.18 * shoulder + .82 * Math.pow(drop, .55));
      const pleat = .28 * Math.exp(-Math.pow(x - 1.21, 2) / .19)
        - .53 * Math.exp(-Math.pow(x - 1.72, 2) / .047)
        + .23 * Math.exp(-Math.pow(x - 2.09, 2) / .095)
        - .32 * Math.exp(-Math.pow(x - 3.14, 2) / .075);
      const z = 1.67 * sa * superR * radius + pleat * frontWeight;
      const y = 1.56 - .34 * (1 - Math.cos(shoulder * Math.PI / 2)) - drop * 4.08
        + .038 * Math.sin(x * 2.7 + z * 3.1) * (1 - drop)
        + folds * .65 * Math.sin((drop * .75 + shoulder * .25) * Math.PI);
      clothP.push(x, y, z);
      clothUV.push(j / na, u);
      if (r < nr && j < na) {
        const k = r * (na + 1) + j;
        clothI.push(k, k + na + 1, k + 1, k + 1, k + na + 1, k + na + 2);
      }
    }
  }
  const clothGeo = new THREE.BufferGeometry();
  clothGeo.setAttribute('position', new THREE.Float32BufferAttribute(clothP, 3));
  clothGeo.setAttribute('uv', new THREE.Float32BufferAttribute(clothUV, 2));
  clothGeo.setIndex(clothI); clothGeo.computeVertexNormals();
  mesh(clothGeo, clothMat);
  const support = new THREE.Group(); scene.add(support);
  box(support, M.wood, 1.05, 1.33, 0, 4.7, .23, 2.6);
  for (const x of [-.83, 2.93]) for (const z of [-.98, .98])
    box(support, M.wood, x, -.75, z, .20, 4.02, .20);

  const bonsai = new THREE.Group(); scene.add(bonsai);
  bonsai.name = 'editable-manufactured-bonsai';
  bonsai.position.x = 1.00; bonsai.rotation.y = .18;
  const stand = new THREE.Group(); bonsai.add(stand);
  stand.scale.set(.95, 1.28, 1.10); stand.position.y = -.48;
  // Brown plinth: separate feet, stepped rails and closely spaced top slats.
  for (const x of [-.78, .78]) {
    for (const z of [-.58, .67]) {
      box(stand, M.wood, x, 1.615, z, .48, .16, .41);
      box(stand, M.wood2, x, 1.715, z - .04, .35, .12, .32);
    }
    box(stand, M.wood, x, 1.79, 0, .30, .20, 1.59);
  }
  box(stand, M.wood, 0, 1.88, .65, 2.11, .24, .20);
  box(stand, M.wood, 0, 1.88, -.65, 2.11, .24, .20);
  for (const z of [-.758, .758]) for (const x of [-.8, .8])
    rod(stand, M.brown3, [x, 1.88, z], [x, 1.88, z + Math.sign(z) * .012], .027);
  for (let i = 0; i < 11; i++) {
    box(stand, i % 3 ? M.wood : M.wood2, 0, 2.023, -.82 + i * .164, 2.10, .115, .154);
  }
  const planter = new THREE.Group(); bonsai.add(planter);
  planter.scale.set(.84, 1, .94); planter.position.y = .12;
  for (const x of [-.72, .72]) for (const z of [-.43, .43]) {
    rod(planter, M.black, [x, 2.07, z], [x, 2.27, z], .12);
  }
  // Open black tiled tray, with visible pebble bed, rim mitres and molded steps.
  box(planter, M.black, 0, 2.28, 0, 1.70, .16, 1.03);
  for (const x of [-.56, 0, .56])
    box(planter, M.edge, x, 2.182, 0, .066, .055, .75);
  for (let i = 0; i < 3; i++) {
    const w = 1.72 + i * .075, d = 1.03 + i * .065, y = 2.37 + i * .095;
    box(planter, M.black, 0, y, d / 2, w, .102, .11);
    box(planter, M.black, 0, y, -d / 2, w, .102, .11);
    box(planter, M.black, w / 2, y, 0, .11, .102, d);
    box(planter, M.black, -w / 2, y, 0, .11, .102, d);
  }
  for (let i = 0; i < 8; i++) for (const z of [-.64, .64])
    box(planter, i % 4 === 1 ? M.edge : M.black, -.887 + i * .254, 2.694, z, .250, .085, .245);
  for (let i = 0; i < 4; i++) for (const x of [-1.00, 1.00])
    box(planter, i % 3 ? M.black : M.edge, x, 2.694, -.386 + i * .255, .24, .085, .250);
  const soil = material('#332c24', .96);
  box(planter, soil, 0, 2.58, 0, 1.74, .04, 1.12);
  const pebbleMats = ['#aca393', '#79796e', '#c4b8a2', '#776047', '#a08761', '#d2c6b4'].map(c => material(c, .73));
  for (let i = 0; i < 120; i++) {
    const x = (rand() - .5) * 1.73, z = (rand() - .5) * 1.10;
    if (x * x + z * z < .11) continue;
    const p = ellipsoid(planter, pebbleMats[i % pebbleMats.length], x, 2.627 + rand() * .025, z,
      .052 + rand() * .04, .045 + rand() * .025, .037 + rand() * .044);
    p.rotation.set(rand() * 2, rand() * 6, rand());
  }
  const tree = new THREE.Group(); bonsai.add(tree);
  tree.scale.y = .82; tree.position.y = 2.68 * .18 + .12;
  // Curved silhouette is built from beveled molded panels and socket cylinders.
  const trunk = extrudePolygon(tree, M.brown3, [
    [-.24, 2.68], [.27, 2.68], [.38, 2.94], [.38, 3.34], [.30, 3.76],
    [.13, 4.16], [-.13, 4.35], [-.31, 4.31], [-.15, 3.98],
    [-.02, 3.61], [.04, 3.21], [-.02, 2.87],
  ], .30, .034);
  trunk.scale.x = .83;
  const barkPanel = extrudePolygon(tree, M.brown2, [
    [-.14, 2.78], [.11, 2.76], [.20, 3.13], [.12, 3.60], [-.01, 3.96],
    [-.18, 4.20], [-.27, 4.22], [-.09, 3.79], [.01, 3.34], [-.04, 2.98],
  ], .052, .01); barkPanel.position.z = .175; barkPanel.scale.x = .83;
  const reversePanel = barkPanel.clone();
  reversePanel.position.z = -.23; tree.add(reversePanel);
  for (const y of [3.02, 3.50, 3.94]) {
    const x = y > 3.8 ? -.02 : .11;
    rod(tree, M.brown2, [x, y, -.18], [x, y, -.267], .065);
    rod(tree, M.seam, [x, y, -.268], [x, y, -.274], .029);
  }
  for (const [x, y, z, w, h, angle] of [
    [.10, 3.23, .231, .09, .57, .03], [-.05, 3.75, .217, .07, .49, .23],
    [.24, 3.28, -.19, .10, .62, .02], [.04, 3.88, -.19, .12, .34, .21],
  ]) {
    const panel = box(tree, M.brown, x * .83, y, z, w, h, .052); panel.rotation.z = angle;
  }
  const branches = [
    [[-.10, 4.12, 0], [-.77, 4.08, .01], .20, .17],
    [[-.77, 4.08, .01], [-1.38, 4.03, .04], .17, .10],
    [[-.10, 4.13, -.015], [.62, 4.24, -.10], .22, .18],
    [[.62, 4.24, -.10], [1.19, 4.36, -.20], .18, .12],
    [[-1.16, 4.05, .06], [-1.41, 4.56, -.07], .10, .067],
    [[-1.0, 4.10, .0], [-1.77, 4.11, .35], .084, .045],
    [[-.78, 4.14, -.09], [-.63, 4.62, -.27], .10, .06],
    [[-.10, 4.20, -.04], [-.11, 4.61, -.27], .12, .06],
    [[.72, 4.30, -.12], [.69, 4.77, -.28], .11, .066],
    [[.69, 4.77, -.28], [1.06, 5.04, -.38], .064, .04],
    [[1.10, 4.36, -.16], [1.47, 4.64, .06], .073, .045],
    [[-.42, 4.10, .02], [-.44, 3.80, .29], .062, .035],
  ];
  for (const [a, b, r0, r1] of branches) {
    rod(tree, M.brown, a, b, r0, r1, 10);
    const av = new THREE.Vector3(...a), bv = new THREE.Vector3(...b);
    for (const t of [.18, .69]) {
      const p = av.clone().lerp(bv, t), d = bv.clone().sub(av).normalize();
      rod(tree, M.brown3, p.clone().addScaledVector(d, -.017).toArray(),
        p.clone().addScaledVector(d, .017).toArray(), r0 * (1 - t) + r1 * t + .007);
    }
    const connector = box(tree, M.brown3, b[0], b[1] - .02, b[2], r1 * 2.2, .13, r1 * 2.5);
    connector.rotation.z = -.14;
  }
  curve(tree, M.brown2, [[-.19, 2.68, .34], [-.48, 2.92, .30], [-.41, 3.24, .26], [-.24, 3.40, .19]], .033);
  curve(tree, M.brown2, [[-.16, 4.30, .28], [.20, 4.38, .20], [.56, 4.16, .08], [.49, 3.78, .0]], .025);
  curve(tree, M.brown2, [[-.67, 4.18, .18], [-.26, 4.26, .32], [.09, 4.08, .31], [.18, 3.80, .19]], .026);
  for (let i = 0; i < 7; i++) {
    const a = i * 1.04;
    curve(tree, i % 2 ? M.brown : M.brown2, [[.03, 2.83, .02],
      [.21 * Math.cos(a), 2.69, .21 * Math.sin(a)], [.47 * Math.cos(a), 2.63, .34 * Math.sin(a)]], .054);
  }
  for (let i = 0; i < 10; i++) {
    const x = -.29 + rand() * .60, y = 2.75 + rand() * .30;
    rod(tree, M.brown2, [x, y, .17], [x, y, .24], .045);
  }

  // All blossom parts are instanced solid plastic; there are no image maps.
  const batch = new Map();
  function instance(geo, mat, position, scale, rotation = [0, 0, 0]) {
    const key = geo.uuid + mat.uuid;
    if (!batch.has(key)) batch.set(key, { geo, mat, matrices: [] });
    const d = new THREE.Object3D();
    d.position.set(...position); d.scale.set(...scale); d.rotation.set(...rotation); d.updateMatrix();
    batch.get(key).matrices.push(d.matrix.clone());
  }
  const plateGeo = new THREE.CylinderGeometry(1, 1, 1, 16);
  const frogBody = new THREE.CylinderGeometry(.50, 1, 1, 7, 1);
  function frog(x, y, z, a, pink) {
    const ca = Math.cos(a), sa = Math.sin(a);
    const p = (dx, dy, dz) => [x + dx * ca + dz * sa, y + dy, z - dx * sa + dz * ca];
    instance(ball, pink, p(0, .049, .018), [.047, .046, .065], [.35, a, 0]);
    instance(frogBody, pink, p(0, .116, -.025), [.041, .157, .038], [-.40, a, .08]);
    instance(ball, pink, p(0, .177, -.055), [.027, .028, .031]);
    for (const s of [-1, 1]) {
      instance(ball, pink, p(s * .048, .019, .025), [.047, .022, .035], [0, a + s * .35, 0]);
      instance(frogBody, pink, p(s * .026, .050, -.038), [.014, .056, .020], [.3, a, s * .3]);
    }
  }
  const blossomCenters = [
    [-1.68, 4.04, .32], [-1.63, 4.25, .15], [-1.56, 4.46, -.08],
    [-1.39, 4.65, -.12], [-1.12, 4.74, -.23],
    [-1.41, 4.13, .51], [-1.18, 4.32, .45], [-.91, 4.25, .54],
    [-.63, 4.27, .45], [-.40, 4.35, .36], [-.71, 4.55, .04],
    [-.50, 4.76, -.29], [-.20, 4.75, -.24], [.08, 4.69, -.23],
    [.36, 4.50, -.29], [.62, 4.61, -.10], [.92, 4.62, .08],
    [1.17, 4.59, .15], [1.43, 4.63, .16],
    [.66, 4.93, -.33], [.91, 5.12, -.41], [1.18, 5.23, -.48],
    [-.43, 3.81, .40], [-.54, 3.70, .35],
  ];
  for (let k = 0; k < blossomCenters.length; k++) {
    const [x, y, z] = blossomCenters[k];
    const tilt = (rand() - .5) * .30;
    const anchor = branches.map(branch => branch[1]).reduce((closest, endpoint) =>
      V(...endpoint).distanceToSquared(V(x, y, z)) < V(...closest).distanceToSquared(V(x, y, z))
        ? endpoint : closest);
    rod(tree, M.brown2, anchor, [x + .04, y - .095, z - .025], .027, .017);
    rod(tree, M.white, [x + .04, y - .095, z - .025], [x, y, z], .027);
    instance(plateGeo, M.white, [x, y, z], [.064, .055, .064]);
    const petals = k > 21 ? 3 : 5;
    for (let j = 0; j < petals; j++) {
      const a = j * Math.PI * 2 / petals + k * .57;
      const px = x + Math.cos(a) * .156, pz = z + Math.sin(a) * .145;
      const py = y + Math.cos(a) * tilt;
      rod(tree, M.white, [x, y, z], [px, py, pz], .035);
      instance(plateGeo, M.white, [px, py, pz], [.071, .050, .072]);
      instance(plateGeo, j % 4 === 0 ? M.darkPink : M.pink, [px, py + .042, pz], [.040, .035, .040]);
      if ((j + k * 3) % 7 !== 0)
        frog(px, py + .045, pz, a + .60, (j + k) % 5 === 0 ? M.palePink : M.pink);
    }
  }
  for (const { geo, mat, matrices } of batch.values()) {
    const inst = new THREE.InstancedMesh(geo, mat, matrices.length);
    matrices.forEach((m, i) => inst.setMatrixAt(i, m));
    inst.castShadow = true; inst.receiveShadow = true; tree.add(inst);
  }
  function setTime(t) {
    const u = Math.max(0, Math.min(1, t / 10));
    const lift = Math.sin(Math.PI * u) ** 2;
    const progress = 360 * u + 3 * Math.sin(4 * Math.PI * u);
    const angle = Math.atan2(-.04, 11) + progress * Math.PI / 180;
    const radius = Math.hypot(.04, 11) - 1.85 * lift + .32 * Math.sin(4 * Math.PI * u);
    const target = V(.04 + .76 * lift, 2.30 + .30 * lift, 0);
    camera.position.set(target.x + radius * Math.sin(angle),
      5.7 + 2.6 * lift + 3.8 * lift ** 3 + .30 * Math.sin(4 * Math.PI * u),
      radius * Math.cos(angle));
    camera.lookAt(target);
    camera.fov = 34; camera.updateProjectionMatrix();
  }
  setTime(0);
  return { scene, camera, setTime };
}
