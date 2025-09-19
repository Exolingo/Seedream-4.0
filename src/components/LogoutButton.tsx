import { useCallback } from 'react';

export function logout() {
  sessionStorage.removeItem('auth_ok'); // 이 탭에서만 해제
  window.location.reload();             // AuthGate로 회귀
}

export default function LogoutButton({ className = '' }: { className?: string }) {
  const onClick = useCallback(() => {
    if (!confirm('로그아웃하시겠습니까?')) return;
    logout();
  }, []);

  return (
    <button
      type="button"
      onClick={onClick}
      title="로그아웃"
      aria-label="로그아웃"
      className={[
        'rounded-md border border-border px-3 py-1 text-sm transition',
        'hover:bg-surface/70',
        'hover:text-red-500 dark:hover:text-red-300',
        className,
      ].join(' ')}
    >
      🔒 로그아웃
    </button>
  );
}
