import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xa8ddf0);
scene.fog = new THREE.Fog(0xa8d8e6, 95, 255);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(49, WIDTH / HEIGHT, 0.1, 400);
const world = new THREE.Group();
scene.add(world);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smoothstep = (a, b, value) => {
  const x = clamp01((value - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const lerp = THREE.MathUtils.lerp;
const hash = (n) => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
};

function standard(color, roughness = 0.8, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const materials = {
  grass: standard(0x5d9b52, 0.96),
  grassLight: standard(0x82b85f, 0.94),
  rock: standard(0x756f68, 0.98),
  rockLight: standard(0x958b7d, 0.95),
  stone: standard(0xd8d0b8, 0.92),
  stoneDark: standard(0x6d7471, 0.94),
  roof: standard(0x1f5d76, 0.7),
  wood: standard(0x674029, 0.9),
  trunk: standard(0x5a3d29, 1),
  foliage: standard(0xffffff, 0.94),
  foliageLight: standard(0x468b53, 0.94),
  gold: standard(0xe7b94f, 0.48, 0.08),
  tunic: standard(0x2f7f58, 0.88),
  leather: standard(0x73503a, 0.95),
  skin: standard(0xe1ad7c, 0.84),
  hair: standard(0x6c4c27, 0.92),
  cream: standard(0xf4ecd2, 0.9),
  water: new THREE.MeshPhysicalMaterial({
    color: 0x43abc6,
    roughness: 0.2,
    metalness: 0.05,
    transparent: true,
    opacity: 0.86,
    side: THREE.DoubleSide
  })
};

scene.add(new THREE.HemisphereLight(0xe6f6ff, 0x547044, 2.15));
const sunLight = new THREE.DirectionalLight(0xfff3d3, 3.2);
sunLight.position.set(-48, 72, 36);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(2048, 2048);
sunLight.shadow.camera.left = -90;
sunLight.shadow.camera.right = 90;
sunLight.shadow.camera.top = 90;
sunLight.shadow.camera.bottom = -90;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 220;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);
const fillLight = new THREE.DirectionalLight(0xc7e8ff, 1.15);
fillLight.position.set(46, 34, 62);
fillLight.target.position.set(0, 8, -55);
scene.add(fillLight, fillLight.target);

const skyDome = new THREE.Mesh(
  new THREE.SphereGeometry(260, 32, 18),
  new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x70bce4) },
      horizonColor: { value: new THREE.Color(0xdaf1ed) },
      bottomColor: { value: new THREE.Color(0xaccda5) }
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorld = normalize(worldPosition.xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 bottomColor;
      varying vec3 vWorld;
      void main() {
        float h = normalize(vWorld).y;
        vec3 low = mix(bottomColor, horizonColor, smoothstep(-0.18, 0.10, h));
        vec3 color = mix(low, topColor, smoothstep(0.10, 0.78, h));
        gl_FragColor = vec4(color, 1.0);
      }
    `
  })
);
scene.add(skyDome);

const sunDisc = new THREE.Mesh(
  new THREE.SphereGeometry(7, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0xffefb0, fog: false })
);
sunDisc.position.set(-82, 62, -185);
scene.add(sunDisc);

function terrainHeight(x, z) {
  const rolling = Math.sin(x * 0.085) * 0.85 + Math.cos(z * 0.07) * 0.65;
  const sideRise = Math.pow(Math.max(0, Math.abs(x) - 42), 1.35) * 0.045;
  const cliff = 18 * Math.exp(-((x + 27) ** 2) / 260 - ((z - 25) ** 2) / 180);
  const castleRise = 4.2 * Math.exp(-((x - 2) ** 2) / 500 - ((z + 132) ** 2) / 150);
  return -4.1 + rolling + sideRise + cliff + castleRise;
}

function createTerrain() {
  const xSegments = 72;
  const zSegments = 84;
  const geometry = new THREE.PlaneGeometry(190, 225, xSegments, zSegments);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0, -62.5);
  const position = geometry.attributes.position;
  const colors = [];
  const dark = new THREE.Color(0x4f8848);
  const light = new THREE.Color(0x83b45d);
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const z = position.getZ(i);
    const y = terrainHeight(x, z);
    position.setY(i, y);
    const mix = clamp01((y + 5) / 22) * 0.45 + hash(i) * 0.08;
    const color = dark.clone().lerp(light, mix);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.98,
      metalness: 0,
      flatShading: false
    })
  );
  mesh.receiveShadow = true;
  world.add(mesh);
}

function riverCenter(z) {
  return 5 + Math.sin((z + 28) * 0.055) * 10 + Math.sin((z - 10) * 0.018) * 5;
}

function createRiver() {
  const segments = 75;
  const vertices = [];
  const indices = [];
  const bankVertices = [[], []];
  const bankIndices = [];
  for (let i = 0; i <= segments; i += 1) {
    const u = i / segments;
    const z = lerp(35, -158, u);
    const center = riverCenter(z);
    const width = lerp(4.5, 8.5, u) + Math.sin(u * Math.PI * 5) * 0.7;
    vertices.push(center - width, -3.42, z, center + width, -3.42, z);
    bankVertices[0].push(center - width - 1.25, -3.39, z, center - width, -3.39, z);
    bankVertices[1].push(center + width, -3.39, z, center + width + 1.25, -3.39, z);
    if (i < segments) {
      const n = i * 2;
      indices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
      bankIndices.push(n, n + 2, n + 1, n + 1, n + 2, n + 3);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const river = new THREE.Mesh(geometry, materials.water);
  river.receiveShadow = true;
  world.add(river);

  for (const sideVertices of bankVertices) {
    const bankGeometry = new THREE.BufferGeometry();
    bankGeometry.setAttribute('position', new THREE.Float32BufferAttribute(sideVertices, 3));
    bankGeometry.setIndex(bankIndices);
    bankGeometry.computeVertexNormals();
    const bank = new THREE.Mesh(bankGeometry, standard(0xb5a36d, 0.98));
    bank.receiveShadow = true;
    world.add(bank);
  }

  for (let i = 0; i < 26; i += 1) {
    const z = 22 - i * 7;
    const x = riverCenter(z) + (hash(i + 818) - 0.5) * 7;
    const glint = new THREE.Mesh(
      new THREE.PlaneGeometry(1.2 + hash(i + 23) * 2.2, 0.055),
      new THREE.MeshBasicMaterial({
        color: 0xc9f0ec,
        transparent: true,
        opacity: 0.52,
        side: THREE.DoubleSide
      })
    );
    glint.rotation.x = -Math.PI / 2;
    glint.position.set(x, -3.35, z);
    world.add(glint);
  }
}

function jaggedRock(radius, height, color, radialSegments = 9) {
  const geometry = new THREE.CylinderGeometry(radius * 0.7, radius, height, radialSegments, 4);
  const position = geometry.attributes.position;
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    const wobble = 1 + (hash(i + radius * 19 + height) - 0.5) * 0.24;
    position.setXYZ(i, x * wobble, y, z * wobble);
  }
  geometry.computeVertexNormals();
  return new THREE.Mesh(geometry, standard(color, 1));
}

function createCliffs() {
  const base = jaggedRock(12, 30, 0x6f6b66, 11);
  base.position.set(-28, 5.5, 27);
  base.rotation.y = 0.2;
  base.castShadow = true;
  base.receiveShadow = true;
  world.add(base);

  const shoulder = jaggedRock(9, 20, 0x817b71, 10);
  shoulder.position.set(-41, 1, 16);
  shoulder.rotation.z = -0.12;
  shoulder.castShadow = true;
  world.add(shoulder);

  for (let i = 0; i < 9; i += 1) {
    const rock = jaggedRock(4 + hash(i) * 4, 10 + hash(i + 20) * 14, i % 2 ? 0x756f68 : 0x878075, 8);
    const side = i % 2 === 0 ? -1 : 1;
    rock.position.set(side * (61 + hash(i + 9) * 23), terrainHeight(side * 70, -20 - i * 14) + 3, -8 - i * 17);
    rock.rotation.z = (hash(i + 77) - 0.5) * 0.18;
    rock.castShadow = true;
    rock.receiveShadow = true;
    world.add(rock);
  }
}

function createTower() {
  const tower = new THREE.Group();
  tower.position.set(-27, 15.8, 27);
  const shaft = new THREE.Mesh(
    new THREE.CylinderGeometry(6.1, 7, 17, 16, 4),
    materials.stone
  );
  shaft.castShadow = true;
  shaft.receiveShadow = true;
  tower.add(shaft);

  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(6.45, 6.45, 1.25, 16),
    materials.stoneDark
  );
  band.position.y = 5.7;
  tower.add(band);

  const top = new THREE.Mesh(
    new THREE.CylinderGeometry(6.8, 6.8, 1.1, 16),
    materials.stone
  );
  top.position.y = 8.6;
  top.castShadow = true;
  tower.add(top);

  for (let i = 0; i < 12; i += 1) {
    const angle = i / 12 * Math.PI * 2;
    const battlement = new THREE.Mesh(
      new THREE.BoxGeometry(2.0, 2.2, 1.5),
      materials.stone
    );
    battlement.position.set(Math.cos(angle) * 6.15, 10.0, Math.sin(angle) * 6.15);
    battlement.rotation.y = -angle;
    battlement.castShadow = true;
    tower.add(battlement);
  }

  const doorway = new THREE.Mesh(
    new THREE.BoxGeometry(2.5, 5, 0.3),
    materials.stoneDark
  );
  doorway.position.set(0, -3.5, 6.25);
  tower.add(doorway);

  const flagPole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.09, 0.11, 8, 8),
    materials.wood
  );
  flagPole.position.set(-3.5, 13.4, 0);
  tower.add(flagPole);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(4.5, 2.0, 5, 1),
    new THREE.MeshStandardMaterial({
      color: 0xd5a93f,
      roughness: 0.78,
      side: THREE.DoubleSide
    })
  );
  flag.position.set(-1.25, 16.1, 0);
  tower.add(flag);
  tower.userData.flag = flag;
  world.add(tower);
  return tower;
}

function createTrees() {
  const count = 250;
  const trunkGeometry = new THREE.CylinderGeometry(0.25, 0.42, 2.8, 6);
  const crownGeometry = new THREE.ConeGeometry(1.45, 4.4, 7);
  const trunks = new THREE.InstancedMesh(trunkGeometry, materials.trunk, count);
  const crowns = new THREE.InstancedMesh(crownGeometry, materials.foliage, count);
  trunks.castShadow = true;
  trunks.receiveShadow = true;
  crowns.castShadow = true;
  crowns.receiveShadow = true;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  let placed = 0;
  for (let i = 0; placed < count && i < 1200; i += 1) {
    const x = lerp(-76, 76, hash(i * 3 + 4));
    const z = lerp(12, -119, hash(i * 3 + 5));
    if (Math.abs(x - riverCenter(z)) < 12 || Math.hypot(x + 27, z - 27) < 20) continue;
    const y = terrainHeight(x, z);
    const size = 0.72 + hash(i * 3 + 6) * 0.72;
    position.set(x, y + 1.4 * size, z);
    scale.set(size, size, size);
    matrix.compose(position, quaternion, scale);
    trunks.setMatrixAt(placed, matrix);
    position.setY(y + 4.2 * size);
    matrix.compose(position, quaternion, scale);
    crowns.setMatrixAt(placed, matrix);
    crowns.setColorAt(placed, new THREE.Color(i % 4 === 0 ? 0x4a8d55 : 0x2d6940));
    placed += 1;
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  if (crowns.instanceColor) crowns.instanceColor.needsUpdate = true;
  world.add(trunks, crowns);
}

function conicalRoof(radius, height, color = materials.roof) {
  const roof = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 8), color);
  roof.castShadow = true;
  return roof;
}

function createCastle() {
  const castle = new THREE.Group();
  castle.position.set(2, 0.0, -132);

  const plateau = jaggedRock(18, 7, 0x77756f, 12);
  plateau.position.y = -1.0;
  plateau.scale.z = 0.75;
  plateau.receiveShadow = true;
  castle.add(plateau);

  const wall = new THREE.Mesh(new THREE.BoxGeometry(31, 8, 10), materials.stone);
  wall.position.y = 6.2;
  wall.castShadow = true;
  wall.receiveShadow = true;
  castle.add(wall);

  for (let i = 0; i < 9; i += 1) {
    const battlement = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 2.0, 1.8),
      materials.stone
    );
    battlement.position.set(-13.2 + i * 3.3, 11.0, 4.4);
    battlement.castShadow = true;
    castle.add(battlement);
  }

  for (const x of [-13.5, 13.5]) {
    const tower = new THREE.Mesh(
      new THREE.CylinderGeometry(4, 4.5, 15, 10),
      materials.stone
    );
    tower.position.set(x, 10, 0);
    tower.castShadow = true;
    castle.add(tower);
    const roof = conicalRoof(5.2, 6);
    roof.position.set(x, 20.4, 0);
    castle.add(roof);
  }

  const keep = new THREE.Mesh(new THREE.BoxGeometry(12, 20, 11), materials.stone);
  keep.position.set(0, 14, -1);
  keep.castShadow = true;
  castle.add(keep);

  for (let i = 0; i < 5; i += 1) {
    const battlement = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 2.1, 1.8),
      materials.stone
    );
    battlement.position.set(-4.8 + i * 2.4, 24.8, 3.7);
    battlement.castShadow = true;
    castle.add(battlement);
  }

  const keepRoof = conicalRoof(9.5, 8);
  keepRoof.position.set(0, 28, -1);
  keepRoof.rotation.y = Math.PI / 4;
  castle.add(keepRoof);

  for (const x of [-7, 7]) {
    const spire = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 2.8, 13, 8),
      materials.stone
    );
    spire.position.set(x, 17, -2);
    spire.castShadow = true;
    castle.add(spire);
    const roof = conicalRoof(3.4, 7);
    roof.position.set(x, 27, -2);
    castle.add(roof);
  }

  const gateLower = new THREE.Mesh(
    new THREE.PlaneGeometry(4.8, 3.6),
    materials.stoneDark
  );
  gateLower.position.set(0, 4.1, 5.18);
  castle.add(gateLower);
  const gateArch = new THREE.Mesh(
    new THREE.CircleGeometry(2.4, 20, 0, Math.PI),
    materials.stoneDark
  );
  gateArch.position.set(0, 5.9, 5.18);
  castle.add(gateArch);

  const windowMaterial = new THREE.MeshBasicMaterial({ color: 0x354c50 });
  for (const [x, y, z, sx] of [
    [-3.2, 14.0, 4.55, 1.0],
    [3.2, 14.0, 4.55, 1.0],
    [0, 19.0, 4.55, 1.2],
    [-13.5, 11.5, 4.05, 0.7],
    [13.5, 11.5, 4.05, 0.7]
  ]) {
    const window = new THREE.Mesh(new THREE.PlaneGeometry(sx, 2.5), windowMaterial);
    window.position.set(x, y, z);
    castle.add(window);
  }

  for (const x of [-7.5, 7.5]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.1, 7, 6),
      materials.wood
    );
    pole.position.set(x, 18.5, 5.5);
    castle.add(pole);
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(2.2, 3.8),
      new THREE.MeshStandardMaterial({
        color: 0x2f6f72,
        roughness: 0.8,
        side: THREE.DoubleSide
      })
    );
    banner.position.set(x, 17.1, 5.55);
    castle.add(banner);
  }

  const bridge = new THREE.Mesh(
    new THREE.BoxGeometry(4.5, 0.7, 18),
    materials.stone
  );
  bridge.position.set(0, 2.3, 13.5);
  bridge.rotation.x = -0.03;
  bridge.castShadow = true;
  castle.add(bridge);

  world.add(castle);
}

function createMountains() {
  for (let i = 0; i < 11; i += 1) {
    const x = -120 + i * 24;
    const height = 35 + hash(i + 40) * 38;
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(24 + hash(i + 19) * 17, height, 7),
      standard(i % 2 ? 0x75877e : 0x6d8178, 1)
    );
    mountain.position.set(x, -3 + height / 2, -195 - hash(i + 2) * 28);
    mountain.rotation.y = hash(i + 11) * Math.PI;
    world.add(mountain);

    if (height > 55) {
      const snow = new THREE.Mesh(
        new THREE.ConeGeometry(8.5, 12, 7),
        standard(0xdce8df, 0.9)
      );
      snow.position.set(x, -3 + height - 6, mountain.position.z);
      snow.rotation.y = mountain.rotation.y;
      world.add(snow);
    }
  }
}

function createClouds() {
  const clouds = [];
  for (let i = 0; i < 10; i += 1) {
    const cloud = new THREE.Group();
    const material = new THREE.MeshBasicMaterial({
      color: i % 2 ? 0xf8fbf5 : 0xeaf5f2,
      transparent: true,
      opacity: 0.82,
      fog: false
    });
    for (let j = 0; j < 5; j += 1) {
      const puff = new THREE.Mesh(
        new THREE.SphereGeometry(3.6 + hash(i * 9 + j) * 3, 12, 8),
        material
      );
      puff.scale.y = 0.55;
      puff.position.set((j - 2) * 4.2, hash(i + j + 7) * 2.2, hash(i * 7 + j) * 2);
      cloud.add(puff);
    }
    cloud.position.set(-90 + i * 22, 38 + hash(i + 42) * 25, -95 - hash(i + 2) * 85);
    cloud.userData.baseX = cloud.position.x;
    world.add(cloud);
    clouds.push(cloud);
  }
  return clouds;
}

function createHero() {
  const hero = new THREE.Group();
  hero.rotation.order = 'YXZ';

  const body = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.7, 7), materials.tunic);
  body.position.y = 0.35;
  body.rotation.z = Math.PI;
  body.castShadow = true;
  hero.add(body);

  const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.72, 0.77, 0.28, 10), materials.leather);
  belt.position.y = -0.25;
  belt.castShadow = true;
  hero.add(belt);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.62, 14, 10), materials.skin);
  head.position.y = 2.0;
  head.castShadow = true;
  hero.add(head);

  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.66, 10, 7, 0, Math.PI * 2, 0, Math.PI * 0.6),
    materials.hair
  );
  hair.position.set(0, 2.22, 0.02);
  hair.rotation.x = -0.15;
  hero.add(hair);

  const cap = new THREE.Mesh(new THREE.ConeGeometry(0.56, 2.1, 8), materials.tunic);
  cap.position.set(0, 2.45, 0.45);
  cap.rotation.x = Math.PI * 0.48;
  cap.castShadow = true;
  hero.add(cap);

  const legs = [];
  for (const x of [-0.38, 0.38]) {
    const leg = new THREE.Group();
    leg.position.set(x, -0.75, 0);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 1.5, 7), materials.cream);
    upper.position.y = -0.7;
    upper.castShadow = true;
    leg.add(upper);
    const boot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.3, 0.9, 7), materials.leather);
    boot.position.set(0, -1.55, -0.08);
    boot.rotation.x = -0.18;
    boot.castShadow = true;
    leg.add(boot);
    hero.add(leg);
    legs.push(leg);
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const arm = new THREE.Group();
    arm.position.set(side * 0.78, 1.1, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.31, 1.25, 7), materials.tunic);
    sleeve.position.y = -0.55;
    sleeve.castShadow = true;
    arm.add(sleeve);
    const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1.15, 7), materials.skin);
    forearm.position.y = -1.65;
    forearm.castShadow = true;
    arm.add(forearm);
    arm.rotation.z = side * -0.55;
    hero.add(arm);
    arms.push(arm);
  }

  const shield = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 0.9, 0.18, 10),
    new THREE.MeshStandardMaterial({ color: 0x355d73, roughness: 0.65, metalness: 0.15 })
  );
  shield.rotation.x = Math.PI / 2;
  shield.position.set(0, 0.55, 0.74);
  shield.castShadow = true;
  hero.add(shield);

  const glider = new THREE.Group();
  glider.position.y = 4.35;
  const canopyVertices = [];
  const canopyColors = [];
  const canopyIndices = [];
  const teal = new THREE.Color(0x258c84);
  const ochre = new THREE.Color(0xf0c34f);
  const segments = 10;
  for (let row = 0; row < 2; row += 1) {
    for (let i = 0; i <= segments; i += 1) {
      const x = lerp(-5.7, 5.7, i / segments);
      const z = row === 0 ? -1.7 : 2.0;
      const arch = 1.15 * (1 - Math.pow(x / 5.7, 2));
      canopyVertices.push(x, arch + (row === 0 ? 0.14 : -0.35), z);
      const color = (i === 0 || i === segments || i === 5 || (i + row) % 4 === 0) ? ochre : teal;
      canopyColors.push(color.r, color.g, color.b);
    }
  }
  for (let i = 0; i < segments; i += 1) {
    const a = i;
    const b = i + 1;
    const c = segments + 1 + i;
    const d = c + 1;
    canopyIndices.push(a, c, b, b, c, d);
  }
  const canopyGeometry = new THREE.BufferGeometry();
  canopyGeometry.setAttribute('position', new THREE.Float32BufferAttribute(canopyVertices, 3));
  canopyGeometry.setAttribute('color', new THREE.Float32BufferAttribute(canopyColors, 3));
  canopyGeometry.setIndex(canopyIndices);
  canopyGeometry.computeVertexNormals();
  const canopy = new THREE.Mesh(
    canopyGeometry,
    new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.72,
      metalness: 0.02,
      emissive: 0x0d302f,
      emissiveIntensity: 0.28,
      side: THREE.DoubleSide
    })
  );
  canopy.castShadow = true;
  glider.add(canopy);

  const trailingEdgePoints = [];
  for (let i = 0; i <= 20; i += 1) {
    const x = lerp(-5.7, 5.7, i / 20);
    const arch = 1.15 * (1 - Math.pow(x / 5.7, 2));
    trailingEdgePoints.push(new THREE.Vector3(x, arch - 0.34, 2.01));
  }
  const trailingEdge = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(trailingEdgePoints),
      40,
      0.075,
      6,
      false
    ),
    materials.gold
  );
  glider.add(trailingEdge);

  const canopyCrest = new THREE.Mesh(
    new THREE.CircleGeometry(0.9, 3),
    materials.gold
  );
  canopyCrest.rotation.x = -Math.PI / 2;
  canopyCrest.rotation.z = Math.PI;
  canopyCrest.position.set(0, 1.22, 0.2);
  glider.add(canopyCrest);

  const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 6.7, 8), materials.wood);
  bar.rotation.z = Math.PI / 2;
  bar.position.set(0, -1.15, 0.35);
  glider.add(bar);

  for (const x of [-4.9, -2.5, 2.5, 4.9]) {
    const points = [
      new THREE.Vector3(x, 0.15 + 0.85 * (1 - Math.abs(x) / 5.7), 0.3),
      new THREE.Vector3(x * 0.28, -3.45, 0.15)
    ];
    const ropeGeometry = new THREE.BufferGeometry().setFromPoints(points);
    glider.add(new THREE.Line(ropeGeometry, new THREE.LineBasicMaterial({ color: 0x4f3524 })));
  }

  const tassels = [];
  for (const x of [-5.45, 5.45]) {
    const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.0, 6), materials.gold);
    tassel.position.set(x, -0.15, 1.15);
    glider.add(tassel);
    tassels.push(tassel);
  }

  hero.add(glider);
  hero.userData = { arms, legs, glider, canopy, tassels };
  world.add(hero);
  return hero;
}

function createBirds() {
  const birds = [];
  for (let i = 0; i < 5; i += 1) {
    const bird = new THREE.Group();
    const wingGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-1.0, 0, 0),
      new THREE.Vector3(0, 0.35, 0),
      new THREE.Vector3(1.0, 0, 0)
    ]);
    const line = new THREE.Line(
      wingGeometry,
      new THREE.LineBasicMaterial({ color: 0x253a3d, linewidth: 2 })
    );
    bird.add(line);
    bird.position.set(-12 + i * 3, 17 + hash(i) * 5, -58 - i * 3);
    bird.userData.size = 0.7 + i * 0.12;
    bird.scale.setScalar(bird.userData.size);
    world.add(bird);
    birds.push(bird);
  }
  return birds;
}

createTerrain();
createRiver();
createCliffs();
const tower = createTower();
createTrees();
createCastle();
createMountains();
const clouds = createClouds();
const hero = createHero();
const birds = createBirds();

function updateHero(time) {
  let x;
  let y;
  let z;
  if (time <= 1.05) {
    const u = smoothstep(0.08, 1.05, time);
    x = lerp(-20.2, -8.0, u);
    z = lerp(24.0, -1.0, u);
    y = lerp(29.1, 18.7, u) + Math.sin(u * Math.PI) * 2.7;
  } else {
    const u = clamp01((time - 1.05) / (DURATION - 1.05));
    x = -8.0 + Math.sin(u * Math.PI * 1.45) * 3.4;
    z = lerp(-1.0, -76.0, u);
    y = lerp(18.7, 10.8, u) + Math.sin(u * Math.PI * 2.2) * 0.5;
  }
  hero.position.set(x, y, z);

  const open = smoothstep(0.67, 1.18, time);
  const openingPhase = clamp01((time - 0.67) / 0.51);
  const openingSnap = Math.sin(openingPhase * Math.PI) * 0.055;
  hero.userData.glider.visible = time > 0.56;
  hero.userData.glider.scale.set(
    lerp(0.06, 1, open) + openingSnap,
    lerp(0.35, 1, open),
    lerp(0.18, 1, open)
  );
  hero.userData.glider.rotation.z = Math.sin(time * 1.65) * 0.065 * open;
  hero.userData.glider.rotation.x = -0.05 + Math.sin(time * 3.1) * 0.018 * open;
  hero.userData.canopy.rotation.z = Math.sin(time * 5.5) * 0.015 * open;
  hero.userData.tassels[0].rotation.z = 0.15 + Math.sin(time * 5) * 0.1;
  hero.userData.tassels[1].rotation.z = -0.15 + Math.sin(time * 5 + 1.2) * 0.1;

  const glide = smoothstep(0.84, 1.35, time);
  const launchDive = smoothstep(0.12, 0.58, time);
  const airbornePitch = lerp(-0.10, -0.62, launchDive);
  hero.rotation.x = lerp(airbornePitch, -0.08, glide);
  hero.rotation.z = Math.sin(time * 1.35) * 0.09 * glide;
  hero.rotation.y = Math.sin(time * 0.7) * 0.065;
  for (let i = 0; i < hero.userData.arms.length; i += 1) {
    const side = i === 0 ? -1 : 1;
    hero.userData.arms[i].rotation.z = lerp(side * -1.25, side * 2.68, glide);
    hero.userData.arms[i].rotation.x = lerp(-0.4, -0.12, glide);
  }
  hero.userData.legs[0].rotation.x = Math.sin(time * 5.5) * 0.35 * (1 - glide) + 0.12;
  hero.userData.legs[1].rotation.x = -Math.sin(time * 5.5) * 0.35 * (1 - glide) - 0.18;
}

function updateCamera(time) {
  if (time < 1.22) {
    const u = smoothstep(0, 1.22, time);
    camera.position.set(
      lerp(-2.5, 1.5, u),
      lerp(35.0, 26.4, u),
      lerp(50.0, 22.5, u)
    );
    const target = new THREE.Vector3(
      lerp(-21.5, -5.7, u),
      lerp(27.5, 17.8, u),
      lerp(22.0, -17.0, u)
    );
    camera.lookAt(target);
  } else {
    const u = smoothstep(1.22, DURATION, time);
    const followX = lerp(9.5, 2.0, u);
    const followY = lerp(7.5, 13.0, u);
    const followZ = lerp(25.0, 35.0, u);
    camera.position.set(
      hero.position.x + followX,
      hero.position.y + followY,
      hero.position.z + followZ
    );
    const target = new THREE.Vector3(
      lerp(hero.position.x, 2, 0.18 + u * 0.32),
      lerp(hero.position.y + 1.8, 7, 0.22 + u * 0.42),
      lerp(hero.position.z - 18, -132, 0.22 + u * 0.45)
    );
    camera.lookAt(target);
  }
  camera.fov = lerp(44, 48, smoothstep(1.0, DURATION, time));
  camera.updateProjectionMatrix();
}

function updateWorld(time) {
  updateHero(time);
  updateCamera(time);
  tower.userData.flag.rotation.y = Math.sin(time * 2.3) * 0.08;
  const flagPosition = tower.userData.flag.geometry.attributes.position;
  for (let i = 0; i < flagPosition.count; i += 1) {
    const baseX = (i % 6) / 5 * 4.5 - 2.25;
    flagPosition.setZ(i, Math.sin(time * 4 + baseX * 2) * 0.13 * ((baseX + 2.25) / 4.5));
  }
  flagPosition.needsUpdate = true;
  tower.userData.flag.geometry.computeVertexNormals();
  clouds.forEach((cloud, i) => {
    cloud.position.x = cloud.userData.baseX + Math.sin(time * 0.11 + i) * 1.2;
  });
  birds.forEach((bird, i) => {
    bird.position.x = -12 + i * 3 + time * 1.4;
    bird.position.y = 17 + hash(i) * 5 + Math.sin(time * 2.7 + i) * 0.45;
    bird.rotation.z = Math.sin(time * 3.4 + i) * 0.12;
    bird.scale.set(
      bird.userData.size,
      bird.userData.size * (0.4 + Math.abs(Math.sin(time * 5.2 + i)) * 0.6),
      bird.userData.size
    );
  });
}

let currentTime = 0;
let paused = false;
let animationFrame = null;
let startTime = performance.now();

function renderAt(time) {
  currentTime = Math.min(DURATION, Math.max(0, Number(time) || 0));
  updateWorld(currentTime);
  renderer.render(scene, camera);
}

function animate(now) {
  if (paused) return;
  currentTime = ((now - startTime) / 1000) % DURATION;
  renderAt(currentTime);
  animationFrame = requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    paused = true;
    if (animationFrame !== null) cancelAnimationFrame(animationFrame);
    animationFrame = null;
    return currentTime;
  },
  seek(seconds) {
    renderAt(seconds);
    return currentTime;
  }
};

renderAt(0);
animationFrame = requestAnimationFrame(animate);
