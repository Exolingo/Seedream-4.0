import { useEffect, useState } from 'react';

interface PromptBoxProps {
  mode: 't2i' | 'i2i';
  rawPrompt: string;
  enhancedPrompt: string;
  onRawChange: (value: string) => void;
  onEnhancedChange: (value: string) => void;
  onEnhance: () => void;
  enhancing: boolean;
  enhancementError?: string;
}

export function PromptBox({
  mode,
  rawPrompt,
  enhancedPrompt,
  onRawChange,
  onEnhancedChange,
  onEnhance,
  enhancing,
  enhancementError,
}: PromptBoxProps) {
  const [view, setView] = useState<'raw' | 'enhanced'>(enhancedPrompt ? 'enhanced' : 'raw');

  useEffect(() => {
    if (enhancedPrompt) {
      setView('enhanced');
    }
  }, [enhancedPrompt]);

  return (
    <section aria-label="프롬프트" className="rounded-xl border border-border bg-surface/80 p-4 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">프롬프트</h2>
          <p className="text-xs text-muted">
            {mode === 't2i'
              ? '생성하고 싶은 장면을 자세히 작성한 뒤 Seedream 4.0에 맞춰 강화해 보세요.'
              : '원본 이미지를 어떻게 바꾸고 싶은지 설명하고 Seedream 4.0에 맞게 다듬을 수 있습니다.'}
          </p>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-muted/40"
          onClick={onEnhance}
          disabled={enhancing || !rawPrompt.trim()}
        >
          {enhancing ? '강화 중…' : '⚡ Seedream 4.0 프롬프트 강화'}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm" role="tablist" aria-label="프롬프트 보기 전환">
        <button
          type="button"
          role="tab"
          aria-selected={view === 'raw'}
          aria-controls="prompt-raw"
          className={`rounded-md px-3 py-1 transition ${
            view === 'raw' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-text'
          }`}
          onClick={() => setView('raw')}
        >
          원본
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view === 'enhanced'}
          aria-controls="prompt-enhanced"
          className={`rounded-md px-3 py-1 transition ${
            view === 'enhanced' ? 'bg-primary/10 text-primary' : 'text-muted hover:text-text'
          }`}
          onClick={() => setView('enhanced')}
          disabled={!enhancedPrompt}
        >
          강화본
        </button>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2" id="prompt-raw">
          <span className="text-sm font-medium text-muted">원본 프롬프트</span>
          <textarea
            value={rawPrompt}
            onChange={(event) => onRawChange(event.target.value)}
            className={`min-h-[140px] rounded-md border border-border bg-background p-3 text-sm text-text placeholder:text-muted transition ${
              view === 'raw' ? 'ring-2 ring-primary' : ''
            }`}
            placeholder="생성하고 싶은 장면을 자세히 묘사해주세요"
          />
        </label>
        <label className="flex flex-col gap-2" id="prompt-enhanced">
          <span className="text-sm font-medium text-muted">강화된 프롬프트</span>
          <textarea
            value={enhancedPrompt}
            onChange={(event) => onEnhancedChange(event.target.value)}
            className={`min-h-[140px] rounded-md border border-border bg-background p-3 text-sm text-text placeholder:text-muted transition ${
              view === 'enhanced' ? 'ring-2 ring-primary' : ''
            }`}
            placeholder="프롬프트 강화 결과가 여기에 표시됩니다"
          />
        </label>
      </div>

      <div className="mt-3 rounded-md border border-border bg-surface/70 p-3 text-sm text-muted transition-colors">
        <p className="font-medium text-text">현재 강조: {view === 'raw' ? '원본 프롬프트' : '강화된 프롬프트'}</p>
        <p className="mt-1 text-xs text-muted">상단 탭에서 두 버전을 전환하며 비교해 보세요. 생성 시에는 강화된 프롬프트가 사용되지만 자유롭게 수정할 수 있습니다.</p>
      </div>

      {enhancementError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{enhancementError}</p>
      )}
    </section>
  );
}
