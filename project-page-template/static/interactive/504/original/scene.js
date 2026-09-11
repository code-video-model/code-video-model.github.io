import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const DURATION = 124 / FPS;
const FREEZE_START = 0.68;
const RELEASE_START = 4.52;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x071526, 0.014);

const camera = new THREE.PerspectiveCamera(43, WIDTH / HEIGHT, 0.05, 100);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance'
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smooth = (value) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};
const smoother = (value) => {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const lerp = THREE.MathUtils.lerp;
const v3 = (x, y, z) => new THREE.Vector3(x, y, z);
const tmpDirection = new THREE.Vector3();
const tmpQuaternion = new THREE.Quaternion();
const yAxis = new THREE.Vector3(0, 1, 0);

function material(color, roughness = 0.55, metalness = 0) {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness });
}

const materials = {
  grass: material(0x176b34, 0.92),
  grassAlt: material(0x1d7a3c, 0.95),
  white: material(0xf0f4f3, 0.55),
  goal: material(0xffffff, 0.32, 0.12),
  net: new THREE.MeshBasicMaterial({ color: 0xc8d7db, transparent: true, opacity: 0.43 }),
  skin: material(0x8f5033, 0.72),
  skinLight: material(0xb46d49, 0.72),
  hair: material(0x130e0c, 0.9),
  blue: material(0x155ed8, 0.42),
  blueDark: material(0x0b2e79, 0.52),
  shorts: material(0x0b1730, 0.65),
  socks: material(0x1c68e2, 0.5),
  boot: material(0xf2b90c, 0.35),
  bootDark: material(0x241b0c, 0.65),
  red: material(0xd1262e, 0.48),
  redDark: material(0x671116, 0.64),
  black: material(0x111519, 0.72),
  ballWhite: material(0xf8f8ec, 0.38),
  ballBlack: material(0x12171a, 0.6),
  dirt: material(0x51351e, 1),
  crowdDark: material(0x131d2c, 0.92),
  stand: material(0x263244, 0.88),
  steel: material(0x4b5c6b, 0.55, 0.35)
};
materials.blue.emissive.setHex(0x061b4d);
materials.blue.emissiveIntensity = 0.34;
materials.red.emissive.setHex(0x360306);
materials.red.emissiveIntensity = 0.24;
materials.ballWhite.emissive.setHex(0x161b1b);
materials.ballWhite.emissiveIntensity = 0.35;

function mesh(geometry, mat, parent = scene, shadows = true) {
  const item = new THREE.Mesh(geometry, mat);
  item.castShadow = shadows;
  item.receiveShadow = shadows;
  parent.add(item);
  return item;
}

function orientBetween(item, start, end, thickness = 1) {
  tmpDirection.subVectors(end, start);
  const length = tmpDirection.length();
  item.position.copy(start).add(end).multiplyScalar(0.5);
  item.quaternion.setFromUnitVectors(yAxis, tmpDirection.normalize());
  item.scale.set(thickness, length, thickness);
}

function createSegment(parent, radius, mat, radialSegments = 10) {
  const segment = mesh(
    new THREE.CapsuleGeometry(radius, 1, 5, radialSegments),
    mat,
    parent
  );
  segment.userData.baseLength = 1 + radius * 2;
  return segment;
}

function setCapsule(segment, start, end, radiusScale = 1) {
  tmpDirection.subVectors(end, start);
  const length = tmpDirection.length();
  segment.position.copy(start).add(end).multiplyScalar(0.5);
  segment.quaternion.setFromUnitVectors(yAxis, tmpDirection.normalize());
  segment.scale.set(radiusScale, length / segment.userData.baseLength, radiusScale);
}

function createSky() {
  const sky = mesh(
    new THREE.SphereGeometry(70, 32, 16),
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x030914) },
        horizonColor: { value: new THREE.Color(0x17385b) }
      },
      vertexShader: `
        varying vec3 vPosition;
        void main() {
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPosition;
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        void main() {
          float heightMix = smoothstep(-0.15, 0.55, normalize(vPosition).y);
          gl_FragColor = vec4(mix(horizonColor, topColor, heightMix), 1.0);
        }
      `
    }),
    scene,
    false
  );
  sky.frustumCulled = false;
}

function createField() {
  const field = new THREE.Group();
  scene.add(field);

  mesh(new THREE.PlaneGeometry(36, 46), materials.grass, field).rotation.x = -Math.PI / 2;
  for (let i = 0; i < 10; i += 1) {
    const stripe = mesh(new THREE.PlaneGeometry(36, 2.28), materials.grassAlt, field, false);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(0, 0.006, -20.7 + i * 4.6);
  }

  const lineMat = new THREE.MeshBasicMaterial({ color: 0xe8f2e8 });
  const line = (width, depth, x, z) => {
    const item = mesh(new THREE.BoxGeometry(width, 0.018, depth), lineMat, field, false);
    item.position.set(x, 0.025, z);
  };
  line(0.075, 46, -17.92, 0);
  line(0.075, 46, 17.92, 0);
  line(36, 0.075, 0, -22.92);
  line(36, 0.075, 0, 22.92);
  line(18.3, 0.075, 0, -6.5);
  line(0.075, 6.5, -9.15, -9.75);
  line(0.075, 6.5, 9.15, -9.75);
  line(7.32, 0.075, 0, -8.75);
  line(0.075, 4.25, -3.66, -10.86);
  line(0.075, 4.25, 3.66, -10.86);

  const arc = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: 41 }, (_, i) => {
        const angle = Math.PI * (0.19 + 0.62 * i / 40);
        return v3(Math.cos(angle) * 2.2, 0.034, -6.5 + Math.sin(angle) * 2.2);
      })
    ),
    new THREE.LineBasicMaterial({ color: 0xe8f2e8 })
  );
  field.add(arc);
}

function addNetLine(parent, start, end, radius = 0.012) {
  const line = mesh(new THREE.CylinderGeometry(radius, radius, 1, 5), materials.net, parent, false);
  orientBetween(line, start, end);
}

function createGoal() {
  const goal = new THREE.Group();
  scene.add(goal);
  const zFront = -13;
  const zBack = -14.65;
  const left = -3.66;
  const right = 3.66;
  const top = 2.44;

  const post = (start, end, radius = 0.075) => {
    const item = mesh(new THREE.CylinderGeometry(radius, radius, 1, 12), materials.goal, goal);
    orientBetween(item, start, end);
  };
  post(v3(left, 0, zFront), v3(left, top, zFront));
  post(v3(right, 0, zFront), v3(right, top, zFront));
  post(v3(left, top, zFront), v3(right, top, zFront));
  post(v3(left, top, zFront), v3(left, 1.78, zBack), 0.045);
  post(v3(right, top, zFront), v3(right, 1.78, zBack), 0.045);
  post(v3(left, 0, zFront), v3(left, 0, zBack), 0.04);
  post(v3(right, 0, zFront), v3(right, 0, zBack), 0.04);

  for (let x = left; x <= right + 0.01; x += 0.48) {
    addNetLine(goal, v3(x, 0.02, zFront), v3(x, 0.02, zBack));
    addNetLine(goal, v3(x, 0.02, zBack), v3(x, 1.78, zBack));
    addNetLine(goal, v3(x, 1.78, zBack), v3(x, top, zFront));
  }
  for (let y = 0.2; y <= 1.8; y += 0.32) {
    addNetLine(goal, v3(left, y, zBack), v3(right, y, zBack));
    const frontY = Math.min(top, y + 0.5);
    addNetLine(goal, v3(left, y, zBack), v3(left, frontY, zFront));
    addNetLine(goal, v3(right, y, zBack), v3(right, frontY, zFront));
  }
  for (let z = zBack; z <= zFront; z += 0.34) {
    addNetLine(goal, v3(left, 0.02, z), v3(right, 0.02, z));
  }
}

function createStadium() {
  const stadium = new THREE.Group();
  scene.add(stadium);

  const standBack = mesh(new THREE.BoxGeometry(37, 5.4, 2.6), materials.stand, stadium, false);
  standBack.position.set(0, 3.1, -19.2);
  const standLeft = mesh(new THREE.BoxGeometry(2.4, 4.6, 42), materials.stand, stadium, false);
  standLeft.position.set(-20.2, 2.7, 0);
  const standRight = standLeft.clone();
  standRight.position.x = 20.2;
  stadium.add(standRight);

  const boardColors = [0x00b8d8, 0x1759c8, 0x7b2bd0, 0x00a982];
  for (let i = 0; i < 8; i += 1) {
    const color = boardColors[i % boardColors.length];
    const boardMat = new THREE.MeshStandardMaterial({
      color,
      emissive: color,
      emissiveIntensity: 0.72,
      roughness: 0.45
    });
    const board = mesh(new THREE.BoxGeometry(3.7, 0.62, 0.12), boardMat, stadium, false);
    board.position.set(-13.2 + i * 3.78, 0.53, -16.35);
  }

  const crowdColors = [0xd7e5ec, 0x2d76c8, 0xd64e3c, 0xf0bd42, 0x7c8ca0];
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 46; col += 1) {
      const color = crowdColors[(row * 13 + col * 7) % crowdColors.length];
      const spectator = mesh(
        new THREE.SphereGeometry(0.085, 5, 4),
        material(color, 0.9),
        stadium,
        false
      );
      spectator.position.set(-17.4 + col * 0.76, 1.4 + row * 0.48, -17.82 - row * 0.18);
    }
  }

  for (const side of [-1, 1]) {
    for (let row = 0; row < 6; row += 1) {
      for (let col = 0; col < 34; col += 1) {
        const color = crowdColors[(row * 11 + col * 5 + (side > 0 ? 2 : 0)) % crowdColors.length];
        const spectator = mesh(
          new THREE.SphereGeometry(0.075, 5, 4),
          material(color, 0.9),
          stadium,
          false
        );
        spectator.position.set(
          side * (18.7 + row * 0.17),
          1.25 + row * 0.47,
          -15.5 + col * 0.93
        );
      }
    }
  }

  const floodlights = [];
  for (const x of [-15.5, 15.5]) {
    for (const z of [-16.2, 13.5]) {
      const pole = mesh(new THREE.CylinderGeometry(0.065, 0.1, 10.5, 8), materials.steel, stadium, false);
      pole.position.set(x, 5.25, z);
      const bank = mesh(new THREE.BoxGeometry(2.3, 0.75, 0.28), materials.steel, stadium, false);
      bank.position.set(x, 10.25, z);
      bank.lookAt(0, 1.5, 0);
      for (let i = -2; i <= 2; i += 1) {
        const lamp = mesh(
          new THREE.CircleGeometry(0.18, 12),
          new THREE.MeshBasicMaterial({ color: 0xf3f4dd }),
          stadium,
          false
        );
        lamp.position.set(x + i * 0.4, 10.25, z + (z < 0 ? 0.151 : -0.151));
        lamp.lookAt(0, 1.2, 0);
        floodlights.push(lamp);
      }
    }
  }
}

function createSoccerBall() {
  const ball = new THREE.Group();
  mesh(new THREE.SphereGeometry(0.225, 32, 20), materials.ballWhite, ball);

  const normals = [
    v3(0, 1, 0), v3(0, -1, 0), v3(1, 0, 0), v3(-1, 0, 0),
    v3(0, 0, 1), v3(0, 0, -1),
    v3(0.58, 0.58, 0.58), v3(-0.58, 0.58, 0.58),
    v3(0.58, -0.58, 0.58), v3(-0.58, -0.58, 0.58),
    v3(0.58, 0.58, -0.58), v3(-0.58, -0.58, -0.58)
  ];
  for (const normal of normals) {
    normal.normalize();
    const patch = mesh(new THREE.CircleGeometry(0.066, 5), materials.ballBlack, ball, false);
    patch.position.copy(normal).multiplyScalar(0.226);
    patch.quaternion.setFromUnitVectors(v3(0, 0, 1), normal);
  }
  scene.add(ball);
  return ball;
}

function createPlayer() {
  const player = new THREE.Group();
  scene.add(player);

  const torso = mesh(new THREE.CapsuleGeometry(0.36, 0.66, 6, 12), materials.blue, player);
  torso.userData.baseLength = 0.66 + 0.36 * 2;
  torso.scale.set(1.18, 1, 0.75);
  const chestStripe = mesh(new THREE.CylinderGeometry(0.372, 0.372, 0.075, 16), materials.white, player);
  chestStripe.scale.z = 0.75;
  const shorts = mesh(new THREE.SphereGeometry(0.43, 14, 10), materials.shorts, player);
  shorts.scale.set(1.05, 0.75, 0.78);
  const head = mesh(new THREE.SphereGeometry(0.24, 16, 12), materials.skin, player);
  head.scale.set(0.86, 1.08, 0.92);
  const hair = mesh(new THREE.SphereGeometry(0.245, 14, 9, 0, Math.PI * 2, 0, Math.PI * 0.44), materials.hair, player);
  hair.scale.set(0.9, 1.0, 0.96);

  const leftUpperArm = createSegment(player, 0.105, materials.skin);
  const leftSleeve = createSegment(player, 0.145, materials.blue);
  const leftForearm = createSegment(player, 0.09, materials.skin);
  const rightUpperArm = createSegment(player, 0.105, materials.skin);
  const rightSleeve = createSegment(player, 0.145, materials.blue);
  const rightForearm = createSegment(player, 0.09, materials.skin);
  const leftThigh = createSegment(player, 0.16, materials.skin);
  const leftShort = createSegment(player, 0.205, materials.shorts);
  const leftShin = createSegment(player, 0.125, materials.socks);
  const rightThigh = createSegment(player, 0.16, materials.skin);
  const rightShort = createSegment(player, 0.205, materials.shorts);
  const rightShin = createSegment(player, 0.125, materials.socks);

  const leftBoot = mesh(new THREE.CapsuleGeometry(0.11, 0.28, 5, 10), materials.boot, player);
  const rightBoot = mesh(new THREE.CapsuleGeometry(0.11, 0.32, 5, 10), materials.boot, player);
  const leftHand = mesh(new THREE.SphereGeometry(0.105, 10, 8), materials.skin, player);
  const rightHand = mesh(new THREE.SphereGeometry(0.105, 10, 8), materials.skin, player);
  const nose = mesh(new THREE.ConeGeometry(0.055, 0.13, 8), materials.skin, player);
  nose.rotation.z = -Math.PI / 2;
  leftBoot.userData.baseLength = 0.28 + 0.11 * 2;
  rightBoot.userData.baseLength = 0.32 + 0.11 * 2;
  leftBoot.scale.z = 0.72;
  rightBoot.scale.z = 0.72;

  const playerParts = {
    group: player, torso, chestStripe, shorts, head, hair,
    leftUpperArm, leftSleeve, leftForearm, rightUpperArm, rightSleeve, rightForearm,
    leftThigh, leftShort, leftShin, rightThigh, rightShort, rightShin,
    leftBoot, rightBoot, leftHand, rightHand, nose
  };

  function applyPose(pose) {
    const {
      hip, shoulder, neck, headCenter,
      lShoulder, lElbow, lWrist, rShoulder, rElbow, rWrist,
      lHip, lKnee, lAnkle, lToe, rHip, rKnee, rAnkle, rToe
    } = pose;

    setCapsule(torso, hip, shoulder, 1);
    torso.scale.x *= 1.18;
    torso.scale.z *= 0.75;
    chestStripe.position.copy(hip).lerp(shoulder, 0.72);
    chestStripe.quaternion.copy(torso.quaternion);
    chestStripe.scale.set(1.18, 1, 0.75);
    shorts.position.copy(hip);
    head.position.copy(headCenter);
    hair.position.copy(headCenter).add(v3(0, 0.095, 0));
    hair.quaternion.copy(torso.quaternion);
    leftHand.position.copy(lWrist);
    rightHand.position.copy(rWrist);
    nose.position.copy(headCenter).add(v3(-0.2, 0.01, 0));

    setCapsule(leftSleeve, lShoulder, lShoulder.clone().lerp(lElbow, 0.28));
    setCapsule(leftUpperArm, lShoulder.clone().lerp(lElbow, 0.23), lElbow);
    setCapsule(leftForearm, lElbow, lWrist);
    setCapsule(rightSleeve, rShoulder, rShoulder.clone().lerp(rElbow, 0.28));
    setCapsule(rightUpperArm, rShoulder.clone().lerp(rElbow, 0.23), rElbow);
    setCapsule(rightForearm, rElbow, rWrist);
    setCapsule(leftShort, lHip, lHip.clone().lerp(lKnee, 0.36));
    setCapsule(leftThigh, lHip.clone().lerp(lKnee, 0.3), lKnee);
    setCapsule(leftShin, lKnee, lAnkle);
    setCapsule(rightShort, rHip, rHip.clone().lerp(rKnee, 0.36));
    setCapsule(rightThigh, rHip.clone().lerp(rKnee, 0.3), rKnee);
    setCapsule(rightShin, rKnee, rAnkle);
    setCapsule(leftBoot, lAnkle, lToe);
    leftBoot.scale.z *= 0.72;
    setCapsule(rightBoot, rAnkle, rToe);
    rightBoot.scale.z *= 0.72;
  }

  return { ...playerParts, applyPose };
}

function createGoalkeeper() {
  const keeper = new THREE.Group();
  scene.add(keeper);
  const torso = mesh(new THREE.CapsuleGeometry(0.29, 0.62, 5, 10), materials.red, keeper);
  torso.scale.set(1.1, 1, 0.7);
  const shorts = mesh(new THREE.SphereGeometry(0.34, 10, 8), materials.redDark, keeper);
  shorts.scale.set(1, 0.72, 0.75);
  const head = mesh(new THREE.SphereGeometry(0.2, 12, 9), materials.skinLight, keeper);
  const parts = {
    leftArm: createSegment(keeper, 0.095, materials.red),
    rightArm: createSegment(keeper, 0.095, materials.red),
    leftLeg: createSegment(keeper, 0.12, materials.redDark),
    rightLeg: createSegment(keeper, 0.12, materials.redDark)
  };
  const gloveMat = material(0xe8ef78, 0.45);
  const leftGlove = mesh(new THREE.SphereGeometry(0.13, 10, 7), gloveMat, keeper);
  const rightGlove = mesh(new THREE.SphereGeometry(0.13, 10, 7), gloveMat, keeper);
  const leftFoot = mesh(new THREE.SphereGeometry(0.13, 9, 7), materials.black, keeper);
  const rightFoot = mesh(new THREE.SphereGeometry(0.13, 9, 7), materials.black, keeper);

  function update(t) {
    const release = smoother((t - RELEASE_START) / (DURATION - RELEASE_START));
    const center = v3(0.3 + release * 1.0, 1.18 - release * 0.52, -12.25);
    const shoulder = center.clone().add(v3(0.0, 0.34, 0));
    const hip = center.clone().add(v3(0.0, -0.32, 0));
    const rot = -0.65 - release * 0.2;
    torso.position.copy(center);
    torso.rotation.set(0, 0, rot);
    shorts.position.copy(hip);
    head.position.copy(shoulder).add(v3(-0.18, 0.28, 0));
    const leftHand = shoulder.clone().add(v3(0.95, 0.6 - release * 0.25, 0.04));
    const rightHand = shoulder.clone().add(v3(0.67, 0.24, -0.08));
    const leftAnkle = hip.clone().add(v3(-0.6, -0.58 + release * 0.25, 0.12));
    const rightAnkle = hip.clone().add(v3(0.45, -0.52 + release * 0.18, -0.08));
    setCapsule(parts.leftArm, shoulder.clone().add(v3(-0.12, 0.03, 0)), leftHand);
    setCapsule(parts.rightArm, shoulder.clone().add(v3(0.12, -0.04, 0)), rightHand);
    setCapsule(parts.leftLeg, hip.clone().add(v3(-0.12, 0, 0)), leftAnkle);
    setCapsule(parts.rightLeg, hip.clone().add(v3(0.12, 0, 0)), rightAnkle);
    leftGlove.position.copy(leftHand);
    rightGlove.position.copy(rightHand);
    leftFoot.position.copy(leftAnkle);
    rightFoot.position.copy(rightAnkle);
  }
  return { group: keeper, update };
}

const particles = [];
function createSuspendedParticles() {
  const group = new THREE.Group();
  scene.add(group);
  const dropletMat = new THREE.MeshPhysicalMaterial({
    color: 0xbce8ff,
    roughness: 0.1,
    transmission: 0.38,
    transparent: true,
    opacity: 0.82
  });
  for (let i = 0; i < 34; i += 1) {
    const angle = i * 2.399963;
    const radius = 0.38 + (i % 7) * 0.075;
    const droplet = mesh(new THREE.SphereGeometry(0.018 + (i % 3) * 0.006, 7, 5), dropletMat, group, false);
    const base = v3(
      -0.3 + Math.cos(angle) * radius,
      1.9 + Math.sin(i * 1.37) * 0.4,
      0.1 + Math.sin(angle) * radius * 0.55
    );
    particles.push({
      mesh: droplet,
      base,
      velocity: v3(Math.cos(angle) * 0.25, 0.2 + (i % 5) * 0.08, Math.sin(angle) * 0.2),
      gravity: 0.34
    });
  }
  for (let i = 0; i < 26; i += 1) {
    const angle = i * 1.618;
    const chunk = mesh(
      new THREE.TetrahedronGeometry(0.025 + (i % 4) * 0.012),
      i % 3 ? materials.dirt : materials.grassAlt,
      group
    );
    const base = v3(
      0.35 + Math.cos(angle) * (0.22 + (i % 6) * 0.07),
      0.12 + (i % 7) * 0.055,
      0.25 + Math.sin(angle) * 0.42
    );
    chunk.rotation.set(i * 0.8, i * 0.37, i * 0.51);
    particles.push({
      mesh: chunk,
      base,
      velocity: v3(Math.cos(angle) * 0.42, 0.4 + (i % 5) * 0.11, Math.sin(angle) * 0.35),
      gravity: 0.8
    });
  }
}

function buildPose(t) {
  const entry = smooth(t / FREEZE_START);
  const release = smoother((t - RELEASE_START) / (DURATION - RELEASE_START));
  const pre = 1 - entry;

  const hip = v3(-0.08 - pre * 0.65 + release * 0.42, 1.15 - pre * 0.85 - release * 0.92, 0.05 + pre * 0.55 - release * 0.55);
  const shoulder = hip.clone().add(v3(-0.74 + release * 0.14, 0.38 - release * 0.2, 0.04));
  const neck = shoulder.clone().add(v3(-0.31, 0.16, 0));
  const headCenter = neck.clone().add(v3(-0.22, 0.1 - release * 0.05, 0.01));

  const lShoulder = shoulder.clone().add(v3(-0.08, 0.06, 0.27));
  const rShoulder = shoulder.clone().add(v3(-0.08, 0.06, -0.27));
  const lElbow = lShoulder.clone().add(v3(-0.25, -0.45 - release * 0.1, 0.28));
  const lWrist = lElbow.clone().add(v3(-0.33, -0.2 - release * 0.12, 0.16));
  const rElbow = rShoulder.clone().add(v3(0.04, -0.5, -0.4));
  const rWrist = rElbow.clone().add(v3(-0.28, -0.25 - release * 0.08, -0.18));

  const lHip = hip.clone().add(v3(-0.02, 0.0, 0.2));
  const rHip = hip.clone().add(v3(0.02, 0.0, -0.2));
  const lKnee = lHip.clone().add(v3(0.82 - release * 0.16, 0.76 - release * 0.55, 0.16));
  const lAnkle = lKnee.clone().add(v3(0.73 - release * 0.25, 0.86 - release * 1.0, -0.08));
  const lToe = lAnkle.clone().add(v3(0.42, 0.14 - release * 0.1, -0.04));
  const rKnee = rHip.clone().add(v3(0.33, -0.72 + release * 0.2, -0.48));
  const rAnkle = rKnee.clone().add(v3(-0.62, -0.35 + release * 0.12, -0.24));
  const rToe = rAnkle.clone().add(v3(-0.28, -0.04, -0.17));

  return {
    hip, shoulder, neck, headCenter,
    lShoulder, lElbow, lWrist, rShoulder, rElbow, rWrist,
    lHip, lKnee, lAnkle, lToe, rHip, rKnee, rAnkle, rToe
  };
}

function updateBall(t) {
  const entry = smooth(t / FREEZE_START);
  const releaseTime = Math.max(0, t - RELEASE_START);
  const contact = v3(2.08, 2.92, -0.05);
  const start = v3(1.52, 2.48, 0.18);
  const base = start.clone().lerp(contact, entry);
  if (releaseTime > 0) {
    applyBallFlight(base, releaseTime);
  }
  ball.position.copy(base);
  ball.rotation.set(t * 1.9, t * 2.4 + releaseTime * 14, t * 0.8);
  for (let i = 0; i < ballTrail.length; i += 1) {
    const trailAge = (i + 1) * 0.018;
    const sampleTime = releaseTime - trailAge;
    const trail = ballTrail[i];
    trail.visible = sampleTime > 0.025;
    if (trail.visible) {
      trail.position.copy(contact);
      applyBallFlight(trail.position, sampleTime);
    }
  }
}

function applyBallFlight(position, flightTime) {
  position.x += flightTime * 0.28;
  position.y += flightTime * 0.72 - 0.5 * 6.3 * flightTime * flightTime;
  position.z -= flightTime * 21.5;
}

function updateParticles(t) {
  const entry = smooth(t / FREEZE_START);
  const releaseTime = Math.max(0, t - RELEASE_START);
  for (let i = 0; i < particles.length; i += 1) {
    const particle = particles[i];
    const p = particle.base.clone();
    p.addScaledVector(particle.velocity, -0.18 * (1 - entry));
    p.addScaledVector(particle.velocity, releaseTime);
    p.y -= particle.gravity * 0.5 * releaseTime * releaseTime;
    particle.mesh.position.copy(p);
    particle.mesh.rotation.set(i * 0.37 + releaseTime * 4, i * 0.61 + releaseTime * 3, i * 0.17);
  }
}

function updateCamera(t) {
  const entry = smooth(t / FREEZE_START);
  const orbit = smoother((t - FREEZE_START) / (RELEASE_START - FREEZE_START));
  const finish = smooth((t - RELEASE_START) / (DURATION - RELEASE_START));

  const start = v3(7.5, 3.7, 8.8);
  const angle = 0.85 + orbit * (Math.PI * 2 + 0.3);
  const radius = lerp(9.1, 6.75, Math.sin(orbit * Math.PI));
  const orbitPosition = v3(
    Math.cos(angle) * radius,
    0.72 + 2.45 * Math.pow(Math.abs(orbit - 0.52), 1.5),
    Math.sin(angle) * radius + 0.4
  );
  const behindBall = v3(2.55, 2.75, 5.7);
  const position = start.clone().lerp(orbitPosition, entry).lerp(behindBall, finish);
  camera.position.copy(position);

  const targetPlayer = v3(0.24, 1.52, 0);
  const targetGoal = v3(0.5, 1.3, -12.8);
  const target = targetPlayer.lerp(targetGoal, finish);
  camera.lookAt(target);
  camera.rotateZ(Math.sin(orbit * Math.PI * 2) * 0.024 * (1 - finish));
  camera.fov = 44.5 + Math.sin(orbit * Math.PI) * 3.5 - finish * 0.5;
  camera.updateProjectionMatrix();
}

function createLighting() {
  const hemi = new THREE.HemisphereLight(0xb6d9ff, 0x14341d, 1.5);
  scene.add(hemi);
  const key = new THREE.DirectionalLight(0xffffff, 4.2);
  key.position.set(6, 11, 8);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.left = -8;
  key.shadow.camera.right = 8;
  key.shadow.camera.top = 8;
  key.shadow.camera.bottom = -8;
  key.shadow.camera.near = 1;
  key.shadow.camera.far = 30;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x5aa6ff, 2.5);
  rim.position.set(-8, 7, -8);
  scene.add(rim);
  const goalLight = new THREE.PointLight(0xd9ebff, 45, 28, 1.5);
  goalLight.position.set(0, 8, -13);
  scene.add(goalLight);
  const actionSpot = new THREE.SpotLight(0xf6e9cb, 70, 22, 0.48, 0.55, 1.35);
  actionSpot.position.set(4.5, 9, 5.5);
  actionSpot.target.position.set(0.2, 1.25, 0);
  actionSpot.castShadow = true;
  actionSpot.shadow.mapSize.set(1024, 1024);
  scene.add(actionSpot, actionSpot.target);
  const coolFill = new THREE.PointLight(0x3c8dff, 22, 15, 1.8);
  coolFill.position.set(-4, 3.8, -2.5);
  scene.add(coolFill);
}

createSky();
createField();
createGoal();
createStadium();
createLighting();
const player = createPlayer();
const ball = createSoccerBall();
const ballTrail = Array.from({ length: 6 }, (_, i) => {
  const trail = mesh(
    new THREE.SphereGeometry(0.205 - i * 0.014, 14, 9),
    new THREE.MeshBasicMaterial({
      color: 0xd8f2ff,
      transparent: true,
      opacity: 0.19 - i * 0.022,
      depthWrite: false
    }),
    scene,
    false
  );
  trail.visible = false;
  return trail;
});
const keeper = createGoalkeeper();
createSuspendedParticles();

let currentTime = 0;
let playing = false;
let rafId = 0;
let lastTimestamp = 0;

function renderAt(t) {
  currentTime = Math.min(DURATION, Math.max(0, Number.isFinite(t) ? t : 0));
  player.applyPose(buildPose(currentTime));
  keeper.update(currentTime);
  updateBall(currentTime);
  updateParticles(currentTime);
  updateCamera(currentTime);
  renderer.render(scene, camera);
}

function animate(timestamp) {
  if (!playing) return;
  if (!lastTimestamp) lastTimestamp = timestamp;
  currentTime = (currentTime + (timestamp - lastTimestamp) / 1000) % DURATION;
  lastTimestamp = timestamp;
  renderAt(currentTime);
  rafId = requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    playing = false;
    cancelAnimationFrame(rafId);
    renderAt(currentTime);
  },
  seek(seconds) {
    playing = false;
    cancelAnimationFrame(rafId);
    renderAt(seconds);
  },
  play() {
    if (!playing) {
      playing = true;
      lastTimestamp = 0;
      rafId = requestAnimationFrame(animate);
    }
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
