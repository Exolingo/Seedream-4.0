import { useEffect, useMemo, useRef } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { useHistoryStore } from './historyStore';
import type { HistoryItem } from '../../types/history';

interface HistoryDrawerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
}

export function HistoryDrawer({ open, onClose, onSelect }: HistoryDrawerProps) {
  const { items, removeItem, clear } = useHistoryStore();
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const closeButton = closeButtonRef.current;
    closeButton?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open, onClose]);

  const sorted = useMemo(
    () => [...items].sort((a, b) => b.createdAt - a.createdAt),
    [items],
  );

  return (
    <div
      aria-hidden={!open}
      className={`fixed inset-0 z-40 transition ${open ? 'pointer-events-auto' : 'pointer-events-none'}`}
    >
      <div
        className={`absolute inset-0 bg-black/60 transition-opacity ${open ? 'opacity-100' : 'opacity-0'}`}
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="History"
        className={`absolute right-0 top-0 h-full w-full max-w-md transform bg-surface shadow-xl transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="flex h-full flex-col">
          <header className="flex items-center justify-between border-b border-border px-6 py-4">
            <h2 className="text-lg font-semibold">History</h2>
            <div className="flex items-center gap-2">
              {sorted.length > 0 && (
                <button
                  type="button"
                  className="rounded-md border border-border px-3 py-1 text-sm transition hover:bg-surface/70"
                  onClick={clear}
                >
                  Clear all
                </button>
              )}
              <button
                ref={closeButtonRef}
                type="button"
                className="rounded-md border border-border px-3 py-1 text-sm transition hover:bg-surface/70"
                onClick={onClose}
              >
                Close
              </button>
            </div>
          </header>
          <div className="flex-1 overflow-y-auto px-6 py-4">
            {sorted.length === 0 ? (
              <p className="text-sm text-muted">No history yet. Generate an image to see it here.</p>
            ) : (
              <ul className="space-y-4">
                {sorted.map((item) => (
                  <li key={item.id} className="rounded-lg border border-border bg-background p-4 transition-colors">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs uppercase tracking-wide text-muted">
                          {item.source === 't2i' ? 'Text to Image' : 'Image to Image'} ·{' '}
                          {formatDistanceToNow(item.createdAt, { addSuffix: true })}
                        </p>
                        <p className="mt-2 max-h-20 overflow-hidden text-sm text-text">
                          {item.promptEnhanced ?? item.promptRaw}
                        </p>
                        <p className="mt-2 text-xs text-muted">
                          {item.params.aspectRatio} · {item.params.resolution} · {item.params.width}×
                          {item.params.height}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="text-xs text-muted transition hover:text-red-500"
                        onClick={() => removeItem(item.id)}
                        aria-label="Remove from history"
                      >
                        Delete
                      </button>
                    </div>
                    {item.thumb && (
                      <img
                        src={item.thumb}
                        alt="History thumbnail"
                        className="mt-3 h-32 w-full rounded-md object-cover"
                      />
                    )}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition hover:bg-primary/80"
                        onClick={() => onSelect(item)}
                      >
                        Load settings
                      </button>
                      {item.url && (
                        <a
                          className="rounded-md border border-border px-3 py-1 text-xs transition hover:bg-surface/70"
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                        >
                          Open image
                        </a>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}
