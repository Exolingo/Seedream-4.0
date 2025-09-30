import { create } from 'zustand';
import { persist, StateStorage } from 'zustand/middleware';
import type { HistoryItem } from '../../types/history';

const HISTORY_KEY = 'seedream.history.v1';
const HISTORY_LIMIT = 100;

interface HistoryState {
  items: HistoryItem[];
  addItem: (item: HistoryItem) => void;
  removeItem: (id: string) => void;
  clear: () => void;
}

const historyStorage: StateStorage = {
  getItem: (name) => localStorage.getItem(name),
  removeItem: (name) => localStorage.removeItem(name),
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        const state = JSON.parse(value);
        if (state.state.items?.length > 0) {
          // Keep the newest half of the items.
          const newItems = state.state.items.slice(0, Math.ceil(state.state.items.length / 2));
          const newValue = JSON.stringify({
            ...state,
            state: {
              ...state.state,
              items: newItems,
            },
          });
          try {
            localStorage.setItem(name, newValue);
          } catch (e2) {
            // If it still fails, clear the history.
            localStorage.removeItem(name);
          }
        } else {
          // No items to save, just clear.
          localStorage.removeItem(name);
        }
      } else {
        throw e;
      }
    }
  },
};

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
      storage: historyStorage,
    },
  ),
);
