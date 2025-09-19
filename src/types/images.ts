export interface ImageAsset {
  id: string;
  file: File;
  dataUrl: string;
  name: string;
  size: number;
  width?: number;
  height?: number;
}

export interface ImageValidationError {
  code: 'format' | 'size' | 'ratio' | 'count';
  message: string;
}
