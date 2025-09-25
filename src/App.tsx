import { useEffect } from 'react';
import { ImageToImagePanel } from './components/ImageToImagePanel';
import LogoutButton from './components/LogoutButton';
import { ModelSelector } from './components/ModelSelector';
import { TextToImagePanel } from './components/TextToImagePanel';
import { HistoryDrawer } from './features/history/HistoryDrawer';
import { useAppStore } from './store/appStore';
import { applyTheme } from './theme/color';
import type { EditorTab, HistoryItem } from './types/history';

const tabs: { id: EditorTab; label: string; description: string }[] = [
  { id: 't2i', label: '텍스트 → 이미지', description: '프롬프트만으로 Seedream 4.0 이미지를 생성합니다.' },
  { id: 'i2i', label: '이미지 → 이미지', description: '원본 이미지를 업로드하고 참조 이미지로 합성합니다.' },
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
    if (typeof document === 'undefined' || typeof window === 'undefined') {
      return;
    }
    applyTheme(theme);
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.setAttribute('data-theme', theme);
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
            <h1 className="text-xl font-semibold">Seedream 4.0 스튜디오</h1>
            <p className="text-xs text-muted">
              텍스트와 이미지를 조합해 Seedream 4.0 결과물을 빠르게 시도해 보세요.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={toggleTheme}
              className="rounded-md border border-border px-3 py-1 text-sm transition hover:bg-surface/70"
              aria-label={`${theme === 'dark' ? '라이트' : '다크'} 모드로 전환`}
            >
              {theme === 'dark' ? '🌞 라이트 모드' : '🌙 다크 모드'}
            </button>
            <button
              type="button"
              onClick={toggleHistory}
              className="rounded-md border border-border px-3 py-1 text-sm transition hover:bg-surface/70"
            >
              히스토리
            </button>

            <span className="hidden sm:block h-5 w-px bg-border mx-1" aria-hidden="true" />
            <LogoutButton />

            <a
              href="https://www.byteplus.com/en/modelark"
              target="_blank"
              rel="noreferrer"
              className="rounded-md bg-primary px-3 py-1 text-sm font-medium text-primary-foreground transition hover:bg-primary/80"
            >
              ModelArk 공식문서
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 pb-12">
        <nav className="mt-8 flex flex-wrap items-center gap-3" aria-label="주요 탭">
          {/* 왼쪽: 탭 버튼 */}
          <div className="flex flex-wrap items-center gap-3">
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
          </div>

          {/* 오른쪽: 모델 선택 */}
          <div className="ml-auto shrink-0">
            <ModelSelector />
          </div>
        </nav>

        <section className="mt-8">
          {activeTab === 't2i' ? <TextToImagePanel /> : <ImageToImagePanel />}
        </section>
      </main>

      <HistoryDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        onSelect={handleSelectHistory}
      />
    </div>
  );
}
