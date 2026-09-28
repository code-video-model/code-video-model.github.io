export function hermite(a, b, da, db, u, duration) {
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * a + (u3 - 2 * u2 + u) * duration * da
    + (-2 * u3 + 3 * u2) * b + (u3 - u2) * duration * db;
}

export function cameraPose(timeline, seconds) {
  const t = Math.max(0, Math.min(timeline.duration, seconds));
  const knots = timeline.knots;
  const j = Math.min(knots.length - 2, Math.max(0, knots.findIndex(k => k.t >= t) - 1));
  const a = knots[j], b = knots[j + 1], duration = b.t - a.t, u = (t - a.t) / duration;
  const scalar = key => hermite(a[key], b[key], a[`${key}Rate`], b[`${key}Rate`], u, duration);
  const radius = scalar('radius'), azimuth = scalar('azimuth'), elevation = scalar('elevation');
  const az = azimuth * Math.PI / 180, el = elevation * Math.PI / 180;
  return {
    time: t, radius, azimuth, elevation,
    position: [radius * Math.cos(el) * Math.sin(az), radius * Math.sin(el), radius * Math.cos(el) * Math.cos(az)],
    target: a.target.map((value, i) => hermite(value, b.target[i], a.targetRate[i], b.targetRate[i], u, duration)),
    fieldOfViewDegrees: timeline.fieldOfViewDegrees,
  };
}
