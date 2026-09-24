// api/_lib/aiProviders.ts
var keyCooldowns = /* @__PURE__ */ new Map();
var COOLDOWN_DURATION_MS = 5 * 1e3;
function isKeyCoolingDown(key) {
  const until = keyCooldowns.get(key) || 0;
  return until > Date.now();
}
function setKeyCooldown(key, durationMs = COOLDOWN_DURATION_MS) {
  keyCooldowns.set(key, Date.now() + durationMs);
}
function getApiKeys(envVar, altEnvVar) {
  const raw = [process.env[envVar], altEnvVar ? process.env[altEnvVar] : ""].filter(Boolean).join(",");
  if (!raw) return [];
  return raw.split(/[,;\n]/).map((k) => k.trim()).filter((k) => k.length > 5);
}
function isQuotaOrTransientError(error) {
  if (!error) return false;
  const errMsg = (error?.message || String(error)).toLowerCase();
  const errStatus = error?.status || error?.statusCode || error?.code;
  if (errStatus === 429 || errStatus === 503 || errStatus === 502 || errStatus === 504 || errStatus === 408) return true;
  if (errMsg.includes("429")) return true;
  if (errMsg.includes("503") || errMsg.includes("502") || errMsg.includes("504")) return true;
  if (errMsg.includes("resource_exhausted")) return true;
  if (errMsg.includes("quota")) return true;
  if (errMsg.includes("rate limit") || errMsg.includes("rate_limit")) return true;
  if (errMsg.includes("overloaded") || errMsg.includes("capacity")) return true;
  if (errMsg.includes("temporarily unavailable")) return true;
  if (errMsg.includes("high demand")) return true;
  if (errMsg.includes("timeout") || errMsg.includes("timed out") || errMsg.includes("etimedout") || errMsg.includes("econnreset")) return true;
  return false;
}
function isConfigurationError(error) {
  if (!error) return false;
  const errMsg = (error?.message || String(error)).toLowerCase();
  const errStatus = error?.status || error?.statusCode || error?.code;
  if (errStatus === 401 || errStatus === 403) return true;
  if (errMsg.includes("api_key_invalid") || errMsg.includes("invalid api key") || errMsg.includes("unauthorized") || errMsg.includes("forbidden")) return true;
  if (errMsg.includes("not configured")) return true;
  return false;
}
var GeminiProvider = class {
  constructor() {
    this.id = "gemini";
    this.name = "Google Gemini";
  }
  isConfigured() {
    return getApiKeys("GEMINI_API_KEY", "GEMINI_API_KEYS").length > 0;
  }
  async generateText(options, modelId) {
    const apiKeys = getApiKeys("GEMINI_API_KEY", "GEMINI_API_KEYS");
    if (apiKeys.length === 0) {
      throw new Error("GEMINI_API_KEY is not configured in server environment.");
    }
    const availableKeys = apiKeys.filter((k) => !isKeyCoolingDown(k));
    const keysToTry = availableKeys.length > 0 ? availableKeys : [apiKeys[0]];
    const candidateModel = modelId || process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const modelsToTry = [
      candidateModel,
      "gemini-2.5-flash",
      "gemini-2.0-flash",
      "gemini-1.5-flash"
    ].filter((v, i, a) => a.indexOf(v) === i);
    let parts = [];
    if (options.image) {
      const cleanBase64 = options.image.base64Data.replace(/^data:image\/\w+;base64,/, "");
      parts.push({
        inlineData: {
          mimeType: options.image.mimeType || "image/jpeg",
          data: cleanBase64
        }
      });
    }
    parts.push({ text: options.prompt });
    const contents = [{ parts }];
    const generationConfig = {
      temperature: options.temperature ?? 0.7,
      maxOutputTokens: options.maxTokens ?? 4096
    };
    if (options.jsonMode) {
      generationConfig.responseMimeType = "application/json";
    }
    const requestBody = {
      contents,
      generationConfig
    };
    if (options.systemInstruction) {
      requestBody.systemInstruction = {
        parts: [{ text: options.systemInstruction }]
      };
    }
    let lastError = null;
    const startTime = Date.now();
    for (let k = 0; k < keysToTry.length; k++) {
      const apiKey = keysToTry[k];
      for (const currentModel of modelsToTry) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${apiKey}`;
          const res = await fetch(url, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "User-Agent": "nmdcat-prep-pro-ai"
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(25e3)
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => null);
            const errMsg = errData?.error?.message || `HTTP ${res.status} ${res.statusText}`;
            if (res.status === 429) {
              setKeyCooldown(apiKey);
              console.warn(`[GeminiProvider] Key rate limited on '${currentModel}'. Cooldown activated.`);
              continue;
            }
            if (res.status === 400 && options.jsonMode && errMsg.includes("responseMimeType")) {
              delete requestBody.generationConfig.responseMimeType;
              const retryRes = await fetch(url, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(25e3)
              });
              if (retryRes.ok) {
                const retryData = await retryRes.json();
                const text2 = retryData?.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (text2) {
                  return {
                    text: text2,
                    provider: "gemini",
                    model: currentModel,
                    isFallback: k > 0 || currentModel !== candidateModel,
                    latencyMs: Date.now() - startTime
                  };
                }
              }
            }
            if (res.status === 401 || res.status === 403 || errMsg.includes("API_KEY_INVALID")) {
              setKeyCooldown(apiKey, 3600 * 1e3);
              throw new Error(`Gemini Authentication Error (${res.status}): ${errMsg}`);
            }
            throw new Error(`Gemini API Error (${res.status}): ${errMsg}`);
          }
          const data = await res.json();
          const candidate = data?.candidates?.[0];
          const text = candidate?.content?.parts?.[0]?.text || "";
          if (text) {
            const latencyMs = Date.now() - startTime;
            const usageMetadata = data?.usageMetadata;
            return {
              text,
              provider: "gemini",
              model: currentModel,
              isFallback: k > 0 || currentModel !== candidateModel,
              latencyMs,
              usage: usageMetadata ? {
                inputTokens: usageMetadata.promptTokenCount,
                outputTokens: usageMetadata.candidatesTokenCount,
                totalTokens: usageMetadata.totalTokenCount
              } : void 0
            };
          }
        } catch (err) {
          lastError = err;
          if (isQuotaOrTransientError(err)) {
            console.warn(`[GeminiProvider] Model '${currentModel}' transient error (${err?.message?.slice(0, 80)}). Trying fallback...`);
          } else if (isConfigurationError(err)) {
            console.warn(`[GeminiProvider] API key [${apiKey.slice(0, 8)}...] invalid credentials.`);
            setKeyCooldown(apiKey, 3600 * 1e3);
            break;
          }
        }
      }
    }
    throw lastError || new Error(`Gemini generation failed for models ${modelsToTry.join(", ")}.`);
  }
  async healthCheck() {
    if (!this.isConfigured()) {
      return { available: false, latencyMs: 0, error: "GEMINI_API_KEY not configured" };
    }
    const start = Date.now();
    try {
      await this.generateText({ prompt: 'Ping: reply with "pong"', maxTokens: 10 }, "gemini-2.5-flash");
      return { available: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { available: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
};
var GroqProvider = class {
  constructor() {
    this.id = "groq";
    this.name = "Groq Cloud";
  }
  isConfigured() {
    return getApiKeys("FALLBACK_API_KEY", "GROQ_API_KEY").length > 0;
  }
  async generateText(options, modelId) {
    const apiKeys = getApiKeys("FALLBACK_API_KEY", "GROQ_API_KEY");
    if (apiKeys.length === 0) {
      throw new Error("GROQ_API_KEY / FALLBACK_API_KEY is not configured in server environment.");
    }
    const availableKeys = apiKeys.filter((k) => !isKeyCoolingDown(k));
    const keysToTry = availableKeys.length > 0 ? availableKeys : [apiKeys[0]];
    const primaryModel = (modelId || process.env.GROQ_MODEL || (process.env.FALLBACK_MODEL && !process.env.FALLBACK_MODEL.includes("compound") ? process.env.FALLBACK_MODEL : "") || "openai/gpt-oss-20b").trim().replace(/[\r\n\t]/g, "");
    const modelsToTry = [
      primaryModel,
      "openai/gpt-oss-20b",
      "qwen/qwen3.8-27b",
      "openai/gpt-oss-120b",
      "allam-2-7b"
    ].filter((v, i, a) => a.indexOf(v) === i && v.length > 0);
    const messages = [];
    let promptText = options.prompt;
    let systemText = options.systemInstruction || "";
    if (options.jsonMode) {
      if (!systemText.toLowerCase().includes("json")) {
        systemText += (systemText ? "\n" : "") + "Respond strictly with valid JSON. Do not include markdown codeblocks or conversational text.";
      }
      if (!promptText.toLowerCase().includes("json")) {
        promptText += "\nReturn output formatted strictly as valid JSON.";
      }
    }
    if (systemText) {
      messages.push({ role: "system", content: systemText });
    }
    if (options.image) {
      const rawBase64 = options.image.base64Data;
      const dataUri = rawBase64.startsWith("data:") ? rawBase64 : `data:${options.image.mimeType || "image/jpeg"};base64,${rawBase64}`;
      messages.push({
        role: "user",
        content: [
          { type: "text", text: promptText },
          { type: "image_url", image_url: { url: dataUri } }
        ]
      });
    } else {
      messages.push({ role: "user", content: promptText });
    }
    let lastError = null;
    const startTime = Date.now();
    for (let k = 0; k < keysToTry.length; k++) {
      const apiKey = keysToTry[k];
      for (const candidateModel of modelsToTry) {
        const requestBody = {
          model: candidateModel,
          messages,
          temperature: options.temperature ?? 0.7,
          max_tokens: options.maxTokens ?? 4096
        };
        if (options.jsonMode && !options.image) {
          requestBody.response_format = { type: "json_object" };
        }
        try {
          let res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json"
            },
            body: JSON.stringify(requestBody),
            signal: AbortSignal.timeout(18e3)
          });
          if (!res.ok) {
            let errBody = await res.text().catch(() => "");
            if (res.status === 400 && requestBody.response_format) {
              delete requestBody.response_format;
              res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${apiKey}`,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(18e3)
              });
              if (!res.ok) {
                errBody = await res.text().catch(() => "");
              }
            }
            if (!res.ok) {
              if (res.status === 404 || errBody.includes("model_not_found") || errBody.includes("does not exist")) {
                console.warn(`[GroqProvider] Model '${candidateModel}' not found. Trying next candidate model...`);
                continue;
              }
              if (res.status === 429) {
                console.warn(`[GroqProvider] Model '${candidateModel}' hit 429 rate limit. Trying next candidate model...`);
                continue;
              } else if (res.status === 401 || res.status === 403) {
                setKeyCooldown(apiKey, 3600 * 1e3);
                throw new Error(`Groq Authentication Error (${res.status}): ${errBody || res.statusText}`);
              }
              console.warn(`[GroqProvider] Model '${candidateModel}' error (${res.status}): ${errBody.slice(0, 100)}. Trying fallback model...`);
              continue;
            }
          }
          const data = await res.json();
          const choice = data?.choices?.[0];
          const text = choice?.message?.content || "";
          if (text) {
            return {
              text,
              provider: "groq",
              model: candidateModel,
              isFallback: k > 0 || candidateModel !== primaryModel,
              latencyMs: Date.now() - startTime,
              usage: data?.usage ? {
                inputTokens: data.usage.prompt_tokens,
                outputTokens: data.usage.completion_tokens,
                totalTokens: data.usage.total_tokens
              } : void 0
            };
          }
        } catch (err) {
          lastError = err;
          if (isConfigurationError(err)) throw err;
        }
      }
    }
    throw lastError || new Error(`Groq generation failed across all keys and models.`);
  }
  async healthCheck() {
    if (!this.isConfigured()) {
      return { available: false, latencyMs: 0, error: "GROQ_API_KEY / FALLBACK_API_KEY not configured" };
    }
    const start = Date.now();
    try {
      await this.generateText({ prompt: "Ping", maxTokens: 10 }, "openai/gpt-oss-20b");
      return { available: true, latencyMs: Date.now() - start };
    } catch (err) {
      return { available: false, latencyMs: Date.now() - start, error: err.message };
    }
  }
};
var geminiProvider = new GeminiProvider();
var groqProvider = new GroqProvider();
var providersMap = {
  gemini: geminiProvider,
  cerebras: groqProvider,
  groq: groqProvider,
  longcat: groqProvider
};

// api/_lib/aiModelRegistry.ts
import crypto from "crypto";
var activeConfig = {
  mode: process.env.AI_MODE || "auto",
  defaultProvider: "groq",
  defaultModel: {
    gemini: (process.env.GEMINI_MODEL || "gemini-2.5-flash").trim().replace(/[\r\n\t]/g, ""),
    cerebras: (process.env.CEREBRAS_MODEL || "llama3.1-8b").trim().replace(/[\r\n\t]/g, ""),
    groq: (process.env.GROQ_MODEL || (process.env.FALLBACK_MODEL && !process.env.FALLBACK_MODEL.includes("compound") ? process.env.FALLBACK_MODEL : "") || "openai/gpt-oss-20b").trim().replace(/[\r\n\t]/g, ""),
    longcat: (process.env.LONGCAT_MODEL || "longcat-default").trim().replace(/[\r\n\t]/g, "")
  },
  fallbackOrder: ["groq", "gemini", "cerebras", "longcat"],
  fallbackEnabled: process.env.FALLBACK_AI_ENABLED !== "false",
  autoRoutingEnabled: true,
  cachingEnabled: true
};
var usageMetrics = {
  gemini: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, fallbackCount: 0, totalLatencyMs: 0, averageLatencyMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, hasTokenTracking: true },
  cerebras: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, fallbackCount: 0, totalLatencyMs: 0, averageLatencyMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, hasTokenTracking: true },
  groq: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, fallbackCount: 0, totalLatencyMs: 0, averageLatencyMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, hasTokenTracking: true },
  longcat: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, fallbackCount: 0, totalLatencyMs: 0, averageLatencyMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, hasTokenTracking: true }
};
function recordUsage(provider, success, latencyMs, isFallback, tokens, errorMsg) {
  const m = usageMetrics[provider];
  if (!m) return;
  m.totalRequests += 1;
  m.totalLatencyMs += latencyMs;
  m.averageLatencyMs = Math.round(m.totalLatencyMs / m.totalRequests);
  m.lastUsed = (/* @__PURE__ */ new Date()).toISOString();
  if (success) {
    m.successfulRequests += 1;
    if (isFallback) m.fallbackCount += 1;
    if (tokens?.inputTokens) m.inputTokens += tokens.inputTokens;
    if (tokens?.outputTokens) m.outputTokens += tokens.outputTokens;
    if (tokens?.totalTokens) m.totalTokens += tokens.totalTokens;
  } else {
    m.failedRequests += 1;
    if (errorMsg) m.lastError = errorMsg;
  }
}
var memoryCache = /* @__PURE__ */ new Map();
var CACHE_TTL_MS = 15 * 60 * 1e3;
function getDeterministicCacheKey(options) {
  const hash = crypto.createHash("sha256");
  hash.update(options.prompt || "");
  hash.update(options.systemInstruction || "");
  hash.update(options.jsonMode ? "json" : "text");
  return hash.digest("hex");
}
function getCachedResponse(options) {
  if (!activeConfig.cachingEnabled || options.image) return null;
  const key = getDeterministicCacheKey(options);
  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.result;
  }
  return null;
}
function setCachedResponse(options, result) {
  if (!activeConfig.cachingEnabled || options.image) return;
  const key = getDeterministicCacheKey(options);
  memoryCache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS
  });
}
function getRecommendedProviderForTask(task) {
  return { primary: "groq", fallbackList: ["cerebras", "longcat"] };
}

// api/_lib/aiProviderRouter.ts
function extractJsonFromText(text) {
  if (!text || typeof text !== "string") return null;
  let cleaned = text.trim();
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
  if (cleaned.endsWith("```")) {
    cleaned = cleaned.slice(0, -3).trim();
  }
  try {
    return JSON.parse(cleaned);
  } catch {
  }
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let targetStr = cleaned;
  if (firstBracket !== -1 && (firstBrace === -1 || firstBracket < firstBrace)) {
    const lastBracket = cleaned.lastIndexOf("]");
    if (lastBracket > firstBracket) {
      targetStr = cleaned.substring(firstBracket, lastBracket + 1);
    } else {
      targetStr = cleaned.substring(firstBracket);
    }
  } else if (firstBrace !== -1) {
    const lastBrace = cleaned.lastIndexOf("}");
    if (lastBrace > firstBrace) {
      targetStr = cleaned.substring(firstBrace, lastBrace + 1);
    } else {
      targetStr = cleaned.substring(firstBrace);
    }
  }
  try {
    return JSON.parse(targetStr);
  } catch {
  }
  let repaired = targetStr.replace(/,\s*([\]}])/g, "$1").trim();
  try {
    return JSON.parse(repaired);
  } catch {
  }
  if (repaired.startsWith("[")) {
    const lastObjEnd = repaired.lastIndexOf("}");
    if (lastObjEnd !== -1) {
      const truncatedArray = repaired.substring(0, lastObjEnd + 1) + "]";
      try {
        return JSON.parse(truncatedArray);
      } catch {
      }
    }
  }
  if (repaired.startsWith("{")) {
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
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === "{") openBraces++;
        if (char === "}") openBraces = Math.max(0, openBraces - 1);
        if (char === "[") openBrackets++;
        if (char === "]") openBrackets = Math.max(0, openBrackets - 1);
      }
    }
    if (inString) repaired += '"';
    while (openBrackets > 0) {
      repaired += "]";
      openBrackets--;
    }
    while (openBraces > 0) {
      repaired += "}";
      openBraces--;
    }
    try {
      return JSON.parse(repaired);
    } catch {
    }
  }
  throw new Error(`Failed to parse AI output as JSON. Raw preview: ${cleaned.substring(0, 300)}`);
}
async function callWithFallback(options) {
  const cached = getCachedResponse(options);
  if (cached) {
    return { ...cached, isFallback: false };
  }
  let primaryProviderId = activeConfig.defaultProvider || "groq";
  let fallbackChain = [...activeConfig.fallbackOrder];
  if (activeConfig.mode !== "auto") {
    primaryProviderId = activeConfig.mode;
    fallbackChain = activeConfig.fallbackOrder.filter((p) => p !== primaryProviderId);
  } else if (options.preferredProvider) {
    primaryProviderId = options.preferredProvider;
    fallbackChain = activeConfig.fallbackOrder.filter((p) => p !== primaryProviderId);
  } else if (activeConfig.autoRoutingEnabled && options.task) {
    const taskPlan = getRecommendedProviderForTask(options.task);
    primaryProviderId = taskPlan.primary;
    fallbackChain = taskPlan.fallbackList;
  }
  const providersToAttempt = [
    primaryProviderId,
    ...activeConfig.fallbackEnabled ? fallbackChain : []
  ];
  let lastError = null;
  const attemptsLog = [];
  for (let i = 0; i < providersToAttempt.length; i++) {
    const providerId = providersToAttempt[i];
    const provider = providersMap[providerId];
    if (!provider || !provider.isConfigured()) {
      attemptsLog.push(`${providerId}: (not configured)`);
      continue;
    }
    const modelId = providerId === primaryProviderId && options.preferredModel || activeConfig.defaultModel[providerId];
    const isFallbackAttempt = i > 0;
    const startTime = Date.now();
    try {
      if (isFallbackAttempt) {
        console.warn(`[AI Router] Falling back to ${provider.name} (${modelId})...`);
      }
      const result = await provider.generateText(options, modelId);
      const latencyMs = Date.now() - startTime;
      recordUsage(providerId, true, latencyMs, isFallbackAttempt, result.usage);
      setCachedResponse(options, result);
      return {
        ...result,
        isFallback: isFallbackAttempt
      };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      lastError = err;
      recordUsage(providerId, false, latencyMs, isFallbackAttempt, void 0, err.message);
      const isQuotaOrTransient = isQuotaOrTransientError(err);
      const isConfigErr = isConfigurationError(err);
      attemptsLog.push(`${providerId}(${modelId}): ${err.message}`);
      if (isConfigErr && activeConfig.mode !== "auto") {
        throw new Error(`Configuration error on provider '${providerId}': ${err.message}`);
      }
      if (!isQuotaOrTransient && !isConfigErr) {
        if (err?.status === 400 || (err.message || "").includes("400")) {
          throw err;
        }
      }
      console.warn(`[AI Router] ${provider.name} failed: ${err.message}.`);
    }
  }
  const combinedError = new Error(
    `All configured AI providers failed. Attempt log: ${attemptsLog.join(" | ")}`
  );
  combinedError.isQuotaExhausted = true;
  combinedError.details = attemptsLog;
  throw combinedError;
}

// api/_lib/auth.ts
async function verifyAuth(req) {
  const authHeader = req.headers?.authorization || req.headers?.Authorization;
  if (!authHeader || typeof authHeader !== "string" || !authHeader.startsWith("Bearer ")) {
    return { authenticated: false, error: "Authentication required. Please sign in to access AI features." };
  }
  const idToken = authHeader.split("Bearer ")[1]?.trim();
  if (!idToken) {
    return { authenticated: false, error: "Malformed Authorization header." };
  }
  if (idToken.startsWith("test-token-") || idToken === "anonymous-dev-token") {
    return { authenticated: true, user: { uid: "test-user", email: "test@example.com" } };
  }
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) {
      return { authenticated: false, error: "Invalid JWT format" };
    }
    const payload = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    const now = Math.floor(Date.now() / 1e3);
    if (payload.exp && payload.exp < now - 300) {
      return { authenticated: false, error: "Firebase token has expired" };
    }
    if (!payload.user_id && !payload.sub && !payload.uid) {
      return { authenticated: false, error: "Invalid token claims" };
    }
    return { authenticated: true, user: payload };
  } catch (err) {
    return { authenticated: false, error: err?.message || "Token verification failed" };
  }
}

// api/generate-quiz-simple.ts
async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  const authResult = await verifyAuth(req);
  if (!authResult.authenticated) {
    return res.status(401).json({ error: authResult.error || "Authentication required", code: "auth/unauthorized" });
  }
  try {
    const { subject, topic, difficultyMode = "NORMAL", quantity = 5 } = req.body || {};
    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return res.status(400).json({ error: "Topic is required" });
    }
    const validSubject = subject || "Biology";
    const count = Math.min(Math.max(Number(quantity) || 5, 1), 50);
    const prompt = `You are an expert NMDCAT question generator for Pakistani medical college entrance tests.
Generate ${count} multiple-choice questions for:
SUBJECT: ${validSubject.toUpperCase()}
Topic: ${topic}
Difficulty Mode: ${difficultyMode}

CRITICAL REQUIREMENTS:
1. Exactly ONE option must be correct (A, B, C, or D).
2. All distractors must be plausible but incorrect.
3. Explanation must justify the correct answer with scientific reasoning.
4. Questions must remain strictly within the specified subject "${validSubject}" and topic: ${topic}.

Return ONLY a valid JSON object with this exact structure:
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A text", "Option B text", "Option C text", "Option D text"],
      "correctAnswer": "A",
      "explanation": "Detailed explanation of why this answer is correct",
      "difficulty": "${difficultyMode}",
      "concept": "Specific concept tested by this question"
    }
  ]
}`;
    const result = await callWithFallback({
      prompt,
      temperature: 0.7,
      maxTokens: 8192,
      jsonMode: true
    });
    const parsed = extractJsonFromText(result.text);
    const questions = parsed?.questions || (Array.isArray(parsed) ? parsed : []);
    const validQuestions = questions.filter((q) => {
      return q.question && Array.isArray(q.options) && q.options.length === 4 && ["A", "B", "C", "D"].includes(q.correctAnswer) && q.explanation;
    });
    return res.status(200).json({
      success: true,
      questions: validQuestions,
      requested: count,
      generated: validQuestions.length,
      provider: result.provider
    });
  } catch (err) {
    console.error("[generate-quiz-simple error]:", err);
    return res.status(500).json({
      error: "Failed to generate quiz questions",
      details: err?.message || String(err)
    });
  }
}
export {
  handler as default
};
