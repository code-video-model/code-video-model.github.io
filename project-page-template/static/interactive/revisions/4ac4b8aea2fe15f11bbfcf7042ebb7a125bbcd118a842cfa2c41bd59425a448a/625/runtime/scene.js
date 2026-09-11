import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb7c0c8);
scene.fog = new THREE.Fog(0xb7c0c8, 11, 24);

const camera = new THREE.PerspectiveCamera(32, WIDTH / HEIGHT, 0.025, 60);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.06;
renderer.setClearColor(0xb7c0c8, 1);
document.body.appendChild(renderer.domElement);

const maxAnisotropy = renderer.capabilities.getMaxAnisotropy();

function material(color, roughness, options = {}) { window.__bfTrace?.add(29);
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness,
    metalness: options.metalness ?? 0,
    clearcoat: options.clearcoat ?? 0,
    clearcoatRoughness: options.clearcoatRoughness ?? 0.3,
    sheen: options.sheen ?? 0,
    sheenColor: new THREE.Color(options.sheenColor ?? color),
    side: options.side ?? THREE.FrontSide,
  });
}

const materials = {
  knit: material(0xe5e9e7, 0.86, { sheen: 0.3, sheenColor: 0xffffff }),
  yarn: material(0xffffff, 0.78, { sheen: 0.42, sheenColor: 0xffffff }),
  thread: material(0xc7d0cf, 0.82, { sheen: 0.28, sheenColor: 0xf4ffff }),
  synthetic: material(0xf9faf8, 0.46, { clearcoat: 0.2, clearcoatRoughness: 0.4 }),
  midsole: material(0xecefeb, 0.36, { clearcoat: 0.22 }),
  outsole: material(0x7e8a90, 0.68),
  outsoleDark: material(0x3f4c54, 0.72),
  lining: material(0x3d474c, 0.95),
  accent: material(0xaebdc1, 0.5, { metalness: 0.1 }),
  pedestal: material(0xeff1f2, 0.28, { clearcoat: 0.3 }),
  pedestalSide: material(0xaab5be, 0.42, { clearcoat: 0.18 }),
};

function makeLoft(sections, radialSegments, loftMaterial) { window.__bfTrace?.add(56);
  const vertices = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    for (let radial = 0; radial < radialSegments; radial += 1) {
      const angle = (radial / radialSegments) * Math.PI * 2;
      const cosine = Math.cos(angle);
      const sine = Math.sin(angle);
      vertices.push(
        section.x,
        section.y + sine * section.ry,
        cosine * section.rz,
      );
      normals.push(0, sine, cosine);
      uvs.push(sectionIndex / (sections.length - 1), radial / radialSegments);
    }
  }

  for (let sectionIndex = 0; sectionIndex < sections.length - 1; sectionIndex += 1) {
    for (let radial = 0; radial < radialSegments; radial += 1) {
      const nextRadial = (radial + 1) % radialSegments;
      const a = sectionIndex * radialSegments + radial;
      const b = sectionIndex * radialSegments + nextRadial;
      const c = (sectionIndex + 1) * radialSegments + nextRadial;
      const d = (sectionIndex + 1) * radialSegments + radial;
      indices.push(a, b, d, b, c, d);
    }
  }

  for (const sectionIndex of [0, sections.length - 1]) {
    const centerIndex = vertices.length / 3;
    const section = sections[sectionIndex];
    vertices.push(section.x, section.y, 0);
    normals.push(sectionIndex === 0 ? -1 : 1, 0, 0);
    uvs.push(0.5, 0.5);
    for (let radial = 0; radial < radialSegments; radial += 1) {
      const nextRadial = (radial + 1) % radialSegments;
      const a = sectionIndex * radialSegments + radial;
      const b = sectionIndex * radialSegments + nextRadial;
      if (sectionIndex === 0) indices.push(centerIndex, b, a);
      else indices.push(centerIndex, a, b);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, loftMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function roundedBox(width, height, depth, radius, boxMaterial) { window.__bfTrace?.add(116);
  const shape = new THREE.Shape();
  const x = -width / 2;
  const y = -height / 2;
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: radius * 0.35,
    bevelThickness: radius * 0.35,
  });
  geometry.center();
  const mesh = new THREE.Mesh(geometry, boxMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makeTube(points, radius, tubeMaterial, tubularSegments = 32) { window.__bfTrace?.add(144);
  const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
  const geometry = new THREE.TubeGeometry(curve, tubularSegments, radius, 7, false);
  const mesh = new THREE.Mesh(geometry, tubeMaterial);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function interpolateSections(sections, x) { window.__bfTrace?.add(153);
  let index = 0;
  while (index < sections.length - 2 && x > sections[index + 1].x) index += 1;
  const left = sections[index];
  const right = sections[index + 1];
  const blend = THREE.MathUtils.clamp((x - left.x) / (right.x - left.x), 0, 1);
  return {
    y: THREE.MathUtils.lerp(left.y, right.y, blend),
    ry: THREE.MathUtils.lerp(left.ry, right.ry, blend),
    rz: THREE.MathUtils.lerp(left.rz, right.rz, blend),
  };
}

const sneaker = new THREE.Group();
scene.add(sneaker);

const outsoleSections = [
  { x: -1.88, y: 1.53, ry: 0.08, rz: 0.08 },
  { x: -1.72, y: 1.53, ry: 0.11, rz: 0.43 },
  { x: -1.18, y: 1.52, ry: 0.12, rz: 0.67 },
  { x: -0.55, y: 1.52, ry: 0.12, rz: 0.69 },
  { x: 0.08, y: 1.54, ry: 0.12, rz: 0.48 },
  { x: 0.72, y: 1.55, ry: 0.13, rz: 0.52 },
  { x: 1.45, y: 1.56, ry: 0.14, rz: 0.58 },
  { x: 1.64, y: 1.57, ry: 0.12, rz: 0.23 },
];
const midsoleSections = outsoleSections.map((section, index) => ({
  x: section.x + (index === 0 ? 0.02 : 0),
  y: 1.71 + Math.max(0, -section.x - 0.7) * 0.035,
  ry: 0.2,
  rz: section.rz + (section.rz > 0.2 ? 0.025 : 0),
}));
const upperSections = [
  { x: -1.77, y: 1.92, ry: 0.22, rz: 0.08 },
  { x: -1.53, y: 2.01, ry: 0.37, rz: 0.39 },
  { x: -1.05, y: 2.13, ry: 0.48, rz: 0.61 },
  { x: -0.42, y: 2.27, ry: 0.62, rz: 0.61 },
  { x: 0.18, y: 2.36, ry: 0.74, rz: 0.54 },
  { x: 0.72, y: 2.36, ry: 0.72, rz: 0.53 },
  { x: 1.18, y: 2.25, ry: 0.62, rz: 0.57 },
  { x: 1.48, y: 2.11, ry: 0.49, rz: 0.48 },
];

sneaker.add(makeLoft(outsoleSections, 28, materials.outsole));
sneaker.add(makeLoft(midsoleSections, 32, materials.midsole));
sneaker.add(makeLoft(upperSections, 36, materials.knit));

// Sculpted rubber pods stay visible during the impossible low pass.
for (const x of [-1.42, -0.92, -0.36, 0.34, 0.94, 1.4]) {
  for (const zSign of [-1, 1]) {
    const section = interpolateSections(outsoleSections, x);
    const pod = roundedBox(x < -1.0 ? 0.34 : 0.42, 0.08, 0.21, 0.05, materials.outsoleDark);
    pod.position.set(x, 1.405, zSign * Math.max(0.16, section.rz * 0.55));
    sneaker.add(pod);
  }
}

for (const side of [-1, 1]) {
  const soleLine = makeTube([
    new THREE.Vector3(-1.58, 1.72, side * 0.43),
    new THREE.Vector3(-0.72, 1.74, side * 0.67),
    new THREE.Vector3(0.15, 1.75, side * 0.49),
    new THREE.Vector3(1.42, 1.76, side * 0.54),
  ], 0.026, materials.accent, 54);
  sneaker.add(soleLine);

  for (let stripe = 0; stripe < 3; stripe += 1) {
    const yOffset = stripe * 0.135;
    const railEndY = 2.58 + yOffset * 0.35;
    const stripeMesh = makeTube([
      new THREE.Vector3(-0.9 + stripe * 0.06, 2.14 + yOffset, side * 0.56),
      new THREE.Vector3(-0.25, 2.35 + yOffset, side * 0.61),
      new THREE.Vector3(0.55, 2.54 + yOffset * 0.65, side * 0.53),
      new THREE.Vector3(0.95, railEndY, side * 0.49),
      new THREE.Vector3(1.11, railEndY - 0.01, side * 0.485),
    ], 0.036, materials.synthetic, 34);
    sneaker.add(stripeMesh);
  }

  const quarterBracket = roundedBox(0.18, 0.27, 0.13, 0.045, materials.accent);
  quarterBracket.position.set(1.075, 2.625, side * 0.5);
  quarterBracket.rotation.z = -0.06;
  sneaker.add(quarterBracket);

  const heelRail = makeTube([
    new THREE.Vector3(0.42, 2.78, side * 0.49),
    new THREE.Vector3(0.9, 2.82, side * 0.52),
    new THREE.Vector3(1.3, 2.63, side * 0.5),
    new THREE.Vector3(1.45, 2.28, side * 0.43),
  ], 0.052, materials.accent, 30);
  sneaker.add(heelRail);

  const eyeletRail = makeTube([
    new THREE.Vector3(-0.47, 2.74, side * 0.5),
    new THREE.Vector3(0.15, 2.92, side * 0.49),
    new THREE.Vector3(0.74, 2.9, side * 0.47),
  ], 0.045, materials.synthetic, 28);
  sneaker.add(eyeletRail);

  const quarterSeam = makeTube([
    new THREE.Vector3(-1.2, 2.07, side * 0.55),
    new THREE.Vector3(-0.82, 2.43, side * 0.59),
    new THREE.Vector3(-0.4, 2.72, side * 0.54),
  ], 0.024, materials.accent, 24);
  sneaker.add(quarterSeam);
}

const toeGuard = makeTube([
  new THREE.Vector3(-1.68, 1.92, -0.28),
  new THREE.Vector3(-1.82, 2.05, 0),
  new THREE.Vector3(-1.68, 1.92, 0.28),
], 0.055, materials.synthetic, 24);
sneaker.add(toeGuard);

const heelCounter = roundedBox(0.44, 0.68, 1.0, 0.15, materials.synthetic);
heelCounter.position.set(1.31, 2.32, 0);
heelCounter.rotation.z = -0.08;
sneaker.add(heelCounter);

const tongue = roundedBox(1.18, 0.12, 0.62, 0.12, materials.synthetic);
tongue.position.set(0.2, 2.94, 0);
tongue.rotation.z = 0.18;
sneaker.add(tongue);

const tonguePatch = roundedBox(0.34, 0.035, 0.32, 0.06, materials.accent);
tonguePatch.position.set(0.57, 3.07, 0);
tonguePatch.rotation.z = 0.18;
sneaker.add(tonguePatch);

const opening = new THREE.Mesh(
  new THREE.CircleGeometry(0.48, 48),
  materials.lining,
);
opening.scale.set(0.92, 1, 0.52);
opening.rotation.x = -Math.PI / 2;
opening.position.set(0.91, 3.06, 0);
sneaker.add(opening);

const collarCurve = new THREE.CatmullRomCurve3([
  new THREE.Vector3(0.45, 3.06, 0),
  new THREE.Vector3(0.63, 3.07, 0.43),
  new THREE.Vector3(1.12, 3.04, 0.43),
  new THREE.Vector3(1.38, 2.93, 0),
  new THREE.Vector3(1.12, 3.04, -0.43),
  new THREE.Vector3(0.63, 3.07, -0.43),
  new THREE.Vector3(0.45, 3.06, 0),
], true, 'centripetal');
const collar = new THREE.Mesh(
  new THREE.TubeGeometry(collarCurve, 64, 0.075, 8, true),
  materials.synthetic,
);
collar.castShadow = true;
sneaker.add(collar);

for (let lace = 0; lace < 6; lace += 1) {
  const x = -0.32 + lace * 0.205;
  const slant = (lace % 2 === 0 ? 1 : -1) * 0.08;
  const centerY = 2.91 + lace * 0.025;
  const laceMesh = makeTube([
    new THREE.Vector3(x - slant, centerY - 0.015, -0.47),
    new THREE.Vector3(x, centerY + 0.075, 0),
    new THREE.Vector3(x + slant, centerY - 0.015, 0.47),
  ], 0.035, materials.yarn, 20);
  sneaker.add(laceMesh);

  for (const side of [-1, 1]) {
    const eyelet = new THREE.Mesh(
      new THREE.TorusGeometry(0.055, 0.017, 7, 16),
      materials.accent,
    );
    eyelet.position.set(x + side * slant, centerY - 0.02, side * 0.485);
    eyelet.rotation.x = Math.PI / 2;
    sneaker.add(eyelet);
  }
}

// Raised deterministic herringbone yarn gives the opening macro shot real geometry.
const threadGeometry = new THREE.SphereGeometry(1, 7, 5);
const threadInstances = [];
for (let column = 0; column < 18; column += 1) {
  const x = -1.35 + column * 0.112;
  const section = interpolateSections(upperSections, x);
  for (let row = 0; row < 10; row += 1) {
    const normalizedY = -0.62 + row * 0.135;
    const y = section.y + normalizedY * section.ry;
    const surfaceZ = section.rz * Math.sqrt(Math.max(0.05, 1 - normalizedY * normalizedY)) + 0.018;
    for (const side of [-1, 1]) {
      threadInstances.push({
        x,
        y,
        z: side * surfaceZ,
        rotation: (column + row + (side < 0 ? 1 : 0)) % 2 ? 0.62 : -0.62,
      });
    }
  }
}
const threads = new THREE.InstancedMesh(threadGeometry, materials.thread, threadInstances.length);
const threadTransform = new THREE.Object3D();
threadInstances.forEach((thread, index) => {
  threadTransform.position.set(thread.x, thread.y, thread.z);
  threadTransform.rotation.set(0, 0, thread.rotation);
  threadTransform.scale.set(0.057, 0.014, 0.013);
  threadTransform.updateMatrix();
  threads.setMatrixAt(index, threadTransform.matrix);
});
threads.instanceMatrix.needsUpdate = true;
threads.castShadow = true;
sneaker.add(threads);

for (const x of [-1.5, -1.08, -0.62, -0.12, 0.42, 0.96, 1.36]) {
  const centerPod = roundedBox(x < -1.2 ? 0.28 : 0.34, 0.075, 0.3, 0.055, materials.outsoleDark);
  centerPod.position.set(x, 1.395, 0);
  sneaker.add(centerPod);
}

const top = new THREE.Mesh(
  new THREE.CylinderGeometry(1.78, 1.78, 0.16, 96),
  materials.pedestal,
);
top.scale.z = 0.68;
top.position.y = 1.32;
top.receiveShadow = true;
scene.add(top);

const pedestal = new THREE.Mesh(
  new THREE.CylinderGeometry(1.56, 1.67, 1.26, 96),
  materials.pedestalSide,
);
pedestal.scale.z = 0.68;
pedestal.position.y = 0.65;
pedestal.castShadow = true;
pedestal.receiveShadow = true;
scene.add(pedestal);

const pedestalRing = new THREE.Mesh(
  new THREE.TorusGeometry(1.6, 0.025, 8, 96),
  materials.accent,
);
pedestalRing.scale.z = 0.68;
pedestalRing.rotation.x = Math.PI / 2;
pedestalRing.position.y = 1.17;
scene.add(pedestalRing);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(40, 40),
  material(0xaab4bc, 0.76),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = 0;
floor.receiveShadow = true;
scene.add(floor);

const hemisphere = new THREE.HemisphereLight(0xedf5ff, 0x626d76, 1.05);
scene.add(hemisphere);

const key = new THREE.DirectionalLight(0xfff5e9, 3.25);
key.position.set(-4.5, 7.5, 5.5);
key.castShadow = true;
key.shadow.mapSize.set(2048, 2048);
key.shadow.camera.left = -5;
key.shadow.camera.right = 5;
key.shadow.camera.top = 5;
key.shadow.camera.bottom = -2;
key.shadow.bias = -0.00015;
scene.add(key);

const sideLight = new THREE.RectAreaLight(0xd9ebff, 6.8, 4.5, 5.5);
sideLight.position.set(3.5, 4.8, 4.5);
sideLight.lookAt(0, 2, 0);
scene.add(sideLight);

const rimLight = new THREE.SpotLight(0xd1eaff, 10, 14, Math.PI / 5, 0.45, 1.2);
rimLight.position.set(2.5, 5.5, -4.5);
rimLight.target.position.set(0.2, 2.25, 0);
scene.add(rimLight, rimLight.target);

const toeLight = new THREE.PointLight(0xffe7c9, 3.4, 7, 1.2);
toeLight.position.set(-2.8, 2.15, 1.1);
scene.add(toeLight);

const underLight = new THREE.PointLight(0xc7e3f4, 1, 5, 1.5);
underLight.position.set(-1.8, 0.9, 0.2);
scene.add(underLight);

const CAMERA_MOVE_START = 0.35;
const CAMERA_MOVE_END = 4.72;
const CAMERA_START_AZIMUTH = THREE.MathUtils.degToRad(135);
const CAMERA_ORBIT_ANGLE = THREE.MathUtils.degToRad(145);
const cameraTarget = new THREE.Vector3();

function smoothstep(value) { window.__bfTrace?.add(443);
  return value * value * (3 - 2 * value);
}

function updateCamera(time) { window.__bfTrace?.add(447);
  const normalizedTime = THREE.MathUtils.clamp(
    (time - CAMERA_MOVE_START) / (CAMERA_MOVE_END - CAMERA_MOVE_START),
    0,
    1,
  );
  const progress = smoothstep(normalizedTime);
  const detailProgress = smoothstep(THREE.MathUtils.clamp((progress - 0.55) / 0.45, 0, 1));
  const azimuth = CAMERA_START_AZIMUTH + CAMERA_ORBIT_ANGLE * progress;
  const radius = THREE.MathUtils.lerp(7.35, 2.8, progress);

  cameraTarget.set(
    THREE.MathUtils.lerp(-0.05, 0.62, detailProgress),
    THREE.MathUtils.lerp(2.1, 2.24, detailProgress) + Math.sin(progress * Math.PI) * 0.05,
    THREE.MathUtils.lerp(0, -0.03, detailProgress),
  );
  camera.position.set(
    cameraTarget.x + Math.cos(azimuth) * radius,
    THREE.MathUtils.lerp(3.65, 2.68, progress) + Math.sin(progress * Math.PI) * 1.35,
    cameraTarget.z + Math.sin(azimuth) * radius,
  );
  camera.fov = THREE.MathUtils.lerp(31, 37.5, progress);
  camera.updateProjectionMatrix();
  camera.lookAt(cameraTarget);
}

let currentTime = 0;
let playing = false;
let playbackStart = 0;

function updateAt(time) { window.__bfTrace?.add(477);
  currentTime = THREE.MathUtils.clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  updateCamera(currentTime);

  const orbit = currentTime / DURATION;
  key.position.set(
    -4.5 + Math.sin(orbit * Math.PI) * 1.2,
    7.5,
    5.5 - orbit * 1.6,
  );
  toeLight.intensity = 3.0 + Math.sin(Math.min(1, currentTime / 3.4) * Math.PI) * 1.8;
  underLight.intensity = 0.6 + Math.max(0, 1 - Math.abs(currentTime - 3.02) / 0.82) * 2.8;
  pedestalRing.rotation.z = orbit * 0.13;
  renderer.render(scene, camera);
}

function tick(now) { window.__bfTrace?.add(493);
  if (!playing) return;
  const elapsed = (now - playbackStart) / 1000;
  updateAt(elapsed % DURATION);
  requestAnimationFrame(tick);
}

window.reconstruction = {
  pause() {
    playing = false;
    return currentTime;
  },
  seek(seconds) {
    playing = false;
    updateAt(Number(seconds));
    return currentTime;
  },
  play() {
    playbackStart = performance.now() - currentTime * 1000;
    if (!playing) {
      playing = true;
      requestAnimationFrame(tick);
    }
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
};

updateAt(0);
window.sceneReady = true;
