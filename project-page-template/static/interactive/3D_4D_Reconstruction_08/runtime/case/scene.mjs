import { cameraPose } from './camera-path.mjs';

export function buildScene(THREE, spec) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#628bd0');
  scene.fog = new THREE.Fog('#93abc4', 95, 230);
  scene.add(new THREE.Mesh(new THREE.SphereGeometry(290, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    vertexShader: 'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader: 'varying vec3 v;void main(){float h=max(0.,normalize(v).y);vec3 c=mix(vec3(.47,.65,.87),vec3(.17,.32,.65),pow(h,.4));gl_FragColor=vec4(c,1.);}',
  })));
  const camera = new THREE.PerspectiveCamera(47, 16 / 9, 0.08, 360);
  let seed = 713;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const mat = (color, roughness = .88, metalness = .08) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });
  function paintTexture(base, weather = 1, width = 1024, height = 1024) {
    const canvas = document.createElement('canvas');
    canvas.width = width; canvas.height = height;
    const c = canvas.getContext('2d');
    c.fillStyle = base; c.fillRect(0, 0, width, height);
    const rgb = [1, 3, 5].map(i => parseInt(base.slice(i, i + 2), 16));
    for (let k = 0; k < 2500; k++) {
      const x = rand() * width, y = rand() * height;
      const r = 1 + Math.pow(rand(), 3) * 45;
      const factor = .60 + rand() * .83;
      c.globalAlpha = (.03 + rand() * .085) * weather;
      c.fillStyle = `rgb(${rgb.map(v => Math.min(255, Math.round(v * factor + (factor > 1 ? 16 : 0)))).join(',')})`;
      c.beginPath();
      c.ellipse(x, y, r * (1 + rand() * .6), r, rand() * 3, 0, Math.PI * 2);
      c.fill();
    }
    for (let k = 0; k < 5200; k++) {
      c.globalAlpha = (.03 + rand() * .16) * weather;
      c.fillStyle = rand() < .6 ? '#aaa78b' : '#182c29';
      c.fillRect(rand() * width, rand() * height, .4 + rand() * 2.5, .5 + rand() * 2.4);
    }
    for (let k = 0; k < 35; k++) {
      const x = rand() * width, y = rand() * height;
      c.globalAlpha = .08 * weather; c.strokeStyle = '#543b29'; c.lineWidth = 1 + rand() * 2;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + 1, y + 8 + rand() * 32); c.stroke();
    }
    c.globalAlpha = 1;
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  }
  const painted = (color, weather = 1) => new THREE.MeshStandardMaterial({
    map: paintTexture(color, weather), roughness: .93, metalness: .12,
  });
  const green = painted('#527d6d', 1.15), greenLight = painted('#769181', 1.3);
  const greenDark = painted('#254d41', 1), roofGreen = painted('#3a5a48', 1.2);
  const orange = painted('#a65c3a', 1.05), orangeLight = mat('#b87550');
  const black = mat('#141b19'), iron = painted('#343932', 1.2);
  const rust = painted('#634636', 1.2), steel = mat('#858883', .6, .6);
  const shadow = mat('#0d1715'), pale = painted('#bfc2b8', .55);
  const glass = new THREE.MeshStandardMaterial({ color: '#25343a', roughness: .27, metalness: .48 });
  const batches = new Map();
  let localOffsetX = 0;
  function mesh(geometry, material, position, rotation = [0, 0, 0], scale = null, cast = true) {
    const item = new THREE.Mesh(geometry, material);
    item.position.set(position[0] + localOffsetX, position[1], position[2]); item.rotation.set(...rotation);
    if (scale) item.scale.set(...scale);
    item.castShadow = cast; item.receiveShadow = true;
    scene.add(item);
    return item;
  }
  const cube = new THREE.BoxGeometry(1, 1, 1);
  function box(material, x, y, z, w, h, d, rotation = [0, 0, 0], batched = true) {
    if (!batched) return mesh(cube, material, [x, y, z], rotation, [w, h, d]);
    if (!batches.has(material)) batches.set(material, []);
    const transform = new THREE.Object3D();
    transform.position.set(x + localOffsetX, y, z); transform.rotation.set(...rotation); transform.scale.set(w, h, d);
    transform.updateMatrix(); batches.get(material).push(transform.matrix.clone());
  }
  const cylinderCache = new Map();
  function cylinder(material, a, b, radius, segments = 12, r2 = radius) {
    const key = `${radius}/${r2}/${segments}`;
    if (!cylinderCache.has(key)) cylinderCache.set(key, new THREE.CylinderGeometry(r2, radius, 1, segments));
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b), delta = end.clone().sub(start);
    const item = mesh(cylinderCache.get(key), material, start.clone().add(end).multiplyScalar(.5).toArray());
    item.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
    item.scale.y = start.distanceTo(end);
    return item;
  }
  function tube(material, points, radius = .029) {
    const curve = new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p)), false, 'centripetal');
    return mesh(new THREE.TubeGeometry(curve, Math.max(12, points.length * 5), radius, 7, false), material, [0, 0, 0]);
  }
  function chamferHood(material, x0, x1, bottom, top, halfWidth, chamfer = .12) {
    const yz = [
      [-halfWidth, bottom], [halfWidth, bottom], [halfWidth, top - chamfer],
      [halfWidth - chamfer, top], [-halfWidth + chamfer, top], [-halfWidth, top - chamfer],
    ];
    const p = [];
    for (const x of [x0, x1]) for (const [z, y] of yz) p.push(x, y, z);
    const indices = [];
    for (let i = 1; i < 5; i++) {
      indices.push(0, i, i + 1, 6, 6 + i + 1, 6 + i);
    }
    for (let i = 0; i < 6; i++) {
      const n = (i + 1) % 6;
      indices.push(i, n + 6, n, i, i + 6, n + 6);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(p, 3));
    geo.setIndex(indices); geo.computeVertexNormals();
    return mesh(geo, material, [0, 0, 0]);
  }
  function decal(text, width, height, color, bg, x, y, z, facing = 'side', font = 'bold 160px Arial') {
    const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
    const ctx = c.getContext('2d');
    if (bg) { ctx.fillStyle = bg; ctx.fillRect(0, 0, c.width, c.height); }
    ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.font = font;
    ctx.save(); ctx.translate(512, 256); ctx.scale(920 / ctx.measureText(text).width, 2.25);
    ctx.fillText(text, 0, 0); ctx.restore();
    const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace;
    const material = new THREE.MeshStandardMaterial({
      map: texture, transparent: true, roughness: .95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
    });
    return mesh(new THREE.PlaneGeometry(width, height), material, [x, y, z],
      facing === 'front' ? [0, -Math.PI / 2, 0] : facing === 'backside' ? [0, Math.PI, 0] : [0, 0, 0], null, false);
  }
  function vent(x, y, z, width, height, slats = 9) {
    const side = Math.sign(z);
    box(shadow, x, y, z, width, height, .024);
    for (let i = 0; i <= slats; i++) {
      box(greenLight, x, y - height / 2 + i * height / slats, z + side * .02, width + .04, .033, .055);
    }
    box(green, x - width / 2 - .016, y, z + side * .03, .035, height + .055, .07);
    box(green, x + width / 2 + .016, y, z + side * .03, .035, height + .055, .07);
  }
  function wheel(x, z, material = iron, radius = .53) {
    const side = z < 0 ? -1 : 1;
    const y = radius + .267;
    cylinder(material, [x, y, z - .10], [x, y, z + .10], radius, 24);
    cylinder(steel, [x, y, z + side * .10], [x, y, z + side * .13], radius * .97, 24);
    cylinder(black, [x, y, z + side * .135], [x, y, z + side * .155], radius * .72, 24);
    cylinder(material, [x, y, z + side * .156], [x, y, z + side * .24], .19, 16);
    cylinder(iron, [x, y, z - side * .11], [x, y, z - side * .14], radius * 1.045, 32);
  }
  function truck(center, scale = 1, trackZ = 0) {
    const xs = [-1.06, 0, 1.06].map(d => center + d * scale);
    for (const x of xs) {
      for (const z of [-.93, .93]) wheel(x, z + trackZ, iron, .51 * scale);
      cylinder(iron, [x, .51 * scale + .267, trackZ - 1.12], [x, .51 * scale + .267, trackZ + 1.12], .11, 10);
    }
    for (const side of [-1, 1]) {
      const z = trackZ + side * 1.21;
      box(iron, center, .84, z, 3.03 * scale, .23, .22);
      box(iron, center, 1.11, z, 2.82 * scale, .17, .20);
      for (const x of xs) {
        box(iron, x, .68, z + side * .09, .40, .42, .22);
        cylinder(rust, [x, .66, z + side * .20], [x, .66, z + side * .24], .135, 12);
        for (const dx of [-.17, .17]) {
          for (const dy of [-.16, .16]) cylinder(steel, [x + dx, .70 + dy, z + side * .20], [x + dx, .70 + dy, z + side * .225], .024, 6);
        }
        tube(rust, [[x - .23, .45, z], [x - .27, .60, z], [x - .25, .91, z], [x, 1.10, z], [x + .25, .94, z]], .046);
      }
      for (const offset of [-.52, .52]) {
        cylinder(black, [center + offset, .7, z], [center + offset, 1.05, z], .11, 12);
        for (let i = 0; i < 7; i++) {
          const ring = mesh(new THREE.TorusGeometry(.125, .026, 5, 12), iron, [center + offset, .76 + i * .05, z]);
          ring.rotation.x = Math.PI / 2;
        }
      }
      cylinder(rust, [center - 1.25, .48, z + side * .19], [center + 1.25, .48, z + side * .19], .038, 8);
      for (const x of xs) {
        for (const dx of [-.40, .40]) {
          box(iron, x + dx, .59, z - side * .16, .10, .29, .17, [0, 0, dx * -.5]);
          cylinder(iron, [x + dx, .68, z - side * .16], [x + dx, 1.05, z - side * .16], .026, 8);
        }
      }
      cylinder(iron, [center - 1.1, .77, z - side * .23], [center + 1.1, .77, z - side * .23], .037, 8);
      cylinder(iron, [center -.37, 1.05, z - side * .3], [center + .37, 1.05, z - side * .3], .14, 16);
      box(iron, center, 1.25, trackZ + side * .99, 1.4, .22, .34);
    }
  }

  scene.add(new THREE.HemisphereLight('#d3e4fa', '#827967', 1.65));
  const sun = new THREE.DirectionalLight('#fff8ed', 2.45);
  sun.position.set(2, 13, 9); sun.target.position.set(-1, 0, 0);
  sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -32; sun.shadow.camera.right = 32;
  sun.shadow.camera.top = 28; sun.shadow.camera.bottom = -28;
  sun.shadow.camera.near = .5; sun.shadow.camera.far = 80; sun.shadow.bias = -.0003;
  sun.shadow.normalBias = .025;
  scene.add(sun, sun.target);

  const ballastMap = paintTexture('#7e8176', 1.4, 1024, 1024);
  ballastMap.wrapS = ballastMap.wrapT = THREE.RepeatWrapping; ballastMap.repeat.set(92, 52);
  const ballast = new THREE.MeshStandardMaterial({ map: ballastMap, roughness: 1 });
  ballastMap.repeat.set(320, 320);
  mesh(new THREE.PlaneGeometry(800, 800), ballast, [35, -.026, 0], [-Math.PI / 2, 0, 0], null, false);
  const roadMap = paintTexture('#7c7b70', .85, 1024, 1024);
  roadMap.wrapS = roadMap.wrapT = THREE.RepeatWrapping; roadMap.repeat.set(70, 4.72);
  const road = new THREE.MeshStandardMaterial({ map: roadMap, roughness: 1 });
  mesh(new THREE.PlaneGeometry(175, 11.8), road, [40, -.015, 8.4], [-Math.PI / 2, 0, 0], null, false);
  const ties = painted('#514a3d', 1);
  const railRust = mat('#655349', .8, .35);
  for (const trackZ of [0, -4.5]) {
    mesh(new THREE.PlaneGeometry(155, 3.5), ballast, [47, .073, trackZ], [-Math.PI / 2, 0, 0], null, false);
    for (let x = -28; x < 130; x += .76) {
      box(ties, x, .035, trackZ, .24, .16, 2.9);
      for (const z of [-.9, .9]) {
        box(iron, x, .13, trackZ + z, .30, .028, .33);
        for (const dz of [-.12, .12]) box(rust, x, .16, trackZ + z + dz, .05, .045, .055);
      }
    }
    for (const z of [3.6, 5.4]) {
      box(railRust, 68, .15, z, 100, .17, .075);
      box(steel, 68, .246, z, 100, .042, .13);
    }
    for (let x = 18; x < 118; x += .76) box(ties, x, .035, 4.5, .24, .16, 2.9);
    for (const z of [-.9, .9]) {
      box(railRust, 47, .15, trackZ + z, 155, .17, .075);
      box(steel, 47, .246, trackZ + z, 155, .042, .13);
      box(railRust, 47, .083, trackZ + z, 155, .036, .17);
    }
  }
  const stoneGeo = new THREE.IcosahedronGeometry(1, 0);
  const stoneMat = mat('#91948d', 1, 0);
  const stones = new THREE.InstancedMesh(stoneGeo, stoneMat, 39000);
  const transform = new THREE.Object3D(), color = new THREE.Color();
  for (let i = 0; i < stones.count; i++) {
    let x = -21 + rand() * 102, z = -8 + rand() * 13;
    if (z > 2.5 && rand() < .88) z = 2.5 + rand() * .6;
    const s = .008 + rand() * .028;
    const bed = Math.abs(z) < 1.75 || Math.abs(z + 4.5) < 1.75;
    transform.position.set(x, (bed ? .076 : -.012) + s * .35, z); transform.rotation.set(rand() * 3, rand() * 6, rand() * 3);
    transform.scale.set(s * 1.45, s * .58, s); transform.updateMatrix();
    stones.setMatrixAt(i, transform.matrix); color.setHSL(.12 + rand() * .05, .04 + rand() * .07, .21 + rand() * .28);
    stones.setColorAt(i, color);
  }
  stones.receiveShadow = true; scene.add(stones);

  box(black, -.1, 1.29, 0, 15.5, .29, 2.45);
  box(green, -.1, 1.56, 0, 15.5, .21, 2.93);
  for (const z of [-1.49, 1.49]) {
    box(greenLight, -.1, 1.55, z, 15.5, .31, .08);
    box(rust, -.1, 1.72, z, 15.5, .045, .085);
    for (let x = -7.4; x <= 7; x += .57) cylinder(iron, [x, 1.53, z], [x, 1.53, z + Math.sign(z) * .045], .022, 6);
  }
  truck(-4.60); truck(4.67);
  cylinder(iron, [-2.25, .94, 0], [2.9, .94, 0], .58, 24);
  box(iron, .1, 1.11, 0, 5.5, .56, 1.92);
  for (const x of [-1.9, 2.55]) {
    box(black, x, .76, 0, .13, .68, 1.94);
    box(iron, x, .80, 1.01, .15, .71, .07);
  }
  for (const z of [-1.05, 1.05]) {
    cylinder(iron, [-5.7, 1.26, z], [-3.4, 1.26, z], .18, 16);
    cylinder(iron, [3.7, 1.25, z], [5.9, 1.25, z], .14, 16);
  }
  for (const x of [-4.5, 4.6]) {
    box(rust, x, .46, 1.53, .73, .10, .62);
    for (let i = 0; i < 7; i++) box(iron, x - .31 + i * .10, .52, 1.53, .045, .032, .59);
    for (const dx of [-.3, .3]) cylinder(iron, [x + dx, .48, 1.52], [x + dx, 1.3, 1.40], .031, 8);
  }

  const noseHood = chamferHood(green, -7, -4.2, 2.7, 4.70, .80, .13);
  const noseVertices = noseHood.geometry.attributes.position;
  for (let i = 0; i < noseVertices.count; i++) {
    if (noseVertices.getY(i) > 4.5) {
      noseVertices.setY(i, noseVertices.getY(i) + .27 * (.8 - noseVertices.getZ(i)) / 1.6);
    }
  }
  noseHood.geometry.computeVertexNormals();
  box(greenDark, -5.65, 2.32, 0, 2.7, 1.25, 1.62);
  chamferHood(shadow, -4.15, -3.55, 1.70, 4.45, .86, .12);
  chamferHood(green, -3.55, -1.15, 1.70, 4.45, 1.24, .24);
  box(black, -2.37, 4.48, 0, 2.65, .14, 2.77);
  box(roofGreen, -2.37, 4.56, 0, 2.63, .08, 2.81);
  chamferHood(greenLight, -1.02, 6.75, 1.70, 3.85, .99, .17);
  chamferHood(green, 6.75, 7.25, 1.70, 3.48, .99, .08);
  for (const side of [-1, 1]) {
    const z = side * 1.252;
    localOffsetX = -.9;
    box(black, -1.26, 3.94, z, 1.85, .88, .055);
    box(glass, -1.63, 3.96, z + side * .035, .72, .70, .045);
    box(glass, -.73, 3.96, z + side * .035, .72, .70, .045);
    for (const x of [-2.21, -1.20, -.27]) box(greenDark, x, 3.95, z + side * .075, .092, .98, .095);
    box(greenDark, -1.28, 3.48, z + side * .10, 1.96, .11, .21);
    box(roofGreen, -1.28, 4.41, z + side * .25, 2.04, .08, .47, [side * .1, 0, 0]);
    box(green, -2.41, 2.91, side * 1.257, .18, 1.50, .045);
    decal('713', 1.86, .77, '#e3a260', null, -1.18, 2.99, side * 1.31, side === 1 ? 'side' : 'backside');
    localOffsetX = 0;
    for (let x = -6.72; x < -4.3; x += .80) {
      box(greenLight, x, 3.17, side * .813, .76, 2.36, .03);
      box(greenDark, x + .39, 3.28, side * .835, .019, 2.63, .018);
      for (const y of [2.35, 3.6, 4.20]) box(iron, x + .27, y, side * .856, .074, .075, .04);
      box(black, x - .18, 4.5, side * .831, .08, .12, .022);
    }
    for (let x = -6.56; x < -2.72; x += .91) {
      box(green, x, 2.07, side * 1.00, .86, .72, .22);
      vent(x + .03, 2.11, side * 1.122, .44, .46, 7);
      box(iron, x - .29, 2.33, side * 1.133, .05, .08, .035);
    }
    for (let x = .43; x < 6.7; x += .91) {
      box(green, x, 2.49, side * 1.005, .88, 1.48, .028);
      box(greenDark, x + .43, 2.73, side * 1.034, .021, 2.05, .02);
      for (const y of [1.9, 2.97]) box(iron, x + .31, y, side * 1.061, .071, .074, .055);
      box(black, x + .04, 1.53, side * 1.538, .35, .084, .025);
    }
    const facing = side === 1 ? 'side' : 'backside';
    decal('WESTERN', 4.56, .56, '#cf9868', null, 3.09, 3.04, side * 1.056, facing, 'bold 154px Arial');
    decal('PACIFIC', 3.86, .56, '#d3a174', null, 3.45, 2.52, side * 1.063, facing, 'bold 154px Arial');
    vent(.30, 2.77, side * 1.082, .36, 1.20, 17);
    vent(5.99, 2.55, side * 1.073, .39, 1.42, 20);
    vent(6.80, 2.62, side * 1.075, .38, .95, 15);
    vent(.27, 3.55, side * 1.075, .54, .42, 8);
    vent(6.29, 3.57, side * 1.02, .87, .31, 6);
    tube(orangeLight, [[-7.64, .35, side * 1.5], [-7.65, 1.62, side * 1.5], [-7.62, 2.69, side * 1.5], [-7.10, 3.94, side * 1.0], [-6.89, 4.02, side * 1.0], [-6.62, 3.96, side * 1.0]], .034);
    tube(iron, [[-6.62, 3.96, side * 1.0], [-5.9, 3.83, side * 1.0], [-3.8, 3.50, side * 1.1], [-2.78, 3.43, side * 1.28]], .028);
    for (const x of [-6.55, -5.50, -4.50]) cylinder(iron, [x, 1.76, side * 1.46], [x, 3.76 + (-6.55 - x) * .16, side * 1.07], .022, 8);
    for (const x of [6.3, 7.3]) cylinder(orange, [x, 1.75, side * 1.46], [x, 2.73, side * 1.46], .028, 8);
    cylinder(orange, [6.3, 2.73, side * 1.46], [7.40, 2.73, side * 1.46], .029, 8);
  }
  for (const x of [1.75, 3.35, 4.95]) {
    cylinder(roofGreen, [x, 3.77, 0], [x, 3.96, 0], .69, 28);
    cylinder(black, [x, 3.97, 0], [x, 4.00, 0], .60, 28);
    for (let i = -5; i <= 5; i++) {
      const z = i * .095, half = Math.sqrt(.34 - z * z);
      box(iron, x, 4.02, z, 2 * half, .022, .028);
    }
  }
  box(black, 1.35, 4.02, -.05, 1.1, .47, 1.05, [0, 0, -.13]);
  cylinder(black, [3.2, 3.88, -.14], [3.2, 4.28, -.14], .17, 12);
  const wear = [mat('#6f8068'), mat('#8b927c'), mat('#756c54')];
  for (const side of [-1, 1]) {
    for (let i = 0; i < 560; i++) {
      const x = -7.6 + rand() * 14.8;
      const y = 1.40 + rand() * .29;
      box(wear[i % 3], x, y, side * 1.536, .006 + rand() * .054, .004 + rand() * .021, .004);
    }
    for (let i = 0; i < 220; i++) {
      const x = -.65 + rand() * 7.6;
      const y = rand() < .7 ? 1.79 + rand() * .25 : 3.48 + rand() * .22;
      box(wear[i % 3], x, y, side * 1.049, .015 + rand() * .085, .012 + rand() * .065, .01);
    }
    for (let i = 0; i < 95; i++) {
      const x = -6.93 + rand() * 2.65, y = 2.73 + rand() * .16;
      box(wear[i % 3], x, y, side * .84, .012 + rand() * .072, .009 + rand() * .047, .01);
    }
  }

  box(greenDark, -7.03, 3.36, 0, .10, 2.53, 1.57);
  decal('713', 1.43, .40, '#d5dadd', '#17232a', -7.092, 4.23, 0, 'front', '190px Arial');
  decal('W', 1.1, .82, '#a95430', null, -7.102, 3.50, .08, 'front', 'bold 165px Arial');
  decal('P', 1.1, .85, '#b9663d', null, -7.102, 2.91, .08, 'front', 'bold 165px Arial');
  for (const [z, y, r] of [[-.59, 4.36, .14], [-.59, 4.02, .14], [.53, 4.51, .11]]) {
    cylinder(iron, [-7.08, y, z], [-7.17, y, z], r + .04, 18);
    cylinder(steel, [-7.173, y, z], [-7.19, y, z], r, 18);
    cylinder(mat('#b4b69e', .25, .4), [-7.195, y, z], [-7.20, y, z], r * .68, 18);
  }
  box(orange, -7.115, 2.10, 0, .04, .18, 1.59);
  box(orange, -7.135, 2.29, -.27, .04, .14, 1.13, [-.4, 0, 0]);
  localOffsetX = .4;
  box(greenDark, -8.03, .81, 0, .20, 1.37, 2.81);
  box(orange, -8.16, 1.40, 0, .12, .20, 2.95);
  box(iron, -8.23, 1.62, 0, .28, .12, 2.98);
  box(greenDark, -8.17, .47, 0, .17, .87, 2.75, [0, 0, -.13]);
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const x = -8.32 + i * .20, y = .27 + i * .28;
      box(orange, x, y, side * 1.35, .42, .074, .86);
      box(iron, x, y + .041, side * 1.35, .34, .016, .70);
    }
    box(greenDark, -7.50, .83, side * 1.78, .16, 1.27, .08, [0, 0, -.45]);
    tube(orange, [[-8.53, .54, side * 1.79], [-8.49, 1.50, side * 1.79], [-8.17, 2.72, side * 1.79], [-7.92, 2.81, side * 1.70]], .035);
  }
  box(rust, -8.65, 1.06, 0, 1.03, .34, .32);
  box(rust, -9.08, 1.07, .04, .41, .43, .55);
  box(shadow, -9.30, 1.11, .12, .027, .18, .24);
  box(rust, -9.20, 1.08, -.24, .35, .30, .12);
  tube(black, [[-8.28, 1.28, -.61], [-8.58, .76, -.67], [-8.75, .32, -.72], [-8.92, .18, -.81]], .055);
  tube(black, [[-8.31, 1.37, .66], [-8.60, .92, .81], [-8.32, .42, .87]], .053);
  box(rust, -7.95, 2.19, -.39, .28, .66, .28);
  cylinder(rust, [-8.11, 2.40, -.39], [-8.22, 2.40, -.39], .23, 16);
  cylinder(orange, [-8.1, 1.58, .39], [-8.1, 2.56, .39], .04, 10);
  tube(iron, [[-8.18, 2.75, -.94], [-8.10, 2.91, -.25], [-7.80, 2.98, .54], [-7.32, 2.98, .63]], .036);
  for (let i = 0; i < 21; i++) {
    const t = i / 20;
    const link = mesh(new THREE.TorusGeometry(.040, .011, 5, 10), iron, [-8.2, 2.66 - Math.sin(t * Math.PI) * .18, -1.25 + t * 1.07]);
    link.rotation.y = i % 2 * Math.PI / 2;
  }
  localOffsetX = 0;
  for (const y of [2.68, 3.30, 3.9]) {
    tube(iron, [[-7.07, y, -.70], [-7.20, y, -.92], [-7.20, y + .21, -.92], [-7.07, y + .21, -.70]], .026);
  }
  box(greenDark, 7.27, 2.43, 0, .06, 1.47, 1.93);
  box(green, 7.316, 2.41, 0, .035, 1.34, .68);
  box(iron, 7.35, 2.33, -.23, .035, .13, .065);
  box(orange, 7.36, 1.86, 0, .05, .14, 1.91);
  for (const side of [-1, 1]) {
    cylinder(iron, [7.31, 3.15, side * .66], [7.39, 3.15, side * .66], .115, 20);
    cylinder(steel, [7.395, 3.15, side * .66], [7.409, 3.15, side * .66], .087, 20);
    tube(orangeLight, [[7.66, .42, side * 1.51], [7.66, 1.62, side * 1.51], [7.6, 2.74, side * 1.45], [7.45, 2.76, side * .49]], .029);
    for (let i = 0; i < 4; i++) {
      box(iron, 7.63 - i * .11, .38 + i * .31, side * 1.36, .37, .065, .66);
      box(orange, 7.80 - i * .11, .38 + i * .31, side * 1.36, .03, .06, .67);
    }
    cylinder(iron, [7.4, 1.53, side * .55], [7.95, 1.05, side * .55], .041, 8);
  }
  box(iron, 7.72, 1.12, 0, .83, .27, .36);
  box(rust, 8.02, 1.12, 0, .27, .36, .49);
  tube(black, [[7.57, 1.4, -.42], [7.98, .61, -.49], [8.32, 1.22, -.42]], .045);
  tube(black, [[7.58, 1.38, .42], [7.92, .69, .55], [8.28, 1.20, .41]], .039);
  const rearNumber = decal('713', 1.07, .29, '#d5dadd', '#17232a', 7.32, 3.32, 0);
  rearNumber.rotation.y = Math.PI / 2;
  for (const side of [-1, 1]) {
    cylinder(orange, [6.2, 2.73, side * 1.46], [1.0, 2.73, side * 1.46], .021, 8);
    for (const x of [1.0, 2.7, 4.4]) cylinder(iron, [x, 1.72, side * 1.46], [x, 2.73, side * 1.46], .020, 8);
  }

  const secondBlack = painted('#202727', .6), yellow = mat('#a98e4b');
  box(secondBlack, 11.05, 1.69, 0, 6.9, .33, 2.76);
  for (const side of [-1, 1]) box(yellow, 11.05, 1.46, side * 1.39, 6.9, .13, .05);
  chamferHood(secondBlack, 8.15, 11.5, 1.83, 3.23, .89, .10);
  box(secondBlack, 12.30, 2.62, 0, 1.55, 2.06, 2.51);
  box(black, 12.3, 3.7, 0, 1.81, .11, 2.72);
  for (const z of [-1.265, 1.265]) {
    box(glass, 12.30, 3.27, z, .96, .55, .026);
    for (const x of [8, 9.2, 10.4, 11.5, 13.8]) cylinder(iron, [x, 1.84, z], [x, 2.71, z], .023, 8);
    cylinder(iron, [8, 2.71, z], [13.8, 2.71, z], .025, 8);
  }
  for (const x of [9.2, 12.3]) {
    for (const dx of [-.53, .53]) for (const z of [-.95, .95]) wheel(x + dx, z, iron, .42);
    for (const z of [-1.15, 1.15]) box(iron, x, .72, z, 2.02, .3, .22);
  }
  for (const end of [8.14, 11.53]) {
    box(secondBlack, end, 2.43, 0, .05, 1.14, 1.77);
    box(iron, end, 2.44, 0, .07, .81, .54);
  }
  cylinder(iron, [9.6, 3.2, 0], [9.6, 3.40, 0], .47, 24);
  cylinder(black, [10.7, 3.18, 0], [10.7, 3.58, 0], .12, 16);
  for (const side of [-1, 1]) {
    for (let x = 8.45; x < 11.25; x += .42) {
      box(iron, x, 2.43, side * .908, .38, 1.08, .025);
      for (let j = 0; j < 9; j++) box(black, x, 2.01 + j * .10, side * .926, .27, .038, .015);
    }
  }
  function passengerCar(start, length, z, body, greenWindows = false) {
    box(black, start + length / 2, .98, z, length, .28, 2.36);
    chamferHood(body, start, start + length, 1.08, 3.57, 1.25, .32).position.z = z;
    for (const side of [-1, 1]) {
      for (let x = start + 1.1; x < start + length - .8; x += 1.18) {
        box(iron, x, 2.67, z + side * 1.26, .97, .79, .03);
        box(greenWindows ? greenDark : glass, x, 2.67, z + side * 1.28, .86, .66, .03);
        box(pale, x, 1.65, z + side * 1.266, 1.13, .86, .018);
      }
      box(rust, start + length / 2, 3.36, z + side * 1.22, length, .08, .08);
    }
    for (const end of [start - .02, start + length + .02]) {
      box(black, end, 2.07, z, .05, 1.78, .74);
      box(iron, end, 1.11, z, .38, .10, 1.10);
      for (const s of [-1, 1]) cylinder(steel, [end, 1.17, z + s * .63], [end, 2.75, z + s * .63], .025, 8);
      box(iron, end, 1.0, z, .70, .18, .31);
      box(rust, end, 1.0, z, .83, .27, .39);
      box(iron, end, 2.0, z - .45, .15, 1.66, .11);
      box(iron, end, 2.0, z + .45, .15, 1.66, .11);
      for (let i = 0; i < 5; i++) box(black, end, 2.79, z, .08 + i * .023, .04, 1.0);
    }
    for (let x = start + 1.1; x < start + length - 1; x += 1.6) {
      box(iron, x, 3.575, z, .035, .02, 1.86);
    }
    for (const x of [start + 3, start + length - 3]) {
      box(iron, x, 3.62, z, .72, .09, .42);
      box(black, x, .78, z, 1.48, .50, .88);
    }
    for (const x of [start + 2.05, start + length - 2.05]) {
      for (const dx of [-.54, .54]) for (const side of [-1, 1]) wheel(x + dx, z + side * .98, iron, .40);
      for (const side of [-1, 1]) box(iron, x, .63, z + side * 1.17, 1.88, .28, .20);
    }
  }
  passengerCar(14.8, 12.8, 0, pale);
  passengerCar(28.3, 13.5, 0, painted('#a6a99e', .6));
  passengerCar(42.5, 13.5, 0, painted('#969d8f', .6));
  passengerCar(29.9, 13.3, 4.5, painted('#aeb0a2', .8), true);
  box(mat('#80443b'), 39.7, 3.57, 4.5, 6.0, .15, 2.07);

  const cone = mat('#dd3d12', .65, 0), coneBase = mat('#b33715');
  box(coneBase, 1.28, .095, 2.38, .49, .06, .48);
  cylinder(cone, [1.28, .13, 2.38], [1.28, .79, 2.38], .185, 22, .042);
  cylinder(shadow, [1.28, .793, 2.38], [1.28, .798, 2.38], .021, 12);

  const container = painted('#8ba7b6', .55);
  box(container, -12.8, 1.06, -7.3, 8, 2.15, 2.5);
  for (const z of [-6.01, -8.59]) {
    for (let x = -16.65; x < -8.9; x += .24) box(pale, x, 1.07, z, .045, 2.03, .052);
  }
  const timber = mat('#bc9153');
  for (const z of [-6, -8.6]) {
    cylinder(timber, [-16.8, 2.27, z], [-8.8, 2.27, z], .037, 6);
    for (let x = -16.8; x < -9.6; x += 1.3) {
      cylinder(timber, [x, 2.11, z], [x + 1.0, 2.63, z], .036, 6);
      cylinder(timber, [x, 2.63, z], [x + 1.0, 2.11, z], .036, 6);
    }
    box(container, -6.7, .80, -5.7, 4.0, 1.60, 1.9);
    for (const z of [-4.73, -6.67]) {
      for (let x = -8.6; x < -4.7; x += .21) box(pale, x, .8, z, .035, 1.51, .041);
      cylinder(timber, [-8.7, 1.72, z], [-4.7, 1.72, z], .029, 6);
      for (let x = -8.6; x < -5.3; x += .8) {
        cylinder(timber, [x, 1.63, z], [x + .7, 1.97, z], .026, 6);
        cylinder(timber, [x, 1.97, z], [x + .7, 1.63, z], .026, 6);
      }
    }
    cylinder(timber, [-16.8, 2.62, z], [-8.8, 2.62, z], .037, 6);
  }
  const concrete = painted('#999487', .7), edge = mat('#c0b7a0');
  box(concrete, 27, .23, -8.7, 42, .46, 3.5);
  box(edge, 27, .49, -6.97, 42, .075, .16);
  for (let x = 6; x < 48; x += 2.5) box(iron, x, .465, -8.7, .018, .012, 3.3);
  for (const x of [10, 25, 40]) {
    box(timber, x, .92, -8.8, 2.1, .11, .50);
    box(timber, x, 1.32, -9.03, 2.1, .63, .10);
    for (const dx of [-.76, .76]) box(iron, x + dx, .68, -8.8, .09, .40, .48);
    cylinder(iron, [x + 3, .48, -9.8], [x + 3, 5.5, -9.8], .075, 12);
    box(iron, x + 3, 5.56, -9.8, .71, .12, .32);
  }

  const white = painted('#d5d3c9', .25), tire = mat('#1c201f');
  const px = 20.5, pz = 7.45;
  box(black, px, .49, pz, 4.7, .24, 1.9);
  box(white, px, .94, pz, 4.95, .69, 1.95);
  box(white, px + .46, 1.61, pz, 1.95, .74, 1.84);
  box(white, px + .46, 2.02, pz, 2.0, .10, 1.98);
  box(glass, px + .44, 1.72, pz + .94, 1.56, .45, .03);
  box(glass, px - .54, 1.73, pz, .04, .43, 1.60);
  box(black, px - 1.51, 1.29, pz, 1.61, .045, 1.54);
  box(white, px - 2.46, 1.11, pz, .09, .49, 1.99);
  box(steel, px - 2.54, .68, pz, .14, .15, 2.09);
  box(black, px - 2.516, 1.15, pz, .02, .068, .31);
  box(mat('#b12d22'), px - 2.52, 1.05, pz + .84, .024, .30, .16);
  box(mat('#b12d22'), px - 2.52, 1.05, pz - .84, .024, .30, .16);
  for (const x of [px - 1.49, px + 1.46]) for (const z of [pz - .96, pz + .96]) {
    cylinder(tire, [x, .43, z - .11], [x, .43, z + .11], .44, 18);
    cylinder(steel, [x, .43, z + .115], [x, .43, z + .135], .24, 16);
  }
  box(iron, px + .22, 1.63, pz + 1.1, .25, .21, .21);
  const shed = painted('#673e32', .8);
  box(shed, 48, 3.5, 13.5, 11, 7, 6);
  for (let x = 42.5; x <= 53.5; x += .4) box(rust, x, 3.6, 10.46, .04, 6.8, .04);
  box(shed, -3, 3.8, 31, 16, 7.6, 8);
  const roof = mat('#696b62', .93, .18);
  for (const side of [-1, 1]) {
    box(roof, -3, 7.98, 31 + side * 2.12, 16.6, .14, 4.6, [side * .22, 0, 0]);
    for (let x = -10.8; x <= 4.8; x += .43) {
      box(rust, x, 3.83, 31 + side * 4.027, .041, 7.4, .045);
    }
    for (const x of [-7.5, 1.5]) {
      box(iron, x, 2.12, 31 + side * 4.055, 3.35, 4.21, .056);
      for (let y = .15; y < 4.2; y += .21) box(steel, x, y, 31 + side * 4.09, 3.24, .025, .014);
      box(glass, x, 5.40, 31 + side * 4.07, 2.55, .88, .033);
      for (const dx of [-.85, 0, .85]) box(iron, x + dx, 5.40, 31 + side * 4.10, .051, .96, .04);
    }
  }
  box(roof, 48, 7.15, 13.5, 11.5, .18, 6.4);
  box(iron, 46.6, 2.2, 10.43, 3.6, 4.4, .07);
  box(glass, 51.3, 4.5, 10.42, 1.4, 1.1, .04);
  for (let y = .2; y < 4.4; y += .22) box(steel, 46.6, y, 10.38, 3.5, .022, .016);

  const hillMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 });
  const hillGeo = new THREE.PlaneGeometry(270, 145, 100, 60);
  hillGeo.rotateX(-Math.PI / 2);
  const hp = hillGeo.attributes.position, hc = [];
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), z = hp.getZ(i) - 89;
    const ridge = 3.2 + 9 * Math.pow(.5 + .5 * Math.sin(x * .035 + .2), 2) + 2.7 * Math.sin(x * .12);
    const rise = Math.max(0, Math.min(1, (-z - 17) / 32));
    const y = -1 + ridge * rise + Math.sin(x * .065 + z * .08) * 2.8 * rise;
    hp.setXYZ(i, x + 10, y, z);
    color.setHSL(.22 + rand() * .045, .34 + rand() * .20, .064 + rand() * .045);
    hc.push(color.r, color.g, color.b);
  }
  hillGeo.setAttribute('color', new THREE.Float32BufferAttribute(hc, 3));
  hillGeo.computeVertexNormals(); mesh(hillGeo, hillMat, [0, 0, 0], [0, 0, 0], null, false);
  const distantHill = new THREE.PlaneGeometry(160, 290, 60, 90);
  distantHill.rotateX(-Math.PI / 2);
  const dp = distantHill.attributes.position, dc = [];
  for (let i = 0; i < dp.count; i++) {
    const x = dp.getX(i) + 132, z = dp.getZ(i);
    const rise = Math.min(1, Math.max(0, (x - 52) / 23));
    const y = -1 + rise * (12.5 + 4.8 * Math.sin(z * .042) + 2.3 * Math.sin(z * .095 + x * .039)) + (rand() - .5) * .28 * rise;
    dp.setXYZ(i, x, y, z);
    color.setHSL(.225 + rand() * .035, .35 + rand() * .19, .071 + rand() * .050);
    dc.push(color.r, color.g, color.b);
  }
  distantHill.setAttribute('color', new THREE.Float32BufferAttribute(dc, 3));
  distantHill.computeVertexNormals(); mesh(distantHill, hillMat, [0, 0, 0], [0, 0, 0], null, false);
  const leaves = mat('#8e9879', 1, 0), trunk = mat('#554b39');
  const foliage = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 1), leaves, 14800);
  for (let i = 0; i < foliage.count; i++) {
    const remote = i > 3300;
    const x = remote ? 55 + rand() * 100 : -55 + rand() * 200;
    const z = remote ? -90 + rand() * 210 : -18 - rand() * 78;
    const ridge = 3.2 + 9 * Math.pow(.5 + .5 * Math.sin((x - 10) * .035 + .2), 2) + 2.7 * Math.sin((x - 10) * .12);
    const rise = Math.max(0, Math.min(1, (-z - 17) / 32));
    const y = remote ? -1 + Math.min(1, Math.max(0, (x - 52) / 23)) * (12.5 + 4.8 * Math.sin(z * .042) + 2.3 * Math.sin(z * .095 + x * .039))
      : -1 + ridge * rise + Math.sin((x - 10) * .065 + z * .08) * 2.8 * rise;
    const r = .28 + rand() * 1.04;
    transform.position.set(x, y + .6 + r * .35, z); transform.rotation.set(rand() * 3, rand() * 6, 0);
    transform.scale.set(r, r * (.7 + rand() * .4), r); transform.updateMatrix();
    foliage.setMatrixAt(i, transform.matrix); color.setHSL(.21 + rand() * .055, .28 + rand() * .16, .16 + rand() * .12);
    foliage.setColorAt(i, color);
  }
  foliage.receiveShadow = true; scene.add(foliage);
  for (const [x, z, h] of [[-24,-29,5],[-15,-33,4.4],[2,-34,3.8],[19,-35,4.6]]) {
    cylinder(trunk, [x, 0, z], [x, h, z], .10, 8, .025);
    for (let i = 0; i < 23; i++) {
      const y = 1.3 + i / 23 * (h - 1.1), r = (1 - i / 29) * 1.7, a = i * 2.4;
      const ex = x + Math.cos(a) * r, ez = z + Math.sin(a) * r;
      cylinder(trunk, [x, y, z], [ex, y + .2, ez], .023, 6, .007);
      for (let k = 0; k < 4; k++) {
        const s = .35 + rand() * .22, t = .35 + k * .2;
        mesh(stoneGeo, leaves, [x + (ex - x) * t, y + .25 + rand() * .16, z + (ez - z) * t],
          [rand(), rand(), rand()], [s * 1.55, s * .55, s]);
      }
      const surround = new THREE.PlaneGeometry(390, 390, 90, 90);
      surround.rotateX(-Math.PI / 2);
      const sp = surround.attributes.position, sc = [];
      for (let i = 0; i < sp.count; i++) {
        const x = sp.getX(i), z = sp.getZ(i), r = Math.hypot(x, z);
        const rise = Math.max(0, Math.min(1, (r - 73) / 45));
        sp.setY(i, -2 + rise * (9 + Math.sin(x * .044 + z * .027) * 4 + Math.sin(z * .08) * 2));
        color.setHSL(.22 + rand() * .018, .30 + rand() * .08, .16 + rand() * .045);
        sc.push(color.r, color.g, color.b);
      }
      surround.setAttribute('color', new THREE.Float32BufferAttribute(sc, 3));
      surround.computeVertexNormals();
      mesh(surround, hillMat, [0, 0, 0], [0, 0, 0], null, false);
    }
  }
  for (const [material, matrices] of batches) {
    const instances = new THREE.InstancedMesh(cube, material, matrices.length);
    matrices.forEach((matrix, i) => instances.setMatrixAt(i, matrix));
    instances.castShadow = true; instances.receiveShadow = true; scene.add(instances);
  }
  const sharedMeshes = new Map();
  for (const item of [...scene.children]) {
    if (!item.isMesh || item.isInstancedMesh) continue;
    const key = `${item.geometry.uuid}/${item.material.uuid}/${item.castShadow}`;
    if (!sharedMeshes.has(key)) sharedMeshes.set(key, []);
    sharedMeshes.get(key).push(item);
  }
  for (const items of sharedMeshes.values()) {
    if (items.length < 2) continue;
    const merged = new THREE.InstancedMesh(items[0].geometry, items[0].material, items.length);
    merged.castShadow = items[0].castShadow; merged.receiveShadow = true;
    items.forEach((item, i) => { item.updateMatrix(); merged.setMatrixAt(i, item.matrix); scene.remove(item); });
    scene.add(merged);
  }
  function setTime(time) {
    const pose = cameraPose(time);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.fov = pose.fov; camera.updateProjectionMatrix();
  }
  setTime(0);
  return { scene, camera, setTime };
}
