export type ThemeName = 'light' | 'dark';

type ThemeColorTokens = {
  background: string;
  surface: string;
  border: string;
  muted: string;
  text: string;
};

const hexToRgbChannels = (hex: string): string => {
  const normalized = hex.replace('#', '');
  const value = normalized.length === 3
    ? normalized
        .split('')
        .map((char) => char + char)
        .join('')
    : normalized;
  const numeric = Number.parseInt(value, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `${r} ${g} ${b}`;
};

const setColorVariable = (name: string, value: string) => {
  if (typeof document === 'undefined') {
    return;
  }
  document.documentElement.style.setProperty(`--color-${name}`, value);
};

export const PRIMARY_COLORS = {
  primary: '#2563eb',
  primaryForeground: '#f8fafc',
} as const;

export const THEME_COLORS: Record<ThemeName, ThemeColorTokens> = {
  light: {
    background: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    muted: '#64748b',
    text: '#0f172a',
  },
  dark: {
    background: '#020817',
    surface: '#0f172a',
    border: '#1e293b',
    muted: '#94a3b8',
    text: '#e2e8f0',
  },
};

export function applyTheme(theme: ThemeName) {
  const colors = THEME_COLORS[theme];
  const entries: Array<[string, string]> = [
    ['primary', hexToRgbChannels(PRIMARY_COLORS.primary)],
    ['primary-foreground', hexToRgbChannels(PRIMARY_COLORS.primaryForeground)],
    ['background', hexToRgbChannels(colors.background)],
    ['surface', hexToRgbChannels(colors.surface)],
    ['border', hexToRgbChannels(colors.border)],
    ['muted', hexToRgbChannels(colors.muted)],
    ['text', hexToRgbChannels(colors.text)],
  ];

  entries.forEach(([token, value]) => setColorVariable(token, value));
}
