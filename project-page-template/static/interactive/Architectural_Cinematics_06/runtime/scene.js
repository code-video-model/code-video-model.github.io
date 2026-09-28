import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAMES = 124;
const DURATION = FRAMES / FPS;

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
renderer.toneMappingExposure = 0.96;
renderer.domElement.id = "reconstruction-canvas";
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xc9d8dc);
scene.fog = new THREE.Fog(0xc9d8dc, 22, 46);

const camera = new THREE.PerspectiveCamera(58, WIDTH / HEIGHT, 0.05, 80);
camera.up.set(0, 1, 0);

const matte = (color, roughness = 0.72) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness: 0.03 });
const metal = (color, roughness = 0.22, metalness = 0.85) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness });
const emissive = (color, intensity = 1.8) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.35,
  });

const materials = {
  wall: matte(0xe4dfd4, 0.83),
  wallWarm: matte(0xd2c7b6, 0.78),
  trim: matte(0x223238, 0.48),
  floor: new THREE.MeshPhysicalMaterial({
    color: 0xbfc5c1,
    roughness: 0.2,
    metalness: 0.05,
    clearcoat: 0.68,
    clearcoatRoughness: 0.14,
  }),
  floorLine: matte(0x727b7b, 0.55),
  concrete: matte(0xb8b4aa, 0.88),
  bronze: metal(0x98683b, 0.25, 0.78),
  darkMetal: metal(0x21282c, 0.17, 0.92),
  cobalt: new THREE.MeshPhysicalMaterial({
    color: 0x174ea0,
    roughness: 0.15,
    metalness: 0.25,
    clearcoat: 0.9,
  }),
  crimson: matte(0xa93038, 0.36),
  gold: metal(0xd09d41, 0.21, 0.82),
  glass: new THREE.MeshPhysicalMaterial({
    color: 0xbad5da,
    roughness: 0.08,
    metalness: 0,
    transmission: 0.28,
    transparent: true,
    opacity: 0.34,
    depthWrite: false,
  }),
  glassEdge: metal(0x516267, 0.32, 0.72),
};

function mesh(geometry, material, position = [0, 0, 0], rotation = [0, 0, 0]) { window.__bfTrace?.add(79);
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  scene.add(object);
  return object;
}

function addBox(name, size, position, material, rotation = [0, 0, 0], parent = scene) { window.__bfTrace?.add(89);
  const object = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  object.name = name;
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function addCylinder(name, radiusTop, radiusBottom, height, position, material, parent = scene, radial = 24) { window.__bfTrace?.add(100);
  const object = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, radial),
    material,
  );
  object.name = name;
  object.position.set(...position);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function addRail(x, z, length, alongZ = true) { window.__bfTrace?.add(113);
  const group = new THREE.Group();
  group.position.set(x, 5.82, z);
  scene.add(group);
  const glassSize = alongZ ? [0.055, 1.28, length] : [length, 1.28, 0.055];
  addBox("glass-railing", glassSize, [0, 0, 0], materials.glass, [0, 0, 0], group);
  const barSize = alongZ ? [0.085, 0.07, length] : [length, 0.07, 0.085];
  addBox("railing-top", barSize, [0, 0.69, 0], materials.glassEdge, [0, 0, 0], group);
  const count = Math.ceil(length / 2.2);
  for (let i = 0; i <= count; i += 1) {
    const offset = -length / 2 + (i * length) / count;
    const postPos = alongZ ? [0, 0, offset] : [offset, 0, 0];
    addBox("railing-post", [0.07, 1.38, 0.07], postPos, materials.glassEdge, [0, 0, 0], group);
  }
}

// Architectural shell and polished floor.
mesh(new THREE.PlaneGeometry(22, 33), materials.floor, [0, 0, 1], [-Math.PI / 2, 0, 0]);
addBox("left-wall", [0.35, 10.2, 33], [-10.8, 5.1, 1], materials.wall);
addBox("right-wall", [0.35, 10.2, 33], [10.8, 5.1, 1], materials.wall);
addBox("far-wall", [22, 10.2, 0.38], [0, 5.1, -15.4], materials.wallWarm);
addBox("entry-lintel", [8.4, 1.8, 0.45], [0, 8.8, 17.2], materials.wall);

for (let x = -10; x <= 10; x += 2) {
  addBox("floor-joint-x", [0.014, 0.012, 32], [x, 0.011, 1], materials.floorLine);
}
for (let z = -15; z <= 17; z += 2) {
  addBox("floor-joint-z", [20, 0.012, 0.014], [0, 0.012, z], materials.floorLine);
}

// Rhythm of structural columns creates strong parallax during the camera move.
for (const side of [-1, 1]) {
  for (const z of [-12.5, -7.5, -2.5, 2.5, 7.5, 12.5]) {
    addBox("atrium-column", [0.72, 9.4, 0.72], [side * 8.85, 4.7, z], materials.concrete);
    addBox("column-shadow-gap", [0.79, 0.12, 0.79], [side * 8.85, 0.08, z], materials.trim);
  }
}

// Upper-level walkways and far bridge.
addBox("left-mezzanine", [3.8, 0.45, 29], [-8.82, 5.05, 0.4], materials.concrete);
addBox("right-mezzanine", [3.8, 0.45, 29], [8.82, 5.05, 0.4], materials.concrete);
addBox("far-bridge", [14, 0.45, 3.0], [0, 5.05, -12.7], materials.concrete);
addRail(-6.92, 0.4, 29, true);
addRail(6.92, 0.4, 29, true);
addRail(0, -11.18, 13.85, false);

// Broad stair at the far end reinforces depth and connects to the mezzanine.
for (let i = 0; i < 13; i += 1) {
  addBox(
    "stair-tread",
    [5.3, 0.18, 0.62],
    [5.1, 0.09 + i * 0.39, -13.3 + i * 0.52],
    materials.concrete,
  );
}

// Ceiling trusses and luminous skylight bands.
for (let z = -14; z <= 16; z += 3.75) {
  addBox("ceiling-beam", [21.2, 0.18, 0.18], [0, 9.55, z], materials.trim);
}
for (const x of [-4.8, 0, 4.8]) {
  addBox("skylight", [2.6, 0.08, 30], [x, 9.48, 0.5], emissive(0xe9f6f6, 1.35));
}

// Geometric wall reliefs make the building clearly read as a modern art museum.
function addRelief(side, z, colors) { window.__bfTrace?.add(178);
  const x = side * 10.57;
  const rotationY = side < 0 ? Math.PI / 2 : -Math.PI / 2;
  addBox("art-frame", [0.16, 2.9, 4.3], [x, 2.65, z], materials.trim, [0, rotationY, 0]);
  colors.forEach((color, index) => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.65 + index * 0.18, 1.02),
      matte(color, 0.42),
    );
    panel.position.set(x - side * 0.14, 1.75 + index * 0.55, z - 1.35 + index * 0.9);
    panel.rotation.y = rotationY;
    panel.castShadow = true;
    scene.add(panel);
  });
}
addRelief(-1, -6.2, [0xca463e, 0xe0aa3c, 0x254d72, 0xe6dfd2]);
addRelief(1, -2.2, [0x183e5c, 0x4e8e7e, 0xd8c8a5, 0xa53f39]);
addRelief(-1, 5.2, [0x2e4e73, 0xd2aa4b, 0xb7483d, 0xe9ddc6]);

function createPedestal(position, size = [1.2, 0.78, 1.2]) { window.__bfTrace?.add(197);
  const group = new THREE.Group();
  group.position.set(...position);
  scene.add(group);
  addBox("pedestal", size, [0, size[1] / 2, 0], materials.wallWarm, [0, 0, 0], group);
  addBox(
    "pedestal-base",
    [size[0] + 0.1, 0.07, size[2] + 0.1],
    [0, 0.035, 0],
    materials.trim,
    [0, 0, 0],
    group,
  );
  return group;
}

// The opening sculpture sits directly in front of the floor-level lens.
const entryPedestal = createPedestal([0.25, 0, 12.38], [1.42, 0.54, 1.42]);
const entrySculpture = new THREE.Mesh(
  new THREE.TorusKnotGeometry(0.62, 0.19, 112, 18, 2, 3),
  materials.darkMetal,
);
entrySculpture.name = "entry-torus-sculpture";
entrySculpture.position.set(0, 1.33, 0);
entrySculpture.rotation.set(0.2, -0.25, 0.58);
entrySculpture.castShadow = true;
entryPedestal.add(entrySculpture);

// Two contrasting pedestals form the high-speed gateway.
const leftPedestal = createPedestal([-2.15, 0, 8.45], [1.26, 0.88, 1.26]);
const blueSculpture = new THREE.Mesh(
  new THREE.IcosahedronGeometry(0.76, 3),
  materials.cobalt,
);
blueSculpture.name = "blue-faceted-sculpture";
blueSculpture.position.set(0, 1.55, 0);
blueSculpture.scale.set(0.72, 1.25, 0.72);
blueSculpture.rotation.set(0.1, 0.4, -0.18);
blueSculpture.castShadow = true;
leftPedestal.add(blueSculpture);

const rightPedestal = createPedestal([2.18, 0, 8.15], [1.18, 1.02, 1.18]);
const goldGroup = new THREE.Group();
goldGroup.position.y = 1.55;
rightPedestal.add(goldGroup);
for (let i = 0; i < 3; i += 1) {
  const arc = new THREE.Mesh(
    new THREE.TorusGeometry(0.55 - i * 0.07, 0.11, 16, 56, Math.PI * 1.55),
    materials.gold,
  );
  arc.position.y = (i - 1) * 0.36;
  arc.rotation.set(Math.PI / 2, i * 0.7, i * 0.45);
  arc.castShadow = true;
  goldGroup.add(arc);
}

const redPedestal = createPedestal([-4.8, 0, 0.6], [1.55, 0.6, 1.55]);
const redSculpture = new THREE.Mesh(
  new THREE.TorusGeometry(0.86, 0.22, 20, 64),
  materials.crimson,
);
redSculpture.position.set(0, 1.55, 0);
redSculpture.rotation.set(0, 0.42, 0);
redSculpture.castShadow = true;
redPedestal.add(redSculpture);

// Articulated lone visitor.
const visitor = new THREE.Group();
visitor.name = "lone-visitor";
scene.add(visitor);

const skin = matte(0xb97653, 0.72);
const coat = matte(0x24475b, 0.64);
const shirt = matte(0xe2ddd0, 0.74);
const trousers = matte(0x273039, 0.78);
const shoes = matte(0x17191b, 0.55);
const hair = matte(0x2a211d, 0.84);
const strapMaterial = matte(0x4b2522, 0.62);

addCylinder("visitor-torso", 0.31, 0.4, 0.78, [0, 1.28, 0], coat, visitor, 20);
addBox("visitor-shirt", [0.3, 0.18, 0.1], [0, 1.53, -0.31], shirt, [0.12, 0, 0], visitor);
addBox("left-lapel", [0.13, 0.34, 0.055], [-0.12, 1.43, -0.345], coat, [0.14, 0, -0.28], visitor);
addBox("right-lapel", [0.13, 0.34, 0.055], [0.12, 1.43, -0.345], coat, [0.14, 0, 0.28], visitor);
addCylinder("visitor-neck", 0.11, 0.12, 0.16, [0, 1.75, 0], skin, visitor, 18);
const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 24, 18), skin);
head.name = "visitor-head";
head.position.set(0, 1.98, 0);
head.scale.set(0.9, 1.1, 0.92);
head.castShadow = true;
visitor.add(head);
const hairCap = new THREE.Mesh(
  new THREE.SphereGeometry(0.225, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.55),
  hair,
);
hairCap.position.set(0, 2.04, 0);
hairCap.castShadow = true;
visitor.add(hairCap);

for (const side of [-1, 1]) {
  const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 8), skin);
  ear.name = "visitor-ear";
  ear.position.set(side * 0.205, 1.98, 0);
  ear.scale.set(0.55, 1, 0.7);
  visitor.add(ear);
}
for (const side of [-1, 1]) {
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 12, 8), hair);
  eye.name = "visitor-eye";
  eye.position.set(side * 0.07, 2.01, -0.205);
  eye.scale.set(1.05, 0.72, 0.5);
  visitor.add(eye);
}
const nose = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.105, 12), skin);
nose.name = "visitor-nose";
nose.position.set(0, 1.955, -0.237);
nose.rotation.x = -Math.PI / 2;
visitor.add(nose);
addBox("visitor-mouth", [0.085, 0.018, 0.018], [0, 1.89, -0.221], strapMaterial, [0, 0, 0], visitor);

const bag = addBox(
  "visitor-messenger-bag",
  [0.38, 0.42, 0.2],
  [0.45, 1.05, 0.02],
  materials.crimson,
  [0, 0.05, -0.04],
  visitor,
);
addBox("visitor-bag-flap", [0.34, 0.17, 0.035], [0, 0.11, -0.112], strapMaterial, [0, 0, 0], bag);
const strapCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.28, 1.58, -0.29),
  new THREE.Vector3(0.02, 1.39, -0.36),
  new THREE.Vector3(0.43, 1.17, -0.2),
  new THREE.Vector3(0.46, 1.06, -0.09),
]);
const strap = new THREE.Mesh(
  new THREE.TubeGeometry(strapCurve, 24, 0.025, 8, false),
  strapMaterial,
);
strap.name = "visitor-bag-strap";
strap.castShadow = true;
visitor.add(strap);

function makeArm(side) { window.__bfTrace?.add(339);
  const shoulder = new THREE.Group();
  shoulder.name = side < 0 ? "left-arm" : "right-arm";
  shoulder.position.set(side * 0.37, 1.56, 0);
  visitor.add(shoulder);
  const upper = addCylinder("upper-arm", 0.105, 0.09, 0.52, [0, -0.25, 0], coat, shoulder, 16);
  const elbow = new THREE.Group();
  elbow.position.y = -0.5;
  shoulder.add(elbow);
  addCylinder("forearm", 0.085, 0.07, 0.45, [0, -0.21, 0], skin, elbow, 16);
  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 10), skin);
  hand.position.y = -0.45;
  elbow.add(hand);
  return { shoulder, elbow, upper };
}

function makeLeg(side) { window.__bfTrace?.add(355);
  const hip = new THREE.Group();
  hip.name = side < 0 ? "left-leg" : "right-leg";
  hip.position.set(side * 0.18, 0.94, 0);
  visitor.add(hip);
  addCylinder("upper-leg", 0.14, 0.115, 0.5, [0, -0.24, 0], trousers, hip, 16);
  const knee = new THREE.Group();
  knee.position.y = -0.48;
  hip.add(knee);
  addCylinder("lower-leg", 0.11, 0.09, 0.48, [0, -0.23, 0], trousers, knee, 16);
  const foot = addBox("shoe", [0.21, 0.14, 0.38], [0, -0.49, -0.08], shoes, [0, 0, 0], knee);
  return { hip, knee, foot };
}

const leftArm = makeArm(-1);
const rightArm = makeArm(1);
const leftLeg = makeLeg(-1);
const rightLeg = makeLeg(1);

// Museum lighting: cool daylight, warm focused exhibit pools, and soft fill.
scene.add(new THREE.HemisphereLight(0xe7f7ff, 0x625b53, 1.55));
const sun = new THREE.DirectionalLight(0xfff5df, 2.35);
sun.position.set(-5, 12, 9);
sun.target.position.set(0, 0, 0);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.left = -13;
sun.shadow.camera.right = 13;
sun.shadow.camera.top = 17;
sun.shadow.camera.bottom = -17;
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 35;
sun.shadow.bias = -0.00025;
scene.add(sun, sun.target);

const visitorKey = new THREE.SpotLight(0xffc88f, 18, 12, Math.PI / 7, 0.72, 1.45);
visitorKey.position.set(3.4, 6.8, 4.8);
visitorKey.target = visitor;
visitorKey.castShadow = false;
scene.add(visitorKey);

for (const [x, z, targetX, targetZ] of [
  [-3.5, 10, 0.25, 12.38],
  [-4, 6, -2.15, 8.45],
  [4, 6, 2.18, 8.15],
  [-5, -1.5, -4.8, 0.6],
]) {
  const spot = new THREE.SpotLight(0xffe2b6, 35, 14, Math.PI / 7, 0.55, 1.5);
  spot.position.set(x, 7.8, z);
  spot.target.position.set(targetX, 0.6, targetZ);
  spot.castShadow = false;
  scene.add(spot, spot.target);
}

const approachCurve = new THREE.CatmullRomCurve3(
  [
    new THREE.Vector3(-0.58, 0.2, 14.75),
    new THREE.Vector3(-1.12, 0.23, 13.22),
    new THREE.Vector3(-0.82, 0.34, 10.55),
    new THREE.Vector3(0.04, 0.7, 7.42),
    new THREE.Vector3(0.88, 1.44, 3.82),
    new THREE.Vector3(2.8, 1.66, 1.02),
  ],
  false,
  "catmullrom",
  0.45,
);

const cameraPosition = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
const orbitPosition = new THREE.Vector3();
const craneStart = new THREE.Vector3();
const craneControl = new THREE.Vector3(-4.25, 4.15, 2.65);
const craneEnd = new THREE.Vector3(-7.15, 7.45, 9.55);

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smooth = (value) => {
  const x = clamp01(value);
  return x * x * (3 - 2 * x);
};
const smoother = (value) => {
  const x = clamp01(value);
  return x * x * x * (x * (x * 6 - 15) + 10);
};
const flowingEase = (value, linearWeight = 0.14) => {
  const x = clamp01(value);
  return linearWeight * x + (1 - linearWeight) * smoother(x);
};

function visitorCenterAt(time, target = new THREE.Vector3()) {
  return target.set(0.18, 1.18, 1.2 - time * 0.42);
}

function orbitCameraAt(time, target = new THREE.Vector3()) {
  const orbitU = flowingEase((time - 2.0) / 1.75, 0.16);
  const angle = 0.25 - Math.PI * orbitU;
  const centerZ = 1.2 - time * 0.42;
  target.set(
    0.18 + Math.cos(angle) * 2.7,
    1.66 + Math.sin(orbitU * Math.PI) * 0.16,
    centerZ + Math.sin(angle) * 2.7,
  );
  return target;
}

function quadraticBezier(out, a, b, c, t) { window.__bfTrace?.add(460);
  const inverse = 1 - t;
  out.set(0, 0, 0);
  out.addScaledVector(a, inverse * inverse);
  out.addScaledVector(b, 2 * inverse * t);
  out.addScaledVector(c, t * t);
  return out;
}

function updateVisitor(time) { window.__bfTrace?.add(469);
  const stride = time * Math.PI * 1.82;
  const swing = Math.sin(stride);
  const opposite = Math.sin(stride + Math.PI);
  visitor.position.set(0.18, 0.035 + Math.abs(Math.sin(stride)) * 0.026, 1.2 - time * 0.42);
  visitor.rotation.y = 0.025 * Math.sin(time * 0.7);

  leftLeg.hip.rotation.x = swing * 0.47;
  rightLeg.hip.rotation.x = opposite * 0.47;
  leftLeg.knee.rotation.x = Math.max(0, -swing) * 0.56;
  rightLeg.knee.rotation.x = Math.max(0, -opposite) * 0.56;
  leftLeg.foot.rotation.x = -Math.max(0, swing) * 0.22;
  rightLeg.foot.rotation.x = -Math.max(0, opposite) * 0.22;

  leftArm.shoulder.rotation.x = opposite * 0.35;
  rightArm.shoulder.rotation.x = swing * 0.35;
  leftArm.shoulder.rotation.z = -0.06;
  rightArm.shoulder.rotation.z = 0.06;
  leftArm.elbow.rotation.x = -0.16 - Math.max(0, swing) * 0.24;
  rightArm.elbow.rotation.x = -0.16 - Math.max(0, opposite) * 0.24;
  visitor.rotation.z = Math.sin(stride) * 0.012;
}

function updateCamera(time) { window.__bfTrace?.add(492);
  const t = Math.max(0, Math.min(DURATION, time));
  const visitorLook = visitorCenterAt(t, new THREE.Vector3());

  if (t < 2.0) {
    const normalized = t / 2.0;
    const accelerated = 0.12 * normalized + 0.88 * smooth(normalized);
    approachCurve.getPoint(accelerated, cameraPosition);
    const revealTarget = new THREE.Vector3(0.05, 0.98, 6.2 - accelerated * 4.4);
    cameraTarget.lerpVectors(revealTarget, visitorLook, smooth((normalized - 0.58) / 0.42));
    camera.fov = THREE.MathUtils.lerp(61, 55, smooth(normalized));
  } else if (t < 3.75) {
    orbitCameraAt(t, cameraPosition);
    cameraTarget.copy(visitorLook);
    camera.fov = 55;
  } else {
    orbitCameraAt(3.75, craneStart);
    const craneU = flowingEase((t - 3.75) / (DURATION - 3.75), 0.18);
    quadraticBezier(cameraPosition, craneStart, craneControl, craneEnd, craneU);
    cameraTarget.lerpVectors(visitorLook, new THREE.Vector3(0, 1.7, 0.4), smooth(craneU));
    camera.fov = THREE.MathUtils.lerp(55, 63, smooth(craneU));
  }

  camera.position.copy(cameraPosition);
  camera.lookAt(cameraTarget);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

function updateScene(time) { window.__bfTrace?.add(521);
  const t = Math.max(0, Math.min(DURATION, Number.isFinite(time) ? time : 0));
  updateVisitor(t);
  entrySculpture.rotation.y = -0.25 + Math.sin(t * 0.22) * 0.025;
  blueSculpture.rotation.y = 0.4 + Math.sin(t * 0.18) * 0.018;
  updateCamera(t);
  renderer.render(scene, camera);
}

let paused = false;
let animationFrame = 0;
let previewStart = performance.now();

function animate(now) { window.__bfTrace?.add(534);
  if (paused) return;
  const time = ((now - previewStart) / 1000) % DURATION;
  updateScene(time);
  animationFrame = requestAnimationFrame(animate);
}

window.reconstruction = {
  pause() {
    paused = true;
    cancelAnimationFrame(animationFrame);
  },
  seek(seconds) {
    updateScene(Number(seconds));
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
  metadata: { width: WIDTH, height: HEIGHT, fps: FPS, frames: FRAMES, duration: DURATION },
};

updateScene(0);
animationFrame = requestAnimationFrame(animate);
