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
    <section aria-label="Prompt" className="rounded-xl border border-border bg-surface/80 p-4 transition-colors">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Prompt</h2>
          <p className="text-xs text-muted">
            Write a description for the {mode === 't2i' ? 'generated' : 'edited'} image. You can enhance it with
            ChatGPT and edit the enhanced version.
          </p>
        </div>
        <button
          type="button"
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/80 disabled:cursor-not-allowed disabled:bg-muted/40"
          onClick={onEnhance}
          disabled={enhancing || !rawPrompt.trim()}
        >
          {enhancing ? 'Enhancing…' : 'Enhance prompt'}
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 text-sm" role="tablist" aria-label="Prompt views">
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
          Original
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
          Enhanced
        </button>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <label className="flex flex-col gap-2" id="prompt-raw">
          <span className="text-sm font-medium text-muted">Original prompt</span>
          <textarea
            value={rawPrompt}
            onChange={(event) => onRawChange(event.target.value)}
            className={`min-h-[140px] rounded-md border border-border bg-background p-3 text-sm text-text placeholder:text-muted transition ${
              view === 'raw' ? 'ring-2 ring-primary' : ''
            }`}
            placeholder="Describe the scene you want to create"
          />
        </label>
        <label className="flex flex-col gap-2" id="prompt-enhanced">
          <span className="text-sm font-medium text-muted">Enhanced prompt</span>
          <textarea
            value={enhancedPrompt}
            onChange={(event) => onEnhancedChange(event.target.value)}
            className={`min-h-[140px] rounded-md border border-border bg-background p-3 text-sm text-text placeholder:text-muted transition ${
              view === 'enhanced' ? 'ring-2 ring-primary' : ''
            }`}
            placeholder="Enhanced prompt will appear here"
          />
        </label>
      </div>

      <div className="mt-3 rounded-md border border-border bg-surface/70 p-3 text-sm text-muted transition-colors">
        <p className="font-medium text-text">
          Currently highlighting: {view === 'raw' ? 'Original prompt' : 'Enhanced prompt'}
        </p>
        <p className="mt-1 text-xs text-muted">
          Toggle between the original and enhanced prompts to compare. The enhanced prompt is used for generation but
          you can edit it freely.
        </p>
      </div>

      {enhancementError && (
        <p className="mt-2 text-sm text-red-600 dark:text-red-400">{enhancementError}</p>
      )}
    </section>
  );
}
