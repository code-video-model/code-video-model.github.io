import * as THREE from '../vendor/three.module.js';
import { surfaceTexture, paintingTexture, softShadowTexture } from './textures.js';

const WIDTH = 960, HEIGHT = 540, DURATION = 124 / 24;
const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
renderer.setSize(WIDTH, HEIGHT);
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#c4bcae');
const sharedRoot = new THREE.Group();
sharedRoot.name = 'sharedGallery';
scene.add(sharedRoot);
const partitionRoot = new THREE.Group();
partitionRoot.name = 'partitionRoot';
scene.add(partitionRoot);
const camera = new THREE.PerspectiveCamera(40, WIDTH / HEIGHT, .08, 100);
camera.name = 'sharedCamera';
const plasterMap = surfaceTexture('plaster', 131);
const concreteMap = surfaceTexture('concrete', 901);
const woodMap = surfaceTexture('wood', 220);
const plaster = new THREE.MeshStandardMaterial({ color: '#dedad2', map: plasterMap, roughness: .94, bumpMap: plasterMap, bumpScale: .003 });
plaster.name = 'warm pale plaster';
plaster.onBeforeCompile = shader => {
  shader.vertexShader = 'varying vec3 plasterWorldPoint;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nplasterWorldPoint = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  shader.fragmentShader = 'varying vec3 plasterWorldPoint;\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
    float softCeilingFalloff = 1.0 - .30 * smoothstep(2.9, 5.3, plasterWorldPoint.y);
    float softFloorFalloff = .92 + .08 * smoothstep(0.0, 1.8, plasterWorldPoint.y);
    outgoingLight *= softCeilingFalloff * softFloorFalloff;
    #include <opaque_fragment>
  `);
};
plaster.userData.shaderDefinition = 'Shared soft indirect illumination: 30 percent ceiling falloff from y=2.9 to 5.3; 8 percent floor falloff below y=1.8.';
const ceilingMat = new THREE.MeshStandardMaterial({ color: '#c4c1b9', map: plasterMap, roughness: 1 });
ceilingMat.onBeforeCompile = shader => {
  shader.vertexShader = 'varying vec3 ceilingWorldPoint;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nceilingWorldPoint = (modelMatrix * vec4(transformed, 1.0)).xyz;');
  shader.fragmentShader = 'varying vec3 ceilingWorldPoint;\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
    outgoingLight *= .87 + .13 * smoothstep(-20.0, -1.0, ceilingWorldPoint.z);
    #include <opaque_fragment>
  `);
};
ceilingMat.userData.shaderDefinition = 'Shared subtle rear-to-front ceiling bounce gradient and procedural plaster grain.';
const skirtingMat = new THREE.MeshStandardMaterial({ color: '#b5b2a9', roughness: .64 });
const trackMat = new THREE.MeshStandardMaterial({ color: '#e1dfd6', roughness: .65, metalness: .18 });
const bronze = new THREE.MeshStandardMaterial({ color: '#574733', roughness: .5, metalness: .52 });
const darkWood = new THREE.MeshStandardMaterial({ color: '#d5c3ac', map: woodMap, roughness: .32 });
const floorMaterial = new THREE.MeshStandardMaterial({ color: '#b8b5af', map: concreteMap, bumpMap: concreteMap, bumpScale: .023, roughness: .42, metalness: .04 });
floorMaterial.name = 'softly reflective gray brown concrete';
const frameShadowMaterial = new THREE.MeshBasicMaterial({ map: softShadowTexture('frame'), transparent: true, opacity: .30, depthWrite: false });
const benchShadowMaterial = new THREE.MeshBasicMaterial({ map: softShadowTexture('bench'), transparent: true, opacity: .23, depthWrite: false });

function mesh(name, geometry, material, parent = sharedRoot) {
  const object = new THREE.Mesh(geometry, material);
  object.name = name;
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

function box(name, dimensions, position, material, parent = sharedRoot) {
  const object = mesh(name, new THREE.BoxGeometry(...dimensions), material, parent);
  object.position.set(...position);
  return object;
}

const floor = mesh('continuous concrete floor', new THREE.PlaneGeometry(40, 54), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.position.set(0, -.015, -11);
floor.castShadow = false;
box('rear gallery ceiling', [36, .15, 25], [0, 5.92, -12.5], ceilingMat);
box('front gallery ceiling', [24, .15, 10], [0, 5.16, 5], ceilingMat);
box('rear display wall', [24, 6, .25], [0, 2.95, -22.5], plaster);
box('rear skirting', [24, .105, .05], [0, .045, -22.345], skirtingMat);
box('rear left side wall', [.18, 6, 22.3], [-12, 2.95, -11.2], plaster);
box('rear right side wall', [.18, 6, 22.3], [12, 2.95, -11.2], plaster);

function frontWall(side) {
  const group = new THREE.Group();
  group.name = side < 0 ? 'front left exhibit wall' : 'front right exhibit wall';
  group.position.set(side * 3.04, 0, side < 0 ? -.65 : -.15);
  group.rotation.y = -side * (side < 0 ? .43 : .47);
  sharedRoot.add(group);
  box(`${group.name} plaster`, [6.9, 6, .20], [side * 3.45, 2.95, -.1], plaster, group);
  box(`${group.name} skirting`, [6.9, .105, .045], [side * 3.45, .045, .028], skirtingMat, group);
  return group;
}
const leftWall = frontWall(-1), rightWall = frontWall(1);

function painting(name, width, height, kind, seed, position, parent = sharedRoot) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  parent.add(group);
  const contact = mesh(`${name} soft wall contact`, new THREE.PlaneGeometry(width * 1.22, height * 1.20), frameShadowMaterial, group);
  contact.position.set(.025, -.05, -.059);
  contact.castShadow = false;
  const canvasMat = new THREE.MeshStandardMaterial({ map: paintingTexture(kind, seed), roughness: .93, color: '#ffffff' });
  canvasMat.name = `${name} original procedural paint`;
  box(`${name} backing`, [width, height, .056], [0, 0, 0], new THREE.MeshStandardMaterial({ color: '#6e6250', roughness: .8 }), group);
  const surface = mesh(`${name} painted canvas`, new THREE.PlaneGeometry(width - .025, height - .025), canvasMat, group);
  surface.position.z = .030;
  for (const [suffix, size, p] of [
    ['left frame', [.017, height + .026, .07], [-width / 2, 0, .018]],
    ['right frame', [.017, height + .026, .07], [width / 2, 0, .018]],
    ['top frame', [width + .017, .017, .07], [0, height / 2, .018]],
    ['bottom frame', [width + .017, .017, .07], [0, -height / 2, .018]]
  ]) box(`${name} ${suffix}`, size, p, bronze, group);
  const labelMat = new THREE.MeshStandardMaterial({ color: '#dedacf', roughness: .95 });
  const label = box(`${name} wall label`, [.125, .073, .009], [width / 2 + .14, -.39 * height, -.012], labelMat, group);
  const ink = new THREE.MeshStandardMaterial({ color: '#8c897e', roughness: 1 });
  box(`${name} label title`, [.069, .004, .001], [-.011, .013, .005], ink, label);
  box(`${name} label detail`, [.088, .002, .001], [0, .001, .005], ink, label);
  return group;
}
painting('front left cream charcoal painting', 1.20, 2.20, 'mixed', 611, [-1.35, 2.19, .065], leftWall);
painting('front right yellow geometric painting', 1.18, 2.18, 'geometric', 612, [1.04, 2.11, .065], rightWall);
painting('rear central wide abstract painting', 3.85, 2.83, 'wide', 613, [-.35, 2.55, -22.30]);
painting('rear left narrow painting', 1.06, 2.57, 'narrow', 614, [-5.93, 2.66, -22.30]);
painting('rear right narrow painting', 1.06, 2.60, 'narrow', 615, [5.74, 2.57, -22.30]);

const bench = new THREE.Group();
bench.name = 'centered dark wooden bench';
bench.position.set(-.28, 0, -13.70);
sharedRoot.add(bench);
const benchContact = mesh('bench soft floor contact', new THREE.PlaneGeometry(3.8, 1.6), benchShadowMaterial, bench);
benchContact.rotation.x = -Math.PI / 2;
benchContact.position.y = -.005;
benchContact.castShadow = false;
box('bench solid seat', [2.70, .11, .68], [0, .80, 0], darkWood, bench);
box('bench front apron', [2.51, .13, .045], [0, .698, .25], darkWood, bench);
box('bench rear apron', [2.51, .13, .045], [0, .698, -.25], darkWood, bench);
const profile = [[.028, 0], [.037, .055], [.030, .10], [.046, .16], [.037, .25], [.032, .31], [.055, .38], [.044, .46], [.047, .57], [.061, .65], [.057, .73]];
for (const [i, x, z] of [[0, -1.22, .24], [1, 0, .24], [2, 1.22, .24], [3, -1.22, -.24], [4, 1.22, -.24]]) {
  const leg = mesh(`bench turned leg ${i}`, new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), 16), darkWood, bench);
  leg.position.set(x, .012, z);
}
const outletMat = new THREE.MeshStandardMaterial({ color: '#c5c1b5', roughness: .8 });
const outlet = box('right wall low electrical outlet', [.11, .19, .018], [1.58, .35, .025], outletMat, rightWall);
for (const x of [-.018, .018]) {
  for (const y of [-.035, .035]) box('outlet socket slot', [.008, .025, .002], [x, y, .011], bronze, outlet);
}

const archState = new THREE.Group(), rectangularState = new THREE.Group();
archState.name = '601 broad rounded arch';
rectangularState.name = '681 full height rectangular doorway partition';
partitionRoot.add(archState, rectangularState);
const wallHalfWidth = 3.04, wallHeight = 5.9, archRadius = 2.54, spring = 2.35, thickness = .78;
const archShape = new THREE.Shape();
archShape.moveTo(-wallHalfWidth, 0);
archShape.lineTo(-archRadius, 0);
archShape.lineTo(-archRadius, spring);
archShape.absarc(0, spring, archRadius, Math.PI, 0, true);
archShape.lineTo(archRadius, 0);
archShape.lineTo(wallHalfWidth, 0);
archShape.lineTo(wallHalfWidth, wallHeight);
archShape.lineTo(-wallHalfWidth, wallHeight);
archShape.closePath();
const arch = mesh('solid plaster arch and reveal', new THREE.ExtrudeGeometry(archShape, { depth: thickness, bevelEnabled: false, curveSegments: 96 }), plaster, archState);
arch.position.z = -thickness;
const doorHalf = 1.34, doorHeight = 3.75;
for (const side of [-1, 1]) {
  box(`rectangular partition ${side < 0 ? 'left' : 'right'} pier`, [wallHalfWidth - doorHalf, wallHeight, thickness], [side * (wallHalfWidth + doorHalf) / 2, wallHeight / 2, -thickness / 2], plaster, rectangularState);
  box(`doorway narrow jamb trim ${side}`, [.038, doorHeight + .03, .032], [side * (doorHalf + .024), (doorHeight + .03) / 2, .016], skirtingMat, rectangularState);
}
box('rectangular partition full height lintel', [doorHalf * 2, wallHeight - doorHeight, thickness], [0, (doorHeight + wallHeight) / 2, -thickness / 2], plaster, rectangularState);
box('doorway narrow horizontal trim', [doorHalf * 2 + .086, .038, .032], [0, doorHeight + .024, .016], skirtingMat, rectangularState);
for (const [group, opening] of [[archState, archRadius], [rectangularState, doorHalf]]) {
  for (const side of [-1, 1]) {
    box(`${group.name} baseboard ${side}`, [wallHalfWidth - opening, .080, .020], [side * (wallHalfWidth + opening) / 2, .04, .011], skirtingMat, group);
  }
}

const hemi = new THREE.HemisphereLight('#fff9f1', '#8a877f', 1.35);
hemi.name = 'soft shared room fill';
sharedRoot.add(hemi);
const ambient = new THREE.AmbientLight('#eeece5', .80);
ambient.name = 'shared indirect ambient';
sharedRoot.add(ambient);
const key = new THREE.DirectionalLight('#fff9ef', .55);
key.name = 'soft entrance daylight';
key.position.set(-3, 4.8, 6);
key.target.position.set(0, 1.5, -8);
key.castShadow = false;
key.shadow.mapSize.set(2048, 2048);
Object.assign(key.shadow.camera, { left: -14, right: 14, top: 15, bottom: -16, near: .1, far: 48 });
key.shadow.bias = -.0003;
key.shadow.normalBias = .025;
key.shadow.radius = 5;
sharedRoot.add(key, key.target);

function trackLine(name, from, to) {
  const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to);
  const rail = box(name, [.038, .040, a.distanceTo(b)], a.clone().add(b).multiplyScalar(.5).toArray(), trackMat);
  rail.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), b.sub(a).normalize());
}

function trackLamp(name, position, target, power = 50, cone = .52) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(...position);
  sharedRoot.add(group);
  box(`${name} mounting stem`, [.030, .19, .030], [0, -.07, 0], trackMat, group);
  const head = new THREE.Group();
  head.name = `${name} angled cylinder`;
  head.position.y = -.21;
  const direction = new THREE.Vector3(...target).sub(new THREE.Vector3(...position)).normalize();
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), direction);
  group.add(head);
  mesh(`${name} housing`, new THREE.CylinderGeometry(.080, .078, .22, 20), trackMat, head);
  const diffuser = mesh(`${name} luminous lens`, new THREE.CircleGeometry(.064, 24), new THREE.MeshStandardMaterial({ color: '#fff9e8', emissive: '#fff3d2', emissiveIntensity: 1.5, roughness: .6 }), head);
  diffuser.rotation.x = Math.PI / 2;
  diffuser.position.y = -.112;
  const light = new THREE.SpotLight('#fff5e6', power, 35, cone, 1, 2);
  light.name = `${name} soft painting illumination`;
  light.position.copy(group.position).addScaledVector(direction, .25);
  light.target.position.set(...target);
  sharedRoot.add(light, light.target);
}
trackLine('front left ceiling rail', [-4.5, 5.07, .8], [-1.3, 5.07, -.15]);
trackLine('front right ceiling rail', [4.5, 5.07, .8], [1.3, 5.07, -.15]);
for (const side of [-1, 1]) {
  trackLamp(`front ${side} outer track head`, [side * 3.6, 5.02, .53], [side * 4.2, 2.2, .0], .5, .85);
  trackLamp(`front ${side} inner track head`, [side * (side < 0 ? 2.35 : 3.08), 5.02, .30], [side * 3.9, 2.2, 1.6], .3, .95);
  const wash = new THREE.SpotLight('#fff7eb', 18, 15, .70, 1, 2);
  wash.name = `front ${side} soft bounced exhibit wash`;
  wash.position.set(side * 3.8, 3.9, 3.0);
  wash.target.position.set(side * 4.15, 2.35, .0);
  sharedRoot.add(wash, wash.target);
}
trackLine('rear display transverse track', [-10, 5.57, -18.4], [10, 5.57, -18.4]);
trackLine('rear ceiling center longitudinal track', [.40, 5.59, -7], [.40, 5.59, -22]);
for (const [i, x] of [[0, -6.1], [1, -.35], [2, 5.95]]) {
  trackLamp(`rear artwork ${i} track head`, [x, 5.5, -18.4], [x, 2.5, -22.3], i === 1 ? 50 : 35, .70);
}
for (const [i, z] of [[0, -8.2], [1, -12.2], [2, -16]]) {
  trackLamp(`rear central rail lamp ${i}`, [.4, 5.53, z], [.4, 1, z - 3.5], 20, .60);
}

const reflectionTarget = new THREE.WebGLRenderTarget(480, 270, { type: THREE.HalfFloatType });
reflectionTarget.texture.name = 'shared procedural floor reflection render target';
const reflectedCamera = new THREE.PerspectiveCamera();
const reflectionMatrix = new THREE.Matrix4();
const bias = new THREE.Matrix4().set(.5, 0, 0, .5, 0, .5, 0, .5, 0, 0, .5, .5, 0, 0, 0, 1);
floorMaterial.onBeforeCompile = shader => {
  shader.uniforms.floorReflection = { value: reflectionTarget.texture };
  shader.uniforms.floorReflectionMatrix = { value: reflectionMatrix };
  shader.vertexShader = 'uniform mat4 floorReflectionMatrix; varying vec4 floorReflectionCoord;\n' + shader.vertexShader;
  shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nfloorReflectionCoord = floorReflectionMatrix * modelMatrix * vec4(transformed, 1.0);');
  shader.fragmentShader = 'uniform sampler2D floorReflection; varying vec4 floorReflectionCoord;\n' + shader.fragmentShader;
  shader.fragmentShader = shader.fragmentShader.replace('#include <opaque_fragment>', `
    vec2 reflectionUV = floorReflectionCoord.xy / floorReflectionCoord.w;
    vec3 reflectionColor = vec3(0.0);
    float reflectionWeight = 0.0;
    for (int rx = -2; rx <= 2; rx++) {
      for (int ry = -2; ry <= 2; ry++) {
        float weight = exp(-.7 * float(rx * rx + ry * ry));
        reflectionColor += texture2D(floorReflection, reflectionUV + vec2(float(rx) * .005, float(ry) * .009)).rgb * weight;
        reflectionWeight += weight;
      }
    }
    float floorFresnel = .065 + .065 * pow(1.0 - abs(dot(normalize(vViewPosition), normal)), 3.0);
    outgoingLight = mix(outgoingLight, reflectionColor / reflectionWeight, floorFresnel);
    #include <opaque_fragment>
  `);
};
floorMaterial.userData.shaderDefinition = 'Deterministic mirrored scene, 5x5 Gaussian reflection kernel; Schlick-style muted concrete reflection.';

let variant = '601', time = 0;
const lookTarget = new THREE.Vector3();
const orbitPivot = new THREE.Vector3(0, 2.45, 0);

function cameraProgress(t) {
  const hold = 0, acceleration = .80, deceleration = .80;
  const duration = 123 / 24 - hold;
  const elapsed = THREE.MathUtils.clamp(t - hold, 0, duration);
  const integral = s => s * s * s - .5 * s * s * s * s;
  let distance;
  if (elapsed < acceleration) {
    distance = acceleration * integral(elapsed / acceleration);
  } else {
    distance = elapsed - acceleration / 2;
    if (elapsed > duration - deceleration) {
      distance -= deceleration * integral((elapsed - duration + deceleration) / deceleration);
    }
  }
  return distance / (duration - (acceleration + deceleration) / 2);
}

function updateCamera(t) {
  const glide = cameraProgress(t);
  const angle = THREE.MathUtils.degToRad(75 - 150 * glide);
  const radius = 5.6 + .45 * glide + .30 * Math.sin(Math.PI * glide);
  camera.position.set(
    orbitPivot.x + radius * Math.sin(angle),
    1.20 + 2.35 * glide * glide * (3 - 2 * glide),
    orbitPivot.z + radius * Math.cos(angle)
  );
  lookTarget.set(orbitPivot.x, 2.40, -1.1 - 1.2 * Math.pow(2 * glide - 1, 2));
  camera.fov = 48 + 17 * Math.sin(Math.PI * glide) ** 2;
  camera.lookAt(lookTarget);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld(true);
}

function render() {
  reflectedCamera.copy(camera);
  reflectedCamera.position.y = -camera.position.y - .03;
  reflectedCamera.up.set(0, -1, 0);
  reflectedCamera.lookAt(lookTarget.x, -lookTarget.y - .03, lookTarget.z);
  reflectedCamera.updateMatrixWorld(true);
  reflectionMatrix.copy(bias).multiply(reflectedCamera.projectionMatrix).multiply(reflectedCamera.matrixWorldInverse);
  floor.visible = false;
  renderer.setRenderTarget(reflectionTarget);
  renderer.render(scene, reflectedCamera);
  floor.visible = true;
  renderer.setRenderTarget(null);
  renderer.render(scene, camera);
}

function seek(seconds) {
  if (!Number.isFinite(seconds)) throw new TypeError('seek requires a finite time');
  time = THREE.MathUtils.clamp(seconds, 0, DURATION);
  updateCamera(time);
  scene.updateMatrixWorld(true);
  render();
}

function setVariant(id) {
  if (id !== '601' && id !== '681') throw new RangeError(`Unknown gallery variant: ${id}`);
  variant = id;
  archState.visible = id === '601';
  rectangularState.visible = id === '681';
  seek(time);
}

function getCameraState() {
  return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov };
}

function serializeNode(object, definitions) {
  const state = {
    name: object.name, type: object.type, position: object.position.toArray(),
    quaternion: object.quaternion.toArray(), scale: object.scale.toArray(),
    visible: object.visible, castShadow: object.castShadow, receiveShadow: object.receiveShadow
  };
  if (object.geometry) {
    state.geometry = object.geometry.uuid;
    definitions.geometries[object.geometry.uuid] = object.geometry.toJSON();
  }
  if (object.material) {
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    state.materials = materials.map(material => {
      if (definitions.materials[material.uuid]) return material.uuid;
      const json = material.toJSON();
      delete json.images;
      delete json.textures;
      if (material.onBeforeCompile !== THREE.Material.prototype.onBeforeCompile) {
        json.proceduralShader = material.onBeforeCompile.toString();
      }
      definitions.materials[material.uuid] = json;
      for (const value of Object.values(material)) {
        if (value?.isTexture) {
          definitions.textures[value.uuid] = {
            name: value.name, colorSpace: value.colorSpace, wrapS: value.wrapS, wrapT: value.wrapT,
            repeat: value.repeat.toArray(), offset: value.offset.toArray(), rotation: value.rotation,
            minFilter: value.minFilter, magFilter: value.magFilter, anisotropy: value.anisotropy, userData: value.userData
          };
        }
      }
      return material.uuid;
    });
  }
  if (object.isLight) {
    state.light = {
      color: object.color.toArray(), intensity: object.intensity,
      distance: object.distance ?? null, decay: object.decay ?? null,
      angle: object.angle ?? null, penumbra: object.penumbra ?? null,
      groundColor: object.groundColor?.toArray() ?? null,
      target: object.target?.position.toArray() ?? null,
      shadow: object.shadow ? {
        bias: object.shadow.bias, normalBias: object.shadow.normalBias,
        radius: object.shadow.radius, mapSize: object.shadow.mapSize.toArray(),
        camera: object.shadow.camera.toJSON().object
      } : null
    };
  }
  state.children = object.children.map(child => serializeNode(child, definitions));
  return state;
}

function serializedTree(root) {
  const definitions = { geometries: {}, materials: {}, textures: {} };
  const hierarchy = serializeNode(root, definitions);
  return { hierarchy, ...definitions };
}

window.reconstruction = {
  pause() {},
  seek,
  setVariant,
  getCameraState,
  getInvariantState() {
    return {
      time, camera: getCameraState(), cameraProjection: {
        aspect: camera.aspect, near: camera.near, far: camera.far, zoom: camera.zoom,
        filmGauge: camera.filmGauge, filmOffset: camera.filmOffset, focus: camera.focus,
        up: camera.up.toArray(), scale: camera.scale.toArray(), view: camera.view
      },
      renderer: { width: WIDTH, height: HEIGHT, toneMapping: renderer.toneMapping, exposure: renderer.toneMappingExposure, outputColorSpace: renderer.outputColorSpace },
      floorReflection: {
        width: reflectionTarget.width, height: reflectionTarget.height,
        type: reflectionTarget.texture.type, colorSpace: reflectionTarget.texture.colorSpace,
        minFilter: reflectionTarget.texture.minFilter, magFilter: reflectionTarget.texture.magFilter,
        matrix: reflectionMatrix.toArray()
      },
      background: scene.background.toArray(), shared: serializedTree(sharedRoot)
    };
  },
  getEditedObjectState() {
    return { variant, allowedSubtree: 'partitionRoot', partition: serializedTree(partitionRoot) };
  }
};
setVariant('601');
