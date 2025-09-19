import { create } from 'zustand';
import type { HistoryItem } from '../types/history';

export type EditorTab = 't2i' | 'i2i';

export type ThemePreference = 'light' | 'dark';

interface AppState {
  activeTab: EditorTab;
  historyOpen: boolean;
  pendingHistory: HistoryItem | null;
  theme: ThemePreference;
  setActiveTab: (tab: EditorTab) => void;
  toggleHistory: () => void;
  setHistoryOpen: (open: boolean) => void;
  setPendingHistory: (item: HistoryItem | null) => void;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 't2i',
  historyOpen: false,
  pendingHistory: null,
  theme: 'light',
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleHistory: () => set((state) => ({ historyOpen: !state.historyOpen })),
  setHistoryOpen: (open) => set({ historyOpen: open }),
  setPendingHistory: (item) => set({ pendingHistory: item }),
  setTheme: (theme) => set({ theme }),
  toggleTheme: () =>
    set((state) => ({
      theme: state.theme === 'light' ? 'dark' : 'light',
    })),
}));
