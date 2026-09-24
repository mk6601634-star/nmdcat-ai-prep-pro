import type {
  AIProviderId,
  AiGenerateOptions,
  AiGenerateResult
} from './aiTypes.js';

// Cooldown tracking per API key to bypass rate-limited keys instantly (0ms)
const keyCooldowns = new Map<string, number>();
const COOLDOWN_DURATION_MS = 5 * 1000; // 5 seconds cooldown on 429

export function isKeyCoolingDown(key: string): boolean {
  const until = keyCooldowns.get(key) || 0;
  return until > Date.now();
}

export function setKeyCooldown(key: string, durationMs = COOLDOWN_DURATION_MS) {
  keyCooldowns.set(key, Date.now() + durationMs);
}

export function getApiKeys(envVar: string, altEnvVar?: string): string[] {
  const raw = [process.env[envVar], altEnvVar ? process.env[altEnvVar] : ''].filter(Boolean).join(',');
  if (!raw) return [];
  return raw
    .split(/[,;\n]/)
    .map(k => k.trim())
    .filter(k => k.length > 5);
}

export function isQuotaOrTransientError(error: any): boolean {
  if (!error) return false;
  const errMsg = (error?.message || String(error)).toLowerCase();
  const errStatus = error?.status || error?.statusCode || error?.code;

  if (errStatus === 429 || errStatus === 503 || errStatus === 502 || errStatus === 504 || errStatus === 408) return true;
  if (errMsg.includes('429')) return true;
  if (errMsg.includes('503') || errMsg.includes('502') || errMsg.includes('504')) return true;
  if (errMsg.includes('resource_exhausted')) return true;
  if (errMsg.includes('quota')) return true;
  if (errMsg.includes('rate limit') || errMsg.includes('rate_limit')) return true;
  if (errMsg.includes('overloaded') || errMsg.includes('capacity')) return true;
  if (errMsg.includes('temporarily unavailable')) return true;
  if (errMsg.includes('high demand')) return true;
  if (errMsg.includes('timeout') || errMsg.includes('timed out') || errMsg.includes('etimedout') || errMsg.includes('econnreset')) return true;

  return false;
}

export function isConfigurationError(error: any): boolean {
  if (!error) return false;
  const errMsg = (error?.message || String(error)).toLowerCase();
  const errStatus = error?.status || error?.statusCode || error?.code;

  if (errStatus === 401 || errStatus === 403) return true;
  if (errMsg.includes('api_key_invalid') || errMsg.includes('invalid api key') || errMsg.includes('unauthorized') || errMsg.includes('forbidden')) return true;
  if (errMsg.includes('not configured')) return true;

  return false;
}

export interface AIProvider {
  id: AIProviderId;
  name: string;
  isConfigured(): boolean;
  generateText(options: AiGenerateOptions, modelId?: string): Promise<AiGenerateResult>;
  healthCheck(): Promise<{ available: boolean; latencyMs: number; error?: string }>;
}

// ============================================================
// 1. GEMINI PROVIDER ADAPTER (Pure Native Fetch - Zero External Dependencies)
// ============================================================
export class GeminiProvider implements AIProvider {
  id: AIProviderId = 'gemini';
  name = 'Google Gemini';

  isConfigured(): boolean {
    return getApiKeys('GEMINI_API_KEY', 'GEMINI_API_KEYS').length > 0;
  }

  async generateText(options: AiGenerateOptions, modelId?: string): Promise<AiGenerateResult> {
    const apiKeys = getApiKeys('GEMINI_API_KEY', 'GEMINI_API_KEYS');
    if (apiKeys.length === 0) {
      throw new Error('GEMINI_API_KEY is not configured in server environment.');
    }

    const availableKeys = apiKeys.filter(k => !isKeyCoolingDown(k));
    const keysToTry = availableKeys.length > 0 ? availableKeys : [apiKeys[0]];
    const candidateModel = modelId || process.env.GEMINI_MODEL || 'gemini-2.5-flash';
    const modelsToTry = [
      candidateModel,
      'gemini-2.5-flash',
      'gemini-2.0-flash',
      'gemini-1.5-flash',
    ].filter((v, i, a) => a.indexOf(v) === i);

    let parts: any[] = [];
    if (options.image) {
      const cleanBase64 = options.image.base64Data.replace(/^data:image\/\w+;base64,/, '');
      parts.push({
        inlineData: {
          mimeType: options.image.mimeType || 'image/jpeg',
          data: cleanBase64,
        },
      });
    }
    parts.push({ text: options.prompt });

    const contents = [{ parts }];

    const generationConfig: any = {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096,
    };

    if (options.jsonMode) {
      generationConfig.responseMimeType = 'application/json';
    }

    const requestBody: any = {
      contents,
      generationConfig,
    };

    if (options.systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: options.systemInstruction }]
      };
    }

    let lastError: any = null;
    const startTime = Date.now();

    for (let k = 0; k < keysToTry.length; k++) {
      const apiKey = keysToTry[k];

      for (const currentModel of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'User-Agent': 'nmdcat-prep-pro-ai',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(25000),
          });

          if (!res.ok) {
            const errData = await res.json().catch(() => null);
            const errMsg = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`;

            if (res.status === 429) {
              setKeyCooldown(apiKey);
              console.warn(`[GeminiProvider] Key rate limited on '${currentModel}'. Cooldown activated.`);
              continue;
            }

            if (res.status === 400 && options.jsonMode && errMsg.includes('responseMimeType')) {
              // Retry without responseMimeType
              delete requestBody.generationConfig.responseMimeType;
              const retryRes = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(25000),
              });
              if (retryRes.ok) {
                const retryData: any = await retryRes.json();
                const text = retryData?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (text) {
                  return {
                    text,
                    provider: 'gemini',
                    model: currentModel,
                    isFallback: k > 0 || currentModel !== candidateModel,
                    latencyMs: Date.now() - startTime,
                  };
                }
              }
            }

            if (res.status === 401 || res.status === 403 || errMsg.includes('API_KEY_INVALID')) {
              setKeyCooldown(apiKey, 3600 * 1000);
              throw new Error(`Gemini Authentication Error (${res.status}): ${errMsg}`);
            }

            throw new Error(`Gemini API Error (${res.status}): ${errMsg}`);
          }

          const data: any = await res.json();
          const candidate = data?.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text || '';

          if (text) {
            const latencyMs = Date.now() - startTime;
            const usageMetadata = data?.usageMetadata;

            return {
              text,
              provider: 'gemini',
              model: currentModel,
              isFallback: k > 0 || currentModel !== candidateModel,
              latencyMs,
              usage: usageMetadata
                ? {
                    inputTokens: usageMetadata.promptTokenCount,
                    outputTokens: usageMetadata.candidatesTokenCount,
                    totalTokens: usageMetadata.totalTokenCount,
                  }
                : undefined,
            };
          }
        } catch (err: any) {
          lastError = err;
          if (isQuotaOrTransientError(err)) {
            console.warn(`[GeminiProvider] Model '${currentModel}' transient error (${err?.message?.slice(0, 80)}). Trying fallback...`);
          } else if (isConfigurationError(err)) {
            console.warn(`[GeminiProvider] API key [${apiKey.slice(0, 8)}...] invalid credentials.`);
            setKeyCooldown(apiKey, 3600 * 1000);
            break;
          }
        }
      }
    }

    throw lastError || new Error(`Gemini generation failed for models ${modelsToTry.join(', ')}.`);
  }

  async healthCheck(): Promise<{ available: boolean; latencyMs: number; error?: string }> {
    if (!this.isConfigured()) {
      return { available: false, latencyMs: 0, error: 'GEMINI_API_KEY not configured' };
    }
    const start = Date.now();
    try {
      await this.generateText({ prompt: 'Ping: reply with "pong"', maxTokens: 10 }, 'gemini-2.5-flash');
      return { available: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { available: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
}

// ============================================================
// 2. GROQ PROVIDER ADAPTER (OpenAI-Compatible Fast Inference)
// ============================================================
export class GroqProvider implements AIProvider {
  id: AIProviderId = 'groq';
  name = 'Groq Cloud';

  isConfigured(): boolean {
    return getApiKeys('FALLBACK_API_KEY', 'GROQ_API_KEY').length > 0;
  }

  async generateText(options: AiGenerateOptions, modelId?: string): Promise<AiGenerateResult> {
    const apiKeys = getApiKeys('FALLBACK_API_KEY', 'GROQ_API_KEY');
    if (apiKeys.length === 0) {
      throw new Error('GROQ_API_KEY / FALLBACK_API_KEY is not configured in server environment.');
    }

    const availableKeys = apiKeys.filter(k => !isKeyCoolingDown(k));
    const keysToTry = availableKeys.length > 0 ? availableKeys : [apiKeys[0]];

    const primaryModel = (modelId || process.env.GROQ_MODEL || (process.env.FALLBACK_MODEL && !process.env.FALLBACK_MODEL.includes('compound') ? process.env.FALLBACK_MODEL : '') || 'openai/gpt-oss-20b')
      .trim()
      .replace(/[\r\n\t]/g, '');

    const modelsToTry = [
      primaryModel,
      'openai/gpt-oss-20b',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-120b',
      'allam-2-7b',
    ].filter((v, i, a) => a.indexOf(v) === i && v.length > 0);

    const messages: any[] = [];
    let promptText = options.prompt;
    let systemText = options.systemInstruction || '';

    if (options.jsonMode) {
      if (!systemText.toLowerCase().includes('json')) {
        systemText += (systemText ? '\n' : '') + 'Respond strictly with valid JSON. Do not include markdown codeblocks or conversational text.';
      }
      if (!promptText.toLowerCase().includes('json')) {
        promptText += '\nReturn output formatted strictly as valid JSON.';
      }
    }

    if (systemText) {
      messages.push({ role: 'system', content: systemText });
    }

    if (options.image) {
      const rawBase64 = options.image.base64Data;
      const dataUri = rawBase64.startsWith('data:')
        ? rawBase64
        : `data:${options.image.mimeType || 'image/jpeg'};base64,${rawBase64}`;

      messages.push({
        role: 'user',
        content: [
          { type: 'text', text: promptText },
          { type: 'image_url', image_url: { url: dataUri } },
        ],
      });
    } else {
      messages.push({ role: 'user', content: promptText });
    }

    let lastError: any = null;
    const startTime = Date.now();

    for (let k = 0; k < keysToTry.length; k++) {
      const apiKey = keysToTry[k];

      for (const candidateModel of modelsToTry) {
        const requestBody: any = {
          model: candidateModel,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
        };

        if (options.jsonMode && !options.image) {
          requestBody.response_format = { type: 'json_object' };
        }

        try {
          let res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(18000),
          });

          if (!res.ok) {
            let errBody = await res.text().catch(() => '');

            if (res.status === 400 && requestBody.response_format) {
              delete requestBody.response_format;
              res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(18000),
              });
              if (!res.ok) {
                errBody = await res.text().catch(() => '');
              }
            }

            if (!res.ok) {
              if (res.status === 404 || errBody.includes('model_not_found') || errBody.includes('does not exist')) {
                console.warn(`[GroqProvider] Model '${candidateModel}' not found. Trying next candidate model...`);
                continue;
              }

              if (res.status === 429) {
                console.warn(`[GroqProvider] Model '${candidateModel}' hit 429 rate limit. Trying next candidate model...`);
                continue;
              } else if (res.status === 401 || res.status === 403) {
                setKeyCooldown(apiKey, 3600 * 1000);
                throw new Error(`Groq Authentication Error (${res.status}): ${errBody || res.statusText}`);
              }

              console.warn(`[GroqProvider] Model '${candidateModel}' error (${res.status}): ${errBody.slice(0, 100)}. Trying fallback model...`);
              continue;
            }
          }

          const data: any = await res.json();
          const choice = data?.choices?.[0];
          const text = choice?.message?.content || '';

          if (text) {
            return {
              text,
              provider: 'groq',
              model: candidateModel,
              isFallback: k > 0 || candidateModel !== primaryModel,
              latencyMs: Date.now() - startTime,
              usage: data?.usage
                ? {
                    inputTokens: data.usage.prompt_tokens,
                    outputTokens: data.usage.completion_tokens,
                    totalTokens: data.usage.total_tokens,
                  }
                : undefined,
            };
          }
        } catch (err: any) {
          lastError = err;
          if (isConfigurationError(err)) throw err;
        }
      }
    }

    throw lastError || new Error(`Groq generation failed across all keys and models.`);
  }

  async healthCheck(): Promise<{ available: boolean; latencyMs: number; error?: string }> {
    if (!this.isConfigured()) {
      return { available: false, latencyMs: 0, error: 'GROQ_API_KEY / FALLBACK_API_KEY not configured' };
    }
    const start = Date.now();
    try {
      await this.generateText({ prompt: 'Ping', maxTokens: 10 }, 'openai/gpt-oss-20b');
      return { available: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { available: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
}

// Provider Singleton Instances
export const geminiProvider = new GeminiProvider();
export const groqProvider = new GroqProvider();

export const providersMap: Record<AIProviderId, AIProvider> = {
  gemini: geminiProvider,
  cerebras: groqProvider as any,
  groq: groqProvider,
  longcat: groqProvider as any,
};
