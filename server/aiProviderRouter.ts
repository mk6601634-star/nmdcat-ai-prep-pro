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
  "gemini-3.5-flash"
];

// Active Groq model cascade list (tested working models with Groq Cloud)
const GROQ_CASCADE_MODELS = [
  process.env.FALLBACK_MODEL || "groq/compound-mini",
  "qwen/qwen3.8-27b",
  "groq/compound",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b"
];

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

// Multi-key retrieval and rotation helper
function getApiKeys(envVar: string, altEnvVar?: string): string[] {
  const raw = [process.env[envVar], altEnvVar ? process.env[altEnvVar] : ""].filter(Boolean).join(",");
  if (!raw) return [];
  return raw
    .split(/[,;\n]/)
    .map(k => k.trim())
    .filter(k => k.length > 5);
}

// Cooldown tracking per API key to bypass rate-limited keys instantly (0ms)
const keyCooldowns = new Map<string, number>();
const COOLDOWN_DURATION_MS = 25 * 1000; // 25 seconds cooldown on 429

function isKeyCoolingDown(key: string): boolean {
  const until = keyCooldowns.get(key) || 0;
  return until > Date.now();
}

function setKeyCooldown(key: string, durationMs = COOLDOWN_DURATION_MS) {
  keyCooldowns.set(key, Date.now() + durationMs);
}

// ============================================================
// GEMINI PRIMARY PROVIDER (@google/genai SDK) WITH MULTI-KEY & FAST FAILOVER
// ============================================================
export async function callGemini(options: AiGenerateOptions): Promise<AiGenerateResult> {
  const apiKeys = getApiKeys("GEMINI_API_KEY", "GEMINI_API_KEYS");

  if (apiKeys.length === 0) {
    throw new Error("GEMINI_API_KEY is not configured in environment.");
  }

  // Filter keys not currently in cooldown
  const availableKeys = apiKeys.filter(k => !isKeyCoolingDown(k));
  const keysToTry = availableKeys.length > 0 ? availableKeys : [apiKeys[0]]; // Fallback to first if all in cooldown

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

  const modelsToTry = Array.from(new Set(GEMINI_CASCADE_MODELS));
  let lastError: any = null;

  for (let k = 0; k < keysToTry.length; k++) {
    const apiKey = keysToTry[k];
    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

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
            isFallback: candidateModel !== modelsToTry[0] || k > 0,
          };
        }
      } catch (err: any) {
        lastError = err;
        const isQuota = isQuotaOrRateLimitError(err);
        const isKeyInvalid = (err.message || "").includes("API_KEY_INVALID") || (err.message || "").includes("API key not valid");

        if (isQuota) {
          console.warn(`[AI Gateway] Gemini API key [${apiKey.slice(0, 8)}...] hit 429 quota on model '${candidateModel}'. Marking key on cooldown.`);
          setKeyCooldown(apiKey);
          // Key-level rate limit: All models on this key are rate limited. Break model loop immediately!
          break;
        }

        if (isKeyInvalid) {
          console.warn(`[AI Gateway] Gemini API key [${apiKey.slice(0, 8)}...] invalid. Breaking key loop.`);
          setKeyCooldown(apiKey, 3600 * 1000); // 1 hr cooldown
          break;
        }

        console.warn(`[AI Gateway] Gemini model '${candidateModel}' failed: ${err.message}. ${i < modelsToTry.length - 1 ? 'Cascading to next model...' : ''}`);
        if (i < modelsToTry.length - 1) {
          await sleep(50);
        }
      }
    }
  }

  throw lastError || new Error("All Gemini keys and models failed.");
}

// ============================================================
// GROQ FALLBACK PROVIDER (OpenAI-Compatible REST API) WITH CASCADE
// ============================================================
export async function callGroq(options: AiGenerateOptions): Promise<AiGenerateResult> {
  const apiKeys = getApiKeys("FALLBACK_API_KEY", "GROQ_API_KEY");

  if (apiKeys.length === 0) {
    throw new Error("FALLBACK_API_KEY / GROQ_API_KEY is not configured in environment.");
  }

  const availableKeys = apiKeys.filter(k => !isKeyCoolingDown(k));
  const keysToTry = availableKeys.length > 0 ? availableKeys : [apiKeys[0]];

  const messages: any[] = [];
  let promptText = options.prompt;
  let systemText = options.systemInstruction || "";

  if (options.jsonMode) {
    if (!systemText.toLowerCase().includes("json")) {
      systemText += (systemText ? "\n" : "") + "Respond strictly with valid JSON. Do not include markdown wraps or conversational text.";
    }
    if (!promptText.toLowerCase().includes("json")) {
      promptText += "\nReturn output formatted strictly as valid JSON.";
    }
  }

  if (systemText) {
    messages.push({
      role: "system",
      content: systemText,
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
        { type: "text", text: promptText },
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
      content: promptText,
    });
  }

  const modelsToTry = Array.from(new Set(GROQ_CASCADE_MODELS));
  let lastError: any = null;

  for (let k = 0; k < keysToTry.length; k++) {
    const apiKey = keysToTry[k];

    for (let i = 0; i < modelsToTry.length; i++) {
      const candidateModel = modelsToTry[i];
      
      // First attempt with jsonMode (if requested), then fallback to standard parsing if response_format is rejected
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
            if (res.status === 429) {
              console.warn(`[AI Gateway] Groq key [${apiKey.slice(0, 8)}...] hit 429 rate limit. Cooling down.`);
              setKeyCooldown(apiKey);
              break; // Break model loop to try next key
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
        await sleep(100);
      }
    }
  }

  throw lastError || new Error("All Groq keys and models in cascade failed.");
}

// ============================================================
// PROVIDER ROUTER WITH AUTOMATIC FAILOVER & MEMORY CACHING
// ============================================================
export async function callWithFallback(options: AiGenerateOptions): Promise<AiGenerateResult> {
  const fallbackEnabled = process.env.FALLBACK_AI_ENABLED !== "false";
  const geminiKeys = getApiKeys("GEMINI_API_KEY", "GEMINI_API_KEYS");
  const groqKeys = getApiKeys("FALLBACK_API_KEY", "GROQ_API_KEY");
  const hasGeminiKey = geminiKeys.length > 0;
  const hasFallbackKey = groqKeys.length > 0;

  // Check in-memory cache for deterministic text requests (no image)
  if (!options.image) {
    const cacheKey = getCacheKey(options);
    const cached = memoryCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }
  }

  // If all Gemini keys are currently cooling down from a recent 429, route directly to Groq (0ms overhead)
  const allGeminiCooling = hasGeminiKey && geminiKeys.every(k => isKeyCoolingDown(k));
  if (allGeminiCooling && hasFallbackKey && fallbackEnabled) {
    console.log(`[AI Gateway] Gemini is cooling down. Routing directly to Groq fallback with 0ms delay...`);
    try {
      const result = await callGroq(options);
      if (!options.image) {
        memoryCache.set(getCacheKey(options), { result, expiresAt: Date.now() + CACHE_TTL_MS });
      }
      return result;
    } catch (groqErr) {
      console.warn(`[AI Gateway] Direct Groq call during Gemini cooldown failed, attempting Gemini as last resort.`);
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

    // 2. Execute Fallback (Groq Cascade) instantly on Primary failure
    console.warn(`[AI Gateway] Gemini failed (${primaryError.message}). Instant 0ms failover to Groq cascade...`);
    
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


