import * as THREE from '../vendor/three.module.js';

export function rng(seed) {
  return () => {
    seed |= 0;
    seed = seed + 0x6D2B79F5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

function generatedTexture(kind, seed, width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), rng(seed), width, height);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.userData = { procedural: kind, seed, width, height };
  return texture;
}

export function oakTexture(seed) {
  return generatedTexture('longitudinal oak grain', seed, 128, 1024, (c, r, w, h) => {
    c.fillStyle = '#b08762';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 280; i++) {
      const x = r() * w;
      c.beginPath();
      c.moveTo(x, 0);
      for (let y = 0; y <= h; y += 32) c.lineTo(x + Math.sin(y * .009 + i) * (1 + r() * 2), y);
      c.strokeStyle = r() > .45 ? `rgba(66,35,14,${r() * .09})` : `rgba(248,215,160,${r() * .12})`;
      c.lineWidth = .2 + r() * 1.4;
      c.stroke();
    }
    for (let i = 0; i < 10; i++) {
      const x = r() * w, y = r() * h;
      for (let j = 0; j < 8; j++) {
        c.beginPath();
        c.ellipse(x, y, 1 + j * 1.2, 6 + j * 9, 0, 0, Math.PI * 2);
        c.strokeStyle = 'rgba(76,45,24,.035)';
        c.stroke();
      }
    }
  });
}

export function plasterTexture() {
  return generatedTexture('fine matte plaster', 37, 256, 256, (c, r, w, h) => {
    const im = c.createImageData(w, h);
    for (let i = 0; i < im.data.length; i += 4) {
      const v = 210 + Math.floor(r() * 34);
      im.data.set([v, v, v, 255], i);
    }
    c.putImageData(im, 0, 0);
  });
}

export function plaidTexture() {
  const t = generatedTexture('tan charcoal wool plaid', 91, 256, 256, (c, r, w, h) => {
    c.fillStyle = '#978a70'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4; i++) {
      c.fillStyle = 'rgba(20,23,19,.85)';
      c.fillRect(i * 64 + 20, 0, 21, h); c.fillRect(0, i * 64 + 20, w, 21);
      c.fillStyle = 'rgba(210,196,162,.55)';
      c.fillRect(i * 64 + 3, 0, 6, h); c.fillRect(0, i * 64 + 3, w, 6);
    }
    for (let i = 0; i < 7000; i++) {
      c.fillStyle = r() > .5 ? 'rgba(230,214,186,.10)' : 'rgba(0,0,0,.08)';
      c.fillRect(r() * w, r() * h, .6, 2);
    }
  });
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(1, 1.6);
  return t;
}

function arch(c, x, y, w, h) {
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, y + w / 2);
  c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  c.lineTo(x + w, y + h);
  c.closePath();
}

export function architectureTexture(seed, style = 0) {
  return generatedTexture('monochrome architectural intaglio', seed, 512, 640, (c, r, w, h) => {
    c.fillStyle = '#aaa9a2'; c.fillRect(0, 0, w, h);
    const vp = [w * (.48 + .08 * Math.sin(seed)), h * .47];
    c.fillStyle = '#595a57'; c.fillRect(w * .2, 0, w * .61, h);
    if (style % 3 === 0) {
      for (let k = 0; k < 6; k++) {
        const s = .69 ** k, ax = 294 + (-40 - 294) * s, ay = 293 + (-130 - 293) * s;
        const aw = 620 * s, ah = 790 * s;
        arch(c, ax, ay, aw, ah);
        const g = c.createLinearGradient(ax, 0, ax + aw, 0);
        g.addColorStop(0, '#30332e'); g.addColorStop(.25, '#bcbdb5'); g.addColorStop(.55, '#e2e0d7'); g.addColorStop(1, '#696d63');
        c.fillStyle = g; c.fill();
        c.lineWidth = 5 * s; c.strokeStyle = '#30382f'; c.stroke();
        arch(c, ax + 31 * s, ay + 27 * s, aw - 62 * s, ah);
        c.fillStyle = '#262b25'; c.fill();
        for (const side of [0, 1]) {
          const cx = side ? ax + aw - 26 * s : ax + 6 * s;
          for (let j = 0; j < 5; j++) {
            c.fillStyle = j % 2 ? '#656a60' : '#bbbeb3';
            c.fillRect(cx + j * 4 * s, ay + aw * .5, 3 * s, ah - aw * .5);
          }
          c.fillStyle = '#d4d4c9'; c.fillRect(cx - 6 * s, ay + aw * .5, 31 * s, 12 * s);
          c.fillStyle = '#6a6d63'; c.fillRect(cx - 8 * s, ay + ah - 25 * s, 35 * s, 11 * s);
        }
        for (let j = 0; j < 17; j++) {
          const a = Math.PI + j / 16 * Math.PI;
          c.beginPath();
          c.moveTo(ax + aw / 2 + Math.cos(a) * aw / 2, ay + aw / 2 + Math.sin(a) * aw / 2);
          c.lineTo(ax + aw / 2 + Math.cos(a) * (aw / 2 - 24 * s), ay + aw / 2 + Math.sin(a) * (aw / 2 - 24 * s));
          c.strokeStyle = '#51574e'; c.lineWidth = 1.5 * s; c.stroke();
        }
      }
      c.beginPath(); c.moveTo(0, h); c.lineTo(282, 350); c.lineTo(317, 350); c.lineTo(w, h); c.closePath();
      c.fillStyle = '#a6aaa0'; c.fill();
      for (let i = 0; i < 12; i++) {
        c.beginPath(); c.moveTo(i * 63 - 100, h); c.lineTo(300, 350);
        c.strokeStyle = '#595f54'; c.lineWidth = 2; c.stroke();
        const y = 350 + (i / 11) ** 2 * 290;
        c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke();
      }
    } else if (style % 3 === 1) {
      for (let yy = 0; yy < h; yy += 38) {
        for (let xx = -50; xx < w; xx += 75) {
          c.fillStyle = ['#a8aaa1', '#9ea296', '#c2c3b9'][Math.floor(r() * 3)];
          c.fillRect(xx + (yy % 76 ? 35 : 0), yy, 73, 36);
        }
      }
      arch(c, 100, 30, 320, 605); c.fillStyle = '#242b25'; c.fill();
      for (let i = 0; i < 5; i++) {
        arch(c, 48 + i * 22, 30 + i * 29, 420 - i * 45, 600 - i * 25);
        c.lineWidth = 15 - i; c.strokeStyle = ['#deded7', '#666963', '#c3c4bb'][i % 3]; c.stroke();
      }
      for (let x = 56; x < 470; x += 38) {
        if (x > 151 && x < 365) continue;
        c.fillStyle = x % 3 ? '#bcbdb5' : '#73766e';
        c.fillRect(x, 222, 14, 418);
        c.fillStyle = '#f0eee3'; c.fillRect(x - 5, 214, 24, 13);
      }
      const pillar = c.createLinearGradient(218, 0, 292, 0);
      pillar.addColorStop(0, '#6e7568'); pillar.addColorStop(.5, '#e0e1d4'); pillar.addColorStop(1, '#a1a798');
      c.fillStyle = pillar; c.fillRect(232, 381, 49, 200);
      c.fillStyle = '#d4d8c9'; c.fillRect(218, 570, 79, 12); c.fillRect(215, 584, 84, 15);
      c.beginPath(); c.ellipse(257, 310, 21, 30, 0, 0, Math.PI * 2); c.fill();
      c.beginPath(); c.moveTo(253, 337); c.lineTo(234, 348); c.lineTo(225, 382); c.lineTo(286, 382); c.lineTo(278, 348); c.closePath(); c.fill();
    } else {
      c.fillStyle = '#cccac0'; c.fillRect(0, 0, w, h);
      for (let i = 0; i < 7; i++) {
        const x = i * 85 - 25;
        c.beginPath(); c.moveTo(x, h); c.lineTo(vp[0] + (x - vp[0]) * .35, 180);
        c.lineTo(vp[0] + (x - vp[0]) * .35 + 22, 180); c.lineTo(x + 48, h); c.closePath();
        const g = c.createLinearGradient(x, 0, x + 48, 0);
        g.addColorStop(0, '#3c403b'); g.addColorStop(.4, '#c3c5bc'); g.addColorStop(.8, '#f0eee6'); g.addColorStop(1, '#686b65');
        c.fillStyle = g; c.fill();
      }
      for (let i = 0; i < 9; i++) {
        c.beginPath(); c.moveTo(0, i * 38); c.lineTo(w, 40 + i * 25);
        c.strokeStyle = '#64675f'; c.lineWidth = i % 2 ? 4 : 9; c.stroke();
      }
    }
    for (let i = 0; i < 110; i++) {
      c.beginPath(); c.moveTo(0, i * 19); c.lineTo(vp[0], vp[1]);
      c.strokeStyle = 'rgba(28,32,27,.10)'; c.lineWidth = .8; c.stroke();
    }
    for (let i = 0; i < 24000; i++) {
      c.fillStyle = r() > .5 ? 'rgba(255,255,248,.065)' : 'rgba(0,0,0,.055)';
      c.fillRect(r() * w, r() * h, 1, 1.8);
    }
  });
}

export function abstractTexture(seed) {
  return generatedTexture('blue ochre abstract painted landscape', seed, 768, 512, (c, r, w, h) => {
    c.fillStyle = '#d6d1b7'; c.fillRect(0, 0, w, h);
    const bands = [
      [0, .35, ['#56849a', '#769ba8', '#476f88', '#91acb2']],
      [.32, .13, ['#253e4b', '#36566b', '#5c7178']],
      [.45, .26, ['#b9985c', '#c8b078', '#d3bd8a', '#958463']],
      [.66, .34, ['#557f8b', '#2b596b', '#d0c6a6', '#809599']]
    ];
    for (const [top, high, colors] of bands) {
      for (let j = 0; j < 110; j++) {
        const x = r() * w, y = (top + r() * high) * h;
        const bw = 30 + r() * 160, bh = 15 + r() * 85;
        c.beginPath(); c.moveTo(x - bw / 2, y);
        for (let n = 0; n < 9; n++) {
          const a = n / 8 * Math.PI * 2;
          c.lineTo(x + Math.cos(a) * bw * (.35 + r() * .25), y + Math.sin(a) * bh * (.35 + r() * .25));
        }
        c.closePath(); c.globalAlpha = .15 + r() * .55;
        c.fillStyle = colors[Math.floor(r() * colors.length)]; c.fill();
      }
    }
    c.globalAlpha = 1;
    for (let j = 0; j < 6000; j++) {
      c.fillStyle = r() > .5 ? 'rgba(255,246,221,.06)' : 'rgba(23,46,54,.04)';
      c.fillRect(r() * w, r() * h, .6 + r() * 10, .6);
    }
  });
}
