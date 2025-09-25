import { useAppStore } from '../store/appStore';
import type { ImageModel } from '../types/images';

export function ModelSelector() {
  const { model, setModel } = useAppStore((state) => ({
    model: state.model,
    setModel: state.setModel,
  }));

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value as ImageModel);
  };

  return (
    <div
      className="
        rounded-lg border px-4 py-3 bg-surface/60 text-left
        border-border shadow-sm w-full sm:w-[260px]
      "
    >
      {/* 타이틀 */}
      <div className="mb-2">
        <div className="font-semibold">모델 선택</div>
        <div className="text-xs text-muted">Generation Model</div>
      </div>

      {/* 드롭다운 */}
      <label htmlFor="model-selector" className="sr-only">
        모델 선택
      </label>
      <select
        id="model-selector"
        value={model}
        onChange={handleModelChange}
        className="
          block w-full rounded-md border bg-surface/80
          border-border px-3 py-2 text-sm
          focus:outline-none focus:ring-2 focus:ring-primary
          transition-colors
        "
      >
        <option value="seedream-4-0">Seedream 4.0</option>
        <option value="nano-banana">Nano Banana</option>
      </select>
    </div>
  );
}
