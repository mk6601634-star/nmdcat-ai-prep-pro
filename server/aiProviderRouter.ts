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

  return false;
}

// Cleanly extract JSON from text (handles markdown blocks, raw JSON arrays, objects)
export function extractJsonFromText(text: string): any {
  if (!text || typeof text !== "string") return null;

  let cleaned = text.trim();

  // 1. Try direct JSON parse first
  try {
    return JSON.parse(cleaned);
  } catch {}

  // 2. Try extracting from markdown code fences: ```json ... ``` or ``` ... ```
  const fenceMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fenceMatch && fenceMatch[1]) {
    const fenceContent = fenceMatch[1].trim();
    try {
      return JSON.parse(fenceContent);
    } catch {}
    cleaned = fenceContent;
  }

  // 3. Determine if the outermost structure is an Object {...} or Array [...]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    // Object appears first -> extract outermost { ... }
    const lastBrace = cleaned.lastIndexOf('}');
    if (lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.substring(firstBrace, lastBrace + 1));
      } catch {}
    }
  } else if (firstBracket !== -1) {
    // Array appears first -> extract outermost [ ... ]
    const lastBracket = cleaned.lastIndexOf(']');
    if (lastBracket > firstBracket) {
      try {
        return JSON.parse(cleaned.substring(firstBracket, lastBracket + 1));
      } catch {}
    }
  }

  // 4. Secondary fallback regex matching
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  if (objMatch) {
    try {
      return JSON.parse(objMatch[0]);
    } catch {}
  }

  const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
  if (arrayMatch) {
    try {
      return JSON.parse(arrayMatch[0]);
    } catch {}
  }

  throw new Error(`Failed to parse AI output as JSON. Raw output preview: ${cleaned.substring(0, 300)}`);
}

// ============================================================
// GEMINI PRIMARY PROVIDER (@google/genai SDK)
// ============================================================
export async function callGemini(options: AiGenerateOptions): Promise<AiGenerateResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.6-flash";

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
    maxOutputTokens: options.maxTokens ?? 8192,
  };

  if (options.systemInstruction) {
    config.systemInstruction = options.systemInstruction;
  }

  const response = await ai.models.generateContent({
    model,
    contents,
    config,
  });

  const responseText = response.text || "";

  return {
    text: responseText,
    provider: "gemini",
    model,
    isFallback: false,
  };
}

// ============================================================
// GROQ FALLBACK PROVIDER (OpenAI-Compatible REST API)
// ============================================================
export async function callGroq(options: AiGenerateOptions): Promise<AiGenerateResult> {
  const apiKey = process.env.FALLBACK_API_KEY || process.env.GROQ_API_KEY;
  const defaultModel = options.image
    ? process.env.FALLBACK_VISION_MODEL || "llama-3.2-11b-vision-preview"
    : process.env.FALLBACK_MODEL || "groq/compound-mini";

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

  const requestBody: any = {
    model: defaultModel,
    messages,
    temperature: options.temperature ?? 0.7,
    max_tokens: options.maxTokens ?? 8192,
  };

  // If jsonMode is requested, enforce JSON Object mode where supported
  if (options.jsonMode) {
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
    throw new Error(`Groq API Error (${res.status}): ${errBody || res.statusText}`);
  }

  const data: any = await res.json();
  const choice = data?.choices?.[0];
  const responseText = choice?.message?.content || "";

  return {
    text: responseText,
    provider: "groq",
    model: defaultModel,
    isFallback: true,
  };
}

// ============================================================
// PROVIDER ROUTER WITH AUTOMATIC FAILOVER
// ============================================================
export async function callWithFallback(options: AiGenerateOptions): Promise<AiGenerateResult> {
  const fallbackEnabled = process.env.FALLBACK_AI_ENABLED !== "false";
  const hasGeminiKey = !!process.env.GEMINI_API_KEY;
  const hasFallbackKey = !!(process.env.FALLBACK_API_KEY || process.env.GROQ_API_KEY);

  // If no Gemini key is set but fallback key is present, route directly to fallback
  if (!hasGeminiKey && hasFallbackKey) {
    console.log(`[AI Gateway] No Gemini key found. Directing request to fallback provider (Groq)...`);
    return await callGroq(options);
  }

  // 1. Attempt Primary (Gemini)
  try {
    const result = await callGemini(options);
    return result;
  } catch (primaryError: any) {
    const isQuota = isQuotaOrRateLimitError(primaryError);

    // If error is NOT a quota/rate-limit error, or if fallback is not configured, rethrow immediately
    if (!isQuota || !fallbackEnabled || !hasFallbackKey) {
      if (isQuota) {
        console.warn(`[AI Gateway] Gemini rate limited (429), but fallback is not configured or disabled.`);
      }
      throw primaryError;
    }

    // 2. Execute Fallback (Groq) on Quota/Rate-Limit failure
    console.warn(`[AI Gateway] Primary (Gemini) quota exhausted / rate limited (429). Failing over to Groq fallback...`);
    
    try {
      const fallbackResult = await callGroq(options);
      console.log(`[AI Gateway] Fallback (Groq / ${fallbackResult.model}) succeeded seamlessly.`);
      return fallbackResult;
    } catch (fallbackError: any) {
      console.error(`[AI Gateway] Fallback provider also failed:`, fallbackError.message);
      
      // Combine errors for informative diagnostic logging
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
