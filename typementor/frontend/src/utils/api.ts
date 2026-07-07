import { trackException } from './monitoring';

export function getApiUrl(path: string): string {
  const baseUrl = (import.meta.env.VITE_API_URL || '').trim();
  const cleanPath = path.trim().startsWith('/') ? path.trim() : `/${path.trim()}`;
  
  if (!baseUrl) {
    return cleanPath;
  }

  // Strip trailing slash
  const cleanBase = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;

  // Prevent duplicate /api namespace if both base URL and path contain it
  if (cleanBase.endsWith('/api') && cleanPath.startsWith('/api/')) {
    return `${cleanBase}${cleanPath.slice(4)}`;
  }

  return `${cleanBase}${cleanPath}`;
}

/**
 * Resolves local storage keys dynamically based on active user ID.
 * This guarantees complete guest mode storage isolation from logged-in users.
 */
export function getStorageKey(key: string, userId?: string | null): string {
  if (userId) {
    return `${key}_${userId}`;
  }
  return `${key}_guest`;
}

export interface SafeFetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
}

// Store a reference to the native browser fetch to prevent infinite recursion
const originalFetch = window.fetch;

/**
 * A hardened fetch wrapper that implements timeout controls,
 * automatic retries with backoff on transient errors,
 * global telemetry logging (Sentry/GA4), and user-friendly error translations.
 */
export async function safeFetch(path: string, options: SafeFetchOptions = {}): Promise<Response> {
  const { timeout = 10000, retries = 2, ...fetchOptions } = options;
  let attempt = 0;
  const fullUrl = path.startsWith('http') ? path : getApiUrl(path);

  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await originalFetch(fullUrl, {
        ...fetchOptions,
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      // Retry on transient server errors (502 Bad Gateway, 503 Service Unavailable, 504 Gateway Timeout)
      if ([502, 503, 504].includes(response.status) && attempt < retries) {
        attempt++;
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise((res) => setTimeout(res, backoffMs));
        continue;
      }

      return response;
    } catch (err: any) {
      clearTimeout(timeoutId);

      const isTimeout = err.name === 'AbortError';
      const isNetwork = err instanceof TypeError || err.message?.toLowerCase().includes('failed to fetch');

      if ((isTimeout || isNetwork) && attempt < retries) {
        attempt++;
        const backoffMs = Math.pow(2, attempt) * 1000;
        await new Promise((res) => setTimeout(res, backoffMs));
        continue;
      }

      // Log the exception to Sentry/GA4
      trackException(err);

      if (isTimeout) {
        throw new Error('Connection timed out. The server took too long to respond. Please try again.');
      } else {
        throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
      }
    }
  }
}

// ── Global Monkeypatch for window.fetch ─────────────────────────────────────
// Any call to raw fetch() for backend API paths will automatically routing through safeFetch()
window.fetch = async function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = typeof input === 'string' 
    ? input 
    : (input instanceof URL ? input.href : input.url);

  // If this is a local API request, wrap it in safeFetch
  if (url.includes('/api/')) {
    let path = url;
    const origin = window.location.origin;
    if (url.startsWith(origin)) {
      path = url.slice(origin.length);
    }
    return safeFetch(path, init);
  }

  // Fallback to native fetch for external calls
  return originalFetch(input, init);
};
