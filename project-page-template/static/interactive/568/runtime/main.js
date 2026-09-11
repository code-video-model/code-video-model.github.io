import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcbdde1);
scene.fog = new THREE.Fog(0xcbdde1, 24, 42);

const camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, 0.1, 80);
camera.position.set(13.7, 10.5, 15.0);
camera.lookAt(1.65, 0.62, 1.05);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
});
renderer.setSize(WIDTH, HEIGHT, false);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

const MAT = {
  wall: new THREE.MeshStandardMaterial({ color: 0xe1e9e9, roughness: 0.82 }),
  wallInset: new THREE.MeshStandardMaterial({ color: 0x9ebfc3, roughness: 0.72 }),
  floor: new THREE.MeshStandardMaterial({
    color: 0xaec2c1,
    roughness: 0.4,
    metalness: 0.03,
  }),
  floorEdge: new THREE.MeshStandardMaterial({ color: 0x566f73, roughness: 0.7 }),
  trim: new THREE.MeshStandardMaterial({ color: 0x1e6d77, roughness: 0.48 }),
  door: new THREE.MeshStandardMaterial({ color: 0x1e6b79, roughness: 0.42 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x8d5c3b, roughness: 0.5 }),
  dark: new THREE.MeshStandardMaterial({
    color: 0x10191e,
    roughness: 0.26,
    metalness: 0.72,
  }),
  metal: new THREE.MeshStandardMaterial({
    color: 0x89999e,
    roughness: 0.22,
    metalness: 0.86,
  }),
  robotWhite: new THREE.MeshStandardMaterial({
    color: 0xd4dddc,
    roughness: 0.24,
    metalness: 0.64,
  }),
  robotBlue: new THREE.MeshStandardMaterial({
    color: 0x00627b,
    roughness: 0.22,
    metalness: 0.55,
  }),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0x8fcbd4,
    transparent: true,
    opacity: 0.28,
    roughness: 0.12,
    transmission: 0.25,
    side: THREE.DoubleSide,
  }),
  screen: new THREE.MeshStandardMaterial({
    color: 0x10282f,
    emissive: 0x22a6b8,
    emissiveIntensity: 1.8,
    roughness: 0.2,
  }),
  red: new THREE.MeshStandardMaterial({
    color: 0xa9242f,
    roughness: 0.42,
  }),
};

function mesh(geometry, material, position, cast = true, receive = true) { window.__bfTrace?.add(83);
  const item = new THREE.Mesh(geometry, material);
  item.position.set(...position);
  item.castShadow = cast;
  item.receiveShadow = receive;
  scene.add(item);
  return item;
}

function box(size, position, material, cast = true, receive = true) { window.__bfTrace?.add(92);
  return mesh(new THREE.BoxGeometry(...size), material, position, cast, receive);
}

function makeTextTexture(text, options = {}) { window.__bfTrace?.add(96);
  const canvas = document.createElement("canvas");
  canvas.width = options.width || 768;
  canvas.height = options.height || 192;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = options.background || "#f7fbfb";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (options.border !== false) {
    ctx.strokeStyle = options.borderColor || "#2f686f";
    ctx.lineWidth = 18;
    ctx.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  }
  ctx.fillStyle = options.color || "#173f46";
  ctx.font = `700 ${options.fontSize || 86}px Arial, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = maxAnisotropy;
  return texture;
}

function sign(text, size, position, rotation, options = {}) { window.__bfTrace?.add(119);
  const material = new THREE.MeshBasicMaterial({
    map: makeTextTexture(text, options),
    side: THREE.DoubleSide,
    toneMapped: false,
  });
  const item = mesh(new THREE.PlaneGeometry(...size), material, position, false, false);
  item.rotation.set(...rotation);
  return item;
}

function cylinder(radius, height, position, material, radialSegments = 20) { window.__bfTrace?.add(130);
  return mesh(
    new THREE.CylinderGeometry(radius, radius, height, radialSegments),
    material,
    position,
  );
}

function addFloorTiles(xMin, xMax, zMin, zMax) { window.__bfTrace?.add(138);
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xa7bbbc });
  for (let x = Math.ceil(xMin); x <= xMax; x += 1) {
    box([0.018, 0.005, zMax - zMin], [x, 0.016, (zMin + zMax) / 2], lineMaterial, false, false);
  }
  for (let z = Math.ceil(zMin); z <= zMax; z += 1) {
    box([xMax - xMin, 0.005, 0.018], [(xMin + xMax) / 2, 0.017, z], lineMaterial, false, false);
  }
}

function addWallPanelX(z, length) { window.__bfTrace?.add(148);
  box([0.16, 3.45, length], [-3.58, 1.725, z], MAT.wall);
  box([0.19, 0.17, length], [-3.47, 0.68, z], MAT.trim);
  box([0.2, 0.12, length], [-3.46, 0.12, z], MAT.floorEdge);
}

function addDoorOne() { window.__bfTrace?.add(154);
  box([0.1, 2.44, 1.46], [-3.46, 1.22, 0.25], MAT.door);
  box([0.18, 2.68, 0.13], [-3.35, 1.34, -0.53], MAT.metal);
  box([0.18, 2.68, 0.13], [-3.35, 1.34, 1.03], MAT.metal);
  box([0.18, 0.13, 1.68], [-3.35, 2.62, 0.25], MAT.metal);
  cylinder(0.055, 0.35, [-3.27, 1.2, 0.72], MAT.dark, 16).rotation.z = Math.PI / 2;
  sign("1", [0.52, 0.52], [-3.34, 2.96, 0.25], [0, Math.PI / 2, 0], {
    width: 256,
    height: 256,
    fontSize: 150,
  });
  sign("PATIENT ROOM", [1.12, 0.28], [-3.33, 2.25, 0.25], [0, Math.PI / 2, 0], {
    width: 640,
    height: 160,
    fontSize: 62,
    border: false,
  });
}

function addDoorTwo() { window.__bfTrace?.add(173);
  box([1.5, 2.46, 0.1], [7.35, 1.23, -4.88], MAT.door);
  box([0.13, 2.7, 0.18], [6.54, 1.35, -4.75], MAT.metal);
  box([0.13, 2.7, 0.18], [8.16, 1.35, -4.75], MAT.metal);
  box([1.74, 0.13, 0.18], [7.35, 2.64, -4.75], MAT.metal);
  cylinder(0.055, 0.36, [7.84, 1.18, -4.67], MAT.dark, 16).rotation.x = Math.PI / 2;
  sign("2", [0.52, 0.52], [7.35, 2.98, -4.68], [0, 0, 0], {
    width: 256,
    height: 256,
    fontSize: 150,
  });
  sign("IMAGING", [1.18, 0.3], [7.35, 2.25, -4.67], [0, 0, 0], {
    width: 640,
    height: 160,
    fontSize: 68,
    border: false,
  });
}

function addNurseStation() { window.__bfTrace?.add(192);
  box([1.12, 1.12, 4.15], [-2.76, 0.56, 5.28], MAT.wood);
  box([1.38, 0.16, 4.44], [-2.61, 1.16, 5.28], MAT.metal);
  box([0.12, 0.54, 4.14], [-2.14, 1.43, 5.28], MAT.glass);
  for (const z of [4.4, 6.0]) {
    const monitor = box([0.08, 0.55, 0.82], [-2.08, 1.78, z], MAT.screen);
    monitor.rotation.y = Math.PI / 2;
    cylinder(0.055, 0.42, [-2.31, 1.41, z], MAT.dark, 12);
    box([0.42, 0.05, 0.36], [-2.31, 1.2, z], MAT.dark);
  }
  sign("NURSE STATION", [2.85, 0.62], [-3.48, 2.64, 5.28], [0, Math.PI / 2, 0], {
    fontSize: 82,
    background: "#2e737b",
    color: "#ffffff",
    borderColor: "#b7e6e7",
  });
  const crossMat = new THREE.MeshBasicMaterial({ color: 0xe8ffff, toneMapped: false });
  box([0.03, 0.38, 0.13], [-2.03, 0.63, 5.28], crossMat, false, false);
  box([0.03, 0.13, 0.38], [-2.025, 0.63, 5.28], crossMat, false, false);
}

function addBench(x, z, yaw = 0) { window.__bfTrace?.add(213);
  const group = new THREE.Group();
  const seat = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.16, 0.48), MAT.trim);
  seat.position.y = 0.55;
  group.add(seat);
  const back = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.62, 0.12), MAT.trim);
  back.position.set(0, 0.87, -0.2);
  back.rotation.x = -0.12;
  group.add(back);
  for (const sx of [-0.56, 0.56]) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.5, 0.08), MAT.dark);
    leg.position.set(sx, 0.27, 0);
    group.add(leg);
  }
  group.position.set(x, 0, z);
  group.rotation.y = yaw;
  group.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(group);
}

function addHospitalEnvironment() { window.__bfTrace?.add(238);
  box([7.2, 0.22, 16.2], [0, -0.11, 3.3], MAT.floor, false, true);
  box([15.2, 0.22, 6.8], [4.0, -0.105, -1.8], MAT.floor, false, true);
  addFloorTiles(-3.5, 3.5, -4.8, 11.4);
  addFloorTiles(3.5, 11.5, -4.8, 1.55);

  addWallPanelX(3.3, 16.2);
  box([15.2, 3.45, 0.16], [4.0, 1.725, -5.02], MAT.wall);
  box([15.2, 0.17, 0.2], [4.0, 0.68, -4.9], MAT.trim);
  box([15.2, 0.12, 0.2], [4.0, 0.12, -4.88], MAT.floorEdge);

  // Near-side cutaway walls retain architectural depth without hiding the route.
  box([0.16, 0.88, 9.5], [3.58, 0.44, 6.65], MAT.wallInset);
  box([8.0, 0.88, 0.16], [7.55, 0.44, 1.62], MAT.wallInset);
  for (const z of [10.8, 7.6, 2.0]) {
    box([0.22, 1.08, 0.28], [3.58, 0.54, z], MAT.metal);
  }
  for (const x of [4.0, 8.0, 11.4]) {
    box([0.28, 1.08, 0.22], [x, 0.54, 1.62], MAT.metal);
  }
  for (const x of [5.0, 9.0]) {
    box([3.4, 0.14, 0.14], [x, 1.02, 1.62], MAT.metal);
  }

  addNurseStation();
  addDoorOne();
  addDoorTwo();
  addBench(9.9, -4.35, 0);

  // Wayfinding stripe makes the L-shaped task route legible from the fixed camera.
  const stripe = new THREE.MeshBasicMaterial({ color: 0x3f9eaa });
  box([0.12, 0.014, 12.05], [0, 0.026, 4.95], stripe, false, false);
  box([5.73, 0.014, 0.12], [4.385, 0.027, -2.54], stripe, false, false);
  for (let i = 0; i < 18; i += 1) {
    const angle = Math.PI + ((i + 0.5) / 18) * Math.PI * 0.5;
    const turnStripe = box(
      [0.14, 0.014, 0.12],
      [1.52 + 1.52 * Math.cos(angle), 0.029, -1.02 + 1.52 * Math.sin(angle)],
      stripe,
      false,
      false,
    );
    turnStripe.rotation.y = -(angle + Math.PI * 0.5);
  }

  for (const z of [8.8, 4.7, 0.6]) {
    const lightPanel = box(
      [1.35, 0.07, 0.55],
      [0.15, 3.28, z],
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xf1ffff,
        emissiveIntensity: 2.2,
      }),
      false,
      false,
    );
    lightPanel.rotation.y = 0;
  }
  for (const x of [4.4, 8.2]) {
    box(
      [1.35, 0.07, 0.55],
      [x, 3.28, -1.55],
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xf1ffff,
        emissiveIntensity: 2.2,
      }),
      false,
      false,
    );
  }

  sign("RIGHT WING", [2.05, 0.42], [3.7, 2.85, -4.9], [0, 0, 0], {
    fontSize: 74,
    background: "#e8f4f3",
    color: "#23585f",
  });
}

function makeLimb(radius, material) { window.__bfTrace?.add(318);
  const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 1, 14), material);
  limb.castShadow = true;
  limb.receiveShadow = true;
  return limb;
}

function pointLimb(limb, start, end) { window.__bfTrace?.add(325);
  const delta = end.clone().sub(start);
  limb.position.copy(start).add(end).multiplyScalar(0.5);
  limb.scale.set(1, delta.length(), 1);
  limb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
}

function addHumanoidRobot() { window.__bfTrace?.add(332);
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  const jointAccent = new THREE.MeshStandardMaterial({
    color: 0xf0a43a,
    roughness: 0.28,
    metalness: 0.54,
  });

  const waist = new THREE.Mesh(new THREE.CylinderGeometry(0.23, 0.27, 0.23, 18), MAT.dark);
  waist.position.y = 1.31;
  body.add(waist);
  const pelvis = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.28, 0.4), MAT.robotWhite);
  pelvis.position.y = 1.2;
  body.add(pelvis);
  const pelvisCore = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.18, 0.45), MAT.robotBlue);
  pelvisCore.position.set(0, 1.22, 0.04);
  body.add(pelvisCore);

  const chest = new THREE.Mesh(
    new THREE.CylinderGeometry(0.42, 0.31, 0.68, 8),
    MAT.robotWhite,
  );
  chest.position.y = 1.68;
  chest.rotation.y = Math.PI / 8;
  body.add(chest);
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.38, 0.09), MAT.robotBlue);
  chestPlate.position.set(0, 1.7, 0.33);
  body.add(chestPlate);
  const chestInset = new THREE.Mesh(new THREE.BoxGeometry(0.23, 0.13, 0.03), MAT.screen);
  chestInset.position.set(0, 1.72, 0.385);
  body.add(chestInset);
  const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.48, 0.18), MAT.dark);
  backpack.position.set(0, 1.67, -0.34);
  body.add(backpack);
  const rearBeacon = new THREE.Mesh(
    new THREE.BoxGeometry(0.24, 0.075, 0.025),
    new THREE.MeshStandardMaterial({
      color: 0x70f4ff,
      emissive: 0x21ccd8,
      emissiveIntensity: 2.8,
      metalness: 0.42,
      roughness: 0.18,
    }),
  );
  rearBeacon.position.set(0, 1.7, -0.445);
  body.add(rearBeacon);

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.21, 16), MAT.dark);
  neck.position.y = 2.08;
  body.add(neck);
  const head = new THREE.Group();
  head.position.y = 2.32;
  body.add(head);
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), MAT.robotWhite);
  cranium.scale.set(1, 1.05, 0.84);
  head.add(cranium);
  const face = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.2, 0.08), MAT.dark);
  face.position.set(0, -0.015, 0.235);
  head.add(face);
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.07, 0.012),
    new THREE.MeshStandardMaterial({
      color: 0x75f6ff,
      emissive: 0x26cbd8,
      emissiveIntensity: 3.2,
      metalness: 0.45,
      roughness: 0.16,
    }),
  );
  visor.position.set(0, 0.015, 0.281);
  head.add(visor);
  for (const side of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.055, 16), MAT.robotBlue);
    ear.position.set(side * 0.265, 0, 0);
    ear.rotation.z = Math.PI / 2;
    head.add(ear);
  }

  const status = new THREE.Mesh(
    new THREE.SphereGeometry(0.055, 16, 10),
    new THREE.MeshStandardMaterial({
      color: 0x70f4ff,
      emissive: 0x34dce6,
      emissiveIntensity: 3,
    }),
  );
  status.position.set(0, 1.92, 0.305);
  body.add(status);

  const legs = [];
  for (const side of [-1, 1]) {
    const upper = makeLimb(0.108, MAT.robotWhite);
    const lower = makeLimb(0.084, MAT.dark);
    const hipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.145, 16, 12), MAT.dark);
    const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), MAT.metal);
    const kneeCap = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.18, 0.08), jointAccent);
    const ankleJoint = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), MAT.robotBlue);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.13, 0.4), MAT.dark);
    for (const part of [upper, lower, hipJoint, kneeJoint, kneeCap, foot]) {
      part.castShadow = true;
      part.receiveShadow = true;
      root.add(part);
    }
    ankleJoint.castShadow = true;
    root.add(ankleJoint);
    legs.push({
      side,
      phase: side < 0 ? 0 : Math.PI,
      upper,
      lower,
      hipJoint,
      kneeJoint,
      kneeCap,
      ankleJoint,
      foot,
    });
  }

  const arms = [];
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), MAT.robotBlue);
    const upper = makeLimb(0.09, MAT.robotWhite);
    const lower = makeLimb(0.075, MAT.dark);
    const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.105, 14, 10), MAT.metal);
    const wrist = new THREE.Mesh(new THREE.SphereGeometry(0.075, 14, 10), MAT.robotBlue);
    const hand = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.22, 0.15), MAT.dark);
    for (const part of [shoulder, upper, lower, elbow, wrist, hand]) {
      part.castShadow = true;
      part.receiveShadow = true;
      root.add(part);
    }
    arms.push({ side, shoulder, upper, lower, elbow, wrist, hand });
  }

  body.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(root);
  return { root, body, head, legs, arms, status, rearBeacon };
}

function routeAt(time) { window.__bfTrace?.add(478);
  const t = THREE.MathUtils.clamp(time, 0, DURATION);
  const straightLength = 10.37;
  const turnRadius = 1.52;
  const turnLength = turnRadius * Math.PI * 0.5;
  const finalLength = 5.73;
  const totalLength = straightLength + turnLength + finalLength;
  const motion = THREE.MathUtils.smootherstep(t, 0.22, 4.86);
  const distance = motion * totalLength;
  if (distance <= straightLength) {
    return { x: 0, z: 9.35 - distance, yaw: Math.PI, distance };
  }
  if (distance <= straightLength + turnLength) {
    const arcDistance = distance - straightLength;
    const angle = Math.PI + arcDistance / turnRadius;
    return {
      x: 1.52 + turnRadius * Math.cos(angle),
      z: -1.02 + turnRadius * Math.sin(angle),
      yaw: Math.PI - arcDistance / turnRadius,
      distance,
    };
  }
  const exitDistance = Math.min(finalLength, distance - straightLength - turnLength);
  return {
    x: 1.52 + exitDistance,
    z: -2.54,
    yaw: Math.PI / 2,
    distance,
  };
}

addHospitalEnvironment();
const humanoid = addHumanoidRobot();

const hemisphere = new THREE.HemisphereLight(0xe6fbff, 0x667778, 1.55);
scene.add(hemisphere);
const sun = new THREE.DirectionalLight(0xffffff, 2.65);
sun.position.set(8, 15, 11);
sun.target.position.set(1.5, 0, 1.5);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -14;
sun.shadow.camera.right = 14;
sun.shadow.camera.top = 16;
sun.shadow.camera.bottom = -12;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 36;
sun.shadow.bias = -0.0003;
scene.add(sun, sun.target);
for (const [x, z, intensity] of [
  [0, 6, 7.5],
  [0, 0, 6.5],
  [5, -2, 7],
  [9, -2, 6],
]) {
  const light = new THREE.PointLight(0xe8fcff, intensity, 8.5, 1.65);
  light.position.set(x, 3.0, z);
  scene.add(light);
}

function updateHumanoid(time) { window.__bfTrace?.add(538);
  const route = routeAt(time);
  const before = routeAt(Math.max(0, time - 0.012));
  const after = routeAt(Math.min(DURATION, time + 0.012));
  const speed = Math.hypot(after.x - before.x, after.z - before.z) / 0.024;
  const gait = THREE.MathUtils.clamp(speed / 3.1, 0, 1);
  const cycle = route.distance * Math.PI * 2 / 1.46;
  const bob = gait * (0.018 - 0.035 * Math.cos(cycle * 2));

  humanoid.root.position.set(route.x, 0, route.z);
  humanoid.root.rotation.y = route.yaw;
  humanoid.body.position.y = bob;
  humanoid.body.rotation.z = gait * Math.sin(cycle) * 0.025;
  humanoid.body.rotation.x = gait * Math.cos(cycle * 2) * 0.012;
  humanoid.head.rotation.y = gait * Math.sin(cycle) * 0.045;
  humanoid.status.material.emissiveIntensity = 2.6 + 0.7 * Math.sin(time * Math.PI * 2.2);
  humanoid.rearBeacon.material.emissiveIntensity =
    2.5 + 0.55 * Math.sin(time * Math.PI * 2.2);

  for (const leg of humanoid.legs) {
    const phase = cycle + leg.phase;
    const swing = Math.sin(phase) * 0.34 * gait;
    const liftWave = Math.max(0, Math.cos(phase));
    const lift = THREE.MathUtils.smootherstep(liftWave, 0, 1) * 0.18 * gait;
    const hip = new THREE.Vector3(leg.side * 0.205, 1.2 + bob, 0);
    const ankle = new THREE.Vector3(leg.side * 0.205, 0.18 + lift, -swing);
    const knee = new THREE.Vector3(
      leg.side * 0.22,
      0.69 + lift * 0.48 + bob * 0.5,
      (hip.z + ankle.z) * 0.5 + 0.1 + lift * 0.34,
    );
    pointLimb(leg.upper, hip, knee);
    pointLimb(leg.lower, knee, ankle);
    leg.hipJoint.position.copy(hip);
    leg.kneeJoint.position.copy(knee);
    leg.kneeCap.position.set(knee.x, knee.y, knee.z + 0.105);
    leg.ankleJoint.position.copy(ankle);
    leg.foot.position.set(ankle.x, 0.09 + lift, ankle.z + 0.1);
    leg.foot.rotation.x = lift > 0 ? -0.08 - lift * 0.7 : 0;
  }

  for (const arm of humanoid.arms) {
    const armSwing = -Math.sin(cycle + (arm.side < 0 ? 0 : Math.PI)) * 0.34 * gait;
    const shoulder = new THREE.Vector3(arm.side * 0.46, 1.9 + bob, 0);
    const elbow = new THREE.Vector3(
      arm.side * 0.49,
      1.47 + bob + Math.abs(armSwing) * 0.03,
      armSwing,
    );
    const wrist = new THREE.Vector3(
      arm.side * 0.47,
      1.08 + bob + Math.max(0, -armSwing) * 0.08,
      armSwing * 1.3 + 0.04,
    );
    pointLimb(arm.upper, shoulder, elbow);
    pointLimb(arm.lower, elbow, wrist);
    arm.shoulder.position.copy(shoulder);
    arm.elbow.position.copy(elbow);
    arm.wrist.position.copy(wrist);
    arm.hand.position.set(wrist.x, wrist.y - 0.11, wrist.z + 0.015);
  }
}

let paused = false;
let liveStart = performance.now();
let liveOffset = 0;

function renderAt(time) { window.__bfTrace?.add(605);
  updateHumanoid(time);
  renderer.render(scene, camera);
}

function tick(now) { window.__bfTrace?.add(610);
  if (!paused) {
    const time = (liveOffset + (now - liveStart) / 1000) % DURATION;
    renderAt(time);
  }
  requestAnimationFrame(tick);
}

window.reconstruction = {
  pause() {
    paused = true;
  },
  seek(seconds) {
    paused = true;
    const time = THREE.MathUtils.clamp(Number(seconds) || 0, 0, DURATION);
    liveOffset = time;
    renderAt(time);
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
};

renderAt(0);
window.sceneReady = true;
requestAnimationFrame(tick);
