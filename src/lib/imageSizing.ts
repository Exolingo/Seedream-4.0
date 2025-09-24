import type { AspectRatio, ResolutionPreset } from '../types/history';

const RESOLUTION_TO_LONG_SIDE: Record<ResolutionPreset, number> = {
  '480p': 854,
  '720p': 1280,
};

const MIN_PIXELS = 1280 * 720;
const MAX_DIMENSION = 6000;
const MIN_DIMENSION = 16;
const DIMENSION_STEP = 8;
const MIN_AR = 1 / 3;
const MAX_AR = 3;

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

function clampAspect(rw: number, rh: number): { rw: number; rh: number } {
  const ratio = rw / rh;
  if (ratio < MIN_AR) {
    return { rw: 1, rh: 3 };
  }
  if (ratio > MAX_AR) {
    return { rw: 3, rh: 1 };
  }
  return { rw, rh };
}

function scaleToReachPixels(rw: number, rh: number, targetPixels: number) {
  const k = Math.ceil(Math.sqrt(targetPixels / (rw * rh)));
  const width = rw * k;
  const height = rh * k;
  return { width, height };
}

export function computeDimensions(
  aspectRatio: AspectRatio,
  resolution: ResolutionPreset,
): { width: number; height: number } {
  // 1) 비율 파싱 및 제약 범위로 보정
  const { width: reqW, height: reqH } = parseAspectRatio(aspectRatio);
  const { rw, rh } = clampAspect(reqW, reqH); // 요청 비율 유지하되 1/3~3 범위로만 보정

  // 2) 프리셋 기준 긴 변 길이 결정 (여기서는 초기 목표치일 뿐, 최소 픽셀 보장 단계에서 재스케일됨)
  const targetLong = RESOLUTION_TO_LONG_SIDE[resolution] ?? 1280;
  const isLandscape = rw >= rh;

  // 3) 초기 폭/높이 계산 (요청 비율 유지)
  let width = isLandscape ? targetLong : Math.round(targetLong * (rw / rh));
  let height = isLandscape ? Math.round(targetLong * (rh / rw)) : targetLong;

  // 4) 최소 픽셀(720p) 보장: 부족하면 같은 비율로 스케일업
  const initialPixels = width * height;
  if (initialPixels < MIN_PIXELS) {
    const scaled = scaleToReachPixels(rw, rh, MIN_PIXELS);
    // 이때도 긴 변 기준을 유지하려면, 가로/세로 방향에 맞춰 조정
    if (isLandscape) {
      // 긴 변 = width
      const scale = Math.ceil(Math.max(MIN_PIXELS / initialPixels, scaled.width / width));
      width *= scale;
      height = Math.round(width * (rh / rw));
    } else {
      // 긴 변 = height
      const scale = Math.ceil(Math.max(MIN_PIXELS / initialPixels, scaled.height / height));
      height *= scale;
      width = Math.round(height * (rw / rh));
    }
  }

  // 5) 스냅(8픽셀 단위) → 제약 클램프 → 다시 최소 픽셀 재확인
  width = snapDimension(width);
  height = snapDimension(height);

  // 스냅/클램프 후 픽셀 수가 줄어들 수 있으므로, 부족하면 한 스텝씩 키움
  let pixels = width * height;
  if (pixels < MIN_PIXELS) {
    if (isLandscape) {
      // 가로를 한 스텝씩 늘리며 비율 유지
      while (pixels < MIN_PIXELS && width < MAX_DIMENSION) {
        width = snapDimension(width + DIMENSION_STEP);
        height = snapDimension(Math.round(width * (rh / rw)));
        pixels = width * height;
        if (width === MAX_DIMENSION) break;
      }
    } else {
      while (pixels < MIN_PIXELS && height < MAX_DIMENSION) {
        height = snapDimension(height + DIMENSION_STEP);
        width = snapDimension(Math.round(height * (rw / rh)));
        pixels = width * height;
        if (height === MAX_DIMENSION) break;
      }
    }
  }

  // 6) 최종 안전 클램프(혹시 모를 경계 이슈 방지)
  width = snapDimension(width);
  height = snapDimension(height);

  return { width, height };
}
