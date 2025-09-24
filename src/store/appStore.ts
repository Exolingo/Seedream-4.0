import { create } from 'zustand';
import type { HistoryItem } from '../types/history';
import type { ImageModel } from '../types/images';

export type EditorTab = 't2i' | 'i2i';

export type ThemePreference = 'light' | 'dark';

const THEME_STORAGE_KEY = 'seedream.theme';

const resolveInitialTheme = (): ThemePreference => {
  if (typeof window === 'undefined') {
    return 'light';
  }
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to read stored theme preference.', error);
  }
  const prefersDark = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches;
  return prefersDark ? 'dark' : 'light';
};

const persistTheme = (theme: ThemePreference) => {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn('Failed to persist theme preference.', error);
  }
};

interface AppState {
  activeTab: EditorTab;
  historyOpen: boolean;
  pendingHistory: HistoryItem | null;
  theme: ThemePreference;
  model: ImageModel;
  setActiveTab: (tab: EditorTab) => void;
  toggleHistory: () => void;
  setHistoryOpen: (open: boolean) => void;
  setPendingHistory: (item: HistoryItem | null) => void;
  setTheme: (theme: ThemePreference) => void;
  toggleTheme: () => void;
  setModel: (model: ImageModel) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeTab: 't2i',
  historyOpen: false,
  pendingHistory: null,
  theme: resolveInitialTheme(),
  model: 'seedream',
  setActiveTab: (tab) => set({ activeTab: tab }),
  toggleHistory: () => set((state) => ({ historyOpen: !state.historyOpen })),
  setHistoryOpen: (open) => set({ historyOpen: open }),
  setPendingHistory: (item) => set({ pendingHistory: item }),
  setTheme: (theme) => {
    persistTheme(theme);
    set({ theme });
  },
  toggleTheme: () =>
    set((state) => {
      const nextTheme: ThemePreference = state.theme === 'light' ? 'dark' : 'light';
      persistTheme(nextTheme);
      return { theme: nextTheme };
    }),
  setModel: (model) => set({ model }),
}));
