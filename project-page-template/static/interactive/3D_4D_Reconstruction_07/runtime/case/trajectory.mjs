const radii = [7.6, 7.05, 8.4, 9.2, 8.2, 7.7, 7.05, 8.6, 10.0, 8.8, 7.8];
const heights = [4.05, 3.6, 4.8, 6.5, 7.15, 6.4, 3.65, 4.6, 6.8, 5.4, 4.4];
const fovs = [40, 45, 49, 52, 53, 51, 46, 50, 53, 49, 42];
const targetYs = [0.28, 0.65, 1.2, 2.8, 3.2, 2.2, 1.2, 2.0, 2.8, 1.3, 0.65];

function interpolate(values, t) { window.__bfTrace?.add(6);
  const i = Math.min(9, Math.floor(t)), u = t - i;
  const a = values[i], b = values[i + 1];
  const m0 = i === 0 ? b - a : (b - values[i - 1]) / 2;
  const m1 = i === 9 ? b - a : (values[i + 2] - a) / 2;
  return (2 * u ** 3 - 3 * u * u + 1) * a + (u ** 3 - 2 * u * u + u) * m0
    + (-2 * u ** 3 + 3 * u * u) * b + (u ** 3 - u * u) * m1;
}

export function cameraPose(time) {
  const t = Math.max(0, Math.min(10, time));
  const orbitProgressDegrees = 36 * t;
  const angle = (18 + orbitProgressDegrees) * Math.PI / 180;
  const radius = interpolate(radii, t);
  return {
    time: t,
    position: [-0.55 + Math.sin(angle) * radius, interpolate(heights, t), Math.cos(angle) * radius],
    target: [-0.55, interpolate(targetYs, t), 0],
    fov: interpolate(fovs, t),
    orbitProgressDegrees,
  };
}
