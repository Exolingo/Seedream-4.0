import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    let raw = (process.env.ARK_API_KEY || '').trim();
    if (!raw) return res.status(500).json({ error: 'ARK_API_KEY is missing (server env)' });
    if (raw.toLowerCase().startsWith('bearer ')) raw = raw.slice(7).trim();

    const upstream = await fetch(
      'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${raw}`,
        },
        body: JSON.stringify(req.body),
      }
    );

    const ct = upstream.headers.get('content-type') || '';
    const body = ct.includes('application/json') ? await upstream.json() : await upstream.text();
    return res.status(upstream.status).send(body);
  } catch (e: any) {
    return res.status(500).json({ error: 'Proxy failed', detail: String(e) });
  }
}
