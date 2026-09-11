import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;

const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({
  canvas,
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
renderer.toneMappingExposure = 1.14;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdce9ed);
scene.fog = new THREE.Fog(0xdce9ed, 13, 25);

const camera = new THREE.PerspectiveCamera(44, WIDTH / HEIGHT, 0.05, 40);
const staticRoot = new THREE.Group();
scene.add(staticRoot);

const materials = {
  wall: new THREE.MeshStandardMaterial({ color: 0xeee9dc, roughness: 0.92 }),
  wallShade: new THREE.MeshStandardMaterial({ color: 0xe8e1d3, roughness: 0.95 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xf8f4e9, roughness: 0.76 }),
  oak: new THREE.MeshStandardMaterial({ color: 0x8a5530, roughness: 0.55, metalness: 0.02 }),
  oakLight: new THREE.MeshStandardMaterial({ color: 0xb9783f, roughness: 0.48, metalness: 0.02 }),
  oakDark: new THREE.MeshStandardMaterial({ color: 0x5d3825, roughness: 0.62 }),
  chairWood: new THREE.MeshStandardMaterial({ color: 0xcf8240, roughness: 0.35, metalness: 0.01 }),
  charcoal: new THREE.MeshStandardMaterial({ color: 0x20272a, roughness: 0.34, metalness: 0.12 }),
  metal: new THREE.MeshStandardMaterial({ color: 0x899196, roughness: 0.28, metalness: 0.72 }),
  rug: new THREE.MeshStandardMaterial({ color: 0x587a75, roughness: 0.9 }),
  rugEdge: new THREE.MeshStandardMaterial({ color: 0x365550, roughness: 0.94 }),
  ceramic: new THREE.MeshStandardMaterial({ color: 0xe6e2d7, roughness: 0.3 }),
  terracotta: new THREE.MeshStandardMaterial({ color: 0xa64f32, roughness: 0.76 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x426b46, roughness: 0.82 }),
  leafLight: new THREE.MeshStandardMaterial({ color: 0x6e8a50, roughness: 0.8 }),
  screen: new THREE.MeshStandardMaterial({
    color: 0x274453,
    emissive: 0x172c38,
    emissiveIntensity: 0.82,
    roughness: 0.21,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xa8d5e3,
    emissive: 0x75a6b5,
    emissiveIntensity: 0.28,
    roughness: 0.18,
    metalness: 0.02,
  }),
  curtain: new THREE.MeshStandardMaterial({ color: 0xd7c6a7, roughness: 0.92 }),
  black: new THREE.MeshStandardMaterial({ color: 0x17191a, roughness: 0.5 }),
};

function mesh(geometry, material, parent = staticRoot, shadows = true) { window.__bfTrace?.add(66);
  const object = new THREE.Mesh(geometry, material);
  object.castShadow = shadows;
  object.receiveShadow = shadows;
  parent.add(object);
  return object;
}

function box(name, size, position, material, parent = staticRoot, rotation = null, shadows = true) { window.__bfTrace?.add(74);
  const object = mesh(new THREE.BoxGeometry(size[0], size[1], size[2]), material, parent, shadows);
  object.name = name;
  object.position.set(position[0], position[1], position[2]);
  if (rotation) object.rotation.set(rotation[0], rotation[1], rotation[2]);
  return object;
}

function cylinder(name, radiusTop, radiusBottom, height, segments, position, material, parent = staticRoot, rotation = null) { window.__bfTrace?.add(82);
  const object = mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments),
    material,
    parent,
  );
  object.name = name;
  object.position.set(position[0], position[1], position[2]);
  if (rotation) object.rotation.set(rotation[0], rotation[1], rotation[2]);
  return object;
}

function addRoom() { window.__bfTrace?.add(94);
  box('floorBase', [10.8, 0.18, 9.2], [0, -0.1, 0.1], materials.oakDark);

  const plankColors = [0xa96e3d, 0xb77b48, 0x986039, 0xc18751];
  const plankMaterials = plankColors.map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.72 }),
  );
  const plankWidth = 0.65;
  const plankDepth = 1.49;
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 17; column += 1) {
      const x = -5.2 + column * plankWidth + (row % 2) * plankWidth * 0.5;
      if (x > 5.15) continue;
      const z = -3.53 + row * 1.52;
      box(
        `floorPlank-${row}-${column}`,
        [plankWidth - 0.025, 0.035, plankDepth],
        [x, 0.015, z],
        plankMaterials[(row * 3 + column) % plankMaterials.length],
      );
    }
  }

  box('backWall', [10.9, 5.9, 0.16], [0, 2.95, -4.34], materials.wall);
  box('leftWall', [0.16, 5.9, 9.2], [-5.44, 2.95, 0.1], materials.wallShade);
  box('ceiling', [10.8, 0.14, 9.2], [0, 5.84, 0.1], materials.trim);
  box('backBaseboard', [10.75, 0.22, 0.12], [0, 0.15, -4.21], materials.trim);
  box('leftBaseboard', [0.12, 0.22, 9.0], [-5.31, 0.15, 0.1], materials.trim);
  box('backCrown', [10.75, 0.14, 0.18], [0, 5.66, -4.18], materials.trim);
  box('leftCrown', [0.16, 0.14, 9.0], [-5.28, 5.66, 0.1], materials.trim);

  box('rug', [5.25, 0.045, 3.2], [0.3, 0.065, -0.15], materials.rug);
  box('rugBorderFront', [5.25, 0.012, 0.08], [0.3, 0.091, 1.41], materials.rugEdge, staticRoot, null, false);
  box('rugBorderBack', [5.25, 0.012, 0.08], [0.3, 0.091, -1.71], materials.rugEdge, staticRoot, null, false);
  box('rugBorderLeft', [0.08, 0.012, 3.05], [-2.29, 0.091, -0.15], materials.rugEdge, staticRoot, null, false);
  box('rugBorderRight', [0.08, 0.012, 3.05], [2.89, 0.091, -0.15], materials.rugEdge, staticRoot, null, false);
}

function addWindow() { window.__bfTrace?.add(132);
  const windowGroup = new THREE.Group();
  windowGroup.name = 'window';
  staticRoot.add(windowGroup);

  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: {
      topColor: { value: new THREE.Color(0x69b9df) },
      bottomColor: { value: new THREE.Color(0xd8edf0) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      void main() {
        vec3 color = mix(bottomColor, topColor, smoothstep(0.0, 1.0, vUv.y));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });

  const sky = mesh(new THREE.PlaneGeometry(2.8, 2.45), skyMaterial, windowGroup, false);
  sky.name = 'proceduralSky';
  sky.position.set(3.3, 3.34, -4.245);

  const hillMaterial = new THREE.MeshStandardMaterial({
    color: 0x78936b,
    roughness: 1,
    emissive: 0x33452e,
    emissiveIntensity: 0.25,
  });
  const hill = mesh(new THREE.CircleGeometry(1.65, 32, 0, Math.PI), hillMaterial, windowGroup, false);
  hill.name = 'distantHill';
  hill.position.set(3.18, 2.38, -4.205);
  hill.scale.set(1.15, 0.38, 1);

  const frameSpecs = [
    ['windowTop', [3.08, 0.14, 0.18], [3.3, 4.63, -4.12]],
    ['windowBottom', [3.08, 0.16, 0.2], [3.3, 2.05, -4.11]],
    ['windowLeft', [0.14, 2.72, 0.18], [1.75, 3.34, -4.12]],
    ['windowRight', [0.14, 2.72, 0.18], [4.85, 3.34, -4.12]],
    ['windowCenterV', [0.1, 2.52, 0.14], [3.3, 3.34, -4.08]],
    ['windowCenterH', [2.98, 0.1, 0.14], [3.3, 3.34, -4.08]],
  ];
  for (const [name, size, position] of frameSpecs) {
    box(name, size, position, materials.trim, windowGroup);
  }

  const glass = mesh(new THREE.PlaneGeometry(2.9, 2.5), materials.glass, windowGroup, false);
  glass.name = 'windowGlass';
  glass.position.set(3.3, 3.34, -4.02);
  glass.material.transparent = true;
  glass.material.opacity = 0.24;
  glass.material.depthWrite = false;

  box('leftCurtain', [0.31, 2.95, 0.2], [1.48, 3.2, -3.98], materials.curtain, windowGroup);
  box('rightCurtain', [0.29, 2.95, 0.2], [5.12, 3.2, -3.98], materials.curtain, windowGroup);
  cylinder('curtainRod', 0.055, 0.055, 4.02, 12, [3.3, 4.89, -3.93], materials.metal, windowGroup, [0, 0, Math.PI / 2]);

  const cloudMaterial = new THREE.MeshBasicMaterial({ color: 0xf5fbfa });
  const cloudPositions = [
    [2.25, 3.94, 0.17],
    [2.52, 4.02, 0.21],
    [2.77, 3.94, 0.15],
  ];
  for (const [x, y, scale] of cloudPositions) {
    const cloud = mesh(new THREE.CircleGeometry(1, 24), cloudMaterial, windowGroup, false);
    cloud.name = 'proceduralCloud';
    cloud.position.set(x, y, -4.0);
    cloud.scale.set(scale * 1.5, scale, 1);
  }
}

function addDesk() { window.__bfTrace?.add(212);
  const desk = new THREE.Group();
  desk.name = 'fixedDesk';
  staticRoot.add(desk);

  box('deskTop', [4.25, 0.2, 1.65], [0.15, 1.38, -0.72], materials.oakLight, desk);
  box('deskApronFront', [3.95, 0.2, 0.12], [0.15, 1.18, 0.05], materials.oak, desk);
  const legPositions = [
    [-1.72, 0.68, -1.32],
    [2.02, 0.68, -1.32],
    [-1.72, 0.68, -0.15],
    [2.02, 0.68, -0.15],
  ];
  for (let i = 0; i < legPositions.length; i += 1) {
    box(`deskLeg-${i}`, [0.16, 1.3, 0.16], legPositions[i], materials.oakDark, desk);
  }

  box('drawerCabinet', [0.82, 1.08, 1.28], [1.48, 0.77, -0.77], materials.wallShade, desk);
  for (let i = 0; i < 3; i += 1) {
    box(`drawerFront-${i}`, [0.7, 0.26, 0.045], [1.48, 1.08 - i * 0.31, -0.1], materials.trim, desk);
    cylinder(`drawerPull-${i}`, 0.025, 0.025, 0.26, 10, [1.48, 1.08 - i * 0.31, -0.065], materials.metal, desk, [0, 0, Math.PI / 2]);
  }

  box('monitorBody', [1.55, 0.94, 0.12], [-0.45, 2.08, -0.9], materials.charcoal, desk);
  box('monitorScreen', [1.39, 0.77, 0.025], [-0.45, 2.08, -0.825], materials.screen, desk, null, false);
  box('monitorNeck', [0.12, 0.48, 0.11], [-0.45, 1.56, -0.9], materials.metal, desk);
  box('monitorFoot', [0.62, 0.05, 0.3], [-0.45, 1.5, -0.73], materials.metal, desk);
  box('keyboard', [1.02, 0.055, 0.35], [-0.42, 1.51, -0.12], materials.charcoal, desk, [-0.06, 0, 0]);
  box('notebook', [0.62, 0.035, 0.43], [0.7, 1.51, -0.2], materials.ceramic, desk, [0, -0.12, 0]);
  cylinder('mug', 0.13, 0.12, 0.31, 20, [1.23, 1.62, -0.78], materials.ceramic, desk);
  const mugHandle = mesh(new THREE.TorusGeometry(0.11, 0.028, 8, 18, Math.PI * 1.55), materials.ceramic, desk);
  mugHandle.name = 'mugHandle';
  mugHandle.position.set(1.38, 1.66, -0.78);
  mugHandle.rotation.y = Math.PI / 2;

  cylinder('lampBase', 0.23, 0.26, 0.07, 20, [-1.55, 1.51, -0.78], materials.charcoal, desk);
  cylinder('lampStem', 0.035, 0.04, 0.72, 12, [-1.55, 1.88, -0.78], materials.metal, desk, [0, 0, -0.15]);
  const shade = mesh(new THREE.ConeGeometry(0.29, 0.36, 20, 1, true), materials.charcoal, desk);
  shade.name = 'lampShade';
  shade.position.set(-1.48, 2.26, -0.75);
  shade.rotation.z = -0.25;
}

function addBookshelf() { window.__bfTrace?.add(255);
  const shelf = new THREE.Group();
  shelf.name = 'fixedBookshelf';
  staticRoot.add(shelf);

  box('bookcaseBack', [2.12, 4.18, 0.16], [-3.82, 2.18, -4.06], materials.oakDark, shelf);
  box('bookcaseLeft', [0.18, 4.34, 0.64], [-4.82, 2.18, -3.72], materials.oak, shelf);
  box('bookcaseRight', [0.18, 4.34, 0.64], [-2.82, 2.18, -3.72], materials.oak, shelf);
  box('bookcaseTop', [2.18, 0.2, 0.72], [-3.82, 4.31, -3.72], materials.oak, shelf);
  box('bookcasePlinth', [2.28, 0.26, 0.78], [-3.82, 0.18, -3.69], materials.oakDark, shelf);
  const shelfHeights = [0.72, 1.62, 2.52, 3.42];
  for (let i = 0; i < shelfHeights.length; i += 1) {
    box(`shelf-${i}`, [2.05, 0.13, 0.68], [-3.82, shelfHeights[i], -3.71], materials.oak, shelf);
  }

  const bookColors = [0x9e3f35, 0x385d72, 0xc4933e, 0x56704d, 0x7b526b, 0xd5c5a3];
  const bookMaterials = bookColors.map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.78 }),
  );
  for (let row = 0; row < 4; row += 1) {
    let cursor = -4.65;
    const baseY = shelfHeights[row] + 0.08;
    for (let i = 0; i < 7; i += 1) {
      const width = 0.16 + ((row * 7 + i * 3) % 4) * 0.025;
      const height = 0.46 + ((row * 5 + i * 2) % 5) * 0.055;
      box(
        `book-${row}-${i}`,
        [width, height, 0.42],
        [cursor + width * 0.5, baseY + height * 0.5, -3.33],
        bookMaterials[(row * 2 + i) % bookMaterials.length],
        shelf,
        [0, 0, i === 6 && row % 2 === 0 ? -0.13 : 0],
      );
      cursor += width + 0.055;
    }
  }

  cylinder('shelfVase', 0.15, 0.21, 0.48, 18, [-3.05, 3.72, -3.43], materials.ceramic, shelf);
}

function addWoodenChairBesideWindow() { window.__bfTrace?.add(295);
  const chair = new THREE.Group();
  chair.name = 'relocatedWoodenChairBesideWindow';
  chair.position.set(-0.35, 0.08, 0.88);
  chair.rotation.y = Math.PI;
  staticRoot.add(chair);

  box('chairSeat', [1.16, 0.16, 1.0], [0, 0.78, 0], materials.chairWood, chair);
  box('chairSeatFrontRail', [1.08, 0.18, 0.12], [0, 0.62, 0.43], materials.oakDark, chair);
  box('chairSeatBackRail', [1.08, 0.18, 0.12], [0, 0.62, -0.43], materials.oakDark, chair);

  const legs = [
    [-0.47, 0.34, 0.38],
    [0.47, 0.34, 0.38],
    [-0.47, 0.34, -0.38],
    [0.47, 0.34, -0.38],
  ];
  for (let i = 0; i < legs.length; i += 1) {
    const [x, y, z] = legs[i];
    box(`chairLeg-${i}`, [0.12, 0.72, 0.12], [x, y, z], materials.chairWood, chair, [0.025 * (x > 0 ? -1 : 1), 0, 0.025 * (z > 0 ? -1 : 1)]);
  }
  box('chairLowerFrontStretcher', [0.86, 0.09, 0.09], [0, 0.3, 0.39], materials.oakDark, chair);
  box('chairLowerBackStretcher', [0.86, 0.09, 0.09], [0, 0.3, -0.39], materials.oakDark, chair);
  box('chairLowerSideStretcherL', [0.09, 0.09, 0.68], [-0.47, 0.3, 0], materials.oakDark, chair);
  box('chairLowerSideStretcherR', [0.09, 0.09, 0.68], [0.47, 0.3, 0], materials.oakDark, chair);
  box('chairSeatSideRailL', [0.12, 0.18, 0.78], [-0.5, 0.62, 0], materials.oakDark, chair);
  box('chairSeatSideRailR', [0.12, 0.18, 0.78], [0.5, 0.62, 0], materials.oakDark, chair);

  box('chairBackPostL', [0.13, 1.42, 0.13], [-0.48, 1.35, -0.4], materials.chairWood, chair, [0.08, 0, 0]);
  box('chairBackPostR', [0.13, 1.42, 0.13], [0.48, 1.35, -0.4], materials.chairWood, chair, [0.08, 0, 0]);
  box('chairBackTopRail', [1.08, 0.2, 0.15], [0, 2.0, -0.34], materials.chairWood, chair, [0.08, 0, 0]);
  box('chairBackMidRail', [0.92, 0.13, 0.13], [0, 1.18, -0.41], materials.oakDark, chair, [0.08, 0, 0]);
  for (let i = -1; i <= 1; i += 1) {
    box(`chairBackSlat-${i}`, [0.13, 0.72, 0.1], [i * 0.26, 1.56, -0.39], materials.chairWood, chair, [0.08, 0, 0]);
  }

  return chair;
}

function addPlantsAndDecor() { window.__bfTrace?.add(334);
  const plant = new THREE.Group();
  plant.name = 'fixedWindowPlant';
  plant.position.set(4.76, 0, -3.45);
  staticRoot.add(plant);
  cylinder('plantPot', 0.29, 0.22, 0.5, 20, [0, 0.3, 0], materials.terracotta, plant);
  cylinder('plantStem', 0.035, 0.045, 0.76, 10, [0, 0.92, 0], materials.leaf, plant);
  const leafData = [
    [-0.22, 0.83, 0.1, -0.5],
    [0.22, 1.0, 0.03, 0.45],
    [-0.08, 1.24, -0.02, -0.15],
    [0.31, 1.35, 0.02, 0.72],
    [-0.28, 1.48, 0, -0.68],
    [0.08, 1.65, 0, 0.2],
  ];
  for (let i = 0; i < leafData.length; i += 1) {
    const [x, y, z, angle] = leafData[i];
    const leaf = mesh(new THREE.SphereGeometry(0.22, 12, 8), i % 2 ? materials.leafLight : materials.leaf, plant);
    leaf.name = `plantLeaf-${i}`;
    leaf.position.set(x, y, z);
    leaf.scale.set(1.5, 0.38, 0.55);
    leaf.rotation.z = angle;
  }

  const art = new THREE.Group();
  art.name = 'fixedWallArt';
  staticRoot.add(art);
  box('artFrame', [1.28, 1.04, 0.09], [-1.15, 3.54, -4.18], materials.oakDark, art);
  box(
    'artMat',
    [1.08, 0.84, 0.035],
    [-1.15, 3.54, -4.115],
    new THREE.MeshStandardMaterial({ color: 0xe5d5b8, roughness: 0.9 }),
    art,
  );
  box(
    'artShapeA',
    [0.36, 0.5, 0.025],
    [-1.36, 3.52, -4.08],
    new THREE.MeshStandardMaterial({ color: 0x6c8475, roughness: 0.9 }),
    art,
    [0, 0, 0.18],
  );
  cylinder(
    'artShapeB',
    0.2,
    0.2,
    0.025,
    24,
    [-0.93, 3.5, -4.075],
    new THREE.MeshStandardMaterial({ color: 0xc98757, roughness: 0.9 }),
    art,
    [Math.PI / 2, 0, 0],
  );
}

function addLighting() { window.__bfTrace?.add(390);
  const hemisphere = new THREE.HemisphereLight(0xd9eef4, 0x5d4939, 1.35);
  scene.add(hemisphere);

  const ambient = new THREE.AmbientLight(0xfff9eb, 0.42);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffe3b3, 2.75);
  sun.name = 'windowSunlight';
  sun.position.set(5.8, 7.7, -2.4);
  sun.target.position.set(-0.2, 0, 1.6);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -7;
  sun.shadow.camera.right = 7;
  sun.shadow.camera.top = 7;
  sun.shadow.camera.bottom = -5;
  sun.shadow.camera.near = 0.5;
  sun.shadow.camera.far = 18;
  sun.shadow.bias = -0.0003;
  scene.add(sun, sun.target);

  const windowFill = new THREE.PointLight(0xffddb0, 20, 7, 1.5);
  windowFill.name = 'windowFill';
  windowFill.position.set(3.45, 3.45, -3.45);
  scene.add(windowFill);

  const deskFill = new THREE.PointLight(0xb9d9e2, 4.5, 7, 2);
  deskFill.name = 'deskFill';
  deskFill.position.set(-2.2, 3.4, 2.7);
  scene.add(deskFill);

  const sunlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xffdd9a,
    transparent: true,
    opacity: 0.18,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const patches = [
    [[2.7, 1.45], [2.35, 0.045, -0.4], -0.18],
    [[1.9, 0.52], [2.75, 0.047, -1.33], -0.18],
    [[1.45, 0.34], [1.34, 0.048, 0.48], -0.18],
  ];
  for (let i = 0; i < patches.length; i += 1) {
    const [size, position, angle] = patches[i];
    const patch = mesh(new THREE.PlaneGeometry(size[0], size[1]), sunlightMaterial, staticRoot, false);
    patch.name = `sunlightPatch-${i}`;
    patch.position.set(position[0], position[1], position[2]);
    patch.rotation.set(-Math.PI / 2, 0, angle);
  }
}

addRoom();
addWindow();
addDesk();
addBookshelf();
const woodenChair = addWoodenChairBesideWindow();
addPlantsAndDecor();
addLighting();

function smoothstep(value) { window.__bfTrace?.add(451);
  return value * value * (3 - 2 * value);
}

function updateChair() { window.__bfTrace?.add(455);
  woodenChair.position.set(-0.35, 0.08, 0.88);
  woodenChair.rotation.set(0, Math.PI, 0);
  woodenChair.scale.set(1, 1, 1);
  woodenChair.visible = true;
}

function updateCamera(time) { window.__bfTrace?.add(462);
  const progress = THREE.MathUtils.clamp(time / DURATION, 0, 1);
  const eased = smoothstep(progress);
  const arc = Math.sin(progress * Math.PI);
  camera.position.set(
    THREE.MathUtils.lerp(4.88, 3.62, eased),
    THREE.MathUtils.lerp(3.46, 3.14, eased) + 0.06 * arc,
    THREE.MathUtils.lerp(7.42, 6.48, eased),
  );
  const target = new THREE.Vector3(
    THREE.MathUtils.lerp(0.22, 0.42, eased),
    THREE.MathUtils.lerp(1.6, 1.5, eased),
    THREE.MathUtils.lerp(-1.02, -1.2, eased),
  );
  camera.fov = 42.8;
  camera.updateProjectionMatrix();
  camera.lookAt(target);
  camera.updateMatrixWorld(true);
}

let currentTime = 0;

function renderAt(time) { window.__bfTrace?.add(484);
  currentTime = THREE.MathUtils.clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  updateChair();
  updateCamera(currentTime);
  renderer.render(scene, camera);
}

function getCameraState() { window.__bfTrace?.add(491);
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

window.reconstruction = {
  pause() {
    renderAt(currentTime);
  },
  seek(seconds) {
    renderAt(Number(seconds));
  },
  getCameraState,
};

renderAt(0);
window.sceneReady = true;
