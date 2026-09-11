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
    color: 0xeff1ed,
    roughness: 0.2,
    metalness: 0.58,
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

function addRobotDog() { window.__bfTrace?.add(332);
  const root = new THREE.Group();
  const torso = new THREE.Group();
  root.add(torso);

  const shell = new THREE.Mesh(new THREE.BoxGeometry(1.14, 0.54, 1.58), MAT.robotWhite);
  shell.position.y = 1.12;
  torso.add(shell);
  const spine = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.18, 1.82), MAT.robotBlue);
  spine.position.set(0, 1.43, -0.02);
  torso.add(spine);
  for (const side of [-1, 1]) {
    const sidePack = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.34, 1.16), MAT.dark);
    sidePack.position.set(side * 0.62, 1.1, 0);
    torso.add(sidePack);
    const idPanel = new THREE.Mesh(
      new THREE.PlaneGeometry(0.72, 0.25),
      new THREE.MeshBasicMaterial({
        map: makeTextTexture("K9", {
          width: 512,
          height: 180,
          fontSize: 112,
          background: "#ffb638",
          color: "#10191e",
          border: false,
        }),
        side: THREE.DoubleSide,
        toneMapped: false,
      }),
    );
    idPanel.position.set(side * 0.691, 1.12, 0);
    idPanel.rotation.y = side * Math.PI / 2;
    torso.add(idPanel);
  }

  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.42, 18), MAT.dark);
  neck.position.set(0, 1.38, 0.91);
  neck.rotation.x = Math.PI / 2;
  torso.add(neck);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.48, 0.66), MAT.robotWhite);
  head.position.set(0, 1.42, 1.17);
  torso.add(head);
  const snout = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.26, 0.28), MAT.dark);
  snout.position.set(0, 1.32, 1.6);
  torso.add(snout);
  const sensor = new THREE.Mesh(
    new THREE.CylinderGeometry(0.13, 0.13, 0.1, 20),
    new THREE.MeshStandardMaterial({
      color: 0x071216,
      emissive: 0x3de5ee,
      emissiveIntensity: 2.6,
      metalness: 0.65,
      roughness: 0.18,
    }),
  );
  sensor.position.set(0, 1.36, 1.76);
  sensor.rotation.x = Math.PI / 2;
  torso.add(sensor);
  for (const x of [-0.24, 0.24]) {
    const ear = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 4), MAT.dark);
    ear.position.set(x, 1.82, 1.18);
    ear.rotation.y = Math.PI / 4;
    torso.add(ear);
  }
  const status = new THREE.Mesh(
    new THREE.SphereGeometry(0.07, 16, 10),
    new THREE.MeshStandardMaterial({
      color: 0x70f4ff,
      emissive: 0x34dce6,
      emissiveIntensity: 3,
    }),
  );
  status.position.set(0, 1.56, 0.15);
  torso.add(status);

  const tailBase = new THREE.Group();
  tailBase.position.set(0, 1.3, -0.88);
  torso.add(tailBase);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.075, 0.72, 12), MAT.dark);
  tail.position.set(0, 0.24, -0.25);
  tail.rotation.x = -0.72;
  tailBase.add(tail);

  const legs = [];
  const legData = [
    { x: -0.54, z: 0.53, phase: 0, side: -1 },
    { x: 0.54, z: 0.53, phase: Math.PI, side: 1 },
    { x: -0.54, z: -0.56, phase: Math.PI, side: -1 },
    { x: 0.54, z: -0.56, phase: 0, side: 1 },
  ];
  for (const data of legData) {
    const upper = makeLimb(0.095, MAT.robotWhite);
    const lower = makeLimb(0.075, MAT.dark);
    const hipJoint = new THREE.Mesh(new THREE.SphereGeometry(0.15, 16, 12), MAT.dark);
    const kneeJoint = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), MAT.metal);
    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.36), MAT.dark);
    for (const part of [upper, lower, hipJoint, kneeJoint, foot]) {
      part.castShadow = true;
      part.receiveShadow = true;
      root.add(part);
    }
    legs.push({ ...data, upper, lower, hipJoint, kneeJoint, foot });
  }

  torso.traverse((child) => {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });
  scene.add(root);
  return { root, torso, legs, tailBase, status };
}

function routeAt(time) { window.__bfTrace?.add(446);
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
const dog = addRobotDog();

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

function updateDog(time) { window.__bfTrace?.add(506);
  const route = routeAt(time);
  const before = routeAt(Math.max(0, time - 0.012));
  const after = routeAt(Math.min(DURATION, time + 0.012));
  const speed = Math.hypot(after.x - before.x, after.z - before.z) / 0.024;
  const gait = THREE.MathUtils.clamp(speed / 3.1, 0, 1);
  const cycle = route.distance * Math.PI * 2 / 0.86;
  const bob = gait * (0.025 + 0.035 * Math.sin(cycle * 2));

  dog.root.position.set(route.x, 0, route.z);
  dog.root.rotation.y = route.yaw;
  dog.torso.position.y = bob;
  dog.torso.rotation.z = gait * Math.sin(cycle) * 0.018;
  dog.torso.rotation.x = gait * Math.sin(cycle * 2) * 0.012;
  dog.tailBase.rotation.z = 0.16 * Math.sin(time * 4.6);
  dog.status.material.emissiveIntensity = 2.6 + 0.7 * Math.sin(time * Math.PI * 2.2);

  for (const leg of dog.legs) {
    const phase = cycle + leg.phase;
    const swing = Math.sin(phase) * gait;
    const lift = Math.max(0, Math.cos(phase)) * 0.17 * gait;
    const hip = new THREE.Vector3(leg.x, 1.12 + bob, leg.z);
    const foot = new THREE.Vector3(leg.x, 0.13 + lift, leg.z - swing * 0.28);
    const knee = new THREE.Vector3(
      leg.x + leg.side * 0.14,
      0.57 + lift * 0.5 + bob * 0.45,
      (hip.z + foot.z) * 0.5 + (leg.z > 0 ? 0.05 : -0.04),
    );
    pointLimb(leg.upper, hip, knee);
    pointLimb(leg.lower, knee, foot);
    leg.hipJoint.position.copy(hip);
    leg.kneeJoint.position.copy(knee);
    leg.foot.position.copy(foot);
    leg.foot.rotation.x = -0.04 + lift * 0.5;
  }
}

let paused = false;
let liveStart = performance.now();
let liveOffset = 0;

function renderAt(time) { window.__bfTrace?.add(547);
  updateDog(time);
  renderer.render(scene, camera);
}

function tick(now) { window.__bfTrace?.add(552);
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
