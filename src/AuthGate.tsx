import { useEffect, useState } from 'react';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [ok, setOk] = useState<boolean | null>(null);
  const [pw, setPw] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setOk(sessionStorage.getItem('auth_ok') === '1');
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErr(null);
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: pw }),
      });
      if (res.ok) {
        sessionStorage.setItem('auth_ok', '1'); // 이 탭에서만 유지됨
        setOk(true);
        setPw('');
      } else {
        setErr('비밀번호가 올바르지 않습니다.');
      }
    } catch (e) {
      setErr('로그인 요청에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (ok === null) return null; // 초기 플리커 방지
  if (ok) return <>{children}</>;

  return (
    <div className="fixed inset-0 grid place-items-center bg-black/60">
      <form onSubmit={onSubmit} className="w-full max-w-xs rounded-xl bg-white dark:bg-zinc-900 p-6 shadow-lg">
        <h1 className="mb-3 text-lg font-semibold">접속 비밀번호</h1>
        <input
          type="password"
          autoFocus
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          className="mb-2 w-full rounded-md border p-2"
          placeholder="Password"
        />
        {err && <p className="mb-2 text-sm text-red-500">{err}</p>}
        <button
          type="submit"
          disabled={loading || !pw}
          className="w-full rounded-md bg-black text-white py-2 disabled:opacity-50"
        >
          {loading ? '확인 중…' : '입장하기'}
        </button>
      </form>
    </div>
  );
}
