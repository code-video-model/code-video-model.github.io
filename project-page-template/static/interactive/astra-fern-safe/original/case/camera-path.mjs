const progress = [0, 31, 65, 103, 139, 174, 207, 241, 277, 317, 360];
const radii = [8.8, 5.8, 7.3, 8.2, 8.4, 7.65, 7.85, 9.3, 9.0, 8.7, 8.8];
const heights = [3.0, 3.65, 1.65, 2.6, 5.1, 6.6, 5.8, 4.7, 3.45, 2.7, 3.1];
const targets = [3.0, 3.05, 3.1, 3.05, 2.95, 2.8, 2.8, 2.9, 3.05, 3.0, 3.0];
const fovs = [44, 82, 64, 53, 51, 52, 51, 49, 48, 47, 46];

function interpolate(values, t) {
  const i = Math.min(9, Math.floor(t)), u = t - i;
  const a = values[i], b = values[i + 1];
  const ma = i ? (b - values[i - 1]) / 2 : b - a;
  const mb = i < 9 ? (values[i + 2] - a) / 2 : b - a;
  return (2*u*u*u - 3*u*u + 1)*a + (u*u*u - 2*u*u + u)*ma
    + (-2*u*u*u + 3*u*u)*b + (u*u*u - u*u)*mb;
}

export function cameraPose(time) {
  const t = Math.max(0, Math.min(10, time));
  const degrees = interpolate(progress, t), angle = degrees * Math.PI / 180;
  const radius = interpolate(radii, t);
  return {
    time: t,
    position: [radius * Math.sin(angle), interpolate(heights, t), radius * Math.cos(angle)],
    target: [0, interpolate(targets, t), 0],
    fov: interpolate(fovs, t),
    orbitProgressDegrees: degrees,
  };
}
