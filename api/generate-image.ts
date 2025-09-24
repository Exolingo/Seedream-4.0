import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const { model, ...body } = req.body;

    let apiKey: string | undefined;
    let apiBase: string;

    if (model === 'nano-banana') {
      apiKey = process.env.VITE_NANO_API_KEY;
      apiBase = process.env.VITE_NANO_BASE || 'https://api.nanobanana.dev/v1/images/generations';
    } else {
      apiKey = process.env.VITE_ARK_API_KEY;
      apiBase = process.env.VITE_ARK_BASE || 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations';
    }

    if (!apiKey) return res.status(500).json({ error: 'API_KEY is missing for the selected model' });
    if (apiKey.toLowerCase().startsWith('bearer ')) apiKey = apiKey.slice(7).trim();

    const upstream = await fetch(apiBase, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const ct = upstream.headers.get('content-type') || '';
    const responseBody = ct.includes('application/json') ? await upstream.json() : await upstream.text();
    return res.status(upstream.status).send(responseBody);
  } catch (e: any) {
    return res.status(500).json({ error: 'Proxy failed', detail: String(e) });
  }
}
