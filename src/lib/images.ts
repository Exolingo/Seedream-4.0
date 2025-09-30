import type { ImageAsset, ImageValidationError } from '../types/images';
import { createId } from './id';

const SUPPORTED_FORMATS = ['image/jpeg', 'image/png'];
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB
const MIN_RATIO = 1 / 3;
const MAX_RATIO = 3;

export async function prepareImageAsset(file: File): Promise<ImageAsset> {
  const validationError = await validateImageFile(file);
  if (validationError) {
    throw validationError;
  }
  const dataUrl = await fileToDataUrl(file);
  const { width, height } = await readImageSize(dataUrl);
  return {
    id: createId(),
    file,
    dataUrl,
    name: file.name,
    size: file.size,
    width,
    height,
  };
}

export async function validateImageFile(file: File): Promise<ImageValidationError | null> {
  if (!SUPPORTED_FORMATS.includes(file.type)) {
    return { code: 'format', message: 'Only JPEG and PNG files are supported.' };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { code: 'size', message: 'Images must be smaller than 4MB.' };
  }
  const dataUrl = await fileToDataUrl(file);
  const { width, height } = await readImageSize(dataUrl);
  const ratio = width / height;
  if (ratio < MIN_RATIO || ratio > MAX_RATIO) {
    return {
      code: 'ratio',
      message: 'Image aspect ratio must stay within 1:3 and 3:1.',
    };
  }
  return null;
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function readImageSize(src: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      resolve({ width: image.width, height: image.height });
    };
    image.onerror = () => reject(new Error('Could not load image.'));
    image.src = src;
  });
}
