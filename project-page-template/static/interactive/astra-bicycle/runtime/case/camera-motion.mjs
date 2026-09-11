export const sourcePosition = [1.62252508, 1.64495293, 5.48961633];
export const sourceTarget = [.14081687, .84633413, 0];

export function cameraPose(time) {
  const u = Math.max(0, Math.min(10, time)) / 10;
  const progress = 359 * u + 7 * Math.sin(4 * Math.PI * u);
  const bearing = Math.atan2(sourcePosition[0] - sourceTarget[0],
    sourcePosition[2] - sourceTarget[2]) - progress * Math.PI / 180;
  const baseRadius = Math.hypot(sourcePosition[0] - sourceTarget[0],
    sourcePosition[2] - sourceTarget[2]);
  const radius = baseRadius * (1 + .16 * Math.sin(Math.PI * u) ** 2);
  const target = [sourceTarget[0], sourceTarget[1] + .12 * Math.sin(2 * Math.PI * u), 0];
  return {
    time,
    position: [
      target[0] + Math.sin(bearing) * radius,
      sourcePosition[1] + 3.7 * Math.sin(Math.PI * u) ** 2 + .25 * u,
      target[2] + Math.cos(bearing) * radius
    ],
    target,
    fov: 42,
    orbitProgressDegrees: progress
  };
}
