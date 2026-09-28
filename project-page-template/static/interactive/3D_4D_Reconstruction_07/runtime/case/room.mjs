export function furnishRoom(THREE, h) {
  const { scene, box, cyl, rod, pipe, mesh, instance, sphere, mat, texture,
    random, wood, furnitureWood, grey, silver, black, offwhite } = h;
  const plaster = mat('#e6dfce', 0.93);
  const ceiling = mat('#eeece3', 0.95);
  const cream = mat('#d8d4bc', 0.63);
  const inset = mat('#c5c2aa', 0.67);
  const dark = mat('#333c37', 0.58);
  const stone = mat('#70746b', 0.75);
  const backsplash = mat('#e6e3d7', 0.47);
  const terracotta = mat('#98593b', 0.89);
  const leaves = mat('#3e6330', 0.81);
  const brass = mat('#a79255', 0.32, 0.61);
  const glass = mat('#24332e', 0.24, 0.25);
  const steel = mat('#a7aaa1', 0.34, 0.64);
  const warmLight = new THREE.MeshStandardMaterial({
    color: '#ffebbb', emissive: '#ffdaa0', emissiveIntensity: 0.5, roughness: 0.8,
  });
  stone.map = texture(128, 128, (ctx, w, hh) => {
    ctx.fillStyle = '#92978b'; ctx.fillRect(0, 0, w, hh);
    for (let i = 0; i < 1900; i++) {
      ctx.fillStyle = i % 2 ? '#a9afa2' : '#747c70';
      ctx.fillRect(random() * w, random() * hh, 0.5 + random(), 0.5 + random());
    }
  });
  stone.map.repeat.set(6, 3);
  const floorColors = ['#8f7b61', '#9d896f', '#a08c71', '#8b765e', '#aa9579'].map(c => mat(c, 0.82));
  floorColors.forEach(m => { m.map = wood.map; m.bumpMap = wood.bumpMap; m.bumpScale = 0.013; });
  box(0, -6.53, 2.35, 34.6, 0.26, 28.3, dark);
  for (let z = -11.5, row = 0; z < 16.3; z += 1.09, row++) {
    for (let x = -17.2; x < 17.2; x += 5.75) {
      const start = Math.max(-17.2, x + (row % 2 ? -2.875 : 0));
      const end = Math.min(17.2, x + 5.75 + (row % 2 ? -2.875 : 0));
      if (end > start) box((start + end) / 2, -6.38, z, end - start - 0.016, 0.08, 1.072,
        floorColors[(row + Math.floor(x + 18)) % floorColors.length]);
    }
    if (row % 2) box(15.8125, -6.38, z, 2.759, 0.08, 1.072, floorColors[row % 5]);
  }
  // A closed shell surrounds the complete orbit; openings have modeled reveals and rooms beyond.
  box(0, 14.6, 2.35, 34.7, 0.35, 28.6, ceiling);
  box(17.35, 4.1, 2.35, 0.35, 21.0, 28.6, plaster);
  box(0, 4.1, 16.5, 34.7, 21.0, 0.35, plaster);
  box(-14.65, 4.1, -11.55, 5.4, 21.0, 0.35, plaster);
  box(9.6, 4.1, -11.55, 15.5, 21.0, 0.35, plaster);
  box(-5.0, -3.65, -11.55, 14.0, 5.5, 0.35, plaster);
  box(-5.0, 10.8, -11.55, 14.0, 7.6, 0.35, plaster);
  const windowTrim = mat('#785432', 0.57);
  for (const y of [-0.91, 7.05]) box(-5.0, y, -10.63, 14.0, 0.25, 0.34, windowTrim);
  box(-5, -1.02, -10.78, 14.5, 0.15, 1.35, offwhite);
  for (const x of [-11.95, 1.96]) box(x, 3.07, -10.87, 0.18, 8.14, 1.17, offwhite);
  box(-5, 7.18, -10.91, 14.0, 0.20, 1.1, offwhite);
  // Left wall, doorway, and a short enclosed entrance corridor.
  box(-17.35, 4.1, -5.0, 0.35, 21.0, 13.1, plaster);
  box(-17.35, 4.1, 13.2, 0.35, 21.0, 6.3, plaster);
  box(-17.35, 10.4, 5.75, 0.35, 8.4, 8.5, plaster);
  for (const z of [1.43, 10.07]) box(-17.09, 0.0, z, 0.55, 12.8, 0.32, offwhite);
  box(-17.08, 6.4, 5.75, 0.55, 0.32, 8.95, offwhite);
  box(-20.75, -6.42, 5.75, 6.9, 0.17, 8.7, stone);
  box(-24.2, 0.1, 5.75, 0.25, 13.1, 8.7, plaster);
  for (const z of [1.42, 10.07]) box(-20.75, 0.1, z, 6.9, 13.1, 0.23, plaster);
  box(-20.75, 6.68, 5.75, 6.9, 0.18, 8.7, ceiling);
  const door = mat('#857055', 0.65);
  box(-23.96, -0.75, 6.25, 0.13, 11.2, 5.9, door);
  for (const y of [-3.4, 1.6]) box(-23.86, y, 6.25, 0.12, 3.9, 4.75, furnitureWood);
  cyl(-23.69, -0.75, 4.17, 0.12, 0.3, brass, 'x');
  for (const x of [-17.1, 17.1]) box(x, -6.05, -5.0, 0.13, 0.62, 12.9, offwhite);
  box(0, -6.05, 16.24, 34.2, 0.62, 0.13, offwhite);
  box(0, -6.05, -11.29, 34.2, 0.62, 0.13, offwhite);
  for (const x of [-17.06, 17.06]) box(x, 14.20, 2.3, 0.23, 0.40, 27.7, offwhite);
  for (const z of [-11.22, 16.18]) box(0, 14.2, z, 34.1, 0.40, 0.23, offwhite);

  // Cabinet modules face the room (-Z), with actual recessed framed doors, pulls, and plinths.
  function cabinet(x, z, w, { upper = false, drawers = false, sink = false } = {}) {
    const y = upper ? 5.55 : -2.70, height = upper ? 4.65 : 6.4, depth = upper ? 1.85 : 3.85;
    box(x, y, z, w, height, depth, cream);
    const front = z - depth / 2 - 0.035;
    if (!upper) box(x, -6.12, z - 0.25, w - 0.12, 0.52, depth - 0.6, dark);
    const count = drawers ? 3 : 2;
    for (let i = 0; i < count; i++) {
      const dw = drawers ? w - 0.16 : (w - 0.23) / 2;
      const dh = drawers ? (height - 0.24) / 3 : height - 0.14;
      const xx = drawers ? x : x + (i - 0.5) * (dw + 0.065);
      const yy = drawers ? y + (1 - i) * (dh + 0.035) : y;
      box(xx, yy, front, dw, dh, 0.13, inset);
      for (const dx of [-1, 1]) box(xx + dx * (dw / 2 - 0.13), yy, front - 0.09, 0.24, dh, 0.13, cream);
      for (const dy of [-1, 1]) box(xx, yy + dy * (dh / 2 - 0.13), front - 0.09, dw, 0.24, 0.13, cream);
      const hy = drawers ? yy + dh / 2 - 0.42 : yy + height / 2 - 0.64;
      rod([xx - 0.38, hy, front - 0.30], [xx + 0.38, hy, front - 0.30], 0.06, brass);
      for (const dx of [-0.38, 0.38]) rod([xx + dx, hy, front - 0.1], [xx + dx, hy, front - 0.3], 0.044, brass);
    }
    if (!upper && !sink) box(x, 0.67, z - 0.10, w + 0.12, 0.33, depth + 0.38, stone);
    if (sink) {
      for (const dx of [-1.8, 1.8]) box(x + dx, 0.67, z - 0.1, 0.65, 0.33, depth + 0.38, stone);
      for (const dz of [-1.61, 1.41]) box(x, 0.67, z + dz, 2.95, 0.33, 1.18, stone);
    }
  }
  const backZ = 14.08;
  for (const x of [-11.5, -7.3, 1.3, 5.5, 9.7])
    cabinet(x, backZ, 4.12, { drawers: x === 5.5, sink: x === -7.3 });
  for (const x of [-11.5, -7.3, 1.3, 5.5, 9.7]) cabinet(x, 15.15, 4.12, { upper: true });
  for (let x = -13.5; x < 12; x += 0.86)
    for (let y = 0.98; y < 3.2; y += 0.65) box(x, y, 16.23, 0.84, 0.63, 0.07, backsplash);
  // An oven and ceramic hob occupy the deliberate gap in the cabinet run.
  box(-3.02, -2.77, backZ, 4.1, 6.45, 3.85, steel);
  box(-3.02, -2.7, 12.10, 3.6, 4.5, 0.19, black);
  box(-3.02, -2.9, 11.99, 3.12, 3.05, 0.06, glass);
  box(-3.02, -0.60, 11.79, 3.2, 0.16, 0.14, silver);
  for (const x of [-4.25, -3.43, -2.61, -1.79]) cyl(x, 0.10, 12.06, 0.14, 0.12, dark, 'z');
  box(-3.02, 0.66, backZ, 4.18, 0.2, 3.93, black);
  for (const x of [-4.02, -2.07]) for (const z of [13.11, 14.95]) {
    cyl(x, 0.79, z, 0.64, 0.018, dark);
    const ring = mesh(new THREE.TorusGeometry(0.54, 0.014, 6, 40), silver, x, 0.808, z);
    ring.rotation.x = Math.PI / 2;
  }
  box(-3.02, 5.22, 14.24, 4.8, 0.5, 3.1, steel);
  box(-3.02, 7.58, 15.14, 1.9, 4.3, 1.4, steel);
  box(-3.02, 4.95, 13.90, 3.6, 0.06, 1.65, dark);
  for (const x of [-4.56, -1.49]) cyl(x, 4.92, 13.03, 0.12, 0.03, warmLight);
  // Sink is open above its inset bowl, rather than a solid slab with a painted rectangle.
  box(-7.28, 0.515, 13.88, 2.75, 0.05, 1.93, steel);
  for (const dx of [-1.43, 1.43]) box(-7.28 + dx, 0.72, 13.88, 0.13, 0.42, 2.14, steel);
  for (const dz of [-1.015, 1.015]) box(-7.28, 0.72, 13.88 + dz, 2.9, 0.42, 0.12, steel);
  cyl(-7.28, 0.556, 13.88, 0.15, 0.028, dark);
  cyl(-7.28, 0.574, 13.88, 0.10, 0.018, silver);
  pipe([[-7.28, 0.9, 15.23], [-7.28, 2.55, 15.23], [-7.28, 2.89, 14.88],
    [-7.28, 2.70, 14.36], [-7.28, 2.37, 14.36]], 0.087, steel);
  for (const x of [-8.1, -6.5]) cyl(x, 1.04, 15.16, 0.13, 0.31, steel);

  // Refrigerator: complete carcass, separate freezer, main door, gasket and handles.
  box(14.16, -0.03, 13.59, 4.1, 12.4, 4.6, steel);
  box(14.16, -0.03, 11.23, 3.92, 12.16, 0.14, dark);
  box(14.16, 4.08, 11.07, 3.77, 3.82, 0.22, steel);
  box(14.16, -2.03, 11.07, 3.77, 8.02, 0.22, steel);
  for (const y of [3.8, 0.2]) rod([12.76, y - 0.78, 10.83], [12.76, y + 0.78, 10.83], 0.068, silver);
  box(14.64, 3.75, 10.94, 0.93, 0.72, 0.027, cream);
  box(14.75, 3.8, 10.91, 0.13, 0.13, 0.018, terracotta);
  // Right-hand return counter faces -X, assembled in a rotated group of instance matrices.
  const islandWood = mat('#978269', 0.70);
  for (const z of [-6.65, -2.3, 2.05, 6.4]) {
    box(15.01, -2.8, z, 3.92, 6.1, 4.25, islandWood);
    box(14.85, 0.45, z, 4.32, 0.34, 4.35, stone);
    box(13.02, -2.8, z, 0.14, 5.92, 4.05, cream);
    for (const dz of [-1.02, 1.02]) {
      box(12.92, -2.8, z + dz, 0.12, 5.30, 1.52, inset);
      rod([12.72, -1.0, z + dz - 0.31], [12.72, -1.0, z + dz + 0.31], 0.05, brass);
    }
    box(15.13, -6.11, z, 3.55, 0.55, 4.15, dark);
  }
  // Microwave, coffee machine, kettle, crockery and food make the unseen room furnished.
  box(14.57, 1.82, -5.78, 2.8, 2.30, 3.3, steel);
  box(13.12, 1.79, -5.78, 0.14, 1.85, 2.76, black);
  box(13.03, 1.78, -6.12, 0.08, 1.43, 1.72, glass);
  cyl(12.99, 2.05, -4.70, 0.16, 0.08, grey, 'x');
  box(14.47, 1.92, 0.83, 2.3, 2.7, 1.85, black);
  box(13.26, 1.8, 0.83, 0.16, 1.92, 1.55, steel);
  box(12.98, 0.85, 0.83, 0.55, 0.12, 1.64, black);
  for (const z of [0.45, 1.15]) cyl(12.96, 1.18, z, 0.22, 0.48, offwhite);
  cyl(14.26, 1.3, 5.36, 0.71, 1.45, steel);
  cyl(14.26, 2.07, 5.36, 0.53, 0.15, black);
  pipe([[14.55, 1.05, 5.36], [15.18, 1.16, 5.36], [15.18, 2.15, 5.36],
    [14.58, 2.05, 5.36]], 0.1, black);
  rod([13.80, 1.45, 5.36], [13.26, 1.88, 5.36], 0.18, steel);
  box(4.92, 0.95, 14.11, 2.32, 0.16, 2.26, furnitureWood);
  for (let i = 0; i < 4; i++) cyl(4.82, 1.07 + i * 0.08, 14.0, 0.73, 0.06, offwhite);
  cyl(9.5, 1.45, 14.28, 0.53, 1.30, terracotta);
  for (let i = 0; i < 7; i++)
    rod([9.5, 1.44, 14.28], [9.5 + (random() - 0.5), 3.6, 14.28 + (random() - 0.5)], 0.064, furnitureWood);
  cyl(-11.45, 1.30, 14.6, 0.71, 0.90, terracotta);
  for (let i = 0; i < 18; i++) {
    const a = i * 2.4;
    rod([-11.45, 1.55, 14.6], [-11.45 + Math.cos(a) * 0.95, 2.35 + random(), 14.6 + Math.sin(a) * 0.75], 0.03, leaves);
    instance(sphere, leaves, [-11.45 + Math.cos(a) * 0.95, 2.50 + random(), 14.6 + Math.sin(a) * 0.75], [0.28, 0.55, 0.17]);
  }
  // Additional chairs retain seats and legs when the camera clears the tabletop.
  function chair(x, z, rotation) {
    const point = (xx, yy, zz) => [x + xx * Math.cos(rotation) + zz * Math.sin(rotation), yy,
      z - xx * Math.sin(rotation) + zz * Math.cos(rotation)];
    const part = (xx, yy, zz, w, hh, d, material = furnitureWood) =>
      box(...point(xx, yy, zz), w, hh, d, material, [0, rotation, 0]);
    for (const xx of [-1.37, 1.37]) for (const zz of [-1.3, 1.3])
      part(xx, -4.65, zz, 0.21, 3.48, 0.21);
    part(0, -2.76, 0, 3.15, 0.24, 3.12);
    for (const xx of [-1.37, 1.37]) part(xx, -0.2, -1.3, 0.21, 5.3, 0.21);
    for (const yy of [0.85, 2.10]) part(0, yy, -1.3, 2.76, 0.48, 0.16);
    part(0, -2.59, 0, 2.73, 0.11, 2.66, cream);
  }
  chair(4.7, -8.4, 0);
  chair(-5.8, 8.9, Math.PI);
  chair(4.8, 8.9, Math.PI);
  chair(-11.4, -1.7, Math.PI / 2);
  // Left sideboard, shelves, books, ceramic dishes and framed wall art.
  box(-15.38, -3.6, -4.55, 2.75, 5.3, 8.5, furnitureWood);
  box(-15.4, -0.82, -4.55, 3.15, 0.24, 8.7, wood);
  for (const z of [-7.45, -4.6, -1.73]) {
    box(-13.96, -3.55, z, 0.14, 4.7, 2.58, cream);
    cyl(-13.77, -3.3, z, 0.085, 0.11, brass, 'x');
  }
  for (const y of [3.65, 7.0]) box(-15.45, y, -4.7, 3.0, 0.17, 9.0, furnitureWood);
  const bookColors = ['#6b3b31', '#696f58', '#dbccb2', '#3d5159'].map(c => mat(c, 0.88));
  for (let i = 0; i < 13; i++)
    box(-15.4, 4.65, -8.45 + i * 0.37, 1.75, 1.85 + (i % 3) * 0.15, 0.29, bookColors[i % 4]);
  for (let i = 0; i < 5; i++) cyl(-15.4, 7.22 + i * 0.11, -6.2, 1.08, 0.1, cream);
  for (const z of [-3.1, -1.4]) cyl(-15.5, 7.95, z, 0.46, 1.65, terracotta);
  const frame = mat('#514635', 0.64);
  box(7.0, 6.2, -11.24, 5.4, 5.6, 0.14, frame);
  box(7.0, 6.2, -11.13, 4.95, 5.13, 0.07, cream);
  for (let i = 0; i < 9; i++) {
    const a = i * 2.4;
    rod([7, 4.2, -11.05], [7 + Math.sin(a) * 1.7, 6 + i * 0.2, -11.05], 0.04, leaves);
    instance(sphere, leaves, [7 + Math.sin(a) * 1.7, 6 + i * 0.2, -11.03], [0.38, 0.74, 0.026], [0, 0, -a]);
  }
  // Static ceiling fittings and radiator complete overhead and under-window occlusion.
  for (const x of [-5.0, 5.0]) {
    rod([x, 14.25, 0], [x, 10.9, 0], 0.035, dark);
    const shade = mesh(new THREE.ConeGeometry(1.4, 1.45, 28, 1, true), cream, x, 10.33, 0);
    shade.material.side = THREE.DoubleSide;
    cyl(x, 9.62, 0, 1.24, 0.035, warmLight);
  }
  box(-5.4, -3.75, -10.99, 7.4, 3.65, 0.35, offwhite);
  for (let x = -8.9; x < -1.7; x += 0.31) box(x, -3.75, -10.73, 0.17, 3.45, 0.32, cream);
  box(-5.5, 0.14, -9.75, 8.1, 0.20, 1.75, furnitureWood);
  for (const x of [-9.15, -1.85]) for (const z of [-10.4, -9.1])
    box(x, -3.16, z, 0.20, 6.42, 0.20, furnitureWood);
  const roomFill = new THREE.PointLight('#fff0d4', 140, 42, 2);
  roomFill.position.set(0, 11.6, 7); scene.add(roomFill);
}
