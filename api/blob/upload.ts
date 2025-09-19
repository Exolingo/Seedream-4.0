export const config = { runtime: "edge" };

import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

export default async function handler(req: Request) {
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: { message: "Method Not Allowed" } }),
      {
        status: 405,
        headers: { "content-type": "application/json" },
      }
    );
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return new Response(
      JSON.stringify({
        error: { message: "BLOB_READ_WRITE_TOKEN is missing" },
      }),
      {
        status: 500,
        headers: { "content-type": "application/json" },
      }
    );
  }

  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return new Response(
      JSON.stringify({ error: { message: "Invalid JSON body" } }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      }
    );
  }

  try {
    const result = await handleUpload({
      request: req,
      body,
      token,
      onBeforeGenerateToken: async (_pathname, clientPayload, _multipart) => ({
        allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
        addRandomSuffix: true,
        tokenPayload: clientPayload ?? "",
      }),
      onUploadCompleted: async (_info) => {
        console.log("upload completed : ", _info);
      },
    });

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: { message: (e as Error).message } }),
      {
        status: 400,
        headers: { "content-type": "application/json" },
      }
    );
  }
}
