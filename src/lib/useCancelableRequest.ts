import { useEffect, useRef } from 'react';

export function useCancelableRequest() {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      abortRef.current = null;
    };
  }, []);

  const startRequest = () => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    return controller;
  };

  const cancelRequest = () => {
    abortRef.current?.abort();
    abortRef.current = null;
  };

  const clearIfCurrent = (controller: AbortController | null) => {
    if (abortRef.current === controller) {
      abortRef.current = null;
    }
  };

  return {
    startRequest,
    cancelRequest,
    clearIfCurrent,
  };
}
