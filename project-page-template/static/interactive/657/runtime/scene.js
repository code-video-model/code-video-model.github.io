import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x10161b);
scene.fog = new THREE.FogExp2(0x192126, 0.012);

const camera = new THREE.PerspectiveCamera(64, WIDTH / HEIGHT, 0.05, 120);
const world = new THREE.Group();
scene.add(world);

const mats = {
  concrete: new THREE.MeshStandardMaterial({ color: 0x555653, roughness: 0.68, metalness: 0.08 }),
  concreteDark: new THREE.MeshStandardMaterial({ color: 0x35393a, roughness: 0.8, metalness: 0.04 }),
  steel: new THREE.MeshStandardMaterial({
    color: 0x283236,
    emissive: 0x081114,
    emissiveIntensity: 0.3,
    roughness: 0.3,
    metalness: 0.84,
  }),
  steelEdge: new THREE.MeshStandardMaterial({
    color: 0x526168,
    emissive: 0x0b1518,
    emissiveIntensity: 0.35,
    roughness: 0.27,
    metalness: 0.87,
  }),
  duct: new THREE.MeshStandardMaterial({ color: 0x687277, roughness: 0.32, metalness: 0.82 }),
  brick: new THREE.MeshStandardMaterial({ color: 0x6d3d2c, roughness: 0.91, metalness: 0.01 }),
  brickDark: new THREE.MeshStandardMaterial({ color: 0x432820, roughness: 0.94 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6d4325, roughness: 0.52, metalness: 0.03 }),
  woodLight: new THREE.MeshStandardMaterial({ color: 0xa97845, roughness: 0.49 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x914323, roughness: 0.46, metalness: 0.02 }),
  leatherDark: new THREE.MeshStandardMaterial({ color: 0x482a22, roughness: 0.53 }),
  fabric: new THREE.MeshStandardMaterial({ color: 0x92948f, roughness: 0.93 }),
  fabricDark: new THREE.MeshStandardMaterial({ color: 0x343f43, roughness: 0.9 }),
  rug: new THREE.MeshStandardMaterial({ color: 0x9a6b42, roughness: 0.95 }),
  rugBlue: new THREE.MeshStandardMaterial({ color: 0x31545d, roughness: 0.96 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0xd3cec0, roughness: 0.34 }),
  green: new THREE.MeshStandardMaterial({ color: 0x3f6844, roughness: 0.82 }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x7299a5,
    roughness: 0.18,
    metalness: 0.02,
    transparent: true,
    opacity: 0.34,
    transmission: 0.22,
    side: THREE.DoubleSide,
  }),
  roof: new THREE.MeshStandardMaterial({
    color: 0x3e4a4e,
    emissive: 0x10191c,
    emissiveIntensity: 0.48,
    roughness: 0.7,
    metalness: 0.35,
    side: THREE.DoubleSide,
  }),
  warmGlow: new THREE.MeshStandardMaterial({
    color: 0xffc57a,
    emissive: 0xff8b31,
    emissiveIntensity: 4.1,
    roughness: 0.25,
  }),
  coolGlow: new THREE.MeshStandardMaterial({
    color: 0xaacbd5,
    emissive: 0x50879a,
    emissiveIntensity: 1.15,
    roughness: 0.2,
    side: THREE.DoubleSide,
  }),
};

function box(name, size, position, material, options = {}) { window.__bfTrace?.add(92);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  world.add(mesh);
  return mesh;
}

function cylinder(name, radiusTop, radiusBottom, height, position, material, options = {}) { window.__bfTrace?.add(103);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, options.segments ?? 18),
    material,
  );
  mesh.name = name;
  mesh.position.set(...position);
  if (options.rotation) mesh.rotation.set(...options.rotation);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? true;
  world.add(mesh);
  return mesh;
}

function beamBetween(name, start, end, thickness, material = mats.steel) { window.__bfTrace?.add(117);
  const a = new THREE.Vector3(...start);
  const b = new THREE.Vector3(...end);
  const direction = b.clone().sub(a);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
  mesh.name = name;
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(direction.length(), thickness, thickness);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  world.add(mesh);
  return mesh;
}

function addIBeam(name, position, length, orientation = 'x', scale = 1) { window.__bfTrace?.add(132);
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  const flangeSize = orientation === 'x'
    ? [length, 0.12 * scale, 0.52 * scale]
    : [0.52 * scale, 0.12 * scale, length];
  const webSize = orientation === 'x'
    ? [length, 0.52 * scale, 0.12 * scale]
    : [0.12 * scale, 0.52 * scale, length];
  for (const y of [-0.26 * scale, 0.26 * scale]) {
    const flange = new THREE.Mesh(new THREE.BoxGeometry(...flangeSize), mats.steel);
    flange.position.y = y;
    flange.castShadow = true;
    flange.receiveShadow = true;
    group.add(flange);
  }
  const web = new THREE.Mesh(new THREE.BoxGeometry(...webSize), mats.steel);
  web.castShadow = true;
  web.receiveShadow = true;
  group.add(web);
  world.add(group);
  return group;
}

function addWindowWall() { window.__bfTrace?.add(157);
  box('left brick base', [0.5, 3.0, 46], [-10.55, 1.5, 0], mats.brick);
  box('right brick base', [0.5, 3.0, 46], [10.55, 1.5, 0], mats.brick);

  const pierZ = [-21, -15, -9, -3, 3, 9, 15, 21];
  for (const x of [-10.55, 10.55]) {
    for (const z of pierZ) {
      box(`brick pier ${x} ${z}`, [0.72, 6.5, 0.72], [x, 6.15, z], mats.brickDark);
    }
    for (let i = 0; i < pierZ.length - 1; i += 1) {
      const z = (pierZ[i] + pierZ[i + 1]) * 0.5;
      box(`factory window ${x} ${i}`, [0.08, 4.75, 5.05], [x * 0.994, 5.65, z], mats.glass, {
        castShadow: false,
        receiveShadow: false,
      });
      box(`window rail ${x} ${i}`, [0.13, 0.11, 5.05], [x * 0.99, 5.65, z], mats.steelEdge);
      for (const dz of [-1.68, 0, 1.68]) {
        box(`window mullion ${x} ${i} ${dz}`, [0.13, 4.75, 0.09], [x * 0.99, 5.65, z + dz], mats.steel);
      }
    }
    box(`wall cap ${x}`, [0.65, 0.45, 46], [x, 8.3, 0], mats.brickDark);
  }

  box('back brick base', [21.5, 3.0, 0.5], [0, 1.5, -22.5], mats.brick);
  box('back upper glass', [19.2, 5.1, 0.08], [0, 5.65, -22.25], mats.glass, {
    castShadow: false,
    receiveShadow: false,
  });
  for (const x of [-10.3, -6.9, -3.45, 0, 3.45, 6.9, 10.3]) {
    box(`back mullion ${x}`, [0.18, 5.2, 0.22], [x, 5.65, -22.15], mats.steel);
  }
  box('back transom', [20.2, 0.16, 0.22], [0, 5.55, -22.14], mats.steel);

  for (const x of [-10.24, 10.24]) {
    for (let row = 0; row < 6; row += 1) {
      for (let i = 0; i < 15; i += 1) {
        if ((i + row * 3) % 4 === 0) continue;
        const z = -20.5 + i * 2.9 + (row % 2) * 1.35;
        box(`raised brick ${x} ${row} ${i}`, [0.08, 0.22, 1.0], [x, 0.3 + row * 0.45, z], mats.brickDark, {
          castShadow: false,
        });
      }
    }
  }
}

function addRoofAndTrusses() { window.__bfTrace?.add(203);
  box('left roof plane', [11.25, 0.16, 46], [-5.0, 11.85, 0], mats.roof, {
    rotation: [0, 0, Math.atan2(5.1, 10)],
  });
  box('right roof plane', [11.25, 0.16, 46], [5.0, 11.85, 0], mats.roof, {
    rotation: [0, 0, -Math.atan2(5.1, 10)],
  });

  for (const x of [-7.4, -3.7, 0, 3.7, 7.4]) {
    const y = 14.4 - Math.abs(x) * 0.51;
    beamBetween(`roof purlin ${x}`, [x, y, -22], [x, y, 22], 0.18, mats.steelEdge);
  }

  for (const z of [-20, -14, -8, -2, 4, 10, 16, 22]) {
    addIBeam(`truss tie ${z}`, [0, 9.25, z], 20.5, 'x', 1.15);
    beamBetween(`left rafter ${z}`, [-10.2, 9.25, z], [0, 14.45, z], 0.28);
    beamBetween(`right rafter ${z}`, [0, 14.45, z], [10.2, 9.25, z], 0.28);

    for (const x of [-7.5, -5, -2.5, 0, 2.5, 5, 7.5]) {
      const roofY = 14.45 - Math.abs(x) * 0.51;
      beamBetween(`truss vertical ${z} ${x}`, [x, 9.32, z], [x, roofY, z], 0.11, mats.steelEdge);
    }
    const diagonals = [
      [-10, 9.35, -7.5, 10.62],
      [-7.5, 10.62, -5, 9.35],
      [-5, 9.35, -2.5, 13.18],
      [-2.5, 13.18, 0, 9.35],
      [0, 9.35, 2.5, 13.18],
      [2.5, 13.18, 5, 9.35],
      [5, 9.35, 7.5, 10.62],
      [7.5, 10.62, 10, 9.35],
    ];
    for (const [x1, y1, x2, y2] of diagonals) {
      beamBetween(`truss diagonal ${z} ${x1}`, [x1, y1, z], [x2, y2, z], 0.1, mats.steelEdge);
    }
  }

  for (const z of [-17, -5, 7, 19]) {
    for (const x of [-5.2, 5.2]) {
      const y = 14.25 - Math.abs(x) * 0.51;
      box(`skylight ${x} ${z}`, [3.1, 0.035, 4.4], [x, y - 0.1, z], mats.coolGlow, {
        rotation: [0, 0, x < 0 ? Math.atan2(5.1, 10) : -Math.atan2(5.1, 10)],
        castShadow: false,
        receiveShadow: false,
      });
    }
  }
}

function addIndustrialDuct() { window.__bfTrace?.add(252);
  const duct = cylinder('long ventilation duct', 0.48, 0.48, 29, [-7.75, 7.75, -3.5], mats.duct, {
    segments: 28,
    rotation: [Math.PI * 0.5, 0, 0],
  });
  duct.castShadow = true;
  for (const z of [-16.5, -10, -3.5, 3, 9.5]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 8, 28), mats.steel);
    ring.name = `duct collar ${z}`;
    ring.position.set(-7.75, 7.75, z);
    world.add(ring);
  }
  cylinder('vertical duct drop', 0.4, 0.4, 4.5, [-7.75, 5.7, 10.8], mats.duct, { segments: 28 });
  const elbow = new THREE.Mesh(
    new THREE.TorusGeometry(0.82, 0.4, 16, 28, Math.PI * 0.5),
    mats.duct,
  );
  elbow.name = 'duct elbow';
  elbow.position.set(-7.75, 7.75, 10.8);
  elbow.rotation.z = Math.PI * 0.5;
  world.add(elbow);
}

const pendantGroups = [];
function addPendant(x, z, cableTop, lampY, size = 1) { window.__bfTrace?.add(276);
  const group = new THREE.Group();
  group.name = `pendant ${x} ${z}`;
  group.position.set(x, 0, z);
  const cableLength = cableTop - lampY;
  const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, cableLength, 8), mats.steel);
  cable.position.y = lampY + cableLength * 0.5;
  group.add(cable);
  const shade = new THREE.Mesh(
    new THREE.CylinderGeometry(0.15 * size, 0.48 * size, 0.34 * size, 24, 1, true),
    mats.steelEdge,
  );
  shade.position.y = lampY;
  group.add(shade);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.13 * size, 16, 12), mats.warmGlow);
  bulb.position.y = lampY - 0.17 * size;
  group.add(bulb);
  const light = new THREE.PointLight(0xffad67, 6.5, 8.5, 1.7);
  light.position.y = lampY - 0.1;
  group.add(light);
  world.add(group);
  pendantGroups.push(group);
}

function addLighting() { window.__bfTrace?.add(300);
  const hemi = new THREE.HemisphereLight(0xb8d9e7, 0x392a21, 1.95);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xc8e7ff, 3.8);
  sun.position.set(-7, 15, 11);
  sun.target.position.set(1, 0, -6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -16;
  sun.shadow.camera.right = 16;
  sun.shadow.camera.top = 22;
  sun.shadow.camera.bottom = -8;
  sun.shadow.camera.near = 2;
  sun.shadow.camera.far = 50;
  sun.shadow.bias = -0.0007;
  scene.add(sun, sun.target);

  const backGlow = new THREE.PointLight(0x8cc6e8, 10, 30, 1.6);
  backGlow.position.set(0, 8, -20);
  scene.add(backGlow);

  const warmFill = new THREE.PointLight(0xff9b55, 8, 23, 1.8);
  warmFill.position.set(5, 5, 9);
  scene.add(warmFill);

  const roofFill = new THREE.PointLight(0x8cb5c7, 13, 30, 1.45);
  roofFill.position.set(-1.5, 7.4, -1);
  scene.add(roofFill);

  for (const [x, z, top, y, s] of [
    [-3.6, 14, 12.5, 6.3, 1.1],
    [3.9, 9, 12.4, 6.7, 1.0],
    [-1.2, 3, 13.8, 7.2, 1.2],
    [4.8, -4, 11.9, 6.2, 1.0],
    [-4.4, -9, 12.1, 6.5, 1.1],
    [1.1, -15, 13.9, 7.3, 1.25],
  ]) addPendant(x, z, top, y, s);
}

function addFloor() { window.__bfTrace?.add(340);
  box('polished concrete floor', [21, 0.28, 46], [0, -0.16, 0], mats.concrete, {
    castShadow: false,
  });
  for (let x = -9; x <= 9; x += 3) {
    box(`floor joint x ${x}`, [0.025, 0.008, 45], [x, -0.008, 0], mats.concreteDark, {
      castShadow: false,
      receiveShadow: false,
    });
  }
  for (let z = -21; z <= 21; z += 3) {
    box(`floor joint z ${z}`, [20.5, 0.008, 0.025], [0, -0.008, z], mats.concreteDark, {
      castShadow: false,
      receiveShadow: false,
    });
  }
}

function addSofa(x, z, rotation = 0, material = mats.leather, elevation = 0) { window.__bfTrace?.add(358);
  const group = new THREE.Group();
  group.name = `sofa ${x} ${z}`;
  group.position.set(x, elevation, z);
  group.rotation.y = rotation;

  const base = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.52, 1.42), material);
  base.position.y = 0.48;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  for (const px of [-1.15, 0, 1.15]) {
    const cushion = new THREE.Mesh(new THREE.BoxGeometry(1.04, 0.3, 1.18), material);
    cushion.position.set(px, 0.86, 0.08);
    cushion.castShadow = true;
    group.add(cushion);
  }
  const back = new THREE.Mesh(new THREE.BoxGeometry(3.55, 1.22, 0.34), material);
  back.position.set(0, 1.27, -0.58);
  back.rotation.x = -0.09;
  back.castShadow = true;
  group.add(back);
  for (const px of [-1.73, 1.73]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.82, 1.46), material);
    arm.position.set(px, 0.88, 0);
    arm.castShadow = true;
    group.add(arm);
  }
  world.add(group);
  return group;
}

function addRoundTable(x, z, radius = 0.75, height = 0.48, elevation = 0) { window.__bfTrace?.add(391);
  cylinder(`round tabletop ${x} ${z}`, radius, radius, 0.13, [x, elevation + height, z], mats.woodLight, { segments: 32 });
  cylinder(`round pedestal ${x} ${z}`, 0.12, 0.18, height, [x, elevation + height * 0.5, z], mats.steel);
}

function addDiningCluster() { window.__bfTrace?.add(396);
  box('dining rug', [6.2, 0.05, 4.8], [-4.65, 0.045, 7.1], mats.rugBlue, {
    castShadow: false,
  });
  box('dining tabletop', [4.3, 0.18, 1.75], [-4.65, 1.04, 7.1], mats.woodLight);
  for (const dx of [-1.75, 1.75]) {
    for (const dz of [-0.58, 0.58]) {
      box(`dining leg ${dx} ${dz}`, [0.14, 1.0, 0.14], [-4.65 + dx, 0.5, 7.1 + dz], mats.steel);
    }
  }
  for (const dx of [-1.45, 0, 1.45]) {
    for (const side of [-1, 1]) {
      const z = 7.1 + side * 1.28;
      box(`chair seat ${dx} ${side}`, [0.82, 0.13, 0.76], [-4.65 + dx, 0.64, z], mats.leatherDark);
      box(`chair back ${dx} ${side}`, [0.82, 0.92, 0.13], [-4.65 + dx, 1.07, z + side * 0.33], mats.leatherDark, {
        rotation: [side * -0.08, 0, 0],
      });
      for (const lx of [-0.31, 0.31]) {
        for (const lz of [-0.25, 0.25]) {
          box(`chair leg ${dx} ${side} ${lx} ${lz}`, [0.07, 0.62, 0.07], [-4.65 + dx + lx, 0.31, z + lz], mats.steel);
        }
      }
    }
  }
  for (const dx of [-0.7, 0, 0.7]) {
    cylinder(`table ceramic ${dx}`, 0.1, 0.13, 0.23, [-4.65 + dx, 1.24, 7.1], mats.ceramic, { segments: 16 });
  }
}

function addLoungeCluster() { window.__bfTrace?.add(425);
  box('front lounge rug', [6.3, 0.055, 5.4], [3.65, 0.05, 10.25], mats.rug);
  addSofa(4.25, 10.6, -0.05, mats.leather);
  addRoundTable(1.9, 10.0, 0.82, 0.5);
  cylinder('coffee vase', 0.09, 0.14, 0.36, [1.9, 0.74, 10], mats.ceramic, { segments: 20 });
  addSofa(-3.55, -2.6, Math.PI * 0.53, mats.fabricDark);
  box('mid lounge rug', [5.3, 0.05, 5.8], [-3.1, 0.045, -2.8], mats.rugBlue, {
    castShadow: false,
  });
  addRoundTable(-2.25, -2.8, 0.72, 0.46);

  for (const [x, z, r] of [[-5.25, -0.9, -0.55], [-5.0, -4.9, 0.35]]) {
    const chair = addSofa(x, z, r, mats.fabric);
    chair.scale.set(0.56, 0.8, 0.78);
  }
}

function addKitchenAndShelves() { window.__bfTrace?.add(442);
  box('kitchen island body', [4.8, 0.88, 1.55], [4.85, 0.44, -3.2], mats.concreteDark);
  box('kitchen island top', [5.15, 0.13, 1.82], [4.85, 0.95, -3.2], mats.woodLight);
  for (const x of [3.5, 4.85, 6.2]) {
    cylinder(`island stool stem ${x}`, 0.07, 0.1, 0.7, [x, 0.35, -1.9], mats.steel);
    cylinder(`island stool seat ${x}`, 0.32, 0.32, 0.12, [x, 0.75, -1.9], mats.leatherDark, { segments: 24 });
  }
  box('backsplash cabinet', [4.7, 2.5, 0.5], [5.0, 1.25, -6.5], mats.wood);
  for (const x of [3.45, 5, 6.55]) {
    box(`cabinet reveal ${x}`, [0.035, 2.3, 0.53], [x, 1.25, -6.23], mats.steel);
  }

  const shelfX = -8.35;
  for (const z of [-9.5, -13.4]) {
    for (const y of [0.2, 1.45, 2.7, 3.95]) {
      box(`shelf plank ${z} ${y}`, [3.4, 0.12, 0.72], [shelfX, y, z], mats.wood);
    }
    for (const dx of [-1.55, 1.55]) {
      box(`shelf upright ${z} ${dx}`, [0.12, 4.1, 0.72], [shelfX + dx, 2.0, z], mats.steel);
    }
    for (let level = 0; level < 3; level += 1) {
      for (let item = 0; item < 5; item += 1) {
        const color = (level + item) % 3 === 0 ? mats.leather : ((level + item) % 3 === 1 ? mats.fabric : mats.woodLight);
        box(`shelf object ${z} ${level} ${item}`, [0.25 + item * 0.035, 0.48 + level * 0.08, 0.42], [
          shelfX - 1.2 + item * 0.58,
          0.51 + level * 1.25,
          z,
        ], color);
      }
    }
  }
}

function addPlant(x, z, scale = 1) { window.__bfTrace?.add(475);
  cylinder(`plant pot ${x} ${z}`, 0.34 * scale, 0.28 * scale, 0.62 * scale, [x, 0.31 * scale, z], mats.concreteDark, {
    segments: 20,
  });
  cylinder(`plant stem ${x} ${z}`, 0.035 * scale, 0.055 * scale, 1.5 * scale, [x, 1.12 * scale, z], mats.wood, {
    segments: 9,
  });
  for (let i = 0; i < 9; i += 1) {
    const angle = i * 2.399;
    const radius = (0.25 + (i % 3) * 0.12) * scale;
    const leaf = new THREE.Mesh(new THREE.SphereGeometry(0.27 * scale, 12, 8), mats.green);
    leaf.name = `plant leaf ${x} ${z} ${i}`;
    leaf.scale.set(1.6, 0.55, 0.72);
    leaf.position.set(
      x + Math.cos(angle) * radius,
      1.15 * scale + (i % 4) * 0.29 * scale,
      z + Math.sin(angle) * radius,
    );
    leaf.rotation.set(0.2 * Math.sin(angle), angle, 0.35 * Math.cos(angle));
    leaf.castShadow = true;
    world.add(leaf);
  }
}

function addMezzanine() { window.__bfTrace?.add(499);
  box('mezzanine platform', [9.0, 0.42, 7.7], [5.75, 4.25, -17.8], mats.concreteDark);
  for (const x of [1.6, 5.7, 9.8]) {
    for (const z of [-14.3, -21.3]) {
      cylinder(`mezzanine column ${x} ${z}`, 0.17, 0.17, 4.25, [x, 2.12, z], mats.steel, { segments: 12 });
    }
  }
  for (const z of [-13.95, -21.65]) {
    beamBetween(`mezzanine rail top ${z}`, [1.25, 5.45, z], [10.25, 5.45, z], 0.09, mats.steel);
    beamBetween(`mezzanine rail mid ${z}`, [1.25, 4.88, z], [10.25, 4.88, z], 0.07, mats.steelEdge);
    for (let x = 1.3; x <= 10.2; x += 1.1) {
      beamBetween(`mezzanine baluster ${z} ${x}`, [x, 4.44, z], [x, 5.47, z], 0.055, mats.steelEdge);
    }
  }

  const stairStartZ = -9.0;
  for (let i = 0; i < 12; i += 1) {
    const y = 0.18 + i * 0.34;
    const z = stairStartZ - i * 0.43;
    box(`stair tread ${i}`, [2.05, 0.14, 0.58], [8.5, y, z], mats.woodLight);
  }
  beamBetween('left stair stringer', [7.55, 0.15, -8.8], [7.55, 4.2, -14.0], 0.13, mats.steel);
  beamBetween('right stair stringer', [9.45, 0.15, -8.8], [9.45, 4.2, -14.0], 0.13, mats.steel);
  beamBetween('stair handrail', [7.48, 1.2, -8.7], [7.48, 5.25, -13.9], 0.08, mats.steelEdge);
  for (let i = 0; i < 7; i += 1) {
    const k = i / 6;
    beamBetween(
      `stair baluster ${i}`,
      [7.48, 0.2 + k * 4.0, -8.8 - k * 5.1],
      [7.48, 1.2 + k * 4.0, -8.8 - k * 5.1],
      0.045,
      mats.steelEdge,
    );
  }

  addSofa(5.7, -19.0, Math.PI, mats.fabric, 4.46);
  addRoundTable(3.5, -18.5, 0.55, 0.48, 4.46);
}

function addEntranceBeam() { window.__bfTrace?.add(538);
  addIBeam('low entrance beam', [0, 3.1, 17.4], 12.4, 'x', 1.5);
  for (const x of [-6.1, 6.1]) {
    addIBeam(`entrance post ${x}`, [x, 1.55, 17.4], 3.1, 'z', 1.25).rotation.x = Math.PI * 0.5;
    box(`entrance brick pier ${x}`, [1.25, 3.0, 1.2], [x, 1.5, 17.4], mats.brickDark);
  }
  box('entry lintel shadow', [20.2, 0.28, 1.4], [0, 4.15, 21.9], mats.concreteDark);
}

function addCeilingFans() { window.__bfTrace?.add(547);
  for (const z of [-2.2, -12.2]) {
    const group = new THREE.Group();
    group.name = `ceiling fan ${z}`;
    group.position.set(0, 10.35, z);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.0, 12), mats.steel);
    stem.position.y = 0.5;
    group.add(stem);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.2, 18), mats.steelEdge);
    hub.rotation.x = Math.PI * 0.5;
    group.add(hub);
    const rotor = new THREE.Group();
    rotor.name = 'rotor';
    for (let i = 0; i < 4; i += 1) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.07, 0.32), mats.wood);
      blade.position.x = 1.2;
      const arm = new THREE.Group();
      arm.rotation.y = i * Math.PI * 0.5;
      arm.add(blade);
      rotor.add(arm);
    }
    group.add(rotor);
    world.add(group);
  }
}

function addAtmosphere() { window.__bfTrace?.add(573);
  const count = 520;
  const positions = new Float32Array(count * 3);
  let seed = 657;
  const random = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  for (let i = 0; i < count; i += 1) {
    positions[i * 3] = (random() - 0.5) * 20;
    positions[i * 3 + 1] = random() * 12.5 + 0.3;
    positions[i * 3 + 2] = (random() - 0.5) * 43;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffdfb0,
    size: 0.028,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const dust = new THREE.Points(geometry, material);
  dust.name = 'sunlit dust';
  world.add(dust);
}

addFloor();
addWindowWall();
addRoofAndTrusses();
addIndustrialDuct();
addLighting();
addEntranceBeam();
addDiningCluster();
addLoungeCluster();
addKitchenAndShelves();
addMezzanine();
addCeilingFans();
addAtmosphere();
for (const [x, z, scale] of [
  [8.5, 7.6, 1.2],
  [-8.1, 3.2, 1.05],
  [7.6, -7.1, 1.25],
  [-6.5, -16.4, 1.3],
]) addPlant(x, z, scale);

const cameraPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.15, 1.62, 23.8),
  new THREE.Vector3(-0.15, 1.66, 18.9),
  new THREE.Vector3(-0.72, 1.75, 11.8),
  new THREE.Vector3(0.25, 1.95, 4.7),
  new THREE.Vector3(1.12, 2.75, -1.5),
  new THREE.Vector3(1.3, 4.45, -6.5),
  new THREE.Vector3(0.7, 6.45, -9.7),
], false, 'catmullrom', 0.38);

const targetPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.05, 2.0, 13.6),
  new THREE.Vector3(-0.5, 2.0, 8.7),
  new THREE.Vector3(0.1, 2.15, 1.8),
  new THREE.Vector3(0.75, 3.0, -5.2),
  new THREE.Vector3(0.1, 5.7, -11.8),
  new THREE.Vector3(0.0, 8.4, -16.4),
  new THREE.Vector3(0.0, 9.8, -18.5),
], false, 'catmullrom', 0.4);

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (value) => {
  const x = clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
};

let currentTime = 0;
let paused = true;

function updateAtTime(seconds) { window.__bfTrace?.add(651);
  currentTime = clamp(Number.isFinite(seconds) ? seconds : 0, 0, DURATION);
  const linear = currentTime / DURATION;
  const travel = linear * 0.72 + smoothstep(linear) * 0.28;
  cameraPath.getPointAt(travel, camera.position);
  const target = targetPath.getPointAt(travel);
  camera.fov = THREE.MathUtils.lerp(66, 60, smoothstep((linear - 0.55) / 0.45));
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  camera.updateMatrixWorld(true);

  for (let i = 0; i < pendantGroups.length; i += 1) {
    pendantGroups[i].rotation.z = Math.sin(currentTime * 0.65 + i * 1.7) * 0.008;
    pendantGroups[i].rotation.x = Math.cos(currentTime * 0.53 + i * 1.2) * 0.006;
  }
  for (const fan of world.children.filter((child) => child.name.startsWith('ceiling fan'))) {
    fan.getObjectByName('rotor').rotation.y = currentTime * 3.2 + (fan.position.z < -5 ? 0.7 : 0);
  }

  renderer.render(scene, camera);
}

window.reconstruction = {
  pause() {
    paused = true;
    return currentTime;
  },
  seek(seconds) {
    paused = true;
    updateAtTime(seconds);
    return currentTime;
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
};

window.__sceneReady = true;
updateAtTime(0);
