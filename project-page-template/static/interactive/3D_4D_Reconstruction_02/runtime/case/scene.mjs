const TAU = Math.PI * 2;

export function cameraPose(time) {
  const t = Math.max(0, Math.min(10, time));
  const u = t / 10;
  const progress = 360 * u + 6 * Math.sin(TAU * u);
  const angle = progress * Math.PI / 180;
  const radius = 4.5 + 0.7 * Math.sin(Math.PI * u) ** 2;
  const target = [-0.045, 0.94 + 0.055 * Math.sin(TAU * u), 0];
  return {
    time: t, orbitProgressDegrees: progress, fov: 37.2,
    position: [target[0] + radius * Math.sin(angle),
      1.81 + 0.84 * Math.sin(Math.PI * u) ** 2 + 0.09 * Math.sin(TAU * u),
      radius * Math.cos(angle)],
    target,
  };
}

export function buildScene(THREE, spec) {
  let seed = 874231;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const between = (a, b) => a + (b - a) * rand();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#cad4cd');
  scene.fog = new THREE.Fog('#c5d0bd', 19, 43);
  const camera = new THREE.PerspectiveCamera(36, spec.target.width / spec.target.height, 0.05, 65);
  const hemi = new THREE.HemisphereLight('#eef3ec', '#978b69', 2.15);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#fff4e2', 2.3);
  sun.position.set(-5, 9, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 });
  sun.shadow.bias = -0.0003;
  sun.shadow.normalBias = 0.016;
  sun.shadow.radius = 3;
  scene.add(sun);
  const fill = new THREE.DirectionalLight('#c7dddc', 0.38);
  fill.position.set(4, 3, -4);
  scene.add(fill);
  const mat = (color, extra = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.92, ...extra });
  const mesh = (geometry, material, position = [0, 0, 0], parent = scene) => {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(...position);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  };
  const box = (w, h, d, material, position, parent) =>
    mesh(new THREE.BoxGeometry(w, h, d), material, position, parent);
  const cylinder = (r1, r2, h, material, position, parent, segments = 24) =>
    mesh(new THREE.CylinderGeometry(r1, r2, h, segments), material, position, parent);
  const rod = (a, b, radius, material, parent = scene, topRadius = radius) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const object = cylinder(topRadius, radius, delta.length(), material,
      start.clone().add(end).multiplyScalar(0.5).toArray(), parent, 8);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return object;
  };
  const beam = (a, b, width, depth, material, parent) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
    const delta = end.clone().sub(start);
    const object = box(width, delta.length(), depth, material,
      start.clone().add(end).multiplyScalar(0.5).toArray(), parent);
    object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    return object;
  };
  function texture(kind, size = 512) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    const pixels = ctx.createImageData(size, size);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const i = 4 * (y * size + x);
      const n = rand() - 0.5;
      const cloud = Math.sin(x * 0.037 + Math.sin(y * 0.022) * 3)
        * Math.cos(y * 0.046 + Math.sin(x * 0.016) * 2);
      let rgb;
      if (kind === 'wood') {
        const grain = Math.sin(x * 0.58 + Math.sin(y * 0.012 + x * 0.03) * 3)
          + 0.6 * Math.sin(x * 1.37 + y * 0.014);
        const v = n * 17 + cloud * 11 + grain * 6;
        rgb = [145 + v, 141 + v, 132 + v];
      } else if (kind === 'vase') {
        const coarse = Math.sin(x * 0.021 + Math.sin(y * 0.025) * 2.2)
          * Math.cos(y * 0.018 - Math.sin(x * 0.043));
        const stain = -Math.max(0, -coarse - 0.12) * 36 * Math.min(1, y / (size * 0.45));
        const fleck = Math.sin(x * 0.16 + Math.sin(y * 0.18) * 2)
          * Math.cos(y * 0.12 + Math.sin(x * 0.15));
        const streak = Math.sin(x * 0.75 + Math.sin(y * 0.017)) * 6;
        const v = cloud * 10 + n * 31 + stain + fleck * 17 + streak;
        rgb = [151 + v, 133 + v, 109 + v];
      } else if (kind === 'slab') {
        const v = n * 37 + cloud * 8;
        const speck = rand() < 0.04 ? -between(14, 40) : 0;
        rgb = [146 + v + speck, 143 + v + speck, 141 + v + speck];
      } else if (kind === 'brick') {
        const v = n * 30 + cloud * 18;
        rgb = [162 + v, 135 + v, 96 + v];
      } else {
        const v = n * 21 + cloud * 15;
        rgb = [116 + v, 124 + v, 65 + v];
      }
      pixels.data[i] = rgb[0]; pixels.data[i + 1] = rgb[1];
      pixels.data[i + 2] = rgb[2]; pixels.data[i + 3] = 255;
    }
    ctx.putImageData(pixels, 0, 0);
    if (kind === 'wood') {
      for (let i = 0; i < 360; i++) {
        const x = rand() * size, y = rand() * size;
        ctx.strokeStyle = i % 4 ? 'rgba(38,30,20,0.14)' : 'rgba(230,218,182,0.3)';
        ctx.lineWidth = between(0.3, 1.5);
        ctx.beginPath(); ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + 2, y + 15, x - 2, y + 32, x + between(-2, 2), y + between(12, 180));
        ctx.stroke();
      }
    }
    const result = new THREE.CanvasTexture(canvas);
    result.colorSpace = THREE.SRGBColorSpace;
    result.wrapS = result.wrapT = THREE.RepeatWrapping;
    result.anisotropy = 4;
    return result;
  }
  const woodTexture = texture('wood');
  const wood = mat('#c8c9c5', { map: woodTexture, bumpMap: woodTexture, bumpScale: 0.003 });
  const darkWood = mat('#968978', { map: woodTexture, bumpMap: woodTexture, bumpScale: 0.005 });
  const endWood = mat('#ad9d8c', { map: woodTexture });
  const iron = mat('#272e28', { metalness: 0.55, roughness: 0.67 });
  const soil = mat('#554c35');
  const turfMap = texture('turf');
  turfMap.repeat.set(32, 32);
  box(45, 0.12, 45, mat('#d9d9ba', { map: turfMap }), [0, -0.075, 0]);

  const slabTexture = texture('slab');
  const slabMats = Array.from({ length: 7 }, (_, i) => mat(
    new THREE.Color().setHSL(0.13, 0.07, 0.68 + i * 0.025),
    { map: slabTexture, bumpMap: slabTexture, bumpScale: 0.018 }));
  box(5.8, 0.045, 7.8, soil, [0, -0.052, 1.85]);
  const slabRadius = 0.43;
  for (let q = -5; q <= 5; q++) for (let r = -8; r <= 8; r++) {
    const x = q * slabRadius * 1.5;
    const z = Math.sqrt(3) * slabRadius * (r + q / 2) + 1.3;
    if (Math.abs(x) > 2.85 || z < -2.03 || z > 5.6) continue;
    const object = cylinder(slabRadius - 0.008, slabRadius - 0.009, 0.05,
      slabMats[Math.floor(rand() * slabMats.length)], [x, -0.02 + rand() * 0.008, z], scene, 6);
    object.rotation.y = Math.PI / 6;
  }

  const table = new THREE.Group();
  table.rotation.y = 0.53;
  scene.add(table);
  const topY = 1.065, outerR = 1.125;
  cylinder(outerR - 0.003, outerR - 0.003, 0.036, darkWood, [0, topY - 0.019, 0], table, 128);
  const boardCount = 32;
  for (let i = 0; i < boardCount; i++) {
    const start = i * TAU / boardCount + 0.004, end = (i + 1) * TAU / boardCount - 0.004;
    const positions = [], uvs = [];
    for (let j = 0; j < 5; j++) {
      const a = start + (end - start) * j / 5, b = start + (end - start) * (j + 1) / 5;
      for (const [radius, angle, u, v] of [
        [0.10, a, j / 5, 0], [outerR, b, (j + 1) / 5, 1], [outerR, a, j / 5, 1],
        [0.10, a, j / 5, 0], [0.10, b, (j + 1) / 5, 0], [outerR, b, (j + 1) / 5, 1],
      ]) {
        positions.push(radius * Math.cos(angle), topY + 0.002, radius * Math.sin(angle));
        uvs.push(u * 0.34 + i * 0.13, v * 1.4);
      }
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.computeVertexNormals();
    const material = wood.clone();
    material.color.multiplyScalar(between(0.82, 1.1));
    mesh(geometry, material, [0, 0, 0], table);
    const angle = (start + end) / 2;
    cylinder(0.004, 0.004, 0.002, iron,
      [Math.cos(angle) * 1.07, topY + 0.004, Math.sin(angle) * 1.07], table, 8);
  }
  const centerStone = mat('#87958e', { map: slabTexture, bumpMap: slabTexture, bumpScale: 0.004 });
  cylinder(0.405, 0.405, 0.009, centerStone, [0, 1.078, 0], table, 96);
  const rim = mesh(new THREE.TorusGeometry(0.403, 0.002, 6, 96), mat('#858e80'), [0, 1.084, 0], table);
  rim.rotation.x = Math.PI / 2;
  for (const angle of [0, Math.PI / 2, Math.PI, Math.PI * 1.5]) {
    const x = Math.cos(angle) * 0.77, z = Math.sin(angle) * 0.77;
    box(0.066, 0.95, 0.079, darkWood, [x, 0.5425, z], table);
    for (const y of [0.125, 0.96]) {
      const bolt = cylinder(0.009, 0.009, 0.006, iron, [x, y, z + 0.042], table, 10);
      bolt.rotation.x = Math.PI / 2;
    }
    beam([x, 0.76, z], [x * 0.55, 1.03, z * 0.55], 0.038, 0.06, darkWood, table);
  }
  for (const rotation of [0, Math.PI / 2]) {
    const footOutline = new THREE.Shape();
    footOutline.moveTo(-1, -0.032); footOutline.lineTo(-0.946, -0.065);
    footOutline.lineTo(0.946, -0.065); footOutline.lineTo(1, -0.032);
    footOutline.lineTo(1, 0.032); footOutline.lineTo(0.946, 0.065);
    footOutline.lineTo(-0.946, 0.065); footOutline.lineTo(-1, 0.032); footOutline.closePath();
    const footGeo = new THREE.ExtrudeGeometry(footOutline, {
      depth: 0.063, bevelEnabled: true, bevelThickness: 0.008,
      bevelSize: 0.009, bevelSegments: 2, steps: 1,
    });
    footGeo.rotateX(Math.PI / 2);
    const base = mesh(footGeo, endWood, [0, 0.099, 0], table);
    base.rotation.y = rotation;
    const apron = box(1.69, 0.086, 0.085, darkWood, [0, 0.975, 0], table);
    apron.rotation.y = rotation;
  }
  cylinder(0.027, 0.027, 0.004, iron, [0, 0.105, 0], table, 24);

  const vaseMap = texture('vase');
  const vaseMaterial = mat('#daceba', { map: vaseMap, bumpMap: vaseMap, bumpScale: 0.006 });
  const vaseProfile = [[0.104, 0], [0.135, 0.017], [0.157, 0.077], [0.176, 0.15],
    [0.18, 0.22], [0.173, 0.285], [0.151, 0.361], [0.136, 0.393],
    [0.121, 0.393], [0.126, 0.367], [0.137, 0.31], [0.14, 0.22], [0.105, 0.045]];
  mesh(new THREE.LatheGeometry(vaseProfile.map(([r, y]) => new THREE.Vector2(r, y)), 72),
    vaseMaterial, [0, 1.084, 0]);
  cylinder(0.104, 0.104, 0.015, mat('#29271d'), [0, 1.119, 0], scene, 48);
  const scar = mesh(new THREE.SphereGeometry(1, 16, 12), mat('#30291c'), [-0.134, 1.21, 0.119]);
  scar.scale.set(0.015, 0.023, 0.005);
  scar.rotation.y = -0.65;
  const dryStem = mat('#9f7847');
  rod([0.007, 1.315, 0.017], [-0.05, 1.591, 0.014], 0.012, dryStem, scene, 0.007);
  const fanMats = ['#cbb47f', '#d5c392', '#ad915c', '#e2d2a3', '#c7a979', '#a68050']
    .map(color => mat(color, { side: THREE.DoubleSide, roughness: 0.98 }));
  for (let i = 0; i < 35; i++) {
    const theta = -1.5 + i * 3.02 / 34;
    const length = 0.32 + 0.085 * Math.cos(theta) + between(-0.025, 0.017);
    const a = [-0.05, 1.59, 0.011];
    const dx = Math.sin(theta) * 0.85, dy = Math.cos(theta) * 0.72;
    const width = between(0.013, 0.024);
    const bend = between(-0.04, 0.035);
    const tip = [a[0] + dx * length, a[1] + dy * length, -0.018 + bend];
    const mid = [a[0] + dx * length * 0.69, a[1] + dy * length * 0.69, 0.018 + bend * 0.35];
    const left = [mid[0] - dy * width, mid[1] + dx * width, mid[2] - 0.014];
    const right = [mid[0] + dy * width, mid[1] - dx * width, mid[2] - 0.014];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute([
      ...a, ...left, ...mid, ...a, ...mid, ...right,
      ...mid, ...left, ...tip, ...right, ...mid, ...tip,
    ], 3));
    geo.computeVertexNormals();
    mesh(geo, fanMats[i % fanMats.length]);
    rod(a, tip, 0.0018, fanMats[2], scene, 0.00065);
  }
  for (const sign of [-1, 1]) {
    rod([-0.05, 1.59, 0], [sign * 0.235 - 0.035, 1.505, -0.05], 0.006, dryStem, scene, 0.003);
    for (let i = 0; i < 3; i++) {
      const path = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-0.05, 1.59, 0),
        new THREE.Vector3(sign * (0.14 + i * 0.022) - 0.035, 1.615 + i * 0.035, -0.037),
        new THREE.Vector3(sign * (0.24 + i * 0.015) - 0.035, 1.645 + i * 0.05, -0.049),
        new THREE.Vector3(sign * (0.27 - i * 0.004) - 0.035, 1.585 + i * 0.04, -0.01),
      ]);
      const positions = [];
      for (let j = 0; j < 12; j++) {
        const a = path.getPoint(j / 12), b = path.getPoint((j + 1) / 12);
        const w = 0.006 * Math.sin(Math.PI * (j + 0.5) / 12);
        positions.push(a.x, a.y - w, a.z, b.x, b.y - w, b.z, b.x, b.y + w, b.z,
          a.x, a.y - w, a.z, b.x, b.y + w, b.z, a.x, a.y + w, a.z);
      }
      const ribbon = new THREE.BufferGeometry();
      ribbon.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      ribbon.computeVertexNormals();
      mesh(ribbon, fanMats[4 + i % 2]);
    }
  }

  const ballCenter = new THREE.Vector3(0.095, 0.126, -0.24);
  const ballRadius = 0.12;
  const ball = mesh(new THREE.SphereGeometry(ballRadius, 48, 32),
    mat('#06483b', { roughness: 0.7 }), ballCenter.toArray());
  ball.name = 'single-stationary-garden-ball';
  ball.userData.role = 'only-ball-body';
  const blackRubber = mat('#071b17', { roughness: 0.94 });
  const phi = (1 + Math.sqrt(5)) / 2;
  const patchNormals = [[0, 1, phi], [0, -1, phi], [0, 1, -phi], [0, -1, -phi],
    [1, phi, 0], [-1, phi, 0], [1, -phi, 0], [-1, -phi, 0],
    [phi, 0, 1], [phi, 0, -1], [-phi, 0, 1], [-phi, 0, -1]];
  for (const [patchIndex, normal] of patchNormals.entries()) {
    const n = new THREE.Vector3(...normal).normalize();
    const tangent = new THREE.Vector3(0, 1, 0).cross(n).normalize();
    const bitangent = n.clone().cross(tangent);
    const positions = [];
    const point = angle => n.clone().multiplyScalar(0.93)
      .addScaledVector(tangent, 0.31 * Math.cos(angle)).addScaledVector(bitangent, 0.31 * Math.sin(angle))
      .normalize().multiplyScalar(ballRadius + 0.0005).add(ballCenter);
    const center = n.clone().multiplyScalar(ballRadius + 0.001).add(ballCenter);
    for (let i = 0; i < 5; i++) {
      const edgeA = point(i * TAU / 5).sub(ballCenter).normalize();
      const edgeB = point((i + 1) * TAU / 5).sub(ballCenter).normalize();
      for (let j = 0; j < 5; j++) {
        const edgePoint = f => edgeA.clone().lerp(edgeB, f).normalize()
          .multiplyScalar(ballRadius + 0.0017).add(ballCenter);
        const innerPoint = f => edgeA.clone().lerp(edgeB, f).lerp(n, 0.5).normalize()
          .multiplyScalar(ballRadius + 0.0017).add(ballCenter);
        const a = edgePoint(j / 5), b = edgePoint((j + 1) / 5);
        const c = innerPoint(j / 5), d = innerPoint((j + 1) / 5);
        positions.push(...a.toArray(), ...b.toArray(), ...c.toArray(),
          ...b.toArray(), ...d.toArray(), ...c.toArray(),
          ...c.toArray(), ...d.toArray(), ...center.toArray());
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.computeVertexNormals();
    const patch = mesh(geo, blackRubber);
    patch.name = `single-ball-attached-panel-${patchIndex}`;
    patch.userData.role = 'ball-surface-panel';
  }

  const brickTexture = texture('brick', 256);
  const brickMat = mat('#fff6e7', { map: brickTexture, bumpMap: brickTexture, bumpScale: 0.008 });
  const mortar = mat('#a3997c', { map: slabTexture });
  const brickTransforms = [];
  const dummy = new THREE.Object3D();
  const addBrick = (x, y, z, rotation, scale = [1, 1, 1]) => {
    dummy.position.set(x, y, z); dummy.rotation.set(0, rotation, 0);
    dummy.scale.set(...scale); dummy.updateMatrix();
    brickTransforms.push({ matrix: dummy.matrix.clone(), color: new THREE.Color().setHSL(
      between(0.075, 0.12), between(0.07, 0.23), between(0.77, 0.98)) });
  };
  function wall(axis, coordinate, start, end, height) {
    const alongX = axis === 'x';
    box(alongX ? end - start : 0.22, height, alongX ? 0.22 : end - start,
      mortar, alongX ? [(start + end) / 2, height / 2, coordinate]
        : [coordinate, height / 2, (start + end) / 2]);
    for (let row = 0; row < height / 0.115; row++) {
      for (let along = start + 0.14 + (row % 2) * 0.135; along < end; along += 0.275) {
        addBrick(alongX ? along : coordinate, 0.058 + row * 0.115,
          alongX ? coordinate : along, alongX ? 0 : Math.PI / 2);
      }
    }
    box(alongX ? end - start + 0.1 : 0.32, 0.08, alongX ? 0.32 : end - start + 0.1,
      mat('#657366'), alongX ? [(start + end) / 2, height, coordinate]
        : [coordinate, height, (start + end) / 2]);
  }
  wall('x', -8.2, -8, 8, 2.95);
  wall('z', -7.2, -8.2, 8.3, 2.6);
  wall('z', 7.2, -8.2, 8.3, 2.6);
  wall('x', 8.3, -7.2, 7.2, 2.35);
  const bricks = new THREE.InstancedMesh(new THREE.BoxGeometry(0.261, 0.103, 0.25),
    brickMat, brickTransforms.length);
  brickTransforms.forEach((record, i) => { bricks.setMatrixAt(i, record.matrix); bricks.setColorAt(i, record.color); });
  bricks.castShadow = true; bricks.receiveShadow = true; scene.add(bricks);
  const door = new THREE.Group();
  door.position.set(-5.65, 0.03, -8.03);
  scene.add(door);
  const doorWood = mat('#18221e', { map: woodTexture, bumpMap: woodTexture, bumpScale: 0.015 });
  box(1.08, 2.48, 0.12, darkWood, [0, 1.24, 0], door);
  for (let i = 0; i < 8; i++) box(0.126, 2.29, 0.045, doorWood, [-0.445 + i * 0.128, 1.22, 0.075], door);
  for (const x of [-0.54, 0.54]) box(0.065, 2.49, 0.075, doorWood, [x, 1.25, 0.095], door);
  for (const y of [0.09, 1.1, 2.46]) box(1.09, 0.083, 0.065, doorWood, [0, y, 0.105], door);
  const steel = mat('#9d9f91', { metalness: 0.68, roughness: 0.5 });
  for (const y of [0.49, 2.29]) box(0.23, 0.038, 0.02, steel, [0.38, y, 0.143], door);
  box(0.16, 0.042, 0.025, steel, [0.36, 1.15, 0.157], door);
  for (let i = 0; i < 26; i++) box(between(0.002, 0.009), between(0.012, 0.1), 0.001,
    endWood, [between(-0.46, 0.45), between(0.2, 2.32), 0.1], door);
  const building = new THREE.Group();
  building.position.set(-2.9, -0.2, -11.1);
  scene.add(building);
  box(4.3, 3.5, 3.1, mat('#b8a777', { map: brickTexture }), [0, 1.75, 0], building);
  const gable = new THREE.Shape();
  gable.moveTo(-2.18, 3.45); gable.lineTo(0, 4.67); gable.lineTo(2.18, 3.45); gable.closePath();
  mesh(new THREE.ExtrudeGeometry(gable, { depth: 3.2, bevelEnabled: false }),
    mat('#beac7b', { map: brickTexture }), [0, 0, -1.6], building);
  const roofMat = mat('#646d64');
  for (const sign of [-1, 1]) {
    const roof = box(2.55, 0.07, 3.55, roofMat, [sign * 1.07, 4.04, 0], building);
    roof.rotation.z = -sign * 0.507;
    beam([sign * 2.28, 3.44, 1.8], [0, 4.7, 1.8], 0.04, 0.04, mat('#465d50'), building);
  }
  box(0.36, 0.6, 0.36, mat('#e6e0bd'), [1.15, 4.53, -0.6], building);
  box(0.43, 0.09, 0.43, mat('#f1edda'), [1.15, 4.85, -0.6], building);
  const gableBricks = [];
  for (let row = 0; row < 12; row++) {
    const y = 3.45 + row * 0.106;
    const extent = 2.12 * (1 - (y - 3.45) / 1.22);
    for (let x = -extent + 0.12; x < extent - 0.04; x += 0.265) {
      dummy.position.set(x, y, 1.626); dummy.rotation.set(0, 0, 0);
      dummy.scale.set(1, 1, 1); dummy.updateMatrix(); gableBricks.push(dummy.matrix.clone());
    }
  }
  const gableBrickMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(0.252, 0.094, 0.035),
    brickMat, gableBricks.length);
  gableBricks.forEach((matrix, i) => {
    gableBrickMesh.setMatrixAt(i, matrix);
    gableBrickMesh.setColorAt(i, new THREE.Color().setHSL(between(0.105, 0.145), 0.17, between(0.78, 0.97)));
  });
  gableBrickMesh.castShadow = true; gableBrickMesh.receiveShadow = true; building.add(gableBrickMesh);

  const leafPositions = [], leafNormals = [], leafColors = [];
  const leafPalette = ['#35482a', '#405b28', '#526a2d', '#647932', '#789346', '#2d4521', '#718444']
    .map(color => new THREE.Color(color));
  function leaf(center, length, width, yaw, pitch, color, roll = 0) {
    const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(pitch, yaw, roll, 'YXZ'));
    const origin = new THREE.Vector3(...center);
    const stations = [0, 0.2, 0.53, 0.82, 1];
    const points = stations.flatMap(t => {
      const breadth = Math.sin(Math.PI * t) ** 0.8 * width * 0.53;
      const curl = -length * 0.12 * t * t;
      return [[-breadth, t * length, curl], [0, t * length, curl + Math.sin(Math.PI * t) * length * 0.055],
        [breadth, t * length, curl]].map(p => new THREE.Vector3(...p).applyQuaternion(rot).add(origin));
    });
    const triangles = [];
    for (let i = 0; i < 4; i++) {
      const a = i * 3, b = (i + 1) * 3;
      if (i > 0) triangles.push([a, b, a + 1], [a + 1, b + 2, a + 2]);
      if (i < 3) triangles.push([b, b + 1, a + 1], [a + 1, b + 1, b + 2]);
    }
    for (const indices of triangles) {
      const [a, b, c] = indices.map(i => points[i]);
      const n = b.clone().sub(a).cross(c.clone().sub(a)).normalize();
      for (const point of [a, b, c]) {
        leafPositions.push(...point.toArray()); leafNormals.push(...n.toArray());
        leafColors.push(color.r, color.g, color.b);
      }
    }
  }
  const branchMaterial = mat('#65593b', { map: woodTexture });
  function shrub(x, z, radius, height, count = 800, palette = leafPalette) {
    const baseY = 0.02;
    for (let branch = 0; branch < 7; branch++) {
      const angle = rand() * TAU, extent = between(0.3, 0.72);
      rod([x, baseY, z], [x + Math.cos(angle) * radius * extent, height * between(0.52, 0.9),
        z + Math.sin(angle) * radius * extent], 0.011, branchMaterial, scene, 0.004);
    }
    for (let i = 0; i < count; i++) {
      const theta = rand() * TAU, cosPhi = between(-0.8, 1), shell = Math.cbrt(rand());
      const s = Math.sqrt(1 - cosPhi * cosPhi);
      const px = x + radius * s * Math.cos(theta) * shell;
      const pz = z + radius * s * Math.sin(theta) * shell;
      const py = height * 0.49 + height * 0.47 * cosPhi * shell;
      leaf([px, py, pz], between(0.06, 0.16), between(0.033, 0.09),
        theta + between(-0.8, 0.8), between(-1.2, 1.3), palette[Math.floor(rand() * palette.length)], between(-1.2, 1.2));
    }
  }
  const bed = mat('#3f3928', { map: turfMap });
  box(15, 0.045, 1.05, bed, [0, -0.02, -7.5]);
  box(0.9, 0.045, 15, bed, [-6.56, -0.02, -0.5]);
  box(0.9, 0.045, 15, bed, [6.56, -0.02, -0.5]);
  box(12.9, 0.045, 0.9, bed, [0, -0.02, 7.7]);
  for (let i = 0; i < 35; i++) {
    const angle = i * TAU / 35;
    const x = Math.sin(angle) * (6.23 + rand() * 0.35);
    const z = Math.cos(angle) * (zRange(angle)) + 0.7;
    shrub(x, z, between(0.45, 0.82), between(0.6, 1.75), 390);
  }
  function zRange(angle) { return Math.cos(angle) < 0 ? 8.1 : 6.5; }
  for (let i = 0; i < 24500; i++) {
    let x = between(-7.3, 7.3), y = between(0.3, 3.15), z = between(-8.04, -7.69);
    if (x < -5.04 && x > -6.24 && y < 2.53) continue;
    const gap = Math.sin(x * 2.8 + y * 1.7) + Math.cos(x * 1.6 - y * 2.7);
    if (gap > 1.55 && y < 2.37) continue;
    leaf([x, y, z], between(0.075, 0.18), between(0.058, 0.13),
      between(-0.8, 0.8), between(-0.2, 1.5), leafPalette[Math.floor(rand() * leafPalette.length)], between(-2.3, 2.3));
  }
  for (const x of [-6.95, 6.95]) for (let i = 0; i < 2600; i++) {
    leaf([x + between(-0.14, 0.14), between(0.45, 2.86), between(-7.9, 8.2)],
      between(0.12, 0.24), between(0.07, 0.16), x > 0 ? -Math.PI / 2 : Math.PI / 2,
      between(-0.1, 1.8), leafPalette[Math.floor(rand() * leafPalette.length)], between(-2, 2));
  }
  for (let i = 0; i < 2100; i++) leaf([between(-7, 7), between(0.4, 2.5), between(7.97, 8.15)],
    between(0.12, 0.25), between(0.07, 0.15), Math.PI + between(-0.5, 0.5), between(0, 1.8),
    leafPalette[Math.floor(rand() * leafPalette.length)], between(-2, 2));
  shrub(-3.3, -6.1, 0.5, 0.42, 650);
  shrub(-1.62, -5.6, 0.68, 0.74, 1400, ['#7c8c26', '#88922e', '#636e21'].map(c => new THREE.Color(c)));
  shrub(0.85, -5.95, 0.95, 1.65, 2600);
  shrub(2.5, -5.6, 0.9, 1.85, 2400);
  shrub(3.7, -6.4, 0.85, 2.5, 1800);
  shrub(-4.55, -7.65, 0.55, 3.2, 2200);
  for (let i = 0; i < 80; i++) {
    const angle = rand() * TAU;
    leaf([-2.65 + Math.cos(angle) * rand() * 0.46, between(0.07, 0.17), -6.1 + Math.sin(angle) * rand() * 0.4],
      between(0.18, 0.35), between(0.13, 0.22), angle, between(-1.3, 1.3), leafPalette[i % 7]);
  }
  const planterMaterial = mat('#252b24', { map: vaseMap, roughness: 0.85 });
  const planterX = 3.65, planterZ = -6.6;
  const planterProfile = [[0.17, 0], [0.21, 0.1], [0.265, 0.31], [0.27, 0.45],
    [0.245, 0.47], [0.227, 0.445], [0.217, 0.38]];
  mesh(new THREE.LatheGeometry(planterProfile.map(p => new THREE.Vector2(p[0] * 1.4, p[1] * 1.4)), 48),
    planterMaterial, [planterX, 0.025, planterZ]);
  cylinder(0.301, 0.301, 0.015, soil, [planterX, 0.59, planterZ]);
  for (let i = 0; i < 7; i++) {
    const xx = planterX + between(-0.09, 0.09), zz = planterZ + between(-0.08, 0.08);
    rod([xx, 0.56, zz], [xx + between(-0.14, 0.14), between(2.1, 3), zz], 0.009, dryStem, scene, 0.004);
  }
  for (let i = 0; i < 900; i++) {
    const a = rand() * TAU, y = between(1.1, 3.18), radius = between(0.15, 0.8);
    leaf([planterX + Math.cos(a) * radius, y, planterZ + Math.sin(a) * radius * 0.6],
      between(0.1, 0.22), between(0.018, 0.035), a, between(-1.6, 1.6),
      leafPalette[i % 7], between(-1, 1));
  }
  const umbrella = new THREE.Group();
  umbrella.position.set(4.7, 0, -7.2);
  scene.add(umbrella);
  cylinder(0.017, 0.019, 3.28, iron, [0, 1.64, 0], umbrella, 12);
  const cloth = mat('#6c6965', { side: THREE.DoubleSide });
  for (let i = 0; i < 10; i++) {
    const a = i * TAU / 10;
    const geo = new THREE.BufferGeometry();
    const points = [];
    const rings = [[0.04, 3.33], [0.09, 3.17], [0.065, 2.92], [0.09, 2.2], [0.16, 1.73]];
    for (let j = 0; j < 4; j++) for (const [k, da] of [[j, 0], [j + 1, 0], [j + 1, 0.55], [j, 0], [j + 1, 0.55], [j, 0.55]]) {
      points.push(Math.cos(a + da) * rings[k][0], rings[k][1], Math.sin(a + da) * rings[k][0]);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(points, 3)); geo.computeVertexNormals();
    mesh(geo, cloth, [0, 0, 0], umbrella);
  }
  const tie = mesh(new THREE.TorusGeometry(0.088, 0.012, 6, 20), mat('#423e39'), [0, 2.53, 0], umbrella);
  tie.rotation.x = Math.PI / 2;
  for (const side of [-1, 1]) {
    for (let i = 0; i < 26; i++) {
      const x = side * (2.97 + between(-0.16, 0.15)), z = -4.8 + i * 0.38;
      const rock = mesh(new THREE.DodecahedronGeometry(between(0.07, 0.16), 0),
        slabMats[i % 7], [x, 0.045, z]);
      rock.scale.set(between(0.9, 1.7), between(0.65, 1.2), between(0.8, 1.3));
      rock.rotation.set(rand(), rand(), rand());
    }
  }
  const flowerWhite = mat('#e6e4cf'), flowerGold = mat('#c3a54d');
  const flowerPetal = new THREE.SphereGeometry(1, 6, 4);
  for (let i = 0; i < 22; i++) {
    const x = between(2.1, 2.65), z = between(-1.8, -0.5), y = between(0.05, 0.09);
    rod([x, 0, z], [x, y, z], 0.001, branchMaterial, scene, 0.0007);
    for (let j = 0; j < 7; j++) {
      const a = j * TAU / 7;
      const petal = mesh(flowerPetal, flowerWhite, [x + Math.cos(a) * 0.009, y, z + Math.sin(a) * 0.009]);
      petal.scale.set(0.007, 0.002, 0.0035); petal.rotation.y = -a;
      petal.castShadow = false;
    }
    const core = mesh(flowerPetal, flowerGold, [x, y + 0.001, z]);
    core.scale.set(0.004, 0.003, 0.004);
  }
  for (const [x, z] of [[-7.8, -7.3], [5.5, -8.2], [8.7, 4], [-8.7, 5], [1.6, 10.5]]) {
    rod([x, 0, z], [x - 0.2, 5.9, z + 0.15], 0.21, branchMaterial, scene, 0.12);
    for (let i = 0; i < 5; i++) {
      const a = i * TAU / 5;
      rod([x, 3.7, z], [x + Math.cos(a) * 1.4, 5.7 + rand(), z + Math.sin(a) * 1.4],
        0.08, branchMaterial, scene, 0.025);
    }
    for (let i = 0; i < 1700; i++) {
      const a = rand() * TAU, radius = Math.sqrt(rand()) * 2.5;
      leaf([x + Math.cos(a) * radius, between(5.1, 7), z + Math.sin(a) * radius],
        between(0.11, 0.24), between(0.05, 0.13), a, between(-2, 2),
        leafPalette[i % 7], between(-2, 2));
    }
  }
  const foliageGeometry = new THREE.BufferGeometry();
  foliageGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leafPositions, 3));
  foliageGeometry.setAttribute('normal', new THREE.Float32BufferAttribute(leafNormals, 3));
  foliageGeometry.setAttribute('color', new THREE.Float32BufferAttribute(leafColors, 3));
  mesh(foliageGeometry, mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide, roughness: 1 }));

  const grassPositions = [], grassColors = [];
  const grassPalette = ['#7f883c', '#90944c', '#697532', '#536b28', '#a5a66a', '#657e38']
    .map(c => new THREE.Color(c));
  for (let i = 0; i < 185000; i++) {
    const x = between(-7, 7), z = between(-8, 8);
    const onPaving = Math.abs(x) < 2.83 && z > -2.08 && z < 5.66;
    if (onPaving && rand() > 0.008) continue;
    const y = onPaving ? 0.006 : -0.005;
    const height = onPaving ? between(0.015, 0.047) : between(0.009, 0.048);
    const w = between(0.003, 0.009), a = rand() * TAU;
    const color = grassPalette[i % grassPalette.length];
    const dx = Math.cos(a) * w, dz = Math.sin(a) * w;
    grassPositions.push(x - dx, y, z - dz, x + dx, y, z + dz,
      x + Math.cos(a + 1) * height * 0.42, y + height, z + Math.sin(a + 1) * height * 0.42);
    for (let j = 0; j < 3; j++) grassColors.push(color.r, color.g, color.b);
  }
  const grass = new THREE.BufferGeometry();
  grass.setAttribute('position', new THREE.Float32BufferAttribute(grassPositions, 3));
  grass.setAttribute('color', new THREE.Float32BufferAttribute(grassColors, 3));
  grass.computeVertexNormals();
  const grassMesh = mesh(grass, mat('#ffffff', { vertexColors: true, side: THREE.DoubleSide }));
  grassMesh.castShadow = false;
  const debris = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), mat('#786044'), 1700);
  for (let i = 0; i < 1700; i++) {
    dummy.position.set(between(-2.9, 2.9), 0.012, between(-2, 5.65));
    dummy.rotation.set(rand() * 3, rand() * 6, rand() * 3);
    dummy.scale.set(between(0.003, 0.012), 0.002, between(0.004, 0.021));
    dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix);
    debris.setColorAt(i, new THREE.Color().setHSL(between(0.09, 0.18), 0.3, between(0.27, 0.65)));
  }
  debris.receiveShadow = true;
  scene.add(debris);

  // Neutralize lighting, fog and instance tints before the runtime's clay override.
  if (new URLSearchParams(window.location.search).get('renderOverride') === 'gray-model') {
    scene.fog.color.set('#777777');
    scene.traverse(object => {
      if (object.isLight) object.color.set('#ffffff');
      if (object.isHemisphereLight) object.groundColor.set('#888888');
      if (object.isInstancedMesh) object.instanceColor = null;
    });
  }

  function setTime(time) {
    const pose = cameraPose(time);
    camera.position.set(...pose.position);
    camera.fov = pose.fov;
    camera.lookAt(...pose.target);
    camera.updateProjectionMatrix();
  }
  setTime(0);
  return { scene, camera, setTime };
}
