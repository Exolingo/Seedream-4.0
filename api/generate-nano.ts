// api/generate-nano.ts
import { GoogleGenAI } from "@google/genai";
import type { VercelRequest, VercelResponse } from "@vercel/node";

/** 환경변수:
 *  NANO_API_KEY: Gemini API Key
 *  NANO_MODEL  : (선택) 기본값은 gemini-2.5-flash-image-preview
 */
const apiKey = process.env.NANO_API_KEY;
const modelName = process.env.NANO_MODEL || "gemini-2.5-flash-image-preview";

/* -------------------- 타입 정의 -------------------- */

/** data URL 파싱 결과 */
interface DataUrlInfo {
  mimeType: string;
  base64: string;
}

/** Gemini content의 이미지 파트(inlineData) */
interface InlineDataPart {
  inlineData: {
    mimeType?: string;
    data: string; // base64
  };
}

/** 우리가 구성해서 넘길 contents 타입 (텍스트 + 이미지 파트)  */
type NanoContent = string | InlineDataPart;

/** 응답 파트 중 inlineData를 가진 것만 골라내기 위한 type guard */
function hasInlineData(part: unknown): part is InlineDataPart {
  if (typeof part !== "object" || part === null) return false;
  const p = part as { inlineData?: { data?: unknown } };
  return !!p.inlineData && typeof p.inlineData.data === "string";
}

/* -------------------- 유틸 함수 -------------------- */

/** data URL -> { mimeType, base64 } */
function parseDataUrl(url: string): DataUrlInfo | null {
  if (!url?.startsWith("data:")) return null;
  const [head, base64] = url.split(",", 2);
  if (!head || !base64) return null;
  // e.g. data:image/png;base64,....
  const mimeMatch = head.match(/^data:([^;]+);base64$/i);
  const mimeType = mimeMatch?.[1] ?? "image/png";
  return { mimeType, base64 };
}

/** null 제거용 type guard */
function isNotNull<T>(v: T | null): v is T {
  return v !== null;
}

/** 문자열 또는 문자열 배열을 inlineData 파트 배열로 */
function imagesToInlineParts(image: string | string[] | undefined): InlineDataPart[] {
  const list = Array.isArray(image) ? image : image ? [image] : [];
  return list
    .map(parseDataUrl)
    .filter(isNotNull) // <- null 확실히 제거 (타입 좁히기)
    .map(({ mimeType, base64 }) => ({
      inlineData: { mimeType, data: base64 },
    }));
}

/* -------------------- 핸들러 -------------------- */

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
    const { prompt, image } = req.body as {
      prompt?: string;
      image?: string | string[];
      // width/height/size 등은 현재 Gemini 이미지 모델에서 무시됩니다.
    };

    if (!prompt?.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    // 1) SDK 초기화
    const ai = new GoogleGenAI({ apiKey });

    // 2) contents 구성: [텍스트, (선택) 이미지들]
    const contents: NanoContent[] = [prompt];
    const imageParts = imagesToInlineParts(image);
    contents.push(...imageParts);

    // 3) 이미지 생성 호출
    const response = await ai.models.generateContent({
      model: modelName, // ex) gemini-2.5-flash-image-preview
      contents,
    });

    // 4) 응답 파싱: inlineData(= base64)만 이미지로 수집
    const parts: unknown[] = response.candidates?.[0]?.content?.parts ?? [];
    const images = parts
      .filter(hasInlineData)
      .map((p) => {
        const mime = p.inlineData.mimeType ?? "image/png";
        const base64 = p.inlineData.data; // base64 string
        return { url: `data:${mime};base64,${base64}`, size: "unknown" as const };
      });

    if (!images.length) {
      // 안전필터/정책 차단 등으로 이미지가 없을 수도 있음
      return res.status(500).json({
        error: "Image generation failed.",
        detail:
          response.promptFeedback?.blockReason ??
          "No inline image data was returned by the model.",
      });
    }

    // 5) Seedream 형식에 맞춘 응답
    return res.status(200).json({
      model: `nano-banana (${modelName})`,
      created: Date.now(),
      data: images,
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(e);
    return res.status(500).json({ error: "Request failed", detail: message });
  }
}
