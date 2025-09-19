import { useEffect, useRef, useState } from 'react';
import type { GeneratedImage } from '../types/history';

interface PreviewGridProps {
  images: GeneratedImage[];
  loading: boolean;
  error?: string;
  onRegenerate?: () => void;
  className?: string;
}

export function PreviewGrid({ images, loading, error, onRegenerate, className = 'mt-6' }: PreviewGridProps) {
  const [selected, setSelected] = useState<GeneratedImage | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (selected) {
      const closeButton = closeButtonRef.current;
      const previous = document.activeElement as HTMLElement | null;
      closeButton?.focus();
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') {
          setSelected(null);
        }
      };
      document.addEventListener('keydown', onKeyDown);
      return () => {
        document.removeEventListener('keydown', onKeyDown);
        previous?.focus?.();
      };
    }
    return undefined;
  }, [selected]);

  return (
    <section className={`rounded-xl border border-border bg-surface/80 p-4 transition-colors ${className}`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">결과 미리보기</h2>
        {onRegenerate && (
          <button
            type="button"
            className="rounded-md border border-border px-3 py-1 text-sm transition hover:bg-surface/70 disabled:cursor-not-allowed disabled:opacity-70"
            onClick={onRegenerate}
            disabled={loading}
          >
            동일 조건 재생성
          </button>
        )}
      </div>

      {error && <p className="mt-2 text-sm text-red-600 dark:text-red-400">{error}</p>}

      {loading ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="h-48 animate-pulse rounded-lg bg-muted/30" />
          ))}
        </div>
      ) : images.length === 0 ? (
        <p className="mt-4 text-sm text-muted">아직 생성된 이미지가 없습니다. 왼쪽에서 설정을 선택하고 이미지를 만들어보세요.</p>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${index}`}
              type="button"
              className="group relative overflow-hidden rounded-lg border border-border transition hover:border-primary/60"
              onClick={() => setSelected(image)}
            >
              <img src={image.url} alt="생성된 이미지" className="h-48 w-full object-cover transition group-hover:scale-105" />
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 text-xs text-primary-foreground">
                {image.size}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6">
          <div className="relative w-full max-w-4xl">
            <button
              ref={closeButtonRef}
              type="button"
              className="absolute right-4 top-4 rounded-md border border-border bg-surface/80 px-3 py-1 text-sm transition hover:bg-surface"
              onClick={() => setSelected(null)}
            >
              닫기
            </button>
            <img src={selected.url} alt="미리보기" className="max-h-[70vh] w-full rounded-lg object-contain" />
            <div className="mt-3 flex items-center justify-between text-sm text-muted">
              <span>{selected.size}</span>
              <a
                href={selected.url}
                target="_blank"
                rel="noreferrer"
                className="rounded-md border border-border px-3 py-1 transition hover:bg-surface"
              >
                새 탭에서 열기
              </a>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
