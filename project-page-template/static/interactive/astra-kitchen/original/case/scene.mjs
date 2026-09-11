import { furnishRoom } from './room.mjs';
import { cameraPose } from './trajectory.mjs';

export function buildScene(THREE, spec) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#bac8ce');
  const camera = new THREE.PerspectiveCamera(40, spec.target.width / spec.target.height, 0.04, 100);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let seed = 7403;
  const random = () => {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const mat = (color, roughness = 0.5, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  const yellow = mat('#d9aa00', 0.36);
  const brightYellow = mat('#e7b918', 0.39);
  const darkYellow = mat('#b7910b', 0.46);
  const black = mat('#111414', 0.59);
  const rubber = mat('#111311', 0.84);
  const grey = mat('#969c94', 0.39, 0.25);
  const silver = mat('#a8b0a7', 0.31, 0.48);
  const darkMetal = mat('#454943', 0.46, 0.3);
  const batch = new Map();
  let buildingLoader = false;
  const loaderMeshes = [];
  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 16);
  const sphere = new THREE.SphereGeometry(1, 12, 8);
  const dummy = new THREE.Object3D();
  function instance(geometry, material, position, scale, rotation = [0, 0, 0]) {
    const key = geometry.uuid + material.uuid;
    if (!batch.has(key)) batch.set(key, { geometry, material, matrices: [] });
    dummy.position.set(...position);
    dummy.scale.set(...scale);
    dummy.rotation.set(...rotation);
    dummy.updateMatrix();
    const matrix = dummy.matrix.clone();
    matrix.loader = buildingLoader;
    batch.get(key).matrices.push(matrix);
  }
  function box(x, y, z, w, h, d, material, rotation = [0, 0, 0]) {
    instance(cube, material, [x, y, z], [w, h, d], rotation);
  }
  function cyl(x, y, z, r, length, material, axis = 'y') {
    instance(cylinder, material, [x, y, z], [r, length, r],
      axis === 'z' ? [Math.PI / 2, 0, 0] : axis === 'x' ? [0, 0, Math.PI / 2] : [0, 0, 0]);
  }
  function mesh(geometry, material, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = object.receiveShadow = true;
    scene.add(object);
    if (buildingLoader) loaderMeshes.push(object);
    return object;
  }
  function rod(a, b, radius, material) {
    const start = V(...a), end = V(...b);
    const middle = start.clone().add(end).multiplyScalar(0.5);
    dummy.position.copy(middle);
    dummy.scale.set(radius, start.distanceTo(end), radius);
    dummy.quaternion.setFromUnitVectors(V(0, 1, 0), end.sub(start).normalize());
    dummy.updateMatrix();
    const key = cylinder.uuid + material.uuid;
    if (!batch.has(key)) batch.set(key, { geometry: cylinder, material, matrices: [] });
    const matrix = dummy.matrix.clone();
    matrix.loader = buildingLoader;
    batch.get(key).matrices.push(matrix);
  }
  function pipe(points, r, material) {
    return mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => V(...p))), 32, r, 8, false), material);
  }
  function stud(x, y, z, material = yellow) {
    cyl(x, y, z, 0.043, 0.035, material);
    cyl(x, y + 0.018, z, 0.025, 0.002, material);
  }
  function studdedBox(x, y, z, w, h, d, material = yellow) {
    box(x, y, z, w, h, d, material);
    const nx = Math.max(1, Math.round(w / 0.145)), nz = Math.max(1, Math.round(d / 0.145));
    for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++)
      stud(x + (i - (nx - 1) / 2) * 0.145, y + h / 2 + 0.018, z + (j - (nz - 1) / 2) * 0.145, material);
  }
  const beamCache = new Map();
  function beam(a, b, width = 0.19, thickness = 0.16, material = yellow, holes = true) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const key = [length.toFixed(4), width, thickness, holes].join(':');
    if (!beamCache.has(key)) {
      const shape = new THREE.Shape();
      const r = width / 2;
      shape.moveTo(-length / 2, -r);
      shape.lineTo(length / 2, -r);
      shape.absarc(length / 2, 0, r, -Math.PI / 2, Math.PI / 2, false);
      shape.lineTo(-length / 2, r);
      shape.absarc(-length / 2, 0, r, Math.PI / 2, Math.PI * 1.5, false);
      if (holes) {
        const n = Math.max(2, Math.round(length / 0.18) + 1);
        for (let i = 0; i < n; i++) {
          const hole = new THREE.Path();
          hole.absarc(-length / 2 + i * length / (n - 1), 0, width * 0.265, 0, Math.PI * 2, true);
          shape.holes.push(hole);
        }
      }
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: thickness, bevelEnabled: true, bevelSegments: 1, steps: 1,
        bevelSize: 0.008, bevelThickness: 0.006, curveSegments: 10,
      });
      geometry.translate(0, 0, -thickness / 2);
      beamCache.set(key, geometry);
    }
    const object = mesh(beamCache.get(key), material, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, a[2]);
    object.rotation.z = Math.atan2(b[1] - a[1], b[0] - a[0]);
    return object;
  }
  function pivot(x, y, z, radius = 0.075) {
    cyl(x, y, z, radius, 0.045, grey, 'z');
    cyl(x, y, z + Math.sign(z) * 0.025, radius * 0.54, 0.008, black, 'z');
    box(x, y, z + Math.sign(z) * 0.032, radius * 0.60, radius * 0.18, 0.009, darkMetal);
    box(x, y, z + Math.sign(z) * 0.034, radius * 0.18, radius * 0.60, 0.009, darkMetal);
  }
  function piston(a, b) {
    const av = V(...a), bv = V(...b), mid = av.clone().lerp(bv, 0.65);
    rod(a, mid.toArray(), 0.038, black);
    rod(mid.toArray(), b, 0.024, silver);
    for (const p of [a, b]) {
      cyl(p[0], p[1], p[2], 0.073, 0.08, silver, 'z');
      pivot(p[0], p[1], p[2] + Math.sign(p[2]) * 0.05, 0.055);
    }
  }
  function texture(width, height, paint) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  }
  const woodTexture = texture(1024, 512, (ctx, w, h) => {
    const data = ctx.createImageData(w, h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const warp = y + 3 * Math.sin(x * 0.008) + 1.3 * Math.sin(x * 0.032 + y * 0.05);
      const line = Math.sin(warp * 1.7) * Math.sin(warp * 0.17);
      const board = Math.floor(y / 84);
      const noise = (random() - 0.5) * 9;
      const grain = line * 5 + Math.sin(warp * 0.035 + 2 * Math.sin(x * 0.003)) * 13 + noise;
      const seam = y % 84 < 2 ? -12 : 0;
      const i = (y * w + x) * 4;
      data.data[i] = 153 + grain + seam + (board % 3) * 3;
      data.data[i + 1] = 133 + grain * 0.88 + seam + (board % 3) * 2;
      data.data[i + 2] = 117 + grain * 0.76 + seam;
      data.data[i + 3] = 255;
    }
    ctx.putImageData(data, 0, 0);
    for (let i = 0; i < 2; i++) {
      const x = random() * w, y = random() * h;
      ctx.strokeStyle = '#807067'; ctx.lineWidth = 0.7;
      for (let j = 1; j < 7; j++) {
        ctx.beginPath(); ctx.ellipse(x, y, 5 + j * 10, 0.6 + j * 0.9, 0, 0, Math.PI * 2); ctx.stroke();
      }
    }
  });
  woodTexture.repeat.set(1.7, 1.2);
  const wood = mat('#d2ccc4', 0.83);
  wood.map = woodTexture; wood.bumpMap = woodTexture; wood.bumpScale = 0.017;
  box(0, -0.18, 0.5, 20, 0.32, 14, wood);
  const furnitureWood = mat('#ae8a60', 0.63);
  for (const x of [-8.5, 8.5]) for (const z of [-5.8, 5.9])
    box(x, -3.36, z, 0.47, 6.08, 0.47, furnitureWood);
  for (const x of [-8.65, 8.65]) box(x, -0.65, 0.5, 0.25, 0.7, 12.1, furnitureWood);
  for (const z of [-5.9, 6]) box(0, -0.65, z, 17.5, 0.7, 0.25, furnitureWood);
  function wovenTexture(pink) {
    return texture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = pink ? '#bd8c7e' : '#81999f'; ctx.fillRect(0, 0, w, h);
      for (let y = -8; y < h + 8; y += 8) for (let x = -8; x < w + 8; x += 8) {
        const odd = ((x + y) / 8) % 2 === 0;
        ctx.strokeStyle = pink ? (odd ? '#dbb3a4' : '#c89a8c') : (odd ? '#c8b99a' : '#9ab7c3');
        ctx.lineWidth = pink ? 3.2 : 4.4;
        ctx.beginPath();
        ctx.moveTo(x - 1, y + 5);
        ctx.bezierCurveTo(x + 3, y - 1, x + 5, y - 1, x + 9, y + 5);
        ctx.stroke();
        ctx.strokeStyle = pink ? '#a86962' : '#526c78'; ctx.lineWidth = 0.8;
        ctx.beginPath(); ctx.moveTo(x + 2, y + 6); ctx.lineTo(x + 7, y + 6); ctx.stroke();
      }
      if (!pink) {
        for (const y of [18, 26, 226, 234]) {
          ctx.strokeStyle = '#324754'; ctx.lineWidth = 3;
          ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }
      }
    });
  }
  const blueCloth = mat('#dedacd', 0.95);
  blueCloth.map = wovenTexture(false); blueCloth.map.repeat.set(3.2, 2.0);
  blueCloth.bumpMap = blueCloth.map; blueCloth.bumpScale = 0.012;
  const pinkCloth = mat('#e4cbc4', 0.97);
  pinkCloth.map = wovenTexture(true); pinkCloth.map.repeat.set(7, 5);
  pinkCloth.bumpMap = pinkCloth.map; pinkCloth.bumpScale = 0.007;
  function cloth(corners, material) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(
      corners.flatMap(([x, z]) => [x, 0.022, z]), 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 1, 1], 2));
    geometry.setIndex([0, 1, 2, 0, 2, 3]);
    geometry.computeVertexNormals();
    material.side = THREE.DoubleSide;
    mesh(geometry, material);
  }
  cloth([[-6.7594, -1.3562], [-2.4723, 1.7268], [3.4333, -2.3644], [-0.8538, -5.4474]], blueCloth);
  cloth([[-2.0018, 1.9733], [1.54, 5.244], [6.9499, 2.0892], [3.4081, -1.1815]], pinkCloth);
  const pinkThread = mat('#d6a194', 0.98);
  for (let i = 0; i < 145; i++) {
    const x = -2.0018 + i * 5.4099 / 144, z = 1.9733 - i * 3.1548 / 144;
    rod([x, 0.025, z], [x - 0.035, 0.02, z - 0.060], 0.005, pinkThread);
  }
  const shadowTexture = texture(128, 128, (ctx, w, h) => {
    const grad = ctx.createRadialGradient(w / 2, h / 2, 4, w / 2, h / 2, w / 2);
    grad.addColorStop(0, 'rgba(16,15,9,0.65)');
    grad.addColorStop(0.55, 'rgba(16,15,9,0.35)');
    grad.addColorStop(1, 'rgba(16,15,9,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  });
  const shadow = new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false });
  const contact = mesh(new THREE.PlaneGeometry(4.6, 2.4), shadow, 0, 0.028, 0);
  contact.rotation.x = -Math.PI / 2; contact.castShadow = false;

  // Two continuous, separately modeled track belts; treads never animate.
  buildingLoader = true;
  const rear = -1.12, front = 0.66, wheelY = 0.49, radius = 0.45;
  const beltLength = 2 * (front - rear) + 2 * Math.PI * radius;
  const treadCount = 76;
  function beltPoint(s) {
    const run = front - rear;
    if (s < run) return [rear + s, wheelY + radius, 0];
    s -= run;
    if (s < Math.PI * radius) {
      const a = Math.PI / 2 - s / radius;
      return [front + radius * Math.cos(a), wheelY + radius * Math.sin(a), a - Math.PI / 2];
    }
    s -= Math.PI * radius;
    if (s < run) return [front - s, wheelY - radius, Math.PI];
    s -= run;
    const a = -Math.PI / 2 - s / radius;
    return [rear + radius * Math.cos(a), wheelY + radius * Math.sin(a), a - Math.PI / 2];
  }
  function gearGeometry(r, teeth, depth, holes) {
    const shape = new THREE.Shape();
    for (let i = 0; i <= teeth * 4; i++) {
      const a = i / (teeth * 4) * Math.PI * 2;
      const rr = r * (i % 4 < 2 ? 1 : 0.94);
      if (i === 0) shape.moveTo(Math.cos(a) * rr, Math.sin(a) * rr);
      else shape.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    for (let i = 0; i < holes; i++) {
      const a = i / holes * Math.PI * 2;
      const hole = new THREE.Path();
      hole.absarc(Math.cos(a) * r * 0.68, Math.sin(a) * r * 0.68, r * 0.155, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      const hole = new THREE.Path();
      hole.absarc(Math.cos(a) * r * 0.34, Math.sin(a) * r * 0.34, r * 0.092, 0, Math.PI * 2, true);
      shape.holes.push(hole);
    }
    const center = new THREE.Path();
    center.absarc(0, 0, r * 0.13, 0, Math.PI * 2, true); shape.holes.push(center);
    const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: 0.008,
      bevelThickness: 0.006, bevelSegments: 1, steps: 1, curveSegments: 9 });
    g.translate(0, 0, -depth / 2);
    return g;
  }
  const wheelGear = gearGeometry(0.405, 28, 0.062, 10);
  const innerGear = gearGeometry(0.20, 20, 0.10, 6);
  for (const side of [-1, 1]) {
    const z = side * 0.61;
    for (let i = 0; i < treadCount; i++) {
      const [x, y, angle] = beltPoint(i * beltLength / treadCount);
      box(x, y, z, 0.093, 0.078, 0.42, rubber, [0, 0, angle]);
      const dx = -Math.sin(angle) * 0.031, dy = Math.cos(angle) * 0.031;
      box(x + dx, y + dy, z, 0.020, 0.035, 0.39, black, [0, 0, angle]);
      for (const dz of [-0.145, 0.145])
        box(x + dx, y + dy, z + dz, 0.067, 0.030, 0.017, rubber, [0, 0, angle]);
    }
    for (const x of [rear, front]) {
      cyl(x, wheelY, z, 0.365, 0.30, darkMetal, 'z');
      mesh(wheelGear, grey, x, wheelY, z + side * 0.193);
      const ring = mesh(new THREE.TorusGeometry(0.301, 0.009, 6, 40), silver, x, wheelY, z + side * 0.234);
      ring.castShadow = false;
      pivot(x, wheelY, z + side * 0.25, 0.06);
    }
    beam([rear + 0.03, 0.52, side * 0.73], [front - 0.02, 0.52, side * 0.73], 0.185, 0.10, yellow);
    for (const x of [rear + 0.45, front - 0.45]) pivot(x, 0.52, side * 0.795, 0.063);
    beam([-1.35, 1.04, side * 0.53], [0.80, 1.04, side * 0.53], 0.25, 0.18, darkYellow);
  }
  box(-0.3, 0.82, 0, 2.4, 0.45, 1.02, darkYellow);
  box(-0.52, 1.1, 0, 1.95, 0.20, 1.15, yellow);
  for (const side of [-1, 1]) {
    studdedBox(-1.15, 1.29, side * 0.52, 0.43, 0.57, 0.24);
    studdedBox(-0.70, 1.30, side * 0.52, 0.74, 0.38, 0.22);
    beam([-1.3, 1.47, side * 0.658], [-0.38, 1.47, side * 0.658], 0.22, 0.065);
    box(-0.77, 1.102, side * 0.66, 1.10, 0.075, 0.20, brightYellow);
    studdedBox(0.4, 1.3, side * 0.43, 1.23, 0.24, 0.29);
    beam([-0.1, 1.45, side * 0.60], [1.01, 1.45, side * 0.60], 0.23, 0.12);
    for (const x of [0.35, 0.56, 0.78]) pivot(x, 1.45, side * 0.681, 0.041);
  }
  studdedBox(0.34, 1.48, 0, 1.10, 0.1, 0.72);
  box(0.55, 1.19, 0, 0.82, 0.4, 0.79, yellow);
  for (let i = 0; i < 5; i++) box(0.86, 1.20, (i - 2) * 0.105, 0.025, 0.27, 0.046, black, [0, 0, -0.13]);
  studdedBox(-1.27, 1.65, 0, 0.39, 0.25, 0.8);
  // Open cab with through-holed pillars and a studded rectangular roof frame.
  for (const side of [-1, 1]) {
    beam([-1.37, 1.39, side * 0.48], [-1.37, 2.51, side * 0.48], 0.19, 0.18);
    beam([-0.33, 1.39, side * 0.48], [-0.50, 2.51, side * 0.48], 0.19, 0.18);
    studdedBox(-0.94, 2.57, side * 0.48, 1.18, 0.14, 0.18);
    for (const p of [[-1.37, 1.40], [-1.37, 2.35], [-0.35, 1.48], [-0.49, 2.35]])
      pivot(p[0], p[1], side * 0.59, 0.056);
  }
  for (const x of [-1.44, -0.44]) studdedBox(x, 2.57, 0, 0.2, 0.14, 0.86);
  studdedBox(-0.94, 2.59, -0.10, 0.72, 0.12, 0.34);
  const red = mat('#af1714', 0.29);
  cyl(-0.95, 2.735, -0.02, 0.065, 0.19, red);
  cyl(-0.95, 2.842, -0.02, 0.047, 0.025, red);
  box(-0.87, 1.59, 0, 0.39, 0.14, 0.37, black);
  box(-1.01, 1.76, -0.04, 0.115, 0.36, 0.40, black, [0, 0, -0.18]);
  rod([-0.48, 1.58, 0.13], [-0.48, 1.97, 0.06], 0.033, black);
  const steering = mesh(new THREE.TorusGeometry(0.13, 0.017, 8, 20), black, -0.48, 1.96, 0.06);
  steering.rotation.x = Math.PI / 2 - 0.2;
  const handGear = mesh(innerGear, grey, -0.67, 1.74, -0.39);
  handGear.rotation.y = 0.1;
  piston([-1.43, 1.74, 0.63], [-0.43, 2.19, 0.63]);
  cyl(-0.12, 1.90, -0.06, 0.054, 0.61, black);
  cyl(-0.12, 2.22, -0.06, 0.065, 0.035, black);
  for (const side of [-1, 1]) {
    pipe([[-1.50, 1.51, side * 0.40], [-1.74, 1.25, side * 0.44],
      [-1.76, 0.94, side * 0.48], [-1.58, 0.90, side * 0.54]], 0.033, grey);
    rod([-1.65, 1.35, side * 0.35], [-1.90, 1.35, side * 0.35], 0.035, grey);
  }
  // Fixed paired lift arms and polished piston rods, with independently visible pivots.
  for (const side of [-1, 1]) {
    const z = side * 0.71;
    beam([0.61, 1.82, z], [1.61, 0.34, z], 0.235, 0.18);
    beam([1.14, 1.39, side * 0.48], [1.53, 0.82, side * 0.48], 0.20, 0.19);
    beam([1.11, 0.88, z], [1.68, 0.53, z], 0.205, 0.13);
    for (const p of [[0.61, 1.82], [0.90, 1.34], [1.20, 0.94], [1.61, 0.34]])
      pivot(p[0], p[1], z + side * 0.11, 0.075);
    piston([-0.22, 1.33, side * 0.77], [0.93, 1.26, side * 0.77]);
    piston([0.63, 1.83, side * 0.86], [1.10, 1.11, side * 0.86]);
    piston([1.15, 1.48, side * 0.43], [1.85, 0.73, side * 0.43]);
    rod([0.45, 0.89, side * 0.55], [1.15, 1.1, side * 0.57], 0.06, black);
  }
  studdedBox(0.62, 1.96, 0, 0.19, 0.1, 1.35);
  studdedBox(1.19, 1.43, 0, 0.31, 0.23, 0.8);
  // Scoop is a real concave shell, not a solid triangular wedge.
  const scoopProfile = [[1.87, 1.13], [1.66, 0.48], [1.76, 0.16], [2.48, 0.09]];
  for (let i = 0; i < scoopProfile.length - 1; i++) {
    const [ax, ay] = scoopProfile[i], [bx, by] = scoopProfile[i + 1];
    box((ax + bx) / 2, (ay + by) / 2, 0, Math.hypot(bx - ax, by - ay), 0.065, 1.50,
      i === 0 ? brightYellow : yellow, [0, 0, Math.atan2(by - ay, bx - ax)]);
  }
  const cheek = new THREE.Shape();
  cheek.moveTo(1.87, 1.13); cheek.lineTo(1.63, 0.51); cheek.lineTo(1.79, 0.16);
  cheek.lineTo(2.47, 0.10); cheek.lineTo(2.02, 0.85); cheek.closePath();
  const cheekGeometry = new THREE.ExtrudeGeometry(cheek, {
    depth: 0.075, bevelEnabled: true, bevelSize: 0.012, bevelThickness: 0.008, bevelSegments: 1,
  });
  for (const side of [-1, 1]) {
    mesh(cheekGeometry, brightYellow, 0, 0, side > 0 ? 0.73 : -0.805);
    for (const p of [[1.91, 0.66], [1.96, 0.40], [2.21, 0.26]])
      cyl(p[0], p[1], side * 0.819, 0.046, 0.021, yellow, 'z');
    pivot(1.73, 0.68, side * 0.69, 0.084);
  }
  for (let i = 0; i < 11; i++) {
    const z = (i - 5) * 0.142;
    box(2.47, 0.102, z, 0.31, 0.085, 0.103, brightYellow);
    box(2.36, 0.151, z, 0.26, 0.028, 0.033, yellow);
    for (let j = 0; j < 6; j++) {
      const yy = 0.97 - j * 0.074, xx = 1.87 - (1.13 - yy) * 0.323;
      cyl(xx + 0.024, yy, z, 0.035, 0.023, yellow, 'x');
    }
  }

  // Compress the upper cab without changing grounded wheels and bucket.
  const deformLoader = p => {
    if (p.y > 1.3) p.y = 1.3 + (p.y - 1.3) * 0.82;
    if (p.x < -0.28 && p.y > 1.50) {
      p.x = -0.28 + (p.x + 0.28) * 0.80;
      p.z *= 0.87;
    }
    return p;
  };
  for (const object of loaderMeshes) {
    object.updateMatrix();
    object.geometry = object.geometry.clone().applyMatrix4(object.matrix);
    const p = object.geometry.attributes.position, v = V(0, 0, 0);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i); deformLoader(v); p.setXYZ(i, v.x, v.y, v.z);
    }
    object.geometry.computeVertexNormals();
    object.position.set(0, 0, 0); object.rotation.set(0, 0, 0); object.scale.set(1, 1, 1);
  }
  for (const { matrices } of batch.values()) for (const matrix of matrices) {
    if (!matrix.loader) continue;
    const e = matrix.elements, center = V(e[12], e[13], e[14]);
    const high = center.y > 1.3, cab = center.x < -0.28 && center.y > 1.55;
    deformLoader(center);
    e[12] = center.x; e[13] = center.y; e[14] = center.z;
    if (high) for (const i of [1, 5, 9]) e[i] *= 0.82;
    if (cab) {
      for (const i of [0, 4, 8]) e[i] *= 0.8;
      for (const i of [2, 6, 10]) e[i] *= 0.87;
    }
  }
  buildingLoader = false;
  // Photographed dining area: chair behind cab, bags behind engine, plants before windows.
  const chairX = -4.02, chairZ = -7.55;
  for (const side of [-1, 1]) {
    box(chairX + side * 1.63, -2.36, chairZ - 1.1, 0.23, 8.08, 0.23, furnitureWood);
    box(chairX + side * 1.63, -4.64, chairZ + 1.0, 0.22, 3.52, 0.22, furnitureWood);
  }
  box(chairX, 1.35, chairZ - 1.1, 3.18, 0.42, 0.18, furnitureWood, [0, 0, -0.02]);
  box(chairX, -0.25, chairZ - 1.1, 3.19, 0.36, 0.18, furnitureWood);
  box(chairX, -2.78, chairZ, 3.28, 0.2, 2.55, furnitureWood);
  const offwhite = mat('#c7c7bd', 0.84);
  box(1.30, 0.96, -8.1, 3.0, 1.08, 0.16, offwhite, [0, -0.04, 0]);
  box(1.30, -2.73, -7.45, 3.0, 0.23, 2.8, offwhite);
  for (const x of [0.04, 2.56]) {
    for (const z of [-8.52, -6.4]) box(x, -4.62, z, 0.17, 3.56, 0.17, furnitureWood);
    box(x, -0.65, -8.18, 0.13, 4.02, 0.13, furnitureWood);
  }
  for (let i = 0; i < 22; i++) {
    const c = mat(i % 2 ? '#bfc1b7' : '#c3c5bb', 0.9);
    instance(sphere, c, [-0.02 + random() * 2.8, 0.47 + random() * 0.96, -8.005],
      [0.032 + random() * 0.055, 0.10, 0.0003], [0, 0, random()]);
  }
  function roundedBox(w, h, d, radius, material, x, y, z) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + radius, -h / 2);
    shape.lineTo(w / 2 - radius, -h / 2); shape.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + radius);
    shape.lineTo(w / 2, h / 2 - radius); shape.quadraticCurveTo(w / 2, h / 2, w / 2 - radius, h / 2);
    shape.lineTo(-w / 2 + radius, h / 2); shape.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - radius);
    shape.lineTo(-w / 2, -h / 2 + radius); shape.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + radius, -h / 2);
    return mesh(new THREE.ExtrudeGeometry(shape, { depth: d, bevelEnabled: true,
      bevelSize: radius * 0.36, bevelThickness: radius * 0.36, bevelSegments: 3, curveSegments: 8 }), material, x, y, z);
  }
  const redCloth = mat('#c9213b', 0.94);
  const redSeam = mat('#99182b', 0.95);
  roundedBox(3.8, 0.26, 1.25, 0.1, redCloth, 2.1, 0.27, -6.39);
  roundedBox(3.77, 0.16, 1.25, 0.06, redCloth, 2.12, 0.09, -6.38);
  pipe([[0.22, 0.16, -5.08], [2.1, 0.17, -5.07], [3.98, 0.17, -5.09]], 0.021, redSeam);
  for (let i = 0; i < 26; i++) rod([0.39 + i * 0.13, 0.409, -6.16],
    [0.46 + i * 0.13, 0.409, -5.51], 0.004, redSeam);
  const bagFabric = mat('#101516', 0.98);
  roundedBox(2.3, 0.28, 1.02, 0.12, bagFabric, -0.2, 0.29, -6.41);
  pipe([[-1.24, 0.42, -5.25], [-0.94, 0.91, -5.48], [-0.22, 0.86, -5.49],
    [0.73, 0.36, -5.12]], 0.082, bagFabric);
  const paper = mat('#aaaeb3', 0.85);
  box(-0.54, 0.56, -5.53, 0.62, 0.018, 0.58, paper, [0.31, -0.30, 0.12]);
  const rope = mat('#a08765', 0.91);
  pipe([[3.85, 0.20, -5.30], [4.02, 0.76, -5.55], [4.44, 0.64, -5.63],
    [4.51, 0.12, -5.31], [3.95, 0.15, -5.29]], 0.042, rope);
  const windowWood = mat('#684322', 0.63);
  const windowSky = new THREE.MeshStandardMaterial({ color: '#c5d8df', roughness: 0.86,
    emissive: '#708b98', emissiveIntensity: 0.36 });
  box(-5.0, 3.0, -11.1, 14, 8, 0.12, windowSky);
  for (const x of [-11.9, -7.3, 1.82]) box(x, 3, -10.6, 0.28, 8, 0.3, windowWood);
  box(-5.0, 0.93, -10.51, 13.8, 0.12, 0.32, offwhite);
  const outsideLeaf = mat('#728b7b', 0.9);
  for (let i = 0; i < 650; i++) instance(sphere, outsideLeaf,
    [-11.5 + random() * 13.1, 0.8 + random() * 6.8, -10.91],
    [0.035 + random() * 0.12, 0.045 + random() * 0.15, 0.018]);
  const plantStems = mat('#405a24', 0.95);
  const leafMaterials = ['#2a5218', '#396b21', '#477d26', '#537a2c', '#234b19', '#668a34'].map(c => mat(c, 0.78));
  const leafGeometry = new THREE.BufferGeometry();
  const leafVertices = [], leafIndices = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8, width = Math.sin(Math.PI * t) * (0.42 + Math.sin(t * Math.PI * 6) * 0.055);
    leafVertices.push(-width, t, Math.sin(t * Math.PI) * 0.10,
      0, t, Math.sin(t * Math.PI) * 0.19,
      width, t, Math.sin(t * Math.PI) * 0.10);
    if (i < 8) for (let j = 0; j < 2; j++) {
      const a = i * 3 + j;
      leafIndices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
    }
  }
  leafGeometry.setAttribute('position', new THREE.Float32BufferAttribute(leafVertices, 3));
  leafGeometry.setIndex(leafIndices); leafGeometry.computeVertexNormals();
  leafMaterials.forEach(m => { m.side = THREE.DoubleSide; m.emissive.copy(m.color); m.emissiveIntensity = 0.1; });
  for (let branch = 0; branch < 76; branch++) {
    const root = [-5.5 + (random() - 0.5) * 3.3, 0.6, -9.8];
    const tip = [-11.5 + random() * 13.0, 2.0 + random() * 4.0, -8.6 - random() * 1.3];
    rod(root, tip, 0.023 + random() * 0.02, plantStems);
    for (let i = 0; i < 23; i++) {
      const t = 0.2 + 0.8 * random();
      const p = root.map((v, k) => v + (tip[k] - v) * t);
      p[0] += (random() - 0.5) * 0.8;
      p[1] += (random() - 0.5) * 0.6;
      const scale = 0.26 + random() * 0.45;
      instance(leafGeometry, leafMaterials[Math.floor(random() * leafMaterials.length)], p,
        [scale, scale * 1.35, scale],
        [random() * 1.4 - 0.7, random() * Math.PI * 2, random() * Math.PI * 2]);
    }
  }
  const pot = mat('#ad8970', 0.9);
  cyl(-5.5, 0.65, -9.8, 0.62, 0.8, pot);
  furnishRoom(THREE, { scene, box, cyl, rod, pipe, mesh, instance, sphere,
    mat, texture, random, wood, furnitureWood, grey, silver, black, offwhite });
  const hemisphere = new THREE.HemisphereLight('#ecf4f4', '#665039', 1.7);
  scene.add(hemisphere);
  const sun = new THREE.DirectionalLight('#fff3df', 2.3);
  sun.position.set(-3.5, 7, -1); sun.target.position.set(0, 0.5, 0);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -6; sun.shadow.camera.right = 6;
  sun.shadow.camera.top = 6; sun.shadow.camera.bottom = -6;
  sun.shadow.normalBias = 0.025; sun.shadow.bias = -0.0002;
  sun.shadow.radius = 4;
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#d7eafa', 0.8);
  fill.position.set(1, 5, -5); scene.add(fill);
  for (const { geometry, material, matrices } of batch.values()) {
    const object = new THREE.InstancedMesh(geometry, material, matrices.length);
    matrices.forEach((matrix, i) => object.setMatrixAt(i, matrix));
    object.castShadow = object.receiveShadow = true;
    object.frustumCulled = false;
    scene.add(object);
  }
  function setTime(t) {
    const pose = cameraPose(t);
    camera.position.set(...pose.position);
    camera.fov = pose.fov;
    camera.lookAt(V(...pose.target));
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
  }
  setTime(0);
  return { scene, camera, setTime };
}
