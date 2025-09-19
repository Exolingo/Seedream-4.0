import type { VercelRequest, VercelResponse } from "@vercel/node";

const ARK_BASE = "https://ark.ap-southeast.bytepluses.com";

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
    const arkRes = await fetch(`${ARK_BASE}/api/v3/images/generations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ARK_API_KEY}`,
      },
      body: JSON.stringify(req.body),
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
  }
}
