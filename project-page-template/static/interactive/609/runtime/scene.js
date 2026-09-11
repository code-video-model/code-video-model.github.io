import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02050a);
scene.fog = new THREE.FogExp2(0x02050a, 0.022);

const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.21;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(36, WIDTH / HEIGHT, 0.05, 60);
const cameraTarget = new THREE.Vector3();

const matteBlack = new THREE.MeshStandardMaterial({
  color: 0x101923,
  roughness: 0.58,
  metalness: 0.68,
});
const darkMetal = new THREE.MeshStandardMaterial({
  color: 0x111923,
  roughness: 0.34,
  metalness: 0.8,
});

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 13),
  new THREE.MeshStandardMaterial({
    color: 0x070b11,
    roughness: 0.43,
    metalness: 0.18,
  }),
);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const backWall = new THREE.Mesh(
  new THREE.PlaneGeometry(22, 8),
  new THREE.MeshStandardMaterial({
    color: 0x03070d,
    roughness: 0.82,
    metalness: 0.12,
  }),
);
backWall.position.set(0, 4, -4.6);
scene.add(backWall);

const gridMaterial = new THREE.LineBasicMaterial({
  color: 0x172333,
  transparent: true,
  opacity: 0.2,
});
const gridPoints = [];
for (let x = -10; x <= 10; x += 1) {
  gridPoints.push(new THREE.Vector3(x, 0.007, -4.5), new THREE.Vector3(x, 0.007, 4.5));
}
for (let z = -4; z <= 4; z += 1) {
  gridPoints.push(new THREE.Vector3(-10, 0.007, z), new THREE.Vector3(10, 0.007, z));
}
const gridGeometry = new THREE.BufferGeometry().setFromPoints(gridPoints);
scene.add(new THREE.LineSegments(gridGeometry, gridMaterial));

const screenFrame = new THREE.Mesh(
  new THREE.BoxGeometry(0.18, 4.65, 6.0),
  matteBlack,
);
screenFrame.position.set(6.17, 2.38, -0.02);
screenFrame.castShadow = true;
screenFrame.receiveShadow = true;
scene.add(screenFrame);

const projectionScreen = new THREE.Mesh(
  new THREE.BoxGeometry(0.10, 4.25, 5.55),
  new THREE.MeshStandardMaterial({
    color: 0xe3e6df,
    emissive: 0x171914,
    roughness: 0.91,
    metalness: 0.0,
  }),
);
projectionScreen.position.set(6.055, 2.35, -0.02);
projectionScreen.castShadow = true;
projectionScreen.receiveShadow = true;
scene.add(projectionScreen);

const screenStand = new THREE.Mesh(
  new THREE.BoxGeometry(0.46, 0.16, 6.35),
  darkMetal,
);
screenStand.position.set(6.2, 0.08, -0.02);
screenStand.castShadow = true;
scene.add(screenStand);

const prismShape = new THREE.Shape();
prismShape.moveTo(-1.25, 0.24);
prismShape.lineTo(1.25, 0.24);
prismShape.lineTo(0, 2.50);
prismShape.closePath();
const prismGeometry = new THREE.ExtrudeGeometry(prismShape, {
  depth: 1.7,
  bevelEnabled: true,
  bevelSegments: 3,
  steps: 1,
  bevelSize: 0.055,
  bevelThickness: 0.055,
});
prismGeometry.translate(0, 0, -0.85);
prismGeometry.computeVertexNormals();

const prismFaceMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xb9e9f2,
  emissive: 0x07161c,
  emissiveIntensity: 0.75,
  metalness: 0.0,
  roughness: 0.04,
  transmission: 0.72,
  thickness: 1.15,
  ior: 1.52,
  transparent: true,
  opacity: 0.48,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const prismSideMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x72c5d8,
  emissive: 0x06151b,
  emissiveIntensity: 0.7,
  metalness: 0.0,
  roughness: 0.11,
  transmission: 0.52,
  thickness: 1.4,
  ior: 1.52,
  transparent: true,
  opacity: 0.38,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const prism = new THREE.Mesh(prismGeometry, [prismFaceMaterial, prismSideMaterial]);
prism.castShadow = true;
prism.renderOrder = 3;
scene.add(prism);

const edgeGeometry = new THREE.EdgesGeometry(prismGeometry, 20);
const prismEdges = new THREE.LineSegments(
  edgeGeometry,
  new THREE.LineBasicMaterial({
    color: 0xbff6ff,
    transparent: true,
    opacity: 0.76,
  }),
);
prismEdges.renderOrder = 7;
scene.add(prismEdges);

const prismBase = new THREE.Mesh(
  new THREE.BoxGeometry(3.15, 0.10, 2.15),
  darkMetal,
);
prismBase.position.set(0, 0.09, 0);
prismBase.castShadow = true;
prismBase.receiveShadow = true;
scene.add(prismBase);

const source = new THREE.Group();
const sourceBody = new THREE.Mesh(
  new THREE.CylinderGeometry(0.42, 0.49, 1.22, 32, 1),
  matteBlack,
);
sourceBody.rotation.z = Math.PI / 2;
sourceBody.castShadow = true;
source.add(sourceBody);

const sourceCollar = new THREE.Mesh(
  new THREE.CylinderGeometry(0.51, 0.51, 0.18, 32),
  darkMetal,
);
sourceCollar.rotation.z = Math.PI / 2;
sourceCollar.position.x = 0.53;
source.add(sourceCollar);

const aperture = new THREE.Mesh(
  new THREE.CircleGeometry(0.19, 32),
  new THREE.MeshBasicMaterial({ color: 0xf9fdff }),
);
aperture.rotation.y = Math.PI / 2;
aperture.position.x = 0.635;
source.add(aperture);

const sourceFoot = new THREE.Mesh(
  new THREE.BoxGeometry(1.2, 0.12, 1.15),
  darkMetal,
);
sourceFoot.position.y = -0.48;
sourceFoot.castShadow = true;
source.add(sourceFoot);

const sourceYoke = new THREE.Mesh(
  new THREE.BoxGeometry(0.20, 0.88, 1.06),
  darkMetal,
);
sourceYoke.position.set(-0.24, -0.25, 0);
sourceYoke.castShadow = true;
source.add(sourceYoke);

const focusRing = new THREE.Mesh(
  new THREE.TorusGeometry(0.43, 0.045, 12, 32),
  new THREE.MeshStandardMaterial({
    color: 0x8a9aaa,
    roughness: 0.26,
    metalness: 0.9,
  }),
);
focusRing.rotation.y = Math.PI / 2;
focusRing.position.x = 0.48;
source.add(focusRing);
source.position.set(-6.42, 1.48, 0);
scene.add(source);

const beamVertex = new THREE.Vector3(0, 1, 0);
function createBeam(start, end, color, radius, coreOpacity, glowOpacity) { window.__bfTrace?.add(237);
  const group = new THREE.Group();
  const glow = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 3.7, radius * 3.7, 1, 18, 1, true),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: glowOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  glow.userData.baseOpacity = glowOpacity;
  const core = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 1, 18),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: coreOpacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  core.userData.baseOpacity = coreOpacity;
  group.add(glow, core);
  group.userData.start = start.clone();
  group.userData.end = end.clone();
  group.renderOrder = 5;
  scene.add(group);
  return group;
}

function setBeamProgress(group, progress, intensity = 1) { window.__bfTrace?.add(270);
  const q = THREE.MathUtils.clamp(progress, 0, 1);
  const start = group.userData.start;
  const end = group.userData.end;
  const vector = new THREE.Vector3().subVectors(end, start);
  const length = vector.length();
  const direction = vector.normalize();
  group.visible = q > 0.001 && intensity > 0.001;
  group.position.copy(start).addScaledVector(direction, length * q * 0.5);
  group.quaternion.setFromUnitVectors(beamVertex, direction);
  group.scale.set(1, length * q, 1);
  for (const mesh of group.children) {
    mesh.material.opacity = mesh.userData.baseOpacity * intensity;
  }
}

const entry = new THREE.Vector3(-0.57, 1.48, 0);
const exit = new THREE.Vector3(0.805, 1.045, 0);
const incomingBeam = createBeam(
  new THREE.Vector3(-5.78, 1.48, 0),
  entry,
  0xf4fbff,
  0.024,
  0.96,
  0.15,
);
const internalBeam = createBeam(entry, exit, 0xd8f8ff, 0.029, 0.96, 0.20);

const spectrum = [
  { color: 0xff2a20, y: 2.05, z: -0.06 },
  { color: 0xff7b14, y: 1.79, z: -0.04 },
  { color: 0xffe43b, y: 1.54, z: -0.02 },
  { color: 0x32ef68, y: 1.29, z: 0.00 },
  { color: 0x28dcff, y: 1.05, z: 0.02 },
  { color: 0x3271ff, y: 0.82, z: 0.04 },
  { color: 0x8c3cff, y: 0.60, z: 0.06 },
];
const spectrumBeams = [];
const spectrumSpots = [];
const screenFaceX = 5.98;

for (const band of spectrum) {
  const end = new THREE.Vector3(screenFaceX, band.y, band.z);
  const beam = createBeam(exit, end, band.color, 0.018, 0.93, 0.16);
  spectrumBeams.push(beam);

  const spot = new THREE.Mesh(
    new THREE.CircleGeometry(1, 32),
    new THREE.MeshBasicMaterial({
      color: band.color,
      transparent: true,
      opacity: 0,
      blending: THREE.NormalBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  spot.rotation.y = Math.PI / 2;
  spot.position.copy(end);
  spot.position.x -= 0.008;
  spot.scale.set(0.50, 0.070, 1);
  spot.renderOrder = 9;
  scene.add(spot);
  spectrumSpots.push(spot);
}

const entryGlow = new THREE.PointLight(0xd9f7ff, 0, 2.3, 2);
entryGlow.position.copy(entry);
scene.add(entryGlow);
const exitGlow = new THREE.PointLight(0x9ce9ff, 0, 3.2, 2);
exitGlow.position.copy(exit);
scene.add(exitGlow);
const sourceGlow = new THREE.PointLight(0xe9f9ff, 0, 2.5, 2);
sourceGlow.position.set(-5.78, 1.48, 0);
scene.add(sourceGlow);

const ambient = new THREE.HemisphereLight(0x29405a, 0x030406, 0.56);
scene.add(ambient);
const keyLight = new THREE.SpotLight(0xc9e7ff, 158, 24, Math.PI / 5.5, 0.55, 1.3);
keyLight.position.set(-1.5, 7.0, 6.2);
keyLight.target.position.set(0.1, 1.0, 0);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
scene.add(keyLight, keyLight.target);
const screenLight = new THREE.SpotLight(0xfff4db, 62, 17, Math.PI / 4, 0.8, 1.6);
screenLight.position.set(3.0, 5.8, 5.5);
screenLight.target.position.set(6.0, 1.8, 0);
scene.add(screenLight, screenLight.target);
const rimLight = new THREE.PointLight(0x4abfff, 28, 7, 2);
rimLight.position.set(0, 2.7, -2.6);
scene.add(rimLight);

function smoothstep(a, b, value) { window.__bfTrace?.add(362);
  const x = THREE.MathUtils.clamp((value - a) / (b - a), 0, 1);
  return x * x * (3 - 2 * x);
}

function update(time) { window.__bfTrace?.add(367);
  const t = THREE.MathUtils.clamp(Number.isFinite(time) ? time : 0, 0, DURATION);
  const u = t / DURATION;
  const slide = smoothstep(0, 1, u);
  const cameraX = -1.36 + 3.48 * slide;
  const cameraY = 4.58 + 0.20 * Math.sin(Math.PI * u);
  const cameraZ = 13.30 - 1.46 * slide;
  camera.position.set(cameraX, cameraY, cameraZ);
  cameraTarget.set(0.04 + 0.38 * slide, 1.38, 0);
  camera.lookAt(cameraTarget);
  camera.updateMatrixWorld(true);

  const incomingProgress = smoothstep(0.12, 0.82, t);
  const interiorProgress = smoothstep(0.82, 1.42, t);
  const incomingIntensity = 0.72 + 0.28 * smoothstep(0.1, 0.8, t);
  setBeamProgress(incomingBeam, incomingProgress, incomingIntensity);
  setBeamProgress(internalBeam, interiorProgress, 0.92);

  for (let i = 0; i < spectrumBeams.length; i += 1) {
    const rayProgress = smoothstep(1.40 + i * 0.055, 2.38 + i * 0.055, t);
    setBeamProgress(spectrumBeams[i], rayProgress, 0.92);
    const impact = smoothstep(2.34 + i * 0.055, 2.60 + i * 0.055, t);
    spectrumSpots[i].material.opacity = impact * 0.86;
    spectrumSpots[i].scale.x = 0.46 + impact * 0.12;
    spectrumSpots[i].scale.y = 0.055 + impact * 0.022;
  }

  sourceGlow.intensity = 25 * incomingProgress;
  entryGlow.intensity = 18 * Math.min(incomingProgress, interiorProgress + 0.25);
  exitGlow.intensity = 16 * smoothstep(1.2, 2.15, t);
  aperture.material.color.setScalar(0.7 + 0.3 * incomingProgress);
  const prismIntensity = 0.60 + 0.30 * smoothstep(0.7, 2.0, t);
  prismFaceMaterial.emissiveIntensity = prismIntensity;
  prismSideMaterial.emissiveIntensity = prismIntensity * 0.92;

  renderer.render(scene, camera);
}

let animationFrame = null;
let playing = true;
let startTime = performance.now();
let pausedAt = 0;

function animate(now) { window.__bfTrace?.add(410);
  if (!playing) return;
  const elapsed = (now - startTime) / 1000;
  const time = elapsed % DURATION;
  pausedAt = time;
  update(time);
  animationFrame = requestAnimationFrame(animate);
}

function pause() { window.__bfTrace?.add(419);
  playing = false;
  if (animationFrame !== null) cancelAnimationFrame(animationFrame);
  animationFrame = null;
  update(pausedAt);
}

function seek(seconds) { window.__bfTrace?.add(426);
  const requested = Number(seconds);
  if (!Number.isFinite(requested)) throw new TypeError('seek(seconds) requires a finite number');
  pausedAt = THREE.MathUtils.clamp(requested, 0, DURATION);
  if (playing) startTime = performance.now() - pausedAt * 1000;
  update(pausedAt);
}

function getCameraState() { window.__bfTrace?.add(434);
  camera.updateMatrixWorld(true);
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

update(0);
window.reconstruction = {
  pause,
  seek,
  getCameraState,
  ready: true,
  metadata: {
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    frames: FRAME_COUNT,
    duration: DURATION,
  },
};
animationFrame = requestAnimationFrame(animate);
