import { ASPECT_RATIO_OPTIONS, type AspectRatio } from '../types/history';

interface AspectSelectorProps {
  value: AspectRatio;
  onChange: (aspect: AspectRatio) => void;
}

export function AspectSelector({ value, onChange }: AspectSelectorProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-muted">화면 비율</label>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {ASPECT_RATIO_OPTIONS.map((option) => {
          const isActive = option === value;
          return (
            <button
              key={option}
              type="button"
              className={`rounded-md border px-3 py-2 text-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                isActive
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border bg-surface/70 text-text hover:border-primary/60 hover:text-primary'
              }`}
              onClick={() => onChange(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </div>
  );
}
