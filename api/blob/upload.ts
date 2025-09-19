import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { message: "Method Not Allowed" } });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token)
    return res
      .status(500)
      .json({ error: { message: "BLOB_READ_WRITE_TOKEN is missing" } });

  try {
    const body = req.body as HandleUploadBody;

    const url = new URL(
      req.url ?? "/api/blob/upload",
      `https://${req.headers.host ?? "localhost"}`
    );
    const stdReq = new Request(url.toString(), {
      method: "POST",
      headers: req.headers as any,
      body: JSON.stringify(body),
    });

    const result = await handleUpload({
      request: stdReq,
      body,
      token,
      onBeforeGenerateToken: async (_pathname, clientPayload, _multipart) => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        addRandomSuffix: true,
        tokenPayload: clientPayload ?? "",
      }),
      onUploadCompleted: async () => {},
    });

    res.setHeader("Cache-Control", "no-store");
    return res.status(200).json(result);
  } catch (e) {
    return res.status(400).json({ error: { message: (e as Error).message } });
  }
}
