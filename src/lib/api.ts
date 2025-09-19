import type { AspectRatio, GeneratedImage } from '../types/history';

export interface SeedreamRequestBase {
  model?: string;
  prompt: string;
  response_format?: 'url' | 'b64_json';
  stream?: boolean;
  watermark?: boolean;
  /** seedream-4.0: 'auto' | 'disabled' */
  sequential_image_generation?: 'disabled' | 'auto';
  /** Optional: 4.0의 시퀀스 옵션 (필요 시 정의 확장) */
  sequential_image_generation_options?: Record<string, unknown>;
  /** seedream-4.0에서는 seed/guidance_scale 미지원 */
  seed?: number;               // <- 유지하되 전송은 생략
  steps?: number;              // 명세에 없지만 사용 중이면 전달 가능
  guidance_scale?: number;     // <- 유지하되 전송은 생략
  aspect_ratio?: AspectRatio;
}

export interface SeedreamTextToImageRequest extends SeedreamRequestBase {
  size?: string;    // "WxH" 형식 또는 프리셋 문자열
  width?: number;
  height?: number;
}

/** i2i 입력: image는 string | string[] 모두 허용 */
export interface SeedreamImageToImageRequest extends SeedreamTextToImageRequest {
  image: string | string[];
  /** @deprecated: 내부에서 image 배열로 병합됨 */
  references?: string[];
}

export interface SeedreamResponse {
  model: string;
  created: number;
  data: GeneratedImage[];
  // usage?: { ... } // 필요시 확장
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

const arkBase = import.meta.env.VITE_ARK_BASE;       // 예: https://ark.ap-southeast.bytepluses.com
const arkApiKey = import.meta.env.VITE_ARK_API_KEY;
const chatGptBase = import.meta.env.VITE_CHATGPT_BASE;
const chatGptKey = import.meta.env.VITE_CHATGPT_API_KEY;

if (import.meta.env.DEV) {
  if (!arkBase) console.warn('VITE_ARK_BASE is not configured. API calls will fail.');
  if (!arkApiKey) console.warn('VITE_ARK_API_KEY is not configured. API calls will fail.');
  if (!chatGptBase) console.warn('VITE_CHATGPT_BASE is not configured. Prompt enhancement will fail.');
  if (!chatGptKey) console.warn('VITE_CHATGPT_API_KEY is not configured. Prompt enhancement will fail.');
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
      if ((error as DOMException).name === 'AbortError') throw error;
      lastError = error;
      if (attempt >= retries) break;
      await delay(retryDelayMs * backoffFactor ** attempt, signal);
      attempt += 1;
    }
  }
  throw lastError ?? new Error('Request failed');
}

async function delay(ms: number, signal?: AbortSignal | null): Promise<void> {
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

/** data URL의 mime를 소문자로 정규화 (png/jpeg 요건 충족 보조) */
function normalizeDataUrl(url: string): string {
  if (!url.startsWith('data:image/')) return url;
  const commaIdx = url.indexOf(',');
  if (commaIdx < 0) return url;
  const header = url.slice(0, commaIdx).toLowerCase(); // mime를 소문자
  return header + url.slice(commaIdx);
}

/** i2i 입력에서 image/references를 API 요구 형식으로 병합 */
function buildImageField(
  payload: SeedreamTextToImageRequest | SeedreamImageToImageRequest
): string | string[] | undefined {
  const p = payload as SeedreamImageToImageRequest;

  // t2i의 경우 image가 없을 수 있음
  if (p.image == null && !p.references?.length) return undefined;

  // image가 이미 배열이면 우선 사용
  if (Array.isArray(p.image)) {
    const arr = p.image.filter(Boolean).map(normalizeDataUrl);
    // 최대 10장 제한
    return arr.slice(0, 10);
  }

  // image가 단일이고 references가 있다면 [image, ...references]
  const refs = (p.references ?? []).filter(Boolean).map(normalizeDataUrl);
  if (p.image) {
    const merged = [normalizeDataUrl(p.image), ...refs];
    return merged.slice(0, 10);
  }

  // references만 있는 경우
  return refs.length ? refs.slice(0, 10) : undefined;
}

export async function requestSeedreamImages(
  payload: SeedreamTextToImageRequest | SeedreamImageToImageRequest,
  signal?: AbortSignal,
): Promise<SeedreamResponse> {
  if (!arkBase || !arkApiKey) {
    throw new Error('Ark API is not configured.');
  }

  // Seedream 4.0은 seed/guidance_scale 미지원 → 바디에서 제외
  const body: Record<string, unknown> = {
    model: payload.model ?? DEFAULT_MODEL,
    prompt: payload.prompt,
    response_format: payload.response_format ?? DEFAULT_RESPONSE_FORMAT,
    aspect_ratio: payload.aspect_ratio,
    stream: payload.stream ?? false,
    watermark: payload.watermark ?? true,
    sequential_image_generation: payload.sequential_image_generation ?? 'disabled',
    sequential_image_generation_options: payload.sequential_image_generation_options,
    steps: payload.steps, // 필요시만 전달
  };

  // width/height 또는 size 중 하나만 사용 (동시 전송 금지)
  if (payload.width && payload.height) {
    body.width = payload.width;
    body.height = payload.height;
  } else if (payload.size) {
    body.size = payload.size;
  }

  // 여러 이미지 입력: 단일/배열/레퍼런스 모두 'image' 키 하나로
  const imageField = buildImageField(payload);
  if (imageField) {
    body.image = imageField;
  }

  const response = await fetchWithRetry(
    `${arkBase.replace(/\/+$/, '')}/api/v3/images/generations`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${arkApiKey}`,
      },
      body: JSON.stringify(body),
      signal,
    }
  );

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
    }
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
    if (typeof data?.error === 'string') return data.error;
    if (data?.error?.message) return data.error.message;
    return JSON.stringify(data);
  } catch {
    return `${response.status} ${response.statusText}`;
  }
}
