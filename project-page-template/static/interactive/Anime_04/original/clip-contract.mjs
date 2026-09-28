export const DURATION = 6;
export const FPS = 30;
export const FRAME_COUNT = DURATION * FPS;

export function clipTime(seconds) {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) {
    throw new TypeError('Seek time must be a finite number of seconds');
  }
  return Math.max(0, Math.min(DURATION, seconds));
}
