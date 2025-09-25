import { upload as uploadToBlob } from "@vercel/blob/client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useHistoryStore } from "../features/history/historyStore";
import {
  enhancePrompt,
  requestImageGeneration,
  type SeedreamImageToImageRequest,
} from "../lib/api";
import { createId } from "../lib/id";
import { prepareImageAsset } from "../lib/images";
import { computeDimensions } from "../lib/imageSizing";
import { useAppStore } from "../store/appStore";
import type {
  AspectRatio,
  HistoryItem,
  HistoryParams,
  ResolutionPreset,
} from "../types/history";
import type { ImageAsset, ImageValidationError } from "../types/images";
import { AspectSelector } from "./AspectSelector";
import { PreviewGrid } from "./PreviewGrid";
import { PromptBox } from "./PromptBox";
import { ResolutionSelector } from "./ResolutionSelector";

const REFERENCE_LIMIT = 8;

// 👉 Blob URL을 보관하기 위해 확장 타입
type BlobAsset = ImageAsset & { blobUrl?: string };

export function ImageToImagePanel() {
  const addHistory = useHistoryStore((state) => state.addItem);
  const { pendingHistory, setPendingHistory, model } = useAppStore((state) => ({
    pendingHistory: state.pendingHistory,
    setPendingHistory: state.setPendingHistory,
    model: state.model,
  }));

  const [sourceImage, setSourceImage] = useState<BlobAsset | null>(null);
  const [referenceImages, setReferenceImages] = useState<BlobAsset[]>([]);
  const [rawPrompt, setRawPrompt] = useState("");
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [resolution, setResolution] = useState<ResolutionPreset>("720p");

  const [uploadError, setUploadError] = useState<string | null>(null);
  const [images, setImages] = useState<{ url: string; size: string }[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | undefined>();
  const [enhancing, setEnhancing] = useState(false);
  const [enhancementError, setEnhancementError] = useState<
    string | undefined
  >();
  const [lastRequest, setLastRequest] =
    useState<SeedreamImageToImageRequest | null>(null);

  const generateControllerRef = useRef<AbortController | null>(null);
  const enhanceControllerRef = useRef<AbortController | null>(null);
  const uploadErrorTimeout = useRef<number | null>(null);

  const dimensions = useMemo(
    () => computeDimensions(aspectRatio, resolution),
    [aspectRatio, resolution]
  );

  useEffect(() => {
    if (!pendingHistory || pendingHistory.source !== "i2i") {
      return;
    }
    setRawPrompt(pendingHistory.promptRaw);
    setEnhancedPrompt(pendingHistory.promptEnhanced ?? "");
    setAspectRatio(pendingHistory.params.aspectRatio);
    setResolution(pendingHistory.params.resolution);
    setImages([]);
    setSourceImage(null);
    setReferenceImages([]);
    setLastRequest(null);
    setPendingHistory(null);
  }, [pendingHistory, setPendingHistory]);

  useEffect(() => () => generateControllerRef.current?.abort(), []);
  useEffect(() => () => enhanceControllerRef.current?.abort(), []);

  const handleEnhance = useCallback(async () => {
    if (!rawPrompt.trim()) return;
    enhanceControllerRef.current?.abort();
    const controller = new AbortController();
    enhanceControllerRef.current = controller;
    setEnhancing(true);
    setEnhancementError(undefined);
    try {
      const result = await enhancePrompt(
        { prompt: rawPrompt, mode: "i2i" },
        controller.signal
      );
      setEnhancedPrompt(result.enhanced);
    } catch (error) {
      if ((error as DOMException).name === "AbortError") return;
      setEnhancementError(
        (error as Error).message ?? "프롬프트 강화에 실패했습니다."
      );
    } finally {
      setEnhancing(false);
    }
  }, [rawPrompt]);

  const handleFileError = (error: ImageValidationError | Error) => {
    setUploadError(error.message);
    if (uploadErrorTimeout.current) {
      window.clearTimeout(uploadErrorTimeout.current);
    }
    uploadErrorTimeout.current = window.setTimeout(
      () => setUploadError(null),
      4000
    );
  };

  useEffect(() => {
    return () => {
      if (uploadErrorTimeout.current) {
        window.clearTimeout(uploadErrorTimeout.current);
      }
    };
  }, []);

  const dataUrlToFile = useCallback(
    async (filename: string, dataUrl: string): Promise<File> => {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const extFixed = filename.replace(/\.[^.]+$/, ".jpg");
      return new File([blob], extFixed, { type: blob.type || "image/jpeg" });
    },
    []
  );

  const toBlobUrl = useCallback(async (file: File): Promise<string> => {
    const result = await uploadToBlob(file.name, file, {
      access: "public",
      handleUploadUrl: "/api/blob/upload",
    });
    return result.url;
  }, []);

  const handleSourceChange = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const file = fileList[0];
      try {
        const asset = await prepareImageAsset(file);
        const uploadFile = await dataUrlToFile(file.name, asset.dataUrl);
        const blobUrl = await toBlobUrl(uploadFile);
        setSourceImage({ ...asset, blobUrl });
        setUploadError(null);
      } catch (error) {
        handleFileError(error as ImageValidationError | Error);
      }
    },
    [dataUrlToFile, toBlobUrl]
  );

  const handleReferenceChange = useCallback(
    async (fileList: FileList | null) => {
      if (!fileList?.length) return;
      const current = [...referenceImages];
      const availableSlots = REFERENCE_LIMIT - current.length;
      const files = Array.from(fileList).slice(0, availableSlots);

      const newAssets: BlobAsset[] = [];
      for (const file of files) {
        try {
          const asset = await prepareImageAsset(file);
          const uploadFile = await dataUrlToFile(file.name, asset.dataUrl);
          const blobUrl = await toBlobUrl(uploadFile);
          newAssets.push({ ...asset, blobUrl });
        } catch (error) {
          handleFileError(error as ImageValidationError | Error);
          break;
        }
      }
      setReferenceImages([...current, ...newAssets]);
    },
    [referenceImages, dataUrlToFile, toBlobUrl]
  );

  const removeReference = (id: string) => {
    setReferenceImages((images) => images.filter((item) => item.id !== id));
  };

  const moveReference = (id: string, direction: -1 | 1) => {
    setReferenceImages((images) => {
      const index = images.findIndex((item) => item.id === id);
      if (index < 0) return images;
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= images.length) return images;
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
        const response = await requestImageGeneration(
          payload,
          controller.signal
        );
        setImages(response.data);
        setLastRequest(payload);
        const historyParams: HistoryParams = {
          aspectRatio,
          resolution,
          width: payload.width ?? dimensions.width,
          height: payload.height ?? dimensions.height,
        };
        const historyItem: HistoryItem = {
          id: createId(),
          createdAt: Date.now(),
          source: "i2i",
          promptRaw: rawPrompt,
          promptEnhanced: enhancedPrompt || undefined,
          params: historyParams,
          thumb: response.data[0]?.url,
          url: response.data[0]?.url,
        };
        addHistory(historyItem);
      } catch (error) {
        if ((error as DOMException).name === "AbortError") return;
        setGenerateError(
          (error as Error).message ?? "이미지 생성에 실패했습니다."
        );
      } finally {
        setIsGenerating(false);
      }
    },
    [
      addHistory,
      aspectRatio,
      dimensions.height,
      dimensions.width,
      enhancedPrompt,
      rawPrompt,
      resolution,
    ]
  );

  const handleGenerate = useCallback(() => {
    const prompt = (enhancedPrompt || rawPrompt).trim();
    if (!prompt) {
      setGenerateError("프롬프트를 입력해주세요.");
      return;
    }
    if (!sourceImage?.blobUrl) {
      setGenerateError("원본 이미지를 업로드해주세요.");
      return;
    }

    const urls = [
      sourceImage.blobUrl,
      ...(referenceImages
        .map((item) => item.blobUrl)
        .filter(Boolean) as string[]),
    ];

    const payload: SeedreamImageToImageRequest = {
      model,
      prompt,
      width: dimensions.width,
      height: dimensions.height,
      aspect_ratio: aspectRatio,
      size: `${dimensions.width}x${dimensions.height}`,
      watermark: false,
      image: urls,
    };
    void runGeneration(payload);
  }, [
    aspectRatio,
    dimensions.height,
    dimensions.width,
    enhancedPrompt,
    model,
    rawPrompt,
    referenceImages,
    runGeneration,
    sourceImage,
  ]);

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
          mode="i2i"
          rawPrompt={rawPrompt}
          enhancedPrompt={enhancedPrompt}
          onRawChange={setRawPrompt}
          onEnhancedChange={setEnhancedPrompt}
          onEnhance={handleEnhance}
          enhancing={enhancing}
          enhancementError={enhancementError}
        />

        <section className="space-y-5 rounded-xl border border-border bg-surface/80 p-4 transition-colors">
          <div>
            <h3 className="text-sm font-semibold text-text">원본 이미지</h3>
            <p className="text-xs text-muted">
              JPEG 또는 PNG, 최대 10MB. 가로:세로 비율은 1:3~3:1 범위를
              권장합니다.
            </p>
            <div className="mt-2 rounded-lg border border-dashed border-border p-4">
              {sourceImage ? (
                <div className="space-y-2 text-sm">
                  <img
                    src={sourceImage.dataUrl}
                    alt="원본 이미지"
                    className="max-h-48 w-full rounded-md object-contain"
                  />
                  <div className="flex items-center justify-between text-xs text-muted">
                    <span>{sourceImage.name}</span>
                    <span>
                      {(sourceImage.size / 1024).toFixed(0)} KB ·{" "}
                      {sourceImage.width}×{sourceImage.height}
                      {sourceImage.blobUrl ? " · 업로드 완료" : ""}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="rounded-md border border-border px-3 py-1 text-xs transition hover:bg-surface/70"
                    onClick={() => setSourceImage(null)}>
                    이미지 교체
                  </button>
                </div>
              ) : (
                <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-border p-6 text-center text-sm text-muted transition hover:border-primary/70">
                  <span>이미지 선택</span>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(event) => {
                      void handleSourceChange(event.target.files);
                      if (event.target) {
                        event.target.value = "";
                      }
                    }}
                  />
                </label>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-text">
              레퍼런스 이미지 (선택)
            </h3>
            <p className="text-xs text-muted">
              스타일 가이드를 위해 최대 {REFERENCE_LIMIT}장까지 업로드할 수
              있습니다.
            </p>
            <div className="mt-2 space-y-3">
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-center text-sm text-muted transition hover:border-primary/70">
                <span>레퍼런스 이미지 추가</span>
                <input
                  type="file"
                  accept="image/png,image/jpeg"
                  multiple
                  className="hidden"
                  onChange={(event) => {
                    void handleReferenceChange(event.target.files);
                    if (event.target) {
                      event.target.value = "";
                    }
                  }}
                />
              </label>
              {referenceImages.length > 0 && (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {referenceImages.map((item, index) => (
                    <li
                      key={item.id}
                      className="rounded-lg border border-border bg-background p-2 transition-colors">
                      <img
                        src={item.dataUrl}
                        alt={`레퍼런스 ${index + 1}`}
                        className="h-32 w-full rounded-md object-cover"
                      />
                      <div className="mt-2 flex items-center justify-between text-xs text-muted">
                        <span>
                          {item.width}×{item.height}
                        </span>
                        <span>
                          {(item.size / 1024).toFixed(0)} KB
                          {item.blobUrl ? " · 업로드 완료" : ""}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <div className="flex gap-1">
                          <button
                            type="button"
                            className="rounded border border-border px-2 py-1 text-muted transition hover:bg-surface/70 hover:text-text"
                            onClick={() => moveReference(item.id, -1)}
                            disabled={index === 0}>
                            위로
                          </button>
                          <button
                            type="button"
                            className="rounded border border-border px-2 py-1 text-muted transition hover:bg-surface/70 hover:text-text"
                            onClick={() => moveReference(item.id, 1)}
                            disabled={index === referenceImages.length - 1}>
                            아래로
                          </button>
                        </div>
                        <button
                          type="button"
                          className="rounded border border-border px-2 py-1 text-red-500 transition hover:bg-surface/70 hover:text-red-400"
                          onClick={() => removeReference(item.id)}>
                          삭제
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {uploadError && (
            <p className="text-sm text-red-600 dark:text-red-400">
              {uploadError}
            </p>
          )}
        </section>

        <section className="space-y-5 rounded-xl border border-border bg-surface/80 p-4 transition-colors">
          <div className="grid gap-4 lg:grid-cols-2">
            <AspectSelector value={aspectRatio} onChange={setAspectRatio} />
            <ResolutionSelector value={resolution} onChange={setResolution} />
          </div>
          <div className="rounded-lg border border-dashed border-border p-3 text-sm text-muted">
            <span className="font-medium text-text">예상 해상도</span>
            <p className="mt-1">
              출력 결과는 약 {dimensions.width} × {dimensions.height} 픽셀로
              생성됩니다.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleGenerate}
              className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-muted/40"
              disabled={isGenerating}>
              {isGenerating ? "생성 중…" : "이미지 생성하기"}
            </button>
            {generateError && (
              <span className="text-sm text-red-600 dark:text-red-400">
                {generateError}
              </span>
            )}
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