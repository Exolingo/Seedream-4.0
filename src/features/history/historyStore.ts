import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { HistoryItem } from '../../types/history';

const HISTORY_KEY = 'seedream.history.v1';
const HISTORY_LIMIT = 100;

interface HistoryState {
  items: HistoryItem[];
  addItem: (item: HistoryItem) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

export const useHistoryStore = create<HistoryState>()(
  persist(
    (set, get) => ({
      items: [],
      addItem: (item) => {
        const existing = get().items.filter((i) => i.id !== item.id);
        const items = [item, ...existing].slice(0, HISTORY_LIMIT);
        set({ items });
      },
      removeItem: (id) => {
        set({ items: get().items.filter((item) => item.id !== id) });
      },
      clear: () => set({ items: [] }),
    }),
    {
      name: HISTORY_KEY,
      version: 1,
    },
  ),
);
