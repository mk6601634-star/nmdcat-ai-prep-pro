import { GoogleGenAI } from "@google/genai";

export interface AiGenerateOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  image?: {
    mimeType: string;
    base64Data: string;
  };
}

export interface AiGenerateResult {
  text: string;
  provider: "gemini" | "groq";
  model: string;
  isFallback: boolean;
}

export interface ProviderErrorDetails {
  primaryError?: string;
  fallbackError?: string;
  bothFailed: boolean;
  isQuotaExhausted: boolean;
}

// In-memory LRU TTL Cache (15 min cache) to save quota on repeated calls
interface CacheEntry {
  result: AiGenerateResult;
  expiresAt: number;
}
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes

function getCacheKey(options: AiGenerateOptions): string {
  const promptPart = (options.prompt || "").trim().slice(0, 300);
  const sysPart = (options.systemInstruction || "").trim().slice(0, 100);
  return `${promptPart}__${sysPart}__${options.jsonMode ? "json" : "text"}`;
}

// Check if an error represents rate limit, quota exhaustion, or temporary capacity overload
export function isQuotaOrRateLimitError(error: any): boolean {
  if (!error) return false;
  const errMsg = (error?.message || String(error)).toLowerCase();
  const errStatus = error?.status || error?.statusCode || error?.code;

  if (errStatus === 429 || errStatus === 503) return true;
  if (errMsg.includes("429")) return true;
  if (errMsg.includes("resource_exhausted")) return true;
  if (errMsg.includes("quota")) return true;
  if (errMsg.includes("rate limit")) return true;
  if (errMsg.includes("rate_limit")) return true;
  if (errMsg.includes("overloaded")) return true;
  if (errMsg.includes("temporarily unavailable")) return true;
  if (errMsg.includes("high demand")) return true;

  return false;
}

// Cleanly extract JSON from text (handles markdown blocks, raw JSON arrays, objects, and partial streams)
export function extractJsonFromText(text: string): any {
  if (!text || typeof text !== "string") return null;

  let cleaned = text.trim();

  // 1. Strip markdown code fences if present (including unclosed ```json)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3).trim();
  }

  // 2. Try direct JSON parse
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 3. Extract outermost [ ... ] or { ... }
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let targetStr = cleaned;
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      targetStr = cleaned.substring(firstBracket, lastBracket + 1);
    } else {
      targetStr = cleaned.substring(firstBracket);
    }
  } else if (firstBrace !== -1) {
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      targetStr = cleaned.substring(firstBrace, lastBrace + 1);
    } else {
      targetStr = cleaned.substring(firstBrace);
    }
  }

  try {
    return JSON.parse(targetStr);
  } catch {}

  // 4. Strip trailing commas before closing braces/brackets
  let repaired = targetStr.replace(/,\s*([\]}])/g, '$1').trim();
  try {
    return JSON.parse(repaired);
  } catch {}

  // 5. If it's an array cut off halfway, auto-close array
  if (repaired.startsWith('[')) {
    const lastObjEnd = repaired.lastIndexOf('}');
    if (lastObjEnd !== -1) {
      const truncatedArray = repaired.substring(0, lastObjEnd + 1) + ']';
      try {
        return JSON.parse(truncatedArray);
      } catch {}
    }
  }

  // 6. If it's an object cut off halfway, balance open braces
  if (repaired.startsWith('{')) {
    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escape = false;

    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      if (escape) {
        escape = false;
        continue;
      }
      if (char === '\\') {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') openBraces++;
        if (char === '}') openBraces = Math.max(0, openBraces - 1);
        if (char === '[') openBrackets++;
        if (char === ']') openBrackets = Math.max(0, openBrackets - 1);
      }
    }

    if (inString) repaired += '"';
    while (openBrackets > 0) {
      repaired += ']';
      openBrackets--;
    }
    while (openBraces > 0) {
      repaired += '}';
      openBraces--;
    }

    try {
      return JSON.parse(repaired);
    } catch {}
  }

  throw new Error(`Failed to parse AI output as JSON. Raw output preview: ${cleaned.substring(0, 300)}`);
}

// Active Gemini model cascade list (prioritizing high-throughput, low-latency models)
const GEMINI_CASCADE_MODELS = [
  process.env.GEMINI_MODEL || "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-3.5-flash",
  "gemini-3.6-flash"
];

// Active Groq model cascade list (ultra-fast OpenAI-compatible fallback)
const GROQ_CASCADE_MODELS = [
  process.env.FALLBACK_MODEL || "groq/compound-mini",
  "qwen/qwen3.8-27b",
  "groq/compound",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b"
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// ============================================================
// GEMINI PRIMARY PROVIDER (@google/genai SDK) WITH MODEL CASCADE
// ============================================================
export async function callGemini(options: AiGenerateOptions): Promise<AiGenerateResult> {
  const apiKey = (process.env.GEMINI_API_KEY || "").trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY environment variable is not configured.");
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });

  let contents: any;

  if (options.image) {
    const cleanBase64 = options.image.base64Data.replace(/^data:image\/\w+;base64,/, "");
    contents = {
      parts: [
        {
          inlineData: {
            mimeType: options.image.mimeType || "image/jpeg",
            data: cleanBase64,
          },
        },
        {
          text: options.prompt,
        },
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

  // Deduplicate model candidates while keeping priority
  const modelsToTry = Array.from(new Set(GEMINI_CASCADE_MODELS));
  let lastError: any = null;
  let quotaErrorCount = 0;

  for (let i = 0; i < modelsToTry.length; i++) {
    const candidateModel = modelsToTry[i];
    try {
      const response = await ai.models.generateContent({
        model: candidateModel,
        contents,
        config,
      });

      const responseText = response.text || "";
      if (responseText) {
        return {
          text: responseText,
          provider: "gemini",
          model: candidateModel,
          isFallback: candidateModel !== modelsToTry[0],
        };
      }
    } catch (err: any) {
      lastError = err;
      const isQuota = isQuotaOrRateLimitError(err);
      if (isQuota) quotaErrorCount++;

      console.warn(`[AI Gateway] Gemini model '${candidateModel}' failed (${isQuota ? 'Quota/Rate Limit' : err.message}). ${i < modelsToTry.length - 1 ? 'Cascading...' : 'Gemini models exhausted.'}`);
      
      // If 2 Gemini models fail with key-level quota exhaustion, failover immediately to Groq
      if (quotaErrorCount >= 2) {
        console.warn(`[AI Gateway] Account quota exhausted on Gemini. Fast-failing over to Groq cascade...`);
        break;
      }

      if (i < modelsToTry.length - 1) {
        await sleep(100);
      }
    }
  }

  throw lastError || new Error("All Gemini models in cascade failed.");
}

// ============================================================
// GROQ FALLBACK PROVIDER (OpenAI-Compatible REST API) WITH CASCADE
// ============================================================
export async function callGroq(options: AiGenerateOptions): Promise<AiGenerateResult> {
  const apiKey = (process.env.FALLBACK_API_KEY || process.env.GROQ_API_KEY || "").trim();

  if (!apiKey) {
    throw new Error("FALLBACK_API_KEY (Groq API Key) is not configured in environment.");
  }

  const messages: any[] = [];

  if (options.systemInstruction) {
    messages.push({
      role: "system",
      content: options.systemInstruction,
    });
  }

  if (options.image) {
    const rawBase64 = options.image.base64Data;
    const dataUri = rawBase64.startsWith("data:")
      ? rawBase64
      : `data:${options.image.mimeType || "image/jpeg"};base64,${rawBase64}`;

    messages.push({
      role: "user",
      content: [
        { type: "text", text: options.prompt },
        {
          type: "image_url",
          image_url: {
            url: dataUri,
          },
        },
      ],
    });
  } else {
    messages.push({
      role: "user",
      content: options.prompt,
    });
  }

  const modelsToTry = Array.from(new Set(GROQ_CASCADE_MODELS));
  let lastError: any = null;

  for (let i = 0; i < modelsToTry.length; i++) {
    const candidateModel = modelsToTry[i];
    
    // First attempt with jsonMode (if requested), then without json_object constraint on format error
    const jsonModesToTry = options.jsonMode ? [true, false] : [false];

    for (const useJsonFormat of jsonModesToTry) {
      try {
        const requestBody: any = {
          model: candidateModel,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096,
        };

        if (useJsonFormat) {
          requestBody.response_format = { type: "json_object" };
        }

        const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
        });

        if (!res.ok) {
          const errBody = await res.text().catch(() => "");
          // If 400 bad request due to json_object response_format, try next inner loop without it
          if (res.status === 400 && useJsonFormat && (errBody.includes("response_format") || errBody.includes("json"))) {
            continue;
          }
          throw new Error(`Groq API Error (${res.status}): ${errBody || res.statusText}`);
        }

        const data: any = await res.json();
        const choice = data?.choices?.[0];
        const responseText = choice?.message?.content || "";

        if (responseText) {
          return {
            text: responseText,
            provider: "groq",
            model: candidateModel,
            isFallback: true,
          };
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`[AI Gateway] Groq model '${candidateModel}' failed: ${err.message}`);
        break; // Break inner loop to try next model in cascade
      }
    }

    if (i < modelsToTry.length - 1) {
      await sleep(200);
    }
  }

  throw lastError || new Error("All Groq models in cascade failed.");
}

// ============================================================
// PROVIDER ROUTER WITH AUTOMATIC FAILOVER & MEMORY CACHING
// ============================================================
export async function callWithFallback(options: AiGenerateOptions): Promise<AiGenerateResult> {
  const fallbackEnabled = process.env.FALLBACK_AI_ENABLED !== "false";
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const hasFallbackKey = !!(process.env.FALLBACK_API_KEY || process.env.GROQ_API_KEY);

  // Check in-memory cache for deterministic text requests (no image)
  if (!options.image) {
    const cacheKey = getCacheKey(options);
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }
  }

  // If no Gemini key is set but fallback key is present, route directly to fallback
  if (!hasGeminiKey && hasFallbackKey) {
    console.log(`[AI Gateway] Directing request to fallback provider (Groq)...`);
    const result = await callGroq(options);
    if (!options.image) {
      memoryCache.set(getCacheKey(options), { result, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return result;
  }

  // 1. Attempt Primary (Gemini Cascade)
  try {
    const result = await callGemini(options);
    if (!options.image) {
      memoryCache.set(getCacheKey(options), { result, expiresAt: Date.now() + CACHE_TTL_MS });
    }
    return result;
  } catch (primaryError: any) {
    const isQuota = isQuotaOrRateLimitError(primaryError);

    // If fallback is not configured or disabled, rethrow immediately
    if (!fallbackEnabled || !hasFallbackKey) {
      if (isQuota) {
        console.warn(`[AI Gateway] Gemini rate limited (429), but fallback is not configured or disabled.`);
      }
      throw primaryError;
    }

    // 2. Execute Fallback (Groq Cascade) on Primary failure
    console.warn(`[AI Gateway] All Gemini models exhausted (${primaryError.message}). Failing over to Groq fallback cascade...`);
    
    try {
      const fallbackResult = await callGroq(options);
      console.log(`[AI Gateway] Fallback (Groq / ${fallbackResult.model}) succeeded seamlessly.`);
      if (!options.image) {
        memoryCache.set(getCacheKey(options), { result: fallbackResult, expiresAt: Date.now() + CACHE_TTL_MS });
      }
      return fallbackResult;
    } catch (fallbackError: any) {
      console.error(`[AI Gateway] Fallback provider cascade also failed:`, fallbackError.message);
      
      const combinedError: any = new Error(
        `All AI providers failed. Primary (Gemini): ${primaryError.message} | Fallback (Groq): ${fallbackError.message}`
      );
      combinedError.isQuotaExhausted = true;
      combinedError.primaryError = primaryError.message;
      combinedError.fallbackError = fallbackError.message;
      throw combinedError;
    }
  }
}

