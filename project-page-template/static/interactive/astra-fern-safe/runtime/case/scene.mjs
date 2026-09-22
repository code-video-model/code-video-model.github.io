import { cameraPose } from './camera-path.mjs';

export function buildScene(THREE, spec) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#d9dcd6');
  const camera = new THREE.PerspectiveCamera(44, spec.target.width / spec.target.height, 0.035, 150);
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  let seed = 29617;
  const rand = () => ((seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296);
  const material = (color, roughness = 0.65, extra = {}) =>
    new THREE.MeshStandardMaterial({ color, roughness, ...extra });
  function mesh(geometry, mat, position = [0, 0, 0], parent = scene) {
    const m = new THREE.Mesh(geometry, mat);
    m.position.set(...position);
    m.castShadow = true;
    m.receiveShadow = true;
    parent.add(m);
    return m;
  }
  function box(w, h, d, mat, x, y, z, parent = scene) {
    const geometry = new THREE.BoxGeometry(w, h, d);
    if (mat === white || mat === whiteTop) {
      const uv = geometry.attributes.uv;
      for (let i = 0; i < uv.count; i++) {
        const face = Math.floor(i / 4);
        uv.setXY(i, uv.getX(i) * (face < 2 ? d : w), uv.getY(i) * (face < 2 || face > 3 ? h : d));
      }
    }
    return mesh(geometry, mat, [x, y, z], parent);
  }
  function tube(points, radius, mat, parent = scene) {
    const curve = new THREE.CatmullRomCurve3(points);
    return mesh(new THREE.TubeGeometry(curve, Math.max(12, points.length * 7), radius, 5, false), mat, [0, 0, 0], parent);
  }
  function beam(a, b, radius, mat, parent = scene) {
    const d = b.clone().sub(a);
    const m = mesh(new THREE.CylinderGeometry(radius * 0.77, radius, d.length(), 7), mat,
      a.clone().add(b).multiplyScalar(0.5).toArray(), parent);
    m.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize());
    return m;
  }
  const focal = 720 / (2 * Math.tan(22 * Math.PI / 180));
  // Source landmarks set only geometric control points. No source pixels enter the renderer.
  const at = (u, v, z = 0) => V((u - 480) * (8.8 - z) / focal, 3 + (360 - v) * (8.8 - z) / focal, z);

  function noiseTexture(base, count, pits = false) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < count; i++) {
      const x = rand() * 512, y = rand() * 512, r = pits ? 0.4 + rand() ** 8 * 8.0 : 2 + rand() * 9;
      ctx.fillStyle = pits ? `rgba(68,66,57,${0.12 + rand() * 0.5})` : `rgba(126,120,108,${rand() * 0.024})`;
      ctx.beginPath(); ctx.ellipse(x, y, r, r * (0.45 + rand() * 0.6), 0, 0, Math.PI * 2); ctx.fill();
      if (pits && r > 1) {
        ctx.fillStyle = 'rgba(255,255,250,.65)';
        ctx.fillRect(x - r / 2, y + r * 0.6, r * 1.5, 0.7);
      }
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    return tex;
  }
  const white = material('#ffffff', 0.84, { map: noiseTexture('#e8e7e1', 800, true) });
  const whiteTop = material('#ffffff', 0.69, { map: noiseTexture('#f1f2ef', 600, true) });
  const pale = material('#d9dbd5', 0.77);
  const darkMetal = material('#151c1b', 0.41, { metalness: 0.45 });
  const silver = material('#a0a7a2', 0.29, { metalness: 0.62 });
  const stemMat = material('#777849', 0.82);
  const floorTex = noiseTexture('#d8d5cf', 4500);
  floorTex.repeat.set(13, 15);
  const floor = box(44, 0.10, 48, material('#efeeec', 0.21, { map: floorTex, metalness: 0.12 }), 0, -0.055, -8);
  const grout = material('#8e887b', 0.77);
  for (let x = -17; x <= 18; x += 1.32) box(0.009, 0.005, 46, grout, x, 0.003, -8);
  for (let z = -29; z <= 12; z += 1.30) box(40, 0.005, 0.009, grout, 0, 0.004, z);

  const bed = new THREE.Group();
  scene.add(bed);
  bed.rotation.y = 0.435;
  bed.position.set(-0.381, 0, -0.815);
  const left = -6.5, right = 1.52, front = 1.43, back = -1.10;
  const bedHeight = 1.07, rim = 0.29;
  box(right - left, bedHeight, 0.30, white, (right + left) / 2, bedHeight / 2, front, bed);
  box(0.30, bedHeight, front - back, white, right - 0.15, bedHeight / 2, (front + back) / 2, bed);
  box(right - left, 0.14, 0.44, whiteTop, (right + left) / 2, bedHeight + 0.025, front - 0.07, bed);
  box(0.43, 0.14, front - back, whiteTop, right - 0.18, bedHeight + 0.025, (front + back) / 2, bed);
  box(right - left, 0.10, 0.34, whiteTop, (right + left) / 2, 0.94, back, bed);
  box(right - left, bedHeight, 0.27, white, (right + left) / 2, bedHeight / 2, back, bed);
  box(0.29, bedHeight, front - back, white, left + 0.14, bedHeight / 2, (front + back) / 2, bed);
  box(0.43, 0.14, front - back, whiteTop, left + 0.15, bedHeight + 0.025, (front + back) / 2, bed);
  box(right - left, 0.12, 0.32, material('#b5b4a7'), (right + left) / 2, 0.09, front - 0.01, bed);
  const soil = material('#252b1b', 1);
  box(right - left - rim, 0.18, front - back - rim, soil, (right + left) / 2 - 0.12, 0.91, (front + back) / 2, bed);
  const stoneGeo = new THREE.DodecahedronGeometry(1, 0);
  const soilPebbles = new THREE.InstancedMesh(stoneGeo, material('#474435', 1), 240);
  const dummy = new THREE.Object3D();
  for (let i = 0; i < 240; i++) {
    dummy.position.set(left + rand() * (right - left - 0.5), 1.015, back + 0.2 + rand() * (front - back - 0.6));
    dummy.scale.set(0.025 + rand() * 0.06, 0.014 + rand() * 0.021, 0.025 + rand() * 0.06);
    dummy.rotation.set(rand(), rand() * 6.28, rand());
    dummy.updateMatrix(); soilPebbles.setMatrixAt(i, dummy.matrix);
  }
  soilPebbles.receiveShadow = true; bed.add(soilPebbles);

  const architectureStart = scene.children.length;
  const wallZ = x => -1.9 - 0.26 * x;
  function panel(x1, x2, y1, y2, mat, zoffset = 0, thickness = 0.035) {
    const a = V(x1, (y1 + y2) / 2, wallZ(x1) + zoffset);
    const b = V(x2, (y1 + y2) / 2, wallZ(x2) + zoffset);
    const m = box(a.distanceTo(b), y2 - y1, thickness, mat, (a.x + b.x) / 2, a.y, (a.z + b.z) / 2);
    m.rotation.y = Math.atan(0.26);
    return m;
  }
  const glassLower = material('#48514f', 0.36, { metalness: 0.27 });
  const glassAmber = material('#bfad8d', 0.23, { metalness: 0.19, transparent: true, opacity: 0.46 });
  const roomBack = material('#b8a17e', 0.79);
  panel(-14, 2.46, 0, 6.12, roomBack, -0.7, 0.1);
  for (const y of [2.5, 3.62, 4.9]) panel(-14, 2.46, y, y + 0.13, material('#d9cda9'), -0.40);
  for (let i = 0; i < 12; i++) {
    const x = -7.5 + rand() * 9.3;
    panel(x, x + 0.25 + rand() * 0.9, 2.6 + rand() * 2.6, 3.1 + rand() * 2.8,
      material(i % 3 ? '#8d8065' : '#d9c095'), -0.42, 0.06);
  }
  const sections = [-14, -8, -5.65, -3.3, 1.22, 2.46];
  for (let i = 0; i < sections.length - 1; i++) {
    panel(sections[i] + 0.025, sections[i + 1] - 0.025, 0.1, 2.45, glassLower);
    panel(sections[i] + 0.025, sections[i + 1] - 0.025, 2.45, 6.12, glassAmber);
  }
  for (const x of sections) box(0.105, 6.15, 0.13, darkMetal, x, 3.06, wallZ(x) + 0.10);
  for (const y of [0.95, 2.45, 3.59, 4.76, 6.13]) panel(-14, 2.49, y - 0.047, y + 0.047, silver, 0.12, 0.09);
  panel(-14, 2.48, 6.20, 9.7, pale, 0.01, 0.22);
  const blind = material('#969b8d', 0.89);
  panel(1.34, 2.10, 1.02, 2.38, blind, 0.14);
  for (let y = 1.04; y < 2.4; y += 0.034) panel(1.34, 2.10, y, y + 0.008, material('#777e71'), 0.162);
  // Only the glass partition is recessed; ground-level lobby furniture must
  // remain on the same physical floor rather than follow a projective scale.
  const architecture = new THREE.Group();
  scene.children.slice(architectureStart).forEach(part => architecture.add(part));
  scene.add(architecture);
  architecture.scale.setScalar(1.85);
  architecture.position.set(0, -2.55, -7.48);
  // The far lobby is genuinely recessed beyond the glass and raised planter.
  box(25, 7.1, 0.18, material('#9f8166'), 6, 3.55, -16.5);
  for (const y of [1.25, 2.55, 4.65]) box(25, 0.055, 0.06, material('#d3c5aa'), 6, y, -16.34);
  const columnMat = material('#aaa28c', 0.76);
  mesh(new THREE.CylinderGeometry(0.69, 0.71, 6.8, 48), columnMat, [9.5, 3.4, -12.7]);
  mesh(new THREE.CylinderGeometry(0.77, 0.71, 0.08, 48), columnMat, [9.5, 6.69, -12.7]);
  const ceilingMat = material('#d6cabb', 0.86, { emissive: '#85796a', emissiveIntensity: 0.35 });
  box(16, 0.20, 18, ceilingMat, 10.5, 6.80, -11);
  const cove = material('#ffe9ae', 0.25, { emissive: '#ffc66b', emissiveIntensity: 2.1 });
  box(21, 0.14, 0.17, cove, 7, 5.78, -16.0);
  const coveLight = new THREE.PointLight('#ffcc89', 48, 15, 2); coveLight.position.set(6, 5.5, -13); scene.add(coveLight);
  const bins = ['#454940', '#102b49', '#16344f', '#143225'];
  bins.forEach((color, i) => {
    const x = 5.23 + i * 1.05, z = -12.5;
    box(0.90, 1.12, 0.81, material(color, 0.43), x, 0.56, z);
    box(0.96, 0.13, 0.86, material('#202923', 0.49), x, 1.17, z);
    box(0.44, 0.18, 0.01, material('#0d1411'), x, 1.06, z + 0.44);
    box(0.55, 0.69, 0.012, material('#e5dfc6'), x, 0.64, z + 0.418);
    const labelCanvas = document.createElement('canvas'); labelCanvas.width = 128; labelCanvas.height = 160;
    const ctx = labelCanvas.getContext('2d'); ctx.fillStyle = '#dedac1'; ctx.fillRect(0, 0, 128, 160);
    ctx.fillStyle = '#586252'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(['LANDFILL', 'COMPOST', 'MIXED PAPER', 'CONTAINERS'][i], 64, 22);
    ctx.strokeStyle = '#697369'; ctx.lineWidth = 4; ctx.strokeRect(18, 52, 28, 45); ctx.strokeRect(65, 69, 25, 28);
    ctx.fillStyle = i === 1 ? '#739075' : '#74868b'; ctx.fillRect(15, 120, 97, 22);
    const labelMap = new THREE.CanvasTexture(labelCanvas); labelMap.colorSpace = THREE.SRGBColorSpace;
    mesh(new THREE.PlaneGeometry(0.50, 0.62), material('#ffffff', 0.75, { map: labelMap }), [x, 0.63, z + 0.432]);
  });
  box(1.40, 2.4, 0.10, material('#4d554e'), 12.0, 2.2, -16.30);
  box(1.13, 2.18, 0.06, material('#b1b7a3'), 12.0, 2.2, -16.22);
  for (let i = 0; i < 5; i++) box(0.95, 0.12, 0.08, material('#575d52'), 12, 1.3 + 0.4 * i, -16.16);

  const ceilingShape = new THREE.Shape();
  ceilingShape.moveTo(2.4, -1.7);
  ceilingShape.bezierCurveTo(1.8, -3.5, 1.9, -5.5, 3.1, -8.0);
  ceilingShape.lineTo(18, -8); ceilingShape.lineTo(18, 5); ceilingShape.lineTo(3.3, 5); ceilingShape.closePath();
  const ceiling = mesh(new THREE.ExtrudeGeometry(ceilingShape, { depth: 0.20, bevelEnabled: false }), ceilingMat);
  ceiling.rotation.x = Math.PI / 2; ceiling.position.y = 7.0;
  for (let i = 0; i < 5; i++) {
    tube([V(2.05 + i * 0.12, 6.78, -.8), V(2.3 + i * 0.12, 6.78, -2.3),
      V(2.85 + i * 0.12, 6.78, -4.2), V(3.75 + i * 0.12, 6.78, -5.3)], 0.019, darkMetal);
  }
  function downlight(x, y, z, r) {
    const rimMesh = mesh(new THREE.TorusGeometry(r, r * 0.09, 8, 36), darkMetal, [x, y, z]);
    rimMesh.rotation.x = Math.PI / 2;
    mesh(new THREE.CylinderGeometry(r * 0.38, r * 0.88, r * .38, 32, 1, true), silver, [x, y + r * .19, z]);
    mesh(new THREE.CylinderGeometry(r * 0.43, r * 0.43, 0.045, 24),
      material('#e7eee5', 0.23, { emissive: '#a8b3b1', emissiveIntensity: 0.25 }), [x, y - 0.012, z]);
  }
  downlight(-3.3, 6.89, -0.60, 0.42); downlight(-0.84, 6.57, -0.55, 0.36);
  downlight(5.8, 6.64, -5.5, 0.23); downlight(9.0, 6.64, -11, 0.23);
  beam(at(104, 1, -0.50), at(490, 40, -2.1), 0.011, material('#785f37'));
  const sensor = mesh(new THREE.SphereGeometry(0.15, 16, 12), darkMetal, at(255, 11, -1.0).toArray()); sensor.scale.z = 0.47;

  const atriumWhite = material('#d8d6c9', .74);
  const atriumGlass = material('#8eaaa6', .24, { metalness: .28 });
  const windowDark = material('#617e78', .32, { metalness: .18 });
  const oak = material('#a1815a', .64);
  for (const side of [-1, 1]) {
    box(.28, 10.8, 40, atriumWhite, side * 20, 5.4, 1);
    for (let z = -15; z <= 17; z += 4) {
      box(.12, 6.6, 3.85, atriumGlass, side * 19.82, 4.2, z);
      box(.21, 8.6, .11, darkMetal, side * 19.68, 4.3, z - 2);
      mesh(new THREE.CylinderGeometry(.45,.49,9.6,32), pale, [side*15.5,4.8,z]);
    }
    for (const y of [1.0, 4.0, 7.5]) box(.22,.10,36,silver,side*19.65,y,1);
  }
  box(40,10.8,.28,atriumWhite,0,5.4,18.8);
  for (let x = -18; x <= 18; x += 4) {
    box(3.85,6.1,.09,windowDark,x,4.45,18.62);
    box(.11,8.5,.18,silver,x-2,4.3,18.50);
    box(3.75,.08,.10,silver,x,4.15,18.48);
    box(3.0,.10,.10,atriumWhite,x,6.1,18.46);
  }
  for (const x of [-12, -6, 6, 12]) {
    box(3.4,.17,.80,oak,x,.56,14.5);
    for (const sign of [-1,1]) box(.12,.5,.6,darkMetal,x+sign*1.35,.25,14.5);
    mesh(new THREE.CylinderGeometry(.38,.43,9.7,32),pale,[x,4.85,17.8]);
  }
  box(39,.20,26,pale,0,10.55,7.1);
  box(7,.22,25,material('#e8ede5',.6,{emissive:'#d5e9e0',emissiveIntensity:.55}),-4,10.42,7.0);
  for (const x of [-16,-9,3,11,17]) {
    box(.10,.26,26,silver,x,10.24,7.1);
    for (const z of [2,8,14]) downlight(x,10.15,z,.23);
  }

  const plant = new THREE.Group(); plant.name = 'Editable layered cycad'; scene.add(plant);
  const bladePositions = [], bladeColors = [];
  const bladeMat = material('#ffffff', 0.49, { vertexColors: true, side: THREE.DoubleSide, metalness: 0.02 });
  function triangle(a, b, c, color) {
    for (const p of [a, b, c]) { bladePositions.push(p.x, p.y, p.z); bladeColors.push(color.r, color.g, color.b); }
  }
  function blade(base, direction, bend, width, normal, color, segments = 7) {
    const axis = direction.clone().normalize();
    const cross = axis.clone().cross(normal).normalize();
    const rows = [];
    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const center = base.clone().addScaledVector(direction, t).addScaledVector(bend, Math.sin(Math.PI * t) * 0.5);
      const w = width * Math.pow(Math.sin(Math.PI * t), 0.6) * (1 - t * 0.35) + 0.0008;
      const ridge = normal.clone().multiplyScalar(w * 0.3);
      rows.push([center.clone().addScaledVector(cross, -w), center.clone().add(ridge), center.clone().addScaledVector(cross, w)]);
    }
    for (let j = 0; j < segments; j++) for (let k = 0; k < 2; k++) {
      const tint = color.clone().multiplyScalar(k ? 0.89 : 1.08);
      triangle(rows[j][k], rows[j + 1][k], rows[j + 1][k + 1], tint);
      triangle(rows[j][k], rows[j + 1][k + 1], rows[j][k + 1], tint);
    }
  }
  const leafPalette = ['#365e40', '#527f60', '#639a7b', '#769558', '#4b755a', '#7c8b50', '#477755'];
  const rachisMat = material('#596f37', 0.7);
  function frond(points, maxWidth, roll = 0, palette = 0, count = 62, group = plant) {
    const curve = new THREE.CatmullRomCurve3(points);
    const normal = V(Math.sin(roll) * 0.65, Math.sin(roll * 0.7) * 0.25, Math.cos(roll)).normalize();
    const length = curve.getLength();
    mesh(new THREE.TubeGeometry(curve, 64, Math.max(0.005, length * 0.0026), 5, false), rachisMat, [0, 0, 0], group);
    for (let i = 0; i < count; i++) {
      const t = 0.085 + (i / count) * 0.908;
      const p = curve.getPointAt(t);
      const tangent = curve.getTangentAt(t);
      const leafNormal = normal.clone().applyAxisAngle(tangent, Math.sin(t * Math.PI) * 0.25);
      const side = tangent.clone().cross(leafNormal).normalize();
      const profile = Math.pow(Math.sin(Math.PI * t), 0.72) * Math.min(1, t * 4.0);
      const l = maxWidth * profile;
      for (const sign of [-1, 1]) {
        const dir = side.clone().multiplyScalar(sign * l).addScaledVector(tangent, l * 0.21);
        dir.y -= 0.06 * l;
        const bend = leafNormal.clone().multiplyScalar(0.28 * l).addScaledVector(tangent, -l * 0.23);
        const col = new THREE.Color(leafPalette[(palette + (i % 17 === 0 ? 1 : 0)) % leafPalette.length]);
        col.multiplyScalar((0.89 + rand() * 0.20) * (.45 + .55 * Math.sqrt(t)));
        blade(p, dir, bend, Math.min(0.039, length / count * 0.44) * (0.4 + profile * 0.6), leafNormal, col);
      }
    }
  }
  const trunkBase = at(461, 552, -0.05), crown = at(494, 438, 0);
  const trunkPath = new THREE.CatmullRomCurve3([trunkBase, at(477, 492, 0.015), crown]);
  mesh(new THREE.TubeGeometry(trunkPath, 22, 0.185, 13, false), material('#776247', 0.99), [0, 0, 0], plant);
  const barkMat = material('#a0987c', 0.96);
  const scales = new THREE.InstancedMesh(new THREE.ConeGeometry(1, 1, 5), barkMat, 760);
  for (let i = 0; i < 760; i++) {
    const h = i / 760;
    const center = trunkPath.getPoint(h);
    const ang = i * 2.399963;
    const radius = 0.15 + 0.038 * h + rand() * 0.025;
    dummy.position.set(center.x + Math.cos(ang) * radius, center.y, center.z + Math.sin(ang) * radius);
    dummy.rotation.set(Math.sin(ang) * 0.4, -ang, Math.cos(ang) * -0.4);
    dummy.scale.set(0.033 + rand() * 0.018, 0.07 + rand() * 0.043, 0.033 + rand() * 0.016);
    dummy.updateMatrix(); scales.setMatrixAt(i, dummy.matrix);
    scales.setColorAt(i, new THREE.Color().setHSL(0.11, 0.10 + rand() * 0.12, 0.34 + rand() * 0.27));
  }
  scales.castShadow = true; scales.receiveShadow = true; plant.add(scales);
  // Each rachis is an independently editable spatial spline with folded narrow pinnae.
  const fronds = [
    {p:[[491,438,0],[421,321,-.52],[289,182,-.95],[174,164,-.9]], w:.47,r:-.28,c:0},
    {p:[[491,438,0],[381,344,-.82],[219,253,-.75],[141,287,-.62]],w:.44,r:.12,c:0},
    {p:[[493,438,0],[341,382,-.52],[170,372,-.20],[91,494,.04]],w:.46,r:-.5,c:0},
    {p:[[494,438,0],[373,405,-.10],[181,431,.08],[117,534,.2]],w:.47,r:.1,c:0},
    {p:[[494,438,0],[553,314,-.74],[660,205,-.90],[802,239,-.5]],w:.49,r:.45,c:0},
    {p:[[494,438,0],[615,329,-.45],[778,286,-.65],[843,338,-.4]],w:.54,r:-.2,c:1},
    {p:[[494,438,0],[587,385,-.37],[736,354,-.4],[839,386,-.1]],w:.46,r:.1,c:0},
    {p:[[494,438,0],[474,286,-.68],[433,128,-.75],[391,108,-.8]],w:.42,r:-.26,c:1},
    {p:[[494,438,0],[477,247,-1.3],[455,126,-1.55],[431,119,-1.5]],w:.46,r:.55,c:0},
    {p:[[494,438,0],[399,259,-.28],[312,135,-.23],[273,157,-.1]],w:.48,r:.13,c:1},
    {p:[[494,438,0],[515,235,-.32],[565,76,-.27],[620,41,-.25]],w:.48,r:.22,c:2},
    {p:[[494,438,0],[537,231,-.68],[590,83,-.5],[628,69,-.3]],w:.41,r:-.18,c:1},
    {p:[[494,438,0],[565,222,.36],[640,82,.55],[698,85,.7]],w:.49,r:.45,c:2},
    {p:[[494,438,0],[578,267,-.12],[675,124,-.14],[749,156,.03]],w:.50,r:.08,c:2},
    {p:[[494,438,0],[565,308,.05],[624,150,.2],[664,164,.25]],w:.49,r:-.65,c:1},
    {p:[[494,438,0],[625,296,.03],[770,206,.02],[879,231,-.18]],w:.45,r:.1,c:3},
    {p:[[494,438,0],[643,353,.68],[804,291,1.2],[858,358,1.1]],w:.54,r:.37,c:2},
    {p:[[494,438,0],[654,404,.4],[833,425,.48],[914,495,.4]],w:.44,r:.1,c:3},
    {p:[[494,438,0],[363,336,.8],[239,306,1.25],[137,395,1.3]],w:.63,r:-.36,c:2},
    {p:[[494,438,0],[391,300,.22],[243,191,.26],[149,232,.28]],w:.43,r:-.3,c:1},
    {p:[[494,438,0],[440,295,.9],[399,219,1.2],[346,252,1.3]],w:.47,r:.17,c:3},
    {p:[[494,438,0],[392,381,.45],[224,374,.45],[71,418,.52]],w:.47,r:-.22,c:0},
    {p:[[494,438,0],[512,322,.64],[539,215,.7],[542,197,.62]],w:.22,r:-.35,c:2},
    {p:[[494,438,0],[417,403,1.14],[369,539,1.8],[340,649,1.95]],w:.40,r:.33,c:3},
  ];
  fronds.forEach(f => frond(f.p.map(([u,v,z]) => at(u,v,z * 1.55)), f.w, f.r, f.c, 66));
  for (let i = 0; i < 10; i++) {
    const angle = i / 10 * Math.PI * 2 + .28;
    const radial = V(Math.cos(angle), 0, Math.sin(angle));
    const reach = 2.8 + 1.35 * Math.abs(Math.sin(angle)) + .22 * Math.sin(i * 2.8);
    const arch = 1.50 + .5 * Math.cos(i * 1.7);
    const points = [
      crown.clone(),
      crown.clone().addScaledVector(radial,.8).add(V(0,arch*.68,0)),
      crown.clone().addScaledVector(radial,reach*.73).add(V(0,arch,0)),
      crown.clone().addScaledVector(radial,reach).add(V(0,arch*.48,0)),
    ];
    frond(points,.43,angle-Math.PI/2,i%3,67);
  }
  for (let i = 0; i < 22; i++) {
    const angle = i * 2.399;
    const a = crown.clone().add(V(Math.cos(angle) * .16, -.10, Math.sin(angle) * .16));
    const b = a.clone().add(V(Math.cos(angle) * .19, .19 + rand() * .08, Math.sin(angle) * .19));
    beam(a, b, .024, barkMat, plant);
  }

  const mainLeafVertexCount = bladePositions.length / 3;
  const companion = new THREE.Group(); companion.name = 'Sparse companion stems and ground ferns'; scene.add(companion);
  const treePaths = [
    [[115,567,.22],[58,349,.06],[48,173,-.28],[53,33,-.5]],
    [[119,566,.24],[54,467,.4],[4,396,.2],[-30,301,.04]],
    [[98,574,.18],[155,348,-.48],[196,187,-.7],[241,115,-.83]],
    [[109,569,.22],[182,444,.02],[245,283,-.25],[279,151,-.44]],
    [[86,571,.15],[37,484,.06],[-20,420,.05]],
  ];
  treePaths.forEach((p, i) => tube(p.map(q => at(...q)), i ? .025 : .033, stemMat, companion));
  for (const [u, v, z] of [[53,33,-.5],[48,173,-.28],[241,115,-.83],[196,187,-.7],[279,151,-.44],[-12,282,.1]]) {
    for (let j = 0; j < 5; j++) {
      const start = at(u, v, z);
      const angle = j * 1.8 + rand();
      const end = start.clone().add(V(Math.cos(angle) * (.48 + rand() * .8), .12 + rand() * .26, Math.sin(angle) * .45));
      const curve = new THREE.CatmullRomCurve3([start, start.clone().lerp(end, .5).add(V(0,.15,0)), end]);
      mesh(new THREE.TubeGeometry(curve, 12, .009, 4, false), stemMat, [0,0,0], companion);
      for (let k = 1; k < 8; k++) {
        const t = k / 10, p = curve.getPoint(t), tangent = curve.getTangent(t);
        for (const sign of [-1,1]) {
          const dir = V(-tangent.y * sign, tangent.x * sign, .1).normalize().multiplyScalar(.14 + rand() * .16).addScaledVector(tangent,.07);
          blade(p, dir, V(0,.07,.03), .037, V(0,.2,1).normalize(), new THREE.Color(j % 2 ? '#526742' : '#758553'), 6);
        }
      }
    }
  }
  for (let i = 0; i < 16; i++) {
    const root = V(-3.15 + rand() * 3.7, 1.04, -.94 + rand() * 1.0);
    for (let j = 0; j < 5; j++) {
      const angle = j * 1.256 + rand() * .6;
      const tip = root.clone().add(V(Math.cos(angle) * (.36 + rand() * .22), .06 + rand() * .11, Math.sin(angle) * .44));
      const mid = root.clone().lerp(tip, .55).add(V(0,.27,0));
      frond([root, mid, tip], .075 + rand() * .025, angle * .3, i < 5 ? 5 : 0, 22, companion);
    }
  }
  for (let i = 0; i < 90; i++) {
    const p = V(-1.8 + rand() * 2.7, 1.02 + rand() * .15, -1.3 + rand() * 1.1);
    blade(p, V((rand()-.5)*.25,.1+rand()*.3,(rand()-.5)*.25), V(0,.05,0), .06, V(0,.5,1), new THREE.Color('#294c35'), 5);
  }
  const foliageGeometry = new THREE.BufferGeometry();
  foliageGeometry.setAttribute('position', new THREE.Float32BufferAttribute(bladePositions, 3));
  foliageGeometry.setAttribute('color', new THREE.Float32BufferAttribute(bladeColors, 3));
  foliageGeometry.computeVertexNormals();
  const leaves = mesh(foliageGeometry, bladeMat); leaves.name = 'Individual folded procedural pinnae';
  leaves.userData.mainLeafVertexCount = mainLeafVertexCount;
  const hemi = new THREE.HemisphereLight('#e9fff9', '#99917e', 1.65); scene.add(hemi);
  scene.add(new THREE.AmbientLight('#ffffff', .25));
  const sun = new THREE.DirectionalLight('#fffef5', 3.8);
  sun.position.set(-3.8, 9, 4.6); sun.target.position.set(-.4, 2.1, -.4); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera, { left:-8,right:8,top:8,bottom:-8,near:.4,far:28 });
  sun.shadow.normalBias = .018; sun.shadow.bias = -.0003; sun.shadow.radius = 3;
  const fill = new THREE.DirectionalLight('#a4dcd4', .65); fill.position.set(4,6,-2); scene.add(fill);
  function setTime(t) {
    const pose = cameraPose(t);
    camera.position.set(...pose.position);
    camera.lookAt(...pose.target);
    camera.fov = pose.fov;
    camera.updateProjectionMatrix();
  }
  setTime(0);
  return { scene, camera, setTime };
}
