const radii = [12.41, 13.5, 15.7, 16.2, 16.6, 16.6, 17.3, 18.8, 17.6, 15.0, 12.8];
const heights = [1.732, 2.7, 4.0, 5.0, 6.2, 7.5, 8.4, 6.8, 4.8, 3.0, 1.95];
const targetsX = [-1.242, -1.1, -.7, -.3, .1, .5, .3, -.2, -.65, -.95, -1.21];
const targetsY = [2.67, 2.4, 2.3, 2.2, 2.15, 2.0, 1.95, 2.0, 2.1, 2.3, 2.62];

function interpolate(values, t) { window.__bfTrace?.add(6);
  const i = Math.min(9, Math.floor(t)), u = t - i;
  const a = values[i], b = values[i + 1];
  const m0 = i === 0 ? b - a : (values[i + 1] - values[i - 1]) / 2;
  const m1 = i === 9 ? b - a : (values[i + 2] - values[i]) / 2;
  return (2*u*u*u - 3*u*u + 1)*a + (u*u*u - 2*u*u + u)*m0
    + (-2*u*u*u + 3*u*u)*b + (u*u*u - u*u)*m1;
}

export function cameraPose(seconds) {
  const time = Math.max(0, Math.min(10, seconds));
  const orbitProgressDegrees = 35.9 * time + 2.8 * Math.sin(time * Math.PI * .8);
  const angle = (-61.08 - orbitProgressDegrees) * Math.PI / 180;
  const radius = interpolate(radii, time);
  const tx = interpolate(targetsX, time), ty = interpolate(targetsY, time);
  return {
    time, orbitProgressDegrees,
    position: [tx + radius * Math.sin(angle), interpolate(heights, time), radius * Math.cos(angle)],
    target: [tx, ty, 0], fov: 47,
  };
}
