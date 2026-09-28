import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const tmpMatrix = new THREE.Matrix4();
const tmpQuaternion = new THREE.Quaternion();
const tmpScale = new THREE.Vector3();
const tmpPosition = new THREE.Vector3();

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x040a13);
scene.fog = new THREE.FogExp2(0x06101b, 0.045);

const camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.1, 40);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance'
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.body.appendChild(renderer.domElement);

const material = {
  redArmor: new THREE.MeshStandardMaterial({
    color: 0x751923,
    emissive: 0x1a0205,
    emissiveIntensity: 0.42,
    roughness: 0.31,
    metalness: 0.72
  }),
  blueArmor: new THREE.MeshStandardMaterial({
    color: 0x174a6b,
    emissive: 0x021324,
    emissiveIntensity: 0.46,
    roughness: 0.3,
    metalness: 0.72
  }),
  blackLacquer: new THREE.MeshStandardMaterial({ color: 0x07090b, roughness: 0.2, metalness: 0.85 }),
  leather: new THREE.MeshStandardMaterial({ color: 0x100909, roughness: 0.68, metalness: 0.15 }),
  clothRed: new THREE.MeshStandardMaterial({ color: 0x9a2430, roughness: 0.86, side: THREE.DoubleSide }),
  clothBlue: new THREE.MeshStandardMaterial({ color: 0x185b84, roughness: 0.86, side: THREE.DoubleSide }),
  steel: new THREE.MeshStandardMaterial({ color: 0xd8e7ef, roughness: 0.11, metalness: 1 }),
  steelEdge: new THREE.MeshBasicMaterial({ color: 0xeaf8ff }),
  gold: new THREE.MeshStandardMaterial({ color: 0xa86f24, roughness: 0.25, metalness: 0.92 }),
  skin: new THREE.MeshStandardMaterial({ color: 0x9b6852, roughness: 0.75 }),
  stone: new THREE.MeshStandardMaterial({ color: 0x182129, roughness: 0.91, metalness: 0.05 }),
  darkStone: new THREE.MeshStandardMaterial({ color: 0x0b1218, roughness: 0.78, metalness: 0.18 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x381013, roughness: 0.55, metalness: 0.05 }),
  wetGround: new THREE.MeshPhysicalMaterial({
    color: 0x071016,
    roughness: 0.19,
    metalness: 0.26,
    clearcoat: 1,
    clearcoatRoughness: 0.12
  }),
  rain: new THREE.MeshBasicMaterial({ color: 0x9bd6ef, transparent: true, opacity: 0.58 }),
  rainNear: new THREE.MeshBasicMaterial({ color: 0xd8f4ff, transparent: true, opacity: 0.84 }),
  spark: new THREE.MeshBasicMaterial({ color: 0xffb735 }),
  sparkHot: new THREE.MeshBasicMaterial({ color: 0xfff2b0 }),
  droplet: new THREE.MeshPhysicalMaterial({
    color: 0x8fd5e8,
    emissive: 0x163a4c,
    roughness: 0.08,
    metalness: 0.22,
    transparent: true,
    opacity: 0.86
  })
};

const hemi = new THREE.HemisphereLight(0x9ed7f3, 0x0a1520, 1.38);
scene.add(hemi);

const moonLight = new THREE.DirectionalLight(0xb7dfff, 3.7);
moonLight.position.set(-4.5, 8, -5);
moonLight.castShadow = true;
moonLight.shadow.mapSize.set(2048, 2048);
moonLight.shadow.camera.left = -7;
moonLight.shadow.camera.right = 7;
moonLight.shadow.camera.top = 7;
moonLight.shadow.camera.bottom = -7;
scene.add(moonLight);

const rimLight = new THREE.DirectionalLight(0x315eff, 2.0);
rimLight.position.set(5, 4, 4);
scene.add(rimLight);

const overheadFill = new THREE.PointLight(0x73b6dc, 7.5, 12, 1.8);
overheadFill.position.set(0, 5.2, 0.8);
scene.add(overheadFill);

const clashLight = new THREE.PointLight(0xff7d22, 22, 8, 1.7);
clashLight.position.set(0, 2.15, 0);
scene.add(clashLight);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(24, 24), material.wetGround);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const courtyard = new THREE.Group();
scene.add(courtyard);

function hash(index, offset = 0) { window.__bfTrace?.add(112);
  const value = Math.sin((index + 1) * 127.1 + offset * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function addBox(parent, size, position, mat, rotation = [0, 0, 0]) { window.__bfTrace?.add(117);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), mat);
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radii, height, position, mat, radialSegments = 12) { window.__bfTrace?.add(127);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radii[0], radii[1], height, radialSegments),
    mat
  );
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createEnvironment() { window.__bfTrace?.add(139);
  const tileLineMat = new THREE.MeshBasicMaterial({
    color: 0x263e4b,
    transparent: true,
    opacity: 0.28
  });
  for (let i = -9; i <= 9; i += 1) {
    addBox(courtyard, [0.018, 0.006, 18], [i, 0.007, 0], tileLineMat);
    addBox(courtyard, [18, 0.006, 0.018], [0, 0.008, i], tileLineMat);
  }

  const puddleMat = new THREE.MeshBasicMaterial({
    color: 0x70a6b8,
    transparent: true,
    opacity: 0.2,
    side: THREE.DoubleSide
  });
  for (let i = 0; i < 28; i += 1) {
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.08 + hash(i, 2) * 0.09, 0.105 + hash(i, 2) * 0.11, 32),
      puddleMat
    );
    const angle = hash(i, 3) * Math.PI * 2;
    const radius = 1.4 + hash(i, 4) * 6.2;
    ring.position.set(Math.cos(angle) * radius, 0.017, Math.sin(angle) * radius);
    ring.rotation.x = -Math.PI / 2;
    ring.scale.y = 0.42;
    courtyard.add(ring);
  }

  for (const z of [-7.2, 7.2]) {
    addBox(courtyard, [17, 2.8, 0.35], [0, 1.4, z], material.darkStone);
    for (let x = -7.5; x <= 7.5; x += 1.5) {
      addBox(courtyard, [0.065, 2.4, 0.37], [x, 1.3, z - Math.sign(z) * 0.02], material.stone);
    }
  }

  for (const x of [-7.2, 7.2]) {
    addBox(courtyard, [0.35, 2.8, 14], [x, 1.4, 0], material.darkStone);
  }

  const gate = new THREE.Group();
  gate.position.set(0, 0, -6.7);
  addCylinder(gate, [0.23, 0.28], 4.7, [-2.3, 2.35, 0.2], material.wood, 16);
  addCylinder(gate, [0.23, 0.28], 4.7, [2.3, 2.35, 0.2], material.wood, 16);
  addBox(gate, [5.6, 0.34, 0.45], [0, 4.25, 0.2], material.wood, [0, 0, 0.025]);
  addBox(gate, [4.8, 0.28, 0.36], [0, 3.72, 0.2], material.wood);
  addBox(gate, [0.36, 0.65, 0.3], [0, 4.05, 0.2], material.gold);
  courtyard.add(gate);

  const lanternPositions = [
    [-4.4, -4.5], [4.4, -4.5], [-4.6, 4.3], [4.6, 4.3]
  ];
  for (let i = 0; i < lanternPositions.length; i += 1) {
    const [x, z] = lanternPositions[i];
    const lantern = new THREE.Group();
    lantern.position.set(x, 0, z);
    addCylinder(lantern, [0.27, 0.38], 0.25, [0, 0.13, 0], material.stone, 6);
    addCylinder(lantern, [0.17, 0.2], 1.05, [0, 0.75, 0], material.stone, 8);
    addBox(lantern, [0.62, 0.18, 0.62], [0, 1.34, 0], material.stone);
    const glowMat = new THREE.MeshBasicMaterial({ color: i < 2 ? 0xff6b1f : 0xff9a35 });
    addBox(lantern, [0.38, 0.45, 0.38], [0, 1.62, 0], glowMat);
    addBox(lantern, [0.72, 0.16, 0.72], [0, 1.93, 0], material.stone);
    const light = new THREE.PointLight(0xff5b18, 5.5, 4.2, 2);
    light.position.set(0, 1.62, 0);
    lantern.add(light);
    courtyard.add(lantern);
  }

  const moon = new THREE.Mesh(
    new THREE.SphereGeometry(0.72, 32, 16),
    new THREE.MeshBasicMaterial({ color: 0xc9e6ef, fog: false })
  );
  moon.position.set(-5.2, 6.2, -8.7);
  scene.add(moon);

  for (let i = 0; i < 9; i += 1) {
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.1 + hash(i, 11) * 0.13, 0),
      material.stone
    );
    const angle = hash(i, 12) * Math.PI * 2;
    stone.position.set(Math.cos(angle) * (2.3 + hash(i, 13)), 0.08, Math.sin(angle) * (2.3 + hash(i, 13)));
    stone.rotation.set(hash(i, 1) * 2, hash(i, 2) * 2, hash(i, 3) * 2);
    stone.castShadow = true;
    courtyard.add(stone);
  }
}

createEnvironment();

function setBetween(mesh, start, end) { window.__bfTrace?.add(230);
  tmpPosition.copy(start).add(end).multiplyScalar(0.5);
  mesh.position.copy(tmpPosition);
  tmpPosition.copy(end).sub(start);
  const length = tmpPosition.length();
  tmpQuaternion.setFromUnitVectors(Y_AXIS, tmpPosition.normalize());
  mesh.quaternion.copy(tmpQuaternion);
  mesh.scale.set(1, length, 1);
}

function createLimb(parent, radius, mat) { window.__bfTrace?.add(240);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.08, 1, 10), mat);
  mesh.castShadow = true;
  parent.add(mesh);
  return mesh;
}

function createSword(accent) { window.__bfTrace?.add(247);
  const group = new THREE.Group();
  const handle = addCylinder(group, [0.055, 0.06], 0.5, [0, -0.06, 0], material.leather, 12);
  handle.rotation.z = 0;
  addCylinder(group, [0.035, 0.035], 0.42, [0, -0.06, 0], accent, 10);
  addBox(group, [0.48, 0.055, 0.095], [0, 0.22, 0], material.gold);
  const blade = addBox(group, [0.075, 1.48, 0.035], [0, 1.01, 0], material.steel);
  blade.geometry.translate(0.035, 0, 0);
  addBox(group, [0.018, 1.45, 0.042], [0.076, 1.01, 0], material.steelEdge);
  const tip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 4), material.steel);
  tip.position.y = 1.84;
  tip.rotation.y = Math.PI / 4;
  tip.castShadow = true;
  group.add(tip);
  group.userData.nominalLength = 1.84;
  return group;
}

function createSamurai(isLeft) { window.__bfTrace?.add(265);
  const root = new THREE.Group();
  const facing = isLeft ? 1 : -1;
  const armor = isLeft ? material.redArmor : material.blueArmor;
  const cloth = isLeft ? material.clothRed : material.clothBlue;
  root.position.x = isLeft ? -1.35 : 1.35;
  scene.add(root);

  const torso = new THREE.Group();
  root.add(torso);
  addBox(torso, [0.4, 0.77, 0.72], [0, 1.48, 0], armor);
  addBox(torso, [0.44, 0.13, 0.82], [0, 1.77, 0], material.blackLacquer);
  for (let y = 1.16; y <= 1.66; y += 0.125) {
    addBox(torso, [0.425, 0.09, 0.76], [-facing * 0.015, y, 0], armor, [0, 0, facing * 0.02]);
  }
  for (const z of [-0.43, 0.43]) {
    addBox(torso, [0.46, 0.14, 0.25], [0, 1.7, z], armor, [facing * 0.08, 0, 0]);
    addBox(torso, [0.46, 0.12, 0.22], [0, 1.55, z * 1.03], material.blackLacquer);
  }
  addBox(torso, [0.5, 0.14, 0.79], [0, 1.07, 0], material.gold);

  const skirt = new THREE.Group();
  root.add(skirt);
  for (let i = -2; i <= 2; i += 1) {
    addBox(skirt, [0.34, 0.58, 0.18], [-facing * 0.02, 0.79, i * 0.16], armor, [0, 0, facing * 0.11]);
  }

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.255, 24, 16), material.skin);
  head.position.set(facing * 0.02, 2.14, 0);
  head.scale.set(0.92, 1.05, 1);
  head.castShadow = true;
  root.add(head);
  const mask = addBox(root, [0.14, 0.22, 0.38], [facing * 0.235, 2.08, 0], material.blackLacquer);
  mask.rotation.z = facing * -0.04;
  const eyeSlitMat = new THREE.MeshBasicMaterial({ color: isLeft ? 0xff5a38 : 0x83d7ff });
  addBox(root, [0.012, 0.035, 0.25], [facing * 0.31, 2.17, 0], eyeSlitMat);

  const helmet = addCylinder(root, [0.31, 0.29], 0.22, [0, 2.34, 0], material.blackLacquer, 20);
  helmet.scale.set(1.05, 1, 1.15);
  addCylinder(root, [0.48, 0.5], 0.075, [0, 2.25, 0], armor, 24);
  const crest = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.035, 8, 20, Math.PI * 1.25), material.gold);
  crest.position.set(facing * 0.01, 2.56, 0);
  crest.rotation.y = Math.PI / 2;
  crest.rotation.z = isLeft ? -0.7 : 0.7;
  root.add(crest);
  for (const z of [-0.2, 0.2]) {
    const horn = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.38, 8), material.gold);
    horn.position.set(-facing * 0.02, 2.55, z);
    horn.rotation.z = facing * 0.33;
    horn.rotation.x = -z * 0.9;
    root.add(horn);
  }

  const legs = [
    {
      upper: createLimb(root, 0.125, material.blackLacquer),
      lower: createLimb(root, 0.105, material.leather),
      foot: addBox(root, [0.44, 0.13, 0.19], [0, 0, 0], material.leather)
    },
    {
      upper: createLimb(root, 0.125, material.blackLacquer),
      lower: createLimb(root, 0.105, material.leather),
      foot: addBox(root, [0.44, 0.13, 0.19], [0, 0, 0], material.leather)
    }
  ];

  const arms = [
    {
      upper: createLimb(root, 0.105, armor),
      lower: createLimb(root, 0.085, material.leather),
      hand: new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 8), material.leather)
    },
    {
      upper: createLimb(root, 0.105, armor),
      lower: createLimb(root, 0.085, material.leather),
      hand: new THREE.Mesh(new THREE.SphereGeometry(0.115, 12, 8), material.leather)
    }
  ];
  root.add(arms[0].hand, arms[1].hand);
  arms[0].hand.castShadow = true;
  arms[1].hand.castShadow = true;

  const sword = createSword(armor);
  root.add(sword);

  const sash = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 1.35, 1, 5), cloth);
  sash.position.set(-facing * 0.2, 0.92, isLeft ? -0.25 : 0.25);
  sash.rotation.y = Math.PI / 2;
  sash.rotation.z = facing * -0.32;
  sash.castShadow = true;
  root.add(sash);

  return { root, facing, torso, skirt, head, helmet, legs, arms, sword, sash };
}

const leftSamurai = createSamurai(true);
const rightSamurai = createSamurai(false);

const rainCount = 440;
const rainGeometry = new THREE.CylinderGeometry(0.008, 0.014, 1, 5);
const rain = new THREE.InstancedMesh(rainGeometry, material.rain, rainCount);
rain.frustumCulled = false;
scene.add(rain);

const nearRainCount = 90;
const nearRainGeometry = new THREE.CylinderGeometry(0.013, 0.021, 1, 5);
const nearRain = new THREE.InstancedMesh(nearRainGeometry, material.rainNear, nearRainCount);
nearRain.frustumCulled = false;
scene.add(nearRain);

const sparkCount = 58;
const sparkGeometry = new THREE.CylinderGeometry(0.012, 0.026, 1, 5);
const sparks = new THREE.InstancedMesh(sparkGeometry, material.spark, sparkCount);
sparks.frustumCulled = false;
scene.add(sparks);

const hotSparkCount = 16;
const hotSparks = new THREE.InstancedMesh(sparkGeometry, material.sparkHot, hotSparkCount);
hotSparks.frustumCulled = false;
scene.add(hotSparks);

const debrisCount = 28;
const debris = new THREE.InstancedMesh(
  new THREE.DodecahedronGeometry(0.045, 0),
  material.stone,
  debrisCount
);
debris.frustumCulled = false;
scene.add(debris);

const dropletCount = 72;
const droplets = new THREE.InstancedMesh(
  new THREE.SphereGeometry(0.026, 8, 6),
  material.droplet,
  dropletCount
);
droplets.frustumCulled = false;
scene.add(droplets);

const clashCore = new THREE.Group();
const coreA = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), material.sparkHot);
const coreB = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.19, 20), material.spark);
coreB.material = material.spark;
clashCore.add(coreA, coreB);
scene.add(clashCore);

function smoother(value) { window.__bfTrace?.add(411);
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * x * (x * (x * 6 - 15) + 10);
}

function actionState(time) { window.__bfTrace?.add(416);
  if (time <= 1.18) {
    return { strike: smoother(time / 1.18), resolve: 0, actionTime: time };
  }
  if (time <= 4.42) {
    return { strike: 1, resolve: 0, actionTime: 1.18 };
  }
  const release = THREE.MathUtils.clamp((time - 4.42) / (DURATION - 4.42), 0, 1);
  const resolve = 1 - Math.pow(1 - release, 2.2);
  return { strike: 1, resolve, actionTime: 1.18 + (time - 4.42) * 2 };
}

function mixVector(a, b, amount) { window.__bfTrace?.add(428);
  return new THREE.Vector3().fromArray(a).lerp(new THREE.Vector3().fromArray(b), amount);
}

function updateSamurai(samurai, state, isLeft) { window.__bfTrace?.add(432);
  const { strike, resolve } = state;
  const f = samurai.facing;
  const baseX = isLeft ? -1.35 : 1.35;
  samurai.root.position.set(baseX + f * (0.19 * strike - 0.13 * resolve), 0, isLeft ? 0.34 : -0.34);
  samurai.root.rotation.set(0, 0, -f * (0.105 * strike - 0.045 * resolve));
  samurai.torso.rotation.x = (isLeft ? -1 : 1) * 0.025 * strike;
  samurai.head.rotation.y = f * -0.11;
  samurai.skirt.rotation.z = f * 0.04 * Math.sin(strike * Math.PI);

  const gripStart = [f * 0.06, 1.18, isLeft ? -0.34 : 0.34];
  const gripClash = [f * 0.54, 1.36, isLeft ? -0.28 : 0.28];
  const gripResolve = [f * 0.47, 1.43, isLeft ? -0.19 : 0.19];
  const tipStart = [-f * 0.56, 2.54, isLeft ? -0.25 : 0.25];
  const tipClash = [f * 1.76, 2.78, isLeft ? -0.33 : 0.33];
  const tipResolve = [f * 1.24, 2.94, isLeft ? -0.08 : 0.08];
  const grip = mixVector(gripStart, gripClash, strike).lerp(new THREE.Vector3().fromArray(gripResolve), resolve);
  const tip = mixVector(tipStart, tipClash, strike).lerp(new THREE.Vector3().fromArray(tipResolve), resolve);

  samurai.sword.position.copy(grip);
  tmpPosition.copy(tip).sub(grip);
  samurai.sword.quaternion.setFromUnitVectors(Y_AXIS, tmpPosition.clone().normalize());
  const swordScale = tmpPosition.length() / samurai.sword.userData.nominalLength;
  samurai.sword.scale.set(1, swordScale, 1);

  const bladeDirection = tmpPosition.clone().normalize();
  const lowerHand = grip.clone().addScaledVector(bladeDirection, -0.16);
  const upperHand = grip.clone().addScaledVector(bladeDirection, 0.09);
  upperHand.z += isLeft ? -0.06 : 0.06;
  lowerHand.z += isLeft ? 0.09 : -0.09;
  const shoulderFront = new THREE.Vector3(0, 1.72, isLeft ? -0.36 : 0.36);
  const shoulderBack = new THREE.Vector3(0, 1.67, isLeft ? 0.36 : -0.36);
  const elbowFront = shoulderFront.clone().lerp(upperHand, 0.52);
  elbowFront.z += isLeft ? -0.31 : 0.31;
  elbowFront.y += 0.12;
  const elbowBack = shoulderBack.clone().lerp(lowerHand, 0.48);
  elbowBack.x -= f * 0.18;
  elbowBack.z += isLeft ? 0.19 : -0.19;
  setBetween(samurai.arms[0].upper, shoulderFront, elbowFront);
  setBetween(samurai.arms[0].lower, elbowFront, upperHand);
  setBetween(samurai.arms[1].upper, shoulderBack, elbowBack);
  setBetween(samurai.arms[1].lower, elbowBack, lowerHand);
  samurai.arms[0].hand.position.copy(upperHand);
  samurai.arms[1].hand.position.copy(lowerHand);

  const hipFront = new THREE.Vector3(0, 0.98, isLeft ? -0.22 : 0.22);
  const hipBack = new THREE.Vector3(0, 0.98, isLeft ? 0.22 : -0.22);
  const frontFoot = new THREE.Vector3(f * (0.52 + 0.34 * strike - 0.12 * resolve), 0.12, isLeft ? -0.28 : 0.28);
  const backFoot = new THREE.Vector3(-f * (0.45 + 0.1 * strike), 0.12, isLeft ? 0.31 : -0.31);
  const frontKnee = hipFront.clone().lerp(frontFoot, 0.5);
  frontKnee.x += f * 0.19;
  frontKnee.y += 0.05;
  const backKnee = hipBack.clone().lerp(backFoot, 0.5);
  backKnee.x -= f * 0.08;
  setBetween(samurai.legs[0].upper, hipFront, frontKnee);
  setBetween(samurai.legs[0].lower, frontKnee, frontFoot);
  setBetween(samurai.legs[1].upper, hipBack, backKnee);
  setBetween(samurai.legs[1].lower, backKnee, backFoot);
  samurai.legs[0].foot.position.copy(frontFoot);
  samurai.legs[1].foot.position.copy(backFoot);
  samurai.legs[0].foot.rotation.y = Math.PI / 2;
  samurai.legs[1].foot.rotation.y = Math.PI / 2;

  samurai.sash.rotation.z = f * (-0.28 - strike * 0.2 + resolve * 0.25);
  samurai.sash.rotation.x = (isLeft ? -1 : 1) * (0.18 + 0.22 * strike);
}

function setInstance(mesh, index, position, quaternion, scale) { window.__bfTrace?.add(499);
  tmpMatrix.compose(position, quaternion, scale);
  mesh.setMatrixAt(index, tmpMatrix);
}

function updateRain(actionTime) { window.__bfTrace?.add(504);
  for (let i = 0; i < rainCount; i += 1) {
    const x = (hash(i, 1) - 0.5) * 15;
    const z = (hash(i, 2) - 0.5) * 15;
    const fall = actionTime * (3.8 + hash(i, 5) * 3.1);
    const y = ((hash(i, 3) * 6.7 - fall + 30) % 6.7) + 0.1;
    const length = 0.13 + hash(i, 7) * 0.32;
    const slant = new THREE.Vector3(-0.12, -1, 0.045).normalize();
    tmpQuaternion.setFromUnitVectors(Y_AXIS, slant);
    setInstance(rain, i, new THREE.Vector3(x, y, z), tmpQuaternion, new THREE.Vector3(1, length, 1));
  }
  rain.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < nearRainCount; i += 1) {
    const x = (hash(i, 21) - 0.5) * 9;
    const z = (hash(i, 22) - 0.5) * 9;
    const fall = actionTime * (4.8 + hash(i, 25) * 3.5);
    const y = ((hash(i, 23) * 6.4 - fall + 30) % 6.4) + 0.2;
    const length = 0.28 + hash(i, 27) * 0.56;
    const slant = new THREE.Vector3(-0.16, -1, 0.06).normalize();
    tmpQuaternion.setFromUnitVectors(Y_AXIS, slant);
    setInstance(nearRain, i, new THREE.Vector3(x, y, z), tmpQuaternion, new THREE.Vector3(1, length, 1));
  }
  nearRain.instanceMatrix.needsUpdate = true;
}

function sparkDirection(index) { window.__bfTrace?.add(530);
  const angle = hash(index, 31) * Math.PI * 2;
  const spread = (hash(index, 32) - 0.5) * 1.45;
  return new THREE.Vector3(
    Math.cos(angle) * (0.72 + hash(index, 33) * 0.35),
    spread + 0.18,
    Math.sin(angle) * (0.42 + hash(index, 34) * 0.58)
  ).normalize();
}

function updateEffects(state) { window.__bfTrace?.add(540);
  const center = new THREE.Vector3(0, 2.19, 0);
  const sparkAge = THREE.MathUtils.clamp((state.actionTime - 1.01) * 1.12, 0, 1.25);
  const visible = state.strike > 0.91 && sparkAge < 1.2;
  sparks.visible = visible;
  hotSparks.visible = visible;
  clashCore.visible = visible;
  clashLight.intensity = visible ? 20 + (1 - Math.min(sparkAge, 1)) * 34 : 0;
  clashCore.position.copy(center);
  clashCore.scale.setScalar(0.7 + sparkAge * 0.9);
  coreA.rotation.set(sparkAge * 1.7, sparkAge * 2.3, sparkAge * 1.1);
  coreB.lookAt(camera.position);
  coreB.rotation.z = sparkAge * 2.5;

  for (let i = 0; i < sparkCount; i += 1) {
    const direction = sparkDirection(i);
    const speed = 0.9 + hash(i, 35) * 3.5;
    const age = Math.max(0, sparkAge - hash(i, 36) * 0.08);
    const position = center.clone().addScaledVector(direction, age * speed);
    position.y -= age * age * (0.65 + hash(i, 37) * 0.7);
    tmpQuaternion.setFromUnitVectors(Y_AXIS, direction);
    const length = 0.08 + hash(i, 38) * 0.34;
    setInstance(sparks, i, position, tmpQuaternion, new THREE.Vector3(1, length, 1));
  }
  sparks.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < hotSparkCount; i += 1) {
    const direction = sparkDirection(i + 100);
    const speed = 0.5 + hash(i, 45) * 1.4;
    const position = center.clone().addScaledVector(direction, sparkAge * speed);
    tmpQuaternion.setFromUnitVectors(Y_AXIS, direction);
    setInstance(hotSparks, i, position, tmpQuaternion, new THREE.Vector3(1.5, 0.1 + hash(i, 46) * 0.18, 1.5));
  }
  hotSparks.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < dropletCount; i += 1) {
    const direction = sparkDirection(i + 230);
    direction.y = Math.abs(direction.y) * 0.75 - 0.15;
    const radius = 0.34 + hash(i, 51) * 1.18 + sparkAge * hash(i, 52) * 0.45;
    const position = center.clone().addScaledVector(direction.normalize(), radius);
    position.y += (hash(i, 53) - 0.5) * 0.24;
    const scale = 0.45 + hash(i, 54) * 1.25;
    setInstance(droplets, i, position, new THREE.Quaternion(), new THREE.Vector3(scale, scale * 1.8, scale));
  }
  droplets.visible = visible;
  droplets.instanceMatrix.needsUpdate = true;

  for (let i = 0; i < debrisCount; i += 1) {
    const angle = hash(i, 61) * Math.PI * 2;
    const baseRadius = 0.8 + hash(i, 62) * 1.4;
    const kick = state.strike * (0.15 + hash(i, 63) * 0.55);
    const settle = state.resolve * (0.1 + hash(i, 64) * 0.3);
    const position = new THREE.Vector3(
      Math.cos(angle) * (baseRadius + kick),
      0.045 + state.strike * hash(i, 65) * 0.45 - settle,
      Math.sin(angle) * (baseRadius + kick)
    );
    position.y = Math.max(0.04, position.y);
    tmpQuaternion.setFromEuler(new THREE.Euler(
      hash(i, 66) * 3 + state.actionTime,
      hash(i, 67) * 4 + state.actionTime * 1.7,
      hash(i, 68) * 3
    ));
    const scale = 0.65 + hash(i, 69) * 1.4;
    setInstance(debris, i, position, tmpQuaternion, new THREE.Vector3(scale, scale, scale));
  }
  debris.instanceMatrix.needsUpdate = true;
}

function updateCamera(time) { window.__bfTrace?.add(609);
  let angleDegrees;
  let radius;
  if (time < 1.18) {
    const amount = smoother(time / 1.18);
    angleDegrees = -42 + amount * 16;
    radius = 5.95 - amount * 0.48;
  } else if (time < 4.42) {
    const amount = smoother((time - 1.18) / (4.42 - 1.18));
    angleDegrees = -26 + amount * 220;
    radius = 5.47 + Math.sin(amount * Math.PI) * 0.42;
  } else {
    const amount = smoother((time - 4.42) / (DURATION - 4.42));
    angleDegrees = 194 + amount * 14;
    radius = 5.47 + amount * 0.48;
  }
  const angle = THREE.MathUtils.degToRad(angleDegrees);
  const orbitAmount = THREE.MathUtils.clamp((time - 1.18) / (4.42 - 1.18), 0, 1);
  const elevation = 2.7 + Math.sin(orbitAmount * Math.PI) * 0.74;
  camera.position.set(Math.sin(angle) * radius, elevation, Math.cos(angle) * radius);
  const target = new THREE.Vector3(0, 1.52 + Math.sin(orbitAmount * Math.PI) * 0.18, 0);
  camera.lookAt(target);
  camera.fov = 39 - Math.sin(orbitAmount * Math.PI) * 3.5;
  camera.updateProjectionMatrix();
}

function updateLighting(time, state) { window.__bfTrace?.add(635);
  const lightning = Math.exp(-Math.pow((time - 0.68) / 0.055, 2)) +
    Math.exp(-Math.pow((time - 4.72) / 0.05, 2));
  moonLight.intensity = 3.7 + lightning * 8;
  hemi.intensity = 1.38 + lightning * 1.7;
  renderer.toneMappingExposure = 1.2 + lightning * 0.24;
}

let currentTime = 0;
let playing = false;
let startWallTime = 0;
let startSceneTime = 0;

function renderAt(time) { window.__bfTrace?.add(648);
  currentTime = THREE.MathUtils.clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  const state = actionState(currentTime);
  updateCamera(currentTime);
  updateSamurai(leftSamurai, state, true);
  updateSamurai(rightSamurai, state, false);
  updateRain(state.actionTime);
  updateEffects(state);
  updateLighting(currentTime, state);
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}

function animate(wallTime) { window.__bfTrace?.add(661);
  if (!playing) return;
  const elapsed = (wallTime - startWallTime) / 1000;
  renderAt((startSceneTime + elapsed) % DURATION);
  requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    playing = false;
  },
  seek(seconds) {
    playing = false;
    renderAt(seconds);
    return currentTime;
  },
  play() {
    startWallTime = performance.now();
    startSceneTime = currentTime;
    playing = true;
    requestAnimationFrame(animate);
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov
    };
  }
};

renderAt(0);
window.__RECONSTRUCTION_READY__ = true;
