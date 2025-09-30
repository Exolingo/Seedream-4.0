import type { AspectRatio } from '../types/history';
import type { ImageModel } from '../types/images';

export function injectAspectRatioIntoPrompt(
  model: ImageModel,
  prompt: string,
  aspectRatio: AspectRatio,
): string {
  if (model !== 'nano-banana') {
    return prompt;
  }

  const trimmedPrompt = prompt.trim();
  if (!trimmedPrompt) {
    return prompt;
  }

  const normalizedRatio = aspectRatio.trim();
  if (!normalizedRatio) {
    return trimmedPrompt;
  }

  if (trimmedPrompt.includes(normalizedRatio)) {
    return trimmedPrompt;
  }

  const containsHangul = /[\uAC00-\uD7AF]/.test(trimmedPrompt);
  if (containsHangul) {
    return `${trimmedPrompt}, ${normalizedRatio} 비율`;
  }

  return `${trimmedPrompt} with an aspect ratio of ${normalizedRatio}`;
}
