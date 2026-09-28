const keys = [
  { angle: 0, radius: 7, height: 4.3, target: [0, 2.9, 0] },
  { angle: 38, radius: 6.5, height: 4.9, target: [.03, 2.48, .08] },
  { angle: 76, radius: 5.7, height: 5.8, target: [.06, 1.97, .17] },
  { angle: 112, radius: 3.2, height: 8.2, target: [.08, 1.65, .30] },
  { angle: 148, radius: 2.4, height: 8.7, target: [.10, 1.40, .46] },
  { angle: 184, radius: 2.5, height: 8.4, target: [.12, 1.35, .55] },
  { angle: 220, radius: 2.9, height: 7.6, target: [.10, 1.42, .50] },
  { angle: 254, radius: 3.7, height: 6.8, target: [.08, 1.55, .40] },
  { angle: 288, radius: 4.5, height: 5.9, target: [.06, 1.75, .28] },
  { angle: 324, radius: 5.1, height: 5.1, target: [.05, 1.92, .20] },
  { angle: 360, radius: 5.7, height: 4.6, target: [.04, 2.0, .15] },
];

function interpolate(t, read) {
  const values = keys.map(read);
  const slopes = values.slice(1).map((value, i) => value - values[i]);
  const derivatives = values.map((_, i) => {
    if (i === 0) return slopes[0];
    if (i === values.length - 1) return slopes.at(-1);
    const a = slopes[i - 1], b = slopes[i];
    return a * b <= 0 ? 0 : 2 * a * b / (a + b);
  });
  const i = Math.min(keys.length - 2, Math.floor(t));
  const u = t - i, u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * values[i]
    + (u3 - 2 * u2 + u) * derivatives[i]
    + (-2 * u3 + 3 * u2) * values[i + 1]
    + (u3 - u2) * derivatives[i + 1];
}

export function cameraPose(time) {
  const t = Math.max(0, Math.min(10, time));
  const orbitProgressDegrees = interpolate(t, key => key.angle);
  const angle = orbitProgressDegrees * Math.PI / 180;
  const radius = interpolate(t, key => key.radius);
  const target = [0, 1, 2].map(axis => interpolate(t, key => key.target[axis]));
  return {
    time,
    orbitProgressDegrees,
    position: [
      target[0] + Math.sin(angle) * radius,
      interpolate(t, key => key.height),
      target[2] + Math.cos(angle) * radius,
    ],
    target,
    fov: 45,
  };
}

export const milestonePoses = Array.from({ length: 11 }, (_, time) => cameraPose(time));
