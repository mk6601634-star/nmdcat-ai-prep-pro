export type AiRequestErrorType =
  | 'timeout'
  | 'network'
  | 'auth'
  | 'rate_limited'
  | 'service_unavailable'
  | 'invalid_response'
  | 'cancelled'
  | 'unknown';

export class AiRequestError extends Error {
  type: AiRequestErrorType;
  status?: number;
  details?: unknown;

  constructor(
    message: string,
    type: AiRequestErrorType,
    status?: number,
    details?: unknown
  ) {
    super(message);
    this.name = 'AiRequestError';
    this.type = type;
    this.status = status;
    this.details = details;
  }
}

export interface AiFetchOptions {
  timeoutMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  signal?: AbortSignal;
}

const DEFAULT_TIMEOUT_MS = 40000;
const DEFAULT_MAX_RETRIES = 2;
const DEFAULT_RETRY_DELAY_MS = 500;

const isServiceUnavailableStatus = (status: number) => [502, 503, 504].includes(status);
const isAuthStatus = (status: number) => status === 401 || status === 403;
const isRetryableStatus = (status: number) => [408, 429, 502, 503, 504].includes(status);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const AI_REQUEST_TIMEOUT_MS = DEFAULT_TIMEOUT_MS;

export function getAiFriendlyMessage(error: unknown): string {
  if (error instanceof AiRequestError) {
    switch (error.type) {
      case 'timeout':
        return 'The AI request took too long and timed out. Please try again.';
      case 'network':
        return 'Unable to reach the AI service. Check your internet connection and retry.';
      case 'auth':
        return 'Authentication failed while accessing AI. Please refresh or sign in again.';
      case 'rate_limited':
        return 'AI provider rate-limit reached. Automatically retrying with fallback provider...';
      case 'service_unavailable':
        return 'The AI service is temporarily busy. Retrying...';
      case 'invalid_response':
        return 'The AI service returned an unexpected response. Please try again.';
      case 'cancelled':
        return '';
      default:
        return 'An unexpected AI request error occurred. Please retry.';
    }
  }

  return 'An unexpected AI request error occurred. Please retry.';
}

export function isAiRequestCancelled(error: unknown): boolean {
  return error instanceof AiRequestError && error.type === 'cancelled';
}

function createCombinedAbortController(externalSignal?: AbortSignal) {
  const controller = new AbortController();

  if (externalSignal) {
    if (externalSignal.aborted) {
      controller.abort();
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true });
    }
  }

  return controller;
}

export async function aiFetch<T = any>(
  url: string,
  init: RequestInit = {},
  options: AiFetchOptions = {}
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
  const retryDelayMs = options.retryDelayMs ?? DEFAULT_RETRY_DELAY_MS;

  let attempt = 0;
  let lastError: AiRequestError | null = null;

  while (attempt <= maxRetries) {
    const controller = createCombinedAbortController(options.signal);
    const signal = controller.signal;
    let timeoutTriggered = false;
    const timeoutId = window.setTimeout(() => {
      timeoutTriggered = true;
      controller.abort();
    }, timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal,
      });

      window.clearTimeout(timeoutId);

      const rawText = await response.text();
      const isJson = response.headers.get('content-type')?.includes('application/json');
      let parsedBody: any = null;

      if (isJson) {
        try {
          parsedBody = rawText ? JSON.parse(rawText) : null;
        } catch (err) {
          throw new AiRequestError(
            'AI service returned malformed JSON.',
            'invalid_response',
            response.status,
            rawText
          );
        }
      } else {
        parsedBody = rawText;
      }

      if (!response.ok) {
        const errorType: AiRequestErrorType = isAuthStatus(response.status)
          ? 'auth'
          : response.status === 429 || parsedBody?.isQuotaExhausted
          ? 'rate_limited'
          : isServiceUnavailableStatus(response.status)
          ? 'service_unavailable'
          : 'invalid_response';

        const error = new AiRequestError(
          `AI request failed with status ${response.status}`,
          errorType,
          response.status,
          parsedBody
        );

        if (
          attempt < maxRetries &&
          (isRetryableStatus(response.status) || error.type === 'service_unavailable')
        ) {
          lastError = error;
          attempt += 1;
          await delay(retryDelayMs * attempt);
          continue;
        }

        throw error;
      }

      return parsedBody as T;
    } catch (error: unknown) {
      window.clearTimeout(timeoutId);

      let aiError: AiRequestError;

      if (error instanceof AiRequestError) {
        aiError = error;
      } else if (error instanceof DOMException && error.name === 'AbortError') {
        aiError = new AiRequestError(
          timeoutTriggered ? 'AI request timed out' : 'AI request aborted',
          timeoutTriggered ? 'timeout' : 'cancelled'
        );
      } else if (error instanceof Error) {
        aiError = new AiRequestError(error.message, 'network');
      } else {
        aiError = new AiRequestError('Unknown network error', 'network');
      }

      if (import.meta.env.DEV) {
        console.debug('AI request attempt', attempt + 1, 'url:', url, 'error:', aiError);
      }

      const shouldRetry =
        attempt < maxRetries &&
        (aiError.type === 'network' || aiError.type === 'timeout' || aiError.type === 'service_unavailable' || aiError.type === 'rate_limited');

      if (aiError.type === 'cancelled') {
        throw aiError;
      }

      if (shouldRetry) {
        lastError = aiError;
        attempt += 1;
        await delay(retryDelayMs * attempt * 1.5);
        continue;
      }

      throw aiError;
    }
  }

  throw lastError || new AiRequestError('AI request failed after retries', 'unknown');
}
