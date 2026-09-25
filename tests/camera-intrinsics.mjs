import assert from 'node:assert/strict';
import {cameraIntrinsics} from '../project-page-template/static/js/camera-intrinsics.mjs';

const perspective = {
  isPerspectiveCamera: true,
  projectionMatrix: {elements: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]},
  getEffectiveFOV: () => 40,
  aspect: 16 / 9,
  zoom: 1,
  near: 0.1,
  far: 100,
};
const perspectiveResult = cameraIntrinsics(perspective, 960, 540);
assert.equal(perspectiveResult.projection, 'perspective');
assert.ok(Math.abs(perspectiveResult.verticalFov - 40) < 1e-9);

const span = 3.8;
const aspect = 16 / 9;
const orthographic = {
  isOrthographicCamera: true,
  projectionMatrix: {
    elements: [2 / (span * aspect), 0, 0, 0, 0, 2 / span, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1],
  },
  left: -span * aspect / 2,
  right: span * aspect / 2,
  top: span / 2,
  bottom: -span / 2,
  zoom: 1,
  near: 0.05,
  far: 80,
};
const orthographicResult = cameraIntrinsics(orthographic, 960, 540);
assert.equal(orthographicResult.projection, 'orthographic');
assert.ok(Math.abs(orthographicResult.viewWidth - span * aspect) < 1e-9);
assert.ok(Math.abs(orthographicResult.viewHeight - span) < 1e-9);
assert.ok(Number.isFinite(orthographicResult.fx));
assert.ok(Number.isFinite(orthographicResult.fy));

console.log('PASS perspective and orthographic filming camera intrinsics.');
