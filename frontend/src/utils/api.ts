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
