import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const expected = (process.env.APP_PASSWORD || '').trim();
  if (!expected) return res.status(500).json({ error: 'APP_PASSWORD not set' });

  const { password } = (req.body as { password?: string }) ?? {};
  if (typeof password !== 'string') return res.status(400).json({ error: 'password required' });

  if (password === expected) {
    return res.status(200).json({ ok: true });
  }
  return res.status(401).json({ error: 'invalid password' });
}
