import * as THREE from '../vendor/three.module.js';

const WIDTH = 960, HEIGHT = 544, LAST = 123 / 24, CAMERA_Z = 3000;
const animated = new URLSearchParams(location.search).get('motion') === '1';
const scene = new THREE.Scene();
scene.background = new THREE.Color('#dfd0c8');
const camera = new THREE.PerspectiveCamera(2 * Math.atan(544 / CAMERA_Z) * 180 / Math.PI, WIDTH / HEIGHT, 10, 6000);
const renderer = new THREE.WebGLRenderer({antialias: true, preserveDrawingBuffer: true});
renderer.setPixelRatio(devicePixelRatio);
renderer.setSize(WIDTH, HEIGHT);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setClearColor('#dfd0c8', 1);
document.body.appendChild(renderer.domElement);

const C = {
  line: '#626159', skin: '#faeac6', skinShade: '#e6cbaa', blush: '#e5bdac',
  cream: '#f4e8bf', creamShade: '#c6bb96', white: '#f2f0e9',
  pink: '#e99399', pinkDark: '#bf747c', skirt: '#d58185', skirtLight: '#f0a0a1',
  darkHair: '#5f5e54', hairShade: '#504f48', hairLight: '#9b9990',
  blue: '#98b9db', blueShade: '#789bc5', brown: '#b39a7f', brownShade: '#997d66',
  iris: '#365d95', eye: '#3d424e', wall: '#e0d0c8', board: '#88b5a1',
};
const materials = new Map();
let paintOrder = 0;
function material(color) {
  if (!materials.has(color)) materials.set(color, new THREE.MeshBasicMaterial({
    color, side: THREE.DoubleSide, depthTest: false, depthWrite: false,
  }));
  return materials.get(color);
}
const smooth = x => {const a = Math.max(0, Math.min(1, x)); return a * a * (3 - 2 * a);};
const mix = THREE.MathUtils.lerp;
const groups = [];
const deformation = [];
function layer(name, depth) {
  const group = new THREE.Group();
  group.name = name;
  group.position.z = depth;
  group.scale.setScalar((CAMERA_Z - depth) / CAMERA_Z);
  group.userData.nextZ = 0;
  scene.add(group);
  groups.push(group);
  return group;
}
function parsePath(data) {
  const tokens = data.match(/[MLCQZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi);
  const path = new THREE.Shape();
  let i = 0;
  const point = () => [Number(tokens[i++]) - 960, 540 - Number(tokens[i++])];
  while (i < tokens.length) {
    const op = tokens[i++];
    if (op === 'M') path.moveTo(...point());
    else if (op === 'L') path.lineTo(...point());
    else if (op === 'Q') path.quadraticCurveTo(...point(), ...point());
    else if (op === 'C') path.bezierCurveTo(...point(), ...point(), ...point());
    else if (op === 'Z') path.closePath();
    else throw new Error(`Unsupported path instruction ${op}`);
  }
  return path;
}
function registerGeometry(geometry, rig) {
  if (rig) deformation.push({geometry, original: geometry.attributes.position.array.slice(), rig});
}
function strokePath(parent, path, color = C.line, width = 2.8, rig) {
  const points = path.getPoints(18);
  const vertices = [], indices = [];
  for (let i = 0; i < points.length; i++) {
    const previous = points[Math.max(0, i - 1)], next = points[Math.min(points.length - 1, i + 1)];
    const dx = next.x - previous.x, dy = next.y - previous.y, length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length * width / 2, ny = dx / length * width / 2;
    vertices.push(points[i].x + nx, points[i].y + ny, 0, points[i].x - nx, points[i].y - ny, 0);
    if (i) {const k = i * 2; indices.push(k - 2, k - 1, k, k - 1, k + 1, k);}
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setIndex(indices);
  registerGeometry(geometry, rig);
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.renderOrder = paintOrder++;
  mesh.position.z = parent.userData.nextZ += 0.035;
  mesh.frustumCulled = false;
  parent.add(mesh);
  return mesh;
}
function path(parent, data, fill, rig, border = C.line, width = 2.8) {
  const shape = parsePath(data);
  const mesh = new THREE.Mesh(new THREE.ShapeGeometry(shape, 20), material(fill));
  mesh.renderOrder = paintOrder++;
  mesh.position.z = parent.userData.nextZ += 0.035;
  mesh.frustumCulled = false;
  registerGeometry(mesh.geometry, rig);
  parent.add(mesh);
  if (border) strokePath(parent, shape, border, width, rig);
  return mesh;
}
function line(parent, data, color = C.line, width = 2.6, rig) {
  const pieces = data.split(/(?=M)/).filter(Boolean);
  if (pieces.length > 1) return pieces.map(piece => strokePath(parent, parsePath(piece), color, width, rig));
  return strokePath(parent, parsePath(data), color, width, rig);
}
function ellipse(parent, x, y, rx, ry, fill, rig, border = C.line, width = 2.6) {
  const shape = new THREE.Shape();
  shape.absellipse(x - 960, 540 - y, rx, ry, 0, Math.PI * 2, false, 0);
  const object = new THREE.Mesh(new THREE.ShapeGeometry(shape, 24), material(fill));
  object.renderOrder = paintOrder++;
  object.position.z = parent.userData.nextZ += 0.035;
  object.frustumCulled = false;
  registerGeometry(object.geometry, rig);
  parent.add(object);
  if (border) strokePath(parent, shape, border, width, rig);
  return object;
}
function rect(parent, x, y, w, h, color, rig, border = C.line, stroke = 2.8) {
  return path(parent, `M${x} ${y} L${x+w} ${y} L${x+w} ${y+h} L${x} ${y+h} Z`, color, rig, border, stroke);
}
function groupAt(parent, name, x, y) {
  const group = new THREE.Group();
  group.name = name;
  group.position.set(x - 960, 540 - y, parent.userData.nextZ += 0.15);
  group.userData.nextZ = 0;
  group.userData.origin = [x, y];
  parent.add(group);
  return group;
}
function repositionPaths(group) {
  const [x, y] = group.userData.origin;
  for (const child of group.children) {
    if (child.isMesh) child.geometry.translate(-(x - 960), -(540 - y), 0);
    else if (child.isGroup) {
      child.position.x -= x - 960;
      child.position.y -= 540 - y;
    }
  }
}

const background = layer('classroom-wall-board-and-window', -220);
rect(background, -160, -80, 2250, 1300, C.wall, null, null);
rect(background, 260, 390, 1830, 600, '#b4c9b9', null, '#788b7d', 3);
rect(background, 278, 410, 1780, 650, C.board, null, '#5f8673', 6);
rect(background, 1, -40, 110, 1160, '#c4bbab', null, '#716e66', 3);
rect(background, 12, -40, 20, 1160, '#aab2a8', null, '#787c76', 2);
rect(background, 38, -40, 45, 1160, '#d9d2b9', null, null);
rect(background, 85, -40, 28, 1160, '#a7a6ac', null, '#787986', 2);
rect(background, -40, 232, 65, 20, '#ddd9b3', null, C.line, 3);
line(background, 'M258 -30 L259 279 M262 291 L259 388', '#8f847b', 2);
rect(background, 1808, 394, 17, 650, '#c3d3c4', null, '#85998c', 2);
rect(background, 343, 444, 439, 188, '#e8eee4', null, '#8eaa93', 3);
rect(background, 1055, 453, 125, 166, '#ebf0e5', null, '#779686', 2);
rect(background, 1185, 459, 201, 160, '#e4ede1', null, '#83a18e', 2);
rect(background, 1560, 479, 155, 145, '#f1f2e4', null, '#859e8a', 2);
rect(background, 1884, 450, 135, 98, '#e5ece0', null, '#a2b4a4', 2);
rect(background, 1871, 628, 156, 197, '#ebe9de', null, '#779786', 2);
rect(background, 1887, 650, 115, 14, '#cd7970', null, null);
for (const x of [350, 775, 1063, 1172, 1193, 1378, 1569, 1707]) {
  ellipse(background, x, x < 1000 ? 453 : x < 1400 ? 461 : 485, 3.2, 4.2, '#777d75', null, null);
}
let randomSeed = 8019;
function random() {randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0; return randomSeed / 4294967296;}
for (let i = 0; i < 80; i++) {
  const x = 1074 + random() * 94, y = 474 + random() * 128;
  line(background, `M${x} ${y} l0 0`.replace('l0 0', `L${x + 2 + random() * 5} ${y}`), '#8a9c8e', 1);
}
for (const [x, y, length] of [[691,497,49],[687,513,62],[691,540,45],[647,576,96],
  [1206,481,143],[1206,491,128],[1206,501,136],[1206,516,116],[1206,549,148],[1206,559,147],
  [1220,569,125],[1663,505,25],[1666,519,23],[1663,535,26],[1665,552,22],[1665,569,23]]) {
  line(background, `M${x} ${y} L${x + length} ${y}`, '#849486', x > 1600 ? 4 : 1.5);
}
for (let i = 0; i < 45; i++) {
  const x = 270 + random() * 1520, y = 130 + random() * 250;
  line(background, `M${x} ${y} L${x + 1.5 + random() * 4} ${y + 5}`, '#c6bcb5', 1);
}

const observer = layer('center-observer', -35);
path(observer, 'M800 650 Q797 549 832 494 L901 451 L951 442 L1018 448 L1092 500 Q1122 548 1129 658 L1168 867 L991 921 L824 878 Z', C.cream);
path(observer, 'M879 464 L897 508 L925 530 L960 532 L1007 508 L1045 465 L1027 439 Q1002 443 972 462 L925 451 L899 437 Z', C.white);
path(observer, 'M871 478 L887 469 L915 515 L946 541 L929 560 Q891 533 871 478 Z', C.pink);
path(observer, 'M1050 472 L1076 485 Q1058 525 1023 557 L1001 543 L1032 511 Z', C.pink);
path(observer, 'M927 463 Q960 444 1002 465 L1011 482 Q967 466 927 484 Z', C.white);
path(observer, 'M930 476 Q967 459 1007 477 L1010 488 Q967 476 934 492 Z', C.pink);
path(observer, 'M953 594 L970 597 L971 858 L954 880 Z', C.white);
path(observer, 'M1026 556 L1070 556 L1074 595 L1030 595 Z', '#e9ddb7');
line(observer, 'M1030 566 L1071 566 M1032 578 L1072 578');
path(observer, 'M909 870 L1085 870 L1111 1088 L909 1088 Z', C.skirt);
for (const x of [935, 988, 1050]) rect(observer, x, 883, 17, 205, C.pink, null, null);
for (const y of [930, 1002, 1060]) rect(observer, 912, y, 194, 17, C.skirtLight, null, null);

const centerHead = groupAt(observer, 'blue-haired-observer-head', 970, 419);
path(centerHead, 'M838 296 Q838 249 814 260 Q771 271 773 333 L787 359 L801 360 L805 369 L815 365 L823 374 L833 367 Z', C.blue);
path(centerHead, 'M1090 294 Q1092 247 1122 260 Q1153 267 1165 324 L1153 333 L1146 331 L1142 344 L1131 342 L1123 353 L1100 355 Z', C.blue);
path(centerHead, 'M826 292 Q815 233 854 187 Q894 139 949 136 Q1025 132 1061 167 Q1102 208 1099 259 L1084 365 L1037 423 L993 443 L905 431 L867 397 L858 325 Z', C.blue);
path(centerHead, 'M868 285 L884 261 L885 298 L925 216 L916 268 L968 186 L989 272 L1001 267 L998 209 L1034 275 L1044 263 L1064 303 L1074 335 Q1074 382 1044 405 Q1018 428 969 428 Q918 427 890 405 Q868 387 864 342 Z', C.skin);
path(centerHead, 'M862 307 Q837 302 842 335 Q844 359 863 363 L868 344 Z', C.skin);
line(centerHead, 'M856 320 Q847 313 851 341 L860 346', '#8f7e63', 2.5);
path(centerHead, 'M1073 305 Q1093 301 1089 329 Q1088 350 1073 357 L1069 338 Z', C.skin);
line(centerHead, 'M1078 317 Q1085 312 1081 339', '#8f7e63', 2.5);
path(centerHead, 'M875 287 L889 256 L884 397 L871 414 Z', C.blue);
path(centerHead, 'M1050 287 L1063 298 L1059 386 L1049 416 Z', C.blue);
path(centerHead, 'M812 269 L840 254 L850 279 L825 292 L817 285 Z', '#b7a079');
path(centerHead, 'M1075 257 L1098 250 L1110 260 L1094 286 L1077 278 Z', '#b7a079');
line(centerHead, 'M821 267 L835 264 M826 274 L839 271 M1082 259 L1095 264 M1080 267 L1092 271', '#8e7c5c', 2);
const centerEyes = [];
for (const [x, y] of [[917, 322], [1016, 322]]) {
  const eye = groupAt(centerHead, `observer-eye-${x}`, x, y);
  ellipse(eye, x, y, 29, 34, '#fffff7', null, '#535653', 4);
  ellipse(eye, x+2, y+4, 18, 28, '#263f69', null, null);
  path(eye, `M${x-11} ${y+10} Q${x+3} ${y+37} ${x+15} ${y+9} L${x+15} ${y+20} Q${x+3} ${y+40} ${x-11} ${y+21} Z`, '#5277b3', null, null);
  ellipse(eye, x+9, y-14, 7.4, 9.3, '#f5fbfa', null, null);
  repositionPaths(eye);
  centerEyes.push(eye);
}
line(centerHead, 'M891 260 L940 279 M991 277 L1037 259', '#5b6058', 3);
line(centerHead, 'M956 409 Q968 403 981 409', '#858077', 2.8);
line(centerHead, 'M889 354 L890 357 M893 354 L894 358 M1040 354 L1041 358 M1044 354 L1045 358', '#d5aaa0', 3);
path(centerHead, 'M893 368 C902 378 902 381 897 380 C891 379 890 373 893 368 Z', '#e2d5b9', null, '#6f7469', 2);
repositionPaths(centerHead);

const leftBody = layer('left-long-haired-competitor', 15);
path(leftBody, 'M88 913 L270 887 L353 1088 L33 1098 Z', C.skirt);
for (const [x, y, w, h] of [[84,945,42,180],[163,935,30,170],[236,987,39,114],[45,992,258,22],[40,1061,272,22]]) {
  rect(leftBody, x, y, w, h, C.skirtLight, null, null);
}
line(leftBody, 'M123 953 L87 1083 M214 962 L231 1090 M296 964 L348 1088', '#866560', 2.5);
path(leftBody, 'M284 525 Q362 480 434 489 Q512 499 557 526 Q619 558 643 625 L666 718 L598 832 Q518 862 469 922 L314 1005 Q200 998 70 926 Z', C.cream);
path(leftBody, 'M70 914 Q153 951 227 963 Q310 983 393 955 L389 971 Q265 1015 137 969 L68 929 Z', C.white);
path(leftBody, 'M201 748 Q214 774 275 779 L353 784 L391 769 Q385 789 366 796 Q256 800 223 786 Z', C.creamShade, null, null);
path(leftBody, 'M353 610 Q329 655 331 700 Q302 703 270 712 L282 732 Q336 724 353 703 Z', '#e4d5a9', null, null);
path(leftBody, 'M443 856 Q473 829 514 838 L570 851 Q594 853 607 870 L594 879 L482 883 L439 878 Z', C.skin);
line(leftBody, 'M516 848 Q546 853 553 869 M536 842 Q565 851 572 870 M558 849 Q585 856 591 875', '#8c7d63', 2.5);
path(leftBody, 'M374 843 L436 829 L481 845 L475 877 L409 879 Z', C.white);
path(leftBody, 'M328 517 Q394 484 447 486 Q485 497 514 518 Q466 566 381 608 Q347 626 318 630 L302 611 Z', C.white);
path(leftBody, 'M332 520 Q390 490 438 492 L468 507 Q426 552 359 585 L315 601 Z', C.pink);
line(leftBody, 'M322 616 Q378 602 450 551', '#656a64', 2);
line(leftBody, 'M489 561 Q452 599 461 698 M469 571 Q448 603 455 673 M474 707 Q523 741 605 762', '#727164', 3);

const leftHead = groupAt(leftBody, 'left-head-and-long-hair', 602, 534);
path(leftHead, 'M226 699 Q208 675 224 626 Q247 573 293 532 Q347 475 365 394 Q387 304 414 256 Q456 192 533 193 Q620 183 673 226 Q722 268 720 332 L704 423 L660 451 L639 524 L587 555 Q560 563 530 541 L507 491 Q425 537 366 624 L287 701 L266 687 L256 720 L243 704 L234 730 Z', C.darkHair);
path(leftHead, 'M599 344 L651 315 L682 280 L681 332 L700 368 L688 411 L697 439 L710 460 Q693 511 659 530 Q631 546 600 527 Q581 512 578 485 L582 412 Z', C.skin);
path(leftHead, 'M673 260 Q686 288 675 311 L629 363 L641 322 L607 379 L600 519 L587 537 L565 517 L575 353 L612 291 Z', C.darkHair);
path(leftHead, 'M700 288 Q722 314 714 355 L696 384 L694 348 L685 328 Z', C.darkHair);
path(leftHead, 'M403 299 L424 269 L429 280 L463 262 L449 289 L431 302 L429 293 L409 319 Z', C.hairLight, null, null);
path(leftHead, 'M530 266 L544 269 L548 265 L558 279 L589 261 L582 276 L614 253 L597 284 L578 295 L560 289 L546 301 L530 286 Z', C.hairLight, null, null);
ellipse(leftHead, 493, 282, 6, 17, C.hairLight, null, null);
path(leftHead, 'M641 360 Q657 354 672 361 L667 409 Q659 431 650 421 Q644 406 641 360 Z', '#f9fbf4', null, C.line, 2.8);
path(leftHead, 'M648 363 L659 366 L660 405 Q658 423 653 424 L649 400 Z', '#393e40', null, null);
line(leftHead, 'M634 359 Q651 350 674 361', '#444b49', 4);
line(leftHead, 'M601 394 L626 394 M672 401 L681 398', '#747b70', 3);
ellipse(leftHead, 674, 427, 13, 31, C.skin, null, '#737a70', 2.7);
line(leftHead, 'M670 402 Q680 398 687 402', '#666e63', 2.4);
line(leftHead, 'M638 514 L646 515', '#887567', 2);
line(leftHead, 'M655 291 L683 302', '#696657', 2);
repositionPaths(leftHead);

const rightBody = layer('right-short-haired-competitor', 10);
path(rightBody, 'M1760 850 L1887 843 L1931 946 L1960 1121 L1665 1120 L1686 989 Z', C.skirt);
for (const [x, y, w, h] of [[1695,941,35,175],[1778,891,33,209],[1866,897,36,225],
  [1713,929,230,23],[1701,1006,237,25],[1688,1077,262,22]]) rect(rightBody, x, y, w, h, C.skirtLight, null, null);
line(rightBody, 'M1751 941 L1739 1088 M1822 883 L1848 1098 M1903 926 L1941 1088', '#86635f', 3);
path(rightBody, 'M1428 470 Q1492 445 1561 462 Q1644 486 1684 569 Q1719 624 1731 686 L1808 747 L1880 789 Q1871 826 1837 847 Q1781 851 1739 894 L1681 1005 Q1612 1016 1532 975 L1443 882 L1299 792 L1260 680 L1291 575 Z', C.cream);
path(rightBody, 'M1619 1009 L1669 1000 Q1708 957 1741 898 Q1790 849 1840 846 Q1876 830 1881 791 L1867 785 Q1859 822 1830 831 Q1768 830 1728 878 L1660 982 L1609 991 Z', C.white);
path(rightBody, 'M1709 727 L1678 739 L1762 754 L1797 742 Z', C.creamShade, null, null);
path(rightBody, 'M1451 492 L1470 465 Q1490 457 1515 461 L1491 493 Q1475 525 1470 572 L1461 637 L1417 689 L1380 685 L1316 637 L1285 570 L1298 533 L1322 548 L1345 599 L1406 636 L1434 613 Z', C.white);
path(rightBody, 'M1466 482 L1482 469 L1459 548 L1448 622 L1419 668 L1402 677 L1377 664 L1319 613 L1305 575 L1314 555 L1337 602 L1390 651 L1407 656 L1431 617 L1444 535 Z', C.pink);
path(rightBody, 'M1363 580 L1417 564 L1426 602 L1374 622 Z', C.white);
path(rightBody, 'M1366 592 L1422 578 L1425 590 L1370 608 Z', C.pink);
const bowStart = rightBody.children.length;
path(rightBody, 'M1390 681 Q1405 678 1418 689 L1441 711 L1450 749 L1425 770 L1403 787 L1384 776 L1363 765 L1342 757 L1355 714 L1370 688 Z', C.pink);
line(rightBody, 'M1385 695 L1372 749 M1407 699 L1402 759 M1415 708 L1427 738 M1382 776 L1383 804', '#8d6869', 3);
const bowMeshes = rightBody.children.slice(bowStart);
line(rightBody, 'M1520 526 Q1548 519 1612 523 M1543 618 Q1616 641 1639 678 M1651 611 Q1622 639 1601 652 M1672 773 L1598 776', '#797466', 3);

const rightHead = groupAt(rightBody, 'right-head-and-mouth', 1416, 561);
path(rightHead, 'M1204 388 Q1192 334 1220 274 Q1253 204 1334 198 Q1421 182 1474 222 Q1536 266 1531 330 L1519 393 Q1510 436 1559 430 L1534 458 L1538 486 L1507 477 L1484 489 L1450 478 L1373 487 L1263 445 Z', C.brown);
path(rightHead, 'M1263 274 Q1276 321 1294 342 L1321 324 L1325 351 L1367 362 L1384 352 Q1404 329 1422 343 L1452 382 Q1453 421 1423 439 L1405 463 L1383 493 L1389 561 L1347 583 L1301 541 Q1266 530 1241 499 Q1212 471 1218 438 L1235 421 L1237 399 L1222 378 L1240 331 Z', C.skin);
path(rightHead, 'M1261 263 Q1262 304 1286 331 L1315 352 L1303 311 L1326 340 L1369 366 L1374 390 L1384 354 L1402 343 L1410 343 Q1377 305 1380 270 Z', C.brown);
path(rightHead, 'M1216 307 L1242 305 L1237 354 L1201 404 L1203 367 Z', C.brown);
path(rightHead, 'M1477 331 Q1487 385 1467 442 L1458 494 L1410 512 L1422 490 L1430 456 Q1452 441 1453 417 Z', C.brown);
path(rightHead, 'M1405 351 Q1422 342 1436 366 Q1452 397 1429 421 Q1419 432 1404 429 L1393 400 L1395 372 Z', C.skin);
line(rightHead, 'M1404 395 Q1400 375 1412 360 Q1424 354 1431 382 M1408 399 Q1418 404 1423 415', '#8a7e67', 3);
line(rightHead, 'M1490 259 Q1517 283 1519 311 M1488 276 L1508 310 M1297 268 Q1304 292 1318 307', '#88715d', 2);
const rightEye = groupAt(rightHead, 'right-eye', 1287, 373);
path(rightEye, 'M1267 338 Q1285 326 1303 350 L1310 395 L1271 416 Q1269 384 1267 338 Z', '#fffdf1', null, C.line, 2.7);
path(rightEye, 'M1276 341 Q1285 337 1288 351 L1287 391 L1278 413 L1275 388 Z', '#333b3c', null, null);
line(rightEye, 'M1261 337 L1277 325 L1297 338', '#424640', 4);
repositionPaths(rightEye);
const mouth = groupAt(rightHead, 'right-speaking-mouth', 1313, 469);
path(mouth, 'M1268 471 Q1296 449 1319 429 Q1333 414 1347 438 Q1367 476 1347 502 Q1330 520 1302 512 Q1280 509 1268 493 Z', '#da7e7a', null, '#896a66', 3);
path(mouth, 'M1270 474 L1282 466 L1280 501 Q1268 498 1268 491 Z', '#76585b', null, null);
repositionPaths(mouth);
line(rightHead, 'M1325 399 L1327 402 M1331 398 L1333 402', '#d7aba0', 3);
repositionPaths(rightHead);

const arms = layer('connected-arm-wrestling-chain', 80);
const armRig = {dx: 0, dy: 0, roll: 0};
path(arms, 'M500 667 Q584 649 652 634 L685 638 L706 674 L746 719 L803 678 L852 620 L914 673 Q892 756 853 817 L826 866 Q802 881 770 872 L688 844 L631 821 Q592 796 538 790 L459 780', C.cream, 'left-arm');
line(arms, 'M647 652 Q670 682 665 706', C.line, 2.7, 'left-arm');
line(arms, 'M502 669 Q568 657 606 638', C.line, 2.7, 'left-arm');
line(arms, 'M566 778 Q656 773 706 810', C.line, 2.7, 'left-arm');
line(arms, 'M754 754 Q771 798 769 828', C.line, 2.7, 'left-arm');
path(arms, 'M796 664 L844 590 Q867 557 892 570 L938 631 Q952 660 967 690 L896 754 L836 711 Z', C.white, 'left-arm');
path(arms, 'M1511 655 Q1486 665 1439 683 L1370 702 Q1334 717 1299 739 Q1269 757 1228 733 L1151 651 L1091 629 L1024 723 L1137 836 Q1183 882 1215 875 Q1261 865 1326 812 L1456 764 L1521 711 Z', C.cream, 'right-arm');
path(arms, 'M1154 703 Q1166 740 1195 754 L1225 756 L1196 770 Q1174 758 1154 723 Z', C.creamShade, 'right-arm', null);
line(arms, 'M1209 835 Q1271 807 1303 784 M1316 766 Q1342 758 1373 735', '#797466', 2.6, 'right-arm');
path(arms, 'M967 656 Q994 612 1023 574 L1076 576 Q1121 611 1140 653 L1069 728 L1031 758 L982 715 Z', C.white, 'right-arm');
line(arms, 'M951 650 L975 666 M1024 598 L1078 663', '#8b8c83', 2, 'right-arm');

const grip = groupAt(arms, 'one-continuously-clasped-pair-of-hands', 964, 552);
path(grip, 'M889 565 Q877 553 885 540 L894 525 Q884 511 897 500 L917 483 Q936 470 952 489 Q968 477 986 485 L1009 503 L1023 526 L1017 552 Q1044 561 1035 581 Q1023 600 1001 613 L970 630 L946 611 L921 586 Z', C.skin);
path(grip, 'M948 491 Q971 482 988 479 Q1002 481 1012 491 Q1018 499 1007 509 L985 519 L1007 527 Q1024 518 1030 528 Q1035 539 1018 549 Q1041 544 1045 556 Q1049 569 1030 578 Q1044 579 1037 592 Q1026 604 1007 616 L976 630 Q952 640 934 624 L913 610 L889 579 Q886 566 897 558 Q908 553 918 565 L944 584 L941 570 L921 548 Q912 535 920 526 L950 537 L943 523 Q924 517 932 503 Z', C.skin);
path(grip, 'M920 526 Q905 527 900 515 Q894 501 904 493 Q914 487 927 499 L938 515 Q940 523 932 528 Z', C.skin);
path(grip, 'M901 548 Q886 542 885 530 Q886 520 894 518 Q904 519 914 535 Q922 547 914 553 Z', C.skin);
path(grip, 'M897 570 Q880 565 880 554 Q880 546 888 546 Q899 548 905 558 Q910 568 902 572 Z', C.skin);
line(grip, 'M949 491 Q942 507 957 511 L981 510 M950 537 L963 543 M1012 510 L1022 516 M973 624 Q978 619 983 615', '#9f8a71', 2.5);
repositionPaths(grip);
for (const detail of bowMeshes) detail.renderOrder = paintOrder++;

const table = layer('two-founded-desks-and-resting-hands', 100);
path(table, 'M206 877 L942 877 Q956 877 956 892 L956 908 Q955 922 938 922 L211 922 Q195 921 196 904 L196 892 Q196 879 206 877 Z', '#b4a17c', null, '#797560', 3);
path(table, 'M970 877 L1729 879 Q1744 879 1744 898 L1744 911 Q1741 925 1727 925 L969 921 Q954 921 954 907 L954 891 Q955 878 970 877 Z', '#b4a17c', null, '#797560', 3);
path(table, 'M243 923 L910 923 L910 1088 L244 1088 Z', '#bdbeb8', null, '#767773', 3);
line(table, 'M281 1088 L288 981 Q298 951 328 951 L808 951 Q836 951 848 979 L848 1088 M523 953 L523 1003 M592 953 L592 1001', '#767773', 3);
path(table, 'M1010 923 L1688 925 L1688 1088 L1010 1088 Z', '#bdbeb8', null, '#767773', 3);
line(table, 'M1048 1088 L1053 982 Q1058 954 1095 954 L1580 954 Q1619 954 1632 986 L1633 1088 M1308 955 L1308 1000 M1371 954 L1371 1001', '#767773', 3);
for (const x of [554, 1336]) {
  line(table, `M${x-27} 1052 C${x-48} 1077 ${x-36} 1000 ${x-4} 998 C${x+31} 992 ${x+37} 1037 ${x+37} 1060 C${x+21} 1080 ${x+29} 1011 ${x-2} 1006 C${x-22} 1005 ${x-27} 1034 ${x-27} 1052`, '#70756b', 4);
}
for (let i = 0; i < 105; i++) {
  const x = 209 + random() * 1510, y = 884 + random() * 14;
  line(table, `M${x} ${y} L${x + random() * 1.5} ${y + 5 + random() * 17}`, '#948666', 1.3);
}
path(table, 'M1459 711 L1541 753 L1587 780 L1511 919 Q1458 891 1397 855 L1369 812 Z', C.white);
line(table, 'M1457 729 Q1505 764 1542 780', '#adada0', 2);
path(table, 'M1395 818 Q1417 825 1436 845 L1478 880 Q1491 896 1467 918 L1459 952 Q1458 980 1443 976 Q1431 972 1425 953 Q1415 979 1398 970 L1380 958 Q1363 981 1347 971 L1332 961 Q1315 977 1309 963 Q1301 949 1311 920 L1321 888 L1332 859 Q1305 872 1293 867 Q1283 860 1291 850 L1316 832 Q1341 814 1361 811 Z', C.skin);
line(table, 'M1348 904 L1339 933 M1391 915 L1383 940 M1432 919 L1425 942 M1333 859 L1350 869', '#9d866a', 3);

const leftEyeClose = layer('left-blink-line', 16);
const leftClosed = line(leftEyeClose, 'M635 388 Q653 395 674 389', '#454b46', 4.0);
leftEyeClose.visible = false;
const centerBlinkLines = [];
for (const x of [917, 1016]) {
  const obj = line(centerHead, `M${x-25} 323 Q${x} 334 ${x+25} 323`, '#505955', 3.5);
  obj.geometry.translate(-(970-960), -(540-419), 0);
  obj.visible = false;
  centerBlinkLines.push(obj);
}

function bellPulse(t, middle, halfWidth) {
  const a = Math.abs(t - middle) / halfWidth;
  return a >= 1 ? 0 : Math.pow(1 - a * a, 2);
}
let diagnostics = {};
function applyArmDeformation(t) {
  const envelope = smooth(t / 0.55) * (1 - 0.30 * smooth((t - 4.1) / 1.0));
  armRig.dx = envelope * (31 * Math.sin(2 * Math.PI * t / 3.7) + 8 * Math.sin(2 * Math.PI * t / 1.85));
  armRig.dy = envelope * (-6 + 5 * Math.sin(2 * Math.PI * t / 2.4));
  armRig.roll = -armRig.dx / 420;
  for (const item of deformation) {
    const positions = item.geometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
      const x = item.original[i] + 960, y = 540 - item.original[i + 1];
      const weight = smooth((861 - y) / 279);
      positions[i] = item.original[i] + armRig.dx * weight;
      positions[i + 1] = item.original[i + 1] - armRig.dy * weight;
      positions[i + 2] = item.original[i + 2];
    }
    item.geometry.attributes.position.needsUpdate = true;
  }
  grip.position.x = 4 + armRig.dx;
  grip.position.y = -12 - armRig.dy;
  grip.rotation.z = armRig.roll;
}
function seek(value) {
  const t = animated ? Math.max(0, Math.min(LAST, Number(value))) : 0;
  const progress = smooth(t / LAST);
  const dolly = smooth((t - 0.25) / (LAST - 0.25));
  const truck = 140 * Math.sin(Math.PI * progress) - 55 * dolly;
  camera.position.set(truck, 60 * dolly, CAMERA_Z - 720 * dolly);
  camera.quaternion.identity();
  camera.updateProjectionMatrix();
  applyArmDeformation(t);
  const reaction = smooth(t / 0.8);
  leftHead.rotation.z = -0.007 * Math.sin(t * 2.1) * reaction;
  rightHead.rotation.z = 0.012 * Math.sin(t * 2.1 - 0.15) * reaction;
  centerHead.rotation.z = 0.006 * Math.sin(t * 1.5) * reaction;
  centerHead.position.y = 121 - 2.6 * Math.sin(t * 2.0) * reaction;
  mouth.scale.y = 1 - 0.36 * (0.5 - 0.5 * Math.cos(t * 5.2)) * reaction;
  const blink = Math.max(bellPulse(t, 1.90, 0.135), bellPulse(t, 4.18, 0.135));
  for (let i = 0; i < centerEyes.length; i++) {
    centerEyes[i].scale.y = Math.max(0.03, 1 - blink);
    centerEyes[i].visible = blink < 0.88;
    centerBlinkLines[i].visible = blink >= 0.88;
    for (const detail of centerEyes[i].children.slice(2)) {
      detail.position.x = 2.1 * Math.sin(t * 1.8) * reaction;
    }
  }
  rightEye.scale.y = Math.max(0.07, 1 - 0.93 * bellPulse(t, 3.30, 0.105));
  scene.updateMatrixWorld(true);
  camera.updateMatrixWorld(true);
  const gripScreen = grip.getWorldPosition(new THREE.Vector3()).project(camera);
  diagnostics = {
    seconds: t, actor_count: 3, image_generation_calls: 0, reference_textures: 0,
    camera_dolly_fraction: dolly * 0.24,
    camera_lateral_offset: truck,
    camera_vertical_offset: 60 * dolly,
    projected_grip_center: [(gripScreen.x + 1) * WIDTH / 2, (1 - gripScreen.y) * HEIGHT / 2],
    grip_center_image_coordinates: [964 + armRig.dx, 552 + armRig.dy],
    grip_separation: 0, planted_elbow_image_coordinates: [[797, 862], [1211, 869]],
    center_blink_fraction: blink, right_mouth_open_fraction: mouth.scale.y,
    ending: 'still-clasped-no-winner', reconstruction: 'editable-layered-geometric-meshes',
  };
  renderer.render(scene, camera);
}
window.reconstruction = {
  pause() {}, seek,
  getCameraState() {return {position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), fov: camera.fov};},
  getDiagnostics() {return structuredClone(diagnostics);},
  getSceneContract() {return {width: WIDTH, height: HEIGHT, fps: 24, frames: 124,
    depth_layers: groups.map(g=>({name:g.name,z:g.position.z})),
    reference_image_textures: 0, mode: animated ? 'curved-truck-and-closer-push-in' : 'static'};},
};
seek(0);
