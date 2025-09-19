import type { GeneratedImage } from '../types/history';

export interface SeedreamRequestBase {
  model?: string;
  prompt: string;
  response_format?: 'url' | 'b64_json';
  stream?: boolean;
  watermark?: boolean;
  sequential_image_generation?: 'disabled' | 'enabled';
  seed?: number;
  steps?: number;
  guidance_scale?: number;
}

export interface SeedreamTextToImageRequest extends SeedreamRequestBase {
  size?: string;
  width?: number;
  height?: number;
}

export interface SeedreamImageToImageRequest extends SeedreamTextToImageRequest {
  image: string;
  references?: string[];
}

export interface SeedreamResponse {
  model: string;
  created: number;
  data: GeneratedImage[];
}

export interface PromptEnhancementPayload {
  prompt: string;
  mode: 't2i' | 'i2i';
  maxTokens?: number;
}

export interface PromptEnhancementResponse {
  enhanced: string;
  rationale?: string;
}

const DEFAULT_MODEL = 'seedream-4-0-250828';
const DEFAULT_RESPONSE_FORMAT: SeedreamRequestBase['response_format'] = 'url';

const arkBase = import.meta.env.VITE_ARK_BASE;
const arkApiKey = import.meta.env.VITE_ARK_API_KEY;
const chatGptBase = import.meta.env.VITE_CHATGPT_BASE;
const chatGptKey = import.meta.env.VITE_CHATGPT_API_KEY;

if (import.meta.env.DEV) {
  if (!arkBase) {
    // eslint-disable-next-line no-console
    console.warn('VITE_ARK_BASE is not configured. API calls will fail.');
  }
  if (!arkApiKey) {
    // eslint-disable-next-line no-console
    console.warn('VITE_ARK_API_KEY is not configured. API calls will fail.');
  }
  if (!chatGptBase) {
    // eslint-disable-next-line no-console
    console.warn('VITE_CHATGPT_BASE is not configured. Prompt enhancement will fail.');
  }
  if (!chatGptKey) {
    // eslint-disable-next-line no-console
    console.warn('VITE_CHATGPT_API_KEY is not configured. Prompt enhancement will fail.');
  }
}

interface RetryOptions {
  retries?: number;
  retryDelayMs?: number;
  backoffFactor?: number;
}

const RETRYABLE_STATUS = new Set([408, 425, 429, 500, 502, 503, 504]);

async function fetchWithRetry(
  input: RequestInfo | URL,
  init: RequestInit & RetryOptions = {},
): Promise<Response> {
  const { retries = 0, retryDelayMs = 500, backoffFactor = 2, signal, ...rest } = init;

  let attempt = 0;
  let lastError: unknown;
  const controller = new AbortController();

  if (signal) {
    signal.addEventListener('abort', () => controller.abort(signal.reason), { once: true });
  }

  while (attempt <= retries) {
    try {
      const response = await fetch(input, { ...rest, signal: controller.signal });
      if (!response.ok && RETRYABLE_STATUS.has(response.status) && attempt < retries) {
        await delay(retryDelayMs * backoffFactor ** attempt, signal);
        attempt += 1;
        continue;
      }
      return response;
    } catch (error) {
      if ((error as DOMException).name === 'AbortError') {
        throw error;
      }
      lastError = error;
      if (attempt >= retries) {
        break;
      }
      await delay(retryDelayMs * backoffFactor ** attempt, signal);
      attempt += 1;
    }
  }
  throw lastError ?? new Error('Request failed');
}

async function delay(ms: number, signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }
  return new Promise<void>((resolve, reject) => {
    const id = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(id);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

export async function requestSeedreamImages(
  payload: SeedreamTextToImageRequest | SeedreamImageToImageRequest,
  signal?: AbortSignal,
): Promise<SeedreamResponse> {

  // Seedream 4.0에서는 guidance_scale 미지원 → 삭제함
  const body = {
    model: payload.model ?? DEFAULT_MODEL,
    prompt: payload.prompt,
    response_format: payload.response_format ?? DEFAULT_RESPONSE_FORMAT,
    size: payload.size,
    width: payload.width,
    height: payload.height,
    stream: payload.stream ?? false,
    watermark: payload.watermark ?? true,
    sequential_image_generation: payload.sequential_image_generation ?? 'disabled',
    image: (payload as SeedreamImageToImageRequest).image,
    images: (payload as SeedreamImageToImageRequest).references,
    seed: payload.seed,
    steps: payload.steps,
  };
  
  const response = await fetchWithRetry('/api/generate-image', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
  signal,
});

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  return (await response.json()) as SeedreamResponse;
}

export async function enhancePrompt(
  payload: PromptEnhancementPayload,
  signal?: AbortSignal,
): Promise<PromptEnhancementResponse> {
  if (!chatGptBase || !chatGptKey) {
    throw new Error('ChatGPT API is not configured.');
  }

  const modeLabel = payload.mode === 't2i' ? 'text-to-image' : 'image-to-image';
  const body = {
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content:
          '당신은 BytePlus ModelArk의 Seedream 4.0 모델을 위한 시니어 프롬프트 엔지니어입니다. 장면의 주제, 스타일, 구도, 카메라/렌즈, 조명, 분위기, 품질 키워드를 포함해 모델이 선호하는 표현으로 500자 이내의 단일 프롬프트를 작성하세요. 안전 가이드를 준수하고 민감한 내용은 배제하며, 최종 출력만 제공하세요. 기본 응답은 한국어로 작성하되 필요한 핵심 키워드는 영어를 병기할 수 있습니다.',
      },
      {
        role: 'user',
        content: `작업 모드: ${modeLabel}. 원본 프롬프트:\n${payload.prompt}\n\n위 지침에 따라 Seedream 4.0에 최적화된 프롬프트를 만들어주세요.`,
      },
    ],
    max_output_tokens: payload.maxTokens ?? 400,
  };

  const response = await fetchWithRetry(
    `${chatGptBase}/chat/completions`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${chatGptKey}`,
      },
      body: JSON.stringify(body),
      signal,
    },
  );

  if (!response.ok) {
    const message = await extractErrorMessage(response);
    throw new Error(message);
  }

  const json = await response.json();
  const content: string = json.choices?.[0]?.message?.content ?? payload.prompt;
  return {
    enhanced: content.trim(),
    rationale: json.choices?.[0]?.message?.refusal ?? undefined,
  };
}

async function extractErrorMessage(response: Response): Promise<string> {
  try {
    const data = await response.json();
    if (typeof data?.error === 'string') {
      return data.error;
    }
    if (data?.error?.message) {
      return data.error.message;
    }
    return JSON.stringify(data);
  } catch (error) {
    return `${response.status} ${response.statusText}`;
  }
}
