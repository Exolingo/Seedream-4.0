import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AspectSelector } from './AspectSelector';
import { ResolutionSelector } from './ResolutionSelector';
import { PromptBox } from './PromptBox';
import { PreviewGrid } from './PreviewGrid';
import { computeDimensions } from '../lib/imageSizing';
import { enhancePrompt, requestImageGeneration, type SeedreamTextToImageRequest } from '../lib/api';
import { createId } from '../lib/id';
import { useHistoryStore } from '../features/history/historyStore';
import { useAppStore } from '../store/appStore';
import type { AspectRatio, HistoryItem, HistoryParams, ResolutionPreset } from '../types/history';

export function TextToImagePanel() {
  const addHistory = useHistoryStore((state) => state.addItem);
  const { pendingHistory, setPendingHistory, model } = useAppStore((state) => ({
    pendingHistory: state.pendingHistory,
    setPendingHistory: state.setPendingHistory,
    model: state.model,
  }));

  const [rawPrompt, setRawPrompt] = useState('');
  const [enhancedPrompt, setEnhancedPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [resolution, setResolution] = useState<ResolutionPreset>('720p');
  const [images, setImages] = useState<{ url: string; size: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | undefined>();
  const [enhancing, setEnhancing] = useState(false);
  const [enhancementError, setEnhancementError] = useState<string | undefined>();
  const [lastRequest, setLastRequest] = useState<SeedreamTextToImageRequest | null>(null);

  const generateControllerRef = useRef<AbortController | null>(null);
  const enhanceControllerRef = useRef<AbortController | null>(null);

  const dimensions = useMemo(() => computeDimensions(aspectRatio, resolution), [aspectRatio, resolution]);

  useEffect(() => {
    if (!pendingHistory || pendingHistory.source !== 't2i') {
      return;
    }
    setRawPrompt(pendingHistory.promptRaw);
    setEnhancedPrompt(pendingHistory.promptEnhanced ?? '');
    setAspectRatio(pendingHistory.params.aspectRatio);
    setResolution(pendingHistory.params.resolution);
    setLastRequest(null);
    setImages([]);
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
      const result = await enhancePrompt({ prompt: rawPrompt, mode: 't2i' }, controller.signal);
      setEnhancedPrompt(result.enhanced);
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') {
        return;
      }
      setEnhancementError((error as Error).message ?? '프롬프트 강화에 실패했습니다.');
    } finally {
      setEnhancing(false);
    }
  }, [rawPrompt]);

  const runGeneration = useCallback(
    async (payload: SeedreamTextToImageRequest) => {
      generateControllerRef.current?.abort();
      const controller = new AbortController();
      generateControllerRef.current = controller;
      setIsGenerating(true);
      setGenerateError(undefined);
      try {
        const response = await requestImageGeneration(payload, controller.signal);
        setImages(response.data);
        setLastRequest(payload);
        const historyParams: HistoryParams = {
          aspectRatio,
          resolution,
          width: payload.width ?? dimensions.width,
          height: payload.height ?? dimensions.height,
        };
        const isNano = model.startsWith("nano-banana");

        const historyItem: HistoryItem = {
          id: createId(),
          createdAt: Date.now(),
          source: 't2i',
          promptRaw: rawPrompt,
          promptEnhanced: enhancedPrompt || undefined,
          params: historyParams,
          // 나노바나나 모델은 생성 결과가 base64라 너무 길어서 히스토리에 저장하지 않음
          thumb: isNano ? undefined : response.data[0]?.url,
          url: isNano ? undefined : response.data[0]?.url,
        };
        addHistory(historyItem);
      } catch (error) {
        if ((error as DOMException).name === 'AbortError') {
          return;
        }
        setGenerateError((error as Error).message ?? '이미지 생성에 실패했습니다.');
      } finally {
        setIsGenerating(false);
      }
    },
    [addHistory, aspectRatio, dimensions.height, dimensions.width, enhancedPrompt, rawPrompt, resolution],
  );

  const handleGenerate = useCallback(() => {
    const prompt = (enhancedPrompt || rawPrompt).trim();
    if (!prompt) {
      setGenerateError('프롬프트를 입력해주세요.');
      return;
    }
    const payload: SeedreamTextToImageRequest = {
      model,
      prompt,
      width: dimensions.width,
      height: dimensions.height,
      aspect_ratio: aspectRatio,
      size: `${dimensions.width}x${dimensions.height}`,
      watermark: false,
    };
    void runGeneration(payload);
  }, [aspectRatio, dimensions.height, dimensions.width, enhancedPrompt, rawPrompt, runGeneration, model]);

  const handleRegenerate = useCallback(() => {
    if (lastRequest) {
      void runGeneration(lastRequest);
    } else {
      handleGenerate();
    }
  }, [handleGenerate, lastRequest, runGeneration]);

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)]">
      <div className="space-y-6">
        <PromptBox
          mode="t2i"
          rawPrompt={rawPrompt}
          enhancedPrompt={enhancedPrompt}
          onRawChange={setRawPrompt}
          onEnhancedChange={setEnhancedPrompt}
          onEnhance={handleEnhance}
          enhancing={enhancing}
          enhancementError={enhancementError}
        />

        <section className="space-y-5 rounded-xl border border-border bg-surface/80 p-4 transition-colors">
          <div className="grid gap-4 lg:grid-cols-2">
            <AspectSelector value={aspectRatio} onChange={setAspectRatio} />
            <ResolutionSelector value={resolution} onChange={setResolution} />
          </div>
          <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted">
            <span className="font-medium text-text">예상 해상도</span>
            <p className="mt-1">출력 결과는 약 {dimensions.width} × {dimensions.height} 픽셀로 생성됩니다.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-muted/40"
              disabled={isGenerating}
            >
              {isGenerating ? '생성 중…' : '이미지 생성하기'}
            </button>
            {generateError && <span className="text-sm text-red-600 dark:text-red-400">{generateError}</span>}
          </div>
        </section>
      </div>

      <PreviewGrid
        images={images}
        loading={isGenerating}
        error={generateError}
        onRegenerate={handleRegenerate}
        className="mt-0"
      />
    </div>
  );
}
