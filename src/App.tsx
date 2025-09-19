import { useEffect } from 'react';
import { TextToImagePanel } from './components/TextToImagePanel';
import { ImageToImagePanel } from './components/ImageToImagePanel';
import { useAppStore } from './store/appStore';
import type { EditorTab, HistoryItem } from './types/history';
import { HistoryDrawer } from './features/history/HistoryDrawer';
import { applyTheme } from './theme/color';

const tabs: { id: EditorTab; label: string; description: string }[] = [
  { id: 't2i', label: 'Text to Image', description: 'Generate high quality images from text prompts.' },
  { id: 'i2i', label: 'Image to Image', description: 'Remix existing images with prompts and references.' },
];

export default function App() {
  const {
    activeTab,
    setActiveTab,
    historyOpen,
    toggleHistory,
    setHistoryOpen,
    setPendingHistory,
    theme,
    setTheme,
    toggleTheme,
  } = useAppStore();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('tab');
    if (tab === 't2i' || tab === 'i2i') {
      setActiveTab(tab);
    }
  }, [setActiveTab]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }
    const storedTheme = window.localStorage.getItem('seedream.theme');
    if (storedTheme === 'light' || storedTheme === 'dark') {
      setTheme(storedTheme);
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(prefersDark ? 'dark' : 'light');
  }, [setTheme]);

  useEffect(() => {
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }
    applyTheme(theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
    window.localStorage.setItem('seedream.theme', theme);
  }, [theme]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set('tab', activeTab);
    const query = params.toString();
    const url = `${window.location.pathname}?${query}`;
    window.history.replaceState({}, '', url);
  }, [activeTab]);

  const handleSelectHistory = (item: HistoryItem) => {
    setHistoryOpen(false);
    setActiveTab(item.source);
    setPendingHistory(item);
  };

  return (
    <div className="min-h-screen bg-background text-text transition-colors">
      <header className="border-b border-border bg-surface/80 backdrop-blur transition-colors">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold">Seedream 4.0 Studio</h1>
            <p className="text-xs text-muted">Craft, iterate, and manage your AI-powered imagery workflows.</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md border border-border px-3 py-1 text-sm transition hover:bg-surface/70"
              aria-label={`Toggle ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? '🌞 Light mode' : '🌙 Dark mode'}
            </button>
            <button
              type="button"
              onClick={toggleHistory}
              className="rounded-md border border-border px-3 py-1 text-sm transition hover:bg-surface/70"
            >
              History
            </button>
            <a
              href="https://www.byteplus.com/en/modelark"
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              ModelArk Docs
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-12">
        <nav className="mt-8 flex flex-wrap items-center gap-3" aria-label="Primary">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-lg border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? 'border-primary bg-primary/10 text-primary shadow'
                    : 'border-border bg-surface/60 text-muted hover:border-primary/60 hover:text-primary'
                }`}
                aria-pressed={isActive}
              >
                <div className="font-semibold">{tab.label}</div>
                <div className="text-xs text-muted">{tab.description}</div>
              </button>
            );
          })}
        </nav>

        <section className="mt-8">
          {activeTab === 't2i' ? <TextToImagePanel /> : <ImageToImagePanel />}
        </section>
      </main>

      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} onSelect={handleSelectHistory} />
    </div>
  );
}
