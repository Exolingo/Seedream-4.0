import type { VercelRequest, VercelResponse } from "@vercel/node";

const apiKey = process.env.NANO_API_KEY;
const modelName = "gemini-2.5-flash-image-preview";
const googleApiBase = "https://generativelanguage.googleapis.com/v1beta";

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

function toInlineDataPart(source: string): GeminiPart {
  if (!source.startsWith("data:")) {
    return { inlineData: { mimeType: "image/png", data: source } };
  }

  const commaIndex = source.indexOf(",");
  if (commaIndex === -1) {
    return { inlineData: { mimeType: "image/png", data: source } };
  }

  const header = source.slice(0, commaIndex);
  const data = source.slice(commaIndex + 1);
  const mimeMatch = header.match(/^data:(.*?)(;base64)?$/i);
  const mimeType = mimeMatch?.[1] ?? "image/png";

  return {
    inlineData: {
      mimeType,
      data,
    },
  };
}

function buildGeminiParts(prompt: string, image?: string | string[]): GeminiPart[] {
  const parts: GeminiPart[] = [{ text: prompt }];

  if (!image) {
    return parts;
  }

  const images = Array.isArray(image) ? image : [image];
  for (const img of images) {
    if (!img) continue;
    parts.push(toInlineDataPart(img));
  }

  return parts;
}

async function parseGoogleError(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (data?.error?.message) return data.error.message as string;
    if (typeof data?.error === "string") return data.error;
    return JSON.stringify(data);
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!apiKey) {
    return res.status(500).json({
      error: { message: "The app is not configured correctly. NANO_API_KEY is missing." },
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { message: "Method Not Allowed" } });
  }

  try {
    const { prompt, image } = req.body as { prompt?: string; image?: string | string[] };

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const parts = buildGeminiParts(prompt, image);

    const upstream = await fetch(
      `${googleApiBase}/models/${modelName}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts,
            },
          ],
        }),
      },
    );

    if (!upstream.ok) {
      const message = await parseGoogleError(upstream);
      return res.status(upstream.status).json({ error: "Image generation failed.", detail: message });
    }

    const json = await upstream.json();
    const generatedImages: { url: string }[] = [];

    let fallbackDetail: string | undefined;

    if (Array.isArray(json?.candidates)) {
      for (const candidate of json.candidates) {
        const content = candidate?.content;
        const partsList = Array.isArray(content?.parts)
          ? content.parts
          : Array.isArray(content)
          ? content
          : [];

        for (const part of partsList) {
          const inline = part?.inlineData;
          if (inline?.data) {
            const mime = inline.mimeType || "image/png";
            generatedImages.push({ url: `data:${mime};base64,${inline.data}` });
          }

          if (!fallbackDetail && typeof part?.text === "string") {
            fallbackDetail = part.text;
          }
        }
      }
    }

    fallbackDetail =
      fallbackDetail ?? json?.promptFeedback?.blockReason ?? json?.promptFeedback?.safetyRatings?.[0]?.category;

    if (!generatedImages.length) {
      return res.status(500).json({
        error: "Image generation failed.",
        detail: fallbackDetail ?? "No image was generated and no explanation was provided.",
      });
    }

    return res.status(200).json({
      model: `nano-banana (${modelName})`,
      created: Date.now(),
      data: generatedImages,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(e);
    return res.status(500).json({ error: "Request failed", detail: message });
  }
}
