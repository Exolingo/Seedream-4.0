import { useState } from 'react';
import { ASPECT_RATIO_OPTIONS, type AspectRatio } from '../types/history';

interface AspectSelectorProps {
  value: AspectRatio;
  onChange: (aspect: AspectRatio) => void;
}

function getIconBoxSize(ratio: string, box = 22) {
  const [w, h] = ratio.split(':').map(Number);
  if (!w || !h) return { width: box, height: box, aspectRatio: '1 / 1' as const };

  // 긴 변을 box에 맞추고 짧은 변은 비율대로
  if (w >= h) {
    return { width: box, height: (box * h) / w, aspectRatio: `${w} / ${h}` as const };
  }
  return { width: (box * w) / h, height: box, aspectRatio: `${w} / ${h}` as const };
}

/** 실제 비율 박스(테두리) */
function iconStyle(ratio: string): React.CSSProperties {
  const { width, height, aspectRatio } = getIconBoxSize(ratio);
  return {
    width,
    height,
    aspectRatio,
    border: '2px solid currentColor',
    borderRadius: 3,
    display: 'inline-block',
    flex: '0 0 auto',
  };
}

/** 중앙정렬 + 색상 래퍼: 고정 영역 안에서 아이콘을 center */
function RatioIcon({ ratio }: { ratio: string }) {
  return (
    <span className="ml-3 inline-flex h-8 w-8 items-center justify-center text-gray-700">
      <span style={iconStyle(ratio)} />
    </span>
  );
}

export function AspectSelector({ value, onChange }: AspectSelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative w-56">
      <label className="mb-2 block text-sm font-medium text-muted">화면 비율</label>

      {/* Trigger */}
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-md border bg-surface px-3 py-2 text-sm text-text hover:border-primary focus:outline-none focus:ring-2 focus:ring-primary leading-none"
        onClick={() => setOpen((p) => !p)}
      >
        <span className="truncate">{value}</span>
        <span className="flex items-center">
          <RatioIcon ratio={value} />
          <svg
            className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </button>

      {/* Dropdown */}
      {open && (
        <div
          role="listbox"
          className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-surface shadow-lg"
        >
          {ASPECT_RATIO_OPTIONS.map((option) => {
            const active = option === value;
            return (
              <button
                key={option}
                role="option"
                aria-selected={active}
                type="button"
                className={`flex h-10 w-full items-center justify-between px-3 text-sm leading-none transition
                  ${active ? 'bg-primary/10 text-primary' : 'text-text hover:bg-surface/70 hover:text-primary'}`}
                onClick={() => {
                  onChange(option);
                  setOpen(false);
                }}
              >
                <span className="truncate">{option}</span>
                <RatioIcon ratio={option} />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
