import * as THREE from "./vendor/three.module.js";

const WIDTH = 960;
const HEIGHT = 540;
const CAMERA_DURATION = 5;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x181714);
scene.fog = new THREE.Fog(0xddd8ce, 18, 34);

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
renderer.toneMappingExposure = 0.97;
renderer.domElement.id = "reconstruction-canvas";
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(58, WIDTH / HEIGHT, 0.1, 60);
camera.fov = 58;
camera.updateProjectionMatrix();

const materials = {
  wall: new THREE.MeshStandardMaterial({ color: 0xd8d0c2, roughness: 0.84, metalness: 0 }),
  wallSide: new THREE.MeshStandardMaterial({ color: 0xbcb2a1, roughness: 0.88, metalness: 0 }),
  trim: new THREE.MeshStandardMaterial({ color: 0xeee6da, roughness: 0.68, metalness: 0 }),
  darkTrim: new THREE.MeshStandardMaterial({ color: 0x27231f, roughness: 0.46, metalness: 0.08 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xa97b31, roughness: 0.26, metalness: 0.78 }),
  bench: new THREE.MeshStandardMaterial({ color: 0x735140, roughness: 0.55, metalness: 0 }),
  benchDark: new THREE.MeshStandardMaterial({ color: 0x33251f, roughness: 0.64, metalness: 0 }),
  pedestal: new THREE.MeshStandardMaterial({ color: 0xd9d4ca, roughness: 0.7, metalness: 0 }),
};

function mesh(geometry, material, {
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  castShadow = false,
  receiveShadow = false,
  name = "",
} = {}) { window.__bfTrace?.add(42);
  const object = new THREE.Mesh(geometry, material);
  object.position.set(...position);
  object.rotation.set(...rotation);
  object.castShadow = castShadow;
  object.receiveShadow = receiveShadow;
  object.name = name;
  scene.add(object);
  return object;
}

function addRoomShell() { window.__bfTrace?.add(59);
  mesh(new THREE.BoxGeometry(17.6, 0.18, 20.4), new THREE.MeshStandardMaterial({
    color: 0x888680,
    roughness: 0.34,
    metalness: 0.02,
  }), {
    position: [0, -0.1, 0],
    receiveShadow: true,
    name: "continuous-gallery-floor",
  });

  const tileColors = [0xaaa7a2, 0xc4c0b8, 0x969690, 0xb7b2aa];
  for (let zi = 0; zi < 10; zi += 1) {
    for (let xi = 0; xi < 9; xi += 1) {
      const tile = mesh(
        new THREE.PlaneGeometry(1.9, 1.9),
        new THREE.MeshStandardMaterial({
          color: tileColors[(xi * 3 + zi * 5) % tileColors.length],
          roughness: 0.28,
          metalness: 0.02,
        }),
        {
          position: [-7.6 + xi * 1.9, 0.004, -8.58 + zi * 1.9],
          rotation: [-Math.PI / 2, 0, 0],
          receiveShadow: true,
        },
      );
      tile.renderOrder = 1;
    }
  }

  mesh(new THREE.BoxGeometry(0.35, 6.5, 20.5), materials.wall, {
    position: [-8.72, 3.25, 0],
    receiveShadow: true,
    name: "left-gallery-wall",
  });
  mesh(new THREE.BoxGeometry(0.35, 6.5, 20.5), materials.wall, {
    position: [8.72, 3.25, 0],
    receiveShadow: true,
    name: "right-gallery-wall",
  });
  mesh(new THREE.BoxGeometry(17.8, 6.5, 0.35), materials.wall, {
    position: [0, 3.25, -10.18],
    receiveShadow: true,
    name: "far-gallery-wall",
  });
  mesh(new THREE.BoxGeometry(17.8, 6.5, 0.35), materials.wallSide, {
    position: [0, 3.25, 10.18],
    receiveShadow: true,
    name: "near-gallery-wall",
  });

  mesh(new THREE.PlaneGeometry(17.4, 20.0), new THREE.MeshStandardMaterial({
    color: 0xe7e3dc,
    roughness: 0.92,
    side: THREE.DoubleSide,
  }), {
    position: [0, 6.49, 0],
    rotation: [Math.PI / 2, 0, 0],
    receiveShadow: true,
    name: "gallery-ceiling",
  });

  for (const x of [-8.49, 8.49]) {
    mesh(new THREE.BoxGeometry(0.16, 0.34, 20.0), materials.trim, {
      position: [x, 0.18, 0],
      castShadow: true,
      receiveShadow: true,
      name: "baseboard",
    });
    mesh(new THREE.BoxGeometry(0.2, 0.22, 20.0), materials.trim, {
      position: [x, 6.28, 0],
      castShadow: true,
      name: "ceiling-cornice",
    });
  }
}

function addConventionalDoorway() { window.__bfTrace?.add(137);
  const doorwayWidth = 3.2;
  const doorwayHeight = 3.5;
  const sideWidth = (17.1 - doorwayWidth) / 2;

  for (const x of [-(doorwayWidth + sideWidth) / 2, (doorwayWidth + sideWidth) / 2]) {
    mesh(new THREE.BoxGeometry(sideWidth, 6.5, 0.76), materials.wall, {
      position: [x, 3.25, 0],
      castShadow: true,
      receiveShadow: true,
      name: "intact-dividing-wall",
    });
  }
  mesh(new THREE.BoxGeometry(doorwayWidth, 6.5 - doorwayHeight, 0.76), materials.wall, {
    position: [0, doorwayHeight + (6.5 - doorwayHeight) / 2, 0],
    castShadow: true,
    receiveShadow: true,
    name: "doorway-header-wall",
  });

  for (const x of [-doorwayWidth / 2, doorwayWidth / 2]) {
    mesh(new THREE.BoxGeometry(0.08, doorwayHeight, 0.72), materials.wallSide, {
      position: [x, doorwayHeight / 2, 0],
      castShadow: true,
      receiveShadow: true,
      name: "doorway-jamb-reveal",
    });
  }
  mesh(new THREE.BoxGeometry(doorwayWidth, 0.08, 0.72), materials.wallSide, {
    position: [0, doorwayHeight, 0],
    castShadow: true,
    receiveShadow: true,
    name: "doorway-lintel-reveal",
  });

  for (const z of [-0.43, 0.43]) {
    for (const x of [-doorwayWidth / 2 - 0.13, doorwayWidth / 2 + 0.13]) {
      mesh(new THREE.BoxGeometry(0.26, doorwayHeight + 0.18, 0.16), materials.trim, {
        position: [x, (doorwayHeight + 0.18) / 2, z],
        castShadow: true,
        name: "doorway-casing-jamb",
      });
      mesh(new THREE.BoxGeometry(0.46, 0.2, 0.2), materials.trim, {
        position: [x, 0.1, z],
        castShadow: true,
        name: "doorway-casing-plinth",
      });
    }
    mesh(new THREE.BoxGeometry(doorwayWidth + 0.52, 0.3, 0.16), materials.trim, {
      position: [0, doorwayHeight + 0.15, z],
      castShadow: true,
      name: "doorway-casing-header",
    });
    const baseboardWidth = 8.48 - doorwayWidth / 2;
    for (const x of [-(8.48 + doorwayWidth / 2) / 2, (8.48 + doorwayWidth / 2) / 2]) {
      mesh(new THREE.BoxGeometry(baseboardWidth, 0.24, 0.16), materials.trim, {
        position: [x, 0.18, z],
        castShadow: true,
        name: "dividing-wall-baseboard",
      });
    }
  }

  mesh(new THREE.BoxGeometry(17.2, 0.22, 0.72), materials.trim, {
    position: [0, 6.29, 0],
    castShadow: true,
    name: "dividing-wall-cornice",
  });
  mesh(new THREE.BoxGeometry(doorwayWidth - 0.12, 0.035, 0.5), materials.bench, {
    position: [0, 0.022, 0],
    receiveShadow: true,
    name: "doorway-threshold",
  });
}

const paintPalettes = [
  [0xc95f42, 0x304e68, 0xe1b552, 0xf2e3cc],
  [0x376b62, 0xcc8c3d, 0xa5443c, 0xe6ded0],
  [0x31384e, 0x9f3e50, 0xd6a648, 0xd8d4ca],
  [0x6d4767, 0x3b6b72, 0xd28b5d, 0xe9dfcc],
  [0x233f55, 0x9b7554, 0xc9c1a5, 0x923b35],
];

function makeArtwork(width, height, paletteIndex, name) { window.__bfTrace?.add(220);
  const palette = paintPalettes[paletteIndex % paintPalettes.length];
  const group = new THREE.Group();
  group.name = name;

  const frame = new THREE.Mesh(
    new THREE.BoxGeometry(width + 0.28, height + 0.28, 0.12),
    paletteIndex % 2 ? materials.brass : materials.darkTrim,
  );
  frame.castShadow = true;
  group.add(frame);

  const field = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.06),
    new THREE.MeshStandardMaterial({ color: palette[3], roughness: 0.76 }),
  );
  field.position.z = 0.09;
  group.add(field);

  const slabA = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.74, height * 0.22),
    new THREE.MeshStandardMaterial({ color: palette[0], roughness: 0.62 }),
  );
  slabA.position.set(-width * 0.06, height * 0.18, 0.126);
  slabA.rotation.z = -0.17 + paletteIndex * 0.03;
  group.add(slabA);

  const slabB = new THREE.Mesh(
    new THREE.PlaneGeometry(width * 0.28, height * 0.72),
    new THREE.MeshStandardMaterial({ color: palette[1], roughness: 0.58 }),
  );
  slabB.position.set(width * 0.2, -height * 0.04, 0.128);
  slabB.rotation.z = 0.11;
  group.add(slabB);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(Math.min(width, height) * 0.18, 32),
    new THREE.MeshStandardMaterial({ color: palette[2], roughness: 0.52 }),
  );
  disc.position.set(-width * 0.2, -height * 0.2, 0.131);
  group.add(disc);

  return group;
}

function addSideArtwork(side, z, y, width, height, paletteIndex, roomLabel) { window.__bfTrace?.add(265);
  const work = makeArtwork(width, height, paletteIndex, `${roomLabel}-side-artwork`);
  work.position.set(side * 8.49, y, z);
  work.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
  scene.add(work);
}

function addFarArtwork(x, y, width, height, paletteIndex) { window.__bfTrace?.add(272);
  const work = makeArtwork(width, height, paletteIndex, "far-room-artwork");
  work.position.set(x, y, -9.96);
  scene.add(work);
}

function addArtworkCollection() { window.__bfTrace?.add(278);
  addSideArtwork(-1, 6.45, 3.15, 2.2, 2.7, 0, "near-room");
  addSideArtwork(1, 5.4, 3.0, 2.65, 2.0, 1, "near-room");
  addSideArtwork(-1, 2.8, 3.1, 2.3, 2.25, 2, "near-room");
  addSideArtwork(1, 2.15, 3.12, 2.15, 2.7, 3, "near-room");

  addSideArtwork(-1, -2.6, 3.05, 2.6, 2.05, 4, "far-room");
  addSideArtwork(1, -3.1, 3.05, 2.2, 2.65, 0, "far-room");
  addSideArtwork(-1, -6.6, 3.12, 2.15, 2.7, 1, "far-room");
  addSideArtwork(1, -7.0, 3.08, 2.7, 2.0, 2, "far-room");

  addFarArtwork(-4.5, 3.22, 2.3, 2.8, 3);
  addFarArtwork(0, 3.18, 3.05, 2.25, 4);
  addFarArtwork(4.45, 3.22, 2.3, 2.8, 0);
}

function addBench() { window.__bfTrace?.add(294);
  mesh(new THREE.BoxGeometry(3.3, 0.42, 1.05), materials.bench, {
    position: [-4.0, 0.72, 5.0],
    castShadow: true,
    receiveShadow: true,
    name: "near-room-bench-seat",
  });
  for (const x of [-5.28, -2.72]) {
    for (const z of [4.66, 5.34]) {
      mesh(new THREE.BoxGeometry(0.18, 0.6, 0.18), materials.benchDark, {
        position: [x, 0.31, z],
        castShadow: true,
        name: "near-room-bench-leg",
      });
    }
  }
}

function addSculpture() { window.__bfTrace?.add(312);
  mesh(new THREE.BoxGeometry(1.3, 1.0, 1.3), materials.pedestal, {
    position: [2.95, 0.5, -4.7],
    castShadow: true,
    receiveShadow: true,
    name: "far-room-sculpture-pedestal",
  });
  mesh(new THREE.BoxGeometry(1.48, 0.12, 1.48), materials.trim, {
    position: [2.95, 1.04, -4.7],
    castShadow: true,
  });
  mesh(new THREE.TorusKnotGeometry(0.48, 0.14, 90, 14, 2, 3), materials.brass, {
    position: [2.95, 1.9, -4.7],
    rotation: [0.35, 0.2, -0.16],
    castShadow: true,
    name: "far-room-abstract-sculpture",
  });
}

function addMuseumLights() { window.__bfTrace?.add(331);
  scene.add(new THREE.HemisphereLight(0xfff7e8, 0x53606c, 0.95));
  const ambient = new THREE.AmbientLight(0xfff5e6, 0.28);
  scene.add(ambient);

  const lightRows = [
    { z: 5.8, intensity: 48 },
    { z: 1.8, intensity: 52 },
    { z: -2.4, intensity: 48 },
    { z: -6.7, intensity: 44 },
  ];
  for (const row of lightRows) {
    for (const x of [-5.2, 0, 5.2]) {
      const light = new THREE.PointLight(0xffe2b8, row.intensity, 10, 2);
      light.position.set(x, 5.85, row.z);
      light.castShadow = x === 0;
      light.shadow.mapSize.set(512, 512);
      light.shadow.bias = -0.001;
      scene.add(light);

      mesh(new THREE.CylinderGeometry(0.14, 0.2, 0.22, 16), materials.darkTrim, {
        position: [x, 6.27, row.z],
        castShadow: true,
        name: "ceiling-gallery-light",
      });
      mesh(new THREE.CylinderGeometry(0.17, 0.1, 0.25, 16), materials.darkTrim, {
        position: [x, 6.05, row.z],
        rotation: [0.18, 0, x > 0 ? -0.25 : 0.25],
        castShadow: true,
      });
    }
  }

  const archWash = new THREE.SpotLight(0xffe5be, 110, 16, Math.PI / 4, 0.7, 1.5);
  archWash.position.set(0, 5.9, 4.2);
  archWash.target.position.set(0, 3.1, 0);
  archWash.castShadow = true;
  archWash.shadow.mapSize.set(1024, 1024);
  scene.add(archWash, archWash.target);
}

addRoomShell();
addConventionalDoorway();
addArtworkCollection();
addBench();
addSculpture();
addMuseumLights();

const cameraPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(2.4, 2.48, 8.45),
  new THREE.Vector3(0.9, 2.62, 7.5),
  new THREE.Vector3(-1.45, 2.5, 6.4),
  new THREE.Vector3(-0.85, 2.56, 5.25),
], false, "catmullrom", 0.34);

const targetPath = new THREE.CatmullRomCurve3([
  new THREE.Vector3(-0.15, 2.76, -1.0),
  new THREE.Vector3(-0.5, 2.74, -1.75),
  new THREE.Vector3(0.1, 2.7, -2.5),
  new THREE.Vector3(0.15, 2.66, -3.3),
], false, "catmullrom", 0.36);

const cameraPosition = new THREE.Vector3();
const cameraTarget = new THREE.Vector3();
let currentTime = 0;
let playing = false;
let animationFrame = 0;
let playStartedAt = 0;
let playStartedTime = 0;

function clampTime(seconds) { window.__bfTrace?.add(401);
  if (!Number.isFinite(seconds)) return 0;
  return Math.max(0, Math.min(seconds, CAMERA_DURATION));
}

function renderAt(seconds) { window.__bfTrace?.add(406);
  currentTime = clampTime(seconds);
  const progress = currentTime / CAMERA_DURATION;
  cameraPath.getPointAt(progress, cameraPosition);
  targetPath.getPointAt(progress, cameraTarget);
  camera.position.copy(cameraPosition);
  camera.lookAt(cameraTarget);
  camera.updateMatrixWorld(true);
  renderer.render(scene, camera);
}

function tick(now) { window.__bfTrace?.add(417);
  if (!playing) return;
  const elapsed = (now - playStartedAt) / 1000;
  renderAt(playStartedTime + elapsed);
  if (currentTime >= CAMERA_DURATION) {
    playing = false;
    return;
  }
  animationFrame = requestAnimationFrame(tick);
}

function pause() { window.__bfTrace?.add(428);
  playing = false;
  if (animationFrame) cancelAnimationFrame(animationFrame);
  animationFrame = 0;
  renderAt(currentTime);
}

function seek(seconds) { window.__bfTrace?.add(435);
  pause();
  renderAt(seconds);
  return currentTime;
}

function play() { window.__bfTrace?.add(441);
  pause();
  playing = true;
  playStartedAt = performance.now();
  playStartedTime = currentTime >= CAMERA_DURATION ? 0 : currentTime;
  animationFrame = requestAnimationFrame(tick);
}

function getCameraState() { window.__bfTrace?.add(449);
  return {
    position: camera.position.toArray(),
    quaternion: camera.quaternion.toArray(),
    fov: camera.fov,
  };
}

window.reconstruction = { pause, seek, play, getCameraState };
renderAt(Number(new URLSearchParams(window.location.search).get("t")) || 0);
document.body.dataset.ready = "true";
