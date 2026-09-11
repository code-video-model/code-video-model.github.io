export const INSPECTOR_HORIZONTAL_FOV = 65;

export function verticalFov(horizontalDegrees, aspect) {
  if (!(aspect > 0) || !Number.isFinite(aspect)) throw new RangeError('Invalid camera aspect');
  return 2 * Math.atan(Math.tan(horizontalDegrees * Math.PI / 360) / aspect) * 180 / Math.PI;
}

export function perspectiveIntrinsics(camera, width, height) {
  const matrix = camera.projectionMatrix.elements;
  const vertical = camera.getEffectiveFOV();
  return {
    verticalFov: vertical,
    horizontalFov: 2 * Math.atan(Math.tan(vertical * Math.PI / 360) * camera.aspect) * 180 / Math.PI,
    aspect: camera.aspect,
    zoom: camera.zoom,
    near: camera.near,
    far: camera.far,
    width, height,
    fx: matrix[0] * width / 2,
    fy: matrix[5] * height / 2,
    cx: (1 - matrix[8]) * width / 2,
    cy: (1 + matrix[9]) * height / 2,
  };
}
