export type EditorTab = 't2i' | 'i2i';

export interface HistoryParams {
  aspectRatio: AspectRatio;
  resolution: ResolutionPreset;
  width: number;
  height: number;
  seed?: number;
  steps?: number;
  guidance?: number;
  watermark: boolean;
  stream: boolean;
  sequentialImageGeneration: 'disabled' | 'enabled';
}

export interface HistoryItem {
  id: string;
  createdAt: number;
  source: EditorTab;
  promptRaw: string;
  promptEnhanced?: string;
  params: HistoryParams;
  thumb?: string;
  url?: string;
}

export type AspectRatio =
  | '1:1'
  | '16:9'
  | '9:16'
  | '2:3'
  | '3:4'
  | '1:2'
  | '2:1'
  | '4:5'
  | '3:2'
  | '4:3';

export type ResolutionPreset = '480p' | '720p';

export const ASPECT_RATIO_OPTIONS: AspectRatio[] = [
  '1:1',
  '16:9',
  '9:16',
  '2:3',
  '3:4',
  '1:2',
  '2:1',
  '4:5',
  '3:2',
  '4:3',
];

export const RESOLUTION_OPTIONS: ResolutionPreset[] = ['480p', '720p'];

export interface GeneratedImage {
  url: string;
  size: string;
}
