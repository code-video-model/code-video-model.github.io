import * as THREE from '../vendor/three.module.js';

export function seeded(seed) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function hash(x, y, seed) {
  let n = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed * 1013;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
}

function noise(x, y, seed, period = 0) {
  const ix = Math.floor(x), iy = Math.floor(y);
  let fx = x - ix, fy = y - iy;
  fx = fx * fx * (3 - 2 * fx);
  fy = fy * fy * (3 - 2 * fy);
  const wrap = n => period ? ((n % period) + period) % period : n;
  const a = hash(wrap(ix), wrap(iy), seed), b = hash(wrap(ix + 1), wrap(iy), seed);
  const c = hash(wrap(ix), wrap(iy + 1), seed), d = hash(wrap(ix + 1), wrap(iy + 1), seed);
  return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy;
}

function finish(canvas, name, recipe) {
  const texture = new THREE.CanvasTexture(canvas);
  texture.name = name;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  const data = canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data;
  let checksum = 2166136261;
  for (const byte of data) checksum = Math.imul(checksum ^ byte, 16777619) >>> 0;
  texture.userData = { procedural: true, recipe, width: canvas.width, height: canvas.height, pixelChecksum: checksum.toString(16) };
  return texture;
}

export function surfaceTexture(kind, seed = 42) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = kind === 'concrete' ? 1024 : 512;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(canvas.width, canvas.height);
  const base = kind === 'concrete' ? [120, 113, 102] : kind === 'wood' ? [86, 58, 39] : [230, 226, 218];
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const u = x / canvas.width, v = y / canvas.height;
      let n;
      if (kind === 'wood') {
        n = 8 * Math.sin(u * 290 + noise(u * 9, v * 4, seed) * 14) + noise(u * 160, v * 9, seed + 1) * 13 - 6;
      } else {
        n = (noise(u * 8, v * 8, seed, 8) - 0.5) * (kind === 'concrete' ? 24 : 3);
        n += (noise(u * 35, v * 35, seed + 1, 35) - 0.5) * (kind === 'concrete' ? 18 : 2);
        n += (noise(u * 110, v * 110, seed + 2, 110) - 0.5) * (kind === 'concrete' ? 8 : 3);
        n += (hash(x, y, seed + 3) - 0.5) * (kind === 'concrete' ? 5 : 2);
      }
      const i = (y * canvas.width + x) * 4;
      image.data[i] = base[0] + n;
      image.data[i + 1] = base[1] + n;
      image.data[i + 2] = base[2] + n;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  const texture = finish(canvas, kind, { generator: 'seeded multiscale material', seed, kind });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'concrete' ? 4 : 2, kind === 'concrete' ? 7 : 2);
  return texture;
}

export function softShadowTexture(kind) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (kind === 'frame') {
    ctx.filter = 'blur(10px)';
    ctx.fillStyle = '#000000';
    ctx.fillRect(25, 25, 206, 206);
  } else {
    const gradient = ctx.createRadialGradient(128, 128, 8, 128, 128, 126);
    gradient.addColorStop(0, 'rgba(0,0,0,.8)');
    gradient.addColorStop(.5, 'rgba(0,0,0,.4)');
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);
  }
  return finish(canvas, `procedural ${kind} contact shadow`, { generator: 'soft analytic contact attenuation', kind });
}

export function paintingTexture(kind, seed) {
  const random = seeded(seed);
  const canvas = document.createElement('canvas');
  canvas.width = kind === 'wide' ? 1024 : kind === 'narrow' ? 384 : 768;
  canvas.height = kind === 'wide' ? 768 : 1280;
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  ctx.scale(w, h);
  ctx.fillStyle = '#c5bca8';
  ctx.fillRect(0, 0, 1, 1);
  function poly(points, color, alpha = 1) {
    ctx.globalAlpha = alpha;
    ctx.fillStyle = color;
    ctx.beginPath();
    points.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    ctx.closePath();
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  function block(x, y, bw, bh, color, roughness = 0.01) {
    const points = [];
    for (const [ax, ay, bx, by] of [[x, y, x + bw, y], [x + bw, y, x + bw, y + bh], [x + bw, y + bh, x, y + bh], [x, y + bh, x, y]]) {
      for (let j = 0; j < 9; j++) {
        const t = j / 9;
        points.push([ax + (bx - ax) * t + (random() - 0.5) * roughness, ay + (by - ay) * t + (random() - 0.5) * roughness]);
      }
    }
    poly(points, color);
  }
  if (kind === 'geometric') {
    poly([[0, 0], [.39, 0], [.40, .61], [0, .57]], '#ded3bc');
    poly([[.19, 0], [.40, 0], [.40, .34], [.20, .33]], '#d8bda7');
    poly([[.40, 0], [1, 0], [1, .31], [.54, .59], [.41, .56]], '#e4cd8e');
    poly([[1, .31], [1, .59], [.72, .56]], '#78736b');
    poly([[0, .54], [.40, .55], [.40, .61], [0, .60]], '#aaa79b');
    poly([[0, .60], [.67, .57], [.72, 1], [.28, 1], [.28, .78]], '#d2b899');
    poly([[0, .66], [.28, .78], [.28, 1], [0, 1]], '#5e5e55');
    poly([[.67, .58], [1, .60], [1, 1], [.72, 1]], '#c2beb0');
    poly([[.60, .56], [.70, .57], [.70, .65], [.60, .64]], '#bd9789');
    ctx.strokeStyle = '#827869';
    ctx.lineWidth = .003;
    ctx.beginPath();
    ctx.moveTo(.69, .57); ctx.lineTo(.73, .97); ctx.lineTo(1, 1);
    ctx.stroke();
  } else if (kind === 'wide') {
    block(0, 0, 1, 1, '#c3bdac');
    block(.02, .015, .66, .34, '#dedbd1');
    block(.68, 0, .32, .30, '#c8ad68');
    poly([[.02, .40], [.27, .39], [.29, .76], [.05, .99]], '#ddd9ce');
    poly([[.27, .39], [1, .22], [1, .62], [.61, .59]], '#cbc3ac');
    poly([[.63, .60], [.81, .59], [1, .64], [1, 1], [.62, 1]], '#45433c');
    block(.45, .50, .105, .16, '#242925', .005);
    block(.26, .69, .18, .31, '#c4a75f', .003);
    block(.45, .68, .17, .23, '#b8b4a4', .005);
    poly([[.01, .99], [.26, .91], [.26, 1]], '#514d3e');
  } else {
    const isNarrow = kind === 'narrow';
    block(.01, .01, .25, .34, '#53534d', .045);
    block(.26, 0, .42, .25, '#b1b2a4', .025);
    block(.70, .04, .28, .40, '#b8a68d', .04);
    block(.01, .28, .39, .32, '#9a9f92', .04);
    block(.12, .10, .43, .51, '#cac0a9', .025);
    block(.43, .20, .39, .37, '#c4b69d', .045);
    block(.74, .47, .27, .34, '#44473f', .04);
    block(.28, .60, .43, .25, '#d5cdb7', .04);
    block(.0, .59, .18, .41, '#c6b5a0', .025);
    block(.71, .77, .23, .22, '#aaa28c', .02);
    block(.31, .45, .075, .16, '#504d42', .02);
    if (isNarrow) {
      block(.12, .06, .22, .33, '#9b927a', .04);
      block(.1, .42, .33, .28, '#706855', .04);
      block(.60, .19, .20, .42, '#a8946d', .04);
      block(.47, .51, .32, .12, '#353b34', .04);
      block(.43, .68, .28, .26, '#9e8d6a', .04);
    } else {
      poly([[.1, .49], [.51, .59], [.61, .94], [.25, .87]], '#a09f93', .19);
      poly([[.25, .28], [.4, .33], [.36, .55], [.23, .48]], '#767a73', .24);
      poly([[.48, .78], [.73, .74], [.79, 1], [.62, 1]], '#97836a', .21);
    }
    const palette = ['#e3ddd0', '#b9b6a7', '#6d736b', '#aaa08d', '#c8b294', '#343d38'];
    for (let i = 0; i < (isNarrow ? 1250 : 1900); i++) {
      const x = random(), y = random();
      const inPaleCenter = x > .35 && x < .70 && y > .10 && y < .67;
      if (inPaleCenter && random() < .55) continue;
      const length = .005 + random() * .085;
      ctx.globalAlpha = .04 + random() * .24;
      ctx.fillStyle = palette[Math.floor(random() * palette.length)];
      ctx.fillRect(x, y, .001 + random() * .017, length);
    }
    ctx.globalAlpha = 1;
    for (let i = 0; i < 36; i++) {
      let x = random(), y = random();
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 7; j++) {
        x += (random() - .5) * .12; y += (random() - .25) * .055;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = i % 3 ? 'rgba(63,65,57,.23)' : 'rgba(239,232,211,.40)';
      ctx.lineWidth = .001 + random() * .002;
      ctx.stroke();
    }
    if (!isNarrow) {
      for (let i = 0; i < 210; i++) {
        const x = random(), y = random();
        ctx.strokeStyle = i % 3 ? 'rgba(224,215,192,.19)' : 'rgba(69,73,67,.17)';
        ctx.lineWidth = .002 + random() * .005;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x + .035 + random() * .12, y - .015 - random() * .08);
        ctx.stroke();
      }
      for (let i = 0; i < 48; i++) {
        ctx.beginPath();
        const x = .10 + random() * .22, y = .79 + random() * .13;
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(x + .13 * random(), y - .12 * random(), x - .08, y + .08, x + .10, y - .015);
        ctx.strokeStyle = 'rgba(62,66,59,.24)';
        ctx.lineWidth = .0015;
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(72,77,69,.32)';
      ctx.lineWidth = .002;
      ctx.beginPath();
      ctx.moveTo(.63, .18); ctx.lineTo(.81, .105); ctx.lineTo(.95, .19);
      ctx.moveTo(.81, .105); ctx.lineTo(.76, .57);
      ctx.moveTo(.17, .58); ctx.lineTo(.61, .65); ctx.lineTo(.87, .57);
      ctx.stroke();
    }
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const pixels = ctx.getImageData(0, 0, w, h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const index = (y * w + x) * 4;
      const n = (noise(x / 37, y / 53, seed) - .5) * 15 + (noise(x / 6, y / 17, seed + 1) - .5) * 9 + (random() - .5) * 9;
      for (let c = 0; c < 3; c++) pixels.data[index + c] += n;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  return finish(canvas, `art-${kind}-${seed}`, { generator: 'original layered abstract painting', kind, seed });
}
