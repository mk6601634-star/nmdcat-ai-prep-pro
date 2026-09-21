import { GoogleGenAI } from '@google/genai';
import type {
  AIProviderId,
  AiGenerateOptions,
  AiGenerateResult
} from './aiTypes.ts';

// Cooldown tracking per API key to bypass rate-limited keys instantly (0ms)
const keyCooldowns = new Map<string, number>();
const COOLDOWN_DURATION_MS = 25 * 1000; // 25 seconds cooldown on 429

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
// 1. GEMINI PROVIDER ADAPTER
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
    const candidateModel = modelId || process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite';

    let contents: any;
    if (options.image) {
      const cleanBase64 = options.image.base64Data.replace(/^data:image\/\w+;base64,/, '');
      contents = {
        parts: [
          {
            inlineData: {
              mimeType: options.image.mimeType || 'image/jpeg',
              data: cleanBase64,
            },
          },
          { text: options.prompt },
        ],
      };
    } else {
      contents = options.prompt;
    }

    const config: any = {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096,
    };

    if (options.systemInstruction) {
      config.systemInstruction = options.systemInstruction;
    }

    let lastError: any = null;
    const startTime = Date.now();

    for (let k = 0; k < keysToTry.length; k++) {
      const apiKey = keysToTry[k];
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: { 'User-Agent': 'nmdcat-prep-pro-ai' },
        },
      });

      try {
        const response = await ai.models.generateContent({
          model: candidateModel,
          contents,
          config,
        });

        const text = response.text || '';
        if (text) {
          const latencyMs = Date.now() - startTime;
          const usageMetadata = (response as any)?.usageMetadata;

          return {
            text,
            provider: 'gemini',
            model: candidateModel,
            isFallback: k > 0,
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
          console.warn(`[GeminiProvider] API key [${apiKey.slice(0, 8)}...] hit rate limit on model '${candidateModel}'. Setting cooldown.`);
          setKeyCooldown(apiKey);
        } else if (isConfigurationError(err)) {
          console.warn(`[GeminiProvider] API key [${apiKey.slice(0, 8)}...] invalid credentials.`);
          setKeyCooldown(apiKey, 3600 * 1000);
          throw err;
        }
      }
    }

    throw lastError || new Error(`Gemini generation failed for model '${candidateModel}'.`);
  }

  async healthCheck(): Promise<{ available: boolean; latencyMs: number; error?: string }> {
    if (!this.isConfigured()) {
      return { available: false, latencyMs: 0, error: 'GEMINI_API_KEY not configured' };
    }
    const start = Date.now();
    try {
      await this.generateText({ prompt: 'Ping: reply with "pong"', maxTokens: 10 }, 'gemini-3.5-flash-lite');
      return { available: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { available: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
}

// ============================================================
// 2. CEREBRAS PROVIDER ADAPTER (OpenAI-Compatible Ultra-Fast Inference)
// ============================================================
export class CerebrasProvider implements AIProvider {
  id: AIProviderId = 'cerebras';
  name = 'Cerebras Cloud';

  isConfigured(): boolean {
    return getApiKeys('CEREBRAS_API_KEY', 'CEREBRAS_API_KEYS').length > 0;
  }

  async generateText(options: AiGenerateOptions, modelId?: string): Promise<AiGenerateResult> {
    const apiKeys = getApiKeys('CEREBRAS_API_KEY', 'CEREBRAS_API_KEYS');
    if (apiKeys.length === 0) {
      throw new Error('CEREBRAS_API_KEY is not configured in server environment.');
    }

    const availableKeys = apiKeys.filter(k => !isKeyCoolingDown(k));
    const keysToTry = availableKeys.length > 0 ? availableKeys : [apiKeys[0]];
    const candidateModel = modelId || process.env.CEREBRAS_MODEL || 'llama3.1-8b';

    const messages: any[] = [];
    let promptText = options.prompt;
    let systemText = options.systemInstruction || '';

    if (options.jsonMode) {
      if (!systemText.toLowerCase().includes('json')) {
        systemText += (systemText ? '\n' : '') + 'Respond strictly with valid JSON. Do not include markdown codeblocks or surrounding conversational text.';
      }
      if (!promptText.toLowerCase().includes('json')) {
        promptText += '\nReturn output formatted strictly as valid JSON.';
      }
    }

    if (systemText) {
      messages.push({ role: 'system', content: systemText });
    }
    messages.push({ role: 'user', content: promptText });

    let lastError: any = null;
    const startTime = Date.now();

    for (let k = 0; k < keysToTry.length; k++) {
      const apiKey = keysToTry[k];
      const requestBody: any = {
        model: candidateModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      };

      if (options.jsonMode) {
        requestBody.response_format = { type: 'json_object' };
      }

      try {
        const res = await fetch('https://api.cerebras.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          if (res.status === 400 && options.jsonMode && errBody.includes('response_format')) {
            // Retry once without json_object response_format
            delete requestBody.response_format;
            const retryRes = await fetch('https://api.cerebras.ai/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });
            if (retryRes.ok) {
              const retryData: any = await retryRes.json();
              const choice = retryData?.choices?.[0];
              return {
                text: choice?.message?.content || '',
                provider: 'cerebras',
                model: candidateModel,
                isFallback: k > 0,
                latencyMs: Date.now() - startTime,
                usage: retryData?.usage
                  ? {
                      inputTokens: retryData.usage.prompt_tokens,
                      outputTokens: retryData.usage.completion_tokens,
                      totalTokens: retryData.usage.total_tokens,
                    }
                  : undefined,
              };
            }
          }

          if (res.status === 429) {
            console.warn(`[CerebrasProvider] Key hit 429 rate limit. Setting cooldown.`);
            setKeyCooldown(apiKey);
          } else if (res.status === 401 || res.status === 403) {
            setKeyCooldown(apiKey, 3600 * 1000);
            throw new Error(`Cerebras Authentication Error (${res.status}): ${errBody || res.statusText}`);
          }

          throw new Error(`Cerebras API Error (${res.status}): ${errBody || res.statusText}`);
        }

        const data: any = await res.json();
        const choice = data?.choices?.[0];
        const text = choice?.message?.content || '';

        if (text) {
          return {
            text,
            provider: 'cerebras',
            model: candidateModel,
            isFallback: k > 0,
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

    throw lastError || new Error(`Cerebras generation failed for model '${candidateModel}'.`);
  }

  async healthCheck(): Promise<{ available: boolean; latencyMs: number; error?: string }> {
    if (!this.isConfigured()) {
      return { available: false, latencyMs: 0, error: 'CEREBRAS_API_KEY not configured' };
    }
    const start = Date.now();
    try {
      await this.generateText({ prompt: 'Ping', maxTokens: 10 }, 'llama3.1-8b');
      return { available: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { available: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
}

// ============================================================
// 3. GROQ PROVIDER ADAPTER (OpenAI-Compatible Fast Inference)
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
    const candidateModel = modelId || process.env.FALLBACK_MODEL || 'groq/compound-mini';

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
        const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          if (res.status === 400 && requestBody.response_format) {
            delete requestBody.response_format;
            const retryRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });
            if (retryRes.ok) {
              const retryData: any = await retryRes.json();
              const choice = retryData?.choices?.[0];
              return {
                text: choice?.message?.content || '',
                provider: 'groq',
                model: candidateModel,
                isFallback: k > 0,
                latencyMs: Date.now() - startTime,
                usage: retryData?.usage
                  ? {
                      inputTokens: retryData.usage.prompt_tokens,
                      outputTokens: retryData.usage.completion_tokens,
                      totalTokens: retryData.usage.total_tokens,
                    }
                  : undefined,
              };
            }
          }

          if (res.status === 429) {
            console.warn(`[GroqProvider] Key hit 429 rate limit. Setting cooldown.`);
            setKeyCooldown(apiKey);
          } else if (res.status === 401 || res.status === 403) {
            setKeyCooldown(apiKey, 3600 * 1000);
            throw new Error(`Groq Authentication Error (${res.status}): ${errBody || res.statusText}`);
          }

          throw new Error(`Groq API Error (${res.status}): ${errBody || res.statusText}`);
        }

        const data: any = await res.json();
        const choice = data?.choices?.[0];
        const text = choice?.message?.content || '';

        if (text) {
          return {
            text,
            provider: 'groq',
            model: candidateModel,
            isFallback: k > 0,
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

    throw lastError || new Error(`Groq generation failed for model '${candidateModel}'.`);
  }

  async healthCheck(): Promise<{ available: boolean; latencyMs: number; error?: string }> {
    if (!this.isConfigured()) {
      return { available: false, latencyMs: 0, error: 'GROQ_API_KEY / FALLBACK_API_KEY not configured' };
    }
    const start = Date.now();
    try {
      await this.generateText({ prompt: 'Ping', maxTokens: 10 }, 'groq/compound-mini');
      return { available: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { available: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
}

// ============================================================
// 4. LONGCAT PROVIDER ADAPTER (Custom / OpenAI-Compatible Provider)
// ============================================================
export class LongCatProvider implements AIProvider {
  id: AIProviderId = 'longcat';
  name = 'LongCat AI';

  getBaseUrl(): string {
    return (process.env.LONGCAT_BASE_URL || 'https://api.longcat.ai/v1').replace(/\/+$/, '');
  }

  isConfigured(): boolean {
    return getApiKeys('LONGCAT_API_KEY', 'LONGCAT_API_KEYS').length > 0;
  }

  async generateText(options: AiGenerateOptions, modelId?: string): Promise<AiGenerateResult> {
    const apiKeys = getApiKeys('LONGCAT_API_KEY', 'LONGCAT_API_KEYS');
    if (apiKeys.length === 0) {
      throw new Error('LONGCAT_API_KEY is not configured in server environment.');
    }

    const availableKeys = apiKeys.filter(k => !isKeyCoolingDown(k));
    const keysToTry = availableKeys.length > 0 ? availableKeys : [apiKeys[0]];
    const candidateModel = modelId || process.env.LONGCAT_MODEL || 'longcat-default';
    const baseUrl = this.getBaseUrl();

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
    messages.push({ role: 'user', content: promptText });

    let lastError: any = null;
    const startTime = Date.now();

    for (let k = 0; k < keysToTry.length; k++) {
      const apiKey = keysToTry[k];
      const requestBody: any = {
        model: candidateModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 4096,
      };

      if (options.jsonMode) {
        requestBody.response_format = { type: 'json_object' };
      }

      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => '');
          if (res.status === 400 && requestBody.response_format) {
            delete requestBody.response_format;
            const retryRes = await fetch(`${baseUrl}/chat/completions`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody),
            });
            if (retryRes.ok) {
              const retryData: any = await retryRes.json();
              const choice = retryData?.choices?.[0];
              return {
                text: choice?.message?.content || '',
                provider: 'longcat',
                model: candidateModel,
                isFallback: k > 0,
                latencyMs: Date.now() - startTime,
                usage: retryData?.usage
                  ? {
                      inputTokens: retryData.usage.prompt_tokens,
                      outputTokens: retryData.usage.completion_tokens,
                      totalTokens: retryData.usage.total_tokens,
                    }
                  : undefined,
              };
            }
          }

          if (res.status === 429) {
            console.warn(`[LongCatProvider] Key hit 429 rate limit. Setting cooldown.`);
            setKeyCooldown(apiKey);
          } else if (res.status === 401 || res.status === 403) {
            setKeyCooldown(apiKey, 3600 * 1000);
            throw new Error(`LongCat Authentication Error (${res.status}): ${errBody || res.statusText}`);
          }

          throw new Error(`LongCat API Error (${res.status}): ${errBody || res.statusText}`);
        }

        const data: any = await res.json();
        const choice = data?.choices?.[0];
        const text = choice?.message?.content || '';

        if (text) {
          return {
            text,
            provider: 'longcat',
            model: candidateModel,
            isFallback: k > 0,
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

    throw lastError || new Error(`LongCat generation failed for model '${candidateModel}'.`);
  }

  async healthCheck(): Promise<{ available: boolean; latencyMs: number; error?: string }> {
    if (!this.isConfigured()) {
      return { available: false, latencyMs: 0, error: 'LONGCAT_API_KEY not configured' };
    }
    const start = Date.now();
    try {
      await this.generateText({ prompt: 'Ping', maxTokens: 10 }, 'longcat-default');
      return { available: true, latencyMs: Date.now() - start };
    } catch (err: any) {
      return { available: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
}

// Provider Singleton Instances
export const geminiProvider = new GeminiProvider();
export const cerebrasProvider = new CerebrasProvider();
export const groqProvider = new GroqProvider();
export const longcatProvider = new LongCatProvider();

export const providersMap: Record<AIProviderId, AIProvider> = {
  gemini: geminiProvider,
  cerebras: cerebrasProvider,
  groq: groqProvider,
  longcat: longcatProvider,
};
