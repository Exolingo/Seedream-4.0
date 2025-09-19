import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const upstream = await fetch(
      'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.ARK_API_KEY}`,
        },
        body: JSON.stringify(req.body),
      }
    );

    const data = await upstream.json();
    return res.status(upstream.status).json(data);
  } catch (err: any) {
    return res.status(500).json({ error: 'Proxy failed', detail: String(err) });
  }
}
