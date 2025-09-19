import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AspectSelector } from './AspectSelector';
import { ResolutionSelector } from './ResolutionSelector';
import { PromptBox } from './PromptBox';
import { PreviewGrid } from './PreviewGrid';
import { computeDimensions } from '../lib/imageSizing';
import { enhancePrompt, requestSeedreamImages, type SeedreamImageToImageRequest } from '../lib/api';
import { prepareImageAsset } from '../lib/images';
import { createId } from '../lib/id';
import type { ImageAsset, ImageValidationError } from '../types/images';
import { useHistoryStore } from '../features/history/historyStore';
import { useAppStore } from '../store/appStore';
import type { AspectRatio, HistoryItem, HistoryParams, ResolutionPreset } from '../types/history';

const REFERENCE_LIMIT = 8;

export function ImageToImagePanel() {
  const addHistory = useHistoryStore((state) => state.addItem);
  const { pendingHistory, setPendingHistory } = useAppStore((state) => ({
    pendingHistory: state.pendingHistory,
    setPendingHistory: state.setPendingHistory,
  }));

  const [sourceImage, setSourceImage] = useState<ImageAsset | null>(null);
  const [referenceImages, setReferenceImages] = useState<ImageAsset[]>([]);
  const [rawPrompt, setRawPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [resolution, setResolution] = useState<ResolutionPreset>('720p');
  const [seed, setSeed] = useState<number | undefined>();
  const [steps, setSteps] = useState<number>(30);
  const [guidance, setGuidance] = useState<number>(7);
  const [watermark, setWatermark] = useState(true);
  const [stream, setStream] = useState(false);
  const [sequential, setSequential] = useState<'disabled' | 'enabled'>('disabled');

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [images, setImages] = useState<{ url: string; size: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | undefined>();
  const [enhancing, setEnhancing] = useState(false);
  const [enhancementError, setEnhancementError] = useState<string | undefined>();
  const [lastRequest, setLastRequest] = useState<SeedreamImageToImageRequest | null>(null);

  const generateControllerRef = useRef<AbortController | null>(null);
  const enhanceControllerRef = useRef<AbortController | null>(null);
  const uploadErrorTimeout = useRef<number | null>(null);

  const dimensions = useMemo(() => computeDimensions(aspectRatio, resolution), [aspectRatio, resolution]);

  useEffect(() => {
    if (!pendingHistory || pendingHistory.source !== 'i2i') {
      return;
    }
    setRawPrompt(pendingHistory.promptRaw);
    setEnhancedPrompt(pendingHistory.promptEnhanced ?? '');
    setAspectRatio(pendingHistory.params.aspectRatio);
    setResolution(pendingHistory.params.resolution);
    setSeed(pendingHistory.params.seed);
    setSteps(pendingHistory.params.steps ?? 30);
    setGuidance(pendingHistory.params.guidance ?? 7);
    setWatermark(pendingHistory.params.watermark);
    setStream(pendingHistory.params.stream);
    setSequential(pendingHistory.params.sequentialImageGeneration);
    setImages([]);
    setSourceImage(null);
    setReferenceImages([]);
    setLastRequest(null);
    setPendingHistory(null);
  }, [pendingHistory, setPendingHistory]);

  useEffect(() => () => generateControllerRef.current?.abort(), []);
  useEffect(() => () => enhanceControllerRef.current?.abort(), []);

  const handleEnhance = useCallback(async () => {
    if (!rawPrompt.trim()) {
      return;
    }
    enhanceControllerRef.current?.abort();
    const controller = new AbortController();
    enhanceControllerRef.current = controller;
    setEnhancing(true);
    setEnhancementError(undefined);
    try {
      const result = await enhancePrompt({ prompt: rawPrompt, mode: 'i2i' }, controller.signal);
      setEnhancedPrompt(result.enhanced);
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') {
        return;
      }
      setEnhancementError((error as Error).message ?? 'Failed to enhance prompt.');
    } finally {
      setEnhancing(false);
    }
  }, [rawPrompt]);

  const handleFileError = (error: ImageValidationError | Error) => {
    setUploadError(error.message);
    if (uploadErrorTimeout.current) {
      window.clearTimeout(uploadErrorTimeout.current);
    }
    uploadErrorTimeout.current = window.setTimeout(() => setUploadError(null), 4000);
  };

  useEffect(() => {
    return () => {
      if (uploadErrorTimeout.current) {
        window.clearTimeout(uploadErrorTimeout.current);
      }
    };
  }, []);

  const handleSourceChange = useCallback(async (fileList: FileList | null) => {
    if (!fileList?.length) {
      return;
    }
    const file = fileList[0];
    try {
      const asset = await prepareImageAsset(file);
      setSourceImage(asset);
      setUploadError(null);
    } catch (error) {
      handleFileError(error as ImageValidationError | Error);
    }
  }, []);

  const handleReferenceChange = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) {
        return;
      }
      const current = [...referenceImages];
      const availableSlots = REFERENCE_LIMIT - current.length;
      const files = Array.from(fileList).slice(0, availableSlots);
      const newAssets: ImageAsset[] = [];
      for (const file of files) {
        try {
          const asset = await prepareImageAsset(file);
          newAssets.push(asset);
        } catch (error) {
          handleFileError(error as ImageValidationError | Error);
          break;
        }
      }
      setReferenceImages([...current, ...newAssets]);
    },
    [referenceImages],
  );

  const removeReference = (id: string) => {
    setReferenceImages((images) => images.filter((item) => item.id !== id));
  };

  const moveReference = (id: string, direction: -1 | 1) => {
    setReferenceImages((images) => {
      const index = images.findIndex((item) => item.id === id);
      if (index < 0) {
        return images;
      }
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= images.length) {
        return images;
      }
      const updated = [...images];
      const [item] = updated.splice(index, 1);
      updated.splice(newIndex, 0, item);
      return updated;
    });
  };

  const runGeneration = useCallback(
    async (payload: SeedreamImageToImageRequest) => {
      generateControllerRef.current?.abort();
      const controller = new AbortController();
      generateControllerRef.current = controller;
      setIsGenerating(true);
      setGenerateError(undefined);
      try {
        const response = await requestSeedreamImages(payload, controller.signal);
        setImages(response.data);
        setLastRequest(payload);
        const historyParams: HistoryParams = {
          aspectRatio,
          resolution,
          width: payload.width ?? dimensions.width,
          height: payload.height ?? dimensions.height,
          seed: payload.seed,
          steps: payload.steps,
          guidance: payload.guidance_scale,
          watermark: payload.watermark ?? true,
          stream: payload.stream ?? false,
          sequentialImageGeneration: payload.sequential_image_generation ?? 'disabled',
        };
        const historyItem: HistoryItem = {
          id: createId(),
          createdAt: Date.now(),
          source: 'i2i',
          promptRaw: rawPrompt,
          promptEnhanced: enhancedPrompt || undefined,
          params: historyParams,
          thumb: response.data[0]?.url,
          url: response.data[0]?.url,
        };
        addHistory(historyItem);
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') {
          return;
        }
        setGenerateError((error as Error).message ?? 'Failed to generate images.');
      } finally {
        setIsGenerating(false);
      }
    },
    [addHistory, aspectRatio, dimensions.height, dimensions.width, enhancedPrompt, rawPrompt, resolution],
  );

  const handleGenerate = useCallback(() => {
    const prompt = (enhancedPrompt || rawPrompt).trim();
    if (!prompt) {
      setGenerateError('Please provide a prompt.');
      return;
    }
    if (!sourceImage) {
      setGenerateError('Please upload a source image.');
      return;
    }
    const payload: SeedreamImageToImageRequest = {
      prompt,
      width: dimensions.width,
      height: dimensions.height,
      stream,
      watermark,
      sequential_image_generation: sequential,
      seed,
      steps,
      guidance_scale: guidance,
      image: sourceImage.dataUrl,
      references: referenceImages.map((item) => item.dataUrl),
    };
    void runGeneration(payload);
  }, [dimensions.height, dimensions.width, enhancedPrompt, guidance, rawPrompt, referenceImages, runGeneration, seed, sequential, sourceImage, steps, stream, watermark]);

  const handleRegenerate = useCallback(() => {
    if (lastRequest) {
      void runGeneration(lastRequest);
    } else {
      handleGenerate();
    }
  }, [handleGenerate, lastRequest, runGeneration]);

  return (
    <div className="space-y-6">
      <PromptBox
        mode="i2i"
        rawPrompt={rawPrompt}
        enhancedPrompt={enhancedPrompt}
        onRawChange={setRawPrompt}
        onEnhancedChange={setEnhancedPrompt}
        onEnhance={handleEnhance}
        enhancing={enhancing}
        enhancementError={enhancementError}
      />

      <section className="grid gap-6 rounded-xl border border-border bg-surface/80 p-4 transition-colors lg:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-semibold text-muted">Source image</label>
            <p className="text-xs text-muted">JPEG or PNG, up to 10MB. Aspect ratio must be between 1:3 and 3:1.</p>
            <div className="mt-2 rounded-lg border border-dashed border-border p-4">
              {sourceImage ? (
                <div className="space-y-2 text-sm">
                  <img src={sourceImage.dataUrl} alt="Source" className="max-h-48 w-full rounded-md object-contain" />
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{sourceImage.name}</span>
                    <span>
                      {(sourceImage.size / 1024).toFixed(0)} KB · {sourceImage.width}×{sourceImage.height}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 py-1 text-xs transition hover:bg-surface/70"
                    onClick={() => setSourceImage(null)}
                  >
                    Replace image
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-border p-6 text-center text-sm text-muted transition hover:border-primary/70">
                  <span>Select an image</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(event) => {
                      void handleSourceChange(event.target.files);
                      if (event.target) {
                        event.target.value = '';
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-muted">Reference images (optional)</label>
            <p className="text-xs text-muted">Add up to {REFERENCE_LIMIT} images to guide the style.</p>
            <div className="mt-2 space-y-3">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted transition hover:border-primary/70">
                <span>Add reference images</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void handleReferenceChange(event.target.files);
                    if (event.target) {
                      event.target.value = '';
                    }
                  }}
                />
              </label>
              {referenceImages.length > 0 && (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {referenceImages.map((item, index) => (
                    <li key={item.id} className="rounded-lg border border-border bg-background p-2 transition-colors">
                      <img src={item.dataUrl} alt={`Reference ${index + 1}`} className="h-32 w-full rounded-md object-cover" />
                      <div className="mt-2 flex items-center justify-between text-xs text-muted">
                        <span>{item.width}×{item.height}</span>
                        <span>{(item.size / 1024).toFixed(0)} KB</span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="rounded border border-border px-2 py-1 text-muted transition hover:bg-surface/70 hover:text-text"
                            onClick={() => moveReference(item.id, -1)}
                            disabled={index === 0}
                          >
                            Up
                          </button>
                          <button
                            type="button"
                            className="rounded border border-border px-2 py-1 text-muted transition hover:bg-surface/70 hover:text-text"
                            onClick={() => moveReference(item.id, 1)}
                            disabled={index === referenceImages.length - 1}
                          >
                            Down
                          </button>
                        </div>
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-red-500 transition hover:bg-surface/70 hover:text-red-400"
                          onClick={() => removeReference(item.id)}
                        >
                          Remove
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-4">
          <AspectSelector value={aspectRatio} onChange={setAspectRatio} />
          <ResolutionSelector value={resolution} onChange={setResolution} />
          <div>
            <h3 className="text-sm font-semibold">Dimensions</h3>
            <p className="text-sm text-muted">
              Output size will be approximately {dimensions.width} × {dimensions.height} pixels.
            </p>
          </div>
          <fieldset className="space-y-3 rounded-lg border border-border p-3">
            <legend className="px-2 text-sm font-semibold">Advanced parameters</legend>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="flex flex-col gap-1 text-sm">
                Seed
                <input
                  type="number"
                  value={seed ?? ''}
                  onChange={(event) => setSeed(event.target.value ? Number(event.target.value) : undefined)}
                  className="rounded-md border border-border bg-background p-2"
                  placeholder="Random"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Steps
                <input
                  type="number"
                  value={steps}
                  min={10}
                  max={150}
                  onChange={(event) => setSteps(Number(event.target.value))}
                  className="rounded-md border border-border bg-background p-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                Guidance
                <input
                  type="number"
                  value={guidance}
                  min={1}
                  max={20}
                  step={0.5}
                  onChange={(event) => setGuidance(Number(event.target.value))}
                  className="rounded-md border border-border bg-background p-2"
                />
              </label>
            </div>
          </fieldset>
          <fieldset className="space-y-2 rounded-lg border border-border p-3 text-sm">
            <legend className="px-2 text-sm font-semibold">Generation options</legend>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={watermark}
                onChange={(event) => setWatermark(event.target.checked)}
                className="h-4 w-4"
              />
              Add watermark
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={stream} onChange={(event) => setStream(event.target.checked)} className="h-4 w-4" />
              Stream (beta)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={sequential === 'enabled'}
                onChange={(event) => setSequential(event.target.checked ? 'enabled' : 'disabled')}
                className="h-4 w-4"
              />
              Enable sequential image generation
            </label>
          </fieldset>
        </div>
      </section>

      {uploadError && <p className="text-sm text-red-600 dark:text-red-400">{uploadError}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-muted/40"
          disabled={isGenerating}
        >
          {isGenerating ? 'Generating…' : 'Generate variations'}
        </button>
        {generateError && <span className="text-sm text-red-600 dark:text-red-400">{generateError}</span>}
      </div>

      <PreviewGrid images={images} loading={isGenerating} error={generateError} onRegenerate={handleRegenerate} />
    </div>
  );
}
