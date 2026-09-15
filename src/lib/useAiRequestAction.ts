import { useState } from 'react';
import { AiRequestError, getAiFriendlyMessage, isAiRequestCancelled } from './aiRequest';
import { useCancelableRequest } from './useCancelableRequest';

export interface AiRequestMessages {
  pending: string;
  success: string;
  cancelled?: string;
  failure?: string;
}

export function useAiRequestAction() {
  const { startRequest, clearIfCurrent, cancelRequest } = useCancelableRequest();
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const runRequest = async <T>(
    action: (signal: AbortSignal) => Promise<T>,
    messages: AiRequestMessages
  ): Promise<T> => {
    if (isLoading) {
      return Promise.reject(new AiRequestError('AI request already in progress', 'unknown'));
    }

    const controller = startRequest();
    const signal = controller.signal;

    setErrorMessage(null);
    setStatusMessage(messages.pending);
    setIsLoading(true);

    try {
      const result = await action(signal);
      setStatusMessage(messages.success);
      return result;
    } catch (error: unknown) {
      if (isAiRequestCancelled(error)) {
        setStatusMessage(messages.cancelled ?? 'AI request cancelled.');
        throw error;
      }

      const message = getAiFriendlyMessage(error);
      setErrorMessage(message);
      setStatusMessage(messages.failure ?? 'AI request failed.');
      throw error;
    } finally {
      clearIfCurrent(controller);
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    statusMessage,
    errorMessage,
    runRequest,
    cancelRequest,
    setStatusMessage,
    setErrorMessage,
  };
}
