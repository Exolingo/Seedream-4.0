import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI, Part } from "@google/genai";

// Get the API key from environment variables
const apiKey = process.env.NANO_API_KEY;
if (!apiKey) {
  // Non-blocking error for Vercel deployment, but log it.
  console.error("NANO_API_KEY environment variable is not set.");
}

const ai = new GoogleGenAI(apiKey || "");
const modelName = "gemini-2.5-flash-image-preview";

/**
 * Converts a base64 image string (with or without data URL prefix) to a Part for the Google GenAI API.
 */
function base64ToPart(base64Data: string, mimeType: string): Part {
  return {
    inlineData: {
      mimeType,
      // Remove data URL prefix if it exists
      data: base64Data.startsWith('data:') ? base64Data.split(',')[1] : base64Data,
    },
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!apiKey) {
    return res.status(500).json({ error: { message: 'The app is not configured correctly. NANO_API_KEY is missing.' } });
  }
  
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: { message: "Method Not Allowed" } });
  }

  try {
    const { prompt, image } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const contents: Part[] = [{ text: prompt }];

    // Handle image-to-image generation
    if (image) {
        const images = Array.isArray(image) ? image : [image];
        for (const img of images) {
            // The client might send different image formats, but we'll default to png for the API.
            contents.push(base64ToPart(img, "image/png"));
        }
    }

    const model = ai.getGenerativeModel({ model: modelName });
    const result = await model.generateContent({ contents });
    const response = result.response;

    const generatedImages = [];
    if (response.candidates && response.candidates.length > 0) {
        for (const candidate of response.candidates) {
            for (const part of candidate.content.parts) {
                if (part.inlineData) {
                    const imageData = part.inlineData.data;
                    const dataUrl = `data:${part.inlineData.mimeType};base64,${imageData}`;
                    generatedImages.push({ url: dataUrl });
                }
            }
        }
    }


    if (generatedImages.length === 0) {
        // Check for text response which might indicate an error or refusal from the model
        const textResponse = response.text() ?? "No image was generated and no text explanation was provided.";
        return res.status(500).json({ error: "Image generation failed.", detail: textResponse });
    }

    // Return the response in the format the client expects
    const clientResponse = {
      model: `nano-banana (${modelName})`,
      created: Date.now(),
      data: generatedImages,
    };

    return res.status(200).json(clientResponse);

  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : String(e);
    console.error(e);
    return res.status(500).json({ error: 'Request failed', detail: message });
  }
}