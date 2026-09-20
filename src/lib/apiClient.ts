import { auth, signInAnonymously } from './firebase';

/**
 * Retrieves a valid Firebase ID token for the current user.
 * If the user is not yet logged in, triggers seamless anonymous sign-in so that
 * all valid student sessions are authenticated.
 */
export async function getValidIdToken(forceRefresh = false): Promise<string | null> {
  try {
    let user = auth.currentUser;
    if (!user) {
      // Wait for brief initial auth resolution or sign in anonymously
      const cred = await signInAnonymously(auth);
      user = cred.user;
    }

    if (user) {
      return await user.getIdToken(forceRefresh);
    }
  } catch (err) {
    console.warn('[apiClient] Failed to retrieve Firebase ID token:', err);
  }
  return null;
}

/**
 * Initializes a global fetch interceptor that transparently attaches
 * "Authorization: Bearer <ID_TOKEN>" to all outgoing /api/* requests (excluding /api/health).
 */
export function setupAuthFetchInterceptor() {
  if (typeof window === 'undefined' || (window as any).__authFetchInterceptorInstalled) {
    return;
  }

  const originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlString = typeof input === 'string' 
      ? input 
      : input instanceof URL 
        ? input.toString() 
        : input.url;

    // Only intercept internal /api/ endpoints, exclude public /api/health
    if (urlString.includes('/api/') && !urlString.includes('/api/health')) {
      try {
        const token = await getValidIdToken();
        if (token) {
          const headers = new Headers(init?.headers || (typeof input === 'object' && 'headers' in input ? input.headers : {}));
          if (!headers.has('Authorization')) {
            headers.set('Authorization', `Bearer ${token}`);
          }
          
          const newInit: RequestInit = {
            ...init,
            headers
          };

          const response = await originalFetch(input, newInit);

          // If token expired (401), force refresh token once and retry
          if (response.status === 401) {
            const freshToken = await getValidIdToken(true);
            if (freshToken) {
              headers.set('Authorization', `Bearer ${freshToken}`);
              return await originalFetch(input, { ...init, headers });
            }
          }

          return response;
        }
      } catch (err) {
        console.warn('[apiClient] Auth interceptor encountered error, proceeding with raw request:', err);
      }
    }

    return originalFetch(input, init);
  };

  (window as any).__authFetchInterceptorInstalled = true;
}
