import * as THREE from "../vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;
const TAU = Math.PI * 2;
const gaitRate = 1.38;

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const lerp = (a, b, t) => a + (b - a) * t;
const fract = (value) => value - Math.floor(value);
const smoothstep = (edge0, edge1, value) => {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return x * x * (3 - 2 * x);
};
const hash = (value) => fract(Math.sin(value * 91.733 + 14.37) * 43758.5453);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.08;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xd98762, 0.012);

const camera = new THREE.PerspectiveCamera(35, WIDTH / HEIGHT, 0.1, 140);
camera.up.set(0, 1, 0);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();
void maxAnisotropy;

const skyMaterial = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: {},
  vertexShader: `
    varying vec3 vWorldPosition;
    void main() {
      vec4 worldPosition = modelMatrix * vec4(position, 1.0);
      vWorldPosition = worldPosition.xyz;
      gl_Position = projectionMatrix * viewMatrix * worldPosition;
    }
  `,
  fragmentShader: `
    varying vec3 vWorldPosition;
    void main() {
      float h = normalize(vWorldPosition).y;
      vec3 horizon = vec3(0.98, 0.54, 0.34);
      vec3 middle = vec3(0.71, 0.40, 0.48);
      vec3 zenith = vec3(0.18, 0.27, 0.48);
      float upper = smoothstep(-0.03, 0.72, h);
      vec3 color = mix(horizon, middle, smoothstep(0.0, 0.28, h));
      color = mix(color, zenith, smoothstep(0.22, 0.82, h));
      float glow = exp(-pow((h - 0.04) * 5.0, 2.0));
      color += vec3(0.20, 0.07, 0.015) * glow;
      gl_FragColor = vec4(color, 1.0);
    }
  `,
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(90, 40, 24), skyMaterial);
scene.add(sky);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(1.45, 32, 16),
  new THREE.MeshBasicMaterial({ color: 0xffd188, fog: false }),
);
sun.position.set(-14, 7.4, -30);
scene.add(sun);

const sunHalo = new THREE.Mesh(
  new THREE.SphereGeometry(2.15, 32, 16),
  new THREE.MeshBasicMaterial({
    color: 0xffad70,
    transparent: true,
    opacity: 0.16,
    depthWrite: false,
    fog: false,
  }),
);
sunHalo.position.copy(sun.position);
scene.add(sunHalo);

const hemiLight = new THREE.HemisphereLight(0xffd5b0, 0x29413c, 2.1);
scene.add(hemiLight);

const keyLight = new THREE.DirectionalLight(0xffc38f, 4.4);
keyLight.position.set(-12, 16, 10);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -14;
keyLight.shadow.camera.right = 14;
keyLight.shadow.camera.top = 11;
keyLight.shadow.camera.bottom = -6;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 50;
keyLight.shadow.bias = -0.0006;
scene.add(keyLight);
scene.add(keyLight.target);

const rimLight = new THREE.DirectionalLight(0xff7b53, 2.2);
rimLight.position.set(-10, 7, -12);
scene.add(rimLight);

const riverBedMaterial = new THREE.MeshStandardMaterial({
  color: 0x8b7254,
  roughness: 0.96,
  metalness: 0,
});
const riverBed = new THREE.Mesh(new THREE.BoxGeometry(62, 0.35, 34), riverBedMaterial);
riverBed.position.set(2, -0.32, 0);
riverBed.receiveShadow = true;
scene.add(riverBed);

const waterGeometry = new THREE.PlaneGeometry(62, 28, 64, 28);
const waterBase = new Float32Array(waterGeometry.attributes.position.array);
const waterMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x3d91a2,
  emissive: 0x143a42,
  emissiveIntensity: 0.2,
  roughness: 0.17,
  metalness: 0.08,
  transparent: true,
  opacity: 0.72,
  transmission: 0.14,
  clearcoat: 0.58,
  clearcoatRoughness: 0.19,
  side: THREE.DoubleSide,
});
const water = new THREE.Mesh(waterGeometry, waterMaterial);
water.rotation.x = -Math.PI / 2;
water.position.set(2, 0, 0);
water.receiveShadow = true;
scene.add(water);

const bankMaterial = new THREE.MeshStandardMaterial({
  color: 0x5d5638,
  roughness: 0.98,
});
const leftBank = new THREE.Mesh(new THREE.BoxGeometry(20, 0.7, 32), bankMaterial);
leftBank.position.set(-17.2, 0.08, 0);
leftBank.receiveShadow = true;
scene.add(leftBank);
const rightBank = leftBank.clone();
rightBank.position.x = 20.2;
scene.add(rightBank);

const ridgeMaterial = new THREE.MeshStandardMaterial({
  color: 0x554357,
  roughness: 1,
  flatShading: true,
});
const ridgeMaterialWarm = new THREE.MeshStandardMaterial({
  color: 0x75525a,
  roughness: 1,
  flatShading: true,
});
const ridges = [
  [-27, 4.2, -24, 8.5, 16, ridgeMaterial],
  [-14, 3.6, -29, 6.2, 13, ridgeMaterialWarm],
  [-2, 4.7, -26, 9.5, 19, ridgeMaterial],
  [13, 3.8, -29, 8.0, 16, ridgeMaterialWarm],
  [26, 5.1, -25, 10.0, 18, ridgeMaterial],
  [39, 4.0, -28, 8.5, 15, ridgeMaterialWarm],
];
for (const [x, y, z, radius, height, material] of ridges) {
  const ridge = new THREE.Mesh(new THREE.ConeGeometry(radius, height, 5), material);
  ridge.position.set(x, y - 2.8, z);
  ridge.rotation.y = x * 0.07;
  ridge.receiveShadow = true;
  scene.add(ridge);
}

const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x493829, roughness: 1 });
const leafMaterials = [
  new THREE.MeshStandardMaterial({ color: 0x334b37, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x4a5738, roughness: 1 }),
  new THREE.MeshStandardMaterial({ color: 0x5f5a35, roughness: 1 }),
];
const treePositions = [
  [-22, -13, 2.8, 0],
  [-17, -15, 3.7, 1],
  [-10, -12.5, 2.4, 2],
  [-3, -14, 3.3, 0],
  [5, -13, 2.7, 1],
  [12, -15, 4.0, 2],
  [19, -12.5, 3.0, 0],
  [27, -14, 3.6, 1],
  [34, -13, 2.6, 2],
];
for (const [x, z, height, materialIndex] of treePositions) {
  const tree = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.19, height * 0.6, 7),
    trunkMaterial,
  );
  trunk.position.y = height * 0.3;
  trunk.castShadow = true;
  tree.add(trunk);
  for (let layer = 0; layer < 3; layer += 1) {
    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.78 - layer * 0.12, 1.35, 8),
      leafMaterials[materialIndex],
    );
    canopy.position.y = height * 0.5 + layer * 0.52;
    canopy.castShadow = true;
    tree.add(canopy);
  }
  tree.position.set(x, 0.22, z);
  scene.add(tree);
}

const rockMaterial = new THREE.MeshStandardMaterial({
  color: 0x67635c,
  roughness: 0.88,
  flatShading: true,
});
const rockPositions = [
  [-5.0, -3.5, 0.28, 0.65],
  [-1.3, 4.2, 0.2, 0.48],
  [3.6, -4.5, 0.25, 0.58],
  [7.8, 3.0, 0.3, 0.8],
  [12.4, -2.2, 0.22, 0.52],
  [17.2, 5.0, 0.36, 0.95],
];
for (const [x, z, y, scale] of rockPositions) {
  const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.65, 0), rockMaterial);
  rock.position.set(x, y, z);
  rock.scale.set(scale * 1.35, scale, scale);
  rock.rotation.set(z * 0.07, x * 0.13, x * 0.05);
  rock.castShadow = true;
  rock.receiveShadow = true;
  scene.add(rock);
}

const currentLines = [];
const currentMaterials = [
  new THREE.MeshBasicMaterial({
    color: 0xbde6e1,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
  new THREE.MeshBasicMaterial({
    color: 0xffc19c,
    transparent: true,
    opacity: 0.2,
    depthWrite: false,
    side: THREE.DoubleSide,
  }),
];
for (let i = 0; i < 36; i += 1) {
  const length = 0.5 + hash(i + 11) * 1.5;
  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(length, 0.018 + hash(i + 4) * 0.022),
    currentMaterials[i % 5 === 0 ? 1 : 0],
  );
  line.rotation.x = -Math.PI / 2;
  line.position.set(-9 + hash(i + 31) * 26, 0.055, -10 + hash(i + 17) * 20);
  line.userData.baseZ = line.position.z;
  line.userData.phase = hash(i + 51) * TAU;
  line.renderOrder = 2;
  scene.add(line);
  currentLines.push(line);
}

const reedMaterial = new THREE.MeshStandardMaterial({ color: 0x8b7b3b, roughness: 0.9 });
for (let i = 0; i < 28; i += 1) {
  const side = i % 2 === 0 ? -1 : 1;
  const x = side < 0 ? -7.1 - hash(i + 1) * 1.1 : 8.2 + hash(i + 2) * 1.2;
  const z = -10 + hash(i + 5) * 20;
  const height = 0.55 + hash(i + 9) * 0.75;
  const reed = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.028, height, 5),
    reedMaterial,
  );
  reed.position.set(x, 0.34 + height * 0.5, z);
  reed.rotation.z = (hash(i + 20) - 0.5) * 0.12;
  reed.castShadow = true;
  scene.add(reed);
}

const coatMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x84391f,
  roughness: 0.48,
  metalness: 0.02,
  clearcoat: 0.22,
  clearcoatRoughness: 0.42,
});
const coatLightMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xa95029,
  roughness: 0.46,
  clearcoat: 0.28,
  clearcoatRoughness: 0.38,
});
const coatDarkMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x52251e,
  roughness: 0.63,
  clearcoat: 0.14,
});
const blackMaterial = new THREE.MeshStandardMaterial({
  color: 0x171516,
  roughness: 0.72,
});
const maneMaterial = new THREE.MeshStandardMaterial({
  color: 0x2b1a19,
  roughness: 0.86,
  flatShading: true,
});
const whiteMarkMaterial = new THREE.MeshStandardMaterial({
  color: 0xf1d6b7,
  roughness: 0.72,
});

const horse = new THREE.Group();
scene.add(horse);
const horseCore = new THREE.Group();
horse.add(horseCore);

function addHorseMesh(geometry, material, position, scale, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  horseCore.add(mesh);
  return mesh;
}

const sphereGeometry = new THREE.SphereGeometry(1, 28, 18);
const body = addHorseMesh(sphereGeometry, coatMaterial, [-0.15, 2.38, 0], [1.58, 0.75, 0.67]);
const chest = addHorseMesh(sphereGeometry, coatLightMaterial, [0.92, 2.45, 0], [0.75, 0.78, 0.69]);
const rump = addHorseMesh(sphereGeometry, coatMaterial, [-1.2, 2.4, 0], [0.82, 0.8, 0.7]);
const neck = addHorseMesh(
  sphereGeometry,
  coatLightMaterial,
  [1.2, 3.05, 0],
  [0.5, 1.08, 0.48],
  [0, 0, -0.58],
);
const head = addHorseMesh(
  sphereGeometry,
  coatLightMaterial,
  [1.96, 3.55, 0],
  [0.78, 0.43, 0.4],
  [0, 0, 0.08],
);
const muzzle = addHorseMesh(
  sphereGeometry,
  coatDarkMaterial,
  [2.55, 3.38, 0],
  [0.52, 0.33, 0.34],
  [0, 0, -0.05],
);
const nose = addHorseMesh(
  sphereGeometry,
  blackMaterial,
  [2.91, 3.35, 0],
  [0.19, 0.26, 0.28],
);
const blaze = addHorseMesh(
  sphereGeometry,
  whiteMarkMaterial,
  [2.03, 3.93, 0],
  [0.36, 0.055, 0.13],
  [0, 0, -0.08],
);

const earGeometry = new THREE.ConeGeometry(0.17, 0.62, 7);
const leftEar = addHorseMesh(earGeometry, coatDarkMaterial, [1.72, 4.03, 0.23], [1, 1, 0.72], [0.04, 0, -0.08]);
const rightEar = addHorseMesh(earGeometry, coatMaterial, [2.02, 4.04, -0.18], [0.95, 1, 0.72], [-0.02, 0, 0.12]);

const eyeGeometry = new THREE.SphereGeometry(0.075, 14, 10);
for (const z of [-0.37, 0.37]) {
  const eye = new THREE.Mesh(eyeGeometry, blackMaterial);
  eye.position.set(2.2, 3.7, z);
  eye.castShadow = true;
  horseCore.add(eye);
}

const nostrilGeometry = new THREE.SphereGeometry(0.055, 10, 8);
for (const z of [-0.2, 0.2]) {
  const nostril = new THREE.Mesh(nostrilGeometry, blackMaterial);
  nostril.position.set(3.02, 3.41, z);
  horseCore.add(nostril);
}

const maneTufts = [];
const maneGeometry = new THREE.ConeGeometry(0.18, 0.6, 5);
for (let i = 0; i < 8; i += 1) {
  const u = i / 7;
  const tuft = new THREE.Mesh(maneGeometry, maneMaterial);
  tuft.position.set(lerp(0.36, 1.64, u), lerp(2.88, 3.88, u) + Math.sin(u * Math.PI) * 0.14, -0.08);
  tuft.rotation.set(0.16, 0, 1.52 - u * 0.16);
  tuft.scale.set(1 - u * 0.18, 1, 1);
  tuft.castShadow = true;
  horseCore.add(tuft);
  maneTufts.push(tuft);
}

const legDefinitions = [
  { name: "hind-far", rootX: -1.12, z: -0.37, phase: 0.00, hind: true, near: false },
  { name: "hind-near", rootX: -1.08, z: 0.4, phase: 0.89, hind: true, near: true },
  { name: "fore-far", rootX: 0.94, z: -0.35, phase: 0.63, hind: false, near: false },
  { name: "fore-near", rootX: 1.02, z: 0.42, phase: 0.52, hind: false, near: true },
];

const unitLegGeometry = new THREE.CylinderGeometry(0.11, 0.15, 1, 9);
const unitCannonGeometry = new THREE.CylinderGeometry(0.075, 0.11, 1, 8);
const jointGeometry = new THREE.SphereGeometry(0.145, 12, 8);
const hoofGeometry = new THREE.BoxGeometry(0.34, 0.17, 0.28);
const legs = [];

for (const definition of legDefinitions) {
  const material = definition.near ? coatLightMaterial : coatDarkMaterial;
  const segmentCount = definition.hind ? 3 : 2;
  const segments = [];
  for (let i = 0; i < segmentCount; i += 1) {
    const segment = new THREE.Mesh(i === segmentCount - 1 ? unitCannonGeometry : unitLegGeometry, material);
    segment.castShadow = true;
    horse.add(segment);
    segments.push(segment);
  }
  const joints = [];
  for (let i = 0; i < segmentCount - 1; i += 1) {
    const joint = new THREE.Mesh(jointGeometry, material);
    joint.castShadow = true;
    horse.add(joint);
    joints.push(joint);
  }
  const hoof = new THREE.Mesh(hoofGeometry, blackMaterial);
  hoof.castShadow = true;
  horse.add(hoof);
  legs.push({ ...definition, segments, joints, hoof, foot: new THREE.Vector3() });
}

const tailStrands = [];
const tailGeometry = new THREE.CylinderGeometry(0.07, 0.15, 1, 7);
for (let strandIndex = 0; strandIndex < 3; strandIndex += 1) {
  const segments = [];
  const segmentCount = strandIndex === 1 ? 9 : 8;
  for (let i = 0; i < segmentCount; i += 1) {
    const segment = new THREE.Mesh(tailGeometry, maneMaterial);
    const strandScale = strandIndex === 1 ? 1 : 0.72;
    segment.scale.x = strandScale * (1 - i * 0.06);
    segment.scale.z = strandScale * (1 - i * 0.06);
    segment.castShadow = true;
    horse.add(segment);
    segments.push(segment);
  }
  tailStrands.push({
    segments,
    zOffset: (strandIndex - 1) * 0.16,
    yOffset: strandIndex === 1 ? 0.04 : -0.05,
    phase: strandIndex * 0.72,
  });
}

const foamMaterialTemplate = {
  color: 0xd8f2ef,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  side: THREE.DoubleSide,
};
const rippleGeometry = new THREE.RingGeometry(0.72, 0.88, 48);
const splashGeometry = new THREE.SphereGeometry(0.055, 8, 6);
const splashSystems = [];
for (let legIndex = 0; legIndex < legs.length; legIndex += 1) {
  const rippleMaterial = new THREE.MeshBasicMaterial(foamMaterialTemplate);
  const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
  ripple.rotation.x = -Math.PI / 2;
  ripple.renderOrder = 3;
  scene.add(ripple);

  const droplets = [];
  for (let i = 0; i < 18; i += 1) {
    const dropletMaterial = new THREE.MeshBasicMaterial({
      color: i % 3 === 0 ? 0xf1ffff : 0xaedee1,
      transparent: true,
      opacity: 0,
      depthWrite: false,
    });
    const droplet = new THREE.Mesh(splashGeometry, dropletMaterial);
    droplet.scale.set(0.72, 1.5 + hash(i + legIndex * 17), 0.72);
    droplet.renderOrder = 4;
    scene.add(droplet);
    droplets.push(droplet);
  }
  splashSystems.push({ ripple, droplets });
}

const shadowDisc = new THREE.Mesh(
  new THREE.CircleGeometry(1.95, 40),
  new THREE.MeshBasicMaterial({
    color: 0x203b3b,
    transparent: true,
    opacity: 0.22,
    depthWrite: false,
  }),
);
shadowDisc.rotation.x = -Math.PI / 2;
shadowDisc.scale.set(1.35, 0.55, 1);
shadowDisc.renderOrder = 2;
scene.add(shadowDisc);

const unitY = new THREE.Vector3(0, 1, 0);
const workingDirection = new THREE.Vector3();
function alignSegment(mesh, start, end) {
  workingDirection.subVectors(end, start);
  const length = workingDirection.length();
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(unitY, workingDirection.normalize());
  mesh.scale.y = length;
}

function gaitFoot(definition, time) {
  const phase = fract(time * gaitRate + definition.phase);
  let x;
  let y;
  let lift = 0;
  if (phase < 0.3) {
    const stance = phase / 0.3;
    x = lerp(0.82, -0.86, stance);
    y = 0.105 + Math.sin(stance * Math.PI) * 0.018;
  } else {
    const swing = (phase - 0.3) / 0.7;
    const eased = smoothstep(0, 1, swing);
    x = lerp(-0.86, 0.82, eased);
    lift = Math.sin(swing * Math.PI);
    y = 0.12 + lift * (definition.hind ? 0.78 : 0.92);
  }
  return { phase, x: definition.rootX + x, y, lift };
}

function updateLeg(leg, time, bob, pitch) {
  const gait = gaitFoot(leg, time);
  const root = new THREE.Vector3(
    leg.rootX - Math.sin(pitch) * 0.3,
    2.08 + bob + (leg.hind ? 0.03 : -0.02),
    leg.z,
  );
  const foot = new THREE.Vector3(gait.x, gait.y, leg.z);
  leg.foot.copy(foot);

  if (leg.hind) {
    const stride = clamp((foot.x - leg.rootX) / 0.85, -1, 1);
    const stifle = new THREE.Vector3(
      root.x + 0.42 - stride * 0.12,
      root.y - 0.72 + gait.lift * 0.06,
      leg.z,
    );
    const hock = new THREE.Vector3(
      foot.x - 0.34 - gait.lift * 0.12,
      foot.y + 0.56 + gait.lift * 0.12,
      leg.z,
    );
    alignSegment(leg.segments[0], root, stifle);
    alignSegment(leg.segments[1], stifle, hock);
    alignSegment(leg.segments[2], hock, foot);
    leg.joints[0].position.copy(stifle);
    leg.joints[1].position.copy(hock);
  } else {
    const dx = foot.x - root.x;
    const dy = foot.y - root.y;
    const distance = Math.max(0.001, Math.sqrt(dx * dx + dy * dy));
    const upperLength = 1.13;
    const lowerLength = 1.12;
    const constrained = Math.min(distance, upperLength + lowerLength - 0.01);
    const along = (upperLength * upperLength - lowerLength * lowerLength + constrained * constrained)
      / (2 * constrained);
    const height = Math.sqrt(Math.max(0, upperLength * upperLength - along * along));
    const nx = dx / distance;
    const ny = dy / distance;
    const bend = leg.near ? -1 : -1;
    const knee = new THREE.Vector3(
      root.x + nx * along - ny * height * bend,
      root.y + ny * along + nx * height * bend,
      leg.z,
    );
    alignSegment(leg.segments[0], root, knee);
    alignSegment(leg.segments[1], knee, foot);
    leg.joints[0].position.copy(knee);
  }
  leg.hoof.position.copy(foot);
  leg.hoof.position.y += 0.015;
  leg.hoof.rotation.set(0, 0, -0.08 + Math.sin((gait.phase + 0.1) * TAU) * 0.08);
}

function updateTail(time, bob) {
  for (const strand of tailStrands) {
    const points = [new THREE.Vector3(
      -1.58,
      2.68 + bob + strand.yOffset,
      strand.zOffset * 0.25,
    )];
    for (let i = 1; i <= strand.segments.length; i += 1) {
      const u = i / strand.segments.length;
      const previous = points[i - 1];
      const wave = Math.sin(time * 5.4 - i * 0.62 + strand.phase);
      points.push(new THREE.Vector3(
        previous.x - (0.27 + u * 0.045),
        previous.y - 0.09 + wave * 0.11 * u,
        previous.z
          + strand.zOffset * 0.14
          + Math.cos(time * 4.1 - i * 0.7 + strand.phase) * 0.12 * u,
      ));
    }
    for (let i = 0; i < strand.segments.length; i += 1) {
      alignSegment(strand.segments[i], points[i], points[i + 1]);
    }
  }
}

function horseXAt(time) {
  return -5.55 + time * 2.56;
}

function updateSplash(system, leg, legIndex, time) {
  const cycle = Math.floor(time * gaitRate + leg.phase);
  const eventTime = (cycle - leg.phase) / gaitRate;
  const age = time - eventTime;
  const visible = eventTime >= 0 && age >= 0 && age < 0.58;
  const eventX = horseXAt(eventTime) + leg.rootX + 0.82;
  const eventZ = leg.z;

  system.ripple.visible = visible;
  if (visible) {
    const rippleScale = 0.25 + age * 2.2;
    system.ripple.position.set(eventX, 0.045, eventZ);
    system.ripple.scale.setScalar(rippleScale);
    system.ripple.material.opacity = (1 - age / 0.58) * 0.48;
  }

  for (let i = 0; i < system.droplets.length; i += 1) {
    const droplet = system.droplets[i];
    const delay = hash(i * 1.3 + legIndex * 12.7) * 0.045;
    const particleAge = age - delay;
    const speed = 1.6 + hash(i + legIndex * 23) * 2.0;
    const side = hash(i * 4.2 + legIndex) * 2 - 1;
    const forward = hash(i * 7.1 + legIndex * 5) * 2 - 0.75;
    const life = 0.36 + hash(i * 2.9 + 7) * 0.16;
    const particleVisible = visible && particleAge >= 0 && particleAge < life;
    droplet.visible = particleVisible;
    if (particleVisible) {
      droplet.position.set(
        eventX + forward * speed * particleAge,
        0.1 + (2.2 + hash(i + 19) * 2.1) * particleAge - 5.5 * particleAge * particleAge,
        eventZ + side * speed * 0.72 * particleAge,
      );
      droplet.material.opacity = clamp(1 - particleAge / life, 0, 1) * 0.9;
      const stretch = 1 + clamp(particleAge * 5, 0, 1);
      droplet.scale.y = stretch * (1.1 + hash(i + 1));
    }
  }
}

function updateWater(time) {
  const positions = waterGeometry.attributes.position.array;
  for (let i = 0; i < positions.length; i += 3) {
    const x = waterBase[i];
    const z = waterBase[i + 1];
    positions[i + 2] = (
      Math.sin(x * 0.45 + time * 1.45)
      + Math.sin(z * 0.72 - time * 1.12)
      + Math.sin((x + z) * 0.26 + time * 0.72)
    ) * 0.014;
  }
  waterGeometry.attributes.position.needsUpdate = true;
  waterGeometry.computeVertexNormals();
  for (const line of currentLines) {
    line.position.z = line.userData.baseZ + Math.sin(time * 0.8 + line.userData.phase) * 0.16;
    line.position.y = 0.052 + Math.sin(time * 1.3 + line.userData.phase) * 0.006;
  }
}

function updateCamera(time, horseWorldX) {
  const arc = smoothstep(2.05, 4.9, time);
  const relativeX = lerp(-0.25, 4.65, arc);
  const relativeZ = lerp(9.8, 7.8, arc);
  const cameraBob = Math.sin(time * 1.7) * 0.025;
  camera.position.set(horseWorldX + relativeX, 3.72 + cameraBob, relativeZ);
  const target = new THREE.Vector3(
    horseWorldX + lerp(0.05, 0.3, arc),
    lerp(1.95, 2.05, arc),
    0,
  );
  camera.lookAt(target);
  camera.rotateZ(lerp(-0.012, 0.014, arc));
}

function updateScene(time) {
  const t = clamp(time, 0, DURATION);
  const horseWorldX = horseXAt(t);
  const gaitCycle = fract(t * gaitRate);
  const gaitAngle = gaitCycle * TAU;
  const bob = 0.08 + Math.sin(TAU * (gaitCycle - 0.4)) * 0.11;
  const pitch = Math.sin(TAU * (gaitCycle - 0.12)) * 0.045;

  horse.position.set(horseWorldX, 0, 0);
  horseCore.position.y = bob;
  horseCore.rotation.z = pitch;
  body.scale.y = 0.75 + Math.sin(gaitAngle * 2) * 0.018;
  chest.scale.y = 0.78 + Math.sin(gaitAngle * 2 + 0.5) * 0.02;
  head.rotation.z = 0.08 - pitch * 1.8 + Math.sin(gaitAngle * 2 + 0.4) * 0.025;
  muzzle.rotation.z = -0.05 - pitch * 1.25;
  leftEar.rotation.z = -0.08 + Math.sin(gaitAngle + 0.4) * 0.09;
  rightEar.rotation.z = 0.12 + Math.sin(gaitAngle + 1.2) * 0.07;

  for (let i = 0; i < maneTufts.length; i += 1) {
    maneTufts[i].rotation.z = 1.5 - i * 0.018 + Math.sin(t * 7.4 - i * 0.68) * 0.16;
    maneTufts[i].rotation.x = 0.14 + Math.cos(t * 5.2 - i * 0.4) * 0.11;
  }

  for (const leg of legs) {
    updateLeg(leg, t, bob, pitch);
  }
  updateTail(t, bob);
  updateWater(t);

  for (let i = 0; i < splashSystems.length; i += 1) {
    updateSplash(splashSystems[i], legs[i], i, t);
  }

  shadowDisc.position.set(horseWorldX - 0.1, 0.054, 0);
  shadowDisc.material.opacity = 0.17 + Math.sin(gaitAngle * 2) * 0.035;

  keyLight.target.position.set(horseWorldX, 1.6, 0);
  updateCamera(t, horseWorldX);
  renderer.render(scene, camera);
}

let playing = true;
let startTime = performance.now() / 1000;
let pausedAt = 0;

function animate() {
  if (playing) {
    const elapsed = performance.now() / 1000 - startTime;
    pausedAt = elapsed % DURATION;
    updateScene(pausedAt);
  }
  requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    playing = false;
  },
  seek(seconds) {
    playing = false;
    pausedAt = clamp(Number(seconds) || 0, 0, DURATION);
    updateScene(pausedAt);
  },
};
window.__reconstructionReady = true;
window.__reconstructionMetadata = {
  width: WIDTH,
  height: HEIGHT,
  fps: FPS,
  frames: FRAME_COUNT,
  duration: DURATION,
};

updateScene(0);
requestAnimationFrame(animate);
