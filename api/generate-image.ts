import type { VercelRequest, VercelResponse } from "@vercel/node";



type AnyBody = {
  size?: string; // "WxH" (예: "1280x720")
  width?: number; // 클라 기록용: 서버에서 제거
  height?: number; // 클라 기록용: 서버에서 제거
  aspect_ratio?: string; // 클라 기록용: 서버에서 제거
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any;
};

function toSizeString(w?: number, h?: number): string | undefined {
  if (!w || !h) return undefined;
  return `${Math.round(w)}x${Math.round(h)}`;
}

function normalizeSizeString(s?: string): string | undefined {
  if (!s) return undefined;
  const fixed = s.replace(/×/g, "x").trim();
  if (/^[12]K$|^4K$/i.test(fixed)) return fixed.toUpperCase();
  if (/^\d{2,5}x\d{2,5}$/i.test(fixed)) return fixed;
  return undefined;
}

function normalizeForArk(input: AnyBody): AnyBody {
  const body: AnyBody = { ...input };

  // 1) size 우선
  let size = normalizeSizeString(body.size);

  // 2) size가 없으면 width/height로 생성
  if (!size) {
    size = toSizeString(body.width, body.height);
  }

  // 3) 최종 바디: Ark에는 size만 전달 (메서드 혼용 금지)
  const rest = { ...body };
  delete rest.width;
  delete rest.height;
  delete rest.aspect_ratio;

  return {
    ...rest,
    ...(size ? { size } : {}), // size가 유효할 때만 포함
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('NANO_API_KEY:', process.env.NANO_API_KEY);
  console.log('ARK_API_KEY:', process.env.ARK_API_KEY);
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { message: "Method Not Allowed" } });
  }

  try {
    const { model, ...body } = req.body;

    let apiKey: string | undefined;
    let apiBase: string;
    let finalBody: AnyBody = body;

    if (model === 'nano-banana') {
      apiKey = process.env.NANO_API_KEY;
      apiBase = process.env.NANO_BASE || 'https://api.nanobanana.dev/v1/images/generations';
    } else {
      // This is the ARK path
      apiKey = process.env.ARK_API_KEY;
      apiBase = process.env.ARK_BASE || 'https://ark.ap-southeast.bytepluses.com/api/v3/images/generations';
      finalBody = normalizeForArk(body); // Use the normalization function here
    }

    if (!apiKey) {
      return res.status(500).json({ error: 'API_KEY is missing for the selected model' });
    }
    
    if (apiKey.toLowerCase().startsWith('bearer ')) {
      apiKey = apiKey.slice(7).trim();
    }

    const upstream = await fetch(apiBase, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(finalBody),
    });

    const ct = upstream.headers.get('content-type') || '';
    const responseBody = ct.includes('application/json') ? await upstream.json() : await upstream.text();
    return res.status(upstream.status).send(responseBody);
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: 'Proxy failed', detail: message });
  }
}