import { RESOLUTION_OPTIONS, type ResolutionPreset } from '../types/history';

interface ResolutionSelectorProps {
  value: ResolutionPreset;
  onChange: (resolution: ResolutionPreset) => void;
}

export function ResolutionSelector({ value, onChange }: ResolutionSelectorProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-muted">해상도 프리셋</label>
      <div className="flex gap-2">
        {RESOLUTION_OPTIONS.map((option) => {
          const isActive = option === value;
          return (
            <button
              key={option}
              type="button"
              className={`rounded-md border px-4 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
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
