import * as THREE from './vendor/three.module.js';

const WIDTH = 960;
const HEIGHT = 540;
const DURATION = 124 / 24;

const canvas = document.querySelector('#stage');
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.16;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050a10);
scene.fog = new THREE.Fog(0x07101a, 10, 31);

const camera = new THREE.PerspectiveCamera(38, WIDTH / HEIGHT, 0.025, 60);
const world = new THREE.Group();
scene.add(world);

const clamp01 = (value) => Math.min(1, Math.max(0, value));
const smooth = (value) => {
  const t = clamp01(value);
  return t * t * (3 - 2 * t);
};
const smoother = (value) => {
  const t = clamp01(value);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const mix = (a, b, t) => a + (b - a) * t;

function roundedRectShape(width, height, radius) { window.__bfTrace?.add(42);
  const x = -width / 2;
  const y = -height / 2;
  const shape = new THREE.Shape();
  shape.moveTo(x + radius, y);
  shape.lineTo(x + width - radius, y);
  shape.quadraticCurveTo(x + width, y, x + width, y + radius);
  shape.lineTo(x + width, y + height - radius);
  shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  shape.lineTo(x + radius, y + height);
  shape.quadraticCurveTo(x, y + height, x, y + height - radius);
  shape.lineTo(x, y + radius);
  shape.quadraticCurveTo(x, y, x + radius, y);
  return shape;
}

function roundedBox(width, height, depth, radius, material, bevel = 0.035) { window.__bfTrace?.add(58);
  const geometry = new THREE.ExtrudeGeometry(
    roundedRectShape(width, height, radius),
    {
      depth,
      steps: 1,
      bevelEnabled: true,
      bevelSegments: 4,
      bevelSize: bevel,
      bevelThickness: bevel,
      curveSegments: 8,
    },
  );
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function roundedOutline(width, height, radius, depth, tubeRadius, material) { window.__bfTrace?.add(79);
  const points = roundedRectShape(width, height, radius)
    .getSpacedPoints(96)
    .map((point) => new THREE.Vector3(point.x, point.y, depth));
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  const mesh = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 160, tubeRadius, 8, true),
    material,
  );
  mesh.castShadow = true;
  return mesh;
}

const materials = {
  shell: new THREE.MeshPhysicalMaterial({
    color: 0x17394c,
    metalness: 0.42,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
  }),
  shellDark: new THREE.MeshPhysicalMaterial({
    color: 0x102b3b,
    metalness: 0.34,
    roughness: 0.29,
    clearcoat: 0.85,
    clearcoatRoughness: 0.16,
  }),
  trim: new THREE.MeshStandardMaterial({
    color: 0xdec886,
    metalness: 0.92,
    roughness: 0.17,
  }),
  brightMetal: new THREE.MeshStandardMaterial({
    color: 0xdbe7ec,
    metalness: 0.98,
    roughness: 0.16,
  }),
  darkMetal: new THREE.MeshStandardMaterial({
    color: 0x26363e,
    metalness: 0.8,
    roughness: 0.25,
  }),
  rubber: new THREE.MeshStandardMaterial({
    color: 0x141a1e,
    metalness: 0.05,
    roughness: 0.5,
  }),
  hub: new THREE.MeshStandardMaterial({
    color: 0xa7bbc2,
    metalness: 0.94,
    roughness: 0.16,
  }),
};

function addTerminal() { window.__bfTrace?.add(134);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 30),
    new THREE.MeshPhysicalMaterial({
      color: 0x111b24,
      metalness: 0.5,
      roughness: 0.24,
      clearcoat: 0.35,
      clearcoatRoughness: 0.18,
    }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.025;
  floor.receiveShadow = true;
  world.add(floor);

  const halo = new THREE.Mesh(
    new THREE.RingGeometry(3.05, 3.12, 128),
    new THREE.MeshBasicMaterial({
      color: 0x4f8897,
      transparent: true,
      opacity: 0.34,
      side: THREE.DoubleSide,
    }),
  );
  halo.rotation.x = -Math.PI / 2;
  halo.position.y = -0.012;
  world.add(halo);

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x315d70,
    emissive: 0x0a1b25,
    emissiveIntensity: 0.55,
    metalness: 0.08,
    roughness: 0.2,
    transmission: 0.08,
    transparent: true,
    opacity: 0.44,
    side: THREE.DoubleSide,
  });
  const frameMaterial = new THREE.MeshStandardMaterial({
    color: 0x5f727c,
    metalness: 0.9,
    roughness: 0.25,
  });

  const terminal = new THREE.Group();
  terminal.position.z = -5.7;
  for (let i = -3; i <= 3; i += 1) {
    const pane = new THREE.Mesh(new THREE.PlaneGeometry(2.7, 6.8), glassMaterial);
    pane.position.set(i * 2.83, 3.55, 0);
    terminal.add(pane);

    const mullion = new THREE.Mesh(new THREE.BoxGeometry(0.09, 7.2, 0.13), frameMaterial);
    mullion.position.set(i * 2.83 - 1.415, 3.55, 0.08);
    terminal.add(mullion);
  }
  const topBeam = new THREE.Mesh(new THREE.BoxGeometry(20, 0.12, 0.18), frameMaterial);
  topBeam.position.set(0, 7.1, 0.08);
  terminal.add(topBeam);

  const horizon = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 0.035),
    new THREE.MeshBasicMaterial({ color: 0x80c4d7, transparent: true, opacity: 0.72 }),
  );
  horizon.position.set(0, 1.22, 0.12);
  terminal.add(horizon);

  for (let i = 0; i < 9; i += 1) {
    const distantLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.055, 0.045),
      new THREE.MeshBasicMaterial({ color: i % 3 === 0 ? 0xe4b866 : 0x79c2d1 }),
    );
    distantLight.position.set(-7.2 + i * 1.8, 1.02 + (i % 2) * 0.08, 0.14);
    terminal.add(distantLight);
  }
  world.add(terminal);

  const benchMaterial = new THREE.MeshStandardMaterial({
    color: 0x17252e,
    metalness: 0.6,
    roughness: 0.34,
  });
  for (const x of [-5.2, 5.4]) {
    const bench = new THREE.Group();
    const seat = roundedBox(2.2, 0.18, 0.68, 0.08, benchMaterial, 0.025);
    seat.rotation.x = -Math.PI / 2;
    seat.position.y = 0.52;
    bench.add(seat);
    for (const legX of [-0.78, 0.78]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.52, 0.08), frameMaterial);
      leg.position.set(legX, 0.25, 0);
      bench.add(leg);
    }
    bench.position.set(x, 0, -3.35);
    world.add(bench);
  }

  const runwayMaterial = new THREE.MeshStandardMaterial({
    color: 0x84cfdf,
    emissive: 0x3e97ad,
    emissiveIntensity: 2.2,
    roughness: 0.28,
  });
  for (const x of [-3.45, 3.45]) {
    for (let z = -2; z < 10; z += 1.35) {
      const marker = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.015, 0.62), runwayMaterial);
      marker.position.set(x, 0.005, z);
      world.add(marker);
    }
  }

  const ceilingMaterial = new THREE.MeshBasicMaterial({
    color: 0x9bcbd6,
    transparent: true,
    opacity: 0.24,
  });
  for (const x of [-4.2, 0, 4.2]) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.025, 5.8), ceilingMaterial);
    strip.position.set(x, 7.25, -0.4);
    world.add(strip);
  }
}

function addWheel(parent, x, z, front = true) { window.__bfTrace?.add(258);
  const wheel = new THREE.Group();
  wheel.position.set(x, 0.31, z);

  const housing = roundedBox(0.34, 0.22, 0.32, 0.075, materials.darkMetal, 0.022);
  housing.position.set(0, 0.27, front ? -0.08 : 0.08);
  wheel.add(housing);

  for (const forkX of [-0.145, 0.145]) {
    const fork = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.25, 0.055), materials.darkMetal);
    fork.position.set(forkX, 0.13, 0);
    fork.rotation.z = forkX * 0.5;
    fork.castShadow = true;
    wheel.add(fork);
  }

  const spinner = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(0.186, 0.066, 16, 48),
    materials.rubber,
  );
  tire.castShadow = true;
  spinner.add(tire);

  const sidewall = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.14, 0.165, 32),
    materials.darkMetal,
  );
  sidewall.rotation.x = Math.PI / 2;
  sidewall.castShadow = true;
  spinner.add(sidewall);

  const hub = new THREE.Mesh(
    new THREE.CylinderGeometry(0.065, 0.065, 0.188, 24),
    materials.hub,
  );
  hub.rotation.x = Math.PI / 2;
  spinner.add(hub);

  for (let i = 0; i < 6; i += 1) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.098, 0.018), materials.hub);
    spoke.position.z = 0.095;
    spoke.rotation.z = (i * Math.PI) / 3;
    spinner.add(spoke);
  }
  for (let i = 0; i < 12; i += 1) {
    const angle = (i * Math.PI) / 6;
    const tread = new THREE.Mesh(
      new THREE.BoxGeometry(0.034, 0.018, 0.02),
      materials.darkMetal,
    );
    tread.position.set(Math.sin(angle) * 0.249, Math.cos(angle) * 0.249, 0.072);
    tread.rotation.z = -angle;
    spinner.add(tread);
  }
  wheel.add(spinner);
  parent.add(wheel);
  return { wheel, spinner };
}

function addSuitcase() { window.__bfTrace?.add(318);
  const suitcase = new THREE.Group();
  suitcase.rotation.y = -0.03;
  world.add(suitcase);

  const backShell = roundedBox(2.42, 3.54, 0.9, 0.25, materials.shellDark, 0.07);
  backShell.position.set(0, 2.3, 0);
  suitcase.add(backShell);

  const frontShell = roundedBox(2.26, 3.38, 0.16, 0.21, materials.shell, 0.045);
  frontShell.position.set(0, 2.31, 0.49);
  suitcase.add(frontShell);

  const seam = roundedOutline(2.33, 3.46, 0.23, 0.55, 0.027, materials.trim);
  seam.position.y = 2.3;
  suitcase.add(seam);

  const ribMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x214d61,
    metalness: 0.38,
    roughness: 0.22,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  });
  for (const x of [-0.78, -0.39, 0, 0.39, 0.78]) {
    const rib = roundedBox(0.105, 2.75, 0.055, 0.052, ribMaterial, 0.018);
    rib.position.set(x, 2.32, 0.61);
    suitcase.add(rib);
  }

  const topGuard = roundedBox(1.58, 0.11, 0.04, 0.05, materials.trim, 0.012);
  topGuard.position.set(0, 3.83, 0.635);
  suitcase.add(topGuard);
  const bottomGuard = topGuard.clone();
  bottomGuard.position.y = 0.79;
  suitcase.add(bottomGuard);

  const badge = roundedBox(0.54, 0.25, 0.045, 0.055, materials.trim, 0.015);
  badge.position.set(0, 2.23, 0.665);
  suitcase.add(badge);
  for (const x of [-0.09, 0, 0.09]) {
    const slash = new THREE.Mesh(
      new THREE.BoxGeometry(0.027, 0.125, 0.026),
      materials.shellDark,
    );
    slash.position.set(x, 2.23, 0.702);
    slash.rotation.z = -0.42;
    suitcase.add(slash);
  }

  for (const x of [-0.91, 0.91]) {
    for (const y of [0.71, 3.89]) {
      const protector = roundedBox(0.26, 0.19, 0.065, 0.075, materials.darkMetal, 0.02);
      protector.position.set(x * 1.04, y, 0.605);
      suitcase.add(protector);
    }
  }

  const leftFrontWheel = addWheel(suitcase, -0.84, 0.46, true);
  const rightFrontWheel = addWheel(suitcase, 0.84, 0.46, true);
  addWheel(suitcase, -0.84, -0.38, false);
  addWheel(suitcase, 0.84, -0.38, false);

  const railSockets = new THREE.Group();
  for (const x of [-0.48, 0.48]) {
    const socket = roundedBox(0.2, 0.15, 0.24, 0.06, materials.darkMetal, 0.018);
    socket.position.set(x, 4.05, -0.22);
    railSockets.add(socket);
  }
  suitcase.add(railSockets);

  const handle = new THREE.Group();
  suitcase.add(handle);
  const rails = [];
  for (const x of [-0.48, 0.48]) {
    const outerRail = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.32, 0.12),
      materials.darkMetal,
    );
    outerRail.position.set(x, 4.18, -0.22);
    suitcase.add(outerRail);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.072, 1, 0.072), materials.brightMetal);
    rail.position.x = x;
    rail.position.z = -0.22;
    rail.castShadow = true;
    handle.add(rail);
    rails.push(rail);
  }

  const grip = roundedBox(1.2, 0.18, 0.25, 0.08, materials.darkMetal, 0.035);
  grip.position.z = -0.22;
  handle.add(grip);

  const gripInset = roundedBox(0.82, 0.075, 0.018, 0.025, materials.trim, 0.008);
  gripInset.position.z = -0.052;
  handle.add(gripInset);

  const scanBandMaterial = new THREE.MeshBasicMaterial({
    color: 0x91d6df,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const scanBand = roundedBox(1.95, 0.018, 0.018, 0.008, scanBandMaterial, 0.004);
  scanBand.position.z = 0.705;
  suitcase.add(scanBand);

  return {
    suitcase,
    wheels: [leftFrontWheel.spinner, rightFrontWheel.spinner],
    rails,
    grip,
    gripInset,
    scanBand,
    scanBandMaterial,
  };
}

addTerminal();
const product = addSuitcase();

const hemisphere = new THREE.HemisphereLight(0xa8d9e5, 0x05080c, 1.5);
scene.add(hemisphere);

const keyLight = new THREE.RectAreaLight(0xd9f4ff, 14, 4.5, 6.5);
keyLight.position.set(4.2, 6.3, 4.8);
keyLight.lookAt(0, 2.1, 0);
scene.add(keyLight);

const fillLight = new THREE.RectAreaLight(0xffddb0, 8, 3.2, 4.5);
fillLight.position.set(-4.2, 3.6, 3.1);
fillLight.lookAt(0, 2.2, 0);
scene.add(fillLight);

const handleLight = new THREE.RectAreaLight(0xffe4b7, 8.5, 2.2, 1.6);
handleLight.position.set(-1.6, 5.8, 2.7);
handleLight.lookAt(0, 4.75, -0.15);
scene.add(handleLight);

const rimLight = new THREE.RectAreaLight(0x75d7ec, 16, 4.2, 5.5);
rimLight.position.set(1.2, 5.2, -3.9);
rimLight.lookAt(0, 2.7, 0);
scene.add(rimLight);

const shadowLight = new THREE.DirectionalLight(0xe9f8ff, 2.6);
shadowLight.position.set(3.8, 7.5, 5.8);
shadowLight.castShadow = true;
shadowLight.shadow.mapSize.set(1536, 1536);
shadowLight.shadow.camera.left = -5;
shadowLight.shadow.camera.right = 5;
shadowLight.shadow.camera.top = 7;
shadowLight.shadow.camera.bottom = -2;
shadowLight.shadow.camera.near = 1;
shadowLight.shadow.camera.far = 20;
shadowLight.shadow.bias = -0.0004;
scene.add(shadowLight);

const target = new THREE.Vector3();
const position = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

function interpolateCamera(startPosition, endPosition, startTarget, endTarget, amount, fovA, fovB) { window.__bfTrace?.add(481);
  position.lerpVectors(startPosition, endPosition, amount);
  target.lerpVectors(startTarget, endTarget, amount);
  camera.position.copy(position);
  camera.fov = mix(fovA, fovB, amount);
}

function updateCamera(time, handleExtension) { window.__bfTrace?.add(488);
  if (time < 1.15) {
    const amount = smoother(time / 1.15);
    interpolateCamera(
      new THREE.Vector3(0.86, 0.34, 1.4),
      new THREE.Vector3(0.98, 1.3, 1.78),
      new THREE.Vector3(0.84, 0.31, 0.44),
      new THREE.Vector3(0.35, 1.48, 0.4),
      amount,
      35,
      37,
    );
  } else if (time < 2.55) {
    const amount = smoother((time - 1.15) / 1.4);
    interpolateCamera(
      new THREE.Vector3(0.98, 1.3, 1.78),
      new THREE.Vector3(1.55, 4.48, 2.13),
      new THREE.Vector3(0.35, 1.48, 0.4),
      new THREE.Vector3(0.06, 4.22, -0.05),
      amount,
      37,
      40,
    );
  } else if (time < 3.72) {
    const amount = smoother((time - 2.55) / 1.17);
    const angle = mix(0.67, -0.97, amount);
    const radius = mix(2.72, 2.82, amount);
    camera.position.set(
      Math.sin(angle) * radius,
      4.62 + Math.sin(amount * Math.PI) * 0.24,
      Math.cos(angle) * radius,
    );
    target.set(0, 4.18 + handleExtension * 0.66, -0.12);
    camera.fov = mix(40, 41, amount);
  } else {
    const amount = smoother((time - 3.72) / (DURATION - 3.72));
    position.lerpVectors(
      new THREE.Vector3(-2.32, 4.62, 1.6),
      new THREE.Vector3(-4.15, 2.85, 6.65),
      amount,
    );
    const aimAmount = smoother((time - 3.72) / 0.9);
    target.lerpVectors(
      new THREE.Vector3(0, 5.03, -0.12),
      new THREE.Vector3(0, 2.55, 0),
      aimAmount,
    );
    camera.position.copy(position);
    camera.fov = mix(41, 43, amount);
  }
  camera.up.copy(up);
  camera.lookAt(target);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

function updateScene(time) { window.__bfTrace?.add(544);
  const extensionProgress = smoother((time - 2.42) / 0.94);
  const settleProgress = clamp01((time - 3.36) / 0.32);
  const mechanicalSettle = time >= 3.36 && time <= 3.68
    ? 0.03 * Math.sin(settleProgress * Math.PI) * (1 - settleProgress)
    : 0;
  const handleExtension = 1.3 * extensionProgress + mechanicalSettle;
  for (const rail of product.rails) {
    rail.scale.y = Math.max(0.01, handleExtension);
    rail.position.y = 4.18 + handleExtension * 0.5;
  }
  product.grip.position.y = 4.22 + handleExtension;
  product.gripInset.position.y = 4.22 + handleExtension;

  const wheelSpin = -Math.PI * 2 * 1.15 * smoother(time / 1.15);
  product.wheels[0].rotation.z = wheelSpin;
  product.wheels[1].rotation.z = wheelSpin;

  const scanProgress = smooth((time - 0.58) / 1.72);
  product.scanBand.position.y = mix(0.79, 3.82, scanProgress);
  const scanFadeIn = smooth((time - 0.55) / 0.25);
  const scanFadeOut = 1 - smooth((time - 2.22) / 0.28);
  product.scanBandMaterial.opacity = 0.3 * scanFadeIn * scanFadeOut;

  keyLight.intensity = 14.5 + 2.5 * smooth(time / DURATION);
  rimLight.intensity = 14.5 + 3.2 * extensionProgress;
  fillLight.intensity = 9.2 + 1.4 * Math.sin((time / DURATION) * Math.PI);
  handleLight.intensity = 7.8 + 2.4 * extensionProgress;

  updateCamera(time, handleExtension);
  renderer.render(scene, camera);
}

let currentTime = 0;
updateScene(currentTime);

window.reconstruction = {
  ready: true,
  pause() {
    return currentTime;
  },
  seek(seconds) {
    const numericTime = Number(seconds);
    if (!Number.isFinite(numericTime)) {
      throw new TypeError('seek(seconds) requires a finite number');
    }
    currentTime = Math.min(DURATION, Math.max(0, numericTime));
    updateScene(currentTime);
    return currentTime;
  },
  getCameraState() {
    return {
      position: camera.position.toArray(),
      quaternion: camera.quaternion.toArray(),
      fov: camera.fov,
    };
  },
};
