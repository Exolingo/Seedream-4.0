import type { VercelRequest, VercelResponse } from "@vercel/node";

const ARK_BASE = "https://ark.ap-southeast.bytepluses.com";

type AnyBody = {
  size?: string; // "WxH" (예: "1280x720")
  width?: number; // 클라 기록용: 서버에서 제거
  height?: number; // 클라 기록용: 서버에서 제거
  aspect_ratio?: string; // 클라 기록용: 서버에서 제거
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
  const {
    width, // 제거
    height, // 제거
    aspect_ratio, // 제거
    ...rest
  } = body;

  return {
    ...rest,
    ...(size ? { size } : {}), // size가 유효할 때만 포함
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { message: "Method Not Allowed" } });
  }

  const ARK_API_KEY = process.env.ARK_API_KEY;
  if (!ARK_API_KEY) {
    return res
      .status(500)
      .json({ error: { message: "ARK_API_KEY is not configured." } });
  }

  try {
<<<<<<< HEAD
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
=======
    const incoming = (req.body ?? {}) as AnyBody;
    const normalized = normalizeForArk(incoming);

    const arkRes = await fetch(`${ARK_BASE}/api/v3/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify(normalized),
    });

    const text = await arkRes.text(); // Ark 응답을 그대로 중계
    res.status(arkRes.status);
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Cache-Control", "no-store");
    return res.send(text);
  } catch (err) {
    return res
      .status(502)
      .json({ error: { message: `Proxy error: ${(err as Error).message}` } });
>>>>>>> 1869b78d6da91411233f5cf5c2954073b9a8aa3c
  }
}
