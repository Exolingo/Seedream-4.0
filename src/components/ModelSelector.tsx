import { useAppStore } from '../store/appStore';
import type { ImageModel } from '../types/images';

export function ModelSelector() {
  const { model, setModel } = useAppStore((state) => ({ model: state.model, setModel: state.setModel }));

  const handleModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setModel(e.target.value as ImageModel);
  };

  return (
    <div>
      <label htmlFor="model-selector" className="block text-sm font-medium text-text">
        Generation Model
      </label>
      <select
        id="model-selector"
        value={model}
        onChange={handleModelChange}
        className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-indigo-500 focus:outline-none focus:ring-indigo-500 sm:text-sm"
      >
        <option value="seedream">Seedream 4.0</option>
        <option value="nano-banana">Nano Banana</option>
      </select>
    </div>
  );
}
