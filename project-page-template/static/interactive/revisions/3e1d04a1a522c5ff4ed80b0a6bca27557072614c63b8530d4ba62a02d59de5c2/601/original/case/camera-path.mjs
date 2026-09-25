// Independent, camera-only trajectory. No scene state is modified here.
export function cameraAt(seconds) {
  const t = Math.max(0, Math.min(1, seconds / (123 / 24)));
  const a = .22, b = .26, distance = 1 - (a + b) / 2;
  const ramp = (v, span) => (v - span * Math.sin(Math.PI * v / span) / Math.PI) / 2;
  const u = t < a ? ramp(t, a) / distance : t > 1 - b ? 1 - ramp(1 - t, b) / distance : (t - a / 2) / distance;
  const start = [4, 2.8, 4.8], end = [0, 1.35, 6.4];
  const targetStart = [.7, 1.85, 0], targetEnd = [-.15, 1.65, 0];
  return {
    position: start.map((v, i) => v + (end[i] - v) * u + [.25, 0, .4][i] * Math.sin(Math.PI * u)),
    target: targetStart.map((v, i) => v + (targetEnd[i] - v) * u),
    fov: 50 - 2 * u
  };
}
