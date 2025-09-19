import type { AspectRatio, ResolutionPreset } from '../types/history';

const RESOLUTION_TO_LONG_SIDE: Record<ResolutionPreset, number> = {
  '480p': 854,
  '720p': 1280,
};

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
  const longSide = RESOLUTION_TO_LONG_SIDE[resolution];
  const isLandscape = ratioW >= ratioH;
  if (isLandscape) {
    const width = longSide;
    const height = Math.round((longSide * ratioH) / ratioW);
    return { width, height };
  }
  const height = longSide;
  const width = Math.round((longSide * ratioW) / ratioH);
  return { width, height };
}
