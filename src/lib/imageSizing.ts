import type { AspectRatio, ResolutionPreset } from '../types/history';

const RESOLUTION_TO_LONG_SIDE: Record<ResolutionPreset, number> = {
  '480p': 854,
  '720p': 1280,
};

const MAX_DIMENSION = 1024;
const MIN_DIMENSION = 256;
const DIMENSION_STEP = 8;

function snapDimension(value: number): number {
  const maxStepValue = Math.floor(MAX_DIMENSION / DIMENSION_STEP) * DIMENSION_STEP;
  const minStepValue = Math.floor(MIN_DIMENSION / DIMENSION_STEP) * DIMENSION_STEP;
  if (!Number.isFinite(value) || value <= 0) {
    return minStepValue;
  }
  const clamped = Math.min(Math.max(value, minStepValue), maxStepValue);
  const snapped = Math.floor(clamped / DIMENSION_STEP) * DIMENSION_STEP;
  return Math.max(minStepValue, Math.min(snapped, maxStepValue));
}

export function parseAspectRatio(aspectRatio: AspectRatio): { width: number; height: number } {
  const [w, h] = aspectRatio.split(':').map(Number);
  if (!w || !h) {
    throw new Error(`Invalid aspect ratio: ${aspectRatio}`);
  }
  return { width: w, height: h };
}

export function computeDimensions(
  aspectRatio: AspectRatio,
  resolution: ResolutionPreset,
): { width: number; height: number } {
  const { width: ratioW, height: ratioH } = parseAspectRatio(aspectRatio);
  const baseLongSide = Math.min(RESOLUTION_TO_LONG_SIDE[resolution], MAX_DIMENSION);
  const isLandscape = ratioW >= ratioH;

  if (isLandscape) {
    const width = snapDimension(baseLongSide);
    const rawHeight = (width * ratioH) / ratioW;
    const height = snapDimension(rawHeight);
    return { width, height };
  }

  const height = snapDimension(baseLongSide);
  const rawWidth = (height * ratioW) / ratioH;
  const width = snapDimension(rawWidth);
  return { width, height };
}
