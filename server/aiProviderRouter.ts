import type {
  AiGenerateOptions,
  AiGenerateResult,
  AIProviderId,
  AITaskCategory,
} from './aiTypes.ts';
import {
  providersMap,
  isQuotaOrTransientError,
  isConfigurationError,
} from './aiProviders.ts';
import {
  activeConfig,
  recordUsage,
  getCachedResponse,
  setCachedResponse,
  getRecommendedProviderForTask,
  MODEL_REGISTRY,
} from './aiModelRegistry.ts';

// Cleanly extract JSON from text (handles markdown blocks, raw JSON arrays, objects, and partial streams)
export function extractJsonFromText(text: string): any {
  if (!text || typeof text !== 'string') return null;

  let cleaned = text.trim();

  // 1. Strip markdown code fences if present (including unclosed ```json)
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '');
  if (cleaned.endsWith('```')) {
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

  throw new Error(`Failed to parse AI output as JSON. Raw preview: ${cleaned.substring(0, 300)}`);
}

// ============================================================
// MASTER AI ROUTER WITH TASK-AWARE ROUTING, SHIFTER & TRANSIENT FALLBACK
// ============================================================
export async function callWithFallback(options: AiGenerateOptions): Promise<AiGenerateResult> {
  // 1. Check deterministic in-memory response cache
  const cached = getCachedResponse(options);
  if (cached) {
    return { ...cached, isFallback: false };
  }

  // 2. Determine execution order and model based on active mode & task routing
  let primaryProviderId: AIProviderId = 'gemini';
  let fallbackChain: AIProviderId[] = [...activeConfig.fallbackOrder];

  if (activeConfig.mode !== 'auto') {
    // Shifter has locked mode to a specific provider
    primaryProviderId = activeConfig.mode as AIProviderId;
    fallbackChain = activeConfig.fallbackOrder.filter(p => p !== primaryProviderId);
  } else if (options.preferredProvider) {
    primaryProviderId = options.preferredProvider;
    fallbackChain = activeConfig.fallbackOrder.filter(p => p !== primaryProviderId);
  } else if (activeConfig.autoRoutingEnabled && options.task) {
    const taskPlan = getRecommendedProviderForTask(options.task);
    primaryProviderId = taskPlan.primary;
    fallbackChain = taskPlan.fallbackList;
  }

  // Ensure configured fallback order is respected
  const providersToAttempt: AIProviderId[] = [
    primaryProviderId,
    ...(activeConfig.fallbackEnabled ? fallbackChain : []),
  ];

  let lastError: any = null;
  const attemptsLog: string[] = [];

  for (let i = 0; i < providersToAttempt.length; i++) {
    const providerId = providersToAttempt[i];
    const provider = providersMap[providerId];

    if (!provider || !provider.isConfigured()) {
      attemptsLog.push(`${providerId}: (not configured)`);
      continue;
    }

    const modelId =
      (providerId === primaryProviderId && options.preferredModel) ||
      activeConfig.defaultModel[providerId];

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
        isFallback: isFallbackAttempt,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      lastError = err;
      recordUsage(providerId, false, latencyMs, isFallbackAttempt, undefined, err.message);

      const isQuotaOrTransient = isQuotaOrTransientError(err);
      const isConfigErr = isConfigurationError(err);

      attemptsLog.push(`${providerId}(${modelId}): ${err.message}`);

      // If it's a configuration error (e.g. 401 invalid key on forced provider), do not hide it
      if (isConfigErr && activeConfig.mode !== 'auto') {
        throw new Error(`Configuration error on provider '${providerId}': ${err.message}`);
      }

      if (!isQuotaOrTransient && !isConfigErr) {
        // If it's a 400 Bad Request or malformed prompt, rethrow immediately
        if (err?.status === 400 || (err.message || '').includes('400')) {
          throw err;
        }
      }

      console.warn(`[AI Router] ${provider.name} failed: ${err.message}.`);
    }
  }

  const combinedError: any = new Error(
    `All configured AI providers failed. Attempt log: ${attemptsLog.join(' | ')}`
  );
  combinedError.isQuotaExhausted = true;
  combinedError.details = attemptsLog;
  throw combinedError;
}

// Backward-compatible exports
export { isQuotaOrTransientError as isQuotaOrRateLimitError };
