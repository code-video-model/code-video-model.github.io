import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const FPS = 24;
const FRAME_COUNT = 124;
const DURATION = FRAME_COUNT / FPS;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x03131c);
scene.fog = new THREE.FogExp2(0x061923, 0.024);

const camera = new THREE.PerspectiveCamera(41, WIDTH / HEIGHT, 0.05, 80);
const renderer = new THREE.WebGLRenderer({
  antialias: true,
  alpha: false,
  preserveDrawingBuffer: true,
  powerPreference: "high-performance",
});
renderer.setPixelRatio(1);
renderer.setSize(WIDTH, HEIGHT, false);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.02;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const clamp01 = (value) => Math.max(0, Math.min(1, value));
const smoothstep = (a, b, value) => {
  const x = clamp01((value - a) / (b - a));
  return x * x * (3 - 2 * x);
};
const mix = (a, b, amount) => a + (b - a) * amount;
const hash = (n) => {
  const value = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return value - Math.floor(value);
};

function materialStandard(color, options = {}) { window.__bfTrace?.add(40);
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.4,
    metalness: 0.05,
    ...options,
  });
}

function addBox(parent, size, position, material, castShadow = false) { window.__bfTrace?.add(49);
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.position.set(...position);
  mesh.castShadow = castShadow;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addCylinder(parent, radiusTop, radiusBottom, height, position, material) { window.__bfTrace?.add(58);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 48, 2, false),
    material,
  );
  mesh.position.set(...position);
  mesh.rotation.z = Math.PI / 2;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function makeEdges(size, position, color, opacity) { window.__bfTrace?.add(71);
  const geometry = new THREE.EdgesGeometry(new THREE.BoxGeometry(...size));
  const material = new THREE.LineBasicMaterial({
    color,
    transparent: true,
    opacity,
  });
  const edges = new THREE.LineSegments(geometry, material);
  edges.position.set(...position);
  scene.add(edges);
  return edges;
}

const backdrop = new THREE.Mesh(
  new THREE.PlaneGeometry(36, 19),
  new THREE.ShaderMaterial({
    uniforms: {
      upper: { value: new THREE.Color(0x0d3442) },
      lower: { value: new THREE.Color(0x02080d) },
      glow: { value: new THREE.Color(0x1c6170) },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform vec3 upper;
      uniform vec3 lower;
      uniform vec3 glow;
      void main() {
        float horizon = smoothstep(0.05, 0.96, vUv.y);
        float halo = exp(-10.0 * distance(vUv, vec2(0.50, 0.55)));
        vec3 color = mix(lower, upper, horizon) + glow * halo * 0.34;
        gl_FragColor = vec4(color, 1.0);
      }
    `,
    depthWrite: false,
  }),
);
backdrop.position.set(0, 1.2, -6.1);
scene.add(backdrop);

const floor = new THREE.Mesh(
  new THREE.PlaneGeometry(34, 22),
  materialStandard(0x071118, { roughness: 0.2, metalness: 0.3 }),
);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -2.62;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(28, 40, 0x194a55, 0x0b2730);
grid.position.y = -2.605;
grid.material.transparent = true;
grid.material.opacity = 0.32;
scene.add(grid);

scene.add(new THREE.HemisphereLight(0x9beaff, 0x071018, 1.35));
const keyLight = new THREE.DirectionalLight(0xd9f8ff, 3.2);
keyLight.position.set(-2, 8, 6);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(1024, 1024);
keyLight.shadow.camera.left = -8;
keyLight.shadow.camera.right = 8;
keyLight.shadow.camera.top = 5;
keyLight.shadow.camera.bottom = -5;
scene.add(keyLight);

const rimLight = new THREE.PointLight(0x38cfea, 28, 15, 2);
rimLight.position.set(-3, 1.7, -1.5);
scene.add(rimLight);
const warmLight = new THREE.PointLight(0xff9d42, 18, 11, 2);
warmLight.position.set(3.5, -0.4, 2.8);
scene.add(warmLight);

const tank = new THREE.Group();
scene.add(tank);

const baseMaterial = materialStandard(0x30424b, {
  roughness: 0.23,
  metalness: 0.72,
});
addBox(tank, [12.45, 0.22, 4.7], [0, -2.42, 0], baseMaterial, true);
addBox(tank, [12.28, 0.12, 4.52], [0, 2.35, 0], baseMaterial, true);
for (const x of [-6.12, 6.12]) {
  for (const z of [-2.22, 2.22]) {
    addBox(tank, [0.12, 4.75, 0.12], [x, -0.03, z], baseMaterial, true);
  }
}

const waterMaterial = new THREE.MeshPhongMaterial({
  color: 0x2c8297,
  specular: 0xa7f4ff,
  shininess: 92,
  transparent: true,
  opacity: 0.092,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const water = addBox(tank, [12.0, 4.34, 4.25], [0, -0.16, 0], waterMaterial);
water.renderOrder = 1;

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x9be8f3,
  roughness: 0.08,
  metalness: 0,
  transparent: true,
  opacity: 0.095,
  transmission: 0.28,
  thickness: 0.04,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const backGlass = new THREE.Mesh(new THREE.PlaneGeometry(12, 4.55), glassMaterial);
backGlass.position.set(0, -0.04, -2.15);
tank.add(backGlass);
const frontGlass = backGlass.clone();
frontGlass.position.z = 2.15;
frontGlass.material = glassMaterial.clone();
frontGlass.material.opacity = 0.045;
frontGlass.renderOrder = 20;
tank.add(frontGlass);
for (const x of [-6, 6]) {
  const side = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 4.55), glassMaterial);
  side.rotation.y = Math.PI / 2;
  side.position.set(x, -0.04, 0);
  tank.add(side);
}
makeEdges([12.02, 4.57, 4.32], [0, -0.04, 0], 0x82d5df, 0.58);

const surfaceMaterial = new THREE.MeshPhongMaterial({
  color: 0x6bc6da,
  specular: 0xe7ffff,
  shininess: 120,
  transparent: true,
  opacity: 0.27,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const surface = new THREE.Mesh(new THREE.PlaneGeometry(11.96, 4.22, 24, 8), surfaceMaterial);
surface.rotation.x = -Math.PI / 2;
surface.position.y = 2.015;
tank.add(surface);

const waterLines = new THREE.Group();
for (let i = 0; i < 5; i += 1) {
  const points = [];
  for (let j = 0; j <= 96; j += 1) {
    const x = -5.8 + (11.6 * j) / 96;
    points.push(new THREE.Vector3(x, 2.025, -1.72 + i * 0.86));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({
      color: 0x8ae8f4,
      transparent: true,
      opacity: 0.17,
    }),
  );
  waterLines.add(line);
}
tank.add(waterLines);

const nozzle = new THREE.Group();
tank.add(nozzle);
const darkMetal = materialStandard(0x172630, {
  roughness: 0.27,
  metalness: 0.86,
});
const steel = materialStandard(0x668089, {
  roughness: 0.18,
  metalness: 0.82,
});
addCylinder(nozzle, 1.02, 1.02, 0.88, [-5.78, 0, 0], darkMetal);
addCylinder(nozzle, 0.82, 0.72, 1.12, [-5.2, 0, 0], steel);
const mouth = addCylinder(
  nozzle,
  0.59,
  0.59,
  0.045,
  [-4.63, 0, 0],
  materialStandard(0x03090c, { roughness: 0.5, metalness: 0.25 }),
);
mouth.castShadow = false;
const nozzleRim = new THREE.Mesh(
  new THREE.TorusGeometry(0.68, 0.075, 16, 64),
  materialStandard(0xa7c0c5, {
    roughness: 0.14,
    metalness: 0.92,
  }),
);
nozzleRim.rotation.y = Math.PI / 2;
nozzleRim.position.set(-4.61, 0, 0);
nozzleRim.castShadow = true;
nozzle.add(nozzleRim);

const piston = addCylinder(
  nozzle,
  0.51,
  0.51,
  0.16,
  [-5.0, 0, 0],
  materialStandard(0x5bd6e7, {
    emissive: 0x17697a,
    emissiveIntensity: 0.8,
    roughness: 0.2,
    metalness: 0.35,
  }),
);

const jetMaterial = new THREE.MeshPhongMaterial({
  color: 0x4ed9e7,
  emissive: 0x0d6170,
  specular: 0xc8ffff,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const jet = new THREE.Mesh(
  new THREE.CylinderGeometry(0.31, 0.52, 1, 48, 8, true),
  jetMaterial,
);
jet.rotation.z = Math.PI / 2;
tank.add(jet);

const pressureRings = [];
for (let i = 0; i < 4; i += 1) {
  const material = new THREE.MeshBasicMaterial({
    color: i % 2 ? 0x62dfec : 0xffba63,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.018, 8, 64), material);
  ring.rotation.y = Math.PI / 2;
  ring.position.set(-4.48, 0, 0);
  tank.add(ring);
  pressureRings.push(ring);
}

const vortex = new THREE.Group();
tank.add(vortex);

const coreMaterial = new THREE.MeshStandardMaterial({
  color: 0x1bc8d7,
  emissive: 0x05657c,
  emissiveIntensity: 1.7,
  roughness: 0.28,
  metalness: 0.05,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const core = new THREE.Mesh(new THREE.TorusGeometry(1, 0.235, 28, 128), coreMaterial);
core.rotation.y = Math.PI / 2;
vortex.add(core);

const sheathMaterial = new THREE.MeshBasicMaterial({
  color: 0x297dcc,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  side: THREE.DoubleSide,
  blending: THREE.AdditiveBlending,
});
const sheath = new THREE.Mesh(new THREE.TorusGeometry(1, 0.34, 24, 128), sheathMaterial);
sheath.rotation.y = Math.PI / 2;
vortex.add(sheath);

const hotCoreMaterial = new THREE.MeshBasicMaterial({
  color: 0xff8f32,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const hotCore = new THREE.Mesh(new THREE.TorusGeometry(1, 0.07, 14, 128), hotCoreMaterial);
hotCore.rotation.y = Math.PI / 2;
vortex.add(hotCore);

const apertureMaterial = new THREE.MeshBasicMaterial({
  color: 0x021118,
  transparent: true,
  opacity: 0,
  side: THREE.DoubleSide,
  depthWrite: false,
});
const aperture = new THREE.Mesh(new THREE.CircleGeometry(0.69, 64), apertureMaterial);
aperture.rotation.y = Math.PI / 2;
vortex.add(aperture);

const apertureRimMaterial = new THREE.MeshBasicMaterial({
  color: 0x48cfd5,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const apertureRim = new THREE.Mesh(
  new THREE.TorusGeometry(0.72, 0.014, 8, 96),
  apertureRimMaterial,
);
apertureRim.rotation.y = Math.PI / 2;
vortex.add(apertureRim);

const lobeMaterial = new THREE.MeshBasicMaterial({
  color: 0xff9e43,
  transparent: true,
  opacity: 0,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
});
const lobes = [-1, 1].map((sign) => {
  const lobe = new THREE.Mesh(new THREE.SphereGeometry(0.31, 24, 16), lobeMaterial.clone());
  lobe.userData.sign = sign;
  vortex.add(lobe);
  return lobe;
});

const VORTEX_PARTICLES = 520;
const vortexPositions = new Float32Array(VORTEX_PARTICLES * 3);
const vortexColors = new Float32Array(VORTEX_PARTICLES * 3);
const colorA = new THREE.Color(0x38e5e7);
const colorB = new THREE.Color(0xffa84c);
for (let i = 0; i < VORTEX_PARTICLES; i += 1) {
  const selector = hash(i * 3.4);
  const color = selector > 0.7
    ? colorB.clone().lerp(new THREE.Color(0xffd18a), selector * 0.12)
    : colorA.clone().lerp(new THREE.Color(0x8bf5ff), selector * 0.18);
  color.toArray(vortexColors, i * 3);
}
const vortexParticleGeometry = new THREE.BufferGeometry();
vortexParticleGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(vortexPositions, 3),
);
vortexParticleGeometry.setAttribute("color", new THREE.BufferAttribute(vortexColors, 3));
const vortexParticles = new THREE.Points(
  vortexParticleGeometry,
  new THREE.PointsMaterial({
    size: 0.064,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  }),
);
vortex.add(vortexParticles);

const streamlineData = [];
for (let lineIndex = 0; lineIndex < 9; lineIndex += 1) {
  const count = 150;
  const positions = new Float32Array(count * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const material = new THREE.LineBasicMaterial({
    color: lineIndex % 3 === 0 ? 0xffad55 : 0x49dcea,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const line = new THREE.Line(geometry, material);
  vortex.add(line);
  streamlineData.push({ line, positions, count, lineIndex });
}

const wakeRings = [];
for (let i = 0; i < 7; i += 1) {
  const material = new THREE.MeshBasicMaterial({
    color: i % 2 ? 0x266f9f : 0x2bbfc4,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 8, 72), material);
  ring.rotation.y = Math.PI / 2 + 0.38;
  tank.add(ring);
  wakeRings.push(ring);
}

const trailCount = 220;
const trailPositions = new Float32Array(trailCount * 3);
const trailColors = new Float32Array(trailCount * 3);
for (let i = 0; i < trailCount; i += 1) {
  new THREE.Color(hash(i) > 0.73 ? 0xffa34d : 0x46b9cd).toArray(trailColors, i * 3);
}
const trailGeometry = new THREE.BufferGeometry();
trailGeometry.setAttribute("position", new THREE.BufferAttribute(trailPositions, 3));
trailGeometry.setAttribute("color", new THREE.BufferAttribute(trailColors, 3));
const trailParticles = new THREE.Points(
  trailGeometry,
  new THREE.PointsMaterial({
    size: 0.045,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  }),
);
tank.add(trailParticles);

const suspendedCount = 180;
const suspendedBase = [];
const suspendedPositions = new Float32Array(suspendedCount * 3);
for (let i = 0; i < suspendedCount; i += 1) {
  const base = new THREE.Vector3(
    -5.7 + hash(i * 4.1) * 11.4,
    -2.0 + hash(i * 4.1 + 1) * 3.8,
    -1.9 + hash(i * 4.1 + 2) * 3.8,
  );
  suspendedBase.push(base);
  base.toArray(suspendedPositions, i * 3);
}
const suspendedGeometry = new THREE.BufferGeometry();
suspendedGeometry.setAttribute(
  "position",
  new THREE.BufferAttribute(suspendedPositions, 3),
);
const suspended = new THREE.Points(
  suspendedGeometry,
  new THREE.PointsMaterial({
    color: 0xa0e9f1,
    size: 0.024,
    transparent: true,
    opacity: 0.38,
    depthWrite: false,
  }),
);
tank.add(suspended);

const bubbleCount = 44;
const bubbleBase = [];
const bubblePositions = new Float32Array(bubbleCount * 3);
for (let i = 0; i < bubbleCount; i += 1) {
  bubbleBase.push({
    x: -5.5 + hash(i * 7.3) * 11,
    y: -2.1 + hash(i * 7.3 + 1) * 4.0,
    z: -1.75 + hash(i * 7.3 + 2) * 3.5,
    speed: 0.055 + hash(i * 7.3 + 3) * 0.095,
  });
}
const bubbleGeometry = new THREE.BufferGeometry();
bubbleGeometry.setAttribute("position", new THREE.BufferAttribute(bubblePositions, 3));
const bubbles = new THREE.Points(
  bubbleGeometry,
  new THREE.PointsMaterial({
    color: 0xd9fbff,
    size: 0.045,
    transparent: true,
    opacity: 0.52,
    depthWrite: false,
  }),
);
tank.add(bubbles);

const causticMaterial = new THREE.LineBasicMaterial({
  color: 0x66d5df,
  transparent: true,
  opacity: 0.14,
});
const caustics = [];
for (let i = 0; i < 9; i += 1) {
  const points = [];
  for (let j = 0; j <= 60; j += 1) {
    points.push(new THREE.Vector3(-5.8 + j * 0.193, -2.28, -1.8 + i * 0.45));
  }
  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const line = new THREE.Line(geometry, causticMaterial);
  caustics.push(line);
  tank.add(line);
}

function ringState(time) { window.__bfTrace?.add(556);
  const age = clamp01((time - 0.22) / 4.75);
  const travel = age * (0.88 + 0.12 * age);
  const formation = smoothstep(0.18, 0.9, time);
  return {
    x: mix(-4.28, 3.58, travel),
    radius: mix(0.69, 1.18, Math.pow(age, 0.78)),
    tube: mix(0.18, 0.31, Math.pow(age, 0.82)),
    formation,
    age,
  };
}

function torusPoint(u, v, majorRadius, tubeRadius, radialNoise = 0) { window.__bfTrace?.add(569);
  const radial = majorRadius + tubeRadius * Math.sin(v) + radialNoise;
  return [
    tubeRadius * Math.cos(v),
    radial * Math.cos(u),
    radial * Math.sin(u),
  ];
}

let currentTime = 0;
let running = true;
let previousClockTime = performance.now() / 1000;

function update(time) { window.__bfTrace?.add(582);
  currentTime = Math.max(0, Math.min(DURATION, Number(time) || 0));
  const state = ringState(currentTime);
  vortex.position.set(state.x, 0, 0);
  vortex.rotation.y = 0.38 + 0.018 * Math.sin(currentTime * 0.72);

  const pulse = 1 + 0.035 * Math.sin(currentTime * 5.1);
  core.scale.set(state.radius * pulse, state.radius * pulse, state.tube / 0.235);
  sheath.scale.set(state.radius * 1.01, state.radius * 1.01, state.tube / 0.34 * 1.72);
  hotCore.scale.set(state.radius, state.radius, state.tube / 0.07 * 0.56);
  coreMaterial.opacity = 0.17 * state.formation * (1 - state.age * 0.2);
  sheathMaterial.opacity = 0.042 * state.formation * (1 - state.age * 0.35);
  hotCoreMaterial.opacity = 0.3 * state.formation * (1 - state.age * 0.28);
  coreMaterial.emissiveIntensity = 1.85 - state.age * 0.45;
  aperture.scale.setScalar(state.radius);
  aperture.material.opacity = 0.68 * state.formation * (1 - state.age * 0.16);
  apertureRim.scale.setScalar(state.radius);
  apertureRim.material.opacity = 0.24 * state.formation * (1 - state.age * 0.25);

  lobes.forEach((lobe, index) => {
    const sign = lobe.userData.sign;
    lobe.position.set(
      0.02 * Math.sin(currentTime * 3 + index),
      sign * state.radius,
      0,
    );
    lobe.scale.set(state.tube * 1.6, state.tube * 1.02, state.tube * 1.4);
    lobe.material.opacity = 0.11 * state.formation * (1 - state.age * 0.25);
  });

  for (let i = 0; i < VORTEX_PARTICLES; i += 1) {
    const u = Math.PI * 2 * hash(i * 2.37);
    const v0 = Math.PI * 2 * hash(i * 5.21 + 4.2);
    const spin = currentTime * (3.25 + hash(i + 8.4) * 1.1);
    const v = v0 + spin;
    const tubeOffset = state.tube * (0.48 + hash(i * 9.2) * 0.92);
    const noise = (hash(i * 8.7) - 0.5) * state.tube * 0.34;
    const point = torusPoint(u, v, state.radius, tubeOffset, noise);
    vortexPositions[i * 3] = point[0];
    vortexPositions[i * 3 + 1] = point[1];
    vortexPositions[i * 3 + 2] = point[2];
  }
  vortexParticleGeometry.attributes.position.needsUpdate = true;
  vortexParticles.material.opacity = 0.69 * state.formation * (1 - state.age * 0.16);

  streamlineData.forEach(({ line, positions, count, lineIndex }) => {
    for (let i = 0; i < count; i += 1) {
      const u = (Math.PI * 2 * i) / (count - 1);
      const v = u * (2.0 + (lineIndex % 3) * 0.5) +
        lineIndex * 0.72 +
        currentTime * (3.0 + lineIndex * 0.08);
      const radiusScale = 0.65 + 0.055 * lineIndex;
      const point = torusPoint(
        u,
        v,
        state.radius,
        state.tube * radiusScale,
        0.018 * Math.sin(u * 7 + lineIndex),
      );
      positions[i * 3] = point[0];
      positions[i * 3 + 1] = point[1];
      positions[i * 3 + 2] = point[2];
    }
    line.geometry.attributes.position.needsUpdate = true;
    line.material.opacity = (lineIndex % 3 === 0 ? 0.36 : 0.22) *
      state.formation *
      (1 - state.age * 0.28);
  });

  wakeRings.forEach((ring, index) => {
    const lag = 0.28 + index * 0.27;
    const wakeTime = Math.max(0, currentTime - lag);
    const past = ringState(wakeTime);
    ring.position.set(past.x - 0.05 * index, 0, 0);
    const scale = past.radius * (0.92 - index * 0.035);
    ring.scale.set(scale, scale, past.tube / 0.025 * (0.25 + index * 0.035));
    ring.material.opacity =
      0.078 *
      past.formation *
      state.formation *
      (1 - index / wakeRings.length) *
      (1 - state.age * 0.35);
  });

  for (let i = 0; i < trailCount; i += 1) {
    const lag = 0.08 + hash(i * 2.4) * 1.58;
    const past = ringState(Math.max(0, currentTime - lag));
    const angle = Math.PI * 2 * hash(i * 6.1);
    const radial = past.radius * (0.75 + 0.42 * hash(i * 9.3));
    const circulation = currentTime * (1.3 + hash(i * 1.8)) + hash(i) * 8;
    trailPositions[i * 3] = past.x - 0.18 - 0.22 * lag +
      Math.cos(circulation) * past.tube * 0.5;
    trailPositions[i * 3 + 1] = Math.cos(angle) * radial;
    trailPositions[i * 3 + 2] =
      Math.sin(angle) * radial + (hash(i * 10.2) - 0.5) * 0.2;
  }
  trailGeometry.attributes.position.needsUpdate = true;
  trailParticles.material.opacity = 0.29 * state.formation * (1 - state.age * 0.18);

  const impulse = smoothstep(0.02, 0.22, currentTime) *
    (1 - smoothstep(0.78, 1.28, currentTime));
  const jetEnd = mix(-4.57, state.x - 0.1, smoothstep(0.05, 0.7, currentTime));
  const jetLength = Math.max(0.08, jetEnd + 4.58);
  jet.position.set(-4.58 + jetLength * 0.5, 0, 0);
  jet.scale.set(1, jetLength, 1);
  jetMaterial.opacity = 0.24 * impulse;
  piston.position.x = -5.02 + 0.33 * smoothstep(0.04, 0.28, currentTime) -
    0.18 * smoothstep(0.55, 1.0, currentTime);
  piston.material.emissiveIntensity = 0.8 + impulse * 1.8;

  pressureRings.forEach((ring, index) => {
    const local = clamp01((currentTime - 0.08 - index * 0.1) / 0.85);
    ring.position.x = -4.51 + local * (0.55 + index * 0.16);
    ring.scale.setScalar(0.7 + local * (0.75 + index * 0.12));
    ring.material.opacity = 0.35 * Math.sin(local * Math.PI) * (1 - index * 0.13);
  });

  for (let i = 0; i < suspendedCount; i += 1) {
    const base = suspendedBase[i];
    suspendedPositions[i * 3] = base.x + 0.035 * Math.sin(currentTime * 0.7 + i);
    suspendedPositions[i * 3 + 1] =
      base.y + 0.025 * Math.sin(currentTime * 0.9 + i * 0.45);
    suspendedPositions[i * 3 + 2] =
      base.z + 0.03 * Math.cos(currentTime * 0.65 + i * 0.3);
  }
  suspendedGeometry.attributes.position.needsUpdate = true;

  for (let i = 0; i < bubbleCount; i += 1) {
    const base = bubbleBase[i];
    const span = 4.05;
    const y = -2.05 + ((base.y + 2.05 + currentTime * base.speed) % span);
    bubblePositions[i * 3] = base.x + 0.02 * Math.sin(currentTime * 1.5 + i);
    bubblePositions[i * 3 + 1] = y;
    bubblePositions[i * 3 + 2] = base.z;
  }
  bubbleGeometry.attributes.position.needsUpdate = true;

  waterLines.children.forEach((line, lineIndex) => {
    const position = line.geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      const x = -5.8 + (11.6 * i) / (position.count - 1);
      position.setY(
        i,
        2.025 +
          0.015 * Math.sin(x * 1.6 + currentTime * 1.4 + lineIndex) +
          0.009 * Math.sin(x * 3.4 - currentTime * 1.9),
      );
    }
    position.needsUpdate = true;
  });
  surface.material.opacity = 0.24 + 0.025 * Math.sin(currentTime * 1.2);

  caustics.forEach((line, lineIndex) => {
    const position = line.geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      const x = -5.8 + i * 0.193;
      position.setY(i, -2.28 + 0.012 * Math.sin(x * 2.7 + currentTime * 1.8));
      position.setZ(
        i,
        -1.8 +
          lineIndex * 0.45 +
          0.07 * Math.sin(x * 1.4 + currentTime * 1.3 + lineIndex),
      );
    }
    position.needsUpdate = true;
  });

  const tracking = smoothstep(0.35, 1.65, currentTime);
  const framingX = mix(-2.86, state.x + 0.16, tracking);
  const cameraX = framingX - 0.92;
  camera.position.set(
    cameraX,
    1.48 + 0.08 * Math.sin(currentTime * 0.45),
    10.35 - 0.2 * tracking,
  );
  camera.fov = mix(42.5, 40.5, smoothstep(0.5, 3.8, currentTime));
  camera.updateProjectionMatrix();
  camera.lookAt(framingX + 0.48, -0.07, 0);
  camera.updateMatrixWorld(true);

  rimLight.position.x = state.x - 0.4;
  rimLight.position.y = 1.2;
  warmLight.position.x = state.x + 0.7;
  warmLight.intensity = 10 + 5 * state.formation;

  renderer.render(scene, camera);
}

function pause() { window.__bfTrace?.add(770);
  running = false;
}

function seek(seconds) { window.__bfTrace?.add(774);
  running = false;
  update(seconds);
}

function getCameraState() { window.__bfTrace?.add(779);
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

function getStateDigest() { window.__bfTrace?.add(787);
  const state = ringState(currentTime);
  return {
    time: currentTime,
    ring: [state.x, state.radius, state.tube, state.formation],
    camera: getCameraState(),
    jetOpacity: jetMaterial.opacity,
    firstParticle: Array.from(vortexPositions.slice(0, 3)),
  };
}

function animate(nowMilliseconds) { window.__bfTrace?.add(798);
  const now = nowMilliseconds / 1000;
  if (running) {
    const delta = Math.min(0.05, Math.max(0, now - previousClockTime));
    currentTime = (currentTime + delta) % DURATION;
    update(currentTime);
  }
  previousClockTime = now;
  requestAnimationFrame(animate);
}

window.reconstruction = {
  pause,
  seek,
  getCameraState,
  getStateDigest,
  metadata: {
    width: WIDTH,
    height: HEIGHT,
    fps: FPS,
    frames: FRAME_COUNT,
    duration: DURATION,
  },
};
window.reconstructionReady = true;
update(0);
requestAnimationFrame(animate);
