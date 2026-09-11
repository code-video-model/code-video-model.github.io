import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

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
renderer.toneMappingExposure = 1.16;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x151a1e);
scene.fog = new THREE.Fog(0x151a1e, 18, 43);

const camera = new THREE.PerspectiveCamera(45, WIDTH / HEIGHT, 0.1, 80);

const concrete = new THREE.MeshStandardMaterial({
  color: 0x596064,
  roughness: 0.92,
  metalness: 0.03,
});
const concreteDark = new THREE.MeshStandardMaterial({
  color: 0x343a3d,
  roughness: 0.95,
});
const ceilingMat = new THREE.MeshStandardMaterial({
  color: 0x484e50,
  roughness: 0.98,
});
const whitePaint = new THREE.MeshStandardMaterial({
  color: 0xdedccf,
  roughness: 0.8,
});
const yellowPaint = new THREE.MeshStandardMaterial({
  color: 0xe0ad28,
  roughness: 0.76,
});
const blackRubber = new THREE.MeshStandardMaterial({
  color: 0x090b0c,
  roughness: 0.88,
});
const darkMetal = new THREE.MeshStandardMaterial({
  color: 0x1d2529,
  roughness: 0.42,
  metalness: 0.65,
});

function mesh(geometry, material, position, rotation = [0, 0, 0]) { window.__bfTrace?.add(59);
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = true;
  object.receiveShadow = true;
  scene.add(object);
  return object;
}

// Floor and shell.
const floor = mesh(new THREE.PlaneGeometry(30, 38), concrete, [0, 0, -3], [-Math.PI / 2, 0, 0]);
floor.castShadow = false;
mesh(new THREE.BoxGeometry(30, 0.42, 38), ceilingMat, [0, 5.32, -3]);
mesh(new THREE.BoxGeometry(30, 5.4, 0.42), concreteDark, [0, 2.7, -22]);
mesh(new THREE.BoxGeometry(0.42, 5.4, 38), concreteDark, [-15, 2.7, -3]);
mesh(new THREE.BoxGeometry(0.42, 5.4, 38), concreteDark, [15, 2.7, -3]);

// Back-wall seams and bumper-height safety stripe.
for (let x = -12; x <= 12; x += 4) {
  mesh(new THREE.BoxGeometry(0.055, 5.0, 0.035), darkMetal, [x, 2.55, -21.76]);
}
mesh(new THREE.BoxGeometry(29.5, 0.14, 0.06), yellowPaint, [0, 1.06, -21.74]);
mesh(new THREE.BoxGeometry(29.5, 0.05, 0.065), blackRubber, [0, 1.31, -21.72]);

// Parking bay outlines: the edited blue car occupies +4.15; -4.15 remains visibly empty.
const bayCenters = [-12.1, -8.15, -4.15, 0, 4.15, 8.15, 12.1];
for (const x of [-14.0, -10.15, -6.15, -2.05, 2.05, 6.15, 10.15, 14.0]) {
  mesh(new THREE.BoxGeometry(0.1, 0.025, 10.8), whitePaint, [x, 0.022, -14.9]);
}
mesh(new THREE.BoxGeometry(28, 0.025, 0.1), whitePaint, [0, 0.023, -9.5]);
for (const x of bayCenters) {
  mesh(new THREE.BoxGeometry(2.15, 0.16, 0.42), yellowPaint, [x, 0.13, -19.28]);
  mesh(new THREE.BoxGeometry(0.26, 0.1, 0.5), blackRubber, [x - 0.94, 0.09, -19.28]);
  mesh(new THREE.BoxGeometry(0.26, 0.1, 0.5), blackRubber, [x + 0.94, 0.09, -19.28]);
}

// A central aisle arrow, assembled from floor geometry.
mesh(new THREE.BoxGeometry(0.18, 0.025, 3.0), whitePaint, [0, 0.025, 6.7]);
const arrowShape = new THREE.Shape();
arrowShape.moveTo(0, 1.15);
arrowShape.lineTo(-0.92, -0.2);
arrowShape.lineTo(-0.28, -0.2);
arrowShape.lineTo(-0.28, -1.05);
arrowShape.lineTo(0.28, -1.05);
arrowShape.lineTo(0.28, -0.2);
arrowShape.lineTo(0.92, -0.2);
arrowShape.closePath();
const arrow = mesh(new THREE.ShapeGeometry(arrowShape), whitePaint, [0, 0.031, 4.9], [-Math.PI / 2, 0, 0]);
arrow.castShadow = false;

// Structural columns are placed between outer bays so the edited bay remains unobstructed.
for (const z of [-19.6, -4.3, 11]) {
  for (const x of [-10.25, 10.25]) {
    mesh(new THREE.BoxGeometry(0.86, 5.18, 0.86), concrete, [x, 2.59, z]);
    mesh(new THREE.BoxGeometry(0.94, 0.62, 0.94), yellowPaint, [x, 1.0, z]);
    mesh(new THREE.BoxGeometry(0.95, 0.12, 0.95), blackRubber, [x, 1.0, z]);
  }
}

// Overhead ducts and red sprinkler pipes create clear garage depth.
for (const x of [-5.9, 5.9]) {
  mesh(new THREE.BoxGeometry(1.05, 0.58, 35), darkMetal, [x, 4.72, -2.7]);
}
const pipeMat = new THREE.MeshStandardMaterial({
  color: 0xa12b27,
  roughness: 0.48,
  metalness: 0.35,
});
for (const x of [-8.25, 0, 8.25]) {
  const pipe = mesh(new THREE.CylinderGeometry(0.075, 0.075, 36, 12), pipeMat, [x, 4.88, -3], [Math.PI / 2, 0, 0]);
  pipe.castShadow = false;
}
for (const z of [-15, -7, 1, 9]) {
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 16.5, 10), pipeMat, [0, 4.84, z], [0, 0, Math.PI / 2]);
}

const fixtureMat = new THREE.MeshStandardMaterial({
  color: 0xf3f4e6,
  emissive: 0xe6f1ff,
  emissiveIntensity: 2.4,
  roughness: 0.25,
});
for (const z of [-18, -11.5, -5, 1.5, 8, 14.5]) {
  mesh(new THREE.BoxGeometry(4.2, 0.12, 0.44), darkMetal, [0, 5.03, z]);
  const tube = mesh(new THREE.BoxGeometry(3.82, 0.075, 0.22), fixtureMat, [0, 4.94, z]);
  tube.castShadow = false;
  const light = new THREE.PointLight(0xe8f2ff, z < -8 ? 52 : 36, 11.5, 1.65);
  light.position.set(0, 4.68, z);
  light.castShadow = z === -11.5 || z === -5;
  light.shadow.mapSize.set(512, 512);
  light.shadow.bias = -0.0008;
  scene.add(light);
}

const ambient = new THREE.HemisphereLight(0xd7e7f5, 0x34302b, 1.4);
scene.add(ambient);
const keyLight = new THREE.DirectionalLight(0xd6e5f5, 1.65);
keyLight.position.set(-4, 8, 9);
keyLight.target.position.set(2, 0, -13);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -14;
keyLight.shadow.camera.right = 14;
keyLight.shadow.camera.top = 15;
keyLight.shadow.camera.bottom = -15;
keyLight.shadow.camera.near = 1;
keyLight.shadow.camera.far = 38;
keyLight.shadow.bias = -0.0006;
scene.add(keyLight, keyLight.target);

function sideWindowGeometry(points, x) { window.__bfTrace?.add(170);
  const positions = [];
  for (const tri of [[0, 1, 2], [0, 2, 3]]) {
    for (const index of tri) {
      positions.push(x, points[index][1], points[index][0]);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

function makeCar({
  color,
  position,
  name,
  metallic = 0.72,
  plate = "dark",
}) { window.__bfTrace?.add(183);
  const car = new THREE.Group();
  car.name = name;
  car.position.set(...position);
  scene.add(car);

  const paint = new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.28,
    metalness: metallic * 0.72,
    clearcoat: 0.85,
    clearcoatRoughness: 0.15,
  });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x294653,
    roughness: 0.1,
    metalness: 0.12,
    transparent: true,
    opacity: 0.9,
    clearcoat: 0.45,
  });
  const chrome = new THREE.MeshStandardMaterial({
    color: 0xb7c0c4,
    roughness: 0.22,
    metalness: 0.9,
  });
  const lampWhite = new THREE.MeshStandardMaterial({
    color: 0xf6f2d7,
    emissive: 0xd8eaff,
    emissiveIntensity: name === "edited-blue-car" ? 1.25 : 0.45,
    roughness: 0.18,
  });
  const lampRed = new THREE.MeshStandardMaterial({
    color: 0xa70f14,
    emissive: 0x8d090d,
    emissiveIntensity: 0.65,
    roughness: 0.25,
  });
  const plateMat = new THREE.MeshStandardMaterial({
    color: plate === "light" ? 0xcfd5d1 : 0x263038,
    roughness: 0.5,
    metalness: 0.15,
  });

  const profile = new THREE.Shape();
  profile.moveTo(-2.22, 0.44);
  profile.lineTo(-2.17, 0.78);
  profile.quadraticCurveTo(-1.9, 0.95, -1.3, 1.01);
  profile.lineTo(-0.73, 1.54);
  profile.quadraticCurveTo(-0.56, 1.68, -0.24, 1.7);
  profile.lineTo(0.62, 1.69);
  profile.quadraticCurveTo(0.82, 1.66, 0.96, 1.48);
  profile.lineTo(1.34, 1.05);
  profile.lineTo(2.02, 0.94);
  profile.quadraticCurveTo(2.23, 0.87, 2.26, 0.64);
  profile.lineTo(2.2, 0.44);
  profile.closePath();
  const bodyGeometry = new THREE.ExtrudeGeometry(profile, {
    depth: 2.04,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 3,
    bevelSize: 0.08,
    bevelThickness: 0.08,
    curveSegments: 8,
  });
  bodyGeometry.translate(0, 0, -1.02);
  bodyGeometry.rotateY(-Math.PI / 2);
  bodyGeometry.computeVertexNormals();
  const body = new THREE.Mesh(bodyGeometry, paint);
  body.castShadow = true;
  body.receiveShadow = true;
  car.add(body);

  const windowSets = [
    [[0.18, 1.58], [0.6, 1.57], [0.87, 1.45], [1.21, 1.06]],
    [[-0.64, 1.55], [0.11, 1.58], [0.11, 1.07], [-1.18, 1.07]],
  ];
  for (const x of [-1.112, 1.112]) {
    for (const points of windowSets) {
      const windowMesh = new THREE.Mesh(sideWindowGeometry(points, x), glass);
      windowMesh.castShadow = true;
      car.add(windowMesh);
    }
  }

  const windshieldPositions = new Float32Array([
    -0.93, 1.23, 1.265,
    0.93, 1.23, 1.265,
    0.72, 1.665, 0.735,
    -0.93, 1.23, 1.265,
    0.72, 1.665, 0.735,
    -0.72, 1.665, 0.735,
  ]);
  const windshieldGeometry = new THREE.BufferGeometry();
  windshieldGeometry.setAttribute("position", new THREE.BufferAttribute(windshieldPositions, 3));
  windshieldGeometry.computeVertexNormals();
  const windshield = new THREE.Mesh(windshieldGeometry, glass);
  windshield.castShadow = true;
  car.add(windshield);

  const rearGlassPositions = new Float32Array([
    -0.93, 1.17, -1.25,
    -0.7, 1.64, -0.69,
    0.7, 1.64, -0.69,
    -0.93, 1.17, -1.25,
    0.7, 1.64, -0.69,
    0.93, 1.17, -1.25,
  ]);
  const rearGlassGeometry = new THREE.BufferGeometry();
  rearGlassGeometry.setAttribute("position", new THREE.BufferAttribute(rearGlassPositions, 3));
  rearGlassGeometry.computeVertexNormals();
  car.add(new THREE.Mesh(rearGlassGeometry, glass));

  const wheelTireGeometry = new THREE.CylinderGeometry(0.39, 0.39, 0.25, 24);
  const wheelRimGeometry = new THREE.CylinderGeometry(0.205, 0.205, 0.265, 16);
  for (const x of [-1.06, 1.06]) {
    for (const z of [-1.42, 1.4]) {
      const tire = new THREE.Mesh(wheelTireGeometry, blackRubber);
      tire.position.set(x, 0.49, z);
      tire.rotation.z = Math.PI / 2;
      tire.castShadow = true;
      car.add(tire);
      const rim = new THREE.Mesh(wheelRimGeometry, chrome);
      rim.position.copy(tire.position);
      rim.rotation.z = Math.PI / 2;
      car.add(rim);
    }
  }

  for (const x of [-0.68, 0.68]) {
    const headlamp = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.22, 0.08), lampWhite);
    headlamp.position.set(x, 0.76, 2.315);
    car.add(headlamp);
    const taillamp = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.2, 0.08), lampRed);
    taillamp.position.set(x, 0.78, -2.315);
    car.add(taillamp);
  }
  const frontGrille = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.18, 0.08), darkMetal);
  frontGrille.position.set(0, 0.59, 2.325);
  car.add(frontGrille);
  const license = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.15, 0.085), plateMat);
  license.position.set(0, 0.47, 2.38);
  car.add(license);
  const lowerBumper = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.12, 0.1), darkMetal);
  lowerBumper.position.set(0, 0.42, 2.29);
  car.add(lowerBumper);
  const hoodCenter = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.018, 0.72), chrome);
  hoodCenter.position.set(0, 1.005, 1.67);
  car.add(hoodCenter);
  for (const x of [-1.14, 1.14]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.34), paint);
    mirror.position.set(x, 1.1, 0.85);
    mirror.rotation.y = x > 0 ? -0.13 : 0.13;
    car.add(mirror);
  }
  for (const x of [-1.105, 1.105]) {
    for (const z of [-0.44, 0.42]) {
      const handle = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.055, 0.27), chrome);
      handle.position.set(x, 1.02, z);
      car.add(handle);
    }
  }

  return car;
}

// Other parked vehicles remain in their own bays; the paired left bay at -4.15 is intentionally empty.
makeCar({
  color: 0x929a9d,
  position: [-8.15, 0, -14.5],
  name: "silver-parked-car",
  metallic: 0.78,
  plate: "light",
});
makeCar({
  color: 0x7c282f,
  position: [8.15, 0, -14.5],
  name: "burgundy-parked-car",
  metallic: 0.62,
});
const blueCar = makeCar({
  color: 0x076fd1,
  position: [-4.15, 0, -14.5],
  name: "edited-blue-car",
  metallic: 0.76,
  plate: "light",
});

// Low wall-mounted signs made only from scene geometry.
function makeBayMarker(x, bars) { window.__bfTrace?.add(379);
  const sign = new THREE.Group();
  sign.position.set(x, 2.75, -21.7);
  scene.add(sign);
  const panel = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.76, 0.08),
    new THREE.MeshStandardMaterial({ color: 0x233540, roughness: 0.62 }),
  );
  panel.castShadow = true;
  sign.add(panel);
  for (const [px, py, sx, sy, rotation = 0] of bars) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, 0.035), whitePaint);
    bar.position.set(px, py, 0.06);
    bar.rotation.z = rotation;
    sign.add(bar);
  }
}
makeBayMarker(-4.15, [
  [0, 0, 0.72, 0.09],
  [-0.28, 0.1, 0.38, 0.09, 0.66],
  [-0.28, -0.1, 0.38, 0.09, -0.66],
]);
makeBayMarker(4.15, [
  [0, 0, 0.72, 0.09],
  [0.28, 0.1, 0.38, 0.09, -0.66],
  [0.28, -0.1, 0.38, 0.09, 0.66],
]);

const cameraTarget = new THREE.Vector3();
function smoothstep(value) { window.__bfTrace?.add(408);
  const x = THREE.MathUtils.clamp(value, 0, 1);
  return x * x * (3 - 2 * x);
}

function updateAtTime(seconds) { window.__bfTrace?.add(413);
  const t = THREE.MathUtils.clamp(seconds, 0, DURATION);
  const u = smoothstep(t / DURATION);
  const arc = Math.sin(Math.PI * u);
  camera.position.set(
    THREE.MathUtils.lerp(-2.05, 1.05, u) + 0.34 * arc,
    THREE.MathUtils.lerp(2.25, 1.92, u) + 0.06 * arc,
    THREE.MathUtils.lerp(11.4, 5.45, u),
  );
  cameraTarget.set(
    THREE.MathUtils.lerp(0.7, 2.4, u),
    THREE.MathUtils.lerp(0.94, 0.9, u),
    THREE.MathUtils.lerp(-13.8, -14.4, u),
  );
  camera.fov = THREE.MathUtils.lerp(42.5, 39.5, u);
  camera.updateProjectionMatrix();
  camera.lookAt(cameraTarget);

  fixtureMat.emissiveIntensity = 2.4;
  blueCar.visible = true;
  scene.updateMatrixWorld(true);
  renderer.render(scene, camera);
}

let running = true;
let startTime = performance.now();
let rafId = 0;
function animate(now) { window.__bfTrace?.add(440);
  if (!running) {
    return;
  }
  const seconds = ((now - startTime) / 1000) % DURATION;
  updateAtTime(seconds);
  rafId = requestAnimationFrame(animate);
}

function pause() { window.__bfTrace?.add(449);
  running = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = 0;
  }
}

function seek(seconds) { window.__bfTrace?.add(457);
  pause();
  updateAtTime(Number(seconds));
}

function getCameraState() { window.__bfTrace?.add(462);
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

window.reconstruction = { pause, seek, getCameraState };
window.sceneReady = true;
updateAtTime(0);
rafId = requestAnimationFrame(animate);
