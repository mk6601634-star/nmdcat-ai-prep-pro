import crypto from 'crypto';
import type {
  AIProviderId,
  AIMode,
  AITaskCategory,
  AIModelDefinition,
  AIPlatformConfig,
  ProviderUsageMetrics,
  ProviderHealthStatus,
  AiGenerateResult,
  AiGenerateOptions,
} from './aiTypes.ts';
import { providersMap } from './aiProviders.ts';

// Centralized Model Registry
export const MODEL_REGISTRY: AIModelDefinition[] = [
  // Gemini Models
  {
    id: 'gemini-3.5-flash-lite',
    provider: 'gemini',
    name: 'Gemini 3.5 Flash-Lite (High Speed)',
    capabilities: { text: true, json: true, vision: true, fastInference: true, deepReasoning: true },
    contextLimit: 1048576,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['prism', 'doubt_solver', 'explanation', 'bulk_mcq'],
    description: 'Ultra-fast multimodal reasoning with massive context capacity.',
  },
  {
    id: 'gemini-3.6-flash',
    provider: 'gemini',
    name: 'Gemini 3.6 Flash (Production)',
    capabilities: { text: true, json: true, vision: true, fastInference: true, deepReasoning: true },
    contextLimit: 1048576,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['prism', 'doubt_solver', 'explanation'],
    description: 'Flagship speed-to-intelligence balance for high-yield medical reasoning.',
  },
  {
    id: 'gemini-2.5-flash',
    provider: 'gemini',
    name: 'Gemini 2.5 Flash',
    capabilities: { text: true, json: true, vision: true, fastInference: true, deepReasoning: true },
    contextLimit: 1048576,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['doubt_solver', 'explanation'],
    description: 'Reliable fast multimodal generation for tutor chat and diagnostics.',
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'gemini',
    name: 'Gemini 2.5 Pro (Deep Reasoning)',
    capabilities: { text: true, json: true, vision: true, fastInference: false, deepReasoning: true },
    contextLimit: 2097152,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['prism', 'doubt_solver'],
    description: 'High-precision multi-step scientific reasoning engine.',
  },

  // Cerebras Models
  {
    id: 'llama3.1-8b',
    provider: 'cerebras',
    name: 'Cerebras Llama 3.1 8B (Sub-100ms)',
    capabilities: { text: true, json: true, vision: false, fastInference: true, deepReasoning: false },
    contextLimit: 8192,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['bulk_mcq', 'classification', 'flashcard', 'mnemonic'],
    description: 'Record-shattering inference speed ideal for instantaneous batch generation.',
  },
  {
    id: 'llama-3.3-70b',
    provider: 'cerebras',
    name: 'Cerebras Llama 3.3 70B (Ultra-Fast 70B)',
    capabilities: { text: true, json: true, vision: false, fastInference: true, deepReasoning: true },
    contextLimit: 128000,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['bulk_mcq', 'doubt_solver', 'explanation'],
    description: '70B class intelligence running at over 2,000 tokens/sec.',
  },
  {
    id: 'deepseek-r1-distill-llama-70b',
    provider: 'cerebras',
    name: 'Cerebras DeepSeek R1 Distill 70B',
    capabilities: { text: true, json: true, vision: false, fastInference: true, deepReasoning: true },
    contextLimit: 128000,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['prism', 'doubt_solver', 'explanation'],
    description: 'Reasoning-specialized distillation running at hardware-accelerated speeds.',
  },

  // Groq Models
  {
    id: 'openai/gpt-oss-20b',
    provider: 'groq',
    name: 'Groq GPT-OSS 20B (Ultra-Fast 730+ t/s)',
    capabilities: { text: true, json: true, vision: false, fastInference: true, deepReasoning: true },
    contextLimit: 131072,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['bulk_mcq', 'doubt_solver', 'explanation', 'flashcard', 'mnemonic', 'prism'],
    description: 'Ultra-fast OpenAI architecture running on Groq LPUs at 730+ tokens/second.',
  },
  {
    id: 'qwen/qwen3.8-27b',
    provider: 'groq',
    name: 'Groq Qwen 3.8 27B (High-Precision Reasoning)',
    capabilities: { text: true, json: true, vision: false, fastInference: true, deepReasoning: true },
    contextLimit: 131042,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['doubt_solver', 'explanation', 'prism', 'bulk_mcq'],
    description: 'High-precision 27B reasoning model with fast LPUs on Groq.',
  },
  {
    id: 'openai/gpt-oss-120b',
    provider: 'groq',
    name: 'Groq GPT-OSS 120B (Flagship)',
    capabilities: { text: true, json: true, vision: false, fastInference: true, deepReasoning: true },
    contextLimit: 131072,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['prism', 'doubt_solver', 'explanation'],
    description: 'Massive 120B parameter model with 131k context window on Groq LPUs.',
  },
  {
    id: 'groq/compound-mini',
    provider: 'groq',
    name: 'Groq Compound-Mini',
    capabilities: { text: true, json: true, vision: false, fastInference: true, deepReasoning: false },
    contextLimit: 131072,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['flashcard', 'mnemonic', 'explanation'],
    description: 'Compound routing model on Groq.',
  },
  {
    id: 'groq/compound',
    provider: 'groq',
    name: 'Groq Compound (Large)',
    capabilities: { text: true, json: true, vision: false, fastInference: true, deepReasoning: true },
    contextLimit: 131072,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['prism', 'bulk_mcq'],
    description: 'Large compound model on Groq.',
  },

  // LongCat Models
  {
    id: 'longcat-default',
    provider: 'longcat',
    name: 'LongCat Default Gateway',
    capabilities: { text: true, json: true, vision: false, fastInference: true, deepReasoning: true },
    contextLimit: 65536,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['explanation', 'flashcard', 'bulk_mcq'],
    description: 'Configurable custom/OpenAI-compatible AI gateway for backup routing.',
  },
  {
    id: 'longcat-flash',
    provider: 'longcat',
    name: 'LongCat Flash Tier',
    capabilities: { text: true, json: true, vision: false, fastInference: true, deepReasoning: false },
    contextLimit: 32768,
    supportsStructuredOutput: true,
    isEnabled: true,
    recommendedTasks: ['mnemonic', 'flashcard'],
    description: 'Low-latency lightweight generation tier.',
  },
];

// Active Server Configuration (In-Memory with Admin Updates)
export const activeConfig: AIPlatformConfig = {
  mode: 'groq', // Gemini is paused, Groq is the exclusive primary provider
  defaultProvider: 'groq',
  defaultModel: {
    gemini: (process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite').trim().replace(/[\r\n\t]/g, ''),
    cerebras: (process.env.CEREBRAS_MODEL || 'llama3.1-8b').trim().replace(/[\r\n\t]/g, ''),
    groq: (process.env.GROQ_MODEL || process.env.FALLBACK_MODEL || 'openai/gpt-oss-20b').trim().replace(/[\r\n\t]/g, ''),
    longcat: (process.env.LONGCAT_MODEL || 'longcat-default').trim().replace(/[\r\n\t]/g, ''),
  },
  fallbackOrder: ['groq', 'cerebras', 'longcat'], // Gemini excluded while paused
  fallbackEnabled: process.env.FALLBACK_AI_ENABLED !== 'false',
  autoRoutingEnabled: true,
  cachingEnabled: true,
};

// Usage Metrics Tracking per Provider
export const usageMetrics: Record<AIProviderId, ProviderUsageMetrics> = {
  gemini: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, fallbackCount: 0, totalLatencyMs: 0, averageLatencyMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, hasTokenTracking: true },
  cerebras: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, fallbackCount: 0, totalLatencyMs: 0, averageLatencyMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, hasTokenTracking: true },
  groq: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, fallbackCount: 0, totalLatencyMs: 0, averageLatencyMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, hasTokenTracking: true },
  longcat: { totalRequests: 0, successfulRequests: 0, failedRequests: 0, fallbackCount: 0, totalLatencyMs: 0, averageLatencyMs: 0, inputTokens: 0, outputTokens: 0, totalTokens: 0, hasTokenTracking: true },
};

export function recordUsage(
  provider: AIProviderId,
  success: boolean,
  latencyMs: number,
  isFallback: boolean,
  tokens?: { inputTokens?: number; outputTokens?: number; totalTokens?: number },
  errorMsg?: string
) {
  const m = usageMetrics[provider];
  if (!m) return;

  m.totalRequests += 1;
  m.totalLatencyMs += latencyMs;
  m.averageLatencyMs = Math.round(m.totalLatencyMs / m.totalRequests);
  m.lastUsed = new Date().toISOString();

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

// In-memory Deterministic Response Cache (15-min TTL)
interface CacheEntry {
  result: AiGenerateResult;
  expiresAt: number;
}
const memoryCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 15 * 60 * 1000;

export function getDeterministicCacheKey(options: AiGenerateOptions): string {
  const hash = crypto.createHash('sha256');
  hash.update(options.prompt || '');
  hash.update(options.systemInstruction || '');
  hash.update(options.jsonMode ? 'json' : 'text');
  return hash.digest('hex');
}

export function getCachedResponse(options: AiGenerateOptions): AiGenerateResult | null {
  if (!activeConfig.cachingEnabled || options.image) return null;
  const key = getDeterministicCacheKey(options);
  const entry = memoryCache.get(key);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.result;
  }
  return null;
}

export function setCachedResponse(options: AiGenerateOptions, result: AiGenerateResult) {
  if (!activeConfig.cachingEnabled || options.image) return;
  const key = getDeterministicCacheKey(options);
  memoryCache.set(key, {
    result,
    expiresAt: Date.now() + CACHE_TTL_MS,
  });
}

// Task-Aware Provider Recommendation
export function getRecommendedProviderForTask(task?: AITaskCategory): { primary: AIProviderId; fallbackList: AIProviderId[] } {
  // Gemini is paused, Groq is the primary provider across all tasks
  return { primary: 'groq', fallbackList: ['cerebras', 'longcat'] };
}
