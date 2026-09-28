import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 5;

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd98778);
scene.fog = new THREE.FogExp2(0xd88d76, 0.0082);

const camera = new THREE.PerspectiveCamera(66, WIDTH / HEIGHT, 0.05, 280);
camera.rotation.order = "YXZ";
scene.add(camera);

const hemi = new THREE.HemisphereLight(0xffc7a7, 0x445631, 2.1);
scene.add(hemi);

const sunLight = new THREE.DirectionalLight(0xffbd72, 4.6);
sunLight.position.set(-28, 34, 18);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
sunLight.shadow.camera.left = -34;
sunLight.shadow.camera.right = 34;
sunLight.shadow.camera.top = 28;
sunLight.shadow.camera.bottom = -15;
sunLight.shadow.camera.near = 1;
sunLight.shadow.camera.far = 120;
scene.add(sunLight);

const fill = new THREE.DirectionalLight(0xf5a9bd, 1.05);
fill.position.set(24, 16, -55);
scene.add(fill);

const MAT = {
  ground: new THREE.MeshStandardMaterial({ color: 0x61723a, roughness: 1 }),
  trail: new THREE.MeshStandardMaterial({ color: 0xa9824d, roughness: 1 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x968783, roughness: 0.95, flatShading: true }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x58515c, roughness: 1, flatShading: true }),
  roof: new THREE.MeshStandardMaterial({ color: 0x334f55, roughness: 0.8, metalness: 0.08 }),
  horse: new THREE.MeshStandardMaterial({ color: 0x4c241d, roughness: 0.9 }),
  horseLight: new THREE.MeshStandardMaterial({ color: 0x7a3f2a, roughness: 0.9 }),
  mane: new THREE.MeshStandardMaterial({ color: 0x211619, roughness: 1 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x251511, roughness: 0.82 }),
  rein: new THREE.MeshBasicMaterial({ color: 0x38160f }),
  skin: new THREE.MeshStandardMaterial({ color: 0xd49b70, roughness: 0.88 }),
  sleeve: new THREE.MeshStandardMaterial({ color: 0x31526a, roughness: 0.94 }),
  sleeveEdge: new THREE.MeshStandardMaterial({ color: 0xd7b24b, roughness: 0.72 }),
  deer: new THREE.MeshStandardMaterial({ color: 0x7f4228, roughness: 1 }),
  deerLight: new THREE.MeshStandardMaterial({ color: 0xc48a55, roughness: 1 }),
  deerDark: new THREE.MeshStandardMaterial({ color: 0x45291f, roughness: 1 }),
  antler: new THREE.MeshStandardMaterial({ color: 0xe1c99e, roughness: 0.95 }),
};

const ground = new THREE.Mesh(new THREE.PlaneGeometry(230, 250), MAT.ground);
ground.rotation.x = -Math.PI / 2;
ground.position.set(0, -0.06, -52);
ground.receiveShadow = true;
scene.add(ground);

const trail = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 160, 1, 1), MAT.trail);
trail.rotation.x = -Math.PI / 2;
trail.position.set(-0.3, -0.035, -35);
trail.receiveShadow = true;
scene.add(trail);

function mulberry32(seed) { window.__bfTrace?.add(81);
  return function random() {
    let value = (seed += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

const random = mulberry32(90421);

function makeBladeGeometry() { window.__bfTrace?.add(92);
  const positions = new Float32Array([
    -0.07, 0, 0, 0.07, 0, 0, 0.04, 0.72, 0.025,
    -0.07, 0, 0, 0.04, 0.72, 0.025, 0, 1.3, 0.07,
    0, 0, -0.07, 0, 0, 0.07, 0.025, 0.72, 0.04,
    0, 0, -0.07, 0.025, 0.72, 0.04, 0.07, 1.3, 0,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

const bladeGeometry = makeBladeGeometry();
const grassMeshes = [];
[
  [0x8b8a3d, 760],
  [0xb29a42, 590],
  [0x526f35, 530],
].forEach(([color, count], meshIndex) => {
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  const mesh = new THREE.InstancedMesh(bladeGeometry, material, count);
  mesh.receiveShadow = true;
  const dummy = new THREE.Object3D();
  for (let index = 0; index < count; index += 1) {
    const side = random() < 0.5 ? -1 : 1;
    const distance = 2.75 + Math.pow(random(), 1.55) * 26;
    const x = side * distance + Math.sin(index * 1.7) * 0.25;
    const z = 43 - random() * 137;
    const height = 0.72 + random() * 1.28;
    dummy.position.set(x, 0, z);
    dummy.rotation.set(0, random() * Math.PI, (random() - 0.5) * 0.08);
    dummy.scale.set(0.72 + random() * 0.75, height, 0.72 + random() * 0.75);
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  }
  mesh.instanceMatrix.needsUpdate = true;
  mesh.name = `grass-${meshIndex}`;
  scene.add(mesh);
  grassMeshes.push(mesh);
});

function createHill(x, z, scale, color) { window.__bfTrace?.add(139);
  const geometry = new THREE.ConeGeometry(scale, scale * 0.52, 7);
  const material = new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true });
  const hill = new THREE.Mesh(geometry, material);
  hill.position.set(x, scale * 0.19 - 0.2, z);
  hill.scale.z = 0.46;
  scene.add(hill);
}

[
  [-50, -101, 27, 0x59654f],
  [-26, -112, 22, 0x59664e],
  [39, -110, 28, 0x52634e],
  [63, -98, 23, 0x59674a],
  [-76, -107, 34, 0x4f5f4a],
].forEach((args) => createHill(...args));

function createSky() { window.__bfTrace?.add(156);
  const geometry = new THREE.PlaneGeometry(900, 240);
  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x735d9c) },
      middleColor: { value: new THREE.Color(0xe58a8f) },
      bottomColor: { value: new THREE.Color(0xf4ae75) },
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
      uniform vec3 middleColor;
      uniform vec3 bottomColor;
      void main() {
        vec3 lower = mix(bottomColor, middleColor, smoothstep(0.0, 0.47, vUv.y));
        vec3 color = mix(lower, topColor, smoothstep(0.44, 1.0, vUv.y));
        gl_FragColor = vec4(color, 1.0);
      }
    `,
  });
  const sky = new THREE.Mesh(geometry, material);
  sky.position.set(0, 52, -148);
  sky.renderOrder = -20;
  scene.add(sky);

  const sunMaterial = new THREE.MeshBasicMaterial({ color: 0xffd083, fog: false });
  const sun = new THREE.Mesh(new THREE.SphereGeometry(4.2, 32, 16), sunMaterial);
  sun.position.set(-30, 15.5, -129);
  scene.add(sun);
}
createSky();

function createCloud(x, y, z, scale, color) { window.__bfTrace?.add(198);
  const cloud = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 1,
    transparent: true,
    opacity: 0.88,
    flatShading: true,
    depthWrite: false,
  });
  const puffs = [
    [-1.4, 0, 0, 1.2],
    [0, 0.3, 0, 1.55],
    [1.45, 0.05, 0, 1.05],
    [0.8, -0.35, 0.1, 1.3],
    [-0.6, -0.3, 0.1, 1.35],
  ];
  puffs.forEach(([px, py, pz, s]) => {
    const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(s, 1), material);
    puff.position.set(px, py, pz);
    puff.scale.set(1.75, 0.55, 0.48);
    cloud.add(puff);
  });
  cloud.position.set(x, y, z);
  cloud.scale.setScalar(scale);
  scene.add(cloud);
}

[
  [-44, 28, -125, 2.1, 0xeaa6a8],
  [-8, 35, -132, 2.45, 0xf0b0b0],
  [33, 26, -126, 2.2, 0xe9a19c],
  [60, 38, -136, 2.7, 0xd48eaa],
  [5, 19, -121, 1.35, 0xf1a083],
].forEach((args) => createCloud(...args));

function cylinderBetween(start, end, radius, material, radialSegments = 8) { window.__bfTrace?.add(234);
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const direction = end.clone().sub(start);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, direction.length(), radialSegments),
    material,
  );
  mesh.position.copy(midpoint);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function createCastle() { window.__bfTrace?.add(246);
  const castle = new THREE.Group();
  const plateau = new THREE.Mesh(new THREE.CylinderGeometry(12, 17, 4, 7), MAT.darkStone);
  plateau.position.y = 1.5;
  plateau.scale.z = 0.48;
  castle.add(plateau);

  const keep = new THREE.Mesh(new THREE.BoxGeometry(8, 9, 5.5), MAT.stone);
  keep.position.y = 7.3;
  castle.add(keep);

  const central = new THREE.Mesh(new THREE.CylinderGeometry(2.1, 2.7, 12, 8), MAT.stone);
  central.position.y = 12.4;
  castle.add(central);
  const centralRoof = new THREE.Mesh(new THREE.ConeGeometry(3.1, 5.4, 8), MAT.roof);
  centralRoof.position.y = 21;
  castle.add(centralRoof);

  [
    [-5.1, 6.8, 1.65, 7.5],
    [5.1, 6.8, 1.65, 7.5],
    [-3.5, 11.4, 1.3, 6.5],
    [3.5, 11.4, 1.3, 6.5],
  ].forEach(([x, y, r, h], index) => {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.82, r, h, 8), MAT.stone);
    tower.position.set(x, y, index < 2 ? 0 : -0.5);
    castle.add(tower);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(r * 1.28, 3.4, 8), MAT.roof);
    roof.position.set(x, y + h * 0.5 + 1.7, index < 2 ? 0 : -0.5);
    castle.add(roof);
  });

  const spire = cylinderBetween(
    new THREE.Vector3(0, 23.1, 0),
    new THREE.Vector3(0, 27.2, 0),
    0.15,
    MAT.darkStone,
    6,
  );
  castle.add(spire);

  const bridge = new THREE.Mesh(new THREE.BoxGeometry(12, 1.1, 2.5), MAT.stone);
  bridge.position.set(0, 5.2, 0.4);
  castle.add(bridge);

  const windowMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd27a,
    emissive: 0xff8a32,
    emissiveIntensity: 1.4,
    roughness: 0.5,
  });
  [
    [-2.25, 7.5, 2.78],
    [0, 8.7, 2.78],
    [2.25, 7.5, 2.78],
    [-0.75, 13.4, 2.36],
    [0.75, 13.4, 2.36],
  ].forEach(([x, y, z]) => {
    const window = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.86, 0.12), windowMaterial);
    window.position.set(x, y, z);
    castle.add(window);
  });

  castle.position.set(10, 0, -117);
  castle.scale.setScalar(1.05);
  scene.add(castle);
}
createCastle();

function createRock(x, z, scale) { window.__bfTrace?.add(315);
  const rock = new THREE.Mesh(
    new THREE.DodecahedronGeometry(scale, 0),
    new THREE.MeshStandardMaterial({ color: 0x696557, roughness: 1, flatShading: true }),
  );
  rock.position.set(x, scale * 0.45, z);
  rock.scale.set(1.3, 0.65, 0.95);
  rock.rotation.set(random(), random() * Math.PI, random() * 0.4);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

for (let index = 0; index < 32; index += 1) {
  const side = random() < 0.5 ? -1 : 1;
  createRock(side * (5 + random() * 28), 36 - random() * 122, 0.24 + random() * 0.5);
}

const herd = [];

function createDeer(index) { window.__bfTrace?.add(335);
  const root = new THREE.Group();
  const scale = 0.85 + (index % 3) * 0.08;
  root.scale.setScalar(scale);

  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.25, 5, 10), MAT.deer);
  body.rotation.z = Math.PI / 2;
  body.position.y = 1.46;
  body.castShadow = true;
  root.add(body);

  const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.74, 4, 8), MAT.deerLight);
  belly.rotation.z = Math.PI / 2;
  belly.position.set(-0.05, 1.17, 0);
  root.add(belly);

  const neck = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.72, 4, 8), MAT.deer);
  neck.rotation.z = -0.42;
  neck.position.set(0.78, 1.95, 0);
  root.add(neck);

  const head = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 0.48, 5, 9), MAT.deer);
  head.rotation.z = Math.PI / 2;
  head.position.set(1.24, 2.36, 0);
  root.add(head);

  const muzzle = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.27, 4, 8), MAT.deerDark);
  muzzle.rotation.z = Math.PI / 2;
  muzzle.position.set(1.58, 2.28, 0);
  root.add(muzzle);

  [-1, 1].forEach((side) => {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 7, 5),
      new THREE.MeshBasicMaterial({ color: 0x17110e }),
    );
    eye.position.set(1.43, 2.48, side * 0.24);
    root.add(eye);

    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.45, 5), MAT.deer);
    ear.position.set(1.13, 2.72, side * 0.19);
    ear.rotation.z = side * 0.22;
    root.add(ear);
  });

  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.52, 6), MAT.deerLight);
  tail.position.set(-1.05, 1.6, 0);
  tail.rotation.z = -1.18;
  root.add(tail);

  const legs = [];
  [
    [-0.67, -0.31],
    [-0.67, 0.31],
    [0.58, -0.31],
    [0.58, 0.31],
  ].forEach(([x, z], legIndex) => {
    const pivot = new THREE.Group();
    pivot.position.set(x, 1.08, z);
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.075, 0.73, 6), MAT.deer);
    upper.position.y = -0.34;
    pivot.add(upper);
    const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.055, 0.62, 6), MAT.deerDark);
    hoof.position.set(0.04, -0.96, 0);
    hoof.rotation.z = 0.11;
    pivot.add(hoof);
    root.add(pivot);
    legs.push({ pivot, phase: legIndex % 2 === 0 ? 0 : Math.PI });
  });

  if (index === 0 || index === 3) {
    [-1, 1].forEach((side) => {
      const antlerRoot = new THREE.Group();
      antlerRoot.position.set(1.17, 2.62, side * 0.1);
      const main = cylinderBetween(
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(-0.07, 0.67, side * 0.2),
        0.035,
        MAT.antler,
        5,
      );
      antlerRoot.add(main);
      const branch = cylinderBetween(
        new THREE.Vector3(-0.04, 0.38, side * 0.12),
        new THREE.Vector3(0.2, 0.7, side * 0.27),
        0.028,
        MAT.antler,
        5,
      );
      antlerRoot.add(branch);
      root.add(antlerRoot);
    });
  }

  root.userData = { legs, phase: index * 0.81 };
  scene.add(root);
  return root;
}

for (let index = 0; index < 7; index += 1) {
  herd.push(createDeer(index));
}

function makeTube(points, radius, material) { window.__bfTrace?.add(438);
  const curve = new THREE.CatmullRomCurve3(points);
  return new THREE.Mesh(new THREE.TubeGeometry(curve, 24, radius, 6, false), material);
}

const cockpit = new THREE.Group();
camera.add(cockpit);

const horseHead = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 1.24, 8, 14), MAT.horse);
horseHead.rotation.x = Math.PI / 2;
horseHead.position.set(0, -0.92, -2.15);
horseHead.scale.set(0.8, 1, 0.92);
cockpit.add(horseHead);

const muzzle = new THREE.Mesh(new THREE.CapsuleGeometry(0.35, 0.65, 7, 12), MAT.horseLight);
muzzle.rotation.x = Math.PI / 2;
muzzle.position.set(0, -0.75, -2.78);
cockpit.add(muzzle);

[-1, 1].forEach((side) => {
  const ear = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.67, 7), MAT.horse);
  ear.position.set(side * 0.28, -0.16, -2.6);
  ear.rotation.x = -0.24;
  ear.rotation.z = side * -0.14;
  cockpit.add(ear);
});

const mane = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1.3, 7), MAT.mane);
mane.position.set(0, -0.67, -1.72);
mane.rotation.x = Math.PI / 2;
cockpit.add(mane);

const bridle = makeTube(
  [
    new THREE.Vector3(-0.33, -0.64, -2.52),
    new THREE.Vector3(0, -0.52, -2.72),
    new THREE.Vector3(0.33, -0.64, -2.52),
  ],
  0.045,
  MAT.rein,
);
cockpit.add(bridle);

[-1, 1].forEach((side) => {
  const ring = new THREE.Mesh(
    new THREE.TorusGeometry(0.11, 0.025, 6, 14),
    new THREE.MeshStandardMaterial({
      color: 0xe5b34e,
      metalness: 0.7,
      roughness: 0.32,
      emissive: 0x4b2605,
      emissiveIntensity: 0.35,
    }),
  );
  ring.position.set(side * 0.3, -0.61, -2.54);
  cockpit.add(ring);
});

const hands = [];
[-1, 1].forEach((side) => {
  const armStart = new THREE.Vector3(side * 1.34, -1.02, -1.08);
  const armEnd = new THREE.Vector3(side * 0.58, -0.63, -1.73);
  const arm = cylinderBetween(armStart, armEnd, 0.18, MAT.sleeve, 10);
  cockpit.add(arm);

  const cuff = cylinderBetween(
    armEnd.clone().add(new THREE.Vector3(side * 0.08, -0.04, 0.07)),
    armEnd.clone().add(new THREE.Vector3(side * -0.11, 0.07, -0.12)),
    0.205,
    MAT.sleeveEdge,
    10,
  );
  cockpit.add(cuff);

  const hand = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.24, 6, 10), MAT.skin);
  hand.rotation.z = Math.PI / 2 + side * 0.12;
  hand.position.copy(armEnd).add(new THREE.Vector3(side * -0.13, 0.09, -0.18));
  cockpit.add(hand);
  hands.push(hand);
});

const leftRein = makeTube(
  [
    new THREE.Vector3(-0.49, -0.53, -1.82),
    new THREE.Vector3(-0.35, -0.45, -2.1),
    new THREE.Vector3(-0.27, -0.61, -2.55),
  ],
  0.04,
  MAT.rein,
);
const rightRein = makeTube(
  [
    new THREE.Vector3(0.49, -0.53, -1.82),
    new THREE.Vector3(0.35, -0.45, -2.1),
    new THREE.Vector3(0.27, -0.61, -2.55),
  ],
  0.04,
  MAT.rein,
);
cockpit.add(leftRein, rightRein);

const dustGeometry = new THREE.SphereGeometry(0.08, 5, 4);
const dustMaterial = new THREE.MeshBasicMaterial({
  color: 0xe3bd82,
  transparent: true,
  opacity: 0.42,
  depthWrite: false,
});
const dust = [];
for (let index = 0; index < 40; index += 1) {
  const particle = new THREE.Mesh(dustGeometry, dustMaterial.clone());
  scene.add(particle);
  dust.push(particle);
}

function smoothstep(edge0, edge1, value) { window.__bfTrace?.add(553);
  const x = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
}

function horsePathX(time) { window.__bfTrace?.add(558);
  return -4.55 * smoothstep(1.62, 2.5, time) + 4.55 * smoothstep(2.88, 4.3, time);
}

function horsePathDx(time) { window.__bfTrace?.add(562);
  const epsilon = 0.002;
  return (horsePathX(time + epsilon) - horsePathX(time - epsilon)) / (epsilon * 2);
}

let currentTime = 0;
let paused = true;

function update(time) { window.__bfTrace?.add(570);
  currentTime = THREE.MathUtils.clamp(time, 0, DURATION);
  const t = currentTime;
  const x = horsePathX(t);
  const z = 28 - 15.2 * t;
  const stride = t * Math.PI * 6;
  const bob = Math.sin(stride) * 0.105 + Math.sin(stride * 2 + 0.4) * 0.022;
  const sideBob = Math.sin(stride * 0.5) * 0.04;
  const pathVelocity = horsePathDx(t);

  camera.position.set(x + sideBob, 3.48 + bob, z);
  const target = new THREE.Vector3(
    x + pathVelocity * 0.4,
    3.28 + Math.sin(stride + 0.7) * 0.035,
    z - 13,
  );
  camera.up.set(Math.sin(stride * 0.5) * 0.014 - pathVelocity * 0.007, 1, 0);
  camera.lookAt(target);

  cockpit.position.y = -0.09 + Math.sin(stride + 0.55) * 0.032;
  cockpit.rotation.z = Math.sin(stride * 0.5) * 0.018 - pathVelocity * 0.006;
  cockpit.rotation.x = Math.sin(stride) * 0.012;
  hands[0].rotation.x = Math.sin(stride + 0.2) * 0.09;
  hands[1].rotation.x = Math.sin(stride + 0.65) * 0.09;

  herd.forEach((animal, index) => {
    const depthOffsets = [0, 2.5, 5.6, 9.2, 12.1, 15.9, 19.2];
    const crossingBurst = 6 * smoothstep(1.35, 2.35, t);
    const exitRun = Math.max(0, t - 2.35) * 3;
    animal.position.x = -17.8 + t * (3.5 + index * 0.07) + crossingBurst + exitRun
      - (index % 2) * 0.8;
    animal.position.z = -13.4 - depthOffsets[index];
    const gallop = t * 12.5 + animal.userData.phase;
    animal.position.y = Math.max(0, Math.sin(gallop * 2)) * 0.18;
    animal.rotation.y = -0.05 + Math.sin(gallop * 0.25) * 0.025;
    animal.rotation.z = Math.sin(gallop) * 0.035;
    animal.userData.legs.forEach(({ pivot, phase }) => {
      pivot.rotation.z = Math.sin(gallop + phase) * 0.72;
    });
  });

  dust.forEach((particle, index) => {
    const cycle = (t * (0.55 + (index % 5) * 0.04) + index * 0.137) % 1;
    const side = index % 2 === 0 ? -1 : 1;
    particle.position.set(
      x + side * (1.4 + (index % 7) * 0.3) + Math.sin(index * 2.2) * 0.7,
      0.18 + cycle * 1.4,
      z + 3.5 + cycle * 5 + (index % 4),
    );
    const size = 0.5 + cycle * 2.8;
    particle.scale.setScalar(size);
    particle.material.opacity = (1 - cycle) * 0.3;
  });

  renderer.render(scene, camera);
}

window.reconstruction = {
  pause() {
    paused = true;
  },
  seek(seconds) {
    paused = true;
    update(Number(seconds));
  },
  getState() {
    return {
      time: currentTime,
      paused,
      camera: camera.position.toArray(),
      herd: herd.map((animal) => animal.position.toArray()),
    };
  },
};

window.addEventListener("resize", () => {
  renderer.setSize(WIDTH, HEIGHT, false);
  renderer.render(scene, camera);
});

update(0);
