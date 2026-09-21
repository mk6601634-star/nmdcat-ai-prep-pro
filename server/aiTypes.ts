export type AIProviderId = 'gemini' | 'cerebras' | 'groq' | 'longcat';

export type AIMode = 'auto' | 'gemini' | 'cerebras' | 'groq' | 'longcat';

export type AITaskCategory =
  | 'prism'
  | 'doubt_solver'
  | 'bulk_mcq'
  | 'classification'
  | 'flashcard'
  | 'mnemonic'
  | 'explanation'
  | 'general';

export interface AiGenerateOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
  task?: AITaskCategory;
  preferredProvider?: AIProviderId;
  preferredModel?: string;
  image?: {
    mimeType: string;
    base64Data: string;
  };
}

export interface AiGenerateResult {
  text: string;
  provider: AIProviderId;
  model: string;
  isFallback: boolean;
  latencyMs?: number;
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface AIModelDefinition {
  id: string;
  provider: AIProviderId;
  name: string;
  capabilities: {
    text: boolean;
    json: boolean;
    vision: boolean;
    fastInference?: boolean;
    deepReasoning?: boolean;
  };
  contextLimit?: number;
  supportsStructuredOutput?: boolean;
  isEnabled: boolean;
  recommendedTasks: AITaskCategory[];
  description?: string;
}

export interface ProviderHealthStatus {
  providerId: AIProviderId;
  name: string;
  isConfigured: boolean;
  isAvailable: boolean;
  latencyMs?: number;
  lastChecked?: string;
  lastError?: string;
}

export interface ProviderUsageMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  fallbackCount: number;
  totalLatencyMs: number;
  averageLatencyMs: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  hasTokenTracking: boolean;
  lastUsed?: string;
  lastError?: string;
}

export interface AIPlatformConfig {
  mode: AIMode;
  defaultProvider: AIProviderId;
  defaultModel: Record<AIProviderId, string>;
  fallbackOrder: AIProviderId[];
  fallbackEnabled: boolean;
  autoRoutingEnabled: boolean;
  cachingEnabled: boolean;
}
