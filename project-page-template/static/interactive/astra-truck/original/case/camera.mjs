export function cameraPose(seconds) {
  const t = Math.max(0, Math.min(10, seconds));
  const phase = t / 10 * Math.PI * 2;
  const progress = 35.9 * t + 5.6 * Math.sin(phase * 2);
  const returnSwell = t > 7.5 ? Math.sin(Math.PI * (t - 7.5) / 2.5) ** 2 : 0;
  const sourceCenterX = 1.07672562;
  const centerX = sourceCenterX - .75 * (1 - Math.cos(phase)) - .4 * returnSwell;
  const startX = Math.sin(.64438795) * 12.00453477 - sourceCenterX;
  const startZ = Math.cos(.64438795) * 12.00453477;
  const radius0 = Math.hypot(startX, startZ);
  const angle = Math.atan2(startX, startZ) + progress * Math.PI / 180;
  const radius = radius0 * (1 + .16 * (1 - Math.cos(phase))) * (1 + .10 * returnSwell);
  const height = 2.72971274 + 1.40 * (1 - Math.cos(phase)) + .45 * Math.sin(phase * 2);
  return {
    time: t,
    position: [centerX + Math.sin(angle) * radius, height, Math.cos(angle) * radius],
    target: [centerX, 1.86450045 + .12 * (1 - Math.cos(phase)), 0],
    fov: 33.70345173 + 2 * (1 - Math.cos(phase)) + returnSwell,
    orbitProgressDegrees: progress,
  };
}
